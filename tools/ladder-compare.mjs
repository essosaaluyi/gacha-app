/**
 * Compare two ladders over the same hands.
 *
 * Both ladders see an identical sequence of draws, so every difference is the
 * ladder and not the lottery. Weights for the non-tier ("quiet") class are
 * derived rather than hand-tuned, from the identity that falls out of Bayes:
 *
 *   fires = p_real x D / R
 *   p_fake = p_real x (D/N) x (1-R)/R
 *
 * where D is the tier's base rate, N its complement, p_real the share of tier
 * hands showing that colour, and R the reliability you want it to carry.
 *
 *   npx tsx tools/ladder-compare.mjs [count]
 */
import { drawBattleResult } from "../lib/battle-pixi/core/resultLottery.ts";

const COUNT = Number(process.argv[2] ?? 100);

/** Measured tier base rate: bar + double + triple. */
const D = 0.0133;
const N = 1 - D;

/** Share of tier hands showing each colour. Same for both, so only R differs. */
const TIER_SHARE = { gold: 0.22, red: 0.41, green: 0.18, blue: 0.06, white: 0.03 };

const LADDERS = {
  current: { white: 0.02, blue: 0.05, green: 0.35, red: 0.9, gold: 1 },
  loose: { white: 0.005, blue: 0.02, green: 0.1, red: 0.5, gold: 1 },
};

/** Quiet-class weights implied by a set of target reliabilities. */
function quietWeights(reliabilities) {
  const weights = {};
  let used = 0;
  for (const [colour, share] of Object.entries(TIER_SHARE)) {
    const R = reliabilities[colour];
    const fake = R >= 1 ? 0 : (share * (D / N) * (1 - R)) / R;
    weights[colour] = fake;
    used += fake;
  }
  weights.none = Math.max(0, 1 - used);
  return weights;
}

function pick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [k, w] of entries) {
    roll -= w;
    if (roll <= 0) return k === "none" ? null : k;
  }
  return null;
}

function isTier(result) {
  const barWin =
    result.barChance?.scope === "battle" && result.barChance.outcome === "success";
  return barWin || result.result === "TripleChance" || result.result === "Bar"
    || result.result === "DoubleChance";
}

const quiet = Object.fromEntries(
  Object.entries(LADDERS).map(([name, r]) => [name, quietWeights(r)])
);
const tierPick = { ...TIER_SHARE, none: 0.1 };

const stats = {};
for (const name of Object.keys(LADDERS)) {
  stats[name] = { lit: 0, truthful: 0, colours: {} };
}
let tierHands = 0;

for (let i = 0; i < COUNT; i++) {
  const result = drawBattleResult({ barChance: "main" });
  const inTier = isTier(result);
  if (inTier) tierHands++;

  for (const name of Object.keys(LADDERS)) {
    const rung = inTier ? pick(tierPick) : pick(quiet[name]);
    const s = stats[name];
    if (rung) {
      s.lit++;
      s.colours[rung] = (s.colours[rung] ?? 0) + 1;
      if (inTier) s.truthful++;
    }
  }
}

console.log(`${COUNT} draws · ${tierHands} were in the rare tier\n`);
console.log("ladder    lit   truthful   white blue green red gold");
console.log("-".repeat(56));
for (const [name, s] of Object.entries(stats)) {
  const c = s.colours;
  const cols = ["white", "blue", "green", "red", "gold"]
    .map((k) => String(c[k] ?? 0).padStart(k === "white" ? 5 : k.length))
    .join(" ");
  const honesty = s.lit ? `${Math.round((s.truthful / s.lit) * 100)}%`.padStart(4) : "  — ";
  console.log(`${name.padEnd(9)} ${String(s.lit).padStart(3)}   ${honesty}      ${cols}`);
}

console.log("\nwhat each colour would mean:");
console.log("ladder    white  blue  green   red   gold");
console.log("-".repeat(44));
for (const [name, r] of Object.entries(LADDERS)) {
  const row = ["white", "blue", "green", "red", "gold"]
    .map((k) => `${(r[k] * 100).toFixed(1)}%`.padStart(6))
    .join(" ");
  console.log(`${name.padEnd(9)}${row}`);
}

console.log("\nexpected sightings per 100 draws:");
console.log("ladder    white  blue  green   red   gold   any");
console.log("-".repeat(50));
for (const [name, r] of Object.entries(LADDERS)) {
  let any = 0;
  const row = ["white", "blue", "green", "red", "gold"]
    .map((k) => {
      const fires = (TIER_SHARE[k] * D) / r[k];
      any += fires;
      return (fires * 100).toFixed(1).padStart(6);
    })
    .join(" ");
  console.log(`${name.padEnd(9)}${row} ${(any * 100).toFixed(1).padStart(5)}`);
}
