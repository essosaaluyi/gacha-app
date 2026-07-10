export type AttackFakeoutVariant = "classic" | "delayed3";

export type AttackFakeoutState = {
  active: boolean;
  turnsLeft: number;
  totalTurns: number;
  predeterminedSuccess: boolean;
  variant: AttackFakeoutVariant;
};

let fakeoutState: AttackFakeoutState = {
  active: false,
  turnsLeft: 0,
  totalTurns: 0,
  predeterminedSuccess: false,
  variant: "classic",
};

export function getAttackFakeoutState() {
  return fakeoutState;
}

export function startAttackFakeout(
  predeterminedSuccess: boolean,
  enemyCounter: number,
  variant: AttackFakeoutVariant = "classic"
) {
  // "delayed3" always runs the full silent cycle; classic shortens
  // to the enemy counter as before.
  const turns =
    variant === "delayed3" ? 3 : Math.min(3, enemyCounter);

  fakeoutState = {
    active: turns > 0,
    turnsLeft: turns,
    totalTurns: turns,
    predeterminedSuccess,
    variant,
  };
}

export function consumeFakeoutTurn() {
  if (!fakeoutState.active) return null;

  const fakeoutNumber =
    fakeoutState.totalTurns - fakeoutState.turnsLeft + 1;

  fakeoutState.turnsLeft -= 1;

  const finished = fakeoutState.turnsLeft <= 0;

  const result = {
    fakeoutNumber,
    totalTurns: fakeoutState.totalTurns,
    finished,
    predeterminedSuccess: fakeoutState.predeterminedSuccess,
    variant: fakeoutState.variant,
  };

  if (finished) {
    fakeoutState.active = false;
  }

  return result;
}

export function clearAttackFakeout() {
  fakeoutState = {
    active: false,
    turnsLeft: 0,
    totalTurns: 0,
    predeterminedSuccess: false,
    variant: "classic",
  };
}

export function overrideFakeoutToSuccess() {
  if (!fakeoutState.active) return;

  fakeoutState.predeterminedSuccess = true;
}
