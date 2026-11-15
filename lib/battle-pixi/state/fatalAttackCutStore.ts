// Full-screen attack movies played on the draws of the player's Fatal Mode.
//
// Draw 1 plays cut 1 (as the silver opening shutter comes in), draw 2 plays
// cut 2, draw 3 plays the "just before the hit" cut. Draw 4 has its own
// presentation still to be authored.
// Presentation only: nothing here touches the roll or the outcome.
//
// Slot-machine rule: the cabinet stays playable while a movie runs. A movie
// never locks the draw; the next draw simply cuts to the next scene, and a
// movie that runs out first holds on its last frame until that draw comes.

import { getPlayerFatalSnapshot, isFatalModeActive } from "./fatalModeStore";
import { getCurrentPlayerBattleCard } from "./playerBattleCardStore";
import { markFatalModeDrawStarted } from "./fatalModeWindowStore";
import { getCurrentEnemy } from "./currentEnemyStore";

type CutNumber = 1 | 2;

/** Movies per player character. A character without an entry plays nothing. */
const CUTS: Record<string, Partial<Record<CutNumber, string>>> = {
  R1: {
    1: "/videos/battle-assets/fatal-attack/r1a1.v2.mp4",
    2: "/videos/battle-assets/fatal-attack/r1a2.v3.mp4",
  },
};

/**
 * Draw 3: the projectile's point of view closing in on the enemy just before
 * the hit. The movie shows the enemy, so it is chosen by the enemy on screen
 * and only plays for a character that has its own attack movies (the
 * projectile is that character's). An enemy without an entry plays nothing.
 */
const BEFORE_HIT_CUTS: Partial<Record<number, string>> = {
  1: "/videos/battle-assets/fatal-attack/e1beforehit.v1.mp4",
};

function beforeHitCut(characterKey: string | null) {
  const enemy = getCurrentEnemy();
  if (!characterKey || !CUTS[characterKey] || !enemy) return undefined;
  return BEFORE_HIT_CUTS[enemy.id];
}

/** How long the shutter runs before cut 1 starts underneath it. */
const SHUTTER_LEAD_MS = 700;

export type FatalAttackCutState = {
  active: boolean;
  key: number;
  src: string | null;
  delayMs: number;
};

let state: FatalAttackCutState = { active: false, key: 0, src: null, delayMs: 0 };
let lastPlayed = "";
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
  if (!key) return [];
  const beforeHit = beforeHitCut(key);
  return [...Object.values(CUTS[key] ?? {}), ...(beforeHit ? [beforeHit] : [])];
}

export function playFatalAttackCut(src: string, delayMs = 0) {
  state = { active: true, key: state.key + 1, src, delayMs };
  notify();
}

export function hideFatalAttackCut() {
  if (!state.active) return;
  state = { ...state, active: false };
  notify();
}

/**
 * Called on the first draw press of every hand. `openingStarted` is true when
 * that press also fired the silver shutter insert.
 */
export function onFatalModeDraw(openingStarted: boolean) {
  // Outside Fatal Mode, and on draws with no movie of their own, the draw
  // cuts whatever was still on screen.
  if (!isFatalModeActive()) { lastPlayed = ""; hideFatalAttackCut(); return; }
  // The band and the rest of the mode's dressing begin with this press.
  markFatalModeDrawStarted(openingStarted ? SHUTTER_LEAD_MS : 0);
  const { totalGames, gamesLeft } = getPlayerFatalSnapshot();
  const turn = totalGames - gamesLeft + 1;
  const tag = `${totalGames}:${turn}`;
  if (tag === lastPlayed) return;
  const key = characterKey();
  const src =
    key && (turn === 1 || turn === 2) ? CUTS[key]?.[turn]
    : turn === 3 ? beforeHitCut(key)
    : undefined;
  lastPlayed = tag;
  if (!src) { hideFatalAttackCut(); return; }
  playFatalAttackCut(src, turn === 1 && openingStarted ? SHUTTER_LEAD_MS : 0);
}

export function getFatalAttackCutState() { return state; }
export function subscribeFatalAttackCut(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
