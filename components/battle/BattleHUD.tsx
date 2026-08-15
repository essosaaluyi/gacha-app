"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getCurrentEnemy, subscribeCurrentEnemy } from "@/lib/battle-pixi/state/currentEnemyStore";
import { getBattleState, subscribeBattleState } from "@/lib/battle-pixi/state/battleStateStore";
import {
  getEnemyDefeatPresentationKey,
  subscribeEnemyDefeatPresentation,
} from "@/lib/battle-pixi/state/enemyDefeatPresentationStore";
import { getEnemyCharacterName } from "@/lib/battle-pixi/config/characterNames";

const UI = { ENEMY_IMAGE_HEIGHT: 270 };

export default function BattleHUD() {
  const [enemy, setEnemy] = useState(getCurrentEnemy());
  const [battleState, setBattleStateValue] = useState(getBattleState());
  const [enemyDefeatKey, setEnemyDefeatKey] = useState(getEnemyDefeatPresentationKey());
  const [enemyDefeating, setEnemyDefeating] = useState(false);
  const enemyDefeatTimerRef = useRef<number | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preview = pathname === "/battle-sim" ? searchParams.get("preview") : null;
  const showPlayerDefeated = battleState === "playerDefeated" || preview === "defeat";
  const showGameOver = battleState === "gameOver" || preview === "game-over";

  useEffect(() => {
    const unsubscribeEnemy = subscribeCurrentEnemy(() => setEnemy(getCurrentEnemy()));
    const unsubscribeBattleState = subscribeBattleState(() => setBattleStateValue(getBattleState()));
    const unsubscribeEnemyDefeat = subscribeEnemyDefeatPresentation(() => {
      setEnemyDefeatKey(getEnemyDefeatPresentationKey());
      setEnemyDefeating(true);
      if (enemyDefeatTimerRef.current) window.clearTimeout(enemyDefeatTimerRef.current);
      enemyDefeatTimerRef.current = window.setTimeout(() => {
        setEnemyDefeating(false);
        enemyDefeatTimerRef.current = null;
      }, 1100);
    });

    return () => {
      unsubscribeEnemy();
      unsubscribeBattleState();
      unsubscribeEnemyDefeat();
      if (enemyDefeatTimerRef.current) window.clearTimeout(enemyDefeatTimerRef.current);
    };
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr 320px",
        width: "100%",
        height: "100%",
        position: "relative",
        zIndex: 10,
      }}
    >
      <div />

      <div className="battle-defeat-layer">
        {showPlayerDefeated && (
          <div className="battle-defeat-overlay" role="status" aria-live="assertive">
            <img className="battle-defeat-frame" src="/images/battle-ui/production/v1/transparent/player-defeated-overlay-frame-v1.png" alt="" />
            <div className="battle-defeat-content">
              <img className="battle-defeat-title-art" src="/images/battle-ui/production/v1/transparent/player-defeated-title-v1.png" alt="" />
              <span className="sr-only">Player Defeated</span>
            </div>
          </div>
        )}

        {showGameOver && !showPlayerDefeated && (
          <div className="battle-defeat-overlay battle-game-over" role="status" aria-live="assertive">
            <img className="battle-defeat-frame" src="/images/battle-ui/production/v1/transparent/player-defeated-overlay-frame-v1.png" alt="" />
            <div className="battle-defeat-content">
              <p className="battle-defeat-title">Game Over</p>
              <p className="battle-game-over-copy">No cards remaining</p>
            </div>
          </div>
        )}
      </div>

      <div className="hidden" aria-hidden="true">
        {enemy ? (
          <>
            <div
              key={`${enemy.id}-${enemyDefeatKey}`}
              className={enemyDefeating ? "battle-enemy-card-defeating" : ""}
              style={{ position: "relative", display: "inline-flex", justifyContent: "center", alignItems: "center" }}
            >
              <img
                src={enemy.image}
                alt={getEnemyCharacterName(enemy).label}
                className="battle-enemy-card-image"
                style={{ height: `${UI.ENEMY_IMAGE_HEIGHT}px`, width: "auto", display: "block" }}
              />
              {enemyDefeating && Array.from({ length: 10 }, (_, index) => (
                <span
                  key={index}
                  className="battle-enemy-card-shard"
                  style={{
                    "--shard-index": index,
                    "--shard-x": `${(index - 4.5) * 34}px`,
                    "--shard-y": `${(Math.abs(index - 4.5) - 2) * 22}px`,
                    "--shard-rotation": `${(index - 4.5) * 22}deg`,
                  } as CSSProperties}
                />
              ))}
            </div>
            <p className="font-bold text-xl">
              {getEnemyCharacterName(enemy).label}
            </p>
          </>
        ) : (
          <p className="font-bold text-xl">Waiting...</p>
        )}
      </div>
    </div>
  );
}
