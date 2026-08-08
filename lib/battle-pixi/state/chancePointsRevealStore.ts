// Single-Chance points gain (v-Next).
//
// Drawing exactly one Chance symbol gives a 1/2 shot at bonus points
// (20/30/50 weighted 5:3:2). The win is deliberately NOT shown on the game
// that earned it — it is queued and revealed on the player's next draw press,
// so the payoff interrupts the following game.
//
// The reveal layers two same-duration videos started together: the acting
// character's field sequence underneath, and the points number on top.

import { addPoints } from "@/lib/wallet/walletStore";
import { playSfx } from "@/lib/audio/sfxStore";

// ---------------------------------------------------------------------------
// ASSET PATHS — both reveals are PNG frame sequences, played as two layers:
// the acting character underneath (/videos/points-gain/<CARD>/) and the points
// number on top (/videos/points-gain/<POINTS>p/). Frames are the same count in
// both folders so the layers stay in sync.
//
// Only the FRAME_FILE builder below should need editing if the exported file
// naming changes — the frame count is detected at runtime, so it is not
// hard-coded anywhere.
// ---------------------------------------------------------------------------

// Frames are the folder name followed by a 3-digit index starting at 000,
// e.g. points-gain/20p/20p000.png and points-gain/UR3/ur3000.png.
function framePath(folder: string, prefix: string, frame: number) {
  return `/videos/points-gain/${folder}/${prefix}${frame
    .toString()
    .padStart(3, "0")}.png`;
}

/** Lowest frame number on disk. */
export const CHANCE_POINTS_FIRST_FRAME = 0;

/** 30fps — the exports are 180 frames, i.e. an even six seconds. */
export const CHANCE_POINTS_FRAME_MS = 33;

/** Safety cap while probing for the end of a sequence. */
export const CHANCE_POINTS_MAX_FRAMES = 400;

/** Frames fetched per round trip while preloading. */
export const CHANCE_POINTS_LOAD_BATCH = 30;

/** Frames buffered before playback starts, so it never chases the loader. */
export const CHANCE_POINTS_MIN_BUFFER = 45;

/** Intrinsic size of the exported frames; the canvas renders at this size. */
export const CHANCE_POINTS_FRAME_WIDTH = 1250;
export const CHANCE_POINTS_FRAME_HEIGHT = 618;

// The card folders are not consistently cased on disk (R1 exports as R1000,
// UR3 as ur3000). Windows hides this, but a case-sensitive host would 404, so
// each candidate spelling is tried until one resolves.
function prefixCandidates(folder: string) {
  return Array.from(new Set([folder, folder.toLowerCase(), folder.toUpperCase()]));
}

/** Candidate frame-path builders for the acting character's sequence. */
export function chancePointsCharacterBuilders(cardName: string) {
  return prefixCandidates(cardName).map(
    (prefix) => (frame: number) => framePath(cardName, prefix, frame)
  );
}

/** Candidate frame-path builders for the points-number sequence. */
export function chancePointsNumberBuilders(points: number) {
  const folder = `${points}p`;

  return prefixCandidates(folder).map(
    (prefix) => (frame: number) => framePath(folder, prefix, frame)
  );
}
// ---------------------------------------------------------------------------

export const CHANCE_POINTS_WIN_RATE = 0.5;

// Reward tiers and their relative weights (5:3:2).
const CHANCE_POINTS_TIERS: { points: number; weight: number }[] = [
  { points: 20, weight: 5 },
  { points: 30, weight: 3 },
  { points: 50, weight: 2 },
];

export type ChancePointsReveal = {
  points: number;
  cardName: string;
};

export type ChancePointsRevealState = {
  // Won, waiting for the next draw press to play.
  pending: ChancePointsReveal | null;
  // Currently on screen.
  active: ChancePointsReveal | null;
  key: number;
};

let state: ChancePointsRevealState = {
  pending: null,
  active: null,
  key: 0,
};

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

function rollPoints(): number {
  const total = CHANCE_POINTS_TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  let roll = Math.random() * total;

  for (const tier of CHANCE_POINTS_TIERS) {
    roll -= tier.weight;
    if (roll <= 0) return tier.points;
  }

  return CHANCE_POINTS_TIERS[0].points;
}

/**
 * Rolls the single-Chance reward for a freshly drawn hand. Returns the points
 * won (queued for the next press), or 0 when the hand does not qualify or the
 * coin flip loses.
 */
export function rollChancePointsGain(
  cards: readonly string[],
  cardName: string
): number {
  const chanceCount = cards.filter((symbol) => symbol === "Chance").length;

  if (chanceCount !== 1) return 0;
  if (Math.random() >= CHANCE_POINTS_WIN_RATE) return 0;

  const points = rollPoints();

  state = {
    ...state,
    pending: { points, cardName },
  };

  notify();
  return points;
}

/** True while the reveal video is on screen (draws must stay blocked). */
export function isChancePointsRevealActive() {
  return state.active !== null;
}

/**
 * Consumes a queued reveal, moving it on screen. Returns true when a reveal
 * took over this draw press (the caller must not start a draw).
 */
export function startPendingChancePointsReveal(): boolean {
  if (!state.pending) return false;

  state = {
    pending: null,
    active: state.pending,
    key: state.key + 1,
  };

  playSfx("pointsGained");
  notify();
  return true;
}

/** Credits the reward and clears the overlay (called when the video ends). */
export function finishChancePointsReveal() {
  const reveal = state.active;
  if (!reveal) return;

  state = { ...state, active: null };
  void addPoints(reveal.points, "chance_points");
  notify();
}

export function clearChancePointsReveal() {
  state = { pending: null, active: null, key: 0 };
  notify();
}

export function getChancePointsRevealState() {
  return state;
}

// Dev-only console helper: `__queueChancePoints(30, "UR3")` queues a reward so
// the reveal can be checked without waiting for the 1-in-2 roll on a lone
// Chance card. The next draw press plays it, exactly like a real win.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (
    window as Window & {
      __queueChancePoints?: (points?: number, cardName?: string) => string;
    }
  ).__queueChancePoints = (points = 20, cardName = "UR3") => {
    state = { ...state, pending: { points, cardName } };
    notify();
    return `Queued +${points}P (${cardName}) — press DRAW to play the reveal.`;
  };

  (
    window as Window & {
      __chancePointsDebug?: () => { state: ChancePointsRevealState; listeners: number };
    }
  ).__chancePointsDebug = () => ({ state, listeners: listeners.length });
}

export function subscribeChancePointsReveal(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}
