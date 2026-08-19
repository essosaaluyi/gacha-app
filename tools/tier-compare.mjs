/**
 * Compare tier compositions against *shipping* odds.
 *
 * Because the ladder self-calibrates, every composition carries the same
 * reliabilities by construction. What changes is how often the disc speaks, and
 * — the part worth deciding on — what a colour actually turns out to be.
 *
 *   npx tsx tools/tier-compare.mjs
 */
import { getBaselineResultShares } from "../lib/battle-pixi/core/resultLottery.ts";

const R = { white: 0.05, blue: 0.12, green: 0.35, red: 0.85, gold: 1 };
const TOP_SHARE = { gold: 22, red: 41, green: 18, blue: 6, white: 3 };
const MID_SHARE = { gold: 0, red: 27, green: 32, blue: 18, white: 11 };
const RUNGS = ["white", "blue", "green", "red", "gold"];

/** Shipping shares, in fractions. Pins are ignored by this accessor. */
const base = Object.fromEntries(
  Object.entries(getBaselineResultShares()).map(([k, v]) => [k, v / 100])
);
const rate = (names) => names.reduce((sum, n) => sum + (base[n] ?? 0), 0);

const COMPOSITIONS = {
  "current (reply in)": { top: ["Bar", "TripleChance"], mid: ["DoubleChance", "Reply"] },
  "swapped (single in, reply out)": { top: ["Bar", "TripleChance"], mid: ["DoubleChance", "SingleChance"] },
  "both (single + reply)": { top: ["Bar", "TripleChance"], mid: ["DoubleChance", "SingleChance", "Reply"] },
  "chance only": { top: ["Bar", "TripleChance"], mid: ["DoubleChance"] },
};

for (const [label, { top, mid }] of Object.entries(COMPOSITIONS)) {
  const topRate = rate(top);
  const midRate = rate(mid);
  const tier = topRate + midRate;

  console.log(`\n=== ${label} ===`);
  console.log(`tier ${(tier * 100).toFixed(2)}%  ·  top ${top.join("+")} ${(topRate * 100).toFixed(2)}%  ·  mid ${mid.join("+")} ${(midRate * 100).toFixed(2)}%`);

  let anyCue = 0;
  const lines = [];
  for (const rung of RUNGS) {
    const share =
      ((TOP_SHARE[rung] / 100) * topRate + (MID_SHARE[rung] / 100) * midRate) / tier;
    const fires = (share * tier) / R[rung];
    anyCue += fires;

    // Of the times this colour is telling the truth, which outcome shows up.
    const realTop = (TOP_SHARE[rung] / 100) * topRate;
    const realMid = (MID_SHARE[rung] / 100) * midRate;
    const real = realTop + realMid;
    const parts = [];
    if (real > 0) {
      for (const name of top) {
        const p = ((base[name] / topRate) * realTop) / real;
        if (p > 0.005) parts.push(`${name} ${(p * 100).toFixed(0)}%`);
      }
      for (const name of mid) {
        const p = ((base[name] / midRate) * realMid) / real;
        if (p > 0.005) parts.push(`${name} ${(p * 100).toFixed(0)}%`);
      }
    }
    lines.push(
      `  ${rung.padEnd(6)} fires ${(fires * 100).toFixed(2).padStart(5)}%  (1 in ${String(Math.round(1 / fires)).padStart(4)})   when true: ${parts.join("  ")}`
    );
  }
  console.log(lines.join("\n"));
  console.log(`  any cue: ${(anyCue * 100).toFixed(1)}% of draws`);
}
