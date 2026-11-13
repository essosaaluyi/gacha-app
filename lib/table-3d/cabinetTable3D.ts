import * as THREE from "three";

import { canvas, tex } from "@/lib/button-3d/runtime";

/**
 * The card table as real geometry.
 *
 * It used to be one baked image (card-table-premium-three-bay-...webp) with the
 * three bays painted into it, which meant a bay could never move. The owner
 * wants a leaving card to drop through its slot — the slot turns over and takes
 * the card under the table — so the bays have to be objects.
 *
 * CAMERA: not invented. The baked art is a true perspective render, so the
 * camera was solved back out of the three bay quads BattlePixiStage had been
 * calibrated against (CABINET_TABLE_SLOT_QUADS). The fit lands within 2.7px RMS
 * across the full 1120px width, so the 3D table puts its bays where players
 * have always seen them and the cards still land inside them.
 */

/** Solved from the baked art; read the note above before touching any of these. */
const CAM = { y: 1.8549, z: 2.3988, pitchDeg: 48.849, fovDeg: 22.3608 };
const BAY = { halfW: 0.2256, zFar: 0.3818, zNear: 0.8298, pitchX: 0.7215 };
const BAY_W = BAY.halfW * 2;
const BAY_D = BAY.zNear - BAY.zFar;
const BAY_Z = (BAY.zNear + BAY.zFar) / 2;
/** How far the frame stands proud of the bay opening. */
const RIM = 0.034;
const PLATE_T = 0.016;
/** How deep the hole under a bay goes once its plate has turned away. */
const WELL_D = 0.26;

const FELT = "#17383c";
const FELT_DARK = "#0e2529";
const GOLD = "#c79a4e";
const EDGE = "#8fd3d8";

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
  /** The canvas the table is drawn on, for mapping its pixels onto another. */
  canvasEl(): HTMLCanvasElement;
  resize(): void;
  dispose(): void;
};

function feltTexture() {
  const { c, g } = canvas(1024, 512);
  g.fillStyle = FELT;
  g.fillRect(0, 0, 1024, 512);
  // Cloth: fine speckle, then a soft darkening toward the edges so the surface
  // does not read as flat paint under a single key light.
  const img = g.getImageData(0, 0, 1024, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const v = g.createRadialGradient(512, 256, 120, 512, 256, 620);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = v;
  g.fillRect(0, 0, 1024, 512);
  return c;
}

/**
 * The face of a bay plate, in plan. Painted rather than modelled because every
 * line here is flush detail — a bevel, two hairlines and two catch plates — and
 * geometry that fine would cost more than it shows at this size. The plate is
 * drawn the same on both faces, so a bay that has turned over presents another
 * empty bay, which is what lets the table keep playing after a flip.
 */
function bayFaceTexture() {
  const W = 512;
  const H = Math.round((W * (BAY_D + RIM * 2)) / (BAY_W + RIM * 2));
  const { c, g } = canvas(W, H);
  const m = Math.round((W * RIM) / (BAY_W + RIM * 2));

  // Bevelled rim: a bright top-left catch and a shadowed bottom-right, which is
  // what makes the opening read as sunk into the cloth rather than printed on.
  const bevel = g.createLinearGradient(0, 0, W, H);
  bevel.addColorStop(0, "#5f949a");
  bevel.addColorStop(0.5, "#2a5a60");
  bevel.addColorStop(1, FELT);
  g.fillStyle = bevel;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = EDGE;
  g.lineWidth = 2;
  g.strokeRect(1, 1, W - 2, H - 2);

  // The opening.
  g.fillStyle = FELT_DARK;
  g.fillRect(m, m, W - m * 2, H - m * 2);
  g.fillStyle = "#0a1a1f";
  g.fillRect(m + 4, m + 4, W - (m + 4) * 2, H - (m + 4) * 2);

  // Gold hairlines just inside the opening, doubled the way the art has them.
  g.strokeStyle = GOLD;
  g.lineWidth = 2;
  for (const inset of [m + 11, m + 19]) {
    g.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  }
  // Corner ticks on the inner hairline.
  g.lineWidth = 3;
  const t = 26;
  for (const [cx, sx] of [[m + 11, 1], [W - m - 11, -1]] as const) {
    for (const [cy, sy] of [[m + 11, 1], [H - m - 11, -1]] as const) {
      g.beginPath();
      g.moveTo(cx + sx * t, cy);
      g.lineTo(cx, cy);
      g.lineTo(cx, cy + sy * t);
      g.stroke();
    }
  }

  // Catch plates at the far and near edges: the hardware a real panel would
  // pivot and latch on, and the reason the bay reads as something that can turn.
  const tabW = W * 0.19;
  const tabH = m * 0.74;
  for (const y of [m * 0.13, H - m * 0.13 - tabH]) {
    const x = (W - tabW) / 2;
    g.fillStyle = "#b99247";
    g.fillRect(x, y, tabW, tabH);
    g.fillStyle = "#e8cf8e";
    g.fillRect(x, y, tabW, Math.max(2, tabH * 0.28));
    g.strokeStyle = "#6d521f";
    g.lineWidth = 1.5;
    g.strokeRect(x, y, tabW, tabH);
  }
  return c;
}

export function mountCabinetTable3D(host: HTMLElement): CabinetTable3D {
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // The cabinet around the table is nearly black, so a correctly exposed table
  // reads as a lit panel pasted onto it. Held well down to sit in the machine.
  renderer.toneMappingExposure = 0.98;
  Object.assign(renderer.domElement.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
  });
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // The far end of the table runs out into the cabinet's own darkness instead
  // of stopping at a lit edge. The near limit is just past the player's side of
  // the bays so the front of the table stays readable.
  scene.fog = new THREE.Fog(0x02070a, 1.9, 5.2);
  const camera = new THREE.PerspectiveCamera(CAM.fovDeg, 1, 0.1, 40);
  camera.position.set(0, CAM.y, CAM.z);
  camera.rotation.order = "YXZ";
  camera.rotation.x = -THREE.MathUtils.degToRad(CAM.pitchDeg);

  // Lighting. The table sits inside a dark cabinet lit from the player's side,
  // so the key comes from front-above and the rest is fill. A back rim would
  // put a bright line along the far edge of every bay, which the cabinet has
  // no light to justify.
  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x08161a, 0.55));
  const key = new THREE.DirectionalLight(0xfff2dc, 2.1);
  key.position.set(-1.6, 3.0, 2.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6fb8d8, 0.7);
  fill.position.set(2.4, 1.4, 1.2);
  scene.add(fill);

  // Felt, with a real opening under each bay. A solid sheet looked right until
  // a plate turned and there was still cloth underneath it — the bay has to be
  // a hole in the table, not a lid painted on one.
  //
  // The shape is authored in (x, -z) and then laid down, so a hole at world z
  // is cut at shape y = -z. Shape coordinates come straight through as UVs, so
  // the map is scaled to put the whole 8-unit sheet inside 0..1 and the texture
  // vignette lands where it belongs.
  const FELT_HALF = 4;
  const sheet = new THREE.Shape();
  sheet.moveTo(-FELT_HALF, -BAY_Z - FELT_HALF);
  sheet.lineTo(FELT_HALF, -BAY_Z - FELT_HALF);
  sheet.lineTo(FELT_HALF, -BAY_Z + FELT_HALF);
  sheet.lineTo(-FELT_HALF, -BAY_Z + FELT_HALF);
  sheet.closePath();
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * BAY.pitchX;
    const hw = BAY.halfW + RIM;
    const hole = new THREE.Path();
    hole.moveTo(x - hw, -BAY.zFar + RIM);
    hole.lineTo(x + hw, -BAY.zFar + RIM);
    hole.lineTo(x + hw, -BAY.zNear - RIM);
    hole.lineTo(x - hw, -BAY.zNear - RIM);
    hole.closePath();
    sheet.holes.push(hole);
  }
  const feltMap = own(tex(feltTexture()));
  feltMap.repeat.set(1 / (FELT_HALF * 2), 1 / (FELT_HALF * 2));
  feltMap.offset.set(0.5, 0.5 + BAY_Z / (FELT_HALF * 2));
  const felt = new THREE.Mesh(
    own(new THREE.ShapeGeometry(sheet)),
    own(new THREE.MeshStandardMaterial({
      map: feltMap,
      roughness: 0.92,
      metalness: 0,
    }))
  );
  felt.rotation.x = -Math.PI / 2;
  scene.add(felt);

  const faceMat = own(new THREE.MeshStandardMaterial({
    map: own(tex(bayFaceTexture())),
    roughness: 0.58,
    metalness: 0.25,
  }));
  const edgeMat = own(new THREE.MeshStandardMaterial({
    color: 0x3b6f75,
    roughness: 0.4,
    metalness: 0.6,
  }));
  const wellMat = own(new THREE.MeshStandardMaterial({
    color: 0x04090c,
    roughness: 1,
    metalness: 0,
  }));

  const plateGeo = own(new THREE.BoxGeometry(BAY_W + RIM * 2, PLATE_T, BAY_D + RIM * 2));
  const wellGeo = own(new THREE.BoxGeometry(BAY_W + RIM * 2, WELL_D, BAY_D + RIM * 2));

  type Bay = { pivot: THREE.Group; angle: number; startedAt: number; durationMs: number };
  const bays: Bay[] = [];

  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * BAY.pitchX;

    // The hole the plate turns away from. Sunk below the felt so none of it
    // shows until the plate is off the horizontal.
    const well = new THREE.Mesh(wellGeo, wellMat);
    well.position.set(x, -WELL_D / 2 - 0.004, BAY_Z);
    scene.add(well);

    // BoxGeometry orders its materials +x -x +y -y +z -z, so the bay face goes
    // on both the top and the bottom: turning the plate over presents another
    // empty bay and the table is immediately playable again.
    const plate = new THREE.Mesh(plateGeo, [
      edgeMat, edgeMat, faceMat, faceMat, edgeMat, edgeMat,
    ]);

    // The pivot runs far-to-near through the middle of the bay, so the plate
    // closes sideways — the direction the card closes in the owner's reference
    // clip — rather than tipping toward or away from the player.
    const pivot = new THREE.Group();
    pivot.position.set(x, 0, BAY_Z);
    pivot.add(plate);
    scene.add(pivot);

    bays.push({ pivot, angle: 0, startedAt: 0, durationMs: 0 });
  }

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
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  let raf = 0;
  let disposed = false;
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
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  // The host can still be laid out at zero height on the frame it mounts. That
  // leaves a 1px-tall buffer and an aspect ratio hundreds of times too wide,
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
