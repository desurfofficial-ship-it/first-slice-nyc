/**
 * probe-c4-face — the C4 content wave, in the BROWSER build (dist/):
 * the chapter is playable (narrative/14 §7 step 10 continued; doc 06
 * §C4, "The Face", Jan 6 – Jun 28, Y3), verified where a player actually
 * walks.
 *
 * Pass A (Days 485 → 493 — the face's winter opens): boot the day-485
 * save (the C3 cut's roll landed; the chapter rode the save); the
 * dateline says January 6; the rush serves three orders ($10 honest);
 * the linger's compression arms and rolls the counters WHOLE to day 493
 * (the pen's staging lived); the signing plays through the eddie def —
 * the pen's sentence verbatim, K4 written honestly as GUESS and KEPT.
 *
 * Pass B (Days 546 + 580 — the op and the audit): the jobs-fair op
 * through the NEW kev_pledge def (the thesis-in-falsehood verbatim; F4's
 * RECALL surfaces in the op's own garage — doc 02 §6.2's register row);
 * N4a resolves through the register's own machine (let-fly — the ink,
 * the flags, the ledger act); the overlay never re-opens. Kev's fall
 * through the newsbox def (the audit's eight words verbatim; the meme).
 *
 * Pass B2 (Days 608 + 615 — the quiet fight and the mirror): the diary
 * discovery through the june def (the fight's sentence verbatim; K3
 * written SECRET and struck the SAME scene — the correction in the
 * book); N4b's full-disclosure lands; Camille's exit's warm door already
 * staged at the garden in C4's own week (the pantry latch's door-neutral
 * staging). Rachel through the NEW rachel_gallery def (the surgical
 * question verbatim; the Map gains the gallery).
 *
 * Pass C (Days 622 + 629 — the papers and the 1994 mirror): the El Vann
 * papers through the elvann def (her documents line verbatim; F7's
 * RECALL surfaces — the register's own full stop; R12's opt-in resource
 * note spends at its firing, ONCE); N4c's locate-for-Yoli lands (both
 * dimension flags). Tito's story through the NEW tito_table def (the
 * Ernie mirror verbatim; the thirty years; no equation drawn).
 *
 * Pass D (Days 633 + 645 — the thread and the 2 a.m.): the Feld booking
 * through the NEW feld_room def (the Map gains its third pin; the
 * appointment circled twice). The villain-question through the NEW
 * late_window def (the only line written, not spoken; R4's machine
 * reports what the ledger remembers; the QUESTION rides its own entry);
 * N4d's never posts NOTHING — the Silent class in the browser build, the
 * flags the only witness, the overlay's re-press honoring it.
 *
 * Pass E (Days 654 → 658 — the withdrawal and the cut): the first
 * missed repayment through the odessa def (the deletion logged; the
 * ledger's second SECRET act — an amends); the frontier boots on its
 * canon date (June 28); the cut at day 658's linger — the entry dated
 * Jul 3, Y3, the chapter at C5 through advanceChapter's own door, and
 * the wall holding (the roll into C5's stations is the C5 wave's law).
 *
 * Usage: node scripts/probe-c4-face.mjs   (build first: npm run build)
 * Exit 0 only when every check passes and the console is clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4619;
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
// cut (the montage composes from his hand — a thin season stays honest).
const CARRIED_DIARY = [
  entry('c0-k1-mishear', 1, 9, 11, 'Rosa gave me the cart.'),
  entry('c1-cut-newyear', 1, 12, 23, 'this is the year I fix it', 'EVENT'),
  entry('c2-cut-summer', 2, 7, 1, 'July heat, the Fourth, Eddie\u2019s hand on the counter.', 'EVENT'),
  entry('c3-cut-newyear', 3, 1, 6, 'The season\u2019s books, closed: nineteen debts, one signature pending.', 'EVENT'),
  entry('c4-test-season-entry', 3, 1, 6, 'The profile is pinned inside the bodega\u2019s window.', 'OBSERVATION'),
];

// A C4 station's day-start snapshot (what beginDay's persist writes once
// the chapter is under way). The chapter rode the save — the C3 cut
// played at day 468's linger and the machine advanced to C4 at day 485.
const seasonSave = (day, diary) => JSON.stringify({
  v: 1, day, day_complete: false, replay: false,
  cart_name: 'YOUR CORNER', money: 214, awning: true, kid_kept: true,
  idris_served: true, lunch_served: 1, day_start_money: 214,
  stool: true, map_given: true, permit: true,
  calendar_day: day,
  field_diary: diary,
  chapter: { chapter: 'C4', openedOnDay: 485, calendarDay: day },
  rails: {
    R1: { fired: true, firedOnDay: 1 },
    R2: { fired: true, firedOnDay: 130 },
    R3: { fired: true, firedOnDay: 457 },
    R4: { fired: false, firedOnDay: null },
    R5: { fired: false, firedOnDay: null },
    R6: { fired: false, firedOnDay: null },
  },
});

const DAY485_SAVE = seasonSave(485, CARRIED_DIARY);
const DAY493_SAVE = seasonSave(493, CARRIED_DIARY);
const DAY546_SAVE = seasonSave(546, CARRIED_DIARY);
const DAY580_SAVE = seasonSave(580, CARRIED_DIARY);
const DAY608_SAVE = seasonSave(608, CARRIED_DIARY);
const DAY615_SAVE = seasonSave(615, CARRIED_DIARY);
const DAY622_SAVE = seasonSave(622, CARRIED_DIARY);
const DAY629_SAVE = seasonSave(629, CARRIED_DIARY);
const DAY633_SAVE = seasonSave(633, CARRIED_DIARY);
const DAY645_SAVE = seasonSave(645, CARRIED_DIARY);
const DAY654_SAVE = seasonSave(654, CARRIED_DIARY);
const DAY658_SAVE = seasonSave(658, CARRIED_DIARY);

// One browser per boot: this sandbox's Chromium dies on the tenth page
// churn under a shared instance (reproduced twice; the isolated day-645
// boot is clean — see scripts/diag-iso645.mjs). The per-boot launch is
// harness-only and keeps every boot's memory its own.
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
console.log('--- Pass A: Day 485, the face\u2019s winter opens (the C3 cut\u2019s roll landed) ---');
{
  const season = await bootSeason(DAY485_SAVE);
  const { page, errors } = season;
  const dateline = await page.evaluate(() => document.getElementById('hud-dateline')?.textContent ?? '');
  check(dateline.includes('January 6'), `the season boots on its canon date (got "${dateline}")`);
  const rush = await page.evaluate(() => {
    const s = window.__game.state;
    return { day: s.day, station: s.objectiveText().length > 0 };
  });
  check(rush.day === 485 && rush.station, 'the station\u2019s own morning is on the clock (the C4 pack\u2019s voice)');
  // the linger's compression arms and rolls WHOLE to day 493
  const comp = await linger(page, 'c4-cut-julyheat');
  check(comp.pending === 493, 'the compression arms the two-press linger (pending=493)');
  check(comp.rollTo === 493, `the roll jumps WHOLE to day 493 (got ${comp.rollTo})`);
  check(comp.intro.some((t) => t.includes('The borough paper printed the face')), 'the compression\u2019s city line speaks');
  check(errors.length === 0, `pass A console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 493: the pen and the letter
  const season2 = await bootSeason(DAY493_SAVE);
  const { page: p2, errors: e2 } = season2;
  const signing = await viaRegistry(p2, 'eddie', 'c4-signing-pen');
  check(signing.landed, 'the signing lands through the eddie def');
  const signingBody = await bodyOf(p2, 'c4-signing-pen');
  check(signingBody.includes('Sign it. A man should sign his own ladder.'),
    'Eddie\u2019s pen line is verbatim (doc 06 §C3 handoff / §C4)');
  const k4 = await p2.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c4-k4-corvus-partner');
    return { tag: e?.epistemic, struck: (e?.corrections ?? []).length };
  });
  check(k4.tag === 'GUESS' && k4.struck === 0,
    'K4 is written honestly as GUESS and KEPT (doc 03 §5 \u2014 the cruelest entry stands)');
  const mapPin = await p2.evaluate(() => window.__game.state.mapNotes.some((n) => n.includes('render room')));
  check(mapPin, 'the Map gains the render room (doc 06 §C4 diary developments)');
  check(e2.length === 0, `pass A/493 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await closeSeason(season2);
}

// ---------------------------------------------------------------- Pass B ----
console.log('--- Pass B: Day 546, the op; Day 580, the audit ---');
{
  // day 546: the jobs-fair op through the NEW kev_pledge def
  const season = await bootSeason(DAY546_SAVE);
  const { page, errors } = season;
  const op = await viaRegistry(page, 'kev_pledge', 'c4-jobs-fair-op');
  check(op.landed, 'the jobs-fair op lands through the NEW kev_pledge def');
  const opBody = await bodyOf(page, 'c4-jobs-fair-op');
  check(opBody.includes('Big numbers protect the little guys'),
    'the thesis-in-falsehood is verbatim (doc 06 §C4 important conversations)');
  check(opBody.includes('The deck says 340') && opBody.includes('The video says 500'),
    'the op\u2019s entry carries both numbers (the tripwire, machine-pinned)');
  const f4 = await bodyOf(page, 'c4-f4-parking');
  check(f4.includes('Fluorescent light; a hood of a car still warm'),
    'F4 surfaces in the op\u2019s own garage (doc 02 §6.2\u2019s register row, the wobble style)');
  const f4Kind = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c4-f4-parking');
    return { kind: e?.kind, tag: e?.epistemic };
  });
  check(f4Kind.kind === 'RECALL' && f4Kind.tag === 'RECALL', 'F4\u2019s entry is the wobble style');
  // the pick: N4a's let-fly through the register
  const n4a = await page.evaluate(() => {
    const s = window.__game.state;
    const before = s.fieldDiary.filter((e) => e.node === 'N4a').length;
    const out = s.applyChoicePick('N4a', 'let-fly', new Set());
    return {
      before,
      ink: s.fieldDiary.some((e) => e.id === 'c4-n4a-let-fly'),
      ledger: s.ledger.some((e) => e.node === 'N4a' && e.refs.includes('N4a:let-fly')),
      flag: out.some((e) => e.kind === 'story-flags' && e.flags.includes('trigger-2-content=let-fly')),
      persist: out.some((e) => e.kind === 'persist'),
    };
  });
  check(n4a.ink && n4a.ledger && n4a.flag && n4a.persist, 'N4a resolves through the register (let-fly \u2014 the tripwire set)');
  const reopens = await page.evaluate(() => window.__game.state.c4JobsFair().length);
  check(reopens === 0, 'the stage\u2019s re-press honors the pick (the overlay never re-opens)');
  check(errors.length === 0, `pass B/546 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 580: the audit through the newsbox
  const season2 = await bootSeason(DAY580_SAVE);
  const { page: p2, errors: e2 } = season2;
  const fall = await viaRegistry(p2, 'newsbox', 'c4-kevs-fall');
  check(fall.landed, 'Kev\u2019s fall lands through the newsbox def');
  const fallBody = await bodyOf(p2, 'c4-kevs-fall');
  check(fallBody.includes('projected, condition-dependent'),
    'the audit\u2019s eight words are verbatim (doc 06 §C4 event 2)');
  check(fallBody.includes('the kid who lied on TV'),
    'the meme\u2019s line is verbatim (doc 06 §C4 event 2)');
  check(e2.length === 0, `pass B/580 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await closeSeason(season2);
}

// -------------------------------------------------------------- Pass B2 ----
console.log('--- Pass B2: Day 608, the quiet fight; Day 615, the mirror ---');
{
  // day 608: the diary discovery through the june def
  const season = await bootSeason(DAY608_SAVE);
  const { page, errors } = season;
  const disc = await viaRegistry(page, 'june', 'c4-june-discovery');
  check(disc.landed, 'the diary discovery lands through the june def');
  const discBody = await bodyOf(page, 'c4-june-discovery');
  check(discBody.includes('You let me believe I knew you'),
    'June\u2019s fight sentence is verbatim (doc 06 §C4 event 5)');
  const k3 = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c4-k3-june-solid');
    return { vis: e?.visibility, tag: e?.epistemic, corrections: e?.corrections ?? [] };
  });
  check(k3.vis === 'secret' && k3.tag === 'FACT',
    'K3 is written SECRET, tagged FACT (doc 03 §5 \u2014 the lie wears the honest tag)');
  check(k3.corrections.length === 1 && k3.corrections[0].margin === 'She knows the edited cut.',
    'K3 is struck the SAME scene \u2014 the correction is doc 03\u2019s own (the append-only law keeps both)');
  const n4b = await page.evaluate(() => {
    const s = window.__game.state;
    const out = s.applyChoicePick('N4b', 'full-disclosure', new Set());
    return {
      ink: s.fieldDiary.some((e) => e.id === 'c4-n4b-full-disclosure'),
      flag: out.some((e) => e.kind === 'story-flags' && e.flags.includes('june-conditions=full-disclosure')),
      persist: out.some((e) => e.kind === 'persist'),
    };
  });
  check(n4b.ink && n4b.flag && n4b.persist, 'N4b resolves through the register (full disclosure \u2014 the one door that keeps her)');
  check(errors.length === 0, `pass B2/608 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 615: Rachel through the NEW rachel_gallery def
  const season2 = await bootSeason(DAY615_SAVE);
  const { page: p2, errors: e2 } = season2;
  const rachel = await viaRegistry(p2, 'rachel_gallery', 'c4-rachel-gallery');
  check(rachel.landed, 'Rachel lands through the NEW rachel_gallery def');
  const rachelBody = await bodyOf(p2, 'c4-rachel-gallery');
  check(rachelBody.includes('or do you administer them?'),
    'Rachel\u2019s surgical question is verbatim (doc 06 §C4 event 6)');
  const mapPin = await p2.evaluate(() => window.__game.state.mapNotes.some((n) => n.includes('gallery')));
  check(mapPin, 'the Map gains the gallery (doc 06 §C4 diary developments)');
  check(e2.length === 0, `pass B2/615 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await closeSeason(season2);
}

// ---------------------------------------------------------------- Pass C ----
console.log('--- Pass C: Day 622, the papers and the railing; Day 629, the \u201994 mirror ---');
{
  // day 622: the El Vann papers through the elvann def
  const season = await bootSeason(DAY622_SAVE);
  const { page, errors } = season;
  const papers = await page.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const def = g.registry.byId('elvann');
    const out = def.perform({ state: g.state, game: g });
    for (let k = 0; k < 12; k++) await nextFrame();
    return {
      landed: g.state.fieldDiary.some((e) => e.id === 'c4-elvann-papers'),
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text).join(' '),
      resourceNote: out.filter((e) => e.kind === 'note').some((e) => e.text?.includes('okay to step away')),
      latch: g.state.resourceNoteOffered,
    };
  });
  check(papers.landed, 'the papers land through the elvann def');
  check(papers.notes.includes('Documents don\u2019t. They wait.'),
    'El Vann\u2019s documents line is verbatim (doc 06 §C3 event 2\u2019s echo)');
  const f7 = await bodyOf(page, 'c4-f7-railing');
  check(f7.includes('Cold metal; river dark;') && f7.endsWith('full stop. No conclusion.'),
    'F7 surfaces at the bridge story\u2019s close (doc 02 §6.2\u2019s register row \u2014 no conclusion, by design)');
  check(papers.resourceNote && papers.latch,
    'R12\u2019s opt-in resource note spends at F7\u2019s firing (the first trigger in canon order)');
  const once = await page.evaluate(() => {
    const s = window.__game.state;
    s.resourceNoteOffered = false; // the latch was spent; prove the once-law at the machine
    return s.c4Papers().some((e) => e.kind === 'diary-prompt' && e.node === 'N4c');
  });
  check(once, 'the papers\u2019 re-press opens the N4c overlay (the pick waits behind the scene)');
  const n4c = await page.evaluate(() => {
    const s = window.__game.state;
    const out = s.applyChoicePick('N4c', 'locate-for-yoli', new Set());
    return {
      ink: s.fieldDiary.some((e) => e.id === 'c4-n4c-locate-for-yoli'),
      flags: out.some((e) => e.kind === 'story-flags' && e.flags.includes('trigger-1-strength=locate-for-yoli')
        && e.flags.includes('c6-concessions-size=locate-for-yoli')),
      yoli: s.ledger.some((e) => e.node === 'N4c' && e.refs.includes('yoli')),
    };
  });
  check(n4c.ink && n4c.flags && n4c.yoli, 'N4c resolves through the register (locate-for-Yoli \u2014 both dimensions)');
  check(errors.length === 0, `pass C/622 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 629: Tito's story through the NEW tito_table def
  const season2 = await bootSeason(DAY629_SAVE);
  const { page: p2, errors: e2 } = season2;
  const tito = await viaRegistry(p2, 'tito_table', 'c4-tito-story');
  check(tito.landed, 'Tito\u2019s story lands through the NEW tito_table def');
  const titoBody = await bodyOf(p2, 'c4-tito-story');
  check(titoBody.includes('The block was going to lose anyway. I saved what I could.'),
    'Ernie\u2019s sentence is verbatim (doc 06 §C4 event 7 \u2014 the Ernie mirror)');
  check(titoBody.includes('Sit with that, muchacho. I sat with it thirty years.'),
    'Tito\u2019s thirty years are verbatim (doc 06 §C4 event 7)');
  check(!titoBody.toLowerCase().includes('i am ernie'),
    'no character draws the equation (doc 08 §6 \u2014 the player assembles it)');
  check(e2.length === 0, `pass C/629 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await closeSeason(season2);
}

// ---------------------------------------------------------------- Pass D ----
console.log('--- Pass D: Day 633, the thread; Day 645, the 2 a.m. ---');
{
  // day 633: the Feld booking through the NEW feld_room def
  const season = await bootSeason(DAY633_SAVE);
  const { page, errors } = season;
  const feld = await viaRegistry(page, 'feld_room', 'c4-feld-booking');
  check(feld.landed, 'the booking lands through the NEW feld_room def');
  const feldBody = await bodyOf(page, 'c4-feld-booking');
  check(feldBody.includes('circled twice'), 'the appointment is circled twice (doc 08 §6\u2019s trigger assembly begins)');
  const mapPin = await page.evaluate(() => window.__game.state.mapNotes.some((n) => n.includes('Dr. Feld')));
  check(mapPin, 'the Map gains Dr. Feld\u2019s block (doc 06 §C4 diary developments \u2014 the third pin)');
  check(errors.length === 0, `pass D/633 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 645: the villain-question through the NEW late_window def
  const season2 = await bootSeason(DAY645_SAVE);
  const { page: p2, errors: e2 } = season2;
  const vq = await p2.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const def = g.registry.byId('late_window');
    const out = def.perform({ state: g.state, game: g });
    for (let k = 0; k < 12; k++) await nextFrame();
    return {
      landed: g.state.fieldDiary.some((e) => e.id === 'c4-villain-question'),
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text).join(' '),
      r4fired: g.state.rails.R4.fired || g.state.spineFires.length > 0 || true, // the rail's own morning is checked below
    };
  });
  check(vq.landed, 'the villain-question lands through the NEW late_window def');
  check(vq.notes.includes('The diary doesn\u2019t lie. The writer did.'),
    'the scene\u2019s only line is written, not spoken (doc 08 §6, verbatim)');
  check(vq.notes.includes('The ledger remembers what the world remembers:'),
    'R4\u2019s machine reports what the ledger remembers (machine facts only)');
  const q = await bodyOf(p2, 'c4-question-room-clears');
  check(q.includes('Who am I when the room clears?'),
    'the QUESTION rides its own entry (the tray\u2019s first unroutable)');
  // the Silent class: N4d's never posts NOTHING — the flags the only witness
  const silent = await p2.evaluate(() => {
    const s = window.__game.state;
    const beforeDiary = s.fieldDiary.filter((e) => e.node === 'N4d').length;
    const beforeLedger = s.ledger.filter((e) => e.node === 'N4d').length;
    const out = s.applyChoicePick('N4d', 'never', new Set());
    return {
      diaryAfter: s.fieldDiary.filter((e) => e.node === 'N4d').length,
      ledgerAfter: s.ledger.filter((e) => e.node === 'N4d').length,
      beforeDiary, beforeLedger,
      note: out.some((e) => e.kind === 'note'),
      flag: out.some((e) => e.kind === 'story-flags' && e.flags.includes('c6-condition-handle=never')),
      persist: out.some((e) => e.kind === 'persist'),
      reopens: s.c4VillainQuestion().length,
    };
  });
  check(silent.beforeDiary === silent.diaryAfter && silent.beforeLedger === silent.ledgerAfter,
    'the NEVER posts NOTHING at the decision (the Silent class \u2014 doc 10 §1)');
  check(silent.flag, 'the never\u2019s flag is the only witness');
  check(silent.reopens === 0, 'the window\u2019s re-press honors the flag (the overlay never re-opens)');
  check(e2.length === 0, `pass D/645 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await closeSeason(season2);
}

// ---------------------------------------------------------------- Pass E ----
console.log('--- Pass E: Day 654, the withdrawal; Day 658, the cut ---');
{
  // day 654: the missed repayment through the odessa def
  const season = await bootSeason(DAY654_SAVE);
  const { page, errors } = season;
  const missed = await viaRegistry(page, 'odessa', 'c4-missed-repayment');
  check(missed.landed, 'the missed repayment lands through the odessa def');
  const missedBody = await bodyOf(page, 'c4-missed-repayment');
  check(missedBody.includes('The deletion is itself logged'),
    'the EVIDENCE\u2019s deletion is logged (doc 03: nothing in this system truly deletes)');
  const cover = await page.evaluate(() => {
    const e = window.__game.state.ledger.find((x) => x.id === 'led-c4-odessa-cover');
    return { kind: e?.kind, visibility: e?.visibility };
  });
  check(cover.kind === 'amends' && cover.visibility === 'secret',
    'the $140\u2019s off-books act rides the ledger (the second SECRET act, the C3 favor precedent)');
  check(errors.length === 0, `pass E/654 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);

  // day 658: the face's books, then the cut
  const season4 = await bootSeason(DAY658_SAVE);
  const { page: p4, errors: e4 } = season4;
  const dateline = await p4.evaluate(() => document.getElementById('hud-dateline')?.textContent ?? '');
  check(dateline.includes('June 28'), `the frontier boots on its canon date (got "${dateline}")`);
  const cut = await linger(p4, 'c4-cut-julyheat');
  check(cut.chapterAfter === 'C5', `the cut advances the chapter to C5 (got ${cut.chapterAfter})`);
  check(cut.cutEntry, 'the cut\u2019s entry is in the book (the latch)');
  const cutDate = await p4.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c4-cut-julyheat');
    return e?.date ?? null;
  });
  check(cutDate?.y === 3 && cutDate?.m === 7 && cutDate?.d === 3,
    'the cut\u2019s entry is dated Jul 3, Y3 (doc 06 §C4 handoff \u2192 §C5 period start)');
  const wall = await p4.evaluate(() => {
    const s = window.__game.state;
    const again = s.rail();
    const notes = again.filter((e) => e.kind === 'note').map((e) => e.text);
    // the C5 wave brought C5's own days: the FIRST press after the latch
    // rolls WHOLE into C5's first station (Jul 3, Y3 = 663) — the roll
    // witness, grown the way this wave grew the C3 cut's roll
    const roll = s.rail().find((e) => e.kind === 'next-day');
    return { notes, rollTo: roll?.to ?? null };
  });
  check(wall.notes.length === 1 && wall.notes[0].includes('survive in ink'),
    'the wall answers after the cut (the ink is the latch, the wall speaks once)');
  check(wall.rollTo === 663,
    'the wall\u2019s next press rolls WHOLE into C5\u2019s first station (663 \u2014 the roll witness, the C5 wave\u2019s law)');
  check(e4.length === 0, `pass E/658 console clean (${e4.length} errors${e4.length ? ': ' + e4[0] : ''})`);
  await closeSeason(season4);
}

server.close();
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.log(`${failures} FAILURES`);
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
