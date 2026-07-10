let audio: HTMLAudioElement | null = null;

const trackIndex = 0;

const tracks = [
  "/audio/BGM1.mp3",
  "/audio/BGM2.mp3",
];

export function getBgmAudio() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audio) {
    audio = new Audio(tracks[trackIndex]);

    audio.loop = false;
    audio.volume = 0.5;
  }

  return audio;
}

export function playBgm() {
  const bgm = getBgmAudio();
  if (!bgm) return;

  bgm.play();
}

export function pauseBgm() {
  const bgm = getBgmAudio();
  if (!bgm) return;

  bgm.pause();
}

export function setBgmMuted(muted: boolean) {
  const bgm = getBgmAudio();
  if (!bgm) return;

  bgm.muted = muted;
}

export function setBgmVolume(volume: number) {
  const bgm = getBgmAudio();
  if (!bgm) return;

  bgm.volume = Math.max(0, Math.min(1, volume));
}

export function getBgmMuted() {
  const bgm = getBgmAudio();
  return bgm ? bgm.muted : false;
}

export function getBgmVolume() {
  const bgm = getBgmAudio();
  return bgm ? bgm.volume : 0.5;
}

