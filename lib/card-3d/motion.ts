// Pure timeline for the real-3D card lab. Every pose is a function of sim time,
// so QA can seek any frame and get the same picture.
import * as THREE from "three";

export const CARD = { width: 2, height: 3.125, thickness: 0.032, radius: 0.1 } as const;
export const SLOT_X = [-2.75, 0, 2.75] as const;
export const REST_Y = CARD.thickness / 2 + 0.006;

export const EJECT_STAGGER_MS = 160;
export const EJECT_MS = 340;
export const DEAL_STAGGER_MS = 150;
export const DEAL_MS = 900;
/** Reveal beats, matching the owner reference (lift → white flash → slam → impact). */
export const REVEAL = { liftEnd: 400, flipStart: 70, flipEnd: 430, flashPeak: 430, holdEnd: 660, impact: 860, done: 1250 } as const;
export const IMPACT_MS = REVEAL.impact;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ease = {
  outCubic: (t: number) => 1 - (1 - clamp01(t)) ** 3,
  inCubic: (t: number) => clamp01(t) ** 3,
  inOutCubic: (t: number) => { const x = clamp01(t); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; },
  outBack: (t: number, s = 1.6) => { const x = clamp01(t) - 1; return 1 + (s + 1) * x * x * x + s * x * x; },
};

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const qAxis = (axis: THREE.Vector3, angle: number) => new THREE.Quaternion().setFromAxisAngle(axis, angle);

/** Card lying on the table. faceUp=0 shows the back, 1 the front (flip turns about the card's long axis). */
export function tableQuat(flip: number, tilt = 0, roll = 0) {
  return qAxis(Z, roll).multiply(qAxis(X, tilt - Math.PI / 2)).multiply(qAxis(Y, Math.PI * (1 - flip)));
}

export type Pose = { position: THREE.Vector3; quaternion: THREE.Quaternion; squash: number };

/** Outlet: a card shoe sitting on the table. Cards lie flat, face down, and slide out of the
 * mouth toward the player (outlet-local +z), stacked bottom→top with stepped overhangs. */
export const OUTLET = { width: 2.7, height: 1.15, depth: 3.7, mouthY: [0.26, 0.78] as const, mouthHalfWidth: 1.14 } as const;
const OUTLET_FRONT_Z = OUTLET.depth / 2;
const STACK_Y = (index: number) => 0.44 + index * 0.075;
/** How far each card sticks out of the mouth once set (lowest card furthest, so all three read). */
const OVERHANG = (index: number) => 1.75 - index * 0.32;
export const OUTLET_CARD_TILT = 0.07;
export function outletLocal(index: number, u: number) {
  const hiddenZ = -0.15, outZ = OUTLET_FRONT_Z - CARD.height / 2 + OVERHANG(index);
  const z = THREE.MathUtils.lerp(hiddenZ, outZ, ease.outBack(u, 1.15));
  return new THREE.Vector3((index - 1) * 0.04, STACK_Y(index), z);
}
/** Extra slide needed for the whole card to clear the mouth (plus a small margin). */
export const outletExitDistance = (index: number) => CARD.height - OVERHANG(index) + 0.6;

/** After the deal, cards hover face down above their bays, tilted a little toward the player. */
export const HOVER = { y: 0.95, z: 0.25, tilt: 0.24, bob: 0.045 } as const;
export function hoverPose(slot: number, sinceLanded: number): Pose {
  const ramp = clamp01(sinceLanded / 500);
  const bob = Math.sin(sinceLanded / 330 + slot * 1.7) * HOVER.bob * ramp;
  return { position: new THREE.Vector3(SLOT_X[slot], HOVER.y + bob, HOVER.z), quaternion: tableQuat(0, HOVER.tilt), squash: 0 };
}

/** Deal: slide fully out toward the player, then arc up and over to hover above the bay. */
export function dealPose(start: Pose, pull: THREE.Vector3, slot: number, t: number): Pose {
  const u = clamp01(t / DEAL_MS);
  const p = ease.inOutCubic(u / 0.34);
  const travel = ease.inOutCubic((u - 0.34) / 0.66);
  const from = start.position.clone().add(pull.clone().multiplyScalar(p));
  const end = hoverPose(slot, 0);
  // Rise first (clear of the shoe), then travel over to the bay.
  const control = new THREE.Vector3(THREE.MathUtils.lerp(from.x, end.position.x, 0.3), Math.max(from.y, end.position.y) + 2.3, from.z + 0.2);
  const a = from.clone().lerp(control, travel), b = control.clone().lerp(end.position, travel);
  const position = a.lerp(b, travel);
  // Arrive with a soft overshoot downward, then settle into the hover.
  position.y -= u > 0.85 ? Math.sin(((u - 0.85) / 0.15) * Math.PI) * 0.12 : 0;
  const spin = Math.sin(travel * Math.PI) * 0.15 * (slot - 1 || 0.7);
  const quaternion = start.quaternion.clone().slerp(end.quaternion, ease.inOutCubic(travel)).premultiply(qAxis(Y, spin));
  return { position, quaternion, squash: 0 };
}

/** Flip-and-land reveal. `lifted` is the point near the camera where the card hangs and flashes. */
export function revealPose(slot: number, t: number, lifted: THREE.Vector3, tiltToCamera: number, from?: THREE.Vector3): Pose {
  const rest = new THREE.Vector3(SLOT_X[slot], REST_Y, 0);
  const hover = from ?? hoverPose(slot, 0).position;
  const { liftEnd, flipStart, flipEnd, holdEnd, impact } = REVEAL;
  let position: THREE.Vector3, tilt: number, squash = 0;
  if (t < liftEnd) {
    const a = ease.outCubic(t / liftEnd);
    position = hover.clone().lerp(lifted, a);
    tilt = HOVER.tilt + (tiltToCamera - HOVER.tilt) * a;
  } else if (t < holdEnd) {
    const h = (t - liftEnd) / (holdEnd - liftEnd);
    position = lifted.clone().add(new THREE.Vector3(0, Math.sin(h * Math.PI) * 0.08, 0));
    tilt = tiltToCamera;
  } else if (t < impact) {
    const d = ease.inCubic((t - holdEnd) / (impact - holdEnd));
    position = lifted.clone().lerp(rest, d);
    tilt = tiltToCamera * (1 - ease.outCubic((t - holdEnd) / (impact - holdEnd)));
  } else {
    // Contact: a short squash, then one small rebound that dies away.
    const s = (t - impact) / 320;
    position = rest.clone();
    position.y += s < 1 ? Math.max(0, Math.sin(s * Math.PI * 1.6)) * 0.07 * (1 - s) : 0;
    squash = s < 1 ? Math.max(0, Math.sin(Math.min(1, s * 5) * Math.PI)) * 0.06 : 0;
    tilt = 0;
  }
  const flip = ease.inOutCubic((t - flipStart) / (flipEnd - flipStart));
  const roll = Math.sin(clamp01((t - flipStart) / (flipEnd - flipStart)) * Math.PI) * 0.1 * (slot === 2 ? -1 : 1);
  return { position, quaternion: tableQuat(flip, tilt, roll), squash };
}

/** 0..1 white wash on the face, peaking just after the flip completes. */
export function revealFlash(t: number) {
  const { flashPeak, holdEnd } = REVEAL;
  if (t < flashPeak - 70) return 0;
  if (t < flashPeak) return ease.outCubic((t - (flashPeak - 70)) / 70);
  return Math.max(0, 1 - ease.outCubic((t - flashPeak) / (holdEnd + 40 - flashPeak)));
}
