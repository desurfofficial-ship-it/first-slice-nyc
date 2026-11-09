/**
 * Probe: the C0 content pack — the first session's narrative layer
 * (narrative/14 §7 step 6, doc 11) — machine + screen evidence.
 *
 * Everything is CONDITION-DRIVEN (poll the live UI/state), never
 * wall-clock-driven (the software-GL law the whole fleet keeps).
 *
 * Part 1 — THE COLD OPEN (?c0=1 on a driver boot: the sheet's own hatch):
 *   the notebook is the game's first screen · the three authored prompts ·
 *   the write lands in the field diary through the one door.
 * Part 2 — THE MACHINE (the state's own API, in the live game):
 *   the listing · the trial shift (two presses → the covenant → entry 2's
 *   sheet) · Deshaun's scene (five lines → the kit) · the mishear at the
 *   night cap · the wobble's Day-7 gate · Odessa's night law.
 * Part 3 — THE WORLD (the block itself):
 *   Deshaun at the platform in his window · the surveyor at dawn.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const TAG = process.argv[2] ?? 'after';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots', `c0-${TAG}`);
mkdirSync(OUT, { recursive: true });
const PORT = 4633;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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
const errors = [];
const results = [];
const check = (ok, what) => {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${what}`);
  if (!ok) errors.push(what);
};

// ---------- Part 1: the cold open (?c0=1) ----------
{
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(`http://localhost:${PORT}/?c0=1`, { waitUntil: 'domcontentloaded' });
  // condition-driven: wait for the sheet, however long the boot takes
  await page.waitForFunction(() => window.__game && window.__game.ui.writeSheetOpen === true, null, { timeout: 60000 });
  const facts = await page.evaluate(() => document.getElementById('write-facts')?.textContent ?? '');
  const prompt = await page.evaluate(() => document.getElementById('write-prompt')?.textContent ?? '');
  const options = await page.evaluate(() => [...document.querySelectorAll('.write-option')].map((b) => b.textContent?.trim() ?? ''));
  check(facts.includes('Day 1. Facts only.'), `the cold open's ruled line: "${facts}"`);
  check(options.length === 2, `two authored prompts + the free line (got ${options.length})`);
  check(options.some((o) => o.includes('New York, day one.')), 'prompt 1 verbatim (doc 11 §2 beat 0)');
  check(options.some((o) => o.includes('smart one')), 'prompt 2 verbatim');
  await page.screenshot({ path: join(OUT, 'c0-cold-open.png') });

  // touch law: the sheet is paper — the stick stands down
  const hiddenWhenPanel = await page.evaluate(() => document.getElementById('touch-ui')?.classList.contains('hidden-when-panel') ?? false);
  check(hiddenWhenPanel, 'the write sheet is a paper surface (touch law holds)');

  // write the first line (pick prompt 1)
  await page.evaluate(() => { window.__game.ui.onWritePick?.(0, ''); });
  await page.waitForFunction(() => window.__game && window.__game.ui.writeSheetOpen === false, null, { timeout: 30000 });
  const diary = await page.evaluate(() => window.__game.state.fieldDiary.map((e) => ({ id: e.id, body: e.body, tag: e.epistemic })));
  check(diary.some((e) => e.id === 'c0-e1-opening-line' && e.body === 'New York, day one.' && e.tag === 'FACT'),
    'entry 1 through the one door: "New York, day one." tagged FACT');
  const listing = await page.evaluate(() => document.getElementById('note')?.textContent ?? '');
  check(listing.includes('CORNER SLICE'), `beat 2 — the listing rode the write's close ("${listing.slice(0, 46)}…")`);
  await page.screenshot({ path: join(OUT, 'c0-after-write-listing.png') });
  // fire-once: a second cold-open pick cannot re-write
  const twice = await page.evaluate(() => { window.__game.state.c0WriteColdOpen(1, ''); return window.__game.state.fieldDiary.filter((e) => e.id === 'c0-e1-opening-line').length; });
  check(twice === 1, 'fire-once: the cold open cannot be written twice');
  await page.close();
}

// ---------- Part 2+3: the machine + the world (plain driver boot) ----------
{
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await page.waitForTimeout(1200);

  // drivers auto-write the cold open silently (the fleet's coherence law)
  const booted = await page.evaluate(() => ({
    done: window.__game.state.firstSession.coldOpenDone,
    diary: window.__game.state.fieldDiary.map((e) => e.id),
  }));
  check(booted.done && booted.diary.includes('c0-e1-opening-line'), 'driver boots write the cold open silently (no sheet owns the screen)');
  check(!(await page.evaluate(() => window.__game.ui.writeSheetOpen)), 'no sheet blocks a driver boot');

  // beat 2 — the listing, re-read at the terminal
  const listing = await page.evaluate(() => window.__game.state.c0Listing().map((e) => e.text ?? '').join(' | '));
  check(listing.includes('CORNER SLICE — counter help, will train'), 'the listing verbatim (doc 11 §2 beat 2)');

  // beat 6 — the trial shift: two presses, the covenant, entry 2's sheet
  const shift1 = await page.evaluate(() => window.__game.state.c0TrialShift().map((e) => e.text ?? e.kind));
  check(shift1.some((t) => String(t).includes('dough roller')), 'the trial shift press 1 — the work (dough, radio)');
  const shift2 = await page.evaluate(() => window.__game.state.c0TrialShift().map((e) => e.text ?? e.kind));
  check(shift2.some((t) => String(t).includes('Eat standing up')), 'the covenant verbatim: "Eat standing up. That\u2019s the job."');
  check(shift2.includes('c0-write-sheet'), 'entry 2\u2019s sheet rides the shift\u2019s end');
  // the sheet spec through the real UI door (private is compile-time only)
  await page.evaluate(() => {
    const g = window.__game;
    g.openC0Sheet('entry2');
  });
  const sheetPrompt = await page.evaluate(() => document.getElementById('write-prompt')?.textContent ?? '');
  const sheetOptions = await page.evaluate(() => [...document.querySelectorAll('.write-option')].map((b) => b.textContent?.trim() ?? ''));
  check(sheetPrompt.includes('first slice'), `entry 2\u2019s sheet opens with doc 11\u2019s prompt ("${sheetPrompt.slice(0, 40)}…")`);
  check(sheetOptions.length === 3, 'three Leo-voice options (doc 11 §3: the chosen one becomes the theory)');
  await page.screenshot({ path: join(OUT, 'c0-entry2-sheet.png') });
  await page.evaluate(() => { window.__game.ui.onWritePick?.(1, ''); });
  const theory = await page.evaluate(() => window.__game.state.fieldDiary.find((e) => e.id === 'c0-e2-first-slice'));
  check(theory && theory.epistemic === 'GUESS' && theory.body.includes('trust and a deck oven'),
    'entry 2 — the running theory, honestly tagged GUESS');

  // beat 7 — Deshaun's scene, five lines to the kit
  const scene = [];
  for (let i = 0; i < 5; i++) {
    scene.push(...await page.evaluate(() => window.__game.state.c0Deshaun().map((e) => e.text ?? '')));
  }
  check(scene.some((t) => t.includes('You\u2019re not dying. You\u2019re new.')), 'Deshaun verbatim: "You\u2019re not dying. You\u2019re new."');
  check(await page.evaluate(() => window.__game.state.firstSession.groundingLearned), 'the grounding kit learned (doc 02 §5.5\u2019s use-later key)');

  // beat 8 — the mishear at the night cap
  await page.evaluate(() => window.__game.state.setStep(9)); // Step.POSTCARD
  const mishear = await page.evaluate(() => window.__game.state.fieldDiary.find((e) => e.id === 'c0-e3-the-cart'));
  check(mishear && mishear.epistemic === 'FACT' && mishear.body === 'Rosa gave me the cart.',
    'the mishear lands FACT-tagged, body verbatim (doc 11 §2 beat 8)');

  // entry 5's gate — Day 7 law
  const wobbleGate = await page.evaluate(() => {
    const s = window.__game.state;
    const early = s.c0TryWobble(true).length; // Day 1 state: silence
    return early;
  });
  check(wobbleGate === 0, 'the wobble holds its Day-7 gate (no early fire)');

  // §4 hook 3 — Odessa's night law (wrong weekday = silence, right night = one line)
  const odessa = await page.evaluate(() => {
    const s = window.__game.state;
    const tuesday = s.c0TryOdessa(2, true, true).length;
    return { tuesday };
  });
  check(odessa.tuesday === 0, 'Odessa\u2019s law: Tuesday is not her night (nothing comments)');

  // §4 hook 2 — the surveyor exists at dawn, in the world (the sweep's
  // own gate flips him visible: the same expression the interaction reads)
  const surveyor = await page.evaluate(() => {
    const g = window.__game;
    g.worldSim.brain.world.clock.minuteOfDay = 6 * 60; // 6:00 a.m. — dawn
    g.c0AmbientSweep();
    return { visible: g.world.surveyor.visible, x: g.world.surveyor.position.x, z: g.world.surveyor.position.z, named: g.world.surveyor.name };
  });
  check(surveyor.named === 'Surveyor' && surveyor.visible && Math.abs(surveyor.x + 50.5) < 0.01,
    `the surveyor dawn-gates himself at the Works fence (${surveyor.x}, ${surveyor.z})`);
  // park the lens on the fence for the record
  await page.evaluate(() => {
    const g = window.__game;
    g.cam.update = () => {};
    g.cam.camera.position.set(-47.5, 1.6, 24.5);
    g.cam.camera.lookAt(-50.5, 0.9, 22.0);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT, 'c0-surveyor-fence.png') });
  const surveyorNoon = await page.evaluate(() => {
    const g = window.__game;
    g.worldSim.brain.world.clock.minuteOfDay = 12 * 60; // noon — not his hour
    g.c0AmbientSweep();
    return g.world.surveyor.visible;
  });
  check(surveyorNoon === false, 'the surveyor is gone by noon (dawn only, doc 11 §4)');

  // Deshaun at the platform in his window (the sweep's own gate). The
  // scene above already learned the kit — the gate's other input is
  // reset here so the probe tests the WINDOW, not the kit.
  const deshaun = await page.evaluate(() => {
    const g = window.__game;
    const s = g.state;
    s.firstSession = { ...s.firstSession, groundingLearned: false };
    s.day = 2; s.setStep(11); // D2_IDRIS — the midday window opens
    g.c0AmbientSweep();
    return { visible: g.world.deshaun.visible, named: g.world.deshaun.name, x: g.world.deshaun.position.x, y: g.world.deshaun.position.y, z: g.world.deshaun.position.z };
  });
  check(deshaun.named === 'Deshaun' && deshaun.visible && Math.abs(deshaun.y + 3.2) < 0.01,
    `Deshaun gates himself onto the platform in his window (y ${deshaun.y})`);
  // park the lens on him for the record (from open platform, not the wall)
  await page.evaluate(() => {
    const g = window.__game;
    g.cam.update = () => {};
    g.cam.camera.position.set(-36.5, -1.6, 13.8);
    g.cam.camera.lookAt(-42.5, -2.6, 10.5);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT, 'c0-deshaun-platform.png') });
  const deshaunGone = await page.evaluate(() => {
    const g = window.__game;
    g.state.setStep(15); // D2_CLIMB2 — the midday window closed
    g.c0AmbientSweep();
    return g.world.deshaun.visible;
  });
  check(deshaunGone === false, 'Deshaun leaves when his window closes (the beat was his only)');
  await page.close();
}

await browser.close();
server.close();
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL'));
console.log(`\n=== C0 PROBE: ${results.length - fails.length}/${results.length} checks passed ===`);
if (errors.length > 0) {
  console.log('PAGE/CONSOLE ERRORS:');
  for (const e of errors) console.log(`  ${e}`);
}
process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
