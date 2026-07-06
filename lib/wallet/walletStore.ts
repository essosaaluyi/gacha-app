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
      .single();

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

export async function addPoints(amount: number, reason: string) {
  if (amount <= 0) return;

  const nextPoints = points + amount;
  await persist(nextPoints);

  points = nextPoints;
  sessionEarnedPoints += amount;
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
  if (points < amount) return false;

  const nextPoints = points - amount;
  await persist(nextPoints);

  points = nextPoints;
  loaded = true;

  logEvent({
    kind: "pointsDelta",
    detail: { reason },
    pointsDelta: -amount,
    balanceAfter: points,
  });

  notify();
  return true;
}

export function resetWalletSessionEarned() {
  sessionEarnedPoints = 0;
  notify();
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
