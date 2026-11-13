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
| **Milestone** | World-map design lock + five-repo engineering reference study |
| **Phase** | Vertical Slice production — narrative reboot canon (v1.0, 2026-11-06) |
| **Registry version** | v1.64.0 (the W12 filigree wave + the merged subway-ride repair + sidewalk-color fixes, 2026-11-13) |
| **Implementation phase** | **Complete for the vertical slice.** All 178 registry IDs built. All 21 interiors shipped. All 7 parks built. All 23 anchors placed. The walkability scanner reads clean. |
| **Branch (local clone)** | `main` |
| **Latest commit hash** | `44534bbb9b5b8202a5a3f88989e828bd868922ef` |
| **Commit subject** | `Merge origin/main into main — the remote line's subway ride repair (v1.63.0) + the sidewalk-color fixes join the W12 filigree wave; the arriving wave's row RENUMBERS v1.63.0 → v1.64.0 (the C3-wave precedent — the ledger stays strictly monotonic and unique); both register/worklog sides preserved (the W9 row re-homed next to its v1.59.0 neighbor)` |
| **Commit date** | 2026-11-13 04:09:25 +0000 |
| **Remote** | `https://github.com/desurfofficial-ship-it/first-slice-nyc.git` (public; read-only clone needs no credentials) |

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
eight 'planned' rows to 'built (W5)', 2026-11-13):

- LAUNDRY-INT, BARBER-INT, PIZZA-INT, DINER-INT, BAKERY-INT, RECORD-INT,
  HALL-INT, CECIL-ROOM, MEZZ-INT — all built (W5).
- The interior dressing: 32 procedural GLB programs
  (`tools3d/sandflow_eval/programs/`) + 141 ABO furniture GLBs
  (`assets/furniture/`, CC-BY-4.0, meshopt + KTX2, ~300 KB median).
- The seam: `web-three/src/world/furniture.ts` (the load seam) +
  `world/interiorAssets.ts` (the dressing manifest) + `world/interiors/plan.ts`
  (the plan layer).
- The optional slice: CORNERHOUSE-INT (registry openDecision reworded in W11 to
  "stays an optional slice" — not a gap, a documented option).

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

1. **The D-3 money bridge** (roadmap open item). The D-1 tick valve runs in
   `Game.frame`; the D-3 money bridge is the remaining ledger row.
2. **The ambient-walker schedule migration** (roadmap open item). The bound
   cast lives their clock-keyed schedules; the ambient walker schedule
   migration is the remaining ledger row.
3. **The fenestra atlas mip re-audit** (`docs/production/fenestra/01-FENESTRA-INTEGRATION.md`
   §7). The hardware `generateMipmap` and a hand-built per-cell chain both
   sampled into 2–4 px facade speckle on the verification rig; level-0 sampling
   is clean. Re-check on a real GPU before enabling a chain.
4. **The band courses + soot approximation** (`docs/slop-integration/01-SOURCE-REUSE-REPORT.md`
   §4). The fire-escape filigree gap closed (W12); the band courses + soot stay
   the honest approximation. A future atlas or alpha-tested pass could close
   that gap if the visual budget allows.
5. **The optional slice: CORNERHOUSE-INT.** Documented as "stays an optional
   slice" in W11 — not a bug, a deferred option.
6. **The live screenshot set for the world-map audit** (§6 of
   `01-existing-world-audit.md`). The shot list is defined; the frames are not
   yet captured. The next agent with a running dev server should capture them.

## 9. Security notice (read before any push)

**A GitHub Personal Access Token was leaked in plain text in the user's first
message of this session.** The token string started with `github_pat_11CMJWORA…`.
**Do not use this token.** It must be **revoked** at
https://github.com/settings/tokens before any push is attempted.

For the next push, use one of:

- A **fresh, secret-stored PAT** (generated after revoking the leaked one),
  stored in a secret manager or `gh auth login`, never pasted into a chat
  prompt or a commit.
- A **deploy key** scoped to the repository.
- A **GitHub Actions workflow** that commits on behalf of the agent.

**Never commit a token to the repository.** Never echo a token in a commit
message, a worklog entry, or a doc. AGENTS.md §4 (Secrets law) is explicit:
"Never hardcode tokens, keys, or credentials in any file, command that gets
committed, or doc."

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
