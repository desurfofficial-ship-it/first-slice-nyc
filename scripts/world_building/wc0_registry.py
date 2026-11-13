#!/usr/bin/env python3
"""W-C0 registry migration — the Catalpa Junction data wave.

Appends the district's rows to docs/data/world-registry.json (append-only
law: no canon row is edited, renamed or renumbered; the only existing-row
edits are the documented boundary/span growth fields). Run from repo root:
  python3 scripts/world_building/wc0_registry.py
"""
import json

REG = "docs/data/world-registry.json"

with open(REG) as f:
    doc = json.load(f)

# ---------- 1. bounds ----------
doc["bounds"]["world"]["xMax"] = 268
doc["bounds"]["world"]["note"] += " 2026-11-14 (W-C0, the master build assignment): xMax +136 -> +268 for the Catalpa Junction district (x +100..+252) and the moved SKY-E skyline cards (x +262)."
doc["bounds"]["playableCore"]["xMax"] = 252
doc["bounds"]["playableCore"]["note"] += " W-C0 (2026-11-14): grown east to x +252 — Catalpa Junction is real rows now (DEC-12 district; the owner's 2026-11-14 master build authorization). SKY-E moves +122 -> +262 to keep >= 10 m from the new wall line."
doc["bounds"]["skylineCards"] = [
    c for c in doc["bounds"]["skylineCards"] if c["id"] != "SKY-E"
] + [{
    "id": "SKY-E",
    "line": "x = +262 card row",
    "role": "the east vanishing point beyond Catalpa Junction (moved +122 -> +262 in W-C0 — the district took the old ground; the skyline fabric keeps its clearance)",
}]

# ---------- 2. streets ----------
for s in doc["streets"]:
    if s["id"] == "STR-KESTREL":
        s["spanX"] = [-100, 252]
        s["notes"] = (s.get("notes") or "") + " W-C0 (2026-11-14): spanX east end +100 -> +252 — Kestrel continues into Catalpa Junction (butt-jointed slabs, same levels; the district's connecting spine)."

doc["streets"] += [
    {
        "id": "STR-SPUR", "name": "The Spur", "axis": "NS", "centerline": 152,
        "spanZ": [-64, 64],
        "road": {"xMin": 151, "xMax": 153, "width": 2},
        "walkW": {"xMin": 146, "xMax": 151},
        "walkE": {"xMin": 153, "xMax": 158},
        "totalWidth": 12,
        "ways": "the freight spur gone pedestrian — disused track bed, weeds in the rails, timber crossings at each street; the elevated freight line crosses above it (the viaduct)",
        "character": "the district's spine — loft fronts, loading docks, the Junction Plaza at Kestrel, the Spur Gardens at its south end",
        "notes": "W-C0: new row (the DEC-12 district). The bed is a public walk; the track strips (x 151..153) are the only 'road' — flush rails <= 3 cm proud, walkable through by design.",
    },
    {
        "id": "STR-LARCH", "name": "Larch Street", "axis": "NS", "centerline": 228,
        "spanZ": [-64, 64],
        "road": {"xMin": 224, "xMax": 232, "width": 8},
        "walkW": {"xMin": 220, "xMax": 224},
        "walkE": {"xMin": 232, "xMax": 236},
        "totalWidth": 16,
        "ways": "two-way, narrow; ends at the world's east wall",
        "character": "the east row — walk-ups, storage, quiet",
        "notes": "W-C0: new row.",
    },
    {
        "id": "STR-ROWAN", "name": "Rowan Street", "axis": "EW", "centerline": 42,
        "spanX": [100, 252],
        "road": {"zMin": 38, "zMax": 46, "width": 8},
        "walkN": {"zMin": 46, "zMax": 50},
        "walkS": {"zMin": 34, "zMax": 38},
        "totalWidth": 16,
        "ways": "two-way, narrow",
        "character": "the north cross street — the viaduct's shadow, walk-ups",
        "notes": "W-C0: new row.",
    },
    {
        "id": "STR-SUMAC", "name": "Sumac Street", "axis": "EW", "centerline": -42,
        "spanX": [100, 252],
        "road": {"zMin": -46, "zMax": -38, "width": 8},
        "walkN": {"zMin": -38, "zMax": -34},
        "walkS": {"zMin": -50, "zMax": -46},
        "totalWidth": 16,
        "ways": "two-way, narrow",
        "character": "the south cross street — the gardens' gate, sheds",
        "notes": "W-C0: new row.",
    },
]

# ---------- 3. intersections + crosswalks ----------
doc["intersections"] += [
    {"id": "IX-CJN-KS", "streets": ["STR-KESTREL", "STR-SPUR"], "cornerBuildings": ["CJN-01", "CJN-03"]},
    {"id": "IX-CJN-KL", "streets": ["STR-KESTREL", "STR-LARCH"], "cornerBuildings": ["CJN-05", "CJN-12"]},
    {"id": "IX-CJN-RS", "streets": ["STR-ROWAN", "STR-SPUR"], "cornerBuildings": ["CJN-03", "CJN-15"]},
    {"id": "IX-CJN-RL", "streets": ["STR-ROWAN", "STR-LARCH"], "cornerBuildings": ["CJN-16", "CJN-06"]},
    {"id": "IX-CJN-SS", "streets": ["STR-SUMAC", "STR-SPUR"], "cornerBuildings": ["CJN-09", "CJN-18"]},
    {"id": "IX-CJN-SL", "streets": ["STR-SUMAC", "STR-LARCH"], "cornerBuildings": ["CJN-19", "CJN-12"]},
]
doc["crosswalks"] += [
    {"id": "XW-CJN-KS", "x": 152, "z": 0, "w": 3.4, "note": "the Kestrel x Spur crossing — the junction's zebra"},
    {"id": "XW-CJN-KL", "x": 228, "z": 0, "w": 3.4, "note": "the Kestrel x Larch crossing"},
    {"id": "XW-CJN-RS", "x": 152, "z": 42, "w": 3.4, "note": "the Rowan x Spur crossing (under the viaduct span)"},
    {"id": "XW-CJN-RL", "x": 228, "z": 42, "w": 3.4, "note": "the Rowan x Larch crossing"},
    {"id": "XW-CJN-SS", "x": 152, "z": -42, "w": 3.4, "note": "the Sumac x Spur crossing — the gardens' gate"},
    {"id": "XW-CJN-SL", "x": 228, "z": -42, "w": 3.4, "note": "the Sumac x Larch crossing"},
]

# ---------- 4. blocks ----------
doc["blocks"] += [
    {"id": "BLK-CJN-N", "note": "Catalpa north band (z 8..34, x 100..252) — loft conversions + the market hall", "buildings": ["CJN-01", "CJN-02", "CJN-03", "CJN-04", "CJN-05", "CJN-06"]},
    {"id": "BLK-CJN-S", "note": "Catalpa south band (z -34..-8) — wholesalers + bottling + sheds", "buildings": ["CJN-07", "CJN-08", "CJN-09", "CJN-10", "CJN-11", "CJN-12"]},
    {"id": "BLK-CJN-FARN", "note": "Catalpa far-north strip (z 50..64) — low walk-ups under the viaduct's shadow", "buildings": ["CJN-13", "CJN-14", "CJN-15", "CJN-16"]},
    {"id": "BLK-CJN-FARS", "note": "Catalpa far-south strip (z -64..-50) — low works rows", "buildings": ["CJN-17", "CJN-18", "CJN-19"]},
]

# ---------- 5. buildings (CJN-01..19 + SUB-03) ----------
def bld(id, name, fp, h, fl, style, entrances, storyRole, cls="C", face="", block="", interior=None, status="planned", business=None):
    row = {
        "id": id, "name": name, "status": status, "class": cls,
        "face": face, "block": block,
        "footprint": {"x": fp[0], "z": fp[1], "w": fp[2], "d": fp[3]},
        "height": h, "floors": fl, "style": style,
        "entrance": entrances, "interior": interior,
        "storyRole": storyRole, "collider": True,
    }
    if business:
        row["business"] = business
    return row

doc["buildings"] += [
    bld("CJN-01", "The Catalpa Freight Market", (116, 20, 24, 20), 16, 5,
        "warehouse loft conversion, big factory-window grids, painted-brick ghost band; the ground floor is the market hall (the C6 winter-lights venue)",
        [{"x": 116, "z": 10, "faces": "S"}],
        "The district's hero. The hall the endgame's hospitality builds in (design package: the freight-market stalls, the winter lights).",
        cls="A", face="Kestrel N", block="BLK-CJN-N",
        interior="FREIGHTMKT-INT (phase W-C4): the market hall — stall rows, the trader counter, the far pane",
        business="The Catalpa Freight Market (stalls — books open in a later phase)"),
    bld("CJN-02", "Catalpa Cold Storage", (137, 20, 14, 20), 13, 4,
        "cold-storage loft, brick, painted ghost band, dock door",
        [{"x": 137, "z": 10, "faces": "S"}],
        "Loft shell; the ghost sign's west neighbor.", face="Kestrel N", block="BLK-CJN-N"),
    bld("CJN-03", "The Spur Lofts", (174, 20, 22, 20), 12, 4,
        "spur-front loft row, big windows on the bed, iron balconets",
        [{"x": 163, "z": 20, "faces": "W"}, {"x": 170, "z": 10, "faces": "S"}],
        "The spur's east front — the lofts that watch the gardens grow.",
        face="The Spur E", block="BLK-CJN-N"),
    bld("CJN-04", "Starlite Stamping & Tool", (201, 19, 22, 18), 8.5, 2,
        "the ironworks shell — low industrial, sawtooth roof read, freight doors; the CATALPA IRON WORKS ghost sign on the east gable",
        [{"x": 191, "z": 19, "faces": "W"}],
        "The ghost-sign building (LMK-11). The spur's old customer.",
        face="The Spur E", block="BLK-CJN-N"),
    bld("CJN-05", "Junction Lofts", (220, 20, 8, 20), 14, 4,
        "corner loft, Larch + Kestrel fronts",
        [{"x": 220, "z": 10, "faces": "S"}, {"x": 224, "z": 20, "faces": "E"}],
        "The Larch corner.", face="Kestrel N + Larch W", block="BLK-CJN-N"),
    bld("CJN-06", "Larch Street Lofts", (243, 20, 14, 20), 15, 5,
        "tall loft closing the north row's east end",
        [{"x": 236, "z": 20, "faces": "W"}],
        "Larch's front.", face="Larch W", block="BLK-CJN-N"),
    bld("CJN-07", "Beacon Crate & Box", (112, -20, 16, 20), 12, 3,
        "wholesaler, painted crate-brand band, dock",
        [{"x": 112, "z": -10, "faces": "N"}],
        "The south row's west end.", face="Kestrel S", block="BLK-CJN-S"),
    bld("CJN-08", "Catalpa Bottling", (134, -20, 20, 20), 15, 4,
        "bottling loft, painted-brick read, dock doors",
        [{"x": 134, "z": -10, "faces": "N"}],
        "The south row's tall mass.", face="Kestrel S", block="BLK-CJN-S"),
    bld("CJN-09", "Spur Front Lofts", (171, -24, 18, 20), 11, 3,
        "spur-front loft, balconets on the bed",
        [{"x": 171, "z": -14, "faces": "N"}, {"x": 162, "z": -24, "faces": "W"}],
        "Watches the gardens from the north.", face="The Spur E", block="BLK-CJN-S"),
    bld("CJN-10", "Federal Wire & Cable", (194, -20, 20, 20), 14, 4,
        "wholesaler loft, sign band",
        [{"x": 194, "z": -10, "faces": "N"}],
        "The south row's center.", face="Kestrel S", block="BLK-CJN-S"),
    bld("CJN-11", "Sumac Shed", (216, -19, 16, 18), 8.5, 1,
        "low industrial shed, freight doors",
        [{"x": 216, "z": -10, "faces": "N"}],
        "The low roof that keeps the sky wide.", face="Kestrel S", block="BLK-CJN-S"),
    bld("CJN-12", "Larch Storage", (243, -20, 14, 20), 13, 4,
        "storage loft closing the south row's east end",
        [{"x": 236, "z": -20, "faces": "W"}],
        "Larch's south front.", face="Larch W", block="BLK-CJN-S"),
    bld("CJN-13", "Rowan Walk-ups", (115, 57, 22, 10), 9, 3,
        "low walk-up strip facing Rowan",
        [{"x": 115, "z": 52, "faces": "S"}],
        "The far-north strip.", face="Rowan N", block="BLK-CJN-FARN"),
    bld("CJN-14", "Viaduct Block W", (137, 57, 14, 10), 8, 2,
        "low block; the viaduct's columns stand at its front",
        [{"x": 137, "z": 52, "faces": "S"}],
        "The viaduct's shadow.", face="Rowan N", block="BLK-CJN-FARN"),
    bld("CJN-15", "Viaduct Block E", (176, 57, 28, 10), 10, 3,
        "low block, the long one",
        [{"x": 176, "z": 52, "faces": "S"}],
        "The far-north strip's long face.", face="Rowan N", block="BLK-CJN-FARN"),
    bld("CJN-16", "Rowan Works", (209, 57, 30, 10), 8, 2,
        "low works row at the Larch corner",
        [{"x": 209, "z": 52, "faces": "S"}],
        "The north-east end.", face="Rowan N", block="BLK-CJN-FARN"),
    bld("CJN-17", "Sumac Works 1", (119, -57, 30, 10), 8, 2,
        "low works row",
        [{"x": 119, "z": -52, "faces": "N"}],
        "The far-south strip.", face="Sumac S", block="BLK-CJN-FARS"),
    bld("CJN-18", "Sumac Works 2", (179, -57, 34, 10), 9, 2,
        "low works row, the long one",
        [{"x": 179, "z": -52, "faces": "N"}],
        "The gardens' back neighbor.", face="Sumac S", block="BLK-CJN-FARS"),
    bld("CJN-19", "Sumac Works 3", (212, -57, 24, 10), 8, 2,
        "low works row at the Larch corner",
        [{"x": 212, "z": -52, "faces": "N"}],
        "The south-east end.", face="Sumac S", block="BLK-CJN-FARS"),
    bld("SUB-03", "Catalpa Junction station house", (164, 5, 8, 6), 3.8, 1,
        "the K line's eastbound headhouse — iron globe lamp, stair hood, the station's name band (the surface stub; the underground platform + the eastbound ride are the next priced wave)",
        [{"x": 164, "z": 2, "faces": "S"}],
        "The junction's front door (LMK-13's globe). One stop east of Alder Heights on the K.",
        cls="B", face="The Spur E", block="BLK-CJN-N"),
]

# ---------- 6. parks ----------
doc["parks"] += [
    {
        "id": "PRK-JUNCTION", "name": "Junction Plaza", "status": "planned",
        "bbox": {"xMin": 146, "xMax": 158, "zMin": -6, "zMax": 6},
        "elements": "cobble deck over the spur's junction square, the preserved freight crane (LMK-10), two benches, string lights between the viaduct columns, bollards, the K station house across the way",
        "npcZones": ["NZ-CJN-PLAZA"],
        "notes": "W-C0: new row (built W-C3). The district's front porch.",
    },
    {
        "id": "PRK-SPURGARDEN", "name": "the Spur Gardens", "status": "planned",
        "bbox": {"xMin": 146, "xMax": 158, "zMin": -62, "zMax": -40},
        "elements": "raised beds between the rails, sunflowers, the track reading through, the Sumac gate at z -40, water barrels",
        "npcZones": ["NZ-CJN-SPUR"],
        "notes": "W-C0: new row (built W-C3). The community claiming the freight line.",
    },
]

# ---------- 7. landmarks ----------
doc["landmarks"] += [
    {"id": "LMK-10", "name": "The Junction Crane", "anchor": "PRK-JUNCTION", "reason": "the preserved freight crane — the junction's front porch piece and the district's meeting point ('by the crane')"},
    {"id": "LMK-11", "name": "The Catalpa Iron Works ghost sign", "anchor": "CJN-04", "reason": "CATALPA IRON WORKS — STRUCTURAL . ORNAMENTAL — EST. 1911, painted brick on the east gable; the district's memory"},
    {"id": "LMK-12", "name": "The Elevated Spur", "anchor": "STR-SPUR", "reason": "the iron viaduct over the bed — the rattle overhead, the silhouette from Alder Heights"},
    {"id": "LMK-13", "name": "The Catalpa Junction globe", "anchor": "SUB-03", "reason": "the K's east globe lamp — 'by the globe' now works in two districts"},
]

# ---------- 8. transit + npc zones + routes ----------
doc["transit"]["subway"]["entrances"] = doc["transit"]["subway"].get("entrances", []) + [
    "SUB-03 (planned E headhouse — the Catalpa Junction stub; the underground platform + the eastbound ride are the next priced wave)"
]
doc["transit"]["subway"]["canon"] = doc["transit"]["subway"].get("canon", "") + " W-C0: the K is a three-station line on paper — 42 St (W) / Alder Heights (mid) / Catalpa Junction (E); only the westbound ride ships."
doc["npcZones"] += [
    {"id": "NZ-CJN-PLAZA", "place": "Junction Plaza", "who": "the market crowd, the crane's bench-sitters, the K's eastbound commuters", "when": "rush band", "status": "planned"},
    {"id": "NZ-CJN-SPUR", "place": "the Spur Gardens", "who": "the gardeners, the sunflower watch", "when": "midday band", "status": "planned"},
]
doc["routes"]["pedestrian"] += [
    {"id": "R-SPUR-W", "way": "the bed's west walk x 147.5..148.5, z -48..48 (between the boundary walls and the rails)"},
    {"id": "R-SPUR-E", "way": "the bed's east walk x 155.5..156.5, z -48..48"},
    {"id": "R-LARCH-W", "way": "Larch west walk x 220..224 (lane x 222), z -48..48"},
    {"id": "R-LARCH-E", "way": "Larch east walk x 232..236 (lane x 234), z -48..48"},
    {"id": "R-ROWAN-N", "way": "Rowan north walk z 46..50 (lane z 48), x 100..252"},
    {"id": "R-ROWAN-S", "way": "Rowan south walk z 34..38 (lane z 36), x 100..252"},
    {"id": "R-SUMAC-N", "way": "Sumac north walk z -38..-34 (lane z -36), x 100..252"},
    {"id": "R-SUMAC-S", "way": "Sumac south walk z -50..-46 (lane z -48), x 100..252"},
]

# ---------- 9. interior (planned; carved W-C4) ----------
doc["interiors"] += [
    {
        "id": "FREIGHTMKT-INT", "building": "CJN-01", "status": "planned",
        "shell": {"xMin": 105, "xMax": 127, "zMin": 11, "zMax": 29, "clearH": 4.0},
        "plan": [
            {"item": "entrance", "x": 116, "z": 11, "w": 2.6, "d": 0.6},
            {"item": "market stall row A (west wall)", "x": 107.2, "z": 20, "w": 1.6, "d": 12},
            {"item": "market stall row B (east wall)", "x": 124.8, "z": 20, "w": 1.6, "d": 12},
            {"item": "trader counter (north end)", "x": 116, "z": 27.2, "w": 8, "d": 1.2},
            {"item": "center island (off the door line)", "x": 116, "z": 21.5, "w": 2.2, "d": 6},
            {"item": "far pane (north window band)", "x": 116, "z": 28.95, "w": 12, "d": 0.1},
        ],
        "anchors": [
            {"id": "FREIGHTMKT-DOOR", "x": 116, "z": 11.2, "note": "the hall's door on Kestrel"},
            {"id": "FREIGHTMKT-COUNTER", "x": 116, "z": 26.6, "note": "the trader counter"},
        ],
        "tags": ["c6-venue", "winter-lights"],
        "notes": "W-C0: planned (the design package's freight-market hall). The carve rides the W5 full-cavity pattern; the fit-out is the room's own plan list. The C6 winter-lights beat dresses this room without re-carving.",
    },
]

# ---------- 10. construction phase ----------
doc["constructionPhases"] += [
    {
        "id": "W-C0",
        "name": "Catalpa Junction — the data wave",
        "content": "The DEC-12 district's registry rows under the owner's 2026-11-14 master build authorization: bounds (world xMax +268, playableCore xMax +252, SKY-E +262), Kestrel spanX east to +252, streets STR-SPUR/STR-LARCH/STR-ROWAN/STR-SUMAC, 6 intersections + 6 crosswalks, 4 blocks, buildings CJN-01..19 + SUB-03 (planned — the builders flip them), parks PRK-JUNCTION/PRK-SPURGARDEN (planned), landmarks LMK-10..13, npcZones NZ-CJN-PLAZA/SPUR, pedestrian routes R-SPUR-*/R-LARCH-*/R-ROWAN-*/R-SUMAC-*, interior FREIGHTMKT-INT (planned). Append-only: no canon row edited beyond the two documented span/bounds growth fields.",
    },
]

with open(REG, "w") as f:
    json.dump(doc, f, indent=2, ensure_ascii=False)
    f.write("\n")

print("W-C0 registry migration complete:")
print("  buildings:", len(doc["buildings"]), "parks:", len(doc["parks"]),
      "interiors:", len(doc["interiors"]), "landmarks:", len(doc["landmarks"]),
      "streets:", len(doc["streets"]), "phases:", len(doc["constructionPhases"]))
