var projectRoot = "C:/Users/essos/Desktop/gacha-app";
var outputDir = new Folder(projectRoot + "/outputs/after-effects/impact-cutin-template");
if (!outputDir.exists) outputDir.create();

function importFile(path) {
  var file = new File(path);
  if (!file.exists) {
    throw new Error("Missing asset: " + path);
  }
  return app.project.importFile(new ImportOptions(file));
}

function addSolid(comp, name, color, duration) {
  var layer = comp.layers.addSolid(color, name, comp.width, comp.height, comp.pixelAspect, duration);
  layer.name = name;
  return layer;
}

function setKeys(prop, keys) {
  for (var i = 0; i < keys.length; i += 1) {
    prop.setValueAtTime(keys[i][0], keys[i][1]);
  }
}

function fitLayer(layer, targetWidth, targetHeight, mode) {
  var source = layer.source;
  var scaleX = (targetWidth / source.width) * 100;
  var scaleY = (targetHeight / source.height) * 100;
  var scale = mode === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  layer.property("Scale").setValue([scale, scale]);
}

function addText(comp, text, name, position, size, color) {
  var layer = comp.layers.addText(text);
  layer.name = name;
  var doc = layer.property("Source Text").value;
  doc.text = text;
  doc.fontSize = size;
  doc.fillColor = color;
  doc.justification = ParagraphJustification.CENTER_JUSTIFY;
  layer.property("Source Text").setValue(doc);
  layer.property("Position").setValue(position);
  return layer;
}

app.beginUndoGroup("Create Impact Cut-In AE Template");
app.newProject();

var duration = 3.0;
var fps = 30;

var jackpot3 = importFile(projectRoot + "/public/images/battle-ui/production/v1/transparent/digits/jackpot-relic/jackpot-relic-digit-3-v1.png");
var jackpot0 = importFile(projectRoot + "/public/images/battle-ui/production/v1/transparent/digits/jackpot-relic/jackpot-relic-digit-0-v1.png");
var placeholderCharacter = importFile(projectRoot + "/public/images/cards/player/R1/card.png");
var viewportFrame = importFile(projectRoot + "/outputs/battle-cabinet-production-assets/png/battle-viewport-frame-1250x500.png");

var viewportComp = app.project.items.addComp("IMPACT_CUTIN_VIEWPORT_1250x618", 1250, 618, 1, duration, fps);
viewportComp.bgColor = [0.015, 0.005, 0.012];

var bgGold = addSolid(viewportComp, "BG_PROCEDURAL_GOLD_BURST_REPLACE_WITH_ENVATO", [1.0, 0.58, 0.05], duration);
setKeys(bgGold.property("Opacity"), [[0, 0], [0.05, 85], [0.65, 35], [0.9, 100], [1.15, 55], [duration, 70]]);

var bgRed = addSolid(viewportComp, "BG_RED_ENERGY_STROBE", [0.85, 0.02, 0.02], duration);
bgRed.blendingMode = BlendingMode.ADD;
setKeys(bgRed.property("Opacity"), [[0, 18], [0.18, 0], [0.34, 55], [0.46, 0], [0.62, 65], [0.72, 0], [1.08, 45], [1.28, 0], [duration, 0]]);

var charBase = viewportComp.layers.add(placeholderCharacter);
charBase.name = "CHARACTER_INSERT_STATIC_REPLACE_EACH_CHARACTER";
fitLayer(charBase, 760, 618, "cover");
charBase.property("Position").setValue([625, 330]);
setKeys(charBase.property("Position"), [[0, [625, 292]], [0.72, [625, 338]], [0.92, [625, 390]], [1.0, [625, 455]]]);
setKeys(charBase.property("Scale"), [[0, [100, 100]], [0.28, [112, 112]], [0.72, [106, 106]], [0.95, [128, 128]]]);
setKeys(charBase.property("Opacity"), [[0, 100], [0.86, 100], [0.96, 0], [duration, 0]]);

var charGlow = charBase.duplicate();
charGlow.name = "CHARACTER_GLOW_DUPLICATE_ADD_BLUR";
charGlow.moveBefore(charBase);
charGlow.blendingMode = BlendingMode.ADD;
setKeys(charGlow.property("Opacity"), [[0, 0], [0.15, 65], [0.55, 25], [0.72, 90], [0.95, 0]]);

var colorFlash = addSolid(viewportComp, "CHARACTER_COLOR_STROBE_OVERLAY_GOLD_BW_COLOR", [1.0, 0.95, 0.45], duration);
colorFlash.blendingMode = BlendingMode.ADD;
setKeys(colorFlash.property("Opacity"), [[0, 0], [0.12, 70], [0.18, 0], [0.30, 55], [0.38, 0], [0.50, 80], [0.58, 0], [0.70, 100], [0.86, 0], [duration, 0]]);

var flash1 = addSolid(viewportComp, "FLASH_01_INITIAL_WHITE_GOLD", [1, 0.96, 0.72], duration);
flash1.blendingMode = BlendingMode.ADD;
setKeys(flash1.property("Opacity"), [[0, 100], [0.10, 0], [0.74, 0], [0.86, 100], [1.02, 0], [duration, 0]]);

var number3Glow = viewportComp.layers.add(jackpot3);
number3Glow.name = "NUMBER_30_GLOW_DIGIT_3";
number3Glow.blendingMode = BlendingMode.ADD;
number3Glow.property("Position").setValue([470, 315]);
var number0Glow = viewportComp.layers.add(jackpot0);
number0Glow.name = "NUMBER_30_GLOW_DIGIT_0";
number0Glow.blendingMode = BlendingMode.ADD;
number0Glow.property("Position").setValue([760, 315]);

var number3 = viewportComp.layers.add(jackpot3);
number3.name = "NUMBER_30_DIGIT_3_JACKPOT_RELIC";
number3.property("Position").setValue([470, 315]);
var number0 = viewportComp.layers.add(jackpot0);
number0.name = "NUMBER_30_DIGIT_0_JACKPOT_RELIC";
number0.property("Position").setValue([760, 315]);

var numberLayers = [number3Glow, number0Glow, number3, number0];
for (var n = 0; n < numberLayers.length; n += 1) {
  var layer = numberLayers[n];
  var isGlow = layer.name.indexOf("GLOW") >= 0;
  setKeys(layer.property("Scale"), [[0.90, [520, 520]], [1.15, [245, 245]], [1.55, [360, 360]], [1.92, [570, 570]], [2.30, [240, 240]], [2.68, [270, 270]], [2.92, [255, 255]]]);
  setKeys(layer.property("Opacity"), [[0, 0], [0.88, 0], [0.98, isGlow ? 80 : 100], [duration, isGlow ? 45 : 100]]);
}

var sparkle = addSolid(viewportComp, "SPARKLE_OVERLAY_PLACEHOLDER_REPLACE_WITH_ENVATO", [1.0, 0.88, 0.35], duration);
sparkle.blendingMode = BlendingMode.ADD;
setKeys(sparkle.property("Opacity"), [[0, 0], [1.0, 0], [1.35, 45], [2.2, 80], [duration, 55]]);

var finalFlash = addSolid(viewportComp, "FLASH_02_NUMBER_SNAP", [1, 1, 1], duration);
finalFlash.blendingMode = BlendingMode.ADD;
setKeys(finalFlash.property("Opacity"), [[0, 0], [2.18, 0], [2.28, 80], [2.42, 0], [duration, 0]]);

addText(viewportComp, "TODO: Replace static character insert + Envato burst/sparkle overlays", "NOTES_TEMPLATE_INSTRUCTIONS", [625, 585], 24, [1, 0.92, 0.62]);

var screenComp = app.project.items.addComp("BATTLE_SCREEN_FORMAT_1920x1080", 1920, 1080, 1, duration, fps);
screenComp.bgColor = [0, 0, 0];

var cabinetBackdrop = addSolid(screenComp, "CABINET_STAGE_PLACEHOLDER_1920x1080", [0.025, 0.012, 0.018], duration);
cabinetBackdrop.property("Opacity").setValue(100);

var viewportLayer = screenComp.layers.add(viewportComp);
viewportLayer.name = "VIEWPORT_AT_GAME_POSITION_LEFT_330_TOP_88_SIZE_1250x618";
viewportLayer.property("Position").setValue([330 + 625, 88 + 309]);

var frameLayer = screenComp.layers.add(viewportFrame);
frameLayer.name = "BATTLE_VIEWPORT_FRAME_REFERENCE_1250x500";
frameLayer.property("Position").setValue([330 + 625, 88 + 309]);
fitLayer(frameLayer, 1250, 618, "contain");

addText(screenComp, "Battle screen comp: 1920x1080. Main viewport placed at left 330, top 88, size 1250x618.", "NOTES_BATTLE_SCREEN_FORMAT", [960, 1035], 30, [0.8, 0.9, 1]);

screenComp.openInViewer();

var projectFile = new File(outputDir.fsName + "/impact-cutin-template.aep");
app.project.save(projectFile);
app.endUndoGroup();
app.quit();
