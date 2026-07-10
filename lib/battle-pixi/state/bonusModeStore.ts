let active = false;

let phase: "opening" | "bonus" | null = null;

let bonusGamesRemaining = 0;

let listeners: (() => void)[] = [];

let bonusTotalPoints = 0;
let waitingForResultConfirm = false;
let bonusGamesMax = 5;

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

export function startBonusOpening() {
  active = true;
  phase = "opening";
  bonusGamesRemaining = 0;
  
  bonusTotalPoints = 0;
waitingForResultConfirm = false;

  notify();
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

export function resetBonusGamesToFive() {
  bonusGamesRemaining = 5;
  bonusGamesMax = 5;

  notify();
}

export function finishBonusMode() {
  active = false;
  phase = null;
  bonusGamesRemaining = 0;
  
  bonusTotalPoints = 0;
waitingForResultConfirm = false;

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

export function isBonusModeActive() {
  return active;
}

export function subscribeBonusMode(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}