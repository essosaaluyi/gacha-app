export type CrackState = { phase: "clean" | "growing" | "cracked"; age: number };
export const CRACK_DURATION = 1.35;
export const GLASS_RADIUS = 2.058;
export type CrackSegment = { u1: number; y1: number; u2: number; y2: number; born: number; end: number; width: number };
export const createCrackState = (): CrackState => ({ phase: "clean", age: 0 });
export function triggerCrack(state: CrackState) {
  if (state.phase === "growing") return;
  state.phase = "growing"; state.age = 0;
}
export function repairCrack(state: CrackState) { state.phase = "clean"; state.age = 0; }
export function advanceCrack(state: CrackState, elapsed: number) {
  if (state.phase !== "growing" || !Number.isFinite(elapsed) || elapsed <= 0) return;
  state.age = Math.min(CRACK_DURATION, state.age + Math.min(elapsed, 0.1));
  if (state.age >= CRACK_DURATION) state.phase = "cracked";
}

/** Fractures grow across unwrapped cylinder coordinates, then wrap onto the glass. */
export function createCrackSegments(seed = 7401) {
  let value = seed >>> 0;
  const random = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  const segments: CrackSegment[] = [];
  const walk = (startU: number, startY: number, direction: number, length: number, born: number, width: number, branching: boolean) => {
    let u = startU, y = startY, time = born;
    const steps = Math.ceil(length / 0.14);
    for (let j = 0; j < steps; j++) {
      const angle = direction + (random() - 0.5) * 0.7;
      const distance = length / steps;
      const nextU = Math.max(-2.9, Math.min(3.1, u + Math.cos(angle) * distance));
      const nextY = Math.max(-2.48, Math.min(2.48, y + Math.sin(angle) * distance));
      const end = time + distance / 3.1;
      segments.push({ u1: u, y1: y, u2: nextU, y2: nextY, born: time, end, width });
      if (branching && (j === 4 || j === 9)) walk(nextU, nextY, direction + (j === 4 ? 0.7 : -0.65), 0.4 + random() * 0.55, end, width * 0.55, false);
      u = nextU; y = nextY; time = end;
    }
  };
  for (let i = 0; i < 9; i++) walk(0.25, 0.4, i * Math.PI * 2 / 9 + (random() - 0.5) * 0.2, 1.5 + random() * 1.1, i * 0.018, 0.016, true);
  return segments;
}

export function glassPoint(u: number, y: number) {
  return [Math.sin(u / GLASS_RADIUS) * GLASS_RADIUS, y, Math.cos(u / GLASS_RADIUS) * GLASS_RADIUS];
}
