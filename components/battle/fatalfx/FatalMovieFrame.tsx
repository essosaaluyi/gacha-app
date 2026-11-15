"use client";

import type { CSSProperties, Ref } from "react";
import styles from "./FatalAttackCut.module.css";
import type { FreezeSettings } from "./fatalFxSettings";

export type FatalMovieFrameProps = {
  src: string;
  settings: FreezeSettings;
  /** True once the movie has run out: hold the last frame with the effects. */
  frozen: boolean;
  videoRef?: Ref<HTMLVideoElement>;
  onEnded?: () => void;
  onError?: () => void;
  onLoadedMetadata?: () => void;
};

/** A Fatal Mode movie plus the "something is about to happen" hold effects. */
export default function FatalMovieFrame({ src, settings: s, frozen, videoRef, onEnded, onError, onLoadedMetadata }: FatalMovieFrameProps) {
  const vars = {
    "--fz-zoom-min": s.zoomMin,
    "--fz-zoom-max": s.zoomMax,
    "--fz-zoom-ms": `${s.zoomMs}ms`,
    "--fz-shake": `${s.shakePx}px`,
    "--fz-blur": `${s.blurPx}px`,
    "--fz-blur-inner": `${s.blurInnerPct}%`,
    "--fz-lines-opacity": s.linesOpacity,
    "--fz-lines-period": `${s.linesPeriodDeg}deg`,
    "--fz-lines-width": `${s.linesWidthDeg}deg`,
    "--fz-lines-inner": `${s.linesInnerPct}%`,
    "--fz-lines-color": s.linesColor,
    "--fz-flicker-ms": `${s.linesFlickerMs}ms`,
    "--fz-vignette": s.vignette,
    "--fz-fade-ms": `${s.fadeMs}ms`,
  } as CSSProperties;

  return (
    <div className={styles.root} data-frozen={frozen} style={vars}>
      <video
        ref={videoRef}
        className={styles.video}
        src={src}
        playsInline
        preload="auto"
        aria-label="Fatal Mode attack movie"
        onEnded={onEnded}
        onError={onError}
        onLoadedMetadata={onLoadedMetadata}
      />
      <div className={styles.blur} aria-hidden="true" />
      <div className={styles.lines} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
    </div>
  );
}
