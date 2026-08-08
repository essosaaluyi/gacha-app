import { beginBattleTease } from "@/lib/battle-pixi/state/battlePresentationFlowStore";

export type BattleCutInTone =
  | "info"
  | "chance"
  | "attack"
  | "danger"
  | "bonus"
  | "rainbow";

export type BattleCutIn = {
  id: number;
  title: string;
  subtitle?: string;
  tone: BattleCutInTone;
  durationMs: number;
  asset?: string;
  variant?: "reveal" | "title" | "interrupt";
};

let activeCutIn: BattleCutIn | null = null;
let nextId = 1;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function getBattleCutIn() {
  return activeCutIn;
}

export function showBattleCutIn(cutIn: Omit<BattleCutIn, "id">) {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  activeCutIn = {
    ...cutIn,
    id: nextId,
  };
  nextId += 1;
  beginBattleTease(cutIn.durationMs, `cut-in:${cutIn.title}`);
  notify();

  clearTimer = setTimeout(() => {
    activeCutIn = null;
    clearTimer = null;
    notify();
  }, cutIn.durationMs);
}

export function hideBattleCutIn() {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  activeCutIn = null;
  notify();
}

export function subscribeBattleCutIn(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);

    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
