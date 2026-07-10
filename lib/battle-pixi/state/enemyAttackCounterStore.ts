let enemyAttackCounter = 8;
let listeners: (() => void)[] = [];

export function getEnemyAttackCounter() {
  return enemyAttackCounter;
}

export function setEnemyAttackCounter(value: number) {
  enemyAttackCounter = value;
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