"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import FatalBand from "./FatalBand";
import FatalMovieFrame from "./FatalMovieFrame";
import styles from "./FatalFxWorkstation.module.css";
import { DEFAULT_FATAL_FX, DEFAULT_FREEZE, type FreezeSettings } from "./fatalFxSettings";

const STAGE_W = 1250;
const STAGE_H = 618;
const STORAGE_KEY = "fatalFreezeWorkstation.v1";

const MOVIES = [
  { label: "R1 1本目", src: "/videos/battle-assets/fatal-attack/r1a1.v1.mp4" },
  { label: "R1 2本目", src: "/videos/battle-assets/fatal-attack/r1a2.v2.mp4" },
];

type NumKey = { [K in keyof FreezeSettings]: FreezeSettings[K] extends number ? K : never }[keyof FreezeSettings];
type Slider = { key: NumKey; label: string; min: number; max: number; step: number };

const GROUPS: { title: string; sliders: Slider[] }[] = [
  {
    title: "ズーム（カメラの寄り引き）",
    sliders: [
      { key: "zoomMin", label: "引いたときの大きさ", min: 1, max: 1.3, step: 0.005 },
      { key: "zoomMax", label: "寄ったときの大きさ", min: 1, max: 1.4, step: 0.005 },
      { key: "zoomMs", label: "1往復の片道（ミリ秒）", min: 60, max: 2000, step: 10 },
      { key: "shakePx", label: "横ゆれ（px）", min: 0, max: 20, step: 0.5 },
    ],
  },
  {
    title: "集中線",
    sliders: [
      { key: "linesOpacity", label: "濃さ", min: 0, max: 1, step: 0.05 },
      { key: "linesPeriodDeg", label: "間隔（小さいほど本数が多い）", min: 2, max: 30, step: 0.5 },
      { key: "linesWidthDeg", label: "1本の太さ", min: 0.1, max: 4, step: 0.05 },
      { key: "linesInnerPct", label: "中央の空き（%）", min: 0, max: 60, step: 1 },
      { key: "linesFlickerMs", label: "ちらつきの周期（ミリ秒）", min: 60, max: 1500, step: 10 },
    ],
  },
  {
    title: "ぼかしと周辺の暗さ",
    sliders: [
      { key: "blurPx", label: "ぼかしの強さ（px）", min: 0, max: 30, step: 0.5 },
      { key: "blurInnerPct", label: "くっきり残す中央の広さ（%）", min: 0, max: 80, step: 1 },
      { key: "vignette", label: "周辺の暗さ", min: 0, max: 1, step: 0.05 },
      { key: "fadeMs", label: "演出が入る速さ（ミリ秒）", min: 0, max: 1500, step: 10 },
    ],
  },
];

export default function FatalFreezeWorkstation() {
  const [settings, setSettings] = useState<FreezeSettings>(DEFAULT_FREEZE);
  const [loaded, setLoaded] = useState(false);
  const [movie, setMovie] = useState(MOVIES[0].src);
  const [frozen, setFrozen] = useState(true);
  const [showBand, setShowBand] = useState(true);
  const [scale, setScale] = useState(0.6);
  const [copied, setCopied] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULT_FREEZE, ...JSON.parse(raw) });
    } catch { /* storage unavailable: keep defaults */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings, loaded]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setScale(frame.clientWidth / STAGE_W);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Park the movie on its final frame, which is what the hold is seen over.
  const parkOnLastFrame = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.pause();
    video.currentTime = Math.max(0, video.duration - 0.03);
    setFrozen(true);
  };

  // The metadata event can fire before React has attached its handler (first
  // load, cached file), so also park once the element is already ready.
  useEffect(() => {
    if ((videoRef.current?.readyState ?? 0) >= 1) parkOnLastFrame();
  }, [movie]);

  // Play the closing seconds so the hand-off into the hold can be judged.
  const playIntoHold = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    setFrozen(false);
    video.muted = true;
    video.currentTime = Math.max(0, video.duration - seconds);
    void video.play().catch(() => setFrozen(true));
  };

  const copySettings = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked */ }
  };

  return (
    <main className={styles.page}>
      <section className={styles.stageColumn}>
        <header className={styles.header}>
          <h1>停止演出ワークステーション</h1>
          <p>ムービーの尺が尽きたあと、最終フレームで止まっている間の演出。ここでの調整はこのブラウザに保存され、バトル本体にはまだ反映されません。</p>
        </header>

        <div ref={frameRef} className={styles.frame} style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}>
          <div className={styles.stage} style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, background: "#000" }}>
            <FatalMovieFrame
              key={movie}
              src={movie}
              settings={settings}
              frozen={frozen}
              videoRef={videoRef}
              onLoadedMetadata={parkOnLastFrame}
              onEnded={() => setFrozen(true)}
            />
            {showBand && <FatalBand settings={DEFAULT_FATAL_FX.band} zIndex={9996} />}
          </div>
        </div>

        <div className={styles.transport}>
          <button type="button" className={styles.playButton} data-tier="blue" onClick={() => playIntoHold(2)}>
            最後の2秒から再生
          </button>
          <button type="button" className={styles.playButton} data-tier="red" onClick={() => playIntoHold(999)}>
            最初から再生
          </button>
          <button type="button" className={styles.playButton} data-tier="gold" onClick={parkOnLastFrame}>
            最終フレームで止める
          </button>
          <label className={styles.check}>
            <input type="checkbox" checked={frozen} onChange={(event) => setFrozen(event.target.checked)} />
            停止演出を表示
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={showBand} onChange={(event) => setShowBand(event.target.checked)} />
            帯を重ねる
          </label>
          <label className={styles.check}>
            ムービー
            <select value={movie} onChange={(event) => { setFrozen(true); setMovie(event.target.value); }}>
              {MOVIES.map((item) => <option key={item.src} value={item.src}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <aside className={styles.panel}>
        <div className={styles.panelActions}>
          <button type="button" onClick={copySettings}>{copied ? "コピーしました" : "設定をコピー"}</button>
          <button type="button" onClick={() => setSettings(DEFAULT_FREEZE)}>初期値に戻す</button>
        </div>

        {GROUPS.map((group) => (
          <details className={styles.group} key={group.title} open>
            <summary>{group.title}</summary>
            {group.title === "集中線" && (
              <div className={styles.colors}>
                <label>
                  <input
                    type="color"
                    value={settings.linesColor}
                    onChange={(event) => setSettings((prev) => ({ ...prev, linesColor: event.target.value }))}
                  />
                  線の色
                </label>
              </div>
            )}
            {group.sliders.map((slider) => (
              <label className={styles.row} key={slider.key}>
                <span className={styles.rowLabel}>{slider.label}</span>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={settings[slider.key]}
                  onChange={(event) => setSettings((prev) => ({ ...prev, [slider.key]: Number(event.target.value) }))}
                />
                <output className={styles.rowValue}>{settings[slider.key]}</output>
              </label>
            ))}
          </details>
        ))}
      </aside>
    </main>
  );
}
