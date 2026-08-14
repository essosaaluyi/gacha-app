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

import { BoltPass, createLightningMaterial } from '../materials/LightningMaterial.js';
import { createBoltRibbonGeometry } from '../assets/ProceduralGeometry.js';
import { ParticleEngine, RateEmitter } from '../particles/ParticleEngine.js';
import { ParticleShape } from '../particles/ParticleSystem.js';
import { frame } from '../core/FrameUniforms.js';
import { LAYER } from '../core/Layers.js';
import { Time } from '../core/Time.js';
import { getColor } from '../utils/color.js';
import { Easing, saturate } from '../utils/math.js';
import { disposeObject } from '../utils/dispose.js';
import { createDeckGlowMaterial } from './DeckGlowMaterial.js';
import { GLITTER, TIMING, tellFor } from './outcomeTells.js';
import { applyArcSettings } from './arcSettings.js';

/** Arcs radiating from the strike point, plus forks off them. */
const ARC_COUNT = 11;
const FORK_COUNT = 6;
/** Pixels per world unit — the rescale the ported bolt settings need here. */
const PX_PER_UNIT = 46;
/** 1.00s end to end, matching the sandbox. */
const ARC_TIMING = { travel: 0.12, hold: 0.58, fade: 0.3 };
/** How far a shockwave ring expands over its life, as a multiple of its size. */
const RING_GROWTH = 7;

/* Scratch. The glitter loop emits every frame, so it must not allocate. */
const _pos = new Vector3();
const _dir = new Vector3();
const _tint = new Color();

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
    this._buildArcs();
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

    /* ---- glitter state ---- */
    this._glitter = { active: false, rect: null, tone: 'white', amount: 0 };
    this._glitterEmitter = new RateEmitter(0);

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

    // Glitter sitting on the deck's face while a draw is armed. No curl noise:
    // these twinkle in place, and the define would only cost shader work.
    this.glitter = this.particles.get('ui.glitter', {
      capacity: 500,
      shape: ParticleShape.SPARKLE,
      additive: true,
      softFade: 0
    });
    this.glitter.uniforms.uGravity.value.set(0, -GLITTER.drift, 0);
    this.glitter.uniforms.uDrag.value = 0.6;
    this.glitter.uniforms.uFadeIn.value = GLITTER.fadeIn;
    this.glitter.uniforms.uFadeOut.value = GLITTER.fadeOut;
    this.glitter.uniforms.uSizeIn.value = GLITTER.sizeIn;
    this.glitter.uniforms.uEndSize.value = GLITTER.endSize;
    this.glitter.uniforms.uGlow.value = 2.0;
    this.glitter.uniforms.uSparkNeedle.value = GLITTER.needle;

    this.rings = this.particles.get('ui.rings', {
      capacity: 24,
      shape: ParticleShape.RING,
      additive: true,
      softFade: 0
    });
    this.rings.uniforms.uGravity.value.set(0, 0, 0);
    this.rings.uniforms.uDrag.value = 2.4;
    // The ring expands by its size curve rather than by travelling, so this
    // multiplier is what turns one sprite into a wave front.
    this.rings.uniforms.uEndSize.value = RING_GROWTH;
    // …and this is what keeps it a *front*. Without it the stroke grows with
    // the radius and a wave that expands sevenfold arrives as a solid donut.
    this.rings.uniforms.uRingThin.value = 1;
    this.rings.uniforms.uFadeIn.value = 0.04;
    this.rings.uniforms.uFadeOut.value = 0.3;
    this.rings.uniforms.uGlow.value = 1.7;
  }

  _buildArcs() {
    // The same ribbon bolt the battle scene uses, in an orthographic scene where
    // one unit is one CSS pixel. Its vertices are placed from uOrigin/uTarget in
    // "world" space, which here just means screen space — so the geometry needs
    // no changes at all, only a unit rescale of the settings that describe
    // lengths. See applyArcSettings.
    this.boltGeometry = createBoltRibbonGeometry(64, 2);
    this.arcs = [];

    for (let i = 0; i < ARC_COUNT + FORK_COUNT; i++) {
      const materials = [
        createLightningMaterial(BoltPass.GLOW),
        createLightningMaterial(BoltPass.CORE)
      ];
      const meshes = materials.map((material, pass) => {
        const mesh = new Mesh(this.boltGeometry, material);
        mesh.frustumCulled = false;
        mesh.matrixAutoUpdate = false;
        mesh.layers.set(LAYER.VFX);
        mesh.renderOrder = 5 + pass;
        mesh.visible = false;
        this.scene.add(mesh);
        return mesh;
      });

      this.arcs.push({
        materials,
        meshes,
        isFork: i >= ARC_COUNT,
        state: {
          origin: new Vector3(),
          target: new Vector3(),
          side: new Vector3(0, 0, 1),
          progress: 1,
          fade: 1,
          seed: 0,
          strands: 2
        }
      });
    }

    this._arc = { active: false, t: 0, tell: tellFor('neutral') };
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
    if (this._glitter.rect) this._glitter.rect = rect;
  }

  /**
   * Start the glitter loop on the deck's face. Call alongside `showGlow` on the
   * arming click; it runs until `stopGlitter`.
   *
   * @param {DOMRect|object} rect the element's rect
   * @param {'white'|'gold'} [tone]
   */
  startGlitter(rect, tone = 'white') {
    const palette = GLITTER[tone] ?? GLITTER.white;
    this.glitter.setGradient(
      getColor(palette.a), getColor(palette.b), getColor(palette.c), getColor(palette.d)
    );
    this._glitter.active = true;
    this._glitter.rect = rect;
    this._glitter.tone = tone;
    this._glitter.amount = 1;
  }

  /**
   * Stop the loop. Emission ends immediately and the glitters already on the
   * card live out their own fade, so the field clears as a shimmer dying away
   * rather than a hard cut.
   */
  stopGlitter() {
    this._glitter.active = false;
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

  /**
   * A radial arc discharge centred on a point. Use for the draw itself.
   *
   * @param {{x:number,y:number}} point centre, in overlay coordinates
   * @param {string} tellName
   * @param {number} [reach] how far the arcs travel, in pixels
   */
  lightning(point, tellName, reach = 190) {
    const tell = tellFor(tellName);
    applyArcSettings({ outer: tell.color, deep: tell.arcHalo }, PX_PER_UNIT);

    const spin = Math.random() * Math.PI * 2;
    const mains = [];

    this.arcs.forEach((arc, i) => {
      if (!arc.isFork) {
        // Jittered ring: evenly spaced reads as a drawn star, purely random
        // leaves bald patches.
        const theta = spin + (i / ARC_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.42;
        const r = reach * (0.55 + Math.random() * 0.75);
        arc.state.origin.set(point.x, point.y, 0);
        arc.state.target.set(point.x + Math.cos(theta) * r, point.y + Math.sin(theta) * r, 0);
        mains.push(arc);
      } else {
        // Forks leave a main arc partway along and carry on at an angle, which
        // is what stops every filament being a spoke from the exact centre.
        const parent = mains[(Math.random() * mains.length) | 0];
        if (!parent) return;
        const u = 0.35 + Math.random() * 0.4;
        arc.state.origin.lerpVectors(parent.state.origin, parent.state.target, u);
        _dir.copy(parent.state.target).sub(parent.state.origin).normalize();
        const swing = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.7);
        const cs = Math.cos(swing);
        const sn = Math.sin(swing);
        arc.state.target.set(
          arc.state.origin.x + (_dir.x * cs - _dir.y * sn) * reach * 0.45,
          arc.state.origin.y + (_dir.x * sn + _dir.y * cs) * reach * 0.45,
          0
        );
      }
      arc.state.seed = Math.random() * 100;
      arc.state.progress = 1;
      arc.state.fade = 1;
      for (const mesh of arc.meshes) mesh.visible = true;
    });

    this._arc.active = true;
    this._arc.t = 0;
    this._arc.tell = tell;
  }

  /**
   * An expanding ring with a bright flash. Use when a card lands.
   *
   * @param {{x:number,y:number}} point
   * @param {string} tellName
   */
  shockwave(point, tellName) {
    const tell = tellFor(tellName);

    this.rings.setGradient(
      getColor(tell.coreColor), getColor(tell.color), getColor(tell.color), getColor(tell.color)
    );

    // RING draws one ring per particle, so a wave is two large ones expanding
    // by their own size curve — not a crowd of small ones travelling outward,
    // which just reads as scattered sprites. Two rather than one, with life
    // variance, so a second front chases the first out; three stacked so
    // brightly that the additive blend turned the middle solid.
    _tint.copy(getColor(tell.coreColor));
    _pos.set(point.x, point.y, 0);
    _dir.set(0, -1, 0);
    this.rings.emit(2, {
      position: _pos,
      radius: 2,
      direction: _dir,
      speed: 4,
      speedVariance: 0.4,
      spread: 0.6,
      // Final diameter is size × RING_GROWTH, so this starts a touch narrower
      // than the card and ends about twice its width.
      size: 34,
      sizeVariance: 0.14,
      life: 0.42,
      lifeVariance: 0.3,
      tint: _tint,
      time: this.elapsed
    });
  }

  clear() {
    this._arc.active = false;
    for (const arc of this.arcs) for (const mesh of arc.meshes) mesh.visible = false;
    this._trail = null;
    this._glitter.active = false;
    this._glitter.rect = null;
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

    this._advanceArcs(dt);
    this._advanceGlow(dt);
    this._advanceGlitter(dt);
    this._advanceTrail(dt);

    this.particles.flush();
    this.gl.render(this.scene, this.camera);
  }

  _advanceArcs(dt) {
    const a = this._arc;
    if (!a.active) return;

    a.t += dt;
    const { travel, hold, fade } = ARC_TIMING;
    const total = travel + hold + fade;

    let amount = 1;
    if (a.t < travel) {
      amount = Easing.outCubic(saturate(a.t / travel));
    } else if (a.t >= travel + hold) {
      amount = 1 - Easing.inOutCubic(saturate((a.t - travel - hold) / fade));
    }

    // The crackle is the shader's: settings.thunder.restrike re-rolls every
    // filament 18 times a second. Re-seeding from here would fight it.
    for (const arc of this.arcs) {
      arc.state.fade = amount;
      for (const material of arc.materials) material.userData.sync(arc.state);
    }

    if (a.t >= total) {
      a.active = false;
      for (const arc of this.arcs) {
        for (const mesh of arc.meshes) mesh.visible = false;
      }
    }
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

  _advanceGlitter(dt) {
    const g = this._glitter;
    if (!g.active || !g.rect) return;

    const count = this._glitterEmitter.tick(dt, GLITTER.rate);
    if (count <= 0) return;

    // One emit call per glitter. `emit`'s own scatter is a ball, which would
    // pile the field into a circle in the middle of a rectangular card — the
    // positions have to be drawn from the rect itself.
    const inset = GLITTER.inset;
    const left = g.rect.x + inset;
    const top = g.rect.y + inset;
    const width = Math.max(1, g.rect.width - inset * 2);
    const height = Math.max(1, g.rect.height - inset * 2);

    const palette = GLITTER[g.tone] ?? GLITTER.white;
    _tint.copy(getColor(palette.a));

    for (let i = 0; i < count; i++) {
      _pos.set(left + Math.random() * width, top + Math.random() * height, 0);
      // Barely any velocity: a glitter twinkles where it sits, it does not fly.
      _dir.set((Math.random() - 0.5) * 2, -1, 0).normalize();

      this.glitter.emit(1, {
        position: _pos,
        radius: 0,
        direction: _dir,
        speed: 7,
        speedVariance: 0.9,
        spread: 0.4,
        // Biased toward the small end; see GLITTER.sizeBias. Variance is 0
        // because the curve above already is the variation.
        size: GLITTER.sizeMin + (GLITTER.sizeMax - GLITTER.sizeMin) * Math.pow(Math.random(), GLITTER.sizeBias),
        sizeVariance: 0,
        life: GLITTER.life,
        lifeVariance: GLITTER.lifeVariance,
        spin: GLITTER.spin,
        tint: _tint,
        time: this.elapsed
      });
    }
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
    for (const arc of this.arcs) for (const material of arc.materials) material.dispose();
    this.boltGeometry.dispose();
    this.glowMaterial.dispose();
    this.glowMesh.geometry.dispose();
    this._whiteDepth.dispose();
    disposeObject(this.scene);
    frame.uSceneDepth.value = null;
    this.gl.dispose();
  }
}
