import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";
import { CARD_HEIGHT, CABINET_STRUCTURE_SCALE, CABINET_CARD_SCALE } from "./motion";

export { CABINET_STRUCTURE_SCALE } from "./motion";

export function createTank(renderer: THREE.WebGLRenderer, options: { embedded?: boolean } = {}) {
  const embedded = Boolean(options.embedded);
  const scene = new THREE.Scene();
  if (!embedded) { scene.background = new THREE.Color("#080e13"); scene.fog = new THREE.Fog("#080e13", 17, 35); }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose(); pmrem.dispose();
  const root = new THREE.Group(); scene.add(root);
  const structure = new THREE.Group(); root.add(structure);
  const effectsRoot = new THREE.Group(); root.add(effectsRoot);
  if (embedded) { structure.scale.set(CABINET_STRUCTURE_SCALE.x, CABINET_STRUCTURE_SCALE.y, CABINET_STRUCTURE_SCALE.z); effectsRoot.scale.copy(structure.scale); }
  const textures = new Set<THREE.Texture>();
  const black = new THREE.MeshStandardMaterial({ color: "#111b22", metalness: 0.86, roughness: 0.28 });
  const gold = new THREE.MeshStandardMaterial({ color: "#9b7138", metalness: 0.85, roughness: 0.32 });
  const darkGold = new THREE.MeshStandardMaterial({ color: "#524126", metalness: 0.8, roughness: 0.42 });
  const lamp = new THREE.MeshStandardMaterial({ color: "#ffe6b6", emissive: "#ffd6a0", emissiveIntensity: 3, roughness: 0.3 });
  // Low-opacity reflective shell: no refraction pass that could obscure the cards.
  const glass = new THREE.MeshPhysicalMaterial({ color: "#b9dfec", metalness: 0, roughness: 0.1,
    transparent: true, opacity: 0.065, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, envMapIntensity: 0.55 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); structure.add(mesh); return mesh;
  };
  const bodyRing = new THREE.CylinderGeometry(2.28, 2.28, embedded ? 0.12 : 0.27, 8);
  const trimRing = new THREE.CylinderGeometry(2.3, 2.3, 0.035, 8);
  const ringGeo = new THREE.TorusGeometry(1.94, 0.026, 8, 96);
  const ringLights: THREE.PointLight[] = [];
  for (const y of [-2.86, 2.86]) {
    add(bodyRing, black, 0, y).rotation.y = Math.PI / 8;
    for (const offset of embedded ? [-0.06, 0.06] : [-0.12, 0.12]) add(trimRing, gold, 0, y + offset).rotation.y = Math.PI / 8;
    const ring = add(ringGeo, lamp, 0, y - Math.sign(y) * 0.22); ring.rotation.x = Math.PI / 2;
    const light = new THREE.PointLight("#ffe4b0", 18, embedded ? 10 : 7, 2); light.position.set(0, y - Math.sign(y) * 0.4, 0); structure.add(light); ringLights.push(light);
  }
  const postGeo = new RoundedBoxGeometry(embedded ? 0.13 : 0.25, 5.6, embedded ? 0.13 : 0.25, 2, embedded ? 0.03 : 0.055);
  const seamGeo = new THREE.BoxGeometry(0.035, 5.42, 0.035);
  const boltGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.04, 6);
  for (const x of [-1.57, 1.57]) for (const z of [-1.57, 1.57]) {
    add(postGeo, black, x, 0, z);
    add(seamGeo, gold, x + Math.sign(x) * 0.09, 0, z + Math.sign(z) * 0.09);
    for (const y of [-2.5, -1.8, 1.8, 2.5]) { const bolt = add(boltGeo, gold, x, y, z + 0.14); bolt.rotation.x = Math.PI / 2; }
  }
  const shell = add(new THREE.CylinderGeometry(2.05, 2.05, 5.35, 96, 1, true), glass); shell.renderOrder = 10;
  const disk = new THREE.CylinderGeometry(2.05, 2.05, 0.09, 64);
  add(disk, darkGold, 0, -2.66); add(disk, black, 0, 2.66);
  // Air nozzles and concentric floor grilles make the rising flow legible.
  const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.12, 12);
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; add(nozzleGeo, gold, Math.cos(a) * 1.5, -2.57, Math.sin(a) * 1.5); }
  for (const r of [0.5, 0.85, 1.2, 1.7]) { const grille = add(new THREE.TorusGeometry(r, 0.015, 5, 64), black, 0, -2.6); grille.rotation.x = Math.PI / 2; }
  // Small outlet and short left J rail, kept subordinate to the chamber.
  if (!embedded) {
  add(new RoundedBoxGeometry(0.8, 0.3, 0.55, 2, 0.08), black, 0, -3.12, 0.65);
  add(new THREE.BoxGeometry(0.61, 0.045, 0.42), gold, 0, -3.04, 0.75);
  const railCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-2, -0.8, 0.3), new THREE.Vector3(-2.45, -0.9, 0.3), new THREE.Vector3(-2.45, -2.7, 0.3), new THREE.Vector3(-1.6, -3.12, 0.4), new THREE.Vector3(-0.5, -3.12, 0.65)]);
  const rail = add(new THREE.TubeGeometry(railCurve, 40, 0.12, 8, false), glass); rail.renderOrder = 11;
  }
  const key = new THREE.DirectionalLight("#fff0d5", 4); key.position.set(-3, 5, 7); scene.add(key);
  const fill = new THREE.DirectionalLight("#9dcde9", 2.5); fill.position.set(4, 0, -4); scene.add(fill);
  scene.add(new THREE.HemisphereLight("#d5e8ff", "#79613d", 2));
  if (!embedded) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: "#0c151c", roughness: 0.4, metalness: 0.4 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -3.3; scene.add(ground);
  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 64); grad.addColorStop(0, "rgba(0,0,0,.9)"); grad.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  textures.add(shadowTexture);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -3.29; scene.add(shadow);
  }
  const size = embedded ? CABINET_CARD_SCALE : 1;
  const cardGeometry = new THREE.BoxGeometry(CARD_HEIGHT * 2 / 3 * size, CARD_HEIGHT * size, 0.018 * size);
  // Merge the four thin edge groups: three draws per card instead of six.
  cardGeometry.clearGroups(); cardGeometry.addGroup(0, 24, 0); cardGeometry.addGroup(24, 6, 1); cardGeometry.addGroup(30, 6, 2);
  const edge = new THREE.MeshStandardMaterial({ color: "#bda77c", roughness: 0.65, metalness: 0.25 });
  const cardMaterials: THREE.Material[][] = [];
  const loader = new THREE.TextureLoader();
  const load = async (url: string) => {
    const texture = await loader.loadAsync(url); textures.add(texture);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  };
  let disposed = false;
  const prepareCards = async () => {
    // These are the current Stage's lottery faces, not summon-character portraits.
    const urls = [PLAYER_CARD_BACK_IMAGE, ...["attack", "defense", "coin", "reply", "bar", "chance", "empty"].map(n => `/images/battle-symbols/soft-edge/${n}.png`)];
    const result = await Promise.allSettled(urls.map(load));
    if (disposed) { textures.forEach(t => t.dispose()); return; }
    if (result.some(r => r.status === "rejected")) throw new Error("カード画像を読み込めませんでした。再読み込みしてください。");
    const maps = result.map(r => (r as PromiseFulfilledResult<THREE.Texture>).value);
    const back = new THREE.MeshStandardMaterial({ map: maps[0], roughness: 0.48, metalness: 0.06, emissiveMap: maps[0], emissive: "#ffffff", emissiveIntensity: 0.16 });
    maps.slice(1).forEach(map => {
      const front = new THREE.MeshStandardMaterial({ map, roughness: 0.48, metalness: 0.06, emissiveMap: map, emissive: "#ffffff", emissiveIntensity: 0.16 });
      // BoxGeometry's -Z face uses outward-facing UVs; the reverse reads correctly.
      cardMaterials.push([edge, front, back]);
    });
  };
  const cards: THREE.Mesh[] = [];
  const setCount = (count: number) => {
    cards.forEach(c => root.remove(c)); cards.length = 0;
    for (let i = 0; i < count; i++) { const card = new THREE.Mesh(cardGeometry, cardMaterials[i % cardMaterials.length]); root.add(card); cards.push(card); }
  };
  const dispose = () => {
    disposed = true;
    const geometries = new Set<THREE.BufferGeometry>([cardGeometry]);
    const materials = new Set<THREE.Material>([edge, ...cardMaterials.flat()]);
    scene.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)); } });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); environment.dispose();
  };
  return { scene, root, effectsRoot, cards, lamp, ringLights, prepareCards, setCount, dispose };
}
