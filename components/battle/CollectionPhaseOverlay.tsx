"use client";

// Feature 6: the post-bonus collection (pick-me) grid. 12 face-down cards
// docked over the stage; the player spends flips (earned by playing games)
// to reveal point/chance/collect/empty cards. Pure DOM/CSS — no Pixi.

import { useEffect, useState } from "react";

import {
  dismissCollectionResult,
  flipCollectionCard,
  getCollectionState,
  hydrateCollectionFromStorage,
  subscribeCollection,
  type CollectionState,
} from "@/lib/battle-pixi/state/collectionStore";

export default function CollectionPhaseOverlay() {
  const [snap, setSnap] = useState<CollectionState>(getCollectionState());

  useEffect(() => {
    hydrateCollectionFromStorage();
    const sync = () => setSnap({ ...getCollectionState() });
    sync();
    return subscribeCollection(sync);
  }, []);

  if (!snap.active && !snap.finished) return null;

  const faceLabel = (type: string, points: number) => {
    if (type === "point") return `+${points}`;
    if (type === "chance") return "×2";
    if (type === "collect") return "COLLECT";
    return "—";
  };

  return (
    <div className="collection-overlay" aria-label="Collection phase">
      <div className="collection-panel">
        <div className="collection-head">
          <div className="collection-title">COLLECT YOUR BONUS</div>
          <div className="collection-stats">
            <span>
              Banked <strong>{snap.banked.toLocaleString()}</strong> / {snap.cap.toLocaleString()}
            </span>
            <span>
              Multiplier <strong>×{snap.multiplier.toFixed(2)}</strong>
            </span>
            <span className={snap.doubleNext ? "collection-doublenext" : ""}>
              {snap.doubleNext ? "NEXT ×2!" : ""}
            </span>
            <span>
              Flips <strong>{snap.flipsAvailable}</strong>
            </span>
          </div>
        </div>

        <div className="collection-grid">
          {snap.deck.map((card, index) => {
            const revealed = snap.revealed[index];
            const canFlip = snap.active && snap.flipsAvailable > 0 && !revealed;
            return (
              <button
                key={index}
                type="button"
                disabled={!canFlip}
                onClick={() => flipCollectionCard(index)}
                className={`collection-card ${
                  revealed ? `collection-card-${card.type} collection-card-open` : ""
                } ${canFlip ? "collection-card-ready" : ""}`}
              >
                <span className="collection-card-inner">
                  {revealed ? faceLabel(card.type, card.points) : "?"}
                </span>
              </button>
            );
          })}
        </div>

        {snap.finished ? (
          <div className="collection-result">
            <span>
              Collected <strong>{snap.banked.toLocaleString()}</strong> points!
            </span>
            <button
              type="button"
              className="collection-dismiss"
              onClick={() => dismissCollectionResult()}
            >
              OK
            </button>
          </div>
        ) : (
          <div className="collection-hint">
            {snap.flipsAvailable > 0
              ? "Flip a card. Watch for COLLECT — it ends the round."
              : "Play a game to earn a flip (a Replay earns two)."}
          </div>
        )}
      </div>
    </div>
  );
}
