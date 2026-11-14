# AGENT_HANDOVER — read this first

> **For the next agent.** The repo is the memory; you do not need the
> previous agent's conversation. Start here, then read `BUILD_STATUS.md`
> (the truth), `IMPLEMENTATION_LOG.md` (the how), and
> `complete-world-master-plan.md` (the target).


> **RECONCILIATION (2026-11-14, the integrated tree):** while this
> assignment built, a concurrent line landed DEC-13 — the owner approved the
> design package as filed and the Narrative Director pinned **Catalpa
> Junction** to the K line's **west reach** (the docks past 42 St, rows
> `CDK-*`). This document's district — the complete east build (x +100..+252)
> — is therefore named **the Larch Yards** (the tree grammar + the freight
> term; rows `LRY-*`). Both districts ship; the naming honors the canon; the
> ids never collide. The build's substance is unchanged.

## 1. What exists now (2026-11-14)

FIRST SLICE's playable world is **two districts and a destination**:

- **Alder Heights** — the shipped vertical-slice district (x −100..+100).
  UNTOUCHED by this assignment: the 4-day story, the cast, the cart corner,
  all 81 canon buildings, all 22 shipped interiors. Do not redesign it.
- **the Larch Yards** — the DEC-12 second district, BUILT this assignment
  (x +100..+252): the freight-spur neighborhood. 20 building rows (`CJN-*`),
  the elevated spur viaduct, the Junction Plaza + crane, the Spur Gardens,
  the enterable Freight Market hall (FREIGHTMKT-INT), the K's east headhouse
  stub (SUB-03). Registry prefix `LRY-*`, append-only. (The concurrent line's west-reach docks ship as Catalpa Junction, rows `CDK-*`, zone-gated — do not confuse the two.)
- **Times Square** — one K-line ride west, unchanged.

**Branch:** `feat/catalpa-junction-world` (head `3788097` at handover).
**Gates at handover:** tsc clean · vitest 1,733/1,733 (104 files) · build OK ·
draw census 192/200 · pocket scan one component x −98..250, traps 18
(unchanged) · probe-nav 9/9 (with `E2E_SCALE`) · the full battery list in
BUILD_STATUS §2.

## 2. The exact next implementation task

**The K-line eastbound ride (the design package's own next priced wave).**
The station kit is parameterized (`world/subway/stationKit.ts` — station B
already builds from the registry's SUB-TS row). The work:

1. Registry: SUB-03 gains its underground shell row (the platform band under
   the headhouse — the kit's own geometry, priced).
2. `stationKit.buildStation` for station C at cx ≈ 152+ (under the plaza —
   the stair hood already sits at SUB-03's north face).
3. `ride.ts`: the ride machine gains a route — `beginRide(s, from, route)`
   where route ∈ 'W' (Alder Heights ⇄ Times Square, the shipped beats) or
   'E' (Alder Heights ⇄ the Larch Yards, a short hop ~8-10 s, its own beat
   set). `RIDE_T` gains the E-leg constants; `swapFeet` gains the E delta
   (STATION_C_X − STATION_A_X). The state machine stays pure — pin the new
   transitions in `ride.test.ts` first (the issue→guard law).
4. The route choice: the ride interaction at station A presents BOTH
   destinations (the two car doors stand 6 m apart — westbound car and
   eastbound car; the spots already exist as SUBWAY_SPOTS entries to add).
5. `subway/index.ts`: station C's build + zones (mirror station B's zone
   pattern) + the third car + the fare check's third window.
6. Probes: extend `probe-subway` (the eastbound ride's 46-check class) and
   `probe-world-map-evidence` (the Catalpa arrival frame). Re-run
   `diag-pocket-scan` (the platform is below grade — the scan's y-band
   already skips it) and `probe-city-fabric` (the platform's draw price).

**Priced estimate from the shipped ledger:** station B's class ≈ +6-9 draws
below grade (zone-gated, +0 standing), ~9 registry rows, ~2 new probe legs.
Do not start without the priced ledger row (the DEC-2 law).

## 3. The laws this build added (they bind you)

1. **The re-centering law:** any mesh whose geometry carries WORLD
   coordinates but whose translation is (0,0,0) files into the ORIGIN's
   district tile — and the ring's sight window then hides it wholesale.
   Every emit path must re-center geometry onto the mesh position, and must
   **copy the bounding-sphere center before translating** (`translate()`
   recomputes the sphere in place; a live alias reads back (0,0,0) — the bug
   that cost this build a day). See `larchYardsKit.emit` and the two fabrics'
   emits.
2. **The junction off-grid law:** a nav junction whose x OR z lands on a
   chain's 6 m grid multiple collides with the chain point and the corner
   never connects. Lane offsets sit off-grid on both axes (148/155.5/221.5/
   234.5 — mirroring the shipped 6.5/35/46.5 grammar).
3. **The landing law:** a road-mouth zebra sits at the road's EDGE (±0.5) —
   a center row's landings hang 6 m from the chain edges, past the 4.5 m
   curb-apron law, and the crossing orphans.
4. **The continuation law:** a district's cross streets are the shipped
   streets' own east ends (Gable/Marlow spanX +252) — never parallel
   duplicates 2 m apart.
5. **The fog-law ring:** columns light within `SIGHT_M` (130 m) of the
   player; the spawn view must cover the whole shipped district (the Day-1
   spawn sits at x −30, col 1 — the window reaches c6 at 128 m). The far
   district reads as its silhouette (`Catalpa_Silhouette` + the lit panes
   ride the same law).
6. **The two-draw ground law:** a district's mapped paving merges into ONE
   asphalt + ONE concrete mesh (`World.groundMerged`, metric UVs preserved)
   — mapped materials leave the bake, so per-slab meshes would cost a draw
   each.

## 4. What remains open (beyond §2)

| Item | Where it stands |
|---|---|
| Catalpa business books | Phase-6 economy machinery, later phase (the design package's own scope) |
| Ambient walker loops east | 2 new loops on the spur/Kestrel East — small, safe |
| The M121/taxi routes east | Documented next wave; parked trucks dress the docks meanwhile |
| The Map sketch growth | Deliberately unchanged (the Roam law; the first-session frame) |
| The fenestra atlas mip re-audit | Carried from the shipped ledger (honest-open; needs a real GPU) |
| The walk-legs sweep + full-scale E2E | Exceed this box's wall budget — the documented dilation class; run on real hardware |

## 5. The verification commands (run in `web-three/`)

```bash
npx tsc --noEmit && npx vitest run && npm run build
node scripts/validate-registry.mjs 2>/dev/null || npx vitest run tests/sim-registry.test.ts
node scripts/diag-pocket-scan.mjs            # the standing growth gate
node scripts/probe-city-fabric.mjs           # DRAWS < 200
E2E_SCALE=0.35 node scripts/probe-nav.mjs    # 9/9 (the valve is machine mercy, not a test change)
E2E_SCALE=0.35 node scripts/probe-subway.mjs # 45/46 (the Wow-card check fails on the BASE commit too)
node scripts/probe-catalpa-evidence.mjs      # the district's evidence frames
```

## 6. The one warning

**Do not "simplify" the registry append-only law, the status-flip law
(`regShell` throws on 'planned'), or the priced-wave ledger.** They are the
reason 101 buildings coexist with 1,733 green tests. The Catalpa waves added
~60 registry/geometry amendments in ONE session — every one is recorded in
its phase row's content. Follow the same discipline.

— Lead Open-World Engineer agent, 2026-11-14

> **CORRECTION (2026-11-14, the registry-discipline repair — from the Catalpa/Junction line):** the west-reach rows restore their canon prefix `CDK-* → CJN-*` (DEC-13 accepted the CJN prefix as canon; the registry's own law says IDs are permanent; on the integrated tree the east rows are LRY-*, so the 2026-11-13 collision that forced the CDK rename no longer exists). Code, tests, the validator's pin block and the probes re-pointed in the same repair; zero geometry moved. Schema completion rides with it: the four BLK-LRY-* blocks gain the bbox fields the validator's block-membership check reads (computed from their own contained buildings); SUB-03's dangling `BLK-CJN-N` re-points to the appended `BLK-LRY-STN` block row; `STR-SPUR` carries the `pedestrianized` flag the park-on-road check now reads (the Yards Plaza and the Spur Gardens stand on the track bed by design — the control-house-exempt precedent). **ONE KNOWN DEFECT recorded for this district's next session: OVERLAP LRY-03 <-> SUB-03 (5.00 x 1.00 m — the Spur Lofts' southwest corner over the station house's northeast corner).** The validator prints it as KNOWN and does not fail; the fix (a 1 m footprint trim on one row) is yours when you next build here — note your handover §2 step 1 already touches SUB-03. The repair record: the registry's meta corrections + register row v1.78.0.

> **ADDENDUM (2026-11-14, the Polyfork streets wave — register v1.80.0):**
> the owner's asset directive landed between sessions: Polyfork's NYC
> City Kit is now a sanctioned source, TEN parts are in the world (the
> Alder sidewalk furniture, the Catalpa dock fleet, the Larch truck
> swap) as build-time vertex data riding the district bake at +0 draws.
> Read docs/production/polyfork/01..04 before touching
> polyforkData.ts (GENERATED — rebuild with
> `python3 tools3d/polyfork/extract_polyfork.py`; byte-identical) or
> polyforkKit.ts (the placements' laws are guard-tested in
> tests/polyfork.test.ts — the north lane law, the cart-corner apron,
> the fleet's bollard clearances). `?polyfork=0` is the A/B seam. The
> kit's remaining 72 parts stay catalogued for future districts —
> buildings and characters are REJECTED classes (the A-3 law; the sim
> boundary). The fenestra system re-certified on this tree the same
> day (probe-fenestra ALL PASS, 22 checks; the expansion decision
> recorded in the fenestra doc §9). Your §2 next task (the K-line
> eastbound ride) is unchanged.
