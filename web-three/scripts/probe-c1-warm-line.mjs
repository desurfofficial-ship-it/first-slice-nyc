/**
 * probe-c1-warm-line — the C1 content wave, in the BROWSER build (dist/):
 * the season is playable (narrative/14 §7 step 8; doc 06 §C1, Sept 16 –
 * Dec 23, Y1), verified where a player actually walks.
 *
 * Pass A (Day 8 — the real shift): boot the day-8 save (the cut has
 * played; the chapter rode the save); the dateline says September 16;
 * Eddie names the rung out loud (doc 06 §C1 event 1, verbatim); the
 * framed notice is on the wall; the real shift's rush serves FOUR orders
 * and pays the honest $14; the linger's compression arms and rolls the
 * counters WHOLE to day 29.
 *
 * Pass B (Day 29, the quiet weeks — October 7): the compression's
 * landing date is the boot's own dateline; June and the DOB wall (the
 * fixer's first taste); the petition where the lost cat was; Kev's
 * lanyard (F6's RECALL ink, the register's row).
 *
 * Pass C (the dryer bank + the storm — October 8 → October 29): Yoli's
 * freezer drive at the board; F1's three RECALL entries at the dryer
 * bank (once, the register's own clauses, AFTER the rush — end of day's
 * law); the storm's morning lands on October 29 and the soup queue
 * serves its honest $8.
 *
 * Pass D (December + the cut — Dec 12 → Dec 23 → New Year): Craig's
 * visit, Rosa's cigar box, Yoli's 1994 (verbatim); the second notice and
 * the flour line (verbatim); N1a the promise through the register's own
 * machine (the ledger carries the promise with its due); the linger's
 * cut — the season's montage, the notice staged back into its frame, the
 * over-tag entry dated New Year's Day, the chapter at C2 through
 * advanceChapter's own door at Jan 6, and the wall answering a replayed
 * linger.
 *
 * Usage: node scripts/probe-c1-warm-line.mjs   (build first: npm run build)
 * Exit 0 only when every check passes and the console is clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
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

// The week's diary, carried into the season (the montage composes from it).
const WEEK_DIARY = [
  entry('c0-k1-mishear', 1, 9, 11, 'Rosa gave me the cart.'),
  entry('c0-theory-0', 1, 9, 11, 'What kind of place gives away the first slice?'),
  entry('c0-cut-monday', 1, 9, 16, 'One week. Facts only, and the facts are good.'),
];

// A C1 station's day-start snapshot (what beginDay's persist writes once
// the season is under way). The chapter rides the save — the cut played
// at day 7's linger and the machine advanced to C1 at day 8. The rails
// ride too (R1 fired at the arrival — a crafted save that omits them
// re-fires the spine and the R1 whisper would speak over the station's
// begin note; the machine's own law: the spine is never skipped).
const seasonSave = (day, diary) => JSON.stringify({
  v: 1, day, day_complete: false, replay: false,
  cart_name: 'YOUR CORNER', money: 138, awning: true, kid_kept: true,
  idris_served: true, lunch_served: 1, day_start_money: 138,
  stool: true, map_given: true, permit: true,
  calendar_day: day,
  field_diary: diary,
  chapter: { chapter: 'C1', openedOnDay: 8, calendarDay: day },
  rails: {
    R1: { fired: true, firedOnDay: 1 },
    R2: { fired: false, firedOnDay: null },
    R3: { fired: false, firedOnDay: null },
    R4: { fired: false, firedOnDay: null },
    R5: { fired: false, firedOnDay: null },
    R6: { fired: false, firedOnDay: null },
  },
});

const DAY8_SAVE = seasonSave(8, WEEK_DIARY);
const DAY29_SAVE = seasonSave(29, [...WEEK_DIARY,
  entry('c1-e1-ladder', 1, 9, 16, 'Eddie named the first rung out loud.', 'EVENT'),
]);
const DAY30_SAVE = seasonSave(30, [...WEEK_DIARY,
  entry('c1-e1-ladder', 1, 9, 16, 'Eddie named the first rung out loud.', 'EVENT'),
  entry('c1-p-june', 1, 10, 7, 'June. Professional friendship. With a spark.', 'PERSON'),
  entry('c1-e6-petition', 1, 10, 7, 'The lost-cat slip is gone. A petition took its spot.', 'EVENT'),
]);
const DAY51_SAVE = seasonSave(51, [...WEEK_DIARY,
  entry('c1-f1-dryer-bank-1', 1, 10, 8, 'Motel hallway hum.', 'RECALL', 'RECALL'),
  entry('c1-f1-dryer-bank-2', 1, 10, 8, 'Carpet pattern.', 'RECALL', 'RECALL'),
  entry('c1-f1-dryer-bank-3', 1, 10, 8, 'A door that isn\u2019t his.', 'RECALL', 'RECALL'),
]);
const DAY95_SAVE = seasonSave(95, [...WEEK_DIARY,
  entry('c1-f1-dryer-bank-1', 1, 10, 8, 'Motel hallway hum.', 'RECALL', 'RECALL'),
  entry('c1-t-blackout-table', 1, 10, 30, 'The blackout table, candle hour.', 'TALK'),
]);
const DAY106_SAVE = seasonSave(106, [...WEEK_DIARY,
  entry('c1-t-cigar-box', 1, 12, 12, 'The cigar box is the real ledger.', 'TALK'),
  entry('c1-p-craig', 1, 12, 12, 'Craig. Broke loudly, charmingly, on purpose.', 'PERSON'),
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

/** The walker, waypointed — long legs step through mid-street points so
 *  the yaw-relative keys never grind against a barrier's corner. */
async function walkTo(page, x, z, timeoutS = 30, via = []) {
  const pts = [...via, [x, z]];
  let last = { frames: 0, dist: NaN };
  for (const [px, pz] of pts) {
    last = await page.evaluate(async ({ x, z, timeoutS }) => {
      const g = window.__game;
      const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
      const release = () => {
        g.input.injectKey('KeyW', false); g.input.injectKey('KeyS', false);
        g.input.injectKey('KeyD', false); g.input.injectKey('KeyA', false);
      };
      const steer = (fAmt, rAmt) => {
        const p = g.player.capsule;
        const dx = x - p.x, dz = z - p.z;
        const yaw = g.player.camYaw;
        const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
        const rightX = -Math.cos(yaw), rightZ = Math.sin(yaw);
        g.input.injectKey('KeyW', fAmt > 0.1 || (fAmt > -10 && ((dx * fwdX + dz * fwdZ) > 0.2)));
        g.input.injectKey('KeyS', (dx * fwdX + dz * fwdZ) < -0.2);
        g.input.injectKey('KeyD', rAmt > 0.1 || ((dx * rightX + dz * rightZ) > 0.2));
        g.input.injectKey('KeyA', (dx * rightX + dz * rightZ) < -0.2);
      };
      const t0 = performance.now();
      let frames = 0;
      let lastX = 1e9, lastZ = 1e9, stillFrames = 0, side = 1;
      while (performance.now() - t0 < timeoutS * 1000) {
        const p = g.player.capsule;
        if (Math.hypot(x - p.x, z - p.z) < 0.4) break;
        // stall-recovery: the street's small colliders (signs, bollards)
        // grind a head-on walk — a still second means sidestep and resume
        if (Math.hypot(p.x - lastX, p.z - lastZ) < 0.06) {
          stillFrames++;
          if (stillFrames > 40) {
            release();
            const rj = g.player.camYaw;
            const sx = -Math.cos(rj) * side, sz = Math.sin(rj) * side;
            const sxT = p.x + sx * 1.6, szT = p.z + sz * 1.6;
            const sDeadline = performance.now() + 1400;
            while (performance.now() < sDeadline) {
              const q = g.player.capsule;
              const ddx = sxT - q.x, ddz = szT - q.z;
              if (Math.hypot(ddx, ddz) < 0.3) break;
              const yaw = g.player.camYaw;
              const len = Math.hypot(ddx, ddz) || 1;
              const f = ((ddx / len) * Math.sin(yaw)) + ((ddz / len) * Math.cos(yaw));
              const r = ((ddx / len) * -Math.cos(yaw)) + ((ddz / len) * Math.sin(yaw));
              g.input.injectKey('KeyW', f > 0.2); g.input.injectKey('KeyS', f < -0.2);
              g.input.injectKey('KeyD', r > 0.2); g.input.injectKey('KeyA', r < -0.2);
              await nextFrame();
            }
            release();
            side = -side;
            stillFrames = 0;
            lastX = 1e9; lastZ = 1e9;
            continue;
          }
        } else {
          stillFrames = 0;
          lastX = p.x; lastZ = p.z;
        }
        const dx = x - p.x, dz = z - p.z;
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
      release();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const p = window.__game.player.capsule;
      return { frames, dist: Math.hypot(x - p.x, z - p.z), at: `${p.x.toFixed(1)},${p.z.toFixed(1)}` };
    }, { x: px, z: pz, timeoutS });
  }
  return last;
}

/** The morning, driven like a player: the wake press (after the fade —
 *  presses during the fade are eaten), then the rush, to WK_ROAM. */
async function runMorning(page, maxOrders = 6) {
  return page.evaluate(async ({ maxOrders }) => {
    const g = window.__game;
    const s = g.state;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const waitFrames = async (n) => { for (let i = 0; i < n; i++) await nextFrame(); };
    // the fade lifts first
    const t0 = performance.now();
    while ((g.player.frozen || g.dayFading) && performance.now() - t0 < 20000) await nextFrame();
    // walk to the cart (the loop's counter is the cart corner)
    const walkToCart = async (timeoutMs = 30000) => {
      const t = performance.now();
      while (performance.now() - t < timeoutMs) {
        const p = g.player.capsule;
        const dx = 3 - p.x, dz = -5.4 - p.z;
        if (Math.hypot(dx, dz) < 0.5) return true;
        const yaw = g.player.camYaw;
        const len = Math.hypot(dx, dz) || 1;
        const f = ((dx / len) * Math.sin(yaw)) + ((dz / len) * Math.cos(yaw));
        const r = ((dx / len) * -Math.cos(yaw)) + ((dz / len) * Math.sin(yaw));
        g.input.injectKey('KeyW', f > 0.2); g.input.injectKey('KeyS', f < -0.2);
        g.input.injectKey('KeyD', r > 0.2); g.input.injectKey('KeyA', r < -0.2);
        await nextFrame();
      }
      g.input.injectKey('KeyW', false); g.input.injectKey('KeyS', false);
      g.input.injectKey('KeyD', false); g.input.injectKey('KeyA', false);
      return false;
    };
    await walkToCart();
    // Rosa's wake: she stands at the cart's side (6.35, -4.3) — the press
    // needs HER in range, so the loop walks to her live spot and presses
    // until the rush opens (the fade may eat a press)
    const wakeDeadline = performance.now() + 30000;
    while (s.step === 33 && performance.now() < wakeDeadline) {
      const rp = g.world.rosa.position;
      const p = g.player.capsule;
      const dx = rp.x - 0.8 - p.x, dz = rp.z + 0.9 - p.z;
      if (Math.hypot(dx, dz) > 0.5) {
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
      if (!g.input.sample().interact) g.input.injectInteract();
      await waitFrames(10);
    }
    if (s.step !== 34) return { wake: false, serves: 0, step: s.step, earned: 0 };
    // the rush: serve the queue
    const moneyBefore = s.money;
    let serves = 0;
    const deadline = performance.now() + 180000;
    while (serves < maxOrders && performance.now() < deadline) {
      if (s.step !== 34) break;
      const p = g.player.capsule;
      const dx = 3 - p.x, dz = -5.4 - p.z;
      if (Math.hypot(dx, dz) > 0.6) {
        await walkToCart(6000);
        continue;
      }
      if (!g.input.sample().interact) g.input.injectInteract();
      await nextFrame();
      const t = performance.now();
      while (s.brewing && performance.now() - t < 20000) await nextFrame();
      if (!s.brewing) { serves++; await new Promise((r) => setTimeout(r, 250)); }
    }
    return { wake: true, serves, step: s.step, earned: s.money - moneyBefore };
  }, { maxOrders });
}

/** The wiring witness: the live registry's own perform (the real defs,
 *  the real state, in the browser build). The interior beats' SPOTS sit
 *  behind facades the walker can't cross from the sidewalk — the day-8
 *  world's own answer is that some counters are inside. The def's
 *  perform IS the game's own press path (the same function the prompt's
 *  Space press calls); this drives it directly and reads the ink. */
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

/** Walk AT the interaction's own spot (physics stops the capsule where the
 *  world stops it — the radius is around the spot, not the sidewalk) and
 *  press until the latch id lands. */
async function interactUntil(page, latchId, spot, tries = 14) {
  return page.evaluate(async ({ latchId, spot, tries }) => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const release = () => {
      g.input.injectKey('KeyW', false); g.input.injectKey('KeyS', false);
      g.input.injectKey('KeyD', false); g.input.injectKey('KeyA', false);
    };
    for (let i = 0; i < tries; i++) {
      // approach the spot (0.5 short of it — the capsule stops where the
      // world stops it; the radius reads from where you STAND)
      const deadline = performance.now() + 2600;
      while (performance.now() < deadline) {
        const p = g.player.capsule;
        const dx = spot[0] - p.x, dz = spot[1] - p.z;
        if (Math.hypot(dx, dz) < 0.55) break;
        const yaw = g.player.camYaw;
        const len = Math.hypot(dx, dz) || 1;
        const f = ((dx / len) * Math.sin(yaw)) + ((dz / len) * Math.cos(yaw));
        const r = ((dx / len) * -Math.cos(yaw)) + ((dz / len) * Math.sin(yaw));
        g.input.injectKey('KeyW', f > 0.2); g.input.injectKey('KeyS', f < -0.2);
        g.input.injectKey('KeyD', r > 0.2); g.input.injectKey('KeyA', r < -0.2);
        await nextFrame();
      }
      release();
      g.input.injectInteract();
      for (let k = 0; k < 10; k++) await nextFrame();
      if (g.state.fieldDiary.some((e) => e.id === latchId)) {
        return { landed: true };
      }
    }
    release();
    return { landed: false };
  }, { latchId, spot, tries });
}

// ---------------------------------------------------------------- Pass A ----
console.log('--- Pass A: Day 8, the real shift (the C0 cut\u2019s Monday arrives) ---');
{
  const { page, errors } = await bootSeason(DAY8_SAVE);
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
  check(a.day === 8 && a.calendarDay === 8, `the season\u2019s first morning boots at day 8 (got ${a.day}/${a.calendarDay})`);
  check(a.chapter === 'C1', `the chapter rode the save (got ${a.chapter})`);
  check(a.dateline.includes('September 16'), `the dateline says September 16 (got "${a.dateline}")`);
  check(a.step === 33, `the station boots into the WK wake (step=${a.step})`);

  // the real shift's rush: the wake first, then FOUR orders, the honest $14
  const rush = await runMorning(page);
  check(rush.wake, 'Rosa\u2019s wake opens the rush (the fade-aware press)');
  check(rush.serves === 4, `the real shift serves FOUR orders (${rush.serves})`);
  check(rush.step === 35, `the shift done opens the roam (step=${rush.step} = WK_ROAM)`);
  check(rush.earned === 14, `the shift pays the queue\u2019s honest $14 (got $${rush.earned})`);

  // Eddie names the rung (doc 06 §C1 event 1, verbatim) — the wiring
  // witness: the live registry's eddie def, the game's own press path
  const ladder = await viaRegistry(page, 'eddie', 'c1-e1-ladder');
  const ladderEntry = await page.evaluate(() => {
    const s = window.__game.state;
    const e = s.fieldDiary.find((x) => x.id === 'c1-e1-ladder');
    return { body: e?.body ?? '', kind: e?.kind ?? '' };
  });
  check(ladder.landed, 'the ladder beat lands through the live registry\u2019s eddie def');
  check(ladderEntry.body.includes('Counter now. Maybe the register by spring. Don\u2019t ask me for the keys.'),
    'the rung is verbatim (doc 06 §C1 event 1; the keys motif begins)');

  // the framed notice (doc 06 §C1 starting circumstances) — the wiring
  // witness through the lease_notice def
  const noticeOk = await viaRegistry(page, 'lease_notice', 'c1-h1-notice-evidence');
  const noticeEntry = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c1-h1-notice-evidence');
    return { kind: e?.kind ?? '', body: e?.body ?? '' };
  });
  check(noticeOk.landed, 'the framed notice reads through the lease_notice def');
  check(noticeEntry.kind === 'EVIDENCE', 'the notice\u2019s evidence is in the book (the renewal notice photographed)');

  // the linger's compression: the montage shows, the roll jumps WHOLE
  const comp = await page.evaluate(() => {
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
    };
  });
  check(comp.pending === 29, `the compression arms the two-press linger (pending=${comp.pending})`);
  check(comp.rollTo === 29, `the roll jumps the counters WHOLE to day 29 (got ${comp.rollTo})`);
  check(comp.dayAfter === 8, `the day did not move until the roll (still ${comp.dayAfter})`);
  check(comp.intro.some((t) => t.includes('The corner kept its hours.')), 'the compression\u2019s city line speaks');
  check(errors.length === 0, `pass A console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();
}

// ---------------------------------------------------------------- Pass B ----
console.log('--- Pass B: Day 29, the quiet weeks (October 7) ---');
{
  const { page, errors } = await bootSeason(DAY29_SAVE);
  const b = await page.evaluate(() => {
    const g = window.__game;
    const s = g.state;
    return {
      day: s.day, dateline: document.getElementById('hud-dateline')?.textContent ?? '',
      chapter: s.chapter.chapter,
    };
  });
  check(b.day === 29 && b.dateline.includes('October 7'), `the compression landed: the dateline says October 7 (got "${b.dateline}")`);
  check(b.chapter === 'C1', `the season\u2019s chapter is C1 (got ${b.chapter})`);

  const morning = await runMorning(page);
  check(morning.wake && morning.step === 35, `the quiet weeks\u2019 morning runs to the roam (step=${morning.step})`);

  // June and the DOB wall (doc 06 §C1 event 2)
  const jr = await walkTo(page, -21.6, 6.4, 30, [[-8, 7]]);
  const june = await interactUntil(page, 'c1-p-june', [-21.6, 6.4]);
  const juneEntry = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c1-p-june');
    return { kind: e?.kind ?? '', body: e?.body ?? '' };
  });
  check(june.landed, `June\u2019s beat lands at the plaza (walk dist=${jr.dist.toFixed(2)})`);
  check(juneEntry.kind === 'PERSON', 'June\u2019s card is in the book');

  // the petition at the board (event 6): the wiring witness through the
  // board def (the board's perform IS the press path)
  const petition = await viaRegistry(page, 'board', 'c1-e6-petition');
  check(petition.landed, 'the petition reads through the live registry\u2019s board def');
  // Kev's lanyard at Eddie's counter (F6): the wiring witness
  const kev = await viaRegistry(page, 'eddie', 'c1-f6-lanyard');
  const f6 = await page.evaluate(() => {
    const e = window.__game.state.fieldDiary.find((x) => x.id === 'c1-f6-lanyard');
    return { kind: e?.kind ?? '', tag: e?.epistemic ?? '', body: e?.body ?? '' };
  });
  check(kev.landed, 'Kev\u2019s lanyard lands through the eddie def (F6\u2019s trigger)');
  check(f6.kind === 'RECALL' && f6.tag === 'RECALL', 'F6 is RECALL kind AND tag (the wobble style)');
  check(f6.body.toLowerCase().includes('lanyard'), 'F6 is the register\u2019s row (the lanyard)');
  check(errors.length === 0, `pass B console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();
}

// ---------------------------------------------------------------- Pass C ----
console.log('--- Pass C: the dryer bank + the storm (October 8 \u2192 October 29) ---');
{
  const { page, errors } = await bootSeason(DAY30_SAVE);
  const c30 = await page.evaluate(() => ({
    day: window.__game.state.day,
    dateline: document.getElementById('hud-dateline')?.textContent ?? '',
  }));
  check(c30.dateline.includes('October 8'), `the day-30 boot lands on October 8 (got "${c30.dateline}")`);

  const morning = await runMorning(page);
  check(morning.wake && morning.step === 35, `the garden day\u2019s morning runs to the roam (step=${morning.step})`);

  // Yoli's freezer drive at the board: the wiring witness
  const yoli = await viaRegistry(page, 'board', 'c1-p-yoli');
  check(yoli.landed, 'Yoli\u2019s freezer drive lands through the board def');

  // F1 at the dryer bank: the laundromat seam, END OF DAY (the roam's law)
  const lr = await walkTo(page, -7.0, 7.3, 30, [[-14, 7.5]]);
  const f1 = await page.evaluate(async () => {
    const g = window.__game;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const t0 = performance.now();
    while (performance.now() - t0 < 15000) {
      await nextFrame();
      if (g.state.fieldDiary.some((e) => e.id === 'c1-f1-dryer-bank-3')) break;
    }
    const s = g.state;
    return {
      three: [1, 2, 3].map((i) => s.fieldDiary.find((e) => e.id === `c1-f1-dryer-bank-${i}`))
        .map((e) => ({ kind: e?.kind ?? '', tag: e?.epistemic ?? '', body: e?.body ?? '' })),
      step: s.step,
    };
  });
  check(lr.dist < 3, `walked to the dryer bank (dist=${lr.dist.toFixed(2)})`);
  check(f1.three.every((e) => e.kind === 'RECALL' && e.tag === 'RECALL'),
    'F1\u2019s three entries are RECALL kind AND tag (the wobble style, doc 06 §C1 event 4)');
  check(f1.three.filter((e) => e.body.length > 0).length === 3, 'the three entries are in the book');
  check(errors.length === 0, `pass C day-30 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();

  // day 51: the storm's first day
  const { page: p51, errors: e51 } = await bootSeason(DAY51_SAVE);
  const c51 = await p51.evaluate(() => {
    const g = window.__game;
    return {
      day: g.state.day,
      dateline: document.getElementById('hud-dateline')?.textContent ?? '',
    };
  });
  check(c51.dateline.includes('October 29'), `the storm\u2019s morning lands on October 29 (got "${c51.dateline}")`);
  const soup = await runMorning(p51);
  check(soup.wake, 'the storm day\u2019s wake opens the soup line');
  check(soup.serves === 3, `the storm\u2019s soup queue serves three (${soup.serves})`);
  check(soup.step === 35, `the soup done opens the roam (step=${soup.step})`);
  check(soup.earned === 8, `the soup pays the storm\u2019s honest $8 (got $${soup.earned})`);
  check(e51.length === 0, `pass C day-51 console clean (${e51.length} errors${e51.length ? ': ' + e51[0] : ''})`);
  await p51.close();
}

// ---------------------------------------------------------------- Pass D ----
console.log('--- Pass D: December + the cut (Dec 12 \u2192 Dec 23 \u2192 New Year) ---');
{
  const { page, errors } = await bootSeason(DAY95_SAVE);
  const d95 = await page.evaluate(() => ({
    dateline: document.getElementById('hud-dateline')?.textContent ?? '',
  }));
  check(d95.dateline.includes('December 12'), `the renegotiation lands on December 12 (got "${d95.dateline}")`);

  const craig = await viaRegistry(page, 'eddie', 'c1-p-craig');
  const craigEntry = await page.evaluate(() => {
    const s = window.__game.state;
    return {
      card: s.fieldDiary.find((e) => e.id === 'c1-p-craig')?.body ?? '',
      q: s.fieldDiary.find((e) => e.id === 'c1-q-craig-scared')?.body ?? '',
    };
  });
  check(craig.landed, 'Craig\u2019s visit lands through the eddie def (the antagonist as mirror)');
  check(craigEntry.card.includes('Craig'), 'Craig\u2019s card is in the book');
  check(craigEntry.q.includes('Who is Craig scared of?'), 'the QUESTION is verbatim (doc 06 §C1 diary developments)');

  const cigar = await viaRegistry(page, 'rosa', 'c1-t-cigar-box', 4);
  check(cigar.landed, 'the cigar box lands through the rosa def (the block\u2019s real economy)');
  const cigarBody = await page.evaluate(() =>
    window.__game.state.fieldDiary.find((e) => e.id === 'c1-t-cigar-box')?.body ?? '');
  check(cigarBody.includes('cigar box'), 'the cigar box\u2019s conversation is in the book');
  check(errors.length === 0, `pass D day-95 console clean (${errors.length} errors${errors.length ? ': ' + errors[0] : ''})`);
  await page.close();

  // day 106: the second notice, the flour line, N1a, the cut
  const { page: p106, errors: e106 } = await bootSeason(DAY106_SAVE);
  const d106 = await p106.evaluate(() => ({
    dateline: document.getElementById('hud-dateline')?.textContent ?? '',
  }));
  check(d106.dateline.includes('December 23'), `the season\u2019s last day lands on December 23 (got "${d106.dateline}")`);

  const notice2 = await viaRegistry(p106, 'lease_notice', 'c1-e8-notice-evidence');
  const flour = await p106.evaluate(() => {
    const s = window.__game.state;
    const e = s.fieldDiary.find((x) => x.id === 'c1-e8-notice-evidence');
    return { kind: e?.kind ?? '', body: e?.body ?? '' };
  });
  check(notice2.landed, 'the second notice reads through the lease_notice def');
  check(flour.body.includes('No walk-back, no charm') && flour.kind === 'EVIDENCE',
    'the second notice\u2019s evidence is in the book (the walk-back is gone)');

  // the flour line: Eddie says it at the wall's scene (the beat's own note)
  // — the entry is the latch; the spoken line is witnessed at the counter
  const pickGate = await p106.evaluate(() => window.__game.state.c1PromisePick().length);
  check(pickGate === 1, 'N1a\u2019s page opens after the flour line (the pick\u2019s own gate)');

  // N1a through the register's own machine (the pick's landing)
  const pick = await p106.evaluate(() => {
    const s = window.__game.state;
    const out = s.applyChoicePick('N1a', 'honest-odds');
    return {
      ok: out.length > 0,
      ledger: s.ledger.map((l) => ({ kind: l.kind, node: l.node, due: l.due ?? null, weight: l.weight })),
      diaryNode: s.fieldDiary.some((e) => e.node === 'N1a'),
    };
  });
  check(pick.ok, 'the promise pick lands');
  check(pick.ledger.some((l) => l.kind === 'promise' && l.node === 'N1a' && l.weight === 2 && l.due && l.due.y === 2 && l.due.m === 2 && l.due.d === 1),
    'the promise rides the ledger with its due (Feb 1, Y2 \u2014 the renewal\u2019s window) and its weight');
  check(pick.diaryNode, 'the pick\u2019s ink carries the node (the latch\u2019s other witness)');

  // the cut: the season's linger plays the montage + the advance
  const cut = await p106.evaluate(() => {
    const g = window.__game;
    const s = g.state;
    s.setStep(37); // WK_POSTCARD
    s.lingerStage = 2;
    const out = s.rail();
    return {
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text),
      persisted: out.some((e) => e.kind === 'persist'),
      latch: s.fieldDiary.some((e) => e.id === 'c1-cut-newyear'),
      cutDate: s.fieldDiary.find((e) => e.id === 'c1-cut-newyear')?.date ?? null,
      chapter: s.chapter.chapter,
      chapterDay: s.chapter.calendarDay,
    };
  });
  check(cut.latch && cut.persisted, 'the C1\u2192C2 cut\u2019s latch rides the diary and the save');
  check(cut.chapter === 'C2', `the chapter stands in C2 after the cut (got ${cut.chapter})`);
  check(cut.chapterDay === 120, `the advance landed at Jan 6, Y2 \u2014 the machine\u2019s own door (day ${cut.chapterDay})`);
  check(cut.cutDate && cut.cutDate.y === 2 && cut.cutDate.m === 1 && cut.cutDate.d === 1,
    'the cut\u2019s entry is dated New Year\u2019s Day, Y2');
  check(cut.notes.some((t) => t.includes('tapes the corner')), 'the notice is staged back into its frame (doc 06 §C1 handoff)');
  const overTag = await p106.evaluate(() =>
    window.__game.state.fieldDiary.find((e) => e.id === 'c1-cut-newyear')?.body ?? '');
  check(overTag.includes('this is the year I fix it'), 'the over-tag is verbatim (doc 06 §C1 handoff)');

  const wall = await p106.evaluate(() => {
    const s = window.__game.state;
    const out = s.rail();
    return {
      notes: out.filter((e) => e.kind === 'note').map((e) => e.text),
      rollTo: (out.find((e) => e.kind === 'next-day') ?? {}).to ?? null,
      chapter: s.chapter.chapter,
    };
  });
  check(wall.notes.length === 1 && wall.rollTo === null,
    'a replayed linger reads the wall \u2014 no roll out of C1\u2019s own cut (C2\u2019s content is the next wave)');
  check(wall.chapter === 'C2', 'the chapter stays C2 (the wall holds)');
  check(e106.length === 0, `pass D day-106 console clean (${e106.length} errors${e106.length ? ': ' + e106[0] : ''})`);
  await p106.close();
}

await browser.close();
server.close();
if (failures > 0) {
  console.log(`PROBE-C1-WARM-LINE: ${failures} FAILURES`);
  process.exit(1);
}
console.log('PROBE-C1-WARM-LINE: ALL CHECKS PASSED');
process.exit(0);
