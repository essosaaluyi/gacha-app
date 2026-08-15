import { cabinetSignalConfig } from "@/lib/game-config/cabinetSignalConfig";
import type { BattleCardSymbol } from "@/lib/battle-pixi/core/resultLottery";

export type CabinetSignalTone =
  | "white"
  | "blue"
  | "green"
  | "red"
  | "gold";

export type CabinetBlackoutKind = "fatal" | "super" | "superMax";
export type CabinetProgressPoint =
  | "set"
  | "release"
  | "flip1"
  | "flip2"
  | "flip3";

export type CabinetPulse = {
  token: number;
  tone: "white" | "gold";
  durationMs: number;
  pulses: number;
  mode: "light" | "onOff";
};

type CabinetSignalState = {
  memoryPulse: CabinetPulse | null;
  lowerPulse: CabinetPulse | null;
  chanceSweepToken: number;
  chanceSweepActive: boolean;
  chanceSweepEndsAt: number;
  statueTone: CabinetSignalTone | null;
  statueToken: number;
  blackout: CabinetBlackoutKind | null;
};

const initialState: CabinetSignalState = {
  memoryPulse: null,
  lowerPulse: null,
  chanceSweepToken: 0,
  chanceSweepActive: false,
  chanceSweepEndsAt: 0,
  statueTone: null,
  statueToken: 0,
  blackout: null,
};

let state = { ...initialState };
let pulseToken = 0;
let memoryPulseTimer: ReturnType<typeof setTimeout> | null = null;
let lowerPulseTimer: ReturnType<typeof setTimeout> | null = null;
let sweepTimer: ReturnType<typeof setTimeout> | null = null;
let delayedDefeatTimer: ReturnType<typeof setTimeout> | null = null;
let delayedBlackoutTimer: ReturnType<typeof setTimeout> | null = null;
const listeners: (() => void)[] = [];

type FatalPlan = {
  blackoutPoint: CabinetProgressPoint | null;
  flashPlayed: boolean;
};

let fatalPlan: FatalPlan | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
  if (timer !== null) clearTimeout(timer);
}

function chooseWeightedTone(
  weights: Readonly<Record<"blue" | "green" | "red", number>>
): "blue" | "green" | "red" {
  const roll = Math.random() * (weights.blue + weights.green + weights.red);
  if (roll < weights.blue) return "blue";
  if (roll < weights.blue + weights.green) return "green";
  return "red";
}

function setMemoryPulse(pulse: Omit<CabinetPulse, "token"> | null) {
  clearTimer(memoryPulseTimer);
  memoryPulseTimer = null;
  state = {
    ...state,
    memoryPulse: pulse ? { ...pulse, token: ++pulseToken } : null,
  };
  notify();

  if (pulse) {
    memoryPulseTimer = setTimeout(() => {
      memoryPulseTimer = null;
      state = { ...state, memoryPulse: null };
      notify();
    }, pulse.durationMs);
  }
}

function setLowerPulse(pulse: Omit<CabinetPulse, "token"> | null) {
  clearTimer(lowerPulseTimer);
  lowerPulseTimer = null;
  state = {
    ...state,
    lowerPulse: pulse ? { ...pulse, token: ++pulseToken } : null,
  };
  notify();

  if (pulse) {
    lowerPulseTimer = setTimeout(() => {
      lowerPulseTimer = null;
      state = { ...state, lowerPulse: null };
      notify();
    }, pulse.durationMs);
  }
}

function panelsAreBlack() {
  return state.blackout !== null;
}

function allSignalsSuppressed() {
  return state.blackout === "super" || state.blackout === "superMax";
}

function stopChanceSweep() {
  clearTimer(sweepTimer);
  sweepTimer = null;
  if (!state.chanceSweepActive) return;
  state = {
    ...state,
    chanceSweepActive: false,
    chanceSweepEndsAt: 0,
  };
  notify();
}

function startStatueSignal(tone: CabinetSignalTone) {
  if (allSignalsSuppressed()) return;
  state = {
    ...state,
    statueTone: tone,
    statueToken: state.statueToken + 1,
  };
  notify();
}

function pulseBothPanels() {
  const pulse = {
    tone: "white" as const,
    durationMs: cabinetSignalConfig.fatalFlash.durationMs,
    pulses: cabinetSignalConfig.fatalFlash.pulses,
    mode: "onOff" as const,
  };
  setMemoryPulse(pulse);
  setLowerPulse(pulse);
}

function startBlackout(kind: CabinetBlackoutKind) {
  clearTimer(delayedBlackoutTimer);
  delayedBlackoutTimer = null;
  stopChanceSweep();
  setMemoryPulse(null);
  setLowerPulse(null);
  state = {
    ...state,
    blackout: kind,
    statueTone:
      kind === "super" || kind === "superMax" ? null : state.statueTone,
  };
  notify();
}

export function getCabinetSignalState() {
  return state;
}

export function beginCabinetDrawSignals(options: {
  cards: BattleCardSymbol[];
  result: string;
  barChance: boolean;
}) {
  restoreSuperMaxBlackoutOnDraw();

  const chanceCount = options.cards.filter((card) => card === "Chance").length;
  const chanceWaitMs = 0;
  const drawFlashSelected =
    Math.random() < cabinetSignalConfig.drawFlash.chance;

  if (!panelsAreBlack() && chanceCount > 0) {
    if (drawFlashSelected) {
      setMemoryPulse({
        tone: "white",
        durationMs: cabinetSignalConfig.drawFlash.durationMs,
        pulses: cabinetSignalConfig.drawFlash.pulses,
        mode: "light",
      });
    }
  } else if (
    !panelsAreBlack() &&
    drawFlashSelected
  ) {
    setMemoryPulse({
      tone: "white",
      durationMs: cabinetSignalConfig.drawFlash.durationMs,
      pulses: cabinetSignalConfig.drawFlash.pulses,
      mode: "light",
    });
  }

  // BAR CHANCE expectation colors remain confined to the LCD. Cabinet color
  // joins only after a successful third BAR, via the dedicated success strobe.
  if (!options.barChance && !allSignalsSuppressed()) {
    if (
      chanceCount > 0 &&
      Math.random() < cabinetSignalConfig.statue.chanceSignalChance
    ) {
      const weights =
        cabinetSignalConfig.statue.chanceToneWeights[
          Math.min(3, chanceCount) as 1 | 2 | 3
        ];
      startStatueSignal(chooseWeightedTone(weights));
    } else if (
      options.result === "Empty" &&
      Math.random() < cabinetSignalConfig.statue.emptyFakeChance
    ) {
      startStatueSignal("white");
    }
  }

  return { chanceWaitMs };
}

export function clearCabinetTurnSignals() {
  if (state.statueTone === null) return;
  state = { ...state, statueTone: null };
  notify();
}

export function armFatalWinCabinetSignal() {
  const points: CabinetProgressPoint[] = [
    "set",
    "release",
    "flip1",
    "flip2",
    "flip3",
  ];
  const blackoutPoint =
    Math.random() < cabinetSignalConfig.fatalBlackout.chancePerWinningTurn
      ? points[Math.floor(Math.random() * points.length)]
      : null;
  fatalPlan = { blackoutPoint, flashPlayed: false };
}

export function notifyCabinetProgress(point: CabinetProgressPoint) {
  if (!fatalPlan) return;

  const isRelease = point === "release";
  const sameActionBlackout = fatalPlan.blackoutPoint === point;

  if (isRelease && !panelsAreBlack()) {
    if (state.statueTone !== null) {
      state = { ...state, statueTone: null };
      notify();
    }
    pulseBothPanels();
    fatalPlan.flashPlayed = true;
  }

  if (!sameActionBlackout || panelsAreBlack()) return;

  if (isRelease && fatalPlan.flashPlayed) {
    clearTimer(delayedBlackoutTimer);
    delayedBlackoutTimer = setTimeout(() => {
      delayedBlackoutTimer = null;
      startBlackout("fatal");
    }, cabinetSignalConfig.fatalFlash.durationMs);
    return;
  }

  startBlackout("fatal");
}

export function notifyEnemyDefeatResult() {
  if (fatalPlan?.flashPlayed || panelsAreBlack()) return;

  const play = () => {
    delayedDefeatTimer = null;
    if (!panelsAreBlack()) pulseBothPanels();
  };
  const waitMs = Math.max(0, state.chanceSweepEndsAt - Date.now());
  clearTimer(delayedDefeatTimer);
  delayedDefeatTimer = waitMs > 0 ? setTimeout(play, waitMs) : null;
  if (waitMs === 0) play();
}

export function notifyBonusOpeningStarted() {
  const wasSuperMax = state.blackout === "superMax";
  if (!wasSuperMax) {
    state = { ...state, blackout: null, statueTone: null };
    notify();
    const pulse = {
      tone: "white" as const,
      durationMs: cabinetSignalConfig.bonusConfirmation.durationMs,
      pulses: cabinetSignalConfig.bonusConfirmation.pulses,
      mode: "onOff" as const,
    };
    setMemoryPulse(pulse);
    setLowerPulse(pulse);
  }
  fatalPlan = null;
}

export function beginSuperBonusBlackout() {
  startBlackout("super");
}

export function finishSuperBonusBlackout() {
  if (state.blackout !== "super") return;
  state = { ...state, blackout: null };
  notify();
}

export function beginSuperMaxBlackout() {
  startBlackout("superMax");
}

export function restoreSuperMaxBlackoutOnDraw() {
  if (state.blackout !== "superMax") return false;
  state = { ...state, blackout: null };
  notify();
  return true;
}

export function clearCabinetSignals() {
  clearTimer(memoryPulseTimer);
  clearTimer(lowerPulseTimer);
  clearTimer(sweepTimer);
  clearTimer(delayedDefeatTimer);
  clearTimer(delayedBlackoutTimer);
  memoryPulseTimer = null;
  lowerPulseTimer = null;
  sweepTimer = null;
  delayedDefeatTimer = null;
  delayedBlackoutTimer = null;
  fatalPlan = null;
  state = { ...initialState };
  notify();
}

export function subscribeCabinetSignals(listener: () => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}
