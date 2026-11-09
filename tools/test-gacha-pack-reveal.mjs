import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
const emptyComponent = () => null;

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function start(page, count) {
  await page.initialize();
  page.component("PullSelection").props.askPullConfirm(count);
  page.render();
  const confirm = page.yes();
  await Promise.all([confirm.props.onClick(), confirm.props.onClick()]);
  page.render();
  return page.component("RevealPlayer").props.finishReveal;
}

for (const count of [5]) test(`${count} cards: video -> pack -> simultaneous fronts, one payment/draw/save, same order`, async () => {
  const page = createPage();
  const finishVideo = await start(page, count);
  await Promise.all([finishVideo(), finishVideo()]);
  page.render();
  const pack = page.component("PackReveal3D");
  assert.equal(pack.props.cards, page.pulled);
  assert.equal(page.component("ResultGrid"), undefined);
  assert.equal(page.component("ResultActions"), undefined);
  assert.equal(page.component("PullSelection"), undefined);
  pack.props.onComplete();
  pack.props.onComplete();
  page.render();
  const grid = page.component("ResultGrid");
  assert.equal(grid.props.results, page.pulled);
  const fronts = visitElements(page.grid(grid.props), el => el.type === "img");
  assert.deepEqual(fronts.map(el => el.props.src), page.pulled.map(card => card.image));
  assert.equal(fronts.length, count);
  const inspect = visitElements(page.grid(grid.props), el => el.type === "button")[0];
  inspect.props.onClick({ detail: 0 });
  page.render();
  assert.equal(visitElements(page.render(), el => (el.props.alt === "Enlarged card" || el.props.alt === "Full card"))[0].props.src, page.pulled[0].image);
  assert.equal(page.guestSaves.length, 1);
  assert.equal(page.guestSaves[0], page.pulled);
  assert.equal(page.draws, 1);
  assert.equal(page.charges.length, 1);
  const battle = visitElements(page.render(), el => el.type === "button" && text(el).includes("CONTINUE TO BATTLE"))[0];
  battle.props.onClick();
  assert.equal(page.storage.get("pending_battle_cards"), JSON.stringify(page.pulled));
  assert.deepEqual(page.routes, ["/battle-order"]);
  page.component("ResultActions").props.resetPull();
  page.render();
  pack.props.onComplete();
  await finishVideo();
  page.render();
  assert.ok(page.component("PullSelection"));
  assert.equal(page.component("ResultGrid"), undefined);
  assert.equal(page.guestSaves.length, 1);
  page.component("PullSelection").props.askPullConfirm(count);
  page.render();
  await page.yes().props.onClick();
  page.render();
  pack.props.onComplete();
  await finishVideo();
  page.render();
  assert.equal(page.component("RevealPlayer").props.isRevealing, true);
  assert.equal(page.component("ResultGrid"), undefined);
  assert.equal(page.draws, 2);
  assert.equal(page.guestSaves.length, 1);
});

for (const boundary of ["auth", "save"]) test(`pack finishes while ${boundary} pending: no actions/second purchase, then results`, async () => {
  const page = createPage();
  const finishVideo = await start(page, 5);
  const wait = deferred();
  (boundary === "auth" ? page.pauseAuth : page.pauseSave)(wait.promise);
  const saving = finishVideo();
  await page.settle();
  assert.equal(page.component("PullSelection"), undefined);
  page.component("PackReveal3D").props.onComplete();
  page.render();
  assert.equal(page.component("ResultGrid"), undefined);
  assert.equal(page.component("ResultActions"), undefined);
  assert.ok(page.text().includes("Saving pull..."));
  wait.resolve();
  await saving;
  page.render();
  assert.equal(page.component("ResultGrid").props.results, page.pulled);
  assert.equal(page.charges.length, 1);
});

test("navigation during pending save: save completes once, stale callbacks cannot advance UI", async () => {
  const page = createPage();
  const finishVideo = await start(page, 5);
  const wait = deferred();
  page.pauseSave(wait.promise);
  const saving = finishVideo();
  await page.settle();
  const finishPack = page.component("PackReveal3D").props.onComplete;
  page.unmount();
  finishPack();
  wait.resolve();
  await saving;
  await finishVideo();
  page.render();
  assert.equal(page.component("ResultGrid"), undefined);
  assert.equal(page.guestSaves.length, 1);
  assert.equal(page.draws, 1);
});

test("member 5 gate, auth change gate, insufficient funds remain before draw", async () => {
  const member = createPage({ member: true });
  await member.initialize();
  member.component("PullSelection").props.askPullConfirm(5);
  member.render();
  assert.equal(member.yes(), undefined);
  assert.equal(member.charges.length, 0);
  const changed = createPage();
  await changed.initialize();
  changed.component("PullSelection").props.askPullConfirm(5);
  changed.render();
  changed.setUser({ id: "member" });
  await changed.yes().props.onClick();
  assert.equal(changed.charges.length, 0);
  assert.equal(changed.draws, 0);
  const poor = createPage({ canPay: false });
  await start(poor, 5);
  assert.equal(poor.draws, 0);
  assert.equal(poor.guestSaves.length, 0);
});

test("single entry is blocked before payment and draw", async () => {
 const page=createPage(); await page.initialize(); page.component("PullSelection").props.askPullConfirm(1); page.render(); assert.equal(page.yes(),undefined); assert.equal(page.charges.length,0); assert.equal(page.draws,0);
});

test("final collection has no flip, timer, audio, back or random reveal logic", () => {
  const source = readFileSync(new URL("../components/gacha/ResultGrid.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Math\.random|setTimeout|new Audio|rotate-y|resolvePlayerCardBack|useEffect/);
});

test("final list drag visibly tilts, resets on release/cancel, suppresses drag clicks and retains keyboard inspection", async () => {
  const page = createPage();
  await page.initialize();
  const inspected = [];
  const tree = page.grid({ results: [{ name: "R1", image: "/r1.webp", rarity: "R" }], setSelectedImage: image => inspected.push(image) });
  const card = visitElements(tree, el => el.type === "button")[0];
  const target = {
    style: {}, captured: false,
    getBoundingClientRect: () => ({ width: 200 }),
    setPointerCapture() { this.captured = true; },
    hasPointerCapture() { return this.captured; },
    releasePointerCapture() { this.captured = false; },
  };
  const event = { currentTarget: target, pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100 };
  card.props.onPointerDown(event);
  card.props.onPointerMove({ ...event, clientX: 170, clientY: 140 });
  assert.match(target.style.transform, /rotateX\(-11deg\) rotateY\(22deg\)/);
  card.props.onPointerUp({ ...event, type: "pointerup" });
  assert.match(target.style.transform, /rotateX\(0deg\) rotateY\(0deg\)/);
  assert.equal(target.captured, false);
  let prevented = false;
  card.props.onClick({ currentTarget: target, detail: 1, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(inspected, []);
  card.props.onClick({ currentTarget: target, detail: 0 });
  assert.deepEqual(inspected, ["/r1.webp"]);
  card.props.onPointerDown(event);
  card.props.onPointerUp({ ...event, type: "pointerup" });
  card.props.onClick({ currentTarget: target, detail: 1 });
  assert.equal(inspected.length, 2);
  card.props.onPointerDown(event);
  card.props.onPointerMove({ ...event, clientX: 200 });
  card.props.onPointerCancel({ ...event, type: "pointercancel" });
  assert.match(target.style.transform, /rotateX\(0deg\) rotateY\(0deg\)/);
  assert.equal(card.props.style.border, 0);
  assert.equal(visitElements(tree, el => el.type === "img")[0].props.draggable, false);
});

test("all 15 fronts share cropped image/root/contour geometry and retain native proportions and URLs", async () => {
  const page = createPage();
  await page.initialize();
  const ids = ["R1", "R2", "R3", "R4", "SR1", "SR2", "SR3", "SR4", "SSR1", "SSR2", "SSR3", "SSR4", "UR1", "UR2", "UR3"];
  const results = ids.map(name => ({ name, rarity: "R", image: `/images/cards/player/${name}/card.webp` }));
  const before = JSON.stringify(results);
  const tree = page.grid({ results, setSelectedImage() {} });
  const images = visitElements(tree, el => el.type === "img");
  assert.deepEqual(images.map(image => image.props.src), results.map(card => card.image));
  assert.ok(parseFloat(images[0].props.style.width) > 100);
  assert.ok(parseFloat(images[1].props.style.width) > 100);
  assert.ok(images.every(image => parseFloat(image.props.style.width) > 100));
  const buttons = visitElements(tree, el => el.type === "button");
  const viewports = visitElements(tree, el => el.props["data-testid"] === "cropped-card-image");
  const contours = visitElements(tree, el => el.type === "path" && el.props.strokeWidth === "2");
  const sharp = nodeRequire("sharp");
  for (let i = 0; i < ids.length; i++) {
    const crop = page.crop(results[i].image);
    const frame = page.frame(results[i].image);
    const metadata = await sharp(new URL(`../public${results[i].image}`, import.meta.url).pathname.slice(1)).metadata();
    const expectedRatio = metadata.width * (1 - crop.left - crop.right) / (metadata.height * (1 - crop.top - crop.bottom));
    assert.ok(Math.abs(frame.aspectRatio - expectedRatio) < 1e-10);
    assert.equal(buttons[i].props.style.aspectRatio, frame.aspectRatio);
    assert.equal(viewports[i].props.style.aspectRatio, frame.aspectRatio);
    assert.equal(viewports[i].props.style.clipPath, frame.clipPath);
    assert.equal(contours[i].props.d, frame.outlinePath);
  }
  assert.equal(page.crop("/images/other.webp"), null);
  assert.equal(JSON.stringify(results), before);
});

for (const preview of [false, true]) test(`${preview ? "preview" : "real gacha"} inspection renders the shared crop and keeps the original URL`, async () => {
  const page = createPage({ preview });
  if (preview) {
    await page.initialize();
  } else {
    const finishVideo = await start(page, 5);
    await finishVideo();
    page.render();
  }
  page.component("PackReveal3D").props.onComplete();
  page.render();
  const grid = page.component("ResultGrid");
  for (const name of ["R1", "R2", "SR1", "SSR1", "UR1", "UR2", "UR3", "OTHER"]) {
    const src = `/images/cards/player/${name}/card.webp`;
    grid.props.setSelectedImage(src);
    page.render();
    const image = visitElements(page.render(), el => el.type === "img" && ["Full card", "Enlarged card"].includes(el.props.alt))[0];
    assert.equal(image.props.src, src);
    assert.equal(image.props.draggable, false);
    if (name === "OTHER") {
      assert.equal(image.props.style.width, "100%");
      assert.equal(image.props.style.left, "0%");
    } else {
      assert.ok(parseFloat(image.props.style.width) > 100);
      assert.ok(parseFloat(image.props.style.left) < 0);
      assert.ok(parseFloat(image.props.style.top) < 0);
    }
    const viewport = visitElements(page.render(), el => el.props["data-testid"] === "cropped-card-image")[0];
    assert.equal(viewport.props.style.overflow, "hidden");
    const frame = visitElements(page.render(), el => el.props["data-testid"] === "player-card-frame")[0];
    assert.match(frame.props.style.width, /100dvh - 200px/);
  }
});

test("preview is development-only and contains existing art with no paid/persistence services", () => {
  const source = readFileSync(new URL("../app/gacha-pack-preview/page.tsx", import.meta.url), "utf8");
  assert.match(source, /process\.env\.NODE_ENV !== "development"\) notFound\(\)/);
  assert.doesNotMatch(source, /supabase|localStorage|wallet|pullMany|saveUserResults|saveGuestResults/);
  for (const image of source.matchAll(/image: "([^"]+)"/g)) {
    assert.ok(readFileSync(new URL(`../public${image[1]}`, import.meta.url)).length > 0);
  }
});

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

function createPage({ member = false, ten = 1000, single = 100, canPay = true, preview = false } = {}) {
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
  const cleanups = [];
  let authWait = null;
  let saveWait = null;
  let draws = 0;
  const committed = Array.from({ length: 5 }, (_, i) => ({ name: 'Card' + i, rarity: 'R', image: '/fixture-' + i + '.webp' }));
  let pulled;
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
    'next/dynamic': { __esModule: true, default: () => {
      const component = emptyComponent.bind(null);
      components.set('@/components/gacha/PackReveal3D', { default: component });
      return component;
    } },
    '@/lib/gacha/pullLogic': { pullMany: count => { draws++; pulled = committed.slice(0, count); return pulled; } },
    "next/navigation": { useRouter: () => ({ push: url => routes.push(url) }) },
    "@/lib/supabase": { supabase: {
      auth: { getUser: async () => { if (authWait) await authWait; return { data: { user } }; } },
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
    "@/lib/gacha/revealPreload": { preloadRevealVideos() {} },
    "@/lib/gacha/saveResults": {
      saveGuestResults: async cards => { guestSaves.push(cards); if (saveWait) await saveWait; },
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
      process: { env: { NODE_ENV: preview ? "development" : "test" } },
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
  const Page = load(preview ? "app/gacha-pack-preview/page.tsx" : "app/gacha/page.tsx").default;
  let tree;
  const render = () => { cursor = 0; tree = Page(); return tree; };
  const component = name => visitElements(tree,
    el => el.type === components.get(`@/components/gacha/${name}`)?.default)[0];
  const yes = () => visitElements(tree, el => el.type === "button" && (text(el) === "Yes" || text(el).includes("Open pack")))[0];
  const settle = async () => { await new Promise(resolve => setImmediate(resolve)); render(); };
  const initialize = async () => {
    render();
    effects.splice(0).forEach(effect => { const cleanup = effect(); if (typeof cleanup === "function") cleanups.push(cleanup); });
    timers.splice(0).forEach(timer => timer());
    await settle();
  };
  return { initialize, render, component, yes, settle, charges, guestSaves, memberSaves, storage, routes,
    get draws() { return draws; }, get pulled() { return pulled; },
    pauseAuth: promise => { authWait = promise; }, pauseSave: promise => { saveWait = promise; },
    unmount: () => cleanups.splice(0).forEach(cleanup => cleanup()),
    grid: props => load('components/gacha/ResultGrid.tsx').default(props),
    crop: src => load('components/gacha/pack-reveal/cardDisplayCrop.ts').getCardDisplayCrop(src),
    frame: src => load('components/gacha/pack-reveal/cardDisplayCrop.ts').getCardDisplayFrame(src),
    text: () => text(tree), setUser: next => { user = next; },
    selection: props => load("components/gacha/PullSelection.tsx").default(props) };
}

