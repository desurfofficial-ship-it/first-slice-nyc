/**
 * probe-c0-week — the C0 pack's tranche 3, in the BROWSER build (dist/):
 * the stabilized week (Days 5–7, doc 11 §7) and the season cut, verified
 * where a player actually walks.
 *
 * Pass A (Day 5 — the loop's open): boot the day-5 morning save; the
 * dateline says September 13; Rosa's wake opens the rush on the week's
 * own queue; three brews land on WK_ROAM; Miss Odessa's nod — the beat
 * that shipped one wall too early — finally answers on a live day.
 *
 * Pass B (Day 7 — the wobble + the cut): boot the day-7 save; the
 * dateline says September 15; passing the laundromat writes Entry 5's
 * RECALL wobble (F1's long fuse, faint, once); the linger's rail plays
 * the C0→C1 interstitial — the diary montage from HIS OWN week, the
 * city's morning-after line, Eddie at Monday's door — and the cut's
 * latch rides the save.
 *
 * Usage: node scripts/probe-c0-week.mjs   (build first: npm run build)
 * Exit 0 only when every check passes and the console is clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
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

// A diary entry, the FieldDiaryEntry shape (core/fieldDiary's parser law:
// every field checked, wrong shapes fall out — these are well-formed).
const entry = (id, day, body) => ({
  id, kind: 'OBSERVATION',
  date: { y: 1, m: 9, d: 8 + day },
  epistemic: 'FACT', body, links: [], visibility: 'private', corrections: [],
});

// The day-5 / day-7 day-start snapshots — what beginDay's persist writes
// for a player deep in the week (the cart corner, the stool, the permit).
const weekSave = (day, diary) => JSON.stringify({
  v: 1, day, day_complete: false, replay: false,
  cart_name: 'YOUR CORNER', money: 123, awning: true, kid_kept: true,
  idris_served: true, lunch_served: 1, day_start_money: 123,
  stool: true, map_given: true, permit: true,
  calendar_day: day,
  field_diary: diary,
});

const DAY5_SAVE = weekSave(5, [
  entry('c0-k1-mishear', 3, 'Rosa gave me the cart.'),
]);
const DAY7_SAVE = weekSave(7, [
  entry('c0-k1-mishear', 3, 'Rosa gave me the cart.'),
  entry('c0-theory-0', 3, 'What kind of place gives away the first slice?'),
]);

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failures++;
};

async function bootWeek(save) {
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

/** The probe's walkTo — the probe-day3 pattern (camYaw-relative keys). */
async function walkTo(page, x, z, timeoutS = 25) {
  return page.evaluate(async ({ x, z, timeoutS }) => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const t0 = performance.now();
    let frames = 0;
    while (performance.now() - t0 < timeoutS * 1000) {
      const p = g.player.capsule;
      const dx = x - p.x, dz = z - p.z;
      if (Math.hypot(dx, dz) < 0.4) break;
      const yaw = g.player.camYaw;
      const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
      const rightX = -Math.cos(yaw), rightZ = Math.sin(yaw);
      const len = Math.hypot(dx, dz) || 1;
      const nx = dx / len, nz = dz / len;
      const f = nx * fwdX + nz * fwdZ;
      const r = nx * rightX + nz * rightZ;
      g.input.injectKey('KeyW', f > 0.2);
      g.input.injectKey('KeyS', f < -0.2);
      g.input.injectKey('KeyD', r > 0.2);
      g.input.injectKey('KeyA', r < -0.2);
      await nextFrame();
      frames++;
    }
    g.input.injectKey('KeyW', false);
    g.input.injectKey('KeyS', false);
    g.input.injectKey('KeyD', false);
    g.input.injectKey('KeyA', false);
    await new Promise((r) => requestAnimationFrame(() => r()));
    const p = window.__game.player.capsule;
    return { frames, dist: Math.hypot(x - p.x, z - p.z) };
  }, { x, z, timeoutS });
}

// ---------------------------------------------------------------- Pass A ----
console.log('--- Pass A: Day 5, the loop\u2019s open ---');
{
  const { page, errors } = await bootWeek(DAY5_SAVE);
  const a = await page.evaluate(() => {
    const g = window.__game;
    const s = g.state;
    return {
      day: s.day, step: s.step, dateline: document.getElementById('hud-dateline')?.textContent ?? '',
      objective: document.getElementById('objective')?.textContent ?? '',
      calendarDay: s.calendarDay,
    };
  });
  check(a.day === 5 && a.step === 33, `day 5 boots at WK_WAKE (day=${a.day} step=${a.step})`);
  check(a.dateline.includes('September 13'), `the dateline is September 13 (${a.dateline.trim()})`);

  // dismiss the morning note, walk to Rosa, take the wake beat
  await page.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    for (let i = 0; i < 8 && !g.ui.nameBox.hidden; i++) { g.input.injectInteract(); await nextFrame(); for (let k = 0; k < 6; k++) await nextFrame(); }
  });
  const wr = await walkTo(page, 6.0, -4.6);
  check(wr.dist < 2.6, `walked to Rosa for the wake beat (dist=${wr.dist.toFixed(2)})`);
  const wake = await page.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    for (let i = 0; i < 6; i++) {
      g.input.injectInteract();
      for (let k = 0; k < 8; k++) await nextFrame();
      if (g.state.step === 34) return { step: g.state.step };
    }
    return { step: g.state.step };
  });
  check(wake.step === 34, `Rosa\u2019s week wake opens the rush (step=${wake.step} = WK_RUSH)`);

  // the rush: three brews at the cart (the idris customer walks in first)
  const rush = await page.evaluate(async () => {
    const g = window.__game;
    const s = g.state;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const waitFrames = async (n) => { for (let i = 0; i < n; i++) await nextFrame(); };
    const moneyBefore = s.money;
    let serves = 0;
    const deadline = performance.now() + 120000;
    while (serves < 3 && performance.now() < deadline) {
      // stand at the cart
      const p = g.player.capsule;
      const dx = 3 - p.x, dz = -5.4 - p.z;
      if (Math.hypot(dx, dz) > 0.4) {
        const yaw = g.player.camYaw;
        const len = Math.hypot(dx, dz) || 1;
        const f = ((dx / len) * Math.sin(yaw)) + ((dz / len) * Math.cos(yaw));
        const r = ((dx / len) * -Math.cos(yaw)) + ((dz / len) * Math.sin(yaw));
        g.input.injectKey('KeyW', f > 0.2); g.input.injectKey('KeyS', f < -0.2);
        g.input.injectKey('KeyD', r > 0.2); g.input.injectKey('KeyA', r < -0.2);
        await nextFrame();
        continue;
      }
      g.input.injectKey('KeyW', false); g.input.injectKey('KeyS', false);
      g.input.injectKey('KeyD', false); g.input.injectKey('KeyA', false);
      if (s.step !== 34) break;
      if (!g.input.sample().interact) g.input.injectInteract(); // start the brew
      await waitFrames(6);
      // wait for the brew to land (Game owns the clock)
      const t0 = performance.now();
      while (s.brewing && performance.now() - t0 < 20000) await nextFrame();
      if (!s.brewing) { serves++; await waitFrames(10); }
    }
    return { serves, step: s.step, earned: s.money - moneyBefore };
  });
  check(rush.serves === 3, `the week\u2019s rush serves three (${rush.serves})`);
  check(rush.step === 35, `the rush done opens the roam (step=${rush.step} = WK_ROAM)`);
  check(rush.earned === 11, `the rush pays the queue\u2019s honest $11 (got $${rush.earned})`);

  // Miss Odessa's nod — the beat the old wall hid
  const or = await walkTo(page, 13.2, 7.6);
  const odessa = await page.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    for (let i = 0; i < 6; i++) {
      g.input.injectInteract();
      for (let k = 0; k < 8; k++) await nextFrame();
      if (g.state.fieldDiary.some((e) => e.id === 'c0-h3-odessa')) {
        return { nod: true, body: g.state.fieldDiary.find((e) => e.id === 'c0-h3-odessa')?.body ?? '' };
      }
    }
    return { nod: false, body: '' };
  });
  check(odessa.nod, `Miss Odessa\u2019s nod lands on a live Day 5 (walk dist=${or.dist.toFixed(2)})`);
  check(odessa.body.includes('nods like a handshake'), 'the nod\u2019s diary entry is in the book');
  check(errors.length === 0, `pass A console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();
}

// ---------------------------------------------------------------- Pass B ----
console.log('--- Pass B: Day 7, the wobble + the cut ---');
{
  const { page, errors } = await bootWeek(DAY7_SAVE);
  const b = await page.evaluate(() => {
    const g = window.__game;
    const s = g.state;
    return { day: s.day, step: s.step, dateline: document.getElementById('hud-dateline')?.textContent ?? '' };
  });
  check(b.day === 7 && b.step === 33, `day 7 boots at WK_WAKE (day=${b.day} step=${b.step})`);
  check(b.dateline.includes('September 15'), `the dateline is September 15 (${b.dateline.trim()})`);

  // dismiss the morning note, then pass the laundromat — F1's fuse
  await page.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    for (let i = 0; i < 8 && !g.ui.nameBox.hidden; i++) { g.input.injectInteract(); await nextFrame(); for (let k = 0; k < 6; k++) await nextFrame(); }
  });
  await walkTo(page, -7.0, 7.3);
  await page.waitForTimeout(600); // the per-frame trigger samples the capsule
  const wob = await page.evaluate(() => {
    const g = window.__game;
    const e = g.state.fieldDiary.find((x) => x.id === 'c0-e5-wobble');
    return { fired: !!e, kind: e?.kind ?? '', tag: e?.epistemic ?? '', body: e?.body ?? '' };
  });
  check(wob.fired, 'the RECALL wobble fires on the laundromat pass (calendar day 7)');
  check(wob.kind === 'RECALL' && wob.tag === 'RECALL', 'the wobble is RECALL kind AND tag (the faint law)');
  check(wob.body.includes('motel hum'), 'the wobble is the motel hum, faint, unexplained');

  // the cut: the linger's rail at the week's last postcard (the machine
  // seam the press reaches — the E2E and the vitest suite cover the press)
  const cut = await page.evaluate(() => {
    const g = window.__game;
    const s = g.state;
    s.setStep(37); // WK_POSTCARD
    s.lingerStage = 2;
    const out = s.rail();
    return {
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text),
      persisted: out.some((e) => e.kind === 'persist'),
      latch: s.fieldDiary.some((e) => e.id === 'c0-cut-monday'),
    };
  });
  check(cut.notes.some((t) => t.includes('The new one remembered the usual.')), 'the city\u2019s morning-after line speaks (doc 11 \u00A77, verbatim)');
  check(cut.notes.some((t) => t.includes('Real shift. Leave the tricks in Ohio.')), 'Eddie is at Monday\u2019s door (doc 11 \u00A77, verbatim)');
  check(cut.notes.some((t) => t.includes('Rosa gave me the cart.')), 'the montage is HIS week (the mishear\u2019s line rides it)');
  check(cut.latch && cut.persisted, 'the cut\u2019s latch is the diary entry and it rides the save');
  const wall = await page.evaluate(() => {
    const g = window.__game;
    const out = g.state.rail();
    return {
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text),
      rollTo: (out.find((e) => e.kind === 'next-day') ?? {}).to ?? null,
    };
  });
  check(wall.notes.length === 1, 'a second rail reads the wall, never a second cut');
  // the C1 wave's law: the wall's next press ROLLS into C1's first
  // station (Monday, Sept 16 — the real shift; the replay path still
  // holds, pinned by the vitest suite)
  check(wall.rollTo === 8, 'the wall\u2019s next press rolls into C1\u2019s first morning (day 8 \u2014 the C1 wave\u2019s law)');
  check(errors.length === 0, `pass B console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();
}

await browser.close();
server.close();
if (failures > 0) {
  console.log(`PROBE-C0-WEEK: ${failures} FAILURES`);
  process.exit(1);
}
console.log('PROBE-C0-WEEK: ALL CHECKS PASSED');
process.exit(0);
