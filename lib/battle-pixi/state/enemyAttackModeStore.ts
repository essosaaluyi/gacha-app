import { patchConfig } from "@/lib/game-config/patchConfig";
import type { DefenseShieldResolution } from "./defenseShieldStore";

export type EnemyFatalSnapshot = {
  active: boolean;
  turns: number;
  version?: 2;
  turnsLeft?: number;
  totalTurns?: number;
  playerCountered?: boolean;
  playerResetEnemyAttack?: boolean;
  shield?: DefenseShieldResolution | null;
  resolutionPending?: boolean;
};
let turnsLeft = 0;
let totalTurns = 0;
let playerCountered = false;
let playerResetEnemyAttack = false;
let shield: DefenseShieldResolution | null = null;
let resolutionPending = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
export function isEnemyAttackModeActive() { return turnsLeft > 0 || resolutionPending; }
export function getEnemyAttackModeTurnsLeft() { return turnsLeft; }
export function startEnemyAttackMode() {
  if (isEnemyAttackModeActive()) return;
  turnsLeft = totalTurns = Math.max(1, Math.round(patchConfig.fatalMode.enemyWindowTurns));
  playerCountered = playerResetEnemyAttack = resolutionPending = false;
  shield = null;
  notify();
}
export function registerPlayerCounter() {
  if (isEnemyAttackModeActive()) playerCountered = true;
}
export function registerEnemyAttackReset() {
  if (isEnemyAttackModeActive()) playerResetEnemyAttack = true;
}
export function getEnemyFatalShieldResolution() { return shield; }
export function holdEnemyFatalShieldResolution(value: DefenseShieldResolution | null) {
  if (!shield && value) shield = { ...value };
}
export function consumeEnemyAttackModeTurn() {
  if (turnsLeft <= 0) return null;
  const turnNumber = totalTurns - turnsLeft + 1;
  turnsLeft -= 1;
  resolutionPending = turnsLeft <= 0;
  notify();
  return { turnNumber, finished: resolutionPending, playerCountered, playerResetEnemyAttack };
}
export function getEnemyFatalSnapshot(): EnemyFatalSnapshot {
  return { version: 2, active: isEnemyAttackModeActive(), turns: totalTurns - turnsLeft,
    turnsLeft, totalTurns, playerCountered, playerResetEnemyAttack, shield, resolutionPending };
}
export function restoreEnemyFatal(snapshot?: EnemyFatalSnapshot) {
  // Versionless snapshots came from the superseded persistent-pressure change.
  // Zero counter is an idle entry opportunity, never an implicit attack window.
  if (snapshot?.version !== 2) { resetEnemyAttackMode(); return; }
  totalTurns = Math.max(0, Math.floor(snapshot.totalTurns ?? 0));
  turnsLeft = Math.max(0, Math.min(totalTurns, Math.floor(snapshot.turnsLeft ?? 0)));
  playerCountered = snapshot.playerCountered === true;
  playerResetEnemyAttack = snapshot.playerResetEnemyAttack === true;
  shield = snapshot.shield ? { ...snapshot.shield } : null;
  resolutionPending = snapshot.resolutionPending === true;
  notify();
}
export function resetEnemyAttackMode() {
  turnsLeft = totalTurns = 0;
  playerCountered = playerResetEnemyAttack = resolutionPending = false;
  shield = null; notify();
}
export function subscribeEnemyAttackMode(listener: () => void) {
  listeners.add(listener); return () => { listeners.delete(listener); };
}
