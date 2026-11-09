import assert from "node:assert/strict";
import { test } from "node:test";
import { projectPixiPointToCabinet, projectPixiQuadToCabinet, projectCabinetQuadToPixi, CABINET_AIR_MOUTH } from "../lib/battle-pixi/presentation/cabinetTableGeometry.ts";

test("handoff projects the pitched canvas into fixed cabinet space at desktop and portrait scales", () => {
  for (const scale of [1, 0.75, 0.203125]) {
    const root = { left: 12, top: 34, width: 1920 * scale, height: 1080 * scale };
    const surface = { left: root.left + 450 * scale, top: root.top + 710 * scale,
      width: 984 * scale, height: 730 * scale };
    const point = projectPixiPointToCabinet({ x: 132, y: 189 }, surface, root, { width: 1200, height: 500 });
    assert.ok(Math.abs(point.x - (450 + 132 / 1200 * 984)) < 0.00001);
    assert.ok(Math.abs(point.y - (710 + 189 / 500 * 730)) < 0.00001);
  }
});

test("hidden/unmounted canvas geometry does not emit a bogus handoff", () => {
  assert.equal(projectPixiPointToCabinet({ x: 0, y: 0 },
    { left: 0, top: 0, width: 0, height: 0 }, { left: 0, top: 0, width: 1920, height: 1080 },
    { width: 1200, height: 500 }), null);
});

import { activeDelay, createCabinetDeal, createPresentationClock, cabinetFlight } from "../lib/battle-pixi/presentation/cabinetDealSequence.ts";

function runtime(wait = 0, options = {}) {
  let now = 0;
  const timers = [];
  const trace = [];
  const state = { blocked: false, cancelled: false, ready: true, commitOK: true, video: false };
  const clock = { now: () => now, schedule: (fn, delay) => timers.push({ at: now + delay, fn }),
    blocked: () => state.blocked || state.video, cancelled: () => state.cancelled };
  const control = createCabinetDeal({ ...clock, minimumCommitWait: wait,
    commit: () => { trace.push(["commit", now]); return state.commitOK; },
    handReady: () => state.ready,
    beforeEject: () => { trace.push(["preflight", now]); },
    phase: phase => trace.push([phase, now]),
    transfer: () => trace.push(["transfer", now]),
    ready: () => trace.push(["arrived", now]),
    ...options,
  });
  return { state, trace, control, clock, advance(to) {
    while (timers.length) {
      timers.sort((a, b) => a.at - b.at);
      if (timers[0].at > to) break;
      const timer = timers.shift(); now = timer.at; timer.fn();
    }
    now = to;
  } };
}

test("one draw commits once, mixes for 2 seconds and transfers automatically without another press", () => {
  const run = runtime();
  run.advance(1999);
  assert.equal(run.trace.some(([event]) => event === "ejecting"), false);
  run.advance(3000);
  assert.deepEqual(run.trace.filter(([event]) => ["commit", "ejecting", "transfer", "arrived"].includes(event)),
    [["commit", 0], ["ejecting", 2000], ["transfer", 2240], ["arrived", 2980]]);
});

test("minimum lever wait overlaps shuffle rather than adding another two seconds", () => {
  const run = runtime(1500);
  run.advance(3000);
  assert.deepEqual(run.trace.filter(([event]) => ["commit", "ejecting", "transfer"].includes(event)),
    [["commit", 1500], ["ejecting", 2000], ["transfer", 2240]]);
});

test("a longer lever wait does not reroll or add an extra shuffle after commitment", () => {
  const run = runtime(3000);
  run.advance(4000);
  assert.deepEqual(run.trace.filter(([event]) => ["commit", "ejecting", "transfer"].includes(event)),
    [["commit", 3000], ["ejecting", 3000], ["transfer", 3240]]);
});

test("overview/hidden pauses preserve the hand through long inspections without ejecting or recommitting", () => {
  const run = runtime();
  run.advance(1000); run.state.blocked = true; run.advance(61000);
  assert.equal(run.trace.some(([event]) => event === "ejecting"), false);
  run.state.blocked = false; run.advance(64000);
  assert.equal(run.trace.filter(([event]) => event === "commit").length, 1);
  assert.equal(run.trace.filter(([event]) => event === "transfer").length, 1);
});

test("bonus video blocks pre-ejection and collection/unmount cancels the queued release", () => {
  const run = runtime();
  run.advance(1950); run.state.video = true; run.advance(22000);
  assert.equal(run.trace.some(([event]) => event === "transfer"), false);
  run.state.cancelled = true; run.advance(30000);
  assert.equal(run.trace.some(([event]) => event === "transfer"), false);
});

test("explicit cancellation stops all later callbacks", () => {
  const run = runtime();
  run.control.cancel(); run.advance(10000);
  assert.equal(run.trace.some(([event]) => event === "transfer"), false);
});

test("a rejected draw never ejects cards and does not retry payment", () => {
  const run = runtime(100);
  run.state.commitOK = false; run.advance(10000);
  assert.equal(run.trace.filter(([event]) => event === "commit").length, 1);
  assert.equal(run.trace.some(([event]) => event === "transfer"), false);
});

test("active presentation timers pause watchdog/reveal time during hidden inspection", () => {
  const run = runtime();
  let completed = 0;
  activeDelay(run.clock, 15000, () => completed++);
  run.advance(1000); run.state.blocked = true; run.advance(61000);
  assert.equal(completed, 0);
  run.state.blocked = false; run.advance(77000);
  assert.equal(completed, 1);
});

test("DOM/Pixi flight share one active clock and cannot jump during a long overview or hidden RAF gap", () => {
  let raw = 0; let blocked = false; let cancelled = false;
  const frames = [];
  const shared = createPresentationClock(() => raw, () => blocked);
  let pixiProgress = 0;
  cabinetFlight({ now: shared.now, blocked: () => blocked, cancelled: () => cancelled,
    schedule: fn => frames.push(fn) }, 560, progress => { pixiProgress = progress; });
  const frame = () => frames.shift()?.();
  raw = 240; frame();
  const domTime = shared.now();
  assert.equal(pixiProgress, domTime / 560);
  blocked = true; shared.synchronize();
  raw = 60240; frame();
  assert.equal(shared.now(), domTime);
  assert.equal(pixiProgress, domTime / 560);
  blocked = false; shared.synchronize();
  raw = 60340; frame();
  assert.equal(pixiProgress, shared.now() / 560);
  cancelled = true;
  const before = pixiProgress;
  raw = 61000; frame();
  assert.equal(pixiProgress, before);
});


test("rigid3D landing corners roundtrip through actual pitched canvas at responsive scales", () => {
  assert.deepEqual(CABINET_AIR_MOUTH,{x:168,y:670,width:204,height:100});
  const quad=[210,140,400,142,385,300,195,298];
  for(const scale of [1,.75,.203125]) {
    const cabinet={left:17,top:31,width:1920*scale,height:1080*scale};
    const surface={left:17+450*scale,top:31+710*scale,width:984*scale,height:730*scale};
    const stage={width:1200,height:500};
    const projected=projectPixiQuadToCabinet(quad,surface,cabinet,stage);
    const inverse=projectCabinetQuadToPixi(projected,surface,cabinet,stage);
    inverse.forEach((value,index)=>assert.ok(Math.abs(value-quad[index])<1e-9));
  }
  assert.equal(projectCabinetQuadToPixi(quad,{left:0,top:0,width:0,height:0},{left:0,top:0,width:1920,height:1080},{width:1200,height:500}),null);
});


test("physical3D owns all1450ms and waits for landing readiness before a single atomic transfer",()=>{
  let ready=false;const run=runtime(0,{flightDurationMs:1450,landingReady:()=>ready});
  run.advance(3450);assert.equal(run.trace.some(([event])=>event==="transfer"),false);
  ready=true;run.advance(3500);
  const events=run.trace.filter(([event])=>event==="transfer"||event==="arrived");
  assert.equal(events.length,2);assert.equal(events[0][1],events[1][1]);
});
