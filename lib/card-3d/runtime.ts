// Real-3D card lab: outlet stack → deal to bays → tap to flip and land.
// Core three.js only (no addons). All motion runs on a sim clock so QA can pause and step.
import * as THREE from "three";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";
import { getCardDisplayCrop } from "@/components/gacha/pack-reveal/cardDisplayCrop";
import { playSfx, type SfxName } from "@/lib/audio/sfxStore";
import {
  CARD, SLOT_X, REST_Y, EJECT_MS, EJECT_STAGGER_MS, DEAL_MS, DEAL_STAGGER_MS, REVEAL,
  outletLocal, outletExitDistance, dealPose, hoverPose, revealPose, revealFlash, tableQuat, OUTLET, OUTLET_CARD_TILT, type Pose,
} from "./motion";
import { bayTexture, cardHaloTexture, feltTexture, pillarTexture, radialGlowTexture, ringTexture, sparkTexture } from "./textures";

export type Card3DPhase = "hidden" | "eject" | "outlet" | "deal" | "table" | "reveal" | "faceup";
export type Card3DStats = { fps: number; frameMs: number; phases: Card3DPhase[]; simMs: number };
export type Card3DLab = {
  audit(): string[]; draw1(): void; draw2(): void; reveal(index: number): void; revealAll(): void; reset(): void;
  setSpeed(speed: number): void; setPaused(paused: boolean): void; advance(ms: number): void;
  setSound(on: boolean): void; dispose(): void;
};

const CAMERA_POS = new THREE.Vector3(-0.9, 9.2, 8.7);
const CAMERA_LOOK = new THREE.Vector3(-1.25, 0, 1.0);
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

export function mountCard3DLab(host: HTMLElement, fronts: readonly string[], onStats?: (s: Card3DStats) => void): Card3DLab {
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
  let disposed = false, speed = 1, paused = false, sound = true, simNow = 0, last = performance.now(), raf = 0;
  const events: { at: number; fn: () => void }[] = [];
  const schedule = (at: number, fn: () => void) => events.push({ at, fn });
  const sfx = (name: SfxName, volume = 1) => { if (sound) playSfx(name, { volume }); };

  // ── Renderer / camera ───────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:manipulation";
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#05080c");
  scene.fog = new THREE.Fog("#05080c", 15, 26);
  const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 100);
  camera.position.copy(CAMERA_POS); camera.lookAt(CAMERA_LOOK);

  // Image-based lighting from a tiny studio (softbox + rim strips) so metal and gloss read as 3D.
  const pmrem = own(new THREE.PMREMGenerator(renderer));
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: "#0d1418", side: THREE.BackSide })));
  const panel = (color: string, scale: number, w: number, h: number, p: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(scale), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); studio.add(m);
  };
  panel("#fff3dd", 6, 10, 6, [0, 12, 4]); panel("#ffe2b0", 3.5, 22, 6, [0, 8, -13]); panel("#9fdcff", 3, 3, 14, [-12, 3, 0]); panel("#ffd9a0", 3, 3, 14, [12, 3, -2]); panel("#ffffff", 0.7, 14, 3, [0, 2, 13]);
  const envRT = own(pmrem.fromScene(studio, 0.035));
  scene.environment = envRT.texture; scene.environmentIntensity = 1;
  studio.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });

  scene.add(new THREE.HemisphereLight("#cfe8ff", "#14100a", 0.55));
  const key = new THREE.DirectionalLight("#fff1dc", 2.6);
  key.position.set(-3.5, 11, 6); key.target.position.set(0, 0, 0.5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 7, bottom: -7, near: 1, far: 30 });
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight("#8fd6ff", 0.9); rim.position.set(7, 4, -6); scene.add(rim);

  // ── Table and bays ──────────────────────────────────────────────────
  const felt = own(feltTexture()); felt.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const table = new THREE.Mesh(own(new THREE.PlaneGeometry(19, 11.9)), own(new THREE.MeshStandardMaterial({ map: felt, roughness: 0.92, metalness: 0, envMapIntensity: 0.35 })));
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);

  const bayW = CARD.width + 0.16, bayH = CARD.height + 0.16;
  const frameShape = roundedRect(bayW + 0.34, bayH + 0.34, 0.2);
  frameShape.holes.push(roundedRect(bayW, bayH, 0.14) as unknown as THREE.Path);
  const frameGeo = own(new THREE.ExtrudeGeometry(frameShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.025, bevelSegments: 3, curveSegments: 10 }));
  const bayFloorGeo = own(new THREE.PlaneGeometry(bayW, bayH));
  const bayTex = own(bayTexture());
  const bays = SLOT_X.map((x) => {
    const gold = own(new THREE.MeshStandardMaterial({ color: "#e2b65c", metalness: 1, roughness: 0.24, emissive: "#ffcf73", emissiveIntensity: 0 }));
    const frame = new THREE.Mesh(frameGeo, gold); frame.rotation.x = -Math.PI / 2; frame.position.set(x, 0.0, 0);
    frame.castShadow = true; frame.receiveShadow = true;
    const floor = new THREE.Mesh(bayFloorGeo, own(new THREE.MeshStandardMaterial({ map: bayTex, roughness: 0.8, emissive: "#3fd6cf", emissiveMap: bayTex, emissiveIntensity: 0.25 })));
    floor.rotation.x = -Math.PI / 2; floor.position.set(x, 0.003, 0); floor.receiveShadow = true;
    scene.add(frame, floor);
    return { gold, floor: floor.material as THREE.MeshStandardMaterial };
  });

  // ── Outlet: a card shoe on the table. Cards lie face down inside and slide out of the
  // front mouth toward the player. Solid walls hide whatever is still inside.
  const outlet = new THREE.Group();
  outlet.position.set(-5.9, 0, 0.15); outlet.rotation.set(0, 0.62, 0);
  scene.add(outlet);
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
  // Gold frame around the mouth, and a dark slot behind the cards.
  const [mouthLo, mouthHi] = OUTLET.mouthY, mouthH = mouthHi - mouthLo, mouthMid = (mouthLo + mouthHi) / 2;
  const mouthRing = roundedRect(OUTLET.mouthHalfWidth * 2 + 0.3, mouthH + 0.26, 0.12);
  mouthRing.holes.push(roundedRect(OUTLET.mouthHalfWidth * 2, mouthH, 0.06) as unknown as THREE.Path);
  const ring = new THREE.Mesh(own(new THREE.ExtrudeGeometry(mouthRing, { depth: 0.06, ...bevel, bevelSize: 0.02, bevelThickness: 0.02 })), brass);
  ring.position.set(0, mouthMid, front + 0.04); ring.castShadow = true; outlet.add(ring);
  const slot = new THREE.Mesh(own(new THREE.PlaneGeometry(OUTLET.mouthHalfWidth * 2, mouthH)), own(new THREE.MeshBasicMaterial({ color: "#020304" })));
  slot.position.set(0, mouthMid, front + 0.045); outlet.add(slot);
  // Gold trim along the top front edge and a status light on the slope.
  const trim = new THREE.Mesh(own(new THREE.BoxGeometry(OW + 0.1, 0.07, 0.07)), brass); trim.position.set(0, OH + 0.03, front + 0.02); outlet.add(trim);
  // Gold corner posts and a band around the back, so the shoe reads as part of the cabinet.
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(own(new THREE.BoxGeometry(0.09, OH, 0.09)), brass); post.position.set(side * (OW / 2 + 0.02), OH / 2, front + 0.02); post.castShadow = true; outlet.add(post);
    const rail = new THREE.Mesh(own(new THREE.BoxGeometry(0.07, 0.07, OD)), brass);
    rail.position.set(side * (OW / 2 + 0.02), OH + 0.25 + 0.02, 0); rail.rotation.x = Math.atan2(0.5, OD); outlet.add(rail);
  }
  const backBand = new THREE.Mesh(own(new THREE.BoxGeometry(OW + 0.1, 0.07, 0.07)), brass); backBand.position.set(0, OH + 0.52, -front - 0.02); outlet.add(backBand);
  const statusLine = new THREE.Mesh(own(new THREE.PlaneGeometry(OW * 0.7, 0.035)), own(new THREE.MeshBasicMaterial({ color: new THREE.Color("#58e6dc").multiplyScalar(1.3), toneMapped: false })));
  statusLine.rotation.x = -Math.PI / 2 + Math.atan2(0.5, OD); statusLine.position.set(0, OH + 0.12, front - 0.55); outlet.add(statusLine);

  // ── Cards ───────────────────────────────────────────────────────────
  const shape = roundedRect(CARD.width, CARD.height, CARD.radius);
  const faceGeo = own(faceGeometry(shape, CARD.width, CARD.height));
  const edgeGeo = own(new THREE.ExtrudeGeometry(shape, { depth: CARD.thickness, bevelEnabled: false, curveSegments: 8 }));
  edgeGeo.translate(0, 0, -CARD.thickness / 2);
  const edgeMat = own(new THREE.MeshStandardMaterial({ color: "#d8cfb8", roughness: 0.6, metalness: 0.15 }));
  const hidden = own(new THREE.MeshBasicMaterial({ visible: false }));
  const loader = new THREE.TextureLoader();
  const loadTex = (url: string, crop: { left: number; top: number; right: number; bottom: number } | null) => {
    const t = own(loader.load(url));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (crop) { t.repeat.set(1 - crop.left - crop.right, 1 - crop.top - crop.bottom); t.offset.set(crop.left, crop.bottom); }
    return t;
  };
  const backTex = loadTex(PLAYER_CARD_BACK_IMAGE, { left: 4 / 600, right: 4 / 600, top: 2 / 900, bottom: 2 / 900 });
  // Printed card under a hard acrylic coat: matte ink, tight crisp highlights (no milky haze).
  const gloss = { roughness: 0.62, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 0.25 };
  const backMat = own(new THREE.MeshPhysicalMaterial({ map: backTex, ...gloss, envMapIntensity: 0.45 }));

  const haloTex = own(cardHaloTexture()), glowTex = own(radialGlowTexture()), ringTex = own(ringTexture()), pillarTex = own(pillarTexture()), sparkTex = own(sparkTexture());
  const additive = (map: THREE.Texture, color: string) => own(new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));

  type CardState = {
    group: THREE.Group; front: THREE.MeshPhysicalMaterial; phase: Card3DPhase; t0: number; outletPose?: Pose; pull?: THREE.Vector3; revealFrom?: THREE.Vector3;
    color: THREE.Color; halo: THREE.Mesh; glow: THREE.Sprite; ring: THREE.Mesh; pillar: THREE.Mesh; pillarCore: THREE.Mesh;
    sparks: THREE.Points; sparkVel: Float32Array; sparkBase: Float32Array; impactAt: number; landAt: number;
  };
  const cards: CardState[] = fronts.slice(0, 3).map((url, i) => {
    const rarity = url.match(/\/player\/(R|SR|SSR|UR)\d/)?.[1] ?? "R";
    const color = new THREE.Color(RARITY_COLOR[rarity]);
    const front = own(new THREE.MeshPhysicalMaterial({ map: loadTex(url, getCardDisplayCrop(url)), ...gloss, emissive: "#ffffff", emissiveIntensity: 0, envMapIntensity: 0.55 }));
    const group = new THREE.Group();
    const edge = new THREE.Mesh(edgeGeo, [hidden, edgeMat]); edge.castShadow = true;
    const f = new THREE.Mesh(faceGeo, front); f.position.z = CARD.thickness / 2 + 0.0006; f.castShadow = true;
    const b = new THREE.Mesh(faceGeo, backMat); b.position.z = -CARD.thickness / 2 - 0.0006; b.rotation.y = Math.PI; b.castShadow = true;
    [edge, f, b].forEach((m) => { m.renderOrder = 2; }); group.add(edge, f, b); group.userData.index = i; scene.add(group);

    const halo = new THREE.Mesh(own(new THREE.PlaneGeometry(CARD.width * 1.45, CARD.height * 1.3)), additive(haloTex, `#${color.getHexString()}`));
    halo.rotation.x = -Math.PI / 2; halo.position.set(SLOT_X[i], 0.03, 0); scene.add(halo);
    const glow = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    glow.scale.set(6.5, 6.5, 1); scene.add(glow);
    const ring = new THREE.Mesh(own(new THREE.PlaneGeometry(1, 1)), additive(ringTex, `#${color.getHexString()}`));
    ring.rotation.x = -Math.PI / 2; ring.position.set(SLOT_X[i], 0.04, 0); scene.add(ring);
    // Light column rising from behind the card (vertical planes, so it never washes over the card face).
    const beam = (w: number, h: number) => { const g = own(new THREE.PlaneGeometry(w, h)); g.translate(0, h / 2, 0); return g; };
    const pillar = new THREE.Mesh(beam(3.0, 7), additive(pillarTex, `#${color.getHexString()}`));
    pillar.position.set(SLOT_X[i], 0, -CARD.height / 2 + 0.25); scene.add(pillar);
    const pillarCore = new THREE.Mesh(beam(1.3, 5.5), additive(pillarTex, "#ffffff"));
    pillarCore.position.set(SLOT_X[i], 0, -CARD.height / 2 + 0.3); scene.add(pillarCore);
    const N = 56, sparkGeo = own(new THREE.BufferGeometry());
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const sparks = new THREE.Points(sparkGeo, own(new THREE.PointsMaterial({ map: sparkTex, color, size: 0.32, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    sparks.frustumCulled = false; scene.add(sparks);
    const sparkVel = new Float32Array(N * 3), sparkBase = new Float32Array(N * 2);
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2 + Math.random() * 0.3, r = 1.2 + Math.random() * 2.4;
      sparkVel.set([Math.cos(a) * r, 2.2 + Math.random() * 3.5, Math.sin(a) * r * 0.8], k * 3);
      // Start on the card outline, not its centre.
      const e = Math.max(Math.abs(Math.cos(a)) / (CARD.width / 2), Math.abs(Math.sin(a)) / (CARD.height / 2));
      sparkBase.set([Math.cos(a) / e, Math.sin(a) / e], k * 2);
    }
    return { group, front, phase: "hidden" as Card3DPhase, t0: 0, color, halo, glow, ring, pillar, pillarCore, sparks, sparkVel, sparkBase, impactAt: -1, landAt: -1 };
  });

  // Where a card hangs during the reveal: pulled toward the camera so it reads ~1.7× bigger.
  const toCamera = CAMERA_POS.clone().sub(new THREE.Vector3(0, 0, 0)).normalize();
  const tiltToCamera = Math.PI / 2 - Math.atan2(CAMERA_POS.y, CAMERA_POS.z - 0.2);
  const liftedPoint = (i: number) => new THREE.Vector3(CAMERA_LOOK.x * 0.6 + SLOT_X[i] * 0.32, REST_Y, 0).addScaledVector(toCamera, 6.3).add(new THREE.Vector3(0, -0.35, 0));

  const outletPose = (i: number, u: number): Pose => {
    outlet.updateMatrixWorld();
    const position = outletLocal(i, u).applyMatrix4(outlet.matrixWorld);
    const quaternion = outlet.getWorldQuaternion(new THREE.Quaternion()).multiply(tableQuat(0, OUTLET_CARD_TILT));
    return { position, quaternion, squash: 0 };
  };

  // ── Actions ─────────────────────────────────────────────────────────
  const reset = () => {
    events.length = 0;
    cards.forEach((c) => { c.phase = "hidden"; c.t0 = 0; c.impactAt = -1; c.landAt = -1; });
  };
  const draw1 = () => {
    if (!cards.every((c) => c.phase === "hidden")) return;
    cards.forEach((c, i) => { c.phase = "eject"; c.t0 = simNow + i * EJECT_STAGGER_MS; });
    sfx("cardSetToDisk");
  };
  const draw2 = () => {
    if (!cards.every((c) => c.phase === "outlet")) return;
    sfx("drawCard");
    cards.forEach((c, i) => {
      c.outletPose = outletPose(i, 1); c.phase = "deal"; c.t0 = simNow + i * DEAL_STAGGER_MS; c.landAt = c.t0 + DEAL_MS;
      // Slide straight out along the shoe axis (toward the player) before lifting off.
      c.pull = new THREE.Vector3(0, 0, outletExitDistance(i)).applyQuaternion(outlet.quaternion);
    });
  };
  const reveal = (i: number) => {
    const c = cards[i]; if (!c || c.phase !== "table") return;
    c.revealFrom = c.group.position.clone(); c.phase = "reveal"; c.t0 = simNow; c.impactAt = simNow + REVEAL.impact;
    schedule(simNow + 40, () => sfx("cardReveal"));
    schedule(c.impactAt, () => { sfx("cardPlaced"); shakeAt = simNow; });
  };
  const revealAll = () => cards.forEach((c, i) => { if (c.phase === "table") schedule(simNow + i * 260, () => reveal(i)); });

  // Click a card on the table to reveal it.
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

  // ── QA: every card corner must stay above the table and may enter the shoe only through the mouth.
  const audit = () => {
    const bad: string[] = [];
    outlet.updateMatrixWorld();
    const toOutlet = outlet.matrixWorld.clone().invert();
    const hw = CARD.width / 2, hh = CARD.height / 2, ht = CARD.thickness / 2;
    cards.forEach((c, i) => {
      if (!c.group.visible) return;
      c.group.updateMatrixWorld();
      for (const x of [-hw, 0, hw]) for (const y of [-hh, 0, hh]) for (const z of [-ht, ht]) {
        const w = new THREE.Vector3(x, y, z).applyMatrix4(c.group.matrixWorld);
        if (w.y < -0.002) bad.push(`card${i} ${c.phase} below table y=${w.y.toFixed(3)}`);
        const o = w.clone().applyMatrix4(toOutlet);
        const inside = Math.abs(o.x) < OUTLET.width / 2 + 0.04 && o.y > 0 && o.y < OUTLET.height + 0.5 * (OUTLET.depth / 2 - o.z) / OUTLET.depth + 0.04 && Math.abs(o.z) < OUTLET.depth / 2 + 0.04;
        const inMouth = Math.abs(o.x) < OUTLET.mouthHalfWidth && o.y > OUTLET.mouthY[0] && o.y < OUTLET.mouthY[1];
        if (inside && !inMouth) bad.push(`card${i} ${c.phase} through shoe wall at (${o.x.toFixed(2)},${o.y.toFixed(2)},${o.z.toFixed(2)})`);
      }
    });
    return bad;
  };

  // ── Per-frame update ────────────────────────────────────────────────
  let shakeAt = -1e9;
  const apply = (c: CardState, pose: Pose) => {
    c.group.position.copy(pose.position); c.group.quaternion.copy(pose.quaternion);
    c.group.scale.set(1 + pose.squash * 0.5, 1 + pose.squash * 0.5, 1 - pose.squash * 4);
  };
  const update = () => {
    events.sort((a, b) => a.at - b.at);
    while (events.length && events[0].at <= simNow) events.shift()!.fn();
    let anyBayGlow = 0;
    cards.forEach((c, i) => {
      const t = simNow - c.t0;
      c.group.visible = c.phase !== "hidden";
      let flash = 0;
      if (c.phase === "eject") {
        apply(c, outletPose(i, t < 0 ? 0 : t / EJECT_MS));
        if (t >= EJECT_MS) c.phase = "outlet";
      } else if (c.phase === "outlet") apply(c, outletPose(i, 1));
      else if (c.phase === "deal") {
        apply(c, t < 0 ? c.outletPose! : dealPose(c.outletPose!, c.pull!, i, t));
        if (t >= DEAL_MS) c.phase = "table";
      } else if (c.phase === "table") apply(c, hoverPose(i, simNow - c.landAt));
      else if (c.phase === "reveal" || c.phase === "faceup") {
        const rt = c.phase === "faceup" ? REVEAL.done : t;
        apply(c, revealPose(i, rt, liftedPoint(i), tiltToCamera, c.revealFrom));
        flash = revealFlash(rt);
        if (c.phase === "reveal" && t >= REVEAL.done) c.phase = "faceup";
      }
      c.front.emissiveIntensity = flash * 0.95;
      c.front.emissive.copy(c.color).lerp(new THREE.Color("#ffffff"), 0.55);

      // Glow behind the hanging card.
      const rt = c.phase === "reveal" ? t : -1;
      const hang = rt < 0 ? 0 : rt < REVEAL.liftEnd ? rt / REVEAL.liftEnd : rt < REVEAL.holdEnd ? 1 : Math.max(0, 1 - (rt - REVEAL.holdEnd) / 160);
      c.glow.position.copy(c.group.position).addScaledVector(toCamera, -0.6);
      (c.glow.material as THREE.SpriteMaterial).opacity = hang * 0.38 + flash * 0.55;

      // Impact: ring, light column, sparks, halo hugging the bay.
      const k = c.impactAt < 0 ? -1 : simNow - c.impactAt;
      const ringM = c.ring.material as THREE.MeshBasicMaterial, pM = c.pillar.material as THREE.MeshBasicMaterial, pcM = c.pillarCore.material as THREE.MeshBasicMaterial;
      const haloM = c.halo.material as THREE.MeshBasicMaterial, sM = c.sparks.material as THREE.PointsMaterial;
      if (k >= 0 && k < 900) {
        const u = k / 900;
        const rs = 2.2 + 4.2 * (1 - (1 - Math.min(1, k / 520)) ** 3);
        c.ring.scale.set(rs, rs, 1); ringM.opacity = Math.max(0, 1 - k / 520) * 0.8;
        const p = Math.max(0, 1 - k / 520);
        c.pillar.scale.set(0.55 + 0.6 * Math.min(1, k / 90), 0.4 + 0.75 * Math.min(1, k / 140), 0.55 + 0.6 * Math.min(1, k / 90));
        pM.opacity = p * 0.8;
        c.pillarCore.scale.set(1, 0.5 + 0.7 * Math.min(1, k / 110), 1); pcM.opacity = Math.max(0, 1 - k / 360);
        const pos = c.sparks.geometry.attributes.position as THREE.BufferAttribute;
        const s = k / 1000;
        for (let n = 0; n < pos.count; n++) {
          const vx = c.sparkVel[n * 3], vy = c.sparkVel[n * 3 + 1], vz = c.sparkVel[n * 3 + 2];
          pos.setXYZ(n, SLOT_X[i] + c.sparkBase[n * 2] + vx * s * 0.9, 0.08 + vy * s - 4.2 * s * s, c.sparkBase[n * 2 + 1] + vz * s * 0.9);
        }
        pos.needsUpdate = true; sM.opacity = Math.max(0, 1 - u * 1.05);
        haloM.opacity = Math.max(0, 1 - k / 700) * 0.75;
        anyBayGlow = Math.max(anyBayGlow, 1 - u);
        bays[i].gold.emissiveIntensity = Math.max(0, 1 - k / 450) * 0.45;
      } else {
        ringM.opacity = 0; pM.opacity = 0; pcM.opacity = 0; sM.opacity = 0;
        haloM.opacity = c.phase === "faceup" ? 0.22 : 0;
        bays[i].gold.emissiveIntensity = c.phase === "faceup" ? 0.12 : 0;
      }
      // Deal landing: a small dust ring and a gold tick on the bay.
      if (c.landAt > 0 && simNow >= c.landAt && simNow - c.landAt < 420 && k < 0) {
        const d = (simNow - c.landAt) / 420;
        c.ring.scale.setScalar(2.4 + 2.2 * d); c.ring.scale.z = 1; ringM.opacity = (1 - d) * 0.35;
        bays[i].gold.emissiveIntensity = (1 - d) * 0.5;
      }
      bays[i].floor.emissiveIntensity = 0.25 + (k >= 0 && k < 900 ? (1 - k / 900) * 0.9 : 0);
    });
    brass.emissiveIntensity = cards.some((c) => c.phase === "eject") ? 0.25 : 0;
    // Camera: a short, damped shake on impact.
    const sk = simNow - shakeAt, amp = sk >= 0 && sk < 220 ? 0.05 * (1 - sk / 220) : 0;
    camera.position.set(CAMERA_POS.x + Math.sin(sk * 0.11) * amp, CAMERA_POS.y + Math.cos(sk * 0.13) * amp, CAMERA_POS.z);
    camera.lookAt(CAMERA_LOOK);
    void anyBayGlow;
  };

  // ── Loop / sizing / stats ───────────────────────────────────────────
  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
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
