"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import BattleBackground from "./BattleBackground";
import styles from "./AnimationWorkstation.module.css";
import {
  normalizeSavedRevealLayers,
  type RevealLayerKey as LayerKey,
  type RevealLayerMap,
  type RevealLayerState as LayerState,
  type SavedRevealLayers,
} from "./revealPresetSafety";

type TimelineState = {
  startMs: number;
  endMs: number;
};

type PreviewSide = "player" | "enemy";

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;
const DEFAULT_DURATION_MS = 7600;
const PARTICLE_FRAME_COUNT = 33;

type WorkstationPreset = {
  id: string;
  name: string;
  cardLabel: string;
  cardImage: string;
  characterFrameWidth?: number;
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
  standTransformOrigin?: string;
  idleTransformOrigin?: string;
  standFrameSrc: (frame: number) => string;
  idleFrameSrc: (frame: number) => string;
  defaultLayers: RevealLayerMap;
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

const necroRunnerDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 159.1, y: 531, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 68.03, y: 288.87, scale: 1.35, opacity: 1, visible: true },
  idle: { x: 68.03, y: 288.87, scale: 1.35, opacity: 1, visible: true },
};

const redTornDragonDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 188, y: 542, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 59, y: 362, scale: 1.3, opacity: 1, visible: true },
  idle: { x: 59, y: 362, scale: 1.3, opacity: 1, visible: false },
};

const vigilanteDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 158.66, y: 543.34, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: -401, y: 70, scale: 0.3893, opacity: 1, visible: true },
  idle: { x: -401, y: 70, scale: 0.3893, opacity: 1, visible: false },
};

const thunderDragonDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 185, y: 542, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -328.13, y: 2.8, scale: 0.6, opacity: 1, visible: true },
  idle: { x: -328.13, y: 2.8, scale: 0.6, opacity: 1, visible: false },
};

const bloodManDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 185, y: 542, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -310, y: 11, scale: 0.42, opacity: 1, visible: true },
  idle: { x: -310, y: 11, scale: 0.42, opacity: 1, visible: false },
};

const ghostOfEmperorDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 185, y: 542, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -310, y: 1, scale: 0.483, opacity: 1, visible: true },
  idle: { x: -310, y: 1, scale: 0.483, opacity: 1, visible: false },
};

const whiteKnightDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 147.67, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -245.27, y: -51.8, scale: 0.45, opacity: 1, visible: true },
  idle: { x: -225, y: 25, scale: 0.45, opacity: 1, visible: false },
};

const doubleStrikerDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 147.67, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -245.27, y: -51.8, scale: 0.36, opacity: 1, visible: true },
  idle: { x: -245.27, y: -51.8, scale: 0.36, opacity: 1, visible: false },
};

const brokenDollDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -29.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 147.67, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -245.27, y: -51.8, scale: 0.306, opacity: 1, visible: true },
  idle: { x: -245.27, y: -51.8, scale: 0.306, opacity: 1, visible: false },
};

const enemyOneDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 968, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 968, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: 800.8, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 957.4, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 967.63, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: 850.07, y: 204.2, scale: 1.02, opacity: 1, visible: true },
  idle: { x: 1045.27, y: -51.8, scale: 1.02, opacity: 1, visible: false },
};

const enemyTwoDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 968, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 968, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: 800.8, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 957.4, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 967.63, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: 865, y: 220.2, scale: 0.95, opacity: 1, visible: true },
  idle: { x: 1045.27, y: -51.8, scale: 0.95, opacity: 1, visible: false },
};

const enemyFourDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 968, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 968, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: 800.8, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 957.4, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 967.63, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: 850.07, y: 204.2, scale: 0.816, opacity: 1, visible: true },
  idle: { x: 1045.27, y: -51.8, scale: 0.816, opacity: 1, visible: false },
};

const enemySixDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 968, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 968, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: 800.8, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 957.4, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 967.63, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: 850.07, y: 204.2, scale: 0.816, opacity: 1, visible: true },
  idle: { x: 1045.27, y: -51.8, scale: 0.816, opacity: 1, visible: false },
};

const enemySevenDefaultLayers: Record<LayerKey, LayerState> = {
  cardBack: { x: 968, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 968, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: 800.8, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 957.4, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 967.63, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: 840.47, y: 217, scale: 0.91, opacity: 1, visible: true },
  idle: { x: 1045.27, y: -51.8, scale: 0.91, opacity: 1, visible: false },
};

const workstationPresets: Record<string, WorkstationPreset> = {
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
  necroRunner: {
    id: "necro-runner",
    name: "Necro Runner",
    cardLabel: "SR1 card",
    cardImage: "/images/cards/player/SR1/card.webp",
    standLabel: "SR1 reveal",
    idleLabel: "SR1 idle",
    shadowLabel: "SR1 shadow",
    storageKey: "necro-runner-layer-workstation-timeline-v1",
    standFrameCount: 74,
    idleFrameCount: 74,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/necro-runner/idle/${frame
        .toString()
        .padStart(3, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/necro-runner/idle/${frame
        .toString()
        .padStart(3, "0")}.png`,
    defaultLayers: necroRunnerDefaultLayers,
  },
  redTornDragon: {
    id: "red-torn-dragon",
    name: "Red Torn Dragon",
    cardLabel: "SR2 card",
    cardImage: "/images/cards/player/SR2/card.webp",
    standLabel: "SR2 stand loop",
    idleLabel: "SR2 unused idle",
    shadowLabel: "SR2 shadow",
    storageKey: "red-torn-dragon-layer-workstation-timeline-v5",
    standFrameCount: 86,
    idleFrameCount: 86,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/red-torn-dragon/idle/${frame
        .toString()
        .padStart(3, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/red-torn-dragon/idle/${frame
        .toString()
        .padStart(3, "0")}.png`,
    defaultLayers: redTornDragonDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  vigilante: {
    id: "vigilante",
    name: "Vigilante",
    cardLabel: "SR3 card",
    cardImage: "/images/cards/player/SR3/card.webp",
    characterFrameWidth: 1280,
    standTransformOrigin: "48.75% 50.28%",
    idleTransformOrigin: "48.75% 50.28%",
    standLabel: "SR3 idle-as-stand loop",
    idleLabel: "SR3 unused idle",
    shadowLabel: "SR3 shadow",
    storageKey: "vigilante-layer-workstation-timeline-v9",
    standFrameCount: 119,
    idleFrameCount: 119,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 29,
    idleStartFrame: 0,
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/vigilante/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/vigilante/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: vigilanteDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  thunderDragon: {
    id: "thunder-dragon",
    name: "Thunder Dragon",
    cardLabel: "SSR1 card",
    cardImage: "/images/cards/player/SSR1/card.webp",
    characterFrameWidth: 1112,
    standLabel: "SSR1 idle-as-stand loop",
    idleLabel: "SSR1 unused idle",
    shadowLabel: "SSR1 shadow",
    storageKey: "thunder-dragon-layer-workstation-timeline-v4",
    standFrameCount: 67,
    idleFrameCount: 67,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 7,
    idleStartFrame: 0,
    standTransformOrigin: "48.11% 48.68%",
    idleTransformOrigin: "48.11% 48.68%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/thunder-dragon/idle/${frame
        .toString()
        .padStart(3, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/thunder-dragon/idle/${frame
        .toString()
        .padStart(3, "0")}.png`,
    defaultLayers: thunderDragonDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  bloodMan: {
    id: "blood-man",
    name: "Blood Man",
    cardLabel: "SSR2 card",
    cardImage: "/images/cards/player/SSR2/card.webp",
    characterFrameWidth: 1120,
    standLabel: "SSR2 idle-as-stand loop",
    idleLabel: "SSR2 unused idle",
    shadowLabel: "SSR2 shadow",
    storageKey: "blood-man-layer-workstation-timeline-v3",
    standFrameCount: 100,
    idleFrameCount: 100,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/blood-man/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/blood-man/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: bloodManDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  ghostOfEmperor: {
    id: "ghost-of-emperor",
    name: "Ghost of Emperor",
    cardLabel: "SSR3 card",
    cardImage: "/images/cards/player/SSR3/card.webp",
    characterFrameWidth: 1120,
    standLabel: "SSR3 idle-as-stand loop",
    idleLabel: "SSR3 unused idle",
    shadowLabel: "SSR3 shadow",
    storageKey: "ghost-of-emperor-layer-workstation-timeline-v3",
    standFrameCount: 124,
    idleFrameCount: 124,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/ghost-of-emperor/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/ghost-of-emperor/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: ghostOfEmperorDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  whiteKnight: {
    id: "white-knight",
    name: "White Knight",
    cardLabel: "SSR4 card",
    cardImage: "/images/cards/player/SSR4/card.webp",
    characterFrameWidth: 960,
    standLabel: "SSR4 idle-as-stand loop",
    idleLabel: "SSR4 unused idle",
    shadowLabel: "SSR4 shadow",
    storageKey: "white-knight-layer-workstation-timeline-v1",
    standFrameCount: 95,
    idleFrameCount: 95,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/white-knight/idle/${frame
        .toString()
        .padStart(3, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/white-knight/idle/${frame
        .toString()
        .padStart(3, "0")}.png`,
    defaultLayers: whiteKnightDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  doubleStriker: {
    id: "double-striker",
    name: "Double Striker",
    cardLabel: "UR2 card",
    cardImage: "/images/cards/player/UR2/card.webp",
    characterFrameWidth: 960,
    standLabel: "UR2 idle-as-stand loop",
    idleLabel: "UR2 unused idle",
    shadowLabel: "UR2 shadow",
    storageKey: "double-striker-layer-workstation-timeline-v1",
    standFrameCount: 124,
    idleFrameCount: 124,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 25,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/double-striker/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/double-striker/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: doubleStrikerDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  brokenDoll: {
    id: "broken-doll",
    name: "Broken Doll",
    cardLabel: "UR3 card",
    cardImage: "/images/cards/player/UR3/card.webp",
    characterFrameWidth: 960,
    standLabel: "UR3 idle-as-stand loop",
    idleLabel: "UR3 unused idle",
    shadowLabel: "UR3 shadow",
    storageKey: "broken-doll-layer-workstation-timeline-v1",
    standFrameCount: 124,
    idleFrameCount: 124,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/broken-doll/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/broken-doll/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: brokenDollDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  enemyOne: {
    id: "enemy-one",
    name: "Enemy 1",
    cardLabel: "Enemy 1 card",
    cardImage: "/images/cards/enemy/enemy1/card.webp",
    characterFrameWidth: 430,
    standLabel: "Enemy 1 idle loop",
    idleLabel: "Enemy 1 unused idle",
    shadowLabel: "Enemy 1 shadow",
    storageKey: "enemy-one-layer-workstation-timeline-v3",
    standFrameCount: 121,
    idleFrameCount: 121,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/enemy-one/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/enemy-one/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: enemyOneDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  enemyTwo: {
    id: "enemy-two",
    name: "Enemy 2",
    cardLabel: "Enemy 2 card",
    cardImage: "/images/cards/enemy/enemy2/card.webp",
    characterFrameWidth: 430,
    standLabel: "Enemy 2 idle loop",
    idleLabel: "Enemy 2 unused idle",
    shadowLabel: "Enemy 2 shadow",
    storageKey: "enemy-two-layer-workstation-timeline-v1",
    standFrameCount: 120,
    idleFrameCount: 120,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/enemy-two/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/enemy-two/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: enemyTwoDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  enemyFour: {
    id: "enemy-four",
    name: "Enemy 4",
    cardLabel: "Enemy 4 card",
    cardImage: "/images/cards/enemy/enemy4/card.webp",
    characterFrameWidth: 430,
    standLabel: "Enemy 4 idle loop",
    idleLabel: "Enemy 4 unused idle",
    shadowLabel: "Enemy 4 shadow",
    storageKey: "enemy-four-layer-workstation-timeline-v1",
    standFrameCount: 122,
    idleFrameCount: 122,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/enemy-four/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/enemy-four/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: enemyFourDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  enemySix: {
    id: "enemy-six",
    name: "Enemy 6",
    cardLabel: "Enemy 6 card",
    cardImage: "/images/cards/enemy/enemy6/card.webp",
    characterFrameWidth: 430,
    standLabel: "Enemy 6 idle loop",
    idleLabel: "Enemy 6 unused idle",
    shadowLabel: "Enemy 6 shadow",
    storageKey: "enemy-six-layer-workstation-timeline-v1",
    standFrameCount: 122,
    idleFrameCount: 122,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/enemy-six/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/enemy-six/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: enemySixDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
  enemySeven: {
    id: "enemy-seven",
    name: "Enemy 7",
    cardLabel: "Enemy 7 card",
    cardImage: "/images/cards/enemy/enemy7/card.webp",
    characterFrameWidth: 430,
    standLabel: "Enemy 7 idle loop",
    idleLabel: "Enemy 7 unused idle",
    shadowLabel: "Enemy 7 shadow",
    storageKey: "enemy-seven-layer-workstation-timeline-v1",
    standFrameCount: 119,
    idleFrameCount: 119,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    standFrameSrc: (frame: number) =>
      `/images/battle-characters/enemy-seven/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (frame: number) =>
      `/images/battle-characters/enemy-seven/idle/${frame
        .toString()
        .padStart(4, "0")}.png`,
    defaultLayers: enemySevenDefaultLayers,
    defaultTimeline: {
      cardBack: { startMs: 0, endMs: 1700 },
      cardFront: { startMs: 1700, endMs: 3150 },
      particle: { startMs: 2050, endMs: 3950 },
      burst: { startMs: 2050, endMs: 3550 },
      shadow: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      stand: { startMs: 2600, endMs: DEFAULT_DURATION_MS },
      idle: { startMs: DEFAULT_DURATION_MS, endMs: DEFAULT_DURATION_MS },
    },
  },
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
    const parsed = JSON.parse(saved) as Partial<typeof fallback> & {
      layers?: SavedRevealLayers;
    };

    return {
      layers: normalizeSavedRevealLayers(
        preset.id,
        preset.defaultLayers,
        parsed.layers
      ),
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
  const [previewSide, setPreviewSide] = useState<PreviewSide>("player");
  const activePreset =
    previewSide === "enemy"
      ? workstationPresets.enemySeven
      : workstationPresets.brokenDoll;
  const layerLabels: Record<LayerKey, string> = {
    cardBack: "Card back",
    cardFront: activePreset.cardLabel,
    particle: "Reveal particle",
    burst: "Light burst",
    shadow: activePreset.shadowLabel,
    stand: activePreset.standLabel,
    idle: activePreset.idleLabel,
  };
  const initialState = useMemo(
    () => getInitialState(workstationPresets.brokenDoll),
    []
  );
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
  const [copyLabel, setCopyLabel] = useState("Copy battle-safe values");
  const skipSaveRef = useRef(false);
  const loadedPresetKeyRef = useRef(activePreset.storageKey);

  useEffect(() => {
    if (loadedPresetKeyRef.current === activePreset.storageKey) return;

    const nextState = getInitialState(activePreset);
    loadedPresetKeyRef.current = activePreset.storageKey;
    skipSaveRef.current = true;
    setLayers(nextState.layers);
    setTimeline(nextState.timeline);
    setDurationMs(nextState.durationMs);
    setTimeMs(0);
    setPlaying(false);
    setSelectedLayer("stand");
    setStandFrame(activePreset.standStartFrame);
    setIdleFrame(activePreset.idleStartFrame);
    setParticleFrame(0);
  }, [activePreset]);

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
  }, [activePreset]);

  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    window.localStorage.setItem(
      activePreset.storageKey,
      JSON.stringify({ layers, timeline, durationMs })
    );
  }, [activePreset.storageKey, durationMs, layers, timeline]);

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
        !layers.idle.visible
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
          schemaVersion: 1,
          coordinateSystem: "1280x720 stage, layer top-left X/Y",
          storageKey: activePreset.storageKey,
          note: "Battle-safe workstation export. The battle page reads this preset from the same storage key; every layer has complete X/Y/scale/opacity/visibility values.",
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
      activePreset,
    ]
  );

  const switchPreviewSide = (nextSide: PreviewSide) => {
    if (nextSide === previewSide) return;

    const nextPreset =
      nextSide === "enemy"
        ? workstationPresets.enemySeven
        : workstationPresets.brokenDoll;
    const nextState = getInitialState(nextPreset);

    loadedPresetKeyRef.current = nextPreset.storageKey;
    skipSaveRef.current = true;
    setPreviewSide(nextSide);
    setLayers(nextState.layers);
    setTimeline(nextState.timeline);
    setDurationMs(nextState.durationMs);
    setTimeMs(0);
    setPlaying(false);
    setSelectedLayer("stand");
    setStandFrame(nextPreset.standStartFrame);
    setIdleFrame(nextPreset.idleStartFrame);
    setParticleFrame(0);
  };

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
    window.setTimeout(() => setCopyLabel("Copy battle-safe values"), 1200);
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
    const characterFrameWidth =
      className === styles.characterLayer
        ? activePreset.characterFrameWidth ?? 330
        : undefined;

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
          ...(characterFrameWidth
            ? { "--workstation-character-width": `${characterFrameWidth}px` }
            : {}),
          ...extraStyle,
        } as React.CSSProperties}
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
          <div className={styles.previewTabs} role="tablist" aria-label="Reveal side">
            <button
              type="button"
              role="tab"
              aria-selected={previewSide === "player"}
              className={previewSide === "player" ? styles.previewTabActive : ""}
              onClick={() => switchPreviewSide("player")}
            >
              Player
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={previewSide === "enemy"}
              className={previewSide === "enemy" ? styles.previewTabActive : ""}
              onClick={() => switchPreviewSide("enemy")}
            >
              Enemy
            </button>
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
                <div className={styles.gameplayPlane}>
                {renderImageLayer(
                  "cardBack",
                  "/images/cards/player/card-back-latest.png",
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
                    transformOrigin:
                      activePreset.standTransformOrigin ?? "50% 82%",
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
                  {
                    transformOrigin:
                      activePreset.idleTransformOrigin ?? "50% 82%",
                  },
                  1,
                  1,
                  onionSkin,
                  onionSkin && selectedLayer !== "idle"
                )}
                </div>
                {showGrid ? <div className={styles.grid} /> : null}
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
          <p className={styles.smallNote}>
            Saved automatically for this preset. Battle uses the same 1280x720
            top-left coordinates.
          </p>
          <pre className={styles.output}>{output}</pre>
          <button type="button" onClick={copyValues} className={styles.copyButton}>
            {copyLabel}
          </button>
        </section>
      </aside>
    </main>
  );
}
