import type {
  BattleCardSymbol,
  BattleOutcome,
  BattleResult,
} from "@/lib/battle-pixi/core/resultLottery";
import { showBattleCutIn } from "@/lib/battle-pixi/state/battleCutInStore";

export function showSymbolCutIn(symbol: BattleCardSymbol) {
  if (symbol === "Chance") {
    showBattleCutIn({
      title: "CHANCE",
      subtitle: "Attack route unlocked",
      tone: "chance",
      durationMs: 900,
    });
    return;
  }

  if (symbol === "Attack") {
    showBattleCutIn({
      title: "ATTACK",
      subtitle: "Target check",
      tone: "attack",
      durationMs: 750,
    });
    return;
  }

  if (symbol === "Bar") {
    showBattleCutIn({
      title: "BAR",
      subtitle: "Bonus signal",
      tone: "bonus",
      durationMs: 900,
    });
    return;
  }

  if (symbol === "Reply") {
    showBattleCutIn({
      title: "REPLY",
      subtitle: "Counter signal",
      tone: "info",
      durationMs: 700,
    });
  }
}

function getResultCutIn(result: BattleOutcome) {
  if (result === "TripleChance") {
    return {
      title: "TRIPLE CHANCE",
      subtitle: "High expectation",
      tone: "rainbow" as const,
      durationMs: 1300,
    };
  }

  if (result === "DoubleChance") {
    return {
      title: "DOUBLE CHANCE",
      subtitle: "Big route",
      tone: "chance" as const,
      durationMs: 1100,
    };
  }

  if (result === "Bar") {
    return {
      title: "BAR ALIGN",
      subtitle: "Bonus pressure",
      tone: "bonus" as const,
      durationMs: 1200,
    };
  }

  if (result === "Attack") {
    return {
      title: "ATTACK RESULT",
      subtitle: "Fakeout sequence begins",
      tone: "attack" as const,
      durationMs: 1000,
    };
  }

  return null;
}

export function showResultCutIn(result: BattleResult) {
  const cutIn = getResultCutIn(result.result);

  if (!cutIn) return;

  showBattleCutIn(cutIn);
}
