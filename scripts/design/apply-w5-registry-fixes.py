#!/usr/bin/env python3
"""Re-apply the W5 registry fixes onto the post-merge registry.

The concurrent agent2 merge (Times Square / subway / half-court, 87599e4)
restructured world-registry.json from the committed base — my three data
fixes and the interiors[].anchors contract were uncommitted at the time
and are not in their version. This script reapplies them (docs/47 W5):
CECIL-ROOM to the north strip, BAKERY-INT mirrored to the storefront,
RECORD-INT's entrance moved to meet its shipped counter, and anchors[]
for the nine W5 rooms. MEZZ-INT / MEZZ-TS (agent2's built slices) stay
untouched.
"""
import json

P = 'docs/data/world-registry.json'
r = json.load(open(P, encoding='utf-8'))
its = {i['id']: i for i in r['interiors']}

# ---- CECIL-ROOM: the north-strip re-lay (docs/41 §1 law 2) ----------------
c = its['CECIL-ROOM']
c['shell']['zMin'] = -14.1
c['shell']['zMax'] = -9.1
c['note'] = ("W5 re-lay per docs/41 §1 law 2 (the door matches the shipped "
  "entrance): the shipped top landing is cantilevered off KTS-02's NORTH "
  "face (z −7.3, top y 8.35) — the first draft's south-half shell was 6.2 m "
  "of solid mass away from its own fire-escape door and its street window "
  "faced the rear yards, not the gold window. The room now abuts the "
  "landing; the gold-window sight-line (the game's oldest promise) reads "
  "north across Kestrel from the bed.")
c['plan'] = [
  {"item": "fire-escape door (N wall, opens onto Landing_2)", "x": 13.0, "z": -8.55, "w": 0.9, "d": 1.1},
  {"item": "window (N wall, street view + gold window sight-line)", "x": 14.9, "z": -8.55, "w": 1.2},
  {"item": "bed (NW, head at the window wall — the sight-line from the pillow)", "x": 14.6, "z": -10.6, "w": 1.4, "d": 2},
  {"item": "kitchenette (W wall)", "x": 10.5, "z": -11.5, "w": 0.6, "d": 2},
  {"item": "bath (SE, 1.6×2)", "x": 15.0, "z": -13.1, "w": 1.6, "d": 2},
  {"item": "roof hatch (reserved, stage-5 rooftop)", "x": 12.2, "z": -12.0, "w": 0.9, "d": 0.9},
  {"item": "the Map's corkboard (by the door)", "x": 11.2, "z": -9.35},
]
c['anchors'] = [
  {"id": "window_gaze", "x": 14.9, "z": -10.4, "y": 8.35, "note": "one quiet look out — the reserved beat, adopted W5"},
  {"id": "corkboard", "x": 11.2, "z": -9.9, "y": 8.35},
]

# ---- BAKERY-INT: mirror to the shipped S storefront -----------------------
b = its['BAKERY-INT']
b['note'] = ("W5 orientation fix per docs/41 §1 law 2: the shipped storefront "
  "(the bagel-silhouette window, the MARLOW BAKERY sign) faces SOUTH "
  "(z −32, Marlow walk); the first draft's plan put the entrance on the "
  "yard side. Mirrored to the street.")
for item in b['plan']:
    if item['item'].startswith('entrance'):
        item['x'], item['z'], item['item'] = -34, -31.8, "entrance (S, Marlow storefront)"
    elif item['item'].startswith('service counter'):
        item['x'], item['z'], item['item'] = -34, -30.4, "service counter + case (just inside)"
    elif item['item'].startswith('deck oven'):
        item['x'], item['z'], item['item'] = -34, -22.2, "deck oven + racks (rear)"
    elif item['item'].startswith('two-top'):
        item['z'] = -27.4
b['anchors'] = [
  {"id": "bakery_counter", "x": -34.0, "z": -29.9, "y": 1.05, "note": "the morning anchor (W5)"},
]

# ---- RECORD-INT: entrance to the storefront -------------------------------
d = its['RECORD-INT']
d['note'] = ("W5 entrance fix per docs/41 §1 law 2: the shipped B-SIDE "
  "RECORDS storefront faces SOUTH (z −32); the counter and listening "
  "corner already sat at the south end — only the entrance moved to meet "
  "them.")
for item in d['plan']:
    if item['item'].startswith('entrance'):
        item['x'], item['z'], item['item'] = -25, -31.8, "entrance (S, Marlow storefront)"
d['anchors'] = [
  {"id": "listening", "x": -26.4, "z": -30.0, "y": 0.5, "note": "the Happy-Accident shop — getting lost is finding somewhere (W5)"},
  {"id": "record_counter", "x": -23.4, "z": -30.1, "y": 1.0, "note": "the used bin"},
]

# ---- the rest of the anchors contract -------------------------------------
rest = {
  'BODEGA-INT': [
    {"id": "counter", "x": -18.5, "z": 13.5, "y": 0.5, "note": "shipped (Day-1 order)"},
    {"id": "cat_spot", "x": -18.9, "z": 16.2},
  ],
  'LAUNDRY-INT': [
    {"id": "sal", "x": -7.0, "z": 7.3, "y": 1.05, "facade": True, "note": "shipped bay mouth — the story anchor, position honoured (facade: the room arranges itself around it, docs/41 §1)"},
    {"id": "dryer", "x": -0.9, "z": 12.2, "y": 0.9, "note": "dry-and-fold, the wash's second beat (W5)"},
  ],
  'BARBER-INT': [
    {"id": "chair", "x": 35.9, "z": 11.0, "y": 0.9, "note": "the trim moves from a facade prompt to a chair you sit in (W5)"},
  ],
  'PIZZA-INT': [
    {"id": "slice_counter", "x": 27.0, "z": 9.7, "y": 1.1, "note": "the dollar slice, a standing order (W5)"},
  ],
  'DINER-INT': [
    {"id": "counter_seat", "x": 58.2, "z": -11.0, "y": 0.65, "note": "counter coffee, regulars' dialogue (W5)"},
    {"id": "booth", "x": 52.6, "z": -14.0, "y": 0.5, "note": "sit a while, the group beats"},
    {"id": "pie_case", "x": 57.0, "z": -18.4, "y": 1.0, "note": "order like a local — the teach"},
  ],
  'HALL-INT': [
    {"id": "notice_wall", "x": -55.0, "z": 20.9, "y": 1.5, "note": "the bulletin board's big sibling — day-keyed (W5)"},
    {"id": "workshop", "x": -54.0, "z": 29.5, "y": 1.0, "note": "the workshop table, craft beats"},
  ],
}
for iid, anchors in rest.items():
    its[iid]['anchors'] = anchors

# rebuild the interiors list in original order
r['interiors'] = [its[i['id']] for i in r['interiors']]
json.dump(r, open(P, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
open(P, 'a', encoding='utf-8').write('\n')
print('fixes reapplied:', ', '.join(sorted(rest.keys())), '+ CECIL/BAKERY/RECORD')
