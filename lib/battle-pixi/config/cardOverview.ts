import type { Card } from "@/lib/gacha/pullLogic";
import type { BattleEnemy } from "@/lib/battle-pixi/config/enemyConfig";
import { getPlayerCharacterName, getEnemyCharacterName } from "@/lib/battle-pixi/config/characterNames";
import { patchConfig } from "@/lib/game-config/patchConfig";
import { cabinetSignalConfig } from "@/lib/game-config/cabinetSignalConfig";
import { getPlayerWinRateSnapshot } from "@/lib/battle-pixi/state/playerWinRateStore";
import { getCurrentRound } from "@/lib/battle-pixi/state/roundStore";

export type CardOverviewData = {
  name: string; image: string; ability: string; expectedReward: string; wRate: string;
};

export function getCardOverview(card: Card, active = false): CardOverviewData {
  const range = patchConfig.playerWinRate.variableByCard[card.name];
  const current = active ? getPlayerWinRateSnapshot() : null;
  const fixed = patchConfig.playerWinRate.ratesByCard[card.name];
  const rate = range
    ? `${range.min}〜${range.max}%（ラウンドごとに変動${current?.cardId === card.name && current.round === getCurrentRound() ? `・現在${current.rate}%` : "・現在値未確定"}）`
    : fixed !== undefined ? `${fixed}%` : "未設定";
  return {
    name: getPlayerCharacterName(card).label,
    image: card.image,
    ability: card.name === "UR1"
      ? `実装済み：敵撃破後、報酬回収の終了後にBAR抽選を${cabinetSignalConfig.barBoost.games}ゲーム強化（ボーナスストックを優先）。`
      : card.name === "UR3"
        ? "実装済み：W RATEがラウンドごとに変動。固有の自爆能力は未実装。"
        : "固有能力は未実装。現在はカード固有のW RATEと既存の共通バトルルールを適用。",
    expectedReward: "期待報酬は算出未対応。カード別の最低報酬・ボーナス保証は未設定。",
    wRate: `${rate}／Attackがターゲットに入ったときの攻撃成功率。ターゲット外は半分。バトル全体の勝率ではありません。`,
  };
}

export function getEnemyCardOverview(enemy: BattleEnemy): CardOverviewData {
  return { name: getEnemyCharacterName(enemy).label, image: enemy.image,
    ability: `固有能力は未設定。既存の攻撃カウント：${enemy.attackCounter}。`,
    expectedReward: "期待報酬は算出未対応。既存のボーナス・報酬抽選を適用。",
    wRate: "設定対象外（敵にプレイヤー用Attack成功率は設定されていません）。" };
}

// Presentation-only leases: overlapping dialogs cannot unlock each other.
const locks = new Set<symbol>();
const listeners = new Set<() => void>();
export function isCardOverviewOpen() { return locks.size > 0; }
export function subscribeCardOverview(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function acquireCardOverviewLock() {
  const token = Symbol();
  locks.add(token);
  listeners.forEach(listener => listener());
  return () => {
    if (locks.delete(token)) listeners.forEach(listener => listener());
  };
}
