import * as THREE from "three";
import { playSfx, type SfxName } from "@/lib/audio/sfxStore";

/**
 * Real three.js arcade push button: dark metal bezel, lamp ring, violet collar,
 * LED dot diffuser and a clear acrylic dome with "DRAW" printed on its surface.
 * Lamp: gray (ready) → sky (card set, waiting for the next press) → off.
 */
export type LampState = "gray" | "sky" | "off";
export type DrawButton3D = {
  setLamp(state: LampState): void;
  /** Animate a press (also fired by clicking the dome) and call onPress. */
  press(): void;
  setSound(on: boolean): void;
  dispose(): void;
};
/** onPress may return the sound to play for this press. */
export type DrawButton3DOptions = { label?: string; onPress?: () => SfxName | null | void };

const LAMP: Record<LampState, { color: string; power: number }> = {
  gray: { color: "#cfd6df", power: 0.5 },
  sky: { color: "#4cc8ff", power: 1.55 },
  off: { color: "#000000", power: 0 },
};

// Units: dome base radius ≈ 1.
const DOME = { base: 0.99, height: 0.5, seat: 0.42 };
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

/** Hex grid of LED dots, brighter toward the centre (emissive) or as a dark base map. */
function dotTexture(emissive: boolean) {
  const S = 1024, { c, g } = canvas(S, S);
  g.fillStyle = emissive ? "#000" : "#0b1428"; g.fillRect(0, 0, S, S);
  const step = 15, r = 3.6;
  for (let row = 0, y = 0; y < S + step; row++, y += step * 0.866) {
    for (let x = (row % 2) * step / 2; x < S + step; x += step) {
      const d = Math.hypot(x - S / 2, y - S / 2) / (S / 2);
      if (d > 1) continue;
      const k = emissive ? 0.35 + 0.65 * (1 - d * d) : 0.22 + 0.18 * (1 - d);
      g.fillStyle = emissive ? `rgba(255,255,255,${k})` : `rgba(120,170,255,${k})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  }
  if (emissive) { // soft core glow behind the dots
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.25)"); grad.addColorStop(0.6, "rgba(255,255,255,0.08)"); grad.addColorStop(1, "rgba(255,255,255,0)");
    g.globalCompositeOperation = "lighter"; g.fillStyle = grad; g.fillRect(0, 0, S, S);
  }
  return tex(c, !emissive);
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

function labelTexture(label: string) {
  const S = 1024, { c, g } = canvas(S, S);
  g.textAlign = "center"; g.textBaseline = "middle";
  let size = 250;
  const font = (s: number) => `900 ${s}px "Arial Black", "Segoe UI", Arial, sans-serif`;
  g.font = font(size);
  while (g.measureText(label).width > S * 0.56 && size > 60) { size -= 6; g.font = font(size); }
  // Printed slightly toward the player (lower half of the top view) so it sits mid-dome on screen.
  const y = S * 0.6;
  g.lineJoin = "round"; g.lineWidth = size * 0.07; g.strokeStyle = "rgba(10,40,80,0.55)";
  g.strokeText(label, S / 2, y);
  g.fillStyle = "#ffffff"; g.fillText(label, S / 2, y);
  return tex(c);
}

function radialTexture(stops: [number, string][]) {
  const S = 256, { c, g } = canvas(S, S);
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  return tex(c, false);
}

/** Spherical cap whose UVs are a top-down projection (so a decal reads straight from above). */
function capGeometry(radius: number, baseRadius: number) {
  const theta = Math.asin(Math.min(1, baseRadius / radius));
  const geo = new THREE.SphereGeometry(radius, 160, 56, 0, Math.PI * 2, 0, theta);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * baseRadius), 0.5 - pos.getZ(i) / (2 * baseRadius));
  uv.needsUpdate = true;
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
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:manipulation";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const elevation = THREE.MathUtils.degToRad(50), distance = 7.2;
  camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
  camera.lookAt(0, 0.22, 0);

  // ── Image-based lighting: a small studio so the acrylic and metal pick up real reflections.
  const pmrem = own(new THREE.PMREMGenerator(renderer));
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: "#0f1522", side: THREE.BackSide })));
  // Soft-edged (radial falloff) lights, so reflections on the acrylic read as glows, not CG rectangles.
  const soft = radialTexture([[0, "rgba(255,255,255,1)"], [0.45, "rgba(255,255,255,0.85)"], [1, "rgba(255,255,255,0)"]]);
  const panel = (color: string, scale: number, w: number, h: number, p: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: soft, transparent: true, depthWrite: false, color: new THREE.Color(color).multiplyScalar(scale), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); studio.add(m);
  };
  panel("#fff2f8", 5, 16, 10, [-2, 12, -4]);    // big overhead softbox → wide sheen across the back of the dome
  panel("#ffb8e2", 2.6, 7, 14, [-11, 5, 2]);    // pink side
  panel("#86dcff", 2.8, 7, 14, [11, 5, 1]);     // cyan side
  panel("#ffffff", 1, 22, 5, [0, 3, 13]);       // low front fill
  panel("#d9e6ff", 2, 18, 5, [0, 6, -12]);      // back rim
  const envRT = own(pmrem.fromScene(studio, 0.03));
  scene.environment = envRT.texture;
  studio.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });
  soft.dispose();

  const key = new THREE.DirectionalLight("#fff4ea", 1.4); key.position.set(-5, 8, -2); scene.add(key);

  // ── Soft contact shadow (the page behind the transparent canvas is the cabinet panel).
  const shadowTex = own(radialTexture([[0, "rgba(0,0,0,0.85)"], [0.55, "rgba(0,0,0,0.5)"], [1, "rgba(0,0,0,0)"]]));
  const shadow = new THREE.Mesh(own(new THREE.PlaneGeometry(3.6, 3.6)), own(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; scene.add(shadow);

  // ── Bezel (lathe profile: inner wall, rounded lip, outer skirt).
  const profile = [[1.035, 0.04], [1.035, 0.17], [1.06, 0.205], [1.12, 0.228], [1.22, 0.228], [1.3, 0.205], [1.35, 0.15], [1.375, 0.06], [1.38, 0]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const bezelMat = own(new THREE.MeshPhysicalMaterial({ color: "#0c1630", metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.07 }));
  scene.add(new THREE.Mesh(own(new THREE.LatheGeometry(profile, 160)), bezelMat));
  const well = new THREE.Mesh(own(new THREE.CircleGeometry(1.04, 96)), own(new THREE.MeshStandardMaterial({ color: "#05080f", roughness: 0.8 })));
  well.rotation.x = -Math.PI / 2; well.position.y = 0.04; scene.add(well);

  // Lamp ring sunk into the bezel lip + light leaking out of the gap around the collar.
  const ringMat = own(new THREE.MeshStandardMaterial({ color: "#1a2433", roughness: 0.25, metalness: 0.1, emissive: "#000000", emissiveIntensity: 1.25 }));
  const ring = new THREE.Mesh(own(new THREE.TorusGeometry(1.17, 0.024, 20, 200)), ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.226; scene.add(ring);
  const glowTex = own(radialTexture([[0, "rgba(255,255,255,0)"], [0.7, "rgba(255,255,255,0)"], [0.82, "rgba(255,255,255,0.9)"], [0.86, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]));
  const additive = (map: THREE.Texture) => own(new THREE.MeshBasicMaterial({ map, color: "#000000", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const halo = new THREE.Mesh(own(new THREE.PlaneGeometry(2.86, 2.86)), additive(glowTex));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.232; scene.add(halo);
  const gapMat = own(new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
  const gap = new THREE.Mesh(own(new THREE.RingGeometry(0.99, 1.035, 128)), gapMat);
  gap.rotation.x = -Math.PI / 2; gap.position.y = 0.2; scene.add(gap);

  // ── Moving cap: collar, LED plate, dome, printed label, inner light.
  const cap = new THREE.Group(); cap.position.y = 0.06; scene.add(cap);
  const collarMat = own(new THREE.MeshPhysicalMaterial({ map: own(collarTexture(false)), emissiveMap: own(collarTexture(true)), emissive: "#000000", emissiveIntensity: 1.6, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const collar = new THREE.Mesh(own(new THREE.CylinderGeometry(DOME.base, DOME.base, DOME.seat, 160, 1, true)), collarMat);
  collar.position.y = DOME.seat / 2; cap.add(collar);
  const plateMat = own(new THREE.MeshStandardMaterial({ map: own(dotTexture(false)), emissiveMap: own(dotTexture(true)), emissive: "#000000", emissiveIntensity: 1.2, roughness: 0.55, metalness: 0.1 }));
  const plate = new THREE.Mesh(own(new THREE.CircleGeometry(DOME.base - 0.005, 128)), plateMat);
  plate.rotation.x = -Math.PI / 2; plate.position.y = DOME.seat - 0.04; cap.add(plate);

  const R = (DOME.base ** 2 + DOME.height ** 2) / (2 * DOME.height);
  const domeY = DOME.seat + DOME.height - R;
  const domeMat = own(new THREE.MeshPhysicalMaterial({
    color: "#ffffff", metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.45, ior: 1.49,
    attenuationColor: new THREE.Color("#e4f4ff"), attenuationDistance: 3, clearcoat: 1, clearcoatRoughness: 0.02,
    specularIntensity: 1, envMapIntensity: 1.25,
  }));
  const dome = new THREE.Mesh(own(capGeometry(R, DOME.base)), domeMat);
  dome.position.y = domeY; cap.add(dome);
  const labelTex = own(labelTexture(options.label ?? "DRAW"));
  const labelMat = own(new THREE.MeshPhysicalMaterial({
    map: labelTex, transparent: true, depthWrite: false, roughness: 0.35, clearcoat: 0.6,
    emissive: "#ffffff", emissiveMap: labelTex, emissiveIntensity: 0.2, polygonOffset: true, polygonOffsetFactor: -2,
  }));
  const label = new THREE.Mesh(own(capGeometry(R + 0.004, DOME.base)), labelMat);
  label.position.y = domeY; cap.add(label);
  const inner = new THREE.PointLight("#ffffff", 0, 3.2, 1.6); inner.position.y = DOME.seat + 0.12; cap.add(inner);
  const coreTex = own(radialTexture([[0, "rgba(255,255,255,0.8)"], [0.4, "rgba(255,255,255,0.25)"], [1, "rgba(255,255,255,0)"]]));
  const core = new THREE.Mesh(own(new THREE.CircleGeometry(0.95, 64)), additive(coreTex));
  core.rotation.x = -Math.PI / 2; core.position.y = DOME.seat - 0.03; cap.add(core);

  // ── Lamp state (eased) ──────────────────────────────────────────────
  let target: LampState = "gray";
  const lampColor = new THREE.Color(LAMP.gray.color); let lampPower = LAMP.gray.power;
  let flash = 0, hover = 0, hovering = false, pressAt = -1;
  const lit = new THREE.Color(), tmp = new THREE.Color(), dark = new THREE.Color("#1a2433");

  function applyLamp() {
    const p = lampPower * (1 + 0.18 * hover) + flash * (lampPower > 0.05 ? 0.9 : 0);
    lit.copy(lampColor).multiplyScalar(p);
    ringMat.emissive.copy(lit); ringMat.color.copy(dark).lerp(tmp.copy(lampColor), Math.min(1, lampPower));
    halo.material.color.copy(lit).multiplyScalar(0.55);
    gapMat.color.copy(lit).multiplyScalar(0.6);
    collarMat.emissive.copy(lit).multiplyScalar(0.3);
    plateMat.emissive.copy(lit).multiplyScalar(0.85);
    core.material.color.copy(lit).multiplyScalar(0.28);
    inner.color.copy(lampColor); inner.intensity = p * 2.2;
    // The print catches the lamp from below: white ink tinted by the lamp, dim when off.
    labelMat.emissive.copy(tmp.set("#ffffff").lerp(lampColor, 0.35)); labelMat.emissiveIntensity = 0.04 + 0.5 * Math.min(1.4, p);
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

  let clock = 0;
  const frame = (now: number) => {
    if (disposed) return;
    const dt = Math.min(50, now - last); last = now; clock += dt;
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
    applyLamp();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  const api: DrawButton3D = {
    setLamp(state) { target = state; },
    press() {
      pressAt = clock; flash = 1;
      const s = options.onPress?.();
      if (sound && s) playSfx(s, { volume: 0.8 });
    },
    setSound(on) { sound = on; },
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
