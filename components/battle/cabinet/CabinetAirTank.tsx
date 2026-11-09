"use client";

import { useEffect, useRef, useState } from "react";
import type { CabinetTankSignals } from "@/lib/air-tank-lab/cabinet-state";
import type { CabinetRenderState } from "@/lib/air-tank-lab/cabinet-runtime";
import styles from "./CabinetAirTank.module.css";

export type CabinetAirTankProps = CabinetTankSignals & { className?: string };

export default function CabinetAirTank({ active, mixing, tone = "normal", crackToken = 0, className }: CabinetAirTankProps) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<{ update(next: CabinetTankSignals): void; dispose(): void } | null>(null);
  const latest = useRef<CabinetTankSignals>({ active, mixing, tone, crackToken });
  const [state, setState] = useState<CabinetRenderState>("loading");
  useEffect(() => {
    latest.current = { active, mixing, tone, crackToken };
    runtime.current?.update(latest.current);
  }, [active, mixing, tone, crackToken]);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void import("@/lib/air-tank-lab/cabinet-runtime").then(({ mountCabinetTank }) => {
      if (cancelled || !host.current) return;
      runtime.current = mountCabinetTank(host.current, latest.current, next => { if (!cancelled) setState(next); });
    }).catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; runtime.current?.dispose(); runtime.current = null; };
  }, [active]);
  return <div className={`${styles.tank}${className ? ` ${className}` : ""}`} aria-hidden="true" data-air-tank-state={active ? state : "inactive"}>
    <div ref={host} className={styles.canvas} />
    {active && state !== "ready" ? <div className={styles.fallback}><span>{state === "loading" ? "準備中" : "演出休止中"}</span></div> : null}
  </div>;
}
