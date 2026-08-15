let active = false;
let pulseKey = 0;
let pulseCount = 0;
let chanceTextArmed = false;
let chanceTextVisible = false;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function getMagicCircleState() {
  return {
    active,
    pulseKey,
    pulseCount,
    chanceTextArmed,
    chanceTextVisible,
  };
}

export function startEmptyMagicCircleChance() {
  if (Math.random() >= 0.2) {
    hideMagicCircle();
    return;
  }

  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  active = true;
  pulseKey = 0;
  pulseCount = 0;
  chanceTextArmed = false;
  chanceTextVisible = false;
  notify();
}

export function hideMagicCircle() {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  active = false;
  pulseKey = 0;
  pulseCount = 0;
  chanceTextArmed = false;
  chanceTextVisible = false;
  notify();
}

export function armMagicCircleChanceText() {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  active = true;
  chanceTextArmed = true;
  chanceTextVisible = false;
  notify();
}

export function pulseMagicCircle() {
  if (!active) return;
  if (chanceTextVisible) return;

  pulseKey += 1;
  pulseCount += 1;
  notify();

  if (pulseCount >= 3) {
    if (chanceTextArmed) {
      chanceTextVisible = true;
      notify();
      return;
    }

    if (clearTimer) {
      clearTimeout(clearTimer);
    }

    clearTimer = setTimeout(() => {
      active = false;
      clearTimer = null;
      notify();
    }, 900);
  }
}

export function subscribeMagicCircle(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);

    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
