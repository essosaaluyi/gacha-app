"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHANCE_POINTS_FIRST_FRAME,
  CHANCE_POINTS_FRAME_HEIGHT,
  CHANCE_POINTS_FRAME_MS,
  CHANCE_POINTS_FRAME_WIDTH,
  CHANCE_POINTS_LOAD_BATCH,
  CHANCE_POINTS_MAX_FRAMES,
  CHANCE_POINTS_MIN_BUFFER,
  chancePointsNumberBuilders,
  finishChancePointsReveal,
  getChancePointsRevealState,
  subscribeChancePointsReveal,
} from "@/lib/battle-pixi/state/chancePointsRevealStore";

// Absolute backstop: however badly the sequences behave, the overlay closes so
// a reveal can never linger over the field forever.
const MAX_REVEAL_MS = 30_000;

// The acting character is an mp4 now, not a PNG sequence.
//
// The character layer is fully opaque — no alpha anywhere in it — so H.264
// costs it nothing, and the saving is enormous: the fifteen PNG folders were
// 3,379 MB against ~104 MB of video, and a reveal used to fetch 180 separate
// images (~225 MB) before it could start. Only the NUMBER layer still needs a
// real alpha channel, so that one stays a PNG sequence composited on top.
const CHARACTER_VIDEO_BASE = "/videos/points-gain-mp4";

const characterVideoSrc = (cardName: string) =>
  `${CHARACTER_VIDEO_BASE}/${cardName}.mp4`;

// If the artwork is missing entirely, hold the +NP fallback briefly instead of
// flashing it for a single frame.
const EMPTY_SEQUENCE_HOLD_MS = 1200;

type FrameBuilder = (frame: number) => string;

function loadFrame(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** Picks the first path spelling that actually resolves (casing varies). */
async function resolveBuilder(builders: FrameBuilder[]) {
  for (const build of builders) {
    const found = await loadFrame(build(CHANCE_POINTS_FIRST_FRAME));
    if (found) return build;
  }

  return null;
}

/**
 * Streams frames in parallel batches, publishing each batch as it lands and
 * stopping at the first gap. Decoded <img> elements are kept (not just URLs) so
 * the render loop never pays a decode cost mid-playback, and the sequence
 * length is discovered rather than maintained in code.
 *
 * Each batch is gated on its own first frame. Firing all CHANCE_POINTS_LOAD_BATCH
 * requests up front and only then looking for the gap meant the batch that runs
 * past the end wasted a full batch of 404s every single reveal (30 of them, for
 * a 180-frame sequence). The sentinel is a frame the batch needs anyway, so no
 * successful request is duplicated -- the end of the sequence just costs one
 * miss instead of thirty.
 */
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
    start < CHANCE_POINTS_MAX_FRAMES;
    start += CHANCE_POINTS_LOAD_BATCH
  ) {
    // Does this batch exist at all? One request answers it.
    const sentinel = await loadFrame(build(CHANCE_POINTS_FIRST_FRAME + start));

    if (!sentinel) {
      onFrames([...frames], true);
      return;
    }

    frames.push(sentinel);

    // The sentinel covered offset 0, so only fetch the remainder.
    const rest = await Promise.all(
      Array.from({ length: CHANCE_POINTS_LOAD_BATCH - 1 }, (_, offset) =>
        loadFrame(build(CHANCE_POINTS_FIRST_FRAME + start + offset + 1))
      )
    );

    for (const image of rest) {
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

export default function ChancePointsRevealOverlay() {
  const [state, setState] = useState(getChancePointsRevealState());
  const [hasArtwork, setHasArtwork] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);

  // Set when the character mp4 cannot play, which drops this reveal back to the
  // old PNG character sequence. UR3 has no mp4 export yet, so without the
  // fallback its reveal would lose the character entirely.
  const [videoFailed, setVideoFailed] = useState(false);

  // Frame data lives in refs: the render loop reads it every tick, and keeping
  // it out of React state avoids a re-render per loaded batch.
  const characterRef = useRef<HTMLImageElement[]>([]);
  const numberRef = useRef<HTMLImageElement[]>([]);
  const completeRef = useRef(false);

  useEffect(() => {
    return subscribeChancePointsReveal(() => {
      setState(getChancePointsRevealState());
    });
  }, []);

  const reveal = state.active;

  useEffect(() => {
    if (!reveal) return;

    let cancelled = false;
    let raf = 0;

    finishedRef.current = false;
    completeRef.current = false;
    characterRef.current = [];
    numberRef.current = [];
    setHasArtwork(null);

    const finishOnce = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      finishChancePointsReveal();
    };

    // The number layer is always a PNG sequence (it needs alpha). The character
    // layer is mp4 only -- its 15 PNG fallback folders (3.4 GB against ~104 MB
    // of video) have been deleted, so there is nothing to stream if the video
    // fails; the +NP text fallback below covers that case instead.
    const jobs = [
      streamSequence(chancePointsNumberBuilders(reveal.points), (frames) => {
        numberRef.current = frames;
      }),
    ];

    void Promise.all(jobs).then(() => {
      if (cancelled) return;
      completeRef.current = true;
      setHasArtwork(!videoFailed || numberRef.current.length > 0);
    });

    const context = canvasRef.current?.getContext("2d") ?? null;
    let startedAt = 0;

    // Single vsync-aligned loop compositing both layers into one canvas. The
    // frame index is derived from elapsed time rather than incremented, so a
    // dropped tick can never make playback drift or stutter.
    const render = (now: number) => {
      if (cancelled) return;

      const character = characterRef.current;
      const number = numberRef.current;
      const video = videoRef.current;

      // Time source. With the mp4 driving, the number layer is indexed off the
      // video's own clock rather than the wall clock — that is what keeps the
      // two layers locked together if the video stalls or starts late. A wall
      // clock would silently drift the numerals away from the character.
      const videoDriving = !videoFailed && video !== null;

      const buffered = videoDriving
        ? number.length
        : Math.max(character.length, number.length);

      const ready = videoDriving
        ? number.length > 0 || completeRef.current
        : buffered >= CHANCE_POINTS_MIN_BUFFER ||
          (completeRef.current && buffered > 0);

      if (ready && startedAt === 0) startedAt = now;

      if (startedAt !== 0 && context) {
        const wanted = videoDriving
          ? Math.round((video.currentTime * 1000) / CHANCE_POINTS_FRAME_MS)
          : Math.floor((now - startedAt) / CHANCE_POINTS_FRAME_MS);

        // With the video driving, IT owns completion (see onEnded).
        if (!videoDriving && completeRef.current && wanted >= buffered) {
          finishOnce();
          return;
        }

        // Hold at the edge of what has loaded rather than skipping ahead.
        const index = Math.max(0, Math.min(wanted, buffered - 1));

        context.clearRect(
          0,
          0,
          CHANCE_POINTS_FRAME_WIDTH,
          CHANCE_POINTS_FRAME_HEIGHT
        );

        // Only drawn on the fallback path — otherwise the <video> beneath the
        // canvas is the character layer.
        const characterFrame = character[Math.min(index, character.length - 1)];
        if (!videoDriving && characterFrame) {
          context.drawImage(
            characterFrame,
            0,
            0,
            CHANCE_POINTS_FRAME_WIDTH,
            CHANCE_POINTS_FRAME_HEIGHT
          );
        }

        // Straight alpha composite. The number frames carry a real alpha
        // channel (~47% of each frame is fully transparent), so they layer
        // correctly on their own. An earlier version screened them, assuming a
        // black matte from the dark thumbnails — that lightened the numerals
        // against the character sequence and made them look see-through.
        const numberFrame = number[Math.min(index, number.length - 1)];
        if (numberFrame) {
          context.drawImage(
            numberFrame,
            0,
            0,
            CHANCE_POINTS_FRAME_WIDTH,
            CHANCE_POINTS_FRAME_HEIGHT
          );
        }
      }

      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);

    const backstop = window.setTimeout(finishOnce, MAX_REVEAL_MS);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(backstop);
    };
  }, [reveal, state.key, videoFailed]);

  // A fresh reveal always retries the mp4 — a previous card missing its export
  // must not condemn every later reveal to the PNG path.
  useEffect(() => {
    setVideoFailed(false);
  }, [state.key]);

  // Artwork missing entirely: hold the +NP fallback briefly, then close.
  useEffect(() => {
    if (!reveal || hasArtwork !== false) return;

    const timer = window.setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      finishChancePointsReveal();
    }, EMPTY_SEQUENCE_HOLD_MS);

    return () => window.clearTimeout(timer);
  }, [reveal, state.key, hasArtwork]);

  if (!reveal) return null;

  return (
    <div className="chance-points-reveal" key={state.key}>
      {/* Character layer. Muted on purpose: the reward fanfare is an SE, so
          the mix stays under sfxStore's normalisation rather than whatever
          level the video happened to be exported at. */}
      {!videoFailed && (
        <video
          ref={videoRef}
          className="chance-points-reveal-video"
          src={characterVideoSrc(reveal.cardName)}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => {
            if (finishedRef.current) return;
            finishedRef.current = true;
            finishChancePointsReveal();
          }}
          onError={() => setVideoFailed(true)}
        />
      )}

      {/* Number layer, composited on top — it is the one layer that really
          needs an alpha channel. */}
      <canvas
        ref={canvasRef}
        className="chance-points-reveal-canvas"
        width={CHANCE_POINTS_FRAME_WIDTH}
        height={CHANCE_POINTS_FRAME_HEIGHT}
      />

      <div className="chance-points-reveal-fallback">+{reveal.points}P</div>
    </div>
  );
}
