"use client";

import { useEffect, useRef, useState } from "react";
import {
  CRV_FIRST_FRAME,
  CRV_FRAME_HEIGHT,
  CRV_FRAME_MS,
  CRV_FRAME_WIDTH,
  CRV_LOAD_BATCH,
  CRV_MAX_FRAMES,
  CRV_MIN_BUFFER,
  CRV_PAUSE_FRAME,
  chanceRevealCardBuilders,
  chanceRevealCharacterBuilders,
  getFakeoutChanceRevealState,
  markFakeoutChanceRevealPaused,
  subscribeFakeoutChanceReveal,
} from "@/lib/battle-pixi/state/fakeoutChanceRevealStore";

type FrameBuilder = (frame: number) => string;

function loadFrame(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function resolveBuilder(builders: FrameBuilder[]) {
  for (const build of builders) {
    const found = await loadFrame(build(CRV_FIRST_FRAME));
    if (found) return build;
  }
  return null;
}

async function streamSequence(
  builders: FrameBuilder[],
  onFrames: (frames: HTMLImageElement[], complete: boolean) => void
) {
  const build = await resolveBuilder(builders);
  if (!build) {
    onFrames([], true);
    return;
  }

  const frames: HTMLImageElement[] = [];

  for (
    let start = 0;
    start < CRV_MAX_FRAMES;
    start += CRV_LOAD_BATCH
  ) {
    const batch = await Promise.all(
      Array.from({ length: CRV_LOAD_BATCH }, (_, offset) =>
        loadFrame(build(CRV_FIRST_FRAME + start + offset))
      )
    );

    for (const image of batch) {
      if (!image) {
        onFrames([...frames], true);
        return;
      }
      frames.push(image);
    }

    onFrames([...frames], false);
  }

  onFrames([...frames], true);
}

export default function FakeoutChanceReveal() {
  const [state, setState] = useState(getFakeoutChanceRevealState());
  const [hasArtwork, setHasArtwork] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const characterRef = useRef<HTMLImageElement[]>([]);
  const cardRef = useRef<HTMLImageElement[]>([]);
  const completeRef = useRef(false);

  useEffect(() => {
    return subscribeFakeoutChanceReveal(() => {
      setState(getFakeoutChanceRevealState());
    });
  }, []);

  const reveal = state.active ? state : null;

  useEffect(() => {
    if (!reveal) return;

    let cancelled = false;
    let raf = 0;

    completeRef.current = false;
    characterRef.current = [];
    cardRef.current = [];
    setHasArtwork(null);

    if (reveal.character && reveal.cardColor) {
      void Promise.all([
        streamSequence(
          chanceRevealCharacterBuilders(reveal.character),
          (frames) => {
            characterRef.current = frames;
          }
        ),
        streamSequence(
          chanceRevealCardBuilders(reveal.cardColor),
          (frames) => {
            cardRef.current = frames;
          }
        ),
      ]).then(() => {
        if (cancelled) return;
        completeRef.current = true;
        // Both layers are required: a character with no card (or a card
        // floating over nothing) reads as a glitch, so a half-loaded
        // composite renders nothing at all.
        setHasArtwork(
          characterRef.current.length > 0 && cardRef.current.length > 0
        );
      });
    } else {
      completeRef.current = true;
      setHasArtwork(false);
    }

    const context = canvasRef.current?.getContext("2d") ?? null;
    let startedAt = 0;
    let pausedAt = 0;
    let pauseOffset = 0;

    const render = (now: number) => {
      if (cancelled) return;

      const character = characterRef.current;
      const card = cardRef.current;
      const buffered = Math.max(character.length, card.length);
      const ready =
        buffered >= CRV_MIN_BUFFER ||
        (completeRef.current && buffered > 0);

      if (ready && startedAt === 0) startedAt = now;

      // Re-read playback from the store each tick — the subscriber may not
      // have fired yet but the field is always current.
      const playback = getFakeoutChanceRevealState().playback;

      if (startedAt !== 0 && context) {
        let elapsed: number;

        if (playback === "paused") {
          elapsed = pausedAt > 0 ? pausedAt - startedAt : now - startedAt;
        } else if (playback === "resumed") {
          if (pauseOffset === 0 && pausedAt > 0) {
            pauseOffset = now - pausedAt;
          }
          elapsed = now - startedAt - pauseOffset;
        } else {
          elapsed = now - startedAt;
        }

        const wanted = Math.floor(elapsed / CRV_FRAME_MS);

        // Pause at the designated frame.
        if (playback === "playing" && wanted >= CRV_PAUSE_FRAME) {
          pausedAt = startedAt + CRV_PAUSE_FRAME * CRV_FRAME_MS;
          markFakeoutChanceRevealPaused();
        }

        const index =
          playback === "paused"
            ? Math.min(CRV_PAUSE_FRAME, buffered - 1)
            : Math.min(wanted, buffered - 1);

        context.clearRect(0, 0, CRV_FRAME_WIDTH, CRV_FRAME_HEIGHT);

        const charFrame = character[Math.min(index, character.length - 1)];
        if (charFrame) {
          context.drawImage(charFrame, 0, 0, CRV_FRAME_WIDTH, CRV_FRAME_HEIGHT);
        }

        const cardFrame = card[Math.min(index, card.length - 1)];
        if (cardFrame) {
          context.drawImage(cardFrame, 0, 0, CRV_FRAME_WIDTH, CRV_FRAME_HEIGHT);
        }
      }

      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [reveal?.key, reveal?.character, reveal?.cardColor]);

  if (!reveal) return null;

  return (
    <div key={state.key} className="fakeout-chance-reveal" role="img" aria-label="Chance">
      <canvas
        ref={canvasRef}
        className="fakeout-chance-reveal-canvas"
        width={CRV_FRAME_WIDTH}
        height={CRV_FRAME_HEIGHT}
        // No fallback presentation: if either layer is missing the reveal
        // renders nothing rather than a partial composite.
        style={hasArtwork === false ? { visibility: "hidden" } : undefined}
      />
    </div>
  );
}
