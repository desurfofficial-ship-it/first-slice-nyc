#!/usr/bin/env python3
"""W-N4 — the Linden Hill registry wave (the North Depth data wave).

Appends the north band's rows to docs/data/world-registry.json and amends
the four NS street spans + bounds + the SKY-N skyline card. Self-verifying:
building overlaps, road clearance, block membership, the at-spawn lattice
pricing rule (every band mass bakes into rows 7..9 — dark at spawn) and
the far-row occlusion check (the band hides behind the z 48..64 rows from
the spine's sightline) all check before the file is written. Idempotence:
refuses to run twice (the LNH- prefix already present means the wave
landed).

The A-3 law: this script APPENDS rows; it never edits an existing row
except the four span amendments (the continuation law, north edition —
the W-N0 west edition precedent, recorded in meta.corrections) and the
bounds/ledger fields the wave owns.
"""
import json, math, sys

REG = 'docs/data/world-registry.json'

with open(REG) as f:
    R = json.load(f)

ids = set()
for k in ('streets', 'blocks', 'buildings', 'parks', 'landmarks',
          'intersections', 'crosswalks', 'interiors'):
    for row in R[k]:
        ids.add(row['id'])
if any(i.startswith('LNH-') for i in ids):
    sys.exit('W-N4 already landed (LNH-* rows present) — refusing to double-apply.')

problems = []

# ---------------------------------------------------------------- streets
HAZEL = {'id': 'STR-HAZEL', 'name': 'Hazel Street', 'axis': 'EW',
         'centerline': 72, 'spanX': [-100, 252],
         'road': {'zMin': 68, 'zMax': 76, 'width': 8},
         'walkN': {'zMin': 76, 'zMax': 80},
         'walkS': {'zMin': 64, 'zMax': 68},
         'totalWidth': 16,
         'ways': 'two-way, narrow',
         'character': "the band's south street — the school's front, the tenements' stoops, the green's gate",
         'notes': 'W-N4 (2026-11-14, the North Depth): the north band over Alder Heights and '
                  'the Larch Yards (x -100..+252, z 64..160) — the city\'s second dimension '
                  '(docs/world-building/linden-hill-design.md).'}
MULBERRY = {'id': 'STR-MULBERRY', 'name': 'Mulberry Street', 'axis': 'EW',
            'centerline': 120, 'spanX': [-100, 252],
            'road': {'zMin': 116, 'zMax': 124, 'width': 8},
            'walkN': {'zMin': 124, 'zMax': 128},
            'walkS': {'zMin': 112, 'zMax': 116},
            'totalWidth': 16,
            'ways': 'two-way, narrow',
            'character': "the quiet north street — the green's north half, the holder's fence, the works' dock doors",
            'notes': 'W-N4 (2026-11-14, the North Depth): the band\'s north street.'}

# --------------------------------------------------------------- blocks
def blk(i, x0, x1, z0, z1, note):
    return {'id': f'BLK-LNH-{i}', 'bbox': {'xMin': x0, 'xMax': x1, 'zMin': z0, 'zMax': z1}, 'note': note}

BLOCKS = [
    blk('A', -100, -84, 82, 112, 'the west strip row 1 — LNH-01 (face E to Juniper)'),
    blk('B', -100, -84, 130, 158, 'the west strip row 2 — LNH-02'),
    blk('PK', -60, 60, 80, 112, "the green's south half — PRK-LINDEN (Mulberry crosses between the halves)"),
    blk('PN', -60, 60, 128, 158, "the green's north half — PRK-LINDEN-NORTH"),
    blk('G', 84, 100, 82, 112, 'the Sycamore east strip row 1 — LNH-03 (face W)'),
    blk('H', 84, 100, 130, 158, 'the Sycamore east strip row 2 — LNH-04'),
    blk('I', 100, 146, 82, 112, "the civic row — LNH-05 the school + LNH-06 the reading room (face S to Hazel)"),
    blk('J', 100, 146, 130, 158, "the yards' last works — LNH-07 Osier Timber & Sash + LNH-08 the holder"),
    blk('K', 158, 220, 82, 112, "the yards row 1 east — LNH-09 + LNH-10"),
    blk('L', 158, 220, 130, 158, "the yards row 2 east — LNH-11 + LNH-12"),
    blk('M', 236, 252, 82, 112, 'the Larch east strip row 1 — LNH-13 (face W to Larch)'),
    blk('N', 236, 252, 130, 158, 'the Larch east strip row 2 — LNH-14'),
]

# ------------------------------------------------------------ buildings
def bld(i, name, x, z, w, d, h, face, ex, ez, efaces, style, block, fl):
    return {'id': f'LNH-{i:02d}', 'name': name, 'status': 'built (W-N4)', 'class': 'C',
            'face': face, 'block': f'BLK-LNH-{block}',
            'footprint': {'x': x, 'z': z, 'w': w, 'd': d},
            'height': h, 'floors': fl, 'style': style,
            'entrance': [{'x': ex, 'z': ez, 'faces': efaces}],
            'collider': True}

BUILDINGS = [
    bld(1, 'The Alder Walk-ups', -92, 95, 12, 18, 13, 'Juniper E', -86, 95, 'E',
        'tenement walk-up: warm brick, the fire-escape bay on the avenue face, cornice line',
        'A', 4),
    bld(2, 'The Alder Walk-ups (north)', -92, 145, 12, 18, 15, 'Juniper E', -86, 145, 'E',
        'tenement walk-up: the party-wall twin, its stoop to Juniper, laundry lines behind',
        'B', 5),
    bld(3, 'The Sycamore Walk-ups', 92, 95, 14, 18, 13, 'Sycamore W', 85, 95, 'W',
        'tenement walk-up: the avenue face carries the fire escape and the corner-store awning',
        'G', 4),
    bld(4, 'The Sycamore Walk-ups (north)', 92, 145, 14, 18, 15, 'Sycamore W', 85, 145, 'W',
        'tenement walk-up: the north twin, the rear yard to the green\'s fence',
        'H', 5),
    bld(5, 'The Linden School', 115, 96, 22, 20, 11, 'Hazel S', 115, 86, 'S',
        'the public school: pale brick with a stone base and date-stone (LMK-16),'
        ' tall 12-over-12 windows, the flagpole at the walk line',
        'I', 3),
    bld(6, 'The Linden Reading Room', 136, 96, 16, 18, 9, 'Hazel S', 136, 87, 'S',
        'the branch library: pressed brick, three arched windows on the Hazel face,'
        ' stone sill course, the LINDEN READING ROOM sign over the door',
        'I', 2),
    bld(7, 'Osier Timber & Sash', 114, 146, 24, 18, 8, 'Mulberry S', 108, 137, 'S',
        'the timber yard: shed line with clerestory, the OSIER TIMBER & SASH fascia,'
        ' stacked stock in the yard (the kit dresses it)',
        'J', 2),
    bld(8, 'The Linden Gas Works holder', 136, 146, 18, 18, 20, 'Mulberry S', 136, 137, 'S',
        'the frame gas holder: open iron columns, ring bands, the guide frame — the north'
        ' silhouette\'s beat (LMK-17); ROOF_SKIP (the fabric never dresses it)',
        'J', 1),
    bld(9, 'Mulberry Storage', 179, 96, 34, 20, 12, 'Hazel S', 172, 86, 'S',
        'storage loft: dark brick, loading face south, painted ghost band',
        'K', 4),
    bld(10, 'The Mulberry Loft', 209, 96, 14, 20, 13, 'Hazel S', 209, 86, 'S',
        'loft conversion: window grid reglazed, cornice, roof bulkhead',
        'K', 4),
    bld(11, 'North Storage', 181, 147, 36, 18, 10, 'Mulberry S', 174, 138, 'S',
        'storage shed: corrugated read, dock aprons, the north fence line',
        'L', 2),
    bld(12, 'The Holder Walk-ups', 209, 147, 14, 18, 15, 'Mulberry S', 209, 138, 'S',
        'tenement walk-up: the holder\'s neighbor — fire escape on the court face',
        'L', 5),
    bld(13, 'Larch North Walk-up', 244, 96, 12, 18, 13, 'Larch W', 238, 96, 'W',
        'walk-up: the east row\'s north end, stoop to Larch',
        'M', 4),
    bld(14, 'Larch North Storage', 244, 147, 12, 18, 12, 'Larch W', 238, 147, 'W',
        'storage row: the world\'s northeast corner, quiet brick',
        'N', 3),
]

# ---------------------------------------------------------------- parks
PARK = {'id': 'PRK-LINDEN', 'name': 'Linden Green', 'status': 'built (W-N4)',
        'bbox': {'xMin': -60, 'xMax': 60, 'zMin': 80, 'zMax': 112},
        'layout': {
            'lawn': {'xMin': -52, 'xMax': 52, 'zMin': 86, 'zMax': 106},
            'paths': [{'from': [0, 82], 'to': [0, 110], 'width': 2.2},
                      {'from': [-52, 96], 'to': [52, 96], 'width': 1.8}],
            'gates': [{'x': 0, 'z': 80, 'type': 'Hazel St gate'},
                      {'x': -60, 'z': 96, 'type': 'Juniper Ave gate'},
                      {'x': 60, 'z': 96, 'type': 'Sycamore Ave gate'}],
            'playground': {'x': -44, 'z': 98, 'note': 'swing set + sandbox (the house makers), SW corner'},
            'benches': [{'x': -14, 'z': 102}, {'x': 14, 'z': 102}, {'x': -30, 'z': 90},
                        {'x': 30, 'z': 90}, {'x': 0, 'z': 92}]},
        'notes': 'W-N4 (2026-11-14, the North Depth): the district\'s lungs, south half —'
                 ' the playground SW, the lawn and the cross paths. Mulberry crosses between'
                 ' the halves; the crossings splice the paths. The instanced canopy owns its trees.'}
PARK_N = {'id': 'PRK-LINDEN-NORTH', 'name': 'Linden Green (north)', 'status': 'built (W-N4)',
          'bbox': {'xMin': -60, 'xMax': 60, 'zMin': 128, 'zMax': 158},
          'layout': {
              'lawn': {'xMin': -52, 'xMax': 52, 'zMin': 134, 'zMax': 152},
              'paths': [{'from': [0, 130], 'to': [0, 156], 'width': 2.2},
                        {'from': [-52, 143], 'to': [52, 143], 'width': 1.8}],
              'gates': [{'x': 0, 'z': 128, 'type': 'Mulberry St gate'},
                        {'x': -60, 'z': 143, 'type': 'Juniper Ave gate'},
                        {'x': 60, 'z': 143, 'type': 'Sycamore Ave gate'}],
              'parkHouse': {'x': 40, 'z': 146, 'note': 'the green shed with its tool wall, NE corner'},
              'benches': [{'x': -14, 'z': 148}, {'x': 14, 'z': 148}, {'x': -30, 'z': 138},
                          {'x': 30, 'z': 138}]},
          'notes': 'W-N4 (2026-11-14, the North Depth): the green\'s north half — the park'
                   ' house NE, the quiet lawn. The two halves read as one park Mulberry'
                   ' crosses.'}

# ------------------------------------------------------------ landmarks
LMK16 = {'id': 'LMK-16', 'name': "The Linden School's stone", 'anchor': 'LNH-05',
         'reason': "the date-stone and flagpole over the Hazel entrance — the north's civic beat, "
                   "the flag the band reads its weather by"}
LMK17 = {'id': 'LMK-17', 'name': 'The gas holder', 'anchor': 'LNH-08',
         'reason': "the frame tank on the yards' north rows — the north silhouette's signature, "
                   "the iron landmark the spine reads above the far rows"}

# -------------------------------------------------------- intersections
INTERSECTIONS = [
    {'id': 'IX-HZJ', 'streets': ['STR-HAZEL', 'STR-JUNIPER'], 'x': -72, 'z': 72, 'cornerBuildings': []},
    {'id': 'IX-HZS', 'streets': ['STR-HAZEL', 'STR-SYCAMORE'], 'x': 72, 'z': 72, 'cornerBuildings': []},
    {'id': 'IX-HZP', 'streets': ['STR-HAZEL', 'STR-SPUR'], 'x': 152, 'z': 72, 'cornerBuildings': []},
    {'id': 'IX-HZL', 'streets': ['STR-HAZEL', 'STR-LARCH'], 'x': 228, 'z': 72, 'cornerBuildings': []},
    {'id': 'IX-MBJ', 'streets': ['STR-MULBERRY', 'STR-JUNIPER'], 'x': -72, 'z': 120, 'cornerBuildings': []},
    {'id': 'IX-MBS', 'streets': ['STR-MULBERRY', 'STR-SYCAMORE'], 'x': 72, 'z': 120, 'cornerBuildings': []},
    {'id': 'IX-MBP', 'streets': ['STR-MULBERRY', 'STR-SPUR'], 'x': 152, 'z': 120, 'cornerBuildings': []},
    {'id': 'IX-MLL', 'streets': ['STR-MULBERRY', 'STR-LARCH'], 'x': 228, 'z': 120, 'cornerBuildings': []},
]

# ----------------------------------------------------------- crosswalks
# four rows per corner, the GJ/GS pattern: E/W legs across the E-W street
# (inside the avenue's road band), N/S legs across the avenue (at the E-W
# road's edges ± 0.5).
CROSSWALKS = []
for tag, xc, zc in [('HZJ', -72, 72), ('HZS', 72, 72), ('HZP', 152, 72), ('HZL', 228, 72),
                    ('MBJ', -72, 120), ('MBS', 72, 120), ('MBP', 152, 120), ('MLL', 228, 120)]:
    CROSSWALKS.append({'id': f'XW-LNH-{tag}-E', 'x': xc + 3.5, 'z': zc, 'w': 3.4, 'axis': 'EW',
                       'note': f'{tag}, east leg (across the E-W street)'})
    CROSSWALKS.append({'id': f'XW-LNH-{tag}-W', 'x': xc - 3.5, 'z': zc, 'w': 3.4, 'axis': 'EW',
                       'note': f'{tag}, west leg (across the E-W street)'})
    CROSSWALKS.append({'id': f'XW-LNH-{tag}-N', 'x': xc, 'z': zc + 4.5, 'w': 3.4, 'axis': 'NS',
                       'note': f'{tag}, north leg (across the avenue)'})
    CROSSWALKS.append({'id': f'XW-LNH-{tag}-S', 'x': xc, 'z': zc - 4.5, 'w': 3.4, 'axis': 'NS',
                       'note': f'{tag}, south leg (across the avenue)'})

# ------------------------------------------------------- span amendments
SPAN_NOTES = {
    'STR-JUNIPER': 'W-N4 (2026-11-14, the North Depth): spanZ north end +64 -> +160 — Juniper '
                   'continues into Linden Hill (butt-jointed slabs, same levels; the '
                   'continuation law, north edition). The local avenue\'s north reach.',
    'STR-SYCAMORE': 'W-N4 (2026-11-14, the North Depth): spanZ north end +64 -> +160 — Sycamore '
                    'continues into Linden Hill (the continuation law, north edition).',
    'STR-SPUR': 'W-N4 (2026-11-14, the North Depth): spanZ north end +64 -> +160 — the spur bed '
                'continues under the viaduct\'s north reach (the continuation law, north edition).',
    'STR-LARCH': 'W-N4 (2026-11-14, the North Depth): spanZ north end +64 -> +160 — Larch Street '
                 'continues into Linden Hill (the continuation law, north edition).',
}

# ============================================================== checks ==
fp = {b['id']: dict(b['footprint'], height=b['height']) for b in BUILDINGS}

def overlap(a, b):
    ax, az, aw, ad = fp[a]['x'], fp[a]['z'], fp[a]['w'], fp[a]['d']
    bx, bz, bw, bd = fp[b]['x'], fp[b]['z'], fp[b]['w'], fp[b]['d']
    return (abs(ax - bx) < (aw + bw) / 2) and (abs(az - bz) < (ad + bd) / 2)

for i in range(len(BUILDINGS)):
    for j in range(i + 1, len(BUILDINGS)):
        a, b = BUILDINGS[i]['id'], BUILDINGS[j]['id']
        if overlap(a, b):
            problems.append(f'OVERLAP {a} <-> {b}')

# roads' clearance: no footprint inside an avenue corridor or a new road band
NS_CORRIDORS = [(-84, -60), (60, 84), (146, 158), (220, 236)]   # the avenues' full widths
EW_ROADS = [(68, 76), (116, 124)]                                # Hazel/Mulberry roads
for bid, f in fp.items():
    x0, x1 = f['x'] - f['w'] / 2, f['x'] + f['w'] / 2
    z0, z1 = f['z'] - f['d'] / 2, f['z'] + f['d'] / 2
    for rx0, rx1 in NS_CORRIDORS:
        if x1 > rx0 and x0 < rx1:
            problems.append(f'ROAD-CLASH {bid} inside avenue corridor x {rx0}..{rx1}')
    for rz0, rz1 in EW_ROADS:
        if z1 > rz0 and z0 < rz1:
            problems.append(f'ROAD-CLASH {bid} inside E-W road band z {rz0}..{rz1}')
    # block membership
    for bl in BLOCKS:
        bb = bl['bbox']
        if x0 >= bb['xMin'] and x1 <= bb['xMax'] and z0 >= bb['zMin'] and z1 <= bb['zMax']:
            break
    else:
        problems.append(f'BLOCK-MISS {bid} outside every block bbox')

# block bboxes are disjoint
for i in range(len(BLOCKS)):
    for j in range(i + 1, len(BLOCKS)):
        a, b = BLOCKS[i]['bbox'], BLOCKS[j]['bbox']
        if a['xMin'] < b['xMax'] and b['xMin'] < a['xMax'] and a['zMin'] < b['zMax'] and b['zMin'] < a['zMax']:
            problems.append(f"BLOCK-OVERLAP {BLOCKS[i]['id']} <-> {BLOCKS[j]['id']}")

# parks sit clear of every road band
for pk in (PARK, PARK_N):
    bb = pk['bbox']
    for rz0, rz1 in EW_ROADS:
        if bb['zMax'] > rz0 and bb['zMin'] < rz1:
            problems.append(f"PARK-ROAD {pk['id']} crosses E-W road z {rz0}..{rz1}")
    for rx0, rx1 in NS_CORRIDORS:
        if bb['xMax'] > rx0 and bb['xMin'] < rx1:
            problems.append(f"PARK-ROAD {pk['id']} crosses avenue corridor x {rx0}..{rx1}")

# the at-spawn pricing rule: every mass bakes into rows 7..9 (the new
# lattice: row = floor((z + 144) / 32), rows 7..9 = z 80..176 — dark at
# spawn; the wave's own law, the W-N0 pricing precedent)
for bid, f in fp.items():
    row = math.floor((f['z'] + 144) / 32)
    if row < 7 or row > 9:
        problems.append(f'SPAWN-PRICE {bid} bakes into row {row} (want 7..9)')

# the far-row occlusion check: from the spine's eye (1.7 m at z 0), every
# mass top hides behind the far-north rows (h 9 at z 52 — the shipped
# walk-up band). slope_far = (9 - 1.7) / 52.
slope_far = (9.0 - 1.7) / 52.0
for bid, f in fp.items():
    near_z = f['z'] - f['d'] / 2                       # the mass's near-top corner
    slope = (f['height'] - 1.7) / max(near_z, 1)
    if slope >= slope_far:
        problems.append(f'OCCLUSION {bid} pokes above the far rows from the spine '
                        f'(slope {slope:.3f} >= {slope_far:.3f}) — trim the height or push it north')

if problems:
    print('W-N4 SELF-CHECK FAILED:')
    for p in problems:
        print('  -', p)
    sys.exit(1)

# ================================================================ apply ==
R['streets'].extend([HAZEL, MULBERRY])
R['blocks'].extend(BLOCKS)
R['buildings'].extend(BUILDINGS)
R['parks'].extend([PARK, PARK_N])
R['landmarks'].extend([LMK16, LMK17])
R['intersections'].extend(INTERSECTIONS)
R['crosswalks'].extend(CROSSWALKS)

for st in R['streets']:
    if st['id'] in SPAN_NOTES:
        st['spanZ'] = [-64, 160]
        st.setdefault('notes', '')
        st['notes'] = (st['notes'] + ' ' if st['notes'] else '') + SPAN_NOTES[st['id']]

# bounds: the world's north face grows (the band's own note rides zMax)
R['bounds']['world']['zMax'] = 176
R['bounds']['world']['note'] += ' W-N4 (2026-11-14, the North Depth): zMax +64 -> +176 — Linden Hill (x -100..+252, z 64..160) is real rows now (the master build directive).'
R['bounds']['playableCore']['zMax'] = 160
R['bounds']['playableCore']['note'] += ' W-N4 (2026-11-14, the North Depth): grown north to z +160 — the band over Alder Heights and the Larch Yards is real rows now.'
for card in R['bounds']['skylineCards']:
    if card['id'] == 'SKY-N':
        card['line'] = 'z = 170 card row'
        card['role'] = ('north backdrop, fog-exempt (moved z 90 -> 170 in W-N4: the band took the '
                        'old ground; the skyline fabric keeps its clearance above the new wall)')

R['meta']['corrections'].append(
    'W-N4 (2026-11-14, the North Depth): the north band over Alder Heights and the Larch Yards '
    '(x -100..+252, z 64..160) is real rows — two EW streets (Hazel, Mulberry), four NS span '
    'amendments (Juniper/Sycamore/Spur/Larch north ends +64 -> +160, the continuation law north '
    'edition — the W-N0 west edition precedent), twelve blocks, fourteen LNH-* masses (shells '
    'only — the W-C1 scope law), PRK-LINDEN + PRK-LINDEN-NORTH the green (Mulberry crosses '
    'between the halves), LMK-16 the school\'s stone, LMK-17 the gas holder, eight '
    'intersections, thirty-two crosswalks (four per corner — the GJ/GS pattern). Bounds grow '
    '(world zMax 176, playableCore zMax 160, SKY-N z 170). Geometry is the W-N5/W-N6 waves; '
    'the lattice pricing law (every band mass bakes into rows 7..9 — dark at spawn) and the '
    'far-row occlusion check are data-checked here. See docs/world-building/linden-hill-design.md.')

R['constructionPhases'].append({
    'id': 'WN4',
    'name': 'The North Depth — the Linden Hill data wave',
    'content': "The 2026-11-14 master build directive's next major expansion: the city's second "
               "dimension. Two EW streets (Hazel, Mulberry), the four NS avenues' north ends "
               "(the continuation law, north edition), twelve blocks, fourteen LNH-* masses "
               "(shells only), the green in two halves, LMK-16/17, eight intersections, "
               "thirty-two crosswalks. Bounds grow north (world zMax 176, playableCore zMax "
               "160, SKY-N z 170). Geometry is the W-N5/W-N6 waves; the spawn-pricing law "
               "(masses in rows 7..9) and the far-row occlusion check are data-checked here. "
               "See docs/world-building/linden-hill-design.md."
})

with open(REG, 'w') as f:
    json.dump(R, f, indent=1, ensure_ascii=False)
    f.write('\n')

print('W-N4 applied:')
print('  streets +2 (Hazel, Mulberry), span amendments +4 (Juniper/Sycamore/Spur/Larch)')
print('  blocks +12, buildings +14 (LNH-01..14), parks +2 (the green in two halves), landmarks +2 (LMK-16/17)')
print('  intersections +8, crosswalks +32')
print('  bounds: world zMax 176, playableCore zMax 160, SKY-N z 170')
