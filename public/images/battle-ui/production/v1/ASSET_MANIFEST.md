# Battle UI Production Asset Manifest V1

Source of truth: `PROJECT_BIBLE.md`

Visual target: premium anime cel-shaded fantasy RPG UI with Japanese smart-slot / pachislot battle presentation. All final files use transparent backgrounds and must be rendered directly without CSS recreation of their metalwork, bevels, lighting, or ornament.

## Crown Ledger Points Plaque

- Asset name: Crown Ledger Points Plaque
- Purpose: Persistent top-left player points and reward-total housing.
- Prompt: Empty two-zone blackened-steel and midnight-navy glass score plaque with champagne-gold trim, engraved row separator, and restrained cyan glints; front-on premium fantasy pachislot HUD artwork.
- Negative prompt: Text, numbers, icons, generic rounded card, SaaS UI, purple-dominant palette, excessive ornament, perspective, blur, cropped edges.
- Aspect ratio: Approximately 3.2:1.
- Background requirement: Transparent outside; dark navy display fields remain opaque.
- Filename: `transparent/points-plaque-frame-v1.png`
- Developer notes: Preserve aspect ratio. Overlay labels and Crown Ledger digit tiles in fixed internal zones.

## Crown Ledger Numerals

- Asset name: Crown Ledger Numerals 0-9
- Purpose: Player points and reserved premium score values.
- Prompt: Ivory enamel fantasy numerals with champagne-gold bevel, navy-black depth, and a small emerald terminal jewel; elegant and highly readable.
- Negative prompt: Missing or repeated digits, cheap casino font, bubbly glyphs, unreadable filigree, overlapping or cropped glyphs.
- Aspect ratio: Individual normalized tiles are 1:1.
- Background requirement: Fully transparent.
- Filename: `transparent/digits/crown-ledger/crown-ledger-digit-{0..9}-v1.png`
- Developer notes: Each tile is 512x512. Compose values from individual image glyphs; retain hidden accessible text.

## Aether Stage Roadmap

- Asset name: Aether Seven-Stage Roadmap
- Purpose: Persistent stage progress display from stage 1 through stage 7.
- Prompt: Slender navy-glass fantasy rail with antique-gold framing, blackened-steel hardware, silver bezels, cyan energy groove, and exactly seven evenly spaced empty station sockets.
- Negative prompt: More or fewer than seven stations, mobile progress bar, baked labels, filled states, perspective, cropped ends.
- Aspect ratio: Approximately 8.8:1 after transparent trimming.
- Background requirement: Transparent outside; socket interiors remain dark navy.
- Filename: `transparent/aether-stage-roadmap-seven-frame-v2.png`
- Developer notes: Overlay the fixed sequence 1, 2, 3, 4, 5, 6, 7. Only the active stage receives a small NOW marker. Do not show a separate NEXT label.

## Rune LED Game Counter Plaque

- Asset name: Rune LED Game Counter Plaque
- Purpose: Persistent top-right machine and game-data housing.
- Prompt: Graphite and silver technical cabinet frame with navy display glass, cyan light rails, and a restrained amber status slot; clean fantasy-machine hybrid.
- Negative prompt: Text, digits, generic sci-fi hologram, green reflections, mobile card, perspective, blur.
- Aspect ratio: Approximately 2.35:1.
- Background requirement: Transparent outside; navy display field remains opaque.
- Filename: `transparent/game-counter-plaque-frame-v1.png`
- Developer notes: Preserve the cyan rails and amber slot. Overlay Rune LED digit tiles in the central field.

## Rune LED Numerals

- Asset name: Rune LED Numerals 0-9
- Purpose: Game count and technical machine data.
- Prompt: Condensed geometric pearl-white numerals with graphite bevel, icy-cyan inline, and a small amber terminal notch; precise and readable.
- Negative prompt: Seven-segment calculator font, generic sans serif, ornate medieval type, jagged damage, overlapping or cropped glyphs.
- Aspect ratio: Individual normalized tiles are 1:1.
- Background requirement: Fully transparent.
- Filename: `transparent/digits/rune-led/rune-led-digit-{0..9}-v1.png`
- Developer notes: Each tile is 512x512. Use stable image height and hidden accessible text.

## Rift Fang Threat Ring

- Asset name: Rift Fang Enemy Threat Ring
- Purpose: Center enemy attack countdown and continue-pressure emphasis.
- Prompt: Incomplete circular halo of irregular obsidian and blackened-steel armor shards with a hot crimson-magenta inner edge and sparse icy-cyan glints.
- Negative prompt: Number, text, complete smooth neon circle, skull, particles, green reflections, perspective, cropped ring.
- Aspect ratio: 1:1.
- Background requirement: Fully transparent outside and through the center opening.
- Filename: `transparent/enemy-threat-ring-frame-v1.png`
- Developer notes: Place one Rift Fang digit tile in the center. Do not rebuild the ring with CSS borders.

## Rift Fang Numerals

- Asset name: Rift Fang Numerals 0-9
- Purpose: Enemy attack countdown and defeat continue countdown.
- Prompt: Sharp chipped-silver warrior numerals with obsidian bevels, crimson inner cuts, restrained magenta energy, and icy specular points.
- Negative prompt: Cute rounded font, generic digital clock, unreadable spikes, missing digits, overlapping or cropped glyphs.
- Aspect ratio: Individual normalized tiles are 1:1.
- Background requirement: Fully transparent.
- Filename: `transparent/digits/rift-fang/rift-fang-digit-{0..9}-v1.png`
- Developer notes: Each tile is 512x512. Keep the digit large and centered within the threat ring.

## Event Ticker Frame

- Asset name: Two-Line Battle Event Ticker
- Purpose: Compact persistent battle log for two short event lines.
- Prompt: Blackened-steel and antique-gold two-row ticker with navy glass fields, engraved gold separator, cyan left indicator, and amber right status notch.
- Negative prompt: Notification card, text, icons, rounded mobile UI, giant gems, parchment, perspective, blur.
- Aspect ratio: Approximately 3.7:1 after trimming.
- Background requirement: Transparent outside; both navy fields remain opaque.
- Filename: `transparent/event-ticker-frame-v1.png`
- Developer notes: Use restrained ivory/cyan live text. Keep each line inside its own field.

## Jackpot Relic Bonus Plaque

- Asset name: Jackpot Relic Bonus Total Plaque
- Purpose: Main dynamic points total on the bonus result screen.
- Prompt: Grand blackened-metal and champagne-gold victory plaque with burgundy-to-navy glass, ivory inlays, and a ruby relic crest.
- Negative prompt: Text, numbers, Las Vegas bulbs, cheap yellow gradient, excessive jewels, generic modal, perspective, blur.
- Aspect ratio: Approximately 2.5:1 after trimming.
- Background requirement: Transparent outside; central result field remains opaque.
- Filename: `transparent/bonus-total-plaque-frame-v1.png`
- Developer notes: Preserve the existing result background. Center Jackpot Relic digit tiles in the dark field.

## Jackpot Relic Numerals

- Asset name: Jackpot Relic Numerals 0-9
- Purpose: Large celebratory bonus result total.
- Prompt: Broad heroic ivory numerals with rich gold bevel, blackened-metal depth, engraved face detail, and a ruby terminal facet.
- Negative prompt: Marquee bulbs, cheap casino lettering, missing digits, overlapping glyphs, excessive glow, cropped glyphs.
- Aspect ratio: Individual normalized tiles are 1:1.
- Background requirement: Fully transparent.
- Filename: `transparent/digits/jackpot-relic/jackpot-relic-digit-{0..9}-v1.png`
- Developer notes: Each tile is 512x512. Keep the composed value visually dominant but inside the plaque field.

## Player Defeated Overlay Frame

- Asset name: Player Defeated Continue Frame
- Purpose: Full defeat-state panel containing title, continue pressure, and actions.
- Prompt: Open fortress-jaw frame of chipped gunmetal, blackened steel, dark crimson fracture channels, cold-silver inner rim, and a smoky burgundy-black central field.
- Negative prompt: Victory gold, generic modal, rounded card, skull, gore, text, icons, perspective, blur.
- Aspect ratio: Approximately 1.8:1.
- Background requirement: Transparent outside; central dark field remains opaque.
- Filename: `transparent/player-defeated-overlay-frame-v1.png`
- Developer notes: Keep actions quiet and low in the panel. Reuse Rift Fang ring and digits for the continue countdown.

## Player Defeated Title

- Asset name: Player Defeated Title Lockup
- Purpose: Static premium defeat headline.
- Prompt: Exact two-line uppercase title PLAYER / DEFEATED, cold chipped-silver armor lettering with blackened depth, restrained crimson fractures, icy edge glints, and a thin crimson separator.
- Negative prompt: Misspelling, extra text, unreadable blackletter, gold victory treatment, perspective, crop, glow cloud.
- Aspect ratio: Approximately 3.4:1 after trimming.
- Background requirement: Fully transparent.
- Filename: `transparent/player-defeated-title-v1.png`
- Developer notes: Render the artwork directly and provide an accessible text equivalent; do not recreate it with a browser font.
