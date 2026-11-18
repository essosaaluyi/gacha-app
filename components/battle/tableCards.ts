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

function clipAll() {
  layers.forEach(clip);
}

function follow() {
  const busy = cards.size > 0 && layers.size > 0;
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
