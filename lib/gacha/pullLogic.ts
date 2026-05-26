export type Card = {
  name: string;
  rarity: string;
  image: string;
};

export const cards: Card[] = [
  { name: "R1", rarity: "R", image: "/images/R1.png" },
  { name: "R2", rarity: "R", image: "/images/R2.png" },
  { name: "R3", rarity: "R", image: "/images/R3.png" },
  { name: "R4", rarity: "R", image: "/images/R4.png" },
  { name: "SR1", rarity: "SR", image: "/images/SR1.png" },
  { name: "SR2", rarity: "SR", image: "/images/SR2.png" },
  { name: "SR3", rarity: "SR", image: "/images/SR3.png" },
  { name: "SR4", rarity: "SR", image: "/images/SR4.png" },
  { name: "SSR1", rarity: "SSR", image: "/images/SSR1.png" },
  { name: "SSR2", rarity: "SSR", image: "/images/SSR2.png" },
  { name: "SSR3", rarity: "SSR", image: "/images/SSR3.png" },
  { name: "SSR4", rarity: "SSR", image: "/images/SSR4.png" },
  { name: "UR1", rarity: "UR", image: "/images/UR1.png" },
  { name: "UR2", rarity: "UR", image: "/images/UR2.png" },
  { name: "UR3", rarity: "UR", image: "/images/UR3.png" },
];

export function rollRarity() {
  const rand = Math.random() * 100;
  if (rand < 60) return "R";
  if (rand < 85) return "SR";
  if (rand < 95) return "SSR";
  return "UR";
}

export function pullOne() {
  const rarity = rollRarity();
  const pool = cards.filter((card) => card.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pullMany(count: number) {
  return Array.from({ length: count }, () => pullOne());
}