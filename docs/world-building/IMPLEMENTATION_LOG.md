# IMPLEMENTATION LOG — the master build assignment, wave by wave

> The record of what was done, in order, with the numbers read from the
> project's own probes. Companion: `BUILD_STATUS.md` (the truth),
> `AGENT_HANDOVER.md` (the next tasks). The registry's `constructionPhases`
> rows W-C0..W-C5 carry the same waves from the data side.

---

## Session 0 — audit and verification (M0)

- Cloned at `de9777c` (main, registry v1.75.0-era). `npm install`; **tsc
  clean; vitest 1,733/1,733 (104 files); build OK**.
- Captured all 12 world-map evidence frames from the built game
  (`probe-world-map-evidence.mjs`): zero page errors, boot draws 193. The
  prior sessions' "the map is complete for the vertical slice" claim is
  **visually verified** — the audit reads the running game, not the docs.
- Read the whole governance stack: AGENTS.md (the Laws, the gates), the
  world contract, the DEC-12 borough ruling, the borough design package
  (Catalpa Junction, priced), the five-reference study (doc 09), the W14
  handover. The master build assignment (2026-11-14) is the owner's fresh
  construction authorization that the design package's §8 gate asked for.
- Deliverables: `docs/world-building/current-world-audit.md` (M0),
  `reference-repository-analysis.md` (M1), `complete-world-master-plan.md`
  (M2 — the geography locked before construction).

## W-C0 — the data wave (commit `6ef88df`)

- Registry (append-only): bounds grown east (world +268, playableCore +252,
  SKY-E cards +262); Kestrel spanX → +252; streets STR-SPUR/STR-LARCH/
  STR-ROWAN/STR-SUMAC; 6 intersections + 6 crosswalks; 4 blocks; buildings
  CJN-01..19 + SUB-03 (planned); parks PRK-JUNCTION/PRK-SPURGARDEN
  (planned); landmarks LMK-10..13; npcZones NZ-CJN-*; 8 pedestrian routes;
  interior FREIGHTMKT-INT (planned); phase row W-C0.
- One shipped-law pin grew with the map (`neighborhood-fabric.test.ts`'s
  core-bounds bookkeeping — the wave it records).
- **Battery:** tsc clean · vitest 1,733/1,733.

## W-C1..W-C3 — the construction waves (commit `f917334`)

- **Foundation:** the paving as TWO merged mapped meshes
  (`World.groundMerged` — the +2-draw pricing law), the bed at walk level,
  curbs, yards (vc, bake-free), the plaza deck, zebras, streetlights, street
  trees, the plaza furniture + the K globe.
- **The kit** (`world/catalpaKit.ts`, ~700 lines): the masses (per-row seeded
  bay/window/dock grammar — the Metropolis lot-band discipline on the house
  GeoPush law), the viaduct, the crane, the gardens, the trucks, the
  bollards, the ghost signs (through `World.signBoard`), the lit panes (one
  InstancedMesh on the shipped skyline material — the HK3 window discipline),
  the plaza lights.
- **The ring:** the district lattice 6 → 12 columns; the fog-law sight
  window (the gen-city-auto residency discipline adapted).
- **The forensic chain this wave earned (recorded so nobody re-pays it):**
  1. The aerial "black blob" — the ring's raw-metre window left c6 (the
     shipped district's own east strip) dark at boot (the spawn sits at
     x −30, col 1) → the column-distance law, tuned to cover the spawn.
  2. The masses filed into the ORIGIN's tile — the kit's GeoPush meshes
     carried world coords in geometry and (0,0,0) in translation; the bake
     files by translation → the re-centering law (kit emit).
  3. STILL misfiled — the two SHIPPED fabric passes had the same disease;
     their emits re-centered too (the law's real name: every emit path).
  4. STILL (0,0) at runtime — **the aliasing bug:** `translate()`
     recomputes the bounding sphere in place; the captured `center` alias
     read back (0,0,0). Copy the values first. Four emit paths fixed.
- **The skyline:** the fabric's E-row moved +122 → +262 (it stood inside the
  district's blocks — the registry's own W-C0 ruling led, the code followed).
- **The far read:** the Catalpa silhouette underlay + the lit panes ride the
  ring law (visible-from-Alder / visible-in-district, in place).
- **Statuses flipped:** CJN-01..19 + SUB-03 → built (W-C2); the parks →
  built (W-C3).
- **Battery:** tsc clean · vitest 1,733/1,733 · **DRAWS 192** · the evidence
  frames show the district rendering whole.

## W-C4 — the Freight Market (commit `3788097`, first half)

- The hall carve (the kit's hall-ground variant: four walls with the
  registry's own door gap, the floor, the ceiling + tower above) + the
  fit-out from the row's own plan list (stall rows, the counter, the island
  WEST of the door line, the far pane) + the lamp row (one emissive draw).
- **The mass colliders** (the wave's correctness fix): every kit mass pushes
  its registry footprint; the hall pushes its four walls + door gap — the
  capsule stops at Catalpa exactly as at Alder.
- FREIGHTMKT-INT → built (W-C4); phase row added.

## W-C5 — Catalpa is walked (commit `3788097`, second half)

- The nav builder: LANES for the spur's bed walks + Larch; NAV_BOUNDS →
  x +252; the EW spines walk each street's OWN spanX (`assembleLane` gains
  the span param — Rowan/Sumac spines had dragged to x −100.55); the
  junctions only where both lanes' spans actually reach; the blocked-span
  clipping to the lane's own extent.
- **The geometry amendment:** the draft STR-ROWAN/STR-SUMAC streets RETIRED —
  their corridors duplicated Gable's and Marlow's own (two parallel E-W
  streets 2 m apart). Gable and Marlow CONTINUE EAST (spanX +252) — the
  honest city geometry. All CJN cross-street geometry shifted to the true
  centerlines (z 40/−40); five footprints pulled clear of Larch's walk.
- **The nav forensics (each is a law in AGENT_HANDOVER §3):** junctions must
  sit off the 6 m grid on BOTH axes (a grid-multiple junction collides with
  the chain point — the corner never connects); road-mouth zebras sit at the
  gap landings (±0.5 — a center row's landings hang 6 m out, past the 4.5 m
  curb-apron law); duplicate rows at the same coordinates dedupe each other's
  endpoints into orphans.
- **The gates on the grown map:** vitest 1,733/1,733 · **probe-nav 9/9**
  (the E2E's own `E2E_SCALE` valve added to the browser probes — the
  documented machine-mercy pattern) · **the pocket scan on the grown grid:
  ONE walkable component x −98..250, traps 18 — unchanged** · **DRAWS 192** ·
  probe-subway 45/46 with the one failure REPRODUCED ON THE BASE COMMIT ·
  the E2E at 0.2 scale: 108 driver passes reaching Day 4's opening.
- The evidence set re-captured (9 Catalpa frames) and landed in
  `docs/world-building/images/`.

## The draw-budget ledger for the whole assignment

| Wave | Price | Law |
|---|---|---|
| Baseline (shipped) | 193 | probe-city-fabric |
| W-C1 paving merged | +0 net (2 draws for all Catalpa paving) | the two-draw ground law |
| W-C1..C3 district statics | +0 standing at spawn (the tiles sit beyond the sight window; the silhouette +1) | the fog-law ring |
| W-C2 masses/kit | inside the tiles (the bake owns them) | the VC law |
| W-C4 interior | +1 emissive (the lamps; the fit-out bakes) | priced in its phase row |
| **Final standing census** | **192** | **budget 200** |
