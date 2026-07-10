export type BattleLogType =
  | "normal"
  | "draw"
  | "fakeout"
  | "success"
  | "fail"
  | "chance";

export type BattleLogEntry = {
  message: string;
  type: BattleLogType;
};

let listeners: (() => void)[] = [];

let logs: BattleLogEntry[] = [
  {
    message: "Battle Initialized",
    type: "normal",
  },
];

export function getBattleLogs() {
  return logs;
}

export function addBattleLog(
  message: string,
  type: BattleLogType = "normal"
) {
  logs = [...logs, { message, type }].slice(-50);

  listeners.forEach((listener) => listener());
}

export function resetBattleLogs() {
  logs = [
    {
      message: "Battle Initialized",
      type: "normal",
    },
  ];

  listeners.forEach((listener) => listener());
}

export function subscribeBattleLogs(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
