// Most draws without SR+ play standard.v2.mp4, so it is the only video warmed on
// page open. The other reveal videos are fetched once a pull has chosen one;
// warming all six on open downloaded about 95 MB before the player pressed anything.
const likelyRevealVideo = "/videos/standard.v2.mp4";
export const FREEZE_REVEAL_VIDEO = "/videos/freeze.mp4";

const preloadedVideos = new Map<string, HTMLVideoElement>();
const preloadLinks = new Set<string>();

function addPreloadLink(src: string) {
  if (preloadLinks.has(src)) return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "video";
  link.href = src;
  document.head.appendChild(link);
  preloadLinks.add(src);
}

function preloadVideo(src: string) {
  if (typeof window === "undefined" || preloadedVideos.has(src)) return;

  addPreloadLink(src);

  const video = document.createElement("video");
  video.src = src;
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.load();

  preloadedVideos.set(src, video);
}

function scheduleIdle(callback: () => void, timeout: number) {
  const idleWindow = window as Window & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number }
    ) => number;
  };

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(callback, { timeout });
    return;
  }

  globalThis.setTimeout(callback, Math.min(timeout, 1200));
}

export function preloadRevealVideos() {
  if (typeof window === "undefined") return;

  scheduleIdle(() => preloadVideo(likelyRevealVideo), 2200);
}

/** Start fetching the videos a pull has already chosen, before the player mounts. */
export function preloadChosenRevealVideos(video: string, withFreeze: boolean) {
  preloadVideo(video);
  if (withFreeze) preloadVideo(FREEZE_REVEAL_VIDEO);
}
