export type BattlePresentationPhase =
  | "round_intro"
  | "draw_reveal"
  | "tease"
  | "bonus_video"
  | "bonus_result"
  | "collection"
  | "next_round_ready"
  | "defeat"
  | "game_over";

export type BattlePresentationFlowState = {
  phase: BattlePresentationPhase;
  reason: string;
};

let state: BattlePresentationFlowState = {
  phase: "round_intro",
  reason: "battle-reset",
};
let teaseTimer: ReturnType<typeof setTimeout> | null = null;
const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

function clearTeaseTimer() {
  if (!teaseTimer) return;
  clearTimeout(teaseTimer);
  teaseTimer = null;
}

export function getBattlePresentationFlow() {
  return state;
}

export function setBattlePresentationPhase(
  phase: BattlePresentationPhase,
  reason: string = phase
) {
  clearTeaseTimer();
  state = { phase, reason };
  notify();
}

export function beginBattleTease(durationMs: number, reason: string) {
  clearTeaseTimer();
  state = { phase: "tease", reason };
  notify();

  teaseTimer = setTimeout(() => {
    teaseTimer = null;
    state = { phase: "next_round_ready", reason: `${reason}-complete` };
    notify();
  }, durationMs);
}

export function canRequestBattleDraw() {
  return state.phase === "next_round_ready";
}

export function isBattlePresentationLocked() {
  return !canRequestBattleDraw();
}

export function resetBattlePresentationFlow() {
  setBattlePresentationPhase("round_intro", "battle-reset");
}

export function subscribeBattlePresentationFlow(listener: () => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}
