import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  LAMP, buildDrawButton, buildLighting, canvas, plasticNormalTexture, radialTexture, tex,
  type LampState,
} from "./runtime";

/**
 * The cabinet's upper-right control panel as one recessed 3D niche (owner request 2026-11-11):
 *   front lip with "DESTINY WARS" engraved → AUTO toggle lever → the round DRAW button, all on a floor
 *   that slopes up toward the back → back wall and ceiling → an overhang jutting forward above, carrying
 *   a rectangular DATA COUNTER push button in the same style as DRAW.
 * Purely visual: the DOM buttons stay the hit areas. onLayout reports where each 3D control lands
 * (host-pixel rects) so the caller can move its hit areas onto them.
 */
export type NicheRect = { left: number; top: number; width: number; height: number };
export type NicheLayout = { draw: NicheRect; auto: NicheRect; data: NicheRect };
export type CabinetNiche3D = {
  setDrawLamp(state: LampState): void;
  pressDraw(): void;
  vibrate(durationMs?: number): void;
  setAuto(on: boolean): void;
  pressData(): void;
  setPaused(on: boolean): void;
  advance(ms: number): void;
  dispose(): void;
};
/** Elements borrowed from the owner reference (slot-machine side panel, 2026-11-11). */
export type NicheVariant = {
  /** DATA COUNTER as a lit sign box (cream face, red italic letters, amber frame) instead of the clear push button. */
  sign?: boolean;
  /** DESTINY WARS: engraved in the floor lip (default), raised chrome letters on the back wall, or engraved in the back wall. */
  logo?: "floor" | "wallRaised" | "wallEngraved";
  /** A chrome scoop tray across the front of the floor. */
  tray?: boolean;
  /** Metallic blue side walls. */
  blueSides?: boolean;
};
type Own = <T extends { dispose(): void }>(x: T) => T;

const FLOOR_TILT = THREE.MathUtils.degToRad(34); // floor rises toward the back
const NICHE = { halfW: 1.62, floorFront: 2.45, floorBack: -3.05, ceilingY: 3.05, overhangFront: 1.15, overhangTop: 5.35, apronBottom: -3.1 };
const GOLD = "#b8955a";

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
/** Extrude toward +z, bevel included, back face at z = 0; welded for smooth shading. */
function extruded(shape: THREE.Shape, depth: number, bevel: number, size: number, segments: number, smooth = true) {
  let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: size, bevelSegments: segments, curveSegments: 12 });
  g.translate(0, 0, bevel);
  if (smooth) { g.deleteAttribute("normal"); g.deleteAttribute("uv"); const m = mergeVertices(g, 1e-4); g.dispose(); g = m; g.computeVertexNormals(); }
  return g;
}
/** Flat shape in XY with UVs spanning its w×h box. */
function flatRect(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 12);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

/**
 * Text cut into a plate: colour map (base, letters filled with `fill`, a lit far wall), optional
 * emissive map (lit plate, dark letters) and a normal map from the blurred letter mask.
 */
function engraveMaps(text: string | { t: string; x: number }[], aspect: number, o: { base: string; fill: string; font: string; widthFrac: number; emissive?: boolean; lines?: boolean }) {
  const W = 1024, H = Math.round(W / aspect);
  const mask = canvas(W, H);
  mask.g.fillStyle = "#000"; mask.g.fillRect(0, 0, W, H);
  mask.g.textAlign = "center"; mask.g.textBaseline = "middle";
  const items = typeof text === "string" ? [{ t: text, x: 0.5 }] : text;
  let size = Math.round(H * 0.62); mask.g.font = o.font.replace("SIZE", String(size));
  const widest = () => Math.max(...items.map((i) => mask.g.measureText(i.t).width));
  while ((items.length === 1 ? widest() > W * o.widthFrac : size > H * 0.42) && size > 10) { size -= 2; mask.g.font = o.font.replace("SIZE", String(size)); }
  mask.g.fillStyle = "#fff"; for (const i of items) mask.g.fillText(i.t, W * i.x, H * 0.53);
  const hard = mask.g.getImageData(0, 0, W, H).data;
  const blur = canvas(W, H); blur.g.filter = "blur(2px)"; blur.g.drawImage(mask.c, 0, 0);
  const soft = blur.g.getImageData(0, 0, W, H).data;
  const col = canvas(W, H), nor = canvas(W, H), emi = canvas(W, H);
  col.g.fillStyle = o.base; col.g.fillRect(0, 0, W, H);
  if (o.lines) { // fine brushed / diffuser lines
    for (let y = 0; y < H; y += 3) { col.g.fillStyle = `rgba(255,255,255,${0.025 + 0.025 * Math.sin(y * 0.7)})`; col.g.fillRect(0, y, W, 1); }
  }
  emi.g.fillStyle = "#fff"; emi.g.fillRect(0, 0, W, H);
  const cI = col.g.getImageData(0, 0, W, H), eI = emi.g.getImageData(0, 0, W, H), nI = nor.g.createImageData(W, H);
  const fill = new THREE.Color(o.fill); const fr = fill.r * 255, fg = fill.g * 255, fb = fill.b * 255;
  const h = (x: number, y: number) => 1 - soft[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = (y * W + x) * 4, hx = h(x + 1, y) - h(x - 1, y), hy = h(x, y + 1) - h(x, y - 1);
    let nx = -hx * 6, ny = hy * 6, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    nI.data[p] = (nx * 0.5 + 0.5) * 255; nI.data[p + 1] = (ny * 0.5 + 0.5) * 255; nI.data[p + 2] = (nz * 0.5 + 0.5) * 255; nI.data[p + 3] = 255;
    const m = hard[p] / 255, above = hard[(Math.max(0, y - 5) * W + x) * 4] / 255, wall = m * (1 - above);
    cI.data[p] = cI.data[p] * (1 - m) + fr * m + 50 * wall; cI.data[p + 1] = cI.data[p + 1] * (1 - m) + fg * m + 50 * wall; cI.data[p + 2] = cI.data[p + 2] * (1 - m) + fb * m + 50 * wall;
    for (let k = 0; k < 3; k++) eI.data[p + k] *= 1 - m;
  }
  col.g.putImageData(cI, 0, 0); nor.g.putImageData(nI, 0, 0); emi.g.putImageData(eI, 0, 0);
  return { map: tex(col.c), normalMap: tex(nor.c, false), emissiveMap: o.emissive ? tex(emi.c, false) : null };
}

/** Clear moulded plastic drawn as an additive reflection layer (same recipe as the DRAW dome). */
function clearPlastic(own: Own, normal: THREE.Texture) {
  return own(new THREE.MeshPhysicalMaterial({
    color: "#1c2029", metalness: 0, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1, envMapIntensity: 1.5,
    sheen: 0.6, sheenRoughness: 0.35, sheenColor: new THREE.Color("#9aa6bb"), normalMap: normal, normalScale: new THREE.Vector2(0.3, 0.3),
    emissive: "#000000", emissiveIntensity: 0.12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
}

/** Normal map from a height canvas (white = high), for raised/embossed details. */
function normalsFrom(c: HTMLCanvasElement, strength: number) {
  const W = c.width, H = c.height, src = c.getContext("2d")!.getImageData(0, 0, W, H).data, out = canvas(W, H), img = out.g.createImageData(W, H);
  const h = (x: number, y: number) => src[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = -(h(x + 1, y) - h(x - 1, y)) * strength, ny = (h(x, y + 1) - h(x, y - 1)) * strength, l = Math.hypot(nx, ny, 1);
    const p = (y * W + x) * 4; img.data[p] = (nx / l * 0.5 + 0.5) * 255; img.data[p + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[p + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[p + 3] = 255;
  }
  out.g.putImageData(img, 0, 0); return tex(out.c, false);
}

/** Raised chrome letters (reference: the embossed maker name): letter-shaped layers stacked into real depth,
 *  a darker metal side and a chrome face with rounded edges. Faces +z. */
function raisedText(own: Own, text: string, w: number, h: number, depth = 0.07) {
  const Wp = 1024, Hp = Math.round((Wp * h) / w), m = canvas(Wp, Hp);
  m.g.fillStyle = "#000"; m.g.fillRect(0, 0, Wp, Hp); m.g.textAlign = "center"; m.g.textBaseline = "middle";
  let size = Math.round(Hp * 0.8); const font = (z: number) => `900 ${z}px "Cinzel", "Trajan Pro", Georgia, serif`; m.g.font = font(size);
  while (m.g.measureText(text).width > Wp * 0.95 && size > 10) { size -= 2; m.g.font = font(size); }
  m.g.fillStyle = "#fff"; m.g.fillText(text, Wp / 2, Hp * 0.54);
  const alpha = own(tex(m.c, false));
  const blur = canvas(Wp, Hp); blur.g.filter = "blur(3px)"; blur.g.drawImage(m.c, 0, 0);
  const g = new THREE.Group(), geo = own(new THREE.PlaneGeometry(w, h));
  const side = own(new THREE.MeshStandardMaterial({ color: "#4a505a", metalness: 0.9, roughness: 0.35, alphaMap: alpha, alphaTest: 0.5 }));
  const top = own(new THREE.MeshPhysicalMaterial({ color: "#eef2f7", metalness: 1, roughness: 0.07, clearcoat: 1, alphaMap: alpha, alphaTest: 0.5, normalMap: own(normalsFrom(blur.c, 5)), normalScale: new THREE.Vector2(1.4, 1.4) }));
  const layers = 12;
  for (let i = 0; i <= layers; i++) { const p = new THREE.Mesh(geo, i === layers ? top : side); p.position.z = (depth * i) / layers; g.add(p); }
  return g;
}

/** Lit sign face: warm cream light box, red italic letters with a dark outline (reference: CHANCE lamp). */
function signTexture(text: string) {
  const W = 1024, H = 394, { c, g } = canvas(W, H);
  const bg = g.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H / 2, W * 0.6);
  bg.addColorStop(0, "#fffaf0"); bg.addColorStop(0.55, "#fbe9c6"); bg.addColorStop(1, "#d9a868");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(120,60,20,0.55)"; g.lineWidth = 6; g.strokeRect(18, 18, W - 36, H - 36);
  let size = 200; const font = (z: number) => `italic 900 ${z}px "Arial Black", "Segoe UI", Arial, sans-serif`; g.font = font(size);
  while (g.measureText(text).width > W * 0.84 && size > 20) { size -= 4; g.font = font(size); }
  g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.strokeStyle = "#3a0806"; g.lineWidth = 14; g.strokeText(text, W / 2, H * 0.53);
  const red = g.createLinearGradient(0, H * 0.3, 0, H * 0.75); red.addColorStop(0, "#ff3b2f"); red.addColorStop(1, "#b30c10");
  g.fillStyle = red; g.fillText(text, W / 2, H * 0.53);
  return tex(c);
}

export function mountCabinetNiche(host: HTMLElement, opts: { onLayout?: (l: NicheLayout) => void; variant?: NicheVariant } = {}): CabinetNiche3D {
  const variant = opts.variant ?? {};
  const logoMode = variant.logo ?? "floor";
  const disposables: { dispose(): void }[] = [];
  const own: Own = (x) => { disposables.push(x); return x; };
  let disposed = false, raf = 0, last = performance.now(), paused = false;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.5, 80);
  const look = new THREE.Vector3(0, 1.1, 0), tiltDown = THREE.MathUtils.degToRad(12), dist = 17.5;
  camera.position.set(0, look.y + Math.sin(tiltDown) * dist, Math.cos(tiltDown) * dist); camera.lookAt(look);

  const pmrem = own(new THREE.PMREMGenerator(renderer));
  const studio = new THREE.Scene();
  buildLighting("window", studio, scene);
  scene.environment = own(pmrem.fromScene(studio, 0.005)).texture;
  studio.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mat = m.material as THREE.MeshBasicMaterial | undefined; mat?.map?.dispose(); mat?.dispose(); });

  // ── Niche shell: dark satin walls, gold trim along the opening.
  const grain = own(plasticNormalTexture()); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(4, 4);
  const wallMat = own(new THREE.MeshPhysicalMaterial({ color: "#232a35", metalness: 0.55, roughness: 0.4, normalMap: grain, normalScale: new THREE.Vector2(0.25, 0.25), clearcoat: 0.4, clearcoatRoughness: 0.2, side: THREE.DoubleSide }));
  const floorMat = own(new THREE.MeshPhysicalMaterial({ color: "#1a2029", metalness: 0.7, roughness: 0.3, normalMap: grain, normalScale: new THREE.Vector2(0.2, 0.2), clearcoat: 0.6, clearcoatRoughness: 0.1 }));
  const sideMat = variant.blueSides
    ? own(new THREE.MeshPhysicalMaterial({ color: "#3a6cf0", emissive: "#0b1e5c", metalness: 0.8, roughness: 0.24, normalMap: grain, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide }))
    : wallMat;
  const goldMat = own(new THREE.MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.22, clearcoat: 0.6 }));
  const { halfW, floorFront, floorBack, ceilingY, overhangFront, overhangTop, apronBottom } = NICHE;
  const W = halfW * 2;

  const floorG = new THREE.Group(); floorG.rotation.x = FLOOR_TILT; scene.add(floorG);
  const TRAY = 1.05, floorEnd = variant.tray ? floorFront - TRAY : floorFront;
  const floor = new THREE.Mesh(own(new THREE.PlaneGeometry(W, floorEnd - floorBack)), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = (floorEnd + floorBack) / 2; floorG.add(floor);
  const back = new THREE.Vector3(0, 0, floorBack).applyEuler(floorG.rotation);   // world back edge
  const front = new THREE.Vector3(0, 0, floorFront).applyEuler(floorG.rotation); // world front edge

  const plane = (w: number, h: number, mat: THREE.Material, p: [number, number, number], rx = 0, ry = 0) => {
    const m = new THREE.Mesh(own(new THREE.PlaneGeometry(w, h)), mat); m.position.set(...p); m.rotation.set(rx, ry, 0); scene.add(m); return m;
  };
  plane(W, ceilingY - back.y, wallMat, [0, (ceilingY + back.y) / 2, back.z]);                                   // back wall
  plane(W, overhangFront - back.z, wallMat, [0, ceilingY, (overhangFront + back.z) / 2], Math.PI / 2);          // ceiling
  // Side walls (a quad from the floor edge up to the ceiling, following the slope).
  for (const sx of [-1, 1]) {
    const g = new THREE.BufferGeometry();
    const P = [[back.z, back.y], [front.z, front.y], [front.z, ceilingY], [back.z, ceilingY]].map(([z, y]) => [sx * halfW, y, z]);
    g.setAttribute("position", new THREE.Float32BufferAttribute([...P[0], ...P[1], ...P[2], ...P[0], ...P[2], ...P[3]], 3)); g.computeVertexNormals();
    scene.add(new THREE.Mesh(own(g), sideMat));
  }
  plane(W, front.y - apronBottom, wallMat, [0, (front.y + apronBottom) / 2, front.z]);                          // front apron (log ticker sits here)
  // Overhang block jutting forward over the niche.
  const over = new THREE.Mesh(own(extruded(roundedRect(W + 0.06, overhangTop - ceilingY, 0.08), overhangFront - back.z - 0.16, 0.08, 0.05, 4)), wallMat);
  over.position.set(0, (overhangTop + ceilingY) / 2, back.z); scene.add(over);
  // Gold trim: lip of the floor and the underside edge of the overhang.
  const trim = (len: number, p: [number, number, number]) => { const m = new THREE.Mesh(own(new THREE.CylinderGeometry(0.035, 0.035, len, 12)), goldMat); m.rotation.z = Math.PI / 2; m.position.set(...p); scene.add(m); };
  trim(W, [0, front.y + 0.02, front.z + 0.02]); trim(W, [0, ceilingY - 0.02, overhangFront + 0.06]);

  // Ceiling downlight strip under the overhang edge: warm line + a real area light onto the floor.
  const stripMat = own(new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff1dc").multiplyScalar(2.2), toneMapped: false }));
  const strip = new THREE.Mesh(own(new THREE.BoxGeometry(W - 0.3, 0.03, 0.08)), stripMat); strip.position.set(0, ceilingY - 0.04, overhangFront - 0.25); scene.add(strip);
  const down = new THREE.RectAreaLight("#fff0da", 9, W - 0.3, 0.3); down.position.set(0, ceilingY - 0.06, overhangFront - 0.25); down.lookAt(0, 0, 0.3); scene.add(down);

  const fill = new THREE.PointLight("#ffe6c4", 5, 7, 2); fill.position.set(0, 2.4, 2.2); scene.add(fill); // spill from the strip toward the front lip
  // ── Front lip: DESTINY WARS cut into the floor and filled with gold.
  const logo = engraveMaps("DESTINY WARS", 2.9 / 0.62, { base: "#12161d", fill: GOLD, font: `700 SIZEpx "Cinzel", "Trajan Pro", Georgia, serif`, widthFrac: 0.9, lines: true });
  const logoMat = own(new THREE.MeshPhysicalMaterial({ map: own(logo.map), normalMap: own(logo.normalMap), normalScale: new THREE.Vector2(1.2, 1.2), metalness: 0.8, roughness: 0.28, clearcoat: 0.5, emissive: "#3a2a10", emissiveMap: own(logo.map) }));
  const logoMesh = new THREE.Mesh(own(new THREE.PlaneGeometry(2.9, 0.62)), logoMat);
  const wallLogoY = back.y + 0.62; // low enough to clear the overhang edge from the camera, above the DRAW dome
  if (logoMode === "floor") { logoMesh.rotation.x = -Math.PI / 2; logoMesh.position.set(0, 0.004, floorEnd - 0.45); floorG.add(logoMesh); }
  else if (logoMode === "wallEngraved") { logoMesh.position.set(0, wallLogoY, back.z + 0.005); logoMesh.scale.setScalar(0.85); scene.add(logoMesh); }
  else { const raised = raisedText(own, "DESTINY WARS", 2.8, 0.5); raised.position.set(0, wallLogoY, back.z + 0.005); scene.add(raised); }

  // Chrome scoop tray across the front (like a slot machine coin tray): a bowl-shaped sheet that dips
  // and rolls over a rounded lip; its ends curl up so it reads as one pressed piece.
  if (variant.tray) {
    const prof = new THREE.CurvePath<THREE.Vector2>();
    const V = (z: number, y: number) => new THREE.Vector2(z, y);
    prof.add(new THREE.CubicBezierCurve(V(floorEnd, 0), V(floorEnd + 0.22, -0.5), V(floorFront - 0.38, -0.5), V(floorFront - 0.12, -0.02)));
    prof.add(new THREE.CubicBezierCurve(V(floorFront - 0.12, -0.02), V(floorFront - 0.06, 0.12), V(floorFront + 0.06, 0.12), V(floorFront + 0.06, -0.02)));
    prof.add(new THREE.LineCurve(V(floorFront + 0.06, -0.02), V(floorFront + 0.06, -0.7)));
    const pts = prof.getPoints(18), NX = 40, a = halfW - 0.05, pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= NX; i++) {
      const x = -a + (2 * a * i) / NX, curl = 1 - (Math.abs(x) / a) ** 10; // ends rise back to the floor
      for (const p of pts) pos.push(x, p.y < 0 && p.x < floorFront ? p.y * curl : p.y, p.x);
    }
    const n = pts.length;
    for (let i = 0; i < NX; i++) for (let j = 0; j < n - 1; j++) { const A = i * n + j, B = A + n; idx.push(A, B, A + 1, A + 1, B, B + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    floorG.add(new THREE.Mesh(own(g), own(new THREE.MeshPhysicalMaterial({ color: "#e6ebf2", metalness: 1, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide }))));
  }

  // ── AUTO toggle lever.
  const autoG = new THREE.Group(); autoG.position.set(-0.42, 0, floorFront - 1.45); floorG.add(autoG);
  const bezelMat = own(new THREE.MeshPhysicalMaterial({ color: "#3b4252", metalness: 1, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 }));
  const plate = new THREE.Mesh(own(extruded(roundedRect(2.0, 0.7, 0.2), 0.04, 0.05, 0.04, 4)), bezelMat);
  plate.rotation.x = -Math.PI / 2; autoG.add(plate);
  const autoText = engraveMaps([{ t: "AUTO", x: 0.2 }, { t: "OFF", x: 0.5 }, { t: "ON", x: 0.93 }], 1.8 / 0.5, { base: "#1a2029", fill: "#cfd6df", font: `800 SIZEpx "Segoe UI", Arial, sans-serif`, widthFrac: 0.94 });
  const autoFace = new THREE.Mesh(own(flatRect(1.8, 0.5, 0.12)), own(new THREE.MeshPhysicalMaterial({ map: own(autoText.map), normalMap: own(autoText.normalMap), metalness: 0.6, roughness: 0.35, clearcoat: 0.6 })));
  autoFace.rotation.x = -Math.PI / 2; autoFace.position.y = 0.141; autoG.add(autoFace);
  const slot = new THREE.Mesh(own(flatRect(0.5, 0.1, 0.05)), own(new THREE.MeshStandardMaterial({ color: "#020305", roughness: 0.9 })));
  slot.rotation.x = -Math.PI / 2; slot.position.set(0.38, 0.143, 0); autoG.add(slot);
  const lever = new THREE.Group(); lever.position.set(0.38, 0.14, 0); autoG.add(lever);
  const chrome = own(new THREE.MeshPhysicalMaterial({ color: "#d9dfe8", metalness: 1, roughness: 0.06, clearcoat: 1 }));
  const stick = new THREE.Mesh(own(new THREE.CylinderGeometry(0.028, 0.04, 0.5, 20)), chrome); stick.position.y = 0.25; lever.add(stick);
  const knobCoreMat = own(new THREE.MeshStandardMaterial({ color: "#11161e", roughness: 0.3, emissive: "#000000" }));
  const knobCore = new THREE.Mesh(own(new THREE.SphereGeometry(0.1, 32, 20)), knobCoreMat); knobCore.position.y = 0.55; lever.add(knobCore);
  const knobMat = clearPlastic(own, grain);
  const knob = new THREE.Mesh(own(new THREE.SphereGeometry(0.16, 40, 28)), knobMat); knob.position.y = 0.55; knob.renderOrder = 3; lever.add(knob);
  const knobLight = new THREE.PointLight("#ffffff", 0, 1.2, 2); knobLight.position.y = 0.55; lever.add(knobLight);

  // ── DRAW button on the floor (shared model with the lab button).
  const draw = buildDrawButton(own);
  draw.root.position.set(0, 0, floorBack + 1.85); floorG.add(draw.root);

  // ── DATA COUNTER: rectangular version of the DRAW button on the overhang's front face.
  const dataG = new THREE.Group(); dataG.position.set(0, (overhangTop + ceilingY) / 2 + 0.05, overhangFront + 0.02); dataG.rotation.x = -THREE.MathUtils.degToRad(8); scene.add(dataG);
  dataG.add(new THREE.Mesh(own(extruded(Object.assign(roundedRect(3.0, 1.62, 0.32), { holes: [roundedRect(2.62, 1.26, 0.2)] }), 0.08, 0.08, 0.06, 6)), bezelMat));
  const dWell = new THREE.Mesh(own(flatRect(2.66, 1.3, 0.2)), own(new THREE.MeshStandardMaterial({ color: "#05080f", roughness: 0.8 }))); dWell.position.z = 0.02; dataG.add(dWell);
  const dCap = new THREE.Group(); dataG.add(dCap);
  const dataFace = engraveMaps("DATA COUNTER", 2.1 / 0.82, { base: "#606b7d", fill: "#0b0d10", font: `900 SIZEpx "Arial Black", "Segoe UI", Arial, sans-serif`, widthFrac: 0.86, emissive: true, lines: true });
  const dCoreMat = own(new THREE.MeshPhysicalMaterial({ map: own(dataFace.map), emissiveMap: own(dataFace.emissiveMap!), normalMap: own(dataFace.normalMap), normalScale: new THREE.Vector2(1.3, 1.3), emissive: "#000000", roughness: 0.3, clearcoat: 0.5, envMapIntensity: 0.7 }));
  const dCore = new THREE.Mesh(own(flatRect(2.1, 0.82, 0.12)), dCoreMat); dCore.position.z = 0.2; dCap.add(dCore);
  const dRim = new THREE.Mesh(own(extruded(Object.assign(roundedRect(2.22, 0.94, 0.16), { holes: [roundedRect(2.1, 0.82, 0.12)] }), 0.12, 0.02, 0.02, 2)), chrome); dRim.position.z = 0.06; dCap.add(dRim);
  // LED ring between core and cover.
  const dLedMat = own(new THREE.MeshBasicMaterial({ color: "#000000", toneMapped: false }));
  const dHaloMat = own(new THREE.SpriteMaterial({ map: own(radialTexture([[0, "rgba(255,255,255,1)"], [0.12, "rgba(255,255,255,0.6)"], [0.4, "rgba(255,255,255,0.14)"], [1, "rgba(255,255,255,0)"]])), color: "#000000", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const ledPath = roundedRect(2.42, 1.12, 0.22).getSpacedPoints(26); ledPath.pop();
  const ledGeo = own(new THREE.SphereGeometry(0.026, 12, 10));
  for (const p of ledPath) {
    const led = new THREE.Mesh(ledGeo, dLedMat); led.position.set(p.x, p.y, 0.1); dCap.add(led);
    const halo = new THREE.Sprite(dHaloMat); halo.scale.setScalar(0.26); halo.position.set(p.x, p.y, 0.12); halo.renderOrder = 1; dCap.add(halo);
  }
  const dLights = [-0.8, 0, 0.8].map((x) => { const l = new THREE.PointLight("#ffffff", 0, 1.3, 2); l.position.set(x, 0, 0.3); dCap.add(l); return l; });
  const dCoverMat = clearPlastic(own, grain);
  const dCover = new THREE.Mesh(own(extruded(roundedRect(2.12, 0.86, 0.3), 0.05, 0.2, 0.2, 6)), dCoverMat); dCover.position.z = 0.02; dCover.renderOrder = 3; dCap.add(dCover);

  // Lit sign box variant (reference: the slot machine CHANCE lamp): replaces the push button visuals.
  let pressTarget: THREE.Object3D = dCap, dataHit: THREE.Object3D = dCover;
  let signMat: THREE.MeshStandardMaterial | null = null, signLight: THREE.PointLight | null = null;
  if (variant.sign) {
    for (const c of dataG.children) c.visible = false;
    const housing = new THREE.Mesh(own(extruded(roundedRect(3.0, 1.5, 0.2), 0.22, 0.07, 0.06, 5)), own(new THREE.MeshPhysicalMaterial({ color: "#0b0e13", metalness: 0.2, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.03 })));
    dataG.add(housing);
    const sCap = new THREE.Group(); sCap.position.z = 0.36; dataG.add(sCap);
    sCap.add(new THREE.Mesh(own(extruded(Object.assign(roundedRect(2.8, 1.3, 0.14), { holes: [roundedRect(2.44, 0.94, 0.06)] }), 0.04, 0.05, 0.04, 4)), own(new THREE.MeshPhysicalMaterial({ color: "#d4893a", metalness: 1, roughness: 0.22, clearcoat: 0.8 }))));
    const face = own(signTexture("DATA COUNTER"));
    signMat = own(new THREE.MeshStandardMaterial({ map: face, emissiveMap: face, emissive: "#000000", roughness: 0.5 }));
    const signFace = new THREE.Mesh(own(flatRect(2.44, 0.94, 0.06)), signMat); signFace.position.z = 0.04; sCap.add(signFace);
    const glass = new THREE.Mesh(own(flatRect(2.44, 0.94, 0.06)), clearPlastic(own, grain)); glass.position.z = 0.09; glass.renderOrder = 3; sCap.add(glass);
    signLight = new THREE.PointLight("#ffe2b8", 0, 3.5, 2); signLight.position.set(0, -0.4, 0.8); sCap.add(signLight);
    pressTarget = sCap; dataHit = housing;
  }

  // ── State & loop.
  let clock = 0, autoOn = false, autoT = 0, dataPressAt = -1, dataFlash = 0;
  const lit = new THREE.Color(), tmp = new THREE.Color(), WHITE = new THREE.Color("#ffffff"), dark = new THREE.Color("#1a2433");
  const dataLamp = new THREE.Color(LAMP.gray.color), dataPower = 0.5;
  const pressCurve = (t: number) => t < 70 ? 1 - (1 - t / 70) ** 2 : t < 115 ? 1 : t < 355 ? Math.cos(((t - 115) / 240) * Math.PI * 1.25) * (1 - (t - 115) / 240) ** 1.5 : 0;

  function step(dt: number) {
    clock += dt;
    draw.update(dt);
    // AUTO lever: eased throw between OFF (left) and ON (right) with a little overshoot.
    autoT += ((autoOn ? 1 : 0) - autoT) * (1 - Math.exp(-dt / 70));
    lever.rotation.z = THREE.MathUtils.degToRad(26) - autoT * THREE.MathUtils.degToRad(52);
    const autoGlow = 0.15 + autoT * 1.4;
    lit.set(autoOn ? LAMP.sky.color : LAMP.gray.color).multiplyScalar(autoGlow);
    knobCoreMat.emissive.copy(lit); knobMat.emissive.copy(lit).multiplyScalar(0.6);
    knobLight.color.set(autoOn ? LAMP.sky.color : LAMP.gray.color); knobLight.intensity = autoGlow * 0.8;
    // DATA COUNTER: steady gray lamp, flash + travel on press.
    dataFlash *= Math.exp(-dt / 160);
    let travel = 0;
    if (dataPressAt >= 0) { const t = clock - dataPressAt; travel = pressCurve(t); if (t > 355) dataPressAt = -1; }
    pressTarget.position.z = (pressTarget === dCap ? 0 : 0.36) - travel * 0.07;
    if (signMat && signLight) { const g = 1.05 + dataFlash * 0.9; signMat.emissive.setRGB(g, g * 0.96, g * 0.9); signLight.intensity = 2.2 * g; }
    const p = dataPower + dataFlash * 0.8;
    lit.copy(dataLamp).multiplyScalar(p);
    dCoreMat.emissive.copy(lit).multiplyScalar(0.35);
    dLedMat.color.copy(dark).multiplyScalar(0.6).lerp(tmp.copy(dataLamp).lerp(WHITE, 0.55), Math.min(1, p)).multiplyScalar(Math.max(1, p * 1.6));
    dHaloMat.color.copy(lit).multiplyScalar(0.55);
    dCoverMat.emissive.copy(lit);
    for (const l of dLights) { l.color.copy(dataLamp); l.intensity = p * 1.2; }
    renderer.render(scene, camera);
  }

  const v = new THREE.Vector3(), box = new THREE.Box3();
  const rectOf = (obj: THREE.Object3D, w: number, h: number): NicheRect => {
    box.setFromObject(obj);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (0.5 - v.y * 0.5) * h;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { left: Math.round(x0), top: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
  };
  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // Fit the whole niche width (with a hair of margin) whatever the panel's aspect.
    const needV = THREE.MathUtils.radToDeg(2 * Math.atan((halfW + 0.12) / dist / camera.aspect));
    camera.fov = Math.max(28, needV); camera.updateProjectionMatrix();
    scene.updateMatrixWorld(true);
    opts.onLayout?.({ draw: rectOf(draw.root.children[1], w, h), auto: rectOf(plate, w, h), data: rectOf(dataHit, w, h) });
  };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  const frame = (now: number) => {
    if (disposed) return;
    const dt = Math.min(50, now - last); last = now;
    if (!paused) step(dt);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    setDrawLamp: (s) => draw.setLamp(s),
    pressDraw: () => draw.press(),
    vibrate: (ms) => draw.vibrate(ms),
    setAuto: (on) => { autoOn = on; },
    pressData: () => { dataPressAt = clock; dataFlash = 1; },
    setPaused: (on) => { paused = on; },
    advance: (ms) => step(ms),
    dispose() {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      for (const d of disposables) d.dispose();
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
