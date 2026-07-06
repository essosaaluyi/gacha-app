// Compatibility shim — battle points are now the unified wallet.
// Existing battle code keeps importing from this module unchanged;
// the implementation lives in lib/wallet/walletStore.ts.

import {
  addPoints,
  getWalletState,
  initializeWallet,
  resetWalletSessionEarned,
  subscribeWallet,
} from "@/lib/wallet/walletStore";

export function getBattlePointsState() {
  const { points, sessionEarnedPoints, loaded } = getWalletState();
  return { points, sessionEarnedPoints, loaded };
}

export async function initializeBattlePoints() {
  await initializeWallet();
}

export async function addBattlePoints(amount: number) {
  await addPoints(amount, "battle_reward");
}

export function resetBattleSessionPoints() {
  resetWalletSessionEarned();
}

export const subscribeBattlePoints = subscribeWallet;
