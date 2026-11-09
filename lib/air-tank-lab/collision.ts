/** Oriented card boxes: SAT on all 15 axes, with a small air cushion around the faces. */
export type CardPose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; scale?: number };
export const HALF_CARD = [0.3, 0.45, 0.045] as const;
export type Contact = { nx: number; ny: number; nz: number; depth: number };
const radiusSquared = HALF_CARD.reduce((sum, n) => sum + n * n, 0);

export function cardBasis(c: CardPose, out: Float64Array = new Float64Array(9)) {
  // Columns of Three.js Euler XYZ's rotation matrix, matching the rendered mesh.
  const a = Math.cos(c.rx), b = Math.sin(c.rx), d = Math.sin(c.ry), e = Math.cos(c.rz), f = Math.sin(c.rz), h = Math.cos(c.ry);
  out[0] = h * e; out[1] = a * f + b * e * d; out[2] = b * f - a * e * d;
  out[3] = -h * f; out[4] = a * e - b * f * d; out[5] = b * e + a * f * d;
  out[6] = d; out[7] = -b * h; out[8] = a * h;
  return out;
}

export function cardContact(a: CardPose, b: CardPose, basisA: Float64Array = cardBasis(a), basisB: Float64Array = cardBasis(b), halfDepth: number = HALF_CARD[2]): Contact | null {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const scaleA = a.scale ?? 1, scaleB = b.scale ?? 1;
  if (dx * dx + dy * dy + dz * dz > radiusSquared * (scaleA + scaleB) ** 2) return null;
  let depth = Infinity, nx = 0, ny = 0, nz = 0;
  const axis = (x: number, y: number, z: number) => {
    const length = Math.hypot(x, y, z);
    if (length < 1e-8) return true;
    x /= length; y /= length; z /= length;
    const project = (m: Float64Array) =>
      Math.abs(x * m[0] + y * m[1] + z * m[2]) * HALF_CARD[0] +
      Math.abs(x * m[3] + y * m[4] + z * m[5]) * HALF_CARD[1] +
      Math.abs(x * m[6] + y * m[7] + z * m[8]) * halfDepth;
    const separation = dx * x + dy * y + dz * z;
    const overlap = project(basisA) * scaleA + project(basisB) * scaleB - Math.abs(separation);
    if (overlap <= 0) return false;
    if (overlap < depth) { depth = overlap; const sign = separation >= 0 ? 1 : -1; nx = x * sign; ny = y * sign; nz = z * sign; }
    return true;
  };
  for (let i = 0; i < 9; i += 3) if (!axis(basisA[i], basisA[i + 1], basisA[i + 2]) || !axis(basisB[i], basisB[i + 1], basisB[i + 2])) return null;
  for (let i = 0; i < 9; i += 3) for (let j = 0; j < 9; j += 3) {
    if (!axis(basisA[i + 1] * basisB[j + 2] - basisA[i + 2] * basisB[j + 1],
      basisA[i + 2] * basisB[j] - basisA[i] * basisB[j + 2], basisA[i] * basisB[j + 1] - basisA[i + 1] * basisB[j])) return null;
  }
  return { nx, ny, nz, depth };
}

type MovingCard = CardPose & { vx: number; vy: number; vz: number };
export function resolveCards(cards: MovingCard[], bases: Float64Array[], constrain: (c: MovingCard) => void) {
  cards.forEach((c, i) => cardBasis(c, bases[i]));
  let contacts = 0;
  const iterations = cards.some(c => (c.scale ?? 1) > 1) ? 36 : 18;
  for (let iteration = 0; iteration < iterations; iteration++) {
    let maxDepth = 0;
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i], b = cards[j];
      const hit = cardContact(a, b, bases[i], bases[j]);
      if (!hit || hit.depth < 1e-6) continue;
      contacts++; maxDepth = Math.max(maxDepth, hit.depth);
      const push = (hit.depth + 0.0004) * 0.5;
      a.x -= hit.nx * push; a.y -= hit.ny * push; a.z -= hit.nz * push;
      b.x += hit.nx * push; b.y += hit.ny * push; b.z += hit.nz * push;
      const closing = (b.vx - a.vx) * hit.nx + (b.vy - a.vy) * hit.ny + (b.vz - a.vz) * hit.nz;
      if (closing < 0) {
        const impulse = closing * 0.53;
        a.vx += hit.nx * impulse; a.vy += hit.ny * impulse; a.vz += hit.nz * impulse;
        b.vx -= hit.nx * impulse; b.vy -= hit.ny * impulse; b.vz -= hit.nz * impulse;
      }
    }
    cards.forEach(constrain);
    if (maxDepth < 1e-5) break;
  }
  let unresolved = false;
  const blocked = new Set<number>();
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const hit = cardContact(cards[i], cards[j], bases[i], bases[j]);
    // The cushion may compress in a dense cluster. Only reject a pose if the
    // actual 0.018-thick artwork boxes still intersect after the contact pass.
    if (hit && cardContact(cards[i], cards[j], bases[i], bases[j], 0.009)) { unresolved = true; blocked.add(i); blocked.add(j); }
  }
  return { contacts, unresolved, blocked };
}

/** Rare dense contacts yield one card at a time from a known clear pose, so a
 * tangled pair cannot hold every other card still. Each accepted path is sampled
 * at short surface-travel intervals against the current neighbouring solids. */
export function acceptClearCardMoves(cards: MovingCard[], bases: Float64Array[], previous: Float64Array, constrain: (c: MovingCard) => void, order: number) {
  const keys = ["x", "y", "z", "rx", "ry", "rz"] as const;
  const goals = cards.map(c => keys.map(key => c[key]));
  cards.forEach((c, i) => { keys.forEach((key, j) => { c[key] = previous[i * 9 + j]; }); cardBasis(c, bases[i]); });
  let moved = 0;
  for (let offset = 0; offset < cards.length; offset++) {
    const i = (order + offset) % cards.length, card = cards[i];
    const old = keys.map((_, j) => previous[i * 9 + j]);
    const goal = goals[i];
    const distance = Math.hypot(goal[0] - old[0], goal[1] - old[1], goal[2] - old[2]);
    if (distance > 0.04) for (let j = 0; j < 3; j++) goal[j] = old[j] + (goal[j] - old[j]) * 0.04 / distance;
    let accepted = false;
    for (const rotate of [true, false]) {
      if (accepted) break;
      for (const fraction of [1, 0.5, 0.25, 0.1]) {
        const angular = rotate ? Math.hypot(goal[3] - old[3], goal[4] - old[4], goal[5] - old[5]) * 0.55 * (card.scale ?? 1) : 0;
        const samples = Math.max(1, Math.ceil((Math.min(0.04, distance) + angular) * fraction / 0.018));
        let clear = true;
        for (let sample = 1; sample <= samples && clear; sample++) {
          const t = fraction * sample / samples;
          keys.forEach((key, j) => { card[key] = j < 3 || rotate ? old[j] + (goal[j] - old[j]) * t : old[j]; });
          constrain(card); cardBasis(card, bases[i]);
          for (let j = 0; j < cards.length; j++) if (j !== i && cardContact(card, cards[j], bases[i], bases[j], 0.00901)) { clear = false; break; }
        }
        if (clear) { accepted = true; moved++; break; }
        keys.forEach((key, j) => { card[key] = old[j]; }); cardBasis(card, bases[i]);
      }
    }
  }
  return moved;
}
