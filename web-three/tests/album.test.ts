/**
 * The album (the GDD's postcard pipeline: "share sheet + album"): the shelf
 * stores real paper thumbs, and the parser faces the same wall the save
 * parser does — every wrong shape falls out, duplicates collapse, the cap
 * keeps the newest, and a corrupted album is an EMPTY album, never a crash.
 */

import { describe, it, expect } from 'vitest';
import {
  parseAlbum, addToAlbum, entryId, captionHash, storeAlbum, loadAlbum,
  ALBUM_KEY, ALBUM_MAX, type AlbumEntry, type AlbumStore,
} from '../src/postcard/Album';

const THUMB = 'data:image/jpeg;base64,AAAA';

function entry(over: Partial<AlbumEntry> = {}): AlbumEntry {
  return {
    id: 'd1-day-abc', day: 1, kind: 'day', caption: 'Day 1', cartName: "Wade's Spot",
    thumb: THUMB, keptAt: 1000, ...over,
  };
}

function memoryStore(initial: Record<string, string> = {}): AlbumStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
  };
}

const safeParse = (s: string): unknown => {
  try { return JSON.parse(s); } catch { return s; }
};

describe('album parse — corrupt shelf is an empty shelf, never a crash', () => {
  it('wrong shapes fall out', () => {
    expect(parseAlbum(null)).toEqual([]);
    expect(parseAlbum('nope')).toEqual([]);
    expect(parseAlbum(42)).toEqual([]);
    expect(parseAlbum({})).toEqual([]);
    expect(parseAlbum([null, 1, 'x', {}, []])).toEqual([]);
  });

  it('every field is checked', () => {
    const bad: Array<Record<string, unknown>> = [
      { ...entry(), id: '' },
      { ...entry(), id: 'x'.repeat(65) },
      { ...entry(), day: 0 },
      { ...entry(), day: 1.5 },
      { ...entry(), day: 1000 },
      { ...entry(), kind: 'sticker' },
      { ...entry(), caption: 'y'.repeat(401) },
      { ...entry(), cartName: 'z'.repeat(41) },
      { ...entry(), thumb: 'http://not-a-data-url' },
      { ...entry(), thumb: 'data:text/html;base64,AA' },
      { ...entry(), thumb: 'data:image/jpeg;base64,' + 'A'.repeat(200_001) },
      { ...entry(), keptAt: 'yesterday' },
      { ...entry(), keptAt: Number.NaN },
    ];
    expect(parseAlbum(bad)).toEqual([]);
  });

  it('a good shelf parses whole, newest first', () => {
    const raw = [entry(), entry({ id: 'd2-day-x', day: 2, keptAt: 2000 })];
    const out = parseAlbum(JSON.parse(JSON.stringify(raw)));
    expect(out).toHaveLength(2);
    expect(out[0].day).toBe(2);
    expect(out[1].day).toBe(1);
  });

  it('duplicate ids collapse to one; the cap keeps the newest', () => {
    const many = Array.from({ length: ALBUM_MAX + 10 }, (_, i) => entry({ id: `x${i}`, keptAt: i }));
    const withDupe = [entry({ id: 'x1', keptAt: 999 }), ...many];
    const out = parseAlbum(withDupe);
    expect(out.filter((e) => e.id === 'x1')).toHaveLength(1);
    expect(out).toHaveLength(ALBUM_MAX);
    expect(out[0].id).toBe('x1'); // the re-keep is the newest touch
    expect(out.some((e) => e.id === 'x0')).toBe(false); // the cap eats the oldest
  });

  it('truncation and byte-flips never throw', () => {
    const json = JSON.stringify(Array.from({ length: 5 }, (_, i) => entry({ id: `k${i}` })));
    const step = Math.max(1, Math.floor(json.length / 40));
    for (let cut = 0; cut < json.length; cut += step) {
      expect(() => parseAlbum(safeParse(json.slice(0, cut)))).not.toThrow();
    }
    const mid = Math.floor(json.length / 2);
    const flipped = json.slice(0, mid) + (json[mid] === '"' ? '\\' : '"') + json.slice(mid + 1);
    expect(() => parseAlbum(safeParse(flipped))).not.toThrow();
  });
});

describe('album id — keep twice, still one card', () => {
  it('the id is stable and separates what should separate', () => {
    expect(entryId(1, 'day', 'Day 1')).toBe(entryId(1, 'day', 'Day 1'));
    expect(entryId(1, 'day', 'Day 1')).not.toBe(entryId(2, 'day', 'Day 1'));
    expect(entryId(1, 'day', 'Day 1')).not.toBe(entryId(1, 'wow', 'Day 1'));
    expect(entryId(1, 'day', 'Day 1')).not.toBe(entryId(1, 'day', 'Day 2'));
  });

  it('the hash is djb2-shaped: different captions, different shelves', () => {
    expect(captionHash('a')).not.toBe(captionHash('b'));
  });
});

describe('the shelf tag (Doc 08 moment cards — "THE RUSH", "THE HATS"…)', () => {
  it('a valid tag round-trips through the parser', () => {
    const shelf = parseAlbum([entry({ id: 'd1-wow-x', kind: 'wow', tag: 'THE RUSH' })]);
    expect(shelf).toHaveLength(1);
    expect(shelf[0].tag).toBe('THE RUSH');
  });

  it('an absent tag parses as absent — old shelves read unchanged', () => {
    const shelf = parseAlbum([entry({ id: 'd1-day-y' })]);
    expect(shelf[0].tag).toBeUndefined();
  });

  it('wrong tag shapes fall out to absent, never reject the card', () => {
    for (const bad of [42, null, {}, '', 'x'.repeat(25)]) {
      const shelf = parseAlbum([entry({ id: 'd1-wow-z', kind: 'wow', tag: bad as unknown as string })]);
      expect(shelf).toHaveLength(1);
      expect(shelf[0].tag).toBeUndefined();
    }
  });

  it('a tagged entry survives the store round-trip', () => {
    const store = memoryStore();
    const kept = storeAlbum([entry({ id: 'd1-wow-w', kind: 'wow', tag: 'YOUR CORNER' })], store);
    expect(kept).toHaveLength(1);
    const back = loadAlbum(store);
    expect(back[0].tag).toBe('YOUR CORNER');
  });
});

describe('addToAlbum — newest first, idempotent, capped', () => {
  it('adds on top', () => {
    const out = addToAlbum([entry()], entry({ id: 'new', keptAt: 2 }));
    expect(out.map((e) => e.id)).toEqual(['new', 'd1-day-abc']);
  });

  it('keeping twice moves the card up, never duplicates it', () => {
    const one = addToAlbum([], entry());
    const twice = addToAlbum(one, entry({ keptAt: 9999 }));
    expect(twice).toHaveLength(1);
    expect(twice[0].keptAt).toBe(9999);
  });

  it('the shelf never grows past the cap', () => {
    let shelf: AlbumEntry[] = [];
    for (let i = 0; i < ALBUM_MAX + 5; i++) shelf = addToAlbum(shelf, entry({ id: `n${i}`, keptAt: i }));
    expect(shelf).toHaveLength(ALBUM_MAX);
    expect(shelf[0].id).toBe(`n${ALBUM_MAX + 4}`); // newest first
  });
});

describe('store/load — quota-degrade and the honest badge', () => {
  it('round-trips through a memory store', () => {
    const store = memoryStore();
    const shelf = [entry(), entry({ id: 'd2', day: 2, keptAt: 2 })];
    expect(storeAlbum(shelf, store)).toHaveLength(2);
    expect(loadAlbum(store)).toHaveLength(2);
    expect(store.data.get(ALBUM_KEY)).toContain('d2');
  });

  it('a full shelf halves rather than lose the newest', () => {
    let calls = 0;
    const quota: AlbumStore = {
      getItem: () => null,
      setItem: (_k, v) => {
        calls++;
        if ((JSON.parse(v) as unknown[]).length > 2) throw new Error('QuotaExceededError');
      },
      removeItem: () => { /* n/a */ },
    };
    const shelf = Array.from({ length: 8 }, (_, i) => entry({ id: `q${i}`, keptAt: i }));
    const kept = storeAlbum(shelf, quota);
    expect(calls).toBeGreaterThan(1);
    expect(kept.map((e) => e.id)).toEqual(['q7', 'q6']); // the newest survive
  });

  it('a total failure empties the shelf honestly', () => {
    const removed: string[] = [];
    const dead: AlbumStore = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
      removeItem: (k: string) => { removed.push(k); },
    };
    expect(storeAlbum([entry()], dead)).toEqual([]);
    expect(removed).toContain(ALBUM_KEY);
  });

  it('corrupt storage boots an empty shelf', () => {
    expect(loadAlbum(memoryStore({ [ALBUM_KEY]: '{not json{{{' }))).toEqual([]);
    expect(loadAlbum(memoryStore({ [ALBUM_KEY]: '"a string"' }))).toEqual([]);
    expect(loadAlbum(memoryStore())).toEqual([]);
  });
});
