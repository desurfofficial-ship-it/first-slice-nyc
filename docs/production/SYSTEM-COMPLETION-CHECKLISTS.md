# SYSTEM-COMPLETION-CHECKLISTS — FIRST SLICE

| | |
|---|---|
| Status | Active — per-system implementation and verification law |
| Owner | Production Director (keeper) · each system's owning workstream keeps its rows honest |
| Law | "Do not create meaningless checklists." Every checklist below is measurable and every status carries evidence. "Make NPCs better" is not a row; "arbitration claims drive walker destinations, pinned by a clock-day probe at 07:40/22:00" is. |
| Statuses | NOT STARTED / PLANNED / IN PROGRESS / IMPLEMENTED / INTEGRATED / VERIFIED / BLOCKED — see [README.md](README.md). Baseline statuses were audited 2026-11-06 at git `69f8327` + branches; the live truth lives in [PRODUCTION-STATUS-REGISTER.md](PRODUCTION-STATUS-REGISTER.md). |

Evidence sources used for baseline statuses: source audit of `web-three/src/` (27,858 lines TS, all modules read), test audit (45 files / 660 tests), harness audit (122 scripts), branch diffs, the worklog, and the legacy/world-contract/narrative docs. File paths are relative to `web-three/` unless they start with `docs/` or `assets/`.

---

## 1. World and environment

### SYS-WORLD-01 — World topology & spatial registry
**Today:** `docs/data/world-registry.json` is construction truth (129 IDs: 43 buildings designed / 12 shipped masses, 5 streets, 5 parks, 10 interiors, 18 anchors — validator green). Typed runtime half exists on the world-contract branch: `src/sim/registry.ts` (load, queries, cross-ref validation). The running game uses **hand-transcribed coordinates** (`src/world/World.ts`, `src/engine/busRoute.ts`, `src/world/subway/stationKit.ts`) with tests + ghost probes guarding drift. Status: IMPLEMENTED (data + sim) / INTEGRATED (as data + guards, not as runtime source).
**Checklist:**
- [ ] Registry typed load + validation on main (lands with the Phase-1 merge)
- [ ] Semantic queries find canon places (`sim-registry.test.ts` pattern) on main
- [ ] Anchors catalogued as `obj:` content entries (Phase 3 E-1)
- [ ] The deliberate flip: geometry loads from the registry at runtime, one district per PR (Phase 3 A-3)
- [ ] Fidelity gate re-pinned as the load test after the flip
**Done when:** the running world's geometry and semantics are read from the registry, ghost gates (±0.1 m) and validator green, and no hand-transcribed coordinate remains unguarded.

### SYS-WORLD-02 — Streets, sidewalks & intersections
**Today:** shipped — Kestrel Street + avenues portions, crosswalks, curbs (collide.ts curb law), intersection at the district core; design: 5 streets (Kestrel 16 m, Juniper/Sycamore 24 m, Gable/Marlow 16 m). Status: VERIFIED for the shipped set (probes + E2E walk the streets daily).
**Checklist:**
- [ ] Remaining designed streets built per registry (Phase 8, owner-gated waves)
- [ ] Crosswalk discipline for pedestrians held as population grows (probe-w4-soak law)
- [ ] Each new street priced into the perf ledger before landing
**Done when:** every registry street exists, is walkable, passes the ghost gate, and keeps its ledger row.

### SYS-WORLD-03 — Buildings & interiors
**Today:** 12 shipped masses; interiors walkable: bodega, laundromat, barbershop, diner, hall, Cecil room + Times Square/terminal spaces (`World.ts` builders + `interiors.test.ts` through-registry check; `interiorGlass.ts` glass-side law; near/far toggles). 10 interiors designed, 43 buildings designed. ABO furniture in 22 slots (`world/furniture.ts`, seam law: GLB is a costume, never a dependency). Status: VERIFIED (shipped set) / PLANNED (remainder — Phase 8, owner-gated).
**Checklist:**
- [ ] Interior set complete for the shipped narrative (C0 needs: Corner Slice, Cecil room, diner — narrative/00 §5)
- [ ] Remaining interiors to fixture level per `docs/41-interior-design-catalogue` (history — re-derive from registry)
- [ ] Building-variant packs through `validateManifest` (Phase 3 E-1)
- [ ] Furniture pack extension is idempotent (`tools3d/abo_select.py` + `abo_fetch.py`) and license files ship with any derived use
**Done when:** every place the spine names is enterable and furnished; every new interior passes the glass-side + near/far laws; probes exit 0.

### SYS-WORLD-04 — Doors, stairs & elevators
**Today:** subway door leaves + colliders (`subway/trainKit.ts`); stair law A5 (step-up 0.35 / snap 0.45) in `collide.ts` + `Player.ts`; fire-escape ladders with climb/descend-dismount guards; step-height law ≤0.33 in `stationKit.ts`. No generic door entity; shop doors are authored openings. Status: PARTIAL (IMPLEMENTED for shipped cases, INTEGRATED, VERIFIED).
**Checklist:**
- [ ] Doors/stairs mapped as arbitration resources (`door:KTN-05`… Phase 3 A-2)
- [ ] Capacity live at shipped chokepoints (arbitration)
- [ ] Any future elevator follows the ride-machine pattern (pure state machine, zone visibility) — not ad-hoc tweens
**Done when:** door/stair use is schedulable by the sim (a schedule can claim a door), guards stay green, and no new door type ships without its test.

### SYS-WORLD-05 — Navigation & pathfinding
**Today:** Yuka steering (FollowPath / ObstacleAvoidance / Separation) on authored loops for ambient walkers (`world/peds.ts`); cast movement is authored choreography (`Game.ts` tween walks); no nav graph. Status: INTEGRATED (current scale) / PLANNED (nav graph — Phase 3 A-1).
**Checklist:**
- [ ] Nav graph (nodes/edges/chokepoints) seeded from registry entrances/crosswalks
- [ ] Walkers migrate off hardcoded loops; crowd tests stay green during migration
- [ ] Path queries allocation-free (hot-path law)
- [ ] Chokepoint capacity respected (arbitration resources)
**Done when:** the reference world's people physically occupy their manifest places via graph routes, and the crowd/solidity/shuffle guards never regressed during the migration.

### SYS-WORLD-06 — Landmarks & points of interest
**Today:** 7 designed landmarks; shipped: K-globes, Rosa's billboard, Three Towers, diner sign, mural, ghost sign, hall marquee + Times Square set; Map places with sketch reveals (`ui/sketch.ts`, `content.ts` MAP_PLACES). Status: VERIFIED (shipped set).
**Checklist:**
- [ ] Landmark registry entries complete (each landmark has an ID, anchor, Map place)
- [ ] Three-Layer Landmark content (Postcard → Tuesday → Kindness) attached per landmark as narrative content waves land
**Done when:** every landmark is: visible, Map-registered, postcard-able, and has its content layers or a dated deferral note.

### SYS-WORLD-07 — Environmental detail & New York identity
**Today:** strong and verified: props set (`props.ts` street furniture, MatBank), poles/wires/signs (`streetAssets.ts`), pigeons + squirrel (`ambient.ts`), leaf drift (`leaves.ts`), steam, day-keyed dressing (`dressing.ts`), palette law (`core/palette.ts`), 1-Second Law probe (`probe-one-second.mjs`, frames in `assets/one-second-law/`). Status: VERIFIED.
**Checklist:**
- [ ] New detail obeys the "fewer, distinctive" rule (AGENTS.md §1b) — no prop waves without the gate
- [ ] Seasonal dressing (Phase 6) extends, never replaces, the identity set
**Done when:** any new environmental wave passes the 1-Second Law probe and the Anti-Slop inspection.

### SYS-WORLD-08 — World streaming, spatial indexing & LOD
**Today:** district tiles + `bakeStatics`/`bakeZoneStatics` (sign-atlas + vertex-fuse draw-call merging), subway zone visibility with hysteresis, interior near/far, roof hysteresis, shadow-law single source; **no** spatial index (flat AABB list), **no** general LOD. Status: PARTIAL — sufficient at current scale (INTEGRATED, VERIFIED at that scale).
**Checklist:**
- [ ] Spatial index decision made when/only if collider counts or query costs demand it (measure first — Phase 4 measurement)
- [ ] Fidelity tiers (Phase 4 B-2) serve as the population LOD
- [ ] Draw-call ledger rule enforced per wave (the B13 law)
**Done when:** scale-ups (population, buildings) hold their ledger rows, or the index/LOD work that makes them hold is scheduled with an owner.

---

## 2. Population and simulation

### SYS-POP-01 — NPC identities & persistent records
**Today:** `sim/entities.ts` + `sim/ids.ts` (branch — IMPLEMENTED, not integrated): entity records, validators, business hours, permanent IDs. Runtime: authored cast (Rosa, Idris, Sal, stranger, familiar, Priya, busker, kid) as rigs + content entries; ambient walkers anonymous by design. Status: IMPLEMENTED (branch).
**Checklist:**
- [ ] Entities on main (Phase-1 merge)
- [ ] Majors (16, doc 05) + supporting roster get persistent records (Phase 4)
- [ ] Identity records survive tier changes (B-2 round-trip test)
**Done when:** every named person in the fiction has a record that a save can rebuild, and no tier change invents or loses a fact.

### SYS-POP-02 — Schedules & routines
**Today:** `sim/schedule.ts` (branch — pure resolution, overnight, weekday — IMPLEMENTED); runtime: day-keyed street shifts (`dressing.ts` STREET_PLAN / PEDESTRIAN_ROLES), familiar-face per-day route, customer spawns. Not clock-driven yet. Status: IMPLEMENTED (branch) / INTEGRATED (day-keyed pattern only).
**Checklist:**
- [ ] B-1: walkers + cast read clock-keyed schedules (Phase 2)
- [ ] Business hours drive open/close (Phase 6)
- [ ] Independent decisions per chapter (R5) mutate schedules as world events
**Done when:** Idris at the platform at 07:40 and the deli closing at 22:00 are observable in a browser, and schedule changes are auditable world events.

### SYS-POP-03 — Behavior arbitration
**Today:** `sim/arbitration.ts` (branch — one claim per NPC, five priority bands, strictly-higher interrupts, resume stacks, capacity resources, S1–S7 tested — IMPLEMENTED). Not wired. Status: IMPLEMENTED (branch).
**Checklist:**
- [ ] Arbitration owns "what is this body doing" in the runtime (Phase 2 B-1)
- [ ] Capacity live at chokepoints (Phase 3 A-2)
- [ ] Story beats submit as proposals, never as overrides (wc-02 D5)
**Done when:** a mid-roam story beat and a walker's schedule claim resolve through arbitration (the S1–S7 scenarios observable), with zero hard-coded body ownership left.

### SYS-POP-04 — NPC navigation & movement
**Today:** Yuka vehicles + hard solidity guarantees (pairwise separation, player yields, cab-footprint exclusion, loop-bbox clamps) — `peds.ts`; VERIFIED (crowd.test.ts + soak probes). Status: VERIFIED at current scale.
**Checklist:**
- [ ] Destinations come from claims, not loops (Phase 2/3)
- [ ] Soak law holds at increased population (≥1800 sim-s, zero failures)
**Done when:** movement quality guards are green at every future population count.

### SYS-POP-05 — Relationships & social interactions
**Today:** living-memory thresholds (walker conversations, purchase counters — `living-memory.test.ts`); relationship edges as a declared sim shape (branch); narrative relationship state (R5) not built. Status: PARTIAL (INTEGRATED for shipped patterns; PLANNED for the sim layer).
**Checklist:**
- [ ] Relationship edges live in WorldState, mutated only as world events (B-3)
- [ ] Drift dials with doc 07 defaults (Phase 6)
- [ ] Disclosure thresholds per character (doc 07 §3) as data
**Done when:** ignoring the protagonist for a chapter changes ≥3 majors in documented directions (R5's test), and every relationship mutation is auditable in the event log.

### SYS-POP-06 — Memory & personal stories
**Today:** player's field diary engine complete (`core/fieldDiary.ts` — 10 kinds, epistemics, corrections, quarantine — VERIFIED state); city diary (`core/diary.ts` morning-after notes); walker memory lines; no UI for the field diary. Status: PARTIAL (state VERIFIED, UI PLANNED — Phase 2 WP-6).
**Checklist:**
- [ ] Diary ink UI (font atlas + wobble style — two draw calls of UI)
- [ ] Contradiction ledger K1–K8 as authored data (doc 03 §2)
- [ ] Append-only invariant test guards every code path (exists — keep green)
**Done when:** a player can read Leo's diary in-game, corrections strike through, and no code path can edit a persisted entry's body.

### SYS-POP-07 — Needs, activities & reactions
**Today:** NOT STARTED (deliberate deferral — wc-17: "shapes first, dials after loops exist"). Reaction patterns shipped in narrow forms (Shuffle reactions, pigeon flush, crowd yields). Status: PLANNED (Phase 4).
**Checklist:**
- [ ] Needs shapes defined (doc-contract level) before any dial
- [ ] Dials only after business/loops exist (Phase 6+)
**Done when:** needs drive visible, sensible activity choices through arbitration — and the shapes doc is the contract the dials read.

### SYS-POP-08 — Pedestrian population
**Today:** VERIFIED (`peds.ts` + soak probe + crowd guards). Status: VERIFIED.
**Checklist:**
- [ ] Population growth holds ledger + guards (per-phase)
- [ ] Fidelity tiers as the population LOD (Phase 4 B-2)
**Done when:** every population increase ships with soak + crowd + ledger evidence.

### SYS-POP-09 — Traffic & vehicles
**Today:** one honest cab (rail mover + traffic brain `engine/traffic.ts`), the M121 loop bus (`busRoute.ts`), enterable arrival bus, parked cars as colliders. Multi-lane deliberately deferred. Status: VERIFIED at designed scale (INTEGRATED).
**Checklist:**
- [ ] Vehicle lanes stay a WS-A decision (multi-lane needs the nav graph first — wc-17 deferral stands)
- [ ] Any new vehicle reuses the pure traffic brain (no second brain — the paved-path law)
**Done when:** new vehicles slot into the existing brain with tests, and the street keeps its courtesy/braking laws.

### SYS-POP-10 — Dynamic events
**Today:** The Shuffle (street-brush events, soft-skip 20 s — `freeroam.ts`/`shuffle.test.ts`), Times Square sync beat, busker, day-keyed diary events. No general event scheduler; R6 windows not built. Status: PARTIAL.
**Checklist:**
- [ ] R6 missable-window scheduler (Phase 6): windows never reopen; onMiss writes world changes
- [ ] World event log auditable (WorldState events[] ordering — exists on branch, keep green)
**Done when:** a missed moment produces a changed world the city diary may mention once — and never a nag.

### SYS-POP-11 — Persistent simulation state
**Today:** story save v1 (`core/Save.ts` — VERIFIED: fuzz wall, clamps, back-compat); world save `first_slice_world_v1` (branch — snapshot/parse/audit, polite refusal — IMPLEMENTED). Status: IMPLEMENTED (world save) / VERIFIED (story save).
**Checklist:**
- [ ] World save on main (Phase-1 merge)
- [ ] Bridge discipline: story effects write world facts; the world never writes story steps (one-way, tested)
- [ ] The sanctioned money mirror audited by `auditWorld` at runtime (Phase 2 D-3)
- [ ] v1-additive evolution law upheld for every future field
**Done when:** both saves round-trip deterministically, corrupt input never crashes, and the two layers never duplicate authoritative truth.

## 3. Player gameplay

### SYS-PLAY-01 — Movement & controls
**Today:** VERIFIED. Kinematic walker with accel/friction, sprint (4.2→6.4 m/s), stairs (A5 law), ladders with climb cadence + descend-dismount, wall-slide, visual-Y smoothing (`player/Player.ts`, `engine/collide.ts`, `engine/Input.ts`); touch joystick + turn buttons + pointer drag/wheel. Guards: stairs/descend/wall-slide/player-upgrades/collide/solidity tests.
**Checklist:**
- [ ] Kinematics changes keep the E2E walk budgets (the pace-factor lesson, docs/56-eight-orders)
- [ ] Any new locomotion (e.g., interiors with doors) extends `collide.ts` laws, never bypasses them
**Done when:** movement guards stay green and no new locomotion ships without a permanent guard.

### SYS-PLAY-02 — Interaction framework
**Today:** VERIFIED. One registry (`game/interactions.ts` + `interactionDefs.ts` — every interaction declared once, nearest() allocation-free per frame), confirm-gate buys, enable rules, prompt/HUD integration.
**Checklist:**
- [ ] New interactions always via the registry (the one paved path — AGENTS.md §1d)
- [ ] Interaction enable rules become roam-aware/schedule-aware through data (Phase 2+), not `step ===` additions
**Done when:** no second interaction mechanism exists and the registry tests keep passing.

### SYS-PLAY-03 — Dialogue & choices
**Today:** order-card conversations + cine box + note queue (`core/content.ts`, `ui/UI.ts`) — complete for the design (choice-card, not branching tree); doc 13's voice laws govern text. R7 choice nodes not built. Status: PARTIAL.
**Checklist:**
- [ ] R7 ChoiceNode register implemented (doc 10 §3 as data; structural options' flag signatures unique — tested)
- [ ] Fluency/name line variants as content-table conventions (R10/R11, Phase 5)
- [ ] Dialogue selection deterministic from save (tested)
**Done when:** every structural choice diverges in ledger terms, and voice/name/fluency selection is data-driven and test-pinned.

### SYS-PLAY-04 — Activities & minigames
**Today:** VERIFIED for shipped: half-court (pure deterministic ballSim + CourtGame), laundry loop, purchases, court chalk tally, subway ride machine, pigeon/busker ambience.
**Checklist:**
- [ ] New activities are state machines with pure cores (the court/ballSim pattern: unit-tested physics, thin presentation)
- [ ] Each new activity has a purpose and a consequence (AGENTS.md §0 working rules)
**Done when:** no decorative activity ships (Anti-Slop), and every activity's core is headless-testable.

### SYS-PLAY-05 — Employment & daily life
**Today:** the cart job (Day-1/3 rush orders, $87→$112, eight order types pinned), permit paperwork beat, coffee/bodega/food loops. Slice Ladder stage 2+ (bodega → café → food spot → rooftop) not built — by design until the spine calls for it. Status: PARTIAL (VERIFIED for Day 1–4; PLANNED beyond).
**Checklist:**
- [ ] Day 5+ decision (DEC-3, owner) precedes any employment expansion
- [ ] Bodega stage scoped only with the owner gate (Slice Ladder is a §0 pillar — expansion is a design decision, not an agent's)
**Done when:** whatever employment exists serves the spine's chapters, with money that moves through the ledger.

### SYS-PLAY-06 — Social systems
**Today:** cast beats (familiar face pass→nod→word, kid follow, Rosa's mornings, stranger's Day-4 thesis), greeting/recognition patterns, living-memory lines. No relationship sim yet (SYS-POP-05 owns it). Status: PARTIAL (VERIFIED for shipped beats).
**Checklist:**
- [ ] Greeting ladder generalized from data (Phase 4), not more scripted twins
- [ ] Regulars' arcs (doc 07) become reachable states (Phase 7 waves)
**Done when:** a Regular's arc state is readable from the save and changes through world events.

### SYS-PLAY-07 — Inventory & resources
**Today:** light item model in GameState (shelf items, coffee cups, starter props); no general inventory UI. Status: PARTIAL (sufficient for shipped scope).
**Checklist:**
- [ ] Inventory needs for C0–C2 defined from the spine's scenes (nothing speculative)
- [ ] Items persist via the v1-additive save law
**Done when:** whatever the spine requires is present, saved, and test-pinned — no CRUD inventory built "for later".

### SYS-PLAY-08 — Money & transactions
**Today:** VERIFIED for shipped math ($87 start; Day-1 rush $112; Day-4 $123 — E2E-asserted); confirm-gate purchases; sim/economy ledger ready on branch (integer cents, append-only, flow accounting, audit). Status: VERIFIED (story math) / IMPLEMENTED (ledger).
**Checklist:**
- [ ] D-3 bridge: `Effect('money')` posts transactions behind confirm-gates (Phase 2)
- [ ] The sanctioned mirror + `auditWorld` enforce `player.moneyCents ↔ ledger.balance('acct:player')`
- [ ] No price invented anywhere outside shipped prices (contract law — tests use shipped prices only)
**Done when:** every dollar the HUD shows reconciles to the ledger, from genesis, on every save.

### SYS-PLAY-09 — Player progression
**Today:** roam counters + discovery lines, Map notebook progression, awning/stool/permit beats, Skyline of Lit Windows as ambience (no numeric progress UI — a design choice per doc 01/AGENTS.md). Chapter progression (R8) not built. Status: PARTIAL.
**Checklist:**
- [ ] R8 chapter gating implemented (Phase 7): trigger + minimum in-game days; never real time
- [ ] No karma meter, no quest-journal takeover of the diary (R15 exclusions — audited as absences at Phase 9)
**Done when:** progression is chapter-gated, clock-driven, and invisible machinery behind visible life.

### SYS-PLAY-10 — Freedom of exploration
**Today:** VERIFIED. The Roam law shipped: enter/exit roam, discovery counters, roam-aware gates, ambient life with no `step ===` dependencies (`freeroam.ts` + guards; touch law; save rides roam state).
**Checklist:**
- [ ] Every new world gate is roam-aware (the standing agent law — new guards extend, never weaken)
- [ ] New HUD pressure is mode-aware (touch-law test keeps pinning it)
**Done when:** roam tests stay green forever and no feature regresses free roam.

---

## 4. World economy and neighborhood

### SYS-ECO-01 — Independent businesses
**Today:** shops as interactions (bodega shelf, barber, hot dog, pizza, diner, bakery, records) with hours data on the branch (`sim/entities.ts` business hours). No operations sim. Status: PARTIAL.
**Checklist:**
- [ ] Business records in WorldState (premises, hours, staff, balances — Phase 2/6)
- [ ] Open/close transitions live from the clock (Phase 6)
**Done when:** a business that closes at 22:00 is closed for everyone, and the ledger can produce its day.

### SYS-ECO-02 — Customers & workers
**Today:** customer spawns in the story rush; walkers with roles (`PEDESTRIAN_ROLES`). No worker sim. Status: PARTIAL.
**Checklist:**
- [ ] Staff roles on business records (Phase 6, after residents live)
- [ ] Customer flows follow schedules via arbitration (Phase 4/6)
**Done when:** a business's staff and customers are residents with records, observed through the same schedule/arbitration machinery as everyone else.

### SYS-ECO-03 — Business operations
**Today:** NOT STARTED (deliberate — wc-17 Phase 4). Status: PLANNED (Phase 6).
**Checklist:**
- [ ] P&L from ledger evidence (never hard-coded sums)
- [ ] Rent cycles/pricing deferred until real loops exist (directive rule 17 posture)
**Done when:** `auditWorld`-green businesses show derived P&L across a month of unattended sim.

### SYS-ECO-04 — Goods & resource flows
**Today:** economy flow classes declared (branch: `sim/economy.ts` faucets/sinks). No flows in runtime. Status: PLANNED (Phase 6).
**Checklist:**
- [ ] Flow accounting on main (Phase-1 merge)
- [ ] First real flows (restock morning ritual — Phase 2's D-2 uses it) posted as transactions
**Done when:** goods movements are ledger-visible and flow-accounted, and the audit catches an unbalanced flow by construction.

### SYS-ECO-05 — Public services
**Today:** transit only (K line, M121). Others NOT STARTED — and nothing in the spine demands more yet. Status: NOT STARTED (by design).
**Checklist:**
- [ ] Any public service enters only through a spine need + registry entry + purpose rule
**Done when:** n/a until the spine demands a service; the checklist exists to prevent speculative building.

### SYS-ECO-06 — Transportation
**Today:** VERIFIED. K-line two-station subway (ride machine, zone lighting, turnstile law), M121 loop with stops/zones, arrival bus swap, cab. Guards: subway/bus tests + probes.
**Checklist:**
- [ ] Transit schedules become clock-keyed (Phase 2 B-1 pattern; the bus loop is the natural first schedule)
**Done when:** transit obeys the same in-game clock as everything else, with its guards green.

### SYS-ECO-07 — Neighborhood identity
**Today:** VERIFIED as canon + shipped dressing: Alder Heights bible (docs/narrative/04), identity guide (legacy doc 43: "forever 5:45 PM", first week of October), palette law, name registry (doc 15).
**Checklist:**
- [ ] Name registry rulings respected by every new name (doc 15 §7 protocol)
**Done when:** no new name ships outside the naming registry.

### SYS-ECO-08 — Persistent neighborhood changes
**Today:** day-keyed block diary (flyers, window warmth, barrier removal), familiar-face progression, street shift schedules. Month-scale change not built (needs the clock). Status: PARTIAL.
**Checklist:**
- [ ] Clock-keyed day boundaries (Phase 2 D-2)
- [ ] Season cuts + month-scale change (Phase 6)
- [ ] Nothing keys to real-world days (the standing law — the calendar tests pin it)
**Done when:** the block visibly changes across in-game months, deterministically, from save state.

### SYS-ECO-09 — In-game time progression
**Today:** the conflict and the crown jewel. `core/calendar.ts` on main (R4): epoch Day 1 = **October 1, Y1** (the C0 mood-lock), pure integer math, no `Date`, season/`seasonCut` detector built (unused), formatGameDate. `sim/clock.ts` on branch: tick = 1 minute, epoch Day 1 = **Tuesday, September 9, Y1** (the arrival, doc 12 §1), phase names, seasons. Both cite doc 12; **the epochs disagree and no mapping exists** — DEC-1. Runtime does not keep minutes yet. Status: PARTIAL (R4 state VERIFIED; sim clock IMPLEMENTED; integration PLANNED).
**Checklist:**
- [ ] DEC-1 ruled (Narrative Director + lead) and recorded in doc 15 §2
- [ ] One mapping function + pinned test reconciles story-day counter and world clock
- [ ] The valve drives the world (Phase 2 D-1/D-2)
- [ ] `seasonCut` detector wired to its transition (Phase 6)
**Done when:** there is exactly one time authority in the game, every layer derives from it, the no-real-date tests pass at every layer, and the shipped mood-lock survives byte-for-byte.

---

## 5. Narrative

### SYS-NAR-01 — Protagonist & character systems
**Today:** starters + wardrobe + lock law VERIFIED (`core/starters.ts`, `ui/Wardrobe.ts`); Leo Marsh canon adopted (docs/narrative/02); name customization shipped.
**Checklist:**
- [ ] R11 name propagation across all surfaces (Phase 5)
- [ ] Psychology-fixed canon honored in every line (doc 02 — the Narrative Director reviews C0 content)
**Done when:** the protagonist's identity systems are complete per canon and propagation is test-pinned.

### SYS-NAR-02 — Diary-map
**Today:** Map notebook VERIFIED (pages, notes, slang, sketch reveals, beat marker); field diary state VERIFIED (see SYS-POP-06); Map-as-diary doctrine (doc 03) partially live (Map yes, diary ink no).
**Checklist:**
- [ ] Diary ink UI (Phase 2 WP-6)
- [ ] Diary/map merge behaviors per doc 03 §4 (entries as ink on the Map's pages)
**Done when:** the Map reads as the diary it is — append-only, biased, hand-kept — with the contradiction strikes visible.

### SYS-NAR-03 — Character arcs
**Today:** canon complete (docs/narrative/06, 07); "without the protagonist" defaults binding. Machines not built. Status: PLANNED (R5 + waves, Phases 4/7).
**Checklist:**
- [ ] R5 independence sim (Phase 4)
- [ ] Per-major arc states reachable through content waves (Phase 7)
**Done when:** every major's arc can complete or diverge per doc 07, from save state alone.

### SYS-NAR-04 — Story events
**Today:** 33-step Day 1–4 machine VERIFIED; `sim/narrative.ts` validation/fallbacks on branch (StoryEvent validation, availability holds, no silent cancels). Status: VERIFIED (shipped) / IMPLEMENTED (validation layer).
**Checklist:**
- [ ] Rails engine R1 (Phase 7): data rails, fire-while-roaming, city-diary observability
- [ ] C0 events through `validateEvent` on the live world (MS-4)
**Done when:** story events schedule, validate, and fall back through the contract machinery with zero silent failures.

### SYS-NAR-05 — Dialogue
**Today:** shipped tables VERIFIED for scope (order cards, teach lines verbatim-pinned by content-order tests); doc 13 voice table governs. Fluency tables not built. Status: PARTIAL.
**Checklist:**
- [ ] Fluency-tier selection (R10, Phase 5)
- [ ] Voice-law check in the content pipeline for every wave (the content-pipeline skill)
**Done when:** dialogue selection is deterministic, tiered, named, and voice-checked.

### SYS-NAR-06 — Relationships & consequences
**Today:** consequence machinery not built (R2). Shipped consequences are story-step-local (VERIFIED for scope). Status: PLANNED (R2 — Phase 2 WP-5).
**Checklist:**
- [ ] R2 append-only ledger with promise→omission maturation
- [ ] C5 cascade reads only ledger + relationships, deterministic from save
**Done when:** the cascade can replay from a save and produce the doc 09 cascade beat-for-beat.

### SYS-NAR-07 — Player choices
**Today:** choice-card conversations shipped; R7 register not built. Status: PLANNED (Phase 2 WP-5).
**Checklist:**
- [ ] R7 ChoiceNodes with locks, ledgerWrites, flagWrites
- [ ] The no-fake-choices test (unique downstream flag signatures per structural option)
**Done when:** every structural choice diverges in state, provably.

### SYS-NAR-08 — Betrayal & aftermath
**Today:** canon complete (docs/narrative/08, 09); no build work (correctly — content waits for machines). Status: NOT STARTED (build) / CANON (design).
**Checklist:**
- [ ] C3–C6 waves (Phase 7) after R-machines
- [ ] Repair dials as data (doc 08 §per-victim)
- [ ] R14 amends economy (19 rows, per-row payment verbs, derived totals)
**Done when:** the betrayal plays through real state — the ledger, the businesses, the relationships — not scripts alone.

### SYS-NAR-09 — Story continuity
**Today:** VERIFIED as practice: canon register (doc 15) + rulings protocol + docs-hygiene guard + the reboot register.
**Checklist:**
- [ ] Every wave's canon lines checked against doc 15 §1 (protected lines)
- [ ] Unresolved narrative questions tracked to their owners (narrative/00 §3 — mirrored in the risks doc)
**Done when:** continuity audits run per wave and no protected line drifts.

### SYS-NAR-10 — Integration with simulation state
**Today:** the bridge is designed and half-built: one-way writes (story effects → world facts), availability holds, `StoryEvent` validation (branch). The bridge wiring itself is Phase 2 (WS-D's one sanctioned seam into `Game.frame`). Status: IMPLEMENTED (contract layer).
**Checklist:**
- [ ] The bridge lives once, is documented in the worklog, and is the only seam (wc-14 §3)
- [ ] Narrative availability holds honored by arbitration (Phase 2/4)
- [ ] The C5 cascade reads real business/relationship state (Phase 7, after Phase 6)
**Done when:** story and sim share one truth with one-way writes, and the ownership table test stays green.

---

## 6. Production quality

### SYS-QA-01 — UI & UX
**Today:** VERIFIED. Full DOM overlay (`ui/UI.ts` 757 lines, style.css 1,278): HUD, order card, Map, wardrobe, postcard/album, touch law, cine controls, error banner, loading. Touch targets and paper-surface law pinned by tests.
**Checklist:**
- [ ] New UI follows the touch law + paper-surface law (tests exist — extend, never bypass)
- [ ] Diary ink + calendar surfaces land with the same discipline (Phase 2 WP-6)
- [ ] Dyslexia-friendly toggle (Phase 5)
**Done when:** every new surface ships with its guard and a 390×844 probe check (the portrait-first law).

### SYS-QA-02 — Audio & music
**Today:** WebAudio synth layer VERIFIED in-engine (`game/audio.ts` — city bed, swells, chimes, rumble, busker; mute persisted). Doc 32's honest note stands: **not yet verified by human ears**; no music assets.
**Checklist:**
- [ ] A listening pass (human box — log it in the register)
- [ ] Music decision (owner: synth motifs vs licensed — No-FOMO/Hospitality laws apply; stop-and-ask if monetization whispers)
**Done when:** the audio pass is logged and any music choice is owner-ratified.

### SYS-QA-03 — Animation
**Today:** VERIFIED. Articulated box-person rig, single writer (`personRig.ts` updatePersonAnim), walk cycle speed-derived, climb/sweep/wave/sit modes, cast bake (6 draws), GLB costumes never dependencies.
**Checklist:**
- [ ] New anim modes go through the single writer + rig tests
- [ ] No GLB skins without the asset-seam law (missing file keeps the procedural look)
**Done when:** the rig's guard tests stay green and every new mode has one.

### SYS-QA-04 — Visual quality
**Today:** VERIFIED by process: palette law, styleframes, 14-frame visual audits (legacy doc 31 pattern), probe screenshots, the 1-Second Law probe. B13 draw-call debt open (DEC-2).
**Checklist:**
- [ ] DEC-2 (B13) closed by owner call — either funded (culling/optimization wave per docs/57 §3.6 study) or accepted with the ledger rule as the standing budget
- [ ] Visual audit per new wave (the §1b gate)
**Done when:** the visual bar holds on every rig and the draw-call question has a ruled answer.

### SYS-QA-05 — Accessibility
**Today:** PARTIAL: touch law, portrait-first, `?fx=off`, loading/error affordances, text-first design. Missing: dyslexia-friendly type toggle (planned Phase 5), color/audio options, reduced-motion.
**Checklist:**
- [ ] Dyslexia toggle (one flag, one font — narrative/14 §4)
- [ ] Reduced-motion respect for tweens (dusk/fades) — small, priced
- [ ] An accessibility note in the README when shipped
**Done when:** the toggle ships and the reduced-motion pass is probe-checked.

### SYS-QA-06 — Performance
**Today:** measured and governed: probe-perf (119/184/256 fps-class runs at baseline), census gate (Kestrel ≤150 / intersection ≤250 draw calls), ledger rows per rig, shadow-cost probe, `?fx=off`, dt clamp 0.1 s. B13 open. No runtime FPS HUD; no memory tooling.
**Checklist:**
- [ ] Budget honesty per feature (§1c.6) — every wave prices before landing
- [ ] Memory/heap probe (Playwright CDP) — cheap, add to the fleet (Phase 2, WS-F)
- [ ] Device budgets re-ratified once at alpha (doc 07 §8 numbers)
**Done when:** every phase's perf requirements carry evidence rows and the ledger never regresses silently.

### SYS-QA-07 — Save/load
**Today:** VERIFIED. Story save v1 (fuzz wall, clamps, v1-safe trailing fields, corrupt→fresh), album save (quota-degrade law), world save on branch (polite refusal, world-id guard, integrity audit).
**Checklist:**
- [ ] World save on main (Phase-1 merge)
- [ ] Every future field obeys the v1-additive law (tests keep enforcing)
- [ ] Phase-9 migration posture decided (v2 only with a reader, never a silent transform)
**Done when:** the save story stays boring — in the best possible way.

### SYS-QA-08 — Error recovery
**Today:** VERIFIED patterns: corrupt save → fresh; corrupt album → empty; corrupt diary entry → quarantine; window error → banner; visibilitychange pause; driver detection.
**Checklist:**
- [ ] Every new parse path total by construction (the save.gd law — a review checkbox per PR)
- [ ] Error banner copy stays humane (voice law)
**Done when:** no parse path can throw, ever, anywhere — proven by the fuzz-wall pattern applied per new surface.

### SYS-QA-09 — Testing
**Today:** VERIFIED and extensive: 660 vitest tests (45 files, guards-first culture), ~131-check 4-day E2E, 122 harnesses, autotest driver. CI = typecheck + unit + build + Pages deploy; probes/E2E local-only by documented policy.
**Checklist:**
- [ ] PR CI lane running unit + typecheck on every PR (WS-F — cheap, no device needed)
- [ ] Nightly probe lane (a curated subset: census, soak, subway, touch, one-second) — justification: catch drift before push, not after
- [ ] Guards-first rule enforced per PR (every bug lands with its test — §1c.1)
**Done when:** CI catches regressions before humans do, and the guard count only ever grows.

### SYS-QA-10 — Compatibility
**Today:** PARTIAL: SwiftShader software-GL probes (a real low-end proxy), 390×844 mobile viewport checks, `?fx=off`. Real devices never tested (doc 55's honest gap).
**Checklist:**
- [ ] Device matrix at Phase 10 (owner dependency: hardware access)
- [ ] Browser matrix documented (Chromium verified; Safari/Firefox pass is an alpha item)
**Done when:** the matrix runs and its evidence rows exist.

### SYS-QA-11 — Release preparation
**Today:** PARTIAL: GitHub Pages deploy CI (shipped reality), version discipline via save keys, no store packaging, no crash reporting, no telemetry.
**Checklist:**
- [ ] DEC-9 (telemetry design + privacy) and DEC-11 (distribution) decided before Phase 10/12
- [ ] Release checklist (RC gates, rollback plan) drafted at Phase 9
**Done when:** the release path has no undecided decision left on it.

---

## Keeping this document honest

- A system's checklist is **never edited to make a phase pass**. If a criterion is wrong, change it with a note in the register and the owner's sign-off — the change itself is visible.
- New systems enter through a PR that adds the row here **and** its register row in the same commit.
- "Done when" lines are the acceptance criteria reviewers quote when they close a row. Write them so a reviewer can quote them.
