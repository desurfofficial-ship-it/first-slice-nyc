# Doc 37 — Milestone Brief: FROM SCRIPTED STORY TO A LIVING, INTERACTIVE NEIGHBORHOOD

> **This is the active milestone contract.** Read it together with [AGENTS.md §0](../AGENTS.md) (GDD v2.0 is law), [Doc 33](33-living-neighborhood-design.md) (living-block design), and [Doc 34](34-living-block-implemented.md) (what already shipped). If this doc and any other doc conflict on scope, **this doc wins on process; GDD v2.0 wins on creative direction.**

*Status: issued, unstarted. Baseline: main @ `16e4c2c6ffdd79b90532be7e479e1b0a588eb207`. Implementation lives in `web-three/` (Three.js/TypeScript/Vite). Build/test tooling: `bun`. E2E: `node scripts/e2e.mjs` (~5 min; success line `AUTOTEST OK: 0 failures`).*

---

## 0. The problem this milestone exists to solve

The current 4-day story experience is finished in **under 7 minutes**. The block is small, most of it is decorative, and the player has **no agency** between scripted beats.

**This milestone is NOT about:** more dialogue, longer cutscenes, or adding a Day 5.
**This milestone IS about:** **player agency** — what the player can *do* when the main story has nothing to say.

**Core design principle:** *When the main story has nothing for the player, the player still has things to do.* Free exploration, chance encounters, optional activities, spending/saving money, and ignoring the main line entirely — all without breaking the game.

---

## 1. Ground rules

1. **Audit before building.** Do not write feature code until the §2 audit exists and a short implementation plan has been written down.
2. **Preserve everything already shipped.** Doc 34's living-block features, Rosa/Idris/Sal/child continuity, the 4-day story, Save v1 compatibility, existing visual style, existing collision/pedestrian fixes — none of it may regress.
3. **Keep the daily-loop identity.** Expansion must not drift into a generic open-world city (AGENTS.md §0).
4. **Verify or it didn't happen.** Nothing may be reported as "done" without a test, an e2e assertion, or a documented in-game inspection backing it.

---

## 2. Mandatory audit-first checklist

Produce a short written audit (one doc section is fine) covering the current state of:

- [ ] World architecture & map boundaries (what is walkable, what is a backdrop)
- [ ] Movement & camera systems
- [ ] Collision (static + dynamic) & navigation
- [ ] NPC system & Yuka integration (what is authored spawn vs. simulated)
- [ ] Dialogue & interaction systems (how interactions are wired today)
- [ ] Story triggers / beat machine (`GameState.step`, day-keyed logic)
- [ ] Save schema (Save v1 layout, optional-field patterns)
- [ ] UI & mobile controls
- [ ] Traffic & pedestrians
- [ ] Test suite & e2e driver (including known flake — §9)

Then write a **short implementation plan** (phases mapped to §4) before coding. The plan must identify the *root causes* of the scripted limitations found — not just symptoms.

---

## 3. Requirements

### A. Neighborhood expansion — bigger, but never emptier
- Add: **bodega** (interior or reachable service point), **laundromat**, **small diner**, **barbershop**, **small park**, **basketball court**, **subway entrance**, more residential/storefront variety, an **alley or hidden corner**.
- Do **not** build a huge map. A compact, rich block (or two) beats a vast empty one.
- Keep the existing art direction and palette discipline (Docs 01 §art, 04).
- Environmental detail must serve **navigation and atmosphere**: signage, shop windows, fire escapes, street lamps, benches, trash cans, newspaper boxes, pigeons, trees, parking spots, occasional construction, a street vendor. Every prop answers "who does this, and when?" (Doc 33 principle).

### B. Reusable interaction system — **one of the most important deliverables**
- A registry/interface architecture for interactions. **No scattered hardcoded proximity checks in the main loop.**
- Must support: proximity detection, prompt/hint UI, **mobile interaction button**, dialogue options, purchasing, **entering enterable interiors**, sitting/using environmental objects, and canceling an interaction.
- The coffee cart keeps its importance but must **no longer be the only functional focus**.

### C. Functional locations — real playable loops
- At least **2–3 complete playable loops** at added locations. Priority order: **bodega → park → laundromat or diner**.
- Buying something at the bodega must **actually deduct money** (real economy integration with the existing money display and postcard money arc).
- Each loop must be completable without touching the main story.

### D. Player freedom
- Main story + optional side content + free exploration coexist.
- **Never lock player movement**; never force dialogue (except specifically authorized story moments).
- Interactions must not all be gated on story day/flags. A first-session player and a Day-4 player both need things to do.

### E. NPC life
- NPCs move independently, at different speeds, with idle activities; occasionally talk to each other; react to the player and to events; lightweight routines.
- **Continue using Yuka. Do not introduce a new AI framework.**

### F. Choices & consequences
- Characters remember; the block gradually reflects decisions.
- If persistence is needed: **extend the save carefully — Save v1 must stay loadable.** Document the migration strategy and add an old-save loading test.

### G. Time evolution
- Slow evolution: days → weeks → months. The neighborhood is **persistent, not randomly regenerated** between sessions.

### H. Physics integrity
- No walking through buildings/objects; no NPC/vehicle clipping; no permanent stuck states.
- **Do not automatically add Rapier.** First verify the existing collision system can carry the new content; only propose a physics dependency with measured justification.

### I. Mobile-first UI
- **720×1280 portrait is a must-test configuration** for every feature.
- No permanent UI clutter, no tiny touch targets (<44px), no desktop-only assumptions.

### J. Performance
- Use instancing/shared geometry; keep interaction detection cheap (spatial partitioning or squared-distance shortlists — measure, then optimize).
- Record **before/after performance numbers**. Do not claim mobile performance is verified without a measured test; state exactly what was simulated.

---

## 4. Phase order (implement in this order; do not skip ahead)

| Phase | Name | Exit criteria (abbreviated) |
|---|---|---|
| **1** | **Foundation** | Audit (§2) + root-cause analysis written; free-roam loop works (player can wander with no active story beat and it doesn't break); interaction system skeleton (§3B) merged; existing controls & story untouched. |
| **2** | **Neighborhood expansion** | New locations exist with reachable entrances; collisions complete; no giant empty map; navigation reads clearly. |
| **3** | **Functional locations** | 2–3 full location loops playable (bodega/park/laundromat or diner); interactions have real consequences (money moves, state changes). |
| **4** | **NPC life** | Independent NPC behavior + optional conversations + lightweight routines; story-cast behavior unchanged. |
| **5** | **Choices & persistence** | Choices recorded; memories/consequences surface; save extended with v1 compatibility proven by test. |
| **6** | **Polish & verification** | Full test matrix (§6) green; regressions fixed; performance optimized with before/after numbers; mobile & desktop layouts verified. |

Do not superficially rush all six phases. A phase is done when its exit criteria are verified, not declared.

---

## 5. Red lines (violations fail the milestone)

1. No destructive architecture rewrites.
2. No new dependencies without documented justification (and none that duplicate existing stack capabilities).
3. Never report placeholder work as complete.
4. Never weaken tests to make them pass; never change game timing to accommodate tests.
5. No fake interactions (buttons that do nothing real).
6. Do not turn everything into dialogue boxes.
7. No forced task chains.
8. No huge empty map.
9. Do not break character/block continuity.
10. If multiple agents run in parallel: **declare explicit file ownership per agent.** Main loop, world generation, and the pedestrian system are high-conflict files — assign each to exactly one owner at a time.

---

## 6. Test & verification matrix

- [ ] `typecheck` passes
- [ ] Full unit test suite passes
- [ ] Production build passes
- [ ] Existing 4-day story e2e passes unchanged (`AUTOTEST OK: 0 failures`)
- [ ] Free-roam: completing the main story does not require participating in optional content
- [ ] Free-roam: ignoring the main story still allows exploration & interactions (world stays coherent)
- [ ] Optional activities never break story progression
- [ ] Interaction detection (proximity, prompts, cancel) — new e2e coverage
- [ ] Dialogue choices — new e2e coverage
- [ ] Purchase / money accounting — real deduction verified
- [ ] Save v1 compatibility — an old save loads and migrates cleanly (automated)
- [ ] Collision integrity — no clipping through new geometry
- [ ] NPC navigation — no stuck states over a sustained run
- [ ] Activity interactions — each location loop completes via driver input
- [ ] Mobile portrait layout (720×1280 simulated viewport) — all new UI reachable, no overlap

---

## 7. Definition of Done (all 11, verified)

1. The neighborhood is **noticeably bigger** with clear landmarks.
2. **Free exploration** exists without forced scripting.
3. Multiple locations support **real interactions**.
4. **≥ 2–3 location activities** are genuinely playable (not decoration).
5. **Choices exist outside the main story** and have consequences.
6. NPCs feel **alive** (independent movement, optional conversation).
7. Optional content never breaks the story.
8. Old characters and the 4-day story are **fully intact**.
9. Collision & pedestrian reliability maintained at current-or-better level.
10. Mobile performance meets the measured bar (with honest simulation caveats).
11. **All automated tests pass.**

---

## 8. Final report requirements

The closing report must include: starting commit & final commit; architecture changes (or "none"); the location list with per-feature status rated honestly as **Fully implemented / Partially implemented / Visual-only / Planned, not implemented**; performance before/after with methodology; complete test results; dependencies added with rationale; files touched; **known limitations** (including that physical-device testing was not possible in sandbox — simulated viewport only); and next-step recommendations. **Never claim untested functionality works.**

---

## 9. Known leftovers & environment caveats (carry forward, do not silently drop)

1. **Mailbox collider** sits ~0.4m south of the visual mailbox.
2. **Barricade yaw** is an AABB approximation, not exact rotation.
3. One e2e **interaction-timing flake** (rare).
4. **E2E driver one-frame poll race** — investigate and fix during Phase 1 or 6. Do **not** weaken assertions or alter game timing to make it go away.
5. **Sandbox processes are recycled between tool calls** — run e2e/dev servers in the foreground of a single session, or with `setsid nohup` verified in the same session.
6. **No physical device exists in the sandbox.** All mobile results are simulated-viewport (720×1280). Physical-device testing remains an open TODO and must be listed as such in the final report.

---

*Baseline verified at issue time: `27cfad4` (Doc 34 integration merge) with two docs-only commits after it (`e17591f` AGENTS.md §0, `16e4c2c` Doc 33 banner). Start from latest `main`, confirm the SHA you start from, and record it in the final report.*
