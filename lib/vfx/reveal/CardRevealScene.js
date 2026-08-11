import {
  AmbientLight,
  Color,
  DataTexture,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping
} from 'three';

import { BeamPass, createBeamMaterial } from '../materials/BeamMaterial.js';
import {
  createBeamRingGeometry,
  createBeamTubeGeometry,
  createBoltRibbonGeometry
} from '../assets/ProceduralGeometry.js';
import { ParticleEngine, RateEmitter } from '../particles/ParticleEngine.js';
import { ParticleShape } from '../particles/ParticleSystem.js';
import { BurstMode, BurstSystem } from '../effects/BurstSphere.js';
import { CameraShake } from '../effects/CameraShake.js';
import { LightPool } from '../effects/LightPool.js';
import { ScreenFlash } from '../effects/ScreenFlash.js';
import { PostProcessing } from '../postprocessing/PostProcessing.js';
import { frame } from '../core/FrameUniforms.js';
import { LAYER } from '../core/Layers.js';
import { Time } from '../core/Time.js';
import { DEFAULT_SETTINGS, settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { Easing, saturate } from '../utils/math.js';
import { disposeObject } from '../utils/dispose.js';
import { QUALITY } from './quality.js';
import { presetFor } from './rarityPresets.js';

/**
 * Staging.
 *
 * The card sits at z = 0 and the column stands behind it at z = -0.9, rising
 * from just below the card's bottom edge. Putting the beam on the card's own
 * plane would intersect it; putting it behind is what makes the card read as
 * standing *in* the light rather than next to it.
 */
const BEAM_ORIGIN = new Vector3(0, -0.25, -0.9);
const BEAM_SIDE = new Vector3(1, 0, 0);
const CARD_CENTER = new Vector3(0, 1.35, 0);
/** Card bottom edge sits at y = 0, so the column's base is just under it. */
const CARD_HEIGHT = 2.7;

/** How many spawn points one frame's sparks are split between. */
const SPARK_BATCHES = 4;
const MOTE_BATCHES = 5;

const PHASE = Object.freeze({
  IDLE: 'idle',
  CHARGE: 'charge',
  FIRE: 'fire',
  HOLD: 'hold',
  COLLAPSE: 'collapse'
});

/* Scratch — the frame loop allocates nothing. */
const _pos = new Vector3();
const _dir = new Vector3();
const _tint = new Color();

/** One 60 Hz vsync, with a little slack for timer noise. */
const BUDGET_60_MS = 17.5;

function emptyStats() {
  return {
    fps: 0,
    frameMs: 0,
    frameP95Ms: 0,
    frameWorstMs: 0,
    cpuMs: 0,
    cpuP95Ms: 0,
    droppedPct: 0,
    calls: 0,
    triangles: 0,
    programs: 0,
    particles: 0,
    samples: 0
  };
}

/**
 * Order statistics over the first `n` entries of a ring buffer.
 *
 * Sorting a copy every quarter-second is not free, but it is off the hot path
 * and a sorted window is the only honest way to report a p95.
 */
function percentiles(buffer, n) {
  const sorted = Array.from(buffer.subarray(0, n)).sort((a, b) => a - b);
  let over = 0;
  for (let i = 0; i < n; i++) if (sorted[i] > BUDGET_60_MS) over++;
  return {
    p50: sorted[Math.floor(n * 0.5)],
    p95: sorted[Math.min(n - 1, Math.floor(n * 0.95))],
    max: sorted[n - 1],
    overBudget: over / n
  };
}

/**
 * A vertical pillar-of-light card reveal built out of the ported VFX layer.
 *
 * This is the piece that replaces the reference project's `abilities/` layer:
 * same materials, same particles, same post chain, but the column stands on end
 * behind a card instead of being aimed across a floor, and the timeline is a
 * reveal (charge → erupt → hold → collapse) rather than a skillshot.
 *
 * The class owns its canvas and runs its own RAF loop. It reports frame timings
 * so the harness can decide what a device can actually afford.
 */
export class CardRevealScene {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [options]
   * @param {string} [options.quality]   key into QUALITY
   * @param {string} [options.cardImage] texture URL for the card face
   * @param {() => void} [options.onComplete] fired when a reveal finishes
   */
  constructor(canvas, options = {}) {
    const { quality = 'high', cardImage = '/images/UR1.png', onComplete = null } = options;

    this.canvas = canvas;
    this.qualityKey = quality;
    this.quality = QUALITY[quality] ?? QUALITY.high;
    this.cardImage = cardImage;
    this.onComplete = onComplete;

    this.time = new Time();
    this.elapsed = 0;
    this.phase = PHASE.IDLE;
    this.phaseTime = 0;
    this.preset = presetFor('UR');
    this._raf = 0;
    this._disposed = false;
    this._seed = 0;
    this._fired = false;
    this._light = null;

    /* ---- frame-time instrumentation ---- */
    // Two separate measurements, because they answer different questions:
    //   cpu   — how long our own frame took to build and dispatch
    //   frame — the wall-clock gap between presented frames, unclamped
    // Only the second one tells you whether the device is actually holding 60,
    // since a GPU-bound frame costs almost nothing on the CPU.
    this._cpuSamples = new Float32Array(300);
    this._frameSamples = new Float32Array(300);
    this._sampleCount = 0;
    this._sampleCursor = 0;
    this._lastFrameTs = 0;
    this._lastStats = emptyStats();
    this._statsClock = 0;

    /* ---- renderer ---- */
    this.gl = new WebGLRenderer({
      canvas,
      antialias: this.quality.pixelRatioCap > 1.25,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false
    });
    this.gl.setPixelRatio(this._targetPixelRatio());
    this.gl.toneMapping = ACESFilmicToneMapping;
    this.gl.toneMappingExposure = settings.post.exposure;
    this.gl.outputColorSpace = SRGBColorSpace;
    this.gl.info.autoReset = false;
    // Nothing in a card reveal casts a shadow; the original needed them for the
    // character standing on the ground plane.
    this.gl.shadowMap.enabled = false;

    /* ---- scene ---- */
    this.scene = new Scene();
    this.scene.background = new Color(0x05060a);

    this.camera = new PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(0, 1.5, 7.2);
    this.camera.lookAt(CARD_CENTER);
    this.camera.layers.enable(LAYER.VFX);
    this._cameraBase = this.camera.position.clone();

    // CameraShake drives a rig; a reveal needs nothing else a rig would give,
    // so this is the minimal surface it reads.
    this.rig = { shakeOffset: new Vector3(), shakeRoll: 0 };
    this.shake = new CameraShake(this.rig);
    this.flash = new ScreenFlash();

    this.scene.add(new AmbientLight(0xffffff, 0.55));

    /* ---- depth fallback ---- */
    // With the depth prepass off, every VFX shader still samples `uSceneDepth`
    // for its soft fade. White is "infinitely far" in the packed encoding, so a
    // 1×1 white texture makes the soft term a no-op instead of undefined.
    if (!this.quality.depth) {
      const white = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat);
      white.needsUpdate = true;
      this._whiteDepth = white;
      frame.uSceneDepth.value = white;
    }

    this._buildCard();
    this._buildBeam();

    this.particles = new ParticleEngine(this.scene);
    this.lights = new LightPool(this.scene);
    this.bursts = new BurstSystem(this.scene);
    this._buildParticles();

    // PostProcessing expects the reference project's `Renderer` wrapper and
    // reads `.gl` off it. We own the WebGLRenderer directly, so hand it the
    // one property it actually uses.
    this.post = new PostProcessing({ gl: this.gl }, this.scene, this.camera, {
      depth: this.quality.depth,
      distortion: this.quality.distortion,
      bloom: this.quality.bloom
    });

    this._resizeObserver = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this._resizeObserver.observe(canvas.parentElement);
    this.resize();
  }

  /* ------------------------------------------------------------------ */
  /* Construction                                                        */
  /* ------------------------------------------------------------------ */

  _buildCard() {
    // Sized from the texture once it loads; 1:1 until then.
    this.cardMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.0,
      emissive: new Color(0xffffff),
      emissiveIntensity: 0.28,
      transparent: true
    });

    this.cardMesh = new Mesh(new PlaneGeometry(1.9, CARD_HEIGHT), this.cardMaterial);
    this.cardMesh.position.copy(CARD_CENTER);
    // WORLD so the depth prepass captures it — that is what lets the sparks and
    // motes soften as they pass in front of the card instead of cutting into it.
    this.cardMesh.layers.set(LAYER.WORLD);
    this.scene.add(this.cardMesh);
  }

  _buildBeam() {
    const q = this.quality;

    this.tubeGeometry = createBeamTubeGeometry(q.tubeNodes, q.tubeSides);
    this.coilGeometry = createBoltRibbonGeometry(q.coilNodes, 8);
    this.ringGeometry = createBeamRingGeometry(12, q.ringSegments);
    this.orbGeometry = new IcosahedronGeometry(1, q.tubeSides > 16 ? 4 : 2);

    const passes = [
      [BeamPass.HALO, this.tubeGeometry, 11],
      [BeamPass.SHELL, this.tubeGeometry, 12],
      [BeamPass.CORE, this.tubeGeometry, 13],
      [BeamPass.COIL, this.coilGeometry, 13],
      [BeamPass.RING, this.ringGeometry, 13],
      [BeamPass.ORB, this.orbGeometry, 14]
    ];

    this.beamMaterials = [];
    this.beamMeshes = [];

    for (const [pass, geometry, renderOrder] of passes) {
      const material = createBeamMaterial(pass);
      const mesh = new Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.layers.set(LAYER.VFX);
      mesh.renderOrder = renderOrder;
      mesh.visible = false;
      if (pass === BeamPass.ORB) this.orbMesh = mesh;
      else mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      this.beamMaterials.push(material);
      this.beamMeshes.push(mesh);
    }

    this._beamState = {
      origin: BEAM_ORIGIN.clone(),
      target: new Vector3(0, 8, 0),
      side: BEAM_SIDE.clone(),
      progress: 0,
      fade: 1,
      widthFade: 1,
      charge: 0,
      seed: 0,
      coils: 1,
      rings: 1
    };
  }

  _buildParticles() {
    const q = this.quality;

    this.sparks = this.particles.get('reveal.sparks', {
      capacity: q.sparkCapacity,
      shape: ParticleShape.STREAK,
      additive: true,
      stretch: true,
      softFade: 0.25
    });
    this.sparks.uniforms.uDrag.value = 1.5;
    this.sparks.uniforms.uEndSize.value = 0.2;
    this.sparks.uniforms.uSizeIn.value = 0.02;
    this.sparks.uniforms.uFadeIn.value = 0.03;
    this.sparks.uniforms.uFadeOut.value = 0.4;
    this.sparks.uniforms.uGravity.value.set(0, -1.6, 0);

    this.motes = this.particles.get('reveal.motes', {
      capacity: q.moteCapacity,
      shape: ParticleShape.SOFT,
      additive: true,
      curl: true,
      softFade: 0.4
    });
    this.motes.uniforms.uDrag.value = 1.1;
    this.motes.uniforms.uEndSize.value = 0.12;
    this.motes.uniforms.uSizeIn.value = 0.05;
    this.motes.uniforms.uFadeIn.value = 0.07;
    this.motes.uniforms.uFadeOut.value = 0.35;
    // Motes hang in the air around the card rather than falling out of frame.
    this.motes.uniforms.uGravity.value.set(0, 0.25, 0);

    this.sparkEmitter = new RateEmitter(0);
    this.moteEmitter = new RateEmitter(0);
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                           */
  /* ------------------------------------------------------------------ */

  /** Load the card texture and warm the shader cache so the first play is clean. */
  async load() {
    await this.setCardImage(this.cardImage);

    // Make every pass visible for one compile so the first reveal never stalls
    // on a shader build — which would otherwise poison the very first
    // measurement we take.
    for (const mesh of this.beamMeshes) mesh.visible = true;
    this._syncBeam();
    await this.gl.compileAsync(this.scene, this.camera);
    for (const mesh of this.beamMeshes) mesh.visible = false;

    this._lastStats.programs = this.gl.info.programs?.length ?? 0;
  }

  setCardImage(url) {
    this.cardImage = url;
    return new Promise((resolve) => {
      new TextureLoader().load(
        url,
        (texture) => {
          if (this._disposed) {
            texture.dispose();
            resolve();
            return;
          }
          texture.colorSpace = SRGBColorSpace;
          texture.anisotropy = Math.min(4, this.gl.capabilities.getMaxAnisotropy());

          const previous = this.cardMaterial.map;
          this.cardMaterial.map = texture;
          this.cardMaterial.emissiveMap = texture;
          this.cardMaterial.needsUpdate = true;
          previous?.dispose();

          const aspect = (texture.image?.width ?? 1) / (texture.image?.height ?? 1);
          this.cardMesh.geometry.dispose();
          this.cardMesh.geometry = new PlaneGeometry(CARD_HEIGHT * aspect, CARD_HEIGHT);
          resolve();
        },
        undefined,
        () => resolve() // a missing texture should not stop the harness
      );
    });
  }

  /**
   * Start a reveal.
   * @param {string} rarity 'SR' | 'SSR' | 'UR'
   */
  play(rarity = 'UR') {
    this.preset = presetFor(rarity);
    this._applyPreset(this.preset);

    this.phase = PHASE.CHARGE;
    this.phaseTime = 0;
    this._seed = Math.random() * 100;
    this._fired = false;

    this._beamState.seed = this._seed;
    this._beamState.target.set(0, this.preset.height, 0);
    this._beamState.progress = 0;
    this._beamState.fade = 1;
    this._beamState.widthFade = 1;
    this._beamState.charge = 0;
    this._beamState.coils = this.preset.coils;
    this._beamState.rings = this.preset.rings;

    for (const mesh of this.beamMeshes) mesh.visible = true;

    this._light = this.lights.acquire();
    this._resetSamples();
  }

  stop() {
    this.phase = PHASE.IDLE;
    for (const mesh of this.beamMeshes) mesh.visible = false;
    this.particles.reset();
    this.bursts.clear();
    this.flash.reset();
    this.shake.reset();
    if (this._light) {
      this.lights.release(this._light);
      this._light = null;
    }
  }

  /**
   * Rarity presets are applied by writing into the shared `settings` object,
   * because every ported material re-reads it on `sync()` each frame. Reset the
   * beam section from the defaults first so presets never accumulate.
   */
  _applyPreset(preset) {
    Object.assign(settings.beam, DEFAULT_SETTINGS.beam, preset.beam);
  }

  /* ------------------------------------------------------------------ */
  /* Frame                                                               */
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
    const started = performance.now();
    const gl = this.gl;
    gl.info.reset();

    const dt = this.time.tick(); // already clamped against tab-switch spikes
    this.elapsed += dt;

    frame.uTime.value = this.elapsed;
    frame.uDelta.value = dt;
    frame.uShaderIntensity.value = settings.global.shaderIntensity;
    frame.uGlobalGlow.value = settings.global.glow;
    frame.uCameraNear.value = this.camera.near;
    frame.uCameraFar.value = this.camera.far;

    this._advance(dt);
    this._syncBeam();

    this.particles.flush();
    this.bursts.update(dt);
    this.lights.update(dt);
    this.shake.update(dt);
    this.flash.update(dt);

    // Apply shake on top of the resting camera pose.
    this.camera.position.copy(this._cameraBase).add(this.rig.shakeOffset);
    this.camera.lookAt(CARD_CENTER);
    this.camera.rotateZ(this.rig.shakeRoll);

    this.post.sync(this.elapsed, this.flash);
    this.post.render();

    this._record(performance.now() - started, started, dt);
  }

  /** Drive the reveal timeline. */
  _advance(dt) {
    if (this.phase === PHASE.IDLE) return;

    this.phaseTime += dt;
    const t = this.preset.timing;
    const state = this._beamState;

    switch (this.phase) {
      case PHASE.CHARGE: {
        const u = saturate(this.phaseTime / t.charge);
        state.charge = u;
        state.progress = 0;
        state.fade = 1;
        state.widthFade = 1;

        // The orb winds up at the column's base, pulling motes in out of the
        // air. Kept well under the card's width — it is the promise of the
        // reveal, not the reveal.
        const scale = 0.06 + Easing.outCubic(u) * this.preset.beam.radius * 0.5;
        this.orbMesh.position.copy(BEAM_ORIGIN);
        this.orbMesh.scale.setScalar(scale);
        this._emitIntake(dt, u);
        this._driveLight(BEAM_ORIGIN, u * 0.45, dt);

        if (this.phaseTime >= t.charge) {
          this.phase = PHASE.FIRE;
          this.phaseTime = 0;
          this._release();
        }
        break;
      }

      case PHASE.FIRE: {
        const u = saturate(this.phaseTime / t.travel);
        state.charge = 1 - u;
        state.progress = Easing.outCubic(u);
        this.orbMesh.scale.setScalar((1 - u) * this.preset.beam.radius * 0.5);
        this._emitColumn(dt, 0.6 + u * 0.4);
        this._driveLight(BEAM_ORIGIN, 1, dt);

        if (this.phaseTime >= t.travel) {
          this.phase = PHASE.HOLD;
          this.phaseTime = 0;
        }
        break;
      }

      case PHASE.HOLD: {
        state.charge = 0;
        state.progress = 1;
        this.orbMesh.scale.setScalar(0);
        this._emitColumn(dt, 1);
        this._driveLight(BEAM_ORIGIN, 1, dt);

        if (this.phaseTime >= t.hold) {
          this.phase = PHASE.COLLAPSE;
          this.phaseTime = 0;
        }
        break;
      }

      case PHASE.COLLAPSE: {
        const u = saturate(this.phaseTime / t.collapse);
        state.progress = 1;
        // Narrow to a thread first, then fade — collapsing and fading together
        // reads as a dissolve rather than a shutdown.
        state.widthFade = 1 - Easing.inCubic(u);
        state.fade = 1 - Easing.inQuad(u);
        this._emitColumn(dt, (1 - u) * 0.5);
        this._driveLight(BEAM_ORIGIN, 1 - u, dt);

        if (this.phaseTime >= t.collapse) {
          this.phase = PHASE.IDLE;
          for (const mesh of this.beamMeshes) mesh.visible = false;
          if (this._light) {
            this.lights.release(this._light);
            this._light = null;
          }
          this.onComplete?.();
        }
        break;
      }

      default:
        break;
    }
  }

  /** The moment the column lets go: flash, shake, burst. */
  _release() {
    if (this._fired) return;
    this._fired = true;

    const preset = this.preset;

    this.flash.trigger(getColor(preset.flash.color), preset.flash.strength);
    this.shake.add(preset.shake, 2.0, 26);

    // All three ramp stops are taken from the *bright* end of the palette.
    // Feeding the halo colour in as `colorC` makes the shell add near-black and
    // read as a grey ball hanging behind the card rather than a flash of light.
    this.bursts.spawn(BurstMode.STORM, BEAM_ORIGIN, {
      radius: preset.burst.radius,
      endRadius: preset.burst.endRadius,
      life: 0.45,
      intensity: preset.burst.intensity,
      opacity: 0.85,
      colorA: getColor(preset.beam.colorCore),
      colorB: getColor(preset.beam.colorInner),
      colorC: getColor(preset.beam.colorOuter)
    });
  }

  /** Motes spiralling into the orb while it charges. */
  _emitIntake(dt, u) {
    const rate = this.preset.moteRate * this.quality.particleScale * (0.3 + u * 0.7);
    const count = this.moteEmitter.tick(dt, rate);
    if (count <= 0) return;

    const per = Math.max(1, Math.floor(count / MOTE_BATCHES));
    _tint.copy(getColor(this.preset.beam.colorInner));

    for (let b = 0; b < MOTE_BATCHES; b++) {
      // A point on a shell around the orb, thrown inward at it.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.6 + Math.random() * 1.4;
      const s = Math.sin(phi);
      _pos.set(
        BEAM_ORIGIN.x + r * s * Math.cos(theta),
        BEAM_ORIGIN.y + r * Math.cos(phi) * 0.8 + 0.6,
        BEAM_ORIGIN.z + r * s * Math.sin(theta)
      );
      _dir.copy(BEAM_ORIGIN).sub(_pos).normalize();

      this.motes.emit(per, {
        position: _pos,
        radius: 0.12,
        direction: _dir,
        speed: 2.4 + u * 2.0,
        speedVariance: 0.3,
        spread: 0.18,
        size: 0.07,
        sizeVariance: 0.5,
        life: 0.55,
        lifeVariance: 0.25,
        tint: _tint,
        time: this.elapsed
      });
    }
  }

  /** Sparks shed off the column, plus drifting motes around the card. */
  _emitColumn(dt, intensity) {
    if (intensity <= 0.001) return;

    const height = this.preset.height * this._beamState.progress;
    const scale = this.quality.particleScale;

    /* ---- sparks ---- */
    const sparkCount = this.sparkEmitter.tick(dt, this.preset.sparkRate * scale * intensity);
    if (sparkCount > 0) {
      const per = Math.max(1, Math.floor(sparkCount / SPARK_BATCHES));
      _tint.copy(getColor(this.preset.beam.colorCoil));

      for (let b = 0; b < SPARK_BATCHES; b++) {
        const h = Math.random() * height;
        const theta = Math.random() * Math.PI * 2;
        const radius = this.preset.beam.radius * 0.8;
        _pos.set(
          BEAM_ORIGIN.x + Math.cos(theta) * radius,
          BEAM_ORIGIN.y + h,
          BEAM_ORIGIN.z + Math.sin(theta) * radius
        );
        // Thrown radially out of the column and dragged upward with the flow.
        _dir.set(Math.cos(theta), 0.9, Math.sin(theta)).normalize();

        this.sparks.emit(per, {
          position: _pos,
          radius: 0.05,
          direction: _dir,
          speed: 3.2,
          speedVariance: 0.6,
          spread: 0.35,
          size: 0.055,
          sizeVariance: 0.6,
          life: 0.5,
          lifeVariance: 0.4,
          tint: _tint,
          time: this.elapsed
        });
      }
    }

    /* ---- ambient motes around the card ---- */
    const moteCount = this.moteEmitter.tick(dt, this.preset.moteRate * scale * 0.45 * intensity);
    if (moteCount > 0) {
      _tint.copy(getColor(this.preset.beam.colorRing));
      _pos.copy(CARD_CENTER);
      _dir.set(0, 1, 0);

      this.motes.emit(moteCount, {
        position: _pos,
        radius: 2.1,
        direction: _dir,
        speed: 0.5,
        speedVariance: 0.8,
        spread: 0.9,
        size: 0.06,
        sizeVariance: 0.6,
        life: 1.5,
        lifeVariance: 0.4,
        tint: _tint,
        time: this.elapsed
      });
    }
  }

  _driveLight(position, amount, dt) {
    if (!this._light) return;
    this.lights.set(
      this._light,
      position,
      getColor(this.preset.light.color),
      this.preset.light.intensity * amount,
      12,
      dt
    );
  }

  /** Push the reveal state into all six beam passes. */
  _syncBeam() {
    for (const material of this.beamMaterials) {
      material.userData.sync(this._beamState);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Instrumentation                                                     */
  /* ------------------------------------------------------------------ */

  _resetSamples() {
    this._sampleCount = 0;
    this._sampleCursor = 0;
    this._statsClock = 0;
    this._lastFrameTs = 0;
  }

  /**
   * @param {number} cpuMs our own frame cost — JS plus the driver-side cost of
   *   issuing the draws. Not GPU time; the browser will not hand that over
   *   without timer queries. Treat it as a floor.
   * @param {number} now `performance.now()` at the top of the frame, used for
   *   the unclamped inter-frame gap.
   * @param {number} dt the simulation's clamped delta, only for the stats timer.
   */
  _record(cpuMs, now, dt) {
    // The first frame after a reset has no predecessor to measure against.
    if (this._lastFrameTs > 0) {
      const cursor = this._sampleCursor;
      this._cpuSamples[cursor] = cpuMs;
      this._frameSamples[cursor] = now - this._lastFrameTs;
      this._sampleCursor = (cursor + 1) % this._cpuSamples.length;
      this._sampleCount = Math.min(this._sampleCount + 1, this._cpuSamples.length);
    }
    this._lastFrameTs = now;

    this._statsClock += dt;
    if (this._statsClock < 0.25) return;
    this._statsClock = 0;

    const n = this._sampleCount;
    if (n === 0) return;

    const cpu = percentiles(this._cpuSamples, n);
    const wall = percentiles(this._frameSamples, n);
    const info = this.gl.info;

    this._lastStats = {
      // Median rather than mean: one 200 ms hitch should not make a steady
      // 60 fps device report 45.
      fps: wall.p50 > 0 ? Math.round(1000 / wall.p50) : 0,
      frameMs: wall.p50,
      frameP95Ms: wall.p95,
      frameWorstMs: wall.max,
      cpuMs: cpu.p50,
      cpuP95Ms: cpu.p95,
      // Frames that missed a 60 Hz vsync, as a share of the window.
      droppedPct: wall.overBudget * 100,
      calls: info.render.calls,
      triangles: info.render.triangles,
      programs: info.programs?.length ?? 0,
      particles: this.particles.countLive(this.elapsed),
      samples: n
    };
  }

  getStats() {
    return this._lastStats;
  }

  get isPlaying() {
    return this.phase !== PHASE.IDLE;
  }

  /* ------------------------------------------------------------------ */

  _targetPixelRatio() {
    return Math.min(window.devicePixelRatio || 1, this.quality.pixelRatioCap);
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    const pixelRatio = this._targetPixelRatio();

    this.gl.setPixelRatio(pixelRatio);
    this.gl.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.post.setSize(width, height, pixelRatio);
  }

  get renderSize() {
    const parent = this.canvas.parentElement;
    const pixelRatio = this._targetPixelRatio();
    return {
      width: Math.round((parent?.clientWidth ?? 0) * pixelRatio),
      height: Math.round((parent?.clientHeight ?? 0) * pixelRatio),
      pixelRatio
    };
  }

  dispose() {
    this._disposed = true;
    this.pause();
    this._resizeObserver?.disconnect();

    this.particles.dispose();
    this.lights.dispose();
    this.bursts.dispose();
    this.post.dispose();

    for (const material of this.beamMaterials) material.dispose();
    this.tubeGeometry.dispose();
    this.coilGeometry.dispose();
    this.ringGeometry.dispose();
    this.orbGeometry.dispose();

    this.cardMaterial.map?.dispose();
    this._whiteDepth?.dispose();
    disposeObject(this.scene);

    // Leaving the depth texture pointing at a disposed target would poison the
    // next scene, which shares this module-level uniform block.
    frame.uSceneDepth.value = null;

    this.gl.dispose();
  }
}
