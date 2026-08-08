// Feature 6: post-bonus collection (pick-me) phase state.
// Bonus points aren't credited at bonus end — the player collects them by
// flipping cards (one flip per game played; a Reply grants an extra flip).
// A cascading multiplier and a Chance card boost payouts, but the banked
// total is capped at the bonus earned, and the Collect card ends the phase.

import { patchConfig } from "@/lib/game-config/patchConfig";
import {
  buildCollectionDeck,
  type CollectionCard,
} from "@/lib/battle-pixi/core/collectionDeck";
import { addPoints } from "@/lib/wallet/walletStore";
import { logEvent } from "@/lib/events/gameEventStore";
import {
  playCollectionFinishSfx,
  playCollectionFlipSfx,
  playCollectionStartSfx,
} from "@/lib/battle-pixi/presentation/collectionSfx";
import { setBattlePresentationPhase } from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import {
  getBattleMode,
  setBattleMode,
} from "@/lib/battle-pixi/state/battleModeStore";

export type CollectionState = {
  active: boolean;
  finished: boolean;
  deck: CollectionCard[];
  revealed: boolean[];
  cap: number; // bonus total = max collectible
  banked: number;
  multiplier: number;
  doubleNext: boolean;
  flipsAvailable: number;
  lastFlip: { index: number; type: string; credited: number } | null;
};

const STORAGE_KEY = "collection_phase_state";

let state: CollectionState = emptyState();

const listeners: (() => void)[] = [];

function emptyState(): CollectionState {
  return {
    active: false,
    finished: false,
    deck: [],
    revealed: [],
    cap: 0,
    banked: 0,
    multiplier: 1,
    doubleNext: false,
    flipsAvailable: 0,
    lastFlip: null,
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    if (state.active) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function getCollectionState() {
  return state;
}

export function isCollectionActive() {
  return state.active;
}

/** How many times a shutout may re-deal the board before it is allowed to end. */
const MAX_ZERO_RESTARTS = 3;

let restartsUsed = 0;

/** Deals a fresh board for `bonusTotal`. Shared by a new phase and a re-deal. */
function dealCollection(bonusTotal: number) {
  const deck = buildCollectionDeck(bonusTotal);
  state = {
    active: true,
    finished: false,
    deck,
    revealed: deck.map(() => false),
    cap: bonusTotal,
    banked: 0,
    multiplier: 1,
    doubleNext: false,
    flipsAvailable: patchConfig.collection.initialFlips,
    lastFlip: null,
  };
  playCollectionStartSfx();
  persist();
  notify();
}

export function startCollectionPhase(bonusTotal: number) {
  restartsUsed = 0;
  dealCollection(bonusTotal);
  setBattleMode("collection", "collection-start");
  setBattlePresentationPhase("collection", "bonus-collection");
  logEvent({ kind: "collectionFlip", detail: { phase: "start", cap: bonusTotal } });
}

/** A game was played during collection — grant flip(s). */
export function grantCollectionFlip(count = 1) {
  if (!state.active || state.finished) return;
  state.flipsAvailable += count;
  persist();
  notify();
}

export function flipCollectionCard(index: number) {
  if (!state.active || state.finished) return;
  if (index < 0 || index >= state.deck.length) return;
  if (state.revealed[index]) return;
  if (state.flipsAvailable <= 0) return;

  // First pick is never a dud. Opening the collection on an Empty reads as
  // "the game gave me nothing", so on the very first flip only, an Empty is
  // swapped with a point card still face-down elsewhere in the deck. The deck
  // composition is unchanged — the same cards remain, just reordered — so the
  // total collectable value and every later flip stay exactly as dealt.
  if (!state.revealed.some(Boolean) && state.deck[index].type === "empty") {
    const swapWith = state.deck.findIndex(
      (candidate, i) =>
        i !== index && !state.revealed[i] && candidate.type === "point"
    );

    if (swapWith >= 0) {
      const moved = state.deck[swapWith];
      state.deck[swapWith] = state.deck[index];
      state.deck[index] = moved;
    }
  }

  state.flipsAvailable -= 1;
  state.revealed[index] = true;
  const card = state.deck[index];

  // Fired here, not in the overlay, so the cue is bound to the one committed
  // flip — a re-render or a replayed burst can never sound twice. Reads the card
  // after the never-open-on-a-dud swap, so it always matches the visible face.
  playCollectionFlipSfx(card);

  let credited = 0;

  // Mystery carries a real value chosen when the deck was built, so it pays
  // exactly like a point card — only its face is hidden until the flip.
  if (card.type === "point" || card.type === "mystery") {
    const factor = state.doubleNext ? patchConfig.collection.chanceMultiplier : 1;
    const raw = Math.round(card.points * state.multiplier * factor);
    // Cap the banked total at the bonus earned.
    credited = Math.max(0, Math.min(raw, state.cap - state.banked));
    state.banked += credited;
    state.doubleNext = false;
    state.multiplier = roundTo(state.multiplier + patchConfig.collection.cascadeStep);
    if (credited > 0) void addPoints(credited, "collection");

    // The combo card: pays and extends the round in one hit.
    if (card.picks > 0) state.flipsAvailable += card.picks;
  } else if (card.type === "chance") {
    state.doubleNext = true;
  } else if (card.type === "doubleAll") {
    // Doubles what is already banked, still bounded by the bonus cap.
    const bonus = Math.max(0, Math.min(state.banked, state.cap - state.banked));
    if (bonus > 0) {
      state.banked += bonus;
      credited = bonus;
      void addPoints(bonus, "collection");
    }
  } else if (card.type === "pick") {
    state.flipsAvailable += card.picks;
  } else if (card.type === "empty") {
    // wasted flip
  } else if (card.type === "collect") {
    state.finished = true;
    state.active = false;
  }

  state.lastFlip = { index, type: card.type, credited };

  logEvent({
    kind: "collectionFlip",
    detail: { type: card.type, credited, banked: state.banked, multiplier: state.multiplier },
    pointsDelta: credited > 0 ? credited : undefined,
  });

  // Auto-finish if every card is flipped or the cap is reached.
  if (!state.finished && (state.banked >= state.cap || state.revealed.every(Boolean))) {
    state.finished = true;
    state.active = false;
  }

  // Collection owns the full screen, so its initial picks are the complete
  // allotment. Never wait for an overlapping normal battle draw to add more.
  if (!state.finished && state.flipsAvailable <= 0) {
    state.finished = true;
    state.active = false;
  }

  // A shutout is not an ending. Running the pick zone out with nothing banked
  // reads as the machine taking the whole bonus away, which is the worst
  // possible payoff beat -- so the board is re-dealt and the player picks
  // again for the same pot rather than being shown a 0.
  //
  // Bounded, because the restart is only worth having if it terminates: the
  // very first pick can be a `collect`, which ends a round instantly, and
  // without a cap a run of those would re-deal forever.
  if (state.finished && state.banked <= 0 && restartsUsed < MAX_ZERO_RESTARTS) {
    restartsUsed += 1;
    logEvent({
      kind: "collectionFlip",
      detail: { type: "restart", credited: 0, banked: 0, restart: restartsUsed },
    });
    dealCollection(state.cap);
    return;
  }

  // The guard at the top of this function means the phase was still running on
  // entry, so a finished flag here is always a fresh ending — one fanfare, once.
  if (state.finished) playCollectionFinishSfx();

  persist();
  notify();
}

export function dismissCollectionResult() {
  state = emptyState();
  // Hand the machine back before announcing the round -- the round insert is a
  // battle-scene beat, and leaving the mode on "collection" would keep the pick
  // scene owning the screen underneath it.
  if (getBattleMode() === "collection") {
    setBattleMode("battle", "collection-dismissed");
  }
  setBattlePresentationPhase("next_round_ready", "collection-dismissed");
  persist();
  notify();

  // The next screen after the pick phase is the next round's insert, not an
  // idle table waiting for another press. The stage owns round advancement, so
  // it is asked to run it rather than duplicating that logic here.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("battle:collection-dismissed"));
  }
}

/**
 * Force-ends a collection on battle reset/quit: credits any bonus points the
 * player hasn't banked yet so a bonus is never silently lost, then clears.
 */
export function finalizeCollectionAndCredit() {
  if (state.active && !state.finished) {
    const remaining = Math.max(0, state.cap - state.banked);
    if (remaining > 0) {
      void addPoints(remaining, "collection_autocredit");
    }
  }
  resetCollectionPhase();
}

export function resetCollectionPhase() {
  state = emptyState();
  // Release the machine back to the base game if the pick zone still owns it.
  if (getBattleMode() === "collection") {
    setBattleMode("battle", "collection-end");
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  notify();
}

// Note: an earlier design granted extra picks for battle games played during
// collection. That could never fire — collection owns the screen, so no battle
// game can be played, and the phase ends the moment picks reach zero. The
// subscription was dead code and has been removed. Extra picks now come from
// the deck itself (the "pick" and combo cards).

/**
 * Restores an in-progress pick phase after a reload. Must also put the machine
 * back into collection mode: the pick phase is its own scene now, and the scene
 * is chosen from the presentation phase -- without this a reload mid-collection
 * would come back to the battle scene with the saved picks stranded in storage.
 *
 * Called once from BattleScreen, which is always mounted; the overlay itself
 * cannot do it, since it only exists while the scene is already active.
 */
export function hydrateCollectionFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CollectionState;
      if (parsed && parsed.active) {
        state = parsed;
        setBattleMode("collection", "collection-restore");
        setBattlePresentationPhase("collection", "collection-restore");
        notify();
      }
    }
  } catch {
    // ignore
  }
}

// Dev-only console helper. A collection normally requires winning a bonus, so
// `__startCollection(600)` drops straight into the pick-me phase with that many
// points on the line — enough to exercise the flip economy, the multiplier
// cascade and the never-open-on-a-dud rule without grinding a bonus first.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (
    window as Window & { __startCollection?: (points?: number) => string }
  ).__startCollection = (points = 600) => {
    startCollectionPhase(points);
    return `Collection started with ${points}P to collect and ${patchConfig.collection.initialFlips} flips.`;
  };
}

export function subscribeCollection(listener: () => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

function roundTo(value: number) {
  return Math.round(value * 100) / 100;
}
