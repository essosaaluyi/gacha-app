let enemyAttackModeTurnsLeft = 0;
let enemyAttackModeTotalTurns = 0;
let playerCountered = false;
let playerResetEnemyAttack = false;

const listeners: (() => void)[] = [];

export function isEnemyAttackModeActive() {
  return enemyAttackModeTurnsLeft > 0;
}

export function getEnemyAttackModeTurnsLeft() {
  return enemyAttackModeTurnsLeft;
}

export function startEnemyAttackMode() {
  enemyAttackModeTurnsLeft = 3;
  enemyAttackModeTotalTurns = 3;
  playerCountered = false;
  playerResetEnemyAttack = false;

  listeners.forEach((listener) => listener());
}

export function registerPlayerCounter() {
  if (!isEnemyAttackModeActive()) return;
  playerCountered = true;
}

export function registerEnemyAttackReset() {
  if (!isEnemyAttackModeActive()) return;
  playerResetEnemyAttack = true;
}

export function consumeEnemyAttackModeTurn() {
  if (!isEnemyAttackModeActive()) return null;

  const turnNumber =
    enemyAttackModeTotalTurns - enemyAttackModeTurnsLeft + 1;

  enemyAttackModeTurnsLeft -= 1;

  const finished = enemyAttackModeTurnsLeft <= 0;

  const result = {
    turnNumber,
    finished,
    playerCountered,
    playerResetEnemyAttack,
  };

  listeners.forEach((listener) => listener());

  return result;
}
