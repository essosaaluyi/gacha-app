"use client";
/* eslint-disable @next/next/no-img-element -- Existing local card backs. */
import { useRef, type RefObject } from "react";
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
  onPull?: () => void;
  backImages?: readonly string[];
};
export default function CabinetPlayerDock({ dropTargetRef, activeCard, acceptingDrop, dropActive = false, onInspect, outletPhase, preparedCount = 3, onPull, backImages }: CabinetPlayerDockProps) {
  const outlet = CABINET_PLAYER_DOCK_OUTLET;
  const pullStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  return <>
    <section className={styles.dock} aria-label="味方カードの召喚ドック" data-drop-active={dropActive}>
      <div ref={dropTargetRef} className={styles.target}>
        <span className={styles.label}>PLAYER CARD</span>
        {activeCard ? <button type="button" className={styles.card} onClick={onInspect} aria-label={`${activeCard.name}のカード概要を開く`}>
          <CardFrame src={activeCard.image} alt={activeCard.name} rarity={activeCard.rarity} plain />
        </button> : <div className={styles.empty}><span aria-hidden="true">＋</span><strong>{acceptingDrop ? "手札をここへ" : "PLAYER CARD"}</strong>{acceptingDrop && <small>ドラッグして召喚</small>}</div>}
      </div>
    </section>
    <section className={styles.outlet} style={{ left: outlet.x, top: outlet.y, width: outlet.width, height: outlet.height }} aria-label={outletPhase === "prepared" ? `排出口に裏向きカード${preparedCount}枚をセット済み` : "カード排出口"} data-phase={outletPhase} data-prepared-count={outletPhase === "prepared" ? preparedCount : 0}>
      <div className={styles.throat} aria-hidden="true" />
      {outletPhase === "prepared" && <div className={styles.backs} aria-hidden="true"
        data-pullable={Boolean(onPull)}
        onPointerDown={event => {
          if (!onPull || !event.isPrimary || event.button !== 0 || !(event.target instanceof HTMLImageElement)) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pullStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerUp={event => {
          const start = pullStart.current;
          if (start?.pointerId !== event.pointerId) return;
          pullStart.current = null;
          const down = event.clientY - start.y;
          if (down >= 24 && down >= Math.abs(event.clientX - start.x)) onPull?.();
        }}
        onLostPointerCapture={event => {
          if (pullStart.current?.pointerId === event.pointerId) pullStart.current = null;
        }}
      >{[2, 1, 0].filter(index => index < preparedCount).map(index => {
        const quad = CABINET_PLAYER_DOCK_BACK_QUADS[index].map((value,i) => value - (i%2 ? outlet.y+outlet.border : outlet.x+outlet.border)) as unknown as CardQuad;
        return <img key={index} src={resolvePlayerCardBack(backImages?.[index])} alt="" draggable={false} style={{ left: 0, top: 0, width: 132, height: 198, transformOrigin: "0 0", transform: cardQuadCssMatrix(quad), zIndex: 3 - index }} />;
      })}</div>}
      {onPull && <span className={styles.pullArrow} aria-hidden="true" />}
      <div className={styles.lip} aria-hidden="true" />
    </section>
  </>;
}
