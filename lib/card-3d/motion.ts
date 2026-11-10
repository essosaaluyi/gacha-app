// Pure timeline for the real-3D cards. Every pose is a function of sim time, so QA can
// seek any frame and get the same picture. All values are in TABLE-LOCAL units:
// x = across the table, y = up from the felt, z = toward the player. The runtime places
// the table group in the scene (lab camera, or the game's cabinet camera).
import * as THREE from "three";

/** 2:3 like the game's bays. */
export const CARD = { width: 2, height: 3, thickness: 0.032, radius: 0.1 } as const;
export const REST_Y = CARD.thickness / 2 + 0.006;
export type SlotXZ = { x: number; z: number };

export const EJECT_STAGGER_MS = 160;
export const EJECT_MS = 340;
export const DEAL_STAGGER_MS = 420;
export const DEAL_MS = 1050;
/** Reveal beats, matching the owner reference (lift → white flash → slam → impact). */
export const REVEAL = { liftEnd: 400, flipStart: 70, flipEnd: 430, flashPeak: 430, holdEnd: 660, impact: 860, done: 1250 } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ease = {
  outCubic: (t: number) => 1 - (1 - clamp01(t)) ** 3,
  inCubic: (t: number) => clamp01(t) ** 3,
  inOutCubic: (t: number) => { const x = clamp01(t); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; },
  outBack: (t: number, s = 1.6) => { const x = clamp01(t) - 1; return 1 + (s + 1) * x * x * x + s * x * x; },
};

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const qAxis = (axis: THREE.Vector3, angle: number) => new THREE.Quaternion().setFromAxisAngle(axis, angle);

/** Card lying on the table. flip 0 shows the back, 1 the front (turning about the card's long axis).
 * tilt raises the far edge toward the player; roll turns it in the table plane. */
export function tableQuat(flip: number, tilt = 0, roll = 0) {
  return qAxis(Z, roll).multiply(qAxis(X, tilt - Math.PI / 2)).multiply(qAxis(Y, Math.PI * (1 - flip)));
}

export type Pose = { position: THREE.Vector3; quaternion: THREE.Quaternion; squash: number };

// ── Outlet (card shoe) ─────────────────────────────────────────────────
/** Shoe-local: cards lie flat, face down, and slide out of the front mouth (+z, toward the player),
 * stacked bottom→top with stepped overhangs. */
export const OUTLET = { width: 2.7, height: 1.15, depth: 3.7, mouthY: [0.26, 0.78] as const, mouthHalfWidth: 1.14 } as const;
const OUTLET_FRONT_Z = OUTLET.depth / 2;
const STACK_Y = (index: number) => 0.44 + index * 0.075;
/** How far each card sticks out once set: the bottom card furthest, so all three read. */
const OVERHANG = (index: number) => 1.75 - index * 0.32;
/** Cards lie flat in the shoe: a tilted card sliding horizontally would drift into the one above. */
export const OUTLET_CARD_TILT = 0;
export function outletLocal(index: number, u: number) {
  const hiddenZ = -0.15, outZ = OUTLET_FRONT_Z - CARD.height / 2 + OVERHANG(index);
  const z = THREE.MathUtils.lerp(hiddenZ, outZ, ease.outBack(u, 1.15));
  return new THREE.Vector3((index - 1) * 0.04, STACK_Y(index), z);
}
/** Slide needed for the whole card to clear the mouth, plus a margin. */
export const outletExitDistance = (index: number) => CARD.height - OVERHANG(index) + 0.6;
/** Bottom card leaves first and goes to the FARTHEST bay, so no later card ever passes a placed one. */
export const dealSlotFor = (index: number) => 2 - index;

// ── Hover ──────────────────────────────────────────────────────────────
/** After the deal, cards hover face down above their bays, tilted a little toward the player. */
export const HOVER = { y: 0.95, z: 0.25, tilt: 0.24, bob: 0.045 } as const;
export function hoverPose(slot: SlotXZ, slotIndex: number, sinceLanded: number): Pose {
  const ramp = clamp01(sinceLanded / 500);
  const bob = Math.sin(sinceLanded / 330 + slotIndex * 1.7) * HOVER.bob * ramp;
  return { position: new THREE.Vector3(slot.x, HOVER.y + bob, slot.z + HOVER.z), quaternion: tableQuat(0, HOVER.tilt), squash: 0 };
}

const bezier = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) => {
  const u = 1 - t;
  return p0.clone().multiplyScalar(u * u * u).addScaledVector(p1, 3 * u * u * t).addScaledVector(p2, 3 * u * t * t).addScaledVector(p3, t * t * t);
};

/** Deal: slide straight out of the mouth, drop low over the felt (below the cards still in the
 * shoe), glide to the bay, then rise into the hover. */
export function dealPose(start: Pose, pull: THREE.Vector3, forward: THREE.Vector3, end: Pose, t: number, spinSign: number): Pose {
  const u = clamp01(t / DEAL_MS);
  const PULL = 0.3;
  if (u < PULL) {
    const p = ease.inOutCubic(u / PULL);
    return { position: start.position.clone().addScaledVector(pull, p), quaternion: start.quaternion.clone(), squash: 0 };
  }
  const v = ease.inOutCubic((u - PULL) / (1 - PULL));
  const p0 = start.position.clone().add(pull);
  const low = 0.16;
  const p1 = p0.clone().addScaledVector(forward, 0.9); p1.y = low;
  const p2 = new THREE.Vector3(end.position.x, low, end.position.z + 0.3);
  const position = bezier(p0, p1, p2, end.position, v);
  // Rotation: flatten while gliding, then tilt into the hover pose; a slight yaw in flight.
  const spin = Math.sin(v * Math.PI) * 0.12 * spinSign;
  const quaternion = start.quaternion.clone().slerp(end.quaternion, ease.inOutCubic((v - 0.15) / 0.85)).premultiply(qAxis(Y, spin));
  return { position, quaternion, squash: 0 };
}

// ── Reveal ─────────────────────────────────────────────────────────────
/** Flip-and-land. `from` is where the hovering card was; `lifted` is where it hangs and flashes. */
export function revealPose(rest: THREE.Vector3, from: THREE.Vector3, t: number, lifted: THREE.Vector3, tiltToCamera: number, rollSign: number): Pose {
  const { liftEnd, flipStart, flipEnd, holdEnd, impact } = REVEAL;
  let position: THREE.Vector3, tilt: number, squash = 0;
  if (t < liftEnd) {
    const a = ease.outCubic(t / liftEnd);
    position = from.clone().lerp(lifted, a);
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
  const roll = Math.sin(clamp01((t - flipStart) / (flipEnd - flipStart)) * Math.PI) * 0.1 * rollSign;
  return { position, quaternion: tableQuat(flip, tilt, roll), squash };
}

/** 0..1 white wash on the face, peaking just after the flip completes. */
export function revealFlash(t: number) {
  const { flashPeak, holdEnd } = REVEAL;
  if (t < flashPeak - 70) return 0;
  if (t < flashPeak) return ease.outCubic((t - (flashPeak - 70)) / 70);
  return Math.max(0, 1 - ease.outCubic((t - flashPeak) / (holdEnd + 40 - flashPeak)));
}
