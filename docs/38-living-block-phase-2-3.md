# Doc 38 — Living Neighborhood: audit, root causes, and the Phase 2–3 build record

> Companion to [Doc 37](37-living-neighborhood-milestone-brief.md) (the active milestone contract).
> Doc 37 §1 rule 1: *audit before building*. This is that audit, the root-cause analysis,
> and the honest build record for Phases 2–3. Baseline: main @ `b1a6bdb` (Phase 1 merged).

---

## 1. Audit — the block as Phase 1 left it

| System | State at `b1a6bdb` |
|---|---|
| **World & boundaries** | One block: x ∈ [−48, 48], z ∈ [−22, 22.5], invisible walls on all four edges. Street z ∈ [−4, 4] (cab rail z = −2), sidewalks z ∈ [4.3, 8] N / [−8, −4.3] S. Walkable: street, both sidewalks, bodega interior (z 8–19.8), fire escape, roof. |
| **Movement & camera** | Capsule + wall-slide (`engine/collide.ts`); 3/4 follow camera with canopy/roof sight-line guards; keyboard + touch parity (`Input.ts`). |
| **Collision** | Static AABB list + dynamic AABBs (taxi, cast, peds, cart, stool, barrier). No physics engine — Doc 37 §3H verified: existing system carries the content. |
| **NPC / Yuka** | `peds.ts` uses Yuka steering on three authored waypoint loops (commuter / window shopper / south local) with bow-around obstacles; cast (Rosa, Idris, kid, stranger, Sal, familiar) is authored in Game.ts sequences. |
| **Interaction** | The Phase-1 registry (`game/interactions.ts` + `interactionDefs.ts`) — one proximity pass, declarative records. Free-roam set: bus bench sit, board/newsbox/subway reads, shelf shop with finite stock. |
| **Story machine** | `Step` enum 0–32, day-keyed content via `byDay`, Effect list applied by the orchestrator. 4-day E2E driver is the regression proof. |
| **Save** | v1 schema, `buyConfirm` transient, purchases ride `money`. v1 boots on any day (probe-verified in Phase 1). |
| **UI / mobile** | HUD (money/objective/verb-prompt/note), mobile interact button; 720×1280 portrait is the probe viewport. |
| **Traffic** | One cab on a rail (z = −2), braking curve + lateral yield (`engine/traffic.ts`). |
| **Tests** | 14 vitest suites + `scripts/e2e.mjs` (~5 min, `AUTOTEST OK: 0 failures`) + 40 probe scripts. Known leftovers carried in Doc 37 §9. |

## 2. Root causes of the scripted feeling (why the block had nowhere to go)

- **RC1 — the block's east ends are blank.** Every functional thing (bodega, laundry, cart,
  plaza, bus stop) sits west of x ≈ 10. East of the crosswalk the sidewalks are flat faces:
  one decorative pizza storefront, then nothing until the wall. Free-roam had no
  *destinations* — the registry could answer, but there was nothing to walk to.
- **RC2 — the free-roam verb set was reads-and-one-shop.** Sitting existed on one bench;
  buying existed on one shelf; nothing moved, nothing was playable.
- (RC3 — interactions were story-gated everywhere — **fixed in Phase 1** and not regressed here.)

## 3. Phase 2 — neighborhood expansion (what was built)

All new content lives east of x = 29, on land no authored beat, ped route, or E2E path uses.
Compact, rich, zero new dependencies, palette per Doc 04.

| Location | Placement | Notes |
|---|---|---|
| **Fade King Barbershop** | North face, x 34.1–39.1 (storefront + striped pole) | Facade service point; clears the tree at x = 32 and the relocated planter. |
| **The alley (hidden corner)** | x 30.7–33.5, z 8–10.6 — a real cut into `Bldg_N_East_B` (the box is split in two; the alley is a 2.8 m slot with a 3 m ceiling and open sky above) | Day-keyed note; Station the cat is in there some days (the bulletin board's lost cat). |
| **Corner Park** | South-east, x 30.6–47.5, z −8…−4.3: iron fence + gate, lawn, gravel path, two benches (one sittable), Parks-dept sign, trash can, the planter relocated from (37, 7.6) | Existing hydrant (34, −4.75) and tree (38, −7) stay — the park keeps them. |
| **Basketball half-court** | North-east, x 40–47.5, z 4.3–8: painted key + arc, hoop (pole/backboard/rim) against the building face | Commuter ped turns at x = 38; court is ped-free. |
| **Dirty-water dog cart (street vendor)** | South curb, (29.8, −4.55), amber umbrella | Real purchase (Phase 3). Cab lane clearance verified (2.55 m lateral). |

**Collision integrity:** every solid new mass gets an AABB (fence segments, benches, hoop
pole, vendor cart, alley walls, trash can, relocated planter). The planter's ped bow-around
entry moved with it (doc 35 §3's ghost-car lesson). Barber pole/signs stay air like the
existing poles. **Ped routes untouched:** commuter turns at x = 38 N / x = 26 S — no ped
enters any new collider; no route edit, no new stuck-state surface.

## 4. Phase 3 — functional loops (what is playable)

All loops work on **Day 1 before any story beat** (nothing is day-gated), all money moves
through the real `GameState.spend()` (HUD pulses, day-end save carries it), all purchases
use the established confirm gate. **No save schema change** — new state is transient.

| Loop | Interaction | Consequence |
|---|---|---|
| **Park sit** | `park_bench` — Sit a while / Stand up | Day-keyed bench line; capsule parks on the seat (same sit system as the bus bench). |
| **Shoot around** | `court` — Shoot around (repeatable) | Deterministic day-seeded make/miss (`hoopOutcome`), streak lines, ball arcs and rests. Free; the hoop keeps score in notes, not UI. |
| **Dirty-water dog** | `hotdog` — offer → buy, $2 | Real deduction; day-keyed street line. |
| **The trim** | `barber` — offer → buy, $12 | Real deduction; a transient `trimToday` flag flips the prompt and the second-visit line for the rest of the day. |
| **The alley** | `alley` — Peek into the alley | Day-keyed read; some days the cat is there. |
| **Do a load** | `washer_free` — offer → buy, $3 (laundromat, free-roam) | Real deduction; the near washer spins ~6 s on its existing visual path, then a day-keyed done line. **Disabled during the Day-4 story beats that own the bay** (D4_LAUNDRY / D4_PERMIT) — the story keeps its hands. |

## 5. Verification (honest ledger)

- `typecheck` + full vitest suite: green (new `interactions.test.ts` blocks cover every
  gate above, including broke paths and the washer's story-step exclusion).
- `probe-freeroam.mjs` extended (pass 3): the whole new block exercised live at
  720×1280 — alley read, park sit/stand, a shot, hot dog + trim + wash with real
  deductions verified against the money HUD.
- Full 4-day E2E: `AUTOTEST OK: 0 failures`, clean console — story untouched.
- **Not claimed:** physical-device performance (no device in the sandbox — Doc 37 §9.6);
  new geometry is merged into the existing static bake tiles, so the draw-call delta is
  the bake's business, stated in the final milestone report.
