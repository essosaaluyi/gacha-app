// Pure timeline for the real-3D card lab. Every pose is a function of sim time,
// so QA can seek any frame and get the same picture.
import * as THREE from "three";

export const CARD = { width: 2, height: 3.125, thickness: 0.032, radius: 0.1 } as const;
export const SLOT_X = [-2.75, 0, 2.75] as const;
export const REST_Y = CARD.thickness / 2 + 0.006;

export const EJECT_STAGGER_MS = 160;
export const EJECT_MS = 340;
export const DEAL_STAGGER_MS = 150;
export const DEAL_MS = 620;
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

/** Outlet: cards slide down out of the mouth, 1→2→3, each a little lower and nearer. */
export function outletLocal(index: number, u: number) {
  const hiddenY = 1.78, outY = -0.08 - (2 - index) * 0.24;
  const y = THREE.MathUtils.lerp(hiddenY, outY, ease.outBack(u, 1.2));
  return new THREE.Vector3((index - 1) * 0.06, y, 0.04 + index * 0.05);
}

export function dealPose(start: Pose, slot: number, t: number): Pose {
  const u = clamp01(t / DEAL_MS);
  // 0–0.18: pull the card fully out of the mouth; then an arc onto the slot.
  const pull = ease.outCubic(u / 0.18);
  const travel = ease.inOutCubic((u - 0.12) / 0.88);
  const end = new THREE.Vector3(SLOT_X[slot], REST_Y, 0);
  const from = start.position.clone().add(new THREE.Vector3(0.15, -0.35, 0.25).multiplyScalar(pull));
  const control = from.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 2.4, -0.4));
  const a = from.clone().lerp(control, travel), b = control.clone().lerp(end, travel);
  const position = a.lerp(b, travel);
  // Small settle: the card skids 0.1 further, then eases back into the bay.
  const settle = u > 0.86 ? Math.sin(((u - 0.86) / 0.14) * Math.PI) * 0.1 : 0;
  position.x += settle * Math.sign(end.x - start.position.x || 1) * 0.4;
  position.y += u > 0.86 ? Math.sin(((u - 0.86) / 0.14) * Math.PI) * 0.06 : 0;
  const spin = Math.sin(travel * Math.PI) * 0.35 * (slot - 1 || 0.6);
  const quaternion = start.quaternion.clone().slerp(tableQuat(0), ease.inOutCubic((u - 0.1) / 0.8)).premultiply(qAxis(Y, spin));
  return { position, quaternion, squash: 0 };
}

/** Flip-and-land reveal. `lifted` is the point near the camera where the card hangs and flashes. */
export function revealPose(slot: number, t: number, lifted: THREE.Vector3, tiltToCamera: number): Pose {
  const rest = new THREE.Vector3(SLOT_X[slot], REST_Y, 0);
  const { liftEnd, flipStart, flipEnd, holdEnd, impact } = REVEAL;
  let position: THREE.Vector3, tilt: number, squash = 0;
  if (t < liftEnd) {
    const a = ease.outCubic(t / liftEnd);
    position = rest.clone().lerp(lifted, a);
    tilt = tiltToCamera * a;
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
