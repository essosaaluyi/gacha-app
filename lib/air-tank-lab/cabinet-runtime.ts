import * as THREE from "three";
import { createTank } from "./model";
import { createMotion, CABINET_LIMITS, CABINET_CARD_SCALE } from "./motion";
import { advanceCabinetMotion, CABINET_MIX_DRIVE } from "./cabinet-motion";
import { createWindLayer } from "./wind-layer";
import { createCrackLayer } from "./crack-layer";
import { advanceCrack } from "./cracks";
import { applyCabinetSignals, createCabinetState, type CabinetTankSignals } from "./cabinet-state";

export type CabinetRenderState = "loading" | "ready" | "error";

/** Decorative-only renderer. No lottery state, input listeners, Orbit or recording. */
export function mountCabinetTank(host: HTMLElement, initial: CabinetTankSignals, onState: (state: CabinetRenderState) => void) {
  let renderer: THREE.WebGLRenderer | undefined;
  let tank: ReturnType<typeof createTank> | undefined;
  let wind: ReturnType<typeof createWindLayer> | undefined;
  let cracks: ReturnType<typeof createCrackLayer> | undefined;
  const cleanup: (() => void)[] = [];
  const signals = createCabinetState();
  let motion = createMotion(30, 1203, CABINET_LIMITS, CABINET_CARD_SCALE);
  let disposed = false, ready = false, inView = true, sized = false;
  let frameId = 0, previous = 0, lastDraw = 0, statsAt = 0, frames = 0;
  const dispose = () => {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frameId); frameId = 0;
    cleanup.forEach(fn => fn());
    wind?.dispose(); cracks?.dispose(); tank?.dispose();
    renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove();
    host.dataset.airTankRunning = "false"; host.dataset.airTankFps = "0";
  };
  const fail = () => { if (disposed) return; dispose(); onState("error"); };
  const allowed = () => !disposed && ready && sized && signals.active && inView && !document.hidden;
  const schedule = () => {
    if (allowed() && !frameId) frameId = requestAnimationFrame(frame);
    host.dataset.airTankRunning = String(allowed());
    if (!allowed()) { cancelAnimationFrame(frameId); frameId = 0; previous = 0; lastDraw = 0; frames = 0; statsAt = 0; host.dataset.airTankFps = "0"; }
  };
  const update = (next: CabinetTankSignals) => {
    if (disposed) return;
    if (applyCabinetSignals(signals, next).resetMotion) {
      motion = createMotion(30, 1203, CABINET_LIMITS, CABINET_CARD_SCALE); wind?.reset();
      host.dataset.airTankSteps = "0";
    }
    host.dataset.airTankMixing = String(next.mixing);
    host.dataset.airTankCrackState = signals.crack.phase;
    host.dataset.airTankTone = signals.hot ? "hot" : "normal";
    cracks?.update(signals.crack); schedule();
  };
  const camera = new THREE.OrthographicCamera(-2, 2, 4.4, -4.4, 0.1, 40);
  camera.position.set(0, 0.12, 14); camera.lookAt(0, 0, 0);
  function frame(now: number) {
    frameId = 0;
    if (!allowed() || !renderer || !tank || !wind || !cracks) { schedule(); return; }
    const interval = 1000 / (signals.mixing ? 48 : 24);
    if (lastDraw && now - lastDraw < interval - 0.25) { schedule(); return; }
    const elapsed = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
    previous = now;
    lastDraw = lastDraw ? now - (now - lastDraw) % interval : now;
    const preset = signals.mixing ? signals.hot ? "hot" : "fast" : "normal";
    advanceCabinetMotion(motion, elapsed, signals.mixing);
    tank.cards.forEach((mesh, i) => { const c = motion.cards[i]; mesh.position.set(c.x, c.y, c.z); mesh.rotation.set(c.rx, c.ry, c.rz); });
    tank.root.position.set(signals.hot ? Math.sin(motion.time * 42) * 0.009 : 0, signals.hot ? Math.sin(motion.time * 35) * 0.008 : 0, 0);
    tank.lamp.emissive.set(signals.hot ? "#ff8e42" : "#ffe0b3");
    tank.lamp.emissiveIntensity = signals.hot ? 3.2 : 2.4;
    tank.ringLights.forEach(light => { light.color.set(signals.hot ? "#ffa45d" : "#ffe6ba"); light.intensity = signals.hot ? 20 : 16; });
    advanceCrack(signals.crack, elapsed); cracks.update(signals.crack);
    wind.update(motion.time, preset, true, renderer.getPixelRatio(), signals.mixing ? CABINET_MIX_DRIVE : undefined);
    try { renderer.render(tank.scene, camera); } catch { fail(); return; }
    host.dataset.airTankCrackState = signals.crack.phase;
    frames++;
    if (!statsAt) statsAt = now;
    else if (now - statsAt >= 1000) {
      host.dataset.airTankFps = String(Math.round(frames * 1000 / (now - statsAt)));
      host.dataset.airTankCalls = String(renderer.info.render.calls);
      host.dataset.airTankSteps = String(motion.steps);
      frames = 0; statsAt = now;
    }
    schedule();
  }
  try {
    onState("loading");
    host.dataset.airTankCardScale = String(CABINET_CARD_SCALE); host.dataset.airTankCardCount = "30";
    host.dataset.airTankSteps = "0"; host.dataset.airTankCalls = "0";
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true"); canvas.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
    host.appendChild(canvas);
    tank = createTank(renderer, { embedded: true });
    wind = createWindLayer(tank.effectsRoot); cracks = createCrackLayer(tank.effectsRoot);
    const resize = () => {
      if (disposed || !renderer) return;
      const width = host.clientWidth, height = host.clientHeight;
      sized = width > 0 && height > 0;
      if (sized) {
        // Preserve card geometry/aspect; fit the slender physical chamber, no CSS stretching.
        const aspect = width / height, viewHeight = Math.max(8.55, 4.06 / aspect);
        camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2;
        camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2; camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); renderer.setSize(width, height, false);
      }
      schedule();
    };
    const resizeObserver = new ResizeObserver(resize); cleanup.push(() => resizeObserver.disconnect()); resizeObserver.observe(host); resize();
    const rect = host.getBoundingClientRect(); inView = rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(entries => { inView = entries.some(entry => entry.isIntersecting); schedule(); }, { threshold: 0 });
      cleanup.push(() => observer.disconnect()); observer.observe(host);
    }
    const visibility = () => schedule(); document.addEventListener("visibilitychange", visibility); cleanup.push(() => document.removeEventListener("visibilitychange", visibility));
    const lost = (event: Event) => { event.preventDefault(); fail(); }; canvas.addEventListener("webglcontextlost", lost); cleanup.push(() => canvas.removeEventListener("webglcontextlost", lost));
    update(initial);
    void tank.prepareCards().then(() => {
      if (disposed || !tank) return;
      tank.setCount(30); ready = true; onState("ready"); schedule();
    }).catch(fail);
  } catch { fail(); }
  return { update, dispose };
}
