/**
 * Quality tiers.
 *
 * The reference project targets a desktop GPU and always runs the full
 * pipeline. A gacha reveal runs on whatever phone the player has, so every
 * knob that costs fill rate or vertex work is tiered here, and the harness can
 * switch tiers at runtime to find where a given device stops holding 60.
 */

export const QUALITY = {
  high: {
    label: 'High',
    pixelRatioCap: 1.75,
    depth: true, // depth prepass → soft particles
    distortion: true, // screen-space refraction
    bloom: true,
    tubeNodes: 96,
    tubeSides: 26,
    coilNodes: 128,
    ringSegments: 44,
    particleScale: 1,
    sparkCapacity: 5000,
    moteCapacity: 3600
  },

  medium: {
    label: 'Medium',
    pixelRatioCap: 1.25,
    depth: true,
    distortion: false, // first thing to go: a half-res pass nobody notices missing
    bloom: true,
    tubeNodes: 64,
    tubeSides: 18,
    coilNodes: 80,
    ringSegments: 28,
    particleScale: 0.55,
    sparkCapacity: 2600,
    moteCapacity: 1800
  },

  low: {
    label: 'Low',
    pixelRatioCap: 1.0,
    depth: false, // no soft particles; they hard-edge against the card
    distortion: false,
    bloom: true, // kept: without it the additive column reads flat and grey
    tubeNodes: 40,
    tubeSides: 12,
    coilNodes: 48,
    ringSegments: 18,
    particleScale: 0.25,
    sparkCapacity: 1200,
    moteCapacity: 800
  },

  minimal: {
    label: 'Minimal',
    pixelRatioCap: 1.0,
    depth: false,
    distortion: false,
    bloom: false, // the "does this device do WebGL at all" tier
    tubeNodes: 28,
    tubeSides: 10,
    coilNodes: 32,
    ringSegments: 12,
    particleScale: 0.12,
    sparkCapacity: 600,
    moteCapacity: 400
  }
};

export const QUALITY_ORDER = ['high', 'medium', 'low', 'minimal'];

/**
 * A first guess at the right tier, refined by measurement afterwards.
 *
 * Deliberately crude — `deviceMemory` and core count are the only signals a
 * browser gives us before we have drawn a frame, and neither is available
 * everywhere. The harness exists precisely because this guess is not trustworthy.
 */
export function guessQuality() {
  if (typeof navigator === 'undefined') return 'medium';

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = navigator.deviceMemory ?? 4;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;

  if (coarse) {
    if (cores >= 8 && memory >= 6) return 'medium';
    return 'low';
  }

  if (cores >= 8 && memory >= 8) return 'high';
  if (cores >= 4) return 'medium';
  return 'low';
}
