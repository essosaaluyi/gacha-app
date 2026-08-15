export type AttackAttemptResult = {
  success: boolean;
  rate: number;
};

export function rollAttackAttempt(rate: number): AttackAttemptResult {
  const roll = Math.random() * 100;

  return {
    success: roll < rate,
    rate,
  };
}