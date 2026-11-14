"use client";

import CroppedCardImage from "@/components/gacha/CroppedCardImage";

/* eslint-disable @next/next/no-img-element -- Preserve the existing card artwork and frame. */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { acquireCardOverviewLock } from "@/lib/battle-pixi/config/cardOverview";
import styles from "./CardOverviewDialog.module.css";

export type CardOverviewData = {
  name: string;
  image: string;
  ability: string;
  expectedReward: string;
  wRate: string;
};

type Props = {
  data: CardOverviewData | null;
  onClose: () => void;
  onConfirm?: () => void;
  disabled?: boolean;
};

export default function CardOverviewDialog(props: Props) {
  return props.data ? <OverviewContent {...props} data={props.data} /> : null;
}

function OverviewContent({ data, onClose, onConfirm, disabled = false }: Props & { data: CardOverviewData }) {
  const id = useId();
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const noButton = useRef<HTMLButtonElement>(null);
  const submitted = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const confirmation = Boolean(onConfirm);

  useEffect(() => acquireCardOverviewLock(), []);

  useEffect(() => {
    const previous = document.activeElement;
    (confirmation ? noButton.current : closeButton.current)?.focus();
    return () => {
      // Parent hand buttons are re-enabled in the same commit that removes
      // the dialog. Restore focus afterwards, not while they are disabled.
      window.requestAnimationFrame(() => {
        if (document.querySelector("[data-card-overview-dialog]")) return;
        if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected && !previous.matches(":disabled")) {
          previous.focus({ preventScroll: true });
        }
      });
    };
  }, [confirmation]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={styles.overlay}
      onPointerDown={event => { event.stopPropagation(); if (event.target === event.currentTarget) event.preventDefault(); }}
      onPointerUp={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}
      onKeyUp={event => event.stopPropagation()}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
        if (event.key === "Tab") {
          const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
          const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
          if (buttons.length) {
            event.preventDefault();
            buttons[(current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
          }
        }
      }}>
      <section ref={panel} className={styles.dialog} data-card-overview-dialog="true"
        role="dialog" aria-modal="true" aria-labelledby={`${id}-name`}>
        <button ref={closeButton} type="button" className={styles.close} onClick={onClose} aria-label="カード概要を閉じる">×</button>
        <div className={styles.art}><CroppedCardImage src={data.image} alt={`${data.name}のカード`} /></div>
        <div className={styles.information}>
          <p className={styles.eyebrow}>{confirmation ? "召喚しますか？" : "カード概要"}</p>
          <h2 id={`${id}-name`}>{data.name}</h2>
          <dl>
            <div><dt>能力</dt><dd>{data.ability || "未設定"}</dd></div>
            <div><dt>期待報酬</dt><dd>{data.expectedReward || "未設定"}</dd></div>
            <div><dt>W RATE</dt><dd>{data.wRate || "未設定"}</dd></div>
          </dl>
          {onConfirm && <div className={styles.actions}>
            <button type="button" disabled={disabled || confirming} onClick={() => {
              if (disabled || submitted.current) return;
              submitted.current = true;
              setConfirming(true);
              onConfirm();
            }}>Yes <small>召喚する</small></button>
            <button ref={noButton} type="button" onClick={onClose}>No <small>手札に戻す</small></button>
          </div>}
        </div>
      </section>
    </div>, document.body,
  );
}
