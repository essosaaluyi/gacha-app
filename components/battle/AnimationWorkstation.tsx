"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import BattleBackground from "./BattleBackground";
import styles from "./AnimationWorkstation.module.css";

type LayerKey =
  | "cardBack"
  | "cardFront"
  | "particle"
  | "burst"
  | "shadow"
  | "stand"
  | "idle";

type LayerState = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  visible: boolean;
};

type TimelineState = {
  startMs: number;
  endMs: number;
};

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;
const DEFAULT_DURATION_MS = 7600;
const PARTICLE_FRAME_COUNT = 33;

type WorkstationPreset = {
  id: string;
  name: string;
  cardLabel: string;
  cardImage: string;
  standLabel: string;
  idleLabel: string;
  shadowLabel: string;
  storageKey: string;
  standFrameCount: number;
  idleFrameCount: number;
  standFrameMs: number;
  idleFrameMs: number;
  standStartFrame: number;
  idleStartFrame: number;
  standFrameSrc: (frame: number) => string;
  idleFrameSrc: (frame: number) => string;
  defaultLayers: Record<LayerKey, LayerState>;
  defaultTimeline?: Record<LayerKey, TimelineState>;
};

const mamiDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 213.76, y: 502.56, scale: 1, opacity: 0.95, visible: true },
  stand: { x: 88.2, y: 265.6, scale: 1, opacity: 1, visible: true },
  idle: { x: 56.2, y: 256.4, scale: 1, opacity: 1, visible: true },
};

const r1TripletsBabyDragonDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 174.3, y: 533.49, scale: 1, opacity: 0.95, visible: true },
  stand: { x: 64, y: 234, scale: 1, opacity: 1, visible: true },
  idle: { x: 64, y: 234, scale: 1, opacity: 1, visible: true },
};

const greenScaleDragonDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 159.1, y: 531, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 86.9, y: 277.97, scale: 1, opacity: 1, visible: true },
  idle: { x: 86.9, y: 277.97, scale: 1, opacity: 1, visible: true },
};

const dragonRaiderDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 159.1, y: 531, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 56.3, y: 284.6, scale: 1, opacity: 1, visible: true },
  idle: { x: 56.3, y: 284.6, scale: 1, opacity: 1, visible: true },
};

const youngKnightDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 159.1, y: 531, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 68.03, y: 288.87, scale: 1.09, opacity: 1, visible: true },
  idle: { x: 68.03, y: 288.87, scale: 1.09, opacity: 1, visible: true },
};

const workstationPresets = {
  mami: {
    id: "mami",
    name: "Mami",
    cardLabel: "Mami card",
    cardImage: "/images/cards/player/UR1/card.webp",
    standLabel: "Mami stand",
    idleLabel: "Mami idle",
    shadowLabel: "Mami shadow",
    storageKey: "mami-layer-workstation-timeline-v3",
    standFrameCount: 87,
    idleFrameCount: 90,
    standFrameMs: 34,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/mami/stand/${frame
        .toString()
        .padStart(4, "0")}.webp`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/mami/idle/Sequence${frame
        .toString()
        .padStart(2, "0")}.webp`,
    defaultLayers: mamiDefaultLayers,
  },
  r1TripletsBabyDragon: {
    id: "r1-triplets-baby-dragon",
    name: "R1 Triplets Baby Dragon",
    cardLabel: "R1 card",
    cardImage: "/images/cards/player/R1/card.webp",
    standLabel: "R1 stand",
    idleLabel: "R1 idle",
    shadowLabel: "R1 shadow",
    storageKey: "r1-triplets-baby-dragon-layer-workstation-timeline-v2",
    standFrameCount: 82,
    idleFrameCount: 173,
    standFrameMs: 36,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 110,
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/r1-triplets-baby-dragon/stand/${frame
        .toString()
        .padStart(3, "0")}.webp`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/r1-triplets-baby-dragon/idle/${frame
        .toString()
        .padStart(4, "0")}.webp`,
    defaultLayers: r1TripletsBabyDragonDefaultLayers,
  },
  greenScaleDragon: {
    id: "green-scale-dragon",
    name: "Green Scale Dragon",
    cardLabel: "R2 card",
    cardImage: "/images/cards/player/R2/card.webp",
    standLabel: "R2 stand",
    idleLabel: "R2 idle",
    shadowLabel: "R2 shadow",
    storageKey: "green-scale-dragon-layer-workstation-timeline-v3",
    standFrameCount: 90,
    idleFrameCount: 138,
    standFrameMs: 33,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/green-scale-dragon/stand/${frame
        .toString()
        .padStart(3, "0")}.webp`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/green-scale-dragon/idle/${frame
        .toString()
        .padStart(4, "0")}.webp`,
    defaultLayers: greenScaleDragonDefaultLayers,
  },
  dragonRaider: {
    id: "dragon-raider",
    name: "Dragon Raider",
    cardLabel: "R3 card",
    cardImage: "/images/cards/player/R3/card.webp",
    standLabel: "R3 stand",
    idleLabel: "R3 idle",
    shadowLabel: "R3 shadow",
    storageKey: "dragon-raider-layer-workstation-timeline-v1",
    standFrameCount: 83,
    idleFrameCount: 69,
    standFrameMs: 36,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/dragon-raider/stand/${frame
        .toString()
        .padStart(3, "0")}.webp`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/dragon-raider/idle/${frame
        .toString()
        .padStart(3, "0")}.webp`,
    defaultLayers: dragonRaiderDefaultLayers,
  },
  youngKnight: {
    id: "young-knight",
    name: "Young Knight",
    cardLabel: "R4 card",
    cardImage: "/images/cards/player/R4/card.webp",
    standLabel: "R4 stand",
    idleLabel: "R4 idle",
    shadowLabel: "R4 shadow",
    storageKey: "young-knight-layer-workstation-timeline-v3",
    standFrameCount: 45,
    idleFrameCount: 243,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/young-knight/combined/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/young-knight/combined/${(frame + 45)
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: youngKnightDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: 4660 },
      idle: { startMs: 4661, endMs: DEFAULT_DURATION_MS },
    },
  },
} satisfies Record<string, WorkstationPreset>;

const activePreset = workstationPresets.youngKnight;

const layerLabels: Record<LayerKey, string> = {
  cardBack: "Card back",
  cardFront: activePreset.cardLabel,
  particle: "Reveal particle",
  burst: "Light burst",
  shadow: activePreset.shadowLabel,
  stand: activePreset.standLabel,
  idle: activePreset.idleLabel,
};

const defaultTimeline: Record<LayerKey, TimelineState> = {
  cardBack: { startMs: 0, endMs: 1700 },
  cardFront: { startMs: 1700, endMs: 3150 },
  particle: { startMs: 2050, endMs: 3950 },
  burst: { startMs: 2050, endMs: 3550 },
  shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
  stand: { startMs: 2600, endMs: 5558 },
  idle: { startMs: 5558, endMs: DEFAULT_DURATION_MS },
};

function getInitialState(preset: WorkstationPreset) {
  const presetTimeline = preset.defaultTimeline ?? defaultTimeline;
  const fallback = {
    layers: preset.defaultLayers,
    timeline: presetTimeline,
    durationMs: DEFAULT_DURATION_MS,
  };

  if (typeof window === "undefined") return fallback;

  const saved = window.localStorage.getItem(preset.storageKey);
  if (!saved) return fallback;

  try {
    const parsed = JSON.parse(saved) as Partial<typeof fallback>;
    return {
      layers: { ...preset.defaultLayers, ...parsed.layers },
      timeline: { ...presetTimeline, ...parsed.timeline },
      durationMs: parsed.durationMs ?? DEFAULT_DURATION_MS,
    };
  } catch {
    window.localStorage.removeItem(preset.storageKey);
    return fallback;
  }
}

function roundValue(value: number) {
  return Math.round(value * 100) / 100;
}

function frameFromWindow(
  timeMs: number,
  timing: TimelineState,
  frameCount: number,
  loop: boolean
) {
  const duration = Math.max(1, timing.endMs - timing.startMs);
  const elapsed = Math.max(0, timeMs - timing.startMs);

  if (loop) {
    return Math.floor((elapsed / duration) * frameCount) % frameCount;
  }

  return Math.max(
    0,
    Math.min(frameCount - 1, Math.floor((elapsed / duration) * frameCount))
  );
}

function frameFromRuntimeStep(
  timeMs: number,
  timing: TimelineState,
  frameCount: number,
  frameMs: number,
  startFrame: number,
  loop: boolean
) {
  const elapsed = Math.max(0, timeMs - timing.startMs);

  if (loop) {
    return (startFrame + Math.floor(elapsed / frameMs)) % frameCount;
  }

  return Math.min(frameCount - 1, startFrame + Math.floor(elapsed / frameMs));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export default function AnimationWorkstation() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const initialState = useMemo(() => getInitialState(activePreset), []);
  const [layers, setLayers] =
    useState<Record<LayerKey, LayerState>>(initialState.layers);
  const [timeline, setTimeline] =
    useState<Record<LayerKey, TimelineState>>(initialState.timeline);
  const [durationMs, setDurationMs] = useState(initialState.durationMs);
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const animationStartRef = useRef<number | null>(null);
  const pausedAtRef = useRef(0);
  const [selectedLayer, setSelectedLayer] = useState<LayerKey>("stand");
  const [standFrame, setStandFrame] = useState(0);
  const [idleFrame, setIdleFrame] = useState(0);
  const [particleFrame, setParticleFrame] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [onionSkin, setOnionSkin] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy layer values");

  useEffect(() => {
    const frameSources = [
      ...Array.from({ length: activePreset.standFrameCount }, (_, index) =>
        activePreset.standFrameSrc(index)
      ),
      ...Array.from({ length: activePreset.idleFrameCount }, (_, index) =>
        activePreset.idleFrameSrc(index)
      ),
    ];

    const images = frameSources.map((src) => {
      const image = new window.Image();
      image.src = src;
      return image;
    });

    return () => {
      for (const image of images) {
        image.src = "";
      }
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      activePreset.storageKey,
      JSON.stringify({ layers, timeline, durationMs })
    );
  }, [durationMs, layers, timeline]);

  useEffect(() => {
    if (!playing) {
      pausedAtRef.current = timeMs;
      animationStartRef.current = null;
      return;
    }

    let frameId = 0;
    const tick = (now: number) => {
      if (animationStartRef.current === null) {
        animationStartRef.current = now - pausedAtRef.current;
      }

      const nextTime = (now - animationStartRef.current) % durationMs;
      setTimeMs(roundValue(nextTime));
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [durationMs, playing, timeMs]);

  const selected = layers[selectedLayer];
  const selectedTiming = timeline[selectedLayer];
  const isLayerActive = (key: LayerKey) => {
    const timing = timeline[key];
    return timeMs >= timing.startMs && timeMs <= timing.endMs;
  };
  const displayStandFrame = isLayerActive("stand")
    ? frameFromRuntimeStep(
        timeMs,
        timeline.stand,
        activePreset.standFrameCount,
        activePreset.standFrameMs,
        activePreset.standStartFrame,
        false
      )
    : standFrame;
  const displayIdleFrame = isLayerActive("idle")
    ? frameFromRuntimeStep(
        timeMs,
        timeline.idle,
        activePreset.idleFrameCount,
        activePreset.idleFrameMs,
        activePreset.idleStartFrame,
        true
      )
    : idleFrame;
  const displayParticleFrame = isLayerActive("particle")
    ? frameFromWindow(timeMs, timeline.particle, PARTICLE_FRAME_COUNT, false)
    : particleFrame;
  const cardBackFlipProgress = clamp01(
    (timeMs - Math.max(timeline.cardBack.startMs, timeline.cardBack.endMs - 360)) /
      360
  );
  const cardFrontFlipProgress = clamp01(
    (timeMs - timeline.cardFront.startMs) / 360
  );
  const cardBackScaleX = isLayerActive("cardBack")
    ? Math.max(0.06, 1 - cardBackFlipProgress * 0.94)
    : 1;
  const cardFrontScaleX = isLayerActive("cardFront")
    ? Math.max(0.06, cardFrontFlipProgress)
    : 1;
  const characterRevealProgress = isLayerActive("stand")
    ? clamp01((timeMs - timeline.stand.startMs) / 800)
    : 1;
  const characterRevealScale = 0.72 + characterRevealProgress * 0.28;

  const particlePosition = useMemo(() => {
    const column = displayParticleFrame % 6;
    const row = Math.floor(displayParticleFrame / 6);
    return `${column * 20}% ${row * 20}%`;
  }, [displayParticleFrame]);

  const output = useMemo(
    () =>
      JSON.stringify(
        {
          coordinateSystem: "1280x720 stage, layer top-left X/Y",
          note: "These are manual layer-placement values. Apply carefully to matching layer wrappers, not mixed anchor/timing systems.",
          preset: {
            id: activePreset.id,
            name: activePreset.name,
          },
          frames: {
            standFrameCount: activePreset.standFrameCount,
            idleFrameCount: activePreset.idleFrameCount,
            sampledStandFrame: displayStandFrame,
            sampledIdleFrame: displayIdleFrame,
            sampledParticleFrame: displayParticleFrame,
          },
          durationMs,
          timeline,
          layers,
        },
        null,
        2
      ),
    [
      displayIdleFrame,
      displayParticleFrame,
      displayStandFrame,
      durationMs,
      layers,
      timeline,
    ]
  );

  const updateLayer = (key: LayerKey, patch: Partial<LayerState>) => {
    setLayers((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }));
  };

  const updateTiming = (key: LayerKey, patch: Partial<TimelineState>) => {
    setTimeline((current) => {
      const next = {
        ...current[key],
        ...patch,
      };

      return {
        ...current,
        [key]: {
          startMs: Math.max(0, Math.min(next.startMs, durationMs)),
          endMs: Math.max(0, Math.min(next.endMs, durationMs)),
        },
      };
    });
  };

  const startDrag = (event: React.PointerEvent, key: LayerKey) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedLayer(key);

    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const scaleX = STAGE_WIDTH / rect.width;
    const scaleY = STAGE_HEIGHT / rect.height;
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = layers[key];

    const handleMove = (moveEvent: PointerEvent) => {
      updateLayer(key, {
        x: roundValue(initial.x + (moveEvent.clientX - startX) * scaleX),
        y: roundValue(initial.y + (moveEvent.clientY - startY) * scaleY),
      });
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const copyValues = async () => {
    await window.navigator.clipboard.writeText(output);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy layer values"), 1200);
  };

  const resetLayer = () =>
    updateLayer(selectedLayer, activePreset.defaultLayers[selectedLayer]);
  const resetTiming = () =>
    updateTiming(
      selectedLayer,
      (activePreset.defaultTimeline ?? defaultTimeline)[selectedLayer]
    );
  const resetAll = () => {
    setLayers(activePreset.defaultLayers);
    setTimeline(activePreset.defaultTimeline ?? defaultTimeline);
    setDurationMs(DEFAULT_DURATION_MS);
    setTimeMs(0);
    setPlaying(false);
  };

  const renderShadowLayer = () => {
    const layer = layers.shadow;
    if (!layer.visible || !isLayerActive("shadow")) return null;

    return (
      <button
        type="button"
        className={`${styles.stageLayer} ${styles.shadowLayer} ${
          selectedLayer === "shadow" ? styles.stageLayerSelected : ""
        }`}
        style={{
          left: layer.x,
          top: layer.y,
          opacity: layer.opacity,
          transform: `scale(${layer.scale})`,
        }}
        onPointerDown={(event) => startDrag(event, "shadow")}
        onClick={() => setSelectedLayer("shadow")}
        aria-label={`Move ${activePreset.shadowLabel}`}
      />
    );
  };

  const renderImageLayer = (
    key: LayerKey,
    src: string,
    className?: string,
    extraStyle?: React.CSSProperties,
    previewScale = 1,
    previewOpacity = 1,
    forceRender = false,
    ghost = false
  ) => {
    const layer = layers[key];
    if (!layer.visible || (!isLayerActive(key) && !forceRender)) return null;

    // Onion-skin ghost: dim the non-selected character so it reads as a
    // reference to align size/position against.
    const ghostOpacity = ghost ? 0.4 : 1;

    return (
      <button
        type="button"
        className={`${styles.stageLayer} ${
          selectedLayer === key ? styles.stageLayerSelected : ""
        } ${className ?? ""}`}
        style={{
          left: layer.x,
          top: layer.y,
          opacity: layer.opacity * previewOpacity * ghostOpacity,
          transform: `scale(${layer.scale * previewScale})`,
          ...extraStyle,
        }}
        onPointerDown={(event) => startDrag(event, key)}
        onClick={() => setSelectedLayer(key)}
        aria-label={`Move ${layerLabels[key]}`}
      >
        <img src={src} alt="" draggable={false} />
      </button>
    );
  };

  return (
    <main className={styles.workstation}>
      <section className={styles.stageShell}>
        <div className={styles.stageHeader}>
          <div>
            <h1>Layer Placement Workstation</h1>
            <p>Manual 1280x720 placement for {activePreset.name} reveal assets</p>
          </div>
          <div className={styles.stageHeaderActions}>
            <button type="button" onClick={() => setPlaying((value) => !value)}>
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={() => setShowGrid((value) => !value)}>
              {showGrid ? "Grid on" : "Grid off"}
            </button>
            <button type="button" onClick={() => setOnionSkin((value) => !value)}>
              {onionSkin ? "Onion skin on" : "Onion skin off"}
            </button>
            <button type="button" onClick={resetAll}>
              Reset all
            </button>
          </div>
        </div>

        <div className={styles.stageViewport}>
          <div className={styles.battlePreviewStage}>
            <section className={styles.battlePreviewFrame}>
              <div ref={stageRef} className={styles.stage}>
                <BattleBackground />
                {showGrid ? <div className={styles.grid} /> : null}

                {renderImageLayer(
                  "cardBack",
                  "/images/card-back.webp",
                  styles.cardLayer,
                  {
                    transform: `scale(${layers.cardBack.scale}) scaleX(${cardBackScaleX})`,
                  }
                )}
                {renderImageLayer(
                  "cardFront",
                  activePreset.cardImage,
                  styles.cardLayer,
                  {
                    transform: `scale(${layers.cardFront.scale}) scaleX(${cardFrontScaleX})`,
                  },
                  1,
                  cardFrontFlipProgress
                )}
                {renderImageLayer(
                  "particle",
                  "/images/battle-effects/mami-spawn-reveal-particles-sprite.webp",
                  styles.particleLayer,
                  {
                    backgroundPosition: particlePosition,
                  }
                )}
                {layers.burst.visible && isLayerActive("burst") ? (
                  <button
                    type="button"
                    className={`${styles.stageLayer} ${styles.burstLayer} ${
                      selectedLayer === "burst" ? styles.stageLayerSelected : ""
                    }`}
                    style={{
                      left: layers.burst.x,
                      top: layers.burst.y,
                      opacity: layers.burst.opacity,
                      transform: `scale(${layers.burst.scale})`,
                    }}
                    onPointerDown={(event) => startDrag(event, "burst")}
                    onClick={() => setSelectedLayer("burst")}
                    aria-label="Move light burst"
                  />
                ) : null}
                {renderShadowLayer()}
                {renderImageLayer(
                  "stand",
                  activePreset.standFrameSrc(
                    onionSkin ? standFrame : displayStandFrame
                  ),
                  styles.characterLayer,
                  {
                    transformOrigin: "50% 82%",
                  },
                  onionSkin ? 1 : characterRevealScale,
                  onionSkin ? 1 : characterRevealProgress,
                  onionSkin,
                  onionSkin && selectedLayer !== "stand"
                )}
                {renderImageLayer(
                  "idle",
                  activePreset.idleFrameSrc(
                    onionSkin ? idleFrame : displayIdleFrame
                  ),
                  styles.characterLayer,
                  undefined,
                  1,
                  1,
                  onionSkin,
                  onionSkin && selectedLayer !== "idle"
                )}
              </div>
            </section>

            <div className={styles.battlePreviewDeck} />
            <div className={styles.battlePreviewLog}>Battle Log</div>
            <div className={styles.battlePreviewQuit}>Quit Game</div>
          </div>
        </div>
      </section>

      <aside className={styles.controls}>
        <section className={styles.panel}>
          <h2>Timeline</h2>
          <label className={styles.sliderLabel}>
            Time
            <input
              type="range"
              min="0"
              max={durationMs}
              value={timeMs}
              onChange={(event) => {
                const value = Number(event.target.value);
                setPlaying(false);
                pausedAtRef.current = value;
                setTimeMs(value);
              }}
            />
            <span>
              {Math.round(timeMs)} / {durationMs} ms
            </span>
          </label>
          <div className={styles.fields}>
            <label>
              Duration
              <input
                type="number"
                value={durationMs}
                onChange={(event) =>
                  setDurationMs(Math.max(1000, Number(event.target.value)))
                }
              />
            </label>
          </div>
          <div className={styles.timelineRows}>
            {(Object.keys(layerLabels) as LayerKey[]).map((key) => {
              const timing = timeline[key];
              const left = (timing.startMs / durationMs) * 100;
              const width =
                ((timing.endMs - timing.startMs) / durationMs) * 100;

              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.timelineRow} ${
                    selectedLayer === key ? styles.timelineRowActive : ""
                  }`}
                  onClick={() => setSelectedLayer(key)}
                >
                  <span>{layerLabels[key]}</span>
                  <span className={styles.timelineTrack}>
                    <span
                      className={styles.timelineBar}
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(1, width)}%`,
                      }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Layers</h2>
          <div className={styles.layerList}>
            {(Object.keys(layerLabels) as LayerKey[]).map((key) => (
              <div key={key} className={styles.layerItem}>
                <button
                  type="button"
                  className={selectedLayer === key ? styles.activeLayer : ""}
                  onClick={() => setSelectedLayer(key)}
                >
                  {layerLabels[key]}
                </button>
                <input
                  type="checkbox"
                  checked={layers[key].visible}
                  onChange={(event) =>
                    updateLayer(key, { visible: event.target.checked })
                  }
                  aria-label={`${layerLabels[key]} visible`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Character Size</h2>
          <p style={{ margin: "0 0 8px", fontSize: 12, opacity: 0.7 }}>
            Scales the stand and idle frames together so the reveal stays locked.
          </p>
          <div className={styles.fields}>
            <label>
              Size
              <input
                type="range"
                min="0.2"
                max="2"
                step="0.01"
                value={layers.stand.scale}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  updateLayer("stand", { scale: value });
                  updateLayer("idle", { scale: value });
                }}
              />
            </label>
            <label>
              Value
              <input
                type="number"
                step="0.01"
                value={layers.stand.scale}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  updateLayer("stand", { scale: value });
                  updateLayer("idle", { scale: value });
                }}
              />
            </label>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>{layerLabels[selectedLayer]}</h2>
          <div className={styles.fields}>
            <label>
              X
              <input
                type="number"
                value={selected.x}
                onChange={(event) =>
                  updateLayer(selectedLayer, { x: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Y
              <input
                type="number"
                value={selected.y}
                onChange={(event) =>
                  updateLayer(selectedLayer, { y: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Scale
              <input
                type="number"
                step="0.01"
                value={selected.scale}
                onChange={(event) =>
                  updateLayer(selectedLayer, {
                    scale: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Opacity
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={selected.opacity}
                onChange={(event) =>
                  updateLayer(selectedLayer, {
                    opacity: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <div className={styles.buttonRow}>
            <button type="button" onClick={resetLayer}>
              Reset layer
            </button>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>{layerLabels[selectedLayer]} Timing</h2>
          <div className={styles.fields}>
            <label>
              Start ms
              <input
                type="number"
                value={selectedTiming.startMs}
                onChange={(event) =>
                  updateTiming(selectedLayer, {
                    startMs: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              End ms
              <input
                type="number"
                value={selectedTiming.endMs}
                onChange={(event) =>
                  updateTiming(selectedLayer, {
                    endMs: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <div className={styles.buttonRow}>
            <button type="button" onClick={resetTiming}>
              Reset timing
            </button>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Frames</h2>
          <label className={styles.sliderLabel}>
            Stand frame
            <input
              type="range"
              min="0"
              max={activePreset.standFrameCount - 1}
              value={onionSkin ? standFrame : displayStandFrame}
              onChange={(event) => setStandFrame(Number(event.target.value))}
            />
            <span>{onionSkin ? standFrame : displayStandFrame}</span>
          </label>
          <label className={styles.sliderLabel}>
            Idle frame
            <input
              type="range"
              min="0"
              max={activePreset.idleFrameCount - 1}
              value={onionSkin ? idleFrame : displayIdleFrame}
              onChange={(event) => setIdleFrame(Number(event.target.value))}
            />
            <span>{onionSkin ? idleFrame : displayIdleFrame}</span>
          </label>
          <label className={styles.sliderLabel}>
            Particle frame
            <input
              type="range"
              min="0"
              max={PARTICLE_FRAME_COUNT - 1}
              value={displayParticleFrame}
              onChange={(event) => setParticleFrame(Number(event.target.value))}
            />
            <span>{displayParticleFrame}</span>
          </label>
        </section>

        <section className={styles.panel}>
          <h2>Layer Values</h2>
          <pre className={styles.output}>{output}</pre>
          <button type="button" onClick={copyValues} className={styles.copyButton}>
            {copyLabel}
          </button>
        </section>
      </aside>
    </main>
  );
}
