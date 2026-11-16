// Where each table card's face is kept. The files are cached for a year once
// served, so a face that is redrawn gets a new name here rather than being
// written over the old one.

const FACE_FILES: Record<string, string> = {
  defense: "defense.v2.webp",
};

/** The card face for a symbol ("Attack", "Defense" ...). */
export function battleSymbolImage(symbol: string) {
  const name = symbol.toLowerCase();
  return `/images/battle-symbols/soft-edge/${FACE_FILES[name] ?? `${name}.webp`}`;
}
