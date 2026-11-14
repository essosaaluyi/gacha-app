import * as THREE from "three";
import { resolvePlayerCardBack } from "@/lib/cards/cardAssets";
import type { RevealCard, RevealScene } from "./types";
import { getCardDisplayCrop, getCardDisplayFrame } from "./cardDisplayCrop";

const ease = (n: number) => { const t = THREE.MathUtils.clamp(n, 0, 1); return t * t * (3 - 2 * t); };

/** Real meshes only: six-sided card stock plus separate front/back artwork. */
export async function createRevealScene(host: HTMLDivElement, cards: readonly RevealCard[], packImage: string, reduced: boolean, onReady: () => void, onFailure: () => void, signal: AbortSignal): Promise<RevealScene> {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  camera.position.set(0, 0, 10.8);
  world.add(new THREE.HemisphereLight(0xf3f8ff, 0x323246, 2.6));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(3, 5, 7);
  world.add(key);
  const rim = new THREE.DirectionalLight(0x97ceff, 2);
  rim.position.set(-4, 1, -3);
  world.add(rim);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures = new Set<THREE.Texture>();
  let destroyed = false;
  let frame = 0;
  let lastFrame = 0;
  let clock = 0;
  let previous = 0;
  let ready = false;
  let current = 0;
  let slideStart: number | null = null;
  let slideDone: (() => void) | null = null;
  let tiltX = 0;
  let tiltY = 0;
  let introDistance = 9.6;
  let revealDistance = 6.5;
  let observer: ResizeObserver | null = null;
  const stack = new THREE.Group();
  const pack = new THREE.Group();
  const cardGroups: THREE.Group[] = [];
  const sheenTime = { value: 0 };
  const sheenTilt = { value: 0 };
  const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const material = <T extends THREE.Material>(m: T) => { materials.push(m); return m; };
  const dispose = () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    renderer.domElement.removeEventListener("webglcontextlost", lost);
    signal.removeEventListener("abort", dispose);
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
    world.clear();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    slideDone = null;
  };
  const lost = (event: Event) => { event.preventDefault(); if (!destroyed) { dispose(); onFailure(); } };
  const visibility = () => { previous = 0; };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", visibility);
  signal.addEventListener("abort", dispose, { once: true });
  if (signal.aborted) { dispose(); throw new Error("Reveal disposed"); }
  const cache = new Map<string, Promise<THREE.Texture>>();
  const texture = (url: string, trim = false): Promise<THREE.Texture> => {
    const known = cache.get(url);
    if (known) return known;
    const pending = new Promise<THREE.Texture>((resolve, reject) => {
      new THREE.TextureLoader().load(url, loaded => {
        if (destroyed) { loaded.dispose(); reject(new Error("Reveal disposed")); return; }
        try {
        // Trim the approved transparent pack's full-image margins, without editing its file.
        const source = loaded.image as HTMLImageElement;
        const crop = getCardDisplayCrop(url);
        const sx = Math.round((crop?.left ?? 0) * source.width);
        const sy = Math.round((crop?.top ?? 0) * source.height);
        const sw = source.width - sx - Math.round((crop?.right ?? 0) * source.width);
        const sh = source.height - sy - Math.round((crop?.bottom ?? 0) * source.height);
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1024 / Math.max(sw, sh));
        canvas.width = Math.round(sw * scale);
        canvas.height = Math.round(sh * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { loaded.dispose(); reject(new Error("Canvas unavailable")); return; }
        ctx.save();
        if (crop) {
          // Match DOM fronts/inspection, including opaque source corner matte.
          ctx.scale(canvas.width / 100, canvas.height / 100);
          ctx.clip(new Path2D(getCardDisplayFrame(url).outlinePath));
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        let output = canvas;
        if (trim) {
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
          for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
            if (data[(y * canvas.width + x) * 4 + 3] > 16) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
          }
          if (right > left && bottom > top) {
            output = document.createElement("canvas");
            output.width = right - left + 1;
            output.height = bottom - top + 1;
            output.getContext("2d")!.drawImage(canvas, left, top, output.width, output.height, 0, 0, output.width, output.height);
          }
        }
        const result = new THREE.CanvasTexture(output);
        result.colorSpace = THREE.SRGBColorSpace;
        result.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        textures.add(result);
        loaded.dispose();
        resolve(result);
        } catch (error) { loaded.dispose(); reject(error); }
      }, undefined, reject);
    });
    cache.set(url, pending);
    return pending;
  };

  try {
    const [packArt, art] = await Promise.all([
      texture(packImage, true),
      Promise.all(cards.map(async card => ({ front: await texture(card.image), back: await texture(resolvePlayerCardBack(card.backImage)) }))),
    ]);
    if (destroyed) throw new Error("Reveal disposed");
    const faceGeometry = geometry(new THREE.PlaneGeometry(2, 3));
    const packMouth = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.6);
    const clippingPlanes = [packMouth];
    const glossMeshes: THREE.Mesh[] = [];
    const stockGeometry = geometry(new THREE.BoxGeometry(2.002, 3.002, 0.007));
    const edge = material(new THREE.MeshStandardMaterial({ color: 0xc5bc99, clippingPlanes, roughness: 0.48, metalness: 0.25 }));
    art.forEach(({ front, back }, i) => {
      const card = new THREE.Group();
      // Equal physical height; preserve the cropped front's native proportions.
      const frontImage = front.image as HTMLCanvasElement;
      card.scale.x = (frontImage.width / frontImage.height) / (2 / 3);
      card.add(new THREE.Mesh(stockGeometry, edge));
      const a = new THREE.Mesh(faceGeometry, material(new THREE.MeshBasicMaterial({ map: front, transparent: true, alphaTest: 0.08, clippingPlanes })));
      a.position.z = 0.004;
      const b = new THREE.Mesh(faceGeometry, material(new THREE.MeshBasicMaterial({ map: back, transparent: true, alphaTest: 0.08, clippingPlanes })));
      b.position.z = -0.004;
      b.rotation.y = Math.PI;
      card.add(a, b);
      const rarity = cards[i].rarity;
      if (["SR", "SSR", "UR"].includes(rarity)) {
        const sheen = material(new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
          uniforms: { time: sheenTime, tilt: sheenTilt, rainbow: { value: rarity === "UR" ? 1 : 0 }, tint: { value: new THREE.Color(rarity === "SR" ? "#64baff" : "#ffd77c") }, strength: { value: rarity === "UR" ? 0.22 : 0.12 } },
          vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
          fragmentShader: `varying vec2 vUv; uniform float time; uniform float tilt; uniform float rainbow; uniform vec3 tint; uniform float strength;
            void main(){
              float diagonal=vUv.x*.8+vUv.y*.4+tilt*.4;
              float sweep=pow(max(0.0,sin(diagonal*5.0-time*.9)),18.0);
              vec3 holo=.55+.45*cos(6.28318*(vec3(0.0,.33,.67)+diagonal+time*.06));
              float edge=smoothstep(0.0,.035,vUv.x)*smoothstep(0.0,.035,1.0-vUv.x)*smoothstep(0.0,.025,vUv.y)*smoothstep(0.0,.025,1.0-vUv.y);
              gl_FragColor=vec4(mix(tint,holo,rainbow),edge*strength*(sweep+.12*rainbow));
            }`,
        }));
        const gloss = new THREE.Mesh(faceGeometry, sheen);
        gloss.position.z = 0.005;
        gloss.visible = false;
        glossMeshes.push(gloss);
        card.add(gloss);
      }
      card.position.set(i * 0.008, -i * 0.012, -i * 0.012);
      stack.add(card);
      cardGroups.push(card);
    });
    world.add(stack, pack);
    // The bag has a slim foil body and two textured faces; the upper seam is independent.
    const packRatio = (packArt.image as HTMLCanvasElement).width / (packArt.image as HTMLCanvasElement).height;
    const packHeight = 3.9;
    const packWidth = packHeight * packRatio;
    const capHeight = packHeight * 0.09;
    const bodyHeight = packHeight - capHeight;
    const bodyArt = packArt.clone();
    bodyArt.repeat.set(1, 0.91);
    bodyArt.needsUpdate = true;
    const capArt = packArt.clone();
    capArt.repeat.set(1, 0.09);
    capArt.offset.y = 0.91;
    capArt.needsUpdate = true;
    textures.add(bodyArt); textures.add(capArt);
    const foil = material(new THREE.MeshStandardMaterial({ color: 0x243b3d, metalness: 0.8, roughness: 0.28 }));
    const body = new THREE.Group();
    const cap = new THREE.Group();
    const addFoil = (group: THREE.Group, height: number, map: THREE.Texture) => {
      const shell = new THREE.Mesh(geometry(new THREE.BoxGeometry(packWidth * 0.97, height * 0.99, 0.13)), foil);
      group.add(shell);
      const plane = geometry(new THREE.PlaneGeometry(packWidth, height));
      const ink = material(new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.12 }));
      const face = new THREE.Mesh(plane, ink); face.position.z = 0.071;
      // No approved reverse pack art exists: leave its reverse as metallic foil.
      group.add(face);
    };
    addFoil(body, bodyHeight, bodyArt);
    addFoil(cap, capHeight, capArt);
    body.position.y = -capHeight / 2;
    cap.position.y = bodyHeight / 2;
    pack.add(body, cap);
    pack.position.z = 0.55;

    const resize = () => {
      if (destroyed) return;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      introDistance = Math.max(9.6, 5.9 / camera.aspect);
      revealDistance = Math.max(6.5, 4.2 / camera.aspect);
      camera.position.z = ready ? revealDistance : introDistance;
      camera.updateProjectionMatrix();
    };
    observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const introDuration = reduced ? 0.35 : 4.6;
    const render = (now: number) => {
      if (destroyed) return;
      frame = requestAnimationFrame(render);
      if (document.hidden) { previous = 0; return; }
      // Cap steady GPU work at 30fps. Hidden tabs pause the choreography clock.
      if (now - lastFrame < 1000 / 30) return;
      lastFrame = now;
      const dt = previous ? Math.min(0.07, (now - previous) / 1000) : 0;
      previous = now;
      clock += dt;
      sheenTime.value = reduced ? 0 : clock;
      sheenTilt.value = stack.rotation.y;
      if (!ready) {
        const t = clock / introDuration;
        const tear = ease((t - 0.10) / 0.18);
        const rise = ease((t - 0.26) / 0.32);
        const exit = ease((t - 0.57) / 0.22);
        const flip = ease((t - 0.72) / 0.28);
        camera.position.z = THREE.MathUtils.lerp(introDistance, revealDistance, flip);
        cap.position.x = tear * 1.65;
        cap.position.y = bodyHeight / 2 + tear * 0.65;
        cap.rotation.z = -tear * 0.48;
        pack.position.y = -exit * 6.5;
        pack.rotation.z = -exit * 0.19;
        stack.position.y = -0.85 + rise * 1.5 - flip * 0.65;
        stack.rotation.y = Math.PI * (1 - flip);
        stack.rotation.z = (1 - flip) * -0.055;
        // Reveal only the part of each card above the open foil mouth.
        packMouth.constant = -pack.position.y - (packHeight / 2 - capHeight);
        stack.visible = t > 0.26;
        if (t >= 1) { packMouth.constant = 100; glossMeshes.forEach(mesh => { mesh.visible = true; }); ready = true; pack.visible = false; stack.visible = true; onReady(); }
      } else {
        const damping = 1 - Math.exp(-dt * 18);
        stack.rotation.y = THREE.MathUtils.lerp(stack.rotation.y, tiltX * 0.95, damping);
        stack.rotation.x = THREE.MathUtils.lerp(stack.rotation.x, -tiltY * 0.65, damping);
        stack.rotation.z = THREE.MathUtils.lerp(stack.rotation.z, -tiltX * 0.07, damping);
        stack.position.y = reduced ? 0 : Math.sin(clock * 1.45) * 0.025;
        if (slideStart !== null) {
          const t = ease((clock - slideStart) / (reduced ? 0.12 : 0.52));
          const top = cardGroups[current];
          if (top) { top.position.x = t * 5.8; top.position.y = -t * 0.25; top.rotation.z = -t * 0.18; top.position.z = t * 0.6; }
          if (t >= 1) {
            if (top) top.visible = false;
            current++;
            // Bring the remaining physical stack forward without changing card order.
            stack.position.z = current * 0.055;
            slideStart = null;
            const done = slideDone; slideDone = null; done?.();
            if (destroyed) return;
          }
        }
      }
      renderer.render(world, camera);
    };
    frame = requestAnimationFrame(render);
    return { dispose, tilt: (x, y) => { tiltX = x; tiltY = y; }, advance: done => { if (!destroyed && ready && slideStart === null) { slideStart = clock; slideDone = done; tiltX = 0; tiltY = 0; } } };
  } catch (error) {
    dispose();
    throw error;
  }
}
