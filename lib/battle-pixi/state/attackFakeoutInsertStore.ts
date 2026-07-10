import type { Card } from "@/lib/gacha/pullLogic";
import type { BattleEnemy } from "@/lib/battle-pixi/config/enemyConfig";

export type AttackFakeoutInsertTone = "white" | "blue" | "green" | "red";
export type AttackFakeoutInsertSide = "player" | "enemy";

export type AttackFakeoutInsertSubject = {
  name: string;
  image: string;
  rarity?: string;
  kind: AttackFakeoutInsertSide;
};

export type AttackFakeoutInsertItem = {
  id: number;
  subject: AttackFakeoutInsertSubject;
  line: string;
  tone: AttackFakeoutInsertTone;
  side: AttackFakeoutInsertSide;
};

export type AttackFakeoutInsertState = {
  inserts: AttackFakeoutInsertItem[];
};

let state: AttackFakeoutInsertState = {
  inserts: [],
};

let nextId = 1;

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

function pickWeightedTone(
  weights: Record<AttackFakeoutInsertTone, number>
): AttackFakeoutInsertTone {
  const entries = Object.entries(weights) as [
    AttackFakeoutInsertTone,
    number,
  ][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [tone, weight] of entries) {
    roll -= weight;

    if (roll <= 0) return tone;
  }

  return "white";
}

function getTone(predeterminedSuccess: boolean): AttackFakeoutInsertTone {
  if (predeterminedSuccess) {
    return pickWeightedTone({
      white: 25,
      blue: 20,
      green: 30,
      red: 25,
    });
  }

  return pickWeightedTone({
    white: 45,
    blue: 30,
    green: 15,
    red: 10,
  });
}

function getPlayerLine(card: Card | null) {
  if (!card) {
    return "A distant gear begins to move...";
  }

  const cardNumber = card.name.replace(/^[A-Z]+/i, "");

  if (card.rarity === "UR") {
    return `The sealed star of ${card.name} starts turning...`;
  }

  if (card.rarity === "SSR") {
    return `${card.name}'s golden core is responding...`;
  }

  if (card.rarity === "SR") {
    return `A blue signal from ${card.name} cuts through the noise...`;
  }

  return `${card.name}'s small gear ${cardNumber || ""} twitches...`;
}

function getEnemyLine(enemy: BattleEnemy | null) {
  if (!enemy) {
    return "Something waits behind the static...";
  }

  const enemyLines: Record<number, string> = {
    1: "Its rusted origin answers with a low pulse...",
    2: "A cracked signal crawls from its old frame...",
    3: "The buried core remembers the battlefield...",
    4: "Its iron prayer turns against the light...",
    5: "A heavy relic begins to wake below the smoke...",
    6: "Cold gears lock into a hostile rhythm...",
    7: "The worn mask stares back from another age...",
    8: "A distorted omen spills from the enemy shell...",
    9: "The sealed machine breathes through the dark...",
    10: "A forbidden engine starts counting down...",
    11: "Its broken emblem flashes once, then again...",
    12: "The hidden guardian stirs beyond the round...",
    13: "An extra shadow bends the rules of the field...",
  };

  return enemyLines[enemy.id] ?? `${enemy.name}'s origin begins to stir...`;
}

function toPlayerSubject(card: Card | null): AttackFakeoutInsertSubject {
  return {
    name: card?.name ?? "UNKNOWN",
    image: card?.image ?? "/images/card-back.webp",
    rarity: card?.rarity,
    kind: "player",
  };
}

function toEnemySubject(
  enemy: BattleEnemy | null
): AttackFakeoutInsertSubject {
  return {
    name: enemy?.name ?? "UNKNOWN",
    image: enemy?.image ?? "/images/card-back.webp",
    kind: "enemy",
  };
}

export function showPlayerAttackFakeoutInsert(args: {
  card: Card | null;
  predeterminedSuccess: boolean;
}) {
  state = {
    inserts: [
      ...state.inserts.filter((insert) => insert.side !== "player"),
      {
        id: nextId,
        subject: toPlayerSubject(args.card),
        line: getPlayerLine(args.card),
        tone: getTone(args.predeterminedSuccess),
        side: "player",
      },
    ],
  };

  nextId += 1;
  notify();
}

export function showEnemyAttackFakeoutInsert(args: {
  enemy: BattleEnemy | null;
  predeterminedSuccess: boolean;
}) {
  state = {
    inserts: [
      ...state.inserts.filter((insert) => insert.side !== "enemy"),
      {
        id: nextId,
        subject: toEnemySubject(args.enemy),
        line: getEnemyLine(args.enemy),
        tone: getTone(args.predeterminedSuccess),
        side: "enemy",
      },
    ],
  };

  nextId += 1;
  notify();
}

export function clearAttackFakeoutInserts() {
  state = {
    inserts: [],
  };
  notify();
}

export function getAttackFakeoutInsertState() {
  return state;
}

export function subscribeAttackFakeoutInsert(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);

    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
