// Feature 10: gift box — milestone rewards driven by the game event log,
// plus a stubbed ad reward. Claimed state lives in localStorage.

import { getEvents, logEvent } from "@/lib/events/gameEventStore";
import { addPoints } from "@/lib/wallet/walletStore";
import { patchConfig } from "@/lib/game-config/patchConfig";

const CLAIMED_KEY = "gift_box_claimed";

export type GiftReward = {
  id: string;
  title: string;
  points: number;
  /** Games played so far toward the target. */
  progress: number;
  target: number;
  claimable: boolean;
  claimed: boolean;
};

function getClaimedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(CLAIMED_KEY) ?? "[]"
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Lifetime games played, counted from the event log's draw events. */
export function getLifetimeGames(): number {
  return getEvents().filter((event) => event.kind === "draw").length;
}

export function getGiftRewards(): GiftReward[] {
  const games = getLifetimeGames();
  const claimed = getClaimedIds();

  return patchConfig.giftBox.milestones.map((milestone) => {
    const isClaimed = claimed.includes(milestone.id);
    return {
      id: milestone.id,
      title: milestone.title,
      points: milestone.points,
      progress: Math.min(games, milestone.games),
      target: milestone.games,
      claimable: games >= milestone.games && !isClaimed,
      claimed: isClaimed,
    };
  });
}

export function getClaimableCount(): number {
  return getGiftRewards().filter((reward) => reward.claimable).length;
}

/** Claim a milestone. Returns the points granted, or null if not claimable. */
export async function claimMilestone(id: string): Promise<number | null> {
  const reward = getGiftRewards().find((entry) => entry.id === id);
  if (!reward?.claimable) return null;

  window.localStorage.setItem(
    CLAIMED_KEY,
    JSON.stringify([...getClaimedIds(), id])
  );
  await addPoints(reward.points, "gift_milestone");
  logEvent({
    kind: "giftClaim",
    pointsDelta: reward.points,
    detail: { id, points: reward.points },
  });
  return reward.points;
}

/** Grant the ad-view reward (the "ad" itself is stubbed in the UI). */
export async function claimAdReward(): Promise<number> {
  const points = patchConfig.giftBox.adRewardPoints;
  await addPoints(points, "gift_ad");
  logEvent({ kind: "giftClaim", pointsDelta: points, detail: { id: "ad", points } });
  return points;
}
