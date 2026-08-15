import { PresentationContext } from "./presentationContext";

export type PresentationEvent =
  | "draw_start"
  | "card_flip"
  | "card_flip_attack"
  | "card_flip_defense"
  | "card_flip_coin"
  | "card_flip_reply"
  | "card_flip_bar"
  | "card_flip_chance"
  | "card_flip_empty"
  | "chance_success"
  | "chance_fail"
  | "attack_success"
  | "attack_fail"
  | "fatal_success"
  | "fatal_fail"
  | "enemy_attack"
  | "last_stand_success"
  | "last_stand_fail";

export function playPresentation(event: PresentationEvent) {
  // Dev-only: this fires on every presentation beat, so it is noise in a
  // shipped build. Every other trace in the battle engine is behind a debug
  // gate; these last two were not.
  if (process.env.NODE_ENV !== "production") {
    console.log("Presentation:", event);
  }

  if (event === "draw_start") {
    const holder = PresentationContext.holder;

    if (!holder) return;

    holder.tint = 0xff4444;

    setTimeout(() => {
      holder.tint = 0xffffff;
    }, 300);
  }
}