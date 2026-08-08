// Feature 4: Nested Loop Bonus — an alternative bonus that runs alongside
// the classic one (which is untouched in bonusModeStore).
//
//   Main loop: 10 games. Drawing a trigger outcome drops into a
//   Nested loop: 3 games (min 20 pts each; a Chance card rolls a bonus table).
//   The triggering draw consumes its main-loop game; after 3 nested games,
//   play returns to the main loop with the remaining counter.

import { patchConfig } from "@/lib/game-config/patchConfig";

// A drawn-but-not-yet-shown game. The outcome is decided at the press (like a
// real cabinet's lever-on lottery) but the payout, the loop counter and the
// reward video are all held here until the three cards have actually revealed.
// Applying them at press time made the counter and points describe a game the
// player had not seen yet, which read as the bonus running a game behind.
export type PendingNestedResolution = {
  outcome: string;
  hasChance: boolean;
  /** True when this game was drawn inside the nested loop. */
  inNested: boolean;
  /** Nested games always pay; main-loop games pay nothing. */
  points: number;
  /** Main-loop only: this outcome drops play into the nested loop. */
  isTrigger: boolean;
};

let active = false;
let inNested = false;
let mainGamesRemaining = 0;
let nestedGamesRemaining = 0;
let totalPoints = 0;
let waitingForResultConfirm = false;
let pendingResolution: PendingNestedResolution | null = null;

let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function startNestedBonus() {
  active = true;
  inNested = false;
  mainGamesRemaining = patchConfig.nestedBonus.mainLoopGames;
  nestedGamesRemaining = 0;
  totalPoints = 0;
  waitingForResultConfirm = false;
  notify();
}

export function consumeMainGame() {
  if (!active || inNested) return;
  mainGamesRemaining -= 1;
  notify();
}

export function enterNestedLoop() {
  if (!active) return;
  inNested = true;
  nestedGamesRemaining = patchConfig.nestedBonus.nestedLoopGames;
  notify();
}

export function consumeNestedGame() {
  if (!active || !inNested) return;
  nestedGamesRemaining -= 1;
  if (nestedGamesRemaining <= 0) {
    nestedGamesRemaining = 0;
    inNested = false;
  }
  notify();
}

export function setPendingNestedResolution(next: PendingNestedResolution) {
  pendingResolution = next;
}

/** Hands over the drawn game so it can be applied as the cards reveal. */
export function takePendingNestedResolution() {
  const next = pendingResolution;
  pendingResolution = null;
  return next;
}

export function addNestedPoints(points: number) {
  totalPoints += points;
  notify();
}

export function getNestedTotalPoints() {
  return totalPoints;
}

export function showNestedResultConfirm() {
  waitingForResultConfirm = true;
  notify();
}

export function clearNestedResultConfirm() {
  waitingForResultConfirm = false;
  notify();
}

export function finishNestedBonus() {
  active = false;
  inNested = false;
  mainGamesRemaining = 0;
  nestedGamesRemaining = 0;
  totalPoints = 0;
  waitingForResultConfirm = false;
  pendingResolution = null;
  notify();
}

export function isNestedBonusActive() {
  return active;
}

export function getNestedBonusState() {
  return {
    active,
    inNested,
    mainGamesRemaining,
    nestedGamesRemaining,
    totalPoints,
    waitingForResultConfirm,
  };
}

export function subscribeNestedBonus(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
