// Procedural canvas textures for the 3D card lab (no new image assets).
import * as THREE from "three";

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Dark teal play mat with soft centre light, fine weave noise and a gold inlay. */
export function feltTexture() {
  return canvas(2048, 1280, (g) => {
    const w = 2048, h = 1280;
    const base = g.createRadialGradient(w / 2, h * 0.48, 60, w / 2, h * 0.5, w * 0.62);
    base.addColorStop(0, "#174a48"); base.addColorStop(0.5, "#0d2f2e"); base.addColorStop(1, "#041214");
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
    g.strokeStyle = "rgba(120,220,210,0.035)"; g.lineWidth = 2;
    for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = "rgba(214,172,92,0.55)"; g.lineWidth = 6;
    g.strokeRect(150, 170, w - 300, h - 340);
    g.strokeStyle = "rgba(214,172,92,0.22)"; g.lineWidth = 2;
    g.strokeRect(176, 196, w - 352, h - 392);
  });
}

/** Floor of a card bay: darker recess with a faint lit outline where the card sits. */
export function bayTexture() {
  return canvas(256, 400, (g) => {
    g.fillStyle = "#061a1c"; g.fillRect(0, 0, 256, 400);
    const v = g.createRadialGradient(128, 200, 10, 128, 200, 220);
    v.addColorStop(0, "rgba(60,170,170,0.28)"); v.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = v; g.fillRect(0, 0, 256, 400);
    g.strokeStyle = "rgba(110,230,220,0.35)"; g.lineWidth = 3;
    g.beginPath(); g.roundRect(14, 14, 228, 372, 12); g.stroke();
  });
}

export function radialGlowTexture() {
  return canvas(256, 256, (g) => {
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,0.55)");
    r.addColorStop(0.6, "rgba(255,255,255,0.12)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  });
}

export function ringTexture() {
  return canvas(512, 512, (g) => {
    const r = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    r.addColorStop(0, "rgba(255,255,255,0)"); r.addColorStop(0.62, "rgba(255,255,255,0)");
    r.addColorStop(0.8, "rgba(255,255,255,0.95)"); r.addColorStop(0.86, "rgba(255,255,255,0.35)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  });
}

/** Soft rounded-rect halo that hugs a card. */
export function cardHaloTexture() {
  return canvas(320, 460, (g) => {
    g.filter = "blur(18px)";
    g.strokeStyle = "rgba(255,255,255,1)"; g.lineWidth = 26;
    g.beginPath(); g.roundRect(50, 50, 220, 360, 18); g.stroke();
    g.filter = "blur(4px)"; g.lineWidth = 6;
    g.beginPath(); g.roundRect(50, 50, 220, 360, 14); g.stroke();
  });
}

/** Vertical light column: bright at the base, fading upward; soft at the sides. */
export function pillarTexture() {
  return canvas(128, 512, (g) => {
    const v = g.createLinearGradient(0, 512, 0, 0);
    v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(0.25, "rgba(255,255,255,0.6)"); v.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = v; g.fillRect(0, 0, 128, 512);
    g.globalCompositeOperation = "destination-in";
    const h = g.createLinearGradient(0, 0, 128, 0);
    h.addColorStop(0, "rgba(0,0,0,0)"); h.addColorStop(0.5, "rgba(0,0,0,1)"); h.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = h; g.fillRect(0, 0, 128, 512);
  });
}

export function sparkTexture() {
  return canvas(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.18, "rgba(255,255,255,0.8)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.fillRect(62, 4, 4, 120); g.fillRect(4, 62, 120, 4);
  });
}
