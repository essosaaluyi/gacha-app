var inputPath = "C:/Users/essos/AppData/Local/Packages/Microsoft.ScreenSketch_8wekyb3d8bbwe/TempState/Recordings/20260721-0056-50.3690903.mp4";
var outputDir = new Folder("C:/Users/essos/Desktop/gacha-app/outputs/reference-video-frames");

if (!outputDir.exists) {
  outputDir.create();
}

app.beginUndoGroup("Extract reference video frames");

var importOptions = new ImportOptions(new File(inputPath));
var footage = app.project.importFile(importOptions);
var comp = app.project.items.addComp(
  "reference_frame_extract",
  footage.width,
  footage.height,
  footage.pixelAspect,
  footage.duration,
  footage.frameRate
);

comp.layers.add(footage);

var duration = footage.duration;
var sampleCount = 9;

for (var i = 0; i < sampleCount; i += 1) {
  var t = duration * (i / (sampleCount - 1));
  var file = new File(outputDir.fsName + "/frame_" + ("00" + i).slice(-2) + ".png");
  comp.saveFrameToPng(t, file);
}

var summaryFile = new File(outputDir.fsName + "/summary.txt");
summaryFile.open("w");
summaryFile.writeln("input=" + inputPath);
summaryFile.writeln("duration=" + duration);
summaryFile.writeln("width=" + footage.width);
summaryFile.writeln("height=" + footage.height);
summaryFile.writeln("frameRate=" + footage.frameRate);
summaryFile.writeln("sampleCount=" + sampleCount);
summaryFile.close();

app.endUndoGroup();
app.quit();
