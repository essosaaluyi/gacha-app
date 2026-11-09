import type { BattleOutcome } from "./resultLottery";
import type { DefenseShieldResolution } from "../state/defenseShieldStore";

/** Two independent decisions. UI/reveal/restore must never call this again. */
export function rollEnemyFatal(result: BattleOutcome, random = Math.random, protectedOutcome = false) {
  const attackSample = result === "Empty" && random() < 0.5;
  const attack = attackSample && !protectedOutcome;
  const teaseSample = random();
  return { attack, tease: attack || teaseSample < 0.5 };
}

/** Original escape predicates: rewrite survival, never the drawn symbols. */
export function enemyFatalEscape(result: BattleOutcome, evaluation: { chanceAttack: boolean; attackOnTarget: boolean }) {
  return { counter: evaluation.chanceAttack || result === "Bar", reset: evaluation.attackOnTarget || result === "Reply" };
}
export function enemyFatalSurvives(shield: DefenseShieldResolution | null, counter: boolean, reset: boolean) {
  return shield ? shield.survived : counter || reset;
}

export type FatalPreview = "attack" | "safe-dim" | "safe-clear" | "symbol" | "player" | "window-reply" | "window-chance" | "window-defense";
export function parseFatalPreview(production: boolean, value: string | null): FatalPreview | null {
  return !production && ["attack", "safe-dim", "safe-clear", "symbol", "player", "window-reply", "window-chance", "window-defense"].includes(value ?? "")
    ? value as FatalPreview : null;
}
