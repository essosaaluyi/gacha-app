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
| White | 5.1% | 1 in 67 draws | no |
| Blue | 11.2% | 1 in 91 | no |
| Green | 32.4% | 1 in 113 | yes |
| Red | 84.6% | 1 in 180 | yes |
| Gold | 100% | 1 in 531 | yes |
| *dark* | 0.1% | 96% of draws | — |

**Anticipation level** is the chance the draw is in the rare tier once you have
seen that colour. **Odds** is how often the colour appears at all. Both are
measured, not asserted — `npx tsx tools/ladder-check.mjs`.

Every rung carries real weight here: even white, the floor, means four times
the base rate. Nothing in this ladder is noise.

The cost is presence. **The disc is dark on 96% of draws** — one cue every 24.
That is not a tuning failure but the identity below: a colour fires as often as
its share of the tier divided by its reliability, so meaning and frequency are
one dial pulled in opposite directions.

The only way to hold these meanings *and* have the disc speak often is to widen
what it predicts. See "Widening the tier".

One ladder for the whole game. A colour means the same thing in every phase,
including fatal mode.

### Widening the tier

Loosening the reliabilities was tried and rejected: at white 0.5 / blue 2 /
green 10 / red 50 the disc spoke on a quarter of draws, but the low rungs meant
nothing, which is what the ladder exists to avoid.

The real lever is the tier's width. Same reliabilities as above, but adding
Reply (6.2%) to what the ladder predicts:

| | tier 1.33% | tier 7.5% (+Reply) |
| --- | --- | --- |
| white | 1.5% | 8.7% |
| blue | 1.1% | 6.4% |
| green | 0.9% | 4.9% |
| red | 0.6% | 3.2% |
| any cue | 4.2% | 24% |

Every colour keeps its meaning and the disc speaks five times as often. Gold is
the exception and always will be: reserved for bar, triple and locked kills, its
rate is bounded by their rarity rather than by the ladder.

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

## Where the numbers come from

Nothing here is tuned by hand. Pick the reliability you want a colour to carry
and its fake rate is forced:

```
p_fake = p_real x (D/N) x (1-R)/R      fires = p_real x D / R
```

D is the tier's base rate (1.33%), N its complement, p_real the share of tier
hands showing that colour, R the reliability. The second identity is the one
that matters: **how often a colour fires is its share of the tier divided by
its reliability.** Meaning and frequency are the same dial pulled in opposite
directions, and no amount of weighting escapes it.

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
| 5 | Can red lie? | Yes — later loosened to a 49% coin flip |
| 6 | Green's reliability | 30–40%, later loosened to 9% |
| 7 | What counts as decisive? | Chance, bar chance, and a predetermined enemy defeat |
| 8 | Phase-aware or universal? | Universal — one ladder everywhere |
| 9 | What does gold guarantee? | The top end only: triple, bar, or a kill |
| 10 | Fatal mode, kill locked | Gold is honest there; no separate table |
| 11 | Is a single chance a prize? | No — stays outside the tier |
| 12 | Does surviving an enemy attack count? | No — the tier is upside only |
| 13 | Meaning or presence? | Presence — loosen the ladder so colours are actually seen |

## Still open

Nothing. The ladder is fully specified.

What is *not* settled is whether it feels right in the hand — the numbers are
verified, the pacing is not. Worth watching for once it has been played:

- Does white on one draw in six read as ambient life, or as a cue that cried
  wolf so often the player stops looking?
- Is red at 49% exciting or merely frustrating? It is designed to disappoint
  half the time.
- Green is 1 in 33 and means 9%. Does a rung that says "probably not" earn its
  place, or should it be folded into blue?

## Testing

Dev server only:

- `?vfx-tell=gold` — pin every draw to one rung
- `?triple-chance=true` · `?attack-target=true` — force a hand
- `/effect-test/deck` — every rung on a stand-in disc
