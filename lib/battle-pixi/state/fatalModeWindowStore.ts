// How long the player's Fatal Mode is *on screen*, which is longer than the
// mode itself: the final draw ends the mode internally the moment it is
// pressed, but its dressing (band, movie) stays until that hand's result has
// finished presenting.

import { getBattlePresentationFlow, subscribeBattlePresentationFlow } from "./battlePresentationFlowStore";
import { isFatalModeActive, subscribeFatalMode } from "./fatalModeStore";

let open = false;
let ended = false;
// The result has "come out" once the presentation has been busy and then
// returned to ready after the mode ended.
let sawBusy = false;
let wired = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function sync() {
  const ready = getBattlePresentationFlow().phase === "next_round_ready";
  if (isFatalModeActive()) {
    const changed = !open;
    open = true; ended = false; sawBusy = false;
    if (changed) notify();
    return;
  }
  if (!open) return;
  if (!ended) { ended = true; sawBusy = false; }
  if (!ready) { sawBusy = true; return; }
  if (sawBusy) { open = false; ended = false; notify(); }
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
