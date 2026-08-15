import { type Card } from "@/lib/gacha/pullLogic";

const TEST_BATTLE_CARDS: Card[] = [
  { name: "R4", rarity: "R", image: "/images/cards/player/R4/card.webp" },
  { name: "R3", rarity: "R", image: "/images/cards/player/R3/card.webp" },
  { name: "R2", rarity: "R", image: "/images/cards/player/R2/card.webp" },
];

let playerBattleCards: Card[] = [];
let currentIndex = 0;

const listeners: (() => void)[] = [];

export function initializePlayerBattleCards() {
  if (typeof window === "undefined") {
    playerBattleCards = TEST_BATTLE_CARDS;
    currentIndex = 0;
    return;
  }

  const saved = localStorage.getItem("battle_player_cards");

  if (saved) {
    try {
      playerBattleCards = JSON.parse(saved);
    } catch {
      playerBattleCards = TEST_BATTLE_CARDS;
    }
  } else {
    playerBattleCards = TEST_BATTLE_CARDS;
  }

  currentIndex = 0;
  listeners.forEach((listener) => listener());
}

export function getCurrentPlayerBattleCard() {
  return playerBattleCards[currentIndex] ?? null;
}

export function getRemainingPlayerBattleCards() {
  return Math.max(playerBattleCards.length - currentIndex - 1, 0);
}

export function getUpcomingPlayerBattleCards(count = 3): Card[] {
  return playerBattleCards.slice(currentIndex + 1, currentIndex + 1 + count);
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

  currentIndex = Math.min(index, Math.max(playerBattleCards.length - 1, 0));
  listeners.forEach((listener) => listener());
}

export function loadNextPlayerBattleCard() {
  if (currentIndex + 1 >= playerBattleCards.length) {
    return false;
  }

  currentIndex += 1;
  listeners.forEach((listener) => listener());

  return true;
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
