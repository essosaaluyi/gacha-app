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

export type FatalFxSettings = { cutIn: CutInSettings; band: BandSettings };

export const TIER_LABEL: Record<FatalTier, string> = { blue: "青", red: "赤", gold: "金" };

export const DEFAULT_FATAL_FX: FatalFxSettings = {
  cutIn: {
    colors: {
      blue: { main: "#1f5cff", glow: "#6fc8ff", bolt: "#eaf7ff", shine: 0 },
      red: { main: "#e3122c", glow: "#ff7048", bolt: "#fff1e8", shine: 0 },
      gold: { main: "#b87400", glow: "#ffb81f", bolt: "#fff4c2", shine: 0.9 },
    },
    tiltDeg: -9,
    heightPct: 34,
    centerYPct: 44,
    durationMs: 1700,
    dim: 0.45,
    flash: 0.85,
    edgeWidth: 5,
    imageSrc: "/images/cards/player/R1/card.webp",
    imageZoom: 1.6,
    imageOffsetX: 0,
    imageOffsetY: 12,
    imageDrift: 6,
    imageTint: 0.45,
    imageUpright: true,
    boltCount: 10,
    boltCrossCount: 0,
    boltLength: 300,
    boltSpread: 12,
    boltJag: 0.5,
    boltWidth: 2.4,
    boltGlow: 18,
    boltFlickerMs: 70,
    boltBranch: 0.45,
    lineCount: 26,
    lineSpeed: 1.6,
    lineOpacity: 0.5,
  },
  band: {
    show: true,
    text: "WIN TO GET THE BONUS",
    separator: "◆",
    heightPct: 7.5,
    insetPct: 0,
    fontPct: 62,
    speedPct: 9,
    gapEm: 1.4,
    opposite: true,
    bgColor: "#3a0a52",
    edgeColor: "#ff9b3d",
    textColor: "#fff3d6",
    glowColor: "#ff5a1f",
    opacity: 0.92,
    glow: 0.8,
    skewDeg: -12,
    tiltDeg: 0,
    depthDeg: 0,
    pitchDeg: 0,
    bottomTiltDeg: 0,
    bottomDepthDeg: 0,
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
