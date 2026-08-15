// Post-bonus Pick a Bonus state. Rewards are credited to the unified wallet
// when their cards resolve; this store owns the table, picks, and handoff back
// to the next battle round.

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
  awaitingExtraDeal: boolean;
  extraMode: boolean;
  deck: CollectionCard[];
  revealed: boolean[];
  cap: number;
  tableBanked: number;
  banked: number;
  multiplier: number;
  doubleNext: boolean;
  flipsAvailable: number;
  lastFlip: { index: number; type: string; credited: number } | null;
};

const STORAGE_KEY = "collection_phase_state";
const MAX_ZERO_RESTARTS = 3;

let state: CollectionState = emptyState();
let restartsUsed = 0;
const listeners: (() => void)[] = [];

function emptyState(): CollectionState {
  return {
    active: false,
    finished: false,
    awaitingExtraDeal: false,
    extraMode: false,
    deck: [],
    revealed: [],
    cap: 0,
    tableBanked: 0,
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
    if (state.active || state.finished || state.awaitingExtraDeal) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage failure should not interrupt a live bonus.
  }
}

function dealCollection(
  cap: number,
  options: { extraMode?: boolean; preserveBanked?: number } = {}
) {
  const extraMode = options.extraMode ?? false;
  const deck = buildCollectionDeck(cap, extraMode);

  state = {
    active: true,
    finished: false,
    awaitingExtraDeal: false,
    extraMode,
    deck,
    revealed: deck.map(() => false),
    cap,
    tableBanked: 0,
    banked: options.preserveBanked ?? 0,
    multiplier: 1,
    doubleNext: false,
    flipsAvailable: patchConfig.collection.initialFlips,
    lastFlip: null,
  };

  playCollectionStartSfx();
  persist();
  notify();
}

export function getCollectionState() {
  return state;
}

export function isCollectionActive() {
  return state.active || state.awaitingExtraDeal;
}

export function startCollectionPhase(bonusTotal: number) {
  restartsUsed = 0;
  dealCollection(Math.max(1, Math.round(bonusTotal)));
  setBattleMode("collection", "collection-start");
  setBattlePresentationPhase("collection", "bonus-collection");
  logEvent({
    kind: "collectionFlip",
    detail: { phase: "start", cap: bonusTotal },
  });
}

export function advanceCollectionAfterMaxPayout() {
  if (!state.awaitingExtraDeal) return;

  const { cap, banked } = state;
  dealCollection(cap, { extraMode: true, preserveBanked: banked });
  logEvent({
    kind: "collectionFlip",
    detail: { phase: "extra-table", cap, banked },
  });
}

export function grantCollectionFlip(count = 1) {
  if (!state.active || state.finished) return;
  state.flipsAvailable += count;
  persist();
  notify();
}

export function flipCollectionCard(index: number) {
  if (!state.active || state.finished || state.awaitingExtraDeal) return;
  if (index < 0 || index >= state.deck.length) return;
  if (state.revealed[index] || state.flipsAvailable <= 0) return;

  state.flipsAvailable -= 1;
  state.revealed[index] = true;
  const card = state.deck[index];
  const doubleWasArmed = state.doubleNext;

  playCollectionFlipSfx(card);

  let credited = 0;

  if (card.type === "point" || card.type === "mystery") {
    const factor = doubleWasArmed
      ? patchConfig.collection.chanceMultiplier
      : 1;
    const raw = Math.round(card.points * factor);
    credited = Math.max(0, Math.min(raw, state.cap - state.tableBanked));
    state.tableBanked += credited;
    state.banked += credited;
    state.doubleNext = false;
    if (credited > 0) void addPoints(credited, "collection");
    if (card.picks > 0) state.flipsAvailable += card.picks;
  } else if (card.type === "chance") {
    state.doubleNext = true;
  } else if (card.type === "doubleAll") {
    const bonus = Math.max(
      0,
      Math.min(state.tableBanked, state.cap - state.tableBanked)
    );
    credited = bonus;
    state.tableBanked += bonus;
    state.banked += bonus;
    if (bonus > 0) void addPoints(bonus, "collection");
  } else if (card.type === "pick") {
    state.flipsAvailable += card.picks;
  } else if (card.type === "collect") {
    state.active = false;
    state.finished = true;
  }

  state.lastFlip = { index, type: card.type, credited };

  logEvent({
    kind: "collectionFlip",
    detail: {
      type: card.type,
      credited,
      banked: state.banked,
      tableBanked: state.tableBanked,
      doubleApplied: doubleWasArmed,
    },
    pointsDelta: credited > 0 ? credited : undefined,
  });

  if (!state.finished && state.tableBanked >= state.cap) {
    state.active = false;
    state.awaitingExtraDeal = true;
  } else if (
    !state.finished &&
    (state.revealed.every(Boolean) || state.flipsAvailable <= 0)
  ) {
    state.active = false;
    state.finished = true;
  }

  if (state.finished && state.banked <= 0 && restartsUsed < MAX_ZERO_RESTARTS) {
    restartsUsed += 1;
    logEvent({
      kind: "collectionFlip",
      detail: {
        type: "restart",
        credited: 0,
        banked: 0,
        restart: restartsUsed,
      },
    });
    dealCollection(state.cap, { extraMode: state.extraMode });
    return;
  }

  if (state.finished) {
    state.doubleNext = false;
    playCollectionFinishSfx();
  }

  persist();
  notify();
}

export function dismissCollectionResult() {
  if (!state.finished) return;

  const banked = state.banked;
  state = emptyState();

  if (getBattleMode() === "collection") {
    setBattleMode("battle", "collection-dismissed");
  }
  setBattlePresentationPhase("next_round_ready", "collection-dismissed");
  persist();
  notify();

  // UR1's three-game BAR boost starts only after the complete Pick a Bonus
  // cycle, and waits if another stocked bonus is queued.
  void import("@/lib/battle-pixi/state/barProgressionStore").then(
    ({ settleProgressionAfterCollection }) =>
      settleProgressionAfterCollection()
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("battle:collection-dismissed", {
        detail: { banked },
      })
    );
  }
}

/** Clears an interrupted collection. Only already-revealed rewards are kept. */
export function finalizeCollectionAndCredit() {
  resetCollectionPhase();
}

export function resetCollectionPhase() {
  state = emptyState();
  if (getBattleMode() === "collection") {
    setBattleMode("battle", "collection-end");
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failure during reset.
    }
  }
  notify();
}

export function hydrateCollectionFromStorage() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as Partial<CollectionState>;
    if (!parsed.active && !parsed.finished && !parsed.awaitingExtraDeal) return;

    state = {
      ...emptyState(),
      ...parsed,
      tableBanked:
        typeof parsed.tableBanked === "number"
          ? parsed.tableBanked
          : parsed.banked ?? 0,
      awaitingExtraDeal: Boolean(parsed.awaitingExtraDeal),
      extraMode: Boolean(parsed.extraMode),
    } as CollectionState;

    setBattleMode("collection", "collection-restore");
    setBattlePresentationPhase("collection", "collection-restore");
    notify();
  } catch {
    // Invalid saved collection data is ignored.
  }
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (
    window as Window & { __startCollection?: (points?: number) => string }
  ).__startCollection = (points = 600) => {
    startCollectionPhase(points);
    return `Pick a Bonus started with a ${points}P max payout.`;
  };
}

export function subscribeCollection(listener: () => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}
