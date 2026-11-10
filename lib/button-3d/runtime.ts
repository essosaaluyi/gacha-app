import * as THREE from "three";
import { playSfx, type SfxName } from "@/lib/audio/sfxStore";

/**
 * Real three.js arcade push button, built in layers so it reads volumetric:
 *   glossy black bevelled bezel → lamp line in the gap → violet collar →
 *   a ring of side lamps → a smaller inner plastic dome with "DRAW" engraved in black →
 *   a clear outer acrylic dome (refraction) over everything.
 * Lamp: gray (ready) → sky (card set, waiting for the next press) → off (dealing) → gray after the last card lands.
 * vibrate(): stored "win confirmed" rattle (slot push button / pachinko lever style); not wired into the game yet.
 */
export type LampState = "gray" | "sky" | "off";
export type DrawButton3D = {
  setLamp(state: LampState): void;
  /** Animate a press (also fired by clicking the dome) and call onPress. */
  press(): void;
  /** Win-confirmed vibration: the whole button rattles and the lamp pulses. */
  vibrate(durationMs?: number): void;
  setSound(on: boolean): void;
  /** QA: freeze real time, then step the animation frame by frame. */
  setPaused(on: boolean): void;
  advance(ms: number): void;
  dispose(): void;
};
/** onPress may return the sound to play for this press. */
export type DrawButton3DOptions = { label?: string; onPress?: () => SfxName | null | void };

const LAMP: Record<LampState, { color: string; power: number }> = {
  gray: { color: "#cfd6df", power: 0.5 },
  sky: { color: "#4cc8ff", power: 1.55 },
  off: { color: "#000000", power: 0 },
};

// Units: outer dome base radius ≈ 1.
const OUTER = { base: 0.99, height: 0.56, seat: 0.42 };
const INNER = { base: 0.62, height: 0.24 };
const LEDS = { count: 18, radius: 0.8 };
const PRESS = { depth: 0.085, downMs: 70, holdMs: 45, upMs: 240 };

function canvas(w: number, h: number) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  return { c, g: c.getContext("2d")! };
}
function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
}
function radialTexture(stops: [number, string][]) {
  const S = 256, { c, g } = canvas(S, S);
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  return tex(c, false);
}

/** Collar: violet → pink plastic, with a bright lamp band along the bottom (emissive). */
function collarTexture(emissive: boolean) {
  const { c, g } = canvas(8, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256); // canvas top = collar top
  if (emissive) {
    grad.addColorStop(0, "rgba(255,255,255,0.18)"); grad.addColorStop(0.55, "rgba(255,255,255,0.12)");
    grad.addColorStop(0.8, "rgba(255,255,255,0.55)"); grad.addColorStop(1, "rgba(255,255,255,1)");
  } else {
    grad.addColorStop(0, "#7d74d6"); grad.addColorStop(0.5, "#9a6fc9"); grad.addColorStop(1, "#c98ad6");
  }
  g.fillStyle = grad; g.fillRect(0, 0, 8, 256);
  return tex(c, !emissive);
}

/**
 * Inner dome skin (top-down UVs): frosted lamp plastic with a fine dot diffuser, lit hardest at the
 * rim by the side lamps, and the label engraved and filled with black ink.
 * Returns colour, emissive and tangent-space normal maps built from one letter mask.
 */
function innerDomeMaps(label: string) {
  const S = 1024;
  const mask = canvas(S, S);
  mask.g.fillStyle = "#000"; mask.g.fillRect(0, 0, S, S);
  mask.g.textAlign = "center"; mask.g.textBaseline = "middle";
  const font = (s: number) => `900 ${s}px "Arial Black", "Segoe UI", Arial, sans-serif`;
  let size = 260; mask.g.font = font(size);
  while (mask.g.measureText(label).width > S * 0.74 && size > 60) { size -= 6; mask.g.font = font(size); }
  mask.g.fillStyle = "#fff"; mask.g.fillText(label, S / 2, S * 0.54); // a little toward the player
  const hard = mask.g.getImageData(0, 0, S, S).data;
  const bevel = canvas(S, S);
  bevel.g.filter = "blur(2px)"; bevel.g.drawImage(mask.c, 0, 0);
  const softMask = bevel.g.getImageData(0, 0, S, S).data;
  const height = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) height[i] = 1 - softMask[i * 4] / 255; // 1 = surface, 0 = bottom of the cut

  // Base plastic + dots.
  const col = canvas(S, S), emi = canvas(S, S), nor = canvas(S, S);
  col.g.fillStyle = "#606b7d"; col.g.fillRect(0, 0, S, S);
  const rim = emi.g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  rim.addColorStop(0, "rgb(70,70,70)"); rim.addColorStop(0.65, "rgb(120,120,120)"); rim.addColorStop(0.92, "rgb(255,255,255)"); rim.addColorStop(1, "rgb(255,255,255)");
  emi.g.fillStyle = rim; emi.g.fillRect(0, 0, S, S);
  const step = 13;
  for (let row = 0, y = 0; y < S + step; row++, y += step * 0.866) {
    for (let x = (row % 2) * step / 2; x < S + step; x += step) {
      col.g.fillStyle = "rgba(150,165,190,0.55)"; col.g.beginPath(); col.g.arc(x, y, 3.2, 0, Math.PI * 2); col.g.fill();
      emi.g.fillStyle = "rgba(255,255,255,0.25)"; emi.g.beginPath(); emi.g.arc(x, y, 3.2, 0, Math.PI * 2); emi.g.fill();
    }
  }
  const cImg = col.g.getImageData(0, 0, S, S), eImg = emi.g.getImageData(0, 0, S, S), nImg = nor.g.createImageData(S, S);
  const strength = 7;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x, p = i * 4;
      const hx = height[y * S + Math.min(S - 1, x + 1)] - height[y * S + Math.max(0, x - 1)];
      const hy = height[Math.min(S - 1, y + 1) * S + x] - height[Math.max(0, y - 1) * S + x];
      // Canvas y runs down while texture v runs up (flipY), hence the sign on ny.
      let nx = -hx * strength, ny = hy * strength, nz = 1; const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      nImg.data[p] = (nx * 0.5 + 0.5) * 255; nImg.data[p + 1] = (ny * 0.5 + 0.5) * 255; nImg.data[p + 2] = (nz * 0.5 + 0.5) * 255; nImg.data[p + 3] = 255;
      // Black ink fills the cut; its far wall (facing the player) keeps a faint lit edge so the cut reads.
      const m = hard[p] / 255, edge = Math.min(1, Math.hypot(hx, hy) * 3);
      const above = hard[(Math.max(0, y - 7) * S + x) * 4] / 255, wall = m * (1 - above);
      for (let k = 0; k < 3; k++) {
        cImg.data[p + k] = cImg.data[p + k] * (1 - m) * (1 - 0.35 * edge) + 14 * m + 40 * wall;
        eImg.data[p + k] = eImg.data[p + k] * (1 - m) * (1 - 0.6 * edge);
      }
    }
  }
  col.g.putImageData(cImg, 0, 0); emi.g.putImageData(eImg, 0, 0); nor.g.putImageData(nImg, 0, 0);
  return { map: tex(col.c), emissiveMap: tex(emi.c, false), normalMap: tex(nor.c, false) };
}

/** Spherical cap whose UVs are a top-down projection (so a decal reads straight from above). */
function capGeometry(baseRadius: number, height: number) {
  const radius = (baseRadius ** 2 + height ** 2) / (2 * height);
  const theta = Math.asin(Math.min(1, baseRadius / radius));
  const geo = new THREE.SphereGeometry(radius, 160, 56, 0, Math.PI * 2, 0, theta);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * baseRadius), 0.5 - pos.getZ(i) / (2 * baseRadius));
  uv.needsUpdate = true;
  geo.translate(0, height - radius, 0); // base circle at y = 0
  return geo;
}

export function mountDrawButton3D(host: HTMLElement, options: DrawButton3DOptions = {}): DrawButton3D {
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
  let sound = true, disposed = false, raf = 0, last = performance.now();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  renderer.transmissionResolutionScale = 1; // full-res refraction so the inner dome stays sharp
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:manipulation";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const elevation = THREE.MathUtils.degToRad(48), distance = 7.8;
  camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
  camera.lookAt(0, 0.25, 0);

  // ── Image-based lighting: soft-edged lights so reflections read as glows, not CG rectangles.
  const pmrem = own(new THREE.PMREMGenerator(renderer));
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: "#0f1522", side: THREE.BackSide })));
  const soft = radialTexture([[0, "rgba(255,255,255,1)"], [0.45, "rgba(255,255,255,0.85)"], [1, "rgba(255,255,255,0)"]]);
  const panel = (color: string, scale: number, w: number, h: number, p: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: soft, transparent: true, depthWrite: false, color: new THREE.Color(color).multiplyScalar(scale), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); studio.add(m);
  };
  panel("#fff2f8", 5, 16, 10, [-2, 9, -10]);    // overhead softbox → wide sheen across the back of the dome
  panel("#ffb8e2", 2.6, 7, 14, [-11, 5, 2]);    // pink side
  panel("#86dcff", 2.8, 7, 14, [11, 5, 1]);     // cyan side
  panel("#ffffff", 1, 22, 5, [0, 3, 13]);       // low front fill → highlight line along the bezel bevel
  panel("#d9e6ff", 2, 18, 5, [0, 6, -12]);      // back rim
  const envRT = own(pmrem.fromScene(studio, 0.03));
  scene.environment = envRT.texture;
  studio.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });
  soft.dispose();
  const key = new THREE.DirectionalLight("#fff4ea", 1.4); key.position.set(-5, 8, -2); scene.add(key);

  // ── Soft contact shadow stays put; everything else is on the rig (so vibrate() rattles it).
  const shadowTex = own(radialTexture([[0, "rgba(0,0,0,0.85)"], [0.55, "rgba(0,0,0,0.5)"], [1, "rgba(0,0,0,0)"]]));
  const shadow = new THREE.Mesh(own(new THREE.PlaneGeometry(3.5, 3.5)), own(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; scene.add(shadow);
  const rig = new THREE.Group(); scene.add(rig);

  // ── Bezel: glossy black ring with a rounded lip and a broad bevel sloping outward (hard edges only
  // where faces meet: inner wall | bevel | outer wall).
  const bezelMat = own(new THREE.MeshPhysicalMaterial({ color: "#11151f", metalness: 0.2, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.025, envMapIntensity: 0.55 }));
  // LatheGeometry normals are (dy, -dx): list points outer-bottom → over the top → inner, so faces point up/out.
  const lathe = (pts: number[][]) => rig.add(new THREE.Mesh(own(new THREE.LatheGeometry([...pts].reverse().map(([x, y]) => new THREE.Vector2(x, y)), 220)), bezelMat));
  lathe([[1.03, 0.04], [1.03, 0.2]]);
  const bevel: number[][] = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI - (i / 8) * Math.PI * 0.55; bevel.push([1.085 + 0.055 * Math.cos(a), 0.215 + 0.06 * Math.sin(a)]); } // rounded lip
  bevel.push([1.2, 0.262], [1.3, 0.232], [1.37, 0.2]);
  for (let i = 1; i <= 6; i++) { const a = Math.PI / 2 - (i / 6) * Math.PI / 2; bevel.push([1.37 + 0.06 * Math.cos(a), 0.14 + 0.06 * Math.sin(a)]); } // rounded outer shoulder
  lathe(bevel);
  lathe([[1.43, 0.14], [1.43, 0.05]]);
  lathe([[1.43, 0.05], [1.4, 0.035], [1.4, 0]]);
  const well = new THREE.Mesh(own(new THREE.CircleGeometry(1.04, 96)), own(new THREE.MeshStandardMaterial({ color: "#05080f", roughness: 0.8 })));
  well.rotation.x = -Math.PI / 2; well.position.y = 0.04; rig.add(well);

  // Lamp line in the gap between the bezel lip and the collar.
  const ringMat = own(new THREE.MeshStandardMaterial({ color: "#1a2433", roughness: 0.25, metalness: 0.1, emissive: "#000000", emissiveIntensity: 1.2 }));
  const ring = new THREE.Mesh(own(new THREE.TorusGeometry(1.012, 0.013, 12, 220)), ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.205; rig.add(ring);
  const gapMat = own(new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
  const gap = new THREE.Mesh(own(new THREE.RingGeometry(0.99, 1.03, 128)), gapMat);
  gap.rotation.x = -Math.PI / 2; gap.position.y = 0.19; rig.add(gap);

  // ── Moving cap.
  const cap = new THREE.Group(); cap.position.y = 0.06; rig.add(cap);
  const collarMat = own(new THREE.MeshPhysicalMaterial({ map: own(collarTexture(false)), emissiveMap: own(collarTexture(true)), emissive: "#000000", emissiveIntensity: 1.6, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const collar = new THREE.Mesh(own(new THREE.CylinderGeometry(OUTER.base, OUTER.base, OUTER.seat, 160, 1, true)), collarMat);
  collar.position.y = OUTER.seat / 2; cap.add(collar);

  // Floor of the outer dome: dark mirror with the side lamps' light pooled in a band.
  const poolTex = own(radialTexture([[0, "rgba(255,255,255,0)"], [0.62, "rgba(255,255,255,0.05)"], [0.86, "rgba(255,255,255,0.9)"], [0.97, "rgba(255,255,255,0.2)"], [1, "rgba(255,255,255,0)"]]));
  const floorMat = own(new THREE.MeshStandardMaterial({ color: "#070b16", metalness: 0.85, roughness: 0.22, emissive: "#000000", emissiveMap: poolTex }));
  const floor = new THREE.Mesh(own(new THREE.CircleGeometry(OUTER.base - 0.005, 128)), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = OUTER.seat; cap.add(floor);

  // Side lamps: a ring of small LED capsules standing around the inner dome.
  const ledMat = own(new THREE.MeshStandardMaterial({ color: "#20293a", roughness: 0.2, emissive: "#000000", emissiveIntensity: 1 }));
  const ledGeo = own(new THREE.CapsuleGeometry(0.026, 0.07, 6, 12));
  for (let i = 0; i < LEDS.count; i++) {
    const a = (i / LEDS.count) * Math.PI * 2;
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(Math.cos(a) * LEDS.radius, OUTER.seat + 0.06, Math.sin(a) * LEDS.radius); cap.add(led);
  }

  // Inner plastic dome (smaller, lit from the side lamps) with the black engraved label.
  const innerMaps = innerDomeMaps(options.label ?? "DRAW");
  const innerMat = own(new THREE.MeshPhysicalMaterial({
    map: own(innerMaps.map), emissiveMap: own(innerMaps.emissiveMap), normalMap: own(innerMaps.normalMap), normalScale: new THREE.Vector2(1.3, 1.3),
    emissive: "#000000", emissiveIntensity: 1, roughness: 0.35, clearcoat: 0.35, clearcoatRoughness: 0.12, metalness: 0, envMapIntensity: 0.6,
  }));
  const innerDome = new THREE.Mesh(own(capGeometry(INNER.base, INNER.height)), innerMat);
  innerDome.position.y = OUTER.seat + 0.02; cap.add(innerDome);
  const innerSkirt = new THREE.Mesh(own(new THREE.CylinderGeometry(INNER.base, INNER.base + 0.01, 0.03, 160, 1, true)), innerMat);
  innerSkirt.position.y = OUTER.seat + 0.005; cap.add(innerSkirt);
  // Polished edge of the inner plastic catches the side lamps: a bright layered rim.
  const rimMat = own(new THREE.MeshStandardMaterial({ color: "#dfe8f6", roughness: 0.1, metalness: 0.3, emissive: "#000000" }));
  const rim = new THREE.Mesh(own(new THREE.TorusGeometry(INNER.base + 0.004, 0.011, 12, 200)), rimMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = OUTER.seat + 0.022; cap.add(rim);

  // Clear outer acrylic dome; its thick edge is tinted by the lamp (attenuation) so it glows volumetrically.
  const domeMat = own(new THREE.MeshPhysicalMaterial({
    color: "#ffffff", metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.07, ior: 1.5,
    attenuationColor: new THREE.Color("#ffffff"), attenuationDistance: 1.4, clearcoat: 1, clearcoatRoughness: 0.02,
    specularIntensity: 1, envMapIntensity: 1.3,
  }));
  const dome = new THREE.Mesh(own(capGeometry(OUTER.base, OUTER.height)), domeMat);
  dome.position.y = OUTER.seat; cap.add(dome);
  const inner = new THREE.PointLight("#ffffff", 0, 2.6, 1.6); inner.position.y = OUTER.seat + 0.12; cap.add(inner);

  // ── Lamp state (eased) ──────────────────────────────────────────────
  let target: LampState = "gray";
  const lampColor = new THREE.Color(LAMP.gray.color); let lampPower = LAMP.gray.power;
  let flash = 0, hover = 0, hovering = false, pressAt = -1, vibAt = -1, vibMs = 0, vibPulse = 0;
  const lit = new THREE.Color(), tmp = new THREE.Color(), dark = new THREE.Color("#1a2433"), white = new THREE.Color("#ffffff");

  function applyLamp() {
    const p = lampPower * (1 + 0.18 * hover + vibPulse) + flash * (lampPower > 0.05 ? 0.9 : 0);
    lit.copy(lampColor).multiplyScalar(p);
    ringMat.emissive.copy(lit); ringMat.color.copy(dark).lerp(tmp.copy(lampColor), Math.min(1, lampPower));
    gapMat.color.copy(lit).multiplyScalar(0.6);
    collarMat.emissive.copy(lit).multiplyScalar(0.3);
    ledMat.emissive.copy(lit).multiplyScalar(1.6); ledMat.color.copy(dark).lerp(tmp.copy(lampColor), Math.min(1, lampPower));
    floorMat.emissive.copy(lit).multiplyScalar(0.55);
    innerMat.emissive.copy(lit).multiplyScalar(0.6);
    rimMat.emissive.copy(lit).multiplyScalar(0.9);
    domeMat.attenuationColor.copy(white).lerp(lampColor, Math.min(0.8, lampPower * 0.6));
    inner.color.copy(lampColor); inner.intensity = p * 2;
  }

  // ── Interaction ─────────────────────────────────────────────────────
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects([dome, collar], false).length > 0;
  };
  const onMove = (e: PointerEvent) => { hovering = hit(e); renderer.domElement.style.cursor = hovering ? "pointer" : "default"; };
  const onDown = (e: PointerEvent) => { if (e.button === 0 && hit(e)) api.press(); };
  const onLeave = () => { hovering = false; };
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerleave", onLeave);

  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  let clock = 0, paused = false;
  const frame = (now: number) => {
    if (disposed) return;
    const dt = Math.min(50, now - last); last = now;
    if (!paused) step(dt);
    raf = requestAnimationFrame(frame);
  };
  /** Advance the simulation by dt ms and render (deterministic; used by frame-by-frame QA capture). */
  function step(dt: number) {
    clock += dt;
    const k = 1 - Math.exp(-dt / 110);
    if (target !== "off") lampColor.lerp(tmp.set(LAMP[target].color), k); // "off" just fades the power out
    lampPower += (LAMP[target].power - lampPower) * k;
    flash *= Math.exp(-dt / 160);
    hover += ((hovering ? 1 : 0) - hover) * (1 - Math.exp(-dt / 90));
    // Press travel: quick down, short hold, springy return.
    let travel = 0;
    if (pressAt >= 0) {
      const t = clock - pressAt;
      if (t < PRESS.downMs) travel = 1 - (1 - t / PRESS.downMs) ** 2;
      else if (t < PRESS.downMs + PRESS.holdMs) travel = 1;
      else if (t < PRESS.downMs + PRESS.holdMs + PRESS.upMs) {
        const u = (t - PRESS.downMs - PRESS.holdMs) / PRESS.upMs;
        travel = Math.cos(u * Math.PI * 1.25) * (1 - u) ** 1.5; // springs back with a small overshoot
      } else pressAt = -1;
    }
    cap.position.y = 0.06 - travel * PRESS.depth;
    // Win vibration: motor-like buzz (two incommensurate frequencies per axis) under a sharp attack,
    // pulsing in bursts like a pachinko lever, then a damped tail.
    rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); vibPulse = 0;
    if (vibAt >= 0) {
      const t = clock - vibAt, u = t / vibMs;
      if (u >= 1) vibAt = -1;
      else {
        const s = t / 1000, attack = Math.min(1, t / 40), tail = u > 0.75 ? ((1 - u) / 0.25) ** 1.5 : 1;
        const burst = 0.55 + 0.45 * Math.max(0, Math.sin(2 * Math.PI * 7 * s)); // ~7 bursts per second
        const a = 0.028 * attack * tail * burst;
        rig.position.x = a * (Math.sin(2 * Math.PI * 41 * s) + 0.6 * Math.sin(2 * Math.PI * 67 * s + 1.3));
        rig.position.z = a * 0.8 * (Math.sin(2 * Math.PI * 37 * s + 2.1) + 0.5 * Math.sin(2 * Math.PI * 59 * s));
        rig.position.y = a * 0.35 * Math.sin(2 * Math.PI * 53 * s + 0.7);
        rig.rotation.z = a * 0.5 * Math.sin(2 * Math.PI * 43 * s + 0.4);
        rig.rotation.x = a * 0.4 * Math.sin(2 * Math.PI * 47 * s + 1.9);
        vibPulse = 0.6 * attack * tail * burst;
      }
    }
    applyLamp();
    renderer.render(scene, camera);
  }

  const api: DrawButton3D = {
    setLamp(state) { target = state; },
    press() {
      pressAt = clock; flash = 1;
      const s = options.onPress?.();
      if (sound && s) playSfx(s, { volume: 0.8 });
    },
    vibrate(durationMs = 1600) {
      vibAt = clock; vibMs = Math.max(200, durationMs);
      if (sound) playSfx("vibration");
    },
    setSound(on) { sound = on; },
    setPaused(on) { paused = on; },
    advance(ms) { step(ms); },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      for (const d of disposables) d.dispose();
      renderer.dispose(); renderer.domElement.remove();
    },
  };
  applyLamp();
  raf = requestAnimationFrame(frame);
  return api;
}
