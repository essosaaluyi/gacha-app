"use client";

import BGMPlayer from "@/components/BGMPlayer";
import BattleBackground from "@/components/battle/BattleBackground";
import BattleGameCounter from "@/components/battle/BattleGameCounter";
import BattleHUD from "@/components/battle/BattleHUD";
import BattleLog from "@/components/battle/BattleLog";
import BattlePixiStage from "@/components/battle/BattlePixiStage";
import BattleSpawnScene from "@/components/battle/BattleSpawnScene";
import BattlePoints from "@/components/battle/BattlePoints";
import MagicCircleOverlay from "@/components/battle/MagicCircleOverlay";
import AttackFakeoutInsert from "@/components/battle/AttackFakeoutInsert";
import ChanceIconOverlay from "@/components/battle/ChanceIconOverlay";
import BattleQuitButton from "@/components/battle/BattleQuitButton";
import BonusOverlay from "@/components/battle/BonusOverlay";
import ResurrectionOverlay from "@/components/battle/ResurrectionOverlay";
import BarResetOverlay from "@/components/battle/BarResetOverlay";
import CollectionPhaseOverlay from "@/components/battle/CollectionPhaseOverlay";
import StatsGraphPanel from "@/components/battle/StatsGraphPanel";
import EnemyAttackCounter from "@/components/battle/EnemyAttackCounter";
import RoundInsert from "@/components/battle/RoundInsert";
import RoundMeter from "@/components/battle/RoundMeter";
import { useEffect, useState } from "react";
import { resetBattleRun } from "@/lib/battle-pixi/state/resetBattleRun";
import {
  getRoundInsertState,
  subscribeRoundInsert,
} from "@/lib/battle-pixi/state/roundInsertStore";

export default function BattleScreen() {
  const [openingActive, setOpeningActive] = useState(false);
  const [openingChecked, setOpeningChecked] = useState(false);
  const [stageScale, setStageScale] = useState(1);
  const [battleCoverActive, setBattleCoverActive] = useState(true);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.classList.add("battle-screen-active");
    document.body.style.overflow = "hidden";

    return () => {
      document.body.classList.remove("battle-screen-active");
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let revealTimer: number | null = null;
    const fallbackTimer = window.setTimeout(() => {
      setBattleCoverActive(false);
    }, 1400);

    const releaseCover = () => {
      if (!getRoundInsertState().visible) return;

      if (revealTimer) {
        window.clearTimeout(revealTimer);
      }

      revealTimer = window.setTimeout(() => {
        setBattleCoverActive(false);
      }, 120);
    };

    releaseCover();
    const unsubscribe = subscribeRoundInsert(releaseCover);

    return () => {
      window.clearTimeout(fallbackTimer);
      if (revealTimer) {
        window.clearTimeout(revealTimer);
      }
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const updateStageScale = () => {
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;

      setStageScale(
        Math.min(viewportWidth / 1600, viewportHeight / 900)
      );
    };

    updateStageScale();
    window.addEventListener("resize", updateStageScale);

    return () => {
      window.removeEventListener("resize", updateStageScale);
    };
  }, []);

  useEffect(() => {
    let openingTimer: number | null = null;

    const setupTimer = window.setTimeout(() => {
      resetBattleRun();

      const shouldPlayOpening =
        localStorage.getItem("battle_opening_pending") === "true";

      if (!shouldPlayOpening) {
        setOpeningChecked(true);
        return;
      }

      localStorage.removeItem("battle_opening_pending");
      setOpeningActive(true);
      setOpeningChecked(true);

      openingTimer = window.setTimeout(() => {
        setOpeningActive(false);
      }, 2400);
    }, 0);

    return () => {
      window.clearTimeout(setupTimer);

      if (openingTimer) {
        window.clearTimeout(openingTimer);
      }
    };
  }, []);

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <div className="fixed inset-0 flex items-center justify-center">
        <div
          className="relative bg-black battle-fixed-stage"
          style={{
            width: "1600px",
            height: "900px",
            flexShrink: 0,
            transform: `scale(${stageScale})`,
            transformOrigin: "center center",
          }}
        >
          <section
            className="absolute bg-black rounded-2xl border border-zinc-700 overflow-hidden"
            style={{
              left: "18%",
              top: "4%",
              width: "60%",
              aspectRatio: "16 / 9",
            }}
          >
            <BattleBackground />
            <BattleSpawnScene />
            <BattleHUD />
            <MagicCircleOverlay />
            <AttackFakeoutInsert />
            <BonusOverlay />
            <ResurrectionOverlay />
            <BarResetOverlay />
            <CollectionPhaseOverlay />
            <RoundInsert />
            <ChanceIconOverlay />
            {battleCoverActive && (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-black z-[9998] pointer-events-none"
              />
            )}

            <div
              style={{
                position: "absolute",
                top: "1.5%",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 80,
                width: "min(720px, 76%)",
                height: "52px",
              }}
            >
              <RoundMeter />
            </div>

            <div
              style={{
                position: "absolute",
                top: "13%",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 80,
              }}
            >
              <EnemyAttackCounter />
            </div>

            <div
              style={{
                position: "absolute",
                left: "3%",
                top: "3%",
                zIndex: 80,
              }}
            >
              <BattlePoints />
            </div>

            <div
              style={{
                position: "absolute",
                right: "3%",
                top: "3%",
                zIndex: 80,
              }}
            >
              <BattleGameCounter />
            </div>
          </section>

          <div
            className="absolute flex items-center justify-center overflow-hidden"
            style={{
              left: "18%",
              top: "60%",
              width: "60%",
              height: "46%",
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1200 / 500",
                maxHeight: "100%",
              }}
            >
              {openingChecked && !openingActive && <BattlePixiStage />}
            </div>
          </div>

          {openingActive && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-black z-[9999]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(59,130,246,0.22), rgba(0,0,0,0.94) 62%)",
              }}
            >
              <img
                src="/images/beginbattle.webp"
                alt="Battle Opening"
                className="w-[58%] max-w-[820px] object-contain animate-battleGlow"
              />

              <div className="mt-6 text-center">
                <div className="text-5xl font-black tracking-widest text-white drop-shadow-[0_0_22px_rgba(96,165,250,1)]">
                  BATTLE START
                </div>
                <div className="text-2xl font-bold text-blue-200 mt-3">
                  ROUND 1
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              position: "absolute",
              left: "2%",
              bottom: "8%",
              zIndex: 50,
            }}
          >
            <BattleLog />
          </div>

          <div
            style={{
              position: "absolute",
              left: "2%",
              top: "2%",
              zIndex: 50,
            }}
          >
            <BattleQuitButton />
          </div>

          <StatsGraphPanel />

          <div
            style={{
              position: "absolute",
              right: "2%",
              bottom: "8%",
              zIndex: 50,
            }}
          >
            <BGMPlayer />
          </div>
        </div>
      </div>
    </main>
  );
}
