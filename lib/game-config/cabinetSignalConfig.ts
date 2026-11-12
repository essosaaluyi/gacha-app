export const cabinetSignalConfig = {
  drawFlash: {
    chance: 0.25,
    durationMs: 1000,
    pulses: 2,
  },
  chanceSweep: {
    chance: 0.5,
    sweepMs: 1200,
    fullWaitMs: 4100,
  },
  fatalFlash: {
    durationMs: 600,
    pulses: 3,
  },
  fatalBlackout: {
    chancePerWinningTurn: 0.2,
  },
  bonusConfirmation: {
    durationMs: 600,
    pulses: 3,
  },
  superBonusBlackout: {
    chance: 0.5,
  },
  barBoost: {
    games: 3,
    successChance: 1 / 11,
    fakeChance: 1 / 8,
  },
} as const;

