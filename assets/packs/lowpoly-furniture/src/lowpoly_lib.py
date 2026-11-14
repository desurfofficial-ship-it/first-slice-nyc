"""lowpoly_lib.py — bpy helpers for headless low-poly model generation.

Distilled from research verified against Blender 4.2.23 LTS (see references/bpy-patterns.md).
Design decisions baked in:
  - one bpy.data.mesh per object (keeps export_apply=True safe)
  - cube dimensions baked into mesh data (object scale stays 1.0 -> even bevels)
  - anchor='base' puts the primitive's footprint bottom at `loc` -> build furniture at z=0
  - flat shading by default; smooth-by-angle only for curved parts (version-branched)
  - hex colors converted sRGB -> linear (washed-out renders otherwise)
  - QA on the EVALUATED mesh (modifiers included), with to_mesh_clear() after every to_mesh()

Usage inside `blender -b -P script.py`:
    import lowpoly_lib as lp
    lp.reset_scene()
    leg = lp.cylinder("leg", r=0.03, depth=0.14, loc=(0.9, 0.4, 0), anchor="base")
    lp.bevel(leg, width=0.004)
    lp.assign(leg, lp.make_materials({"wood": {"hex": "#6E4B3A", "rough": 0.55}})["wood"])
"""

import math
import os

import bpy
from math import radians
from mathutils import Color, Matrix, Vector

# --------------------------------------------------------------------------
# scene
# --------------------------------------------------------------------------

def reset_scene():
    """Cleanest reset: empty factory scene (no default cube/camera/light ever existed)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"
    return scene


def purge_orphans():
    """Remove zero-user data blocks. Call after deleting objects.
    kwargs for orphans_purge differ across Blender versions -> guarded chain."""
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for _ in range(3):
        try:
            if bpy.data.orphans_purge(do_all=True) == 0:     # some versions
                break
        except TypeError:
            try:
                if bpy.data.orphans_purge(do_recursive=True) == 0:  # 4.2 runtime
                    break
            except TypeError:
                bpy.data.orphans_purge()
                break


def new_collection(name):
    coll = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(coll)
    return coll


# --------------------------------------------------------------------------
# primitives — all return the object; mesh data is unique; object scale stays 1.0
# anchor="base" -> `loc` is the footprint bottom-center (build furniture at z=0)
# anchor="center" -> `loc` is the primitive's center (Blender default)
# rotation (radians) is applied about the primitive center.
# --------------------------------------------------------------------------

def _place(obj, loc, rot, anchor, half_h):
    if anchor == "base":
        z = loc[2] + half_h
    else:
        z = loc[2]
    obj.location = (loc[0], loc[1], z)
    obj.rotation_euler = rot


def box(name, size, loc=(0, 0, 0), rot=(0, 0, 0), anchor="base", coll=None):
    """Axis-aligned box. size = full (w, d, h) in meters, baked into mesh data."""
    w, d, h = size
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    obj.data.transform(Matrix.Diagonal((w, d, h, 1.0)))  # keep obj.scale = (1,1,1)
    _place(obj, loc, rot, anchor, h / 2.0)
    if coll:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        coll.objects.link(obj)
    obj.select_set(False)
    return obj


def cylinder(name, r, depth, loc=(0, 0, 0), verts=16, rot=(0, 0, 0), anchor="base", coll=None):
    """Cylinder, radius r (m), total height depth (m)."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=r, depth=depth, location=(0, 0, 0), end_fill_type="NGON"
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    _place(obj, loc, rot, anchor, depth / 2.0)
    if coll:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        coll.objects.link(obj)
    obj.select_set(False)
    return obj


def cone(name, r1, r2, depth, loc=(0, 0, 0), verts=16, rot=(0, 0, 0), anchor="base", coll=None):
    """Cone/frustum: r1 bottom radius, r2 top radius (use r2=0 for a point)."""
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts, radius1=r1, radius2=r2, depth=depth, location=(0, 0, 0),
        end_fill_type="NGON",
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    _place(obj, loc, rot, anchor, depth / 2.0)
    if coll:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        coll.objects.link(obj)
    obj.select_set(False)
    return obj


def sphere(name, r, loc=(0, 0, 0), segments=16, rings=8, coll=None):
    """UV sphere, smooth-shaded by angle (looks round, stays low-poly)."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=r, location=loc
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    if coll:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        coll.objects.link(obj)
    obj.select_set(False)
    return obj


def plane(name, size, loc=(0, 0, 0), coll=None):
    bpy.ops.mesh.primitive_plane_add(size=size, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    if coll:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        coll.objects.link(obj)
    obj.select_set(False)
    return obj


# --------------------------------------------------------------------------
# modifiers & shading
# --------------------------------------------------------------------------

def bevel(obj, width=0.006, segments=1, angle_deg=40):
    """Stylized chamfer. width in meters (2-4mm case edges, 5-10mm tops, 20-60mm cushions).
    segments 1-2; clamp overlap on; harden normals stays OFF (flat-shaded style)."""
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = radians(angle_deg)
    mod.use_clamp_overlap = True
    return mod


def solidify(obj, thickness, offset=-1.0):
    mod = obj.modifiers.new("Solidify", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = offset
    mod.use_even_offset = True
    return mod


def shade_flat(obj):
    try:
        obj.data.shade_flat()          # ID method, verified 4.2
    except AttributeError:             # <=3.x fallback
        with bpy.context.temp_override(object=obj, active_object=obj,
                                       selected_objects=[obj]):
            bpy.ops.object.shade_flat()


def smooth_by_angle(obj, deg=40):
    """Version-branched auto-smooth (use_auto_smooth removed in Blender 4.1)."""
    ang = radians(deg)
    v = bpy.app.version
    if v >= (4, 2, 0):
        with bpy.context.temp_override(object=obj, active_object=obj,
                                       selected_objects=[obj]):
            bpy.ops.object.shade_auto_smooth(angle=ang)
    elif v >= (4, 1, 0):
        with bpy.context.temp_override(object=obj, active_object=obj,
                                       selected_objects=[obj]):
            bpy.ops.object.shade_smooth_by_angle(angle=ang)
    else:
        obj.data.shade_smooth()
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = ang


# --------------------------------------------------------------------------
# materials — one Principled BSDF per color, hex converted sRGB -> linear
# --------------------------------------------------------------------------

_MAT_CACHE = {}


def make_material(name, hex_color, roughness=0.7, metallic=0.0):
    if name in _MAT_CACHE:
        return _MAT_CACHE[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    h = hex_color.lstrip("#")
    srgb = Color((int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255))
    lin = srgb.from_srgb_to_scene_linear()          # in-place, returns self (verified 4.2)
    bsdf.inputs["Base Color"].default_value = (*lin, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Specular IOR Level" in bsdf.inputs:         # 4.x name
        bsdf.inputs["Specular IOR Level"].default_value = 0.3
    elif "Specular" in bsdf.inputs:                 # <=3.6 name
        bsdf.inputs["Specular"].default_value = 0.3
    mat.diffuse_color = (*lin, 1.0)                 # viewport swatch (linear too)
    _MAT_CACHE[name] = mat
    return mat


def make_materials(spec):
    """spec: {"name": {"hex": "#9CAF88", "rough": 0.9, "metal": 0.0}} -> {name: material}"""
    out = {}
    for name, p in spec.items():
        out[name] = make_material(name, p["hex"], p.get("rough", 0.7), p.get("metal", 0.0))
    return out


def assign(obj, mat):
    obj.data.materials.append(mat)


# --------------------------------------------------------------------------
# transforms, join, re-origin
# --------------------------------------------------------------------------

def apply_modifiers(obj):
    """Apply the whole modifier stack into mesh data.
    Needed per-part BEFORE join: joining merges modifier stacks, and a joined
    re-evaluation would re-bevel the whole model at the first part's width.
    A modifier that cannot be applied is removed (never kill a batch on it)."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:
            obj.modifiers.remove(mod)
    return obj


def apply_transforms(objs, location=True):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=location, rotation=True, scale=True)


def join_parts(objs, name):
    """Join into ONE mesh (single glTF node). Consumes the source objects."""
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    obj.select_set(False)
    return obj


def finalize(objs, name, smooth_angle=40):
    """Batch finisher: apply each part's modifiers -> join into one mesh ->
    one smooth-by-angle pass (boxes stay flat, cylinders/spheres round up,
    bevels stay crisp since their face angles exceed the threshold) ->
    origin to base-center. Returns the finished single-mesh model."""
    for o in objs:
        apply_modifiers(o)
    obj = join_parts(objs, name)
    if smooth_angle:
        smooth_by_angle(obj, smooth_angle)
    to_base_center(obj)
    return obj


def to_base_center(obj):
    """Origin -> footprint center, model sits on z=0, location=(0,0,0)."""
    apply_transforms([obj], location=True)
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    min_x = min(c.x for c in corners); max_x = max(c.x for c in corners)
    min_y = min(c.y for c in corners); max_y = max(c.y for c in corners)
    min_z = min(c.z for c in corners)
    cx, cy = (min_x + max_x) / 2.0, (min_y + max_y) / 2.0
    obj.data.transform(Matrix.Translation((-cx, -cy, -min_z)))
    obj.location = (0.0, 0.0, 0.0)


# --------------------------------------------------------------------------
# QA — evaluated mesh (modifiers included)
# --------------------------------------------------------------------------

def _eval_mesh(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    me = obj.evaluated_get(deps).to_mesh()
    me.calc_loop_triangles()
    return me


def tri_count(obj):
    me = _eval_mesh(obj)
    n = len(me.loop_triangles)
    obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
    return n


def bbox_dims(obj):
    """(width_x, depth_y, height_z) of the evaluated mesh, in meters."""
    deps = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(deps)
    corners = [ev.matrix_world @ Vector(c) for c in ev.bound_box]
    sx = max(c.x for c in corners) - min(c.x for c in corners)
    sy = max(c.y for c in corners) - min(c.y for c in corners)
    sz = max(c.z for c in corners) - min(c.z for c in corners)
    return (round(sx, 3), round(sy, 3), round(sz, 3))


def validate(obj, tri_budget=(300, 1500), expect_dims=None, tol=0.08, max_materials=6):
    """QA gate. Returns report dict; raises RuntimeError on any violation."""
    report = {"name": obj.name, "tris": tri_count(obj), "dims": bbox_dims(obj)}
    lo, hi = tri_budget
    problems = []
    if not (lo <= report["tris"] <= hi):
        problems.append(f"tri count {report['tris']} outside budget {lo}-{hi}")
    if expect_dims:
        for got, want, axis in zip(report["dims"], expect_dims, "WDH"):
            if abs(got - want) > tol * max(want, 0.1):
                problems.append(f"{axis} dim {got}m too far from expected {want}m")
    if obj.location.length > 1e-5:
        problems.append(f"location not origin: {tuple(obj.location)}")
    if max(abs(s - 1.0) for s in obj.scale) > 1e-5:
        problems.append(f"scale not identity: {tuple(obj.scale)}")
    if not (1 <= len(obj.data.materials) <= max_materials):
        problems.append(f"material count {len(obj.data.materials)} outside 1-{max_materials}")
    if ".0" in obj.name or ".00" in obj.name:
        problems.append(f"duplicate-style name: {obj.name}")
    report["problems"] = problems
    if problems:
        raise RuntimeError(f"VALIDATION FAILED for {obj.name}: " + "; ".join(problems))
    return report


# --------------------------------------------------------------------------
# export
# --------------------------------------------------------------------------

def export_glb(obj, filepath):
    d = os.path.dirname(filepath)
    if d:
        os.makedirs(d, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format="GLB",
        use_selection=True,          # stable name across 2.9 -> 4.2 (verified)
        export_apply=True,           # bakes Bevel/Solidify/Smooth-by-Angle
        export_materials="EXPORT",
        export_yup=True,
        export_image_format="NONE",  # textureless pack
    )
    size = os.path.getsize(filepath)
    if size <= 0:
        raise RuntimeError(f"GLB not written: {filepath}")
    return size


# --------------------------------------------------------------------------
# preview render — Cycles CPU (EEVEE fails headless without GPU/GL context)
# --------------------------------------------------------------------------

def setup_studio(floor=True, world_gray=(0.90, 0.90, 0.92), world_strength=0.35):
    """3-point area-light studio + light world + matte floor. Returns light handles."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new("Studio")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (*world_gray, 1.0)   # LINEAR space
    bg.inputs[1].default_value = world_strength

    def area(name, loc, rot, size, energy):
        ld = bpy.data.lights.new(name, "AREA")
        ld.size = size
        ld.energy = energy
        lo = bpy.data.objects.new(name, ld)
        lo.location = loc
        lo.rotation_euler = rot
        scene.collection.objects.link(lo)
        return lo

    lights = {
        "key": area("Key", (2.2, -2.0, 3.0), (radians(35), 0, radians(40)), 3.0, 600),
        "fill": area("Fill", (-3.0, -1.5, 1.8), (radians(65), 0, radians(-55)), 4.0, 150),
        "rim": area("Rim", (-1.0, 2.5, 2.5), (radians(60), 0, radians(200)), 2.0, 300),
    }
    if floor:
        fl = plane("Floor", 20.0, loc=(0, 0, 0))
        fm = make_material("studio_floor", "#C9C4BC", 0.85)
        assign(fl, fm)
    return lights


def setup_camera(targets, lens=65, direction=(1.0, -1.0, 0.55), pad=1.12, res=(1024, 1024)):
    """Fit camera to targets' bounding sphere from a 3/4 view. Satisfies BOTH hfov and vfov."""
    scene = bpy.context.scene
    deps = bpy.context.evaluated_depsgraph_get()
    center = Vector((0, 0, 0))
    radius = 0.0
    pts = []
    for o in targets:
        ev = o.evaluated_get(deps)
        pts += [ev.matrix_world @ Vector(c) for c in ev.bound_box]
    for p in pts:
        center += p
    center /= len(pts)
    radius = max((p - center).length for p in pts)

    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = lens
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    hfov = 2 * math.atan(cam_data.sensor_width / (2 * cam_data.lens))
    vfov = 2 * math.atan(math.tan(hfov / 2) / (res[0] / res[1]))
    dist = max(radius / math.sin(hfov / 2), radius / math.sin(vfov / 2)) * pad
    d = Vector(direction).normalized()
    cam.location = center + d * dist
    # -Z axis must point AT the subject: look vector = target - camera position
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    return cam


def render(path, res=1024, samples=96, transparent=False, exposure=0.0):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "NONE"
    except Exception:
        pass
    scene.cycles.device = "CPU"
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.02
    scene.cycles.samples = samples
    try:
        scene.cycles.use_denoising = True
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    scene.render.resolution_x = res[0] if isinstance(res, tuple) else res
    scene.render.resolution_y = res[1] if isinstance(res, tuple) else res
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = "PNG"
    for vt in ("Standard", "AgX", "Filmic"):  # Standard = truest flat pastel colors;
        try:                                   # AgX/Filmic fallbacks (guarded)
            scene.view_settings.view_transform = vt
            break
        except TypeError:
            continue
    try:
        scene.view_settings.exposure = exposure
    except Exception:
        pass
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, exist_ok=True)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return path


def report(piece, tris, dims, path):
    """Machine-readable progress line (exit codes from -P scripts are unreliable)."""
    size = os.path.getsize(path) if os.path.exists(path) else -1
    print(f"REPORT OK piece={piece} tris={tris} dims={dims[0]}x{dims[1]}x{dims[2]} "
          f"file={path} bytes={size}", flush=True)
