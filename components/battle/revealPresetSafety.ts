export const REVEAL_LAYER_KEYS = [
  "cardBack",
  "cardFront",
  "particle",
  "burst",
  "shadow",
  "stand",
  "idle",
] as const;

export type RevealLayerKey = (typeof REVEAL_LAYER_KEYS)[number];

export type RevealLayerState = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  visible: boolean;
};

export type RevealLayerMap = Record<RevealLayerKey, RevealLayerState>;
export type SavedRevealLayers = Partial<
  Record<RevealLayerKey, Partial<RevealLayerState>>
>;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Produces a complete, valid layer map from workstation storage. Both the
 * workstation and battle screen use this, so a value that previews correctly
 * is read with the exact same coordinate rules in battle.
 */
export function normalizeSavedRevealLayers(
  presetId: string,
  defaults: RevealLayerMap,
  savedLayers?: SavedRevealLayers
): RevealLayerMap {
  const migrated = { ...savedLayers };
  const particle = migrated.particle;

  // Preserve old workstation saves whose particle canvas used the former
  // left-edge coordinate. New values are never changed.
  if (particle?.x === -82.2 || particle?.x === 747.8) {
    migrated.particle = { ...particle, x: particle.x + 53 };
  }

  // Preserve the two intentional size adjustments made before the unified
  // layer loader existed. New, user-authored scales pass through untouched.
  if (presetId === "broken-doll" && migrated.stand?.scale === 0.36) {
    migrated.stand = { ...migrated.stand, scale: 0.306 };
    migrated.idle = { ...migrated.idle, scale: 0.306 };
  }

  if (presetId === "enemy-two" && migrated.stand?.scale === 1.02) {
    migrated.stand = { ...migrated.stand, scale: 0.816 };
    migrated.idle = { ...migrated.idle, scale: 0.816 };
  }

  return REVEAL_LAYER_KEYS.reduce((layers, key) => {
    const fallback = defaults[key];
    const saved = migrated[key];

    layers[key] = {
      x: isFiniteNumber(saved?.x) ? saved.x : fallback.x,
      y: isFiniteNumber(saved?.y) ? saved.y : fallback.y,
      scale:
        isFiniteNumber(saved?.scale) && saved.scale > 0
          ? saved.scale
          : fallback.scale,
      opacity:
        isFiniteNumber(saved?.opacity) && saved.opacity >= 0 && saved.opacity <= 1
          ? saved.opacity
          : fallback.opacity,
      visible: typeof saved?.visible === "boolean" ? saved.visible : fallback.visible,
    };

    return layers;
  }, {} as RevealLayerMap);
}
