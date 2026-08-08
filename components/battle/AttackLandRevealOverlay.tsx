"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  getAttackLandRevealState,
  hideAttackLandReveal,
  revealAttackLandWinner,
  startAttackLandStruggle,
  subscribeAttackLandReveal,
} from "@/lib/battle-pixi/state/attackLandRevealStore";
import {
  getEnemyAttackFaceoffTransform,
  getPlayerAttackFaceoffTransform,
} from "@/lib/battle-pixi/presentation/attackFaceoffTransforms";

type AttackLandRevealOverlayProps = {
  previewWinner?: "player" | "enemy" | null;
};

const PREVIEW_PLAYER_FACE_OFFS = [
  ["R1", "player-R1-faceoff-alpha-1920x1080.png"],
  ["R2", "player-R2-faceoff-alpha-1920x1080.png"],
  ["R3", "player-R3-faceoff-alpha-1920x1080.png"],
  ["R4", "player-R4-faceoff-alpha-1920x1080.png"],
  ["SR1", "player-SR1-faceoff-two-hand-horizontal-premium-cel-v4-1920x1080.png"],
  ["SR2", "player-SR2-faceoff-alpha-1920x1080.png"],
  ["SR3", "player-SR3-faceoff-alpha-1920x1080.png"],
  ["SR4", "player-SR4-faceoff-alpha-1920x1080.png"],
  ["SSR1", "player-SSR1-faceoff-alpha-1920x1080.png"],
  ["SSR2", "player-SSR2-faceoff-alpha-1920x1080.png"],
  ["SSR3", "player-SSR3-faceoff-alpha-1920x1080.png"],
  ["SSR4", "player-SSR4-faceoff-alpha-1920x1080.png"],
  ["UR1", "player-UR1-faceoff-alpha-1920x1080.png"],
  ["UR2", "player-UR2-faceoff-alpha-1920x1080.png"],
  ["UR3", "player-UR3-faceoff-premium-cel-ca-1920x1080.png"],
] as const;

const PREVIEW_ENEMY_FACE_OFFS = [
  ["Enemy 1", "enemy1-faceoff-alpha-1920x1080.png"],
  ["Enemy 2", "enemy2-faceoff-alpha-1920x1080.png"],
  ["Enemy 3", "enemy3-faceoff-alpha-1920x1080.png"],
  ["Enemy 4", "enemy4-faceoff-premium-cel-ca-1920x1080.png"],
  ["Enemy 5", "enemy5-faceoff-alpha-1920x1080.png"],
  ["Enemy 6", "enemy6-faceoff-alpha-1920x1080.png"],
  ["Enemy 7", "enemy7-faceoff-alpha-1920x1080.png"],
  ["Enemy 8", "enemy8-faceoff-alpha-1920x1080.png"],
  ["Enemy 9", "enemy9-faceoff-alpha-1920x1080.png"],
  ["Enemy 10", "enemy10-faceoff-alpha-1920x1080.png"],
  ["Enemy 11", "enemy11-faceoff-alpha-1920x1080.png"],
  ["Enemy 12", "enemy12-faceoff-alpha-1920x1080.png"],
  ["Enemy 13", "enemy13-faceoff-premium-cel-ca-1920x1080.png"],
] as const;

const PREVIEW_FACE_OFF_ROOT =
  "/images/battle-scenes/attack-faceoffs/character-layers/edited";

export default function AttackLandRevealOverlay({
  previewWinner = null,
}: AttackLandRevealOverlayProps) {
  const [state, setState] = useState(getAttackLandRevealState());

  useEffect(() => {
    return subscribeAttackLandReveal(() => {
      setState(getAttackLandRevealState());
    });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || previewWinner === null) return;

    const previewWindow = window as Window & {
      __attackLandPreviewCycleTimer?: number;
      __attackLandPreviewRevealTimer?: number;
    };
    if (previewWindow.__attackLandPreviewCycleTimer !== undefined) {
      window.clearInterval(previewWindow.__attackLandPreviewCycleTimer);
    }
    if (previewWindow.__attackLandPreviewRevealTimer !== undefined) {
      window.clearTimeout(previewWindow.__attackLandPreviewRevealTimer);
    }

    let revealTimer: number | undefined;
    let cycleTimer: number | undefined;
    let previewIndex = 0;

    const playPreview = () => {
      const [playerName, playerFile] =
        previewWinner === "player"
          ? PREVIEW_PLAYER_FACE_OFFS[previewIndex]
          : PREVIEW_PLAYER_FACE_OFFS[3];
      const [enemyName, enemyFile] =
        previewWinner === "enemy"
          ? PREVIEW_ENEMY_FACE_OFFS[previewIndex]
          : PREVIEW_ENEMY_FACE_OFFS[0];

      startAttackLandStruggle({
        playerImage: `${PREVIEW_FACE_OFF_ROOT}/${playerFile}`,
        playerName,
        enemyImage: `${PREVIEW_FACE_OFF_ROOT}/${enemyFile}`,
        enemyName,
      });

      revealTimer = window.setTimeout(() => {
        revealAttackLandWinner(previewWinner);
      }, 3000);
      previewWindow.__attackLandPreviewRevealTimer = revealTimer;
    };

    const startTimer = window.setTimeout(() => {
      playPreview();
      cycleTimer = window.setInterval(() => {
        if (revealTimer !== undefined) window.clearTimeout(revealTimer);
        const previewCount =
          previewWinner === "enemy"
            ? PREVIEW_ENEMY_FACE_OFFS.length
            : PREVIEW_PLAYER_FACE_OFFS.length;
        previewIndex = (previewIndex + 1) % previewCount;
        playPreview();
      }, 5000);
      previewWindow.__attackLandPreviewCycleTimer = cycleTimer;
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      if (revealTimer !== undefined) window.clearTimeout(revealTimer);
      if (cycleTimer !== undefined) window.clearInterval(cycleTimer);
      if (previewWindow.__attackLandPreviewRevealTimer === revealTimer) {
        delete previewWindow.__attackLandPreviewRevealTimer;
      }
      if (previewWindow.__attackLandPreviewCycleTimer === cycleTimer) {
        delete previewWindow.__attackLandPreviewCycleTimer;
      }
    };
  }, [previewWinner]);

  // The resolved winner remains on screen until the player requests the next
  // draw. This keeps the payoff readable and lets the draw button own pacing.
  useEffect(() => {
    if (!state.active || state.winner === null) return;

    const dismiss = () => hideAttackLandReveal();
    window.addEventListener("battle:request-draw", dismiss);
    window.addEventListener("battle:release-cards", dismiss);

    return () => {
      window.removeEventListener("battle:request-draw", dismiss);
      window.removeEventListener("battle:release-cards", dismiss);
    };
  }, [state.active, state.key, state.winner]);

  if (!state.active) return null;

  const phase = state.winner === null ? "struggle" : "resolve";
  const winnerIsPlayer = state.winner === "player";
  const playerPlacement = getPlayerAttackFaceoffTransform(state.playerImage);
  const enemyPlacement = getEnemyAttackFaceoffTransform(state.enemyImage);
  const playerTransform = {
    "--faceoff-x": `${playerPlacement.x}%`,
    "--faceoff-y": `${playerPlacement.y}%`,
    "--faceoff-scale": playerPlacement.scale,
    "--faceoff-winner-x": `${playerPlacement.winnerX}%`,
  } as CSSProperties;
  const enemyTransform = {
    "--faceoff-x": `${enemyPlacement.x}%`,
    "--faceoff-y": `${enemyPlacement.y}%`,
    "--faceoff-scale": enemyPlacement.scale,
    "--faceoff-winner-x": `${enemyPlacement.winnerX}%`,
  } as CSSProperties;

  return (
    <div
      key={state.key}
      aria-label="Attack land struggle"
      className={`attack-land-reveal attack-land-${phase} ${
        state.winner ? `attack-land-winner-${state.winner}` : ""
      }`}
      role="img"
    >
      <div className="attack-land-arena-background" aria-hidden="true">
        <video autoPlay loop muted playsInline preload="auto">
          <source
            src="/videos/effect/split-screen-struggle/dynamic-blue-speed-lines.mp4"
            type="video/mp4"
          />
          <source
            src="/videos/effect/split-screen-struggle/dynamic-blue-speed-lines.mov"
            type="video/quicktime"
          />
        </video>
      </div>
      <div className="attack-land-dim" />

      <div
        className={`attack-land-sweep attack-land-sweep-player ${
          phase === "resolve"
            ? winnerIsPlayer
              ? "attack-land-character-victor"
              : "attack-land-character-fallen"
            : ""
        }`}
      >
        <div className="attack-land-character-position">
          <div className="attack-land-character-shake">
            <img
              className="attack-land-character-image"
              src={state.playerImage}
              alt=""
              style={playerTransform}
            />
          </div>
        </div>
        <div className="attack-land-echo-layer" aria-hidden="true">
          <img
            src={state.playerImage}
            alt=""
            style={playerTransform}
          />
        </div>
      </div>

      <div
        className={`attack-land-sweep attack-land-sweep-enemy ${
          phase === "resolve"
            ? winnerIsPlayer
              ? "attack-land-character-fallen"
              : "attack-land-character-victor"
            : ""
        }`}
      >
        <div className="attack-land-character-position">
          <div className="attack-land-character-shake">
            <img
              className="attack-land-character-image"
              src={state.enemyImage}
              alt=""
              style={enemyTransform}
            />
          </div>
        </div>
        <div className="attack-land-echo-layer" aria-hidden="true">
          <img
            src={state.enemyImage}
            alt=""
            style={enemyTransform}
          />
        </div>
      </div>

      <div className="attack-land-radial-speed-overlay" aria-hidden="true">
        <video autoPlay loop muted playsInline preload="auto">
          <source
            src="/videos/effect/split-screen-struggle/abstract-radial-speed-lines.mp4"
            type="video/mp4"
          />
          <source
            src="/videos/effect/split-screen-struggle/abstract-radial-speed-lines.mov"
            type="video/quicktime"
          />
        </video>
      </div>

      <div className="attack-land-impact-divider" aria-hidden="true" />

      <div className="attack-land-white-flash" aria-hidden="true" />
    </div>
  );
}
