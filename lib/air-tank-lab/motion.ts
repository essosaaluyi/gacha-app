/** Art-directed wind field, not CFD or rigid-body physics. Units are metres/seconds. */
import { cardBasis, cardContact, resolveCards, acceptClearCardMoves, type CardPose } from "@/lib/air-tank-lab/collision";
export type Preset = "normal" | "fast" | "hot";
export type CardBody = { x: number; y: number; z: number; vx: number; vy: number; vz: number; rx: number; ry: number; rz: number; phase: number; weight: number; scale: number };
export const STEP = 1 / 120;
export const LIMITS = { radius: 1.48, height: 1.96 };
export const CARD_HEIGHT = 0.9;
// Half-diagonal including card thickness fits inside the chamber at every rotation.
export const CARD_RADIUS = Math.hypot(CARD_HEIGHT / 2, CARD_HEIGHT / 3, 0.009);
export type MotionBounds = { radius: number; height: number; chamberRadius?: number; chamberHalfHeight?: number };
export const CABINET_CARD_SCALE = 1.5;
export const CABINET_LIMITS: MotionBounds = { radius: 1.17, height: 2.78, chamberRadius: 2.05 * 0.98 - 0.025, chamberHalfHeight: 2.51 * 1.45 - 0.02 };
export const CABINET_STRUCTURE_SCALE = { x: 0.98, y: 1.45, z: 0.98 };
export type MotionDrive = { step: number; vortex: number; tumble: number; response: number; maxSpeed: number };

export function createMotion(count: number, seed = 1203, bounds: MotionBounds = LIMITS, cardScale = 1) {
  let value = seed >>> 0;
  const random = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  const cards: CardBody[] = [];
  for (let i = 0; i < count; i++) {
    let candidate: CardBody;
    let attempts = 0;
    do {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * bounds.radius * 0.95;
      candidate = { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, y: (random() * 2 - 1) * bounds.height,
        vx: (random() - 0.5) * 0.8, vy: random() - 0.5, vz: (random() - 0.5) * 0.8,
        rx: random() * 6, ry: random() * 6, rz: random() * 6, phase: random() * 20, weight: 0.7 + random() * 0.6, scale: cardScale };
      if (++attempts > 4000) throw new Error("Card placement could not find a clear pose");
    } while (cards.some(c => cardContact(c, candidate)));
    cards.push(candidate);
  }
  return { cards, bounds, time: 0, remainder: 0, steps: 0, contacts: 0, restores: 0,
    bases: cards.map(c => cardBasis(c)), previous: new Float64Array(count * 9) };
}
export type Motion = ReturnType<typeof createMotion>;

export function windVelocity(x: number, y: number, z: number, t: number, p: number, strength: number, out: number[]) {
  const burst = Math.pow(Math.max(0, Math.sin(t * 1.6 + p)), 10);
  const coreX = Math.sin(t * 0.43) * 0.5;
  out[0] = (-z * 0.62 + Math.sin(t * 0.83 + y * 1.7 + p) * 1.1 + x * (y * 0.7 - 0.15)) * strength;
  out[1] = (2.2 * (0.83 - Math.hypot(x - coreX, z * 0.8)) + burst * 2.1 + Math.sin(t * 1.3 + p + z * 2) * 0.7) * strength;
  out[2] = (x * 0.52 + Math.cos(t * 1.1 + y * 1.3 + p * 0.7) * 1.05 + z * (y * 0.7 - 0.15)) * strength;
}

/** Individual helical paths with a rising core, outer return and changing radii. */
export function vortexVelocity(x: number, y: number, z: number, t: number, p: number, bounds: MotionBounds, drive: MotionDrive, out: number[]) {
  const radius = Math.max(0.12, Math.hypot(x, z));
  const radial = (y / bounds.height) * 1.9 - (radius / bounds.radius - 0.58) * 1.5 + Math.sin(t * 2.3 + p) * 0.65;
  const spin = drive.vortex * (0.82 + Math.sin(p) * 0.16 + Math.sin(t * 1.2 + p) * 0.12);
  out[0] = -z * spin + x / radius * radial + Math.sin(t * 3 + p) * 0.3;
  out[2] = x * spin + z / radius * radial + Math.cos(t * 2.7 + p) * 0.3;
  out[1] = (1 - radius / bounds.radius * 1.8) * 4.2 + Math.sin(t * 2.8 + p) * 1.25;
  out[1] += Math.max(0, -y - bounds.height * 0.65) * 5 - Math.max(0, y - bounds.height * 0.65) * 5;
}

const wallBasis = new Float64Array(9);
function constrain(c: CardPose & { vx: number; vy: number; vz: number }, bounds: MotionBounds) {
  let radius = bounds.radius, height = bounds.height;
  if (bounds.chamberRadius && bounds.chamberHalfHeight) {
    cardBasis(c, wallBasis);
    const size = c.scale ?? 1;
    let horizontal = 0;
    for (const x of [-0.3, 0.3]) for (const y of [-0.45, 0.45]) for (const z of [-0.009, 0.009]) {
      horizontal = Math.max(horizontal, Math.hypot(wallBasis[0] * x + wallBasis[3] * y + wallBasis[6] * z, wallBasis[2] * x + wallBasis[5] * y + wallBasis[8] * z) * size);
    }
    radius = bounds.chamberRadius - horizontal;
    height = bounds.chamberHalfHeight - size * (Math.abs(wallBasis[1]) * 0.3 + Math.abs(wallBasis[4]) * 0.45 + Math.abs(wallBasis[7]) * 0.009);
  }
  const nextR = Math.hypot(c.x, c.z);
  if (nextR > radius) {
    const nx = c.x / nextR, nz = c.z / nextR;
    c.x = nx * radius; c.z = nz * radius;
    const outward = Math.max(0, c.vx * nx + c.vz * nz);
    c.vx -= 1.65 * outward * nx; c.vz -= 1.65 * outward * nz;
  }
  if (Math.abs(c.y) > height) { c.y = Math.sign(c.y) * height; c.vy *= -0.65; }
}
const poseKeys = ["x", "y", "z", "rx", "ry", "rz", "vx", "vy", "vz"] as const;
const wind = [0, 0, 0];

function step(m: Motion, preset: Preset, dt: number, drive?: MotionDrive) {
  m.time += dt;
  m.steps++;
  const strength = preset === "normal" ? 1 : preset === "fast" ? 1.6 : 1.95;
  const t = m.time;
  const radialScale = m.bounds.radius / LIMITS.radius, heightScale = m.bounds.height / LIMITS.height;
  m.cards.forEach((c, i) => poseKeys.forEach((key, j) => { m.previous[i * 9 + j] = c[key]; }));
  for (const c of m.cards) {
    const p = c.phase;
    const r = Math.hypot(c.x, c.z);
    const burst = Math.pow(Math.max(0, Math.sin(t * 1.6 + p)), 10);
    if (drive) vortexVelocity(c.x, c.y, c.z, t, p, m.bounds, drive, wind);
    else {
      windVelocity(c.x / radialScale, c.y / heightScale, c.z / radialScale, t, p, strength, wind);
      wind[0] *= radialScale; wind[1] *= heightScale; wind[2] *= radialScale;
    }
    const response = dt * (drive?.response ?? 1.7) / c.weight;
    c.vx += (wind[0] - c.vx) * response;
    c.vy += (wind[1] - c.vy) * response;
    c.vz += (wind[2] - c.vz) * response;
    // Soft pressure near the glass, followed by an exact conservative bound.
    if (r > 1.1 * radialScale) { const pressure = (r - 1.1 * radialScale) * 4 * dt; c.vx -= c.x * pressure; c.vz -= c.z * pressure; }
    c.vy -= Math.sign(c.y) * Math.max(0, Math.abs(c.y) - 1.7 * heightScale) * 5 * dt;
    // Cushion + bounded travel prevent thin cards tunnelling between fixed steps.
    const speed = Math.hypot(c.vx, c.vy, c.vz);
    const maxSpeed = drive?.maxSpeed ?? 3.2;
    if (speed > maxSpeed) { c.vx *= maxSpeed / speed; c.vy *= maxSpeed / speed; c.vz *= maxSpeed / speed; }
    c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    constrain(c, m.bounds);
    c.rx += dt * (0.22 * c.vy + Math.sin(t * 2.4 + p) * 0.85 + burst * 1.2) * strength;
    c.ry += dt * (0.18 * c.vx + Math.cos(t * 1.4 + p) * 0.65 + 0.23 * Math.sin(p)) * strength;
    c.rz += dt * (0.16 * c.vz + Math.sin(t * 3.1 + p) * 0.65) * strength;
    if (drive) {
      c.rx += dt * drive.tumble * (Math.sin(p) * 0.45 + Math.sin(t * 2 + p) * 0.65);
      c.ry += dt * drive.tumble * (Math.sin(p) > 0 ? 1 : -1) * (0.7 + Math.cos(t * 1.7 + p) * 0.3);
      c.rz += dt * drive.tumble * Math.sin(t * 3.1 + p) * 0.6;
    }
  }
  let result = resolveCards(m.cards, m.bases, c => constrain(c, m.bounds));
  m.contacts += result.contacts;
  if (result.unresolved && m.cards[0]?.scale > 1) {
    // Contact may briefly resist rotation. Yield only the involved cards' new
    // orientation, then let translation continue instead of freezing the tank.
    for (const i of result.blocked) { m.cards[i].rx = m.previous[i * 9 + 3]; m.cards[i].ry = m.previous[i * 9 + 4]; m.cards[i].rz = m.previous[i * 9 + 5]; }
    result = resolveCards(m.cards, m.bases, c => constrain(c, m.bounds));
    m.contacts += result.contacts;
  }
  // Dense multi-card corner cases retain the last clear pose, never an intersecting render.
  if (result.unresolved) {
    if (m.cards[0]?.scale > 1) {
      if (!acceptClearCardMoves(m.cards, m.bases, m.previous, c => constrain(c, m.bounds), m.steps % m.cards.length)) m.restores++;
      return;
    }
    m.restores++;
    m.cards.forEach((c, i) => poseKeys.forEach((key, j) => { if (j < 6 || c.scale === 1) c[key] = m.previous[i * 9 + j]; }));
  }
}

export function advanceMotion(m: Motion, elapsed: number, preset: Preset = "normal", speed = 1, drive?: MotionDrive) {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return;
  // Long inactive gaps are intentionally discarded. Active-frame integration is fixed-step.
  m.remainder += Math.min(elapsed, 0.1) * Math.max(0.25, Math.min(2, speed));
  const dt = drive ? Math.max(1 / 480, Math.min(STEP, drive.step)) : STEP;
  while (m.remainder + 1e-10 >= dt) { step(m, preset, dt, drive); m.remainder -= dt; }
}
