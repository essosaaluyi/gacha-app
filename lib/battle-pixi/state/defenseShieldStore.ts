import { getCurrentRound } from "@/lib/battle-pixi/state/roundStore";

export type DefenseShieldGrade = "blue" | "green" | "red" | "purple";
export type DefenseShieldPhase = "hidden" | "traveling" | "stored";

export type DefenseShieldState = {
  grade: DefenseShieldGrade | null;
  round: number | null;
  phase: DefenseShieldPhase;
  token: number;
};

export type DefenseShieldResolution = {
  grade: DefenseShieldGrade;
  survivalChance: number;
  survived: boolean;
};

const GRADE_RULES: readonly {
  grade: DefenseShieldGrade;
  acquisitionWeight: number;
  survivalChance: number;
}[] = [
  { grade: "blue", acquisitionWeight: 0.5, survivalChance: 0.2 },
  { grade: "green", acquisitionWeight: 0.25, survivalChance: 0.4 },
  { grade: "red", acquisitionWeight: 0.2, survivalChance: 0.8 },
  { grade: "purple", acquisitionWeight: 0.05, survivalChance: 1 },
];

let state: DefenseShieldState = {
  grade: null,
  round: null,
  phase: "hidden",
  token: 0,
};

let listeners: (() => void)[] = [];

function publish() {
  listeners.forEach((listener) => listener());
}

function readForcedGrade(): DefenseShieldGrade | null {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return null;
  }

  const value = new URLSearchParams(window.location.search).get("shield-grade");
  return value === "blue" ||
    value === "green" ||
    value === "red" ||
    value === "purple"
    ? value
    : null;
}

function rollGrade(): DefenseShieldGrade {
  const forced = readForcedGrade();
  if (forced) return forced;

  let roll = Math.random();
  for (const rule of GRADE_RULES) {
    roll -= rule.acquisitionWeight;
    if (roll <= 0) return rule.grade;
  }

  return "purple";
}

export function getDefenseShieldState(): DefenseShieldState {
  return state;
}

/** Triple Defense replaces any shield already stored for this enemy. */
export function awardDefenseShield(round = getCurrentRound()) {
  const grade = rollGrade();
  state = {
    grade,
    round,
    phase: "hidden",
    token: state.token + 1,
  };
  publish();
  return grade;
}

/** Called when the table hologram collapses into the traveling light. */
export function revealDefenseShield(grade: DefenseShieldGrade) {
  if (state.grade !== grade || state.round !== getCurrentRound()) return;
  state = { ...state, phase: "traveling" };
  publish();
}

export function settleDefenseShield(token: number) {
  if (state.token !== token || state.phase !== "traveling") return;
  state = { ...state, phase: "stored" };
  publish();
}

/**
 * The fatal check consumes the marker regardless of outcome. A shield from a
 * previous enemy is discarded and can never protect the next battle.
 */
export function consumeDefenseShieldForFatal(
  round = getCurrentRound()
): DefenseShieldResolution | null {
  if (!state.grade || state.round !== round) {
    if (state.grade) clearDefenseShield();
    return null;
  }

  const grade = state.grade;
  const rule = GRADE_RULES.find((item) => item.grade === grade)!;
  const forcedSurvival =
    typeof window !== "undefined" &&
    process.env.NODE_ENV !== "production" &&
    new URLSearchParams(window.location.search).get("shield-survival");
  const survived =
    forcedSurvival === "success"
      ? true
      : forcedSurvival === "fail"
        ? false
        : Math.random() < rule.survivalChance;

  clearDefenseShield();
  return { grade, survivalChance: rule.survivalChance, survived };
}

export function clearDefenseShield() {
  if (!state.grade && state.phase === "hidden") return;
  state = {
    grade: null,
    round: null,
    phase: "hidden",
    token: state.token + 1,
  };
  publish();
}

export function restoreDefenseShield(
  shield?: { grade: DefenseShieldGrade; round: number } | null
) {
  state = shield
    ? {
        grade: shield.grade,
        round: shield.round,
        phase: "stored",
        token: state.token + 1,
      }
    : {
        grade: null,
        round: null,
        phase: "hidden",
        token: state.token + 1,
      };
  publish();
}

export function subscribeDefenseShield(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}
