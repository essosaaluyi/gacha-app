"use client";

import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import styles from "./CardMotionLab.module.css";

type MotionStyle = "glide" | "snap" | "fan";
type CardState = "deck" | "floating" | "flipping" | "placed";
type Point = { x: number; y: number };

const motionOptions: Array<{ id: MotionStyle; name: string; detail: string }> = [
  { id: "glide", name: "01 Glide", detail: "Clean stagger, gentle hover, controlled settle." },
  { id: "snap", name: "02 Slow Snap", detail: "A slower flip, then a firm landing with a short rebound." },
  { id: "fan", name: "03 Fan Launch", detail: "Cards spread from the deck before holding over their slots." },
];

const cardFaces = [
  "/images/battle-symbols/attack.webp",
  "/images/battle-symbols/chance.webp",
  "/images/battle-symbols/reply.webp",
];

export default function CardMotionLab() {
  const [motion, setMotion] = useState<MotionStyle>("glide");
  const [cards, setCards] = useState<CardState[]>(["deck", "deck", "deck"]);
  const [run, setRun] = useState(0);
  const [deckOffset, setDeckOffset] = useState<Point>({ x: 0, y: 0 });
  const [releaseOrigin, setReleaseOrigin] = useState<Point>({ x: 150, y: 420 });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const deckDragStart = useRef<{ x: number; y: number; offset: Point } | null>(null);
  const didDragRelease = useRef(false);

  const reset = () => {
    setCards(["deck", "deck", "deck"]);
    setDeckOffset({ x: 0, y: 0 });
    didDragRelease.current = false;
    setRun((value) => value + 1);
  };

  const getDeckCenter = (): Point => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return releaseOrigin;

    return { x: bounds.width * 0.14 + deckOffset.x, y: bounds.height * 0.69 + deckOffset.y };
  };

  const releaseCards = (origin = getDeckCenter()) => {
    if (cards.some((card) => card !== "deck")) return;
    setReleaseOrigin(origin);
    setCards(["floating", "floating", "floating"]);
  };

  const placeCard = (index: number) => {
    if (cards[index] !== "floating") return;

    setCards((current) => current.map((card, cardIndex) => (
      cardIndex === index ? "flipping" : card
    )));

    window.setTimeout(() => {
      setCards((current) => current.map((card, cardIndex) => (
        cardIndex === index ? "placed" : card
      )));
    }, motion === "snap" ? 360 : 280);
  };

  const handleDeckPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (cards.some((card) => card !== "deck")) return;
    deckDragStart.current = {
      x: event.clientX,
      y: event.clientY,
      offset: deckOffset,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDeckPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!deckDragStart.current) return;
    setDeckOffset({
      x: deckDragStart.current.offset.x + event.clientX - deckDragStart.current.x,
      y: deckDragStart.current.offset.y + event.clientY - deckDragStart.current.y,
    });
  };

  const handleDeckPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (deckDragStart.current === null) return;
    const travelled = Math.hypot(
      event.clientX - deckDragStart.current.x,
      event.clientY - deckDragStart.current.y
    );
    deckDragStart.current = null;
    if (travelled > 12) {
      const bounds = stageRef.current?.getBoundingClientRect();
      if (bounds) {
        didDragRelease.current = true;
        releaseCards({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
      }
    }
  };

  const chosenMotion = motionOptions.find((option) => option.id === motion)!;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Battle Animation Lab</p>
          <h1>Card Motion Tests</h1>
          <p className={styles.intro}>Try each card journey here without changing the live battle loop.</p>
        </div>
        <a className={styles.backLink} href="/battle">Back To Battle</a>
      </header>

      <section className={styles.controls} aria-label="Motion version controls">
        {motionOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`${styles.motionChoice} ${motion === option.id ? styles.motionChoiceActive : ""}`}
            onClick={() => {
              setMotion(option.id);
              reset();
            }}
          >
            <strong>{option.name}</strong>
            <span>{option.detail}</span>
          </button>
        ))}
      </section>

      <section className={styles.labPanel} aria-label={`${chosenMotion.name} card test`}>
        <div ref={stageRef} className={`${styles.stage} ${styles[`motion${motion[0].toUpperCase()}${motion.slice(1)}`]}`} key={`${motion}-${run}`}>
          <div className={styles.sky} />
          <div className={styles.field} />
          <div className={styles.statusRail}>
            <span>DRAW MOTION</span>
            <strong>{chosenMotion.name}</strong>
            <span>Tap or drag the deck, then choose each card.</span>
          </div>

          <div className={styles.slots} aria-hidden="true">
            <div className={styles.slot} />
            <div className={styles.slot} />
            <div className={styles.slot} />
          </div>

          <button
            type="button"
            className={`${styles.deck} ${cards[0] === "deck" ? "" : styles.deckSpent}`}
            aria-label="Tap or drag this deck toward the table to release cards"
            onClick={() => {
              if (didDragRelease.current) {
                didDragRelease.current = false;
                return;
              }
              releaseCards();
            }}
            onPointerDown={handleDeckPointerDown}
            onPointerMove={handleDeckPointerMove}
            onPointerUp={handleDeckPointerUp}
            onPointerCancel={() => {
              deckDragStart.current = null;
              setDeckOffset({ x: 0, y: 0 });
            }}
            style={{ transform: `translate(${deckOffset.x}px, ${deckOffset.y}px)` }}
          >
            <span /><span /><span />
          </button>

          {cards.map((state, index) => {
            const bounds = stageRef.current?.getBoundingClientRect();
            const width = bounds?.width ?? 1000;
            const height = bounds?.height ?? 562;
            const cardWidth = width * 0.115;
            const cardHeight = cardWidth * 1.5;
            const cardLeft = width * ([0.29, 0.4425, 0.595][index]);
            const cardTop = height * 0.89 - cardHeight;
            const launchStyle = {
              "--launch-x": `${releaseOrigin.x - cardWidth / 2 - cardLeft}px`,
              "--launch-y": `${releaseOrigin.y - cardHeight / 2 - cardTop}px`,
            } as CSSProperties & Record<"--launch-x" | "--launch-y", string>;

            return <button
              key={index}
              type="button"
              className={`${styles.card} ${styles[`card${index + 1}`]} ${styles[`state${state[0].toUpperCase()}${state.slice(1)}`]}`}
              style={launchStyle}
              aria-label={state === "floating" ? `Flip card ${index + 1}` : `Card ${index + 1}`}
              disabled={state !== "floating"}
              onClick={() => placeCard(index)}
            >
              <span className={styles.cardBack}><img src="/images/cards/player/card-back-latest.png" alt="" /></span>
              <span className={styles.cardFace}><img src={cardFaces[index]} alt="" /></span>
              <span className={styles.cardGlow} />
              <span className={styles.cardShadow} />
            </button>;
          })}

          <div className={styles.deckLabel}>DRAG OR TAP</div>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.primaryAction} onClick={() => releaseCards()}>Release Cards</button>
        <button type="button" className={styles.quietAction} onClick={reset}>Reset Test</button>
      </div>
    </main>
  );
}
