# R4 Young Knight Player Fatal Mode Opening Insert

Canvas: 1250 x 618

Classification: Player Fatal Mode opening insert, work in progress.

Current visual direction: `monochrome-sweep-v2/`. The earlier metallic and colored
holographic files in this folder are retained only for comparison.

This is not an attack-fakeout dialogue box. It is the temporary 1G presentation
that announces entry into the player's Fatal Mode.

The earlier colored layer package in this parent folder is retained only for
comparison. Do not use it for current motion implementation.

Display title: `DESTINY BATTLE`

`DESTINY BATTLE` is the approved mode title for this insert. The previous
Legendary working text has been removed and must not be restored. This title is
not an R4 character phrase and must not enter the attack-fakeout dialogue system.

Current motion authority:

`monochrome-sweep-v2/R4_MONOCHROME_SWEEP_V2_MOTION_SPEC.md`

The V4/V5 diagonal machine-gun specifications and previews are comparison history
only. V2's horizontal four-frame mask is selected.

## Current render stack

1. `monochrome-sweep-v2/04-composite-positive.png` - base plate, Normal, 100%
2. `monochrome-sweep-v2/08-composite-negative.png` - masked reveal plate,
   Normal, 100%
3. `07-energy-divider.png` - animated transparent foreground
4. `monochrome-sweep-v2/09-foreground-foil-monochrome-holographic-v2.png` -
   animated black/white holographic foreground

All four files use the complete 1250 x 618 canvas. Keep them pixel-registered and
never independently scale, crop, or reposition them. The divider and foil animate
above whichever monochrome plate is currently revealed.

## Animation notes

- Close staggered left/right plate shards toward the center.
- Trigger the only full-frame white flash when both sides contact.
- Run four alternating horizontal mask reveals from bottom to top.
- Complete each flip in four frames at 30 fps, for a sixteen-frame burst.
- Use a narrow 14 px smooth feather; do not dissolve plate opacity.
- Animate the energy divider with segmented electrical jitter and brightness
  pulses above the alternating plates.
- Animate a black/white reflective shimmer through the corrected monochrome foil.
- Use a clearly visible 11 px corner RGB split during the inversion burst and a
  5-7 px pulse during the extended hold.
- Hold the complete positive plate after the fourth sweep until the total
  presentation reaches approximately 2.93 seconds.
- Keep the entire insert temporary over the existing battle layout.

Do not use hue rotation, cyan/gold/rainbow coloring, Screen/Add blending, colored
bloom, or a broad white holographic band for the plate transition. The supplied
energy divider and foreground foil are approved fixed color accents.

## Motion preview

- `monochrome-sweep-v2/r4-monochrome-v2-selected-extended-v6.webp` -
  current 30 fps review animation
- `monochrome-sweep-v2/r4-monochrome-v2-selected-extended-keyframes-v6.jpg`
- `monochrome-sweep-v2/r4-monochrome-diagonal-animated-divider-bwfoil-strong-ca-v5.webp` -
  rejected diagonal comparison
- `monochrome-sweep-v2/r4-monochrome-diagonal-soft-machinegun-v4.webp` -
  superseded short-duration comparison
- `monochrome-sweep-v2/r4-monochrome-mask-sweep-energy-foil-ca-v3.webp` -
  superseded horizontal comparison
- `monochrome-sweep-v2/r4-monochrome-plate-comparison.jpg`
