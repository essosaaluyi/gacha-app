"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type CardType = "point" | "empty" | "chance" | "pick" | "collect";

type PrototypeCard = {
  id: number;
  type: CardType;
  points?: number;
  picks?: number;
};

type Flight = {
  id: number;
  x: number;
  y: number;
  length: number;
  angle: number;
  delay: number;
};

const INITIAL_TOTAL = 0;
const CAP = 600;
const INITIAL_PICKS = 3;
const ACTIVE_BURST_MS = 3400;
const DOUBLE_PHASE_DELAY_MS = 1900;
const ABSORB_DELAY_MS = 2750;
const ABSORB_DURATION_MS = 1050;
const MAX_PAYOUT_CELEBRATION_MS = 4300;
const burstParticles = Array.from({ length: 22 }, (_, index) => index);

function createDeck(tripledMisses = false): PrototypeCard[] {
  const points = tripledMisses ? [100, 120, 140, 160, 180, 200] : [80, 90, 100, 110, 120, 130, 140, 150, 160, 170];
  const missCount = tripledMisses ? 6 : 2;
  const chanceCount = 1;

  return [
    ...points.map((value, index) => ({
      id: index + 1,
      type: "point" as const,
      points: value,
      picks: tripledMisses
        ? ({ 0: 1, 4: 1, 5: 1 }[index] ?? undefined)
        : ({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 9: 1 }[index] ?? undefined),
    })),
    ...Array.from({ length: missCount - chanceCount }, (_, index) => ({ id: points.length + index + 1, type: "empty" as const })),
    ...Array.from({ length: chanceCount }, (_, index) => ({ id: points.length + missCount - chanceCount + index + 1, type: "chance" as const })),
  ];
}

const starterDeck = createDeck();

function cardLabel(card: PrototypeCard) {
  if (card.type === "point") return `+${card.points}`;
  if (card.type === "chance") return "x2 NEXT";
  if (card.type === "pick") return `+${card.picks} PICK`;
  if (card.type === "collect") return "COLLECT";
  return "EMPTY";
}

function cardName(card: PrototypeCard) {
  if (card.type === "point") return card.picks ? "POINT + PICK" : "POINT REWARD";
  if (card.type === "chance") return "MULTIPLIER";
  if (card.type === "pick") return "EXTRA PICK";
  if (card.type === "collect") return "CASH OUT";
  return "NO REWARD";
}

function testCardLabel(card: PrototypeCard) {
  if (card.type === "point" && card.picks) return `${cardLabel(card)} / +${card.picks} PICK`;
  return cardLabel(card);
}

export default function BonusNumberPreviewPage() {
  const [cards, setCards] = useState(starterDeck);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [total, setTotal] = useState(INITIAL_TOTAL);
  const [bankedTotal, setBankedTotal] = useState(INITIAL_TOTAL);
  const [shownTotal, setShownTotal] = useState(INITIAL_TOTAL);
  const [picks, setPicks] = useState(INITIAL_PICKS);
  const [multiplier, setMultiplier] = useState(1);
  const [doubleNext, setDoubleNext] = useState(false);
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [lastGain, setLastGain] = useState(0);
  const [finalGain, setFinalGain] = useState(0);
  const [burstPhase, setBurstPhase] = useState(1);
  const [doubleReward, setDoubleReward] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [burstVersion, setBurstVersion] = useState(0);
  const [message, setMessage] = useState("Choose a card");
  const [finished, setFinished] = useState(false);
  const [showMaxPayout, setShowMaxPayout] = useState(false);
  const [tripledMisses, setTripledMisses] = useState(false);
  const [showTestContent, setShowTestContent] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);
  const totalRef = useRef<HTMLDivElement>(null);
  const picksRef = useRef<HTMLDivElement>(null);
  const flightIdRef = useRef(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const progress = Math.min(100, (total / CAP) * 100);
  const activeReward = activeCard === null ? null : cards.find((card) => card.id === activeCard) ?? null;
  const activeRewardLabel = activeReward?.type === "point"
    ? `+${lastGain.toLocaleString()}`
    : activeReward ? cardLabel(activeReward) : "";
  const winningBoxCount = cards.filter((card) => card.type === "point" || card.type === "pick").length;
  const tableWinOdds = Math.round((winningBoxCount / cards.length) * 100);
  const remaining = useMemo(
    () => cards.filter((card) => !revealed.includes(card.id)).length,
    [cards, revealed]
  );

  useEffect(() => {
    if (shownTotal === bankedTotal) return;
    const frame = window.requestAnimationFrame(() => {
      setShownTotal((value) => {
        const delta = bankedTotal - value;
        return Math.abs(delta) <= 2 ? bankedTotal : value + Math.max(1, Math.ceil(delta * 0.1));
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [shownTotal, bankedTotal]);

  useEffect(() => {
    if (activeCard === null) return;
    const phaseTimer = doubleReward && burstPhase === 1
      ? window.setTimeout(() => {
          setBurstPhase(2);
          setLastGain(finalGain);
          setBurstVersion((value) => value + 1);
        }, DOUBLE_PHASE_DELAY_MS)
      : null;
    const timer = window.setTimeout(
      () => setActiveCard(null),
      doubleReward && burstPhase === 1 ? ACTIVE_BURST_MS + DOUBLE_PHASE_DELAY_MS : ACTIVE_BURST_MS
    );
    return () => {
      if (phaseTimer !== null) window.clearTimeout(phaseTimer);
      window.clearTimeout(timer);
    };
  }, [activeCard, burstPhase, doubleReward, finalGain]);

  useEffect(() => {
    if (total < CAP) return;
    setFinished(true);
    setShowMaxPayout(true);
    const timer = window.setTimeout(() => {
      setCards(createDeck(true));
      setRevealed([]);
      setTotal(INITIAL_TOTAL);
      setPicks(INITIAL_PICKS);
      setMultiplier(1);
      setDoubleNext(false);
      setActiveCard(null);
      setLastGain(0);
      setFinalGain(0);
      setBurstPhase(1);
      setDoubleReward(false);
      setFlights([]);
      setMessage("Hard mode table dealt: misses tripled");
      setFinished(false);
      setTripledMisses(true);
      setShowMaxPayout(false);
    }, MAX_PAYOUT_CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [total]);

  const restart = () => {
    setCards([...starterDeck]);
    setRevealed([]);
    setTotal(INITIAL_TOTAL);
    setBankedTotal(INITIAL_TOTAL);
    setShownTotal(INITIAL_TOTAL);
    setPicks(INITIAL_PICKS);
    setMultiplier(1);
    setDoubleNext(false);
    setActiveCard(null);
    setLastGain(0);
    setFinalGain(0);
    setBurstPhase(1);
    setDoubleReward(false);
    setFlights([]);
    setMessage("Choose a card");
    setFinished(false);
    setShowMaxPayout(false);
    setTripledMisses(false);
  };

  const shuffleTable = () => {
    setCards((current) => {
      const shuffled = [...current];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomValue = window.crypto.getRandomValues(new Uint32Array(1))[0];
        const swapIndex = randomValue % (index + 1);
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }
      return shuffled;
    });
    setActiveCard(null);
    setBurstVersion((value) => value + 1);
    setMessage("Table shuffled");
  };

  const draw = (card: PrototypeCard) => {
    if (finished || picks <= 0 || revealed.includes(card.id)) return;

    setRevealed((current) => [...current, card.id]);
    setActiveCard(card.id);
    setBurstVersion((value) => value + 1);
    setBurstPhase(1);
    setDoubleReward(false);
    setPicks((value) => Math.max(0, value - 1));
    setMessage(card.type === "point" ? "" : cardName(card));
    setLastGain(0);

    if (card.type === "point") {
      const wasDoubleNext = doubleNext;
      const baseRaw = Math.round((card.points ?? 0) * multiplier);
      const baseGain = Math.max(0, Math.min(baseRaw, CAP - total));
      const gain = Math.max(0, Math.min(baseRaw * (wasDoubleNext ? 2 : 1), CAP - total));
      const payoutDelay = wasDoubleNext ? ABSORB_DELAY_MS + DOUBLE_PHASE_DELAY_MS : ABSORB_DELAY_MS;
      setDoubleReward(wasDoubleNext);
      setFinalGain(gain);
      setLastGain(wasDoubleNext ? baseGain : gain);
      window.setTimeout(() => setTotal((value) => value + gain), payoutDelay);
      window.setTimeout(() => setBankedTotal((value) => value + gain), payoutDelay);
      setDoubleNext(false);
      if (card.picks) setPicks((value) => value + card.picks!);

      const source = document.querySelector(`[data-card-id="${card.id}"]`);
      const field = gridRef.current?.parentElement;
      if (source && field) {
        const sourceRect = source.getBoundingClientRect();
        const fieldRect = field.getBoundingClientRect();
        const x1 = sourceRect.left + sourceRect.width / 2 - fieldRect.left;
        const y1 = sourceRect.top + sourceRect.height / 2 - fieldRect.top;
        const addFlight = (target: HTMLDivElement | null, delay: number) => {
          if (!target) return;
          const targetRect = target.getBoundingClientRect();
          const x2 = targetRect.left + targetRect.width / 2 - fieldRect.left;
          const y2 = targetRect.top + targetRect.height / 2 - fieldRect.top;
          const flightId = flightIdRef.current + 1;
          flightIdRef.current = flightId;
          setFlights((current) => [...current, {
            id: flightId,
            x: x1,
            y: y1,
            length: Math.hypot(x2 - x1, y2 - y1),
            angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
            delay,
          }]);
          window.setTimeout(() => setFlights((current) => current.filter((item) => item.id !== flightId)), delay + ABSORB_DURATION_MS);
        };
        addFlight(totalRef.current, payoutDelay);
        if (card.picks) addFlight(picksRef.current, ABSORB_DELAY_MS);
      }
    } else if (card.type === "chance") {
      setDoubleNext(true);
    } else if (card.type === "pick") {
      setPicks((value) => value + (card.picks ?? 1));
    } else if (card.type === "collect") {
      setActiveCard(null);
      if (total === 0) {
        restart();
      } else {
        setFinished(true);
        setMessage("Bonus collected");
      }
    }

    window.setTimeout(() => {
      setPicks((currentPicks) => {
        if (currentPicks <= 0 || total >= CAP) setFinished(true);
        return currentPicks;
      });
    }, 700);
  };

  return (
    <main className={styles.page}>
      <section className={styles.machine} aria-label="Pick a Bonus prototype">
        <div className={styles.machineNoise} aria-hidden="true" />
        <div className={styles.machineLights} aria-hidden="true" />

        <header className={styles.header}>
          <div className={styles.totalDock} ref={totalRef}>
            <span className={styles.totalLabel}>BANKED POINTS</span>
            <strong className={`${styles.layeredBankedText} ${shownTotal !== bankedTotal ? styles.totalImpact : ""}`}>
              <span className={styles.bankedValueBase}>{shownTotal.toLocaleString()}</span>
              <span
                className={tripledMisses ? styles.bankedRainbowGloss : styles.bankedValueGloss}
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
            <h1 className={tripledMisses ? styles.rainbowStream : ""}>
              {tripledMisses ? "EXTRA PICK A BONUS" : "PICK A BONUS"}
            </h1>
            <p>{message}</p>
            {doubleNext || doubleReward ? <span className={styles.doubleNextBanner}>x2</span> : null}
          </div>

          <div className={styles.picksDock} ref={picksRef}>
            <span className={styles.picksLabel}>PICKS</span>
            <strong>{picks}</strong>
            <small>{remaining} CARDS</small>
          </div>
        </header>

        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <span>MAX PAYOUT <b>{CAP}P</b></span>
            <span className={styles.fieldOdds}>
              TABLE WIN ODDS <b>{tableWinOdds}%</b> ({winningBoxCount}/{cards.length} WIN BOXES)
              · {tripledMisses ? "MISS ODDS x3" : doubleNext ? "x2 NEXT REWARD ARMED" : `MULTIPLIER x${multiplier.toFixed(1)}`}
            </span>
          </div>

          <div className={styles.grid} ref={gridRef}>
            {cards.map((card) => {
              const isRevealed = revealed.includes(card.id);
              const isActive = activeCard === card.id;
              const playable = !finished && !isRevealed && picks > 0;

              return (
                <button
                  key={card.id}
                  type="button"
                  data-card-id={card.id}
                  disabled={!playable}
                  className={`${styles.card} ${isRevealed ? styles.revealed : ""} ${isActive ? styles.activeCard : ""}`}
                  onClick={() => draw(card)}
                  aria-label={isRevealed ? cardLabel(card) : "Hidden bonus card"}
                >
                  <span className={styles.cardInner}>
                    <span className={styles.cardBack}>
                      <span className={styles.cardIndex}>{String(card.id).padStart(2, "0")}</span>
                      <span className={styles.cardHint}>PICK</span>
                      {showTestContent ? <span className={styles.testContent}>TEST: {testCardLabel(card)}</span> : null}
                    </span>
                    <span className={`${styles.cardFront} ${styles[`type-${card.type}`]}`}>
                      <span className={styles.cardLogo} aria-hidden="true">
                        DESTINY<span>WARS</span>
                      </span>
                      {card.type === "point" ? (
                        <strong className={styles.layeredRewardText}>
                          <span className={styles.rewardTextBase}>{cardLabel(card)}</span>
                          <span className={styles.rewardTextGloss} aria-hidden="true">{cardLabel(card)}</span>
                        </strong>
                      ) : <strong>{cardLabel(card)}</strong>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {activeReward && activeReward.type !== "empty" ? (
            <span
              key={`${activeCard}-${burstVersion}`}
              className={`${styles.cardBurst} ${activeReward.type === "pick" ? styles.pickBurst : ""}`}
              aria-hidden="true"
            >
              {activeReward.type === "point" ? (
                <strong className={styles.layeredRewardText}>
                  <span className={styles.rewardTextBase}>{activeRewardLabel}</span>
                  <span className={styles.rewardTextGloss} aria-hidden="true">{activeRewardLabel}</span>
                </strong>
              ) : <strong>{activeRewardLabel}</strong>}
              {activeReward.type === "point" && activeReward.picks ? (
                <small>+{activeReward.picks} EXTRA PICK</small>
              ) : null}
              <span className={styles.particleField}>
                {burstParticles.map((particle) => (
                  <i
                    key={particle}
                    style={
                      {
                        "--particle-angle": `${(360 / burstParticles.length) * particle + (particle % 4) * 7}deg`,
                        "--particle-distance": `${120 + ((particle * 31) % 170)}px`,
                        "--particle-delay": `${(particle % 7) * 18}ms`,
                        "--particle-size": `${4 + (particle % 4) * 2}px`,
                      } as React.CSSProperties
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
              style={{
                left: flight.x,
                top: flight.y,
                width: flight.length,
                "--angle": `${flight.angle}deg`,
                "--flight-delay": `${flight.delay}ms`,
              } as React.CSSProperties}
            />
          ))}

          {showMaxPayout ? (
            <span className={styles.maxPayoutBurst} aria-live="assertive">
              <strong>MAX PAYOUT</strong>
              <small>{CAP}P SECURED</small>
              <span className={styles.confettiField} aria-hidden="true">
                {Array.from({ length: 36 }, (_, index) => (
                  <i
                    key={index}
                    style={{
                      "--confetti-angle": `${(360 / 36) * index}deg`,
                      "--confetti-distance": `${150 + ((index * 47) % 260)}px`,
                      "--confetti-delay": `${(index % 9) * 35}ms`,
                    } as React.CSSProperties}
                  />
                ))}
              </span>
            </span>
          ) : null}

          {finished && activeCard === null && !showMaxPayout ? (
            <span className={styles.endSummaryOverlay} aria-live="polite">
              <small>ROUND COMPLETE</small>
              <strong>
                <span className={styles.summaryValueBase}>{bankedTotal.toLocaleString()}P</span>
                <span className={styles.summaryValueGloss} aria-hidden="true">{bankedTotal.toLocaleString()}P</span>
              </strong>
              <span>TOTAL POINTS EARNED</span>
            </span>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <div className={styles.legend}>
            <span><i className={styles.legendGold} />POINT</span>
            <span><i className={styles.legendBlue} />MULTIPLIER</span>
            <span><i className={styles.legendGreen} />EXTRA PICK</span>
            <span><i className={styles.legendRed} />CASH OUT</span>
          </div>
          <button type="button" className={styles.restart} onClick={restart}>
            REDEAL PROTOTYPE
          </button>
          <button type="button" className={styles.testToggle} onClick={shuffleTable}>
            SHUFFLE TABLE
          </button>
          <button
            type="button"
            className={styles.testToggle}
            aria-pressed={showTestContent}
            onClick={() => setShowTestContent((value) => !value)}
          >
            {showTestContent ? "HIDE TEST CONTENT" : "SHOW TEST CONTENT"}
          </button>
          <span className={styles.note}>Prototype only · rewards are distributed across the board for review</span>
        </footer>
      </section>
    </main>
  );
}
