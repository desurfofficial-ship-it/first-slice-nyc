/**
 * WP-6 diary-ink probe — the field diary and the dateline, proven in the
 * real built game (dist/) at the acceptance viewport (390×844):
 *
 *   - the HUD dateline renders from the calendar (never real time):
 *     "September 9 · Year 1" on day 1, in the hand ink, readable;
 *   - the Map gains the diary leaf: "my diary" tab folds the leaf over
 *     the notebook; the empty page waits in voice;
 *   - seeded entries render as ink: the mechanical epistemic tag, the
 *     calendar dateline per entry (through formatGameDate), the
 *     contradiction strike as a TEXT style with the margin note, the
 *     RECALL wobble marked;
 *   - the ink's bytes survive rendering: stripping the strike span
 *     returns the frozen body (append-only survives rendering);
 *   - the fold-back works; console stays clean.
 *
 * The seeded entries are probe fixtures in Leo's voice — the correction
 * quotes doc 03 §5.1's own example (the canon mechanism demo), not game
 * content (the C0 content pack supplies prose later, narrative/14 §7).
 *
 * Exit 0 = every assertion passed AND the console stayed clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const SHOTS = new URL('../shots', import.meta.url).pathname;
const PORT = 4606;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
// The acceptance viewport: a 390×844 phone. The driver boots without the
// film (navigator.webdriver), so the HUD and the street are live at once.
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForFunction(() => !document.getElementById('hud')?.hidden, null, { timeout: 30000 });

const steps = [];
const check = (ok, label) => { steps.push(`${ok ? 'PASS' : 'FAIL'} ${label}`); return ok; };
let ok = true;

// ---- 1. the HUD dateline — the calendar date the block is living ----
const hud = await page.evaluate(() => {
  const el = document.getElementById('hud-dateline');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { text: el.textContent, font: cs.fontFamily, size: parseFloat(cs.fontSize), visible: !el.closest('#hud')?.hidden };
});
ok = check(!!hud, 'the HUD dateline is mounted') && ok;
ok = check(hud?.text === 'September 9 \u00B7 Year 1', `day 1 renders the ruled epoch ("${hud?.text}")`) && ok;
ok = check(!!hud?.font && hud.font.includes('Bradley Hand'), 'the dateline is hand ink (the shipped handwriting stack)') && ok;
ok = check((hud?.size ?? 0) >= 12, `the dateline is readable at 390px (${hud?.size}px)`) && ok;

// ---- 2. the Map opens; the diary leaf waits behind its tab ----
await page.evaluate(() => window.__game.toggleMap());
await page.waitForFunction(() => !document.getElementById('map-panel')?.hidden, null, { timeout: 10000 });
const tabBefore = await page.evaluate(() => {
  const t = document.getElementById('diary-tab');
  if (!t) return null;
  return { text: t.textContent, expanded: t.getAttribute('aria-expanded'), visible: !!t.offsetParent };
});
ok = check(!!tabBefore?.visible, 'the diary tab is on the sheet (mounted on the first Map open)') && ok;
ok = check(tabBefore?.text === 'my diary', `the tab speaks in voice ("${tabBefore?.text}")`) && ok;
ok = check(tabBefore?.expanded === 'false', 'the leaf starts folded') && ok;

// ---- 3. the fold: the leaf opens over the notebook, empty page in voice ----
await page.click('#diary-tab');
const emptyLeaf = await page.evaluate(() => {
  const leaf = document.getElementById('map-diary-leaf');
  const empty = document.getElementById('map-diary-empty');
  const dl = document.getElementById('map-diary-dateline');
  return {
    open: leaf?.classList.contains('open'),
    dl: dl?.textContent,
    emptyVisible: !empty?.hidden && !!empty?.offsetParent,
    emptyText: empty?.textContent,
    entries: document.querySelectorAll('#map-diary-list .diary-entry').length,
  };
});
ok = check(emptyLeaf.open === true, 'the tab folds the leaf over the notebook') && ok;
ok = check(emptyLeaf.dl === 'September 9 \u00B7 Year 1', `the leaf shares the HUD\u2019s dateline ("${emptyLeaf.dl}")`) && ok;
ok = check(emptyLeaf.emptyVisible === true, `the empty page waits in voice ("${emptyLeaf.emptyText?.trim()}")`) && ok;
ok = check(emptyLeaf.entries === 0, 'no entries yet \u2014 the machine is ahead of its content') && ok;
mkdirSync(dirname(SHOTS + '/x'), { recursive: true });
await page.screenshot({ path: join(SHOTS, 'diary-ink-empty-390.png') });

// ---- 4. seed probe fixtures through the honest seam, then re-read ----
const seeded = await page.evaluate(() => {
  const s = window.__game.state;
  const a = s.logDiaryEntry({
    id: 'E-Y1-0909-01', kind: 'PLACE', date: { y: 1, m: 9, d: 9 }, epistemic: 'FACT',
    body: 'Corner Slice. One hero oven, a radio that only likes the Mets. I have $87 and a folding cart.',
    links: [], visibility: 'private', corrections: [],
  });
  const b = s.logDiaryEntry({
    id: 'E-Y1-0909-02', kind: 'RECALL', date: { y: 1, m: 9, d: 9 }, epistemic: 'RECALL',
    body: 'The platform smelled like rain on warm stone. I think I knew it once. I don\u2019t know where.',
    links: [], visibility: 'private', corrections: [],
  });
  const c = s.logDiaryEntry({
    id: 'E-Y1-0909-03', kind: 'TALK', date: { y: 1, m: 9, d: 9 }, epistemic: 'FACT',
    body: 'Rosa gave me the cart.',
    links: [], visibility: 'private', corrections: [],
  });
  // the contradiction lands through the correction seam \u2014 the append-only door
  const d = s.correctDiaryEntry('E-Y1-0909-03', 6, 'gave me', 'Loaned. She never said give. I heard what I needed. \u2014 L');
  return { a, b, c, d, count: s.fieldDiary.length };
});
ok = check(seeded.a && seeded.b && seeded.c && seeded.d, 'three entries appended + one correction through the GameState seams') && ok;
ok = check(seeded.count === 3, `the diary holds exactly the three (${seeded.count})`) && ok;

// the Map is open: fold the leaf back and re-open it \u2014 a fresh render picks the entries up
await page.click('#diary-tab');
await page.evaluate(() => window.__game.toggleMap()); // close
await page.evaluate(() => window.__game.toggleMap()); // open (re-renders the ink)
await page.click('#diary-tab');

const ink = await page.evaluate(() => {
  const entries = [...document.querySelectorAll('#map-diary-list .diary-entry')];
  const byId = (id) => entries.find((e) => e.dataset.entryId === id);
  const recall = byId('E-Y1-0909-02');
  const corrected = byId('E-Y1-0909-03');
  const body = corrected?.querySelector('.diary-body');
  const bodyText = body?.textContent ?? '';
  const bodyHtml = body?.innerHTML ?? '';
  const cs = body ? getComputedStyle(body) : null;
  const recallBody = recall?.querySelector('.diary-body');
  const recallCs = recallBody ? getComputedStyle(recallBody) : null;
  return {
    count: entries.length,
    meta: entries[0]?.querySelector('.diary-entry-meta')?.textContent,
    recallMarked: recall?.dataset.epistemic === 'RECALL',
    recallTilted: recallCs ? recallCs.transform !== 'none' : false,
    recallSoft: recallCs ? recallCs.color !== getComputedStyle(entries[0].querySelector('.diary-body')).color : false,
    strikePresent: !!corrected?.querySelector('.diary-strike'),
    strikeText: corrected?.querySelector('.diary-strike')?.textContent,
    marginText: corrected?.querySelector('.diary-margin')?.textContent,
    bytesSurvive: bodyText === 'Rosa gave me the cart.',
    strikeIsText: bodyHtml.includes('<span class="diary-strike">gave me</span>'),
    inkSize: cs ? parseFloat(cs.fontSize) : 0,
    inkFont: cs?.fontFamily ?? '',
    emptyGone: document.getElementById('map-diary-empty')?.hidden,
  };
});
ok = check(ink.count === 3, `all three entries render as ink (${ink.count})`) && ok;
ok = check(ink.meta === 'FACT \u00B7 September 9 \u00B7 Year 1', `the meta line is the mechanical tag + the calendar dateline ("${ink.meta}")`) && ok;
ok = check(ink.recallMarked, 'the RECALL entry is marked for the wobble (data-epistemic)') && ok;
ok = check(ink.recallTilted, 'the RECALL wobble renders (a fixed transform, soft ink)') && ok;
ok = check(ink.recallSoft, 'the RECALL ink is soft (a different color than FACT\u2019s)') && ok;
ok = check(ink.strikePresent, 'the contradiction strike renders') && ok;
ok = check(ink.strikeText === 'gave me', `the strike quotes the offending text ("${ink.strikeText}")`) && ok;
ok = check(ink.marginText === 'Loaned. She never said give. I heard what I needed. \u2014 L', 'the margin note renders in current-tense Leo') && ok;
ok = check(ink.bytesSurvive, 'the body\u2019s bytes survive rendering (append-only survives the ink)') && ok;
ok = check(ink.strikeIsText, 'the strike is a text style (a span, never an image)') && ok;
ok = check((ink.inkSize ?? 0) >= 14, `the entries are readable at 390px (${ink.inkSize}px)`) && ok;
ok = check(!!ink.inkFont && ink.inkFont.includes('Bradley Hand'), 'the entries are hand ink') && ok;
ok = check(ink.emptyGone === true, 'the empty page stands down once the ink arrives') && ok;

mkdirSync(dirname(SHOTS + '/x'), { recursive: true });
await page.screenshot({ path: join(SHOTS, 'diary-ink-390.png') });
// the HUD's corner — the dateline under the clock
await page.screenshot({
  path: join(SHOTS, 'diary-dateline-390.png'),
  clip: { x: 390 - 230, y: 0, width: 230, height: 130 },
});

// ---- 5. the fold-back ----
await page.click('#diary-tab');
const folded = await page.evaluate(() => ({
  open: document.getElementById('map-diary-leaf')?.classList.contains('open'),
  expanded: document.getElementById('diary-tab')?.getAttribute('aria-expanded'),
}));
ok = check(folded.open === false && folded.expanded === 'false', 'the tab folds the leaf back') && ok;

ok = check(errors.length === 0, `console clean (${errors.length} errors)`) && ok;
for (const e of errors) console.error(`CONSOLE: ${e}`);

await browser.close();
server.close();
for (const s of steps) console.log(s);
console.log(ok ? '\nprobe-diary-ink: ALL CHECKS PASSED' : '\nprobe-diary-ink: FAILURES PRESENT');
process.exit(ok ? 0 : 1);
