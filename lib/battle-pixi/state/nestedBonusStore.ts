// Feature 4: Nested Loop Bonus — an alternative bonus that runs alongside
// the classic one (which is untouched in bonusModeStore).
//
//   Main loop: 10 games. Drawing a trigger outcome drops into a
//   Nested loop: 3 games (min 20 pts each; a Chance card rolls a bonus table).
//   The triggering draw consumes its main-loop game; after 3 nested games,
//   play returns to the main loop with the remaining counter.

import { patchConfig } from "@/lib/game-config/patchConfig";

let active = false;
let inNested = false;
let mainGamesRemaining = 0;
let nestedGamesRemaining = 0;
let totalPoints = 0;
let waitingForResultConfirm = false;

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
