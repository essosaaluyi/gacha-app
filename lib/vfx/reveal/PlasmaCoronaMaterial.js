import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from 'three';
import { noiseGLSL } from '../shaders/lib/noise.glsl.js';
import { sharedUniforms } from '../core/FrameUniforms.js';

/**
 * A radial plasma corona: one quad, evaluated in polar space.
 *
 * This is not the ported LightningMaterial with different numbers. That one is
 * a *strike* — it has an origin, a target, a front that races out, a hold and a
 * blow-out, and its noise is piecewise-linear so the bolt keeps hard corners.
 * Every one of those properties is wrong for a corona, which has no direction,
 * no arrival, and should never snap.
 *
 * The construction here:
 *
 * **Angle and radius are separate axes.** The direction vector carries the
 * tangential axis — seamless around the circle, where atan() would cut one
 * radius — and radius is the third noise component, so a filament varies along
 * its own length instead of running as a straight spoke.
 *
 * **Filaments come from ridged noise.** `1 - |n|` turns the zero crossings of a
 * smooth field into thin bright lines. Raising that to a power sharpens them
 * into tendrils; raising the power with radius is what thins them as they go
 * out, without needing a second pass.
 *
 * **Domain warping does the wandering.** Sampling the field at a position the
 * field itself displaces is what makes a vein meander and pinch rather than
 * running as a smooth arc.
 *
 * **Motion is crawl, not jumping.** The only time terms are a slow drift of the
 * noise field and a shallow brightness flicker. Nothing repositions, so the
 * pattern reshapes continuously rather than being re-rolled each strike.
 */

const CORONA_VERTEX = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CORONA_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAmount;        // 0..1 master fade
  uniform float uAngularFreq;    // tangential feature density
  uniform float uRadialFreq;     // how much a filament varies along its length
  uniform float uWarp;           // domain-warp strength
  uniform float uBranchFreq;     // second octave, for irregularity
  uniform float uCrawl;         // drift speed of the field
  uniform float uSharpness;     // base filament thinness
  uniform float uThin;          // extra thinness with radius
  uniform float uFalloff;       // how fast tendrils fade outward
  uniform float uCoreTight;     // concentration of the centre
  uniform float uInnerFade;     // radius over which filaments ramp in
  uniform float uCoreGlow;
  uniform float uFlicker;
  uniform float uFlickerSpeed;
  uniform float uIntensity;
  uniform float uGlobalGlow;
  uniform vec3  uColorCore;
  uniform vec3  uColorMid;
  uniform vec3  uColorOuter;

  varying vec2 vUv;

  ${noiseGLSL}

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    vec2 dir = r > 1e-5 ? p / r : vec2(1.0, 0.0);

    // Angle and radius are fed in as genuinely separate axes.
    //
    // A decomposition of the sample point into radial and tangential parts does
    // not work here and is worth spelling out, because it looks correct: with
    // q = p * scale and dir = p / r the two are parallel by construction, so
    // the tangential remainder q - dir * dot(q, dir) is identically zero and the
    // whole "stretch" collapses to a uniform scale. There is no anisotropy to
    // find in a point that is already purely radial.
    //
    // The direction vector supplies the tangential axis — seamless around the
    // circle, where an atan() would put a cut down one radius — and the radius
    // is handed to the third component so a filament varies along its own
    // length. Ridges then run outward while still wandering.
    float drift = uTime * uCrawl;
    vec2 ang = dir * uAngularFreq;
    float along = r * uRadialFreq - drift;

    // Domain warp on both axes: this is what stops the veins being smooth arcs.
    float w1 = fbm3(vec3(ang * 0.5, along * 0.4 + 3.0));
    float w2 = fbm3(vec3(ang * 0.5 + 21.0, along * 0.4 + 9.0));
    vec2 angW = ang + vec2(w1, w2) * uWarp;
    float alongW = along + w1 * uWarp * 0.6;

    float n1 = fbm3(vec3(angW, alongW));
    float n2 = fbm3(vec3(angW * uBranchFreq + 13.0, alongW * 1.6));

    // max(), not a sum: crossing filaments should read as two filaments, not as
    // one brighter smear where they overlap.
    float ridge = max(1.0 - abs(n1), (1.0 - abs(n2)) * 0.78);
    ridge = clamp(ridge, 0.0, 1.0);

    // Thinner the further out it goes: the exponent climbs with radius.
    float filament = pow(ridge, uSharpness * (1.0 + r * uThin));

    // Fade filaments out of the very centre. Close to r = 0 the radial term
    // barely varies, so every filament is still a straight line there and they
    // all converge into a hard starburst. Handing the middle to the smooth core
    // term instead is what makes the centre read as concentrated energy rather
    // than as spokes meeting at a point.
    filament *= smoothstep(0.0, uInnerFade, r);

    // Radial envelope. pow() guarded — a negative base here is NaN, and one NaN
    // fragment blooms out across the frame and tone-maps to black.
    float fade = pow(max(0.0, 1.0 - r), uFalloff);

    // The centre is its own term, not just where the tendrils happen to meet:
    // a tight hot point plus a wider soft bloom around it.
    float core = exp(-r * uCoreTight) + 0.22 * exp(-r * uCoreTight * 0.3);

    // Shallow, slow: a corona breathes, it does not strobe.
    float flicker = 1.0 + sin(uTime * uFlickerSpeed + n1 * 5.0) * uFlicker;

    float energy = (filament * fade * uIntensity + core * uCoreGlow) * flicker * uAmount;
    if (energy < 0.003) discard;

    // Outer -> mid -> core as the fragment gets hotter, so the middle goes white
    // without the whole disc washing out.
    vec3 color = mix(uColorOuter, uColorMid, clamp(energy * 1.6, 0.0, 1.0));
    color = mix(color, uColorCore, clamp((energy - 0.55) * 2.2, 0.0, 1.0));

    gl_FragColor = vec4(color * energy * uGlobalGlow, clamp(energy, 0.0, 1.0));
  }
`;

export function createPlasmaCoronaMaterial() {
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
    uniforms: sharedUniforms({
      uAmount: { value: 0 },
      uAngularFreq: { value: 4.2 },
      uRadialFreq: { value: 3.0 },
      uWarp: { value: 0.9 },
      uBranchFreq: { value: 2.0 },
      uCrawl: { value: 0.35 },
      uSharpness: { value: 5.0 },
      uThin: { value: 2.0 },
      uFalloff: { value: 1.35 },
      uCoreTight: { value: 3.4 },
      uInnerFade: { value: 0.55 },
      uCoreGlow: { value: 0.45 },
      uFlicker: { value: 0.07 },
      uFlickerSpeed: { value: 2.6 },
      uIntensity: { value: 2.2 },
      uColorCore: { value: new Color(1, 1, 1) },
      uColorMid: { value: new Color(0.72, 0.88, 1) },
      uColorOuter: { value: new Color(0.16, 0.45, 1) }
    }),
    vertexShader: CORONA_VERTEX,
    fragmentShader: CORONA_FRAGMENT
  });

  /** @param {object} state { amount, colorCore, colorMid, colorOuter } */
  material.userData.sync = (state) => {
    const u = material.uniforms;
    u.uAmount.value = state.amount;
    u.uColorCore.value.copy(state.colorCore);
    u.uColorMid.value.copy(state.colorMid);
    u.uColorOuter.value.copy(state.colorOuter);
  };

  return material;
}
