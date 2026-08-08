var projectPath = "C:/Users/essos/Desktop/gacha-app/outputs/after-effects/impact-cutin-template/impact-cutin-template.aep";
var outputFile = new File("C:/Users/essos/Desktop/gacha-app/outputs/after-effects/impact-cutin-template/project-inspect.txt");
app.open(new File(projectPath));
outputFile.open("w");
outputFile.writeln("items=" + app.project.numItems);
for (var i = 1; i <= app.project.numItems; i += 1) {
  var item = app.project.item(i);
  outputFile.writeln(i + ": " + item.name + " type=" + item.typeName + " w=" + item.width + " h=" + item.height + " dur=" + item.duration);
}
outputFile.close();
app.quit();
