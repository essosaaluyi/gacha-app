import type { Card } from "@/lib/gacha/pullLogic";

const TEST_BATTLE_CARDS: Card[] = [
  { name: "R4", rarity: "R", image: "/images/cards/player/R4/card.webp" },
  { name: "R3", rarity: "R", image: "/images/cards/player/R3/card.webp" },
  { name: "R2", rarity: "R", image: "/images/cards/player/R2/card.webp" },
];

let playerBattleCards: Card[] = [];
let currentIndex: number | null = null;
let selectedIndex: number | null = null;
let summonedIndices = new Set<number>();
let pendingDefeat = false;

export type PlayerBattleHandSnapshot = {
  cards: Card[];
  summonedIndices: number[];
  activeIndex: number | null;
  selectedIndex: number | null;
  pendingDefeat?: boolean;
};

const listeners: (() => void)[] = [];

function isBattleDeck(value: unknown): value is Card[] {
  return Array.isArray(value) && value.every((card) =>
    card !== null && typeof card === "object" &&
    typeof card.name === "string" && card.name.length > 0 &&
    typeof card.rarity === "string" && card.rarity.length > 0 &&
    typeof card.image === "string" && card.image.length > 0
  );
}

export function initializePlayerBattleCards() {
  if (typeof window === "undefined") {
    playerBattleCards = [...TEST_BATTLE_CARDS];
  } else try {
    const saved = localStorage.getItem("battle_player_cards");
    const parsed: unknown = saved ? JSON.parse(saved) : null;
    playerBattleCards = isBattleDeck(parsed) ? parsed : TEST_BATTLE_CARDS;
  } catch {
    playerBattleCards = TEST_BATTLE_CARDS;
  }

  currentIndex = null;
  selectedIndex = null;
  summonedIndices = new Set();
  pendingDefeat = false;
  listeners.forEach((listener) => listener());
}

export function getCurrentPlayerBattleCard() {
  return currentIndex === null ? null : playerBattleCards[currentIndex] ?? null;
}

export function getRemainingPlayerBattleCards() {
  return playerBattleCards.length - summonedIndices.size;
}

export function getUpcomingPlayerBattleCards(count = 3): Card[] {
  return getAvailablePlayerBattleCards().slice(0, count).map(({ card }) => card);
}

export function getAvailablePlayerBattleCards() {
  return playerBattleCards.flatMap((card, index) =>
    summonedIndices.has(index) ? [] : [{ index, card }]
  );
}

export function getSelectedPlayerBattleCardIndex() {
  return selectedIndex;
}

export function selectPlayerBattleCard(index: number) {
  if (currentIndex !== null || !Number.isInteger(index) ||
      !playerBattleCards[index] || summonedIndices.has(index)) return false;
  selectedIndex = index;
  listeners.forEach((listener) => listener());
  return true;
}

export function summonSelectedPlayerBattleCard() {
  if (selectedIndex === null || currentIndex !== null || summonedIndices.has(selectedIndex)) return false;
  currentIndex = selectedIndex;
  summonedIndices.add(currentIndex);
  selectedIndex = null;
  listeners.forEach((listener) => listener());
  return true;
}

export function getPlayerBattleHandSnapshot(): PlayerBattleHandSnapshot {
  return {
    cards: playerBattleCards.map((card) => ({ ...card })),
    summonedIndices: [...summonedIndices],
    activeIndex: currentIndex,
    selectedIndex,
    pendingDefeat,
  };
}

export function restorePlayerBattleHand(snapshot: PlayerBattleHandSnapshot | undefined, legacyIndex = 0) {
  if (!snapshot || !isBattleDeck(snapshot.cards) || !Array.isArray(snapshot.summonedIndices)) {
    // Old saves consumed the prefix through the active card, including copies.
    setPlayerBattleCardIndex(legacyIndex);
    return;
  }
  playerBattleCards = snapshot.cards.map((card) => ({ ...card }));
  const validIndex = (index: unknown): index is number =>
    typeof index === "number" && Number.isInteger(index) && index >= 0 && index < playerBattleCards.length;
  summonedIndices = new Set(snapshot.summonedIndices.filter(validIndex));
  currentIndex = validIndex(snapshot.activeIndex) ? snapshot.activeIndex : null;
  if (currentIndex !== null) summonedIndices.add(currentIndex);
  // A decided loss can be saved before its animation finishes. Continue skips
  // that animation and opens the remaining hand instead of reviving the card.
  if (snapshot.pendingDefeat === true) currentIndex = null;
  pendingDefeat = false;
  selectedIndex = currentIndex === null && validIndex(snapshot.selectedIndex) &&
    !summonedIndices.has(snapshot.selectedIndex) ? snapshot.selectedIndex : null;
  listeners.forEach((listener) => listener());
}

export function getPlayerBattleCardIndex() {
  return currentIndex;
}

/**
 * Restores which card in the deck is active. Used when resuming a saved
 * battle -- without it the deck rewinds to card 1 while the rest of the run
 * (round, points, enemy) resumes mid-battle.
 */
export function setPlayerBattleCardIndex(index: number) {
  if (!Number.isInteger(index) || index < 0) return;

  currentIndex = playerBattleCards.length ? Math.min(index, playerBattleCards.length - 1) : null;
  summonedIndices = new Set(currentIndex === null ? [] : Array.from({ length: currentIndex + 1 }, (_, i) => i));
  selectedIndex = null;
  pendingDefeat = false;
  listeners.forEach((listener) => listener());
}

export function markPlayerBattleCardDefeated() {
  if (currentIndex === null || pendingDefeat) return;
  pendingDefeat = true;
  listeners.forEach((listener) => listener());
}

export function loadNextPlayerBattleCard() {
  // Defeat retires the active instance permanently; the next one is a choice.
  currentIndex = null;
  selectedIndex = null;
  pendingDefeat = false;
  listeners.forEach((listener) => listener());
  return getRemainingPlayerBattleCards() > 0;
}

export function subscribePlayerBattleCard(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);

    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
