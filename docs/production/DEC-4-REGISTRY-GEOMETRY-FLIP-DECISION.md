# DEC-4 — Registry Geometry Flip Decision Brief

**Whether, in what order, and with what fallback the building geometry renders from the registry at runtime (A-3)**

| | |
|---|---|
| Status | **RULED — Option B (the owner, 2026-11-08). CLOSED — A-3 COMPLETE (v1.28.0).** Execution was governed by §6; the wave's state lives in the register (v1.19.0–v1.28.0) and the worklog (PROD-A3-U1…U3, WP-A3-U4…U10). **ALL 50 REGISTRY BUILDINGS render from the registry's own numbers: the six-unit plan wave (W1-C→B→A, W2-C, W3-D, W3-C — 31 rows), then the shipped street's C/B/A bands and the far world (units 7–10 — the continuation series, bulk-closed under the owner's directive). The Phase-3 DoD's geometry line met and exceeded. Per §6.4: the last hero band flipped; the R-NEW-16 gate retires into the validator's routine work — the value-neutral pin (the acceptance suite + the census pair law) remains the standing guard.** The brief's analysis below stands as filed. |
| Author | Production Director (engineering adjudication), for the project owner |
| Date | 2026-11-07 |
| Question | **A-3 — the registry geometry flip:** building geometry currently loads from hand-transcribed `World.ts` builders while the registry (`docs/data/world-registry.json`) tracks the same facts as construction truth. Flip the render source to the registry? Which districts/classes flip, in what order, with what fallback? |
| Method | Primary-source reading of `MASTER-GAME-ROADMAP.md` (Phase 3 objectives/DoD), `PRODUCTION-RISKS-AND-DEPENDENCIES.md` (DEC-4, R-NEW-3, R-NEW-15, R-NEW-16, DEF-1/B13), the reconciliation report §8 (WP-A3), `docs/architecture/world-contract/07` §7, the live registry JSON, `World.ts`, `skyline.test.ts`, and the register's perf ledger — every number below re-measured or re-read in this audit, not carried from agent reports. |
| Ruling path | On owner approval, WP-A3 executes per §6 (district-by-district behind the fidelity gate). A "no" (Option C) records the drift gates as permanent guards and re-files the flip at DEC-8. |

---

## 0. The question, stated precisely

The world's buildings exist **twice**: as data in the registry (50 building records — `footprint {x,z,w,d}`, `height`, `floors`, class A–D, `style` with code refs, `entrance`, `interior`) and as hand-transcribed geometry in `World.ts` (**6,754 lines measured 2026-11-07** — the risks doc's 6,556 predates the interiors batch). The seam between the two truths is real and already bit once: the graph-vs-world drift class is guarded today by **two permanent gates** (R-NEW-15: routed-commute windows re-measured and pinned; R-NEW-16: the mjs construction validator + TS runtime validation + probe-nav on the built dist). The nav graph, the door/access model, and the capacity gates (A-1/A-2, merged and verified) **already read the registry live** — the semantic half of the registry is flipped; only the *render* geometry is still double-tracked.

The flip (A-3) makes `World.ts` derive each building's placement and dimensions **from the registry at runtime**, rendering through the existing per-style builder code the registry's `style` field already references (`code ref Bldg_N_West` et al.). Coordinates become single-truth; the look keeps its authored builders. E-1 (merged, `3d72d9b`) already proved the data half: the first building-variant pack — all 19 shipped registry buildings — validates clean through `validateManifest`.

## 1. Verdict summary

**The flip is the roadmap's written direction** (MASTER-GAME-ROADMAP Phase 3: "geometry flip landed for at least the W0/W1 districts with the fidelity gate green"; the risks doc's own default: "flip district-by-district behind the fidelity gate, starting W0/W1"). Its blockers have all cleared: A-1/A-2 done, the perf re-baseline done (drawCalls 119/184/256, zero drift), E-1's pack validated. What remains is a **risk-sequencing call**, and the honest reading of the evidence says: the machinery is ready, the *order* should follow visual risk, not district index.

**Recommendation: Option B — approve the flip, sequenced class-first (backdrop C/D before hero A/B) inside the district-by-district order, behind the fidelity gate.** Same destination and machinery as the roadmap default; the risk lands where a defect cannot touch a hero surface first. Option C (defer) is the only choice that leaves `World.ts`'s 6,754-line concentration (R-NEW-3) and the drift class (R-NEW-15/16) permanent while pricing every future district higher.

## 2. The evidence

| Fact | Number | Source [all re-verified 2026-11-07] |
|---|---|---|
| Registry buildings | **50 records**, footprint/height/floors/class/style+code-ref/entrance/interior | `docs/data/world-registry.json` [read] |
| `World.ts` | **6,754 lines**; district builders `buildAlderHeightsW1/2/3/4Life/4Traffic/5`; W0 = the district/culling system (docs/45) | `web-three/src/world/World.ts` [measured] |
| Drift guards today | R-NEW-15 (routed-window pinning) + R-NEW-16 (mjs gate, TS runtime validation, probe-nav on dist) — both green, both permanent while the double truth exists | risks doc §2 [read] |
| Perf ledger baseline | drawCalls **119/184/256 zero drift** (v1.5.0 re-baseline); dressed rooms 76–209 parked, boot 145 portrait (v1.16.0); **B13 open**: PLAZA 302 / CART_CORNER 236 / SYCAMORE 84→78 / TIMES_SQ 52 / PLATFORM_A 108 | register Gates + DEF-1 [read] |
| Data half proven | E-1 building-variant pack: 19/19 registry buildings validate; `validateManifest` zero issues | register v1.13.0 [read] |
| Semantic half flipped | nav graph 401 nodes/444 edges seeded from the registry; `door:<id>` access; capacity gates — all consuming registry data live | register v1.14.0/v1.15.0 [read] |
| Fidelity bar's testable core | seeded determinism — "the same seed draws the same city" (lit windows) | `skyline.test.ts` [read] |
| Current tree health | tsc clean · vitest **1020/1020** (69 files) · build OK — re-executed on `ec4dc6f` this audit | [executed] |

## 3. Options

### Option A — full flip, district-by-district (the roadmap default)
Per district (W1 → W2 → W3 → W4 → W5; W0's district system is the vehicle, not a target): iterate `registry.buildings[]`, render each through its style's code-ref builder at the registry footprint/height, retire the hand-transcribed coordinates. Fidelity gate green per district before the next starts.
- **For:** the roadmap letter; single-truth coordinates for everything at once; `World.ts` shrinks fastest.
- **Against:** W1 is the hero street — the riskiest surfaces flip first; one facade defect in the arrival block is player-visible immediately.

### Option B — class-ordered flip, backdrop first *(recommended)*
Identical machinery and end state; inside each district, flip **class C/D backdrop masses first** (the anonymous skyline majority — where a geometry defect is cheapest to catch), **class A/B heroes last** (terminal, Rosa's deli, the court facades, the W5 interiors' host rooms), each step behind the same fidelity gate.
- **For:** risk-ordered; the fidelity bar proves itself on surfaces no story beat touches before it ever faces a hero; same single-truth payoff; the seeded-skyline tests + parked-camera pairs give per-step pass/fail.
- **Against:** slower to finish the hero districts; two regimes coexist inside a district until its heroes flip (the R-NEW-16 gate stays on for those until then — it is built for exactly that).

### Option C — defer the flip
Keep the double truth; R-NEW-15/16 remain the permanent guards; re-file at DEC-8 (second district).
- **For:** zero regression risk today.
- **Against:** leaves R-NEW-3 (6,754 lines, every feature wants it) and the drift class permanent; makes DEC-8's second district cost **double bookkeeping again** (registry + hand geometry, both gated); contradicts the roadmap's own Phase-3 DoD; the E-1/variant-pack direction (content waves building through the registry) eventually forces this flip anyway, from a worse starting line.

## 4. Consequences by option

| Dimension | A | B (rec.) | C |
|---|---|---|---|
| Visual identity risk | highest-first (heroes in W1) | lowest-first (backdrops) | none today, permanent exposure later |
| `World.ts` concentration (R-NEW-3) | shrinks fastest | shrinks, hero code last | grows (every wave adds) |
| Drift class (R-NEW-15/16) | dies at W5 | dies per building as flipped | permanent |
| Draw calls / B13 | must hold the ledger per step (gate) | same, measured per step | no change; B13 stays owner's call |
| DEC-8 (second district) | cheap — registry-first | cheap | expensive — duplicate bookkeeping |
| Saves | none — geometry is code, not save data; `first_slice_world_v1` keys untouched | same | same |
| Nav / access / schedules | unchanged — they already read the registry and are pinned by tests | same | same |
| Canon / narrative docs | untouched | untouched | untouched |
| New dependencies | none | none | none |

## 5. Recommendation

**Rule Option B: the A-3 flip is approved in principle, executed class-first inside the district order (C/D backdrops before A/B heroes), district-by-district behind the fidelity gate, starting W1's backdrops.**

- The flip moves **coordinates and dimensions** to the registry; the **style builders stay** — the skyline's seeded lit windows, vertex-fused facades and code-ref looks are code, and they are not the thing being flipped.
- The owner-gated visual bar stays exactly as written: **"identical skyline at the ledger budget"** — evidenced per step by the parked-camera screenshot pairs + the seeded-skyline tests, with the final bar owner-side.
- The per-style fallback law: a registry building whose style has no builder code-ref fails `validate` loudly — **the flip never invents geometry to fill a gap** (wc-07's no-coordinates law, extended to rendering).

**This brief does not decide.** Nothing has been flipped, no source file touched, no branch moved. Execution (§6) begins only after the owner's explicit approval.

## 6. Required changes upon approval (WP-A3, none executed now)

1. **Per flipped unit (district × class band), one revertible commit series:** registry-driven construction path → hand-transcribed rows retired for that band only; the R-NEW-16 gate stays live for every not-yet-flipped building.
2. **The fidelity gate, re-pinned as the load test** (per unit, all green before the next unit starts): `validate-registry.mjs` + runtime registry validation zero new issues · `skyline.test.ts` green · parked-camera screenshot pair (pre/post) filed under `docs/production/` evidence · **draw-call ledger: no rig above its previous row** (probe-perf re-run, byte-comparable) · probe-integration PASS · probe-nav 9/9 · probe-world-sim 15/15 · 4-day E2E 0 failures.
3. **R-NEW-15's window pinning re-verified** after each district (routed distances must not move — they cannot, the registry is already the nav truth, which is the point).
4. **Register + worklog in the same commit** per unit; MS-2's geometry-flip half ticks per district; A-3 closes when the last hero band flips and the R-NEW-16 gate retires into the validator's routine work.
5. **Rollback posture:** per-unit revert (the plan's rollback law); a red gate stops the wave — no district rolls forward over a red fidelity bar.

## 7. What this ruling does NOT authorize

No new dependency; no borough/district expansion (DEC-8 stays owner-gated); no registry data invention; no B13 resolution (stays the owner's priced call — the flip must merely hold the ledger); no nav/access/schedule behavior change; no save schema change; no narrative doc edits; no `World.ts` rewrite beyond the flipped bands.

---

## Appendix — evidence log (executed for this brief)

| # | Check | Result |
|---|---|---|
| E1 | `wc -l web-three/src/world/World.ts` | 6,754 (risks doc's 6,556 predates the interiors batch — row refreshed) |
| E2 | registry JSON read | 50 buildings; footprint/height/floors/class/style+code-ref/entrance/interior confirmed |
| E3 | `World.ts` builder survey | `buildAlderHeightsW1` L4347 · W2 L4908 · W3 L5288 · W4Life L1913 · W4Traffic L2215 · W5 L2423; W0 = district/culling system |
| E4 | risks doc re-read | DEC-4 default, R-NEW-3/15/16, DEF-1 B13 rows as cited |
| E5 | `skyline.test.ts` read | seeded-determinism guards ("the same seed draws the same city") |
| E6 | roadmap Phase 3 DoD re-read | "geometry flip landed for at least the W0/W1 districts with the fidelity gate green" |
| E7 | floor gates on `ec4dc6f` [executed] | tsc clean · vitest 1020/1020 (69 files) · build OK (625 ms) |

---

*— Production Director, 2026-11-07. **This brief ends here and waits: the project owner's explicit approval is required before WP-A3 begins.***
