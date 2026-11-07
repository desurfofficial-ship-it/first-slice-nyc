"""Cecil-room toilet — Alder Heights interiors.

Wears the `Cecil_Toilet` slot (CECIL-ROOM bath corner SE). The shipped slab
placeholder is only 0.4 tall — a real toilet is 750 mm at the tank — so the
placeholder grows to 400 × 600 × 820 and the room reads honestly. Authored
in its final world orientation (width along world X, depth along world Z,
front WEST into the bath). Ceramic body, tank, seat, chrome button.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -X (world west). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def apartment_toilet():
    s3d.empty_scene()
    parts = []
    bowl = s3d.box("bowl_base", 380, 620, 400)
    s3d.fillet(bowl, 30, edges="side")
    s3d.material(bowl, "ceramic", color=GAME["cream"], roughness=0.2)
    seat = s3d.at(s3d.box("seat", 400, 520, 50), y=-30, z=400)
    s3d.material(seat, "plastic", color=GAME["stone"], roughness=0.35)
    tank = s3d.at(s3d.box("tank", 380, 190, 420), y=230, z=400)
    s3d.material(tank, "ceramic", color=GAME["cream"], roughness=0.2)
    lid = s3d.at(s3d.box("tank_lid", 400, 200, 60), y=230, z=820)
    s3d.material(lid, "ceramic", color=GAME["cream"], roughness=0.2)
    button = s3d.at(s3d.cylinder("flush_button", 40, 25), y=230, z=845)
    s3d.material(button, "brushed_steel", roughness=0.25)
    pipe = s3d.at(s3d.cylinder("supply_pipe", 24, 200), y=340, z=200)
    s3d.material(pipe, "brushed_steel", roughness=0.3)
    parts.extend([bowl, seat, tank, lid, button, pipe])
    return s3d.assembly("apartment_toilet", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(apartment_toilet(), sys.argv[1] if len(sys.argv) > 1 else "apartment_toilet.glb")
