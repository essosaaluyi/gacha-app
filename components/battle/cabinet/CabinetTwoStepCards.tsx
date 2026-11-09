"use client";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";
import type { CabinetEject3DGeometry } from "./CabinetEjectCards3D";
import { sampleTwoStepCard } from "@/lib/battle-pixi/presentation/cabinetTwoStepMotion";
import { cardQuadCssMatrix } from "@/lib/battle-pixi/presentation/cardQuadProjection";
export { TWO_STEP_DEAL_MS } from "@/lib/battle-pixi/presentation/cabinetTwoStepMotion";
export type TwoStepCardsHandle = { seek(time: number): void };
/** Projected backs: the dock and table supply exact endpoint corners. */
export default forwardRef<TwoStepCardsHandle, { geometry: CabinetEject3DGeometry }>(function CabinetTwoStepCards({geometry},ref) {
  const cards = useRef<(HTMLImageElement|null)[]>([]);
  useImperativeHandle(ref,()=>({seek(time){
    cards.current.forEach((card,index)=>{
      if(!card)return;
      const motion=sampleTwoStepCard(index,time,geometry.bays[index]);
      card.style.transform=cardQuadCssMatrix(motion.quad);
      card.style.opacity=time<0?"0":"1";
      card.style.filter=motion.shadow;
      if(process.env.NODE_ENV!=="production")card.dataset.cardQuad=JSON.stringify(motion.quad);
    });
  }}),[geometry]);
  return <div aria-hidden="true" style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:60}}>
    {[0,1,2].map(index=><img key={index} ref={node=>{cards.current[index]=node;}} src={PLAYER_CARD_BACK_IMAGE} alt=""
      style={{position:"absolute",left:0,top:0,width:132,height:198,objectFit:"contain",zIndex:3-index,transformOrigin:"0 0",transform:cardQuadCssMatrix(sampleTwoStepCard(index,0,geometry.bays[index]).quad),filter:"drop-shadow(0 3px 3px #000b)",opacity:1}}/>)}
  </div>;
});
