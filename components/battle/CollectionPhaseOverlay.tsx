"use client";

import { useEffect, useRef, useState } from "react";

// One celebration per flip, removed once its animation has run.
type Burst = {
  id: number;
  index: number;
  points: number;
  picks: number;
  tier: string;
};

const BURST_MS = 1700;

// Coin count scales with the reward so a jackpot visibly showers.
function coinCount(tier: string) {
  if (tier === "jackpot") return 22;
  if (tier === "large") return 16;
  if (tier === "medium") return 11;
  if (tier === "small") return 7;
  return 0;
}

import {
  dismissCollectionResult,
  flipCollectionCard,
  getCollectionState,
  subscribeCollection,
  type CollectionState,
} from "@/lib/battle-pixi/state/collectionStore";
import type { CollectionCard } from "@/lib/battle-pixi/core/collectionDeck";
// Shared with the audio cues so a card's styling and its sound can never
// disagree about which tier it is.
import { collectionCardTier as cardTier } from "@/lib/battle-pixi/presentation/collectionSfx";

function faceLabel(card: CollectionCard) {
  const { type, points, picks } = card;

  // The combo card pays and extends in one hit, so it says both.
  if (type === "point" || type === "mystery") {
    const value = `+${points.toLocaleString()}`;
    return picks > 0 ? `${value} · +${picks} PICK` : value;
  }

  if (type === "pick") return `+${picks} PICK`;
  if (type === "chance") return "×2 NEXT";
  if (type === "doubleAll") return "×2 ALL";
  if (type === "collect") return "COLLECT";
  return "MISS";
}

export default function CollectionPhaseOverlay() {
  const [snap, setSnap] = useState<CollectionState>(getCollectionState());
  const [shownTotal, setShownTotal] = useState(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const lastFlipKey = useRef("");

  // Restoring from storage is BattleScreen's job -- this component only exists
  // once the pick scene is already up, so it is too late to do it here.
  useEffect(() => {
    const sync = () => setSnap({ ...getCollectionState() });
    sync();
    return subscribeCollection(sync);
  }, []);

  // Spawn one celebration per flip. Keyed off lastFlip so a re-render can never
  // fire the same burst twice, and self-cleaning so nothing accumulates.
  useEffect(() => {
    const flip = snap.lastFlip;
    if (!flip) return;

    const key = `${flip.index}-${flip.type}-${flip.credited}`;
    if (key === lastFlipKey.current) return;
    lastFlipKey.current = key;

    const card = snap.deck[flip.index];
    if (!card) return;

    const id = Date.now() + Math.random();
    setBursts((current) => [
      ...current,
      {
        id,
        index: flip.index,
        points: flip.credited,
        picks: card.picks ?? 0,
        tier: cardTier(card),
      },
    ]);

    const timer = window.setTimeout(() => {
      setBursts((current) => current.filter((burst) => burst.id !== id));
    }, BURST_MS);

    return () => window.clearTimeout(timer);
  }, [snap.lastFlip, snap.deck]);

  // Points are already banked and persisted by the store the instant a card is
  // flipped — this only animates the number on screen catching up to that
  // authoritative value. Nothing here can lose or double-count a reward, and
  // the display always converges exactly on real state.
  useEffect(() => {
    const target = snap.banked;

    let raf = 0;
    let cancelled = false;

    const step = () => {
      if (cancelled) return;

      setShownTotal((current) => {
        if (current === target) return current;

        const delta = target - current;
        // Ease in, but always close at least 1 so it cannot stall short. The
        // 6% rate makes a big win visibly take longer to count up than a small
        // one, which is most of why a rolling counter feels good at all.
        const next =
          Math.abs(delta) < 2
            ? target
            : current + Math.sign(delta) * Math.max(1, Math.ceil(Math.abs(delta) * 0.06));

        raf = window.requestAnimationFrame(step);
        return next;
      });
    };

    raf = window.requestAnimationFrame(step);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [snap.banked]);

  if (!snap.active && !snap.finished) return null;

  const outOfPicks = snap.active && snap.flipsAvailable <= 0;

  return (
    <div className="collection-overlay" aria-label="Collection phase">
      <div className="collection-frame">
        <header className="collection-head">
          {/* Banked against the ceiling a perfect run pays. The deck is built to
              sum to the cap, so this reads as real progress toward the max. */}
          <div className="collection-max">
            <span
              className={`collection-max-value ${
                shownTotal !== snap.banked ? "collection-total-rolling" : ""
              }`}
            >
              {shownTotal.toLocaleString()}
            </span>
            <span className="collection-max-sep">/</span>
            <span className="collection-max-cap">
              {snap.cap.toLocaleString()}
            </span>
            <span className="collection-max-unit">P</span>
          </div>

          <div className="collection-title-wrap">
            <h2 className="collection-title">COLLECT YOUR BONUS</h2>
            <p className="collection-sub">
              {snap.finished
                ? "Round complete"
                : outOfPicks
                  ? "Out of picks"
                  : "Choose a card"}
            </p>
          </div>

          <div
            key={`picks-${snap.flipsAvailable}`}
            className={`collection-picks collection-picks-bump ${
              snap.flipsAvailable <= 1 ? "collection-picks-low" : ""
            }`}
          >
            <span className="collection-picks-label">PICKS</span>
            <span className="collection-picks-value">{snap.flipsAvailable}</span>
          </div>
        </header>

        <div className="collection-grid">
          {snap.deck.map((card, index) => {
            const revealed = snap.revealed[index];
            const canFlip = snap.active && snap.flipsAvailable > 0 && !revealed;
            const burst = bursts.find((item) => item.index === index);

            return (
              <button
                key={index}
                type="button"
                disabled={!canFlip}
                onClick={() => flipCollectionCard(index)}
                aria-label={revealed ? faceLabel(card) : "Hidden card"}
                className={`collection-card ${
                  revealed ? "collection-card-open" : ""
                } ${canFlip ? "collection-card-ready" : ""}`}
              >
                <span className="collection-card-inner">
                  <span className="collection-card-face collection-card-back" />
                  <span
                    className={`collection-card-face collection-card-front collection-tier-${cardTier(
                      card
                    )}`}
                  >
                    {faceLabel(card)}
                  </span>
                </span>

                {burst && (
                  <span
                    className={`collection-burst collection-burst-${burst.tier}`}
                    aria-hidden="true"
                  >
                    <span className="collection-burst-ring" />

                    {burst.points > 0 && (
                      <span className="collection-burst-points">
                        +{burst.points.toLocaleString()}
                      </span>
                    )}

                    {burst.picks > 0 && (
                      <span className="collection-burst-pick">
                        +{burst.picks} PICK
                      </span>
                    )}

                    {Array.from({ length: coinCount(burst.tier) }, (_, i) => (
                      <span
                        key={i}
                        className="collection-coin"
                        style={
                          {
                            "--angle": `${(360 / coinCount(burst.tier)) * i +
                              (i % 3) * 11}deg`,
                            "--dist": `${52 + ((i * 37) % 46)}px`,
                            "--delay": `${(i % 6) * 32}ms`,
                            "--spin": `${i % 2 ? 420 : -380}deg`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <footer className="collection-foot">
          <div className="collection-meters">
            <span className="collection-mult">
              ×{snap.multiplier.toFixed(2)}
            </span>
            {snap.doubleNext && (
              <span className="collection-next2">NEXT ×2</span>
            )}
          </div>

          {snap.finished && (
            <button
              type="button"
              className="collection-dismiss"
              onClick={() => dismissCollectionResult()}
            >
              NEXT ROUND
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
