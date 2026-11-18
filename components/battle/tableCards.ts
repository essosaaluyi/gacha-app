/**
 * A card lying on the table is always in front (owner, 2026-11-18): no light,
 * frame flash, wave, lightning or shade may cover it, in any scene.
 *
 * Inside the Pixi stage that is a matter of drawing order (BattlePixiStage puts
 * its effects under the cards). The cabinet's own layers lie over the whole
 * table instead — the lamps and the shade of SlotCabinetLights, the lightning
 * of SlotCardImpact, the deck effects canvas — so each of them is cut away
 * where a card lies: it is clipped to everything but the cards.
 *
 * The stage says where each card lies as it lands and lets go of them all when
 * the hand is cleared. Outlines are in the stage's own 1200 x 500 space and are
 * carried to each layer through the page, the way SlotCardImpact places its
 * lightning, so a layer may be anywhere and at any scale. A layer that rides
 * the table's jolt (`data-table-fx`) moves with the cards, so it is measured
 * against its own box, as is every other layer: each sees the cards where they
 * stand relative to it.
 */

import { watchTableShake } from "@/components/battle/tableShake";

const STAGE_W = 1200;
const STAGE_H = 500;
const MOUNT = ".bcab-pixi-mount";

/** Each slot's card, as its four corners on the stage, or nothing. */
const cards = new Map<number, number[]>();
const layers = new Set<Element>();
let unwatch: (() => void) | null = null;

const at = (value: number) => value.toFixed(1);

function clip(layer: Element) {
  const style = (layer as HTMLElement | SVGElement).style;
  const mount = document.querySelector<HTMLElement>(MOUNT);
  if (!cards.size || !mount) {
    style.clipPath = "";
    return;
  }
  const box = layer.getBoundingClientRect();
  // The layer's own pixels per page pixel. An SVG has no offsetWidth, so it is
  // read from the element that holds it, which it fills.
  const sized = layer instanceof HTMLElement ? layer : layer.parentElement;
  const holder = sized?.getBoundingClientRect();
  if (!sized || !holder || box.width === 0 || holder.width === 0) return;
  const scale = sized.offsetWidth / holder.width;
  const table = mount.getBoundingClientRect();
  const w = box.width * scale;
  const h = box.height * scale;

  let path = `M0 0H${at(w)}V${at(h)}H0Z`;
  for (const quad of cards.values()) {
    for (let index = 0; index < 8; index += 2) {
      const x = (table.left + (quad[index] / STAGE_W) * table.width - box.left) * scale;
      const y = (table.top + (quad[index + 1] / STAGE_H) * table.height - box.top) * scale;
      path += `${index === 0 ? "M" : "L"}${at(x)} ${at(y)}`;
    }
    path += "Z";
  }
  style.clipPath = `path(evenodd, "${path}")`;
}

/*
 * The table stands in front of the screen (owner, 2026-11-18), so the light of
 * the screen's frame goes behind it: a layer kept behind the table is clipped
 * to everything but the lower cabinet (the deck) and the table's far rim, which
 * rises a little over the foot of the screen.
 */
const DECK = ".bcab-deck";
const TABLE = ".bcab-card-table";
/**
 * The table's outline near its far edge, as fractions of its box (the art
 * leaves a margin above the rim and bevels the far corners). Measured on the
 * cabinet in the browser; if the table art changes, these do too.
 */
const TABLE_RIM = { top: 0.064, cornerX: 0.1866, bevelX: 0.1598, bevelY: 0.0848, sideX: 0.1384, sideY: 0.1312 };
const behind = new Set<Element>();

/** The layer's own pixels for a page point, and its size, or null if it has none. */
function frameOf(layer: Element) {
  const box = layer.getBoundingClientRect();
  const sized = layer instanceof HTMLElement ? layer : layer.parentElement;
  const holder = sized?.getBoundingClientRect();
  if (!sized || !holder || box.width === 0 || holder.width === 0) return null;
  const scale = sized.offsetWidth / holder.width;
  return {
    x: (pageX: number) => (pageX - box.left) * scale,
    y: (pageY: number) => (pageY - box.top) * scale,
    w: box.width * scale,
    h: box.height * scale,
  };
}

function clipBehindTable(layer: Element) {
  const style = (layer as HTMLElement | SVGElement).style;
  const deck = document.querySelector(DECK)?.getBoundingClientRect();
  const table = document.querySelector(TABLE)?.getBoundingClientRect();
  const frame = frameOf(layer);
  if (!deck || !table || table.width === 0 || !frame) {
    style.clipPath = "";
    return;
  }
  const { x, y, w, h } = frame;
  const tx = (f: number) => x(table.left + table.width * f);
  const ty = (f: number) => y(table.top + table.height * f);
  const top = y(deck.top), bottom = y(deck.bottom), left = x(deck.left), right = x(deck.right);
  const rim = ty(TABLE_RIM.top);

  const outline: [number, number][] = [[left, top]];
  if (rim < top) {
    // Where each side of the table meets the deck's edge, along its slope.
    const side = (f: (v: number) => number) => {
      const fromY = ty(TABLE_RIM.bevelY), toY = ty(TABLE_RIM.sideY);
      const t = toY === fromY ? 0 : (top - fromY) / (toY - fromY);
      return tx(f(TABLE_RIM.bevelX)) + (tx(f(TABLE_RIM.sideX)) - tx(f(TABLE_RIM.bevelX))) * t;
    };
    const near = (v: number) => v, far = (v: number) => 1 - v;
    const bevel = ty(TABLE_RIM.bevelY) < top;
    outline.push([side(near), top]);
    if (bevel) outline.push([tx(TABLE_RIM.bevelX), ty(TABLE_RIM.bevelY)]);
    outline.push([tx(TABLE_RIM.cornerX), rim], [tx(1 - TABLE_RIM.cornerX), rim]);
    if (bevel) outline.push([tx(far(TABLE_RIM.bevelX)), ty(TABLE_RIM.bevelY)]);
    outline.push([side(far), top]);
  }
  outline.push([right, top], [right, bottom], [left, bottom]);

  const hole = outline.map(([px, py], index) => `${index === 0 ? "M" : "L"}${at(px)} ${at(py)}`).join("");
  style.clipPath = `path(evenodd, "M0 0H${at(w)}V${at(h)}H0Z${hole}Z")`;
}

function clipAll() {
  layers.forEach(clip);
  behind.forEach(clipBehindTable);
}

function follow() {
  const busy = (cards.size > 0 && layers.size > 0) || behind.size > 0;
  if (busy && !unwatch) {
    const stopShake = watchTableShake(clipAll);
    window.addEventListener("resize", clipAll);
    unwatch = () => {
      stopShake();
      window.removeEventListener("resize", clipAll);
    };
  } else if (!busy && unwatch) {
    unwatch();
    unwatch = null;
  }
}

/** A card has come to rest in a slot; `quad` is its four corners on the stage. */
export function setTableCard(slot: number, quad: readonly number[]) {
  if (typeof window === "undefined" || quad.length < 8) return;
  cards.set(slot, quad.slice(0, 8));
  follow();
  clipAll();
}

/** The table has been cleared. */
export function clearTableCards() {
  if (typeof window === "undefined" || !cards.size) return;
  cards.clear();
  follow();
  clipAll();
}

/**
 * A ref for a layer of the screen's own light: it stays behind the table and
 * the deck (and so behind every card on them) for as long as it is mounted.
 */
export function keepBehindTable(layer: Element | null) {
  if (!layer) return;
  behind.add(layer);
  follow();
  clipBehindTable(layer);
  return () => {
    behind.delete(layer);
    (layer as HTMLElement | SVGElement).style.clipPath = "";
    follow();
  };
}

/**
 * A ref for a layer drawn over the table: it keeps out of the cards' way for
 * as long as it is mounted. Stable, so React attaches it once.
 */
export function keepClearOfTableCards(layer: Element | null) {
  if (!layer) return;
  layers.add(layer);
  follow();
  clip(layer);
  return () => {
    layers.delete(layer);
    (layer as HTMLElement | SVGElement).style.clipPath = "";
    follow();
  };
}
