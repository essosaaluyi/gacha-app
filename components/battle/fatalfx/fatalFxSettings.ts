// Tunable values for the Fatal Mode band (marquee) and the expectation cut-in.
// Everything here is presentation only: no odds, no battle state.

export type FatalTier = "blue" | "red" | "gold";

export type TierColors = {
  /** Body colour of the cut-in band and the tint laid over the picture. */
  main: string;
  /** Halo around edges and lightning. */
  glow: string;
  /** Hot core of the lightning. */
  bolt: string;
  /** 0-1: metallic sheen (banded highlights plus a moving glint). */
  shine: number;
};

export type CutInSettings = {
  colors: Record<FatalTier, TierColors>;
  tiltDeg: number;
  heightPct: number;
  centerYPct: number;
  durationMs: number;
  dim: number;
  flash: number;
  edgeWidth: number;
  imageSrc: string;
  imageZoom: number;
  imageOffsetX: number;
  imageOffsetY: number;
  imageDrift: number;
  imageTint: number;
  imageUpright: boolean;
  boltCount: number;
  boltCrossCount: number;
  /** Length of each edge bolt, in screen px (1250 wide). */
  boltLength: number;
  /** How far bolts may stray from the edge line, in px. */
  boltSpread: number;
  boltJag: number;
  boltWidth: number;
  boltGlow: number;
  boltFlickerMs: number;
  boltBranch: number;
  lineCount: number;
  lineSpeed: number;
  lineOpacity: number;
};

export type BandSettings = {
  show: boolean;
  text: string;
  separator: string;
  heightPct: number;
  insetPct: number;
  fontPct: number;
  speedPct: number;
  gapEm: number;
  opposite: boolean;
  bgColor: string;
  edgeColor: string;
  textColor: string;
  glowColor: string;
  opacity: number;
  glow: number;
  skewDeg: number;
  /** Tilt of the whole band, in degrees. */
  tiltDeg: number;
  /** Depth: turns the band around the vertical axis so one end recedes. */
  depthDeg: number;
  /** Depth: tips the band around its own length (top edge toward/away). */
  pitchDeg: number;
  /** The same three angles for the bottom band. */
  bottomTiltDeg: number;
  bottomDepthDeg: number;
  bottomPitchDeg: number;
  /** Strength of the perspective. Higher = more exaggerated depth. */
  perspective: number;
};

/** The held last frame of a Fatal Mode movie. */
export type FreezeSettings = {
  zoomMin: number;
  zoomMax: number;
  /** One push in or out, in ms. */
  zoomMs: number;
  shakePx: number;
  blurPx: number;
  /** Radius (%) of the sharp centre. */
  blurInnerPct: number;
  linesOpacity: number;
  /** Spacing of the lines, in degrees. Smaller = more lines. */
  linesPeriodDeg: number;
  linesWidthDeg: number;
  /** Radius (%) of the centre kept clear of lines. */
  linesInnerPct: number;
  linesColor: string;
  linesFlickerMs: number;
  vignette: number;
  fadeMs: number;
};

export const DEFAULT_FREEZE: FreezeSettings = {
  zoomMin: 1.01,
  zoomMax: 1.025,
  zoomMs: 120,
  shakePx: 0,
  blurPx: 22.5,
  blurInnerPct: 48,
  linesOpacity: 0.3,
  linesPeriodDeg: 7,
  linesWidthDeg: 1.15,
  linesInnerPct: 35,
  linesColor: "#ffffff",
  linesFlickerMs: 300,
  vignette: 0.3,
  fadeMs: 540,
};

export type FatalFxSettings = { cutIn: CutInSettings; band: BandSettings };

export const TIER_LABEL: Record<FatalTier, string> = { blue: "青", red: "赤", gold: "金" };

export const DEFAULT_FATAL_FX: FatalFxSettings = {
  cutIn: {
    colors: {
      blue: { main: "#1f5cff", glow: "#6fc8ff", bolt: "#eaf7ff", shine: 0 },
      red: { main: "#ff001e", glow: "#ff0000", bolt: "#fff1e8", shine: 0 },
      gold: { main: "#b87400", glow: "#ffb81f", bolt: "#fff4c2", shine: 0.9 },
    },
    tiltDeg: -9,
    heightPct: 34,
    centerYPct: 44,
    durationMs: 1700,
    dim: 0.45,
    flash: 0.85,
    edgeWidth: 6,
    imageSrc: "/images/cards/player/R1/card.webp",
    imageZoom: 1.6,
    imageOffsetX: 0,
    imageOffsetY: 20.5,
    imageDrift: 5,
    imageTint: 0.45,
    imageUpright: true,
    boltCount: 29,
    boltCrossCount: 0,
    boltLength: 300,
    boltSpread: 12,
    boltJag: 0.95,
    boltWidth: 4,
    boltGlow: 35,
    boltFlickerMs: 85,
    boltBranch: 1,
    lineCount: 29,
    lineSpeed: 1.6,
    lineOpacity: 0.5,
  },
  band: {
    show: true,
    text: "WIN FOR A BONUS!?",
    separator: "◆",
    heightPct: 8,
    insetPct: 5.5,
    fontPct: 71,
    speedPct: 11,
    gapEm: 2.9,
    opposite: true,
    bgColor: "#000000",
    edgeColor: "#ffffff",
    textColor: "#fbff00",
    glowColor: "#b01fff",
    opacity: 0.94,
    glow: 1.35,
    skewDeg: -12,
    tiltDeg: 3,
    depthDeg: -35,
    pitchDeg: 0,
    bottomTiltDeg: 3,
    bottomDepthDeg: 35,
    bottomPitchDeg: 0,
    perspective: 1,
  },
};

/** Fill in anything a stored/older settings object is missing. */
export function mergeFatalFx(input: unknown): FatalFxSettings {
  const s = (input ?? {}) as Partial<FatalFxSettings>;
  const d = DEFAULT_FATAL_FX;
  const saved = s.cutIn?.colors;
  const colors = {
    blue: { ...d.cutIn.colors.blue, ...(saved?.blue ?? {}) },
    red: { ...d.cutIn.colors.red, ...(saved?.red ?? {}) },
    gold: { ...d.cutIn.colors.gold, ...(saved?.gold ?? {}) },
  };
  // The first gold preset read as yellow; move untouched copies to the new one.
  if (saved?.gold?.main === "#e6a100" && saved.gold.glow === "#ffe06a") colors.gold = { ...d.cutIn.colors.gold };
  return {
    cutIn: { ...d.cutIn, ...(s.cutIn ?? {}), colors },
    band: {
      ...d.band,
      ...(s.band ?? {}),
      // Settings saved before the bands were split: the bottom follows the top.
      bottomTiltDeg: s.band?.bottomTiltDeg ?? s.band?.tiltDeg ?? d.band.bottomTiltDeg,
      bottomDepthDeg: s.band?.bottomDepthDeg ?? s.band?.depthDeg ?? d.band.bottomDepthDeg,
      bottomPitchDeg: s.band?.bottomPitchDeg ?? s.band?.pitchDeg ?? d.band.bottomPitchDeg,
    },
  };
}
