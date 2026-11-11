# 筐体 3D 仕様書（Blender 実機品質版 ／ three.js 軽量版）

作成：2026-11-12 ／ 担当：Claude ／ ブランチ：main
対象：バトル画面の筐体（`/battle`）を Blender で実機スロット相当の 3D モデルにするための前提整理。

この文書の役割は **「今リポジトリに何があるか」を確定させること** です。
寸法のうちミリ単位の値は、現状のコードからは決まらないので「想定値」と明記しています。
推測で埋めずに決める必要がある点は、すべて最後の [9. 未決事項](#9-未決事項) に集めました。

---

## 1. 座標系と単位

| 空間 | 単位 | 範囲・原点 | 使う場所 |
|---|---|---|---|
| **筐体ステージ座標** | px | 1920 × 1080、原点は左上 | DOM/CSS の全部品、`CabinetPlayerDock.geometry.ts`、`cabinetTableGeometry.ts` |
| **ニッチ ローカル座標** | three.js unit | 原点はくぼみの床の回転中心、+Y 上 / +Z 手前 | `lib/button-3d/cabinetNiche.ts` |
| **ボタン ローカル座標** | three.js unit | ドーム底面の半径 ≈ 1.0 | `lib/button-3d/runtime.ts` |
| **エアタンク ローカル座標** | three.js unit | タンク中心、ガラス筒 半径 2.05 / 高さ 5.35 | `lib/air-tank-lab/model.ts` |
| **排出 3D 座標** | px（透視投影込み） | 1920×1080 ステージを fov 40° で見た空間 | `cabinetEject3DGeometry.ts` |

ステージ全体 `.battle-cabinet-stage` は 1920×1080 固定で、ビューポートに合わせて**等比スケール**されます（`BattleScreen.tsx:818-826`）。
つまり現状の筐体は **16:9 の正面図（正投影）1 枚**であり、奥行きはどこにも定義されていません。

---

## 2. 既存ビジュアルとコードの所在一覧

### 2.1 参照デザイン（デザインの元）

| ファイル | 内容 |
|---|---|
| [design-ref/battle-cabinet-v8.html](design-ref/battle-cabinet-v8.html) | 筐体レイアウトの原典。1920×1080、base64 画像を含む単体 HTML（2 MB）。レール・コーナー・上部トリム・メモリーボード・ディスク盤・DRAW・AUTO・カードテーブル・手札がそろった完成形 |
| [.codex/claude-battle-cabinet-v8/battle-cabinet-v8.html](.codex/claude-battle-cabinet-v8/battle-cabinet-v8.html) | 同じものの Codex 側コピー |
| [.codex/claude-battle-cabinet-v8/battle-cabinet-v8-editor.html](.codex/claude-battle-cabinet-v8/battle-cabinet-v8-editor.html) | 座標調整用エディタ版 |
| [design-ref/table-demo.html](design-ref/table-demo.html) | カードテーブル単体のデモ |
| [design-ref/table-and-card-animation-guide.md](design-ref/table-and-card-animation-guide.md) | テーブルとカードの動きの指針 |
| [design-ref/anticipation-ladder.md](design-ref/anticipation-ladder.md) | 期待度の段階設計 |

### 2.2 現在ライブで描かれている筐体（DOM + CSS）

実装は [components/battle/BattleScreen.tsx:794-1137](components/battle/BattleScreen.tsx:794) が組み立て、見た目は [app/globals.css:5846-9467](app/globals.css:5846)（`bcab-` 接頭辞）にあります。
ステージには `bcab-air-cabinet` クラスが付いており、**v8 原典とは左右の構成が違います**（左が液晶ではなくカードドック）。

| 部品 | クラス | left / top / width / height (px) | z | 描画元 |
|---|---|---|---|---|
| 筐体シェル | `.battle-cabinet-stage` | 0 / 0 / 1920 / 1080 | — | CSS グラデーション + 縦ストライプ |
| 上部 HUD ベゼル | `.bcab-top-hud` | 330 / 12 / 1250 / 66 | 40 | `BattlePoints` `RoundMeter` `BattleGameCounter` |
| サービスボタン列 | `.bcab-bezel` | 180 / 24 / （右 180 まで）/ 44 | 42 | QUIT / BGM / Volume |
| **液晶（LCD）** | `.battle-cabinet-screen` | 330 / 88 / **1250 / 618** | 10 | 内側に Pixi ステージと全オーバーレイ |
| 左ベイ：カードドック | `CabinetPlayerDock` `.dock` | 30 / 88 / 276 / 500 | 20 | 二重金枠 + PLAYER CARD 枠 |
| 左ベイ：カード排出口 | `.outlet` | **40 / 604 / 256 / 100** | 21 | `card-holder.png` + throat + lip |
| 右ベイ：操作パネル | `.bcab-led-panel` | **1610 / 88 / 270 / 618** | 5 | 開発環境では 3D ニッチが中に入る |
| 下段デッキ | `.bcab-deck` | 0 / 730 / 1920 / 350 | 15 | 下部 LED パネル 4 枚 + ブリッジ |
| カードテーブル | `.bcab-table-space` | 400 / 730 / 1120 / 350 | 12 | `card-table-premium-three-bay-center-only-1120x420.webp` |
| Pixi マウント（テーブル面） | `.bcab-pixi-mount` | 中央 / 155 / 1200 / 500 | 3 | カードの着地面 |
| 手札 | `.bcab-hand` | 右 26 / 下 18 / 360 / 300 | 18 | 3 枚扇状（176×264、−12° / −1° / +10°） |
| KEEP OUT テープ | `.bcab-keepout` | 75 / 25 / 196 / 196 | 22 | コレクション中だけ DRAW を覆う |
| スタチュー（マスコット） | `.bcab-mascot` | 右 12 / 上 402（パネル内） | — | `/images/cabinet/statue.png` |
| ログティッカー | `.bcab-ticker` | 上 544（パネル内）/ 226 / 48 | — | `BattleLog variant="ticker"` |

カードテーブルの傾き（[cabinetTableGeometry.ts](lib/battle-pixi/presentation/cabinetTableGeometry.ts)）：

- 基準角 29°、見せ角 60° → `CABINET_TABLE_DEPTH_SCALE = sin60° / sin29° ≈ 1.786`
- 受け渡し行 y = 105 px を固定したまま `scaleY` をかけるので、`CABINET_TABLE_PITCH_OFFSET_Y ≈ −82.5 px`
- カード平面は追加で `scale(0.82)`（`--bcab-card-plane`）

### 2.3 すでに three.js で作られている 3D 部品

| 部品 | ファイル | 状態 |
|---|---|---|
| **操作くぼみ（ニッチ）一式** | [lib/button-3d/cabinetNiche.ts](lib/button-3d/cabinetNiche.ts) | **開発環境のみライブ**。壁・床・天井・ひさし・金縁・照明・DESTINY WARS ロゴ・AUTO レバー・DATA COUNTER 看板 |
| 丸型 DRAW ボタン | [lib/button-3d/runtime.ts](lib/button-3d/runtime.ts) `buildDrawButton` | ニッチの床に載っている（採用形状） |
| 盾型 PUSH ボタン | [lib/button-3d/pushButton.ts](lib/button-3d/pushButton.ts) | 試作、保管のみ（オーナーが丸型を採用） |
| ニッチのマウント | [components/battle/cabinet/CabinetNiche3D.tsx](components/battle/cabinet/CabinetNiche3D.tsx) | variant **D**（看板・立体ロゴ・受け皿・青側面）に固定 |
| DRAW ボタン単体マウント | [components/battle/cabinet/DrawButton3DMount.tsx](components/battle/cabinet/DrawButton3DMount.tsx) | ニッチに置き換わり未使用（ファイルは保管） |
| エアタンク（役物） | [lib/air-tank-lab/model.ts](lib/air-tank-lab/model.ts) ほか | **未マウント**。ラボ `/air-tank-lab` でのみ動く |
| カード 3D | [lib/card-3d/](lib/card-3d/) | ガチャ側のカード 3D |
| 比較ラボ | `app/button-3d-lab/`, `app/button-3d-lab/niche/`, `app/air-tank-lab/`, `app/card-3d-lab/`, `app/card-motion-lab/` | 開発環境のみ |

ニッチのカメラ（これが「見え方」の基準）：

```
PerspectiveCamera  fov 26°（パネル幅に合わせて自動拡大、最低 28°）
距離 17.5 / 見下ろし 12° / 注視点 (0, 1.1, 0)
床の傾き 34°（12° の見下ろしと合わせて、ボタンを見る角度が 48° 相当になる）
環境光：PMREM / preset "window"（ブラインド越しの窓）
天井照明：発光ライン（W−0.3 × 0.03 × 0.08）＋ RectAreaLight 強度 9
```

### 2.4 画像アセット（筐体関連のみ）

> 画像そのものは開かず、コードからの参照だけを一覧にしています。

| パス | 使用箇所 |
|---|---|
| `/images/cabinet/card-holder.png` | 排出口 `.outlet`、`.bcab-air-outlet::before`、`.bcab-disk` |
| `/images/cabinet/draw-button.png` | `.bcab-draw-btn`（2D 版の見た目） |
| `/images/cabinet/statue.png` | `.bcab-mascot` |
| `/images/cabinet/grille-wide.png` | `.bcab-grille`（現構成では `display:none`） |
| `/images/cabinet/production/memory-board-pachislot-off-v2.png` | `.bcab-memboard` 消灯（**未描画**） |
| `/images/cabinet/production/memory-board-pachislot-led-lamps-v2.png` | 同 LED マスク（**未描画**） |
| `/images/cabinet/production/card-table-premium-three-bay.webp` | テーブル原本 |
| `/images/cabinet/production/card-table-premium-three-bay-center-only-1120x420.webp` | `.bcab-card-table` |
| `/images/battle-ui/lower-cabinet-led-v3/lower-cabinet-center-bridge-v3.webp` | 下部 LED ブリッジ |
| `/images/battle-ui/lower-cabinet-led-v3/lower-cabinet-led-{left,right}-{on,off}-v3.webp` | 下部 LED 枠 4 枚 |
| `/images/battle-ui/production/v1/transparent/*` | HUD プレート・ティッカー枠・数字 |

生成スクリプト：[tools/build-lower-cabinet-led-v3.mjs](tools/build-lower-cabinet-led-v3.mjs)（テーブル原本から下部 LED 枠 v3 を切り出す）。

### 2.5 CSS はあるが現在描かれていない部品（v8 の残骸）

**Blender 版で「復活させるのか」を決める必要がある部分です。**

| 部品 | クラス | 元の寸法 (px) | 状態 |
|---|---|---|---|
| メモリーボード（左の基板パネル） | `.bcab-memboard` | 40 / 88 / 266 / 618 | TSX から描かれていない。LED 流れアニメ 26s とチャンススウィープの CSS は残っている |
| 金のレール 4 本 | `.battle-cabinet-rail-*` | 上下 top/bottom 40、左右 left/right 40、太さ 2 | 未描画 |
| コーナー飾り 4 隅 | `.battle-cabinet-corner-*` | 幅 150 | 未描画 |
| 上部トリム | `.battle-cabinet-top-trim` | 924 / 25 / 560 | 未描画 |
| ディスク盤（C 字の受け皿） | `.bcab-disk-well` `.bcab-disk` | −8 / −60 / 346 / 370 | 未描画（`BattleVfxOverlay.tsx:119` がまだ探している） |
| ディスクの山（デッキ） | `.bcab-disk-deck` | 216 / 29 / 136 / 198 | 未描画 |
| ディスクのリング発光 | `.bcab-disk-ring` | 75 / 25 / 196 / 196 | 未描画 |
| エアタンク枠一式 | `.bcab-air-tank*` `.bcab-air-route` `.bcab-air-outlet` | タンク 30 / 88 / 276 / 618、窓 inset 20/4/118、導管 8 / 465 / 26 / 68、出口 22 / 518 / 216 / 112 | `CabinetAirTank` が未マウント |
| 筐体リアクション | `.bcab-react-led` `.bcab-react-statue` `.bcab-react-memboard` | — | どこからも付与されていない |
| ウォーターマーク | `.bcab-watermark` | テーブル下端 | 未描画 |

`.bcab-bar-success-strobe` / `.bcab-bar-failure` は**ライブ**ですが、ストロボの対象にメモリーボードが含まれているため、現状は下部 LED だけが光ります。

### 2.6 演出・信号・タイミングの定義ファイル

| ファイル | 内容 |
|---|---|
| [lib/game-config/cabinetSignalConfig.ts](lib/game-config/cabinetSignalConfig.ts) | 筐体の光りものの**確率と時間**（手調整可） |
| [lib/battle-pixi/state/cabinetSignalStore.ts](lib/battle-pixi/state/cabinetSignalStore.ts) | 信号の状態機械（パルス・スウィープ・スタチュー・ブラックアウト） |
| [lib/battle-pixi/presentation/cabinetDealSequence.ts](lib/battle-pixi/presentation/cabinetDealSequence.ts) | DRAW1/DRAW2 の進行（`CABINET_SHUFFLE_MS` 2000 など） |
| [lib/battle-pixi/presentation/cabinetTwoStepMotion.ts](lib/battle-pixi/presentation/cabinetTwoStepMotion.ts) | 2 段階 DRAW のカード軌道（`TWO_STEP_DEAL_MS` 1080） |
| [lib/battle-pixi/presentation/cabinetEject3DGeometry.ts](lib/battle-pixi/presentation/cabinetEject3DGeometry.ts) | 旧 3D 排出の軌道（1450 ms）。現在は 2 段階 DRAW に置換 |
| [components/battle/cabinet/CabinetPlayerDock.geometry.ts](components/battle/cabinet/CabinetPlayerDock.geometry.ts) | 排出口とカード裏 3 枚の**正確な四隅座標** |
| [lib/air-tank-lab/motion.ts](lib/air-tank-lab/motion.ts) / [cabinet-motion.ts](lib/air-tank-lab/cabinet-motion.ts) | タンク内の風の場（120 Hz 固定ステップ） |
| [lib/audio/sfxStore.ts](lib/audio/sfxStore.ts) | SE 一覧（`buttonPush` `cardSetToDisk` `drawCard` `cardReveal` ほか） |

---

## 3. 部品構成と寸法の想定

### 3.1 スケール換算の前提（**要承認**）

px → mm の換算係数は、何を基準にするかで 1.6 倍ちがいます。3 つの基準が互いに矛盾します。

| 案 | 基準 | 係数 | 筐体全幅 | 液晶 | カード |
|---|---|---|---|---|---|
| **A（画面基準・この文書の既定）** | 液晶を 19.2 インチ級 | **0.35 mm/px** | 672 × 378 mm | 437 × 216 mm | 46 × 69 mm |
| B（カード基準） | カードを実寸 63×88 mm | 0.477 mm/px | 916 × 515 mm | 596 × 295 mm | 63 × 88 mm |
| C（設置幅基準） | 筐体幅を実機 580 mm | 0.302 mm/px | 580 × 326 mm | 378 × 187 mm | 40 × 60 mm |

以下は **案 A（0.35 mm/px）** で記載します。案を変える場合は mm 列に `B: ×1.363` / `C: ×0.863` をかけてください。

### 3.2 筐体シェル（外形）

| 項目 | px | mm（案 A） | 備考 |
|---|---|---|---|
| 正面 全幅 × 全高 | 1920 × 1080 | 672 × 378 | 16:9。実機の縦横比ではない（→ 未決 9.1） |
| 奥行き | — | **未定義** | リポジトリに情報なし（→ 未決 9.2） |
| 前面パネルの厚み | — | 未定義 | |
| 外装色 | — | — | `--gm1 #101216` `--gm2 #1a1d23` `--gm3 #242830`、金 `--gold #c9a24b` / `--gold-deep #8a6a2f` / `--gold-bright #efd695` |
| 表面仕上げ | — | — | 2 px ピッチの縦ストライプ（ヘアライン）＋ 上明→下暗のグラデーション |

### 3.3 液晶（LCD）

| 項目 | px | mm（案 A） |
|---|---|---|
| 表示エリア | 1250 × 618 | 437.5 × 216.3 |
| 対角 | 1393 | 487（約 19.2 インチ） |
| ベゼル幅 | padding 7 + 外周 4 段（計 約 8） | 約 5 |
| ベゼル断面 | — | 外→内：黒 1 px → 濃灰 2 px → 金 1 px → 内側ハイライト |
| 角 R | 8 px（外）/ 5 px（内） | 2.8 / 1.8 |
| 表示比 | 2.02 : 1 | 標準パネル比ではない（→ 未決 9.3） |

### 3.4 左ベイ（PLAYER CARD ドック ＋ カード排出口）

| 部品 | px | mm（案 A） | 仕様 |
|---|---|---|---|
| ドック外枠 | 30 / 88 / 276 / 500 | 96.6 × 175 | `border: 8px double #a58750`、角 R 25/16/18/20 |
| ドック内枠 | 8 / 12 / 244 / 456（ローカル） | 85.4 × 159.6 | 1 px 金枠、`PLAYER CARD` ラベル |
| 現在カードの表示枠 | 220 × 408 | 77 × 143 | 召喚済みカードの絵 |
| 空枠 | 202 × 314 | 70.7 × 110 | 破線、「手札をここへ」 |
| **排出口 外枠** | 40 / 604 / 256 / 100 | 89.6 × 35 | `border: 6px double #a68b51`、角 R 38/38/15/15、`card-holder.png` |
| 排出口 内側（throat） | inset 15 / 20 / 18 | — | 3 px `#76613b` 枠、内側は黒 `#020508` |
| 排出口 下リップ | 左右 8 / 下 −2 / 高 16 | 5.6 | 金 → 暗色のグラデーション、下に 4 px の影 |
| カード 1 枚 | 132 × 198 | 46.2 × 69.3 | 2:3 |
| セット時のカード位置 | 84 / 650・670・690 / 168 / 120 | — | 20 px ずつ段違い（`CABINET_PLAYER_DOCK_BACK_RECTS`） |

### 3.5 右ベイ（操作くぼみ ＝ 3D ニッチ）

パネル外形 **1610 / 88 / 270 / 618 px**（= 94.5 × 216.3 mm）の中に、three.js のくぼみが入ります。

ニッチ ローカル単位 → px 換算：くぼみ幅 3.24 unit がパネル幅 270 px に合うので **1 unit ≈ 83 px ≈ 29 mm**。

| 部品 | ローカル単位 | mm（案 A・概算） | 仕様 |
|---|---|---|---|
| くぼみ 幅 | 3.24（halfW 1.62） | 95 | |
| 床 奥行き | 5.50（front 2.45 → back −3.05） | 161 | 奥へ **34°** 上がる |
| 天井高 | 3.05 | 89 | |
| ひさし 前端 / 上端 | 1.15 / 5.35 | 34 / 157 | 手前へ張り出すブロック |
| 前エプロン 下端 | −3.10 | −91 | ログティッカーがここに乗る |
| 金の縁取り（丸棒） | 半径 0.035 | 1.0 | 床の前縁とひさしの下縁の 2 本 |
| 天井の発光ライン | 2.94 × 0.03 × 0.08 | 86 × 0.9 × 2.3 | |
| **DRAW ボタン** 位置 | (0, 0, −1.20) 床上 | — | 床の傾きに載る |
| DRAW ベゼル 外径 | 2.96（半径 1.48） | 86 | 連続ベジェ断面の Lathe（220 分割） |
| DRAW ドーム 外径 | 1.98（半径 0.99） | 58 | 高さ 0.56 / 座面 0.42 |
| DRAW 中段 / 芯 | 径 1.68 / 1.20 | 49 / 35 | 高さ 0.40 / 0.17、面取り 0.05 |
| DRAW の LED | 18 個、半径 0.72 の円上、球 r 0.03 | 配置径 42 | |
| DRAW 押し込み量 | 0.085 | **2.5** | |
| **AUTO レバー** 台座 | 2.0 × 0.7、位置 (−0.42, 0, 1.00) | 58 × 20 | 角 R 0.2、クローム |
| AUTO 軸 | 長さ 0.5、径 0.056→0.08 | 15 | |
| AUTO ノブ | 球 径 0.32（内芯 0.20） | 9.3 | クリアプラ + 内部発光 |
| AUTO 振り角 | +26° ⇄ −26°（計 52°） | — | |
| **DATA COUNTER 看板** 箱 | 3.0 × 1.5、押し出し 0.22 | 88 × 44 | 黒い箱、X 軸 −8° 傾き |
| DATA 枠 | 2.8 × 1.3 | 82 × 38 | 琥珀色メタル `#d4893a` |
| DATA 発光面 | 2.44 × 0.94 | 71 × 27 | クリーム地 + 赤い斜体文字 |
| DATA 押し込み量 | 0.07 | **2.0** | |
| DESTINY WARS ロゴ | 2.8 × 0.5、奥壁 y = back.y + 0.62 | 82 × 15 | 立体クローム文字（文字型の層 12 枚） |
| 受け皿（トレイ） | 幅 3.14、奥行き 1.05 | 92 × 31 | クローム、両端が持ち上がる |
| 側面壁 | — | — | メタリックブルー `#3a6cf0` / 発光 `#0b1e5c` |

※ ローカル単位 → mm はカメラ透視を無視した概算です。正確な「画面上の見た目」は `onLayout`（`rectOf`）が返す px 矩形が真値です。

### 3.6 下段デッキ（カードテーブル・LED 枠・手札）

| 部品 | px | mm（案 A） | 仕様 |
|---|---|---|---|
| デッキ全体 | 0 / 730 / 1920 / 350 | 672 × 122.5 | 地色 `#030405`、上端に金 1 px、上方向へ内側影 |
| 下部 LED 枠（左・右） | デッキ全面 | — | on / off の 2 枚ずつを重ね、不透明度で切り替え |
| 中央ブリッジ | デッキ全面 | — | 左右 LED をつなぐ帯 |
| カードテーブル | 400 / 730 / 1120 / 350 | 392 × 122.5 | 画像は 1120 × 420 を上寄せ、角 R 8 |
| テーブル 3 ベイ | 画像内 | — | カード 3 枚の着地枠 |
| カード着地面（Pixi） | 中央 / 885 / 1200 / 500 | 420 × 175 | |
| テーブル傾き | — | — | 基準 29° / 見せ 60° → `scaleY 1.786`、`translateY −82.5 px` |
| 手札 | 右 26 / 下 18 / 360 / 300 | 126 × 105 | |
| 手札カード | 176 × 264 | 61.6 × 92.4 | −12° / −1° / +10°、hover で ±26 px 開く |

### 3.7 上段ベゼル

| 部品 | px | 内容 |
|---|---|---|
| HUD ベゼル | 330 / 12 / 1250 / 66 | 左：ポイントプレート 196 px ／ 中央：ラウンドメーター 最大 640 × 40 ／ 右：ゲームカウンター 132 px |
| サービス列 | 180 / 24 / 右 180 / 44 | 左：QUIT GAME ／ 右：BGM（♪）・Volume（◉）各 44 px 幅 |

---

## 4. 各ボタンの位置と役割

| # | ボタン | 位置（px、ステージ座標） | 当たり判定 | 役割 | 状態表示 |
|---|---|---|---|---|---|
| 1 | **DRAW** | パネル内 29 / 190 / 196 × 196<br>（3D 時は `onLayout` が上書き） | `.bcab-draw-btn` | **1 回目**：支払い・抽選・ゲーム数を確定し、裏向き 3 枚を排出口にセット<br>**2 回目**：テーブルへ放出（無料・再抽選なし） | ランプ 3 状態：`gray`（押せる）／ `sky`（セット済み＝次の押下で放出）／ `off`（ロック中・放出中）。押下で 2.5 mm 沈む |
| 2 | **AUTO** | パネル内 18 / 414 / 160 × ≥44 | `.bcab-auto` | 自動進行の ON/OFF。SET → DEAL を同じ経路で自動実行 | レバーが左右 26° に倒れる。ノブが `gray` → `sky` に発光。DOM 版は LED 9 px + 文字 |
| 3 | **DATA COUNTER** | パネル内 24 / 30 / 206 × 120 | `.bcab-data-btn` | 統計パネル `StatsGraphPanel` の開閉 | 常時点灯（gray 相当 0.5）。押下で 2 mm 沈み、160 ms で減衰する発光フラッシュ |
| 4 | QUIT GAME | ベゼル左（180 / 24 付近） | `.bcab-svc-quit` | バトル終了の確認ダイアログを開く | 赤系 `#f0a3a7`、hover で赤背景 |
| 5 | BGM | ベゼル右クラスタ | `.bcab-svc-speaker` | BGM の再生 / 停止 | ON のとき金色 `--gold-bright` |
| 6 | Volume | ベゼル右クラスタ | `.bcab-svc-speaker` | ミュート切り替え | 同上 |
| 7 | PLAYER CARD 枠 | 30 / 88 / 276 / 500 | `.card`（ドック内） | 召喚済みカードの概要を開く／手札のドロップ先 | ドロップ受付中は枠が金色に発光 |
| 8 | 手札カード ×3 | 右 26 / 下 18 の扇 | `.bcab-hcard` | クリックで概要、ドラッグでドックへ召喚 | hover で浮き上がる |

**押下カーブ（3D 共通）**：下降 70 ms（`1 − (1 − t/70)²`）→ 保持 45 ms → 復帰 240 ms（減衰コサインのオーバーシュート）。全体 355 ms。

`DRAW_BUTTON_3D = process.env.NODE_ENV !== "production"`（[BattleScreen.tsx:146](components/battle/BattleScreen.tsx:146)）。
**本番はまだ 2D 版の見た目です。**3D ニッチの本番採用はオーナー判断待ちです。

---

## 5. 動く部品（役物）の動き方

### 5.1 すでに実装されている動き

| # | 部品 | 動き | 時間・量 | どの演出で動くか | 実装 |
|---|---|---|---|---|---|
| 1 | DRAW ボタン キャップ | 沈む → 戻る（オーバーシュート） | 70 / 45 / 240 ms、2.5 mm | 毎回の DRAW 押下 | `runtime.ts` `buildDrawButton.press()` |
| 2 | DRAW ボタン キャップ | **ガタつき振動** | 既定 1600 ms | 「当たり確定」演出用。**ゲームに未接続** | `vibrate()` |
| 3 | AUTO レバー | 左右に倒れる（時定数 70 ms の指数イージング、わずかなオーバーシュート） | ±26° | AUTO 切り替え時 | `cabinetNiche.ts` |
| 4 | DATA COUNTER 看板 | 沈む + 発光フラッシュ | 355 ms、2 mm、発光減衰 160 ms | DATA ボタン押下 | `cabinetNiche.ts` `pressData()` |
| 5 | 排出口のカード裏 3 枚 | 下から順に現れて段差に収まる | 0 / 160 / 320 ms、SET 完了 650 ms | **DRAW 1 回目** | `BattlePixiStage.tsx:4052-4055` |
| 6 | カード 3 枚の放出 | 排出口 → テーブル 3 ベイへ。山なりに持ち上がり、頂点で 20 % 拡大、影が伸びる | 全体 **1080 ms**、1 枚 900 ms、ずれ **90 ms**、頂点で **−74 px** | **DRAW 2 回目** | `cabinetTwoStepMotion.ts` |
| 7 | スタチュー（マスコット） | 上下に揺れる | 4.5 s 周期、±4 px | 常時（アイドル） | `.bcab-mascot` |
| 8 | スタチュー | 色付き発光 + 動きの切り替え | `statue.movementMs` 2000 ms | チャンス示唆（白 / 青 / 緑 / 赤 / 金） | `cabinetSignalStore.ts` |
| 9 | 下部 LED 枠 | on / off 画像の切り替えパルス | `light` 1000 ms × 2 / `onOff` 600 ms × 3 | フェイタル確定・ボーナス確定・撃破 | `.bcab-panel-pulse-*` |
| 10 | KEEP OUT テープ | 斜めに流れ込み、ゆらゆら揺れる | — | コレクション（Pick a Bonus）中 | `.bcab-keepout-tape` |
| 11 | 筐体全体 | 白ストロボ | — | BAR CHANCE 成功（1/11） | `.bcab-bar-success-strobe` |
| 12 | カードテーブル | 失敗リアクション | — | BAR CHANCE 失敗 | `.bcab-bar-failure` |

### 5.2 作ってあるが止まっている動き

| # | 部品 | 動き | 止まっている理由 |
|---|---|---|---|
| 13 | **エアタンク内のカード撮拌** | 八角形のガラス筒の中で、カードが渦を巻いて舞う。120 Hz 固定ステップ、カード同士の接触解決つき。混ぜ中は `vortex 4.6 / tumble 3.6 / 最大速度 5.2`、待機中は 0.32 倍速 | `CabinetAirTank` がどこからもマウントされていない。PROJECT_BIBLE に「production tank/mix/old3D flight are unmounted」と明記 |
| 14 | タンクのリングランプ | 上下 2 本のトーラスが発光 + PointLight 強度 18 | 同上 |
| 15 | タンクのガラス割れ | `crack-layer.ts` / `cracks.ts` | 同上（ボーナス段位との対応も未定） |
| 16 | メモリーボードの LED 流れ | 26 s かけて上下に流れる（`bcabMemoryLedFlow`） | `.bcab-memboard` が未描画 |
| 17 | メモリーボードのチャンススウィープ | 1200 ms で上から下へ掃く + 4100 ms 保持 | 同上 |
| 18 | ディスク盤のリング発光 | 押下で外へ広がる | `.bcab-disk-*` が未描画 |

### 5.3 実機スロットにあって、まだ無いもの

可動役物（液晶上の物理ギミック）、リール、スタートレバー、メダル投入口、精算 / 返却ボタン、下皿、トップランプ、ドットマトリクス表示 — **いずれも実装・設計ともにありません**（→ 未決 9.4）。

---

## 6. 演出の流れ（映像・役物・光・音の連動）

### 6.1 1 ゲームのタイムライン

```
━━ DRAW 1 回目 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t=0       音 buttonPush
          役物 DRAW キャップが沈む（2.5 mm / 70ms）
          ロジック 支払い・抽選・G・カウンターを 1 度だけ確定
          光 25%  メモリーボード 白パルス（1000 ms × 2、light）     ← drawFlash
          光 20%  スタチュー 色信号（Chance 枚数で重み付け）        ← statue.chanceSignalChance
                    1枚 青70/緑30/赤0 ・ 2枚 青10/緑20/赤70 ・ 3枚 青5/緑15/赤80
          光 10%  Empty のときだけ 白のガセ信号                     ← statue.emptyFakeChance
          音 25%  vibration（撃破予告）
          音 60%  chanceUpDraw（チャンス確定時）
t=0       役物 排出口にカード裏 1 枚目 ＋ 音 cardSetToDisk
t=160     役物 カード裏 2 枚目
t=320     役物 カード裏 3 枚目
t=650     ランプ DRAW が gray → sky。進行点 "set" を通知
          （以降は無期限待機。カード概要を開いていても待つ）

━━ DRAW 2 回目 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t=0       音 buttonPush ＋ drawCard
          ランプ DRAW が off
          進行点 "release" を通知
          光 フェイタル確定時：両 LED パネルが onOff パルス（600 ms × 3）← fatalFlash
          光 20%  フェイタル勝利ターンのどこか 1 点でブラックアウト  ← fatalBlackout
                    （set / release / flip1 / flip2 / flip3 から 1 つ）
t=0‥1080  役物 カード 3 枚が山なりにテーブルへ
            1 枚ごと：開始 i×90 ms、900 ms、smoothstep
            持ち上がり sin²(πt)、頂点 −74 px、頂点で 20% 拡大、影が伸びる
t=1080    カードは裏向きのままテーブル 3 ベイに着地。DRAW はロック継続

━━ めくり（手動 3 回）━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
めくり毎   音 cardReveal、進行点 "flip1/2/3" を通知
          音 シンボル別：attackOnTarget / chanceCardLand / cardPlaced
          映像 Empty のとき 20% で魔法陣が点灯し、めくる度に揺れて薄くなる
最後の1枚  音 reply / coinCard（役が成立したとき）
3枚完了後  ランプ DRAW が gray（次ゲームへ）

━━ ボーナス ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
開始       光 ブラックアウト解除 ＋ 両 LED パネル onOff パルス（600 ms × 3）← bonusConfirmation
          映像 段位別のボーナス開始ムービー ＋ 音 bonusRegularOpen / bonusSuperOpen
SUPER      光 期間中ブラックアウト（50%）                           ← superBonusBlackout
SUPER MAX  光 ブラックアウトが次の DRAW まで持続。フリーズ ＋ 音 freeze
コレクション 役物 DRAW に KEEP OUT テープ。DRAW だけが出口
```

### 6.2 光りものの信号系統

```
cabinetSignalStore（状態機械）
├── memoryPulse  → .bcab-memboard（※現在未描画のため見えない）
├── lowerPulse   → .bcab-deck の LED 枠 on 画像
├── chanceSweep  → メモリーボードの掃き（※同上）
├── statueTone   → .bcab-mascot の発光色（white / blue / green / red / gold）
└── blackout     → fatal / super / superMax。super 系は全信号を抑制
```

ブラックアウトの優先順位：`super` / `superMax` は他のすべての信号を止めます。`fatal` はパネルを消すだけで、スタチューの色は残ります。

### 6.3 色と期待度の対応

| 色 | 変数 | 意味 |
|---|---|---|
| 白 | `--bcab-signal-white` | 弱い示唆・ガセ |
| 青 | `--bcab-signal-blue` | Chance 1 枚で最も出やすい |
| 緑 | `--bcab-signal-green` | 中位 |
| 赤 | `--bcab-signal-red` | Chance 2〜3 枚で最も出やすい |
| 金 | `--bcab-signal-gold` | 最上位（スタチュー専用） |

**重要**：PROJECT_BIBLE の「Slot Machine Philosophy」のとおり、強い色は**確定ではありません**。
演出で確率を変えてはいけません（`Do not change odds through presentation`）。

---

## 7. Blender 高品質版と three.js 軽量版の部品分け

### 7.1 命名規則（両版で共通にする）

```
CAB_<ベイ>_<部品>_<連番>

ベイ：SHELL / BEZEL / LCD / LBAY / RBAY / DECK / TRIM
例：
  CAB_SHELL_body
  CAB_LCD_bezel        CAB_LCD_panel      CAB_LCD_glass
  CAB_LBAY_dock_frame  CAB_LBAY_outlet    CAB_LBAY_outlet_lip
  CAB_RBAY_niche_floor CAB_RBAY_overhang  CAB_RBAY_tray
  CAB_DECK_table       CAB_DECK_led_L     CAB_DECK_led_R

動く部品は接尾辞 _mov、光る部品は _emi：
  CAB_RBAY_draw_cap_mov
  CAB_RBAY_auto_lever_mov
  CAB_RBAY_data_sign_mov
  CAB_RBAY_draw_ring_emi
  CAB_DECK_led_L_emi
```

### 7.2 トランスフォーム原点（**必ず両版で一致させる**）

| 部品 | 原点の位置 | 理由 |
|---|---|---|
| `draw_cap_mov` | ドーム底面の中心（ローカル Y = 0） | −Y に 2.5 mm 移動するだけで押下になる |
| `auto_lever_mov` | 軸の根元（台座上面） | Z 軸回転 ±26° だけで振れる |
| `data_sign_mov` | 看板の裏面中心 | 法線方向に 2 mm 移動するだけ |
| `niche_floor` | 床の回転中心 | 34° の傾きを 1 回転で再現 |
| `tank_shell` | 筒の中心 | カードの物理境界（半径 2.05 / 半高 2.675）と一致させる |
| `table` | 上端中央 | `translateY −82.5 px` の受け渡し行を保つ |

### 7.3 分割ルール

| 条件 | Blender 高品質版 | three.js 軽量版 |
|---|---|---|
| **動く** | 独立オブジェクト。実機どおりのクリアランスと内部機構も作る | **必ず独立オブジェクト**。親子は 1 段まで |
| **光る** | 実体の LED・導光板・拡散板を別オブジェクトで作る | 発光部は 1 枚のメッシュにまとめ、**発光マスクのアトラス**で表現。状態は uniform で切り替える |
| **材質が違う** | オブジェクトを分ける（金属・クリアプラ・乳白・フェルト・ガラス） | **マテリアルごとに join**。クリア / 加算ブレンドだけ別にして `renderOrder` を明示 |
| **動かず光らない** | 構造どおりに分ける（ネジ・パネルの合わせ目も） | 全部 join して 1 メッシュ。AO とディテールは**ベイク**で入れる |
| **内部・裏面** | 作る（将来のカット演出・リギング用） | **作らない**。カメラから見えない面は削除 |

### 7.4 ポリゴン・テクスチャ予算（提案）

| 対象 | Blender 高品質版 | three.js 軽量版 |
|---|---|---|
| シェル + ベゼル + 装飾 | サブディビジョン前提、ベベル実体 | ≤ 60 k tris、1 マテリアル |
| 右ベイ ニッチ（静止部） | 実体の金縁・ディフューザー | ≤ 20 k tris |
| DRAW ボタン キャップ | Lathe 220 分割のまま | ≤ 8 k tris（Lathe 64 分割相当） |
| AUTO レバー | 実体ねじ・軸受け | ≤ 4 k tris |
| DATA COUNTER 看板 | 箱・枠・拡散板を別に | ≤ 3 k tris |
| エアタンク | ガラス厚み・ノズル 16 個・ボルト | ≤ 6 k tris（ノズルは法線マップに落とす） |
| 下段テーブル | フェルトの織り・金枠 | 平面 + ベイク済みテクスチャ |
| **筐体合計** | 上限なし | **≤ 120 k tris / ≤ 12 ドローコール** |
| テクスチャ | 4K（albedo / normal / roughness / metal / AO / emissive） | 2048² アトラス。**albedo / ORM / normal / emissive の 4 枚** |

液晶の中身（Pixi）とカードのメッシュは、この予算の**外**です。

### 7.5 書き出しパイプライン

```
D:\asset-sources\gacha-app\blender\cabinet\       ← .blend 原本（Git 管理外）
  cabinet-master.blend                              高品質版（全部入り）
  cabinet-lowpoly.blend                             軽量版（デシメート + ベイク）

  ↓ glTF 2.0（.glb）／ meshopt 圧縮

public\models\cabinet\cabinet.v1.glb              ← Git 管理内
public\models\cabinet\cabinet-<部品>.v1.glb        ← 動く部品は分割して遅延読み込み
```

**Safari / iPhone 対応（AGENTS.md の方針）**

- テクスチャは **KTX2（Basis Universal）** か **WebP**。透過 WebM は使わない
- 連番アニメが必要な場合は WebP 連番 か WebP スプライトシート
- HEVC 透過動画は Windows で作れないので前提にしない

**キャッシュ対応（AGENTS.md の方針）**

- `public/` は本番で 1 年の immutable キャッシュ。**同名上書きは禁止**
- 差し替えるときは `cabinet.v2.glb` のようにファイル名を変え、コード側の参照も変える

### 7.6 移行の順番（提案）

1. **右ベイのニッチ**を Blender 版に置き換える（すでに three.js で完成しており、形も確定済み）
2. **左ベイ**（ドック + 排出口）— カードの受け渡し座標が `CabinetPlayerDock.geometry.ts` に確定している
3. **下段テーブル**— 現在は画像 1 枚なので、3D 化の効果が大きい
4. **シェル・ベゼル・装飾**— v8 の残骸（レール・コーナー・トリム）を復活させるかの判断が先
5. **エアタンク**— 採用するかの判断が先（未決 9.5）

---

## 8. 既存ビジュアルから読み取れたことの要約

- 筐体は **16:9 の 1920×1080 正面図 1 枚**として設計されている。奥行きの情報はどこにもない
- 液晶 **1250×618 px** と排出口 **256×100 px**、カード **132×198 px** が、唯一の「確定した実寸比」
- 右上の操作パネルは**すでに three.js で実機品質に作られている**（variant D）。ただし**開発環境のみ**
- 左ベイは、**エアタンク（役物）→ カードドック + 排出口**に置き換わった。エアタンクのコードと CSS 枠は残っているが動いていない
- v8 原典のレール・コーナー・トリム・メモリーボード・ディスク盤は、**CSS は残っているが描かれていない**
- 演出の時間はすべて定数化されている（セット 0/160/320/650 ms、放出 1080 ms / ずれ 90 ms、パルス 600/1000 ms）
- 光りものの確率は [cabinetSignalConfig.ts](lib/game-config/cabinetSignalConfig.ts) 1 ファイルに集約されている

---

## 9. 未決事項

モデリングに入る前にオーナーの判断が必要な点です。推測で埋めていません。

### 9.1 筐体の実寸と縦横比 ★最重要

現状は 1920×1080（16:9）。実機のパチスロ筐体は縦長（設置幅 580 mm、高さ 800 mm 超）で、**比率が合いません**。

- 16:9 のまま「ワイド筐体」として作るのか
- それとも実機比率の筐体を作り、今の 16:9 を「その正面の一部を切り出した画面」とみなすのか
- 後者の場合、今の 1920×1080 は筐体のどこからどこまでなのか

### 9.2 奥行きと側面・背面・脚

正面図しか無いため、以下がすべて未定です。

- 全体の奥行き（mm）
- 前面パネルの傾斜角（実機は手前に倒れている）
- 側面のデザイン（オーナー参考画像の「青い側面」は、ニッチの中の壁として実装済み。筐体の外装側面は未定）
- 背面・上面・脚・台座・下皿
- プレイヤーの視点高さと視距離（カメラの既定値）

### 9.3 液晶の仕様

- 1250×618 px は **2.02 : 1** で、標準パネル比ではありません。実機の 16:9 / 18:9 パネルに合わせるのか、そのままにするのか
- 物理サイズ（インチ）
- パネル種（液晶 / 有機 EL）、ベゼルの実際の幅
- 表面の処理（グレア / ノングレア）とガラスの厚み

### 9.4 可動役物（実機スロットの目玉）

**現状の筐体には、可動役物が 1 つもありません。** 必要なら新規設計です。

- 液晶の上や左右に可動役物を付けるのか
- 付けるなら、どの演出で動くのか（フェイタル確定 / ボーナス確定 / SUPER MAX など）
- 動き方（開く / 落ちる / 回る / 突き出す / 分割する）
- リール・スタートレバー・メダル投入口・精算ボタン・下皿を付けるのか（このゲームにメダルの概念が無いため、形だけの飾りにするのかも含めて）
- トップランプ / ドットマトリクスを付けるのか

### 9.5 エアタンクを採用するのか

`lib/air-tank-lab/` に完成した役物（ガラス筒・リングランプ・16 ノズル・渦の風の場・ガラス割れ）がありますが、**マウントされていません**。

- 3D 筐体で復活させるのか、廃止するのか
- 復活させるなら、左ベイのカードドックとどう両立するのか（同じ 276 px 幅のベイを取り合っている）
- ガラス割れとボーナス段位の対応（PROJECT_BIBLE は「no outcome-to-glass-crack mapping」と明記）

### 9.6 v8 の残骸を復活させるのか

- 金のレール 4 本、コーナー飾り 4 隅、上部トリム
- メモリーボード（左の基板パネル）— 光りもののコードは**今も信号を送っている**ので、復活させれば `memoryPulse` と `chanceSweep` がそのまま動きます
- ディスク盤（C 字の受け皿）— `BattleVfxOverlay.tsx:119` がまだ DOM を探しています
- `.bcab-react-led` / `.bcab-react-statue` / `.bcab-react-memboard` の 3 つのリアクション

### 9.7 3D ニッチの本番採用

- `DRAW_BUTTON_3D` は開発環境のみ。本番の見た目はまだ 2D 版です
- 本番採用の可否と、採用するなら FPS の目標値（未計測）
- 筐体全体を 3D にしたあと、ニッチは「筐体モデルの一部」にするのか「別の WebGL レイヤー」のままにするのか

### 9.8 ロゴ・ブランド表記

- `DESTINY WARS` — ニッチの奥壁（立体クローム）にあります。筐体の外装にも入れるのか、位置とサイズ
- メーカー名・型式名・各種認可表示のような「実機らしい小さな表記」を入れるのか
- フォント：現在 Cinzel（無い場合は Georgia に落ちる）。3D では実体の文字になるので、確定したフォントが必要

### 9.9 材質と仕上げ

- 外装の塗装（メタリック / パールのどちらか、梨地の粗さ）
- 金部分はメッキか塗装か（現在の `--gold #c9a24b` は 1 色のみ）
- 樹脂部分の色と透明度（現在のクリアプラは加算ブレンドで表現しており、物理的に正しくありません）
- フェルト（テーブル面）の織りの向きと毛足

### 9.10 照明

- 筐体を置く環境（パチンコホールの天井 / 単体の展示 / 無限遠の暗闇）
- ニッチは `preset "window"` を採用済み。筐体全体も同じ環境にするのか
- LED の実際の色温度と数（現在は意匠として配置されていて、実機の配列ではありません）

### 9.11 書き出しの前提

- three.js 軽量版のポリゴン予算（7.4 は提案値）と対象端末（iPhone の世代）
- モデルを 1 ファイルにするか、部品ごとに分けて遅延読み込みするか
- ライトマップ / AO をベイクするか、リアルタイムで計算するか
- `.blend` の置き場所（AGENTS.md に従えば `D:\asset-sources\gacha-app` で Git 管理外）の確認

---

## 付録：この文書の根拠

| 節 | 主な根拠 |
|---|---|
| 2.1 | `design-ref/battle-cabinet-v8.html`（CSS と body 構造） |
| 2.2 / 3 | `components/battle/BattleScreen.tsx:794-1137`、`app/globals.css:5846-9467` |
| 2.3 / 3.5 | `lib/button-3d/cabinetNiche.ts`、`lib/button-3d/runtime.ts:36-47,281-310`、`components/battle/cabinet/CabinetNiche3D.tsx:27-28` |
| 2.5 | CSS 側セレクタと TSX 側の参照を突き合わせた結果（grep で TSX からの参照なしを確認） |
| 3.4 | `components/battle/cabinet/CabinetPlayerDock.{tsx,module.css,geometry.ts}` |
| 3.6 | `lib/battle-pixi/presentation/cabinetTableGeometry.ts`、`app/globals.css:7128-7200` |
| 5 | `lib/air-tank-lab/{model,motion,cabinet-motion}.ts`、`lib/battle-pixi/presentation/cabinetTwoStepMotion.ts` |
| 6 | `lib/game-config/cabinetSignalConfig.ts`、`lib/battle-pixi/state/cabinetSignalStore.ts`、`components/battle/BattlePixiStage.tsx:1675,2097-2117,3810-3828,4023-4055`、`lib/audio/sfxStore.ts` |
| 6.1 / 8 | `PROJECT_BIBLE.md:83-94`（DRAW1/DRAW2 の時間とタンク未マウントの記述）、`PROJECT_BIBLE.md:135-182` |
| 7.5 | `AGENTS.md`（Safari 対応・immutable キャッシュ・原本素材の置き場所） |
| 9 | 上記のどこにも情報が無かった項目 |
