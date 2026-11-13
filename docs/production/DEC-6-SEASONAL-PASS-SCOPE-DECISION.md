# DEC-6 — Seasonal Pass Scope Decision Record

**Whether the seasonal pass (Phase 6's largest visual dependency) is scoped, and under what terms**

| | |
|---|---|
| Status | **RULED — the owner signs off DEC-6 (2026-11-13, "Im also sign off dec 6").** The ruling opens the seasonal pass **under the row's own standing terms — the same reading DEC-8's landing used (the sign-off ratifies the row as filed, it does not re-scope it)**: the minimal pass executes first — *season cuts run the existing dressing/leaf systems first; snow/rain only after a priced wave.* Phase 6's entry requirement ("DEC-6 ruled") is **MET**. |
| Author | Technical Architecture agent, recording the project owner's sign-off |
| Date | Ruled 2026-11-13 (owner sign-off received alongside the DEC-12 borough-direction ruling) |
| Question | **Seasonal pass scope.** The risks register's DEC-6 row was Phase 6's entry gate: narrative/14 §4 budgets the pass as its own phase ("W6 candidate"), "gated behind chapter states, reusing existing weather/leaf systems"; narrative/00 §3 left scope and phasing open; the roadmap's Phase 6 names it "the largest visual dependency of the roadmap". Without a ruling the seasonal/visual pass stayed owner-gated (register PH-6) and Phase 6 could not enter its seasonal tranche. What exactly does the sign-off open, and what stays priced/gated? |
| Method | Re-read of the governing rows at the current tip `e752bb7` (register v1.67.0): the risks register's DEC-6 row, the roadmap's Phase 6 section, narrative/14 §4 (line 74) and narrative/12 §5 (the season canon), and the shipped machinery the minimal pass would ride — `core/calendar.ts` (the R4 season derivation: `seasonOf`, `crossedSeasonCut` — "built and unused" per the roadmap, ready to be wired), `sim/clock.ts` (its day-based `seasonOf` agrees with the calendar's month law by the same meteorological months — day 1 = September 9, Y1 reads autumn both ways), and the existing dressing/leaf systems (`world/leaves.ts` LeafDrift — one instanced mesh, one draw call; the canopy palette in `world/props.ts` makeTree — shared MatBank materials; the leaf piles `facadeKit.makeLeafPile`). |

---

## 1. What the ruling opens — and what it does not

**OPENED by this sign-off (the minimal seasonal pass, executable as its own priced wave):**

1. **The world's existing dressing/leaf systems become season-aware.** The canopy palettes (the shared leaf/gold materials), the LeafDrift tints and density, and the leaf piles read the R4 calendar's own season — `seasonOf` over the calendar date of the current `calendar_day`. One season law: **`core/calendar.ts` is the canon derivation** (narrative/14 R4); the sim clock's day-based getter agrees with it by construction and is not a second authority.
2. **The shipped state stays byte-identical.** The shipped days are September 9–12, Y1 — meteorological autumn — and the autumn palette entry IS the shipped early-autumn look (4 of 12 trees turning, gold drift, gold piles). Zero visual change on any shipped day; zero new geometry; **zero draw calls** (the pass recolors existing shared materials and shows/hides existing meshes only — the draw ledger stays byte-equal at the shipped state, the DEC-2 law priced honestly at +0).
3. **The season canon advances with the calendar (doc 12 §5).** From C1 the seasons turn — the world dressing now answers a calendar that reaches winter, spring and summer. The "October, golden hour, forever" mood-lock (doc 12 §5) governs the LIGHT and is untouched presentation, not a calendar date (DEC-1's own ruling).

**NOT opened (each keeps its own gate or its own wave):**

1. **Snow / rain / precipitation.** The row's own terms: "snow/rain only after a priced wave." No weather system exists; none is built here. Winter ships as the bare season (canopy + drift + piles read it), never as fake snow.
2. **The `seasonCut` montage.** Calendar.ts's own words: "a cut detected is a cut owed" — the diary montage + postcard + city-diary whisper that fire on a crossing stay the chapter machinery's later milestone (roadmap Phase 6 deliverable line). This wave wires the detector's *visual* consumer (the world dressing), not the montage.
3. **The Phase-4 population/dials calls, DEC-7/9/10/11.** Untouched — each its own row, its own gate.
4. **No new dependencies, no TSL/WebGPU.** The compliance red line binds the dressing pass like every wave.

## 2. The wave that executes the ruling

One priced wave on the seasonal dressing law: a pure season→palette module, the appliers on the three existing systems (canopy materials, LeafDrift, leaf piles), the boot + calendar-day-advance hook in `Game`, and the permanent guards (the palette laws as tests, the +0-draw-call ledger assertion, the shipped-state identity law). Register + worklog travel with it (the §6.4 same-commit law), and its register row cites this record.
