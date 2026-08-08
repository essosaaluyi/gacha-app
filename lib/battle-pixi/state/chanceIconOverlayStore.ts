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

  // Pachislot cabinets react as one machine: when something is announced on
  // screen, the surrounding hardware answers. Pick one prop at random so the
  // reaction never looks scripted, and let the shell run the animation.
  if (typeof window !== "undefined") {
    const props = ["led", "statue", "memboard"] as const;
    window.dispatchEvent(
      new CustomEvent("battle:cabinet-react", {
        detail: { prop: props[Math.floor(Math.random() * props.length)] },
      })
    );
  }

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
