// Checks lib/battle-pixi/core/barChanceReveal.ts against the owner's rule, for
// every order the three cards can be turned in.
//
//   node tools/check-bar-chance-reveal.mjs
//
// Ends:   the first two cards turned are BAR, the last one tells.
// Middle: the middle card, turned first, is the whole answer.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../lib/battle-pixi/core/barChanceReveal.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sandbox = { exports: {} };
new Function("exports", compiled)(sandbox.exports);
const { arrangeBarChanceCards } = sandbox.exports;

const ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const STARTS = [["Bar", "Bar", "Empty"], ["Bar", "Empty", "Bar"], ["Empty", "Bar", "Bar"]];
let failures = 0;
const fail = (message) => { failures += 1; console.error("FAIL", message); };

for (const outcome of ["success", "fake"]) {
  for (const start of STARTS) {
    for (const order of ORDERS) {
      let cards = [...start];
      const revealed = [false, false, false];
      const shown = [];
      for (const slot of order) {
        const before = [...cards];
        cards = arrangeBarChanceCards(outcome, cards, revealed, slot);
        revealed.forEach((done, index) => {
          if (done && cards[index] !== before[index]) fail(`${outcome} ${order}: a turned card changed`);
        });
        revealed[slot] = true;
        shown.push(cards[slot]);
      }
      const label = `${outcome} dealt ${start.join("/")} turned ${order.map((slot) => "LCR"[slot]).join(">")}: ${shown.join(" ")}`;
      const expected =
        outcome === "success" ? ["Bar", "Bar", "Bar"]
        : order[0] === 1 ? ["Empty", "Bar", "Bar"]
        : ["Bar", "Bar", "Empty"];
      if (shown.join() !== expected.join()) fail(label);
      const misses = cards.filter((symbol) => symbol === "Empty").length;
      if (misses !== (outcome === "success" ? 0 : 1)) fail(`${label}: ${misses} misses in the finished hand`);
    }
  }
}

console.log(failures ? `${failures} failures` : "barChanceReveal: 36 runs, all as the rule says");
process.exit(failures ? 1 : 0);
