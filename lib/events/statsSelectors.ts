// Derives the pachislot data-counter readouts and slump graph series
// from the game event log (feature 5).

import {
  getCurrentBattleId,
  getEvents,
  type GameEvent,
} from "@/lib/events/gameEventStore";

export type StatsScope = "battle" | "today";

export type SlumpPoint = { x: number; y: number };

export type DataCounterStats = {
  bbCount: number;
  totalGames: number;
  /** Games per bonus (総ゲーム数 ÷ BB回数); null when no BB yet. */
  combinedRate: number | null;
  /** 差枚数: cumulative points won − points spent. Always equals the slump graph's last Y. */
  diffCoins: number;
};

function startOfTodayTs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function eventsForScope(scope: StatsScope): GameEvent[] {
  if (scope === "battle") {
    const battleId = getCurrentBattleId();
    return battleId ? getEvents({ battleId }) : [];
  }

  return getEvents({ sinceTs: startOfTodayTs() });
}

/**
 * Traditional slump graph: X = total games played, Y = cumulative
 * difference coins. One point is appended per game; point deltas that
 * land between games (bonus payouts, collection flips) attach to the
 * current game. The final point always matches diffCoins.
 */
export function getSlumpSeries(scope: StatsScope): SlumpPoint[] {
  const events = eventsForScope(scope);

  const series: SlumpPoint[] = [{ x: 0, y: 0 }];
  let game = 0;
  let coins = 0;

  for (const event of events) {
    if (event.kind === "pointsDelta" && typeof event.pointsDelta === "number") {
      coins += event.pointsDelta;

      // Keep the running game's point in sync so the last Y always
      // equals the displayed difference coins.
      const last = series[series.length - 1];
      if (last.x === game) {
        last.y = coins;
      } else {
        series.push({ x: game, y: coins });
      }
    }

    if (event.kind === "draw") {
      game += 1;
      series.push({ x: game, y: coins });
    }
  }

  return series;
}

export function getDataCounterStats(scope: StatsScope): DataCounterStats {
  const events = eventsForScope(scope);

  let bbCount = 0;
  let totalGames = 0;
  let diffCoins = 0;

  for (const event of events) {
    if (event.kind === "bonusStart") bbCount += 1;
    if (event.kind === "draw") totalGames += 1;
    if (event.kind === "pointsDelta" && typeof event.pointsDelta === "number") {
      diffCoins += event.pointsDelta;
    }
  }

  return {
    bbCount,
    totalGames,
    combinedRate: bbCount > 0 ? totalGames / bbCount : null,
    diffCoins,
  };
}
