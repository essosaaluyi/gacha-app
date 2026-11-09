import * as THREE from "three";

export type CabinetEjectStageQuad = readonly [number, number, number, number, number, number, number, number];
export type CabinetEject3DGeometry = {
  mouth: { x: number; y: number; width: number; height: number };
  bays: readonly [CabinetEjectStageQuad, CabinetEjectStageQuad, CabinetEjectStageQuad];
};
export const CABINET_EJECT3D_DURATION_MS = 1450;
export const CABINET_EJECT3D_PUSH_MS = 420;
export const CABINET_EJECT3D_STAGGER_MS = 90;
export const CABINET_EJECT3D_STAGE = { width: 1920, height: 1080, fov: 40 } as const;
export const CABINET_EJECT3D_DISTANCE = 540 / Math.tan(THREE.MathUtils.degToRad(CABINET_EJECT3D_STAGE.fov / 2));
export const CABINET_EJECT3D_THICKNESS = 2.4;
const ease = (value: number) => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const up = new THREE.Vector3(0, 0, 1);

export function ejectWorldPoint(x: number, y: number, z: number) {
  const scale = (CABINET_EJECT3D_DISTANCE - z) / CABINET_EJECT3D_DISTANCE;
  return new THREE.Vector3((x - 960) * scale, (540 - y) * scale, z);
}
export function ejectProjectPoint(point: THREE.Vector3) {
  const scale = CABINET_EJECT3D_DISTANCE / (CABINET_EJECT3D_DISTANCE - point.z);
  return { x: 960 + point.x * scale, y: 540 - point.y * scale };
}
export type EjectPose = { position: THREE.Vector3; rotation: THREE.Quaternion };
export type CabinetEject3DPlan = {
  geometry: CabinetEject3DGeometry;
  width: number;
  height: number;
  landings: readonly [EjectPose, EjectPose, EjectPose];
  landingQuads: readonly [CabinetEjectStageQuad, CabinetEjectStageQuad, CabinetEjectStageQuad];
};

function corners(width: number, rotation: THREE.Quaternion, position: THREE.Vector3): CabinetEjectStageQuad {
  const result: number[] = [];
  for (const [x, y] of [[-0.5, 0.75], [0.5, 0.75], [0.5, -0.75], [-0.5, -0.75]]) {
    const point = new THREE.Vector3(x * width, y * width, CABINET_EJECT3D_THICKNESS / 2).applyQuaternion(rotation).add(position);
    const p = ejectProjectPoint(point); result.push(p.x, p.y);
  }
  return result as unknown as CabinetEjectStageQuad;
}

function centeredPose(width: number, x: number, y: number, z: number, rotation: THREE.Quaternion): EjectPose {
  const local = [[-0.5, 0.75], [0.5, 0.75], [0.5, -0.75], [-0.5, -0.75]].map(([u, v]) => new THREE.Vector3(u * width, v * width, CABINET_EJECT3D_THICKNESS / 2).applyQuaternion(rotation));
  const inverse = local.map(p => 1 / (CABINET_EJECT3D_DISTANCE - z - p.z));
  const meanInverse = inverse.reduce((a, b) => a + b, 0) / 4;
  const meanX = local.reduce((sum, p, i) => sum + p.x * inverse[i], 0) / 4;
  const meanY = local.reduce((sum, p, i) => sum + p.y * inverse[i], 0) / 4;
  return { position: new THREE.Vector3(((x - 960) / CABINET_EJECT3D_DISTANCE - meanX) / meanInverse,
    ((540 - y) / CABINET_EJECT3D_DISTANCE - meanY) / meanInverse, z), rotation };
}
function quadCenter(quad: CabinetEjectStageQuad) { return { x: (quad[0] + quad[2] + quad[4] + quad[6]) / 4, y: (quad[1] + quad[3] + quad[5] + quad[7]) / 4 }; }
function depthOnPlane(width: number, x: number, y: number, initialZ: number, rotation: THREE.Quaternion, normal: THREE.Vector3, distance: number) {
  let z = initialZ;
  for (let i = 0; i < 5; i++) {
    const value = normal.dot(centeredPose(width, x, y, z, rotation).position);
    const derivative = normal.dot(centeredPose(width, x, y, z + 1, rotation).position) - value;
    if (Math.abs(derivative) < 0.05) break;
    z -= (value - distance) / derivative;
  }
  return z;
}
function stackPose(plan: CabinetEject3DPlan, index: number, push: number) {
  const mouth = plan.geometry.mouth;
  const startZ = Math.min(-160, CABINET_EJECT3D_DISTANCE * (1 - plan.width * 1.04 / (mouth.width * 0.87)));
  const z = THREE.MathUtils.lerp(startZ, 280, push), y = mouth.y + push * 86;
  const centre = ejectWorldPoint(mouth.x, y, z);
  const facing = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, CABINET_EJECT3D_DISTANCE), centre, new THREE.Vector3(0, 1, 0));
  const rotation = new THREE.Quaternion().setFromRotationMatrix(facing).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.lerp(-1.36, -0.84, push)));
  const pose = centeredPose(plan.width, mouth.x, y, z, rotation);
  pose.position.add(new THREE.Vector3(0, 0, (1 - index) * 8).applyQuaternion(rotation));
  return pose;
}

/** Match bay centres with rigid 2:3 cards. Return their real projected corners,
 * never deform geometry/UVs to fit the legacy nonphysical quadrilaterals. */
export function createCabinetEject3DPlan(geometry: CabinetEject3DGeometry): CabinetEject3DPlan {
  const { mouth, bays } = geometry;
  if (![mouth.x, mouth.y, mouth.width, mouth.height, ...bays.flat()].every(Number.isFinite) || mouth.width <= 0 || mouth.height <= 0 || bays.length !== 3) throw new Error("Invalid committed ejection geometry");
  const measurements = bays.map(q => ({
    x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4,
    width: (Math.hypot(q[2] - q[0], q[3] - q[1]) + Math.hypot(q[4] - q[6], q[5] - q[7])) / 2,
    height: (Math.hypot(q[6] - q[0], q[7] - q[1]) + Math.hypot(q[4] - q[2], q[5] - q[3])) / 2,
    roll: -Math.atan2(q[3] - q[1] + q[5] - q[7], q[2] - q[0] + q[4] - q[6]),
  }));
  const width = measurements.reduce((sum, m) => sum + m.width, 0) / 3 * 0.98;
  if (width < 8 || width > 600) throw new Error("Unsupported committed card dimensions");
  const landings = measurements.map(m => {
    const pitch = -Math.acos(THREE.MathUtils.clamp(m.height / (width * 1.5), 0.27, 0.96));
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, 0, m.roll, "ZYX"));
    const local = [[-0.5, 0.75], [0.5, 0.75], [0.5, -0.75], [-0.5, -0.75]].map(([x, y]) => new THREE.Vector3(x * width, y * width, CABINET_EJECT3D_THICKNESS / 2).applyQuaternion(rotation));
    const inverse = local.map(p => 1 / (CABINET_EJECT3D_DISTANCE - p.z));
    const meanInverse = inverse.reduce((a, b) => a + b, 0) / 4;
    const meanX = local.reduce((sum, p, i) => sum + p.x * inverse[i], 0) / 4;
    const meanY = local.reduce((sum, p, i) => sum + p.y * inverse[i], 0) / 4;
    const position = new THREE.Vector3(((m.x - 960) / CABINET_EJECT3D_DISTANCE - meanX) / meanInverse,
      ((540 - m.y) / CABINET_EJECT3D_DISTANCE - meanY) / meanInverse, 0);
    return { position, rotation };
  }) as [EjectPose, EjectPose, EjectPose];
  const landingQuads = landings.map(p => corners(width, p.rotation, p.position)) as [CabinetEjectStageQuad, CabinetEjectStageQuad, CabinetEjectStageQuad];
  return { geometry, width, height: width * 1.5, landings, landingQuads };
}
export function getCabinetEject3DLandingQuads(geometry: CabinetEject3DGeometry) { return createCabinetEject3DPlan(geometry).landingQuads; }

export function sampleCabinetEject3DPose(plan: CabinetEject3DPlan, index: number, elapsedMs: number): EjectPose {
  const time = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  if (index < 0 || index > 2) throw new Error("Invalid committed card index");
  const landing = plan.landings[index];
  if (time >= CABINET_EJECT3D_DURATION_MS) return { position: landing.position.clone(), rotation: landing.rotation.clone() };
  const push = ease(time / CABINET_EJECT3D_PUSH_MS);
  const flight = THREE.MathUtils.clamp((time - CABINET_EJECT3D_PUSH_MS) / (CABINET_EJECT3D_DURATION_MS - CABINET_EJECT3D_PUSH_MS), 0, 1);
  if (flight <= 0) return stackPose(plan, index, push);
  const start = stackPose(plan, index, 1), startRotation = start.rotation.clone();
  const t = ease(flight);
  const averageRotation = plan.landings[0].rotation.clone().slerp(plan.landings[1].rotation, 0.5).slerp(plan.landings[2].rotation, 1 / 3);
  startRotation.slerp(averageRotation, ease(flight));
  const commonRotation = startRotation.clone();
  // Remain parallel while close together. Once spatially separated, each rigid
  // sheet settles to its own plane in a 90ms sequence without crossing a sibling.
  const settleAt = 1200 + index * CABINET_EJECT3D_STAGGER_MS;
  const settle = ease((time - settleAt) / (CABINET_EJECT3D_DURATION_MS - settleAt));
  startRotation.slerp(landing.rotation, settle);
  startRotation.multiply(new THREE.Quaternion().setFromAxisAngle(up, (index - 1) * 0.16 * Math.sin(Math.PI * t) * settle));
  const from = quadCenter(corners(plan.width, start.rotation, start.position)), to = quadCenter(plan.landingQuads[index]);
  const x = THREE.MathUtils.lerp(from.x, to.x, t), y = THREE.MathUtils.lerp(from.y, to.y, t) + Math.sin(Math.PI * t) * 24;
  const baseZ = 280 * (1 - t) ** 3 + 3 * 500 * (1 - t) ** 2 * t + 3 * 180 * (1 - t) * t * t;
  const centres = plan.landingQuads.map(quadCenter);
  const commonX = THREE.MathUtils.lerp(plan.geometry.mouth.x, centres.reduce((sum, c) => sum + c.x, 0) / 3, t);
  const commonY = THREE.MathUtils.lerp(plan.geometry.mouth.y + 86, centres.reduce((sum, c) => sum + c.y, 0) / 3, t) + Math.sin(Math.PI * t) * 24;
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(commonRotation);
  const planeDistance = normal.dot(centeredPose(plan.width, commonX, commonY, baseZ, commonRotation).position);
  const separatedZ = depthOnPlane(plan.width, x, y, baseZ, startRotation, normal, planeDistance + (1 - index) * 8);
  const z = THREE.MathUtils.lerp(separatedZ, baseZ, ease((t - 0.85) / 0.15));
  // Guide only the rigid mesh's centre through screen space, then unproject at
  // its genuine depth. This prevents perspective at the far-left port from
  // pulling the complete card off the stage while it moves toward the viewer.
  return centeredPose(plan.width, x, y, z, startRotation);
}

export function getCabinetEject3DProjectedQuad(plan: CabinetEject3DPlan, index: number, elapsedMs: number) {
  const pose = sampleCabinetEject3DPose(plan, index, elapsedMs);
  return corners(plan.width, pose.rotation, pose.position);
}
