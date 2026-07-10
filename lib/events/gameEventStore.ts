// Structured game event log. Records every draw, trigger roll, and payout.
// Feeds the statistics graph (stock-ticker panel) and future economy balancing.
// Persisted to localStorage as a ring buffer capped at patchConfig.eventLog.maxEvents.

import { patchConfig } from "@/lib/game-config/patchConfig";

export type GameEventKind =
  | "draw"
  | "attackRoll"
  | "fakeoutVariant"
  | "fakeoutReveal"
  | "resurrectionArmed"
  | "resurrectionReveal"
  | "bonusStart"
  | "bonusGame"
  | "nestedEnter"
  | "nestedGame"
  | "collectionFlip"
  | "pointsDelta"
  | "gachaPull"
  | "dailyClaim"
  | "giftClaim"
  | "shopRedeem";

export type GameEvent = {
  id: string;
  ts: number;
  battleId: string | null;
  round: number;
  game: number;
  kind: GameEventKind;
  detail: Record<string, unknown>;
  pointsDelta?: number;
  balanceAfter?: number;
};

const STORAGE_KEY = "game_event_log";
const SAVE_DEBOUNCE_MS = 250;

let events: GameEvent[] = [];
let hydrated = false;
let currentBattleId: string | null = null;
let currentRound = 0;
let currentGame = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameEvent[];
      if (Array.isArray(parsed)) {
        events = parsed;
      }
    }
  } catch {
    events = [];
  }
}

function scheduleSave() {
  if (typeof window === "undefined") return;
  if (saveTimer) return;

  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Storage full or unavailable: drop oldest half and retry once.
      events = events.slice(Math.floor(events.length / 2));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
      } catch {
        // Give up silently; the in-memory log keeps working.
      }
    }
  }, SAVE_DEBOUNCE_MS);
}

export function setEventBattleContext(context: {
  battleId?: string | null;
  round?: number;
  game?: number;
}) {
  if (context.battleId !== undefined) currentBattleId = context.battleId;
  if (context.round !== undefined) currentRound = context.round;
  if (context.game !== undefined) currentGame = context.game;
}

export function startNewBattleSession(): string {
  const battleId = `battle-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  currentBattleId = battleId;
  currentRound = 0;
  currentGame = 0;
  return battleId;
}

export function getCurrentBattleId() {
  return currentBattleId;
}

export function logEvent(
  event: Pick<GameEvent, "kind" | "detail"> &
    Partial<Pick<GameEvent, "pointsDelta" | "balanceAfter" | "round" | "game">>
) {
  hydrate();

  const entry: GameEvent = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
    ts: Date.now(),
    battleId: currentBattleId,
    round: event.round ?? currentRound,
    game: event.game ?? currentGame,
    kind: event.kind,
    detail: event.detail,
    pointsDelta: event.pointsDelta,
    balanceAfter: event.balanceAfter,
  };

  events.push(entry);

  const max = patchConfig.eventLog.maxEvents;
  if (events.length > max) {
    events = events.slice(events.length - max);
  }

  scheduleSave();
  notify();
  return entry;
}

export type GameEventFilter = {
  battleId?: string;
  kinds?: GameEventKind[];
  sinceTs?: number;
};

export function getEvents(filter?: GameEventFilter): GameEvent[] {
  hydrate();

  if (!filter) return events;

  return events.filter((event) => {
    if (filter.battleId && event.battleId !== filter.battleId) return false;
    if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
    if (filter.sinceTs && event.ts < filter.sinceTs) return false;
    return true;
  });
}

export function subscribeGameEvents(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
