"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import BattleBackground from "./BattleBackground";
import styles from "./AttackFakeoutWorkstation.module.css";

type Side = "player" | "enemy";
type Tone = "white" | "blue" | "green" | "red";
type LayerKey = "portrait" | "phrase";
type Selection = "insert" | LayerKey;

type BoxLayer = {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  visible: boolean;
};

type LayoutState = {
  insert: {
    x: number;
    y: number;
    width: number;
  };
  layers: Record<LayerKey, BoxLayer>;
  iconId: string;
  iconZoom: number;
  iconOffsetX: number;
  iconOffsetY: number;
  clipPortrait: boolean;
  phrase: string;
  tone: Tone;
  phraseFontSize: number;
};

type SavedState = {
  schemaVersion: 1;
  layouts: Record<Side, LayoutState>;
};

const STAGE_WIDTH = 1090;
const STAGE_HEIGHT = 350;
const FRAME_ASPECT = 2065 / 762;
const STORAGE_KEY = "attack-fakeout-placement-workstation-v1";

const FRAME_SOURCES: Record<Side, string> = {
  player:
    "/images/battle-overlays/attack-fakeout/frames/attack-fakeout-frame-player-v1.png",
  enemy:
    "/images/battle-overlays/attack-fakeout/frames/attack-fakeout-frame-enemy-v1.png",
};

const PLAYER_ICONS = [
  "R1",
  "R2",
  "R3",
  "R4",
  "SR1",
  "SR2",
  "SR3",
  "SR4",
  "SSR1",
  "SSR2",
  "SSR3",
  "SSR4",
  "UR1",
  "UR2",
  "UR3",
];

const ENEMY_ICONS = Array.from({ length: 13 }, (_, index) => `enemy${index + 1}`);

const TONE_COLORS: Record<Tone, string> = {
  white: "#f8fafc",
  blue: "#008fe1",
  green: "#00ad0c",
  red: "#ec0000",
};

const LAYER_LABELS: Record<Selection, string> = {
  insert: "Frame",
  portrait: "Portrait",
  phrase: "Phrase",
};

const playerDefault: LayoutState = {
  insert: { x: 20, y: 18, width: 780 },
  layers: {
    portrait: {
      x: 8,
      y: 11.75,
      width: 22.5,
      height: 61,
      z: 20,
      visible: true,
    },
    phrase: {
      x: 34,
      y: 43,
      width: 59,
      height: 21,
      z: 30,
      visible: true,
    },
  },
  iconId: "SSR4",
  iconZoom: 1.06,
  iconOffsetX: 0,
  iconOffsetY: 2,
  clipPortrait: true,
  phrase: "SSR4's golden core is responding...",
  tone: "red",
  phraseFontSize: 23,
};

const enemyDefault: LayoutState = {
  insert: { x: 290, y: 112, width: 780 },
  layers: {
    portrait: {
      x: 69.5,
      y: 11.75,
      width: 22.5,
      height: 61,
      z: 20,
      visible: true,
    },
    phrase: {
      x: 7,
      y: 43,
      width: 59,
      height: 21,
      z: 30,
      visible: true,
    },
  },
  iconId: "enemy1",
  iconZoom: 1.06,
  iconOffsetX: 0,
  iconOffsetY: 2,
  clipPortrait: true,
  phrase: "Its rusted origin answers with a low pulse...",
  tone: "blue",
  phraseFontSize: 23,
};

function cloneDefaults(): Record<Side, LayoutState> {
  return {
    player: structuredClone(playerDefault),
    enemy: structuredClone(enemyDefault),
  };
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function iconSource(side: Side, iconId: string) {
  return `/images/battle-overlays/attack-fakeout/icons/${iconId}.png`;
}

function normalizeLayoutState(
  candidate: Partial<LayoutState> | undefined,
  fallback: LayoutState
): LayoutState {
  return {
    insert: candidate?.insert ?? structuredClone(fallback.insert),
    layers: {
      portrait:
        candidate?.layers?.portrait ?? structuredClone(fallback.layers.portrait),
      phrase: candidate?.layers?.phrase ?? structuredClone(fallback.layers.phrase),
    },
    iconId: candidate?.iconId ?? fallback.iconId,
    iconZoom: candidate?.iconZoom ?? fallback.iconZoom,
    iconOffsetX: candidate?.iconOffsetX ?? fallback.iconOffsetX,
    iconOffsetY: candidate?.iconOffsetY ?? fallback.iconOffsetY,
    clipPortrait: candidate?.clipPortrait ?? fallback.clipPortrait,
    phrase: candidate?.phrase ?? fallback.phrase,
    tone: candidate?.tone ?? fallback.tone,
    phraseFontSize: candidate?.phraseFontSize ?? fallback.phraseFontSize,
  };
}

export default function AttackFakeoutWorkstation() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const backgroundObjectUrlRef = useRef<string | null>(null);
  const loadedRef = useRef(false);

  const [side, setSide] = useState<Side>("player");
  const [layouts, setLayouts] =
    useState<Record<Side, LayoutState>>(cloneDefaults);
  const [selected, setSelected] = useState<Selection>("portrait");
  const [zoom, setZoom] = useState(0.75);
  const [showGrid, setShowGrid] = useState(true);
  const [showHudGuides, setShowHudGuides] = useState(true);
  const [snap, setSnap] = useState(true);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy placement JSON");

  const layout = layouts[side];
  const insertHeight = layout.insert.width / FRAME_ASPECT;
  const iconIds = side === "player" ? PLAYER_ICONS : ENEMY_ICONS;

  const updateLayout = (
    updater: (current: LayoutState) => LayoutState,
    targetSide = side
  ) => {
    setLayouts((current) => ({
      ...current,
      [targetSide]: updater(current[targetSide]),
    }));
  };

  const updateInsert = (patch: Partial<LayoutState["insert"]>) => {
    updateLayout((current) => ({
      ...current,
      insert: { ...current.insert, ...patch },
    }));
  };

  const updateLayer = (key: LayerKey, patch: Partial<BoxLayer>) => {
    updateLayout((current) => ({
      ...current,
      layers: {
        ...current.layers,
        [key]: { ...current.layers[key], ...patch },
      },
    }));
  };

  const updateContent = (patch: Partial<LayoutState>) => {
    updateLayout((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    let savedLayouts: Record<Side, LayoutState> | null = null;

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SavedState;
        if (parsed.schemaVersion === 1 && parsed.layouts) {
          savedLayouts = {
            player: normalizeLayoutState(parsed.layouts.player, playerDefault),
            enemy: normalizeLayoutState(parsed.layouts.enemy, enemyDefault),
          };
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const timer = window.setTimeout(() => {
      if (savedLayouts) {
        setLayouts(savedLayouts);
      }
      loadedRef.current = true;
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    const saved: SavedState = { schemaVersion: 1, layouts };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [layouts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      event.preventDefault();
      const amount = event.shiftKey ? 10 : 1;
      const dx =
        event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
      const dy =
        event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;

      setLayouts((current) => {
        const currentLayout = current[side];

        if (selected === "insert") {
          return {
            ...current,
            [side]: {
              ...currentLayout,
              insert: {
                ...currentLayout.insert,
                x: round(currentLayout.insert.x + dx),
                y: round(currentLayout.insert.y + dy),
              },
            },
          };
        }

        const layer = currentLayout.layers[selected];
        const currentHeight = currentLayout.insert.width / FRAME_ASPECT;
        const xPercent = (dx / currentLayout.insert.width) * 100;
        const yPercent = (dy / currentHeight) * 100;

        return {
          ...current,
          [side]: {
            ...currentLayout,
            layers: {
              ...currentLayout.layers,
              [selected]: {
                ...layer,
                x: round(layer.x + xPercent),
                y: round(layer.y + yPercent),
              },
            },
          },
        };
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, side]);

  useEffect(() => {
    return () => {
      if (backgroundObjectUrlRef.current) {
        URL.revokeObjectURL(backgroundObjectUrlRef.current);
      }
    };
  }, []);

  const applySnap = (value: number, step: number) =>
    snap ? Math.round(value / step) * step : value;

  const startDrag = (event: ReactPointerEvent, key: Selection) => {
    event.preventDefault();
    event.stopPropagation();
    setSelected(key);
    event.currentTarget.setPointerCapture(event.pointerId);

    const stage = stageRef.current;
    if (!stage) return;

    const stageRect = stage.getBoundingClientRect();
    const scaleX = STAGE_WIDTH / stageRect.width;
    const scaleY = STAGE_HEIGHT / stageRect.height;
    const startX = event.clientX;
    const startY = event.clientY;
    const initialInsert = { ...layout.insert };
    const initialLayer = key === "insert" ? null : { ...layout.layers[key] };

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) * scaleX;
      const deltaY = (moveEvent.clientY - startY) * scaleY;

      if (key === "insert") {
        updateInsert({
          x: round(applySnap(initialInsert.x + deltaX, 1)),
          y: round(applySnap(initialInsert.y + deltaY, 1)),
        });
        return;
      }

      if (!initialLayer) return;
      updateLayer(key, {
        x: round(
          applySnap(initialLayer.x + (deltaX / initialInsert.width) * 100, 0.25)
        ),
        y: round(
          applySnap(
            initialLayer.y +
              (deltaY / (initialInsert.width / FRAME_ASPECT)) * 100,
            0.25
          )
        ),
      });
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const startResize = (event: ReactPointerEvent, key: Selection) => {
    event.preventDefault();
    event.stopPropagation();
    setSelected(key);
    event.currentTarget.setPointerCapture(event.pointerId);

    const stage = stageRef.current;
    if (!stage) return;

    const stageRect = stage.getBoundingClientRect();
    const scaleX = STAGE_WIDTH / stageRect.width;
    const scaleY = STAGE_HEIGHT / stageRect.height;
    const startX = event.clientX;
    const startY = event.clientY;
    const initialInsert = { ...layout.insert };
    const initialLayer = key === "insert" ? null : { ...layout.layers[key] };

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) * scaleX;
      const deltaY = (moveEvent.clientY - startY) * scaleY;

      if (key === "insert") {
        updateInsert({
          width: round(
            applySnap(
              clamp(initialInsert.width + deltaX, 360, STAGE_WIDTH - initialInsert.x),
              2
            )
          ),
        });
        return;
      }

      if (!initialLayer) return;
      const nextWidth = clamp(
        initialLayer.width + (deltaX / initialInsert.width) * 100,
        3,
        100 - initialLayer.x
      );

      if (key === "portrait") {
        updateLayer(key, {
          width: round(applySnap(nextWidth, 0.25)),
          height: round(applySnap(nextWidth * FRAME_ASPECT, 0.25)),
        });
        return;
      }

      updateLayer(key, {
        width: round(applySnap(nextWidth, 0.25)),
        height: round(
          applySnap(
            clamp(
              initialLayer.height +
                (deltaY / (initialInsert.width / FRAME_ASPECT)) * 100,
              4,
              100 - initialLayer.y
            ),
            0.25
          )
        ),
      });
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const currentExport = useMemo(() => {
    const insert = layouts[side].insert;
    const exportedLayout = layouts[side];

    return JSON.stringify(
      {
        schemaVersion: 1,
        coordinateSystem: {
          stage: `${STAGE_WIDTH}x${STAGE_HEIGHT}`,
          insert: "stage pixels",
          internalLayers: "percent of insert container",
        },
        side,
        frame: FRAME_SOURCES[side],
        icon: iconSource(side, exportedLayout.iconId),
        insert: {
          ...insert,
          height: round(insert.width / FRAME_ASPECT),
          xPercent: round((insert.x / STAGE_WIDTH) * 100),
          yPercent: round((insert.y / STAGE_HEIGHT) * 100),
          widthPercent: round((insert.width / STAGE_WIDTH) * 100),
        },
        layers: {
          portrait: exportedLayout.layers.portrait,
          phrase: exportedLayout.layers.phrase,
        },
        portraitCrop: {
          zoom: exportedLayout.iconZoom,
          offsetXPercent: exportedLayout.iconOffsetX,
          offsetYPercent: exportedLayout.iconOffsetY,
          clipToCircle: exportedLayout.clipPortrait,
        },
        text: {
          phrase: exportedLayout.phrase,
          tone: exportedLayout.tone,
          toneColor: TONE_COLORS[exportedLayout.tone],
          phraseFontSize: exportedLayout.phraseFontSize,
        },
      },
      null,
      2
    );
  }, [layouts, side]);

  const copyExport = async () => {
    await window.navigator.clipboard.writeText(currentExport);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy placement JSON"), 1200);
  };

  const downloadExport = () => {
    const blob = new Blob([currentExport], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `attack-fakeout-${side}-placement.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importExport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as {
          side?: Side;
          insert?: LayoutState["insert"];
          layers?: LayoutState["layers"];
          portraitCrop?: {
            zoom?: number;
            offsetXPercent?: number;
            offsetYPercent?: number;
            clipToCircle?: boolean;
          };
          text?: {
            phrase?: string;
            tone?: Tone;
            phraseFontSize?: number;
          };
          icon?: string;
        };

        const importedSide = parsed.side ?? side;
        updateLayout(
          (current) => ({
            ...current,
            insert: parsed.insert
              ? {
                  x: Number(parsed.insert.x),
                  y: Number(parsed.insert.y),
                  width: Number(parsed.insert.width),
                }
              : current.insert,
            layers: parsed.layers
              ? {
                  portrait: parsed.layers.portrait ?? current.layers.portrait,
                  phrase: parsed.layers.phrase ?? current.layers.phrase,
                }
              : current.layers,
            iconId:
              parsed.icon?.split("/").pop()?.replace(".png", "") ?? current.iconId,
            iconZoom: parsed.portraitCrop?.zoom ?? current.iconZoom,
            iconOffsetX:
              parsed.portraitCrop?.offsetXPercent ?? current.iconOffsetX,
            iconOffsetY:
              parsed.portraitCrop?.offsetYPercent ?? current.iconOffsetY,
            clipPortrait:
              parsed.portraitCrop?.clipToCircle ?? current.clipPortrait,
            phrase: parsed.text?.phrase ?? current.phrase,
            tone: parsed.text?.tone ?? current.tone,
            phraseFontSize:
              parsed.text?.phraseFontSize ?? current.phraseFontSize,
          }),
          importedSide
        );
        setSide(importedSide);
      } catch {
        // Ignore malformed design exports and preserve the current layout.
      }
    };
    reader.readAsText(file);
  };

  const uploadBackground = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (backgroundObjectUrlRef.current) {
      URL.revokeObjectURL(backgroundObjectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    backgroundObjectUrlRef.current = url;
    setBackgroundUrl(url);
  };

  const resetSelected = () => {
    const defaults = side === "player" ? playerDefault : enemyDefault;
    if (selected === "insert") {
      updateInsert(defaults.insert);
      return;
    }
    updateLayer(selected, defaults.layers[selected]);
  };

  const resetSide = () => {
    const defaults = side === "player" ? playerDefault : enemyDefault;
    updateLayout(() => structuredClone(defaults));
    setSelected("portrait");
  };

  const layerStyle = (layer: BoxLayer): CSSProperties => ({
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: `${layer.width}%`,
    height: `${layer.height}%`,
    zIndex: layer.z,
  });

  const renderHandle = (key: Selection) =>
    selected === key ? (
      <span
        className={styles.resizeHandle}
        onPointerDown={(event) => startResize(event, key)}
        aria-hidden="true"
      />
    ) : null;

  return (
    <main className={styles.workstation}>
      <header className={styles.topbar}>
        <div className={styles.titleBlock}>
          <h1>Attack Fakeout Placement</h1>
          <span>
            {STAGE_WIDTH} x {STAGE_HEIGHT}
          </span>
        </div>

        <div className={styles.segmented} aria-label="Preview side">
          {(["player", "enemy"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={side === item ? styles.segmentActive : ""}
              onClick={() => {
                setSide(item);
                setSelected("portrait");
              }}
            >
              {item === "player" ? "Player" : "Enemy"}
            </button>
          ))}
        </div>

        <div className={styles.toolbarActions}>
          <label className={styles.fileButton}>
            Background
            <input type="file" accept="image/*" onChange={uploadBackground} />
          </label>
          <label className={styles.fileButton}>
            Import
            <input type="file" accept="application/json" onChange={importExport} />
          </label>
          <button type="button" onClick={downloadExport}>
            Export
          </button>
          <button type="button" className={styles.primaryButton} onClick={copyExport}>
            {copyLabel}
          </button>
        </div>
      </header>

      <aside className={styles.layersPanel}>
        <section className={styles.panelSection}>
          <h2>Layers</h2>
          <div className={styles.layerList}>
            {(Object.keys(LAYER_LABELS) as Selection[]).map((key) => {
              const layer = key === "insert" ? null : layout.layers[key];
              return (
                <div
                  key={key}
                  className={`${styles.layerRow} ${
                    selected === key ? styles.layerRowActive : ""
                  }`}
                >
                  <button type="button" onClick={() => setSelected(key)}>
                    <span className={styles.layerOrder}>
                      {key === "insert" ? 10 : layer?.z}
                    </span>
                    <span>{LAYER_LABELS[key]}</span>
                  </button>
                  {layer ? (
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={(event) =>
                        updateLayer(key as LayerKey, {
                          visible: event.target.checked,
                        })
                      }
                      aria-label={`Show ${LAYER_LABELS[key]}`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.panelSection}>
          <h2>Character</h2>
          <label className={styles.control}>
            <span>Icon</span>
            <select
              value={layout.iconId}
              onChange={(event) =>
                updateContent({
                  iconId: event.target.value,
                })
              }
            >
              {iconIds.map((iconId) => (
                <option key={iconId} value={iconId}>
                  {iconId}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.control}>
            <span>Phrase</span>
            <textarea
              rows={3}
              value={layout.phrase}
              onChange={(event) => updateContent({ phrase: event.target.value })}
            />
          </label>
          <div className={styles.toneSwatches} aria-label="Phrase tone">
            {(Object.keys(TONE_COLORS) as Tone[]).map((tone) => (
              <button
                key={tone}
                type="button"
                className={layout.tone === tone ? styles.toneActive : ""}
                onClick={() => updateContent({ tone })}
                title={tone}
                aria-label={`${tone} phrase tone`}
              >
                <span style={{ background: TONE_COLORS[tone] }} />
              </button>
            ))}
          </div>
        </section>

        <section className={styles.panelSection}>
          <h2>View</h2>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(event) => setShowGrid(event.target.checked)}
            />
            Grid
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={showHudGuides}
              onChange={(event) => setShowHudGuides(event.target.checked)}
            />
            HUD guides
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={snap}
              onChange={(event) => setSnap(event.target.checked)}
            />
            Snap
          </label>
          <label className={styles.rangeControl}>
            <span>Canvas zoom</span>
            <output>{Math.round(zoom * 100)}%</output>
            <input
              type="range"
              min="0.5"
              max="1.3"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
        </section>
      </aside>

      <section className={styles.canvasArea}>
        <div className={styles.canvasViewport}>
          <div
            className={styles.canvasSizer}
            style={{
              width: STAGE_WIDTH * zoom,
              height: STAGE_HEIGHT * zoom,
            }}
          >
            <div
              ref={stageRef}
              className={styles.stage}
              style={{
                width: STAGE_WIDTH,
                height: STAGE_HEIGHT,
                transform: `scale(${zoom})`,
              }}
            >
              {backgroundUrl ? (
                <img className={styles.customBackground} src={backgroundUrl} alt="" />
              ) : (
                <BattleBackground />
              )}

              {showHudGuides ? (
                <div className={styles.hudGuides} aria-hidden="true">
                  <div className={styles.hudLeft}>
                    <span>TOTAL</span>
                    <strong>262P</strong>
                  </div>
                  <div className={styles.hudRoadmap}>
                    {Array.from({ length: 7 }, (_, index) => (
                      <span key={index}>{index + 1}</span>
                    ))}
                  </div>
                  <div className={styles.hudRight}>003</div>
                  <div className={styles.enemyCounter}>2</div>
                </div>
              ) : null}

              <div
                className={styles.insert}
                style={{
                  left: layout.insert.x,
                  top: layout.insert.y,
                  width: layout.insert.width,
                  height: insertHeight,
                }}
              >
                <img
                  className={styles.frame}
                  src={FRAME_SOURCES[side]}
                  alt=""
                  aria-hidden="true"
                />

                <button
                  type="button"
                  className={styles.frameHit}
                  onPointerDown={(event) => startDrag(event, "insert")}
                  aria-label="Move frame"
                />

                {layout.layers.portrait.visible ? (
                  <button
                    type="button"
                    className={`${styles.editableLayer} ${styles.portrait} ${
                      selected === "portrait" ? styles.selectedLayer : ""
                    }`}
                    style={{
                      ...layerStyle(layout.layers.portrait),
                      overflow: layout.clipPortrait ? "hidden" : "visible",
                    }}
                    onPointerDown={(event) => startDrag(event, "portrait")}
                    aria-label="Move portrait"
                  >
                    <img
                      src={iconSource(side, layout.iconId)}
                      alt=""
                      style={{
                        transform: `translate(${layout.iconOffsetX}%, ${layout.iconOffsetY}%) scale(${layout.iconZoom})`,
                      }}
                    />
                    <span className={styles.portraitRing} aria-hidden="true" />
                    {renderHandle("portrait")}
                  </button>
                ) : null}

                <img
                  className={`${styles.frameForeground} ${
                    side === "player"
                      ? styles.frameForegroundPlayer
                      : styles.frameForegroundEnemy
                  }`}
                  src={FRAME_SOURCES[side]}
                  alt=""
                  aria-hidden="true"
                />

                {layout.layers.phrase.visible ? (
                  <button
                    type="button"
                    className={`${styles.editableLayer} ${styles.textLayer} ${
                      selected === "phrase" ? styles.selectedLayer : ""
                    }`}
                    style={layerStyle(layout.layers.phrase)}
                    onPointerDown={(event) => startDrag(event, "phrase")}
                    aria-label="Move phrase"
                  >
                    <span
                      className={styles.phraseText}
                      style={{
                        color: TONE_COLORS[layout.tone],
                        fontSize: layout.phraseFontSize,
                      }}
                    >
                      {layout.phrase}
                    </span>
                    {renderHandle("phrase")}
                  </button>
                ) : null}

                {selected === "insert" ? (
                  <>
                    <div className={styles.insertSelection} aria-hidden="true" />
                    {renderHandle("insert")}
                  </>
                ) : null}
              </div>

              {showGrid ? <div className={styles.grid} aria-hidden="true" /> : null}
            </div>
          </div>
        </div>
      </section>

      <aside className={styles.inspector}>
        <section className={styles.panelSection}>
          <div className={styles.inspectorHeading}>
            <h2>{LAYER_LABELS[selected]}</h2>
            <button type="button" onClick={resetSelected}>
              Reset
            </button>
          </div>

          {selected === "insert" ? (
            <div className={styles.fieldGrid}>
              <NumberField
                label="X"
                value={layout.insert.x}
                onChange={(value) => updateInsert({ x: value })}
              />
              <NumberField
                label="Y"
                value={layout.insert.y}
                onChange={(value) => updateInsert({ y: value })}
              />
              <NumberField
                label="Width"
                value={layout.insert.width}
                min={360}
                max={STAGE_WIDTH}
                onChange={(value) => updateInsert({ width: value })}
              />
              <NumberField label="Height" value={round(insertHeight)} disabled />
            </div>
          ) : (
            <>
              <div className={styles.fieldGrid}>
                <NumberField
                  label="X %"
                  value={layout.layers[selected].x}
                  step={0.25}
                  onChange={(value) => updateLayer(selected, { x: value })}
                />
                <NumberField
                  label="Y %"
                  value={layout.layers[selected].y}
                  step={0.25}
                  onChange={(value) => updateLayer(selected, { y: value })}
                />
                <NumberField
                  label="Width %"
                  value={layout.layers[selected].width}
                  step={0.25}
                  onChange={(value) => updateLayer(selected, { width: value })}
                />
                <NumberField
                  label="Height %"
                  value={layout.layers[selected].height}
                  step={0.25}
                  onChange={(value) => updateLayer(selected, { height: value })}
                />
                <NumberField
                  label="Layer"
                  value={layout.layers[selected].z}
                  step={1}
                  onChange={(value) => updateLayer(selected, { z: value })}
                />
              </div>

              {selected === "portrait" ? (
                <div className={styles.subsection}>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={layout.clipPortrait}
                      onChange={(event) =>
                        updateContent({ clipPortrait: event.target.checked })
                      }
                    />
                    Circular clip
                  </label>
                  <NumberField
                    label="Image zoom"
                    value={layout.iconZoom}
                    min={0.3}
                    max={3}
                    step={0.02}
                    onChange={(value) => updateContent({ iconZoom: value })}
                  />
                  <div className={styles.fieldGrid}>
                    <NumberField
                      label="Image X %"
                      value={layout.iconOffsetX}
                      step={0.5}
                      onChange={(value) => updateContent({ iconOffsetX: value })}
                    />
                    <NumberField
                      label="Image Y %"
                      value={layout.iconOffsetY}
                      step={0.5}
                      onChange={(value) => updateContent({ iconOffsetY: value })}
                    />
                  </div>
                </div>
              ) : null}

              {selected === "phrase" ? (
                <NumberField
                  label="Font size"
                  value={layout.phraseFontSize}
                  min={8}
                  max={64}
                  onChange={(value) => updateContent({ phraseFontSize: value })}
                />
              ) : null}
            </>
          )}
        </section>

        <section className={styles.panelSection}>
          <div className={styles.inspectorHeading}>
            <h2>Placement Export</h2>
            <button type="button" onClick={resetSide}>
              Reset side
            </button>
          </div>
          <pre className={styles.exportPreview}>{currentExport}</pre>
        </section>
      </aside>
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className={styles.control}>
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange?.(Number(event.target.value))}
      />
    </label>
  );
}
