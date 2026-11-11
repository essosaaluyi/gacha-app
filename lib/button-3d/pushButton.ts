import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { playSfx } from "@/lib/audio/sfxStore";
import { canvas, tex, radialTexture, type DrawButton3D, type DrawButton3DOptions, type LampState } from "./runtime";

/**
 * Pachinko-style PUSH button (owner reference, 2026-11-11), built in three.js:
 *   chrome shield bezel with an X-waisted tail and a small triangle lamp →
 *   a shield-shaped light-guide floor (edge-lit ribbed stripes, V chevrons, "DRAW" cut in black) →
 *   a faceted crystal core → a faceted clear plastic cover.
 * Same API as the round button (mountDrawButton3D): lamp gray → sky → off, press(), vibrate().
 */

const LAMP: Record<LampState, { color: string; power: number }> = {
  gray: { color: "#d6daf2", power: 0.32 },
  sky: { color: "#2fbfff", power: 1.5 },
  off: { color: "#000000", power: 0 },
};
const PRESS = { depth: 0.08, downMs: 70, holdMs: 45, upMs: 240 };
/** Half-size of the square the floor texture covers, in shape units. */
const R = 1.25;

/** Shield outline (shape plane: +y = away from the player, the point faces the player). */
function shieldPoints(scale = 1, perCurve = 18) {
  const s = new THREE.Shape();
  s.moveTo(0, -1.0);
  s.bezierCurveTo(0.36, -0.86, 1.05, -0.26, 1.08, 0.42);
  s.quadraticCurveTo(1.1, 0.78, 0.78, 0.84);
  s.quadraticCurveTo(0, 0.98, -0.78, 0.84);
  s.quadraticCurveTo(-1.1, 0.78, -1.08, 0.42);
  s.bezierCurveTo(-1.05, -0.26, -0.36, -0.86, 0, -1.0);
  const pts = s.getPoints(perCurve);
  if (pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
  return { shape: s, points: pts.map((p) => p.clone().multiplyScalar(scale)) };
}
const shapeOf = (pts: THREE.Vector2[], holes: THREE.Vector2[][] = []) => {
  const s = new THREE.Shape(pts);
  for (const h of holes) s.holes.push(new THREE.Path(h));
  return s;
};
/** ExtrudeGeometry is faceted (normals per triangle); weld it for smooth metal. */
function smooth(g: THREE.BufferGeometry) {
  g.deleteAttribute("normal"); g.deleteAttribute("uv");
  const m = mergeVertices(g, 1e-4); m.computeVertexNormals(); g.dispose();
  return m;
}
/** Plane geometry of a shape lying flat (shape y → world −z) with UVs over the ±r square. */
function flatShape(pts: THREE.Vector2[], r: number) {
  const g = new THREE.ShapeGeometry(shapeOf(pts));
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (2 * r) + 0.5, pos.getY(i) / (2 * r) + 0.5);
  g.rotateX(-Math.PI / 2);
  return g;
}
/** Extruded shape standing up (+y), bottom of the bevel at y = 0. */
function standing(shape: THREE.Shape, depth: number, bevel: number, size: number, segments: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: size, bevelSegments: segments, curveSegments: 18 });
  g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
  return g;
}

/**
 * Light-guide floor maps for a closed outline: ribbed stripes parallel to the edge (brightest at the
 * edge, where the LEDs feed the acrylic), nested V chevrons, and an optional label cut in black.
 */
function lightGuideMaps(points: THREE.Vector2[], r: number, opts: { label?: string; chevrons?: boolean } = {}) {
  const S = 1024;
  const P = (x: number, y: number): [number, number] => [(x / (2 * r) + 0.5) * S, (0.5 - y / (2 * r)) * S];
  const path = (g: CanvasRenderingContext2D, s: number) => {
    g.beginPath(); points.forEach((p, i) => { const [x, y] = P(p.x * s, p.y * s); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath();
  };
  const draw = (g: CanvasRenderingContext2D, emissive: boolean) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
    path(g, 1); g.fillStyle = emissive ? "rgb(18,18,18)" : "#3a3c52"; g.fill();
    g.save(); path(g, 1); g.clip();
    for (let k = 0; k < 30; k++) { // ribbed light-guide stripes
      const f = (1 - k / 30) ** 1.6, b = emissive ? 255 * f * (k % 2 ? 0.5 : 1) : 120 + 90 * f * (k % 2 ? 0.4 : 1);
      g.strokeStyle = `rgb(${b},${b},${emissive ? b : b + 18})`; g.lineWidth = 3.2; path(g, 1 - k * 0.011); g.stroke();
    }
    if (opts.chevrons) {
      for (let j = 0; j < 6; j++) { // nested V prisms converging toward the point
        const b = emissive ? 150 - j * 16 : 150 - j * 8;
        g.strokeStyle = `rgb(${b},${b},${emissive ? b : b + 20})`; g.lineWidth = 5 - j * 0.5; g.beginPath();
        g.moveTo(...P(-0.72 + j * 0.1, 0.62 - j * 0.02)); g.lineTo(...P(0, -0.62 + j * 0.13)); g.lineTo(...P(0.72 - j * 0.1, 0.62 - j * 0.02)); g.stroke();
      }
    }
    g.restore();
    if (opts.label) {
      const [cx, cy] = P(0, 0.12);
      let size = 230; const font = (z: number) => `italic 900 ${z}px "Arial Black", "Segoe UI", Arial, sans-serif`;
      g.font = font(size);
      while (g.measureText(opts.label).width > S * 0.56 && size > 40) { size -= 6; g.font = font(size); }
      g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      // Cut into the acrylic: the cut walls catch the edge light (bright outline), the cut itself is black ink.
      g.strokeStyle = emissive ? "rgb(255,255,255)" : "#e8ecff"; g.lineWidth = 7; g.strokeText(opts.label, cx, cy);
      g.fillStyle = "#000"; g.fillText(opts.label, cx, cy + 2);
    }
  };
  const col = canvas(S, S), emi = canvas(S, S);
  draw(col.g, false); draw(emi.g, true);
  return { map: tex(col.c), emissiveMap: tex(emi.c, false) };
}

/** Cut-crystal core: a fan of flat facets to an apex inside a zig-zag faceted band. */
function crystalGeometry(shape: THREE.Shape, n: number, outer: number, inner: number, y0: number, y1: number, apex: THREE.Vector3) {
  const ring = shape.getSpacedPoints(n * 2); // even = outer ring, odd = inner ring (half-step offset → zig-zag)
  const o = (i: number) => { const p = ring[(i * 2) % (n * 2)]; return new THREE.Vector3(p.x * outer, y0, -p.y * outer); };
  const q = (i: number) => { const p = ring[(i * 2 + 1) % (n * 2)]; return new THREE.Vector3(p.x * inner, y1, -p.y * inner); };
  const v: number[] = []; const tri = (...ps: THREE.Vector3[]) => ps.forEach((p) => v.push(p.x, p.y, p.z));
  for (let i = 0; i < n; i++) {
    tri(o(i), o(i + 1), q(i)); tri(q(i), o(i + 1), q(i + 1)); // band
    tri(q(i), q(i + 1), apex); // fan to the apex
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  return g;
}

export function mountPushButton3D(host: HTMLElement, options: DrawButton3DOptions = {}): DrawButton3D {
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
  const elevation = THREE.MathUtils.degToRad(50), distance = 8.4, focus = new THREE.Vector3(0, 0.2, 0.42);
  camera.position.set(0, focus.y + Math.sin(elevation) * distance, focus.z + Math.cos(elevation) * distance);
  camera.lookAt(focus);

  // Studio env: hard strip lights → crisp chrome reflections, like the showroom photos.
  const pmrem = own(new THREE.PMREMGenerator(renderer));
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: "#0d121c", side: THREE.BackSide })));
  const soft = radialTexture([[0, "rgba(255,255,255,1)"], [0.45, "rgba(255,255,255,0.85)"], [1, "rgba(255,255,255,0)"]]);
  const panel = (color: string, scale: number, w: number, h: number, p: [number, number, number], blurred = false) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: blurred ? soft : null, transparent: blurred, depthWrite: false, color: new THREE.Color(color).multiplyScalar(scale), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); studio.add(m);
  };
  panel("#ffffff", 1.4, 18, 10, [-2, 7, -12], true);
  panel("#ffffff", 7, 14, 0.6, [0, 8, -10]);
  panel("#ffffff", 6, 0.6, 14, [-9, 6, 0]);
  panel("#cfe6ff", 6, 0.6, 14, [9, 6, 0]);
  panel("#ffffff", 4, 18, 0.5, [0, 3, 12]);
  panel("#e6d9ff", 3, 0.5, 10, [-6, 4, 9]);
  panel("#ffffff", 2.2, 22, 8, [0, -6, 6], true);
  panel("#ffffff", 2, 8, 8, [0, 10, 4], true); // broad overhead fill so the chrome reads silver // warm floor bounce so the chrome never goes fully black
  const envRT = own(pmrem.fromScene(studio, 0.004));
  scene.environment = envRT.texture;
  studio.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });
  soft.dispose();
  const key = new THREE.DirectionalLight("#fff4ea", 1.2); key.position.set(-5, 8, -2); scene.add(key);

  const shadowTex = own(radialTexture([[0, "rgba(0,0,0,0.85)"], [0.55, "rgba(0,0,0,0.5)"], [1, "rgba(0,0,0,0)"]]));
  const shadow = new THREE.Mesh(own(new THREE.PlaneGeometry(3.4, 4.6)), own(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.003, 0.5); scene.add(shadow);
  const rig = new THREE.Group(); scene.add(rig);

  // ── Fixed housing: mirror-chrome shield bezel, satin "sparkle" chrome tail with a centre seam.
  const { shape: shield, points: unit } = shieldPoints();
  const scaled = (s: number) => unit.map((p) => p.clone().multiplyScalar(s));
  const chromeMat = own(new THREE.MeshPhysicalMaterial({ color: "#e4e9f2", metalness: 1, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }));
    const satinMat = own(new THREE.MeshPhysicalMaterial({ color: "#9aa1ad", metalness: 1, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.08 }));
  const bezel = new THREE.Mesh(own(smooth(standing(shapeOf(scaled(1.2), [scaled(1.1).reverse()]), 0.1, 0.09, 0.06, 6))), chromeMat);
  rig.add(bezel);
  const well = new THREE.Mesh(own(flatShape(scaled(1.12), R)), own(new THREE.MeshStandardMaterial({ color: "#05070d", roughness: 0.8 })));
  well.position.y = 0.02; rig.add(well);

  // Tail: X-waisted toward the player, flaring out to hold the small triangle lamp.
  const tail = new THREE.Shape();
  tail.moveTo(-0.66, -0.5); tail.quadraticCurveTo(-0.1, -1.35, -0.52, -2.02); tail.quadraticCurveTo(0, -2.1, 0.52, -2.02);
  tail.quadraticCurveTo(0.1, -1.35, 0.66, -0.5); tail.lineTo(0, -0.3); tail.closePath();
  rig.add(new THREE.Mesh(own(smooth(standing(tail, 0.06, 0.07, 0.05, 5))), satinMat));
  const seam = new THREE.Mesh(own(new THREE.BoxGeometry(0.008, 0.004, 0.62)), own(new THREE.MeshStandardMaterial({ color: "#11151c", roughness: 0.6 })));
  seam.position.set(0, 0.201, 1.33); rig.add(seam);
  const triPts = [new THREE.Vector2(0, -1.62), new THREE.Vector2(0.3, -1.98), new THREE.Vector2(-0.3, -1.98)];
  const triCenter = new THREE.Vector2(0, -1.86);
  const triLocal = triPts.map((p) => p.clone().sub(triCenter));
  const triMaps = lightGuideMaps(triLocal, 0.3);
  const triFloorMat = own(new THREE.MeshStandardMaterial({ map: own(triMaps.map), emissiveMap: own(triMaps.emissiveMap), emissive: "#000000", roughness: 0.4 }));
  const triFloor = new THREE.Mesh(own(flatShape(triLocal, 0.3)), triFloorMat);
  triFloor.position.set(triCenter.x, 0.202, -triCenter.y); rig.add(triFloor);

  // Clear plastic: additive reflection layer (black base, crisp clearcoat, milky lavender body, lamp haze),
  // so the light-guide floor and the crystal under it stay visible.
  const clearMat = (haze: number, flat: boolean) => own(new THREE.MeshPhysicalMaterial({
    color: "#1d1a2e", metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 1.6,
    sheen: 0.5, sheenRoughness: 0.3, sheenColor: new THREE.Color("#a9a2d6"), flatShading: flat,
    emissive: "#000000", emissiveIntensity: haze, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  const triCoverMat = clearMat(0.25, true);
  const triShrunk = triLocal.map((p) => p.clone().multiplyScalar(0.72));
  const triCover = new THREE.Mesh(own(standing(shapeOf(triShrunk), 0.02, 0.06, 0.06, 2)), triCoverMat);
  triCover.position.set(triCenter.x, 0.2, -triCenter.y); triCover.renderOrder = 3; rig.add(triCover);

  // ── Moving cap: floor + crystal + cover.
  const cap = new THREE.Group(); rig.add(cap);
  const floorMaps = lightGuideMaps(unit, R, { label: options.label ?? "DRAW", chevrons: true });
  const floorMat = own(new THREE.MeshStandardMaterial({ map: own(floorMaps.map), emissiveMap: own(floorMaps.emissiveMap), emissive: "#000000", roughness: 0.35, metalness: 0.2 }));
  const floor = new THREE.Mesh(own(flatShape(scaled(0.98), R * 0.98)), floorMat);
  floor.position.y = 0.11; cap.add(floor);
  const crystalMat = clearMat(0.05, true);
  const crystal = new THREE.Mesh(own(crystalGeometry(shield, 26, 0.92, 0.62, 0.13, 0.3, new THREE.Vector3(0, 0.36, 0.42))), crystalMat);
  crystal.renderOrder = 2; cap.add(crystal);
  const coverMat = clearMat(0.07, true);
  const cover = new THREE.Mesh(own(standing(shapeOf(scaled(0.62)), 0.06, 0.24, 0.34, 6)), coverMat);
  cover.position.y = 0.1; cover.renderOrder = 3; cap.add(cover);
  // The LEDs that feed the light guide: their light also falls on the chrome around the cover.
  const ledLights = [[0, -0.55], [0.6, 0.05], [-0.6, 0.05], [0, 0.6]].map(([x, z]) => {
    const l = new THREE.PointLight("#ffffff", 0, 1.8, 2); l.position.set(x, 0.32, z); cap.add(l); return l;
  });

  // ── Lamp state (eased) ──────────────────────────────────────────────
  let target: LampState = "gray";
  const lampColor = new THREE.Color(LAMP.gray.color); let lampPower = LAMP.gray.power;
  let flash = 0, hover = 0, hovering = false, pressAt = -1, vibAt = -1, vibMs = 0, vibPulse = 0;
  const lit = new THREE.Color(), tmp = new THREE.Color();

  function applyLamp() {
    const p = lampPower * (1 + 0.18 * hover + vibPulse) + flash * (lampPower > 0.05 ? 0.9 : 0);
    lit.copy(lampColor).multiplyScalar(p);
    floorMat.emissive.copy(lit).multiplyScalar(0.34); triFloorMat.emissive.copy(lit);
    coverMat.emissive.copy(lit); crystalMat.emissive.copy(lit); triCoverMat.emissive.copy(lit);
    for (const l of ledLights) { l.color.copy(lampColor); l.intensity = p * 1.3; }
  }

  // ── Interaction ─────────────────────────────────────────────────────
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects([cover, floor], false).length > 0;
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
  function step(dt: number) {
    clock += dt;
    const k = 1 - Math.exp(-dt / 110);
    if (target !== "off") lampColor.lerp(tmp.set(LAMP[target].color), k);
    lampPower += (LAMP[target].power - lampPower) * k;
    flash *= Math.exp(-dt / 160);
    hover += ((hovering ? 1 : 0) - hover) * (1 - Math.exp(-dt / 90));
    let travel = 0;
    if (pressAt >= 0) {
      const t = clock - pressAt;
      if (t < PRESS.downMs) travel = 1 - (1 - t / PRESS.downMs) ** 2;
      else if (t < PRESS.downMs + PRESS.holdMs) travel = 1;
      else if (t < PRESS.downMs + PRESS.holdMs + PRESS.upMs) {
        const u = (t - PRESS.downMs - PRESS.holdMs) / PRESS.upMs;
        travel = Math.cos(u * Math.PI * 1.25) * (1 - u) ** 1.5;
      } else pressAt = -1;
    }
    cap.position.set(0, -travel * PRESS.depth, 0); cap.rotation.set(0, 0, 0); vibPulse = 0;
    if (vibAt >= 0) { // win rattle of the cover only; the chrome housing stays still
      const t = clock - vibAt, u = t / vibMs;
      if (u >= 1) vibAt = -1;
      else {
        const s = t / 1000, attack = Math.min(1, t / 40), tailK = u > 0.75 ? ((1 - u) / 0.25) ** 1.5 : 1;
        const burst = 0.55 + 0.45 * Math.max(0, Math.sin(2 * Math.PI * 7 * s));
        const a = 0.014 * attack * tailK * burst;
        cap.position.x = a * (Math.sin(2 * Math.PI * 41 * s) + 0.6 * Math.sin(2 * Math.PI * 67 * s + 1.3));
        cap.position.z = a * 0.8 * (Math.sin(2 * Math.PI * 37 * s + 2.1) + 0.5 * Math.sin(2 * Math.PI * 59 * s));
        cap.position.y += a * 0.5 * Math.sin(2 * Math.PI * 53 * s + 0.7);
        cap.rotation.z = a * 1.2 * Math.sin(2 * Math.PI * 43 * s + 0.4);
        cap.rotation.x = a * 1.0 * Math.sin(2 * Math.PI * 47 * s + 1.9);
        vibPulse = 0.6 * attack * tailK * burst;
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
