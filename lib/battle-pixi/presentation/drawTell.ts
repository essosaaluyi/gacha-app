import type { BattleResult } from "@/lib/battle-pixi/core/resultLottery";
import { evaluateResult } from "@/lib/battle-pixi/core/evaluateResult";
import { getBattleResultWeights } from "@/lib/battle-pixi/core/resultLottery";

/**
 * The disc's anticipation ladder.
 *
 * A rung is not an outcome. It is an *expectancy* — how likely this draw is to
 * be one the player cares about — which is the whole difference between a
 * label and a tell. Colour maps to confidence, not to what the cards are:
 *
 *   white   5%
 *   blue    12%
 *   green   35%
 *   red     85%
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
 * information however it is weighted. The tier is bar, triple, double chance
 * and reply: 7.5% together, about 1 in 13.
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
 * What each colour is meant to mean: the chance the draw is in the tier, given
 * that you have seen that colour. This is the design; everything else below is
 * arithmetic in service of it.
 */
const TARGET_RELIABILITY: Record<TellRung, number> = {
  white: 0.05,
  blue: 0.12,
  green: 0.35,
  red: 0.85,
  gold: 1
};

/**
 * How tier hands distribute across the colours, in percent.
 *
 * Only the top class may show gold, and it takes a fifth rather than most of
 * them so that gold stays rarer than red — a ceiling more common than the rung
 * below it reads as broken. The `none` entries matter as much as the colours:
 * without them a dark disc would be *proof* nothing was coming. Fakes stop
 * absence being a signal in one direction; these stop it in the other.
 */
const TOP_SHARE: Weights = { gold: 22, red: 41, green: 18, blue: 6, white: 3, none: 10 };
const MID_SHARE: Weights = { red: 27, green: 32, blue: 18, white: 11, none: 12 };

/** Outcomes that make a draw worth anticipating, split by ceiling. */
const TOP_RESULTS = ["Bar", "TripleChance"] as const;
const MID_RESULTS = ["DoubleChance", "Reply"] as const;

const RUNGS: TellRung[] = ["white", "blue", "green", "red", "gold"];

/**
 * Fake rates, derived from the odds actually in force.
 *
 * Computed rather than written down, because a hard-coded table silently means
 * something different the moment the odds move — and they do move. A debug pin
 * (patchConfig.debug.forceResultProbability) reshapes the whole distribution,
 * so a ladder tuned against a pinned build reads roughly twice as strong once
 * the pin comes off. Deriving it means a test pin changes what the player
 * *sees*, never what a colour *means*.
 *
 * The arithmetic is Bayes rearranged. For a colour with share s of the tier and
 * target reliability R, against a tier of base rate D:
 *
 *   p_fake = s x (D/N) x (1-R)/R        how often it may lie
 *   fires  = s x D / R                  how often it appears at all
 *
 * The second identity is the one worth remembering: meaning and frequency are
 * the same dial pulled in opposite directions, and the only way to have both is
 * a wider tier underneath.
 */
function deriveWeights(): { top: Weights; mid: Weights; quiet: Weights } {
  const weights = getBattleResultWeights();
  const total = weights.reduce((sum, item) => sum + item.weight, 0) || 1;
  const rateOf = (names: readonly string[]) =>
    weights
      .filter((item) => names.includes(item.result))
      .reduce((sum, item) => sum + item.weight, 0) / total;

  const topRate = rateOf(TOP_RESULTS);
  const midRate = rateOf(MID_RESULTS);
  const tier = topRate + midRate;

  // No tier at all would make every reliability undefined; leave the disc dark
  // rather than divide by zero.
  if (tier <= 0) return { top: TOP_SHARE, mid: MID_SHARE, quiet: { none: 100 } };

  const rest = 1 - tier;
  const quiet: Weights = {};
  let used = 0;

  for (const rung of RUNGS) {
    const R = TARGET_RELIABILITY[rung];
    if (R >= 1) {
      quiet[rung] = 0; // gold cannot lie, so it never appears out here
      continue;
    }
    // Share of the whole tier, blending the two classes by how often each occurs.
    const share =
      (((TOP_SHARE[rung] ?? 0) / 100) * topRate +
        ((MID_SHARE[rung] ?? 0) / 100) * midRate) /
      tier;
    const fake = share * (tier / rest) * ((1 - R) / R);
    quiet[rung] = fake * 100;
    used += fake;
  }

  quiet.none = Math.max(0, (1 - used) * 100);
  return { top: TOP_SHARE, mid: MID_SHARE, quiet };
}

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
 * The middle of the tier: a double chance, or a reply.
 *
 * Reply is here for frequency, not for grandeur. At 6.2% it is the only outcome
 * common enough to give the ladder something to say — with bar, double and
 * triple alone the tier was 1.33%, and reliabilities this high left the disc
 * dark on 96% of draws. Since fires = share / reliability, the only way to hold
 * a strict ladder *and* have it speak is a wider tier underneath it.
 *
 * It earns the place on merit too: a reply makes the next draw free.
 *
 * A *single* chance is still absent. It is the most common result in the game
 * at 49% — the normal path, not a prize — and a ladder keyed to it would be a
 * ladder keyed to a coin flip. A chance *card* is likewise not an outcome:
 * cards feed chanceAttackRate and turn up in half of all hands.
 */
function isDecisive(result: BattleResult): boolean {
  return result.result === "DoubleChance" || result.result === "Reply";
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

  const weights = deriveWeights();

  if (isTopTier(input.result, killLocked)) return pick(weights.top);
  if (isDecisive(input.result)) return pick(weights.mid);
  return pick(weights.quiet);
}
