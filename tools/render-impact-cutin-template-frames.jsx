var projectPath = "C:/Users/essos/Desktop/gacha-app/outputs/after-effects/impact-cutin-template/impact-cutin-template.aep";
var outputDir = new Folder("C:/Users/essos/Desktop/gacha-app/outputs/after-effects/impact-cutin-template/preview-frames");
if (!outputDir.exists) outputDir.create();

app.open(new File(projectPath));

var comp = null;
for (var i = 1; i <= app.project.numItems; i += 1) {
  if (app.project.item(i).name === "IMPACT_CUTIN_VIEWPORT_1250x618") {
    comp = app.project.item(i);
    break;
  }
}

if (comp === null) {
  throw new Error("Comp not found: IMPACT_CUTIN_VIEWPORT_1250x618");
}

var times = [0.05, 0.38, 0.77, 1.15, 1.53, 1.92, 2.30, 2.68, 2.92];
for (var t = 0; t < times.length; t += 1) {
  var file = new File(outputDir.fsName + "/impact_" + ("00" + t).slice(-2) + ".png");
  comp.saveFrameToPng(times[t], file);
}

app.quit();
