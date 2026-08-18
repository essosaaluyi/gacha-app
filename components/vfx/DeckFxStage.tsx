"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { RefObject } from "react";

export type Outcome = "white" | "blue" | "green" | "red" | "gold" | "normal";

export type DeckFxHandle = {
  /** First click on draw: lights the deck, sometimes. Returns whether it showed. */
  armDraw: (outcome: Outcome) => boolean;
  /** The card leaves the deck. */
  drawCard: (outcome: Outcome, durationSeconds: number) => void;
  /** A card lands on the table. Keyed by what landed, not by the rung. */
  cardLanded: (symbol: "chance" | "attack") => void;
  cancelDraw: () => void;
  clear: () => void;
};

type Props = {
  /** The board. Positions are measured against it and the shake is applied to it. */
  hostRef: RefObject<HTMLElement | null>;
  deckRef: RefObject<HTMLElement | null>;
  /**
   * Where a drawn card lands — the slot, not the card. Effects are aimed at it
   * the instant the draw starts, and a card mid-deal measures wherever its
   * animation currently has it, which at that instant is still the deck.
   */
  targetRef: RefObject<HTMLElement | null>;
  handleRef: RefObject<DeckFxHandle | null>;
  /** The deck's silhouette. A disc gets a round glow and glitter inside it. */
  deckShape?: "rect" | "disc";
  glitterTone?: "white" | "gold";
  onReady?: () => void;
};

/**
 * Mounts the effects overlay over an existing DOM board.
 *
 * The canvas covers the host and never takes pointer events, so the game
 * underneath stays fully interactive. three.js is imported inside the effect so
 * it stays out of every bundle that does not draw effects, and so the module is
 * never evaluated on the server.
 */
export default function DeckFxStage({
  hostRef,
  deckRef,
  targetRef,
  handleRef,
  deckShape = "rect",
  glitterTone = "gold",
  onReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<{
    armDraw: (
      el: HTMLElement,
      rung: string,
      options?: { shape?: "rect" | "disc"; radius?: number }
    ) => boolean;
    drawCard: (deck: HTMLElement, rung: string, landing: HTMLElement, d?: number) => void;
    cardLanded: (el: HTMLElement, outcome: string) => void;
    cancelDraw: () => void;
    clear: () => void;
    dispose: () => void;
  } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useImperativeHandle(
    handleRef,
    () => ({
      armDraw: (outcome) => {
        if (!fxRef.current || !deckRef.current) return false;
        return fxRef.current.armDraw(deckRef.current, outcome, { shape: deckShape });
      },
      drawCard: (outcome, durationSeconds) => {
        if (!fxRef.current || !deckRef.current || !targetRef.current) return;
        fxRef.current.drawCard(deckRef.current, outcome, targetRef.current, durationSeconds);
      },
      cardLanded: (symbol) => {
        if (!fxRef.current || !targetRef.current) return;
        fxRef.current.cardLanded(targetRef.current, symbol);
      },
      cancelDraw: () => fxRef.current?.cancelDraw(),
      clear: () => fxRef.current?.clear(),
    }),
    [deckRef, targetRef, deckShape]
  );

  useEffect(() => {
    let cancelled = false;
    let fx: { dispose: () => void } | null = null;

    (async () => {
      try {
        const { DeckFx } = await import("@/lib/vfx/ui/DeckFx");
        if (cancelled || !canvasRef.current || !hostRef.current) return;

        const instance = new DeckFx(canvasRef.current, hostRef.current, { glitterTone });
        // StrictMode double-mounts in development; the cleanup runs between the
        // two, so bail rather than leaving an orphan render loop running.
        if (cancelled) {
          instance.dispose();
          return;
        }
        fx = instance;
        fxRef.current = instance as unknown as typeof fxRef.current;
        onReadyRef.current?.();
      } catch (error) {
        if (!cancelled) setFailed(error instanceof Error ? error.message : String(error));
      }
    })();

    return () => {
      cancelled = true;
      fxRef.current = null;
      fx?.dispose();
    };
  }, [hostRef, glitterTone]);

  if (failed) {
    return (
      <div className="absolute inset-0 grid place-content-center pointer-events-none">
        <p className="text-red-400 text-sm">Effects unavailable: {failed}</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
    />
  );
}

/** Convenience for callers that want the ref without repeating the type. */
export function useDeckFxHandle() {
  const ref = useRef<DeckFxHandle | null>(null);
  return ref;
}

/** Kept next to the component so a host page does not import the JS module. */
export function useStableCallback<T extends (...args: never[]) => unknown>(fn: T) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  return useCallback((...args: Parameters<T>) => ref.current(...args), []);
}
