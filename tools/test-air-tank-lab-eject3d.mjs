import assert from "node:assert/strict";
import { test } from "node:test";
import { register } from "node:module";
register("./ts-alias-loader.mjs", import.meta.url);
const THREE = await import("three");
const { OBB } = await import("three/addons/math/OBB.js");
const { createCabinetEject3DPlan, sampleCabinetEject3DPose, getCabinetEject3DProjectedQuad,
  getCabinetEject3DLandingQuads, CABINET_EJECT3D_DURATION_MS, CABINET_EJECT3D_THICKNESS,
  CABINET_EJECT3D_PUSH_MS, ejectProjectPoint } = await import("@/lib/battle-pixi/presentation/cabinetEject3DGeometry");
const geometry = { mouth: { x: 168, y: 670, width: 204, height: 100 }, bays: [
  [500, 800, 680, 800, 670, 940, 470, 940], [810, 800, 990, 800, 1005, 940, 795, 940], [1120, 800, 1300, 800, 1330, 940, 1130, 940],
] };
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const localCorners = width => [[-0.5, 0.75], [0.5, 0.75], [0.5, -0.75], [-0.5, -0.75]].map(([x, y]) => new THREE.Vector3(width * x, width * y, CABINET_EJECT3D_THICKNESS / 2));

test("every pose is a rigid 2:3 solid; no vertex/UV deformation and no scale changes", () => {
  const plan = createCabinetEject3DPlan(geometry);
  for (let time = 0; time <= 1600; time += 5) for (let i = 0; i < 3; i++) {
    const pose = sampleCabinetEject3DPose(plan, i, time);
    assert.ok([...pose.position.toArray(), ...pose.rotation.toArray()].every(Number.isFinite));
    close(pose.rotation.length(), 1);
    const p = localCorners(plan.width).map(v => v.applyQuaternion(pose.rotation).add(pose.position));
    close(p[0].distanceTo(p[1]), plan.width); close(p[1].distanceTo(p[2]), plan.width * 1.5);
    close(p[1].clone().sub(p[0]).dot(p[3].clone().sub(p[0])), 0, 1e-7);
    const front = new THREE.Vector3(0, 0, CABINET_EJECT3D_THICKNESS / 2).applyQuaternion(pose.rotation).add(pose.position);
    const back = new THREE.Vector3(0, 0, -CABINET_EJECT3D_THICKNESS / 2).applyQuaternion(pose.rotation).add(pose.position);
    close(front.distanceTo(back), CABINET_EJECT3D_THICKNESS);
  }
});

test("all three remain a separated physical stack while pushing through the opening toward +Z and +Y", () => {
  const plan = createCabinetEject3DPlan(geometry);
  for (let time = 0; time <= CABINET_EJECT3D_PUSH_MS; time += 10) {
    const poses = [0, 1, 2].map(i => sampleCabinetEject3DPose(plan, i, time));
    close(poses[0].position.distanceTo(poses[1].position), 8);
    close(poses[1].position.distanceTo(poses[2].position), 8);
    close(Math.abs(poses[0].rotation.dot(poses[2].rotation)), 1);
  }
  const start = sampleCabinetEject3DPose(plan, 1, 0), out = sampleCabinetEject3DPose(plan, 1, 420);
  assert.ok(start.position.z < 0 && out.position.z > 200);
  assert.ok(ejectProjectPoint(out.position).y > ejectProjectPoint(start.position).y + 70);
  const first = getCabinetEject3DProjectedQuad(plan, 1, 0);
  const last = getCabinetEject3DProjectedQuad(plan, 1, 420);
  assert.ok(Math.hypot(last[2] - last[0], last[3] - last[1]) > Math.hypot(first[2] - first[0], first[3] - first[1]) * 1.2);
});

test("the three solid sheets stay separated while fanning from the stack to their bays", () => {
  const plan = createCabinetEject3DPlan(geometry);
  for (let time = 0; time <= CABINET_EJECT3D_DURATION_MS; time += 5) {
    const boxes = [0, 1, 2].map(i => {
      const pose = sampleCabinetEject3DPose(plan, i, time);
      const rotation = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(pose.rotation));
      return new OBB(pose.position, new THREE.Vector3(plan.width / 2, plan.height / 2, CABINET_EJECT3D_THICKNESS / 2), rotation);
    });
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.equal(boxes[i].intersectsOBB(boxes[j]), false, `sheets ${i}/${j} intersect at ${time}ms`);
  }
});

test("rigid landing corners preserve all bay centres and exactly match the final held handoff frame", () => {
  const plan = createCabinetEject3DPlan(geometry), returned = getCabinetEject3DLandingQuads(geometry);
  assert.deepEqual(plan.landingQuads, returned);
  for (let i = 0; i < 3; i++) {
    const q = returned[i], input = geometry.bays[i];
    close((q[0] + q[2] + q[4] + q[6]) / 4, (input[0] + input[2] + input[4] + input[6]) / 4);
    close((q[1] + q[3] + q[5] + q[7]) / 4, (input[1] + input[3] + input[5] + input[7]) / 4);
    assert.deepEqual(getCabinetEject3DProjectedQuad(plan, i, CABINET_EJECT3D_DURATION_MS), q);
    assert.deepEqual(getCabinetEject3DProjectedQuad(plan, i, CABINET_EJECT3D_DURATION_MS + 10000), q);
    const before = getCabinetEject3DProjectedQuad(plan, i, CABINET_EJECT3D_DURATION_MS - 0.001);
    before.forEach((value, k) => close(value, q[k], 1e-5));
  }
  assert.notDeepEqual(returned, geometry.bays, "legacy arbitrary quads are not silently used to warp cards");
});

test("clock seeking is deterministic, reversible, pause-stable and independent of frame history", () => {
  const plan = createCabinetEject3DPlan(geometry);
  const snapshot = [0, 1, 2].map(i => getCabinetEject3DProjectedQuad(plan, i, 733));
  for (let t = 0; t < 1450; t += 1000 / 30) sampleCabinetEject3DPose(plan, 0, t);
  [0, 1, 2].forEach(i => assert.deepEqual(getCabinetEject3DProjectedQuad(plan, i, 733), snapshot[i]));
  [0, 1, 2].forEach(i => assert.deepEqual(getCabinetEject3DProjectedQuad(plan, i, NaN), getCabinetEject3DProjectedQuad(plan, i, 0)));
  assert.throws(() => createCabinetEject3DPlan({ ...geometry, mouth: { ...geometry.mouth, width: 0 } }));
});

test("left-port push remains inside the stage and fan centres progress right without perspective drift", () => {
  const plan = createCabinetEject3DPlan(geometry);
  const previousX = [0, 0, 0];
  for (let time = 0; time <= CABINET_EJECT3D_DURATION_MS; time += 5) for (let i = 0; i < 3; i++) {
    const q = getCabinetEject3DProjectedQuad(plan, i, time);
    for (let k = 0; k < 8; k += 2) {
      assert.ok(q[k] >= 0 && q[k] <= 1920, `${i} clipped horizontally at ${time}: ${q[k]}`);
      assert.ok(q[k + 1] >= 0 && q[k + 1] <= 1080, `${i} clipped vertically at ${time}: ${q[k + 1]}`);
    }
    const x = (q[0] + q[2] + q[4] + q[6]) / 4;
    if (time <= CABINET_EJECT3D_PUSH_MS) assert.ok(Math.abs(x - geometry.mouth.x) < 7, "push left the port column");
    else assert.ok(x >= previousX[i] - 1e-7, "fan moved left away from its target");
    previousX[i] = x;
  }
});
