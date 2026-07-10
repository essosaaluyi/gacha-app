// Feature 9: daily-rotating gacha lineup + simulated community stats.
// Everything is deterministic per calendar day (local time), so every
// visitor sees the same lineup and the same "community" numbers with no
// backend involved. Knobs live in patchConfig.dailyGacha.

import type { Card } from "@/lib/gacha/pullLogic";
import {
  cards as configuredCards,
  rarityRates,
} from "@/lib/game-config/generated";
import { patchConfig } from "@/lib/game-config/patchConfig";

const pool: Card[] = configuredCards.map((card) => ({ ...card }));

const RARITY_ORDER = ["UR", "SSR", "SR", "R"];

function rarityRank(rarity: string): number {
  const index = RARITY_ORDER.indexOf(rarity);
  return index === -1 ? RARITY_ORDER.length : index;
}

// FNV-1a 32-bit string hash → mulberry32 PRNG. Small and deterministic;
// quality is plenty for cosmetic lottery use.
function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], rand: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/** Local-time YYYY-MM-DD; the rotation boundary is local midnight. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function msUntilRotation(now: Date = new Date()): number {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  ).getTime();
  return Math.max(0, nextMidnight - now.getTime());
}

/**
 * Today's active lineup: one guaranteed card per rarity (so rollRarity
 * always has a target), remaining slots filled at random, rarest first.
 */
export function getDailyLineup(date: Date = new Date()): Card[] {
  const size = Math.min(
    Math.max(patchConfig.dailyGacha.activeCardsPerDay, 1),
    pool.length
  );
  const rand = mulberry32(hashSeed(`lineup:${dateKey(date)}`));

  const byRarity = new Map<string, Card[]>();
  for (const card of pool) {
    const group = byRarity.get(card.rarity) ?? [];
    group.push(card);
    byRarity.set(card.rarity, group);
  }

  const chosen: Card[] = [];
  const leftovers: Card[] = [];
  for (const group of byRarity.values()) {
    const pick = Math.floor(rand() * group.length);
    group.forEach((card, index) =>
      (index === pick ? chosen : leftovers).push(card)
    );
  }

  shuffleInPlace(leftovers, rand);
  chosen.push(...leftovers.slice(0, Math.max(0, size - chosen.length)));

  return chosen
    .sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity))
    .slice(0, size);
}

export type CommunityCardStat = {
  card: Card;
  pulls: number;
  sharePct: number;
};

export type CommunityStats = {
  /** Simulated community pulls so far today; climbs toward the daily target. */
  totalPulls: number;
  /** One entry per lineup card, in lineup (rarest-first) order. */
  perCard: CommunityCardStat[];
  /** Top 3 by pull count. */
  topCards: CommunityCardStat[];
};

/**
 * Simulated community activity for today's lineup. The daily total is
 * basePulls ± variance (seeded by date); the displayed total ramps up over
 * the day so the counter feels live. Per-card counts follow the rarity
 * odds — commons rack up pulls, URs stay scarce — with per-card jitter so
 * same-rarity cards don't tie.
 */
export function getCommunityStats(now: Date = new Date()): CommunityStats {
  const lineup = getDailyLineup(now);
  const { basePulls, variance } = patchConfig.dailyGacha.communitySim;
  const rand = mulberry32(hashSeed(`community:${dateKey(now)}`));

  const dailyTarget = Math.max(
    lineup.length,
    Math.round(basePulls * (1 + (rand() * 2 - 1) * variance))
  );

  const rates: Record<string, number> = {
    ...rarityRates,
    ...patchConfig.gachaOdds,
  };
  const rarityCounts = new Map<string, number>();
  for (const card of lineup) {
    rarityCounts.set(card.rarity, (rarityCounts.get(card.rarity) ?? 0) + 1);
  }
  const weights = lineup.map(
    (card) =>
      ((rates[card.rarity] ?? 1) / (rarityCounts.get(card.rarity) ?? 1)) *
      (0.7 + rand() * 0.6)
  );
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const dayFraction = Math.min(
    1,
    Math.max(0, (now.getTime() - midnight) / 86_400_000)
  );
  // pow < 1 front-loads the ramp a little (mornings aren't dead quiet).
  const totalPulls = Math.round(dailyTarget * Math.pow(dayFraction, 0.75));

  let assigned = 0;
  const perCard: CommunityCardStat[] = lineup.map((card, index) => {
    const pulls = Math.floor((totalPulls * weights[index]) / weightSum);
    assigned += pulls;
    return { card, pulls, sharePct: 0 };
  });

  if (perCard.length > 0) {
    // Rounding leftovers go to the most popular card so the sum matches.
    perCard.reduce((top, stat) => (stat.pulls > top.pulls ? stat : top))
      .pulls += totalPulls - assigned;
  }
  for (const stat of perCard) {
    stat.sharePct = totalPulls > 0 ? (stat.pulls / totalPulls) * 100 : 0;
  }

  const topCards = [...perCard].sort((a, b) => b.pulls - a.pulls).slice(0, 3);

  return { totalPulls, perCard, topCards };
}
