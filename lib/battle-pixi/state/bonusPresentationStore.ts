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
  if (!pendingResultAfterVideo) return;

  bonusOverlayVisible = true;
  bonusOpeningVisible = false;
  activeRevealVideo = "";
  pendingRevealVideo = "";
  bonusResultVisible = true;
  bonusResultPoints = pendingResultPoints;

  pendingResultAfterVideo = false;
  pendingResultPoints = 0;

  notify();
}

export function showBonusResult(points: number) {
  bonusOverlayVisible = true;
  bonusOpeningVisible = false;
  activeRevealVideo = "";
  pendingRevealVideo = "";
  bonusResultVisible = true;
  bonusResultPoints = points;
  notify();
}

export function hideBonusResult() {
  bonusResultVisible = false;
  bonusResultPoints = 0;
  notify();
}

export function showBonusOpening() {
  bonusOverlayVisible = true;
  bonusOpeningVisible = true;
  pendingRevealVideo = "";
  activeRevealVideo = "";
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
  if (!pendingRevealVideo) return;

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
}

export function hideBonusRevealVideo() {
  activeRevealVideo = "";
  notify();
}

export function hideBonusOverlay() {
  bonusOverlayVisible = false;
  bonusOpeningVisible = false;
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
    bonusGameText,
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