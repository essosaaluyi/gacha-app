import { patchConfig } from "@/lib/game-config/patchConfig";

export type PlayerWinRateSnapshot = {
  cardId: string;
  round: number;
  rate: number;
};

let variableRate: PlayerWinRateSnapshot | null = null;

function rollInclusive(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function getPlayerWinRateForRound(cardId: string, round: number) {
  const fixedRate = patchConfig.playerWinRate.ratesByCard[cardId];
  if (fixedRate !== undefined) return fixedRate;

  const range = patchConfig.playerWinRate.variableByCard[cardId];
  if (!range) return 0;

  if (variableRate?.cardId === cardId && variableRate.round === round) {
    return variableRate.rate;
  }

  variableRate = {
    cardId,
    round,
    rate: rollInclusive(range.min, range.max),
  };

  return variableRate.rate;
}

export function getPlayerWinRateSnapshot() {
  return variableRate ? { ...variableRate } : null;
}

export function restorePlayerWinRate(snapshot?: PlayerWinRateSnapshot | null) {
  if (!snapshot) {
    variableRate = null;
    return;
  }

  const range = patchConfig.playerWinRate.variableByCard[snapshot.cardId];
  const validRate =
    range &&
    Number.isInteger(snapshot.round) &&
    snapshot.round > 0 &&
    Number.isInteger(snapshot.rate) &&
    snapshot.rate >= range.min &&
    snapshot.rate <= range.max;

  variableRate = validRate ? { ...snapshot } : null;
}

export function resetPlayerWinRate() {
  variableRate = null;
}
