import { setEventBattleContext } from "@/lib/events/gameEventStore";

let gameCount = 0;
let listeners: (() => void)[] = [];

// Every logged event is stamped with the game it happened in. Nothing was
// feeding that number, so the whole event log recorded game: 0 -- which makes
// the draw history useless for the balancing pass it exists to support. This
// store owns the count, so it is the honest place to publish it.
function publish() {
  setEventBattleContext({ game: gameCount });
  listeners.forEach((listener) => listener());
}

export function getGameCount() {
  return gameCount;
}

export function incrementGameCount() {
  gameCount += 1;
  publish();
}

export function setGameCount(value: number) {
  gameCount = value;
  publish();
}

export function resetGameCount() {
  gameCount = 0;
  publish();
}

export function subscribeGameCount(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
