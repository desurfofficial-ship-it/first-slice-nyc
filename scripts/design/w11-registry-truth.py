#!/usr/bin/env python3
"""W11 — the registry-truth wave.

The eight W5 rooms shipped (World.ts buildW5* + the sand3d dressing batch
2026-11-07 + docs/production/interiors/00-INVENTORY.md records all nine as
enterable in play) but their registry rows still read 'planned'. The
registry is the single source of truth — this wave repairs it:

  1. LAUNDRY/BARBER/PIZZA/DINER/BAKERY/RECORD/HALL-INT + CECIL-ROOM:
     status 'planned' → 'built (W5)', each with a one-line evidence note.
  2. openDecisions: the pizza scope call closes (shipped as a full W5
     room); the MEZZ/CORNERHOUSE line rewords to current truth.
  3. constructionPhases: the W8/W9 phase rows (shipped 2026-11-12) join
     the ledger between W7 and W10.
  4. meta.corrections gains the W11 line.

Append-only discipline: no id is renamed, no row is renumbered, no
footprint/plan/shell/anchor value is touched.
"""
import json, io, sys

PATH = 'docs/data/world-registry.json'
raw = open(PATH, encoding='utf-8').read()
doc = json.loads(raw)

W11_NOTE = {
    'LAUNDRY-INT': "Built in W5 (buildW5Laundry: the shipped open bay, the mass hollowed behind it — six washers, four dryers, Sal's counter, the alcove); dressed by the sand3d interiors batch (2026-11-07, interiorAssets.ts). W11 (2026-11-13): status repaired from 'planned (bay exists)' — the room has been enterable since it shipped (probe-w5-interiors walk-in).",
    'BARBER-INT': "Built in W5 (buildW5Barber: the door gap, two chairs facing the mirror wall, counters, waiting bench, powder room); dressed by the sand3d interiors batch (2026-11-07). W11 (2026-11-13): status repaired from 'planned' — enterable since it shipped (Deon's chair, Tue–Sat 9:00–19:00).",
    'PIZZA-INT': "Built in W5 (buildW5Pizza: the slice counter at the S window, the deck oven NE, two booths W, the drink wall E); dressed by the sand3d interiors batch (2026-11-07). W11 (2026-11-13): status repaired from 'planned' — the scope call the openDecision asked about was answered by shipping (Eddie/Kev, 11:00–23:00).",
    'DINER-INT': "Built in W5 (buildW5Diner: the corner entrance, the 8-stool counter bar, the kitchen line behind it, four booths W, register + pie case); dressed by the sand3d interiors batch (2026-11-07). W11 (2026-11-13): status repaired from 'planned' — enterable since it shipped (two doors, both open gaps).",
    'BAKERY-INT': "Built in W5 (buildW5Bakery: the S Marlow-storefront entrance per the docs/41 §1 law 2 mirror, counter + case just inside, deck oven + racks rear, two two-tops); dressed by the sand3d interiors batch (2026-11-07). W11 (2026-11-13): status repaired from 'planned' — enterable through the Marlow storefront door.",
    'RECORD-INT': "Built in W5 (buildW5Records: the S B-SIDE RECORDS entrance, three crate rows, the listening corner, the counter); dressed by the sand3d interiors batch (2026-11-07). W11 (2026-11-13): status repaired from 'planned' — enterable since it shipped (the Week-3 'back soon' sign room).",
    'HALL-INT': "Built in W5 (buildW5Hall: the Juniper W-face entrance and the Gable secondary door, both open gaps; the folding-chair main hall, the workshop room N, the kitchenette NE, the notice wall S); dressed by the sand3d interiors batch (2026-11-07). W11 (2026-11-13): status repaired from 'planned' — enterable since it shipped.",
    'CECIL-ROOM': None,  # keeps its W5 re-lay note; status flips only
}

flips = 0
for it in doc['interiors']:
    if it['id'] in W11_NOTE:
        assert 'planned' in it['status'], f"{it['id']}: expected a planned status, found {it['status']!r}"
        it['status'] = 'built (W5)'
        note = W11_NOTE[it['id']]
        if note:
            it['note'] = note
        flips += 1
assert flips == 8, f"expected 8 status flips, made {flips}"

# 2. openDecisions — close what the build answered, reword the stale one.
dec = doc.get('openDecisions', [])
pizza = [d for d in dec if 'PIZZA-INT' in d]
mezz = [d for d in dec if 'MEZZ-INT' in d]
assert len(pizza) == 1 and len(mezz) == 1, f"openDecision drift: pizza={len(pizza)} mezz={len(mezz)}"
dec.remove(pizza[0])
dec[dec.index(mezz[0])] = ("CORNERHOUSE-INT remains an optional slice (MEZZ-INT shipped in docs/50) — "
                           "confirm before scheduling a wave that would build it.")
doc['openDecisions'] = dec

# 3. constructionPhases — W8/W9 shipped 2026-11-12 but never joined the ledger.
phases = doc['constructionPhases']
ph_ids = [p['id'] for p in phases]
assert 'W8' not in ph_ids and 'W9' not in ph_ids, 'W8/W9 rows already present'
i10 = ph_ids.index('W10')
phases[i10:i10] = [
    {
        'id': 'W8',
        'name': 'The walkability wave',
        'content': "The two Kestrel walks open end to end (SUB-01 stair slot re-faced z 4.45→5.55, SUB-02 held to the building line, three corridor props moved honestly aside); FRUIT-INT — the W5 pattern's first strip-row room (TEN-02's ground floor, a real cavity); the honest ledger: sills + lintels on all 28 W6/W7 rows (104 → 310 pairs), tree-species variety (copper elm + dark pine, position-hash rolled), the alpha-tested shed canvas filigree.",
        'unlocks': 'the Kestrel sidewalks carry a capsule; the strip rows begin to open',
    },
    {
        'id': 'W9',
        'name': "The strip rows' interiors",
        'content': "The W6 Carrow pair's second shop (WINE-INT) and the eight W7 Westgate/Eastgate shopfronts (BOOKS, HARDWARE, NEWS ×2, VERBENA, CORNELIUS, WESTGATE, PROVISIONS, CHEESE) carved enterable by the shared carveStripRow decomposition — the mass ducks above the 3.2 clear height, three blind sides wall, the street facade opens on the registry door gap; footprints never move (the nav lanes, door nodes and bake districts read them unchanged).",
        'unlocks': 'every shipped shopfront is a walk-in room',
    },
]

# 4. meta.corrections — the W11 line.
doc['meta'].setdefault('corrections', []).append(
    "W11 (2026-11-13): the registry-truth repair — the eight W5 rooms' statuses flip "
    "'planned' → 'built (W5)'; they shipped in W5 (World.ts buildW5*), were dressed by the "
    "sand3d batch (2026-11-07), and docs/production/interiors/00-INVENTORY.md records all "
    "nine as enterable in play — the statuses never flipped. The pizza openDecision closes "
    "(shipped as a full W5 room), the MEZZ/CORNERHOUSE decision rewords to current truth, "
    "and the shipped W8/W9 phase rows join the ledger. No id, footprint, shell, plan or "
    "anchor value moved."
)

out = json.dumps(doc, ensure_ascii=False, indent=1) + '\n'
with io.open(PATH, 'w', encoding='utf-8') as f:
    f.write(out)
print(f"W11 registry-truth: {flips} statuses flipped, 1 openDecision closed, 1 reworded, "
      f"{len(phases)} phase rows (W8/W9 inserted), corrections now {len(doc['meta']['corrections'])}")
