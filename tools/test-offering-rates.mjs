import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const config={gachaOdds:{R:60,SR:25,SSR:10,UR:5}};
const compile=path=>ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const generated={};vm.runInNewContext(compile('lib/game-config/generated.ts'),{exports:generated});
let random=.1;const math=Object.create(Math);math.random=()=>random;
const out={};vm.runInNewContext(compile('lib/gacha/pullLogic.ts'),{exports:out,Math:math,require:id=>id.includes('generated')?generated:id.includes('patchConfig')?{patchConfig:config}:{PLAYER_CARD_BACK_IMAGE:'/back.webp'}});
for(const weights of [{R:60,SR:25,SSR:10,UR:5},{R:10,SR:20,SSR:30,UR:40},{R:40,SR:20,SSR:10,UR:5},{R:90,SR:30,SSR:10,UR:5}]){
 config.gachaOdds=weights;const rates=out.getOfferingRates();assert.equal(rates.flatMap(r=>r.cards).length,15);assert.ok(Math.abs(rates.reduce((n,r)=>n+r.probability,0)-100)<1e-9);
 for(const group of rates)assert.ok(Math.abs(group.cards.reduce((n,c)=>n+c.probability,0)-group.probability)<1e-9);
 const counts={};for(let i=0;i<10000;i++){random=(i+.5)/10000;const rarity=out.rollRarity();counts[rarity]=(counts[rarity]??0)+1;}
 for(const group of rates)assert.ok(Math.abs((counts[group.rarity]??0)/100-group.probability)<.02);
}
assert.equal(out.pullMany(1).length,1);assert.equal(out.pullMany(5).length,5);console.log('Offering rates: 15 cards, sums, live overrides, actual lottery intervals, under/over100 fallback and generic pullMany pass');
