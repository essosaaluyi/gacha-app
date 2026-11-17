# キャラクター別アニメーション制作資料

2026-11-17。SR1〜UR3の11体を対象とする。カードの記述は現行カード絵の目視。

## 制作対象と原本

制作順の指定があるローカル原本は不明。下記はロスター監査の掲載順。指定の [Claude計画書](https://claude.ai/artifact/VvA4E7z1Y9kK6NuYEexGyN) は取得できず、計画書上の優先順は不明。

## ロスター監査の原文

元ファイル `outputs/master-pack-roster-audit/MASTER_PACK_ROSTER_AUDIT.md`

# Character Master Pack Roster Audit

- Characters checked: 28
- Passed: 28
- Failed: 0
- Runtime card assets modified by this audit: no

| Roster | ID | Status | Missing files | Placeholder docs |
|---|---|---:|---:|---:|
| player | R1 | PASS | 0 | 0 |
| player | R2 | PASS | 0 | 0 |
| player | R3 | PASS | 0 | 0 |
| player | R4 | PASS | 0 | 0 |
| player | SR1 | PASS | 0 | 0 |
| player | SR2 | PASS | 0 | 0 |
| player | SR3 | PASS | 0 | 0 |
| player | SR4 | PASS | 0 | 0 |
| player | SSR1 | PASS | 0 | 0 |
| player | SSR2 | PASS | 0 | 0 |
| player | SSR3 | PASS | 0 | 0 |
| player | SSR4 | PASS | 0 | 0 |
| player | UR1 | PASS | 0 | 0 |
| player | UR2 | PASS | 0 | 0 |
| player | UR3 | PASS | 0 | 0 |
| enemy | enemy1 | PASS | 0 | 0 |
| enemy | enemy10 | PASS | 0 | 0 |
| enemy | enemy11 | PASS | 0 | 0 |
| enemy | enemy12 | PASS | 0 | 0 |
| enemy | enemy13 | PASS | 0 | 0 |
| enemy | enemy2 | PASS | 0 | 0 |
| enemy | enemy3 | PASS | 0 | 0 |
| enemy | enemy4 | PASS | 0 | 0 |
| enemy | enemy5 | PASS | 0 | 0 |
| enemy | enemy6 | PASS | 0 | 0 |
| enemy | enemy7 | PASS | 0 | 0 |
| enemy | enemy8 | PASS | 0 | 0 |
| enemy | enemy9 | PASS | 0 | 0 |

~~~~

### 現行の名称表から対象11体を原文転記

元ファイル `lib/battle-pixi/config/characterNames.ts`

```ts
  SR1: "Necro Runner",
  SR2: "Red Torn Dragon",
  SR3: "Vigilante",
  SR4: "Night Crawler",
  SSR1: "Great Thunder Dragon",
  SSR2: "Blood Man",
  SSR3: "Ghost of Emperor",
  SSR4: "White Sword Man",
  UR1: "Mami",
  UR2: "Double Striker",
  UR3: "Abandoned Doll",
```

## 状況の読み方

待機の「済」は現行プリセットと静止フレームを確認したもの。新規制作版の承認は不明。攻撃の「作りかけ」は候補静止画を確認した段階。Fatal Mode専用の攻撃動画登録はR1のみ、寸前の動画登録はEnemy 1のみ（`lib/battle-pixi/state/fatalAttackCutStore.ts`）。素材や進捗の裏付けが見つからない場合は「不明」。

## SR1 / Necro Runner

- 髪と目元は深いフードの影で不明。
- 痩せた人型で、黒〜深い紺の裂けたローブをまとい、裾が鋭く広がる。
- 長い杖を持ち、輪郭に赤紫の光が走る。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 作りかけ（カットイン静止画・案あり。完成動画は不明） ／ 寸前 不明。

**参照**

- `public/images/cards/player/SR1/card.webp`
- `public/images/battle-characters/necro-runner/idle/000.png`
- `outputs/email-player-master-pack-visuals/SR1-Necro-Runner-master-visual.jpg`
- `public/images/cards/player/SR1/NECRO RUNNER.md`
- `public/images/cards/player/SR1/character-inserts/necro-runner-forward-closeup-attack-proposal-sheet-v2-premium-celshade.png`
- `public/images/cards/player/SR1/character-inserts/necro-runner-forward-closeup-attack-proposal-sheet-v3-true-anime-celshade.png`
- `public/images/cards/player/SR1/character-inserts/necro-runner-forward-closeup-attack-proposal-sheet.png`
- `public/images/cards/player/SR1/character-inserts/necro-runner-staff-thrust-closeup-premium-anime-hdr-upscale.png`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-SR1-faceoff-two-hand-horizontal-premium-cel-v4-1920x1080.png`

### 過去プロンプト

不明。

## SR2 / Red Torn Dragon

- 白い鱗と赤い角・棘・爪を持つ細身のドラゴン。
- 顔は細長く下を向き、首から尾まで長くしなる。
- 翼膜は緑青で縁に白と赤。武器は見当たらず、牙と爪が目立つ。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 作りかけ（カットイン静止画・案あり。完成動画は不明） ／ 寸前 不明。

**参照**

- `public/images/cards/player/SR2/card.webp`
- `public/images/battle-characters/red-torn-dragon/idle/000.png`
- `outputs/email-player-master-pack-visuals/SR2-Red-Torn-Dragon-master-visual.jpg`
- `public/images/cards/player/SR2/RED TORN DRAGON.md`
- `public/images/cards/player/SR2/character-inserts/red-torn-dragon-forward-closeup-cut-in-idea-sheet-v1.png`
- `public/images/cards/player/SR2/character-inserts/red-torn-dragon-pounce-closeup-premium-anime-hdr-upscale.png`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-SR2-faceoff-alpha-1920x1080.png`

### 過去プロンプト

不明。

## SR3 / Vigilante

- 青灰色の髪と大きな獣耳。黒い布で口元を覆い、横顔の目元が見える。
- 腕を出した黒衣、暗赤色の帯、手首の金具。引き締まった体格。
- 青灰色の大きな房状の尾が目立つ。カード絵で武器は不明。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 不明 ／ 寸前 不明。

**参照**

- `public/images/cards/player/SR3/card.webp`
- `public/images/battle-characters/vigilante/idle/0000.png`
- `outputs/email-player-master-pack-visuals/SR3-Vigilante-master-visual.jpg`
- `public/images/cards/player/SR3/VIGILANTE.md`
- `outputs/character-design-review/2026-11-02/revision-01-sora/sr3-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/sr3-draft-01.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/sr3-proposal-01.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/sr3-source-card.webp`
- `outputs/character-design-review/2026-11-02/revision-02-sora/sr3-proposal-r02.png`
- `outputs/character-design-review/2026-11-02/revision-02-sora/sr3-r01-r02-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-03-sora/sr3-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-03-sora/sr3-premium-anime-r03.png`
- `outputs/character-design-review/2026-11-02/revision-03-sora/sr3-redesign-base.png`
- `outputs/character-design-review/2026-11-02/revision-04-sora/sr3-proposal-r04.png`
- `outputs/character-design-review/2026-11-02/revision-05-sora/sr3-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-05-sora/sr3-proposal-r05.png`
- `outputs/character-design-review/2026-11-03/revision-01-sora/vigilante-A.png`
- `outputs/character-design-review/2026-11-03/revision-01-sora/vigilante-B.png`
- `outputs/character-design-review/2026-11-03/revision-01-sora/vigilante-C.png`
- `outputs/character-design-review/2026-11-03/revision-01-sora/vigilante-comparison.png`
- `outputs/character-design-review/2026-11-08/revision-01-sora/vigilante-A.png`
- `outputs/character-design-review/2026-11-08/revision-01-sora/vigilante-B.png`
- `outputs/character-design-review/2026-11-08/revision-01-sora/vigilante-comparison.png`
- `outputs/character-design-review/2026-11-08/revision-02-sora/vigilante.png`
- `outputs/character-design-review/2026-11-08/revision-03-sora/vigilante-four-directions.png`
- `outputs/character-design-review/2026-11-08/revision-04-sora/vigilante-C-revised.png`
- `outputs/character-design-review/2026-11-08/revision-08-card-application/sr3-before-card.png`
- `outputs/character-design-review/2026-11-08/revision-08-card-application/sr3-before-card.webp`
- `outputs/character-design-review/2026-11-08/revision-08-card-application/sr3-card.png`
- `outputs/character-design-review/2026-11-08/revision-08-card-application/sr3-card.webp`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-SR3-faceoff-alpha-1920x1080.png`

### 過去プロンプト

- 元ファイル `outputs/character-design-review/2026-11-02/revision-01-sora/sr3-correction-prompt.txt`

````text
Use case: precise-object-edit. Make ONE small anatomy cleanup to this Vigilante fox-ninja proposal. He must have exactly TWO fox ears. Keep the large upright ear at top center and the far ear at upper-left behind the head wrap. Remove the tiny third orange triangular ear-like protrusion pointing toward the upper-right directly behind the large upright ear, around x=625 y=150. Reconstruct only that tiny protrusion area using the matching orange-lit architectural background. Do not remove the large upright ear or the far left ear. Preserve the rest exactly: masked fox face, narrow amber eyes, charcoal head wraps and ties and scarf, muscular orange-furred torso, pose, doorway, warm light, crop, palette and bold graphic cel linework. No new objects, no text or frame.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-01-sora/sr3-prompt-01.txt`

````text
Use case: identity-preserve. Asset type: single portrait art-only character design improvement proposal, not a finished card. Primary request: redraw SR3 Vigilante as a higher-quality, desirable collectible-game illustration while unmistakably preserving this character. Inputs: image 1 is the owner-selected current card identity and composition source; image 2 is supporting existing character-sheet anatomy/costume reference (do not copy any labels or ability text); image 3 and 4 are the project's selected bold graphic cel STYLE ONLY references, never borrow their character designs or palette. Locked identity: One adult male anthropomorphic RED-ORANGE FOX ninja, not a human and not a wolf. Two tall triangular fox ears, focused narrow AMBER eyes, orange fur on muscular bare chest/shoulders, lower muzzle fully concealed by layered charcoal-grey face wrap, charcoal bandages around crown below ears, trailing ties, dark grey scarf. Black ninja trousers and wraps, large orange fox tail when in frame. Original intense watchful stare, no smile, no visible mouth. No weapons, jewelry, new armor or new powers.
Composition/framing: Match the current card artwork closely: vertical portrait of him emerging between two dark vertical doorway posts, head slightly lowered, looking at viewer, body angled three-quarter, visible bare chest and upper waist. Keep the orange backlight and dark architectural doorway, sparse embers. Same camera angle, gaze, expression and body proportions as current card. Crop around upper waist as the source art window, no full body.
Design refinement: Make his masked fox face the immediate focal point: crisply sculpted eye/brow planes, clear ear interior, decisive brow-to-cheek silhouette. Group fur into a few intentional tufts around shoulders, keep chest anatomy powerful and natural rather than many tiny scratches. Organize scarf into layered matte woven-cloth folds with strong angular shadow shapes distinct from warm fur. Make head-wrap ties legible against negative space. Deep charcoal framing and controlled warm key light; maintain shadow detail. Premium craftsmanship through shape and material clarity, no extra decorative equipment.
Style/medium: premium bold graphic 2D anime cel illustration; confident thick-to-thin dark outer contours, lighter interior lines; intentionally grouped material masses; decisive one- or two-step hard-edged cel shadows; selective graphic highlights. Match style reference drawing quality without turning the character into either reference subject. Keep the target's palette. Output one tall portrait, approx 2:3 aspect, entire canvas is illustration. Remove all source card frame, rarity label, name, W RATE, ability text and UI from this newly generated illustration. Do NOT produce a mock card, comparison sheet, collage or multiple panels. Do not add lore, abilities, characters or objects. Avoid plastic CGI, photorealism, painterly blur, airbrush gradients, bloom, microdetail everywhere, generic glossy AI anime, random floating ornaments, text, watermark, signature.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-02-sora/sr3-prompt-r02.txt`

````text
Use case: stylized-concept / identity-preserve. Character SR3 Vigilante r02 revised design. Render ONE striking, carefully art-directed collectible card illustration, portrait 2:3, art only with no card frame or lettering. This is a substantial pose/composition redesign following owner rejection of the prior saturated version, not a color-filter pass. Premium Japanese fantasy card illustration with clean expressive contours, grouped forms, hard cel-shaded planes and selective fine material accents. Restrained chroma: the majority of the image consists of complex grey, charcoal, weathered bone and muted local hues; preserve the character's hue families but make them substantially quieter. NO neon orange/teal, no HDR saturation, no rainbow, no global yellow wash, no excessive rim glow, no crushed blacks. Color accents should occupy under 5% of the canvas; still retain rich nuanced color, not grayscale or sepia. ONE coherent dominant key light, shadow planes and cast shadows must follow that same direction. No invented counter-rim lights on every edge. Legible face, strong silhouette and believable anatomy take priority over effect/detail. Style references are ONLY contour and grouped cel-shadow language; DO NOT copy their bright palette, character identities, cute creature anatomy or mature face. Do not copy labels, writing, UI, names, W RATE or abilities from any reference. Preserve known character identity and do not invent powers/lore. No additional characters, no text, signature, logo, watermark.
INPUT ROLES AND LOCKED IDENTITY: The original red-russet fox ninja Vigilante: fully anthropomorphic fox, exactly two tall fox ears, a short fox muzzle hidden under a charcoal face wrap, narrow amber eyes and a large russet fox tail. Adult male, lean athletic martial-artist anatomy rather than a massive exposed bodybuilder. Keep charcoal head wraps, scarf and trailing ties, dark ninja trousers, shin/forearm wraps, clawed fox hands and digitigrade feet. Simplify into a sleek stealth silhouette, bare fur on shoulder/chest visible but secondary; a broad existing diagonal dark fabric wrap can cover part of chest. No orange human hairstyle, no wolf face. Taka image 3 is owner-selected inspiration for agility, a lean torso twist, over-shoulder gaze and flowing tail; do not copy his exact armor or weapons. Images 1-2 are Vigilante identity references; images 4-5 drawing-language only.
POSE AND COMPOSITION: Completely leave the doorway portrait. Show a dramatic THREE-QUARTER REAR stealth crouch on a rain-dark stone rooftop ledge. Hips low, front knee bent on the ledge, rear leg stretching back, body angled away towards right, head turning sharply back over the near shoulder toward the viewer. Spine, shoulder blades and pelvis form one believable taut gesture. One wrapped forearm rests on raised knee, its small clawed hand relaxed and readable; the other arm drawn close beside the torso, no giant hand foreshortening. Tail sweeps in one broad countercurve low left, scarf ties sweep right. Entire head/ears and most of body clear in frame, leave breathing space. Compact intimidating narrow-eyed face, not snarling or smiling. Silhouette feels ready to disappear or spring, no idle chest display. Faint ruined alley architecture and mist behind, no fire or orange ember storm.
LIGHTING AND COLOR SCRIPT: One broad COOL-NEUTRAL moon/sky opening at UPPER LEFT FRONT lights the upper-left planes of ears, cheek wrap, shoulder, forearm and thigh. The right/back and all undersides stay a common deep slate shadow. A clear soft cast shadow on the ledge extends to lower-right. Very weak neutral ambient fill only, no warm backlight. Russet fur is muted brown-red; only tiny amber eye catchlights are warm. Matte charcoal cloth folds distinct from matte fur.
Read priority: face/head first, meaningful gesture second, costume/anatomy third, environment last. Show coolness through weight, balance, silhouette and precise facial acting, NOT extra ornament, speed lines, color saturation or effects.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-03-sora/sr3-prompts.txt`

````text
Redesign Vigilante using image 1 for identity ONLY, NOT its erroneous anatomy or pose. Image 2 is owner-selected Taka reference: increase his sleek ninja influence, masked angular face, streamlined dark sleeveless wrap vest, narrow waist, fitted forearm guards and split layered ninja trousers, agile long-limbed silhouette. Retain Vigilante's russet fox fur, charcoal lower-face mask/scarf, amber narrow eyes, one fox tail; no new powers. Exactly TWO fox ears swept sharply BACKWARDS from the skull, angled along the back of the head, not upright rabbit ears. Slim athletic male with long HUMAN-PROPORTIONED arms and legs (fox hands/feet), not broad bodybuilder. Entire pose must be rebuilt: clear three-quarter FRONT standing ready stance, torso facing slightly left, head toward viewer. Spine aligned with pelvis, shoulders over hips. Two long legs separate clearly: weight on rear right leg, front left foot one step forward on same rooftop plane. Two arms: near arm down alongside thigh with small relaxed claw hand, far arm bent across waist; both shoulders/elbows/wrists identifiable. NO deep crouch, no twisted backwards hips, no overlapping folded limbs. One tail emerges ONLY from sacrum behind hips. Full body fits canvas with ears and both feet visible. Quiet Japanese town at DUSK: layered tiled roofs, wooden machiya, lanterns, distant pagoda, dusty mauve sky and subdued apricot sunset. One soft upper-left evening key light, consistent right-down shadows; tiny lantern bounce only. Portrait 2:3 art only. Muted rust/charcoal/slate palette, restrained sunset saturation. Clean anime illustration, confident contours, structured cel planes. No extra characters, no text, no frame, no huge hands, no decorative muscle grooves. This is new design stage before final premium anime finish.

FINAL CORRECTION AND FINISH
Edit this Vigilante design with ONE small shape correction followed by final premium anime finishing. Preserve the new slim long-limbed human anatomical standing stance, two arms/hands, two legs, single tail, ninja wrap vest, amber eyes, face mask and Japanese dusk town EXACTLY. Correct BOTH ears: rotate their long triangular pinnae BACKWARD along the skull rather than pointing upward. His face points slightly screen-right; the ear tips should extend toward SCREEN LEFT, almost horizontally, only about 10-20 degrees above horizontal, swept back like a streamlined fox sprinting into wind. Exactly two separate long tapered fox ears with clear roots at the upper back of skull, tips around the same height as crown, not rabbit ears, not horns, not a new ear on scarf. Remove old vertical ear silhouettes and restore matching sunset sky there. Keep head and face orientation unchanged. Then apply premium-anime-color-correction adapted to restrained palette: clean confident outlines, precise anime cel-shadow boundaries, simplify brushy mottled texture in cloth/fur into designed groups, fine purposeful accents, refined matte fur versus woven cloth/leather, subtle polished hardware. Preserve dusk's muted mauve/russet/charcoal with rich midtones, warm upper-left sunset key and coherent shadows. Improve clarity and local contrast, no global saturation boost, no new multi-direction rims, orange wash, plastic CGI, glow or extra muscles. No crop/design change beyond specified ears and rendering finish. Portrait 2:3 art only; no text/frame.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-04-sora/sr3-prompt.txt`

````text
Create a new pose of Vigilante, using this image for his identity, slim long arms/legs, dark wrap-vest ninja outfit, russet fox fur, masked face, narrow amber eyes, TWO long fox ears swept BACKWARD almost horizontally, one tail. Major pose change: DYNAMIC HIGH-ANGLE FISHEYE portrait like an anime sorcerer declaring a domain expansion, but retain this fox ninja and outfit, not another character's identity. Camera above and to the character's UPPER RIGHT; he looks DIRECTLY UP into that camera, eyes tracking upper right. Wide-angle curving Japanese roofline perspective, near hand and face prominent, torso recedes naturally, not a full-body idle stand. His anatomical RIGHT hand is held just in front of the right side of his face, forming ONE-HANDED NINJA MUDRA: index and middle finger extended together and lightly CROSSED, ring and little fingers folded into palm and held by thumb. Exactly five anatomically connected fingers; show palm/knuckle structure, correct wrist and forearm attachment, no extra thumb. Right shoulder-elbow-wrist connected clearly. His other arm held low by waist, only two arms total. Head slightly tilted, fierce calm camera gaze, ready to perform ninjutsu. Do not add new power or giant magic effect. Torso/pelvis aligned; keep slim elegant male martial artist proportions. Broad diagonal image flow and controlled fisheye, face not deformed. DUSK Japanese machiya town, tiled roofs, distant pagoda, dusty mauve/apricot sunset. ALL surfaces matte: DRY roof tiles and plaster, rough wood, no rain, no puddles, no mirror sheen, no glowing floor. Restrained rust/charcoal palette, upper-left warm sunset key with coherent shadows. Premium clean anime/cel rendering, clear contours, hard grouped shadows, no painterly noise or glossy CGI. Art only 2:3, no text/frame.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-05-sora/sr3-prompt.txt`

````text
Edit this Vigilante illustration following the owner's exact revisions. Keep his identity, masked fox face, amber eyes, slim long-limbed dark ninja outfit and dramatic high-angle fisheye camera with camera gaze upward. CHANGE ENVIRONMENT: he stands on DRY STREET GROUND in a Japanese dusk town, absolutely not on a rooftop. At his feet the stone street cracks outward radially, stone slabs lifting, a low circular pressure/shockwave ring of dust and displaced rubble expanding outward. He stands balanced with clear foot contacts on the central stable slab. In DISTANT background a powerful broad vortex of WIND, dark dust, ribbons of restrained fire and rotating architectural debris curls around him, as though inside a typhoon at the instant ninjutsu activates. Fire and debris stay mostly behind and far from face/hand, one coherent spiral direction, strong depth, larger close stone fragments near ground, distant smaller debris; do not obscure his anatomy or make a flat explosion wallpaper. Maintain readable Japanese wooden street buildings and pagoda silhouettes beyond storm at dusk. These are requested visual effects, not a gameplay ability specification. CHANGE RIGHT-HAND SIGN: right index and middle fingers straight upright PARALLEL next to each other, NOT crossing, NOT twisted, no V spread. Ring and little fingers folded into palm held by thumb, exactly five fingers with one thumb and normal knuckle/wrist structure. Same right hand remains near camera beside face. CHANGE EARS: two fox ears are pinned/swept BACK toward the BACK OF HIS SKULL, not extended sideways across screen. Their roots at top/back of skull, pinnae laid along sagittal direction toward occiput, foreshortened in this high-angle front view. Show clear ear-root anatomy, narrow silhouettes receding behind head, NOT a pair of long lateral wings. Keep one tail only, two arms/two legs. Matte cloth/fur/stone, no wet gloss, no mirror pavement. Controlled low-saturation rust/charcoal/mauve palette; warm upper-left dusk key and localized fire light coherently reflected only nearby. Clean premium anime CEL finish, no overbloom, huge neon orange flames or painterly grit on character. One portrait 2:3 art only, no text/frame.
````

- 元ファイル `outputs/character-design-review/2026-11-03/revision-01-sora/vigilante-A-prompt.txt`

````text
Single portrait 2:3 collectible anime illustration, Vigilante identity and SAME dramatic high-angle action camera/pose as reference. Russet fox ninja, slim long-limbed, masked charcoal wrap vest, amber eyes, ears pinned backward along skull, one tail. Anatomical RIGHT hand beside face toward lens, index/middle STRAIGHT PARALLEL, not crossed; other digits folded correctly. Stands on fractured street in Japanese town, dust shockwave and distant curling debris/fire vortex. Preserve anatomy and identity; NO orange filter over everything, no all-over fire rim, no muddy uniform warm lighting. Clean matte anime cel planes, no plastic gloss or overbloom. Face and hand are first focal point, effects subordinate and mostly far behind, quieter negative space directly behind head and hand. No text/frame. This is a controlled COLOR SCRIPT ALTERNATIVE, do not repeat reference's orange monochrome. COLOR SCRIPT A / blue-grey and amber. 65% background smoky SLATE BLUE and soft atmospheric steel grey, 25% neutral charcoal costume/quiet natural rust fur, 10% restrained amber fire accents far behind. Neutral cool skylight from upper-left illuminates face/hand; soft violet-blue shadows. Tiny contained warm fire accents stay remote, not bathing character. Pale smoke behind head separates dark mask, dark cool buildings frame outer image. Orange fur remains localized material color, lighter neutral skin/fur planes. Clear warm character vs cool environment contrast, atmospheric and cinematic, no teal-orange blockbuster filter.
````

- 元ファイル `outputs/character-design-review/2026-11-03/revision-01-sora/vigilante-B-prompt.txt`

````text
Single portrait 2:3 collectible anime illustration, Vigilante identity and SAME dramatic high-angle action camera/pose as reference. Russet fox ninja, slim long-limbed, masked charcoal wrap vest, amber eyes, ears pinned backward along skull, one tail. Anatomical RIGHT hand beside face toward lens, index/middle STRAIGHT PARALLEL, not crossed; other digits folded correctly. Stands on fractured street in Japanese town, dust shockwave and distant curling debris/fire vortex. Preserve anatomy and identity; NO orange filter over everything, no all-over fire rim, no muddy uniform warm lighting. Clean matte anime cel planes, no plastic gloss or overbloom. Face and hand are first focal point, effects subordinate and mostly far behind, quieter negative space directly behind head and hand. No text/frame. This is a controlled COLOR SCRIPT ALTERNATIVE, do not repeat reference's orange monochrome. COLOR SCRIPT B / celadon and rust. Background palette mineral CELADON GREEN, desaturated jade/blue-green smoke, old grey plaster and charcoal timber, natural dry grey-brown street. Costume almost-black blue-green neutral, fur quiet burnt-russet; fire tiny dull copper accents in distant vortex. Soft ivory neutral key from upper-left, not golden sunset. Background dusk sky silver sage with distant dusty rose band. Main value hierarchy: warm mid-value fox face and hand against LIGHT CELADON smoke, dark costume against middle-value stone. No saturated emerald fog or neon green flames. Make palette unmistakably green-grey/copper, not blue-grey/gold.
````

- 元ファイル `outputs/character-design-review/2026-11-03/revision-01-sora/vigilante-C-prompt.txt`

````text
Single portrait 2:3 collectible anime illustration, Vigilante identity and SAME dramatic high-angle action camera/pose as reference. Russet fox ninja, slim long-limbed, masked charcoal wrap vest, amber eyes, ears pinned backward along skull, one tail. Anatomical RIGHT hand beside face toward lens, index/middle STRAIGHT PARALLEL, not crossed; other digits folded correctly. Stands on fractured street in Japanese town, dust shockwave and distant curling debris/fire vortex. Preserve anatomy and identity; NO orange filter over everything, no all-over fire rim, no muddy uniform warm lighting. Clean matte anime cel planes, no plastic gloss or overbloom. Face and hand are first focal point, effects subordinate and mostly far behind, quieter negative space directly behind head and hand. No text/frame. This is a controlled COLOR SCRIPT ALTERNATIVE, do not repeat reference's orange monochrome. COLOR SCRIPT C / plum ash and ivory. Refined Japanese dusk palette: background dusty PLUM/VIOLET-GREY, mushroom-grey masonry and near-black indigo silhouettes; pale warm IVORY dust shockwave and smoke. Fur muted brick-red/russet distinct from purple environment, mask charcoal ink. Very sparse vermilion ember accents in far distance, not large orange flames. A soft pale neutral-lilac upper-left key defines face/hand, shadows cool indigo, no red wash. Broad calm warm-ivory negative-space crescent behind head gives graphic contrast. Elegant designed limited palette, decisive larger color masses, no sepia.
````

- 元ファイル `outputs/character-design-review/2026-11-08/revision-01-sora/vigilante-A-prompt.txt`

````text
One portrait 2:3 premium 2D anime illustration. Image 1 is Vigilante identity and gesture reference. Keep russet fox ninja, lean long-limbed male anatomy, amber narrow eyes, charcoal mask/head wraps/dark wrap vest, wrist guards and ONE fox tail; right hand near lens with index and middle fingers STRAIGHT PARALLEL and other three digits folded correctly. Same high camera gaze, fisheye near hand, two arms/two legs. CHANGE HEAD SILHOUETTE: TWO long SHARP triangular FOX EARS sweeping diagonally UP and OUT from skull in a bold readable V, tips like clean tapered arrowheads; angular fur tufts frame cheekbones and taper toward masked chin to complement V-shaped face. Preserve fox species, no new horns/helmet, no extra ears. This new owner V-direction supersedes flattened backward ear constraint. REPLACE ALL scenery with a BRIGHT ABSTRACT SPIRAL of broad luminous layered color ribbons, soft pearlescent atmospheric waves and designed curved negative spaces wrapping around character. No literal tornado cloud, no fire, debris, stones, streets, buildings or ground plane. Figure suspended inside abstract vortex; lower body recedes into abstract light, not standing on invisible rubble. Restrained LUXURY material finish: clean anime cel shadow design, precise outer contours, rich dark readable fabric, subtle woven folds, fine natural fur groupings, small tasteful leather/hardware speculars. Bright vortex is actual light source: coherent soft colored rear/side RIM LIGHT on ear tips, mask edge, shoulder, forearm and tail facing luminous ribbons; front face/hand receive one broad soft neutral upper-left fill. Occlusion under chin/wraps/folds remains dark, not uniformly glowing. No plastic 3D or global gloss/bloom. Keep fur rust, cloth charcoal, skin/fur warm natural; environmental accents remain localized. Eyes/hand primary focal point, background curve rhythm secondary, quiet negative space behind head/hand. Art only no lettering/frame. COLOR/LIGHT A: luminous AQUA and warm IVORY abstract ribbons over pale celadon space, sparing champagne-gold accents. Main bright ribbon curls behind viewer-right shoulder, pale aqua rim there, opposite amber-ivory fill very soft. Dark charcoal character crisp against airy background, rust fur warm counterpoint. Large elegant curves, understated pearl finish.
````

- 元ファイル `outputs/character-design-review/2026-11-08/revision-01-sora/vigilante-B-prompt.txt`

````text
One portrait 2:3 premium 2D anime illustration. Image 1 is Vigilante identity and gesture reference. Keep russet fox ninja, lean long-limbed male anatomy, amber narrow eyes, charcoal mask/head wraps/dark wrap vest, wrist guards and ONE fox tail; right hand near lens with index and middle fingers STRAIGHT PARALLEL and other three digits folded correctly. Same high camera gaze, fisheye near hand, two arms/two legs. CHANGE HEAD SILHOUETTE: TWO long SHARP triangular FOX EARS sweeping diagonally UP and OUT from skull in a bold readable V, tips like clean tapered arrowheads; angular fur tufts frame cheekbones and taper toward masked chin to complement V-shaped face. Preserve fox species, no new horns/helmet, no extra ears. This new owner V-direction supersedes flattened backward ear constraint. REPLACE ALL scenery with a BRIGHT ABSTRACT SPIRAL of broad luminous layered color ribbons, soft pearlescent atmospheric waves and designed curved negative spaces wrapping around character. No literal tornado cloud, no fire, debris, stones, streets, buildings or ground plane. Figure suspended inside abstract vortex; lower body recedes into abstract light, not standing on invisible rubble. Restrained LUXURY material finish: clean anime cel shadow design, precise outer contours, rich dark readable fabric, subtle woven folds, fine natural fur groupings, small tasteful leather/hardware speculars. Bright vortex is actual light source: coherent soft colored rear/side RIM LIGHT on ear tips, mask edge, shoulder, forearm and tail facing luminous ribbons; front face/hand receive one broad soft neutral upper-left fill. Occlusion under chin/wraps/folds remains dark, not uniformly glowing. No plastic 3D or global gloss/bloom. Keep fur rust, cloth charcoal, skin/fur warm natural; environmental accents remain localized. Eyes/hand primary focal point, background curve rhythm secondary, quiet negative space behind head/hand. Art only no lettering/frame. COLOR/LIGHT B: luminous OPAL LILAC and pale SKY BLUE wave spiral with soft peach/ivory highlights, a little deep indigo in ribbon folds. Violet-blue edge lighting from upper-left/back, quiet neutral warm fill on face/hand. Keep bright background light but selective dark curved bands add depth. Calm opalescent luxury, not glitter/confetti.
````

- 元ファイル `outputs/character-design-review/2026-11-08/revision-02-sora/vigilante-prompt.txt`

````text
Precisely revise this Vigilante image, preserving identity, right-hand straight parallel two-finger sign, camera, aqua/ivory abstract vortex palette, slim physique and outfit. Fix cheek fur/mask construction: charcoal cloth mask is a continuous unobstructed fabric surface with clean upper edge from bridge of nose across cheeks; all orange sideburn/cheek fur stays BEHIND the side edge/strap, never overlapping mask, no fur tufts on top of cloth or cheek fur resembling another mask layer. Reduce both V-shaped fox ears by about 25 percent keeping their sharp V orientation, two ears only. Correct lower-body clothing: trousers both legs same charcoal material/color, orderly cuffs transition into consistent taupe-grey shin wraps, dark foot wraps with only small natural russet toes/claws exposed. Believable two hips/knees/ankles/feet, no disembodied heel orange lump, no random contrasting cloth patches. Change floating lower-body into balanced grounded stance with both feet naturally supported on a FAINT low-contrast pale stone/neutral ground plane visible under the abstract mist, no detailed scenery or rubble. Add soft grounded CONTACT SHADOW directly under feet and broad subtle cast shadow. Adjust leg angles only as needed for actual contact. Strengthen SOFT FORM SHADOWS across whole figure: deeper soft shade under brow, chin, scarf, raised hand/fingers, torso folds, inner thighs, tail overlap; broad upper-left neutral key and aqua backlight stay coherent. Rich readable dark fabric, deeper midtone sculpting, stronger occlusion, no pure-black crush, no harsh new hard shadow bands or glossy plastic. Keep background bright abstract ribbons and luxury controlled highlights. Art-only 2:3 portrait no lettering.
````

- 元ファイル `outputs/character-design-review/2026-11-08/revision-03-sora/generation-prompt.txt`

````text
Create ONE HIGH-RESOLUTION 2x2 FOUR-PANEL character concept comparison sheet, square overall, four equally sized separate portraits, narrow neutral gutters, small labels A top-left, B top-right, C bottom-left, D bottom-right. Owner requests FOUR MEANINGFULLY DIFFERENT DESIGN/RENDER APPROACHES, not four recolors of one image. All are proposals for Vigilante, an agile orange/russet fox ninja with pointed fox ears, orange fox tail, concealed lower face, extremely sharp narrow amber eyes and lean long-limbed male martial-artist anatomy. Owner now prioritizes the ATTACHED REFERENCE ART STYLE over the previous flat anime style. Study all three: stylized semi-realistic premium MOBA splash/key art, confident sculpted volumes, beautifully controlled painterly edges, realistic cloth/leather/metal material separation, expressive stylized anatomy and cinematic directional light, not generic glossy anime, not heavy black cel outlines, not fuzzy brush noise. Reference 3 is the POSE MASTER FOR ALL FOUR PANELS: body facing away in THREE-QUARTER REAR view, visible back and near shoulder, head turning back over shoulder with sharp alert eye contacting viewer, one forearm lowered across or beside hip, balanced taut ready stance, slight low camera angle. Follow reference 3's spinal alignment, shoulder/hip logic and head rotation. NOT front-facing standing, not raised two-finger mudra, not fisheye. Frame head to knees/upper shins with strong character scale. No extra characters or companion animal. Use cohesive subdued cool mist / atmospheric blue-grey abstract depth behind each panel, quiet and non-distracting, no tornado, no fire, no glitter spiral. Same main upper-left directional key, readable soft occlusion and controlled cool rim. No game logos/signatures/watermarks, no card UI or ability text. Preserve a distinct Vigilante interpretation rather than reproducing references verbatim.
A / FOX STEALTH: closest to Vigilante species, russet fur on athletic bare upper arms, small angular fox muzzle under CLEAN charcoal cloth mask, scarf, fitted sleeveless charcoal wrap vest, layered ninja trousers, modest arm guards, orange tail; no visible weapon. Rich restrained semi-realistic PAINTERLY game splash rendering, hard/soft edge hierarchy, subtle ivory-grey key. Razor narrow eyes, compact backward-angled V ears, fur never over mask.
B / SLEEK FOXKIN: closer to reference 3's human-like fox ninja proportions, tan warm face/arms with short russet fur accents, swept orange hair and compact pointed ears, tight dark face wrap, fitted blue-black sleeveless ninja suit, purposeful leather harness/forearm guard, one sleek short straight blade held low following forearm diagonal, long orange tail. Stylized SCULPTURAL realistic game-key-art finish with crisp controlled highlights, deep indigo half-shadows, distinct planes. No sci-fi red goggles, no neon weapon.
C / IVORY TRAVEL NINJA: agile foxkin balance between A and B, sharp masked eyes, orange hair/ears/tail, ivory-grey layered sleeveless cloth with charcoal scarf and blue-grey belt/guards, restrained brass accents; one simple sheathed blade at waist. More ILLUSTRATIVE hand-painted premium fantasy splash approach inspired by reference 2's fabric and skin rendering, warm ivory key against cool airy backdrop. Keep youthful adult male, no mascot cuteness, no identical face template.
D / DARK ASSASSIN: lean anthropomorphic fox with more angular cheek/ear silhouette and predatory amber gaze, dark graphite sleeveless segmented leather/cloth ninja outfit, muted oxblood lining in trailing split sash, slim forearm-mounted blade inspired by reference silhouette but an original design. BOLD ANGULAR CONCEPT-ART rendering: decisive geometric light/shadow planes and selective painterly transitions, stronger dark silhouette, quiet pale rim, no cel-anime contour. Dynamic shoulder-turn with slightly lower viewpoint, same rear-view pose logic.
Keep four designs visibly distinct in clothing construction, human/fox balance and rendering treatment, while same back-turn gesture/identity family. Exactly two ears, one tail, two arms per character; anatomically plausible shoulders/wrists/legs. This is a selection sheet, not final approved production artwork. Only A/B/C/D as text.
````

- 元ファイル `outputs/character-design-review/2026-11-08/revision-04-sora/generation-prompt.txt`

````text
Edit ONLY character C (BOTTOM LEFT quadrant) from this 4-panel image and deliver him as ONE standalone portrait illustration, NOT another comparison sheet. Owner has selected C, do not borrow A/B/D species, face, armor or pose. Preserve C's human-like foxkin face, sharp amber eyes, masked lower face, slim athletic adult male anatomy, swept hair, pointed fox ears, original three-quarter BACK VIEW looking back over shoulder, lowered clenched near hand, sleeveless layered cloth costume construction, dark scarf flowing back, restrained brass details, premium semi-realistic painterly MOBA splash illustration style and cool atmospheric blue-grey mist background. Apply exactly these requested changes:
1 TAIL ANATOMY: ONE fluffy fox tail with its visible ROOT attached at the CENTERLINE OF THE SACRUM, on the back of pelvis immediately ABOVE THE BUTTOCKS and BELOW the waist sash. Show enough lower-back/pelvis so attachment is unmistakable. Root must emerge through a small opening in the back-center of clothing, then curve naturally left/down with mass behind him. NOT attached to lateral waist, belt, flank, hip side, thigh or shoulder. Ensure clear spatial connection aligned with lower spine, not a disembodied tail bundle.
2 REMOVE the long sword SCABBARD hanging down near hip and thigh, including sword/hilt and scabbard-specific straps/loops; reconstruct matching cloth beneath. No visible weapon or sheath anywhere. Keep normal waist sash and relevant costume closures.
3 RECOLOR original ivory layered sleeveless garment and trousers to rich near-BLACK cloth with subtle cool charcoal folds; scarf/headband/guards also cohesive charcoal-black. Keep all existing cut and fabric layering, exposed arms natural warm tan, hardware restrained aged brass. Waist cloth SASH is DARK BURGUNDY/OXBLOOD RED, a dark red rather than bright scarlet.
4 Hair and fox tail FUR are LIGHT SKY BLUE / pale powder-cyan, naturally shaded blue-grey with pale silvery tips; no orange/red hair or tail remains. Outer ear fur matches light-blue hair family with pale natural inner ear fur. Preserve amber eye color. Tail remains furry, not luminous/synthetic.
Keep coherent upper-left light, controlled cool rim, believable cloth/leather/skin/fur differentiation, no plastic gloss or cel-anime black outlines. Character from head including complete ears to upper thighs/knees; hips and tail root readable; no accidental cropping of ear tips. One vertical 2:3 artwork, no C label, no text, no watermark, no frame. These are visual design modifications only, not new abilities.
````

- 元ファイル `outputs/gemini-comparison/2026-11-05/revision-01/vigilante-A-prompt.txt`

````text
Single portrait 2:3 collectible anime illustration, Vigilante identity and SAME dramatic high-angle action camera/pose as reference. Russet fox ninja, slim long-limbed, masked charcoal wrap vest, amber eyes, ears pinned backward along skull, one tail. Anatomical RIGHT hand beside face toward lens, index/middle STRAIGHT PARALLEL, not crossed; other digits folded correctly. Stands on fractured street in Japanese town, dust shockwave and distant curling debris/fire vortex. Preserve anatomy and identity; NO orange filter over everything, no all-over fire rim, no muddy uniform warm lighting. Clean matte anime cel planes, no plastic gloss or overbloom. Face and hand are first focal point, effects subordinate and mostly far behind, quieter negative space directly behind head and hand. No text/frame. This is a controlled COLOR SCRIPT ALTERNATIVE, do not repeat reference's orange monochrome. COLOR SCRIPT A / blue-grey and amber. 65% background smoky SLATE BLUE and soft atmospheric steel grey, 25% neutral charcoal costume/quiet natural rust fur, 10% restrained amber fire accents far behind. Neutral cool skylight from upper-left illuminates face/hand; soft violet-blue shadows. Tiny contained warm fire accents stay remote, not bathing character. Pale smoke behind head separates dark mask, dark cool buildings frame outer image. Orange fur remains localized material color, lighter neutral skin/fur planes. Clear warm character vs cool environment contrast, atmospheric and cinematic, no teal-orange blockbuster filter.
````

## SR4 / Night Crawler

- 髪のない機械体で、白灰の装甲の奥に複数の赤い発光点。
- 暗いケーブルと関節の上に、傷のある骨状の白い外装。
- 低く構えた多脚の体格。細長い爪と背に伸びた突起が特徴。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 不明 ／ 寸前 不明。

**参照**

- `public/images/cards/player/SR4/card.webp`
- `public/images/battle-characters/night-crawler/idle/0000.png`
- `outputs/email-player-master-pack-visuals/SR4-Night-Crawler-master-visual.jpg`
- `public/images/cards/player/SR4/NIGHT CRAWLER.md`
- `outputs/character-design-review/2026-11-02/revision-01-sora/sr4-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/sr4-proposal-01.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/sr4-source-card.webp`
- `outputs/character-design-review/2026-11-02/revision-02-sora/sr4-draft-r02.png`
- `outputs/character-design-review/2026-11-02/revision-02-sora/sr4-proposal-r02.png`
- `outputs/character-design-review/2026-11-02/revision-02-sora/sr4-r01-r02-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-03-sora/sr4-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-03-sora/sr4-premium-anime-r03.png`
- `outputs/character-design-review/2026-11-02/revision-04-sora/sr4-applied-card.png`
- `outputs/character-design-review/2026-11-02/revision-04-sora/sr4-applied-card.webp`
- `outputs/character-design-review/2026-11-02/revision-04-sora/sr4-before-card.png`
- `outputs/character-design-review/2026-11-02/revision-04-sora/sr4-before-card.webp`
- `outputs/character-design-review/2026-11-02/revision-04-sora/sr4-card-generated-placement.png`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-SR4-faceoff-alpha-1920x1080.png`

### 過去プロンプト

- 元ファイル `outputs/character-design-review/2026-11-02/revision-01-sora/sr4-prompt-01.txt`

````text
Use case: identity-preserve. Asset type: single portrait art-only character design improvement proposal, not a finished card. Primary request: redraw SR4 Night Crawler as a higher-quality, desirable collectible-game illustration while unmistakably preserving this character. Inputs: image 1 is the owner-selected current card identity and composition source; image 2 is supporting existing character-sheet anatomy/costume reference (do not copy any labels or ability text); image 3 and 4 are the project's selected bold graphic cel STYLE ONLY references, never borrow their character designs or palette. Locked identity: One damaged white spider-like autonomous robot. Unmistakable long pointed split white carapace above a compact dark mechanical core; small triangular RED-ORANGE optical cluster, two large side lenses and one smaller central/lower lens as reference, NOT a human face, no mouth or cute expression. Preserve the existing radial multi-jointed limb layout from current card/sheet, long slender claw limbs, pointed feet, rear raised blade-like appendages, loose black cables hanging below body. White/grey cracked shell, black inner machinery and restrained red core light. No humanoid torso, no armor pilot, no new weapon or powers.
Composition/framing: Match source card's moonlit airborne/crouching pounce, angular body leaning down toward viewer, carapace high in frame, lower claw limbs reaching down, raised back limbs spread. Large pale full moon behind, deep midnight blue sky, faint rainy industrial rooftop silhouettes low in image. Same pose, camera, crop and light direction; entire subject fits the art canvas with no chopped claw tips.
Design refinement: Give the machine a premium, purpose-designed mechanical silhouette while retaining its broken hunting-robot identity. Separate each joint and claw at thumbnail scale with clean gaps and deliberate limb overlap; use the existing limb count and arrangement. Organize white shell into broad clean ceramic-like panel planes with sparse intentional cracks and chipped edges, not random all-over noise. Contrast matte dark framework and selective machined-metal joint highlights. Three optical lenses sharp red focal points, tiny red light visible in gaps only. Hard cel-shaded cold moonlight, controlled red reflections, black cable loops readable and subordinate. Keep ominous uncanny character, not a cute mascot.
Style/medium: premium bold graphic 2D anime cel illustration; confident thick-to-thin dark outer contours, lighter interior lines; intentionally grouped material masses; decisive one- or two-step hard-edged cel shadows; selective graphic highlights. Match style reference drawing quality without turning the character into either reference subject. Keep the target's palette. Output one tall portrait, approx 2:3 aspect, entire canvas is illustration. Remove all source card frame, rarity label, name, W RATE, ability text and UI from this newly generated illustration. Do NOT produce a mock card, comparison sheet, collage or multiple panels. Do not add lore, abilities, characters or objects. Avoid plastic CGI, photorealism, painterly blur, airbrush gradients, bloom, microdetail everywhere, generic glossy AI anime, random floating ornaments, text, watermark, signature.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-02-sora/sr4-light-correction-prompt.txt`

````text
Use case: lighting-weather. Make a precise LIGHTING/TIME-OF-DAY correction ONLY to this Night Crawler robot card illustration. The character stalks AFTER SUNSET, so this must clearly be NIGHT. Preserve the exact current pose, composition, anatomy, three red lenses, all carapace panels, claws, ledge, distant city shapes and crop. Replace the daytime sky appearance with subdued night clouds and a dim PEARL-GREY moonlit opening in the UPPER LEFT, moon hidden behind cloud, not a giant decorative moon disc. Lower overall sky/city exposure by roughly 1.5 stops; the sky should be medium-dark charcoal/slate, never bright daylight white and never vivid blue. Keep the robot's upper-left facing bone-white shell planes readable in coherent soft cool-neutral moonlight. All shadows still fall down/right. Black core retains just enough quiet neutral ambient detail. Existing tiny warm windows and the three red lenses are the only warm accent lights, lens bounce limited to adjacent socket edges. Important: retain restrained low-saturation color, avoid extra blue rim lights, orange rims, new fog glow, effects, objects, weapons, anatomy edits or new cracks. This is a night-light correction to the same illustration, not a new redraw. No text or frame.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-02-sora/sr4-prompt-r02.txt`

````text
Use case: stylized-concept / identity-preserve. Character SR4 Night Crawler r02 revised design. Render ONE striking, carefully art-directed collectible card illustration, portrait 2:3, art only with no card frame or lettering. This is a substantial pose/composition redesign following owner rejection of the prior saturated version, not a color-filter pass. Premium Japanese fantasy card illustration with clean expressive contours, grouped forms, hard cel-shaded planes and selective fine material accents. Restrained chroma: the majority of the image consists of complex grey, charcoal, weathered bone and muted local hues; preserve the character's hue families but make them substantially quieter. NO neon orange/teal, no HDR saturation, no rainbow, no global yellow wash, no excessive rim glow, no crushed blacks. Color accents should occupy under 5% of the canvas; still retain rich nuanced color, not grayscale or sepia. ONE coherent dominant key light, shadow planes and cast shadows must follow that same direction. No invented counter-rim lights on every edge. Legible face, strong silhouette and believable anatomy take priority over effect/detail. Style references are ONLY contour and grouped cel-shadow language; DO NOT copy their bright palette, character identities, cute creature anatomy or mature face. Do not copy labels, writing, UI, names, W RATE or abilities from any reference. Preserve known character identity and do not invent powers/lore. No additional characters, no text, signature, logo, watermark.
INPUT ROLES AND LOCKED IDENTITY: One damaged spider-like autonomous robot, not humanoid. Keep elongated pointed split WHITE carapace, black exposed mechanical core, triangular cluster of THREE red-orange optical lenses, long slender claw-tipped segmented limbs and loose hanging black cables. Retain eight main locomotor limb roots arranged four on each side around body in a coherent radial plan, with existing tall rear projections; do not multiply hands randomly. No cute face, human pilot, new guns or weapons. White shell aged off-white with sparse large cracks; restrained red in lenses/core only. Images 1-2 identity; images 3-4 drawing-language only.
POSE AND COMPOSITION: New predatory composition: robot in an asymmetric LOW stalking crawl clinging to a ruined sloping rooftop ledge, three-quarter FRONT view from slightly below, long tapered head pointing toward lower-left viewer, near optical cluster prominent upper-middle. Near front claw reaches forward and down, far front claw folds nearer body; middle and rear limbs anchor on stone and behind roofline in a coherent fan, some naturally occluded instead of showing an incoherent tangle. Distinct functional shoulder hinges, elbow/knee pivots, wrist and claws, clear negative-space gaps, no giant human hands. Body shifted sideways with taut machine gesture, menacing and intentional; cable loops hang by gravity, not symmetrical decorative curls. Keep the complete focal head and near claw in canvas. Background narrow city rooftops softened by fog, no giant decorative full moon.
LIGHTING AND COLOR SCRIPT: One cool-neutral sky opening at UPPER LEFT lights all upward/left shell surfaces, with corresponding dark right/underside planes; deep contact shadows at joint overlaps and where limbs touch stone, cast shadows toward lower-right. Red eyes create only tiny nearby warm reflections on adjacent socket rims, NOT a second global key or full body orange rim. Palette weathered bone-white, graphite grey, muted slate-blue and tiny dark-red accents. Black mechanics readable with subdued neutral fill. No vivid cobalt sky, no wet neon reflections.
Read priority: face/head first, meaningful gesture second, costume/anatomy third, environment last. Show coolness through weight, balance, silhouette and precise facial acting, NOT extra ornament, speed lines, color saturation or effects.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-03-sora/sr4-prompts.txt`

````text
Edit target Night Crawler. LOCK robot design and pose exactly: white cracked pointed carapace, three red eyes, all limb roots/joints/claws/cables, rooftop-clinging stalking silhouette and camera/crop unchanged. Change background from ruined gothic towers to a believable inhabited NIGHT CITY: dense contemporary streets, dark apartment blocks and shopfronts, distant high-rise silhouettes, utility wires, scattered small warm windows, subtle low-chroma signs WITHOUT readable lettering. Keep foreground sloping roof geometry to preserve every foot/claw contact. Robot prowls above narrow city streets after midnight. No giant moon disc, no medieval spires, no extra robots or people. One offscreen upper-left diffuse moonlight; street lights are weak local secondary sources, no incoherent opposite rims. After background edit apply premium-anime-color-correction finish adapted to low saturation: crisp commercial anime linework and grouped cel-shadow planes, reduce rough mottled painterly brush texture on white shell, distinct clean ceramic panels and selective metal speculars, readable inner mechanics with delicate cool shadow tint. Preserve existing cracks rather than adding random damage. Rich midtones, retain night shadows, no crushed core, no neon saturated blue/red, no global brightening, no plastic 3D look or bloom haze. Restrained red eyes remain focal accent. Art only 2:3, no text or frame.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-04-sora/sr4_card-prompt.txt`

````text
Card artwork replacement/compositing. Image 1 is the existing NIGHT CRAWLER card template. Image 2 is the OWNER-APPROVED illustration to insert. Replace ONLY the old moon/flying robot illustration inside card 1's upper artwork window with image 2, retaining its exact robot design, pose and night city. Fit/crop image 2 tastefully in that window: head and three red eyes prominent, foreground claw visible; preserve whole card dimensions/proportions. Keep image 1's steel card border, SR rarity badge, name NIGHT CRAWLER, W RATE 30%, and complete existing ABILITY panel and text EXACTLY unchanged. Do not redesign typography, recolor UI, add labels or alter any number. Prefer accurate placement of the supplied art, not an invented robot redraw. No new features or glowing elements. Final single complete card only.
````

## SSR1 / Great Thunder Dragon

- 象牙色の鱗と長い角の列、長い首と尾を持つ大型竜。
- 胸と前脚はたくましく、翼膜は青緑。顔は細長い。
- 前脚のそばに金色の発光球。手持ち武器は見当たらない。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 作りかけ（カットイン静止画・案あり。完成動画は不明） ／ 寸前 不明。

**参照**

- `public/images/cards/player/SSR1/card.webp`
- `public/images/battle-characters/thunder-dragon/idle/000.png`
- `outputs/email-player-master-pack-visuals/SSR1-Great-Thunder-Dragon-master-visual.jpg`
- `public/images/cards/player/SSR1/GREAT THUNDER DRAGON.md`
- `public/images/cards/player/SSR1/character-inserts/great-thunder-dragon-forward-closeup-cut-in-idea-sheet-v1.png`
- `public/images/cards/player/SSR1/character-inserts/great-thunder-dragon-roar-closeup-premium-anime-hdr-upscale.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/ssr1-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/ssr1-proposal-01.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/ssr1-source-card.webp`
- `outputs/character-design-review/2026-11-02/revision-02-sora/ssr1-anatomy-detail.png`
- `outputs/character-design-review/2026-11-02/revision-02-sora/ssr1-proposal-r02.png`
- `outputs/character-design-review/2026-11-02/revision-02-sora/ssr1-r01-r02-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-03-sora/ssr1-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-03-sora/ssr1-premium-anime-r03.png`
- `outputs/character-design-review/2026-11-02/revision-04-sora/ssr1-applied-card.png`
- `outputs/character-design-review/2026-11-02/revision-04-sora/ssr1-applied-card.webp`
- `outputs/character-design-review/2026-11-02/revision-04-sora/ssr1-before-card.png`
- `outputs/character-design-review/2026-11-02/revision-04-sora/ssr1-before-card.webp`
- `outputs/character-design-review/2026-11-02/revision-04-sora/ssr1-card-generated-placement.png`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-SSR1-faceoff-alpha-1920x1080.png`

### 過去プロンプト

- 元ファイル `outputs/character-design-review/2026-11-02/revision-01-sora/ssr1-prompt-01.txt`

````text
Use case: identity-preserve. Asset type: single portrait art-only character design improvement proposal, not a finished card. Primary request: redraw SSR1 Great Thunder Dragon as a higher-quality, desirable collectible-game illustration while unmistakably preserving this character. Inputs: image 1 is the owner-selected current card identity and composition source; image 2 is supporting existing character-sheet anatomy/costume reference (do not copy any labels or ability text); image 3 and 4 are the project's selected bold graphic cel STYLE ONLY references, never borrow their character designs or palette. Locked identity: One ancient powerful IVORY-WHITE thunder dragon with a long angular reptilian muzzle, AMBER predatory eyes, crown-like long ivory horn/spike array swept backward, teal dorsal spines and exactly TWO large batlike wings with TEAL inner membranes. Two forelimbs with claws and two hind legs; one long curling tail. Ivory plate scales, fine sparse red crack-like existing markings, golden claw/horn accents, gold lightning sphere floating at the chest with thin lightning arcs. Keep mature dangerous dragon proportions, no humanoid face, no cute baby features, no extra heads/arms/wings and no new ability.
Composition/framing: Match current card's three-quarter roaring airborne display inside an overgrown ruined glass-roof hall. Head turns toward viewer's right, mouth open, two wings up and out, two foreclaws spreading around the existing golden lightning sphere at chest, hind feet and curled tail visible below. Preserve current camera, pose, expression and lighting; balance the two visible wings clearly and retain all essential anatomy in canvas.
Design refinement: Elevate the beautiful, ancient apex-creature design through deliberate angular skull planes, strong jaw line and distinct crown-horn rhythm. Group ivory armor-like scales into large interlocking directional plates with small accent scales only at transitions, preserve red crack markings sparingly. Differentiate dry pearl-ivory scales, translucent-looking teal membrane with graphic vein structure, and warm horn/claw tips. Strong silhouette and clean negative gaps between horns and wing edges. Chest sphere is focused contained gold with a few designed arcs, does not bleach out anatomy. Simplify ruined background so head, ivory body and teal wings read immediately at thumbnail. Majestic and threatening, not busy and not covered in new jewelry.
Style/medium: premium bold graphic 2D anime cel illustration; confident thick-to-thin dark outer contours, lighter interior lines; intentionally grouped material masses; decisive one- or two-step hard-edged cel shadows; selective graphic highlights. Match style reference drawing quality without turning the character into either reference subject. Keep the target's palette. Output one tall portrait, approx 2:3 aspect, entire canvas is illustration. Remove all source card frame, rarity label, name, W RATE, ability text and UI from this newly generated illustration. Do NOT produce a mock card, comparison sheet, collage or multiple panels. Do not add lore, abilities, characters or objects. Avoid plastic CGI, photorealism, painterly blur, airbrush gradients, bloom, microdetail everywhere, generic glossy AI anime, random floating ornaments, text, watermark, signature.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-02-sora/ssr1-prompt-r02.txt`

````text
Use case: stylized-concept / identity-preserve. Character SSR1 Great Thunder Dragon r02 revised design. Render ONE striking, carefully art-directed collectible card illustration, portrait 2:3, art only with no card frame or lettering. This is a substantial pose/composition redesign following owner rejection of the prior saturated version, not a color-filter pass. Premium Japanese fantasy card illustration with clean expressive contours, grouped forms, hard cel-shaded planes and selective fine material accents. Restrained chroma: the majority of the image consists of complex grey, charcoal, weathered bone and muted local hues; preserve the character's hue families but make them substantially quieter. NO neon orange/teal, no HDR saturation, no rainbow, no global yellow wash, no excessive rim glow, no crushed blacks. Color accents should occupy under 5% of the canvas; still retain rich nuanced color, not grayscale or sepia. ONE coherent dominant key light, shadow planes and cast shadows must follow that same direction. No invented counter-rim lights on every edge. Legible face, strong silhouette and believable anatomy take priority over effect/detail. Style references are ONLY contour and grouped cel-shadow language; DO NOT copy their bright palette, character identities, cute creature anatomy or mature face. Do not copy labels, writing, UI, names, W RATE or abilities from any reference. Preserve known character identity and do not invent powers/lore. No additional characters, no text, signature, logo, watermark.
INPUT ROLES AND LOCKED IDENTITY: One ancient mature ivory-white western thunder dragon. Long angular REPTILIAN head with swept crown-like ivory horn array, small amber eyes, muted blue-green wing membranes and dorsal spines, sparse dark terracotta hairline crack markings, horn-colored claws, long tail. EXACTLY TWO independent wings attached high on the back, TWO forelimbs attached just behind lower neck at the chest shoulders, TWO powerful hind legs originating only at the pelvis, ONE head and ONE tail. Image 1 current identity; image 2 supporting proportions/color only, DO NOT copy its ambiguous limb anatomy. Images 3-4 drawing-language only; no baby dragon features.
POSE AND COMPOSITION: New pose for anatomical clarity and majesty: three-quarter SIDE view of the dragon descending onto a broad ruined stone parapet, head elevated and aimed slightly down toward viewer's left, proud S-curve neck, torso aligned along a readable horizontal-diagonal spine to the hips. The near and far HIND FEET are both visibly planted on the same parapet plane, staggered naturally; each leg has a visible thigh from pelvis, forward knee, backward hock, metatarsal and reptilian toes gripping stone. Forelimbs do NOT touch ground: one near forearm reaches down and forward with a relaxed curved talon hand, one far forearm held closer to chest but with clear separate elbow/wrist. Each hand has FOUR slim articulated clawed digits in total, three long fingers and a shorter opposable inner digit, claws growing from the fingertip ends; reptilian paw structure, NOT a human palm with four bent thumbs. Far hand can be partly occluded but must have one plausible attachment path, never an extra limb. Two wings rise behind in a broad slightly folded arch, neither grows out of a hand or hip. Tail roots at sacrum behind pelvis and curls away along parapet. Full feet stay visible, no limbs floating beside belly, no talon-shaped lower legs. Restrained half-open jaws rather than enormous scream. A SMALL contained golden thunder sphere floats in negative space in front of chest, not obscuring wrists, elbows or feet. Vast dim ruined glass hall behind with simplified pillars and depth.
LIGHTING AND COLOR SCRIPT: Single cool-neutral DAYLIGHT shaft from broken roof UPPER LEFT. Every upper-left skull/horn/scale plane, shoulder, thigh and wing ridge faces that same key. Lower-right body planes share cool slate half-shadow. Both feet cast contact shadows consistently down-right across ledge. The small muted pale-gold chest sphere is a low-intensity secondary emitter affecting only nearest chest underside/fingers with weak local warm bounce; no arcs crossing the joints, no white-yellow center bleaching the body. Wings are muted petrol/sage, body weathered pearl/stone ivory, not saturated cyan and lemon.
Read priority: face/head first, meaningful gesture second, costume/anatomy third, environment last. Show coolness through weight, balance, silhouette and precise facial acting, NOT extra ornament, speed lines, color saturation or effects.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-03-sora/ssr1-prompts.txt`

````text
Apply a VERY CONSERVATIVE premium-anime-color-correction finishing pass to this owner-liked white thunder dragon artwork. This version's composition and design are approved to retain: LOCK every horn, face, eye, jaw, neck, scale outline, two wings, two hands and finger shapes, both hind leg positions, foot contacts, single tail, lightning sphere position/size, ruined glass hall, lighting direction, crop and palette. No redesign or posing changes. Refine line clarity and use cleaner deliberate anime cel-shadow boundaries on large body planes, reduce mottled painterly brush grain while preserving scale pattern. Refine material distinction of ivory scale, muted teal membrane and bone-colored claw, fine controlled highlights. Improve apparent detail and local tonal depth gently; premium commercial anime finish. Upper-left daylight remains the ONLY main key; small golden sphere remains subdued local emitter. Maintain the owner's restrained saturation; no HDR chroma boost, global contrast boost, new blue rims, golden wash, new scales or added spikes. No plastic 3D appearance, no oversharpening, bloom, crushed shadows, changed anatomy, text or border. Image 1 is the exact edit target. One portrait 2:3.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-04-sora/ssr1_card-prompt.txt`

````text
Composite the approved illustration image 2 into card image 1. Image 1 is exact existing Great Thunder Dragon card template. Change ONLY upper illustration field: use image 2's owner-approved ivory dragon standing on ruined parapet, exact majestic head/crown horns, two wings, two arms and two grounded hind legs, muted teal membranes and small golden sphere. Fit the illustration intelligently to art window while preserving feet and upper head as much as possible. No limb redesign, no new pose, no saturation boost. Image 1's gold border and SSR badge, GREAT THUNDER DRAGON name, W RATE 80%, and complete lower ability text/panel must remain EXACTLY unchanged. Do not regenerate typography, change numbers, alter panel geometry or invent card effects. Single whole card, same proportions as image 1.
````

## SSR2 / Blood Man

- 逆立つ灰色の髪と、強い陰影で隠れた目元。
- 筋肉質の人型。黒い肩・腕の装備と暗色の服で、低く身をひねる。
- 長い刃を構え、カードには赤い斬撃線が走る。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 不明 ／ 寸前 不明。

**参照**

- `public/images/cards/player/SSR2/card.webp`
- `public/images/battle-characters/blood-man/idle/0000.png`
- `outputs/email-player-master-pack-visuals/SSR2-Blood-Man-master-visual.jpg`
- `public/images/cards/player/SSR2/BLOOD MAN.md`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-SSR2-faceoff-alpha-1920x1080.png`

### 過去プロンプト

不明。

## SSR3 / Ghost of Emperor

- 顔は青白い光と影で細部が不明。頭部に冠状のシルエット。
- 細長い幽体で、衣の帯や裾が青白く空中にたなびく。
- 長柄の大鎌を持つ。透けた足元とシアンの輪郭が特徴。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 作りかけ（カットイン静止画・案あり。完成動画は不明） ／ 寸前 不明。

**参照**

- `public/images/cards/player/SSR3/card.webp`
- `public/images/battle-characters/ghost-of-emperor/idle/0000.png`
- `outputs/email-player-master-pack-visuals/SSR3-Ghost-of-Emperor-master-visual.jpg`
- `public/images/cards/player/SSR3/GHOST OF EMPEROR.md`
- `public/images/cards/player/SSR3/character-inserts/ghost-of-emperor-forward-closeup-cut-in-idea-sheet-v1.png`
- `public/images/cards/player/SSR3/character-inserts/ghost-of-emperor-overhead-scythe-20mm-wide-angle-closeup-premium-anime-hdr-upscale.png`
- `public/images/cards/player/SSR3/character-inserts/ghost-of-emperor-overhead-scythe-20mm-wide-angle-closeup-v1.png`
- `public/images/cards/player/SSR3/character-inserts/ghost-of-emperor-overhead-scythe-wide-closeup-dynamic-v1.png`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-SSR3-faceoff-alpha-1920x1080.png`

### 過去プロンプト

不明。

## SSR4 / White Sword Man

- 短い金髪の男性。前髪が目元にかかる。
- 白銀の装甲と金色の縁取り、長い白い衣の裾。均整の取れた人型。
- 前方に大きな直剣を横切らせ、足元に青緑の円紋。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 不明 ／ 寸前 不明。

**参照**

- `public/images/cards/player/SSR4/card.webp`
- `public/images/battle-characters/white-knight/idle/000.png`
- `outputs/email-player-master-pack-visuals/SSR4-White-Sword-Man-master-visual.jpg`
- `public/images/cards/player/SSR4/WHITE SWORD MAN.md`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-SSR4-faceoff-alpha-1920x1080.png`

### 過去プロンプト

不明。

## UR1 / Mami

- 長く波打つ黒〜青緑の髪、青緑の瞳。明るい表情。
- 白〜淡い灰色の服に青緑の首布と帯・装飾。細身。
- 片手を大きく手前に伸ばす。現行カード絵では手持ち武器は見えない。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 作りかけ（カットイン静止画・案あり。完成動画は不明） ／ 寸前 不明。

**参照**

- `public/images/cards/player/UR1/card.webp`
- `public/images/battle-characters/mami/idle/Sequence00.webp`
- `outputs/email-player-master-pack-visuals/UR1-Mami-card-vs-animation-comparison.jpg`
- `outputs/email-player-master-pack-visuals/UR1-Mami-master-visual.jpg`
- `public/images/cards/player/UR1/MAMI.md`
- `public/images/cards/player/UR1/style-exploration/ur1-mami-four-style-comparison-v1.png`
- `public/images/cards/player/UR1/character-inserts/mami-attack-closeup-premium-anime-hdr.png`
- `public/images/cards/player/UR1/character-inserts/mami-forward-closeup-cut-in-idea-sheet-v1.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/ur1-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/ur1-draft-01.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/ur1-proposal-01.png`
- `outputs/character-design-review/2026-11-02/revision-01-sora/ur1-source-card.webp`
- `outputs/character-design-review/2026-11-02/revision-02-sora/ur1-face-detail.png`
- `outputs/character-design-review/2026-11-02/revision-02-sora/ur1-proposal-r02.png`
- `outputs/character-design-review/2026-11-02/revision-02-sora/ur1-r01-r02-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-03-sora/ur1-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-03-sora/ur1-premium-anime-r03.png`
- `outputs/character-design-review/2026-11-02/revision-04-sora/ur1-proposal-r04.png`
- `outputs/character-design-review/2026-11-02/revision-05-sora/ur1-comparison.png`
- `outputs/character-design-review/2026-11-02/revision-05-sora/ur1-proposal-r05.png`
- `outputs/character-design-review/2026-11-03/revision-01-sora/mami-A.png`
- `outputs/character-design-review/2026-11-03/revision-01-sora/mami-B.png`
- `outputs/character-design-review/2026-11-03/revision-01-sora/mami-C.png`
- `outputs/character-design-review/2026-11-03/revision-01-sora/mami-comparison.png`
- `outputs/character-design-review/2026-11-08/revision-01-sora/mami-A.png`
- `outputs/character-design-review/2026-11-08/revision-01-sora/mami-B.png`
- `outputs/character-design-review/2026-11-08/revision-01-sora/mami-comparison.png`
- `outputs/character-design-review/2026-11-08/revision-02-sora/mami.png`
- `outputs/character-design-review/2026-11-08/revision-05-sora/mami-owner-selected-original.png`
- `outputs/character-design-review/2026-11-08/revision-05-sora/mami-peripheral-lens.png`
- `outputs/character-design-review/2026-11-08/revision-06-sora/mami-lens-redraw.png`
- `outputs/character-design-review/2026-11-08/revision-07-sora/mami-face-hair-restored.png`
- `outputs/character-design-review/2026-11-08/revision-08-card-application/ur1-before-card.png`
- `outputs/character-design-review/2026-11-08/revision-08-card-application/ur1-before-card.webp`
- `outputs/character-design-review/2026-11-08/revision-08-card-application/ur1-card.png`
- `outputs/character-design-review/2026-11-08/revision-08-card-application/ur1-card.webp`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-UR1-faceoff-alpha-1920x1080.png`

### 過去プロンプト

- 元ファイル `outputs/character-design-review/2026-11-02/revision-01-sora/ur1-correction-prompt.txt`

````text
Use case: precise-object-edit. Edit only the supplied Mami art proposal. Remove the SMALL EXTRA FLOATING HAND immediately behind her head/hair on the upper-right, around x=900 y=530 in this 1024x1536 image; replace only that tiny hand with the matching turquoise/gold architectural background and existing flowing hair continuation. It is an anatomical generation error, not a prop. Keep her real trailing arm and hand on the far right around y=820 intact, keep her reaching foreground five-fingered hand intact. Exactly TWO arms and TWO hands total after correction. Preserve everything else exactly: Mami's face, green eyes, smile, age, black/teal hair, ivory robe/cyan embroidery, dark teal scarf, leather belts and bracers, pose, camera, background, palette and hard-edged graphic cel drawing. No new anatomy, objects, text, frame or crop change.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-01-sora/ur1-prompt-01.txt`

````text
Use case: identity-preserve. Asset type: single portrait art-only character design improvement proposal, not a finished card. Primary request: redraw UR1 Mami as a higher-quality, desirable collectible-game illustration while unmistakably preserving this character. Inputs: image 1 is the owner-selected current card identity and composition source; image 2 is supporting existing character-sheet anatomy/costume reference (do not copy any labels or ability text); image 3 and 4 are the project's selected bold graphic cel STYLE ONLY references, never borrow their character designs or palette. Locked identity: One youthful female dimension traveler, retain source apparent age and slender agile human proportions. Long flowing near-black hair with dark teal sheen, side part and side-swept fringe, bright GREEN eyes, warm open-mouth cheerful smile and approachable heroine expression. Ivory-white traveler robe with existing CYAN rune embroidery, dark TEAL scarf, brown leather waist belts and wrist bracers, dark teal trousers and brown boots where visible, small gold earrings. No new crown, armor, weapon, prop or magic system. No color change, no adult glamour makeover, no sexualization, no oversized glossy eyes.
Composition/framing: Match the current card art's dynamic friendly reaching pose and tilted camera: head near upper middle, hair flowing to image left, right arm extended toward viewer into lower-left foreground with one anatomically correct open five-fingered hand, other arm trailing behind to the right, robe and scarf flowing through luminous turquoise architectural space with warm window lights. Preserve original smile/gaze, body angle, close perspective, same crop around thighs, same color palette and lighting.
Design refinement: Make the heroine feel premium through a bespoke readable face rather than generic glossy anime: compact shaped green irises, confident upper lids, subtle nose and jaw planes, crisp expressive smile. Group flowing hair into elegant intentional ribbons with dark interior masses and restrained teal highlights. Make costume construction tangible: matte ivory woven cloth with clean seams and broad tailored folds, existing cyan embroidery integrated into fabric, structured dark teal scarf, separate supple brown leather belts and cuff segments with only restrained metal accents. Correct the perspective and joints of the reaching hand, five clear fingers, natural wrist. Strong face/hand/white-robes hierarchy; keep cyan background effects quiet enough that robe markings and silhouette stand out. No extra fantasy ornamentation.
Style/medium: premium bold graphic 2D anime cel illustration; confident thick-to-thin dark outer contours, lighter interior lines; intentionally grouped material masses; decisive one- or two-step hard-edged cel shadows; selective graphic highlights. Match style reference drawing quality without turning the character into either reference subject. Keep the target's palette. Output one tall portrait, approx 2:3 aspect, entire canvas is illustration. Remove all source card frame, rarity label, name, W RATE, ability text and UI from this newly generated illustration. Do NOT produce a mock card, comparison sheet, collage or multiple panels. Do not add lore, abilities, characters or objects. Avoid plastic CGI, photorealism, painterly blur, airbrush gradients, bloom, microdetail everywhere, generic glossy AI anime, random floating ornaments, text, watermark, signature.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-02-sora/ur1-prompt-r02.txt`

````text
Use case: stylized-concept / identity-preserve. Character UR1 Mami r02 revised design. Render ONE striking, carefully art-directed collectible card illustration, portrait 2:3, art only with no card frame or lettering. This is a substantial pose/composition redesign following owner rejection of the prior saturated version, not a color-filter pass. Premium Japanese fantasy card illustration with clean expressive contours, grouped forms, hard cel-shaded planes and selective fine material accents. Restrained chroma: the majority of the image consists of complex grey, charcoal, weathered bone and muted local hues; preserve the character's hue families but make them substantially quieter. NO neon orange/teal, no HDR saturation, no rainbow, no global yellow wash, no excessive rim glow, no crushed blacks. Color accents should occupy under 5% of the canvas; still retain rich nuanced color, not grayscale or sepia. ONE coherent dominant key light, shadow planes and cast shadows must follow that same direction. No invented counter-rim lights on every edge. Legible face, strong silhouette and believable anatomy take priority over effect/detail. Style references are ONLY contour and grouped cel-shadow language; DO NOT copy their bright palette, character identities, cute creature anatomy or mature face. Do not copy labels, writing, UI, names, W RATE or abilities from any reference. Preserve known character identity and do not invent powers/lore. No additional characters, no text, signature, logo, watermark.
INPUT ROLES AND LOCKED IDENTITY: Mami, specifically a 15-16-year-old high-school-age GIRL as corrected by the owner. Match the original current card's youthful face: short soft jaw, gently rounded cheeks, small nose and mouth, clear emerald-green eyes with compact highlights, no makeup. Young adolescent slender straight silhouette, smaller shoulders and hands, approx 6.5 heads tall, no adult hourglass/long glamor torso, no adult mature facial structure, no chibi/toddler proportions. Long near-black dark teal hair with side fringe, ivory-white loose travel tunic/robe with sparse original muted cyan embroidered motifs, dark forest-teal scarf, brown leather belts/wrist bracers, dark trousers and practical boots. Fully clothed modest travel clothing with normal room around torso, no tight chest/waist sculpting or exposed skin beyond face/hands. Keep hopeful kind energy, not a model pose. Image 1 is PRIMARY youthful identity; image 2 supporting wardrobe only. Images 3-4 are drawing language only: do NOT copy the more mature Mami face from style image 3.
POSE AND COMPOSITION: New heroic character-card composition: Mami caught in a decisive forward RUNNING STEP across a quiet ruined corridor, shown from slightly BELOW EYE LEVEL in three-quarter FRONT view. Torso pitched forward naturally but not twisted to accentuate body, rear heel lifted, leading knee forward; head turned toward viewer with a small bright, determined open smile. One hand raised beside shoulder with fingers naturally separated and palm half outward, the other arm bent close to waist in a running swing. Exactly TWO connected arms and TWO hands, FIVE fingers on any fully visible hand; no hand reaching huge toward lens. Face occupies enough canvas to read; frame knees-up so clothing dominates silhouette, hair and scarf fly as ONE grouped wind direction to viewer's right. Upper-left negative space and calm background. No new prop or staff, no giant portal or glowing magical attack.
LIGHTING AND COLOR SCRIPT: One broad SOFT neutral daylight window offscreen UPPER LEFT FRONT. Face, shoulder and white cloth planes facing upper-left lit; nose shadow falls lower-right, chin shadows neck, scarf casts a consistent shadow onto chest, overlapping robe layers darken lower-right. Background window architecture obeys same source. Faint low-chroma dust light only. White robe stays warm grey-ivory, scarf subdued deep forest teal, hair charcoal with restrained blue-green accents, natural pale-peach skin, quiet sage/cyan embroidery that does not emit light. Background desaturated stone blue-grey and small warm-grey windows. Do not make cheek shadows mature or harsh; keep face readable with mild neutral ambient fill.
Read priority: face/head first, meaningful gesture second, costume/anatomy third, environment last. Show coolness through weight, balance, silhouette and precise facial acting, NOT extra ornament, speed lines, color saturation or effects.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-03-sora/ur1-prompts.txt`

````text
Edit the supplied Mami r02 artwork. Preserve EXACTLY her approved youthful 15-16-year-old face, smile, body proportions, two arms/hands, running pose, outfit, hair silhouette, scarf, crop and foreground perspective. Change ONLY the ruined medieval background into a PASTEL SCI-FI CYBER CITY she is running through: elevated pedestrian causeway, layered futuristic towers, elegant transit bridges and luminous windows, soft dusty lavender, pale mint, powder pink, pearl ivory and muted sky blue. Sophisticated atmospheric city depth, not a bright neon advertising wall. No medieval broken columns or stone ruin. No readable signs, no new props, no extra people. Match existing upper-left soft daylight and corresponding right-down shadows; distant pastel architecture lower contrast than face. After background replacement apply the premium-anime-color-correction finishing pass: clean commercial 2D ANIME finish, precise linework, grouped cel-shadow planes, clear cloth seams, polished restrained material highlights. REMOVE mottled painterly/grainy brush textures from face, cloth and hair; keep form, design and local colors intact. Improve apparent clarity, local tonal depth, subtle cool shadow tint, delicate warm highlights and readable midtones. Override the usual vivid HDR look: preserve restrained saturation, no global jewel-tone boost, no plastic skin, bloom, over-sharpening, glowing cyan robe, changed maturity or altered fingers. Face and costume stay main focus. One art-only portrait, 2:3, no border/text.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-04-sora/ur1-prompt.txt`

````text
Revise Mami. Image 1 is her owner-liked current character design and youthful 15-16-year-old face, wardrobe and pastel city palette. Image 2 is the ORIGINAL COMPOSITION reference: emulate its plunging diagonal perspective, open joyful face, hair streaming left, forward reaching right hand and body bursting toward viewer from luminous dimensional surroundings. Do not copy image 2's excessive neon saturation. Replace image 1's ordinary running-on-street composition with Mami LEAPING OUT OF A DIMENSIONAL GATE toward the camera: three-quarter forward diagonal action, upper torso/face dominate, right hand opens toward lower-left foreground, EXACTLY five connected fingers, natural wrist/elbow; other arm trails behind on right. Two arms only. Head turns toward viewer with original warm open smile, round youthful cheeks/short jaw, small nose, green eyes. Slender adolescent build, loose modest ivory travel robe with pale cyan embroidery, dark forest-teal scarf, brown bracers/belts, black-teal hair. One knee comes forward, rear leg recedes through gate, no adult curvy model pose. Behind her is ONE dimensional gateway: a softly luminous elliptical discontinuity in space, broken luminous translucent segments and flowing refracted pastel city shapes marking passage, not a new weapon/attack. She is clearly crossing the gate threshold, scarf/hair/robe swept backward through it. Pastel futuristic cyber city behind the gate in dusty pink, lavender, sage and pearl blue. Strong diagonal depth like original reference, subtle peripheral motion streaks only; face/hand sharp. Gate light is soft and localized, coherent upper-left light and shadow, NO luminous orange floor or glossy mirror pavement, no giant neon cyan wash. Clean premium commercial anime cel finish, crisp contours and organized shadows, reduce brush grain, restrained chroma and readable rich midtones. Portrait 2:3 artwork, no text/frame. Preserve Mami identity, do not add time-travel lore or new gameplay powers.
````

- 元ファイル `outputs/character-design-review/2026-11-02/revision-05-sora/ur1-prompt.txt`

````text
Use case: lighting-weather/style finishing edit. This Mami image is ALMOST APPROVED; change ONLY excessive shine into FLAT MATTE ANIME RENDERING. Preserve exact face, youthful 15-16-year-old apparent age, smile, eyes, hairstyle/silhouette, hand/fingers, two arms, pose, clothing, crop, perspective, oval dimensional gate geometry and pastel cyber city. Do NOT redesign or change composition. Remove glossy/specular streaks from hair, skin, cloth, leather, metal and buildings; keep their base colors and simple broad cel-shaded light/shadow planes. Skin is matte, hair highlights are a few subdued flat teal-grey shape accents rather than white ribbons. Ivory robe is matte woven cloth with restrained shading, bracers matte leather, no wet sparkling surface. GREATLY REDUCE bloom/glare, lens flare, prismatic sparkles, white-hot rim lights, diamond glints and shiny shard reflections throughout background. Gate remains visible as a SOFT low-intensity translucent pastel light ring, not a bright white rainbow tube; preserve its outline/placement and leap-through storytelling. City remains dusty lavender, blush pink, pearl blue, sage, muted cream, with soft low-contrast window light, no metallic glitter. Recover pastel color in the overly white background, preserve subtle tonal separation, no grey muddy wash and no harsh darkening. Coherent soft upper-left illumination with readable shadow planes. Clean crisp premium 2D anime cel illustration, calm flat color fills, modest saturation; no painterly texture or plastic CGI. Absolutely no new fingers, objects, text, card border or changes to original youthful expression. Output same 2:3 portrait.
````

- 元ファイル `outputs/character-design-review/2026-11-03/revision-01-sora/mami-A-prompt.txt`

````text
One art-only 2:3 illustration of original Mami. Reference is PRIMARY face, costume, color and emotional identity: youthful 15-16-year-old girl, green eyes, long near-black teal hair, ivory travel robe with cyan marks, dark teal scarf, brown bracers/belts. Restore ORIGINAL luminous TURQUOISE/TEAL environment with small warm apricot/amber windows, NOT washed-out lavender pastel. Matte clean anime cel rendering, restrained speculars, no white glare, no rainbow glitter. Body vertical on canvas: head centered directly ABOVE chest and hips, shoulders nearly level, NO sideways tilt, NO dutch angle. Mami emerges toward viewer across a dimensional threshold, cheerful open smile, right hand reaching into lower-left foreground, exactly five connected fingers and two arms, other arm trails to right, one knee forward. Forward motion in depth, not diagonal body roll. Face resembles original rounded youthful face, not mature glamor. Gate must be a WAVING SPATIAL MEMBRANE with a visibly different WORLD THROUGH ITS INTERIOR, never just a luminous ring in the same scene. No circular hoop, no empty halo, no ornate arch, no text/frame, no extra characters or new gameplay ability specification. GATE DESIGN A / rippling water window. A large almost-rectangular vertical tear behind Mami with irregular WAVING edges like liquid glass, no circular outline. Inside tear is a deep glowing TURQUOISE CYBER CITY with stacked windows and long receding elevated bridges, original warm apricot light accents. Outside the tear is a quiet dark blue-grey stone arrival-world corridor/terrace; clearly TWO environments. Mami's torso and hand have crossed toward viewer, trailing scarf and rear leg still break through surface. Concentric water ripples and local refraction bend distant towers at contact points, interior city details remain distinct and legible. Warm ivory face receives soft upper-left neutral light, cyan bounce on back sleeve only. Gate energy broad low-gloss translucent waves, no white neon rim.
````

- 元ファイル `outputs/character-design-review/2026-11-03/revision-01-sora/mami-B-prompt.txt`

````text
One art-only 2:3 illustration of original Mami. Reference is PRIMARY face, costume, color and emotional identity: youthful 15-16-year-old girl, green eyes, long near-black teal hair, ivory travel robe with cyan marks, dark teal scarf, brown bracers/belts. Restore ORIGINAL luminous TURQUOISE/TEAL environment with small warm apricot/amber windows, NOT washed-out lavender pastel. Matte clean anime cel rendering, restrained speculars, no white glare, no rainbow glitter. Body vertical on canvas: head centered directly ABOVE chest and hips, shoulders nearly level, NO sideways tilt, NO dutch angle. Mami emerges toward viewer across a dimensional threshold, cheerful open smile, right hand reaching into lower-left foreground, exactly five connected fingers and two arms, other arm trails to right, one knee forward. Forward motion in depth, not diagonal body roll. Face resembles original rounded youthful face, not mature glamor. Gate must be a WAVING SPATIAL MEMBRANE with a visibly different WORLD THROUGH ITS INTERIOR, never just a luminous ring in the same scene. No circular hoop, no empty halo, no ornate arch, no text/frame, no extra characters or new gameplay ability specification. GATE DESIGN B / folded space curtain. Behind Mami, a broad VERTICAL translucent curtain of space with large S-shaped WAVE FOLDS billows outward as she bursts through. Through folds see original brilliant teal layered science-fiction city, orange window rectangles and distant cyan towers in perspective. In front/outside is a quiet warm ivory/sand architecture world, contrasting the teal other-side. The actual boundary forms overlapping flowing liquid-glass sheets with contour refraction, not fabric prop and not a hoop. Scarf/rear foot overlap threshold so crossing is unambiguous. Soft neutral daylight and gentle cyan rear bounce, clean teal/ivory/apricot palette with actual rich colors, no high-gloss rainbow effects.
````

- 元ファイル `outputs/character-design-review/2026-11-03/revision-01-sora/mami-C-prompt.txt`

````text
One art-only 2:3 illustration of original Mami. Reference is PRIMARY face, costume, color and emotional identity: youthful 15-16-year-old girl, green eyes, long near-black teal hair, ivory travel robe with cyan marks, dark teal scarf, brown bracers/belts. Restore ORIGINAL luminous TURQUOISE/TEAL environment with small warm apricot/amber windows, NOT washed-out lavender pastel. Matte clean anime cel rendering, restrained speculars, no white glare, no rainbow glitter. Body vertical on canvas: head centered directly ABOVE chest and hips, shoulders nearly level, NO sideways tilt, NO dutch angle. Mami emerges toward viewer across a dimensional threshold, cheerful open smile, right hand reaching into lower-left foreground, exactly five connected fingers and two arms, other arm trails to right, one knee forward. Forward motion in depth, not diagonal body roll. Face resembles original rounded youthful face, not mature glamor. Gate must be a WAVING SPATIAL MEMBRANE with a visibly different WORLD THROUGH ITS INTERIOR, never just a luminous ring in the same scene. No circular hoop, no empty halo, no ornate arch, no text/frame, no extra characters or new gameplay ability specification. GATE DESIGN C / deep refractive wave tunnel. Mami emerges upright from a LONG spatial tunnel behind her: multiple irregular offset WAVING translucent cross sections recede into deep perspective, broad liquid walls rather than luminous circular rings. At far end, a clearly visible OTHER WORLD: turquoise cyber-city canyon with warm coral/amber windows and layered bridges. Arrival-world foreground a muted navy urban terrace, not the same architecture repeated through tunnel. Distorted city fragments are visible THROUGH undulating tunnel walls, with ripples passing where scarf and rear leg cross threshold. A strong readable cyan-to-navy depth gradient and small coral lights lead eye to her face. Keep face/skin ivory warm and outfit natural, rich original teal dominant, no bleached pastel pink, no glitter. Gate edges are darker translucent teal wave surfaces with gentle highlights, not blazing white bands.
````

- 元ファイル `outputs/character-design-review/2026-11-08/revision-01-sora/mami-A-prompt.txt`

````text
One portrait 2:3 UR-quality anime character illustration. Image 1 is accepted youthful Mami identity: 15-16-year-old appearance, softly rounded face, short jaw, emerald eyes, hopeful open smile, black-teal flowing long hair, ivory robe with cyan markings, dark teal scarf, brown leather belts/bracers, slim modest adolescent build. Image 2 is original UR COMPOSITION/COLOR/ENERGY reference. Bring back original dazzling TURQUOISE city-light color and small warm apricot windows plus SELECTIVE RAINBOW PRISMATIC UR accents in far/peripheral space. Mami FLIES TOWARD VIEWER through dimensional space, not jogging/standing: strong depth foreshortening with face and reaching right hand prominent toward camera, one knee advancing toward lens, trailing leg receding into vortex behind, robe/hair/scarf swept BACK by speed. Exactly two connected arms/two hands, fully visible hand has five fingers. Other arm extends back to right. Head above chest/hips with a near-vertical central body axis, do not roll torso sideways or use severe dutch angle; convey speed in depth, flowing cloth and environment. NO GROUND anywhere: no floor, pavement, terrace, street, steps, horizon ground plane or feet touching surfaces. Background is weightless aerial DIMENSIONAL PASSAGE with wave-like refracting membrane, receding glimpses of a different turquoise cyber-world and original-style architectural/window streaks dissolving into abstract luminous depth. Boundary should have real undulating surfaces and other-side depth, not an isolated empty luminous hoop. Peripheral spectral pink/violet/gold/cyan bands and rainbow thin-film refraction establish UR rarity, localized behind her; keep face/skin and ivory costume natural, no rainbow skin. Face and right hand sharp; background streaks radiate coherently away from movement toward camera, fine peripheral directional blur only. Clean premium anime cel contours and hard/soft controlled shadow shapes. Keep skin/cloth MATTE, no white-hot specular glaze, oversaturated full-screen rainbow, plastic CGI or blown highlights. Coherent soft upper-left front key plus gentle cyan rear light motivated by passage. No extra props, text, card frame or new ability specification. ACTION A: original-style direct CAMERA APPROACH, upper torso and right hand large, head near upper-center, hair sweeps left, trailing scarf runs behind right. Turquoise window-city fragments and warm orange window streaks stream backward; wavering dimensional veil recedes behind shoulders. Rainbow accents are thin peripheral rays with clear cyan dominant. Strong sense of bursting OUT into viewer space.
````

- 元ファイル `outputs/character-design-review/2026-11-08/revision-01-sora/mami-B-prompt.txt`

````text
One portrait 2:3 UR-quality anime character illustration. Image 1 is accepted youthful Mami identity: 15-16-year-old appearance, softly rounded face, short jaw, emerald eyes, hopeful open smile, black-teal flowing long hair, ivory robe with cyan markings, dark teal scarf, brown leather belts/bracers, slim modest adolescent build. Image 2 is original UR COMPOSITION/COLOR/ENERGY reference. Bring back original dazzling TURQUOISE city-light color and small warm apricot windows plus SELECTIVE RAINBOW PRISMATIC UR accents in far/peripheral space. Mami FLIES TOWARD VIEWER through dimensional space, not jogging/standing: strong depth foreshortening with face and reaching right hand prominent toward camera, one knee advancing toward lens, trailing leg receding into vortex behind, robe/hair/scarf swept BACK by speed. Exactly two connected arms/two hands, fully visible hand has five fingers. Other arm extends back to right. Head above chest/hips with a near-vertical central body axis, do not roll torso sideways or use severe dutch angle; convey speed in depth, flowing cloth and environment. NO GROUND anywhere: no floor, pavement, terrace, street, steps, horizon ground plane or feet touching surfaces. Background is weightless aerial DIMENSIONAL PASSAGE with wave-like refracting membrane, receding glimpses of a different turquoise cyber-world and original-style architectural/window streaks dissolving into abstract luminous depth. Boundary should have real undulating surfaces and other-side depth, not an isolated empty luminous hoop. Peripheral spectral pink/violet/gold/cyan bands and rainbow thin-film refraction establish UR rarity, localized behind her; keep face/skin and ivory costume natural, no rainbow skin. Face and right hand sharp; background streaks radiate coherently away from movement toward camera, fine peripheral directional blur only. Clean premium anime cel contours and hard/soft controlled shadow shapes. Keep skin/cloth MATTE, no white-hot specular glaze, oversaturated full-screen rainbow, plastic CGI or blown highlights. Coherent soft upper-left front key plus gentle cyan rear light motivated by passage. No extra props, text, card frame or new ability specification. ACTION B: forward flying leap through a DEEP CURLING WAVE TUNNEL, face and reaching hand stay central, trailing legs recede into center of deep space, no rigid hoop. Background teal city fragments stretch into a bright fluid spiral beyond her with opalescent pink/gold/lavender wave-edge refractions along sides. More visible broad flowing scarf/robe arcs, speed conveyed by their sweep and receding parallax. Cyan/teal dominates; a controlled rainbow fan surrounds distant exit, no ground.
````

- 元ファイル `outputs/character-design-review/2026-11-08/revision-02-sora/mami-prompt.txt`

````text
Edit ONLY lighting and tonal contrast of this owner-liked Mami illustration. LOCK her youthful face/expression/green eyes, anatomy, five-finger reaching hand, hair silhouette, scarf/robe, flying pose, rainbow peripheral refraction, teal dimensional city background, crop and ALL composition. Do NOT add ground or change motion. Increase 3D form readability with STRONGER BROAD SOFT SHADOWS and local tonal contrast: gently deepen shadow beneath fringe on forehead, opposite cheek edge, chin onto scarf, scarf onto chest, sleeve folds, underside of forward arm/hand, belt/robe overlap, inside thigh, hair interior masses. Broad soft neutral upper-left key stays same; shadows coherent lower-right and softly feathered, not random graphic stripes. Retain face warmth and youthful cheeks, bright eyes, readable details in charcoal hair/scarf and shadow cloth. Keep highlights controlled and skin/cloth matte. Separate near figure from distant luminous cyan city with darker sculpted midtones on figure; preserve rich original teal and subtle UR rainbow accents, do not globally desaturate or simply crush blacks. Moderate increase in depth/contrast only, no extra bloom, shiny skin, white glare, maturity change, new anatomy/objects, text or border. Same 2:3 portrait.
````

- 元ファイル `outputs/character-design-review/2026-11-08/revision-06-sora/generation-prompt.txt`

````text
Use case: identity-preserving STYLE REDRAW. Owner now explicitly requests RE-DRAWING the ARTWORK quality, not applying a soft-focus filter. IMAGE 1 is exact MAMI identity/composition/costume master and edit target. Images 2-3 are RENDERING and CAMERA OPTICS references ONLY. Re-illustrate image 1 with the sophisticated sharply resolved premium anime draftsmanship/material lighting of image 3 and controlled prismatic optical finish of images 2-3. Transfer NO character/prop features from style refs. Keep Mami unmistakably IDENTICAL in design: youthful 15-16-year-old girl, same round youthful face proportions, same bright emerald green eyes and open cheerful smile, near-black teal long flowing hair with the same swept silhouette, tiny original earrings, ivory travel robe with same cyan symbols/embroidery, dark forest teal scarf, brown belts/bracers, dark trousers and boots, exact garment construction and markings, no new accessories or changes to anatomy. Same forward airborne reaching pose, two arms and hands with correct five fingers, hair flowing to left, hand lower-left foreground, other arm trailing right, knee forward, body axis near upright. Same framing/2:3 crop and teal dimensional city/rainbow peripheral waves, no ground.
DRAWING UPGRADE: extremely precise economical fine linework, beautifully drawn sharp irises/lids and expressive mouth, carefully constructed hands, clean distinct hair locks and filaments with selected luminous edges, finely designed fabric folds and material transitions. Sculpted controlled cel-shaded planes with delicate transitions, soft occlusion at overlaps, crisp sharp focal-plane contours, refined ivory/cyan embroidery and leather detail; not generic flat simplified anime, not heavy black outlines, not photorealism or plastic CGI. Skin stays natural matte and youthful; retain source green eyes/black-teal hair/ivory outfit, no white hair, blue eyes, sword, flowers, wings, armor or body glitter from style refs.
OPTICAL DEPTH OF FIELD: simulate a FAST CAMERA LENS focused precisely on her eyes and face/upper chest. Those focal elements are exquisitely SHARP, high-frequency detailed and high local contrast. The very nearest fingertips and palm at lower-left foreground lie in front of focal plane: selective optical CIRCLE-OF-CONFUSION defocus, gradual soft edge spread and rounded luminous bokeh in nearby light particles, palm still anatomically legible. Receding far architecture, distant windows and some nearest peripheral wave fragments fall behind/ahead focal plane and have depth-dependent lens bokeh; mid-depth details near face remain sharp. This is object/depth-selective LENS DEFOCUS, NOT uniform Gaussian haze, radial blur, all-over softness, vignette blur mask, smearing or bloom fog. Background/window highlights turn into subtly rounded bokeh only out of focus. Fine chromatic aberration/spectral fringe on a FEW peripheral high-contrast wave/glass edges, subtle rainbow refraction behind her, never colored double outlines on eyes/face. Preserve teal city, warm window accents and luminous dimensional flight energy. Luminous highlight control like refs but do not overexpose face/robe or add glaring forehead beams. Premium complex sharp illustration at focal plane, optical softness only outside focal depth. One finished art-only portrait, no text/frame.
````

- 元ファイル `outputs/character-design-review/2026-11-08/revision-07-sora/generation-prompt.txt`

````text
PRECISE LOCAL EDIT. Image 1 is the current owner-liked Mami lens redraw: preserve it as the edit target. Image 2 is ONLY the reference to RESTORE MAMI'S ORIGINAL FACE AND HAIR. Change ONLY face and hair in image 1 to the simpler design/drawing of image 2. Face must closely match image 2's round youthful cheeks, soft short jaw, simple compact green iris with modest two-tone fill and minimal highlights, simpler eyelids/lashes, small simple nose, warm open smile and simple skin shading. Remove image 1's intricate crystalline iris texture, multiple glints, individual eyelashes, blush micro-detail, sharp glossy nose highlight and over-modelled skin. Hair must match image 2's original near-black/dark-teal grouped broad flowing locks, same swept silhouette and fringe arrangement: remove most of image 1's fine filament strands, thin bright white edge lines, metallic blue specular striations and intricate flyaways. Use LARGE dark-teal masses with sparse subdued teal highlight shapes, clean restrained anime contours, not a highly rendered glassy wig. Keep face/hair SHARP in focal plane, this simplification is DRAWING, not blur. Do not recolor hair/eyes or change apparent age.
Everything ELSE must remain image 1: current high-quality ivory costume cyan embroidery, scarf, earrings, bracers/belts, forward flying anatomy/pose, enlarged foreground hand with lens defocus, other arm, legs, background depth of field and rounded bokeh, teal city, peripheral spectral refraction, illumination, composition, crop. Do NOT transfer image 2's sharp hand/background or simpler clothes. No new props, no floor, no new anatomy, no global style reset or global blur. One portrait 2:3 no text/frame. Only restore original simple Mami face and hair onto current lens-rendered artwork.
````

- 元ファイル `outputs/gemini-comparison/2026-11-05/revision-01/mami-A-prompt.txt`

````text
One art-only 2:3 illustration of original Mami. Reference is PRIMARY face, costume, color and emotional identity: youthful 15-16-year-old girl, green eyes, long near-black teal hair, ivory travel robe with cyan marks, dark teal scarf, brown bracers/belts. Restore ORIGINAL luminous TURQUOISE/TEAL environment with small warm apricot/amber windows, NOT washed-out lavender pastel. Matte clean anime cel rendering, restrained speculars, no white glare, no rainbow glitter. Body vertical on canvas: head centered directly ABOVE chest and hips, shoulders nearly level, NO sideways tilt, NO dutch angle. Mami emerges toward viewer across a dimensional threshold, cheerful open smile, right hand reaching into lower-left foreground, exactly five connected fingers and two arms, other arm trails to right, one knee forward. Forward motion in depth, not diagonal body roll. Face resembles original rounded youthful face, not mature glamor. Gate must be a WAVING SPATIAL MEMBRANE with a visibly different WORLD THROUGH ITS INTERIOR, never just a luminous ring in the same scene. No circular hoop, no empty halo, no ornate arch, no text/frame, no extra characters or new gameplay ability specification. GATE DESIGN A / rippling water window. A large almost-rectangular vertical tear behind Mami with irregular WAVING edges like liquid glass, no circular outline. Inside tear is a deep glowing TURQUOISE CYBER CITY with stacked windows and long receding elevated bridges, original warm apricot light accents. Outside the tear is a quiet dark blue-grey stone arrival-world corridor/terrace; clearly TWO environments. Mami's torso and hand have crossed toward viewer, trailing scarf and rear leg still break through surface. Concentric water ripples and local refraction bend distant towers at contact points, interior city details remain distinct and legible. Warm ivory face receives soft upper-left neutral light, cyan bounce on back sleeve only. Gate energy broad low-gloss translucent waves, no white neon rim.
````

## UR2 / Double Striker

- 短い金髪の細身の剣士。顔の細部はカードでは不明。
- 白銀の胴・脚装甲に金の金具。腕を左右に伸ばし、頭の後ろに青い輪。
- 左右の手に1本ずつ長剣。足元に青緑の円紋。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 作りかけ（カットイン静止画・案あり。完成動画は不明） ／ 寸前 不明。

**参照**

- `public/images/cards/player/UR2/card.webp`
- `public/images/battle-characters/double-striker/idle/0000.png`
- `outputs/email-player-master-pack-visuals/UR2-Double-Striker-master-visual.jpg`
- `public/images/cards/player/UR2/DOUBLE STRIKER.md`
- `public/images/cards/player/UR2/character-inserts/double-striker-closed-eyes-wide-angle-closeup-premium-anime-hdr.png`
- `public/images/cards/player/UR2/character-inserts/double-striker-cross-slash-closeup-premium-anime-hdr.png`
- `public/images/cards/player/UR2/character-inserts/double-striker-forward-closeup-cut-in-idea-sheet-v1.png`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-UR2-faceoff-alpha-1920x1080.png`

### 過去プロンプト

不明。

## UR3 / Abandoned Doll

- 黒い短い髪状の外装と、人形の横顔。側頭部に円形機構。
- 白灰色の曲面装甲と露出した分割関節の細身の人型。
- 顔に紫・シアン、肩に黄緑の反射。手持ち武器は見えない。

**状況**　待機 済（現行プリセットあり） ／ 攻撃 不明 ／ 寸前 不明。

**参照**

- `public/images/cards/player/UR3/card.webp`
- `public/images/battle-characters/broken-doll/idle/0000.png`
- `outputs/email-player-master-pack-visuals/UR3-Abandoned-Doll-master-visual.jpg`
- `public/images/cards/player/UR3/ABANDONED DOLL.md`

**フェイスオフ**

- `public/images/battle-scenes/attack-faceoffs/character-layers/edited/player-UR3-faceoff-premium-cel-ca-1920x1080.png`

### 過去プロンプト

不明。

## 作画スタイル共通資料

元の説明 `outputs/idle-animation-review/shared-style-references/README.md`

# 共通作画資料
今後のキャラクター制作で、キャラ固有の参照画像と併用する。
1. 青灰色の影と細い線の手描きアニメ
2. シアンの反射と硬いセル影
3. 深い影と虹色の素材反射を使うAAAファンタジー
4. 暖色のセル塗りとプリズム色

- `outputs/idle-animation-review/shared-style-references/style-1.png`
- `outputs/idle-animation-review/shared-style-references/style-2.png`
- `outputs/idle-animation-review/shared-style-references/style-3.png`
- `outputs/idle-animation-review/shared-style-references/style-4.png`

style-2はR2の参照画像 `outputs/idle-animation-review/2026-11-15/R2/r2-style-2-magenta-endpoints.png` に対応する名称がある。SR1以降の採用先とstyle-1・3・4のキャラ別の適用先は不明。キャラ別に確認できた生成案・比較画像は上記各章に記載。

### 採用済み絵柄の元画像

- `.codex/skills/apply-bold-graphic-cel-style/assets/ur1-mami-selected-top-right.png`（UR1・Mami。SR3等の検討でも描画スタイルの参照に使われた記録あり。採用範囲は各プロンプトを参照）
- `.codex/skills/apply-bold-graphic-cel-style/assets/r1-triplets-selected-top-right.png`（R1の選定絵。SR1以降の適用先は不明）
- `public/images/battle-scenes/attack-faceoffs/character-layers/premium-cel-ca-selected-contact-sheet.jpg`（フェイスオフのプレミアムセル調の比較）

## Enemy 2〜13

今回は味方11体の制作候補を特定する範囲。敵のIDは転記したロスターを参照。カードとの同一性レビューの所在は `outputs/master-pack-roster-audit/ENEMY_IDENTITY_FIDELITY_REVIEW_V2.md`。敵ごとの制作優先順、攻撃・寸前の制作状況は不明。
