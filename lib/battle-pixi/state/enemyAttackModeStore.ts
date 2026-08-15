import { patchConfig } from "@/lib/game-config/patchConfig";

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
  // Read at arm time, not module load, so an admin change applies to the next
  // window without a reload.
  const turns = Math.max(1, Math.round(patchConfig.fatalMode.enemyWindowTurns));

  enemyAttackModeTurnsLeft = turns;
  enemyAttackModeTotalTurns = turns;
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

export function resetEnemyAttackMode() {
  enemyAttackModeTurnsLeft = 0;
  enemyAttackModeTotalTurns = 0;
  playerCountered = false;
  playerResetEnemyAttack = false;
  listeners.forEach((listener) => listener());
}
