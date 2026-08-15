"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";

import {
  getRoundInsertState,
  subscribeRoundInsert,
} from "@/lib/battle-pixi/state/roundInsertStore";
import {
  getBattleCutIn,
  subscribeBattleCutIn,
} from "@/lib/battle-pixi/state/battleCutInStore";
import { playSfx } from "@/lib/audio/sfxStore";
import {
  getCurrentEnemy,
  subscribeCurrentEnemy,
} from "@/lib/battle-pixi/state/currentEnemyStore";
import type { EnemyId } from "@/lib/battle-pixi/config/enemyConfig";
import {
  battleEnemies,
  type BattleEnemy,
} from "@/lib/battle-pixi/config/enemyConfig";
import {
  getEnemyCharacterName,
  getPlayerCharacterName,
} from "@/lib/battle-pixi/config/characterNames";
import {
  getCurrentPlayerBattleCard,
  subscribePlayerBattleCard,
} from "@/lib/battle-pixi/state/playerBattleCardStore";
import {
  normalizeSavedRevealLayers,
  type RevealLayerMap,
  type SavedRevealLayers,
} from "./revealPresetSafety";

type RevealTimeline = {
  startMs: number;
  endMs: number;
};

type RevealPreset = {
  id: string;
  name: string;
  storageKey: string;
  cardImage: string;
  characterFrameWidth?: number;
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
  layers: RevealLayerMap;
  standFrameSrc: (index: number) => string;
  idleFrameSrc: (index: number) => string;
  /** True when no character sequence exists yet and card art is the identity-safe fallback. */
  staticCardFallback?: boolean;
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

const youngKnightLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 159.1, y: 531, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 68.03, y: 288.87, scale: 1.09, opacity: 1, visible: true },
  idle: { x: 68.03, y: 288.87, scale: 1.09, opacity: 1, visible: true },
} satisfies RevealPreset["layers"];

const necroRunnerLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 159.1, y: 531, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 68.03, y: 288.87, scale: 1.35, opacity: 1, visible: true },
  idle: { x: 68.03, y: 288.87, scale: 1.35, opacity: 1, visible: true },
} satisfies RevealPreset["layers"];

// SR4 Night Crawler. Only an idle sequence was authored, so stand and idle
// both read from it — the same arrangement vigilante and necro-runner use.
// Layer placement starts from the necro-runner values (same 960x960 frame
// size) and is retunable in the layer workstation via the storage key below.
const nightCrawlerLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 159.1, y: 531, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 68.03, y: 288.87, scale: 1.35, opacity: 1, visible: true },
  idle: { x: 68.03, y: 288.87, scale: 1.35, opacity: 1, visible: true },
} satisfies RevealPreset["layers"];

const redTornDragonLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 188, y: 542, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: 59, y: 362, scale: 1.3, opacity: 1, visible: true },
  idle: { x: 59, y: 362, scale: 1.3, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const redTornDragonTimeline = {
  ...baseTimeline,
  stand: { startMs: 2600, endMs: 7600 },
  idle: { startMs: 7600, endMs: 7600 },
} satisfies RevealPreset["timeline"];

const vigilanteLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 158.66, y: 543.34, scale: 1.25, opacity: 0.95, visible: true },
  stand: { x: -401, y: 70, scale: 0.3893, opacity: 1, visible: true },
  idle: { x: -401, y: 70, scale: 0.3893, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const vigilanteTimeline = {
  ...baseTimeline,
  stand: { startMs: 2600, endMs: 7600 },
  idle: { startMs: 7600, endMs: 7600 },
} satisfies RevealPreset["timeline"];

const thunderDragonLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 185, y: 542, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -328.13, y: 2.8, scale: 0.6, opacity: 1, visible: true },
  idle: { x: -328.13, y: 2.8, scale: 0.6, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const thunderDragonTimeline = {
  ...baseTimeline,
  stand: { startMs: 2600, endMs: 7600 },
  idle: { startMs: 7600, endMs: 7600 },
} satisfies RevealPreset["timeline"];

const bloodManLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 185, y: 542, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -310, y: 11, scale: 0.42, opacity: 1, visible: true },
  idle: { x: -310, y: 11, scale: 0.42, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const bloodManTimeline = {
  ...baseTimeline,
  stand: { startMs: 2600, endMs: 7600 },
  idle: { startMs: 7600, endMs: 7600 },
} satisfies RevealPreset["timeline"];

const ghostOfEmperorLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 185, y: 542, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -310, y: 1, scale: 0.483, opacity: 1, visible: true },
  idle: { x: -310, y: 1, scale: 0.483, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const ghostOfEmperorTimeline = {
  ...baseTimeline,
  stand: { startMs: 2600, endMs: 7600 },
  idle: { startMs: 7600, endMs: 7600 },
} satisfies RevealPreset["timeline"];

const whiteKnightLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 147.67, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -245.27, y: -51.8, scale: 0.45, opacity: 1, visible: true },
  idle: { x: -225, y: 25, scale: 0.45, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const whiteKnightTimeline = {
  ...baseTimeline,
  stand: { startMs: 2600, endMs: 7600 },
  idle: { startMs: 7600, endMs: 7600 },
} satisfies RevealPreset["timeline"];

const doubleStrikerLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -82.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 147.67, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -245.27, y: -51.8, scale: 0.36, opacity: 1, visible: true },
  idle: { x: -245.27, y: -51.8, scale: 0.36, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const doubleStrikerTimeline = {
  ...baseTimeline,
  stand: { startMs: 2600, endMs: 7600 },
  idle: { startMs: 7600, endMs: 7600 },
} satisfies RevealPreset["timeline"];

const brokenDollLayers = {
  cardBack: { x: 142, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 142, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: -29.2, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 132.6, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 147.67, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: -245.27, y: -51.8, scale: 0.306, opacity: 1, visible: true },
  idle: { x: -245.27, y: -51.8, scale: 0.306, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const brokenDollTimeline = {
  ...baseTimeline,
  stand: { startMs: 2600, endMs: 7600 },
  idle: { startMs: 7600, endMs: 7600 },
} satisfies RevealPreset["timeline"];

const enemyOneLayers = {
  cardBack: { x: 968, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 968, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: 800.8, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 957.4, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 967.63, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: 850.07, y: 204.2, scale: 1.02, opacity: 1, visible: true },
  idle: { x: 1045.27, y: -51.8, scale: 1.02, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const enemyOnePreset = {
  id: "enemy-one",
  name: "Enemy 1",
  storageKey: "enemy-one-layer-workstation-timeline-v3",
  cardImage: "/images/cards/enemy/enemy1/card.webp",
  // Match the workstation's intended on-stage canvas size. The PNG source is
  // 960px wide, but the reveal layout is authored at this display width.
  characterFrameWidth: 430,
  standFrameCount: 121,
  idleFrameCount: 121,
  standFrameMs: 40,
  idleFrameMs: 40,
  standStartFrame: 0,
  idleStartFrame: 0,
  standTransformOrigin: "50% 50%",
  idleTransformOrigin: "50% 50%",
  durationMs: 7600,
  timeline: {
    ...baseTimeline,
    stand: { startMs: 2600, endMs: 7600 },
    idle: { startMs: 7600, endMs: 7600 },
  },
  layers: enemyOneLayers,
  standFrameSrc: (index: number) =>
    `/images/battle-characters/enemy-one/idle/${index
      .toString()
      .padStart(4, "0")}.png`,
  idleFrameSrc: (index: number) =>
    `/images/battle-characters/enemy-one/idle/${index
      .toString()
      .padStart(4, "0")}.png`,
} satisfies RevealPreset;

const enemyTwoLayers = {
  cardBack: { x: 968, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 968, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: 800.8, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 957.4, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 967.63, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: 865, y: 220.2, scale: 0.95, opacity: 1, visible: true },
  idle: { x: 1045.27, y: -51.8, scale: 0.95, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const enemyTwoPreset = {
  id: "enemy-two",
  name: "Enemy 2",
  storageKey: "enemy-two-layer-workstation-timeline-v1",
  cardImage: "/images/cards/enemy/enemy2/card.webp",
  characterFrameWidth: 430,
  standFrameCount: 120,
  idleFrameCount: 120,
  standFrameMs: 40,
  idleFrameMs: 40,
  standStartFrame: 0,
  idleStartFrame: 0,
  standTransformOrigin: "50% 50%",
  idleTransformOrigin: "50% 50%",
  durationMs: 7600,
  timeline: {
    ...baseTimeline,
    stand: { startMs: 2600, endMs: 7600 },
    idle: { startMs: 7600, endMs: 7600 },
  },
  layers: enemyTwoLayers,
  standFrameSrc: (index: number) =>
    `/images/battle-characters/enemy-two/idle/${index
      .toString()
      .padStart(4, "0")}.png`,
  idleFrameSrc: (index: number) =>
    `/images/battle-characters/enemy-two/idle/${index
      .toString()
      .padStart(4, "0")}.png`,
} satisfies RevealPreset;

// Enemy 4 starts from the verified Enemy 2 right-side layout. Its workstation
// storage is intentionally separate so later placement tuning stays isolated.
const enemyFourLayers = {
  cardBack: { x: 968, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 968, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: 800.8, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 957.4, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 967.63, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: 850.07, y: 204.2, scale: 0.816, opacity: 1, visible: true },
  idle: { x: 1045.27, y: -51.8, scale: 0.816, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const enemyFourPreset = {
  id: "enemy-four",
  name: "Enemy 4",
  storageKey: "enemy-four-layer-workstation-timeline-v1",
  cardImage: "/images/cards/enemy/enemy4/card.webp",
  characterFrameWidth: 430,
  standFrameCount: 122,
  idleFrameCount: 122,
  standFrameMs: 40,
  idleFrameMs: 40,
  standStartFrame: 0,
  idleStartFrame: 0,
  standTransformOrigin: "50% 50%",
  idleTransformOrigin: "50% 50%",
  durationMs: 7600,
  timeline: {
    ...baseTimeline,
    stand: { startMs: 2600, endMs: 7600 },
    idle: { startMs: 7600, endMs: 7600 },
  },
  layers: enemyFourLayers,
  standFrameSrc: (index: number) =>
    `/images/battle-characters/enemy-four/idle/${index
      .toString()
      .padStart(4, "0")}.png`,
  idleFrameSrc: (index: number) =>
    `/images/battle-characters/enemy-four/idle/${index
      .toString()
      .padStart(4, "0")}.png`,
} satisfies RevealPreset;

// Enemy 6 inherits the established right-side enemy reveal layout. Its
// workstation storage stays independent so placement work never overwrites
// the Enemy 4 preset.
const enemySixLayers = {
  cardBack: { x: 968, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 968, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: 800.8, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 957.4, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 967.63, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: 850.07, y: 204.2, scale: 0.816, opacity: 1, visible: true },
  idle: { x: 1045.27, y: -51.8, scale: 0.816, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const enemySixPreset = {
  id: "enemy-six",
  name: "Enemy 6",
  storageKey: "enemy-six-layer-workstation-timeline-v1",
  cardImage: "/images/cards/enemy/enemy6/card.webp",
  characterFrameWidth: 430,
  standFrameCount: 122,
  idleFrameCount: 122,
  standFrameMs: 40,
  idleFrameMs: 40,
  standStartFrame: 0,
  idleStartFrame: 0,
  standTransformOrigin: "50% 50%",
  idleTransformOrigin: "50% 50%",
  durationMs: 7600,
  timeline: {
    ...baseTimeline,
    stand: { startMs: 2600, endMs: 7600 },
    idle: { startMs: 7600, endMs: 7600 },
  },
  layers: enemySixLayers,
  standFrameSrc: (index: number) =>
    `/images/battle-characters/enemy-six/idle/${index
      .toString()
      .padStart(4, "0")}.png`,
  idleFrameSrc: (index: number) =>
    `/images/battle-characters/enemy-six/idle/${index
      .toString()
      .padStart(4, "0")}.png`,
} satisfies RevealPreset;

const enemySevenLayers = {
  cardBack: { x: 968, y: 290, scale: 1, opacity: 1, visible: true },
  cardFront: { x: 968, y: 290, scale: 1, opacity: 0.62, visible: true },
  particle: { x: 800.8, y: 106.4, scale: 1.2, opacity: 1, visible: true },
  burst: { x: 957.4, y: 315.2, scale: 1, opacity: 0.26, visible: true },
  shadow: { x: 967.63, y: 547.33, scale: 1.35, opacity: 0.95, visible: true },
  stand: { x: 840.47, y: 217, scale: 0.91, opacity: 1, visible: true },
  idle: { x: 1045.27, y: -51.8, scale: 0.91, opacity: 1, visible: false },
} satisfies RevealPreset["layers"];

const enemySevenPreset = {
  id: "enemy-seven",
  name: "Enemy 7",
  storageKey: "enemy-seven-layer-workstation-timeline-v1",
  cardImage: "/images/cards/enemy/enemy7/card.webp",
  characterFrameWidth: 430,
  standFrameCount: 119,
  idleFrameCount: 119,
  standFrameMs: 40,
  idleFrameMs: 40,
  standStartFrame: 0,
  idleStartFrame: 0,
  standTransformOrigin: "50% 50%",
  idleTransformOrigin: "50% 50%",
  durationMs: 7600,
  timeline: {
    ...baseTimeline,
    stand: { startMs: 2600, endMs: 7600 },
    idle: { startMs: 7600, endMs: 7600 },
  },
  layers: enemySevenLayers,
  standFrameSrc: (index: number) =>
    `/images/battle-characters/enemy-seven/idle/${index
      .toString()
      .padStart(4, "0")}.png`,
  idleFrameSrc: (index: number) =>
    `/images/battle-characters/enemy-seven/idle/${index
      .toString()
      .padStart(4, "0")}.png`,
} satisfies RevealPreset;

// Summon animations that have authored frame sequences today. Do not fall
// back to another enemy's sequence: that makes the reveal visibly contradict
// the card and opponent name. Missing sequences use that enemy's own card art
// as a temporary identity-safe visual until a character animation is authored.
const ENEMY_PRESETS_BY_ID: Partial<Record<EnemyId, RevealPreset>> = {
  1: enemyOnePreset,
  2: enemyTwoPreset,
  4: enemyFourPreset,
  6: enemySixPreset,
  7: enemySevenPreset,
};

const enemyCardFallbackLayers = {
  ...enemySevenLayers,
  stand: { ...enemySevenLayers.stand, scale: 0.76 },
  idle: { ...enemySevenLayers.idle, scale: 0.76 },
} satisfies RevealPreset["layers"];

function createEnemyCardFallback(enemy: BattleEnemy): RevealPreset {
  return {
    id: `enemy-${enemy.id}-card-fallback`,
    name: enemy.name,
    storageKey: `enemy-${enemy.id}-card-fallback`,
    cardImage: enemy.image,
    characterFrameWidth: 430,
    standFrameCount: 1,
    idleFrameCount: 1,
    standFrameMs: 1000,
    idleFrameMs: 1000,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 82%",
    idleTransformOrigin: "50% 82%",
    durationMs: 7600,
    timeline: {
      ...baseTimeline,
      stand: { startMs: 2600, endMs: 7600 },
      idle: { startMs: 7600, endMs: 7600 },
    },
    layers: enemyCardFallbackLayers,
    standFrameSrc: () => enemy.image,
    idleFrameSrc: () => enemy.image,
    staticCardFallback: true,
  };
}

const ENEMY_CARD_FALLBACK_PRESETS: Record<EnemyId, RevealPreset> =
  Object.fromEntries(
    (Object.keys(battleEnemies) as unknown as EnemyId[]).map((id) => [
      id,
      createEnemyCardFallback(battleEnemies[id]),
    ])
  ) as Record<EnemyId, RevealPreset>;

function enemyPresetFor(enemy: BattleEnemy | null) {
  if (!enemy) return enemySevenPreset;
  return (
    ENEMY_PRESETS_BY_ID[enemy.id] ?? ENEMY_CARD_FALLBACK_PRESETS[enemy.id]
  );
}

const youngKnightTimeline = {
  ...baseTimeline,
  stand: { startMs: 2600, endMs: 4660 },
  idle: { startMs: 4661, endMs: 7600 },
} satisfies RevealPreset["timeline"];

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
  youngKnight: {
    id: "young-knight",
    name: "Young Knight",
    storageKey: "young-knight-layer-workstation-timeline-v3",
    cardImage: "/images/cards/player/R4/card.webp",
    standFrameCount: 45,
    idleFrameCount: 243,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 82%",
    idleTransformOrigin: "50% 82%",
    durationMs: 7600,
    timeline: youngKnightTimeline,
    layers: youngKnightLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/young-knight/combined/${index
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/young-knight/combined/${(index + 45)
        .toString()
        .padStart(4, "0")}.png`,
  },
  necroRunner: {
    id: "necro-runner",
    name: "Necro Runner",
    storageKey: "necro-runner-layer-workstation-timeline-v1",
    cardImage: "/images/cards/player/SR1/card.webp",
    standFrameCount: 74,
    idleFrameCount: 74,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 82%",
    idleTransformOrigin: "50% 82%",
    durationMs: 7600,
    timeline: baseTimeline,
    layers: necroRunnerLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/necro-runner/idle/${index
        .toString()
        .padStart(3, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/necro-runner/idle/${index
        .toString()
        .padStart(3, "0")}.png`,
  },
  redTornDragon: {
    id: "red-torn-dragon",
    name: "Red Torn Dragon",
    storageKey: "red-torn-dragon-layer-workstation-timeline-v5",
    cardImage: "/images/cards/player/SR2/card.webp",
    standFrameCount: 86,
    idleFrameCount: 86,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 82%",
    idleTransformOrigin: "50% 82%",
    durationMs: 7600,
    timeline: redTornDragonTimeline,
    layers: redTornDragonLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/red-torn-dragon/idle/${index
        .toString()
        .padStart(3, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/red-torn-dragon/idle/${index
        .toString()
        .padStart(3, "0")}.png`,
  },
  vigilante: {
    id: "vigilante",
    name: "Vigilante",
    storageKey: "vigilante-layer-workstation-timeline-v9",
    cardImage: "/images/cards/player/SR3/card.webp",
    characterFrameWidth: 1280,
    standFrameCount: 119,
    idleFrameCount: 119,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 29,
    idleStartFrame: 0,
    standTransformOrigin: "48.75% 50.28%",
    idleTransformOrigin: "48.75% 50.28%",
    durationMs: 7600,
    timeline: vigilanteTimeline,
    layers: vigilanteLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/vigilante/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/vigilante/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
  },
  nightCrawler: {
    id: "night-crawler",
    name: "Night Crawler",
    storageKey: "night-crawler-layer-workstation-timeline-v1",
    cardImage: "/images/cards/player/SR4/card.webp",
    standFrameCount: 104,
    idleFrameCount: 104,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 82%",
    idleTransformOrigin: "50% 82%",
    durationMs: 7600,
    timeline: baseTimeline,
    layers: nightCrawlerLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/night-crawler/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/night-crawler/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
  },
  thunderDragon: {
    id: "thunder-dragon",
    name: "Thunder Dragon",
    storageKey: "thunder-dragon-layer-workstation-timeline-v4",
    cardImage: "/images/cards/player/SSR1/card.webp",
    characterFrameWidth: 1112,
    standFrameCount: 67,
    idleFrameCount: 67,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 7,
    idleStartFrame: 0,
    standTransformOrigin: "48.11% 48.68%",
    idleTransformOrigin: "48.11% 48.68%",
    durationMs: 7600,
    timeline: thunderDragonTimeline,
    layers: thunderDragonLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/thunder-dragon/idle/${index
        .toString()
        .padStart(3, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/thunder-dragon/idle/${index
        .toString()
        .padStart(3, "0")}.png`,
  },
  bloodMan: {
    id: "blood-man",
    name: "Blood Man",
    storageKey: "blood-man-layer-workstation-timeline-v3",
    cardImage: "/images/cards/player/SSR2/card.webp",
    characterFrameWidth: 1120,
    standFrameCount: 100,
    idleFrameCount: 100,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    durationMs: 7600,
    timeline: bloodManTimeline,
    layers: bloodManLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/blood-man/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/blood-man/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
  },
  ghostOfEmperor: {
    id: "ghost-of-emperor",
    name: "Ghost of Emperor",
    storageKey: "ghost-of-emperor-layer-workstation-timeline-v3",
    cardImage: "/images/cards/player/SSR3/card.webp",
    characterFrameWidth: 1120,
    standFrameCount: 124,
    idleFrameCount: 124,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    durationMs: 7600,
    timeline: ghostOfEmperorTimeline,
    layers: ghostOfEmperorLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/ghost-of-emperor/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/ghost-of-emperor/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
  },
  whiteKnight: {
    id: "white-knight",
    name: "White Knight",
    storageKey: "white-knight-layer-workstation-timeline-v1",
    cardImage: "/images/cards/player/SSR4/card.webp",
    characterFrameWidth: 960,
    standFrameCount: 95,
    idleFrameCount: 95,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    durationMs: 7600,
    timeline: whiteKnightTimeline,
    layers: whiteKnightLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/white-knight/idle/${index
        .toString()
        .padStart(3, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/white-knight/idle/${index
        .toString()
        .padStart(3, "0")}.png`,
  },
  doubleStriker: {
    id: "double-striker",
    name: "Double Striker",
    storageKey: "double-striker-layer-workstation-timeline-v1",
    cardImage: "/images/cards/player/UR2/card.webp",
    characterFrameWidth: 960,
    standFrameCount: 124,
    idleFrameCount: 124,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 25,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    durationMs: 7600,
    timeline: doubleStrikerTimeline,
    layers: doubleStrikerLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/double-striker/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/double-striker/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
  },
  brokenDoll: {
    id: "broken-doll",
    name: "Broken Doll",
    storageKey: "broken-doll-layer-workstation-timeline-v1",
    cardImage: "/images/cards/player/UR3/card.webp",
    characterFrameWidth: 960,
    standFrameCount: 124,
    idleFrameCount: 124,
    standFrameMs: 40,
    idleFrameMs: 40,
    standStartFrame: 0,
    idleStartFrame: 0,
    standTransformOrigin: "50% 50%",
    idleTransformOrigin: "50% 50%",
    durationMs: 7600,
    timeline: brokenDollTimeline,
    layers: brokenDollLayers,
    standFrameSrc: (index: number) =>
      `/images/battle-characters/broken-doll/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
    idleFrameSrc: (index: number) =>
      `/images/battle-characters/broken-doll/idle/${index
        .toString()
        .padStart(4, "0")}.png`,
  },
} satisfies Record<string, RevealPreset>;

// The summon preset for whichever card is actually in play. Each preset
// already names its own card art, so the lookup is derived from that instead
// of a second hand-kept list that can drift from the presets above.
const PLAYER_PRESETS_BY_CARD: Record<string, RevealPreset> = Object.fromEntries(
  Object.values(revealPresets).map((preset) => [
    preset.cardImage.split("/").at(-2) ?? preset.id,
    preset,
  ])
);

// Every card now has its own preset; this only catches an unknown card id.
const FALLBACK_REVEAL_PRESET = revealPresets.brokenDoll;

function playerPresetFor(card: { name: string } | null) {
  return (card && PLAYER_PRESETS_BY_CARD[card.name]) ?? FALLBACK_REVEAL_PRESET;
}

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
      layers: SavedRevealLayers;
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
      layers: normalizeSavedRevealLayers(preset.id, preset.layers, parsed.layers),
    };
  } catch {
    window.localStorage.removeItem(preset.storageKey);
    return preset;
  }
}

function toStagePixels(value: number) {
  return `${value}px`;
}

function getPresetStyle(preset: RevealPreset): SpawnStyle {
  return {
    "--battle-spawn-duration": `${preset.durationMs}ms`,
    "--battle-spawn-card-left": toStagePixels(preset.layers.cardBack.x),
    "--battle-spawn-card-top": toStagePixels(preset.layers.cardBack.y),
    "--battle-spawn-particle-left": toStagePixels(preset.layers.particle.x),
    "--battle-spawn-particle-top": toStagePixels(preset.layers.particle.y),
    "--battle-spawn-particle-scale": `${preset.layers.particle.scale}`,
    "--battle-spawn-burst-left": toStagePixels(preset.layers.burst.x),
    "--battle-spawn-burst-top": toStagePixels(preset.layers.burst.y),
    "--battle-spawn-burst-scale": `${preset.layers.burst.scale}`,
    "--battle-spawn-burst-opacity": `${preset.layers.burst.opacity}`,
    "--battle-spawn-shadow-left": toStagePixels(preset.layers.shadow.x),
    "--battle-spawn-shadow-top": toStagePixels(preset.layers.shadow.y),
    "--battle-spawn-shadow-scale": `${preset.layers.shadow.scale}`,
    "--battle-spawn-shadow-opacity": `${preset.layers.shadow.opacity}`,
    "--battle-spawn-stand-left": toStagePixels(preset.layers.stand.x),
    "--battle-spawn-stand-top": toStagePixels(preset.layers.stand.y),
    "--battle-spawn-character-width": `${preset.characterFrameWidth ?? 330}px`,
    "--battle-spawn-stand-scale": `${preset.layers.stand.scale}`,
    "--battle-spawn-stand-opacity": `${preset.layers.stand.opacity}`,
    "--battle-spawn-stand-origin": preset.standTransformOrigin,
    "--battle-spawn-idle-left": toStagePixels(preset.layers.idle.x),
    "--battle-spawn-idle-top": toStagePixels(preset.layers.idle.y),
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
      const standOnly = preset.layers.stand.visible && !preset.layers.idle.visible;

      if (elapsed < preset.timeline.stand.startMs) {
        setPhase("hidden");
        setFrameIndex(0);
      } else if (standOnly) {
        const standElapsed = elapsed - preset.timeline.stand.startMs;
        setPhase("stand");
        setFrameIndex(
          (preset.standStartFrame +
            Math.floor(standElapsed / preset.standFrameMs)) %
            preset.standFrameCount
        );
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
      className={`battle-spawn-character-slot battle-spawn-character-${phase}${
        preset.staticCardFallback ? " battle-spawn-character-card-fallback" : ""
      }`}
      aria-label={name}
    >
      <img
        className="battle-spawn-character"
        src={frame}
        alt=""
        style={{ filter: "none", imageRendering: "auto" }}
      />
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
      style={getPresetStyle(preset)}
    >
      <div className="battle-spawn-ground" />

      <div className="battle-spawn-card" aria-label={`${name} spawn card`}>
        <img
          className="battle-spawn-card-back"
          src={PLAYER_CARD_BACK_IMAGE}
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
      <div
        className="battle-spawn-white-burst"
        style={{ transformOrigin: "center center" }}
      />
      <div className="battle-spawn-character-shadow" />

      <CharacterSequence name={name} preset={preset} />
    </div>
  );
}

export default function BattleSpawnScene() {
  const [spawnReady, setSpawnReady] = useState(false);
  // Persistent fighter layer (requirement 3/4): once the first summon has
  // played, the fighters stay mounted and visible for the rest of the battle.
  // Transient overlays (round inserts, title cut-ins) then only cover them via
  // z-index -- they can never unmount them or replay the 2.6s intro.
  const [summonComplete, setSummonComplete] = useState(false);
  const summonCompleteRef = useRef(false);
  const spawnSessionRef = useRef(0);
  const [resolvedPreset, setResolvedPreset] = useState<RevealPreset>(() =>
    loadSavedPreset(playerPresetFor(getCurrentPlayerBattleCard()))
  );
  const [resolvedEnemyPreset, setResolvedEnemyPreset] = useState<RevealPreset>(() =>
    loadSavedPreset(enemyPresetFor(getCurrentEnemy()))
  );
  // Latest summon duration, read at schedule time so the persistence handoff
  // stays correct without re-subscribing the visibility effect. Synced in an
  // effect rather than during render -- writing a ref while rendering is unsafe
  // under concurrent rendering, where a render can be thrown away or replayed.
  const summonDurationRef = useRef(resolvedPreset.durationMs);

  useEffect(() => {
    summonDurationRef.current = resolvedPreset.durationMs;
  }, [resolvedPreset.durationMs]);

  const summonSePlayedRef = useRef(false);

  const [currentEnemy, setCurrentEnemy] = useState(() => getCurrentEnemy());
  const [playerCard, setPlayerCard] = useState(() => getCurrentPlayerBattleCard());

  useEffect(() => {
    setCurrentEnemy(getCurrentEnemy());
    return subscribeCurrentEnemy(() => setCurrentEnemy(getCurrentEnemy()));
  }, []);

  useEffect(() => {
    setPlayerCard(getCurrentPlayerBattleCard());
    return subscribePlayerBattleCard(() =>
      setPlayerCard(getCurrentPlayerBattleCard())
    );
  }, []);

  // The animation preset for whichever enemy this round actually is.
  const enemyBasePreset = enemyPresetFor(currentEnemy);

  // ...and for whichever card the player is actually fighting with, so the
  // summoned character matches the card art beside it.
  const playerBasePreset = playerPresetFor(playerCard);

  useEffect(() => {
    const syncRevealPresets = () => {
      setResolvedPreset(loadSavedPreset(playerBasePreset));
      setResolvedEnemyPreset(loadSavedPreset(enemyBasePreset));
    };

    syncRevealPresets();

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === playerBasePreset.storageKey ||
        event.key === enemyBasePreset.storageKey
      ) {
        syncRevealPresets();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncRevealPresets);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncRevealPresets);
    };
  }, [enemyBasePreset, playerBasePreset]);

  useEffect(() => {
    let revealTimer: number | null = null;
    let persistTimer: number | null = null;
    let sfxFrame: number | null = null;
    let disposed = false;

    const SPAWN_DEBUG = process.env.NODE_ENV !== "production";

    const logVisibility = (trigger: string, nextReady: boolean) => {
      if (!SPAWN_DEBUG) return;
      console.log(`[spawn-scene] ${trigger}`, {
        spawnReadyNext: nextReady,
        summonComplete: summonCompleteRef.current,
        roundInsertVisible: getRoundInsertState().visible,
        cutInVariant: getBattleCutIn()?.variant ?? null,
        session: spawnSessionRef.current,
      });
    };

    // Requirement 5: a delayed intro callback can never hide fighters after the
    // summon has completed -- markSummoned latches the persistent layer on.
    const markSummoned = () => {
      if (disposed || summonCompleteRef.current) return;
      summonCompleteRef.current = true;
      setSummonComplete(true);
      if (SPAWN_DEBUG) {
        console.log("[spawn-scene] summon-complete -> fighters persistent", {
          session: spawnSessionRef.current,
        });
      }
    };

    const scheduleReveal = (delayMs: number, trigger: string) => {
      if (revealTimer) window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => {
        if (disposed) return;
        spawnSessionRef.current += 1;
        logVisibility(`${trigger}:reveal`, true);
        setSpawnReady(true);
        // Summon cue. This reveal can re-run outside the battle scene (notably
        // during the collection phase); the cue is no longer suppressed here but
        // in sfxStore, which drops cardReveal unless battle or bonus owns the
        // machine — so it sounds on summon and stays out of the pick zone.
        if (!summonSePlayedRef.current) {
          summonSePlayedRef.current = true;
          sfxFrame = window.requestAnimationFrame(() => {
            if (!disposed) playSfx("cardReveal");
          });
        }
        // Hand off to the persistent fighter layer once the intro has run.
        if (persistTimer) window.clearTimeout(persistTimer);
        persistTimer = window.setTimeout(markSummoned, summonDurationRef.current);
      }, delayMs);
    };

    const syncSpawnVisibility = () => {
      // Once the first summon completes, ignore overlay toggles entirely: the
      // fighter layer stays up and the overlays cover it (requirement 1/2/3/4).
      if (summonCompleteRef.current) {
        logVisibility("persistent-ignore", true);
        return;
      }

      const roundInsert = getRoundInsertState();
      const titleInsert = getBattleCutIn();

      if (roundInsert.visible) {
        if (revealTimer) window.clearTimeout(revealTimer);
        logVisibility("round-insert-hide", false);
        setSpawnReady(false);
        return;
      }

      if (titleInsert?.variant === "title") {
        logVisibility("title-insert-hold", false);
        setSpawnReady(false);
        scheduleReveal(titleInsert.durationMs, "title-insert");
        return;
      }
    };

    syncSpawnVisibility();
    const handleRoundIntroComplete = () => {
      if (summonCompleteRef.current) return;
      scheduleReveal(0, "round-intro-complete");
    };
    const unsubscribeRoundInsert = subscribeRoundInsert(syncSpawnVisibility);
    const unsubscribeCutIn = subscribeBattleCutIn(syncSpawnVisibility);
    window.addEventListener("battle:round-intro-complete", handleRoundIntroComplete);

    return () => {
      disposed = true;
      if (revealTimer) window.clearTimeout(revealTimer);
      if (persistTimer) window.clearTimeout(persistTimer);
      if (sfxFrame) window.cancelAnimationFrame(sfxFrame);
      unsubscribeRoundInsert();
      unsubscribeCutIn();
      window.removeEventListener("battle:round-intro-complete", handleRoundIntroComplete);
    };
  }, []);

  // Identity (card art + name) comes from live battle state so the summon
  // matches the enemy the round insert announced and the card the player is
  // actually fighting with. The animation frames still come from the preset --
  // per-character frame sequences only exist for the presets so far, so the
  // preset stays the visual fallback until those are authored.
  const playerName = playerCard
    ? getPlayerCharacterName(playerCard).label
    : resolvedPreset.name;
  const playerCardImage = playerCard?.image ?? resolvedPreset.cardImage;
  const enemyName = currentEnemy
    ? getEnemyCharacterName(currentEnemy).label
    : resolvedEnemyPreset.name;
  const enemyCardImage = currentEnemy?.image ?? resolvedEnemyPreset.cardImage;

  // Persistent layer stays mounted after the first summon; only the pre-summon
  // window can render nothing.
  if (!spawnReady && !summonComplete) {
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
        <SpawnActor
          side="enemy"
          cardImage={enemyCardImage}
          name={enemyName}
          preset={resolvedEnemyPreset}
        />
      </div>
      <div className="battle-spawn-dust battle-spawn-dust-left" />
      <div className="battle-spawn-dust battle-spawn-dust-right" />
    </div>
  );
}
