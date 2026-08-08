// Slot-machine reel reading for the three-card table.
//
// Everything here is a pure read over an already-decided hand. The outcome
// lottery (resultLottery) picks the symbols before the first card is flipped;
// these functions only answer "what should the table be doing right now, given
// how many cards the player has turned over". Nothing in this file can change
// which symbols land.

import type { BattleCardSymbol } from "./resultLottery";
import { patchConfig } from "@/lib/game-config/patchConfig";

export type ReelFlashKind = "triple" | "attackOnTarget" | "chance";

export type ReelFlash = {
  kind: ReelFlashKind;
  symbol: BattleCardSymbol;
  /** 0..1 — scales how hard the panel dims, so a bigger hit reads brighter. */
  intensity: number;
};

export type ReelTenpai = {
  /** The symbol the two shown cards agree on. */
  symbol: BattleCardSymbol;
  matchedSlots: number[];
  /** The slot still face down, which could complete the triple. */
  pendingSlot: number;
};

const isRevealed = (revealed: readonly boolean[], slot: number) =>
  revealed[slot] === true;

function revealedSlots(revealed: readonly boolean[]): number[] {
  const slots: number[] = [];
  revealed.forEach((flag, index) => {
    if (flag) slots.push(index);
  });
  return slots;
}

/** Symbols configured to pay a full-table flash when all three match. */
function isTripleSymbol(symbol: BattleCardSymbol) {
  // Empty is never a combination, whatever the config says.
  if (symbol === "Empty") return false;
  return patchConfig.reelMechanics.flash.tripleSymbols.includes(symbol);
}

/**
 * The flash for a hand with all three cards face up, or null when nothing
 * combines.
 *
 * This is read ONCE, after the last card lands — never per flip. The table is
 * detecting a finished hand, so a partial hand has nothing to report yet.
 * Where a hand qualifies more than one way, the biggest read wins: a matched
 * line first, then an attack on the target, then Chance.
 */
export function readCompletedHandFlash(
  cards: readonly BattleCardSymbol[],
  targetSlot: number
): ReelFlash | null {
  const config = patchConfig.reelMechanics.flash;
  if (!config.enabled) return null;

  const first = cards[0];
  const matched = cards.every((card) => card === first);

  if (matched && isTripleSymbol(first)) {
    return { kind: "triple", symbol: first, intensity: 1 };
  }

  if (config.attackOnTarget && cards[targetSlot] === "Attack") {
    return { kind: "attackOnTarget", symbol: "Attack", intensity: 1 };
  }

  if (config.chance) {
    const chanceCount = cards.filter((card) => card === "Chance").length;

    if (chanceCount > 0) {
      return {
        kind: "chance",
        symbol: "Chance",
        // One Chance is bright, three is maximum.
        intensity: Math.min(1, 0.55 + (chanceCount - 1) * 0.225),
      };
    }
  }

  return null;
}

/**
 * Reads tenpai: exactly two cards shown, they agree, and the symbol is one
 * that pays as a triple — so the face-down card genuinely still could complete
 * it. Returns null when the third card cannot matter.
 */
export function readReelTenpai(
  cards: readonly BattleCardSymbol[],
  revealed: readonly boolean[]
): ReelTenpai | null {
  if (!patchConfig.reelMechanics.tenpai.enabled) return null;

  const shown = revealedSlots(revealed);
  if (shown.length !== 2) return null;

  const [a, b] = shown;
  const symbol = cards[a];

  if (cards[b] !== symbol) return null;
  if (!isTripleSymbol(symbol)) return null;

  const pendingSlot = [0, 1, 2].find((slot) => !isRevealed(revealed, slot));
  if (pendingSlot === undefined) return null;

  return { symbol, matchedSlots: shown, pendingSlot };
}

