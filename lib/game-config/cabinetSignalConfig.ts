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
  statue: {
    chanceSignalChance: 0.2,
    emptyFakeChance: 0.1,
    movementMs: 2000,
    chanceToneWeights: {
      1: { blue: 70, green: 30, red: 0 },
      2: { blue: 10, green: 20, red: 70 },
      3: { blue: 5, green: 15, red: 80 },
    },
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

