// One-shot battle sound effects, played through Web Audio.
//
// The source clips are mastered at wildly different levels — some peak near
// 1.0 while others peak around 0.05 — so playing them raw made half the cabinet
// inaudible under the BGM. An <audio> element cannot fix that, because its
// volume only attenuates (caps at 1.0). Web Audio can apply gain above 1.0, so
// every clip is peak-normalised on load and the mix stays even no matter how
// the artwork was exported.

import {
  getBattleMode,
  type BattleMode,
} from "@/lib/battle-pixi/state/battleModeStore";

const SFX = {
  // Attack card lands on the target slot.
  attackOnTarget: "/audio/se/attack-card-ontarget.mp3",
  // Draw button pressed (every press).
  buttonPush: "/audio/se/button-push-se.mp3",
  // A card flips to reveal its symbol (0725 batch replacement).
  cardReveal: "/audio/se/characard-reveal-se.mp3",
  // Cards are set out to the disk exit gate (first draw press).
  cardSetToDisk: "/audio/se/card-set-to-disk.mp3",
  // A card settles / lands on the table.
  cardPlaced: "/audio/se/car-flip-placed.mp3",
  // A bonus point-reveal video starts playing (0801).
  chestOpenPoint: "/audio/se/chest-open-point.mp3",
  // The interruption cut-in slashes open (0801).
  cutIn: "/audio/se/cut-in-se.mp3",
  // A card leaves the table (played once per card, rapid-fire).
  discard: "/audio/se/discard.mp3",
  // The player fatal-mode opening insert takes the screen (0806).
  fatalModeInsert: "/audio/se/fatalmode-insert-se.mp3",
  // Bonus opening videos, one per grade (0806). Kept as SEs rather than baked
  // into the mp4s so they go through the same normalisation as every other cue.
  bonusRegularOpen: "/audio/se/bonus-regular-open-se.mp3",
  bonusSuperOpen: "/audio/se/bonus-super-open-se.mp3",
  // The freeze cuts into a bonus opening and promotes it to super max (0806).
  freeze: "/audio/se/freeze-se.mp3",
  // Full-screen battle opening, before the first round insert (0806).
  battleOpening: "/audio/se/battle-opening-se.mp3",
  // Cards are released from the disk out to the table (second draw press).
  drawCard: "/audio/se/draw-card.wav",
  // The revealed combination is a Reply.
  reply: "/audio/se/reply-se.mp3",
  // The round-insert banner appears on screen.
  roundInsert: "/audio/se/Round-insert-se.wav",
  // Chance predetermined on this draw (60% chance to fire at the press).
  chanceUpDraw: "/audio/se/chance-up-draw.mp3",
  // The revealed combination is Coin (fires with the last flip, like Reply).
  coinCard: "/audio/se/coin-card.mp3",
  // A Chance symbol settles onto the table (0728).
  chanceCardLand: "/audio/se/chance-card-land.mp3",
  // The chance icon overlay appears over the cards (0728).
  chanceIcon: "/audio/se/chance-icon-se.mp3",
  // The normal-battle chance reward is revealed.
  pointsGained: "/audio/se/points-gained.mp3",
  // The stage-name title insert appears.
  stageName: "/audio/se/stage-name-se.mp3",
  // The table cards run the celebratory shine sweep.
  tableShine: "/audio/se/table-shine.mp3",
  // An attack-fakeout text insert appears.
  textInsertFakeout: "/audio/se/text-insert-f-se.mp3",
  // Predetermined enemy-defeat tease (25% chance at the press).
  vibration: "/audio/se/vibration.mp3",
  // Temporary BAR CHANCE mix placeholders. Dedicated production clips will
  // replace these paths without changing the reveal choreography.
  barImpact: "/audio/se/vibration.mp3",
  barFailure: "/audio/se/vibration.mp3",
} as const;

export type SfxName = keyof typeof SFX;

// Which sections of the machine each cue may sound in. Exactly one section owns
// the screen and the sound channel at a time, so a cue is dropped rather than
// layered on top of another section's audio when its owner is not active.
//
// The card cues are listed for both battle and bonus on purpose: a bonus hand
// runs the same draw/flip mechanics, so restricting them to battle would mute
// the bonus round. What none of them may do is sound during the pick zone,
// which has its own audio in presentation/collectionSfx.
//
// Cues left out of this map are section-agnostic (UI chrome, the interruption
// cut-in) and always play.
const BATTLE_AND_BONUS: BattleMode[] = ["battle", "bonus"];

const SFX_OWNERS: Partial<Record<SfxName, BattleMode[]>> = {
  attackOnTarget: BATTLE_AND_BONUS,
  cardReveal: BATTLE_AND_BONUS,
  cardSetToDisk: BATTLE_AND_BONUS,
  cardPlaced: BATTLE_AND_BONUS,
  chanceCardLand: BATTLE_AND_BONUS,
  chanceIcon: BATTLE_AND_BONUS,
  chanceUpDraw: BATTLE_AND_BONUS,
  coinCard: BATTLE_AND_BONUS,
  discard: BATTLE_AND_BONUS,
  drawCard: BATTLE_AND_BONUS,
  reply: BATTLE_AND_BONUS,
  tableShine: BATTLE_AND_BONUS,
  // Base-game-only beats: these narrate the battle scene itself.
  fatalModeInsert: ["battle"],
  pointsGained: ["battle"],
  roundInsert: ["battle"],
  stageName: ["battle"],
  textInsertFakeout: ["battle"],
  vibration: ["battle"],
  barImpact: BATTLE_AND_BONUS,
  barFailure: BATTLE_AND_BONUS,
  // Bonus-only. The openings and the freeze all sound after the machine has
  // already been handed to the bonus, so they belong to that section.
  chestOpenPoint: ["bonus"],
  bonusRegularOpen: ["bonus"],
  bonusSuperOpen: ["bonus"],
  freeze: ["bonus"],
  // battleOpening is deliberately absent: it plays before the run starts, when
  // no section owns the machine yet.
};

// Some source clips ship with lead-in silence; start playback past it so the
// cue lands on time instead of feeling late (measured from the actual files).
const SFX_START_OFFSET_S: Partial<Record<SfxName, number>> = {
  cardSetToDisk: 0.3, // ~314ms of leading silence
  reply: 0.7, // ~714ms of leading silence
};

// Per-cue mix trim applied on top of normalisation, for cues that should sit
// deliberately forward or back in the mix. 1 = normalised level.
const SFX_MIX: Partial<Record<SfxName, number>> = {
  // Fires three times in quick succession as the hand clears.
  discard: 0.7,
};

// Every clip is scaled so its loudest sample hits this, then trimmed by
// SFX_MIX. The cap stops a near-silent file from having its noise floor
// amplified into a hiss.
const TARGET_PEAK = 0.9;
const MAX_NORMALISE_GAIN = 24;

type LoadedClip = {
  buffer: AudioBuffer;
  /** Peak-normalisation factor, computed from the decoded samples. */
  gain: number;
};

// The audio graph and decoded clips are cached on globalThis, not in module
// scope. In dev, editing any file in this module's chunk re-evaluates it, which
// would otherwise null out `context` and build a brand new AudioContext. A new
// context starts SUSPENDED and needs a fresh user gesture, so every cue went
// silent after an edit until the next click — and the whole clip cache had to
// re-decode. Surviving hot reloads keeps sound working across edits.
type SfxRuntime = {
  context: AudioContext | null;
  masterGain: GainNode | null;
  clips: Map<SfxName, LoadedClip>;
  pending: Map<SfxName, Promise<LoadedClip | null>>;
  gestureBound: boolean;
};

const runtime: SfxRuntime = ((
  globalThis as typeof globalThis & { __battleSfxRuntime?: SfxRuntime }
).__battleSfxRuntime ??= {
  context: null,
  masterGain: null,
  clips: new Map(),
  pending: new Map(),
  gestureBound: false,
});

const clips = runtime.clips;
const pending = runtime.pending;

let muted = false;
let masterVolume = 0.8;

/**
 * Any real interaction resumes audio, not just the draw button. Browsers only
 * allow a suspended context to resume inside a trusted gesture, so binding this
 * once globally means a stray click anywhere is enough to recover.
 */
function bindGestureResume() {
  if (runtime.gestureBound || typeof window === "undefined") return;
  runtime.gestureBound = true;

  const resume = () => {
    const ctx = runtime.context;
    if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
  };

  window.addEventListener("pointerdown", resume, { capture: true });
  window.addEventListener("keydown", resume, { capture: true });
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (runtime.context) return runtime.context;

  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!Ctor) return null;

  const ctx = new Ctor();
  const gain = ctx.createGain();
  gain.gain.value = masterVolume;
  gain.connect(ctx.destination);

  runtime.context = ctx;
  runtime.masterGain = gain;
  bindGestureResume();

  return ctx;
}

/** Loudest absolute sample across all channels. */
function peakOf(buffer: AudioBuffer) {
  let peak = 0;

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);

    for (let i = 0; i < samples.length; i += 1) {
      const value = Math.abs(samples[i]);
      if (value > peak) peak = value;
    }
  }

  return peak;
}

function loadClip(name: SfxName): Promise<LoadedClip | null> {
  const loaded = clips.get(name);
  if (loaded) return Promise.resolve(loaded);

  const inFlight = pending.get(name);
  if (inFlight) return inFlight;

  const ctx = getContext();
  if (!ctx) return Promise.resolve(null);

  const request = fetch(SFX[name])
    .then((response) => response.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      const peak = peakOf(buffer);
      const gain =
        peak > 0
          ? Math.min(MAX_NORMALISE_GAIN, TARGET_PEAK / peak)
          : 1;

      const clip: LoadedClip = { buffer, gain };
      clips.set(name, clip);
      pending.delete(name);
      return clip;
    })
    .catch(() => {
      pending.delete(name);
      return null;
    });

  pending.set(name, request);
  return request;
}

type PlayOptions = {
  volume?: number;
  /**
   * Bypass section isolation. Only for audition tools (the cut-in workstation),
   * which need to hear a cue outside the section that owns it. Never set this
   * from gameplay code — it is exactly the bleed the gating exists to stop.
   */
  force?: boolean;
};

function start(clip: LoadedClip, name: SfxName, options: PlayOptions) {
  const ctx = getContext();
  if (!ctx || !runtime.masterGain || muted) return;

  const source = ctx.createBufferSource();
  source.buffer = clip.buffer;

  const gain = ctx.createGain();
  gain.gain.value =
    clip.gain * (SFX_MIX[name] ?? 1) * Math.max(0, options.volume ?? 1);

  source.connect(gain);
  gain.connect(runtime.masterGain);

  const offset = SFX_START_OFFSET_S[name] ?? 0;
  source.start(0, Math.min(offset, clip.buffer.duration));
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
}

/** Play a one-shot effect. Safe to call from any client trigger. */
export function playSfx(name: SfxName, options: PlayOptions = {}): void {
  if (typeof window === "undefined" || muted) return;

  // Section isolation: drop cues that do not belong to whichever section owns
  // the machine right now, so audio from one part cannot bleed into another.
  const owners = SFX_OWNERS[name];
  if (!options.force && owners && !owners.includes(getBattleMode())) return;

  const ctx = getContext();
  if (!ctx) return;

  // A suspended context swallows everything silently. Rather than drop the cue,
  // resume and play it the moment the context is running again.
  const play = (clip: LoadedClip) => {
    if (ctx.state === "suspended") {
      void ctx
        .resume()
        .then(() => start(clip, name, options))
        .catch(() => {});
      return;
    }

    start(clip, name, options);
  };

  // A cue triggered before its clip finished decoding still fires, just as
  // soon as it is ready — preloadSfx on mount keeps that path rare.
  const loaded = clips.get(name);

  if (loaded) {
    play(loaded);
    return;
  }

  void loadClip(name).then((clip) => {
    if (clip) play(clip);
  });
}

/**
 * Dedicated Triple Chance surge. This is synthesized instead of borrowing a
 * card or jackpot clip: layered filtered noise gives the frame a broad power
 * rush while the short descending oscillators add the heavy electrical body.
 */
export function playTripleChanceSurgeSfx(): void {
  if (!BATTLE_AND_BONUS.includes(getBattleMode())) return;

  const ctx = getContext();
  const destination = runtime.masterGain;
  if (!ctx || !destination || muted) return;

  if (ctx.state === "suspended") void ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const duration = 1;
  const output = ctx.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.78, now + 0.025);
  output.gain.exponentialRampToValueAtTime(0.34, now + 0.38);
  output.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  output.connect(destination);

  const noiseBuffer = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * duration),
    ctx.sampleRate
  );
  const noise = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noise.length; index += 1) {
    const envelope = 1 - index / noise.length;
    noise[index] = (Math.random() * 2 - 1) * (0.42 + envelope * 0.58);
  }

  const noiseSource = ctx.createBufferSource();
  const noiseFilter = ctx.createBiquadFilter();
  noiseSource.buffer = noiseBuffer;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(2200, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(420, now + duration);
  noiseFilter.Q.value = 0.7;
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(output);
  noiseSource.start(now);
  noiseSource.stop(now + duration);

  [96, 148, 236].forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = index === 0 ? "sawtooth" : "square";
    oscillator.frequency.setValueAtTime(frequency * 1.8, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 0.62,
      now + 0.62
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16 / (index + 1), now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(now);
    oscillator.stop(now + 0.74);
  });
}

/** Resume the audio context during a real user gesture. */
export function unlockSfx(): void {
  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

/** Fire the same clip `times` times spaced `gapMs` apart (e.g. rapid discards). */
export function playSfxSequence(
  name: SfxName,
  times: number,
  gapMs: number,
  options: PlayOptions = {}
): void {
  if (typeof window === "undefined") return;

  for (let i = 0; i < times; i += 1) {
    window.setTimeout(() => playSfx(name, options), i * gapMs);
  }
}

/** Decode every effect up front (call once when the battle mounts). */
export function preloadSfx(): void {
  (Object.keys(SFX) as SfxName[]).forEach((name) => {
    void loadClip(name);
  });
}

export function setSfxMuted(value: boolean): void {
  muted = value;
}

export function getSfxMuted(): boolean {
  return muted;
}

export function setSfxMasterVolume(volume: number): void {
  masterVolume = Math.max(0, Math.min(1, volume));
  if (runtime.masterGain) runtime.masterGain.gain.value = masterVolume;
}
