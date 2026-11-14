"use client";

import CroppedCardImage from "@/components/gacha/CroppedCardImage";

/* eslint-disable @next/next/no-img-element -- Local cabinet card artwork already includes its frame. */
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from "react";
import type { Card } from "@/lib/gacha/pullLogic";
import type { BattleEnemy } from "@/lib/battle-pixi/config/enemyConfig";
import { getPlayerCharacterName } from "@/lib/battle-pixi/config/characterNames";
import CardOverviewDialog, { type CardOverviewData } from "./CardOverviewDialog";
import styles from "./BattleSummonPanel.module.css";

export type BattleSummonChoice = { index: number; card: Card };
export type BattleSummonPanelProps = {
  enemy: BattleEnemy | null;
  cards: BattleSummonChoice[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onSummon: () => void;
  disabled?: boolean;
  fieldRef?: RefObject<HTMLElement | null>;
  dropTargetRef?: RefObject<HTMLElement | null>;
  onDropActiveChange?: (active: boolean) => void;
  getCardOverview?: (card: Card) => CardOverviewData;
};

type ActiveDrag = {
  choice: BattleSummonChoice;
  pointerId: number;
  element: HTMLButtonElement;
  startX: number;
  startY: number;
  moved: boolean;
};
type Ghost = { choice: BattleSummonChoice; x: number; y: number; inField: boolean };

export default function BattleSummonPanel(props: BattleSummonPanelProps) {
  // A changed opponent, hand instance or enabled state invalidates every
  // unfinished gesture/confirmation, even if a roster id is reused later.
  const context = JSON.stringify([
    props.enemy, Boolean(props.disabled),
    props.cards.map(({ index, card }) => [index, card.name, card.image, card.rarity]),
  ]);
  return <SummonHand key={context} {...props} />;
}

function SummonHand({ enemy, cards, selectedIndex, onSelect, onSummon, disabled = false, fieldRef, dropTargetRef, onDropActiveChange, getCardOverview }: BattleSummonPanelProps) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const cardButtons = useRef(new Map<number, HTMLButtonElement>());
  const returnFocusIndex = useRef<number | null>(null);
  const activeDrag = useRef<ActiveDrag | null>(null);
  const dropChange = useRef(onDropActiveChange);
  const suppressPointerClick = useRef(false);
  const submitted = useRef(false);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [pending, setPending] = useState<BattleSummonChoice | null>(null);
  const [viewed, setViewed] = useState<BattleSummonChoice | null>(null);
  const [locked, setLocked] = useState(false);
  const [observedSelection, setObservedSelection] = useState(selectedIndex);
  const unavailable = disabled || !enemy || locked;
  useEffect(() => { dropChange.current = onDropActiveChange; }, [onDropActiveChange]);

  // Revoke an old confirmation on external selection changes. Updating this
  // component's own state conditionally also prevents later resurrection.
  if (observedSelection !== selectedIndex) {
    setObservedSelection(selectedIndex);
    if (pending && pending.index !== selectedIndex) setPending(null);
  }

  useEffect(() => {
    if (pending || viewed) return;
    // Wait for the commit that re-enables hand buttons after No/Escape.
    const index = returnFocusIndex.current;
    returnFocusIndex.current = null;
    if (index !== null) {
      const button = cardButtons.current.get(index);
      if (button && !button.disabled) button.focus({ preventScroll: true });
    }
  }, [pending, viewed]);

  useEffect(() => () => {
    dropChange.current?.(false);
    const drag = activeDrag.current;
    activeDrag.current = null;
    if (drag?.element.hasPointerCapture(drag.pointerId)) {
      drag.element.releasePointerCapture(drag.pointerId);
    }
  }, []);

  function inField(clientX: number, clientY: number) {
    const bounds = (dropTargetRef ?? fieldRef)?.current?.getBoundingClientRect();
    return Boolean(bounds && bounds.width > 0 && bounds.height > 0 &&
      clientX >= bounds.left && clientX <= bounds.right &&
      clientY >= bounds.top && clientY <= bounds.bottom);
  }

  function moveGhost(choice: BattleSummonChoice, clientX: number, clientY: number) {
    const element = root.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    // Pointer coordinates are viewport pixels; the overlay is in the scaled
    // cabinet's local CSS space (normally 1920 x 1080).
    setGhost({ choice,
      x: (clientX - bounds.left) * element.offsetWidth / bounds.width,
      y: (clientY - bounds.top) * element.offsetHeight / bounds.height,
      inField: inField(clientX, clientY),
    });
    onDropActiveChange?.(inField(clientX, clientY));
  }

  function releaseDrag() {
    const drag = activeDrag.current;
    activeDrag.current = null;
    if (drag?.element.hasPointerCapture(drag.pointerId)) {
      drag.element.releasePointerCapture(drag.pointerId);
    }
    setGhost(null);
    onDropActiveChange?.(false);
    return drag;
  }

  function askToSummon(choice: BattleSummonChoice) {
    if (unavailable || submitted.current || pending || viewed || !cards.some(item => item.index === choice.index)) return;
    onSelect(choice.index);
    setPending(choice);
  }

  function inspectCard(choice: BattleSummonChoice) {
    if (unavailable || submitted.current || pending || viewed) return;
    setViewed(choice);
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, choice: BattleSummonChoice) {
    if (unavailable || pending || viewed || submitted.current || !event.isPrimary || event.button !== 0 || activeDrag.current) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    suppressPointerClick.current = false;
    activeDrag.current = { choice, pointerId: event.pointerId, element: event.currentTarget,
      startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = activeDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (unavailable) { releaseDrag(); return; }
    event.preventDefault();
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 8) drag.moved = true;
    if (!drag.moved) return;
    moveGhost(drag.choice, event.clientX, event.clientY);
  }

  function drop(event: PointerEvent<HTMLButtonElement>) {
    if (activeDrag.current?.pointerId !== event.pointerId) return;
    const valid = !unavailable && inField(event.clientX, event.clientY);
    suppressPointerClick.current = true;
    const drag = releaseDrag();
    if (!drag) return;
    const moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 8;
    if (moved) {
      if (valid) askToSummon(drag.choice);
    } else {
      const bounds = drag.element.getBoundingClientRect();
      if (event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom) inspectCard(drag.choice);
    }
  }

  function cancelConfirmation() {
    returnFocusIndex.current = (pending ?? viewed)?.index ?? null;
    setPending(null);
    setViewed(null);
  }

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && (pending || viewed || activeDrag.current)) {
      event.preventDefault();
      event.stopPropagation();
      releaseDrag();
      suppressPointerClick.current = true;
      cancelConfirmation();
    }
  }

  const canConfirm = !unavailable && pending !== null && selectedIndex === pending.index;
  const displayed = pending ?? viewed;
  const overview = displayed ? getCardOverview?.(displayed.card) ?? {
    name: getPlayerCharacterName(displayed.card).label,
    image: displayed.card.image,
    ability: "未設定", expectedReward: "未設定", wRate: "未設定",
  } : null;
  return (
    <div ref={root} className={styles.overlay} onKeyDown={keyboard}>
      <section className={styles.hand} aria-labelledby={`${id}-title`}>
        <div className={styles.cards} ref={scroll} role="group" aria-label="召喚する手札" aria-describedby={`${id}-help`}>
          {cards.map((choice, position) => {
            const name = getPlayerCharacterName(choice.card);
            // Fan layout: --i from the left (front card), --n total; geometry lives in the CSS.
            const fan = { "--i": position, "--n": cards.length } as CSSProperties;
            return <button
              key={choice.index} type="button" className={styles.card} style={fan}
              ref={element => { if (element) cardButtons.current.set(choice.index, element); else cardButtons.current.delete(choice.index); }}
              aria-label={`手札${position + 1}、${name.label}。クリックやEnterで概要、ドラッグまたはShift+Enterで召喚を確認`}
              aria-pressed={selectedIndex === choice.index}
              disabled={unavailable || displayed !== null}
              data-dragging={ghost?.choice.index === choice.index || undefined}
              onPointerDown={event => startDrag(event, choice)}
              onPointerMove={dragMove}
              onPointerUp={drop}
              onPointerCancel={() => { suppressPointerClick.current = true; releaseDrag(); }}
              onLostPointerCapture={event => { if (activeDrag.current?.pointerId === event.pointerId) { suppressPointerClick.current = true; releaseDrag(); } }}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault(); event.stopPropagation();
                  if (event.key === "Enter" && event.shiftKey) askToSummon(choice);
                  else inspectCard(choice);
                }
              }}
              onClick={event => {
                event.stopPropagation();
                if (event.detail === 0 || !suppressPointerClick.current) inspectCard(choice);
                suppressPointerClick.current = false;
              }}
            >
              <div className={styles.handArt}><CroppedCardImage src={choice.card.image} alt="" /></div>
              <span className={styles.cardName}>{name.displayName || name.code}</span>
            </button>;
          })}
        </div>
        {/* The fan shows every card at once, so the old scroll arrows are gone. */}
        <div className={styles.handLabel}>
          <h2 id={`${id}-title`}>YOUR HAND <small>{cards.length}枚</small></h2>
        </div>
        <p id={`${id}-help`} className={styles.help}>{cards.length ? "クリックで概要 / ドラッグで召喚" : "召喚できるカードがありません"}</p>
        <p className={styles.srOnly}>EnterまたはSpaceで概要、Shift+Enterで召喚を確認。Escapeで閉じます。</p>
      </section>
      {ghost && <div className={styles.ghost} style={{ left: ghost.x, top: ghost.y }} aria-hidden="true" data-valid={ghost.inField}>
        <div className={styles.ghostArt}><CroppedCardImage src={ghost.choice.card.image} alt="" /></div>
        <span>{ghost.inField ? "離して召喚を確認" : dropTargetRef ? "左上の召喚ドックへ" : "フィールドへ"}</span>
      </div>}
      <CardOverviewDialog data={overview} onClose={cancelConfirmation} disabled={!canConfirm}
        onConfirm={pending ? () => {
            if (!canConfirm || submitted.current) return;
            submitted.current = true;
            setLocked(true);
            setPending(null);
            onSummon();
          } : undefined} />
      {locked && <p className={styles.srOnly} role="status">召喚中です</p>}
    </div>
  );
}
