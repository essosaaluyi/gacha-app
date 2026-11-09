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


const { rollEnemyFatal, parseFatalPreview, enemyFatalEscape, enemyFatalSurvives } = await import("../lib/battle-pixi/core/enemyFatalRoll.ts");
const fatal = await import("../lib/battle-pixi/state/fatalPresentationStore.ts");
const mode = await import("../lib/battle-pixi/state/enemyAttackModeStore.ts");
const playerMode = await import("../lib/battle-pixi/state/fatalModeStore.ts");
const counter = await import("../lib/battle-pixi/state/enemyAttackCounterStore.ts");
const session = await import("../lib/battle-pixi/state/battleSessionSync.ts");
const storage = await import("../lib/battle-pixi/state/battleSessionStore.ts");
const hand = await import("../lib/battle-pixi/state/playerBattleCardStore.ts");
const enemy = await import("../lib/battle-pixi/state/currentEnemyStore.ts");
const round = await import("../lib/battle-pixi/state/roundStore.ts");
const flow = await import("../lib/battle-pixi/state/battlePresentationFlowStore.ts");
const { resetBattleRun } = await import("../lib/battle-pixi/state/resetBattleRun.ts");
const { patchConfig } = await import("../lib/game-config/patchConfig.ts");
const { activeDelay } = await import("../lib/battle-pixi/presentation/cabinetDealSequence.ts");
const saved = new Map();
globalThis.localStorage = { getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
globalThis.window = { localStorage, setTimeout, clearTimeout, location: { search: "" } };
const stageSource = readFileSync(new URL("../components/battle/BattlePixiStage.tsx", import.meta.url), "utf8").replaceAll("\r\n", "\n");
const transpile = code => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;

function plan(overrides = {}) {
  return { id: "paid:1", enemyKey: "1:1", playerIndex: 0,
    enemy: { attack: true, tease: true, shield: null, kind: "resolution", survived: false }, playerAttack: false, enemyDefeat: null, ...overrides };
}

test("Empty threshold is strictly below 0.5; visual decision is independent and attack always dims", () => {
  for (const [attackSample, teaseSample, attack, tease] of [
    [0, .99, true, true], [.499999, .99, true, true], [.5, .499999, false, true],
    [.5, .5, false, false], [.999999, 0, false, true], [.99, .99, false, false],
  ]) {
    const samples = [attackSample, teaseSample];
    assert.deepEqual(rollEnemyFatal("Empty", () => samples.shift()), { attack, tease });
    assert.equal(samples.length, 0);
  }
});

test("every small-symbol outcome is safe regardless of symbols/target; tease threshold stays 50%", () => {
  for (const result of ["Attack", "Defense", "Coin", "Reply", "Bar", "SingleChance", "DoubleChance", "TripleChance"]) {
    let calls = 0;
    assert.deepEqual(rollEnemyFatal(result, () => { calls++; return .499999; }), { attack: false, tease: true });
    assert.equal(calls, 1, result);
    assert.deepEqual(rollEnemyFatal(result, () => .5), { attack: false, tease: false });
  }
});

test("independent grid has exactly 50% attacks and 50% tease conditional on no attack", () => {
  let attacks = 0, safe = 0, dimSafe = 0;
  for (let a = 0; a < 100; a++) for (let b = 0; b < 100; b++) {
    const values = [a / 100, b / 100];
    const roll = rollEnemyFatal("Empty", () => values.shift());
    if (roll.attack) attacks++; else { safe++; if (roll.tease) dimSafe++; }
  }
  assert.equal(attacks, 5000); assert.equal(safe, 5000); assert.equal(dimSafe, 2500);
});

test("original window honors live configured length and trigger consumes turn1 with two following default draws", () => {
  const saved=patchConfig.fatalMode.enemyWindowTurns;
  try { for (const length of [1,2,3,5]) {
    patchConfig.fatalMode.enemyWindowTurns=length; mode.resetEnemyAttackMode(); mode.startEnemyAttackMode();
    assert.equal(mode.getEnemyAttackModeTurnsLeft(),length);
    for (let turn=1;turn<=length;turn++) {
      const result=mode.consumeEnemyAttackModeTurn(); assert.equal(result.turnNumber,turn);assert.equal(result.finished,turn===length);
      assert.equal(mode.getEnemyAttackModeTurnsLeft(),length-turn);
      mode.startEnemyAttackMode(); assert.equal(mode.getEnemyAttackModeTurnsLeft(),length-turn);
    }
    assert.equal(mode.consumeEnemyAttackModeTurn(),null);
    counter.setEnemyAttackCounter(9);assert.equal(mode.isEnemyAttackModeActive(),false);
  } } finally { patchConfig.fatalMode.enemyWindowTurns=saved;mode.resetEnemyAttackMode(); }
});

test("a committed plan cannot reroll or be claimed twice; stop notifications are monotonic", () => {
  fatal.clearFatalPresentation();
  const original = plan(); assert.equal(fatal.commitFatalPlan(original), true);
  original.enemy.attack = false;
  assert.equal(fatal.getFatalPresentation().plan.enemy.attack, true);
  assert.equal(fatal.commitFatalPlan(plan({ id: "replacement" })), false);
  fatal.setFatalStops(2); fatal.setFatalStops(1); assert.equal(fatal.getFatalPresentation().stops, 2);
  assert.equal(fatal.takeFatalPlan("stale"), null);
  assert.equal(fatal.takeFatalPlan("paid:1").enemy.attack, true);
  assert.equal(fatal.takeFatalPlan("paid:1"), null);
});

function runtime(committed = plan(), options = {}) {
  fatal.clearFatalPresentation(); fatal.commitFatalPlan(committed);
  let now = 0, blocked = false, cancelled = false, currentEnemy = Number(committed.enemyKey.split(":")[1]), currentIndex = committed.playerIndex, currentMode = "battle";
  let retired = 0, completions = 0, saves = 0;
  const timers = [];
  const clock = { now: () => now, blocked: () => blocked, cancelled: () => cancelled,
    schedule: (callback, delay) => timers.push({ at: now + delay, callback }) };
  const body = stageSource.slice(stageSource.indexOf("      const completeFatalSequence ="), stageSource.indexOf("      const invalidateFatalContext ="));
  const deps = { getFatalPresentation: fatal.getFatalPresentation, takeFatalPlan: fatal.takeFatalPlan,
    setFatalStops: fatal.setFatalStops, setFatalPresentationPhase: fatal.setFatalPresentationPhase,
    getCurrentRound: () => 1, getCurrentEnemy: () => ({ id: currentEnemy, attackCounter: 9 }), getPlayerBattleCardIndex: () => currentIndex,
    getBattleMode: () => currentMode, getBattleState: () => "playing", addBattleLog: () => {},
    resetEnemyAttackMode: mode.resetEnemyAttackMode, setEnemyAttackCounter: counter.setEnemyAttackCounter,
    clearAttackFakeout: () => {}, clearResurrection: () => {}, markPlayerBattleCardDefeated: () => { retired++; },
    setBattlePresentationPhase: flow.setBattlePresentationPhase,
    saveBattleSession: snapshot => { saves++; if (options.persist) storage.saveBattleSession(snapshot); },
    buildBattleSnapshot: () => options.persist ? session.buildBattleSnapshot() : ({}),
    handTimeout: (callback, delay) => activeDelay(clock, delay, callback) };
  const runner = new Function(...Object.keys(deps), transpile("let fatalSequenceBusy=false; let pendingPlayerReplacement=false; let pendingEnemyDefeatPresentation=null;" + body + ";return { run:completeFatalSequence, outcome:()=>({pendingPlayerReplacement,pendingEnemyDefeatPresentation}) };"))(...Object.values(deps));
  return { run: () => runner.run(() => { completions++; }), runWith: after => runner.run(() => { completions++; after(); }), outcome: runner.outcome,
    counts: () => ({ retired, completions, saves }), block: value => { blocked = value; }, cancel: () => { cancelled = true; },
    changeEnemy: () => { currentEnemy = 2; }, changePlayer: () => { currentIndex = 1; }, collection: () => { currentMode = "collection"; },
    advance(to) { while (timers.length) { timers.sort((a,b) => a.at-b.at); if (timers[0].at > to) break;
      const next=timers.shift(); now=next.at; next.callback(); } now=to; } };
}

test("original final resolution plays 1800ms actual attack after third stop, then retires exactly once", () => {
  const run=runtime();run.run();run.run(); assert.equal(fatal.getFatalPresentation().phase,"attack");
  run.advance(1799);assert.equal(run.counts().retired,0);
  run.advance(1800);assert.deepEqual(run.counts(),{retired:1,completions:1,saves:1});
  assert.equal(fatal.getFatalPresentation().plan,null);
});

test("safe game clears at third stop without damage; actual shield survival retains fighter", () => {
  const safe = runtime(plan({ enemy: { attack: false, tease: true, shield: null } }));
  safe.run(); assert.deepEqual(safe.counts(), { retired: 0, completions: 1, saves: 1 });
  const shield = runtime(plan({ enemy: { attack: true, tease: true, kind: "resolution", survived: true, shield: { grade: "red", survivalChance: .8, survived: true } } }));
  shield.run(); shield.advance(2450); assert.equal(shield.counts().retired, 0); assert.equal(shield.counts().completions, 1);
});

test("only an actual player Fatal attack plays the player placeholder and defers its victory", () => {
  const defeat = { presentation: "default", forcedBonusType: null };
  const run = runtime(plan({ enemy: null, playerAttack: true, enemyDefeat: defeat }));
  run.run(); assert.equal(fatal.getFatalPresentation().phase, "attack");
  assert.equal(run.outcome().pendingEnemyDefeatPresentation, null);
  run.advance(1799); assert.equal(run.counts().completions, 0);
  run.advance(1800); assert.deepEqual(run.outcome().pendingEnemyDefeatPresentation, defeat);
});

test("hidden/overview pause the real warning/attack path without retiring a card", () => {
  const run = runtime(); run.run(); run.advance(300); run.block(true); run.advance(60300);
  assert.equal(fatal.getFatalPresentation().phase, "attack"); assert.equal(run.counts().retired, 0);
  run.block(false); run.advance(63000); assert.equal(run.counts().retired, 1);
});

test("unmount, collection, different enemy/player or a cleared new run cannot apply stale damage", () => {
  for (const cancel of [run => run.cancel(), run => run.collection(), run => run.changeEnemy(), run => run.changePlayer(), () => fatal.clearFatalPresentation()]) {
    const run=runtime(); run.run(); run.advance(700); cancel(run); run.advance(5000);
    assert.equal(run.counts().retired, 0); assert.equal(run.counts().completions, 0);
  }
});



test("Continue persists both Fatal modes, the predetermined shield result and never rerolls", () => {
  window.location.search=""; resetBattleRun(); hand.selectPlayerBattleCard(0); hand.summonSelectedPlayerBattleCard();
  counter.setEnemyAttackCounter(0); mode.startEnemyAttackMode(); mode.consumeEnemyAttackModeTurn();
  playerMode.startFatalMode(); playerMode.registerFatalModeHit(); playerMode.consumeFatalModeTurn();
  const committed=plan({ enemyKey:round.getCurrentRound()+":"+enemy.getCurrentEnemy().id,
    enemy:{attack:true,tease:true,kind:"resolution",survived:false,shield:{grade:"red",survivalChance:.8,survived:false}} });
  fatal.commitFatalPlan(committed); const snapshot=structuredClone(session.buildBattleSnapshot());
  storage.saveBattleSession(snapshot); const fromStorage=storage.loadBattleSession();
  resetBattleRun(); const originalRandom=Math.random;
  Math.random=()=>{ throw Error("restore attempted a reroll"); };
  try { session.restoreBattleFromSnapshot(fromStorage); } finally { Math.random=originalRandom; }
  assert.equal(mode.isEnemyAttackModeActive(),true); assert.equal(playerMode.hasFatalModeHit(),true);
  assert.deepEqual(fatal.getFatalPresentation().plan,committed); assert.equal(hand.getCurrentPlayerBattleCard().name,snapshot.playerHand.cards[0].name);
  assert.equal(hand.getPlayerBattleHandSnapshot().pendingDefeat,false);
  const run=runtime(committed); run.run(); run.advance(2450); assert.equal(run.counts().retired,1);
  const old={...snapshot}; delete old.enemyFatal; delete old.fatalPlan;
  session.restoreBattleFromSnapshot(old); assert.equal(mode.isEnemyAttackModeActive(),false);
});

test("new run clears pending attacks and both Fatal modes; mismatched save cannot attack a new actor", () => {
  resetBattleRun(); assert.equal(fatal.getFatalPresentation().plan,null); assert.equal(mode.isEnemyAttackModeActive(),false);
  assert.equal(playerMode.isFatalModeActive(),false);
  const snapshot=session.buildBattleSnapshot(); snapshot.fatalPlan=plan({enemyKey:"999:999"});
  session.restoreBattleFromSnapshot(snapshot); assert.equal(fatal.getFatalPresentation().plan,null);
});

test("DEV routes cannot force production results and preview storage cannot overwrite Continue", () => {
  for (const value of ["attack","safe-dim","safe-clear","symbol","player","window-reply","window-chance","window-defense"]) {
    assert.equal(parseFatalPreview(true,value),null); assert.equal(parseFatalPreview(false,value),value);
  }
  assert.equal(parseFatalPreview(false,"invalid"),null);
  window.location.search=""; const snapshot=session.buildBattleSnapshot(); storage.saveBattleSession(snapshot);
  const before=saved.get("battle_session_snapshot"); window.location.search="?fatal-preview=attack";
  storage.saveBattleSession({...snapshot,gameCount:999}); storage.clearBattleSession(); resetBattleRun({preview:true});
  assert.equal(saved.get("battle_session_snapshot"),before); window.location.search="";
});






test("actual watchdog never substitutes for third stop, including long manual reveal waits", () => {
  const ast=ts.createSourceFile("stage.tsx",stageSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let callback;
  const find=node=>{ if(ts.isCallExpression(node) && node.expression.getText(ast)==="handTimeout" && node.arguments[1]?.getText(ast)==="HAND_WATCHDOG_MS") callback=node.arguments[0]; ts.forEachChild(node,find); };
  find(ast); assert.ok(callback);
  for (const stops of [0,1,2]) {
    fatal.clearFatalPresentation(); const committed=plan(); fatal.commitFatalPlan(committed); fatal.setFatalStops(stops);
    const fail=()=>{ throw Error("watchdog advanced or abandoned the committed hand"); };
    const deps={cardsAreOut:true,getFatalPresentation:fatal.getFatalPresentation,completeFatalSequence:fail,beginNewHand:fail,finishPlayerDefeat:fail};
    const watchdog=new Function(...Object.keys(deps),"return ("+transpile(callback.getText(ast)).trim().replace(/;$/,"")+");")(...Object.values(deps));
    watchdog(); watchdog();
    assert.equal(fatal.getFatalPresentation().phase,"anticipation"); assert.equal(fatal.getFatalPresentation().stops,stops);
    assert.deepEqual(fatal.getFatalPresentation().plan,committed);
    const run=runtime(committed); run.run(); run.advance(2450); assert.equal(run.counts().retired,1);
  }
});

test("BAR grade/guaranteed victory survives Continue and new zero-counter entry cannot override it", () => {
  for(const grade of ["regular","super","superMax"]) {
    resetBattleRun();hand.selectPlayerBattleCard(0);hand.summonSelectedPlayerBattleCard();counter.setEnemyAttackCounter(0);
    playerMode.startFatalMode({guaranteedDefeat:true});playerMode.setGuaranteedFatalBonusType(grade);
    const snapshot=structuredClone(session.buildBattleSnapshot());resetBattleRun();session.restoreBattleFromSnapshot(snapshot);
    assert.equal(playerMode.getGuaranteedFatalBonusType(),grade);
    const commit=entryRuntime({random:()=>0});const output=commit.run({result:"Empty",cards:["Empty","Empty","Empty"],targetSlot:0});
    assert.equal(output.enemyFatalRoll.attack,false);assert.equal(mode.isEnemyAttackModeActive(),false);
    resetBattleRun();assert.equal(playerMode.getGuaranteedFatalBonusType(),null);
  }
});

test("actual Continue hand path restores settled slots and waits for the real remaining stops", () => {
  const result={result:"Empty",cards:["Empty","Empty","Empty"],targetSlot:0};
  const a=stageSource.indexOf("      const pendingHand=getPendingBattleHand();");
  const b=stageSource.indexOf('      } else if (getBattleMode() === "battle"',a);
  const fragment=stageSource.slice(a,b)+"}";
  for (const slots of [[false,false,false],[false,true,false],[true,false,true],[true,true,true]]) {
    fatal.clearFatalPresentation(); fatal.commitFatalPlan(plan({result,settledSlots:slots}));
    const restored=structuredClone(fatal.getFatalPresentation().plan);
    fatal.restoreFatalPresentation(restored);
    let sequences=0, lotteries=0;
    const pickable=[]; const drawCards=slots.map(()=>({scale:{set(){}},texture:null}));
    const deps={getPendingBattleHand:()=>null,getFatalPresentation:fatal.getFatalPresentation,getBattleMode:()=>"battle",resetCardsToGroup:()=>{},
      setCurrentBattleResult:()=>{},drawCards,cardGroup:{visible:true,removeChild(){}},stage:{addChild(){}},
      revealed:[false,false,false],settledSlots:[false,false,false],cabinetMode:false,
      hoverTargets:[{x:1,y:2},{x:3,y:4},{x:5,y:6}],L:{CARD_SCALE:1},currentBattleResult:result,
      symbolTextures:{Empty:"face"},cardBackTexture:"back",PerspectiveMesh:class{},setCardPickable:(i,v)=>{pickable[i]=v;},
      startHoverFloat:()=>{},attachPlacementHandlers:()=>{},setBattlePresentationPhase:()=>{},setCardPhase:()=>{},
      completeFatalSequence:()=>{sequences++;},finishRevealedHand:()=>{},syncDrawAvailability:()=>{},
      drawBattleResult:()=>{lotteries++;throw Error("restore rerolled");}};
    const output=new Function(...Object.keys(deps),transpile("let cardsAreOut=false,cardsReleased=false,revealedCount=0;"+fragment+";return {cardsAreOut,cardsReleased,revealedCount};"))(...Object.values(deps));
    assert.equal(output.revealedCount,slots.filter(Boolean).length);
    assert.equal(output.cardsAreOut,true);assert.equal(lotteries,0);
    assert.equal(sequences,slots.every(Boolean)?1:0);
    assert.deepEqual(pickable,slots.map(value=>!value));
    assert.deepEqual(drawCards.map(card=>card.texture),slots.map(value=>value?"face":"back"));
  }
});


function windowRuntime(options={}) {
  let storedShield=options.shield??null, checks=0, awards=0;
  const a=stageSource.indexOf("      const evaluateCommittedEnemyWindow =");
  const b=stageSource.indexOf("      const completeFatalSequence =",a);
  const deps={...mode, enemyFatalEscape,enemyFatalSurvives,addBattleLog:()=>{},
    awardDefenseShield:()=>{awards++;storedShield=options.acquired??{grade:"purple",survivalChance:1,survived:true};return storedShield.grade;},
    consumeDefenseShieldForFatal:()=>{checks++;const value=storedShield;storedShield=null;return value;} };
  const engine=new Function(...Object.keys(deps),transpile("let pendingTripleDefenseGrade=null;"+stageSource.slice(a,b)+";return {run:(...args)=>{pendingTripleDefenseGrade=null;return evaluateCommittedEnemyWindow(...args);},grade:()=>pendingTripleDefenseGrade};"))(...Object.values(deps));
  return { run:engine.run,grade:engine.grade,counts:()=>({checks,awards}),putShield:value=>{storedShield=value;} };
}
function entryRuntime(options={}) {
  const window=windowRuntime(options);let rolls=0;
  const a=stageSource.indexOf("        // Only entry changes.");
  const b=stageSource.indexOf("        if (!shouldStopBattleEvaluation && isFatalModeActive()) {",a);
  const deps={...mode,getEnemyAttackCounter:counter.getEnemyAttackCounter,
    getGuaranteedFatalBonusType:playerMode.getGuaranteedFatalBonusType,
    isFatalModeActive:playerMode.isFatalModeActive,getFatalModeGamesLeft:playerMode.getFatalModeGamesLeft,hasFatalModeHit:playerMode.hasFatalModeHit,
    evaluateCommittedEnemyWindow:window.run,Math:{random:options.random??(()=>.99)},
    rollEnemyFatal:(...args)=>{rolls++;return rollEnemyFatal(...args);} };
  const run=new Function(...Object.keys(deps),"currentBattleResult","evaluation",transpile("let shouldStopBattleEvaluation=false;let pendingEnemyDefeatPresentation=null;let enemyFatalRoll=null;"+stageSource.slice(a,b)+";return {shouldStopBattleEvaluation,enemyFatalRoll};"));
  return {run:(result,evaluation={chanceAttack:result.cards.includes("Chance"),attackOnTarget:result.cards[result.targetSlot]==="Attack"})=>run(...Object.values(deps),result,evaluation),window,rolls:()=>rolls};
}
const empty=()=>({result:"Empty",cards:["Empty","Empty","Empty"],targetSlot:0});

test("zero-counter entry reserves turn1, warns without retirement, then exactly two further default games resolve", () => {
  resetBattleRun();counter.setEnemyAttackCounter(0);
  const entry=entryRuntime({random:()=>0});const first=entry.run(empty());
  assert.equal(first.enemyFatalRoll.kind,"entry");assert.equal(mode.getEnemyAttackModeTurnsLeft(),2);assert.equal(entry.rolls(),1);
  const warning=runtime(plan({enemy:first.enemyFatalRoll}));warning.run();warning.advance(649);
  assert.equal(fatal.getFatalPresentation().phase,"warning");assert.equal(warning.counts().retired,0);
  warning.advance(650);assert.deepEqual(warning.counts(),{retired:0,completions:1,saves:1});
  assert.equal(mode.getEnemyAttackModeTurnsLeft(),2);
  const second=entry.run(empty());assert.equal(second.enemyFatalRoll.kind,"window");assert.equal(entry.rolls(),1);
  const middle=runtime(plan({enemy:second.enemyFatalRoll}));middle.run();assert.equal(middle.counts().retired,0);
  const third=entry.run(empty());assert.equal(third.enemyFatalRoll.kind,"resolution");assert.equal(entry.rolls(),1);
  assert.equal(mode.getEnemyAttackModeTurnsLeft(),0);assert.equal(third.enemyFatalRoll.survived,false);
  const resolution=runtime(plan({enemy:third.enemyFatalRoll}));resolution.run();resolution.advance(1799);assert.equal(resolution.counts().retired,0);
  resolution.advance(1800);assert.equal(resolution.counts().retired,1);
});

test("only zero-counter idle games roll entry; safe small symbol/Empty keep player evaluation; positive countdown untouched", () => {
  resetBattleRun();counter.setEnemyAttackCounter(4);const positive=entryRuntime({random:()=>{throw Error("positive countdown rolled entry");}});
  assert.equal(positive.run(empty()).enemyFatalRoll,null);
  counter.setEnemyAttackCounter(0);
  for(const result of [{result:"Reply",cards:["Reply","Reply","Reply"],targetSlot:0},empty()]) {
    const fixture=entryRuntime({random:()=>.99});const original=structuredClone(result);const output=fixture.run(result);
    assert.equal(output.enemyFatalRoll.attack,false);assert.equal(output.shouldStopBattleEvaluation,false);
    assert.equal(mode.isEnemyAttackModeActive(),false);assert.equal(fixture.window.counts().checks,0);
    assert.deepEqual(result,original);
  }
});

test("original counter/reset predicates rewrite survival deterministically without replacing cards or applying W RATE", () => {
  for(const [result,evaln,countered,reset] of [
    ["Empty",{chanceAttack:false,attackOnTarget:false},false,false],
    ["SingleChance",{chanceAttack:true,attackOnTarget:false},true,false],
    ["Bar",{chanceAttack:false,attackOnTarget:false},true,false],
    ["Attack",{chanceAttack:false,attackOnTarget:true},false,true],
    ["Attack",{chanceAttack:false,attackOnTarget:false},false,false],
    ["Reply",{chanceAttack:false,attackOnTarget:false},false,true],
    ["Defense",{chanceAttack:false,attackOnTarget:false},false,false],
  ]) {
    assert.deepEqual(enemyFatalEscape(result,evaln),{counter:countered,reset});
    mode.resetEnemyAttackMode();mode.startEnemyAttackMode();const engine=windowRuntime();engine.run(empty(),{chanceAttack:false,attackOnTarget:false},true);
    const cards=Object.freeze([result==="SingleChance"?"Chance":result,"Empty","Empty"]);
    const hand=Object.freeze({result,cards,targetSlot:0});
    engine.run(hand,evaln,false);
    const final=engine.run(empty(),{chanceAttack:false,attackOnTarget:false},false);
    assert.equal(final.survived,countered||reset,result);
    const finish=runtime(plan({enemy:final}));finish.run();finish.advance(1800);
    assert.equal(finish.counts().retired,countered||reset?0:1);
    if(countered||reset)assert.equal(counter.getEnemyAttackCounter(),9);
  }
});

test("window holds ONE original shield decision, failed shield overrides counter and Triple Defense can acquire mid-window", () => {
  for(const survived of [false,true]) {
    mode.resetEnemyAttackMode();mode.startEnemyAttackMode();
    const engine=windowRuntime({shield:{grade:"red",survivalChance:.8,survived}});
    engine.run(empty(),{chanceAttack:false,attackOnTarget:false},true);
    engine.run({result:"Reply",cards:["Reply","Reply","Reply"],targetSlot:0},{chanceAttack:false,attackOnTarget:false},false);
    const final=engine.run(empty(),{chanceAttack:false,attackOnTarget:false},false);
    assert.equal(final.survived,survived);assert.equal(engine.counts().checks,1);
  }
  mode.resetEnemyAttackMode();mode.startEnemyAttackMode();const engine=windowRuntime();
  engine.run(empty(),{chanceAttack:false,attackOnTarget:false},true);
  engine.run({result:"Defense",cards:["Defense","Defense","Defense"],targetSlot:0},{chanceAttack:false,attackOnTarget:false},false);
  assert.equal(engine.grade(),"purple");assert.equal(engine.counts().awards,1);
  const final=engine.run(empty(),{chanceAttack:false,attackOnTarget:false},false);
  assert.equal(final.survived,true);assert.equal(final.shield.grade,"purple");
});

test("Continue retains remaining window length, cumulative rescue and held failed shield without reroll", () => {
  resetBattleRun();hand.selectPlayerBattleCard(0);hand.summonSelectedPlayerBattleCard();counter.setEnemyAttackCounter(0);
  mode.startEnemyAttackMode();const engine=windowRuntime({shield:{grade:"blue",survivalChance:.2,survived:false}});
  engine.run(empty(),{chanceAttack:false,attackOnTarget:false},true);
  engine.run({result:"Reply",cards:["Reply","Reply","Reply"],targetSlot:0},{chanceAttack:false,attackOnTarget:false},false);
  const snapshot=structuredClone(session.buildBattleSnapshot());resetBattleRun();session.restoreBattleFromSnapshot(snapshot);
  assert.equal(mode.getEnemyAttackModeTurnsLeft(),1);assert.equal(mode.getEnemyFatalSnapshot().playerResetEnemyAttack,true);
  const resumed=entryRuntime({random:()=>{throw Error("active window rerolled entry");}});const final=resumed.run(empty());
  assert.equal(final.enemyFatalRoll.kind,"resolution");assert.equal(final.enemyFatalRoll.survived,false);
  assert.equal(resumed.window.counts().checks,0);
});

test("original player Fatal failure still forces enemy window despite positive counter, without new 50% selection", () => {
  resetBattleRun();counter.setEnemyAttackCounter(7);playerMode.startFatalMode();
  while(playerMode.getFatalModeGamesLeft()>1)playerMode.consumeFatalModeTurn();
  const a=stageSource.indexOf("        if (!shouldStopBattleEvaluation && isFatalModeActive()) {");
  const b=stageSource.indexOf("        if (!shouldStopBattleEvaluation) {",a+30);
  const deps={...playerMode,startEnemyAttackMode:mode.startEnemyAttackMode,currentBattleResult:empty(),evaluation:{},
    getGuaranteedFatalBonusType:playerMode.getGuaranteedFatalBonusType,setGuaranteedFatalBonusType:playerMode.setGuaranteedFatalBonusType,
    addBattleLog:()=>{},rollAttackAttempt:()=>{throw Error("unexpected attack roll");}};
  new Function(...Object.keys(deps),transpile("let shouldStopBattleEvaluation=false,isTripleBarWin=false,playerFatalAttack=false;"+stageSource.slice(a,b)))(...Object.values(deps));
  assert.equal(mode.getEnemyAttackModeTurnsLeft(),patchConfig.fatalMode.enemyWindowTurns);assert.equal(counter.getEnemyAttackCounter(),7);
});


test("one-game admin override keeps trigger warning before final placeholder; later overrides do not resize an armed window", () => {
  const saved=patchConfig.fatalMode.enemyWindowTurns;
  try {
    patchConfig.fatalMode.enemyWindowTurns=1; resetBattleRun();counter.setEnemyAttackCounter(0);
    const entry=entryRuntime({random:()=>0});const outcome=entry.run(empty());
    assert.equal(outcome.enemyFatalRoll.kind,"resolution");assert.equal(outcome.enemyFatalRoll.entered,true);
    const run=runtime(plan({enemy:outcome.enemyFatalRoll}));run.run();assert.equal(fatal.getFatalPresentation().phase,"warning");
    run.advance(650);assert.equal(fatal.getFatalPresentation().phase,"attack");run.advance(2449);assert.equal(run.counts().retired,0);
    run.advance(2450);assert.equal(run.counts().retired,1);
    patchConfig.fatalMode.enemyWindowTurns=3;mode.startEnemyAttackMode();mode.consumeEnemyAttackModeTurn();
    patchConfig.fatalMode.enemyWindowTurns=7;mode.startEnemyAttackMode();assert.equal(mode.getEnemyAttackModeTurnsLeft(),2);
  } finally { patchConfig.fatalMode.enemyWindowTurns=saved;resetBattleRun(); }
});

test("versionless paid immediate-attack save migrates to committed entry, not immediate retirement or another trigger roll", () => {
  resetBattleRun();hand.selectPlayerBattleCard(0);hand.summonSelectedPlayerBattleCard();counter.setEnemyAttackCounter(0);
  const snapshot=structuredClone(session.buildBattleSnapshot());snapshot.enemyFatal={active:true,turns:1};
  snapshot.fatalPlan=plan({enemyKey:round.getCurrentRound()+":"+enemy.getCurrentEnemy().id,
    enemy:{attack:true,tease:true,shield:null},result:empty(),settledSlots:[true,true,true]});
  resetBattleRun();session.restoreBattleFromSnapshot(snapshot);
  assert.equal(mode.getEnemyAttackModeTurnsLeft(),2);assert.equal(fatal.getFatalPresentation().plan.enemy.kind,"entry");
  const run=runtime(fatal.getFatalPresentation().plan);run.run();run.advance(650);
  assert.equal(run.counts().retired,0);assert.equal(mode.getEnemyAttackModeTurnsLeft(),2);
});


test("legacy pending entry with ACTUALLY absent result recovers free neutral stops, clears old plan and never rerolls", () => {
  resetBattleRun();hand.selectPlayerBattleCard(0);hand.summonSelectedPlayerBattleCard();counter.setEnemyAttackCounter(0);
  const snapshot=structuredClone(session.buildBattleSnapshot());snapshot.enemyFatal={active:true,turns:1};
  snapshot.fatalPlan=plan({enemyKey:round.getCurrentRound()+":"+enemy.getCurrentEnemy().id,enemy:{attack:true,tease:true,shield:null}});
  assert.equal(Object.hasOwn(snapshot.fatalPlan,"result"),false);
  storage.saveBattleSession(snapshot);const legacy=storage.loadBattleSession();resetBattleRun();
  const noLottery=()=>{throw Error("legacy recovery attempted lottery/payment/unknown rewards");};
  const originalRandom=Math.random;Math.random=noLottery;
  try {
    session.restoreBattleFromSnapshot(legacy);
    assert.equal(Object.hasOwn(fatal.getFatalPresentation().plan,"result"),false);
    assert.equal(mode.getEnemyAttackModeTurnsLeft(),2);
    const resolution=runtime(fatal.getFatalPresentation().plan, {persist:true});
    const handlers=[], proxies=[];
    const drawCards=[0,1,2].map(index=>({scale:{set(){}},on(event,callback){handlers[index]=callback;}}));
    const cardHitProxies=[0,1,2].map(index=>({on(event,callback){proxies[index]=callback;}}));
    const a=stageSource.indexOf("      const pendingHand=getPendingBattleHand();");
    const b=stageSource.indexOf('      } else if (getBattleMode() === "battle"',a);
    const deps={getPendingBattleHand:()=>null,getFatalPresentation:fatal.getFatalPresentation,getBattleMode:()=>"battle",resetCardsToGroup:()=>{},
      setCurrentBattleResult:noLottery,drawCards,cardHitProxies,cardGroup:{visible:true,removeChild(){}},stage:{addChild(){}},
      revealed:[false,false,false],settledSlots:[false,false,false],cabinetMode:false,
      hoverTargets:[{x:1,y:2},{x:3,y:4},{x:5,y:6}],slotTargets:[{x:1,y:4},{x:3,y:6},{x:5,y:8}],L:{CARD_SCALE:1},
      currentBattleResult:new Proxy({}, {get:noLottery}),symbolTextures:new Proxy({}, {get:noLottery}),cardBackTexture:"neutral-back",PerspectiveMesh:class{},
      setCardPickable:()=>{},startHoverFloat:()=>{},stopHoverFloat:()=>{},isCardOverviewOpen:()=>false,aliveGuard:()=>()=>true,
      attachPlacementHandlers:noLottery,setBattlePresentationPhase:flow.setBattlePresentationPhase,setCardPhase:()=>{},
      completeFatalSequence:resolution.runWith,finishRevealedHand:noLottery,syncDrawAvailability:()=>{},
      finishPlayerDefeat:()=>false,commitEnemyDefeated:noLottery,setFatalStops:fatal.setFatalStops,
      saveBattleSession:storage.saveBattleSession,buildBattleSnapshot:session.buildBattleSnapshot,
      drawBattleResult:noLottery,spendPoints:noLottery};
    const code="let cardsAreOut=false,cardsReleased=false,revealedCount=0,pendingEnemyDefeatPresentation=null;"+stageSource.slice(a,b)+"};return ()=>({cardsAreOut,cardsReleased,revealedCount});";
    const state=new Function(...Object.keys(deps),transpile(code))(...Object.values(deps));
    assert.deepEqual(drawCards.map(card=>card.texture),["neutral-back","neutral-back","neutral-back"]);
    assert.equal(state().cardsAreOut,true);assert.equal(fatal.getFatalPresentation().stops,0);
    proxies[0]();handlers[0]();assert.equal(state().revealedCount,1);assert.equal(fatal.getFatalPresentation().stops,1);
    proxies[1]();assert.equal(resolution.counts().completions,0);assert.equal(mode.getEnemyAttackModeTurnsLeft(),2);
    proxies[2]();assert.equal(fatal.getFatalPresentation().phase,"warning");assert.equal(resolution.counts().retired,0);
    resolution.advance(650);assert.equal(state().cardsAreOut,false);assert.equal(state().cardsReleased,false);
    assert.equal(resolution.counts().completions,1);assert.equal(fatal.getFatalPresentation().plan,null);
    assert.equal(storage.loadBattleSession().fatalPlan,null);assert.equal(mode.getEnemyAttackModeTurnsLeft(),2);
    assert.equal(fatal.commitFatalPlan(plan({id:"following-game"})),true);
    handlers[2]();assert.equal(state().revealedCount,3);assert.equal(fatal.getFatalPresentation().plan.id,"following-game");
  } finally { Math.random=originalRandom;resetBattleRun(); }
});
