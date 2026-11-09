/** Measured display-only bounds of the 15 current fronts. Originals stay untouched.
 * R: remove pale matte outside the bronze frame. SR/SSR/UR: remove white/alpha
 * margins and stray scan blocks outside their printed metallic perimeter.
 * SR1/SSR1/UR1 already have alpha removal, so use their surviving alpha bounds.
 */
type Profile = { width: number; height: number; left: number; top: number; right: number; bottom: number; rounded: boolean };
const R: Profile = { width: 600, height: 900, left: 11, top: 11, right: 10, bottom: 10, rounded: true };
const METAL: Profile = { width: 600, height: 900, left: 24, top: 16, right: 24, bottom: 12, rounded: false };
const LARGE: Profile = { width: 1024, height: 1536, left: 40, top: 24, right: 40, bottom: 24, rounded: false };
const PROFILES: Record<string, Profile> = {
  R1: R, R2: R, R3: R, R4: R,
  SR1: { ...METAL, top: 22, bottom: 17 }, SR2: METAL, SR3: METAL, SR4: METAL,
  SSR1: { ...METAL, bottom: 17 }, SSR2: METAL, SSR3: METAL, SSR4: METAL,
  UR1: { ...METAL, left: 23, right: 23, top: 13, bottom: 12 }, UR2: LARGE, UR3: LARGE,
};

function profile(image: string) {
  const id = image.match(/\/images\/cards\/player\/(R[1-4]|SR[1-4]|SSR[1-4]|UR[1-3])\/card\.(?:webp|png)(?:[?#].*)?$/)?.[1];
  return id ? PROFILES[id] : undefined;
}

export function getCardDisplayCrop(image: string) {
  const p = profile(image);
  return p ? { left: p.left / p.width, top: p.top / p.height, right: p.right / p.width, bottom: p.bottom / p.height } : null;
}

/** One boundary for the actual image clip, card root and illuminated SVG contour. */
export function getCardDisplayFrame(image: string) {
  const p = profile(image);
  const aspectRatio = p ? (p.width - p.left - p.right) / (p.height - p.top - p.bottom) : 2 / 3;
  const rounded = p?.rounded ?? true;
  return {
    aspectRatio,
    clipPath: rounded ? "inset(0 round 2.5%)" : "polygon(3% 0, 97% 0, 100% 2%, 100% 98%, 97% 100%, 3% 100%, 0 98%, 0 2%)",
    outlinePath: rounded
      ? "M2.5 0H97.5A2.5 2.5 0 0 1 100 2.5V97.5A2.5 2.5 0 0 1 97.5 100H2.5A2.5 2.5 0 0 1 0 97.5V2.5A2.5 2.5 0 0 1 2.5 0Z"
      : "M3 0H97L100 2V98L97 100H3L0 98V2Z",
  };
}
