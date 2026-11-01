# External Blueprint Review — Qwen "Master World Design" vs our docs/39–45 package

*Reviewer: Agent 3 (world-design reviewer) · Date: 2026-11-01 · Scope: comparison + adoption decisions only. The Qwen document is NOT committed to the repo (its suggested path `docs/40-master-world-design.md` would also collide with our `docs/40-building-catalogue.md`).*

*This review is the record behind commit `70b833b` — the four adoptions (§3) landed on main with that commit; the Qwen source document itself stays external.*

---

## 1. Verdict

**Keep ours. Steal 4 things (done, committed). Reject the core layout — it is incompatible with the shipped game.**

The Qwen document is a competent *template* (clean section discipline, per-phase deliverables, an explicit approval gate) written against a **stale baseline (`b1a6bdb`, Phase 1)** — it never saw Phases 2–5 (Fade King, Corner Park, the alley, the court, the dog cart, walker routines, save counters). Worse than being merely outdated, it **silently redesigns the shipped world** while claiming the milestone's own preservation language. A blueprint that cannot contain the game it blueprints is not a master plan; it's a restart proposal wearing one's clothes.

## 2. The fatal incompatibilities (why we don't adopt its layout)

| # | Qwen decision | Shipped reality (validated in our registry) | Damage if adopted |
|---|---|---|---|
| 1 | World bounds **x ∈ [−32, 64]** | Shipped world spans **x −50..50** (terminal building at −50..−21, subway plaza at −47.5, plaza trees at −45) | The bounds **orphan the terminal, the plaza, and the west third of the block** — the Day-1 arrival and the stranger's bench are outside the map |
| 2 | Rosa's bodega moved to (−12..0, −12..0), 2 floors, corner of Sycamore×Waverly | ROS-01 at x −21..−11, z 8.2..19.8; shelf interaction at (−18.5, 13.5); `insideBodegaZone` at (−16, 14); Rosa's spawn; E2E hauls through the door gap x −17.5..−14.5 | Breaks the interaction registry, the story spawns, the E2E driver, and every saved postcard frame |
| 3 | Cab rail "adjusted to Z = 2" | Shipped rail z = −2, x −46..46, with the crosswalk courtesy hold, braking curve, and yield-pool tests built on it | Rewrites the traffic brain's geometry + its tests for zero gain |
| 4 | Fire escape on the brownstone's **rear (Z = −28)** | The climbable escape is the **front** face of Bldg_S_FireEscape (landings x 10..16, ladders x 9.4/16.4); ladder triggers + descent logic are shipped canon | Deletes the game's oldest climbing system and the dusk beats bound to it |
| 5 | Baseline audit says "no Fade King/park/court/alley" then catalogs them at *approximate* new positions | All exist at exact shipped coordinates (barber x 34.1–39.1, court x 40–47.5 z 4.3–8, alley x 30.7–33.5, park x 30.6–47.5, dog cart 29.8,−4.55) | Silent re-placement of Phase 2–3 content = exactly the "random expansion" failure the milestone exists to end |
| 6 | 8 buildings total; 1 avenue (8 m wide, same as the cross street); no bus terminal; no second subway entrance | 43 registered buildings; avenues 24 m vs streets 16 m (1811 ratio preserved); terminal + twin K-globes + M121 loop | Massive scope reduction + the arrival location is missing entirely; avenue/street hierarchy (the thing that makes a grid read as NYC) is lost |

**Structural note:** its 2×2 grid centered on ONE intersection is a legitimately tidy idea for a from-scratch city — but our milestone law ("preserve the story, the identity, the shipped systems") forces the shipped block to remain the anchor, and a one-intersection world cannot contain a 100 m shipped street.

## 3. What we stole (now committed to the repo)

| # | Adoption | From | Where it landed |
|---|---|---|---|
| 1 | **The ghost gate** — after footprints land (W1–W3), verify them in-engine as a massing pass (deltas < 0.1 m per ID, fire-escape sight-line screenshot, skyline edges) *before* any detail/interior work | Qwen §9 Phase 2 ("Ghost block… validation: sightlines from player's fire escape") | `docs/45` §4 Verification matrix |
| 2 | **Interior render culling** — interiors render only when the player is inside or the camera sees through the glass | Qwen §8.3 | `docs/45` §1 W5 exit criteria |
| 3 | **The small-wear pass** — fire escapes with one honest prop (potted plant / drying towel), AC units varying in state, torn flyer layering (old slip under the new), hand-chalked alley note (their "subtle graffiti," filtered through Doc 04's "warm, never gritty" law) | Qwen §6.3 | `docs/43` §5 Environmental storytelling |
| 4 | **Diegetic boundaries** — every world edge carries a named, in-world excuse, not just a card ("a boundary the camera can explain is a boundary the player never tests") | Qwen §2.1 (themed soft/hard boundaries) | `docs/39` §2 (four edges named: the heights / Marlow step-down / two avenue glows) |
| 5 | **Window-gaze beat** — one quiet home interaction letting the skyline moment land (adopted as a reserved beat for the lead's Days-5+ writing; explicitly NOT the sleep-to-advance-day mechanic that came with it — day transitions belong to the step machine + postcard ritual, and a second day-end point would split the E2E's ending contract) | Qwen §4.2 | `docs/41` §2.5 CECIL-ROOM |

## 4. What we evaluated and rejected (with reasons)

| Qwen item | Why rejected |
|---|---|
| **Draco + KTX2 compression** (§8.3) | Our geometry is procedural (boxes/cylinders, banked materials) and textures are tiny CanvasTextures — compression codecs would be two new dependencies (Doc 37 red line 2) for a measured gain of approximately zero |
| **"Player should use a capsule collider"** (§8.1) | Already shipped — `Player.ts` capsule + `collide.ts` wall-slide/STEP_UP; the doc's own audit listed "static AABB list" (the world side) and missed the player side |
| **"Use InstancedMesh / static batching / dynamic exclusion"** (§8.3) | Already shipped: `bakeStatics` merges per tile, pigeons/leaves are instanced, the ball + barrier are on the bake exclusion list — the doc re-proposed our own pipeline back to us |
| **"Asphalt with subtle cracks, sidewalks with expansion joints"** (§6.2) | Texture noise conflicts with Doc 04's flat-shaded law ("surfaces carry color and light, not noise") |
| **Back room in the bodega as a "Day 2 story beat"** (§4.1) | Day 2's beat is the favor/teal door; inventing a back-room beat rewrites the story machine for no brief |
| **Wall-clock phase schedule ("Week 1–8")** (§9) | Meaningless in an agent workflow; our phases exit on verified criteria, not calendars |
| **Self-ticked final checklist** (§11) | Pre-ticked checkboxes grade themselves; our package proves claims mechanically (validator + generated maps + massing tool) |
| **Flat LOC-/INT- markdown registry table** (§7) | Unmachine-checkable; ours is JSON + a validator that byte-checks the shipped world and re-renders the maps |

## 5. Scorecard (honest, side by side)

| Dimension | Ours (docs/39–45) | Qwen | Winner |
|---|---|---|---|
| Shipped-world preservation | 12 masses + 18 anchors byte-validated; origin unmoved | Relocates bodega, laundry, fire escape, cab rail, crosswalk | **Ours** |
| World completeness | 5 streets, 6 intersections, 43 buildings, transit, 13 NPC zones | 2 streets, 1 intersection, 8 buildings, subway only | **Ours** |
| Scale/typology research | 1811 Plan ratios, rowhouse lots, tank sizes, licence table | Style names + material list, no sources | **Ours** |
| Machine-checkability | JSON registry + validator (116 IDs) + generated maps/massings | Markdown tables, self-ticked checklist | **Ours** |
| Performance honesty | Measured baseline (402 calls vs 150 budget), W0 prerequisite, per-phase census gates | Best-practice list (partly already shipped), no numbers | **Ours** |
| Process template | Verified exits, file-ownership rules, risk table | Ghost-validation gate, per-phase deliverables, owner-tagged TBDs | **Split** (we took the ghost gate) |
| Readability as a pitch | Longer, data-dense | Tighter, friendlier section rhythm | **Qwen** (a fair point — our docs/39 opens with the map to compensate) |
| Player-home as loop space | Room + roof reservation (stage 5) | Sleep-advance + window-gaze + Map-read | **Split** (took the gaze; rejected the sleep) |

## 6. Bottom line

The exercise was worth it: four concrete adoptions (ghost gate, interior culling, small-wear pass, diegetic boundaries) plus one reserved beat, all committed with provenance. The Qwen layout itself is unrecoverable for this project — not because it is *badly designed in the abstract* (its quadrant diagram and phase discipline are fine), but because it was built **without reading the shipped world**, which is the single failure mode this milestone was issued to end. Our package's decisive edge is exactly that: the registry is checked *against the code*, and the code always wins.

*Adoption commits land on main alongside the design package; the Qwen text stays out of the repo.*
