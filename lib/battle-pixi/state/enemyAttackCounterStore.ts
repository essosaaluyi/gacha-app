let enemyAttackCounter = 8;
// The value the counter was last armed at. The HUD renders the counter as a
// depleting gauge, so it needs the full value to compute a ratio — a bare
// count cannot say how much of the fuse is left.
let enemyAttackCounterMax = 8;
let listeners: (() => void)[] = [];

export function getEnemyAttackCounter() {
  return enemyAttackCounter;
}

export function getEnemyAttackCounterMax() {
  return enemyAttackCounterMax;
}

/**
 * Arms the counter for a new enemy. Every call site is a spawn or a run reset,
 * so this also re-arms the max; use decrementEnemyAttackCounter to tick down.
 */
export function setEnemyAttackCounter(value: number) {
  enemyAttackCounter = value;
  enemyAttackCounterMax = Math.max(1, value);
  listeners.forEach((listener) => listener());
}

export function decrementEnemyAttackCounter() {
  enemyAttackCounter = Math.max(0, enemyAttackCounter - 1);
  listeners.forEach((listener) => listener());
}

export function subscribeEnemyAttackCounter(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
