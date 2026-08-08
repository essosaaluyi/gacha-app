// Drives the DOM half of the reel layer, which is only the REACH text.
//
// The combination flash is NOT here: it is a lamp panel drawn on the table
// surface in Pixi, so it can follow the table's perspective and stay inside
// the glass. Nothing about the flash belongs in the DOM.

import type { ReelTenpai } from "@/lib/battle-pixi/core/reelComboRules";

let tenpai: ReelTenpai | null = null;
// Bumped on every write so the overlay can restart its animation even when the
// same tenpai symbol comes up twice in a row.
let token = 0;

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function getReelComboState() {
  return { tenpai, token };
}

export function showReelTenpai(next: ReelTenpai) {
  tenpai = next;
  token += 1;
  notify();
}

export function clearReelTenpai() {
  if (!tenpai) return;
  tenpai = null;
  token += 1;
  notify();
}

/** Full reset — used when a hand is abandoned or a new one begins. */
export function clearReelCombo() {
  clearReelTenpai();
}

// Dev-only console helpers, so the REACH text can be inspected without waiting
// for the right hand to come up:
//   __reelComboState()            -> what the layer currently believes
//   __reelComboPreview("Coin")    -> raise REACH for that symbol
//   __reelComboPreview()          -> clear it
// The table flash has its own preview hook, `__reelFlashPreview`, installed by
// the Pixi stage that draws it.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  const debugWindow = window as Window & {
    __reelComboState?: () => unknown;
    __reelComboPreview?: (symbol?: string) => string;
  };

  debugWindow.__reelComboState = () => getReelComboState();

  debugWindow.__reelComboPreview = (symbol) => {
    if (!symbol) {
      clearReelCombo();
      return "cleared";
    }

    showReelTenpai({
      symbol: symbol as ReelTenpai["symbol"],
      matchedSlots: [0, 1],
      pendingSlot: 2,
    });

    return `reach ${symbol}`;
  };
}

export function subscribeReelCombo(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
