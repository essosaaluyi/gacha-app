"use client";

import { useEffect, useState } from "react";
import {
  getAttackFakeoutInsertState,
  subscribeAttackFakeoutInsert,
} from "@/lib/battle-pixi/state/attackFakeoutInsertStore";

const toneClass = {
  white: "attack-fakeout-insert-white",
  blue: "attack-fakeout-insert-blue",
  green: "attack-fakeout-insert-green",
  red: "attack-fakeout-insert-red",
};

export default function AttackFakeoutInsert() {
  const [state, setState] = useState(getAttackFakeoutInsertState());

  useEffect(() => {
    return subscribeAttackFakeoutInsert(() => {
      setState(getAttackFakeoutInsertState());
    });
  }, []);

  if (state.inserts.length === 0) return null;

  return (
    <>
      {state.inserts.map((insert) => (
        <div
          key={insert.id}
          className={`attack-fakeout-insert attack-fakeout-insert-${insert.side} ${
            toneClass[insert.tone]
          }`}
        >
          <div className="attack-fakeout-bg-portrait">
            <img src={insert.subject.image} alt="" />
          </div>

          <div className="attack-fakeout-portrait-frame">
            <div className="attack-fakeout-portrait">
              <img src={insert.subject.image} alt={insert.subject.name} />
            </div>
          </div>

          <div className="attack-fakeout-nameplate">{insert.subject.name}</div>

          <div className="attack-fakeout-rail attack-fakeout-rail-top" />
          <div className="attack-fakeout-rail attack-fakeout-rail-bottom" />
          <div className="attack-fakeout-gear attack-fakeout-gear-left" />
          <div className="attack-fakeout-gear attack-fakeout-gear-right" />

          <div className="attack-fakeout-line">{insert.line}</div>
        </div>
      ))}
    </>
  );
}
