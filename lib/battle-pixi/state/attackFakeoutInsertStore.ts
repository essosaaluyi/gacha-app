import type { Card } from "@/lib/gacha/pullLogic";
import type {
  BattleEnemy,
  EnemyId,
} from "@/lib/battle-pixi/config/enemyConfig";
import {
  getEnemyCharacterName,
  getPlayerCharacterName,
} from "@/lib/battle-pixi/config/characterNames";
import { PLAYER_CARD_BACK_IMAGE } from "@/lib/cards/cardAssets";
import { playSfx } from "@/lib/audio/sfxStore";

export type AttackFakeoutInsertTone = "white" | "blue" | "green" | "red";
export type AttackFakeoutInsertSide = "player" | "enemy";

export type AttackFakeoutInsertSubject = {
  /** Both names joined for display -- see characterNames.ts. */
  name: string;
  /** Roster id on its own ("R4" / "Enemy 4"). */
  code: string;
  /** Character name on its own ("Young Knight"); empty when unauthored. */
  displayName: string;
  image: string;
  iconImage?: string;
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
  phase: "idle" | "scrolling" | "exiting";
};

let state: AttackFakeoutInsertState = {
  inserts: [],
  phase: "idle",
};

let nextId = 1;
let scrollTimer: ReturnType<typeof setTimeout> | null = null;
let exitTimer: ReturnType<typeof setTimeout> | null = null;

const listeners: (() => void)[] = [];
const ICON_BASE = "/images/battle-overlays/attack-fakeout/icons";
const HISTORY_SCROLL_MS = 280;
const GROUP_EXIT_MS = 220;
const lastPhraseBySubject = new Map<string, string>();

// Display names are no longer kept here -- they live in characterNames.ts so
// every surface names a fighter the same way. What stays is the dialogue,
// which is specific to this insert.
const PLAYER_PHRASES_BY_ID = {
  R1: [],
  R2: [],
  R3: [],
  R4: [],
  SR1: [],
  SR2: [],
  SR3: [],
  SR4: [],
  SSR1: [],
  SSR2: [],
  SSR3: [],
  SSR4: [],
  UR1: [],
  UR2: [],
  UR3: [],
} as const satisfies Record<string, readonly string[]>;

type PlayerCardId = keyof typeof PLAYER_PHRASES_BY_ID;

const ENEMY_ONE_PHRASES = [
  "I know... this is the path I chose.",
  "I see, then die....",
  "What about those who had no one? You hypocrite!",
] as const;

const ENEMY_PHRASES_BY_ID: Record<EnemyId, readonly string[]> = {
  1: ENEMY_ONE_PHRASES,
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
  7: [],
  8: [],
  9: [],
  10: [],
  11: [],
  12: [],
  13: [],
};

function isPlayerCardId(value: string): value is PlayerCardId {
  return value in PLAYER_PHRASES_BY_ID;
}

function getPlayerPhrases(card: Card | null): readonly string[] {
  if (!card || !isPlayerCardId(card.name)) return [];
  return PLAYER_PHRASES_BY_ID[card.name];
}

function getEnemyPhrases(enemy: BattleEnemy | null): readonly string[] {
  if (!enemy) return [];
  return ENEMY_PHRASES_BY_ID[enemy.id];
}

function getPlayerIconPath(card: Card | null) {
  if (!card || !isPlayerCardId(card.name)) return undefined;
  return `${ICON_BASE}/${card.name}.png`;
}

function getEnemyIconPath(enemy: BattleEnemy | null) {
  if (!enemy) return undefined;
  return `${ICON_BASE}/enemy${enemy.id}.png`;
}

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

function pickApprovedLine(subjectKey: string, phrases: readonly string[]) {
  if (phrases.length === 0) return "";
  if (phrases.length === 1) return phrases[0];

  const previous = lastPhraseBySubject.get(subjectKey);
  const available = phrases.filter((phrase) => phrase !== previous);
  const line = available[Math.floor(Math.random() * available.length)];

  lastPhraseBySubject.set(subjectKey, line);
  return line;
}

function getPlayerLine(card: Card | null) {
  return pickApprovedLine(
    `player:${card?.name ?? "unknown"}`,
    getPlayerPhrases(card)
  );
}

function getEnemyLine(enemy: BattleEnemy | null) {
  return pickApprovedLine(
    `enemy:${enemy?.id ?? "unknown"}`,
    getEnemyPhrases(enemy)
  );
}

function toPlayerSubject(card: Card | null): AttackFakeoutInsertSubject {
  const naming = getPlayerCharacterName(card);

  return {
    name: naming.label,
    code: naming.code,
    displayName: naming.displayName,
    image: card?.image ?? PLAYER_CARD_BACK_IMAGE,
    iconImage: getPlayerIconPath(card),
    rarity: card?.rarity,
    kind: "player",
  };
}

function toEnemySubject(
  enemy: BattleEnemy | null
): AttackFakeoutInsertSubject {
  const naming = getEnemyCharacterName(enemy);

  return {
    name: naming.label,
    code: naming.code,
    displayName: naming.displayName,
    image: enemy?.image ?? PLAYER_CARD_BACK_IMAGE,
    iconImage: getEnemyIconPath(enemy),
    kind: "enemy",
  };
}

export function showPlayerAttackFakeoutInsert(args: {
  card: Card | null;
  predeterminedSuccess: boolean;
}) {
  enqueueAttackFakeoutInsert({
    id: nextId,
    subject: toPlayerSubject(args.card),
    line: getPlayerLine(args.card),
    tone: getTone(args.predeterminedSuccess),
    side: "player",
  });
}

export function showEnemyAttackFakeoutInsert(args: {
  enemy: BattleEnemy | null;
  predeterminedSuccess: boolean;
}) {
  enqueueAttackFakeoutInsert({
    id: nextId,
    subject: toEnemySubject(args.enemy),
    line: getEnemyLine(args.enemy),
    tone: getTone(args.predeterminedSuccess),
    side: "enemy",
  });
}

function enqueueAttackFakeoutInsert(item: AttackFakeoutInsertItem) {
  nextId += 1;

  if (state.phase === "exiting") return;

  if (state.inserts.length < 2) {
    state = {
      inserts: [...state.inserts, item],
      phase: "idle",
    };
    playSfx("textInsertFakeout");
    notify();
    return;
  }

  if (scrollTimer) clearTimeout(scrollTimer);

  const survivingInsert = state.inserts[1];
  state = {
    inserts: state.inserts,
    phase: "scrolling",
  };
  notify();

  scrollTimer = setTimeout(() => {
    scrollTimer = null;
    state = {
      inserts: [survivingInsert, item],
      phase: "idle",
    };
    playSfx("textInsertFakeout");
    notify();
  }, HISTORY_SCROLL_MS);
}

export function clearAttackFakeoutInserts() {
  if (scrollTimer) {
    clearTimeout(scrollTimer);
    scrollTimer = null;
  }
  if (exitTimer) {
    clearTimeout(exitTimer);
    exitTimer = null;
  }

  state = {
    inserts: [],
    phase: "idle",
  };
  lastPhraseBySubject.clear();
  notify();
}

export function exitAttackFakeoutInserts(onCleared: () => void) {
  if (scrollTimer) {
    clearTimeout(scrollTimer);
    scrollTimer = null;
  }

  if (state.inserts.length === 0) {
    onCleared();
    return;
  }

  if (exitTimer) clearTimeout(exitTimer);
  state = {
    inserts: state.inserts,
    phase: "exiting",
  };
  notify();

  exitTimer = setTimeout(() => {
    exitTimer = null;
    state = {
      inserts: [],
      phase: "idle",
    };
    lastPhraseBySubject.clear();
    notify();
    onCleared();
  }, GROUP_EXIT_MS);
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
