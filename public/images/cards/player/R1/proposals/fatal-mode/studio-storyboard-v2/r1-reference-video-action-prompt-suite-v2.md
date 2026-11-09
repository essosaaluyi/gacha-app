# R1 Triplets Baby Dragon

## Reference-to-Video Prompt Suite v2

Use four separately generated clips. Do not ask the model to produce the complete 15-second sequence in one generation. This keeps character count, camera direction, sonic geometry, and result-dependent editing controllable.

## Reference Attachment Order

Use the exact attachment order below so every `@Image` instruction remains unambiguous.

### Shared identity references

1. `@Image 1` - strict R1 model authority: `public/images/cards/player/R1/references/triplets-baby-dragon-character-sheet-complete-v4.png`
2. `@Image 2` - strict full-body anatomy authority: `public/images/cards/player/R1/references/triplets-baby-dragon-isolated-full-body.png`
3. `@Image 3` - style-only authority: `.codex/skills/apply-bold-graphic-cel-style/assets/r1-triplets-selected-top-right.png`

### Clip-specific references

4. `@Image 4` - the matching storyboard sheet named above each prompt
5. `@Image 5` - optional selected final frame of the preceding clip; omit for Clip A and the hard-cut victory insert

For Clip B only, the existing puff-cheek image may be attached after the storyboard as an additional pose-intent reference if the interface permits it:

`public/images/cards/player/R1/character-inserts/triplets-baby-dragon-puff-cheek-attack-upscaled.png`

Use it only for the idea of round charged cheeks. The master references still control anatomy, finish, and proportions.

## Shared Production Rules

- Output: 16:9 premium hand-drawn 2D anime action, 24 fps motion language.
- Exactly three separate wingless baby dragons whenever characters are shown.
- No enemy appears in any of these four source clips.
- Character master references override every generated continuation frame.
- Preserve lower-left to upper-right attack direction across Clips B and C.
- Use one dominant camera instruction at a time.
- Use at most one or two hand-drawn smear frames at peak acceleration.
- No long colored afterimages, optical-flow melting, frame blending, or continuous zoom blur.
- Keep matte graphic surfaces, decisive silhouettes, clean line economy, hard one- or two-step cel shadows, and restrained highlights.
- Keep 8 to 12 clean editorial handle frames at both ends of each generated source.

## Clip A - Eye Ignition And Lightning Reveal

Attach `r1-ekonte-scene-a-eye-ignition-v2.png` as `@Image 4`.

Generate approximately 5 seconds and trim the strongest 3 seconds in edit.

```text
Create a 16:9 premium hand-drawn 2D anime cutscene featuring only the R1 Triplets Baby Dragon. Follow @Image 4 as the exact six-panel shot and action order.

REFERENCE AUTHORITY
@Image 1 is the strict identity, face, markings, crystal geometry, and exactly-three-character authority. @Image 2 controls full-body anatomy and tail placement. @Image 3 controls only the bold graphic cel finish: confident thick-to-thin contours, compact designed eyes, simplified material masses, hard one- or two-step cel shadows, matte surfaces, and restrained highlights. @Image 4 controls composition, crop, camera movement, and timing. Never redesign the dragons.

CHARACTER LOCK
Show exactly three separate wingless cream-white baby dragons, each with two amber eyes, one faceted cyan forehead crystal, cyan dorsal crystals, orange inner ear fins, cyan body markings, four short legs, and one tail. No extra head, eye, dragon, tail, limb, wing, horn, egg, nest, or fused anatomy.

SHOT DESIGN
Begin on an extreme close-up containing all three heads. The center head is slightly forward. The left and right heads are deliberately cropped by the side edges, but all six closed eye lines and all three forehead crystals remain readable. Their faces fill the entire screen. The camera is completely still.

All six eyes snap open on one comic beat. Use one overshoot drawing with tiny pupils, then settle immediately to their normal amber-eye construction. Every pupil faces directly into the camera. Six small white-cyan sparks ignite at the eye corners. Thin irregular ripple contours expand from each eye pair, overlap briefly, and disappear. The ripples are open hand-drawn arcs, never perfect rings, glass circles, or eye beams.

As the eyes open, push/zoom closer toward all three faces continuously for half a second, exactly 12 frames at 24 fps. Keep the camera centered on the middle dragon while retaining both side faces. Hold every gaze directly into the lens. Then immediately perform one super-fast straight camera pull-back to a mid-shot in about eight frames. Create real parallax between the center and flanking heads. Use no more than one distortion frame and one recovery frame. Do not use a long digital zoom blur.

At the mid-shot reveal, exactly three upper bodies form a compact triangle. All three heads and all six pupils continue facing directly into the camera. Two or three vertical lightning strokes drop behind them at different depths. The lightning never touches a dragon. It creates a hard cyan-white backlight edge on their crystals, fins, cheeks, and shoulders while their faces remain readable.

The stage is featureless black with one soft translucent gray circular light area separating the trio from darkness. There is no visible spotlight cone, floor texture, horizon, scenery, fog, smoke, rocks, debris, enemy, or foreground tail.

End on a short charged mid-shot as the lightning afterglow settles. The trio keeps its direct-to-camera stare. Keep secondary ear-fin motion alive but preserve exact positions for the next cut.

STYLE AND NEGATIVES
Premium Japanese hand-drawn key-animation language, graphic timing, expressive face acting, stable model, crisp impact drawings. No glossy CGI, photorealism, plastic scales, painterly concept-art finish, cel-shading gradients, bloom, particle soup, camera orbit, camera shake, mouth attack, fire, beam, text, logo, or watermark.
```

## Clip B - Upper-Angle Inhale And Diagonal Release

Attach `r1-ekonte-scene-b-inhale-release-v2.png` as `@Image 4`. Attach Clip A's selected final frame as `@Image 5` when available.

Generate approximately 10 seconds and trim the strongest 6 seconds in edit.

```text
Create a 16:9 premium hand-drawn 2D anime cutscene featuring only the R1 Triplets Baby Dragon. Continue from @Image 5 if supplied and follow @Image 4 as the exact six-panel action, staging, and camera plan.

REFERENCE AUTHORITY
@Image 1 is the strict identity, face, markings, crystal geometry, and exactly-three-character authority. @Image 2 controls full-body anatomy and tail placement. @Image 3 controls only bold graphic cel finish. @Image 4 controls the upper-angle composition, one-second hold, teasing push-pull zoom, diagonal release path, and release camera pull-out. @Image 5 controls only the opening screen position and lighting match. Never let a generated frame override @Image 1 or @Image 2.

CHARACTER AND FORMATION LOCK
Exactly three distinct wingless R1 baby dragons in one compact triangle. The center dragon is slightly farther back. All three faces and front paws remain visible. Preserve each dragon's amber eyes, cream-white body, cyan forehead and dorsal crystals, orange inner ear fins, cyan markings, four legs, and one tail. Tails remain behind the bodies and never enter the foreground lens.

INHALE
Cut to an upper-front camera looking down about 25 degrees. The trio lowers its weight and braces its paws. Mouths seal, nostrils narrow, throats drop slightly, chests rise, and stomachs tuck inward. The camera makes one slow controlled push toward the faces while all three inhale together.

Their cheeks expand continuously into cute, clearly rounded puffs. Keep the deformation attached to the lower cheek and jaw. Preserve eye spacing, snout length, forehead width, crystal shape, and the outside skull silhouette. The cheeks must look hand-drawn and matte, not glossy rubber balls. Fine cyan suction strokes move from the frame edges toward the trio without crossing their eyes or entering their mouths as particles.

At maximum inhale, keep cheek volume constant for a full uninterrupted one-second hold. During this hold, perform a continuous teasing camera oscillation: quickly pull back a restrained 4-6 percent, push in, pull back, then push in again. Keep the optical center fixed between the three heads and preserve the upper-front angle. Ease each reversal for one frame so it reads as a playful intentional zoom wiggle, not random shake, digital jitter, or geometry warping. At the same time, the three bodies perform a tiny charged wiggle: left, right, center, settle, moving slightly against the camera pulse for elastic tension. Their feet never slide and the formation never changes. Forehead crystals pulse once in a left-center-right rhythm.

RELEASE
Continue the same teasing zoom through the release threshold with one final quick pull-back and snap-in. At the closest point, stop the body wiggle abruptly, sharpen the pupils, and compress the bodies once. Use one black-white-cyan impact drawing to break the repeating rhythm. Then make the real release camera move clearly larger and faster: the camera explodes backward and rises slightly while the dragons settle into the lower-left corner and the open attack path points toward the upper-right corner.

All three mouths open together. Their cheeks deflate back to normal over four to six frames. Forelegs lock, torsos recoil down-left, and ear fins and tails lag by two frames. Use at most two hand-drawn smear frames at peak recoil.

One shared sonic pressure front launches diagonally from lower left to upper right. It is moving compressed-air distortion, not three separate breaths. Show it with a narrow transparent refraction band, broken white pressure edges, sparse cyan cuts, and displaced background lines. The black stage collapses into a blue-cyan abstract anime stream background as the release begins. The camera pull-out eases while the sonic front accelerates beyond it and exits upper right.

SONIC NEGATIVES
No fire, laser, solid projectile core, three beams, circular ring, bubble, sphere, dome, tunnel, cone, water wave, glass wall, explosion, rocks, debris, smoke, dust, floor cracks, enemy, or environment.

STYLE NEGATIVES
No glossy CGI, plastic skin, photorealism, painterly drift, long afterimages, optical-flow melting, random camera motion, camera teleportation, extra character, fused face, foreground tail, text, logo, or watermark.
```

## Clip C - Sonic Pressure Tracking

Attach `r1-ekonte-scene-c-sonic-travel-v1.png` as `@Image 4`. Attach Clip B's selected final frame as `@Image 5` when available.

Generate approximately 5 seconds and trim the strongest 3.5 seconds in edit.

```text
Create a 16:9 premium hand-drawn 2D anime VFX tracking shot. Continue from @Image 5 if supplied and follow @Image 4 exactly. Track the R1 sonic pressure attack from its lower-left origin toward the upper-right far side of the field. No enemy appears.

REFERENCE AUTHORITY
@Image 1 and @Image 2 control R1 identity only during the brief opening origin view. @Image 3 controls the bold graphic hand-drawn finish. @Image 4 controls the complete camera path, diagonal screen direction, sonic geometry, and six action phases. @Image 5 controls only the opening motion match.

OPENING CONTINUITY
Begin near exactly three small dragons at lower left as the rear edge of their shared sonic pressure front moves away. The camera accelerates along the same lower-left to upper-right path. The dragons quickly fall behind and leave frame naturally. The camera never passes through a dragon or reverses screen direction.

SONIC GEOMETRY
The attack is a broad moving front of compressed air with no solid center. It is visible only through displaced blue stream lines, a narrow irregular transparent refraction boundary, broken condensation slashes, sparse white pressure cuts, and restrained cyan accents. Its boundary remains open beyond the frame. It never closes into a ring, sphere, bubble, dome, tunnel, cone, beam, glass wall, water wave, or explosion.

CAMERA PATH
First track from just behind and below the pressure front. The blue anime stream background has near, middle, and far layers moving at different speeds for strong parallax. Draw level and track beside the front so it crosses diagonally while short line fragments race behind it. Then accelerate ahead using the stream field as motivated visual coverage, bank gently, and look back toward the incoming pressure.

The front approaches by physical translation and scale. It does not bend around the camera. Let it overtake the lens with one asymmetric black-white-cyan impact drawing, then leave residual blue streams moving upper right as a clean editorial plate.

HIGH-SPEED RULES
Describe speed through parallax, rapid line-density changes, displaced refraction, one- or two-frame condensation flashes, and a physically continuous camera acceleration. Use no long solid or colored afterimages, no continuous motion-blur ribbon, and no random debris.

EDIT HANDOFF
The final moving abstract frame is the insertion point for a separately produced enemy block, survive, hit, or fall scene. End while the streams are still moving.

NEGATIVES
No enemy, ground, horizon, environment, rocks, dust, smoke, rubble, physical projectile object, fire, laser, ring, dome, sphere, tunnel, camera reversal, camera teleportation, text, logo, or watermark.
```

## Clip D - Optional Cute Victory Insert

Attach `r1-ekonte-scene-d-victory-insert-v1.png` as `@Image 4`. Do not attach a continuation frame; this is a deliberate hard-cut graphic insert.

Generate approximately 5 seconds and trim the strongest 2.5 seconds in edit.

```text
Create a 16:9 premium hand-drawn 2D anime victory insert featuring only the R1 Triplets Baby Dragon. Follow @Image 4 as one fixed-camera six-phase performance. This is a short video-game result cut-in, not an environment scene.

REFERENCE AUTHORITY
@Image 1 is the strict identity, face, markings, crystal geometry, and exactly-three-character authority. @Image 2 controls full-body anatomy and tail placement. @Image 3 controls only bold graphic cel finish. @Image 4 controls formation, fixed framing, action order, and poster pose.

STAGE AND CAMERA
Exactly three distinct R1 dragons are centered against a flat dark graphic field with restrained cyan and white angular accents. No text appears. The camera remains fixed at a friendly medium shot so animation comes from the characters rather than camera motion.

PERFORMANCE
Begin with the trio compressed low, then let all three pop upward together. The left dragon performs one tiny sideways hop and lands. The center dragon rises proudly, pumps both forepaws once, and gives one cheerful chirp. The right dragon performs one quick hip-and-tail wiggle, keeping its tail behind the group and away from the lens. The other two remain alive with small reaction bobs during each featured move.

Finish with all three hopping inward into a compact triangular group pose, touching shoulders or cheeks. Use one squash drawing and one overshoot drawing. Add only two or three small graphic starbursts, then hold the final readable trio silhouette with one settling ear-fin bounce and a restrained eye sparkle.

CHARACTER LOCK
Preserve exactly three cream-white bodies, six amber eyes, three faceted cyan forehead crystals, cyan dorsal crystals and markings, orange inner ear fins, twelve legs total, and three tails total. No wings, egg, nest, extra dragon, duplicated head, fused body, missing limb, or foreground tail.

STYLE AND NEGATIVES
Premium hand-drawn game cut-in, crisp expressive timing, matte graphic cel surfaces, hard shadows, stable linework, limited purposeful effects. No glossy CGI, photorealism, plastic scales, confetti cloud, particle soup, camera orbit, camera shake, scenery, floor texture, enemy, attack effect, text, logo, or watermark.
```

## Final Assembly

- `00:00-03:00`: Clip A, extreme face hook through lightning mid-shot.
- `03:00-09:00`: Clip B, upper-angle inhale through diagonal release.
- `09:00-12:12`: Clip C, sonic pressure tracking and enemy-scene handoff.
- Insert the appropriate enemy block, survive, hit, or fall clip after Clip C when battle logic requires it.
- Use Clip D as a separate 2.5-second result insert only when celebration is appropriate.

For a strict 15-second player-only preview, place Clip D directly after Clip C. For the game pipeline, do not bake Clip D into the attack asset.

## Generation Acceptance Checklist

- Exactly three dragons in every character shot.
- Opening close-up contains three heads and six eyes, with side faces intentionally cropped.
- Eye sparks and ripples are brief accents, not beams or perfect rings.
- Fast pull-out resolves into a clean mid-shot without face melting.
- Lightning remains behind the trio and produces readable backlight.
- Black stage has a gray circular light area and no visible cone.
- Upper-angle inhale holds maximum cheek volume for one full second.
- Cheeks are cute and round while skull, snout, eyes, and crystals remain stable.
- Release direction remains lower left to upper right.
- Blue abstract stream background contains no realistic environment or ground.
- Sonic pressure has no solid core and never becomes a beam, ring, bubble, dome, sphere, or tunnel.
- Travel camera follows one physically continuous path and never reverses direction.
- Victory insert is separately usable and contains a clean final poster pose.
