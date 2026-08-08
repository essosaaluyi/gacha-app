// Attack-land electricity struggle (the payoff game of the fakeout cycle).
//
// Two stages, both driven by the game rather than a timer:
//   startAttackLandStruggle  – fires on the payoff game's DRAW CLICK, so the
//                              struggle runs while the player flips the hand.
//   revealAttackLandWinner   – fires on the THIRD FLIP and names the winner.
//
// Purely presentational: the outcome is already decided when this shows; the
// overlay only dramatizes which side the attack lands on.

export type AttackLandRevealSide = "player" | "enemy";

export type AttackLandRevealState = {
  active: boolean;
  key: number;
  playerImage: string;
  playerName: string;
  enemyImage: string;
  enemyName: string;
  /** Null while the struggle is unresolved — the third flip fills it in. */
  winner: AttackLandRevealSide | null;
};

let state: AttackLandRevealState = {
  active: false,
  key: 0,
  playerImage: "",
  playerName: "",
  enemyImage: "",
  enemyName: "",
  winner: null,
};

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function startAttackLandStruggle(args: {
  playerImage: string;
  playerName: string;
  enemyImage: string;
  enemyName: string;
}) {
  state = {
    ...args,
    active: true,
    key: state.key + 1,
    winner: null,
  };
  notify();
}

export function revealAttackLandWinner(winner: AttackLandRevealSide) {
  if (!state.active || state.winner !== null) return;
  state = { ...state, winner };
  notify();
}

export function isAttackLandStruggleUnresolved() {
  return state.active && state.winner === null;
}

export function hideAttackLandReveal() {
  if (!state.active) return;
  state = { ...state, active: false };
  notify();
}

export function getAttackLandRevealState() {
  return state;
}

export function subscribeAttackLandReveal(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}
