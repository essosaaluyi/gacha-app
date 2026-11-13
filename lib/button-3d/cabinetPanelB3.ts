import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import {
  LAMP, buildDrawButton, drawBezelRadius, canvas, engraveMaps, extruded, flatRect, plasticNormalTexture,
  roundedRect, tex, type LampState,
} from "./runtime";

/**
 * B3 — the cabinet's upper-right control panel as one flat, front-facing module, built to the owner's
 * CGI brief (`outputs/cabinet-b3-modeling/B3-CGI-handoff.zip`, 2026-11-12): brass surround, lit
 * DATA COUNTER sign, AUTO slide knob, a black moulded V face with brass inlays carrying the DRAW
 * button, and a speaker grille at the foot.
 *
 * **Units are millimetres**, exactly as the brief's table, so every number below can be read against
 * it. The brief's Y runs down from the panel's top edge; `Y()` converts it to three.js' up axis.
 * Z = 0 is the front face of the brass rim and +Z points at the player.
 *
 * Purely visual: the panel's DOM buttons stay the hit areas, and `onLayout` reports where each
 * control landed (host pixels) so the caller can move them onto the 3D parts.
 */
export type PanelRect = { left: number; top: number; width: number; height: number };
/** `log` is the grille opening: the battle log ticker sits inside it (see the deviation note below). */
export type PanelB3Layout = { draw: PanelRect; auto: PanelRect; data: PanelRect; log: PanelRect };
export type CabinetPanelB3 = {
  setDrawLamp(state: LampState): void;
  pressDraw(): void;
  vibrate(durationMs?: number): void;
  setAuto(on: boolean): void;
  pressData(): void;
  setPaused(on: boolean): void;
  advance(ms: number): void;
  dispose(): void;
};
type Own = <T extends { dispose(): void }>(x: T) => T;

/** Outer shell (brief: 幅230 × 高さ520 × 奥行き78, 外周角R14, 真鍮外周 幅6). */
const PANEL = { w: 230, h: 520, depth: 78, r: 14, rim: 6 };
/** Brief Y (down from the top edge) → three.js Y (up from the panel centre). */
const Y = (down: number) => PANEL.h / 2 - down;
/** Every Z from the brief's table and the A–A section. */
const Z = {
  back: -58, rim: 0,
  dataWell: -5, dataFrame: 4, dataFace: 7,
  autoPlate: -4, autoKnob: 8,
  shoulder: -1, valley: -9, inlay: 1,
  drawSeat: -9,
  grilleFrame: -1, grilleMesh: -8,
};
/** Front-face placements, brief table order. */
const DATA = { y: Y(56), wellW: 198, wellH: 64, frameW: 174, frameH: 48 };
const AUTO = { y: Y(118), plateW: 198, plateH: 48, knobD: 18, offX: 12, onX: 52 };
const VEE = { top: Y(149), bottom: Y(407), topHalf: 99, bottomHalf: 40 };
const DRAW = { y: Y(274), bezelD: 154 };
const GRILLE = { y: Y(463), frameW: 198, frameH: 86, openW: 180, openH: 68 };
/** Right-hand brass inlay, brief points (X, Y) converted to three.js. Left is mirrored. */
const INLAY: [number, number][] = [[96, Y(236)], [96, Y(397)], [62, Y(397)], [76, Y(325)]];

/** The shared DRAW model's bezel is 1.48 units in radius; the brief asks for 154 mm across. */
const DRAW_SCALE = (DRAW.bezelD / 2) / 1.48;
/** Camera distance. Large enough that the panel reads nearly flat-on, as in the brief's FRONT view. */
const DIST = 1400;

const BRASS = "#b58b51";

/** Anisotropic brushed metal: one random slope per column (vertical) or row (horizontal). */
function hairlineNormal(dir: "v" | "h", strength = 0.5) {
  const W = 512, H = 512, { c, g } = canvas(W, H), img = g.createImageData(W, H);
  const n = new Float32Array(W);
  for (let i = 0; i < W; i++) n[i] = Math.random() * 2 - 1;
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < W - 1; i++) n[i] = (n[i - 1] + n[i] * 2 + n[i + 1]) / 4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = n[dir === "v" ? x : y] * strength;
    const nx = dir === "v" ? s : 0, ny = dir === "v" ? 0 : s, l = Math.hypot(nx, ny, 1), p = (y * W + x) * 4;
    img.data[p] = (nx / l * 0.5 + 0.5) * 255; img.data[p + 1] = (ny / l * 0.5 + 0.5) * 255;
    img.data[p + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, false);
}

/** Hexagonal speaker mesh: colour (dark metal with black holes) + a normal map of the same pattern. */
function meshMaps() {
  const W = 512, H = 256, col = canvas(W, H), hgt = canvas(W, H), step = 15;
  col.g.fillStyle = "#2a2f38"; col.g.fillRect(0, 0, W, H);
  hgt.g.fillStyle = "#fff"; hgt.g.fillRect(0, 0, W, H);
  for (let row = 0, y = 0; y < H + step; row++, y += step * 0.866) {
    for (let x = (row % 2) * step / 2; x < W + step; x += step) {
      col.g.fillStyle = "#04060a"; col.g.beginPath(); col.g.arc(x, y, 5.2, 0, Math.PI * 2); col.g.fill();
      hgt.g.fillStyle = "#000"; hgt.g.beginPath(); hgt.g.arc(x, y, 5.2, 0, Math.PI * 2); hgt.g.fill();
    }
  }
  const src = hgt.g.getImageData(0, 0, W, H).data, out = canvas(W, H), img = out.g.createImageData(W, H);
  const h = (x: number, y: number) => src[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = -(h(x + 1, y) - h(x - 1, y)) * 4, ny = (h(x, y + 1) - h(x, y - 1)) * 4, l = Math.hypot(nx, ny, 1), p = (y * W + x) * 4;
    img.data[p] = (nx / l * 0.5 + 0.5) * 255; img.data[p + 1] = (ny / l * 0.5 + 0.5) * 255;
    img.data[p + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[p + 3] = 255;
  }
  out.g.putImageData(img, 0, 0);
  const t = tex(col.c), n = tex(out.c, false);
  for (const x of [t, n]) { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(3, 1.2); }
  return { map: t, normalMap: n };
}

/**
 * The lit DATA COUNTER sign (brief B3: a cool-white light box with heavy black letters), drawn once
 * as a colour map that doubles as the emissive map.
 */
function dataSignTexture(aspect: number) {
  const W = 1024, H = Math.max(80, Math.round(W / aspect)), { c, g } = canvas(W, H);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.45, "#eef4fb"); bg.addColorStop(1, "#c6d4e4");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(20,40,70,0.22)"; g.lineWidth = 5; g.strokeRect(14, 14, W - 28, H - 28);
  let size = Math.round(H * 0.44);
  const font = (z: number) => `900 ${z}px "Arial Black", "Segoe UI", Arial, sans-serif`;
  g.font = font(size);
  while (g.measureText("DATA COUNTER").width > W * 0.84 && size > 20) { size -= 2; g.font = font(size); }
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#090c11";
  g.fillText("DATA COUNTER", W / 2, H * 0.54);
  return tex(c);
}

/** The V face: a trapezoid whose surface sinks to the valley at the centre and rises to the shoulders. */
function veeGeometry() {
  const NX = 48, NY = 24, pos: number[] = [], idx: number[] = [];
  for (let j = 0; j <= NY; j++) {
    const t = j / NY, y = THREE.MathUtils.lerp(VEE.top, VEE.bottom, t), half = THREE.MathUtils.lerp(VEE.topHalf, VEE.bottomHalf, t);
    for (let i = 0; i <= NX; i++) {
      const u = (i / NX) * 2 - 1;
      // cos() keeps the slope smooth at the shoulders and only creases at the very centre, which the
      // DRAW button covers anyway.
      pos.push(u * half, y, Z.shoulder + (Z.valley - Z.shoulder) * Math.cos(Math.abs(u) * Math.PI / 2));
    }
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + NX + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** A closed hole path through the given points, in the parent shape's own space. */
function pathFrom(points: [number, number][]) {
  const p = new THREE.Path();
  p.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) p.lineTo(x, y);
  p.closePath();
  return p;
}

function polygonShape(points: [number, number][]) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) s.lineTo(x, y);
  s.closePath();
  return s;
}

/** A rounded rectangle hole placed at (0, y) — ExtrudeGeometry holes are paths in the shape's space. */
function holeAt(w: number, h: number, r: number, y: number) {
  const p = new THREE.Path();
  const s = roundedRect(w, h, r), pts = s.getPoints(16);
  p.moveTo(pts[0].x, pts[0].y + y);
  for (const q of pts.slice(1)) p.lineTo(q.x, q.y + y);
  p.closePath();
  return p;
}

export function mountCabinetPanelB3(host: HTMLElement, opts: { onLayout?: (l: PanelB3Layout) => void } = {}): CabinetPanelB3 {
  const disposables: { dispose(): void }[] = [];
  const own: Own = (x) => { disposables.push(x); return x; };
  let disposed = false, raf = 0, last = performance.now(), paused = false;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  if (process.env.NODE_ENV !== "production") (window as unknown as { __panelB3Scene?: THREE.Scene }).__panelB3Scene = scene; // QA hook
  const camera = new THREE.PerspectiveCamera(22, 1, 10, 4000);
  camera.position.set(0, 0, DIST);

  // The panel is flat and faces the camera, so almost everything it shows is a reflection of whatever
  // is in FRONT of it. The shared presets are rooms seen from inside, with nothing bright on the
  // camera's side, which left the brass inlays and the V face reading as dead black. This is a small
  // softbox set instead: broad key front-upper-left, cool strip front-right, floor bounce, warm rim.
  const pmrem = own(new THREE.PMREMGenerator(renderer));
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: "#0d1218", side: THREE.BackSide })));
  for (const [color, scale, w, h, x, y, z] of [
    ["#ffffff", 7, 15, 11, -7, 7, 9], ["#dceaff", 2.6, 4, 15, 9, 2, 7],
    ["#ffffff", 1.7, 20, 6, 0, -8, 8], ["#ffe6c0", 1.4, 11, 11, 0, 9, -8],
  ] as [string, number, number, number, number, number, number][]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(scale), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); studio.add(m);
  }
  scene.environment = own(pmrem.fromScene(studio, 0.005)).texture;
  studio.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mat = m.material as THREE.MeshBasicMaterial | undefined; mat?.map?.dispose(); mat?.dispose(); });

  // Key from the upper left, as in the brief's renders, plus a soft box so the brass has a long
  // highlight down its length and a cool fill that keeps the black from going flat.
  RectAreaLightUniformsLib.init();
  const key = new THREE.DirectionalLight("#fff3e4", 1.7); key.position.set(-520, 700, 900); scene.add(key);
  const box = new THREE.RectAreaLight("#ffffff", 3.4, 420, 260);
  box.position.set(-190, 430, 620); box.lookAt(0, 0, 0); scene.add(box);
  const fill = new THREE.PointLight("#9fb6d8", 1.5, 2600, 2); fill.position.set(340, -220, 700); scene.add(fill);
  const under = new THREE.PointLight("#ffd9a8", 0.9, 1800, 2); under.position.set(-60, -420, 420); scene.add(under);

  // Everything hangs off `root`: resize() stretches it vertically by ~1 % so the 230 × 520 panel fills
  // the DOM box (270 × 618 px), whose aspect differs from the brief's by that much.
  const root = new THREE.Group(); scene.add(root);

  // ── Materials.
  const grain = own(plasticNormalTexture()); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(3, 6);
  const brassGrain = own(hairlineNormal("v", 0.5)); brassGrain.wrapS = brassGrain.wrapT = THREE.RepeatWrapping; brassGrain.repeat.set(1, 6);
  const brassMat = own(new THREE.MeshPhysicalMaterial({
    color: BRASS, metalness: 1, roughness: 0.27, clearcoat: 0.35, clearcoatRoughness: 0.2,
    normalMap: brassGrain, normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 1.25,
  }));
  // Piano black, the same family as the DRAW bezel so the module reads as one moulding.
  const bodyMat = own(new THREE.MeshPhysicalMaterial({
    color: "#0b0e13", metalness: 0.25, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06,
    normalMap: grain, normalScale: new THREE.Vector2(0.12, 0.12),
  }));
  // "鏡面に寄せすぎず、斜めから細い反射が走る程度" — enough metal for a thin streak, not a mirror.
  const veeMat = own(new THREE.MeshPhysicalMaterial({
    color: "#0a0d12", metalness: 0.4, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.08,
    normalMap: grain, normalScale: new THREE.Vector2(0.1, 0.1), side: THREE.DoubleSide,
  }));
  const chromeMat = own(new THREE.MeshPhysicalMaterial({ color: "#dfe5ee", metalness: 1, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }));
  const voidMat = own(new THREE.MeshStandardMaterial({ color: "#04060a", roughness: 0.92 }));

  // ── Brass surround: one piece wrapping the full 78 mm depth, as in the LEFT/RIGHT views.
  const rimShape = roundedRect(PANEL.w, PANEL.h, PANEL.r);
  rimShape.holes.push(holeAt(PANEL.w - PANEL.rim * 2, PANEL.h - PANEL.rim * 2, PANEL.r - PANEL.rim, 0));
  const rim = new THREE.Mesh(own(extruded(rimShape, PANEL.depth - 4, 1.6, 1.2, 3)), brassMat);
  rim.position.z = Z.rim - (PANEL.depth - 0.8); root.add(rim);

  // ── Body block and its front plate. The plate is cut away wherever a recessed part sits, which
  //    leaves exactly the thin black margins the reference shows between the brass and the controls.
  const inner = { w: PANEL.w - PANEL.rim * 2, h: PANEL.h - PANEL.rim * 2, r: PANEL.r - PANEL.rim };
  const block = new THREE.Mesh(own(extruded(roundedRect(inner.w, inner.h, inner.r), 44, 0.8, 0.8, 2)), bodyMat);
  block.position.z = Z.back; root.add(block);

  const plateShape = roundedRect(inner.w, inner.h, inner.r);
  plateShape.holes.push(holeAt(DATA.wellW, DATA.wellH, 8, DATA.y));
  plateShape.holes.push(holeAt(AUTO.plateW, AUTO.plateH, 7, AUTO.y));
  plateShape.holes.push(holeAt(GRILLE.frameW, GRILLE.frameH, 6, GRILLE.y));
  plateShape.holes.push(pathFrom([
    [-VEE.topHalf, VEE.top], [VEE.topHalf, VEE.top], [VEE.bottomHalf, VEE.bottom], [-VEE.bottomHalf, VEE.bottom],
  ]));
  const plate = new THREE.Mesh(own(extruded(plateShape, 5, 0.6, 0.5, 2)), bodyMat);
  plate.position.z = Z.shoulder - 6.2; root.add(plate);

  // ── Back plate with its four countersunk screws (brief: matt black, Z −58).
  const backMat = own(new THREE.MeshStandardMaterial({ color: "#0a0c10", roughness: 0.78, metalness: 0.1 }));
  const backPlate = new THREE.Mesh(own(extruded(roundedRect(inner.w + 2, inner.h + 2, inner.r), 3, 0.6, 0.5, 2)), backMat);
  backPlate.position.z = Z.back - 3; root.add(backPlate);
  const screwGeo = own(new THREE.CylinderGeometry(5, 5, 1.4, 20));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const s = new THREE.Mesh(screwGeo, chromeMat);
    s.rotation.x = Math.PI / 2; s.position.set(sx * (inner.w / 2 - 16), sy * (inner.h / 2 - 16), Z.back - 3.6);
    root.add(s);
  }

  // ── Black V face and the two brass inlays that flank it.
  const vee = new THREE.Mesh(own(veeGeometry()), veeMat); root.add(vee);
  for (const sx of [1, -1]) {
    const pts = INLAY.map(([x, y]) => [sx * x, y] as [number, number]);
    const inlay = new THREE.Mesh(own(extruded(polygonShape(sx === 1 ? pts : [...pts].reverse()), 1.6, 0.5, 0.4, 2)), brassMat);
    inlay.position.z = Z.inlay - 2.6; root.add(inlay);
  }

  // ── DATA COUNTER: recessed well, chrome surround and the lit sign face, the whole cap pressing in.
  const dataWell = new THREE.Mesh(own(flatRect(DATA.wellW - 2, DATA.wellH - 2, 7)), voidMat);
  dataWell.position.set(0, DATA.y, Z.dataWell); root.add(dataWell);
  const dataCap = new THREE.Group(); dataCap.position.set(0, DATA.y, 0); root.add(dataCap);
  const dataFrameShape = roundedRect(DATA.frameW, DATA.frameH, 10);
  dataFrameShape.holes.push(holeAt(DATA.frameW - 16, DATA.frameH - 16, 6, 0));
  const dataFrame = new THREE.Mesh(own(extruded(dataFrameShape, 7, 1.2, 1, 3)), chromeMat);
  dataFrame.position.z = Z.dataFrame - 9.4; dataCap.add(dataFrame);
  const signTex = own(dataSignTexture((DATA.frameW - 16) / (DATA.frameH - 16)));
  const signMat = own(new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: "#000000", roughness: 0.42, metalness: 0 }));
  const sign = new THREE.Mesh(own(flatRect(DATA.frameW - 16, DATA.frameH - 16, 6)), signMat);
  sign.position.z = Z.dataFace; dataCap.add(sign);
  const signLight = new THREE.PointLight("#dfe9ff", 0, 180, 2); signLight.position.set(0, -14, 40); dataCap.add(signLight);

  // ── AUTO: engraved plate with a chrome knob sliding between the OFF and ON legends.
  const autoG = new THREE.Group(); autoG.position.set(0, AUTO.y, 0); root.add(autoG);
  // x fractions put AUTO and OFF left of the knob's travel (12 → 52 mm) and ON clear to its right.
  const autoText = engraveMaps(
    [{ t: "AUTO", x: 0.18 }, { t: "OFF", x: 0.42 }, { t: "ON", x: 0.88 }],
    AUTO.plateW / AUTO.plateH,
    { base: "#12161d", fill: "#cfd6df", font: `800 SIZEpx "Segoe UI", Arial, sans-serif`, widthFrac: 0.94, heightFrac: 0.26 },
  );
  const autoMat = own(new THREE.MeshPhysicalMaterial({
    map: own(autoText.map), normalMap: own(autoText.normalMap), normalScale: new THREE.Vector2(1.1, 1.1),
    metalness: 0.5, roughness: 0.34, clearcoat: 0.6,
  }));
  const autoPlate = new THREE.Mesh(own(flatRect(AUTO.plateW - 2, AUTO.plateH - 2, 6)), autoMat);
  autoPlate.position.z = Z.autoPlate; autoG.add(autoPlate);
  const slot = new THREE.Mesh(own(flatRect(AUTO.onX - AUTO.offX + AUTO.knobD + 6, AUTO.knobD - 2, 7)), voidMat);
  slot.position.set((AUTO.offX + AUTO.onX) / 2, 0, Z.autoPlate + 0.3); autoG.add(slot);
  const knob = new THREE.Group(); knob.position.z = Z.autoKnob; autoG.add(knob);
  const knobCoreMat = own(new THREE.MeshStandardMaterial({ color: "#11161e", roughness: 0.3, emissive: "#000000" }));
  knob.add(new THREE.Mesh(own(new THREE.SphereGeometry(AUTO.knobD / 2 - 2.5, 28, 20)), knobCoreMat));
  const knobShellMat = own(new THREE.MeshPhysicalMaterial({
    color: "#cfd7e2", metalness: 1, roughness: 0.07, clearcoat: 1, emissive: "#000000", transparent: true,
    opacity: 0.82, depthWrite: false,
  }));
  knob.add(new THREE.Mesh(own(new THREE.SphereGeometry(AUTO.knobD / 2, 32, 22)), knobShellMat));
  const knobLight = new THREE.PointLight("#ffffff", 0, 90, 2); knob.add(knobLight);

  // ── DRAW: the shared button model, laid on its back so it faces the player, standing on a dark seat
  //    disc that hides where the bezel foot overhangs the V face's sloping edges.
  //    Owner request 2026-11-14: tilted face-up by DRAW_TILT_DEG. Seen dead-on, the press travelled straight
  //    along the line of sight and was invisible; tilted, the cap's sideways drop reads. The mount is pushed
  //    out so the top edge stays on the face, and a short dark plinth fills the wedge under the lower edge.
  //    Owner 2026-11-14 (2nd): 15° and the black bezel ring at half its width (cap size unchanged).
  const DRAW_TILT_DEG = 15, DRAW_BEZEL_WIDTH = 0.5;
  const drawR = drawBezelRadius(DRAW_BEZEL_WIDTH) * DRAW_SCALE + 3, tilt = THREE.MathUtils.degToRad(DRAW_TILT_DEG);
  const drawMount = new THREE.Group();
  drawMount.position.set(0, DRAW.y, Z.drawSeat + drawR * Math.sin(tilt)); drawMount.rotation.x = -tilt; root.add(drawMount);
  const seat = new THREE.Mesh(own(new THREE.CircleGeometry(drawR, 72)), voidMat);
  seat.position.z = -0.4; drawMount.add(seat);
  const plinthDepth = 2 * drawR * Math.sin(tilt) + 4;
  const plinth = new THREE.Mesh(own(new THREE.CylinderGeometry(drawR, drawR, plinthDepth, 72, 1, true)), voidMat);
  plinth.rotation.x = Math.PI / 2; plinth.position.z = -0.4 - plinthDepth / 2; drawMount.add(plinth);
  const draw = buildDrawButton(own, { bezelWidth: DRAW_BEZEL_WIDTH });
  draw.root.rotation.x = Math.PI / 2;            // the model's +Y (button axis) becomes +Z
  draw.root.scale.setScalar(DRAW_SCALE);
  drawMount.add(draw.root);
  // Tilted up, the two clear covers caught a broad white highlight right over "DR" (it came from their
  // specular + clearcoat layers; hiding any single light did not remove it). On this panel the covers keep
  // only their lamp haze and sheen, so the lettering under them stays readable.
  draw.root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;
    if (m?.isMeshPhysicalMaterial && m.blending === THREE.AdditiveBlending) { m.specularIntensity = 0; m.clearcoat = 0.1; }
  });
  // A three.js point light ignores its parent's scale: `distance` and `intensity` are world-space. At
  // 52× the button's own lamps would light a 1 mm bubble, so the reach is scaled once here and the
  // brightness after every update (the button rewrites intensity from its lamp state each frame).
  const drawLamps: THREE.PointLight[] = [];
  draw.root.traverse((o) => {
    const l = o as THREE.PointLight;
    if (l.isPointLight) { l.distance *= DRAW_SCALE; drawLamps.push(l); }
  });
  // Scale² is the physically exact gain, but this panel's room is brighter than the niche the button
  // was tuned in, and at full gain the core face blew out white and swallowed the "DRAW" lettering.
  const DRAW_LAMP_GAIN = DRAW_SCALE * DRAW_SCALE * 0.35;

  // ── Grille: frame, hex mesh and the dark space behind it, so nothing bright shows through.
  const grilleFrameShape = roundedRect(GRILLE.frameW, GRILLE.frameH, 6);
  grilleFrameShape.holes.push(holeAt(GRILLE.openW, GRILLE.openH, 4, 0));
  const grilleFrame = new THREE.Mesh(own(extruded(grilleFrameShape, 6, 0.8, 0.6, 2)), bodyMat);
  grilleFrame.position.set(0, GRILLE.y, Z.grilleFrame - 7.6); root.add(grilleFrame);
  const mm = meshMaps();
  const meshMat = own(new THREE.MeshStandardMaterial({
    map: own(mm.map), normalMap: own(mm.normalMap), normalScale: new THREE.Vector2(1.4, 1.4),
    metalness: 0.65, roughness: 0.5,
  }));
  const grilleMesh = new THREE.Mesh(own(flatRect(GRILLE.openW, GRILLE.openH, 4)), meshMat);
  grilleMesh.position.set(0, GRILLE.y, Z.grilleMesh); root.add(grilleMesh);
  const grilleVoid = new THREE.Mesh(own(flatRect(GRILLE.openW, GRILLE.openH, 4)), voidMat);
  grilleVoid.position.set(0, GRILLE.y, Z.grilleMesh - 9); root.add(grilleVoid);

  // ── State & loop.
  let clock = 0, autoOn = false, autoT = 0, dataPressAt = -1, dataFlash = 0;
  const lit = new THREE.Color();
  const pressCurve = (t: number) => t < 70 ? 1 - (1 - t / 70) ** 2 : t < 115 ? 1 : t < 355 ? Math.cos(((t - 115) / 240) * Math.PI * 1.25) * (1 - (t - 115) / 240) ** 1.5 : 0;

  function step(dt: number) {
    clock += dt;
    draw.update(dt);
    for (const l of drawLamps) l.intensity *= DRAW_LAMP_GAIN;
    // AUTO: the knob slides between the OFF and ON legends with a touch of overshoot.
    autoT += ((autoOn ? 1 : 0) - autoT) * (1 - Math.exp(-dt / 70));
    knob.position.x = THREE.MathUtils.lerp(AUTO.offX, AUTO.onX, autoT);
    const autoGlow = 0.15 + autoT * 1.4;
    lit.set(autoOn ? LAMP.sky.color : LAMP.gray.color).multiplyScalar(autoGlow);
    knobCoreMat.emissive.copy(lit); knobShellMat.emissive.copy(lit).multiplyScalar(0.5);
    knobLight.color.set(autoOn ? LAMP.sky.color : LAMP.gray.color); knobLight.intensity = autoGlow * 22;
    // DATA COUNTER: steadily lit, brighter for 160 ms on a press, and the cap travels 2 mm.
    dataFlash *= Math.exp(-dt / 160);
    let travel = 0;
    if (dataPressAt >= 0) { const t = clock - dataPressAt; travel = pressCurve(t); if (t > 355) dataPressAt = -1; }
    dataCap.position.z = -travel * 2;
    const g = 1 + dataFlash * 0.85;
    signMat.emissive.setRGB(g * 0.92, g * 0.95, g);
    signLight.intensity = 14 * g;
    renderer.render(scene, camera);
  }

  const v = new THREE.Vector3(), bounds = new THREE.Box3();
  const rectOf = (obj: THREE.Object3D, w: number, h: number): PanelRect => {
    bounds.setFromObject(obj);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y, i & 4 ? bounds.max.z : bounds.min.z).project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (0.5 - v.y * 0.5) * h;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { left: Math.round(x0), top: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
  };
  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // Fit the panel's width exactly; the leftover height (~1 %) is taken up by stretching the model,
    // which is invisible and keeps every control aligned with its DOM hit area.
    const vHalf = Math.atan(Math.tan(Math.atan((PANEL.w / 2) / DIST)) / camera.aspect);
    camera.fov = THREE.MathUtils.radToDeg(2 * vHalf); camera.updateProjectionMatrix();
    root.scale.y = (2 * DIST * Math.tan(vHalf)) / PANEL.h;
    scene.updateMatrixWorld(true);
    opts.onLayout?.({
      draw: rectOf(draw.root.children[1], w, h),
      auto: rectOf(autoPlate, w, h),
      data: rectOf(dataFrame, w, h),
      log: rectOf(grilleMesh, w, h),
    });
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
