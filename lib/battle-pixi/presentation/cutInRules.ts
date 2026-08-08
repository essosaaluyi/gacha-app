import type {
  BattleCardSymbol,
  BattleOutcome,
  BattleResult,
} from "@/lib/battle-pixi/core/resultLottery";
import {
  showBattleCutIn,
  type BattleCutInTone,
} from "@/lib/battle-pixi/state/battleCutInStore";
import { playSfx } from "@/lib/audio/sfxStore";
import { getCurrentPlayerBattleCard } from "@/lib/battle-pixi/state/playerBattleCardStore";

// The three act title inserts (daytime field / player fatal / enemy fatal)
// were removed: they interrupted the battle at its three biggest moments
// without adding information, so their helper, duration and asset map are all
// gone with them. The scene SVGs remain under
// public/images/battle-ui/scenes/theatre-fatal-v1/ if the beat is ever rebuilt.

// Interruption cut-in (split-shutter reveal). A null entry renders the striped
// placeholder band instead of art, without changing any sequencing code.
// `default` is only the last resort: the cut-in normally shows the card the
// player is actually fighting with, so it matches the summoned character.
export const BATTLE_INTERRUPT_CUT_IN_ASSETS: Record<string, string | null> = {
  default: "/images/cards/player/R1/card.webp",
};

// Must match --bicut-dur on .battle-interrupt-cut-in in globals.css: this is
// how long the overlay stays mounted, the CSS is how long it animates.
export const BATTLE_INTERRUPT_CUT_IN_DURATION_MS = 2000;

export function showInterruptCutIn(options?: {
  title?: string;
  subtitle?: string;
  tone?: BattleCutInTone;
  asset?: string | null;
  durationMs?: number;
}) {
  playSfx("cutIn");
  showBattleCutIn({
    title: options?.title ?? "CUT IN",
    subtitle: options?.subtitle,
    tone: options?.tone ?? "rainbow",
    durationMs: options?.durationMs ?? BATTLE_INTERRUPT_CUT_IN_DURATION_MS,
    variant: "interrupt",
    asset:
      (options?.asset ??
        getCurrentPlayerBattleCard()?.image ??
        BATTLE_INTERRUPT_CUT_IN_ASSETS.default) ?? undefined,
  });
}

export function showSymbolCutIn(symbol: BattleCardSymbol) {
  if (symbol === "Chance") {
    showBattleCutIn({
      title: "CHANCE",
      subtitle: "Attack route unlocked",
      tone: "chance",
      durationMs: 900,
    });
    return;
  }

  if (symbol === "Attack") {
    showBattleCutIn({
      title: "ATTACK",
      subtitle: "Target check",
      tone: "attack",
      durationMs: 750,
    });
    return;
  }

  if (symbol === "Bar") {
    showBattleCutIn({
      title: "BAR",
      subtitle: "Bonus signal",
      tone: "bonus",
      durationMs: 900,
    });
    return;
  }

  if (symbol === "Reply") {
    showBattleCutIn({
      title: "REPLY",
      subtitle: "Counter signal",
      tone: "info",
      durationMs: 700,
    });
  }
}

function getResultCutIn(result: BattleOutcome) {
  if (result === "TripleChance") {
    return {
      title: "TRIPLE CHANCE",
      subtitle: "High expectation",
      tone: "rainbow" as const,
      durationMs: 1300,
    };
  }

  if (result === "DoubleChance") {
    return {
      title: "DOUBLE CHANCE",
      subtitle: "Big route",
      tone: "chance" as const,
      durationMs: 1100,
    };
  }

  if (result === "Bar") {
    return {
      title: "BAR ALIGN",
      subtitle: "Bonus pressure",
      tone: "bonus" as const,
      durationMs: 1200,
    };
  }

  // No cut-in for an Attack result: the fakeout presentation that follows is
  // the beat, and the old red "ATTACK RESULT" box only got in front of it.

  return null;
}

export function showResultCutIn(result: BattleResult) {
  const cutIn = getResultCutIn(result.result);

  if (!cutIn) return false;

  showBattleCutIn(cutIn);
  return true;
}
