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
  summon: BattleSummonState;
};

export type BattleSummonState = {
  enemyKey: string | null;
  enemy: "waiting" | "summoning" | "ready";
  enemyStartedAt: number | null;
  playerIndex: number | null;
  player: "absent" | "summoning" | "ready";
  playerStartedAt: number | null;
};

function emptySummonState(): BattleSummonState {
  return { enemyKey: null, enemy: "waiting", enemyStartedAt: null,
    playerIndex: null, player: "absent", playerStartedAt: null };
}

let state: BattlePresentationFlowState = {
  phase: "round_intro",
  reason: "battle-reset",
  summon: emptySummonState(),
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
  state = { ...state, phase, reason };
  notify();
}

export function beginBattleTease(durationMs: number, reason: string) {
  clearTeaseTimer();
  state = { ...state, phase: "tease", reason };
  notify();

  teaseTimer = setTimeout(() => {
    teaseTimer = null;
    state = { ...state, phase: "next_round_ready", reason: `${reason}-complete` };
    notify();
  }, durationMs);
}

export function canRequestBattleDraw() {
  return state.phase === "next_round_ready" && areBattleSummonsReady();
}

export function areBattleSummonsReady() {
  return state.summon.enemy === "ready" && state.summon.player === "ready";
}

export function prepareEnemySummon(enemyKey: string) {
  if (state.summon.enemyKey === enemyKey) return;
  state = { ...state, summon: { ...state.summon, enemyKey, enemy: "waiting", enemyStartedAt: null } };
  notify();
}

export function startEnemySummon() {
  if (!state.summon.enemyKey || state.summon.enemy !== "waiting") return;
  state = { ...state, summon: { ...state.summon, enemy: "summoning", enemyStartedAt: Date.now() } };
  notify();
}

export function preparePlayerSummon(index: number) {
  if (state.summon.playerIndex === index && state.summon.player !== "absent") return;
  clearTeaseTimer();
  state = { ...state, phase: "round_intro", reason: "player-summon",
    summon: { ...state.summon, playerIndex: index, player: "summoning", playerStartedAt: Date.now() } };
  notify();
}

export function clearPlayerSummon() {
  state = { ...state, summon: { ...state.summon, playerIndex: null, player: "absent", playerStartedAt: null } };
  notify();
}

export function completeBattleSummon(side: "enemy" | "player", identity: string | number) {
  const summon = state.summon;
  if (side === "enemy" ? summon.enemyKey !== identity || summon.enemy !== "summoning"
    : summon.playerIndex !== identity || summon.player !== "summoning") return;
  state = { ...state, summon: { ...summon, [side]: "ready" } };
  if (areBattleSummonsReady() && state.phase === "round_intro") {
    state = { ...state, phase: "next_round_ready", reason: "summons-complete" };
  }
  notify();
}

export function restoreBattleSummons(enemyKey: string, playerIndex: number | null) {
  state = { ...state, summon: { enemyKey, enemy: "ready", enemyStartedAt: null,
    playerIndex, player: playerIndex === null ? "absent" : "ready", playerStartedAt: null } };
  notify();
}

export function isBattlePresentationLocked() {
  return !canRequestBattleDraw();
}

export function resetBattlePresentationFlow() {
  state = { ...state, summon: emptySummonState() };
  setBattlePresentationPhase("round_intro", "battle-reset");
}

export function subscribeBattlePresentationFlow(listener: () => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}
