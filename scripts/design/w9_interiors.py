#!/usr/bin/env python3
"""W9: add the nine strip-row interior rows + update the building rows'
interior fields. Append-only (the registry's own law) — FRUIT-INT stays
first of the strip rooms, the nine join after it."""
import json, io

PATH = 'docs/data/world-registry.json'
raw = io.open(PATH, encoding='utf-8').read()
doc = json.loads(raw)

def shell(x0, x1, z0, z1):
    return {"xMin": x0, "xMax": x1, "zMin": z0, "zMax": z1, "clearH": 3.2}

ROWS = [
  {
    "id": "WINE-INT", "building": "KTS-04", "status": "built (W9)",
    "shell": shell(60.4, 67.6, -63.7, -48.7),
    "plan": [
      {"item": "entrance (N, Carrow walk facade)", "x": 61.8, "z": -48.6, "w": 1.2, "d": 0.5},
      {"item": "shop window (N, E of the door)", "x": 64.1, "z": -48.6, "w": 2.4, "d": 0.5},
      {"item": "window E (N facade)", "x": 66.5, "z": -48.6, "w": 1.2, "d": 0.5},
      {"item": "counter + register (E wall)", "x": 66.85, "z": -51.3, "w": 0.7, "d": 2.6},
      {"item": "bottle wall (W skin)", "x": 60.85, "z": -52.8, "w": 0.5, "d": 5.2},
      {"item": "cold case (W skin, rear)", "x": 60.85, "z": -57.6, "w": 0.5, "d": 2.2},
      {"item": "tasting table (mid-room)", "x": 64.2, "z": -53.4, "w": 2.2, "d": 0.9},
      {"item": "barrel stacks (S wall)", "x": 64, "z": -62.8, "w": 4.2, "d": 1.2},
      {"item": "aisle", "x": 63.6, "z": -56, "w": 4.4, "d": 9, "type": "clear zone"}
    ],
    "note": "W9 (2026-11-12): the W6 Carrow pair's east shop becomes the strip program's second room — the TERRACE WINE front keeps its deep-red fascia, the bottle wall and the tasting table read through the glass from the terrace walk. Joins the nav lobby law automatically (the lobby seats at the door line, the W8 law)."
  },
  {
    "id": "BOOKS-INT", "building": "KTN-08", "status": "built (W9)",
    "shell": shell(-91.6, -84.4, 8.2, 19.8),
    "plan": [
      {"item": "entrance (S, Kestrel walk)", "x": -88, "z": 8.1, "w": 1.2, "d": 0.5},
      {"item": "window W (S facade)", "x": -90.1, "z": 8.1, "w": 1.8, "d": 0.5},
      {"item": "window E (S facade)", "x": -86.1, "z": 8.1, "w": 1.8, "d": 0.5},
      {"item": "shelf runs (both skins)", "x": [-91.25, -84.75], "z": 13.9, "w": 0.5, "d": 9.0},
      {"item": "center islands (2)", "x": [-88.9, -87.1], "z": [12.2, 15.6], "w": 2.6, "d": 0.45},
      {"item": "counter (E of the door)", "x": -85.6, "z": 9.6, "w": 1.6, "d": 0.8},
      {"item": "reading table (back wall)", "x": -88.3, "z": 18.6, "w": 1.4, "d": 0.9},
      {"item": "aisle", "x": -88, "z": 14, "w": 2.4, "d": 9, "type": "clear zone"}
    ],
    "note": "W9 (2026-11-12): WESTGATE BOOKS's ground floor opens — shelf runs down both skins, two center islands, the counter by the door. The first of the eight W7 Westgate/Eastgate shopfront rooms."
  },
  {
    "id": "HARDWARE-INT", "building": "KTN-09", "status": "built (W9)",
    "shell": shell(-99.6, -92.4, 8.2, 19.8),
    "plan": [
      {"item": "entrance (S, Kestrel walk)", "x": -96, "z": 8.1, "w": 1.2, "d": 0.5},
      {"item": "window W (S facade)", "x": -98.3, "z": 8.1, "w": 1.8, "d": 0.5},
      {"item": "window E (S facade)", "x": -94.1, "z": 8.1, "w": 1.8, "d": 0.5},
      {"item": "tool wall (back, hung)", "x": -96, "z": 19.55, "w": 6.0, "d": 0.1},
      {"item": "workbench (under the tool wall)", "x": -96, "z": 17.6, "w": 3.2, "d": 1.0},
      {"item": "shelf runs (both skins)", "x": [-99.15, -92.85], "z": 13.0, "w": 0.5, "d": 6.0},
      {"item": "paint drums (E of the door)", "x": -93.6, "z": 9.6, "w": 1.4, "d": 1.4},
      {"item": "counter (W of the door)", "x": -95.0, "z": 10.0, "w": 1.6, "d": 0.8},
      {"item": "aisle", "x": -96, "z": 13, "w": 5.0, "d": 8, "type": "clear zone"}
    ],
    "note": "W9 (2026-11-12): GATE HARDWARE's ground floor — the tool wall and workbench at the back, the paint-drum row by the door."
  },
  {
    "id": "NEWS-INT", "building": "KTN-10", "status": "built (W9)",
    "shell": shell(84.4, 91.6, 8.2, 19.8),
    "plan": [
      {"item": "entrance (S, Kestrel walk)", "x": 88, "z": 8.1, "w": 1.2, "d": 0.5},
      {"item": "window W (S facade)", "x": 86.1, "z": 8.1, "w": 1.8, "d": 0.5},
      {"item": "window E (S facade)", "x": 89.9, "z": 8.1, "w": 1.8, "d": 0.5},
      {"item": "magazine wall (back)", "x": 88, "z": 19.5, "w": 5.6, "d": 0.35},
      {"item": "paper stacks (E wall)", "x": 90.6, "z": 10.4, "w": 1.4, "d": 1.2},
      {"item": "counter (W of the door)", "x": 85.8, "z": 9.8, "w": 1.8, "d": 0.8},
      {"item": "center rack", "x": 88.4, "z": 13.2, "w": 2.4, "d": 0.5},
      {"item": "aisle", "x": 88, "z": 14, "w": 5.0, "d": 8, "type": "clear zone"}
    ],
    "note": "W9 (2026-11-12): EASTGATE NEWS's ground floor — the magazine wall, the paper stacks, the center rack."
  },
  {
    "id": "VERBENA-INT", "building": "KTN-11", "status": "built (W9)",
    "shell": shell(92.4, 99.6, 8.2, 19.8),
    "plan": [
      {"item": "entrance (S, Kestrel walk)", "x": 96, "z": 8.1, "w": 1.2, "d": 0.5},
      {"item": "window W (S facade)", "x": 94.1, "z": 8.1, "w": 1.8, "d": 0.5},
      {"item": "window E (S facade)", "x": 97.9, "z": 8.1, "w": 1.8, "d": 0.5},
      {"item": "shelf runs (both skins)", "x": [92.85, 99.15], "z": 13.9, "w": 0.5, "d": 9.0},
      {"item": "planter pair (back wall)", "x": [94.0, 98.0], "z": 19.0, "w": 1.2, "d": 0.9},
      {"item": "counter (W of the door)", "x": 93.6, "z": 10.2, "w": 1.6, "d": 0.8},
      {"item": "aisle", "x": 96, "z": 14, "w": 5.0, "d": 9, "type": "clear zone"}
    ],
    "note": "W9 (2026-11-12): VERBENA BOOKS's ground floor — the bookshop with the herbalist's corner (the planter pair at the back wall)."
  },
  {
    "id": "CORNELIUS-INT", "building": "MRW-01", "status": "built (W9)",
    "shell": shell(-91.6, -84.4, -31.8, -20.2),
    "plan": [
      {"item": "entrance (S, Marlow walk)", "x": -88, "z": -31.9, "w": 1.2, "d": 0.5},
      {"item": "window W (S facade)", "x": -90.1, "z": -31.9, "w": 1.8, "d": 0.5},
      {"item": "window E (S facade)", "x": -86.1, "z": -31.9, "w": 1.8, "d": 0.5},
      {"item": "crate stacks (W skin)", "x": -91.1, "z": -24.0, "w": 0.9, "d": 3.6},
      {"item": "shelf run (back wall)", "x": -88, "z": -20.85, "w": 5.6, "d": 0.5},
      {"item": "counter (E of the door)", "x": -85.4, "z": -22.6, "w": 1.8, "d": 0.8},
      {"item": "barrel pair (front corner)", "x": -90.6, "z": -29.6, "w": 1.3, "d": 1.3},
      {"item": "aisle", "x": -88, "z": -26, "w": 5.0, "d": 9, "type": "clear zone"}
    ],
    "note": "W9 (2026-11-12): CORNELIUS & CO.'s ground floor — Marlow's west general store."
  },
  {
    "id": "WESTGATE-INT", "building": "MRW-02", "status": "built (W9)",
    "shell": shell(-99.6, -92.4, -31.8, -20.2),
    "plan": [
      {"item": "entrance (S, Marlow walk)", "x": -96, "z": -31.9, "w": 1.2, "d": 0.5},
      {"item": "window W (S facade)", "x": -98.3, "z": -31.9, "w": 1.8, "d": 0.5},
      {"item": "window E (S facade)", "x": -94.1, "z": -31.9, "w": 1.8, "d": 0.5},
      {"item": "magazine wall (back)", "x": -96, "z": -20.85, "w": 5.6, "d": 0.35},
      {"item": "counter (E of the door)", "x": -93.4, "z": -23.0, "w": 1.8, "d": 0.8},
      {"item": "paper stacks (W wall)", "x": -98.4, "z": -22.2, "w": 1.4, "d": 1.2},
      {"item": "center rack", "x": -96.4, "z": -27.4, "w": 2.4, "d": 0.5},
      {"item": "aisle", "x": -96, "z": -26, "w": 5.0, "d": 8, "type": "clear zone"}
    ],
    "note": "W9 (2026-11-12): WESTGATE NEWS's ground floor (the Marlow corner) — the magazine wall, the counter, the center rack."
  },
  {
    "id": "PROVISIONS-INT", "building": "MRW-03", "status": "built (W9)",
    "shell": shell(84.4, 91.6, -31.8, -20.2),
    "plan": [
      {"item": "entrance (S, Marlow walk)", "x": 88, "z": -31.9, "w": 1.2, "d": 0.5},
      {"item": "window W (S facade)", "x": 86.1, "z": -31.9, "w": 1.8, "d": 0.5},
      {"item": "window E (S facade)", "x": 89.9, "z": -31.9, "w": 1.8, "d": 0.5},
      {"item": "counter (W of the door)", "x": 85.6, "z": -23.0, "w": 1.8, "d": 0.8},
      {"item": "sack-and-barrel row (E skin)", "x": 90.7, "z": -25.0, "w": 0.9, "d": 4.0},
      {"item": "shelf run (back wall)", "x": 88, "z": -20.85, "w": 5.6, "d": 0.5},
      {"item": "crate stack (SE)", "x": 90.4, "z": -30.2, "w": 2.0, "d": 1.0},
      {"item": "aisle", "x": 88, "z": -26, "w": 5.0, "d": 9, "type": "clear zone"}
    ],
    "note": "W9 (2026-11-12): LARKIN PROVISIONS's ground floor — the chalk A-frame keeps its post on the walk outside."
  },
  {
    "id": "CHEESE-INT", "building": "MRW-04", "status": "built (W9)",
    "shell": shell(92.4, 99.6, -31.8, -20.2),
    "plan": [
      {"item": "entrance (S, Marlow walk)", "x": 96, "z": -31.9, "w": 1.2, "d": 0.5},
      {"item": "window W (S facade)", "x": 94.1, "z": -31.9, "w": 1.8, "d": 0.5},
      {"item": "window E (S facade)", "x": 97.9, "z": -31.9, "w": 1.8, "d": 0.5},
      {"item": "wheel shelf (back wall)", "x": 96, "z": -20.85, "w": 5.6, "d": 0.5},
      {"item": "counter (W of the door)", "x": 93.6, "z": -23.0, "w": 1.8, "d": 0.8},
      {"item": "cold case (E skin)", "x": 99.15, "z": -25.4, "w": 0.5, "d": 3.0},
      {"item": "crate (SE)", "x": 98.2, "z": -30.0, "w": 1.4, "d": 1.0},
      {"item": "aisle", "x": 96, "z": -26, "w": 5.0, "d": 9, "type": "clear zone"}
    ],
    "note": "W9 (2026-11-12): CARROW CHEESE's ground floor — the wheel shelf, the cold case, the counter."
  },
]

ids = {r['id'] for r in doc['interiors']}
for r in ROWS:
    assert r['id'] not in ids, f"duplicate interior id {r['id']}"
    doc['interiors'].append(r)

BUILDING_NOTES = {
  'KTS-04': "WINE-INT (built W9): the wine-shop ground floor behind the Carrow walk facade",
  'KTN-08': "BOOKS-INT (built W9): the bookshop ground floor behind the Westgate walk facade",
  'KTN-09': "HARDWARE-INT (built W9): the hardware-store ground floor behind the Westgate walk facade",
  'KTN-10': "NEWS-INT (built W9): the newsstand ground floor behind the Eastgate walk facade",
  'KTN-11': "VERBENA-INT (built W9): the bookshop ground floor behind the Eastgate walk facade",
  'MRW-01': "CORNELIUS-INT (built W9): the general-store ground floor behind the Marlow walk facade",
  'MRW-02': "WESTGATE-INT (built W9): the newsstand ground floor behind the Marlow walk facade",
  'MRW-03': "PROVISIONS-INT (built W9): the provisions ground floor behind the Marlow walk facade",
  'MRW-04': "CHEESE-INT (built W9): the cheese-shop ground floor behind the Marlow walk facade",
}
for b in doc['buildings']:
    if b['id'] in BUILDING_NOTES:
        b['interior'] = BUILDING_NOTES[b['id']]

out = json.dumps(doc, ensure_ascii=False, indent=1)
if raw.endswith('\n'):
    out += '\n'
io.open(PATH, 'w', encoding='utf-8').write(out)
print(f"OK — {len(ROWS)} interior rows added, {len(BUILDING_NOTES)} building rows updated, interiors total {len(doc['interiors'])}")
