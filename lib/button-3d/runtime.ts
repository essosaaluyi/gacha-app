import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { playSfx, type SfxName } from "@/lib/audio/sfxStore";

/**
 * Real three.js arcade push button, built in layers so it reads volumetric:
 *   glossy black bevelled bezel → lamp line in the gap → violet collar →
 *   a ring of side lamps → a smaller inner plastic dome with "DRAW" engraved in black →
 *   a clear outer acrylic dome (refraction) over everything.
 * Lamp: gray (ready) → sky (card set, waiting for the next press) → off (dealing) → gray after the last card lands.
 * vibrate(): stored "win confirmed" rattle of the button cap only (slot push button / pachinko lever style); not wired into the game yet.
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
export type LightingPreset = "studio" | "room" | "hall" | "window";
export type DrawButton3DOptions = {
  label?: string; lighting?: LightingPreset;
  /** Camera distance: 7.8 leaves room around the button (lab); ~6 fills the canvas (cabinet slot). */
  distance?: number;
  onPress?: () => SfxName | null | void;
};

const LAMP: Record<LampState, { color: string; power: number }> = {
  gray: { color: "#cfd6df", power: 0.5 },
  sky: { color: "#4cc8ff", power: 1.55 },
  off: { color: "#000000", power: 0 },
};

// Units: outer dome base radius ≈ 1.
const OUTER = { base: 0.99, height: 0.56, seat: 0.42 };
const MIDDLE = { base: 0.84, height: 0.4 };
const INNER = { base: 0.6, height: 0.17, chamfer: 0.05 };
const LEDS = { count: 18, radius: 0.72 };
const PRESS = { depth: 0.085, downMs: 70, holdMs: 45, upMs: 240 };

export function canvas(w: number, h: number) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  return { c, g: c.getContext("2d")! };
}
export function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
}
/** Grayscale (opaque) radial gradient for emissive maps: offset → brightness 0..1. */
export function glowTexture(stops: [number, number][]) {
  const S = 256, { c, g } = canvas(S, S);
  g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [o, v] of stops) { const k = Math.round(v * 255); grad.addColorStop(o, `rgb(${k},${k},${k})`); }
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  return tex(c, false);
}

/** Moulded-plastic micro surface: fine soft "orange peel" ripples (normal map). */
export function plasticNormalTexture() {
  const S = 512, src = canvas(S, S);
  const img = src.g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) { const v = Math.random() * 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  src.g.putImageData(img, 0, 0);
  const blur = canvas(S, S); blur.g.filter = "blur(3px)"; blur.g.drawImage(src.c, 0, 0);
  const h = blur.g.getImageData(0, 0, S, S).data, out = blur.g.createImageData(S, S);
  const H = (x: number, y: number) => {
    const xx = (x + S) % S, yy = (y + S) % S;
    return h[(yy * S + xx) * 4] / 255;
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let nx = -(H(x + 1, y) - H(x - 1, y)) * 2.2, ny = (H(x, y + 1) - H(x, y - 1)) * 2.2, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; const p = (y * S + x) * 4;
    out.data[p] = (nx * 0.5 + 0.5) * 255; out.data[p + 1] = (ny * 0.5 + 0.5) * 255; out.data[p + 2] = (nz * 0.5 + 0.5) * 255; out.data[p + 3] = 255;
  }
  blur.g.putImageData(out, 0, 0);
  return tex(blur.c, false);
}

/** Floor of the lamp chamber (top-down UVs, radius R): a light pool under each LED, nothing between. */
function ledPoolTexture(count: number, ledRadius: number, R: number) {
  const S = 512, { c, g } = canvas(S, S);
  g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = (1 + (Math.cos(a) * ledRadius) / R) / 2 * S, y = (1 + (Math.sin(a) * ledRadius) / R) / 2 * S;
    const grad = g.createRadialGradient(x, y, 0, x, y, S * 0.085);
    grad.addColorStop(0, "rgb(255,255,255)"); grad.addColorStop(0.25, "rgb(140,140,140)"); grad.addColorStop(1, "rgb(0,0,0)");
    g.fillStyle = grad; g.fillRect(0, 0, S, S);
  }
  return tex(c, false);
}

export function radialTexture(stops: [number, string][]) {
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

/** Deterministic RNG so a preset looks the same on every load. */
function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Fills `env` (rendered once into the reflection map) and adds direct lights to `scene`.
 * - studio: even hard strip lights + DirectionalLight (r6 look: tidy, uniform highlights).
 * - room:   three.js RoomEnvironment (boxy room, several ceiling lights) + HemisphereLight + SpotLight.
 * - hall:   pachinko-hall ceiling: many small scattered lamps and neon tubes of varied colour/size →
 *           broken, irregular glints like real glass; SpotLight from above + coloured PointLights.
 * - window: one bright mullioned window with blinds and dark objects in front → one big but broken
 *           reflection; RectAreaLight (window) + DirectionalLight (sun).
 */
function buildLighting(preset: LightingPreset, env: THREE.Scene, scene: THREE.Scene) {
  const box = (color: string) => env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color, side: THREE.BackSide })));
  const soft = radialTexture([[0, "rgba(255,255,255,1)"], [0.45, "rgba(255,255,255,0.85)"], [1, "rgba(255,255,255,0)"]]);
  const panel = (color: string, scale: number, w: number, h: number, p: [number, number, number], blurred = false, roll = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: blurred ? soft : null, transparent: blurred, depthWrite: false, color: new THREE.Color(color).multiplyScalar(scale), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); m.rotateZ(roll); env.add(m); return m;
  };
  if (preset === "studio" || preset === "room") {
    if (preset === "studio") {
      box("#0b1019");
      panel("#ffffff", 1, 16, 10, [-2, 6, -13], true); // dim overhead softbox
      panel("#ffffff", 7, 12, 0.5, [0, 7, -11]);          // overhead strip
      panel("#ffffff", 6, 0.5, 12, [-9, 6, -1]);          // left vertical strip
      panel("#bfe6ff", 6, 0.5, 12, [9, 6, -1]);           // right vertical strip (cool)
      panel("#ffd6ee", 3, 0.4, 10, [-6, 5, 8]);           // front-left pink strip
      panel("#ffffff", 3, 18, 0.45, [0, 2.4, 12]);        // low front bar
      panel("#d9e6ff", 4, 16, 0.5, [0, 5, -12]);          // back rim bar
      const key = new THREE.DirectionalLight("#fff4ea", 1.4); key.position.set(-5, 8, -2); scene.add(key);
    } else {
      scene.add(new THREE.HemisphereLight("#dfe8ff", "#20242c", 0.6));
      const spot = new THREE.SpotLight("#fff1e0", 30, 20, 0.5, 0.6, 2); spot.position.set(-3, 7, 2); scene.add(spot);
    }
  } else if (preset === "hall") {
    box("#07080d");
    const r = rng(7);
    const colors = ["#ffffff", "#fff3d6", "#ffd27a", "#ff7ab8", "#7ae0ff", "#b98cff", "#ffffff", "#ffe9c4"];
    for (let i = 0; i < 90; i++) { // ceiling lamps: random spots, sizes and brightness
      const az = r() * Math.PI * 2, el = 0.15 + r() * 1.25, d = 9 + r() * 6;
      const p: [number, number, number] = [Math.cos(az) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(az) * Math.cos(el) * d];
      const s = 0.15 + r() ** 2 * 1.1;
      panel(colors[(r() * colors.length) | 0], 2 + r() * 9, s, s * (0.6 + r()), p, r() < 0.5, r() * Math.PI);
    }
    for (let i = 0; i < 9; i++) { // neon tubes at odd angles
      const az = r() * Math.PI * 2, el = 0.2 + r() * 0.9, d = 11;
      panel(colors[(r() * colors.length) | 0], 5 + r() * 4, 3 + r() * 6, 0.12 + r() * 0.15, [Math.cos(az) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(az) * Math.cos(el) * d], false, r() * Math.PI);
    }
    const spot = new THREE.SpotLight("#fff4e6", 40, 20, 0.45, 0.7, 2); spot.position.set(-1.5, 7, 1); scene.add(spot);
    const pink = new THREE.PointLight("#ff6fb0", 6, 10, 2); pink.position.set(4, 3, -2); scene.add(pink);
    const cyan = new THREE.PointLight("#5fd8ff", 5, 10, 2); cyan.position.set(-4, 2.5, 3); scene.add(cyan);
  } else {
    box("#0a0d13");
    // Window up-left behind: 3×2 panes with mullions, horizontal blind slats and a plant/shelf silhouette.
    const base = new THREE.Vector3(-7, 7, -8), right = new THREE.Vector3(1, 0, -0.6).normalize(), up = new THREE.Vector3(0, 1, 0.25).normalize();
    for (let cx = 0; cx < 3; cx++) for (let cy = 0; cy < 2; cy++) {
      for (let slat = 0; slat < 5; slat++) {
        const c = base.clone().addScaledVector(right, (cx - 1) * 2.3).addScaledVector(up, (cy - 0.5) * 2.6 + (slat - 2) * 0.48);
        panel(slat % 2 ? "#f4f8ff" : "#dfeaff", 8 + cx * 1.5, 2.05, 0.34, [c.x, c.y, c.z]);
      }
    }
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), new THREE.MeshBasicMaterial({ color: "#000000", side: THREE.DoubleSide }));
    dark.position.copy(base.clone().multiplyScalar(0.8).addScaledVector(right, 1.2)); dark.lookAt(0, 0, 0); env.add(dark); // object in front of the window
    panel("#ffd9b0", 1.5, 6, 4, [8, 3, 6], true);   // warm lamp across the room
    panel("#ffffff", 0.6, 20, 8, [0, -6, 6], true); // floor bounce
    RectAreaLightUniformsLib.init();
    const win = new THREE.RectAreaLight("#eef4ff", 6, 7, 5); win.position.copy(base).multiplyScalar(0.7); win.lookAt(0, 0, 0); scene.add(win);
    const sun = new THREE.DirectionalLight("#fff0dc", 1.1); sun.position.set(-6, 9, -6); scene.add(sun);
  }
  soft.dispose();
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
  const elevation = THREE.MathUtils.degToRad(48), distance = options.distance ?? 7.8;
  camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
  camera.lookAt(0, 0.25, 0);

  // ── Lighting. Reflections on glossy plastic/glass come from the environment map (what the surface
  // "sees"); direct lights only add highlights and shading. Four presets for comparison.
  const pmrem = own(new THREE.PMREMGenerator(renderer));
  const studio = new THREE.Scene();
  const lighting: LightingPreset = options.lighting ?? "studio";
  buildLighting(lighting, studio, scene);
  const envRT = own(lighting === "room" ? pmrem.fromScene(new RoomEnvironment(), 0.02) : pmrem.fromScene(studio, 0.005));
  scene.environment = envRT.texture;
  if (lighting === "room") scene.environmentIntensity = 0.55;
  studio.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mat = m.material as THREE.MeshBasicMaterial | undefined; mat?.map?.dispose(); mat?.dispose(); });

  // ── Soft contact shadow and the fixed housing; only the cap moves (press and vibrate()).
  const shadowTex = own(radialTexture([[0, "rgba(0,0,0,0.85)"], [0.55, "rgba(0,0,0,0.5)"], [1, "rgba(0,0,0,0)"]]));
  const shadow = new THREE.Mesh(own(new THREE.PlaneGeometry(3.5, 3.5)), own(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; scene.add(shadow);
  const rig = new THREE.Group(); scene.add(rig);

  // ── Bezel: dark polished metal ring with a rounded lip and a broad bevel sloping outward (hard edges
  // only where faces meet: inner wall | bevel | outer wall).
  const bezelMat = own(new THREE.MeshPhysicalMaterial({ color: "#3b4252", metalness: 1, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 }));
  // LatheGeometry normals are (dy, -dx): list points outer-bottom → over the top → inner, so faces point up/out.
  const lathe = (pts: number[][]) => rig.add(new THREE.Mesh(own(new THREE.LatheGeometry([...pts].reverse().map(([x, y]) => new THREE.Vector2(x, y)), 220)), bezelMat));
  // One continuous profile (tangent-continuous Béziers, so the normals stay smooth): inner wall →
  // wide rounded lip → broad crown → deep rounded outer shoulder → foot.
  const B = (a: number[], b: number[], c: number[], d: number[]) =>
    new THREE.CubicBezierCurve(new THREE.Vector2(a[0], a[1]), new THREE.Vector2(b[0], b[1]), new THREE.Vector2(c[0], c[1]), new THREE.Vector2(d[0], d[1]));
  const profile = new THREE.CurvePath<THREE.Vector2>();
  profile.add(new THREE.LineCurve(new THREE.Vector2(1.03, 0.04), new THREE.Vector2(1.03, 0.15)));
  profile.add(B([1.03, 0.15], [1.03, 0.27], [1.08, 0.315], [1.18, 0.315]));   // rounded inner lip
  profile.add(B([1.18, 0.315], [1.29, 0.315], [1.41, 0.285], [1.45, 0.19]));  // crown rolling over
  profile.add(B([1.45, 0.19], [1.48, 0.13], [1.48, 0.06], [1.455, 0.025]));  // outer shoulder
  profile.add(B([1.455, 0.025], [1.445, 0.01], [1.43, 0.0], [1.41, 0.0]));    // tucked foot
  lathe(profile.getPoints(28).map((v) => [v.x, v.y]));
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
  const collarMat = own(new THREE.MeshPhysicalMaterial({ map: own(collarTexture(false)), emissiveMap: own(collarTexture(true)), emissive: "#000000", emissiveIntensity: 1.6, metalness: 0.85, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.02 }));
  const collar = new THREE.Mesh(own(new THREE.CylinderGeometry(OUTER.base, OUTER.base, OUTER.seat, 160, 1, true)), collarMat);
  collar.position.y = OUTER.seat / 2; cap.add(collar);

  // Floor of the outer dome: dark mirror with the side lamps' light pooled in a band.
  const poolTex = own(ledPoolTexture(LEDS.count, LEDS.radius, OUTER.base - 0.005));
  const floorMat = own(new THREE.MeshStandardMaterial({ color: "#070b16", metalness: 0.85, roughness: 0.22, emissive: "#000000", emissiveMap: poolTex }));
  const floor = new THREE.Mesh(own(new THREE.CircleGeometry(OUTER.base - 0.005, 128)), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = OUTER.seat; cap.add(floor);

  // Side lamps: real light sources inside the button. Each LED is a small lens with a white-hot centre
  // (unlit, not tone-mapped) and a soft additive halo; a ring of point lights carries their light onto
  // the floor, the core's chrome chamfer and the shells, so the glow falls off from each LED.
  const ledY = OUTER.seat + 0.05;
  const ledMat = own(new THREE.MeshBasicMaterial({ color: "#000000", toneMapped: false }));
  const ledGeo = own(new THREE.SphereGeometry(0.03, 16, 12));
  const haloTex = own(radialTexture([[0, "rgba(255,255,255,1)"], [0.12, "rgba(255,255,255,0.6)"], [0.4, "rgba(255,255,255,0.14)"], [1, "rgba(255,255,255,0)"]]));
  const haloMat = own(new THREE.SpriteMaterial({ map: haloTex, color: "#000000", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  for (let i = 0; i < LEDS.count; i++) {
    const a = (i / LEDS.count) * Math.PI * 2, x = Math.cos(a) * LEDS.radius, z = Math.sin(a) * LEDS.radius;
    const led = new THREE.Mesh(ledGeo, ledMat); led.scale.y = 0.7; led.position.set(x, ledY, z); cap.add(led);
    const halo = new THREE.Sprite(haloMat); halo.scale.setScalar(0.3); halo.position.set(x, ledY + 0.01, z); halo.renderOrder = 1; cap.add(halo);
  }
  const ledLights: THREE.PointLight[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.5) / 6) * Math.PI * 2;
    const l = new THREE.PointLight("#ffffff", 0, 1.1, 2); l.position.set(Math.cos(a) * LEDS.radius, ledY + 0.03, Math.sin(a) * LEDS.radius);
    cap.add(l); ledLights.push(l);
  }

  // Innermost core: a flat-topped puck with a polished metal chamfer; the label is engraved flat
  // into its lit top and filled with black.
  const coreTop = OUTER.seat + INNER.height;
  const faceMaps = innerDomeMaps(options.label ?? "DRAW");
  const innerMat = own(new THREE.MeshPhysicalMaterial({
    map: own(faceMaps.map), emissiveMap: own(faceMaps.emissiveMap), normalMap: own(faceMaps.normalMap), normalScale: new THREE.Vector2(1.3, 1.3),
    emissive: "#000000", emissiveIntensity: 1, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.04, metalness: 0, envMapIntensity: 0.7,
  }));
  const face = new THREE.Mesh(own(new THREE.CircleGeometry(INNER.base - INNER.chamfer, 128)), innerMat);
  face.rotation.x = -Math.PI / 2; face.position.y = coreTop; cap.add(face);
  const chromeMat = own(new THREE.MeshPhysicalMaterial({ color: "#c9d2e2", metalness: 1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 }));
  const coreSide = [[INNER.base, OUTER.seat], [INNER.base, coreTop - INNER.chamfer], [INNER.base - INNER.chamfer, coreTop]]
    .reverse().map(([x, y]) => new THREE.Vector2(x, y));
  cap.add(new THREE.Mesh(own(new THREE.LatheGeometry(coreSide, 200)), chromeMat));
  // The chamfer edge catches the side lamps: a thin lit rim.
  const rimMat = own(new THREE.MeshStandardMaterial({ color: "#dfe8f6", roughness: 0.08, metalness: 0.6, emissive: "#000000" }));
  const rim = new THREE.Mesh(own(new THREE.TorusGeometry(INNER.base - INNER.chamfer, 0.007, 10, 200)), rimMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = coreTop; cap.add(rim);

  // Two clear shells over the core (middle + outer), like the stacked plastics of a pachinko button.
  // They are drawn as additive reflection layers (black base, sharp clearcoat/Fresnel highlights, a faint
  // lamp-coloured haze), so every layer stays visible through the one in front of it.
  // Their haze is light scattered from the LEDs below, so it is strongest at the base and fades to clear on top.
  const hazeTex = own(glowTexture([[0, 0], [0.55, 0.04], [0.82, 0.3], [0.95, 1], [1, 1]]));
  const shellMat = (haze: number) => own(new THREE.MeshPhysicalMaterial({
    color: "#000000", metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.01, specularIntensity: 1, envMapIntensity: 1.5,
    emissive: "#000000", emissiveMap: hazeTex, emissiveIntensity: haze, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  const middleMat = shellMat(0.32), domeMat = shellMat(0.2);
  // Outer cover reads as moulded plastic, not glass: a faint milky body that catches the room light,
  // slightly softer base reflections with a sharp clearcoat on top, and a fine orange-peel surface.
  domeMat.color.set("#1c2029"); domeMat.roughness = 0.16; domeMat.clearcoatRoughness = 0.05;
  domeMat.sheen = 0.6; domeMat.sheenRoughness = 0.35; domeMat.sheenColor.set("#9aa6bb");
  domeMat.normalMap = own(plasticNormalTexture()); domeMat.normalScale.set(0.35, 0.35);
  domeMat.clearcoatNormalMap = domeMat.normalMap; domeMat.clearcoatNormalScale.set(0.12, 0.12);
  const middle = new THREE.Mesh(own(capGeometry(MIDDLE.base, MIDDLE.height)), middleMat);
  middle.position.y = OUTER.seat; middle.renderOrder = 2; cap.add(middle);
  const middleRim = new THREE.Mesh(own(new THREE.TorusGeometry(MIDDLE.base, 0.008, 10, 200)), rimMat);
  middleRim.rotation.x = Math.PI / 2; middleRim.position.y = OUTER.seat + 0.004; cap.add(middleRim);
  const dome = new THREE.Mesh(own(capGeometry(OUTER.base, OUTER.height)), domeMat);
  dome.position.y = OUTER.seat; dome.renderOrder = 3; cap.add(dome);
  const inner = new THREE.PointLight("#ffffff", 0, 2.6, 1.6); inner.position.y = OUTER.seat + INNER.height + 0.12; cap.add(inner);

  // ── Lamp state (eased) ──────────────────────────────────────────────
  let target: LampState = "gray";
  const lampColor = new THREE.Color(LAMP.gray.color); let lampPower = LAMP.gray.power;
  let flash = 0, hover = 0, hovering = false, pressAt = -1, vibAt = -1, vibMs = 0, vibPulse = 0;
  const lit = new THREE.Color(), tmp = new THREE.Color(), dark = new THREE.Color("#1a2433"), WHITE = new THREE.Color("#ffffff");

  function applyLamp() {
    const p = lampPower * (1 + 0.18 * hover + vibPulse) + flash * (lampPower > 0.05 ? 0.9 : 0);
    lit.copy(lampColor).multiplyScalar(p);
    ringMat.emissive.copy(lit); ringMat.color.copy(dark).lerp(tmp.copy(lampColor), Math.min(1, lampPower));
    gapMat.color.copy(lit).multiplyScalar(0.6);
    collarMat.emissive.copy(lit).multiplyScalar(0.14);
    // LED lens: dark glass when off, white-hot core tinted by the lamp colour when lit.
    ledMat.color.copy(dark).multiplyScalar(0.6).lerp(tmp.copy(lampColor).lerp(WHITE, 0.55), Math.min(1, p)).multiplyScalar(Math.max(1, p * 1.6));
    haloMat.color.copy(lit).multiplyScalar(0.55);
    for (const l of ledLights) { l.color.copy(lampColor); l.intensity = p * 1.4; }
    floorMat.emissive.copy(lit).multiplyScalar(0.7);
    innerMat.emissive.copy(lit).multiplyScalar(0.2);
    rimMat.emissive.copy(lit).multiplyScalar(0.9);
    middleMat.emissive.copy(lit); domeMat.emissive.copy(lit);
    inner.color.copy(lampColor); inner.intensity = p * 1.1;
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
    cap.position.x = 0; cap.position.z = 0; cap.rotation.set(0, 0, 0); vibPulse = 0;
    if (vibAt >= 0) {
      const t = clock - vibAt, u = t / vibMs;
      if (u >= 1) vibAt = -1;
      else {
        const s = t / 1000, attack = Math.min(1, t / 40), tail = u > 0.75 ? ((1 - u) / 0.25) ** 1.5 : 1;
        const burst = 0.55 + 0.45 * Math.max(0, Math.sin(2 * Math.PI * 7 * s)); // ~7 bursts per second
        // Only the cap rattles inside the fixed bezel; 0.016 keeps it clear of the 0.04 gap.
        const a = 0.016 * attack * tail * burst;
        cap.position.x = a * (Math.sin(2 * Math.PI * 41 * s) + 0.6 * Math.sin(2 * Math.PI * 67 * s + 1.3));
        cap.position.z = a * 0.8 * (Math.sin(2 * Math.PI * 37 * s + 2.1) + 0.5 * Math.sin(2 * Math.PI * 59 * s));
        cap.position.y += a * 0.5 * Math.sin(2 * Math.PI * 53 * s + 0.7);
        cap.rotation.z = a * 1.2 * Math.sin(2 * Math.PI * 43 * s + 0.4);
        cap.rotation.x = a * 1.0 * Math.sin(2 * Math.PI * 47 * s + 1.9);
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
