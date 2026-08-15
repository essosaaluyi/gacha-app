(function () {
    app.beginUndoGroup("Add Linked Faceoff Divider");

    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            throw new Error("Open the faceoff composition before running this script.");
        }

        var sourceLayer = null;
        var sweepEffect = null;
        var completionProp = null;

        for (var i = 1; i <= comp.numLayers && !completionProp; i++) {
            var layer = comp.layer(i);
            var effects = layer.property("ADBE Effect Parade");
            if (!effects) {
                continue;
            }

            for (var j = 1; j <= effects.numProperties; j++) {
                var effect = effects.property(j);
                if (effect.name !== "CC Line Sweep" && effect.matchName !== "CC Line Sweep") {
                    continue;
                }

                var completion = effect.property("Completion");
                if (!completion) {
                    for (var k = 1; k <= effect.numProperties; k++) {
                        var candidate = effect.property(k);
                        if (candidate.name.toLowerCase().indexOf("completion") !== -1) {
                            completion = candidate;
                            break;
                        }
                    }
                }

                if (completion) {
                    sourceLayer = layer;
                    sweepEffect = effect;
                    completionProp = completion;
                    break;
                }
            }
        }

        if (!completionProp) {
            throw new Error("No CC Line Sweep Completion control was found in the active composition.");
        }

        var existing = comp.layer("FACE-OFF DIVIDER - LINKED");
        if (existing) {
            existing.remove();
        }

        var divider = comp.layers.addShape();
        divider.name = "FACE-OFF DIVIDER - LINKED";
        divider.label = 9;
        divider.blendingMode = BlendingMode.ADD;
        divider.comment = "Position follows " + sourceLayer.name + " > " + sweepEffect.name + " > Completion";

        var controls = divider.property("ADBE Effect Parade");

        var centerControl = controls.addProperty("ADBE Slider Control");
        centerControl.name = "Center Completion";
        centerControl.property(1).setValue(completionProp.value);

        var travelControl = controls.addProperty("ADBE Slider Control");
        travelControl.name = "Travel Width %";
        travelControl.property(1).setValue(100);

        var root = divider.property("ADBE Root Vectors Group");

        function addBar(name, width, color, opacity) {
            var group = root.addProperty("ADBE Vector Group");
            group.name = name;

            var vectors = group.property("ADBE Vectors Group");
            var rectangle = vectors.addProperty("ADBE Vector Shape - Rect");
            rectangle.property("ADBE Vector Rect Size").setValue([width, comp.height * 1.2]);

            var fill = vectors.addProperty("ADBE Vector Graphic - Fill");
            fill.property("ADBE Vector Fill Color").setValue(color);
            fill.property("ADBE Vector Fill Opacity").setValue(opacity);
        }

        addBar("Cyan Aura", 22, [0.08, 0.72, 1.0], 18);
        addBar("Blue Glow", 10, [0.18, 0.82, 1.0], 55);
        addBar("White Core", 3, [1.0, 1.0, 1.0], 100);

        function escapeExpressionString(value) {
            return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
        }

        var sourceName = escapeExpressionString(sourceLayer.name);
        var effectName = escapeExpressionString(sweepEffect.name);

        divider.property("ADBE Transform Group").property("ADBE Position").expression =
            'var c = thisComp.layer("' + sourceName + '").effect("' + effectName + '")("Completion");\n' +
            'var center = effect("Center Completion")("Slider");\n' +
            'var travel = effect("Travel Width %")("Slider") / 100;\n' +
            'var x = thisComp.width / 2 + ((c - center) / 100) * thisComp.width * travel;\n' +
            '[x, thisComp.height / 2];';

        divider.moveToBeginning();
        divider.selected = true;

        alert(
            "Linked face-off divider added.\n\n" +
            "Move " + sourceLayer.name + " > " + sweepEffect.name +
            " > Completion to reveal either side and move the divider."
        );
    } catch (error) {
        alert("Face-off divider setup failed:\n" + error.toString());
    } finally {
        app.endUndoGroup();
    }
}());
