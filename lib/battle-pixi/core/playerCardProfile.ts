import type { Card } from "@/lib/gacha/pullLogic";
import { playerCardProfiles } from "@/lib/game-config/generated";

export type PlayerCardProfile = {
  title: string;
  abilityName: string;
  abilityText: string;
  lifeValue: number;
  cutInLevel: "normal" | "rare" | "epic" | "legend";
};

const rarityProfiles = playerCardProfiles as Record<string, PlayerCardProfile>;

export function getPlayerCardProfile(card: Card | null): PlayerCardProfile {
  if (!card) {
    return {
      title: "No Fighter",
      abilityName: "No Card",
      abilityText: "Pull cards to create a battle deck.",
      lifeValue: 0,
      cutInLevel: "normal",
    };
  }

  return rarityProfiles[card.rarity] ?? rarityProfiles.R;
}
