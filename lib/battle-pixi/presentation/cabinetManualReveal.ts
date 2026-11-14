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
const PRESENT_FLIP_END_MS = PRESENT_FACE_MS + PRESENT_FOLD_OUT_MS;
export const DEFAULT_LANDING = { floatMs: 140, dropMs: 150, settleMs: 90, lift: 14, pitch: 22 };

const ease = (value:number) => {const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};

/**
 * All three backs hover at the same size above their respective bays.
 */
export function cabinetPresentQuad(rest:CardQuad,verticalProjection=1,clipTop=0):CardQuad {
  return raisedQuad(rest, verticalProjection, clipTop, 197, 64);
}

function raisedQuad(rest:CardQuad,verticalProjection:number,clipTop:number,width:number,lift:number):CardQuad {
  const center=cardQuadCenter(rest);
  const height=width*1.5/verticalProjection,cy=Math.max(center.y-lift,clipTop+height/2+6);
  return [center.x-width/2,cy-height/2,center.x+width/2,cy-height/2,center.x+width/2,cy+height/2,center.x-width/2,cy+height/2];
}

function legacyRevealQuad(rest:CardQuad,verticalProjection:number,clipTop:number):CardQuad {
  const width=(Math.hypot(rest[2]-rest[0],rest[3]-rest[1])+Math.hypot(rest[4]-rest[6],rest[5]-rest[7]))/2*1.78;
  return raisedQuad(rest, verticalProjection, clipTop, width, 46);
}

export function sampleCabinetManualReveal(rest:CardQuad,time:number,verticalProjection=1,clipTop=0,fromPresent=false,landing=DEFAULT_LANDING) {
  const peak=fromPresent ? cabinetPresentQuad(rest,verticalProjection,clipTop) : legacyRevealQuad(rest,verticalProjection,clipTop);
  // Waiting out front: start raised and come down. Starting at the bay: rise,
  // hold, then settle back.
  let raised=fromPresent
    ? 1-ease((time-PRESENT_DESCEND_FROM_MS)/PRESENT_DESCEND_MS)
    : (time<640 ? ease(time/180) : 1-ease((time-640)/340));
  let lift = 0;
  let pitch = 0;
  const duration = PRESENT_FLIP_END_MS + landing.floatMs + landing.dropMs + landing.settleMs;
  if (fromPresent && time >= PRESENT_FLIP_END_MS) {
    const takeoff = 1 - ease((PRESENT_FLIP_END_MS - PRESENT_DESCEND_FROM_MS) / PRESENT_DESCEND_MS);
    const afterFlip = time - PRESENT_FLIP_END_MS;
    const drop = Math.max(0, Math.min(1, (afterFlip - landing.floatMs) / landing.dropMs));
    const settle = ease((time - duration + landing.settleMs) / landing.settleMs);
    raised = takeoff * (1 - drop ** 2);
    lift = landing.lift * ease(afterFlip / Math.max(1, landing.floatMs)) * (1 - drop);
    pitch = landing.pitch * drop ** 3 * (1 - settle);
  }
  const q=interpolateCardQuad(rest,peak,raised);
  const faceAt=fromPresent?PRESENT_FACE_MS:CABINET_MANUAL_FACE_MS;
  // The turn itself: squash to an edge at faceAt, swap the face there, open out.
  const fold=fromPresent
    ? (time<PRESENT_FOLD_IN_MS ? 1
      : time<faceAt ? 1-ease((time-PRESENT_FOLD_IN_MS)/(faceAt-PRESENT_FOLD_IN_MS))
      : ease((time-faceAt)/PRESENT_FOLD_OUT_MS))
    : (time<100 ? 1 : time<250 ? 1-ease((time-100)/150) : ease((time-250)/170));
  const c=cardQuadCenter(q),factor=.018+.982*fold;
  const quad=q.map((value,i)=>i%2 ? value - lift - (i < 4 ? pitch : 0) : c.x+(value-c.x)*factor) as unknown as CardQuad;
  return {quad,raised,face:time>=faceAt,done:time>=(fromPresent?duration:CABINET_MANUAL_REVEAL_MS)};
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
