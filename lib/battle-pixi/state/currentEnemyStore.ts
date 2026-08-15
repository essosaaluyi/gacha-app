import {
  BattleEnemy,
  EnemyId,
  battleEnemies,
  pickEnemyForRound,
} from "@/lib/battle-pixi/config/enemyConfig";

let currentEnemy: BattleEnemy | null = null;
const pickedEnemyIds: EnemyId[] = [];
const FIXED_TEST_ENEMY_ID: EnemyId | null = null;

let listeners: (() => void)[] = [];

export function getCurrentEnemy() {
  return currentEnemy;
}

export function selectEnemyForRound(round: number) {
  currentEnemy = FIXED_TEST_ENEMY_ID
    ? battleEnemies[FIXED_TEST_ENEMY_ID]
    : pickEnemyForRound(round, pickedEnemyIds);

  if (round <= 10) {
    pickedEnemyIds.push(currentEnemy.id);
  }

  listeners.forEach((listener) => listener());

  return currentEnemy;
  
}

export function loadNextRoundEnemy(round: number) {
  const enemy = selectEnemyForRound(round);

  return enemy;
}

export function restoreEnemy(enemyId: EnemyId) {
  const enemy = battleEnemies[enemyId];
  if (enemy) {
    currentEnemy = enemy;
    listeners.forEach((listener) => listener());
  }
}

export function resetCurrentEnemy() {
  currentEnemy = null;
  pickedEnemyIds.length = 0;

  listeners.forEach((listener) => listener());
}

export function subscribeCurrentEnemy(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
