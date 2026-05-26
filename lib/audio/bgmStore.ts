let audio: HTMLAudioElement | null = null;

let trackIndex = 0;

const tracks = [
  "/audio/BGM1.mp3",
  "/audio/BGM2.mp3",
];

export function getBgmAudio() {
  if (!audio) {
    audio = new Audio(tracks[trackIndex]);

    audio.loop = false;
    audio.volume = 0.5;

    audio.addEventListener("ended", () => {
      trackIndex = (trackIndex + 1) % tracks.length;

      if (audio) {
        audio.src = tracks[trackIndex];
        audio.play();
      }
    });
  }

  return audio;
}

export async function playBgm() {
  const bgm = getBgmAudio();
  await bgm.play();
}

export function pauseBgm() {
  getBgmAudio().pause();
}

export function setBgmMuted(muted: boolean) {
  getBgmAudio().muted = muted;
}

export function setBgmVolume(volume: number) {
  getBgmAudio().volume = volume;
}

export function getBgmVolume() {
  return getBgmAudio().volume;
}

export function getBgmMuted() {
  return getBgmAudio().muted;
}
