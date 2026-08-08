// Spam guard for the normal-battle draw.
//
// When old cards are still on the table the draw defers the new hand by 750ms
// while they fade out, and only marks cardsAreOut inside that callback. That
// leaves a window where neither `cardsAreOut` nor the Pixi button state can be
// trusted to reject a second press, and the deferred fade tweens are driving
// the very sprites the next hand reuses — so a press landing in that window
// could fade a card to nothing after it had already been dealt.
//
// `active` closes the window; `token` invalidates the timers of a press that
// has been superseded so they cannot touch a newer hand's sprites.
//
// Lives in state/ rather than beside the handler so resetBattleRun can clear it
// without state/ having to import stage/.

let active = false;
let token = 0;

export function isDrawSequenceActive() {
  return active;
}

/** Marks the draw committed and returns the token identifying this sequence. */
export function beginDrawSequence() {
  active = true;
  token += 1;
  return token;
}

export function isDrawSequenceCurrent(sequenceToken: number) {
  return sequenceToken === token;
}

export function endDrawSequence() {
  active = false;
}

/** Clears the guard on run reset/quit so a stale lock cannot wedge the button. */
export function resetDrawSequenceGuard() {
  active = false;
  token += 1;
}
