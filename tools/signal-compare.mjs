/**
 * The cabinet speaks in two colour languages at once. This measures both
 * against the same question — "is this draw in the tier?" — so they can be
 * compared like with like.
 *
 *   disc   lib/battle-pixi/presentation/drawTell.ts
 *   statue lib/game-config/cabinetSignalConfig.ts (statue.chanceToneWeights)
 *
 *   npx tsx tools/signal-compare.mjs [count]
 */
import { drawBattleResult } from "../lib/battle-pixi/core/resultLottery.ts";
import { rollDrawTell } from "../lib/battle-pixi/presentation/drawTell.ts";
import { cabinetSignalConfig } from "../lib/game-config/cabinetSignalConfig.ts";

const N = Number(process.argv[2] ?? 400000);
const S = cabinetSignalConfig.statue;

function statueTone(result) {
  const chanceCount = result.cards.filter((c) => c === "Chance").length;
  if (chanceCount > 0 && Math.random() < S.chanceSignalChance) {
    const w = S.chanceToneWeights[Math.min(3, chanceCount)];
    const roll = Math.random() * (w.blue + w.green + w.red);
    if (roll < w.blue) return "blue";
    if (roll < w.blue + w.green) return "green";
    return "red";
  }
  if (result.result === "Empty" && Math.random() < S.emptyFakeChance) return "white";
  return null;
}

function inTier(result) {
  const barWin =
    result.barChance?.scope === "battle" && result.barChance.outcome === "success";
  return (
    barWin ||
    result.result === "TripleChance" ||
    result.result === "Bar" ||
    result.result === "DoubleChance" ||
    result.result === "Reply"
  );
}

const seen = { disc: {}, statue: {} };
const hit = { disc: {}, statue: {} };
let tier = 0;

for (let i = 0; i < N; i++) {
  const result = drawBattleResult({ barChance: "main" });
  const t = inTier(result);
  if (t) tier++;

  const disc = rollDrawTell({
    result, fatalActive: false, fatalGamesLeft: 0, fatalAlreadyHit: false,
  });
  const statue = statueTone(result);

  for (const [name, rung] of [["disc", disc], ["statue", statue]]) {
    if (!rung) continue;
    seen[name][rung] = (seen[name][rung] ?? 0) + 1;
    if (t) hit[name][rung] = (hit[name][rung] ?? 0) + 1;
  }
}

console.log(`${N} draws · tier base rate ${(tier / N * 100).toFixed(2)}%\n`);
console.log("colour   surface   fires on    means (tier)");
console.log("-".repeat(48));
for (const colour of ["white", "blue", "green", "red", "gold"]) {
  for (const name of ["disc", "statue"]) {
    const n = seen[name][colour] ?? 0;
    if (!n) continue;
    const means = ((hit[name][colour] ?? 0) / n) * 100;
    console.log(
      `${colour.padEnd(8)} ${name.padEnd(9)} ${(n / N * 100).toFixed(2).padStart(6)}%  ${means.toFixed(1).padStart(6)}%`
    );
  }
}
