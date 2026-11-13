/**
 * ISOLATED AUDIT HARNESS — FIRST SLICE security audit (docs/security-audit/06).
 * Runs the ACTUAL production parser modules (disposable copies, unmodified
 * logic) against malformed fixtures. No network, no installs, no game boot.
 * Each case prints a stable PASS/FAIL + observed result line for evidence.
 */
import { parseSave, defaultSave } from './src/Save.ts';
import { parseWorldSave } from './sim/state.ts';
import { calendarOf, GameClock } from './sim/clock.ts';
import { parseAlbum } from '/home/z/my-project/repos/first-slice-nyc/web-three/src/postcard/Album.ts';

let n = 0;
function record(id: string, expect: string, run: () => string): void {
  n++;
  try {
    const out = run();
    console.log(`[${id}] expect=${expect} | observed: ${out}`);
  } catch (err) {
    console.log(`[${id}] expect=${expect} | observed: THREW ${(err as Error).constructor.name}: ${(err as Error).message}`);
  }
}

const big = (len: number, ch = 'A') => ch.repeat(len);

console.log('===== A. STORY SAVE — parseSave (web-three/src/core/Save.ts) =====');
record('A1 null', 'defaults', () => JSON.stringify(parseSave(null).day) + '/' + parseSave(null).money);
record('A2 empty', 'defaults', () => { const s = parseSave(''); return `day=${s.day} money=${s.money}`; });
record('A3 corrupt-json', 'defaults, no crash', () => { const s = parseSave('{"day":2,"money":110'); return `day=${s.day} money=${s.money}`; });
record('A4 array', 'defaults', () => { const s = parseSave('[1,2,3]'); return `day=${s.day} Array?=${Array.isArray(s)}`; });
record('A5 string', 'defaults', () => parseSave('"hello"').day);
record('A6 number', 'defaults', () => parseSave('42').day);
record('A7 empty-obj', 'defaults', () => { const s = parseSave('{}'); return `day=${s.day} money=${s.money} starter=${JSON.stringify(s.starter)}`; });
record('A8 valid', 'restored', () => { const s = parseSave(JSON.stringify({ day: 3, money: 112, cart_name: 'Leo Cart', starter: 'dee' })); return `day=${s.day} money=${s.money} cart=${s.cart_name} starter=${s.starter}`; });
record('A9 day-over-max', 'clamped to 4', () => parseSave(JSON.stringify({ day: 99999 })).day);
record('A10 money-negative', 'clamped to 0', () => parseSave(JSON.stringify({ money: -500 })).money);
record('A11 money-huge', '??? upper bound check', () => parseSave(JSON.stringify({ money: 1e15 })).money);
record('A12 money-huge-str', '??? string-number coercion', () => parseSave(JSON.stringify({ money: '1e15' })).money);
record('A13 money-float', 'trunc', () => parseSave(JSON.stringify({ money: 99.999 })).money);
record('A14 calendar-huge', 'clamped 36500', () => parseSave(JSON.stringify({ calendar_day: 1e15 })).calendar_day);
record('A15 cart_name-1MB', '??? length check', () => { const s = parseSave(JSON.stringify({ cart_name: big(1_000_000) })); return `len=${s.cart_name.length}`; });
record('A16 map_notes-5000', 'capped 24, >200ch dropped', () => { const notes = Array.from({ length: 5000 }, (_, i) => big(300, 'x') + i); const s = parseSave(JSON.stringify({ map_notes: notes })); return `count=${s.map_notes!.length} maxLen=${Math.max(...s.map_notes!.map(x => x.length))}`; });
record('A17 map_notes-not-array', 'empty', () => parseSave(JSON.stringify({ map_notes: 42 })).map_notes!.length);
record('A18 field_diary-garbage', 'quarantined', () => parseSave(JSON.stringify({ field_diary: [{ id: '', kind: 'nope', body: 5 }, 'x', null, 42] })).field_diary!.length);
record('A19 starter-5000ch', 'dropped (absent)', () => JSON.stringify(parseSave(JSON.stringify({ starter: big(5000) })).starter));
record('A20 starter-valid-unknown', 'kept by parser (read site falls back)', () => parseSave(JSON.stringify({ starter: 'totally-unknown-face' })).starter);
record('A21 lunch-999', 'clamped 3', () => parseSave(JSON.stringify({ lunch_served: 999 })).lunch_served);
record('A22 proto-pollution', 'no pollution, field ignored', () => {
  const raw = '{"__proto__":{"polluted":"yes"},"money":100}';
  const s = parseSave(raw);
  const anyObj = {} as Record<string, unknown>;
  return `polluted=${(anyObj as { polluted?: string }).polluted ?? 'NO'} money=${s.money} saveHasProto=${('__proto__' in (Object.assign({}, s)) ? 'in-copy' : 'no')}`;
});
record('A23 proto-constructor', 'no gadget', () => {
  const raw = '{"constructor":{"prototype":{"isAdmin":true}},"day":2}';
  parseSave(raw);
  const probe = {} as Record<string, unknown>;
  return `isAdmin=${probe.isAdmin ?? 'NO'}`;
});
record('A24 bool-string-coercion', 'coerced', () => parseSave(JSON.stringify({ awning: 'true', permit: 'false', replay: 'yes' })).awning + '/' + parseSave(JSON.stringify({ awning: 'true' })).permit + '/' + parseSave(JSON.stringify({ replay: 'yes' })).replay);
record('A25 diary_noted-garbage', 'dropped', () => JSON.stringify(parseSave(JSON.stringify({ diary_noted: { shelf: 'x', dog: -5, trim: 12.7 } })).diary_noted));
record('A26 huge-nested-depth', 'no stack overflow (whitelist ignores)', () => {
  let doc: string = '{"deep":';
  for (let i = 0; i < 200; i++) doc += '{"n":';
  doc += '1' + '}'.repeat(200) + '}';
  const s = parseSave(doc);
  return `parsed day=${s.day}`;
});
record('A27 NaN-money-str', 'default 87', () => parseSave(JSON.stringify({ money: 'abc' })).money);
record('A28 Infinity-via-1e999', 'JSON.parse gives Infinity → reject → default', () => { const s = parseSave('{"money":1e999}'); return `money=${s.money} finite=${Number.isFinite(s.money)}`; });

console.log('\n===== B. WORLD SAVE — parseWorldSave (web-three/src/sim/state.ts) =====');
const baseDoc = () => ({
  magic: 'first-slice-world', version: 1, worldId: 'alder_heights',
  seed: 19940909, clock: { day: 1, minuteOfDay: 460 },
  player: { npcId: 'npc:leo_marsh', homePlaceId: 'KTS-02', moneyCents: 8700 },
  npcs: [], relationships: [], businesses: [],
  ledger: { txns: [], seq: 0 }, flags: [],
  chapter: { chapter: 0, rails: {}, calendarDay: 0 },
  missable: [], consequences: [], events: [], environment: {},
});
record('B1 valid-minimal', 'restored', () => { const r = parseWorldSave(JSON.stringify(baseDoc())); return `source=${r.source} notes=${r.notes.length} day=${r.world.clock.day} playerMoney=${r.world.player.moneyCents}`; });
record('B2 missing-ledger', '??? documented law says fresh', () => { const d: Record<string, unknown> = baseDoc(); delete d.ledger; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('B3 missing-clock', '??? documented law says fresh', () => { const d: Record<string, unknown> = baseDoc(); delete d.clock; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('B4 missing-player', '??? documented law says fresh', () => { const d: Record<string, unknown> = baseDoc(); delete d.player; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('B5 relationships-number', '??? throw expected', () => { const d: Record<string, unknown> = baseDoc(); d.relationships = 5; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('B6 ledger.txns-number', '??? throw expected', () => { const d: Record<string, unknown> = baseDoc(); d.ledger = { txns: 5, seq: 0 }; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('B7 flags-array-of-numbers', '??? accepted silently?', () => { const d: Record<string, unknown> = baseDoc(); d.flags = [1, 2, 3]; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source} flagCount=${r.world.flags.map.size}`; });
record('B8 wrong-magic', 'fresh (validated path)', () => { const d = baseDoc(); (d as { magic: string }).magic = 'not-ours'; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('B9 future-version', 'fresh (validated path)', () => { const d: Record<string, unknown> = baseDoc(); d.version = 99; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('B10 foreign-world', 'fresh (validated path)', () => { const d: Record<string, unknown> = baseDoc(); d.worldId = 'elsewhere'; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('B11 integrity-violating', '??? restored-despite-audit-failure?', () => {
  const d = baseDoc();
  (d.player as { moneyCents: number }).moneyCents = 1e12; // ledger says 8700
  const r = parseWorldSave(JSON.stringify(d));
  return `source=${r.source} money=${r.world.player.moneyCents} notes=[${r.notes.join(' | ').slice(0, 160)}]`;
});
record('B12 clock-day-huge', '??? no upper clamp on day', () => { const d: Record<string, unknown> = baseDoc(); d.clock = { day: 1e15, minuteOfDay: 600 }; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source} day=${r.world.clock.day}`; });
record('B13 npcs-garbage-shapes', '??? restored with junk npcs', () => { const d: Record<string, unknown> = baseDoc(); d.npcs = [{ id: 'npc:x', displayName: null, location: 7 }, 42, 'x']; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source} npcCount=${r.world.npcs.length} notes=${r.notes.length}`; });

console.log('\n===== C. CALENDAR LOOP — calendarOf (web-three/src/sim/clock.ts) =====');
for (const day of [1e3, 1e5, 1e7]) {
  const t0 = performance.now();
  const r = calendarOf(day);
  const dt = performance.now() - t0;
  console.log(`[C1] calendarOf(day=${day.toExponential(0)}) → Y${r.year} in ${dt.toFixed(2)}ms (iterations ≈ ${(day / 365).toExponential(1)})`);
}
console.log('[C2] projection: day=1e15 → iterations ≈ 2.7e12; at measured rate this is a multi-hour/hang loop. NOT executed (bounded test rule).');
record('C3 GameClock-huge-day', 'accepted (no clamp)', () => new GameClock({ day: 1e15 }).day);
record('C4 weekdayOf-huge', 'O(1) modulo — safe', () => { const c = new GameClock({ day: 1e15 }); return c.weekday; });

console.log('\n===== D. ALBUM — parseAlbum (web-three/src/postcard/Album.ts) =====');
record('D1 garbage-array', 'empty', () => parseAlbum([1, 'x', null, {}, { id: 'a' }]).length);
record('D2 javascript-thumb', 'rejected', () => parseAlbum([{ id: 'i1', day: 1, kind: 'day', caption: 'c', cartName: 'x', thumb: 'javascript:alert(1)', keptAt: 1 }]).length);
record('D3 svg-data-thumb', '??? accepted (data:image/ prefix)', () => parseAlbum([{ id: 'i1', day: 1, kind: 'day', caption: 'c', cartName: 'x', thumb: 'data:image/svg+xml,<svg onload=alert(1)>', keptAt: 1 }]).length);
record('D4 huge-thumb', 'rejected (>200000)', () => parseAlbum([{ id: 'i1', day: 1, kind: 'day', caption: 'c', cartName: 'x', thumb: 'data:image/jpeg;base64,' + big(300000), keptAt: 1 }]).length);
record('D5 oversized-caption', 'rejected (>400)', () => parseAlbum([{ id: 'i1', day: 1, kind: 'day', caption: big(500), cartName: 'x', thumb: 'data:image/jpeg;base64,xx', keptAt: 1 }]).length);
record('D6 million-entries', 'capped 24 (linear scan cost noted)', () => { const arr = Array.from({ length: 1_000_000 }, (_, i) => ({ id: 'i' + i, day: 1, kind: 'day', caption: 'c', cartName: 'x', thumb: 'data:image/jpeg;base64,xx', keptAt: i })); const t0 = performance.now(); const out = parseAlbum(arr); return `kept=${out.length} in ${(performance.now() - t0).toFixed(0)}ms`; });
record('D7 day-out-of-range', 'rejected', () => parseAlbum([{ id: 'i1', day: 100000, kind: 'day', caption: 'c', cartName: 'x', thumb: 'data:image/jpeg;base64,xx', keptAt: 1 }]).length);

console.log(`\nTotal cases: ${n}`);
