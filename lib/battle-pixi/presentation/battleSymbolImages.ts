// Where each table card's face is kept. The files are cached for a year once
// served, so a face that is redrawn gets a new name here rather than being
// written over the old one.

const FACE_FILES: Record<string, string> = {
  defense: "defense.v2.webp",
};

function faceFile(symbol: string) {
  const name = symbol.toLowerCase();
  return FACE_FILES[name] ?? `${name}.webp`;
}

/** The card face for a symbol ("Attack", "Defense" ...). */
export function battleSymbolImage(symbol: string) {
  return `/images/battle-symbols/soft-edge/${faceFile(symbol)}`;
}

export type FaceRim = { left: number; top: number; right: number; bottom: number };

/**
 * How far in from each edge the black rim of a face runs, in the art's own
 * pixels (600 x 900). A face is shown from its silver frame in, with no black
 * rim (owner, 2026-11-18). Measured once on each file, as the first light
 * pixel along its middle rows and columns: a redrawn face is measured again,
 * and a face not listed is shown whole.
 */
const FACE_RIMS: Record<string, FaceRim> = {
  "attack.webp": { left: 23, top: 21, right: 26, bottom: 19 },
  "bar.webp": { left: 24, top: 21, right: 26, bottom: 22 },
  "chance.webp": { left: 20, top: 21, right: 23, bottom: 22 },
  "coin.webp": { left: 24, top: 21, right: 27, bottom: 22 },
  "defense.v2.webp": { left: 24, top: 21, right: 27, bottom: 22 },
  "empty.webp": { left: 23, top: 21, right: 27, bottom: 22 },
  "reply.webp": { left: 24, top: 21, right: 27, bottom: 22 },
};

/** The corner radius of the silver frame a face is cut to, in the art's pixels. */
export const FACE_FRAME_RADIUS = 18;

/** The black rim to cut off a symbol's face, or null to show it whole. */
export function battleSymbolFaceRim(symbol: string): FaceRim | null {
  return FACE_RIMS[faceFile(symbol)] ?? null;
}

/** The faces are all drawn on this canvas. */
const FACE_ART = { width: 600, height: 900 };

/** The same cut for a face shown as an <img>: a CSS clip-path, or undefined to show it whole. */
export function battleSymbolFaceClipPath(symbol: string) {
  const rim = battleSymbolFaceRim(symbol);
  if (!rim) return undefined;
  const across = (value: number) => `${((value / FACE_ART.width) * 100).toFixed(3)}%`;
  const down = (value: number) => `${((value / FACE_ART.height) * 100).toFixed(3)}%`;
  return `inset(${down(rim.top)} ${across(rim.right)} ${down(rim.bottom)} ${across(rim.left)} round ${across(FACE_FRAME_RADIUS)} / ${down(FACE_FRAME_RADIUS)})`;
}
