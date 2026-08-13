import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Color,
  DataTexture,
  DirectionalLight,
  IcosahedronGeometry,
  Matrix3,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer
} from 'three';

import { BoltPass, createLightningMaterial } from '../materials/LightningMaterial.js';
import { createBoltRibbonGeometry } from '../assets/ProceduralGeometry.js';
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
import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { Easing, saturate } from '../utils/math.js';
import { disposeObject } from '../utils/dispose.js';
import { QUALITY } from './quality.js';
import { createAuraMaterial } from './AuraMaterial.js';
import { createStandInCharacter } from './standInCharacter.js';
import { AURA, BOLT, ELEMENT_COLORS, SHOCKWAVE, SPARK_BURST } from './battlePresets.js';

/** Where the stand-in character stands, and where an incoming bolt comes from. */
const TARGET = new Vector3(0, 0, 0);
const CHAR_HEIGHT = 2.2;
const CHAR_CENTER = new Vector3(0, CHAR_HEIGHT / 2, 0);
const BOLT_SIDE = new Vector3(0, 0, 1);
/** Everything now originates at the character's centre rather than a corner. */
const IMPACT = new Vector3(0, CHAR_HEIGHT / 2, 0);
const BOLT_ORIGIN = IMPACT;
/** Arms radiating out of the centre. Each is a glow pass and a core pass. */
const BOLT_ARMS = 6;
const BOLT_REACH = 3.4;

const SPARK_BATCHES = 5;
const AURA_BATCHES = 6;

/* Scratch — nothing in the frame loop allocates. */
const _pos = new Vector3();
const _dir = new Vector3();
const _tint = new Color();

const BUDGET_60_MS = 17.5;

function emptyStats() {
  return {
    fps: 0, frameMs: 0, frameP95Ms: 0, frameWorstMs: 0,
    cpuMs: 0, droppedPct: 0, calls: 0, triangles: 0, particles: 0, samples: 0
  };
}

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
 * A battle-effects sandbox: four effects that can be fired independently at a
 * stand-in character, so their look and their cost can be judged separately
 * from any decision about how battle itself is built.
 *
 * The character is a textured plane standing on a ground plane, both on
 * LAYER.WORLD. That matters more than it looks: it puts them in the depth
 * prepass, which is what lets sparks and dust soften as they pass in front of
 * the body instead of cutting a hard edge into it. A DOM-based battle cannot
 * do this — the DOM is not in the depth buffer.
 */
export class BattleFxScene {
  constructor(canvas, options = {}) {
    const {
      quality = 'high',
      element = 'electric',
      characterImage = null,
      characterMode = 'sprite'
    } = options;
    this.characterMode = characterMode;

    this.canvas = canvas;
    this.quality = QUALITY[quality] ?? QUALITY.high;
    this.element = element;
    this.time = new Time();
    this.elapsed = 0;
    this._raf = 0;
    this._disposed = false;

    /* ---- effect state ---- */
    this.auraOn = false;
    this._auraAmount = 0;
    this._auraLight = null;
    this._bolt = { active: false, t: 0, seed: 0 };
    this._spark = { active: false, t: 0 };
    this._wave = { active: false, t: 0 };
    this._hitLight = null;

    /* ---- instrumentation ---- */
    this._cpuSamples = new Float32Array(300);
    this._frameSamples = new Float32Array(300);
    this._sampleCount = 0;
    this._sampleCursor = 0;
    this._lastFrameTs = 0;
    this._statsClock = 0;
    this._lastStats = emptyStats();

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
    this.gl.shadowMap.enabled = false;

    this.scene = new Scene();
    this.scene.background = new Color(0x06070c);

    this.camera = new PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0.4, 2.1, 6.6);
    this.camera.lookAt(CHAR_CENTER);
    this.camera.layers.enable(LAYER.VFX);
    this._cameraBase = this.camera.position.clone();

    this.rig = { shakeOffset: new Vector3(), shakeRoll: 0 };
    this.shake = new CameraShake(this.rig);
    this.flash = new ScreenFlash();

    this.scene.add(new AmbientLight(0xffffff, 0.4));
    const key = new DirectionalLight(0xbfd4ff, 0.8);
    key.position.set(2.5, 5, 3);
    this.scene.add(key);

    if (!this.quality.depth) {
      const white = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat);
      white.needsUpdate = true;
      this._whiteDepth = white;
      frame.uSceneDepth.value = white;
    }

    this._buildStage(characterImage);
    this._buildBolt();
    this._buildAura();

    this.particles = new ParticleEngine(this.scene);
    this.lights = new LightPool(this.scene);
    this.bursts = new BurstSystem(this.scene);
    this._buildParticles();

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

  _buildStage(characterImage) {
    // A dark, slightly reflective floor so the shockwave has something to sit
    // on and the aura has something to spill onto.
    const ground = new Mesh(
      new PlaneGeometry(26, 26),
      new MeshStandardMaterial({ color: 0x11141c, roughness: 0.75, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.layers.set(LAYER.WORLD);
    this.scene.add(ground);
    this.ground = ground;

    this.charMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0,
      transparent: true,
      emissive: new Color(0xffffff),
      emissiveIntensity: 0.15
    });

    this.character = new Mesh(new PlaneGeometry(1.5, CHAR_HEIGHT), this.charMaterial);
    this.character.position.copy(CHAR_CENTER);
    this.character.layers.set(LAYER.WORLD);
    this.scene.add(this.character);

    // The 3D stand-in. Built up front so switching modes is a visibility flip
    // rather than a rebuild, and both can be compared back to back.
    this.meshGeometry = createStandInCharacter(CHAR_HEIGHT);
    this.meshMaterial = new MeshStandardMaterial({
      color: 0x8d97ad,
      roughness: 0.42,
      metalness: 0.12
    });
    this.characterMesh = new Mesh(this.meshGeometry, this.meshMaterial);
    this.characterMesh.layers.set(LAYER.WORLD);
    this.scene.add(this.characterMesh);

    if (characterImage) this.setCharacterImage(characterImage);
    this._applyCharacterMode();
  }

  _buildBolt() {
    // Fewer strands per arm than a single bolt would carry: six arms of five
    // filaments reads as a discharge, where six arms of nine reads as a bush.
    this.boltGeometry = createBoltRibbonGeometry(this.quality.coilNodes, BOLT.strands);

    this.boltArms = [];
    for (let i = 0; i < BOLT_ARMS; i++) {
      // Halo underneath, hot core on top. Drawing the glow as real ribbon keeps
      // it attached to every kink instead of smearing off it as bloom would.
      const materials = [
        createLightningMaterial(BoltPass.GLOW),
        createLightningMaterial(BoltPass.CORE)
      ];
      const meshes = materials.map((material, pass) => {
        const mesh = new Mesh(this.boltGeometry, material);
        mesh.frustumCulled = false;
        mesh.matrixAutoUpdate = false;
        mesh.layers.set(LAYER.VFX);
        mesh.renderOrder = 11 + pass * 2;
        mesh.visible = false;
        this.scene.add(mesh);
        return mesh;
      });

      this.boltArms.push({
        materials,
        meshes,
        state: {
          origin: IMPACT.clone(),
          target: new Vector3(),
          side: BOLT_SIDE.clone(),
          progress: 0,
          fade: 1,
          seed: 0,
          strands: BOLT.strands
        }
      });
    }
  }

  _buildAura() {
    this.auraMaterial = createAuraMaterial();

    // There is no sphere shell any more. Wrapped around a flat sprite it only
    // ever silhouetted as an egg — the shape had nothing to do with the
    // character inside it. In mesh mode the hull below does the job properly;
    // in sprite mode the aura is now carried by the rising motes and the light,
    // which is honest about what a flat sprite can support.

    // The hull: the character's own geometry, drawn a second time and pushed
    // out along its normals. This is the whole payoff of real geometry — the
    // aura traces the actual silhouette, arms and all, instead of a sphere's.
    this.auraHull = new Mesh(this.meshGeometry, this.auraMaterial);
    this.auraHull.layers.set(LAYER.VFX);
    this.auraHull.renderOrder = 10;
    this.auraHull.visible = false;
    this.scene.add(this.auraHull);

    // A sphere scaled to the body's proportions reads better than a capsule and
    // costs one draw call either way.
    this.auraMesh = null;

    this._auraState = {
      inflate: 0,
      amount: 0,
      opacity: AURA.shellOpacity,
      pulseSpeed: AURA.pulseSpeed,
      pulseDepth: AURA.pulseDepth,
      colorInner: new Color(),
      colorOuter: new Color(),
      normalMatrix: new Matrix3()
    };
  }

  _buildParticles() {
    const q = this.quality;

    this.sparks = this.particles.get('battle.sparks', {
      capacity: q.sparkCapacity,
      shape: ParticleShape.STREAK,
      additive: true,
      stretch: true,
      softFade: 0.25
    });
    this.sparks.uniforms.uDrag.value = SPARK_BURST.drag;
    this.sparks.uniforms.uEndSize.value = 0.15;
    this.sparks.uniforms.uFadeOut.value = 0.45;

    this.motes = this.particles.get('battle.motes', {
      capacity: q.moteCapacity,
      shape: ParticleShape.SOFT,
      additive: true,
      curl: true,
      softFade: 0.4
    });
    this.motes.uniforms.uDrag.value = 1.0;
    this.motes.uniforms.uGravity.value.set(0, AURA.moteRise, 0);
    this.motes.uniforms.uEndSize.value = 0.1;

    // Flat expanding rings — the shape their particle system documents as
    // "thin expanding ring — shockwaves".
    this.rings = this.particles.get('battle.rings', {
      capacity: Math.round(400 * q.particleScale) + 60,
      shape: ParticleShape.RING,
      additive: true,
      softFade: 0.6
    });
    this.rings.uniforms.uDrag.value = 2.4;
    this.rings.uniforms.uGravity.value.set(0, 0, 0);
    // The ring expands by its size curve, not by travelling — this multiplier
    // is what turns one sprite into a wave front crossing the floor.
    this.rings.uniforms.uEndSize.value = 6;
    this.rings.uniforms.uFadeOut.value = 0.7;

    this.dust = this.particles.get('battle.dust', {
      capacity: Math.round(900 * q.particleScale) + 120,
      shape: ParticleShape.SMOKE,
      additive: false,
      curl: true,
      softFade: 1.0
    });
    // Dust reads as smoke, and smoke that lingers makes every hit feel heavy.
    // Higher drag stops it travelling, a smaller end size stops it swelling
    // into a wall, and the early fade-out is what actually clears the frame.
    this.dust.uniforms.uDrag.value = 2.6;
    this.dust.uniforms.uGravity.value.set(0, 0.25, 0);
    this.dust.uniforms.uEndSize.value = 1.5;
    this.dust.uniforms.uOpacity.value = 0.3;
    this.dust.uniforms.uFadeOut.value = 0.25;

    this.boltSparkEmitter = new RateEmitter(0);
    this.auraMoteEmitter = new RateEmitter(0);
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * 'sprite' draws the flat card and rings it with a sphere shell; 'mesh' draws
   * the stand-in (or a loaded glTF) and rings it with a hull of its own
   * geometry. Everything else in the scene is identical, which is the point.
   */
  setCharacterMode(mode) {
    this.characterMode = mode === 'mesh' ? 'mesh' : 'sprite';
    this._applyCharacterMode();
  }

  _applyCharacterMode() {
    const isMesh = this.characterMode === 'mesh';
    this.character.visible = !isMesh;
    this.characterMesh.visible = isMesh;
    // Whichever aura is not in use must be hidden, not merely faded, or the
    // sphere keeps drawing behind the mesh.
    if (this.auraHull) this.auraHull.visible = false;
  }

  /**
   * Swap the stand-in for a real model.
   *
   * glTF rather than the FBX the reference project loads: smaller on the wire,
   * and it is the format every modern exporter targets. The model is scaled to
   * CHAR_HEIGHT and its geometry is reused for the aura hull, so a character
   * dropped in here lights up correctly with no extra authoring.
   *
   * @param {string} url
   */
  async loadCharacterModel(url) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(url);
    if (this._disposed) return;

    const root = gltf.scene;
    root.updateMatrixWorld(true);

    // Normalise: sit it on the floor, centred, at the scene's character height.
    const box = new Box3().setFromObject(root);
    const size = new Vector3();
    box.getSize(size);
    const scale = size.y > 0 ? CHAR_HEIGHT / size.y : 1;
    root.scale.setScalar(scale);
    root.updateMatrixWorld(true);

    const scaled = new Box3().setFromObject(root);
    const centre = new Vector3();
    scaled.getCenter(centre);
    root.position.set(-centre.x, -scaled.min.y, -centre.z);

    root.traverse((node) => {
      if (node.isMesh) node.layers.set(LAYER.WORLD);
    });

    this.scene.remove(this.characterMesh);
    this.characterMesh = root;
    this.scene.add(root);

    // Rebuild the hull from the loaded geometry. A multi-mesh model gets a hull
    // per mesh, which is still one extra draw each and keeps the silhouette.
    this.scene.remove(this.auraHull);
    const hull = root.clone(true);
    hull.traverse((node) => {
      if (node.isMesh) {
        node.material = this.auraMaterial;
        node.layers.set(LAYER.VFX);
        node.renderOrder = 10;
      }
    });
    hull.visible = false;
    this.auraHull = hull;
    this.scene.add(hull);

    this.model = root;
    this._applyCharacterMode();
    if (this.auraOn) this.setAura(true);
  }

  get palette() {
    return ELEMENT_COLORS[this.element] ?? ELEMENT_COLORS.electric;
  }

  setElement(element) {
    if (ELEMENT_COLORS[element]) this.element = element;
  }

  setCharacterImage(url) {
    return new Promise((resolve) => {
      new TextureLoader().load(
        url,
        (texture) => {
          if (this._disposed) { texture.dispose(); resolve(); return; }
          texture.colorSpace = SRGBColorSpace;
          const previous = this.charMaterial.map;
          this.charMaterial.map = texture;
          this.charMaterial.emissiveMap = texture;
          this.charMaterial.needsUpdate = true;
          previous?.dispose();

          const aspect = (texture.image?.width ?? 1) / (texture.image?.height ?? 1);
          this.character.geometry.dispose();
          this.character.geometry = new PlaneGeometry(CHAR_HEIGHT * aspect, CHAR_HEIGHT);
          resolve();
        },
        undefined,
        () => resolve()
      );
    });
  }

  sparkBurst() {
    this._spark.active = true;
    this._spark.t = 0;

    const p = this.palette;
    this.sparks.setGradient(
      getColor(p.core), getColor(p.inner), getColor(p.outer), getColor(p.deep)
    );
    this.sparks.uniforms.uGravity.value.set(0, SPARK_BURST.gravity, 0);

    _tint.copy(getColor(p.core));
    this.sparks.emit(Math.round(SPARK_BURST.count * this.quality.particleScale), {
      position: IMPACT,
      radius: 0.14,
      speed: SPARK_BURST.speed,
      speedVariance: SPARK_BURST.speedVariance,
      spread: SPARK_BURST.spread,
      size: SPARK_BURST.size,
      sizeVariance: 0.6,
      life: SPARK_BURST.life,
      lifeVariance: 0.45,
      tint: _tint,
      time: this.elapsed
    });

    this.flash.trigger(getColor(p.inner), SPARK_BURST.flash);
    this.shake.add(SPARK_BURST.shake, 2.2, 28);
    this._pulseLight(IMPACT, SPARK_BURST.light);
  }

  shockwave() {
    this._wave.active = true;
    this._wave.t = 0;

    const p = this.palette;
    const scale = this.quality.particleScale;

    this.rings.setGradient(
      getColor(p.core), getColor(p.inner), getColor(p.outer), getColor(p.deep)
    );
    this.dust.setGradient(
      getColor(p.outer), getColor(p.deep), getColor(p.deep), getColor(p.deep)
    );

    // RING draws one ring *per particle*, so a shockwave is two or three large
    // ones expanding by their own size curve — not a crowd of small ones
    // travelling outward, which just reads as scattered sprites.
    // Centred on the character rather than down at its feet: the wave is
    // something the character emits, not something happening on the floor.
    _tint.copy(getColor(p.inner));
    _pos.copy(IMPACT);
    this.rings.emit(SHOCKWAVE.ringCount, {
      position: _pos,
      radius: 0.05,
      direction: new Vector3(0, 1, 0),
      speed: 0.2,
      speedVariance: 0.2,
      spread: 0.1,
      size: SHOCKWAVE.ringSize,
      sizeVariance: 0.15,
      life: SHOCKWAVE.ringLife,
      lifeVariance: 0.15,
      tint: _tint,
      time: this.elapsed
    });

    // Dust kicked off the floor behind the front.
    _tint.copy(getColor(p.outer));
    this.dust.emit(Math.round(SHOCKWAVE.dustCount * scale), {
      position: _pos,
      radius: 1.2,
      direction: new Vector3(0, 1, 0),
      speed: 2.2,
      speedVariance: 0.8,
      spread: 1.3,
      size: SHOCKWAVE.dustSize,
      sizeVariance: 0.6,
      life: SHOCKWAVE.dustLife,
      lifeVariance: 0.4,
      tint: _tint,
      time: this.elapsed
    });

    // No pressure shell. BurstMode.AIR is a closed surface, and once the wave
    // was centred on the character rather than half-sunk in the floor its full
    // silhouette showed — a faceted grey bag around the body, which read as
    // heavier than the smoke the shell was meant to lighten. The expanding
    // ring, the flash and the light pulse carry the beat without it.

    this.flash.trigger(getColor(p.inner), SHOCKWAVE.flash);
    this.shake.add(SHOCKWAVE.shake, 1.8, 20);
    this._pulseLight(new Vector3(0, 0.5, 0), SHOCKWAVE.light);
  }

  bolt() {
    this._bolt.active = true;
    this._bolt.t = 0;
    this.boltGeometry.instanceCount = BOLT.strands;

    // A ring of directions with jitter, so the fan is even but not a star.
    const spin = Math.random() * Math.PI * 2;
    this.boltArms.forEach((arm, i) => {
      const theta = spin + (i / BOLT_ARMS) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      // Biased upward: a discharge that only goes sideways reads as a floor decal.
      const lift = 0.35 + Math.random() * 0.75;
      const reach = BOLT_REACH * (0.7 + Math.random() * 0.5);

      arm.state.origin.copy(IMPACT);
      arm.state.target.set(
        IMPACT.x + Math.cos(theta) * reach,
        IMPACT.y + lift * reach * 0.6,
        IMPACT.z + Math.sin(theta) * reach * 0.55
      );
      arm.state.seed = Math.random() * 100;
      arm.state.progress = 0;
      arm.state.fade = 1;
      for (const mesh of arm.meshes) mesh.visible = true;
    });

    const p = this.palette;
    this.sparks.setGradient(
      getColor(p.core), getColor(p.inner), getColor(p.outer), getColor(p.deep)
    );

    this.flash.trigger(getColor(p.core), BOLT.flash);
    this.shake.add(BOLT.shake, 2.4, 30);
    this._pulseLight(IMPACT, BOLT.light);
  }

  setAura(on) {
    this.auraOn = on;
    if (on) {
      const carrier = this._auraObject();
      if (carrier) carrier.visible = true;
      if (!this._auraLight) this._auraLight = this.lights.acquire();
      const p = this.palette;
      this.motes.setGradient(
        getColor(p.core), getColor(p.inner), getColor(p.outer), getColor(p.deep)
      );
    }
  }

  stopAll() {
    this.setAura(false);
    this._bolt.active = false;
    this._spark.active = false;
    this._wave.active = false;
    for (const arm of this.boltArms) for (const mesh of arm.meshes) mesh.visible = false;
    this.particles.reset();
    this.bursts.clear();
    this.flash.reset();
    this.shake.reset();
  }

  /* ------------------------------------------------------------------ */

  _pulseLight(position, intensity) {
    if (!this._hitLight) this._hitLight = this.lights.acquire();
    if (!this._hitLight) return;
    this._hitPulse = { position: position.clone(), intensity, t: 0 };
  }

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

  async load() {
    // Compile with everything visible so the first cast never stalls on a
    // shader build and poisons the first measurement.
    for (const arm of this.boltArms) for (const mesh of arm.meshes) mesh.visible = true;
    this.auraHull.visible = true;
    this._syncBolt();
    this._syncAura(1);
    await this.gl.compileAsync(this.scene, this.camera);
    for (const arm of this.boltArms) for (const mesh of arm.meshes) mesh.visible = false;
    this.auraHull.visible = false;
    this._applyCharacterMode();
  }

  frame() {
    const started = performance.now();
    this.gl.info.reset();

    const dt = this.time.tick();
    this.elapsed += dt;

    frame.uTime.value = this.elapsed;
    frame.uDelta.value = dt;
    frame.uShaderIntensity.value = settings.global.shaderIntensity;
    frame.uGlobalGlow.value = settings.global.glow;
    frame.uCameraNear.value = this.camera.near;
    frame.uCameraFar.value = this.camera.far;

    this._advanceBolt(dt);
    this._advanceAura(dt);
    this._advanceLight(dt);

    this.particles.flush();
    this.bursts.update(dt);
    this.lights.update(dt);
    this.shake.update(dt);
    this.flash.update(dt);

    this.camera.position.copy(this._cameraBase).add(this.rig.shakeOffset);
    this.camera.lookAt(CHAR_CENTER);
    this.camera.rotateZ(this.rig.shakeRoll);

    this.post.sync(this.elapsed, this.flash);
    this.post.render();

    this._record(performance.now() - started, started, dt);
  }

  _advanceBolt(dt) {
    if (!this._bolt.active) return;

    this._bolt.t += dt;
    const t = this._bolt.t;
    const total = BOLT.travel + BOLT.hold + BOLT.fade;

    let progress = 1;
    let fade = 1;
    if (t < BOLT.travel) {
      progress = Easing.outCubic(saturate(t / BOLT.travel));
    } else if (t >= BOLT.travel + BOLT.hold) {
      fade = 1 - saturate((t - BOLT.travel - BOLT.hold) / BOLT.fade);
    }
    for (const arm of this.boltArms) {
      arm.state.progress = progress;
      arm.state.fade = fade;
    }

    // Sparks shed along the filament for as long as it is in the air.
    const alive = t < BOLT.travel + BOLT.hold;
    if (alive) {
      const count = this.boltSparkEmitter.tick(dt, BOLT.sparkRate * this.quality.particleScale);
      if (count > 0) {
        const per = Math.max(1, Math.floor(count / SPARK_BATCHES));
        _tint.copy(getColor(this.palette.inner));
        for (let b = 0; b < SPARK_BATCHES; b++) {
          // Sparks shed along whichever arm is picked, out from the centre.
          const arm = this.boltArms[(Math.random() * this.boltArms.length) | 0];
          _pos.lerpVectors(arm.state.origin, arm.state.target, Math.random() * progress);
          _dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
          this.sparks.emit(per, {
            position: _pos,
            radius: 0.16,
            direction: _dir,
            speed: 3.4,
            speedVariance: 0.7,
            spread: 0.5,
            size: 0.045,
            sizeVariance: 0.6,
            life: 0.4,
            lifeVariance: 0.5,
            tint: _tint,
            time: this.elapsed
          });
        }
      }
    }

    this._syncBolt();

    if (t >= total) {
      this._bolt.active = false;
      for (const arm of this.boltArms) {
        for (const mesh of arm.meshes) mesh.visible = false;
      }
    }
  }

  _advanceAura(dt) {
    const target = this.auraOn ? 1 : 0;
    const rate = this.auraOn ? dt / AURA.fadeIn : dt / AURA.fadeOut;
    this._auraAmount += Math.sign(target - this._auraAmount) * Math.min(rate, Math.abs(target - this._auraAmount));

    if (this._auraAmount <= 0.001) {
      if (this.auraHull) this.auraHull.visible = false;
      if (this._auraLight) { this.lights.release(this._auraLight); this._auraLight = null; }
      return;
    }

    const carrier = this._auraObject();
    if (carrier) carrier.visible = true;
    if (carrier) this._syncAura(this._auraAmount);

    // Motes rising off the silhouette.
    const count = this.auraMoteEmitter.tick(
      dt, AURA.moteRate * this.quality.particleScale * this._auraAmount
    );
    if (count > 0) {
      // Emitted on the silhouette rather than through the whole volume. Filling
      // a ball around the body just produces a milky blob that hides the
      // character; tracing the outline is what reads as an aura.
      _tint.copy(getColor(this.palette.accent));
      const per = Math.max(1, Math.floor(count / AURA_BATCHES));
      for (let b = 0; b < AURA_BATCHES; b++) {
        const theta = Math.random() * Math.PI * 2;
        const h = Math.random();
        const r = AURA.shellRadius * 0.52;
        _pos.set(
          CHAR_CENTER.x + Math.cos(theta) * r,
          h * CHAR_HEIGHT,
          CHAR_CENTER.z + Math.sin(theta) * r * 0.7
        );
        _dir.set(Math.cos(theta) * 0.25, 1, Math.sin(theta) * 0.25).normalize();
        this.motes.emit(per, {
          position: _pos,
          radius: 0.1,
          direction: _dir,
          speed: 0.8,
          speedVariance: 0.6,
          spread: 0.25,
          size: 0.035,
          sizeVariance: 0.6,
          life: AURA.moteLife,
          lifeVariance: 0.4,
          tint: _tint,
          time: this.elapsed
        });
      }
    }

    if (this._auraLight) {
      this.lights.set(
        this._auraLight, CHAR_CENTER, getColor(this.palette.outer),
        AURA.light * this._auraAmount, 8, dt
      );
    }
  }

  _advanceLight(dt) {
    if (!this._hitPulse || !this._hitLight) return;
    this._hitPulse.t += dt;
    const u = saturate(this._hitPulse.t / 0.45);
    const intensity = this._hitPulse.intensity * (1 - Easing.inQuad(u));
    this.lights.set(
      this._hitLight, this._hitPulse.position, getColor(this.palette.inner), intensity, 10, dt
    );
    if (u >= 1) {
      this.lights.release(this._hitLight);
      this._hitLight = null;
      this._hitPulse = null;
    }
  }

  _syncBolt() {
    for (const arm of this.boltArms) {
      for (const material of arm.materials) material.userData.sync(arm.state);
    }
  }

  /** Which object carries the aura in the current mode. */
  _auraObject() {
    return this.characterMode === 'mesh' ? this.auraHull : null;
  }

  _syncAura(amount) {
    const p = this.palette;
    this._auraState.amount = amount;
    // The sphere is already sized by its scale; the hull has to be pushed off
    // the body it is cloned from, in the model's own units.
    this._auraState.inflate = this.characterMode === 'mesh' ? 0.055 : 0;
    this._auraState.colorInner.copy(getColor(p.core));
    this._auraState.colorOuter.copy(getColor(p.outer));
    const carrier = this._auraObject();
    if (!carrier) return;
    carrier.updateMatrixWorld();
    this._auraState.normalMatrix.getNormalMatrix(carrier.matrixWorld);
    this.auraMaterial.userData.sync(this._auraState);
  }

  /* ------------------------------------------------------------------ */

  _record(cpuMs, now, dt) {
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
      fps: wall.p50 > 0 ? Math.round(1000 / wall.p50) : 0,
      frameMs: wall.p50,
      frameP95Ms: wall.p95,
      frameWorstMs: wall.max,
      cpuMs: cpu.p50,
      droppedPct: wall.overBudget * 100,
      calls: info.render.calls,
      triangles: info.render.triangles,
      particles: this.particles.countLive(this.elapsed),
      samples: n
    };
  }

  getStats() { return this._lastStats; }

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

    for (const arm of this.boltArms) for (const material of arm.materials) material.dispose();
    this.auraMaterial.dispose();
    this.boltGeometry.dispose();
    this.charMaterial.map?.dispose();
    this.meshGeometry.dispose();
    this.meshMaterial.dispose();
    this._whiteDepth?.dispose();
    disposeObject(this.scene);

    frame.uSceneDepth.value = null;
    this.gl.dispose();
  }
}
