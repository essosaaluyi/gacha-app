export type BattlePhase =
  | "battle_opening"
  | "round_insert"
  | "battle"
  | "bonus_opening"
  | "bonus_games";

let currentPhase: BattlePhase = "battle_opening";

let listeners: (() => void)[] = [];

export function getBattlePhase() {
  return currentPhase;
}

export function setBattlePhase(phase: BattlePhase) {
  currentPhase = phase;

  listeners.forEach((listener) => listener());
}

export function subscribeBattlePhase(
  listener: () => void
) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}