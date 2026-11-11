/**
 * probe-c6-long-way-back — the C6 content wave, in the BROWSER build
 * (dist/): the chapter is playable (narrative/14 §7 step 10's last
 * content wave; doc 06 §C6, "The Long Way Back", Dec Y3 → open),
 * verified where a player actually walks.
 *
 * Pass A (Day 814 — the first dollar, the roll's landing): boot the
 * day-814 save (chapter C6; the C5 cut latched — the roll already
 * landed); the dateline says December 1; the first dollar through the
 * NEW c6_first_dollar def (Ada's three lines verbatim; the amends
 * ledger's C6 column opens — the act in the book); the linger's
 * compression arms and rolls WHOLE to day 835.
 *
 * Pass B (Days 835 + 870 — the lights and the fork): the winter lights
 * through the NEW c6_lights def (the tin's ones, Yoli's terms, the
 * diegetic meter). Kev's fork through the NEW c6_kev_fork def — the
 * seeded ledger's movement tips the shelf: Kev takes the letter, and
 * Grace's row routes through it (the ledger's count grows).
 *
 * Pass C (Days 898 + 920 — the deposition and the hearing): the sworn
 * statement through the NEW c6_deposition def (the C2 meeting on the
 * record; Father Mike's row closed). The hearing through the NEW
 * c6_hearing def (the 220→280; the CLT option), then N7 resolves
 * through the pick seam — testify, the public record's shared act.
 *
 * Pass D (Days 948 + 969 + 990 — the hall, the offer, the tree):
 * Juniper Commons through the NEW c6_hall_opens def (his layout, her
 * lobby, no brochure; the lease torn). Marisol's late offer through the
 * NEW c6_late_offer def (her line verbatim), then N6's decline — the
 * peace option. The hundredth tree through the NEW c6_hundredth_tree
 * def (the album line verbatim; Verna's row at the booth).
 *
 * Pass E (Days 1002 + 1016 + OPEN — the floor, the close, the open
 * sim): Eddie's floor through the NEW c6_floor def — June's restart
 * shelf flag-read live (the C4 picks planted in-session); the
 * self-portrait through the NEW persistent self_portrait def (composed
 * from the machine's facts; F8 fires inside the first one; append-only).
 * The hospitality close through the NEW c6_hospitality def (the
 * stranger, the slice). The formal close at day 1016's linger: Odessa's
 * envelope, the Debts' verdict, the chapter through advanceChapter's
 * own door into OPEN — the terminal continuation — the wall then
 * rolling into the open sim's first ordinary morning (day 1017), and
 * the save's ceiling honest at the endgame year's turn (MAX_DAY 1179).
 *
 * Usage: node scripts/probe-c6-long-way-back.mjs   (build first: npm run build)
 * Exit 0 only when every check passes and the console is clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4641;
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

// A ledger row, the LedgerEntry shape (core/consequenceLedger's parse law).
const row = (id, y, m, d, refs, kind = 'amends', visibility = 'private', node) => ({
  id, kind, date: { y, m, d }, refs: [...refs], weight: 1, visibility,
  ...(node ? { node } : {}),
});

// The carried diary: the C0 spine's own entries + every season cut's
// entry (the chapter walked through all six doors) + K2 seeded (the C2
// lie, struck at the C5 receipts) + K4 (the standing contradiction the
// self-portrait reads).
const CARRIED_DIARY = [
  entry('c0-k1-mishear', 1, 9, 11, 'Rosa gave me the cart.'),
  entry('c1-cut-newyear', 1, 12, 23, 'this is the year I fix it', 'EVENT'),
  entry('c2-cut-summer', 2, 7, 1, 'July heat, the Fourth, Eddie\u2019s hand on the counter.', 'EVENT'),
  entry('c3-cut-newyear', 3, 1, 6, 'The season\u2019s books, closed: nineteen debts, one signature pending.', 'EVENT'),
  entry('c4-cut-julyheat', 3, 7, 3, 'The face\u2019s books, closed: the fall is not an event; it is a season.', 'EVENT'),
  entry('c5-cut-snowhoarding', 3, 12, 1, 'The year\u2019s books, closed. The soup was good, though. October, remember? Day 1 again.', 'EVENT'),
  entry('c2-k2-net-good', 2, 6, 20, 'The Compact was going to fail anyway. I saved the shop. Net good.', 'EVENT'),
  entry('c4-k4-corvus-partner', 3, 1, 14, 'Corvus is a partner. Marisol is straight with me, for a developer. \u2014 GUESS, labeled honestly, kept.', 'EVENT', 'GUESS'),
  entry('c6-test-season-entry', 3, 11, 26, 'The terminal\u2019s duffel bag learns its strap.', 'OBSERVATION'),
];

// A C6 station's day-start snapshot (what beginDay's persist writes once
// the chapter is under way). The chapter rode the save — the C5 cut
// played at day 809's linger and the machine rolled into C6 at day 814.
const seasonSave = (day, diary, ledger) => JSON.stringify({
  v: 1, day, day_complete: false, replay: false,
  cart_name: 'YOUR CORNER', money: 214, awning: true, kid_kept: true,
  idris_served: true, lunch_served: 1, day_start_money: 214,
  stool: true, map_given: true, permit: true,
  calendar_day: day,
  field_diary: diary,
  ledger: ledger ?? [],
  chapter: { chapter: 'C6', openedOnDay: 814, calendarDay: day },
  rails: {
    R1: { fired: true, firedOnDay: 1 },
    R2: { fired: true, firedOnDay: 130 },
    R3: { fired: true, firedOnDay: 457 },
    R4: { fired: true, firedOnDay: 645 },
    R5: { fired: true, firedOnDay: 743 },
    R6: { fired: false, firedOnDay: null },
  },
});

const DAY814_SAVE = seasonSave(814, CARRIED_DIARY);
const DAY835_SAVE = seasonSave(835, CARRIED_DIARY);
const DAY870_SAVE = seasonSave(870, CARRIED_DIARY, [
  row('led-c6-first-dollar', 3, 12, 1, ['ada', 'restitution', 'first-dollar']),
]);
const DAY898_SAVE = seasonSave(898, CARRIED_DIARY, [
  row('led-c6-first-dollar', 3, 12, 1, ['ada', 'restitution', 'first-dollar']),
  row('led-c6-grace-letter', 4, 1, 26, ['grace', 'kev-reference-letter']),
]);
const DAY920_SAVE = seasonSave(920, CARRIED_DIARY, [
  row('led-c6-first-dollar', 3, 12, 1, ['ada', 'restitution', 'first-dollar']),
  row('led-c6-grace-letter', 4, 1, 26, ['grace', 'kev-reference-letter']),
  row('led-c6-boiler-watch', 4, 2, 23, ['father-mike', 'boiler-watch', 'forum-apology']),
]);
const DAY948_SAVE = seasonSave(948, CARRIED_DIARY, [
  row('led-c6-first-dollar', 3, 12, 1, ['ada', 'restitution', 'first-dollar']),
  row('led-c6-grace-letter', 4, 1, 26, ['grace', 'kev-reference-letter']),
  row('led-c6-boiler-watch', 4, 2, 23, ['father-mike', 'boiler-watch', 'forum-apology']),
]);
const DAY969_SAVE = seasonSave(969, CARRIED_DIARY, [
  row('led-c6-first-dollar', 3, 12, 1, ['ada', 'restitution', 'first-dollar']),
  row('led-c6-grace-letter', 4, 1, 26, ['grace', 'kev-reference-letter']),
  row('led-c6-boiler-watch', 4, 2, 23, ['father-mike', 'boiler-watch', 'forum-apology']),
]);
const DAY990_SAVE = seasonSave(990, CARRIED_DIARY, [
  row('led-c6-first-dollar', 3, 12, 1, ['ada', 'restitution', 'first-dollar']),
  row('led-c6-grace-letter', 4, 1, 26, ['grace', 'kev-reference-letter']),
  row('led-c6-boiler-watch', 4, 2, 23, ['father-mike', 'boiler-watch', 'forum-apology']),
]);
const DAY1002_SAVE = seasonSave(1002, CARRIED_DIARY, [
  row('led-c6-first-dollar', 3, 12, 1, ['ada', 'restitution', 'first-dollar']),
  row('led-c6-grace-letter', 4, 1, 26, ['grace', 'kev-reference-letter']),
  row('led-c6-boiler-watch', 4, 2, 23, ['father-mike', 'boiler-watch', 'forum-apology']),
  row('led-c6-verna-booth', 4, 5, 26, ['verna', 'crossing-guard-booth']),
]);
const DAY1016_SAVE = seasonSave(1016, CARRIED_DIARY, [
  row('led-c6-first-dollar', 3, 12, 1, ['ada', 'restitution', 'first-dollar']),
  row('led-c6-grace-letter', 4, 1, 26, ['grace', 'kev-reference-letter']),
  row('led-c6-boiler-watch', 4, 2, 23, ['father-mike', 'boiler-watch', 'forum-apology']),
  row('led-c6-verna-booth', 4, 5, 26, ['verna', 'crossing-guard-booth']),
]);

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

/** The linger's presses at the state's own seam: the compression's
 *  montage arms, the roll jumps WHOLE (the 1:1 law), the close turns. */
async function linger(page, latchId) {
  return page.evaluate((latchId) => {
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
      chapterAfter: s.chapter.chapter,
      latchEntry: s.fieldDiary.some((e) => e.id === latchId),
    };
  }, latchId);
}

const bodyOf = (page, id) => page.evaluate((id) => {
  const e = window.__game.state.fieldDiary.find((x) => x.id === id);
  return e?.body ?? '';
}, id);

// ---------------------------------------------------------------- Pass A ----
console.log('--- Pass A: Day 814, the first dollar (the roll\u2019s landing) ---');
{
  const season = await bootSeason(DAY814_SAVE);
  const { page, errors } = season;
  const dateline = await page.evaluate(() => document.getElementById('hud-dateline')?.textContent ?? '');
  check(dateline.includes('December 1'), `the chapter boots on its canon date (got "${dateline}")`);
  const head = await page.evaluate(() => {
    const s = window.__game.state;
    return { day: s.day, chapter: s.chapter.chapter, isC6: s.isC6 };
  });
  check(head.day === 814 && head.chapter === 'C6' && head.isC6, 'the chapter\u2019s own morning is on the clock (the C6 pack\u2019s voice)');
  // the first dollar through the NEW c6_first_dollar def
  const dollar = await viaRegistry(page, 'c6_first_dollar', 'c6-first-dollar');
  check(dollar.landed, 'the first dollar lands through the registry\u2019s own def');
  const dollarBody = await bodyOf(page, 'c6-first-dollar');
  check(dollarBody.includes('I got your postcards.'), 'Ada\u2019s three lines verbatim (the first line in the book)');
  const ledgerCount = await page.evaluate(() => window.__game.state.c6AmendsActs());
  check(ledgerCount === 1, `the amends ledger\u2019s C6 column opens (acts=${ledgerCount})`);
  // the linger's compression arms and rolls WHOLE to day 835
  const comp = await linger(page, 'c6-close-nine-months');
  check(comp.pending === 835, 'the compression arms the two-press linger (pending=835)');
  check(comp.intro.some((t) => t.includes('Three weeks from the first dollar')), 'the montage\u2019s own voice (the first winter\u2019s gap)');
  check(!comp.latchEntry, 'the close\u2019s latch untouched by a mid-chapter linger');
  check(errors.length === 0, `pass A console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);
}

// ---------------------------------------------------------------- Pass B ----
console.log('--- Pass B: Days 835 + 870, the lights and the fork ---');
{
  const season = await bootSeason(DAY835_SAVE);
  const { page, errors } = season;
  const lights = await viaRegistry(page, 'c6_lights', 'c6-winter-lights');
  check(lights.landed, 'the winter lights land through the registry\u2019s own def');
  const lightsBody = await bodyOf(page, 'c6-winter-lights');
  check(lightsBody.includes('The block keeps a light on'), 'the block\u2019s own verdict in the book (doc 04\u2019s C6 line)');
  check(errors.length === 0, `pass B/835 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);
}
{
  const season = await bootSeason(DAY870_SAVE);
  const { page, errors } = season;
  // the fork: the seeded ledger's movement tips the shelf — Kev takes it
  const fork = await viaRegistry(page, 'c6_kev_fork', 'c6-kev-fork');
  check(fork.landed, 'Kev\u2019s fork lands through the registry\u2019s own def');
  const forkBody = await bodyOf(page, 'c6-kev-fork');
  check(forkBody.includes('Kev reads it twice'), 'the take\u2019s shelf: the ledger\u2019s movement is the witness');
  const ledgerCount = await page.evaluate(() => window.__game.state.c6AmendsActs());
  check(ledgerCount === 2, `Grace\u2019s row routed through the letter, not cash (acts=${ledgerCount})`);
  check(errors.length === 0, `pass B/870 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);
}

// ---------------------------------------------------------------- Pass C ----
console.log('--- Pass C: Days 898 + 920, the deposition and the hearing ---');
{
  const season = await bootSeason(DAY898_SAVE);
  const { page, errors } = season;
  const dep = await viaRegistry(page, 'c6_deposition', 'c6-deposition');
  check(dep.landed, 'the sworn statement lands through the registry\u2019s own def');
  const depBody = await bodyOf(page, 'c6-deposition');
  check(depBody.includes('on the record, forever'), 'the C2 meeting on the record (Deniz\u2019s price, not money)');
  const ledgerCount = await page.evaluate(() => window.__game.state.c6AmendsActs());
  check(ledgerCount === 3, `Father Mike\u2019s row closed (acts=${ledgerCount})`);
  check(errors.length === 0, `pass C/898 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);
}
{
  const season = await bootSeason(DAY920_SAVE);
  const { page, errors } = season;
  const hearing = await viaRegistry(page, 'c6_hearing', 'c6-hearing');
  check(hearing.landed, 'the hearing lands through the registry\u2019s own def');
  const hearingBody = await bodyOf(page, 'c6-hearing');
  check(hearingBody.includes('two hundred eighty'), 'the 220\u2192280 in the book (doc 12 \u00a72\u2019s fixed event)');
  // the hearing has played: the def's second press offers N7 — resolve
  // testify through the pick seam (the public record's shared act)
  const pick = await page.evaluate(() => {
    const g = window.__game;
    const s = g.state;
    const prompt = s.c6Hearing();
    const isPrompt = prompt.length === 1 && prompt[0].kind === 'diary-prompt' && prompt[0].node === 'N7';
    const out = s.applyChoicePick('N7', 'testify');
    return {
      isPrompt,
      flags: (out.find((e) => e.kind === 'story-flags') ?? { flags: [] }).flags,
      ledgerVis: (s.ledger.find((e) => e.node === 'N7') ?? {}).visibility ?? null,
      inked: s.fieldDiary.some((e) => e.id === 'c6-n7-testify'),
    };
  });
  check(pick.isPrompt, 'the hearing\u2019s second press offers N7 (the pick rides the beat)');
  check(pick.flags.includes('node:N7=testify') && pick.flags.includes('epilogue-taste=testify'), 'N7\u2019s flags land (the register\u2019s own rows)');
  check(pick.ledgerVis === 'shared', 'the public-record law: testify posts SHARED');
  check(pick.inked, 'the pick\u2019s ink in the book (c6-n7-testify)');
  check(errors.length === 0, `pass C/920 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);
}

// ---------------------------------------------------------------- Pass D ----
console.log('--- Pass D: Days 948 + 969 + 990, the hall, the offer, the tree ---');
{
  const season = await bootSeason(DAY948_SAVE);
  const { page, errors } = season;
  const hall = await viaRegistry(page, 'c6_hall_opens', 'c6-hall-opens');
  check(hall.landed, 'Juniper Commons opens through the registry\u2019s own def');
  const hallBody = await bodyOf(page, 'c6-hall-opens');
  check(hallBody.includes('no brochure'), 'his layout, her lobby, his name in no brochure');
  check(hallBody.includes('parking-lot lease'), 'Father Mike\u2019s lease torn the same morning (the load-bearing edge resolved)');
  check(errors.length === 0, `pass D/948 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);
}
{
  const season = await bootSeason(DAY969_SAVE);
  const { page, errors } = season;
  const offer = await viaRegistry(page, 'c6_late_offer', 'c6-late-offer');
  check(offer.landed, 'Marisol\u2019s late offer lands through the registry\u2019s own def');
  const offerBody = await bodyOf(page, 'c6-late-offer');
  check(offerBody.includes('You were the best community face I ever hired.'), 'Marisol\u2019s line verbatim (doc 09 \u00a77\u2019s test)');
  // N6's decline — the peace option, neither graded
  const pick = await page.evaluate(() => {
    const s = window.__game.state;
    s.applyChoicePick('N6', 'decline');
    return {
      flags: s.storyFlagMemo.has('self-portrait-raw-material=decline'),
      ledgerVis: (s.ledger.find((e) => e.node === 'N6') ?? {}).visibility ?? null,
      inked: s.fieldDiary.some((e) => e.id === 'c6-n6-decline'),
    };
  });
  check(pick.flags, 'N6\u2019s flag lands (the self-portrait\u2019s raw material)');
  check(pick.ledgerVis === 'private', 'the offer\u2019s act stays private (the register\u2019s own column)');
  check(pick.inked, 'the decline\u2019s ink in the book');
  check(errors.length === 0, `pass D/969 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);
}
{
  const season = await bootSeason(DAY990_SAVE);
  const { page, errors } = season;
  const tree = await viaRegistry(page, 'c6_hundredth_tree', 'c6-hundredth-tree');
  check(tree.landed, 'the hundredth tree lands through the registry\u2019s own def');
  const treeBody = await bodyOf(page, 'c6-hundredth-tree');
  check(treeBody.includes('Start late. Finish anyway.'), 'the album\u2019s line verbatim (El Vann\u2019s one sentimental act)');
  const ledgerCount = await page.evaluate(() => window.__game.state.c6AmendsActs());
  check(ledgerCount === 4, `Verna\u2019s row closed at the booth (acts=${ledgerCount})`);
  check(errors.length === 0, `pass D/990 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);
}

// ---------------------------------------------------------------- Pass E ----
console.log('--- Pass E: Days 1002 + 1016 + OPEN, the floor, the close, the open sim ---');
{
  const season = await bootSeason(DAY1002_SAVE);
  const { page, errors } = season;
  // June's restart shelf, flag-read live (the C4 machine's own flags planted)
  await page.evaluate(() => {
    const s = window.__game.state;
    s.applyChoicePick('N4b', 'full-disclosure');
    s.applyChoicePick('N4d', 'therapy');
  });
  const floor = await page.evaluate(async () => {
    const g = window.__game;
    const def = g.registry.byId('c6_floor');
    if (!def) return { latched: false, notes: [] };
    const out = def.perform({ state: g.state, game: g });
    await new Promise((r) => requestAnimationFrame(r));
    return {
      latched: g.state.fieldDiary.some((e) => e.id === 'c6-eddie-floor'),
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text),
    };
  });
  check(floor.latched, 'the floor lands through the registry\u2019s own def');
  check(floor.notes.join(' ').includes('betrothal'), 'June\u2019s restart shelf reads the flags (her language\u2019s whole vocabulary)');
  // the self-portrait: the persistent slot, F8 inside the first one
  const portrait = await viaRegistry(page, 'self_portrait', 'c6-self-portrait-1');
  check(portrait.landed, 'the self-portrait writes through the persistent slot');
  const pBody = await bodyOf(page, 'c6-self-portrait-1');
  check(pBody.includes('Facts: $'), 'the portrait composes from the machine\u2019s own facts');
  check(pBody.length <= 600, `the portrait is law-sized (the diary\u2019s own cap: ${pBody.length})`);
  const f8 = await bodyOf(page, 'c6-f8-day1');
  check(f8.includes('green notebook') && f8.includes('Day 1'), 'F8 fired inside the first portrait (the diary\u2019s own birth, the register\u2019s row)');
  // a rewrite the same day is refused; the portrait never grades
  const oncePerDay = await page.evaluate(() => window.__game.state.writeSelfPortrait());
  check(oncePerDay.length === 0, 'the notebook writes once a day (the rewrite refused)');
  check(errors.length === 0, `pass E/1002 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);
}
{
  const season = await bootSeason(DAY1016_SAVE);
  const { page, errors } = season;
  // the hospitality close through the NEW c6_hospitality def
  const hosp = await viaRegistry(page, 'c6_hospitality', 'c6-close-hospitality');
  check(hosp.landed, 'the hospitality close lands through the registry\u2019s own def');
  const hospBody = await bodyOf(page, 'c6-close-hospitality');
  check(hospBody.includes('kept the ritual') && hospBody.includes('duffel'), 'the stranger, the slice, the ritual kept (doc 06 \u00a7C6\u2019s last event)');
  // the formal close at day 1016's linger: the verdict, the turn to OPEN
  const close = await linger(page, 'c6-close-nine-months');
  check(close.latchEntry, 'the formal close\u2019s entry latched (the nine-month mark)');
  check(close.chapterAfter === 'OPEN', 'the chapter turned OPEN through advanceChapter\u2019s own door');
  check(close.rollTo === 1017, `the wall then rolls into the open sim\u2019s first morning (rollTo=${close.rollTo})`);
  const closeBody = await bodyOf(page, 'c6-close-nine-months');
  check(closeBody.includes('The window closes. The city does not.'), 'the close\u2019s last line in the book');
  // the ledger rides unchanged (R15's law) and the Debts' verdict fired
  const ledgerCount = await page.evaluate(() => window.__game.state.c6AmendsActs());
  check(ledgerCount === 5, `Odessa\u2019s envelope logged last (acts=${ledgerCount})`);
  check(errors.length === 0, `pass E/1016 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  // the open chapter: an ordinary morning needs no rail; the save's
  // ceiling honest at the endgame year's turn
  const open = await page.evaluate(() => {
    const s = window.__game.state;
    s.day = 1017; s.calendarDay = 1017;
    s.setStep(37);
    s.lingerStage = 2;
    const out = s.rail();
    return {
      isOpen: s.isOpen,
      hasNext: out.some((e) => e.kind === 'next-day'),
      hasNextTo: (out.find((e) => e.kind === 'next-day') ?? {}).to ?? null,
    };
  });
  check(open.isOpen, 'the open chapter is the terminal continuation (no endscreen)');
  check(open.hasNext && (open.hasNextTo === null || open.hasNextTo === 1018), 'the open chapter\u2019s ordinary mornings roll plainly (the plain next-day; the city keeps its one note)');
  check(errors.length === 0, `pass E/open console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await closeSeason(season);
}

console.log(`\n${checks} checks, ${failures} failures`);
server.close();
process.exit(failures === 0 ? 0 : 1);
