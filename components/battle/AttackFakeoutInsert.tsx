"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  getAttackFakeoutInsertState,
  subscribeAttackFakeoutInsert,
} from "@/lib/battle-pixi/state/attackFakeoutInsertStore";

const toneClass = {
  white: "attack-fakeout-insert-white",
  blue: "attack-fakeout-insert-blue",
  green: "attack-fakeout-insert-green",
  red: "attack-fakeout-insert-red",
};

const frameSrc = {
  player:
    "/images/battle-overlays/attack-fakeout/frames/attack-fakeout-frame-player-v1.png",
  enemy:
    "/images/battle-overlays/attack-fakeout/frames/attack-fakeout-frame-enemy-v1.png",
};

type FittedTextProps = {
  className: string;
  maxFontSize: number;
  maxLines: 1 | 2;
  minFontSize: number;
  text: string;
};

function FittedText({
  className,
  maxFontSize,
  maxLines,
  minFontSize,
  text,
}: FittedTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textNode = textRef.current;

    if (!container || !textNode || !text) return;

    let animationFrame = 0;

    const fitText = () => {
      let low = minFontSize;
      let high = maxFontSize;
      let best = minFontSize;

      while (high - low > 0.25) {
        const candidate = (low + high) / 2;
        textNode.style.fontSize = `${candidate}px`;
        const lineHeight = Number.parseFloat(
          getComputedStyle(textNode).lineHeight
        );
        const maximumTextHeight = Math.min(
          container.clientHeight,
          Math.ceil(lineHeight * maxLines) + 2
        );

        const fits =
          textNode.scrollWidth <= container.clientWidth + 0.5 &&
          textNode.scrollHeight <= maximumTextHeight;

        if (fits) {
          best = candidate;
          low = candidate;
        } else {
          high = candidate;
        }
      }

      textNode.style.fontSize = `${best}px`;
    };

    const scheduleFit = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(fitText);
    };

    const observer = new ResizeObserver(scheduleFit);
    observer.observe(container);
    scheduleFit();
    void document.fonts?.ready.then(scheduleFit);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [maxFontSize, maxLines, minFontSize, text]);

  return (
    <div ref={containerRef} className={className}>
      <span ref={textRef}>{text}</span>
    </div>
  );
}

export default function AttackFakeoutInsert() {
  const [state, setState] = useState(getAttackFakeoutInsertState());

  useEffect(() => {
    return subscribeAttackFakeoutInsert(() => {
      setState(getAttackFakeoutInsertState());
    });
  }, []);

  if (state.inserts.length === 0) return null;

  return (
    <>
      {state.inserts.map((insert, index) => {
        const row = index === 0 ? "upper" : "lower";
        const transitionClass =
          state.phase === "scrolling"
            ? index === 0
              ? "attack-fakeout-insert-scroll-out"
              : "attack-fakeout-insert-scroll-to-upper"
            : state.phase === "exiting"
              ? "attack-fakeout-insert-group-exit"
              : "";

        return (
          <div
            key={insert.id}
            className={`attack-fakeout-insert attack-fakeout-insert-${insert.side} attack-fakeout-row-${row} ${
              toneClass[insert.tone]
            } ${transitionClass}`}
            data-attack-fakeout-id={insert.id}
            data-attack-fakeout-phase={state.phase}
            data-attack-fakeout-row={row}
            data-attack-fakeout-side={insert.side}
          >
          <Image
            className="afk-frame afk-frame-base"
            src={frameSrc[insert.side]}
            alt=""
            fill
            loading="eager"
            sizes="(max-width: 720px) 70.4vw, min(57.6vw, 736px)"
            unoptimized
          />

          <div className="afk-portrait" aria-hidden="true">
            {insert.subject.iconImage ? (
              <Image
                src={insert.subject.iconImage}
                alt=""
                fill
                loading="eager"
                sizes="(max-width: 720px) 16vw, 166px"
                unoptimized
              />
            ) : null}
          </div>
          <div className="afk-portrait-ring" aria-hidden="true" />

          <Image
            className="afk-frame afk-frame-foreground"
            src={frameSrc[insert.side]}
            alt=""
            fill
            loading="eager"
            sizes="(max-width: 720px) 70.4vw, min(57.6vw, 736px)"
            unoptimized
          />

          {insert.subject.name ? (
            <FittedText
              className="afk-name"
              maxFontSize={14.4}
              maxLines={1}
              minFontSize={8.8}
              text={insert.subject.name}
            />
          ) : null}

          {insert.line ? (
            <FittedText
              className="afk-phrase"
              maxFontSize={18.4}
              maxLines={2}
              minFontSize={11.2}
              text={insert.line}
            />
          ) : null}
          </div>
        );
      })}
    </>
  );
}
