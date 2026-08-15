// The attack fakeout cycle.
//
// Shape (fixed — there is no cycle-shape lottery any more):
//
//   games 1..N   buildup. Each game independently rolls ONE presentation
//                (dialogue or the chance reveal visual). Whatever the previous
//                game showed is cleared when the next draw commits.
//   game  N+1    payoff. The draw click starts the electricity struggle and the
//                third flip names the winner.
//
// With the default buildupGames of 3 that is a 4-game cycle, which is the
// window the player has to overturn a predetermined miss: a successful attack
// attempt landed at any point during the cycle calls overrideFakeoutToSuccess.

import { patchConfig, type FakeoutPresentation } from "@/lib/game-config/patchConfig";

export type AttackFakeoutTurn = {
  /** 1-based game index within the cycle. */
  gameNumber: number;
  buildupGames: number;
  /** True on the final game: struggle on the draw, winner on the third flip. */
  isPayoffGame: boolean;
  /** Null on the payoff game — the struggle replaces the buildup visuals. */
  presentation: FakeoutPresentation | null;
  predeterminedSuccess: boolean;
};

export type AttackFakeoutState = {
  active: boolean;
  gamesPlayed: number;
  buildupGames: number;
  predeterminedSuccess: boolean;
};

function emptyState(): AttackFakeoutState {
  return {
    active: false,
    gamesPlayed: 0,
    buildupGames: patchConfig.fakeout.buildupGames,
    predeterminedSuccess: false,
  };
}

let fakeoutState: AttackFakeoutState = emptyState();

export function getAttackFakeoutState() {
  return fakeoutState;
}

/** Total games in a cycle, buildup + the payoff game. */
export function getFakeoutCycleLength() {
  return patchConfig.fakeout.buildupGames + 1;
}

export function startAttackFakeout(predeterminedSuccess: boolean) {
  fakeoutState = {
    active: true,
    gamesPlayed: 0,
    buildupGames: patchConfig.fakeout.buildupGames,
    predeterminedSuccess,
  };
}

/**
 * Advances the cycle by one game. Returns what this game should present, or
 * null when no cycle is running. The caller rolls the presentation itself so
 * the lottery stays out of the store.
 */
export function consumeFakeoutTurn(
  rollPresentation: () => FakeoutPresentation
): AttackFakeoutTurn | null {
  if (!fakeoutState.active) return null;

  const gameNumber = fakeoutState.gamesPlayed + 1;
  const isPayoffGame = gameNumber > fakeoutState.buildupGames;

  fakeoutState.gamesPlayed = gameNumber;

  // The cycle stays active through the payoff game so a success landing on that
  // draw can still override it; the caller clears once the winner is shown.
  return {
    gameNumber,
    buildupGames: fakeoutState.buildupGames,
    isPayoffGame,
    presentation: isPayoffGame ? null : rollPresentation(),
    predeterminedSuccess: fakeoutState.predeterminedSuccess,
  };
}

export function clearAttackFakeout() {
  fakeoutState = emptyState();
}

/** The player overturned the predetermined miss during the cycle. */
export function overrideFakeoutToSuccess() {
  if (!fakeoutState.active) return;

  fakeoutState.predeterminedSuccess = true;
}
