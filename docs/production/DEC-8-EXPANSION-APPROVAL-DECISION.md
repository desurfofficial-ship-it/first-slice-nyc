# DEC-8 — Expansion Approval Decision Record

**Whether the Phase-8 expansion gate (AGENTS.md §8) opens, and under what terms**

| | |
|---|---|
| Status | **RULED — the owner signs off DEC-8 (2026-11-13). CLOSED — the Phase-8 exit checklist is executed (register v1.66.0).** The ruling opens the expansion gate under the row's own standing terms: **Alder Heights completion only; no borough geometry.** The gate's companion deliverable — the borough scoping study as a document — is filed in the same wave: [BOROUGH-SCOPING-STUDY.md](BOROUGH-SCOPING-STUDY.md). The borough question itself remains **open for the owner** with the study in hand; nothing in this ruling authorizes any geometry, registry row, or code for a second district. |
| Author | Technical Architecture agent, recording the project owner's sign-off |
| Date | Ruled 2026-11-13 (owner sign-off received: "I have sign off dec 8") |
| Question | **Expansion approval.** AGENTS.md §8 reserves scope growth — new boroughs, world expansion beyond the roadmap epics — for a human decision. The risks register's DEC-8 row is Phase 8's gate: without it, `PHASE-ACCEPTANCE-CHECKLISTS.md §Phase 8` cannot enter, `MS-6 (Alder Heights Complete)` cannot sign, and the borough scoping study (the roadmap's "document only, if approved" deliverable) cannot be written. What exactly does the owner's approval open, and what does it leave gated? |
| Method | Re-read of the governing rows at the current tip `2cba191` (register v1.65.0): the risks register's DEC-8 row, `MASTER-GAME-ROADMAP.md` Phase 8, `AGENTS.md` §0 (the pillars) and §8 (stop-and-ask), `PHASE-ACCEPTANCE-CHECKLISTS.md` §Phase 8, and the registry's current truth (81 building rows, 21 interiors, 7 parks, 23/23 anchors — every status read live). The completion audit below cites only evidence already in the register (waves W1–W13) or re-certified on this tree. |

---

## 0. The question, stated precisely

DEC-8 is the last owner-gated decision standing between the shipped city and the roadmap's Phase 8 exit. The gate has been **open in substance for waves**: the roadmap's Phase 8 program — "complete the registry's designed-but-unbuilt set … every new place needs a purpose and an interaction … construction waves with per-wave draw-call pricing" — was executed to completion across the construction series W1–W7 and the craft/keep-building waves W8–W13, all under the owner's standing "keep building" directives and the DEC-2 ledger law. What was **never** open was the gate's own paperwork: the checklist's entry line ("DEC-8 … granted"), the milestone row `MS-6`, and the exit checklist's final item — "the borough scoping study exists **as a document** and no borough geometry has been built without the owner gate."

The owner's sign-off closes exactly that gap. It does **not** re-scope the game: the DEC-8 row's standing terms — written into the risks register when the decision table was first filed — already answer the scope question: "Alder Heights completion only; no borough geometry." The sign-off ratifies those terms and opens the paperwork.

## 1. What the ruling opens — and what it does not

**OPENED by this sign-off:**

1. **The Phase 8 exit checklist executes.** All six items are checked with evidence in [PHASE-ACCEPTANCE-CHECKLISTS.md](PHASE-ACCEPTANCE-CHECKLISTS.md) §Phase 8 — per-wave pricing (the DEC-2 ledger rule, every wave's battery), validator green (178 IDs, append-only grammar), purpose + interaction + probe evidence per place, business records open with the place (the Phase-6 machinery), E2E + perf ledger green, and the scoping study as a document.
2. **MS-6 (Alder Heights Complete) records.** The completion audit (§2 below) is the evidence row.
3. **The borough scoping study is written** — as the roadmap's own deliverable line defines it: "reference-world manifest pattern, Slop New York as reference-only, never ingesting OSM/NYC-Open-Data geodata." Filed this wave; document only.

**NOT opened (each keeps its own gate):**

1. **Borough geometry.** No second district is designed, registered, priced, or built. The roadmap is explicit — the owner "decides the borough question with the scoping study in hand"; §8's scope-growth gate applies again at that moment, fresh.
2. **Population growth / needs-mood dials.** Phase 4's owner-gated remainder (the 12-walker roster scale-out, the dials) is a separate owner call (register PH-4); DEC-8 does not touch it.
3. **Seasonal pass scope (DEC-6), telemetry (DEC-9), rating pass (DEC-7), localization (DEC-10), distribution (DEC-11).** Untouched — each its own row, its own gate.
4. **Monetization, naming, IP.** §8 items one and four; never implicated by a build gate.

## 2. The completion audit (the Phase-8 DoD, evidenced)

The Phase-8 definition of done: "Every designed place exists, is reachable, has purpose, and carries its probe evidence." The audit, re-read from the live registry and the register at `2cba191`:

| DoD line | Evidence | Source |
|---|---|---|
| **Exists** | 81 building rows — 18 canon `existing` heroes (the KTN/KTS rows, ROS-01, SUB-01, VND-01, ALY-01, the far world TSS-01..05 + SUB-TS) + 63 raised by the construction waves (W1 9 · W2 6 · W3 17 · SI-1 3 · W6 4 · W7 24); 21 interior rows — 18 built (W5 8 · W8 1 · W9 9) + 3 canon; 7 parks; 23/23 anchors; 178 registry IDs total | `docs/data/world-registry.json` [read live 2026-11-13] |
| **Reachable** | The W10 park-gate law: the four gated garden mouths built, the pocket scanner (`diag-pocket-scan.mjs`) the standing gate — final census colliders 977 · spawn component 42,241 · traps 18 (furniture, private courtyards, the world's own walls — no registered public space sealed) · **42/42 registered POIs read spawn-component** · deterministic 5/5 | register v1.60.0 + W13's scanner-integrity repair [read] |
| **Purpose + interaction** | Every built interior opens with books and staffing (the W5 rooms' Phase-6 machinery; the FRUIT-INT live leg walks the room end to end); the interaction set regression-guarded (`interactions.test.ts` + `probe-world-sim`); the anchor set catalogued under reserved `obj:` ids | register v1.58.0, W8–W10 rows [read] |
| **Probe evidence** | Per-wave batteries W1–W13, each in the change log; the standing fleet at the current tip: validate-registry OK · tsc clean · vitest **1697/1697** (101 files) · build OK · probe-city-fabric **DRAWS 190** (budget < 200) · probe-integration 0 errors, 8/8 walks · probe-nav 9/9 · probe-world-sim 15/15 · 4-day E2E 0 failures | change log v1.28.0–v1.65.0; W13 battery re-run on `2cba191` [executed] |
| **Craft closure** | The honest ledger's rows closed in order: sills/lintels (W8), tree species + shed filigree (W8), escape-rail filigree (W12 — 170 instanced panels, +1 draw call), band courses + soot (W13 — 469 pieces, +0 draw calls). The terrace report §4 ledger has no open rows. | [SOURCE-REUSE-REPORT.md](terrace-buildout/SOURCE-REUSE-REPORT.md) §4 [read] |

## 3. The boundary, stated for the next agent

- The registry is **append-only** (the id law): no row is renamed, renumbered, or edited for a borough in this wave — and a borough wave may not edit canon rows either.
- The draw-call ledger is the standing budget law (DEC-2): the 150 number remains an aspiration, the ledger rule the gate. The shipped city runs at 190 — any expansion pricing starts from that fact, not from a clean sheet.
- The compliance red line (no TSL/WebGPU) binds every future construction wave; the W12/W13 ports are the compliant patterns to copy.
- The scoping study is **input, not authorization**: its §7 names what a further owner decision would actually be asked to approve.

## 4. The next decision (owned by the owner, with the study in hand)

The borough question — whether Alder Heights is the whole game, whether one more district rides the existing machinery as a chapter-structured expansion, or whether the five-borough Passport progression (§0 pillar 6) becomes a program — is **explicitly left open**. The study's scope options and cost model are its input. Until the owner rules again: Alder Heights is the world, and it is complete.
