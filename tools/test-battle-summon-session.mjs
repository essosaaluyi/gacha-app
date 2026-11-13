import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Exercise the real stores without credentials, network, audio or a browser.
// TypeScript transpilation also removes older non-`type` type-only imports.
const walletUrl = "test:wallet";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/wallet/walletStore") return { url: walletUrl, shortCircuit: true };
    const base = specifier.startsWith("@/")
      ? new URL(`../${specifier.slice(2)}`, import.meta.url)
      : specifier.startsWith(".") && context.parentURL?.startsWith("file:")
        ? new URL(specifier, context.parentURL) : null;
    if (base) {
      for (const suffix of ["", ".ts", ".tsx"]) {
        const candidate = new URL(`${base.href}${suffix}`);
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === walletUrl) return {
      format: "module", shortCircuit: true,
      source: `let earned = 0;
        export const getWalletState = () => ({points:1000, sessionEarnedPoints:earned, loaded:true});
        export const setWalletSessionEarned = value => { earned = value; };
        export const resetWalletSessionEarned = () => { earned = 0; };
        export const subscribeWallet = () => () => {};
        export const initializeWallet = async () => {};
        export const addPoints = async () => {};
        export const ensureMinimumPoints = async () => {};`,
    };
    if (url.startsWith("file:") && url.endsWith(".ts")) return {
      format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    };
    return nextLoad(url, context);
  },
});

const hand = await import("@/lib/battle-pixi/state/playerBattleCardStore");
const session = await import("@/lib/battle-pixi/state/battleSessionSync");
const storage = await import("@/lib/battle-pixi/state/battleSessionStore");
const enemy = await import("@/lib/battle-pixi/state/currentEnemyStore");
const counter = await import("@/lib/battle-pixi/state/enemyAttackCounterStore");
const rounds = await import("@/lib/battle-pixi/state/roundStore");
const games = await import("@/lib/battle-pixi/state/battleGameStore");
const battle = await import("@/lib/battle-pixi/state/battleStateStore");
const modes = await import("@/lib/battle-pixi/state/battleModeStore");
const rates = await import("@/lib/battle-pixi/state/playerWinRateStore");
const { evaluateResult } = await import("@/lib/battle-pixi/core/evaluateResult");
const { resetBattleRun } = await import("@/lib/battle-pixi/state/resetBattleRun");
const { pickEnemyForRound, formatBattleRoundLabel, battleEnemies } = await import("@/lib/battle-pixi/config/enemyConfig");
const { enemySelectionGroups } = await import("@/lib/game-config/generated");
const flow = await import("@/lib/battle-pixi/state/battlePresentationFlowStore");
const overview = await import("@/lib/battle-pixi/config/cardOverview");

const deck = [
  { name: "R1", rarity: "R", image: "/r1.webp" },
  { name: "UR2", rarity: "UR", image: "/ur2.webp" },
  { name: "UR2", rarity: "UR", image: "/ur2.webp" },
];
const saved = new Map();
const events = new EventTarget();
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
  removeItem: key => saved.delete(key),
};
globalThis.window = {
  localStorage, setTimeout, clearTimeout,
  addEventListener: events.addEventListener.bind(events),
  removeEventListener: events.removeEventListener.bind(events),
};
globalThis.document = { visibilityState: "visible" };

function prepare() {
  saved.clear();
  saved.set("battle_player_cards", JSON.stringify(deck));
  resetBattleRun();
}

test("fresh run fixes an enemy/counter before selection and does not alter deck storage", () => {
  prepare();
  assert.ok(enemy.getCurrentEnemy());
  assert.equal(counter.getEnemyAttackCounter(), enemy.getCurrentEnemy().attackCounter);
  assert.equal(hand.getCurrentPlayerBattleCard(), null);
  assert.equal(saved.get("battle_player_cards"), JSON.stringify(deck));
});

test("Continue restores waiting selection and an arbitrary active instance with enemy/counters intact", () => {
  prepare();
  rounds.setRound(7);
  games.setGameCount(23);
  enemy.restoreEnemy(8);
  counter.setEnemyAttackCounter(2);
  hand.selectPlayerBattleCard(2);
  const waiting = session.buildBattleSnapshot();
  storage.saveBattleSession(waiting);
  resetBattleRun();
  session.restoreBattleFromSnapshot(waiting);
  assert.equal(hand.getCurrentPlayerBattleCard(), null);
  assert.equal(hand.getSelectedPlayerBattleCardIndex(), 2);
  assert.equal(enemy.getCurrentEnemy().id, 8);
  assert.equal(counter.getEnemyAttackCounter(), 2);
  hand.summonSelectedPlayerBattleCard();
  const active = session.buildBattleSnapshot();
  saved.set("battle_player_cards", JSON.stringify([deck[0]]));
  resetBattleRun();
  session.restoreBattleFromSnapshot(active);
  assert.equal(rounds.getCurrentRound(), 7);
  assert.equal(games.getGameCount(), 23);
  assert.equal(enemy.getCurrentEnemy().id, 8);
  assert.equal(counter.getEnemyAttackCounter(), 2);
  assert.equal(hand.getPlayerBattleCardIndex(), 2);
  assert.equal(hand.selectPlayerBattleCard(0), false);
  assert.deepEqual(hand.getAvailablePlayerBattleCards().map(choice => choice.index), [0, 1]);
  assert.equal(saved.get("battle_player_cards"), JSON.stringify([deck[0]]));
});

test("legacy saves consume the prefix; exhausted new snapshots enter gameOver", () => {
  prepare();
  const old = session.buildBattleSnapshot();
  delete old.playerHand;
  old.playerCardIndex = 1;
  session.restoreBattleFromSnapshot(old);
  assert.equal(hand.getPlayerBattleCardIndex(), 1);
  assert.deepEqual(hand.getAvailablePlayerBattleCards().map(choice => choice.index), [2]);
  hand.loadNextPlayerBattleCard();
  hand.selectPlayerBattleCard(2);
  hand.summonSelectedPlayerBattleCard();
  hand.loadNextPlayerBattleCard();
  session.restoreBattleFromSnapshot(session.buildBattleSnapshot());
  assert.equal(battle.getBattleState(), "gameOver");
});

test("a committed loss saved before reveal retires the instance on Continue", () => {
  prepare();
  hand.selectPlayerBattleCard(2);
  hand.summonSelectedPlayerBattleCard();
  counter.setEnemyAttackCounter(0);
  hand.markPlayerBattleCardDefeated();
  const snapshot = session.buildBattleSnapshot();
  assert.equal(snapshot.playerHand.pendingDefeat, true);
  assert.equal(snapshot.playerHand.activeIndex, 2);
  resetBattleRun();
  session.restoreBattleFromSnapshot(snapshot);
  assert.equal(hand.getCurrentPlayerBattleCard(), null);
  assert.equal(hand.selectPlayerBattleCard(2), false);
  assert.equal(counter.getEnemyAttackCounter(), enemy.getCurrentEnemy().attackCounter);
  assert.equal(battle.getBattleState(), "playing");
});

test("selected card feeds its existing W RATE and remains on field across mode transitions", () => {
  prepare();
  hand.selectPlayerBattleCard(2);
  hand.summonSelectedPlayerBattleCard();
  const card = hand.getCurrentPlayerBattleCard();
  const result = evaluateResult({ cards: ["Attack", "Empty", "Empty"], targetSlot: 0 },
    card.rarity, card.name, rates.getPlayerWinRateForRound(card.name, 1));
  assert.equal(result.attackCardRate, 70);
  modes.setBattleMode("bonus");
  modes.setBattleMode("collection");
  modes.setBattleMode("battle");
  assert.equal(hand.getPlayerBattleCardIndex(), 2);
  assert.equal(hand.selectPlayerBattleCard(0), false);
});

test("autosave records pending selection/commit and detaches with the screen", () => {
  prepare();
  session.startAutoSave();
  hand.selectPlayerBattleCard(2);
  assert.equal(storage.loadBattleSession().playerHand.selectedIndex, 2);
  hand.summonSelectedPlayerBattleCard();
  assert.equal(storage.loadBattleSession().playerHand.activeIndex, 2);
  session.stopAutoSave();
  const previous = saved.get("battle_session_snapshot");
  hand.loadNextPlayerBattleCard();
  assert.equal(saved.get("battle_session_snapshot"), previous);
});

test("stage initialization cannot own hand/enemy progression resets", () => {
  const source = readFileSync(new URL("../components/battle/BattlePixiStage.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("stage.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const forbidden = new Set(["initializePlayerBattleCards", "selectEnemyForRound", "resetBattleRun",
    "setPlayerBattleCardIndex", "restorePlayerBattleHand", "resetRound", "resetCurrentEnemy"]);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      assert.equal(forbidden.has(node.expression.text), false, `Stage must not call ${node.expression.text}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
});

test("new runs keep normal battles 1-5 unique and enter EXTRA 1 at round 6", () => {
  prepare();
  assert.equal(enemy.getNormalBattleRounds(), 5);
  const extraPool = new Set(enemySelectionGroups.filter(group => group.phase === "extra")
    .flatMap(group => group.enemyIds));
  const normalPool = new Set(enemySelectionGroups.filter(group => group.phase === "normal")
    .flatMap(group => group.enemyIds));
  const seen = new Set([enemy.getCurrentEnemy().id]);
  for (let round = 2; round <= 5; round++) {
    const opponent = enemy.loadNextRoundEnemy(round);
    assert.ok(normalPool.has(opponent.id));
    assert.equal(seen.has(opponent.id), false);
    seen.add(opponent.id);
    assert.equal(formatBattleRoundLabel(round), `ROUND 0${round}`);
  }
  assert.equal(formatBattleRoundLabel(6), "ROUND EXTRA 1");
  assert.equal(formatBattleRoundLabel(7), "ROUND EXTRA 2");
  for (let round = 6; round <= 100; round++) {
    assert.ok(extraPool.has(enemy.loadNextRoundEnemy(round).id));
  }
});

test("exhausted legacy candidate histories always supply a valid opponent", () => {
  const everyId = Object.values(battleEnemies).map(opponent => opponent.id);
  for (let round = 1; round <= 100; round++) {
    assert.ok(battleEnemies[pickEnemyForRound(round, everyId).id]);
  }
});

test("Continue retains new five-round boundary, picked enemies and hand selection", () => {
  prepare();
  enemy.loadNextRoundEnemy(2);
  enemy.loadNextRoundEnemy(3);
  rounds.setRound(3);
  hand.selectPlayerBattleCard(1);
  const snapshot = session.buildBattleSnapshot();
  resetBattleRun();
  session.restoreBattleFromSnapshot(snapshot);
  assert.equal(enemy.getNormalBattleRounds(), 5);
  assert.deepEqual(enemy.getBattleEnemyProgressionSnapshot(), snapshot.enemyProgression);
  assert.equal(hand.getSelectedPlayerBattleCardIndex(), 1);
  assert.equal(rounds.getCurrentRound(), 3);
});

test("unversioned ten-round saves retain current opponent/counter and their EXTRA numbering", () => {
  prepare();
  enemy.restoreEnemy(8);
  rounds.setRound(10);
  counter.setEnemyAttackCounter(2);
  const snapshot = session.buildBattleSnapshot();
  delete snapshot.enemyProgression;
  resetBattleRun();
  session.restoreBattleFromSnapshot(snapshot);
  assert.equal(enemy.getNormalBattleRounds(), 10);
  assert.equal(rounds.getCurrentRound(), 10);
  assert.equal(enemy.getCurrentEnemy().id, 8);
  assert.equal(counter.getEnemyAttackCounter(), 2);
  assert.equal(formatBattleRoundLabel(10, enemy.getNormalBattleRounds()), "ROUND 10");
  assert.equal(formatBattleRoundLabel(11, enemy.getNormalBattleRounds()), "ROUND EXTRA 1");
  const migrated = session.buildBattleSnapshot();
  resetBattleRun();
  session.restoreBattleFromSnapshot(migrated);
  assert.equal(enemy.getNormalBattleRounds(), 10);
  resetBattleRun();
  assert.equal(enemy.getNormalBattleRounds(), 5);
});

test("enemy insert -> enemy summon -> selection -> player summon locks all draws until both actors settle", () => {
  prepare();
  flow.prepareEnemySummon("1:3");
  assert.equal(flow.getBattlePresentationFlow().summon.enemy, "waiting");
  flow.setBattlePresentationPhase("next_round_ready", "insert-complete");
  assert.equal(flow.canRequestBattleDraw(), false);
  flow.startEnemySummon();
  assert.equal(flow.getBattlePresentationFlow().summon.enemy, "summoning");
  assert.equal(flow.canRequestBattleDraw(), false);
  flow.completeBattleSummon("enemy", "1:3");
  assert.equal(flow.getBattlePresentationFlow().summon.enemy, "ready");
  assert.equal(flow.getBattlePresentationFlow().summon.player, "absent");
  assert.equal(flow.canRequestBattleDraw(), false);
  flow.preparePlayerSummon(2);
  const enemyState = { key: flow.getBattlePresentationFlow().summon.enemyKey,
    status: flow.getBattlePresentationFlow().summon.enemy };
  assert.equal(flow.canRequestBattleDraw(), false);
  flow.completeBattleSummon("player", 1); // Obsolete actor's callback.
  assert.equal(flow.canRequestBattleDraw(), false);
  flow.completeBattleSummon("player", 2);
  assert.equal(flow.canRequestBattleDraw(), true);
  assert.deepEqual({ key: flow.getBattlePresentationFlow().summon.enemyKey,
    status: flow.getBattlePresentationFlow().summon.enemy }, enemyState);
});

test("defeat/replacement replays only the new player instance and a new enemy preserves the winner", () => {
  flow.resetBattlePresentationFlow();
  flow.restoreBattleSummons("1:3", 2);
  flow.clearPlayerSummon();
  assert.equal(flow.getBattlePresentationFlow().summon.enemy, "ready");
  assert.equal(flow.getBattlePresentationFlow().summon.player, "absent");
  flow.preparePlayerSummon(1);
  flow.completeBattleSummon("player", 1);
  assert.equal(flow.getBattlePresentationFlow().summon.playerIndex, 1);
  flow.prepareEnemySummon("2:8");
  assert.equal(flow.getBattlePresentationFlow().summon.player, "ready");
  assert.equal(flow.canRequestBattleDraw(), false);
  flow.startEnemySummon();
  flow.completeBattleSummon("enemy", "1:3");
  assert.equal(flow.getBattlePresentationFlow().summon.enemy, "summoning");
  flow.completeBattleSummon("enemy", "2:8");
  assert.equal(flow.canRequestBattleDraw(), true);
});

test("duplicate round events cannot restart an active or completed summon intro", () => {
  flow.resetBattlePresentationFlow();
  flow.prepareEnemySummon("1:3");
  flow.startEnemySummon();
  const startedAt = flow.getBattlePresentationFlow().summon.enemyStartedAt;
  flow.prepareEnemySummon("1:3");
  flow.startEnemySummon();
  assert.equal(flow.getBattlePresentationFlow().summon.enemyStartedAt, startedAt);
  flow.completeBattleSummon("enemy", "1:3");
  flow.prepareEnemySummon("1:3");
  assert.equal(flow.getBattlePresentationFlow().summon.enemy, "ready");
});

test("Continue settles existing actors without reopening their intros, while waiting hand stays locked", () => {
  prepare();
  hand.selectPlayerBattleCard(2);
  hand.summonSelectedPlayerBattleCard();
  const active = session.buildBattleSnapshot();
  session.restoreBattleFromSnapshot(active);
  assert.equal(flow.getBattlePresentationFlow().summon.enemy, "ready");
  assert.equal(flow.getBattlePresentationFlow().summon.player, "ready");
  assert.equal(flow.getBattlePresentationFlow().summon.playerIndex, 2);
  hand.loadNextPlayerBattleCard();
  const waiting = session.buildBattleSnapshot();
  session.restoreBattleFromSnapshot(waiting);
  assert.equal(flow.getBattlePresentationFlow().summon.enemy, "ready");
  assert.equal(flow.getBattlePresentationFlow().summon.player, "absent");
  flow.setBattlePresentationPhase("next_round_ready");
  assert.equal(flow.canRequestBattleDraw(), false);
  assert.equal(hand.selectPlayerBattleCard(2), false);
});

test("overview reads actual identity/rates without inventing rewards or changing hand/rate state", () => {
  prepare();
  rates.resetPlayerWinRate();
  const before = hand.getPlayerBattleHandSnapshot();
  const data = overview.getCardOverview(deck[1]);
  assert.equal(data.image, deck[1].image);
  assert.match(data.name, /Double Striker/);
  assert.match(data.ability, /未実装/);
  assert.match(data.wRate, /70%/);
  assert.match(data.wRate, /バトル全体の勝率ではありません/);
  assert.match(data.expectedReward, /算出未対応/);
  const doll = { name: "UR3", rarity: "UR", image: "/doll.webp" };
  assert.match(overview.getCardOverview(doll).wRate, /66〜89%/);
  assert.equal(rates.getPlayerWinRateSnapshot(), null);
  rounds.setRound(1);
  rates.restorePlayerWinRate({ cardId: "UR3", round: 1, rate: 77 });
  assert.match(overview.getCardOverview(doll, true).wRate, /現在77%/);
  assert.doesNotMatch(overview.getCardOverview(doll).wRate, /現在77%/);
  assert.deepEqual(rates.getPlayerWinRateSnapshot(), { cardId: "UR3", round: 1, rate: 77 });
  assert.deepEqual(hand.getPlayerBattleHandSnapshot(), before);
  for (const enemy of Object.values(battleEnemies)) {
    const data = overview.getEnemyCardOverview(enemy);
    assert.equal(data.image, enemy.image);
    assert.match(data.ability, /固有能力は未設定/);
    assert.match(data.wRate, /設定対象外/);
  }
});

test("overlapping overview leases release independently without consuming or modifying battle state", () => {
  prepare();
  const before = session.buildBattleSnapshot();
  let changes = 0;
  const detach = overview.subscribeCardOverview(() => changes++);
  const closeField = overview.acquireCardOverviewLock();
  const closeDialog = overview.acquireCardOverviewLock();
  assert.equal(overview.isCardOverviewOpen(), true);
  closeField(); closeField();
  assert.equal(overview.isCardOverviewOpen(), true);
  closeDialog();
  assert.equal(overview.isCardOverviewOpen(), false);
  assert.equal(changes, 4);
  detach();
  const after = session.buildBattleSnapshot();
  delete before.savedAt; delete after.savedAt;
  assert.deepEqual(after, before);
});
