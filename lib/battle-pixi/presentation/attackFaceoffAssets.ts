const FACE_OFF_BASE =
  "/images/battle-scenes/attack-faceoffs/character-layers/edited";

const playerFaceoffFiles: Record<string, string> = {
  R1: "player-R1-faceoff-alpha-1920x1080.png",
  R2: "player-R2-faceoff-alpha-1920x1080.png",
  R3: "player-R3-faceoff-alpha-1920x1080.png",
  R4: "player-R4-faceoff-alpha-1920x1080.png",
  SR1: "player-SR1-faceoff-two-hand-horizontal-premium-cel-v4-1920x1080.png",
  SR2: "player-SR2-faceoff-alpha-1920x1080.png",
  SR3: "player-SR3-faceoff-alpha-1920x1080.png",
  SR4: "player-SR4-faceoff-alpha-1920x1080.png",
  SSR1: "player-SSR1-faceoff-alpha-1920x1080.png",
  SSR2: "player-SSR2-faceoff-alpha-1920x1080.png",
  SSR3: "player-SSR3-faceoff-alpha-1920x1080.png",
  SSR4: "player-SSR4-faceoff-alpha-1920x1080.png",
  UR1: "player-UR1-faceoff-alpha-1920x1080.png",
  UR2: "player-UR2-faceoff-alpha-1920x1080.png",
  UR3: "player-UR3-faceoff-premium-cel-ca-1920x1080.png",
};

const enemyFaceoffFiles: Record<number, string> = {
  1: "enemy1-faceoff-alpha-1920x1080.png",
  2: "enemy2-faceoff-alpha-1920x1080.png",
  3: "enemy3-faceoff-alpha-1920x1080.png",
  4: "enemy4-faceoff-premium-cel-ca-1920x1080.png",
  5: "enemy5-faceoff-alpha-1920x1080.png",
  6: "enemy6-faceoff-alpha-1920x1080.png",
  7: "enemy7-faceoff-alpha-1920x1080.png",
  8: "enemy8-faceoff-alpha-1920x1080.png",
  9: "enemy9-faceoff-alpha-1920x1080.png",
  10: "enemy10-faceoff-alpha-1920x1080.png",
  11: "enemy11-faceoff-alpha-1920x1080.png",
  12: "enemy12-faceoff-alpha-1920x1080.png",
  13: "enemy13-faceoff-premium-cel-ca-1920x1080.png",
};

export function getPlayerFaceoffImage(cardId: string | undefined) {
  const normalizedCardId = cardId?.trim().toUpperCase();
  const file = normalizedCardId
    ? playerFaceoffFiles[normalizedCardId]
    : undefined;
  return file ? `${FACE_OFF_BASE}/${file}` : null;
}

export function getEnemyFaceoffImage(enemyId: number | undefined) {
  const file = enemyId === undefined ? undefined : enemyFaceoffFiles[enemyId];
  return file ? `${FACE_OFF_BASE}/${file}` : null;
}
