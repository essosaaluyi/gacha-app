// Drives the "reset chance" indicator (BAR + animated left arrows) shown
// while a bar-event bonus game flips its cards.

export type BarResetTensionMode = "real" | "fake";

let active = false;
let mode: BarResetTensionMode = "real";
let token = 0;

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function showBarResetTension(resetMode: BarResetTensionMode) {
  active = true;
  mode = resetMode;
  token += 1; // lets the overlay restart its animation on repeat events
  notify();
}

export function hideBarResetTension() {
  active = false;
  notify();
}

export function getBarResetTensionState() {
  return { active, mode, token };
}

export function subscribeBarResetTension(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
