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
  R1: [
    "One, two, three — we're ready!",
    "Together we're not small anymore.",
    "Don't touch our brother!",
  ],
  R2: [
    "My scales don't break that easily.",
    "Come closer. I dare you.",
    "The forest fights with me.",
  ],
  R3: [
    "We ride first, we ask never.",
    "Hold on tight — this ends fast.",
    "You picked the wrong sky.",
  ],
  R4: [
    "My hands shake. My blade doesn't.",
    "I swore an oath. I keep it.",
    "I'm not the boy you fought before!",
  ],
  SR1: [
    "The dead run faster than you.",
    "I've already died once. Try again.",
    "Keep up — or stay buried.",
  ],
  SR2: [
    "Every scar on me was earned.",
    "Torn wings still burn the sky.",
    "Rage is all I have left. It's enough.",
  ],
  SR3: [
    "No badge. No mercy.",
    "Someone has to answer for this.",
    "The mask stays on. You don't.",
  ],
  SR4: [
    "You never heard me coming.",
    "The dark is mine. You're just in it.",
    "Blink. That's all it takes.",
  ],
  SSR1: [
    "The sky answers when I call.",
    "Kneel, or be struck down.",
    "This storm has a name. Mine.",
  ],
  SSR2: [
    "Blood remembers every debt.",
    "I don't stop bleeding. Neither will you.",
    "Red is the only color left.",
  ],
  SSR3: [
    "My reign did not end. It moved.",
    "Bow. The throne is still watching.",
    "Even death obeyed me once.",
  ],
  SSR4: [
    "One blade. One breath. One cut.",
    "I will not draw twice.",
    "Stand up. I'll end it properly.",
  ],
  UR1: [
    "Smile — this part goes quickly.",
    "I've counted every step you'll take.",
    "You should have run when you could.",
  ],
  UR2: [
    "The first hit is a greeting.",
    "You only felt one? Wait.",
    "Two strikes. No third needed.",
  ],
  UR3: [
    "They left me. I stayed sharp.",
    "Play with me. Just once more.",
    "I don't break. I was already broken.",
  ],
} as const satisfies Record<string, readonly string[]>;

type PlayerCardId = keyof typeof PLAYER_PHRASES_BY_ID;

const ENEMY_PHRASES_BY_ID: Record<EnemyId, readonly string[]> = {
  // Elias's three lines are the approved wording -- do not reword them.
  1: [
    "I know... this is the path I chose.",
    "I see, then die....",
    "What about those who had no one? You hypocrite!",
  ],
  2: [
    "I've walked here longer than you've lived.",
    "The rift is patient. I am not.",
    "Step through. I'll be waiting.",
  ],
  3: [
    "Your world was always my meal.",
    "Scream. The void enjoys it.",
    "Nothing you love survives me.",
  ],
  4: [
    "Kneel. It's the kindest option.",
    "A crown is taken, never given.",
    "You dare raise steel at me?",
  ],
  5: [
    "From up here, you're already prey.",
    "I only need one pass.",
    "The sky belongs to talons.",
  ],
  6: [
    "Don't bleed on the carpet.",
    "How dull. Entertain me properly.",
    "You're spoiling a lovely evening.",
  ],
  7: [
    "Target acquired. Line drawn.",
    "You crossed the red line.",
    "No witnesses. Nothing personal.",
  ],
  8: [
    "None shall pass this plate.",
    "I have guarded longer than you've breathed.",
    "Turn back. I will not ask twice.",
  ],
  9: [
    "My blade has no master now.",
    "Duty died. The blade did not.",
    "Ghosts don't miss.",
  ],
  10: [
    "Pick a hand. Both are lying.",
    "Oh, you're taking this seriously?",
    "The trick was letting you hope.",
  ],
  11: [
    "Stone remembers. Stone endures.",
    "Roots take everything, slowly.",
    "You are dust standing upright.",
  ],
  12: [
    "Judgment does not negotiate.",
    "Your sentence was written long ago.",
    "Kneel for the axe. It's cleaner.",
  ],
  13: [
    "My lantern shows the way out. Not for you.",
    "Walk into the light. Quietly.",
    "One lantern. One grave.",
  ],
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
