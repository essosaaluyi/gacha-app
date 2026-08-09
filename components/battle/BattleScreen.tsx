"use client";

import BattleBackground from "@/components/battle/BattleBackground";
import BattleGameCounter from "@/components/battle/BattleGameCounter";
import BattleHUD from "@/components/battle/BattleHUD";
import BattleLog from "@/components/battle/BattleLog";
import BattlePixiStage from "@/components/battle/BattlePixiStage";
import BattleSpawnScene from "@/components/battle/BattleSpawnScene";
import BattlePoints from "@/components/battle/BattlePoints";
import MagicCircleOverlay from "@/components/battle/MagicCircleOverlay";
import AttackFakeoutInsert from "@/components/battle/AttackFakeoutInsert";
import AttackLandRevealOverlay from "@/components/battle/AttackLandRevealOverlay";
import FakeoutChanceReveal from "@/components/battle/FakeoutChanceReveal";
import ChancePointsRevealOverlay from "@/components/battle/ChancePointsRevealOverlay";
import ChanceIconOverlay from "@/components/battle/ChanceIconOverlay";
import BonusOverlay from "@/components/battle/BonusOverlay";
import ResurrectionOverlay from "@/components/battle/ResurrectionOverlay";
import BarResetOverlay from "@/components/battle/BarResetOverlay";
import CollectionPhaseOverlay from "@/components/battle/CollectionPhaseOverlay";
import CollectionPointsHandoff from "@/components/battle/CollectionPointsHandoff";
import {
  dismissCollectionResult,
  getCollectionState,
  hydrateCollectionFromStorage,
  startCollectionPhase,
  subscribeCollection,
} from "@/lib/battle-pixi/state/collectionStore";
import {
  getPlayerFatalModeOpeningState,
  subscribePlayerFatalModeOpening,
} from "@/lib/battle-pixi/state/playerFatalModeOpeningStore";
import StatsGraphPanel from "@/components/battle/StatsGraphPanel";
import EnemyAttackCounter from "@/components/battle/EnemyAttackCounter";
import RoundInsert from "@/components/battle/RoundInsert";
import RoundMeter from "@/components/battle/RoundMeter";
import BattleCutInOverlay from "@/components/battle/BattleCutInOverlay";
import ReelComboOverlay from "@/components/battle/ReelComboOverlay";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  startBonusGames,
  startBonusOpening,
} from "@/lib/battle-pixi/state/bonusModeStore";
import {
  setBonusGameText,
  showBonusStaticBackground,
} from "@/lib/battle-pixi/state/bonusPresentationStore";
import { useRouter, useSearchParams } from "next/navigation";
import { resetBattleRun } from "@/lib/battle-pixi/state/resetBattleRun";
import {
  loadBattleSession,
  clearBattleSession,
} from "@/lib/battle-pixi/state/battleSessionStore";
import {
  CARDS_PER_DRAW,
  saveBattleRunSummary,
  type BattleRunEnding,
} from "@/lib/battle-pixi/state/battleRunSummaryStore";
import { getGameCount } from "@/lib/battle-pixi/state/battleGameStore";
import { getCurrentBattleId, getEvents } from "@/lib/events/gameEventStore";
import {
  getBattleState,
  subscribeBattleState,
} from "@/lib/battle-pixi/state/battleStateStore";
import {
  restoreBattleFromSnapshot,
  startAutoSave,
  stopAutoSave,
} from "@/lib/battle-pixi/state/battleSessionSync";
import {
  playBgm,
  pauseBgm,
  stopBgm,
  getBgmMuted,
  setBgmMuted,
} from "@/lib/audio/bgmStore";
import { playSfx, preloadSfx, unlockSfx } from "@/lib/audio/sfxStore";
import { getWalletState, initializeWallet } from "@/lib/wallet/walletStore";
import { getCurrentRound } from "@/lib/battle-pixi/state/roundStore";
import {
  getUpcomingPlayerBattleCards,
  subscribePlayerBattleCard,
} from "@/lib/battle-pixi/state/playerBattleCardStore";
import {
  getRoundInsertState,
  subscribeRoundInsert,
} from "@/lib/battle-pixi/state/roundInsertStore";
import {
  getBattlePresentationFlow,
  subscribeBattlePresentationFlow,
} from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import {
  CABINET_TABLE_DEPTH_SCALE,
  CABINET_TABLE_PITCH_OFFSET_Y,
} from "@/lib/battle-pixi/presentation/cabinetTableGeometry";

// Battle opening. The clip runs ~18s; the backstop is deliberately well past
// that so a slow start never truncates it, and only catches a clip that never
// fires `ended` at all.
const BATTLE_OPENING_MAX_MS = 30_000;
const BATTLE_OPENING_FADE_MS = 700;

/** How long GAME OVER holds the screen before the run report takes over. */
const GAME_OVER_HOLD_MS = 2600;

const PlayerFatalModeOpeningInsertTest = dynamic(
  () => import("@/components/battle/PlayerFatalModeOpeningInsertTest"),
  { ssr: false }
);

/**
 * Freezes the run's numbers for /battle-result. Must be called BEFORE any
 * teardown (clearBattleSession / resetBattleRun): those reset the very stores
 * being read here, and the result screen is a separate route that cannot see
 * them afterwards regardless.
 */
function captureRunSummary(ending: BattleRunEnding) {
  const gamesPlayed = getGameCount();
  const battleId = getCurrentBattleId();

  // Counted from real defeat events for this battle, not derived from the round
  // number -- a round can end without a kill.
  const enemiesDefeated = battleId
    ? getEvents({ battleId, kinds: ["enemyDefeated"] }).length
    : 0;

  saveBattleRunSummary({
    round: getCurrentRound(),
    gamesPlayed,
    enemiesDefeated,
    pointsEarned: getWalletState().sessionEarnedPoints,
    cardsDrawn: gamesPlayed * CARDS_PER_DRAW,
    ending,
  });
}

export default function BattleScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openingActive, setOpeningActive] = useState(false);
  const [openingChecked, setOpeningChecked] = useState(false);
  const [openingFading, setOpeningFading] = useState(false);
  const [stageScale, setStageScale] = useState(1);
  const [battleCoverActive, setBattleCoverActive] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const [presentationFlow, setPresentationFlow] = useState(getBattlePresentationFlow());
  const [guaranteedWinBlackout, setGuaranteedWinBlackout] = useState(false);
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [bgmMuted, setBgmMutedState] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [cabinetReact, setCabinetReact] = useState<string | null>(null);
  const [chanceWaitActive, setChanceWaitActive] = useState(false);
  // Quitting ends the run and deletes the resume save, so it asks first.
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
  // Shown in the quit dialog so the player can see what they'd be walking away
  // from before they confirm.
  const [quitSummary, setQuitSummary] = useState({ round: 1, earned: 0 });
  const [memoryLedFill, setMemoryLedFill] = useState<string | null>(null);
  const [memoryLedEnabled, setMemoryLedEnabled] = useState(true);
  const fatalModeOpeningParam = searchParams.get(
    "player-fatal-mode-opening-insert"
  );
  const fatalModeCard = searchParams.get("fatal-mode-card");
  const fatalModeOpeningEnabled =
    process.env.NODE_ENV !== "production" &&
    fatalModeCard === "R4" &&
    (fatalModeOpeningParam === "once" || fatalModeOpeningParam === "loop");
  // Dev entry point: ?start=bonus drops straight into the bonus round with
  // games banked, so the first DRAW press runs a real bonus hand.
  const startBonusRound =
    process.env.NODE_ENV !== "production" &&
    searchParams.get("start") === "bonus";
  const startCollectionPreview =
    process.env.NODE_ENV !== "production" &&
    searchParams.get("start") === "collection";
  const attackLandPreview =
    process.env.NODE_ENV !== "production" ? searchParams.get("preview") : null;
  const attackLandPreviewWinner =
    attackLandPreview === "struggle-player"
      ? "player"
      : attackLandPreview === "struggle-enemy"
        ? "enemy"
        : null;
  const fatalModeToneParam = searchParams.get("fatal-mode-tone");
  const fatalModeOpeningTone =
    fatalModeToneParam === "blue" ||
    fatalModeToneParam === "green" ||
    fatalModeToneParam === "red"
      ? fatalModeToneParam
      : "white";

  const [handCards, setHandCards] = useState(() =>
    getUpcomingPlayerBattleCards(3)
  );

  useEffect(() => {
    return subscribePlayerBattleCard(() => {
      setHandCards(getUpcomingPlayerBattleCards(3));
    });
  }, []);

  // Disk-exit pile: idle (hidden) -> set (backs out of the disk, flat) ->
  // launching (backs slide across the disk->table gap to the Pixi entry) ->
  // consumed (cards have traveled onto the tilted table).
  const [pileState, setPileState] = useState<
    "idle" | "set" | "launching" | "consumed"
  >("idle");
  const [collectionScene, setCollectionScene] = useState(false);
  const [collectionResultReady, setCollectionResultReady] = useState(false);
  const [collectionHandoff, setCollectionHandoff] = useState<{
    key: number;
    points: number;
  } | null>(null);

  useEffect(() => {
    const handlePileState = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const state = event.detail?.state;
      if (
        state === "idle" ||
        state === "set" ||
        state === "launching" ||
        state === "consumed"
      ) {
        setPileState(state);
      }
    };

    window.addEventListener("battle:cabinet-pile", handlePileState);
    return () => {
      window.removeEventListener("battle:cabinet-pile", handlePileState);
    };
  }, []);

  // Cabinet reaction: a screen event lights up one of the physical props for a
  // beat, so the machine reads as a single linked unit rather than a screen
  // with scenery around it.
  useEffect(() => {
    let clearTimer: number | null = null;

    const handleReact = (event: Event) => {
      const prop =
        event instanceof CustomEvent && typeof event.detail?.prop === "string"
          ? event.detail.prop
          : "led";

      setCabinetReact(prop);

      if (clearTimer !== null) window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(() => setCabinetReact(null), 2400);
    };

    window.addEventListener("battle:cabinet-react", handleReact);
    return () => {
      window.removeEventListener("battle:cabinet-react", handleReact);
      if (clearTimer !== null) window.clearTimeout(clearTimer);
    };
  }, []);

  useEffect(() => {
    const handleMemoryLedColor = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const fill = event.detail?.color;
      const enabled = event.detail?.enabled;

      setMemoryLedFill(typeof fill === "string" && fill.trim() ? fill : null);
      if (typeof enabled === "boolean") setMemoryLedEnabled(enabled);
    };

    window.addEventListener("battle:set-memory-led-color", handleMemoryLedColor);
    return () => {
      window.removeEventListener("battle:set-memory-led-color", handleMemoryLedColor);
    };
  }, []);

  useEffect(() => {
    let clearTimer: number | null = null;

    const handleChanceSweep = (event: Event) => {
      const durationMs =
        event instanceof CustomEvent &&
        typeof event.detail?.durationMs === "number"
          ? event.detail.durationMs
          : 4100;

      setChanceWaitActive(true);
      if (clearTimer !== null) window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(() => {
        clearTimer = null;
        setChanceWaitActive(false);
      }, durationMs);
    };

    window.addEventListener("battle:chance-card-sweep", handleChanceSweep);
    return () => {
      window.removeEventListener("battle:chance-card-sweep", handleChanceSweep);
      if (clearTimer !== null) window.clearTimeout(clearTimer);
    };
  }, []);

  useEffect(() => {
    setBgmMutedState(getBgmMuted());
    preloadSfx();
    // Direct loads / reloads of /battle skip the menu, so the wallet may not
    // be in memory yet — draws would fail on a stale 0 balance otherwise.
    if (!getWalletState().loaded) void initializeWallet();
    // A reload mid-pick comes back into the pick scene, not the battle scene.
    hydrateCollectionFromStorage();
    const collection = getCollectionState();
    if (
      startCollectionPreview &&
      !collection.active &&
      !collection.finished &&
      !collection.awaitingExtraDeal
    ) {
      startCollectionPhase(600);
    }
  }, [startCollectionPreview]);

  useEffect(() => {
    const unlock = () => unlockSfx();

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("click", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("click", unlock);
    };
  }, []);

  useEffect(() => subscribeBattlePresentationFlow(() => {
    setPresentationFlow(getBattlePresentationFlow());
  }), []);

  // Game over ends the run: hold the GAME OVER plate on screen long enough to
  // read, then hand off to the run report. The summary is captured before
  // clearBattleSession() so the report still has the numbers to show -- the
  // stores it reads are torn down by that call.
  useEffect(() => {
    let handoff: number | null = null;

    const unsubscribe = subscribeBattleState(() => {
      if (getBattleState() !== "gameOver" || handoff !== null) return;

      handoff = window.setTimeout(() => {
        handoff = null;
        captureRunSummary("gameOver");
        clearBattleSession();
        router.push("/battle-result");
      }, GAME_OVER_HOLD_MS);
    });

    return () => {
      unsubscribe();
      if (handoff !== null) window.clearTimeout(handoff);
    };
  }, [router]);

  // The fatal-mode insert is a full-screen takeover, so the cabinet's own
  // lights are cut for its duration — the bottom LED panel and the top-left
  // memory board. Without this the machine keeps cheerfully glowing around a
  // beat that is meant to own the room.
  const [fatalInsertActive, setFatalInsertActive] = useState(false);

  useEffect(() => {
    const sync = () =>
      setFatalInsertActive(getPlayerFatalModeOpeningState().active);
    sync();
    return subscribePlayerFatalModeOpening(sync);
  }, []);

  // Both blackout sources drive the same switch, so they can never fight.
  const ledsBlackedOut = guaranteedWinBlackout || fatalInsertActive;

  // Ends the battle opening: fades the overlay out, then unmounts it. Called
  // by the video's own end, by an error, and by the backstop timer -- so it
  // guards against running twice.
  const openingFinishedRef = useRef(false);

  const finishBattleOpening = useCallback(() => {
    if (openingFinishedRef.current) return;
    openingFinishedRef.current = true;

    setOpeningFading(true);
    window.setTimeout(() => {
      setOpeningActive(false);
      setOpeningFading(false);
    }, BATTLE_OPENING_FADE_MS);
  }, []);

  // Which scene owns the cabinet screen is read from the collection store
  // itself, not from the presentation phase: resetBattleRun resets the phase
  // on every entry into /battle but leaves the store alone, so a phase check
  // would drop a restored pick phase back into the battle scene.
  useEffect(() => {
    const sync = () => {
      const snap = getCollectionState();
      const ownsScreen = snap.active || snap.finished || snap.awaitingExtraDeal;
      setCollectionScene(ownsScreen);
      if (!ownsScreen || snap.active || snap.awaitingExtraDeal) {
        setCollectionResultReady(false);
      }
    };
    sync();
    return subscribeCollection(sync);
  }, []);

  useEffect(() => {
    let clearTimer: number | null = null;

    const showHandoff = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const points = Number(event.detail?.banked) || 0;
      if (points <= 0) return;

      setCollectionHandoff({ key: Date.now(), points });
      if (clearTimer !== null) window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(() => {
        setCollectionHandoff(null);
        clearTimer = null;
      }, 3400);
    };

    window.addEventListener("battle:collection-dismissed", showHandoff);
    return () => {
      window.removeEventListener("battle:collection-dismissed", showHandoff);
      if (clearTimer !== null) window.clearTimeout(clearTimer);
    };
  }, []);

  useEffect(() => {
    let restoreTimer: number | null = null;

    const handleGuaranteedWinBlackout = (event: Event) => {
      const durationMs =
        event instanceof CustomEvent && typeof event.detail?.durationMs === "number"
          ? event.detail.durationMs
          : 720;

      if (restoreTimer !== null) window.clearTimeout(restoreTimer);
      setGuaranteedWinBlackout(true);
      restoreTimer = window.setTimeout(() => {
        setGuaranteedWinBlackout(false);
        restoreTimer = null;
      }, durationMs);
    };

    window.addEventListener("battle:guaranteed-win-blackout", handleGuaranteedWinBlackout);

    return () => {
      window.removeEventListener("battle:guaranteed-win-blackout", handleGuaranteedWinBlackout);
      if (restoreTimer !== null) window.clearTimeout(restoreTimer);
    };
  }, []);

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
    // Same measurement as the v8 mockup's fit(): visualViewport first.
    const updateStageScale = () => {
      const viewportWidth =
        window.visualViewport?.width ||
        window.innerWidth ||
        document.documentElement.clientWidth;
      const viewportHeight =
        window.visualViewport?.height ||
        window.innerHeight ||
        document.documentElement.clientHeight;
      const nextScale = Math.min(viewportWidth / 1920, viewportHeight / 1080);

      // A hidden or mid-layout viewport can report 0; keep the last good scale.
      if (!Number.isFinite(nextScale) || nextScale <= 0) return;

      setStageScale(nextScale);
    };

    updateStageScale();
    window.addEventListener("resize", updateStageScale);
    window.visualViewport?.addEventListener("resize", updateStageScale);

    // The viewport can settle after first paint without firing resize
    // (the v8 mockup re-runs fit() on the same delays).
    const settleTimers = [
      window.setTimeout(updateStageScale, 300),
      window.setTimeout(updateStageScale, 1000),
    ];

    return () => {
      window.removeEventListener("resize", updateStageScale);
      window.visualViewport?.removeEventListener("resize", updateStageScale);
      settleTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!audioReady) return;

    let openingTimer: number | null = null;

    const setupTimer = window.setTimeout(() => {
      // Check for a saved session to resume. The "resume" flag is set by the
      // menu page's Continue button; without it a direct /battle visit always
      // starts fresh (the old behaviour).
      const resumeRequested =
        localStorage.getItem("battle_resume_requested") === "true";
      const savedSession = resumeRequested ? loadBattleSession() : null;

      if (resumeRequested) {
        localStorage.removeItem("battle_resume_requested");
      }

      if (savedSession) {
        restoreBattleFromSnapshot(savedSession);
        clearBattleSession();
        startAutoSave();
        setOpeningChecked(true);
        return;
      }

      resetBattleRun();
      startAutoSave();

      if (startBonusRound) {
        startBonusOpening();
        startBonusGames(5);
        setBonusGameText("5/5");
        showBonusStaticBackground();
        setOpeningChecked(true);
        return;
      }

      const shouldPlayOpening =
        localStorage.getItem("battle_opening_pending") === "true";

      if (!shouldPlayOpening) {
        setOpeningChecked(true);
        return;
      }

      localStorage.removeItem("battle_opening_pending");
      setOpeningActive(true);
      setOpeningChecked(true);
      playSfx("battleOpening");

      // Backstop only. The video's own end drives the hand-off; this just
      // guarantees the opening can never strand the player on a black screen.
      openingTimer = window.setTimeout(
        finishBattleOpening,
        BATTLE_OPENING_MAX_MS
      );
    }, 0);

    return () => {
      window.clearTimeout(setupTimer);

      if (openingTimer) {
        window.clearTimeout(openingTimer);
      }

      // Detach the beforeunload/visibilitychange handlers with the screen,
      // otherwise they outlive it and keep writing snapshots after the player
      // has left the battle.
      stopAutoSave();
    };
  }, [audioReady, startBonusRound]);

  const toggleBgm = async () => {
    if (bgmPlaying) {
      pauseBgm();
      setBgmPlaying(false);
      return;
    }

    await playBgm();
    setBgmPlaying(true);
  };

  const toggleMute = () => {
    const next = !bgmMuted;

    setBgmMuted(next);
    setBgmMutedState(next);
  };

  // The DRAW button drives the mockup's cycle: press 1 sets the pile at the
  // disk exit, press 2 places the cards onto the table.
  const pileIsSet = pileState === "set";
  const bonusVideoActive = presentationFlow.phase === "bonus_video";
  const drawLocked = !bonusVideoActive && presentationFlow.phase !== "next_round_ready" && !pileIsSet;
  const collectionActive = collectionScene;
  const cabinetDrawLocked = collectionActive
    ? !collectionResultReady
    : drawLocked;

  const handleDrawPress = () => {
    unlockSfx();
    // Draw-button feedback: play on every press, no matter what it triggers.
    playSfx("buttonPush");

    if (collectionActive) {
      if (collectionResultReady) dismissCollectionResult();
      return;
    }

    if (bonusVideoActive) {
      window.dispatchEvent(new Event("battle:skip-bonus-video"));
      return;
    }

    window.dispatchEvent(
      new Event(pileIsSet ? "battle:release-cards" : "battle:request-draw")
    );
  };

  const handleAutoToggle = () => {
    const next = !autoEnabled;
    setAutoEnabled(next);
    window.dispatchEvent(new CustomEvent("battle:set-auto", { detail: next }));
  };

  const handleStartBattle = () => {
    stopBgm();
    unlockSfx();
    playSfx("buttonPush");
    setBattleCoverActive(true);
    setAudioReady(true);
  };

  return (
    <main
      className={`fixed inset-0 overflow-hidden battle-cabinet-shell ${
        cabinetReact ? `bcab-react bcab-react-${cabinetReact}` : ""
      }`}
    >
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Share+Tech+Mono&family=Rajdhani:wght@500;600;700&display=swap"
      />
      <div className="fixed inset-0 flex items-center justify-center">
        <div
          className="relative battle-fixed-stage battle-cabinet-stage"
          style={{
            width: "1920px",
            height: "1080px",
            flexShrink: 0,
            transform: `scale(${stageScale})`,
            transformOrigin: "center center",
          }}
        >

          <div className="bcab-bezel">
            <button
              type="button"
              className="bcab-svc-btn bcab-svc-quit"
              onClick={() => {
                playSfx("buttonPush");
                setQuitSummary({
                  round: getCurrentRound(),
                  earned: getWalletState().sessionEarnedPoints,
                });
                setQuitConfirmOpen(true);
              }}
              aria-label="Quit battle"
            >
              ✕&ensp;QUIT GAME
            </button>
            <div className="bcab-svc-cluster">
              <button
                type="button"
                className={`bcab-svc-btn bcab-svc-speaker ${bgmPlaying ? "bcab-svc-on" : ""}`}
                onClick={toggleBgm}
                title="BGM"
                aria-label={bgmPlaying ? "Pause background music" : "Play background music"}
              >
                ♪
              </button>
              <button
                type="button"
                className={`bcab-svc-btn bcab-svc-speaker ${bgmMuted ? "" : "bcab-svc-on"}`}
                onClick={toggleMute}
                title="Volume"
                aria-label={bgmMuted ? "Unmute background music" : "Mute background music"}
              >
                ◉
              </button>
            </div>
          </div>

          <div
            className={`bcab-memboard ${chanceWaitActive ? "bcab-memboard-chance-wait" : ""}`}
            aria-hidden="true"
            data-led-state={ledsBlackedOut || !memoryLedEnabled ? "off" : "on"}
            style={
              memoryLedFill
                ? ({ "--bcab-memory-led-fill": memoryLedFill } as CSSProperties)
                : undefined
            }
          >
            <div className="bcab-memboard-led-glow" />
            <div className="bcab-memboard-led-color" />
            <div className="bcab-memboard-led-texture" />
            <div className="bcab-memboard-chance-sweep" />
          </div>

          <section
            className="absolute battle-cabinet-screen"
            style={{ left: "330px", top: "88px", width: "1250px", height: "618px" }}
          >
            <div className="bcab-screen">
              {/* The pick phase is a scene of its own, not a layer over the
                  battle: while it owns the screen the battlefield, HUD and
                  every other overlay are unmounted rather than hidden behind
                  it, so nothing can animate underneath or pop in front. */}
              {!collectionActive && <BattleBackground />}
              {audioReady && collectionActive && (
                <CollectionPhaseOverlay
                  onResultReadyChange={setCollectionResultReady}
                />
              )}
              {audioReady && !collectionActive && (
                <>
                  <BattleSpawnScene />
                  <BattleHUD />
                  <MagicCircleOverlay />
                  <AttackFakeoutInsert />
                  <FakeoutChanceReveal />
                  <AttackLandRevealOverlay previewWinner={attackLandPreviewWinner} />
                  <ChancePointsRevealOverlay />
                  <BonusOverlay />
                  <ResurrectionOverlay />
                  <BarResetOverlay />
                  <RoundInsert />
                  {collectionHandoff && (
                    <CollectionPointsHandoff
                      key={collectionHandoff.key}
                      points={collectionHandoff.points}
                    />
                  )}
                  <BattleCutInOverlay />
                  <ChanceIconOverlay />
                  <PlayerFatalModeOpeningInsertTest
                    cardId="R4"
                    // Query mode remains the deterministic dev preview; null
                    // listens for the production post-win draw trigger.
                    mode={fatalModeOpeningEnabled ? fatalModeOpeningParam : null}
                    tone={fatalModeOpeningTone}
                  />
                </>
              )}
              {battleCoverActive && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-black z-[9998] pointer-events-none"
                />
              )}

              {/* Screen furniture belongs to the battle scene, so it leaves
                  with it while the pick phase owns the screen. */}
              {!collectionActive && (
                <>
              <div
                style={{
                  position: "absolute",
                  top: "1.5%",
                  // 50%, not 54% — paired with translateX(-50%) this centres
                  // the roadmap exactly. The old 54% pushed it 28px right.
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 80,
                  width: "min(576px, 60%)",
                  height: "84px",
                }}
              >
                <RoundMeter />
              </div>

              {/* Sits just above the enemy's head.
                  Anchored to the character's VISIBLE centre, measured from the
                  sprite's opaque bounds rather than its box: the frame is
                  960x960 but the art only occupies x 0.301-0.786, so its real
                  centre is 0.544 across, not 0.5. On the cabinet screen that
                  lands at 85.9%, and the head starts at ~41% down.
                  Centring via left + translateX(-50%) keeps this correct if
                  the gauge is ever resized. Nudge `top` to raise/lower it. */}
              <div
                style={{
                  position: "absolute",
                  top: "27%",
                  left: "85.9%",
                  transform: "translateX(-50%)",
                  zIndex: 80,
                }}
              >
                <EnemyAttackCounter />
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
                </>
              )}
            </div>
          </section>

          <div className="bcab-led-panel">
            <div className="bcab-logo">
              DESTINY<span>WARS</span>
            </div>
            <BattleLog variant="ticker" />
            <StatsGraphPanel inline />
            <div className="bcab-mascot" aria-hidden="true">
              <img src="/images/cabinet/statue.png" alt="" />
            </div>
            <img className="bcab-grille" src="/images/cabinet/grille-wide.png" alt="" aria-hidden="true" />
          </div>

          <div
            className="bcab-deck"
            data-led-state={ledsBlackedOut ? "off" : "on"}
          >
            <div className="bcab-lower-led-panel" aria-hidden="true">
              <img
                className="bcab-lower-led-state bcab-lower-led-bridge"
                src="/images/battle-ui/lower-cabinet-led-v3/lower-cabinet-center-bridge-v3.webp"
                alt=""
              />
              <img
                className="bcab-lower-led-state bcab-lower-led-state-off"
                src="/images/battle-ui/lower-cabinet-led-v3/lower-cabinet-led-left-off-v3.webp"
                alt=""
              />
              <img
                className="bcab-lower-led-state bcab-lower-led-state-off"
                src="/images/battle-ui/lower-cabinet-led-v3/lower-cabinet-led-right-off-v3.webp"
                alt=""
              />
              <img
                className="bcab-lower-led-state bcab-lower-led-state-on"
                src="/images/battle-ui/lower-cabinet-led-v3/lower-cabinet-led-left-on-v3.webp"
                alt=""
              />
              <img
                className="bcab-lower-led-state bcab-lower-led-state-on"
                src="/images/battle-ui/lower-cabinet-led-v3/lower-cabinet-led-right-on-v3.webp"
                alt=""
              />
            </div>
            <div className="bcab-card-layer" aria-hidden="true" />
            <div className="bcab-disk-well" aria-hidden="true">
              <div className="bcab-disk" />
            </div>
            <div className="bcab-disk-ring" aria-hidden="true" />
            <button
              type="button"
              className={`bcab-draw-btn ${
                cabinetDrawLocked ? "bcab-draw-locked" : ""
              }`}
              aria-label={
                collectionResultReady
                  ? "Continue to next round"
                  : bonusVideoActive
                    ? "Skip bonus video"
                    : "Draw cards"
              }
              aria-disabled={cabinetDrawLocked}
              disabled={cabinetDrawLocked}
              onClick={handleDrawPress}
            />

            {/* The tape releases when ROUND COMPLETE appears. The physical
                DRAW button then becomes the only way to leave Pick a Bonus. */}
            {collectionActive && !collectionResultReady && (
              <div className="bcab-keepout" aria-hidden="true">
                <span className="bcab-keepout-tape bcab-keepout-tape-a">
                  KEEP OUT · KEEP OUT · KEEP OUT · KEEP OUT
                </span>
                <span className="bcab-keepout-tape bcab-keepout-tape-b">
                  KEEP OUT · KEEP OUT · KEEP OUT · KEEP OUT
                </span>
              </div>
            )}
            <div
              className={`bcab-disk-deck ${
                pileIsSet || pileState === "launching" ? "bcab-set" : ""
              } ${pileState === "launching" ? "bcab-launching" : ""} ${
                pileState === "consumed" ? "bcab-consumed" : ""
              }`}
              style={{
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              <div className="bcab-stack">
                <div className="bcab-back" />
                <div className="bcab-back" />
                <div className="bcab-back" />
              </div>
            </div>
            <button
              type="button"
              className={`bcab-auto ${autoEnabled ? "bcab-auto-on" : ""}`}
              aria-pressed={autoEnabled}
              aria-label={autoEnabled ? "Turn auto play off" : "Turn auto play on"}
              onClick={handleAutoToggle}
            >
              <span className="bcab-auto-led" aria-hidden="true" />
              <span className="bcab-auto-label">AUTO</span>
              <span className="bcab-auto-state">{autoEnabled ? "ON" : "OFF"}</span>
            </button>

            <div
              className="bcab-table-space"
              style={{
                transform: `translateY(${CABINET_TABLE_PITCH_OFFSET_Y}px) scaleY(${CABINET_TABLE_DEPTH_SCALE})`,
                transformOrigin: "50% 0",
              }}
            >
              <div className="bcab-card-table">
                <div className="bcab-table-glass">
                  <div className="bcab-pixi-mount">
                    {audioReady && openingChecked && !openingActive && (
                      <BattlePixiStage cabinetMode />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bcab-hand" aria-hidden="true">
              {handCards.map((card) => (
                <div className="bcab-hcard" key={card.name}>
                  <img className="bcab-hcard-art" src={card.image} alt="" />
                </div>
              ))}
              <div className="bcab-hand-label">YOUR HAND</div>
            </div>
          </div>

          {/* Spans the screen AND the card deck, so a combination lights the
              whole cabinet at once rather than just the table. */}
          {audioReady && <ReelComboOverlay />}

          {quitConfirmOpen && (
            <div
              className="bcab-quit-confirm-layer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="bcab-quit-title"
            >
              <div className="bcab-quit-confirm">
                <h2 id="bcab-quit-title">End this battle?</h2>
                <p>
                  Your run ends here and the saved battle is deleted. Points you
                  have already earned are kept.
                </p>

                <div className="bcab-quit-stats">
                  <div>
                    <span>Round</span>
                    <strong>{quitSummary.round}</strong>
                  </div>
                  <div>
                    <span>Earned this run</span>
                    <strong>{quitSummary.earned.toLocaleString()} pts</strong>
                  </div>
                </div>

                <div className="bcab-quit-actions">
                  <button
                    type="button"
                    className="bcab-quit-action bcab-quit-stay"
                    onClick={() => {
                      playSfx("buttonPush");
                      setQuitConfirmOpen(false);
                    }}
                    autoFocus
                  >
                    Keep playing
                  </button>
                  <button
                    type="button"
                    className="bcab-quit-action bcab-quit-end"
                    onClick={() => {
                      playSfx("buttonPush");
                      captureRunSummary("quit");
                      clearBattleSession();
                      router.push("/battle-result");
                    }}
                  >
                    End battle
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Battle opening (0806): a full-screen video that owns the whole
              cabinet before the run starts. BattlePixiStage is gated on this
              being finished, and the stage is what fires round 1's insert, so
              the ordering "opening, then round insert" falls out of that gate
              rather than needing its own timer. The fade is on the overlay, so
              the game is already live underneath as it clears. */}
          {openingActive && (
            <div
              className={`battle-opening-video-layer ${
                openingFading ? "battle-opening-video-fading" : ""
              }`}
            >
              <video
                src="/videos/openings/battle-opening.mp4"
                autoPlay
                muted
                playsInline
                preload="auto"
                onEnded={finishBattleOpening}
                onError={finishBattleOpening}
              />
            </div>
          )}

          {!audioReady && (
            <button
              type="button"
              className="battle-audio-start-gate"
              onClick={handleStartBattle}
              aria-label="Start battle with sound"
            >
              <span className="battle-audio-start-title">BATTLE START</span>
              <span className="battle-audio-start-subtitle">
                CLICK / TAP TO ENABLE SOUND
              </span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
