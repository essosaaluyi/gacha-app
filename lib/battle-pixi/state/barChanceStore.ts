import type {
  BarChanceOutcome,
  BarChanceTone,
} from "@/lib/battle-pixi/core/resultLottery";

export type BarChancePhase =
  | "idle"
  | "active"
  | "failure"
  | "success"
  | "distortion"
  | "freeze"
  | "postFreeze";

export type BarChanceScope = "battle" | "bonus";

type BarChanceState = {
  phase: BarChancePhase;
  outcome: BarChanceOutcome | null;
  tone: BarChanceTone;
  scope: BarChanceScope;
  bonusType: "regular" | "super" | "superMax";
  characterImage: string;
  revealedBars: number;
  token: number;
};

const initialState: BarChanceState = {
  phase: "idle",
  outcome: null,
  tone: "blue",
  scope: "battle",
  bonusType: "regular",
  characterImage: "",
  revealedBars: 0,
  token: 0,
};

let state = { ...initialState };
const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function getBarChanceState(): BarChanceState {
  return state;
}

export function startBarChance(options: {
  outcome: BarChanceOutcome;
  tone: BarChanceTone;
  scope: BarChanceScope;
  bonusType?: "regular" | "super" | "superMax";
  characterImage: string;
}) {
  state = {
    phase: "active",
    outcome: options.outcome,
    tone: options.tone,
    scope: options.scope,
    bonusType: options.bonusType ?? "regular",
    characterImage: options.characterImage,
    revealedBars: 0,
    token: state.token + 1,
  };
  notify();
}

export function revealBarChanceSymbol(symbol: "Bar" | "Empty") {
  if (state.phase === "idle" || state.phase === "failure") return state;

  if (symbol === "Empty") {
    state = { ...state, phase: "failure" };
    notify();
    return state;
  }

  const revealedBars = Math.min(3, state.revealedBars + 1);
  state = {
    ...state,
    revealedBars,
    phase:
      state.outcome === "success" && revealedBars === 3
        ? "success"
        : state.phase,
  };
  notify();
  return state;
}

export function beginBarChanceDistortion() {
  if (state.phase !== "success") return;
  state = { ...state, phase: "distortion" };
  notify();
}

export function beginBarChanceFreeze() {
  if (state.phase !== "distortion") return;
  state = { ...state, phase: "freeze" };
  notify();
}

export function finishBarChanceFreeze() {
  if (state.phase !== "freeze") return;
  state = { ...state, phase: "postFreeze" };
  notify();
}

export function clearBarChance() {
  if (state.phase === "idle") return;
  state = {
    ...initialState,
    token: state.token + 1,
  };
  notify();
}

export function subscribeBarChance(listener: () => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}
