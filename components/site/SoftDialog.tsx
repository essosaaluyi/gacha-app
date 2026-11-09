"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import SiteIcon from "./SiteIcon";

export default function SoftDialog({ open, onClose, title, children, wide = false, startAtTop = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; startAtTop?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open || !startAtTop) return;

    // Opt-in only: native modal focus and browser layout can restore a previous
    // scroll position after showModal. Settle focus and scrolling together.
    const reset = () => {
      if (!dialog.open) return;
      dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]")?.focus({ preventScroll: true });
      dialog.scrollTop = 0;
    };
    reset();
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      reset();
      secondFrame = requestAnimationFrame(reset);
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [open, startAtTop]);

  return <dialog ref={ref} className={`site-dialog${wide ? " site-dialog-wide" : ""}`} aria-labelledby={headingId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
    <div className="site-dialog-content">
      <h2 id={headingId} className="site-dialog-title">{title}</h2>
      {children}
      <button type="button" className="site-close" aria-label={`Close ${title}`} onClick={onClose}><SiteIcon name="close" /></button>
    </div>
  </dialog>;
}
