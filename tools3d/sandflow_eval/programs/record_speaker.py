"""B-Side Records listening speakers — Alder Heights interiors.

Wear the two `Records_Spk_*` slots (RECORD-INT listening corner, behind the
armchair, facing north). 500 × 500 × 1260: ink cabinet, cream woofer ring
and cone, gold dome, stone grill cloth, bass port, plinth.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y (world north). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def record_speaker():
    s3d.empty_scene()
    cab = s3d.box("cabinet", 500, 500, 1200)
    s3d.fillet(cab, 10, edges="side")
    s3d.material(cab, "painted_metal", color=GAME["ink"], roughness=0.5)
    plinth = s3d.at(s3d.box("plinth", 440, 440, 60), z=0)
    s3d.material(plinth, "painted_metal", color=GAME["window_dim"], roughness=0.5)
    grill = s3d.at(s3d.box("grill_cloth", 420, 30, 480), y=-240, z=660)
    s3d.material(grill, "fabric", color=GAME["stone"], roughness=0.85)
    woofer_ring = s3d.at(s3d.tube("woofer_ring", 150, 110, 40), y=-255, z=310)
    s3d.material(woofer_ring, "plastic", color=GAME["cream"], roughness=0.5)
    woofer = s3d.at(s3d.cylinder("woofer_cone", 105, 50), rx=90, y=-262, z=330)
    s3d.material(woofer, "plastic", color=GAME["manhole"], roughness=0.6)
    dome = s3d.at(s3d.cylinder("tweeter_dome", 60, 30), rx=90, y=-258, z=1020)
    s3d.material(dome, "glossy_plastic", color=GAME["gold"], roughness=0.3)
    port = s3d.at(s3d.cylinder("bass_port", 55, 60), rx=90, y=-250, z=140)
    s3d.material(port, "plastic", color=GAME["window_dim"], roughness=0.5)
    return s3d.assembly("record_speaker", cab, plinth, grill, woofer_ring,
                        woofer, dome, port)


if __name__ == "__main__":
    import sys
    s3d.export(record_speaker(), sys.argv[1] if len(sys.argv) > 1 else "record_speaker.glb")
