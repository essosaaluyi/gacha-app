import type { DefenseShieldResolution, DefenseShieldGrade } from "./defenseShieldStore";
import type { BattleResult } from "../core/resultLottery";

export type FatalPlan = {
  id: string;
  enemyKey: string;
  playerIndex: number | null;
  enemy: { attack: boolean; tease: boolean; shield: DefenseShieldResolution | null;
    kind?: "entry" | "window" | "resolution"; survived?: boolean; entered?: boolean } | null;
  playerAttack: boolean;
  enemyDefeat: {
    presentation: "default" | "barChance";
    forcedBonusType: "regular" | "super" | "superMax" | null;
  } | null;
  result?: BattleResult;
  settledSlots?: boolean[];
  tripleDefenseGrade?: DefenseShieldGrade | null;
};
type State = { plan: FatalPlan | null; phase: "idle" | "anticipation" | "warning" | "attack"; stops: 0 | 1 | 2 | 3 };
let state: State = { plan: null, phase: "idle", stops: 0 };
const listeners = new Set<() => void>();
const publish = () => listeners.forEach(listener => listener());
export function getFatalPresentation() { return state; }
export function isFatalPresentationResolving() { return state.phase === "warning" || state.phase === "attack"; }
export function commitFatalPlan(plan: FatalPlan) {
  // Duplicate notifications cannot replace this paid game's RNG.
  if (state.plan) return false;
  const stops = Math.min(3, plan.settledSlots?.filter(Boolean).length ?? 0) as State["stops"];
  state = { plan: structuredClone(plan), phase: "anticipation", stops }; publish();
  return true;
}
export function setFatalStops(stops: 0 | 1 | 2 | 3, settledSlots?: boolean[]) {
  if (!state.plan || stops <= state.stops) return;
  state = { ...state, stops, plan: settledSlots ? { ...state.plan, settledSlots: [...settledSlots] } : state.plan }; publish();
}
export function setFatalPresentationPhase(phase: State["phase"]) {
  if (!state.plan) return;
  state = { ...state, phase }; publish();
}
/** Claim before effects so duplicate third-stop callbacks cannot damage twice. */
export function takeFatalPlan(id: string) {
  if (state.plan?.id !== id) return null;
  const plan = state.plan;
  state = { plan: null, phase: "idle", stops: 0 }; publish();
  return plan;
}
export function clearFatalPresentation() {
  state = { plan: null, phase: "idle", stops: 0 }; publish();
}
export function restoreFatalPresentation(plan?: FatalPlan | null) {
  clearFatalPresentation();
  if (plan) commitFatalPlan(plan);
}
export function subscribeFatalPresentation(listener: () => void) {
  listeners.add(listener); return () => { listeners.delete(listener); };
}
