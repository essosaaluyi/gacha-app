let continuesLeft = 3;

const listeners: (() => void)[] = [];

export function getContinuesLeft() {
  return continuesLeft;
}

export function canContinueBattle() {
  return continuesLeft > 0;
}

export function consumeContinue() {
  if (continuesLeft <= 0) return false;

  continuesLeft -= 1;
  listeners.forEach((listener) => listener());

  return true;
}

export function resetContinues(value = 3) {
  continuesLeft = value;
  listeners.forEach((listener) => listener());
}

export function subscribeContinue(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);

    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}