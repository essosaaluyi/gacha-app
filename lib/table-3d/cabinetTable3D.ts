import * as THREE from "three";

import { canvas, tex } from "@/lib/button-3d/runtime";

/**
 * The card table as real geometry, replacing the baked
 * card-table-premium-three-bay-center-only-1120x420 image.
 *
 * Built to docs/cabinet-card-table-3d-spec.md. Two things in that spec had to
 * be re-derived rather than copied, and both are recorded here because the
 * numbers look arbitrary otherwise:
 *
 * 1. REFERENCE FRAME. The spec gives the shell's world vertices in a 1120x420
 *    frame at 8:3. The table is not drawn in one: `.bcab-card-table` is
 *    1120x350 and the art is painted into it at `center top / 100% 420px`, so
 *    the art is clipped at row 350 and art pixel (x, y) is box pixel (x, y).
 *    The solved camera belongs to that 1120x350 box — its bay quads land on
 *    the painted bays there to 2.65px RMS, and in a 420-tall frame the same
 *    camera misses them by up to 38px. The spec's own bay figures (opening
 *    +/-0.2256, frame outer 0.5192x0.5160) are the 1120x350 ones, so its shell
 *    vertices are the odd ones out: they project up to 86px away from the
 *    pixel landmarks printed beside them. Those landmarks were checked against
 *    the art and are right, so the shell is built by unprojecting the
 *    landmarks through the live camera (`unprojectArt`) instead.
 *
 * 2. DIMENSIONS FROM THE ART. Having to unproject anyway, the shell is
 *    measured off the art rather than converted: the silhouette is sampled
 *    every 16 rows, so the side edges keep the ~10px outward bow a straight
 *    world edge cannot have, and the bands are taken where the art states them
 *    plainly. That makes the brass rim 0.052 (20px at mid-side) and the bay
 *    frame 0.050 (the painted frame runs 631..655px at y=135, which 0.034
 *    would cover only to 646), both wider than the spec's draft values.
 *
 * CAMERA: not invented. The baked art is a true perspective render, so the
 * camera was solved back out of the three bay quads BattlePixiStage had been
 * calibrated against (CABINET_TABLE_SLOT_QUADS). Nothing here may re-fit it:
 * the cards are drawn by Pixi on a canvas above this one against those quads.
 */

/** Solved from the baked art; read the note above before touching any of these. */
const CAM = { y: 1.8549, z: 2.3988, pitchDeg: 48.849, fovDeg: 22.3608 };
const BAY = { halfW: 0.2256, zFar: 0.3818, zNear: 0.8298, pitchX: 0.7215 };
/**
 * The box the table is laid out in, and the frame every art pixel below is
 * quoted in. The projection is locked to this aspect rather than the canvas's
 * own, so a frame where the box is still laid out at the wrong size cannot
 * move the bays.
 */
const REF = { w: 1120, h: 350 };

const BAY_W = BAY.halfW * 2;
const BAY_D = BAY.zNear - BAY.zFar;
const BAY_Z = (BAY.zNear + BAY.zFar) / 2;
const PLATE_T = 0.014;
/** Measured: the painted frame around a bay is ~24px wide at mid-side. */
const RIM = 0.05;
/** Measured: the brass band inside the table's outer edge is ~20px at mid-side. */
const BRASS_W = 0.052;
/** How far the near skirt leans in, and how far it drops (art rows 254..280). */
const SKIRT_DROP = 0.118;
const SKIRT_INSET = 0.9277;
/** Deep enough for the plate's 0.2257 sweep radius, with clearance. */
const WELL_D = 0.26;
/** Corner chamfer on a bay frame. */
const BAY_CHAMFER = 0.022;

/**
 * The colour the painting uses inside a bay, sampled straight out of the art.
 * The panel has to disappear into the slot while it is at rest, so this is the
 * target, not a guess at "black" — the painted slot is a very dark green.
 */
const BAY_PAINT = "#0e1a1b";
/**
 * Nothing of the panel is drawn above the table surface, which is also the
 * height the fixed frame tops out at. A panel really hinged in a table would
 * swing up and stand proud of its frame, and it did, and it looked like a flap
 * landing on the brasswork.
 */
const SURFACE_CLIP = 0.009;

export type TableQuad = [
  number, number, number, number, number, number, number, number,
];

export type CabinetTable3D = {
  /** Turns bay `index` over, carrying whatever the caller drew on top of it. */
  flipSlot(index: number, durationMs?: number): void;
  /** 0 at rest, 1 once the bay is edge-on, 2 when it is fully turned over. */
  slotProgress(index: number): number;
  /** The bay openings in canvas pixels, clockwise from the far-left corner. */
  slotQuads(): TableQuad[];
  /**
   * Where the bay opening is *right now*, mid-turn, in canvas pixels. A card
   * drawn on another layer rides the plate by taking these corners every frame.
   */
  livePlateQuad(index: number): TableQuad;
  /**
   * Lights a thin band along one bay's frame. Off by default and unused by
   * normal play: this is the hook the baked table could never offer, not a
   * replacement for Pixi's Reply frame sparks.
   */
  setSlotHighlight(index: number, color?: number, intensity?: number): void;
  /** Swings the table's fill light with the cabinet's own reaction state. */
  setCabinetReaction(color?: number, intensity?: number): void;
  /** The canvas the table is drawn on, for mapping its pixels onto another. */
  canvasEl(): HTMLCanvasElement;
  resize(): void;
  dispose(): void;
};

// --- the art, measured ------------------------------------------------------

/**
 * The right half of the table's silhouette, in art pixels, sampled from the
 * alpha channel of the baked image every 16 rows (closer together across the
 * far chamfer, where it turns). Half-widths are symmetrised about x=560; the
 * art itself wanders about 4px off centre.
 */
const TOP_EDGE_PX: readonly (readonly [number, number])[] = [
  [924, 22], [943.5, 28], [953.5, 34], [962.5, 40], [975.5, 56], [984.5, 72],
  [993.5, 88], [1001.5, 104], [1010.5, 120], [1019.5, 136], [1028.5, 152],
  [1036.5, 168], [1045.5, 184], [1054.5, 200], [1062.5, 216], [1071.5, 232],
  [1078.5, 244], [1083.5, 254],
];
/** Where the mechanism below the table starts, on the art. */
const MECH_TOP_PX: readonly [number, number] = [925, 288];

const d2r = THREE.MathUtils.degToRad;

/**
 * An art pixel, back onto a horizontal plane in the world. This is the inverse
 * of the projection the table is drawn with, done in the reference frame, and
 * it is how every fixed dimension here was arrived at.
 */
function unprojectArt(px: number, py: number, y0 = 0): [number, number] {
  const pitch = d2r(CAM.pitchDeg);
  const t = Math.tan(d2r(CAM.fovDeg) / 2);
  const aspect = REF.w / REF.h;
  const ndcX = (px / REF.w) * 2 - 1;
  const ndcY = 1 - (py / REF.h) * 2;
  // Ray in camera space, rotated back into the world by the camera's pitch.
  const dx = ndcX * aspect * t;
  const dy = ndcY * t;
  const wy = dy * Math.cos(pitch) - Math.sin(pitch);
  const wz = -dy * Math.sin(pitch) - Math.cos(pitch);
  const s = (y0 - CAM.y) / wy;
  return [dx * s, CAM.z + wz * s];
}

// --- loops ------------------------------------------------------------------

type Pt = [number, number];

/** The full table outline: the right-hand samples, mirrored, as (x, z). */
function topOutline(): Pt[] {
  const right = TOP_EDGE_PX.map(([px, py]) => unprojectArt(px, py));
  const left = [...right].reverse().map(([x, z]) => [-x, z] as Pt);
  // The near and far edges are straight, but they still need vertices along
  // them: the brass band's width varies with the direction a vertex moves in,
  // and with only the two corners to work from the whole near edge inherited
  // the corners' diagonal and came out full width.
  const span = (a: Pt, b: Pt) =>
    [0.18, 0.36, 0.5, 0.64, 0.82].map((k) => [a[0] + (b[0] - a[0]) * k, a[1]] as Pt);
  // Down the right side, across the near edge, up the left, across the far.
  return [
    ...right,
    ...span(right[right.length - 1], left[0]),
    ...left,
    ...span(left[left.length - 1], right[0]),
  ];
}

/** A bay opening as a loop, with its corners chamfered the way the art has them. */
function bayLoop(centreX: number, inset = 0): Pt[] {
  const hw = BAY.halfW + inset;
  const zF = BAY.zFar - inset;
  const zN = BAY.zNear + inset;
  const c = Math.min(BAY_CHAMFER, hw * 0.4, (zN - zF) * 0.4);
  const out: Pt[] = [];
  const corner = (x: number, z: number, sx: number, sz: number) => {
    // Three points across the chamfer keeps the normals from snapping.
    for (const k of [0, 0.5, 1]) {
      const a = (k * Math.PI) / 2;
      out.push([x + sx * c * (1 - Math.cos(a)), z + sz * c * (1 - Math.sin(a))]);
    }
  };
  corner(centreX - hw, zF, 1, 1);
  corner(centreX + hw, zF, -1, 1);
  corner(centreX + hw, zN, -1, -1);
  corner(centreX - hw, zN, 1, -1);
  return out;
}

/**
 * Moves every vertex of a convex loop inward by `d`, mitred at the corners.
 *
 * `widthFor` scales that distance by the direction the vertex moves in. The
 * painted brass is 20px down the sides but only 6px across the near edge, so
 * a band of one width cannot sit on it: at 0.052 the front band swallowed the
 * bright pool of cloth in front of the centre bay, and at 0.018 the sides
 * lost their edging.
 */
function offsetLoop(loop: Pt[], d: number, widthFor?: (nx: number, nz: number) => number): Pt[] {
  const n = loop.length;
  // Inward is toward the centroid; these loops are all convex.
  const cx = loop.reduce((s, p) => s + p[0], 0) / n;
  const cz = loop.reduce((s, p) => s + p[1], 0) / n;
  const edge = (a: Pt, b: Pt): Pt => {
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const len = Math.hypot(ex, ez) || 1;
    // Both perpendiculars; keep the one that points at the centroid.
    const nx = -ez / len;
    const nz = ex / len;
    const sign = nx * (cx - a[0]) + nz * (cz - a[1]) >= 0 ? 1 : -1;
    return [nx * sign, nz * sign];
  };
  return loop.map((p, i) => {
    const a = edge(loop[(i - 1 + n) % n], p);
    const b = edge(p, loop[(i + 1) % n]);
    let mx = a[0] + b[0];
    let mz = a[1] + b[1];
    const mlen = Math.hypot(mx, mz) || 1;
    mx /= mlen;
    mz /= mlen;
    const cos = Math.max(0.35, mx * a[0] + mz * a[1]);
    const w = d * (widthFor ? widthFor(mx, mz) : 1);
    return [p[0] + (mx * w) / cos, p[1] + (mz * w) / cos] as Pt;
  });
}

// --- geometry builders ------------------------------------------------------

/**
 * A band swept around a loop, given a cross-section of (inset, height) stops.
 *
 * Each pair of stops becomes its own strip with its own vertices, so the
 * normals run smoothly along the loop but break between segments — which is
 * what makes a bevel catch the light as a bevel instead of a smooth roll.
 * UVs are laid out u along the loop, v across the section from 0 (outer) to 1
 * (inner), so one narrow texture can place hairlines by distance in.
 */
function bandGeometry(
  loop: Pt[],
  section: readonly (readonly [number, number])[],
  widthFor?: (nx: number, nz: number) => number
) {
  const rings = section.map(([inset]) => (inset === 0 ? loop : offsetLoop(loop, inset, widthFor)));
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const n = loop.length;
  const total = section[section.length - 1][0] - section[0][0] || 1;

  for (let s = 0; s < section.length - 1; s++) {
    const base = pos.length / 3;
    for (const r of [s, s + 1]) {
      const v = (section[r][0] - section[0][0]) / total;
      for (let i = 0; i <= n; i++) {
        const p = rings[r][i % n];
        pos.push(p[0], section[r][1], p[1]);
        uv.push(i / n, v);
      }
    }
    for (let i = 0; i < n; i++) {
      const a = base + i;
      const b = base + i + 1;
      const c = base + n + 1 + i;
      const d = base + n + 2 + i;
      idx.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A wall hanging between two loops at two heights. */
function wallGeometry(top: Pt[], topY: number, bottom: Pt[], bottomY: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const n = top.length;
  for (const [ring, y, v] of [[top, topY, 0], [bottom, bottomY, 1]] as const) {
    for (let i = 0; i <= n; i++) {
      const p = (ring as Pt[])[i % n];
      pos.push(p[0], y as number, p[1]);
      uv.push(i / n, v as number);
    }
  }
  for (let i = 0; i < n; i++) {
    idx.push(i, n + 1 + i, i + 1, i + 1, n + 1 + i, n + 2 + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Darkens a mesh toward the table's left and right ends.
 *
 * The art does not stop at a lit edge: the brass and the cloth lose their
 * light into the cabinet long before the silhouette ends, and the corners the
 * render came out brightest in are the ones the painting has darkest. Written
 * as vertex colour rather than the alpha fade the spec asks for because the
 * cabinet behind is near black either way, and this keeps every shell mesh
 * opaque and out of the transparent sorting.
 */
function edgeFade(geometry: THREE.BufferGeometry, from = 0.86, to = 1.4, floor = 0.26) {
  const pos = geometry.getAttribute("position");
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (Math.abs(pos.getX(i)) - from) / (to - from)));
    const k = 1 - (1 - floor) * t * t;
    col[i * 3] = k;
    col[i * 3 + 1] = k;
    col[i * 3 + 2] = k;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geometry;
}

/**
 * Shades a mesh from its far edge to its near one, on top of whatever
 * edgeFade left.
 *
 * The painted brass is brightest along the back of the table and almost out
 * by the player; this cabinet lights it from the front, so the render had it
 * exactly the wrong way round — #744c24 at the back against the art's
 * #c19d6a, and twice too bright at the near-left corner. Nothing in the
 * lighting can be moved to fix that without changing the insert the owner has
 * already approved, so the gradient the painting has is applied directly.
 */
function depthShade(geometry: THREE.BufferGeometry, farK: number, nearK: number, zFar = 0.11, zNear = 1.05) {
  const pos = geometry.getAttribute("position");
  const col = geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
  if (!col) return geometry;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getZ(i) - zFar) / (zNear - zFar)));
    const k = farK + (nearK - farK) * t;
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  return geometry;
}

/** A flat sheet filling `outer`, with holes cut out of it. */
function sheetShape(outer: Pt[], holes: Pt[][]) {
  // Authored in (x, -z) and laid down, so shape y = -world z. Shape
  // coordinates come through as UVs, which is how the felt map stays keyed to
  // the world and its pattern runs continuously across the openings.
  const shape = new THREE.Shape();
  outer.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  for (const h of holes) {
    const path = new THREE.Path();
    h.forEach(([x, z], i) => (i ? path.lineTo(x, -z) : path.moveTo(x, -z)));
    path.closePath();
    shape.holes.push(path);
  }
  return shape;
}

// --- generated maps ---------------------------------------------------------

function mapTex(c: HTMLCanvasElement) {
  const t = tex(c);
  // These are authored with v=0 on the first row, matching bandGeometry.
  t.flipY = false;
  return t;
}

/** The felt's world extent, and the window its generated map covers. */
const FELT_X = 1.44;
const FELT_Z0 = 0.03;
const FELT_Z1 = 1.12;

/**
 * The cloth, keyed to the world rather than to the mesh.
 *
 * Sampled off the art between the bays and in the bands fore and aft of them:
 * the green runs from about rgb(3,23,24) at the sides to rgb(24,57,60) down
 * the middle at the back, and the pool in front of the centre bay reaches
 * rgb(58,120,125). So the cloth is not one colour with a vignette on it — the
 * highlight tightens and strengthens toward the player, and that is what the
 * old flat sheet was missing.
 */
function feltTexture() {
  const W = 1024;
  const H = 512;
  const { c, g } = canvas(W, H);
  const img = g.createImageData(W, H);
  let seed = 260113;
  const rnd = () => {
    // Fixed seed, so the weave is the same every run and on every machine.
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let j = 0; j < H; j++) {
    const z = FELT_Z0 + (j / (H - 1)) * (FELT_Z1 - FELT_Z0);
    const u = (z - FELT_Z0) / (FELT_Z1 - FELT_Z0);
    // The pool grows and tightens as the cloth comes toward the player.
    const amp = 32 + 44 * u ** 2.2;
    const sigma = 0.8 - 0.48 * u;
    for (let i = 0; i < W; i++) {
      const x = -FELT_X + (i / (W - 1)) * FELT_X * 2;
      // Lit from the player's left, as the cabinet's key is.
      const bias = x < 0 ? 1.06 : 0.94;
      const falloff = 10 * Math.min(1, (Math.abs(x) / FELT_X) ** 3);
      const green = 20 + amp * Math.exp(-((x / sigma) ** 2)) * bias - falloff;
      const gg = Math.max(8, green) + (rnd() - 0.5) * 6;
      const o = (j * W + i) * 4;
      // sRGB round-tripping crushes the low red far harder than the green, so the
      // ratio has to be pushed well past the measured one to come back at it.
      img.data[o] = Math.max(0, Math.min(255, gg * Math.min(0.62, 0.3 + 0.004 * gg)));
      img.data[o + 1] = Math.max(0, Math.min(255, gg));
      img.data[o + 2] = Math.max(0, Math.min(255, gg * 1.05));
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * A cross-section strip, for the bands swept around the outline and the bays.
 * v runs 0 (outer) to 1 (inner); the stops paint by that distance in.
 */
function sectionTexture(
  base: readonly (readonly [number, string])[],
  lines: readonly (readonly [number, number, string])[] = []
) {
  const H = 256;
  const { c, g } = canvas(8, H);
  const grad = g.createLinearGradient(0, 0, 0, H);
  for (const [at, col] of base) grad.addColorStop(at, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, H);
  // Hairlines are hard edges, not gradient stops, or they wash out.
  for (const [at, w, col] of lines) {
    g.fillStyle = col;
    g.fillRect(0, Math.round(at * H), 8, Math.max(1, Math.round(w * H)));
  }
  return c;
}

/**
 * A small environment for the metal to reflect.
 *
 * Without one, brass at metalness 0.72 has no diffuse term and only three
 * lights to catch, so it renders near black — measured #352008 against the
 * art's #c19d6a. This is the cabinet as the table sees it: dark all round,
 * with the light bar overhead as a warm band and the player's side a little
 * cooler. Never shown as the background; it exists to be reflected.
 */
function environmentTexture() {
  const W = 256;
  const H = 128;
  const { c, g } = canvas(W, H);
  g.fillStyle = "#05090c";
  g.fillRect(0, 0, W, H);
  const bar = g.createLinearGradient(0, 0, 0, H);
  bar.addColorStop(0, "#1b2b33");
  bar.addColorStop(0.22, "#d8e4ee");
  bar.addColorStop(0.34, "#6f8794");
  bar.addColorStop(0.52, "#0b1318");
  bar.addColorStop(1, "#04070a");
  g.fillStyle = bar;
  g.fillRect(0, 0, W, H);
  // The warm key, off to the player's left, and a cool fill opposite it.
  for (const [cx, col, r] of [[W * 0.32, "rgba(255,238,206,0.85)", 46], [W * 0.78, "rgba(126,196,224,0.5)", 34]] as const) {
    const glow = g.createRadialGradient(cx, H * 0.26, 0, cx, H * 0.26, r);
    glow.addColorStop(0, col);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);
  }
  return c;
}

/**
 * The face of one black insert. Painted nearly black to sit inside the
 * opening, with only enough sheen to say "surface": the panel has to pass for
 * the painted slot while it is sitting still.
 */
function insertFaceTexture() {
  const W = 512;
  const H = Math.round((W * BAY_D) / BAY_W);
  const { c, g } = canvas(W, H);
  g.fillStyle = BAY_PAINT;
  g.fillRect(0, 0, W, H);
  const sheen = g.createLinearGradient(0, 0, W * 0.8, H);
  sheen.addColorStop(0, "rgba(150,196,214,0.07)");
  sheen.addColorStop(0.45, "rgba(90,130,150,0.02)");
  sheen.addColorStop(1, "rgba(0,0,0,0.18)");
  g.fillStyle = sheen;
  g.fillRect(0, 0, W, H);
  return c;
}

export type MountOptions = {
  /** Called once the first frame has actually been drawn. */
  onFirstFrame?: () => void;
};

export function mountCabinetTable3D(host: HTMLElement, options: MountOptions = {}): CabinetTable3D {
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  // 1.5 is enough for bevels this size, and the budget matters more: Pixi is
  // running its own renderer over the top of this one.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  Object.assign(renderer.domElement.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
    pointerEvents: "none",
  });
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAM.fovDeg, REF.w / REF.h, 0.1, 40);
  camera.position.set(0, CAM.y, CAM.z);
  camera.rotation.order = "YXZ";
  camera.rotation.x = -d2r(CAM.pitchDeg);

  // Lighting, unchanged from the insert-only table so the panels keep reading
  // the same. The key sits where the painted table's own highlights come from
  // — front, above, player's left — so a glint appearing mid-turn agrees with
  // the picture around it.
  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x08161a, 0.35));
  const key = new THREE.DirectionalLight(0xfff2dc, 2.4);
  key.position.set(-1.6, 3.0, 2.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6fb8d8, 0.8);
  fill.position.set(2.4, 1.4, 1.2);
  scene.add(fill);
  const FILL_BASE = 0.8;

  // Something for the brass and the bevels to reflect. Set as the scene's
  // environment only — never as its background, which stays transparent.
  const envTex = own(tex(environmentTexture()));
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  // Applied per material rather than scene-wide: the insert was colour-matched
  // against the painting without one and must not pick up reflections now.

  renderer.localClippingEnabled = true;
  const surface = [new THREE.Plane(new THREE.Vector3(0, -1, 0), SURFACE_CLIP)];

  // --- the fixed shell ------------------------------------------------------

  const outline = topOutline();
  // Narrow where the band runs across the near edge, full width down the
  // sides — the proportions the art actually has.
  // Only the near edge narrows. The far edge keeps its full width: the art
  // has about 11px of brass along the back and 6px across the front.
  const brassWidth = (nx: number, nz: number) => Math.abs(nx) + (nz > 0 ? 1 : 0.35) * Math.abs(nz);
  const feltEdge = offsetLoop(outline, BRASS_W, brassWidth);
  const bayFrames = [0, 1, 2].map((i) => bayLoop((i - 1) * BAY.pitchX, RIM));
  const bayOpenings = [0, 1, 2].map((i) => bayLoop((i - 1) * BAY.pitchX));

  const shell = new THREE.Group();
  scene.add(shell);

  // Cloth, with a real opening under each bay. A solid sheet looked right
  // until a plate turned and there was still felt underneath it.
  const feltMap = own(tex(feltTexture()));
  feltMap.repeat.set(1 / (FELT_X * 2), 1 / (FELT_Z1 - FELT_Z0));
  feltMap.offset.set(0.5, 1 + FELT_Z0 / (FELT_Z1 - FELT_Z0));
  const felt = new THREE.Mesh(
    own(edgeFade(new THREE.ShapeGeometry(sheetShape(feltEdge, bayFrames)))),
    own(new THREE.MeshStandardMaterial({
      map: feltMap,
      // The map carries the measured colour; the diffuse term under this
      // cabinet's weak key would otherwise crush it by about eight times, the
      // same way it crushed the insert, so emissive carries most of it and the
      // diffuse is left to do the light response.
      emissive: 0xffffff,
      // Measured back off the render: 1.35 came out about half again too
      // bright across the middle of the cloth.
      emissiveMap: feltMap,
      emissiveIntensity: 1,
      roughness: 0.92,
      metalness: 0,
      vertexColors: true,
    }))
  );
  felt.rotation.x = -Math.PI / 2;
  shell.add(felt);

  // The brass edging. Bright on its outer bevel, flat across the top, then
  // down to the cloth; the two hairlines are painted, not modelled — at 2px on
  // screen, geometry that fine costs more than it shows.
  const brassMap = own(mapTex(sectionTexture(
    [[0, "#8a6a3a"], [0.12, "#d9b57a"], [0.3, "#b88948"], [0.78, "#73502c"], [1, "#3d2c17"]],
    [[0.55, 0.008, "#c79a4e"], [0.6, 0.008, "#c79a4e"]]
  )));
  const brassMat = own(new THREE.MeshStandardMaterial({
    map: brassMap,
    emissiveMap: brassMap,
    // Brass at 0.72 has almost no diffuse term, and three lights plus a small
    // environment left the far edge at #37210c against the painting's
    // #c19d6a. Half metal, with the map carried on emissive as well, is what
    // puts it back on the painted colour.
    metalness: 0.45,
    roughness: 0.38,
    envMap: envTex,
    envMapIntensity: 1.2,
    emissive: 0xffffff,
    emissiveIntensity: 0.28,
    vertexColors: true,
    side: THREE.DoubleSide,
  }));
  shell.add(new THREE.Mesh(
    own(depthShade(edgeFade(bandGeometry(outline, [[0, -0.002], [0.008, 0.006], [0.026, 0.006], [BRASS_W, 0]], brassWidth)), 2.2, 0.3)),
    brassMat
  ));

  // The skirt: the table's own thickness, leaning in as it drops the way the
  // art's near edge does (rows 254..280 pull in by 56px).
  const skirtBottom = outline.map(([x, z]) => [x * SKIRT_INSET, z] as Pt);
  shell.add(new THREE.Mesh(
    own(depthShade(edgeFade(wallGeometry(outline, -0.002, skirtBottom, -SKIRT_DROP)), 2.2, 0.3)),
    brassMat
  ));

  // One bay frame per bay, each with its own material so a single bay can be
  // lit without the others. The section is three segments — rise, top, fall to
  // the opening — so the bevel breaks the light instead of rolling over.
  const frameSection = [[0, 0], [0.013, SURFACE_CLIP], [0.03, SURFACE_CLIP], [RIM, -0.007]] as const;
  const frameMap = own(mapTex(sectionTexture(
    [[0, "#1d3538"], [0.18, "#4b7c80"], [0.42, "#335a5d"], [0.86, "#2a4b4e"], [1, "#16282a"]],
    [[0.62, 0.01, "#c79a4e"], [0.93, 0.01, "#c79a4e"]]
  )));
  // Only a narrow band at the inner edge can glow, so a highlight reads as the
  // frame lighting up rather than the whole surround turning on.
  const frameGlow = own(mapTex(sectionTexture([
    [0, "#000000"], [0.74, "#000000"], [0.84, "#ffffff"], [0.97, "#ffffff"], [1, "#000000"],
  ])));
  const frameMats = bayFrames.map((loop) => {
    const mat = own(new THREE.MeshStandardMaterial({
      map: frameMap,
      emissive: 0x000000,
      emissiveMap: frameGlow,
      emissiveIntensity: 0,
      metalness: 0.52,
      roughness: 0.36,
      envMap: envTex,
      envMapIntensity: 0.35,
      vertexColors: true,
      side: THREE.DoubleSide,
    }));
    shell.add(new THREE.Mesh(own(edgeFade(bandGeometry(loop, frameSection))), mat));
    return mat;
  });

  // The hole under each bay. Walls just outside the opening, because the plate
  // sweeps to 0.2257 and the opening is 0.2256.
  const wellMat = own(new THREE.MeshStandardMaterial({
    color: 0x03070a,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  }));
  const wellFloorGeo = own(new THREE.PlaneGeometry(BAY_W * 1.02, BAY_D * 1.02));
  for (let i = 0; i < 3; i++) {
    const mouth = offsetLoop(bayOpenings[i], -0.003);
    shell.add(new THREE.Mesh(own(wallGeometry(mouth, -0.012, mouth, -WELL_D)), wellMat));
    const floor = new THREE.Mesh(wellFloorGeo, wellMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((i - 1) * BAY.pitchX, -WELL_D, BAY_Z);
    shell.add(floor);
  }

  // The mechanism below the table. Only about 60 of its rows are inside the
  // 350px box and nearly all of it is black, so it is a dark block with the
  // brass bearing blocks the art shows at the bottom edge, not a model of a
  // machine nobody can see.
  // A leaning panel rather than a box: a box's top face is nearer the camera
  // than the skirt above it and hid it, and the art's silhouette here stays
  // the same width all the way down, which only a panel tipping toward the
  // player can do. Both edges are unprojected straight off the art.
  // Three rows, each unprojected from the art silhouette: wide where it tucks
  // up behind the skirt, then the straight sides the art holds all the way
  // down. Two rows left an 8px hole between the skirt's foot and this.
  const MECH_ROWS: readonly (readonly [number, number, number])[] = [
    [1030, 277, -SKIRT_DROP], [925.5, 288, -0.175], [MECH_TOP_PX[0], 352, -0.45],
  ];
  const mechPos: number[] = [];
  const mechIdx: number[] = [];
  MECH_ROWS.forEach(([px, py, y]) => {
    const [x, z] = unprojectArt(px, py, y);
    mechPos.push(-x, y, z, x, y, z);
  });
  for (let i = 0; i < MECH_ROWS.length - 1; i++) {
    const b = i * 2;
    mechIdx.push(b, b + 3, b + 1, b, b + 2, b + 3);
  }
  const mechBot = unprojectArt(MECH_ROWS[2][0], MECH_ROWS[2][1], MECH_ROWS[2][2]);
  const mechGeo = own(new THREE.BufferGeometry());
  mechGeo.setAttribute("position", new THREE.Float32BufferAttribute(mechPos, 3));
  mechGeo.setIndex(mechIdx);
  mechGeo.computeVertexNormals();
  shell.add(new THREE.Mesh(mechGeo, own(new THREE.MeshStandardMaterial({
    color: 0x0a0d10,
    roughness: 0.78,
    metalness: 0.2,
    side: THREE.DoubleSide,
  }))));
  // The axle and its bearing blocks, which are all the art shows of the
  // machinery before the box cuts it off.
  const axle = new THREE.Mesh(
    own(new THREE.CylinderGeometry(0.045, 0.045, mechBot[0] * 1.72, 12)),
    own(new THREE.MeshStandardMaterial({ color: 0x15181b, metalness: 0.55, roughness: 0.43 }))
  );
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, -0.36, mechBot[1] + 0.03);
  shell.add(axle);
  const supportMat = own(new THREE.MeshStandardMaterial({
    color: 0xb88948,
    metalness: 0.72,
    roughness: 0.33,
    envMap: envTex,
    emissive: 0xb88948,
    emissiveIntensity: 0.3,
  }));
  const supportGeo = own(new THREE.BoxGeometry(0.15, 0.14, 0.1));
  for (const sx of [-1, 1]) {
    const s = new THREE.Mesh(supportGeo, supportMat);
    s.position.set(sx * mechBot[0] * 0.62, -0.36, mechBot[1] + 0.04);
    shell.add(s);
  }

  // The catch plates on each bay's frame, fore and aft: the hardware a real
  // panel would pivot and latch on, and the reason a bay reads as something
  // that can turn at all. The art has them at x=556, rows 64..72 and 200..214.
  const rearGeo = own(new THREE.BoxGeometry(0.115, 0.01, 0.022));
  const frontGeo = own(new THREE.BoxGeometry(0.186, 0.012, 0.046));
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * BAY.pitchX;
    for (const [geo, z] of [[rearGeo, BAY.zFar - RIM / 2], [frontGeo, BAY.zNear + RIM / 2]] as const) {
      const clip = new THREE.Mesh(geo, supportMat);
      clip.position.set(x, SURFACE_CLIP + 0.004, z);
      shell.add(clip);
    }
  }

  /**
   * The table again, as depth only.
   *
   * Below the surface a plate is inside its slot in world terms but still
   * projects down the screen past the frame, and at this grazing angle the
   * shell above cannot be relied on to cover every pixel of that. This is the
   * table's own outline with the three openings cut out of it, written to the
   * depth buffer before anything else: it hides whatever is under the table
   * except through a slot. Clipped to the outline rather than run out to the
   * horizon so the mechanism below the near edge still shows.
   */
  const occluderMesh = new THREE.Mesh(
    own(new THREE.ShapeGeometry(sheetShape(outline, bayOpenings))),
    own(new THREE.MeshBasicMaterial({ colorWrite: false }))
  );
  occluderMesh.rotation.x = -Math.PI / 2;
  // Below the cloth, not above it. Sat at +0.0005 it was nearer the camera
  // than the felt and the depth test threw the whole table surface away.
  occluderMesh.position.y = -0.012;
  occluderMesh.renderOrder = -1;
  scene.add(occluderMesh);

  // --- the moving part ------------------------------------------------------

  // Matching the painting is done with emissive, not with the lit colour.
  // Lying flat under this cabinet's weak key, a diffuse panel set to the
  // painted colour rendered at #000202 against the painting's #0c1a1a.
  const faceTex = own(tex(insertFaceTexture()));
  const faceMat = own(new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveMap: faceTex,
    emissiveIntensity: 1.9,
    roughness: 0.45,
    metalness: 0,
    // The insert was measured against the painting without an environment and
    // matched it; it must not drift now that one exists for the brass.
    envMapIntensity: 0,
    clippingPlanes: surface,
  }));
  // The panel's own thickness, lit brighter than its face: edge-on, this thin
  // band is the only thing left to see, and it has to read.
  const edgeMat = own(new THREE.MeshStandardMaterial({
    color: 0x5d969d,
    roughness: 0.28,
    metalness: 0.75,
    envMapIntensity: 0.6,
    clippingPlanes: surface,
  }));

  const plateGeo = own(new THREE.BoxGeometry(BAY_W, PLATE_T, BAY_D));

  type Bay = { pivot: THREE.Group; angle: number; startedAt: number; durationMs: number };
  const bays: Bay[] = [];

  for (let i = 0; i < 3; i++) {
    // BoxGeometry orders its materials +x -x +y -y +z -z, so the same face
    // goes on both the top and the bottom: turning the panel over presents
    // another empty slot and the table is immediately playable again.
    const plate = new THREE.Mesh(plateGeo, [
      edgeMat, edgeMat, faceMat, faceMat, edgeMat, edgeMat,
    ]);
    // The pivot runs far-to-near through the middle of the bay, so the plate
    // closes sideways — the direction the card closes in the owner's reference
    // clip — rather than tipping toward or away from the player.
    const pivot = new THREE.Group();
    pivot.position.set((i - 1) * BAY.pitchX, 0, BAY_Z);
    pivot.add(plate);
    scene.add(pivot);
    bays.push({ pivot, angle: 0, startedAt: 0, durationMs: 0 });
  }

  // --- projection -----------------------------------------------------------

  /**
   * Where a bay opening lands on the canvas, for whoever draws the cards.
   * `live` follows the plate through its turn; otherwise the bay is taken at
   * rest, which is the layout the cards are dealt into.
   */
  const scratch = new THREE.Vector3();
  const quadFor = (i: number, live = false): TableQuad => {
    const bay = bays[i];
    const x = (i - 1) * BAY.pitchX;
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    const out: number[] = [];
    const corners: [number, number][] = [
      [-BAY.halfW, BAY.zFar], [BAY.halfW, BAY.zFar],
      [BAY.halfW, BAY.zNear], [-BAY.halfW, BAY.zNear],
    ];
    for (const [cx, cz] of corners) {
      if (live && bay) {
        // Local to the pivot, so the rotation the plate is holding this frame
        // is applied for free by the pivot's own world matrix.
        scratch.set(cx, PLATE_T / 2, cz - BAY_Z);
        bay.pivot.updateWorldMatrix(true, false);
        scratch.applyMatrix4(bay.pivot.matrixWorld);
      } else {
        scratch.set(x + cx, 0, cz);
      }
      scratch.project(camera);
      out.push(((scratch.x + 1) / 2) * w, ((1 - scratch.y) / 2) * h);
    }
    return out as TableQuad;
  };

  const resize = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    // Deliberately not w/h: the projection is locked to the art's own frame,
    // so a frame where the box has not been laid out yet cannot move the bays.
    camera.aspect = REF.w / REF.h;
    camera.updateProjectionMatrix();
  };
  resize();

  let raf = 0;
  let disposed = false;
  let drew = false;
  const tick = () => {
    if (disposed) return;
    const now = performance.now();
    for (const b of bays) {
      if (b.durationMs > 0) {
        const t = Math.min((now - b.startedAt) / b.durationMs, 1);
        // Ease in then out: a panel on a real pivot breaks away slowly, whips
        // through the edge-on moment and settles into its catches.
        const e = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
        b.angle = Math.PI * e;
        if (t >= 1) {
          b.durationMs = 0;
          b.angle = 0;
        }
      }
      b.pivot.rotation.z = b.angle;
    }
    renderer.render(scene, camera);
    if (!drew) {
      drew = true;
      options.onFirstFrame?.();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  // The host can still be laid out at zero height on the frame it mounts,
  // which does not look broken on screen but silently ruins slotQuads(), so
  // the size is taken again whenever the box actually settles.
  const observer = new ResizeObserver(() => resize());
  observer.observe(host);

  return {
    flipSlot(index, durationMs = 420) {
      const b = bays[index];
      if (!b) return;
      b.startedAt = performance.now();
      b.durationMs = durationMs;
    },
    slotProgress(index) {
      const b = bays[index];
      return b ? (b.angle / Math.PI) * 2 : 0;
    },
    slotQuads: () => [quadFor(0), quadFor(1), quadFor(2)],
    livePlateQuad: (index) => quadFor(index, true),
    setSlotHighlight(index, color = 0x9fd8ff, intensity = 0) {
      const mat = frameMats[index];
      if (!mat) return;
      mat.emissive.setHex(color);
      mat.emissiveIntensity = Math.max(0, Math.min(1, intensity)) * 2.2;
    },
    setCabinetReaction(color = 0x6fb8d8, intensity = 0) {
      fill.color.setHex(color);
      fill.intensity = FILL_BASE + Math.max(0, Math.min(1, intensity)) * 0.35;
    },
    canvasEl: () => renderer.domElement,
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
