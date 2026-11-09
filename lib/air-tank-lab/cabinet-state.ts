import { createCrackState, repairCrack, triggerCrack } from "@/lib/air-tank-lab/cracks";

export type CabinetTankSignals = { active: boolean; mixing: boolean; tone?: "normal" | "hot"; crackToken?: number };
export function createCabinetState() { return { active: false, mixing: false, hot: false, token: 0, crack: createCrackState() }; }
export type CabinetState = ReturnType<typeof createCabinetState>;
export function applyCabinetSignals(state: CabinetState, next: CabinetTankSignals) {
  const wasActive = state.active;
  const token = Number.isFinite(next.crackToken) && (next.crackToken ?? 0) > 0 ? next.crackToken! : 0;
  state.active = next.active; state.mixing = next.mixing; state.hot = next.tone === "hot";
  if (!next.active || token === 0) repairCrack(state.crack);
  else if (!wasActive || token !== state.token) { repairCrack(state.crack); triggerCrack(state.crack); }
  state.token = next.active ? token : 0;
  return { resetMotion: wasActive && !next.active };
}
