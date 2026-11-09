"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { resolvePlayerCardBack } from "@/lib/cards/cardAssets";
import type { RevealCard, RevealScene } from "./pack-reveal/types";
import { getCardDisplayCrop } from "./pack-reveal/cardDisplayCrop";
import styles from "./PackReveal3D.module.css";

export type PackReveal3DProps = {
  cards: readonly RevealCard[];
  onComplete: () => void;
  packImage?: string;
};

export default function PackReveal3D({ cards, onComplete, packImage = "/images/pack-1.webp" }: PackReveal3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<RevealScene | null>(null);
  const complete = useRef(false);
  const callback = useRef(onComplete);
  const advancing = useRef(false);
  const pointer = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const stop = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<"opening" | "ready" | "sliding">("opening");
  const [index, setIndex] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [missingImage, setMissingImage] = useState(false);
  const [reduced, setReduced] = useState(false);
  // A parent re-render must not rebuild the scene or restart committed cards.
  const initial = useRef({ cards, packImage });
  useEffect(() => { callback.current = onComplete; }, [onComplete]);

  useEffect(() => {
    let live = true;
    let failed = false;
    let owned: RevealScene | null = null;
    const abort = new AbortController();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fail = () => {
      if (!live || failed || complete.current) return;
      failed = true;
      window.clearTimeout(timeout);
      abort.abort();
      owned?.dispose();
      scene.current = null;
      advancing.current = false;
      setFallback(true);
      setPhase("ready");
    };
    const timeout = window.setTimeout(fail, 12000);
    const ready = () => {
      window.clearTimeout(timeout);
      if (live && !failed && !complete.current) setPhase("ready");
    };
    void import("./pack-reveal/scene").then(async ({ createRevealScene }) => {
      if (!live || failed || complete.current || !host.current) return;
      setReduced(motion.matches);
      const built = await createRevealScene(host.current, initial.current.cards, initial.current.packImage, motion.matches, ready, fail, abort.signal);
      if (!live || failed || complete.current) built.dispose();
      else { owned = built; scene.current = built; }
    }).catch(fail);
    const cleanup = () => {
      live = false;
      window.clearTimeout(timeout);
      abort.abort();
      owned?.dispose();
      scene.current = null;
    };
    stop.current = cleanup;
    return cleanup;
  }, []);

  const finish = () => {
    if (complete.current) return;
    complete.current = true;
    stop.current();
    scene.current?.dispose();
    scene.current = null;
    callback.current();
  };
  const advance = () => {
    if (phase !== "ready" || advancing.current || complete.current) return;
    advancing.current = true;
    setPhase("sliding");
    const done = () => {
      if (complete.current) return;
      if (index + 1 >= cards.length) { finish(); return; }
      setIndex(index + 1);
      setMissingImage(false);
      advancing.current = false;
      setPhase("ready");
    };
    if (scene.current) scene.current.advance(done);
    else done();
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (phase !== "ready" || event.isPrimary === false || event.button > 0 || advancing.current) return;
    event.preventDefault();
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (phase !== "ready" || advancing.current) return;
    if (!p) {
      if (event.pointerType !== "mouse" || event.buttons) return;
      const box = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - box.left) / Math.max(1, box.width) * 2 - 1;
      const y = (event.clientY - box.top) / Math.max(1, box.height) * 2 - 1;
      scene.current?.tilt(Math.max(-0.32, Math.min(0.32, x * 0.5)), Math.max(-0.25, Math.min(0.25, y * 0.4)));
      return;
    }
    if (p.id !== event.pointerId) return;
    const dx = event.clientX - p.x;
    const dy = event.clientY - p.y;
    if (Math.hypot(dx, dy) > 8) p.moved = true;
    scene.current?.tilt(Math.max(-1, Math.min(1, dx / 85)), Math.max(-1, Math.min(1, dy / 85)));
  };
  const up = (event: PointerEvent<HTMLDivElement>, cancel = false) => {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - p.x, event.clientY - p.y) > 8) p.moved = true;
    pointer.current = null;
    scene.current?.tilt(0, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancel && !p.moved) advance();
  };
  const card = cards[index];
  const rarity = phase === "opening" ? "R" : card?.rarity ?? "R";
  const crop = !missingImage && card ? getCardDisplayCrop(card.image) : null;

  return (
    <section className={styles.root} data-rarity={rarity} data-phase={phase} data-current-index={index} data-renderer={fallback ? "fallback" : "webgl"} data-reduced={reduced} aria-label="カードパック開封">
      <div className={styles.aura} aria-hidden="true" />
      <div className={styles.sparks} aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>
      <header className={styles.header}><span>PACK REVEAL</span><span>{cards.length ? Math.min(index + 1, cards.length) : 0} / {cards.length}</span></header>
      <div className={styles.stage} role="button" tabIndex={0} aria-label={phase === "opening" ? "パックを開封中" : `${card?.name ?? "カード"}。タップまたはEnterで次のカード。ドラッグで傾ける。`} aria-disabled={phase !== "ready"}
        onPointerDown={down} onPointerMove={move} onPointerUp={event => up(event)} onPointerCancel={event => up(event, true)} onLostPointerCapture={() => { pointer.current = null; scene.current?.tilt(0, 0); }}
        onPointerLeave={() => { if (!pointer.current) scene.current?.tilt(0, 0); }} onDragStart={event => event.preventDefault()}
        onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (!event.repeat) advance(); } }}>
        <div className={styles.canvas} ref={host} aria-hidden="true" />
        {fallback && card && <div className={styles.fallbackStack}>
          <div className={styles.fallbackEdge} />
          <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={missingImage ? resolvePlayerCardBack(card.backImage) : card.image} alt="" onError={() => setMissingImage(true)} draggable={false} style={crop ? { position: "absolute", maxWidth: "none", objectFit: "fill", width: `${100 / (1 - crop.left - crop.right)}%`, height: `${100 / (1 - crop.top - crop.bottom)}%`, left: `${-100 * crop.left / (1 - crop.left - crop.right)}%`, top: `${-100 * crop.top / (1 - crop.top - crop.bottom)}%` } : undefined} />
          </div>
          {missingImage && <strong>{card.rarity} · {card.name}</strong>}
        </div>}
        {phase === "opening" && <p className={styles.opening}>パックを開封中…</p>}
      </div>
      <div className={styles.caption} aria-live="polite" aria-atomic="true">{phase === "opening" ? <><b>封を切る、その瞬間。</b><span>まもなくカードが現れます</span></> : <><b><em>{card?.rarity}</em> {card?.name ?? "カードがありません"}</b><span>タップで次へ · ドラッグでカードを傾ける</span></>}</div>
      <footer className={styles.controls}>
        <button type="button" onClick={advance} disabled={phase !== "ready" || !cards.length}>{index + 1 >= cards.length ? "最後のカードを見終える" : "次のカード"}<span aria-hidden="true"> →</span></button>
        <button type="button" className={styles.skip} onClick={finish}>一覧へスキップ</button>
      </footer>
    </section>
  );
}
