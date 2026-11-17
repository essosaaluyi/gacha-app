"use client";

import { useLayoutEffect, useRef, useState } from "react";
import SlotFxLayer from "./SlotFxLayer";
import SlotRoundTitle from "./SlotRoundTitle";
import frame from "../fatalfx/FatalFxWorkstation.module.css";
import { showSlotAward, showSlotStop, showSlotTelop, type SlotTone } from "./slotFxStore";
import { clearSlotJudge, pullSlotJudge, resolveSlotJudge, startSlotJudge } from "./slotJudgeStore";
import BarChanceOverlay from "../BarChanceOverlay";
import type { BarChanceTone } from "@/lib/battle-pixi/core/resultLottery";
import { getPlayerFaceoffImage } from "@/lib/battle-pixi/presentation/attackFaceoffAssets";
import { clearBarChance, revealBarChanceSymbol, startBarChance } from "@/lib/battle-pixi/state/barChanceStore";

// PROVISIONAL — a bench for the slot-style layer, away from the battle.

const STAGE_W = 1250;
const STAGE_H = 618;
const BACKDROP = "/images/battle-assets/stage-day-field-cabinet.v2.webp";

const AWARDS = [3, 15, 45, 120, 500];
const TELOPS: { main: string; tone: SlotTone; size: "big" | "small" }[] = [
  { main: "ATTACK!", tone: "fire", size: "small" },
  { main: "CHANCE!", tone: "rainbow", size: "small" },
  { main: "ENEMY DOWN!", tone: "rainbow", size: "big" },
  { main: "FATAL!", tone: "violet", size: "big" },
  { main: "BONUS", tone: "gold", size: "big" },
];
/** Only the biggest landings light the whole screen; the rest show on the table and the cabinet, which this bench has not got. */
const STOPS: { label: string; tone: SlotTone }[] = [
  { label: "Attack 的中", tone: "fire" },
  { label: "Chance", tone: "rainbow" },
];
const BAR_TONES: { label: string; tone: BarChanceTone; tier: string }[] = [
  { label: "青", tone: "blue", tier: "blue" },
  { label: "緑", tone: "green", tier: "gold" },
  { label: "赤", tone: "red", tier: "red" },
];
/** The bench plays the call only: "fake" never goes on to the freeze. */
const playBarChance = (tone: BarChanceTone) =>
  startBarChance({ outcome: "fake", tone, scope: "battle", characterImage: getPlayerFaceoffImage("R1") ?? "" });

export default function SlotFxPreview() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [round, setRound] = useState<{ key: number; text: string } | null>(null);
  const roundRuns = useRef(0);

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const fit = () => setScale(element.clientWidth / STAGE_W);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const playRound = (text: string) => {
    roundRuns.current += 1;
    setRound({ key: roundRuns.current, text });
    window.setTimeout(() => setRound(null), 1900);
  };

  return (
    <main className={frame.page} style={{ gridTemplateColumns: "1fr" }}>
      <section className={frame.stageColumn}>
        <header className={frame.header}>
          <h1>スロット風演出（仮）プレビュー</h1>
          <p>獲得数字・ラウンド表示・カード停止時の光・テロップの仮版です。ボタンを押すとその場で再生します。</p>
        </header>

        <div ref={frameRef} className={frame.frame} style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, maxWidth: 1100 }}>
          <div className={frame.stage} style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, background: `#223 url(${BACKDROP}) center / cover` }}>
            {round && (
              <div key={round.key} style={{ position: "absolute", inset: 0, background: "rgba(5,6,10,.82)" }}>
                <SlotRoundTitle roundText={round.text} enemyName="Enemy 1" />
              </div>
            )}
            <SlotFxLayer live={false} />
            <BarChanceOverlay />
          </div>
        </div>

        <div className={frame.transport}>
          <strong>獲得数字</strong>
          {AWARDS.map((points) => (
            <button key={points} type="button" className={frame.playButton} data-tier={points >= 100 ? "blue" : points >= 20 ? "gold" : "red"} onClick={() => showSlotAward(points)}>
              +{points}
            </button>
          ))}
        </div>
        <div className={frame.transport}>
          <strong>ラウンド</strong>
          {["ROUND 01", "ROUND 03", "ROUND 05", "ROUND EXTRA 2"].map((text) => (
            <button key={text} type="button" className={frame.playButton} data-tier="red" onClick={() => playRound(text)}>{text}</button>
          ))}
        </div>
        <div className={frame.transport}>
          <strong>カード停止</strong>
          {STOPS.map((stop) => (
            <button key={stop.label} type="button" className={frame.playButton} data-tier="blue" onClick={() => showSlotStop({ order: 3, tone: stop.tone, strong: true })}>
              {stop.label}
            </button>
          ))}
          <span className={frame.check}>ほかの札は画面全体を光らせない（テーブルの枠と台の枠だけ。バトル画面で確認）</span>
        </div>
        <div className={frame.transport}>
          <strong>テロップ</strong>
          {TELOPS.map((telop) => (
            <button key={telop.main} type="button" className={frame.playButton} data-tier="gold" onClick={() => showSlotTelop(telop)}>{telop.main}</button>
          ))}
        </div>
        <div className={frame.transport}>
          <strong>ジャッジ</strong>
          <button type="button" className={frame.playButton} data-tier="red" onClick={startSlotJudge}>① 開始（文字 → DRAW!!!）</button>
          <button type="button" className={frame.playButton} data-tier="gold" onClick={pullSlotJudge}>② 引く</button>
          <button type="button" className={frame.playButton} data-tier="blue" onClick={() => resolveSlotJudge(false)}>③ 失敗（ヒビ → 暗転）</button>
          <button type="button" className={frame.playButton} data-tier="gold" onClick={() => resolveSlotJudge(true)}>③ 成功（フリーズ）</button>
          <button type="button" className={frame.playButton} onClick={() => clearSlotJudge()}>消す</button>
        </div>
        <div className={frame.transport}>
          <strong>BARを狙え</strong>
          {BAR_TONES.map((bar) => (
            <button key={bar.tone} type="button" className={frame.playButton} data-tier={bar.tier} onClick={() => playBarChance(bar.tone)}>{bar.label}</button>
          ))}
          <button type="button" className={frame.playButton} data-tier="gold" onClick={() => revealBarChanceSymbol("Bar")}>BAR が1枚止まる</button>
          <button type="button" className={frame.playButton} onClick={() => revealBarChanceSymbol("Empty")}>外れ（暗転）</button>
          <button type="button" className={frame.playButton} onClick={clearBarChance}>消す</button>
        </div>
      </section>
    </main>
  );
}
