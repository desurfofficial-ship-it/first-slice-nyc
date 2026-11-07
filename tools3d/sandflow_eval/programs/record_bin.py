"""B-Side Records browse bin — Alder Heights interiors.

Wears the three `Records_Crate_*` slots (RECORD-INT, three rows mid-room).
4400 long × 600 deep × 840 tall, front NORTH (glTF +Z, standard authoring).
Steel bin with divider fins and ~44 record spines in FIRST SLICE accents —
the crate-flip wall the whole store is about.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y (world north). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

SPINES = (GAME["coral"], GAME["teal"], GAME["gold"], GAME["plum"], GAME["cream"],
          GAME["taxi"], GAME["stone"], GAME["brick"])


def record_bin():
    s3d.empty_scene()
    parts = []
    shell = s3d.box("bin_shell", 4400, 600, 780)
    s3d.material(shell, "painted_metal", color=GAME["bldg"], roughness=0.55)
    rail = s3d.at(s3d.box("top_rail", 4400, 620, 60), z=780)
    s3d.material(rail, "brushed_steel", roughness=0.35)
    parts.extend([shell, rail])
    for lx in (-2000, 0, 2000):
        panel = s3d.at(s3d.box(f"end_panel_{lx}", 80, 600, 840), x=lx, z=0)
        s3d.material(panel, "painted_metal", color=GAME["bldg"], roughness=0.55)
        parts.append(panel)
    for i in range(40):
        lx = -2040 + i * 105
        h = 300 + (i * 37) % 110
        spine = s3d.at(s3d.box(f"spine_{i}", 92, 300, h), x=lx, y=-20, z=40)
        s3d.material(spine, "plastic", color=SPINES[i % len(SPINES)], roughness=0.5)
        parts.append(spine)
        if i % 9 == 4:
            lip = s3d.at(s3d.box(f"spine_lip_{i}", 60, 40, 30), x=lx, y=-165, z=40 + h - 30)
            s3d.material(lip, "plastic", color=GAME["cream"], roughness=0.5)
            parts.append(lip)
    return s3d.assembly("record_bin", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(record_bin(), sys.argv[1] if len(sys.argv) > 1 else "record_bin.glb")
