import { AdditiveBlending, Color, DoubleSide, Matrix3, ShaderMaterial, Vector3 } from 'three';
import { noiseGLSL } from '../shaders/lib/noise.glsl.js';
import { sharedUniforms } from '../core/FrameUniforms.js';

/**
 * A sustained aura shell.
 *
 * This one is ours — the reference project has no aura, because a skillshot
 * sandbox never needed a character to *stay* lit. It is written against the
 * same primitives everything else uses (their noise library, the shared frame
 * uniform block) so it costs one draw call and behaves like the ported
 * materials do.
 *
 * The construction is the same trick the beam's three tube passes use, reduced
 * to a single mesh: weight the shell by its rim so it reads as hollow, and let
 * both faces add. A solid-shaded sphere around a character reads as a bubble;
 * a rim-weighted one reads as light coming off the body.
 *
 * Three things stop it looking like a decal:
 *   - the rim term is modulated by 3D noise flowing *upward*, so the edge
 *     boils instead of sitting still
 *   - the silhouette is displaced by the same field, so the shape breathes
 *   - a slow pulse rides the whole thing, tied to `uPulseSpeed`
 */

const AURA_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uAmount;
  uniform float uDisplace;
  uniform float uNoiseScale;
  uniform float uFlow;
  // Constant push along the normal, in local units. On a sphere shell this is
  // just scale; on a character's own geometry it is what turns the mesh into a
  // hull that hugs the real silhouette instead of an ellipse around it.
  uniform float uInflate;
  // The shell is scaled non-uniformly to fit a body, and mat3(modelMatrix)
  // skews normals under non-uniform scale — which would tilt the whole fresnel
  // term and fill the middle of the shell instead of rimming it.
  uniform mat3 uNormalMatrix;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying float vNoise;

  ${noiseGLSL}

  void main() {
    vec3 pos = position;

    // Flow the sampling point downward so the surface detail travels up the
    // body, which is what sells an aura as rising rather than sitting.
    vec3 samplePoint = pos * uNoiseScale - vec3(0.0, uTime * uFlow, 0.0);
    // Signed for the displacement so the silhouette breathes both ways;
    // remapped to 0..1 for the fragment's boil term.
    float raw = fbm3(samplePoint);
    vNoise = raw * 0.5 + 0.5;

    pos += normal * (uInflate + raw * uDisplace) * uAmount;

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    // normalize() of a zero-length vector is NaN, and a merged or imported mesh
    // reliably has a few degenerate vertices whose normal comes out zero — at
    // capsule poles, at welded seams, wherever an exporter left a duplicate.
    // The sphere shell never hit this because an icosphere has none. On a
    // character hull it is a handful of NaN fragments, which bloom then smears
    // across the frame and tone mapping renders black.
    vec3 worldNormal = uNormalMatrix * normal;
    float normalLength = length(worldNormal);
    vWorldNormal = normalLength > 1e-6 ? worldNormal / normalLength : vec3(0.0, 0.0, 1.0);

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const AURA_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAmount;
  uniform float uRimPower;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uPulseSpeed;
  uniform float uPulseDepth;
  uniform vec3  uColorInner;
  uniform vec3  uColorOuter;
  uniform float uGlobalGlow;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying float vNoise;

  void main() {
    vec3 toCamera = cameraPosition - vWorldPos;
    float camDistance = length(toCamera);
    vec3 viewDir = camDistance > 1e-6 ? toCamera / camDistance : vec3(0.0, 0.0, 1.0);

    // Rim weighting: brightest where the surface turns away from the eye, which
    // is where a real volume would have the most depth along the view ray.
    // The max() is load-bearing, not defensive dressing. Both vectors are
    // normalised so the dot is mathematically in [-1,1], but float32 returns
    // 1+1e-7 often enough — and pow() of a tiny negative base is NaN at every
    // exponent. One NaN fragment is not one bad pixel: the bloom blur spreads
    // it across its whole kernel and NaN through tone mapping comes out black,
    // so a handful of bad fragments on a character hull blacks out the frame.
    // Interpolating two opposed normals across a triangle can also land on
    // zero, so the fragment stage needs the same guard as the vertex stage.
    float interpLength = length(vWorldNormal);
    vec3 n = interpLength > 1e-6 ? vWorldNormal / interpLength : viewDir;
    float facing = abs(dot(n, viewDir));
    float rim = pow(max(0.0, 1.0 - facing), uRimPower);

    // High-contrast erosion: the noise must be able to punch the rim out
    // entirely in places. A rim that is merely *modulated* still traces a
    // continuous ellipse, which reads as an outline someone drew; one that is
    // broken into licks reads as light coming off the body.
    float boil = smoothstep(0.12, 0.78, vNoise);
    float pulse = 1.0 + sin(uTime * uPulseSpeed) * uPulseDepth;

    float strength = rim * boil * pulse * uAmount;

    // White only at the very hottest edge; the element's colour owns
    // everything else, or the aura reads as grey glass rather than light.
    vec3 color = mix(uColorOuter, uColorInner, pow(max(0.0, rim), 3.0));
    float alpha = strength * uOpacity;

    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color * strength * uGlow * uGlobalGlow, alpha);
  }
`;

/**
 * @param {object} [options]
 * @param {number} [options.rimPower] higher = tighter rim, more "shell"
 */
export function createAuraMaterial(options = {}) {
  const { rimPower = 3.0 } = options;

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
    uniforms: sharedUniforms({
      uAmount: { value: 0 },
      uRimPower: { value: rimPower },
      uDisplace: { value: 0.1 },
      uInflate: { value: 0 },
      uNoiseScale: { value: 2.6 },
      uFlow: { value: 0.7 },
      uNormalMatrix: { value: new Matrix3() },
      uOpacity: { value: 0.32 },
      uGlow: { value: 3.0 },
      uPulseSpeed: { value: 1.4 },
      uPulseDepth: { value: 0.18 },
      uColorInner: { value: new Color(1, 1, 1) },
      uColorOuter: { value: new Color(0.29, 0.62, 1) },
      uLightDir: { value: new Vector3(0, 1, 0) }
    }),
    vertexShader: AURA_VERTEX,
    fragmentShader: AURA_FRAGMENT
  });

  /**
   * @param {object} state { amount, opacity, pulseSpeed, pulseDepth,
   *                         colorInner, colorOuter, normalMatrix }
   */
  material.userData.sync = (state) => {
    const u = material.uniforms;
    u.uAmount.value = state.amount;
    u.uOpacity.value = state.opacity;
    u.uPulseSpeed.value = state.pulseSpeed;
    u.uPulseDepth.value = state.pulseDepth;
    u.uColorInner.value.copy(state.colorInner);
    u.uColorOuter.value.copy(state.colorOuter);
    if (state.normalMatrix) u.uNormalMatrix.value.copy(state.normalMatrix);
    if (state.inflate !== undefined) u.uInflate.value = state.inflate;
  };

  return material;
}
