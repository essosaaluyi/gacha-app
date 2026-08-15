"use client";
import { setBattleState } from "@/lib/battle-pixi/state/battleStateStore";
import { revealCard } from "@/lib/battle-pixi/presentation/cardRevealSystem";
import { useEffect, useRef } from "react";
import {
  Application,
  Assets,
  Sprite,
  PerspectiveMesh,
  Container,
  Graphics,
  Rectangle,
  Texture,
} from "pixi.js";

import { STAGE, UI } from "@/lib/battle-pixi/config";
import { PresentationContext } from "@/lib/battle-pixi/presentation/presentationContext";
import { drawBattleResult } from "@/lib/battle-pixi/core/resultLottery";
import { readDrawTell } from "@/lib/battle-pixi/presentation/drawTell";
import { recordDrawOutcome } from "@/lib/battle-pixi/state/drawCostStore";
import {
  animateTo,
  animateTransformTo,
} from "@/lib/battle-pixi/presentation/animations";
import type { AnimationGuard } from "@/lib/battle-pixi/presentation/animations";
import { CABINET_TABLE_DEPTH_SCALE } from "@/lib/battle-pixi/presentation/cabinetTableGeometry";
import {
  playSfx,
  playTripleChanceSurgeSfx,
} from "@/lib/audio/sfxStore";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";
import type { Card } from "@/lib/gacha/pullLogic";
import type { BattleEnemy } from "@/lib/battle-pixi/config/enemyConfig";
import {
  getEnemyCharacterName,
  getPlayerCharacterName,
} from "@/lib/battle-pixi/config/characterNames";
import { addBattleLog } from "@/lib/battle-pixi/state/battleLogStore";
import { evaluateResult } from "@/lib/battle-pixi/core/evaluateResult";
import {
  readCompletedHandFlash,
  readReelTenpai,
} from "@/lib/battle-pixi/core/reelComboRules";
import {
  generateReelTraces,
  seedPointsAroundCard,
  type ReelTrace,
} from "@/lib/battle-pixi/presentation/reelTracePaths";
import {
  clearReelCombo,
  clearReelTenpai,
  showReelTenpai,
} from "@/lib/battle-pixi/state/reelComboStore";

import { setEnemyAttackCounter } from "@/lib/battle-pixi/state/enemyAttackCounterStore";

import { rollAttackAttempt } from "@/lib/battle-pixi/core/attackAttemptSystem";
import { rollFakeoutPresentation } from "@/lib/battle-pixi/core/fakeoutPresentationLottery";
import {
  clearResurrection,
  isResurrectionArmed,
  isResurrectionGlitchPending,
  promoteResurrectionToGlitchPending,
  triggerResurrectionReveal,
} from "@/lib/battle-pixi/state/resurrectionStore";
import { logEvent } from "@/lib/events/gameEventStore";
import { patchConfig } from "@/lib/game-config/patchConfig";

import {
  getAttackFakeoutState,
  startAttackFakeout,
  consumeFakeoutTurn,
  overrideFakeoutToSuccess,
  clearAttackFakeout,
} from "@/lib/battle-pixi/state/attackFakeoutStore";

import {
  isFatalModeActive,
  startFatalMode,
  registerFatalModeHit,
  consumeFatalModeTurn,
} from "@/lib/battle-pixi/state/fatalModeStore";

import {
  isEnemyAttackModeActive,
  startEnemyAttackMode,
  registerPlayerCounter,
  registerEnemyAttackReset,
  consumeEnemyAttackModeTurn,
} from "@/lib/battle-pixi/state/enemyAttackModeStore";
import {
  awardDefenseShield,
  clearDefenseShield,
  consumeDefenseShieldForFatal,
  getDefenseShieldState,
  revealDefenseShield,
  type DefenseShieldGrade,
  type DefenseShieldResolution,
} from "@/lib/battle-pixi/state/defenseShieldStore";

import {
  selectEnemyForRound,
  loadNextRoundEnemy,
  getCurrentEnemy,
} from "@/lib/battle-pixi/state/currentEnemyStore";

import {
  getCurrentRound,
  nextRound,
} from "@/lib/battle-pixi/state/roundStore";

import { showRoundInsert } from "@/lib/battle-pixi/state/roundInsertStore";
import {
  hideAttackLandReveal,
  revealAttackLandWinner,
  startAttackLandStruggle,
} from "@/lib/battle-pixi/state/attackLandRevealStore";
import {
  armPlayerFatalModeOpening,
  cancelPlayerFatalModeOpening,
  startPlayerFatalModeOpening,
} from "@/lib/battle-pixi/state/playerFatalModeOpeningStore";
import {
  getEnemyFaceoffImage,
  getPlayerFaceoffImage,
} from "@/lib/battle-pixi/presentation/attackFaceoffAssets";
import {
  hideFakeoutChanceReveal,
  showFakeoutChanceReveal,
  resumeFakeoutChanceReveal,
  rollChanceRevealColor,
  resolveChanceRevealCast,
  hasChanceRevealAssets,
} from "@/lib/battle-pixi/state/fakeoutChanceRevealStore";

import { rollChancePointsGain } from "@/lib/battle-pixi/state/chancePointsRevealStore";

import { resetBattleCardsToGroup } from "@/lib/battle-pixi/stage/resetBattleCardsToGroup";
import { handleBattleEnemyDefeated } from "@/lib/battle-pixi/stage/handleBattleEnemyDefeated";
import { handleDrawButtonPress } from "@/lib/battle-pixi/stage/handleDrawButtonPress";
import { resolveNestedBonusGame } from "@/lib/battle-pixi/stage/handleNestedBonusDraw";

import {
  consumeArmedBonusPresentation,
  getBonusPresentationState,
  playPendingBonusRevealVideo,
  showQueuedBonusResult,
} from "@/lib/battle-pixi/state/bonusPresentationStore";
import { getBonusModeState } from "@/lib/battle-pixi/state/bonusModeStore";
import {
  isNestedBonusActive,
  getNestedBonusState,
} from "@/lib/battle-pixi/state/nestedBonusStore";
import { initializePlayerBattleCards } from "@/lib/battle-pixi/state/playerBattleCardStore";
import {
  armMagicCircleChanceText,
  hideMagicCircle,
  startEmptyMagicCircleChance,
} from "@/lib/battle-pixi/state/magicCircleStore";
import {
  hideChanceIconOverlay,
  rollChanceIconOverlay,
} from "@/lib/battle-pixi/state/chanceIconOverlayStore";

import {
  loadNextPlayerBattleCard,
  getCurrentPlayerBattleCard,
  getRemainingPlayerBattleCards,
} from "@/lib/battle-pixi/state/playerBattleCardStore";
import {
  clearAttackFakeoutInserts,
  showEnemyAttackFakeoutInsert,
  showPlayerAttackFakeoutInsert,
} from "@/lib/battle-pixi/state/attackFakeoutInsertStore";
import {
  canRequestBattleDraw,
  setBattlePresentationPhase,
  subscribeBattlePresentationFlow,
} from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import {
  showInterruptCutIn,
  showResultCutIn,
} from "@/lib/battle-pixi/presentation/cutInRules";
import {
  beginBarChanceDistortion,
  clearBarChance,
  getBarChanceState,
  revealBarChanceSymbol,
  startBarChance,
} from "@/lib/battle-pixi/state/barChanceStore";
import {
  armFatalWinCabinetSignal,
  beginCabinetDrawSignals,
  clearCabinetTurnSignals,
  getCabinetSignalState,
  notifyCabinetProgress,
  notifyEnemyDefeatResult,
} from "@/lib/battle-pixi/state/cabinetSignalStore";
import { consumeBarBoostGame } from "@/lib/battle-pixi/state/barProgressionStore";

function formatRoundInsertText(round: number) {
  if (round <= 10) {
    return `ROUND ${String(round).padStart(2, "0")}`;
  }

  return `ROUND EXTRA ${round - 10}`;
}

function getRoundEnemyImage(enemyId: string | number) {
  return `/images/round-inserts/enemy${String(enemyId).replace(
    "enemy",
    ""
  )}-round.webp`;
}

type Quad = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

// Calibrated to the three baked card bays in
// card-table-premium-three-bay.webp. Values are in the 1200x500 Pixi plane
// after the cabinet's 0.82 mount scale. Using the artwork's real corners gives
// cards the same strong depth foreshortening as the physical table.
const CABINET_TABLE_SLOT_QUADS: readonly Quad[] = [
  [222, 156, 404, 156, 373, 292, 183, 292],
  [508, 156, 689, 156, 707, 292, 492, 292],
  [796, 156, 977, 156, 1013, 292, 823, 292],
];
// --- Table surface plane ----------------------------------------------------
//
// The bays are calibrated to the table artwork, so their outer side edges are
// the most reliable statement of the table's perspective available: extended
// upward they meet at the table's vanishing point. Everything drawn on the
// surface is placed on the plane those edges define, which is what makes it
// foreshorten with the table instead of lying flat on the screen.

/** Where two infinite lines cross, or null when they are parallel. */
function intersectLines(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
) {
  const a1 = by - ay;
  const b1 = ax - bx;
  const c1 = a1 * ax + b1 * ay;
  const a2 = dy - cy;
  const b2 = cx - dx;
  const c2 = a2 * cx + b2 * cy;
  const determinant = a1 * b2 - a2 * b1;

  if (Math.abs(determinant) < 1e-6) return null;

  return {
    x: (b2 * c1 - b1 * c2) / determinant,
    y: (a1 * c2 - a2 * c1) / determinant,
  };
}

const TABLE_PLANE_TOP_Y = 60;
const TABLE_PLANE_BOTTOM_Y = 500;
// The near edge reaches past the stage sides so the surface has no visible
// seam where it meets the glass.
const TABLE_PLANE_NEAR_LEFT_X = -20;
const TABLE_PLANE_NEAR_RIGHT_X = 1220;

/** Leftmost bay's left edge and rightmost bay's right edge, extended. */
const TABLE_VANISHING_POINT = intersectLines(
  CABINET_TABLE_SLOT_QUADS[0][0], CABINET_TABLE_SLOT_QUADS[0][1],
  CABINET_TABLE_SLOT_QUADS[0][6], CABINET_TABLE_SLOT_QUADS[0][7],
  CABINET_TABLE_SLOT_QUADS[2][2], CABINET_TABLE_SLOT_QUADS[2][3],
  CABINET_TABLE_SLOT_QUADS[2][4], CABINET_TABLE_SLOT_QUADS[2][5]
) ?? { x: 600, y: -1200 };

/**
 * The whole table surface as a quad (TL, TR, BR, BL). The far edge is the near
 * edge scaled toward the vanishing point, so both sides genuinely converge on
 * it and the surface covers the table edge to edge.
 */
const CABINET_TABLE_SURFACE_QUAD: Quad = (() => {
  const farScale =
    (TABLE_PLANE_TOP_Y - TABLE_VANISHING_POINT.y) /
    (TABLE_PLANE_BOTTOM_Y - TABLE_VANISHING_POINT.y);

  const towardVanishing = (x: number) =>
    TABLE_VANISHING_POINT.x + (x - TABLE_VANISHING_POINT.x) * farScale;

  return [
    towardVanishing(TABLE_PLANE_NEAR_LEFT_X), TABLE_PLANE_TOP_Y,
    towardVanishing(TABLE_PLANE_NEAR_RIGHT_X), TABLE_PLANE_TOP_Y,
    TABLE_PLANE_NEAR_RIGHT_X, TABLE_PLANE_BOTTOM_Y,
    TABLE_PLANE_NEAR_LEFT_X, TABLE_PLANE_BOTTOM_Y,
  ];
})();

/**
 * Maps normalised table space to stage pixels. u runs left to right across the
 * surface, v from the far edge (0) to the near edge (1).
 *
 * The top and bottom edges are horizontal and the sides converge on the
 * vanishing point, so interpolating each edge proportionally puts every
 * constant-u line through that vanishing point too — the horizontal direction
 * is properly projective. v stays linear in y on purpose: the cabinet tilts
 * the table with an affine scaleY in the DOM, so the surface really is evenly
 * spaced in depth and matching that is what keeps the two in register.
 */
function getTableSurfacePoint(u: number, v: number) {
  const quad = CABINET_TABLE_SURFACE_QUAD;
  const leftX = quad[0] + (quad[6] - quad[0]) * v;
  const rightX = quad[2] + (quad[4] - quad[2]) * v;

  return {
    x: leftX + (rightX - leftX) * u,
    y: quad[1] + (quad[7] - quad[1]) * v,
  };
}

/** Inverse of the above: stage pixels back to normalised table space. */
function getTableSurfaceUV(x: number, y: number) {
  const quad = CABINET_TABLE_SURFACE_QUAD;
  const v = (y - quad[1]) / (quad[7] - quad[1]);
  const leftX = quad[0] + (quad[6] - quad[0]) * v;
  const rightX = quad[2] + (quad[4] - quad[2]) * v;

  return { u: (x - leftX) / (rightX - leftX), v };
}

/**
 * The three table sections — one per card, the three "reels". Each is that
 * card's full footprint on the surface, so traces can escape from any side of
 * it and still belong to its own section.
 */
const CABINET_TABLE_SECTIONS = CABINET_TABLE_SLOT_QUADS.map((quad) => {
  // Quad order is TL, TR, BR, BL.
  const topLeft = getTableSurfaceUV(quad[0], quad[1]);
  const topRight = getTableSurfaceUV(quad[2], quad[3]);
  const bottomRight = getTableSurfaceUV(quad[4], quad[5]);
  const bottomLeft = getTableSurfaceUV(quad[6], quad[7]);

  return {
    // The bay is a trapezoid on screen but its near and far edges sit at
    // slightly different u, so take the outermost of each side.
    leftU: Math.min(topLeft.u, bottomLeft.u),
    rightU: Math.max(topRight.u, bottomRight.u),
    topV: topLeft.v,
    bottomV: bottomLeft.v,
  };
});

/**
 * How much a circle drawn flat on the table is squashed vertically by the
 * table's tilt. Anything meant to lie ON the surface (rather than stand up off
 * it) has to be scaled by this or it reads as a sticker floating in front.
 *
 * Derived from the middle card bay rather than hard-coded: the bay is a known
 * rectangle whose true proportions are the card art's, so comparing its
 * on-screen shape to that gives the surface's real foreshortening, and it stays
 * correct if the bay quads are ever recalibrated.
 */
const CARD_ART_ASPECT = 900 / 600;

const TABLE_SURFACE_FORESHORTEN = (() => {
  const quad = CABINET_TABLE_SLOT_QUADS[1];
  const apparentWidth = ((quad[2] - quad[0]) + (quad[4] - quad[6])) / 2;
  const apparentHeight = quad[5] - quad[3];

  return apparentHeight / apparentWidth / CARD_ART_ASPECT;
})();

/** Width of the table surface at depth `v`, in stage px. */
function getTableWidthAtV(v: number) {
  const quad = CABINET_TABLE_SURFACE_QUAD;
  const leftX = quad[0] + (quad[6] - quad[0]) * v;
  const rightX = quad[2] + (quad[4] - quad[2]) * v;

  return rightX - leftX;
}

/**
 * Perspective scale at depth `v`, relative to the card row. Further up the
 * table is further away, so anything lying there has to shrink to match.
 */
function getTableDepthScale(v: number) {
  return getTableWidthAtV(v) / getTableWidthAtV(CABINET_TABLE_SECTIONS[1].bottomV);
}

const CABINET_CARD_FLIP_CLOSE_MS = 135;
const CABINET_CARD_FLIP_OPEN_MS = 85;
const CABINET_CARD_LAND_MS = 100;
const CABINET_CARD_HOVER_LIFT = 20;


function toLocalQuad(
  quad: Quad,
  originX: number,
  originY: number,
  scale: number
): Quad {
  return [
    (quad[0] - originX) / scale,
    (quad[1] - originY) / scale,
    (quad[2] - originX) / scale,
    (quad[3] - originY) / scale,
    (quad[4] - originX) / scale,
    (quad[5] - originY) / scale,
    (quad[6] - originX) / scale,
    (quad[7] - originY) / scale,
  ];
}

function setMeshQuad(card: PerspectiveMesh, quad: Quad) {
  card.setCorners(...quad);
}

function setUprightCardMesh(card: PerspectiveMesh) {
  const halfWidth = card.texture.width / 2;
  // Cancel the DOM table's vertical affine scale while a free card is upright.
  const halfHeight = card.texture.height / (2 * CABINET_TABLE_DEPTH_SCALE);
  setMeshQuad(card, [
    -halfWidth,
    -halfHeight,
    halfWidth,
    -halfHeight,
    halfWidth,
    halfHeight,
    -halfWidth,
    halfHeight,
  ]);
}

function getQuadCenter(quad: Quad) {
  return {
    x: (quad[0] + quad[2] + quad[4] + quad[6]) / 4,
    y: (quad[1] + quad[3] + quad[5] + quad[7]) / 4,
  };
}

function setHoverCardMesh(card: PerspectiveMesh, quad: Quad, scale: number) {
  const topWidth = Math.hypot(quad[2] - quad[0], quad[3] - quad[1]);
  const bottomWidth = Math.hypot(quad[4] - quad[6], quad[5] - quad[7]);
  const projectedWidth = (topWidth + bottomWidth) / 2;
  const projectedHeight =
    Math.max(quad[1], quad[3], quad[5], quad[7]) -
    Math.min(quad[1], quad[3], quad[5], quad[7]);
  const halfWidth = projectedWidth / (2 * scale);
  const halfHeight = projectedHeight / (2 * scale);

  setMeshQuad(card, [
    -halfWidth,
    -halfHeight,
    halfWidth,
    -halfHeight,
    halfWidth,
    halfHeight,
    -halfWidth,
    halfHeight,
  ]);
}

function getLandedCardQuad(cardIndex: number): Quad {
  return [...CABINET_TABLE_SLOT_QUADS[cardIndex]] as Quad;
}

function interpolateEdge(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  amount: number
) {
  const t = Math.max(0, Math.min(1, amount));
  return {
    x: x0 + (x1 - x0) * t,
    y: y0 + (y1 - y0) * t,
  };
}

function getPerspectiveSweepQuad(cardQuad: Quad, progress: number): Quad | null {
  const stripHalfWidth = 0.16;
  const diagonalOffset = 0.11;
  const topLeftT = Math.max(0, progress - stripHalfWidth + diagonalOffset);
  const topRightT = Math.min(1, progress + stripHalfWidth + diagonalOffset);
  const bottomLeftT = Math.max(0, progress - stripHalfWidth - diagonalOffset);
  const bottomRightT = Math.min(1, progress + stripHalfWidth - diagonalOffset);

  if (topLeftT >= topRightT || bottomLeftT >= bottomRightT) return null;

  const topLeft = interpolateEdge(
    cardQuad[0],
    cardQuad[1],
    cardQuad[2],
    cardQuad[3],
    topLeftT
  );
  const topRight = interpolateEdge(
    cardQuad[0],
    cardQuad[1],
    cardQuad[2],
    cardQuad[3],
    topRightT
  );
  const bottomLeft = interpolateEdge(
    cardQuad[6],
    cardQuad[7],
    cardQuad[4],
    cardQuad[5],
    bottomLeftT
  );
  const bottomRight = interpolateEdge(
    cardQuad[6],
    cardQuad[7],
    cardQuad[4],
    cardQuad[5],
    bottomRightT
  );

  return [
    topLeft.x,
    topLeft.y,
    topRight.x,
    topRight.y,
    bottomRight.x,
    bottomRight.y,
    bottomLeft.x,
    bottomLeft.y,
  ];
}

function getPerspectiveQuadPoint(quad: Quad, u: number, v: number) {
  const topX = quad[0] + (quad[2] - quad[0]) * u;
  const topY = quad[1] + (quad[3] - quad[1]) * u;
  const bottomX = quad[6] + (quad[4] - quad[6]) * u;
  const bottomY = quad[7] + (quad[5] - quad[7]) * u;

  return {
    x: topX + (bottomX - topX) * v,
    y: topY + (bottomY - topY) * v,
  };
}

function getPerspectiveEllipsePoints(
  quad: Quad,
  widthScale: number,
  depthScale: number,
  centerV: number,
  segments = 48
) {
  const points: number[] = [];

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const point = getPerspectiveQuadPoint(
      quad,
      0.5 + Math.cos(angle) * widthScale * 0.5,
      centerV + Math.sin(angle) * depthScale * 0.5
    );

    points.push(point.x, point.y);
  }

  return points;
}

function getPerspectiveArcPoints(
  quad: Quad,
  widthScale: number,
  depthScale: number,
  centerV: number,
  startAngle: number,
  endAngle: number,
  segments = 28
) {
  const points: number[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const angle =
      startAngle + ((endAngle - startAngle) * index) / segments;
    const point = getPerspectiveQuadPoint(
      quad,
      0.5 + Math.cos(angle) * widthScale * 0.5,
      centerV + Math.sin(angle) * depthScale * 0.5
    );

    points.push(point.x, point.y);
  }

  return points;
}

function animateMeshToTable(
  card: PerspectiveMesh,
  target: Quad,
  duration: number,
  guard: AnimationGuard
) {
  const start = [...card.geometry.corners] as Quad;
  const startTime = performance.now();

  const frame = (now: number) => {
    if (!guard()) return;

    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start.map(
      (value, index) => value + (target[index] - value) * eased
    ) as Quad;

    setMeshQuad(card, current);
    if (progress < 1) requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

type BattlePixiStageProps = {
  cabinetMode?: boolean;
};

// A dialogue buildup game queues BOTH sides up front: the player insert is
// dispatched on the first flip and the enemy insert on the third, so the two
// halves of the exchange bracket the hand.
type PendingFakeoutDialogue = {
  card: Card | null;
  enemy: BattleEnemy | null;
  predeterminedSuccess: boolean;
  playerShown: boolean;
  enemyShown: boolean;
};

export default function BattlePixiStage({
  cabinetMode = false,
}: BattlePixiStageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Cabinet mode remaps card/slot geometry onto the DOM cabinet pockets
  // (disk exit gate + table slot pockets). Hand-tunable in patchConfig.
  const L = cabinetMode ? { ...UI, ...patchConfig.cabinetTable } : UI;

  useEffect(() => {
    let app: Application | null = null;
    let autoPlayTimer: ReturnType<typeof setInterval> | null = null;
    let waitHoldTimer: ReturnType<typeof setTimeout> | null = null;
    let removeExternalDrawControl: (() => void) | null = null;
    let removeExternalAutoControl: (() => void) | null = null;
    let removeRoundIntroControl: (() => void) | null = null;
    let removeBonusConfirmControl: (() => void) | null = null;
    let removeFlowControl: (() => void) | null = null;
    let disposeHandTimers: (() => void) | null = null;
    let cancelled = false;

    const init = async () => {
      if (!wrapperRef.current) return;
      initializePlayerBattleCards();

      const pixiApp = new Application();
      app = pixiApp;

      await pixiApp.init({
        width: STAGE.WIDTH,
        height: STAGE.HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
      });

      if (cancelled || !wrapperRef.current) {
        pixiApp.destroy(true);
        if (app === pixiApp) app = null;
        return;
      }

      wrapperRef.current.appendChild(pixiApp.canvas);
      pixiApp.canvas.style.width = "100%";
      pixiApp.canvas.style.height = "auto";
      pixiApp.canvas.style.display = "block";

      const stage = new Container();
      pixiApp.stage.addChild(stage);

      const tablePlane = new Container();
      stage.addChild(tablePlane);

      // Cabinet mode keeps the canvas flat for exact pointer coordinates.
      // Holder geometry and landed cards receive perspective natively in Pixi.

      const startingEnemy = selectEnemyForRound(1);
      setEnemyAttackCounter(startingEnemy.attackCounter);
      addBattleLog(`Round 1 Enemy: ${startingEnemy.name}`, "draw");
      showRoundInsert(
        formatRoundInsertText(1),
        getEnemyCharacterName(startingEnemy).label,
        startingEnemy.attackCounter,
        getRoundEnemyImage(startingEnemy.id)
      );

      const tableTexture = await Assets.load("/images/card-table.webp");
      const holderTexture = await Assets.load("/images/card-holder.webp");
      const drawButtonTexture = await Assets.load("/images/draw-button.webp");
      // Unified card back: every surface (disk pile, table, non-cabinet mode)
      // uses the v8 cabinet design (same 600x900 canvas as the legacy back,
      // so every scale/position stays identical).
      const cardBackArtTexture = await Assets.load(PLAYER_CARD_BACK_IMAGE);

      // The DOM disk pile (.bcab-back, 136x198) shows this art inside a 9px
      // rounded rect with a 2px --gold-deep border. Bake the identical framing
      // into the Pixi back texture so table cards match the disk exactly.
      const backW = cardBackArtTexture.width;
      const backH = cardBackArtTexture.height;
      const diskScale = backW / 136;
      const backRadius = 9 * diskScale;
      const backBorder = 2 * diskScale;
      const backArt = new Sprite(cardBackArtTexture);
      const backMask = new Graphics()
        .roundRect(0, 0, backW, backH, backRadius)
        .fill(0xffffff);
      backArt.mask = backMask;
      const backFrame = new Graphics()
        .roundRect(
          backBorder / 2,
          backBorder / 2,
          backW - backBorder,
          backH - backBorder,
          backRadius - backBorder / 2
        )
        .stroke({ width: backBorder, color: 0x8a6a2f });
      const backComposite = new Container();
      backComposite.addChild(backArt, backMask, backFrame);
      const cardBackTexture = pixiApp.renderer.generateTexture({
        target: backComposite,
        frame: new Rectangle(0, 0, backW, backH),
      });
      backComposite.destroy({ children: true });

      const symbolTextures = {
        Attack: await Assets.load("/images/battle-symbols/soft-edge/attack.png"),
        Defense: await Assets.load("/images/battle-symbols/soft-edge/defense.png"),
        Coin: await Assets.load("/images/battle-symbols/soft-edge/coin.png"),
        Reply: await Assets.load("/images/battle-symbols/soft-edge/reply.png"),
        Bar: await Assets.load("/images/battle-symbols/soft-edge/bar.png"),
        Chance: await Assets.load("/images/battle-symbols/soft-edge/chance.png"),
        Empty: await Assets.load("/images/battle-symbols/soft-edge/empty.png"),
      };

      // Target indicator.
      //
      // Which slot the attack is aimed at had no visual at all -- only a
      // red debug circle behind a query flag. This is that read, built as a
      // small LED pip sitting above the targeted bay: concentric rings from a
      // wide soft bloom down to a hard bright core, the way a lit indicator
      // blooms on a phone screen. Additive blending is what makes the layers
      // accumulate into glow rather than stack as flat discs.
      const TARGET_PIP_COLOR = 0xff5a4a;
      const TARGET_PIP_CORE = 0xffe9df;
      // Generous, because the surface squash flattens it to roughly half this
      // in height once it is laid onto the table.
      const TARGET_PIP_RADIUS = 8.5;

      const targetMarker = new Container();
      targetMarker.visible = false;
      targetMarker.eventMode = "none";

      const targetGlow = new Graphics();
      targetGlow.blendMode = "add";
      // Widest to tightest. Each ring is faint on its own; overlaid additively
      // they build the soft falloff a single circle cannot give.
      [
        { r: TARGET_PIP_RADIUS * 3.4, a: 0.1 },
        { r: TARGET_PIP_RADIUS * 2.5, a: 0.14 },
        { r: TARGET_PIP_RADIUS * 1.8, a: 0.2 },
        { r: TARGET_PIP_RADIUS * 1.25, a: 0.3 },
      ].forEach(({ r, a }) => {
        targetGlow.circle(0, 0, r).fill({ color: TARGET_PIP_COLOR, alpha: a });
      });
      targetMarker.addChild(targetGlow);

      const targetRing = new Graphics();
      targetRing.blendMode = "add";
      targetRing
        .circle(0, 0, TARGET_PIP_RADIUS)
        .stroke({ width: 1.6, color: TARGET_PIP_COLOR, alpha: 0.95 });
      targetRing
        .circle(0, 0, TARGET_PIP_RADIUS * 0.42)
        .fill({ color: TARGET_PIP_CORE, alpha: 0.95 });
      targetMarker.addChild(targetRing);

      stage.addChild(targetMarker);

      // Slow breathing pulse, so the pip reads as a live indicator rather than
      // a sticker. Driven off the shared ticker and removed with the stage.
      const targetPulse = () => {
        if (!targetMarker.visible) return;
        const phase = (performance.now() % 1600) / 1600;
        const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
        targetGlow.scale.set(0.94 + wave * 0.16);
        targetGlow.alpha = 0.72 + wave * 0.28;
        targetRing.alpha = 0.85 + wave * 0.15;
      };
      pixiApp.ticker.add(targetPulse);

      let cardsAreOut = false;
      let cardsReleased = false;
      let revealedCount = 0;
      let autoPlayEnabled = false;
      let autoProgressBusy = false;
      let pendingDefeatState = false;
      let queuedDrawAfterRoundIntro = false;

      const revealed = [false, false, false];

      // --- Hand lifecycle: generation token + centralized cleanup ----------
      // Every draw is a "hand" with a monotonically increasing id. All of a
      // hand's timers, RAF tweens, and hover tickers are bound to that id;
      // when a new hand begins, the id changes and every stale callback from
      // the previous hand becomes a no-op. This is what stops the three reused
      // sprites from jumping / vanishing / landing in the wrong slot on later
      // draws (requirements 2, 3, 7, 8).
      const CARD_FSM_DEBUG = process.env.NODE_ENV !== "production";
      const CARD_STATE_DEBUG =
        CARD_FSM_DEBUG ||
        (typeof window !== "undefined" &&
          window.location.search.includes("card-debug"));

      // Engine-internal battle-log lines: what the attack cycle already decided,
      // and how far the buildup has left to run. Both spoil the presentation
      // they narrate -- the Bible's whole point is that the result may be
      // predetermined while the presentation still builds anticipation.
      //
      // Opt-in only, and deliberately NOT keyed to NODE_ENV: the dev server is
      // where the presentation actually gets playtested, so leaving these on in
      // development would hide the very problem this gate exists to fix. Add
      // ?battle-debug to the URL when you need to see what the engine decided.
      const BATTLE_LOG_DEBUG =
        typeof window !== "undefined" &&
        window.location.search.includes("battle-debug");

      type CardPhase =
        | "idle"
        | "pile_set"
        | "releasing"
        | "hovering"
        | "flipping"
        | "placed"
        | "clearing";

      // Longer than any legitimate hand (release + three flips + settle is
      // well under 5s), so this only ever fires on a genuinely stuck hand.
      const HAND_WATCHDOG_MS = 15000;

      // Minimum interval between game starts, matching the 4.1s wait every
      // Japanese pachislot cabinet is required to enforce. It caps a spamming
      // player at ~878 games/hour, the same ceiling a real machine has.
      // The browser cabinet is interactive rather than coin-operated.
      const DRAW_WAIT_MS = 0;

      let lastDrawStartedAt = Number.NEGATIVE_INFINITY;
      let chanceWaitUntil = Number.NEGATIVE_INFINITY;
      const getChanceWaitRemaining = () =>
        Math.max(
          0,
          chanceWaitUntil - performance.now(),
          getCabinetSignalState().chanceSweepEndsAt - Date.now()
        );

      let handGeneration = 0;
      let cardPhase: CardPhase = "idle";
      const managedTimeouts = new Set<ReturnType<typeof setTimeout>>();

      const setCardPhase = (next: CardPhase, reason: string) => {
        if (CARD_FSM_DEBUG && next !== cardPhase) {
          console.log(
            `[card-fsm] hand#${handGeneration} ${cardPhase} -> ${next} (${reason})`
          );
        }
        cardPhase = next;
        if (CARD_STATE_DEBUG && typeof window !== "undefined") {
          (window as typeof window & {
            __battleCardDebug?: {
              handGeneration: number;
              cardPhase: CardPhase;
              cardsAreOut: boolean;
              cardsReleased: boolean;
              cards: Array<{
                visible: boolean;
                alpha: number;
                parent: string;
                texture: string;
              }>;
            };
          }).__battleCardDebug = {
            handGeneration,
            cardPhase,
            cardsAreOut,
            cardsReleased,
            cards: drawCards.map((card) => ({
              visible: card.visible,
              alpha: card.alpha,
              parent:
                card.parent === stage
                  ? "stage"
                  : card.parent === cardGroup
                    ? "cardGroup"
                    : card.parent
                      ? "other"
                      : "none",
              texture: String(card.texture?.label ?? card.texture?.source?.label ?? ""),
            })),
          };
        }
      };

      // A setTimeout that is auto-cancelled by beginNewHand and never fires for
      // a superseded hand.
      const handTimeout = (fn: () => void, ms: number) => {
        const gen = handGeneration;
        const id = setTimeout(() => {
          managedTimeouts.delete(id);
          if (cancelled || gen !== handGeneration) return;
          fn();
        }, ms);
        managedTimeouts.add(id);
        return id;
      };

      // Snapshot the current hand id and return a guard for the animation
      // helpers: it flips to false the instant a new hand begins.
      const aliveGuard = () => {
        const gen = handGeneration;
        return () => !cancelled && handGeneration === gen;
      };

      const clearManagedTimeouts = () => {
        managedTimeouts.forEach((id) => clearTimeout(id));
        managedTimeouts.clear();
      };
      // Expose cleanup to the effect teardown (below) so unmount cancels any
      // pending hand timers.
      disposeHandTimers = clearManagedTimeouts;

      let attackTargetGlowLayer: Container | null = null;
      const clearAttackTargetGlow = () => {
        if (!attackTargetGlowLayer) return;
        if (attackTargetGlowLayer.parent === stage) {
          stage.removeChild(attackTargetGlowLayer);
        }
        attackTargetGlowLayer.destroy({ children: true });
        attackTargetGlowLayer = null;
      };

      // The one centralized cleanup every new hand runs through.
      const beginNewHand = (reason: string) => {
        handGeneration += 1;
        clearManagedTimeouts();
        clearAttackTargetGlow();
        chanceWaitUntil = Number.NEGATIVE_INFINITY;
        stopAllHoverFloat();
        drawCards.forEach((card) => card.removeAllListeners("pointertap"));
        // Every slot closes with the hand, so a stale proxy can never fire into
        // a new hand.
        cardHitProxies.forEach((proxy) => {
          proxy.removeAllListeners("pointertap");
          proxy.eventMode = "none";
        });
        cardPhase = "idle";
        if (CARD_FSM_DEBUG) {
          console.log(
            `[card-fsm] === begin hand #${handGeneration} (${reason}) === -> idle`
          );
        }
      };

      let currentBattleResult = drawBattleResult({ barChance: "none" });

      const setCurrentBattleResult = (result: typeof currentBattleResult) => {
        currentBattleResult = result;

        if (result.barChance) {
          const playerCard = getCurrentPlayerBattleCard();
          startBarChance({
            outcome: result.barChance.outcome,
            tone: result.barChance.tone,
            scope: result.barChance.scope,
            bonusType: result.barChance.bonusType,
            characterImage:
              getPlayerFaceoffImage(playerCard?.name) ??
              playerCard?.image ??
              PLAYER_CARD_BACK_IMAGE,
          });
        } else {
          clearBarChance();
        }
      };

      const table = new Sprite(tableTexture);
      table.anchor.set(0.5);
      table.x = L.TABLE_X;
      table.y = L.TABLE_Y;
      table.scale.set(L.TABLE_SCALE);
      // Cabinet mode: the DOM card table is the surface; hide the sprite art.
      table.visible = !cabinetMode;
      tablePlane.addChild(table);

      const slotTargets = [
        { x: L.SLOT1_X, y: L.SLOT1_Y },
        { x: L.SLOT2_X, y: L.SLOT2_Y },
        { x: L.SLOT3_X, y: L.SLOT3_Y },
      ];
      const landedCardQuads = slotTargets.map((_, index) =>
        getLandedCardQuad(index)
      );

      // Picking proxies.
      //
      // A PerspectiveMesh has no built-in hit test, and a card's mesh corners
      // are rewritten continuously as it travels, lands and hover-lifts. Any
      // hitArea computed from that geometry is a snapshot that goes stale the
      // moment the mesh moves again — which is why clicking kept breaking.
      //
      // So picking is decoupled from drawing: each slot gets one invisible,
      // FIXED rectangle sized to the landed quad plus the hover lift. It never
      // animates, so it can never drift, and card geometry can change freely
      // without touching input. Only used in cabinet mode; plain Sprites in
      // normal mode already hit-test themselves.
      const cardHitProxies = cabinetMode
        ? landedCardQuads.map((quad) => {
            const xs = [quad[0], quad[2], quad[4], quad[6]];
            const ys = [quad[1], quad[3], quad[5], quad[7]];
            const pad = 14;
            const x = Math.min(...xs) - pad;
            const y = Math.min(...ys) - pad - CABINET_CARD_HOVER_LIFT;
            const width = Math.max(...xs) + pad - x;
            const height = Math.max(...ys) + pad - y;

            const proxy = new Graphics()
              .rect(x, y, width, height)
              .fill({ color: 0xffffff, alpha: 0 });
            proxy.hitArea = new Rectangle(x, y, width, height);
            proxy.eventMode = "none";
            proxy.cursor = "pointer";
            stage.addChild(proxy);
            return proxy;
          })
        : [];

      /** Opens or closes picking for one slot. */
      const setCardPickable = (index: number, pickable: boolean) => {
        const proxy = cardHitProxies[index];
        if (proxy) proxy.eventMode = pickable ? "static" : "none";
      };

      const cardGroup = new Container();
      cardGroup.visible = false;
      cardGroup.x = L.CARD_START_X;
      cardGroup.y = L.CARD_START_Y;
      tablePlane.addChild(cardGroup);

      // A PerspectiveMesh has no built-in hit test, so it needs an explicit
      // hitArea or pointer events pass straight through it. Critically, a
      // landed card's local vertices are rewritten to the table's perspective
      // quad — a completely different coordinate range from the upright card —
      // so any FIXED rectangle drifts out of alignment and clicks silently
      // start missing. This derives the area from the mesh's current local
      // bounds instead, and is re-applied every time a card becomes clickable,
      // so geometry changes can never break picking again.
      const syncCardHitArea = (card: (typeof drawCards)[number]) => {
        const bounds = card.getLocalBounds();
        card.hitArea = new Rectangle(
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height
        );
      };

      const createCard = () => {
        if (!cabinetMode) return new Sprite(cardBackTexture);

        const card = new PerspectiveMesh({
          texture: cardBackTexture,
          verticesX: 12,
          verticesY: 18,
        });
        setUprightCardMesh(card);
        return card;
      };

      const card1 = createCard();
      const card2 = createCard();
      const card3 = createCard();
      const drawCards = [card1, card2, card3];

      drawCards.forEach((card) => {
        if (card instanceof Sprite) card.anchor.set(0.5);
        card.scale.set(L.CARD_SCALE);
        card.rotation = L.CARD_ROTATION;
        card.texture = cardBackTexture;
        card.visible = false;
        card.eventMode = "none";
        // A PerspectiveMesh does no automatic hit testing, so pointer events
        // passed straight through and the cards could not be flipped.
        syncCardHitArea(card);
        cardGroup.addChild(card);
      });

      const holder = new Sprite(holderTexture);
      PresentationContext.holder = holder;
      holder.anchor.set(0.5);
      holder.x = L.HOLDER_X;
      holder.y = L.HOLDER_Y;
      holder.scale.set(L.HOLDER_SCALE);
      // Cabinet mode: the DOM disk (card-holder.png) replaces the sprite.
      holder.visible = !cabinetMode;
      tablePlane.addChild(holder);

      if (!cabinetMode) {
        const drawWell = new Graphics();
        drawWell
          .circle(0, 0, 142)
          .fill({ color: 0x07090c, alpha: 0.94 })
          .circle(0, 0, 136)
          .stroke({ color: 0x3b3020, width: 4, alpha: 0.98 })
          .circle(0, 0, 126)
          .stroke({ color: 0xc9a24b, width: 3, alpha: 0.85 })
          .circle(0, 0, 113)
          .stroke({ color: 0x101a1d, width: 7, alpha: 1 });
        drawWell.x = L.DRAW_BUTTON_X;
        drawWell.y = L.DRAW_BUTTON_Y;
        stage.addChild(drawWell);
      }

      const drawButton = new Sprite(drawButtonTexture);
      drawButton.anchor.set(0.5);
      drawButton.x = L.DRAW_BUTTON_X;
      drawButton.y = L.DRAW_BUTTON_Y;
      drawButton.scale.set(L.DRAW_BUTTON_SCALE);
      drawButton.tint = 0xffffff;
      drawButton.visible = !cabinetMode;
      drawButton.eventMode = cabinetMode ? "none" : "static";
      drawButton.cursor = "pointer";
      stage.addChild(drawButton);

      const syncDrawAvailability = () => {
        const enabled = canRequestBattleDraw() && !cardsAreOut;
        drawButton.eventMode = enabled && !cabinetMode ? "static" : "none";
        drawButton.alpha = enabled ? 1 : 0.5;
        drawButton.cursor = enabled ? "pointer" : "default";
      };

      removeFlowControl = subscribeBattlePresentationFlow(syncDrawAvailability);
      syncDrawAvailability();

      const setDrawButtonPressed = (pressed: boolean) => {
        drawButton.tint = 0xffffff;
        animateTransformTo(
          drawButton,
          {
            y: L.DRAW_BUTTON_Y + (pressed ? 8 : 0),
            scale: L.DRAW_BUTTON_SCALE * (pressed ? 0.92 : 1),
          },
          pressed ? 90 : 140,
          "out"
        );
      };

      const resetCardsToGroup = () => {
        // Centralized per-hand cleanup (requirement 7): bump the hand id,
        // cancel stale timers, remove hover tickers, and drop pointer handlers
        // so no callback from the previous hand can write to a reused sprite.
        beginNewHand("reset-cards-to-group");

        // The reel layer belongs to the hand that raised it — a new hand must
        // never inherit a REACH from the one before it.
        clearReelCombo();
        resetBattleCardsToGroup({
          drawCards,
          cardGroup,
          cardBackTexture,
          revealed,
          setRevealedCount: (value) => {
            revealedCount = value;
          },
          setCardsReleased: (value) => {
            cardsReleased = value;
          },
          layout: L,
        });
        drawCards.forEach((card) => {
          if (card instanceof PerspectiveMesh) setUprightCardMesh(card);
        });
      };

      let pendingNextRound = false;
      if (
        process.env.NODE_ENV !== "production" &&
        new URLSearchParams(window.location.search).get("start") === "collection"
      ) {
        pendingNextRound = true;
      }
      let pendingEnemyDefeatPresentation: {
        presentation: "default" | "barChance";
        forcedBonusType: "regular" | "super" | "superMax" | null;
      } | null = null;
      // Armed at draw time, played when the cards leave the deck.
      let pendingChanceUpCue = false;
      // Payoff game: the struggle is already on screen from the draw click.
      // This is the winner the third flip will name.
      let pendingStruggleWinner: "player" | "enemy" | null = null;
      let pendingFakeoutDialogue: PendingFakeoutDialogue | null = null;
      let pendingEnemyFatalShieldResolution: DefenseShieldResolution | null = null;
      let pendingTripleDefenseGrade: DefenseShieldGrade | null = null;

      const handleEnemyDefeated = (
        presentation: "default" | "barChance" = "default",
        forcedBonusType: "regular" | "super" | "superMax" | null = null
      ) => {
        pendingEnemyDefeatPresentation = {
          presentation,
          forcedBonusType,
        };
      };

      const commitEnemyDefeated = () => {
        const pending = pendingEnemyDefeatPresentation;
        if (!pending) return;
        pendingEnemyDefeatPresentation = null;
        clearDefenseShield();
        pendingEnemyFatalShieldResolution = null;
        handleBattleEnemyDefeated({
          setPendingNextRound: (value) => {
            pendingNextRound = value;
          },
          presentation: pending.presentation,
          forcedBonusType: pending.forcedBonusType,
        });
        notifyEnemyDefeatResult();
      };

      const drawCardsFromHolder = () => {
        setCardPhase("releasing", "draw-from-holder");
        const alive = aliveGuard();
        cardGroup.x = L.CARD_START_X;
        cardGroup.y = L.CARD_START_Y;
        // Cabinet mode: while the stack is "set" it is represented by the
        // flat DOM pile at the disk exit (the canvas plane is tilted with the
        // table, the disk is not). Pixi cards stay hidden until they travel
        // onto the table in releaseCardsToTable.
        handTimeout(() => {
          card1.visible = !cabinetMode;
          card1.rotation = L.CARD_ROTATION;
          animateTo(card1, L.CARD_END_X - L.CARD_START_X, 0, 250, alive);
        }, 0);

        handTimeout(() => {
          card2.visible = !cabinetMode;
          card2.rotation = L.CARD_ROTATION;
          animateTo(card2, L.CARD_END_X - L.CARD_START_X - 20, 0, 250, alive);
        }, 160);

        handTimeout(() => {
          card3.visible = !cabinetMode;
          card3.rotation = L.CARD_ROTATION;
          animateTo(card3, L.CARD_END_X - L.CARD_START_X - 40, 0, 250, alive);
        }, 320);
      };

      const showCurrentRoundInsert = () => {
        const round = getCurrentRound();
        const enemy = getCurrentEnemy();

        if (!enemy) return;

        showRoundInsert(
          formatRoundInsertText(round),
          getEnemyCharacterName(enemy).label,
          enemy.attackCounter,
          getRoundEnemyImage(enemy.id)
        );
      };

      const preparePendingNextRound = () => {
        if (!pendingNextRound) return false;

        pendingNextRound = false;
        // A stored shield belongs to one enemy battle only. Clear it before
        // the next opponent is selected so it cannot leak across rounds.
        clearDefenseShield();

        nextRound();

        const round = getCurrentRound();
        const enemy = loadNextRoundEnemy(round);

        setEnemyAttackCounter(enemy.attackCounter);

        return true;
      };

      const finishBonusSequence = (collectionStarted: boolean) => {
        pendingNextRound = true;
        if (!collectionStarted) {
          setBattlePresentationPhase("next_round_ready", "bonus-finished");
        }
      };

      const startNewDraw = () => {
        // A successful attack-land struggle arms the next game's opening
        // insert. Consume it only on this first draw click, never on release
        // or on a later card flip.
        startPlayerFatalModeOpening();
        resetCardsToGroup();
        pendingFakeoutDialogue = null;
        pendingTripleDefenseGrade = null;
        // Last hand's target is stale the moment a new one is dealt; the new
        // one lights up when this hand's result is drawn.
        targetMarker.visible = false;

        // Deadlock guard for a hand that can never finish. The card flip runs
        // on requestAnimationFrame, which the browser suspends completely while
        // the tab is hidden — the setTimeout-driven draw steps keep going, so a
        // backgrounded tab can leave a hand frozen mid-flip. onRevealComplete
        // then never fires, revealedCount never reaches 3, and the handTimeout
        // that clears cardsAreOut never runs, leaving the draw gate shut with
        // no way to reopen it (reopening needs a new draw; a new draw needs the
        // gate). Nothing inside the hand can break that, so this sits outside.
        //
        // beginNewHand also retires the hand id, so if the player returns and
        // the queued rAF finally fires, that stale flip is guarded out instead
        // of completing into a hand that has already been recovered.
        handTimeout(() => {
          if (!cardsAreOut) return;

          console.warn(
            `[card-fsm] hand#${handGeneration} never completed (phase ${cardPhase}); reopening the draw gate`
          );

          const abandonedAttackFakeout =
            pendingStruggleWinner !== null || pendingFakeoutDialogue !== null;

          if (abandonedAttackFakeout) {
            console.warn(
              `[attack-fakeout] hand#${handGeneration} abandoned; clearing stale dialogue and payoff`
            );
            // A struggle started on this draw would otherwise hang unresolved,
            // since only the third flip can name its winner.
            pendingStruggleWinner = null;
            pendingFakeoutDialogue = null;
            clearAttackFakeoutInserts();
            hideFakeoutChanceReveal();
            hideAttackLandReveal();
            cancelPlayerFatalModeOpening();
          }

          beginNewHand("watchdog-recovery");
          // A hand abandoned mid-flip can leave REACH up over a line that will
          // never resolve; the recovery has to lift it.
          clearReelCombo();
          cardsAreOut = false;
          cardsReleased = false;
          revealedCount = 0;

          // The cabinet shell tracks the disk pile separately (set -> launching
          // -> consumed) and decides whether the next press draws or releases.
          // Clearing only the engine flags left the shell stuck on "set", so it
          // kept sending release-cards that the engine then ignored — the
          // player could never draw again. Put the shell back to idle too.
          if (cabinetMode) {
            window.dispatchEvent(
              new CustomEvent("battle:cabinet-pile", {
                detail: { state: "consumed" },
              })
            );
          }

          setBattlePresentationPhase("next_round_ready", "watchdog-recovery");
          syncDrawAvailability();
        }, HAND_WATCHDOG_MS);

        preparePendingNextRound();

        const boostedBarOdds = consumeBarBoostGame();
        setCurrentBattleResult(
          drawBattleResult(
            boostedBarOdds
              ? { barChance: "main", barOdds: boostedBarOdds }
              : { barChance: "main" }
          )
        );

        // Chance hands occasionally earn the stronger anticipation cue. The
        // outcome is known here, but every card remains unclickable until the
        // full cabinet wait has elapsed.
        chanceWaitUntil = Number.NEGATIVE_INFINITY;
        beginCabinetDrawSignals({
          cards: currentBattleResult.cards,
          result: currentBattleResult.result,
          barChance: Boolean(currentBattleResult.barChance),
        });
        // The central store owns the wait deadline so a blackout can cancel it
        // immediately; keeping a second local deadline would leave cards
        // locked after the physical sweep had already been cut.

        // v-Next patch: record outcome (prices the next draw + event log)
        recordDrawOutcome(currentBattleResult.result, {
          cards: currentBattleResult.cards,
          targetSlot: currentBattleResult.targetSlot,
        });

        if (currentBattleResult.result === "Empty") {
          startEmptyMagicCircleChance();
        } else {
          hideMagicCircle();
        }
        rollChanceIconOverlay(currentBattleResult.cards.includes("Chance"));

        // 0725 SE: a predetermined Chance card teases at 60%. Armed here (the
        // outcome is known) but played when the cards are drawn off the deck,
        // not when they are set to the disk.
        pendingChanceUpCue =
          currentBattleResult.cards.includes("Chance") && Math.random() < 0.6;

        // A lone Chance symbol rolls for bonus points; a win is revealed on
        // the next draw press, not on the game that earned it.
        const chancePointsWon = rollChancePointsGain(
          currentBattleResult.cards,
          getCurrentPlayerBattleCard()?.name ?? "R1"
        );

        if (chancePointsWon > 0) {
          addBattleLog(`Chance bonus: +${chancePointsWon}P pending`, "chance");
        }

        const evaluation = evaluateResult(
          currentBattleResult,
          getCurrentPlayerBattleCard()?.rarity
        );
        const fatalModeWasActive = isFatalModeActive();

        addBattleLog(
          `Draw / Target Slot: ${currentBattleResult.targetSlot + 1}`,
          "draw"
        );

        let shouldStopBattleEvaluation = false;

        if (
          currentBattleResult.barChance?.scope === "battle" &&
          currentBattleResult.barChance.outcome === "success"
        ) {
          handleEnemyDefeated(
            "barChance",
            currentBattleResult.barChance.bonusType
          );
          shouldStopBattleEvaluation = true;
          addBattleLog("Triple BAR win armed.", "success");
        }

        // v-Next patch (feature 3): a hidden win is armed — this game must
        // look 100% ordinary; the crack/glitch fires after the cards reveal.
        if (!shouldStopBattleEvaluation && isResurrectionArmed()) {
          promoteResurrectionToGlitchPending();
          addBattleLog(`Cards: ${currentBattleResult.cards.join(" | ")}`);
          addBattleLog("No attack triggered.");
          shouldStopBattleEvaluation = true;
        }

        const fakeoutTurn = shouldStopBattleEvaluation
          ? null
          : consumeFakeoutTurn(rollFakeoutPresentation);

        if (fakeoutTurn) {
          // Every game starts clean: whatever the previous game presented is
          // gone the moment this draw commits.
          clearAttackFakeoutInserts();
          hideFakeoutChanceReveal();
          pendingFakeoutDialogue = null;

          if (fakeoutTurn.isPayoffGame) {
            // Payoff game: the struggle starts on THIS draw click and runs
            // while the hand is flipped; the third flip names the winner.
            const playerCard = getCurrentPlayerBattleCard();
            const enemy = getCurrentEnemy();

            startAttackLandStruggle({
              playerImage:
                getPlayerFaceoffImage(playerCard?.name) ??
                PLAYER_CARD_BACK_IMAGE,
              playerName: getPlayerCharacterName(playerCard).label,
              enemyImage:
                getEnemyFaceoffImage(enemy?.id) ?? PLAYER_CARD_BACK_IMAGE,
              enemyName: getEnemyCharacterName(enemy).label,
            });

            addBattleLog("Struggle!", "fakeout");
          } else if (fakeoutTurn.presentation === "chanceReveal") {
            const crvCard = getCurrentPlayerBattleCard();
            const crvCast = resolveChanceRevealCast(
              // No card in play means no character to present -- an empty
              // name fails the asset gate below instead of falsely casting
              // UR3, whose frames are the only ones authored so far.
              crvCard?.name ?? "",
              rollChanceRevealColor(fakeoutTurn.predeterminedSuccess)
            );

            // Only present when the frames exist -- there is no fallback
            // visual, so an unauthored pair would otherwise 404 its way to a
            // blank screen and still suppress the other chance presentations.
            if (hasChanceRevealAssets(crvCast.character, crvCast.cardColor)) {
              // This screen is the chance-up presentation for the game: clear
              // the other ones so they don't stack behind it. Both were rolled
              // earlier in this draw, before the presentation was known.
              hideChanceIconOverlay();
              hideMagicCircle();

              showFakeoutChanceReveal(crvCast.character, crvCast.cardColor);
            }
          } else {
            // Dialogue game: player insert on flip 1, enemy insert on flip 3.
            pendingFakeoutDialogue = {
              card: getCurrentPlayerBattleCard(),
              enemy: getCurrentEnemy(),
              predeterminedSuccess: fakeoutTurn.predeterminedSuccess,
              playerShown: false,
              enemyShown: false,
            };
          }

          if (CARD_FSM_DEBUG) {
            console.log(
              `[attack-fakeout] hand#${handGeneration} game${fakeoutTurn.gameNumber}/${fakeoutTurn.buildupGames + 1} ${
                fakeoutTurn.isPayoffGame ? "payoff" : fakeoutTurn.presentation
              }`
            );
          }

          if (BATTLE_LOG_DEBUG) {
            addBattleLog(
              `Fakeout ${fakeoutTurn.gameNumber}/${fakeoutTurn.buildupGames + 1}`,
              "fakeout"
            );
          }
          addBattleLog(`Cards: ${currentBattleResult.cards.join(" | ")}`);

          shouldStopBattleEvaluation = true;

          // Override window. The player has the whole cycle — including the
          // payoff game itself — to overturn a predetermined miss: a hand that
          // lands an attack flips the outcome before it is read below.
          if (!getAttackFakeoutState().predeterminedSuccess) {
            let overrideLanded = false;
            let overrideRate = 0;

            if (evaluation.attackOnTarget) {
              overrideRate = 100;
              overrideLanded = rollAttackAttempt(100).success;
            } else if (evaluation.chanceAttack) {
              overrideRate = evaluation.chanceAttackRate;
              overrideLanded = rollAttackAttempt(overrideRate).success;
            }

            if (overrideLanded) {
              overrideFakeoutToSuccess();
              addBattleLog("Attack broke through!", "success");
              logEvent({
                kind: "attackRoll",
                detail: {
                  source: "fakeoutOverride",
                  success: true,
                  tier: getCurrentPlayerBattleCard()?.rarity ?? "R",
                  rate: overrideRate,
                },
              });
            }
          }

          if (fakeoutTurn.isPayoffGame) {
            // Read AFTER the override window so a hit on this very game counts.
            const cycleSucceeded = getAttackFakeoutState().predeterminedSuccess;

            logEvent({
              kind: "fakeoutReveal",
              detail: { variant: "cycle", success: cycleSucceeded },
            });

            // The struggle is already on screen (started at this draw's click);
            // the third flip names the winner. See finalizePlacement.
            pendingStruggleWinner = cycleSucceeded ? "player" : "enemy";

            if (cycleSucceeded) {
              addBattleLog("Attack Success Revealed!", "success");
              clearAttackFakeout();

              startFatalMode();
              addBattleLog("Player Fatal Mode Started!", "success");
            } else {
              addBattleLog("Attack Failed.", "fail");
              clearAttackFakeout();
            }
          }
        }

        // The pip lies ON the table just beyond the bay, so it is placed
        // through the surface mapping rather than as a fixed pixel offset:
        // that gives it the bay's own convergence, and the depth scale plus
        // vertical squash make it read as painted on the tilted surface
        // instead of a circle floating in front of it.
        const TARGET_PIP_GAP_V = 0.055;

        const section = CABINET_TABLE_SECTIONS[currentBattleResult.targetSlot];
        const pipU = (section.leftU + section.rightU) / 2;
        const pipV = Math.max(0.1, section.topV - TARGET_PIP_GAP_V);
        const pipPoint = getTableSurfacePoint(pipU, pipV);
        const pipScale = getTableDepthScale(pipV);

        targetMarker.x = pipPoint.x;
        targetMarker.y = pipPoint.y;
        targetMarker.scale.set(pipScale, pipScale * TABLE_SURFACE_FORESHORTEN);
        targetMarker.visible = true;

        stage.setChildIndex(targetMarker, stage.children.length - 1);

        if (!shouldStopBattleEvaluation && isEnemyAttackModeActive()) {
          const tripleDefensePredetermined = currentBattleResult.cards.every(
            (symbol) => symbol === "Defense"
          );

          // Results are predetermined at draw time. Arm Triple Defense here
          // during a fatal window so even its last turn can use the shield;
          // the hologram itself still waits for the third visible flip.
          if (tripleDefensePredetermined && !pendingTripleDefenseGrade) {
            pendingTripleDefenseGrade = awardDefenseShield();
          }

          const playerCounter =
            evaluation.chanceAttack ||
            currentBattleResult.result === "Bar";

          const resetEnemyAttack =
            evaluation.attackOnTarget ||
            currentBattleResult.result === "Reply";

          if (playerCounter) {
            registerPlayerCounter();
          }

          if (resetEnemyAttack) {
            registerEnemyAttackReset();
          }

          const enemyTurn = consumeEnemyAttackModeTurn();

          if (enemyTurn) {
            if (enemyTurn.turnNumber === 1) {
              addBattleLog("Enemy Fatal Mode Started!", "fail");
            }

            // A Triple Defense can finish revealing after the fatal window's
            // first draw was evaluated. Keep checking until a shield is found,
            // then hold that single result for the remainder of the sequence.
            if (!pendingEnemyFatalShieldResolution) {
              pendingEnemyFatalShieldResolution =
                consumeDefenseShieldForFatal();

              if (pendingEnemyFatalShieldResolution) {
                addBattleLog(
                  `${pendingEnemyFatalShieldResolution.grade.toUpperCase()} Shield consumed.`,
                  "success"
                );
              }
            }

            addBattleLog(
              `Enemy Fatal Mode Turn ${enemyTurn.turnNumber}`,
              "fail"
            );

            addBattleLog(`Cards: ${currentBattleResult.cards.join(" | ")}`);

            shouldStopBattleEvaluation = true;

            if (enemyTurn.finished) {
              const shieldResolution = pendingEnemyFatalShieldResolution;
              pendingEnemyFatalShieldResolution = null;
              const survivedFatalWindow = shieldResolution
                ? shieldResolution.survived
                : enemyTurn.playerCountered || enemyTurn.playerResetEnemyAttack;

              if (shieldResolution) {
                addBattleLog(
                  `${shieldResolution.grade.toUpperCase()} Shield: ${Math.round(
                    shieldResolution.survivalChance * 100
                  )}% survival roll ${shieldResolution.survived ? "succeeded" : "failed"}.`,
                  shieldResolution.survived ? "success" : "fail"
                );
              }

              // Surviving the enemy's window is survival, not victory. A
              // counter used to defeat the enemy outright, which meant a single
              // Defense during the window won the round -- far too much for a
              // defensive read. Both escapes now do the same thing: the player
              // lives and the enemy's attack counter goes back to full. Killing
              // the enemy stays something the player's own attack has to earn.
              if (survivedFatalWindow) {
                addBattleLog(
                  shieldResolution
                    ? "The stored shield absorbs the fatal sequence."
                    : enemyTurn.playerCountered
                      ? "Counter! The fatal blow is turned aside."
                      : "Enemy attack count reset.",
                  "success"
                );

                const currentEnemy = getCurrentEnemy();

                if (currentEnemy) {
                  setEnemyAttackCounter(currentEnemy.attackCounter);
                }
             } else {
  addBattleLog("Player Defeated!", "fail");
  clearAttackFakeout();
  clearResurrection();

  const loadedNextCard = loadNextPlayerBattleCard();

  if (loadedNextCard) {
    addBattleLog(
      `Next Player Card Loaded. Remaining: ${getRemainingPlayerBattleCards()}`,
      "success"
    );

    setBattleState("playing");
  } else {
    addBattleLog("No player cards remaining.", "fail");
    pendingDefeatState = true;
  }
}
            }
          }
        }

        if (!shouldStopBattleEvaluation && isFatalModeActive()) {
          const fatalHit =
            evaluation.attackOnTarget ||
            evaluation.chanceAttack ||
            currentBattleResult.result === "Bar" ||
            currentBattleResult.result === "Reply" ||
            currentBattleResult.result === "Defense";

          if (fatalHit) {
            registerFatalModeHit();
          }

          const fatalTurn = consumeFatalModeTurn();

          if (fatalTurn) {
            addBattleLog(
              `Player Fatal Mode Turn ${fatalTurn.turnNumber}`,
              "fakeout"
            );

            addBattleLog(`Cards: ${currentBattleResult.cards.join(" | ")}`);

            shouldStopBattleEvaluation = true;

            if (fatalTurn.finished) {
              if (fatalTurn.enemyDefeated) {
                handleEnemyDefeated();
              } else {
                addBattleLog("Enemy Survived!", "fail");
                startEnemyAttackMode();
              }
            }
          }
        }

        if (!shouldStopBattleEvaluation) {
          addBattleLog(`Cards: ${currentBattleResult.cards.join(" | ")}`);

          let attackAttemptSuccess = false;
          let attackRollSource = "";

          if (evaluation.attackOnTarget) {
            addBattleLog("Attack Attempt!");

            const attackResult = rollAttackAttempt(100);
            attackAttemptSuccess = attackResult.success;
            attackRollSource = "attackCard";
          }

          if (evaluation.chanceAttack) {
            addBattleLog(
              `Chance Drawn: ${evaluation.chanceAttackRate}% attack chance`,
              "chance"
            );

            addBattleLog("Attack Attempt!");

            const attackResult = rollAttackAttempt(evaluation.chanceAttackRate);
            attackAttemptSuccess = attackResult.success;
            attackRollSource = "chance";
          }

          // v-Next patch (feature 1): an Empty target slot rolls for an
          // attack attempt at the active card's tier rate (R10/SR20/SSR30/UR40).
          if (evaluation.emptySlotAttack) {
            const attackResult = rollAttackAttempt(
              evaluation.emptySlotAttackRate
            );
            attackAttemptSuccess = attackResult.success;
            attackRollSource = "emptySlot";

            if (attackAttemptSuccess) {
              armMagicCircleChanceText();
              addBattleLog("Attack Attempt!");
            }
          }

          if (attackRollSource) {
            logEvent({
              kind: "attackRoll",
              detail: {
                source: attackRollSource,
                success: attackAttemptSuccess,
                tier: getCurrentPlayerBattleCard()?.rarity ?? "R",
                rate:
                  attackRollSource === "emptySlot"
                    ? evaluation.emptySlotAttackRate
                    : attackRollSource === "chance"
                      ? evaluation.chanceAttackRate
                      : 100,
              },
            });
          }

          // Empty-slot FAILS stay silent (the roll is invisible); everything
          // else feeds the presentation lottery below.
          const presentAttempt =
            evaluation.attackAttempt &&
            !(attackRollSource === "emptySlot" && !attackAttemptSuccess);

          if (presentAttempt) {
            const currentFakeout = getAttackFakeoutState();

            if (currentFakeout.active && attackAttemptSuccess) {
              addBattleLog("Attack broke through!", "success");
              overrideFakeoutToSuccess();
            } else {
              // Every presented attempt arms the same cycle: buildup games,
              // then the payoff game. There is no cycle-shape lottery — the
              // only roll is which presentation each buildup game shows.
              clearAttackFakeoutInserts();
              hideFakeoutChanceReveal();
              startAttackFakeout(attackAttemptSuccess);

              if (BATTLE_LOG_DEBUG) {
                addBattleLog(
                  attackAttemptSuccess
                    ? "Attack predetermined: SUCCESS"
                    : "Attack predetermined: FAIL"
                );
              }
            }
          }

          if (!presentAttempt) {
            addBattleLog("No attack triggered.");
          }
        }

        // 0725 SE: this draw is predetermined to defeat the enemy — 25%
        // chance of a vibration tease as the cards set onto the disk.
        if (pendingEnemyDefeatPresentation && Math.random() < 0.25) {
          playSfx("vibration");
        }

        const isTripleBarWin =
          currentBattleResult.barChance?.scope === "battle" &&
          currentBattleResult.barChance.outcome === "success";
        if (
          pendingEnemyDefeatPresentation &&
          (fatalModeWasActive || isTripleBarWin)
        ) {
          armFatalWinCabinetSignal();
          notifyCabinetProgress("set");
        }

        drawCardsFromHolder();
      };

      // Diagonal light sweep across the settled hand (celebration beat for
      // an all-identical hand or any hand holding a Chance card). Purely
      // visual: builds a white gradient band, masks it to each card, and
      // slides it corner-to-corner with a slight stagger.
      let shineTexture: Texture | null = null;

      const getShineTexture = () => {
        if (shineTexture) return shineTexture;

        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        const gradient = ctx.createLinearGradient(0, 0, 256, 0);
        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(0.42, "rgba(255,255,255,0.55)");
        gradient.addColorStop(0.5, "rgba(255,255,255,1)");
        gradient.addColorStop(0.58, "rgba(255,255,255,0.55)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        shineTexture = Texture.from(canvas);
        return shineTexture;
      };

      const runTableShineSweep = () => {
        const texture = getShineTexture();
        if (!texture) return;

        const alive = aliveGuard();

        drawCards.forEach((card, index) => {
          if (!card.visible || card.parent !== stage) return;

          handTimeout(() => {
            if (!alive()) return;

            if (cabinetMode && card instanceof PerspectiveMesh) {
              const band = new PerspectiveMesh({
                texture,
                verticesX: 6,
                verticesY: 10,
              });
              band.blendMode = "add";
              band.alpha = 0;
              band.eventMode = "none";
              stage.addChild(band);

              const sweepStart = performance.now();
              const sweepDuration = 460;
              const cardQuad = landedCardQuads[index];

              const sweepTicker = () => {
                const progress = Math.min(
                  1,
                  (performance.now() - sweepStart) / sweepDuration
                );
                const travel = -0.22 + progress * 1.44;
                const sweepQuad = getPerspectiveSweepQuad(cardQuad, travel);

                if (sweepQuad) {
                  band.visible = true;
                  band.alpha = Math.sin(progress * Math.PI) * 0.72;
                  setMeshQuad(band, sweepQuad);
                } else {
                  band.visible = false;
                }

                if (progress >= 1 || !alive()) {
                  pixiApp.ticker.remove(sweepTicker);
                  stage.removeChild(band);
                  band.destroy();
                }
              };

              pixiApp.ticker.add(sweepTicker);
              return;
            }

            const w = card.width;
            const h = card.height;
            const cornerRadius = w * (9 / 136);

            const sweepContainer = new Container();
            sweepContainer.x = card.x;
            sweepContainer.y = card.y;

            const sweepMask = new Graphics()
              .roundRect(-w / 2, -h / 2, w, h, cornerRadius)
              .fill(0xffffff);

            const band = new Sprite(texture);
            band.anchor.set(0.5);
            band.width = w * 0.9;
            band.height = h * 2.6;
            band.rotation = -0.5;
            band.blendMode = "add";
            band.alpha = 0.9;
            band.x = -w * 1.1;

            sweepContainer.addChild(band, sweepMask);
            band.mask = sweepMask;
            stage.addChild(sweepContainer);

            const sweepStart = performance.now();
            const sweepDuration = 360;

            const sweepTicker = () => {
              const progress = Math.min(
                1,
                (performance.now() - sweepStart) / sweepDuration
              );

              band.x = -w * 1.1 + progress * w * 2.2;

              if (progress >= 1 || !alive()) {
                pixiApp.ticker.remove(sweepTicker);
                stage.removeChild(sweepContainer);
                sweepContainer.destroy({ children: true });
              }
            };

            pixiApp.ticker.add(sweepTicker);
          }, index * 70);
        });
      };

      const runHolderElectricity = (
        cardQuad: Quad,
        alive: AnimationGuard
      ) => {
        const electricity = new Graphics();
        electricity.blendMode = "add";
        electricity.eventMode = "none";
        stage.addChild(electricity);
        const electricityStart = performance.now();
        let lastRedraw = -1;
        const corners = [
          { x: cardQuad[0], y: cardQuad[1] },
          { x: cardQuad[2], y: cardQuad[3] },
          { x: cardQuad[4], y: cardQuad[5] },
          { x: cardQuad[6], y: cardQuad[7] },
        ];

        const pointOnEdge = (edge: number, t: number) => {
          const a = corners[edge % 4];
          const b = corners[(edge + 1) % 4];
          return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        };

        const electricityTicker = () => {
          const elapsed = performance.now() - electricityStart;
          const progress = Math.min(1, elapsed / 600);
          const redraw = Math.floor(elapsed / 65);
          if (redraw !== lastRedraw) {
            lastRedraw = redraw;
            electricity.clear();
            for (let arc = 0; arc < 7; arc += 1) {
              const edge = (arc + redraw) % 4;
              const start = pointOnEdge(edge, (arc * 0.23 + redraw * 0.11) % 1);
              const end = pointOnEdge(
                edge,
                Math.min(1, ((arc * 0.23 + redraw * 0.11) % 1) + 0.22)
              );
              electricity.moveTo(start.x, start.y);
              for (let step = 1; step <= 4; step += 1) {
                const t = step / 4;
                const jitter = step === 4 ? 0 : (Math.random() - 0.5) * 12;
                electricity.lineTo(
                  start.x + (end.x - start.x) * t + jitter,
                  start.y + (end.y - start.y) * t - jitter * 0.45
                );
              }
              electricity.stroke({
                width: 3,
                color: 0xc9f7ff,
                alpha: (1 - progress) * 0.45,
              });
              electricity.stroke({
                width: 1.2,
                color: 0xffffff,
                alpha: (1 - progress) * 0.95,
              });
            }
          }

          if (progress >= 1 || !alive()) {
            pixiApp.ticker.remove(electricityTicker);
            if (electricity.parent === stage) stage.removeChild(electricity);
            electricity.destroy();
          }
        };
        pixiApp.ticker.add(electricityTicker);
      };

      // One-second white holder shockwave with a 60%-strength echo. Both rings
      // and the short electrical arcs are derived from the holder quad, so the
      // effect shares the table's vanishing point instead of reading as a flat
      // screen-space oval.
      const runChanceImpactWave = (cardIndex: number) => {
        const alive = aliveGuard();
        const card = drawCards[cardIndex];
        const cardQuad = landedCardQuads[cardIndex];

        [0, 120].forEach((delayMs, ring) => {
          handTimeout(() => {
            if (!alive() || !card.visible) return;

            const wave = new Graphics();
            wave.blendMode = "add";
            wave.eventMode = "none";
            stage.addChild(wave);

            const waveStart = performance.now();
            const waveDuration = 1000;

            const waveTicker = () => {
              const progress = Math.min(
                1,
                (performance.now() - waveStart) / waveDuration
              );
              const eased = 1 - Math.pow(1 - progress, 2);

              // The depth opens with the cabinet angle. At 60 degrees this is
              // visibly deeper than the old flattened oval while remaining
              // locked to the same table-plane vanishing point.
              const widthScale = 0.48 + eased * 2.2;
              const depthScale =
                (0.12 + eased * 0.55) * CABINET_TABLE_DEPTH_SCALE;
              const fade = 1 - progress;
              const wholeRing = getPerspectiveEllipsePoints(
                cardQuad,
                widthScale,
                depthScale,
                0.5
              );
              const nearArc = getPerspectiveArcPoints(
                cardQuad,
                widthScale,
                depthScale,
                0.5,
                0,
                Math.PI
              );
              const farArc = getPerspectiveArcPoints(
                cardQuad,
                widthScale,
                depthScale,
                0.5,
                Math.PI,
                Math.PI * 2
              );

              wave.clear();
              const strength = ring === 0 ? 1 : 0.6;
              wave.poly(wholeRing, true).stroke({
                width: Math.max(2, 13 * fade),
                color: 0xffffff,
                alpha: fade * strength * 0.48,
              });
              wave.poly(farArc, false).stroke({
                width: Math.max(1, 4 * fade),
                color: 0xe9fbff,
                alpha: fade * strength * 0.86,
              });
              wave.poly(nearArc, false).stroke({
                width: Math.max(1.5, 7 * fade),
                color: 0xffffff,
                alpha: fade * strength,
              });

              if (progress >= 1 || !alive()) {
                pixiApp.ticker.remove(waveTicker);
                stage.removeChild(wave);
                wave.destroy();
              }
            };

            pixiApp.ticker.add(waveTicker);
          }, delayMs);
        });
        runHolderElectricity(cardQuad, alive);
      };

      // Correct-target Attack interaction. The socket follows the table plane,
      // while the sword remains upright to the player like a projected sign.
      const runAttackTargetInteraction = (cardIndex: number) => {
        const alive = aliveGuard();
        const cardQuad = landedCardQuads[cardIndex];
        const center = getQuadCenter(cardQuad);
        const topWidth = Math.hypot(
          cardQuad[2] - cardQuad[0],
          cardQuad[3] - cardQuad[1]
        );
        const bottomWidth = Math.hypot(
          cardQuad[4] - cardQuad[6],
          cardQuad[5] - cardQuad[7]
        );
        const cardWidth = (topWidth + bottomWidth) * 0.5;

        clearAttackTargetGlow();
        const persistentGlowLayer = new Container();
        persistentGlowLayer.eventMode = "none";
        const socketGlow = new Graphics();
        socketGlow.blendMode = "add";
        persistentGlowLayer.addChild(socketGlow);
        stage.addChild(persistentGlowLayer);
        stage.setChildIndex(
          persistentGlowLayer,
          stage.children.length - 1
        );
        attackTargetGlowLayer = persistentGlowLayer;

        const expandedQuad = (scale: number): Quad => {
          const points = [...cardQuad] as Quad;
          for (let index = 0; index < points.length; index += 2) {
            points[index] = center.x + (points[index] - center.x) * scale;
            points[index + 1] =
              center.y + (points[index + 1] - center.y) * scale;
          }
          return points;
        };

        socketGlow.poly(expandedQuad(1.08), true).stroke({
          width: 16,
          color: 0x9e1608,
          alpha: 0.18,
        });
        socketGlow.poly(expandedQuad(1.045), true).stroke({
          width: 6,
          color: 0xff3a0a,
          alpha: 0.72,
        });
        socketGlow.poly(expandedQuad(1.025), true).stroke({
          width: 2,
          color: 0xffd06a,
          alpha: 0.96,
        });

        const layer = new Container();
        layer.eventMode = "none";
        stage.addChild(layer);
        stage.setChildIndex(layer, stage.children.length - 1);

        const swordGlow = new Graphics();
        swordGlow.blendMode = "add";
        const swordCore = new Graphics();
        swordCore.blendMode = "add";
        const fragments = new Graphics();
        fragments.blendMode = "add";

        const sword = new Container();
        sword.x = center.x;
        sword.y = center.y - 42;
        const swordScale = (cardWidth * 1.5) / 110;
        sword.scale.set(swordScale);
        sword.addChild(swordGlow, swordCore, fragments);
        layer.addChild(sword);

        const drawSword = (
          graphics: Graphics,
          color: number,
          alpha: number,
          expansion = 0
        ) => {
          graphics.clear();
          graphics
            .poly([
              -12 - expansion, -62,
              0, -82 - expansion,
              12 + expansion, -62,
              9 + expansion, 4,
              -9 - expansion, 4,
            ], true)
            .fill({ color, alpha });
          graphics
            .poly([
              -55 - expansion, 2,
              55 + expansion, 2,
              43 + expansion, 15 + expansion * 0.25,
              -43 - expansion, 15 + expansion * 0.25,
            ], true)
            .fill({ color, alpha });
          graphics
            .roundRect(
              -8 - expansion * 0.2,
              14,
              16 + expansion * 0.4,
              35,
              4
            )
            .fill({ color, alpha });
          graphics
            .circle(0, 55, 10 + expansion * 0.35)
            .fill({ color, alpha });
        };

        const startedAt = performance.now();
        const durationMs = 960;
        let fragmentFrame = -1;

        const interactionTicker = () => {
          const progress = Math.min(
            1,
            (performance.now() - startedAt) / durationMs
          );
          const materialize = Math.min(1, progress / 0.18);
          const dissolve = Math.max(0, (progress - 0.58) / 0.42);
          const swordAlpha = materialize * (1 - dissolve);
          const noiseGate =
            progress < 0.18
              ? 0.58 + Math.sin(fragmentFrame * 2.7) * 0.22
              : 1;
          drawSword(swordGlow, 0x5e0503, swordAlpha * 0.3 * noiseGate, 7);
          drawSword(swordCore, 0xb51608, swordAlpha * 0.88 * noiseGate, 0.5);
          swordCore
            .poly([-3.2, -59, 0, -74, 3.2, -59, 2.5, 0, -2.5, 0], true)
            .fill({ color: 0xff9d28, alpha: swordAlpha * 0.88 * noiseGate });
          swordCore
            .poly([-45, 5, 45, 5, 37, 11, -37, 11], true)
            .fill({ color: 0xf05a13, alpha: swordAlpha * 0.8 * noiseGate });
          swordCore
            .roundRect(-3.2, 16, 6.4, 31, 2)
            .fill({ color: 0xe85216, alpha: swordAlpha * 0.82 * noiseGate });
          swordCore
            .circle(0, 55, 4.5)
            .fill({ color: 0xffb83e, alpha: swordAlpha * 0.86 * noiseGate });
          sword.alpha = swordAlpha;
          sword.scale.set(swordScale * (0.94 + materialize * 0.06));

          const nextFragmentFrame = Math.floor(progress * 22);
          if (nextFragmentFrame !== fragmentFrame) {
            fragmentFrame = nextFragmentFrame;
            fragments.clear();
            const fragmentCount =
              progress < 0.2 ? 20 : dissolve > 0 ? 30 : 7;

            for (let index = 0; index < fragmentCount; index += 1) {
              const spread =
                progress < 0.2 ? (1 - materialize) * 38 : 8 + dissolve * 30;
              const rise = dissolve * (18 + (index % 6) * 5);
              const x = (Math.random() - 0.5) * (86 + spread);
              const y = -56 + Math.random() * 112 - rise;
              const size = 1.2 + Math.random() * 3.2;
              const fragmentAlpha =
                progress < 0.2
                  ? (1 - materialize) * 0.9
                  : dissolve > 0
                    ? (1 - dissolve) * 0.95
                    : 0.16;
              fragments
                .poly([
                  x, y - size,
                  x + size * 0.7, y,
                  x, y + size,
                  x - size * 0.7, y,
                ], true)
                .fill({
                  color: index % 4 === 0 ? 0xffe29a : 0xff3a08,
                  alpha: fragmentAlpha,
                });
            }
          }

          if (progress >= 1 || !alive()) {
            pixiApp.ticker.remove(interactionTicker);
            if (layer.parent === stage) stage.removeChild(layer);
            layer.destroy({ children: true });
          }
        };

        pixiApp.ticker.add(interactionTicker);
      };

      // Triple Defense table response. The hologram is deliberately upright
      // while its base ellipse follows the table plane, matching the physical
      // relationship used by the Attack sword interaction.
      const runDefenseShieldTableInteraction = (
        grade: DefenseShieldGrade,
        transferToPlayer: boolean
      ) => {
        const alive = aliveGuard();
        const center = getTableSurfacePoint(0.5, 0.48);
        const baseQuad = landedCardQuads[1];
        const layer = new Container();
        layer.eventMode = "none";
        stage.addChild(layer);
        stage.setChildIndex(layer, stage.children.length - 1);

        const groundLight = new Graphics();
        groundLight.blendMode = "add";
        layer.addChild(groundLight);

        const bloom = new Graphics();
        bloom.blendMode = "add";
        const shield = new Graphics();
        shield.blendMode = "add";
        const scan = new Graphics();
        scan.blendMode = "add";
        const shieldGroup = new Container();
        shieldGroup.x = center.x;
        shieldGroup.y = center.y - 88;
        shieldGroup.addChild(bloom, shield, scan);
        layer.addChild(shieldGroup);

        const shieldPath = [
          0, -92,
          74, -62,
          68, 12,
          50, 56,
          0, 92,
          -50, 56,
          -68, 12,
          -74, -62,
        ];

        bloom.poly(shieldPath, true).fill({ color: 0x249cff, alpha: 0.22 });
        bloom.poly(shieldPath, true).stroke({
          width: 18,
          color: 0x2ba9ff,
          alpha: 0.25,
        });
        shield.poly(shieldPath, true).fill({ color: 0x0a4b8b, alpha: 0.36 });
        shield.poly(shieldPath, true).stroke({
          width: 7,
          color: 0x7ed8ff,
          alpha: 0.96,
        });
        shield
          .poly([0, -72, 50, -51, 46, 8, 33, 40, 0, 65, -33, 40, -46, 8, -50, -51], true)
          .stroke({ width: 2.5, color: 0xd9f7ff, alpha: 0.8 });
        shield
          .moveTo(0, -71)
          .lineTo(0, 66)
          .stroke({ width: 2, color: 0x6acbff, alpha: 0.5 });

        let transferStarted = false;
        const startedAt = performance.now();
        const durationMs = 980;
        const ticker = () => {
          const elapsed = performance.now() - startedAt;
          const progress = Math.min(1, elapsed / durationMs);
          const dissolve = Math.max(0, (progress - 0.56) / 0.44);
          const pulse = 1 + Math.sin(elapsed / 68) * 0.022;

          shieldGroup.scale.set(pulse * (1 - dissolve * 0.14));
          shieldGroup.alpha = 1 - dissolve;

          groundLight.clear();
          groundLight
            .poly(getPerspectiveEllipsePoints(baseQuad, 2.25, 0.42, 0.48), true)
            .stroke({
              width: 12 - dissolve * 7,
              color: 0x289eff,
              alpha: (1 - dissolve) * 0.32,
            });
          groundLight
            .poly(getPerspectiveEllipsePoints(baseQuad, 1.75, 0.3, 0.48), true)
            .stroke({
              width: 3,
              color: 0xdaf8ff,
              alpha: (1 - dissolve) * 0.78,
            });

          scan.clear();
          const scanY = -76 + ((elapsed / 40) % 1) * 146;
          scan
            .rect(-51, scanY, 102, 3)
            .fill({ color: 0xdfffff, alpha: (1 - dissolve) * 0.56 });

          if (transferToPlayer && !transferStarted && progress >= 0.56) {
            transferStarted = true;
            revealDefenseShield(grade);
          }

          if (progress >= 1 || !alive()) {
            pixiApp.ticker.remove(ticker);
            if (layer.parent === stage) stage.removeChild(layer);
            layer.destroy({ children: true });
          }
        };

        pixiApp.ticker.add(ticker);
      };

      // Reply is an informational result, so its table response stays small:
      // 3-5 silent white sparks at random positions on the outer frame. The
      // positions are sampled in table-space, keeping the side sparks aligned
      // with the same vanishing point as the physical frame artwork.
      const runReplyFrameSparks = () => {
        const alive = aliveGuard();
        const sparkCount = 3 + Math.floor(Math.random() * 3);
        const startedAt = performance.now();
        const durationMs = 300;
        const sparkLifeMs = 105;

        const sparks = Array.from({ length: sparkCount }, (_, index) => {
          const edge = Math.floor(Math.random() * 4);
          const edgePosition = 0.1 + Math.random() * 0.8;
          const uv =
            edge === 0
              ? { u: edgePosition, v: 0.035 }
              : edge === 1
                ? { u: 0.975, v: edgePosition }
                : edge === 2
                  ? { u: edgePosition, v: 0.955 }
                  : { u: 0.025, v: edgePosition };
          const point = getTableSurfacePoint(uv.u, uv.v);

          return {
            x: point.x,
            y: point.y,
            startMs: index * 28 + Math.random() * 78,
            rotation: Math.random() * Math.PI * 2,
            size: 7 + Math.random() * 5,
            seed: Math.random() * 10,
          };
        });

        const graphics = new Graphics();
        graphics.blendMode = "add";
        graphics.eventMode = "none";
        stage.addChild(graphics);
        stage.setChildIndex(graphics, stage.children.length - 1);

        let redrawFrame = -1;
        const ticker = () => {
          const elapsed = performance.now() - startedAt;
          const nextFrame = Math.floor(elapsed / 24);

          if (nextFrame !== redrawFrame) {
            redrawFrame = nextFrame;
            graphics.clear();

            sparks.forEach((spark) => {
              const age = elapsed - spark.startMs;
              if (age < 0 || age > sparkLifeMs) return;

              const life = age / sparkLifeMs;
              const alpha = Math.sin(life * Math.PI);
              const rayCount = 4 + ((redrawFrame + Math.floor(spark.seed)) % 3);

              for (let ray = 0; ray < rayCount; ray += 1) {
                const angle =
                  spark.rotation +
                  (ray / rayCount) * Math.PI * 2 +
                  (Math.random() - 0.5) * 0.34;
                const inner = spark.size * 0.15;
                const outer = spark.size * (0.7 + Math.random() * 0.65);
                const mid = (inner + outer) * 0.52;
                const bend = (Math.random() - 0.5) * spark.size * 0.42;

                graphics
                  .moveTo(
                    spark.x + Math.cos(angle) * inner,
                    spark.y + Math.sin(angle) * inner
                  )
                  .lineTo(
                    spark.x + Math.cos(angle) * mid - Math.sin(angle) * bend,
                    spark.y + Math.sin(angle) * mid + Math.cos(angle) * bend
                  )
                  .lineTo(
                    spark.x + Math.cos(angle) * outer,
                    spark.y + Math.sin(angle) * outer
                  )
                  .stroke({
                    width: 2.4,
                    color: 0xdff8ff,
                    alpha: alpha * 0.52,
                  })
                  .stroke({
                    width: 0.9,
                    color: 0xffffff,
                    alpha,
                  });
              }

              graphics.circle(spark.x, spark.y, 1.6).fill({
                color: 0xffffff,
                alpha,
              });
            });
          }

          if (elapsed >= durationMs || !alive()) {
            pixiApp.ticker.remove(ticker);
            if (graphics.parent === stage) stage.removeChild(graphics);
            graphics.destroy();
          }
        };

        pixiApp.ticker.add(ticker);
      };

      // Triple Chance completion: all frame sections illuminate together for
      // one second. The steady near-white gold body is supplemented by short
      // randomized electrical filaments, but there is no traveling direction
      // or staged circuit around the frame.
      const runTripleChanceFrameSurge = () => {
        const alive = aliveGuard();
        const startedAt = performance.now();
        const durationMs = 1000;
        const layer = new Container();
        layer.eventMode = "none";
        stage.addChild(layer);
        stage.setChildIndex(layer, stage.children.length - 1);

        const frameGlow = new Graphics();
        frameGlow.blendMode = "add";
        const electricity = new Graphics();
        electricity.blendMode = "add";
        layer.addChild(frameGlow, electricity);

        const farLeft = getTableSurfacePoint(0.015, 0.025);
        const farRight = getTableSurfacePoint(0.985, 0.025);
        const nearLeftWidth = getTableSurfacePoint(0.015, 0.965);
        const nearRightWidth = getTableSurfacePoint(0.985, 0.965);
        const visibleFrontY = getTableSurfacePoint(0.5, 0.76).y;
        // The Pixi surface extends below the rendered table so cards/effects
        // have bleed room. Its side X coordinates still match the gold frame,
        // but its full near-edge Y would outline that invisible bleed area.
        // Combine the physical side width with the visible front-rail depth.
        const frameCorners = [
          farLeft,
          farRight,
          { x: nearRightWidth.x, y: visibleFrontY },
          { x: nearLeftWidth.x, y: visibleFrontY },
        ];
        const frameQuad = frameCorners.flatMap((point) => [point.x, point.y]);
        let redrawFrame = -1;

        const pointOnFrame = (edge: number, position: number) => {
          const from = frameCorners[edge % 4];
          const to = frameCorners[(edge + 1) % 4];
          return {
            x: from.x + (to.x - from.x) * position,
            y: from.y + (to.y - from.y) * position,
          };
        };

        const ticker = () => {
          const elapsed = performance.now() - startedAt;
          const progress = Math.min(1, elapsed / durationMs);
          const attack = Math.min(1, progress / 0.08);
          const release = progress < 0.68 ? 1 : 1 - (progress - 0.68) / 0.32;
          const intensity = attack * Math.max(0, release);
          const pulse = 0.9 + Math.sin(elapsed / 42) * 0.1;

          frameGlow.clear();
          frameGlow.poly(frameQuad, true).stroke({
            width: 42,
            color: 0xffb52f,
            alpha: intensity * pulse * 0.16,
          });
          frameGlow.poly(frameQuad, true).stroke({
            width: 20,
            color: 0xffd967,
            alpha: intensity * pulse * 0.42,
          });
          frameGlow.poly(frameQuad, true).stroke({
            width: 8,
            color: 0xfff1ad,
            alpha: intensity * 0.96,
          });
          frameGlow.poly(frameQuad, true).stroke({
            width: 2.4,
            color: 0xffffff,
            alpha: intensity,
          });

          const nextFrame = Math.floor(elapsed / 52);
          if (nextFrame !== redrawFrame) {
            redrawFrame = nextFrame;
            electricity.clear();

            for (let arc = 0; arc < 14; arc += 1) {
              const edge = (arc + redrawFrame) % 4;
              const startPosition = (arc * 0.173 + redrawFrame * 0.071) % 0.86;
              const endPosition = Math.min(0.98, startPosition + 0.08 + Math.random() * 0.12);
              const from = pointOnFrame(edge, startPosition);
              const to = pointOnFrame(edge, endPosition);

              electricity.moveTo(from.x, from.y);
              for (let step = 1; step <= 4; step += 1) {
                const t = step / 4;
                const jitter = step === 4 ? 0 : (Math.random() - 0.5) * 17;
                electricity.lineTo(
                  from.x + (to.x - from.x) * t + jitter,
                  from.y + (to.y - from.y) * t - jitter * 0.45
                );
              }
              electricity.stroke({
                width: 5,
                color: 0xffc23e,
                alpha: intensity * 0.36,
              });
              electricity.stroke({
                width: 1.4,
                color: 0xffffff,
                alpha: intensity * 0.98,
              });
            }
          }
          electricity.alpha = intensity;

          if (progress >= 1 || !alive()) {
            pixiApp.ticker.remove(ticker);
            if (layer.parent === stage) stage.removeChild(layer);
            layer.destroy({ children: true });
          }
        };

        playTripleChanceSurgeSfx();
        pixiApp.ticker.add(ticker);
      };

      const runBarCardLandingShake = (
        cardIndex: number,
        intensity: number
      ) => {
        const card = drawCards[cardIndex];
        const alive = aliveGuard();
        const originX = card.x;
        const originY = card.y;
        const originRotation = card.rotation;
        const startedAt = performance.now();
        const duration = 210;

        const shakeTicker = () => {
          const progress = Math.min(
            1,
            (performance.now() - startedAt) / duration
          );
          const decay = Math.pow(1 - progress, 2.2);
          const phase = progress * Math.PI * 11;
          card.x = originX + Math.sin(phase) * 5.5 * intensity * decay;
          card.y = originY + Math.sin(phase * 1.37) * 1.8 * intensity * decay;
          card.rotation =
            originRotation + Math.sin(phase * 0.83) * 0.012 * intensity * decay;

          if (progress >= 1 || !alive()) {
            pixiApp.ticker.remove(shakeTicker);
            card.x = originX;
            card.y = originY;
            card.rotation = originRotation;
          }
        };

        pixiApp.ticker.add(shakeTicker);
      };

      const runBarImpactWave = (
        cardIndex: number,
        revealOrder: number,
        success: boolean
      ) => {
        const alive = aliveGuard();
        const cardQuad = landedCardQuads[cardIndex];
        const strength = success ? 1.55 : revealOrder === 2 ? 1.18 : 1;

        [0, 105].forEach((delayMs, echoIndex) => {
          handTimeout(() => {
            if (!alive()) return;
            const wave = new Graphics();
            wave.blendMode = "add";
            wave.eventMode = "none";
            stage.addChild(wave);

            const startedAt = performance.now();
            const duration = success ? 610 : 500;
            const ticker = () => {
              const progress = Math.min(
                1,
                (performance.now() - startedAt) / duration
              );
              const eased = 1 - Math.pow(1 - progress, 2);
              const fade = 1 - progress;
              const widthScale = 0.58 + eased * (success ? 3.35 : 2.15) * strength;
              const depthScale =
                (0.14 + eased * (success ? 0.88 : 0.58)) *
                CABINET_TABLE_DEPTH_SCALE;
              const ring = getPerspectiveEllipsePoints(
                cardQuad,
                widthScale,
                depthScale,
                0.5
              );

              wave.clear();
              wave.poly(ring, true).stroke({
                width: Math.max(2, (success ? 12 : 8) * fade),
                color: echoIndex === 0 ? 0xfff4ce : 0xffc84a,
                alpha: fade * (echoIndex === 0 ? 0.95 : 0.58),
              });

              if (echoIndex === 0 && progress < 0.5) {
                const flash = 1 - progress / 0.5;
                const tableRipple = getPerspectiveEllipsePoints(
                  cardQuad,
                  1.2 + eased * (success ? 6.8 : 4.4),
                  (0.2 + eased * (success ? 1.5 : 0.95)) *
                    CABINET_TABLE_DEPTH_SCALE,
                  0.5
                );
                wave.poly(tableRipple, true).stroke({
                  width: success ? 5 : 3,
                  color: 0xffdf80,
                  alpha: flash * (success ? 0.72 : 0.28),
                });
              }

              if (progress >= 1 || !alive()) {
                pixiApp.ticker.remove(ticker);
                stage.removeChild(wave);
                wave.destroy();
              }
            };

            pixiApp.ticker.add(ticker);
          }, delayMs);
        });

      };

      // --- Combination flash: circuit traces across the table ----------------
      //
      // The table is a board that has just electrically detected the hand, so
      // the flash is current running through it. Thin digital lines escape the
      // bottom edge of each card and snake outward in right-angle steps.
      //
      // The table is split into three sections, one per card — three reels in
      // slot terms — and each card emits its own traces. Every point is placed
      // in normalised table space and mapped through the surface plane, so the
      // whole burst foreshortens with the table and covers it edge to edge.

      /** Screen-space polyline for a trace, plus its cumulative arc lengths. */
      type PreparedTrace = {
        xs: number[];
        ys: number[];
        lengths: number[];
        totalLength: number;
        color: number;
        widthPx: number;
        delay: number;
        duration: number;
      };

      const prepareTrace = (trace: ReelTrace): PreparedTrace => {
        const xs: number[] = [];
        const ys: number[] = [];
        const lengths: number[] = [0];

        trace.points.forEach((point) => {
          const screen = getTableSurfacePoint(point.u, point.v);
          xs.push(screen.x);
          ys.push(screen.y);
        });

        for (let index = 1; index < xs.length; index += 1) {
          lengths.push(
            lengths[index - 1] +
              Math.hypot(xs[index] - xs[index - 1], ys[index] - ys[index - 1])
          );
        }

        return {
          xs,
          ys,
          lengths,
          totalLength: lengths[lengths.length - 1],
          color: trace.color,
          widthPx: trace.widthPx,
          delay: trace.delay,
          duration: trace.duration,
        };
      };

      /** The point at `distance` along a prepared trace. */
      const pointAtDistance = (trace: PreparedTrace, distance: number) => {
        const { lengths, xs, ys } = trace;

        for (let index = 1; index < lengths.length; index += 1) {
          if (distance <= lengths[index]) {
            const span = lengths[index] - lengths[index - 1];
            const t = span > 0 ? (distance - lengths[index - 1]) / span : 0;

            return {
              x: xs[index - 1] + (xs[index] - xs[index - 1]) * t,
              y: ys[index - 1] + (ys[index] - ys[index - 1]) * t,
              segment: index,
            };
          }
        }

        return {
          x: xs[xs.length - 1],
          y: ys[ys.length - 1],
          segment: lengths.length - 1,
        };
      };

      /**
       * Strokes the part of a trace between two arc-length positions, keeping
       * every right-angle corner in between. `offsetX` shifts the whole stroke
       * sideways, which is how the red/blue fringe copies are drawn.
       */
      const strokeTraceSpan = (
        graphics: Graphics,
        trace: PreparedTrace,
        fromDistance: number,
        toDistance: number,
        color: number,
        width: number,
        alpha: number,
        offsetX: number
      ) => {
        if (toDistance <= fromDistance || alpha <= 0.01) return;

        const start = pointAtDistance(trace, fromDistance);
        const end = pointAtDistance(trace, toDistance);

        graphics.moveTo(start.x + offsetX, start.y);

        for (
          let index = start.segment;
          index < end.segment && index < trace.xs.length;
          index += 1
        ) {
          graphics.lineTo(trace.xs[index] + offsetX, trace.ys[index]);
        }

        graphics.lineTo(end.x + offsetX, end.y);
        graphics.stroke({ width, color, alpha });
      };

      /**
       * Runs the trace burst: every card emits its own lines, each drawing
       * itself outward with a bright travelling head and a fading tail, so the
       * table reads as current spreading out from the three detected cards.
       */
      const runComboTraceFlash = (intensity = 1) => {
        const config = patchConfig.reelMechanics.flash;
        const alive = aliveGuard();

        // One seed per trace, spread around each card's whole perimeter so the
        // burst escapes on every side.
        const seeds = CABINET_TABLE_SECTIONS.flatMap((section) =>
          seedPointsAroundCard(section, config.trace.perCard)
        );

        const traces = generateReelTraces(seeds).map(prepareTrace);

        const layer = new Graphics();
        layer.blendMode = "add";
        layer.eventMode = "none";

        // Traces run UNDER the cards. They escape from beneath a card on all
        // four sides, so any that pass back across one must read as being
        // below it — drawn on top they would streak over the card face.
        // getChildIndex THROWS for a non-child in Pixi v8 rather than
        // returning -1, and a card is only parented to the stage once it has
        // landed — so the parent check is load-bearing, not defensive.
        const lowestCardIndex = drawCards.reduce((lowest, card) => {
          if (card.parent !== stage) return lowest;
          const index = stage.getChildIndex(card);
          return index < lowest ? index : lowest;
        }, stage.children.length);

        stage.addChildAt(
          layer,
          Math.max(0, Math.min(lowestCardIndex, stage.children.length))
        );

        const burstStart = performance.now();
        const chroma = config.trace.chromaOffsetPx;

        const traceTicker = () => {
          const progress = Math.min(
            1,
            (performance.now() - burstStart) / config.holdMs
          );

          layer.clear();

          traces.forEach((trace) => {
            const local = (progress - trace.delay) / trace.duration;
            if (local <= 0) return;

            // The head runs to the end of the path, then keeps going so the
            // tail is drawn off the end and the trace empties out cleanly.
            const head = Math.min(1 + config.trace.tailFraction, local);
            const tail = Math.max(0, head - config.trace.tailFraction);

            const fromDistance = tail * trace.totalLength;
            const toDistance =
              Math.min(1, head) * trace.totalLength;

            // Fade the whole trace out once it has fully extended.
            const fade = local <= 1 ? 1 : Math.max(0, 1 - (local - 1) * 1.6);
            const alpha = fade * intensity;

            // Chromatic fringe first, so the white core sits on top of it.
            strokeTraceSpan(
              layer, trace, fromDistance, toDistance,
              0xff3b6b, trace.widthPx, alpha * 0.34, -chroma
            );
            strokeTraceSpan(
              layer, trace, fromDistance, toDistance,
              0x3bb6ff, trace.widthPx, alpha * 0.34, chroma
            );
            strokeTraceSpan(
              layer, trace, fromDistance, toDistance,
              trace.color, trace.widthPx, alpha * 0.9, 0
            );

            // A brighter node at the head sells it as a moving charge.
            if (local <= 1) {
              const headPoint = pointAtDistance(trace, toDistance);
              layer
                .circle(headPoint.x, headPoint.y, trace.widthPx * 1.5)
                .fill({ color: 0xffffff, alpha: alpha * 0.85 });
            }
          });

          if (progress >= 1 || !alive()) {
            pixiApp.ticker.remove(traceTicker);
            stage.removeChild(layer);
            layer.destroy();
          }
        };

        pixiApp.ticker.add(traceTicker);
      };

      // Dev-only: `__reelFlashPreview()` runs the burst on demand so its
      // density, speed and colour can be tuned without waiting for a hand.
      if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
        (
          window as Window & { __reelFlashPreview?: (intensity?: number) => string }
        ).__reelFlashPreview = (intensity = 1) => {
          runComboTraceFlash(intensity);
          return `trace flash @ ${intensity}`;
        };
      }

      // Flip 1 speaks for the player, flip 3 answers for the enemy.
      const showFakeoutDialogueForFlip = (flip: 1 | 3) => {
        const dialogue = pendingFakeoutDialogue;
        if (!dialogue) return;

        if (flip === 1) {
          if (dialogue.playerShown) return;
          dialogue.playerShown = true;
          showPlayerAttackFakeoutInsert({
            card: dialogue.card,
            predeterminedSuccess: dialogue.predeterminedSuccess,
          });
        } else {
          if (dialogue.enemyShown) return;
          dialogue.enemyShown = true;
          showEnemyAttackFakeoutInsert({
            enemy: dialogue.enemy,
            predeterminedSuccess: dialogue.predeterminedSuccess,
          });
        }

        if (CARD_FSM_DEBUG) {
          console.log(
            `[attack-fakeout] hand#${handGeneration} flip${flip} ${
              flip === 1 ? "player" : "enemy"
            } insert dispatched`
          );
        }
      };

      const handleRevealComplete = () => {
        revealedCount += 1;

        if (revealedCount >= 3) {
          setCardPhase("clearing", "hand-fully-revealed");

          // Celebration shine: all three symbols identical (Empties excluded)
          // or the hand contains a Chance card — sweep 0.5s after settle.
          const handCards = currentBattleResult.cards;
          const identicalHand =
            handCards[0] !== "Empty" &&
            handCards.every((symbol) => symbol === handCards[0]);
          const tripleDefense =
            identicalHand && handCards[0] === "Defense";
          const tripleChance =
            identicalHand && handCards[0] === "Chance";

          if (tripleDefense) {
            const grade = pendingTripleDefenseGrade ?? awardDefenseShield();
            pendingTripleDefenseGrade = null;
            const transferToPlayer =
              getDefenseShieldState().grade === grade;

            if (transferToPlayer) {
              addBattleLog(
                `${grade.toUpperCase()} Defense Shield stored.`,
                "success"
              );
            }

            runDefenseShieldTableInteraction(grade, transferToPlayer);
          }

          if (tripleChance) {
            runTripleChanceFrameSurge();
          }

          if (
            !currentBattleResult.barChance &&
            (identicalHand || handCards.includes("Chance"))
          ) {
            handTimeout(() => {
              playSfx("tableShine");
              runTableShineSweep();
            }, 500);
          }

          // Combination flash. Read ONCE off the finished hand and timed to
          // land with the shine sweep above, so the card lighting up and the
          // table reacting to it read as one event rather than two.
          const handFlash = readCompletedHandFlash(
            handCards,
            currentBattleResult.targetSlot
          );

          if (handFlash && !currentBattleResult.barChance) {
            clearReelTenpai();
            handTimeout(() => {
              runComboTraceFlash(handFlash.intensity);
            }, patchConfig.reelMechanics.flash.startDelayMs);
          }
          // v-Next patch (feature 3): the "normal" game has fully revealed —
          // fire the crack/glitch after a beat of false calm.
          if (isResurrectionGlitchPending()) {
            setTimeout(() => {
              triggerResurrectionReveal();
            }, patchConfig.resurrection.revealDelayMs);
          }

          const enemyDefeatCommitted = pendingEnemyDefeatPresentation !== null;
          if (enemyDefeatCommitted) {
            commitEnemyDefeated();
          }

          const bonusState = getBonusModeState();
          const bonusSequenceActive = bonusState.active || isNestedBonusActive();

          if (
            enemyDefeatCommitted &&
            currentBattleResult.barChance?.scope === "battle"
          ) {
            const barChance = currentBattleResult.barChance;
            if (barChance.freeze) {
              handTimeout(
                beginBarChanceDistortion,
                barChance.freezeDelayMs
              );
            } else {
              handTimeout(() => {
                setBattlePresentationPhase(
                  "next_round_ready",
                  "bar-chance-success-ready"
                );
              }, 500);
            }
          } else if (enemyDefeatCommitted) {
            // The dedicated fatal insert owns this reveal beat. Bonus opening
            // is scheduled when the three-second scene finishes.
          } else if (bonusSequenceActive) {
            // Apply the nested game the player has just been shown: points,
            // loop counter and reward video all land here rather than at the
            // press, so the bonus no longer runs a game ahead of its display.
            resolveNestedBonusGame();

            const videoStarted = playPendingBonusRevealVideo();
            if (!videoStarted) {
              const resultShown = showQueuedBonusResult();
              if (!resultShown) {
                setBattlePresentationPhase("next_round_ready", "bonus-reveal-complete");
              }
            }
          } else if (pendingDefeatState) {
            pendingDefeatState = false;
            // Losing the last card ends the run. There is no continue step:
            // the continue mechanic was never wired (consumeContinue had no
            // callers) and has been dropped, so this goes straight to game
            // over, which BattleScreen turns into the run report.
            setBattleState("gameOver");
          } else if (!showResultCutIn(currentBattleResult)) {
            setBattlePresentationPhase("next_round_ready", "reveal-complete");
          }

          handTimeout(() => {
            cardsAreOut = false;
            setCardPhase("idle", "hand-cleared");
            syncDrawAvailability();
          }, tripleDefense ? 1300 : tripleChance ? 1100 : 500);
        }
      };

      const hoverShadows = slotTargets.map((_, cardIndex) => {
        const shadow = new Graphics();
        shadow
          .poly(
            getPerspectiveEllipsePoints(
              landedCardQuads[cardIndex],
              0.94,
              0.12,
              0.88
            ),
            true
          )
          .fill({ color: 0x02070a, alpha: 0.62 });
        shadow.alpha = 0;
        shadow.visible = false;
        stage.addChild(shadow);
        return shadow;
      });
      const hoverFloatTickers = new Map<number, () => void>();
      const hoverTargets = landedCardQuads.map((quad, cardIndex) => {
        if (!cabinetMode) {
          return {
            x: slotTargets[cardIndex].x,
            y: slotTargets[cardIndex].y - 24,
            rotation: 0,
          };
        }

        const center = getQuadCenter(quad);
        return {
          x: center.x,
          y: center.y - CABINET_CARD_HOVER_LIFT,
          rotation: 0,
        };
      });

      const stopHoverFloat = (cardIndex: number) => {
        const ticker = hoverFloatTickers.get(cardIndex);
        if (ticker) {
          pixiApp.ticker.remove(ticker);
          hoverFloatTickers.delete(cardIndex);
        }
        hoverShadows[cardIndex].visible = false;
      };

      const stopAllHoverFloat = () => {
        drawCards.forEach((_, index) => stopHoverFloat(index));
      };

      const startHoverFloat = (cardIndex: number) => {
        stopHoverFloat(cardIndex);
        const gen = handGeneration;
        const card = drawCards[cardIndex];
        const baseY = hoverTargets[cardIndex].y;
        const startTime = performance.now();
        const ticker = () => {
          // Self-remove the moment a new hand supersedes this one, so an old
          // hand's float can never keep writing Y to a reused sprite.
          if (cancelled || gen !== handGeneration) {
            stopHoverFloat(cardIndex);
            return;
          }
          const elapsed = performance.now() - startTime;
          card.y = baseY + Math.sin(elapsed / 320 + cardIndex * 0.8) * 5;
        };

        pixiApp.ticker.add(ticker);
        hoverFloatTickers.set(cardIndex, ticker);
      };

      const placeCardFromHover = (cardIndex: number) => {
        const card = drawCards[cardIndex];
        if (revealed[cardIndex] || !card.visible) return;
        if (getChanceWaitRemaining() > 0) return;

        setCardPhase("flipping", `place-card-${cardIndex + 1}`);

        // All placement cues fire on the click-to-flip so they attribute to the
        // card the player just flipped (firing at settle-time made them land on
        // whatever card was on screen a beat later).
        const result = currentBattleResult;
        const isAttackOnTarget =
          cardIndex === result.targetSlot &&
          result.cards[cardIndex] === "Attack";
        // The dedicated Attack-target sound will be supplied later. Until
        // then every holder uses the normal physical placement cue.
        playSfx("cardPlaced");
        // Reply / Coin are confirmed the instant the final card is flipped.
        const completesHand = revealed.filter(Boolean).length === 2;
        if (completesHand && result.result === "Reply") {
          playSfx("reply");
        }
        if (completesHand && result.result === "Coin") {
          playSfx("coinCard");
        }

        // Lead the shortened cabinet landing without letting the cue trail it.
        if (result.cards[cardIndex] === "Chance") {
          handTimeout(() => playSfx("chanceCardLand"), cabinetMode ? 80 : 155);
        }

        // Interruption cut-in: first flip of a scoring bonus hand. `revealed` is
        // still all-false here — revealCard sets this card's slot below — so an
        // empty count is genuinely the first flip. Gating on pendingRevealVideo
        // rather than phase alone skips the bonus-opening hand, which already
        // reads as phase "bonus" by flip time but pays no point reveal.
        const isFirstFlip = revealed.filter(Boolean).length === 0;

        if (isFirstFlip) {
          resumeFakeoutChanceReveal();
        }

        if (
          isFirstFlip &&
          getBonusModeState().phase === "bonus" &&
          getBonusPresentationState().pendingRevealVideo
        ) {
          showInterruptCutIn();
        }

        card.eventMode = "none";
        card.cursor = "default";
        // Close this slot so a second click cannot re-enter the flip.
        setCardPickable(cardIndex, false);
        stopHoverFloat(cardIndex);

        const slot = slotTargets[cardIndex];
        const cardQuad = landedCardQuads[cardIndex];
        const landingOrigin = cabinetMode ? getQuadCenter(cardQuad) : slot;
        const settleDuration = cabinetMode ? CABINET_CARD_LAND_MS : 320;
        const alive = aliveGuard();

        // Where the card actually came to rest, in stage coordinates, for the
        // overlay to put a shockwave on. Sent per card rather than per hand
        // because the wave belongs to the card that landed, not to the slot it
        // was aimed at — under the cabinet's perspective those differ.
        if (cabinetMode) {
          window.dispatchEvent(
            new CustomEvent("battle:vfx-card-landed", {
              detail: {
                symbol: result.cards[cardIndex],
                onTarget: cardIndex === result.targetSlot,
                stage: { x: landingOrigin.x, y: landingOrigin.y },
              },
            })
          );
        }

        // REACH only. The combination flash is NOT read here — the table
        // reports a finished hand, so it fires once from handleRevealComplete
        // after all three cards are down, not as each one lands.
        const resolveReelTenpai = () => {
          if (currentBattleResult.barChance) {
            clearReelTenpai();
            return;
          }

          const tenpai = readReelTenpai(currentBattleResult.cards, revealed);

          if (tenpai) {
            showReelTenpai(tenpai);
            playSfx("chanceIcon");
            return;
          }

          // The line broke — drop the tension rather than leaving REACH up
          // over a hand that has already resolved.
          clearReelTenpai();
        };

        const finalizePlacement = () => {
          setCardPhase("placed", `settle-card-${cardIndex + 1}`);

          const barChance = currentBattleResult.barChance;
          const symbol = currentBattleResult.cards[cardIndex];
          const revealOrder = revealedCount + 1;
          notifyCabinetProgress(`flip${revealOrder}` as "flip1" | "flip2" | "flip3");
          const barStateBefore = getBarChanceState();

          if (
            barChance &&
            barStateBefore.phase === "active" &&
            (symbol === "Bar" || symbol === "Empty")
          ) {
            const nextBarState = revealBarChanceSymbol(symbol);

            if (symbol === "Empty") {
              playSfx("barFailure", { volume: 0.55 });
            } else {
              const successfulThird = nextBarState.phase === "success";
              const intensity = successfulThird
                ? 1.35
                : revealOrder === 2
                  ? 1.14
                  : 1;
              runBarCardLandingShake(cardIndex, intensity);
              runBarImpactWave(cardIndex, revealOrder, successfulThird);
              playSfx("barImpact", {
                volume: successfulThird
                  ? 1.2
                  : revealOrder === 2
                    ? 0.95
                    : 0.78,
              });
            }
          }

          if (currentBattleResult.cards[cardIndex] === "Chance") {
            runChanceImpactWave(cardIndex);
          }

          // revealedCount is still the count BEFORE this card, so 0 is the
          // first flip and 2 is the third.
          if (revealedCount === 0) {
            showFakeoutDialogueForFlip(1);
          }

          if (revealedCount === 2) {
            showFakeoutDialogueForFlip(3);

            // Payoff game: the struggle has been running since the draw click;
            // this flip names the winner.
            if (pendingStruggleWinner !== null) {
              const struggleWinner = pendingStruggleWinner;
              revealAttackLandWinner(struggleWinner);
              if (struggleWinner === "player") {
                armPlayerFatalModeOpening();
              }
              pendingStruggleWinner = null;
            }
          }

          resolveReelTenpai();
          handleRevealComplete();
          if (revealOrder === 3) clearCabinetTurnSignals();
        };
        const startCabinetLanding = () => {
          if (!(card instanceof PerspectiveMesh)) return;

          if (isAttackOnTarget) {
            handTimeout(
              () => runAttackTargetInteraction(cardIndex),
              Math.round(settleDuration * 0.42)
            );
          }

          const targetQuad = toLocalQuad(
            cardQuad,
            landingOrigin.x,
            landingOrigin.y,
            L.CARD_SCALE
          );
          animateMeshToTable(card, targetQuad, settleDuration, alive);
          animateTransformTo(
            card,
            {
              x: landingOrigin.x,
              y: landingOrigin.y,
              rotation: 0,
            },
            settleDuration,
            "out",
            alive
          );
        };

        revealCard({
          card,
          cardIndex,
          revealed,
          currentCards: currentBattleResult.cards,
          symbolTextures,
          guard: alive,
          closeDurationMs: cabinetMode
            ? CABINET_CARD_FLIP_CLOSE_MS
            : undefined,
          openDurationMs: cabinetMode ? CABINET_CARD_FLIP_OPEN_MS : undefined,
          onFaceSwap: cabinetMode ? startCabinetLanding : undefined,
          onRevealComplete: () => {
            if (cabinetMode) {
              handTimeout(
                finalizePlacement,
                Math.max(
                  0,
                  CABINET_CARD_LAND_MS - CABINET_CARD_FLIP_OPEN_MS
                )
              );
              return;
            }

            if (card instanceof PerspectiveMesh) {
              const targetQuad = toLocalQuad(
                cardQuad,
                slot.x,
                slot.y,
                L.CARD_SCALE
              );
              animateMeshToTable(card, targetQuad, settleDuration, alive);
            }

            animateTransformTo(
              card,
              {
                x: slot.x,
                y: slot.y,
                rotation: 0,
                scale: L.CARD_SCALE,
              },
              settleDuration,
              "back",
              alive
            );

            handTimeout(finalizePlacement, settleDuration);
          },
        });
      };

      const attachPlacementHandlers = () => {
        drawCards.forEach((card, index) => {
          // The card itself stays bound for non-cabinet mode (real Sprites).
          card.removeAllListeners("pointertap");
          card.on("pointertap", () => placeCardFromHover(index));

          // In cabinet mode the fixed proxy is what actually receives clicks.
          const proxy = cardHitProxies[index];
          if (proxy) {
            proxy.removeAllListeners("pointertap");
            proxy.on("pointertap", () => placeCardFromHover(index));
          }
        });
      };

      const releaseCardsToTable = () => {
        if (!cardsAreOut || cardsReleased) return;

        cardsReleased = true;
        notifyCabinetProgress("release");
        setCardPhase("releasing", "release-cards-to-table");
        // Cards are released from the disk out to the table.
        playSfx("drawCard");

        // The bonus takes the screen here and nowhere else: the opening video
        // (armed when the enemy fell) and the bonus background (armed on the
        // draw press) both land on the deal, so the battle scene stays up
        // until the cards it is replaced by are actually coming out.
        consumeArmedBonusPresentation();

        // The chance tease rides the cards coming off the deck.
        if (pendingChanceUpCue) {
          pendingChanceUpCue = false;
          playSfx("chanceUpDraw");
        }
        const alive = aliveGuard();
        cardGroup.eventMode = "none";

        drawCards.forEach((card) => {
  const globalX = cardGroup.x + card.x;
const globalY = cardGroup.y + card.y;

  cardGroup.removeChild(card);
  stage.addChild(card);

  card.x = globalX;
  card.y = globalY;
});

        cardGroup.visible = false;

        // Cabinet mode: the flat DOM pile is consumed and upright Pixi cards
        // glide onto the table. They gain table perspective only after a flip.
        drawCards.forEach((card, index) => {
          if (cabinetMode && card instanceof PerspectiveMesh) {
            setHoverCardMesh(card, landedCardQuads[index], L.CARD_SCALE);
          }
          card.visible = true;
        });

        if (cabinetMode) {
          window.dispatchEvent(
            new CustomEvent("battle:cabinet-pile", {
              detail: { state: "consumed" },
            })
          );
        }

        drawCards.forEach((card, index) => {
          const hover = hoverTargets[index];
          const launchDelay = index * 90;
          // Cabinet mode travels the full disk-exit -> slot arc with a rotate,
          // so it gets a slightly longer, overshoot-free glide.
          const travelMs = cabinetMode ? 560 : 460;

          if (cabinetMode) {
            // Seamless hand-off from the DOM disk pile: the Pixi card takes over
            // exactly at the disk exit gate, rotated like the pile
            // (.bcab-stack is rotate(90deg) == CARD_ROTATION), then rotates flat
            // and glides onto the slot as one continuous motion -- no pop.
            card.x = L.CARD_START_X + index * 6;
            card.y = L.CARD_START_Y - index * 4;
            card.rotation = L.CARD_ROTATION;
            // Start invisible and fade in *while moving* so there is no hard
            // "start point" on the table -- the card materializes in motion,
            // cross-dissolving with the DOM pile it takes over from.
            card.alpha = 0;
          } else {
            card.rotation = 0;
          }
          card.scale.set(L.CARD_SCALE);
          card.eventMode = "none";

          handTimeout(() => {
            animateTransformTo(
              card,
              {
                x: hover.x,
                y: hover.y,
                rotation: hover.rotation,
                scale: L.CARD_SCALE,
              },
              travelMs,
              // Ease-out (no back overshoot) keeps the rotate-and-settle smooth.
              cabinetMode ? "out" : "back",
              alive
            );
            if (cabinetMode) {
              animateTransformTo(card, { alpha: 1 }, 220, "out", alive);
            }
          }, launchDelay);

          handTimeout(() => {
            const replyArrival = currentBattleResult.result === "Reply";
            const finalArrival = index === drawCards.length - 1;

            // Reply reacts to the complete three-card arrival, not to a flip.
            // Hold all three pick targets until the last card has settled so
            // the player cannot reveal one before the frame sparks begin.
            if (replyArrival && !finalArrival) return;

            if (replyArrival) {
              runReplyFrameSparks();
              drawCards.forEach((replyCard, replyIndex) => {
                if (revealed[replyIndex]) return;
                replyCard.eventMode = "static";
                replyCard.cursor = "pointer";
                setCardPickable(replyIndex, true);
                startHoverFloat(replyIndex);
              });
              setCardPhase("hovering", "reply-cards-ready-for-pick");
              return;
            }

            if (!revealed[index]) {
              card.eventMode = "static";
              card.cursor = "pointer";
              setCardPickable(index, true);
              startHoverFloat(index);
              if (finalArrival) {
                setCardPhase("hovering", "cards-ready-for-pick");
              }
            }
          },
            launchDelay +
              travelMs +
              10 +
              getChanceWaitRemaining()
          );
        });

        attachPlacementHandlers();
      };

      const setCardsOut = (value: boolean) => {
        cardsAreOut = value;
        syncDrawAvailability();

        if (value) {
          setCardPhase("pile_set", "cards-out");
        }

        // Tell the cabinet shell the stack is set at the disk exit.
        //
        // The tell rides along because this is the only moment the disc's aura
        // can be decided: the hand is drawn by now, and the player has not seen
        // a card yet. Only the tell travels, never the hand — the overlay has
        // no business knowing which symbols are coming.
        if (cabinetMode && value) {
          window.dispatchEvent(
            new CustomEvent("battle:cabinet-pile", {
              detail: { state: "set", tell: readDrawTell(currentBattleResult) },
            })
          );
        }
      };

      const runDrawRequest = (confirmBonusResult = false) => {
        clearBarChance();
        // The previous game's chance reveal clears here, on the first draw
        // press of the next turn. It has to happen at this funnel rather than
        // in the fakeout branch below: a turn that presents nothing would
        // otherwise leave the last reveal frozen on screen indefinitely.
        // Any reveal for THIS turn is shown further down the same press, so
        // clearing first never eats the new one.
        hideFakeoutChanceReveal();

        // Every path that starts a game records the time here — manual, auto
        // and bonus alike — so the wait below is measured against the real
        // previous game start no matter how it was triggered.
        lastDrawStartedAt = performance.now();
        setDrawButtonPressed(false);
        handleDrawButtonPress({
          cardsAreOut,
          setCardsAreOut: setCardsOut,
          drawButton,
          drawCards,
          stage,
          startNewDraw,
          preparePendingNextRound,
          resetCardsToGroup,
          drawCardsFromHolder,
          setCurrentBattleResult,
          onBonusFinished: finishBonusSequence,
          confirmBonusResult,
        });
      };

      // Pachislot wait rule. A real cabinet enforces a minimum interval between
      // one game starting and the next, measured lever-on to lever-on, so a
      // player spamming the controls still cannot exceed the cap. The press is
      // never rejected — it is accepted and held, then fires when the wait
      // expires, which is what "full wait" play feels like on a real machine.
      const requestDraw = () => {
        if (!canRequestBattleDraw() || cardsAreOut) return;

        // Failure and no-freeze success results clear on the next accepted
        // Draw click, even when the cabinet's 4.1s wait holds the new deal.
        clearBarChance();

        if (pendingNextRound) {
          preparePendingNextRound();
          queuedDrawAfterRoundIntro = true;
          showCurrentRoundInsert();
          return;
        }

        const elapsed = performance.now() - lastDrawStartedAt;

        if (elapsed >= DRAW_WAIT_MS) {
          runDrawRequest();
          return;
        }

        // Already holding one press; further spam is absorbed, not queued up.
        if (waitHoldTimer !== null) return;

        waitHoldTimer = setTimeout(() => {
          waitHoldTimer = null;
          if (cancelled) return;
          if (!canRequestBattleDraw() || cardsAreOut) return;
          runDrawRequest();
        }, DRAW_WAIT_MS - elapsed);
      };

      const autoProgressOnce = () => {
        if (autoProgressBusy || cardsAreOut || !canRequestBattleDraw()) return;
        if (getBonusModeState().waitingForResultConfirm) return;
        if (getNestedBonusState().waitingForResultConfirm) return;

        clearBarChance();

        if (pendingNextRound) {
          preparePendingNextRound();
          queuedDrawAfterRoundIntro = true;
          showCurrentRoundInsert();
          return;
        }

        autoProgressBusy = true;
        runDrawRequest();

        setTimeout(() => {
          releaseCardsToTable();

          setTimeout(() => {
            placeCardFromHover(0);

            setTimeout(() => {
              placeCardFromHover(1);

              setTimeout(() => {
                placeCardFromHover(2);

                setTimeout(() => {
                  autoProgressBusy = false;
                }, 1300);
              }, 680);
            }, 680);
          }, 760 + getChanceWaitRemaining());
        }, 1300);
      };

      const onRoundIntroComplete = () => {
        if (!queuedDrawAfterRoundIntro) return;
        queuedDrawAfterRoundIntro = false;
        if (autoPlayEnabled) autoProgressOnce();
        else requestDraw();
      };

      const confirmBonusResult = () => runDrawRequest(true);

      window.addEventListener("battle:round-intro-complete", onRoundIntroComplete);
      removeRoundIntroControl = () => {
        window.removeEventListener("battle:round-intro-complete", onRoundIntroComplete);
      };

      window.addEventListener("battle:confirm-bonus-result", confirmBonusResult);
      removeBonusConfirmControl = () => {
        window.removeEventListener("battle:confirm-bonus-result", confirmBonusResult);
      };

      drawButton.on("pointertap", requestDraw);

      if (cabinetMode) {
        let releaseInFlight = false;
        // Manual release: first slide the DOM disk pile across the disk->table
        // gap to the exact point where the Pixi cards take over, THEN hand off
        // to Pixi -- so the motion reads as one continuous deal, not a pop.
        const releaseFromCabinet = () => {
          if (!cardsAreOut || cardsReleased || releaseInFlight) return;
          releaseInFlight = true;
          window.dispatchEvent(
            new CustomEvent("battle:cabinet-pile", {
              detail: { state: "launching" },
            })
          );
          handTimeout(() => {
            releaseInFlight = false;
            releaseCardsToTable();
          }, 240);
        };
        const setAutoPlay = (enabled: boolean) => {
          autoPlayEnabled = enabled;

          if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
          }

          if (autoPlayEnabled) {
            autoProgressOnce();
            autoPlayTimer = setInterval(() => {
              autoProgressOnce();
            }, 1000);
          }
        };
        const toggleAutoFromCabinet = (event: Event) => {
          if (!(event instanceof CustomEvent)) return;
          setAutoPlay(Boolean(event.detail));
        };

        // Leaving the pick phase goes straight into the next round's insert
        // instead of parking on an idle table until the player presses draw.
        const advanceAfterCollection = () => {
          if (!pendingNextRound) return;
          preparePendingNextRound();
          showCurrentRoundInsert();
        };

        window.addEventListener("battle:request-draw", requestDraw);
        window.addEventListener("battle:release-cards", releaseFromCabinet);
        window.addEventListener("battle:set-auto", toggleAutoFromCabinet);
        window.addEventListener(
          "battle:collection-dismissed",
          advanceAfterCollection
        );
        removeExternalDrawControl = () => {
          window.removeEventListener(
            "battle:collection-dismissed",
            advanceAfterCollection
          );
          window.removeEventListener("battle:request-draw", requestDraw);
          window.removeEventListener("battle:release-cards", releaseFromCabinet);
        };
        removeExternalAutoControl = () => {
          window.removeEventListener("battle:set-auto", toggleAutoFromCabinet);
        };
      }

      drawButton.on("pointerdown", () => {
        setDrawButtonPressed(true);
      });

      drawButton.on("pointerup", () => {
        setDrawButtonPressed(false);
      });

      drawButton.on("pointerupoutside", () => {
        setDrawButtonPressed(false);
      });

      drawButton.on("pointercancel", () => {
        setDrawButtonPressed(false);
      });

    };

    init();

    return () => {
      cancelled = true;

      disposeHandTimers?.();
      disposeHandTimers = null;

      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }

      if (waitHoldTimer) {
        clearTimeout(waitHoldTimer);
        waitHoldTimer = null;
      }


      removeExternalDrawControl?.();
      removeExternalDrawControl = null;
      removeExternalAutoControl?.();
      removeExternalAutoControl = null;
      removeRoundIntroControl?.();
      removeRoundIntroControl = null;
      removeBonusConfirmControl?.();
      removeBonusConfirmControl = null;
      removeFlowControl?.();
      removeFlowControl = null;

      if (app) {
        try {
          app.destroy(false);
        } catch (error) {
          console.warn("Pixi cleanup warning:", error);
        }

        app = null;
      }
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`w-full flex items-center justify-center ${
        cabinetMode ? "battle-pixi-cabinet-surface" : ""
      }`}
    />
  );
}
