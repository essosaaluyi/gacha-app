"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import FatalBand from "./FatalBand";
import FatalCutIn from "./FatalCutIn";
import styles from "./FatalFxWorkstation.module.css";
import {
  DEFAULT_FATAL_FX,
  TIER_LABEL,
  mergeFatalFx,
  type BandSettings,
  type CutInSettings,
  type FatalFxSettings,
  type FatalTier,
  type TierColors,
} from "./fatalFxSettings";

const STAGE_W = 1250;
const STAGE_H = 618;
const STORAGE_KEY = "fatalFxWorkstation.v1";
const TIERS: FatalTier[] = ["blue", "red", "gold"];

const BACKDROPS = {
  battle: { label: "バトル背景", style: { background: "#0b0d18 url(/images/battle-assets/stage-day-field-cabinet.v3.webp) center / cover no-repeat" } },
  dark: { label: "暗い画面", style: { background: "radial-gradient(circle at 50% 40%, #1b2340, #05060c 70%)" } },
  black: { label: "黒", style: { background: "#000" } },
} as const;
type BackdropKey = keyof typeof BACKDROPS;

type NumKey<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T];
type Slider<T> = { key: NumKey<T>; label: string; min: number; max: number; step: number };

const CUTIN_GROUPS: { title: string; sliders: Slider<CutInSettings>[] }[] = [
  {
    title: "カットインの形と時間",
    sliders: [
      { key: "tiltDeg", label: "傾き（度）", min: -30, max: 30, step: 0.5 },
      { key: "heightPct", label: "太さ（%）", min: 10, max: 80, step: 1 },
      { key: "centerYPct", label: "上下の位置（%）", min: 10, max: 90, step: 1 },
      { key: "durationMs", label: "全体の長さ（ミリ秒）", min: 600, max: 4000, step: 50 },
      { key: "dim", label: "周りの暗さ", min: 0, max: 1, step: 0.05 },
      { key: "flash", label: "開いた瞬間の光", min: 0, max: 1, step: 0.05 },
      { key: "edgeWidth", label: "縁の線の太さ", min: 0, max: 16, step: 0.5 },
    ],
  },
  {
    title: "雷",
    sliders: [
      { key: "boltCount", label: "縁を走る本数", min: 0, max: 40, step: 1 },
      { key: "boltLength", label: "1本の長さ", min: 40, max: 1200, step: 10 },
      { key: "boltSpread", label: "縁からの広がり", min: 0, max: 80, step: 1 },
      { key: "boltCrossCount", label: "横切る本数", min: 0, max: 8, step: 1 },
      { key: "boltJag", label: "ギザギザの強さ", min: 0.05, max: 1.2, step: 0.05 },
      { key: "boltWidth", label: "太さ", min: 0.5, max: 8, step: 0.1 },
      { key: "boltGlow", label: "光のにじみ", min: 0, max: 50, step: 1 },
      { key: "boltFlickerMs", label: "ちらつきの間隔（ミリ秒）", min: 20, max: 300, step: 5 },
      { key: "boltBranch", label: "枝分かれの出やすさ", min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    title: "流れる線",
    sliders: [
      { key: "lineCount", label: "本数", min: 0, max: 80, step: 1 },
      { key: "lineSpeed", label: "速さ", min: 0.1, max: 4, step: 0.1 },
      { key: "lineOpacity", label: "濃さ", min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    title: "絵",
    sliders: [
      { key: "imageZoom", label: "拡大", min: 0.5, max: 5, step: 0.05 },
      { key: "imageOffsetX", label: "左右の位置（%）", min: -60, max: 60, step: 0.5 },
      { key: "imageOffsetY", label: "上下の位置（%）", min: -50, max: 50, step: 0.5 },
      { key: "imageDrift", label: "横すべりの量（%）", min: -30, max: 30, step: 0.5 },
      { key: "imageTint", label: "色の乗せ具合", min: 0, max: 1, step: 0.05 },
    ],
  },
];

const BAND_SLIDERS: Slider<BandSettings>[] = [
  { key: "heightPct", label: "帯の太さ（%）", min: 3, max: 16, step: 0.5 },
  { key: "insetPct", label: "端からの距離（%）", min: 0, max: 30, step: 0.5 },
  { key: "fontPct", label: "文字の大きさ（%）", min: 30, max: 95, step: 1 },
  { key: "speedPct", label: "流れる速さ", min: 1, max: 40, step: 0.5 },
  { key: "gapEm", label: "文字の間隔", min: 0.2, max: 5, step: 0.1 },
  { key: "tiltDeg", label: "帯の傾き（度）", min: -20, max: 20, step: 0.5 },
  { key: "depthDeg", label: "奥行きの傾き・左右（度）", min: -60, max: 60, step: 1 },
  { key: "pitchDeg", label: "奥行きの傾き・上下（度）", min: -60, max: 60, step: 1 },
  { key: "perspective", label: "遠近の強さ", min: 0.2, max: 3, step: 0.05 },
  { key: "skewDeg", label: "文字の傾き（度）", min: -30, max: 30, step: 1 },
  { key: "opacity", label: "帯の濃さ", min: 0.2, max: 1, step: 0.02 },
  { key: "glow", label: "光り方", min: 0, max: 2, step: 0.05 },
];

const BAND_COLORS: { key: "bgColor" | "edgeColor" | "textColor" | "glowColor"; label: string }[] = [
  { key: "bgColor", label: "帯" },
  { key: "edgeColor", label: "縁" },
  { key: "textColor", label: "文字" },
  { key: "glowColor", label: "光" },
];

const TIER_COLOR_FIELDS: { key: "main" | "glow" | "bolt"; label: string }[] = [
  { key: "main", label: "地の色" },
  { key: "glow", label: "光" },
  { key: "bolt", label: "雷の芯" },
];

function SliderRow<T>({ slider, value, onChange }: { slider: Slider<T>; value: number; onChange: (v: number) => void }) {
  return (
    <label className={styles.row}>
      <span className={styles.rowLabel}>{slider.label}</span>
      <input
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output className={styles.rowValue}>{value}</output>
    </label>
  );
}

export default function FatalFxWorkstation() {
  const [fx, setFx] = useState<FatalFxSettings>(DEFAULT_FATAL_FX);
  const [loaded, setLoaded] = useState(false);
  const [tier, setTier] = useState<FatalTier>("blue");
  const [playKey, setPlayKey] = useState(0);
  const [hold, setHold] = useState(true);
  const [backdrop, setBackdrop] = useState<BackdropKey>("battle");
  const [scale, setScale] = useState(0.6);
  const [copied, setCopied] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  // Stored values are read after mount so the first render matches the server.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setFx(mergeFatalFx(JSON.parse(raw)));
    } catch { /* storage unavailable: keep defaults */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fx)); } catch { /* ignore */ }
  }, [fx, loaded]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setScale(frame.clientWidth / STAGE_W);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const setCutIn = <K extends keyof CutInSettings>(key: K, value: CutInSettings[K]) =>
    setFx((prev) => ({ ...prev, cutIn: { ...prev.cutIn, [key]: value } }));
  const setBand = <K extends keyof BandSettings>(key: K, value: BandSettings[K]) =>
    setFx((prev) => ({ ...prev, band: { ...prev.band, [key]: value } }));
  const setTierColor = <K extends keyof TierColors>(key: K, value: TierColors[K]) =>
    setFx((prev) => ({
      ...prev,
      cutIn: { ...prev.cutIn, colors: { ...prev.cutIn.colors, [tier]: { ...prev.cutIn.colors[tier], [key]: value } } },
    }));

  const play = (next: FatalTier) => { setTier(next); setPlayKey((key) => key + 1); };

  const copySettings = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(fx, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked */ }
  };

  return (
    <main className={styles.page}>
      <section className={styles.stageColumn}>
        <header className={styles.header}>
          <h1>フェイタルモード演出ワークステーション</h1>
          <p>帯と期待度カットインの試作。ここでの調整はこのブラウザに保存され、バトル本体にはまだ反映されません。</p>
        </header>

        <div ref={frameRef} className={styles.frame} style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}>
          <div
            className={styles.stage}
            style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, ...BACKDROPS[backdrop].style }}
          >
            <FatalBand settings={fx.band} />
            <FatalCutIn settings={fx.cutIn} tier={tier} playKey={playKey} hold={hold} />
          </div>
        </div>

        <div className={styles.transport}>
          {TIERS.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.playButton}
              data-tier={item}
              data-active={tier === item && playKey > 0}
              onClick={() => play(item)}
            >
              {TIER_LABEL[item]}を再生
            </button>
          ))}
          <label className={styles.check}>
            <input type="checkbox" checked={hold} onChange={(event) => setHold(event.target.checked)} />
            開いたまま止める（調整用）
          </label>
          <label className={styles.check}>
            背景
            <select value={backdrop} onChange={(event) => setBackdrop(event.target.value as BackdropKey)}>
              {(Object.keys(BACKDROPS) as BackdropKey[]).map((key) => (
                <option key={key} value={key}>{BACKDROPS[key].label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <aside className={styles.panel}>
        <div className={styles.panelActions}>
          <button type="button" onClick={copySettings}>{copied ? "コピーしました" : "設定をコピー"}</button>
          <button type="button" onClick={() => setFx(DEFAULT_FATAL_FX)}>初期値に戻す</button>
        </div>

        <details className={styles.group} open>
          <summary>帯（流れる文字）</summary>
          <label className={styles.check}>
            <input type="checkbox" checked={fx.band.show} onChange={(event) => setBand("show", event.target.checked)} />
            帯を表示
          </label>
          <label className={styles.textRow}>
            <span>文言</span>
            <input type="text" value={fx.band.text} onChange={(event) => setBand("text", event.target.value)} />
          </label>
          <label className={styles.textRow}>
            <span>区切り記号</span>
            <input type="text" value={fx.band.separator} onChange={(event) => setBand("separator", event.target.value)} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={fx.band.opposite} onChange={(event) => setBand("opposite", event.target.checked)} />
            上下を逆向きに流す
          </label>
          <div className={styles.colors}>
            {BAND_COLORS.map((color) => (
              <label key={color.key}>
                <input type="color" value={fx.band[color.key]} onChange={(event) => setBand(color.key, event.target.value)} />
                {color.label}
              </label>
            ))}
          </div>
          {BAND_SLIDERS.map((slider) => (
            <SliderRow key={slider.key} slider={slider} value={fx.band[slider.key]} onChange={(value) => setBand(slider.key, value)} />
          ))}
        </details>

        <details className={styles.group} open>
          <summary>カットインの色（{TIER_LABEL[tier]}）</summary>
          <div className={styles.tierTabs}>
            {TIERS.map((item) => (
              <button key={item} type="button" data-active={tier === item} onClick={() => setTier(item)}>
                {TIER_LABEL[item]}
              </button>
            ))}
          </div>
          <div className={styles.colors}>
            {TIER_COLOR_FIELDS.map((field) => (
              <label key={field.key}>
                <input
                  type="color"
                  value={fx.cutIn.colors[tier][field.key]}
                  onChange={(event) => setTierColor(field.key, event.target.value)}
                />
                {field.label}
              </label>
            ))}
          </div>
          <SliderRow
            slider={{ key: "shine", label: "金属のテカり", min: 0, max: 1, step: 0.05 } as Slider<TierColors>}
            value={fx.cutIn.colors[tier].shine}
            onChange={(value) => setTierColor("shine", value)}
          />
        </details>

        {CUTIN_GROUPS.map((group) => (
          <details className={styles.group} key={group.title} open={group.title === "雷"}>
            <summary>{group.title}</summary>
            {group.title === "絵" && (
              <>
                <label className={styles.textRow}>
                  <span>画像のパス</span>
                  <input type="text" value={fx.cutIn.imageSrc} onChange={(event) => setCutIn("imageSrc", event.target.value)} />
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={fx.cutIn.imageUpright}
                    onChange={(event) => setCutIn("imageUpright", event.target.checked)}
                  />
                  絵は傾けずまっすぐ表示
                </label>
              </>
            )}
            {group.sliders.map((slider) => (
              <SliderRow
                key={slider.key}
                slider={slider}
                value={fx.cutIn[slider.key]}
                onChange={(value) => setCutIn(slider.key, value)}
              />
            ))}
          </details>
        ))}
      </aside>
    </main>
  );
}
