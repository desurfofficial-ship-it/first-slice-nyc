# SECURITY-AND-GAMEPLAY-AUDIT — FIRST SLICE: A NEW YORK STORY

| | |
|---|---|
| Status | **Live document** — the full-spectrum QA/security pass (waves 1–3) |
| Assignment | Full-spectrum security, penetration testing, bug hunting & gameplay quality |
| Branch | `fix/qa-full-spectrum` — base `ebfb08a` (main, register v1.35.0); **wave 3: base `af78c11` (main, register v1.40.0)** |
| Evidence | `evidence/` — every result file named below was produced by a real run on the real built game (`dist/`) unless explicitly noted otherwise |
| Baseline carried forward | The security audit package (`docs/security-audit/`, v1.2) and its remediations R1+R2 (`08712a5`), integrated onto the evolved main in this wave |
| Wave 3 (this pass) | Re-verification on the C5 + city-fabric tree, the two open hardening closures (showcase gate, CI pinning), and one new HIGH-visibility defect found and fixed (the wardrobe ResizeObserver loop) — full detail in sections marked **(wave 3)** |

---

## A. Executive Summary

**Overall game health: strong.** The tree carries 1,300 passing tests across 83 files, the four-day story plays end-to-end against the production build with zero failures and a clean console (566 s), the world simulation probe is 15/15, and the money mirror holds to the cent. The game that ships today is dramatically larger than the tree the original security audit examined (the C0/C1/C2 narrative chapters, the rails engine, the majors' off-screen lives, nine interiors, the registry-flipped world, and the living pedestrian runtime all landed between the audit and this pass) — and every one of those waves' own gates re-verified green on this integrated tree.

**Security posture: materially hardened, honestly bounded.** The two confirmed findings (FS-AUDIT-001/002) are FIXED and re-proven on the integrated tree — production URLs cannot trigger destructive debug operations (31/31 probe), and a malformed world save degrades safely before hydration with the story save structurally unreachable (166/166 probe). This pass additionally **closed four of the six informational findings** (004, 005, 006, 007 — each with its documented remediation and a regression test), and found + fixed three integration defects the merge itself would have introduced (a dropped save section, a valid-save refusal, an over-eager quarantine) plus one pre-existing defect on main (the subway landing's missed follower).

**Gameplay quality: the opening communicates and the world answers.** The first-session pass verifies, with screenshot evidence, that a stranger with zero developer knowledge lands in the arrival film, is offered a visible SKIP, receives a legible handover (objective line, map-note guidance, money, dateline), can walk to an affordance within seconds, and gets a response from the very first interaction — all console-clean. The abnormal-player pass verifies the game survives the impatient and the malicious: boundary grinding, corner tunneling attempts, interaction spam, long idle, R-restarts, reload spam, and mid-boot interrupts produce no escapes, no NaN, no wiped saves, and no crashes.

**Major improvements this wave:** the R1+R2 remediation now lives on the evolved main with its contract intact; the world-save validator learned the evolved schema (the FlagStore grammar, the R6 missable provenance, the R5 life section); the driver-gate handshake reached the whole fleet; the clock and story-save parsers carry their trust boundaries at the source.

**Wave 3 (2026-11-11, this pass):** the tree had grown again since this audit (the C3/C4/C5 narrative chapters and the city-fabric pass — ~9.5k lines), so the whole gate battery was re-executed on the current build — **every gate green** (tsc clean, vitest 1427/1427 across 88 files, R1 31/31, R2 166/166, world-sim 15/15, money-trace PASS, nav 9/9, first-session 8/8, abnormal 14/14, perf zero page errors). The fresh attack pass added a new 29-check probe (URL fuzz × story-save tamper with XSS payloads × film/panel abuse — `probe-qa-r3`, 29/29) and **found one real HIGH-visibility defect the whole fleet had missed: the wardrobe pick card's ResizeObserver loop** (the first modal of every desktop first session grew a pixel per frame under a permanent error toast) — fixed at the root with three independent breaks in the loop and pinned by 4 new law tests. The audit's last two open hardening items are closed: the `?showcase=sandflow` production hatch is DEV-gated (its chunk eliminated from the bundle) and CI's four first-party actions are pinned to API-verified commit SHAs (FS-AUDIT-008). One honesty note: the full 4-day E2E does not fit this sandbox's 600 s per-command ceiling — a 530 s driven window on the real in-page driver recorded 0 failures and 0 page errors, and the re-run on the reference machine is filed as a remaining item (§F, §G).

---

## B. Bugs Discovered

### B-1 — The integrated world-save validator would silently DROP the R5 `life` section (majors' off-screen lives reset every reload)

| Field | Value |
|---|---|
| **Severity** | HIGH (as an integration defect — data loss of a shipped system's state on every restore) |
| **Discovered** | During the R1+R2 integration onto the evolved main: the whitelist rebuild predates the schema evolution |
| **Reproduction** | Snapshot a live world (carries `life`), `parseWorldSave(JSON.stringify(snapshotWorld(w)))` → restored world's `w.life` is `freshLifeState()` — every major's mood/availability/decisions reset, silently |
| **Root cause** | `validateWorldSaveDocument` rebuilds the document through an explicit key whitelist; `life` (added to `WorldState` by the R5 wave, after the R2 remediation was written) was not in the whitelist — the rebuilt document dropped it, and `hydrate`'s `(doc as {life?}).life` read `undefined` |
| **Files affected** | `web-three/src/sim/state.ts` |
| **Fix implemented** | The validator now structurally bounds the section (`isSafeRecord`, ≤64 majors, `lastTickDay` in range) and **carries it through** the whitelist; the internals stay owned by `parseLifeState`'s documented v1-safe heal-forward contract |
| **Verification results** | `snapshot → parse` round-trips `life` verbatim; full suite green; the ownership-table test (which asserts every `WorldState` section appears in the table) passes |

### B-2 — The validator would REFUSE valid saves carrying the new FlagStore key grammar (valid-save quarantine = catastrophic progress loss)

| Field | Value |
|---|---|
| **Severity** | HIGH (as an integration defect) |
| **Discovered** | Same integration pass — the FlagStore grammar moved under main's `3964b3c` ("FlagStore accepts node: pivots and dimension=value keys") |
| **Reproduction** | A save whose flags include `node:N1a=promise` or `diary-voice-bias=prompt-1` (both produced by shipped systems) → `parseWorldSave` refused the whole document ("expected a flag:/evt: sim id") → quarantined → fresh world |
| **Root cause** | `validateFlags` enforced the OLD key law (classic `flag:`/`evt:` sim ids only) while the runtime's own setter accepts three shapes |
| **Files affected** | `web-three/src/sim/state.ts` |
| **Fix implemented** | The validator now enforces exactly the runtime's own law via `isStoryFlagId` — the same grammar, the same refusal: a save the game itself could not WRITE is not loadable either |
| **Verification results** | Unit test with `node:` pivot and `dimension=value` keys restores; junk keys still refused; suite green |

### B-3 — A malformed missable-cache entry escalated to whole-document refusal (quarantining real story progress over a cache inconsistency)

| Field | Value |
|---|---|
| **Severity** | MEDIUM (as an integration defect — main's own R6 law was being violated by the new validator) |
| **Discovered** | The merged suite: `sim-missable-windows.test.ts`'s "corrupt drops with a note" failed against the integrated validator |
| **Reproduction** | Append `{ id: 'garbage', opensAtDay: 'x' }` to a valid save's `missable` array → the integrated validator refused the whole document (fresh world), while the R6 module's own documented contract is drop-and-re-derive ("the flags are the truth, the array is cache") |
| **Root cause** | The R2 validator applied the durable-truth refusal policy to a section whose owner module documents a heal law; refusing a world over its CACHE would discard real C0–C2 progress |
| **Files affected** | `web-three/src/sim/state.ts` |
| **Fix implemented** | Per-entry malformations in the missable section now DROP with a counted note (a new non-fatal `warn` channel on the validator's `SectionOk` — nothing is silent); array-level hostility (not-an-array, >1000 entries) still refuses the document; only whitelisted fields survive into rebuilt entries |
| **Verification results** | Main's R6 save-ride test passes; the R2 battery's refusal expectations updated to the unified law; suite green |

### B-4 — `ebfb08a`'s missed follower: the SUB-01 nav landing still pointed at the old sidewalk spot (routed bodies arrive five metres from the entrance)

| Field | Value |
|---|---|
| **Severity** | MEDIUM (gameplay-visible; the owner's own consumer fix was half-adopted) |
| **Discovered** | The integrated suite failed `a3-registry-flip` (HAND_TRUTH pin −42 vs registry −47.2) and `sim-runtime` B-1 (directive target −47.2 vs test pin −42) — **both failures pre-existed on main `ebfb08a`** (verified on a pristine checkout before any of this branch's work) |
| **Reproduction** | On main `ebfb08a`: run the two tests → both fail. In-game: an NPC routed to the subway walks to (−42, 6.2) — open sidewalk — while the descendable stair shaft the owner moved the headhouse onto sits at (−47.2, 6.2) |
| **Root cause** | `ebfb08a` moved the registry row and the map globe but not the navigation graph's landing node (and not the two tests pinning the old number) |
| **Files affected** | `web-three/src/sim/nav/build.ts`, `web-three/tests/a3-registry-flip.test.ts`, `web-three/tests/sim-runtime.test.ts` |
| **Fix implemented** | The landing node reads the registry truth (−47.2, 6.2) — arrivals land at the headhouse that now frames the hole; the two stale pins updated to the same truth |
| **Verification results** | `probe-nav` 9/9 on the built game (routes, doors, transitions all pass with the moved landing); suite green |

### B-5 — Three fleet probes used the debug drivers without the R1 handshake (broken against gated production builds)

| Field | Value |
|---|---|
| **Severity** | LOW (harness only — no player impact) |
| **Discovered** | Post-merge fleet audit: `probe-nav.mjs`, `probe-money-trace.mjs`, `diag-ped-overlap.mjs` invoke `?autotest=1`/`?scenario=` but predate the driver gate |
| **Root cause** | They were written before (or in parallel to) the R1 boundary; on the gated tree their drivers silently refuse |
| **Files affected** | the three scripts |
| **Fix implemented** | The documented `sessionStorage['fs_driver_authorized']` handshake via `addInitScript` — the same authorization the rest of the fleet uses; no hidden bypass, no URL-carried signal |
| **Verification results** | `probe-money-trace` ALL CHECKS PASSED and `probe-nav` 9/9 against the built, gated output |

### B-6 — Smaller harness/pin drift (found and fixed in passing)

- `perf-peds.mjs` cannot run under Node ≥ 22 directly (JSON import attributes); documented run path is `npx tsx` — executed and recorded.
- The R2 probe's C9b note expectation and the R2 battery's flags note were stale against the grammar-aware note text — updated to the new (correct) wording.

### B-7 — **(wave 3)** The wardrobe stage's resize loop: the pick card grew one pixel per frame under a permanent ResizeObserver error toast (desktop row layout)

| Field | Value |
|---|---|
| **Severity** | HIGH (first-session-critical: the "who got off the bus?" card is the FIRST modal every desktop player meets; the loop toast sat on screen the whole beat, the card visibly grew, and the wear button never held a stable bounding box) |
| **Discovered** | Wave 3's fresh abnormal-player pass (§4): Playwright could never click the wear button — "element is not stable" for 30 s — which prompted a bounding-box sampling probe |
| **Reproduction** | Human boot (non-webdriver) at a ≥900 px-wide viewport → skip the film → the wardrobe pick card opens → sample `#wardrobe-wear`'s bounding box: 24 distinct boxes in 2.9 s, card height climbing monotonically (524.6 → 537.6 px in 5.2 s), and the error banner "Something spilled. ResizeObserver loop completed with undelivered notifications" pinned on screen |
| **Root cause** | A three-way layout feedback loop: on the desktop row layout `#wardrobe-stage` is `height: auto; min-height: 340px`; the canvas inside it is `height: 100%` — a percentage against an auto-height parent resolves through the canvas's INTRINSIC size, and the intrinsic size is the drawing buffer `Wardrobe.resize()` itself writes. Every `setSize` grew the buffer a pixel → the pixel grew the stage → the stage re-fired the ResizeObserver → `resize()` again. The phone column layout was immune (fixed `clamp()` stage height), which is why every vertical probe and the E2E (which dresses the starter via `?starter=` and never opens the card) missed it |
| **Files affected** | `web-three/src/ui/Wardrobe.ts`, `web-three/src/style.css` |
| **Fix implemented** | Three independent breaks in the loop (AGENTS.md §1c.2: the state machine made explicit): (1) `resize()` measures the LAYOUT OWNER — `canvas.parentElement` (the stage) — never the canvas whose buffer it writes; (2) a no-op guard skips `setSize` when the buffer already matches (a rewrite of the same buffer is what re-armed the observer forever); (3) `#wardrobe-canvas` sits OUT of layout flow (`position: absolute; inset: 0` inside the already-`position: relative` stage) so the buffer write can never move layout again; the ResizeObserver now observes the stage host, not the canvas |
| **Verification results** | Post-fix sampling: card geometry frozen at 680×514.2 across 5.2 s (one distinct bounding box), buffer stable at 326×514, the loop toast gone, and the full human pick flow (tile click → Wear this — head out → HUD handover) passes. `tests/wardrobe-resize-law.test.ts` (4 laws) pins the class permanently |

---

## C. Security Findings

Full findings, reproductions, and remediation records live in `docs/security-audit/04-SECURITY-FINDINGS.md`; statuses below reflect wave 3.

| ID | Finding | Severity | Status this wave | Evidence |
|---|---|---|---|---|
| FS-AUDIT-001 | Production URLs could trigger destructive debug drivers | LOW (at discovery) | **FIXED (carried + re-proven on the integrated tree)** | probe-security-r1 **31/31** on real `dist/` — `?autotest=1`/`?scenario=x` cannot wipe or replace a seeded player save; authorized runs ride the sandbox keys |
| FS-AUDIT-002 | World-save parser contradicted its degrade law (shape-broken sections threw) | LOW (at discovery) | **FIXED (carried + re-proven, schema-extended)** | probe-security-r2 **166/166** — 21 corruption classes through the production recovery seam; recovery performs zero storage writes; valid saves restore exactly |
| FS-AUDIT-004 | Story-save parser accepted unbounded `cart_name`/`money`/`day_start_money` | INFORMATIONAL | **FIXED** — parser enforces the UI's own contract (24-char name, ≤ $9,999.99); the audit's proof cases (1e6-char name, 1e15 money) no longer parse verbatim | `tests/save.test.ts` FS-AUDIT-004 case |
| FS-AUDIT-005 | `GameClock` accepted an unbounded day; `calendarOf()` linear in it (latent multi-hour loop) | INFORMATIONAL (latent) | **FIXED** — the clock carries the 1..36500 trust boundary itself (constructor clamp + advance pin); the latent tab-freeze class is dead at the source; WP-6's HUD dateline verified already routed through epochMap's bounded mapping | `tests/sim-clock.test.ts` boundary case |
| FS-AUDIT-006 | Album thumb validation accepted any `data:image/` prefix (svg+xml) | INFORMATIONAL (hardening) | **FIXED** — the whitelist is exactly the two mimes the canvas pipeline produces (png/jpeg); svg+xml/gif/webp can never load | `tests/album.test.ts` mime cases |
| FS-AUDIT-007 | Wardrobe lineup interpolated into `innerHTML` unescaped (developer constants) | INFORMATIONAL (hardening) | **FIXED** — every interpolated value escaped, the swatch must prove plain hex before touching a style attribute | `tests/wardrobe.test.ts` (suite green; render unchanged for valid data) |
| FS-AUDIT-003 | World restore re-derives economic truth from the save document; the integrity audit is structurally blind to self-consistent tampered balances | INFORMATIONAL (structural) | **OPEN — gated on its roadmap re-audit.** WP-4 (the money→ledger bridge) is now INTEGRATED on main, which is the roadmap's precondition; the re-audit itself remains the owner's queued gate | — |
| FS-AUDIT-008 | CI pins first-party actions by mutable major tag | INFORMATIONAL (hardening) | **FIXED (wave 3)** — all four first-party actions pinned to commit SHAs verified against the GitHub API on 2026-11-11 (`checkout` v4.4.0, `setup-node` v4.4.0, `upload-pages-artifact` v3.0.1, `deploy-pages` v4.0.5), each annotated with its version and the verification date; the bump law (re-verify, never re-point a tag blindly) lives beside the pins | `.github/workflows/deploy-pages.yml` |
| NEW (this wave) | The `?showcase=sandflow` hatch is reachable by URL in production (lazy-imports an evaluation scene; touches no storage and no game state — HEAD fetch for asset availability only) | INFORMATIONAL | **FIXED (wave 3)** — the hatch answers only on a dev build (`import.meta.env.DEV &&`), the same boundary `driverGate.ts` draws for the debug drivers; the build-time constant lets the bundler eliminate the whole showcase chunk from `dist/` (verified absent from the production output) | `web-three/src/main.ts`; `rg SANDFLOW dist/assets` → not found |

**Penetration-testing summary (this wave's attacks, all failed to produce impact):** production URL surface re-enumerated on the integrated tree (`autotest`, `scenario` × {nav, schedules, peds, unknown, hostile values}, `showcase`, `fx`, `worldclock`, `walklog`, `film`, `probe`, `pickcard`) — only the gated drivers touch persistence, and only through the sandbox keys; storage surfaces swept — every `localStorage` site in `src/` rides the active-key seams (story/world/album) or is a non-destructive preference (audio mute); `sessionStorage` is read only by the gate; the abnormal-player catalogue (§D) found no crash, escape, or persistence path.

---

## D. Gameplay Findings

### The beginner's first session (`probe-first-session`, 8/8, screenshots in `web-three/shots/first-session/`)

- The opening **communicates**: a fresh stranger lands in the arrival film; the film offers a visible **Skip ▸** affordance; tapping advances it (the game teaches its own input contract); the handover lands in a legible scene — objective line ("Someone by the terminal is waving at you."), map-note guidance ("Rosa waves from the bodega — follow her, or tap Pocket → Roam…"), money ($87), the time (0:08) and the dateline (September 9 · Year 1) all visible in one frame.
- **The world answers**: walking offers an interaction prompt within seconds ("Say hi"); pressing the key the prompt itself teaches produces an immediate response (story beats open the greeting box; the block's walker chats answer with a note toast — by design, "purely optional small talk").
- **Console-clean** throughout.

### The abnormal player (`probe-abnormal`, 14/14, real `dist/`)

- **Movement abuse**: sustained boundary pushes (5 s+), corner grinding with per-sample displacement sampling — no escape from the world envelope (x ∈ [−380, 90], z ∈ [−60, 60], underground included), no NaN, no tunneling (max step 0.89 m under grind).
- **Interaction abuse**: 40×E spam and interact-while-moving — no errors, money finite and inside the new ceiling.
- **Neglect**: 15 s idle with the sim running — the clock advances, the frame loop stays alive.
- **Session abuse**: R-restart (the documented `location.reload()` under save rules), 3× rapid reload spam, mid-boot interrupts — the story save survives every one (present, valid JSON, day preserved); zero page errors across all phases.

### Observations (no action required)

- The interaction prompt teaches **Space**; **E** is the identical twin (both queue the same interact). The prompt-following probe confirms a beginner following the on-screen instruction succeeds.
- The wallet's story-side ceiling now matches the world-side money law — a hand-edited save can no longer display a 1e15 balance the rest of the economy could not represent.

### **(wave 3)** The fresh abnormal-player pass (`probe-qa-r3`, 29/29, real `dist/`)

- **The wardrobe pick card bug (B-7) was FOUND by this pass and FIXED** — the pass now also re-verifies the repaired flow end-to-end: E-spam during the arrival film, skip, the pick card, tile selection, Wear — all console-clean, the handover lands (probe's P-phase).
- **URL fuzz** (5 crafted query strings incl. `worldclock` garbage/negative/infinite, a param-bundle, and a `<script>` payload in an unknown param): every boot clean, nothing executes, nothing reflected into the DOM, the seeded day-4 save byte-intact through every boot.
- **Story-save tamper matrix** (the §2 "manipulate stored state" attack): a hand-edited save carrying negative money, a 1e15 snapshot, day 99999, absurd calendar day, and XSS payloads in `cart_name` / `player_name.first` / a field-diary entry (body + strike + margin) / a junk ledger entry — the game boots without a single error, every payload renders as TEXT (the diary opens and shows the hostile body as ink), money clamps into range, the day clamps to the ceiling. No payload ever executed (`window.__xss` stayed undefined through the Map's diary leaf).
- **Panel abuse**: 20× rapid Map toggling, pocket/sound toggle spam — no errors, wallet finite.
- **First impression note**: the fresh-boot handover after taking the default look lands exactly like the documented first session (objective, money, dateline all present) — the B-7 repair did not disturb the beat.

---

## E. Performance Findings

Measured on the integrated tree (sandbox, software GL — the same environment the register's own gates use):

| Metric | Result | Context |
|---|---|---|
| `peds.update` | **24.3 µs/frame** (0.15% of the 16.6 ms budget) | 12 armed commuters + loop walkers; the commute adds 5.5 µs/frame over the unarmed baseline (register's 2026-11-07 reading: 27.1 µs — consistent) |
| Heap | +2,444 KB over 9,000 frames (gc off) | no runaway growth; flat-line behavior consistent with the register's law |
| Draw calls | 154 (boot-spawn) → 222 (mid-street) → 296 (plaza-life) | triangles 258k → 359k; the B13 draw-call item remains the owner's known call |
| fps | 2–4 under **SwiftShader** | software-GL only — the shipping target is hardware GL; recorded as the environment's measurement, not a code defect |
| Long-session stability | 4-day E2E (566 s of driven play) — 0 failures, console clean; 15 s idle probe stable | the E2E is the closest shipped proxy for a long session |

No performance regression was introduced by this wave's changes: the only hot-path edits are the clock's two `Math.min` calls (the tick path) and the save parsers' bounds (boot/load time only).

### **(wave 3)** Re-measured on the C5 + city-fabric tree

| Metric | Result | Context |
|---|---|---|
| Draw calls | 160 (boot-spawn) → 233 (mid-street) → 303 (plaza-life) | consistent with the wave-1 readings plus the city-fabric pass's own +10 recorded delta; the B13 item remains the owner's call |
| fps | 2–3 under SwiftShader at 900×700 | software-GL only — recorded as the environment's measurement, not a code defect |
| Page errors across every wave-3 browser gate (R1, R2, R3, first-session, abnormal, perf, world-sim, money, nav, the 530 s driven window) | **zero** | the B-7 loop toast was the one recurring console complaint and it is now gone |
| Wardrobe layout stability (new, post-B-7) | one distinct bounding box across 5.2 s of sampling; zero ResizeObserver notifications | the loop used to grow the card a pixel per frame |

---

## F. Testing Results

All executed on this branch's final tree. Browser-level gates ran against the real built output (`dist/`).

| Gate | Result | Evidence |
|---|---|---|
| TypeScript (`tsc --noEmit`) | **clean** | `RESULTS-typecheck-qa.txt` |
| Vitest suite | **1300/1300 (83 files)** — main's 1246 + the 52 R1/R2 security tests + 2 new hardening cases | `RESULTS-vitest-qa.txt` |
| Production build | **OK** (603 ms) | build log in-repo |
| R1 security probe (built output) | **31/31** | `docs/security-audit/evidence/RESULTS-probe-security-r1.txt` (re-run this wave) |
| R2 security probe (built output) | **166/166** | same directory (re-run this wave) |
| World-sim probe | **15/15** (1,426 sim-min, 83.4 s) | re-run this wave |
| Money-trace probe | **ALL CHECKS PASSED** ($ mirror, ids, console clean) | re-run this wave |
| Nav probe | **9/9** (with the moved SUB-01 landing) | re-run this wave |
| Abnormal-player probe | **14/14** | `RESULTS-probe-abnormal.txt` |
| First-session probe | **8/8** | `RESULTS-probe-first-session.txt` + screenshots |
| 4-day story E2E (built output, authorized sandboxed driver) | **0 failures, 566 s, console clean** | `RESULTS-e2e-4day-qa.txt` |
| perf-peds / probe-perf | 24.3 µs/frame, heap flat; draw calls recorded; **zero page errors** | `RESULTS-perf-qa.txt` |

### **(wave 3)** — all gates re-executed on the final wave-3 tree (base `af78c11` + this wave's fixes)

| Gate | Result | Evidence |
|---|---|---|
| TypeScript (`tsc --noEmit`) | **clean** | re-run in this pass |
| Vitest suite | **1427/1427 (88 files)** — main's grown suite (C5 + city-fabric waves) + the 4 wardrobe-resize-law pins | re-run in this pass |
| Production build | **OK** (621 ms); the sandflow chunk **verified absent** from `dist/` | re-run in this pass |
| R1 security probe (built output) | **31/31** | re-run in this pass |
| R2 security probe (built output) | **166/166** | re-run in this pass |
| Wave-3 probe (`probe-qa-r3`: URL fuzz × save tamper × XSS × film/panel abuse) | **29/29** | new this pass |
| World-sim probe | **15/15** (1,426 sim-min) | re-run in this pass |
| Money-trace probe | **ALL CHECKS PASSED** | re-run in this pass |
| Nav probe | **9/9** | re-run in this pass |
| First-session probe | **8/8** | re-run in this pass |
| Abnormal-player probe | **14/14** | re-run in this pass |
| Performance probe | 160→303 draws, **zero page errors** | re-run in this pass |
| 4-day story E2E | **see the honesty note below — NOT completed in this sandbox window** | three attempts |

**Wave-3 E2E honesty note.** The full `scripts/e2e.mjs` (535–566 s on the reference machine) could not complete inside this sandbox's hard 600 s per-command ceiling: two foreground attempts (full resolution, and 640×480 @ scale 0.5) were killed at the ceiling, and a detached run was reaped by the sandbox between commands. As compensating evidence the REAL in-page driver (`?autotest=1`, the same driver the E2E waits on, via the documented fleet handshake) ran for **530 s of driven play: 0 driver failures and 0 page errors** before the window elapsed (`scripts/diag-e2e-window.mjs`). The wave-3 diff does not touch the E2E's code path (autotest driver, Game boot, world runtime — the edits are the wardrobe module, a dead prod branch in `main.ts`, the CI workflow, and new tests/probes), and every subsystem probe above re-verified green on the final tree. The full E2E should be re-run on the reference machine before the next release; no test is reported passed that was not executed.

**Honesty notes.** The environment's SwiftShader renderer crashes stochastically on very long browser sessions (documented in the audit's verification report since v1.1); every browser gate above succeeded on a clean run inside this window. The perf probe's fps figures measure software GL, not shipping hardware. No test is reported passed that was not executed.

---

## G. Remaining Issues

1. **FS-AUDIT-003 (structural economics)** — the world restore still re-derives genesis from the document's own balances; the integrity gate refuses what cannot be replayed but cannot detect a self-consistent tampered balance. The roadmap gates the fix on the WP-4 re-audit (WP-4 is now merged — the gate is ripe for the owner's order).
2. **B13 (draw calls)** — 303 at the plaza-life vantage on the current tree; the owner's known call.
3. **Gated driver chunks still ship** in the production bundle (behind the gate — inert without the handshake). The R1 remediation's recorded residual; full tree-shaking would need the build-time flag variant.
4. **Software-GL fps** on weak machines — the simulation is frame-budget-safe (µs-scale), but rendering ~300 draw calls without hardware GL is slow; a rendering-budget pass (B13's scope) is the lever.
5. **The full 4-day E2E must be re-run on the reference machine** before the next release (this sandbox's 600 s ceiling; see F's honesty note). *(wave 3)*
6. **RESOLVED in wave 3:** FS-AUDIT-008 (CI pinning — all four actions pinned to API-verified SHAs) and the `?showcase=sandflow` production hatch (DEV-gated; chunk eliminated from the bundle).

---

## H. Files Changed

**Security remediation carried onto the evolved main (integration):**
- `web-three/src/game/driverGate.ts` (new) — the R1 development/production boundary + the storage sandbox keys.
- `web-three/src/core/Save.ts` — the story-save sandbox seams; **new:** the FS-AUDIT-004 parser bounds.
- `web-three/src/sim/state.ts` — the R2 validator; **new:** the evolved-schema support (FlagStore grammar, missable provenance, the `life` section carried), the non-fatal `warn` channel, the missable cache-drop law.
- `web-three/src/game/Game.ts` — the authorization decision before any storage read; merged with main's money bridge.
- `web-three/src/game/autotest.ts`, `web-three/src/game/scenario.ts` — the defense-in-depth entry guards (scenario now also behind the nav dispatch).
- `web-three/src/game/worldRuntime.ts` — the active world key + quarantine, merged with main's navigation runtime.
- `web-three/src/postcard/Album.ts` — the album sandbox seam; **new:** the FS-AUDIT-006 mime whitelist.
- `web-three/src/sim/runtime.ts` — the wallet-ceiling note (4 lines, from R1's N-6).

**This wave's hardening:**
- `web-three/src/sim/clock.ts` — the FS-AUDIT-005 day trust boundary (constructor + advance).
- `web-three/src/ui/Wardrobe.ts` — the FS-AUDIT-007 escaped render.

**Bug fixes:**
- `web-three/src/sim/nav/build.ts` — the SUB-01 landing moved onto the registry truth (B-4).
- `web-three/tests/a3-registry-flip.test.ts`, `web-three/tests/sim-runtime.test.ts` — the stale pins (B-4).

**Tests (new/extended):**
- `web-three/tests/driver-gate.test.ts` (18), `web-three/tests/world-save-validation.test.ts` (34, extended for the evolved schema) — the R1/R2 batteries.
- `web-three/tests/save.test.ts`, `web-three/tests/sim-clock.test.ts`, `web-three/tests/album.test.ts` — the FS-AUDIT-004/005/006 regression cases.

**Fleet/harness:**
- `web-three/scripts/probe-security-r1.mjs`, `probe-security-r2.mjs` — the R1/R2 probes (R2's C9b note updated).
- `web-three/scripts/probe-abnormal.mjs` (new), `probe-first-session.mjs` (new) — this wave's gameplay probes.
- `web-three/scripts/probe-money-trace.mjs`, `probe-nav.mjs`, `diag-ped-overlap.mjs` — the handshake (B-5).

**Docs:**
- `docs/qa-security/` (this document + `evidence/`), the security-audit package updates (04/06/07/REVISION-HISTORY/findings.json), the production register row, the worklog entry.

### **(wave 3)** files changed

**Bug fix (B-7):**
- `web-three/src/ui/Wardrobe.ts` — the resize law: measure the stage host, the no-op buffer guard, the observer re-armed on the layout owner.
- `web-three/src/style.css` — `#wardrobe-canvas` out of layout flow (absolute inside the relative stage), the law recorded beside the rule.
- `web-three/tests/wardrobe-resize-law.test.ts` (new, 4 tests) — the class of mistake pinned at the source.

**Hardening closures:**
- `web-three/src/main.ts` — the sandflow showcase hatch answers only on a dev build; the production bundle no longer ships the chunk.
- `.github/workflows/deploy-pages.yml` — all four first-party actions pinned to GitHub-API-verified commit SHAs (FS-AUDIT-008), the bump law annotated in place.

**Fleet/harness:**
- `web-three/scripts/probe-qa-r3.mjs` (new) — the wave-3 fresh-attack probe (URL fuzz × save tamper × XSS × film/panel abuse, 29 checks).
- `web-three/scripts/diag-e2e-window.mjs` (new), `scripts/diag-wardrobe-loop.mjs` (new) — the bounded-window driver runner and the B-7 reproduction sampler.

---

## I. Final Assessment

**What is now working better.** The game's persistence layer is boundaried at every entry: story, world and album saves each carry their parser-enforced contracts; the clock cannot hand any consumer an unbounded day; the debug drivers cannot touch a real player's data without an explicit local authorization; and the world-save validator now protects the FULL evolved schema instead of the one it was born with. The fleet runs against the gated production build the way the owner will ship it. **(wave 3)** The tree's growth since wave 1 (the C3/C4/C5 chapters, the city-fabric pass) has been re-swept by the whole probe fleet on the current build — every gate green — and the first modal a desktop player meets (the wardrobe pick card) no longer fights its own layout.

**What security weaknesses were eliminated.** The four informational findings 004–007 closed with regression tests; three merge-borne save-loss paths (a dropped section, a valid-save refusal, an over-eager quarantine) were caught and closed before they ever reached a player; the subway navigation's five-metre arrival error was fixed. **(wave 3)** The last two open hardening items are closed: the production bundle no longer ships the showcase hatch (or its chunk), and CI's supply-chain surface is pinned to API-verified commit SHAs; the URL-fuzz and save-tamper matrix found no new path (29/29).

**What gameplay problems were corrected.** The routed cast now arrives at the subway entrance that frames the actual stair shaft; the wallet can no longer display a value the economy cannot honor; the first-session experience is verified legible end-to-end with screenshot evidence; the abnormal-player catalogue verifies the game bends without breaking. **(wave 3)** The wardrobe pick card's ResizeObserver loop — a permanent error toast and a card that grew a pixel per frame on every desktop first session — is fixed at the root with three independent breaks in the loop and four permanent law tests.

**What still needs attention.** The WP-4 re-audit (now unblocked), the B13 draw-call decision, and a full 4-day E2E re-run on the reference machine (this sandbox's 600 s ceiling — see F's honesty note). The branch stops here: three waves, verified, ready for the owner's review.
