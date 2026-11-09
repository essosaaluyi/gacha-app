"use client";
/* eslint-disable @next/next/no-img-element -- Existing local card backs. */
import type { RefObject } from "react";
import CardFrame from "@/components/gacha/CardFrame";
import { resolvePlayerCardBack } from "@/lib/cards/cardAssets";
import styles from "./CabinetPlayerDock.module.css";
import { CABINET_PLAYER_DOCK_BACK_QUADS, CABINET_PLAYER_DOCK_OUTLET } from "./CabinetPlayerDock.geometry";
import { cardQuadCssMatrix, type CardQuad } from "@/lib/battle-pixi/presentation/cardQuadProjection";

export type CabinetPlayerDockProps = {
  dropTargetRef: RefObject<HTMLDivElement | null>;
  activeCard: { name: string; image: string; rarity: string } | null;
  acceptingDrop: boolean;
  dropActive?: boolean;
  onInspect: () => void;
  outletPhase: "empty" | "prepared" | "dealing";
  preparedCount?: 0 | 1 | 2 | 3;
  backImages?: readonly string[];
};
export default function CabinetPlayerDock({ dropTargetRef, activeCard, acceptingDrop, dropActive = false, onInspect, outletPhase, preparedCount = 3, backImages }: CabinetPlayerDockProps) {
  const outlet = CABINET_PLAYER_DOCK_OUTLET;
  return <>
    <section className={styles.dock} aria-label="味方カードの召喚ドック" data-drop-active={dropActive}>
      <div ref={dropTargetRef} className={styles.target}>
        <span className={styles.label}>PLAYER CARD</span>
        {activeCard ? <button type="button" className={styles.card} onClick={onInspect} aria-label={`${activeCard.name}のカード概要を開く`}>
          <CardFrame src={activeCard.image} alt={activeCard.name} rarity={activeCard.rarity} />
        </button> : <div className={styles.empty}><span aria-hidden="true">＋</span><strong>{acceptingDrop ? "手札をここへ" : "PLAYER CARD"}</strong>{acceptingDrop && <small>ドラッグして召喚</small>}</div>}
      </div>
    </section>
    <section className={styles.outlet} style={{ left: outlet.x, top: outlet.y, width: outlet.width, height: outlet.height }} aria-label={outletPhase === "prepared" ? `排出口に裏向きカード${preparedCount}枚をセット済み` : "カード排出口"} data-phase={outletPhase} data-prepared-count={outletPhase === "prepared" ? preparedCount : 0}>
      <div className={styles.throat} aria-hidden="true" />
      {outletPhase === "prepared" && <div className={styles.backs} aria-hidden="true">{[2, 1, 0].filter(index => index < preparedCount).map(index => {
        const quad = CABINET_PLAYER_DOCK_BACK_QUADS[index].map((value,i) => value - (i%2 ? outlet.y+outlet.border : outlet.x+outlet.border)) as unknown as CardQuad;
        return <img key={index} src={resolvePlayerCardBack(backImages?.[index])} alt="" draggable={false} style={{ left: 0, top: 0, width: 132, height: 198, transformOrigin: "0 0", transform: cardQuadCssMatrix(quad), zIndex: 3 - index }} />;
      })}</div>}
      <div className={styles.lip} aria-hidden="true" />
    </section>
  </>;
}
