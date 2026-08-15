import { setBattlePresentationPhase } from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import { playSfx } from "@/lib/audio/sfxStore";

let visible = false;

let roundText = "";
let enemyName = "";
let attackCount = 0;
let roundImage = "";

let listeners: (() => void)[] = [];

export function showRoundInsert(
  round: string,
  enemy: string,
  ac: number,
  image = ""
) {
  setBattlePresentationPhase("round_intro", `round-intro:${round}`);
  visible = true;
  roundText = round;
  enemyName = enemy;
  attackCount = ac;
  roundImage = image;

  // The round banner is now on screen -- fire its cue at that first moment.
  playSfx("roundInsert");

  listeners.forEach((listener) => listener());
}

export function hideRoundInsert() {
  if (!visible) return;
  visible = false;

  setBattlePresentationPhase("next_round_ready", "round-intro-complete");

  listeners.forEach((listener) => listener());
}

export function getRoundInsertState() {
  return {
    visible,
    roundText,
    enemyName,
    attackCount,
    roundImage,
  };
}

export function subscribeRoundInsert(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
