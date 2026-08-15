import { setEventBattleContext } from "@/lib/events/gameEventStore";

let currentRound = 1;

let listeners: (() => void)[] = [];

// See battleGameStore: logged events carry the round they happened in, and
// nothing was publishing it, so every event recorded round: 0.
function publish() {
  setEventBattleContext({ round: currentRound });
  listeners.forEach((listener) => listener());
}

export function getCurrentRound() {
  return currentRound;
}

export function nextRound() {
  currentRound += 1;
  publish();
}

export function setRound(value: number) {
  currentRound = value;
  publish();
}

export function resetRound() {
  currentRound = 1;
  publish();
}

export function subscribeRound(
  listener: () => void
) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
