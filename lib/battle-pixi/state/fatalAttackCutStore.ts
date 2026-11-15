// Full-screen attack movies played on the draws of the player's Fatal Mode.
//
// Draw 1 plays cut 1 (as the silver opening shutter comes in), draw 2 plays
// cut 2. Draws 3 and 4 have their own presentations still to be authored.
// Presentation only: nothing here touches the roll or the outcome.

import { getPlayerFatalSnapshot, isFatalModeActive } from "./fatalModeStore";
import { getCurrentPlayerBattleCard } from "./playerBattleCardStore";

type CutNumber = 1 | 2;

/** Movies per player character. A character without an entry plays nothing. */
const CUTS: Record<string, Partial<Record<CutNumber, string>>> = {
  R1: {
    1: "/videos/battle-assets/fatal-attack/r1a1.v1.mp4",
    2: "/videos/battle-assets/fatal-attack/r1a2.v1.mp4",
  },
};

/** How long the shutter runs before cut 1 starts underneath it. */
const SHUTTER_LEAD_MS = 700;
/** Longest a cut may hold the screen and the draw lock, whatever happens. */
const MAX_HOLD_MS = 12000;

export type FatalAttackCutState = {
  active: boolean;
  key: number;
  src: string | null;
  delayMs: number;
};

let state: FatalAttackCutState = { active: false, key: 0, src: null, delayMs: 0 };
let lastPlayed = "";
let safetyTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function characterKey() {
  const card = getCurrentPlayerBattleCard();
  if (!card) return null;
  if (CUTS[card.name]) return card.name;
  return /\/player\/([^/]+)\//.exec(card.image)?.[1] ?? null;
}

export function getFatalAttackCutSources(): string[] {
  const key = characterKey();
  return key ? Object.values(CUTS[key] ?? {}) : [];
}

export function playFatalAttackCut(src: string, delayMs = 0) {
  if (safetyTimer) clearTimeout(safetyTimer);
  state = { active: true, key: state.key + 1, src, delayMs };
  // A movie that never reports "ended" must not hold the draw lock forever.
  safetyTimer = setTimeout(hideFatalAttackCut, delayMs + MAX_HOLD_MS);
  notify();
}

export function hideFatalAttackCut() {
  if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
  if (!state.active) return;
  state = { ...state, active: false };
  notify();
}

/**
 * Called on the first draw press of every hand. `openingStarted` is true when
 * that press also fired the silver shutter insert.
 */
export function onFatalModeDraw(openingStarted: boolean) {
  if (!isFatalModeActive()) { lastPlayed = ""; return; }
  const { totalGames, gamesLeft } = getPlayerFatalSnapshot();
  const turn = totalGames - gamesLeft + 1;
  if (turn !== 1 && turn !== 2) return;
  const tag = `${totalGames}:${turn}`;
  if (tag === lastPlayed) return;
  const key = characterKey();
  const src = key ? CUTS[key]?.[turn] : undefined;
  if (!src) return;
  lastPlayed = tag;
  playFatalAttackCut(src, turn === 1 && openingStarted ? SHUTTER_LEAD_MS : 0);
}

export function isFatalAttackCutPlaying() { return state.active; }
export function getFatalAttackCutState() { return state; }
export function subscribeFatalAttackCut(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
