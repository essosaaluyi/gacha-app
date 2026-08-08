// Battle session persistence -- the storage layer only.
//
// Deliberately free of any battle-store imports: the landing page and menu
// call hasSavedBattleSession() just to decide whether to show "Continue
// Battle", and pulling the whole battle engine into those bundles for a
// localStorage read would be wasteful. Snapshot building/restoring lives in
// battleSessionSync.ts, which is only loaded by the battle screen itself.
//
// Expires after 12 hours. Cleared on voluntary quit or full reset.
// Guest mode: stored in localStorage per the existing guest-data contract.

import type { BattleState } from "@/lib/battle-pixi/state/battleStateStore";
import type { BattleMode } from "@/lib/battle-pixi/state/battleModeStore";
import type { EnemyId } from "@/lib/battle-pixi/config/enemyConfig";

const STORAGE_KEY = "battle_session_snapshot";
const EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

export type BattleSessionSnapshot = {
  savedAt: number;
  round: number;
  gameCount: number;
  battleState: BattleState;
  sessionPoints: number;
  enemyAttackCounter: number;
  enemyId: EnemyId | null;
  battleMode: BattleMode;
  /** Index of the active card in the player's deck, so resume keeps deck progress. */
  playerCardIndex: number;
  bonus: {
    active: boolean;
    phase: "opening" | "bonus" | null;
    bonusGamesRemaining: number;
    bonusGamesMax: number;
    bonusTotalPoints: number;
  } | null;
};

export function saveBattleSession(snapshot: BattleSessionSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or unavailable -- silent fail.
  }
}

export function loadBattleSession(): BattleSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const snapshot: BattleSessionSnapshot = JSON.parse(raw);

    if (Date.now() - snapshot.savedAt > EXPIRY_MS) {
      clearBattleSession();
      return null;
    }

    // A finished battle is not resumable.
    if (snapshot.battleState === "gameOver") {
      clearBattleSession();
      return null;
    }

    return snapshot;
  } catch {
    clearBattleSession();
    return null;
  }
}

export function hasSavedBattleSession(): boolean {
  return loadBattleSession() !== null;
}

export function clearBattleSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silent fail.
  }
}
