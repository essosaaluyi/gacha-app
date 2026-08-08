let gameCount = 0;
let listeners: (() => void)[] = [];

export function getGameCount() {
  return gameCount;
}

export function incrementGameCount() {
  gameCount += 1;
  listeners.forEach((listener) => listener());
}

export function setGameCount(value: number) {
  gameCount = value;
  listeners.forEach((listener) => listener());
}

export function resetGameCount() {
  gameCount = 0;
  listeners.forEach((listener) => listener());
}

export function subscribeGameCount(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}