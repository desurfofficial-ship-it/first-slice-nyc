# ASSET QUALITY STANDARDS — FIRST SLICE: A New York Story

Issued: 2026-11-10 · Owner: the world-building wave (`feat/world-visual-quality`,
register v1.36.0) · Companion docs: `FULL-GAME-ASSET-AUDIT.md`,
`ASSET-IMPLEMENTATION-REPORT.md`

This is the bar every future 3D asset addition to Alder Heights must meet.
It codifies the laws the shipped world already obeys, plus the ones this wave
added, so the next agent inherits a standard instead of an accident.

---

## 1. The registry is the truth

- **No agent invents positions.** Every building mass reads its row from
  `docs/data/world-registry.json` through `World.regShell(id)` (DEC-4 Option B).
  Decoration derives against the shell — it never moves the shell.
- Existing entity numbers are load-bearing (the story, the E2E driver, Save v1).
  Appending rows is allowed; renumbering never.
- When a registry row and a shipped hand row disagree, the registry wins and
  the stale pin gets re-homed **with the reason in a comment** (the SUB-01
  −47.2 repair is the standing example). Assertions are never weakened to go
  green — they are grown stronger or left failing.

## 2. Palette law (Doc 04, extended by the wear row)

- Base colors come from `PAL` only. No new hues.
- **The wear row** (`facadeKit.WEAR`) is the sanctioned way to say "old":
  each tone is a documented darkening of a Doc 04 anchor —
  `brickDark 0x8e3d47` (PAL.brick), `bldgDark 0x7d5f57` (PAL.bldg),
  `bldg2Dark 0x93756a` (PAL.bldg2), `patchDark 0x43404c` / `stain 0x3f3b47`
  (PAL.road), `vent 0x6e554e` (the stoop-door brown, re-homed as aged copper).
- Emissive tones ride existing anchors (amber lamps) at ≤ 0.5 intensity.

## 3. The bake law — how decoration gets to be free

1. Every static piece is a `THREE.MeshLambertMaterial`, **non-transparent,
   non-mapped** (or the shared sign atlas), added to the scene **before
   `bakeStatics()`** so `mergeGeometries` fuses it into its 28 × 32 m district
   tile (vertex-color batches; the atlas is the one world-wide batch).
2. Named handles the game toggles (interiors, the bus, dusk pieces) stay in
   the bake's skip sets. Decoration never lands there.
3. InstancedMesh is built after the bake, never before it.
4. **Measured budget**: the boot must stay < 200 draw calls at spawn
   (`probe-world-visual-quality` pins it; this wave landed 155 for ~600 new
   pieces). If an addition can't ride the bake, it must justify its draw call
   in the report.

## 4. The gameplay law — decoration never changes the game

- **Zero new colliders.** Decorative pieces ride existing faces, stand on
  roofs the player cannot reach, or lie flat on the road at ≤ 5 cm proud
  (manholes, drains, patches, stop lines, leaf piles) — walkable through by
  design. Body-height solids belong to furniture/seam systems with their own
  collider + nav review, not to the decoration pass.
- The nav graph, the crosswalk zone, the walk lanes, the crosswalk courtesy
  law, NPC routes and vehicle rails are untouched by construction. The probes
  that prove it every run: `probe-nav` (9/9), `probe-world-sim` (15/15),
  `probe-ped-nav`, `probe-integration`.
- Reachable surfaces keep their gameplay cleanliness: the bodega roof keeps
  its billboard, the Cecil's climb keeps its top landing clear under the new
  crown (`probe-climb` pins it).

## 5. Architecture standards

- **Rooflines end in a crown** — the stone band (h − 0.25, footprint + 0.2
  overhang, 0.5 tall) every real mass wears. The documented exceptions:
  per-segment backdrop rows (a footprint band would slice them) and slot-row
  ALY-02 (h 0).
- **Windows are openings, not stickers** — proud-window rows carry a sill
  under and a lintel over, formulas mirrored from the owning builder.
- **Party walls tell their history** — end/slot/backdrop walls get
  bricked-over openings (slightly proud, one shade darker), downspouts at
  corners, and a ghost sign only where the wall earns one (an avenue-facing
  or court-facing surface, ≤ 5 per district).
- **Buildings vary by age and use, not by randomization** — same grammar,
  different tones/heights/rows; the seeded rng varies placement, never palette.
- **Roofs carry clutter only where legal** — bulkhead + vents + antenna on
  unreachable roofs; water towers stay canon (three, Doc 04).

## 6. Street standards

- The street floor reads: cream crosswalk zebra (W1's law), stop lines before
  junction crosswalks (1.3 m early, entering lane, right-hand traffic), ≥ 13
  manholes, 8 curb storm drains, patches and stains where the road would wear.
- Street furniture keeps its curb law (existing placements untouchable);
  new furniture needs its own collider + nav review (§4).
- Nature: every tree pit wears grass tufts; curb leaf piles in October's
  palette; the fallers belong to LeafDrift, the landed belong to the ground.

## 7. Sign standards

- Static sign faces ride the **sign atlas** (one sheet, shelf packer, 8 px
  bleed) so the bake fuses them into the ATLAS batch. A face that doesn't fit
  falls back to its own canvas — a giant sign can never break the boot.
- Ghost signs are painted panels: panel tone deliberately differs from the
  wall (a painted AREA, not a decal), cream lettering at low contrast, text
  is period-generic (no real-world years).

## 8. Verification standards — an asset is not "done" until

1. `tsc` clean, full `vitest` green, `vite build` OK.
2. The wave's own probe pins the addition by NAME and POSITION (this wave:
   `probe-world-visual-quality.mjs`, 26 checks against `World.vqLedger` —
   the ledger records what was built and where BEFORE the bake merges the
   bare meshes, so the contract survives the merge).
3. The addition is **seen in the running game** — Playwright evidence shots
   at street level from the player's actual vantages (this wave: 22-vantage
   before sweep + 4 after shots; "inspected in the source code" is not
   verification).
4. The gameplay probes above still pass — an asset that breaks a beat,
   a walk, a climb or a route is a failed asset no matter how it looks.
5. The answer to the standing question — *is the environment enough to
   convince someone to play?* — is yes at street level: nothing floats,
   nothing is blank where the camera lingers, and the world's own wear tells
   the neighborhood's age.
