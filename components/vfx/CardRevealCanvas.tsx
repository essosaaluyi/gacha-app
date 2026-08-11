"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { RefObject } from "react";

export type RevealStats = {
  /** Median, derived from the wall-clock gap between frames. */
  fps: number;
  frameMs: number;
  frameP95Ms: number;
  frameWorstMs: number;
  /** Our own work per frame — a floor, not GPU time. */
  cpuMs: number;
  cpuP95Ms: number;
  /** Share of frames in the window that missed a 60 Hz vsync. */
  droppedPct: number;
  calls: number;
  triangles: number;
  programs: number;
  particles: number;
  samples: number;
};

/**
 * The slice of `CardRevealScene` this component drives. The scene itself is
 * plain JS (it is ported code), so this is the contract we hold it to rather
 * than a generated type.
 */
type RevealScene = {
  load: () => Promise<void>;
  start: () => void;
  play: (rarity: string) => void;
  stop: () => void;
  setCardImage: (url: string) => Promise<void>;
  getStats: () => RevealStats;
  renderSize: { width: number; height: number; pixelRatio: number };
  dispose: () => void;
};

export type RevealHandle = {
  play: (rarity: string) => void;
  stop: () => void;
  setCardImage: (url: string) => void;
  getStats: () => RevealStats | null;
  getRenderSize: () => { width: number; height: number; pixelRatio: number } | null;
};

type Props = {
  quality: string;
  cardImage: string;
  onReady?: () => void;
  onComplete?: () => void;
  onError?: (message: string) => void;
  handleRef?: RefObject<RevealHandle | null>;
};

/**
 * Mounts the three.js reveal scene onto a canvas.
 *
 * The scene module is imported dynamically inside the effect rather than at the
 * top of the file: that keeps three.js out of every bundle that merely renders
 * this component's parent, and it means the module never has to survive being
 * evaluated on the server.
 *
 * Rebuilding the whole scene is the correct response to a quality change — the
 * tier decides geometry tessellation, particle capacities and which post passes
 * exist, none of which can be changed on a live pipeline.
 */
export default function CardRevealCanvas({
  quality,
  cardImage,
  onReady,
  onComplete,
  onError,
  handleRef,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<RevealScene | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // Keep the callbacks in refs so changing them never tears the scene down.
  const onCompleteRef = useRef(onComplete);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onComplete, onReady, onError]);

  useImperativeHandle(
    handleRef,
    () => ({
      play: (rarity: string) => sceneRef.current?.play(rarity),
      stop: () => sceneRef.current?.stop(),
      setCardImage: (url: string) => {
        void sceneRef.current?.setCardImage(url);
      },
      getStats: () => sceneRef.current?.getStats() ?? null,
      getRenderSize: () => sceneRef.current?.renderSize ?? null,
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    let scene: RevealScene | null = null;

    (async () => {
      try {
        const { CardRevealScene } = await import("@/lib/vfx/reveal/CardRevealScene");
        if (cancelled || !canvasRef.current) return;

        scene = new CardRevealScene(canvasRef.current, {
          quality,
          cardImage,
          onComplete: () => onCompleteRef.current?.(),
        });

        await scene.load();

        // StrictMode double-mounts in development; the cleanup below runs
        // between the two, so bail out rather than starting an orphan loop.
        if (cancelled) {
          scene.dispose();
          return;
        }

        sceneRef.current = scene;
        scene.start();
        onReadyRef.current?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!cancelled) {
          setFailed(message);
          onErrorRef.current?.(message);
        }
      }
    })();

    return () => {
      cancelled = true;
      sceneRef.current = null;
      scene?.dispose();
    };
    // cardImage is intentionally excluded: swapping the card texture is done
    // through the imperative handle, which does not need a scene rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality]);

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-400 font-semibold mb-2">WebGL scene failed to start</p>
          <p className="text-zinc-400 text-sm max-w-md">{failed}</p>
          <p className="text-zinc-500 text-xs mt-3">
            This is the case the video fallback exists for.
          </p>
        </div>
      </div>
    );
  }

  return <canvas ref={canvasRef} className="block w-full h-full" />;
}
