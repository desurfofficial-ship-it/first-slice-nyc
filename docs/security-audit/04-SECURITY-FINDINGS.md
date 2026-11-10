# 04 — Security Findings

**Originally audited revision:** `main` @ `7995e6ea2e371644a5347f93acc8bed948bf0e54` (2026-11-06)
**Reconciled revision (R2, v1.1):** `origin/main` @ `62a6244cee258a243fdb308bd78daf7793c62cc5` (verified via `git ls-remote`, 2026-11-06)
**Remediation (v1.2):** FS-AUDIT-001 → **FIXED** and FS-AUDIT-002 → **FIXED** on branch `fix/security-r1-r2` (2026-11-07, records below; original evidence and reconciliation records preserved verbatim). R3–R7 remain OPEN. An independent refutation-oriented verification (separate agent) returned **HOLDS** for both fixes; its follow-up findings (N-1 ledger-replay gate, N-2 album sandbox, N-3 quarantine namespace, N-6 dead field) were fixed in the same branch with regression tests — see the remediation blocks and `findings.json` follow_up records.
**Verdict summary at the reconciled revision:** 0 CRITICAL · 0 HIGH · 0 MEDIUM · 2 LOW · 6 INFORMATIONAL — **all 8 findings re-confirmed against the current source (8 confirmed-current · 0 fixed upstream · 0 regressed · 0 disproved on re-check) · 0 new findings.** Plus the same 2 needs-validation deployment facts (06 §5) and 7 disproved hypotheses (06 §4, none re-opened).

> **Reconciliation summary (R2).** The upstream delta from the audited baseline is 7 commits / 12 files (+1040/−21): new `sim/epochMap.ts` (WP-2v epoch mapping), new `game/pauseSet.ts` (WP-1v pause set), edits to `game/Game.ts` (pause wiring only) and `game/worldRuntime.ts` (`onStoryDayBegin` delegation only), a dev-only probe script, three test files, and docs. `package.json`, `package-lock.json`, and `deploy-pages.yml` are untouched. Every finding-affected module except `Game.ts`/`worldRuntime.ts` is **byte-identical** to the audited baseline (`git diff` = 0 lines per file); the two changed files were reviewed line-by-line and neither edit touches a finding's code path. All findings were additionally re-proven dynamically against the actual production modules at `62a6244` (35-case R2 battery, `evidence/RESULTS-reconciliation-62a6244.txt`). Original evidence and fingerprints below are preserved verbatim; each finding now carries a **R2 reconciliation** line with current line anchors.
>
> **Requested Phase 3 branch (`feat/phase-3-navigation-building-access`): does not exist.** `git ls-remote` lists exactly 4 branches + 8 PR heads, none matching; zero commits in any ref match navigation/building-access/phase-3; zero `nav`-named files in any ref; and the production docs at `62a6244` state Phase 3 is "not started (queued next)" (`PRODUCTION-RECONCILIATION-REPORT.md:44`) with A-1 (nav graph) explicitly gated on owner authorization (`NEXT-PHASE-EXECUTION-PLAN.md:113–123`). Audit scope item closed as NOT APPLICABLE with evidence (`evidence/BASELINE-VERIFICATION-R2.txt`).

**Classification anchors used** (aligned to the reference methodology): CRITICAL = severe compromise with a credible path; HIGH = significant exploitable vuln; MEDIUM = real weakness needing specific conditions/limited impact; LOW = minor weakness with limited practical impact; INFORMATIONAL = observations, hardening, non-exploitable concerns. Severity is never inflated; every finding below survived an independent refute-oriented verification pass (06 §3).

---

## FS-AUDIT-001 — URL-triggered debug/E2E drivers wipe and overwrite player saves in production

> **REMEDIATION (v1.2, 2026-11-07): FIXED.** Branch `fix/security-r1-r2` @ the branch tip.
> **Original behavior.** `Game.ts:469–480` dispatched both drivers on mere URL-param presence in production builds; `runAutotest` called `wipeSave()` (the player story save) as its first act; `runScenario` removed/rewrote the world-save key — one crafted link reset another person's progress.
> **Root cause.** No development/production boundary existed on the URL debug surface: no `import.meta.env` guard, no authorization signal, no confirmation — the dispatch's only input was attacker-controllable.
> **Exact files changed.** NEW `web-three/src/game/driverGate.ts` (the boundary: `authorizeDebugDrivers({devMode, handshake})` + `readDriverHandshake` + `enableDriverStorageSandbox` + `isDriverAuthorizedNow`); `web-three/src/core/Save.ts` (driver story key `first_slice_save_v1_driver` + `activeSaveKey()` routing for load/write/wipe); `web-three/src/sim/state.ts` (driver world key `first_slice_world_v1_driver` + `activeWorldSaveKey()`); `web-three/src/game/Game.ts` (authorization decided before any storage read; both dispatches gated; denial logged honestly); `web-three/src/game/autotest.ts` + `scenario.ts` (defense-in-depth entry checks); `web-three/src/game/worldRuntime.ts` (storage routed through the active key); `scripts/e2e.mjs` + `scripts/probe-world-sim.mjs` (harnesses set the documented session-storage handshake before any page script).
> **Remediation implemented.** Drivers authorize only via `import.meta.env.DEV` (dev server/workflow preserved) or the harness's own `sessionStorage['fs_driver_authorized']='1'` — a signal a URL cannot carry. Production + URL alone can no longer start either driver (the denial is logged). Authorized sessions additionally run a STORAGE SANDBOX: story persistence rides `first_slice_save_v1_driver`, world persistence rides `first_slice_world_v1_driver` for the whole session — a driver cannot reach a real player save by construction. No hidden query parameter exists; `driverGate.ts`'s header is the documentation. The wardrobe's player-confirmed "start over" is intentionally unchanged.
> **Regression tests.** `tests/driver-gate.test.ts` (14: matrix, handshake-never-URL, refusing store denies, sandbox re-keys both layers, wipeSave hits only the driver key, full driver cycle never touches the player key, schema unchanged). `scripts/probe-security-r1.mjs` (31 checks on real `dist/`: production `?autotest=1`/`?scenario=…`/hostile → no driver, seeded day-4/$240 story save and the world save byte-identical; authorized → driver starts, boots from the DRIVER key (`bootedFromDay=1` with a day-4 save present), real saves intact).
> **Verification evidence.** `evidence/RESULTS-probe-security-r1.txt` (31/31), `evidence/RESULTS-vitest-r1-r2.txt` (887/887), `evidence/RESULTS-e2e-4day-r1-r2.txt`, `evidence/RESULTS-probe-world-sim-r1-r2.txt`.
> **Independent reviewer verdict.** **HOLDS — survived adversarial re-verification by a separate agent (2026-11-07):** the verifier enumerated the entire URL surface (autotest, scenario, fx, worldclock, starter, probe, film, walklog — only the first two reach drivers, both conjunctively gated), confirmed `import.meta.env.DEV` compiles to `devMode:!1` in the shipped bundle, confirmed no `src/` code writes the handshake from any URL-reachable path, re-ran `probe-security-r1` **31/31** against real `dist/`, and **could not construct any URL-only trigger** for the destructive operations. Follow-up findings N-2 (album sandbox) and N-3 (quarantine namespace) were fixed in the same branch with regression tests.
> **Remaining limitations.** The driver chunks still ship in the production bundle (reachable only behind the gate); a build-time exclusion is possible if the fleet ever stops testing built output. The handshake is an explicit local developer action (equivalent to console access) and destroys only sandbox keys.
> **Original behavior, reconciliation records, and evidence below are preserved verbatim.** `autotest.ts`, `scenario.ts`, and `Save.ts:271–277` are byte-identical to the baseline. The `Game.ts` change (WP-1v pause block, below the dispatch) does not touch the URL surface: the param-presence dispatches are now at **`Game.ts:469–471` (`?autotest`) and `:477–480` (`?scenario`)**; the `navigator.webdriver` gate (`:390–397`) still only skips the cinematic; `wipeSave()` is still called unconditionally at `autotest.ts:439`. Dynamically re-proven at the current modules: seeded day-4/$240 save → `wipeSave()` → defaults (battery R7.1/R7.2).

| Field | Value |
|---|---|
| **Severity** | LOW |
| **Confidence** | High (verified) |
| **Status** | CONFIRMED |
| **Affected files** | `web-three/src/game/Game.ts:468–471` (autotest dispatch), `:477–480` (scenario dispatch); `web-three/src/game/autotest.ts:439–440` (`wipeSave()` + reload); `web-three/src/game/scenario.ts:97` (world-save remove), `:186, :194, :210, :213` (world-save overwrites); `web-three/src/core/Save.ts:271–277` (`wipeSave` — no gate) |
| **Subsystem** | URL-parameter surface / debug infrastructure (ledger units 5, 17) |
| **Vulnerability class** | Debug functionality reachable in production via untrusted input → destructive action on another principal's data (CWE-489 "Active Debug Code" + CWE-359impact variant) |
| **Threat model** | Attacker capability: ability to make a victim open a URL (`https://<pages-origin>/?autotest=1` or `/?scenario=<any value>`) — a link in chat, email, or a QR code. Attacker needs no account and no code execution. Victim: any player with local save data on that origin. |
| **Technical explanation** | Both drivers dispatch on mere param *presence* (`params.has('autotest')`, `scenarioParams.has('scenario')`) with no value check, no `navigator.webdriver` gate (that gate only skips the cinematic, `Game.ts:394–401`), no `import.meta.env` guard (none exists in `src/` — verifier-confirmed), and no confirmation prompt anywhere in the codebase. `runAutotest()` calls `wipeSave()` (removes `first_slice_save_v1` — story day/money/diary/notebook) as its first act, then replays days and overwrites the key at each day boundary. `runScenario()` removes and repeatedly rewrites `first_slice_world_v1` (world sim clock/relationships/events) and fast-forwards the world clock. The postcard album (`first_slice_album`) and mute flag are untouched. |
| **Evidence** | Source trace above; seam-level dynamic proof that the invoked primitive does exactly the claimed destruction (harness `test_wipe_seam.ts`, results `evidence/RESULTS-wipe-seam.txt`): a day-4/$240 save → `wipeSave()` → defaults (`day=1, money=87`). Production reachability: `deploy-pages.yml` ships an unflagged `vite build`; the dynamic imports are not tree-shaken (they are reachable assignments). |
| **Reproduction** | In any browser: open `<deployment-url>/?autotest=1` with an existing day-2+ save → console shows the autotest log, save is reset to defaults at line autotest.ts:439. Open `?scenario=x` → world save key deleted then mutated by steps 6b–6d. (Auditor reproduction stopped at the seam per sandbox rules; the three-hop dispatch chain is statically certain.) |
| **Actual impact** | Loss of the victim's local game progress (story and/or world layer) and an unwanted auto-play session in their browser. No confidentiality impact (nothing is exfiltrated), no code execution, no persistent compromise. |
| **Exploitability** | Trivial for the attacker (one crafted link), one-click for the victim. Practical severity is bounded by the value of the asset: local, regenerable game progress in a single-player game. |
| **Remediation** | Smallest effective fix: gate both drivers behind a signal a remote link cannot forge — e.g. `sessionStorage.setItem('fs_driver','1')` set by the probe harness itself, or `import.meta.env.DEV` build exclusion for the two dynamic-import blocks (`Game.ts:468–480`), or at minimum a `confirm()` before any storage mutation in `runAutotest`/`runScenario`. Do not rely on `navigator.webdriver` (it does not gate these paths). |
| **Regression test** | Unit: dispatch decision function returns `{autotest:false, scenario:false}` when a `driverAllowed` flag is absent, and the built bundle contains no `runAutotest` reference (string check on `dist` assets in CI). E2E: load with `?autotest=1` on a seeded save and assert the save survives when the gate is closed. |
| **Independent verification** | Verifier A — confirmed, severity LOW upheld. Re-verified every line; searched for webdriver/import.meta/tree-shaking mitigations; none exist. |

## FS-AUDIT-002 — World-save parser contradicts its own degrade law: shape-broken sections throw; only the boot-seam catch prevents a crash

> **REMEDIATION (v1.2, 2026-11-07): FIXED.** Branch `fix/security-r1-r2`.
> **Original behavior.** `parseWorldSave` validated only magic/version/worldId and blind-cast the rest into `hydrate()`, where `doc.clock.day`, `doc.relationships.map`, `doc.ledger.txns`, `doc.flags`, and entity rows threw on shape-broken documents; the degrade law held only via `bootWorldBrain`'s catch two files away, and the refused document stayed on the active key (the reset repeated every boot).
> **Root cause.** The parser trusted the document's shape after three identity fields; hydration dereferenced unvalidated sections; no integrity gate stood between a corrupted document and accepted world state.
> **Exact files changed.** `web-three/src/sim/state.ts` (NEW validation battery: every section type/range/id/reference/bound-checked and whitelist-REBUILT — unknown properties dropped, `__proto__`/`constructor`/`prototype` keys cannot survive; any failure → fresh world + one bounded note; `hydrate` wrapped in try/catch as a second net; NEW post-hydration integrity gate: `auditWorld` failure now REFUSES the document); `web-three/src/game/worldRuntime.ts` (quarantine: a refused document moves to `first_slice_world_v1_quarantine` — preserved, not destroyed — and leaves the active key, so the refusal happens once per document and the player continues on a fresh world); `web-three/src/sim/runtime.ts` unchanged (the outer catch remains).
> **Remediation implemented.** Full pre-hydration validation: numeric ranges (`MAX_MONEY_CENTS=$1M` in cents; day 1..36500 per the project's own calendar bound; minute 0..1439; tick bounds; warmth −100..100; trust 0..100), ledger flow laws mirrored from `sim/economy.post()`, ids validated against the sim-id grammar (`sim/ids.ts`) and `isAccount`, references validated (relationships→npcs, businesses→npcs), array bounds (npcs ≤10k, txns ≤50k, flags ≤1k…), duplicate ids rejected. Valid saves restore exactly (the 840-test baseline passed unchanged before the new batteries landed); unknown trailing fields are dropped, not rejected (forward-compat law); NO schema change.
> **Regression tests.** `tests/world-save-validation.test.ts` (33: the full B-battery re-ported — missing/null sections, wrong primitives, invalid txn arrays incl. flow laws and duplicates, day/minute/calendar overflows, ranges, junk entities, rails/flags/environment shapes, 1e12–1e15 numerics, `__proto__` in doc/rails/environment, constructor keys, arrays-for-objects, resource bounds refusing 10,001 npcs / 50,001 txns, integrity-gate cases (unordered events, double-listed relationship, non-item inventory), valid-save round-trips with unknown-field dropping, a hostile parse-never-throws corpus, `bootWorldBrain` recovery with a playable recovered world, and a recording-storage proof that recovery performs ZERO storage writes and the story save is byte-identical). `scripts/probe-security-r2.mjs` (166 checks on real `dist/`: 21 corruption classes through the production `reloadFromSave` seam — fresh world, named note, story save intact, quarantine holds the refused bytes, world playable; C14 valid restore; C15 loop-ends proof; B1/B2 cold-boot constructor-path proofs).
> **Verification evidence.** `evidence/RESULTS-probe-security-r2.txt` (166/166), `evidence/RESULTS-vitest-r1-r2.txt`, original `RESULTS-save-parsers.txt` preserved.
> **Independent reviewer verdict.** **HOLDS — survived adversarial re-verification by a separate agent (2026-11-07):** the verifier ran 25+ hostile documents through the real `parseWorldSave` (all 12 sections missing/null, wrong primitives, 1e12/1e15 numerics, `__proto__`/`constructor` keys, arrays-for-objects, resource bounds, duplicates, dangling refs) — **zero throws, zero partial hydrations, zero malformed docs restored**; the 840-test baseline passes unchanged (suite now 892/892); recovery provably performs zero storage writes and never touches the story save; quarantine refusal conditions verified exact (first boot and valid docs never quarantined; refused bytes preserved). The verifier's strongest attack — N-1: hydrate-time `post()` rejections silently swallowed — was **fixed in the same branch** (the integrity gate now refuses any document whose ledger history cannot be replayed) and is pinned by a regression test reproducing the exact attack; recorded blemishes N-4/N-5 are informational, and the structural economics gap remains FS-AUDIT-003/WP-4 as scheduled.
> **Remaining limitations.** The genesis-clamp recovery (balances the clamp can absorb) still restores with a loud note — documented recovery, not silent acceptance; everything the clamp cannot reconcile is refused by the new integrity gate. FS-AUDIT-003's structural economics gap (doc-derived genesis) is out of scope here and remains gated on the WP-4 re-audit. The incidentally-adjacent FS-AUDIT-003 reproduction (moneyCents=1e12) now lands on the money-ceiling rejection.
> **Original behavior, reconciliation records, and evidence below are preserved verbatim.** `sim/state.ts` and `sim/runtime.ts` are byte-identical. The `worldRuntime.ts` change touches only `onStoryDayBegin` (~`:334–346`); both production seams survive unchanged — constructor seam now **`worldRuntime.ts:86–95`** (`try` @86, `bootWorldBrain` @87) and `reloadFromSave` seam **`:288–295`** (`try` @288, `bootWorldBrain` @289). Battery R2.1–R2.5 re-proves all five shape-broken-section throws against the current modules; R2.6–R2.8 re-proves the validated refusal paths.

| Field | Value |
|---|---|
| **Severity** | LOW |
| **Confidence** | High (verified) |
| **Status** | CONFIRMED |
| **Affected files** | `web-three/src/sim/state.ts:265–292` (`parseWorldSave` — validates only magic/version/worldId at :272–285, then casts), `:214–259` (`hydrate` — unchecked dereferences: `doc.clock.day` :217, `doc.relationships.map` :221, `doc.ledger.txns` :229, `doc.flags` iteration :250); documented law at `:28–31`; the surviving guard `web-three/src/sim/runtime.ts:637–646` (`bootWorldBrain` try/catch); both production seams `web-three/src/game/worldRuntime.ts:85–94` (constructor) and `:285–305` (`reloadFromSave`) |
| **Subsystem** | World-save persistence (ledger unit 2) |
| **Vulnerability class** | Improper input validation on deserialization (CWE-502 family); contract violation ("a corrupt save is a fresh start, never a crash") |
| **Threat model** | Attacker capability: none remote. Requires a shape-broken-but-JSON-valid world save in the victim's localStorage — i.e., hand-editing, a buggy third-party save tool, or storage-level corruption that preserves JSON validity. The browser itself always writes typed documents (`snapshotWorld`, state.ts:295–314), so this is not reachable from normal play. |
| **Technical explanation** | The module header promises "Parse validates; anything missing/invalid/corrupt degrades to a fresh, valid world… and reports what happened." The implementation validates three identity fields and then blindly casts and dereferences every section. Contrast with the story-save parser (`core/Save.ts`), which field-validates everything. The throw is converted to a fresh world + note by `bootWorldBrain`'s catch, so no boot crash occurs — but the module contract is broken, and behavior silently depends on a caller two files away. |
| **Evidence** | Harness battery against the actual production modules (`evidence/RESULTS-save-parsers.txt`, cases B1–B13): missing `ledger` → `TypeError: Cannot read properties of undefined (reading 'txns')`; missing `clock` → `TypeError … (reading 'day')`; missing `player` → `TypeError … (reading 'moneyCents')`; `relationships: 5` → `doc.relationships.map is not a function`; `ledger.txns: 5` → `doc.ledger.txns is not iterable`; `flags: [1,2,3]` → `.for is not iterable`; junk npc shapes → `n.inventory is not a function/iterable` (thrown from `validateNpcs`, `sim/entities.ts:185–193`). Validated paths still degrade correctly (B8–B10: wrong magic / version 99 / foreign worldId → fresh). |
| **Reproduction** | `localStorage.setItem('first_slice_world_v1', JSON.stringify({magic:'first-slice-world', version:1, worldId:'alder_heights'}))` then reload → `bootWorldBrain` catch fires → fresh world with note `world save parse threw …`. Repeatable on every reload until the next `flushWorldSave` overwrites the bad document. |
| **Actual impact** | Unexpected, silent world-layer resets (roam-mode clock, relationship warmth, world events lost) for a user with a damaged world save; the corrupt document is not quarantined or removed, so the reset repeats until a story-persist or roam autosave heals it. No crash, no code execution, no cross-principal effect. |
| **Exploitability** | Not exploitable by a remote attacker at all today; realistic only via local tampering/corruption. Its weight is architectural: the safety of a documented "never a crash" law currently hangs on one catch block. |
| **Remediation** | Enforce the law where it is claimed: either (a) field-validate sections in `parseWorldSave` and degrade per-section (preferred — mirrors `core/Save.ts`), or (b) keep `hydrate` but wrap it in try/catch **inside** `parseWorldSave` and return `fresh` + note, so the contract no longer depends on callers remembering to catch. Also remove/quarantine the offending document when degrading. |
| **Regression test** | Port the audit battery (B2–B7, B13) into `tests/sim-state.test.ts`: every malformed-section document must yield `source==='fresh'` with notes — never a throw. |
| **Independent verification** | Verifier A — confirmed, LOW upheld. Hunted for earlier validation or an uncaught caller: the only two callers of `parseWorldSave` both sit inside the catch; main.ts adds a second net. LOW stands. |

## FS-AUDIT-003 — World restore re-derives economic truth from the save document itself; the integrity audit is structurally blind to tampered balances

**R2 reconciliation (@ `62a6244`): CONFIRMED-CURRENT — INFORMATIONAL unchanged.** `sim/state.ts` byte-identical; battery R3.1 re-proves `moneyCents=1e12` restoring with **zero notes**. Forward-risk framing unchanged and still scheduled: the production docs at `62a6244` recommend WP-4 (D-3 money→ledger bridge) as the next work item after A-1 — the re-audit-before-WP-4 requirement (07 §Follow-up) stands.

| Field | Value |
|---|---|
| **Severity** | INFORMATIONAL (in the current single-player threat model this is ordinary client-side cheating — recorded because of what it means for the roadmap) |
| **Confidence** | High (verified) |
| **Status** | CONFIRMED |
| **Affected files** | `web-three/src/sim/state.ts:222–248` (`hydrate`: `finalOf.set('acct:player', doc.player.moneyCents)` :235, genesis re-derivation :241–246), `:153–177` (`auditWorld` compares doc-derived pairs :169–171), `:286–291` (audit result → notes only; world still returned as `restored`) |
| **Subsystem** | Simulation trust boundaries (ledger unit 7) |
| **Vulnerability class** | Trusting untrusted persisted state as economic truth (second-order trust gap), masked by a self-referential integrity check |
| **Threat model** | Attacker = the player (or anyone with write access to their browser profile). No remote vector. Materiality changes only if world state ever feeds a shared/server-side consumer. |
| **Technical explanation** | On restore, ledger genesis is re-derived **from the document's final balances** (player snapshot, business balances), so any hand-edited `moneyCents` is self-consistent by construction. `auditWorld` then compares `ledger.balance('acct:player')` against `player.moneyCents` — the same doc-derived number — producing zero issues. The entity validators can't catch it either (`validateNpcs` never sees the player record; the player is not an npc row). Harness proof: a document with `player.moneyCents = 1e12` restored as `source='restored'` with **zero notes** (`evidence/RESULTS-save-parsers.txt`, case B11). |
| **Evidence** | Case B11 (above); repo's own roadmap confirms the forward risk: the D-3 money→ledger bridge is named open work (`AGENTS.md:11`, `docs/architecture/world-contract/17-implementation-roadmap.md`, `docs/production/NEXT-PHASE-EXECUTION-PLAN.md` WP-4). |
| **Reproduction** | Edit `player.moneyCents` in `first_slice_world_v1` → reload → roam HUD/economy reflects the edited balance; integrity notes empty. |
| **Actual impact** | Self-impact cheating in the current build (player grants themselves arbitrary money). No cross-principal effect. **Forward risk:** if/when the D-3 bridge (or any leaderboard/cloud-save/online trading feature) treats world state as authoritative, this becomes a genuine trust-boundary failure with a money-printing primitive — the integrity audit will still be blind to it. |
| **Exploitability** | Trivial for the local player; zero for a remote attacker today. |
| **Remediation** | When the money bridge lands, validate restored economics against an independent anchor (e.g., re-simulate or cap restored balances at plausible totals; treat the ledger *transactions*, not final balances, as the trusted input and recompute balances from them; plausibility-clamp with a note). For now: none required beyond awareness. |
| **Regression test** | When the bridge lands: a restored world with doc money inconsistent with re-simulated transactions must be flagged/rejected. |
| **Independent verification** | Verifier A — confirmed, INFORMATIONAL upheld; confirmed no boot-time story bridge overwrites doc money today and that the D-3 reference is fair. |

## FS-AUDIT-004 — Story-save parser accepts unbounded `cart_name`, `money`, and `day_start_money`; UI enforces a 24-char limit the parser does not

**R2 reconciliation (@ `62a6244`): CONFIRMED-CURRENT — INFORMATIONAL unchanged.** `core/Save.ts` and `index.html` byte-identical. Battery R1.2/R1.3/R1.4 re-proves `money=1e15` (numeric and string) and a 1,000,000-char `cart_name` parsing verbatim; regression checks R1.1/R1.5/R1.6 confirm the day clamp (4), the `calendar_day` clamp (36500) and `__proto__` neutralization are intact.

| Field | Value |
|---|---|
| **Severity** | INFORMATIONAL |
| **Confidence** | High (verified) |
| **Status** | CONFIRMED |
| **Affected files** | `web-three/src/core/Save.ts:186` (`cart_name` pass-through, no cap), `:187` + `:195` (`money`/`day_start_money` — floor only, no ceiling); contrast caps at `:150` (200-char strings), `:211` (starter ≤40); UI cap only in `index.html:84` (`maxlength="24"`) and `GameState.confirmName` (`core/GameState.ts:534–535`, trim-only) |
| **Subsystem** | Story-save persistence (ledger unit 1) |
| **Vulnerability class** | Missing input length/range bound (consistency defect); no cross-principal impact |
| **Threat model** | Attacker = the user themself (localStorage is same-origin writable). No save export/import feature exists (verifier-confirmed), so a crafted save cannot travel between players. |
| **Technical explanation** | Every other parser field is bounded; these three are not. Harness proof: 1,000,000-char `cart_name` parses verbatim; `money: 1e15` accepted in numeric and string form. Rendering is safe — traced end-to-end by the verifier: captions/dialogue → `textContent` (`UI.ts:594, :708–709, :284`), cart sign/flyer → canvas `fillText` (`World.ts:5668–5677, :5722–5738`), postcard art → canvas `fillText` sliced to 14 chars (`PostcardCapture.ts:196–197`), album entries with `cartName > 40` are rejected outright (`Album.ts:77`). |
| **Evidence** | `evidence/RESULTS-save-parsers.txt` cases A11, A12, A15. |
| **Reproduction** | `localStorage.setItem('first_slice_save_v1', JSON.stringify({day:2, cart_name:'A'.repeat(1e6), money:1e15}))` → reload → values live; HUD/captions render the huge name via safe text sinks. |
| **Actual impact** | Self-only: display/perf oddities from absurd values; a >40-char cart name silently blocks album entries (functional inconsistency). No XSS (all sinks safe), no cross-user vector. |
| **Exploitability** | None beyond self-impact. |
| **Remediation** | Clamp at parse time to match the UI contract: `cart_name.slice(0, 24)` (or 40 to match Album) and `Math.min(money, 999_999)`. One-line each, mirrors `strList`'s discipline. |
| **Regression test** | Extend the `tests/save.test.ts` fuzz wall: `cart_name` of 1e6 chars parses to ≤24 (or chosen cap); `money: 1e15` parses to the chosen ceiling. |
| **Independent verification** | Verifier B — confirmed, INFORMATIONAL upheld; every rendering sink traced safe; no export/import feature exists. |

> **Remediation record (qa-full-spectrum wave, 2026-11-10): FIXED.** The story-save parser now enforces the UI's own contract — `cart_name` caps at the input's 24 chars (index.html's `maxlength`), `money` and `day_start_money` cap at 999999. The audit's own proof cases (a 1e6-char name, `money: 1e15` numeric or string) no longer parse verbatim; rendering behavior for every legitimate save is unchanged. Regression: `tests/save.test.ts`'s FS-AUDIT-004 case. Gate: vitest 1300/1300 on the wave's tree.

## FS-AUDIT-005 — `GameClock` accepts an unbounded day number and `calendarOf()` is linear in it — a latent multi-hour loop with no shipped consumer today

**R2 reconciliation (@ `62a6244`): CONFIRMED-CURRENT as latent — INFORMATIONAL unchanged, with a new watch item.** `sim/clock.ts` is byte-identical; battery R4.1/R4.2 re-proves the unclamped acceptance (`clock.day=1e15` restored; `new GameClock({day:1e15}).day=1e15`), R4.3/R4.4 re-prove linear `calendarOf` growth (0.43 ms @ 1e7) and O(1) weekday. **WP-2v's `epochMap.ts` is the first new production consumer of calendar math since the audit — and it does NOT reactivate the hazard:** examined line-by-line, it calls `calendarOf` only with the constant `1` (`:183`) and loop days ≤ 1460 (`:210–212`), routes every public mapping through `assertDay()` (`:69–76`, throws on non-integer/<1/>36500), and `epochAgreement` is boot/audit-time with a bounded walk. **Watch item:** `epochMap` exports `datelineOfSimDay`/`datelineOfStoryDay` for the roadmap's WP-6 (HUD/diary datelines) — WP-6 is exactly the "future consumer" this finding warned about. Routing through `epochMap` is safe (bounded to 36500, ≈1 ms); a WP-6 surface that reads `GameClock.day` directly would reactivate the latent hang — R4 (clamp the constructor) remains the durable fix.

| Field | Value |
|---|---|
| **Severity** | INFORMATIONAL (latent — no current runtime consumer) |
| **Confidence** | High (verified) |
| **Status** | CONFIRMED (as a latent hazard) |
| **Affected files** | `web-three/src/sim/clock.ts:148` (constructor accepts `day ≥ 1` unbounded; `minuteOfDay` IS clamped), `:66–80` (`calendarOf`'s `for(;;){ rest -= 365 }` loop — ~day/365 iterations); contrast the story-side clamp `core/calendar.ts:76–79` (`clampCalendarDay` → 1..36500) |
| **Subsystem** | Time/calendar systems (ledger unit 8) |
| **Vulnerability class** | Unbounded loop over attacker-influenced numeric input (CWE-400 family) — currently unreachable |
| **Threat model** | Requires (a) a world save with `clock.day = 1e15` (local tampering — accepted, harness-proven) AND (b) a consumer reading `.date`/`.season` on the world clock. (b) does not exist today. |
| **Technical explanation** | `calendarOf` counts years by subtracting 365 in a loop. Measured: day=1e7 → 27,398 iterations in 0.69 ms; day=1e15 projects ≈2.7×10¹² iterations — effectively a permanent tab hang. The auditor did **not** execute the huge case (bounded-test rule). Exhaustive grep (verifier-confirmed): **no** shipped consumer reads `.date`/`.season` on any clock; the only runtime clock reads are `.weekday`/`.weekend` (O(1) modulo, `clock.ts:93–98`), `.tick`/`.phase`/`.time` (O(1)), and `advanceReal` is guard-capped at 1440 ticks/call (`sim/runtime.ts:346–359`), so booting a huge-day world does not hang. Story-save calendar values are separately clamped to 36500, bounding the core-calendar implementation. |
| **Evidence** | `evidence/RESULTS-save-parsers.txt` cases C1–C4 (bounded growth measurement + acceptance proof); grep census in 06 §3. |
| **Reproduction** | Two-step: (1) accepted today — set `clock.day=1e15` in the world save, boot (no hang, clock loads); (2) hang — only if a future consumer renders `clock.date`. |
| **Actual impact** | None today; a one-line consumer away from a persistent tab-freeze fed by a hand-edited save. |
| **Exploitability** | Not reachable in the shipped build. |
| **Remediation** | Clamp the clock at the trust boundary: `Math.min(day, 36500)` (mirroring `clampCalendarDay`) in the `GameClock` constructor — one line, kills the class. |
| **Regression test** | `new GameClock({day: 1e15}).day === 36500` (or chosen max); `calendarOf` must remain O(1)-bounded after the clamp. |
| **Independent verification** | Verifier B — confirmed, latent INFORMATIONAL upheld; confirmed `advanceReal` tick cap and the absent consumer. |

> **Remediation record (qa-full-spectrum wave, 2026-11-10): FIXED.** `GameClock` now carries the day trust boundary itself — the constructor clamps `day` to [1, 36500] (the same ceiling as `clampCalendarDay`, the world-save validator's `MAX_DAY`, and epochMap's `assertDay`) and `advance` pins at the ceiling (the final day still flows; no day may ever open past 36500). `calendarOf`'s linear loop can never be handed an unbounded day again — the latent tab-freeze class is dead at the source, not at each consumer. The watch item is closed verified: WP-6's HUD dateline routes through `datelineOfStoryDay` (epochMap's bounded mapping), never the raw day. Regression: `tests/sim-clock.test.ts`'s boundary case (1e15 clamps; the crossing INTO day 36500 is a legal midnight; the ceiling absorbs `advance(1e12)`).

## FS-AUDIT-006 — Album thumb validation accepts any `data:image/` prefix, including `data:image/svg+xml` (non-exploitable as shipped)

**R2 reconciliation (@ `62a6244`): CONFIRMED-CURRENT as hardening — INFORMATIONAL unchanged.** `Album.ts` and `UI.ts` byte-identical. Battery R6.2 re-proves the `svg+xml` thumb acceptance; R6.1/R6.3/R6.4 re-prove `javascript:` rejection, the valid path, and the `cartName>40` album cap.

| Field | Value |
|---|---|
| **Severity** | INFORMATIONAL (hardening) |
| **Confidence** | High (verified) |
| **Status** | CONFIRMED (as hardening) |
| **Affected files** | `web-three/src/postcard/Album.ts:58–60` (`isDataImage` prefix check), consumed at `src/ui/UI.ts:636` (`img.src = e.thumb`) |
| **Subsystem** | Album/persistence (ledger unit 3) |
| **Vulnerability class** | Overly permissive data-URL validation (potential DOM-XSS prerequisite — NOT exploitable here) |
| **Threat model** | Requires a hand-edited `first_slice_album` (no remote vector; the only writers are canvas `toDataURL` raster captures, `Album.ts:131–152`). |
| **Technical explanation** | The verifier confirmed the full sink set: album thumbs reach only `img.src`; SVG loaded through `<img>` executes **no script** and loads **no external resources** (SVG-as-image mode). `javascript:` URIs are rejected by the prefix check (harness D2), and oversized thumbs (D4), oversized captions (D5), bad days (D7) are all rejected. Re-share/download paths treat thumbs as opaque image bytes. |
| **Evidence** | `evidence/RESULTS-save-parsers.txt` cases D1–D7. |
| **Reproduction** | Insert an entry with `thumb: 'data:image/svg+xml,<svg…>'` into `first_slice_album` → shelf renders it as an image; no script execution (browser SVG-as-image semantics). |
| **Actual impact** | None demonstrated. The prefix is wider than the writers ever produce. |
| **Exploitability** | None as shipped. Would become relevant only if thumbs were ever embedded via `<object>`/`<iframe>`/`srcdoc` (they are not) or if the parser fed other sinks. |
| **Remediation** | Tighten to the two mime types the pipeline actually produces: `/^data:image\/(png|jpeg);/`. |
| **Regression test** | Add to `tests/album.test.ts`: an svg+xml thumb is rejected. |
| **Independent verification** | Verifier B — confirmed as hardening; corrected one line reference (UI.ts:636) and checked the re-share/download paths. |

> **Remediation record (qa-full-spectrum wave, 2026-11-10): FIXED.** The thumb whitelist is now exactly the two mimes the canvas pipeline produces (`data:image/png` and `data:image/jpeg`) — `svg+xml`, `gif`, `webp` and every other flavor can never be produced by the writers, so they can never be loaded. Regression: `tests/album.test.ts`'s field wall rejects svg+xml/gif/webp thumbs.

## FS-AUDIT-007 — Wardrobe lineup interpolates into `innerHTML` without escaping; values are developer constants (hardening only)

**R2 reconciliation (@ `62a6244`): CONFIRMED-CURRENT as hardening — INFORMATIONAL unchanged.** `ui/Wardrobe.ts` byte-identical. WP-1v touched only pause wiring (`Game.ts`, `pauseSet.ts`, `worldRuntime.ts`), not wardrobe rendering; no save/URL path reaches the interpolations (unchanged).

| Field | Value |
|---|---|
| **Severity** | INFORMATIONAL (hardening) |
| **Confidence** | High (verified) |
| **Status** | CONFIRMED (as hardening) |
| **Affected files** | `web-three/src/ui/Wardrobe.ts:259–263` (`tile.innerHTML` with unescaped `${row.swatch}`, `${row.name}`, `${row.role}`), rows built at `:87–100` from the static `STARTERS` registry (`core/starters.ts:37–93`) + static `STARTER_METADATA` (`Wardrobe.ts:29–60`); swatch = `'#' + jacket.toString(16)` |
| **Subsystem** | DOM/UI rendering (ledger unit 4) |
| **Vulnerability class** | Inconsistent output-encoding discipline (no reachable sink today) |
| **Threat model** | None — verifier confirmed save-controlled (`save.starter`, `?starter=`) values flow only through `starterById`/`isStarterId` (fallback to the static `'classic'`, `starters.ts:99–101`) and reach the DOM as booleans or `textContent`. No save/URL value can reach the interpolated fields. |
| **Technical explanation** | Every other `innerHTML` site in the codebase wraps interpolations in `escapeHtml` (`UI.ts:339, :396, :427, :564`); this one does not, and currently cannot be influenced. The risk is structural: the pattern invites a future save-controlled field into an unescaped sink. |
| **Evidence** | Source trace; verifier re-check. |
| **Reproduction** | n/a (no attacker-reachable variant). |
| **Actual impact** | None today. |
| **Exploitability** | None. |
| **Remediation** | Escape the three interpolations (or build the tile with `textContent`), matching the codebase's own law. |
| **Regression test** | Lint-style guard: forbid unescaped `${` inside `innerHTML` assignments (a tiny ESLint custom rule or grep gate in CI). |
| **Independent verification** | Verifier B — confirmed as hardening-only. |

> **Remediation record (qa-full-spectrum wave, 2026-11-10): FIXED (hardening).** The lineup render escapes every interpolated value (a file-local `escapeHtml`, the diary.ts/UI.ts precedent) and the swatch must prove itself plain hex before it may touch a `style` attribute — the render no longer depends on the values being developer constants. Render output is byte-identical for the shipped data. Gate: the wardrobe suite green.

## FS-AUDIT-008 — CI pins first-party actions by mutable major tag rather than commit SHA (hardening only)

**R2 reconciliation (@ `62a6244`): CONFIRMED-CURRENT as hardening — INFORMATIONAL unchanged.** `deploy-pages.yml` byte-identical (`git diff` = 0); none of the 7 upstream commits touches the workflow, manifest, or lockfile.

| Field | Value |
|---|---|
| **Severity** | INFORMATIONAL (hardening) |
| **Confidence** | High (verified) |
| **Status** | CONFIRMED (as hardening) |
| **Affected files** | `.github/workflows/deploy-pages.yml:26, :29, :50, :63` (`actions/checkout@v4`, `setup-node@v4`, `upload-pages-artifact@v3`, `deploy-pages@v4`) |
| **Subsystem** | CI/deployment (ledger unit 12) |
| **Vulnerability class** | Unbound build inputs (mutable tag references) — supply-chain hardening |
| **Threat model** | Requires compromise/re-point of a GitHub-first-party action tag — outside the repository and outside any demonstrated path. |
| **Technical explanation** | Everything else in the workflow is exemplary for this class: triggers are `push→main` + `workflow_dispatch` only (**no** `pull_request`/`pull_request_target` — no untrusted-PR code execution path), permissions are scoped (`contents:read`, `pages:write`, `id-token:write`), no secrets are referenced, `npm ci` enforces the lockfile, tests gate the build, and `.github/` contains only this one workflow (verifier-confirmed). |
| **Evidence** | Source trace; verifier re-check. |
| **Reproduction** | n/a. |
| **Actual impact** | None demonstrated; tag-pinning is the accepted default for first-party actions. |
| **Exploitability** | None demonstrated. |
| **Remediation** | Pin the four actions to full commit SHAs (optionally with a comment naming the version). |
| **Regression test** | A workflow-lint step rejecting non-SHA `uses:` refs. |
| **Independent verification** | Verifier B — confirmed as hardening-only. |

---

> **Status note (qa-full-spectrum wave, 2026-11-10): OPEN — documented, deliberately not patched blind.** Pinning actions by commit SHA requires verifying each upstream action's real SHA at patch time; a wrong pin silently breaks the Pages deploy. Recommended: one dedicated hardening commit that pins `actions/checkout`, `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages` to their then-current SHAs, verified against the actions' repos.

## Negative results worth stating (the genuinely secure parts)

- **No code-execution sinks anywhere in `src/`**: zero `eval`, `new Function`, string-timers, dynamic-RegExp, `document.write`, service workers, `postMessage`, IndexedDB, cookies; zero runtime `fetch` — the game makes no network requests at all.
- **The story-save parser is a real wall** (28-case battery): corrupt/truncated/wrong-typed/`__proto__`-laden/Infinity-laden inputs all degrade to a valid save; no prototype pollution gadget exists (whitelist reconstruction).
- **The album parser is a real wall** (7-case battery + 1 M-entry timing).
- **The economy ledger rejects** non-integer/negative amounts, malformed account ids, self-transfers, and policy violations at `post()` time (`sim/economy.ts:120–170`).
- **No secrets or credential-shaped files** are tracked at the audited HEAD.
- **`npm audit`: zero known vulnerabilities** across 94 lock entries (2026-11-06 advisory data); all resolutions from `registry.npmjs.org`; dependency versions near-current.
- **The CI workflow has no untrusted-PR trigger and no secrets in scope.**
