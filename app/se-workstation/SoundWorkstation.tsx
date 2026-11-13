"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { auditionSfx, playTripleChanceSurgeSfx, unlockSfx } from "@/lib/audio/sfxStore";
import { TWO_STEP_DEAL_MS } from "@/lib/battle-pixi/presentation/cabinetTwoStepMotion";
import { CABINET_PRESENT_REVEAL_MS } from "@/lib/battle-pixi/presentation/cabinetManualReveal";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";
import { cueFile, cues, gachaVideos, type Category, type Cue } from "./catalog";
import styles from "./workstation.module.css";

const categories = ["すべて", "筐体・カード", "バトル演出", "ボーナス", "ガチャ"] as const;
const beats = [
  { label: "DRAW 1", action: "カードをセット", ids: ["buttonPush", "cardSetToDisk"], duration: 850 },
  { label: "DRAW 2", action: "カードを排出", ids: ["buttonPush", "drawCard"], duration: TWO_STEP_DEAL_MS + 220 },
  { label: "めくり", action: "カードをクリック", ids: ["cardReveal"], duration: CABINET_PRESENT_REVEAL_MS },
  { label: "着地", action: "Chanceが台に収まる", ids: ["cardPlaced", "chanceCardLand"], duration: 0 },
] as const;

export default function SoundWorkstation() {
  const [category, setCategory] = useState<Category | "すべて">("すべて");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<Cue["id"]>("buttonPush");
  const [activeBeat, setActiveBeat] = useState<number | null>(null);
  const [playing, setPlaying] = useState("");
  const [error, setError] = useState("");
  const [gachaVideo, setGachaVideo] = useState(gachaVideos[0].file);
  const playback = useRef<AbortController | null>(null);
  const sceneVideo = useRef<HTMLVideoElement>(null);
  const gachaPlayer = useRef<HTMLVideoElement>(null);
  const sceneStart = useRef<(() => void) | null>(null);

  useEffect(() => () => playback.current?.abort(), []);

  const query = search.trim().toLowerCase();
  const filtered = cues.filter((cue) => (
    (category === "すべて" || cue.category === category) &&
    [cue.title, cue.timing, cue.detail, cue.id, cueFile(cue.id)].join(" ").toLowerCase().includes(query)
  ));
  const selected = cues.find((cue) => cue.id === selectedId)!;

  function stopPlayback() {
    playback.current?.abort();
    sceneStart.current = null;
    sceneVideo.current?.pause();
    gachaPlayer.current?.pause();
    setActiveBeat(null);
    setPlaying("");
    setError("");
  }

  function begin(label: string) {
    stopPlayback();
    const controller = new AbortController();
    playback.current = controller;
    setPlaying(label);
    return controller.signal;
  }

  async function playCue(cue: Cue, signal: AbortSignal) {
    try {
      if (cue.id === "tripleSurge") {
        playTripleChanceSurgeSfx(signal);
      } else if (cue.id === "handShuffle" || cue.id === "oldReveal") {
        const audio = new Audio(cueFile(cue.id));
        audio.volume = cue.volume ?? 1;
        const stop = () => audio.pause();
        signal.addEventListener("abort", stop, { once: true });
        audio.addEventListener("ended", () => signal.removeEventListener("abort", stop), { once: true });
        await audio.play();
      } else {
        await auditionSfx(cue.id, cue.volume ?? 1, signal);
      }
    } catch {
      if (!signal.aborted) setError(`「${cue.title}」を再生できませんでした。`);
    }
  }

  function playScene() {
    const video = sceneVideo.current;
    if (!video) return;
    const signal = begin(selected.title);
    unlockSfx();
    video.currentTime = 0;
    sceneStart.current = () => void playCue(selected, signal);
    void video.play().catch(() => {
      if (!signal.aborted) setError("演出動画を再生できませんでした。");
    });
  }

  function playTimeline(start?: number) {
    const signal = begin(start === undefined ? "DRAWから着地まで" : beats[start].action);
    unlockSfx();
    let elapsed = 0;
    const steps = start === undefined ? beats.map((_, index) => index) : [start];
    for (const index of steps) {
      const beat = beats[index];
      const trigger = () => {
        setActiveBeat(index);
        for (const id of beat.ids) {
          const cue = cues.find((entry) => entry.id === id)!;
          void playCue(cue, signal);
        }
      };
      if (elapsed === 0) trigger();
      else {
        const timer = window.setTimeout(trigger, elapsed);
        signal.addEventListener("abort", () => window.clearTimeout(timer), { once: true });
      }
      elapsed += beat.duration;
    }
  }

  return (
    <main className={styles.page} lang="ja">
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>SEワークステーション</h1>
          <p>Gacha Battleの効果音を聴き、どの場面で鳴るか確認する。</p>
        </header>

        <section className={styles.panel} aria-labelledby="timeline-heading">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="timeline-heading">DRAWからカード着地まで</h2>
              <p>発音順の簡易プレビュー。Chanceカード1枚の例。</p>
            </div>
            <button type="button" className={styles.primary} onClick={() => playTimeline()}>▶ 流れを再生</button>
          </div>
          <div className={styles.timeline}>
            {beats.map((beat, index) => (
              <button type="button" key={beat.label} className={styles.beat} data-active={activeBeat === index} onClick={() => playTimeline(index)}>
                <span className={styles.cardVisual} aria-hidden="true">
                  <Image src={index < 3 ? PLAYER_CARD_BACK_IMAGE : "/images/battle-symbols/soft-edge/chance.webp"} alt="" width={55} height={78} unoptimized />
                </span>
                <strong>{beat.label}</strong>
                <span>{beat.action}</span>
              </button>
            ))}
          </div>
          <div className={styles.transport}>
            <button type="button" className={styles.secondary} onClick={stopPlayback}>■ 停止</button>
            <span role="status">{error || (playing ? `試聴対象　${playing}` : "")}</span>
          </div>
        </section>

        <section className={styles.browser} aria-label="SEカタログ">
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>SE一覧</h2><span>{filtered.length} / {cues.length}項目</span>
            </div>
            <label className={styles.search}>効果音を検索
              <input type="search" placeholder="例：着地、Chance、ファイル名" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <div className={styles.filters} aria-label="場面で絞り込み">
              {categories.map((item) => (
                <button type="button" key={item} className={styles.secondary} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
              ))}
            </div>
            <ul className={styles.results}>
              {filtered.map((cue) => (
                <li key={cue.id}>
                  <button type="button" className={styles.result} aria-pressed={selected.id === cue.id} onClick={() => { stopPlayback(); setSelectedId(cue.id); }}>
                    <span>{cue.title}</span><small>{cue.status ?? cue.category}</small>
                  </button>
                </li>
              ))}
            </ul>
            {filtered.length === 0 && <p>該当するSEがありません。</p>}
          </div>

          <div className={styles.panel} key={selected.id}>
            <div className={styles.panelHeader}>
              <h2>{selected.title}</h2><span>{selected.status ?? selected.category}</span>
            </div>
            <p className={styles.timing}>{selected.timing}</p>
            {selected.detail && <p>{selected.detail}</p>}
            <p className={styles.file}>{cueFile(selected.id) ?? "ゲーム内で合成"}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => void playCue(selected, begin(selected.title))}>▶ SEだけ試聴</button>
              {selected.video && <button type="button" className={styles.secondary} onClick={playScene}>▶ 映像＋SE</button>}
              <button type="button" className={styles.secondary} onClick={stopPlayback}>■ 停止</button>
            </div>
            {error && <p role="alert">{error}</p>}
            {selected.video && (
              <video ref={sceneVideo} className={styles.video} src={selected.video} muted playsInline preload="metadata" aria-label={selected.title} onPlaying={() => {
                sceneStart.current?.();
                sceneStart.current = null;
              }} />
            )}
            {selected.reference && <p><a href={selected.reference.href} target="_blank" rel="noreferrer">{selected.reference.label} ↗</a></p>}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="video-heading">
          <div className={styles.panelHeader}><h2 id="video-heading">ガチャ演出の動画音声</h2></div>
          <p>ガチャの抽選演出は動画内の音声をそのまま再生する。</p>
          <div className={styles.actions}>
            <label className={styles.search}>演出を選択
              <select value={gachaVideo} onChange={(event) => { stopPlayback(); setGachaVideo(event.target.value); }}>
                {gachaVideos.map((video) => <option key={video.file} value={video.file}>{video.title}</option>)}
              </select>
            </label>
          </div>
          <video key={gachaVideo} ref={gachaPlayer} className={styles.video} src={gachaVideo} controls playsInline preload="metadata" aria-label="ガチャ演出動画" onPlay={() => {
            playback.current?.abort();
            sceneStart.current = null;
            sceneVideo.current?.pause();
            setActiveBeat(null);
            setPlaying("ガチャ演出動画");
          }} />
        </section>
      </div>
    </main>
  );
}
