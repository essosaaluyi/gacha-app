import * as THREE from "three";

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
 * 3. NO LIGHTS. Nothing here is lit. Every surface takes its colour from the
 *    painting, pinned on by running the camera forwards (`projectUV`), so the
 *    table is drawn from the very pixels the baked image was. This replaced a
 *    rig of three lights, a generated environment, generated cloth and section
 *    maps, emissive colour-matching and two passes of vertex shading — all of
 *    it there to argue with the fact that the painting is lit bright along the
 *    back while this cabinet's key is at the player's end. The painting wins
 *    the argument by being the texture. What the art cannot see, because it
 *    looks from one place, is listed in UNSEEN and is flat colour until it is
 *    painted (docs/cabinet-table-3d-texture-assets.md).
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

/** The painting's own size. It is drawn 420 tall and clipped at REF.h. */
const ART = { w: 1120, h: 420 };

/** An unlit material's colour at rest: the texture, untouched. */
const WHITE = new THREE.Color(0xffffff);

/** A world point into art pixels: the exact inverse of unprojectArt. */
function projectArt(x: number, y: number, z: number): [number, number] {
  const pitch = d2r(CAM.pitchDeg);
  const t = Math.tan(d2r(CAM.fovDeg) / 2);
  const aspect = REF.w / REF.h;
  const dy = y - CAM.y;
  const dz = z - CAM.z;
  const yc = Math.cos(pitch) * dy - Math.sin(pitch) * dz;
  const zc = Math.sin(pitch) * dy + Math.cos(pitch) * dz;
  return [
    ((x / -zc / (t * aspect) + 1) / 2) * REF.w,
    ((1 - yc / -zc / t) / 2) * REF.h,
  ];
}

/**
 * Pins the painting to a mesh by where that mesh lands on screen.
 *
 * The geometry was built by unprojecting measured art pixels through the
 * solved camera, so running the camera forwards again tells each vertex which
 * pixel of the painting it came from. Used as UVs, that makes the painting the
 * surface — not a likeness of it, the same pixels, with no resampling in
 * between and nothing for a light to do.
 *
 * It is a projection taken once, at rest, and then it belongs to the mesh. The
 * shell never moves, so for the shell it is simply exact. A plate carries its
 * own slice of the painting over with it as it turns, which is what a real one
 * does with its own paint.
 */
function projectUV(
  geometry: THREE.BufferGeometry,
  { dx = 0, dy = 0, dz = 0 }: { dx?: number; dy?: number; dz?: number } = {},
) {
  const pos = geometry.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    // The offsets are the mesh's own placement: UVs have to be projected from
    // where the mesh ends up in the world, not from where its geometry sits.
    const [px, py] = projectArt(pos.getX(i) + dx, pos.getY(i) + dy, pos.getZ(i) + dz);
    uv[i * 2] = px / ART.w;
    uv[i * 2 + 1] = py / ART.h;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
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

// --- the painted surface ----------------------------------------------------

/**
 * The painting, made safe to use as a texture.
 *
 * The same image the baked table was drawn with, with its cut-out edge flooded
 * outwards and its alpha dropped — see tools/make-table3d-textures.mjs. Both
 * matter: a sample taken at the silhouette would otherwise mix in transparent
 * black and darken the rim, and this canvas composites over the page, so any
 * alpha the texture carried would punch a hole through the table.
 */
const PAINT_MAP_URL = "/images/cabinet/table3d/table-paint.v1.webp";

/**
 * Everything that used to be a generated map — cloth weave, brass section,
 * frame section, environment — is gone. The painting already holds all of
 * them, correctly shaded, and nothing here is lit, so what the file holds is
 * what the screen shows.
 */
function loadPaintMap(onReady: () => void) {
  const t = new THREE.TextureLoader().load(PAINT_MAP_URL, onReady, undefined, onReady);
  t.colorSpace = THREE.SRGBColorSpace;
  // Row 0 of the file is the far edge of the table, which is what projectUV's
  // art pixels count from; the default flip would stand the painting on its
  // head.
  t.flipY = false;
  // No mipmaps, and no filtering off them.
  //
  // This texture is never minified: the UVs are the camera's own projection of
  // the geometry, so an art pixel covers about one screen pixel wherever it
  // lands — that is what projecting the painting onto the thing it is a picture
  // of means. A mip level is therefore never the right sample, only a blur of
  // one, and at the bay frames it was averaging the gold hairlines into their
  // surroundings and rendering the frame's inner edge about 25% too bright.
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** An unlit material: the map, or a flat colour, straight to the screen. */
function paint(options: {
  map?: THREE.Texture;
  color?: number;
  side?: THREE.Side;
  clippingPlanes?: THREE.Plane[];
}) {
  return new THREE.MeshBasicMaterial({
    map: options.map,
    color: options.color ?? 0xffffff,
    side: options.side ?? THREE.FrontSide,
    clippingPlanes: options.clippingPlanes,
  });
}

/**
 * The surfaces the painting cannot see.
 *
 * The art looks at the table from one place, so the walls inside a bay, the
 * back of a plate, the table's front thickness and the panel below it have no
 * pixels in it at all — nothing to unproject. They are flat colours until
 * Codex paints them (docs/cabinet-table-3d-texture-assets.md), sampled from
 * the nearest thing the art does show.
 */
const UNSEEN = {
  /** Inside a bay, below the surface. The art's slot interior is #0e1a1e. */
  well: 0x070d10,
  /** The floor of the well, darker than its walls. */
  wellFloor: 0x03070a,
  /** The back of a plate, seen only while it turns. */
  plateBack: 0x121a1d,
  /** A plate's thickness, edge-on at the middle of the turn. */
  plateEdge: 0x4a7a80,
  /** The panel below the near edge. */
  under: 0x0a0d10,
};


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
  // No tone mapping. The whole point of an unlit table is that a texture byte
  // reaches the screen unchanged; a tone curve across the middle of that would
  // pull the painting's own colours around on the way out.
  renderer.toneMapping = THREE.NoToneMapping;
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

  /**
   * There are no lights.
   *
   * The painted table was lit by whoever painted it: bright along the back,
   * falling away toward the player, with the brass catching the light from
   * behind. A real rig in here cannot reproduce that without moving the key to
   * where it would wreck the insert the owner already approved, and the five
   * rounds of measuring it took to get close were all spent fighting that one
   * disagreement. So the shading stays in the texture, every material is
   * unlit, and the lighting problem stops existing.
   */
  let mapReady = false;
  const paintMap = own(loadPaintMap(() => {
    mapReady = true;
  }));

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

  // Every material that takes the painting, kept so the cabinet's reaction can
  // tint them together.
  const painted: THREE.MeshBasicMaterial[] = [];
  const paintShell = (options: Parameters<typeof paint>[0]) => {
    const mat = own(paint({ map: paintMap, ...options }));
    painted.push(mat);
    return mat;
  };

  // Cloth, with a real opening under each bay. A solid sheet looked right
  // until a plate turned and there was still felt underneath it.
  // Laid down as geometry rather than by rotating the mesh, so its vertices
  // are already in the world and it can be projected the same way as every
  // other surface. Going through the shape's own UVs instead put the painting
  // about 6px off across the cloth in front of the bays.
  const feltGeo = new THREE.ShapeGeometry(sheetShape(feltEdge, bayFrames));
  feltGeo.rotateX(-Math.PI / 2);
  shell.add(new THREE.Mesh(own(projectUV(feltGeo)), paintShell({})));

  // The brass edging. Its bevel rises 0.006 and falls again inside 0.052, so
  // the band lies near enough flat for the painting's own brass to key onto it
  // by position — the hairlines, the bevel highlight and the back-to-front
  // gradient all arrive painted, none of them modelled or shaded.
  shell.add(new THREE.Mesh(
    own(projectUV(bandGeometry(outline, [[0, 0], [BRASS_W, 0]], brassWidth))),
    paintShell({ side: THREE.DoubleSide })
  ));

  // The skirt: the table's own thickness, leaning in as it drops the way the
  // art's near edge does (rows 254..280 pull in by 56px). Projecting it takes
  // those rows, which is the one place the art does show the table's side; the
  // skirt down the flanks and the back projects behind the table, where the
  // flooded art is near black — and so is anything tucked under a table.
  const skirtBottom = outline.map(([x, z]) => [x * SKIRT_INSET, z] as Pt);
  shell.add(new THREE.Mesh(
    own(projectUV(wallGeometry(outline, 0, skirtBottom, -SKIRT_DROP))),
    paintShell({ side: THREE.DoubleSide })
  ));

  // One bay frame per bay, each with its own material so a single bay can be
  // lit without the others. The section is three segments — rise, top, fall to
  // the opening — so the bevel breaks the light instead of rolling over.
  const frameSection = [[0, 0], [RIM, 0]] as const;
  // The gold hairlines and the bevel highlight were the worst of the remaining
  // differences from the painting while they were being modelled and lit. They
  // are not modelled or lit now: they are in the painting, and the frame is
  // keyed to the pixels they are in.
  const frameMats = bayFrames.map((loop) => {
    const mat = paintShell({ side: THREE.DoubleSide });
    shell.add(new THREE.Mesh(own(projectUV(bandGeometry(loop, frameSection))), mat));
    return mat;
  });

  // The hole under each bay. Walls just outside the opening, because the plate
  // sweeps to 0.2257 and the opening is 0.2256.
  const wellMat = own(paint({ color: UNSEEN.well, side: THREE.DoubleSide }));
  const wellFloorMat = own(paint({ color: UNSEEN.wellFloor }));
  const wellFloorGeo = own(new THREE.PlaneGeometry(BAY_W * 1.02, BAY_D * 1.02));
  for (let i = 0; i < 3; i++) {
    const mouth = offsetLoop(bayOpenings[i], -0.003);
    shell.add(new THREE.Mesh(own(wallGeometry(mouth, -0.012, mouth, -WELL_D)), wellMat));
    const floor = new THREE.Mesh(wellFloorGeo, wellFloorMat);
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
  const mechGeo = own(new THREE.BufferGeometry());
  mechGeo.setAttribute("position", new THREE.Float32BufferAttribute(mechPos, 3));
  mechGeo.setIndex(mechIdx);
  mechGeo.computeVertexNormals();
  // Projected like the rest of the shell: the art does show these rows, below
  // where the 350px box cuts the picture off, and they are nearly black.
  shell.add(new THREE.Mesh(own(projectUV(mechGeo)), paintShell({ side: THREE.DoubleSide })));
  // No axle, no bearing blocks, no catch plates.
  //
  // The painting draws all of them, and the surfaces they sat on carry the
  // painting now: the bay frames paint their own catches, and the panel below
  // the near edge paints the axle and its blocks. Modelling them again only
  // put flat colour over the top of their own picture — two bright brass
  // lumps where the art is black, in the case of the blocks.

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

  // The plate's face is the painted slot interior, taken from the painting at
  // the bay it sits in and then carried through the turn. Its old generated
  // face map and the emissive trick that made it match are both gone: the
  // painting was always the thing being matched.
  const faceMat = own(paint({ map: paintMap, clippingPlanes: surface }));
  painted.push(faceMat);
  // The panel's own thickness. Edge-on, halfway through a turn, this thin band
  // is the only thing left to see, so it reads lighter than the face. Nothing
  // in the art shows it.
  const edgeMat = own(paint({ color: UNSEEN.plateEdge, clippingPlanes: surface }));

  /**
   * One plate geometry per bay, in two draw groups instead of six.
   *
   * The UVs are the bay's own place in the painting, so the geometry cannot be
   * shared between bays. A BoxGeometry comes with one group per face, and six
   * groups times three plates was 18 of the table's 32 draw calls. The index
   * buffer is rewritten so the four sides come first and the two faces last,
   * which is two groups — 6 draw calls for all three plates, and the table
   * fits the spec's 24 at rest.
   */
  const plateGeo = (i: number) => {
    const g = new THREE.BoxGeometry(BAY_W, PLATE_T, BAY_D);
    const idx = g.getIndex()!.array;
    // BoxGeometry's faces are +x -x +y -y +z -z, six indices each.
    const sides = [0, 1, 4, 5].flatMap((f) => [...idx.slice(f * 6, f * 6 + 6)]);
    const faces = [2, 3].flatMap((f) => [...idx.slice(f * 6, f * 6 + 6)]);
    g.setIndex([...sides, ...faces]);
    g.clearGroups();
    g.addGroup(0, sides.length, 0);
    g.addGroup(sides.length, faces.length, 1);
    return own(projectUV(g, { dx: (i - 1) * BAY.pitchX, dz: BAY_Z }));
  };
  const plateGeos = [0, 1, 2].map(plateGeo);

  type Bay = { pivot: THREE.Group; angle: number; startedAt: number; durationMs: number };
  const bays: Bay[] = [];

  for (let i = 0; i < 3; i++) {
    // Sides first, then both flat faces — the regrouping above. The same face
    // material goes on the top and the bottom, so turning the panel over
    // presents another empty slot and the table is immediately playable again.
    const plate = new THREE.Mesh(plateGeos[i], [edgeMat, faceMat]);
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
    // The baked image behind this canvas is only taken away once there is
    // something to replace it with. Everything here is its texture now, so a
    // frame drawn before that file arrives is a bare grey table.
    if (!drew && mapReady) {
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
    // Both of these used to move a light. With nothing lit, they tint the
    // material's own multiplier instead: the painting is what gets brighter or
    // takes on a colour, which is also what a lamp behind a painted panel
    // would do. A frame no longer glows only along its inner edge — that was
    // the emissive map's doing — so this is the whole frame coming up.
    setSlotHighlight(index, color = 0x9fd8ff, intensity = 0) {
      const mat = frameMats[index];
      if (!mat) return;
      const k = Math.max(0, Math.min(1, intensity));
      mat.color.setHex(color).lerp(WHITE, 1 - k).multiplyScalar(1 + k * 0.7);
    },
    setCabinetReaction(color = 0x6fb8d8, intensity = 0) {
      const k = Math.max(0, Math.min(1, intensity)) * 0.18;
      for (const mat of painted) mat.color.setHex(color).lerp(WHITE, 1 - k);
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
