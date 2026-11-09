import type { BattleResult } from "../core/resultLottery";
import type { FatalPlan } from "./fatalPresentationStore";

export type PendingBattleHand = {
  version: 1;
  enemyKey: string;
  playerIndex: number | null;
  result: BattleResult;
  phase: "set" | "dealing" | "reveal";
  settledSlots: boolean[];
  enemyDefeat: FatalPlan["enemyDefeat"];
  struggleWinner: "player" | "enemy" | null;
  struggleCast?: { playerImage: string; playerName: string; enemyImage: string; enemyName: string };
};
let pending: PendingBattleHand | null = null;
export function getPendingBattleHand() { return pending; }
export function savePendingBattleHand(value: PendingBattleHand) { pending = structuredClone(value); }
export function clearPendingBattleHand() { pending = null; }
export function restorePendingBattleHand(value?: PendingBattleHand | null) {
  pending = value?.version === 1 && value.result?.cards?.length === 3 ? structuredClone(value) : null;
  // Interrupted outward motion restarts from the already-paid stable holder.
  if (pending?.phase === "dealing") pending.phase = "set";
}
