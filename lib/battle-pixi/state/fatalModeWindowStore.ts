// How long the player's Fatal Mode is *on screen*, which is longer than the
// mode itself: the final draw ends the mode internally the moment it is
// pressed, but its dressing (band, movie) stays until that hand's result has
// finished presenting.
//
// It also opens later than the mode: the mode is armed at the end of the hand
// that won it, but nothing of it shows until the next hand's first draw, when
// the silver shutter comes in.

import { getBattlePresentationFlow, subscribeBattlePresentationFlow } from "./battlePresentationFlowStore";
import { getPlayerFatalSnapshot, isFatalModeActive, subscribeFatalMode } from "./fatalModeStore";

let open = false;
let ended = false;
// The result has "come out" once the presentation has been busy and then
// returned to ready after the mode ended.
let sawBusy = false;
let wired = false;
// True from the mode's first draw press (plus any shutter lead).
let started = false;
let startTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function sync() {
  const ready = getBattlePresentationFlow().phase === "next_round_ready";
  if (isFatalModeActive()) {
    // A run resumed part-way through the mode has already had its first draw.
    const { totalGames, gamesLeft } = getPlayerFatalSnapshot();
    if (!started && gamesLeft >= totalGames) return;
    started = true;
    const changed = !open;
    open = true; ended = false; sawBusy = false;
    if (changed) notify();
    return;
  }
  if (startTimer) { clearTimeout(startTimer); startTimer = null; }
  if (!open) { started = false; return; }
  if (!ended) { ended = true; sawBusy = false; }
  if (!ready) { sawBusy = true; return; }
  if (sawBusy) { open = false; ended = false; started = false; notify(); }
}

/**
 * The mode's first draw has been pressed. `delayMs` lets the silver shutter
 * arrive first, so the band is never seen ahead of it.
 */
export function markFatalModeDrawStarted(delayMs = 0) {
  if (started || startTimer || !isFatalModeActive()) return;
  const begin = () => { startTimer = null; started = true; sync(); };
  if (delayMs > 0) startTimer = setTimeout(begin, delayMs);
  else begin();
}

export function isFatalModeWindowOpen() { return open; }

export function subscribeFatalModeWindow(listener: () => void) {
  if (!wired) {
    wired = true;
    subscribeFatalMode(sync);
    subscribeBattlePresentationFlow(sync);
    sync();
  }
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
