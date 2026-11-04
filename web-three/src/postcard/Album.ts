/**
 * The album — the shelf where kept postcards live (the GDD's postcard
 * pipeline: "share sheet + album, needs volume + framing consistency").
 *
 * The pipeline law of this folder holds: a postcard is a REAL capture, and
 * the album stores REAL paper — a small print of it. The full-size card
 * (768×1344 PNG) is session memory; the album keeps a 192×336 jpeg thumb
 * (the same 4:7 paper, the same framing) so a shelf of days costs kilobytes,
 * not megabytes. Older cards can be re-shared from the shelf at album size;
 * this session's cards always share full-size.
 *
 * Storage rules are the save parser's rules (tests/save.test.ts): every
 * field is checked, wrong shapes fall out, duplicates collapse, the cap
 * keeps the newest, and a corrupted album is an EMPTY album — never a crash.
 */

export interface AlbumEntry {
  /** stable: day + kind + caption hash — keep twice, still one card */
  id: string;
  day: number;
  kind: 'day' | 'wow';
  caption: string;
  cartName: string;
  /** album-size jpeg data URL (data:image/jpeg;…) */
  thumb: string;
  keptAt: number;
  /** The shelf tag for moment cards ("THE SQUARE", "THE RUSH", …) —
   *  optional, v1-safe: absent reads as the kind's default on the shelf. */
  tag?: string;
}

export const ALBUM_KEY = 'first_slice_album';
export const ALBUM_MAX = 24;

/** The album print's size — exactly the card's 4:7 paper, quarter scale. */
export const THUMB_W = 192;
export const THUMB_H = 336;

/** Minimal storage seam — the tests ride a memory store, the game rides
 *  localStorage, and neither knows the difference. */
export interface AlbumStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** djb2 — small, stable, enough for an id (never a security primitive). */
export function captionHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function entryId(day: number, kind: 'day' | 'wow', caption: string): string {
  return `d${day}-${kind}-${captionHash(caption)}`;
}

function isDataImage(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('data:image/');
}

/** The parser is a wall, not a suggestion: every field is checked, wrong
 *  shapes fall out, duplicate ids collapse to the first, the cap keeps the
 *  newest. Nothing here throws — fuzz it (tests/album.test.ts). */
export function parseAlbum(raw: unknown): AlbumEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: AlbumEntry[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const e = item as Record<string, unknown>;
    const { id, day, kind, caption, cartName, thumb, keptAt } = e;
    if (typeof id !== 'string' || id.length === 0 || id.length > 64) continue;
    if (typeof day !== 'number' || !Number.isInteger(day) || day < 1 || day > 999) continue;
    if (kind !== 'day' && kind !== 'wow') continue;
    if (typeof caption !== 'string' || caption.length > 400) continue;
    if (typeof cartName !== 'string' || cartName.length > 40) continue;
    if (!isDataImage(thumb) || thumb.length > 200_000) continue;
    if (typeof keptAt !== 'number' || !Number.isFinite(keptAt)) continue;
    // the shelf tag: optional, string, short — wrong shapes fall out to the
    // kind's default rather than rejecting the whole card
    const tag = typeof e.tag === 'string' && e.tag.length > 0 && e.tag.length <= 24
      ? e.tag
      : undefined;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, day, kind, caption, cartName, thumb, keptAt, tag });
  }
  out.sort((a, b) => b.keptAt - a.keptAt);
  return out.slice(0, ALBUM_MAX);
}

/** Newest first, idempotent by id (keep twice → one card, moved up), capped.
 *  Pure — the storage write is storeAlbum's job. */
export function addToAlbum(entries: AlbumEntry[], entry: AlbumEntry): AlbumEntry[] {
  const rest = entries.filter((e) => e.id !== entry.id);
  return [entry, ...rest].slice(0, ALBUM_MAX);
}

export function loadAlbum(store: AlbumStore = defaultStore()): AlbumEntry[] {
  try {
    const raw = store.getItem(ALBUM_KEY);
    if (!raw) return [];
    return parseAlbum(JSON.parse(raw));
  } catch {
    return []; // a corrupted album is an empty album, never a crash
  }
}

/** Quota-degrade: if the write fails (the shelf is full), halve and try
 *  again — the newest cards survive, the oldest yield the shelf. Order is
 *  the shelf's own law (keptAt, newest first), never the caller's whim.
 *  Returns what actually stuck, so the UI badge stays honest. */
export function storeAlbum(entries: AlbumEntry[], store: AlbumStore = defaultStore()): AlbumEntry[] {
  let keep = [...entries].sort((a, b) => b.keptAt - a.keptAt).slice(0, ALBUM_MAX);
  while (keep.length > 0) {
    try {
      store.setItem(ALBUM_KEY, JSON.stringify(keep));
      return keep;
    } catch {
      keep = keep.slice(0, Math.floor(keep.length / 2));
    }
  }
  try { store.removeItem(ALBUM_KEY); } catch { /* nothing to clear */ }
  return [];
}

/** The album print: draw the whole card (paper, stamp, caption — the
 *  framing IS the keepsake) at quarter size. A thumb that cannot shrink
 *  ships the full card — the keepsake matters more than the bytes. */
export function makeThumb(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = THUMB_W;
        c.height = THUMB_H;
        const ctx = c.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.fillStyle = '#FFF8F0'; // jpeg has no alpha — the paper shows through
        ctx.fillRect(0, 0, THUMB_W, THUMB_H);
        ctx.drawImage(img, 0, 0, 768, 1344, 0, 0, THUMB_W, THUMB_H);
        resolve(c.toDataURL('image/jpeg', 0.72));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function defaultStore(): AlbumStore {
  return globalThis.localStorage;
}
