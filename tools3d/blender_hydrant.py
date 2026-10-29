# Blender 4.2 headless — NYC hydrant for the .glb asset seam (docs/28).
#
#   blender --background --python tools3d/blender_hydrant.py -- --out <path.glb>
#
# Design: the classic three-nozzle hydrant — base flange, gently tapered
# barrel, domed bonnet with an operating nut, two side nozzles with caps and
# a steamer nozzle facing the street. Low-poly on purpose: 10-12 segment
# revolve primitives, flat shading, zero textures. The game scales the file
# to the placeholder's height and centers it (docs/28), so proportions are
# what matter; the model stands ~1 unit tall, feet at the origin.
#
# Palette (docs/04 anchors): coral 0xff6b6b body, ink 0x3a3440 flange + caps.

import bpy
import math
import sys
from mathutils import Vector


def parse_out():
    argv = sys.argv
    if "--" in argv:
        rest = argv[argv.index("--") + 1:]
        if "--out" in rest:
            return rest[rest.index("--out") + 1]
    return "/tmp/hydrant.glb"


def mat(name, hexcolor, rough=0.85):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    h = hexcolor
    bsdf.inputs["Base Color"].default_value = (
        ((h >> 16) & 255) / 255.0,
        ((h >> 8) & 255) / 255.0,
        (h & 255) / 255.0,
        1.0,
    )
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = 0.0
    return m


def add(fn, name, loc, rot=(0, 0, 0), scale=(1, 1, 1), material=None):
    """Run a primitive op, then name/place/material the result."""
    bpy.ops.object.select_all(action="DESELECT")
    fn()
    o = bpy.context.active_object
    o.name = name
    o.location = loc
    o.rotation_euler = rot
    o.scale = scale
    if material:
        o.data.materials.append(material)
    return o


def zcyl(name, r, h, z, seg=12, material=None):
    return add(
        lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=1.0, depth=1.0),
        name, (0, 0, z), scale=(r, r, h), material=material,
    )


def zcyl2(name, r_bottom, r_top, h, z, seg=12, material=None):
    """Tapered barrel via cone (radius1 = bottom, radius2 = top)."""
    return add(
        lambda: bpy.ops.mesh.primitive_cone_add(
            vertices=seg, radius1=max(r_bottom, 1e-4), radius2=max(r_top, 1e-4), depth=1.0,
        ),
        name, (0, 0, z), scale=(1, 1, h), material=material,
    )


def xnozzle(name, r, length, x, z, material):
    """A nozzle lying along X: cylinder rotated to horizontal."""
    return add(
        lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=1.0, depth=1.0),
        name, (x, 0, z), rot=(0, math.pi / 2, 0), scale=(r, r, length), material=material,
    )


def ynozzle(name, r, length, y, z, material):
    return add(
        lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=1.0, depth=1.0),
        name, (0, y, z), rot=(math.pi / 2, 0, 0), scale=(r, r, length), material=material,
    )


def main():
    out = parse_out()

    # clean scene
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for item in list(block):
            if item.users == 0:
                block.remove(item)

    coral = mat("HydrantCoral", 0xFF6B6B)
    ink = mat("HydrantInk", 0x3A3440)

    # ---- base ------------------------------------------------------------
    zcyl("BaseFlange", 0.21, 0.06, 0.03, material=ink)          # sits on the pavement
    zcyl("BaseSkirt", 0.165, 0.07, 0.095, material=coral)
    # ---- barrel (tapered) + neck -----------------------------------------
    zcyl2("Barrel", 0.150, 0.118, 0.50, 0.38, material=coral)
    zcyl("Neck", 0.112, 0.05, 0.655, material=coral)
    # ---- bonnet: squashed dome --------------------------------------------
    dome = add(
        lambda: bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.15),
        "Bonnet", (0, 0, 0.68), scale=(1.0, 1.0, 0.72), material=coral,
    )
    # clip the dome below its waist (that half hides inside the neck anyway —
    # delete the verts to keep the mesh honest)
    bpy.ops.object.select_all(action="DESELECT")
    dome.select_set(True)
    bpy.context.view_layer.objects.active = dome
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for v in dome.data.vertices:
        if v.co.z < -0.02:  # local space; scaled z < 0.68-0.014 world
            v.select = True
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="VERT")
    bpy.ops.object.mode_set(mode="OBJECT")
    # ---- operating nut (pentagon, ink) -------------------------------------
    add(
        lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=1.0, depth=1.0),
        "OperatingNut", (0, 0, 0.815), scale=(0.05, 0.05, 0.045), material=ink,
    )
    # ---- side nozzles ±X with ink caps -------------------------------------
    for sx, tag in ((-1, "W"), (1, "E")):
        xnozzle(f"Nozzle{tag}", 0.058, 0.11, sx * 0.19, 0.44, coral)
        xnozzle(f"Cap{tag}", 0.068, 0.045, sx * 0.255, 0.44, ink)
    # ---- steamer nozzle toward the street (-Y) ------------------------------
    ynozzle("NozzleS", 0.062, 0.10, -0.17, 0.33, coral)
    ynozzle("CapS", 0.072, 0.04, -0.235, 0.33, ink)

    # flat shading everywhere — the whole world is faceted low-poly
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.shade_flat()

    # sanity: report bounds (expect ~±0.26 X, ~-0.26 Y, 0..0.84 Z)
    mins = Vector((1e9,) * 3)
    maxs = Vector((-1e9,) * 3)
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        for corner in o.bound_box:
            wc = o.matrix_world @ Vector(corner)
            mins = Vector(map(min, mins, wc))
            maxs = Vector(map(max, maxs, wc))
    print("BOUNDS min", [round(v, 3) for v in mins], "max", [round(v, 3) for v in maxs])

    # export — glTF, +Y up handled by the exporter
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
    )
    print("EXPORTED", out)


main()
