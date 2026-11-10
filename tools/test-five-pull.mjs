import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
const emptyComponent = () => null;

function visitElements(element, predicate, found = []) {
  if (Array.isArray(element)) element.forEach(child => visitElements(child, predicate, found));
  else if (element && typeof element === "object" && element.props) {
    if (typeof element.type === "function" && ["CroppedCardImage", "CardFrame"].includes(element.type.name)) return visitElements(element.type(element.props), predicate, found);
    if (predicate(element)) found.push(element);
    visitElements(element.props.children, predicate, found);
  }
  return found;
}

function text(element) {
  if (Array.isArray(element)) return element.map(text).join("");
  if (element && typeof element === "object") return text(element.props?.children);
  return element === null || element === undefined || typeof element === "boolean" ? "" : String(element);
}

function createPage({ member = false, ten = 1000, single = 100, canPay = true } = {}) {
  const hooks = [];
  let cursor = 0;
  let user = member ? { id: "member" } : null;
  const effects = [];
  const timers = [];
  const storage = new Map([["guest_mode", "true"]]);
  const charges = [];
  const guestSaves = [];
  const memberSaves = [];
  const routes = [];
  const components = new Map();
  const cache = new Map();
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], value => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
    },
    useId() { return "fixture-edge-" + cursor++; },
    useRef(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = { current: initial };
      return hooks[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!(index in hooks) || !deps || deps.some((dep, i) => dep !== hooks[index][i])) effects.push(effect);
      hooks[index] = deps;
    },
  };
  const mocks = {
    react,
    "next/dynamic": { __esModule: true, default: () => {
      const component = emptyComponent.bind(null);
      components.set("@/components/gacha/PackReveal3D", { default: component });
      return component;
    } },
    "next/navigation": { useRouter: () => ({ push: url => routes.push(url) }) },
    "@/lib/supabase": { supabase: {
      auth: { getUser: async () => ({ data: { user } }) },
      from: () => ({ select: () => ({ in: async () => ({ data: [
        { setting_key: "single_pull_cost", setting_value: single },
        { setting_key: "ten_pull_cost", setting_value: ten },
      ] }) }) }),
    } },
    "@/lib/wallet/walletStore": {
      getWalletState: () => ({ points: 10000 }), initializeWallet: async () => {},
      subscribeWallet: () => () => {}, spendPoints: async cost => { charges.push(cost); return canPay; },
    },
    "@/lib/gacha/revealLogic": { chooseRevealPlan: async () => ({ video: "/test.mp4", freezeChance: 0 }) },
    "@/lib/gacha/revealPreload": { preloadRevealVideos() {}, preloadChosenRevealVideos() {} },
    "@/lib/gacha/saveResults": {
      saveGuestResults: async cards => guestSaves.push(cards),
      saveUserResults: async (...args) => memberSaves.push(args),
    },
    "@/lib/audio/bgmStore": { setBgmMuted() {} },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    const output = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    const exports = {};
    cache.set(file, exports);
    vm.runInNewContext(`(function(require, exports) { ${output}\n})`, {
      localStorage, window: { localStorage, setTimeout: callback => timers.push(callback), clearTimeout() {} },
      process: { env: { NODE_ENV: "test" } },
    })((id) => {
      if (mocks[id]) return mocks[id];
      if (id.endsWith(".module.css")) return { __esModule: true, default: { travel: "travel", sparkle: "sparkle" } };
      if (id === "@/components/gacha/pack-reveal/cardDisplayCrop") return load("components/gacha/pack-reveal/cardDisplayCrop.ts");
      if (id === "@/components/gacha/CardFrame") return load("components/gacha/CardFrame.tsx");
      if (id === "@/components/gacha/CroppedCardImage") return load("components/gacha/CroppedCardImage.tsx");
      if (id.startsWith("@/components/")) {
        if (!components.has(id)) components.set(id, { __esModule: true, default: emptyComponent.bind(null) });
        return components.get(id);
      }
      if (id.startsWith("@/")) return load(`${id.slice(2)}.ts`);
      return nodeRequire(id);
    }, exports);
    return exports;
  }
  const Page = load("app/gacha/page.tsx").default;
  let tree;
  const render = () => { cursor = 0; tree = Page(); return tree; };
  const component = name => visitElements(tree,
    el => el.type === components.get(`@/components/gacha/${name}`)?.default)[0];
  const yes = () => visitElements(tree, el => el.type === "button" && (text(el) === "Yes" || text(el).includes("Open pack")))[0];
  const settle = async () => { await new Promise(resolve => setImmediate(resolve)); render(); };
  const initialize = async () => {
    render();
    effects.splice(0).forEach(effect => effect());
    timers.splice(0).forEach(timer => timer());
    await settle();
  };
  return { initialize, render, component, yes, settle, charges, guestSaves, memberSaves, storage, routes,
    text: () => text(tree), setUser: next => { user = next; },
    selection: props => load("components/gacha/PullSelection.tsx").default(props) };
}

for (const count of [5]) test(`${count}-pull confirmation, charge, actual results and battle hand agree`, async () => {
  const page = createPage({ ten: 900, single: 120 });
  await page.initialize();
  const selection = page.component("PullSelection");
  const packButtons = visitElements(page.selection(selection.props), el => el.type === "button");
  assert.equal(packButtons.length, 2);
  assert.deepEqual(packButtons.map(el => el.props["aria-label"]), ["Five pull", undefined]);
  selection.props.askPullConfirm(count);
  page.render();
  const cost = count === 5 ? 450 : 120;
  assert.ok(page.text().includes(`Spend ${cost} points for one pack of 5 cards?`));
  const confirm = page.yes();
  await Promise.all([confirm.props.onClick(), confirm.props.onClick()]);
  page.render();
  assert.deepEqual(page.charges, [cost]);
  const reveal = page.component("RevealPlayer");
  assert.equal(reveal.props.isRevealing, true);
  await Promise.all([reveal.props.finishReveal(), reveal.props.finishReveal()]);
  page.render();
  assert.equal(page.component("ResultGrid"), undefined);
  page.component("PackReveal3D").props.onComplete();
  page.render();
  assert.equal(page.component("ResultGrid").props.results.length, count);
  assert.equal(page.guestSaves.length, 1);
  assert.equal(page.guestSaves[0].length, count);
  assert.equal(JSON.parse(page.storage.get("battle_player_cards")).length, count);
});

test("unsupported ten-pull cannot open a confirmation or spend", async () => {
  const page = createPage();
  await page.initialize();
  page.component("PullSelection").props.askPullConfirm(1);
  page.component("PullSelection").props.askPullConfirm(10);
  page.render();
  assert.equal(page.yes(), undefined);
  assert.deepEqual(page.charges, []);
});

test("member five-pull remains disabled without changing its legacy save contract", async () => {
  const page = createPage({ member: true });
  await page.initialize();
  const props = page.component("PullSelection").props;
  const five = visitElements(page.selection(props), el => el.props["aria-label"] === "Five pull")[0];
  assert.equal(five.props.disabled, true);
  props.askPullConfirm(5);
  page.render();
  assert.equal(page.yes(), undefined);
  assert.deepEqual(page.charges, []);
});

test("auth changing after five-pull confirmation is rejected before payment", async () => {
  const page = createPage();
  await page.initialize();
  page.component("PullSelection").props.askPullConfirm(5);
  page.render();
  page.setUser({ id: "member" });
  await page.yes().props.onClick();
  page.render();
  assert.deepEqual(page.charges, []);
  assert.ok(page.text().includes("5 Pull is currently available in guest mode."));
});

test("unaffordable five-pull creates no cards or battle hand", async () => {
  const page = createPage({ canPay: false });
  await page.initialize();
  page.component("PullSelection").props.askPullConfirm(5);
  page.render();
  await page.yes().props.onClick();
  page.render();
  assert.equal(page.storage.has("battle_player_cards"), false);
  assert.equal(page.component("ResultGrid"), undefined);
  assert.ok(page.text().includes("Not enough points."));
});
