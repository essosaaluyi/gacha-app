# Gacha Battle App

Web-based gacha battle game: PixiJS renderer inside a Next.js/React shell. Supabase for accounts/points (guests use localStorage).

## Layout
- `app/` — routes: menu, gacha, battle, admin (odds editor), history, inventory, trust pages
- `components/` — React UI; `components/battle/` = DOM overlays + spawn scene over the Pixi stage
- `lib/battle-pixi/` — battle engine: `core/` (RNG/logic), `state/` (pub-sub stores), `stage/` (draw handlers)
- `lib/gacha/` pull logic · `lib/wallet/` unified points · `lib/events/` event log (feeds stats)
- `lib/game-config/generated.ts` — regenerated from `game-config/game-config.xlsx` (`npm run sync:game-config`); NEVER hand-edit. Hand-tunable odds live in `lib/game-config/patchConfig.ts`
- `public/images|videos|audio` — 2GB+ of assets
- `tools/` sync scripts · `outputs/` team artifacts · full legacy handoff: `CLAUDE-handoff-archive.md`

## Session rules
- Never read asset directories (images, video, frame sequences, atlases, audio). Ask before opening any binary/media file.
- Only read files referenced with @ or clearly required for the task. Never scan the whole codebase.
- Keep tool output short: builds/tests → report only errors and relevant lines.
- If `gacha-game-patch-brief.md` exists, it is the source of truth for the current patch. Read only the section relevant to the current task.
- Dev server: the user runs it on :3000. Never start a second one (shared .next cache breaks).
- Stale CSS: Turbopack's persistent cache *intermittently* keeps serving an old compiled `globals.css`, so an edit silently does nothing and looks like the CSS is wrong. Before debugging a style that "didn't apply", run `npm run check:css -- <selector>` — it says whether the rule reached the served bundle. If it is in the source but not served, stop the server and `npm run dev:clean`. Don't clear the cache reflexively; a full rebuild is slow and the fault is occasional.
- At session end, when the user says "write handoff", fill in `session-handoff.md`.

# Compact instructions
When compacting, preserve: current task goal, files changed, probability/point values decided, failing tests with exact errors, next action. Drop: old exploration, repeated logs.
