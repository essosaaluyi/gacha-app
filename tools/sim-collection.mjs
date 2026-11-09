// How much of an announced bonus total the Pick a Bonus phase actually pays.
//   node tools/sim-collection.mjs [--cap=233] [--trials=200000]
import { register } from "node:module";
register("./ts-alias-loader.mjs", import.meta.url);

const { buildCollectionDeck } = await import("@/lib/battle-pixi/core/collectionDeck");
const { patchConfig } = await import("@/lib/game-config/patchConfig");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  })
);
const CAP = Number(args.cap ?? 233);
const TRIALS = Number(args.trials ?? 200000);

function runCollection(cap) {
  const config = patchConfig.collection;
  let banked = 0, restarts = 0, extraMode = false, tables = 0;
  for (;;) {
    tables += 1;
    if (tables > 40) return { banked, tables };
    const deck = buildCollectionDeck(cap, extraMode);
    const revealed = deck.map(() => false);
    let flips = config.initialFlips, tableBanked = 0, doubleNext = false, awaitingExtra = false;
    while (flips > 0 && !awaitingExtra) {
      const pool = revealed.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
      if (pool.length === 0) break;
      const index = pool[Math.floor(Math.random() * pool.length)];
      flips -= 1; revealed[index] = true;
      const card = deck[index];
      if (card.type === "point") {
        const factor = doubleNext ? config.chanceMultiplier : 1;
        const credited = Math.max(0, Math.min(Math.round(card.points * factor), cap - tableBanked));
        tableBanked += credited; banked += credited; doubleNext = false;
        if (card.picks > 0) flips += card.picks;
      } else if (card.type === "chance") doubleNext = true;
      if (tableBanked >= cap) awaitingExtra = true;
    }
    if (awaitingExtra) { extraMode = true; continue; }
    if (banked <= 0 && restarts < 3) { restarts += 1; continue; }
    return { banked, tables };
  }
}

const ratios = [];
let short = 0, exact = 0, over = 0, extraTables = 0;
for (let i = 0; i < TRIALS; i += 1) {
  const { banked, tables } = runCollection(CAP);
  ratios.push(banked / CAP);
  if (banked < CAP) short += 1; else if (banked === CAP) exact += 1; else over += 1;
  if (tables > 1) extraTables += 1;
}
ratios.sort((a, b) => a - b);
const p = (q) => ratios[Math.floor((ratios.length - 1) * q)];
const pct = (v) => `${((v / TRIALS) * 100).toFixed(1)}%`;

console.log(`\ncap ${CAP}P x ${TRIALS} collections`);
console.log(`paid LESS than announced   ${pct(short)}`);
console.log(`paid exactly the announced ${pct(exact)}`);
console.log(`paid MORE (extra table)    ${pct(over)}   (any extra table: ${pct(extraTables)})`);
console.log(`share of the announced total: p5 ${(p(0.05) * 100).toFixed(0)}%  p25 ${(p(0.25) * 100).toFixed(0)}%  median ${(p(0.5) * 100).toFixed(0)}%  p75 ${(p(0.75) * 100).toFixed(0)}%  mean ${((ratios.reduce((a, b) => a + b, 0) / TRIALS) * 100).toFixed(0)}%`);
console.log("");
