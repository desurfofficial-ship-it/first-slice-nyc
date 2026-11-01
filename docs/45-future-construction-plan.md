# Doc 45 — Future Construction Plan

> **Deliverable G.** How the blueprint becomes the world: phases, dependencies,
> asset requirements, performance law, and the open decisions awaiting the lead.
> **Nothing here starts until the design package is approved (milestone §12–13).**

---

## 0. The law first

- **Design is approved before construction** — this doc has no "start now" clause.
- **The registry is the build contract** (docs/44 §6): agents build from
  `world-registry.json`, they do not invent positions.
- **Preserve everything shipped** — the 4-day story, Save v1, the E2E driver, the
  interaction registry, the collision system, the visual identity (AGENTS.md §0,
  Doc 37 red lines all carry forward).
- **No new dependencies** without a measured justification; the research table
  (§6) shows we don't need any for the world itself.

## 1. Phase plan (each phase exits on verified criteria, not declarations)

| Phase | Name | Content | Exit criteria | Est. draw-call delta |
|---|---|---|---|---|
| **W0** | **Bake & culling prerequisite** | Extend `bakeStatics` to district tiles; material-count audit; district visibility (own block + adjacent full, far faces tile-only, Class-D as single merged slabs) | measured calls per district published; Kestrel ≤ 150 visible (Doc 07 budget) with the shipped content alone; E2E still green | **negative** (the point) |
| **W1** | **Streets + skeleton + Marlow row** | Kestrel slabs → ±84; lay all four new streets (roads/walks/curbs/crosswalks); SUB-02; SMB-01..03 shells; PWK-01..03; corner infills KTN-00W/KTN-06 as shells; trees/lamps/furniture per standards; retire the x ±48 walls | the grid is walkable; every crosswalk + curb reads; E2E untouched; probe shots of all 6 intersections | +40–60 (merged tiles) |
| **W2** | **Gable Row + interior parks + shortcuts** | GRB-01..05; Kestrel Green; Gable Garden; alley lane R-ALLEY; garden slot R-GARDEN; parking strips | the residential street + both shortcuts walk end-to-end; park furniture colliders complete; ped loops pass a sustained no-stuck run | +30–45 |
| **W3** | **Avenue walls + landmarks** | TEN-01, SRC-01/02, KTN-07, KCM-01 shell, SND-01 shell; VDN-D* backdrop rows; mural LMK-05; ghost sign LMK-06; marquee LMK-07; VND-02; poles/wires on avenues | avenues are places, not edges; all 7 landmarks present and 64-px readable; SKY-E/W/S cards live | +35–50 |
| **W4** | **Life + traffic** | NPC zone wiring on the existing Yuka/dwell systems (NZ-* list); avenue rails + bus M121; parked cars; extended cab rail with new courtesy zones; busker | 13 zones populated day-keyed; bus loop completes with yields; no ped stuck states over a 30-min soak; story cast untouched | +15–25 |
| **W5** | **Interiors batch** | LAUNDRY-INT, BARBER-INT, PIZZA-INT, DINER-INT, HALL-INT, BAKERY-INT, RECORD-INT, CECIL-ROOM (+ optional MEZZ-INT, CORNERHOUSE-INT) | every Class-A/B promise in docs/40 kept; interior anchors in the registry; interaction tests for each loop; portrait-viewport pass; **interior groups carry a visibility toggle** (rendered when the player is inside or the camera sees through the glass — the bodega interior stays one room, not four districts of draw calls) | +40–60 |

**Dependencies:** W0 → W1 → {W2, W3} → W4 → W5. W2/W3 may run in parallel by
**file ownership** (Doc 37 red line 10): W2 owns `props.ts` row/park builders +
`World.ts` north-interior block; W3 owns the avenue/backdrop builders + sign
factory additions; W1 is the sole owner of the street slab layer. One agent per
file per phase — declared in each phase's report.

**Explicitly out of scope for all phases:** touching NPC story choreography,
Save v1 fields (new counters ride the existing optional-trailing pattern), the
step machine, Input.ts, the interaction registry's public shape.

## 2. Asset requirements (all procedural, per the shipped pipeline)

| Asset | Source | Notes |
|---|---|---|
| Street slabs/curbs/pits | existing builders (`solid`, `makeTreePit`) | reuse verbatim |
| Brownstone stoops | `makeBrownstoneStoop` | the GRB row reuses it with palette swaps |
| Fire escapes (deco) | `makeFireEscapeDeco` | TEN-01/SND-01 silhouettes |
| Storefronts + signs | `makeStorefront` + `signMaterials` | SMB row, KTN-00W/06 shells |
| Benches/fences/hoop/bins/lamps/poles | existing street-asset builders | verbatim |
| Playground kit (swings, sandbox, spray basin) | **new small builder** (one file, banked materials) | W2 |
| Pergola + garden beds/shed | **new small builder** | W2 |
| Mural + ghost sign textures | `signMaterials` canvas factory | W3; authored art, no external assets |
| Bus body | scale of the existing car builder, or a dedicated low-poly body — **W4 decision** (open §7) | |
| Subway control house | **new small builder** (cream metal-and-glass, twin globes) | W1 |

**No 3D model imports are required.** The GLB upgrade path
(`registerGlbProp`/`public/models/`) exists for optional community drops; the
master plan assumes none.

## 3. Performance law (the honest part)

- **Measured baseline (main @ 1ea39c2):** 402 draw calls / 20,100 triangles for
  the shipped block (probe-van census, SwiftShader). Doc 07's budget is < 150
  calls typical — the shipped world is already 2.7× over, which is why **W0 is a
  prerequisite, not a nicety**.
- **W0 strategy:** district-tile merging (the bake already tiles), material
  discipline (every new colour must reuse an existing scene signature), district
  visibility rings, Class-D single-mesh walls, skyline cards at every edge.
- **Per-phase reporting:** visible-call counts at 3 fixed camera rigs (plaza,
  cart corner, Sycamore×Gable) + total scene census; published before/after in
  each phase report. **No device claims without a device** (Doc 37 §9.6 carries).
- **The E2E is sacred:** every phase runs the full driver (`AUTOTEST OK: 0
  failures`) on the untouched story; the expanded world may not cost the driver
  a single budget extension.

## 4. Verification matrix (carried per phase)

typecheck · full vitest · production build · 4-day E2E unchanged · free-roam
coherence (no orphan prompts in new districts) · collision integrity probes for
every new mass (the doc 35 §2/§3 lesson: furniture collides, ghosts don't) ·
portrait 720×1280 layout pass for any new prompt/UI · ped no-stuck soak ·
registry validator green · maps re-rendered and re-embedded.

**The ghost gate (adopted from the external review pass):** before W5 opens,
all W1–W3 footprints are re-verified in-engine against the registry as a
massing pass — position/height/footprint deltas < 0.1 m per ID, fire-escape
sight-line screenshot approved (the gold window, the skyline line), every
skyline edge reads. A detail pass never proceeds over an unverified ghost.

## 5. Open-source resource ledger (researched, licence-verified)

| Resource | License | Attribution | Commercial | Verdict for this project |
|---|---|---|---|---|
| **Kenney asset packs** | CC0 1.0 | none required | yes | **usable** as shape reference or emergency placeholders; not needed for v1 |
| **Poly Haven** (textures/HDRIs) | CC0 | none required | yes | **usable** if the art pass ever needs a photographic ground truth; low-poly direction doesn't |
| **OpenStreetMap data** | ODbL 1.0 | **required** for public produced works; share-alike on derivative **databases** | yes with duties | **reference-only.** Do not ingest OSM data into the game (street graph or building footprints) — a derivative-database obligation is exactly the kind of weight this project doesn't want. Drawing *inspiration* from real NYC grammar (which we did) is not database use. ([OSMF attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)) |
| **NYC Open Data** | NYC terms (open, attribution-norms) | per-dataset | mostly yes | same verdict as OSM: reference for proportions, never piped in |
| **three.js** | MIT | copyright notice in bundle | yes | already in use |
| **yuka** | MIT | notice | yes | already in use |
| **Quaternius model packs** | CC0 (site-stated; re-verify at download time) | none | yes | optional; not needed |
| **OFL handwriting fonts** (Caveat, Patrick Hand) | SIL OFL | per-font file | yes (embedding allowed) | for the Map UI when that day comes; TBD-4 of Doc 07 remains the owner |

**Net dependency delta of this milestone: zero.** The design used the web as a
library, not the package manager.

## 6. Risks (honest, with owners)

| Risk | Mitigation | Owner |
|---|---|---|
| W0's bake refactor touches the live street | ship W0 as pure refactor + census proof, zero geometry moves; E2E twice | W0 agent |
| Ped budget explosion on 4 new street faces | zones are day-keyed loops on the existing system; the 30-min soak is a phase exit, not a hope | W4 agent |
| Naming canon regret | signage is W1's last commit; docs/39 §1 is reversible until then | lead |
| Interior scope creep (10 rooms!) | W5 ships A-class first; B-class may land as dressed-only bays exactly like the shipped laundry bay did | lead + W5 |
| Draw-call regression per phase | per-phase census gates in §1; a phase that regresses fixes before it ships | each phase agent |

## 7. Open decisions awaiting the lead (also in registry `openDecisions[]`)

1. **Naming canon** — Alder Heights / Kestrel / Juniper / Sycamore / Gable /
   Marlow / the K / M121 are new-canon names issued by this milestone
   (docs/39 §1). Approve before W1 signage; after that, they're load-bearing.
2. **PIZZA-INT in W5 or dressed-only** — scope call.
3. **Bus body** — scaled car-builder vs dedicated low-poly bus (W4).
4. **MEZZ-INT and CORNERHOUSE-INT** — optional slices; confirm before W5.
5. **W2/W3 parallelism** — allowed under file-ownership rules; the lead decides
   if one agent runs both sequentially instead.

## 8. Definition of done (for the whole construction arc, when approved)

The neighbourhood matches the master map; every registry ID exists in the scene
or is explicitly deferred with a note; all 7 landmarks readable; all shipped
systems intact; per-phase performance ledgers published; the E2E green
throughout; and a player can walk from the Marlow playground gate to the plaza —
crossing the cart corner on the way — without a single invented coordinate.
