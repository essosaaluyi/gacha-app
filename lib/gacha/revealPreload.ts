const primaryRevealVideos = ["/videos/standard.mp4", "/videos/standard2.mp4"];

const secondaryRevealVideos = [
  "/videos/SSR.mp4",
  "/videos/gacha-reveal-UR1.mp4",
  "/videos/gacha-reveal-UR2.mp4",
  "/videos/freeze.mp4",
];

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

  primaryRevealVideos.forEach(preloadVideo);

  scheduleIdle(() => {
    secondaryRevealVideos.forEach(preloadVideo);
  }, 2200);
}
