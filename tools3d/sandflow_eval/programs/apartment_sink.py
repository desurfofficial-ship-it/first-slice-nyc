"""Cecil-room wash basin — Alder Heights interiors.

Wears the `Cecil_Sink` slot (CECIL-ROOM bath, south wall). The shipped slab
is 0.3 tall — a real wall-hung basin stands 850 mm — so the placeholder
grows to 450 × 400 × 1010. Standard authoring (front north into the bath):
ceramic basin on a pedestal, chrome faucet, soap dish, bottle trap.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y (world north). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def apartment_sink():
    s3d.empty_scene()
    parts = []
    pedestal = s3d.at(s3d.cylinder("pedestal", 90, 690), z=0)
    s3d.material(pedestal, "ceramic", color=GAME["cream"], roughness=0.2)
    basin = s3d.at(s3d.box("basin", 450, 400, 160), z=690)
    s3d.fillet(basin, 25, edges="side")
    s3d.material(basin, "ceramic", color=GAME["cream"], roughness=0.2)
    bowl = s3d.at(s3d.box("basin_bowl", 330, 280, 60), y=-10, z=725)
    s3d.material(bowl, "plastic", color=GAME["stone"], roughness=0.3)
    tap_v = s3d.at(s3d.cylinder("faucet_column", 22, 160), y=130, z=850)
    tap_h = s3d.at(s3d.cylinder("faucet_bar", 16, 180), rx=90, y=50, z=960)
    for t in (tap_v, tap_h):
        s3d.material(t, "chrome", roughness=0.15)
    soap = s3d.at(s3d.box("soap_dish", 120, 90, 40), x=140, y=120, z=760)
    s3d.material(soap, "ceramic", color=GAME["cream"], roughness=0.25)
    trap = s3d.at(s3d.cylinder("bottle_trap", 45, 180), z=150)
    s3d.material(trap, "brushed_steel", roughness=0.3)
    parts.extend([pedestal, basin, bowl, tap_v, tap_h, soap, trap])
    return s3d.assembly("apartment_sink", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(apartment_sink(), sys.argv[1] if len(sys.argv) > 1 else "apartment_sink.glb")
