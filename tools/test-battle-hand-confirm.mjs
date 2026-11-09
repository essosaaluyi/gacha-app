import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as hand from "../lib/battle-pixi/state/playerBattleCardStore.ts";

const source = readFileSync(new URL("../components/battle/BattleScreen.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("screen.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(["canConfirmHand", "handleHandSelect", "handleSummon"]);
const declarations = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && names.has(node.name.getText(ast))) declarations.push(`const ${node.getText(ast)};`);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(declarations.length, 3);
const compiled = ts.transpileModule(declarations.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function handlers(overrides = {}) {
  globalThis.window = {};
  globalThis.localStorage = { getItem: () => JSON.stringify([
    { name: "R2", image: "/r2.webp", rarity: "R" }, { name: "R2", image: "/r2.webp", rarity: "R" },
  ]) };
  hand.initializePlayerBattleCards();
  const state = { mode: "battle", playing: "playing", enemy: { id: 3 }, round: 1,
    ready: "ready", key: "1:3", collection: false, ...overrides };
  const context = { ...hand, stageReady: true, getCurrentEnemy: () => state.enemy,
    getCollectionState: () => ({ active: state.collection }),
    getBattlePresentationFlow: () => ({ summon: { enemy: state.ready, enemyKey: state.key } }),
    getBattleMode: () => state.mode, getBattleState: () => state.playing, getCurrentRound: () => state.round,
    resetPlayerWinRate() {}, getPlayerWinRateForRound() {}, saveBattleSession() {}, buildBattleSnapshot() {} };
  return { ...vm.runInNewContext(`(function(){${compiled};return {handleHandSelect,handleSummon};})()`, context), state };
}

test("live confirmation consumes one copy exactly once; tentative drag selection never consumes", () => {
  const ui = handlers();
  ui.handleHandSelect(1);
  assert.equal(hand.getRemainingPlayerBattleCards(), 2);
  ui.handleSummon();
  ui.handleSummon();
  assert.equal(hand.getPlayerBattleCardIndex(), 1);
  assert.equal(hand.getRemainingPlayerBattleCards(), 1);
});

for (const change of [{ mode: "bonus" }, { playing: "gameOver" }, { ready: "summoning" },
  { key: "2:3" }, { enemy: null }, { collection: true }]) {
  test(`stale Yes rechecks current state ${JSON.stringify(change)} before consuming`, () => {
    const ui = handlers();
    ui.handleHandSelect(1);
    Object.assign(ui.state, change);
    ui.handleSummon();
    assert.equal(hand.getCurrentPlayerBattleCard(), null);
    assert.equal(hand.getRemainingPlayerBattleCards(), 2);
  });
}

test("runtime draw/AUTO funnel rejects an open overview, even when the battle is otherwise ready", () => {
  const stage = readFileSync(new URL("../components/battle/BattlePixiStage.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("stage.tsx", stage, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const guard = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "canUseBattleControls");
  let open = false;
  let fatalResolving = false;
  const check = vm.runInNewContext(`(${guard.getText(ast)})`, {
    isCardOverviewOpen: () => open, getBattleState: () => "playing", getBattleMode: () => "battle",
    isFatalPresentationResolving: () => fatalResolving,
    getCurrentPlayerBattleCard: () => ({}), areBattleSummonsReady: () => true,
  });
  assert.equal(check(), true);
  fatalResolving = true;
  assert.equal(check(), false);
  fatalResolving = false;
  open = true;
  assert.equal(check(), false);
  open = false;
  assert.equal(check(), true);
});
