"use client";

/* eslint-disable @next/next/no-img-element -- Existing local artwork is used at its original aspect ratio for composition review. */
import { useState } from "react";
import Link from "next/link";
import styles from "./perspective.module.css";

const VIEWS = [
  { id: "diagonal", label: "A 斜め背中", title: "斜め背中 / 比較用の旧案", benefit: "味方の背中から敵へ、対角線で距離が伝わる。", caution: "比較用に保存。現在の本画面の基準はDの斜め正面。", source: "", href: "" },
  { id: "shoulder", label: "B 肩越し", title: "肩越しの接近 / 没入感", benefit: "手前の味方を大きく切り取り、中央奥の敵へ視線を集中。敵が動き出す緊張を作りやすい。", caution: "大きな翼や武器が敵を隠しやすい。UIは左右より上下へ逃がす。", source: "参考：Clair Obscur: Expedition 33 公式ギャラリー", href: "https://www.expedition33.com/" },
  { id: "arena", label: "C 俯瞰", title: "俯瞰アリーナ / 場の見やすさ", benefit: "双方を小さめに置き、円形の場を広く見せる。カードを置く場所や攻撃の軌跡が読みやすい。", caution: "キャラクターの表情が小さくなる。現素材では配置だけを確認し、本当の俯角は専用絵で合わせる。", source: "参考：バテン・カイトス 公式紹介のバトル画面", href: "https://www.nintendo.com/jp/topics/article/f31a65fb-ef46-4c0e-a278-e472b3d89478" },
  { id: "duel", label: "D 斜め正面（採用）", title: "斜め正面の対峙 / 採用案", benefit: "観客席から斜めに見る配置。味方の顔と装備、敵の全身を同時に見せる。キャラの魅力を優先するなら有力。", caution: "横一列に戻らないよう足元を前後にずらす。縦画面では上下の間隔が必要。", source: "参考：メタファー：リファンタジオ 公式バトル紹介", href: "https://rpg.jp/system/" },
  { id: "split", label: "E 上下分割", title: "上下カットイン / 比較用の旧案", benefit: "上に敵、下に味方の顔を大きく見せる。中央の境界へ視線が集まり、縦画面でも迫力を保ちやすい。", caution: "Dへ採用変更。上下分割は比較用として保存し、本画面には使用しない。", source: "参考：Persona 5 のカットイン画面", href: "https://www.pushsquare.com/news/2015/09/tgs_2015_persona_5s_ps4_ps3_delay_is_due_to_atlus_wanting_to_make_the_biggest_and_best_entry_yet" },
] as const;
type ViewId = typeof VIEWS[number]["id"];

function Composition({ view, portrait, fieldArt, small = false }: { view: ViewId; portrait: boolean; fieldArt: boolean; small?: boolean }) {
  const front = view === "duel" || view === "split";
  return (
    <div className={`${styles.field} ${styles[view]} ${portrait ? styles.portrait : ""} ${fieldArt ? styles.existing : ""} ${small ? styles.small : ""}`} role="img" aria-label={`${VIEWS.find(item => item.id === view)?.title}・${portrait ? "縦" : "横"}画面の仮配置`}>
      {!fieldArt && <div className={styles.ground} aria-hidden="true" />}
      <div className={styles.farPad} aria-hidden="true" />
      <div className={styles.nearPad} aria-hidden="true" />
      <div className={styles.enemy}><img src="/images/battle-characters/enemy-eight/idle/0000.png" alt="" draggable={false} /></div>
      <div className={styles.player}><img src={front ? "/images/battle-characters/young-knight/stand/052.webp" : "/images/battle-assets/character-angles/player-three-quarter/r4-young-knight-three-quarter.png"} alt="" draggable={false} /></div>
      <div className={styles.divider} aria-hidden="true" />
      <span className={styles.enemyLabel}>敵</span><span className={styles.playerLabel}>味方</span>
    </div>
  );
}

export default function BattlePerspectivePage() {
  const [portrait, setPortrait] = useState(false);
  const [fieldArt, setFieldArt] = useState(false);
  const [view, setView] = useState<ViewId>("duel");
  const [overview, setOverview] = useState(false);
  const current = VIEWS.find(item => item.id === view)!;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p className={styles.kicker}>COMPOSITION STUDY / D SELECTED</p><h1>斜め正面 / D採用</h1></div>
        <Link href="/battle">筐体へ戻る</Link>
      </header>
      <p className={styles.note}>味方の顔と敵の全身を斜め正面から見るDを採用。ほかの構図は比較用に保存しています。</p>
      <div className={styles.controls}>
        <button type="button" aria-pressed={!portrait} onClick={() => setPortrait(false)}>横画面</button>
        <button type="button" aria-pressed={portrait} onClick={() => setPortrait(true)}>縦画面</button>
        <label><input type="checkbox" checked={fieldArt} onChange={(event) => setFieldArt(event.target.checked)} />既存背景と比較</label>
        <label><input type="checkbox" checked={overview} onChange={(event) => setOverview(event.target.checked)} />5案を一覧</label>
      </div>
      <div className={styles.controls} role="group" aria-label="構図を選ぶ">
        {VIEWS.map(item => <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => { setView(item.id); setOverview(false); }}>{item.label}</button>)}
      </div>
      {overview ? <div className={styles.gallery}>{VIEWS.map(item => <article key={item.id} className={styles.option}>
        <h2>{item.title}</h2><Composition view={item.id} portrait={portrait} fieldArt={fieldArt} small />
        <p>{item.benefit}</p><p className={styles.caution}>注意：{item.caution}</p>
        <button type="button" onClick={() => { setView(item.id); setOverview(false); }}>{item.label}を大きく見る</button>
      </article>)}</div> : <>
        <Composition view={view} portrait={portrait} fieldArt={fieldArt} />
        <section className={styles.description} aria-live="polite"><h2>{current.title}</h2><p>{current.benefit}</p><p className={styles.caution}>注意：{current.caution}</p>
          {current.href && <a href={current.href} target="_blank" rel="noreferrer">{current.source} ↗</a>}
        </section>
      </>}
      <p className={styles.note}>Dの採用を反映した確認画面です。キャラクターの切り取りは仮置きで、既存ゲームの画面をそのまま再現したものではありません。</p>
    </main>
  );
}
