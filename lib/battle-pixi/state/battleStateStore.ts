export type BattleState =
  | "playing"
  | "playerDefeated"
  | "continue"
  | "gameOver";

let battleState: BattleState = "playing";

const listeners: (() => void)[] = [];

export function getBattleState() {
  return battleState;
}

export function setBattleState(state: BattleState) {
  battleState = state;
  listeners.forEach((listener) => listener());
}

export function resetBattleState() {
  setBattleState("playing");
}

export function subscribeBattleState(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);

    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}