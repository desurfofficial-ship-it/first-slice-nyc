# SOURCE REUSE REPORT — the Westgate & Eastgate rows (W7)

Wave: **the W7 gate rows** (register v1.45.0) · Source: [mrdoob/slop-newyork](https://github.com/mrdoob/slop-newyork) (MIT, © 2026 Mr.doob) · Continues: `docs/production/terrace-buildout/SOURCE-REUSE-REPORT.md` (v1.44.0)

## 1. What this wave took from the source

The third adaptation pass, executing the owner's standing expansion
directive ("expand the game map is not a problem here … an exhaustive large
bulk build", 2026-11-11) to its completion: after W6 grew the map's north
and south sides, W7 grows the east and west sides — **the core is now a
four-sided neighborhood**. What was ported is still TECHNIQUE, not renderer:

| Source module (js/) | What was taken | Where it landed |
|---|---|---|
| `js/buildings.js` 649–654 + `js/building-details.js` 96–115 | **THE SIDEWALK CONSTRUCTION SHED** — the green canopy over the walk: one green box ~3.8 wide × 0.85 thick riding y ≈ 3.8, at most one per facade, storefronts kept clear around it. The source's own green (0x214f37) joined the NEIGH palette as `shedGreen`. | `web-three/src/world/neighborhoodFabric.ts` §4 (`shedFabric`) — rebuilt in the house grammar: deck + ply underside tone + steel edge rails + four posts (the fabric's ONLY colliders) + visible knee braces + a work-light string that rides the shipped skyline window material (the dusk tween lights it with the towers). Three sheds on the strip walks: KTN-08's, MRW-03's, KTS-09's fronts. |
| `js/buildings.js` row grammar | the strip rows' massing discipline: party walls meeting at the block's edges (z 20 / −20 / ±32), heights continuing their row's band, storefronts under walk-ups | `web-three/src/world/World.ts` `buildAlderHeightsW7Gates()` — 24 registry-governed masses (every one through `regShell`), the W6 terrace builder's face law generalized (`faceZ + faceSign × dist`) |
| `js/street-details.js` | the hug-line prop discipline (center ≥ 0.85 m off every lane line, real NYC spacing) | the strip props: 2 mailboxes, 2 bike hoops, 2 hydrants, 1 ConEd steam stack with its sawhorse pair |
| `js/fire-escapes.js` | the escape bay discipline (one-to-two bays per facade, ≥ 2.0 m clear of doors, the bay guard's own limit on an 8 m wall) | 21 new bays on the strip rows' street faces; the three shed-fronted rows skip iron (iron over green canvas reads wrong) |

## 2. What was deliberately NOT taken (and why)

- **TSL/WebGPU materials, canvas-texture signage, the source's street-reserve
  system** — this game is MeshLambert + vertex-color bakes; the numbers and
  the discipline were extracted, the shaders were not.
- **Geodata, streaming, traffic/pedestrian systems** — the registry remains
  the single source of truth; the house nav graph, chokepoint law and body
  systems are load-bearing and pinned.
- **The source's shed probability roll (6% of eligible facades)** — the
  registry-governed world places sheds deliberately (three, one per strip
  walk that carries no ironwork), not stochastically.

## 3. The no-invention law, honored

All 24 strip masses read their rows through `regShell`
(`GRB-08..15`, `KTN-08..11`, `KTS-05..10`, `TEN-03/04`, `MRW-01..04` — all
`built (W7)`, pinned verbatim in `scripts/design/validate-registry.mjs` §7-W7
and `tests/a3-registry-flip.test.ts` HAND_TRUTH_W7). The pinned backdrop rows
(`VDN-*`) were NOT moved, resized, or re-classed. The avenue roadways keep
their corridors; the strips sit beyond them.

## 4. What the source did better (honest ledger for the next wave)

- The source's sheds carry a canvas-filigree top and a wired light cage;
  ours are the house grammar's boxes — a future alpha-tested pass could
  close the gap.
- The source's sheds arrive stochastically across a whole city; ours are
  three deliberate placements — the registry-first law means the world
  grows where the registry says, not where a PRNG lands.

## 5. Files

- New: `web-three/scripts/probe-w7-gates.mjs`, `shots/westgate-eastgate/` (6 evidence shots), `docs/production/westgate-eastgate/` (this report set)
- Changed: `web-three/src/world/World.ts` (the walls ±100, the W7 builder, the fabric pass's collider hook), `web-three/src/world/neighborhoodFabric.ts` (the shed port, the W7 escape jobs, the strip props, the collider DI), `web-three/src/world/cityFabric.ts` (SKY-W/E ∓122), `web-three/src/sim/nav/build.ts` (X_SPAN ±100, the grid anchor law), `web-three/src/sim/nav/index.ts` (NAV_BOUNDS), `web-three/src/world/peds.ts` (the band's core clamp, the commute waypoint radius, the corner-slow law, the facade depenetration), `src/game/interactionDefs.ts` (west_stoop, east_menu), `src/core/content.ts` (the notes), `src/sim/contentCatalogue.ts` (the 24 tokens), `docs/data/world-registry.json`, `scripts/design/validate-registry.mjs` (§7-W7 + 2 anchors), `scripts/design/w7-registry-patch.mjs` (the append-only patch), the test fleet
