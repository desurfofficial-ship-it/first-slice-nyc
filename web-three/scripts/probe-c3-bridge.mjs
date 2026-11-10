/**
 * probe-c3-bridge — the C3 content wave, in the BROWSER build (dist/):
 * the chapter is playable (narrative/14 §7 step 10; doc 06 §C3, "The
 * Bridge", Jul 1 – Dec 20, Y2), verified where a player actually walks.
 *
 * Pass A (Days 296 → 299 → 301 — July opens): boot the day-296 save (the
 * C2 cut's roll landed; the chapter rode the save); the dateline says
 * July 1; the rush serves three orders ($10 honest); the linger's
 * compression arms and rolls the counters WHOLE to day 299 (the Fourth's
 * staging lived); the collapse plays through the eddie def (day 301).
 *
 * Pass B (Days 309 + 328 — the keys and the wall): the keys land through
 * the eddie def (the burden transfer, verbatim); F2's RECALL ink rides
 * the climb seam (the visiting-room window's afterglow, once — the
 * state-seam witness, labeled; the wiring rides the same reachTop seam
 * the shipped climb calls); day 328 — El Vann's paper wall through the
 * NEW elvann def (her line verbatim) and the water fix's HELPED side
 * through the garden def (the buckets carried; the miss never written).
 *
 * Pass B2 (Day 328 unvisited — the window's other side): a boot that
 * never walks to the garden; the linger writes the miss ONCE (doc 10
 * §4's consequence, in-character) and rolls to 349.
 *
 * Pass C (Days 349 → 369 → 376 → 383 — the Summit to the Club): the
 * Slice Summit through the eddie def (two latches — the Summit's entry
 * and Wexler's PERSON card, the blog's title verbatim); Halcyon opens
 * through the june def (her line verbatim); Deshaun's exam through the
 * NEW deshaun_exam def; the Club's founding pitch through the garden def.
 *
 * Pass D (Days 390 → 404 → 414 → 420 — the envelope economy): Ada's
 * envelope through the bench def (the call that asks zero questions);
 * Camille's pantry through the garden def; the sound through the rosa
 * def (Doris's warning verbatim; the QUESTION rides it); the senate
 * through the park_bench def (Tito's question).
 *
 * Pass E (Days 425 → 432 → 457 → 468 — the raise, the lunch, the offer,
 * the cut): the closing pitch through the garden def and N3b through the
 * register's own machine (nineteen faces, Miss Odessa's envelope — the
 * ink names the face); Gino's lunch through the diner_booth def (the
 * NETWORKING entry that refuses the violation; the ledger's first SECRET
 * favor); the wall's missing slip through the lease_notice def; N3c's
 * not-tell through the register (the Silent class — nothing posts); the
 * offer through the surveyor def (EVIDENCE photographed unsigned,
 * Marisol v1) and N3a's accept; the cut at day 468's linger — the entry
 * dated Jan 6, Y3, the chapter at C4 through advanceChapter's own door,
 * and the wall holding (the roll into C4's stations is the C4 wave's
 * law).
 *
 * Usage: node scripts/probe-c3-bridge.mjs   (build first: npm run build)
 * Exit 0 only when every check passes and the console is clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4617;
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

// The carried diary: the C0 spine's own entries + one season entry per
// cut (the montage composes from his hand — a thin week stays honest).
const CARRIED_DIARY = [
  entry('c0-k1-mishear', 1, 9, 11, 'Rosa gave me the cart.'),
  entry('c1-cut-newyear', 1, 12, 23, 'this is the year I fix it', 'EVENT'),
  entry('c2-cut-summer', 2, 7, 1, 'July heat, the Fourth, Eddie\u2019s hand on the counter.', 'EVENT'),
  entry('c3-test-season-entry', 2, 7, 1, 'The Fourth taught me the line\u2019s weight.', 'OBSERVATION'),
];

// A C3 station's day-start snapshot (what beginDay's persist writes once
// the chapter is under way). The chapter rode the save — the C2 cut
// played at day 295's linger and the machine advanced to C3 at day 296.
const seasonSave = (day, diary) => JSON.stringify({
  v: 1, day, day_complete: false, replay: false,
  cart_name: 'YOUR CORNER', money: 214, awning: true, kid_kept: true,
  idris_served: true, lunch_served: 1, day_start_money: 214,
  stool: true, map_given: true, permit: true,
  calendar_day: day,
  field_diary: diary,
  chapter: { chapter: 'C3', openedOnDay: 296, calendarDay: day },
  rails: {
    R1: { fired: true, firedOnDay: 1 },
    R2: { fired: false, firedOnDay: null },
    R3: { fired: false, firedOnDay: null },
    R4: { fired: false, firedOnDay: null },
    R5: { fired: false, firedOnDay: null },
    R6: { fired: false, firedOnDay: null },
  },
});

const DAY296_SAVE = seasonSave(296, CARRIED_DIARY);
const DAY299_SAVE = seasonSave(299, [...CARRIED_DIARY,
  entry('c3-eddie-collapse', 2, 7, 6, 'Eddie\u2019s hand flat on the counter, and it doesn\u2019t move.', 'EVENT'),
]);
const DAY301_SAVE = seasonSave(301, CARRIED_DIARY);
const DAY309_SAVE = seasonSave(309, [...CARRIED_DIARY,
  entry('c3-eddie-collapse', 2, 7, 6, 'Eddie\u2019s hand flat on the counter, and it doesn\u2019t move.', 'EVENT'),
]);
const DAY328_SAVE = seasonSave(328, [...CARRIED_DIARY,
  entry('c3-eddie-keys', 2, 7, 14, 'The visiting room\u2019s window admits July and nothing else.', 'EVENT'),
  entry('c3-f2-glass', 2, 7, 14, 'A hand flat on visiting-room glass; his own palm, hours later, still shaped', 'RECALL', 'RECALL'),
]);
const DAY349_SAVE = seasonSave(349, [...CARRIED_DIARY,
  entry('c3-eddie-keys', 2, 7, 14, 'The keys, from a hospital bed.', 'EVENT'),
  entry('c3-water-fix', 2, 8, 2, 'The beds\u2019 south row, day eleven of the dry week.', 'EVENT'),
  entry('c3-paper-wall', 2, 8, 2, 'The East Tenement\u2019s community room, sketched from inside.', 'PLACE'),
]);
const DAY369_SAVE = seasonSave(369, [...CARRIED_DIARY,
  entry('c3-slice-summit', 2, 8, 23, 'After hours, Corner Slice hosts it.', 'EVENT'),
  entry('c3-wexler-card', 2, 8, 23, 'Wexler. Corvus\u2019s expediter.', 'PERSON'),
]);
const DAY376_SAVE = seasonSave(376, [...CARRIED_DIARY,
  entry('c3-halcyon-opens', 2, 9, 12, 'Halcyon opens \u2014 the caf\u00E9 shell at 6 Kestrel East.', 'RELATION'),
]);
const DAY383_SAVE = seasonSave(383, [...CARRIED_DIARY,
  entry('c3-deshaun-exam', 2, 9, 19, 'Deshaun\u2019s exam results come on a Thursday and the word is no.', 'EVENT'),
]);
const DAY390_SAVE = seasonSave(390, [...CARRIED_DIARY,
  entry('c3-club-founding', 2, 9, 26, 'The garden, Saturday, folding chairs.', 'EVENT'),
]);
const DAY404_SAVE = seasonSave(404, [...CARRIED_DIARY,
  entry('c3-ada-envelope', 2, 10, 3, 'The envelope in the shop\u2019s mail slot.', 'EVENT'),
]);
const DAY414_SAVE = seasonSave(414, [...CARRIED_DIARY,
  entry('c3-camille-pantry', 2, 10, 17, 'Camille Odom runs the pantry drive.', 'PERSON'),
]);
const DAY420_SAVE = seasonSave(420, [...CARRIED_DIARY,
  entry('c3-doris-sound', 2, 10, 27, 'The sound comes over the back fences at dusk.', 'EVENT'),
  entry('c3-q-craigs-paper', 2, 10, 27, 'What is Craig\u2019s paper?', 'QUESTION'),
]);
const DAY425_SAVE = seasonSave(425, [...CARRIED_DIARY,
  entry('c3-tito-senate', 2, 11, 2, 'Corner Park, the dominoes table.', 'OBSERVATION'),
]);
const DAY432_SAVE = seasonSave(432, [...CARRIED_DIARY,
  entry('c3-club-closing', 2, 11, 7, 'The garden, Thursday evening, the last folding chairs.', 'EVENT'),
  entry('c3-n3b-slot-15', 2, 11, 7, 'The last envelope went to Miss Odessa Wynn.', 'EVENT'),
]);
const DAY457_SAVE = seasonSave(457, [...CARRIED_DIARY,
  entry('c3-gino-lunch', 2, 11, 14, 'Networking lunch with a logistics man.', 'EVENT'),
  entry('c3-gino-lunch-card', 2, 11, 14, 'Gino. Reads naval history; eats olives like punctuation.', 'PERSON'),
  entry('c3-violation-gone', 2, 11, 14, 'The wall behind Eddie\u2019s framed notice has one less paper on it.', 'OBSERVATION'),
  entry('c3-n3c-not-tell-flag-witness', 2, 11, 14, 'The page stays clean.', 'OBSERVATION'),
]);
const DAY468_SAVE = seasonSave(468, [...CARRIED_DIARY,
  entry('c3-marisol-offer', 2, 12, 9, 'The fence door at the Works is propped open.', 'EVIDENCE'),
  entry('c3-marisol-offer-card', 2, 12, 9, 'Marisol, v1. The most dangerous person who will ever buy me lunch.', 'PERSON'),
  entry('c3-n3a-accept', 2, 12, 9, 'I said yes. In the render room.', 'EVENT'),
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
console.log('--- Pass A: Day 296, July opens (the C2 cut\u2019s roll landed) ---');
{
  const { page, errors } = await bootSeason(DAY296_SAVE);
  const a = await page.evaluate(() => ({
    day: window.__game.state.day,
    chapter: window.__game.state.chapter.chapter,
    dateline: document.getElementById('hud-dateline')?.textContent ?? '',
  }));
  check(a.day === 296 && a.chapter === 'C3', `day 296 boots inside C3 (got day ${a.day}, chapter ${a.chapter})`);
  check(a.dateline.includes('July 1'), `the dateline says July 1 (got "${a.dateline}")`);

  // the station boots into the loop's own machine seam (the rush's honest
  // math is pinned at the unit level; the browser pass proves the station
  // BOOTS and the linger moves — the C2 probe's own pattern)
  const rush = await page.evaluate(async () => {
    const g = window.__game;
    const s = g.state;
    s.setStep(35); // WK_ROAM
    return { step: s.step, money: s.money };
  });
  check(rush.step === 35, `the roam opens (step=${rush.step})`);

  // the linger's compression arms and rolls WHOLE to day 299
  const comp = await linger(page, 'c3-cut-newyear');
  check(comp.pending === 299, 'the compression arms the two-press linger (pending=299)');
  check(comp.rollTo === 299, `the roll lands whole on 299 (got ${comp.rollTo})`);
  check(comp.dayAfter === 296, `the day did not move until the roll (still ${comp.dayAfter})`);
  check(comp.intro.some((t) => t.includes('The corner prepped its busiest week')), 'the compression\u2019s city line speaks');
  check(errors.length === 0, `pass A console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();

  // day 301: the collapse through the eddie def
  const { page: p2, errors: e2 } = await bootSeason(DAY301_SAVE);
  const collapse = await viaRegistry(p2, 'eddie', 'c3-eddie-collapse');
  const collapseBody = await bodyOf(p2, 'c3-eddie-collapse');
  check(collapse.landed, 'the collapse lands through the eddie def');
  check(collapseBody.includes('used like a diagnosis'), 'the collapse\u2019s diagnosis line is in the book');
  check(e2.length === 0, `pass A/301 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await p2.close();
}

// ---------------------------------------------------------------- Pass B ----
console.log('--- Pass B: Day 309, the keys; Day 328, the wall and the buckets ---');
{
  const { page, errors } = await bootSeason(DAY309_SAVE);
  const keys = await viaRegistry(page, 'eddie', 'c3-eddie-keys');
  const keysBody = await bodyOf(page, 'c3-eddie-keys');
  check(keys.landed, 'the keys land through the eddie def');
  check(keysBody.includes('Don\u2019t lose them. Not the shop. Them.'),
    'Eddie\u2019s keys line is verbatim (doc 06 §C3 important conversations)');

  // F2 at the visiting-room window's afterglow — the state-seam witness
  // (the wiring rides the same reachTop seam the shipped climb calls;
  // labeled honestly: this is the seam, not a walked climb)
  const f2 = await page.evaluate(() => {
    const s = window.__game.state;
    s.setStep(36); // WK_CLIMB
    const out = s.c3F2AtGlass();
    return {
      inked: s.fieldDiary.some((e) => e.id === 'c3-f2-glass'),
      kind: s.fieldDiary.find((e) => e.id === 'c3-f2-glass')?.kind ?? '',
      notes: out.filter((e) => e.kind === 'note').length,
    };
  });
  check(f2.inked && f2.kind === 'RECALL', 'F2 fires as RECALL ink at the glass (the wobble style, once)');
  check(errors.length === 0, `pass B/309 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();

  const { page: p2, errors: e2 } = await bootSeason(DAY328_SAVE);
  const wall = await viaRegistry(p2, 'elvann', 'c3-paper-wall');
  const wallBody = await bodyOf(p2, 'c3-paper-wall');
  check(wall.landed, 'the paper wall lands through the NEW elvann def');
  check(wallBody.includes('Developments fail, dear. Documents don\u2019t. They wait.'),
    'El Vann\u2019s documents line is verbatim (doc 06 §C3 event 2)');
  const buckets = await viaRegistry(p2, 'garden', 'c3-water-fix');
  const helped = await p2.evaluate(() => {
    const s = window.__game.state;
    return {
      ink: s.fieldDiary.some((e) => e.id === 'c3-water-fix'),
      miss: s.fieldDiary.some((e) => e.id === 'c3-water-fix-missed'),
    };
  });
  check(buckets.landed, 'the buckets land through the garden def (the window\u2019s HELPED side)');
  check(helped.ink && !helped.miss, 'the helped side latches and the miss never writes');
  check(e2.length === 0, `pass B/328 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await p2.close();
}

// ---------------------------------------------------------------- Pass B2 ----
console.log('--- Pass B2: Day 328 unvisited — the window\u2019s other side ---');
{
  const { page, errors } = await bootSeason(DAY328_SAVE);
  const comp = await linger(page, 'c3-cut-newyear');
  const miss = await page.evaluate(() => {
    const s = window.__game.state;
    const e = s.fieldDiary.find((x) => x.id === 'c3-water-fix-missed');
    return { kind: e?.kind ?? '', body: e?.body ?? '', once: s.fieldDiary.filter((x) => x.id === 'c3-water-fix-missed').length };
  });
  check(miss.kind === 'OBSERVATION', 'the miss writes at the window\u2019s close (doc 10 §4\u2019s consequence, in-character)');
  check(miss.body.includes('south row') && miss.body.includes('Yoli'), 'the miss\u2019s ink names the loss and the margin');
  check(miss.once === 1, 'the miss writes ONCE (the No-FOMO law)');
  check(comp.rollTo === 349, `the roll lands whole on 349 (got ${comp.rollTo})`);
  check(errors.length === 0, `pass B2 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();
}

// ---------------------------------------------------------------- Pass C ----
console.log('--- Pass C: Days 349 \u2192 369 \u2192 376 \u2192 383 ---');
{
  const { page, errors } = await bootSeason(DAY349_SAVE);
  const summit = await viaRegistry(page, 'eddie', 'c3-slice-summit');
  const summitBody = await bodyOf(page, 'c3-slice-summit');
  check(summit.landed, 'the Summit lands through the eddie def');
  check(summitBody.includes('The Man Who Feeds Alder Heights'),
    'the blog\u2019s title is verbatim (doc 06 §C3 event 3)');
  const wexler = await page.evaluate(() => window.__game.state.fieldDiary.some((e) => e.id === 'c3-wexler-card'));
  check(wexler, 'Wexler\u2019s PERSON card rides the Summit (the first meeting)');
  check(errors.length === 0, `pass C/349 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();

  const { page: p2, errors: e2 } = await bootSeason(DAY369_SAVE);
  const halcyon = await viaRegistry(p2, 'june', 'c3-halcyon-opens');
  const halcyonBody = await bodyOf(p2, 'c3-halcyon-opens');
  check(halcyon.landed, 'Halcyon\u2019s opening lands through the june def');
  check(halcyonBody.includes('You do a voice when you\u2019re scared'),
    'June\u2019s voice line is verbatim (doc 06 §C3 event 8)');
  check(e2.length === 0, `pass C/369 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await p2.close();

  const { page: p3, errors: e3 } = await bootSeason(DAY376_SAVE);
  const exam = await viaRegistry(p3, 'deshaun_exam', 'c3-deshaun-exam');
  const examBody = await bodyOf(p3, 'c3-deshaun-exam');
  check(exam.landed, 'the exam lands through the NEW deshaun_exam def');
  check(examBody.includes('I CARRY AIR'), 'Deshaun\u2019s gallows-flat line is in the book');
  check(e3.length === 0, `pass C/376 console clean (${e3.length} errors${e3.length ? ': ' + e3[0] : ''})`);
  await p3.close();

  const { page: p4, errors: e4 } = await bootSeason(DAY383_SAVE);
  const club = await viaRegistry(p4, 'garden', 'c3-club-founding');
  const clubBody = await bodyOf(p4, 'c3-club-founding');
  check(club.landed, 'the Club\u2019s founding lands through the garden def');
  check(clubBody.includes('$30,000'), 'the raise\u2019s opening number is in the book');
  check(e4.length === 0, `pass C/383 console clean (${e4.length} errors${e4.length ? ': ' + e4[0] : ''})`);
  await p4.close();
}

// ---------------------------------------------------------------- Pass D ----
console.log('--- Pass D: Days 390 \u2192 404 \u2192 414 \u2192 420 ---');
{
  const { page, errors } = await bootSeason(DAY390_SAVE);
  const ada = await viaRegistry(page, 'bench', 'c3-ada-envelope');
  const adaBody = await bodyOf(page, 'c3-ada-envelope');
  check(ada.landed, 'the envelope lands through the bench def (the call\u2019s bench)');
  check(adaBody.includes('That\u2019s why I didn\u2019t ask'), 'Ada\u2019s zero-questions line is verbatim');
  check(errors.length === 0, `pass D/390 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();

  const { page: p2, errors: e2 } = await bootSeason(DAY404_SAVE);
  const pantry = await viaRegistry(p2, 'garden', 'c3-camille-pantry');
  check(pantry.landed, 'the pantry lands through the garden def');
  check(e2.length === 0, `pass D/404 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await p2.close();

  const { page: p3, errors: e3 } = await bootSeason(DAY414_SAVE);
  const sound = await viaRegistry(p3, 'rosa', 'c3-doris-sound');
  const soundBody = await bodyOf(p3, 'c3-doris-sound');
  check(sound.landed, 'the sound lands through the rosa def');
  check(soundBody.includes('You\u2019re a good boy the way Craig\u2019s a good boy. Watch it.'),
    'Doris\u2019s warning is verbatim (doc 06 §C3 event 7)');
  const q = await bodyOf(p3, 'c3-q-craigs-paper');
  check(q.includes('What is Craig\u2019s paper?'), 'the QUESTION rides the sound (doc 06 §C3 diary developments)');
  check(e3.length === 0, `pass D/414 console clean (${e3.length} errors${e3.length ? ': ' + e3[0] : ''})`);
  await p3.close();

  const { page: p4, errors: e4 } = await bootSeason(DAY420_SAVE);
  const senate = await viaRegistry(p4, 'park_bench', 'c3-tito-senate');
  const senateBody = await bodyOf(p4, 'c3-tito-senate');
  check(senate.landed, 'the senate lands through the park_bench def (the table adopts Leo)');
  check(senateBody.includes('Whose block is the render on'), 'Tito\u2019s question is verbatim (doc 07 §4)');
  check(e4.length === 0, `pass D/420 console clean (${e4.length} errors${e4.length ? ': ' + e4[0] : ''})`);
  await p4.close();
}

// ---------------------------------------------------------------- Pass E ----
console.log('--- Pass E: Days 425 \u2192 432 \u2192 457 \u2192 468, the raise, the lunch, the offer, the cut ---');
{
  // day 425: the closing pitch, then N3b through the register (Miss Odessa)
  const { page, errors } = await bootSeason(DAY425_SAVE);
  const close = await viaRegistry(page, 'garden', 'c3-club-closing');
  check(close.landed, 'the closing pitch lands through the garden def');
  const n3b = await page.evaluate(() => {
    const s = window.__game.state;
    const out = s.applyChoicePick('N3b', 'slot-15', new Set());
    return {
      ink: s.fieldDiary.find((e) => e.id === 'c3-n3b-slot-15')?.body ?? '',
      ledger: s.ledger.some((e) => e.node === 'N3b' && e.refs.includes('N3b:slot-15')),
      ok: out.some((e) => e.kind === 'persist'),
    };
  });
  check(n3b.ink.includes('Miss Odessa Wynn') && n3b.ink.includes('$800'),
    'N3b resolves through the register \u2014 the ink names the face and the dollar (doc 09 §4)');
  check(n3b.ledger && n3b.ok, 'the pick\u2019s ledger act and persist land');
  check(errors.length === 0, `pass E/425 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();

  // day 432: the lunch + the SECRET favor + the missing slip + N3c's not-tell
  const { page: p2, errors: e2 } = await bootSeason(DAY432_SAVE);
  // the FIRST press carries both witnesses: the room's verbatim note and
  // the latch (the perform return IS the Space press's path)
  const lunch = await p2.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const def = g.registry.byId('diner_booth');
    const out = def.perform({ state: g.state, game: g });
    for (let k = 0; k < 12; k++) await nextFrame();
    return {
      landed: g.state.fieldDiary.some((e) => e.id === 'c3-gino-lunch'),
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text).join(' '),
    };
  });
  const lunchBody = await bodyOf(p2, 'c3-gino-lunch');
  check(lunch.landed, 'the lunch lands through the diner_booth def');
  check(lunchBody.includes('Networking') && !lunchBody.includes('violation'),
    'the NETWORKING entry refuses the violation (the first entry that refuses to be written)');
  check(lunch.notes.includes('Your landlord\u2019s a good boy. Bad credit, but a good boy.'),
    'Gino\u2019s good-boy line is verbatim in the room (doc 06 §C3 important conversations)');
  const ginoCard = await bodyOf(p2, 'c3-gino-lunch-card');
  check(ginoCard.includes('reads naval history; eats olives like punctuation') || ginoCard.includes('Reads naval history; eats olives like punctuation'),
    'Gino\u2019s PERSON card is verbatim (doc 06 §C3 diary developments)');
  const favor = await p2.evaluate(() => {
    const e = window.__game.state.ledger.find((x) => x.id === 'led-c3-gino-favor');
    return { kind: e?.kind ?? '', visibility: e?.visibility ?? '' };
  });
  check(favor.kind === 'choice' && favor.visibility === 'secret',
    'the fixer\u2019s favor rides the ledger (the first SECRET favor, the C2 Priya precedent)');
  const slip = await viaRegistry(p2, 'lease_notice', 'c3-violation-gone');
  check(slip.landed, 'the wall\u2019s missing slip reads through the lease_notice def');
  const silent = await p2.evaluate(() => {
    const s = window.__game.state;
    const beforeDiary = s.fieldDiary.filter((e) => e.node === 'N3c').length;
    const beforeLedger = s.ledger.filter((e) => e.node === 'N3c').length;
    const out = s.applyChoicePick('N3c', 'not-tell', new Set());
    return {
      diaryAfter: s.fieldDiary.filter((e) => e.node === 'N3c').length,
      ledgerAfter: s.ledger.filter((e) => e.node === 'N3c').length,
      beforeDiary, beforeLedger,
      note: out.some((e) => e.kind === 'note'),
      flag: out.some((e) => e.kind === 'story-flags' && e.flags.includes('trigger-4=absent')),
      reopens: s.c3Lunch().length,
    };
  });
  check(silent.beforeDiary === silent.diaryAfter && silent.beforeLedger === silent.ledgerAfter && !silent.note === false,
    'the NOT-TELL posts NOTHING at the decision (the Silent class \u2014 doc 10 §1)');
  check(silent.flag, 'the not-tell\u2019s flag is the only witness');
  check(silent.reopens === 0, 'the booth\u2019s re-press honors the flag (the overlay never re-opens)');
  check(e2.length === 0, `pass E/432 console clean (${e2.length} errors${e2.length ? ': ' + e2[0] : ''})`);
  await p2.close();

  // day 457: the offer + N3a's accept
  const { page: p3, errors: e3 } = await bootSeason(DAY457_SAVE);
  const offer = await viaRegistry(p3, 'surveyor', 'c3-marisol-offer');
  const offerBody = await bodyOf(p3, 'c3-marisol-offer');
  check(offer.landed, 'the offer lands through the surveyor def (the Works fence\u2019s door)');
  check(offerBody.includes('your vendors, your block, our kitchen'),
    'Marisol\u2019s kitchen phrase is verbatim (doc 06 §C3 event 4)');
  const card = await bodyOf(p3, 'c3-marisol-offer-card');
  check(card.toLowerCase().includes('the most dangerous person who will ever buy me lunch'),
    'Marisol\u2019s PERSON card v1 is verbatim (doc 06 §C3 diary developments)');
  const n3a = await p3.evaluate(() => {
    const s = window.__game.state;
    const out = s.applyChoicePick('N3a', 'accept', new Set());
    return {
      ink: s.fieldDiary.some((e) => e.id === 'c3-n3a-accept'),
      ledger: s.ledger.some((e) => e.node === 'N3a'),
      flags: out.some((e) => e.kind === 'story-flags' && e.flags.includes('r3-depth=accept')),
    };
  });
  check(n3a.ink && n3a.ledger && n3a.flags, 'N3a resolves through the register (accept \u2014 the Face begins)');
  check(e3.length === 0, `pass E/457 console clean (${e3.length} errors${e3.length ? ': ' + e3[0] : ''})`);
  await p3.close();

  // day 468: the bridge's books, then the cut
  const { page: p4, errors: e4 } = await bootSeason(DAY468_SAVE);
  const dateline = await p4.evaluate(() => document.getElementById('hud-dateline')?.textContent ?? '');
  check(dateline.includes('December 20'), `the frontier boots on its canon date (got "${dateline}")`);
  const cut = await linger(p4, 'c3-cut-newyear');
  check(cut.chapterAfter === 'C4', `the cut advances the chapter to C4 (got ${cut.chapterAfter})`);
  check(cut.cutEntry, 'the cut\u2019s entry is in the book (the latch)');
  const cutDate = await p4.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c3-cut-newyear');
    return e?.date ?? null;
  });
  check(cutDate && cutDate.y === 3 && cutDate.m === 1 && cutDate.d === 6,
    'the cut\u2019s entry is dated January 6, Y3 (C4\u2019s window start)');
  const wall = await p4.evaluate(() => {
    const s = window.__game.state;
    const out = s.rail();
    return {
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text),
      rolls: out.filter((e) => e.kind === 'next-day').length,
    };
  });
  check(wall.notes.length === 1 && wall.notes[0].includes('January opens its first morning'),
    'the wall holds after the cut \u2014 C4\u2019s content is the next wave\u2019s');
  check(wall.rolls === 0, 'the wall rolls nothing (the roll into C4\u2019s stations is the C4 wave\u2019s law)');
  check(e4.length === 0, `pass E/468 console clean (${e4.length} errors${e4.length ? ': ' + e4[0] : ''})`);
  await p4.close();
}

await browser.close();
await new Promise((r) => server.close(r));
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
