# UI Audit — Destiny Wars (gacha-app)

Captured 2026-07-09 against the running dev server (localhost:3000), headless Chromium (Edge) at 1366×850, full-page PNGs, guest mode seeded (500 pts).
Style values come from computed-style probes recorded at capture time (`audit-data.json`).
Note on method: screenshot PNGs are saved here for human review; the automated pass reads DOM/computed styles. The repo's asset-read guard (`.claude/settings.json`) blocks the agent from re-opening the PNGs — intentional.

---

## 01-title.png — `/`
- **Renders:** `app/page.tsx` + `components/TitleNewsPanel.tsx` + `components/PageVideoBackground.tsx` (video bg, mouse parallax) + `components/BGMPlayer.tsx`
- **Observed:** body `#0a0a0a`, Arial. DESTINY WARS logo art + serif-styled catchphrase ("Make the Decisive Draw!") + gold accents (`#fde68a` family). "Play Now" button uses an SVG/bordered plaque style, radius 14px. News panel: 16px radius, black/55 glass, white/20 border. BGM pills radius 12px.
- **Notes:** The catchphrase renders in a serif stack (Georgia fallback) while everything else is Arial — one of only two serif uses in the app. Rainbow-ring video bg is the piece the owner wants removed (parked task).

## 02-menu.png — `/menu`
- **Renders:** `app/menu/page.tsx` + `components/TopBar.tsx` + banner image + `components/trust/LegalFooter.tsx`. Guest-notice modal (dismissed for capture) is Tailwind `bg-zinc-900 / border-zinc-700 / rounded-2xl`.
- **Observed:** no `h1` at all — the page is a banner image + one big blue CTA ("Pull and Play", Tailwind `bg-blue-600 rounded-2xl`). TopBar tool buttons: navy glass `rgba(10,15,25,.66)`, radius **6px** — smallest radius in the app.
- **Inconsistency:** the flat `bg-blue-600` CTA reads "default Tailwind" next to the title screen's ornate plaque button; TopBar 6px radius vs page 16px radius.

## 03-gacha.png — `/gacha`
- **Renders:** `app/gacha/page.tsx` + `components/gacha/PullSelection.tsx` (+ ResultGrid/RevealPlayer when pulling) + TopBar. Daily lineup + community graph from Phase 6 work (`lib/gacha/dailyRotation.ts`, `lib/gacha/simulatedCommunity.ts`, `components/charts/*`).
- **Observed:** "TODAY'S LINEUP" heading (18px/900 Arial, near-white), countdown copy present, "Community pulls today: 447", **2 SVG charts** rendered (line + bar). Page height 1346px.
- **Verify by eye:** the lineup card *images* didn't match the probe's selector (`lineupImgCount: 0`) — check the PNG to confirm the 7 card thumbnails render (could be selector mismatch, could be a real missing-images issue in headless).

## 04-battle.png — `/battle`
- **Renders:** `components/battle/BattleScreen.tsx` (scaled stage) → `BattleBackground` (4-layer parallax), `BattleSpawnScene` (character reveal), Pixi canvas (`BattlePixiStage`), DOM chrome: `BattleHUD`, `BattlePoints`, `BattleLog`, `RoundMeter`, `StatsGraphPanel` (DATA tab), overlays (Bonus/Resurrection/BarReset/Collection).
- **Observed:** Battle Log heading gold (`lab(83 8.6 107)` ≈ #fbbf24 family), Quit button bright red (≈ #ef4444) radius 12px, log panel black radius 16px. Stage is its own world (game art) — chrome around it is minimal dark panels.
- **Inconsistency:** battle chrome (12/16px radius, gold/red accents) shares no tokens with menu/gacha styling; DATA-counter overlay (from Phase 3) is intentionally its own pachislot style.

## 05-inventory.png — `/inventory`
- **Renders:** `app/inventory/page.tsx` + TopBar.
- **Observed:** h1 "Inventory" 30px/700 white. Panels `rounded-xl` (12px), zinc-800 glass on zinc-900 border. Guest inventory shows pulled cards or empty state.
- **Inconsistency:** heading scale (30px) sits between trust pages (54px) and game panels (18px) — three different h1 scales across the app.

## 06-history.png — `/history`
- **Renders:** `app/history/page.tsx` + TopBar.
- **Observed:** h1 "Pull History" 30px/700. For guests the list area is effectively empty (member-only data; guests see login prompt). Page height equals viewport — mostly blank space for guests.
- **Note:** guest experience here is a dead end; consider a friendlier empty state.

## 07-giftbox.png — Gift Box overlay (opened from TopBar on /menu)
- **Renders:** overlay owned by `components/TopBar.tsx` (button, no route). **`/giftbox` as a URL is a 404** — the earlier capture of that route shows the Next.js 404 page.
- **Observed:** backdrop black/80 (z-50), panel zinc-900-family, radius 16px, zinc-700 border. Heading "Gift Box" + subtitle "Rewards for playing. Claim them anytime." Two milestone rows ("50 Games Played — 0/50 games · 200 pts", "200 Games Played — 0/200 · 500 pts") with **Locked** buttons, plus "Watch Ad (+bonus points)" and "Close".
- **07b-giftbox-ad-overlay.png:** state after pressing Watch Ad (ad stub).
- **Inconsistency:** Shop is a *page* while Gift Box is an *overlay* — two different navigation patterns for sibling features. Milestone progress reads 0 games in a fresh profile (correct, but shows the counter is per-browser).

## 08–11 — Trust pages (`/rules`, `/how-to-play`, `/support`, `/privacy`)
- **Renders:** `app/{rules,how-to-play,support,privacy}/page.tsx` via `components/trust/InfoPageLayout.tsx` + `HelpNav` + section components (e.g. `RulesOddsSection`). `/terms`, `/cookies`, `/cookie-settings` share the same layout (not captured).
- **Observed:** giant 54.6px weight-**400** Arial h1s (vs bold-heavy game pages), left nav buttons white/4% radius 7px, content panels radius 10px. Rules panel uses teal accent border `rgba(45,212,191,.18)`; other trust panels use `rgba(8,12,24,.88)` glass with near-white border tokens. Long pages (2.2k–2.9k px) — full-page PNGs capture everything.
- **Inconsistency:** teal accent family appears only here; nowhere in the game UI.

---

## Cross-cutting findings

| # | Finding | Evidence |
|---|---|---|
| 1 | **No branded typography anywhere** — every screen is Arial (one serif catchphrase on title). The planned UI overhaul (design tokens + next/font) has not landed. | `bodyFont: Arial` on all 11 probes |
| 2 | **Border-radius has six values** with no system: 6 (TopBar), 7 (trust nav), 10 (trust panels), 12 (chrome), 14 (Play Now), 16 (panels/overlays) | probe `radius` fields |
| 3 | **Three heading scales/weights**: trust 54.6px/400, inventory/history 30px/700, game panels 18px/700–900 | probe `heading` fields |
| 4 | **Accent colors fork by area**: gold+red (battle), blue-600 (menu CTA), teal (trust), fuchsia/violet (admin) — base bg is consistently `#0a0a0a` everywhere, which is the one unifying token | probes |
| 5 | **/giftbox route 404s** while the TopBar opens a Gift Box overlay; Shop is a page — sibling features use different navigation patterns | 07 capture + audit-data.json |
| 6 | Guest empty-states on history (and possibly inventory) are blank walls | 05/06 captures |
| 7 | Verify by eye: gacha TODAY'S LINEUP card thumbnails (probe found 0 imgs under lineup selector) | 03 capture |

## Files
`01-title.png · 02-menu.png · 03-gacha.png · 04-battle.png · 05-inventory.png · 06-history.png · 07-giftbox.png · 07b-giftbox-ad-overlay.png · 08-rules.png · 09-how-to-play.png · 10-support.png · 11-privacy.png · audit-data.json`
