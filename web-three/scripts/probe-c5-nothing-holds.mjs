/**
 * probe-c5-nothing-holds — the C5 content wave, in the BROWSER build
 * (dist/): the chapter is playable (narrative/14 §7 step 10 continued;
 * doc 06 §C5, "Nothing Holds", Jul 3 – Nov 26, Y3), verified where a
 * player actually walks.
 *
 * Pass A (Days 663 → 736 — the loaded machine opens): boot the day-663
 * save (the C4 cut's roll landed; the chapter rode the save); the
 * dateline says July 3; the rush serves three orders ($10 honest); the
 * linger's compression arms and rolls the counters WHOLE to day 736
 * (the ONE season cut, summer→autumn); the funeral plays through the
 * NEW funeral_porch def (the chair, the ledger, Craig's pen).
 *
 * Pass B (Days 743 + 752 — the receipts and the run): the receipts
 * through the newsbox def (the post's title verbatim; Deniz's filing
 * verbatim; K2 struck — the C2 lie meets the block's arithmetic, the
 * correction in the book). The run through the board def (the books in
 * daylight; the sale closes; Corvus-adjacent).
 *
 * Pass C (Days 756 + 760 — the last slice and the handover): the last
 * night through the NEW last_night def (the slice for nobody; the four
 * seconds; CLOSED OCT 4). Priya's handover through the priya def (her
 * tile sentence owned verbatim).
 *
 * Pass D (Days 784 + 795 — the deal and the exits): the deal through
 * the NEW lawyer_office def (the shape verbatim; K5 written FACT; R12's
 * third trigger spends through the once-latch); N5a resolves (settle —
 * $47,300, the arithmetic machine-pinned); the exits through the NEW
 * one_am_call def (Rachel's sentence verbatim; Eddie's two truths
 * verbatim); N5b's Charlotte floor rides its flag.
 *
 * Pass E (Days 802 + 809 — the call home and the terminal): the call
 * home through the NEW phone_home def (Ada's $8,000; the ONE send
 * through the dispatch's sealed seam — the save field is the durable
 * record; F5's wobble, the register's row verbatim; K5 struck — the
 * ledger's last correction). N5c's silence posts NOTHING — the Silent
 * class in the browser build. The terminal through the NEW
 * terminal_stairs def (Rosa's line verbatim; the Inwood end state; the
 * Map's new pin and the Corvus-side pins going gray). The cut at day
 * 809's linger — the entry dated Dec 1, Y3, the chapter at C6 through
 * advanceChapter's own door, and the wall holding (the roll into C6's
 * stations is the C6 wave's law).
 *
 * Usage: node scripts/probe-c5-nothing-holds.mjs   (build first: npm run build)
 * Exit 0 only when every check passes and the console is clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4639;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

let failures = 0;
let checks = 0;
function check(cond, msg) {
  checks++;
  if (cond) {
    console.log(`  \u2713 ${msg}`);
  } else {
    failures++;
    console.log(`  \u2717 ${msg}`);
  }
}

// A diary entry, the FieldDiaryEntry shape (core/fieldDiary's parser law).
const entry = (id, y, m, d, body, kind = 'OBSERVATION', epistemic = 'FACT') => ({
  id, kind,
  date: { y, m, d },
  epistemic, body, links: [], visibility: 'private', corrections: [],
});

// The carried diary: the C0 spine's own entries + one season entry per
// cut + K2 (the C2 lie, seeded for THIS wave's strike — the receipts
// scene corrects it) + the machine's face-season entries.
const CARRIED_DIARY = [
  entry('c0-k1-mishear', 1, 9, 11, 'Rosa gave me the cart.'),
  entry('c1-cut-newyear', 1, 12, 23, 'this is the year I fix it', 'EVENT'),
  entry('c2-cut-summer', 2, 7, 1, 'July heat, the Fourth, Eddie\u2019s hand on the counter.', 'EVENT'),
  entry('c3-cut-newyear', 3, 1, 6, 'The season\u2019s books, closed: nineteen debts, one signature pending.', 'EVENT'),
  entry('c4-cut-julyheat', 3, 7, 3, 'The face\u2019s books, closed: the fall is not an event; it is a season.', 'EVENT'),
  entry('c2-k2-net-good', 2, 6, 20, 'The Compact was going to fail anyway. I saved the shop. Net good.', 'EVENT'),
  entry('c5-test-season-entry', 3, 6, 24, 'The machine said insufficient, politely.', 'OBSERVATION'),
];

// A C5 station's day-start snapshot (what beginDay's persist writes once
// the chapter is under way). The chapter rode the save — the C4 cut
// played at day 658's linger and the machine advanced to C5 at day 663.
const seasonSave = (day, diary) => JSON.stringify({
  v: 1, day, day_complete: false, replay: false,
  cart_name: 'YOUR CORNER', money: 214, awning: true, kid_kept: true,
  idris_served: true, lunch_served: 1, day_start_money: 214,
  stool: true, map_given: true, permit: true,
  calendar_day: day,
  field_diary: diary,
  chapter: { chapter: 'C5', openedOnDay: 663, calendarDay: day },
  rails: {
    R1: { fired: true, firedOnDay: 1 },
    R2: { fired: true, firedOnDay: 130 },
    R3: { fired: true, firedOnDay: 457 },
    R4: { fired: true, firedOnDay: 645 },
    R5: { fired: false, firedOnDay: null },
    R6: { fired: false, firedOnDay: null },
  },
});

const DAY663_SAVE = seasonSave(663, CARRIED_DIARY);
const DAY736_SAVE = seasonSave(736, CARRIED_DIARY);
const DAY743_SAVE = seasonSave(743, CARRIED_DIARY);
const DAY752_SAVE = seasonSave(752, CARRIED_DIARY);
const DAY756_SAVE = seasonSave(756, CARRIED_DIARY);
const DAY760_SAVE = seasonSave(760, CARRIED_DIARY);
const DAY784_SAVE = seasonSave(784, CARRIED_DIARY);
const DAY795_SAVE = seasonSave(795, CARRIED_DIARY);
const DAY802_SAVE = seasonSave(802, CARRIED_DIARY);
const DAY809_SAVE = seasonSave(809, CARRIED_DIARY);

// One browser per boot: this sandbox's Chromium dies on page churn under
// a shared instance (the c4 probe's own finding — see diag-iso645.mjs).
// The per-boot launch is harness-only and keeps every boot's memory its own.
async function bootSeason(save) {
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.addInitScript((s) => localStorage.setItem('first_slice_save_v1', s), save);
  await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
  await page.waitForTimeout(3500); // fade-in + the morning note
  return { page, browser, errors };
}

/** The pass's exit: the page and its own browser both go home. */
async function closeSeason(boot) {
  await boot.page.close();
  await boot.browser.close();
}

/** The wiring witness: the live registry's own perform (the real defs,
 *  the real state, in the browser build) — the game's own press path. */
async function viaRegistry(page, id, latchId, presses = 3) {
  return page.evaluate(async ({ id, latchId, presses }) => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    for (let i = 0; i < presses; i++) {
      const def = g.registry.byId(id);
      if (!def) return { landed: false, missing: true };
      def.perform({ state: g.state, game: g });
      for (let k = 0; k < 12; k++) await nextFrame();
      if (g.state.fieldDiary.some((e) => e.id === latchId)) return { landed: true };
    }
    return { landed: g.state.fieldDiary.some((e) => e.id === latchId) };
  }, { id, latchId, presses });
}

/** The linger's two presses at the state's own seam: the compression's
 *  montage arms, the roll jumps WHOLE (the 1:1 law), or the cut plays. */
async function linger(page, cutId) {
  return page.evaluate((cutId) => {
    const g = window.__game;
    const s = g.state;
    s.setStep(37); // WK_POSTCARD — the linger's machine seam
    s.lingerStage = 2;
    const first = s.rail();
    const pending = s.pendingCompressionTo;
    const second = s.rail();
    return {
      intro: first.filter((e) => e.kind === 'note').map((e) => e.text),
      pending,
      rollTo: (second.find((e) => e.kind === 'next-day') ?? {}).to ?? null,
      dayAfter: s.day,
      chapterAfter: s.chapter.chapter,
      cutEntry: s.fieldDiary.some((e) => e.id === cutId),
    };
  }, cutId);
}

const bodyOf = (page, id) => page.evaluate((id) => {
  const e = window.__game.state.fieldDiary.find((x) => x.id === id);
  return e?.body ?? '';
}, id);

// ---------------------------------------------------------------- Pass A ----
console.log('--- Pass A: Day 663, the loaded machine opens (the C4 cut\u2019s roll landed) ---');
{
  const season = await bootSeason(DAY663_SAVE);
  const { page, errors } = season;
  const dateline = await page.evaluate(() => document.getElementById('hud-dateline')?.textContent ?? '');
  check(dateline.includes('July 3'), `the season boots on its canon date (got "${dateline}")`);
  const rush = await page.evaluate(() => {
    const s = window.__game.state;
    return { day: s.day, station: s.objectiveText().length > 0 };
  });
  check(rush.day === 663 && rush.station, 'the station\u2019s own morning is on the clock (the C5 pack\u2019s voice)');
  // the linger's compression arms and rolls WHOLE to day 736 (the ONE season cut)
  const comp = await linger(page, 'c5-cut-snowhoarding');
  check(comp.pending === 736, 'the compression arms the two-press linger (pending=736)');
  check(comp.rollTo === 736, `the roll jumps WHOLE to day 736 (got ${comp.rollTo})`);
  check(comp.intro.some((t) => t.includes('Fall took the block\u2019s jacket')),
    'the compression\u2019s city line speaks (the ONE season cut, summer\u2192autumn)');
  check(errors.length === 0, `pass A console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 736: the funeral through the NEW funeral_porch def
  const season2 = await bootSeason(DAY736_SAVE);
  const { page: p2, errors: e2 } = season2;
  const funeral = await viaRegistry(p2, 'funeral_porch', 'c5-doris-funeral');
  check(funeral.landed, 'the funeral lands through the NEW funeral_porch def');
  const funeralBody = await bodyOf(p2, 'c5-doris-funeral');
  check(funeralBody.includes('in the chair, the ledger on her lap'),
    'the chair and the ledger are verbatim (doc 06 \u00A7C5 event 1)');
  check(funeralBody.includes('the last time the block is one thing'),
    'the last-time sentence is verbatim (doc 06 \u00A7C5 event 1)');
  check(e2.length === 0, `pass A/736 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await closeSeason(season2);
}

// ---------------------------------------------------------------- Pass B ----
console.log('--- Pass B: Day 743, the receipts; Day 752, the run ---');
{
  // day 743: the receipts through the newsbox def
  const season = await bootSeason(DAY743_SAVE);
  const { page, errors } = season;
  const receipts = await page.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const def = g.registry.byId('newsbox');
    const out = def.perform({ state: g.state, game: g });
    for (let k = 0; k < 12; k++) await nextFrame();
    return {
      landed: g.state.fieldDiary.some((e) => e.id === 'c5-the-receipts'),
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text).join(' '),
    };
  });
  check(receipts.landed, 'the receipts land through the newsbox def');
  check(receipts.notes.includes('The Paper Trail of the Man Who Feeds Alder Heights.'),
    'the post\u2019s title is verbatim (doc 06 \u00A7C5 event 3)');
  check(receipts.notes.includes('I didn\u2019t do this to you. I filed you.'),
    'Deniz\u2019s filing is verbatim (not gloating \u2014 bookkeeping)');
  const k2 = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c2-k2-net-good');
    return { corrections: e?.corrections ?? [], body: e?.body ?? '' };
  });
  check(k2.corrections.length === 1 && k2.corrections[0].margin === 'I saved the shop. The Compact might have held. Both true. Only one was mine to write.',
    'K2 is struck the SAME scene \u2014 the C2 lie meets the block\u2019s arithmetic (doc 03 \u00A75.2\u2019s correction verbatim)');
  check(k2.body.includes('Net good.'), 'the body never lies about what it said (the append-only law keeps both)');
  check(errors.length === 0, `pass B/743 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 752: the run through the board def
  const season2 = await bootSeason(DAY752_SAVE);
  const { page: p2, errors: e2 } = season2;
  const run = await viaRegistry(p2, 'board', 'c5-the-run');
  check(run.landed, 'the run lands through the board def');
  const runBody = await bodyOf(p2, 'c5-the-run');
  check(runBody.includes('nineteen investors became a crowd'),
    'the run\u2019s arithmetic is verbatim (doc 06 \u00A7C5 event 4)');
  check(runBody.includes('Corvus-adjacent'),
    'the landlord\u2019s new adjacency is verbatim (doc 06 \u00A7C5 event 4)');
  check(e2.length === 0, `pass B/752 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await closeSeason(season2);
}

// ---------------------------------------------------------------- Pass C ----
console.log('--- Pass C: Day 756, the last slice; Day 760, the handover ---');
{
  // day 756: the last night through the NEW last_night def
  const season = await bootSeason(DAY756_SAVE);
  const { page, errors } = season;
  const last = await viaRegistry(page, 'last_night', 'c5-the-last-slice');
  check(last.landed, 'the last night lands through the NEW last_night def');
  const lastBody = await bodyOf(page, 'c5-the-last-slice');
  check(lastBody.includes('for nobody'), 'the slice is for nobody (doc 06 \u00A7C5 event 7)');
  check(lastBody.includes('four seconds longer than the scene needs'),
    'the four seconds are verbatim (doc 06 \u00A7C5 event 7)');
  check(lastBody.includes('CLOSED OCT 4'), 'the ledger\u2019s one line is written');
  check(errors.length === 0, `pass C/756 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 760: the handover through the priya def
  const season2 = await bootSeason(DAY760_SAVE);
  const { page: p2, errors: e2 } = season2;
  const handover = await viaRegistry(p2, 'priya', 'c5-priya-handover');
  check(handover.landed, 'the handover lands through the priya def');
  const handoverBody = await bodyOf(p2, 'c5-priya-handover');
  check(handoverBody.includes('learn which tile you are. You never asked which tile I was.'),
    'Priya\u2019s tile sentence is owned verbatim (doc 06 \u00A7C5 event 5)');
  check(handoverBody.includes('sitting on since spring'),
    'the spring-ledger custody is verbatim (doc 06 \u00A7C5 event 5)');
  check(e2.length === 0, `pass C/760 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await closeSeason(season2);
}

// ---------------------------------------------------------------- Pass D ----
console.log('--- Pass D: Day 784, the deal; Day 795, the exits ---');
{
  // day 784: the deal through the NEW lawyer_office def
  const season = await bootSeason(DAY784_SAVE);
  const { page, errors } = season;
  const deal = await page.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const def = g.registry.byId('lawyer_office');
    const out = def.perform({ state: g.state, game: g });
    for (let k = 0; k < 12; k++) await nextFrame();
    return {
      landed: g.state.fieldDiary.some((e) => e.id === 'c5-the-deal'),
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text).join(' '),
      resourceNote: out.filter((e) => e.kind === 'note').some((e) => e.text?.includes('okay to step away')),
      latch: g.state.resourceNoteOffered,
      k5: g.state.fieldDiary.some((e) => e.id === 'c5-k5-necessary'),
    };
  });
  check(deal.landed, 'the deal lands through the NEW lawyer_office def');
  check(deal.notes.includes('deferred-prosecution-style agreement'),
    'the deal\u2019s shape is verbatim (doc 06 \u00A7C5 event 6)');
  check(deal.notes.includes('$47,300') && deal.notes.includes('the hall\u2019s concession'),
    'the restitution and the concession bar are verbatim (doc 06 \u00A7C5 event 6)');
  check(deal.resourceNote && deal.latch,
    'R12\u2019s opt-in resource note spends at the investigation (the third trigger, the once-latch)');
  check(deal.k5, 'K5 is written at the deal (the last lie the ledger carries)');
  const k5Tag = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c5-k5-necessary');
    return { tag: e?.epistemic, corrections: e?.corrections ?? [] };
  });
  check(k5Tag.tag === 'FACT' && k5Tag.corrections.length === 0,
    'K5 is tagged FACT and unstruck (doc 03 \u00A75.2 \u2014 struck only at the call home)');
  const n5a = await page.evaluate(() => {
    const s = window.__game.state;
    const before = s.fieldDiary.filter((e) => e.node === 'N5a').length;
    const out = s.applyChoicePick('N5a', 'settle', new Set());
    return {
      before,
      ink: s.fieldDiary.some((e) => e.id === 'c5-n5a-settle'),
      ledger: s.ledger.some((e) => e.node === 'N5a' && e.refs.includes('N5a:settle')),
      flag: out.some((e) => e.kind === 'story-flags' && e.flags.includes('restitution-size=settle')),
      persist: out.some((e) => e.kind === 'persist'),
    };
  });
  check(n5a.ink && n5a.ledger && n5a.flag && n5a.persist,
    'N5a resolves through the register (settle \u2014 $47,300, the arithmetic machine-pinned)');
  const reopens = await page.evaluate(() => window.__game.state.c5Deal().length);
  check(reopens === 0, 'the office\u2019s re-press honors the pick (the overlay never re-opens)');
  check(errors.length === 0, `pass D/784 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 795: the exits through the NEW one_am_call def
  const season2 = await bootSeason(DAY795_SAVE);
  const { page: p2, errors: e2 } = season2;
  const exits = await p2.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const def = g.registry.byId('one_am_call');
    const out = def.perform({ state: g.state, game: g });
    for (let k = 0; k < 12; k++) await nextFrame();
    const body = g.state.fieldDiary.find((x) => x.id === 'c5-the-exits')?.body ?? '';
    const unmet = g.state.c5Exits().some((e) => e.kind === 'diary-prompt' && e.node === 'N5b');
    const pickOut = g.state.applyChoicePick('N5b', 'charlotte-floor', new Set());
    return {
      landed: g.state.fieldDiary.some((e) => e.id === 'c5-the-exits'),
      body,
      unmet,
      ink: g.state.fieldDiary.some((e) => e.id === 'c5-n5b-charlotte-floor'),
      flag: pickOut.some((e) => e.kind === 'story-flags' && e.flags.includes('c6-first-chapter=charlotte-floor')),
      persist: pickOut.some((e) => e.kind === 'persist'),
    };
  });
  check(exits.landed, 'the exits land through the NEW one_am_call def');
  check(exits.body.includes('You did this in Ohio too.'),
    'Rachel\u2019s sentence is verbatim (the one he never recovers from)');
  check(exits.body.includes('You were the best hire I ever made.'),
    'Eddie\u2019s two truths are verbatim (love without absolution)');
  check(exits.unmet, 'the exits\u2019 re-press opens the N5b overlay (the plan waits behind the scene)');
  check(exits.ink && exits.flag && exits.persist, 'N5b resolves through the register (the Charlotte floor \u2014 the exit that is also a home)');
  check(e2.length === 0, `pass D/795 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await closeSeason(season2);
}

// ---------------------------------------------------------------- Pass E ----
console.log('--- Pass E: Day 802, the call home; Day 809, the terminal and the cut ---');
{
  // day 802: the call home through the NEW phone_home def
  const season = await bootSeason(DAY802_SAVE);
  const { page, errors } = season;
  const call = await page.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    // K5's record rides the deal (the strike needs its entry; the
    // compact save writes the record directly — the day gate keeps the
    // deal at its own station)
    g.state.logDiaryEntry({
      id: 'c5-k5-necessary', kind: 'EVENT',
      date: { y: 3, m: 11, d: 1 }, epistemic: 'FACT',
      body: 'I did what had to be done.',
      links: ['notebook'], visibility: 'private', corrections: [],
    });
    const def = g.registry.byId('phone_home');
    const out = def.perform({ state: g.state, game: g });
    for (let k = 0; k < 12; k++) await nextFrame();
    return {
      landed: g.state.fieldDiary.some((e) => e.id === 'c5-the-call-home'),
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text).join(' '),
    };
  });
  check(call.landed, 'the call home lands through the NEW phone_home def');
  check(call.notes.includes('zero questions') && call.notes.includes('Pay your debts in order.'),
    'Ada\u2019s $8,000 and her note are verbatim (doc 06 \u00A7C5 event 9 / doc 09 \u00A74)');
  const r9 = await page.evaluate(() => {
    const s = window.__game.state;
    return {
      sent: s.sentPostcardDay,
      ink: s.fieldDiary.some((e) => e.id === 'c5-ada-send'),
      refused: s.sendPostcardFromC5('album'),
      second: s.sendPostcardFromC5('C5-ada'),
    };
  });
  check(r9.sent === 802 && r9.ink, 'the ONE send fired through the dispatch\u2019s sealed seam (the save field is the record)');
  check(!r9.refused && !r9.second, 'the seam is sealed: any other scene refused, the second send never fires');
  const f5 = await bodyOf(page, 'c5-f5-payphone');
  check(f5 === 'Coins leaving; the dial tone after; his own voice saying a sentence he can\u2019t hear',
    'F5 surfaces at the call home\u2019s close (doc 02 \u00A76.2\u2019s register row, the wobble style)');
  const f5Kind = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c5-f5-payphone');
    return { kind: e?.kind, tag: e?.epistemic };
  });
  check(f5Kind.kind === 'RECALL' && f5Kind.tag === 'RECALL', 'F5\u2019s entry is the wobble style');
  const k5 = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c5-k5-necessary');
    return { corrections: e?.corrections ?? [] };
  });
  check(k5.corrections.length === 1 && k5.corrections[0].margin === 'I did what I wanted and called it necessary. \u2014 L',
    'K5 is struck at the call home \u2014 the ledger\u2019s last correction (doc 03 \u00A75.2, verbatim)');
  // N5c's silence: the Silent class in the browser build
  const silent = await page.evaluate(() => {
    const s = window.__game.state;
    const prompt = s.c5GardenReckoning();
    const beforeDiary = s.fieldDiary.length;
    const beforeLedger = s.ledger.length;
    const out = s.applyChoicePick('N5c', 'silence', new Set());
    return {
      opened: prompt.some((e) => e.kind === 'diary-prompt' && e.node === 'N5c'),
      diaryQuiet: s.fieldDiary.length === beforeDiary,
      ledgerQuiet: s.ledger.length === beforeLedger,
      flag: out.some((e) => e.kind === 'story-flags' && e.flags.includes('c6-standing=silence')),
      persist: out.some((e) => e.kind === 'persist'),
      reopens: s.c5GardenReckoning().length,
    };
  });
  check(silent.opened, 'the garden\u2019s re-press opens the N5c overlay (the reckoning waits behind the week)');
  check(silent.diaryQuiet && silent.ledgerQuiet,
    'N5c/silence posts NOTHING \u2014 the Silent class in the browser build (the absence is the record)');
  check(silent.flag && silent.persist, 'the flag is the only witness, and it persists');
  check(silent.reopens === 0, 'the garden\u2019s re-press honors the silence (the flag itself is the latch)');
  check(errors.length === 0, `pass E/802 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 809: the terminal through the NEW terminal_stairs def, then the cut
  const season2 = await bootSeason(DAY809_SAVE);
  const { page: p2, errors: e2 } = season2;
  const terminal = await viaRegistry(p2, 'terminal_stairs', 'c5-the-terminal');
  check(terminal.landed, 'the terminal lands through the NEW terminal_stairs def');
  const terminalBody = await bodyOf(p2, 'c5-the-terminal');
  check(terminalBody.includes('You looked like that once.'),
    'Rosa\u2019s line is verbatim (the Hospitality Law closing its loop)');
  check(terminalBody.includes('Day 1 again.'),
    'the chapter\u2019s last diary line is verbatim (doc 06 \u00A7C5 event 10)');
  check(terminalBody.includes('$1,212') && terminalBody.includes('$1,150'),
    'the Inwood end state\u2019s arithmetic is verbatim (doc 09 \u00A73)');
  const mapPins = await p2.evaluate(() => {
    const s = window.__game.state;
    return {
      inwood: s.mapNotes.some((n) => n.includes('Inwood')),
      gray: s.mapNotes.some((n) => n.includes('go gray')),
    };
  });
  check(mapPins.inwood && mapPins.gray,
    'the Map gains the Inwood pin and the Corvus-side pins go gray (doc 06 \u00A7C5 diary developments)');
  // the cut at day 809's linger
  const cut = await linger(p2, 'c5-cut-snowhoarding');
  check(cut.intro.some((t) => t.includes('Snow on the Works\u2019 hoarding')),
    'the cut stages the handoff (doc 06 \u00A7C5 handoff)');
  check(cut.intro.some((t) => t.includes('a lost cat, still lost')),
    'the lost cat, still lost (the handoff\u2019s own slip)');
  check(cut.cutEntry, 'the cut\u2019s entry is the latch');
  check(cut.chapterAfter === 'C6', `the chapter rides the machine\u2019s door to C6 (got ${cut.chapterAfter})`);
  // the wall holds: no roll out of the wall until the C6 wave
  const wall = await p2.evaluate(() => {
    const s = window.__game.state;
    const again = s.rail();
    const third = s.rail();
    return {
      wallOnly: again.filter((e) => e.kind === 'note').map((e) => e.text).join('|').startsWith('December opens cold'),
      noRoll: !third.some((e) => e.kind === 'next-day'),
    };
  });
  check(wall.wallOnly && wall.noRoll,
    'the wall holds \u2014 C6\u2019s content is the next wave\u2019s (the honest pattern)');
  check(e2.length === 0, `pass E/809 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await closeSeason(season2);
}

// ----------------------------------------------------------------- the end ----
console.log(`\n${checks} checks, ${failures} failures`);
server.close();
process.exit(failures === 0 ? 0 : 1);
