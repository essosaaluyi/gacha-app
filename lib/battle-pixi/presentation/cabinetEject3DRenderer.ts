import * as THREE from "three";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";
import { CABINET_EJECT3D_DISTANCE, CABINET_EJECT3D_STAGE, CABINET_EJECT3D_THICKNESS, CABINET_EJECT3D_PUSH_MS,
  createCabinetEject3DPlan, sampleCabinetEject3DPose, ejectWorldPoint, type CabinetEject3DGeometry, type CabinetEjectStageQuad } from "@/lib/battle-pixi/presentation/cabinetEject3DGeometry";

export function mountCabinetEject3D(host: HTMLDivElement, geometry: CabinetEject3DGeometry, fronts: readonly [string, string, string],
  onReady: (quads: readonly [CabinetEjectStageQuad, CabinetEjectStageQuad, CabinetEjectStageQuad]) => void, onError: () => void) {
  let renderer: THREE.WebGLRenderer | undefined;
  let disposed = false, ready = false, elapsed = -1;
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  const cleanups: (() => void)[] = [];
  const world = new THREE.Scene(), cards: THREE.Mesh[] = [];
  let plan: ReturnType<typeof createCabinetEject3DPlan>;
  const camera = new THREE.PerspectiveCamera(CABINET_EJECT3D_STAGE.fov, 1920 / 1080, 1, 8000); camera.position.set(0, 0, CABINET_EJECT3D_DISTANCE);
  const mask = new THREE.Group(); world.add(mask);
  const dispose = () => {
    if (disposed) return; disposed = true;
    cleanups.forEach(fn => fn()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    world.clear(); renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove(); host.dataset.eject3dRunning = "false";
  };
  const fail = () => { if (!disposed) { dispose(); host.dataset.eject3dState = "error"; onError(); } };
  const seek = (time: number) => {
    elapsed = Number.isFinite(time) ? time : -1;
    if (!ready || disposed || !renderer || document.hidden) return;
    const visible = elapsed >= 0;
    renderer.domElement.style.visibility = visible ? "visible" : "hidden";
    host.dataset.eject3dRunning = String(visible); if (!visible) return;
    mask.visible = elapsed < CABINET_EJECT3D_PUSH_MS;
    cards.forEach((mesh, i) => { const pose = sampleCabinetEject3DPose(plan, i, elapsed); mesh.position.copy(pose.position); mesh.quaternion.copy(pose.rotation); });
    host.dataset.eject3dPhase = elapsed < 420 ? "push" : elapsed < 1450 ? "fan" : "landed";
    host.dataset.eject3dElapsed = String(elapsed);
    try { renderer.render(world, camera); } catch { fail(); }
  };
  const ownGeometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g; };
  const ownMaterial = <T extends THREE.Material>(m: T) => { materials.add(m); return m; };
  try {
    host.dataset.eject3dState = "loading"; host.dataset.eject3dGeometry = JSON.stringify(geometry); plan = createCabinetEject3DPlan(geometry);
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    const canvas = renderer.domElement; canvas.setAttribute("aria-hidden", "true"); canvas.style.cssText = "display:block;width:100%;height:100%;pointer-events:none;visibility:hidden"; host.appendChild(canvas);
    const resize = () => {
      if (disposed || !renderer) return;
      const rect = host.getBoundingClientRect();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.setSize(Math.max(1, Math.min(host.clientWidth || 1920, Math.round(rect.width) || 1920)), Math.max(1, Math.min(host.clientHeight || 1080, Math.round(rect.height) || 1080)), false);
      seek(elapsed);
    };
    const observer = new ResizeObserver(resize); cleanups.push(() => observer.disconnect()); observer.observe(host);
    window.addEventListener("resize", resize, { passive: true }); cleanups.push(() => window.removeEventListener("resize", resize));
    const visibility = () => { host.dataset.eject3dRunning = "false"; if (!document.hidden) seek(elapsed); };
    document.addEventListener("visibilitychange", visibility); cleanups.push(() => document.removeEventListener("visibilitychange", visibility));
    const lost = (event: Event) => { event.preventDefault(); fail(); }; canvas.addEventListener("webglcontextlost", lost); cleanups.push(() => canvas.removeEventListener("webglcontextlost", lost));
    world.add(new THREE.HemisphereLight("#eaf5ff", "#4b3924", 2.5));
    const key = new THREE.DirectionalLight("#fff2db", 3.5); key.position.set(-500, 700, 1100); world.add(key);
    const rim = new THREE.DirectionalLight("#95cddd", 2); rim.position.set(900, 100, 600); world.add(rim);
    // True depth aperture: colourless depth-writing geometry hides the rear
    // stack outside the opening; once the mesh crosses z=0 it emerges in front.
    const { mouth } = geometry, left = mouth.x - mouth.width / 2, right = mouth.x + mouth.width / 2, top = mouth.y - mouth.height / 2, bottom = mouth.y + mouth.height / 2;
    const depthMaterial = ownMaterial(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true }));
    for (const rect of [[0, 0, 1920, top], [0, bottom, 1920, 1080 - bottom], [0, top, left, mouth.height], [right, top, 1920 - right, mouth.height]]) {
      const [x, y, width, height] = rect;
      const mesh = new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(width, height)), depthMaterial); mesh.position.copy(ejectWorldPoint(x + width / 2, y + height / 2, 0)); mesh.renderOrder = -2; mask.add(mesh);
    }
    const lipMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#171d1b", roughness: 0.42, metalness: 0.65 }));
    const brass = ownMaterial(new THREE.MeshStandardMaterial({ color: "#a27a39", roughness: 0.32, metalness: 0.85 }));
    const lip = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(mouth.width + 36, 26, 18)), lipMaterial);
    lip.position.copy(ejectWorldPoint(mouth.x, bottom + 15, 0)); lip.position.z = -9; world.add(lip);
    const trim = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(mouth.width + 36, 2.4, 3)), brass); trim.position.copy(ejectWorldPoint(mouth.x, bottom + 3, 1.5)); world.add(trim);
    const box = ownGeometry(new THREE.BoxGeometry(plan.width, plan.height, CABINET_EJECT3D_THICKNESS));
    box.clearGroups(); box.addGroup(0, 24, 0); box.addGroup(24, 6, 1); box.addGroup(30, 6, 2);
    const edge = ownMaterial(new THREE.MeshStandardMaterial({ color: "#b4a681", metalness: 0.25, roughness: 0.65 }));
    const cache = new Map<string, Promise<THREE.Texture>>();
    const load = (url: string) => {
      const known = cache.get(url); if (known) return known;
      const promise = new THREE.TextureLoader().loadAsync(url).then(texture => {
        if (disposed) { texture.dispose(); throw new Error("Disposed ejection"); }
        textures.add(texture); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(4, renderer!.capabilities.getMaxAnisotropy()); return texture;
      }); cache.set(url, promise); return promise;
    };
    const requests = [PLAYER_CARD_BACK_IMAGE, ...fronts].map(load);
    void Promise.allSettled(requests).then(results => {
      if (disposed) return;
      if (results.some(result => result.status === "rejected")) { fail(); return; }
      const maps = results.map(result => (result as PromiseFulfilledResult<THREE.Texture>).value);
      const art = (map: THREE.Texture) => ownMaterial(new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: "#ffffff", emissiveIntensity: 0.28, roughness: 0.45, metalness: 0.1 }));
      const back = art(maps[0]);
      maps.slice(1).forEach(map => { const mesh = new THREE.Mesh(box, [edge, back, art(map)]); cards.push(mesh); world.add(mesh); });
      ready = true; resize(); host.dataset.eject3dState = "ready"; onReady(plan.landingQuads); seek(elapsed);
    }).catch(fail);
    resize();
  } catch { fail(); }
  return { seek, dispose };
}
