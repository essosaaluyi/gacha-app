"use client";

import { useEffect, useRef, useState } from "react";

import {
  getBattleLogs,
  subscribeBattleLogs,
} from "@/lib/battle-pixi/state/battleLogStore";

function getLogColor(type: string) {
  switch (type) {
    case "draw":
      return "#60a5fa"; // blue

    case "fakeout":
      return "#f472b6"; // pink

    case "success":
      return "#22c55e"; // green

    case "fail":
      return "#ef4444"; // red

    case "chance":
      return "#facc15"; // yellow

    default:
      return "#d4d4d8"; // gray
  }
}

export default function BattleLog() {
  const [logs, setLogs] = useState(getBattleLogs());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return subscribeBattleLogs(() => {
      setLogs([...getBattleLogs()]);
    });
  }, []);

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;

    box.scrollTop = box.scrollHeight;
  }, [logs]);

  return (
    <div
      className="bg-zinc-900/85 border border-zinc-700 rounded-xl p-3 text-white overflow-hidden"
      style={{
        width: "250px",
        height: "640px",
      }}
    >
      <h2 className="font-bold text-lg text-yellow-400 mb-2">
        Battle Log
      </h2>

      <div
  ref={scrollRef}
  className="overflow-y-auto overflow-x-hidden text-sm pr-2"
  style={{
    height: "585px",
  }}
>
        {logs.map((log, index) => {
          const isDraw = log.type === "draw";

          return (
            <div
              key={index}
              className={`
                rounded
                px-2
                py-[2px]
                leading-tight
                whitespace-normal
                break-words
                max-w-full
                ${isDraw ? "mt-2 border-t border-zinc-600 pt-1" : "mt-0"}
              `}
              style={{
                color: getLogColor(log.type),
              }}
            >
              {log.message}
            </div>
          );
        })}
      </div>
    </div>
  );
}