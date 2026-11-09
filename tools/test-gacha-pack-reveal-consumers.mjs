import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const CardFrame = () => null;
const SoftDialog = () => null;
const Icon = () => null;
const moduleOf = component => ({ __esModule: true, default: component });

function elements(tree, predicate, found = []) {
  if (Array.isArray(tree)) tree.forEach(child => elements(child, predicate, found));
  else if (tree?.props) {
    if (predicate(tree)) found.push(tree);
    elements(tree.props.children, predicate, found);
  }
  return found;
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree?.props) return text(tree.props.children);
  return typeof tree === "string" || typeof tree === "number" ? String(tree) : "";
}

function harness(file, props) {
  const hooks = [], timers = [], routes = [], storage = new Map();
  let cursor = 0, tree;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], value => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
    },
    useMemo: factory => factory(),
  };
  const mocks = {
    react,
    "@/components/gacha/CardFrame": moduleOf(CardFrame),
    "./CardFrame": moduleOf(CardFrame),
    "./SoftDialog": moduleOf(SoftDialog),
    "./SiteIcon": moduleOf(Icon),
    "next/navigation": { useRouter: () => ({ push: route => routes.push(route) }) },
    "next/link": moduleOf(() => null),
  };
  const compiled = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(`(function(require, exports){${compiled}\n})`, {
    localStorage: { setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    window: { setTimeout: callback => timers.push(callback) },
    Audio: class { play() { return Promise.resolve(); } },
  })(id => mocks[id] ?? require(id), exports);
  const render = () => { cursor = 0; tree = exports.default(props); return tree; };
  render();
  return {
    render, storage, routes, timers,
    find: predicate => elements(tree, predicate),
    frames: () => elements(tree, element => element.type === CardFrame).map(element => element.props),
    button: label => elements(tree, element => element.type === "button" && (element.props["aria-label"] === label || text(element) === label))[0],
  };
}

const cards = [
  { card_name: "R1", name: "R1", rarity: "R", image: "/images/cards/player/R1/card.webp", ids: ["a", "b"], count: 2 },
  { card_name: "UR1", name: "UR1", rarity: "UR", image: "/images/cards/player/UR1/card.webp", ids: ["c"], count: 1 },
];

test("archive keeps filters, quantity clamping, sale selection, ownership and zoom with shared frames", () => {
  const selections = [];
  const h = harness("components/site/CardArchive.tsx", {
    cards, message: "", points: 100, returnValues: { R: 10, UR: 50 }, selectedCounts: { R1: 1 },
    setSellCount: (...args) => selections.push(args), totalSelectedCount: 1, totalSellPoints: 10,
    onReviewSale() {}, onClearSelection() {},
  });
  assert.deepEqual(h.frames().map(frame => [frame.src, frame.rarity]), cards.map(card => [card.image, card.rarity]));
  assert.ok(h.find(element => element.props["aria-label"] === "Owned: 2").length);
  assert.ok(h.find(element => element.props.className === "archive-selected-badge").length);
  h.button("Select R1 for sale").props.onClick(); h.render();
  h.find(element => element.props["aria-label"] === "Quantity to sell")[0].props.onChange({ target: { valueAsNumber: 999 } });
  h.render();
  assert.equal(h.find(element => element.props["aria-label"] === "Quantity to sell")[0].props.value, 2);
  h.button("Select cards").props.onClick(); h.render();
  assert.deepEqual(selections, [["R1", 2, 2]]);
  h.button("Enlarge UR1").props.onClick(); h.render();
  const zoom = h.frames().find(frame => frame.inspection);
  assert.equal(zoom.src, cards[1].image);
  assert.equal(zoom.rarity, "UR");
  h.button("UR").props.onClick(); h.render();
  assert.equal(h.frames().filter(frame => !frame.inspection).length, 1);
});

test("battle-order retains card order, one shuffle and committed battle hand with shared frames", () => {
  const h = harness("components/gacha/BattleDeckOrder.tsx", { cards });
  assert.deepEqual(h.frames().map(frame => frame.src), cards.map(card => card.image));
  h.button("Shuffle?(1)").props.onClick(); h.render();
  assert.equal(h.button("Shuffling...").props.disabled, true);
  h.timers.shift()(); h.render();
  assert.equal(h.button("Shuffle Used").props.disabled, true);
  const displayedOrder = h.frames().map(frame => frame.src);
  h.button("Begin battle").props.onClick();
  assert.deepEqual(JSON.parse(h.storage.get("battle_player_cards")).map(card => card.image), displayedOrder);
  assert.equal(h.storage.get("battle_opening_pending"), "true");
  assert.deepEqual(h.routes, ["/battle"]);
});
