// Feature 6 audio: the cue map for the collection (pick-me) phase.
//
// No clips have been recorded specifically for the pick phase yet, so each cue
// borrows a battle clip that already carries the right meaning: the payout is
// the coin card, extra picks reuse Reply (the battle's own "one more go"), and a
// dud reuses the discard thud pulled down in the mix. Swap the right-hand side
// of the cue functions when final collection SFX land — the sequencing and the
// timings below stay as they are.

import { playSfx, playSfxSequence, type SfxName } from "@/lib/audio/sfxStore";
import type { CollectionCard } from "@/lib/battle-pixi/core/collectionDeck";

/** Drives per-tier styling and audio so effects escalate with the reward. */
export function collectionCardTier(card: CollectionCard) {
  if (card.type === "collect") return "collect";
  if (card.type === "empty") return "zero";
  if (card.type === "chance" || card.type === "doubleAll") return "multiplier";
  if (card.type === "pick") return "pick";
  if (card.points >= 1000) return "jackpot";
  if (card.points >= 300) return "large";
  if (card.points >= 100) return "medium";
  return "small";
}

// The card takes 460ms to rotate (see .collection-card-inner), so the face only
// becomes legible around halfway. Landing the reward cue there is what makes the
// sound feel caused by the flip rather than by the click.
const REVEAL_MS = 230;

// The combo card pays and extends in one hit; its two cues are separated so they
// read as two events instead of one muddy chord.
const COMBO_PICK_MS = 500;

// Long enough for the coin shower and the counter roll to be under way.
const FINISH_MS = 700;

function at(delayMs: number, name: SfxName, volume = 1) {
  if (delayMs <= 0) {
    playSfx(name, { volume });
    return;
  }

  window.setTimeout(() => playSfx(name, { volume }), delayMs);
}

/** The pick-me board arrives on screen. */
export function playCollectionStartSfx() {
  playSfx("stageName");
}

/**
 * One call per flip, fired by the store the instant a card is committed — so a
 * React re-render can never double it, and every cue is tied to real state.
 */
export function playCollectionFlipSfx(card: CollectionCard) {
  if (typeof window === "undefined") return;

  // The flip itself, always.
  playSfx("cardReveal", { volume: 0.9 });

  switch (collectionCardTier(card)) {
    case "jackpot":
      playSfxSequence("coinCard", 3, 90, { volume: 0.95 });
      at(REVEAL_MS + 140, "tableShine");
      break;
    case "large":
      at(REVEAL_MS, "coinCard");
      at(REVEAL_MS + 120, "tableShine", 0.8);
      break;
    case "medium":
      at(REVEAL_MS, "coinCard");
      break;
    case "small":
      at(REVEAL_MS, "coinCard", 0.85);
      break;
    case "multiplier":
      at(REVEAL_MS, "chanceIcon");
      // ×2 ALL cashes in immediately, so it gets the extra flourish that ×2
      // NEXT (a promise, not a payout) does not.
      if (card.type === "doubleAll") at(REVEAL_MS + 160, "tableShine");
      break;
    case "pick":
      at(REVEAL_MS, "reply");
      break;
    case "zero":
      at(REVEAL_MS, "discard", 0.6);
      break;
    case "collect":
      at(REVEAL_MS, "pointsGained");
      break;
  }

  // Point cards that also grant a pick stack the Reply cue on top of the payout.
  if (card.points > 0 && card.picks > 0) at(COMBO_PICK_MS, "reply", 0.9);
}

/** The phase is over — cap reached, picks exhausted, or COLLECT drawn. */
export function playCollectionFinishSfx() {
  at(FINISH_MS, "roundInsert");
}
