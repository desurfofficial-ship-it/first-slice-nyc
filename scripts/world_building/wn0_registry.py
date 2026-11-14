#!/usr/bin/env python3
"""W-N0 — the Willow Rows registry wave (the West Reach data wave).

Appends the west corridor's rows to docs/data/world-registry.json and
amends the three EW street spans + bounds + the SKY-W skyline card.
Self-verifying: building overlaps, NS road clearance, block membership,
and the at-spawn lattice pricing rule (masses west of x -176) all check
before the file is written. Idempotence: refuses to run twice (the
WLR- prefix already present means the wave landed).

The A-3 law: this script APPENDS rows; it never edits an existing row
except the three span amendments (the continuation law, west edition —
the W-C5 amendment precedent, recorded in meta.corrections) and the
bounds/ledger fields the wave owns.
"""
import json, sys

REG = 'docs/data/world-registry.json'

with open(REG) as f:
    R = json.load(f)

ids = set()
for k in ('streets', 'blocks', 'buildings', 'parks', 'landmarks',
          'intersections', 'crosswalks', 'interiors'):
    for row in R[k]:
        ids.add(row['id'])
if any(i.startswith('WLR-') for i in ids):
    sys.exit('W-N0 already landed (WLR-* rows present) — refusing to double-apply.')
if any(i.startswith('STR-WILLOW') or i.startswith('STR-CHESTNUT') for i in ids):
    sys.exit('W-N0 already landed (west streets present) — refusing to double-apply.')

problems = []

# ---------------------------------------------------------------- streets
WILLOW = {'id': 'STR-WILLOW', 'name': 'Willow Street', 'axis': 'NS',
          'centerline': -232, 'spanZ': [-64, 64],
          'road': {'xMin': -236, 'xMax': -228, 'width': 8},
          'walkW': {'xMin': -240, 'xMax': -236},
          'walkE': {'xMin': -228, 'xMax': -224},
          'totalWidth': 16,
          'ways': 'two-way, narrow',
          'character': 'the tenement avenue — walk-ups, the Willow Theater corner, the print works',
          'notes': 'W-N0 (2026-11-14, the West Reach): the corridor\'s west avenue. '
                   'The K line does not run here — the subway stays on its own z 12..20 tunnel band '
                   '(the zone table\'s tunnel span already covers the corridor).'}
CHESTNUT = {'id': 'STR-CHESTNUT', 'name': 'Chestnut Street', 'axis': 'NS',
            'centerline': -148, 'spanZ': [-64, 64],
            'road': {'xMin': -152, 'xMax': -144, 'width': 8},
            'walkW': {'xMin': -156, 'xMax': -152},
            'walkE': {'xMin': -144, 'xMax': -140},
            'totalWidth': 16,
            'ways': 'two-way, narrow',
            'character': 'the garden\'s street — the Chestnut Garden\'s east edge, quiet',
            'notes': 'W-N0 (2026-11-14, the West Reach): the corridor\'s east avenue, the garden\'s front.'}

# --------------------------------------------------------------- blocks
BLOCKS = [
    {'id': 'BLK-WLR-A', 'bbox': {'xMin': -278, 'xMax': -244, 'zMin': 8, 'zMax': 32},
     'note': 'the Willow Rows north block A (x -278..-244) — the print works + the Ivy walk-ups'},
    {'id': 'BLK-WLR-B', 'bbox': {'xMin': -224, 'xMax': -160, 'zMin': 8, 'zMax': 32},
     'note': 'the Willow Rows north block B — the Willow Theater, the supply house, the Chestnut Lofts'},
    {'id': 'BLK-WLR-C', 'bbox': {'xMin': -136, 'xMax': -104, 'zMin': 8, 'zMax': 32},
     'note': 'the Willow Rows north block C — the Chestnut Garden (the breath between the rows and Alder Heights)'},
    {'id': 'BLK-WLR-D', 'bbox': {'xMin': -278, 'xMax': -244, 'zMin': -32, 'zMax': -8},
     'note': 'the Willow Rows south block D — the Kestrel Diner row + Willow Court walk-ups'},
    {'id': 'BLK-WLR-E', 'bbox': {'xMin': -224, 'xMax': -160, 'zMin': -32, 'zMax': -8},
     'note': 'the Willow Rows south block E — the Bijou, the cabinet works, the Column Yard'},
    {'id': 'BLK-WLR-F', 'bbox': {'xMin': -136, 'xMax': -104, 'zMin': -32, 'zMax': -8},
     'note': 'the Willow Rows south block F — the garden\'s shed row (the cheap column band, the design doc §5)'},
    {'id': 'BLK-WLR-FARN', 'bbox': {'xMin': -274, 'xMax': -150, 'zMin': 52, 'zMax': 62},
     'note': 'the Willow Rows far-north strip (z 52..62) — low walk-ups on the Gable west continuation'},
    {'id': 'BLK-WLR-FARS', 'bbox': {'xMin': -274, 'xMax': -150, 'zMin': -62, 'zMax': -52},
     'note': 'the Willow Rows far-south strip (z -62..-52) — low works rows on the Marlow west continuation'},
]

def B(id_, name, block, x, z, w, d, h, fl, style, face='Kestrel S', doorx=None, doorz=None, doorface='S'):
    ent = [] if doorx is None else [{'x': doorx, 'z': doorz, 'faces': doorface}]
    return {'id': id_, 'name': name, 'status': 'built (W-N0)', 'class': 'C', 'face': face,
            'block': block, 'footprint': {'x': x, 'z': z, 'w': w, 'd': d},
            'height': h, 'floors': fl, 'style': style, 'entrance': ent, 'collider': True}

BUILDINGS = [
    B('WLR-01', 'Ansel & Sons Print Works', 'BLK-WLR-A', -265, 20, 22, 20, 13, 4,
      'print-works loft: warm brick, painted tin cornice, the ANSEL & SONS ghost sign on the west gable (LMK-15)',
      doorx=-265, doorz=10),
    B('WLR-02', 'The Ivy Walk-ups', 'BLK-WLR-A', -248, 20, 8, 18, 16, 5,
      'tenement walk-up pair: dark brick, fire-escape bay, sills and lintels', doorx=-248, doorz=11),
    B('WLR-03', 'The Willow Theater', 'BLK-WLR-B', -212, 20, 24, 20, 14, 3,
      'the neighborhood house: cream brick, the THE WILLOW marquee on the Kestrel face (LMK-14), poster cases, forecourt benches',
      doorx=-212, doorz=10),
    B('WLR-04', 'Hawthorne & Varn Supply', 'BLK-WLR-B', -186, 20, 20, 18, 11, 2,
      'supply house: painted fascia band, wide shopfront, horse-walk lintel', doorx=-186, doorz=11),
    B('WLR-05', 'The Chestnut Lofts', 'BLK-WLR-B', -170, 20, 12, 18, 15, 4,
      'loft row: party wall to the supply house, tall studio windows, cornice', doorx=-170, doorz=11),
    B('WLR-06', 'The Kestrel Diner (shell)', 'BLK-WLR-D', -266, -20, 20, 20, 10, 1,
      'low commercial row: striped awning read, plate glass, the door faces N (Kestrel S band)',
      face='Kestrel S', doorx=-266, doorz=-10, doorface='N'),
    B('WLR-07', 'Willow Court Walk-ups', 'BLK-WLR-D', -249, -20, 10, 18, 15, 5,
      'walk-up row: brick, stoop reads, cornice', doorx=-249, doorz=-11, doorface='N'),
    B('WLR-08', 'The Bijou', 'BLK-WLR-E', -213, -20, 22, 20, 12, 2,
      'small second house: painted brick, the BIJOU blade sign, stage door on the west flank',
      doorx=-213, doorz=-10, doorface='N'),
    B('WLR-09', 'Pell & Sons Cabinet Works', 'BLK-WLR-E', -187, -20, 22, 18, 12, 3,
      'cabinet works: brick, loading lintel, sawtooth monitor read', doorx=-187, doorz=-11, doorface='N'),
    B('WLR-10', 'The Column Yard', 'BLK-WLR-E', -170, -20, 12, 18, 14, 3,
      'storage loft: iron shutters read, cornice', doorx=-170, doorz=-11, doorface='N'),
    B('WLR-11', 'The Chestnut Shed', 'BLK-WLR-F', -120, -20, 24, 16, 6, 1,
      'the garden\'s shed row: timber, lean-to roofs, low', doorx=-120, doorz=-12, doorface='N'),
    B('WLR-12', 'Willow West Walk-up', 'BLK-WLR-FARN', -258, 57, 24, 10, 9, 2,
      'low walk-up on the Gable west continuation: brick, cornice', face='Gable S', doorx=-258, doorz=52),
    B('WLR-13', 'The Gable Pair', 'BLK-WLR-FARN', -212, 57, 20, 10, 8, 2,
      'low pair: brick, cornice', face='Gable S', doorx=-212, doorz=52),
    B('WLR-14', 'Chestnut North Works', 'BLK-WLR-FARN', -172, 57, 28, 10, 9, 2,
      'small works row: brick, freight door', face='Gable S', doorx=-172, doorz=52),
    B('WLR-15', 'Marlow West Works', 'BLK-WLR-FARS', -259, -57, 22, 10, 8, 2,
      'low works row: brick, freight door', face='Marlow N', doorx=-259, doorz=-52, doorface='N'),
    B('WLR-16', 'The Marlow Pair', 'BLK-WLR-FARS', -214, -57, 20, 10, 9, 2,
      'low pair: brick, cornice', face='Marlow N', doorx=-214, doorz=-52, doorface='N'),
    B('WLR-17', 'Chestnut South Shed', 'BLK-WLR-FARS', -172, -57, 28, 10, 8, 1,
      'low shed: timber, lean-to', face='Marlow N', doorx=-172, doorz=-52, doorface='N'),
]

# ------------------------------------------------------------------ park
PARK = {'id': 'PRK-CHESTNUT', 'name': 'The Chestnut Garden',
        'status': 'built (W-N0)',
        'bbox': {'xMin': -136, 'xMax': -104, 'zMin': 8, 'zMax': 32},
        'layout': {'lawn': {'xMin': -134, 'xMax': -106, 'zMin': 10, 'zMax': 30},
                   'gravelPath': {'from': [-120, 10.5], 'to': [-120, 29.5], 'width': 1.4},
                   'gates': [{'x': -120, 'z': 8, 'type': 'Kestrel St gate'},
                             {'x': -120, 'z': 32, 'type': 'Gable St gate'}],
                   'benches': [{'x': -113, 'z': 16}, {'x': -113, 'z': 24},
                               {'x': -127, 'z': 16}, {'x': -127, 'z': 24}]},
        'notes': 'W-N0 (the West Reach): the community garden that fills the corridor\'s east '
                 'half-block — the breath between the rows and Alder Heights, and the priced '
                 'cheap content of the lattice\'s spawn-lit columns 5-6 (the design doc §5).'}

# ------------------------------------------------------------- landmarks
LANDMARKS = [
    {'id': 'LMK-14', 'name': 'The Willow marquee', 'anchor': 'WLR-03',
     'reason': 'the neighborhood house\'s light-box marquee — THE WILLOW in bulb letters over '
               'the Kestrel face; the corridor\'s own wonder beat, the transition into the square\'s lights'},
    {'id': 'LMK-15', 'name': 'The Ansel & Sons ghost sign', 'anchor': 'WLR-01',
     'reason': 'FINE PRINTING — EST. 1919 whitewashed on the print works\' west gable; '
               'the painted-brick read the corridor shares with the Iron Works across the map'},
]

# --------------------------------------------------------- intersections
def IX(id_, a, b, corners):
    return {'id': id_, 'streets': [a, b], 'cornerBuildings': corners}

INTERSECTIONS = [
    IX('IX-WLR-KW', 'STR-KESTREL', 'STR-WILLOW', ['WLR-02', 'WLR-03']),
    IX('IX-WLR-KC', 'STR-KESTREL', 'STR-CHESTNUT', ['WLR-05', 'WLR-11']),
    IX('IX-WLR-GW', 'STR-GABLE', 'STR-WILLOW', ['WLR-12', 'WLR-13']),
    IX('IX-WLR-GC', 'STR-GABLE', 'STR-CHESTNUT', ['WLR-13', 'WLR-14']),
    IX('IX-WLR-MW', 'STR-MARLOW', 'STR-WILLOW', ['WLR-15', 'WLR-16']),
    IX('IX-WLR-MC', 'STR-MARLOW', 'STR-CHESTNUT', ['WLR-16', 'WLR-17']),
]

# ------------------------------------------------------------ crosswalks
# The axis law (the shipped convention: XW-KJ-N/S carry axis 'NS' — they
# cross the AVENUE; the E/W legs cross the EW street): the nav builder's
# crossing derivation reads it (ns = axis === 'NS') — a row without the
# right axis bridges the wrong lanes and the graph splits.
def XW(id_, x, z, note, axis='EW'):
    return {'id': id_, 'x': x, 'z': z, 'w': 3.4, 'axis': axis, 'note': note}

CROSSWALKS = [
    XW('XW-WLR-KW-E', -228.5, 0, 'Kestrel×Willow, east leg (across Kestrel)'),
    XW('XW-WLR-KW-W', -235.5, 0, 'Kestrel×Willow, west leg (across Kestrel)'),
    XW('XW-WLR-KC-E', -144.5, 0, 'Kestrel×Chestnut, east leg (across Kestrel)'),
    XW('XW-WLR-KC-W', -151.5, 0, 'Kestrel×Chestnut, west leg (across Kestrel)'),
    XW('XW-WLR-GW-S', -232, 35.5, 'Gable×Willow, south leg (across Willow)', 'NS'),
    XW('XW-WLR-GW-N', -232, 44.5, 'Gable×Willow, north leg (across Willow)', 'NS'),
    XW('XW-WLR-GC-S', -148, 35.5, 'Gable×Chestnut, south leg (across Chestnut)', 'NS'),
    XW('XW-WLR-GC-N', -148, 44.5, 'Gable×Chestnut, north leg (across Chestnut)', 'NS'),
    XW('XW-WLR-MW-S', -232, -44.5, 'Marlow×Willow, south leg (across Willow)', 'NS'),
    XW('XW-WLR-MW-N', -232, -35.5, 'Marlow×Willow, north leg (across Willow)', 'NS'),
    XW('XW-WLR-MC-S', -148, -44.5, 'Marlow×Chestnut, south leg (across Chestnut)', 'NS'),
    XW('XW-WLR-MC-N', -148, -35.5, 'Marlow×Chestnut, north leg (across Chestnut)', 'NS'),
]

# ------------------------------------------------------- pedestrian routes
ROUTES = [
    {'id': 'R-WILLOW-W', 'way': 'west sidewalk x -239..-238, z -48..48 (W-N0: the corridor\'s lanes, off the 6 m grid)'},
    {'id': 'R-WILLOW-E', 'way': 'east sidewalk x -227..-226, z -48..48'},
    {'id': 'R-CHESTNUT-W', 'way': 'west sidewalk x -155..-154, z -48..48'},
    {'id': 'R-CHESTNUT-E', 'way': 'east sidewalk x -143..-142, z -48..48'},
]

# ------------------------------------------------------------ amendments
def amend_span(sid, new_west, note_suffix):
    for s in R['streets']:
        if s['id'] == sid:
            old = s['spanX'][0]
            s['spanX'][0] = new_west
            s.setdefault('notes', '')
            s['notes'] += ' W-N0 (2026-11-14, the West Reach): spanX west end %g -> %g — the street continues into the Willow Rows (butt-jointed slabs, same levels; the continuation law, west edition). %s' % (old, new_west, note_suffix)
            return True
    problems.append('span amendment: street %s not found' % sid)
    return False

amend_span('STR-KESTREL', -280, 'Kestrel runs Willow->Larch: 532 m of continuous frontage.')
amend_span('STR-GABLE', -280, 'The brownstone street\'s west reach.')
amend_span('STR-MARLOW', -280, 'The quiet south reach.')

R['bounds']['playableCore']['xMin'] = -450
R['bounds']['playableCore']['note'] += (' W-N0 (2026-11-14, the West Reach): grown west to x -450 — '
    'the Willow Rows corridor (x -280..-100) + Times Square + the Catalpa docks are one walkable '
    'surface now (the master continuation directive: "one coherent open world"). The K line\'s ride '
    'remains alongside the walk — transit, not the only door.')
for card in R['bounds']['skylineCards']:
    if card['id'] == 'SKY-W':
        card['line'] = 'x = −466 card row'
        card['role'] = ('the west vanishing point behind the Catalpa docks (moved −122 → −466 in W-N0: '
                        'the Willow Rows took the old ground; the row reads above the docks\' rooflines '
                        'from Alder, 10 m east of the SKY-TS-W rim — the west horizon keeps its closure)')

R['meta']['corrections'].append(
    'W-N0 (2026-11-14): the three EW street spans grew their west ends -100 -> -280 '
    '(the continuation law, west edition — the W-C5 east-amendment precedent); '
    'playableCore.xMin -100 -> -450; SKY-W moved -122 -> -466. Zero canon rows edited.')

PHASE = {'id': 'WN0', 'name': 'The West Reach — the Willow Rows data wave',
         'content': 'The owner\'s 2026-11-14 master continuation directive ("COMPLETE THE OPEN WORLD"): '
                    'the corridor between Alder Heights and Times Square (x -280..-100) is real rows now. '
                    'Two NS streets (Willow, Chestnut), eight blocks, seventeen WLR-* masses (shells only — '
                    'the W-C1 scope law), PRK-CHESTNUT the community garden, LMK-14 the Willow marquee, '
                    'LMK-15 the Ansel ghost sign, six intersections, twelve crosswalks, four pedestrian '
                    'route rows. The three EW streets grow their west ends (the continuation law, west '
                    'edition). Geometry is the W-N1 wave; the lattice pricing law (masses west of x -176) '
                    'is data-checked here. See docs/world-building/west-reach-design.md.'}

# ------------------------------------------------------------ self-checks
def fp(b):
    f = b['footprint']
    return (f['x'] - f['w'] / 2, f['x'] + f['w'] / 2, f['z'] - f['d'] / 2, f['z'] + f['d'] / 2)

all_b = R['buildings'] + BUILDINGS
for i, a in enumerate(BUILDINGS):
    ax0, ax1, az0, az1 = fp(a)
    for j, b2 in enumerate(all_b):
        if b2['id'] == a['id']:
            continue
        bx0, bx1, bz0, bz1 = fp(b2)
        ox = min(ax1, bx1) - max(ax0, bx0)
        oz = min(az1, bz1) - max(az0, bz0)
        if ox > 0.01 and oz > 0.01:
            problems.append(f'OVERLAP {a["id"]} <-> {b2["id"]} ({ox:.2f} x {oz:.2f})')

for a in BUILDINGS:
    ax0, ax1, az0, az1 = fp(a)
    for rd in (WILLOW, CHESTNUT):
        ox = min(ax1, rd['road']['xMax']) - max(ax0, rd['road']['xMin'])
        if ox > 0.01:
            problems.append(f'{a["id"]} ON NS ROAD {rd["id"]} overlap {ox:.2f}')
    for s in R['streets']:
        if s['id'] in ('STR-JUNIPER', 'STR-SYCAMORE', 'STR-LARCH'):
            ox = min(ax1, s['road']['xMax']) - max(ax0, s['road']['xMin'])
            if ox > 0.01:
                problems.append(f'{a["id"]} ON NS ROAD {s["id"]} overlap {ox:.2f}')
    # EW roads (Kestrel/Gable/Marlow): the corridor masses keep the shipped clearances
    for s in R['streets']:
        if s['id'] in ('STR-KESTREL', 'STR-GABLE', 'STR-MARLOW'):
            oz = min(az1, s['road']['zMax']) - max(az0, s['road']['zMin'])
            if oz > 0.01:
                problems.append(f'{a["id"]} ON EW ROAD {s["id"]} overlap {oz:.2f}')

blk = {b['id']: b for b in R['blocks']} | {b['id']: b for b in BLOCKS}
for a in BUILDINGS:
    ax0, ax1, az0, az1 = fp(a)
    bb = blk[a['block']]['bbox']
    if ax0 < bb['xMin'] - 0.01 or ax1 > bb['xMax'] + 0.01 or az0 < bb['zMin'] - 0.01 or az1 > bb['zMax'] + 0.01:
        problems.append(f'{a["id"]} outside its block {a["block"]}')

# the lattice pricing rule (the design doc §5): the district bake files a
# mesh by its CENTER — column floor((x+308)/28) with the grown origin -308.
# Columns 5-6 (centers -154/-126) sit inside the spawn's SIGHT_M window, so
# every mass whose bake column is >= 5 must be the priced-cheap garden band
# (the shed, h 6). Buildings bake whole into their center's column.
def bake_col(cx):
    return int((cx + 308) // 28)
for a in BUILDINGS:
    cx = a['footprint']['x']
    if bake_col(cx) >= 5 and a['height'] >= 8:
        problems.append(f'PRICING {a["id"]} bakes into spawn-lit column {bake_col(cx)} (center {cx})')

pb = PARK['bbox']
if pb['xMin'] < -136.01 or pb['xMax'] > -103.99:
    problems.append('PRK-CHESTNUT outside its half-block')

if problems:
    print('W-N0 SELF-CHECK FAILED:')
    for p in problems:
        print('  -', p)
    sys.exit(1)

# ----------------------------------------------------------------- write
R['streets'] += [WILLOW, CHESTNUT]
R['blocks'] += BLOCKS
R['buildings'] += BUILDINGS
R['parks'].append(PARK)
R['landmarks'] += LANDMARKS
R['intersections'] += INTERSECTIONS
R['crosswalks'] += CROSSWALKS
R['routes']['pedestrian'] += ROUTES
R['constructionPhases'].append(PHASE)

with open(REG, 'w') as f:
    json.dump(R, f, indent=1, ensure_ascii=False)
    f.write('\n')

print('W-N0 APPLIED:',
      len(BUILDINGS), 'buildings,', len(BLOCKS), 'blocks,', len(CROSSWALKS), 'crosswalks,',
      len(INTERSECTIONS), 'intersections, 1 park, 2 landmarks, 2 streets,',
      len(ROUTES), 'route rows, 1 phase row.')
print('Total buildings now:', len(R['buildings']))
