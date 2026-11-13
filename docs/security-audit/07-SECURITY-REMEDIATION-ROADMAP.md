# 07 — Security Remediation Roadmap

**Originally audited revision:** `main` @ `7995e6ea2e371644a5347f93acc8bed948bf0e54`
**Reconciled revision (R2):** `origin/main` @ `62a6244cee258a243fdb308bd78daf7793c62cc5` — all recommendations re-validated against the current source; line anchors updated below.
**Posture context:** no CRITICAL or HIGH findings exist. This roadmap is a prioritized, minimal-diff plan consistent with the project's own laws (small source changes at the last trusted decision point, each with a regression test). **Status update (v1.3, qa-full-spectrum wave, 2026-11-10): R1 and R2 re-proven on the integrated tree (the remediation now lives on the evolved main with the validator extended to the evolved schema). **R3, R4, R5 and R6 are CLOSED** this wave — each with its documented remediation and a regression test (records in 04; the merge also closed three merge-borne save-loss paths before they reached a player). **R7 remains OPEN** (CI SHA-pinning — deliberately not patched blind; needs verified upstream SHAs). FS-AUDIT-003 remains gated on the WP-4 re-audit, which is now unblocked (WP-4 merged).**

---

## P0 — Critical fixes

**None.** Nothing in the audited revision enables severe compromise, cross-principal data exposure, or code execution.

## P1 — High-priority fixes (do before the next public-facing push)

### R1. Gate the debug/E2E drivers away from untrusted links (FS-AUDIT-001 — LOW) — ✅ IMPLEMENTED (v1.2, `fix/security-r1-r2`)
- **Where:** `web-three/src/game/Game.ts:469–480` at `62a6244` (the two dynamic-import blocks; R2 anchors), `game/autotest.ts:439` (`wipeSave()`), `game/scenario.ts:97,186,194,210,213`.
- **Smallest effective change:** make both dispatches check a driver authorization signal a URL cannot forge. Preferred: `import.meta.env.DEV` short-circuit (dev-server-only drivers). If the probe fleet needs them on Pages, require an explicit, non-URL handshake the harness sets (e.g., `sessionStorage['fs_driver_authorized']='1'` written by the probe's own bootstrap step, checked before the dynamic import).
- **Also:** never mutate storage without consent inside drivers — wrap the `wipeSave()`/world-save mutations behind an authorization check even in authorized runs (drivers own their own keys, and should ask once).
- **Why P1:** it is the only finding where a *remote* attacker capability (one crafted link) destroys another person's data — even at LOW severity, it is one-click and silent.
- **Regression tests:** (a) unit — dispatch decision returns disabled when the authorization signal is absent; (b) CI string gate — built `dist/` assets must not contain `runAutotest`/`runScenario` references when built for production; (c) E2E — seeded day-3 save survives `?autotest=1` after the gate.

### R2. Make `parseWorldSave` honor its own degrade law (FS-AUDIT-002 — LOW) — ✅ IMPLEMENTED (v1.2, `fix/security-r1-r2`)
- **Where:** `web-three/src/sim/state.ts:214–292` (unchanged at `62a6244`; the R2 battery re-proved all five throws — the regression tests below now have current-SHA evidence).
- **Smallest effective change:** wrap the `hydrate` call in try/catch **inside** `parseWorldSave`, returning `{ world: createWorldState(), source: 'fresh', notes: [...] }` on throw; remove/quarantine the offending document while degrading. (The fuller fix — field-by-field section validation mirroring `core/Save.ts` — can follow; the catch first, so the module's contract stops depending on callers two files away.)
- **Why P1:** the "corrupt save is a fresh start, never a crash" law is the project's central persistence promise; today it holds only because of one catch block in a different module.
- **Regression test:** port audit battery B2–B7 + B13 into `tests/sim-state.test.ts` — every malformed-section document must yield `source === 'fresh'` with notes, never a throw.

## P2 — Medium/low-priority improvements

### R3. Bound the three unbounded save fields (FS-AUDIT-004 — INFORMATIONAL)
- `core/Save.ts:186` — clamp `cart_name` to the UI's own contract: `.slice(0, 24)` (or 40 to match the Album's rule — pick one and document it).
- `core/Save.ts:187, :195` — ceiling `money`/`day_start_money` (e.g., `Math.min(v, 999999)`).
- Regression: extend the `tests/save.test.ts` fuzz wall with the three oversized cases.
- Note: a `cart_name` longer than 40 currently *silently blocks album entries* (`Album.ts:77`) — the clamp also fixes that inconsistency.

### R4. Clamp `GameClock` day at the trust boundary (FS-AUDIT-005 — INFORMATIONAL, latent)
- `sim/clock.ts:148` — `this.day = Math.min(36500, Math.max(1, Math.floor(data?.day ?? 1)))`, mirroring `clampCalendarDay`.
- One line today removes an entire latent-hang class before any consumer of `.date`/`.season` ships. **R2 update:** WP-2v's `epochMap.ts` is strict but bounded — it protects only what routes *through it* (`assertDay` ≤ 36500); the `GameClock` constructor itself is still byte-identical and unclamped (battery R4.2 re-proven). The roadmap's WP-6 dateline surfaces are the expected first real consumer — they are safe **only if** they render through `epochMap` and never read `GameClock.day` directly. R4 kills the class regardless of which path WP-6 takes.
- Regression: `new GameClock({day: 1e15}).day === 36500`.

### R5. Tighten album thumb validation (FS-AUDIT-006 — INFORMATIONAL, hardening)
- `postcard/Album.ts:58–60` — `/^data:image\/(png|jpeg);/` (the two mimes the pipeline actually produces).
- Regression: svg+xml thumb rejected in `tests/album.test.ts`.

### R6. Normalize output encoding in the wardrobe lineup (FS-AUDIT-007 — hardening)
- `ui/Wardrobe.ts:259–263` — escape the three interpolations or build tiles with `textContent`, matching the codebase's own `escapeHtml` law.
- Regression: CI grep/ESLint gate forbidding unescaped `${` in `innerHTML` assignments across `src/ui/`.

### R7. SHA-pin the CI actions (FS-AUDIT-008 — hardening)
- `.github/workflows/deploy-pages.yml:26,29,50,63` — pin to full commit SHAs with version comments.
- Regression: workflow-lint step rejecting non-SHA `uses:`.

## P3 — Preventive controls (no finding; cheap future-proofing)

1. **CSP `<meta>` in `index.html`** — e.g. `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'none'`. The game makes no network requests (connect-src 'none' is a true statement today) and would gain a hard backstop against any future injection class. Verify against the actual asset set before shipping.
2. **A save-schema test contract** — one test that snapshots the parser's output for a canonical malformed-input corpus (the audit battery is a ready-made corpus; see `evidence/`). Future field additions update one fixture, and the "never a crash" law is enforced mechanically in CI.
3. **Secrets hygiene in CI** — add `gitleaks`/`trufflehog` as a CI step (the repo is currently clean at HEAD; this keeps it so as agent-driven development scales).
4. **Keep `npm audit` in CI** — a 5-second `npm audit --omit=dev` (or full) gate turns today's clean result into a durable control.

## Regression-test package (from this audit, ready to port)

| Audit case | Port to | Asserts |
|---|---|---|
| A1–A28 | `tests/save.test.ts` fuzz wall | corrupt/wrong-typed/oversized/`__proto__`/Infinity inputs → valid save, bounded fields |
| B1–B13 | new `tests/sim-state-parse.test.ts` | magic/version/worldId refusals + per-section degrade, never a throw |
| C1–C4 | `tests/sim-clock.test.ts` | clock day clamp; calendarOf bounded |
| D1–D7 | `tests/album.test.ts` | thumb/caption/day validation walls |
| E1–E3 | `tests/save.test.ts` | wipe/write semantics incl. refused-store false |
| FS-AUDIT-001 gate tests | CI + E2E | drivers unreachable/unauthorized in production builds; seeded save survives |

## Follow-up audit requirements

1. **After R1 lands:** ✅ done (v1.2) — the probe fleet works through the documented session-storage handshake against real built output (`probe-security-r1.mjs` D-cases, e2e.mjs, probe-world-sim.mjs). NOTE: the implementation gates at runtime instead of excluding the driver chunks at build time (the fleet tests built output, so a DEV-only build would break it); the bundle string-gate is therefore NOT applicable — the residual note lives in the FS-AUDIT-001 remediation record (04).
2. **Before the D-3 money bridge merges:** re-audit the world-restore → economy path (FS-AUDIT-003 becomes the headline risk the moment world state feeds anything shared); require the restored-economics validation (ledger transactions as trusted input, balances recomputed, plausibility caps). **R2 status:** the bridge (WP-4) is scheduled as the next work item after A-1 in the current plan — this re-audit is now imminent, not hypothetical.
3. **Before any online/shared feature (cloud saves, leaderboards, trading):** a full audit refresh is mandatory — the entire threat model in 01 §4 is calibrated to client-only.
4. **Resolve NV-1/NV-2** (branch protection; response headers) — owner-observed checks in 06 §5.
5. **Cadence:** re-run this audit (or a scoped diff-audit) at each epic boundary; the coverage ledger in 03 (including its §8 per-branch matrix) is the baseline to diff against.
6. **When the Phase 3 branch (`feat/phase-3-navigation-building-access`) is actually pushed** (verified absent from the repository at R2 — no `src/sim/nav/` exists in any ref): audit as new trust surfaces its navigation-graph construction from registry geometry, A* pathfinding and route caching (resource-exhaustion review: unbounded graph/repeat queries), door-access and building-entry state transitions, RouteFollower/NPC runtime integration, the browser scenario/navigation probes, and any new persistence/URL/input surface — with specific attention to malformed registry data, invalid entity references, and assumptions of trusted world data (the assignment's Phase 3 checklist, carried forward verbatim).
