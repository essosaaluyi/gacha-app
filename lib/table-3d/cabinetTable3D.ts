import * as THREE from "three";

import { canvas, tex } from "@/lib/button-3d/runtime";

/**
 * The black insert each card sits in, as real geometry.
 *
 * Owner decision 2026-11-13: the whole table was briefly modelled in three.js
 * and then pulled back. The painted table is good and there is no reason to
 * reproduce felt, bevels and brasswork in a renderer to make one part move.
 * Only the black panel inside each bay is 3D now; everything else is still the
 * baked card-table-premium-three-bay image showing through behind it.
 *
 * That panel is the one part that has to move: a leaving card turns over with
 * it and goes under the table.
 *
 * CAMERA: not invented. The baked art is a true perspective render, so the
 * camera was solved back out of the three bay quads BattlePixiStage had been
 * calibrated against (CABINET_TABLE_SLOT_QUADS). The fit lands within 2.7px RMS
 * across the full 1120px width, so the panels sit exactly on the black areas
 * the painting already has, and the cards still land inside them.
 */

/** Solved from the baked art; read the note above before touching any of these. */
const CAM = { y: 1.8549, z: 2.3988, pitchDeg: 48.849, fovDeg: 22.3608 };
const BAY = { halfW: 0.2256, zFar: 0.3818, zNear: 0.8298, pitchX: 0.7215 };
const BAY_W = BAY.halfW * 2;
const BAY_D = BAY.zNear - BAY.zFar;
const BAY_Z = (BAY.zNear + BAY.zFar) / 2;
const PLATE_T = 0.014;
/**
 * The colour the painting already uses inside a bay, sampled straight out of
 * card-table-premium-three-bay-center-only-1120x420.webp. The panel has to
 * disappear into the slot while it is at rest, so this is the target, not a
 * guess at "black" — the painted slot is a very dark green, not black at all.
 */
const BAY_PAINT = "#0e1a1b";
/**
 * Nothing of the panel is drawn above the table surface. A panel really
 * hinged in a table would swing up and stand proud of its frame, and it did,
 * and it looked like a flap landing on the brasswork. Clipped at the surface
 * it reads as turning down inside its own slot, which is what the owner is
 * after and also what the frame around it allows.
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
  /** The canvas the table is drawn on, for mapping its pixels onto another. */
  canvasEl(): HTMLCanvasElement;
  resize(): void;
  dispose(): void;
};

/**
 * The face of one black insert.
 *
 * Painted nearly black to sit inside the opening the table art already has.
 * It is not flat black: a panel turning in a dark cabinet is only legible
 * because it catches light, so there is a faint sheen across it and the
 * material below keeps enough specular to pick up the key as it rotates.
 */
function insertFaceTexture() {
  const W = 512;
  const H = Math.round((W * BAY_D) / BAY_W);
  const { c, g } = canvas(W, H);
  g.fillStyle = BAY_PAINT;
  g.fillRect(0, 0, W, H);
  // Only enough sheen to say "surface". The panel has to pass for the painted
  // slot while it is sitting still, so anything stronger shows up as a patch.
  const sheen = g.createLinearGradient(0, 0, W * 0.8, H);
  sheen.addColorStop(0, "rgba(150,196,214,0.07)");
  sheen.addColorStop(0.45, "rgba(90,130,150,0.02)");
  sheen.addColorStop(1, "rgba(0,0,0,0.18)");
  g.fillStyle = sheen;
  g.fillRect(0, 0, W, H);
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

  // Nothing but the three inserts is drawn: the canvas is transparent and the
  // painted table shows through everywhere else, so there is no felt, no
  // surround and no fog to blend into.
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAM.fovDeg, 1, 0.1, 40);
  camera.position.set(0, CAM.y, CAM.z);
  camera.rotation.order = "YXZ";
  camera.rotation.x = -THREE.MathUtils.degToRad(CAM.pitchDeg);

  // Lighting. A black panel lying flat in a dark cabinet has almost nothing to
  // show, and it only becomes legible once it tilts and catches something. The
  // key is therefore placed where the painted table's own highlights come from
  // — front, above, player's left — so the glint that appears mid-turn agrees
  // with the picture it is sitting in.
  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x08161a, 0.35));
  const key = new THREE.DirectionalLight(0xfff2dc, 2.4);
  key.position.set(-1.6, 3.0, 2.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6fb8d8, 0.8);
  fill.position.set(2.4, 1.4, 1.2);
  scene.add(fill);

  // Everything above the table surface is cut away, so the panel turns down
  // into its slot instead of swinging up over the painted frame.
  renderer.localClippingEnabled = true;
  const surface = [new THREE.Plane(new THREE.Vector3(0, -1, 0), SURFACE_CLIP)];

  // The other half of the same problem. Below the surface the panel is inside
  // the slot in world terms but still projects down past the near edge of the
  // frame on screen, because the table it would disappear behind is a picture
  // on another layer and cannot occlude anything. This is that table as depth
  // only: an invisible sheet at the surface with the three openings cut out of
  // it, which hides whatever is under the table except through a slot.
  const occluder = new THREE.Shape();
  const REACH = 6;
  occluder.moveTo(-REACH, -BAY_Z - REACH);
  occluder.lineTo(REACH, -BAY_Z - REACH);
  occluder.lineTo(REACH, -BAY_Z + REACH);
  occluder.lineTo(-REACH, -BAY_Z + REACH);
  occluder.closePath();
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * BAY.pitchX;
    const hole = new THREE.Path();
    hole.moveTo(x - BAY.halfW, -BAY.zFar);
    hole.lineTo(x + BAY.halfW, -BAY.zFar);
    hole.lineTo(x + BAY.halfW, -BAY.zNear);
    hole.lineTo(x - BAY.halfW, -BAY.zNear);
    hole.closePath();
    occluder.holes.push(hole);
  }
  const occluderMesh = new THREE.Mesh(
    own(new THREE.ShapeGeometry(occluder)),
    own(new THREE.MeshBasicMaterial({ colorWrite: false }))
  );
  occluderMesh.rotation.x = -Math.PI / 2;
  // Depth before anything else, so the panels test against it.
  occluderMesh.renderOrder = -1;
  scene.add(occluderMesh);

  // Matching the painting is done with emissive, not with the lit colour.
  // Lying flat under this cabinet's weak key, a diffuse panel set to the
  // painted colour rendered at #000202 against the painting's #0c1a1a — eight
  // times too dark — because the lighting and the tone map crush it. Emissive
  // skips both, so the panel reads as the painted slot while it is still, and
  // the specular on top is then free to do nothing but carry the turn.
  const faceTex = own(tex(insertFaceTexture()));
  const faceMat = own(new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveMap: faceTex,
    // Tuned against the painting on screen, not picked. The painted slot
    // measures #0c1a1a there; 1.15 gave #050f10 and 2.7 gave #102425, and
    // this is the value between them that lands on it.
    emissiveIntensity: 1.9,
    roughness: 0.45,
    metalness: 0,
    clippingPlanes: surface,
  }));
  // The panel's own thickness, lit brighter than its face: edge-on, this thin
  // band is the only thing left to see, and it has to read.
  const edgeMat = own(new THREE.MeshStandardMaterial({
    color: 0x5d969d,
    roughness: 0.28,
    metalness: 0.75,
    clippingPlanes: surface,
  }));

  // What the panel turns away from. The painted bay underneath is dark teal,
  // not black, so without this the slot got *lighter* the moment its panel
  // moved — exactly backwards. Slightly undersized and set just below the
  // panel so this camera angle can never catch an edge of it at rest.
  const floorMat = own(new THREE.MeshStandardMaterial({
    color: 0x03070a,
    roughness: 1,
    metalness: 0,
  }));
  const floor = own(new THREE.PlaneGeometry(BAY_W * 0.96, BAY_D * 0.96));

  const plateGeo = own(new THREE.BoxGeometry(BAY_W, PLATE_T, BAY_D));

  type Bay = { pivot: THREE.Group; angle: number; startedAt: number; durationMs: number };
  const bays: Bay[] = [];

  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * BAY.pitchX;

    const base = new THREE.Mesh(floor, floorMat);
    base.rotation.x = -Math.PI / 2;
    base.position.set(x, -0.012, BAY_Z);
    scene.add(base);

    // BoxGeometry orders its materials +x -x +y -y +z -z, so the same face goes
    // on both the top and the bottom: turning the panel over presents another
    // empty slot and the table is immediately playable again.
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
