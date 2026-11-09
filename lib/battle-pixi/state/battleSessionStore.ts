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
import type { DefenseShieldGrade } from "@/lib/battle-pixi/state/defenseShieldStore";
import type { PlayerWinRateSnapshot } from "@/lib/battle-pixi/state/playerWinRateStore";
import type { PlayerBattleHandSnapshot } from "@/lib/battle-pixi/state/playerBattleCardStore";
import type { BattleEnemyProgressionSnapshot } from "@/lib/battle-pixi/state/currentEnemyStore";
import type { FatalPlan } from "./fatalPresentationStore";
import type { EnemyFatalSnapshot } from "./enemyAttackModeStore";
import type { PendingBattleHand } from "./pendingBattleHandStore";
import { parseFatalPreview } from "../core/enemyFatalRoll";

function isIsolatedFatalPreview() {
  return typeof window !== "undefined" && parseFatalPreview(process.env.NODE_ENV === "production",
    new URLSearchParams(window.location?.search).get("fatal-preview")) !== null;
}

const STORAGE_KEY = "battle_session_snapshot";
const EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

export type BattleSessionSnapshot = {
  savedAt: number;
  round: number;
  gameCount: number;
  battleState: BattleState;
  sessionPoints: number;
  enemyAttackCounter: number;
  enemyFatal?: EnemyFatalSnapshot;
  playerFatal?: { gamesLeft: number; totalGames: number; hit: boolean; guaranteedBonusType?: "regular" | "super" | "superMax" | null };
  fatalPlan?: FatalPlan | null;
  pendingHand?: PendingBattleHand | null;
  chancePoints?: import("./chancePointsRevealStore").ChancePointsRevealState;
  bonusPresentation?: ReturnType<typeof import("./bonusPresentationStore").getBonusPresentationSnapshot>;
  nestedBonus?: ReturnType<typeof import("./nestedBonusStore").getNestedBonusSnapshot>;
  classicBonus?: ReturnType<typeof import("./bonusModeStore").getClassicBonusSnapshot>;
  attackFakeout?: import("./attackFakeoutStore").AttackFakeoutState;
  lastOutcome?: import("../core/resultLottery").BattleOutcome|null;
  enemyId: EnemyId | null;
  enemyProgression?: BattleEnemyProgressionSnapshot;
  battleMode: BattleMode;
  /** Index of the active card in the player's deck, so resume keeps deck progress. */
  playerCardIndex: number | null;
  playerHand?: PlayerBattleHandSnapshot;
  playerWinRate?: PlayerWinRateSnapshot | null;
  barProgression?: {
    boostedGamesRemaining: number;
    pendingUr1Boost: boolean;
    bonusStock: number;
  };
  defenseShield?: {
    grade: DefenseShieldGrade;
    round: number;
  } | null;
  bonus: {
    active: boolean;
    phase: "opening" | "bonus" | null;
    bonusGamesRemaining: number;
    bonusGamesMax: number;
    bonusTotalPoints: number;
  } | null;
};

export function saveBattleSession(snapshot: BattleSessionSnapshot) {
  if (isIsolatedFatalPreview()) return;
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
  if (isIsolatedFatalPreview()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silent fail.
  }
}
