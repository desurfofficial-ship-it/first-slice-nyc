"""B-Side Records wall shelving — Alder Heights interiors (new fixture).

Fills the bare west wall of RECORD-INT opposite the crates: three shelves
of browsable LPs, a poster panel, a display row on top. 400 deep × 4000
long × 2200 tall, authored in its final world orientation (depth along
world X, length along world Z, front EAST into the room) so the unyawed
placeholder passes the footprint guard 1:1.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks +X (world east). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME

SPINES = (GAME["teal"], GAME["gold"], GAME["plum"], GAME["coral"], GAME["cream"],
          GAME["taxi"], GAME["brick"], GAME["stone"])


def record_wall_shelf():
    s3d.empty_scene()
    parts = []
    for ly in (-1900, 1900):
        post = s3d.at(s3d.box(f"upright_{ly}", 380, 45, 2200), y=ly, z=0)
        s3d.material(post, "painted_metal", color=GAME["bldg"], roughness=0.55)
        parts.append(post)
    for li, z in enumerate((250, 750, 1250, 1750)):
        board = s3d.at(s3d.box(f"shelf_{li}", 380, 3950, 24), z=z)
        s3d.material(board, "painted_metal", color="#e8e4dc", roughness=0.55)
        parts.append(board)
        if li < 3:
            for k in range(30):
                ly = -1800 + k * 130
                h = 240 + (k * 53) % 90
                spine = s3d.at(s3d.box(f"spine_{li}_{k}", 260, 100, h), x=100, y=ly, z=z + 24)
                s3d.material(spine, "plastic", color=SPINES[(k + li * 3) % len(SPINES)], roughness=0.5)
                parts.append(spine)
    poster = s3d.at(s3d.box("poster_panel", 30, 1400, 1900), x=190, y=-900, z=150)
    s3d.material(poster, "glossy_plastic", color=GAME["coral"], roughness=0.35)
    band = s3d.at(s3d.box("poster_band", 34, 1400, 300), x=194, y=-900, z=1750)
    s3d.material(band, "glossy_plastic", color=GAME["ink"], roughness=0.4)
    display = s3d.at(s3d.box("display_row", 340, 900, 40), x=80, y=1400, z=1790)
    s3d.material(display, "brushed_steel", roughness=0.35)
    parts.extend([poster, band, display])
    for k in range(5):
        rec = s3d.at(s3d.box(f"display_lp_{k}", 300, 30, 300), x=80, y=1100 + k * 150, z=1830)
        s3d.material(rec, "plastic", color=SPINES[k * 2 % len(SPINES)], roughness=0.5)
        parts.append(rec)
    return s3d.assembly("record_wall_shelf", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(record_wall_shelf(), sys.argv[1] if len(sys.argv) > 1 else "record_wall_shelf.glb")
