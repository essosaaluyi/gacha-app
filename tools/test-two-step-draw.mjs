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
      source: `let earned = 0; let credits=[];
        export const getWalletState = () => ({points:1000, sessionEarnedPoints:earned, loaded:true});
        export const setWalletSessionEarned = value => { earned = value; };
        export const resetWalletSessionEarned = () => { earned = 0; };
        export const subscribeWallet = () => () => {};
        export const initializeWallet = async () => {};
        export const addPoints = async (amount, reason) => { credits.push({amount,reason}); }; export const getTestCredits=()=>credits;
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



const pending=await import("../lib/battle-pixi/state/pendingBattleHandStore.ts");
const {activeDelay}=await import("../lib/battle-pixi/presentation/cabinetDealSequence.ts");
const source=readFileSync(new URL("../components/battle/BattlePixiStage.tsx",import.meta.url),"utf8");
const transpile=code=>ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
function fixture(restored=false,auto=false){
 let now=0,blocked=false,cancelled=false,commits=0,releases=0,openings=0;const timers=[],stops=[],cues=[];
 const clock={now:()=>now,blocked:()=>blocked,cancelled:()=>cancelled,schedule:(fn,delay)=>timers.push({at:now+delay,fn})};
 const a=source.indexOf("      const requestDraw = () => {");const b=source.indexOf("      const autoProgressOnce",a);
 const deps={cabinetMode:true,presentationBlocked:()=>blocked,canUseBattleControls:()=>true,canRequestBattleDraw:()=>true,
  clearBarChance:()=>{},DRAW_WAIT_MS:0,performance:{now:()=>now},emitCabinetPile:()=>{},paidCommit:()=>{commits++;},playSfx:name=>cues.push(name),
  persistPendingHand:()=>{},consumeArmedBonusPresentation:()=>{openings++;},releaseCardsToTable:()=>{releases++;},
  handTimeout:(fn,ms)=>activeDelay(clock,ms,fn),setTimeout:(fn,ms)=>clock.schedule(fn,ms),presentationClock:{now:()=>now},
  wrapperRef:{current:{closest:()=>null}},window:{dispatchEvent:()=>{},requestAnimationFrame:()=>1},
  CustomEvent:class{},pumpFlightClock:()=>{},CABINET_EJECT3D_DURATION_MS:1080,
  getBonusModeState:()=>({}),getNestedBonusState:()=>({}),getChanceWaitRemaining:()=>0,placeCardFromHover:index=>stops.push(index)};
 const declarations="let cardsAreOut="+restored+",cardsReleased=false,dealPhase="+(restored?'"set"':'"idle"')+",dealBusy=false,pendingNextRound=false,lastDrawStartedAt=0,setCount=0,ejectClock=0,ejectStartedAt=0,flightFrame=null,autoPlayEnabled="+auto+",autoProgressBusy=false,landingCorners=null,measuredGeometry=null;let cancelled=false;const runDrawRequest=()=>{paidCommit();cardsAreOut=true;return true;};";
 const api=new Function(...Object.keys(deps),transpile(declarations+source.slice(a,b)+source.slice(b,source.indexOf("      const onRoundIntroComplete",b))+";return {press:requestDraw,auto:autoProgressOnce,state:()=>({cardsAreOut,dealPhase,setCount,dealBusy})};"))(...Object.values(deps));
 return {...api,stops:()=>stops,cues:()=>cues,counts:()=>({commits,releases,openings}),block:value=>blocked=value,cancel:()=>cancelled=true,advance(to){while(timers.length){timers.sort((a,b)=>a.at-b.at);if(timers[0].at>to)break;const t=timers.shift();now=t.at;t.fn();}now=to;}};
}

test("existing outlet SET cue plays once with the first emerging back, pauses with preparation, and DRAW2 cue starts at release",()=>{
 const run=fixture();run.press();run.block(true);run.advance(800);assert.deepEqual(run.cues(),[]);
 run.block(false);run.advance(1600);assert.deepEqual(run.cues(),["cardSetToDisk"]);
 run.press();run.press();assert.deepEqual(run.cues(),["cardSetToDisk","drawCard"]);
 run.advance(3000);assert.deepEqual(run.cues(),["cardSetToDisk","drawCard"]);assert.equal(run.counts().commits,1);
});
test("actual request funnel commits once, absorbs setting spam, holds SET indefinitely and releases same hand free",()=>{
 const run=fixture();run.press();run.press();run.advance(650);
 assert.equal(run.state().dealPhase,"set");run.advance(3600000);assert.deepEqual(run.counts(),{commits:1,releases:0,openings:0});
 run.press();run.press();assert.equal(run.state().dealPhase,"dealing");run.advance(3601080);
 assert.deepEqual(run.counts(),{commits:1,releases:1,openings:1});run.press();assert.equal(run.counts().commits,1);
});
test("restored nonfatal SET needs second press and never calls paid commit; hidden pauses release",()=>{
 const run=fixture(true);run.advance(60000);assert.equal(run.counts().releases,0);run.press();run.advance(60300);
 run.block(true);run.advance(120300);assert.equal(run.counts().releases,0);run.block(false);run.advance(122000);
 assert.deepEqual(run.counts(),{commits:0,releases:1,openings:1});
});
test("ordinary snapshot stores result/order/phase without Fatal plan; interrupted deal restores SET and malformed schema rejected",()=>{
 const value={version:1,enemyKey:"1:2",playerIndex:0,result:{result:"Coin",cards:["Coin","Empty","Coin"],targetSlot:2},phase:"set",settledSlots:[false,false,false],enemyDefeat:null,struggleWinner:null};
 pending.savePendingBattleHand(value);value.result.cards[0]="Attack";
 const saved=JSON.parse(JSON.stringify(pending.getPendingBattleHand()));pending.clearPendingBattleHand();pending.restorePendingBattleHand(saved);
 assert.equal(pending.getPendingBattleHand().result.cards[0],"Coin");assert.equal(pending.getPendingBattleHand().phase,"set");
 pending.restorePendingBattleHand({...saved,phase:"dealing"});assert.equal(pending.getPendingBattleHand().phase,"set");
 pending.restorePendingBattleHand({...saved,version:9});assert.equal(pending.getPendingBattleHand(),null);
});


test("real ordinary session Continue restores paid SET and next press only releases",async()=>{
 const session=await import("../lib/battle-pixi/state/battleSessionSync.ts"), storage=await import("../lib/battle-pixi/state/battleSessionStore.ts");
 const hand=await import("../lib/battle-pixi/state/playerBattleCardStore.ts"),enemy=await import("../lib/battle-pixi/state/currentEnemyStore.ts");
 const {resetBattleRun}=await import("../lib/battle-pixi/state/resetBattleRun.ts");
 const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 globalThis.window={location:{search:""},localStorage,setTimeout,clearTimeout};
 resetBattleRun();hand.selectPlayerBattleCard(0);hand.summonSelectedPlayerBattleCard();
 const record={version:1,enemyKey:"1:"+enemy.getCurrentEnemy().id,playerIndex:0,result:{result:"Coin",cards:["Coin","Empty","Coin"],targetSlot:2},phase:"set",settledSlots:[false,false,false],enemyDefeat:null,struggleWinner:null};
 pending.savePendingBattleHand(record);storage.saveBattleSession(session.buildBattleSnapshot());const saved=storage.loadBattleSession();assert.equal(saved.fatalPlan,null);
 resetBattleRun();session.restoreBattleFromSnapshot(saved);assert.deepEqual(pending.getPendingBattleHand(),record);
 const run=fixture(pending.getPendingBattleHand().phase==="set");run.advance(120000);assert.equal(run.counts().releases,0);
 run.press();run.advance(121080);assert.deepEqual(run.counts(),{commits:0,releases:1,openings:1});
});


test("actual AUTO funnel drives paid prepare then free release and all three stops in order",()=>{
 const run=fixture(false,true);run.auto();run.advance(650);run.auto();run.auto();run.advance(4000);
 assert.deepEqual(run.counts(),{commits:1,releases:1,openings:1});assert.deepEqual(run.stops(),[0,1,2]);
});


test("actual watchdog leaves ordinary committed SET/reveal waiting untouched",()=>{
 const ast=ts.createSourceFile("stage.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback;
 const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(ast)==="handTimeout"&&node.arguments[1]?.getText(ast)==="HAND_WATCHDOG_MS")callback=node.arguments[0];ts.forEachChild(node,visit);};visit(ast);assert.ok(callback);
 const fail=()=>{throw Error("watchdog advanced/discarded ordinary hand");};
 const deps={cardsAreOut:true,getFatalPresentation:()=>({plan:null}),getPendingBattleHand:()=>({phase:"set"}),beginNewHand:fail,completeFatalSequence:fail,finishPlayerDefeat:fail,console:{warn:fail}};
 const watchdog=new Function(...Object.keys(deps),"return ("+transpile(callback.getText(ast)).trim().replace(/;$/,"")+");")(...Object.values(deps));watchdog();watchdog();
});
test("unmount/cancel during free release prevents later placement without another commit",()=>{
 const run=fixture();run.press();run.advance(650);run.press();run.advance(900);run.cancel();run.advance(5000);
 assert.deepEqual(run.counts(),{commits:1,releases:0,openings:1});
});


test("committed Chance reward survives real session Continue and credit completion persists its removal",async()=>{
 const chance=await import("../lib/battle-pixi/state/chancePointsRevealStore.ts"),session=await import("../lib/battle-pixi/state/battleSessionSync.ts"),storage=await import("../lib/battle-pixi/state/battleSessionStore.ts"),wallet=await import("@/lib/wallet/walletStore");
 const originalRandom=Math.random;Math.random=()=>0;
 try { assert.equal(chance.rollChancePointsGain(["Chance","Empty","Empty"],"R4"),20); } finally {Math.random=originalRandom;}
 const snapshot=session.buildBattleSnapshot();assert.deepEqual(snapshot.chancePoints.pending,{points:20,cardName:"R4"});
 chance.clearChancePointsReveal();Math.random=()=>{throw Error("Continue rerolled Chance reward");};
 try {session.restoreBattleFromSnapshot(snapshot);} finally {Math.random=originalRandom;}
 assert.deepEqual(chance.getChancePointsRevealState().pending,{points:20,cardName:"R4"});
 const events=new EventTarget();window.addEventListener=events.addEventListener.bind(events);window.removeEventListener=events.removeEventListener.bind(events);globalThis.document={visibilityState:"visible"};
 session.startAutoSave();const before=wallet.getTestCredits().length;
 assert.equal(chance.startPendingChancePointsReveal(),true);chance.finishChancePointsReveal();chance.finishChancePointsReveal();
 assert.equal(wallet.getTestCredits().length,before+1);assert.deepEqual(wallet.getTestCredits().at(-1),{amount:20,reason:"chance_points"});
 const completed=storage.loadBattleSession();assert.equal(completed.chancePoints.active,null);assert.equal(completed.chancePoints.pending,null);
 session.stopAutoSave();session.restoreBattleFromSnapshot(completed);assert.equal(chance.startPendingChancePointsReveal(),false);
});

test("actual normal third-stop completion saves cleared pending hand AFTER single Triple Coin award; Continue cannot replay it",async()=>{
 const session=await import("../lib/battle-pixi/state/battleSessionSync.ts"),storage=await import("../lib/battle-pixi/state/battleSessionStore.ts");
 const hand=await import("../lib/battle-pixi/state/playerBattleCardStore.ts"),enemy=await import("../lib/battle-pixi/state/currentEnemyStore.ts");
 const {resetBattleRun}=await import("../lib/battle-pixi/state/resetBattleRun.ts");resetBattleRun();hand.selectPlayerBattleCard(0);hand.summonSelectedPlayerBattleCard();
 const result={result:"Coin",cards:["Coin","Coin","Coin"],targetSlot:0};
 pending.savePendingBattleHand({version:1,enemyKey:"1:"+enemy.getCurrentEnemy().id,playerIndex:0,result,phase:"reveal",settledSlots:[true,true,true],enemyDefeat:null,struggleWinner:null});
 storage.saveBattleSession(session.buildBattleSnapshot());assert.ok(storage.loadBattleSession().pendingHand);
 let awards=0;const trace=[];
 const a=source.indexOf("      const finishRevealedHand = () => {"),b=source.indexOf("      const handleRevealComplete",a);
 const deps={clearPendingBattleHand:()=>{trace.push("clear");pending.clearPendingBattleHand();},currentBattleResult:result,readCompletedHandFlash:()=>null,
  handTimeout:()=>{},isResurrectionGlitchPending:()=>false,getBonusModeState:()=>({active:false}),isNestedBonusActive:()=>false,
  addBattlePoints:()=>{awards++;trace.push("award");},addBattleLog:()=>{},patchConfig:{tableCards:{tripleCoinPoints:10}},
  showResultCutIn:()=>false,setBattlePresentationPhase:()=>{},buildBattleSnapshot:session.buildBattleSnapshot,
  saveBattleSession:snapshot=>{trace.push("save");storage.saveBattleSession(snapshot);}};
 const finish=new Function(...Object.keys(deps),transpile("let pendingEnemyDefeatPresentation=null,pendingPlayerReplacement=false,revealedCount=3;"+source.slice(a,b)+";return finishRevealedHand;"))(...Object.values(deps));
 finish();assert.equal(awards,1);assert.ok(trace.indexOf("save")>trace.indexOf("award"));assert.equal(storage.loadBattleSession().pendingHand,null);
 const completed=storage.loadBattleSession();resetBattleRun();session.restoreBattleFromSnapshot(completed);assert.equal(pending.getPendingBattleHand(),null);
 assert.equal(awards,1);
});


test("actual Continue restarts only committed struggle cast; winner waits for missing third stop or resolves once if already settled",async()=>{
 const session=await import("../lib/battle-pixi/state/battleSessionSync.ts"),storage=await import("../lib/battle-pixi/state/battleSessionStore.ts");
 const hand=await import("../lib/battle-pixi/state/playerBattleCardStore.ts"),enemy=await import("../lib/battle-pixi/state/currentEnemyStore.ts"),overlay=await import("../lib/battle-pixi/state/attackLandRevealStore.ts");
 const {resetBattleRun}=await import("../lib/battle-pixi/state/resetBattleRun.ts");
 const cast={playerImage:"/saved-player.png",playerName:"Saved player",enemyImage:"/saved-enemy.png",enemyName:"Saved enemy"};
 const a=source.indexOf("      const restoreCommittedStruggle ="),b=source.indexOf("      const pendingHand=getPendingBattleHand();",a);
 const ta=source.indexOf("            if (pendingStruggleWinner !== null) {"),tb=source.indexOf("pendingStruggleWinner = null;",ta)+"pendingStruggleWinner = null;".length;
 for(const winner of ["player","enemy"])for(const settled of [[true,true,false],[true,true,true]]) {
  resetBattleRun();hand.selectPlayerBattleCard(0);hand.summonSelectedPlayerBattleCard();
  pending.savePendingBattleHand({version:1,enemyKey:"1:"+enemy.getCurrentEnemy().id,playerIndex:0,result:{result:"Empty",cards:["Empty","Empty","Empty"],targetSlot:0},phase:"reveal",settledSlots:settled,enemyDefeat:null,struggleWinner:winner,struggleCast:cast});
  storage.saveBattleSession(session.buildBattleSnapshot());const snapshot=storage.loadBattleSession();resetBattleRun();
  let arms=0;const originalRandom=Math.random;Math.random=()=>{throw Error("struggle restore rerolled");};
  try {
   session.restoreBattleFromSnapshot(snapshot);assert.equal(overlay.getAttackLandRevealState().active,false);
   const deps={getCurrentPlayerBattleCard:hand.getCurrentPlayerBattleCard,getCurrentEnemy:enemy.getCurrentEnemy,
    startAttackLandStruggle:overlay.startAttackLandStruggle,revealAttackLandWinner:overlay.revealAttackLandWinner,
    armPlayerFatalModeOpening:()=>{arms++;}};
   const code="let pendingStruggleWinner=null;"+source.slice(a,b)+";return {resume:restoreCommittedStruggle,third:()=>{"+source.slice(ta,tb)+"}},waiting:()=>pendingStruggleWinner};";
   const controller=new Function(...Object.keys(deps),transpile(code))(...Object.values(deps));
   controller.resume(pending.getPendingBattleHand());const restored=overlay.getAttackLandRevealState();
   assert.equal(restored.active,true);for(const key of Object.keys(cast))assert.equal(restored[key],cast[key]);
   assert.equal(restored.winner,settled.every(Boolean)?winner:null);
   assert.equal(controller.waiting(),settled.every(Boolean)?null:winner);
   controller.third();controller.third();assert.equal(overlay.getAttackLandRevealState().winner,winner);
   assert.equal(arms,winner==="player"?1:0);
  } finally {Math.random=originalRandom;}
 }
});
