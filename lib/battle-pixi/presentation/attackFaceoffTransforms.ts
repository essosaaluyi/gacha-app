export type AttackFaceoffTransform = {
  x: number;
  y: number;
  scale: number;
  winnerX: number;
};

const PLAYER_DEFAULT_TRANSFORM: AttackFaceoffTransform = {
  x: -1.5,
  y: 17,
  scale: 1.17,
  winnerX: 11,
};

const PLAYER_RIGHT_ADJUSTED_TRANSFORM: AttackFaceoffTransform = {
  ...PLAYER_DEFAULT_TRANSFORM,
  x: 6.5,
};

const ENEMY_DEFAULT_TRANSFORM: AttackFaceoffTransform = {
  x: 26.5,
  y: 5,
  scale: 1.04,
  winnerX: 14,
};

export const playerAttackFaceoffTransforms: Record<
  string,
  AttackFaceoffTransform
> = {
  R1: PLAYER_RIGHT_ADJUSTED_TRANSFORM,
  R2: PLAYER_RIGHT_ADJUSTED_TRANSFORM,
  R4: PLAYER_DEFAULT_TRANSFORM,
  SR2: PLAYER_RIGHT_ADJUSTED_TRANSFORM,
  UR2: PLAYER_RIGHT_ADJUSTED_TRANSFORM,
  UR3: PLAYER_RIGHT_ADJUSTED_TRANSFORM,
};

export const enemyAttackFaceoffTransforms: Record<
  number,
  AttackFaceoffTransform
> = {
  1: ENEMY_DEFAULT_TRANSFORM,
};

export function getPlayerAttackFaceoffTransform(image: string) {
  const match = image.match(/player-(R\d+|SR\d+|SSR\d+|UR\d+)-faceoff/i);
  const cardId = match?.[1]?.toUpperCase();
  return cardId
    ? playerAttackFaceoffTransforms[cardId] ?? PLAYER_DEFAULT_TRANSFORM
    : PLAYER_DEFAULT_TRANSFORM;
}

export function getEnemyAttackFaceoffTransform(image: string) {
  const match = image.match(/enemy(\d+)-faceoff/i);
  const enemyId = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(enemyId)
    ? enemyAttackFaceoffTransforms[enemyId] ?? ENEMY_DEFAULT_TRANSFORM
    : ENEMY_DEFAULT_TRANSFORM;
}
