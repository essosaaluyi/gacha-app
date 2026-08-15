// Snapshot of a finished battle run, handed to /battle-result.
//
// The result screen cannot read the live battle stores: the run is torn down
// (clearBattleSession, resetBattleRun) before the navigation completes, and
// router.push carries no state. So the ending path snapshots the numbers while
// they are still true, and the result screen picks the snapshot up.
//
// Persisted to sessionStorage rather than kept in memory, because /battle-result
// is a separate route: a full page load there would otherwise start with an
// empty module and render zeros -- which is exactly the bug this replaces.

const STORAGE_KEY = "battle_run_summary";

export type BattleRunSummary = {
  /** Round reached, 1-based -- the round the player was on when the run ended. */
  round: number;
  /** Draws taken this run. */
  gamesPlayed: number;
  /** Enemies actually defeated this run, counted from real defeat events. */
  enemiesDefeated: number;
  /** Points earned across the run, net of draw costs. */
  pointsEarned: number;
  /** Cards revealed: every draw lays out CARDS_PER_DRAW slots. */
  cardsDrawn: number;
  /** How the run ended, so the screen can word itself appropriately. */
  ending: BattleRunEnding;
};

export type BattleRunEnding = "quit" | "gameOver" | "defeat";

/** Every draw reveals three slots -- see the draw handler and how-to-play. */
export const CARDS_PER_DRAW = 3;

const EMPTY: BattleRunSummary = {
  round: 1,
  gamesPlayed: 0,
  enemiesDefeated: 0,
  pointsEarned: 0,
  cardsDrawn: 0,
  ending: "quit",
};

export function saveBattleRunSummary(summary: BattleRunSummary) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
  } catch {
    // Private-mode / quota failures must not block the player leaving a run.
  }
}

/**
 * Reads the pending summary. Returns null when there is none, so the screen can
 * tell "run ended with nothing" apart from "arrived here directly".
 */
export function readBattleRunSummary(): BattleRunSummary | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BattleRunSummary>;

    return {
      round: Number(parsed.round) || EMPTY.round,
      gamesPlayed: Number(parsed.gamesPlayed) || 0,
      enemiesDefeated: Number(parsed.enemiesDefeated) || 0,
      pointsEarned: Number(parsed.pointsEarned) || 0,
      cardsDrawn: Number(parsed.cardsDrawn) || 0,
      ending: (parsed.ending as BattleRunEnding) ?? EMPTY.ending,
    };
  } catch {
    return null;
  }
}

export function clearBattleRunSummary() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do -- a stale summary is harmless next run.
  }
}
