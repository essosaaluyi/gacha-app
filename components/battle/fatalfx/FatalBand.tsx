"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./FatalBand.module.css";
import type { BandSettings } from "./fatalFxSettings";

const REPEAT = 8;

function Strip({ settings, reverse, edge }: { settings: BandSettings; reverse: boolean; edge: "top" | "bottom" }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const halfRef = useRef<HTMLDivElement>(null);
  const [seconds, setSeconds] = useState(20);

  // Speed is "% of the screen width per second", so the pace reads the same
  // at any cabinet scale and for any text length.
  useLayoutEffect(() => {
    const strip = stripRef.current;
    const half = halfRef.current;
    if (!strip || !half) return;
    const measure = () => {
      const pxPerSecond = (strip.offsetWidth * Math.max(settings.speedPct, 0.5)) / 100;
      if (pxPerSecond > 0 && half.offsetWidth > 0) setSeconds(half.offsetWidth / pxPerSecond);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    observer.observe(half);
    return () => observer.disconnect();
  }, [settings.speedPct, settings.text, settings.separator, settings.gapEm, settings.fontPct, settings.heightPct]);

  const items = Array.from({ length: REPEAT }, (_, i) => (
    <span className={styles.item} key={i}>
      <span className={styles.text}>{settings.text}</span>
      <span className={styles.separator}>{settings.separator}</span>
    </span>
  ));

  return (
    <div
      ref={stripRef}
      className={styles.strip}
      data-edge={edge}
      style={{ [edge]: `${settings.insetPct}%` } as CSSProperties}
    >
      <div
        className={styles.track}
        style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        <div ref={halfRef} className={styles.half}>{items}</div>
        <div className={styles.half} aria-hidden="true">{items}</div>
      </div>
    </div>
  );
}

/** Top and bottom announcement bands that scroll for the whole Fatal Mode. */
export default function FatalBand({ settings }: { settings: BandSettings }) {
  if (!settings.show) return null;
  const vars = {
    "--fb-height": `${settings.heightPct}cqh`,
    "--fb-font": `${(settings.heightPct * settings.fontPct) / 100}cqh`,
    "--fb-gap": `${settings.gapEm}em`,
    "--fb-bg": settings.bgColor,
    "--fb-edge": settings.edgeColor,
    "--fb-text": settings.textColor,
    "--fb-glow": settings.glowColor,
    "--fb-opacity": settings.opacity,
    "--fb-glow-strength": settings.glow,
    "--fb-skew": `${settings.skewDeg}deg`,
  } as CSSProperties;

  return (
    <div className={styles.root} style={vars} role="status" aria-label={settings.text}>
      <Strip settings={settings} reverse={false} edge="top" />
      <Strip settings={settings} reverse={settings.opposite} edge="bottom" />
    </div>
  );
}
