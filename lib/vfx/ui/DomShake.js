/**
 * Camera shake for a DOM element.
 *
 * The ported CameraShake drives a 3D camera rig, which a card game laid out in
 * HTML does not have. This is the same maths applied to a CSS transform: layered
 * sines at incommensurate frequencies rather than white noise, so the motion
 * reads as weight instead of jitter, and trauma that decays *quadratically* —
 * which is what makes small hits feel snappy and big ones feel heavy.
 *
 * Two things keep it cheap and safe:
 *   - it only ever writes `transform`, so it never triggers layout
 *   - it restores the element's original transform on stop, so a shake that is
 *     interrupted does not leave the board permanently nudged
 *
 * Honours prefers-reduced-motion by refusing to start.
 */
export class DomShake {
  /**
   * @param {HTMLElement} element the container to shake — the board, not the page
   * @param {object} [options]
   * @param {number} [options.maxOffset] pixels at full trauma
   * @param {number} [options.maxRoll] degrees at full trauma
   */
  constructor(element, options = {}) {
    const { maxOffset = 14, maxRoll = 0.9 } = options;

    this.element = element;
    this.maxOffset = maxOffset;
    this.maxRoll = maxRoll;

    this.trauma = 0;
    this.decay = 1.6;
    this.frequency = 22;

    this._time = 0;
    this._raf = 0;
    this._last = 0;

    this._restoreInline = '';
    this._baseTransform = '';
    this._readBase();

    this._reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Whatever transform the element is already wearing, which the shake adds to
   * rather than replaces.
   *
   * Read fresh at the start of every shake, not once at construction. The
   * transform can be a stylesheet rule (the cabinet's scale used to be a class)
   * or an inline style the host rewrites on resize, and a stale base restored
   * on stop would leave the element at the wrong size. Only the inline value is
   * restored, so a stylesheet simply takes back over.
   */
  _readBase() {
    this._restoreInline = this.element.style.transform || '';
    const computed =
      typeof window !== 'undefined'
        ? window.getComputedStyle(this.element).transform
        : 'none';
    this._baseTransform =
      this._restoreInline || (computed && computed !== 'none' ? computed : '');
  }

  /**
   * @param {number} amount 0..1 trauma to add; stacks with what is already there
   * @param {number} [decay] trauma units per second
   * @param {number} [frequency] shakes per second
   */
  add(amount, decay = 1.6, frequency = 22) {
    if (this._reduced) return;
    this.trauma = Math.min(1, this.trauma + amount);
    this.decay = decay;
    this.frequency = frequency;
    if (!this._raf) {
      this._readBase();
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._frame);
    }
  }

  _frame = (now) => {
    // Clamped so a backgrounded tab does not resume with one enormous step.
    const dt = Math.min((now - this._last) / 1000, 1 / 20);
    this._last = now;
    this._time += dt;

    if (this.trauma <= 0.0001) {
      this.stop();
      return;
    }

    // Quadratic falloff: perceptually linear shake for a linear trauma decay.
    const shake = this.trauma * this.trauma;
    const t = this._time * this.frequency;

    const nx = Math.sin(t * 1.0) * 0.6 + Math.sin(t * 2.31 + 1.7) * 0.4;
    const ny = Math.sin(t * 1.37 + 4.2) * 0.6 + Math.sin(t * 2.79 + 0.3) * 0.4;
    const nz = Math.sin(t * 0.83 + 2.9) * 0.6 + Math.sin(t * 3.11 + 5.1) * 0.4;

    const x = nx * shake * this.maxOffset;
    const y = ny * shake * this.maxOffset * 0.7;
    const roll = nz * shake * this.maxRoll;

    this.element.style.transform =
      `${this._baseTransform} translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${roll.toFixed(3)}deg)`;

    this.trauma = Math.max(0, this.trauma - this.decay * dt);
    this._raf = requestAnimationFrame(this._frame);
  };

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.trauma = 0;
    this.element.style.transform = this._restoreInline;
  }

  dispose() {
    this.stop();
  }
}
