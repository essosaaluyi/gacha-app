import { ScreenFxLayer } from './ScreenFxLayer.js';
import { DomShake } from './DomShake.js';

/**
 * Outcome → how much spectacle it gets.
 *
 * `auraChance` is the important column and the reason this table exists. A tell
 * that fires every time turns the draw into a formality: once the player learns
 * "glow means something good", a glow stops being a promise and becomes a
 * label. Showing it only *some* of the time on a good outcome keeps it a
 * genuine anticipation beat — the same weighting the reveal videos already use,
 * where a rare pull only sometimes gets the bigger cut.
 *
 * Note what this does NOT do: it never shows the aura on an ordinary draw. The
 * aura is always truthful when it appears; it is simply silent part of the time
 * on the outcomes that deserve it. A false positive would teach the player to
 * distrust it, which costs more than the extra spectacle is worth.
 */
export const OUTCOME_RULES = {
  /** A chance card: the headline outcome. */
  chance: {
    tell: 'chance',
    auraChance: 0.85,
    lightning: true,
    landing: 'full' // shockwave + sparks + shake
  },
  /** An attack on a target. */
  attack: {
    tell: 'attack',
    auraChance: 0.7,
    lightning: true,
    landing: 'impact' // sparks + shake, no wave
  },
  /** Three of a kind, or whatever your triple combination is. */
  triple: {
    tell: 'beneficial',
    auraChance: 0.75,
    lightning: true,
    landing: 'impact'
  },
  /** Anything else. Quiet. */
  normal: {
    tell: 'neutral',
    auraChance: 0,
    lightning: false,
    landing: 'none'
  }
};

export function rulesFor(outcome) {
  return OUTCOME_RULES[outcome] ?? OUTCOME_RULES.normal;
}

/**
 * The deck size the tells in outcomeTells.js were tuned against, in pixels.
 * Anything expressed in pixels there — glow thickness, arc reach — is scaled by
 * how far the real deck departs from this.
 */
const DECK_REFERENCE_SIZE = 132;
/** Arc reach as a multiple of the deck's longest side, from the same tuning. */
const ARC_REACH_RATIO = 1.44;

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
   * @param {'white'|'gold'} [options.glitterTone]
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
  armDraw(deckEl, outcome, options = {}) {
    const rules = rulesFor(outcome);
    const show = rules.auraChance > 0 && Math.random() < rules.auraChance;

    this._armedTell = show ? rules.tell : null;
    if (!show) return false;

    const { shape = 'rect', inset = 0 } = options;
    const rect = this._insetRect(this._rect(deckEl), inset);
    // A rounded box whose radius is its own half-extent *is* a circle, so the
    // same signed-distance glow draws both shapes with nothing switched.
    const radius = options.radius ??
      (shape === 'disc' ? Math.min(rect.width, rect.height) / 2 : 14);

    this.layer.showGlow(rect, rules.tell, radius, this._glowThickness(rect, rules.tell));
    this.layer.startGlitter(rect, this.glitterTone, shape);
    return true;
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
   * The tells carry a glow thickness in pixels, and pixels only mean the same
   * thing at one deck size. Held fixed, the same 22px band that reads as an
   * aura around a small deck reads as a drawn outline around a large one — the
   * band has to keep its *proportion* to the thing it surrounds, not its width.
   */
  _glowThickness(rect, tell) {
    const scale = Math.min(rect.width, rect.height) / DECK_REFERENCE_SIZE;
    return tell.thickness * Math.max(0.75, scale);
  }

  /**
   * The card is pulled out of the deck. Trails it, bursts at the slot, and
   * throws the arc discharge when the outcome earns one.
   *
   * @param {HTMLElement} deckEl
   * @param {HTMLElement|{x:number,y:number}} landing where the card ends up —
   *   the slot it lands in, not the card itself. A card mid-deal measures
   *   wherever its animation currently has it, which at the moment of the click
   *   is still the deck. A bare point works too, for a destination that has no
   *   element because it lives inside a canvas.
   * @param {string} outcome
   * @param {number} [durationSeconds] to match your deal animation
   */
  drawCard(deckEl, landing, outcome, durationSeconds) {
    const rules = rulesFor(outcome);
    const deck = this._rect(deckEl);
    const centre = { x: deck.x + deck.width / 2, y: deck.y + deck.height / 2 };
    const to = landing instanceof Element ? this._centre(landing) : landing;
    const exit = this._exitPoint(deck, to);

    this.layer.stopGlitter();
    this.layer.slotBurst(exit, rules.tell, { x: to.x - exit.x, y: to.y - exit.y });
    this.layer.drawTrail(exit, to, rules.tell, durationSeconds);

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
  cardLanded(target, outcome) {
    const rules = rulesFor(outcome);
    if (rules.landing === 'none') return;

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
