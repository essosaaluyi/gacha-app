import {
  type BattleEnemy,
  type EnemyId,
  type NormalBattleRounds,
  NORMAL_BATTLE_ROUNDS,
  battleEnemies,
  pickEnemyForRound,
} from "@/lib/battle-pixi/config/enemyConfig";

let currentEnemy: BattleEnemy | null = null;
const pickedEnemyIds: EnemyId[] = [];
let normalRounds: NormalBattleRounds = NORMAL_BATTLE_ROUNDS;
export type BattleEnemyProgressionSnapshot = {
  normalRounds: NormalBattleRounds;
  pickedEnemyIds: EnemyId[];
};
const FIXED_TEST_ENEMY_ID: EnemyId | null = null;

let listeners: (() => void)[] = [];

export function getCurrentEnemy() {
  return currentEnemy;
}

export function getNormalBattleRounds() {
  return normalRounds;
}

export function getBattleEnemyProgressionSnapshot(): BattleEnemyProgressionSnapshot {
  return { normalRounds, pickedEnemyIds: [...pickedEnemyIds] };
}

export function restoreBattleEnemyProgression(snapshot?: BattleEnemyProgressionSnapshot) {
  // Saves without a version belong to the previous ten-normal-battle rules.
  normalRounds = snapshot?.normalRounds === NORMAL_BATTLE_ROUNDS ? NORMAL_BATTLE_ROUNDS : 10;
  pickedEnemyIds.length = 0;
  if (Array.isArray(snapshot?.pickedEnemyIds)) {
    pickedEnemyIds.push(...new Set(snapshot.pickedEnemyIds.filter((id) => battleEnemies[id])));
  }
}

export function selectEnemyForRound(round: number) {
  currentEnemy = FIXED_TEST_ENEMY_ID
    ? battleEnemies[FIXED_TEST_ENEMY_ID]
    : pickEnemyForRound(round, pickedEnemyIds, normalRounds);

  if (round <= normalRounds) {
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
    if (!pickedEnemyIds.includes(enemy.id)) pickedEnemyIds.push(enemy.id);
    listeners.forEach((listener) => listener());
  }
}

export function resetCurrentEnemy() {
  currentEnemy = null;
  pickedEnemyIds.length = 0;
  normalRounds = NORMAL_BATTLE_ROUNDS;

  listeners.forEach((listener) => listener());
}

export function subscribeCurrentEnemy(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
