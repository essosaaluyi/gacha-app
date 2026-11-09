import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, mocks) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(`(function(require,exports){${output}\n})`)(id => mocks[id] ?? require(id), exports);
  return exports;
}

function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  return node?.props ? [node, ...flatten(node.props.children)] : [];
}

for (const limit of [5, 10]) test(`rail respects ${limit}-normal-round saves and successive EXTRA rounds`, () => {
  let round = limit;
  const Meter = load("components/battle/RoundMeter.tsx", {
    react: { useState: init => [init(), () => {}], useEffect() {} },
    "next/navigation": { usePathname: () => "/battle", useSearchParams: () => new URLSearchParams() },
    "@/lib/battle-pixi/state/roundStore": { getCurrentRound: () => round, subscribeRound() {} },
    "@/lib/battle-pixi/state/currentEnemyStore": { getNormalBattleRounds: () => limit, subscribeCurrentEnemy() {} },
    "./BattleDigitStrip": { default: () => null },
  }).default;
  for (const offset of [0, 1, 2, 25]) {
    round = limit + offset;
    const tree = Meter();
    const nodes = flatten(tree).filter(node => node.props.className?.startsWith("battle-progress-station "));
    assert.equal(nodes.length, limit + 1);
    assert.equal(nodes.filter(node => node.props["aria-current"] === "step").length, 1);
    assert.equal(tree.props["aria-label"], offset
      ? `Battle progress: EXTRA ${offset}` : `Battle progress: round ${limit} of ${limit}`);
    assert.equal(nodes.find(node => node.props["aria-current"] === "step").props["aria-label"],
      offset ? `EXTRA ${offset}` : `Round ${limit}`);
    assert.equal(flatten(tree).some(node => node.type === "img"), false);
  }
});

function saver({ rejectSession = false, rejectResults = false } = {}) {
  const writes = [];
  const supabase = { from(table) { return { insert(payload) {
    writes.push({ table, payload });
    return table === "pull_sessions"
      ? { select: () => ({ single: async () => ({ data: rejectSession ? null : { id: "s1" },
        error: rejectSession ? { message: "five not allowed by database" } : null }) }) }
      : Promise.resolve({ error: rejectResults ? { message: "result insert failed" } : null });
  } }; } };
  return { ...load("lib/gacha/saveResults.ts", { "@/lib/supabase": { supabase } }), writes };
}

for (const [count, type] of [[1, "single"], [5, "five"], [10, "ten"]]) {
  test(`${count} results use ${type} session with matching ordered rows`, async () => {
    const save = saver();
    const cards = Array.from({ length: count }, () => ({ name: "R2", rarity: "R", image: "/r2.webp" }));
    await save.saveUserResults("u1", count, cards);
    assert.equal(save.writes[0].payload.pull_type, type);
    assert.equal(save.writes[1].payload.length, count);
    assert.equal(save.writes[1].payload.at(-1).result_order, count);
    assert.ok(save.writes[1].payload.every(row => row.user_id === "u1" && row.session_id === "s1"));
  });
}

test("unsupported/mismatched counts fail before any database write", async () => {
  const save = saver();
  await assert.rejects(save.saveUserResults("u1", 5, []), /does not match/);
  await assert.rejects(save.saveUserResults("u1", 3, []), /Unsupported/);
  assert.equal(save.writes.length, 0);
});

test("database rejection is propagated, never reported as a successful five-pull save", async () => {
  const cards = Array.from({ length: 5 }, () => ({ name: "R2", rarity: "R", image: "/r2.webp" }));
  const rejectedSession = saver({ rejectSession: true });
  await assert.rejects(rejectedSession.saveUserResults("u1", 5, cards), /five not allowed/);
  assert.equal(rejectedSession.writes.length, 1);
  const rejectedResults = saver({ rejectResults: true });
  await assert.rejects(rejectedResults.saveUserResults("u1", 5, cards), /result insert failed/);
});
