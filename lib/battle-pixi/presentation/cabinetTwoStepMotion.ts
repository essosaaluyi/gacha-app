import { CABINET_PLAYER_DOCK_BACK_QUADS } from "@/components/battle/cabinet/CabinetPlayerDock.geometry";
import { cardQuadCenter, interpolateCardQuad, type CardQuad } from "@/lib/battle-pixi/presentation/cardQuadProjection";
export const TWO_STEP_DEAL_MS = 1080;
export function sampleTwoStepCard(index: number, elapsed: number, target: CardQuad) {
  const t=Math.min(1,Math.max(0,(elapsed-index*90)/900));
  const progress=t*t*(3-2*t), lift=Math.sin(Math.PI*t)**2;
  const q=interpolateCardQuad(CABINET_PLAYER_DOCK_BACK_QUADS[index],target,progress),centre=cardQuadCenter(q);
  const quad=q.map((value,i)=> i%2 ? centre.y+(value-centre.y)*(1+lift*.2)-lift*74 : centre.x+(value-centre.x)*(1+lift*.2)) as unknown as CardQuad;
  return { quad, progress, lift, shadow: `drop-shadow(0 ${3+lift*8}px ${3+lift*9}px rgba(0,0,0,${(11/15)*(1-progress)+lift*.24}))` };
}
