// PROVISIONAL — see slotFxStore.ts.
//
// The Fatal Mode judge: the last draw of the player's Fatal Mode, staged as a
// slot machine stages its deciding button press.
//
//   intro   "DESTINY JUDGE" flies at the screen letter by letter, then lands
//           across the whole screen.
//   prompt  the card dispenser alone on the screen, "DRAW!!!" and looping pull
//           arrows, until the draw is pressed.
//   pulled  the draw is pressed; the screen holds its breath until the cards
//           have told the result.
//   fail    the screen cracks and goes black.
//   success the freeze movie.
//
// Presentation only. It never decides or delays anything, and it never locks
// the cabinet: a draw pressed during the intro simply cuts ahead.

import { SLOT_FX } from "./slotFxStore";

export type SlotJudgePhase = "idle" | "intro" | "prompt" | "pulled" | "fail" | "success";
export type SlotJudge = { phase: SlotJudgePhase; key: number };

/** Letters in, landing, and the hold on the full-screen title. */
export const JUDGE_INTRO_MS = 3500;
/** Crack, shards, black, and back. */
export const JUDGE_FAIL_MS = 2500;
export const JUDGE_FREEZE_MOVIE = "/videos/openings/freeze.mp4";

let state: SlotJudge = { phase: "idle", key: 0 };
const listeners = new Set<() => void>();

function set(phase: SlotJudgePhase, fresh = false) {
  state = { phase, key: fresh ? state.key + 1 : state.key };
  listeners.forEach((listener) => listener());
}

export function startSlotJudge() {
  if (!SLOT_FX.enabled || !SLOT_FX.judge) return;
  set("intro", true);
}

/** The title has had its time: on to the dispenser. */
export function promptSlotJudge(forKey: number) {
  if (state.key === forKey && state.phase === "intro") set("prompt");
}

/** The deciding draw has been pressed. */
export function pullSlotJudge() {
  if (state.phase === "intro" || state.phase === "prompt") set("pulled");
}

export function resolveSlotJudge(success: boolean) {
  if (state.phase === "idle" || state.phase === "fail" || state.phase === "success") return;
  set(success ? "success" : "fail");
}

export function clearSlotJudge(forKey?: number) {
  if (state.phase === "idle" || (forKey !== undefined && state.key !== forKey)) return;
  set("idle");
}

export function getSlotJudge() { return state; }
export function subscribeSlotJudge(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
