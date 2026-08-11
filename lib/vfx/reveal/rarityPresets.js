/**
 * Rarity → look.
 *
 * This is the whole argument for moving reveals off pre-rendered video: the
 * difference between an SR and a UR reveal is a table of numbers, not a
 * separate 45 MB render. Every field here feeds either `settings.beam.*`
 * (which the ported materials re-read every frame) or the reveal timeline.
 *
 * `tier` is only used to order rarities — R is deliberately absent because a
 * common pull should not get a pillar of light at all; the caller keeps the
 * cheap CSS path for those.
 */

/** Seconds. The timeline every reveal runs through. */
const BASE_TIMING = {
  charge: 0.75, // orb winds up at the card's base
  travel: 0.3, // column races up
  hold: 1.6, // it burns
  collapse: 0.8 // it narrows to a thread and goes out
};

export const RARITY_PRESETS = {
  SR: {
    tier: 1,
    label: 'SR',
    timing: { ...BASE_TIMING, charge: 0.55, hold: 1.0, collapse: 0.6 },
    beam: {
      colorCore: '#ffffff',
      colorInner: '#cfe8ff',
      colorOuter: '#3f8fe0',
      colorHalo: '#0a2a7a',
      colorCoil: '#bcd9ff',
      colorCoilEdge: '#4b7fd6',
      colorRing: '#9dc8ff',
      radius: 0.4,
      radiusNear: 0.11,
      glow: 1.5,
      coilOpacity: 0.35,
      ringOpacity: 0.3
    },
    coils: 2,
    rings: 3,
    height: 6.0,
    flash: { color: '#cfe8ff', strength: 0.35 },
    shake: 0.12,
    burst: { radius: 0.3, endRadius: 2.0, intensity: 0.8 },
    light: { color: '#7fb6ff', intensity: 6 },
    sparkRate: 140,
    moteRate: 90
  },

  SSR: {
    tier: 2,
    label: 'SSR',
    timing: { ...BASE_TIMING, charge: 0.7, hold: 1.4 },
    beam: {
      colorCore: '#ffffff',
      colorInner: '#fff0c4',
      colorOuter: '#ffb32e',
      colorHalo: '#a83c00',
      colorCoil: '#ffe6a0',
      colorCoilEdge: '#ff8a12',
      colorRing: '#ffd98a',
      radius: 0.55,
      radiusNear: 0.15,
      glow: 2.2,
      coilOpacity: 0.6,
      ringOpacity: 0.55
    },
    coils: 4,
    rings: 6,
    height: 7.0,
    flash: { color: '#ffe7b0', strength: 0.6 },
    shake: 0.3,
    burst: { radius: 0.45, endRadius: 3.0, intensity: 1.2 },
    light: { color: '#ffc040', intensity: 12 },
    sparkRate: 320,
    moteRate: 180
  },

  UR: {
    tier: 3,
    label: 'UR',
    timing: { charge: 0.95, travel: 0.28, hold: 2.1, collapse: 1.0 },
    beam: {
      // Rainbow-adjacent: a white core with a violet sheath and gold ribbons.
      // The existing ResultGrid already treats "rainbow" as the UR tell.
      colorCore: '#ffffff',
      colorInner: '#f0d8ff',
      colorOuter: '#b45cff',
      colorHalo: '#3c0a8c',
      colorCoil: '#ffe07a',
      colorCoilEdge: '#ff4fd0',
      colorRing: '#c9a3ff',
      radius: 0.72,
      radiusNear: 0.19,
      glow: 3.0,
      coilOpacity: 0.85,
      ringOpacity: 0.8
    },
    coils: 6,
    rings: 9,
    height: 8.5,
    flash: { color: '#ffffff', strength: 0.9 },
    shake: 0.55,
    burst: { radius: 0.6, endRadius: 4.2, intensity: 1.8 },
    light: { color: '#d08cff', intensity: 20 },
    sparkRate: 620,
    moteRate: 320
  }
};

/** SR is the floor: anything rarer than R that we don't recognise reveals as SR. */
export function presetFor(rarity) {
  return RARITY_PRESETS[rarity] ?? RARITY_PRESETS.SR;
}

/** Total seconds one reveal runs for. */
export function durationOf(preset) {
  const t = preset.timing;
  return t.charge + t.travel + t.hold + t.collapse;
}
