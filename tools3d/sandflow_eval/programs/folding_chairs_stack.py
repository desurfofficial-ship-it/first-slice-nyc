"""Community hall folding-chair stack — Alder Heights interiors.

Wears the four `Hall_Chairs_*` stack slots (HALL-INT corners of the clear
zone). 550 × 550 × 810: four cream pans stacked with steel side frames,
slightly offset the way stacked chairs always are.
Parts stand on z=0; every `at(z=…)` is a BASE height.

Front looks -Y (world north). Millimetres.
"""
import sand3d as s3d
from _nyc import GAME


def folding_chairs_stack():
    s3d.empty_scene()
    parts = []
    for sx in (-230, 230):
        frame = s3d.at(s3d.box(f"frame_{sx}", 40, 40, 810), x=sx, z=0)
        s3d.material(frame, "brushed_steel", roughness=0.35)
        parts.append(frame)
    for i in range(4):
        dx = (i % 2) * 24 - 12
        dy = ((i + 1) % 2) * 20 - 10
        pan = s3d.at(s3d.box(f"seat_pan_{i}", 480, 440, 45), x=dx, y=dy, z=i * 190)
        s3d.material(pan, "plastic", color=GAME["cream"] if i % 2 else GAME["stone"], roughness=0.55)
        back = s3d.at(s3d.box(f"seat_back_{i}", 480, 40, 120), x=dx, y=dy + 200, z=i * 190 + 45)
        s3d.material(back, "plastic", color=GAME["cream"] if i % 2 else GAME["stone"], roughness=0.55)
        parts.extend([pan, back])
    return s3d.assembly("folding_chairs_stack", *parts)


if __name__ == "__main__":
    import sys
    s3d.export(folding_chairs_stack(), sys.argv[1] if len(sys.argv) > 1 else "folding_chairs_stack.glb")
