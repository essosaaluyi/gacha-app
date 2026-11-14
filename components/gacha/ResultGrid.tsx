"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";
import CardFrame from "@/components/gacha/CardFrame";
import { getCardDisplayFrame } from "@/components/gacha/pack-reveal/cardDisplayCrop";

type Card = {
  name: string;
  rarity: string;
  image: string;
  backImage?: string;
};

type Props = {
  results: readonly Card[];
  setSelectedImage: (image: string | null) => void;
};

type Drag = {
  target: HTMLButtonElement;
  id: number;
  x: number;
  y: number;
  moved: boolean;
};

/** Final fronts: tilt is presentation-only; a drag never opens inspection. */
export default function ResultGrid({ results, setSelectedImage }: Props) {
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef<HTMLButtonElement | null>(null);

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    if (active.moved || event.type === "pointercancel") suppressClick.current = active.target;
    active.target.style.transform = "perspective(850px) rotateX(0deg) rotateY(0deg)";
    active.target.style.transition = "transform 180ms ease-out";
    drag.current = null;
    if (active.target.hasPointerCapture(event.pointerId)) active.target.releasePointerCapture(event.pointerId);
  };

  if (results.length === 0) return null;

  return (
    <div className="mx-auto grid w-full max-w-[660px] grid-cols-3 gap-3 mb-6 sm:grid-cols-5 sm:gap-4" data-testid="gacha-result-grid">
      {results.map((card, index) => {
        const frame = getCardDisplayFrame(card.image);
        return (
        <div key={card.name + "-" + index} className="w-full aspect-[2/3] flex items-center justify-center">
        <button
          type="button"
          aria-label={"Inspect " + card.name}
          title="Drag to tilt; click or press Enter to inspect."
          className="relative h-full cursor-grab active:cursor-grabbing select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          style={{ aspectRatio: frame.aspectRatio, width: "auto", touchAction: "pan-y", background: "transparent", padding: 0, border: 0, transform: "perspective(850px) rotateX(0deg) rotateY(0deg)" }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            suppressClick.current = null;
            drag.current = { target: event.currentTarget, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
            event.currentTarget.style.transition = "none";
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const active = drag.current;
            if (!active || active.id !== event.pointerId) return;
            const dx = event.clientX - active.x;
            const dy = event.clientY - active.y;
            if (Math.hypot(dx, dy) < 6 && !active.moved) return;
            active.moved = true;
            const width = Math.max(1, active.target.getBoundingClientRect().width);
            const rotateY = Math.max(-22, Math.min(22, dx / width * 65));
            const rotateX = Math.max(-18, Math.min(18, -dy / width * 55));
            active.target.style.transform = "perspective(850px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)";
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onClick={(event) => {
            if (event.detail !== 0 && suppressClick.current === event.currentTarget) {
              event.preventDefault();
              return;
            }
            suppressClick.current = null;
            setSelectedImage(card.image);
          }}
        >
          <CardFrame src={card.image} alt={card.name} rarity={card.rarity} fill />
        </button>
        </div>
        );
      })}
    </div>
  );
}
