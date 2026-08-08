// Coarse "which section owns the machine right now" register.
//
// This is deliberately separate from battlePresentationFlowStore: that store
// tracks fine-grained beats within a section (draw_reveal, tease, ...) and is
// what gates the draw button. This one answers the blunter question a real
// cabinet asks — normal game, bonus, or the pick zone — and exactly one section
// may own the screen and the sound channel at a time.
//
// Sections must not bleed into each other: a cue or a layer belonging to a
// section that is not the current owner is suppressed rather than stacked.

export type BattleMode = "battle" | "bonus" | "collection";

export type BattleModeState = {
  mode: BattleMode;
  reason: string;
};

let state: BattleModeState = { mode: "battle", reason: "init" };
const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function getBattleMode() {
  return state.mode;
}

export function getBattleModeState() {
  return state;
}

export function setBattleMode(mode: BattleMode, reason: string = mode) {
  if (state.mode === mode) return;
  state = { mode, reason };
  notify();
}

export function isBattleMode(mode: BattleMode) {
  return state.mode === mode;
}

export function resetBattleMode() {
  state = { mode: "battle", reason: "reset" };
  notify();
}

export function subscribeBattleMode(listener: () => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}
