import {
  battleEnemies as configuredBattleEnemies,
  enemySelectionGroups,
} from "@/lib/game-config/generated";

export type EnemyId =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13;

export type BattleEnemy = {
  id: EnemyId;
  name: string;
  image: string;
  attackCounter: number;
};

export const battleEnemies = configuredBattleEnemies as Record<EnemyId, BattleEnemy>;

export const NORMAL_BATTLE_ROUNDS = 5;
export type NormalBattleRounds = 5 | 10;

export function formatBattleRoundLabel(round: number, normalRounds: NormalBattleRounds = NORMAL_BATTLE_ROUNDS) {
  return round <= normalRounds
    ? `ROUND ${String(round).padStart(2, "0")}`
    : `ROUND EXTRA ${round - normalRounds}`;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function weightedPick<T>(groups: readonly { weight: number; items: readonly T[] }[]): T {
  const validGroups = groups.filter((group) => group.items.length > 0 && group.weight > 0);
  const total = validGroups.reduce((sum, group) => sum + group.weight, 0);

  let roll = Math.random() * total;

  for (const group of validGroups) {
    roll -= group.weight;

    if (roll <= 0) {
      return pickRandom(group.items);
    }
  }

  return pickRandom(validGroups[validGroups.length - 1].items);
}

function removePicked(ids: readonly EnemyId[], pickedEnemyIds: readonly EnemyId[]) {
  return ids.filter((id) => !pickedEnemyIds.includes(id));
}

export function pickEnemyForRound(
  round: number,
  pickedEnemyIds: EnemyId[],
  normalRounds: NormalBattleRounds = NORMAL_BATTLE_ROUNDS
): BattleEnemy {
  if (round > normalRounds) {
    const pickedExtraId = weightedPick<EnemyId>(
      enemySelectionGroups
        .filter((group) => group.phase === "extra")
        .map((group) => ({
          weight: group.weight,
          items: group.enemyIds as readonly EnemyId[],
        }))
    );

    return battleEnemies[pickedExtraId];
  }

  // Retain the existing first/fifth-round chance stages and the old tenth
  // stage for runs saved before the five-battle change.
  const isChanceRound = [1, 5, normalRounds].includes(round);
  const phase = isChanceRound ? "chance" : "normal";

  const phaseGroups = enemySelectionGroups.filter((group) => group.phase === phase);
  const unusedGroups = phaseGroups
      .map((group) => ({
        weight: group.weight,
        items: removePicked(group.enemyIds as readonly EnemyId[], pickedEnemyIds),
      }));
  // A legacy or malformed history can exhaust every normal candidate. Reuse
  // the same phase's pool in that case, preserving its weights and avoiding
  // an undefined opponent. EXTRA already allows repetition.
  const pickedId = weightedPick<EnemyId>(unusedGroups.some((group) => group.items.length > 0)
    ? unusedGroups
    : phaseGroups.map((group) => ({ weight: group.weight, items: group.enemyIds as readonly EnemyId[] })));

  return battleEnemies[pickedId];
}
