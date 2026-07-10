let visible = false;
let overlayKey = 0;

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function getChanceIconOverlayState() {
  return {
    visible,
    overlayKey,
  };
}

export function rollChanceIconOverlay(hasChanceCard: boolean) {
  if (!hasChanceCard || Math.random() >= 0.5) {
    hideChanceIconOverlay();
    return;
  }

  visible = true;
  overlayKey += 1;
  notify();
}

export function hideChanceIconOverlay() {
  if (!visible) return;

  visible = false;
  notify();
}

export function subscribeChanceIconOverlay(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);

    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
