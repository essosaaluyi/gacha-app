import assert from "node:assert/strict";
import { test } from "node:test";
import { register, createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
register("./ts-alias-loader.mjs", import.meta.url);
const store = await import("@/lib/battle-pixi/state/bonusPresentationStore");
const signals = await import("@/lib/battle-pixi/state/cabinetSignalStore");
const source = readFileSync(new URL("../components/battle/BonusOverlay.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("bonus.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbacks = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && ["finishOpening", "completeOpeningStage"].includes(node.name.getText(ast))) {
    callbacks.push(`const ${node.getText(ast)};`);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const complete = vm.runInNewContext(`(function(){${callbacks.join("\n")};return completeOpeningStage;})()`,
  { ...store, ...signals, useCallback: fn => fn });

test("superMax naturally/explicitly advances main -> freeze -> dedicated MAX -> unlocked completion", () => {
  store.hideBonusOverlay(); signals.clearCabinetSignals();
  store.armBonusOpening("superMax"); store.showBonusOpening();
  complete();
  assert.equal(store.getBonusPresentationState().bonusOpeningStage, "freeze");
  complete();
  assert.equal(store.getBonusPresentationState().bonusOpeningStage, "max");
  assert.equal(store.getBonusOpeningVideo(), "/videos/openings/bonus-super-max.mp4");
  assert.ok(existsSync(new URL(`../public${store.getBonusOpeningVideo()}`, import.meta.url)));
  complete();
  assert.equal(store.getBonusPresentationState().bonusOpeningVisible, false);
  assert.equal(signals.getCabinetSignalState().blackout, null);
  complete();
  assert.equal(store.getBonusPresentationState().bonusOpeningVisible, false);
});

for (const type of ["regular", "super"]) test(`${type} opening still completes directly`, () => {
  store.hideBonusOverlay(); store.armBonusOpening(type); store.showBonusOpening();
  complete();
  assert.equal(store.getBonusPresentationState().bonusOpeningVisible, false);
  store.enterBonusFreeze(); store.enterBonusOpeningMax();
  assert.equal(store.getBonusPresentationState().bonusOpeningStage, "main");
});

const safe = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SafeCompletionVideo");
const compiled = ts.transpileModule(`${safe.getText(ast)}\nglobalThis.Video = SafeCompletionVideo;`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const require = createRequire(import.meta.url);
function player() {
  const hooks = []; const pending = []; const timers = new Map();
  let cursor = 0; let timerId = 0;
  const depsChanged = (old, next) => !old || next.some((dep, i) => dep !== old[i]);
  const context = {
    require, exports: {},
    useRef(initial) { const i = cursor++; return hooks[i] ?? (hooks[i] = { current: initial }); },
    useCallback(fn, deps) { const i = cursor++; if (depsChanged(hooks[i]?.deps, deps)) hooks[i] = { fn, deps }; return hooks[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (depsChanged(hooks[i]?.deps, deps)) pending.push(() => {
      hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: fn() };
    }); },
    window: { setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
      clearTimeout(id) { timers.delete(id); } },
  };
  vm.createContext(context); vm.runInContext(compiled, context);
  return { timers, render(props) { cursor = 0; const video = context.Video(props); pending.splice(0).forEach(fn => fn()); return video; },
    unmount() { hooks.forEach(hook => hook?.cleanup?.()); } };
}

for (const key of ["bonus-opening-max", "reward-reveal-7"]) {
  test(`shared SafeCompletionVideo ${key}: muted autoplay, duration fallback and single completion`, () => {
    const runtime = player(); let calls = 0;
    const video = runtime.render({ src: "/real.mp4", completionKey: key, onComplete: () => calls++ });
    assert.equal(video.props.autoPlay, true); assert.equal(video.props.muted, true);
    video.props.onLoadedMetadata({ currentTarget: { duration: 18 } });
    assert.equal([...runtime.timers.values()][0].delay, 19200);
    const fallback = [...runtime.timers.values()][0].fn;
    video.props.onEnded(); video.props.onError(); fallback();
    assert.equal(calls, 1); assert.equal(runtime.timers.size, 0);
  });
}

test("callback updates do not restart shared video fallback, and late callbacks after unmount cannot advance", () => {
  const runtime = player(); let first = 0; let next = 0;
  const video = runtime.render({ src: "/a.mp4", completionKey: "same", onComplete: () => first++ });
  const timer = [...runtime.timers.keys()][0];
  runtime.render({ src: "/a.mp4", completionKey: "same", onComplete: () => next++ });
  assert.deepEqual([...runtime.timers.keys()], [timer]);
  video.props.onEnded();
  assert.equal(first, 0); assert.equal(next, 1);
  const other = player(); const old = other.render({ src: "/a.mp4", completionKey: "old", onComplete: () => first++ });
  other.unmount(); old.props.onEnded(); old.props.onLoadedMetadata({ currentTarget: { duration: 18 } });
  assert.equal(first, 0); assert.equal(other.timers.size, 0);
});
