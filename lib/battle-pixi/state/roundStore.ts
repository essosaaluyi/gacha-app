let currentRound = 1;

let listeners: (() => void)[] = [];

export function getCurrentRound() {
  return currentRound;
}

export function nextRound() {
  currentRound += 1;

  listeners.forEach((listener) => listener());
}

export function resetRound() {
  currentRound = 1;

  listeners.forEach((listener) => listener());
}

export function subscribeRound(
  listener: () => void
) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
