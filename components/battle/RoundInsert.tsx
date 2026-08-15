"use client";

import { useEffect, useState } from "react";

import {
  getRoundInsertState,
  hideRoundInsert,
  subscribeRoundInsert,
} from "@/lib/battle-pixi/state/roundInsertStore";

export default function RoundInsert() {
  const [state, setState] = useState(getRoundInsertState());

  useEffect(() => {
    return subscribeRoundInsert(() => {
      setState(getRoundInsertState());
    });
  }, []);

  useEffect(() => {
    if (!state.visible) return;

    const timer = window.setTimeout(() => {
      hideRoundInsert();
      window.dispatchEvent(new Event("battle:round-intro-complete"));
    }, 1900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state.visible, state.roundText, state.enemyName]);

  if (!state.visible) return null;

  return (
    <div className="round-insert-layer">
      <div className="round-insert-stage">
        {state.roundImage && (
          <>
            <img
              src={state.roundImage}
              alt=""
              aria-hidden="true"
              className="round-insert-enemy-backdrop"
            />
            <img
              src={state.roundImage}
              alt={state.enemyName}
              className="round-insert-enemy"
            />
          </>
        )}

        <div className="round-insert-title-wrap" data-text={state.roundText}>
          <div className="round-insert-text" data-text={state.roundText}>
            {state.roundText}
          </div>
        </div>
      </div>
    </div>
  );
}
