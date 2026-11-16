// Lays the crystal shield (render_defense_shield.py) onto the Defense card.
//
//   node tools/battle-symbols/compose_defense_card.mjs <shield.png>
//
// The card it starts from already has the old steel shield painted on it, so
// the middle of the card is first sunk into dark blue — the Attack card is dark
// behind its sword in the same way — and the new shield goes on top with its
// own light round it. Writes defense.v2.webp beside the card it read.

import sharp from "sharp";

const DIR = "public/images/battle-symbols/soft-edge/";
const SOURCE = `${DIR}defense.webp`;
const OUT = `${DIR}defense.v2.webp`;
const W = 600;
const H = 900;
/** Where the shield sits on the card, and how large. */
const SHIELD = { size: 560, cx: 300, cy: 408 };

const shieldPath = process.argv[2];
if (!shieldPath) throw new Error("usage: compose_defense_card.mjs <shield.png>");

const well = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#01040f" stop-opacity="1"/>
      <stop offset="0.8" stop-color="#020a26" stop-opacity="1"/>
      <stop offset="0.92" stop-color="#03113a" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#03113a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="300" cy="414" rx="226" ry="326" fill="url(#g)"/>
</svg>`);

const shield = await sharp(shieldPath).resize(SHIELD.size, SHIELD.size).png().toBuffer();
// The light the shield throws: itself, spread wide, added to the card.
const glowWide = await sharp(shield).blur(26).modulate({ brightness: 1.5, saturation: 1.3 }).png().toBuffer();
const glowTight = await sharp(shield).blur(5).png().toBuffer();
const at = { left: Math.round(SHIELD.cx - SHIELD.size / 2), top: Math.round(SHIELD.cy - SHIELD.size / 2) };

await sharp(SOURCE)
  .composite([
    { input: well, left: 0, top: 0 },
    { input: glowWide, ...at, blend: "screen" },
    { input: shield, ...at },
    { input: glowTight, ...at, blend: "screen" },
  ])
  .webp({ lossless: true })
  .toFile(OUT);

console.log(`wrote ${OUT}`);
