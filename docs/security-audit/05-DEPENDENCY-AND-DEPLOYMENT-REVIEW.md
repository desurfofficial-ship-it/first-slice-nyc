# 05 — Dependency and Deployment Review

**Originally audited revision:** `main` @ `7995e6ea2e371644a5347f93acc8bed948bf0e54` · Advisory data point-in-time: 2026-11-06
**Reconciled revision (R2):** `origin/main` @ `62a6244cee258a243fdb308bd78daf7793c62cc5` — advisory data re-queried 2026-11-06 (see §4)

---

## 1. Dependency assessment

### 1.1 Direct runtime dependencies (production)

| Package | Pinned | Latest (2026-11-06) | Delta | Known CVEs (`npm audit`) | Notes |
|---|---|---|---|---|---|
| `three` | `^0.186.1` | `0.187.0` | one minor behind | **0** | The only runtime-heavy dependency (WebGL/Loaders). Minor-version delta is maintenance, not security. |
| `yuka` | `^0.7.8` | `0.7.8` | current | **0** | Steering/agents library; consumed through a local ambient type shim (`src/types/yuka.d.ts`). |

### 1.2 Dev toolchain

`@types/three ^0.186.0`, `@types/node ^26.6.6`, `playwright ^1.64.1`, `typescript ^7.0.2` (current), `vite ^8.3.5` (latest 8.3.6 — one patch), `vitest ^5.0.5` (latest 5.1.0 — one minor). **0 known vulnerabilities** across the 92 dev entries.

### 1.3 Lockfile integrity (supply-chain provenance)

- `package-lock.json`: **lockfileVersion 3**, 95 entries, `npm ci` is the only install path (CI), so resolution is lockfile-deterministic.
- **Resolved URLs: 100% `https://registry.npmjs.org/`** — no mirrors, no private-registry fallback, no namespace-confusion surface (verified programmatically over every entry).
- **No git dependencies, no tarball/local file deps, no linked workspaces.**
- **Install-script census:** exactly one package carries a lifecycle script — `fsevents` (`hasInstallScript`), the standard optional macOS watcher dependency; benign and well-known.
- Caret ranges (`^`) exist in `package.json`, but the lockfile — not the manifest — is what `npm ci` installs; range loosening only matters on a deliberate lockfile regeneration. Recommendation (maintenance, not security): regenerate the lockfile only via reviewed, CI-gated changes.

### 1.4 Vendored runtime assets

- `web-three/public/vendor/basis/basis_transcoder.js` (57.5 KB) + `basis_transcoder.wasm` (527 KB): the stock emscripten-wrapped Binomial/Basis KTX2 transcoder that ships with three.js examples, vendored same-origin and loaded via `KTX2Loader.setTranscoderPath('vendor/basis/')` (`World.ts:3642–3644`). Integrity rides on the repo itself (same-origin, commit-reviewed). No integrity hash/subresource check is possible for worker/wasm-instantiated transcoders in this setup; the practical exposure equals repo-write access, which is the same trust level as the game source. **No finding.**
- `public/models/*.glb` (procedural-upgrade seam): loaded only from statically named paths; malformed/missing files degrade to the authored placeholder (`World.ts:3476–3520, 3660–3700`) — one `console.info`, no retry loop. **No finding.**

### 1.5 Verdict

The dependency surface is **clean and minimal**: two runtime packages, zero known CVEs, fully registry-provenanced, deterministic installs. Separate as required by the assignment: **confirmed vulnerabilities — none**; **outdated-package recommendations — three near-current minors/patches (three, vite, vitest)**; **general maintenance — none required**.

## 2. Build and deployment review

### 2.1 Workflow inventory

`.github/` contains exactly one workflow: `deploy-pages.yml` (verifier-confirmed — no other automation exists).

### 2.2 `deploy-pages.yml` finding-by-finding

| Aspect | Observation | Assessment |
|---|---|---|
| Triggers | `push → main` + `workflow_dispatch` only. **No `pull_request` / `pull_request_target`** — untrusted-fork code can never run in CI. | Strong positive control |
| Permissions | Top-level `contents: read`, `pages: write`, `id-token: write` — the minimum Pages OIDC set; no `pull-requests: write`, no packages, no secrets | Strong positive control |
| Secrets | **None referenced.** Deployment uses the Pages OIDC exchange (`id-token: write` + `deploy-pages@v4`), no PAT in CI | Strong positive control |
| Actions | All four are GitHub-first-party (`checkout@v4`, `setup-node@v4`, `upload-pages-artifact@v3`, `deploy-pages@v4`) pinned by **mutable major tags**, not SHAs | FS-AUDIT-008 (hardening) |
| Install | `npm ci` against `web-three/package-lock.json` with `cache-dependency-path` pinned to the same file | Strong positive control |
| Build gate | `npm run typecheck` + `npm test` (783 vitest cases) must pass before the artifact uploads | Strong positive control |
| Build flags | `vite build` with `base: './'` (relative — correct for project-pages subpaths), `sourcemap: false` (no source disclosure through the deployed bundle), es2022 target | Positive |
| Artifact | `web-three/dist` only — no repo metadata, `.git`, or docs ride to Pages | Positive |
| Concurrency | `group: github-pages`, `cancel-in-progress: true` — no deploy races | Positive |
| Runtime env vars | None consumed by the app (no `import.meta.env` usage in `src/` — verifier-confirmed) | Positive: no build-time secret-exposure surface |

### 2.3 Deployment boundary facts (outside source — see 06 §5)

Two facts this audit could not observe without contacting the live deployment or repo settings, both tracked as needs-validation items with exact owner checks:

- **NV-1 — Branch protection on `main`:** if `main` accepts direct pushes from any writer, that writer can deploy arbitrary code to the Pages origin with a single push (the workflow is the only deploy authority and is trigger-clean). Owner check: Settings → Branches → `main` protection rules (require PR + status checks; restrict force pushes).
- **NV-2 — Response headers on the Pages origin:** GitHub Pages does not let an owner set CSP/X-Frame-Options. The app renders only same-origin data and uses no frame-sensitive flows, so no finding is proposed; a `<meta http-equiv="Content-Security-Policy">` in `index.html` (see 07 P3) would add defense-in-depth regardless of platform headers. Owner check: `curl -sI https://<pages-url>/` and read the headers.

### 2.4 Untrusted pull-request handling

Not applicable by construction: the workflow never runs on pull-request events, and PRs from forks get no workflow context at all in this configuration.

### 2.5 Artifact integrity

Artifact identity is push→build→deploy within a single run; the deploy job consumes the uploaded artifact of `needs: build` (not a mutable name). No promotion/substitution surface exists. Cross-run artifact reuse is not possible in this topology.

## 3. Supply-chain concerns summary

1. **Confirmed:** none.
2. **Hardening:** SHA-pin the four first-party actions (FS-AUDIT-008).
3. **Maintenance:** keep the three near-current packages rolling at the next scheduled dependency touch.
4. **Watch item for the roadmap:** when the D-3 money bridge or any cloud feature lands, re-run this review — the dependency and deployment posture above is calibrated to a fully client-side product.

## 4. R2 reconciliation (current main @ 62a6244)

- **Dependency surface unchanged:** none of the 7 upstream commits touches `package.json`, `package-lock.json`, or `web-three/public/vendor/` (`git diff 7995e6e..62a6244` = 0 lines on all three). The §1 assessment carries over verbatim.
- **`npm audit` re-run at the current lockfile** (`npm audit --package-lock-only`, 2026-11-06): **0 vulnerabilities** (3 prod + 92 dev; total 94 entries; 0/0/0/0/0 across info/low/moderate/high/critical). Install-free; matches the baseline result.
- **Deployment surface unchanged:** `deploy-pages.yml` byte-identical (FS-AUDIT-008 stands as hardening); no new workflow files; CI still gates on typecheck + tests; the test suite at `62a6244` counts 777 `it`/`test` declarations in 58 files (grep-counted).
- **No new third-party code entered the tree.** The only additions are first-party modules (`sim/epochMap.ts`, `game/pauseSet.ts`) and a dev-only Playwright probe (`scripts/probe-pause-set.mjs`, never shipped).
