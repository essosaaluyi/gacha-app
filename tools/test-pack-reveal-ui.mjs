import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../components/gacha/PackReveal3D.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
} }).outputText;
const cropExports = {};
vm.runInNewContext(`(function(exports){${ts.transpileModule(readFileSync(new URL("../components/gacha/pack-reveal/cardDisplayCrop.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText}\n})`)(cropExports);

function elements(tree, predicate, found = []) {
  if (Array.isArray(tree)) tree.forEach(child => elements(child, predicate, found));
  else if (tree && typeof tree === "object" && tree.props) {
    if (predicate(tree)) found.push(tree);
    elements(tree.props.children, predicate, found);
  }
  return found;
}

// Exercise the real component and its event/effect closures. Only React's hook
// scheduler, CSS, browser timers/media, and the GPU boundary are substituted.
function harness({ reduced = false } = {}) {
  const hooks = [], effects = [], cleanups = [];
  const timers = new Map();
  const host = { attached: false };
  let cursor = 0, nextTimer = 1, tree, completed = 0, build, resolveBuild, rejectBuild;
  const scene = { advances: [], tilts: [], disposed: 0,
    advance(done) { this.advances.push(done); },
    tilt(x, y) { this.tilts.push([x, y]); },
    dispose() { this.disposed++; host.attached = false; },
  };
  const react = {
    useRef(value) { const i = cursor++; return hooks[i] ??= { current: value }; },
    useState(value) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = value;
      return [hooks[i], value => { hooks[i] = typeof value === "function" ? value(hooks[i]) : value; }];
    },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!(i in hooks) || deps.some((dep, j) => dep !== hooks[i][j])) effects.push(effect);
      hooks[i] = deps;
    },
  };
  const exports = {};
  vm.runInNewContext(`(function(require,exports){${compiled}\n})`, {
    AbortController,
    window: {
      matchMedia: () => ({ matches: reduced }),
      setTimeout(callback) { const id = nextTimer++; timers.set(id, callback); return id; },
      clearTimeout(id) { timers.delete(id); },
    },
  })(id => {
    if (id === "react") return react;
    if (id === "./pack-reveal/cardDisplayCrop") return cropExports;
    if (id.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (id === "@/lib/cards/cardAssets") return { resolvePlayerCardBack: image => image || "/existing-back.png" };
    if (id === "./pack-reveal/scene") return { __esModule: true, createRevealScene(...args) {
      build = args;
      return new Promise((resolve, reject) => { resolveBuild = () => { host.attached = true; resolve(scene); }; rejectBuild = reject; });
    } };
    return require(id);
  }, exports);
  const render = () => {
    cursor = 0;
    tree = exports.default({ cards: [
      { name: "First", rarity: "R", image: "/first.webp" },
      { name: "Second", rarity: "UR", image: "/second.webp" },
    ], onComplete: () => completed++ });
    elements(tree, el => el.type === "div" && el.props.ref).forEach(el => { el.props.ref.current = host; });
    effects.splice(0).forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); });
    return tree;
  };
  const settle = async () => { await new Promise(resolve => setImmediate(resolve)); render(); };
  const stage = () => elements(tree, el => el.props.role === "button")[0].props;
  const buttons = () => elements(tree, el => el.type === "button");
  const state = () => tree.props;
  render();
  return {
    scene, host, render, settle, stage, state,
    get build() { return build; }, get completed() { return completed; }, get timerCount() { return timers.size; },
    next: () => buttons()[0].props.onClick(), skip: () => buttons()[1].props.onClick(),
    resolveBuild: () => resolveBuild(), rejectBuild: () => rejectBuild(new Error("Texture load failed")),
    expire: () => { [...timers.values()].forEach(callback => callback()); },
    unmount: () => cleanups.splice(0).reverse().forEach(cleanup => cleanup()),
    async ready() { await settle(); resolveBuild(); await settle(); build[4](); render(); },
    slideEnd() { const done = scene.advances.at(-1); assert.ok(done); done(); render(); },
  };
}

function pointer(x = 0, y = 0) {
  return { pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y, preventDefault() {},
    currentTarget: { setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 500 }) } };
}

test("sub-eight-pixel tap advances exactly one ordered card", async () => {
  const h = harness(); await h.ready();
  h.stage().onPointerDown(pointer());
  h.stage().onPointerMove(pointer(3, 2));
  h.stage().onPointerUp(pointer(4, 2));
  assert.equal(h.scene.advances.length, 1);
  h.slideEnd();
  assert.equal(h.state()["data-current-index"], 1);
  assert.equal(h.state()["data-rarity"], "UR");
  h.unmount();
});

test("drag remains a drag after returning home, and release eases tilt home", async () => {
  const h = harness(); await h.ready();
  h.stage().onPointerDown(pointer());
  h.stage().onPointerMove(pointer(60, -30));
  h.stage().onPointerMove(pointer(1, 0));
  h.stage().onPointerUp(pointer(1, 0));
  assert.equal(h.scene.advances.length, 0);
  assert.deepEqual(h.scene.tilts[0], [60 / 85, -30 / 85]);
  assert.deepEqual(h.scene.tilts.at(-1), [0, 0]);
  // Release displacement still protects against a missing/coalesced move event.
  h.stage().onPointerDown(pointer()); h.stage().onPointerUp(pointer(20));
  assert.equal(h.scene.advances.length, 0);
  h.unmount();
});

test("pointercancel and lost capture cannot advance", async () => {
  const h = harness(); await h.ready();
  h.stage().onPointerDown(pointer()); h.stage().onPointerCancel(pointer());
  h.stage().onPointerUp(pointer());
  h.stage().onPointerDown(pointer()); h.stage().onLostPointerCapture();
  h.stage().onPointerUp(pointer());
  assert.equal(h.scene.advances.length, 0);
  assert.deepEqual(h.scene.tilts.at(-1), [0, 0]);
  h.unmount();
});

test("rapid Next is locked during slide; final card completes only once", async () => {
  const h = harness(); await h.ready();
  h.next(); h.next(); h.next(); h.render(); h.next();
  assert.equal(h.scene.advances.length, 1);
  assert.equal(h.state()["data-phase"], "sliding");
  h.slideEnd(); h.next(); h.next();
  assert.equal(h.scene.advances.length, 2);
  h.slideEnd(); h.skip(); h.skip();
  assert.equal(h.completed, 1);
  assert.equal(h.scene.disposed, 1);
  h.unmount();
});

test("intro ignores tap and Next; skip aborts and disposes a late async build", async () => {
  const h = harness(); await h.settle();
  h.stage().onPointerDown(pointer()); h.stage().onPointerUp(pointer()); h.next();
  assert.equal(h.scene.advances.length, 0);
  h.skip(); h.skip();
  assert.equal(h.completed, 1);
  assert.equal(h.build[6].aborted, true);
  assert.equal(h.timerCount, 0);
  h.resolveBuild(); await h.settle();
  assert.equal(h.scene.disposed, 1);
  assert.equal(h.host.attached, false);
  h.unmount();
});

test("slow asset timeout gives usable fallback and rejects a late WebGL attachment", async () => {
  const h = harness(); await h.settle();
  h.expire(); h.render();
  assert.equal(h.state()["data-renderer"], "fallback");
  assert.equal(h.state()["data-phase"], "ready");
  assert.equal(h.build[6].aborted, true);
  assert.equal(h.timerCount, 0);
  h.resolveBuild(); await h.settle();
  assert.equal(h.host.attached, false);
  assert.equal(h.scene.disposed, 1);
  h.next(); h.render();
  assert.equal(h.state()["data-current-index"], 1);
  h.next(); h.skip();
  assert.equal(h.completed, 1);
  assert.equal(h.scene.advances.length, 0);
  h.unmount();
});

test("texture rejection exposes fallback; unmount aborts outstanding scene work", async () => {
  const h = harness(); await h.settle(); h.rejectBuild(); await h.settle();
  assert.equal(h.state()["data-renderer"], "fallback");
  assert.equal(h.state()["data-phase"], "ready");
  h.unmount();
  const pending = harness(); await pending.settle(); pending.unmount();
  assert.equal(pending.build[6].aborted, true);
  pending.resolveBuild(); await pending.settle();
  assert.equal(pending.host.attached, false);
  assert.equal(pending.scene.disposed, 1);
  assert.equal(pending.completed, 0);
});

test("reduced-motion preference reaches scene and keyboard ignores held-key repeats", async () => {
  const h = harness({ reduced: true }); await h.ready();
  assert.equal(h.build[3], true);
  assert.equal(h.state()["data-reduced"], true);
  h.stage().onKeyDown({ key: "Enter", repeat: true, preventDefault() {} });
  assert.equal(h.scene.advances.length, 0);
  h.stage().onKeyDown({ key: " ", repeat: false, preventDefault() {} });
  assert.equal(h.scene.advances.length, 1);
  h.unmount();
});

test("desktop hover visibly requests gentle tilt and leave returns home without advance", async () => {
  const h = harness(); await h.ready();
  h.stage().onPointerMove({ ...pointer(350, 400), pointerType: "mouse", buttons: 0 });
  assert.equal(h.scene.tilts.at(-1)[0], .32);
  assert.ok(Math.abs(h.scene.tilts.at(-1)[1] - .24) < 1e-6);
  h.stage().onPointerLeave();
  assert.deepEqual(h.scene.tilts.at(-1), [0, 0]);
  assert.equal(h.scene.advances.length, 0);
  h.unmount();
});

test("display crop removes inspected R1/R2 matte while retaining their bronze outer rules", async () => {
  const sharp = require("sharp");
  for (const id of ["R1", "R2"]) {
    const crop = cropExports.getCardDisplayCrop(`/images/cards/player/${id}/card.webp`);
    const left = Math.round(crop.left * 600), top = Math.round(crop.top * 900);
    const width = 600 - left - Math.round(crop.right * 600), height = 900 - top - Math.round(crop.bottom * 900);
    const { data, info } = await sharp(fileURLToPath(new URL(`../public/images/cards/player/${id}/card.webp`, import.meta.url))).extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
    const pixel = (x, y) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3));
    assert.ok(Math.max(...pixel(300 - left, 0)) < 30, `${id} upper pale matte removed`);
    assert.ok(Math.max(...pixel(0, 450 - top)) < 30, `${id} left pale matte removed`);
    const bronze = pixel(15 - left, 450 - top);
    assert.ok(bronze[0] > bronze[1] && bronze[1] > bronze[2], `${id} copper rule preserved`);
  }
  assert.notEqual(cropExports.getCardDisplayCrop("/images/cards/player/UR1/card.webp"), null);
  assert.equal(cropExports.getCardDisplayCrop("/images/cards/player/card-back-latest.png"), null);
});
