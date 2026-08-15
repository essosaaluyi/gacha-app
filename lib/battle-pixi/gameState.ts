import type { BattleResult } from "./core/resultLottery";

export type BattleMode =
  | "idle"
  | "draw_ready"
  | "cards_out"
  | "cards_placed"
  | "evaluating"
  | "attack_attempt"
  | "fatal"
  | "enemy_attack"
  | "last_stand";

export type BattleState = {
  mode: BattleMode;

  currentResult: BattleResult | null;

  revealedCount: number;

  cardsAreOut: boolean;
  cardsReleased: boolean;

  enemyAttackCounter: number;

  fatalModeGamesLeft: number;
  enemyAttackGamesLeft: number;
  lastStandGamesLeft: number;
};

export function createBattleState(): BattleState {
  return {
    mode: "idle",

    currentResult: null,

    revealedCount: 0,

    cardsAreOut: false,
    cardsReleased: false,

    enemyAttackCounter: 8,

    fatalModeGamesLeft: 0,
    enemyAttackGamesLeft: 0,
    lastStandGamesLeft: 0,
  };
}