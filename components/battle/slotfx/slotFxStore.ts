// PROVISIONAL — pachislot-style presentation layer (trial, 2026-11-16).
//
// Everything in components/battle/slotfx is a trial dressing laid over the
// battle: big award numbers, the round title, the flash on each card stop and
// the scene telops. It only watches what the game already announces; it never
// decides or delays anything. Turn the whole layer off with SLOT_FX.enabled,
// or one part at a time with the flags beside it.

export const SLOT_FX = {
  enabled: true,
  /** "+15 GET!" when battle points are paid. */
  award: true,
  /** Slot-style ROUND title in the round intro. */
  roundTitle: true,
  /** Screen flash and tint as each table card stops. */
  stopFlash: true,
  /** Scene telops (ATTACK!, CHANCE, ENEMY DOWN ...). */
  telops: true,
};

/** Colour families, after the reference machine's tiers. */
export type SlotTone = "fire" | "gold" | "ice" | "rainbow" | "violet";

export type SlotTelop = {
  key: number;
  /** Small line above the main text ("TOTAL", "ROUND"). */
  lead?: string;
  main: string;
  /** Tag after the main text ("GET!"). */
  tail?: string;
  tone: SlotTone;
  /** Numbers count up to this value instead of appearing at once. */
  countTo?: number;
  /** "big" fills the screen; "small" is a caption that leaves the scene readable. */
  size: "big" | "small";
  durationMs: number;
};

export type SlotStop = {
  key: number;
  /** 1, 2 or 3: which stop of the hand this is. */
  order: number;
  tone: SlotTone | "plain";
  strong: boolean;
};

let telop: SlotTelop | null = null;
let stop: SlotStop | null = null;
let key = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function showSlotTelop(next: Omit<SlotTelop, "key" | "durationMs" | "size"> & { durationMs?: number; size?: SlotTelop["size"] }) {
  if (!SLOT_FX.enabled) return;
  key += 1;
  telop = { size: "big", durationMs: 1500, ...next, key };
  notify();
}

export function clearSlotTelop(forKey: number) {
  if (telop?.key !== forKey) return;
  telop = null;
  notify();
}

/** Award tiers: small wins burn red, mid wins go gold, big ones turn blue. */
export function showSlotAward(points: number) {
  if (!SLOT_FX.enabled || !SLOT_FX.award || points <= 0) return;
  const tone: SlotTone = points >= 100 ? "ice" : points >= 20 ? "gold" : "fire";
  showSlotTelop({
    lead: points >= 100 ? "TOTAL" : undefined,
    main: `+${points}`,
    tail: "GET!",
    tone,
    countTo: points,
    durationMs: points >= 100 ? 2100 : 1600,
  });
}

export function showSlotStop(next: Omit<SlotStop, "key">) {
  if (!SLOT_FX.enabled || !SLOT_FX.stopFlash) return;
  key += 1;
  stop = { ...next, key };
  notify();
}

export function getSlotTelop() { return telop; }
export function getSlotStop() { return stop; }
export function subscribeSlotFx(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
