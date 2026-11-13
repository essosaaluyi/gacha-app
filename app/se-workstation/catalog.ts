import { SFX, type SfxName } from "@/lib/audio/sfxStore";

export type CueId = SfxName | "tripleSurge" | "handShuffle" | "oldReveal";
export type Category = "筐体・カード" | "バトル演出" | "ボーナス" | "ガチャ";

export type Cue = {
  id: CueId;
  title: string;
  category: Category;
  timing: string;
  detail?: string;
  status?: "条件付き" | "未使用";
  video?: string;
  reference?: { href: string; label: string };
  volume?: number;
};

const cabinet = { href: "/battle?fatal-preview=safe-clear&dock-preview=true", label: "筐体の操作プレビュー" };
const cutIn = { href: "/cut-in-workstation", label: "カットインをSE付きで再生" };
const fakeout = { href: "/attack-fakeout-workstation", label: "テキスト演出のワークステーション" };

export const cues: Cue[] = [
  { id: "buttonPush", title: "DRAW・操作ボタン", category: "筐体・カード", timing: "DRAWを押した瞬間。音声開始、QUIT、終了確認の選択でも鳴る。", reference: cabinet },
  { id: "cardSetToDisk", title: "裏向きカードのセット", category: "筐体・カード", timing: "1回目のDRAW。抽選確定時と、1枚目を排出口にセットする時に呼び出される。", detail: "現行の通常筐体には近接する2つの呼び出しがある。素材の先頭0.30秒をスキップ。", reference: cabinet },
  { id: "drawCard", title: "カードの排出", category: "筐体・カード", timing: "2回目のDRAW。排出口から3枚が動き出す瞬間。", reference: cabinet },
  { id: "cardReveal", title: "カードのめくり", category: "筐体・カード", timing: "裏向きのカードをクリックして、めくり始める瞬間。", detail: "COLLECTIONのめくりにも呼び出しはあるが、モードの制限で発音しない。", reference: cabinet },
  { id: "cardPlaced", title: "カードが台に着地", category: "筐体・カード", timing: "カードが表を向いてテーブルに収まった瞬間。AttackがTARGETに入る場合もこの着地音。", reference: cabinet },
  { id: "chanceCardLand", title: "Chanceカードの着地", category: "筐体・カード", timing: "Chanceがテーブルに収まった瞬間。通常のカード着地音と同時。", status: "条件付き" },
  { id: "reply", title: "Reply成立", category: "筐体・カード", timing: "Replyの手で3枚目のめくりを開始した瞬間。", detail: "素材の先頭0.70秒をスキップ。COLLECTIONの追加ピックではモードの制限で発音しない。", status: "条件付き" },
  { id: "coinCard", title: "Coin成立", category: "筐体・カード", timing: "Coinの手で3枚目のめくりを開始した瞬間。", detail: "COLLECTIONの得点カードにも呼び出しはあるが、モードの制限で発音しない。", status: "条件付き" },
  { id: "discard", title: "古いカードの退場音", category: "筐体・カード", timing: "2回目のDRAW。セット済みのカードが排出口から浮き上がる間に、排出音と重ねて1回鳴る。", detail: "従来の描画経路では、旧カードの退場時に120ms間隔で鳴る。", reference: cabinet },
  { id: "attackOnTarget", title: "Attack専用の着地音（候補）", category: "筐体・カード", timing: "音源登録のみ。現行のAttack着地では通常のカード着地音が鳴る。", status: "未使用" },
  { id: "oldReveal", title: "旧めくり音ファイル", category: "筐体・カード", timing: "ファイルのみ。現行のめくり音は card-flip-only.v1.wav。", status: "未使用" },
  { id: "battleOpening", title: "バトル開始ムービー", category: "バトル演出", timing: "オープニングが画面に出る時。動画の音声はミュート。", video: "/videos/openings/battle-opening.v2.mp4" },
  { id: "roundInsert", title: "ROUND表示", category: "バトル演出", timing: "ラウンド紹介のバナーが出た瞬間。", detail: "COLLECTION終了にも遅延呼び出しがある。COLLECTIONのモード中は発音しない。", reference: cabinet },
  { id: "characterSummon", title: "キャラクター召喚", category: "バトル演出", timing: "敵・味方のキャラクター召喚が始まる時に、従来のカードリビールSEを鳴らす。", reference: cabinet },
  { id: "fatalModeInsert", title: "プレイヤー FATAL MODE 開始", category: "バトル演出", timing: "プレイヤー側のFATAL MODE開始の全画面インサートが有効になった時。", reference: { href: "/battle?fatal-preview=safe-clear&player-fatal-mode-opening-insert=once", label: "FATAL MODE開始プレビュー" } },
  { id: "vibration", title: "敵撃破の振動予告", category: "バトル演出", timing: "敵撃破が決まっているDRAWの抽選確定時に、25%で鳴る。", detail: "BAR CHANCEの衝撃音も同じ素材を使用。", status: "条件付き" },
  { id: "chanceUpDraw", title: "Chanceの排出予告", category: "バトル演出", timing: "Chanceを含む手で60%の条件を満たした時。現行筐体では、排出モーション後のカード公開準備に入る時に鳴る。", status: "条件付き" },
  { id: "chanceIcon", title: "CHANCEアイコン・テンパイ表示", category: "バトル演出", timing: "Chance／テンパイのアイコン、または煽り中のCHANCE表示が出た瞬間。", detail: "COLLECTIONの倍率カードではモードの制限で発音しない。", status: "条件付き" },
  { id: "tableShine", title: "テーブルの光の走り", category: "バトル演出", timing: "BAR CHANCE以外で、3枚が同じ図柄またはChanceを含む手が揃った時。演出開始の500ms後に光のスイープと同時。", status: "条件付き" },
  { id: "tripleSurge", title: "TRIPLE CHANCEの電撃", category: "バトル演出", timing: "Chanceが3枚揃い、テーブル枠の電撃エフェクトが始まる瞬間。", detail: "ノイズと低音をゲーム内で合成するため、素材ファイルはない。", status: "条件付き" },
  { id: "textInsertFakeout", title: "攻撃煽りのセリフ表示", category: "バトル演出", timing: "攻撃煽りの新しいセリフを表示する時。プレイヤー側・敵側の両方。", reference: fakeout },
  { id: "pointsGained", title: "通常バトルのChance報酬", category: "バトル演出", timing: "Chance報酬を得て、ポイントの演出が画面に出る瞬間。", detail: "COLLECTIONのCOLLECTカードではモードの制限で発音しない。" },
  { id: "barImpact", title: "BAR CHANCEの着地衝撃", category: "ボーナス", timing: "BAR CHANCEでEmpty以外が着地して、画面が揺れる瞬間。", detail: "1枚目0.78倍、2枚目0.95倍、成功時の3枚目1.20倍。単体試聴は1枚目。", volume: 0.78, status: "条件付き" },
  { id: "bonusRegularOpen", title: "REGULAR BONUS 開始", category: "ボーナス", timing: "REGULARの開始映像が出た瞬間。SUPER MAXがこの映像から始まる場合も同じ。", video: "/videos/openings/bonus-regular.mp4" },
  { id: "bonusSuperOpen", title: "SUPER BONUS 開始", category: "ボーナス", timing: "SUPERの開始映像が出た瞬間。SUPER MAXがこの映像から始まる場合も同じ。", video: "/videos/openings/bonus-super.mp4" },
  { id: "freeze", title: "ボーナスのフリーズ", category: "ボーナス", timing: "SUPER MAXへの昇格で、開始映像がフリーズ映像に切り替わる時。BAR CHANCE側にも呼び出しがあり、ボーナスモードの時だけ発音する。", video: "/videos/openings/freeze.mp4", status: "条件付き" },
  { id: "cutIn", title: "割り込みカットイン", category: "ボーナス", timing: "ポイント演出へ入る前に、画面を割るカットインが開いた瞬間。", reference: cutIn },
  { id: "chestOpenPoint", title: "宝箱・ポイント公開", category: "ボーナス", timing: "ボーナスのポイント公開映像が出た時。動画の音声はミュート。", detail: "映像プレビューは100ptの例。", video: "/videos/bonus-reveals/100.mp4" },
  { id: "stageName", title: "COLLECTION盤面の登場", category: "ボーナス", timing: "初回のCOLLECTION盤面を配る時。バトルからCOLLECTIONにモードが切り替わる直前に鳴る。", detail: "すでにCOLLECTIONのモードで配り直す場合は抑止される。" },
  { id: "handShuffle", title: "バトル前の手札シャッフル", category: "ガチャ", timing: "ガチャ結果から進むBattle Handで、Shuffle? (1) を押した瞬間。", volume: 0.85 },
];

export function cueFile(id: CueId): string | undefined {
  if (id === "tripleSurge") return undefined;
  if (id === "handShuffle") return "/audio/card-flip-se.wav";
  if (id === "oldReveal") return "/audio/se/card-reveal-se.mp3";
  return SFX[id];
}

export const gachaVideos = [
  { title: "STANDARD", file: "/videos/standard.v2.mp4" },
  { title: "STANDARD 2", file: "/videos/standard2.v2.mp4" },
  { title: "SSR", file: "/videos/SSR.v2.mp4" },
  { title: "UR 1", file: "/videos/gacha-reveal-UR1.v2.mp4" },
  { title: "UR 2", file: "/videos/gacha-reveal-UR2.v2.mp4" },
  { title: "フリーズ", file: "/videos/freeze.mp4" },
];
