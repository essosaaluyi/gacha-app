export type CabinetDealPhase = "mixing" | "ejecting" | "paused" | "ready" | "cancelled";
export const CABINET_SHUFFLE_MS = 2000;
export const CABINET_EJECT_STAGGER_MS = 90;
export const CABINET_TRANSFER_MS = 240;
export const CABINET_FLIGHT_MS = 560;

type Clock = {
  now: () => number;
  schedule: (callback: () => void, delay: number) => unknown;
  blocked: () => boolean;
  cancelled: () => boolean;
};

/** Synchronize at modal/visibility edges so a suspended RAF never counts hidden time. */
export function createPresentationClock(rawNow: () => number, blocked: () => boolean) {
  let last = rawNow();
  let elapsed = 0;
  let paused = blocked();
  const now = () => {
    const raw = rawNow();
    if (!paused) elapsed += Math.max(0, raw - last);
    last = raw;
    paused = blocked();
    return elapsed;
  };
  return { now, synchronize: () => { now(); } };
}

/** Only cabinet ejection uses this tween; unrelated battle animations stay unchanged. */
export function cabinetFlight(clock: Clock, duration: number, update: (progress: number) => void) {
  const started = clock.now();
  let stopped = false;
  const tick = () => {
    if (stopped || clock.cancelled()) return;
    const progress = Math.min(1, Math.max(0, (clock.now() - started) / duration));
    if (!clock.blocked()) update(progress);
    if (progress < 1) clock.schedule(tick, 16);
  };
  tick();
  return () => { stopped = true; };
}

/** A presentation timer consumes only visible, unblocked time. */
export function activeDelay(clock: Clock, delay: number, complete: () => void) {
  let remaining = delay;
  let last = clock.now();
  let wasBlocked = clock.blocked();
  const tick = () => {
    if (clock.cancelled()) return;
    const now = clock.now();
    const blocked = clock.blocked();
    if (!blocked && !wasBlocked) remaining -= Math.min(50, Math.max(0, now - last));
    last = now;
    wasBlocked = blocked;
    if (!blocked && remaining <= 0) { complete(); return; }
    clock.schedule(tick, blocked ? 50 : Math.min(25, Math.max(1, remaining)));
  };
  clock.schedule(tick, Math.min(25, Math.max(0, delay)));
}

export function createCabinetDeal(clock: Clock & {
  minimumCommitWait: number;
  commit: () => boolean;
  handReady: () => boolean;
  beforeEject: () => void;
  phase: (phase: CabinetDealPhase) => void;
  transfer: () => void;
  ready: () => void;
  /** External rigid3D flight replaces the legacy split DOM/Pixi durations. */
  flightDurationMs?: number;
  landingReady?: () => boolean;
}) {
  const endAt = clock.flightDurationMs ?? CABINET_TRANSFER_MS + CABINET_FLIGHT_MS + 2 * CABINET_EJECT_STAGGER_MS;
  const transferAt = clock.flightDurationMs ?? CABINET_TRANSFER_MS;
  let cancelled = false;
  let committed = false;
  let preflight = false;
  let transferred = false;
  let ejectAt: number | null = null;
  let elapsed = 0;
  let last = clock.now();
  let wasBlocked = clock.blocked();
  let phase: CabinetDealPhase | null = null;
  const publish = (next: CabinetDealPhase) => {
    if (phase !== next) { phase = next; clock.phase(next); }
  };
  const cancel = () => { if (!cancelled) { cancelled = true; publish("cancelled"); } };
  const tick = () => {
    if (cancelled) return;
    if (clock.cancelled()) { cancel(); return; }
    const now = clock.now();
    const blocked = clock.blocked();
    if (!blocked && !wasBlocked) elapsed += Math.min(50, Math.max(0, now - last));
    last = now; wasBlocked = blocked;
    if (blocked) publish("paused");
    else {
      if (!committed && elapsed >= clock.minimumCommitWait) {
        committed = true;
        if (!clock.commit()) { cancel(); return; }
      }
      if (elapsed >= CABINET_SHUFFLE_MS && committed && clock.handReady()) {
        if (!preflight) {
          preflight = true; clock.beforeEject();
          if (clock.blocked()) { publish("paused"); clock.schedule(tick, 25); return; }
        }
        if (ejectAt === null) ejectAt = elapsed;
        publish("ejecting");
        if (!transferred && elapsed - ejectAt >= transferAt && (clock.landingReady?.() ?? true)) {
          transferred = true; clock.transfer();
        }
        if (transferred && elapsed - ejectAt >= endAt) {
          cancelled = true; publish("ready"); clock.ready(); return;
        }
      } else publish("mixing");
    }
    let next = 25;
    if (!blocked) {
      if (!committed) next = Math.min(next, Math.max(1, clock.minimumCommitWait - elapsed));
      if (elapsed < CABINET_SHUFFLE_MS) next = Math.min(next, CABINET_SHUFFLE_MS - elapsed);
      if (ejectAt !== null) next = Math.min(next, Math.max(1,
        (transferred ? endAt : transferAt) - (elapsed - ejectAt)));
    }
    clock.schedule(tick, next);
  };
  tick();
  return { cancel };
}
