# 08 — Executive Security Summary

**For:** the FIRST SLICE owner
**Originally audited revision:** `main` @ `7995e6ea2e371644a5347f93acc8bed948bf0e54` (2026-11-06)
**Reconciled revision (R2, v1.1):** `origin/main` @ `62a6244cee258a243fdb308bd78daf7793c62cc5` (verified via `git ls-remote`, 2026-11-06 — the audit baseline was 7 commits behind)
**Methodology:** Cloudflare `security-audit-skill`, adapted to a client-side browser game (see 01 §2)
**Auditor posture:** advisory only. No source, workflow, manifest, or repository setting was changed. Nothing was pushed or merged. The GitHub token pasted into the assignment chat was **not used, stored, or recorded** (the repository is public); see the hygiene note at the end.

> **UPDATE — v1.2 remediation (2026-11-07, branch `fix/security-r1-r2`).** The owner assigned the first two remediations. Both are implemented, regression-tested, and independently challenged: **FS-AUDIT-001 FIXED** (the debug drivers now live behind an explicit development/production boundary — a URL alone can no longer trigger destructive save operations — and authorized driver sessions run in a storage sandbox: story, world, AND album ride driver keys, so a real player's save data is unreachable by construction) and **FS-AUDIT-002 FIXED** (`parseWorldSave` validates and whitelist-rebuilds the complete document before hydration; a post-hydration integrity failure refuses the document; refused documents are quarantined, not destroyed, so the repeat-reset loop ends; recovery never touches the story save). Verdicts: the independent refutation-oriented reviewer returned **HOLDS for both**; its follow-up findings (N-1 ledger-replay gate, N-2 album sandbox, N-3 quarantine namespace) were fixed in the same branch and pinned by tests. Gates on the branch: tsc clean · vitest **892/892** (59 files; the 840 baseline unchanged) · build OK · probe-security-r1 **31/31** · probe-security-r2 **166/166** · probe-world-sim **15/15** · 4-day story E2E **0 failures** (133 driver checks, 413 s, console clean). R3–R7 remain OPEN. No merge or push has occurred — the branch awaits owner review. Details: 04 (remediation records), 06 §6 (executed gates), REVISION-HISTORY (v1.2).

---

## R2 reconciliation result (current main @ `62a6244`)

**The audit's conclusions hold at the current revision — every one of the 8 findings was re-confirmed against the actual current source and re-proven dynamically; nothing was fixed upstream, nothing regressed, nothing was disproved on re-check, and no new finding was raised.** Severity counts are unchanged: **0 CRITICAL · 0 HIGH · 0 MEDIUM · 2 LOW · 6 INFORMATIONAL. No release blocker.**

Key reconciliation facts:

- **Actual repository state (verified, not assumed):** `origin/main` = `62a6244` (7 commits / 12 files ahead of the audited baseline). The only production-source changes are `sim/epochMap.ts` (new, WP-2v epoch mapping), `game/pauseSet.ts` (new, WP-1v pause set), and narrow edits to `Game.ts` (pause wiring) and `worldRuntime.ts` (`onStoryDayBegin` delegation). Manifest, lockfile, and CI workflow untouched; `npm audit` re-run clean (0 vulnerabilities).
- **Phase 3 (`feat/phase-3-navigation-building-access`) does not exist in the repository** — not as a branch, PR, or any commit/ref in history; no `src/sim/nav/` anywhere; the project's own docs mark Phase 3 "not started (queued next)" with A-1 gated on your authorization. There was nothing to audit; the Phase 3 audit checklist is carried forward in 07 §Follow-up (item 6) for when the branch is pushed.
- **Unmerged development branches** (`feat/player-upgrade`, PR heads 3/4/6/7/8) were surveyed: no trust-boundary surface in any added line (input/camera/UI fixes and docs only). Re-audit each on merge.
- **New module verdict:** `epochMap.ts` is *hardening-positive* — a strict validation front door (throws on 0/NaN/fractions/over-ceiling days; proven by 11 new dynamic cases) that does **not** become the unbounded calendar consumer FS-AUDIT-005 warned about. **Watch item:** WP-6 dateline surfaces must render through `epochMap`, not read `GameClock.day` directly (07 R4 updated).

---

## Overall security posture: GOOD for its class — with two small, specific fixes recommended

FIRST SLICE is a client-only game with an unusually disciplined defensive core: **no network calls at all**, no code-execution sinks anywhere in the shipped source, whitelist-validated save parsers, a quarantining album parser, a validating economy ledger, a clean supply chain (zero known vulnerabilities, fully registry-provenanced), and a CI/CD workflow with no secrets, no untrusted-PR surface, and tests gating every deploy. The threat model is small — and what little attack surface exists was examined at evidence depth.

## Confirmed vulnerabilities (all re-confirmed at `62a6244` — none fixed upstream)

| ID | Severity | One-line summary |
|---|---|---|
| FS-AUDIT-001 | LOW | A malicious link (`/?autotest=1` or `/?scenario=x`) wipes or overwrites the victim's local save data — the debug/E2E drivers are reachable in production and mutate storage without confirmation. |
| FS-AUDIT-002 | LOW | The world-save parser throws on shape-broken saves, contradicting the project's own "corrupt save is a fresh start, never a crash" law; a single catch block in a different module is all that prevents a boot crash today. |

Plus **6 INFORMATIONAL** findings (unbounded `cart_name`/`money` save fields; an unbounded clock-day that is a latent hang hazard; economic truth re-derived from the save document — relevant only when the D-3 money bridge lands; and three hardening notes: svg-thumb mime width, one unescaped-innerHTML pattern over static constants, major-tag CI pinning). Full detail in 04; machine-readable in `findings.json`.

**What was checked and came back clean:** XSS/DOM-injection across every rendering sink; prototype pollution; asset/path manipulation (all paths static, same-origin, placeholder-degrading); secrets (none tracked); dependency CVEs (none known); CI untrusted-code paths (none exist); network exposure (the game makes none).

## Highest risks (ordered)

1. **The one-click link** (FS-AUDIT-001): trivially exploitable, silent, destroys player progress — the only remote-attacker vector found in the entire codebase.
2. **The fragile persistence law** (FS-AUDIT-002): safety-by-caller rather than safety-by-parser — one refactor away from a boot-crash regression.
3. **Roadwatch — the money bridge** (FS-AUDIT-003): harmless single-player cheating today; a money-printing trust-boundary failure the day world state feeds anything shared. Re-audit before D-3 merges.

## Important audit gaps (honest limits)

- **No browser execution**: dependency installation and builds were out of scope, so driver paths were verified by exact source trace + storage-seam proofs, not by driving a live tab; the repository's own vitest suite was not run by the auditor (CI runs it; **777** `it`/`test` declarations in 58 files counted at `62a6244`).
- **Two deployment facts unobserved** (owner checks, no severity): branch protection on `main` (NV-1) and response headers on the Pages origin (NV-2) — still open after R2.
- **Coverage is per-revision:** baseline coverage was 17/17 subsystems inspected, 6/17 dynamic; the R2 reconciliation re-verified current main at delta depth (all 17 re-examined via byte-identity proofs + the 12-file delta reviewed line-by-line; 5 units re-tested dynamically; 35-case battery). Full per-branch matrix in 03 §8 — inspection ≠ 100% security coverage.

## Is the current revision suitable for continued development?

**Yes.** Nothing found blocks ongoing development on the current architecture. The persistence laws, registry patterns, and test culture are assets — the gaps are small, localized, and well-understood.

## Should anything block a release?

**No release blocker exists.** For a public push, R1 (driver gate) and R2 (parser-level degrade) in 07 are the two changes worth making first — both are small, both come with ready-to-port regression tests, and both close the only findings with any user-facing failure mode.

## Recommended next actions

1. **Authorize** the P1 fixes (R1, R2) from `07-SECURITY-REMEDIATION-ROADMAP.md` — then implement via the normal agent workflow; the auditor takes no fix action without explicit owner authorization. Both were re-validated against `62a6244` and remain OPEN (0 fixed upstream).
2. **Port the regression-test package** (07 §Regression-test package) — the audit's 56-case baseline battery plus the 35-case R2 battery are ready-made fuzz walls for the parsers, now with current-SHA evidence.
3. **Answer NV-1/NV-2** (two settings/header checks, 06 §5).
4. **Book a scoped re-audit before WP-4 (the D-3 money→ledger bridge) merges** — the current plan schedules it next after A-1; FS-AUDIT-003 becomes the headline risk the moment world state feeds anything shared.
5. **When the Phase 3 branch is pushed**, commission its audit (07 §Follow-up item 6 — the assignment checklist is archived there); it does not exist today.
6. **Publishing this package:** the deliverables were updated in the auditor's workspace only. The assignment forbade pushes/merges, so nothing was pushed to any branch, and the chat-pasted token was not used; commit/push the `docs/security-audit/` package with an explicit owner instruction through a secure credential channel (never chat).
7. **Hygiene note (outside the audited code):** a GitHub access token was again included in the reconciliation request message. It was **not used, stored, or recorded** by this audit (the repository is public). Best practice: **revoke/rotate it now** — it has transited chat in plaintext, and any credential pasted into chat must be treated as compromised.

---

*A clean audit does not mean the game is guaranteed secure. It means the defined scope was examined, findings were assessed against evidence, and remaining uncertainty was disclosed — all of which is documented in 01–07 and `findings.json`.*
