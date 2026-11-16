"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { getSfxMuted } from "@/lib/audio/sfxStore";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";
import { getBattlePresentationFlow, subscribeBattlePresentationFlow } from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import { BATTLE_DRAW_PRESS_EVENT, type BattleDrawPressDetail } from "@/lib/battle-pixi/state/fatalAttackCutStore";
import { getFatalWindowOutcome, getPlayerFatalSnapshot, isFatalModeActive, subscribeFatalMode } from "@/lib/battle-pixi/state/fatalModeStore";
import { isFatalModeWindowOpen, subscribeFatalModeWindow } from "@/lib/battle-pixi/state/fatalModeWindowStore";
import { getFatalPresentation, subscribeFatalPresentation } from "@/lib/battle-pixi/state/fatalPresentationStore";
import SlotBackdrop, { warmSlotBackdrops } from "./SlotBackdrop";
import SlotGlyphs, { slotGlyphSheets, slotGlyphsWidth } from "./SlotGlyphs";
import dispenser from "./judgeDispenser.json";
import css from "./SlotJudge.module.css";
import { SLOT_FX } from "./slotFxStore";
import {
  JUDGE_FAIL_MS,
  JUDGE_FREEZE_MOVIE,
  JUDGE_INTRO_MS,
  clearSlotJudge,
  getSlotJudge,
  promptSlotJudge,
  pullSlotJudge,
  resolveSlotJudge,
  startSlotJudge,
  subscribeSlotJudge,
  type SlotJudgePhase,
} from "./slotJudgeStore";

// PROVISIONAL — see slotJudgeStore.ts for the sequence this draws.
//
// Nothing here may hint at the result before the card is drawn: the lettering
// is steel, the background blue, the lamps cold. No red, gold or rainbow.

const DISPENSER_IMAGE = "/images/battle-assets/slotfx/judge-dispenser.v2.webp";

/** When the title lands, after the last letter has flown past. */
const LAND_MS = 1750;

/** "DESTINY JUDGE", one letter at a time, each thrown at a different part of the screen. */
const FLY = Array.from("DESTINYJUDGE").map((char, index) => ({
  char,
  delay: 140 + index * 105,
  x: `${(((index * 37) % 7) - 3) * 9}cqw`,
  y: `${(((index * 53) % 5) - 2) * 8}cqh`,
}));

/**
 * The title's two words. Landing, each fills the screen on a line of its own;
 * once the dispenser is up they stand side by side as one line along the top.
 */
const TITLE = (() => {
  const gap = 0.55;
  let x = 0;
  const words = [
    { text: "DESTINY", landTop: "17cqh", landMax: "21cqh" },
    { text: "JUDGE", landTop: "47cqh", landMax: "28cqh" },
  ].map((word) => {
    const width = slotGlyphsWidth(word.text, "silver");
    const placed = { ...word, width, x };
    x += width + gap;
    return placed;
  });
  return { words, width: x - gap };
})();

/** The crack: jagged rays out of one point of impact, with a few splinters between. */
const CRACKS = (() => {
  let seed = 11;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const at = (x: number, y: number) => `${Math.round(x)} ${Math.round(y)}`;
  const cx = 610;
  const cy = 296;
  const paths: string[] = [];
  const rays = 15;
  for (let ray = 0; ray < rays; ray += 1) {
    let angle = (ray / rays) * Math.PI * 2 + (random() - 0.5) * 0.3;
    let x = cx;
    let y = cy;
    let path = `M${at(x, y)}`;
    const steps = 5 + Math.floor(random() * 3);
    for (let step = 0; step < steps; step += 1) {
      angle += (random() - 0.5) * 0.5;
      const length = 60 + random() * 150;
      x += Math.cos(angle) * length;
      y += Math.sin(angle) * length;
      path += ` L${at(x, y)}`;
      if (random() < 0.45) {
        const branch = angle + (random() < 0.5 ? 1 : -1) * (0.5 + random() * 0.6);
        const reach = 40 + random() * 110;
        paths.push(`M${at(x, y)} L${at(x + Math.cos(branch) * reach, y + Math.sin(branch) * reach)}`);
      }
    }
    paths.push(path);
  }
  for (const radius of [64, 150]) {
    let ring = "";
    for (let corner = 0; corner <= 11; corner += 1) {
      const angle = (corner / 11) * Math.PI * 2;
      const reach = radius * (0.72 + random() * 0.5);
      ring += `${corner === 0 ? "M" : " L"}${at(cx + Math.cos(angle) * reach * 1.25, cy + Math.sin(angle) * reach)}`;
    }
    paths.push(ring);
  }
  return paths;
})();

/** Wires the judge to the running battle. Presentation only. */
function useJudgeSignals(live: boolean) {
  useEffect(() => {
    if (!live || !SLOT_FX.enabled || !SLOT_FX.judge) return;

    // This window's judge has been staged.
    let staged = false;
    // The judge draw has been pressed and its result not yet shown.
    let waiting = false;
    // The judge's pictures have been asked for.
    let warmed = false;
    let turned = 0;
    let outcomeSeen = getFatalWindowOutcome()?.key ?? 0;

    const freshOutcome = () => {
      const outcome = getFatalWindowOutcome();
      return outcome && outcome.key !== outcomeSeen ? outcome : null;
    };

    // The result shows when the cards have told it: all three turned, or the
    // stage has already moved on to the hit.
    const tryResolve = () => {
      if (!waiting) return;
      const outcome = freshOutcome();
      if (!outcome) return;
      if (turned < 3 && getFatalPresentation().phase !== "attack") return;
      waiting = false;
      resolveSlotJudge(outcome.enemyDefeated);
    };

    // The title comes up once the draw before the last has finished showing.
    const stage = () => {
      const { gamesLeft, totalGames } = getPlayerFatalSnapshot();
      if (gamesLeft > 1) staged = false;
      if (!isFatalModeActive()) return;
      warmSlotBackdrops(["blueTunnel", "blueBurst", "speedLines", "glassShatter"]);
      if (!warmed) {
        warmed = true;
        for (const src of [DISPENSER_IMAGE, ...slotGlyphSheets("silver")]) new Image().src = src;
      }
      if (staged || gamesLeft !== 1 || totalGames <= 1) return;
      if (!isFatalModeWindowOpen() || getBattlePresentationFlow().phase !== "next_round_ready") return;
      staged = true;
      startSlotJudge();
    };

    const onDraw = (event: Event) => {
      const { fatalJudge } = (event as CustomEvent<BattleDrawPressDetail>).detail;
      // Any other draw cuts whatever is left of the judge.
      if (!fatalJudge) { waiting = false; clearSlotJudge(); return; }
      outcomeSeen = getFatalWindowOutcome()?.key ?? 0;
      turned = 0;
      waiting = true;
      staged = true;
      if (getSlotJudge().phase === "idle") startSlotJudge();
      pullSlotJudge();
    };

    const onTurned = () => {
      if (!waiting) return;
      turned += 1;
      tryResolve();
    };

    const onWindow = () => {
      stage();
      if (isFatalModeWindowOpen()) return;
      // The mode has left the screen: nothing of the judge may wait on it.
      const phase = getSlotJudge().phase;
      if (waiting) {
        const outcome = freshOutcome();
        waiting = false;
        if (outcome) resolveSlotJudge(outcome.enemyDefeated);
        else clearSlotJudge();
      } else if (phase === "intro" || phase === "prompt" || phase === "pulled") {
        clearSlotJudge();
      }
    };

    window.addEventListener(BATTLE_DRAW_PRESS_EVENT, onDraw);
    window.addEventListener("battle:vfx-card-landed", onTurned);
    const detach = [
      subscribeFatalMode(() => { stage(); tryResolve(); }),
      subscribeBattlePresentationFlow(stage),
      subscribeFatalModeWindow(onWindow),
      subscribeFatalPresentation(tryResolve),
    ];
    stage();

    return () => {
      window.removeEventListener(BATTLE_DRAW_PRESS_EVENT, onDraw);
      window.removeEventListener("battle:vfx-card-landed", onTurned);
      detach.forEach((off) => off());
    };
  }, [live]);
}

/** The letters thrown at the screen, and the flash they land in. */
function Intro() {
  return (
    <>
      {FLY.map((letter, index) => (
        <span key={index} className={css.fly} style={{ animationDelay: `${letter.delay}ms`, "--fly-x": letter.x, "--fly-y": letter.y } as CSSProperties}>
          <SlotGlyphs text={letter.char} tone="silver" className={css.flyGlyphs} shine={false} bloom={false} />
        </span>
      ))}
      <div className={css.landFlash} />
    </>
  );
}

/**
 * "DESTINY JUDGE". One element for the whole judge, so the words that land
 * across the screen are the same words that then stand over the dispenser.
 */
function Title({ phase }: { phase: SlotJudgePhase }) {
  return (
    <div className={css.title} data-phase={phase} style={{ "--line-w": TITLE.width } as CSSProperties}>
      {TITLE.words.map((word, index) => (
        <span
          key={word.text}
          className={css.word}
          style={{ "--w": word.width, "--dock-x": word.x, "--land-top": word.landTop, "--land-max": word.landMax, "--i": index } as CSSProperties}
        >
          <SlotGlyphs text={word.text} tone="silver" shineDelay={LAND_MS + 320 + index * 180} />
        </span>
      ))}
    </div>
  );
}

const slotWidth = dispenser.slotRight - dispenser.slotLeft;
/** The card is a little narrower than the slot it leaves. */
const cardWidth = slotWidth * 0.8;
const CARD_BOX: CSSProperties = {
  left: `${(0.5 - cardWidth / 2) * 100}%`,
  top: `${dispenser.slotY * 100}%`,
  width: `${cardWidth * 100}%`,
  // A 5:7 card, as tall as it is before the table's tilt squeezes it.
  height: `${((cardWidth * dispenser.width * 1.4) / dispenser.height) * 100}%`,
  // Lying on the table the machine stands on, seen from the machine's own angle.
  transform: `perspective(150cqh) rotateX(${Math.round((Math.acos(dispenser.groundRatio) * 180) / Math.PI)}deg)`,
};

/** Chevrons running the way the card is pulled: toward the player. */
function Arrows() {
  return (
    <div className={css.arrows}>
      {[0, 1, 2].map((index) => (
        <i key={index} className={css.arrow} style={{ animationDelay: `${index * 150}ms` }} />
      ))}
    </div>
  );
}

function Dispenser({ phase }: { phase: SlotJudgePhase }) {
  return (
    <div className={css.dispenser} data-pulled={phase !== "prompt"}>
      <div className={css.enterFlash} />
      <div className={css.halo} />
      <div className={css.machineWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={css.machine} src={DISPENSER_IMAGE} alt="" draggable={false} />
        <div className={css.cardTilt} style={CARD_BOX}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={css.card} src={PLAYER_CARD_BACK_IMAGE} alt="" draggable={false} />
        </div>
      </div>
      <div className={css.draw}>
        <Arrows />
        <SlotGlyphs text="DRAW!!!" tone="silver" className={css.drawGlyphs} />
        <Arrows />
      </div>
    </div>
  );
}

/** Everything up to the result: one screen from the first letter to the draw. */
function Stage({ phase }: { phase: SlotJudgePhase }) {
  const intro = phase === "intro";
  const stopped = phase === "fail";
  return (
    <div className={css.stage} data-phase={phase} style={{ "--land-ms": `${LAND_MS}ms` } as CSSProperties}>
      {intro ? (
        <SlotBackdrop key="tunnel" kind="blueTunnel" className={css.backdrop} rate={1.4} />
      ) : (
        <SlotBackdrop key="burst" kind="blueBurst" className={css.backdrop} rate={phase === "prompt" ? 1 : 1.7} paused={stopped} />
      )}
      <SlotBackdrop kind="speedLines" className={css.lines} paused={stopped} />
      <div className={css.shade} />
      {intro ? <Intro /> : <Dispenser phase={phase} />}
      <Title phase={phase} />
    </div>
  );
}

function Fail() {
  return (
    <div className={css.fail}>
      <div className={css.failFlash} />
      <svg className={css.cracks} viewBox="0 0 1250 618" preserveAspectRatio="none">
        {CRACKS.map((path, index) => (
          <g key={index}>
            <path className={css.crackShadow} d={path} pathLength={1} />
            <path className={css.crackLine} d={path} pathLength={1} />
          </g>
        ))}
      </svg>
      <SlotBackdrop kind="glassShatter" className={css.shards} loop={false} />
      <div className={css.blackout} />
    </div>
  );
}

function Success({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const finish = () => done.current();
    video.currentTime = 0;
    video.muted = getSfxMuted();
    // With sound the browser may refuse; a silent run beats a stuck frame.
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(finish);
    });
    // Nothing may leave the movie sitting over the battle.
    const guard = window.setTimeout(finish, 8000);
    // A video taken off the page can keep playing its sound: stop it by hand.
    // (Only paused, not emptied: in development React runs this effect twice,
    // and an emptied video would have nothing left to play the second time.)
    return () => {
      window.clearTimeout(guard);
      video.pause();
    };
  }, []);

  return (
    <div className={css.success}>
      <video ref={ref} className={css.freeze} src={JUDGE_FREEZE_MOVIE} playsInline preload="auto" onEnded={() => done.current()} onError={() => done.current()} />
      <div className={css.successFlash} />
    </div>
  );
}

export default function SlotJudge({ live = true }: { live?: boolean }) {
  const { phase, key } = useSyncExternalStore(subscribeSlotJudge, getSlotJudge, getSlotJudge);
  useJudgeSignals(live);

  useEffect(() => {
    if (phase !== "intro" && phase !== "fail") return;
    const timer = window.setTimeout(
      () => (phase === "intro" ? promptSlotJudge(key) : clearSlotJudge(key)),
      phase === "intro" ? JUDGE_INTRO_MS : JUDGE_FAIL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase, key]);

  if (!SLOT_FX.enabled || !SLOT_FX.judge || phase === "idle") return null;

  return (
    <div className={css.judge} data-phase={phase}>
      {phase !== "success" && <Stage key={`stage-${key}`} phase={phase} />}
      {phase === "fail" && <Fail />}
      {phase === "success" && <Success key={`success-${key}`} onDone={() => clearSlotJudge(key)} />}
    </div>
  );
}
