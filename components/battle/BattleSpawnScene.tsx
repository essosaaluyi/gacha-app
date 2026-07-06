"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import {
  getRoundInsertState,
  subscribeRoundInsert,
} from "@/lib/battle-pixi/state/roundInsertStore";

type RevealLayerState = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  visible: boolean;
};

type RevealTimeline = {
  startMs: number;
  endMs: number;
};

type RevealPreset = {
  id: string;
  name: string;
  storageKey: string;
  cardImage: string;
  standFrameCount: number;
  idleFrameCount: number;
  standFrameMs: number;
  idleFrameMs: number;
  standStartFrame: number;
  idleStartFrame: number;
  standTransformOrigin: string;
  idleTransformOrigin: string;
  durationMs: number;
  timeline: {
    cardBack: RevealTimeline;
    cardFront: RevealTimeline;
    particle: RevealTimeline;
    burst: RevealTimeline;
    shadow: RevealTimeline;
    stand: RevealTimeline;
    idle: RevealTimeline;
  };
  layers: {
    cardBack: RevealLayerState;
    cardFront: RevealLayerState;
    particle: RevealLayerState;
    burst: RevealLayerState;
    shadow: RevealLayerState;
    stand: RevealLayerState;
    idle: RevealLayerState;
  };
  standFrameSrc: (index: number) => string;
  idleFrameSrc: (index: number) => string;
};

type SpawnStyle = CSSProperties & Record<`--${string}`, string>;

const baseTimeline = {
  cardBack: { startMs: 0, endMs: 1700 },
  cardFront: { startMs: 1700, endMs: 3150 },
  particle: { startMs: 2050, endMs: 3950 },
  burst: { startMs: 2050, endMs: 3550 },
  shadow: { startMs: 2600, endMs: 7600 },
  stand: { startMs: 2600, endMs: 5558 },
  idle: { startMs: 5558, endMs: 7600 },
} satisfies RevealPreset["timeline"];

const mamiLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 154.02, y: 561.22, scale: 1, opacity: 0.95, visible: true },
  stand: { x: 88.2, y: 265.6, scale: 1, opacity: 1, visible: true },
  idle: { x: 56.2, y: 256.4, scale: 1, opacity: 1, visible: true },
} satisfies RevealPreset["layers"];

const r1TripletsBabyDragonLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 174.3, y: 533.49, scale: 1, opacity: 0.95, visible: true },
  stand: { x: 64, y: 234, scale: 1, opacity: 1, visible: true },
  idle: { x: 64, y: 234, scale: 1, opacity: 1, visible: true },
} satisfies RevealPreset["layers"];

const greenScaleDragonLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 159.1, y: 531, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 86.9, y: 277.97, scale: 1, opacity: 1, visible: true },
  idle: { x: 86.9, y: 277.97, scale: 1, opacity: 1, visible: true },
} satisfies RevealPreset["layers"];

const dragonRaiderLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 159.1, y: 531, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 56.3, y: 284.6, scale: 1, opacity: 1, visible: true },
  idle: { x: 56.3, y: 284.6, scale: 1, opacity: 1, visible: true },
} satisfies RevealPreset["layers"];

const revealPresets = {
  mami: {
    id: "mami",
    name: "Mami",
    storageKey: "mami-layer-workstation-timeline-v3",
    cardImage: "/images/cards/player/UR1/card.webp",
    standFrameCount: 87,
    idleFrameCount: 90,
    standFrameMs: 34,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 82%",
    idleTransformOrigin: "50% 82%",
    durationMs: 7600,
    timeline: baseTimeline,
    layers: mamiLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/mami/stand/${index
        .toString()
        .padStart(4, "0")}.webp`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/mami/idle/Sequence${index
        .toString()
        .padStart(2, "0")}.webp`,
  },
  r1TripletsBabyDragon: {
    id: "r1-triplets-baby-dragon",
    name: "Triplets Baby Dragon",
    storageKey: "r1-triplets-baby-dragon-layer-workstation-timeline-v2",
    cardImage: "/images/cards/player/R1/card.webp",
    standFrameCount: 82,
    idleFrameCount: 173,
    standFrameMs: 36,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 110,
    standTransformOrigin: "50% 82%",
    idleTransformOrigin: "50% 82%",
    durationMs: 7600,
    timeline: baseTimeline,
    layers: r1TripletsBabyDragonLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/r1-triplets-baby-dragon/stand/${index
        .toString()
        .padStart(3, "0")}.webp`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/r1-triplets-baby-dragon/idle/${index
        .toString()
        .padStart(4, "0")}.webp`,
  },
  greenScaleDragon: {
    id: "green-scale-dragon",
    name: "Green Scale Dragon",
    storageKey: "green-scale-dragon-layer-workstation-timeline-v3",
    cardImage: "/images/cards/player/R2/card.webp",
    standFrameCount: 90,
    idleFrameCount: 138,
    standFrameMs: 33,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 82%",
    idleTransformOrigin: "50% 82%",
    durationMs: 7600,
    timeline: baseTimeline,
    layers: greenScaleDragonLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/green-scale-dragon/stand/${index
        .toString()
        .padStart(3, "0")}.webp`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/green-scale-dragon/idle/${index
        .toString()
        .padStart(4, "0")}.webp`,
  },
  dragonRaider: {
    id: "dragon-raider",
    name: "Dragon Raider",
    storageKey: "dragon-raider-layer-workstation-timeline-v1",
    cardImage: "/images/cards/player/R3/card.webp",
    standFrameCount: 83,
    idleFrameCount: 69,
    standFrameMs: 36,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 82%",
    idleTransformOrigin: "50% 82%",
    durationMs: 7600,
    timeline: baseTimeline,
    layers: dragonRaiderLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/dragon-raider/stand/${index
        .toString()
        .padStart(3, "0")}.webp`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/dragon-raider/idle/${index
        .toString()
        .padStart(3, "0")}.webp`,
  },
} satisfies Record<string, RevealPreset>;

const activeRevealPreset = revealPresets.dragonRaider;

function loadSavedPreset(preset: RevealPreset) {
  if (typeof window === "undefined") {
    return preset;
  }

  const saved = window.localStorage.getItem(preset.storageKey);
  if (!saved) {
    return preset;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<{
      frames: Partial<{
        sampledStandFrame: number;
        sampledIdleFrame: number;
      }>;
      durationMs: number;
      timeline: Partial<RevealPreset["timeline"]>;
      layers: Partial<RevealPreset["layers"]>;
    }>;

    return {
      ...preset,
      standStartFrame:
        parsed.frames?.sampledStandFrame ?? preset.standStartFrame,
      idleStartFrame: parsed.frames?.sampledIdleFrame ?? preset.idleStartFrame,
      durationMs: parsed.durationMs ?? preset.durationMs,
      timeline: {
        ...preset.timeline,
        ...parsed.timeline,
      },
      layers: {
        ...preset.layers,
        ...parsed.layers,
      },
    };
  } catch {
    window.localStorage.removeItem(preset.storageKey);
    return preset;
  }
}

function toPercentX(value: number) {
  return `${(value / 1280) * 100}%`;
}

function toPercentY(value: number) {
  return `${(value / 720) * 100}%`;
}

function getPresetStyle(preset: RevealPreset): SpawnStyle {
  return {
    "--battle-spawn-duration": `${preset.durationMs}ms`,
    "--battle-spawn-card-left": toPercentX(preset.layers.cardBack.x),
    "--battle-spawn-card-top": toPercentY(preset.layers.cardBack.y),
    "--battle-spawn-particle-left": toPercentX(preset.layers.particle.x),
    "--battle-spawn-particle-top": toPercentY(preset.layers.particle.y),
    "--battle-spawn-particle-scale": `${preset.layers.particle.scale}`,
    "--battle-spawn-burst-left": toPercentX(preset.layers.burst.x),
    "--battle-spawn-burst-top": toPercentY(preset.layers.burst.y),
    "--battle-spawn-burst-scale": `${preset.layers.burst.scale}`,
    "--battle-spawn-burst-opacity": `${preset.layers.burst.opacity}`,
    "--battle-spawn-shadow-left": toPercentX(preset.layers.shadow.x),
    "--battle-spawn-shadow-top": toPercentY(preset.layers.shadow.y),
    "--battle-spawn-shadow-scale": `${preset.layers.shadow.scale}`,
    "--battle-spawn-shadow-opacity": `${preset.layers.shadow.opacity}`,
    "--battle-spawn-stand-left": toPercentX(preset.layers.stand.x),
    "--battle-spawn-stand-top": toPercentY(preset.layers.stand.y),
    "--battle-spawn-stand-scale": `${preset.layers.stand.scale}`,
    "--battle-spawn-stand-opacity": `${preset.layers.stand.opacity}`,
    "--battle-spawn-stand-origin": preset.standTransformOrigin,
    "--battle-spawn-idle-left": toPercentX(preset.layers.idle.x),
    "--battle-spawn-idle-top": toPercentY(preset.layers.idle.y),
    "--battle-spawn-idle-scale": `${preset.layers.idle.scale}`,
    "--battle-spawn-idle-opacity": `${preset.layers.idle.opacity}`,
    "--battle-spawn-idle-origin": preset.idleTransformOrigin,
  };
}

function CharacterSequence({
  name,
  preset,
}: {
  name: string;
  preset: RevealPreset;
}) {
  const [phase, setPhase] = useState<"hidden" | "stand" | "idle">("hidden");
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = 0;
    const startTime = performance.now();

    const tick = () => {
      if (cancelled) return;

      const elapsed = performance.now() - startTime;

      if (elapsed < preset.timeline.stand.startMs) {
        setPhase("hidden");
        setFrameIndex(0);
      } else if (elapsed < preset.timeline.idle.startMs) {
        const standElapsed = elapsed - preset.timeline.stand.startMs;
        setPhase("stand");
        setFrameIndex(
          Math.min(
            preset.standFrameCount - 1,
            preset.standStartFrame +
              Math.floor(standElapsed / preset.standFrameMs)
          )
        );
      } else {
        const idleElapsed = elapsed - preset.timeline.idle.startMs;
        setPhase("idle");
        setFrameIndex(
          (preset.idleStartFrame +
            Math.floor(idleElapsed / preset.idleFrameMs)) %
            preset.idleFrameCount
        );
      }

      timeoutId = window.setTimeout(tick, 1000 / 30);
    };

    tick();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [preset]);

  if (phase === "hidden") {
    return null;
  }

  const frame =
    phase === "idle"
      ? preset.idleFrameSrc(frameIndex)
      : preset.standFrameSrc(frameIndex);

  return (
    <div
      className={`battle-spawn-character-slot battle-spawn-character-${phase}`}
      aria-label={name}
    >
      <img className="battle-spawn-character" src={frame} alt="" />
    </div>
  );
}

function SpawnActor({
  side,
  cardImage,
  name,
  preset,
}: {
  side: "player" | "enemy";
  cardImage: string;
  name: string;
  preset: RevealPreset;
}) {
  return (
    <div
      className={`battle-spawn-actor battle-spawn-actor-${side}`}
      style={side === "player" ? getPresetStyle(preset) : undefined}
    >
      <div className="battle-spawn-ground" />

      <div className="battle-spawn-card" aria-label={`${name} spawn card`}>
        <img
          className="battle-spawn-card-back"
          src="/images/card-back.webp"
          alt=""
        />
        <img
          className="battle-spawn-card-front"
          src={cardImage}
          alt={`${name} card`}
        />
      </div>

      <div className="battle-spawn-light" />
      <div className="battle-spawn-particle-sprite" />
      <div className="battle-spawn-white-burst" />
      <div className="battle-spawn-character-shadow" />

      <CharacterSequence name={name} preset={preset} />
    </div>
  );
}

export default function BattleSpawnScene() {
  const [spawnReady, setSpawnReady] = useState(false);
  const [resolvedPreset] = useState<RevealPreset>(() =>
    loadSavedPreset(activeRevealPreset)
  );

  useEffect(() => {
    let fallbackTimer = window.setTimeout(() => {
      setSpawnReady(true);
    }, 2300);

    const unsubscribeRoundInsert = subscribeRoundInsert(() => {
      const nextState = getRoundInsertState();

      if (nextState.visible) {
        setSpawnReady(false);
        window.clearTimeout(fallbackTimer);
        fallbackTimer = window.setTimeout(() => {
          setSpawnReady(true);
        }, 1900);
      }
    });

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribeRoundInsert();
    };
  }, []);

  const playerName = resolvedPreset.name;
  const playerCardImage = resolvedPreset.cardImage;

  if (!spawnReady) {
    return null;
  }

  return (
    <div className="battle-spawn-scene" aria-label="Battle spawn scene">
      <div className="battle-spawn-camera">
        <SpawnActor
          side="player"
          cardImage={playerCardImage}
          name={playerName}
          preset={resolvedPreset}
        />
      </div>
      <div className="battle-spawn-dust battle-spawn-dust-left" />
    </div>
  );
}
