"use client";

type Props = {
  isRevealing: boolean;
  revealVideo: string;
  freezeActive: boolean;
  freezeTriggered: boolean;
  freezeTime: number | null;
  mainRevealStopped: boolean;

  setFreezeTriggered: (value: boolean) => void;
  setFreezeActive: (value: boolean) => void;
  setMainRevealStopped: (value: boolean) => void;

  finishReveal: () => void;
};

export default function RevealPlayer({
  isRevealing,
  revealVideo,
  freezeActive,
  freezeTriggered,
  freezeTime,
  mainRevealStopped,
  setFreezeTriggered,
  setFreezeActive,
  setMainRevealStopped,
  finishReveal,
}: Props) {
  if (!isRevealing) return null;

  return (
    <div className="mb-8 relative">
      {!mainRevealStopped && (
        <video
          key={revealVideo}
          src={revealVideo}
          autoPlay
          playsInline
          onTimeUpdate={(e) => {
            const current = e.currentTarget.currentTime;

            if (
              freezeTime !== null &&
              !freezeTriggered &&
              current >= freezeTime
            ) {
              setFreezeTriggered(true);
              setMainRevealStopped(true);
              setFreezeActive(true);
            }
          }}
          onEnded={finishReveal}
          className="w-full h-[70vh] md:h-auto object-cover rounded-2xl mb-4"
        />
      )}

      {freezeActive && (
        <video
          src="/videos/freeze.mp4"
          autoPlay
          playsInline
          onEnded={finishReveal}
          className="w-full h-[70vh] md:h-auto object-cover rounded-2xl mb-4"
        />
      )}

      <button
        onClick={finishReveal}
        className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl font-semibold"
      >
        Skip Reveal
      </button>
    </div>
  );
}