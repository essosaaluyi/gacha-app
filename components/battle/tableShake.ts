/**
 * The card table jolts when a card lands hard: a Chance, or an Attack on its
 * target (owner, 2026-11-17).
 *
 * The table moves (`.bcab-table-space`: the felt, its glass and the Pixi cards
 * on it), not the cabinet round it, so it reads as the table being struck
 * rather than the camera shaking. Anything drawn over the table from outside
 * it carries `data-table-fx` and moves with it, so light laid on a card stays
 * on the card.
 *
 * Translation only. The table and the layers over it would turn about
 * different points, so a roll would pull them apart. The offset goes in front
 * of whatever transform an element already wears, so it is in the cabinet's
 * own pixels for all of them (the table's own transform stretches it), and
 * that transform is put back when the shake ends.
 *
 * Layers that do not ride the table but keep out of the cards' way
 * (tableCards.ts) watch the jolt, so the cards stay clear while it moves.
 */

const TABLE = ".bcab-table-space";
const RIDERS = "[data-table-fx]";
/** Cabinet pixels at full strength. */
const REACH = 24;
const DURATION_MS = 460;

type Held = { element: HTMLElement; base: string };

let held: Held[] = [];
let frame = 0;
let startedAt = 0;
let reach = 0;
let offset = { x: 0, y: 0 };

const watchers = new Set<() => void>();

/** How far the table stands from rest right now, in cabinet pixels. */
export function tableShakeOffset() {
  return offset;
}

/** Called each time the table moves, and once more when it comes to rest. */
export function watchTableShake(watcher: () => void) {
  watchers.add(watcher);
  return () => {
    watchers.delete(watcher);
  };
}

function write() {
  for (const { element, base } of held) {
    element.style.transform = `translate(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px) ${base}`.trim();
  }
  watchers.forEach((watcher) => watcher());
}

function settle() {
  window.cancelAnimationFrame(frame);
  frame = 0;
  offset = { x: 0, y: 0 };
  for (const { element, base } of held) element.style.transform = base;
  held = [];
  watchers.forEach((watcher) => watcher());
}

function tick(now: number) {
  const elapsed = now - startedAt;
  const t = elapsed / DURATION_MS;
  if (t >= 1) {
    settle();
    return;
  }
  const decay = (1 - t) ** 2;
  const s = elapsed / 1000;
  const turn = Math.PI * 2;
  // Struck from above: it starts pushed down, then rattles out, two
  // frequencies on each axis so it never swings like a pendulum.
  offset = {
    x: (Math.sin(turn * 13 * s) * 0.65 + Math.sin(turn * 21 * s + 1.7) * 0.35) * reach * decay,
    y: (Math.cos(turn * 11 * s) * 0.65 + Math.sin(turn * 17 * s + 4.2) * 0.35) * reach * 0.75 * decay,
  };
  write();
  frame = window.requestAnimationFrame(tick);
}

/** Jolt the table; `strength` 0–1. A harder landing during a shake takes it over. */
export function shakeTable(strength: number) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const now = performance.now();
  const left = frame ? reach * (1 - Math.min(1, (now - startedAt) / DURATION_MS)) ** 2 : 0;
  const next = REACH * Math.min(1, Math.max(0, strength));
  if (next <= left) return;

  if (!frame) {
    const table = document.querySelector<HTMLElement>(TABLE);
    if (!table) return;
    const riders = Array.from(document.querySelectorAll<HTMLElement>(RIDERS));
    held = [table, ...riders].map((element) => ({ element, base: element.style.transform }));
    frame = window.requestAnimationFrame(tick);
  }
  reach = next;
  startedAt = now;
}

/** Put the table back at once, e.g. when the battle unmounts. */
export function stopTableShake() {
  if (frame || held.length) settle();
}
