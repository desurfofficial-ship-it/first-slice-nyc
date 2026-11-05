#!/usr/bin/env python3
"""Fetch the curated ABO first-slice furniture pack (docs/57).

Downloads exactly the models selected by select.py (curated.json) from
HuggingFace dataset codepawl/abo-glb (CC-BY-4.0) using huggingface_hub,
laid out as:

  assets/furniture/<category>/<ASIN>.glb     lod1 (1024px webp textures)
  assets/furniture/LICENSE-CC-BY-4.0.txt     the dataset license
  assets/furniture/ATTRIBUTION.md            per-model credit

The GAME subset (the pieces wired into the eight interiors) is copied to
web-three/public/models/furniture/ by --game (ids listed in game_manifest).
"""
import json, os, shutil, sys, concurrent.futures as cf
from huggingface_hub import hf_hub_download

PACK = 'assets/furniture'
curated = json.load(open('docs/data/abo-curated.json'))

# the pieces the game actually wears (docs/57 §3): ASIN -> slot id
GAME_SLOTS = {
    'B075YMXWZC': 'dining_table',      # Rivet mid-century oak dining table
    'B07LC5Y95W': 'bed',               # Solimo Vega engineered-wood bed
    'B075YQ8Q2K': 'dining_chair',      # Rivet Florence mid-century dining chair
    'B072FVHS9G': 'sofa',              # Rivet Sloane mid-century sofa
    'B01LWVEZ1C': 'coffee_table',      # Alkove Waverly coffee table w/ shelf
    'B07DMHTGJD': 'bookcase',          # Hyder tall wood bookcase
    'B079X4CP3F': 'dresser',           # Movian Hulio 4-drawer chest
    'B07374P6MR': 'table_lamp',        # Stone & Beam bedroom table lamp
    'B0719STDHT': 'rug',               # Rivet modern zebra rug (grey)
    'B075YQXQ5C': 'sideboard',         # Stone & Beam Dunbar buffet
    'B01D3C7Z4A': 'side_table',        # Hallowood Waverly side table
    'B07CZ6P7QP': 'counter_stool',     # Alessio counter-height stool
}

def fetch(rec):
    dest_dir = os.path.join(PACK, rec['bucket'])
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, rec['id'] + '.glb')
    if os.path.exists(dest) and os.path.getsize(dest) == rec['lod1_bytes']:
        return rec['id'], 'cached'
    got = hf_hub_download(repo_id='codepawl/abo-glb', filename=rec['lod1'],
                          repo_type='dataset')
    shutil.copyfile(got, dest)
    return rec['id'], 'ok'

def main():
    os.makedirs(PACK, exist_ok=True)
    lic = hf_hub_download(repo_id='codepawl/abo-glb', filename='LICENSE-CC-BY-4.0.txt',
                          repo_type='dataset')
    shutil.copyfile(lic, os.path.join(PACK, 'LICENSE-CC-BY-4.0.txt'))
    with cf.ThreadPoolExecutor(16) as ex:
        for asin, st in ex.map(fetch, curated):
            pass
    by_id = {r['id']: r for r in curated}
    lines = ['# ABO first-slice furniture pack — attribution', '',
             'Models from the [Amazon Berkeley Objects (ABO) GLB dataset](https://huggingface.co/datasets/codepawl/abo-glb) by codepawl,',
             'derived from the Amazon Berkeley Objects dataset (Amazon.com, Inc.), licensed **CC-BY-4.0**.',
             'Each GLB here is the dataset\'s `lods/<ASIN>/<ASIN>_lod1.glb` variant (1024px webp textures), unmodified.',
             '']
    for r in curated:
        lines.append(f"- `{r['bucket']}/{r['id']}.glb` — {r['name']} ({r.get('brand') or 'unknown'}), CC-BY-4.0.")
    open(os.path.join(PACK, 'ATTRIBUTION.md'), 'w').write('\n'.join(lines) + '\n')
    # game subset
    gdir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web-three/public/models/furniture')
    os.makedirs(gdir, exist_ok=True)
    for asin, slot in GAME_SLOTS.items():
        r = by_id[asin]
        shutil.copyfile(os.path.join(PACK, r['bucket'], asin + '.glb'),
                        os.path.join(gdir, slot + '.glb'))
    total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(PACK) for f in fs)
    gtot = sum(os.path.getsize(os.path.join(gdir, f)) for f in os.listdir(gdir))
    print(f"pack: {len(curated)} models, {total/1e6:.1f} MB in {PACK}")
    print(f"game subset: {len(GAME_SLOTS)} files, {gtot/1e6:.1f} MB in {gdir}")

if __name__ == '__main__':
    main()
