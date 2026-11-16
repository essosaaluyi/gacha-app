# PROVISIONAL — renders the slot-style lettering used by components/battle/slotfx.
#
# Heavy serif numerals and capitals with a rounded gold rim, a dark inset line
# and a coloured face, drawn one glyph per cell so the page can set any number
# or word from them. Run with Blender in the background:
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

import bpy, sys, os, json, math, glob

argv = sys.argv[sys.argv.index("--") + 1:]
IMAGE_DIR, JSON_PATH = argv[0], argv[1]
ONLY = set(argv[2].split(",")) if len(argv) > 2 and argv[2] != "all" else None
SAMPLES = int(argv[3]) if len(argv) > 3 else 64
VERSION = "v1"

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\ELEPHNT.TTF",   # Elephant: a fat Didone, closest to the reference
    r"C:\Windows\Fonts\BOD_BLAR.TTF",  # Bodoni MT Black
    # Georgia is left out on purpose: its figures are old-style and do not sit on one line.
    r"C:\Windows\Fonts\timesbd.ttf",
]

# Sizes are in Blender units with the text at size 1.
SETS = {
    "digits": dict(chars="0123456789+", cols=6, cell_w=0.8, cell_h=0.95, pad_y=0.26, ppu=640),
    "letters": dict(chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ!", cols=9, cell_w=1.1, cell_h=1.1, pad_y=0.4, ppu=440),
}
STYLES = ["gold", "blood", "violet", "rainbow"]

PAD_X = 0.2
EXTRUDE, RIM = 0.09, 0.03
SHEAR_X, SHEAR_Y = 0.28, 0.46
FRONT = EXTRUDE + RIM
FACE_Z = EXTRUDE + RIM * 0.8
LINE = 0.008

# Face colours from the top of a capital to its foot.
FACES = {
    "gold": [(0.0, (1.0, 0.93, 0.55)), (0.3, (1.0, 0.62, 0.04)), (0.46, (0.5, 0.13, 0.0)),
             (0.54, (1.0, 0.82, 0.16)), (0.8, (1.0, 0.5, 0.02)), (1.0, (0.62, 0.16, 0.0))],
    "blood": [(0.0, (1.0, 0.2, 0.12)), (0.3, (0.66, 0.0, 0.0)), (0.46, (0.08, 0.0, 0.0)),
              (0.54, (0.9, 0.02, 0.02)), (0.8, (0.5, 0.0, 0.0)), (1.0, (0.2, 0.0, 0.0))],
    "violet": [(0.0, (0.9, 0.7, 1.0)), (0.3, (0.42, 0.05, 0.9)), (0.46, (0.05, 0.0, 0.16)),
               (0.54, (0.7, 0.16, 1.0)), (0.8, (0.34, 0.02, 0.72)), (1.0, (0.14, 0.0, 0.32))],
}
INSETS = {"gold": (0.16, 0.0, 0.0), "blood": (0.0, 0.0, 0.0), "violet": (0.02, 0.0, 0.05), "rainbow": (0.04, 0.0, 0.08)}


def setup_scene(width, height):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.resolution_x = width
    scene.render.resolution_y = height
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


def object_xyz(nt):
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Object"], sep.inputs[0])
    return coord, sep


def gold_material():
    """The rim and the depth: polished gold that deepens to red-brown at the back."""
    mat, nt, bsdf = new_material("rim")
    _, sep = object_xyz(nt)
    depth = math_node(nt, "DIVIDE", math_node(nt, "SUBTRACT", FRONT, sep.outputs["Z"]), FRONT * 2)
    colours = ramp(nt, [(0.0, (1.0, 0.7, 0.18)), (0.3, (1.0, 0.56, 0.08)), (1.0, (0.45, 0.1, 0.01))])
    nt.links.new(depth, colours.inputs[0])
    nt.links.new(colours.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Metallic"].default_value = 1.0
    bsdf.inputs["Roughness"].default_value = 0.16
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
        cells.inputs["Scale"].default_value = 9.0
        nt.links.new(coord.outputs["Object"], cells.inputs["Vector"])
        cell_rgb = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(cells.outputs["Color"], cell_rgb.inputs[0])
        info = nt.nodes.new("ShaderNodeObjectInfo")
        sweep = math_node(nt, "ADD", math_node(nt, "MULTIPLY", sep.outputs["X"], 1.1), math_node(nt, "MULTIPLY", sep.outputs["Y"], 1.3))
        sweep = math_node(nt, "ADD", sweep, info.outputs["Random"])
        sweep = math_node(nt, "ADD", sweep, math_node(nt, "MULTIPLY", cell_rgb.outputs[0], 0.22))
        hue = math_node(nt, "FRACT", sweep)
        shade = nt.nodes.new("ShaderNodeMapRange")
        nt.links.new(cells.outputs["Distance"], shade.inputs["Value"])
        shade.inputs["From Min"].default_value = 0.0
        shade.inputs["From Max"].default_value = 0.5
        shade.inputs["To Min"].default_value = 1.0
        shade.inputs["To Max"].default_value = 0.62
        tint = nt.nodes.new("ShaderNodeHueSaturation")
        tint.inputs["Color"].default_value = (1.0, 0.04, 0.04, 1)
        tint.inputs["Saturation"].default_value = 1.0
        nt.links.new(hue, tint.inputs["Hue"])
        nt.links.new(shade.outputs[0], tint.inputs["Value"])
        colour = tint.outputs["Color"]
        emission, dim = 1.25, (0.03, 0.0, 0.05)
    else:
        height = math_node(nt, "SUBTRACT", 1.0, math_node(nt, "DIVIDE", sep.outputs["Y"], cap))
        colours = ramp(nt, FACES[style])
        nt.links.new(height, colours.inputs[0])
        colour = colours.outputs["Color"]
        emission, dim = 0.95, tuple(c * 0.2 for c in FACES[style][1][1])
    # The colour is emitted rather than lit, so the lights that polish the gold
    # rim cannot wash the face out; the dim base only carries the highlights.
    bsdf.inputs["Base Color"].default_value = (*dim, 1)
    nt.links.new(colour, bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = emission
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.4
    bsdf.inputs["Specular IOR Level"].default_value = 0.18
    return mat


def render_set(set_name, spec, font_path, atlas):
    chars, cols, cell_w, cell_h, pad_y, ppu = (spec[k] for k in ("chars", "cols", "cell_w", "cell_h", "pad_y", "ppu"))
    rows = math.ceil(len(chars) / cols)
    width, height = round(cols * cell_w * ppu), round(rows * cell_h * ppu)
    scene = setup_scene(width, height)
    font = bpy.data.fonts.load(font_path)

    def text_object(body, extrude=0.0, bevel=0.0, bevel_res=0):
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

    def outline_mesh(body, extrude, radius, res):
        """A rounded band swept along the glyph's outline."""
        obj = text_object(body)
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
        return to_mesh(obj)

    def finish(mesh, lift, sharp_deg):
        for vert in mesh.vertices:
            vert.co.z += lift
            back = FRONT - vert.co.z
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

    cap_mesh = text_mesh("H")
    cap = max(v.co.y for v in cap_mesh.vertices)
    bpy.data.meshes.remove(cap_mesh)

    rim = gold_material()
    inset = inset_material((0, 0, 0))
    faces = {style: face_material(style, cap) for style in STYLES}
    face_objects = []
    glyphs = {}
    widest = 0.0

    for index, char in enumerate(chars):
        col, row = index % cols, index // cols
        single = text_mesh(char)
        double = text_mesh(char + char)
        right = max(v.co.x for v in single.vertices)
        advance = max(v.co.x for v in double.vertices) - right
        widest = max(widest, right)
        bpy.data.meshes.remove(single)
        bpy.data.meshes.remove(double)
        glyphs[char] = {"col": col, "row": row, "advance": round(advance, 4)}

        origin = (col * cell_w + PAD_X, -(row + 1) * cell_h + pad_y, 0.0)

        walls = outline_mesh(char, EXTRUDE, RIM, 8)
        walls.materials.append(rim)
        finish(walls, 0.0, 50)
        place("walls-" + char, walls, origin)

        face = text_mesh(char, 0.004, 0.008, 2)
        face.materials.append(faces["gold"])
        finish(face, FACE_Z, 25)
        face_objects.append(place("face-" + char, face, origin))

        line = outline_mesh(char, 0.0, LINE, 4)
        line.materials.append(inset)
        finish(line, FACE_Z + 0.01, 50)
        place("line-" + char, line, origin)

    print("MEASURED", set_name, "widest", round(widest, 3), "cap", round(cap, 3))

    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = max(cols * cell_w, rows * cell_h * width / height)
    cam = bpy.data.objects.new("cam", cam_data)
    cam.location = (cols * cell_w / 2, -rows * cell_h / 2, 10)
    scene.collection.objects.link(cam)
    scene.camera = cam

    world = bpy.data.worlds.new("world")
    scene.world = world
    world.use_nodes = True
    wn = world.node_tree
    hdris = glob.glob(os.path.join(bpy.utils.resource_path("LOCAL"), "datafiles", "studiolights", "world", "*.exr"))
    pick = next((h for h in hdris if "sunset" in h.lower()), hdris[0] if hdris else None)
    if pick:
        env = wn.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(pick)
        wn.links.new(env.outputs["Color"], wn.nodes["Background"].inputs["Color"])
        wn.nodes["Background"].inputs["Strength"].default_value = 1.15

    sun_data = bpy.data.lights.new("sun", "SUN")
    sun_data.energy = 1.6
    sun_data.angle = math.radians(12)
    sun = bpy.data.objects.new("sun", sun_data)
    sun.rotation_euler = (math.radians(38), math.radians(-28), 0)
    scene.collection.objects.link(sun)

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
