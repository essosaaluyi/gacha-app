import { patchConfig } from "@/lib/game-config/patchConfig";

let fatalModeGamesLeft = 0;
let fatalModeTotalGames = 0;
let fatalModeHit = false;
type GuaranteedBonusType = "regular" | "super" | "superMax";
let guaranteedBonusType: GuaranteedBonusType | null = null;
export function getGuaranteedFatalBonusType() { return guaranteedBonusType; }
export function setGuaranteedFatalBonusType(value: GuaranteedBonusType | null) { guaranteedBonusType = value; }

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

export function startFatalMode(options: { guaranteedDefeat?: boolean } = {}) {
  guaranteedBonusType = null;
  // Read at arm time so an admin change applies to the next window.
  const games = Math.max(1, Math.round(patchConfig.fatalMode.playerWindowGames));

  fatalModeGamesLeft = games;
  fatalModeTotalGames = games;
  // Triple BAR starts the normal Fatal Mode presentation, but its eventual
  // enemy defeat is already locked in regardless of the following hands.
  fatalModeHit = options.guaranteedDefeat === true;

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

export function getPlayerFatalSnapshot() {
  return { gamesLeft: fatalModeGamesLeft, totalGames: fatalModeTotalGames, hit: fatalModeHit, guaranteedBonusType };
}

export function restorePlayerFatal(snapshot?: { gamesLeft: number; totalGames: number; hit: boolean; guaranteedBonusType?: GuaranteedBonusType | null }) {
  fatalModeTotalGames = Math.max(0, Math.floor(snapshot?.totalGames ?? 0));
  fatalModeGamesLeft = Math.max(0, Math.min(fatalModeTotalGames, Math.floor(snapshot?.gamesLeft ?? 0)));
  fatalModeHit = snapshot?.hit === true;
  const grade = snapshot?.guaranteedBonusType;
  guaranteedBonusType = fatalModeGamesLeft > 0 && fatalModeHit &&
    (grade === "regular" || grade === "super" || grade === "superMax") ? grade : null;
  listeners.forEach(listener => listener());
}
