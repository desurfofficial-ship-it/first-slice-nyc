/**
 * The development/production boundary for the debug/E2E drivers
 * (security remediation R1 — FS-AUDIT-001).
 *
 * The audit found that `?autotest=1` and `?scenario=…` dispatched
 * destructive debug drivers (wipeSave(), world-save removal/overwrites)
 * on mere URL-parameter presence, in production, with no gate of any
 * kind — one crafted link could reset another person's save.
 *
 * The law now (one decision, one place, testable):
 *
 *   1. Development (`import.meta.env.DEV` — the dev server and any
 *      dev-mode build): drivers are available. The developer workflow
 *      (`npm run dev` + `?autotest=1`) is preserved exactly.
 *
 *   2. Production (`vite build`): drivers are reachable ONLY through an
 *      explicit, non-URL handshake — `sessionStorage['fs_driver_authorized']
 *      === '1'` — which a link CANNOT carry. sessionStorage is origin-
 *      scoped and tab-scoped; a remote attacker can only control the URL,
 *      never the harness's own bootstrap step. This is what lets the
 *      automated browser fleet (scripts/e2e.mjs, probe-world-sim.mjs,
 *      probe-security-*.mjs) keep initializing against real built
 *      production output, per the audit's own recommendation (07 §R1).
 *
 *   3. Authorized driver sessions additionally run in a STORAGE SANDBOX:
 *      story persistence rides `first_slice_save_v1_driver` and world
 *      persistence rides `first_slice_world_v1_driver` (see core/Save.ts
 *      and sim/state.ts). A driver can wipe, truncate, or overwrite its
 *      own keys all day — a real player save is unreachable by
 *      construction, not by discipline.
 *
 * There is no hidden query parameter, no secret URL, no undocumented
 * bypass: this file IS the documented boundary, and every signal it
 * reads is named here.
 */

import { setStorySaveKeyOverride, DRIVER_SAVE_KEY } from '../core/Save';
import { setWorldSaveKeyOverride, DRIVER_WORLD_SAVE_KEY } from '../sim/state';
import { setAlbumKeyOverride, DRIVER_ALBUM_KEY } from '../postcard/Album';

/** The session-storage key the test harness sets (via Playwright's
 *  addInitScript, before any page script runs) to authorize drivers in
 *  a production build. A URL parameter can never set this. */
export const DRIVER_AUTH_KEY = 'fs_driver_authorized';

/** How authorization was decided — surfaced in logs and tests. */
export type DriverAuthSource = 'dev-build' | 'handshake' | 'denied';

export interface DriverAuth {
  allowed: boolean;
  source: DriverAuthSource;
}

/**
 * The pure decision function — the whole policy in one testable unit.
 * `devMode` is the build-time flag (import.meta.env.DEV); `handshake`
 * is the session-storage signal the harness sets. Nothing else exists.
 */
export function authorizeDebugDrivers(opts: {
  devMode: boolean;
  handshake: boolean;
}): DriverAuth {
  if (opts.devMode) return { allowed: true, source: 'dev-build' };
  if (opts.handshake) return { allowed: true, source: 'handshake' };
  return { allowed: false, source: 'denied' };
}

/**
 * Read the handshake from session storage. Storage-refusing browsers
 * (private mode quirks) simply deny — the honest default.
 */
export function readDriverHandshake(
  session?: Pick<Storage, 'getItem'>,
): boolean {
  if (!session) return false;
  try {
    return session.getItem(DRIVER_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}

/** The authorization check the drivers themselves re-run at entry
 *  (defense in depth: even a future caller that imports runAutotest /
 *  runScenario directly hits the same wall). */
export function isDriverAuthorizedNow(): boolean {
  return authorizeDebugDrivers({
    devMode: import.meta.env.DEV,
    handshake: readDriverHandshake(
      typeof sessionStorage !== 'undefined' ? sessionStorage : undefined,
    ),
  }).allowed;
}

/**
 * Activate the driver storage sandbox: story and world persistence are
 * re-keyed to the driver namespaces for the WHOLE session — every read
 * and every write, boot to shutdown. Returns the active keys so the
 * caller can say exactly where persistence went.
 */
export function enableDriverStorageSandbox(): {
  storySaveKey: string;
  worldSaveKey: string;
  albumKey: string;
} {
  setStorySaveKeyOverride(DRIVER_SAVE_KEY);
  setWorldSaveKeyOverride(DRIVER_WORLD_SAVE_KEY);
  setAlbumKeyOverride(DRIVER_ALBUM_KEY);
  return { storySaveKey: DRIVER_SAVE_KEY, worldSaveKey: DRIVER_WORLD_SAVE_KEY, albumKey: DRIVER_ALBUM_KEY };
}
