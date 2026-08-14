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
   *   the element the shake is applied to — the board, not the page
   * @param {object} [options]
   * @param {'white'|'gold'} [options.glitterTone]
   */
  constructor(canvas, host, options = {}) {
    const { glitterTone = 'gold' } = options;

    this.host = host;
    this.glitterTone = glitterTone;
    this.layer = new ScreenFxLayer(canvas);
    this.shake = new DomShake(host);
    this.layer.start();

    /** Whether the current draw was chosen to show its tell. */
    this._armedTell = null;
  }

  /** Viewport rect → host-relative, which is what the overlay works in. */
  _rect(element) {
    const r = element.getBoundingClientRect();
    const h = this.host.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, width: r.width, height: r.height };
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
   * @param {number} [cornerRadius] to match the deck's CSS
   * @returns {boolean} whether the tell was shown, for logging or tuning
   */
  armDraw(deckEl, outcome, cornerRadius = 14) {
    const rules = rulesFor(outcome);
    const show = rules.auraChance > 0 && Math.random() < rules.auraChance;

    this._armedTell = show ? rules.tell : null;
    if (!show) return false;

    const rect = this._rect(deckEl);
    this.layer.showGlow(rect, rules.tell, cornerRadius);
    this.layer.startGlitter(rect, this.glitterTone);
    return true;
  }

  /**
   * The card is pulled out of the deck. Trails it, bursts at the slot, and
   * throws the arc discharge when the outcome earns one.
   *
   * @param {HTMLElement} deckEl
   * @param {HTMLElement} landingEl where the card ends up — the slot it lands
   *   in, not the card itself. A card mid-deal measures wherever its animation
   *   currently has it, which at the moment of the click is still the deck.
   * @param {string} outcome
   * @param {number} [durationSeconds] to match your deal animation
   */
  drawCard(deckEl, landingEl, outcome, durationSeconds) {
    const rules = rulesFor(outcome);
    const deck = this._rect(deckEl);
    const centre = { x: deck.x + deck.width / 2, y: deck.y + deck.height / 2 };
    const to = this._centre(landingEl);
    const exit = this._exitPoint(deck, to);

    this.layer.stopGlitter();
    this.layer.slotBurst(exit, rules.tell, { x: to.x - exit.x, y: to.y - exit.y });
    this.layer.drawTrail(exit, to, rules.tell, durationSeconds);

    // The discharge is the deck's, not the slot's: it wraps the whole object
    // the card is being torn out of, which is what makes it read as the deck
    // reacting rather than as something happening at one edge.
    if (rules.lightning) this.layer.lightning(centre, rules.tell);
    this.layer.hideGlow();
  }

  /**
   * The card lands on the table. Shockwave, sparks and shake, scaled by what
   * the outcome was.
   *
   * @param {HTMLElement} targetEl the slot it landed in
   * @param {string} outcome
   */
  cardLanded(targetEl, outcome) {
    const rules = rulesFor(outcome);
    if (rules.landing === 'none') return;

    const point = this._centre(targetEl);

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
