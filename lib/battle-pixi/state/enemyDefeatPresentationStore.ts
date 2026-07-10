let defeatPresentationKey = 0;

let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function triggerEnemyDefeatPresentation() {
  defeatPresentationKey += 1;
  notify();
}

export function getEnemyDefeatPresentationKey() {
  return defeatPresentationKey;
}

export function subscribeEnemyDefeatPresentation(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((registered) => registered !== listener);
  };
}
