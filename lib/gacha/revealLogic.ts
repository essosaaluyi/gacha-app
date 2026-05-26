import { supabase } from "@/lib/supabase";
import type { Card } from "@/lib/gacha/pullLogic";

export async function getSettingMap() {
  const { data } = await supabase
    .from("point_settings")
    .select("setting_key, setting_value");

  const map: Record<string, number> = {};

  (data || []).forEach((row) => {
    map[row.setting_key] = row.setting_value;
  });

  return map;
}

export function weightedPick(options: { video: string; weight: number }[]) {
  const validOptions = options.filter((item) => item.weight > 0);
  const total = validOptions.reduce((sum, item) => sum + item.weight, 0);

  if (total <= 0) return options[0].video;

  let rand = Math.random() * total;

  for (const item of validOptions) {
    rand -= item.weight;
    if (rand <= 0) return item.video;
  }

  return validOptions[0].video;
}

export async function chooseRevealVideo(results: Card[]) {
  const settings = await getSettingMap();

  const hasUR = results.some((card) => card.rarity === "UR");
  const hasSSR = results.some((card) => card.rarity === "SSR");

  const srOrHigherCount = results.filter((card) =>
    ["SR", "SSR", "UR"].includes(card.rarity)
  ).length;

  if (hasUR) {
    return weightedPick([
      { video: "/videos/standard.mp4", weight: settings.reveal_ur_standard ?? 20 },
      { video: "/videos/standard2.mp4", weight: settings.reveal_ur_standard2 ?? 15 },
      { video: "/videos/SSR.mp4", weight: settings.reveal_ur_ssr ?? 15 },
      { video: "/videos/gacha-reveal-UR1.mp4", weight: settings.reveal_ur_ur1 ?? 37 },
      { video: "/videos/gacha-reveal-UR2.mp4", weight: settings.reveal_ur_ur2 ?? 13 },
    ]);
  }

  if (hasSSR) {
    return weightedPick([
      { video: "/videos/standard.mp4", weight: settings.reveal_ssr_standard ?? 35 },
      { video: "/videos/standard2.mp4", weight: settings.reveal_ssr_standard2 ?? 25 },
      { video: "/videos/SSR.mp4", weight: settings.reveal_ssr_ssr ?? 40 },
    ]);
  }

  if (srOrHigherCount >= 3) {
    return weightedPick([
      { video: "/videos/standard.mp4", weight: settings.reveal_sr3_standard ?? 40 },
      { video: "/videos/standard2.mp4", weight: settings.reveal_sr3_standard2 ?? 60 },
    ]);
  }

  return weightedPick([
    { video: "/videos/standard.mp4", weight: settings.reveal_default_standard ?? 80 },
    { video: "/videos/standard2.mp4", weight: settings.reveal_default_standard2 ?? 20 },
  ]);
}

export async function getFreezeSettings() {
  const settings = await getSettingMap();

  return {
    freezeChance: settings.reveal_freeze_chance ?? 25,
  };
}