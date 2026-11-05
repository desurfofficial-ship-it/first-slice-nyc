#!/usr/bin/env python3
"""ABO first-slice furniture curation (docs/57).

Reads metadata.jsonl (codepawl/abo-glb, CC-BY-4.0), scores every record
against the first-slice priority list, and writes the curated pack:
  - curated.json   every selected model with id/name/type/lod1 path/score/role
Selection laws (from the agent prompt):
  - priority: chairs > sofas > tables/desks > cabinets/dressers > beds >
    shelves > lamps > rugs > ottomans/stools > wall art/mirrors/pillows
  - skip small electronics accessories outright
  - prefer KTX2/LOD assets; here: lod1 (1024px webp) hero, lod2 background
  - floor pieces must sit on Y=0 (bounds_min[1] < 0.02)
  - quality over quantity, ~80-140 models
"""
import json, re, collections

rows = [json.loads(l) for l in open('metadata.jsonl') if l.strip()]

SKIP_RE = re.compile(r'cable|charger|mouse ?pad|hard drive|hdd|sleeve|laptop|usb|power strip|surge|keyboard|headset|speaker|shredder|monitor|printer|laminat|projector|camera', re.I)
MODERN = re.compile(r'modern|contemporary|mid-?century|scandinavian|minimalist|industrial', re.I)

def lod(r, i):
    ls = r.get('lods') or []
    return ls[i-1] if len(ls) >= i else None

def ok_base(r, tri_cap, byte_cap):
    n = r.get('name') or ''
    if SKIP_RE.search(n): return False
    l1 = lod(r, 1)
    if not l1: return False
    if l1['triangles'] > tri_cap or l1['bytes'] > byte_cap: return False
    return True

def y0(r):
    b = r.get('bounds_min') or [9, 9, 9]
    return abs(b[1]) < 0.02

def dims(r):
    s = r.get('size_metres') or [0, 0, 0]
    return max(s), sorted(s)[1], min(s)

selected = []  # (bucket, role, rec, score)

def take(bucket, role, rec, score):
    selected.append({'bucket': bucket, 'role': role, 'rec': rec, 'score': score})

def pick(product_types, name_re, bucket, role, n, tri_cap, byte_cap,
         style_bonus=1.0, aspect=None, brand_max=2, exclude_re=None):
    """Top-n by score, brand-diverse, name-regex scoped."""
    cand = []
    for r in rows:
        if r.get('product_type') not in product_types: continue
        nm = r.get('name') or ''
        if name_re and not name_re.search(nm): continue
        if exclude_re and exclude_re.search(nm): continue
        if not ok_base(r, tri_cap, byte_cap): continue
        if role != 'wall' and not y0(r): continue
        score = 5.0
        l1 = lod(r, 1)
        t = l1['triangles']
        if t < tri_cap * 0.35: score += 1.5      # featherweight
        elif t < tri_cap * 0.6: score += 0.8
        if l1['bytes'] < byte_cap * 0.5: score += 0.5
        if y0(r): score += 0.5
        st = (r.get('style') or '')
        if MODERN.search(st): score += style_bonus
        if r.get('materials', 9) <= 2: score += 0.5
        L, M, S = dims(r)
        if L > 0 and S > 0:
            if role != 'wall' and (L > 3.2 or L < 0.25): score -= 2.0  # insane scale
            if aspect:
                a = L / max(S, 0.01)
                if not (aspect[0] <= a <= aspect[1]): score -= 1.5
        if exclude_re and exclude_re.search(nm): continue
        cand.append((score, r))
    cand.sort(key=lambda x: -x[0])
    brands = collections.Counter()
    out = []
    for sc, r in cand:
        b = (r.get('brand') or 'unknown')[:24]
        if brands[b] >= brand_max: continue
        brands[b] += 1
        out.append((bucket, role, r, sc))
        if len(out) >= n: break
    return out

DINING  = re.compile(r'dining chair|side chair|dining side|splat|ladder back|windsor', re.I)
OFFICE  = re.compile(r'office chair|desk chair|swivel|task chair|rolling chair|computer chair|drafting', re.I)
ARM     = re.compile(r'armchair|accent chair|lounge chair|club chair|wingback|slipper', re.I)
RECLINER= re.compile(r'recliner|rocker|swivel.*glider|bar ?stool|counter ?stool', re.I)
SOFA_OK = re.compile(r'sofa|loveseat|couch|settee', re.I)
SECT    = re.compile(r'sectional|modular|sleeper|futon|bunk', re.I)
DINTAB  = re.compile(r'dining table|kitchen table|farmhouse table|rectangular dining', re.I)
COFTAB  = re.compile(r'coffee table|cocktail table', re.I)
SIDTAB  = re.compile(r'side table|end table|accent table|nightstand|bedside', re.I)
CONTAB  = re.compile(r'console table|entryway|hall table|sofa table', re.I)
FOLDTAB = re.compile(r'folding table|drop ?leaf|gateleg|utility table', re.I)
DESKOK  = re.compile(r'desk|writing table|computer table', re.I)
DESKBAD = re.compile(r'hutch|return|credenza|organizer|accessor|lamp|chair|bed|shelf|cart', re.I)
SIDEBOARD = re.compile(r'sideboard|credenza|buffet|tv stand|media console|chest of drawers|storage cabinet|accent cabinet', re.I)
BEDOK   = re.compile(r'bed$|platform bed|panel bed|upholstered bed|metal bed|queen bed|full bed|double bed', re.I)
BEDBAD  = re.compile(r'bunk|day ?bed|trundle|dog|pet|cat|doll|toddler|crib', re.I)
SHELFOK = re.compile(r'bookcase|bookshelf|shelving|etagere|ladder shelf|open shelf|display shelf', re.I)
LAMP_TB = re.compile(r'table lamp|desk lamp|bedside lamp', re.I)
LAMP_FL = re.compile(r'floor lamp', re.I)
RUG_OK  = re.compile(r'area rug|rug', re.I)
RUGBAD  = re.compile(r'runner|round|circular|square pads|stair', re.I)
ART_OK  = re.compile(r'framed|canvas|wall art|painting|print|poster', re.I)
MIRROR  = re.compile(r'mirror', re.I)
OTTOMAN = re.compile(r'ottoman|pouf|footstool', re.I)
STOOL   = re.compile(r'counter stool|bar stool|stool', re.I)

plan = []
plan += pick({'chair'}, DINING,  'chairs-dining',   'hero', 14, 26000, 750_000, exclude_re=RECLINER)
plan += pick({'chair'}, OFFICE,  'chairs-office',   'hero', 8,  26000, 750_000, exclude_re=RECLINER)
plan += pick({'chair'}, ARM,     'chairs-accent',   'hero', 6,  26000, 750_000, exclude_re=RECLINER)
plan += pick({'sofa'},  SOFA_OK, 'sofas',           'hero', 12, 34000, 900_000, exclude_re=SECT)
plan += pick({'table'}, DINTAB,  'tables-dining',   'hero', 6,  16000, 600_000)
plan += pick({'table'}, COFTAB,  'tables-coffee',   'hero', 5,  16000, 600_000)
plan += pick({'table'}, SIDTAB,  'tables-side',     'hero', 5,  14000, 550_000)
plan += pick({'table'}, CONTAB,  'tables-console',  'hero', 4,  16000, 600_000)
plan += pick({'table'}, FOLDTAB, 'tables-folding',  'hero', 4,  12000, 500_000)
plan += pick({'desk'},  DESKOK,  'desks',           'hero', 6,  16000, 600_000, exclude_re=DESKBAD)
plan += pick({'cabinet'},SIDEBOARD,'cabinets-side', 'hero', 8,  16000, 600_000)
plan += pick({'dresser'},None,   'cabinets-dresser','hero', 5,  16000, 600_000)
plan += pick({'bed'},   BEDOK,   'beds',            'hero', 7,  30000, 800_000, exclude_re=BEDBAD)
plan += pick({'bed frame'}, None,'beds-frames',     'hero', 3,  30000, 800_000)
plan += pick({'shelf'}, SHELFOK, 'shelves',         'hero', 8,  18000, 650_000)
plan += pick({'lamp'},  LAMP_TB, 'lamps-table',     'hero', 7,  14000, 550_000)
plan += pick({'lamp'},  LAMP_FL, 'lamps-floor',     'hero', 5,  16000, 600_000)
plan += pick({'rug'},   RUG_OK,  'rugs',            'hero', 10, 9000,  700_000, aspect=(1.15, 3.2), exclude_re=RUGBAD)
plan += pick({'ottoman'},OTTOMAN,'ottomans',        'hero', 5,  18000, 650_000)
plan += pick({'stool seating'},STOOL,'stools',      'hero', 5,  18000, 650_000)
plan += pick({'wall art'},ART_OK,'wall-art',        'wall', 6,  4000,  400_000)
plan += pick({'home mirror'},MIRROR,'mirrors',       'wall', 3,  12000, 500_000)
plan += pick({'pillow'},None,    'pillows',         'wall', 3,  12000, 500_000)

seen = set()
final = []
for bucket, role, r, sc in plan:
    if r['id'] in seen: continue
    seen.add(r['id'])
    final.append({'bucket': bucket, 'role': role, 'id': r['id'], 'name': r['name'],
                  'product_type': r['product_type'], 'brand': r.get('brand'),
                  'style': r.get('style'),
                  'lod1': lod(r, 1)['file'], 'lod2': lod(r, 2)['file'] if lod(r, 2) else None,
                  'lod1_bytes': lod(r, 1)['bytes'],
                  'lod1_triangles': lod(r, 1)['triangles'],
                  'size_metres': r.get('size_metres'),
                  'score': round(min(10.0, max(1.0, sc)), 1)})

cats = collections.Counter(f['bucket'] for f in final)
print("== curated pack ==")
for k, v in sorted(cats.items()): print(f"  {k:18} {v}")
print("TOTAL:", len(final), " lod1 MB:", round(sum(f['lod1_bytes'] for f in final)/1e6, 1))
json.dump(final, open('curated.json', 'w'), indent=1)
# game hero candidates shortlist (lowest-tri clean piece per needed slot)
need = [('beds', 'bed', 1), ('cabinets-dresser', 'dresser', 1), ('chairs-office', 'desk chair', 1),
        ('lamps-table', 'table lamp', 1), ('rugs', 'rug', 1), ('sofas', 'sofa', 1),
        ('tables-coffee', 'coffee table', 1), ('shelves', 'bookcase', 1),
        ('chairs-dining', 'dining chair', 1), ('tables-dining', 'dining table', 1),
        ('tables-folding', 'folding table', 1), ('stools', 'counter stool', 1),
        ('cabinets-side', 'sideboard', 1), ('tables-side', 'side table', 1)]
print("\n== game slot candidates (best-scored) ==")
for bucket, slot, n in need:
    c = [f for f in final if f['bucket'] == bucket]
    c.sort(key=lambda f: -f['score'])
    for f in c[:n]:
        print(f"  {slot:14} {f['id']}  tri={f['lod1_triangles']:6d}  {f['lod1_bytes']//1024:4d}KB  s={f['score']}  {(f['name'] or '')[:58]}")
