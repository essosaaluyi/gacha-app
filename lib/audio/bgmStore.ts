let audio: HTMLAudioElement | null = null;

const BGM_TRACK = "/audio/BGM07228.mp3";

export function getBgmAudio() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audio) {
    audio = new Audio(BGM_TRACK);

    // Looping: the track is a few minutes long, so with loop off it simply
    // ended mid-run -- usually around the bonus, which is why the machine went
    // silent for every round after it and never came back. The BGM is meant to
    // run for the whole session, so it repeats.
    audio.loop = true;
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

export function stopBgm() {
  const bgm = getBgmAudio();
  if (!bgm) return;

  bgm.pause();
  bgm.currentTime = 0;
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

