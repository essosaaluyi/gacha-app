import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/essos/Desktop/gacha-app/outputs/uiux-research";
const outputPath = `${outputDir}/gacha-ui-ux-page-structure-research.xlsx`;

const parts = [
  {
    part: "Game Description / About",
    current: "Only a short metadata description and title/news surface exist.",
    missing: "A clear page that tells new users what the game is and why they should play.",
    v1: "Compact About page: one-screen explanation, screenshots, core loop, point/reward promise.",
    v2: "World + system page: lore-first intro with a playable-flow diagram and card showcase.",
    v3: "Interactive intro: short scrollable story/tutorial that ends with Pull and Play.",
    standard: "Storefronts and game sites explain core experience, account needs, screenshots, and safety/trust links.",
    recommendation: "Use a lore-flavored About page with a simple loop diagram: Pull cards -> order deck -> battle -> earn points -> exchange rewards.",
    originality: "Make it feel like an in-universe arcade cabinet manual, not a generic marketing page.",
    priority: "High",
    source: "https://developer.apple.com/app-store/review/guidelines/"
  },
  {
    part: "Game Manual / How To Play",
    current: "No dedicated manual; mechanics are mostly inside the battle UI and project notes.",
    missing: "Users need help understanding gacha pull, deck order, target slots, Chance, Bar, Fatal Mode, enemy counter, and bonus round.",
    v1: "Quick-start manual: five steps with images and plain rules.",
    v2: "Deep manual: tabs for Gacha, Battle, Symbols, Fatal Mode, Bonus, Points.",
    v3: "Contextual manual: Help buttons inside each gameplay screen opening relevant mini-guides.",
    standard: "Help should be searchable, task-focused, concrete, brief, and available both proactively and reactively.",
    recommendation: "Build a two-layer manual: Quick Start for new users, Advanced Rules for serious players.",
    originality: "Use battle-symbol cards as the manual navigation, so learning feels collectible.",
    priority: "Highest",
    source: "https://www.nngroup.com/articles/help-and-documentation/"
  },
  {
    part: "Rules / Odds / Point Rules",
    current: "Odds and point settings exist in config, but there is no user-facing rules page.",
    missing: "Users need transparent pull odds, battle point rules, reward rules, guest limitations, and no-cash-value wording.",
    v1: "Simple Rules page with rarity odds, pull cost, point earning, and guest/member notes.",
    v2: "Rules Codex with expandable sections and examples for each battle symbol.",
    v3: "Fair Play page combining odds, spending limits, responsible play, and account safety.",
    standard: "Apple and Google both require randomized virtual item odds disclosure before purchase when monetized.",
    recommendation: "Create a Fair Rules page before public release, even if points are not real-money purchases yet.",
    originality: "Show odds as a 'summoning chart' with rarity cards, but keep exact percentages readable.",
    priority: "Highest",
    source: "https://support.google.com/googleplay/android-developer/answer/9858738"
  },
  {
    part: "Rewards Exchange",
    current: "Points can be earned/spent on gacha and gained by returning cards, but no reward exchange destination exists.",
    missing: "The main reason to collect points is unclear without a place to redeem them.",
    v1: "Simple shop: list rewards, cost, stock, redeem button, confirmation modal.",
    v2: "Arcade prize counter: rewards displayed like physical prizes behind glass.",
    v3: "Season exchange: rotating rewards, featured reward, limited-time visual drama.",
    standard: "Reward programs need clear cost, eligibility, redemption steps, confirmation, and post-redemption status.",
    recommendation: "Start with a simple reward exchange plus redemption history, then add seasonal presentation later.",
    originality: "Theme it as a supernatural arcade prize counter where points become 'battle tickets'.",
    priority: "Highest",
    source: "https://www.blizzard.com/en-us/legal/29232b30-6ae1-4d74-b1c5-8bd1df9e0b63/terms-of-use-for-blizzards-websites"
  },
  {
    part: "Reward Catalog / Prize List",
    current: "No visible catalog of what users can earn.",
    missing: "Users need motivation before playing and clarity before spending points.",
    v1: "Catalog grid with filters: Available, Locked, Limited, Claimed.",
    v2: "Reward roadmap showing future prizes and point goals.",
    v3: "Mystery reward case with silhouettes for upcoming rewards.",
    standard: "Ecommerce/reward UX typically shows price, availability, eligibility, delivery timing, and restrictions.",
    recommendation: "Use a catalog grid with clear availability and a small upcoming-reward rail.",
    originality: "Let rewards have rarity-like framing so the reward catalog feels connected to card collection.",
    priority: "High",
    source: "https://www.blizzard.com/en-us/legal/"
  },
  {
    part: "Point Ledger",
    current: "Top bar shows points; inventory and gacha update points, but no transaction history exists.",
    missing: "Users need to trust point balance changes.",
    v1: "Basic ledger: date, action, before, change, after.",
    v2: "Grouped ledger: Earned, Spent, Rewarded, Adjusted tabs.",
    v3: "Battle receipt system: every battle and bonus creates a stamped receipt.",
    standard: "Financial/reward systems benefit from auditable history and clear transaction labels.",
    recommendation: "Add a Points page with ledger and summary cards: current points, earned today, spent today.",
    originality: "Use 'battle receipts' with card/enemy thumbnails for game-specific memory.",
    priority: "High",
    source: "https://www.blizzard.com/en-us/privacy"
  },
  {
    part: "Account / Profile",
    current: "Login, logout, guest mode, and top bar account display exist; no profile page.",
    missing: "Users need account status, saved-data explanation, guest upgrade, point summary, and settings.",
    v1: "Profile overview: account status, points, inventory count, history shortcuts.",
    v2: "Account safety page: email, password, guest warning, data controls.",
    v3: "Player card passport: profile styled as an ID card with stats and milestones.",
    standard: "Game account areas commonly combine identity, progress, privacy/account settings, and support links.",
    recommendation: "Create a practical Profile page first, with guest-to-member upgrade as the most important CTA.",
    originality: "Style it as an adventurer license or battle arcade ID.",
    priority: "Medium",
    source: "https://www.blizzard.com/en-us/privacy"
  },
  {
    part: "Battle Result",
    current: "Page exists but shows placeholder zeros.",
    missing: "Users expect real battle summary, points earned, enemies defeated, bonus results, and next action.",
    v1: "Simple result receipt: stats, earned points, return to menu.",
    v2: "Dramatic victory/defeat screen with card MVP and enemy defeated.",
    v3: "Post-battle rewards board with bonus reveal and ledger link.",
    standard: "Game loops need closure: what happened, what was earned, and what to do next.",
    recommendation: "Upgrade battle result into a reward receipt and link to replay, gacha, inventory, and rewards.",
    originality: "Show it as a pachislot payout screen with bonus stamp animations later.",
    priority: "High",
    source: "https://www.nngroup.com/articles/help-and-documentation/"
  },
  {
    part: "Support / Contact",
    current: "No support page.",
    missing: "Users need help for login, lost points, reward issues, bugs, and guest data limitations.",
    v1: "Simple support form with category and message.",
    v2: "Help center landing: common issues, top articles, contact form.",
    v3: "In-game issue report: attach current account/session/context automatically.",
    standard: "Apple guidelines expect easy contact information for questions and support issues.",
    recommendation: "Create Help/Support with top issues and a contact method; later add ticket tracking.",
    originality: "Use categories like Lost Points, Reward Trouble, Battle Bug, Account Seal Broken.",
    priority: "Highest",
    source: "https://developer.apple.com/app-store/review/guidelines/"
  },
  {
    part: "FAQ",
    current: "No FAQ page.",
    missing: "Users need quick answers about guest mode, points, rewards, odds, saves, and account conversion.",
    v1: "Short FAQ under Help.",
    v2: "Searchable FAQ with categories.",
    v3: "Contextual FAQ snippets embedded across pages.",
    standard: "FAQ works best when scannable, categorized, and backed by deeper help pages.",
    recommendation: "Start with category-based FAQ: Account, Points, Gacha, Battle, Rewards, Guest Mode.",
    originality: "Write answers in a friendly arcade-operator voice while keeping legal/points answers precise.",
    priority: "Medium",
    source: "https://www.nngroup.com/articles/help-and-documentation/"
  },
  {
    part: "Privacy Policy",
    current: "No privacy page.",
    missing: "Login and gameplay data imply collection of account, point, inventory, history, and local-storage data.",
    v1: "Standard privacy policy: data collected, use, sharing, retention, rights, contact.",
    v2: "Player-friendly privacy summary plus full legal policy.",
    v3: "Privacy World style: visual explainer for players and parents.",
    standard: "Blizzard's privacy page explains account data, game data, rights, parents, security, and support pathways.",
    recommendation: "Use a two-layer privacy page: plain-language player summary at top, formal policy below.",
    originality: "Frame privacy as 'your save data and battle record' so it feels relevant, not buried.",
    priority: "Highest",
    source: "https://www.blizzard.com/en-us/privacy"
  },
  {
    part: "Terms of Use",
    current: "No terms page.",
    missing: "Rules for account use, site access, user conduct, point/reward limitations, ownership, and disclaimers.",
    v1: "Lean Terms page for beta/private use.",
    v2: "Full Terms covering accounts, points, rewards, conduct, IP, termination.",
    v3: "Terms plus short plain-language summary.",
    standard: "Game terms commonly cover permitted use, conduct, ownership, user submissions, disclaimers, and legal obligations.",
    recommendation: "Draft Terms early, especially before reward exchange goes public.",
    originality: "Include a plain 'arcade rules' summary before formal legal sections.",
    priority: "Highest",
    source: "https://www.blizzard.com/en-us/legal/29232b30-6ae1-4d74-b1c5-8bd1df9e0b63/terms-of-use-for-blizzards-websites"
  },
  {
    part: "Cookie Policy",
    current: "No cookie page or settings page.",
    missing: "Users need to know what cookies/local storage are used for auth, guest data, preferences, and analytics if added.",
    v1: "Cookie/local storage disclosure only for necessary storage.",
    v2: "Cookie policy with categories: necessary, preferences, analytics, marketing.",
    v3: "Cookie center with visual toggles and storage explanations.",
    standard: "ICO guidance says users need clear information, consent for non-essential cookies, and easy control.",
    recommendation: "Add a cookie/local-storage page now; add consent banner/settings before analytics or marketing cookies.",
    originality: "Explain guest save data as 'browser-stored guest pouch' so players understand the risk.",
    priority: "High",
    source: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/"
  },
  {
    part: "Cookie Settings",
    current: "No settings UI.",
    missing: "Users need a way to change cookie choices if non-essential cookies are used.",
    v1: "Footer link opens cookie settings modal.",
    v2: "Dedicated page with toggles and last-updated consent record.",
    v3: "Privacy dashboard combining cookies, local data, guest reset, and communication settings.",
    standard: "Consent should be freely given, specific, informed, and easy to change; non-essential cookies should not be set before consent.",
    recommendation: "Use a footer Cookie Settings link with simple toggles; keep necessary storage clearly separated.",
    originality: "Bundle cookie controls with a 'guest data reset/export' panel later.",
    priority: "Medium",
    source: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/"
  },
  {
    part: "Legal Notice / Footer",
    current: "No persistent legal footer in visible app shell.",
    missing: "Users expect Privacy, Terms, Legal, Cookie Policy, Cookie Settings, Support links near the bottom of public pages.",
    v1: "Minimal footer with legal/support links.",
    v2: "Game company footer with social, news, language, legal, support.",
    v3: "Compact footer on game pages, full footer on non-game pages.",
    standard: "Large game sites expose privacy/legal/cookie/support links consistently in footer navigation.",
    recommendation: "Add full footer to title/menu/info pages and compact legal drawer inside gameplay pages.",
    originality: "Use an arcade cabinet lower-panel style for legal/support links.",
    priority: "High",
    source: "https://www.blizzard.com/en-us/cookies"
  },
  {
    part: "Navigation / Information Architecture",
    current: "TopBar links Menu, Gacha, Inventory, History; no links to Help, Rewards, Profile, Rules, Legal.",
    missing: "Users need paths to learn, redeem, manage account, and resolve problems.",
    v1: "TopBar adds Rewards, Help, Profile.",
    v2: "Menu hub becomes dashboard with tiles for Play, Rewards, Manual, Profile.",
    v3: "Two-tier navigation: gameplay nav and footer trust nav.",
    standard: "Complex products separate primary task navigation from utility/legal/help navigation.",
    recommendation: "Keep top nav focused on Play, Rewards, Inventory, Profile; put rules/help/legal in footer and Help menu.",
    originality: "Make Menu feel like an arcade lobby with clear doors: Pull, Battle, Rewards, Manual.",
    priority: "High",
    source: "https://www.nngroup.com/articles/help-and-documentation/"
  }
];

const researchRows = [
  ["Randomized item odds", "Apple", "Loot boxes or randomized virtual items for purchase must disclose odds before purchase.", "Use exact gacha odds near Pull buttons and on Rules page.", "https://developer.apple.com/app-store/review/guidelines/"],
  ["Randomized item odds", "Google Play", "Randomized virtual item odds must be disclosed in advance and close to purchase.", "Put odds link/modal directly beside pull confirmation.", "https://support.google.com/googleplay/android-developer/answer/9858738"],
  ["Cookie consent", "ICO", "Tell users cookies exist, explain purpose, get consent before non-essential cookies, enable/disable easily.", "Cookie Settings should be real controls, not just a static policy.", "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/"],
  ["Help UX", "Nielsen Norman Group", "Help should be searchable, task-focused, concrete, brief, and available as proactive and reactive help.", "Manual should combine quick start, contextual tips, and detailed docs.", "https://www.nngroup.com/articles/help-and-documentation/"],
  ["Privacy UX", "Blizzard", "Player-friendly privacy pages can explain data, rights, parents, game data, security, and support.", "Use plain-language privacy summary for players, then formal text.", "https://www.blizzard.com/en-us/privacy"],
  ["Terms structure", "Blizzard", "Terms cover site use, license, conduct, obligations, ownership, submissions, disclaimers.", "Terms must cover accounts, points, rewards, conduct, ownership.", "https://www.blizzard.com/en-us/legal/29232b30-6ae1-4d74-b1c5-8bd1df9e0b63/terms-of-use-for-blizzards-websites"],
  ["Support contact", "Apple", "Apps/sites should include easy contact information for questions and support issues.", "Support page is a public-launch must-have.", "https://developer.apple.com/app-store/review/guidelines/"],
  ["Dark patterns", "FTC / UX research", "Avoid manipulative flows; be clear about terms, points, odds, cancellation/reset, and reward conditions.", "Reward exchange and guest reset must be explicit and reversible when possible.", "https://www.ftc.gov/business-guidance/resources/bringing-dark-patterns-light"],
  ["Gacha transparency", "General industry", "Modern gacha games commonly disclose rarity/drop rates and avoid banned complete-gacha patterns.", "Rules page should clearly separate rarity odds, battle odds, and rewards.", "https://en.wikipedia.org/wiki/Gacha_game"]
];

const roadmapRows = [
  ["1", "Trust foundation", "How To Play, Rules/Odds, Privacy, Terms, Support, Legal Footer", "Highest", "Needed before external/public users."],
  ["2", "Reward loop", "Rewards Exchange, Reward Catalog, Battle Result, Point Ledger", "High", "Completes earn -> spend -> trust loop."],
  ["3", "Account comfort", "Profile, FAQ, guest upgrade, cookie/local-storage explanation", "Medium", "Reduces support burden and improves retention."],
  ["4", "Original polish", "Arcade manual, prize-counter rewards, battle receipts, lore privacy summary", "Medium", "Makes compliance and help feel like part of the game world."],
];

const workbook = Workbook.create();

function styleHeader(sheet, range) {
  sheet.getRange(range).format = {
    fill: "#22223B",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: "#9A8C98" }
  };
}

function styleTitle(sheet, range) {
  sheet.getRange(range).format = {
    fill: "#4A4E69",
    font: { bold: true, color: "#FFFFFF", size: 16 },
    wrapText: true
  };
}

const summary = workbook.worksheets.add("Executive Summary");
summary.showGridLines = false;
summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["Gacha App UI/UX Page Structure Research"]];
styleTitle(summary, "A1:H1");
summary.getRange("A3:B9").values = [
  ["Current product shape", "Playable core loop exists: title/login/menu/gacha/deck order/battle/inventory/history/points."],
  ["Main gap", "The app needs a product shell: manual, rules/odds, reward exchange, point ledger, support, account, and legal/privacy/cookie pages."],
  ["Research conclusion", "Industry standards point toward transparent odds, clear support paths, searchable help, point/reward auditability, and real privacy/cookie controls."],
  ["Recommended personality", "Do not make the missing pages feel like paperwork. Make them feel like an arcade manual, prize counter, battle receipt, and player license."],
  ["Highest priority", "How To Play, Rules/Odds, Rewards Exchange, Privacy, Terms, Support, Legal Footer."],
  ["Innovation principle", "Compliance pages should be trustworthy first, but visually themed enough to belong to the game world."],
  ["Workbook date", "2026-06-28"]
];
summary.getRange("A3:A9").format = { fill: "#F2E9E4", font: { bold: true }, wrapText: true };
summary.getRange("B3:B9").format = { wrapText: true };
summary.getRange("A11:E11").values = [["Phase", "Focus", "Pages", "Priority", "Reason"]];
summary.getRange("A12:E15").values = roadmapRows;
styleHeader(summary, "A11:E11");
summary.getRange("A12:E15").format = { wrapText: true, borders: { preset: "inside", style: "thin", color: "#DDDDDD" } };
summary.getRange("A:A").format.columnWidthPx = 120;
summary.getRange("B:B").format.columnWidthPx = 220;
summary.getRange("C:C").format.columnWidthPx = 360;
summary.getRange("D:D").format.columnWidthPx = 100;
summary.getRange("E:E").format.columnWidthPx = 360;

const gap = workbook.worksheets.add("Current Gap Map");
gap.showGridLines = false;
gap.getRange("A1:G1").values = [["Area", "Current State", "Missing User Expectation", "Risk If Missing", "Recommended Page", "Priority", "Notes"]];
const gapRows = parts.map((p) => [
  p.part,
  p.current,
  p.missing,
  p.priority === "Highest" ? "Trust or core loop feels incomplete." : p.priority === "High" ? "Users may understand less or trust points less." : "Can wait until foundation is stronger.",
  p.part,
  p.priority,
  p.recommendation
]);
gap.getRangeByIndexes(1, 0, gapRows.length, 7).values = gapRows;
styleHeader(gap, "A1:G1");
gap.getRangeByIndexes(1, 0, gapRows.length, 7).format = { wrapText: true, borders: { preset: "inside", style: "thin", color: "#E5E7EB" } };
gap.freezePanes.freezeRows(1);
["A","B","C","D","E","F","G"].forEach((col, i) => {
  const widths = [210, 300, 360, 260, 210, 90, 400];
  gap.getRange(`${col}:${col}`).format.columnWidthPx = widths[i];
});

const variants = workbook.worksheets.add("3 Variations");
variants.showGridLines = false;
variants.getRange("A1:J1").values = [["Part", "Variation 1", "Variation 2", "Variation 3", "Online Standard / Trend", "Compare vs Our Idea", "Recommended Direction", "Original Touch", "Priority", "Source URL"]];
const variantRows = parts.map((p) => [
  p.part,
  p.v1,
  p.v2,
  p.v3,
  p.standard,
  "Our original idea is directionally right, but needs stronger transparency, support, and user-control layers.",
  p.recommendation,
  p.originality,
  p.priority,
  p.source
]);
variants.getRangeByIndexes(1, 0, variantRows.length, 10).values = variantRows;
styleHeader(variants, "A1:J1");
variants.getRangeByIndexes(1, 0, variantRows.length, 10).format = { wrapText: true, borders: { preset: "inside", style: "thin", color: "#E5E7EB" } };
variants.freezePanes.freezeRows(1);
["A","B","C","D","E","F","G","H","I","J"].forEach((col, i) => {
  const widths = [210, 330, 330, 330, 360, 330, 390, 330, 90, 300];
  variants.getRange(`${col}:${col}`).format.columnWidthPx = widths[i];
});

const research = workbook.worksheets.add("Research Standards");
research.showGridLines = false;
research.getRange("A1:E1").values = [["Topic", "Source", "Standard / Trend", "Implication For Our App", "Source URL"]];
research.getRangeByIndexes(1, 0, researchRows.length, 5).values = researchRows;
styleHeader(research, "A1:E1");
research.getRangeByIndexes(1, 0, researchRows.length, 5).format = { wrapText: true, borders: { preset: "inside", style: "thin", color: "#E5E7EB" } };
research.freezePanes.freezeRows(1);
["A","B","C","D","E"].forEach((col, i) => {
  const widths = [190, 170, 430, 430, 360];
  research.getRange(`${col}:${col}`).format.columnWidthPx = widths[i];
});

const roadmap = workbook.worksheets.add("Roadmap");
roadmap.showGridLines = false;
roadmap.getRange("A1:E1").values = [["Phase", "Focus", "Build These", "Priority", "Why"]];
roadmap.getRange("A2:E5").values = roadmapRows;
styleHeader(roadmap, "A1:E1");
roadmap.getRange("A2:E5").format = { wrapText: true, borders: { preset: "inside", style: "thin", color: "#E5E7EB" } };
["A","B","C","D","E"].forEach((col, i) => {
  const widths = [70, 180, 480, 100, 420];
  roadmap.getRange(`${col}:${col}`).format.columnWidthPx = widths[i];
});

for (const sheetName of ["Executive Summary", "Current Gap Map", "3 Variations", "Research Standards", "Roadmap"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, `${sheetName.replace(/[^a-z0-9]/gi, "_")}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan"
});
console.log(errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
