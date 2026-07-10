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
import { subscribeDrawOutcome } from "@/lib/battle-pixi/state/drawCostStore";

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

export function startCollectionPhase(bonusTotal: number) {
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
  logEvent({ kind: "collectionFlip", detail: { phase: "start", cap: bonusTotal } });
  persist();
  notify();
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

  state.flipsAvailable -= 1;
  state.revealed[index] = true;
  const card = state.deck[index];

  let credited = 0;

  if (card.type === "point") {
    const factor = state.doubleNext ? patchConfig.collection.chanceMultiplier : 1;
    const raw = Math.round(card.points * state.multiplier * factor);
    // Cap the banked total at the bonus earned.
    credited = Math.max(0, Math.min(raw, state.cap - state.banked));
    state.banked += credited;
    state.doubleNext = false;
    state.multiplier = roundTo(state.multiplier + patchConfig.collection.cascadeStep);
    if (credited > 0) void addPoints(credited, "collection");
  } else if (card.type === "chance") {
    state.doubleNext = true;
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

  persist();
  notify();
}

export function dismissCollectionResult() {
  state = emptyState();
  persist();
  notify();
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
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  notify();
}

// Flip economy: each game played during collection grants a flip; a Reply
// outcome grants an extra one.
subscribeDrawOutcome((outcome) => {
  if (!state.active || state.finished) return;
  const extra =
    outcome === "Reply" && patchConfig.collection.replayGrantsExtraFlip ? 2 : 1;
  grantCollectionFlip(extra);
});

export function hydrateCollectionFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CollectionState;
      if (parsed && parsed.active) {
        state = parsed;
        notify();
      }
    }
  } catch {
    // ignore
  }
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
