# 28 — Generated .glb asset seam

## What it is

The game can now wear real generated 3D assets without ever depending on them.
At boot, `World` tries to load `models/<id>.glb` (relative to the site root, so
GitHub Pages' `/first-slice-nyc/` subpath resolves correctly) for every
registered decorative prop. If the file exists and parses, the generated mesh
replaces the procedural placeholder's visuals — uniform-scaled to the exact
height of the placeholder, XZ-centered on it, feet on the same ground, shadows
enabled, any stray lights/cameras inside the file stripped. If the file is
missing or malformed, the placeholder silently stays and the loader stops
asking (one `console.info` line, no errors, no retry loop). Neither path
touches gameplay: these props carry no colliders and no triggers.

Covered prop ids (matching `tools3d/spaces_manifest.json`): `hydrant`,
`mailbox`, `trashcan`, `streetlamp`. Mailbox, trashcan and streetlamp are new
procedural street furniture (teal USPS-style box, lidded can, glowing lamp) so
the street reads as lived-in even before any generated asset lands.

## How to feed it

1. Generate assets with either pipeline — `tools/gen3d/generate_glb.py` (HF
   Spaces, no local GPU) or `tools3d/spaces_glb.py --manifest
   tools3d/spaces_manifest.json` — using a prompt per entry.
2. Copy the resulting `.glb` files into `web-three/public/models/` named
   exactly `hydrant.glb`, `mailbox.glb`, `trashcan.glb`, `streetlamp.glb`.
3. Reload. `world.glbUpgrades` (a `Map<string, string>` on the World) records
   which props got upgraded and from which file — handy for tests and for
   verifying a deploy actually picked the meshes up.

## Verification

`node scripts/probe-glb.mjs` (against a running `vite preview` on :4173)
asserts both paths: loading an existing file returns `true` and puts a
`<Prop>_glb` wrapper into the scene graph (`shots/14-glb-seam.png` shows the
taxi mesh swapped into the trashcan slot as a stand-in), while a missing file
returns `false` and leaves the procedural prop untouched. Full E2E journey
plus unit suites pass with zero console errors; typecheck and build are clean.
