import assert from "node:assert/strict";
import { test } from "node:test";
import { register } from "node:module";
register("./ts-alias-loader.mjs", import.meta.url);

const { CABINET_PLAYER_DOCK_BACK_RECTS, CABINET_PLAYER_DOCK_MOUTH, CABINET_PLAYER_DOCK_CARD } =
  await import("@/components/battle/cabinet/CabinetPlayerDock.geometry");
const { sampleTwoStepCard, TWO_STEP_DEAL_MS } =
  await import("@/lib/battle-pixi/presentation/cabinetTwoStepMotion");
const { sampleCabinetManualReveal, cabinetPresentQuad, CABINET_PRESENT_REVEAL_MS } =
  await import("@/lib/battle-pixi/presentation/cabinetManualReveal");

const width = (q) => Math.hypot(q[2] - q[0], q[3] - q[1]);
const height = (q) => Math.hypot(q[6] - q[0], q[7] - q[1]);
const centre = (q) => ({ x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4 });

test("a waiting card is half inside the mouth, stepped down, never offset sideways", () => {
  const r = CABINET_PLAYER_DOCK_BACK_RECTS;
  assert.equal(r[0].y + r[0].height / 2, CABINET_PLAYER_DOCK_MOUTH.y1, "front card's midline sits on the lip");
  assert.equal(r[0].x, r[1].x); assert.equal(r[1].x, r[2].x);
  assert.ok(r[0].y < r[1].y && r[1].y < r[2].y, "the one in front is highest");
  assert.equal(r[0].width / r[0].height, 168 / 252);
});

test("coming out of the mouth a card keeps its shape and the one behind comes further", () => {
  const target = [700, 760, 900, 760, 900, 1060, 700, 1060];
  const shape = (i, t) => { const q = sampleTwoStepCard(i, t, target).quad; return width(q) / height(q); };
  const rest = shape(0, 0);
  for (const t of [0, 60, 140, 240, 340, 440, 479]) {
    assert.ok(Math.abs(shape(0, t) - rest) < 1e-9, `shape held at ${t}ms`);
  }
  const tops = [0, 1, 2].map((i) => Math.min(...[1, 3, 5, 7].map((k) => sampleTwoStepCard(i, 480 + i * 100, target).quad[k])));
  assert.ok(tops[0] < tops[1] && tops[1] < tops[2], "each card out further than the one above");
  assert.ok(sampleTwoStepCard(0, 0, target).masked, "masked while inside");
  assert.ok(!sampleTwoStepCard(0, 600, target).masked, "mask dropped once clear");
});

test("the flight bends instead of turning a corner", () => {
  const target = [700, 760, 900, 760, 900, 1060, 700, 1060];
  const at = (t) => centre(sampleTwoStepCard(0, t, target).quad);
  const a = at(480), b = at(TWO_STEP_DEAL_MS);
  let worst = 0;
  for (let t = 480; t <= TWO_STEP_DEAL_MS; t += 10) {
    const p = at(t);
    const u = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    worst = Math.max(worst, Math.hypot(p.x - (a.x + (b.x - a.x) * u), p.y - (a.y + (b.y - a.y) * u)));
  }
  // A quadratic sits bow/2 off the straight line at its midpoint, so -190 buys ~95px.
  assert.ok(worst > 60, `path bows ${worst.toFixed(0)}px off the straight line`);
  console.log(`    flight bows ${worst.toFixed(0)}px off the straight line`);
});

test("waiting cards have the same size and height above different bays", () => {
  const bays = [
    [222, 156, 404, 156, 373, 292, 183, 292],
    [508, 156, 689, 156, 707, 292, 492, 292],
    [796, 156, 977, 156, 1013, 292, 823, 292],
  ];
  const waiting = bays.map(bay => cabinetPresentQuad(bay, 1.787, 61));
  for (const quad of waiting) {
    assert.ok(Math.abs(width(quad) - 197) < 0.001);
    assert.equal(quad[1], waiting[0][1]);
    assert.ok(quad[5] < 292, "bottom edge stays above the bay's front edge");
  }
});

test("a click turns the card first, then sets it down", () => {
  const rest = [222, 156, 404, 156, 373, 292, 183, 292];
  const present = cabinetPresentQuad(rest, 1.787, 61);
  const start = sampleCabinetManualReveal(rest, 0, 1.787, 61, true);
  assert.deepEqual(start.quad, present, "starts where the card was waiting");
  assert.equal(sampleCabinetManualReveal(rest, 179, 1.787, 61, true).face, false);
  assert.equal(sampleCabinetManualReveal(rest, 180, 1.787, 61, true).face, true);
  const edge = sampleCabinetManualReveal(rest, 180, 1.787, 61, true);
  assert.ok(width(edge.quad) / width(present) < 0.05, "edge-on at the face swap");
  const turned = sampleCabinetManualReveal(rest, 320, 1.787, 61, true);
  // By then it has started down, so compare against its own un-folded width.
  const natural = width(rest) + (width(present) - width(rest)) * turned.raised;
  assert.ok(width(turned.quad) / natural > 0.99, "flat again by 320ms");
  assert.ok(turned.raised > 0.4, "still most of the way up when the turn finishes");
  const floating = sampleCabinetManualReveal(rest, 460, 1.787, 61, true);
  assert.ok(floating.quad[1] < turned.quad[1]);
  const contact = sampleCabinetManualReveal(rest, 610, 1.787, 61, true);
  assert.deepEqual(contact.quad.slice(4), rest.slice(4));
  assert.ok(contact.quad[1] < rest[1]);
  console.log(`    turn done at 320ms with the card still ${(turned.raised * 100).toFixed(0)}% up`);
  assert.deepEqual(sampleCabinetManualReveal(rest, CABINET_PRESENT_REVEAL_MS, 1.787, 61, true).quad, rest);
});
