import { patchConfig } from "@/lib/game-config/patchConfig";

let fatalModeGamesLeft = 0;
let fatalModeTotalGames = 0;
let fatalModeHit = false;

let listeners: (() => void)[] = [];

export function getFatalModeGamesLeft() {
  return fatalModeGamesLeft;
}

export function isFatalModeActive() {
  return fatalModeGamesLeft > 0;
}

/**
 * Whether a hit has already landed in the current window. Read by the disc's
 * anticipation cue: on the final turn a prior hit means the kill is already
 * settled, which is the one place its top colour can be honest in advance.
 */
export function hasFatalModeHit() {
  return fatalModeHit;
}

export function startFatalMode() {
  // Read at arm time so an admin change applies to the next window.
  const games = Math.max(1, Math.round(patchConfig.fatalMode.playerWindowGames));

  fatalModeGamesLeft = games;
  fatalModeTotalGames = games;
  fatalModeHit = false;

  listeners.forEach((listener) => listener());
}

export function registerFatalModeHit() {
  if (!isFatalModeActive()) return;

  fatalModeHit = true;
}

export function consumeFatalModeTurn() {
  if (!isFatalModeActive()) return null;

  const turnNumber =
    fatalModeTotalGames - fatalModeGamesLeft + 1;

  fatalModeGamesLeft -= 1;

  const finished = fatalModeGamesLeft <= 0;

  const result = {
    turnNumber,
    finished,
    enemyDefeated: finished && fatalModeHit,
  };

  listeners.forEach((listener) => listener());

  return result;
}

export function subscribeFatalMode(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}