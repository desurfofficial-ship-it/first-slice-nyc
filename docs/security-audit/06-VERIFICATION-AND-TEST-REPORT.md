# 06 — Verification and Test Report

**Audited revision:** `main` @ `7995e6ea2e371644a5347f93acc8bed948bf0e54`
**Execution policy honored:** source-and-local-only. No deployed endpoint, live service, or shared environment was contacted. No production data touched. No repository file created or modified. All dynamic work ran in an isolated scratch workspace with bounded fixtures, hard timeouts, and a 512 MB heap cap.

---

## 1. Tests actually executed

### 1.1 Isolated parser harness — 50 cases + 4 seam checks (all against the actual production modules)

**Method.** Disposable copies of the production parser modules were made in the audit scratch directory; the only modification was rewriting extensionless relative imports to explicit `.ts` paths so Node v24's native type-stripping could load them. **No parser logic was altered in any way.** The album module was imported from the repository tree unmodified (it has no relative imports). No dependency was installed; no network was used; nothing was written outside the scratch directory.

- `scripts/audit-fixtures/test_save_parsers.ts` → full log preserved at `evidence/RESULTS-save-parsers.txt`
- `scripts/audit-fixtures/test_wipe_seam.ts` → `evidence/RESULTS-wipe-seam.txt`
- Modules exercised: `core/Save.ts`, `core/fieldDiary.ts`, `core/calendar.ts`, `sim/state.ts`, `sim/clock.ts`, `sim/rng.ts`, `sim/entities.ts`, `sim/ids.ts`, `sim/economy.ts`, `sim/narrative.ts`, `postcard/Album.ts`

**Story-save battery (28 cases, `parseSave`).** corrupt/empty/array/number/string JSON → defaults (A1–A7); valid round-trip (A8); `day` clamped to 4 (A9); negative money floored (A10); float truncated (A13); `calendar_day` clamped to 36500 (A14); `map_notes` non-array → empty (A17); `field_diary` garbage quarantined (A18); over-long `starter` dropped (A19); unknown-but-valid `starter` kept, read-site fallback verified separately (A20); `lunch_served` clamped to 3 (A21); **prototype pollution attempts neutralized** — `__proto__` and `constructor.prototype` keys produce no pollution (A22, A23); stringly booleans coerced only for `true`/`false` (A24); `diary_noted` per-family quarantine (A25); 200-level nesting tolerated (A26); non-numeric string → default (A27); `1e999`→Infinity rejected (A28). Observed gaps → A11/A12 (money 1e15 accepted), A15 (1 MB `cart_name` accepted) → **FS-AUDIT-004**.

**World-save battery (13 cases, `parseWorldSave`).** Valid minimal doc restores (B1); validated refusals work: wrong magic / version 99 / foreign worldId → fresh (B8–B10); **shape-broken sections throw** — missing `ledger`/`clock`/`player`, `relationships:5`, `ledger.txns:5`, `flags:[1,2,3]`, junk npc shapes (B2–B7, B13) → **FS-AUDIT-002**; tampered `moneyCents=1e12` restores silently with zero integrity notes (B11) → **FS-AUDIT-003**; `clock.day=1e15` accepted (B12) → **FS-AUDIT-005**.

**Calendar growth measurement (bounded, C-series).** `calendarOf` measured at day=1e3/1e5/1e7 (0.09 ms → 0.69 ms; linear in day/365). The 1e15-day case was **not** executed (bounded-test rule); projected ≈2.7×10¹² iterations (multi-hour hang). `GameClock` acceptance of day=1e15 proven (C3); `weekdayOf` O(1) proven (C4).

**Album battery (7 cases, `parseAlbum`).** Garbage shapes → empty (D1); `javascript:` thumb rejected (D2); `svg+xml` thumb accepted (D3) → **FS-AUDIT-006**; >200 KB thumb rejected (D4); >400-char caption rejected (D5); 1,000,000-entry array processed in 670 ms, capped to 24 (D6); day 100000 rejected (D7).

**Storage-seam checks (4, `test_wipe_seam.ts`).** `writeSave`→`loadSave` round-trip on a stub store; **`wipeSave()` removes the story save unconditionally** (E2 — the exact primitive FS-AUDIT-001's `?autotest=1` path invokes); refused store → `false`, no throw (E3); day-1 write law confirmed at source (`GameState.snapshotForSave` returns `null` below day 2).

### 1.2 Tooling runs

- `npm audit --package-lock-only --json` → **0 vulnerabilities** (3 prod + 92 dev; advisory DB 2026-11-06). Install-free; nothing modified.
- Lockfile structural analysis (95 entries): 100% `registry.npmjs.org` resolution, no git/tarball deps, one install-script package (`fsevents`).
- Dependency currency via `npm view` (registry read): three 0.187.0 / yuka 0.7.8 / vite 8.3.6 / vitest 5.1.0 / typescript 7.0.2.
- Sink sweeps over all 71 `src` modules (`innerHTML` family, `eval`/`Function`, storage, URL, `postMessage`, workers, `fetch`, RegExp, deep-merge patterns, `import.meta`).

### 1.3 Tests NOT executed (transparency)

- The repository's own **783-case vitest suite** (needs `npm install` — prohibited). It gates CI on every push; the in-repo reconciliation record (`31ea3e0`) claims 744/744 passing at an earlier revision. The audit's independent battery was run **instead of**, not in addition to, it.
- Any browser-execution test (build prohibited). The FS-AUDIT-001 dispatch chain was therefore proven at the storage seam + exact source trace rather than in a live tab.
- The 1e15-day `calendarOf` loop (multi-hour; violates bounded-test discipline).
- Live Pages header observation and repo-settings inspection (out of source/local boundary — see §5).

## 2. Results summary

| Battery | Cases | Crash-free | Behavior matches documented law | Findings produced |
|---|---|---|---|---|
| Story save (`parseSave`) | 28 | 28/28 | 25/28 (3 unbounded-value gaps) | FS-AUDIT-004 |
| World save (`parseWorldSave`) | 13 | 4/13 throw inside the module | 4/13 (law contradicted at module level; catch saves the boot) | FS-AUDIT-002, 003, 005 |
| Calendar growth | 4 | 4/4 bounded as designed | latent hazard confirmed | FS-AUDIT-005 |
| Album (`parseAlbum`) | 7 | 7/7 | 6/7 (mime prefix wider than writers) | FS-AUDIT-006 |
| Storage seams | 4 | 4/4 | wipe semantics proven | FS-AUDIT-001 (seam evidence) |
| **Total** | **56** | — | — | 6 finding-linked observations |

## 3. Independent verification (what the fresh verifiers did and found)

Per the reference methodology, every candidate went to fresh verifier agents that did not participate in the hunt, with instructions to **refute** — re-read every cited line, hunt for preventing layers (gates, tree-shaking, upstream catches, unreachable paths), and challenge severity. Phase 3 (candidate validation) and Phase 5 (final record verification) were merged into this single fresh pass per candidate — a disclosed quick-profile limitation (01 §6.4).

| Candidate | Verifier verdict | What the verifier changed/added |
|---|---|---|
| FS-AUDIT-001 | **Confirmed**, LOW upheld | Proved the negative space: no `import.meta.env` anywhere in `src`, the `navigator.webdriver` gate (Game.ts:394–401) only sets `driverBoot` (skips the film) and does **not** guard either driver import, `vite.config.ts` has no feature flags, and no `confirm()` exists in the codebase. |
| FS-AUDIT-002 | **Confirmed**, LOW upheld | Census-verified the only two callers of `parseWorldSave` both sit inside the `bootWorldBrain` try/catch; `main.ts:6–17` adds a second net; the browser itself writes only typed documents, so remote exploitability is nil. |
| FS-AUDIT-003 | **Confirmed**, INFORMATIONAL upheld | Confirmed the genesis re-derivation makes the audit self-referential, that `validateNpcs` never sees the player record, and that the D-3 money-bridge forward-risk framing matches `AGENTS.md:11` + the roadmap docs. |
| FS-AUDIT-004 | **Confirmed**, INFORMATIONAL upheld | Traced every `cart_name` sink safe (textContent ×3, canvas `fillText` ×2, postcard slice-to-14-chars); confirmed no save export/import feature exists; noted `Album.ts:77` rejects `cartName > 40`. |
| FS-AUDIT-005 | **Confirmed** as latent, INFORMATIONAL upheld | Exhaustive consumer census: no `.date`/`.season` reader on any clock; runtime clock reads are O(1) or capped (`advanceReal` ≤1440 ticks/call, `runtime.ts:346–359`); booting a huge-day world does not hang today. |
| FS-AUDIT-006 | **Confirmed** as hardening | Corrected one line reference (UI.ts:636); confirmed SVG-as-`<img>` executes no script and that re-share/download paths treat thumbs as opaque bytes. |
| FS-AUDIT-007 | **Confirmed** as hardening-only | Proved no save/URL value can reach the unescaped interpolations (`starterById` falls back to static `'classic'`; `?starter=` is registry-whitelisted). |
| FS-AUDIT-008 | **Confirmed** as hardening-only | Re-read the whole workflow; confirmed no second workflow file exists and no secrets are referenced. |

**Material corrections from verification:** none to verdicts or severities; one line-number correction (FS-AUDIT-006); several confirmatory sinks and caps added to the record.

## 4. Disproved hypotheses (challenged and rejected — kept so future audits do not repeat them)

| # | Original hypothesis | Why it failed |
|---|---|---|
| H1 | A malformed world save **bricks the boot** (uncaught throw in the `WorldRuntime` constructor) | `bootWorldBrain` (`sim/runtime.ts:637–646`) wraps `parseWorldSave` in try/catch → fresh world + note; `main.ts` adds an outer net. Downgraded to FS-AUDIT-002 (contract violation, not a crash). |
| H2 | `cart_name` from the save → **XSS** via dialogue/captions/postcards | Every sink is `textContent`, canvas `fillText`, or `escapeHtml`-wrapped; postcard art slices to 14 chars. |
| H3 | `map_notes`/`map_slang` save strings → **XSS** in the Map notebook | Notes render via `li.textContent`; slang renders from the static `SLANG_CARDS` lookup with `if (!card) continue;` and `escapeHtml` — save controls *which* card, never its text. |
| H4 | Save/URL `starter` string → **injection** into pick-card/wardrobe HTML | `starterById` falls back to the static registry; `isStarterId` whitelist-gates the param; pick-card tiles escape; wardrobe interpolations are static constants (FS-AUDIT-007 remains hardening-only). |
| H5 | Save parse enables **prototype pollution** with a gadget | Whitelist reconstruction builds a fresh object literal; `__proto__`/`constructor` keys are ignored (A22/A23). No recursive merge exists anywhere in `src/`. |
| H6 | Album/`javascript:` thumb URI → **executable sink** | Prefix validation rejects it (D2); `img.src` with `javascript:` is inert in modern browsers anyway; only `data:image/*` reaches `img.src` (D3 → hardening note only). |
| H7 | `calendarOf` hang reachable from the **story save's** `calendar_day` | Story-side values are clamped to [1, 36500] (`core/calendar.ts:76–79`) and `dateOfDayIndex` is bounded arithmetic. The world-clock variant has no consumer (FS-AUDIT-005 stays latent). |

## 5. Unresolved findings (needs-validation — deployment facts outside source; no severity assigned per methodology)

**NV-1 — Branch protection on `main` (affects FS-AUDIT-008's context).**
Blocker: whether `main` requires pull requests / restricts force-pushes is a repo-settings fact, not visible in source.
Why it matters: the Pages workflow deploys whatever lands on `main`; any writer who can push directly can ship arbitrary code to the deployed origin.
Owner-observed check: Repository → Settings → Branches → confirm `main` requires PR review + passing status checks and disallows force pushes. Resolution plan requires no traffic, only a settings read.

**NV-2 — Deployed response headers (CSP/X-Frame-Options) on the Pages origin.**
Blocker: response headers are observable only against the live origin, which this audit does not contact.
Why it matters: GitHub Pages sets no CSP for custom content; the game has no frame-sensitive or credentialed flow, so no finding is proposed — this is a hardening datum only.
Owner-observed check: `curl -sI https://<pages-url>/` and review headers. If absent, the CSP `<meta>` recommendation in 07 (P3) applies regardless of platform capability.

No other candidate remained unresolved: every hypothesis either survived verification as a finding (8) or was disproved with evidence (7). Nothing was silently promoted from suspicion to confirmation, and nothing was dropped.

## 6. Reproduction evidence index

| Artifact | Location (audit workspace) |
|---|---|
| Parser battery (50 cases) | `scripts/audit-fixtures/test_save_parsers.ts` → copied to deliverables as `docs/security-audit/evidence/test_save_parsers.ts` |
| Parser battery results | `evidence/RESULTS-save-parsers.txt` |
| Storage-seam test | `evidence/test_wipe_seam.ts` + `evidence/RESULTS-wipe-seam.txt` |
| npm audit output | preserved in 05 §1 and 06 §1.2 (zero-vulnerability JSON summary) |
| Verifier verdicts | 06 §3 table (full JSON verdicts in the audit session record) |

---

## 7. R2 reconciliation testing (v1.1 — current main @ `62a6244cee258a243fdb308bd78daf7793c62cc5`)

**Purpose.** Re-verify every finding against the actual current production modules and test the new WP-2v surface, per the owner's reconciliation assignment.

**Method.** The repository was re-synchronized read-only (anonymous HTTPS; the chat-pasted token was **not** used). `origin/main` was verified via `git ls-remote` (= `62a6244`, confirming the owner's revision and disproving reliance on the old baseline). Current-main inspection ran in a separate detached worktree; the developer's local checkout was preserved untouched. Production modules were exercised as disposable copies whose **only** modification is appending `.ts` to relative import specifiers — proven line-by-line in `evidence/IMPORT-PATH-DIFF-PROOF.txt` (13 files copied, **0 non-import line changes**); `Album.ts` was imported from the worktree unmodified (no relative imports). Node v24 native type-stripping; no dependency installed; no network used by the harness; bounded fixtures; nothing executed from any built bundle.

### 7.1 The R2 reconciliation battery — 35 cases (`evidence/RESULTS-reconciliation-62a6244.txt`)

| Group | Cases | What was re-proven at `62a6244` | Finding |
|---|---|---|---|
| R1 story save (`core/Save.ts`) | 6 | `money=1e15` accepted numeric+string; 1 MB `cart_name` verbatim (gaps stand); day clamp →4, `calendar_day` →36500, `__proto__` neutralization intact (regression walls) | FS-AUDIT-004 confirmed-current |
| R2 world save (`sim/state.ts`) | 8 | missing ledger/clock/player, `relationships:5`, `ledger.txns:5` all **still throw** inside the module; wrong-magic/version-99 still refuse to fresh; valid restore intact | FS-AUDIT-002 confirmed-current |
| R3 economic re-derivation | 1 | `moneyCents=1e12` → `restored`, **zero** integrity notes | FS-AUDIT-003 confirmed-current |
| R4 clock (`sim/clock.ts`) | 4 | world-save `clock.day=1e15` accepted; `new GameClock({day:1e15}).day=1e15` (unclamped); `calendarOf(1e7)` 0.43 ms (linear); weekday O(1) | FS-AUDIT-005 confirmed-current (latent) |
| R5 NEW surface (`sim/epochMap.ts`, WP-2v) | 11 | `simTickOfStoryDay(1)=460`, `(4)=4780`; **throws** on 0/NaN/1.5/36501/1e15; `datelineOfStoryDay(1)` = canon string; `epochAgreement()` agreed=true; tolerant read clamps `calendar_day` | **No new finding** — strict validation front door works |
| R6 album (`postcard/Album.ts`, in-place) | 4 | `svg+xml` thumb still accepted (gap stands); `javascript:` rejected; valid path and `cartName>40` cap intact | FS-AUDIT-006 confirmed-current |
| R7 wipe seam (`core/Save.ts`) | 2 | seeded day-4/$240 story save → `wipeSave()` → key removed, defaults restored (day=1, money=87) | FS-AUDIT-001 confirmed-current (seam) |

### 7.2 Static source checks executed alongside

- **Byte-identity proofs** (`git diff 7995e6e..origin/main` per file): `autotest.ts`, `scenario.ts`, `core/Save.ts`, `sim/state.ts`, `sim/runtime.ts`, `sim/clock.ts`, `postcard/Album.ts`, `ui/UI.ts`, `ui/Wardrobe.ts`, `index.html`, `deploy-pages.yml`, `package.json`, `package-lock.json` — **all 0 lines changed**.
- **Line-by-line review of the two changed production files**: `Game.ts` (+19/−2, pause wiring only — URL dispatch untouched, now `:469–471`/`:477–480`) and `worldRuntime.ts` (+7/−2, `onStoryDayBegin` delegation only — seams unchanged at `:86–95`/`:288–295`).
- **New-module sink sweep**: `epochMap.ts` + `pauseSet.ts` contain no `innerHTML`/storage/URL/`eval`/`fetch`/DOM patterns.
- **`onStoryDayBegin` caller trace**: sole caller `Game.ts:2611`; story day arrives parser-clamped ([1,4]); `advanceMinutes` sanity cap 14400 unchanged (`runtime.ts:364–371`) — the new `assertDay` throw is unreachable via the parser and is defense-in-depth, not a new failure path.
- **Phase 3 branch census**: `git ls-remote` (4 branches + 8 PR heads), all-refs commit/file searches — branch and any nav code absent (`evidence/BASELINE-VERIFICATION-R2.txt`).
- **`npm audit --package-lock-only`** at the current lockfile: 0 vulnerabilities (05 §4).

### 7.3 Tests NOT executed at the reconciled revision (transparency)

- The repository's own vitest suite (**777** `it`/`test` declarations in 58 files at `62a6244`, grep-counted; upstream added 3 test files) — `npm install` remains prohibited; CI runs it on every push.
- Any browser-execution test (build prohibited — unchanged limitation; the FS-AUDIT-001 browser chain remains seam-proven + source-traced, now at the current SHA).
- The 1e15-day `calendarOf` loop itself (bounded-test rule; growth re-measured at 1e7 instead).
- NV-1 (branch protection) / NV-2 (deployed headers) remain owner-observed checks.
- **Phase 3 audit** — blocked by non-existence, not by audit choice (03 §8.1); re-audit required when the branch is pushed.

### 7.4 Reconciliation verification outcomes

8/8 findings **confirmed-current**; 0 fixed upstream; 0 regressed; 0 disproved on re-check; 0 new findings; both NV items still open; none of the 7 disproved hypotheses re-opened (the only new production code is sink-free and strictly validating). Severity counts unchanged: **0 / 0 / 0 / 2 LOW / 6 INFORMATIONAL**. No release blocker at `62a6244`.

---

## 6. Remediation verification (v1.2 — R1 + R2, branch `fix/security-r1-r2`, 2026-11-07)

Every gate below was executed in the remediation sandbox against the branch's own tree and built output. Baseline before changes: `tsc` clean, **vitest 840/840** (57 files), build OK — re-run and recorded BEFORE any edit.

| Gate | Command | Result |
|---|---|---|
| TypeScript typecheck | `npx tsc --noEmit` | clean (exit 0) |
| Complete Vitest suite | `npx vitest run` | **892/892 (59 files)** — 840 baseline (unchanged) + 18 driver-gate + 34 world-save-validation |
| Production build | `npm run build` | OK (`dist/` built; the gated driver chunks still emit, see R1 residual note) |
| Production debug-driver regression | `node scripts/probe-security-r1.mjs` | **31/31** (`RESULTS-probe-security-r1.txt`) |
| Development debug-driver regression | D1/D2 of the same probe (authorized path) + `scripts/e2e.mjs` + `scripts/probe-world-sim.mjs` | pass (see below) |
| World-save parser regression | `tests/world-save-validation.test.ts` | **34/34** (incl. the verifier's N-1 replay-attack as a pinned case) |
| World-save recovery tests | the same file (bootWorldBrain cases) + `scripts/probe-security-r2.mjs` | **166/166** on real `dist/` (`RESULTS-probe-security-r2.txt`) |
| Save/load compatibility | baseline `tests/save.test.ts` + `tests/sim-state.test.ts` (incl. old-v1-JSON case) — all unchanged and green | pass |
| Registry and architecture gates | `tests/sim-registry.test.ts`, `tests/docs-hygiene.test.ts`, ownership-table test (all green in the suite) | pass |
| Four-day story simulation E2E | `node scripts/e2e.mjs` (built output, authorized driver) | executed — see `RESULTS-e2e-4day-r1-r2.txt` |
| Browser console + page errors | asserted by all three probes (pageerror + console capture) | zero page errors in every probe run |
| Ordinary gameplay confirmation | probe N1 (plain load: day-4 save resumes, `bootedFromDay=4`) + the full E2E | pass |

**Environment limits, stated honestly.** The sandbox renders under SwiftShader; the renderer crashes stochastically on repeated cold boots (observed `trap int3`, `/dev/shm` 64 MB, system-wide thread cap 925). The probes were architected around this (one WebGL boot for the 21-case battery via the production seam; cold-boot proofs kept to the minimum), and the E2E ran with the documented small-viewport setting (`E2E_W/E2E_H` — the driver is viewport-agnostic by design). No test above is reported passed that was not executed; none was skipped silently.

**Refutation-oriented checks the verifier should re-run:** the R1 probe's P-matrix (URL alone cannot trigger), the D-cases (authorized path boots the SANDBOX key), and the R2 probe's C11 (`__proto__`) + C12 (integrity) + B1/B2 (cold boot) cases.
