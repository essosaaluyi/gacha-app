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
};

export type FatalFxSettings = { cutIn: CutInSettings; band: BandSettings };

export const TIER_LABEL: Record<FatalTier, string> = { blue: "青", red: "赤", gold: "金" };

export const DEFAULT_FATAL_FX: FatalFxSettings = {
  cutIn: {
    colors: {
      blue: { main: "#1f5cff", glow: "#6fc8ff", bolt: "#eaf7ff" },
      red: { main: "#e3122c", glow: "#ff7048", bolt: "#fff1e8" },
      gold: { main: "#e6a100", glow: "#ffe06a", bolt: "#fffbe2" },
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
    boltCount: 4,
    boltCrossCount: 2,
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
  },
};

/** Fill in anything a stored/older settings object is missing. */
export function mergeFatalFx(saved: unknown): FatalFxSettings {
  const s = (saved ?? {}) as Partial<FatalFxSettings>;
  const d = DEFAULT_FATAL_FX;
  const colors = { ...d.cutIn.colors, ...(s.cutIn?.colors ?? {}) };
  return {
    cutIn: { ...d.cutIn, ...(s.cutIn ?? {}), colors },
    band: { ...d.band, ...(s.band ?? {}) },
  };
}
