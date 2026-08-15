export type PlayerFatalModeOpeningState = {
  active: boolean;
  key: number;
  cardId: "R4";
  tone: "white";
};

let armed = false;
let state: PlayerFatalModeOpeningState = {
  active: false,
  key: 0,
  cardId: "R4",
  tone: "white",
};

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

/** Arms the opening insert after the player wins the attack-land struggle. */
export function armPlayerFatalModeOpening() {
  armed = true;
}

/** Starts the opening insert on the next hand's first draw click. */
export function startPlayerFatalModeOpening() {
  if (!armed || state.active) return false;

  armed = false;
  state = {
    ...state,
    active: true,
    key: state.key + 1,
  };
  notify();
  return true;
}

export function hidePlayerFatalModeOpening() {
  if (!state.active) return;

  state = { ...state, active: false };
  notify();
}

export function cancelPlayerFatalModeOpening() {
  armed = false;
  hidePlayerFatalModeOpening();
}

export function getPlayerFatalModeOpeningState() {
  return state;
}

export function subscribePlayerFatalModeOpening(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}
