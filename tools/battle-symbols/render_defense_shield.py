# Renders the crystal shield for the Defense card face (transparent PNG).
#
#   blender --background --factory-startup --python tools/battle-symbols/render_defense_shield.py -- <out.png> [samples]
#
# The Attack card shows a sword cut from glowing red crystal. This is its
# partner: a shield cut the same way, in blue. tools/battle-symbols/
# compose_defense_card.mjs lays the render onto the card.

import math
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0]
SAMPLES = int(argv[1]) if len(argv) > 1 else 128

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def material(name, base, emit, strength, metallic=0.55, roughness=0.16):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*base, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Emission Color"].default_value = (*emit, 1)
    bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def add_mesh(name, verts, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def glowing_edges(obj, mat, thickness):
    """A copy of the mesh as thin bars along its edges: the lines of light."""
    copy = obj.copy()
    copy.data = obj.data.copy()
    scene.collection.objects.link(copy)
    copy.data.materials.clear()
    copy.data.materials.append(mat)
    wire = copy.modifiers.new("wire", "WIREFRAME")
    wire.thickness = thickness
    wire.use_replace = True
    return copy


# ---- The shield: a cut stone, every edge of its outline a facet ------------

HALF = [(0.0, 1.12), (0.42, 0.93), (0.98, 1.04), (0.92, 0.30), (0.74, -0.36), (0.42, -0.86), (0.0, -1.28)]
OUTLINE = HALF + [(-x, y) for x, y in reversed(HALF[1:-1])]
N = len(OUTLINE)
# (scale toward the middle, height): outer edge, rim, rim, groove, then the crown.
RINGS = [(1.0, 0.0), (0.88, 0.17), (0.78, 0.17), (0.71, 0.05)]
APEX = (0.0, -0.05, 0.3)

verts = [(x * s, y * s - 0.05 * (1 - s), z) for s, z in RINGS for x, y in OUTLINE]
faces = []
for ring in range(len(RINGS) - 1):
    for i in range(N):
        a, b = ring * N + i, ring * N + (i + 1) % N
        faces.append((a, b, b + N, a + N))
top = (len(RINGS) - 1) * N
verts.append(APEX)
for i in range(N):
    faces.append((top + i, top + (i + 1) % N, len(verts) - 1))
faces.append(tuple(reversed(range(N))))  # the back

crystal = material("crystal", (0.004, 0.035, 0.32), (0.0, 0.06, 0.7), 0.22, metallic=0.75, roughness=0.14)
light = material("light", (0.2, 0.5, 1.0), (0.16, 0.5, 1.0), 5.0, metallic=0, roughness=0.5)
star_mat = material("star", (0.05, 0.25, 0.9), (0.1, 0.4, 1.0), 0.9, metallic=0.6, roughness=0.12)

shield = add_mesh("shield", verts, faces, crystal)
shield_edges = glowing_edges(shield, light, 0.008)

# ---- The star on its face: four long points, cut like the stone -------------

TIPS = [(0.0, 0.66), (0.36, 0.0), (0.0, -0.8), (-0.36, 0.0)]
WAIST = [(0.085, 0.085), (0.085, -0.085), (-0.085, -0.085), (-0.085, 0.085)]
star_verts = []
for tip, waist in zip(TIPS, WAIST):
    star_verts += [(tip[0], tip[1], 0.0), (waist[0], waist[1], 0.0)]
star_verts.append((0.0, 0.0, 0.16))
star_faces = [(i, (i + 1) % 8, 8) for i in range(8)]
star = add_mesh("star", star_verts, star_faces, star_mat)
star.location = (0.0, -0.02, 0.31)
star_edges = glowing_edges(star, light, 0.007)
star_edges.location = star.location

# Everything leans the way the sword does, and turns a little out of the card.
rig = bpy.data.objects.new("rig", None)
scene.collection.objects.link(rig)
for obj in (shield, shield_edges, star, star_edges):
    obj.parent = rig
rig.rotation_euler = (math.radians(-10), math.radians(12), math.radians(-14))

# ---- Light, camera, render -------------------------------------------------

world = bpy.data.worlds.new("world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.0, 0.004, 0.02, 1)
scene.world = world


def area(name, location, energy, colour, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = colour
    data.size = size
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    scene.collection.objects.link(obj)
    track = obj.constraints.new("TRACK_TO")
    track.target = rig
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"


area("key", (-2.4, 2.6, 3.4), 70, (0.6, 0.82, 1.0), 2.5)
area("rim", (3.0, -0.6, 1.4), 90, (0.2, 0.6, 1.0), 1.6)
area("under", (-1.0, -3.2, 1.6), 30, (0.1, 0.3, 1.0), 2.0)

cam_data = bpy.data.cameras.new("cam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = 3.3
cam = bpy.data.objects.new("cam", cam_data)
cam.location = (0, -0.08, 8)
scene.collection.objects.link(cam)
scene.camera = cam

scene.render.engine = "CYCLES"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 1200
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
