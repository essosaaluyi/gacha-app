"use client";

import { useEffect, useRef } from "react";

/** The Pixi stage's own coordinate space, from the generated layout config. */
const STAGE_WIDTH = 1200;
const STAGE_HEIGHT = 500;

/** Roughly how long the cards take to cross from the disc to the table. */
const RELEASE_SECONDS = 0.42;

/**
 * The disc's well is a square box; the disc art inside it is a circle with a
 * little air around it. Without this the aura draws around the box's inscribed
 * circle and floats visibly off the gold rim it is supposed to be lighting.
 */
const DISC_ART_INSET = 14;

type Tell = "chance" | "attack" | "triple" | null;

type PileDetail = { state?: string; tell?: Tell };
type LandedDetail = {
  symbol?: string;
  onTarget?: boolean;
  stage?: { x: number; y: number };
};

type Fx = {
  armDraw: (
    el: HTMLElement,
    outcome: string,
    options?: {
      shape?: "rect" | "disc";
      radius?: number;
      inset?: number;
    }
  ) => boolean;
  drawCard: (
    deck: HTMLElement,
    landing: HTMLElement | { x: number; y: number },
    outcome: string,
    duration?: number
  ) => void;
  cardLanded: (
    target: HTMLElement | { x: number; y: number },
    outcome: string
  ) => void;
  clear: () => void;
  dispose: () => void;
};

/**
 * The battle cabinet's effects layer.
 *
 * A single transparent canvas over the whole viewport, driven by the two events
 * the stage already broadcasts. It never reads game state and never calls into
 * the stage, so the effects can be pulled out entirely by deleting this
 * component's mount — nothing in the battle depends on them running.
 *
 * Three things it has to reconcile:
 *
 * **Two coordinate spaces.** The disc is a DOM element in the cabinet shell;
 * the table is a Pixi canvas with its own 1200x500 space, sitting under a CSS
 * scale and a vertical stretch. Rather than reproduce that chain in JS — which
 * would go stale the first time the cabinet's CSS moved — a zero-size probe
 * element is planted inside the canvas's own box and measured. The browser does
 * the transform maths, and it stays correct by construction.
 *
 * **The canvas must not be inside the cabinet.** `.battle-fixed-stage` carries
 * `scale(0.75)`; a canvas under it would be rendered at three-quarter size and
 * scaled back up, which is exactly how you get soft, aliased sparks. It sits
 * outside and works in viewport pixels.
 *
 * **The shake still belongs to the machine.** The canvas covers the window, but
 * the thing that jolts on a landing is the cabinet, so the shake target is the
 * stage element while the coordinates stay in viewport space.
 */
export default function BattleVfxOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<Fx | null>(null);
  /** The tell for the hand currently at the disk exit; null once it is spent. */
  const tellRef = useRef<Tell>(null);
  const probeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let fx: Fx | null = null;

    const disc = () =>
      document.querySelector<HTMLElement>(".bcab-disk-well") ??
      document.querySelector<HTMLElement>(".bcab-disk");

    /** A Pixi stage point in viewport pixels, via the browser's own maths. */
    const fromStage = (x: number, y: number) => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        ".bcab-pixi-mount canvas"
      );
      const mount = canvas?.parentElement;
      if (!mount) return null;

      let probe = probeRef.current;
      if (!probe || probe.parentElement !== mount) {
        probe = document.createElement("div");
        probe.setAttribute("aria-hidden", "true");
        probe.style.cssText =
          "position:absolute;width:0;height:0;left:0;top:0;pointer-events:none;visibility:hidden";
        mount.appendChild(probe);
        probeRef.current = probe;
      }

      probe.style.left = `${(x / STAGE_WIDTH) * 100}%`;
      probe.style.top = `${(y / STAGE_HEIGHT) * 100}%`;
      const b = probe.getBoundingClientRect();
      return { x: b.x, y: b.y };
    };

    const onPile = (event: Event) => {
      if (!fx || !(event instanceof CustomEvent)) return;
      const detail = (event.detail ?? {}) as PileDetail;
      const deck = disc();
      if (!deck) return;

      if (detail.state === "set") {
        // A hand with no tell gets no aura, and `armDraw` withholds it on some
        // of the hands that do have one — see OUTCOME_RULES.
        tellRef.current = detail.tell ?? null;
        fx.armDraw(deck, tellRef.current ?? "normal", {
          shape: "disc",
          inset: DISC_ART_INSET,
        });
        return;
      }

      if (detail.state === "launching") {
        // Aim the trail at the point the Pixi cards take over from the DOM
        // pile, so the sparks travel the same line the cards do.
        const entry = fromStage(313, STAGE_HEIGHT / 2) ?? { x: 0, y: 0 };
        fx.drawCard(deck, entry, tellRef.current ?? "normal", RELEASE_SECONDS);
        return;
      }

      if (detail.state === "idle") {
        tellRef.current = null;
        fx.clear();
      }
    };

    const onLanded = (event: Event) => {
      if (!fx || !(event instanceof CustomEvent)) return;
      const detail = (event.detail ?? {}) as LandedDetail;
      if (!detail.stage) return;

      // The wave is the chance card's alone. An attack only earns one when it
      // actually lands on its target — an attack that misses is not a hit, and
      // giving it the same punctuation would say it was.
      const outcome =
        detail.symbol === "Chance"
          ? "chance"
          : detail.symbol === "Attack" && detail.onTarget
            ? "attack"
            : null;
      if (!outcome) return;

      const point = fromStage(detail.stage.x, detail.stage.y);
      if (point) fx.cardLanded(point, outcome);
    };

    (async () => {
      try {
        const { DeckFx } = await import("@/lib/vfx/ui/DeckFx");
        if (cancelled || !canvasRef.current) return;

        const stage =
          document.querySelector<HTMLElement>(".battle-fixed-stage") ??
          document.body;

        const instance = new DeckFx(canvasRef.current, document.body, {
          glitterTone: "gold",
          origin: "viewport",
          shakeTarget: stage,
        }) as unknown as Fx;

        // StrictMode double-mounts in development and the cleanup runs between
        // the two, so a late arrival must not leave a render loop orphaned.
        if (cancelled) {
          instance.dispose();
          return;
        }

        fx = instance;
        fxRef.current = instance;
        window.addEventListener("battle:cabinet-pile", onPile);
        window.addEventListener("battle:vfx-card-landed", onLanded);
      } catch {
        // Effects are decoration. A stage that cannot build one still deals.
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("battle:cabinet-pile", onPile);
      window.removeEventListener("battle:vfx-card-landed", onLanded);
      probeRef.current?.remove();
      probeRef.current = null;
      fxRef.current = null;
      fx?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 40,
      }}
    />
  );
}
