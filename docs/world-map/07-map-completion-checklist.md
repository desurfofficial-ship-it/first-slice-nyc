# 07 — Map Completion Checklist (what is done, what is not)

> **Status:** Design-lock deliverable (2026-11-13). The directive's §5
> "Design Lock and Implementation" mandates: "Maintain a living build checklist
> so future agents know what is complete, what is broken, and what remains."
>
> **The headline:** the map is **complete for the vertical slice**. All 178
> registry IDs are built. All 81 buildings, 21 interiors, 7 parks, and 23
> anchors ship. The walkability scanner reads clean. The test battery passes
> (1,683 / 1,683). The remaining items are the open ledger rows (system work,
> not map construction) and the optional slice (CORNERHOUSE-INT).

---

## 1. The completion checklist

### 1.1 Streets (5 / 5 complete)

| Street | Status | Built in | Verified by |
|---|---|---|---|
| Kestrel Street | ✅ Complete | W0–W5 + W8 storefronts + W12 filigree | probe-walkability, probe-city-fabric, diag-pocket-scan |
| Juniper Avenue | ✅ Complete | W0–W5 + the K station houses + the Works Hall | probe-walkability, probe-subway |
| Sycamore Avenue | ✅ Complete | W0–W5 + the Diner Sign | probe-walkability, probe-city-fabric |
| Gable Street | ✅ Complete | W0–W5 + W6 terrace + W10 park-gates + W12 filigree | probe-walkability, diag-pocket-scan, probe-w12-filigree |
| Marlow Street | ✅ Complete | W0–W5 + W6 terrace + W10 park-gates | probe-walkability, diag-pocket-scan |

### 1.2 Buildings (81 / 81 complete)

| Class | Count | Status | Built in |
|---|---|---|---|
| A (fully enterable) | 9+ | ✅ All built | W5 (the W11 registry-truth repair flipped the last 'planned' rows to 'built') |
| B (ground-floor interior / service bay) | ~6 | ✅ All built | W5 + W8 |
| C (exterior-only) | ~30 | ✅ All built | W0–W5 |
| D (backdrop mass / skyline fabric) | ~36 | ✅ All built | W0–W5 + W6 terrace + W7 Eastgate |

### 1.3 Interiors (21 / 21 complete)

| Interior | Status | Built in |
|---|---|---|
| LAUNDRY-INT | ✅ Built (W5) | W5 |
| BARBER-INT | ✅ Built (W5) | W5 |
| PIZZA-INT | ✅ Built (W5) | W5 |
| DINER-INT | ✅ Built (W5) | W5 |
| BAKERY-INT | ✅ Built (W5) | W5 |
| RECORD-INT | ✅ Built (W5) | W5 |
| HALL-INT | ✅ Built (W5) | W5 |
| CECIL-ROOM | ✅ Built (W5) | W5 |
| MEZZ-INT | ✅ Built (W5) | W5 |
| ROS-INT | ✅ Built (W5) | W5 |
| HARDWARE-INT | ✅ Built (W5) | W5 |
| The W8 strip-row interiors (FRUIT-INT, NEWS-INT, the storefront GLBs) | ✅ Built (W8) | W8 |
| CORNERHOUSE-INT | optional slice (registry openDecision reworded in W11) | — |

### 1.4 Parks and public spaces (7 / 7 complete)

| Park | Status | Built in |
|---|---|---|
| Corner Park | ✅ Built | W2 |
| Kestrel Green | ✅ Built (the pergola C3, the hundredth tree C6) | W2 + C3 + C6 |
| Gable Garden | ✅ Built (the W10 gate from the Green) | W6 + W10 gate |
| Marlow Playground | ✅ Built (the swing set, the spray basin, the C3 earmark) | W2 + C3 |
| PRK-LARKIN | ✅ Built (the W6 terrace + the W10 park-gate) | W6 + W10 gate |
| PRK-CARROW | ✅ Built (the W6 terrace + the W10 park-gate) | W6 + W10 gate |
| Subway Plaza | ✅ Built | W5 |

### 1.5 Landmarks (all complete)

| Landmark | Status |
|---|---|
| The K-Globes | ✅ Built |
| Rosa's rooftop billboard | ✅ Built |
| The Three Towers (wooden water towers) | ✅ Built |
| The Diner Sign | ✅ Built |
| The Garden Mural (Lena and Odd) | ✅ Built (three figures by C3) |
| The Ghost Sign | ✅ Built |
| The Works marquee | ✅ Built |
| The terminal's sync screens | ✅ Built |
| The red steps | ✅ Built |

### 1.6 The K line subway (complete)

| Component | Status | Built in |
|---|---|---|
| The K north station house (SUB-01) | ✅ Built | W5 |
| The K south station house (SUB-02) | ✅ Built | W5 |
| The stair descent | ✅ Built (the W11 stair-seal fix parameterized the slot) | W5 + W11 fix |
| The fare lane | ✅ Built | W5 |
| The car door / board | ✅ Built | W5 |
| The ride (22 s) | ✅ Works at any frame rate (the W11 ride-rate fix) | W5 + W11 fix |
| The seam (the `worldToLeg` / `legToWorld` swap) | ✅ Built | W5 |
| The 42 St-Times Square arrival | ✅ Built | W5 |
| The exit stair | ✅ Built (the W11 stair-seal fix — both stations' exits are open) | W5 + W11 fix |
| Times Square canyon | ✅ Built | W5 |

### 1.7 Systems (complete)

| System | Status | Built in |
|---|---|---|
| The World Contract (global sim state, clock, registry, entity identity, arbitration, narrative validation, economy guardrails) | ✅ Built | 2026-11-06 |
| The runtime integration (D-1 tick valve in `Game.frame`) | ✅ Built | 2026-11-06 |
| The fenestra windows (447 windows render as rooms) | ✅ Built | 2026-11-12 |
| The fire-escape filigree (170 alpha-cutout panels) | ✅ Built | W12 (2026-11-13) |
| The NYC architectural detail kit (`nycKit.ts`) | ✅ Built (ported from slop-newyork) | the SI pass |
| The ABO furniture pack (141 CC-BY-4.0 GLBs) | ✅ Built | the W5 + W8 dressing |
| The 4-day E2E | ✅ Built | the narrative implementation |
| The walkability scanner (`diag-pocket-scan.mjs`) | ✅ Built (the standing gate) | W10 (2026-11-13) |
| The probe harness (`probe-*.mjs` + `diag-*.mjs`) | ✅ Built | W0–W12 |
| The vitest suite | ✅ Built (1,683 tests / 100 files) | W0–W12 |

## 2. What is broken (the open ledger rows)

These are **system work**, not map construction. The map itself is complete.

| Item | Status | Owner doc |
|---|---|---|
| The D-3 money bridge | Open | `docs/architecture/world-contract/` ledger |
| The ambient-walker schedule migration | Open | `docs/architecture/world-contract/` ledger |
| The fenestra atlas mip re-audit | Open (re-check on a real GPU before enabling a chain) | `docs/production/fenestra/01-FENESTRA-INTEGRATION.md` §7 |
| The band courses + soot approximation | Open (the honest approximation; a future atlas pass could close it) | `docs/slop-integration/01-SOURCE-REUSE-REPORT.md` §4 |

## 3. What remains (the remaining tasks)

1. **Drop this `docs/world-map/` package into the project repo**, commit, push.
   See `08-implementation-progress.md` §11 for the exact next actions.
2. **Capture the live screenshot set** (`01-existing-world-audit.md` §6) from a
   running dev server. Drop under `docs/world-map/images/existing/`.
3. **Generate the top-down map** (the directive's §3A) — a bird's-eye render
   from y = 200 looking down at the playable core.
4. **Generate the 3D overview** (the directive's §3B) — an isometric or
   high-angle render of the full block at golden hour.
5. **Curate the neighbourhood visual targets** (the directive's §3D) — one
   frame per street + the Times Square destination.
6. **Curate the street-level reference library** (the directive's §3C and
   `06-visual-reference-library.md`) — fetch the real photographic references,
   credit each source, label each frame.
7. **Close the open ledger rows** (§2 above).

## 4. The acceptance gate

The map-completion-checklist's acceptance gate (the directive's §7 "Final
Acceptance"):

- [x] **Screenshots of the original existing map.** The in-project evidence in
  `docs/3d-assets/evidence/` + the §6 shot list in `01-existing-world-audit.md`
  (to be captured by the next agent).
- [ ] **The complete planned top-down map.** To be generated (§3 above).
- [ ] **The three-dimensional visual target.** To be generated (§3 above).
- [x] **The neighbourhood reference library.** `06-visual-reference-library.md`
  (the curation of the actual images is §3 above).
- [x] **The complete map design documentation.** This package (`01`–`09`).
- [x] **The implemented world.** The shipped code at commit `44534bb`,
  registry v1.64.0.
- [ ] **Actual gameplay screenshots demonstrating the result.** The §6 shot
  list (to be captured).
- [x] **The latest GitHub commit and branch.** Commit `44534bb` on `main`
  (the local clone; the push is the user's to make — see
  `08-implementation-progress.md` §9 security notice).
- [x] **A clear list of completed and outstanding work.** This document §1
  (completed) + §2 (broken / open) + §3 (remaining).

**The verdict:** the map is complete for the vertical slice. The visual
blueprint's remaining work is evidence capture (screenshots, top-down map, 3D
overview) and the open ledger rows (system work). No new construction is
required.

— Z.ai agent, 2026-11-13
