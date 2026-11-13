"use client";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";
import type { CabinetEject3DGeometry } from "./CabinetEjectCards3D";
import { sampleTwoStepCard } from "@/lib/battle-pixi/presentation/cabinetTwoStepMotion";
import { cardQuadCssMatrix } from "@/lib/battle-pixi/presentation/cardQuadProjection";
import { CABINET_PLAYER_DOCK_MOUTH } from "./CabinetPlayerDock.geometry";
export { TWO_STEP_DEAL_MS } from "@/lib/battle-pixi/presentation/cabinetTwoStepMotion";
export type TwoStepCardsHandle = { seek(time: number): void };

/**
 * What a card inside the machine is allowed to show through.
 *
 * In stage pixels, because this layer is laid out in them like the dock is: the
 * slot's own column down to the lip, and then everything below the lip, which
 * is out in the open. A card keeps its full size the whole way and this hides
 * the part that has not come out yet — it used to be squashed into the mouth
 * instead, which is why a dealt card started at the wrong shape.
 */
const M = CABINET_PLAYER_DOCK_MOUTH;
const STAGE = { width: 1920, height: 1080 };
const MOUTH_CLIP = `polygon(${M.x0}px ${M.y0}px, ${M.x1}px ${M.y0}px, ${M.x1}px ${M.y1}px, ${STAGE.width}px ${M.y1}px, ${STAGE.width}px ${STAGE.height}px, 0px ${STAGE.height}px, 0px ${M.y1}px, ${M.x0}px ${M.y1}px)`;

/** Projected backs: the dock and table supply exact endpoint corners. */
export default forwardRef<TwoStepCardsHandle, { geometry: CabinetEject3DGeometry }>(function CabinetTwoStepCards({geometry},ref) {
  const cards = useRef<(HTMLImageElement|null)[]>([]);
  const masks = useRef<(HTMLDivElement|null)[]>([]);
  useImperativeHandle(ref,()=>({seek(time){
    cards.current.forEach((card,index)=>{
      if(!card)return;
      const motion=sampleTwoStepCard(index,time,geometry.bays[index]);
      card.style.transform=cardQuadCssMatrix(motion.quad);
      card.style.opacity=time<0?"0":"1";
      card.style.filter=motion.shadow;
      const mask=masks.current[index];
      if(mask)mask.style.clipPath=motion.masked?MOUTH_CLIP:"none";
      if(process.env.NODE_ENV!=="production")card.dataset.cardQuad=JSON.stringify(motion.quad);
    });
  }}),[geometry]);
  return <div aria-hidden="true" style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:60}}>
    {[0,1,2].map(index=>{
      const start=sampleTwoStepCard(index,0,geometry.bays[index]);
      return <div key={index} ref={node=>{masks.current[index]=node;}}
        style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:3-index,clipPath:start.masked?MOUTH_CLIP:"none"}}>
        <img ref={node=>{cards.current[index]=node;}} src={PLAYER_CARD_BACK_IMAGE} alt=""
          style={{position:"absolute",left:0,top:0,width:132,height:198,objectFit:"contain",transformOrigin:"0 0",transform:cardQuadCssMatrix(start.quad),filter:"drop-shadow(0 3px 3px #000b)",opacity:1}}/>
      </div>;
    })}
  </div>;
});
