import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { advanceMotion, createMotion, type Preset } from "./motion";
import { createTank } from "./model";
import { createRecorder, type RecordState } from "./recording";
import { createWindLayer } from "./wind-layer";
import { createCrackLayer } from "./crack-layer";
import { advanceCrack, createCrackState, triggerCrack, repairCrack, type CrackState } from "./cracks";

export type LabOptions = { paused: boolean; preset: Preset; count: number; speed: number; light: boolean; reset: number; front: number };
export type LabEvent = { type: "ready" } | { type: "error"; message: string } | { type: "stats"; fps: number; calls: number; triangles: number; textures: number; steps: number; contacts: number; restores: number } | { type: "record"; state: RecordState } | { type: "crack"; state: CrackState["phase"] };

export function mountTank(host: HTMLElement, options: LabOptions, emit: (event: LabEvent) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  try { return mountScene(host, options, emit, renderer); }
  catch (error) { renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); throw error; }
}

function mountScene(host: HTMLElement, options: LabOptions, emit: (event: LabEvent) => void, renderer: THREE.WebGLRenderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-label", "立体エアタンク。ドラッグで回転、ピンチで拡大。");
  canvas.setAttribute("role", "img");
  host.appendChild(canvas);
  const tank = createTank(renderer);
  const wind = createWindLayer(tank.root);
  const fractures = createCrackLayer(tank.root);
  const crack = createCrackState();
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 65);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
  controls.minDistance = 8; controls.maxDistance = 22;
  controls.minPolarAngle = 0.45; controls.maxPolarAngle = Math.PI * 0.8;
  let disposed = false, ready = false, failed = false;
  let width = 1, height = 1;
  let motion = createMotion(options.count);
  let lastReset = options.reset, lastFront = options.front, lastLight = options.light;
  let previous = 0, statsAt = 0, frames = 0;
  let recordState: RecordState = "unsupported";
  const recorder = createRecorder(canvas, state => { recordState = state; emit({ type: "record", state }); });
  const repair = () => { repairCrack(crack); fractures.update(crack); emit({ type: "crack", state: crack.phase }); };
  const home = () => {
    const distance = Math.max(11.7, 7 / Math.max(0.48, width / height));
    camera.position.set(0, 0.5, distance); controls.target.set(0, -0.15, 0); controls.update(); controls.saveState();
  };
  const resize = () => {
    width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.light ? 1 : 1.75));
    renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    home();
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const fail = (message: string) => { if (disposed) return; failed = true; renderer.setAnimationLoop(null); recorder.cancel(); emit({ type: "error", message }); };
  const contextLost = (event: Event) => { event.preventDefault(); fail("3D描画が中断しました。ページを再読み込みしてください。"); };
  canvas.addEventListener("webglcontextlost", contextLost);
  const frame = (now: number) => {
    if (disposed || document.hidden || failed) return;
    const elapsed = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
    previous = now;
    if (options.light !== lastLight) { lastLight = options.light; resize(); }
    if (options.front !== lastFront) { lastFront = options.front; home(); }
    if (ready && (motion.cards.length !== options.count || options.reset !== lastReset)) {
      if (options.reset !== lastReset) repair();
      lastReset = options.reset; motion = createMotion(options.count); tank.setCount(options.count);
      wind.reset();
    }
    if (ready && !options.paused) advanceMotion(motion, elapsed, options.preset, options.speed);
    tank.cards.forEach((mesh, i) => { const c = motion.cards[i]; mesh.position.set(c.x, c.y, c.z); mesh.rotation.set(c.rx, c.ry, c.rz); });
    const hot = options.preset === "hot";
    const t = motion.time;
    tank.root.position.set(hot ? Math.sin(t * 42) * 0.013 : 0, hot ? Math.sin(t * 35) * 0.009 : 0, 0);
    tank.lamp.emissive.set(hot ? "#ff7435" : "#ffd6a0");
    tank.lamp.emissiveIntensity = hot ? 3.4 + Math.sin(t * 7) * 0.45 : 3;
    tank.ringLights.forEach(light => { light.color.set(hot ? "#ff9c58" : "#ffe4b0"); light.intensity = hot ? 22 : 18; });
    const phase = crack.phase;
    if (!options.paused) advanceCrack(crack, elapsed);
    if (phase !== crack.phase) emit({ type: "crack", state: crack.phase });
    fractures.update(crack);
    wind.update(motion.time, options.preset, options.light, renderer.getPixelRatio());
    controls.update(elapsed);
    renderer.render(tank.scene, camera);
    frames++;
    if (now - statsAt >= 1000) {
      if (statsAt) emit({ type: "stats", fps: Math.round(frames * 1000 / (now - statsAt)), calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, steps: motion.steps, contacts: motion.contacts, restores: motion.restores });
      frames = 0; statsAt = now;
    }
  };
  const visibility = () => {
    previous = 0; frames = 0; statsAt = 0;
    if (document.hidden) { renderer.setAnimationLoop(null); recorder.cancel(); }
    else if (!failed) renderer.setAnimationLoop(frame);
  };
  document.addEventListener("visibilitychange", visibility);
  void tank.prepareCards().then(() => {
    if (disposed) return;
    tank.setCount(options.count); ready = true; emit({ type: "ready" });
  }).catch(() => fail("カード画像を読み込めませんでした。ページを再読み込みしてください。"));
  if (!document.hidden) renderer.setAnimationLoop(frame);
  return {
    record() { if (ready && !failed && !document.hidden) recorder.start(); },
    hitGlass() {
      if (!ready || failed || disposed || document.hidden || crack.phase !== "clean") return;
      triggerCrack(crack); crack.age = 0.016; fractures.update(crack); emit({ type: "crack", state: crack.phase });
    },
    repairGlass() { if (!disposed && recordState !== "recording") repair(); },
    dispose() {
      disposed = true; renderer.setAnimationLoop(null); observer.disconnect();
      document.removeEventListener("visibilitychange", visibility); canvas.removeEventListener("webglcontextlost", contextLost);
      recorder.dispose(); controls.dispose(); wind.dispose(); fractures.dispose(); tank.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
