"""Laundromat front-loading washing machine — Alder Heights asset 10/12 (interior).

Derived from Sandflow's Apache-2.0 example `programs/washing_machine.py`
(credited per license): same joint vocabulary, reworked for a commercial
laundromat front-loader — 685 × 740 × 1130 mm, Ø480 porthole with a wide
chrome ring, coin-slide panel, soap tray, heavy kick base. Articulated:
revolute joint `door_hinge` (hinge on the -X edge of the door, opens outward
toward -Y, 0–135°).

Front looks -Y. Millimetres.
"""
import sand3d as s3d
from _nyc import NYC, GAME


def washing_machine():
    s3d.empty_scene()
    cab = s3d.box("cabinet", 685, 740, 1130)
    s3d.fillet(cab, 12, edges="side")
    front = cab.face("-Y")
    s3d.pocket(cab, s3d.circle(480), 640, on=front.move(0, 560))
    s3d.material(cab, "painted_metal", color=NYC["washer_white"], roughness=0.4)

    back = front.move(0, 560).offset(-550)
    drum = s3d.at(s3d.cylinder("drum", 420, 500), on=back)
    s3d.cut(drum, s3d.at(s3d.cylinder("bore", 396, 520), on=back.offset(-12)))
    s3d.material(drum, "brushed_steel")

    ring = s3d.at(s3d.tube("door_ring", 520, 430, 60), on=front.move(0, 560))
    glass = s3d.at(s3d.cylinder("door_glass", 380, 16), on=front.move(0, 560).offset(16))
    handle = s3d.at(s3d.box("door_handle", 26, 70, 120), x=225, y=-445, z=600)
    s3d.material(ring, "brushed_steel", roughness=0.3)
    s3d.material(glass, "glass", color="#cfe3e6", opacity=0.4)
    s3d.material(handle, "brushed_steel", roughness=0.3)
    door = s3d.group("washer_door", ring, glass, handle)
    hinge = front.move(-260, 560).offset(35)
    s3d.joint("door_hinge", door, hinge, axis="-Z", range=(0, 135))

    panel = s3d.at(coin_panel(), y=-370, z=905)
    kick = s3d.at(kick_base(), z=0)
    tray = s3d.at(soap_tray(), y=-370, z=780)
    return s3d.assembly("washing_machine", cab, drum, door, panel, kick, tray, front=front)


def coin_panel(w=430, t=20, h=200):
    panel = s3d.box("coin_panel", w, t, h)
    s3d.pocket(panel, s3d.rect(180, 90), 8, on=panel.face("-Y").move(x=-90, y=100))
    dial = s3d.at(s3d.cylinder("start_dial", 70, 26), rx=90, x=130, y=-14, z=30)
    s3d.material(panel, "glossy_plastic", color=GAME["ink"], roughness=0.3)
    s3d.material(dial, "glossy_plastic", color=GAME["gold"], roughness=0.3)
    return s3d.group("coin_panel", panel, dial)


def kick_base(w=705, d=760, h=95):
    base = s3d.box("kick_base", w, d, h)
    s3d.material(base, "painted_metal", color=GAME["ink"], roughness=0.5)
    return base


def soap_tray(w=220, t=24, h=60):
    tray = s3d.box("soap_tray", w, t, h)
    s3d.pocket(tray, s3d.rect(w - 40, h + 40), 14, on=tray.face("-Y").move(y=4))
    s3d.material(tray, "brushed_steel", roughness=0.35)
    return tray


def washer_open():
    machine = washing_machine()
    s3d.pose(machine, 100, joint="door_hinge")
    return machine


if __name__ == "__main__":
    import sys
    s3d.export(washing_machine(), sys.argv[1] if len(sys.argv) > 1 else "washing_machine.glb")
