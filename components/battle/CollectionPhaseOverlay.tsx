"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import styles from "@/app/bonus-number-preview/page.module.css";
import type { CollectionCard } from "@/lib/battle-pixi/core/collectionDeck";
import {
  advanceCollectionAfterMaxPayout,
  flipCollectionCard,
  getCollectionState,
  subscribeCollection,
  type CollectionState,
} from "@/lib/battle-pixi/state/collectionStore";

type ActiveBurst = {
  key: number;
  index: number;
  card: CollectionCard;
  credited: number;
  basePoints: number;
  doubleApplied: boolean;
};

type Flight = {
  id: number;
  x: number;
  y: number;
  length: number;
  angle: number;
  delay: number;
};

type CollectionPhaseOverlayProps = {
  onResultReadyChange?: (ready: boolean) => void;
};

const ACTIVE_BURST_MS = 3400;
const DOUBLE_PHASE_DELAY_MS = 1900;
const ABSORB_DELAY_MS = 2750;
const ABSORB_DURATION_MS = 1050;
const MAX_PAYOUT_CELEBRATION_MS = 4300;
const burstParticles = Array.from({ length: 22 }, (_, index) => index);

function cardLabel(card: CollectionCard) {
  if (card.type === "point" || card.type === "mystery") {
    return `+${card.points.toLocaleString()}`;
  }
  if (card.type === "chance") return "x2 NEXT";
  if (card.type === "doubleAll") return "x2 BANKED";
  if (card.type === "pick") return `+${card.picks} PICK`;
  if (card.type === "collect") return "COLLECT";
  return "EMPTY";
}

function cardMessage(card: CollectionCard) {
  if (card.type === "point" || card.type === "mystery") return "";
  if (card.type === "chance") return "x2 NEXT REWARD ARMED";
  if (card.type === "doubleAll") return "BANKED POINTS DOUBLED";
  if (card.type === "pick") return "EXTRA PICK";
  if (card.type === "collect") return "BONUS COLLECTED";
  return "NO REWARD";
}

function typeClass(card: CollectionCard) {
  if (card.type === "empty") return styles["type-empty"];
  if (card.type === "chance" || card.type === "doubleAll") {
    return styles["type-chance"];
  }
  if (card.type === "pick") return styles["type-pick"];
  if (card.type === "collect") return styles["type-collect"];
  return "";
}

export default function CollectionPhaseOverlay({
  onResultReadyChange,
}: CollectionPhaseOverlayProps) {
  const initial = getCollectionState();
  const [snap, setSnap] = useState<CollectionState>(initial);
  const [shownTotal, setShownTotal] = useState(initial.banked);
  const [displayTarget, setDisplayTarget] = useState(initial.banked);
  const [activeBurst, setActiveBurst] = useState<ActiveBurst | null>(null);
  const [burstPhase, setBurstPhase] = useState(1);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [message, setMessage] = useState("Choose a card");
  const [showMaxPayout, setShowMaxPayout] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  const fieldRef = useRef<HTMLDivElement>(null);
  const totalRef = useRef<HTMLDivElement>(null);
  const picksRef = useRef<HTMLDivElement>(null);
  const flightIdRef = useRef(0);
  const burstKeyRef = useRef(0);
  const activeTimerRef = useRef<number | null>(null);
  const doubleTimerRef = useRef<number | null>(null);
  const terminalTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const payoutTimersRef = useRef<number[]>([]);
  const flightTimersRef = useRef<number[]>([]);
  const handledTerminalRef = useRef(false);

  useEffect(() => {
    const sync = () => setSnap({ ...getCollectionState() });
    return subscribeCollection(sync);
  }, []);

  useEffect(() => {
    if (shownTotal === displayTarget) return;
    const frame = window.requestAnimationFrame(() => {
      setShownTotal((value) => {
        const delta = displayTarget - value;
        return Math.abs(delta) <= 2
          ? displayTarget
          : value + Math.sign(delta) * Math.max(1, Math.ceil(Math.abs(delta) * 0.1));
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [shownTotal, displayTarget]);

  useEffect(() => {
    if (handledTerminalRef.current) return;
    if (!snap.finished && !snap.awaitingExtraDeal) return;

    handledTerminalRef.current = true;
    const restoreTimer = window.setTimeout(() => {
      setDisplayTarget(snap.banked);
      setShownTotal(snap.banked);

      if (snap.awaitingExtraDeal) {
        setShowMaxPayout(true);
        maxTimerRef.current = window.setTimeout(() => {
          setShowMaxPayout(false);
          handledTerminalRef.current = false;
          advanceCollectionAfterMaxPayout();
          setMessage("Choose a card");
        }, MAX_PAYOUT_CELEBRATION_MS);
      } else {
        setResultReady(true);
        onResultReadyChange?.(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [snap.awaitingExtraDeal, snap.banked, snap.finished, onResultReadyChange]);

  useEffect(() => {
    const payoutTimers = payoutTimersRef.current;
    const flightTimers = flightTimersRef.current;
    return () => {
      if (activeTimerRef.current !== null) window.clearTimeout(activeTimerRef.current);
      if (doubleTimerRef.current !== null) window.clearTimeout(doubleTimerRef.current);
      if (terminalTimerRef.current !== null) window.clearTimeout(terminalTimerRef.current);
      if (maxTimerRef.current !== null) window.clearTimeout(maxTimerRef.current);
      payoutTimers.forEach((timer) => window.clearTimeout(timer));
      flightTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const addFlight = useCallback(
    (index: number, target: HTMLDivElement | null, delay: number) => {
      const source = document.querySelector(`[data-collection-card="${index}"]`);
      const field = fieldRef.current;
      if (!source || !field || !target) return;

      const sourceRect = source.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const x1 = sourceRect.left + sourceRect.width / 2 - fieldRect.left;
      const y1 = sourceRect.top + sourceRect.height / 2 - fieldRect.top;
      const x2 = targetRect.left + targetRect.width / 2 - fieldRect.left;
      const y2 = targetRect.top + targetRect.height / 2 - fieldRect.top;
      const id = ++flightIdRef.current;

      setFlights((current) => [
        ...current,
        {
          id,
          x: x1,
          y: y1,
          length: Math.hypot(x2 - x1, y2 - y1),
          angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
          delay,
        },
      ]);

      const cleanup = window.setTimeout(() => {
        setFlights((current) => current.filter((flight) => flight.id !== id));
      }, delay + ABSORB_DURATION_MS);
      flightTimersRef.current.push(cleanup);
    },
    []
  );

  const clearActiveAnimation = () => {
    if (activeTimerRef.current !== null) window.clearTimeout(activeTimerRef.current);
    if (doubleTimerRef.current !== null) window.clearTimeout(doubleTimerRef.current);
    activeTimerRef.current = null;
    doubleTimerRef.current = null;
  };

  const handleFlip = (index: number) => {
    const before = getCollectionState();
    if (!before.active || before.revealed[index]) return;

    clearActiveAnimation();
    setActiveBurst(null);
    setResultReady(false);
    onResultReadyChange?.(false);

    flipCollectionCard(index);
    const next = getCollectionState();
    const flip = next.lastFlip;
    const card = next.deck[index];

    if (!flip || !card) {
      setMessage("Table redealt");
      return;
    }

    const doubleApplied = before.doubleNext &&
      (card.type === "point" || card.type === "mystery");
    const basePoints = Math.max(
      0,
      Math.min(card.points, before.cap - before.tableBanked)
    );
    const payoutDelay = doubleApplied
      ? ABSORB_DELAY_MS + DOUBLE_PHASE_DELAY_MS
      : ABSORB_DELAY_MS;
    const burstDuration = doubleApplied
      ? ACTIVE_BURST_MS + DOUBLE_PHASE_DELAY_MS
      : ACTIVE_BURST_MS;
    burstKeyRef.current += 1;
    const burst: ActiveBurst = {
      key: burstKeyRef.current,
      index,
      card,
      credited: flip.credited,
      basePoints,
      doubleApplied,
    };

    setBurstPhase(1);
    setActiveBurst(burst);
    setMessage(cardMessage(card));

    if (doubleApplied) {
      doubleTimerRef.current = window.setTimeout(() => {
        setBurstPhase(2);
      }, DOUBLE_PHASE_DELAY_MS);
    }

    if (flip.credited > 0) {
      addFlight(index, totalRef.current, payoutDelay);
      const payoutTimer = window.setTimeout(() => {
        setDisplayTarget((current) => current + flip.credited);
      }, payoutDelay);
      payoutTimersRef.current.push(payoutTimer);
    }

    if (card.picks > 0) {
      addFlight(index, picksRef.current, ABSORB_DELAY_MS);
    }

    handledTerminalRef.current = next.finished || next.awaitingExtraDeal;

    if (next.awaitingExtraDeal) {
      terminalTimerRef.current = window.setTimeout(() => {
        setActiveBurst(null);
        setShowMaxPayout(true);
        maxTimerRef.current = window.setTimeout(() => {
          setShowMaxPayout(false);
          handledTerminalRef.current = false;
          advanceCollectionAfterMaxPayout();
          setMessage("Choose a card");
        }, MAX_PAYOUT_CELEBRATION_MS);
      }, payoutDelay);
      return;
    }

    if (next.finished) {
      const resultDelay = card.type === "empty" || card.type === "collect"
        ? 900
        : burstDuration;
      terminalTimerRef.current = window.setTimeout(() => {
        setActiveBurst(null);
        setResultReady(true);
        onResultReadyChange?.(true);
      }, resultDelay);
      return;
    }

    activeTimerRef.current = window.setTimeout(() => {
      setActiveBurst(null);
      setMessage(next.doubleNext ? "x2 NEXT REWARD ARMED" : "Choose a card");
    }, burstDuration);
  };

  if (!snap.active && !snap.finished && !snap.awaitingExtraDeal) return null;

  const progress = Math.min(100, (snap.tableBanked / Math.max(1, snap.cap)) * 100);
  const remaining = snap.deck.filter((_, index) => !snap.revealed[index]).length;
  const winningBoxes = snap.deck.filter((card) =>
    card.type === "point" || card.type === "mystery" || card.type === "pick"
  ).length;
  const winOdds = snap.deck.length > 0
    ? Math.round((winningBoxes / snap.deck.length) * 100)
    : 0;
  const activeLabel = activeBurst
    ? activeBurst.card.type === "point" || activeBurst.card.type === "mystery"
      ? `+${(activeBurst.doubleApplied && burstPhase === 1
          ? activeBurst.basePoints
          : activeBurst.credited
        ).toLocaleString()}`
      : activeBurst.card.type === "doubleAll" && activeBurst.credited > 0
        ? `+${activeBurst.credited.toLocaleString()}`
        : cardLabel(activeBurst.card)
    : "";
  const activeIsPoint = Boolean(
    activeBurst &&
      (activeBurst.card.type === "point" ||
        activeBurst.card.type === "mystery" ||
        (activeBurst.card.type === "doubleAll" && activeBurst.credited > 0))
  );

  return (
    <section
      className={`${styles.machine} ${styles.productionMachine}`}
      aria-label="Pick a Bonus"
    >
      <div className={styles.machineNoise} aria-hidden="true" />
      <div className={styles.machineLights} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.totalDock} ref={totalRef}>
          <span className={styles.totalLabel}>BANKED POINTS</span>
          <strong
            className={`${styles.layeredBankedText} ${
              shownTotal !== displayTarget ? styles.totalImpact : ""
            }`}
          >
            <span className={styles.bankedValueBase}>{shownTotal.toLocaleString()}</span>
            <span
              className={snap.extraMode ? styles.bankedRainbowGloss : styles.bankedValueGloss}
              aria-hidden="true"
            >
              {shownTotal.toLocaleString()}
            </span>
          </strong>
          <span className={styles.totalUnit}>P</span>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className={styles.heading}>
          <span className={styles.eyebrow}>BONUS COLLECTION MODE</span>
          <h1 className={snap.extraMode ? styles.rainbowStream : ""}>
            {snap.extraMode ? "EXTRA PICK A BONUS" : "PICK A BONUS"}
          </h1>
          <p>{resultReady ? "Round complete" : message}</p>
          {snap.doubleNext || activeBurst?.doubleApplied ? (
            <span className={styles.doubleNextBanner}>x2</span>
          ) : null}
        </div>

        <div className={styles.picksDock} ref={picksRef}>
          <span className={styles.picksLabel}>PICKS</span>
          <strong>{snap.flipsAvailable}</strong>
          <small>{remaining} CARDS</small>
        </div>
      </header>

      <div className={styles.field} ref={fieldRef}>
        <div className={styles.fieldHeader}>
          <span>MAX PAYOUT <b>{snap.cap.toLocaleString()}P</b></span>
          <span className={styles.fieldOdds}>
            TABLE WIN ODDS <b>{winOdds}%</b> ({winningBoxes}/{snap.deck.length} WIN BOXES)
            {snap.doubleNext ? " · x2 NEXT REWARD ARMED" : " · MULTIPLIER x1.0"}
          </span>
        </div>

        <div className={styles.grid}>
          {snap.deck.map((card, index) => {
            const revealed = snap.revealed[index];
            const playable = snap.active && snap.flipsAvailable > 0 && !revealed;
            const pointCard = card.type === "point" || card.type === "mystery";

            return (
              <button
                key={`${snap.extraMode ? "extra" : "standard"}-${index}`}
                type="button"
                data-collection-card={index}
                disabled={!playable}
                className={`${styles.card} ${revealed ? styles.revealed : ""} ${
                  activeBurst?.index === index ? styles.activeCard : ""
                }`}
                onClick={() => handleFlip(index)}
                aria-label={revealed ? cardLabel(card) : "Hidden bonus card"}
              >
                <span className={styles.cardInner}>
                  <span className={styles.cardBack}>
                    <span className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.cardHint}>PICK</span>
                  </span>
                  <span className={`${styles.cardFront} ${typeClass(card)}`}>
                    <span className={styles.cardLogo} aria-hidden="true">
                      DESTINY<span>WARS</span>
                    </span>
                    {pointCard ? (
                      <strong className={styles.layeredRewardText}>
                        <span className={styles.rewardTextBase}>{cardLabel(card)}</span>
                        <span className={styles.rewardTextGloss} aria-hidden="true">
                          {cardLabel(card)}
                        </span>
                      </strong>
                    ) : (
                      <strong>{cardLabel(card)}</strong>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {activeBurst && activeBurst.card.type !== "empty" ? (
          <span
            key={`${activeBurst.key}-${burstPhase}`}
            className={`${styles.cardBurst} ${
              activeBurst.card.type === "pick" ? styles.pickBurst : ""
            }`}
            aria-hidden="true"
          >
            {activeIsPoint ? (
              <strong className={styles.layeredRewardText}>
                <span className={styles.rewardTextBase}>{activeLabel}</span>
                <span className={styles.rewardTextGloss} aria-hidden="true">
                  {activeLabel}
                </span>
              </strong>
            ) : (
              <strong>{activeLabel}</strong>
            )}
            {activeBurst.card.picks > 0 ? (
              <small>+{activeBurst.card.picks} EXTRA PICK</small>
            ) : activeBurst.doubleApplied && burstPhase === 2 ? (
              <small>x2 REWARD</small>
            ) : null}
            <span className={styles.particleField}>
              {burstParticles.map((particle) => (
                <i
                  key={particle}
                  style={
                    {
                      "--particle-angle": `${
                        (360 / burstParticles.length) * particle + (particle % 4) * 7
                      }deg`,
                      "--particle-distance": `${120 + ((particle * 31) % 170)}px`,
                      "--particle-delay": `${(particle % 7) * 18}ms`,
                      "--particle-size": `${4 + (particle % 4) * 2}px`,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          </span>
        ) : null}

        {flights.map((flight) => (
          <span
            key={flight.id}
            className={styles.flight}
            aria-hidden="true"
            style={
              {
                left: flight.x,
                top: flight.y,
                width: flight.length,
                "--angle": `${flight.angle}deg`,
                "--flight-delay": `${flight.delay}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {showMaxPayout ? (
        <span className={styles.maxPayoutBurst} aria-live="assertive">
          <strong>MAX PAYOUT</strong>
          <small>{snap.cap.toLocaleString()}P SECURED</small>
          <span className={styles.confettiField} aria-hidden="true">
            {Array.from({ length: 36 }, (_, index) => (
              <i
                key={index}
                style={
                  {
                    "--confetti-angle": `${(360 / 36) * index}deg`,
                    "--confetti-distance": `${150 + ((index * 47) % 260)}px`,
                    "--confetti-delay": `${(index % 9) * 35}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        </span>
      ) : null}

      {resultReady ? (
        <span className={styles.endSummaryOverlay} aria-live="polite">
          <small>ROUND COMPLETE</small>
          <strong>
            <span className={styles.summaryValueBase}>{snap.banked.toLocaleString()}P</span>
            <span className={styles.summaryValueGloss} aria-hidden="true">
              {snap.banked.toLocaleString()}P
            </span>
          </strong>
          <span>TOTAL POINTS EARNED</span>
        </span>
      ) : null}
    </section>
  );
}
