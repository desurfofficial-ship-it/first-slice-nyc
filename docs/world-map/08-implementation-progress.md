# 08 — Implementation Progress & Agent Handoff

> **Status:** Living handoff document. Updated 2026-11-13 by Z.ai agent. The
> next agent reads this file, inspects the repository at the commit hash below,
> and continues without needing the previous agent's conversation history.
>
> **The law this document serves** (AGENTS.md §1d): "A correction that lives
> only in chat is lost to the next agent. Chat is ephemeral; the repo is
> memory." This file is the repo-memory of the world-map design lock.

---

## 1. Current milestone status

| | |
|---|---|
| **Milestone** | World-map construction (W0–W14) + the evidence package (the shot list, the labelled top-down, the 3D overview); the concurrent line's W15–W17 wave (the DEC-6 + DEC-12 rulings, the W16 minimal seasonal pass, the W17 borough design package draft) joined by merge |
| **Phase** | Vertical Slice production — narrative reboot canon (v1.0, 2026-11-06) |
| **Registry version** | v1.71.0 (the register's top — W17 the borough design package draft; the monotonic-ledger law; the W14 Corner House row sits at v1.68.0, the W15 rulings at v1.69.0, the W16 seasonal pass at v1.70.0 — see `docs/production/PRODUCTION-STATUS-REGISTER.md` for the authoritative rows) |
| **Implementation phase** | **Complete for the vertical slice.** All 179 registry IDs built. All 22 interiors shipped (the Corner House's CORNERHOUSE-INT closed the last openDecision in W14). All 7 parks built. All 23 anchors placed. The walkability scanner reads clean and deterministic. The evidence package (the §6 shot list, the labelled top-down map, the golden-hour overview) is captured from the real built game. |
| **Branch (local clone)** | `main` |
| **Latest commit hash** | `e2c27b4` — the remote tip at the 2026-11-13 sync (verified `git ls-remote` == HEAD after the fast-forward); the concurrent line merged our W14 Corner House push (fade4f9, our line rides theirs as dc5200f) and landed W15/W16/W17 on top; this record rides the same push |
| **Commit subject** | `Merge feat/wp-dec6-seasonal-borough-direction into main — the DEC-6/DEC-12 wave line (register v1.69.0–v1.71.0)` |
| **Commit date** | 2026-11-13 (UTC) |
| **Remote** | `https://github.com/desurfofficial-ship-it/first-slice-nyc.git` (public; read-only clone needs no credentials; the push rides the owner's fine-grained PAT — it needs the repo's Contents:write grant) |

## 2. Completed neighbourhoods

The Alder Heights block is **one neighbourhood** with five streets (doc 04 §2).
All five are built:

| Street | Status | Built in |
|---|---|---|
| **Kestrel Street** (the commercial spine) | ✅ Built | W0–W5 + W8 storefronts + W12 fire-escape filigree |
| **Juniper Avenue** (institutional row, the K beneath) | ✅ Built | W0–W5 + the K station houses + the Alder Works Hall |
| **Sycamore Avenue** (big storefronts, the diner) | ✅ Built | W0–W5 + the Diner Sign landmark |
| **Gable Street** (Gable Row, the stoop street) | ✅ Built | W0–W5 + W6 terrace (GRB-06/07) + W10 park-gates + W12 filigree |
| **Marlow Street** (bakery row, the playground) | ✅ Built | W0–W5 + W6 terrace (TEN-02/KTS-04) + W10 park-gates |

**The destination (one ride west):** Times Square — ✅ Built (the K tunnel, the
42 St-Times Square station, the canyon). The subway ride works end-to-end
(the W11 ride-rate + stair-seal fixes, 2026-11-13).

## 3. Completed streets and buildings

- **Buildings:** 81 rows, **all built** (registry `constructionPhases` W0–W12).
  Class A (9 story-bearing rooms, fully enterable), Class B (ground-floor
  interiors/service bays), Class C (exterior-only brownstones + walk-ups), Class
  D (backdrop mass + skyline fabric).
- **Streets:** 5 (Kestrel, Juniper, Sycamore, Gable, Marlow) + the K line
  subway + the Times Square canyon.
- **Parks:** 7 (Corner Park, Kestrel Green, Gable Garden, Marlow Playground,
  PRK-LARKIN, PRK-CARROW, Subway Plaza) — all built. The W10 park-gate fix
  (2026-11-13) opened the four terrace garden mouths.
- **Landmarks:** all built — the K-Globes, Rosa's rooftop billboard, the Three
  Towers (wooden water tanks), the Diner Sign, the Garden Mural, the Ghost Sign
  ("ALDER WORKS — KITCHENS · CABINETS · FIXTURES · EST. 1921"), the Works
  marquee, the terminal's sync screens, the red steps.

## 4. Completed interiors

**21 interiors, all shipped** (the W11 registry-truth repair flipped the last
eight 'planned' rows to 'built (W5)', 2026-11-13) — **plus the Corner House
(CORNERHOUSE-INT), built W14 (2026-11-13)** on the owner's confirmation, the
registry's last openDecision:

- LAUNDRY-INT, BARBER-INT, PIZZA-INT, DINER-INT, BAKERY-INT, RECORD-INT,
  HALL-INT, CECIL-ROOM, MEZZ-INT — all built (W5).
- The interior dressing: 32 procedural GLB programs
  (`tools3d/sandflow_eval/programs/`) + 141 ABO furniture GLBs
  (`assets/furniture/`, CC-BY-4.0, meshopt + KTX2, ~300 KB median).
- The seam: `web-three/src/world/furniture.ts` (the load seam) +
  `world/interiorAssets.ts` (the dressing manifest) + `world/interiors/plan.ts`
  (the plan layer).
- The optional slice: CORNERHOUSE-INT — **CLOSED W14 (2026-11-13)**: built on
  the owner's confirmation ("build corner house"). The open corner-grocery
  band (a 2.4 m door flush between the shop windows, the classic NYC open
  storefront), the dry-goods fit-out (goods walls, the center gondola off the
  door line, the counter + register, the seasonal crates at the corner pier,
  the detergent shelf, the soda cooler), the named far pane, the duck tower.
  `buildW14CornerHouse` + `probe-w14-cornerhouse.mjs` + the walkability leg.

## 5. Systems already integrated

- **The World Contract** (2026-11-06): global sim state, in-game clock,
  spatial-semantic registry, entity identity, NPC behavior arbitration,
  narrative validation, economy guardrails. Contracts in
  `docs/architecture/world-contract/`; implementation in `web-three/src/sim/`.
- **The runtime integration** (2026-11-06, roadmap Phase 1): the D-1 tick valve
  runs in `Game.frame` beside the story; in roam/scenario the bound cast (Rosa,
  Idris) lives their clock-keyed schedules through arbitration; the world save
  rides its own key (`first_slice_world_v1`).
- **The fenestra windows** (2026-11-12): the 447 windows of the block render as
  rooms with furniture and plants behind the glass — the interior-mapping
  technique adapted from codedgar/three-fenestra (MIT). Pinned by tests and by
  the probe that measures the pixels.
- **The subway ride** (2026-11-13 W11 fixes): the K line works end-to-end —
  the ride takes 22 real seconds at any frame rate; both stations' exit stairs
  are open; the Times Square canyon is reachable.
- **The walkability scanner** (W10, 2026-11-13): `diag-pocket-scan.mjs` — a
  full-map flood fill at 0.5 m grid, 8-connected, no corner-cut, reporting every
  free component unreachable from spawn. The standing gate for any future map
  growth: any wave that grows the world re-runs it.
- **The fire-escape filigree** (W12, 2026-11-13): 170 alpha-cutout ironwork
  panels, one InstancedMesh, one draw call, zero colliders.
- **The NYC architectural detail kit** (`world/nycKit.ts`): HVAC units, cornice
  bands, awnings, fire-escape stacks, steam vents, subway stairs + globe posts,
  mailboxes, scaffold sheds — ported from slop-newyork (MIT), provenance in
  `docs/slop-integration/`.
- **The ABO furniture pack** (141 GLBs, CC-BY-4.0): the interior dressing seam,
  byte-identical copies in `web-three/public/models/furniture/`, pinned by test.
- **The 4-day E2E** (`web-three/scripts/e2e.mjs` + the probe harness): the
  playable proof that the story spine (C0–C6, the Day 1–4 opening) ships.

## 6. Files modified this session

**No files in the project repository were modified this session.** This
session produced the **world-map documentation package** under
`docs/world-map/` (9 files + this handoff). The package is delivered as a
standalone directory at `/home/z/my-project/download/docs/world-map/` for the
user to drop into their local clone and commit/push.

**No git push was performed.** The leaked PAT from the user's first message was
not used (it should be revoked; see §9). The remote repository was only read
(public clone, no credentials). The next commit/push is the user's to make.

## 7. Tests executed and results

**Not re-executed this session** — the sandbox does not have a running dev
server or the `web-three` npm install. The test battery's last green state is
recorded in `worklog.md` (2026-11-13, the W12 filigree wave):

- `npx tsc --noEmit` — **clean**.
- `npx vitest run` — **1,683 / 1,683 tests across 100 files** (+1 from W12).
- `npm run build` — **OK** (739 ms).
- `validate-registry` — **OK** (178 IDs, 81 buildings, 7 parks, 21 interiors,
  23/23 anchors).
- `probe-city-fabric` — **OK** (DRAWS 190, dusk warmth 1.3).
- `probe-world-visual-quality` — **OK** (console clean, budget < 200 holds).
- `probe-integration` — **0 errors, 8/8 walks** (calls 189).
- `diag-pocket-scan` — **byte-identical** (colliders 977, spawn-comp 41,866,
  traps 19, cramped 0).
- `probe-w12-filigree` — **OK** (170 instanced panels).
- `probe-subway` — **ALL PASS** (46 checks).
- `probe-subway-mobile` — **ALL PASS** (11 checks).
- `diag-ride-fullflow` — **ALL PASS** (16 legs, console clean).

The next agent should re-run this battery before any new work, in
`web-three/`:

```bash
cd web-three
npx tsc --noEmit && npx vitest run && npm run build
node scripts/validate-registry.mjs   # or the registry validator's current path
node scripts/probe-walkability.mjs
node scripts/probe-subway.mjs
node scripts/diag-pocket-scan.mjs
```

## 8. Known bugs / open ledger rows

Carried from the W11/W12 worklog and `docs/architecture/world-contract/`'s
ledger:

1. ~~**The D-3 money bridge**~~ — **CLOSED 2026-11-13 (stale truth):** the bridge
   shipped in WP-4 (`2203f05`, `sim/moneyBridge.ts` wired into `Game`'s
   earn/spend behind the same confirm-gates) and is verified live in the built
   game — `probe-money-trace` ALL CHECKS PASSED (genesis $87.00 on both sides
   of the sanctioned mirror, the five rush cups as +$5.00 `business_revenue`
   faucets with deterministic ids, the ledger audit clean, $112.00 landing;
   at `E2E_SCALE=0.35` — the full-scale run exceeds this box's wall budget,
   the documented dilation class).
2. ~~**The ambient-walker schedule migration**~~ — **CLOSED 2026-11-13 (stale
   truth):** WP-3v landed 2026-11-06 (`e3f1b02`) — the ambient walkers commute
   over the ONE Phase 3 nav graph (`world/pedCommute.ts`), Yuka kept, every
   hard guarantee kept; `ped-commute.test.ts` (390 lines) pins the state
   machine deterministically. The probe's step-3 wall window reads 0 completed
   commutes on this software-GL box (5 fps — the DEF-15 dilation class;
   verified identical on the pre-merge remote tree), while the movement,
   district-legality, separation and armed-machine steps stay green.
3. **The fenestra atlas mip re-audit** (`docs/production/fenestra/01-FENESTRA-INTEGRATION.md`
   §7). The hardware `generateMipmap` and a hand-built per-cell chain both
   sampled into 2–4 px facade speckle on the verification rig; level-0 sampling
   is clean. Re-check on a real GPU before enabling a chain — this sandbox is
   software GL, so the check stays honest-open.
4. ~~**The band courses + soot approximation**~~ — **CLOSED (W13, register
   v1.65.0):** the real band courses + soot plumes shipped through the
   compliant route (469 pieces, zero colliders, +0 draw calls — the census
   stays 190).
5. ~~**The optional slice: CORNERHOUSE-INT.**~~ — **CLOSED (W14, register
   v1.68.0):** built on the owner's confirmation; the openDecision ledger is
   now empty of construction decisions (the street-canon and bus-body
   decisions are the lead's, not construction).
6. ~~**The live screenshot set for the world-map audit**~~ — **CLOSED
   2026-11-13:** all twelve frames captured from the real built game by
   `web-three/scripts/probe-world-map-evidence.mjs`, dropped under
   `docs/world-map/images/existing/` (§13 below).

## 9. Security notice (read before any push)

**A GitHub Personal Access Token has appeared in plain text in the chat**
(the user supplies one per session; the current one starts
`github_pat_11CMJWORA…`). **The repo's law stands:** never commit a token to
the repository, never echo it in a commit message, a worklog entry, or a doc;
never store it on disk (the pushes use the one-time inline URL and write no
credential files). AGENTS.md §4 (Secrets law) is explicit.

**Push state 2026-11-13:** the session's token AUTHENTICATES (identity
`desurfofficial-ship-it`, the repo GET returns `permissions.push: true`) but
the GIT PUSH returns 403 "Permission … denied" — the fine-grained PAT was
created without this repository's **Contents: read and write** grant (the
public-repo read works, the write refuses). The fix is the owner's: edit the
token at https://github.com/settings/tokens → Repository access → include
`desurfofficial-ship-it/first-slice-nyc`, Permissions → Contents: Read and
write — or issue a fresh token with that grant, or push manually. The local
`main` carries all verified work (the merged line + the evidence tranche +
the ledger-truth closures) and is recoverable regardless.

For the next push, one of:

- The same PAT with the **Contents:write grant added** (the owner edits it).
- A **deploy key** scoped to the repository.
- A **GitHub Actions workflow** that commits on behalf of the agent.

## 10. Remaining tasks

The world-map design lock's remaining work:

1. **Drop this `docs/world-map/` package into the project repo** (the user's
   local clone), commit, and push. Suggested commit message:
   `docs(world-map): add the world-map design lock package (01–09) + the five-repo engineering reference study`.
2. **Capture the live screenshot set** (§6 of `01-existing-world-audit.md`)
   from a running dev server and drop under `docs/world-map/images/existing/`.
3. **Generate the top-down map and the 3D overview** (the visual blueprint the
   directive's §3A and §3B mandate). These should be real rendered images:
   - The top-down map: a bird's-eye render from y = 200 looking down at the
     playable core (x ±100, z ±64), labelled with the five streets, the seven
     parks, and the major landmarks. The probe `probe-skyline.mjs` or a custom
     probe can capture the frame.
   - The 3D overview: an isometric or high-angle render of the full block at
     golden hour, communicating building density, heights, and the skyline.
4. **Generate the neighbourhood visual targets** (the directive's §3D). For
   each of the five streets, a concept frame or a captured gameplay frame that
   communicates the street's identity. Label as gameplay or concept.
5. **Curate the street-level reference library** (the directive's §3C and the
   `06-visual-reference-library.md` document). Real photographic references
   for NYC streets, brownstones, storefronts, fire escapes, street furniture,
   parks, alleys, interiors — with per-image captions explaining what each
   reference guides.
6. **Close the open ledger rows** (§8 above) — the D-3 money bridge, the
   ambient-walker schedule migration, the fenestra atlas mip re-audit.

## 11. Exact next recommended actions (in order)

1. **Revoke the leaked PAT.** https://github.com/settings/tokens → Revoke.
   Generate a fresh, secret-stored PAT if pushes are still needed.
2. **Drop `docs/world-map/` into your local clone:**
   ```bash
   cp -r /home/z/my-project/download/docs/world-map/ <your-clone>/docs/world-map/
   cd <your-clone>
   git checkout -b docs/world-map-design-lock
   git add docs/world-map/
   git status   # orient
   ```
3. **Read the package** — start with this file, then `09-engineering-reference-study.md`,
   then `01-existing-world-audit.md`, then `02-complete-world-design.md`.
4. **Re-run the test battery** (§7) to confirm the tree is green before any new
   work.
5. **Commit and push** (after the PAT is revoked and a fresh credential is in
   place):
   ```bash
   git commit -m "docs(world-map): add the world-map design lock package (01–09) + the five-repo engineering reference study"
   git push origin docs/world-map-design-lock
   # open a PR against main, or merge directly if the workflow allows
   ```
6. **Capture the live screenshot set** (§6 of `01-existing-world-audit.md`)
   from a running dev server (`cd web-three && npm run dev`). Drop the frames
   under `docs/world-map/images/existing/`.
7. **Generate the top-down map + 3D overview** (§3A and §3B of the directive).
   The probe harness (`web-three/scripts/probe-skyline.mjs`, `probe-cam.mjs`,
   `diag-composed-shot.mjs`) is the existing tool for composed frames; a custom
   probe for the top-down bird's-eye at y = 200 is a small addition.
8. **Update this file** with the new commit hash, the new branch, and the
   screenshot paths.

---

## 12. The handoff contract

A new agent reading this document should be able to:

1. Clone the repo at commit `44534bb` (or later, if the world-map package has
   been committed).
2. Read `docs/world-map/08-implementation-progress.md` (this file) and
   `docs/world-map/09-engineering-reference-study.md` for the engineering
   context.
3. Read `AGENTS.md` §0 (the bible's pillars), §1 (the Laws), §1e (the
   engineering reference law), and `docs/57-engineering-references.md` for the
   standing study ledger.
4. Read `docs/narrative/04-world-and-neighborhood-bible.md` for the world
   canon, and `docs/data/world-registry.json` for the construction truth.
5. Run the test battery (§7) and confirm green.
6. Continue from §10 (remaining tasks) and §11 (exact next actions).

The agent does **not** need the previous agent's conversation history. The repo
is the memory.

— Z.ai agent, 2026-11-13

---

## 13. Session addendum — the evidence tranche (2026-11-13, later)

The construction-authorization session merged the two diverged agent lines
(local: the postcard fridge-test pass + the rolling pace law; remote: W8–W13
+ this design package), re-certified the merged tree (tsc clean · vitest
1,709/1,709 across 102 files · build OK · validate-registry OK · pocket scan
deterministic 42,241/18/13 · city-fabric 190 draws · subway ALL PASS), and
executed §3 items 2–5 of `07-map-completion-checklist.md`:

- **The §6 shot list** — all twelve frames captured from the real built game
  by `web-three/scripts/probe-world-map-evidence.mjs` (one boot; the honest
  walk-in boarding + the registry's own `perform()`; the real exit walk;
  zero page errors). Under `docs/world-map/images/existing/`.
- **The labelled top-down map** — `images/top-down-map-labelled.png`; the
  y=140 north-up render labelled from the registry's own coordinates
  (`scripts/label_topdown.py`), with a 20 m scale bar.
- **The 3D overview** — `images/overview-isometric-golden.png`; the
  golden-hour high-angle render from inside the walls.

The ride forensics the probe taught (recorded in `worklog.md`, the
WORLDMAP-EVIDENCE entry): the board is the registry interact's `perform()`;
the batch-driven machine rides honestly while the capsule stays pinned (the
train never moves — the tunnel streams); the exit walk needs the machine
retired (feet off the car band, z < 13.9) and the player unfrozen (the
story's order/name cards fire on sim time).

Remaining: the open ledger rows (§8 above) and the optional slice
(CORNERHOUSE-INT). The push rides the owner's token — the supplied
fine-grained PAT authenticated but lacks this repo's Contents:write grant,
so the owner must grant it (or push manually); nothing is stored on disk.

— Z.ai agent, 2026-11-13

---

## 14. Session addendum — the W14 Corner House interior (2026-11-13, later)

The registry's last openDecision closed on the owner's confirmation ("build
corner house"). CORNERHOUSE-INT ships as a real ground floor in KTN-00W, the
block's corner store at the Kestrel×Juniper intersection:

- **The carve** (`buildW14CornerHouse`, the FRUIT-INT full-cavity pattern):
  the W1 mass retires; the decomposition is the duck tower (y 3.2..16, the
  hideable-while-inside law) + three blind walls (the Juniper skin, the
  KTN-01 party wall, the hall's shared north wall) + the opened south facade
  — ONE open corner-grocery band (the 2.4 m door flush between the two 2.2 m
  shop windows, no door/window piers — the classic NYC open storefront under
  the shipped fascia), the shipped CORNER HOUSE storefront glass becoming the
  named far pane (`CornerHouse_Glass` — the docs/47 swap law), and the W1
  chamfer pier gaining its collider.
- **The fit-out**: the dry-goods floor — goods shelves down both skins, the
  center gondola seated WEST of the door line (a real corner store keeps its
  island off the door), the counter + register under window E, the stacked
  seasonal crates at the corner pier (the canon's "dress per season" table),
  the display under window W, the detergent shelf + two units + the soda
  cooler at the back wall. 5 GLB slots riding the batch's OWN files (no new
  programs — the provenance law holds). The ochre wainscot identity pass +
  the light strip ride `dressRoom` like every room.
- **The pocket-scan law held the wave honest**: the first cut (silled
  windows + a 1.4 m door) read the room a 180-cell trap — the scanner's
  0.5 grid + capsule dilation zeroes every shipped door width (the W5
  rooms' 1.2 m doors are the same grid-alias traps, documented in the W13
  census) and the room's own fixtures sealed the window lines. The fix is
  the authentic one (the open storefront band + the W9 no-sill convention +
  the gondola off the door line): the room connects through its own front —
  spawn-comp 42,241 → **42,436** (+195, the floor joins the map), traps stay
  **18**, cramped **13**, the scan byte-identical across runs.
- **The draw ledger (priced)**: probe-city-fabric DRAWS 190 → **191** (+1 —
  the carve's tile-split/live far-pane price; the cheapest carve price the
  W5/W9 rooms predate; the bodega-hero precedent prices live draws when the
  store earns them).
- **Files**: `web-three/src/world/World.ts` (the builder + the named glass +
  the dressRoom row), `web-three/src/world/interiorAssets.ts` (the
  CORNERHOUSE slots + the room union), `web-three/tests/interior-assets.test.ts`
  (the room lists), `web-three/scripts/probe-w14-cornerhouse.mjs` (new),
  `web-three/scripts/probe-interior-dressing.mjs` (the CORNERHOUSE frame +
  EXPECT row), `web-three/scripts/probe-walkability.mjs` (the new leg),
  `web-three/scripts/diag-w14-skirt-only.mjs` (the flakiness A/B forensic),
  `docs/data/world-registry.json` (the interior row + W14 phase + the
  openDecision closed + the corrections entry).
- **Tests**: validate-registry OK (179 IDs, 22 interiors, 23/23 anchors) ·
  tsc clean · vitest 1709/1709 (102 files) · build OK · probe-w14 PASS ·
  probe-w5-interiors PASS · probe-interior-dressing PASS (75 GLB + 40 ABO) ·
  probe-walkability's corner-house leg PASS (closed 2.5 m) ·
  probe-integration 0 errors 8/8 walks · pocket-scan deterministic ×2.
- **Known items carried**: the skirt-corridor leg's run-to-run flip is the
  documented mover-nondeterminism class (the 8-sample A/B: 3/4 green on W14,
  2/4 green on the d855713 baseline — no wave coupling); the draw census
  re-baselines at 191; the fenestra atlas mip re-audit stays honest-open.

---

## 15. Session addendum — W18, the DEC-13 approval wave (2026-11-13, later)

The owner exercised the fresh §8 gate ("your §8 call on the Catalpa Junction
package is the only decision standing between the roadmap and the second
district — I approve it"). The wave landed the approval and the canon's own
reconciliation, documents only:

- **The adjudication of record** (`docs/production/DEC-13-CATALPA-JUNCTION-
  PACKAGE-APPROVAL-DECISION.md`, new): the design package APPROVED as filed —
  scenario **S1 (transit-gated)** governing, **W-C1 "the Junction docks"**
  authorized (~9 rows + the K-line platform stub; its measured ledger row the
  wave's own deliverable under the DEC-2 priced-wave law); what stays gated:
  S2's skyline price, S3's two-live-districts budget (a DEC-2-class ruling the
  owner keeps), the ride-seam machine wave, the program depth, the Passport.
- **The Narrative Director's reconciliation** (the package's own precondition,
  executed against docs 04/06/09/12/15; dated ruling in docs/narrative/15 §7):
  the name passes (the tree-rooted grammar extended, the `CJN-*` prefix
  append-only); the geography passes (the K line's west reach beyond 42 ST —
  the direction the shipped tunnel already runs; "one stop past Alder Heights"
  recorded as social distance, not a stop-count); **the C6 mapping is
  corrected by the canon** — Juniper Commons rises on the Alder Works parcel
  (doc 04 §6; doc 15 §1), Provisions Hall is its food hall, the hundredth tree
  stands at Kestrel Green: **the hall does not move**. Catalpa Junction is the
  open endgame's district (doc 09 §8's continuation paths; doc 15 §3.8's
  intended openness) — its beats NEW, no C6 station relocated.
- **The paper trail** (the DEC-4 living-docs precedent — filed history kept):
  the design package → APPROVED banner + dated amendments (§1 anchor, §5 gate
  1, §7 decided); DEC-12 §3 → the gate GRANTED; BOROUGH-SCOPING-STUDY header +
  §5 law 1 → SATISFIED; AGENTS.md §0 DIRECTION → the gate opened, the package's
  own §5 gates govern each wave; MASTER-GAME-ROADMAP §1 item 3 + the Phase-8
  STATUS tail → DEC-13; PRODUCTION-RISKS-AND-DEPENDENCIES → the DEC-12 row
  closed out + the new DEC-13 row RULED; docs/narrative/15 → the §2 DEC-13 row
  + §6's naming registry (Catalpa Junction + the Junction spur) + §7's dated
  ruling; register v1.73.0.
- **Zero runtime path**: docs-only wave — the registry read, never written;
  no geometry, no code. Gates (the docs-only re-certification precedent):
  validate-registry OK (179 IDs, 81 buildings, 23/23 anchors) · tsc clean ·
  vitest 1,719/1,719 (103 files) · build OK.
- **Next**: W-C1, the Junction docks — the second district's first priced
  slice, built under the package's own §5 gates (append-only `CJN-*`, no
  geodata, per-wave batteries, purpose + interaction + books at the Alder
  Heights bar, same-commit law).

— Z.ai agent, 2026-11-13

---

## 16. Session addendum — W-C1, the Junction docks (2026-11-13, later)

The second district's first priced slice, built under DEC-13's approval and
the design package's own §5 gates:

- **The registry slice** (append-only, `CJN-*` only): nine dock rows on the
  K line's west reach past 42 ST (x −450..−378, the registry's free band) —
  the spur's west row (CJN-01..05, dock doors east) and east row
  (CJN-06..09, dock doors west), the Iron Works ghost-sign shell, the loft
  row's roofline — plus **CJN-SUB**, the K-line platform stub (the SUB-TS
  slot-row precedent, h 0, class A). Statuses `built (WC1)`; shells only (no
  interiors/businesses/residents/story — each its own priced wave). The mjs
  validator gains the WC1 pin block (footprints + heights + statuses pinned,
  the w7 precedent); the registry carries the WC1 construction phase.
- **The builder** (`web-three/src/world/catalpaJunction.ts`, new — World.ts
  grows by the wiring only, the R-NEW-3 discipline): the A-3 law holds (every
  mass READS its registry row via `regShell`; the h-0 slot row rides
  `regFootprint`, the ALY-02/SUB-TS law); canvas facades on the spur faces
  (brick courses, window grids, dock bands, the rows' lettering, the Iron
  Works ghost sign); the spur itself (paving, curbs, the dead rails, bollards,
  lamps, the FREIGHT SPUR stencil); two iron footbridges; the station stub
  (platform slab, cut walls opening around the stair and the track throat,
  columns, the CATALPA JUNCTION name band, the headhouse kiosk with the K
  bullet). `CJN_Group` is zone-owned: two new ZoneDefs (catalpaSurface,
  catalpaPlatform) in the subway's table; the group lights only inside them;
  NAMED_SKIP keeps it out of every district tile; the zone bake fuses its
  untextured statics in-group (2 batches); cityFabric's ROOF_SKIP keeps the
  fabric off the far band. The builder never touches the scene.
- **The shared-sky law**: World ORs the TSS group's visibility with
  catalpaSurface — the Junction reads the same city (the square's towers
  east, the west rim behind its own rooflines). The sky dome's radius grows
  380 → 560: the old dome ended inside the district's band and the Junction
  read a black sky past Alder Heights' horizon.
- **The SKY-TS-W reconciliation** (DEC-13 §2.3's item, forced early by the
  overlap): the Times Square west rim (spire + 7 rim towers) moved
  x −428 → −476 — W-C1's approved footprints overlap the rim's old columns;
  the registry's SKY-TS-W line + the meta corrections entry carry the move
  (the W7 SKY-W/E precedent; no canon building row touched). From 42 ST the
  vista keeps its closure 48 m further out; from the Junction the rim reads
  as the district's own west backdrop.
- **THE LEDGER ROW (measured, probe-wc1-catalpa.mjs — the diag-tss-census
  method, the game's own composed frames)**: shipped spawn frame **191 draws
  with the district resident and dark — +0 standing** (probe-city-fabric
  byte-identical ✓); the spur lit **60 draws**; the platform lit **25 draws**
  — Catalpa's own census inside the same < 200 probe budget (S1's district
  law). Return-to-spawn re-darkens (the renderer guarantee: invisible
  subtrees cost zero).
- **The battery**: validate-registry OK (189 IDs, 91 buildings, 23/23
  anchors) · tsc clean · vitest **1,734/1,734 (104 files, +15: the catalpa
  suite)** · build OK · probe-wc1-catalpa OK (the ledger above; two
  portraits: shots/world-map/wc1-spur-portrait.png,
  wc1-platform-portrait.png) · probe-city-fabric DRAWS 191 byte-identical ·
  probe-integration 0 errors 8/8 walks (191 draws) · probe-world-sim **15/15
  at worldclock=240** · probe-a3-flip PASS (console clean) · probe-fenestra
  ALL PASS · probe-chokepoints OK · diag-pocket-scan deterministic ×2
  (spawn-comp **42,436 unchanged**, traps **18 unchanged**, colliders
  977 → **1018** — the CJN colliders' honest +41, all outside the playable
  extent; the walkable map untouched).
- **The honest carries**: probe-walkability's static sweep PASS (37/37 lanes
  bypassed, 24 door approaches walkable — the registry-facing half); its
  live-leg half cannot finish at this box's ~2 fps (the documented dilation
  class, the W14 skirt-corridor precedent — probe-integration's 8/8 live
  walks stand as the live evidence). **probe-subway's Wow-card check fails
  on the BASELINE tree too** (the A/B worktree at e792abd, built and run on
  this box — the same 1 FAIL both sides: the wall-budget class, a day-end
  card owning the panel at the sync on this box's clock; not the wave's
  regression). The full-scale 4-day E2E stays the faster-box follow-up (the
  W16 record's own standing item).
- **Next**: W-C2+ ride the package's gates — the ride seam (the third
  station machine, the SKY-TS-W corridor's remaining reconciliation), the
  spur's businesses opening with books, the district's own census growth —
  each priced first, the Alder Heights bar throughout.

— Z.ai agent, 2026-11-13
