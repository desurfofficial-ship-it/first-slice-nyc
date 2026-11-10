/**
 * R1 regression battery (FS-AUDIT-001) — the debug-driver boundary.
 *
 * The law under test (game/driverGate.ts, the one decision point):
 *   • dev build  → drivers allowed (the developer workflow is preserved)
 *   • prod build + session-storage handshake → allowed (the automated
 *     browser fleet can still initialize against real production output)
 *   • prod build + URL alone → DENIED, no matter what the URL carries
 *   • an authorized session is STORAGE-SANDBOXED: story persistence rides
 *     `first_slice_save_v1_driver`, world persistence rides
 *     `first_slice_world_v1_driver` — a real player save is unreachable
 *     by construction, not by discipline.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  authorizeDebugDrivers, readDriverHandshake, enableDriverStorageSandbox,
  DRIVER_AUTH_KEY,
} from '../src/game/driverGate';
import {
  loadSave, writeSave, wipeSave, parseSave, defaultSave,
  activeSaveKey, setStorySaveKeyOverride, SAVE_KEY, DRIVER_SAVE_KEY,
} from '../src/core/Save';
import {
  activeWorldSaveKey, setWorldSaveKeyOverride, WORLD_SAVE_KEY,
  DRIVER_WORLD_SAVE_KEY, WORLD_SAVE_QUARANTINE_KEY, activeWorldQuarantineKey,
} from '../src/sim/state';
import {
  loadAlbum, storeAlbum, activeAlbumKey, setAlbumKeyOverride,
  ALBUM_KEY, DRIVER_ALBUM_KEY, type AlbumEntry,
} from '../src/postcard/Album';

function memoryStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    has: (k: string) => map.has(k),
  };
}

afterEach(() => {
  setStorySaveKeyOverride(null);
  setWorldSaveKeyOverride(null);
  setAlbumKeyOverride(null);
});

describe('R1 — the authorization decision (pure, one policy, no side doors)', () => {
  it('a production URL alone can NEVER authorize the drivers', () => {
    const r = authorizeDebugDrivers({ devMode: false, handshake: false });
    expect(r.allowed).toBe(false);
    expect(r.source).toBe('denied');
  });

  it('the dev build authorizes (the npm run dev workflow is preserved)', () => {
    const r = authorizeDebugDrivers({ devMode: true, handshake: false });
    expect(r.allowed).toBe(true);
    expect(r.source).toBe('dev-build');
  });

  it('the harness handshake authorizes a production build (the E2E fleet path)', () => {
    const r = authorizeDebugDrivers({ devMode: false, handshake: true });
    expect(r.allowed).toBe(true);
    expect(r.source).toBe('handshake');
  });

  it('devMode wins the label when both signals exist', () => {
    expect(authorizeDebugDrivers({ devMode: true, handshake: true }).source).toBe('dev-build');
  });
});

describe('R1 — the handshake is session storage, never the URL', () => {
  it('reads exactly DRIVER_AUTH_KEY === "1"', () => {
    const store = memoryStore({ [DRIVER_AUTH_KEY]: '1' });
    expect(readDriverHandshake(store)).toBe(true);
    expect(readDriverHandshake(memoryStore({ [DRIVER_AUTH_KEY]: 'true' }))).toBe(false);
    expect(readDriverHandshake(memoryStore({ [DRIVER_AUTH_KEY]: '' }))).toBe(false);
    expect(readDriverHandshake(memoryStore())).toBe(false);
  });

  it('a storage-refusing browser denies — the honest default', () => {
    const refusing = { getItem: () => { throw new Error('private mode'); } };
    expect(readDriverHandshake(refusing)).toBe(false);
    expect(readDriverHandshake(undefined)).toBe(false);
  });

  it('the handshake key is not a URL parameter and cannot ride one', () => {
    // the boundary contract: the key lives in sessionStorage; a crafted
    // link only controls location.search, which this module never reads
    const params = new URLSearchParams(`?${DRIVER_AUTH_KEY}=1`);
    expect(readDriverHandshake(memoryStore())).toBe(false); // URL says yes, storage says nothing
    expect(params.get(DRIVER_AUTH_KEY)).toBe('1'); // (proving the param is even present — still denied)
  });
});

describe('R1 — the driver storage sandbox keeps player saves unreachable', () => {
  it('the driver keys are distinct namespaces beside the player keys', () => {
    expect(DRIVER_SAVE_KEY).toBe('first_slice_save_v1_driver');
    expect(DRIVER_SAVE_KEY).not.toBe(SAVE_KEY);
    expect(DRIVER_WORLD_SAVE_KEY).toBe('first_slice_world_v1_driver');
    expect(DRIVER_WORLD_SAVE_KEY).not.toBe(WORLD_SAVE_KEY);
    expect(WORLD_SAVE_QUARANTINE_KEY).not.toBe(WORLD_SAVE_KEY);
  });

  it('outside a driver session, persistence rides the player keys unchanged', () => {
    expect(activeSaveKey()).toBe(SAVE_KEY);
    expect(activeWorldSaveKey()).toBe(WORLD_SAVE_KEY);
  });

  it('enableDriverStorageSandbox re-keys BOTH layers for the session', () => {
    const sandbox = enableDriverStorageSandbox();
    expect(sandbox.storySaveKey).toBe(DRIVER_SAVE_KEY);
    expect(sandbox.worldSaveKey).toBe(DRIVER_WORLD_SAVE_KEY);
    expect(activeSaveKey()).toBe(DRIVER_SAVE_KEY);
    expect(activeWorldSaveKey()).toBe(DRIVER_WORLD_SAVE_KEY);
  });

  it('wipeSave() in a driver session can only ever hit the driver key', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, JSON.stringify({ ...defaultSave(), day: 4, money: 240, cart_name: 'The Regular' }));
    store.setItem(DRIVER_SAVE_KEY, JSON.stringify({ ...defaultSave(), day: 2 }));
    setStorySaveKeyOverride(DRIVER_SAVE_KEY);

    wipeSave(store); // the driver's destructive primitive

    expect(store.has(SAVE_KEY)).toBe(true); // the player save is UNTOUCHED
    expect(store.has(DRIVER_SAVE_KEY)).toBe(false); // the driver's own world is gone
    expect(parseSave(store.getItem(SAVE_KEY)!).day).toBe(4);
    expect(parseSave(store.getItem(SAVE_KEY)!).money).toBe(240);
  });

  it('a full driver session (write/read/wipe) never reads or writes the player key', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, JSON.stringify({ ...defaultSave(), day: 3, money: 150 }));
    setStorySaveKeyOverride(DRIVER_SAVE_KEY);

    writeSave({ ...defaultSave(), day: 1, money: 87 }, store);
    const seen = loadSave(store);
    expect(seen.day).toBe(1); // the driver sees its own fresh world
    wipeSave(store);

    // the player's key: byte-for-byte what the driver found at boot
    expect(store.getItem(SAVE_KEY)).toBe(JSON.stringify({ ...defaultSave(), day: 3, money: 150 }));
  });

  it('the sandbox covers the story DOCUMENT shape only — the schema never changes', () => {
    setStorySaveKeyOverride(DRIVER_SAVE_KEY);
    const store = memoryStore();
    writeSave({ ...defaultSave(), day: 2, money: 111, cart_name: 'Bodega Run' }, store);
    const doc = JSON.parse(store.getItem(DRIVER_SAVE_KEY)!) as Record<string, unknown>;
    expect(Object.keys(doc).sort()).toEqual(Object.keys(defaultSave()).sort());
  });

  it('restoring the override hands persistence back to the player keys', () => {
    setStorySaveKeyOverride(DRIVER_SAVE_KEY);
    expect(activeSaveKey()).toBe(DRIVER_SAVE_KEY);
    setStorySaveKeyOverride(null);
    expect(activeSaveKey()).toBe(SAVE_KEY);
  });
});

describe('R1 follow-up (verifier findings N-2/N-3) — the sandbox covers every driver-touched namespace', () => {
  const card = (n: number): AlbumEntry => ({
    id: `d1-day-x${n}`, day: 1, kind: 'day', caption: `card ${n}`,
    cartName: 'Test Cart', thumb: 'data:image/jpeg;base64,AAAA', keptAt: n,
  });

  it('the driver album key is a distinct namespace', () => {
    expect(DRIVER_ALBUM_KEY).toBe('first_slice_album_driver');
    expect(DRIVER_ALBUM_KEY).not.toBe(ALBUM_KEY);
  });

  it('an authorized session shelves driver postcards on the DRIVER shelf', () => {
    const store = memoryStore();
    store.setItem(ALBUM_KEY, JSON.stringify([card(1), card(2)])); // the player's shelf
    setAlbumKeyOverride(DRIVER_ALBUM_KEY);
    const kept = storeAlbum([card(3), card(4), card(5)], store);
    expect(kept).toHaveLength(3);
    expect(activeAlbumKey()).toBe(DRIVER_ALBUM_KEY);
    // the player's real shelf: untouched, byte-for-byte the two original cards
    const playerShelf = JSON.parse(store.getItem(ALBUM_KEY)!);
    expect(playerShelf).toHaveLength(2);
    expect(playerShelf.map((c: AlbumEntry) => c.id)).toEqual(['d1-day-x1', 'd1-day-x2']);
    // the driver's shelf holds the driver's cards
    const driverShelf = JSON.parse(store.getItem(DRIVER_ALBUM_KEY)!);
    expect(driverShelf.map((c: AlbumEntry) => c.id)).toEqual(['d1-day-x5', 'd1-day-x4', 'd1-day-x3']); // newest first
  });

  it('loadAlbum in a driver session reads the driver shelf, never the player shelf', () => {
    const store = memoryStore({ [ALBUM_KEY]: JSON.stringify([card(9)]) });
    setAlbumKeyOverride(DRIVER_ALBUM_KEY);
    expect(loadAlbum(store)).toEqual([]); // driver shelf is empty
    setAlbumKeyOverride(null);
    expect(loadAlbum(store).map((c) => c.id)).toEqual(['d1-day-x9']);
  });

  it('the quarantine slot follows the active world namespace (N-3)', () => {
    expect(activeWorldQuarantineKey()).toBe(WORLD_SAVE_QUARANTINE_KEY);
    setWorldSaveKeyOverride(DRIVER_WORLD_SAVE_KEY);
    expect(activeWorldQuarantineKey()).toBe(`${DRIVER_WORLD_SAVE_KEY}_quarantine`);
    expect(activeWorldQuarantineKey()).not.toBe(WORLD_SAVE_QUARANTINE_KEY);
  });
});
