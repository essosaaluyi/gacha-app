import { playPresentation } from "./presentationSystem";

export function playCardRevealPresentation(
  symbol: string
) {
  switch (symbol) {
    case "Attack":
      playPresentation("card_flip_attack");
      break;

    case "Defense":
      playPresentation("card_flip_defense");
      break;

    case "Coin":
      playPresentation("card_flip_coin");
      break;

    case "Reply":
      playPresentation("card_flip_reply");
      break;

    case "Bar":
      playPresentation("card_flip_bar");
      break;

    case "Chance":
      playPresentation("card_flip_chance");
      break;

    default:
      playPresentation("card_flip_empty");
  }
}