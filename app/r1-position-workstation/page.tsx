"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ALLY_PREVIEW_CHARACTERS, ENEMY_PREVIEW_CHARACTERS, AllyPresentationPreview } from "@/components/battle/BattleSpawnScene";
import {
  defaultAllyPresentation,
  ALLY_IDLE_CONTROLS,
  allyPresentationKey,
  ALLY_SUMMON_CONTROLS,
  readAllyPresentation,
} from "@/lib/battle-pixi/presentation/allyPresentation";

export default function AllyPresentationWorkstation() {
  const [side, setSide] = useState<"player" | "enemy">("player");
  const [placement, setPlacement] = useState(() => defaultAllyPresentation("R3"));
  const [character, setCharacter] = useState("R3");
  const [preview, setPreview] = useState({ take: 0, animate: false });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPlacement(readAllyPresentation("R3")));
    return () => cancelAnimationFrame(frame);
  }, []);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      window.localStorage.setItem(allyPresentationKey(character, side), JSON.stringify(placement));
      setMessage("保存しました。同じブラウザのバトル画面に反映されます。");
    } catch {
      setMessage("保存できませんでした。画面の調整値を控えてください。");
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "auto", padding: 24, color: "#e9ecef" }}>
      <h1>キャラクター演出調整</h1>
      <div role="group" aria-label="調整する陣営" style={{ display: "flex", gap: 10 }}>
        {(["player", "enemy"] as const).map(tab => (
          <button key={tab} type="button" aria-pressed={side === tab}
            style={{ padding: "6px 16px", border: "1px solid", background: side === tab ? "#27483e" : "transparent" }}
            onClick={() => {
              if (side === tab) return;
              const next = tab === "player" ? "R3" : ENEMY_PREVIEW_CHARACTERS[0].id;
              setSide(tab);
              setCharacter(next);
              setPlacement(readAllyPresentation(next, tab));
              setMessage("");
              setPreview(previous => ({ ...previous, animate: false }));
            }}>{tab === "player" ? "味方" : "敵"}</button>
        ))}
      </div>
      <label style={{ display: "block", marginBlock: 12 }}>プレビューするキャラ　
        <select style={{ color: "CanvasText", background: "Canvas" }} value={character} onChange={event => {
          setCharacter(event.target.value);
          setPlacement(readAllyPresentation(event.target.value, side));
          setMessage("");
          setPreview(previous => ({ ...previous, animate: false }));
        }}>
          {(side === "player" ? ALLY_PREVIEW_CHARACTERS : ENEMY_PREVIEW_CHARACTERS).map(({ id, name }) => <option key={id} value={id}>{id} · {name}</option>)}
        </select>
      </label>
      <div className="battle-cabinet-screen" style={{
        position: "relative", aspectRatio: "1250 / 618", overflow: "hidden",
        background: "#14211a url('/images/battle-assets/stage-day-field-cabinet.v2.webp') center / cover",
        border: "1px solid #74867c",
      }}>
        <div className="battle-spawn-scene">
          <div className="battle-spawn-camera">
            <AllyPresentationPreview key={`${character}:${preview.take}`} character={character}
              side={side} placement={placement} animateSummon={side === "player" && preview.animate} />
          </div>
        </div>
      </div>
      <form onSubmit={save}>
        <h2 style={{ marginTop: 16 }}>待機位置とサイズ</h2>
        {ALLY_IDLE_CONTROLS.map(({ key, label, min, max }) => (
          <label key={key} style={{ display: "grid", marginBlock: 14 }}>
            {label}　{placement[key]}%
            <input type="range" min={min} max={max} value={placement[key]} onChange={event => {
              setPlacement({ ...placement, [key]: event.target.valueAsNumber });
              setMessage("");
            }} />
          </label>
        ))}
        {side === "player" && <>
        <h2>召喚アニメーション</h2>
        <label>
          <input type="checkbox" checked={placement.summonEnabled} onChange={event => {
            setPlacement({ ...placement, summonEnabled: event.target.checked });
            setMessage("");
          }} /> 共通の召喚アニメーションをバトルで使う
        </label>
        {ALLY_SUMMON_CONTROLS.map(({ key, label, min, max, unit }) => (
          <label key={key} style={{ display: "grid", marginBlock: 14 }}>
            {label}　{placement[key]}{unit}
            <input type="range" min={min} max={max} value={placement[key]} onChange={event => {
              setPlacement({ ...placement, [key]: event.target.valueAsNumber });
              setMessage("");
            }} />
          </label>
        ))}
        <button type="button" style={{ marginBottom: 14 }} onClick={() =>
          setPreview(previous => ({ take: previous.take + 1, animate: true }))}>
          召喚を再生
        </button>
        </>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          <button type="submit">このブラウザのバトルに適用</button>
          <button type="button" onClick={() => {
            setPlacement(defaultAllyPresentation(character, side));
            setPreview(previous => ({ ...previous, animate: false }));
            setMessage("");
          }}>初期値に戻す</button>
          <a href="/battle">バトルを開く</a>
        </div>
        <p role="status">{message}</p>
      </form>
    </main>
  );
}
