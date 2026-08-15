"use client";

import { useRef, useState } from "react";
import {
  enemyAttackFaceoffTransforms,
  playerAttackFaceoffTransforms,
} from "@/lib/battle-pixi/presentation/attackFaceoffTransforms";

const effectAssetBase =
  "/images/battle-scenes/attack-faceoffs/r4-vs-enemy1-closeup-layers";
const characterAssetBase =
  "/images/battle-scenes/attack-faceoffs/character-layers/edited";
const playerAsset = `${characterAssetBase}/player-R4-faceoff-alpha-1920x1080.png`;
const enemyAsset = `${characterAssetBase}/enemy1-faceoff-alpha-1920x1080.png`;

type CharacterKey = "player" | "enemy";
type TransformValue = {
  x: number;
  y: number;
  scale: number;
};

const initialTransforms: Record<CharacterKey, TransformValue> = {
  player: playerAttackFaceoffTransforms.R4,
  enemy: enemyAttackFaceoffTransforms[1],
};

export default function FaceoffPreviewPage() {
  const [runId, setRunId] = useState(0);
  const [isEditing, setIsEditing] = useState(true);
  const [playerTransform, setPlayerTransform] = useState(
    initialTransforms.player,
  );
  const [enemyTransform, setEnemyTransform] = useState(
    initialTransforms.enemy,
  );
  const [playerHistory, setPlayerHistory] = useState<TransformValue[]>([]);
  const [enemyHistory, setEnemyHistory] = useState<TransformValue[]>([]);
  const [copyStatus, setCopyStatus] = useState("Copy values");
  const editStart = useRef<Partial<Record<CharacterKey, TransformValue>>>({});

  const transforms = {
    player: playerTransform,
    enemy: enemyTransform,
  };

  function beginEdit(character: CharacterKey) {
    setIsEditing(true);
    if (!editStart.current[character]) {
      editStart.current[character] = { ...transforms[character] };
    }
  }

  function endEdit(character: CharacterKey) {
    const start = editStart.current[character];
    const current = transforms[character];

    if (
      start &&
      (start.x !== current.x ||
        start.y !== current.y ||
        start.scale !== current.scale)
    ) {
      if (character === "player") {
        setPlayerHistory((history) => [...history, start]);
      } else {
        setEnemyHistory((history) => [...history, start]);
      }
    }

    delete editStart.current[character];
  }

  function updateTransform(
    character: CharacterKey,
    field: keyof TransformValue,
    value: number,
  ) {
    const setter =
      character === "player" ? setPlayerTransform : setEnemyTransform;
    setter((current) => ({ ...current, [field]: value }));
  }

  function undoTransform(character: CharacterKey) {
    const history =
      character === "player" ? playerHistory : enemyHistory;
    const previous = history.at(-1);

    if (!previous) {
      return;
    }

    if (character === "player") {
      setPlayerTransform(previous);
      setPlayerHistory((items) => items.slice(0, -1));
    } else {
      setEnemyTransform(previous);
      setEnemyHistory((items) => items.slice(0, -1));
    }
  }

  function resetTransform(character: CharacterKey) {
    const current = transforms[character];
    const initial = initialTransforms[character];

    if (
      current.x === initial.x &&
      current.y === initial.y &&
      current.scale === initial.scale
    ) {
      return;
    }

    if (character === "player") {
      setPlayerHistory((history) => [...history, current]);
      setPlayerTransform(initial);
    } else {
      setEnemyHistory((history) => [...history, current]);
      setEnemyTransform(initial);
    }
  }

  function previewAnimation() {
    setIsEditing(false);
    setRunId((value) => value + 1);
  }

  async function copyValues() {
    const valueBlock = [
      "Face-off character transforms",
      `R4: x=${playerTransform.x.toFixed(1)}%, y=${playerTransform.y.toFixed(1)}%, scale=${playerTransform.scale.toFixed(2)}`,
      `Enemy1: x=${enemyTransform.x.toFixed(1)}%, y=${enemyTransform.y.toFixed(1)}%, scale=${enemyTransform.scale.toFixed(2)}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(valueBlock);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus("Copy values"), 1600);
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#05050b] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col items-center justify-center gap-4 px-4 py-6">
        <div
          key={runId}
          className={`faceoff-stage ${isEditing ? "is-editing" : ""}`}
          aria-label="R4 versus Enemy1 line-sweep face-off preview"
        >
          <div className="arena-bg" />
          <div className="speed-lines" />

          <div className="enemy-sweep">
            <div className="character-entry enemy-entry">
              <img
                className="character-image"
                src={enemyAsset}
                alt=""
                style={{
                  transform: `translate(${enemyTransform.x}%, ${enemyTransform.y}%) scale(${enemyTransform.scale})`,
                }}
              />
            </div>
          </div>

          <div className="player-sweep">
            <div className="character-entry player-entry">
              <img
                className="character-image"
                src={playerAsset}
                alt=""
                style={{
                  transform: `translate(${playerTransform.x}%, ${playerTransform.y}%) scale(${playerTransform.scale})`,
                }}
              />
            </div>
          </div>

          <div className="impact-divider">
            <span className="divider-aura" />
            <span className="divider-glow" />
            <span className="divider-core" />
          </div>

          <img
            className="particle-loop"
            src={`${effectAssetBase}/impact-particles-loop.webp`}
            alt=""
          />

          <div className="white-flash" />
          <div className="enemy-echo enemy-echo-a">
            <img
              className="character-image"
              src={enemyAsset}
              alt=""
              style={{
                transform: `translate(${enemyTransform.x}%, ${enemyTransform.y}%) scale(${enemyTransform.scale})`,
              }}
            />
          </div>
          <div className="enemy-echo enemy-echo-b">
            <img
              className="character-image"
              src={enemyAsset}
              alt=""
              style={{
                transform: `translate(${enemyTransform.x}%, ${enemyTransform.y}%) scale(${enemyTransform.scale})`,
              }}
            />
          </div>
          <div className="scanline" />
        </div>

        <div className="flex w-full max-w-[1100px] items-center justify-between gap-3 text-sm text-zinc-300">
          <p>
            Main battle-screen framing with one shared sweep controlling the
            reveal, divider, particles, and final Enemy1 wipe.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className={`mode-button ${isEditing ? "is-active" : ""}`}
            >
              Edit framing
            </button>
            <button
              type="button"
              onClick={previewAnimation}
              className={`mode-button ${!isEditing ? "is-active" : ""}`}
            >
              Preview animation
            </button>
          </div>
        </div>

        <section className="workstation" aria-label="Character framing workstation">
          <div className="workstation-heading">
            <div>
              <h1>Character framing</h1>
              <p>Adjust in edit mode, then preview the current placement.</p>
            </div>
            <button type="button" className="copy-button" onClick={copyValues}>
              {copyStatus}
            </button>
          </div>

          <div className="control-grid">
            {(
              [
                {
                  key: "player",
                  label: "R4",
                  value: playerTransform,
                  history: playerHistory,
                },
                {
                  key: "enemy",
                  label: "Enemy1",
                  value: enemyTransform,
                  history: enemyHistory,
                },
              ] as const
            ).map((character) => (
              <article className="character-controls" key={character.key}>
                <header>
                  <h2>{character.label}</h2>
                  <div className="character-actions">
                    <button
                      type="button"
                      onClick={() => undoTransform(character.key)}
                      disabled={character.history.length === 0}
                      title={`Undo ${character.label} adjustment`}
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => resetTransform(character.key)}
                      title={`Reset ${character.label} framing`}
                    >
                      Reset
                    </button>
                  </div>
                </header>

                {(
                  [
                    {
                      field: "x",
                      label: "X position",
                      min: -50,
                      max: 50,
                      step: 0.1,
                      suffix: "%",
                    },
                    {
                      field: "y",
                      label: "Y position",
                      min: -50,
                      max: 50,
                      step: 0.1,
                      suffix: "%",
                    },
                    {
                      field: "scale",
                      label: "Scale",
                      min: 0.7,
                      max: 2,
                      step: 0.01,
                      suffix: "x",
                    },
                  ] as const
                ).map((control) => (
                  <label className="control-row" key={control.field}>
                    <span>{control.label}</span>
                    <input
                      type="range"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={character.value[control.field]}
                      onPointerDown={() => beginEdit(character.key)}
                      onPointerUp={() => endEdit(character.key)}
                      onFocus={() => beginEdit(character.key)}
                      onBlur={() => endEdit(character.key)}
                      onChange={(event) =>
                        updateTransform(
                          character.key,
                          control.field,
                          Number(event.target.value),
                        )
                      }
                      aria-label={`${character.label} ${control.label}`}
                    />
                    <span className="number-field">
                      <input
                        type="number"
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={character.value[control.field]}
                        onFocus={() => beginEdit(character.key)}
                        onBlur={() => endEdit(character.key)}
                        onChange={(event) =>
                          updateTransform(
                            character.key,
                            control.field,
                            Number(event.target.value),
                          )
                        }
                        aria-label={`${character.label} ${control.label} value`}
                      />
                      <span>{control.suffix}</span>
                    </span>
                  </label>
                ))}
              </article>
            ))}
          </div>
        </section>
      </section>

      <style>{`
        @property --sweep {
          syntax: "<number>";
          inherits: true;
          initial-value: 50;
        }

        .faceoff-stage {
          --sweep: 50;
          position: relative;
          width: min(96vw, 1250px);
          aspect-ratio: 1250 / 618;
          overflow: hidden;
          isolation: isolate;
          background: #07111d;
          border: 1px solid rgba(103, 232, 249, 0.3);
          box-shadow:
            0 0 0 1px rgba(168, 85, 247, 0.2),
            0 22px 72px rgba(0, 0, 0, 0.7),
            inset 0 0 72px rgba(14, 165, 233, 0.15);
          animation:
            sweepControl 4200ms linear both,
            cameraShake 4200ms linear both;
        }

        .arena-bg {
          position: absolute;
          inset: -8%;
          z-index: 0;
          background:
            radial-gradient(circle at 50% 50%, rgba(125, 211, 252, 0.28), transparent 16%),
            repeating-linear-gradient(
              0deg,
              rgba(34, 211, 238, 0.04) 0 3px,
              rgba(2, 6, 23, 0.1) 4px 12px
            ),
            linear-gradient(
              90deg,
              #06111c 0%,
              #0b3655 28%,
              #0a7595 49%,
              #0d415f 70%,
              #07111d 100%
            );
          animation: backgroundPulse 4200ms linear both;
        }

        .speed-lines {
          position: absolute;
          inset: 0;
          z-index: 1;
          opacity: 0.42;
          mix-blend-mode: screen;
          background:
            repeating-linear-gradient(
              0deg,
              transparent 0 20px,
              rgba(103, 232, 249, 0.3) 21px 24px,
              transparent 25px 48px
            );
          filter: blur(0.5px);
          animation: speedRush 4200ms linear both;
        }

        .character-entry,
        .player-sweep,
        .enemy-sweep {
          position: absolute;
          inset: 0;
        }

        .character-entry {
          z-index: 3;
          will-change: transform, filter, opacity;
        }

        .player-sweep {
          z-index: 4;
          clip-path: inset(0 calc(100% - (var(--sweep) * 1%)) 0 0);
          will-change: clip-path;
        }

        .enemy-sweep {
          z-index: 3;
          clip-path: inset(0 0 0 calc(var(--sweep) * 1%));
          will-change: clip-path;
        }

        .character-image {
          display: block;
          width: 122%;
          height: 122%;
          margin-left: -11%;
          margin-top: -9%;
          object-fit: cover;
          user-select: none;
          pointer-events: none;
          filter: saturate(1.06) contrast(1.04);
        }

        .player-entry {
          animation: playerEnter 4200ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
        }

        .enemy-entry {
          animation: enemyEnter 4200ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
        }

        .impact-divider {
          position: absolute;
          top: -10%;
          bottom: -10%;
          left: calc(var(--sweep) * 1%);
          z-index: 7;
          width: 24px;
          opacity: 0;
          transform: translateX(-50%);
          animation: dividerVisibility 4200ms linear both;
          will-change: left, opacity;
        }

        .impact-divider span {
          position: absolute;
          inset-block: 0;
          left: 50%;
          display: block;
          transform: translateX(-50%);
        }

        .divider-aura {
          width: 24px;
          background: rgba(34, 211, 238, 0.2);
          box-shadow: 0 0 30px 12px rgba(56, 189, 248, 0.28);
        }

        .divider-glow {
          width: 10px;
          background: rgba(103, 232, 249, 0.68);
          box-shadow:
            0 0 12px 5px rgba(34, 211, 238, 0.8),
            0 0 26px 8px rgba(168, 85, 247, 0.45);
        }

        .divider-core {
          width: 3px;
          background: white;
          box-shadow: 0 0 8px white;
        }

        .particle-loop {
          position: absolute;
          inset: 0;
          z-index: 8;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          mix-blend-mode: screen;
          transform: translateX(calc((var(--sweep) - 50) * 1%));
          filter:
            drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))
            drop-shadow(0 0 18px rgba(34, 211, 238, 0.8));
          animation: particlesVisible 4200ms linear both;
          pointer-events: none;
        }

        .white-flash,
        .scanline,
        .enemy-echo {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .white-flash {
          z-index: 11;
          background: white;
          opacity: 0;
          animation: screenFlash 4200ms linear both;
        }

        .enemy-echo {
          z-index: 6;
          overflow: visible;
          opacity: 0;
          mix-blend-mode: screen;
          filter:
            brightness(1.5)
            saturate(1.25)
            drop-shadow(0 0 20px rgba(168, 85, 247, 0.78));
        }

        .enemy-echo-a {
          animation: enemyEchoA 4200ms linear both;
        }

        .enemy-echo-b {
          animation: enemyEchoB 4200ms linear both;
        }

        .scanline {
          z-index: 12;
          opacity: 0.14;
          background: repeating-linear-gradient(
            180deg,
            transparent 0 3px,
            rgba(255, 255, 255, 0.06) 4px 5px
          );
          mix-blend-mode: overlay;
        }

        .faceoff-stage.is-editing {
          --sweep: 50;
          animation: none;
          transform: none;
        }

        .faceoff-stage.is-editing .arena-bg {
          animation: none;
          filter: none;
        }

        .faceoff-stage.is-editing .speed-lines {
          animation: none;
          opacity: 0.28;
          transform: none;
        }

        .faceoff-stage.is-editing .player-entry,
        .faceoff-stage.is-editing .enemy-entry {
          animation: none;
          opacity: 1;
          transform: none;
          filter: none;
        }

        .faceoff-stage.is-editing .impact-divider {
          animation: none;
          opacity: 1;
        }

        .faceoff-stage.is-editing .particle-loop,
        .faceoff-stage.is-editing .white-flash,
        .faceoff-stage.is-editing .enemy-echo {
          display: none;
        }

        .mode-button,
        .copy-button,
        .character-actions button {
          min-height: 36px;
          border: 1px solid rgba(113, 113, 122, 0.72);
          border-radius: 6px;
          background: rgba(24, 24, 27, 0.92);
          color: #d4d4d8;
          transition:
            border-color 140ms ease,
            background-color 140ms ease,
            color 140ms ease;
        }

        .mode-button {
          padding: 0 12px;
        }

        .mode-button:hover,
        .copy-button:hover,
        .character-actions button:hover:not(:disabled) {
          border-color: rgba(103, 232, 249, 0.78);
          color: #ecfeff;
        }

        .mode-button.is-active {
          border-color: rgba(103, 232, 249, 0.9);
          background: rgba(8, 145, 178, 0.2);
          color: #cffafe;
          box-shadow: inset 0 0 14px rgba(34, 211, 238, 0.12);
        }

        .workstation {
          width: min(100%, 1100px);
          border-top: 1px solid rgba(63, 63, 70, 0.9);
          padding-top: 16px;
        }

        .workstation-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .workstation-heading h1 {
          margin: 0;
          font-size: 17px;
          font-weight: 650;
          color: #f4f4f5;
        }

        .workstation-heading p {
          margin: 3px 0 0;
          font-size: 13px;
          color: #a1a1aa;
        }

        .copy-button {
          min-width: 112px;
          padding: 0 14px;
          border-color: rgba(34, 211, 238, 0.62);
          color: #cffafe;
        }

        .control-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .character-controls {
          border: 1px solid rgba(63, 63, 70, 0.85);
          border-radius: 6px;
          background: rgba(9, 9, 15, 0.84);
          padding: 12px;
        }

        .character-controls header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 36px;
          margin-bottom: 8px;
        }

        .character-controls h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #f4f4f5;
        }

        .character-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .character-actions button {
          min-height: 30px;
          padding: 0 10px;
          font-size: 12px;
        }

        .character-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.36;
        }

        .control-row {
          display: grid;
          grid-template-columns: 78px minmax(100px, 1fr) 84px;
          align-items: center;
          gap: 10px;
          min-height: 38px;
          font-size: 12px;
          color: #a1a1aa;
        }

        .control-row > span:first-child {
          color: #d4d4d8;
        }

        .control-row input[type="range"] {
          width: 100%;
          accent-color: #22d3ee;
        }

        .number-field {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 18px;
          align-items: center;
          height: 30px;
          overflow: hidden;
          border: 1px solid rgba(82, 82, 91, 0.9);
          border-radius: 4px;
          background: #111118;
        }

        .number-field input {
          width: 100%;
          min-width: 0;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          padding: 0 4px 0 7px;
          color: #f4f4f5;
          font-variant-numeric: tabular-nums;
        }

        .number-field:focus-within {
          border-color: rgba(34, 211, 238, 0.82);
          box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.18);
        }

        .number-field > span {
          color: #71717a;
          text-align: center;
        }

        @keyframes sweepControl {
          0%, 20% { --sweep: 50; }
          28% { --sweep: 46; }
          35% { --sweep: 54; }
          42% { --sweep: 43; }
          49% { --sweep: 53; }
          56% { --sweep: 39; }
          61% { --sweep: 52; }
          64% {
            --sweep: 50;
            animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
          }
          78% {
            --sweep: 50;
            animation-timing-function: cubic-bezier(0.65, 0, 0.82, 0.24);
          }
          82% { --sweep: 47; }
          94%, 100% { --sweep: 0; }
        }

        @keyframes playerEnter {
          0% {
            opacity: 0;
            transform: translate3d(-38%, 0, 0);
            filter: blur(4px) brightness(0.72);
          }
          13% {
            opacity: 1;
            transform: translate3d(-5%, 0, 0);
            filter: blur(0) brightness(1.08);
          }
          20%, 78% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: brightness(1);
          }
          92%, 100% {
            opacity: 0;
            transform: translate3d(0, 0, 0);
            filter: brightness(0.72) saturate(0.8);
          }
        }

        @keyframes enemyEnter {
          0% {
            opacity: 0;
            transform: translate3d(38%, 0, 0);
            filter: blur(4px) brightness(0.72);
          }
          13% {
            opacity: 1;
            transform: translate3d(5%, 0, 0);
            filter: blur(0) brightness(1.08);
          }
          20%, 82% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: brightness(1);
          }
          94%, 100% {
            opacity: 1;
            transform: translate3d(-12.5%, 0, 0);
            filter: brightness(1);
          }
        }

        @keyframes dividerVisibility {
          0%, 11% { opacity: 0; }
          15%, 95% { opacity: 1; }
          99%, 100% { opacity: 0; }
        }

        @keyframes particlesVisible {
          0%, 12% { opacity: 0; }
          16% { opacity: 1; }
          92% { opacity: 0.9; }
          99%, 100% { opacity: 0; }
        }

        @keyframes screenFlash {
          0%, 10% { opacity: 0; }
          13% { opacity: 0.96; }
          16% { opacity: 0; }
          78% { opacity: 0; }
          81% { opacity: 0.5; }
          84%, 100% { opacity: 0; }
        }

        @keyframes cameraShake {
          0%, 18%, 72%, 100% { transform: translate3d(0, 0, 0); }
          23% { transform: translate3d(-5px, 3px, 0); }
          28% { transform: translate3d(6px, -3px, 0); }
          34% { transform: translate3d(-7px, -2px, 0); }
          40% { transform: translate3d(7px, 3px, 0); }
          47% { transform: translate3d(-8px, 1px, 0); }
          54% { transform: translate3d(9px, -2px, 0); }
          61% { transform: translate3d(-10px, 2px, 0); }
          68% { transform: translate3d(7px, 0, 0); }
        }

        @keyframes enemyEchoA {
          0%, 82% { opacity: 0; transform: scale(1); }
          87% { opacity: 0.35; transform: translateX(-12.5%) scale(1.035); }
          94%, 100% { opacity: 0; transform: translateX(-14%) scale(1.08); }
        }

        @keyframes enemyEchoB {
          0%, 84% { opacity: 0; transform: scale(1); }
          90% { opacity: 0.22; transform: translateX(-13.5%) scale(1.06); }
          97%, 100% { opacity: 0; transform: translateX(-16%) scale(1.12); }
        }

        @keyframes speedRush {
          0% { opacity: 0; transform: translateY(0); }
          12% { opacity: 0.6; }
          65% { opacity: 0.34; transform: translateY(-4%); }
          82%, 100% { opacity: 0; transform: translateY(-7%); }
        }

        @keyframes backgroundPulse {
          0% { filter: brightness(0.72); }
          14% { filter: brightness(1.5); }
          24% { filter: brightness(0.92); }
          64% { filter: brightness(1.12); }
          82%, 100% { filter: brightness(0.66); }
        }

        @media (max-width: 700px) {
          .faceoff-stage {
            width: 100%;
          }

          .control-grid {
            grid-template-columns: 1fr;
          }

          .workstation-heading {
            align-items: flex-start;
          }

          .control-row {
            grid-template-columns: 72px minmax(90px, 1fr) 78px;
            gap: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .faceoff-stage,
          .faceoff-stage * {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </main>
  );
}
