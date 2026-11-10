# 02 — Architecture and Attack Surface

**Audited revision:** `main` @ `7995e6ea2e371644a5347f93acc8bed948bf0e54` (2026-11-06). All paths repository-relative; all line numbers pinned to this SHA.

---

## 1. Actual application architecture (as inspected, not as documented)

FIRST SLICE is a **client-only** browser life-sim: TypeScript + Three.js + Vite, built to static files and served from GitHub Pages. There is no server, no API, no accounts, no telemetry, and no runtime network access from game code (verified: zero `fetch`/`XMLHttpRequest`/WebSocket/`Worker` usage in `web-three/src/`). Two state layers coexist by explicit law:

- **Story layer** — `web-three/src/core/GameState.ts`: the four-day narrative state machine (steps, money, flags, counters, Map notebook, field diary). Persisted to localStorage key `first_slice_save_v1`.
- **World layer** — `web-three/src/sim/*` (pure "brain": clock, schedules, arbitration, economy ledger, narrative flags) + `web-three/src/game/worldRuntime.ts` ("body": THREE.js rigs, storage, the frame valve). Persisted to `first_slice_world_v1`.

**Boot path:** `index.html` → `src/main.ts` (try/catch → error banner) → `Game` constructor (`src/game/Game.ts`) → renderer → `WorldRuntime` (reads world save) → `loadSave()` (reads story save) → day boot / arrival cinematic → per-frame `Game.frame()` loop driving player, camera, world sim valve (D-1), interactions, and UI.

**Rendering/DOM model:** one WebGL canvas + a static HTML overlay (`index.html`, 100 fixed element ids, verified by count). `src/ui/UI.ts` is the only DOM writer, plus `src/ui/Wardrobe.ts` and `src/ui/sketch.ts`. Audio is fully synthesized WebAudio (`src/game/audio.ts`) — no audio assets, autoplay-unlocked on first gesture.

## 2. Entry points and trust boundaries

| Boundary | Entry point | Reaches | Strongest source-visible control |
|---|---|---|---|
| B1 URL params | `location.search` reads in `Game.ts` (207, 349–350, 379–384, 393–401, 468–480) and `autotest.ts` (52) | Renderer settings (`fx`), sim clock speed (`worldclock`), starter selection (`starter`), driver boot (`autotest`, `probe`, `film`, `pickcard`), E2E + scenario drivers (`autotest`, `scenario`, `walklog`) | Exact-match/whitelist for `fx`/`starter`; clamp 1–1440 for `worldclock`; **no gate at all** for `autotest`/`scenario` (finding FS-AUDIT-001) |
| B2 story save | `Save.parseSave()` (`core/Save.ts:155–226`) via `loadSave()` | Whole story state machine + UI | Whitelist reconstruction: every field named, typed, clamped (`day`→[1,4], counters→[0,999], `lunch_served`→[0,3], `calendar_day`→[1,36500] via `core/calendar.ts:76–79`, strings filtered ≤200 chars, lists capped). JSON.parse in try/catch. No recursive merge → no prototype pollution. Gaps: `cart_name`/`money`/`day_start_money` unbounded (FS-AUDIT-004) |
| B2 world save | `parseWorldSave()` (`sim/state.ts:265–292`) via `bootWorldBrain()` (`sim/runtime.ts:626–646`) | Whole world sim | Magic/version/worldId refusal + **boot-seam try/catch** → fresh world + note. Section shapes **unvalidated** before cast (`hydrate()` 214–259) → throws are possible and only survive because of the outer catch (FS-AUDIT-002); doc-derived balances restore unchecked (FS-AUDIT-003) |
| B2 album | `parseAlbum()` (`postcard/Album.ts:63–88`) via `loadAlbum()` | Album shelf UI + re-share | Field-by-field wall: id ≤64, day 1–999 int, kind enum, caption ≤400, cartName ≤40, thumb `data:image/` + ≤200 KB, keptAt finite, dedup by id, cap 24, corrupted → empty. Gap: prefix admits `data:image/svg+xml` (FS-AUDIT-006, non-exploitable) |
| B3 assets | `GLTFLoader.loadAsync(new URL('models/…', document.baseURI))` (`World.ts:3486–3490, 3640–3667`) | Scene graph visuals | Paths built **only** from static registry ids; missing/malformed file → keep procedural placeholder, one `console.info`, no retry loop |
| B4 deps | `npm ci` in CI against `package-lock.json` | Production bundle (`three`, `yuka`) + dev toolchain | Lockfile v3, 100% `registry.npmjs.org` resolved, no git/tarball deps, only `fsevents` carries an install script (well-known optional macOS dep) |
| B5 CI | push to `main` / `workflow_dispatch` | Pages deployment | Scoped permissions (`contents:read`, `pages:write`, `id-token:write`), no secrets, tests gate the build; first-party actions pinned by major tag (hardening note FS-AUDIT-008) |

**No other entry surfaces exist:** no `postMessage` handlers, no service workers, no IndexedDB, no cookies, no deep links, no webview bridges, no dynamic `import()` of anything not statically written, no `eval`/`new Function`/string-timers anywhere in `src/`.

## 3. Browser-facing surfaces (complete)

1. **HUD/panels** (`UI.ts`): objective, notes, money, timer, prompt, order card, Map notebook, starter pick, album grid, postcard panel, wardrobe, pocket menu, error banner, cinematic box.
2. **Debug/test handles** exposed on `window`: `__game` (Game.ts:464), `__AUTOTEST__`/`__AUTOTEST_SUMMARY__` (autotest.ts:27–30), `__SCENARIO_REPORT__` (scenario.ts:258), plus an injected autotest log `<pre>` element. Reachable from devtools by anyone (self-impact) and programmatic by the drivers.
3. **Share/download** (`PostcardCapture.ts`): canvas→PNG data URL → `navigator.share` (File) or `<a download>`; capability-gated by `canShareFiles()`.
4. **WebAudio graph** (`audio.ts`) and two one-time gesture listeners.
5. **Input**: keyboard/pointer listeners (`engine/Input.ts`, passive unless capture needed); no gamepad APIs.

## 4. Persistence boundaries

| Key | Writer(s) | Reader(s) | Law |
|---|---|---|---|
| `first_slice_save_v1` | `writeSave` via `Game.persist()` (day ≥ 2 only — `GameState.snapshotForSave()` returns `null` for day 1, Game.ts:2709–2713), roam toggle, starter apply, wardrobe new-game (`newGameSave`) | `loadSave` at boot, roam toggle | "A corrupt or unreadable save is a fresh start, never a crash" (Save.ts header) — **enforced in the parser** (harness-proven, 06 §2) |
| `first_slice_world_v1` | `flushWorldSave()` (worldRuntime.ts:272–278; autosave 30 s in roam, day boundaries, story-persist rides) | `bootWorldBrain` at construction and `reloadFromSave()` | "Corrupt/foreign/failed → fresh world + notes, never a crash" — **enforced only at the boot seam**, contradicted at the parser level (FS-AUDIT-002) |
| `first_slice_album` | `storeAlbum` with quota-degrade halving (Album.ts:160–178) | `loadAlbum` | Corrupted album → empty album |
| `first_slice_muted` | `audio.ts:52` | `audio.ts:33` | Read failures → audible default |

Cross-key isolation is clean: the world save is deliberately *beside* the story save, never inside it (state.ts:181–184); the album never rides the story save.

## 5. Deployment boundary

`push → main` → `deploy-pages.yml`: Node 22, `npm ci`, typecheck + unit tests gate, `vite build` (relative `base: './'`, no sourcemaps), artifact upload, `actions/deploy-pages@v4` into the `github-pages` environment. No secrets are referenced anywhere in the workflow. The deployed artifact is exactly the committed `web-three/` source — there is no server-side transformation, so **every statically inspectable sink ships to players as-is** (verified: no `import.meta.env`-gated code paths exist; nothing is tree-shaken out of the two dynamic-imported drivers).

## 6. Source-file map (security-relevant)

| Area | Files |
|---|---|
| Persistence | `web-three/src/core/Save.ts` (278 ln), `core/GameState.ts` (snapshot 884–946), `sim/state.ts` (343), `sim/runtime.ts` (boot 626–689), `game/worldRuntime.ts` (402), `postcard/Album.ts` (199) |
| DOM/UI | `ui/UI.ts` (757), `ui/Wardrobe.ts` (397), `ui/sketch.ts`, `index.html` |
| URL surface | `game/Game.ts` (207, 349–350, 379–401, 468–480), `game/autotest.ts` (1095), `game/scenario.ts` (269) |
| Assets | `world/World.ts` (GLB seams 3476–3700), `public/models/**`, `public/vendor/basis/*`, `world/signAtlas.ts`, `world/streetAssets.ts` |
| Sim core | `sim/{clock,rng,ids,entities,economy,narrative,schedule,arbitration,registry,reference,content}.ts` |
| Time | `sim/clock.ts` (212), `core/calendar.ts` |
| CI/config | `.github/workflows/deploy-pages.yml`, `web-three/vite.config.ts`, `web-three/tsconfig.json`, `web-three/package.json` + lockfile |
| Hygiene | `.gitignore`, `tools3d/*`, `scripts/*`, `AGENTS.md`, `worklog.md` |

## 7. Comparable-baseline note (methodology §architecture)

The comparable product class is a **single-player static web game** (e.g., itch.io-style HTML5 games). That class conventionally accepts: player-side cheating, localStorage as untrusted, no CSP, no anti-tamper. Baseline calibration was used to set severity ceilings only — it did not dismiss any demonstrated boundary result (e.g., the malicious-link save-wipe in FS-AUDIT-001 is a *cross-principal* action — attacker link → victim's data — which the baseline does not accept silently).

---

## 8. R2 reconciliation — architecture delta since the audited baseline (7995e6e → 62a6244)

The upstream delta is 7 commits / 12 files. **No new trust boundary was introduced; no entry point was added; B1–B5 are unchanged.** What changed:

| Change | Security review result |
|---|---|
| **NEW `sim/epochMap.ts`** (232 ln, WP-2v — the one epoch mapping) | Pure, headless mapping between story day / sim day / calendar day. **Strict validation front door**: every public function routes through `assertDay()` (`:69–76` — finite integer, 1..36500, throws loudly). Dynamically proven: throws on 0/NaN/1.5/36501/1e15; `epochAgreement()` returns agreed (battery R5). Its only `calendarOf` calls are constant/bounded (`:183`, `:210–212`) — it does **not** become the unbounded consumer FS-AUDIT-005 warned about. Sink sweep clean (no DOM/storage/URL/network). Exports `datelineOfSimDay`/`datelineOfStoryDay` for the roadmap's WP-6 — recorded as the watch path in FS-AUDIT-005's R2 note. |
| **NEW `game/pauseSet.ts`** (66 ln, WP-1v — the host pause set) | Pure data → boolean reducer (`worldPaused(h)`); caller-resolved booleans; no clock, no THREE, no DOM, no I/O. No trust surface. |
| **`game/Game.ts`** (+19/−2) | The only change is the frame-loop pause block (`:499–516` region): inline pause expression → `worldPaused({...})` with the same members plus wardrobe/postcard. **Does not touch** the B1 URL surface (dispatch unchanged at `:469–471`/`:477–480`) or any sink. |
| **`game/worldRuntime.ts`** (+7/−2) | Only `onStoryDayBegin` (~`:334–346`): inline morning-anchor arithmetic → `simTickOfStoryDay(storyDay)` (imported from epochMap). Behavior equivalent for all reachable inputs (story day is parser-clamped to [1,4]; `advanceMinutes` keeps its 14400-tick sanity cap, `runtime.ts:364–371`). The new `assertDay` throw is unreachable via the parser and, if ever reached, fails loudly instead of computing a huge tick — a net improvement. Both boot seams unchanged (`:86–95`, `:288–295`). |
| **`scripts/probe-pause-set.mjs`** (116 ln, dev-only) | Playwright probe serving `dist/` locally; imported by nothing in `src/`; never shipped in the bundle. Out of the player attack surface (same class as the existing `probe-*.mjs` fleet). |
| **Tests** (`sim-epoch-map.test.ts` +278, `sim-runtime.test.ts` +200, `calendar.test.ts` +16) | 777 `it`/`test` declarations across 58 files at `62a6244` (grep-counted). Upstream's new tests themselves pin epoch validation (tampered-epoch caught, invalid-day throws) — security-positive. |
| **Docs/worklog** (5 files) | Record WP-1v/WP-2v integration and the dependency-aware next order (A-1 first, WP-4 second, WP-6 parallel — all gated on owner authorization). No runtime effect. |

**Updated line anchors at `62a6244` (superseding §2 where shifted):** B1 URL reads in `Game.ts` now at 207/349–350/379–384/393–401/**469–481**; B2 world-save seams at `worldRuntime.ts:86–95` and `:288–295`; everything else in §2–§6 is pinned to unchanged files and remains accurate.
