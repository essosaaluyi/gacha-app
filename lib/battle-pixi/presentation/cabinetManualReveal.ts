import { cardQuadCenter, interpolateCardQuad, type CardQuad } from "@/lib/battle-pixi/presentation/cardQuadProjection";

export const CABINET_MANUAL_REVEAL_MS = 980;
export const CABINET_MANUAL_FACE_MS = 250;

/**
 * The same reveal, for a card that is already waiting out in front.
 *
 * The deal used to put the three cards straight into their bays, so a reveal
 * had to lift one out, turn it and set it back — a round trip. Now the deal
 * stops at the raised pose and the cards wait there, so a reveal is only the
 * second half: turn, and come down. The turn leads the descent, which is what
 * the owner's reference clip does — the card is already face up by the time it
 * starts moving down to the board.
 */
export const CABINET_PRESENT_REVEAL_MS = 700;
const PRESENT_FACE_MS = 180;
const PRESENT_FOLD_IN_MS = 60;
const PRESENT_FOLD_OUT_MS = 140;
const PRESENT_DESCEND_FROM_MS = 140;
const PRESENT_DESCEND_MS = 520;

const ease = (value:number) => {const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};

/**
 * Where a card waits for the player: in front of its bay, 1.78x wider, lifted
 * clear of the table and held off the top of the glass.
 *
 * This is the pose the reveal always rose into; naming it lets the deal aim at
 * it, so the card the player clicks is already where the turn begins.
 */
export function cabinetPresentQuad(rest:CardQuad,verticalProjection=1,clipTop=0):CardQuad {
  const center=cardQuadCenter(rest),width=(Math.hypot(rest[2]-rest[0],rest[3]-rest[1])+Math.hypot(rest[4]-rest[6],rest[5]-rest[7]))/2*1.78;
  const height=width*1.5/verticalProjection,cy=Math.max(center.y-46,clipTop+height/2+6);
  return [center.x-width/2,cy-height/2,center.x+width/2,cy-height/2,center.x+width/2,cy+height/2,center.x-width/2,cy+height/2];
}

export function sampleCabinetManualReveal(rest:CardQuad,time:number,verticalProjection=1,clipTop=0,fromPresent=false) {
  const peak=cabinetPresentQuad(rest,verticalProjection,clipTop);
  // Waiting out front: start raised and come down. Starting at the bay: rise,
  // hold, then settle back.
  const raised=fromPresent
    ? 1-ease((time-PRESENT_DESCEND_FROM_MS)/PRESENT_DESCEND_MS)
    : (time<640 ? ease(time/180) : 1-ease((time-640)/340));
  const q=interpolateCardQuad(rest,peak,raised);
  const faceAt=fromPresent?PRESENT_FACE_MS:CABINET_MANUAL_FACE_MS;
  // The turn itself: squash to an edge at faceAt, swap the face there, open out.
  const fold=fromPresent
    ? (time<PRESENT_FOLD_IN_MS ? 1
      : time<faceAt ? 1-ease((time-PRESENT_FOLD_IN_MS)/(faceAt-PRESENT_FOLD_IN_MS))
      : ease((time-faceAt)/PRESENT_FOLD_OUT_MS))
    : (time<100 ? 1 : time<250 ? 1-ease((time-100)/150) : ease((time-250)/170));
  const c=cardQuadCenter(q),factor=.018+.982*fold;
  const quad=q.map((value,i)=>i%2?value:c.x+(value-c.x)*factor) as unknown as CardQuad;
  return {quad,raised,face:time>=faceAt,done:time>=(fromPresent?CABINET_PRESENT_REVEAL_MS:CABINET_MANUAL_REVEAL_MS)};
}
export function animateCabinetManualReveal(options:{rest:CardQuad;verticalProjection:number;clipTop:number;now:()=>number;blocked:()=>boolean;alive:()=>boolean;fromPresent?:boolean;
  schedule:(callback:()=>void)=>number;cancelFrame:(id:number)=>void;onFrame:(sample:ReturnType<typeof sampleCabinetManualReveal>)=>void;onFace:()=>void;onComplete:()=>void}) {
  const started=options.now();let frame=0,stopped=false,swapped=false;
  const tick=()=>{
    if(stopped||!options.alive())return;
    if(options.blocked()){frame=options.schedule(tick);return;}
    const sample=sampleCabinetManualReveal(options.rest,Math.max(0,options.now()-started),options.verticalProjection,options.clipTop,options.fromPresent);
    if(sample.face&&!swapped){swapped=true;options.onFace();}
    options.onFrame(sample);
    if(sample.done){stopped=true;options.onComplete();}else frame=options.schedule(tick);
  };
  tick();
  return ()=>{stopped=true;options.cancelFrame(frame);};
}
