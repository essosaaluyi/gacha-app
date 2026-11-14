"use client";

import { useId } from "react";
import CroppedCardImage from "@/components/gacha/CroppedCardImage";
import { getCardDisplayFrame } from "@/components/gacha/pack-reveal/cardDisplayCrop";
import styles from "./ResultGrid.module.css";

type Props = {
  src: string;
  alt: string;
  rarity: string;
  inspection?: boolean;
  fill?: boolean;
  plain?: boolean;
};

const RARITY_EDGE: Record<string, { colors: readonly string[]; bloom: string; glint: string }> = {
  R: { colors: ["#b77a44", "#ffce95", "#b47850", "#f3aa78"], bloom: "rgba(235, 174, 112, 0.24)", glint: "#ffc99b" },
  SR: { colors: ["#2384bd", "#66ecff", "#4587de", "#95bcff"], bloom: "rgba(82, 183, 255, 0.26)", glint: "#85e7ff" },
  SSR: { colors: ["#b88a26", "#fff0a4", "#e4b244", "#ffc779"], bloom: "rgba(255, 207, 87, 0.26)", glint: "#ffeaa2" },
  UR: { colors: ["#268cce", "#52e8ff", "#9872e2", "#e38bfa"], bloom: "rgba(162, 122, 242, 0.28)", glint: "#b8c7ff" },
};


/** Presentation only: existing owner retains clicks, selection, order and state. */
export default function CardFrame({ src, alt, rarity, inspection = false, fill = false, plain = false }: Props) {
  const gradientId = useId().replace(/:/g, "");
  const frame = getCardDisplayFrame(src);
  const edge = RARITY_EDGE[rarity] ?? RARITY_EDGE.R;
  const body = (
    <span data-testid="player-card-frame" className="pointer-events-none" style={{
      display: "block", position: "relative", aspectRatio: frame.aspectRatio,
      width: inspection ? `min(100%, calc((100dvh - 200px) * ${frame.aspectRatio}))` : fill ? "100%" : "auto",
      height: inspection ? "auto" : "100%", margin: "0 auto",
    }}>
      <CroppedCardImage src={src} alt={alt} />
          {!plain && rarity !== "R" && <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" style={{ filter: `drop-shadow(0 0 3px ${edge.bloom})` }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                {edge.colors.map((color, stop) => <stop key={stop} offset={`${stop / 3 * 100}%`} stopColor={color} />)}
              </linearGradient>
            </defs>
            <path d={frame.outlinePath} fill="none" stroke={`url(#${gradientId})`} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <path d={frame.outlinePath} pathLength="100" fill="none" stroke={edge.glint} strokeWidth="3.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeDasharray="5 28.333333" className={styles.travelHalo} />
            <path d={frame.outlinePath} pathLength="100" fill="none" stroke={edge.glint} strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeDasharray="5 28.333333" className={styles.travel} />
            <path d={frame.outlinePath} pathLength="100" fill="none" stroke={`color-mix(in srgb, ${edge.glint} 62%, white)`} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeDasharray="0.12 33.213333" className={styles.sparkle} />
          </svg>}
    </span>
  );
  return inspection || fill ? body : (
    <span className="pointer-events-none" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", aspectRatio: "2 / 3" }}>
      {body}
    </span>
  );
}
