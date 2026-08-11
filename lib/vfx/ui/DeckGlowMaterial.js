import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, Vector2 } from 'three';
import { noiseGLSL } from '../shaders/lib/noise.glsl.js';

/**
 * An outcome glow that hugs a rectangular UI element.
 *
 * This is the right answer to "aura on a sprite" for anything whose shape we
 * already know. The earlier attempt wrapped a 3D fresnel shell around a flat
 * card and silhouetted as an ellipse that had nothing to do with the card's
 * outline. A deck is a rounded rectangle, so its glow can be evaluated from a
 * signed-distance field of exactly that rectangle — no alpha sampling, no
 * sprite dependency, and it stays sharp at any size because it is analytic
 * rather than a blurred bitmap.
 *
 * Drawn on one quad covering the element plus padding, in screen pixels.
 * `uHalfSize` is the element's half extent and `uRadius` its corner radius, so
 * the glow tracks a DOM rect that resizes or animates without re-authoring
 * anything.
 */

const GLOW_VERTEX = /* glsl */ `
  varying vec2 vLocal;
  uniform vec2 uQuadSize;

  void main() {
    // The attribute is a unit quad; scale it to the padded quad and keep the
    // pixel-space offset from the element's centre for the fragment stage.
    vLocal = position.xy * uQuadSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy * uQuadSize, 0.0, 1.0);
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAmount;      // 0..1 master fade
  uniform vec2  uHalfSize;    // the element's half extent, pixels
  uniform float uRadius;      // corner radius, pixels
  uniform float uThickness;   // how far the glow reaches out, pixels
  uniform float uCoreWidth;   // bright line hugging the edge, pixels
  uniform float uPulseSpeed;
  uniform float uPulseDepth;
  uniform float uBoil;        // how hard the noise breaks the edge up
  uniform vec3  uColor;
  uniform vec3  uCoreColor;
  uniform float uOpacity;

  varying vec2 vLocal;

  ${noiseGLSL}

  /** Exact distance to a rounded box — negative inside, positive outside. */
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    float d = sdRoundedBox(vLocal, uHalfSize, uRadius);

    // Everything inside the element is the element's own business; the glow
    // only lives outside its edge.
    if (d < 0.0) discard;

    // Noise indexed by angle around the element, crawling over time, so the
    // halo licks instead of sitting as an even blur.
    float angle = atan(vLocal.y, vLocal.x);
    float boil = 1.0 - uBoil + uBoil * (fbm3(vec3(cos(angle) * 2.2, sin(angle) * 2.2, uTime * 0.55)) * 0.5 + 0.5);

    float pulse = 1.0 + sin(uTime * uPulseSpeed) * uPulseDepth;

    // Two terms: a soft halo falling off with distance, and a tight core line
    // sitting on the edge that keeps the shape legible when the halo is faint.
    float halo = exp(-d / max(1.0, uThickness * boil)) * 0.85;
    float core = exp(-d / max(0.5, uCoreWidth));

    float strength = (halo + core * 1.4) * pulse * uAmount;
    if (strength < 0.002) discard;

    vec3 color = mix(uColor, uCoreColor, clamp(core, 0.0, 1.0));
    gl_FragColor = vec4(color * strength, strength * uOpacity);
  }
`;

export function createDeckGlowMaterial() {
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    // Load-bearing. The overlay camera is set up with top=0 and bottom=height so
    // scene space matches DOM space, and that Y flip mirrors triangle winding —
    // under the default FrontSide the quad is culled and draws nothing at all,
    // while still counting as a draw call.
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uQuadSize: { value: new Vector2(1, 1) },
      uHalfSize: { value: new Vector2(1, 1) },
      uRadius: { value: 12 },
      uThickness: { value: 26 },
      uCoreWidth: { value: 2.5 },
      uPulseSpeed: { value: 3.0 },
      uPulseDepth: { value: 0.16 },
      uBoil: { value: 0.45 },
      uOpacity: { value: 1 },
      uColor: { value: new Color(0.2, 0.7, 1) },
      uCoreColor: { value: new Color(1, 1, 1) }
    },
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT
  });

  /**
   * @param {object} state { time, amount, halfWidth, halfHeight, radius,
   *                         thickness, color, coreColor, pulseSpeed, pulseDepth }
   */
  material.userData.sync = (state) => {
    const u = material.uniforms;
    u.uTime.value = state.time;
    u.uAmount.value = state.amount;
    u.uHalfSize.value.set(state.halfWidth, state.halfHeight);
    // The unit quad spans ±0.5, so this is the quad's *full* size and the
    // shader sees half of it. Passing a half-extent here makes the quad smaller
    // than the element it surrounds, every fragment lands inside the box, and
    // the inside-discard silently swallows the whole glow.
    u.uQuadSize.value.set(
      2 * (state.halfWidth + state.thickness * 3),
      2 * (state.halfHeight + state.thickness * 3)
    );
    u.uRadius.value = state.radius;
    u.uThickness.value = state.thickness;
    u.uPulseSpeed.value = state.pulseSpeed;
    u.uPulseDepth.value = state.pulseDepth;
    u.uColor.value.copy(state.color);
    u.uCoreColor.value.copy(state.coreColor);
  };

  return material;
}
