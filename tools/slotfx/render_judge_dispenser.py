# PROVISIONAL — the card dispenser shown alone on the screen during the Fatal
# Mode judge (components/battle/slotfx/SlotJudge.tsx).
#
# A stand-in for the cabinet's card outlet: dark teal lacquer and brass, in the
# cabinet's own colours, seen from the front and a little above. The card
# itself is not rendered; the page slides the real card back out of the slot,
# using the slot position this script writes next to the picture.
#
#   blender --background --factory-startup --python tools/slotfx/render_judge_dispenser.py -- <image.webp> <layout.json> [samples]

import json
import math
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_IMAGE = ARGS[0]
OUT_JSON = ARGS[1]
SAMPLES = int(ARGS[2]) if len(ARGS) > 2 else 128

WIDTH, HEIGHT = 1400, 1000
# Where the card leaves the machine: the lower edge of the slot, on the front.
SLOT_HALF, SLOT_Y, SLOT_Z = 1.1, -1.13, 0.3


def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
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


def material(name, colour, metallic=0.0, roughness=0.4, coat=0.0, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*colour, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Coat Roughness"].default_value = 0.05
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def finish(obj, mat, bevel=0.0, segments=5):
    obj.data.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def box(name, size, location, mat, bevel=0.0, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(obj, mat, bevel)


def cylinder(name, radius, length, location, mat, axis="X", bevel=0.0):
    rotation = {"X": (0, math.pi / 2, 0), "Y": (math.pi / 2, 0, 0), "Z": (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=length, vertices=96, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, bevel, 3)


def sphere(name, radius, location, mat, squash=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=48, ring_count=24, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (1, 1, squash)
    return finish(obj, mat)


def area_light(name, location, target, size, energy, colour):
    data = bpy.data.lights.new(name, "AREA")
    data.shape = "RECTANGLE"
    data.size, data.size_y = size
    data.energy = energy
    data.color = colour
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
    return obj


def build(scene):
    lacquer = material("lacquer", (0.006, 0.05, 0.058), roughness=0.3, coat=1.0)
    lacquer_dark = material("lacquer_dark", (0.004, 0.012, 0.018), roughness=0.35, coat=1.0)
    brass = material("brass", (0.93, 0.6, 0.2), metallic=1.0, roughness=0.2)
    brass_dark = material("brass_dark", (0.55, 0.33, 0.1), metallic=1.0, roughness=0.34)
    void = material("void", (0.002, 0.002, 0.003), roughness=0.9)
    teal_glow = material("teal_glow", (0.1, 0.9, 0.8), emission=(0.2, 1.0, 0.84), strength=4.0)
    red_glow = material("red_glow", (1.0, 0.08, 0.04), roughness=0.12, coat=1.0, emission=(1.0, 0.05, 0.02), strength=2.4)
    gem = material("gem", (0.1, 0.9, 0.8), roughness=0.08, coat=1.0, emission=(0.2, 1.0, 0.85), strength=2.6)

    # Base plate and body.
    box("base", (3.7, 2.5, 0.16), (0, 0, 0.08), brass, 0.05)
    box("base_step", (3.5, 2.3, 0.1), (0, 0, 0.2), brass_dark, 0.03)
    box("body", (3.3, 2.1, 0.9), (0, 0, 0.68), lacquer, 0.12, )
    # Brass rails on the long edges of the body.
    for y in (-1.02, 1.02):
        cylinder("rail_top", 0.05, 3.1, (0, y, 1.1), brass)
    for x in (-1.62, 1.62):
        cylinder("rail_side", 0.05, 1.9, (x, 0, 1.1), brass, axis="Y")
    for x in (-1.62, 1.62):
        for y in (-1.02, 1.02):
            sphere("rail_knob", 0.09, (x, y, 1.1), brass)

    # Hood over the card stack: a drum lying across the back of the body.
    cylinder("hood", 0.66, 2.5, (0, 0.34, 1.08), lacquer_dark)
    for x in (-1.28, 1.28):
        cylinder("hood_cap", 0.72, 0.12, (x, 0.34, 1.08), brass, bevel=0.025)
        sphere("hood_boss", 0.2, (x + (0.07 if x > 0 else -0.07), 0.34, 1.08), brass_dark, 1.0)
    for x in (-0.62, 0.62):
        cylinder("hood_band", 0.675, 0.07, (x, 0.34, 1.08), brass)
    # A lit window along the drum.
    box("hood_window", (1.0, 0.05, 0.16), (0, -0.3, 1.33), teal_glow, 0.02, rotation=(math.radians(-58), 0, 0))
    box("hood_window_frame", (1.14, 0.05, 0.28), (0, -0.285, 1.32), brass, 0.02, rotation=(math.radians(-58), 0, 0))

    # Deck in front of the hood, with a gem in a brass setting.
    box("deck", (2.7, 0.62, 0.05), (0, -0.62, 1.14), brass_dark, 0.015)
    box("deck_inlay", (2.56, 0.5, 0.06), (0, -0.62, 1.145), lacquer_dark, 0.01)
    box("setting", (0.34, 0.34, 0.05), (0, -0.62, 1.17), brass, 0.02, rotation=(0, 0, math.radians(45)))
    sphere("gem", 0.14, (0, -0.62, 1.19), gem, 0.55)
    for x in (-1.02, 1.02):
        cylinder("lamp_seat", 0.17, 0.07, (x, -0.62, 1.18), brass, axis="Z", bevel=0.015)
        sphere("lamp", 0.13, (x, -0.62, 1.22), red_glow, 0.8)

    # The slot on the front face: brass bezel, black throat, a line of light.
    box("bezel", (2.6, 0.14, 0.44), (0, -1.06, 0.44), brass, 0.035)
    box("throat", (2.3, 0.16, 0.2), (0, -1.07, 0.42), void, 0.01)
    box("throat_light", (2.2, 0.03, 0.03), (0, -1.16, 0.49), teal_glow)
    box("lip", (2.4, 0.2, 0.05), (0, -1.14, SLOT_Z - 0.03), brass, 0.02)
    for x in (-1.46, 1.46):
        sphere("bolt", 0.075, (x, -1.05, 0.44), brass, 1.0)

    # Light: a large soft key over the front, a teal rim from behind, a warm fill.
    area_light("key", (0, -3.2, 6.5), (0, -0.2, 0.6), (7, 4), 560, (1.0, 0.96, 0.9))
    area_light("front", (0, -6.5, 1.6), (0, 0, 0.6), (8, 1.6), 260, (1.0, 0.82, 0.6))
    area_light("rim_left", (-5, 3.5, 3.2), (0, 0, 0.8), (3, 3), 620, (0.3, 1.0, 0.9))
    area_light("rim_right", (5, 3.5, 3.2), (0, 0, 0.8), (3, 3), 620, (1.0, 0.5, 0.3))

    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.03, 0.035, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
    scene.world = world

    camera_data = bpy.data.cameras.new("camera")
    camera_data.lens = 70
    camera = bpy.data.objects.new("camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0, -8.4, 5.3)
    camera.rotation_euler = (Vector((0, -0.25, 0.62)) - Vector(camera.location)).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    return camera


def main():
    scene = setup_scene()
    camera = build(scene)
    bpy.context.view_layer.update()

    def project(point):
        view = world_to_camera_view(scene, camera, Vector(point))
        return view.x, 1 - view.y

    left = project((-SLOT_HALF, SLOT_Y, SLOT_Z))
    right = project((SLOT_HALF, SLOT_Y, SLOT_Z))
    # How much a step away from the machine along the table is squeezed on
    # screen compared with a step sideways: the tilt the card needs.
    near = project((0, SLOT_Y - 1.0, SLOT_Z))
    ground = ((near[1] - left[1]) * HEIGHT) / ((right[0] - left[0]) * WIDTH / (2 * SLOT_HALF))
    layout = {
        "width": WIDTH,
        "height": HEIGHT,
        "slotLeft": round(left[0], 4),
        "slotRight": round(right[0], 4),
        "slotY": round((left[1] + right[1]) / 2, 4),
        "groundRatio": round(ground, 4),
    }
    scene.render.filepath = OUT_IMAGE
    bpy.ops.render.render(write_still=True)
    with open(OUT_JSON, "w", encoding="utf-8") as handle:
        json.dump(layout, handle, indent=2)
        handle.write("\n")
    print("LAYOUT", json.dumps(layout))


main()
