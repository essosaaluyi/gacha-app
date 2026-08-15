import { cabinetSignalConfig } from "@/lib/game-config/cabinetSignalConfig";

type BarProgressionState = {
  boostedGamesRemaining: number;
  pendingUr1Boost: boolean;
  bonusStock: number;
};

let state: BarProgressionState = {
  boostedGamesRemaining: 0,
  pendingUr1Boost: false,
  bonusStock: 0,
};

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function getBarProgressionState() {
  return state;
}

export function scheduleUr1BoostAfterCollection() {
  state = { ...state, pendingUr1Boost: true };
  notify();
}

export function terminateActiveBarBoost() {
  if (state.boostedGamesRemaining === 0) return;
  state = { ...state, boostedGamesRemaining: 0 };
  notify();
}

export function settleProgressionAfterCollection() {
  if (state.bonusStock > 0 || !state.pendingUr1Boost) return;
  state = {
    ...state,
    pendingUr1Boost: false,
    boostedGamesRemaining: cabinetSignalConfig.barBoost.games,
  };
  notify();
}

export function consumeBarBoostGame() {
  if (state.boostedGamesRemaining <= 0) return null;
  state = {
    ...state,
    boostedGamesRemaining: state.boostedGamesRemaining - 1,
  };
  notify();
  return {
    successChance: cabinetSignalConfig.barBoost.successChance,
    fakeChance: cabinetSignalConfig.barBoost.fakeChance,
  };
}

export function addBonusStock(count = 1) {
  state = { ...state, bonusStock: state.bonusStock + Math.max(0, count) };
  notify();
}

export function hasBonusStock() {
  return state.bonusStock > 0;
}

export function consumeBonusStock() {
  if (state.bonusStock <= 0) return false;
  state = { ...state, bonusStock: state.bonusStock - 1 };
  notify();
  return true;
}

export function resetBarProgression() {
  state = {
    boostedGamesRemaining: 0,
    pendingUr1Boost: false,
    bonusStock: 0,
  };
  notify();
}

export function restoreBarProgression(snapshot?: Partial<BarProgressionState>) {
  state = {
    boostedGamesRemaining: Math.max(0, snapshot?.boostedGamesRemaining ?? 0),
    pendingUr1Boost: Boolean(snapshot?.pendingUr1Boost),
    bonusStock: Math.max(0, snapshot?.bonusStock ?? 0),
  };
  notify();
}

export function subscribeBarProgression(listener: () => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}
