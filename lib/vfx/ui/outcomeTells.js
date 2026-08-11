/**
 * Outcome tells.
 *
 * The deck telegraphs what the already-decided draw is going to be. Each entry
 * is one tell: a colour, how hard it glows, and how much spectacle the draw
 * itself gets.
 *
 * Rename these to your own outcome vocabulary — the names here are placeholders
 * for the three you described. What matters is the shape: an outcome maps to a
 * row, and the row drives every effect, so adding a fourth tell is a table
 * entry rather than new code.
 */

export const TELLS = {
  chance: {
    label: 'Chance',
    color: '#3fa9ff',
    coreColor: '#dbefff',
    thickness: 22,
    pulseSpeed: 2.6,
    pulseDepth: 0.14,
    /** Particles that trail the card as it is pulled out. */
    trailRate: 130,
    trailSize: 5,
    /** The burst at the slot the card leaves through. */
    burstCount: 60,
    burstSpeed: 190,
    slotFlash: 0.5
  },

  beneficial: {
    label: 'Beneficial',
    color: '#3ddb87',
    coreColor: '#e2fff0',
    thickness: 26,
    pulseSpeed: 2.2,
    pulseDepth: 0.18,
    trailRate: 180,
    trailSize: 5.5,
    burstCount: 80,
    burstSpeed: 220,
    slotFlash: 0.65
  },

  attack: {
    label: 'Attack',
    color: '#ff4d4d',
    coreColor: '#ffdede',
    thickness: 30,
    pulseSpeed: 3.6,
    pulseDepth: 0.24,
    trailRate: 220,
    trailSize: 6,
    burstCount: 110,
    burstSpeed: 260,
    slotFlash: 0.8
  },

  /** No tell: an ordinary draw still gets a whisper of motion, but no colour. */
  neutral: {
    label: 'Neutral',
    color: '#7c8698',
    coreColor: '#c9d2e0',
    thickness: 10,
    pulseSpeed: 1.6,
    pulseDepth: 0.06,
    trailRate: 45,
    trailSize: 4,
    burstCount: 26,
    burstSpeed: 170,
    slotFlash: 0.12
  }
};

export function tellFor(name) {
  return TELLS[name] ?? TELLS.neutral;
}

/** Seconds. Shared across tells so the deck's rhythm stays consistent. */
export const TIMING = {
  /** Glow ramps in on the first click and holds while the draw is armed. */
  glowIn: 0.28,
  glowOut: 0.45,
  /** How long the card takes to clear the slot. */
  draw: 0.5
};
