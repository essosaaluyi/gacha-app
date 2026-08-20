import { ScreenFxLayer } from './ScreenFxLayer.js';
import { DomShake } from './DomShake.js';
import { tellFor } from './outcomeTells.js';

/**
 * What each rung of the ladder does at the disc.
 *
 * Note what is *not* here any more: a probability. Whether a draw shows a cue
 * at all, and which colour, is decided once by the ladder in drawTell.ts, where
 * it can be reasoned about against the real odds. Re-rolling it here would put
 * two independent dice on the same decision and make the reliabilities a lie.
 *
 * The arcs are the second axis. White and blue get glow and glitter only;
 * green and above add the discharge, so the step from blue to green reads as a
 * different kind of event rather than a brighter one.
 */
export const OUTCOME_RULES = {
  white: { tell: 'white', lightning: false },
  blue: { tell: 'blue', lightning: false },
  green: { tell: 'green', lightning: true },
  red: { tell: 'red', lightning: true },
  gold: { tell: 'gold', lightning: true },
  /** No rung rolled: the disc stays dark. */
  normal: { tell: 'neutral', lightning: false }
};

/**
 * What a card does when it lands, keyed by the symbol that actually landed —
 * not by the rung. The rung was a prediction; this is the fact. A cue that
 * promised nothing can still be followed by a chance card, and it should still
 * land like one.
 */
export const LANDING_RULES = {
  /** The headline: wave, sparks, and the full jolt. */
  chance: { tell: 'blue', landing: 'full' },
  /** An attack that reached its target: sparks and a lighter jolt, no wave. */
  attack: { tell: 'red', landing: 'impact' }
};

export function landingRulesFor(symbol) {
  return LANDING_RULES[symbol] ?? null;
}

export function rulesFor(outcome) {
  return OUTCOME_RULES[outcome] ?? OUTCOME_RULES.normal;
}

/**
 * The deck size the tells in outcomeTells.js were tuned against, in pixels.
 * Anything expressed in pixels there — glow thickness, arc reach — is scaled by
 * how far the real deck departs from this.
 */
const DECK_REFERENCE_SIZE = 132;
/**
 * Global multiplier on glitter density, on top of the deck's size and the
 * rung's own weight. One dial for "the whole ladder is too loud / too quiet"
 * without disturbing the spacing between rungs.
 */
const GLITTER_BOOST = 1;
/**
 * How much of the settled glitter field is scattered the instant the tell arms,
 * as a fraction of its own steady state.
 *
 * The rate emitter alone needs a second or two to build a field anyone would
 * notice. That was acceptable while a glow ring carried the first read, but the
 * ring is gone — so the glitter has to be the thing that lands on the press, or
 * the low rungs never register before the player presses again.
 *
 * Short of 1 on purpose: arriving at exactly the settled density is a hard cut,
 * whereas landing just under it and letting the emitter close the gap reads as
 * the disc catching light.
 */
const GLITTER_PRIME = 0.72;
/**
 * How long a trail particle lives, in seconds. The cards themselves cross in
 * about a third of a second; this is what carries the streak on after them so
 * the whole gesture lasts about a second rather than vanishing with the card.
 */
const TRAIL_LIFE = 0.62;
/**
 * Arc reach as a multiple of the deck's longest side.
 *
 * Kept under 1 deliberately. Longer arcs looked impressive in isolation but the
 * holder sits hard against the left edge of the cabinet, so anything much
 * beyond the disc's own radius runs off the screen on one side and a quarter of
 * the way across the table on the other. A discharge should read as belonging
 * to the disc, which means dying not far past its rim.
 */
const ARC_REACH_RATIO = 0.72;

/**
 * The game-facing wrapper around the effects layer.
 *
 * Five calls, one per beat of a draw:
 *
 *   1. `armDraw(deckEl, outcome)`  — first click on the draw button
 *   2. `drawCard(deckEl, cardEl, outcome)` — the card leaves the deck
 *   3. `cardLanded(targetEl, outcome)` — it lands on the table
 *   4. `cancelDraw()` — the player backed out
 *   5. `dispose()`
 *
 * The outcome is whatever your game already decided. Nothing here rolls dice
 * about *what* the card is; it only decides how loudly to announce it.
 */
export class DeckFx {
  /**
   * @param {HTMLCanvasElement} canvas the overlay canvas, pointer-events: none
   * @param {HTMLElement} host the element positions are measured against, and
   *   by default the element the shake is applied to — the board, not the page
   * @param {object} [options]
   * @param {'white'|'gold'} [options.glitterTone] fallback glitter palette for
   *   callers that light the deck without a rung. The anticipation ladder does
   *   not use it: each rung brings its own palette, which is how the ladder's
   *   colour is carried now that the glow ring is gone.
   * @param {HTMLElement} [options.shakeTarget] what jolts, when that is not the
   *   same element the canvas covers. A canvas stretched over the whole viewport
   *   measures in viewport coordinates, but the thing that should shake is still
   *   the machine, not the window.
   * @param {'viewport'|HTMLElement} [options.origin] what coordinates are
   *   relative to. 'viewport' means getBoundingClientRect values are used as
   *   they come, which is what a full-viewport canvas wants.
   */
  constructor(canvas, host, options = {}) {
    const { glitterTone = 'gold', shakeTarget = host, origin = host } = options;

    this.host = host;
    this.origin = origin;
    this.glitterTone = glitterTone;
    this.layer = new ScreenFxLayer(canvas);
    this.shake = new DomShake(shakeTarget);
    this.layer.start();

    /** Whether the current draw was chosen to show its tell. */
    this._armedTell = null;
  }

  /** Viewport rect → the space the overlay draws in. */
  _rect(element) {
    const r = element.getBoundingClientRect();
    if (this.origin === 'viewport') {
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    }
    const h = this.origin.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, width: r.width, height: r.height };
  }

  /**
   * Place effects at a point that has no element — a card inside a canvas, say.
   * Takes viewport coordinates and returns them in the overlay's space.
   *
   * @param {{x:number,y:number}} point
   */
  toOverlay(point) {
    if (this.origin === 'viewport') return { x: point.x, y: point.y };
    const h = this.origin.getBoundingClientRect();
    return { x: point.x - h.left, y: point.y - h.top };
  }

  _centre(element) {
    const r = this._rect(element);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }

  /**
   * Where the card leaves the deck: the point on the deck's border that the
   * draw travels through.
   *
   * The burst has to come out of the slot, not out of the middle of the deck —
   * a spray from the centre reads as the deck exploding rather than as a card
   * being pulled. Deriving it from the travel direction rather than asking the
   * game for a slot element means a deck can sit anywhere on the table and
   * still throw its sparks the right way.
   *
   * @param {{x,y,width,height}} rect the deck, host-relative
   * @param {{x:number,y:number}} toward where the card is going
   */
  _exitPoint(rect, toward) {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const dx = toward.x - cx;
    const dy = toward.y - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };

    // Ray-box: whichever axis the ray crosses first is the border it leaves by.
    const tx = dx === 0 ? Infinity : rect.width / 2 / Math.abs(dx);
    const ty = dy === 0 ? Infinity : rect.height / 2 / Math.abs(dy);
    const t = Math.min(tx, ty);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  /**
   * First click on the draw button. Lights the deck and starts the glitter —
   * but only sometimes, per the outcome's `auraChance`.
   *
   * @param {HTMLElement} deckEl
   * @param {string} outcome
   * @param {object} [options]
   * @param {'rect'|'disc'} [options.shape] the deck's silhouette. A disc gets a
   *   glow that hugs its edge and glitter scattered inside the circle instead
   *   of across its bounding box.
   * @param {number} [options.radius] corner radius in px, to match the deck's
   *   CSS. Defaults to the deck's own half-extent for a disc.
   * @returns {boolean} whether the tell was shown, for logging or tuning
   */
  armDraw(deckEl, rung, options = {}) {
    const rules = OUTCOME_RULES[rung];
    // No dice here. drawTell.ts already rolled this against the real odds, and
    // a second roll would make the reliabilities it publishes untrue.
    if (!rules || rung === 'normal') {
      this._armedTell = null;
      return false;
    }

    this._armedTell = rung;

    const { shape = 'rect', inset = 0 } = options;
    const rect = this._insetRect(this._rect(deckEl), inset);

    // No ring. A drawn outline round the disc read as a decal pasted over the
    // art rather than as the disc itself lighting up, and its stroke could not
    // hold a clean edge at the sizes this deck is actually rendered at. The
    // rung now speaks entirely through the glitter: its colour, and how much of
    // it there is.
    // The weight rides in the scale, so it already reaches the prime: a louder
    // rung has a denser settled field, and therefore a bigger opening scatter.
    this.layer.startGlitter(
      rect,
      rules.tell,
      shape,
      this._deckScale(rect) * GLITTER_BOOST * this._glitterWeight(rules.tell),
      GLITTER_PRIME
    );
    return true;
  }

  /**
   * How much glitter a rung earns.
   *
   * Colour alone is a weak ladder — blue against green is easy to miss in
   * peripheral vision, and the low rungs fire often enough that they have to
   * stay quiet. Density is the second axis: white is a faint dusting, gold is a
   * face full of sparks.
   */
  _glitterWeight(tellName) {
    return tellFor(tellName).glitter ?? 0;
  }

  /** How far this deck departs from the size the tells were tuned against. */
  _deckScale(rect) {
    return Math.max(0.75, Math.min(rect.width, rect.height) / DECK_REFERENCE_SIZE);
  }

  /** Shrink a rect on all sides, so a glow can hug art inside its own box. */
  _insetRect(rect, inset) {
    if (!inset) return rect;
    return {
      x: rect.x + inset,
      y: rect.y + inset,
      width: Math.max(1, rect.width - inset * 2),
      height: Math.max(1, rect.height - inset * 2)
    };
  }

  /**
   * The card is pulled out of the deck. Trails it and throws the arc discharge
   * when the outcome earns one.
   *
   * @param {HTMLElement} deckEl
   * @param {HTMLElement|{x:number,y:number}|Array<{x,y,delay?,duration?}>} landing
   *   where the cards end up — the slots they land in, not the cards. A card
   *   mid-deal measures wherever its animation currently has it, which at the
   *   moment of the click is still the deck. Bare points work too, for
   *   destinations that live inside a canvas, and an array gives one trail per
   *   card so three cards read as three rather than as one wide smear.
   * @param {string} outcome
   * @param {number} [durationSeconds] to match your deal animation
   */
  drawCard(deckEl, rung, landing, durationSeconds = 0.45) {
    const rules = OUTCOME_RULES[rung] ?? OUTCOME_RULES.normal;
    const deck = this._rect(deckEl);
    const centre = { x: deck.x + deck.width / 2, y: deck.y + deck.height / 2 };

    const targets = Array.isArray(landing)
      ? landing
      : [landing instanceof Element ? this._centre(landing) : landing];

    this.layer.stopGlitter();

    // A trail per card, out of the edge of the deck that faces it. No burst at
    // the slot: a dense radial spray of stretched sparks at the exit reads as
    // liquid rather than as light, and the trails alone say "a card left here"
    // more clearly than a splash plus a trail ever did.
    targets.forEach((target, index) => {
      const exit = this._exitPoint(deck, target);
      this.layer.drawTrail(
        exit,
        target,
        rules.tell,
        target.duration ?? durationSeconds,
        {
          replace: index === 0,
          delay: target.delay ?? 0,
          life: TRAIL_LIFE,
          // Tight to the path. This is the width of the streak, not of a spray.
          spread: Math.max(5, Math.min(deck.width, deck.height) * 0.045),
          sizeScale: this._deckScale(deck) * 0.8,
          // Thinned per card so three trails cost about what one and a half
          // did, rather than tripling the particle count on screen.
          rateScale: 1 / Math.max(1, targets.length ** 0.4)
        }
      );
    });

    // The discharge is the deck's, not the slot's: it wraps the whole object
    // the card is being torn out of, which is what makes it read as the deck
    // reacting rather than as something happening at one edge. Its reach is
    // proportional for the same reason the glow's thickness is — arcs that stop
    // inside the deck's own footprint read as damage to the art rather than as
    // something discharging off it.
    if (rules.lightning) {
      const reach = Math.max(deck.width, deck.height) * ARC_REACH_RATIO;
      this.layer.lightning(centre, rules.tell, reach);
    }
    this.layer.hideGlow();
  }

  /**
   * The card lands on the table. Shockwave, sparks and shake, scaled by what
   * the outcome was.
   *
   * @param {HTMLElement|{x:number,y:number}} target the slot it landed in, or
   *   the point it came to rest at when the table is a canvas and there is no
   *   element to measure
   * @param {string} outcome
   */
  cardLanded(target, symbol) {
    const rules = landingRulesFor(symbol);
    if (!rules) return;

    const point = target instanceof Element ? this._centre(target) : target;

    // Sparks fire on every landing that gets one; the wave is reserved for the
    // headline outcome so the two do not blur into the same beat.
    this.layer.slotBurst(point, rules.tell, { x: 0, y: -1 });

    if (rules.landing === 'full') {
      this.layer.shockwave(point, rules.tell);
      // The sandbox's "all at once" fires spark, shockwave and bolt together,
      // and their traumas stack: 0.25 + 0.45 + 0.16. That sum, not any one of
      // them, is the jolt this is meant to match.
      this.shake.add(0.86, 2.0, 24);
    } else {
      // A landing without a wave gets the shockwave's share alone.
      this.shake.add(0.45, 2.4, 26);
    }
  }

  /** The player backed out of an armed draw. */
  cancelDraw() {
    this._armedTell = null;
    this.layer.stopGlitter();
    this.layer.hideGlow();
  }

  /** Whether the current armed draw is showing its tell. */
  get armedTell() {
    return this._armedTell;
  }

  clear() {
    this.layer.clear();
    this.shake.stop();
  }

  dispose() {
    this.shake.dispose();
    this.layer.dispose();
  }
}
