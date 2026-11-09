import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import ts from "typescript";
import { register } from "node:module";
register("./ts-alias-loader.mjs", import.meta.url);
const { sampleTwoStepCard, TWO_STEP_DEAL_MS }=await import("@/lib/battle-pixi/presentation/cabinetTwoStepMotion");
const { cardQuadCssMatrix }=await import("@/lib/battle-pixi/presentation/cardQuadProjection");
const { CABINET_PLAYER_DOCK_BACK_QUADS, CABINET_PLAYER_DOCK_BACK_RECTS }=await import("@/components/battle/cabinet/CabinetPlayerDock.geometry");
const source=readFileSync(new URL("../components/battle/cabinet/CabinetTwoStepCards.tsx",import.meta.url),"utf8");
const ast=ts.createSourceFile("motion.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback;
const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(ast)==="useImperativeHandle")callback=node.arguments[1];ts.forEachChild(node,visit);};visit(ast);
const code=ts.transpileModule("return ("+callback.getText(ast)+")();",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const targets=[[222,156,404,156,373,292,183,292],[508,156,689,156,707,292,492,292],[796,156,977,156,1013,292,823,292]];
function project(matrix,x,y){const a=matrix.slice(9,-1).split(",").map(Number),w=a[3]*x+a[7]*y+a[15];return [(a[0]*x+a[4]*y+a[12])/w,(a[1]*x+a[5]*y+a[13])/w];}
function assertQuad(matrix,quad){[[0,0],[132,0],[132,198],[0,198]].forEach(([x,y],i)=>project(matrix,x,y).forEach((n,j)=>assert.ok(Math.abs(n-quad[i*2+j])<1e-8)));}
test("actual imperative DRAW2 starts at the wide prepared stack and hands exact perspective slot corners to Pixi",()=>{
 const cards={current:[0,1,2].map(()=>({style:{},dataset:{}}))};
 const api=new Function("cards","geometry","sampleTwoStepCard","cardQuadCssMatrix",code)(cards,{bays:targets},sampleTwoStepCard,cardQuadCssMatrix);
 api.seek(0);cards.current.forEach((card,i)=>assertQuad(card.style.transform,CABINET_PLAYER_DOCK_BACK_QUADS[i]));
 api.seek(TWO_STEP_DEAL_MS);cards.current.forEach((card,i)=>assertQuad(card.style.transform,targets[i]));assert.equal(TWO_STEP_DEAL_MS,1080);
});
test("prepared stack is centred, wider, staggered and has zero endpoint velocities without shape jumps",()=>{
 CABINET_PLAYER_DOCK_BACK_RECTS.forEach(rect=>{assert.equal(rect.x+rect.width/2,168);assert.equal(rect.width,168);});
 assert.equal(CABINET_PLAYER_DOCK_BACK_RECTS[1].y-CABINET_PLAYER_DOCK_BACK_RECTS[0].y,20);
 for(let i=0;i<3;i++){
  const start=sampleTwoStepCard(i,i*90,targets[i]),end=sampleTwoStepCard(i,900+i*90,targets[i]);
  assert.deepEqual(start.quad,CABINET_PLAYER_DOCK_BACK_QUADS[i]);assert.deepEqual(end.quad,targets[i]);
  const first=sampleTwoStepCard(i,i*90+.01,targets[i]),last=sampleTwoStepCard(i,900+i*90-.01,targets[i]);
  first.quad.forEach((n,j)=>assert.ok(Math.abs(n-start.quad[j])/.01<.001));last.quad.forEach((n,j)=>assert.ok(Math.abs(n-end.quad[j])/.01<.001));
  assert.equal(start.shadow,"drop-shadow(0 3px 3px rgba(0,0,0,0.7333333333333333))");
  for(let time=0;time<=1080;time+=5){const q=sampleTwoStepCard(i,time,targets[i]).quad;assert.ok(q.every(Number.isFinite));assertQuad(cardQuadCssMatrix(q),q);}
 }
});
