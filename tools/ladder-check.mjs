// Measures what each rung of the disc's anticipation ladder actually means,
// by running the real lottery against the real ladder.
//
//   npx tsx tools/ladder-check.mjs
//
// The "means" column is the number that matters: it is the reliability the
// design promises, and it is a *consequence* of the weights in drawTell.ts
// rather than something written down anywhere. Change a weight and check here.
import { drawBattleResult } from '../lib/battle-pixi/core/resultLottery.ts';
import { rollDrawTell } from '../lib/battle-pixi/presentation/drawTell.ts';

const N = 400000;
const seen = {};
const decisive = {};
let decisiveTotal = 0;

for (let i = 0; i < N; i++) {
  const result = drawBattleResult({ barChance: 'main' });
  const rung = rollDrawTell({
    result, fatalActive: false, fatalGamesLeft: 0, fatalAlreadyHit: false,
  });

  const isTop =
    result.result === 'TripleChance' || result.result === 'Bar' ||
    (result.barChance?.scope === 'battle' && result.barChance.outcome === 'success');
  const isDecisive =
    isTop || result.result === 'DoubleChance' || result.result === 'Reply';
  if (isDecisive) decisiveTotal++;

  const key = rung ?? 'none';
  seen[key] = (seen[key] ?? 0) + 1;
  if (isDecisive) decisive[key] = (decisive[key] ?? 0) + 1;
}

console.log(`decisive base rate: ${(decisiveTotal / N * 100).toFixed(2)}%`);
console.log('rung      fires on      means');
for (const rung of ['white', 'blue', 'green', 'red', 'gold', 'none']) {
  const n = seen[rung] ?? 0;
  const d = decisive[rung] ?? 0;
  const fires = (n / N * 100).toFixed(2);
  const means = n ? (d / n * 100).toFixed(1) : '—';
  const oneIn = n ? `1 in ${Math.round(N / n)}` : '';
  console.log(`${rung.padEnd(9)} ${fires.padStart(6)}%  ${oneIn.padEnd(11)} ${means.padStart(6)}%`);
}
