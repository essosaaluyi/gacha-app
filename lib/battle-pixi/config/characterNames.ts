// Single source of truth for how a fighter is named on screen.
//
// Two names exist for every fighter and both are worth showing:
//   code        — the roster id from game-config.xlsx ("R4", "Enemy 4"). Short,
//                 stable, and what the spreadsheet, admin page and logs use.
//   displayName — the character's actual name ("Young Knight"). What the
//                 player recognises.
//
// Before this module the two lived in different places: the code came from
// generated.ts and the display name from a map inside attackFakeoutInsertStore,
// so the same fighter was "Enemy 4" in the HUD and "Crimson Regent - Marcus"
// in the very next insert. Every surface now goes through here instead.
//
// Hand-editable on purpose: generated.ts is rebuilt from the spreadsheet and
// must never be edited, so the display names live beside the other hand-tuned
// values. Move them into game-config.xlsx whenever that column is added -- only
// the two records below would change.

import type { Card } from "@/lib/gacha/pullLogic";
import type { BattleEnemy, EnemyId } from "@/lib/battle-pixi/config/enemyConfig";

export const PLAYER_DISPLAY_NAMES: Record<string, string> = {
  R1: "Triplets Baby Dragon",
  R2: "Green Scale Dragon",
  R3: "Dragon Raider",
  R4: "Young Knight",
  SR1: "Necro Runner",
  SR2: "Red Torn Dragon",
  SR3: "Vigilante",
  SR4: "Night Crawler",
  SSR1: "Great Thunder Dragon",
  SSR2: "Blood Man",
  SSR3: "Ghost of Emperor",
  SSR4: "White Sword Man",
  UR1: "Mami",
  UR2: "Double Striker",
  UR3: "Abandoned Doll",
};

export const ENEMY_DISPLAY_NAMES: Record<EnemyId, string> = {
  1: "Mourning Talon - Elias",
  2: "Rift Stalker",
  3: "Voidscale Tyrant",
  4: "Crimson Regent - Marcus",
  5: "Skymaw Harrier",
  6: "Roseblood Noble - Julian",
  7: "Redline Assassin - Kira",
  8: "Moonplate Sentinel",
  9: "Ghostblade Ronin - Ren",
  10: "Velvet Trickster - Felix",
  11: "Ruinroot Titan",
  12: "Halo Executioner - Diana",
  13: "Lantern Ronin - Sora",
};

export type CharacterName = {
  /** Roster id, e.g. "R4" / "Enemy 4". */
  code: string;
  /** Character name, e.g. "Young Knight". Empty when none is authored. */
  displayName: string;
  /** Both, for surfaces that show one string: "Young Knight · R4". */
  label: string;
};

/**
 * Joins the two names. Collapses to a single one when the display name is
 * missing, or when the spreadsheet already carries the character name (so a
 * later rename there cannot produce "Young Knight · Young Knight").
 */
function toCharacterName(code: string, displayName: string): CharacterName {
  const label =
    !displayName || displayName === code ? code : `${displayName} · ${code}`;

  return { code, displayName, label };
}

export function getPlayerCharacterName(card: Card | null): CharacterName {
  if (!card) return toCharacterName("PLAYER", "");

  return toCharacterName(card.name, PLAYER_DISPLAY_NAMES[card.name] ?? "");
}

export function getEnemyCharacterName(
  enemy: BattleEnemy | null
): CharacterName {
  if (!enemy) return toCharacterName("ENEMY", "");

  return toCharacterName(enemy.name, ENEMY_DISPLAY_NAMES[enemy.id] ?? "");
}
