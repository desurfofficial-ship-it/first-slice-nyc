# FIRST SLICE: A New York Story
## Document 55 — Phase 1 Exit Checklist (the Doc 07 §9 gate, made runnable)

> **Status:** Ledger, not a plan. No features here — only checkboxes, commands,
> pass rules, and evidence paths. When a box turns green, the evidence lands
> where this file says it does, and the owner line gets a name.
>
> **Sources:** [Doc 07 §8–§9](07-vertical-slice-design.md) (playtest plan,
> exit criteria) · [Doc 06 Phase 1](06-production-roadmap.md) ("Doc 07 §9
> checklist fully green with 10 external playtesters") · [Doc 06 §9](06-production-roadmap.md)
> (the fridge test) · [Doc 06 §7](06-production-roadmap.md) (Definitions of Done).
>
> **Baseline when mapped:** main @ `4b385b2`, `tsc --noEmit` clean,
> vitest **457/457** (26 files). Every file and probe named below was
> verified to exist on that tip.

---

## 1. The gate — one checkbox per Doc 07 §9 criterion

### [ ] 1. All 10 features pass acceptance on iPhone 11 + Galaxy A14

Two layers: the feature layer (§2 table, each feature's probe) and the
device layer (below). Both must be green.

**Command — feature layer (desktop-grade, per feature):**
```bash
cd web-three && npm run build
node scripts/probe-doc12.mjs        # VS-F01 Map + VS-F03 order card
node scripts/probe-w5-interiors.mjs # VS-F02 interiors (bodega + laundry)
node scripts/probe-climb.mjs        # VS-F02 fire escape climb
node scripts/probe-solid.mjs        # VS-F02 solidity (bodies hold)
node scripts/e2e.mjs                # VS-F03 + VS-F04 full 4-day rails
node scripts/probe-peds.mjs         # VS-F04 crowd
node scripts/probe-album.mjs        # VS-F05 album thumb path + share
node scripts/diag-wow-card.mjs      # VS-F05 + VS-F06 wow card
node scripts/probe-subway.mjs       # VS-F07 ride + teach laws
node scripts/probe-skyline.mjs      # VS-F08 lit windows
node scripts/probe-characters.mjs   # VS-F09 cast evidence
node scripts/probe-perf.mjs         # VS-F10 renderer ledger
```

**Device layer — the stand-in that exists today (browser, touch, portrait):**
```bash
node scripts/probe-subway-mobile.mjs     # 390×844, touch joystick + USE
node scripts/probe-a5g-arrival-portrait.mjs  # the arrival film, portrait
node scripts/probe-arrival-portrait.mjs
node scripts/probe-characters.mjs        # mobile-portrait captures
```

**Device layer — the real gate (manual, no script can do this):**
Deploy `web-three/dist/` to the Pages site (`.github/workflows/deploy-pages.yml`
— push trigger verified `branches: [main]`; CI runs typecheck + unit tests
before every deploy) → open
`https://desurfofficial-ship-it.github.io/first-slice-nyc/` on an
iPhone 11 and a Galaxy A14 → walk the Doc 02 script once per device.

**Pass rule:** every probe above exits 0 with clean console; every feature's
probe still green at its mobile viewport; on-device manual pass for all 10
features on BOTH devices; VS-F10 budgets hold (60 fps iPhone 11 / SE 3,
30 fps floor Galaxy A14, < 150 draw calls typical street, < 1.2 GB).

**Honest gap:** there is no device farm in the repo. The browser probes are
the CI-grade stand-in until the on-device run happens. The gap is the work —
not a reason to shrink the rule.

**Evidence:** probe stdout + `web-three/probe-shots/`; device sessions
recorded → `assets/device-run-01/`. **Owner:** __

---

### [ ] 2. Playtest targets (§8) met with 10 external testers

The human gate. No automated probe measures a feeling. The E2E driver proves
the path is walkable unaided (~127 checks across 4 days); it never proves a
person stayed. Panel per Doc 07 §8: 5 never-been-to-NYC, 3 cozy-genre
players, 2 NYC residents. Instrumented funnel + 15-min interview. The
driver's share of this: ~127 checks across 4 days prove the path itself.

| # | Metric (Doc 07 §8) | Target | How measured | Evidence path |
|---|---|---|---|---|
| 2a | Reach first postcard unaided | ≥ 85% | observer sheet / session recording per tester | `assets/playtests/01/` |
| 2b | Share/save intent (stated) | ≥ 70% | interview note per tester | same |
| 2c | "I felt looked after by the city" | ≥ 4/5 mean | post-session survey | same |
| 2d | "I learned something I could repeat to a friend" | ≥ 80% yes | post-session survey | same |
| 2e | Session length | 25–35 min, no drop before minute 12 | session wall-clock + observation | same |
| 2f | NYC-resident recognition | ≥ 2/3 say a specific detail is "true" | resident panel notes | same |

**Pass rule:** all six rows meet target across the full panel. Any miss gets
a docs/51 entry (the fix is design work, never a silent tweak).

**Evidence:** results write-up (new doc when it happens, e.g.
`docs/56-playtest-01-results.md`) + raw sheets → `assets/playtests/01/`.
**Owner:** __

---

### [ ] 3. The six postcards pass the fridge test (Roadmap §9)

The ritual: each one printed, each one kept by someone. Physical first —
the probes only prove the cards exist and render before anyone prints them.

**Supporting probes (run first, so the printer prints something real):**
```bash
cd web-three && npm run build
node scripts/probe-album.mjs     # the album's thumb path; share stays honest
node scripts/diag-wow-card.mjs   # the sync-beat card (docs/51 B10)
npx vitest run tests/album.test.ts tests/wow-postcard.test.ts
```

**The ritual itself (manual):** play to the first postcard and the day-end
cards, download the real PNGs (`downloadPostcard` path), print all six
authored cards, give each to a different person. Roadmap §9: "If there's
nothing worth printing, the milestone isn't done."

**Pass rule:** 6 physical cards printed from real captured PNGs; 6 people
each chose to keep one. A card not kept reopens caption/framing iteration
(content change — logged in docs/51, checklist unchanged).

**Evidence:** photos of the cards on the studio fridge → `assets/fridge-test/`.
**Owner:** __

---

### [ ] 4. 1-Second Law audit: 10 random paused frames

Manual audit of the law (AGENTS.md §1.1): every paused frame reads
"New York" within one second, to someone who has never been.

**Tooling that already exists (produces the paused frames):**
```bash
cd web-three && npm run build
node scripts/visual-check.mjs    # key beats, desktop + mobile touch UI
node scripts/visual-d3.mjs       # Day 3 frames, portrait
node scripts/visual-d4.mjs       # Day 4 frames
node scripts/probe-polish-shots.mjs  # turnstile / ladder / doorway beats
```
Archives live in `web-three/shots/` and `web-three/probe-shots/`.

**The audit itself (manual):** during 3 real sessions, pause at 10 random
moments (vary day, district, time-of-day — randomize, don't curate). Show
each frame for 1 second to a never-visitor. Ask: "Where are you?"

**Pass rule:** 10/10 frames identified as New York within 1 s each, unprompted.
Any miss is a district/art debt — it gets a docs/51 entry with the frame
attached. (If they ask "how many windows are there?", the fantasy leaked —
Doc 07 VS-F08's own tripwire.)

**Evidence:** the 10 frames + the audit note → `assets/one-second-law/`.
**Owner:** __

---

### [ ] 5. No crash in 50 consecutive full playthroughs on device farm

**Repo-runnable proof (the browser loop):**
```bash
cd web-three && npm run build
for i in $(seq 1 50); do
  node scripts/e2e.mjs > "e2e-log-$i.txt" 2>&1 || echo "RUN $i FAILED"
done
```
One `e2e.mjs` run = one full 4-day playthrough (~127 checks, ~300 s on a
clean machine). 50 runs ≈ 4.2 h wall — an overnight job, not a sprint.

**Soak complement:**
```bash
node scripts/probe-w4-soak.mjs   # 30-min accelerated ped soak, worst-case dt
```

**Pass rule:** 50/50 runs AUTOTEST OK, 0 failures, console clean each run;
soak exits clean; zero renderer or page crashes in any log.

**Honest gap:** "device farm" means the same 50× loop on real iPhone 11 +
Galaxy A14 (criterion 1's device layer). The browser loop is the proof the
repo can run today. Known environment caveat from docs/51: one sandbox OOMs
in probe-w4-bus's long lap loop — run the 50× on a clean machine, not the
slow box.

**Evidence:** the 50 logs → `web-three/e2e-logs/` (CI artifacts if CI grows
the job); soak log alongside. **Owner:** __

---

## 2. Feature map — VS-F01…F10 → current main + probes that exist

Verified against main @ `4b385b2`. Doc 07 §4 defines the spec; Doc 06 §4
maps the epics; this maps the code.

| # | Feature (Doc 07 §4) | Lives in | Probes / tests that already exist | Status note |
|---|---|---|---|---|
| F01 | Map companion v1 | `web-three/src/ui/UI.ts`, `src/ui/sketch.ts`, `src/core/GameState.ts`, `src/core/Save.ts` | `tests/map-notebook.test.ts`; `scripts/probe-doc12.mjs` (order card + Map notebook + dusk payoff, desktop AND phone width) | Notes, margins, slang cards, save roundtrip guarded; the Map-copies-badly doodle rides the save (`map_priya_lines`, B11) |
| F02 | The Corner environment | `web-three/src/world/World.ts`, `streetAssets.ts`, `props.ts`, `dressing.ts`, `leaves.ts` | `tests/interiors.test.ts`, `tests/descend.test.ts` (fire escape), `tests/solidity.test.ts`, `tests/wall-slide.test.ts`; `probe-w5-interiors.mjs`, `probe-climb.mjs`, `probe-ladder.mjs`, `probe-reach-top.mjs`, `probe-solid.mjs`, `diag-bodega.mjs` | Block + bodega interior + cart + fire escape present; art-pass-1 residue tracked as B12 CLEAR items |
| F03 | Serving conversation v1 | `web-three/src/core/content.ts` (`OrderCard`/`OrderReply`), `src/game/interactionDefs.ts`, `src/game/Game.ts` | `tests/state.test.ts`, `tests/interactions.test.ts`; `probe-doc12.mjs`; money rails in `scripts/e2e.mjs` ("a serve is a serve regardless of the choice") | Choice replies incl. chef's welcome; no timers, no fail states; teach only when asked |
| F04 | The Shuffle | `src/core/GameState.ts` (`Step.CROSS`, `cross(atStrip)`), `src/world/peds.ts` | `tests/state.test.ts` ("crossing at the stripes teaches the Shuffle; crossing anywhere counts" — Seam 1), `tests/crowd.test.ts`; `probe-peds.mjs` | Forgiveness is law: crossing anywhere counts; the brush is the dance ("scuse me") |
| F05 | Postcard pipeline v1 | `src/postcard/PostcardCapture.ts` (`capturePostcard`, `composePostcard`, `sharePostcard`), `src/postcard/Album.ts`, `src/core/content.ts` (`composeCaption`, `tsWowCaption`), `src/ui/UI.ts` | `tests/album.test.ts`, `tests/wow-postcard.test.ts`; `probe-album.mjs` (share button stays honest where files cannot be shared), `diag-wow-card.mjs` | capture → caption → album → share wired; per-day captions + the sync-beat card (B10) |
| F06 | The Wow Walk | `src/world/timesSquare.ts`, `src/game/Game.ts` (`tsBeats` drain, `composeWowPostcard`) | `tests/wow-postcard.test.ts`; `diag-wow-card.mjs` (drives the honest subway route into the square); `probe-subway.mjs` | Scripted sequencer + billboard sync beat + auto-postcard; the paper holds the hands while the card is up |
| F07 | Subway University ride | `src/world/subway/` (`index.ts`, `ride.ts`, `trainKit.ts`, `stationKit.ts`, `zone.ts`), `src/game/interactionDefs.ts` (priya) | `tests/subway.test.ts` (incl. diagram-beat laws, B11); `probe-subway.mjs`; `probe-subway-mobile.mjs` (390×844 touch) | Guided ride, two-line teach drawn on the window, Map's crooked copy latched to the save |
| F08 | Skyline of Lit Windows v1 | `src/world/World.ts` (`goldWindowMat`, `skylineWinMat`, diary windows), `src/world/dressing.ts` (`skylineWindowMask`, `SKYLINE_WARMTH`) | `tests/skyline.test.ts`; `probe-skyline.mjs` | One gold window + the seeded warm panes beyond it; diary windows day-keyed |
| F09 | Cast of 5 + crowd | `src/game/interactionDefs.ts` (rosa, idris, priya, kid, usher), `src/world/peds.ts`, `src/world/personRig.ts` | `tests/crowd.test.ts`; `probe-characters.mjs` (idle / stride / close-ups, mobile portrait), `probe-a5f-meet-flow.mjs`, `probe-kid2.mjs`, `probe-kidfollow.mjs` | All five exist with interactions; ambient walkers are bodies (probe-solid) |
| F10 | Performance & polish | `src/game/Game.ts` (renderer), `src/camera/GameCamera.ts` | `probe-perf.mjs`, `diag-perf-breakdown.mjs`, `probe-shadow-cost.mjs`, `probe-scene-census.mjs`, `probe-w0-census.mjs` | Ledger rule: no phase ships above the previous ledger. Kestrel still over 150 — B13, open |

All probes run against `web-three/dist/` — `npm run build` first, always.

---

## 3. Must clear before exit — the only OPEN items in docs/51

Everything else in the ledger is FIXED with evidence. These three are open.
They are work items, not checklist changes.

### B12 — Visual-audit follow-ups (Doc 31)
- **What's owed:** Day-4 greeting frame composes the two figures into the
  middle third; evidence frames carry the correct day's HUD (staged Day-1
  HUD on Day-3/4 moments is evidence hygiene, not game truth); the minor
  CLEAR items (floating AC units, baseless lamp poles, clipped signs,
  antenna, teal-door scale) get one in-engine look each before fixing —
  the Anti-Slop gate (AGENTS.md §1b).
- **Probe:** `node scripts/probe-visual-evidence.mjs`, `visual-d4b.mjs`
  (Day-4 evidence frames), `probe-polish-shots.mjs`.
- **Pass rule:** evidence frames show the correct-day HUD; the greeting
  frame composes right in-engine; each CLEAR item either fixed or
  written down as "looked at, honest as-is".
- **Owner:** __

### B13 — Performance ledger still over ideal on full-street views
- **What's owed:** Doc 07's "< 150 draw calls typical street" for Kestrel;
  the standing gate is "no phase ships above previous ledger".
- **Probe:** `node scripts/probe-perf.mjs && node scripts/diag-perf-breakdown.mjs`
  on the three fixed rigs (PLAZA, CART_CORNER, SYCAMORE×GABLE — 846→462,
  718→405, 279→132 after the vertex bake `442b8c4`).
- **Pass rule:** Kestrel ≤ 150 on the ledger rig, or a published honest
  ledger row with the phase's before/after — never silent regression.
- **Owner:** __

### B14 — Documentation hygiene
- **What's owed:** older docs still read as if greybox/code had not started
  (AGENTS.md's header literally says "code pending" while main carries 457
  passing tests). Status language updated so the next agent does not
  re-scope the phase.
- **Checked this session (no fix needed):** the Pages deploy trigger was
  suspected corrupt (`branches: ain]`) — it is not. Blob-hash proof:
  worktree `git hash-object` == `HEAD:.github/workflows/deploy-pages.yml`
  (`a390447b`), and the file's true bytes are `branches: [main]`. The
  "corruption" was a terminal-output artifact — this sandbox's command
  output strips `[m` sequences (ANSI-escape detection), so `[main]`
  displays as `ain]`. Lesson for the next agent: when command output and
  the file API disagree, trust `git hash-object` + `od -c`, and never ship
  a fix whose only evidence is a paste of the command output.
- **Still owed:** AGENTS.md header + docs/18 (Phase 0 exit) status language.
- **Pass rule:** a new agent reading AGENTS.md → roadmap → docs/55 cannot
  mis-scope the current phase.
- **Owner:** __

---

## 4. How this file gets used

- One PR per green box (or per coherent group), evidence attached where the
  box says. No box is green because it "should work".
- The checklist changes only when Doc 07 §9 does. Findings from running the
  probes land in docs/51, not here.
- Provenance: Doc 07 §8–§9, Doc 06 §4 (Phase 1 epics), §7 (DoD), §9 (fridge
  test). Mapping audited against main @ `4b385b2` on 2026-11-04.
