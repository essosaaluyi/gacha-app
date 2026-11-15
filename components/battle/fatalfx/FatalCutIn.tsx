"use client";

import { useEffect, useRef } from "react";
import type { CutInSettings, FatalTier } from "./fatalFxSettings";

// Drawn in the cabinet screen's own coordinate space, then scaled by CSS.
const W = 1250;
const H = 618;

// Share of the total duration spent in each phase.
const SLASH_END = 0.07;
const OPEN_END = 0.2;
const CLOSE_START = 0.84;

type Pt = { x: number; y: number };
type Bolt = { pts: Pt[]; width: number };
type SpeedLine = { x: number; y: number; len: number; speed: number; w: number; a: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
const easeIn = (v: number) => Math.pow(clamp01(v), 3);
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Midpoint displacement: the classic jagged lightning path. */
function jagged(a: Pt, b: Pt, disp: number, depth: number, out: Pt[]) {
  if (depth === 0) { out.push(b); return; }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const off = (Math.random() - 0.5) * disp;
  const mid = { x: (a.x + b.x) / 2 - (dy / len) * off, y: (a.y + b.y) / 2 + (dx / len) * off };
  jagged(a, mid, disp / 2, depth - 1, out);
  jagged(mid, b, disp / 2, depth - 1, out);
}

function makeBolt(a: Pt, b: Pt, disp: number, width: number): Bolt {
  const pts = [a];
  jagged(a, b, disp, 5, pts);
  return { pts, width };
}

function makeBolts(s: CutInSettings, half: number): Bolt[] {
  const bolts: Bolt[] = [];
  const add = (a: Pt, b: Pt, disp: number, width: number) => {
    const bolt = makeBolt(a, b, disp, width);
    bolts.push(bolt);
    if (Math.random() < s.boltBranch) {
      const from = bolt.pts[Math.floor(rand(0.25, 0.75) * bolt.pts.length)];
      const reach = Math.hypot(b.x - a.x, b.y - a.y) * rand(0.18, 0.35);
      const angle = Math.atan2(b.y - a.y, b.x - a.x) + rand(0.4, 1.1) * (Math.random() < 0.5 ? -1 : 1);
      bolts.push(makeBolt(from, { x: from.x + Math.cos(angle) * reach, y: from.y + Math.sin(angle) * reach }, reach * s.boltJag * 0.5, width * 0.55));
    }
  };
  // Hugging the two edge lines of the band, crackling around them.
  for (let i = 0; i < Math.round(s.boltCount); i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const len = s.boltLength * rand(0.6, 1.2);
    const x = rand(-W * 0.62, Math.max(-W * 0.62, W * 0.62 - len));
    const y = side * half;
    const disp = s.boltSpread * 4 * s.boltJag + len * s.boltJag * 0.1;
    add({ x, y: y + rand(-s.boltSpread, s.boltSpread) }, { x: x + len, y: y + rand(-s.boltSpread, s.boltSpread) }, disp, s.boltWidth);
  }
  // Across the picture, edge to edge.
  for (let i = 0; i < Math.round(s.boltCrossCount); i += 1) {
    const x = rand(-W * 0.5, W * 0.5);
    const end = { x: x + rand(-260, 260), y: half };
    add({ x, y: -half }, end, Math.hypot(end.x - x, half * 2) * s.boltJag * 0.5, s.boltWidth * 0.8);
  }
  return bolts;
}

function makeLines(count: number): SpeedLine[] {
  return Array.from({ length: Math.round(count) }, () => ({
    x: rand(-W, W), y: rand(-1, 1), len: rand(120, 520), speed: rand(900, 2400), w: rand(1, 4), a: rand(0.3, 1),
  }));
}

export type FatalCutInProps = {
  settings: CutInSettings;
  tier: FatalTier;
  /** Increment to play. 0 = never played. */
  playKey: number;
  /** Stay open after the opening instead of closing (for tuning). */
  hold?: boolean;
  onDone?: () => void;
};

/** Expectation cut-in: a slash that opens into a tilted band with lightning. */
export default function FatalCutIn({ settings, tier, playKey, hold = false, onDone }: FatalCutInProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ settings, tier, hold, onDone });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const startRef = useRef(0);
  const runningRef = useRef(false);

  useEffect(() => {
    const wasHolding = live.current.hold;
    live.current = { settings, tier, hold, onDone };
    // Releasing the hold jumps straight to the closing phase.
    if (wasHolding && !hold && runningRef.current) {
      const elapsed = performance.now() - startRef.current;
      const closeAt = settings.durationMs * CLOSE_START;
      if (elapsed > closeAt) startRef.current = performance.now() - closeAt;
    }
  }, [settings, tier, hold, onDone]);

  useEffect(() => {
    imageRef.current = null;
    if (!settings.imageSrc) return;
    const img = new Image();
    img.onload = () => { imageRef.current = img; };
    img.src = settings.imageSrc;
    return () => { img.onload = null; };
  }, [settings.imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || playKey === 0) return;

    const k = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * k;
    canvas.height = H * k;

    let raf = 0;
    let last = performance.now();
    let bolts: Bolt[] = [];
    let boltsAt = 0;
    let lines = makeLines(live.current.settings.lineCount);
    startRef.current = last;
    runningRef.current = true;

    const clear = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); };

    const frame = (now: number) => {
      const { settings: s, tier: currentTier, hold: holding, onDone: done } = live.current;
      const c = s.colors[currentTier];
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = (now - startRef.current) / Math.max(200, s.durationMs);

      if (!holding && p >= 1) {
        clear();
        runningRef.current = false;
        done?.();
        return;
      }

      const slashP = clamp01(p / SLASH_END);
      const openP = clamp01((p - SLASH_END) / (OPEN_END - SLASH_END));
      let open = easeOut(openP);
      if (!holding && p > CLOSE_START) open *= 1 - easeIn((p - CLOSE_START) / (1 - CLOSE_START));

      const tilt = (s.tiltDeg * Math.PI) / 180;
      const fullH = (H * s.heightPct) / 100;
      const bandH = fullH * open;
      const half = bandH / 2;

      clear();
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.fillStyle = `rgba(0,0,0,${s.dim * open})`;
      ctx.fillRect(0, 0, W, H);

      ctx.translate(W / 2, (H * s.centerYPct) / 100);
      ctx.rotate(tilt);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // 1. The slash that announces the cut-in.
      if (openP < 1) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 1 - openP;
        ctx.shadowColor = c.glow;
        ctx.shadowBlur = 24;
        ctx.strokeStyle = c.bolt;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-W, 0);
        ctx.lineTo(-W + 2 * W * easeOut(slashP), 0);
        ctx.stroke();
        ctx.restore();
      }

      if (bandH > 1) {
        // 2. Everything inside the band.
        ctx.save();
        ctx.beginPath();
        ctx.rect(-W, -half, 2 * W, bandH);
        ctx.clip();

        ctx.fillStyle = c.main;
        ctx.fillRect(-W, -half, 2 * W, bandH);

        const img = imageRef.current;
        if (img) {
          ctx.save();
          if (s.imageUpright) ctx.rotate(-tilt);
          const scale = Math.max((W * 1.05) / img.naturalWidth, (fullH * 1.25) / img.naturalHeight) * s.imageZoom;
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;
          const drift = ((W * s.imageDrift) / 100) * (1 - easeOut(p / CLOSE_START));
          ctx.drawImage(img, -dw / 2 + (W * s.imageOffsetX) / 100 + drift, -dh / 2 + (dh * s.imageOffsetY) / 100, dw, dh);
          ctx.restore();
        }

        ctx.globalCompositeOperation = "color";
        ctx.globalAlpha = s.imageTint;
        ctx.fillStyle = c.main;
        ctx.fillRect(-W, -half, 2 * W, bandH);
        ctx.globalAlpha = 1;

        // Metallic sheen: banded highlights, then a glint sweeping along the band.
        if (c.shine > 0.01) {
          ctx.globalCompositeOperation = "color";
          ctx.globalAlpha = c.shine * 0.45;
          ctx.fillRect(-W, -half, 2 * W, bandH);
          ctx.globalCompositeOperation = "overlay";
          ctx.globalAlpha = c.shine;
          const metal = ctx.createLinearGradient(0, -half, 0, half);
          metal.addColorStop(0, "#3a2200");
          metal.addColorStop(0.18, "#fff3b0");
          metal.addColorStop(0.36, "#8a5a00");
          metal.addColorStop(0.55, "#ffe9a0");
          metal.addColorStop(0.74, "#6e4500");
          metal.addColorStop(0.9, "#ffd870");
          metal.addColorStop(1, "#3a2200");
          ctx.fillStyle = metal;
          ctx.fillRect(-W, -half, 2 * W, bandH);

          ctx.globalCompositeOperation = "lighter";
          const sweep = ((now / 1100) % 1) * (2.6 * W) - 1.3 * W;
          const glintW = 220;
          ctx.save();
          ctx.transform(1, 0, -0.6, 1, 0, 0);
          const glint = ctx.createLinearGradient(sweep - glintW, 0, sweep + glintW, 0);
          glint.addColorStop(0, "rgba(255,255,255,0)");
          glint.addColorStop(0.5, `rgba(255,250,220,${0.75 * c.shine})`);
          glint.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = glint;
          ctx.fillRect(sweep - glintW, -half, glintW * 2, bandH);
          ctx.restore();
          ctx.globalAlpha = 1;
        }

        // Speed lines streaking along the band.
        if (lines.length !== Math.round(s.lineCount)) lines = makeLines(s.lineCount);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = c.glow;
        for (const line of lines) {
          line.x += line.speed * s.lineSpeed * dt;
          if (line.x > W) line.x = -W - line.len;
          ctx.globalAlpha = s.lineOpacity * line.a;
          ctx.lineWidth = line.w;
          ctx.beginPath();
          ctx.moveTo(line.x, line.y * (fullH / 2));
          ctx.lineTo(line.x + line.len, line.y * (fullH / 2));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Darken toward the edges so the picture sits inside the band.
        ctx.globalCompositeOperation = "source-over";
        const shade = ctx.createLinearGradient(0, -half, 0, half);
        shade.addColorStop(0, "rgba(0,0,0,0.6)");
        shade.addColorStop(0.28, "rgba(0,0,0,0)");
        shade.addColorStop(0.72, "rgba(0,0,0,0)");
        shade.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = shade;
        ctx.fillRect(-W, -half, 2 * W, bandH);

        // Opening flash.
        const flash = s.flash * (1 - clamp01((p - SLASH_END) / 0.22));
        if (flash > 0.01) {
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = `rgba(255,255,255,${flash})`;
          ctx.fillRect(-W, -half, 2 * W, bandH);
        }
        ctx.restore();

        // 3. Glowing edges, drawn outside the clip so they bleed over the screen.
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = c.glow;
        ctx.shadowBlur = 22;
        for (const y of [-half, half]) {
          ctx.strokeStyle = c.glow;
          ctx.lineWidth = s.edgeWidth;
          ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W, y); ctx.stroke();
          ctx.strokeStyle = c.bolt;
          ctx.lineWidth = Math.max(1, s.edgeWidth * 0.35);
          ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // 4. Lightning, re-rolled every few frames so it crackles.
        if (now - boltsAt > s.boltFlickerMs) { bolts = makeBolts(s, half); boltsAt = now; }
        const fade = 1 - clamp01((now - boltsAt) / (s.boltFlickerMs * 1.4)) * 0.6;
        const stroke = (bolt: Bolt, color: string, width: number, blur: number, alpha: number) => {
          ctx.globalAlpha = alpha * open;
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.shadowColor = c.glow;
          ctx.shadowBlur = blur;
          ctx.beginPath();
          ctx.moveTo(bolt.pts[0].x, bolt.pts[0].y);
          for (let i = 1; i < bolt.pts.length; i += 1) ctx.lineTo(bolt.pts[i].x, bolt.pts[i].y);
          ctx.stroke();
        };
        for (const bolt of bolts) {
          stroke(bolt, c.glow, bolt.width * 3.2, s.boltGlow, 0.45 * fade);
          stroke(bolt, c.bolt, bolt.width, s.boltGlow * 0.5, fade);
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); runningRef.current = false; clear(); };
  }, [playKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
