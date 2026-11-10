# SECURITY-AND-GAMEPLAY-AUDIT — FIRST SLICE: A NEW YORK STORY

| | |
|---|---|
| Status | **Live document** — the full-spectrum QA/security pass |
| Assignment | Full-spectrum security, penetration testing, bug hunting & gameplay quality |
| Branch | `fix/qa-full-spectrum` — base `ebfb08a` (main, register v1.35.0) |
| Evidence | `evidence/` — every result file named below was produced by a real run on the real built game (`dist/`) unless explicitly noted otherwise |
| Baseline carried forward | The security audit package (`docs/security-audit/`, v1.2) and its remediations R1+R2 (`08712a5`), integrated onto the evolved main in this wave |

---

## A. Executive Summary

**Overall game health: strong.** The tree carries 1,300 passing tests across 83 files, the four-day story plays end-to-end against the production build with zero failures and a clean console (566 s), the world simulation probe is 15/15, and the money mirror holds to the cent. The game that ships today is dramatically larger than the tree the original security audit examined (the C0/C1/C2 narrative chapters, the rails engine, the majors' off-screen lives, nine interiors, the registry-flipped world, and the living pedestrian runtime all landed between the audit and this pass) — and every one of those waves' own gates re-verified green on this integrated tree.

**Security posture: materially hardened, honestly bounded.** The two confirmed findings (FS-AUDIT-001/002) are FIXED and re-proven on the integrated tree — production URLs cannot trigger destructive debug operations (31/31 probe), and a malformed world save degrades safely before hydration with the story save structurally unreachable (166/166 probe). This pass additionally **closed four of the six informational findings** (004, 005, 006, 007 — each with its documented remediation and a regression test), and found + fixed three integration defects the merge itself would have introduced (a dropped save section, a valid-save refusal, an over-eager quarantine) plus one pre-existing defect on main (the subway landing's missed follower).

**Gameplay quality: the opening communicates and the world answers.** The first-session pass verifies, with screenshot evidence, that a stranger with zero developer knowledge lands in the arrival film, is offered a visible SKIP, receives a legible handover (objective line, map-note guidance, money, dateline), can walk to an affordance within seconds, and gets a response from the very first interaction — all console-clean. The abnormal-player pass verifies the game survives the impatient and the malicious: boundary grinding, corner tunneling attempts, interaction spam, long idle, R-restarts, reload spam, and mid-boot interrupts produce no escapes, no NaN, no wiped saves, and no crashes.

**Major improvements this wave:** the R1+R2 remediation now lives on the evolved main with its contract intact; the world-save validator learned the evolved schema (the FlagStore grammar, the R6 missable provenance, the R5 life section); the driver-gate handshake reached the whole fleet; the clock and story-save parsers carry their trust boundaries at the source.

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

---

## C. Security Findings

Full findings, reproductions, and remediation records live in `docs/security-audit/04-SECURITY-FINDINGS.md`; statuses below reflect this wave.

| ID | Finding | Severity | Status this wave | Evidence |
|---|---|---|---|---|
| FS-AUDIT-001 | Production URLs could trigger destructive debug drivers | LOW (at discovery) | **FIXED (carried + re-proven on the integrated tree)** | probe-security-r1 **31/31** on real `dist/` — `?autotest=1`/`?scenario=x` cannot wipe or replace a seeded player save; authorized runs ride the sandbox keys |
| FS-AUDIT-002 | World-save parser contradicted its degrade law (shape-broken sections threw) | LOW (at discovery) | **FIXED (carried + re-proven, schema-extended)** | probe-security-r2 **166/166** — 21 corruption classes through the production recovery seam; recovery performs zero storage writes; valid saves restore exactly |
| FS-AUDIT-004 | Story-save parser accepted unbounded `cart_name`/`money`/`day_start_money` | INFORMATIONAL | **FIXED** — parser enforces the UI's own contract (24-char name, ≤ $9,999.99); the audit's proof cases (1e6-char name, 1e15 money) no longer parse verbatim | `tests/save.test.ts` FS-AUDIT-004 case |
| FS-AUDIT-005 | `GameClock` accepted an unbounded day; `calendarOf()` linear in it (latent multi-hour loop) | INFORMATIONAL (latent) | **FIXED** — the clock carries the 1..36500 trust boundary itself (constructor clamp + advance pin); the latent tab-freeze class is dead at the source; WP-6's HUD dateline verified already routed through epochMap's bounded mapping | `tests/sim-clock.test.ts` boundary case |
| FS-AUDIT-006 | Album thumb validation accepted any `data:image/` prefix (svg+xml) | INFORMATIONAL (hardening) | **FIXED** — the whitelist is exactly the two mimes the canvas pipeline produces (png/jpeg); svg+xml/gif/webp can never load | `tests/album.test.ts` mime cases |
| FS-AUDIT-007 | Wardrobe lineup interpolated into `innerHTML` unescaped (developer constants) | INFORMATIONAL (hardening) | **FIXED** — every interpolated value escaped, the swatch must prove plain hex before touching a style attribute | `tests/wardrobe.test.ts` (suite green; render unchanged for valid data) |
| FS-AUDIT-003 | World restore re-derives economic truth from the save document; the integrity audit is structurally blind to self-consistent tampered balances | INFORMATIONAL (structural) | **OPEN — gated on its roadmap re-audit.** WP-4 (the money→ledger bridge) is now INTEGRATED on main, which is the roadmap's precondition; the re-audit itself remains the owner's queued gate | — |
| FS-AUDIT-008 | CI pins first-party actions by mutable major tag | INFORMATIONAL (hardening) | **OPEN (documented, deliberately not patched this wave)** — pinning requires verified upstream commit SHAs; a wrong pin breaks the Pages deploy. Recommended next step with the SHA list verified at patch time | — |
| NEW (this wave) | The `?showcase=sandflow` hatch is reachable by URL in production (lazy-imports an evaluation scene; touches no storage and no game state — HEAD fetch for asset availability only) | INFORMATIONAL | **Recorded, not changed** — non-destructive by inspection; worth a `import.meta.env.DEV` guard in a future hardening pass | code inspection |

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

**Honesty notes.** The environment's SwiftShader renderer crashes stochastically on very long browser sessions (documented in the audit's verification report since v1.1); every browser gate above succeeded on a clean run inside this window. The perf probe's fps figures measure software GL, not shipping hardware. No test is reported passed that was not executed.

---

## G. Remaining Issues

1. **FS-AUDIT-003 (structural economics)** — the world restore still re-derives genesis from the document's own balances; the integrity gate refuses what cannot be replayed but cannot detect a self-consistent tampered balance. The roadmap gates the fix on the WP-4 re-audit (WP-4 is now merged — the gate is ripe for the owner's order).
2. **FS-AUDIT-008 (CI action pinning)** — hardening only; needs verified upstream SHAs at patch time. Documented, deliberately not patched blind.
3. **B13 (draw calls)** — 296 at the plaza-life vantage; the owner's known call.
4. **Gated driver chunks still ship** in the production bundle (behind the gate — inert without the handshake). The R1 remediation's recorded residual; full tree-shaking would need the build-time flag variant.
5. **`?showcase=sandflow` reachable in production** (new, informational) — non-destructive; worth a DEV guard whenever a hardening pass next touches `main.ts`.
6. **Software-GL fps** on weak machines — the simulation is frame-budget-safe (µs-scale), but rendering 296 draw calls without hardware GL is slow; a rendering-budget pass (B13's scope) is the lever.

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

---

## I. Final Assessment

**What is now working better.** The game's persistence layer is boundaried at every entry: story, world and album saves each carry their parser-enforced contracts; the clock cannot hand any consumer an unbounded day; the debug drivers cannot touch a real player's data without an explicit local authorization; and the world-save validator now protects the FULL evolved schema instead of the one it was born with. The fleet runs against the gated production build the way the owner will ship it.

**What security weaknesses were eliminated.** The four informational findings 004–007 closed with regression tests; three merge-borne save-loss paths (a dropped section, a valid-save refusal, an over-eager quarantine) were caught and closed before they ever reached a player; the subway navigation's five-metre arrival error was fixed; the remaining open items are the two deliberately-documented ones (003's structural economics behind its roadmap gate; 008's CI pinning awaiting verified SHAs).

**What gameplay problems were corrected.** The routed cast now arrives at the subway entrance that frames the actual stair shaft; the wallet can no longer display a value the economy cannot honor; the first-session experience is verified legible end-to-end with screenshot evidence; the abnormal-player catalogue verifies the game bends without breaking.

**What still needs attention.** The WP-4 re-audit (now unblocked), the CI pinning pass, the B13 draw-call decision, and — when convenient — a DEV guard for the sandflow showcase hatch. The branch stops here: one wave, verified, ready for the owner's review.
