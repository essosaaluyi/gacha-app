<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## プロジェクト概要
- Webブラウザで遊べるガチャゲーム。技術構成は Next.js / React、PixiJS。3D 表現には Three.js も使用する。
- 主な構成：`app/` はページ、`components/` は UI、`lib/` はゲームロジック・状態・描画、`public/` は画像・動画・音声、`game-config/` は設定元、`tools/` と `scripts/` は補助処理。
- 開発サーバー：`npm run dev`。ビルド：`npm run build`（`package.json` で確認）。

## Codex / Claude の担当
- Codex：キャラクター・UI・エフェクト等の画像素材の生成と組み込み、3D 表現、アニメーション、ガチャ・バトル演出など見た目に関わる調整。
- Claude：ガチャ抽選・戦闘・状態管理などのゲームロジック、確率・ステータス・バランスのデータ設計、アセット読み込み・テクスチャ・描画の最適化、リファクタリング・設計見直し・コードレビュー。
- 担当外の作業が必要なら大きく変更せず、`session-handoff.md` の「次の担当への依頼」に記録する。相手の担当範囲を変更した場合は理由を同ファイルに記録する。既存の専門役の担当も尊重し、必要なら所有者間で調整する。

## 作業開始
1. 変更を始める前に作業ツリーを確認する。未コミット変更を保全し、許可なく破棄・退避しない。
2. `git fetch origin` と `git pull --ff-only origin main` で `main` を同期する。同期できない場合は停止して報告する。
3. `main` に未統合の `claude/`・`codex/` 等のブランチを確認する。引き継ぎと差分を調べ、内容が安全で独立している場合のみ統合する。競合・不明点・未コミット作業がある場合はマージせず所有者に報告する。
4. `session-handoff.md` 冒頭の最新記録を読んでから作業する。

## 作業中・終了時
- 1タスクごとにコミットする。素材は既存の配置・命名規則に従い、PSD 等の制作データは Git に含めない。
- `outputs/` は Git 管理外。必要な検証結果は `session-handoff.md` に要約する。
- 可能なら `main` にコミットして push する。別ブランチの場合はブランチ名を引き継ぎに記録する。
- 作業ごとに `session-handoff.md` の先頭へ記録を追加し、同記録もコミット・push する。未完了・既知の不具合・未実施の確認は隠さず、「未確認」と明記する。
- 原本素材（WebP の元になった PNG/JPG）は `D:\asset-sources\gacha-app` に、`public/` と同じフォルダ構成で置いてあり、Git 管理外。使わなくなった素材は `D:\archive\gacha-app` にある（削除ではなく移動で整理する）。
- 素材の形式は Safari（iPhone）でも表示できるものにする。将来の iPhone・アプリ対応のため、透過 WebM だけ、のように Safari で動かない形式に依存しない。透過が必要なアニメーションは、WebP の連番か WebP のスプライトシート（Pixi のテクスチャアトラス）にする。HEVC の透過動画は Windows では作れないので、使う前提にしない。
- 本番では `public/` の画像・動画・音声に immutable キャッシュ（1年）を付けている。素材を差し替えるときは、同じファイル名で上書きせず、ファイル名にバージョンを付けて（例：`xxx.v2.mp4`、`xxx000.v2.webp`）コード側の参照も変える。上書きすると、一度訪れたプレイヤーには最長1年届かない。
- 並列で作業する場合は、エージェントごとに担当ファイルを分けて重ならないようにし、git の操作（add・commit・push）は1人（リーダー）がまとめて行う。
- 作業中に、ユーザーが知らなさそうな便利な機能・ツール・プラグインがあれば、報告の最後に「💡 提案」として1〜3個、何ができてなぜ役立つかを短く紹介する（インストールが必要なものは許可を取ってから）。

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
- **ファイル整理チーム（2026-11-10 新設、Claude 側）**：**Tsukasa** = リーダー（全体の指揮・統合・最終確認。git の add・commit・push もまとめて担当）、**Haku** = エージェントA（不要ファイルを `D:\archive\gacha-app` へ移動）、**Kura** = エージェントB（WebP の元になった PNG/JPG 原本を `D:\asset-sources\gacha-app` へ移動し、生成スクリプトの参照先を更新）、**Hayate** = エージェントC（ラグ対策の調査。ファイルは変更しない）。報告や `session-handoff.md` の記録ではこの名前を使う。Haku・Kura・Hayate の役割とルールは `.claude/agents/haku.md`・`kura.md`・`hayate.md` に定義してあり、Claude のサブエージェントとして名前で呼び出せる。リーダーは当初 Sora と呼んでいたが、animation_director の **Sora / ソラ** と紛らわしいため 2026-11-10 に **Tsukasa** へ改名した。
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
