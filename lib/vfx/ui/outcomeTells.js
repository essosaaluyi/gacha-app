/**
 * The anticipation ladder.
 *
 * Each entry is one rung: a colour, how loud it is, and how much spectacle the
 * draw itself gets. The rung is an *expectancy*, not an outcome — white appears
 * constantly and means almost nothing, gold is rare and never lies. What
 * decides which rung a draw gets lives in lib/battle-pixi/presentation/
 * drawTell.ts, next to the odds it is derived from; this file only says what
 * each rung looks like.
 *
 * Escalation runs on two axes so the low rungs stay cheap. White and blue are
 * glitter only; green and above add the arc discharge, which is what makes the
 * jump from blue to green feel like a different kind of event rather than a
 * brighter one.
 *
 * `glitter` is the rung's loudness: how dense a field of sparks it throws,
 * relative to the deck's own size. It is the ladder's main axis now that the
 * glow ring is gone — the ring read as a decal stuck over the art rather than
 * as the disc lighting up.
 *
 * The numbers are set here rather than derived from `thickness`, which is what
 * they were at first. Reusing the ring's widths meant the top of the ladder
 * arrived at roughly twice the density of the middle, and on a disc this small
 * that is not "louder", it is a solid sheet of light with the DRAW button lost
 * somewhere underneath. Spacing them by eye keeps gold unmistakably the top of
 * the ladder while leaving the button readable through it.
 *
 * `thickness` is now vestigial: it was the ring's width in pixels and nothing
 * draws a ring any more.
 */

export const TELLS = {
  /** Fires on more than a quarter of all draws. Means ~2%. */
  white: {
    label: 'White',
    color: '#cfe4ff',
    arcHalo: '#4a6a8f',
    coreColor: '#ffffff',
    thickness: 14,
    glitter: 0.55,
    pulseSpeed: 1.8,
    pulseDepth: 0.08,
    trailRate: 60,
    trailSize: 4,
    burstCount: 30,
    burstSpeed: 170,
    slotFlash: 0.15
  },

  /** ~15% of draws. Means ~5%. */
  blue: {
    label: 'Blue',
    color: '#3fa9ff',
    arcHalo: '#0050ff',
    coreColor: '#dbefff',
    thickness: 20,
    glitter: 1.0,
    pulseSpeed: 2.4,
    pulseDepth: 0.13,
    trailRate: 120,
    trailSize: 5,
    burstCount: 55,
    burstSpeed: 190,
    slotFlash: 0.4
  },

  /** 1 in 30. Means ~35% — better than even odds once you discount the base. */
  green: {
    label: 'Green',
    color: '#3ddb87',
    arcHalo: '#00a860',
    coreColor: '#e2fff0',
    thickness: 26,
    glitter: 1.5,
    pulseSpeed: 2.9,
    pulseDepth: 0.18,
    trailRate: 180,
    trailSize: 5.5,
    burstCount: 80,
    burstSpeed: 220,
    slotFlash: 0.6
  },

  /** 1 in 94. Means 90% — wrong one time in ten, which is the whole point. */
  red: {
    label: 'Red',
    color: '#ff4d4d',
    arcHalo: '#a00000',
    coreColor: '#ffdede',
    thickness: 32,
    glitter: 1.95,
    pulseSpeed: 3.8,
    pulseDepth: 0.26,
    trailRate: 240,
    trailSize: 6,
    burstCount: 120,
    burstSpeed: 265,
    slotFlash: 0.85
  },

  /** 1 in 741 in normal play. Never lies. */
  gold: {
    label: 'Gold',
    color: '#ffc857',
    arcHalo: '#8a5a00',
    coreColor: '#fffdf2',
    thickness: 40,
    glitter: 2.05,
    pulseSpeed: 4.4,
    pulseDepth: 0.32,
    trailRate: 300,
    trailSize: 7,
    burstCount: 150,
    burstSpeed: 300,
    slotFlash: 1
  },

  /** No rung rolled. Nothing is drawn; kept so callers can resolve a name. */
  neutral: {
    label: 'Neutral',
    color: '#7c8698',
    arcHalo: '#3a4252',
    coreColor: '#c9d2e0',
    thickness: 10,
    glitter: 0,
    pulseSpeed: 1.6,
    pulseDepth: 0.06,
    trailRate: 45,
    trailSize: 4,
    burstCount: 26,
    burstSpeed: 170,
    slotFlash: 0.12
  }
};

export const GLITTER = {
  white: { a: '#ffffff', b: '#eaf3ff', c: '#b9d0ee', d: '#6f8bb0' },
  gold: { a: '#ffe2a0', b: '#ffc44e', c: '#e89410', d: '#5a3a00' },

  /**
   * One palette per rung, so the ladder's colour rides on the glitter itself.
   *
   * It used to ride on a glow ring hugging the disc, and the glitter was a
   * fixed gold on every rung. With the ring gone the glitter is the only thing
   * left carrying the colour, so it has to be the thing that changes — without
   * these, every rung from white to gold would sparkle identically and the
   * ladder would say nothing.
   *
   * Each runs a light tint of the rung -> the rung -> its darker halo. The
   * first stop is deliberately not white: a glitter spends the front of its
   * life there, and starting from white washed red and gold into the same
   * bright sparkle, which is exactly the distinction the ladder needs to keep.
   * White itself is the exception, because white *is* its colour.
   */
  blue: { a: '#eaf6ff', b: '#7ac6ff', c: '#1b8fff', d: '#04305f' },
  green: { a: '#ecfff5', b: '#7cf0b6', c: '#16c874', d: '#04482a' },
  red: { a: '#ffecec', b: '#ff8f8f', c: '#ff2323', d: '#560000' },

  /** Particles per second across the whole face. */
  rate: 22,
  /**
   * Sizes are drawn from a biased curve rather than emit()'s own variance,
   * which is uniform — uniform spread means as many large sparkles as small
   * ones, and a face full of large ones is what read as excessive. With
   * sizeBias 3 roughly four in five land in the lower half of the range, so the
   * field is mostly fine glitter with the occasional big one catching the eye.
   */
  sizeMin: 8,
  sizeMax: 30,
  sizeBias: 3,
  life: 1.5,
  lifeVariance: 0.45,
  /** Gentle rise, in pixels per second. Negative y is up in this layer. */
  drift: 14,
  /** Fractions of a lifetime: slow bloom in, slow fade out. */
  fadeIn: 0.35,
  fadeOut: 0.42,
  sizeIn: 0.22,
  endSize: 0.85,
  /** Needle thinness: lower is sharper. */
  needle: 0.04,
  /** Radians per second. A little drift keeps the crosses from looking stamped. */
  spin: 0.5,
  /** Keep glitter off the very edge so it reads as *on* the card, not around it. */
  inset: 10,
  /** How fast the field clears once the draw starts. */
  stopFade: 0.18
};

export function tellFor(name) {
  return TELLS[name] ?? TELLS.neutral;
}

/** Seconds. Shared across tells so the deck's rhythm stays consistent. */
export const TIMING = {
  /** Glow ramps in on the first click and holds while the draw is armed. */
  glowIn: 0.28,
  glowOut: 0.45,
  /** How long the card takes to clear the slot. */
  draw: 0.5
};
