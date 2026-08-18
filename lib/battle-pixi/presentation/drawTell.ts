import type { BattleResult } from "@/lib/battle-pixi/core/resultLottery";
import { evaluateResult } from "@/lib/battle-pixi/core/evaluateResult";

/**
 * The disc's anticipation ladder.
 *
 * A rung is not an outcome. It is an *expectancy* — how likely this draw is to
 * be one the player cares about — which is the whole difference between a
 * label and a tell. Colour maps to confidence, not to what the cards are:
 *
 *   white   ~2%   appears constantly, means almost nothing
 *   blue    ~5%
 *   green   ~35%  better than even odds
 *   red     90%   wrong one time in ten
 *   gold    100%  only ever truthful
 *
 * What the ladder predicts comes from the *measured* distribution, not from the
 * spreadsheet: patchConfig reshapes battleResultOdds, and the shipped odds are
 * nothing like the table's face value. Over 200k draws:
 *
 *   SingleChance 49.0%   Attack 25.2%   Empty 13.8%   Reply 6.2%
 *   Coin 2.3%   Defense 2.1%   Bar 0.80%   DoubleChance 0.47%   TripleChance 0.067%
 *
 * So a single chance is the *common* path, not a prize, and neither it nor an
 * attack can carry a ladder — a cue built on a coin flip carries no
 * information however it is weighted. The rare tier is bar, double and triple:
 * 1.33% together, about 1 in 75, which is what a ladder needs underneath it.
 *
 * The low rungs lie on purpose. Without fakes, any cue at all would guarantee
 * something good, and a dark disc would guarantee a dead hand — the machine
 * would spend half its draws telegraphing disappointment. Pachinko calls these
 * ガセ and treats them as load-bearing, not as noise.
 */
export type TellRung = "white" | "blue" | "green" | "red" | "gold";

export type DrawTellInput = {
  result: BattleResult;
  /** Whether the player is inside the fatal-mode window. */
  fatalActive: boolean;
  /** Fatal-mode games remaining *including* this one; 1 means this is the last. */
  fatalGamesLeft: number;
  /** Whether a hit has already registered earlier in the fatal window. */
  fatalAlreadyHit: boolean;
};

type Weights = Partial<Record<TellRung | "none", number>>;

/**
 * Per-class colour weights, in percent.
 *
 * These are derived, not chosen. Given the target reliabilities and the base
 * rates (decisive 1.33%, everything else 98.67%), the fake rate each colour is
 * allowed is forced:  p_fake = p_real x (D/N) x (1-R)/R.
 *
 * That is also why the disc is quiet. A cue can only be as common as its
 * reliability and its base rate permit — holding white at 2% means white can
 * fire on about 4% of draws and no more. A ladder that lit up half the time
 * would be one that meant nothing.
 *
 * Changing a weight changes what a colour *means*. The reliability on each
 * line is the thing to preserve; scratchpad/ladder-check.mjs measures it.
 */
const WEIGHTS: Record<"top" | "decisive" | "quiet", Weights> = {
  /**
   * Triple, bar, or a locked kill — the only class allowed to show gold.
   * Gold takes a quarter rather than most of these, so that gold stays rarer
   * than red; giving it the majority made the ceiling more common than the
   * rung below it, which reads as broken.
   */
  top: { gold: 22, red: 41, green: 18, blue: 6, white: 3, none: 10 },
  // ^ the `none` matters as much as the colours: without it a dark disc would
  // be *proof* that nothing rare was coming. Fakes stop absence being a signal
  // in one direction; this stops it in the other.
  /** A double chance: worth anticipating, but tops out at red. */
  decisive: { red: 27, green: 32, blue: 18, white: 11, none: 12 },
  /** Everything else, single chance and attack included. Every cue is a fake. */
  quiet: { red: 0.054, green: 0.573, blue: 2.61, white: 3.83, none: 92.93 }
};

/** The predicate the stage uses to register a fatal-mode hit, mirrored here. */
function registersHit(result: BattleResult): boolean {
  const evaluation = evaluateResult(result);
  return (
    evaluation.attackOnTarget ||
    evaluation.chanceAttack ||
    result.result === "Bar" ||
    result.result === "Reply" ||
    result.result === "Defense"
  );
}

/**
 * Whether this draw kills the enemy, decided before a card moves.
 *
 * A kill only resolves on the final turn of the fatal window, and only if a hit
 * landed anywhere in it. So on the last turn the outcome is already settled by
 * the hand that has just been drawn — which is what lets gold be honest here.
 */
export function isKillLocked(input: DrawTellInput): boolean {
  if (!input.fatalActive || input.fatalGamesLeft !== 1) return false;
  return input.fatalAlreadyHit || registersHit(input.result);
}

/**
 * The middle rung of the tier: a double chance.
 *
 * A *single* chance is deliberately absent. It is the most common result in the
 * game at 49% — the normal path, not a prize — and a ladder keyed to it would
 * be a ladder keyed to a coin flip. A chance *card* is likewise not an outcome:
 * cards feed chanceAttackRate and turn up in half of all hands.
 */
function isDecisive(result: BattleResult): boolean {
  return result.result === "DoubleChance";
}

function isTopTier(result: BattleResult, killLocked: boolean): boolean {
  const barWin =
    result.barChance?.scope === "battle" && result.barChance.outcome === "success";
  return killLocked || barWin || result.result === "TripleChance" || result.result === "Bar";
}

function pick(weights: Weights): TellRung | null {
  const entries = Object.entries(weights) as [TellRung | "none", number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [rung, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rung === "none" ? null : rung;
  }
  return null;
}

/**
 * Roll this draw's rung. Call once, after the hand is drawn and before the
 * player sees anything.
 *
 * @returns the colour to light the disc, or null to leave it dark
 */
export function rollDrawTell(input: DrawTellInput): TellRung | null {
  // One ladder, everywhere. Fatal mode gets no table of its own: a locked kill
  // is simply another top-tier event, so it rolls the same weights as a bar or
  // a triple. What makes the ladder learnable is that a colour means the same
  // thing in every phase — a mode with its own odds would quietly retrain the
  // player halfway through a run.
  const killLocked = isKillLocked(input);

  if (isTopTier(input.result, killLocked)) return pick(WEIGHTS.top);
  if (isDecisive(input.result)) return pick(WEIGHTS.decisive);
  return pick(WEIGHTS.quiet);
}
