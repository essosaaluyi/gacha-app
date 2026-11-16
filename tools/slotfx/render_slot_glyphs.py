# PROVISIONAL — renders the slot-style lettering used by components/battle/slotfx.
#
# Fat Didone numerals and capitals with a polished gold rim, a dark inset line
# and a lacquered coloured face, drawn one glyph per cell so the page can set
# any number or word from them. Run with Blender in the background:
#
#   blender --background --factory-startup --python tools/slotfx/render_slot_glyphs.py -- \
#       <image dir> <atlas json> [all | set:style,set:style ...] [samples]
#
# The camera looks straight at the letters and the depth is sheared down and to
# the right instead, so every front face sits exactly on the cell grid and the
# glyphs line up when the page places them side by side.
#
# The rim is a rounded band swept along the letter's outline rather than a
# fattened copy of the letter: fattening closes the counters of 6, 8, B and
# the like and tears the fill.
#
# Gloss comes from the surroundings, not from lamps: lamps sit at a place, so a
# glyph at one end of the sheet would catch them differently from one at the
# other end and a word set from them would not match. The world is a dim studio
# picture with a few bright soft boxes painted into it by direction.

import bpy, sys, os, json, math, glob

argv = sys.argv[sys.argv.index("--") + 1:]
IMAGE_DIR, JSON_PATH = argv[0], argv[1]
ONLY = set(argv[2].split(",")) if len(argv) > 2 and argv[2] != "all" else None
SAMPLES = int(argv[3]) if len(argv) > 3 else 96
VERSION = "v2"

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_CANDIDATES = [
    # Abril Fatface, SIL Open Font License (fonts/OFL.txt): free to use and to ship.
    os.path.join(HERE, "fonts", "AbrilFatface-Regular.ttf"),
    r"C:\Windows\Fonts\timesbd.ttf",
]

# `cap_px` is the height of a capital in the rendered sheet.
SETS = {
    "digits": dict(chars="0123456789+", cols=6, cap_px=300),
    "letters": dict(chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ!", cols=9, cap_px=210),
}
STYLES = ["gold", "blood", "violet", "rainbow"]

# Proportions, as fractions of the height of a capital.
RIM_K, EXTRUDE_K, LINE_K = 0.06, 0.2, 0.016
SHEAR_X, SHEAR_Y = 0.28, 0.46
PAD_X = 0.2

def plus_shape(cap):
    """A heavy plus: the font's own is a hairline. Returns the outline and the advance."""
    size, bar, left, base = 0.6 * cap, 0.2 * cap, 0.07 * cap, 0.2 * cap
    a, b = (size - bar) / 2, (size + bar) / 2
    points = [(a, 0), (b, 0), (b, a), (size, a), (size, b), (b, b), (b, size), (a, size), (a, b), (0, b), (0, a), (a, a)]
    return [(left + x, base + y) for x, y in points], left * 2 + size


CUSTOM = {"+": plus_shape}

# Face colours from the top of a capital to its foot.
FACES = {
    "gold": [(0.0, (1.0, 0.9, 0.5)), (0.3, (1.0, 0.6, 0.03)), (0.46, (0.46, 0.11, 0.0)),
             (0.54, (1.0, 0.8, 0.14)), (0.8, (1.0, 0.47, 0.02)), (1.0, (0.58, 0.14, 0.0))],
    "blood": [(0.0, (1.0, 0.2, 0.12)), (0.3, (0.66, 0.0, 0.0)), (0.46, (0.08, 0.0, 0.0)),
              (0.54, (0.9, 0.02, 0.02)), (0.8, (0.5, 0.0, 0.0)), (1.0, (0.2, 0.0, 0.0))],
    "violet": [(0.0, (0.9, 0.7, 1.0)), (0.3, (0.42, 0.05, 0.9)), (0.46, (0.05, 0.0, 0.16)),
               (0.54, (0.7, 0.16, 1.0)), (0.8, (0.34, 0.02, 0.72)), (1.0, (0.14, 0.0, 0.32))],
}
INSETS = {"gold": (0.14, 0.0, 0.0), "blood": (0.0, 0.0, 0.0), "violet": (0.02, 0.0, 0.05), "rainbow": (0.04, 0.0, 0.08)}


def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 92
    scene.view_settings.view_transform = "Standard"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA", "HIP", "ONEAPI"):
            try:
                prefs.compute_device_type = kind
                prefs.get_devices()
                if any(d.type == kind for d in prefs.devices):
                    for d in prefs.devices:
                        d.use = d.type == kind
                    scene.cycles.device = "GPU"
                    break
            except Exception:
                continue
    except Exception as error:
        print("CPU render", error)
    return scene


def new_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat, mat.node_tree, mat.node_tree.nodes["Principled BSDF"]


def ramp(nt, stops):
    node = nt.nodes.new("ShaderNodeValToRGB")
    els = node.color_ramp.elements
    while len(els) < len(stops):
        els.new(0.5)
    for el, (pos, col) in zip(els, stops):
        el.position = pos
        el.color = (*col, 1)
    return node


def math_node(nt, op, a, b=None):
    node = nt.nodes.new("ShaderNodeMath")
    node.operation = op
    for socket, value in ((node.inputs[0], a), (node.inputs[1], b)):
        if value is None:
            continue
        if isinstance(value, (int, float)):
            socket.default_value = value
        else:
            nt.links.new(value, socket)
    return node.outputs[0]


def smooth_step(nt, value, lo, hi):
    """0 below `lo`, 1 above `hi` (or the reverse when lo > hi), eased between."""
    node = nt.nodes.new("ShaderNodeMapRange")
    node.interpolation_type = "SMOOTHSTEP"
    nt.links.new(value, node.inputs["Value"])
    node.inputs["From Min"].default_value = min(lo, hi)
    node.inputs["From Max"].default_value = max(lo, hi)
    node.inputs["To Min"].default_value = 0.0 if lo < hi else 1.0
    node.inputs["To Max"].default_value = 1.0 if lo < hi else 0.0
    return node.outputs[0]


def object_xyz(nt):
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Object"], sep.inputs[0])
    return coord, sep


def build_world(scene):
    world = bpy.data.worlds.new("world")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    base = nt.nodes["Background"]
    hdris = glob.glob(os.path.join(bpy.utils.resource_path("LOCAL"), "datafiles", "studiolights", "world", "*.exr"))
    pick = next((h for h in hdris if "sunset" in h.lower()), hdris[0] if hdris else None)
    if pick:
        env = nt.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(pick)
        nt.links.new(env.outputs["Color"], base.inputs["Color"])
    base.inputs["Strength"].default_value = 0.6

    # Direction the light comes from: x right, y up, z toward the camera.
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Generated"], sep.inputs[0])
    dx, dy = sep.outputs["X"], sep.outputs["Y"]

    def between(value, lo, hi, soft, soft_lo=None):
        return math_node(nt, "MULTIPLY", smooth_step(nt, value, lo - (soft_lo or soft), lo), smooth_step(nt, value, hi + soft, hi))

    boxes = [
        # A broad soft box overhead: the main highlight on every upper edge.
        (math_node(nt, "MULTIPLY", between(dy, 0.4, 0.8, 0.05, 0.16), between(dx, -0.85, 0.85, 0.1)), 4.6, (1.0, 0.97, 0.9)),
        # A warm strip below: light under the rim and along the depth.
        (between(dy, -0.66, -0.5, 0.04), 3.2, (1.0, 0.62, 0.25)),
        # Tall strips at each side, cool on the right.
        (math_node(nt, "MULTIPLY", between(dx, 0.6, 0.74, 0.03), between(dy, -0.45, 0.3, 0.1)), 2.8, (0.82, 0.92, 1.0)),
        (math_node(nt, "MULTIPLY", between(dx, -0.82, -0.72, 0.03), between(dy, -0.45, 0.3, 0.1)), 1.8, (1.0, 0.95, 0.9)),
    ]
    shader = base.outputs[0]
    for mask, strength, colour in boxes:
        box = nt.nodes.new("ShaderNodeBackground")
        box.inputs["Color"].default_value = (*colour, 1)
        nt.links.new(math_node(nt, "MULTIPLY", mask, strength), box.inputs["Strength"])
        add = nt.nodes.new("ShaderNodeAddShader")
        nt.links.new(shader, add.inputs[0])
        nt.links.new(box.outputs[0], add.inputs[1])
        shader = add.outputs[0]
    nt.links.new(shader, nt.nodes["World Output"].inputs["Surface"])


def gold_material(front):
    """The rim and the depth: polished gold that deepens to red-brown at the back."""
    mat, nt, bsdf = new_material("rim")
    _, sep = object_xyz(nt)
    depth = math_node(nt, "DIVIDE", math_node(nt, "SUBTRACT", front, sep.outputs["Z"]), front * 2)
    colours = ramp(nt, [(0.0, (1.0, 0.72, 0.2)), (0.3, (1.0, 0.55, 0.07)), (1.0, (0.42, 0.09, 0.01))])
    nt.links.new(depth, colours.inputs[0])
    nt.links.new(colours.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Metallic"].default_value = 1.0
    bsdf.inputs["Roughness"].default_value = 0.09
    return mat


def inset_material(colour):
    mat, _, bsdf = new_material("inset")
    bsdf.inputs["Base Color"].default_value = (*colour, 1)
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Specular IOR Level"].default_value = 0.0
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def face_material(style, cap):
    mat, nt, bsdf = new_material("face-" + style)
    coord, sep = object_xyz(nt)
    if style == "rainbow":
        # Cut crystal: a hue that runs diagonally across the glyph, broken into
        # facets, each facet shaded from its centre to its edge.
        cells = nt.nodes.new("ShaderNodeTexVoronoi")
        cells.inputs["Scale"].default_value = 4.3 / cap
        nt.links.new(coord.outputs["Object"], cells.inputs["Vector"])
        cell_rgb = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(cells.outputs["Color"], cell_rgb.inputs[0])
        info = nt.nodes.new("ShaderNodeObjectInfo")
        sweep = math_node(nt, "ADD", math_node(nt, "MULTIPLY", sep.outputs["X"], 0.53 / cap), math_node(nt, "MULTIPLY", sep.outputs["Y"], 0.62 / cap))
        sweep = math_node(nt, "ADD", sweep, info.outputs["Random"])
        sweep = math_node(nt, "ADD", sweep, math_node(nt, "MULTIPLY", cell_rgb.outputs[0], 0.22))
        hue = math_node(nt, "FRACT", sweep)
        shade = nt.nodes.new("ShaderNodeMapRange")
        nt.links.new(cells.outputs["Distance"], shade.inputs["Value"])
        shade.inputs["From Min"].default_value = 0.0
        shade.inputs["From Max"].default_value = 0.5
        shade.inputs["To Min"].default_value = 1.0
        shade.inputs["To Max"].default_value = 0.58
        tint = nt.nodes.new("ShaderNodeHueSaturation")
        tint.inputs["Color"].default_value = (1.0, 0.04, 0.04, 1)
        tint.inputs["Saturation"].default_value = 1.0
        nt.links.new(hue, tint.inputs["Hue"])
        nt.links.new(shade.outputs[0], tint.inputs["Value"])
        colour = tint.outputs["Color"]
        emission, dim = 1.2, (0.03, 0.0, 0.05)
    else:
        height = math_node(nt, "SUBTRACT", 1.0, math_node(nt, "DIVIDE", sep.outputs["Y"], cap))
        colours = ramp(nt, FACES[style])
        nt.links.new(height, colours.inputs[0])
        colour = colours.outputs["Color"]
        emission, dim = 0.88, tuple(c * 0.2 for c in FACES[style][1][1])
    # The colour is emitted rather than lit, so the lights that polish the gold
    # rim cannot wash the face out.
    bsdf.inputs["Base Color"].default_value = (*dim, 1)
    nt.links.new(colour, bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = emission
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.5
    bsdf.inputs["Specular IOR Level"].default_value = 0.0

    # Lacquer over the colour. The face is flat and square to the camera, so on
    # its own it would mirror one spot of the room; the lacquer is given the
    # slope of a shallow dome instead, and the overhead soft box lies across
    # the top of every glyph as a curved band of gloss.
    slope = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(math_node(nt, "MULTIPLY", math_node(nt, "SUBTRACT", sep.outputs["X"], 0.42 * cap), 0.62 / cap), slope.inputs["X"])
    nt.links.new(math_node(nt, "MULTIPLY", math_node(nt, "SUBTRACT", sep.outputs["Y"], 0.44 * cap), 0.74 / cap), slope.inputs["Y"])
    slope.inputs["Z"].default_value = 1.0
    unit = nt.nodes.new("ShaderNodeVectorMath")
    unit.operation = "NORMALIZE"
    nt.links.new(slope.outputs[0], unit.inputs[0])
    nt.links.new(unit.outputs["Vector"], bsdf.inputs["Coat Normal"])
    bsdf.inputs["Coat Weight"].default_value = 1.0
    bsdf.inputs["Coat Roughness"].default_value = 0.04
    bsdf.inputs["Coat IOR"].default_value = 1.55
    return mat


def render_set(set_name, spec, font_path, atlas):
    chars, cols, cap_px = spec["chars"], spec["cols"], spec["cap_px"]
    rows = math.ceil(len(chars) / cols)
    scene = setup_scene()
    font = bpy.data.fonts.load(font_path)

    shapes = {}

    def text_object(body, extrude=0.0, bevel=0.0, bevel_res=0):
        if body in shapes:
            curve = bpy.data.curves.new("s", "CURVE")
            curve.dimensions = "2D"
            curve.fill_mode = "BOTH"
            spline = curve.splines.new("POLY")
            points = shapes[body][0]
            spline.points.add(len(points) - 1)
            for point, (x, y) in zip(spline.points, points):
                point.co = (x, y, 0.0, 1.0)
            spline.use_cyclic_u = True
        else:
            curve = bpy.data.curves.new("t", "FONT")
            curve.body = body
            curve.font = font
            curve.size = 1.0
            curve.align_x = "LEFT"
            curve.align_y = "BOTTOM_BASELINE"
        curve.extrude = extrude
        curve.bevel_depth = bevel
        curve.bevel_resolution = bevel_res
        curve.resolution_u = 20
        obj = bpy.data.objects.new("t", curve)
        scene.collection.objects.link(obj)
        return obj

    def to_mesh(obj):
        depsgraph = bpy.context.evaluated_depsgraph_get()
        depsgraph.update()
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
        bpy.data.objects.remove(obj)
        return mesh

    def text_mesh(body, extrude=0.0, bevel=0.0, bevel_res=0):
        return to_mesh(text_object(body, extrude, bevel, bevel_res))

    def outline_mesh(body, extrude, radius, res, box):
        """A rounded band swept along the glyph's outline."""
        obj = text_object(body)
        if body not in shapes:
            for other in scene.objects:
                other.select_set(False)
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            bpy.ops.object.convert(target="CURVE")
        curve = obj.data
        curve.dimensions = "2D"
        curve.fill_mode = "NONE"
        curve.extrude = extrude
        curve.bevel_depth = radius
        curve.bevel_resolution = res
        curve.resolution_u = 20
        mesh = to_mesh(obj)
        # A band turned round a sharp point overshoots into a spike; a true band
        # never reaches further than its own radius past the glyph.
        reach = radius * 1.25
        for vert in mesh.vertices:
            vert.co.x = min(max(vert.co.x, box[0] - reach), box[1] + reach)
            vert.co.y = min(max(vert.co.y, box[2] - reach), box[3] + reach)
        return mesh

    # Measure first: the cell grid is fitted to the font.
    cap_mesh = text_mesh("H")
    cap = max(v.co.y for v in cap_mesh.vertices)
    bpy.data.meshes.remove(cap_mesh)
    rim_r, extrude, line_r = RIM_K * cap, EXTRUDE_K * cap, LINE_K * cap
    front = extrude + rim_r
    face_z = extrude + rim_r * 0.8
    depth = front * 2
    shapes.update({char: make(cap) for char, make in CUSTOM.items()})

    glyphs, boxes, right, low, high = {}, {}, 0.0, 0.0, cap
    for index, char in enumerate(chars):
        single = text_mesh(char)
        xs = [v.co.x for v in single.vertices]
        ys = [v.co.y for v in single.vertices]
        bpy.data.meshes.remove(single)
        if char in shapes:
            advance = shapes[char][1]
        else:
            double = text_mesh(char + char)
            advance = max(v.co.x for v in double.vertices) - max(xs)
            bpy.data.meshes.remove(double)
        boxes[char] = (min(xs), max(xs), min(ys), max(ys))
        right, low, high = max(right, max(xs)), min(low, min(ys)), max(high, max(ys))
        glyphs[char] = {"col": index % cols, "row": index // cols, "advance": round(advance, 4)}

    margin = 0.05
    cell_w = math.ceil((PAD_X + right + rim_r + SHEAR_X * depth + margin) * 50) / 50
    pad_y = math.ceil((-low + rim_r + SHEAR_Y * depth + margin) * 50) / 50
    cell_h = math.ceil((pad_y + high + rim_r + margin) * 50) / 50
    ppu = cap_px / cap
    width, height = round(cols * cell_w * ppu), round(rows * cell_h * ppu)
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    print("MEASURED", set_name, "cap", round(cap, 3), "cell", cell_w, cell_h, "pad_y", pad_y, "size", width, height)

    def finish(mesh, lift, sharp_deg):
        for vert in mesh.vertices:
            vert.co.z += lift
            back = front - vert.co.z
            vert.co.x += SHEAR_X * back
            vert.co.y -= SHEAR_Y * back
        for poly in mesh.polygons:
            poly.use_smooth = True
        try:
            mesh.set_sharp_from_angle(angle=math.radians(sharp_deg))
        except Exception:
            pass
        mesh.update()

    def place(name, mesh, origin):
        obj = bpy.data.objects.new(name, mesh)
        obj.location = origin
        scene.collection.objects.link(obj)
        return obj

    rim = gold_material(front)
    inset = inset_material((0, 0, 0))
    faces = {style: face_material(style, cap) for style in STYLES}
    face_objects = []

    for char, glyph in glyphs.items():
        origin = (glyph["col"] * cell_w + PAD_X, -(glyph["row"] + 1) * cell_h + pad_y, 0.0)

        walls = outline_mesh(char, extrude, rim_r, 10, boxes[char])
        walls.materials.append(rim)
        finish(walls, 0.0, 50)
        place("walls-" + char, walls, origin)

        face = text_mesh(char, 0.004 * cap, 0.012 * cap, 2)
        face.materials.append(faces["gold"])
        finish(face, face_z, 25)
        face_objects.append(place("face-" + char, face, origin))

        line = outline_mesh(char, 0.0, line_r, 4, boxes[char])
        line.materials.append(inset)
        finish(line, face_z + 0.02 * cap, 50)
        place("line-" + char, line, origin)

    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = max(cols * cell_w, rows * cell_h * width / height)
    cam = bpy.data.objects.new("cam", cam_data)
    cam.location = (cols * cell_w / 2, -rows * cell_h / 2, 10)
    scene.collection.objects.link(cam)
    scene.camera = cam

    build_world(scene)

    files = {}
    for style in STYLES:
        name = f"slot-glyphs-{set_name}-{style}.{VERSION}.webp"
        files[style] = name
        if ONLY and f"{set_name}:{style}" not in ONLY:
            continue
        inset.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*INSETS[style], 1)
        for obj in face_objects:
            obj.data.materials[0] = faces[style]
        scene.render.filepath = os.path.join(IMAGE_DIR, name)
        bpy.ops.render.render(write_still=True)
        print("RENDERED", name, width, height)

    atlas["sets"][set_name] = {
        "cols": cols, "rows": rows, "cellW": cell_w, "cellH": cell_h,
        "padX": PAD_X, "padY": pad_y, "capHeight": round(cap, 4), "files": files, "glyphs": glyphs,
    }


def main():
    font_path = next((path for path in FONT_CANDIDATES if os.path.exists(path)), None)
    if not font_path:
        raise SystemExit("no font found")
    print("FONT", os.path.basename(font_path))
    atlas = {"version": VERSION, "font": os.path.basename(font_path), "sets": {}}
    for set_name, spec in SETS.items():
        if ONLY and not any(key.startswith(set_name + ":") for key in ONLY):
            continue
        render_set(set_name, spec, font_path, atlas)
    if not ONLY:
        with open(JSON_PATH, "w", encoding="utf-8") as handle:
            json.dump(atlas, handle, indent=2)
            handle.write("\n")
        print("ATLAS", JSON_PATH)


main()
