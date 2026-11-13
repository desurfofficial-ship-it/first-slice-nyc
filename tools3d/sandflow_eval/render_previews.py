"""Render studio previews of every generated GLB with Cycles (CPU, headless).

Run: venv-sand3d/bin/python tools3d/sandflow_eval/render_previews.py
Writes renders/<name>.png (640 px, 32 samples, OIDN denoise) — evidence for
03-asset-pack.md and the contact sheet.
"""
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))
GEN = os.path.join(REPO, "web-three", "public", "models-experimental", "sandflow")
OUT = os.path.join(HERE, "renders")

ASSETS = ["hydrant", "dsny_basket", "recycling_bin", "park_bench", "streetlight",
          "newsrack", "apartment_door", "security_gate", "storefront",
          "washing_machine", "refrigerator", "bodega_shelf"]

# Blender's ground sits at Z; glTF import converts to Z-up in Blender space.


def scene_bbox():
    mins = [1e9] * 3
    maxs = [-1e9] * 3
    for ob in bpy.context.scene.objects:
        if ob.type != "MESH":
            continue
        for corner in ob.bound_box:
            co = ob.matrix_world @ __import__("mathutils").Vector(corner)
            for a in range(3):
                mins[a] = min(mins[a], co[a])
                maxs[a] = max(maxs[a], co[a])
    return mins, maxs


def render_one(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = 32
    scn.cycles.use_denoising = True
    scn.cycles.denoiser = "OPENIMAGEDENOISE"
    scn.render.resolution_x = scn.render.resolution_y = 640
    scn.render.film_transparent = False
    scn.view_settings.view_transform = "AgX"
    scn.world = bpy.data.worlds.new("w")
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.42, 0.43, 0.45, 1.0)
    bg.inputs[1].default_value = 1.0

    bpy.ops.import_scene.gltf(filepath=os.path.join(GEN, f"{name}.glb"))
    mins, maxs = scene_bbox()
    cx, cy = (mins[0] + maxs[0]) / 2, (mins[1] + maxs[1]) / 2
    height = maxs[2] - mins[2]
    span = max(maxs[0] - mins[0], maxs[1] - mins[1], height)
    ground_z = mins[2]

    # ground plane
    bpy.ops.mesh.primitive_plane_add(size=span * 30, location=(cx, cy, ground_z))
    plane = bpy.context.active_object
    m = bpy.data.materials.new("ground")
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.32, 0.33, 0.34, 1)
    bsdf.inputs["Roughness"].default_value = 0.9
    plane.data.materials.append(m)

    # camera: 3/4 view
    dist = span * 1.9
    az = math.radians(35)
    el = math.radians(16)
    cam = bpy.data.cameras.new("cam")
    cam.lens = 50
    cam_ob = bpy.data.objects.new("cam", cam)
    scn.collection.objects.link(cam_ob)
    cam_ob.location = (cx + dist * math.cos(el) * math.sin(az),
                       cy - dist * math.cos(el) * math.cos(az),
                       ground_z + height * 0.55 + dist * math.sin(el))
    # look at mid-height
    direction = __import__("mathutils").Vector((cx, cy, ground_z + height * 0.45)) - cam_ob.location
    cam_ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scn.camera = cam_ob

    def area(name, loc, size, power, rot=(0, 0, 0)):
        l = bpy.data.lights.new(name, "AREA")
        l.energy = power
        l.size = size
        o = bpy.data.objects.new(name, l)
        scn.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = rot
        return o

    key = area("key", (cx + span * 1.2, cy - span * 1.4, ground_z + span * 1.4),
               size=max(span * 0.7, 0.5), power=span * span * 260,
               rot=(math.radians(48), 0, math.radians(40)))
    _fill = area("fill", (cx - span * 1.6, cy - span * 0.4, ground_z + span * 0.7),
                 size=max(span * 1.4, 0.8), power=span * span * 70,
                 rot=(math.radians(70), 0, math.radians(-60)))
    _rim = area("rim", (cx - span * 0.5, cy + span * 1.8, ground_z + span * 1.2),
                size=max(span * 0.9, 0.6), power=span * span * 90,
                rot=(math.radians(-35), 0, math.radians(180)))

    scn.render.filepath = os.path.join(OUT, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"RENDER OK {name} span={span:.2f}m")


def main():
    os.makedirs(OUT, exist_ok=True)
    names = ASSETS
    if "--" in sys.argv:
        names = sys.argv[sys.argv.index("--") + 1:]
    for name in names:
        render_one(name)


if __name__ == "__main__":
    main()
