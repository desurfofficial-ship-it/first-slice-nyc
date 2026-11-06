"""Shared color laws for the Alder Heights sand3d evaluation pack.

Two sources, deliberately kept apart:

- GAME   — FIRST SLICE's Doc-04 Art Direction Bible palette
           (web-three/src/core/palette.ts). Used wherever an asset must rhyme
           with the shipped world (accents, signage, goods on shelves).
- NYC    — real New York street-furniture colors (DSNY basket/bin green,
           NYC Parks bench green, hydrant silver-and-green, grille grey),
           for authenticity. Where both laws could claim a part, NYC wins on
           big surfaces and GAME wins on small accents.

Every program builds in millimetres (sand3d default) and exports metres.
Fronts look -Y in Blender space so assets face +Z after the glTF conversion.
"""

#: FIRST SLICE Doc-04 palette (hex).
GAME = {
    "gold": "#f7b32b", "brick": "#b23a48", "teal": "#2a9d8f", "amber": "#ffb85c",
    "stone": "#e8e4dc", "plum": "#6d4c7d", "coral": "#ff6b6b", "cream": "#fff8f0",
    "ink": "#3a3440", "road": "#4a4552", "walk": "#b9b1a6", "bldg": "#8e6f66",
    "bldg2": "#a3857a", "interior": "#d9c3a5", "taxi": "#f2c230",
    "skyline": "#9c8aa5", "window_dim": "#3b3346", "manhole": "#2b2730",
}

#: Real-world NYC street furniture colors.
NYC = {
    "hydrant_silver": "#a9adaf",
    "hydrant_green": "#2e5d4b",
    "dsny_green": "#1e5b3c",
    "parks_green": "#1b4d3e",
    "grille_grey": "#7d8287",
    "stucco": "#a3857a",
    "prewar_door": "#7a3b2e",
    "prewar_frame": "#5f2f24",
    "graphite": "#2b2d30",
    "washer_white": "#eceae6",
}


def paint(ob, kind, **overrides):
    """`s3d.material` with the overrides this pack always wants spelled out."""
    s3d.material(ob, kind, **overrides)
    return ob
