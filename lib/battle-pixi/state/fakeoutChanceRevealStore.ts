// Chance reveal: two-layer composited frame sequence.
//
// Background: character-specific (e.g. UR3/crv-bg-ur3000.png)
// Foreground: card color with alpha (e.g. card-blue/card-blue000.png)
//
// Playback: start on draw press → pause at PAUSE_FRAME → resume on first flip.
// Card color is a weighted lottery keyed on predeterminedSuccess so the color
// acts as a win-indication signal (blue = cold, green = warm, red = hot).

import { patchConfig } from "@/lib/game-config/patchConfig";
import { playSfx } from "@/lib/audio/sfxStore";

export type ChanceRevealCardColor = "blue" | "green" | "red";

export type ChanceRevealPlayback = "playing" | "paused" | "resumed";

export type FakeoutChanceRevealState = {
  active: boolean;
  key: number;
  character: string | null;
  cardColor: ChanceRevealCardColor | null;
  playback: ChanceRevealPlayback;
};

// ── Frame constants ────────────────────────────────────────────────────────

export const CRV_FRAME_WIDTH = 1250;
export const CRV_FRAME_HEIGHT = 618;
export const CRV_FRAME_MS = 33; // 30 fps
export const CRV_PAUSE_FRAME = 30;
export const CRV_MAX_FRAMES = 400;
export const CRV_LOAD_BATCH = 30;
export const CRV_MIN_BUFFER = 45;
export const CRV_FIRST_FRAME = 0;

// ── Asset path builders ────────────────────────────────────────────────────

function prefixCandidates(base: string) {
  return Array.from(
    new Set([base, base.toLowerCase(), base.toUpperCase()])
  );
}

export function chanceRevealCharacterBuilders(character: string) {
  const lc = character.toLowerCase();
  return prefixCandidates(`crv-bg-${lc}`).map(
    (prefix) => (frame: number) =>
      `/videos/chance-reveal/${character}/${prefix}${frame
        .toString()
        .padStart(3, "0")}.png`
  );
}

export function chanceRevealCardBuilders(color: ChanceRevealCardColor) {
  const folder = `card-${color}`;
  return prefixCandidates(folder).map(
    (prefix) => (frame: number) =>
      `/videos/chance-reveal/${folder}/${prefix}${frame
        .toString()
        .padStart(3, "0")}.png`
  );
}

// ── Asset availability ─────────────────────────────────────────────────────

/**
 * Whether authored composite frames exist for this character/colour pair.
 *
 * Without this gate a card with no artwork fires ~180 image requests and 404s
 * on every one. There is no longer a fallback presentation, so a pair that is
 * not covered simply shows nothing. Extend the allowlist in patchConfig as
 * frame sequences are delivered.
 */
export function hasChanceRevealAssets(
  character: string,
  cardColor: ChanceRevealCardColor
): boolean {
  const assets = patchConfig.fakeout.chanceRevealComposite;

  return (
    assets.characters.some(
      (name) => name.toLowerCase() === character.toLowerCase()
    ) && assets.colors.includes(cardColor)
  );
}

/**
 * Applies the temporary test override, if enabled, so the reveal plays on
 * every fakeout regardless of which card is active. See patchConfig.
 */
export function resolveChanceRevealCast(
  character: string,
  cardColor: ChanceRevealCardColor
): { character: string; cardColor: ChanceRevealCardColor } {
  const test = patchConfig.fakeout.chanceRevealTest;

  if (test.enabled) {
    return { character: test.forceCharacter, cardColor: test.forceColor };
  }

  return { character, cardColor };
}

// ── Color lottery ──────────────────────────────────────────────────────────

const COLORS: ChanceRevealCardColor[] = ["blue", "green", "red"];

export function rollChanceRevealColor(
  predeterminedSuccess: boolean
): ChanceRevealCardColor {
  const weights = predeterminedSuccess
    ? patchConfig.fakeout.chanceRevealColors.win
    : patchConfig.fakeout.chanceRevealColors.lose;

  const total = COLORS.reduce((sum, c) => sum + weights[c], 0);
  let roll = Math.random() * total;

  for (const color of COLORS) {
    roll -= weights[color];
    if (roll <= 0) return color;
  }

  return "blue";
}

// ── State ──────────────────────────────────────────────────────────────────

let state: FakeoutChanceRevealState = {
  active: false,
  key: 0,
  character: null,
  cardColor: null,
  playback: "playing",
};

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function showFakeoutChanceReveal(
  character: string,
  cardColor: ChanceRevealCardColor
) {
  state = {
    active: true,
    key: state.key + 1,
    character,
    cardColor,
    playback: "playing",
  };

  playSfx("chanceIcon");


  notify();
}

export function resumeFakeoutChanceReveal() {
  if (!state.active || state.playback !== "paused") return;
  state = { ...state, playback: "resumed" };
  notify();
}

export function hideFakeoutChanceReveal() {
  if (!state.active) return;
  state = { ...state, active: false };
  notify();
}

export function getFakeoutChanceRevealState() {
  return state;
}

// Callback for the render loop to signal it reached the pause frame.
export function markFakeoutChanceRevealPaused() {
  if (!state.active || state.playback !== "playing") return;
  state = { ...state, playback: "paused" };
  notify();
}

export function subscribeFakeoutChanceReveal(listener: () => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

// Dev-only console helpers
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (
    window as Window & {
      __chanceRevealPreview?: (
        character?: string,
        color?: ChanceRevealCardColor | false
      ) => string;
    }
  ).__chanceRevealPreview = (character = "UR3", color) => {
    if (color === false) {
      hideFakeoutChanceReveal();
      return "hidden";
    }
    const pickedColor = color ?? "blue";
    showFakeoutChanceReveal(character, pickedColor);
    return `showing ${character} / ${pickedColor}${
      hasChanceRevealAssets(character, pickedColor) ? "" : " (no assets)"
    }`;
  };

  (
    window as Window & {
      __chanceRevealResume?: () => string;
    }
  ).__chanceRevealResume = () => {
    resumeFakeoutChanceReveal();
    return `playback: ${state.playback}`;
  };
}
