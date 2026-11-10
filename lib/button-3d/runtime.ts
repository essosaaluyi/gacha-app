import * as THREE from "three";
import { playSfx, type SfxName } from "@/lib/audio/sfxStore";

/**
 * Real three.js arcade push button: dark metal bezel, lamp ring, violet collar,
 * LED dot plate with "DRAW" engraved into it, seen through a clear acrylic dome.
 * Lamp: gray (ready) → sky (card set, waiting for the next press) → off (dealing) → gray after the last card lands.
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
function drawDots(g: CanvasRenderingContext2D, S: number, emissive: boolean) {
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
    g.globalCompositeOperation = "source-over";
  }
}

/**
 * LED plate with the label engraved (cut into the flat plate, not printed on the dome).
 * Returns colour, emissive and tangent-space normal maps built from one letter mask:
 * the cut floor is frosted, the cut walls shade via the normal map and catch the lamp (edge-lit acrylic).
 */
function engravedPlate(label: string) {
  const S = 1024;
  const mask = canvas(S, S);
  mask.g.fillStyle = "#000"; mask.g.fillRect(0, 0, S, S);
  mask.g.textAlign = "center"; mask.g.textBaseline = "middle";
  const font = (s: number) => `900 ${s}px "Arial Black", "Segoe UI", Arial, sans-serif`;
  let size = 250; mask.g.font = font(size);
  while (mask.g.measureText(label).width > S * 0.62 && size > 60) { size -= 6; mask.g.font = font(size); }
  mask.g.fillStyle = "#fff"; mask.g.fillText(label, S / 2, S * 0.55); // a little toward the player
  const hard = mask.g.getImageData(0, 0, S, S).data;
  const bevel = canvas(S, S);
  bevel.g.filter = "blur(2px)"; bevel.g.drawImage(mask.c, 0, 0);
  const softMask = bevel.g.getImageData(0, 0, S, S).data;
  const height = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) height[i] = 1 - softMask[i * 4] / 255; // 1 = plate top, 0 = bottom of the cut

  const col = canvas(S, S), emi = canvas(S, S), nor = canvas(S, S);
  drawDots(col.g, S, false); drawDots(emi.g, S, true);
  const cImg = col.g.getImageData(0, 0, S, S), eImg = emi.g.getImageData(0, 0, S, S), nImg = nor.g.createImageData(S, S);
  const floor = [26, 36, 62], strength = 7;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x, p = i * 4;
      const hx = height[y * S + Math.min(S - 1, x + 1)] - height[y * S + Math.max(0, x - 1)];
      const hy = height[Math.min(S - 1, y + 1) * S + x] - height[Math.max(0, y - 1) * S + x];
      // Canvas y runs down while texture v runs up (flipY), hence the sign on ny.
      let nx = -hx * strength, ny = hy * strength, nz = 1; const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      nImg.data[p] = (nx * 0.5 + 0.5) * 255; nImg.data[p + 1] = (ny * 0.5 + 0.5) * 255; nImg.data[p + 2] = (nz * 0.5 + 0.5) * 255; nImg.data[p + 3] = 255;
      const m = hard[p] / 255, edge = Math.min(1, Math.hypot(hx, hy) * 3);
      // Seen from the player's side (canvas bottom), the near lip hides the floor next to it (shadow band)
      // while the far wall of each cut faces the camera and catches the lamp (bright band).
      const under = (dy: number) => hard[(Math.min(S - 1, Math.max(0, y + dy)) * S + x) * 4] / 255;
      const shade = m * Math.max(1 - under(9), 0.6 * (1 - under(18))), wall = m * (1 - under(-8));
      for (let k = 0; k < 3; k++) {
        cImg.data[p + k] = (cImg.data[p + k] * (1 - m) + floor[k] * m) * (1 - 0.45 * edge * m) * (1 - 0.85 * shade) + 110 * wall * (1 - shade);
        eImg.data[p + k] = Math.min(255, eImg.data[p + k] * (1 - m) + 255 * (0.16 * m * (1 - 0.9 * shade) + 0.25 * edge * m + 0.85 * wall * (1 - shade)));
      }
    }
  }
  col.g.putImageData(cImg, 0, 0); emi.g.putImageData(eImg, 0, 0); nor.g.putImageData(nImg, 0, 0);
  return { map: tex(col.c), emissiveMap: tex(emi.c, false), normalMap: tex(nor.c, false) };
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
  renderer.transmissionResolutionScale = 1; // full-res refraction so the engraving under the dome stays sharp
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
  const shadow = new THREE.Mesh(own(new THREE.PlaneGeometry(3.3, 3.3)), own(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; scene.add(shadow);

  // ── Bezel: one lathe per face so every edge is a hard, crisp circle (no smoothed-over lip).
  const profile = [[1.035, 0.04], [1.035, 0.19], [1.065, 0.222], [1.3, 0.222], [1.34, 0.185], [1.36, 0]];
  const bezelMat = own(new THREE.MeshPhysicalMaterial({ color: "#0c1630", metalness: 0.65, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04 }));
  for (let i = 0; i < profile.length - 1; i++) {
    const face = [profile[i], profile[i + 1]].map(([x, y]) => new THREE.Vector2(x, y));
    scene.add(new THREE.Mesh(own(new THREE.LatheGeometry(face, 200)), bezelMat));
  }
  const well = new THREE.Mesh(own(new THREE.CircleGeometry(1.04, 96)), own(new THREE.MeshStandardMaterial({ color: "#05080f", roughness: 0.8 })));
  well.rotation.x = -Math.PI / 2; well.position.y = 0.04; scene.add(well);
  // Polished metal trim on both bezel edges: sharp highlight lines that define the circle.
  const trimMat = own(new THREE.MeshStandardMaterial({ color: "#c8d3e6", metalness: 1, roughness: 0.12 }));
  for (const [r, y, t] of [[1.302, 0.218, 0.011], [1.05, 0.212, 0.009]]) {
    const trim = new THREE.Mesh(own(new THREE.TorusGeometry(r, t, 12, 220)), trimMat);
    trim.rotation.x = Math.PI / 2; trim.position.y = y; scene.add(trim);
  }

  // Lamp ring set in a dark groove on the bezel top (no blur halo: a clean, solid ring of light).
  const groove = new THREE.Mesh(own(new THREE.RingGeometry(1.125, 1.215, 200)), own(new THREE.MeshStandardMaterial({ color: "#03060c", roughness: 0.6 })));
  groove.rotation.x = -Math.PI / 2; groove.position.y = 0.2225; scene.add(groove);
  const ringMat = own(new THREE.MeshStandardMaterial({ color: "#1a2433", roughness: 0.25, metalness: 0.1, emissive: "#000000", emissiveIntensity: 1.25 }));
  const ring = new THREE.Mesh(own(new THREE.TorusGeometry(1.17, 0.028, 20, 220)), ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.216; scene.add(ring);
  const additive = (map: THREE.Texture) => own(new THREE.MeshBasicMaterial({ map, color: "#000000", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const gapMat = own(new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
  const gap = new THREE.Mesh(own(new THREE.RingGeometry(0.99, 1.035, 128)), gapMat);
  gap.rotation.x = -Math.PI / 2; gap.position.y = 0.2; scene.add(gap);

  // ── Moving cap: collar, LED plate, dome, printed label, inner light.
  const cap = new THREE.Group(); cap.position.y = 0.06; scene.add(cap);
  const collarMat = own(new THREE.MeshPhysicalMaterial({ map: own(collarTexture(false)), emissiveMap: own(collarTexture(true)), emissive: "#000000", emissiveIntensity: 1.6, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const collar = new THREE.Mesh(own(new THREE.CylinderGeometry(DOME.base, DOME.base, DOME.seat, 160, 1, true)), collarMat);
  collar.position.y = DOME.seat / 2; cap.add(collar);
  const plateMaps = engravedPlate(options.label ?? "DRAW");
  const plateMat = own(new THREE.MeshStandardMaterial({
    map: own(plateMaps.map), emissiveMap: own(plateMaps.emissiveMap), normalMap: own(plateMaps.normalMap), normalScale: new THREE.Vector2(1.4, 1.4),
    emissive: "#000000", emissiveIntensity: 1.2, roughness: 0.42, metalness: 0.1,
  }));
  const plate = new THREE.Mesh(own(new THREE.CircleGeometry(DOME.base - 0.005, 128)), plateMat);
  plate.rotation.x = -Math.PI / 2; plate.position.y = DOME.seat - 0.04; cap.add(plate);

  const R = (DOME.base ** 2 + DOME.height ** 2) / (2 * DOME.height);
  const domeY = DOME.seat + DOME.height - R;
  const domeMat = own(new THREE.MeshPhysicalMaterial({
    color: "#ffffff", metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.22, ior: 1.49,
    attenuationColor: new THREE.Color("#e4f4ff"), attenuationDistance: 3, clearcoat: 1, clearcoatRoughness: 0.02,
    specularIntensity: 1, envMapIntensity: 1.25,
  }));
  const dome = new THREE.Mesh(own(capGeometry(R, DOME.base)), domeMat);
  dome.position.y = domeY; cap.add(dome);
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
    gapMat.color.copy(lit).multiplyScalar(0.6);
    collarMat.emissive.copy(lit).multiplyScalar(0.3);
    plateMat.emissive.copy(lit).multiplyScalar(0.85);
    core.material.color.copy(lit).multiplyScalar(0.28);
    inner.color.copy(lampColor); inner.intensity = p * 2.2;
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
