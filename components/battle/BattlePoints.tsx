import { useEffect, useState } from "react";
import {
  getBattlePointsState,
  initializeBattlePoints,
  subscribeBattlePoints,
} from "@/lib/battle-pixi/state/battlePointsStore";
import { useBonusOpeningHidden } from "@/lib/battle-pixi/state/useBonusOpeningHidden";
import BattleDigitStrip from "./BattleDigitStrip";

export default function BattlePoints() {
  const [state, setState] = useState(getBattlePointsState());
  const hiddenForOpening = useBonusOpeningHidden();

  useEffect(() => {
    const unsubscribe = subscribeBattlePoints(() => {
      setState(getBattlePointsState());
    });

    void initializeBattlePoints();

    return unsubscribe;
  }, []);

  // Hidden for the bonus opening. The wallet keeps updating underneath; only
  // the readout stands down, so nothing has to be re-synced when it returns.
  if (hiddenForOpening) return null;

  return (
    <div className="battle-points-plaque" aria-label={`Total ${state.points} points`}>
      <img className="battle-hud-frame" src="/images/battle-ui/production/v1/transparent/points-plaque-frame-v1.png" alt="" />
      <div className="battle-points-content">
        <div className="battle-points-total">
          <span className="battle-points-label">Total</span>
          {state.loaded ? (
            <BattleDigitStrip value={state.points} style="crown-ledger" className="battle-points-value" />
          ) : (
            <span className="battle-points-loading" aria-hidden="true">...</span>
          )}
          <span className="battle-points-unit">P</span>
        </div>
        <div className="battle-points-earned">
          <span>Battle</span>
          <strong>+{state.sessionEarnedPoints}</strong>
        </div>
      </div>
    </div>
  );
}
