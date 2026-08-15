// Unified points wallet — the single balance shared by every page
// (menu, gacha, battle, inventory, gift box, shop).
// Members: Supabase user_points table. Guests: localStorage guest_points.
// Every mutation is recorded in the game event log for statistics/balancing.

import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/events/gameEventStore";

type WalletUser = { id: string } | null;

let points = 0;
let sessionEarnedPoints = 0;
let loaded = false;
let cachedUser: WalletUser = null;
let userResolved = false;

const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

async function resolveUser(): Promise<WalletUser> {
  if (userResolved) return cachedUser;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  cachedUser = user ? { id: user.id } : null;
  userResolved = true;
  return cachedUser;
}

/** Clears the cached auth user (call after sign-in/sign-out). */
export function resetWalletUserCache() {
  userResolved = false;
  cachedUser = null;
}

export function getWalletState() {
  return { points, sessionEarnedPoints, loaded };
}

export async function initializeWallet() {
  loaded = false;
  notify();

  const user = await resolveUser();

  if (user) {
    const { data } = await supabase
      .from("user_points")
      .select("points")
      .eq("user_id", user.id)
      // maybeSingle: a user with no row yet is normal and falls back to 0.
      // single() answers that with a 406, which is only console noise here.
      .maybeSingle();

    points = data?.points ?? 0;
  } else {
    points = Number(localStorage.getItem("guest_points") ?? 0);
  }

  loaded = true;
  notify();
}

async function persist(nextPoints: number) {
  const user = await resolveUser();

  if (user) {
    await supabase
      .from("user_points")
      .update({ points: nextPoints })
      .eq("user_id", user.id);
  } else {
    localStorage.setItem("guest_points", String(nextPoints));
  }
}

// Mutations are serialized through this chain. Without it two concurrent
// callers both read the same `points`, and the slower write silently discards
// the faster one's delta (classic lost update).
let mutationChain: Promise<unknown> = Promise.resolve();

function queueMutation<T>(mutate: () => Promise<T>): Promise<T> {
  const run = mutationChain.then(mutate, mutate);
  // Keep the chain alive even if a mutation rejects.
  mutationChain = run.catch(() => undefined);
  return run;
}

export async function addPoints(amount: number, reason: string) {
  if (amount <= 0) return;

  return queueMutation(async () => {
    await applyDelta(amount, reason);
  });
}

async function applyDelta(amount: number, reason: string) {
  const nextPoints = points + amount;
  await persist(nextPoints);

  points = nextPoints;
  // Session-earned tracks winnings only; spending must not claw it back.
  if (amount > 0) sessionEarnedPoints += amount;
  loaded = true;

  logEvent({
    kind: "pointsDelta",
    detail: { reason },
    pointsDelta: amount,
    balanceAfter: points,
  });

  notify();
}

/**
 * Spends points if the balance allows. Returns false (and changes nothing)
 * when there aren't enough points.
 */
export async function spendPoints(amount: number, reason: string): Promise<boolean> {
  if (amount < 0) return false;
  if (amount === 0) return true;

  return queueMutation(async () => {
    // Re-check inside the queue: an earlier queued spend may have drained the
    // balance after this call was made.
    if (points < amount) return false;

    await applyDelta(-amount, reason);
    return true;
  });
}

/**
 * Tops the balance up *to* `floor` when it has fallen below it, so a player can
 * never be stranded with too few points to start a battle.
 *
 * Deliberately a floor rather than a flat grant: granting a fixed amount per
 * battle lets the player farm it by restarting the battle screen. Because this
 * pays only the shortfall, repeating it once the floor is reached is worth 0.
 *
 * Returns the amount actually granted.
 */
export async function ensureMinimumPoints(
  floor: number,
  reason: string
): Promise<number> {
  if (floor <= 0) return 0;

  return queueMutation(async () => {
    if (points >= floor) return 0;

    const shortfall = floor - points;
    await applyDelta(shortfall, reason);
    return shortfall;
  });
}

export function setWalletSessionEarned(value: number) {
  sessionEarnedPoints = value;
  notify();
}

export function resetWalletSessionEarned() {
  sessionEarnedPoints = 0;
  notify();
}

// Dev-only console helper: `__addPoints(500)` grants test points from any page.
// Ensures the wallet is loaded first so the grant adds to the real balance.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as Window & { __addPoints?: (amount: number) => Promise<number> }).__addPoints =
    async (amount: number) => {
      if (!loaded) await initializeWallet();
      await addPoints(amount, "dev_grant");
      return getWalletState().points;
    };
}

export function subscribeWallet(listener: () => void) {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}
