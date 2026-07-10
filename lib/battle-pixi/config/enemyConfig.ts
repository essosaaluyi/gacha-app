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

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function weightedPick<T>(groups: readonly { weight: number; items: readonly T[] }[]): T {
  const validGroups = groups.filter((group) => group.items.length > 0);
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
  pickedEnemyIds: EnemyId[]
): BattleEnemy {
  if (round > 10) {
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

  const isChanceRound = [1, 5, 10].includes(round);
  const phase = isChanceRound ? "chance" : "normal";

  const pickedId = weightedPick<EnemyId>(
    enemySelectionGroups
      .filter((group) => group.phase === phase)
      .map((group) => ({
        weight: group.weight,
        items: removePicked(group.enemyIds as readonly EnemyId[], pickedEnemyIds),
      }))
  );

  return battleEnemies[pickedId];
}
