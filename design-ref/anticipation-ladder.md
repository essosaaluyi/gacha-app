# The anticipation ladder

How the card holder tells the player something is coming, and how much to trust it.

Modelled on pachinko 信頼度 (reliability), where a cue's meaning is defined as
the ratio of how often it appears on a win versus on a loss. A colour is not a
label for an outcome — it is a statement of confidence.

Implementation: `lib/battle-pixi/presentation/drawTell.ts`
Measurement: `npx tsx tools/ladder-check.mjs`

---

## The ladder

| Colour | Anticipation level | Odds of seeing it | Gets arcs |
| --- | --- | --- | --- |
| White | 0.5% | 1 in 6 draws | no |
| Blue | 1.8% | 1 in 14 | no |
| Green | 9.4% | 1 in 33 | yes |
| Red | 49% | 1 in 105 | yes |
| Gold | 100% | 1 in 515 | yes |
| *dark* | 0.2% | 3 in 4 draws | — |

**Anticipation level** is the chance the draw is in the rare tier once you have
seen that colour. **Odds** is how often the colour appears at all. Both are
measured, not asserted — `npx tsx tools/ladder-check.mjs`.

Read it as a sentence: white shows up every sixth draw and means nothing. Red
shows up twice a session and is a coin flip. Gold shows up once in five hundred
and has never once been wrong.

Two rungs do the work. **Red is the sweat rung** — at 49% it is genuinely
uncertain, which is where tension lives; a rung that is nearly always right is
an announcement, not a thrill. **Gold is the payoff rung** — it cannot lie, so
seeing it is the moment the player already knows.

One ladder for the whole game. A colour means the same thing in every phase,
including fatal mode.

### Why not a tighter ladder

An earlier draft ran white 2% / blue 5% / green 35% / red 90%. It was more
*meaningful* per sighting and much deader to play: a cue on 5% of draws, and a
player could go a hundred draws seeing nothing above blue.

Loosening trades meaning for presence, and the trade is worth making because
the meaning was wasted on cues nobody ever saw. Note what it does **not** buy:

| | tight | loose |
| --- | --- | --- |
| any cue, per 100 draws | 5.2 | 26.6 |
| green | 0.7 | 3.0 |
| red | 0.6 | 1.0 |
| **gold** | **0.3** | **0.2** |

Gold does not move. It is pinned at 100% reliability, so its rate is set purely
by how rare the tier is — 1.33%. The only way to see gold more often is to
widen the tier, never to loosen the ladder.

## What it predicts

**Decisive tier — 1.33%, about 1 in 75.**

| Tier | Outcomes | Ceiling |
| --- | --- | --- |
| Top | Triple chance · Bar · a locked kill | gold |
| Middle | Double chance | red |

Everything else — single chance, attack, reply, coin, defense, empty — is
outside the tier. Any cue on those hands is a fake.

A **locked kill** is a fatal-mode last turn where a hit has already registered,
so the enemy's death is settled before a card moves. Gold is honest there.

## Why these outcomes

The shipped odds are not `battleResultOdds`. `patchConfig` reshapes the table,
and the real distribution over 200k draws is:

| Result | Spreadsheet | Actual |
| --- | --- | --- |
| SingleChance | 2.7% | **49.0%** |
| Attack | 50% | 25.2% |
| Empty | ~25% | 13.8% |
| Reply | 12.5% | 6.2% |
| Coin | 4.5% | 2.3% |
| Defense | 4.2% | 2.1% |
| Bar | 0.1% | 0.80% |
| DoubleChance | 0.88% | 0.47% |
| TripleChance | 0.125% | 0.067% |

So a single chance is the common path, not a prize, and an attack is not rare
either. **A cue built on a coin flip carries no information however it is
weighted** — the ladder needs a rare event underneath it or the whole span
collapses. Bar, double and triple are the only outcomes rare enough.

Note also that a chance *card* is not a chance *result*. Cards feed
`chanceAttackRate` and appear in about half of all hands.

## Why the disc is quiet

A cue appears on roughly 8% of draws. That is forced arithmetic, not taste:

```
p_fake = p_real x (D/N) x (1-R)/R
```

Holding white at 2% reliability against a 1.33% base rate means white can fire
on about 4% of draws and no more. Making the disc busier means accepting weaker
reliabilities. A ladder that lit up half the time would mean nothing.

## Both directions of silence

- **Low rungs fire on dead hands.** Without fakes, any cue would guarantee
  something good, and a dark disc would guarantee a dead one — the machine
  would telegraph disappointment. Pachinko calls these ガセ and treats them as
  load-bearing.
- **The rare tier sometimes stays dark.** Without that, a dark disc would be
  *proof* nothing was coming. Both silences are designed.

## Decisions taken

| # | Question | Decision |
| --- | --- | --- |
| 1 | What should the colour predict? | The rare tier, not attack-on-target |
| 2 | What does an attack get? | Joins the bottom of the same ladder — white, blue and green |
| 3 | Can low rungs fire on nothing hands? | Yes, on all three |
| 4 | How far does the ladder span? | Full range, gold means certain |
| 5 | Can red lie? | Yes — right 90% of the time |
| 6 | Green's reliability | 30–40% (set to 35%) |
| 7 | What counts as decisive? | Chance, bar chance, and a predetermined enemy defeat |
| 8 | Phase-aware or universal? | Universal — one ladder everywhere |
| 9 | What does gold guarantee? | The top end only: triple, bar, or a kill |
| 10 | Fatal mode, kill locked | Gold is honest there; no separate table |
| 11 | Is a single chance a prize? | No — stays outside the tier |
| 12 | Does surviving an enemy attack count? | No — the tier is upside only |

## Still open

Nothing. The ladder is fully specified.

What is *not* settled is whether it feels right in the hand — the numbers are
verified, the pacing is not. Worth watching for once it has been played:

- Does a dark disc on 92% of draws read as broken rather than as quiet?
- Is red distinguishable from gold in the moment, given both mean "almost
  certainly"?
- Does anyone learn white and blue at all, or are they just noise?

## Testing

Dev server only:

- `?vfx-tell=gold` — pin every draw to one rung
- `?triple-chance=true` · `?attack-target=true` — force a hand
- `/effect-test/deck` — every rung on a stand-in disc
