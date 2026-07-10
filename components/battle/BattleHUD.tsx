"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import {
  getCurrentEnemy,
  subscribeCurrentEnemy,
} from "@/lib/battle-pixi/state/currentEnemyStore";

import {
  getBattleState,
  subscribeBattleState,
} from "@/lib/battle-pixi/state/battleStateStore";

import {
  getContinuesLeft,
  subscribeContinue,
} from "@/lib/battle-pixi/state/continueStore";

import {
  getEnemyDefeatPresentationKey,
  subscribeEnemyDefeatPresentation,
} from "@/lib/battle-pixi/state/enemyDefeatPresentationStore";

const UI = {
  ENEMY_IMAGE_HEIGHT: 270,
};

export default function BattleHUD() {
  const [enemy, setEnemy] = useState(getCurrentEnemy());
  const [battleState, setBattleStateValue] = useState(getBattleState());
  const [continuesLeft, setContinuesLeft] = useState(getContinuesLeft());
  const [enemyDefeatKey, setEnemyDefeatKey] = useState(
    getEnemyDefeatPresentationKey()
  );
  const [enemyDefeating, setEnemyDefeating] = useState(false);
  const enemyDefeatTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribeEnemy = subscribeCurrentEnemy(() => {
      setEnemy(getCurrentEnemy());
    });

    const unsubscribeBattleState = subscribeBattleState(() => {
      setBattleStateValue(getBattleState());
    });

    const unsubscribeContinue = subscribeContinue(() => {
      setContinuesLeft(getContinuesLeft());
    });

    const unsubscribeEnemyDefeat = subscribeEnemyDefeatPresentation(() => {
      setEnemyDefeatKey(getEnemyDefeatPresentationKey());
      setEnemyDefeating(true);

      if (enemyDefeatTimerRef.current) {
        window.clearTimeout(enemyDefeatTimerRef.current);
      }

      enemyDefeatTimerRef.current = window.setTimeout(() => {
        setEnemyDefeating(false);
        enemyDefeatTimerRef.current = null;
      }, 1100);
    });

    return () => {
      unsubscribeEnemy();
      unsubscribeBattleState();
      unsubscribeContinue();
      unsubscribeEnemyDefeat();

      if (enemyDefeatTimerRef.current) {
        window.clearTimeout(enemyDefeatTimerRef.current);
        enemyDefeatTimerRef.current = null;
      }
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

      {/* CENTER */}
      <div className="flex items-center justify-center">
        {battleState === "playerDefeated" && (
          <div
            style={{
              padding: "28px 42px",
              border: "3px solid rgba(255,255,255,0.85)",
              background: "rgba(0,0,0,0.75)",
              textAlign: "center",
              color: "white",
              pointerEvents: "none",
            }}
          >
            <p className="font-bold text-4xl mb-3">PLAYER DEFEATED</p>
            <p className="font-bold text-2xl">
              CONTINUE × {continuesLeft}
            </p>
            <p className="text-lg mt-3 opacity-80">Press Draw</p>
          </div>
        )}

        {battleState === "gameOver" && (
          <div
            style={{
              padding: "28px 42px",
              border: "3px solid rgba(255,255,255,0.85)",
              background: "rgba(0,0,0,0.8)",
              textAlign: "center",
              color: "white",
              pointerEvents: "none",
            }}
          >
            <p className="font-bold text-5xl mb-3">GAME OVER</p>
            <p className="text-lg opacity-80">No continues left</p>
          </div>
        )}
      </div>

      {/* ENEMY */}
      <div className="flex flex-col items-center justify-center gap-3">
        {enemy ? (
          <>
            <div
              key={`${enemy.id}-${enemyDefeatKey}`}
              className={enemyDefeating ? "battle-enemy-card-defeating" : ""}
              style={{
                position: "relative",
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src={enemy.image}
                alt={enemy.name}
                className="battle-enemy-card-image"
                style={{
                  height: `${UI.ENEMY_IMAGE_HEIGHT}px`,
                  width: "auto",
                  display: "block",
                }}
              />
              {enemyDefeating &&
                Array.from({ length: 10 }, (_, index) => (
                  <span
                    key={index}
                    className="battle-enemy-card-shard"
                    style={
                      {
                        "--shard-index": index,
                        "--shard-x": `${(index - 4.5) * 34}px`,
                        "--shard-y": `${(Math.abs(index - 4.5) - 2) * 22}px`,
                        "--shard-rotation": `${(index - 4.5) * 22}deg`,
                      } as CSSProperties
                    }
                  />
                ))}
            </div>

            <p className="font-bold text-xl">{enemy.name}</p>
          </>
        ) : (
          <p className="font-bold text-xl">Waiting...</p>
        )}
      </div>
    </div>
  );
}
