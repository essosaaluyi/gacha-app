// Real-3D cards: outlet stack → deal (cards hover above their bays) → tap to flip and land.
// Core three.js only (no addons). All motion runs on a sim clock so QA can pause and step.
//
// Everything that belongs to the table lives under one `root` group in TABLE-LOCAL units
// (see motion.ts). Two layouts place that group:
//   lab  — a free studio camera over a modelled table.
//   game — the battle cabinet's own camera (fov 40, 1920×1080 at z=0, as in
//          cabinetEject3DGeometry.ts). The root is fitted to the measured bay quads, the
//          table/bays come from the real game screen behind a transparent canvas.
import * as THREE from "three";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";
import { getCardDisplayCrop } from "@/components/gacha/pack-reveal/cardDisplayCrop";
import { playSfx, type SfxName } from "@/lib/audio/sfxStore";
import { CABINET_EJECT3D_DISTANCE, CABINET_EJECT3D_STAGE, createCabinetEject3DPlan, type CabinetEject3DGeometry } from "@/lib/battle-pixi/presentation/cabinetEject3DGeometry";
import {
  CARD, REST_Y, EJECT_MS, EJECT_STAGGER_MS, DEAL_MS, DEAL_STAGGER_MS, REVEAL, OUTLET, OUTLET_CARD_TILT,
  outletLocal, outletExitDistance, dealSlotFor, dealPose, hoverPose, revealPose, revealFlash, tableQuat, type Pose, type SlotXZ,
} from "./motion";
import { bayTexture, cardHaloTexture, feltTexture, pillarTexture, radialGlowTexture, ringTexture, sparkTexture } from "./textures";

export type Card3DPhase = "hidden" | "eject" | "outlet" | "deal" | "table" | "reveal" | "faceup";
export type Card3DStats = { fps: number; frameMs: number; phases: Card3DPhase[]; simMs: number };
export type Card3DLayout = { mode: "lab" } | { mode: "game"; geometry: CabinetEject3DGeometry };
export type Card3DLab = {
  audit(): string[]; poses(): { phase: Card3DPhase; p: number[]; q: number[] }[]; draw1(): void; draw2(): void; reveal(index: number): void; revealAll(): void; reset(): void;
  setSpeed(speed: number): void; setPaused(paused: boolean): void; advance(ms: number): void;
  setSound(on: boolean): void; dispose(): void;
};

const LAB_CAMERA_POS = new THREE.Vector3(-0.9, 9.2, 8.7);
const LAB_CAMERA_LOOK = new THREE.Vector3(-1.25, 0, 1.0);
const LAB_SLOTS: SlotXZ[] = [{ x: -2.75, z: 0 }, { x: 0, z: 0 }, { x: 2.75, z: 0 }];
const RARITY_COLOR: Record<string, string> = { R: "#dfe8ff", SR: "#5fc8ff", SSR: "#c27bff", UR: "#ffcf5a" };

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Shape geometry with UVs mapped 0..1 across its bounding box. */
function faceGeometry(shape: THREE.Shape, w: number, h: number) {
  const g = new THREE.ShapeGeometry(shape, 8);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  return g;
}

/** Crop (fractions of the source image) widened to "cover" the card's aspect without stretching. */
function coverCrop(crop: { left: number; top: number; right: number; bottom: number }, imgW: number, imgH: number) {
  const w = (1 - crop.left - crop.right) * imgW, h = (1 - crop.top - crop.bottom) * imgH, want = CARD.width / CARD.height;
  if (w / h < want) { const trim = (h - w / want) / 2 / imgH; return { ...crop, top: crop.top + trim, bottom: crop.bottom + trim }; }
  const trim = (w - h * want) / 2 / imgW; return { ...crop, left: crop.left + trim, right: crop.right + trim };
}

/** Separating-axis test for two thin boxes (cards) in the same space. */
function cardsOverlap(a: THREE.Object3D, b: THREE.Object3D) {
  const half = new THREE.Vector3(CARD.width / 2, CARD.height / 2, CARD.thickness / 2);
  const axes = (o: THREE.Object3D) => [0, 1, 2].map((k) => new THREE.Vector3().setFromMatrixColumn(o.matrix, k).normalize());
  const ext = (o: THREE.Object3D) => half.clone().multiply(o.scale);
  const A = axes(a), B = axes(b), ea = ext(a), eb = ext(b), d = b.position.clone().sub(a.position);
  const tests = [...A, ...B];
  for (const u of A) for (const v of B) { const c = u.clone().cross(v); if (c.lengthSq() > 1e-8) tests.push(c.normalize()); }
  const radius = (ax: THREE.Vector3[], e: THREE.Vector3, n: THREE.Vector3) => Math.abs(ax[0].dot(n)) * e.x + Math.abs(ax[1].dot(n)) * e.y + Math.abs(ax[2].dot(n)) * e.z;
  return tests.every((n) => Math.abs(d.dot(n)) <= radius(A, ea, n) + radius(B, eb, n));
}

export function mountCard3DLab(host: HTMLElement, fronts: readonly string[], onStats?: (s: Card3DStats) => void, layout: Card3DLayout = { mode: "lab" }): Card3DLab {
  const game = layout.mode === "game";
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
  let disposed = false, speed = 1, paused = false, sound = true, simNow = 0, last = performance.now(), raf = 0;
  const events: { at: number; fn: () => void }[] = [];
  const schedule = (at: number, fn: () => void) => events.push({ at, fn });
  const sfx = (name: SfxName, volume = 1) => { if (sound) playSfx(name, { volume }); };

  // ── Renderer / camera ───────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: game, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  if (game) renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:manipulation";
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  if (!game) { scene.background = new THREE.Color("#05080c"); scene.fog = new THREE.Fog("#05080c", 15, 26); }
  const camera = game
    ? new THREE.PerspectiveCamera(CABINET_EJECT3D_STAGE.fov, 16 / 9, 1, 8000)
    : new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 100);
  const cameraBase = game ? new THREE.Vector3(0, 0, CABINET_EJECT3D_DISTANCE) : LAB_CAMERA_POS.clone();
  const cameraLook = game ? new THREE.Vector3(0, 0, 0) : LAB_CAMERA_LOOK.clone();
  camera.position.copy(cameraBase); camera.lookAt(cameraLook); camera.updateMatrixWorld();

  // ── Table root placement ────────────────────────────────────────────
  const root = new THREE.Group(); scene.add(root);
  let slots = LAB_SLOTS, unit = 1;
  const outlet = new THREE.Group(); root.add(outlet);
  if (layout.mode === "game") {
    const plan = createCabinetEject3DPlan(layout.geometry);
    unit = plan.width / CARD.width;                       // cabinet px per table unit
    const mid = plan.landings[1];
    root.position.copy(mid.position);
    root.quaternion.copy(mid.rotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    root.scale.setScalar(unit);
    root.position.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(root.quaternion), -REST_Y * unit);
    root.updateMatrixWorld(true);
    // Each bay centre / the outlet mouth: cast the screen point onto the table plane.
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0).applyQuaternion(root.quaternion), root.position);
    const onTable = (x: number, y: number) => {
      const ndc = new THREE.Vector2(x / 960 - 1, 1 - y / 540), r = new THREE.Raycaster();
      r.setFromCamera(ndc, camera);
      const hit = r.ray.intersectPlane(plane, new THREE.Vector3());
      return hit ? root.worldToLocal(hit) : new THREE.Vector3();
    };
    slots = layout.geometry.bays.map((q) => { const p = onTable((q[0] + q[2] + q[4] + q[6]) / 4, (q[1] + q[3] + q[5] + q[7]) / 4); return { x: p.x, z: p.z }; });
    // The mouth is the lower edge of the cabinet outlet frame under PLAYER CARD; cards point straight at the player.
    const m = layout.geometry.mouth, mouth = onTable(m.x, m.y - m.height * 0.17);
    const yaw = 0;
    outlet.rotation.set(0, yaw, 0);
    outlet.position.set(mouth.x - Math.sin(yaw) * OUTLET.depth / 2, 0, mouth.z - Math.cos(yaw) * OUTLET.depth / 2);
  } else {
    outlet.position.set(-5.9, 0, 0.15); outlet.rotation.set(0, 0.62, 0);
  }
  root.updateMatrixWorld(true);
  const camLocal = root.worldToLocal(cameraBase.clone());
  const tableCentre = new THREE.Vector3((slots[0].x + slots[2].x) / 2, 0, (slots[0].z + slots[2].z) / 2);
  const toCam = camLocal.clone().sub(tableCentre).normalize();
  /** Tilt that turns a lifted card's face toward the camera. */
  const tiltToCamera = Math.atan2(toCam.z, toCam.y);

  // Image-based lighting from a tiny studio (softbox + rim strips) so metal and gloss read as 3D.
  const pmrem = own(new THREE.PMREMGenerator(renderer));
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: "#0d1418", side: THREE.BackSide })));
  const panel = (color: string, scale: number, w: number, h: number, p: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(scale), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); studio.add(m);
  };
  // Panels are laid out in table-local directions, then the studio is turned like the table.
  // Keep bright panels out of the mirror direction of a card facing the camera; otherwise a
  // face-on card reflects a softbox straight into the lens and washes out (game camera is near top-down).
  const mirror = camLocal.clone().normalize();
  const placePanel = (color: string, scale: number, w: number, h: number, p: [number, number, number]) => {
    const dir = new THREE.Vector3(...p).normalize();
    if (dir.dot(mirror) > 0.8) return;
    panel(color, scale, w, h, p);
  };
  placePanel("#fff3dd", 6, 10, 6, [0, 12, 4]); placePanel("#ffe2b0", 3.5, 22, 6, [0, 8, -13]); placePanel("#9fdcff", 3, 3, 14, [-12, 3, 0]); placePanel("#ffd9a0", 3, 3, 14, [12, 3, -2]); placePanel("#ffffff", 0.7, 14, 3, [0, 2, 13]);
  { placePanel("#fff3dd", 4, 8, 5, [-11, 7, -5]); placePanel("#ffe6c0", 2.5, 6, 4, [10, 6, -7]); }
  studio.quaternion.copy(root.quaternion); studio.updateMatrixWorld(true);
  const envRT = own(pmrem.fromScene(studio, 0.035));
  scene.environment = envRT.texture; scene.environmentIntensity = 1;
  studio.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });

  const hemi = new THREE.HemisphereLight("#cfe8ff", "#14100a", 0.55); hemi.position.set(0, 1, 0); root.add(hemi);
  const key = new THREE.DirectionalLight("#fff1dc", 2.6);
  key.position.set(-3.5, 11, 6); key.target.position.set(0, 0, 0.5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02 * unit;
  // Shadow bounds are in world units, so scale them with the table.
  Object.assign(key.shadow.camera, { left: -9 * unit, right: 9 * unit, top: 7 * unit, bottom: -7 * unit, near: 1 * unit, far: 30 * unit });
  root.add(key, key.target);
  const rim = new THREE.DirectionalLight("#8fd6ff", 0.9); rim.position.set(7, 4, -6); root.add(rim);

  // ── Table and bays (lab only; in the game they are the real screen behind us) ──
  const bayW = CARD.width + 0.16, bayH = CARD.height + 0.16;
  const bays = slots.map(() => ({ gold: own(new THREE.MeshStandardMaterial({ color: "#e2b65c", metalness: 1, roughness: 0.24, emissive: "#ffcf73", emissiveIntensity: 0 })), floor: null as THREE.MeshStandardMaterial | null }));
  if (!game) {
    const felt = own(feltTexture()); felt.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const table = new THREE.Mesh(own(new THREE.PlaneGeometry(19, 11.9)), own(new THREE.MeshStandardMaterial({ map: felt, roughness: 0.92, metalness: 0, envMapIntensity: 0.35 })));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; root.add(table);
    const frameShape = roundedRect(bayW + 0.34, bayH + 0.34, 0.2);
    frameShape.holes.push(roundedRect(bayW, bayH, 0.14) as unknown as THREE.Path);
    const frameGeo = own(new THREE.ExtrudeGeometry(frameShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.025, bevelSegments: 3, curveSegments: 10 }));
    const bayFloorGeo = own(new THREE.PlaneGeometry(bayW, bayH));
    const bayTex = own(bayTexture());
    slots.forEach((s, i) => {
      const frame = new THREE.Mesh(frameGeo, bays[i].gold); frame.rotation.x = -Math.PI / 2; frame.position.set(s.x, 0, s.z);
      frame.castShadow = true; frame.receiveShadow = true;
      const floorMat = own(new THREE.MeshStandardMaterial({ map: bayTex, roughness: 0.8, emissive: "#3fd6cf", emissiveMap: bayTex, emissiveIntensity: 0.25 }));
      const floor = new THREE.Mesh(bayFloorGeo, floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(s.x, 0.003, s.z); floor.receiveShadow = true;
      root.add(frame, floor); bays[i].floor = floorMat;
    });
  } else {
    // Shadow catcher: only the cards' shadows land on the real table art.
    // Only as big as the felt between the bays, so shadows never fall on the screen or cabinet art.
    const span = slots[2].x - slots[0].x + CARD.width + 1.6, mid = (slots[0].x + slots[2].x) / 2, midZ = (slots[0].z + slots[2].z) / 2;
    const catcher = new THREE.Mesh(own(new THREE.PlaneGeometry(span, CARD.height + 2.2)), own(new THREE.ShadowMaterial({ opacity: 0.36 })));
    catcher.rotation.x = -Math.PI / 2; catcher.position.set(mid, 0.002, midZ + 0.4); catcher.receiveShadow = true; root.add(catcher);
  }

  // ── Outlet: a card shoe. Cards lie face down inside and slide out of the front mouth
  // toward the player. Solid walls hide whatever is still inside.
  const darkMetal = own(new THREE.MeshStandardMaterial({ color: "#2b3a42", metalness: 0.75, roughness: 0.4 }));
  const brass = own(new THREE.MeshStandardMaterial({ color: "#e2b65c", metalness: 1, roughness: 0.24, emissive: "#ffcf73", emissiveIntensity: 0 }));
  const bevel = { bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 12 };
  const { width: OW, height: OH, depth: OD } = OUTLET, front = OD / 2;
  // Side profile (u = -z, v = y): low front with the mouth, rising toward the back like a dealer shoe.
  const profile = new THREE.Shape();
  profile.moveTo(-front, 0); profile.lineTo(-front, OH); profile.lineTo(front, OH + 0.5); profile.lineTo(front, 0); profile.lineTo(-front, 0);
  const shoeGeo = own(new THREE.ExtrudeGeometry(profile, { depth: OW, ...bevel }));
  shoeGeo.rotateY(Math.PI / 2); shoeGeo.translate(-OW / 2, 0, 0);
  const shoe = new THREE.Mesh(shoeGeo, darkMetal); shoe.castShadow = true; shoe.receiveShadow = true; outlet.add(shoe);
  const [mouthLo, mouthHi] = OUTLET.mouthY, mouthH = mouthHi - mouthLo, mouthMid = (mouthLo + mouthHi) / 2;
  const mouthRing = roundedRect(OUTLET.mouthHalfWidth * 2 + 0.3, mouthH + 0.26, 0.12);
  mouthRing.holes.push(roundedRect(OUTLET.mouthHalfWidth * 2, mouthH, 0.06) as unknown as THREE.Path);
  const ring = new THREE.Mesh(own(new THREE.ExtrudeGeometry(mouthRing, { depth: 0.06, ...bevel, bevelSize: 0.02, bevelThickness: 0.02 })), brass);
  ring.position.set(0, mouthMid, front + 0.04); ring.castShadow = true; outlet.add(ring);
  const slotPlate = new THREE.Mesh(own(new THREE.PlaneGeometry(OUTLET.mouthHalfWidth * 2, mouthH)), own(new THREE.MeshBasicMaterial({ color: "#020304" })));
  slotPlate.position.set(0, mouthMid, front + 0.045); outlet.add(slotPlate);
  const trim = new THREE.Mesh(own(new THREE.BoxGeometry(OW + 0.1, 0.07, 0.07)), brass); trim.position.set(0, OH + 0.03, front + 0.02); outlet.add(trim);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(own(new THREE.BoxGeometry(0.09, OH, 0.09)), brass); post.position.set(side * (OW / 2 + 0.02), OH / 2, front + 0.02); post.castShadow = true; outlet.add(post);
    const rail = new THREE.Mesh(own(new THREE.BoxGeometry(0.07, 0.07, OD)), brass);
    rail.position.set(side * (OW / 2 + 0.02), OH + 0.25 + 0.02, 0); rail.rotation.x = Math.atan2(0.5, OD); outlet.add(rail);
  }
  const backBand = new THREE.Mesh(own(new THREE.BoxGeometry(OW + 0.1, 0.07, 0.07)), brass); backBand.position.set(0, OH + 0.52, -front - 0.02); outlet.add(backBand);
  const statusLine = new THREE.Mesh(own(new THREE.PlaneGeometry(OW * 0.7, 0.035)), own(new THREE.MeshBasicMaterial({ color: new THREE.Color("#58e6dc").multiplyScalar(1.3), toneMapped: false })));
  statusLine.rotation.x = -Math.PI / 2 + Math.atan2(0.5, OD); statusLine.position.set(0, OH + 0.12, front - 0.55); outlet.add(statusLine);
  if (game) {
    // In the game the cabinet itself is the shoe: hide the modelled box and mask the cards that are
    // still "inside" with an invisible depth-only volume behind the mouth line (the real frame art shows).
    outlet.children.forEach((o) => { o.visible = false; });
    const mask = new THREE.Mesh(own(new THREE.BoxGeometry(OW + 0.6, OH + 0.8, OD)), own(new THREE.MeshBasicMaterial({ colorWrite: false })));
    mask.position.set(0, (OH + 0.8) / 2, 0); mask.renderOrder = -1; outlet.add(mask);
  }

  // ── Cards ───────────────────────────────────────────────────────────
  const shape = roundedRect(CARD.width, CARD.height, CARD.radius);
  const faceGeo = own(faceGeometry(shape, CARD.width, CARD.height));
  const edgeGeo = own(new THREE.ExtrudeGeometry(shape, { depth: CARD.thickness, bevelEnabled: false, curveSegments: 8 }));
  edgeGeo.translate(0, 0, -CARD.thickness / 2);
  const edgeMat = own(new THREE.MeshStandardMaterial({ color: "#d8cfb8", roughness: 0.6, metalness: 0.15 }));
  const hidden = own(new THREE.MeshBasicMaterial({ visible: false }));
  const loader = new THREE.TextureLoader();
  const loadTex = (url: string, crop: { left: number; top: number; right: number; bottom: number }, imgW: number, imgH: number) => {
    const t = own(loader.load(url)), c = coverCrop(crop, imgW, imgH);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.repeat.set(1 - c.left - c.right, 1 - c.top - c.bottom); t.offset.set(c.left, c.bottom);
    return t;
  };
  const backTex = loadTex(PLAYER_CARD_BACK_IMAGE, { left: 4 / 600, right: 4 / 600, top: 2 / 900, bottom: 2 / 900 }, 600, 900);
  // Printed card under a hard acrylic coat: matte ink, tight crisp highlights (no milky haze).
  const gloss = { roughness: 0.62, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 0.25 };
  const backMat = own(new THREE.MeshPhysicalMaterial({ map: backTex, ...gloss, envMapIntensity: 0.45 }));

  const haloTex = own(cardHaloTexture()), glowTex = own(radialGlowTexture()), ringTex = own(ringTexture()), pillarTex = own(pillarTexture()), sparkTex = own(sparkTexture());
  const additive = (map: THREE.Texture, color: string) => own(new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));

  type CardState = {
    group: THREE.Group; front: THREE.MeshPhysicalMaterial; phase: Card3DPhase; t0: number; slot: number;
    outletPose?: Pose; pull?: THREE.Vector3; forward?: THREE.Vector3; revealFrom?: THREE.Vector3;
    color: THREE.Color; halo: THREE.Mesh; glow: THREE.Sprite; ring: THREE.Mesh; pillar: THREE.Mesh; pillarCore: THREE.Mesh;
    sparks: THREE.Points; sparkVel: Float32Array; sparkBase: Float32Array; impactAt: number; landAt: number; queued: boolean;
  };
  const cards: CardState[] = fronts.slice(0, 3).map((url, i) => {
    const slot = dealSlotFor(i), s = slots[slot];
    const rarity = url.match(/\/player\/(R|SR|SSR|UR)\d/)?.[1] ?? "R";
    const color = new THREE.Color(RARITY_COLOR[rarity]);
    const large = /\/(UR2|UR3)\//.test(url);
    const crop = getCardDisplayCrop(url) ?? { left: 0, top: 0, right: 0, bottom: 0 };
    const front = own(new THREE.MeshPhysicalMaterial({ map: loadTex(url, crop, large ? 1024 : 600, large ? 1536 : 900), ...gloss, emissive: "#ffffff", emissiveIntensity: 0, envMapIntensity: 0.55 }));
    const group = new THREE.Group();
    const edge = new THREE.Mesh(edgeGeo, [hidden, edgeMat]); edge.castShadow = true;
    const f = new THREE.Mesh(faceGeo, front); f.position.z = CARD.thickness / 2 + 0.0006; f.castShadow = true;
    const b = new THREE.Mesh(faceGeo, backMat); b.position.z = -CARD.thickness / 2 - 0.0006; b.rotation.y = Math.PI; b.castShadow = true;
    group.add(edge, f, b); group.userData.index = i; root.add(group);

    const halo = new THREE.Mesh(own(new THREE.PlaneGeometry(CARD.width * 1.45, CARD.height * 1.3)), additive(haloTex, `#${color.getHexString()}`));
    halo.rotation.x = -Math.PI / 2; halo.position.set(s.x, 0.03, s.z); root.add(halo);
    const glow = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    glow.scale.set(6.5, 6.5, 1); root.add(glow);
    const ring = new THREE.Mesh(own(new THREE.PlaneGeometry(1, 1)), additive(ringTex, `#${color.getHexString()}`));
    ring.rotation.x = -Math.PI / 2; ring.position.set(s.x, 0.04, s.z); root.add(ring);
    // Light column rising from behind the card (vertical planes, so it never washes over the card face).
    const beam = (w: number, h: number) => { const g = own(new THREE.PlaneGeometry(w, h)); g.translate(0, h / 2, 0); return g; };
    const pillar = new THREE.Mesh(beam(3.0, 7), additive(pillarTex, `#${color.getHexString()}`));
    pillar.position.set(s.x, 0, s.z - CARD.height / 2 + 0.25); root.add(pillar);
    const pillarCore = new THREE.Mesh(beam(1.3, 5.5), additive(pillarTex, "#ffffff"));
    pillarCore.position.set(s.x, 0, s.z - CARD.height / 2 + 0.3); root.add(pillarCore);
    const N = 56, sparkGeo = own(new THREE.BufferGeometry());
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const sparks = new THREE.Points(sparkGeo, own(new THREE.PointsMaterial({ map: sparkTex, color, size: 0.32 * unit, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    sparks.frustumCulled = false; root.add(sparks);
    const sparkVel = new Float32Array(N * 3), sparkBase = new Float32Array(N * 2);
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2 + Math.random() * 0.3, r = 1.2 + Math.random() * 2.4;
      sparkVel.set([Math.cos(a) * r, 2.2 + Math.random() * 3.5, Math.sin(a) * r * 0.8], k * 3);
      const e = Math.max(Math.abs(Math.cos(a)) / (CARD.width / 2), Math.abs(Math.sin(a)) / (CARD.height / 2));
      sparkBase.set([Math.cos(a) / e, Math.sin(a) / e], k * 2);
    }
    return { group, front, phase: "hidden" as Card3DPhase, t0: 0, slot, color, halo, glow, ring, pillar, pillarCore, sparks, sparkVel, sparkBase, impactAt: -1, landAt: -1, queued: false };
  });

  const restOf = (c: CardState) => new THREE.Vector3(slots[c.slot].x, REST_Y, slots[c.slot].z);
  // Where a card hangs during the reveal: 42% of the way to the camera, so it reads ~1.7× bigger.
  const liftedPoint = (c: CardState) => restOf(c).lerp(camLocal, 0.42);

  const outletPose = (i: number, u: number): Pose => ({
    position: outletLocal(i, u).applyMatrix4(outlet.matrix),
    quaternion: outlet.quaternion.clone().multiply(tableQuat(0, OUTLET_CARD_TILT)),
    squash: 0,
  });

  // ── Actions ─────────────────────────────────────────────────────────
  const reset = () => {
    events.length = 0; airborneUntil = -1;
    cards.forEach((c) => { c.phase = "hidden"; c.t0 = 0; c.impactAt = -1; c.landAt = -1; c.queued = false; });
  };
  const draw1 = () => {
    if (!cards.every((c) => c.phase === "hidden")) return;
    cards.forEach((c, i) => { c.phase = "eject"; c.t0 = simNow + i * EJECT_STAGGER_MS; });
    sfx("cardSetToDisk");
  };
  const draw2 = () => {
    if (!cards.every((c) => c.phase === "outlet")) return;
    sfx("drawCard");
    // Bottom card first; each follows only after the previous one has left the mouth.
    cards.forEach((c, i) => {
      c.outletPose = outletPose(i, 1); c.phase = "deal"; c.t0 = simNow + i * DEAL_STAGGER_MS; c.landAt = c.t0 + DEAL_MS;
      c.forward = new THREE.Vector3(0, 0, 1).applyQuaternion(outlet.quaternion);
      c.pull = c.forward.clone().multiplyScalar(outletExitDistance(i));
    });
  };
  // One card in the air at a time: a reveal waits until the previous card has landed.
  let airborneUntil = -1;
  const reveal = (i: number) => {
    const c = cards[i]; if (!c || c.phase !== "table" || c.queued) return;
    if (simNow < airborneUntil) { c.queued = true; schedule(airborneUntil, () => { c.queued = false; reveal(i); }); return; }
    airborneUntil = simNow + REVEAL.impact + 40;
    c.revealFrom = c.group.position.clone(); c.phase = "reveal"; c.t0 = simNow; c.impactAt = simNow + REVEAL.impact;
    schedule(simNow + 40, () => sfx("cardReveal"));
    schedule(c.impactAt, () => { sfx("cardPlaced"); shakeAt = simNow; });
  };
  /** Left to right across the bays. */
  const revealAll = () => [...cards].sort((a, b) => a.slot - b.slot).forEach((c, n) => {
    if (c.phase === "table") schedule(simNow + n * 120, () => reveal(cards.indexOf(c)));
  });

  // Click a card to reveal it.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const onPointer = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(cards.map((c) => c.group), true)[0];
    let o: THREE.Object3D | null = hit?.object ?? null;
    while (o && o.userData.index === undefined) o = o.parent;
    if (o) reveal(o.userData.index as number);
  };
  renderer.domElement.addEventListener("pointerdown", onPointer);

  // ── QA: cards stay above the felt, enter the shoe only through the mouth, never cross each other.
  const audit = () => {
    const bad: string[] = [];
    const toOutlet = outlet.matrix.clone().invert();
    const hw = CARD.width / 2, hh = CARD.height / 2, ht = CARD.thickness / 2;
    cards.forEach((c, i) => {
      if (!c.group.visible) return;
      c.group.updateMatrix();
      for (const x of [-hw, 0, hw]) for (const y of [-hh, 0, hh]) for (const z of [-ht, ht]) {
        const w = new THREE.Vector3(x, y, z).applyMatrix4(c.group.matrix);       // table-local
        if (w.y < -0.002) bad.push(`card${i} ${c.phase} below table y=${w.y.toFixed(3)}`);
        const o = w.clone().applyMatrix4(toOutlet);
        const inside = Math.abs(o.x) < OUTLET.width / 2 + 0.04 && o.y > 0 && o.y < OUTLET.height + 0.5 * (OUTLET.depth / 2 - o.z) / OUTLET.depth + 0.04 && Math.abs(o.z) < OUTLET.depth / 2 + 0.04;
        const inMouth = Math.abs(o.x) < OUTLET.mouthHalfWidth && o.y > OUTLET.mouthY[0] && o.y < OUTLET.mouthY[1];
        if (inside && !inMouth) bad.push(`card${i} ${c.phase} through shoe wall at (${o.x.toFixed(2)},${o.y.toFixed(2)},${o.z.toFixed(2)})`);
      }
    });
    for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) {
      const A = cards[a], B = cards[b];
      if (!A.group.visible || !B.group.visible) continue;
      // Cards resting stacked in the shoe are separate layers; anything else must not intersect.
      if (cardsOverlap(A.group, B.group)) bad.push(`card${a} ${A.phase} overlaps card${b} ${B.phase}`);
    }
    return bad;
  };

  // ── Per-frame update ────────────────────────────────────────────────
  let shakeAt = -1e9;
  const apply = (c: CardState, pose: Pose) => {
    c.group.position.copy(pose.position); c.group.quaternion.copy(pose.quaternion);
    c.group.scale.set(1 + pose.squash * 0.5, 1 + pose.squash * 0.5, 1 - pose.squash * 4);
  };
  const white = new THREE.Color("#ffffff");
  const update = () => {
    events.sort((a, b) => a.at - b.at);
    while (events.length && events[0].at <= simNow) events.shift()!.fn();
    cards.forEach((c, i) => {
      const t = simNow - c.t0, s = slots[c.slot], bay = bays[c.slot];
      c.group.visible = c.phase !== "hidden";
      let flash = 0;
      if (c.phase === "eject") {
        apply(c, outletPose(i, t < 0 ? 0 : t / EJECT_MS));
        if (t >= EJECT_MS) c.phase = "outlet";
      } else if (c.phase === "outlet") apply(c, outletPose(i, 1));
      else if (c.phase === "deal") {
        apply(c, t < 0 ? c.outletPose! : dealPose(c.outletPose!, c.pull!, c.forward!, hoverPose(s, c.slot, 0), t, c.slot - 1 || 0.7));
        if (t >= DEAL_MS) c.phase = "table";
      } else if (c.phase === "table") apply(c, hoverPose(s, c.slot, simNow - c.landAt));
      else if (c.phase === "reveal" || c.phase === "faceup") {
        const rt = c.phase === "faceup" ? REVEAL.done : t;
        apply(c, revealPose(restOf(c), c.revealFrom!, rt, liftedPoint(c), tiltToCamera, c.slot === 2 ? -1 : 1));
        flash = revealFlash(rt);
        if (c.phase === "reveal" && t >= REVEAL.done) c.phase = "faceup";
      }
      c.front.emissiveIntensity = flash * 0.95;
      c.front.emissive.copy(c.color).lerp(white, 0.55);

      // Glow behind the hanging card.
      const rt = c.phase === "reveal" ? t : -1;
      const hang = rt < 0 ? 0 : rt < REVEAL.liftEnd ? rt / REVEAL.liftEnd : rt < REVEAL.holdEnd ? 1 : Math.max(0, 1 - (rt - REVEAL.holdEnd) / 160);
      c.glow.position.copy(c.group.position).addScaledVector(toCam, -0.6);
      (c.glow.material as THREE.SpriteMaterial).opacity = hang * 0.38 + flash * 0.55;

      // Impact: ring, light column, sparks, halo hugging the bay.
      const k = c.impactAt < 0 ? -1 : simNow - c.impactAt;
      const ringM = c.ring.material as THREE.MeshBasicMaterial, pM = c.pillar.material as THREE.MeshBasicMaterial, pcM = c.pillarCore.material as THREE.MeshBasicMaterial;
      const haloM = c.halo.material as THREE.MeshBasicMaterial, sM = c.sparks.material as THREE.PointsMaterial;
      if (k >= 0 && k < 900) {
        const u = k / 900;
        const rs = 2.2 + 4.2 * (1 - (1 - Math.min(1, k / 520)) ** 3);
        c.ring.scale.set(rs, rs, 1); ringM.opacity = Math.max(0, 1 - k / 520) * 0.8;
        c.pillar.scale.set(0.55 + 0.6 * Math.min(1, k / 90), 0.4 + 0.75 * Math.min(1, k / 140), 0.55 + 0.6 * Math.min(1, k / 90));
        pM.opacity = Math.max(0, 1 - k / 520) * 0.8;
        c.pillarCore.scale.set(1, 0.5 + 0.7 * Math.min(1, k / 110), 1); pcM.opacity = Math.max(0, 1 - k / 360);
        const pos = c.sparks.geometry.attributes.position as THREE.BufferAttribute, sec = k / 1000;
        for (let n = 0; n < pos.count; n++) {
          const vx = c.sparkVel[n * 3], vy = c.sparkVel[n * 3 + 1], vz = c.sparkVel[n * 3 + 2];
          pos.setXYZ(n, s.x + c.sparkBase[n * 2] + vx * sec * 0.9, 0.08 + vy * sec - 4.2 * sec * sec, s.z + c.sparkBase[n * 2 + 1] + vz * sec * 0.9);
        }
        pos.needsUpdate = true; sM.opacity = Math.max(0, 1 - u * 1.05);
        haloM.opacity = Math.max(0, 1 - k / 700) * 0.75;
        bay.gold.emissiveIntensity = Math.max(0, 1 - k / 450) * 0.45;
      } else {
        ringM.opacity = 0; pM.opacity = 0; pcM.opacity = 0; sM.opacity = 0;
        haloM.opacity = c.phase === "faceup" ? 0.22 : 0;
        bay.gold.emissiveIntensity = c.phase === "faceup" ? 0.12 : 0;
      }
      // Arrival over the bay: a faint ring of light under the hovering card.
      if (c.landAt > 0 && simNow >= c.landAt && simNow - c.landAt < 420 && k < 0) {
        const d = (simNow - c.landAt) / 420;
        c.ring.scale.set(2.4 + 2.2 * d, 2.4 + 2.2 * d, 1); ringM.opacity = (1 - d) * 0.3;
        bay.gold.emissiveIntensity = (1 - d) * 0.5;
      }
      if (bay.floor) bay.floor.emissiveIntensity = 0.25 + (k >= 0 && k < 900 ? (1 - k / 900) * 0.9 : 0);
    });
    brass.emissiveIntensity = cards.some((c) => c.phase === "eject") ? 0.25 : 0;
    // Camera: a short, damped shake on impact (in table units, so both layouts feel the same).
    const sk = simNow - shakeAt, amp = sk >= 0 && sk < 220 ? 0.05 * unit * (1 - sk / 220) : 0;
    camera.position.set(cameraBase.x + Math.sin(sk * 0.11) * amp, cameraBase.y + Math.cos(sk * 0.13) * amp, cameraBase.z);
    camera.lookAt(cameraLook);
  };

  // ── Loop / sizing / stats ───────────────────────────────────────────
  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false); camera.aspect = game ? 16 / 9 : w / h; camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  let frames = 0, statAt = performance.now(), workMs = 0;
  const loop = (now: number) => {
    if (disposed) return;
    const dt = Math.min(50, now - last); last = now;
    if (!paused) simNow += dt * speed;
    const w0 = performance.now();
    update(); renderer.render(scene, camera);
    workMs += performance.now() - w0; frames++;
    if (now - statAt >= 500) {
      const stats = { fps: Math.round((frames * 1000) / (now - statAt)), frameMs: +(workMs / frames).toFixed(2), phases: cards.map((c) => c.phase), simMs: Math.round(simNow) };
      host.dataset.card3d = JSON.stringify(stats); onStats?.(stats); frames = 0; workMs = 0; statAt = now;
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    draw1, draw2, reveal, revealAll, reset, audit,
    poses: () => cards.map((c) => ({ phase: c.phase, p: c.group.position.toArray().map((v) => +v.toFixed(3)), q: c.group.quaternion.toArray().map((v) => +v.toFixed(3)) })),
    setSpeed: (s) => { speed = s; }, setPaused: (p) => { paused = p; },
    advance: (ms) => { simNow += ms; update(); renderer.render(scene, camera); },
    setSound: (on) => { sound = on; },
    dispose: () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointer);
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh || (o as THREE.Points).isPoints || (o as THREE.Sprite).isSprite) m.geometry?.dispose(); });
      disposables.forEach((d) => d.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
