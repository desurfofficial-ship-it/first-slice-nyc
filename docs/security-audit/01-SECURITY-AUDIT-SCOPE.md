# 01 — Security Audit Scope

**Project:** FIRST SLICE: A New York Story (`first-slice-nyc`)
**Audit role:** Independent Application Security Auditor (advisory only — no code changes)
**Methodology reference:** Cloudflare `security-audit-skill` (studied in full: `SKILL.md`, `RECONNAISSANCE.md`, `HUNTING.md`, `VALIDATION-AND-REPORTING.md`, `ATTACK-CLASSES.md`, `CLIENT-SIDE.md`, `DATA-ISOLATION-AND-LIFECYCLE.md`, `SUPPLY-CHAIN-AND-RELEASE.md`, `RESOURCE-EXHAUSTION-AND-AVAILABILITY.md`)
**Audit date:** 2026-11-06 (UTC)

---

## 1. Audit objectives

1. Establish what is **genuinely secure**, what is **genuinely vulnerable**, and what **remains uncertain** in the audited revision.
2. Discover and verify security weaknesses across the seven assigned areas (A–G): save/persistence, browser/client-side, asset loading, dependencies/supply chain, build/deployment, simulation trust boundaries, and performance-related abuse.
3. Document evidence at the strength the Cloudflare methodology demands: every finding carries a complete source trace, a stated trust boundary, a concrete threat model, and — for `confirmed` findings — bounded local evidence produced against the **actual production code**.
4. Separate confirmed, disproved, and unresolved findings, and make every audit gap visible in the coverage ledger (03).
5. Deliver actionable, prioritized remediation (07) without modifying any production source.

## 2. Methodology (how the Cloudflare skill was adapted)

The reference skill's workflow was adapted to a client-side browser game with no server, no accounts, and no multi-tenant data. Adaptations made — and the reasoning — are recorded here so the process is auditable itself.

| Cloudflare skill stage | Adaptation for FIRST SLICE |
|---|---|
| Reconnaissance (Phase 1, 4 parallel agents) | Performed by the auditor directly: full source map (572 tracked files; 71 `web-three/src` modules), git baseline, sink sweep (`innerHTML`, `eval`, storage, URL, `postMessage`, `fetch`, workers), trust-boundary mapping. |
| Coverage ledger with canonical refs | The ledger (03) uses the assignment's status vocabulary (NOT STARTED → VERIFIED / BLOCKED / NOT APPLICABLE) with per-subsystem files-inspected, tests-run, gaps, and reasons. The skill's invariant is preserved: **the ledger is the coverage claim**; no unit is VERIFIED on source inspection alone. |
| Hunting waves + attack-class companions | The selected companions were CLIENT-SIDE (DOM XSS, prototype pollution, browser storage), DATA-ISOLATION-AND-LIFECYCLE (save restore / import-restore classes), SUPPLY-CHAIN-AND-RELEASE (dependency resolution, CI), and RESOURCE-EXHAUSTION (parsing amplification, reachable fatal paths). WEB-PROTOCOL-AND-AUTH, MEMORY-SAFETY, PROTOCOLS-RPC, DESKTOP-MOBILE, AI-AND-LLM were **excluded with reasons** (no server, no native code, no RPC/queue layer, no webview bridge, no model integration). |
| Candidate gate | Every candidate needed: named lower-trust principal, accepted input, intended control, crossed boundary, affected resource, and observed result. Missing-best-practice observations without an affected principal were recorded as hardening notes, not findings. |
| Bounded local evidence | Executed as an isolated Node harness running the **actual production parser modules** (disposable copies, unmodified logic, Node native type-stripping — no dependency installation, no network, no game boot). 50 test cases + 4 seam checks (see 06). |
| Independent verification (Phases 3 + 5) | Two fresh verifier agents that did not participate in the hunt were instructed to **refute** each candidate from source. Both phases were merged into one fresh-verifier pass per candidate (the skill's `quick`-profile merge); this is disclosed as a profile limitation. Verifier verdicts: 8/8 candidates confirmed, severities upheld, minor line-drift corrections applied. |
| Structured output + validators | `findings.json` (machine-readable, schema below); the skill's `REPORT.md`/`FINDINGS-DETAIL.md`/`NEEDS-VALIDATION.md` roles are distributed across documents 04, 06, and 08 per the assignment's deliverable list. |

**Findings schema (findings.json):** `{ id, title, severity, confidence, status (confirmed | disproved | needs_validation), affected_files[{path, lines}], subsystem, vulnerability_class, threat_model, description, evidence[], impact, exploitability, remediation, regression_test, verification }` — plus a `disproved_hypotheses[]` array and `needs_validation[]` records (no severity, exact blockers + owner-observed resolution plans).

## 3. Exact repository revision audited

| Field | Value |
|---|---|
| Remote | `https://github.com/desurfofficial-ship-it/first-slice-nyc.git` |
| Branch | `main` (in sync with `origin/main` at clone time) |
| Commit SHA | **`7995e6ea2e371644a5347f93acc8bed948bf0e54`** |
| Commit subject | `docs(production): WP-0 evidence recorded — register v1.2.1 (gates executed), worklog entries; DEF-3 resolved, branch-drift risk closed` |
| Commit date | 2026-11-06 04:29:09 +0000 |
| Working tree | Clean at clone (`git status --short` empty); audit performed on a read-only clone; no file in the repository was created, modified, or deleted by the auditor |
| Other active branches | `origin/feat/player-upgrade`, `origin/feat/world-contract-foundation`, `origin/feat/wp-2v-epoch-map` (not audited — out of scope) |
| Tags | None |

All file/line references in the deliverables refer to this SHA. Line numbers are pinned against it; if source moves, re-locate by the quoted identifiers.

## 4. Threat model

**Product:** single-player, client-only browser game (TypeScript + Three.js + Vite) served as static files from GitHub Pages. No backend, no accounts, no network calls from game code, no multi-user data.

**Principals and trust boundaries (complete list):**

| # | Boundary | Lower-trust side | Higher-trust side |
|---|---|---|---|
| B1 | URL → game | Query parameters (`autotest`, `scenario`, `worldclock`, `starter`, `fx`, `film`, `pickcard`, `probe`, `walklog`) delivered by **any link the player clicks** | Game boot logic (`web-three/src/game/Game.ts`, `autotest.ts`, `scenario.ts`) |
| B2 | localStorage → game state | `first_slice_save_v1` (story), `first_slice_world_v1` (world sim), `first_slice_album` (postcards), `first_slice_muted` — editable by the user or any same-origin script | Parsers (`core/Save.ts`, `sim/state.ts`, `postcard/Album.ts`) and every subsystem that consumes restored state |
| B3 | Same-origin assets → renderer | Static assets committed to the repo (`public/models/*.glb`, `public/vendor/basis/*`) | THREE.js loaders (`World.ts` GLB seams) |
| B4 | Dependencies → bundle | npm registry packages resolved at build time (`three`, `yuka`, dev toolchain) | `package-lock.json` + CI build |
| B5 | CI inputs → Pages deploy | Pushes to `main` by repo writers | `.github/workflows/deploy-pages.yml` |

**Explicitly out of threat model (per the assignment's rule):** a player cheating in their own single-player game (editing their own localStorage) is not a security vulnerability. Where such edits expose *design* weaknesses (e.g., state that would become trust-critical if shared or server-backed), they are recorded as INFORMATIONAL with the future-facing caveat.

**Attacker capabilities considered:** malicious link to the deployed origin (B1); hand-crafted or third-party-tool-edited save data (B2); malicious/compromised dependency or CI tag (B4/B5); malicious contributor (B5). No authenticated-attacker or network-attacker classes apply (no endpoints exist).

## 5. Scope

**In scope:** everything under `web-three/` (source, tests, config, lockfile, vendored runtime assets), `.github/workflows/`, repo hygiene affecting security (`.gitignore`, secrets presence), and the deployment path to GitHub Pages.

**Out of scope (exclusions):**

- Gameplay, narrative, simulation, and architecture redesign (assignment rule 1–2).
- Any change to source, manifests, lockfiles, or workflows (rules 1–4) — audit only.
- `origin/feat/*` branches and git history beyond the audited SHA (baseline survey only).
- `tools3d/` and `scripts/` offline development tooling — inspected for secrets/hygiene, not operationally audited (never shipped to players).
- Live probing of the deployed GitHub Pages site (methodology rule: no deployed-endpoint contact; header/branch-protection facts recorded as needs-validation for the owner, see 06 §5).
- The pre-reboot docs tree (`docs/01–56` historical numbering) — treated as context, not audited artifacts.

## 6. Tools and execution limitations

**Tools used:** `git` (read-only clone, log/branch survey), `grep`/pattern sweeps over `src/`, Node.js v24.22.2 with native type-stripping (isolated harness over disposable copies of `core/Save.ts`, `core/fieldDiary.ts`, `core/calendar.ts`, `sim/state.ts`, `sim/clock.ts`, `sim/rng.ts`, `sim/entities.ts`, `sim/ids.ts`, `sim/economy.ts`, `sim/narrative.ts`, and the in-place `postcard/Album.ts`), `npm audit --package-lock-only` (registry advisory query; installs nothing), lockfile structural analysis, and two independent LLM verifier agents for Phase 3/5.

**Limitations — disclosed, none silent:**

1. **No OS-enforced execution sandbox to the skill's full specification** (no network-isolation namespace, empty-enforcement, or cgroup resource controls available in the audit environment). Mitigation: dynamic testing was restricted to pure, offline, dependency-free parser modules with bounded fixtures and hard timeouts (`timeout`, `--max-old-space-size=512`). No target-controlled process touched the network or the filesystem beyond its scratch directory. Nothing was executed from the built bundle.
2. **No browser execution / no production build.** Installing dependencies or building was prohibited (assignment rule 3; skill execution-safety rule). Consequences: (a) the `?autotest` / `?scenario` destructive paths were verified by exact source trace, not by driving a browser; the harness did prove the exact `wipeSave()`/`writeSave()` storage effects those paths invoke; (b) the existing 783-case vitest suite was **not** executed in the audit environment (CI runs it on every push to `main`); (c) CSP/response-header behavior of the deployed site was not observed.
3. **npm advisory data is point-in-time** (2026-11-06) and covers known CVEs only.
4. **Verification profile:** Phase 3 and Phase 5 were merged (one fresh verifier pass per candidate) per the skill's quick-profile allowance; two verifiers split eight candidates. Every verifier was instructed to refute, and one material correction (UI.ts line drift for `img.src = e.thumb`) plus several confirmatory sinks were incorporated.
5. **Single-pass coverage.** No prior coverage ledger existed for this repository; this run is the first. A clean result does not mean the game is guaranteed secure — it means the defined scope was examined, findings were assessed against evidence, and remaining uncertainty is disclosed (06 §5).

---

## 7. R2 reconciliation scope (v1.1, 2026-11-06)

The owner commissioned a reconciliation of this audit against the **actual current repository state**, with three additions: verify every finding at current HEAD, audit the `feat/phase-3-navigation-building-access` branch, and review post-baseline integration boundaries.

**Reconciled revision (verified, not assumed).** `git ls-remote` against the origin (anonymous HTTPS — authoritative server ref listing) returns **`origin/main` = `62a6244cee258a243fdb308bd78daf7793c62cc5`**, matching the owner-confirmed revision and **not** this audit's original baseline `7995e6e` (7 commits behind). The local checkout (`main` @ `7995e6e`, working tree content-identical to HEAD with 572 mode-bit-only entries) was **preserved untouched**; current-`main` inspection ran in a separate read-only detached worktree. Full facts: `evidence/BASELINE-VERIFICATION-R2.txt`.

**Reconciliation additions to scope:**

- **The 7-commit upstream delta** (12 files: `sim/epochMap.ts`, `game/pauseSet.ts`, `game/Game.ts`, `game/worldRuntime.ts`, `probe-pause-set.mjs`, 3 test files, 5 docs/worklog files) — reviewed line-by-line; `package.json`/`package-lock.json`/`deploy-pages.yml` verified untouched.
- **Phase 3 branch audit** — closed NOT APPLICABLE with evidence: the branch does not exist on the remote (4 branches + 8 PR heads listed), no nav/building-access code exists in any ref, and the docs at `62a6244` mark Phase 3 "not started (queued next)", with A-1 gated on owner authorization.
- **Unmerged development branches** (`feat/player-upgrade` @ 0530ebc, PR heads 3/4/6/7/8) — surveyed at diff level with a trust-surface scan of every added line (all clean); not full audits (pre-baseline forks — re-audit on merge).
- **New integration boundaries** — `epochMap.ts` (persisted-day mapping), `pauseSet.ts` (host pause decision), `onStoryDayBegin` delegation, save/hydration paths at current main.
- **Dynamic re-verification** — 35-case battery re-run against the actual production modules at `62a6244` (06 §7).

**Reconciliation execution policy (same rules, honored):** anonymous read-only git access only — **the GitHub token pasted into the assignment chat was not used, stored, or recorded** (the repository is public; the token should be revoked/rotted since it transited chat in plaintext). No repository file was created, modified, merged, or pushed by the auditor; no dependency was installed; no deployed endpoint was contacted. Deliverables were updated in the auditor's own workspace only.
