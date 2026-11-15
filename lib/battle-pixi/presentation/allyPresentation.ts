export const ALLY_PRESENTATION_KEY = "gacha-battle:ally-presentation";
export const DEFAULT_ALLY_PRESENTATION = {
  x: 3, y: 11, scale: 89,
  summonEnabled: false, summonMs: 420, summonRise: 8, summonScale: 85,
};
export type AllyPresentation = typeof DEFAULT_ALLY_PRESENTATION;

export const ALLY_IDLE_CONTROLS = [
  { key: "x", label: "左右", min: -35, max: 35 },
  { key: "y", label: "上下", min: -35, max: 35 },
  { key: "scale", label: "サイズ", min: 40, max: 180 },
] as const;

export const ALLY_SUMMON_CONTROLS = [
  { key: "summonMs", label: "召喚時間", min: 120, max: 1200, unit: " ms" },
  { key: "summonRise", label: "下から浮き上がる距離", min: 0, max: 30, unit: "%" },
  { key: "summonScale", label: "出現時のサイズ（待機時に対して）", min: 40, max: 150, unit: "%" },
] as const;

export function allyPresentationKey(character: string, side: "player" | "enemy" = "player") {
  return side === "enemy" ? `gacha-battle:enemy-placement:${character}` : `${ALLY_PRESENTATION_KEY}:${character}`;
}

export function defaultAllyPresentation(character: string, side: "player" | "enemy" = "player"): AllyPresentation {
  if (side === "enemy") return { ...DEFAULT_ALLY_PRESENTATION, x: 0, y: 0, scale: 100 };
  if (character === "R3") return { ...DEFAULT_ALLY_PRESENTATION, x: 1, y: 28, scale: 138 };
  return character === "R2" ? { ...DEFAULT_ALLY_PRESENTATION, x: -3, scale: 96 } : DEFAULT_ALLY_PRESENTATION;
}

export function readAllyPresentation(character: string, side: "player" | "enemy" = "player"): AllyPresentation {
  const defaults = defaultAllyPresentation(character, side);
  try {
    const shared = side === "enemy" || character === "R2" || character === "R3" ? null : window.localStorage.getItem(ALLY_PRESENTATION_KEY);
    const saved = JSON.parse(window.localStorage.getItem(allyPresentationKey(character, side)) ?? shared ?? "null");
    const placement = { ...defaults, summonEnabled: saved?.summonEnabled === true };
    for (const { key, min, max } of [...ALLY_IDLE_CONTROLS, ...ALLY_SUMMON_CONTROLS]) {
      const value = saved?.[key];
      if (Number.isFinite(value)) placement[key] = Math.max(min, Math.min(max, value));
    }
    return placement;
  } catch {
    return defaults;
  }
}
