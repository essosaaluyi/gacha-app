"use client";

import { useEffect, useRef, useState } from "react";
import type { LabEvent, LabOptions } from "@/lib/air-tank-lab/runtime";
import type { Preset } from "@/lib/air-tank-lab/motion";
import type { RecordState } from "@/lib/air-tank-lab/recording";
import type { CrackState } from "@/lib/air-tank-lab/cracks";
import styles from "./AirTankLab.module.css";

const initialOptions: LabOptions = { paused: false, preset: "normal", count: 30, speed: 1, light: false, reset: 0, front: 0 };
const presets: { id: Preset; label: string; note: string }[] = [
  { id: "normal", label: "通常", note: "浮遊と巻き返し" }, { id: "fast", label: "加速", note: "強い上昇流" }, { id: "hot", label: "熱い", note: "暖色と振動" },
];

export default function AirTankLab() {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<{ record(): void; hitGlass(): void; repairGlass(): void; dispose(): void } | null>(null);
  const optionsRef = useRef<LabOptions>({ ...initialOptions });
  const [options, setOptions] = useState(initialOptions);
  const [model, setModel] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [record, setRecord] = useState<RecordState>("unsupported");
  const [crack, setCrack] = useState<CrackState["phase"]>("clean");
  const [stats, setStats] = useState<Extract<LabEvent, { type: "stats" }> | null>(null);
  const recording = record === "recording";
  const change = (patch: Partial<LabOptions>) => {
    Object.assign(optionsRef.current, patch);
    setOptions({ ...optionsRef.current });
  };
  useEffect(() => {
    let cancelled = false;
    const receive = (event: LabEvent) => {
      if (cancelled) return;
      if (event.type === "ready") setModel("ready");
      if (event.type === "error") { setModel("error"); setMessage(event.message); }
      if (event.type === "stats") setStats(event);
      if (event.type === "record") setRecord(event.state);
      if (event.type === "crack") setCrack(event.state);
    };
    void import("@/lib/air-tank-lab/runtime").then(({ mountTank }) => {
      if (cancelled || !hostRef.current) return;
      try { runtimeRef.current = mountTank(hostRef.current, optionsRef.current, receive); }
      catch { receive({ type: "error", message: "3D表示を開始できませんでした。WebGL 2対応ブラウザーと端末でお試しください。" }); }
    }).catch(() => receive({ type: "error", message: "表示の準備に失敗しました。再読み込みしてください。" }));
    return () => { cancelled = true; runtimeRef.current?.dispose(); runtimeRef.current = null; };
  }, []);

  return <main lang="ja" className={styles.lab} data-model-state={model} data-active-preset={options.preset} data-record-state={record} data-crack-state={crack} data-contact-count={stats?.contacts ?? 0}>
    <header className={styles.header}><div><p className={styles.eyebrow}>GACHA STUDIO / MOTION STUDY 01</p><h1>AIR CHAMBER<span>空気で、混ざる。</span></h1></div><span className={styles.badge}>3D品質テスト</span></header>
    <div className={styles.workspace}>
      <section className={styles.stage} aria-label="エアタンクの3Dプレビュー">
        <div className={styles.canvas} ref={hostRef} />
        {model !== "ready" ? <div className={styles.overlay} role="status">{model === "loading" ? "タンクとカードを準備しています…" : message}</div> : null}
        <div className={styles.stageLabel}><span className={styles.dot} />{options.paused ? "PAUSED" : "LIVE SHUFFLE"}<span>{options.count} CARDS</span></div>
        <p className={styles.gesture}>ドラッグで回転 · ピンチ／ホイールで拡大</p>
      </section>
      <aside className={styles.panel} aria-label="映像テストの操作">
        <div><p className={styles.eyebrow}>WIND / INTENSITY</p><h2>混ざり方を比べる</h2><p className={styles.description}>同じカード、同じ初期配置で、風の強さと見え方を確認できます。</p></div>
        <div className={styles.presets}>{presets.map(p => <button key={p.id} disabled={recording} aria-pressed={options.preset === p.id} onClick={() => change({ preset: p.id })}><strong>{p.label}</strong><span>{p.note}</span></button>)}</div>
        <div className={styles.actions}><button disabled={model !== "ready" || recording} onClick={() => change({ paused: !options.paused })}>{options.paused ? "▶ 再生" : "Ⅱ 一時停止"}</button><button disabled={recording} onClick={() => change({ reset: options.reset + 1 })}>初期配置へ</button><button disabled={recording} onClick={() => change({ front: options.front + 1 })}>正面へ</button></div>
        <label className={styles.range}>カード枚数 <output>{options.count}枚</output><input type="range" min="18" max="36" step="6" value={options.count} disabled={recording} onChange={e => change({ count: Number(e.target.value) })} /></label>
        <label className={styles.range}>動きの速さ <output>{options.speed.toFixed(2)}×</output><input type="range" min="0.5" max="1.5" step="0.25" value={options.speed} disabled={recording} onChange={e => change({ speed: Number(e.target.value) })} /></label>
        <label className={styles.check}><input type="checkbox" checked={options.light} disabled={recording} onChange={e => change({ light: e.target.checked })} />軽量表示 <span>画面の精細さを抑える</span></label>
        <div className={styles.glassControls}><p className={styles.eyebrow}>GLASS / IMPACT</p><div><button disabled={model !== "ready" || crack !== "clean"} onClick={() => runtimeRef.current?.hitGlass()}>ヒビを入れる</button><button disabled={model !== "ready" || recording || crack === "clean"} onClick={() => runtimeRef.current?.repairGlass()}>修復する</button></div><p role="status">{crack === "growing" ? options.paused ? "一時停止中。再生するとヒビが広がります。" : "ヒビが枝分かれして広がっています。" : crack === "cracked" ? "修復すると、もう一度試せます。" : "熱いモードと独立して試せます。"}</p></div>
        <div className={styles.export}><button className={styles.record} disabled={model !== "ready" || recording || record === "unsupported"} onClick={() => runtimeRef.current?.record()}>{recording ? "録画中 · 6秒で保存" : "6秒の映像を保存"}</button><p role="status">{record === "unsupported" ? "このブラウザーはWebM録画に対応していません。" : record === "error" ? "録画できませんでした。もう一度お試しください。" : recording ? "録画中も「ヒビを入れる」を押せます。" : "タンク画面だけをWebMで保存。カメラ・マイクは使いません。"}</p></div>
      </aside>
    </div>
    <footer className={styles.footer}><div><strong>{stats ? `${stats.fps} fps` : "計測準備中"}</strong><span>{stats ? `描画 ${stats.calls}回 · 三角形 ${stats.triangles.toLocaleString()} · 画像 ${stats.textures} · 更新 ${stats.steps}` : ""}</span></div><p>このブラウザー／PCでの参考値です。スマートフォンの性能保証ではありません。<br />映像のみの試作です。抽選・報酬はありません。風場による制御アニメーションで、流体・剛体の物理再現ではありません。</p></footer>
  </main>;
}
