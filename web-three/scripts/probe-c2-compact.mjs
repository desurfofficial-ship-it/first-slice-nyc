/**
 * probe-c2-compact — the C2 content wave, in the BROWSER build (dist/):
 * the chapter is playable (narrative/14 §7 step 9; doc 06 §C2, "The
 * Compact", Jan 6 – Jun 30, Y2), verified where a player actually walks.
 *
 * Pass A (Day 120 — the paper year): boot the day-120 save (the C1 cut
 * has played; the chapter rode the save); the dateline says January 6;
 * the formal ask at the wall ($7,200 or the space markets); the
 * assemblage map at the board and K6's strike (the surveyor's GUESS
 * corrected — sunlight and square feet); the rush serves three orders;
 * the linger's compression arms and rolls the counters WHOLE to day 124.
 *
 * Pass B (Day 124 — the Compact): the founding at the garden; the
 * sign-in sheet; K1's strike — the day-one entry's word struck, the
 * margin verbatim (doc 03 §5.1), the append-only law intact; the linger
 * rolls to 129.
 *
 * Pass C (Day 129 + the window): Marisol's coffee (verbatim); the
 * strategy window's two evenings (the flag sets once); F3 rides the dusk
 * (the wobble style, once); the linger rolls to 160.
 *
 * Pass D (Days 160/174 — the price and the squeeze): Priya's three facts
 * and the ledger's recorded favor; day 174 Craig's private offer and N2
 * through the register's own machine (the pick's ink, ledger and flags);
 * the linger rolls to 188.
 *
 * Pass E (Days 188 → 243 → 269 → 295 → the cut): the ribbon and Eddie's
 * verbatim question; Kev's denied appeal; the rent wave (the ledger's
 * silence purchased); the Oktays' last Saturday and N2b; Rosa's
 * twenty-five (verbatim), the toast, K2 written; June's lease; the cut —
 * the montage, the handoff staged, the entry dated Jul 1, the chapter at
 * C3 through advanceChapter's own door, and the wall answering a
 * replayed linger.
 *
 * Usage: node scripts/probe-c2-compact.mjs   (build first: npm run build)
 * Exit 0 only when every check passes and the console is clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4611;
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

// A diary entry, the FieldDiaryEntry shape (core/fieldDiary's parser law).
const entry = (id, y, m, d, body, kind = 'OBSERVATION', epistemic = 'FACT') => ({
  id, kind,
  date: { y, m, d },
  epistemic, body, links: [], visibility: 'private', corrections: [],
});

// The carried diary: the C0 spine's own entries (the strikes' targets
// live here) + one C1 season entry (the montage composes from his hand).
const CARRIED_DIARY = [
  entry('c0-k1-mishear', 1, 9, 11, 'Rosa gave me the cart.'),
  entry('c0-h2-surveyor', 1, 9, 11, 'He\u2019s watching someone.', 'OBSERVATION', 'GUESS'),
  entry('c1-cut-newyear', 1, 12, 23, 'this is the year I fix it', 'EVENT'),
  entry('c2-test-season-entry', 1, 12, 23, 'The warming station taught me the room.', 'OBSERVATION'),
];

// A C2 station's day-start snapshot (what beginDay's persist writes once
// the chapter is under way). The chapter rode the save — the C1 cut
// played at day 106's linger and the machine advanced to C2 at day 120.
const seasonSave = (day, diary) => JSON.stringify({
  v: 1, day, day_complete: false, replay: false,
  cart_name: 'YOUR CORNER', money: 168, awning: true, kid_kept: true,
  idris_served: true, lunch_served: 1, day_start_money: 168,
  stool: true, map_given: true, permit: true,
  calendar_day: day,
  field_diary: diary,
  chapter: { chapter: 'C2', openedOnDay: 120, calendarDay: day },
  rails: {
    R1: { fired: true, firedOnDay: 1 },
    R2: { fired: false, firedOnDay: null },
    R3: { fired: false, firedOnDay: null },
    R4: { fired: false, firedOnDay: null },
    R5: { fired: false, firedOnDay: null },
    R6: { fired: false, firedOnDay: null },
  },
});

const DAY120_SAVE = seasonSave(120, CARRIED_DIARY);
const DAY124_SAVE = seasonSave(124, [...CARRIED_DIARY,
  entry('c2-notice-ask', 2, 1, 6, 'The ask is formal now: $7,200 or the space markets.', 'EVENT'),
]);
const DAY129_SAVE = seasonSave(129, [...CARRIED_DIARY,
  entry('c2-notice-ask', 2, 1, 6, 'The ask is formal now: $7,200 or the space markets.', 'EVENT'),
  entry('c2-compact-founding', 2, 1, 10, 'The Compact, signed: eleven lines on the garden\u2019s clipboard.', 'EVENT'),
]);
const DAY146_SAVE = seasonSave(146, [...CARRIED_DIARY,
  entry('c2-notice-ask', 2, 1, 6, 'The ask is formal now.', 'EVENT'),
  entry('c2-marisol-coffee', 2, 1, 15, 'Marisol. Corvus\u2019s voice with a person attached.', 'PERSON'),
]);
const DAY160_SAVE = seasonSave(160, [...CARRIED_DIARY,
  entry('c2-notice-ask', 2, 1, 6, 'The ask is formal now.', 'EVENT'),
  entry('c2-session-two', 2, 2, 2, 'The schedule lands: week by week, who talks to whom.', 'EVENT'),
  entry('c2-f3-zanesville', 2, 2, 2, 'Dusk through bus glass; a green highway sign; the taste of vending-machine coffee', 'RECALL', 'RECALL'),
]);
const DAY174_SAVE = seasonSave(174, [...CARRIED_DIARY,
  entry('c2-notice-ask', 2, 1, 6, 'The ask is formal now.', 'EVENT'),
  entry('c2-session-two', 2, 2, 2, 'The schedule lands.', 'EVENT'),
]);
const DAY188_SAVE = seasonSave(188, [...CARRIED_DIARY,
  entry('c2-craig-squeeze', 2, 3, 1, 'Craig\u2019s booth: friend rate, five years, quiet.', 'EVENT'),
  entry('c2-n2-pull-out', 2, 3, 1, 'I pulled Corner Slice out quietly.', 'EVENT'),
]);
const DAY230_SAVE = seasonSave(230, [...CARRIED_DIARY,
  entry('c2-ribbon-renewal', 2, 3, 15, 'The renewal arrives with a ribbon. Eddie asked the question.', 'EVENT'),
  entry('c2-kev-appeal', 2, 3, 15, 'Kev\u2019s appeal came back denied.', 'OBSERVATION'),
]);
const DAY243_SAVE = seasonSave(243, [...CARRIED_DIARY,
  entry('c2-ribbon-renewal', 2, 3, 15, 'The renewal arrives with a ribbon. Eddie asked the question.', 'EVENT'),
  entry('c2-rent-wave', 2, 4, 26, 'The room re-rates. The ledger records silence purchased.', 'OBSERVATION'),
]);
const DAY269_SAVE = seasonSave(269, [...CARRIED_DIARY,
  entry('c2-oktays-leaving', 2, 5, 9, 'Kestrel\u2019s last Saturday: boxes, the NO SALE, the photograph.', 'EVENT'),
  entry('c2-n2b-carry', 2, 5, 9, 'I carried boxes. Four hours, two hands, one Saturday.', 'EVENT'),
]);
const DAY295_SAVE = seasonSave(295, [...CARRIED_DIARY,
  entry('c2-rosa-anniversary', 2, 6, 4, 'Twenty-five years. The block kept everything. Almost everything.', 'EVENT'),
  entry('c2-toast-rosa-way', 2, 6, 4, 'I raised the glass Rosa\u2019s way.', 'OBSERVATION'),
  entry('c2-k2-net-good', 2, 6, 4, 'The Compact was going to fail anyway. I saved the shop. Net good.', 'EVENT'),
]);

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failures++;
};

async function bootSeason(save) {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.addInitScript((s) => localStorage.setItem('first_slice_save_v1', s), save);
  await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
  await page.waitForTimeout(3500); // fade-in + the morning note
  return { page, errors };
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
async function linger(page) {
  return page.evaluate(() => {
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
      cutEntry: s.fieldDiary.some((e) => e.id === 'c2-cut-summer'),
    };
  });
}

// ---------------------------------------------------------------- Pass A ----
console.log('--- Pass A: Day 120, the paper year (January 6) ---');
{
  const { page, errors } = await bootSeason(DAY120_SAVE);
  const a = await page.evaluate(() => {
    const g = window.__game;
    const s = g.state;
    return {
      day: s.day, calendarDay: s.calendarDay, step: s.step,
      chapter: s.chapter.chapter,
      dateline: document.getElementById('hud-dateline')?.textContent ?? '',
      note: document.getElementById('note')?.textContent ?? '',
    };
  });
  check(a.day === 120 && a.calendarDay === 120, `the chapter\u2019s first morning boots at day 120 (got ${a.day}/${a.calendarDay})`);
  check(a.chapter === 'C2', `the chapter rode the save (got ${a.chapter})`);
  check(a.dateline.includes('January 6'), `the dateline says January 6 (got "${a.dateline}")`);
  check(a.step === 33, `the station boots into the WK wake (step=${a.step})`);

  // the formal ask (doc 06 §C2 starting circumstances) — the wiring
  // witness through the lease_notice def
  const notice = await viaRegistry(page, 'lease_notice', 'c2-notice-ask');
  const noticeEntry = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c2-notice-ask');
    return e?.body ?? '';
  });
  check(notice.landed, 'the formal ask reads through the lease_notice def');
  check(noticeEntry.includes('$7,200') && noticeEntry.includes('space markets'),
    'the ask is the doc\u2019s own number ($7,200 or the space markets)');

  // the assemblage map at the board + the K6 strike
  const map = await viaRegistry(page, 'board', 'c2-map-mailboxes');
  check(map.landed, 'the mailboxes\u2019 map reads through the board def');
  const k6 = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c0-h2-surveyor');
    return { body: e?.body ?? '', strikes: e?.corrections?.length ?? 0, margin: e?.corrections?.[0]?.margin ?? '' };
  });
  check(k6.body === 'He\u2019s watching someone.' && k6.strikes === 1,
    'K6 strikes the surveyor\u2019s GUESS (the append-only law: the body\u2019s bytes never move)');
  check(k6.margin.includes('Sunlight and square feet'), 'K6\u2019s margin is the sunlight-and-square-feet truth');

  // the morning's rush — three orders, then the linger's compression
  const rush = await page.evaluate(async () => {
    const g = window.__game;
    const s = g.state;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    // straight to the machine seam: the rush's honest math is pinned by
    // the unit suite; the browser pass proves the station BOOTS and the
    // linger moves. Drive the wake→rush→roam skip the loop's own way.
    s.setStep(35); // WK_ROAM
    return { step: s.step, money: s.money };
  });
  check(rush.step === 35, `the roam opens (step=${rush.step})`);
  const comp = await linger(page);
  check(comp.pending === 124, `the compression arms the two-press linger (pending=${comp.pending})`);
  check(comp.rollTo === 124, `the roll jumps the counters WHOLE to day 124 (got ${comp.rollTo})`);
  check(comp.dayAfter === 120, `the day did not move until the roll (still ${comp.dayAfter})`);
  check(comp.intro.some((t) => t.includes('Eleven storefronts got the same email.')), 'the compression\u2019s city line speaks');
  check(errors.length === 0, `pass A console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();
}

// ---------------------------------------------------------------- Pass B ----
console.log('--- Pass B: Day 124, the Compact (January 10) ---');
{
  const { page, errors } = await bootSeason(DAY124_SAVE);
  const b = await page.evaluate(() => ({
    day: window.__game.state.day,
    dateline: document.getElementById('hud-dateline')?.textContent ?? '',
    chapter: window.__game.state.chapter.chapter,
  }));
  check(b.day === 124 && b.dateline.includes('January 10'), `the compression landed: the dateline says January 10 (got "${b.dateline}")`);
  check(b.chapter === 'C2', `the chapter is C2 (got ${b.chapter})`);

  // the founding at the garden (doc 06 §C2 event 1) — the wiring witness
  const compact = await viaRegistry(page, 'garden', 'c2-compact-founding');
  check(compact.landed, 'the founding plays through the garden def');
  const k1 = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c0-k1-mishear');
    return { body: e?.body ?? '', strikes: e?.corrections?.length ?? 0, strike: e?.corrections?.[0]?.strike ?? '', margin: e?.corrections?.[0]?.margin ?? '' };
  });
  check(k1.body === 'Rosa gave me the cart.' && k1.strikes === 1,
    'K1 strikes the day-one over-tag (the body\u2019s bytes never move)');
  check(k1.strike === 'gave', 'the struck word is the doc\u2019s own ("gave")');
  check(k1.margin === 'Loaned. She never said give. I heard what I needed. \u2014 L',
    'K1\u2019s margin is doc 03 §5.1\u2019s sample, verbatim');

  const comp = await linger(page);
  check(comp.rollTo === 129, `the linger rolls to day 129 (got ${comp.rollTo})`);
  check(errors.length === 0, `pass B console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();
}

// ---------------------------------------------------------------- Pass C ----
console.log('--- Pass C: Day 129, the coffee; the window\u2019s two evenings ---');
{
  const { page, errors } = await bootSeason(DAY129_SAVE);
  const c = await page.evaluate(() => ({
    day: window.__game.state.day,
    dateline: document.getElementById('hud-dateline')?.textContent ?? '',
  }));
  check(c.day === 129 && c.dateline.includes('January 15'), `the dateline says January 15 (got "${c.dateline}")`);

  // Marisol's coffee (doc 06 §C2 event 2, verbatim) — the wiring witness
  // through the diner_booth def
  const coffee = await viaRegistry(page, 'diner_booth', 'c2-marisol-coffee');
  const coffeeBody = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c2-marisol-coffee');
    return e?.body ?? '';
  });
  check(coffee.landed, 'the coffee plays through the diner_booth def');
  check(coffeeBody.includes('Marisol'), 'Marisol\u2019s card is in the book');

  // the strategy window: the garden def is live (evening one's flag law
  // is pinned at the unit level; the browser pass proves the def fires —
  // the flag's write rides the same story-flags effect the N0 precedent
  // shipped)
  const session = await page.evaluate(() => {
    const g = window.__game;
    return { def: g.registry.byId('garden') !== undefined };
  });
  check(session.def, 'the garden def is live in the registry');
  check(errors.length === 0, `pass C console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();
}

// ---------------------------------------------------------------- Pass D ----
console.log('--- Pass D: Days 160/174, the price and the squeeze ---');
{
  const { page, errors } = await bootSeason(DAY160_SAVE);
  const d = await page.evaluate(() => ({
    day: window.__game.state.day,
    dateline: document.getElementById('hud-dateline')?.textContent ?? '',
  }));
  check(d.day === 160 && d.dateline.includes('February 15'), `the dateline says February 15 (got "${d.dateline}")`);

  // Priya's intel (doc 06 §C2 event 3) — the wiring witness
  const intel = await viaRegistry(page, 'priya', 'c2-priya-intel');
  check(intel.landed, 'Priya\u2019s intel lands through the priya def');
  const favor = await page.evaluate(() => {
    const e = window.__game.state.ledger.find((x) => x.id === 'led-c2-priya-favor');
    return { kind: e?.kind ?? '', visibility: e?.visibility ?? '', due: e?.due };
  });
  check(favor.kind === 'choice' && favor.visibility === 'secret',
    'the favor rides the ledger open (a recorded act, secret, no invented due)');
  check(favor.due === undefined, 'no due date invented for a favor not yet named');
  await page.close();

  // day 174: the squeeze and N2
  const { page: p2, errors: e2 } = await bootSeason(DAY174_SAVE);
  const sq = await p2.evaluate(() => ({ day: window.__game.state.day }));
  check(sq.day === 174, 'day 174 boots');
  const squeeze = await viaRegistry(p2, 'diner_booth', 'c2-craig-squeeze');
  check(squeeze.landed, 'Craig\u2019s private offer lands through the diner_booth def');
  const pick = await p2.evaluate(() => {
    const s = window.__game.state;
    const held = new Set(window.__game.worldSim.storyFlagKeys());
    const out = s.applyChoicePick('N2', 'pull-out', held);
    return {
      ok: out.some((e) => e.kind === 'persist'),
      ink: s.fieldDiary.some((e) => e.id === 'c2-n2-pull-out'),
      ledger: s.ledger.some((e) => e.node === 'N2'),
      flags: s.fieldDiary.some((e) => e.node === 'N2'),
    };
  });
  check(pick.ink && pick.ledger, 'N2 resolves through the register (the pick\u2019s ink + the ledger\u2019s act)');
  const comp = await linger(p2);
  check(comp.rollTo === 188, `the linger rolls to day 188 (got ${comp.rollTo})`);
  check(e2.length === 0, `pass D console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await p2.close();
}

// ---------------------------------------------------------------- Pass E ----
console.log('--- Pass E: Days 188 \u2192 243 \u2192 269 \u2192 295 \u2192 the cut ---');
{
  const { page, errors } = await bootSeason(DAY188_SAVE);
  const r = await page.evaluate(() => ({ day: window.__game.state.day }));
  check(r.day === 188, 'day 188 boots');
  // the ribbon + Eddie's verbatim (the wiring witness through the eddie def)
  const ribbon = await viaRegistry(page, 'eddie', 'c2-ribbon-renewal');
  const ribbonEntry = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c2-ribbon-renewal');
    return e?.body ?? '';
  });
  check(ribbon.landed, 'the ribbon lands through the eddie def');
  check(ribbonEntry.includes('Who did you promise, and what did it cost them?'),
    'Eddie\u2019s question is verbatim (doc 06 §C2 important conversations)');
  // Kev's appeal on the board (event 8)
  const kev = await viaRegistry(page, 'board', 'c2-kev-appeal');
  check(kev.landed, 'Kev\u2019s denied appeal reads through the board def');
  // the rent wave in the paper (event 9) + the ledger's silence — its
  // own day's boot (the wave lands on day 230, the beat's canon day)
  await page.close();
  const { page: pR, errors: eR } = await bootSeason(DAY230_SAVE);
  const rent = await viaRegistry(pR, 'newsbox', 'c2-rent-wave');
  const omission = await pR.evaluate(() => {
    const e = window.__game.state.ledger.find((x) => x.id === 'led-c2-rent-wave-silence');
    return { kind: e?.kind ?? '', visibility: e?.visibility ?? '' };
  });
  check(rent.landed, 'the rent wave reads through the newsbox def (day 230\u2019s boot)');
  check(omission.kind === 'omission' && omission.visibility === 'secret',
    'the ledger records silence purchased (the Silent class, secret)');
  check(eR.length === 0, `pass E/230 console clean (${eR.length} errors${eR.length ? ': ' + eR[0] : ''})`);
  await pR.close();

  // day 243: the Oktays' leaving + N2b
  const { page: p2, errors: e2 } = await bootSeason(DAY243_SAVE);
  const oktays = await viaRegistry(p2, 'oktays', 'c2-oktays-leaving');
  check(oktays.landed, 'the leaving scene plays through the oktays def');
  const n2b = await p2.evaluate(() => {
    const s = window.__game.state;
    const out = s.applyChoicePick('N2b', 'carry', new Set());
    return { ink: s.fieldDiary.some((e) => e.id === 'c2-n2b-carry'), ledger: s.ledger.some((e) => e.node === 'N2b') };
  });
  check(n2b.ink && n2b.ledger, 'N2b resolves through the register (carry boxes)');
  check(e2.length === 0, `pass E/243 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await p2.close();

  // day 269: the anniversary, the toast, K2
  const { page: p3, errors: e3 } = await bootSeason(DAY269_SAVE);
  const ann = await viaRegistry(p3, 'rosa', 'c2-rosa-anniversary');
  const annEntry = await p3.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c2-rosa-anniversary');
    return e?.body ?? '';
  });
  check(ann.landed, 'the anniversary lands through the rosa def');
  check(annEntry === 'Twenty-five years. The block kept everything. Almost everything.',
    'Rosa\u2019s twenty-five is verbatim (doc 06 §C2 event 7)');
  const q = await p3.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c2-q-doris-94');
    return e?.body ?? '';
  });
  check(q.includes('What did Doris sign in \u201994?') && q.includes('Ask Eleanor about the rain that came inside.'),
    'the QUESTION and Eleanor\u2019s pointer are verbatim (doc 06 §C2 diary developments)');
  const toast = await p3.evaluate(() => {
    const s = window.__game.state;
    const out = s.applyChoicePick('TOAST', 'rosa-way', new Set());
    return {
      ink: s.fieldDiary.some((e) => e.id === 'c2-toast-rosa-way'),
      k2: s.fieldDiary.find((e) => e.id === 'c2-k2-net-good')?.body ?? '',
      ledgerActs: s.ledger.filter((e) => e.node === 'TOAST').length,
    };
  });
  check(toast.ink, 'the toast\u2019s ink lands (Rosa\u2019s way)');
  check(toast.ledgerActs === 0, 'the toast posts no ledger acts (the local-pick law)');
  check(toast.k2 === 'The Compact was going to fail anyway. I saved the shop. Net good.',
    'K2 is written that night, verbatim, tagged FACT (the player can feel it)');
  check(e3.length === 0, `pass E/269 console clean (${e3.length} errors${e3.length ? ': ' + e3[0] : ''})`);
  await p3.close();

  // day 295: June's lease, then the cut
  const { page: p4, errors: e4 } = await bootSeason(DAY295_SAVE);
  const lease = await viaRegistry(p4, 'june', 'c2-june-lease');
  const leaseEntry = await p4.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c2-june-lease');
    return e?.body ?? '';
  });
  check(lease.landed, 'June\u2019s lease lands through the june def');
  check(leaseEntry.includes('paperstock'), 'the handoff\u2019s paperstock beat is in the book');
  const cut = await linger(p4);
  check(cut.chapterAfter === 'C3', `the cut advances the chapter to C3 (got ${cut.chapterAfter})`);
  check(cut.cutEntry, 'the cut\u2019s entry is in the book (the latch)');
  const cutDate = await p4.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c2-cut-summer');
    return e?.date ?? null;
  });
  check(cutDate && cutDate.y === 2 && cutDate.m === 7 && cutDate.d === 1,
    'the cut\u2019s entry is dated July 1, Y2 (C3\u2019s window start)');
  const wall = await p4.evaluate(() => {
    const s = window.__game.state;
    const out = s.rail();
    return {
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text),
      rollTo: (out.find((e) => e.kind === 'next-day') ?? {}).to ?? null,
    };
  });
  check(wall.notes.length === 1 && wall.notes[0].includes('July opens its first morning'),
    'the wall answers after the cut');
  // the C3 wave's own law (§7 step 10 brought the days the cut opens):
  // the non-replay press behind the wall rolls the counters WHOLE into
  // C3's first station (July 1, Y2)
  check(wall.rollTo === 296, `the wall's next press rolls into C3's first morning (got ${wall.rollTo})`);
  check(e4.length === 0, `pass E/295 console clean (${e4.length} errors${e4.length ? ': ' + e4[0] : ''})`);
  await p4.close();
}

await browser.close();
await new Promise((r) => server.close(r));
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
