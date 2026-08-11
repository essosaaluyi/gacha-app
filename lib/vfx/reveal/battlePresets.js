/**
 * Battle VFX presets.
 *
 * Each entry is one self-contained effect a battle can fire: colours, timings
 * and rates only. As with the rarity table, the point is that a new variant —
 * a different element, a stronger version of the same hit — is a row here
 * rather than new authored content.
 */

/** Palettes, so an effect can be re-skinned per element without touching timing. */
export const ELEMENT_COLORS = {
  electric: {
    core: '#ffffff',
    inner: '#cfe4ff',
    outer: '#4a9dff',
    deep: '#0b2f7a',
    accent: '#9ccfff'
  },
  fire: {
    core: '#fff4d6',
    inner: '#ffc46b',
    outer: '#ff6a12',
    deep: '#5c1400',
    accent: '#ffa03c'
  },
  holy: {
    core: '#ffffff',
    inner: '#fff0c4',
    outer: '#ffd34a',
    deep: '#6b4300',
    accent: '#ffe79c'
  },
  void: {
    core: '#ffffff',
    inner: '#e6ccff',
    outer: '#a855f7',
    deep: '#2e0a5c',
    accent: '#c99bff'
  }
};

export const SPARK_BURST = {
  label: 'Spark burst',
  /** Seconds the emitter stays open. Sparks outlive it by their own lifetime. */
  duration: 0.22,
  count: 900,
  speed: 7.5,
  speedVariance: 0.7,
  spread: 1,
  size: 0.055,
  life: 0.55,
  gravity: -6.5,
  drag: 1.6,
  flash: 0.4,
  shake: 0.25,
  light: 14
};

export const SHOCKWAVE = {
  label: 'Shockwave',
  duration: 0.5,
  /**
   * RING is one ring per particle, so this is a count of *rings*, not of
   * fragments making up a ring. Three, staggered by their life variance, gives
   * the front some thickness without reading as clutter.
   */
  ringCount: 3,
  ringSize: 0.45,
  ringLife: 0.55,
  /** The pressure shell that goes up with it. */
  burstRadius: 0.4,
  burstEndRadius: 3.6,
  burstLife: 0.55,
  dustCount: 260,
  flash: 0.3,
  shake: 0.45,
  light: 10
};

export const BOLT = {
  label: 'Lightning bolt',
  /** Race the strike front out, hold it re-striking, then blow it out. */
  travel: 0.09,
  hold: 0.32,
  fade: 0.22,
  strands: 9,
  sparkRate: 900,
  flash: 0.7,
  shake: 0.5,
  light: 22
};

export const AURA = {
  label: 'Aura',
  /** A sustained state, not a one-shot: held until switched off. */
  fadeIn: 0.35,
  fadeOut: 0.5,
  /** Fresnel shell sitting just off the silhouette. */
  shellRadius: 1.35,
  shellOpacity: 0.32,
  moteRate: 70,
  moteRise: 1.6,
  moteLife: 1.3,
  light: 8,
  pulseSpeed: 1.4,
  pulseDepth: 0.18
};
