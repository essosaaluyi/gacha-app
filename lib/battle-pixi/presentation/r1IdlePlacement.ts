export const R1_IDLE_PLACEMENT_KEY = "gacha-battle:r1-idle-placement";
export const DEFAULT_R1_IDLE_PLACEMENT = { x: 3, y: 11, scale: 89 };
export type R1IdlePlacement = typeof DEFAULT_R1_IDLE_PLACEMENT;

export const R1_IDLE_CONTROLS = [
  { key: "x", label: "左右", min: -35, max: 35 },
  { key: "y", label: "上下", min: -35, max: 35 },
  { key: "scale", label: "サイズ", min: 40, max: 180 },
] as const;

export function readR1IdlePlacement(): R1IdlePlacement {
  try {
    const saved = JSON.parse(window.localStorage.getItem(R1_IDLE_PLACEMENT_KEY) ?? "null");
    const placement = { ...DEFAULT_R1_IDLE_PLACEMENT };
    for (const { key, min, max } of R1_IDLE_CONTROLS) {
      const value = saved?.[key];
      if (Number.isFinite(value)) placement[key] = Math.max(min, Math.min(max, value));
    }
    return placement;
  } catch {
    return DEFAULT_R1_IDLE_PLACEMENT;
  }
}
