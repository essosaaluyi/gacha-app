/**
 * Trace N draws: what the lottery decided, and what the disc says about it.
 *
 * Reports per draw so the ladder can be read against real hands rather than
 * against aggregate percentages — which is where a cue that fires on the wrong
 * class, or never fires at all, shows up.
 *
 *   npx tsx tools/draw-trace.mjs [count]
 */
import { drawBattleResult } from "../lib/battle-pixi/core/resultLottery.ts";
import { rollDrawTell } from "../lib/battle-pixi/presentation/drawTell.ts";

const COUNT = Number(process.argv[2] ?? 100);

/** Which class the ladder put this hand in, for reading the trace. */
function tierOf(result) {
  const barWin =
    result.barChance?.scope === "battle" && result.barChance.outcome === "success";
  if (barWin || result.result === "TripleChance" || result.result === "Bar") return "TOP";
  if (result.result === "DoubleChance") return "mid";
  return "";
}

const rows = [];
const byRung = {};
const byResult = {};
let lit = 0;

for (let i = 1; i <= COUNT; i++) {
  const result = drawBattleResult({ barChance: "main" });
  // Normal play: no fatal window open.
  const rung = rollDrawTell({
    result,
    fatalActive: false,
    fatalGamesLeft: 0,
    fatalAlreadyHit: false,
  });

  if (rung) lit++;
  const key = rung ?? "—";
  byRung[key] = (byRung[key] ?? 0) + 1;
  byResult[result.result] = (byResult[result.result] ?? 0) + 1;

  rows.push({
    n: i,
    on: rung ? "ON " : "off",
    rung: (rung ?? "—").padEnd(5),
    result: result.result.padEnd(13),
    tier: tierOf(result),
    cards: result.cards.join("/"),
  });
}

console.log(`  #  effect  colour  predetermination  tier  cards`);
console.log(`  ${"-".repeat(66)}`);
for (const r of rows) {
  console.log(
    `${String(r.n).padStart(3)}  ${r.on}     ${r.rung}   ${r.result}  ${r.tier.padEnd(4)}  ${r.cards}`
  );
}

console.log(`\n  effect on: ${lit}/${COUNT}   off: ${COUNT - lit}/${COUNT}`);
console.log(`  by colour: ${Object.entries(byRung).map(([k, v]) => `${k} ${v}`).join("  ")}`);
console.log(
  `  by result: ${Object.entries(byResult)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join("  ")}`
);
