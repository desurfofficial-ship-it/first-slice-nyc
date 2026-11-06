/**
 * RECONCILIATION BATTERY — FIRST SLICE security audit R2
 * Re-tests every original finding (FS-AUDIT-001..008 evidence surface)
 * plus the NEW WP-2v epochMap validation surface, against the ACTUAL
 * production modules at origin/main @ 62a6244cee258a243fdb308bd78daf7793c62cc5.
 *
 * Modules: disposable copies with import-path-only rewrites
 * (proof: evidence/IMPORT-PATH-DIFF-PROOF.txt) + Album.ts imported
 * from the read-only worktree unmodified (no relative imports).
 *
 * No dependency installation, no network, no game boot, no browser.
 */
import { parseSave } from './copy/src/core/Save.ts';
import { parseWorldSave } from './copy/src/sim/state.ts';
import { GameClock, calendarOf } from './copy/src/sim/clock.ts';
import {
  simTickOfStoryDay, datelineOfStoryDay, epochAgreement, calendarDayForStoryDay,
} from './copy/src/sim/epochMap.ts';
import { parseAlbum } from '/home/z/my-project/repos/fsn-audit-main/web-three/src/postcard/Album.ts';

let n = 0;
function record(id: string, expect: string, run: () => string): void {
  n++;
  try {
    console.log(`[${id}] expect=${expect} | observed: ${run()}`);
  } catch (err) {
    console.log(`[${id}] expect=${expect} | observed: THREW ${(err as Error).constructor.name}: ${(err as Error).message.slice(0, 110)}`);
  }
}
const big = (len: number, ch = 'A') => ch.repeat(len);

const baseDoc = () => ({
  magic: 'first-slice-world', version: 1, worldId: 'alder_heights',
  seed: 19940909, clock: { day: 1, minuteOfDay: 460 },
  player: { npcId: 'npc:leo_marsh', homePlaceId: 'KTS-02', moneyCents: 8700 },
  npcs: [], relationships: [], businesses: [],
  ledger: { txns: [], seq: 0 }, flags: [],
  chapter: { chapter: 0, rails: {}, calendarDay: 0 },
  missable: [], consequences: [], events: [], environment: {},
});

console.log('================================================================');
console.log('FIRST SLICE — R2 RECONCILIATION BATTERY @ origin/main 62a6244');
console.log('================================================================');

console.log('\n===== R1. STORY SAVE (core/Save.ts @62a6244) — FS-AUDIT-004 still present? =====');
record('R1.1 day-99999', 'clamped to 4 (unchanged)', () => parseSave(JSON.stringify({ day: 99999 })).day);
record('R1.2 money-1e15', 'ACCEPTED — FS-AUDIT-004 stands', () => parseSave(JSON.stringify({ money: 1e15 })).money);
record('R1.3 money-str-1e15', 'ACCEPTED — FS-AUDIT-004 stands', () => parseSave(JSON.stringify({ money: '1e15' })).money);
record('R1.4 cart_name-1MB', 'ACCEPTED len=1000000 — FS-AUDIT-004 stands', () => { const s = parseSave(JSON.stringify({ cart_name: big(1_000_000) })); return `len=${s.cart_name.length}`; });
record('R1.5 calendar_day-1e15', 'clamped 36500 (clamp intact)', () => parseSave(JSON.stringify({ calendar_day: 1e15 })).calendar_day);
record('R1.6 proto-pollution', 'still neutralized (A22 regression check)', () => {
  const s = parseSave('{"__proto__":{"polluted":"yes"},"money":100}');
  const probe = {} as Record<string, unknown>;
  return `polluted=${(probe as { polluted?: string }).polluted ?? 'NO'} money=${s.money}`;
});

console.log('\n===== R2. WORLD SAVE (sim/state.ts @62a6244) — FS-AUDIT-002 still present? =====');
record('R2.1 missing-ledger', 'THROWS (finding stands)', () => { const d: Record<string, unknown> = baseDoc(); delete d.ledger; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('R2.2 missing-clock', 'THROWS (finding stands)', () => { const d: Record<string, unknown> = baseDoc(); delete d.clock; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('R2.3 missing-player', 'THROWS (finding stands)', () => { const d: Record<string, unknown> = baseDoc(); delete d.player; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('R2.4 relationships-5', 'THROWS (finding stands)', () => { const d: Record<string, unknown> = baseDoc(); d.relationships = 5; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('R2.5 ledger.txns-5', 'THROWS (finding stands)', () => { const d: Record<string, unknown> = baseDoc(); d.ledger = { txns: 5, seq: 0 }; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('R2.6 wrong-magic', 'fresh (validated refusal intact, B8)', () => { const d = baseDoc(); (d as { magic: string }).magic = 'not-ours'; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('R2.7 future-version-99', 'fresh (validated refusal intact, B9)', () => { const d: Record<string, unknown> = baseDoc(); d.version = 99; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source}`; });
record('R2.8 valid-minimal', 'restored (B1 regression check)', () => { const r = parseWorldSave(JSON.stringify(baseDoc())); return `source=${r.source} notes=${r.notes.length} day=${r.world.clock.day} money=${r.world.player.moneyCents}`; });

console.log('\n===== R3. ECONOMIC RE-DERIVATION (sim/state.ts @62a6244) — FS-AUDIT-003 still present? =====');
record('R3.1 money-1e12', 'restored, ZERO notes (finding stands, B11)', () => {
  const d = baseDoc();
  (d.player as { moneyCents: number }).moneyCents = 1e12;
  const r = parseWorldSave(JSON.stringify(d));
  return `source=${r.source} money=${r.world.player.moneyCents} notes=[${r.notes.join(' | ').slice(0, 120)}] notesLen=${r.notes.length}`;
});

console.log('\n===== R4. CLOCK (sim/clock.ts @62a6244) — FS-AUDIT-005 still present? =====');
record('R4.1 world-save-day-1e15', 'accepted (B12: no clamp)', () => { const d: Record<string, unknown> = baseDoc(); d.clock = { day: 1e15, minuteOfDay: 600 }; const r = parseWorldSave(JSON.stringify(d)); return `source=${r.source} day=${r.world.clock.day}`; });
record('R4.2 GameClock-day-1e15', 'accepted unclamped (C3: finding stands)', () => new GameClock({ day: 1e15 }).day);
(() => { const t0 = performance.now(); calendarOf(1e7); const dt = performance.now() - t0; console.log(`[R4.3] calendarOf(1e7) in ${dt.toFixed(2)}ms (linear growth unchanged, C1)`); })();
record('R4.4 weekday-huge-clock', 'O(1) modulo — no hang on boot (C4)', () => new GameClock({ day: 1e15 }).weekday);

console.log('\n===== R5. NEW SURFACE: sim/epochMap.ts (WP-2v @62a6244) — validation front door =====');
record('R5.1 simTickOfStoryDay(1)', '460 (the 7:40 platform)', () => simTickOfStoryDay(1));
record('R5.2 simTickOfStoryDay(4)', '4780', () => simTickOfStoryDay(4));
record('R5.3 datelineOfStoryDay(1)', 'canon string (print)', () => datelineOfStoryDay(1));
record('R5.4 datelineOfStoryDay(1e15)', 'THROWS (strict front door)', () => datelineOfStoryDay(1e15));
record('R5.5 simTickOfStoryDay(0)', 'THROWS', () => simTickOfStoryDay(0));
record('R5.6 simTickOfStoryDay(NaN)', 'THROWS', () => simTickOfStoryDay(NaN));
record('R5.7 simTickOfStoryDay(1.5)', 'THROWS (fraction)', () => simTickOfStoryDay(1.5));
record('R5.8 simTickOfStoryDay(36501)', 'THROWS (past ceiling)', () => simTickOfStoryDay(36501));
record('R5.9 epochAgreement()', 'agreed=true (epochs consistent)', () => { const r = epochAgreement(); return `agreed=${r.agreed} issues=${r.issues.length}`; });
record('R5.10 calendarDayForStoryDay(2, 1e15)', 'clamped 36500', () => calendarDayForStoryDay(2, 1e15));
record('R5.11 calendarDayForStoryDay(2, NaN)', 'junk → story day 2 (tolerant read law)', () => calendarDayForStoryDay(2, NaN));

console.log('\n===== R6. ALBUM (postcard/Album.ts @62a6244, imported in-place) — FS-AUDIT-006 still present? =====');
record('R6.1 javascript-thumb', 'rejected (D2 regression check)', () => parseAlbum([{ id: 'i1', day: 1, kind: 'day', caption: 'c', cartName: 'x', thumb: 'javascript:alert(1)', keptAt: 1 }]).length);
record('R6.2 svg-thumb', 'ACCEPTED (D3: finding stands)', () => parseAlbum([{ id: 'i1', day: 1, kind: 'day', caption: 'c', cartName: 'x', thumb: 'data:image/svg+xml,<svg onload=alert(1)>', keptAt: 1 }]).length);
record('R6.3 valid-png-thumb', 'kept=1 (normal path intact)', () => parseAlbum([{ id: 'i1', day: 1, kind: 'day', caption: 'c', cartName: 'x', thumb: 'data:image/jpeg;base64,xx', keptAt: 1 }]).length);
record('R6.4 oversized-cartName-50', 'rejected (Album.ts:77 cap intact)', () => parseAlbum([{ id: 'i1', day: 1, kind: 'day', caption: 'c', cartName: big(50), thumb: 'data:image/jpeg;base64,xx', keptAt: 1 }]).length);

console.log('\n===== R7. WIPE SEAM (core/Save.ts @62a6244) — FS-AUDIT-001 destructive primitive =====');
import { wipeSave, writeSave, loadSave } from './copy/src/core/Save.ts';
(() => {
  const m = new Map<string, string>();
  const store = {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  } as unknown as Storage;
  writeSave({ ...loadSave(store), day: 4, money: 240, cart_name: 'Corner Light' }, store);
  const pre = JSON.stringify({ day: loadSave(store).day, money: loadSave(store).money });
  wipeSave(store);
  const post = JSON.stringify(loadSave(store));
  console.log(`[R7.1] expect=seeded save present | observed: pre-wipe ${pre}`);
  console.log(`[R7.2] expect=key removed, defaults restored (finding stands) | observed: post-wipe ${post}`);
  n += 2;
})();

console.log(`\nTotal R-cases executed: ${n}`);
console.log('Modules under test: origin/main @ 62a6244cee258a243fdb308bd78daf7793c62cc5 (read-only worktree)');
console.log('Static source facts cross-checked in the same session (bash, byte-identical diffs):');
console.log('  - autotest.ts / scenario.ts / Save.ts:271-277 / clock.ts / state.ts / runtime.ts: UNCHANGED vs 7995e6e (git diff = 0 lines)');
console.log('  - Game.ts dispatch ?autotest/?scenario: STILL PRESENT at lines 469-471 / 477-480 (pause-set edit only)');
console.log('  - deploy-pages.yml: UNCHANGED (FS-AUDIT-008 stands)');
console.log('  - advanceMinutes sanity cap 14400 (sim/runtime.ts:364-371) unchanged');
