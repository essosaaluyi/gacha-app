import { playSfx } from "@/lib/audio/sfxStore";

let visible = false;
let overlayKey = 0;
let dismissed = [false, false, false];

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function getChanceIconOverlayState() {
  return {
    visible,
    overlayKey,
    dismissed,
  };
}

export function rollChanceIconOverlay(hasChanceCard: boolean) {
  if (!hasChanceCard || Math.random() >= 0.5) {
    hideChanceIconOverlay();
    return;
  }

  visible = true;
  dismissed = [false, false, false];
  overlayKey += 1;
  playSfx("chanceIcon");

  notify();
}

export function dismissChanceIcon(index: number) {
  if (!visible || index < 0 || index > 2 || dismissed[index]) return;

  dismissed = dismissed.map((value, i) => (i === index ? true : value));
  notify();
}

export function hideChanceIconOverlay() {
  if (!visible) return;

  visible = false;
  dismissed = [false, false, false];
  notify();
}

export function subscribeChanceIconOverlay(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);

    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
