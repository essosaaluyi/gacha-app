 "use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

const LAYERS = [
  {
    className: "battle-bg-parallax-far",
    src: "/images/battle-assets/day-field-parallax-layers/01-far-background.webp",
    zIndex: 0,
    speed: 0.2,
  },
  {
    className: "battle-bg-parallax-mid",
    src: "/images/battle-assets/day-field-parallax-layers/02-mid-background.webp",
    zIndex: 1,
    speed: 0.4,
  },
  {
    className: "battle-bg-parallax-gameplay",
    src: "/images/battle-assets/day-field-parallax-layers/03-gameplay.webp",
    zIndex: 2,
    speed: 1,
  },
  {
    className: "battle-bg-parallax-foreground",
    src: "/images/battle-assets/day-field-parallax-layers/04-foreground.webp",
    zIndex: 13,
    speed: 1.25,
  },
] as const;

export default function BattleBackground() {
  const layerRefs = useRef<Array<HTMLImageElement | null>>([]);

  useEffect(() => {
    let animationFrame = window.requestAnimationFrame(tick);
    let lastTime = performance.now();
    let normalizedX = 0;
    let targetX = 0.35;
    let nextTargetAt = lastTime + 3400;
    const maxShift = 28;

    function pickNextTarget(now: number) {
      targetX = Math.random() * 1.6 - 0.8;
      nextTargetAt = now + 3200 + Math.random() * 4600;
    }

    function applyParallax() {
      const gameplayShiftX = -normalizedX * maxShift;
      document.documentElement.style.setProperty(
        "--battle-gameplay-parallax-x",
        `${gameplayShiftX.toFixed(2)}px`
      );

      for (const [index, layer] of LAYERS.entries()) {
        const element = layerRefs.current[index];
        if (!element) continue;

        const shiftX = -normalizedX * maxShift * layer.speed;
        element.style.transform = `translate3d(calc(-50% + ${shiftX.toFixed(
          2
        )}px), 0, 0)`;
      }

    }

    function tick(now: number) {
      const deltaSeconds = Math.min(0.08, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (now >= nextTargetAt) {
        pickNextTarget(now);
      }

      const ease = 1 - Math.exp(-deltaSeconds * 0.42);
      normalizedX += (targetX - normalizedX) * ease;
      applyParallax();
      animationFrame = window.requestAnimationFrame(tick);
    }

    applyParallax();

    return () => {
      document.documentElement.style.removeProperty(
        "--battle-gameplay-parallax-x"
      );
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const layerStyle = {
    position: "absolute",
    left: "50%",
    top: 0,
    width: "auto",
    height: "100%",
    maxWidth: "none",
    pointerEvents: "none",
    transform: "translate3d(-50%, 0, 0)",
  } as const;

  return (
    <div
      className="battle-background-layer"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#9bd8f4",
      }}
    >
      {LAYERS.map((layer, index) => (
        <img
          key={layer.src}
          ref={(element) => {
            layerRefs.current[index] = element;
          }}
          className={`battle-bg-parallax ${layer.className}`}
          src={layer.src}
          alt=""
          style={
            {
              ...layerStyle,
              zIndex: layer.zIndex,
            } satisfies CSSProperties
          }
        />
      ))}
      <div className="battle-bg-floor-light" style={{ zIndex: 4 }} />
      <div className="battle-bg-vignette" style={{ zIndex: 5 }} />
    </div>
  );
}
