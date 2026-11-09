<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Shared Preview Source Of Truth

- Canonical workspace: `C:\Users\essos\Desktop\gacha-app`.
- Canonical branch: `main`, unless the owner explicitly selects another branch.
- Do not edit or serve `.claude/worktrees/*` for shared battle QA.
- Use the shared live preview at `http://127.0.0.1:3000` from the canonical workspace with `npm run dev`.
- Before reporting visual QA, verify the repository root, current branch, and server working directory.
- Use `next start` only for explicit production-build QA after a fresh rebuild; it is not the collaborative editing preview.

## Development Team

- Cross-tool continuity: Claude and Codex share the **Shared Claude / Codex restart** section near the top of `session-handoff.md`. Read it before older status; after each task update the same current record with changed files, decisions, checks/limits and next action. Preserve history and avoid parallel master handoffs. Codex role TOML files are portable responsibility briefs, not proof of Claude-native agent configuration.

- **Kiwi / キウイ** = `frontend_designer`: frontend Web design and coding for explicitly assigned pages/components. Coordinate file ownership with Mio's cabinet/UI and Kai's gameplay/runtime; initialization alone authorizes no implementation.
- **マイニガ** = `tank_3d_artist`: isolated Three.js/WebGL 3D prototypes and air-tank/card-shuffle motion. Kai retains gameplay/production integration, Mio cabinet/UI and Sora character-art ownership; prototypes do not authorize main-game adoption.
- Gacha Studio defaults to PM **Ren / レン**, unless the task explicitly selects another role. **Aki / アキ** = `game_systems_designer` (mechanics and independent critique); **Kai / カイ** = `game_developer`; **Mio / ミオ** = `ui_cabinet_designer`; **Sora / ソラ** = `animation_director`; **Riku / リク** = `qa_tester`. Ren's role ID is `project_manager`.
- Load only the assigned `.codex/agents/<role>.toml`. If native named-role selection is unavailable, explicitly have the worker read its profile; do not claim automatic discovery was tested.
- Read `session-handoff.md` only above `<!-- setup-history -->` first; consult relevant bible/source sections as the task requires. PM owns shared documentation; role ownership is in `PROJECT_BIBLE.md`.
- The owner authorizes PM to delegate approved work. Use the fewest workers needed, at most three active workers across peer chats and subagents; workers do not delegate. The per-session configuration cap does not itself coordinate peer chats.
- Give each task a goal, allowed files, owner, acceptance checks and dependencies. Assign one writer per file; coordinate shared components before edits. Workers finish with a concise handoff; PM reads and consolidates it.
- Planning meetings: owner proposal, Aki's actual independent support/objections, then Ren's summary and one unresolved question. Do not simulate an agent review that did not occur; disagreements require reasons, not automatic opposition. The owner decides product direction.

## Preservation And Evidence

- Preserve modified/untracked work. No reset, clean, stash, revert, deletion, overwrite or reorganization without task-specific authorization. Stay within assigned files.
- Do not incidentally change personal settings, models, permissions, dependencies, servers, port 3000 or `.next`. Never hand-edit `lib/game-config/generated.ts`.
- Reuse applicable project skills and existing documents. Preserve asset revisions; resolve approved identity/style references before generation.
- Separate current implementation, approved intent and historical plans. Code/asset existence is not end-to-end or visual proof. Complete tasks only after acceptance/review; report skipped checks and risks. QA is read-only by default.

## Context And Usage

- Use one chat per coherent task. Continue the same unresolved problem; at a milestone, start fresh with a short handoff when authorized. Do not copy/fork whole histories merely to reset context; compaction can help when continuing the same task.
- Keep Ren's chat for coordination and named specialist chats for relevant work. Idle roles do not poll or send check-ins. Do not launch all roles for every request.
- For isolated subagents use fresh context (`fork_turns="none"` when supported), supplying the role path, shared rules and a bounded task brief. Do not automatically inherit this setup conversation.
- Read only relevant files/sections; avoid repeated whole-project audits, full logs and unneeded media. Prefer summaries with file/line references. Normally return at most five bullets; worker handoffs should fit about 200 words unless evidence requires more.
- Reuse the bible for product intent/priorities, the existing ability audit for its matrix, and the handoff for current progress/chat routing. PM updates goal, allowed files, decisions, checks and next owner at each milestone. Retain the historical setup record without loading it by default.
- Separate chats do not guarantee lower usage; duplicated investigation, tools, model/reasoning choice and caching matter. Keep existing model/provider/permission settings unless the owner requests a change.
- After this workflow setup, await the owner's next instruction; do not begin gameplay, UI or animation work automatically.
