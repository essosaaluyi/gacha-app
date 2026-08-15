import { setBattlePresentationPhase } from "@/lib/battle-pixi/state/battlePresentationFlowStore";
import type { BonusType } from "@/lib/battle-pixi/core/bonusTypeLottery";
import { playSfx } from "@/lib/audio/sfxStore";

let bonusOverlayVisible = false;
let bonusOpeningVisible = false;
let pendingRevealVideo = "";
let activeRevealVideo = "";
let revealKey = 0;

let listeners: (() => void)[] = [];

let bonusResultVisible = false;
let bonusResultPoints = 0;

let pendingResultAfterVideo = false;
let pendingResultPoints = 0;

let bonusGameText = "";

function notify() {
  listeners.forEach((listener) => listener());
}
export function setBonusGameText(text: string) {
  bonusGameText = text;
  notify();
}


export function queueBonusResultAfterReveal(points: number) {
  pendingResultAfterVideo = true;
  pendingResultPoints = points;
  notify();
}

export function showQueuedBonusResult() {
  if (!pendingResultAfterVideo) return false;

  bonusOverlayVisible = true;
  bonusOpeningVisible = false;
  activeRevealVideo = "";
  pendingRevealVideo = "";
  bonusResultVisible = true;
  bonusResultPoints = pendingResultPoints;

  pendingResultAfterVideo = false;
  pendingResultPoints = 0;

  setBattlePresentationPhase("bonus_result", "bonus-result");
  notify();
  return true;
}

export function showBonusResult(points: number) {
  bonusOverlayVisible = true;
  bonusOpeningVisible = false;
  activeRevealVideo = "";
  pendingRevealVideo = "";
  bonusResultVisible = true;
  bonusResultPoints = points;
  setBattlePresentationPhase("bonus_result", "bonus-result");
  notify();
}

export function hideBonusResult() {
  bonusResultVisible = false;
  bonusResultPoints = 0;
  notify();
}

// Nothing about the bonus takes the screen at the moment it is won or at the
// moment DRAW is pressed. Both the opening video and the bonus background are
// ARMED, then fire together as the cards actually come out of the deck -- so
// the battle scene stays up until the deal it is replaced by.
//
// Without this the screen flipped to the bonus background on the press before
// the deal, and the opening played straight off the defeat flip, on a turn the
// player had not started.
let bonusOpeningArmed = false;
let bonusBackgroundArmed = false;

// ── Bonus opening sequence ─────────────────────────────────────────────────
//
// The grade decides which opening plays. superMax is not simply "a third
// video": it is delivered as a FREEZE — a regular or super opening starts
// normally, the freeze cuts into it partway through, and the super-max opening
// follows. That is the whole point of the beat, so the stage is tracked here
// rather than being three unrelated clips.

export const BONUS_OPENING_VIDEOS: Record<BonusType, string> = {
  regular: "/videos/openings/bonus-regular.mp4",
  super: "/videos/openings/bonus-super.mp4",
  // Not delivered yet. Until it lands the freeze still plays and the bonus
  // still runs as a nested loop; only this clip is missing.
  superMax: "/videos/openings/bonus-super-max.mp4",
};

export const BONUS_FREEZE_VIDEO = "/videos/openings/freeze.mp4";

export type BonusOpeningStage = "main" | "freeze" | "max";

let bonusOpeningType: BonusType = "regular";
// Which clip actually starts playing. For regular and super that is their own
// opening; for super max it is whichever of the two the freeze will cut into,
// since super max is never announced up front — the freeze is the reveal.
let bonusOpeningCover: "regular" | "super" = "regular";
let bonusOpeningStage: BonusOpeningStage = "main";

export function getBonusOpeningType() {
  return bonusOpeningType;
}

/** The clip on screen right now, for whichever stage the sequence is at. */
export function getBonusOpeningVideo() {
  if (bonusOpeningStage === "freeze") return BONUS_FREEZE_VIDEO;
  if (bonusOpeningStage === "max") return BONUS_OPENING_VIDEOS.superMax;

  return BONUS_OPENING_VIDEOS[bonusOpeningCover];
}

export function armBonusOpening(type: BonusType) {
  bonusOpeningArmed = true;
  bonusOpeningType = type;
  bonusOpeningStage = "main";
  bonusOpeningCover =
    type === "superMax"
      ? // The spec allows the freeze out of either opening, so the cover is
        // rolled on the same 6:3 shape the grades themselves use.
        Math.random() < 6 / 9
        ? "regular"
        : "super"
      : type;
  notify();
}

/** The freeze cuts in over the running opening. */
export function enterBonusFreeze() {
  if (!bonusOpeningVisible || bonusOpeningStage !== "main") return;

  bonusOpeningStage = "freeze";
  playSfx("freeze");
  notify();
}

/** Freeze finished: the super-max opening takes over. */
export function enterBonusOpeningMax() {
  if (bonusOpeningStage !== "freeze") return;

  bonusOpeningStage = "max";
  notify();
}

export function armBonusBackground() {
  bonusBackgroundArmed = true;
  notify();
}

export function isBonusOpeningArmed() {
  return bonusOpeningArmed;
}

/**
 * Hands the screen to the bonus, exactly once, at the deal. The opening wins
 * when both are armed -- it shows the background itself.
 * Returns false when nothing was waiting.
 */
export function consumeArmedBonusPresentation() {
  if (bonusOpeningArmed) {
    bonusOpeningArmed = false;
    bonusBackgroundArmed = false;
    showBonusOpening();
    return true;
  }

  if (bonusBackgroundArmed) {
    bonusBackgroundArmed = false;
    showBonusStaticBackground();
    return true;
  }

  return false;
}

export function showBonusOpening() {
  setBattlePresentationPhase("bonus_video", "bonus-opening-video");
  bonusOverlayVisible = true;
  bonusOpeningVisible = true;
  bonusOpeningStage = "main";
  pendingRevealVideo = "";
  activeRevealVideo = "";

  // Cue matches the clip actually playing, not the grade -- a super max opens
  // on its cover clip and must sound like that clip until the freeze hits.
  playSfx(
    bonusOpeningCover === "regular" ? "bonusRegularOpen" : "bonusSuperOpen"
  );

  notify();
}

export function finishBonusOpeningPresentation() {
  bonusOpeningVisible = false;
  setBattlePresentationPhase("next_round_ready", "bonus-opening-complete");
  notify();
}

export function hideBonusOpening() {
  bonusOpeningVisible = false;
  notify();
}

export function setPendingBonusRevealVideo(videoPath: string) {
  pendingRevealVideo = videoPath;
  notify();
}

export function playPendingBonusRevealVideo() {
  if (!pendingRevealVideo) return false;

  // No points-gain cue here: that fanfare belongs to the normal-battle chance
  // reward only. Bonus reward videos carry their own audio.
  setBattlePresentationPhase("bonus_video", "bonus-reveal-video");
  bonusOverlayVisible = true;
  bonusOpeningVisible = false;
  activeRevealVideo = "";
  revealKey += 1;

  setTimeout(() => {
    activeRevealVideo = pendingRevealVideo;
    pendingRevealVideo = "";
    notify();
  }, 0);

  notify();
  return true;
}

export function finishActiveBonusRevealVideo() {
  if (pendingResultAfterVideo) {
    showQueuedBonusResult();
    return;
  }

  activeRevealVideo = "";
  setBattlePresentationPhase("next_round_ready", "bonus-reveal-complete");
  notify();
}

export function hideBonusRevealVideo() {
  activeRevealVideo = "";
  notify();
}

export function hideBonusOverlay() {
  bonusOverlayVisible = false;
  bonusOpeningVisible = false;
  bonusOpeningArmed = false;
  bonusBackgroundArmed = false;
  pendingRevealVideo = "";
  activeRevealVideo = "";
  revealKey = 0;

  bonusResultVisible = false;
  bonusResultPoints = 0;

  pendingResultAfterVideo = false;
  pendingResultPoints = 0;

  bonusGameText = "";

  notify();
}

export function getBonusPresentationState() {
  return {
    bonusOverlayVisible,
    bonusOpeningVisible,
    pendingRevealVideo,
    activeRevealVideo,
    revealKey,
    bonusResultVisible,
    bonusResultPoints,
    pendingResultAfterVideo,
    bonusGameText,
    bonusOpeningType,
    bonusOpeningStage,
  };
}

export function subscribeBonusPresentation(listener: () => void) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function showBonusStaticBackground() {
  bonusOverlayVisible = true;
  bonusOpeningVisible = false;
  activeRevealVideo = "";
  notify();
}
