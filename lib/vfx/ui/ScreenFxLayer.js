import {
  Color,
  DataTexture,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  Vector3,
  WebGLRenderer
} from 'three';

import { ParticleEngine, RateEmitter } from '../particles/ParticleEngine.js';
import { ParticleShape } from '../particles/ParticleSystem.js';
import { frame } from '../core/FrameUniforms.js';
import { LAYER } from '../core/Layers.js';
import { Time } from '../core/Time.js';
import { getColor } from '../utils/color.js';
import { Easing, saturate } from '../utils/math.js';
import { disposeObject } from '../utils/dispose.js';
import { createDeckGlowMaterial } from './DeckGlowMaterial.js';
import { TIMING, tellFor } from './outcomeTells.js';

/**
 * A transparent WebGL layer that sits over the DOM and draws effects anchored
 * to real elements.
 *
 * Two decisions make this cheap enough to leave running under a UI:
 *
 * **Orthographic, one unit per CSS pixel.** The camera is set up so scene
 * coordinates *are* viewport coordinates, which means a `getBoundingClientRect()`
 * can be handed straight to an effect. No projection maths, no drift when the
 * layout reflows.
 *
 * **No post-processing.** The reveal and battle scenes run a depth prepass,
 * a distortion pass and bloom. None of that survives contact with a transparent
 * overlay, and none of it is needed: additive blending plus glow built into the
 * shaders gets the same read for a handful of draw calls. This layer costs
 * essentially nothing when idle.
 *
 * The canvas must be `pointer-events: none` so the UI underneath stays usable.
 */
export class ScreenFxLayer {
  constructor(canvas, options = {}) {
    const { pixelRatioCap = 2 } = options;

    this.canvas = canvas;
    this.pixelRatioCap = pixelRatioCap;
    this.time = new Time();
    this.elapsed = 0;
    this._raf = 0;
    this._disposed = false;

    this.gl = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false, // additive glow over DOM: edges are soft anyway
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false
    });
    this.gl.setClearColor(0x000000, 0);
    this.gl.info.autoReset = false;

    this.scene = new Scene();

    // Left/top at the origin so scene space matches DOM space exactly.
    this.camera = new OrthographicCamera(0, 1, 0, 1, -1000, 1000);
    this.camera.position.z = 10;
    // ParticleSystem puts its meshes on LAYER.VFX. A camera only sees layer 0
    // by default, so without this the particles simulate perfectly and are
    // culled before they are ever drawn.
    this.camera.layers.enable(LAYER.VFX);

    // Soft particles sample the depth buffer; there is no depth pass here, so
    // point it at a 1×1 white texture, which reads as "infinitely far" and
    // makes the term a no-op instead of undefined.
    this._whiteDepth = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat);
    this._whiteDepth.needsUpdate = true;
    frame.uSceneDepth.value = this._whiteDepth;

    this.particles = new ParticleEngine(this.scene);
    this._buildParticles();
    this._buildGlow();

    /* ---- glow state ---- */
    this._glow = {
      visible: false,
      amount: 0,
      target: 0,
      tell: tellFor('neutral'),
      rect: { x: 0, y: 0, width: 0, height: 0 },
      radius: 14
    };

    /* ---- draw-trail state ---- */
    this._trail = null;
    this._trailEmitter = new RateEmitter(0);

    this._resizeObserver = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this._resizeObserver.observe(canvas.parentElement);
    this.resize();
  }

  _buildParticles() {
    // Sizes and speeds here are in pixels and pixels/second, because that is
    // what a unit means in this scene.
    this.trail = this.particles.get('ui.trail', {
      capacity: 1400,
      shape: ParticleShape.SOFT,
      additive: true,
      curl: true,
      softFade: 0
    });
    this.trail.uniforms.uGravity.value.set(0, 40, 0); // +y is downward here
    this.trail.uniforms.uDrag.value = 1.6;
    this.trail.uniforms.uTurbulence.value = 24;
    this.trail.uniforms.uTurbFrequency.value = 0.012;
    this.trail.uniforms.uEndSize.value = 0.15;
    this.trail.uniforms.uFadeIn.value = 0.06;
    this.trail.uniforms.uFadeOut.value = 0.45;

    this.burst = this.particles.get('ui.burst', {
      capacity: 900,
      shape: ParticleShape.STREAK,
      additive: true,
      stretch: true,
      softFade: 0
    });
    this.burst.uniforms.uGravity.value.set(0, 220, 0);
    this.burst.uniforms.uDrag.value = 2.4;
    this.burst.uniforms.uEndSize.value = 0.1;
    this.burst.uniforms.uFadeOut.value = 0.4;
    // Streak length is `1 + uStretch * speed`, and the ported default assumes
    // speed in metres per second. Here speed is pixels per second — hundreds,
    // not single digits — so the default turns a spark into a 600px laser.
    this.burst.uniforms.uStretch.value = 0.005;
  }

  _buildGlow() {
    this.glowMaterial = createDeckGlowMaterial();
    // A unit quad the material scales in its vertex shader.
    this.glowMesh = new Mesh(new PlaneGeometry(1, 1), this.glowMaterial);
    this.glowMesh.frustumCulled = false;
    this.glowMesh.visible = false;
    this.glowMesh.renderOrder = 0;
    this.scene.add(this.glowMesh);

    this._glowState = {
      time: 0,
      amount: 0,
      halfWidth: 1,
      halfHeight: 1,
      radius: 14,
      thickness: 24,
      pulseSpeed: 2.4,
      pulseDepth: 0.15,
      color: new Color(),
      coreColor: new Color()
    };
  }

  /* ------------------------------------------------------------------ */
  /* Public API — everything takes viewport coordinates                  */
  /* ------------------------------------------------------------------ */

  /**
   * Light the deck up in an outcome colour. Call on the arming click.
   *
   * @param {DOMRect|object} rect the element's viewport rect
   * @param {string} tellName key into TELLS
   * @param {number} [radius] corner radius in px, to match the element's CSS
   */
  showGlow(rect, tellName, radius = 14) {
    this._glow.rect = rect;
    this._glow.radius = radius;
    this._glow.tell = tellFor(tellName);
    this._glow.target = 1;
    this._glow.visible = true;
    this.glowMesh.visible = true;
  }

  /** Keep the glow tracking an element that moved or resized. */
  updateGlowRect(rect) {
    this._glow.rect = rect;
  }

  hideGlow() {
    this._glow.target = 0;
  }

  /**
   * Particles trailing a card as it is pulled out of the deck.
   *
   * Emitted along the travel direction rather than radially, which is what
   * makes it read as motion rather than as a generic sparkle.
   *
   * @param {{x:number,y:number}} from slot position
   * @param {{x:number,y:number}} to where the card ends up
   * @param {string} tellName
   * @param {number} [duration] seconds
   */
  drawTrail(from, to, tellName, duration = TIMING.draw) {
    const tell = tellFor(tellName);
    this.trail.setGradient(
      getColor(tell.coreColor), getColor(tell.color), getColor(tell.color), getColor(tell.color)
    );
    this._trail = { from, to, tell, duration, t: 0 };
    this._trailEmitter.reset();
  }

  /**
   * A burst of light at the slot the card leaves through.
   *
   * @param {{x:number,y:number}} point
   * @param {string} tellName
   * @param {number} [spread] radians, 0 = a tight fan along `direction`
   * @param {{x:number,y:number}} [direction] unit vector the burst favours
   */
  slotBurst(point, tellName, direction = { x: 0, y: -1 }) {
    const tell = tellFor(tellName);

    this.burst.setGradient(
      getColor(tell.coreColor), getColor(tell.color), getColor(tell.color), getColor(tell.color)
    );

    const tint = getColor(tell.coreColor);
    const dir = new Vector3(direction.x, direction.y, 0).normalize();

    this.burst.emit(tell.burstCount, {
      position: new Vector3(point.x, point.y, 0),
      radius: 6,
      direction: dir,
      speed: tell.burstSpeed,
      speedVariance: 0.7,
      // Wide enough to read as a burst, biased along `direction` so it still
      // points out of the slot rather than washing over the deck.
      spread: 0.85,
      size: tell.trailSize * 3,
      sizeVariance: 0.6,
      life: 0.62,
      lifeVariance: 0.45,
      tint,
      time: this.elapsed
    });
  }

  clear() {
    this._trail = null;
    this._glow.target = 0;
    this._glow.amount = 0;
    this.glowMesh.visible = false;
    this.particles.reset();
  }

  /* ------------------------------------------------------------------ */

  start() {
    this.time.reset();
    const loop = () => {
      if (this._disposed) return;
      this._raf = requestAnimationFrame(loop);
      this.frame();
    };
    this._raf = requestAnimationFrame(loop);
  }

  pause() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  frame() {
    const dt = this.time.tick();
    this.elapsed += dt;
    this.gl.info.reset();

    frame.uTime.value = this.elapsed;
    frame.uDelta.value = dt;

    this._advanceGlow(dt);
    this._advanceTrail(dt);

    this.particles.flush();
    this.gl.render(this.scene, this.camera);
  }

  _advanceGlow(dt) {
    const g = this._glow;
    if (!g.visible && g.amount <= 0) return;

    const rate = g.target > g.amount ? dt / TIMING.glowIn : dt / TIMING.glowOut;
    const delta = g.target - g.amount;
    g.amount += Math.sign(delta) * Math.min(rate, Math.abs(delta));

    if (g.amount <= 0.001 && g.target === 0) {
      g.visible = false;
      this.glowMesh.visible = false;
      return;
    }

    const rect = g.rect;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    this.glowMesh.position.set(cx, cy, 0);

    const s = this._glowState;
    s.time = this.elapsed;
    s.amount = Easing.outCubic(saturate(g.amount));
    s.halfWidth = rect.width / 2;
    s.halfHeight = rect.height / 2;
    s.radius = g.radius;
    s.thickness = g.tell.thickness;
    s.pulseSpeed = g.tell.pulseSpeed;
    s.pulseDepth = g.tell.pulseDepth;
    s.color.copy(getColor(g.tell.color));
    s.coreColor.copy(getColor(g.tell.coreColor));
    this.glowMaterial.userData.sync(s);
  }

  _advanceTrail(dt) {
    if (!this._trail) return;

    const t = this._trail;
    t.t += dt;
    const u = saturate(t.t / t.duration);

    // Follow the card's eased path, and throw the particles the way it is going.
    const eased = Easing.outCubic(u);
    const x = t.from.x + (t.to.x - t.from.x) * eased;
    const y = t.from.y + (t.to.y - t.from.y) * eased;

    const dx = t.to.x - t.from.x;
    const dy = t.to.y - t.from.y;
    const length = Math.hypot(dx, dy) || 1;

    // Fade the emission out over the travel so the tail thins behind the card.
    const rate = t.tell.trailRate * (1 - u * 0.65);
    const count = this._trailEmitter.tick(dt, rate);

    if (count > 0) {
      const tint = getColor(t.tell.color);
      this.trail.emit(count, {
        position: new Vector3(x, y, 0),
        radius: 14,
        direction: new Vector3(dx / length, dy / length, 0),
        speed: 90,
        speedVariance: 0.8,
        spread: 0.5,
        size: t.tell.trailSize,
        sizeVariance: 0.6,
        life: 0.5,
        lifeVariance: 0.5,
        tint,
        time: this.elapsed
      });
    }

    if (u >= 1) this._trail = null;
  }

  /* ------------------------------------------------------------------ */

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.pixelRatioCap);

    this.gl.setPixelRatio(pixelRatio);
    this.gl.setSize(width, height, false);

    // One scene unit per CSS pixel, origin at the top-left, y downward — the
    // same convention getBoundingClientRect() reports in.
    this.camera.left = 0;
    this.camera.right = width;
    this.camera.top = 0;
    this.camera.bottom = height;
    this.camera.updateProjectionMatrix();

    frame.uResolution.value.set(width * pixelRatio, height * pixelRatio);
  }

  getStats() {
    const info = this.gl.info;
    return {
      calls: info.render.calls,
      triangles: info.render.triangles,
      particles: this.particles.countLive(this.elapsed)
    };
  }

  dispose() {
    this._disposed = true;
    this.pause();
    this._resizeObserver?.disconnect();
    this.particles.dispose();
    this.glowMaterial.dispose();
    this.glowMesh.geometry.dispose();
    this._whiteDepth.dispose();
    disposeObject(this.scene);
    frame.uSceneDepth.value = null;
    this.gl.dispose();
  }
}
