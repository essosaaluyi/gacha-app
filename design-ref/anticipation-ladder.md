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
| White | 4.8% | 1 in 7 draws | no |
| Blue | 12.2% | 1 in 10 | no |
| Green | 35.3% | 1 in 15 | yes |
| Red | 84.9% | 1 in 40 | yes |
| Gold | 100% | 1 in 556 | yes |
| *dark* | 1.4% | 2 in 3 draws | — |

**Anticipation level** is the chance the draw is in the tier once you have seen
that colour. **Odds** is how often the colour appears at all. Both measured, not
asserted — `npx tsx tools/ladder-check.mjs`.

Read it as a sentence: white turns up every seventh draw and means very little.
Green turns up every fifteenth and is a real maybe. Red turns up once or twice
a session and is nearly always right. Gold turns up once in five hundred and
has never been wrong.

One ladder for the whole game. A colour means the same thing in every phase,
including fatal mode.

### The one identity that governs all of this

```
fires = share of the tier / reliability
```

Meaning and frequency are the same dial pulled in opposite directions. A strict
ladder on a narrow tier goes dark; a busy ladder on a narrow tier means nothing.
The only escape is a **wider tier**, which is why reply was added to it.

That is also why gold sits at 1 in 556 and cannot be moved by tuning. At 100%
reliability its rate is exactly the top tier's rarity — bar, triple and locked
kills, 0.87% — and no weighting changes that.

### How it got here

| Version | Tier | Any cue | Red means | Verdict |
| --- | --- | --- | --- | --- |
| tight | 1.33% | 5.2% | 90% | too dark to ever be learned |
| loose | 1.33% | 26.6% | 49% | present, but red stopped meaning much |
| **current** | **7.5%** | **35%** | **85%** | strict *and* present |

## What it predicts

**The tier — 7.5%, about 1 in 13.**

| Tier | Outcomes | Rate | Ceiling |
| --- | --- | --- | --- |
| Top | Triple chance · Bar · a locked kill | 0.87% | gold |
| Middle | Double chance · Reply | 6.7% | red |

Everything else — single chance, attack, coin, defense, empty — is outside it.
Any cue on those hands is a fake.

Reply is in the tier for frequency as much as for merit: at 6.2% it is the only
outcome common enough to give a strict ladder something to say. It earns its
place on merit too — a reply makes the next draw free.

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
weighted** — the ladder needs something rare enough underneath it or the whole
span collapses. Bar, triple and double chance qualify on rarity; reply joins
them because rarity alone left the tier too narrow to light the disc.

Note also that a chance *card* is not a chance *result*. Cards feed
`chanceAttackRate` and appear in about half of all hands.

## Where the numbers come from

Nothing here is tuned by hand. Pick the reliability you want a colour to carry
and its fake rate is forced:

```
p_fake = p_real x (D/N) x (1-R)/R      fires = p_real x D / R
```

D is the tier's base rate (7.5%), N its complement, p_real the share of tier
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
| 13 | Meaning or presence? | Both — keep strict reliabilities, widen the tier instead |
| 14 | Does reply join the tier? | Yes — it is what makes a strict ladder viable |

## Still open

Nothing. The ladder is fully specified.

What is *not* settled is whether it feels right in the hand — the numbers are
verified, the pacing is not. Worth watching for once it has been played:

- Does white on one draw in seven read as ambient life, or as noise?
- Red is 1 in 40 and right 85% of the time. Often enough to be learned?
- Most reds and greens now resolve to a reply — a free draw, not a jackpot.
  Does the ladder feel like it over-promises once players notice that?

## Testing

- `?vfx-tell=gold` — pin every draw to one rung. Works in production too: it
  forces the display and leaves the hand alone, so it removes the cue's
  information rather than leaking any.
- `?triple-chance=true` · `?attack-target=true` — force a hand. Dev server only.
- `/effect-test/deck` — every rung on a stand-in disc.
- `npx tsx tools/draw-trace.mjs 100` — 100 draws with the rung and the hand
  side by side.
