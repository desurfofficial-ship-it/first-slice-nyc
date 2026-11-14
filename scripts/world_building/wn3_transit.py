#!/usr/bin/env python3
"""W-N3 — the transit extension's registry rows (the West Reach wave's
documented next priced wave, AGENT_HANDOVER §2).

- transit.bus.stops += BUS-05 (the Junction Plaza pole, the registry's
  pole-stop pattern at (138, 7.35) on Kestrel East's north walk);
- transit.bus.loop's sentence grows its east leg (the out-and-back);
- routes.vehicle V-CAB's rail grows east (the cab serves the Larch Yards);
- the WN3 phase row rides the wave.
Idempotence: refuses when BUS-05 already exists.
"""
import json, sys

REG = 'docs/data/world-registry.json'
with open(REG) as f:
    R = json.load(f)

if any(s.get('id') == 'BUS-05' for s in R['transit']['bus']['stops']):
    sys.exit('W-N3 already landed (BUS-05 present) — refusing to double-apply.')

R['transit']['bus']['stops'].append({
    'id': 'BUS-05',
    'name': 'Junction Plaza (Kestrel East)',
    'x': 138, 'z': 7.35,
    'status': 'planned (W-N3)',
    'note': 'the M121\'s east-leg pole (W-N3, 2026-11-14 — AGENT_HANDOVER §2\'s '
            'documented next priced wave): the nose halts at x 136 (2 m short of '
            'the pole, the door law), 10 m west of the spur mouth (146); the '
            'out-and-back serves the plaza between the bay lay-over and the '
            'shipped loop\'s Juniper turn.',
})
R['transit']['bus']['loop'] = ('terminal lay-over → Kestrel East (the Junction Plaza, BUS-05) → '
                               'Gable St → Sycamore Ave → Kestrel St → Juniper Ave → terminal '
                               '(W-N3: the east leg is an out-and-back from the bay — east to the '
                               'plaza, dwell, west return, then the shipped loop continues)')
for v in R['routes']['vehicle']:
    if v['id'] == 'V-CAB':
        v['way'] = ('Kestrel south lane z = −2 eastbound, x −84..246 (W-N3: the rail grows east '
                    'with Kestrel\'s own continuation — the cab serves the Larch Yards; the west '
                    'end keeps its shipped post; the courtesy boxes ride the east crossings)')

R['constructionPhases'].append({
    'id': 'WN3',
    'name': 'The West Reach — the transit extension',
    'content': 'AGENT_HANDOVER §2\'s documented next priced wave, built under the master '
               'continuation directive: the M121\'s loop grows its east leg (the Junction Plaza '
               'stop on Kestrel East, BUS-05, the out-and-back from the bay — legs "Kestrel east" '
               '+ "Kestrel west return", the door law\'s own nose marks, the courtesy zones at the '
               'east crossings), the taxi\'s rail grows east (x −84..246, the cab serves the Larch '
               'Yards, the courtesy boxes ride the spur and Larch corners), the BUS-05 pole + bay '
               'paint render at the registry\'s own pin. Priced: the bus shell +0 standing draws '
               '(dynamic, the shipped census law), the cab +0 (dynamic), the pole + bay pre-bake '
               '(+0 — the merge swallows them).',
})

with open(REG, 'w') as f:
    json.dump(R, f, indent=1, ensure_ascii=False)
    f.write('\n')
print('W-N3 APPLIED: BUS-05 row + loop sentence + V-CAB rail + the WN3 phase row.')
