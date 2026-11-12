"use client";

import { useEffect, useRef, useState } from "react";
import { mountCabinetNiche, type CabinetNiche3D, type NicheVariant } from "@/lib/button-3d/cabinetNiche";
import { mountCabinetPanelB3, type CabinetPanelB3 } from "@/lib/button-3d/cabinetPanelB3";
import type { LampState } from "@/lib/button-3d/runtime";

/** The cabinet control niche in several variants, at the real panel size (254 × 599), side by side. */
const VARIANTS: { name: string; note: string; v: NicheVariant }[] = [
  { name: "現行（参考なし）", note: "床に彫り込みロゴ・クリアの DATA ボタン", v: {} },
  { name: "A：看板", note: "DATA COUNTER を光る看板に", v: { sign: true } },
  { name: "B：立体ロゴ＋受け皿", note: "奥の壁に立体クロームロゴ・手前にクロームの受け皿", v: { logo: "wallRaised", tray: true } },
  { name: "C：看板＋受け皿＋青", note: "看板・受け皿・青い側面・壁に彫り込みロゴ", v: { sign: true, tray: true, blueSides: true, logo: "wallEngraved" } },
  { name: "D：旧採用（暗いくぼみ）", note: "看板・受け皿・青い側面。奥の壁のロゴは 2026-11-12 に撤去", v: { sign: true, logo: "none", tray: true, blueSides: true } },
  { name: "E：採用（明るい棚＋看板）", note: "くぼみを 1 枚のクリーム色の操作棚に。金の内枠はやめクロームに統一（2026-11-12）", v: { sign: true, logo: "none", tray: true, shelf: true } },
  { name: "F：不採用（DATA を DRAW に寄せる）", note: "DATA COUNTER を押しボタンへ。明るい棚では DRAW が 2 つ並んで見えたため、同日 E に戻した（2026-11-12）", v: { sign: false, logo: "none", tray: true, shelf: true } },
];

export default function NicheLab() {
  const b3Host = useRef<HTMLDivElement>(null);
  const [b3, setB3] = useState<CabinetPanelB3 | null>(null);
  const hosts = useRef<(HTMLDivElement | null)[]>([]);
  const [niches, setNiches] = useState<CabinetNiche3D[]>([]);
  const [lamp, setLamp] = useState<LampState>("gray");
  const [auto, setAuto] = useState(false);

  // B3 (owner CGI handoff, 2026-11-12) — the adopted panel, shown at 1.19× so details are readable.
  useEffect(() => {
    const el = b3Host.current;
    if (!el) return;
    const n = mountCabinetPanelB3(el);
    setB3(n);
    return () => { n.dispose(); setB3(null); };
  }, []);
  useEffect(() => { b3?.setDrawLamp(lamp); }, [b3, lamp]);
  useEffect(() => { b3?.setAuto(auto); }, [b3, auto]);

  useEffect(() => {
    const list = VARIANTS.flatMap((x, i) => {
      const host = hosts.current[i];
      return host ? [mountCabinetNiche(host, { variant: x.v })] : [];
    });
    (window as unknown as { __niches?: unknown }).__niches = {
      setDrawLamp: (s: LampState) => list.forEach((n) => n.setDrawLamp(s)),
      setAuto: (on: boolean) => list.forEach((n) => n.setAuto(on)),
    };
    setNiches(list);
    return () => list.forEach((n) => n.dispose());
  }, []);
  useEffect(() => { niches.forEach((n) => n.setDrawLamp(lamp)); }, [niches, lamp]);
  useEffect(() => { niches.forEach((n) => n.setAuto(auto)); }, [niches, auto]);

  return (
    <main style={{ minHeight: "100vh", background: "#0b0d10", color: "#e8eef8", padding: 16, fontFamily: "system-ui, sans-serif", display: "grid", gap: 12, justifyItems: "center" }}>
      <h1 style={{ margin: 0, fontSize: 18, letterSpacing: ".12em" }}>右上パネル 3D（比較）</h1>
      <figure style={{ margin: 0, display: "grid", gap: 6, justifyItems: "center" }}>
        <div ref={b3Host} style={{ width: 322, height: 736, position: "relative", background: "#05080b", borderRadius: 16 }} />
        <figcaption style={{ fontSize: 14, fontWeight: 700 }}>B3：採用（オーナー資料 2026-11-12）</figcaption>
        <span style={{ fontSize: 11, opacity: .7 }}>真鍮外周・DATA 看板・AUTO ノブ・黒い V 字面と真鍮インレイ・DRAW・下部グリル。単位は mm（230×520×78）</span>
      </figure>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {VARIANTS.map((x, i) => (
          <figure key={x.name} style={{ margin: 0, display: "grid", gap: 6, justifyItems: "center", width: 270 }}>
            <div style={{ width: 270, height: 615, border: "8px double #a28149", borderRadius: "18px 26px 16px 12px", background: "#0a0e12", boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
              <div ref={(el) => { hosts.current[i] = el; }} style={{ position: "absolute", inset: 0 }} />
            </div>
            <figcaption style={{ fontSize: 14, fontWeight: 700 }}>{x.name}</figcaption>
            <span style={{ fontSize: 11, opacity: .7, textAlign: "center" }}>{x.note}</span>
          </figure>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button type="button" onClick={() => setLamp(lamp === "gray" ? "sky" : lamp === "sky" ? "off" : "gray")}>DRAW ランプ：{lamp}</button>
        <button type="button" onClick={() => setAuto(!auto)}>AUTO：{auto ? "ON" : "OFF"}</button>
        <button type="button" onClick={() => { b3?.pressDraw(); niches.forEach((n) => n.pressDraw()); }}>DRAW を押す</button>
        <button type="button" onClick={() => { b3?.pressData(); niches.forEach((n) => n.pressData()); }}>DATA COUNTER を押す</button>
      </div>
    </main>
  );
}
