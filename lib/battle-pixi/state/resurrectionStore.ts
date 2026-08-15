// Feature 3: resurrection (reversal) reveal.
// When the "none" fakeout path hides a predetermined WIN, the win is
// revealed pachislo-style: the current game reads as a total failure,
// the next game starts normally, then mid-game the screen cracks and
// the winning title appears.
//
//   idle → armed          hidden SUCCESS; current game presented as failure
//   armed → glitchPending next draw begins and looks completely normal
//   glitchPending → revealing  after the reveal delay, the crack fires
//   revealing → idle      overlay finishes → caller starts Fatal Mode

import { logEvent } from "@/lib/events/gameEventStore";

export type ResurrectionPhase =
  | "idle"
  | "armed"
  | "glitchPending"
  | "revealing";

let phase: ResurrectionPhase = "idle";

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function getResurrectionPhase() {
  return phase;
}

export function isResurrectionArmed() {
  return phase === "armed";
}

export function isResurrectionGlitchPending() {
  return phase === "glitchPending";
}

export function armResurrection() {
  phase = "armed";
  logEvent({ kind: "resurrectionArmed", detail: {} });
  notify();
}

export function promoteResurrectionToGlitchPending() {
  if (phase !== "armed") return;
  phase = "glitchPending";
  notify();
}

export function triggerResurrectionReveal() {
  if (phase !== "glitchPending") return;
  phase = "revealing";
  logEvent({ kind: "resurrectionReveal", detail: {} });
  notify();
}

/** Called by the overlay when its animation completes. */
export function finishResurrectionReveal() {
  if (phase !== "revealing") return;
  phase = "idle";
  notify();
}

export function clearResurrection() {
  phase = "idle";
  notify();
}

export function subscribeResurrection(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
