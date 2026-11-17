// PROVISIONAL — see slotFxStore.ts.
//
// Electricity that leaves a card and runs out over the whole table, past its
// frame. Each bolt is struck from the card's edge towards a point beyond the
// table's edge: it grows out from the card, then lets go of it and runs off
// its far end, with a fork or two that follow it. Where a bolt goes, and its
// rough shape, are fixed when it is struck, so it reads as a direction; the
// fine crackle on it is thrown afresh every frame.
//
// Geometry only: points in, path strings out. SlotCardImpact draws them.

export type Point = { x: number; y: number };
export type Box = { left: number; top: number; right: number; bottom: number };

type Bolt = {
  /** The bolt's rough shape, card edge to far end. */
  line: Point[];
  forks: { at: number; line: Point[] }[];
  /** ms after the strike that it leaves the card. */
  delay: number;
  /** ms for its front to reach the far end. */
  grow: number;
  /** ms for its back to let go of the card and run off the end. */
  flow: number;
  /** Which colour of the look it is drawn in. */
  ink: number;
};

export type Spread = { bolts: Bolt[]; ms: number };

const between = (low: number, high: number) => low + Math.random() * (high - low);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** A jagged line from a to b: each segment's middle pushed sideways, `depth` times over. */
function jag(a: Point, b: Point, roughness: number, depth: number): Point[] {
  let points = [a, b];
  let push = Math.hypot(b.x - a.x, b.y - a.y) * roughness;
  for (let pass = 0; pass < depth; pass += 1) {
    const next = [points[0]];
    for (let index = 0; index < points.length - 1; index += 1) {
      const p = points[index];
      const q = points[index + 1];
      const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const off = between(-push, push);
      next.push({ x: (p.x + q.x) / 2 - ((q.y - p.y) / length) * off, y: (p.y + q.y) / 2 + ((q.x - p.x) / length) * off }, q);
    }
    points = next;
    push *= 0.55;
  }
  return points;
}

/** The point a fraction of the way along a line (by its points, which are about evenly spaced). */
function along(points: Point[], fraction: number): Point {
  const at = clamp01(fraction) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(at));
  const t = at - index;
  const p = points[index];
  const q = points[index + 1];
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}

/** The part of a line between two fractions of the way along it. */
function cut(points: Point[], from: number, to: number): Point[] {
  const last = points.length - 1;
  const out = [along(points, from)];
  for (let index = Math.floor(from * last) + 1; index < to * last; index += 1) out.push(points[index]);
  out.push(along(points, to));
  return out;
}

/** The fine crackle laid over a rough shape. */
function crackle(points: Point[]): Point[] {
  const out = [points[0]];
  for (let index = 0; index < points.length - 1; index += 1) {
    out.push(...jag(points[index], points[index + 1], 0.32, 2).slice(1));
  }
  return out;
}

const path = (points: Point[]) =>
  points.map((p, index) => `${index === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");

/** How far from p, going (dx, dy), the edge of the box is. */
function toEdge(p: Point, dx: number, dy: number, box: Box) {
  const across = dx > 0 ? (box.right - p.x) / dx : dx < 0 ? (box.left - p.x) / dx : Infinity;
  const down = dy > 0 ? (box.bottom - p.y) / dy : dy < 0 ? (box.top - p.y) / dy : Infinity;
  return Math.max(0, Math.min(across, down));
}

/**
 * Strike a spread: `count` bolts all round the card, and a second, smaller
 * strike a moment later, so the table keeps running with it.
 */
export function planSpread(corners: Point[], table: Box, inks: number, count: number): Spread {
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const centre = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
  const halfW = (Math.max(...xs) - Math.min(...xs)) / 2;
  const halfH = (Math.max(...ys) - Math.min(...ys)) / 2;

  const bolts: Bolt[] = [];
  for (let strike = 0; strike < 2; strike += 1) {
    const many = strike === 0 ? count : Math.round(count * 0.6);
    const turn = Math.random() * Math.PI * 2;
    for (let index = 0; index < many; index += 1) {
      const angle = turn + (index / many) * Math.PI * 2 + between(-0.25, 0.25);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const from = { x: centre.x + dx * halfW * 1.04, y: centre.y + dy * halfH * 1.04 };
      // Past the table's edge, and never shorter than a couple of cards.
      const reach = Math.max(toEdge(centre, dx, dy, table) * between(1.1, 1.4), Math.hypot(halfW, halfH) * 1.8);
      const to = { x: centre.x + dx * reach, y: centre.y + dy * reach };
      const line = jag(from, to, 0.15, 4);
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const forks = Array.from({ length: Math.random() < 0.6 ? 1 : 2 }, () => {
        const at = between(0.3, 0.7);
        const base = along(line, at);
        const bend = angle + between(0.35, 0.85) * (Math.random() < 0.5 ? -1 : 1);
        const far = length * between(0.22, 0.42);
        return { at, line: jag(base, { x: base.x + Math.cos(bend) * far, y: base.y + Math.sin(bend) * far }, 0.2, 3) };
      });
      bolts.push({ line, forks, delay: strike * 300 + between(0, 90), grow: between(240, 380), flow: between(380, 520), ink: (index + strike) % inks });
    }
  }
  const ms = Math.max(...bolts.map((bolt) => bolt.delay + bolt.grow * 0.5 + bolt.flow)) + 40;
  return { bolts, ms };
}

/** The spread as it stands `elapsed` ms after the strike: one path per colour, and how much of it is still alight (0–1). */
export function drawSpread(spread: Spread, elapsed: number, inks: number): { paths: string[]; level: number } {
  const paths = Array.from({ length: inks }, () => "");
  let alight = 0;
  for (const bolt of spread.bolts) {
    const t = elapsed - bolt.delay;
    if (t <= 0) continue;
    const head = 1 - (1 - Math.min(1, t / bolt.grow)) ** 2;
    const tail = clamp01((t - bolt.grow * 0.5) / bolt.flow);
    if (tail >= head) continue;
    alight += 1 - tail;
    paths[bolt.ink] += path(crackle(cut(bolt.line, tail, head)));
    // A fork grows as the bolt's front passes it and goes when its back does.
    for (const fork of bolt.forks) {
      const forkHead = clamp01(((head - fork.at) / (1 - fork.at)) * 1.6);
      const forkTail = clamp01(((tail - fork.at) / (1 - fork.at)) * 1.6);
      if (forkTail >= forkHead) continue;
      paths[bolt.ink] += path(crackle(cut(fork.line, forkTail, forkHead)));
    }
  }
  return { paths, level: Math.min(1, alight / (spread.bolts.length * 0.5)) };
}
