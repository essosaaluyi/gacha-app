import {
  getBattleMode,
  setBattleMode,
} from "@/lib/battle-pixi/state/battleModeStore";
import type { BonusType } from "@/lib/battle-pixi/core/bonusTypeLottery";

let active = false;

let phase: "opening" | "bonus" | null = null;

let bonusGamesRemaining = 0;

let listeners: (() => void)[] = [];

let bonusTotalPoints = 0;
let waitingForResultConfirm = false;
let bonusGamesMax = 5;
let forcedOpeningType: BonusType | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

export function addBonusPoints(points: number) {
  bonusTotalPoints += points;
  notify();
}

export function showBonusResultConfirm() {
  waitingForResultConfirm = true;
  notify();
}

export function clearBonusResultConfirm() {
  waitingForResultConfirm = false;
  notify();
}

export function getBonusTotalPoints() {
  return bonusTotalPoints;
}

export function startBonusOpening(forcedType: BonusType | null = null) {
  active = true;
  phase = "opening";
  bonusGamesRemaining = 0;
  forcedOpeningType = forcedType;

  bonusTotalPoints = 0;
waitingForResultConfirm = false;

  setBattleMode("bonus", "bonus-opening");
  notify();
}

export function consumeForcedBonusOpeningType() {
  const type = forcedOpeningType;
  forcedOpeningType = null;
  return type;
}

export function startBonusGames(games = 5) {
  phase = "bonus";
  bonusGamesRemaining = games;
  bonusGamesMax = games;

  notify();
}

export function consumeBonusGame() {
  if (!active) return;

  if (phase !== "bonus") return;

  bonusGamesRemaining -= 1;

  notify();
}

/**
 * BAR/BAR/BAR restores the bonus to the length it was won with -- a 7G bonus
 * resets to 7/7, not 5/5. It used to hard-code 5 and overwrite bonusGamesMax
 * with it, so hitting a reset on a 7G bonus silently downgraded the run.
 * bonusGamesMax is the entry count and is never rewritten here.
 */
export function resetBonusGamesToEntryCount() {
  bonusGamesRemaining = bonusGamesMax;

  notify();
}

export function finishBonusMode() {
  active = false;
  phase = null;
  bonusGamesRemaining = 0;

  bonusTotalPoints = 0;
waitingForResultConfirm = false;
  forcedOpeningType = null;

  // Hand the machine back to the base game only if we still own it. The
  // collection phase starts before the bonus is torn down, so an unconditional
  // handback here would yank the screen out from under the pick zone.
  if (getBattleMode() === "bonus") {
    setBattleMode("battle", "bonus-finished");
  }
  notify();
}

export function getBonusModeState() {
  return {
    active,
    phase,
    bonusGamesRemaining,
    bonusGamesMax,
    bonusTotalPoints,
waitingForResultConfirm,
  };
}

export function restoreBonusMode(snapshot: {
  active: boolean;
  phase: "opening" | "bonus" | null;
  bonusGamesRemaining: number;
  bonusGamesMax: number;
  bonusTotalPoints: number;
}) {
  active = snapshot.active;
  phase = snapshot.phase;
  bonusGamesRemaining = snapshot.bonusGamesRemaining;
  bonusGamesMax = snapshot.bonusGamesMax;
  bonusTotalPoints = snapshot.bonusTotalPoints;
  waitingForResultConfirm = false;
  forcedOpeningType = null;
  if (active) setBattleMode("bonus", "session-restore");
  notify();
}

export function isBonusModeActive() {
  return active;
}

export function subscribeBonusMode(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
