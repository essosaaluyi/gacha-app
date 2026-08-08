import { setBattlePresentationPhase } from "@/lib/battle-pixi/state/battlePresentationFlowStore";

export type BattleState =
  | "playing"
  // No longer set: losing the last card goes straight to "gameOver" now that
  // continues are gone. Kept so a session saved before that change still
  // deserialises into a valid state.
  | "playerDefeated"
  | "gameOver";

let battleState: BattleState = "playing";

const listeners: (() => void)[] = [];

export function getBattleState() {
  return battleState;
}

export function setBattleState(state: BattleState) {
  battleState = state;
  if (state === "playerDefeated") {
    setBattlePresentationPhase("defeat", "player-defeated");
  } else if (state === "gameOver") {
    setBattlePresentationPhase("game_over", "game-over");
  }
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
