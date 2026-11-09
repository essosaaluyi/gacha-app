import assert from "node:assert/strict";
import { test } from "node:test";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
register("./ts-alias-loader.mjs",import.meta.url);
const { sampleCabinetManualReveal,animateCabinetManualReveal,CABINET_MANUAL_REVEAL_MS }=await import("@/lib/battle-pixi/presentation/cabinetManualReveal");
const rest=[222,156,404,156,373,292,183,292];

test("manual BACK→FACE raises, enlarges, holds then settles exactly into the old perspective slot",()=>{
 assert.deepEqual(sampleCabinetManualReveal(rest,0,1.787,61).quad,rest);
 const front=sampleCabinetManualReveal(rest,430,1.787,61),hold=sampleCabinetManualReveal(rest,620,1.787,61);
 assert.equal(sampleCabinetManualReveal(rest,249,1.787,61).face,false);assert.equal(sampleCabinetManualReveal(rest,250,1.787,61).face,true);
 assert.deepEqual(front.quad,hold.quad);assert.ok(front.quad[2]-front.quad[0]>320);assert.ok(front.quad[1]>=67);
 assert.deepEqual(sampleCabinetManualReveal(rest,CABINET_MANUAL_REVEAL_MS,1.787,61).quad,rest);
 const almost=sampleCabinetManualReveal(rest,CABINET_MANUAL_REVEAL_MS-.01,1.787,61).quad;
 almost.forEach((n,i)=>assert.ok(Math.abs(n-rest[i])/.01<.001));
 for(let t=0;t<=CABINET_MANUAL_REVEAL_MS;t++){const value=sampleCabinetManualReveal(rest,t,1.787,61);assert.ok(value.quad.every(Number.isFinite));assert.ok(value.quad[2]>value.quad[0]);}
});

test("real animation driver pauses without swapping/sounding/completing, resumes once, and cancels stale frames",()=>{
 let now=0,blocked=false,alive=true,swaps=0,done=0,frames=0,id=0;const queued=new Map();
 const cancel=animateCabinetManualReveal({rest,verticalProjection:1.787,clipTop:61,now:()=>now,blocked:()=>blocked,alive:()=>alive,
  schedule:callback=>{queued.set(++id,callback);return id;},cancelFrame:key=>queued.delete(key),onFrame:()=>frames++,onFace:()=>swaps++,onComplete:()=>done++});
 const step=value=>{now=value;const batch=[...queued.values()];queued.clear();batch.forEach(fn=>fn());};
 step(180);const before=frames;blocked=true;step(180);step(180);assert.equal(frames,before);assert.equal(swaps,0);assert.equal(done,0);
 blocked=false;step(250);assert.equal(swaps,1);step(600);step(980);step(1000);assert.equal(swaps,1);assert.equal(done,1);assert.equal(queued.size,0);cancel();
 animateCabinetManualReveal({rest,verticalProjection:1,clipTop:0,now:()=>now,blocked:()=>false,alive:()=>alive,
  schedule:callback=>{queued.set(++id,callback);return id;},cancelFrame:key=>queued.delete(key),onFrame:()=>{},onFace:()=>swaps++,onComplete:()=>done++});
 alive=false;step(2000);assert.equal(swaps,1);assert.equal(done,1);assert.equal(queued.size,0);
});

test("actual reveal entry latches duplicate manual taps before animation and keeps committed symbol/order",()=>{
 const code=ts.transpileModule(readFileSync(new URL("../lib/battle-pixi/presentation/cardRevealSystem.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};let dismiss=0,pulses=0,presentations=0,animations=0,complete=0,callbacks;
 vm.runInNewContext(code,{exports,process:{env:{NODE_ENV:"production"}},require:name=>name.includes("cardPresentation")?{playCardRevealPresentation:()=>presentations++}:name.includes("magicCircle")?{pulseMagicCircle:()=>pulses++}:name.includes("chanceIcon")?{dismissChanceIcon:()=>dismiss++}:{},console});
 const revealed=[false,false,false],card={texture:"back",scale:{x:1,y:1,set(){}},skew:{set(){}}};
 const params={card,cardIndex:1,revealed,currentCards:["Coin","Attack","Empty"],symbolTextures:{Attack:"committed-attack"},present:(swap,end)=>{animations++;callbacks={swap,end};},onRevealComplete:()=>complete++};
 exports.revealCard(params);exports.revealCard(params);assert.equal(animations,1);assert.equal(dismiss,1);assert.deepEqual(revealed,[false,true,false]);
 callbacks.swap();assert.equal(card.texture,"committed-attack");callbacks.end();assert.equal(complete,1);assert.equal(pulses,1);assert.equal(presentations,1);
});
