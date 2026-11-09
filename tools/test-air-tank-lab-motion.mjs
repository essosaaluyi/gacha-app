import assert from "node:assert/strict";
import { test } from "node:test";
import { register } from "node:module";
register("./ts-alias-loader.mjs", import.meta.url);
const { createMotion, advanceMotion, LIMITS, CABINET_LIMITS, CABINET_STRUCTURE_SCALE, CABINET_CARD_SCALE, CARD_RADIUS } = await import("@/lib/air-tank-lab/motion");
const { cardContact, cardBasis, resolveCards } = await import("@/lib/air-tank-lab/collision");
const { createCrackState, triggerCrack, repairCrack, advanceCrack, createCrackSegments, glassPoint, GLASS_RADIUS } = await import("@/lib/air-tank-lab/cracks");
const THREE = await import("three");
const { OBB } = await import("three/addons/math/OBB.js");
const { createWindLayer } = await import("@/lib/air-tank-lab/wind-layer");
const { createCabinetState, applyCabinetSignals } = await import("@/lib/air-tank-lab/cabinet-state");
const { advanceCabinetMotion, CABINET_MIX_DRIVE } = await import("@/lib/air-tank-lab/cabinet-motion");

function assertNoPhysicalIntersections(cards) {
  const boxes = cards.map(c => new OBB(new THREE.Vector3(c.x, c.y, c.z), new THREE.Vector3(0.3, 0.45, 0.009).multiplyScalar(c.scale ?? 1),
    new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(c.rx, c.ry, c.rz)))));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    assert.equal(boxes[i].intersectsOBB(boxes[j]), false, `physical cards ${i}/${j} intersect`);
  }
}

test("same seed and total active duration reproduce across 30/60/120 fps", () => {
  const snapshots = [30, 60, 120].map(fps => {
    const motion = createMotion(30);
    for (let i = 0; i < fps * 20; i++) advanceMotion(motion, 1 / fps, "hot");
    assert.equal(motion.steps, 2400);
    return motion.cards;
  });
  assert.deepEqual(snapshots[0], snapshots[1]);
  assert.deepEqual(snapshots[1], snapshots[2]);
  assert.notDeepEqual(createMotion(30, 1).cards, createMotion(30, 2).cards);
});

test("full card envelope stays inside chamber for all modes, counts and speeds", () => {
  assert.ok(LIMITS.radius + CARD_RADIUS < 2.05);
  assert.ok(LIMITS.height + CARD_RADIUS < 2.66);
  for (const preset of ["normal", "fast", "hot"]) for (const count of [18, 30, 36]) {
    const motion = createMotion(count, 7);
    assertNoPhysicalIntersections(motion.cards);
    for (let i = 0; i < 60 * 90; i++) {
      advanceMotion(motion, 1 / 60, preset, 1.5);
      for (const card of motion.cards) {
        assert.ok(Object.values(card).every(Number.isFinite));
        assert.ok(Math.hypot(card.x, card.z) <= LIMITS.radius + 1e-9);
        assert.ok(Math.abs(card.y) <= LIMITS.height + 1e-9);
      }
      if (i % 12 === 0) assertNoPhysicalIntersections(motion.cards);
    }
    // Motion must retain vertical and depth diversity rather than collapsing to one plane.
    const spread = axis => Math.max(...motion.cards.map(c => c[axis])) - Math.min(...motion.cards.map(c => c[axis]));
    assert.ok(spread("y") > 1.5, `${preset}: vertical spread`);
    assert.ok(spread("z") > 1.2, `${preset}: depth spread`);
    assert.ok(motion.contacts > 0);
    assert.ok(motion.restores / motion.steps < 0.01, `${preset}: excessive safety restores ${motion.restores}/${motion.steps}`);
  }
});

test("collision uses tilted area and thin faces rather than centre-distance spheres", () => {
  const a = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, vx: 0, vy: 0, vz: 0 };
  const parallel = { ...a, z: 0.11 };
  assert.equal(cardContact(a, parallel), null, "nearby parallel cards fit with a face gap");
  const crossing = { ...a, ry: Math.PI / 2, x: 0.2 };
  assert.ok(cardContact(a, crossing), "perpendicular faces intersect");
  const cards = [{ ...a }, crossing];
  assert.equal(resolveCards(cards, cards.map(c => cardBasis(c)), () => {}).unresolved, false);
  assertNoPhysicalIntersections(cards);
  const tilted = { ...a, rx: 0.7, ry: 0.9, rz: 1.2 };
  const basis = cardBasis(tilted);
  const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tilted.rx, tilted.ry, tilted.rz));
  [0, 1, 2, 4, 5, 6, 8, 9, 10].forEach((index, i) => assert.ok(Math.abs(basis[i] - matrix.elements[index]) < 1e-12));
});

test("cracks grow along attached curved branches; repeat, pause, hidden gap, repair and reset are stable", () => {
  const state = createCrackState();
  triggerCrack(state); advanceCrack(state, 0.07); const age = state.age;
  triggerCrack(state); assert.equal(state.age, age, "repeated clicks do not restart active growth");
  advanceCrack(state, 0); advanceCrack(state, NaN); assert.equal(state.age, age);
  advanceCrack(state, 30); assert.ok(state.age <= age + 0.1 + 1e-9);
  for (let i = 0; i < 100; i++) advanceCrack(state, 1 / 60);
  assert.equal(state.phase, "cracked"); repairCrack(state); assert.deepEqual(state, createCrackState());
  const segments = createCrackSegments(); assert.deepEqual(segments, createCrackSegments());
  assert.ok(segments.some(s => s.width < 0.016));
  for (const s of segments) {
    assert.ok(s.end > s.born && s.end <= 1.35);
    for (const point of [glassPoint(s.u1, s.y1), glassPoint(s.u2, s.y2)]) {
      assert.ok(point.every(Number.isFinite)); assert.ok(Math.abs(Math.hypot(point[0], point[2]) - GLASS_RADIUS) < 1e-12); assert.ok(Math.abs(point[1]) <= 2.48);
    }
    if (s.born > 0.16) assert.ok(segments.some(parent => parent !== s && Math.abs(parent.u2 - s.u1) < 1e-9 && Math.abs(parent.y2 - s.y1) < 1e-9 && Math.abs(parent.end - s.born) < 1e-9));
  }
});

test("3D wind trails are finite, bounded, pause-stable and repeat across frame rates", () => {
  const snapshots = [30, 60, 120].map(fps => {
    const root = new THREE.Group();
    const wind = createWindLayer(root);
    for (let i = 1; i <= 8 * fps; i++) wind.update(i / fps, "hot", false, 1);
    const layers = root.children[0].children;
    const snapshot = layers.map(layer => Array.from(layer.geometry.attributes.position.array));
    snapshot.forEach(values => {
      assert.ok(values.every(Number.isFinite));
      for (let i = 0; i < values.length; i += 3) { assert.ok(Math.hypot(values[i], values[i + 2]) < 1.91); assert.ok(Math.abs(values[i + 1]) < 2.45); }
    });
    wind.update(8, "hot", false, 1);
    layers.forEach((layer, i) => assert.deepEqual(Array.from(layer.geometry.attributes.position.array), snapshot[i]));
    wind.reset(); wind.update(0, "normal", true, 1);
    assert.equal(layers[1].geometry.drawRange.count, 90);
    wind.dispose(); assert.equal(root.children.length, 0);
    return snapshot;
  });
  assert.deepEqual(snapshots[0], snapshots[1]); assert.deepEqual(snapshots[1], snapshots[2]);
});

test("invalid/hidden gaps cannot cause unbounded integration or NaN", () => {
  const motion = createMotion(24);
  advanceMotion(motion, NaN); advanceMotion(motion, -2); advanceMotion(motion, Infinity);
  assert.equal(motion.steps, 0);
  advanceMotion(motion, 100, "normal");
  assert.equal(motion.steps, 12);
});

test("default shuffle keeps circulating through all four height bands over three minutes", () => {
  for (const preset of ["normal", "fast", "hot"]) {
    const motion = createMotion(30);
    const bands = [0, 0, 0, 0];
    let samples = 0;
    let frozenFrames = 0;
    for (let i = 0; i < 180 * 60; i++) {
      const before = motion.restores;
      advanceMotion(motion, 1 / 60, preset);
      frozenFrames = motion.restores > before ? frozenFrames + 1 : 0;
      assert.ok(frozenFrames < 4, `${preset}: sustained frozen poses`);
      if (i > 20 * 60 && i % 60 === 0) {
        samples++;
        motion.cards.forEach(c => bands[Math.min(3, Math.floor((c.y + LIMITS.height) / (2 * LIMITS.height) * 4))]++);
      }
    }
    for (const band of bands) assert.ok(band / samples > 4 && band / samples < 12, `${preset}: height band average ${band / samples}`);
  }
});

test("cabinet signals preserve impacts across mix/tone changes and reset on zero/inactive", () => {
  const state = createCabinetState();
  applyCabinetSignals(state, { active: true, mixing: false, crackToken: 5 });
  assert.equal(state.crack.phase, "growing"); advanceCrack(state.crack, 0.1);
  applyCabinetSignals(state, { active: true, mixing: true, tone: "hot", crackToken: 5 });
  assert.equal(state.crack.age, 0.1); assert.equal(state.hot, true); assert.equal(state.mixing, true);
  applyCabinetSignals(state, { active: true, mixing: true, crackToken: 6 });
  assert.equal(state.crack.age, 0);
  applyCabinetSignals(state, { active: true, mixing: false, crackToken: 0 }); assert.equal(state.crack.phase, "clean");
  applyCabinetSignals(state, { active: true, mixing: true, crackToken: 7 });
  assert.equal(applyCabinetSignals(state, { active: false, mixing: false, crackToken: 7 }).resetMotion, true);
  assert.equal(state.crack.phase, "clean"); assert.equal(state.token, 0);
  applyCabinetSignals(state, { active: true, mixing: false, crackToken: 7 }); assert.equal(state.crack.phase, "growing");
  applyCabinetSignals(state, { active: true, mixing: false, crackToken: NaN }); assert.equal(state.crack.phase, "clean");
});

test("embedded 30 enlarged cards stay clear through 30s idle and twelve real 2s mix/idle cycles", context => {
  // Embedded solids are 0.9 x 1.35, exactly 1.5x. Lab remains 0.6 x 0.9.
  assert.equal(CABINET_CARD_SCALE, 1.5);
  assert.ok(CABINET_LIMITS.radius + CARD_RADIUS * CABINET_CARD_SCALE < 2.05 * CABINET_STRUCTURE_SCALE.x);
  assert.ok(CABINET_LIMITS.height + CARD_RADIUS * CABINET_CARD_SCALE < 2.51 * CABINET_STRUCTURE_SCALE.y);
  const motion = createMotion(30, 1203, CABINET_LIMITS, CABINET_CARD_SCALE);
  assertNoPhysicalIntersections(motion.cards);
  let frozenFrames = 0, maxFrozenFrames = 0, frames = 0;
  const tick = (mixing, fps) => {
      const before = motion.cards.map(c => [c.x, c.y, c.z, c.rx, c.ry, c.rz]);
      advanceCabinetMotion(motion, 1 / fps, mixing);
      const distance = motion.cards.reduce((sum, c, i) => sum + Math.hypot(c.x - before[i][0], c.y - before[i][1], c.z - before[i][2], c.rx - before[i][3], c.ry - before[i][4], c.rz - before[i][5]), 0);
      frozenFrames = distance < 1e-8 ? frozenFrames + 1 : 0; maxFrozenFrames = Math.max(maxFrozenFrames, frozenFrames);
      assert.ok(frozenFrames < 4, "embedded global freeze");
      for (const card of motion.cards) {
        assert.ok(Object.values(card).every(Number.isFinite));
        const basis = cardBasis(card);
        for (const x of [-0.3, 0.3]) for (const y of [-0.45, 0.45]) for (const z of [-0.009, 0.009]) {
          const px = card.x + (basis[0] * x + basis[3] * y + basis[6] * z) * card.scale;
          const py = card.y + (basis[1] * x + basis[4] * y + basis[7] * z) * card.scale;
          const pz = card.z + (basis[2] * x + basis[5] * y + basis[8] * z) * card.scale;
          assert.ok(Math.hypot(px, pz) <= CABINET_LIMITS.chamberRadius + 1e-8);
          assert.ok(Math.abs(py) <= CABINET_LIMITS.chamberHalfHeight + 1e-8);
        }
      }
      assertNoPhysicalIntersections(motion.cards); frames++;
  };
  for (let i = 0; i < 30 * 24; i++) tick(false, 24);
  for (let cycle = 0; cycle < 12; cycle++) {
    for (let i = 0; i < 2 * 48; i++) tick(true, 48);
    for (let i = 0; i < 1.5 * 24; i++) tick(false, 24);
  }
  assert.equal(motion.cards.length, 30); assert.ok(motion.cards.every(c => c.scale === 1.5));
  assert.ok(motion.contacts > 0);
  assert.ok(Math.max(...motion.cards.map(c => c.y)) - Math.min(...motion.cards.map(c => c.y)) > 3);
  context.diagnostic(JSON.stringify({ idleWarmupSeconds: 30, mixSeconds: 2, idleBetweenSeconds: 1.5, cycles: 12, checkedFrames: frames, maxFrozenFrames, fullSafetyRestores: motion.restores, cards: 30, scale: 1.5 }));
});

test("two-second Draw pulse has clear swirl, height return and tumble; deterministic at 30/60/120fps", () => {
  const snapshots = [30, 60, 120].map(fps => {
    const motion = createMotion(30, 1203, CABINET_LIMITS, CABINET_CARD_SCALE);
    const initial = structuredClone(motion.cards);
    let length = 0, turn = 0, vertical = 0, tumble = 0;
    for (let i = 0; i < 2 * fps; i++) {
      const before = structuredClone(motion.cards);
      advanceCabinetMotion(motion, 1 / fps, true);
      assertNoPhysicalIntersections(motion.cards);
      motion.cards.forEach((c, j) => {
        const old = before[j]; length += Math.hypot(c.x - old.x, c.y - old.y, c.z - old.z);
        const angle = Math.atan2(c.z, c.x) - Math.atan2(old.z, old.x);
        turn += Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
        vertical += Math.abs(c.y - old.y); tumble += Math.hypot(c.rx - old.rx, c.ry - old.ry, c.rz - old.rz);
      });
    }
    assert.equal(motion.steps, 480);
    assert.ok(length / 30 > 4, `path ${length / 30}`);
    assert.ok(turn / 30 > 3.5, `turn ${turn / 30}`);
    assert.ok(vertical / 30 > 1.6, `vertical ${vertical / 30}`);
    assert.ok(tumble / 30 > 4.5, `tumble ${tumble / 30}`);
    const idle = createMotion(30, 1203, CABINET_LIMITS, CABINET_CARD_SCALE);
    for (let i = 0; i < 2 * fps; i++) advanceCabinetMotion(idle, 1 / fps, false);
    const idleTravel = idle.cards.reduce((sum, c, j) => sum + Math.hypot(c.x - initial[j].x, c.y - initial[j].y, c.z - initial[j].z), 0);
    const mixedTravel = motion.cards.reduce((sum, c, j) => sum + Math.hypot(c.x - initial[j].x, c.y - initial[j].y, c.z - initial[j].z), 0);
    assert.ok(mixedTravel > idleTravel * 2);
    return motion.cards;
  });
  assert.deepEqual(snapshots[0], snapshots[1]); assert.deepEqual(snapshots[1], snapshots[2]);
});

test("wind mode switches preserve ribbon phase without jumps", () => {
  const root = new THREE.Group(); const wind = createWindLayer(root);
  wind.update(1, "normal", true, 1);
  const before = Array.from(root.children[0].children[2].geometry.attributes.position.array);
  wind.update(1, "fast", true, 1, CABINET_MIX_DRIVE);
  assert.deepEqual(Array.from(root.children[0].children[2].geometry.attributes.position.array), before);
  wind.update(1.1, "fast", true, 1, CABINET_MIX_DRIVE);
  assert.ok(root.children[0].children.every(layer => Array.from(layer.geometry.attributes.position.array).every(Number.isFinite)));
  wind.dispose();
});
