import { settings } from '../config/settings.js';

/**
 * Shape the ported bolt into a thin, free-ending, white-cored arc.
 *
 * Its defaults describe a nine-filament bundle thrown at a target: wide fan,
 * heavy convergence on the far end, thick ribbon. Every one of those is wrong
 * for an arc that radiates out and simply stops.
 *
 * `scale` exists because the same material is used in two scenes with different
 * units. The battle scene works in world units (metres-ish), the UI overlay in
 * CSS pixels — so a jitter of "0.16 metres of kink" has to become about eight
 * pixels, and a width of 0.019 about one. Length-like values multiply by scale;
 * rate-like values, which are *per* unit length, divide by it.
 *
 * These write into the shared `settings.thunder`, so whichever scene fired most
 * recently owns them. Both call this immediately before drawing, so in practice
 * the values are always the ones that scene wants. If the two ever needed to be
 * on screen at the same time, this is the thing that would have to change.
 *
 * @param {object} palette an ELEMENT_COLORS entry
 * @param {number} [scale] units per world unit (1 for the 3D scene, ~50 for px)
 */
export function applyArcSettings(palette, scale = 1) {
  const t = settings.thunder;

  t.strands = 2;
  t.spread = 0.14 * scale; // a tight pair, not a fan
  t.spreadNear = 0.015 * scale;
  t.spreadCurve = 1.3;
  t.sag = 0; // radial arcs do not bow like a thrown bolt

  // The leading-edge heat blooms the last few percent of the arc. At the
  // default it puts a bright blob exactly where the tip is meant to vanish.
  t.tipGlow = 0.5;
  t.tipLength = 0.035;

  t.jitter = 0.16 * scale; // the sharp angular kinks
  t.jitterScale = 2.6 / scale; // kinks per unit length, so it divides
  t.octaves = 4;
  t.jitterFalloff = 0.6;
  t.converge = 0.22; // let tips wander instead of being pulled to a point
  t.pinch = 0.05;
  t.crawl = 2.4;

  // Wide enough that the hot core has pixels to occupy. Below about a pixel the
  // whole ribbon is sub-pixel, the white centre never rasterises, and only the
  // coloured halo pass survives — a thin line, but a uniformly coloured one.
  t.width = 0.019 * scale;

  // The taper is mix(1, widthTip, pow(t, widthCurve)) along the arc. A curve
  // above 1 holds the ribbon near full width and collapses it late, which gives
  // a needle point rather than a long even wedge.
  t.widthTip = 0.04;
  t.widthCurve = 1.7;

  t.coreWidth = 0.72;
  t.coreSharp = 4.6;
  t.glowWidth = 5.0;
  t.glowOpacity = 0.5;
  t.softFade = 0.78 * scale;

  t.restrike = 18; // the crackle: filaments re-roll 18x a second
  t.flicker = 0.34;
  t.flickerSpeed = 24;
  t.strandFlash = 0.55;

  // White filament inside a coloured glow. The core is forced white rather than
  // taken from the element so the line always reads as hot; only the sheath and
  // halo carry colour, which is how a white-hot arc actually looks.
  t.colorCore = '#ffffff';
  t.colorInner = '#eaf7ff';
  t.colorOuter = palette.outer;
  t.colorHalo = palette.deep;
  t.glow = 2.8;
}
