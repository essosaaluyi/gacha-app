import { cardQuadCenter, interpolateCardQuad, type CardQuad } from "@/lib/battle-pixi/presentation/cardQuadProjection";
export const CABINET_MANUAL_REVEAL_MS = 980;
export const CABINET_MANUAL_FACE_MS = 250;
const ease = (value:number) => {const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export function sampleCabinetManualReveal(rest:CardQuad,time:number,verticalProjection=1,clipTop=0) {
  const center=cardQuadCenter(rest),width=(Math.hypot(rest[2]-rest[0],rest[3]-rest[1])+Math.hypot(rest[4]-rest[6],rest[5]-rest[7]))/2*1.78;
  const height=width*1.5/verticalProjection,cy=Math.max(center.y-46,clipTop+height/2+6);
  const peak:CardQuad=[center.x-width/2,cy-height/2,center.x+width/2,cy-height/2,center.x+width/2,cy+height/2,center.x-width/2,cy+height/2];
  const raised=time<640 ? ease(time/180) : 1-ease((time-640)/340);
  const q=interpolateCardQuad(rest,peak,raised);
  const fold=time<100 ? 1 : time<250 ? 1-ease((time-100)/150) : ease((time-250)/170);
  const c=cardQuadCenter(q),factor=.018+.982*fold;
  const quad=q.map((value,i)=>i%2?value:c.x+(value-c.x)*factor) as unknown as CardQuad;
  return {quad,raised,face:time>=CABINET_MANUAL_FACE_MS,done:time>=CABINET_MANUAL_REVEAL_MS};
}
export function animateCabinetManualReveal(options:{rest:CardQuad;verticalProjection:number;clipTop:number;now:()=>number;blocked:()=>boolean;alive:()=>boolean;
  schedule:(callback:()=>void)=>number;cancelFrame:(id:number)=>void;onFrame:(sample:ReturnType<typeof sampleCabinetManualReveal>)=>void;onFace:()=>void;onComplete:()=>void}) {
  const started=options.now();let frame=0,stopped=false,swapped=false;
  const tick=()=>{
    if(stopped||!options.alive())return;
    if(options.blocked()){frame=options.schedule(tick);return;}
    const sample=sampleCabinetManualReveal(options.rest,Math.max(0,options.now()-started),options.verticalProjection,options.clipTop);
    if(sample.face&&!swapped){swapped=true;options.onFace();}
    options.onFrame(sample);
    if(sample.done){stopped=true;options.onComplete();}else frame=options.schedule(tick);
  };
  tick();
  return ()=>{stopped=true;options.cancelFrame(frame);};
}
