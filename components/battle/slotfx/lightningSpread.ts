// PROVISIONAL — see slotFxStore.ts.
//
// Electricity, drawn the way lightning looks in a photograph: a sharp white
// core that swells and pinches along its length and runs out to a point, a
// narrow band of deep colour hugging it with only a little soft light beyond,
// and hair-thin filaments snapping off it. A line of even width cannot do
// that, so every bolt is a filled shape whose two sides follow its width.
//
// Two things are drawn with it: the short runs round a card as it lands, and
// the spread that leaves a card and runs out over the whole table, past its
// frame. A spread's bolts are struck from the card's edge towards a point
// beyond the table's edge: each grows out from the card, then lets go of it
// and runs off its far end, with a fork or two that follow it. Where a bolt
// goes, its rough shape and where it is thick, are fixed when it is struck,
// so it reads as one bolt; the fine crackle on it is thrown afresh every frame.
//
// Geometry only: points in, path strings out. SlotCardImpact draws them.

export type Point = { x: number; y: number };
/** A point of a bolt and how thick the bolt is there, as a share of its width. */
export type Knot = Point & { w: number };
export type Box = { left: number; top: number; right: number; bottom: number };

/**
 * Some electricity, drawn: the soft light round it, its band of colour, the
 * paler band between that and the core, the white core, and the filaments.
 */
export type Strokes = { halo: string; edge: string; inner: string; core: string; hair: string };
export const noStrokes = (): Strokes => ({ halo: "", edge: "", inner: "", core: "", hair: "" });

type Bolt = {
  /** The bolt's rough shape, card edge to far end. */
  line: Knot[];
  forks: { at: number; line: Knot[] }[];
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

/** A spread's main bolts at their thickest, before knots, in cabinet pixels. */
const TRUNK = 9;

const between = (low: number, high: number) => low + Math.random() * (high - low);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const xy = (p: Point) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

/** A jagged line from a to b: each segment's middle pushed sideways, `depth` times over. */
function jag(a: Knot, b: Knot, roughness: number, depth: number): Knot[] {
  let points = [a, b];
  let push = Math.hypot(b.x - a.x, b.y - a.y) * roughness;
  for (let pass = 0; pass < depth; pass += 1) {
    const next = [points[0]];
    for (let index = 0; index < points.length - 1; index += 1) {
      const p = points[index];
      const q = points[index + 1];
      const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const off = between(-push, push);
      next.push({
        x: (p.x + q.x) / 2 - ((q.y - p.y) / length) * off,
        y: (p.y + q.y) / 2 + ((q.x - p.x) / length) * off,
        w: (p.w + q.w) / 2,
      }, q);
    }
    points = next;
    push *= 0.55;
  }
  return points;
}

/**
 * Where a bolt is thick: a knot here and there, swelling to twice its width,
 * pinched thin in places, and thinner the further it has run.
 */
function thicken(line: Knot[], fade: number) {
  const last = line.length - 1 || 1;
  line.forEach((p, index) => {
    const knot = Math.random();
    p.w = between(0.5, 1.1) * (1 - fade * (index / last)) * (knot < 0.22 ? 2 : knot > 0.85 ? 0.45 : 1);
  });
  return line;
}

/** The point a fraction of the way along a line (by its points, which are about evenly spaced). */
function along(points: Knot[], fraction: number): Knot {
  const at = clamp01(fraction) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(at));
  const t = at - index;
  const p = points[index];
  const q = points[index + 1];
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, w: p.w + (q.w - p.w) * t };
}

/** The part of a line between two fractions of the way along it. */
function cut(points: Knot[], from: number, to: number): Knot[] {
  const last = points.length - 1;
  const out = [along(points, from)];
  for (let index = Math.floor(from * last) + 1; index < to * last; index += 1) out.push(points[index]);
  out.push(along(points, to));
  return out;
}

/** The fine crackle laid over a rough shape. */
function crackle(points: Knot[]): Knot[] {
  const out = [points[0]];
  for (let index = 0; index < points.length - 1; index += 1) {
    out.push(...jag(points[index], points[index + 1], 0.24, 2).slice(1));
  }
  return out;
}

type Shaped = Knot & { t: number };

/**
 * A bolt as a filled shape: down one side and back up the other, each point
 * set out from the line by half its width (plus `extra`, which narrows with
 * the bolt towards its points). Every bolt winds the same way round, so where
 * two cross they fill rather than cancel.
 */
function ribbon(points: Shaped[], extra: number): string {
  const left: string[] = [];
  const right: string[] = [];
  const last = points.length - 1;
  for (let index = 0; index <= last; index += 1) {
    const p = points[index];
    const a = points[Math.max(0, index - 1)];
    const b = points[Math.min(last, index + 1)];
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const half = (p.w + extra * p.t) / 2;
    const nx = (-(b.y - a.y) / length) * half;
    const ny = ((b.x - a.x) / length) * half;
    left.push(xy({ x: p.x + nx, y: p.y + ny }));
    right.push(xy({ x: p.x - nx, y: p.y - ny }));
  }
  return `M${left.join("L")}L${right.reverse().join("L")}Z`;
}

/** A filament: hair-thin, snapping off the bolt at a slant and wandering. */
function hair(points: Shaped[], width: number): string {
  if (points.length < 3) return "";
  const index = 1 + Math.floor(Math.random() * (points.length - 2));
  const p = points[index];
  const a = points[index - 1];
  const b = points[index + 1];
  const heading = Math.atan2(b.y - a.y, b.x - a.x) + between(0.45, 1.3) * (Math.random() < 0.5 ? -1 : 1);
  const length = between(4, 11) * width;
  const end = { x: p.x + Math.cos(heading) * length, y: p.y + Math.sin(heading) * length, w: 0 };
  return `M${jag({ ...p, w: 0 }, end, 0.32, 3).map(xy).join("L")}`;
}

/**
 * Draw one bolt into `out`. Its width follows its knots, times `width`
 * (cabinet pixels), and runs to a point at each end; one `rooted` in a card
 * stays thick where it leaves it. It is drawn a little thicker or thinner each
 * time, so it flickers, and `hairs` filaments snap off it.
 */
export function addBolt(out: Strokes, points: Knot[], width: number, options: { hairs?: number; rooted?: boolean } = {}) {
  if (points.length < 2) return;
  const run = [0];
  for (let index = 1; index < points.length; index += 1) {
    run.push(run[index - 1] + Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y));
  }
  const total = run[run.length - 1];
  if (total < 1) return;
  const tip = Math.min(total * 0.35, 70);
  const root = options.rooted ? tip * 0.25 : tip;
  const flicker = between(0.8, 1.2);
  const shaped: Shaped[] = points.map((p, index) => {
    const t = Math.min(1, run[index] / root, (total - run[index]) / tip);
    const ease = t * (2 - t);
    return { x: p.x, y: p.y, w: p.w * width * flicker * Math.max(0.08, ease), t: Math.max(0.2, ease) };
  });
  const edge = 1.5 + width * 0.6;
  out.halo += ribbon(shaped, 4 + width * 1.4);
  out.edge += ribbon(shaped, edge);
  out.inner += ribbon(shaped, edge * 0.3);
  out.core += ribbon(shaped, 0);
  for (let index = 0; index < (options.hairs ?? 0); index += 1) out.hair += hair(shaped, width);
}

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
      const from = { x: centre.x + dx * halfW * 1.04, y: centre.y + dy * halfH * 1.04, w: 1 };
      // Past the table's edge, and never shorter than a couple of cards.
      const reach = Math.max(toEdge(centre, dx, dy, table) * between(1.1, 1.4), Math.hypot(halfW, halfH) * 1.8);
      const to = { x: centre.x + dx * reach, y: centre.y + dy * reach, w: 1 };
      const line = thicken(jag(from, to, 0.15, 4), 0.45);
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const forks = Array.from({ length: Math.random() < 0.6 ? 1 : 2 }, () => {
        const at = between(0.3, 0.7);
        const base = along(line, at);
        const bend = angle + between(0.35, 0.85) * (Math.random() < 0.5 ? -1 : 1);
        const far = length * between(0.22, 0.42);
        const end = { x: base.x + Math.cos(bend) * far, y: base.y + Math.sin(bend) * far, w: 1 };
        return { at, line: thicken(jag(base, end, 0.2, 3), 0.6) };
      });
      bolts.push({ line, forks, delay: strike * 300 + between(0, 90), grow: between(240, 380), flow: between(380, 520), ink: (index + strike) % inks });
    }
  }
  const ms = Math.max(...bolts.map((bolt) => bolt.delay + bolt.grow * 0.5 + bolt.flow)) + 40;
  return { bolts, ms };
}

/** The spread as it stands `elapsed` ms after the strike: its drawing in each colour, and how much of it is still alight (0–1). */
export function drawSpread(spread: Spread, elapsed: number, inks: number): { strokes: Strokes[]; level: number } {
  const strokes = Array.from({ length: inks }, noStrokes);
  let alight = 0;
  for (const bolt of spread.bolts) {
    const t = elapsed - bolt.delay;
    if (t <= 0) continue;
    const head = 1 - (1 - Math.min(1, t / bolt.grow)) ** 2;
    const tail = clamp01((t - bolt.grow * 0.5) / bolt.flow);
    if (tail >= head) continue;
    alight += 1 - tail;
    const out = strokes[bolt.ink];
    addBolt(out, crackle(cut(bolt.line, tail, head)), TRUNK, { hairs: 4, rooted: tail === 0 });
    // A fork grows as the bolt's front passes it and goes when its back does.
    for (const fork of bolt.forks) {
      const forkHead = clamp01(((head - fork.at) / (1 - fork.at)) * 1.6);
      const forkTail = clamp01(((tail - fork.at) / (1 - fork.at)) * 1.6);
      if (forkTail >= forkHead) continue;
      addBolt(out, crackle(cut(fork.line, forkTail, forkHead)), TRUNK * 0.55, { hairs: 1, rooted: forkTail === 0 });
    }
  }
  return { strokes, level: Math.min(1, alight / (spread.bolts.length * 0.5)) };
}
