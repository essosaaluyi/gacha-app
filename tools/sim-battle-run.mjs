// Headless battle-run simulator.
//
// Plays the normal-battle -> fakeout -> fatal -> bonus -> collection loop
// without Pixi or React, so a tuning change can be measured over thousands of
// games instead of eyeballed over ten. Every lottery it can reach is the real
// one: the odds, the bonus grade, the bar reset, the collection deck and the
// draw prices are all imported from the app, so this tracks the live config
// (including any pin in patchConfig.debug.forceResultProbability).
//
// What it re-implements rather than imports is the sequencing that lives
// inside BattlePixiStage.tsx and the stage handlers -- those are welded to the
// renderer. Each of those rules is cited below with the file it mirrors. If
// one of them changes, this file has to change with it.
//
//   node tools/sim-battle-run.mjs [--games=1000] [--sessions=2000] [--tier=R]

import { register } from "node:module";

register("./ts-alias-loader.mjs", import.meta.url);

const { drawBattleResult } = await import("@/lib/battle-pixi/core/resultLottery");
const { evaluateResult } = await import("@/lib/battle-pixi/core/evaluateResult");
const { rollAttackAttempt } = await import("@/lib/battle-pixi/core/attackAttemptSystem");
const { rollBonusType, bonusGamesForType } = await import("@/lib/battle-pixi/core/bonusTypeLottery");
const { rollBarResetEvent } = await import("@/lib/battle-pixi/core/barResetLottery");
const { isNestedTriggerOutcome, rollNestedChancePoints } = await import("@/lib/battle-pixi/core/nestedBonusLottery");
const { buildCollectionDeck } = await import("@/lib/battle-pixi/core/collectionDeck");
const { pickEnemyForRound } = await import("@/lib/battle-pixi/config/enemyConfig");
const { patchConfig } = await import("@/lib/game-config/patchConfig");
const { bonusRewards, battleResultOdds } = await import("@/lib/game-config/generated");

// --- args -------------------------------------------------------------------

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  })
);

const GAMES = Number(args.games ?? 1000);
const SESSIONS = Number(args.sessions ?? 2000);
const TIER = args.tier ?? "R";

// --chance=N re-pins the combined chance-card rarity to 1/N for this run;
// --chance=sheet drops the pin entirely and uses the spreadsheet odds. Same
// formula as chanceCardPins() in patchConfig.ts.
if (args.chance) {
  const chanceResults = ["SingleChance", "DoubleChance", "TripleChance"];
  const sheet = battleResultOdds.filter((entry) =>
    chanceResults.includes(entry.result)
  );

  if (args.chance === "sheet") {
    patchConfig.debug.forceResultProbability = {};
  } else if (args.chance === "legacy") {
    // The pin this repo shipped with: half of all hands forced to a Chance.
    patchConfig.debug.forceResultProbability = { SingleChance: 0.5 };
  } else {
    const sheetTotal = sheet.reduce((sum, entry) => sum + 1 / entry.odds, 0);
    const scale = 1 / Number(args.chance) / sheetTotal;
    patchConfig.debug.forceResultProbability = Object.fromEntries(
      sheet.map((entry) => [entry.result, (1 / entry.odds) * scale])
    );
  }
}

// --odds=Attack:6,Coin:40 pins those outcomes to 1 in N on top of --chance.
// Everything unpinned keeps its relative sheet odds and shares what is left.
if (args.odds) {
  const extra = Object.fromEntries(
    args.odds.split(",").map((pair) => {
      const [result, odds] = pair.split(":");
      return [result, 1 / Number(odds)];
    })
  );
  patchConfig.debug.forceResultProbability = {
    ...patchConfig.debug.forceResultProbability,
    ...extra,
  };
}

// --chancerate=100 makes a Chance card a guaranteed attack instead of the
// stacking 30%-per-card roll, to test the "rare symbol must mean something"
// proposal without touching the app.
// --ontarget=R:10,SR:40,SSR:80,UR:100 makes an Attack on the target slot roll
// at the active card's rate instead of the flat 100% the app uses today.
const ON_TARGET_RATES = args.ontarget
  ? Object.fromEntries(
      args.ontarget.split(",").map((pair) => {
        const [tier, rate] = pair.split(":");
        return [tier, Number(rate)];
      })
    )
  : null;

const onTargetRate = (tier) =>
  ON_TARGET_RATES === null ? 100 : (ON_TARGET_RATES[tier] ?? 100);

const CHANCE_RATE_OVERRIDE = args.chancerate ? Number(args.chancerate) : null;
const chanceRate = (evaluation) =>
  CHANCE_RATE_OVERRIDE === null
    ? evaluation.chanceAttackRate
    : CHANCE_RATE_OVERRIDE;

// --- rules mirrored from the renderer ---------------------------------------

// chancePointsRevealStore.ts: exactly one Chance symbol takes a 1/2 shot at
// 20/30/50 points, weighted 5:3:2.
const CHANCE_POINTS_TIERS = [
  { points: 20, weight: 5 },
  { points: 30, weight: 3 },
  { points: 50, weight: 2 },
];

// BattlePixiStage.tsx: outcomes that count as a hit inside the fatal window,
// on top of an Attack on the target slot or any Chance card.
const FATAL_HIT_RESULTS = new Set(["Bar", "Reply", "Defense"]);

// defenseShieldStore.ts: a triple Defense stores a shield for the round. If one
// is held when the enemy's window closes it REPLACES the natural escape -- the
// window is settled by this roll instead of by counter/reset.
const SHIELD_GRADES = [
  { grade: "blue", acquisitionWeight: 0.5, survivalChance: 0.2 },
  { grade: "green", acquisitionWeight: 0.25, survivalChance: 0.4 },
  { grade: "red", acquisitionWeight: 0.2, survivalChance: 0.8 },
  { grade: "purple", acquisitionWeight: 0.05, survivalChance: 1 },
];

function rollShieldGrade() {
  let roll = Math.random();
  for (const rule of SHIELD_GRADES) {
    roll -= rule.acquisitionWeight;
    if (roll <= 0) return rule;
  }
  return SHIELD_GRADES[SHIELD_GRADES.length - 1];
}

// playerBattleCardStore.ts ships a three-card deck. --deck=R,SR,UR sets the
// tiers card by card; --tier fills all three with one tier.
const DECK = (args.deck ?? `${TIER},${TIER},${TIER}`).split(",");

function weightedPick(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}

// drawCostStore.ts
function drawCostFor(lastOutcome) {
  const costs = patchConfig.economy.drawCosts;
  if (lastOutcome === "Reply") return costs.afterReply;
  if (lastOutcome === "Bar") return costs.afterBar;
  if (
    lastOutcome === "SingleChance" ||
    lastOutcome === "DoubleChance" ||
    lastOutcome === "TripleChance"
  ) {
    return costs.afterChance;
  }
  return costs.normal;
}

// collectionStore.ts flipCollectionCard + dealCollection. Cards are flipped at
// random: which face-down card the player picks carries no information.
function runCollection(cap) {
  const config = patchConfig.collection;
  let banked = 0;
  let restarts = 0;
  let extraMode = false;
  let tables = 0;

  for (;;) {
    tables += 1;
    if (tables > 40) return { banked, tables };

    const deck = buildCollectionDeck(cap, extraMode);
    const revealed = deck.map(() => false);
    let flips = config.initialFlips;
    let tableBanked = 0;
    let doubleNext = false;
    let awaitingExtra = false;

    while (flips > 0 && !awaitingExtra) {
      const pool = revealed
        .map((seen, index) => (seen ? -1 : index))
        .filter((index) => index >= 0);
      if (pool.length === 0) break;

      const index = pool[Math.floor(Math.random() * pool.length)];
      flips -= 1;
      revealed[index] = true;
      const card = deck[index];

      if (card.type === "point") {
        const factor = doubleNext ? config.chanceMultiplier : 1;
        const raw = Math.round(card.points * factor);
        const credited = Math.max(0, Math.min(raw, cap - tableBanked));
        tableBanked += credited;
        banked += credited;
        doubleNext = false;
        if (card.picks > 0) flips += card.picks;
      } else if (card.type === "chance") {
        doubleNext = true;
      }

      if (tableBanked >= cap) awaitingExtra = true;
    }

    // Filling a table earns a fresh one at the same cap (the extra deal).
    if (awaitingExtra) {
      extraMode = true;
      continue;
    }

    // A table that paid nothing is redealt, up to three times.
    if (banked <= 0 && restarts < 3) {
      restarts += 1;
      continue;
    }

    return { banked, tables };
  }
}

// --- one session ------------------------------------------------------------

function runSession(games) {
  const stats = {
    coinIn: 0,
    coinOut: 0,
    games: 0,
    normalGames: 0,
    chanceHands: 0,
    fromAttackCard: 0,
    fromChance: 0,
    fromEmptySlot: 0,
    chanceHandsWasted: 0,
    bonuses: 0,
    bonusPoints: 0,
    collectionPoints: 0,
    chancePoints: 0,
    fakeoutCycles: 0,
    fakeoutFailed: 0,
    gamesInsideFailedCycles: 0,
    fatalWindows: 0,
    fatalSurvived: 0,
    gamesInsideLostFatal: 0,
    gamesInBonus: 0,
    barChanceHits: 0,
    enemyFatalWindows: 0,
    enemyFatalDeaths: 0,
    shieldRolls: 0,
    shieldDeaths: 0,
    naturalEscapes: 0,
    runsEnded: 0,
    longestDrought: 0,
    worstDrawdown: 0,
    bonusGaps: [],
  };

  let balance = 0;
  let peak = 0;
  let drought = 0;
  let lastOutcome = null;

  // round / enemy / deck (currentEnemyStore, roundStore, playerBattleCardStore)
  let round = 1;
  let pickedEnemyIds = [];
  let enemy = pickEnemyForRound(round, pickedEnemyIds);
  let enemyCounter = enemy.attackCounter;
  let cardIndex = 0;

  // enemy fatal window (enemyAttackModeStore.ts)
  let enemyFatalLeft = 0;
  let enemyCountered = false;
  let enemyReset = false;
  let shieldResolution = null;
  let shield = null;

  const nextEnemy = () => {
    pickedEnemyIds.push(enemy.id);
    round += 1;
    enemy = pickEnemyForRound(round, pickedEnemyIds);
    enemyCounter = enemy.attackCounter;
  };

  const endRun = () => {
    stats.runsEnded += 1;
    round = 1;
    pickedEnemyIds = [];
    enemy = pickEnemyForRound(round, pickedEnemyIds);
    enemyCounter = enemy.attackCounter;
    cardIndex = 0;
    shield = null;
  };

  // fakeout cycle (attackFakeoutStore.ts)
  let fakeoutActive = false;
  let fakeoutGames = 0;
  let fakeoutSuccess = false;

  // player fatal window (fatalModeStore.ts)
  let fatalLeft = 0;
  let fatalHit = false;

  // classic bonus (bonusModeStore / handleBonusDraw.ts)
  let bonusPhase = null; // "opening" | "games"
  let bonusGamesLeft = 0;
  let bonusGamesMax = 0;
  let bonusTotal = 0;
  let bonusStock = 0;
  let forcedBonusType = null;

  // nested loop bonus (handleNestedBonusDraw.ts)
  let nestedActive = false;
  let nestedMainLeft = 0;
  let nestedNestedLeft = 0;
  let nestedInNested = false;

  const armBonus = (forced = null) => {
    nextEnemy();
    bonusPhase = "opening";
    forcedBonusType = forced;
    stats.bonuses += 1;
    stats.bonusGaps.push(drought);
    stats.longestDrought = Math.max(stats.longestDrought, drought);
    drought = 0;
  };

  const finishBonus = () => {
    const total = bonusTotal;
    bonusPhase = null;
    bonusTotal = 0;
    if (total > 0) {
      const { banked } = runCollection(total);
      stats.collectionPoints += banked;
      stats.coinOut += banked;
      balance += banked;
    }
  };

  while (stats.games < games) {
    // ---- classic bonus draw (free, but counts as a game) ------------------
    if (bonusPhase) {
      stats.games += 1;
      stats.gamesInBonus += 1;
      const result = drawBattleResult({ barChance: "none" });
      const hasChance = result.cards.includes("Chance");

      if (bonusPhase === "opening") {
        const type = forcedBonusType ?? rollBonusType(hasChance);
        forcedBonusType = null;

        if (type === "superMax") {
          bonusPhase = null;
          nestedActive = true;
          nestedMainLeft = patchConfig.nestedBonus.mainLoopGames;
          nestedNestedLeft = 0;
          nestedInNested = false;
        } else {
          bonusGamesMax = bonusGamesForType(type);
          bonusGamesLeft = bonusGamesMax;
          bonusPhase = "games";
        }
        continue;
      }

      const barEvent = rollBarResetEvent();

      if (barEvent === "real") {
        bonusGamesLeft = bonusGamesMax;
      } else if (barEvent === "fake") {
        bonusTotal += patchConfig.barReset.fakePoints;
        bonusGamesLeft -= 1;
      } else {
        const safe = result.result === "Bar" ? "Coin" : result.result;
        const reward = bonusRewards[safe] ?? bonusRewards.Attack;
        bonusTotal += reward.points;
        bonusGamesLeft -= 1;
      }

      if (bonusGamesLeft <= 0) {
        stats.bonusPoints += bonusTotal;
        finishBonus();
      }
      continue;
    }

    // ---- nested loop bonus draw -------------------------------------------
    if (nestedActive) {
      stats.games += 1;
      stats.gamesInBonus += 1;
      const result = drawBattleResult({ barChance: "none" });
      const hasChance = result.cards.includes("Chance");

      if (nestedInNested) {
        bonusTotal += hasChance
          ? rollNestedChancePoints()
          : patchConfig.nestedBonus.nestedMinPoints;
        nestedNestedLeft -= 1;

        if (nestedNestedLeft <= 0) {
          nestedInNested = false;
          if (nestedMainLeft <= 0) {
            nestedActive = false;
            stats.bonusPoints += bonusTotal;
            finishBonus();
          }
        }
        continue;
      }

      nestedMainLeft -= 1;

      if (isNestedTriggerOutcome(result.result)) {
        nestedInNested = true;
        nestedNestedLeft = patchConfig.nestedBonus.nestedLoopGames;
        continue;
      }

      if (nestedMainLeft <= 0) {
        nestedActive = false;
        stats.bonusPoints += bonusTotal;
        finishBonus();
      }
      continue;
    }

    // ---- a stocked bonus starts on the next press, at the normal price ----
    if (bonusStock > 0) {
      const cost = drawCostFor(lastOutcome);
      balance -= cost;
      stats.coinIn += cost;
      bonusStock -= 1;
      lastOutcome = null;
      armBonus();
      continue;
    }

    // ---- normal battle draw ------------------------------------------------
    stats.games += 1;
    stats.normalGames += 1;
    drought += 1;

    const cost = drawCostFor(lastOutcome);
    balance -= cost;
    stats.coinIn += cost;

    // handleDrawButtonPress.ts: the enemy's fuse burns on ordinary draws only,
    // and cannot light its window while a fakeout cycle is running.
    if (fatalLeft <= 0 && enemyFatalLeft <= 0) {
      enemyCounter -= 1;
      if (!fakeoutActive && enemyCounter <= 0) {
        enemyFatalLeft = Math.max(
          1,
          Math.round(patchConfig.fatalMode.enemyWindowTurns)
        );
        enemyCountered = false;
        enemyReset = false;
        shieldResolution = null;
        stats.enemyFatalWindows += 1;
      }
    }

    const result = drawBattleResult();
    lastOutcome = result.result;

    const chanceCount = result.cards.filter((card) => card === "Chance").length;
    if (chanceCount > 0) stats.chanceHands += 1;

    // A lone Chance rolls its own points win.
    if (chanceCount === 1 && Math.random() < 0.5) {
      const win = weightedPick(CHANCE_POINTS_TIERS).points;
      stats.chancePoints += win;
      stats.coinOut += win;
      balance += win;
    }

    peak = Math.max(peak, balance);
    stats.worstDrawdown = Math.max(stats.worstDrawdown, peak - balance);

    // Triple BAR in normal play is an instant defeat plus a stocked bonus.
    if (
      result.barChance?.scope === "battle" &&
      result.barChance.outcome === "success"
    ) {
      stats.barChanceHits += 1;
      bonusStock += 1;
      fakeoutActive = false;
      fatalLeft = 0;
      armBonus(result.barChance.bonusType);
      continue;
    }

    const evaluation = evaluateResult(result, DECK[cardIndex] ?? "R");

    // A triple Defense stores a shield for this round.
    if (result.result === "Defense") {
      shield = { rule: rollShieldGrade(), round };
    }

    // ---- a running fakeout cycle owns the game ----------------------------
    if (fakeoutActive) {
      if (chanceCount > 0) stats.chanceHandsWasted += 1;
      fakeoutGames += 1;
      const isPayoff = fakeoutGames > patchConfig.fakeout.buildupGames;

      // Override window: a hand that lands an attack overturns a predetermined
      // miss, right up to and including the payoff game.
      if (!fakeoutSuccess) {
        if (evaluation.attackOnTarget) {
          fakeoutSuccess = rollAttackAttempt(onTargetRate(DECK[cardIndex] ?? "R")).success;
        } else if (evaluation.chanceAttack) {
          fakeoutSuccess = rollAttackAttempt(chanceRate(evaluation)).success;
        }
      }

      if (isPayoff) {
        fakeoutActive = false;

        if (fakeoutSuccess) {
          fatalLeft = Math.max(
            1,
            Math.round(patchConfig.fatalMode.playerWindowGames)
          );
          fatalHit = false;
          stats.fatalWindows += 1;
        } else {
          stats.fakeoutFailed += 1;
          stats.gamesInsideFailedCycles += patchConfig.fakeout.buildupGames + 1;
        }
      }
      continue;
    }

    // ---- the enemy's window owns the game ---------------------------------
    if (enemyFatalLeft > 0) {
      if (evaluation.chanceAttack || result.result === "Bar") {
        enemyCountered = true;
      }
      if (evaluation.attackOnTarget || result.result === "Reply") {
        enemyReset = true;
      }

      if (!shieldResolution && shield && shield.round === round) {
        shieldResolution = {
          survived: Math.random() < shield.rule.survivalChance,
        };
        shield = null;
        stats.shieldRolls += 1;
      }

      enemyFatalLeft -= 1;

      if (enemyFatalLeft <= 0) {
        const resolution = shieldResolution;
        shieldResolution = null;
        const survived = resolution
          ? resolution.survived
          : enemyCountered || enemyReset;

        if (survived) {
          if (!resolution) stats.naturalEscapes += 1;
          enemyCounter = enemy.attackCounter;
        } else {
          stats.enemyFatalDeaths += 1;
          if (resolution) stats.shieldDeaths += 1;
          fakeoutActive = false;
          fatalLeft = 0;
          cardIndex += 1;
          if (cardIndex >= DECK.length) endRun();
          else enemyCounter = enemy.attackCounter;
        }
      }
      continue;
    }

    // ---- the player's fatal window owns the game --------------------------
    if (fatalLeft > 0) {
      if (
        evaluation.attackOnTarget ||
        evaluation.chanceAttack ||
        FATAL_HIT_RESULTS.has(result.result)
      ) {
        fatalHit = true;
      }

      fatalLeft -= 1;

      if (fatalLeft <= 0) {
        if (fatalHit) {
          armBonus();
        } else {
          enemyFatalLeft = Math.max(
            1,
            Math.round(patchConfig.fatalMode.enemyWindowTurns)
          );
          enemyCountered = false;
          enemyReset = false;
          shieldResolution = null;
          stats.enemyFatalWindows += 1;
          stats.fatalSurvived += 1;
          stats.gamesInsideLostFatal +=
            patchConfig.fakeout.buildupGames +
            1 +
            Math.max(1, Math.round(patchConfig.fatalMode.playerWindowGames));
        }
      }
      continue;
    }

    // ---- ordinary game: roll an attack attempt ----------------------------
    let success = false;
    let source = "";

    if (evaluation.attackOnTarget) {
      success = rollAttackAttempt(onTargetRate(DECK[cardIndex] ?? "R")).success;
      source = "attackCard";
    }
    if (evaluation.chanceAttack) {
      success = rollAttackAttempt(chanceRate(evaluation)).success;
      source = "chance";
    }
    if (evaluation.emptySlotAttack) {
      success = rollAttackAttempt(evaluation.emptySlotAttackRate).success;
      source = "emptySlot";
    }

    // An empty-slot miss is never shown, so it never starts a cycle.
    const presented =
      evaluation.attackAttempt && !(source === "emptySlot" && !success);

    if (presented) {
      fakeoutActive = true;
      fakeoutGames = 0;
      fakeoutSuccess = success;
      stats.fakeoutCycles += 1;

      if (source === "attackCard") stats.fromAttackCard += 1;
      else if (source === "chance") stats.fromChance += 1;
      else stats.fromEmptySlot += 1;
    }
  }

  stats.longestDrought = Math.max(stats.longestDrought, drought);
  stats.net = balance;
  return stats;
}

// --- run --------------------------------------------------------------------

function percentile(sorted, p) {
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[index];
}

const totals = {
  coinIn: 0,
  coinOut: 0,
  games: 0,
  normalGames: 0,
  chanceHands: 0,
  fromAttackCard: 0,
  fromChance: 0,
  fromEmptySlot: 0,
  chanceHandsWasted: 0,
  bonuses: 0,
  fakeoutCycles: 0,
  fakeoutFailed: 0,
  gamesInsideFailedCycles: 0,
  fatalWindows: 0,
  fatalSurvived: 0,
  gamesInsideLostFatal: 0,
  gamesInBonus: 0,
  barChanceHits: 0,
  enemyFatalWindows: 0,
  enemyFatalDeaths: 0,
  shieldRolls: 0,
  shieldDeaths: 0,
  naturalEscapes: 0,
  runsEnded: 0,
  bonusPoints: 0,
  collectionPoints: 0,
  chancePoints: 0,
};

const nets = [];
const droughts = [];
const drawdowns = [];
const bonusCounts = [];
const allGaps = [];

for (let session = 0; session < SESSIONS; session += 1) {
  const stats = runSession(GAMES);
  for (const key of Object.keys(totals)) totals[key] += stats[key];
  nets.push(stats.net);
  droughts.push(stats.longestDrought);
  drawdowns.push(stats.worstDrawdown);
  bonusCounts.push(stats.bonuses);
  for (const gap of stats.bonusGaps) allGaps.push(gap);
}

nets.sort((a, b) => a - b);
droughts.sort((a, b) => a - b);
drawdowns.sort((a, b) => a - b);
bonusCounts.sort((a, b) => a - b);
allGaps.sort((a, b) => a - b);

const n = SESSIONS;
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const rate = (count) => (count === 0 ? "never" : `1/${(totals.games / count).toFixed(1)}`);
const normalRate = (count) =>
  count === 0 ? "never" : `1/${(totals.normalGames / count).toFixed(1)}`;
const pct = (part, whole) => (whole === 0 ? "n/a" : `${((part / whole) * 100).toFixed(1)}%`);

console.log(`\n=== ${GAMES}G x ${SESSIONS} sessions | active card tier ${TIER} ===`);
console.log(`pin: ${JSON.stringify(patchConfig.debug.forceResultProbability)}`);
if (ON_TARGET_RATES !== null) {
  console.log(`attack-on-target rates: ${JSON.stringify(ON_TARGET_RATES)}`);
}
if (CHANCE_RATE_OVERRIDE !== null) {
  console.log(`chance card attack rate forced to ${CHANCE_RATE_OVERRIDE}%`);
}
console.log("");
console.log("-- how often things happen --");
console.log(`chance card in hand   ${normalRate(totals.chanceHands)} of normal games  (${rate(totals.chanceHands)} counting bonus games)`);
console.log(`bonus                 ${rate(totals.bonuses)}  (${(totals.bonuses / n).toFixed(2)} per ${GAMES}G)`);
console.log(`triple BAR            ${rate(totals.barChanceHits)}`);
console.log(`fakeout cycle         ${rate(totals.fakeoutCycles)}  (${(totals.fakeoutCycles / n).toFixed(1)} per session)`);
console.log(`  of those, a miss    ${pct(totals.fakeoutFailed, totals.fakeoutCycles)}`);
console.log(`fatal window          ${(totals.fatalWindows / n).toFixed(1)} per session`);
console.log(`  enemy survived      ${pct(totals.fatalSurvived, totals.fatalWindows)}`);
console.log("");
console.log("-- enemy fatal mode --");
console.log(`window opens          ${(totals.enemyFatalWindows / n).toFixed(1)} per session (${normalRate(totals.enemyFatalWindows)} of normal games)`);
console.log(`card actually killed  ${pct(totals.enemyFatalDeaths, totals.enemyFatalWindows)} of windows  (${(totals.enemyFatalDeaths / n).toFixed(2)} per session)`);
console.log(`settled by a shield   ${pct(totals.shieldRolls, totals.enemyFatalWindows)}  -> died anyway ${pct(totals.shieldDeaths, totals.shieldRolls)}`);
console.log(`runs ended (deck out) ${(totals.runsEnded / n).toFixed(2)} per session`);
console.log("");
console.log("-- what actually starts an attack --");
console.log(`attack card on target ${pct(totals.fromAttackCard, totals.fakeoutCycles)}`);
console.log(`chance card           ${pct(totals.fromChance, totals.fakeoutCycles)}`);
console.log(`empty slot roll       ${pct(totals.fromEmptySlot, totals.fakeoutCycles)}`);
console.log(`chance hands landing inside a sequence that was already running: ${pct(totals.chanceHandsWasted, totals.chanceHands)}`);
console.log("");
console.log("-- the money --");
console.log(`coin in per game      ${(totals.coinIn / totals.games).toFixed(2)}P`);
console.log(`payout                ${pct(totals.coinOut, totals.coinIn)}`);
console.log(`net per ${GAMES}G         median ${percentile(nets, 0.5)}P   mean ${mean(nets).toFixed(0)}P`);
console.log(`  p5 / p25            ${percentile(nets, 0.05)}P / ${percentile(nets, 0.25)}P`);
console.log(`  p75 / p95           ${percentile(nets, 0.75)}P / ${percentile(nets, 0.95)}P`);
console.log(`  sessions in the red ${pct(nets.filter((value) => value < 0).length, n)}`);
console.log(`points earned         bonus ${(totals.bonusPoints / n).toFixed(0)}P -> collected ${(totals.collectionPoints / n).toFixed(0)}P | lone chance ${(totals.chancePoints / n).toFixed(0)}P`);
console.log("");
console.log("-- where the games go --");
console.log(`inside a fakeout that missed              ${pct(totals.gamesInsideFailedCycles, totals.games)}`);
console.log(`inside an attempt that died in the window ${pct(totals.gamesInsideLostFatal, totals.games)}`);
console.log(`inside a bonus                            ${pct(totals.gamesInBonus, totals.games)}`);
console.log("");
console.log("-- the waiting --");
console.log(`gap between bonuses   median ${percentile(allGaps, 0.5)}G  p90 ${percentile(allGaps, 0.9)}G  p99 ${percentile(allGaps, 0.99)}G  max ${allGaps[allGaps.length - 1]}G`);
console.log(`worst gap per session median ${percentile(droughts, 0.5)}G  p90 ${percentile(droughts, 0.9)}G  max ${droughts[droughts.length - 1]}G`);
console.log(`worst drawdown        median ${percentile(drawdowns, 0.5)}P  p90 ${percentile(drawdowns, 0.9)}P  max ${drawdowns[drawdowns.length - 1]}P`);
console.log(`bonuses per session   min ${bonusCounts[0]}  median ${percentile(bonusCounts, 0.5)}  max ${bonusCounts[bonusCounts.length - 1]}`);
console.log("");
