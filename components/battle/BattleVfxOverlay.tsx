"use client";

import { useEffect, useRef } from "react";

/** The Pixi stage's own coordinate space, from the generated layout config. */
const STAGE_WIDTH = 1200;
const STAGE_HEIGHT = 500;

/** Roughly how long the cards take to cross from the disc to the table. */
const RELEASE_SECONDS = 0.42;

/**
 * Where the three cards land and when, in the cabinet's table layout, from
 * patchConfig.cabinetTable and CARD_PLACE_DURATION_1..3. Mirrored rather than
 * imported so the overlay stays a pure listener with no reach into game config;
 * if the table is re-laid out, the trails want updating here.
 */
const CARD_SLOTS = [
  { x: 285, y: 237, delay: 0, duration: 0.34 },
  { x: 600, y: 237, delay: 0.1, duration: 0.4 },
  { x: 915, y: 237, delay: 0.2, duration: 0.46 },
];

/**
 * The disc's well is a square box; the disc art inside it is a circle with a
 * little air around it. Without this the aura draws around the box's inscribed
 * circle and floats visibly off the gold rim it is supposed to be lighting.
 */
const DISC_ART_INSET = 14;

type Rung = "white" | "blue" | "green" | "red" | "gold" | null;

/**
 * `?vfx-tell=gold` pins every draw to one rung, so a colour can be looked at
 * deliberately instead of waited for — gold is 1 in 546, and the ladder only
 * speaks at all on about 8% of draws.
 *
 * Unlike the hand overrides in resultLottery this works in production, because
 * it cannot leak anything. It forces the *display* and leaves the hand alone,
 * so a pinned disc has no relationship to what is coming — it destroys the
 * cue's information rather than revealing it.
 */
function pinnedRung(): Rung | undefined {
  if (typeof window === "undefined") return undefined;
  const value = new URLSearchParams(window.location.search).get("vfx-tell");
  const rungs = ["white", "blue", "green", "red", "gold"] as const;
  return (rungs as readonly string[]).includes(value ?? "") ? (value as Rung) : undefined;
}

type PileDetail = { state?: string };
type TellDetail = { rung?: Rung };
type LandedDetail = {
  symbol?: string;
  onTarget?: boolean;
  stage?: { x: number; y: number };
};

type Fx = {
  armDraw: (
    el: HTMLElement,
    rung: string,
    options?: { shape?: "rect" | "disc"; radius?: number; inset?: number }
  ) => boolean;
  drawCard: (
    deck: HTMLElement,
    rung: string,
    landing:
      | HTMLElement
      | { x: number; y: number }
      | Array<{ x: number; y: number; delay?: number; duration?: number }>,
    duration?: number
  ) => void;
  cardLanded: (
    target: HTMLElement | { x: number; y: number },
    symbol: string
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
  /** The rung rolled for the hand now at the disk exit; null means dark. */
  const rungRef = useRef<Rung>(null);
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


      if (detail.state === "launching") {
        // One trail per card, aimed at the slot that card is actually going to
        // and delayed by the same stagger the stage deals on, so each streak
        // sits behind its own card instead of all three overlapping.
        const trails = CARD_SLOTS.map((slot) => {
          const point = fromStage(slot.x, slot.y);
          return point
            ? { ...point, delay: slot.delay, duration: slot.duration }
            : null;
        }).filter((t): t is NonNullable<typeof t> => t !== null);

        if (trails.length) {
          fx.drawCard(deck, rungRef.current ?? "normal", trails, RELEASE_SECONDS);
        }
        return;
      }

      if (detail.state === "idle") {
        rungRef.current = null;
        fx.clear();
      }
    };

    // The rung arrives on its own event rather than with the pile, because the
    // pile is set *before* the hand is drawn — reading the result at pile time
    // reads the previous draw's.
    const onTell = (event: Event) => {
      if (!fx || !(event instanceof CustomEvent)) return;
      const deck = disc();
      if (!deck) return;

      const detail = (event.detail ?? {}) as TellDetail;
      rungRef.current = pinnedRung() ?? detail.rung ?? null;

      fx.armDraw(deck, rungRef.current ?? "normal", {
        shape: "disc",
        inset: DISC_ART_INSET,
      });
    };

    const onLanded = (event: Event) => {
      if (!fx || !(event instanceof CustomEvent)) return;
      const detail = (event.detail ?? {}) as LandedDetail;
      if (!detail.stage) return;

      // The wave is the chance card's alone. An attack only earns one when it
      // actually lands on its target — an attack that misses is not a hit, and
      // giving it the same punctuation would say it was.
      const symbol =
        detail.symbol === "Chance"
          ? "chance"
          : detail.symbol === "Attack" && detail.onTarget
            ? "attack"
            : null;
      if (!symbol) return;

      const point = fromStage(detail.stage.x, detail.stage.y);
      if (point) fx.cardLanded(point, symbol);
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
        window.addEventListener("battle:vfx-tell", onTell);
        window.addEventListener("battle:vfx-card-landed", onLanded);
      } catch {
        // Effects are decoration. A stage that cannot build one still deals.
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("battle:cabinet-pile", onPile);
      window.removeEventListener("battle:vfx-tell", onTell);
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
