# Borough Scoping Study — the five-borough question, scoped from the shipped ledger

> **Status:** Phase-8 exit deliverable (2026-11-13), filed under the DEC-8 ruling ([DEC-8-EXPANSION-APPROVAL-DECISION.md](DEC-8-EXPANSION-APPROVAL-DECISION.md)). **This document authorizes nothing.** No borough geometry exists, no registry row for a second district exists, no code for one exists — and nothing in this study changes that. It is the roadmap's own deliverable ("the borough scoping study (document only, if approved)"), written so the owner can decide the borough question with real numbers in hand instead of adjectives. **UPDATE 2026-11-13 — RULED: the owner selected Option B (one additional district, chapter-structured), direction only; construction stays behind the fresh §8 gate on the design package + first priced wave. Adjudication of record: [DEC-12-BOROUGH-DIRECTION-DECISION.md](DEC-12-BOROUGH-DIRECTION-DECISION.md).**
>
> **Method:** every number below is read from the shipped tree at `2cba191` (register v1.65.0) — the live registry, the probe fleet's recorded censuses, the change log's per-wave batteries, and the reference implementations in `web-three/src/sim/`. Nothing is projected from hope; where a cost is unknown, it is marked unknown and named as the first task of the wave that would price it.
>
> **UPDATE 2026-11-13 — THE GATE OPENED: the owner approved the Catalpa Junction design package as filed (scenario S1 governing, W-C1 authorized) — adjudication of record: [DEC-13-CATALPA-JUNCTION-PACKAGE-APPROVAL-DECISION.md](DEC-13-CATALPA-JUNCTION-PACKAGE-APPROVAL-DECISION.md). §5 law 1's fresh owner gate is SATISFIED for the approved package + W-C1; laws 2–7 govern every wave verbatim (law 2's DEC-2-class ruling stays the owner's, un sought — W-C1 rides S1's +0 standing).**

---

## 0. The question

AGENTS.md §0 pillar 6 keeps "the City Passport and eventual five-borough progression" central to the design. AGENTS.md §8 reserves scope growth — new boroughs above all — for a human. Those two lines have coexisted without friction because the game's whole playable world has been **one block**: Alder Heights. With Phase 8's construction program complete (81 building rows, 21 interiors, 7 parks, every place purposeful, reachable, probed), the question can no longer be deferred by remaining work on the current map. It is now a pure scope decision, and it belongs to the owner.

The question this study answers is **not** "should we build a borough." It is: **if the owner ever wants one, what exactly would ride on, what would it cost, and what laws would govern it** — scoped from the ledger this project has actually kept.

## 1. The canon boundary (binding before any geometry)

Any borough conversation inherits these, verbatim from the governing docs:

1. **FIRST SLICE is a life sim on an open block, not an open-world city** (AGENTS.md §0, corrected direction; doc 09's scope law: the references "inform how that block is built and dressed, not how to grow it into a borough"). A borough that abandons the §0 pillars — daily loop, Map, Regulars, Postcard, Slice Ladder, Passport, cozy readable low-poly — is §8's named failure mode ("expansion without the bible is scope failure").
2. **Identity guide holds**: "forever 5:45 PM," the first week of October. A borough is a new *place* under the same light, not a new game.
3. **Reference-only sourcing**: Slop New York and the other studied repos remain references (docs/57, docs/world-map/09). **Never ingesting OSM/NYC-Open-Data geodata** — the roadmap's own red line. A borough's streets are authored, as Alder Heights' were, through the registry's coordinate system and the design package's own grammar.
4. **The registry is append-only** (the id law): new district rows append with new ids; canon rows are never edited, renamed, or renumbered to make room.
5. **Every new place needs a purpose and an interaction** (AGENTS.md working rules), and business records open with the place (the Phase-6 machinery) — a borough is not scenery.
6. **The compliance red line**: no TSL/WebGPU; the W12/W12-style CanvasTexture/alphaTest and plain-Lambert/instancing patterns are the compliant toolkit.

## 2. What a borough would ride on (the shipped machinery, inventoried)

The reason a scoping study is now *possible* rather than speculative is that the hard parts of world growth are already built, gated, and priced. A second district would consume each of these as-is:

| Machinery | Where it lives | What a borough gets for free |
|---|---|---|
| **Registry-driven construction** | `docs/data/world-registry.json` + the A-3 flip (DEC-4 Option B, complete: all rows render from the registry's own numbers) | Buildings declared as data (`footprint {x,z,w,d}`, `height`, class, style code-refs) render through per-style builders — the W2/W3-pattern wave grammar is the construction playbook |
| **The priced-wave law** | DEC-2's ledger rule; every wave W1–W13 recorded its draw-call/tri delta *before* the PR | "Price first, build second" is muscle memory with a probe behind it (`probe-city-fabric`, budget < 200, currently 190) |
| **The facade kit** | `facadeKit.ts` (sills, lintels, band courses, soot, cornice shelves — plain Lambert, vertex-color fusion, +0-draw-call baking) | Street-scale craft that pre-bakes free — the difference between 190 draws and B13's 302 |
| **Instancing discipline** | W12's escape filigree: 170 panels, one `InstancedMesh`, one draw call | The pattern for repeating iron/greenery/props at borough scale |
| **Nav graph + access model** | A-1/A-2: registry-seeded graph (401 nodes/444 edges at last published count), door/access model, capacity gates (doors 1, zebras 5, FIFO law) | Walkability is generated from the same registry rows — a new district seeds its graph the way this one did |
| **The pocket scanner** | `diag-pocket-scan.mjs` — full-map flood fill at real capsule clearance, deterministic after W13's mover-exclusion repair | The standing gate that made "walkable" a measured word: any map growth re-runs it; registered public spaces must read spawn-component |
| **Content cataloguing** | `sim/contentCatalogue.ts` — the catalogue law ("CATALOGUING, not an asset library"): every shipped building carried under its registry id, `validateManifest` green | New district buildings enter the pack by appending — the manifest layer needs no new contract |
| **The reference-world manifest pattern** | `sim/reference.ts` — registry places as canon ids + character-bible people + example schedules/businesses/events, validated through all four contracts, with the canon-vs-technical-example separation law | The template for scoping a borough's *content* (not just its geometry): a borough's first playable slice is a manifest slice, exactly like this one was |
| **Business operations** | `sim/businessOps.ts` + the hours machinery — places open with books; P&L derives from ledger evidence only (wc-12 rule 17: no invented prices) | A borough's shops are businesses from day one, on the same honest-money law |
| **Chapter/rails machinery** | `core/chapters.ts` + `core/chapterRails.ts` — canon windows, the advance law, fire-while-roaming | Story-relevant borough places ride content waves in §7 order; no new narrative runtime needed |
| **The probe fleet + E2E** | `probe-*` harnesses + the 4-day E2E (0 failures across waves) | Every wave's acceptance battery already exists; a borough wave extends, not invents, its gates |

## 3. The cost model (read from this project's own ledger)

**What Alder Heights actually cost, in waves:** the construction series W1–W7 raised 63 buildings (9 + 6 + 17 + 3 + 4 + 24) across seven priced waves, then the craft/keep-building series W8–W13 (interiors' furniture passes, sills/lintels, tree species, walkability law + park gates, registry-truth repair, filigree, band courses + soot) closed every honest-ledger row. Each wave carried its own battery and its own register row. The honest unit of borough cost is therefore **the wave**, not the borough: Alder Heights was not built by a decision, it was built by ~13 priced, probed, registered waves.

**What the draw budget says:** the shipped city runs at **190 draw calls** against the < 200 probe budget (the historical arc: 402 baseline → the B13 lessons (PLAZA 302, CART_CORNER 236) → the re-baseline 119/184/256 → 190 with two extra craft waves baked free). DEC-2's ruling stands: the ledger rule is the gate, the 150 number an aspiration. **The first honest finding of this study: a second district at Alder-Heights density does not fit the current budget.** The levers, in the order this project has already proven them: (a) the district culling system (W0 — the shipped vehicle), which is exactly how the current 190 stays flat while the map grew; (b) instancing for repeating fabric (W12's one-draw-call pattern); (c) the facade kit's bake-free dressing (W13's +0). What a borough *actually* prices at — and whether the budget itself needs a new DEC-2-class ruling for two live districts — is **unknown until a first priced wave is drafted**, and this study deliberately does not guess.

**What the map gates say:** the pocket scanner is the standing gate — "any wave that grows the world re-runs diag-pocket-scan and the registered-space traps must read zero." A borough re-runs it over a larger grid; the scan's cost scales with area and is already part of the wave battery, not a new invention. The walkability law (approach lines + live legs, not teleports) extends as-is.

**What the content machinery says:** the reference-world manifest pattern is the scoping unit for *content*: a borough's minimum honest slice is one manifest — places (new registry ids), people (character bible), hours, one arbitration scenario, ledger with honest money, events that pass validation — exactly the shape `sim/reference.ts` proves for Alder Heights. The §7 build order then governs which story content rides it.

## 4. Scope options (for the owner's decision; nothing here is a plan of record)

| Option | Shape | What it consumes | Cost class | The gate it needs |
|---|---|---|---|---|
| **A — Alder Heights is the game** | No second district; the Passport pillar stays aspirational lore | Nothing | Zero | Already ruled: this is today's standing truth |
| **B — one borough district, chapter-structured** | A second compact district scoped as a later chapter's setting (the C0–C6 pattern: a place with stations, not a free-roam city); built in W2/W3-pattern priced waves after its chapters' machine content is queued | The full machinery table (§2); a new draw-budget ruling (DEC-2 class) before geometry; a design package per the world-map docs' grammar; the pocket scanner re-gated per wave | **Unknown until priced** — plausibly the W1–W7 series' class (seven priced waves for 63 buildings plus a craft tail), but the first wave's ledger row is the only honest estimate | §8 again, fresh, on the design package + first priced wave |
| **C — the five-borough Passport program** | The pillar-6 progression as a program: borough-by-borough scoping, a Passport progression system, per-borough identity packages | Everything in B, multiplied, plus a progression meta-system that does not exist today | **Unknown; strictly larger than B**; the meta-system is a new machine with its own gates | §8 on the program itself, plus per-borough gates |

**The study's own observation, stated honestly:** the shipped game's density is its identity. Option B's risk is not engineering (the machinery table is real); it is the §0 failure mode — a second map diluting the block's regulars, postcards, and slice ladder. The machinery can carry a borough; the design question — what a second district is *for* — is the owner's, and the study deliberately leaves it theirs.

## 5. The binding laws for any future borough wave (the checklist that would govern it)

1. A fresh **owner gate** on the chosen option's design package and first priced wave — this study is not that gate. *(SATISFIED 2026-11-13 for the approved package + W-C1: [DEC-13-CATALPA-JUNCTION-PACKAGE-APPROVAL-DECISION.md](DEC-13-CATALPA-JUNCTION-PACKAGE-APPROVAL-DECISION.md).)*
2. **DEC-2-class budget ruling** before any geometry: the two-live-districts draw budget is priced, not assumed.
3. **Registry append-only**: new ids only; canon rows untouched; the validator's id grammar respected.
4. **No geodata ingestion** (OSM/NYC-Open-Data stay out; references stay reference-only).
5. **Per-wave batteries**: priced ledger row first; ghost gates ±0.1 m; the pocket scan re-run with zero registered-space traps; probes per new place; E2E extended for story-relevant places; the compliance red line throughout.
6. **Purpose + interaction + books** per place (AGENTS working rules + the Phase-6 machinery).
7. **Same-commit law**: register + worklog travel with the work, as always.

## 6. What this document does not do

- It does **not** create any registry row, geometry, code, dependency, or branch.
- It does **not** modify the draw budget, the roadmap's phase gates, or any decision row other than the DEC-8 record it accompanies.
- It does **not** estimate a borough's cost with a number — the only honest estimate is the first priced wave's ledger row, which does not exist.
- It does **not** start Option A/B/C. The owner decides, with this study in hand; §8's gate applies again at that moment, fresh.

## 7. The decision frame handed to the owner

**The question:** Alder Heights is complete. Do you want the game to grow beyond the block — and if so, as Option B (one district, chapter-structured) or Option C (the Passport program) — knowing the machinery carries it, the budget needs its own ruling, and the density risk is the design's, not the engineering's?

**Until ruled:** nothing changes. The standing truth is Option A, and it is not a placeholder — it is a complete, probed, walkable city of 81 buildings that answers every Phase-8 DoD line.
