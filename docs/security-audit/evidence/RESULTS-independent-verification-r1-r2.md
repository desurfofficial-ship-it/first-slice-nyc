# INDEPENDENT SECURITY VERIFICATION — INDEPENDENT-VERIFY-R1R2
# Reviewer: separate agent (did not implement the fixes); refutation-oriented
# Date: 2026-11-07 · Under review: uncommitted fix/security-r1-r2 (base 62a6244)
# Full transcript preserved below verbatim.

---

## 1. Verdicts

| Finding | Verdict |
|---|---|
| **FS-AUDIT-001 (R1)** — URL-triggered destructive drivers | **HOLDS — fix survived all attacks.** No URL, param value, combination, encoding, fragment, or pollution trick reaches `runAutotest`/`runScenario`/`wipeSave` without `import.meta.env.DEV` (compiled to `!1` in the production bundle) or the `sessionStorage['fs_driver_authorized']==='1'` handshake, which no repo code ever writes from a URL-reachable path. |
| **FS-AUDIT-002 (R2)** — shape-broken world saves throw at hydrate | **HOLDS — fix survived all attacks.** 25+ hostile documents through the real `parseWorldSave`: zero throws, zero partial hydrations, zero malformed docs restored. **But** the reviewer broke the *integrity gate* with a shape-valid, semantically-corrupt ledger document that restores **silently** with divergent economy state (see §4, N-1) — a residual gap, not a resurrection of the original vulnerability. |

## 2. Refutation targets — what was tried and what happened

**Target 1 — production URL that still triggers destructive ops: FAILED to construct.**
- Enumerated the entire URL surface: `autotest` (Game.ts:500), `scenario` (:512), `fx` (:236), `worldclock` (:378), `starter` (:411), `probe` (:425), `film` (:429), `walklog` (autotest.ts:61). Only the first two reach drivers; both are conjunctively gated on `this.driverAuth.allowed` (Game.ts:505-508, :515-517), decided at Game.ts:216-225 — the first statement of the constructor. `URLSearchParams` reads cannot matter (repeats/empty values/hostile values/?-vs-# tricks) because the gate never reads the URL.
- `import.meta.env.DEV` is **compiled to `devMode:!1`** in the shipped bundle (`dist/assets/index-COhZfGnr.js`: `driverAuth=Og({devMode:!1,handshake:kg(...)})`) — no dev bypass in production.
- `navigator.webdriver` still only sets `driverBoot` (film skip, Game.ts:423-425) — irrelevant to authorization.
- `window.__game` (:494) requires in-page JS execution — outside the URL threat model.
- Other `wipeSave` callers: autotest.ts:452 (behind the gate at :37-41 **and** sandboxed), Game.ts:1589 (`beginNewGameAs` — requires the wardrobe confirm strip UI; not URL-reachable; rides `activeSaveKey()`).
- Handshake writers: only `scripts/e2e.mjs:49`, `scripts/probe-world-sim.mjs:40`, `scripts/probe-security-r1.mjs:75` via `addInitScript`. No `src/` code writes it; a URL cannot set sessionStorage.
- Dynamic proof: `probe-security-r1.mjs` **31/31 PASS** against the real built bundle — `?autotest=1` with a seeded day-4/$240 save: driver never starts, save byte-intact; `?scenario=x`/`schedules`/both/hostile `<script>` value: world save byte-identical; authorized D1/D2: drivers start and run entirely on `*_driver` keys (`bootedFromDay=1` with a day-4 player save present).
- ⚠️ Pre-existing residual (unchanged by this fix): `?starter=<id>` on a day-<2 boot persists a day-1 save blob (Game.ts:412 → :1556) — a URL-driven *write* to the active story key, but it cannot touch a day-2+ save.

**Target 2 — debug path that still touches PLAYER persistence: two narrow leaks found; the audited keys are clean.**
- Traced every `loadSave/writeSave/wipeSave` (Save.ts:276-305 — all ride `activeSaveKey()`), every `localStorage` site in `src/` (worldRuntime.ts:88, :302, :315, :429; scenario.ts:107,182,196,204,220,223 — all via `activeWorldSaveKey()`), and all field initializers (`GameState` Game.ts:64, `FreeRoam` :145, `InteractionRegistry` :194 — **zero storage access**). Nothing touches the real keys before the authorization decision; `main.ts` does no storage before `new Game`.
- **N-2 (new, LOW): the postcard album is NOT sandboxed.** `loadAlbum()` (Game.ts:461) and `storeAlbum()` (:2097, :2131) read/write the real `first_slice_album`; autotest waits for `albumCount===5` (autotest.ts:687), so an authorized driver run writes driver-earned cards into the player's real album (newest-first, `ALBUM_MAX` slice — player cards can fall off). This falsifies the sandbox's own log line "player saves are unreachable this session" (Game.ts:224). Not URL-reachable; original finding never touched the album.
- **N-3 (new, LOW): the quarantine key is not re-keyed for driver sessions** — `quarantineRejectedSave` writes the fixed `first_slice_world_v1_quarantine` (worldRuntime.ts:121), so a refused *driver* doc overwrites the player-namespace quarantine slot.
- Mute key (`first_slice_muted`, audio.ts:33,52): read-only on boot, written only on explicit user toggle — honestly out of scope.
- Hygiene: `bootWorldBrain` still returns hardcoded `saveKey: WORLD_SAVE_KEY` (sim/runtime.ts:682) — dead field (no consumer; worldRuntime uses `activeWorldSaveKey()` at :429), misleading if ever consumed.

**Target 3 — malformed doc reaching unsafe hydration: FAILED to construct.** Temporary vitest battery (deleted after run) against the real `parseWorldSave`: missing/null sections (all 12), wrong primitives, `clock.day=1e15`, `moneyCents=1e12`/`1e999`, `amountCents=1e12`/`5e9`, top-level/`rails`/`environment`/txn-row `__proto__` + `constructor` keys (no pollution — whitelist drops them; `Object.prototype` verified clean), arrays-for-objects, 10001 npcs / 50001 txns / 1001 flags, duplicate npc/txn/rel/flag ids, dangling rel→npc, self-transfer — **every case → `source='fresh'` + specific note, zero throws**. Round-trip `snapshotWorld → parseWorldSave` restored exactly (clock, player, ledger incl. biz balances, flags, warmth, npcs). Their regression suite (`tests/world-save-validation.test.ts`, `driver-gate.test.ts`) passes and matches behavior independently reproduced.

**Target 4 — shape-valid but semantically corrupt docs: PARTIAL SUCCESS breaking the integrity gate.**
- **N-1 (new, LOW — the strongest attack that landed): hydrate-time `post()` rejections are silently swallowed.** `hydrate` posts every validated txn but ignores `post()`'s return (state.ts:827); a doc whose flow overdraws a business mid-sequence gets that txn **dropped**, while genesis was re-derived from *all* txns (state.ts:809-813). Result (empirical, real module): `source='restored'`, **`notes=[]` (fully silent)**, `biz:rosas_deli` field = 100¢ vs restored ledger = **100,000,099¢**, `ledger.issues=[OVERDRAFT txn:ov1…]` — and `auditWorld` (state.ts:154-178) never inspects `ledger.issues` (:158 audits only `ledger.audit()`, which is clean by construction) and has **no biz-field-vs-ledger cross-check** (only the player check, :170). Money appears from nowhere relative to the document's own claims, with no note. Threat model: local tampering only (same as the original LOW).
- The player-side variant of the same attack **is** caught (`player money 100 ≠ ledger 100000099` → refused), confirming the :170 gate works where it exists.
- Lesser silent-restore gaps (all empirical): npc→`rel:` dangling reference (H1), two rel edges for one npc pair (H2 — `auditWorld`'s "stored once" check at :164-167 covers same-id double-listing, not pair uniqueness), event `npcIds` referencing nonexistent npcs (H3). Consistency blemishes; no crash path found in them.
- Genesis clamp: fires **on the game's own snapshots** (biz `balanceCents` fields lag the ledger — Workstream D not wired), so it is load-bearing: without it their own round-trip test doc would throw at `openAccount` and degrade to fresh. It is loud (note) and player-balanced, but its text "balances preserved, audit history truncated" is **false** — the doc's biz field is exactly what is *not* preserved (H6: field −5000, ledger 0). Their test "a ledger with broken money is reported, not hidden" still holds (player case refused, clamp noted).
- Verified-refused (claims re-proven): unordered events (H7, "integrity: event order"), npc double-listing a rel id (H8), non-item inventory (H9).

**Target 5 — valid saves rejected / recovery destroying story save: FAILED to construct.**
- Full suite: **887/887 across 59 files** (exact expected baseline), `tsc --noEmit` clean.
- `bootWorldBrain` zero-storage-writes verified twice: their recording-store test (world-save-validation.test.ts:393-420) and my own across null/''/garbage/rejected/valid raws. Quarantine touches only the world + quarantine keys (worldRuntime.ts:121-122); every R2 probe corruption case re-asserted the story save (day 3, $150) survived.
- Quarantine refusal conditions (worldRuntime.ts:119): fires only when `bootedFresh && raw !== null && raw !== ''`. First boot (raw null) → **never quarantined** (probe C15 PASS). Empty string → never. Valid doc → `bootedFresh=false` → never (probe C14: "quarantine stays empty for valid documents"). v2 doc, foreign-world doc, corrupt JSON, refused sections → quarantined **with bytes preserved** ("preserved in quarantine, not destroyed", probes C1–C13). Residual nuance: a future-version doc is moved *off* the active key — when a v2 reader ships, migration must also look in quarantine (bytes survive, nothing destroyed). Non-atomic set→remove under quota failure degrades to the old re-fire-per-boot behavior, caught (worldRuntime.ts:124-126) — acceptable.

## 3. Executable results observed
- `npx vitest run`: **Test Files 59 passed (59), Tests 887 passed (887)** (at review time; 892/892 after the follow-up fixes landed).
- `npx tsc --noEmit`: **clean (exit 0)**.
- Probes: environment clear at run time → both probes run: **probe-security-r1 31/31 PASS**, **probe-security-r2 166/166 PASS** (dist/ fresh: built after newest source; no rebuild needed).
- The reviewer's 14-test refutation battery ran against the real module and was **deleted afterward**; `git status` verified the tree exactly as found.

## 4. New issues discovered
| ID | Issue | Severity | Disposition |
|---|---|---|---|
| N-1 | Integrity gate blind to hydrate-time `post()` rejections (`ledger.issues` never consulted) → shape-valid doc restores **silently** with divergent economy state (state.ts:827, :158; economy.ts:151-157) | LOW (local tampering; same family as FS-AUDIT-003) | **FIXED in-branch** — the parse-time integrity gate now refuses on `world.ledger.issues.length > 0`; pinned by a regression test reproducing this exact attack |
| N-2 | Driver sandbox does not cover `first_slice_album`; authorized autotest writes the player album — "player saves unreachable" claim overstated | LOW | **FIXED in-branch** — the album rides `first_slice_album_driver` under the sandbox (`Album.ts` override accessors; `driverGate` covers it); the sandbox announcement names all three namespaces |
| N-3 | Quarantine key not driver-sandboxed; driver-session refusal overwrites the player-namespace quarantine slot | LOW | **FIXED in-branch** — `activeWorldQuarantineKey()` follows the active namespace |
| N-4 | Genesis-clamp note text "balances preserved" is false; clamp routinely fires on the game's own snapshots (biz fields lag ledger) | INFORMATIONAL | Recorded — wording to be corrected with the WP-4 money bridge |
| N-5 | Silent-restore consistency gaps: dangling npc→rel, same-pair double rel edges, ghost event npcIds | INFORMATIONAL | Recorded — candidates for the next hardening pass; no crash path |
| N-6 | Dead misleading `saveKey: WORLD_SAVE_KEY` in `bootWorldBrain` return; leftover implementer artifact `scripts/tmp-boot-test.mjs`; pre-existing `?starter=` day-1 save write (Game.ts:412) | INFORMATIONAL | Dead field + artifact **FIXED in-branch**; `?starter=` is pre-existing, cannot touch a day-2+ save, left unchanged |

## 5. Residual risks
- **Acceptable now:** N-4, N-5 (recorded); v2-doc-in-quarantine migration nuance (bytes survive); quarantine non-atomicity under quota failure (degrades to the old re-fire behavior, caught); `?starter=` (pre-existing, cannot destroy day-2+ progress).
- **Actioned before finalization:** N-2 + N-3 (sandbox coverage) and N-1 (ledger-replay integrity gate) — all fixed in the same branch with regression tests.
- **Tracked, not blocking:** FS-AUDIT-003's structural economics gap (doc-derived genesis) — already scheduled for the WP-4 re-audit; N-1 belongs to the same trust family and is now refused at parse time.

## 6. Overall verdict (for the security record)
Both remediations hold under an adversarial re-verification. R1: the production dispatch of the debug drivers is now gated by a decision made before any storage access (Game.ts:216-225), compiled with `devMode:!1`, re-checked at both driver entries (autotest.ts:37, scenario.ts:77), and backed by a storage sandbox that the browser probe shows keeping day-4/$240 player saves byte-identical while drivers run — no URL-only trigger could be constructed, and 31/31 crafted-URL checks pass. R2: `parseWorldSave` now validates and whitelist-rebuilds every section before hydration with a guarded hydrate and a post-hydration integrity refusal; 892/892 tests, a clean tsc, 166/166 browser corruption checks, and an independent 25+-payload hostile battery confirm the original B2–B7 throws are dead and that recovery never writes storage nor touches the story save — no malformed document could be made to throw, partially hydrate, or be falsely refused. The fixes' core claims survive; the narrow residuals found (album/quarantine sandbox coverage, ledger-replay gate) were fixed in the same branch and pinned by tests. **Verdict: HOLDS for both FS-AUDIT-001 (R1) and FS-AUDIT-002 (R2).**
