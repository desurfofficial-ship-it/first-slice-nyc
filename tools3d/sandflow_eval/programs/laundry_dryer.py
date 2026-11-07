"""Laundromat stacked-pocket commercial dryer — Alder Heights interiors.

Wears the four `LD_*` slots (east wall of LAUNDRY-INT, front west into the
room) via the washer-slot pattern: placeholder group yaw −π/2, GLB authored
front −Y. 750 wide × 720 deep × 1350 tall — the shipped slot footprint.
White cabinet, teal control band, gold start dial, dark round door.
sand3d parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y. Millimetres.
"""
import sand3d as s3d
from _nyc import NYC, GAME


def laundry_dryer():
    s3d.empty_scene()
    cab = s3d.box("cabinet", 750, 720, 1350)
    s3d.material(cab, "painted_metal", color=NYC["washer_white"], roughness=0.4)
    band = s3d.at(s3d.box("control_band", 750, 30, 210), y=-345, z=1140)
    s3d.material(band, "glossy_plastic", color=GAME["teal"], roughness=0.35)
    dial = s3d.at(s3d.cylinder("start_dial", 65, 24), rx=90, x=-180, y=-362, z=1245)
    s3d.material(dial, "glossy_plastic", color=GAME["gold"], roughness=0.3)
    slots = s3d.at(s3d.box("coin_slots", 220, 16, 70), x=180, y=-356, z=1215)
    s3d.material(slots, "glossy_plastic", color=GAME["ink"], roughness=0.3)
    ring = s3d.at(s3d.tube("door_ring", 270, 210, 46), y=-380, z=560)
    s3d.material(ring, "brushed_steel", roughness=0.3)
    glass = s3d.at(s3d.cylinder("door_glass", 210, 16), rx=90, y=-404, z=560)
    s3d.material(glass, "plastic", color=GAME["window_dim"], roughness=0.25)
    handle = s3d.at(s3d.box("door_handle", 24, 60, 110), x=250, y=-408, z=505)
    s3d.material(handle, "brushed_steel", roughness=0.3)
    lintel = s3d.at(s3d.box("lint_slot", 180, 20, 46), x=160, y=-360, z=1010)
    s3d.material(lintel, "glossy_plastic", color=GAME["ink"], roughness=0.4)
    kick = s3d.at(s3d.box("kick_base", 730, 700, 90), z=0)
    s3d.material(kick, "painted_metal", color=GAME["ink"], roughness=0.5)
    return s3d.assembly("laundry_dryer", cab, band, dial, slots, ring, glass,
                        handle, lintel, kick)


if __name__ == "__main__":
    import sys
    s3d.export(laundry_dryer(), sys.argv[1] if len(sys.argv) > 1 else "laundry_dryer.glb")
