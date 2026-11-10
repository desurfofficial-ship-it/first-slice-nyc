#!/usr/bin/env node
/**
 * probe-first-session.mjs — the beginner's first five minutes (assignment §3),
 * observed as a player experiences it: fresh browser, NO save, NO driver
 * authorization, NO developer knowledge. The probe answers, with evidence:
 *
 *   1. does the game open into something understandable (the arrival film)?
 *   2. is there an obvious way forward (the tap/SKIP affordances)?
 *   3. does the handover land the player in a legible scene (HUD, objective,
 *      interaction prompt)?
 *   4. can a beginner interact with the world within seconds of gaining
 *      control (the first affordance fires)?
 *
 * Screenshots land in shots/first-session/ as the evidence trail.
 * PASS = every check green, zero page errors.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = Number(process.env.FS_PORT ?? 4174);
const SHOTS = new URL('../shots/first-session', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('FIRST-SESSION PROBE FAIL — no dist/ build. Run `npm run build` first.');
  process.exit(1);
}

const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(DIST, p === '/' ? 'index.html' : p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

const errors = [];
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { failed++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// ---- the blank arrival: no save, no params — what a stranger sees ----
// NOTE: automated browsers boot as "drivers" (navigator.webdriver — the
// fleet's own protection), so the film needs its documented ?film=1 hatch
// (Game.ts: the film's evidence probes ask for it explicitly). A human
// stranger gets the film on the ROOT url with no params at all.
await page.goto(`http://localhost:${PORT}/?fx=off&film=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 45000 });

// the film begins when the boot settles — poll like a patient stranger
let filmSeen = false;
for (let i = 0; i < 40; i++) {
  if (await page.evaluate(() => !!window.__game?.arrival?.active)) { filmSeen = true; break; }
  await page.waitForTimeout(500);
}
check('1: a fresh stranger lands in the arrival film (the opening communicates)', filmSeen);
await page.screenshot({ path: join(SHOTS, '1-arrival-film.png') });

if (filmSeen) {
  // the film's own affordance: the SKIP chip must be reachable by a beginner
  const hasSkip = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, [role="button"], .chip, .skip')]
      .find((b) => /skip/i.test(b.textContent ?? ''));
    return el ? (el.textContent ?? '').trim().slice(0, 30) : null;
  });
  check('2: the film offers a visible SKIP affordance', hasSkip !== null, hasSkip ?? 'none found');

  // taps advance the film (the E/Space contract the film itself teaches;
  // the phase gates consume early taps — keep tapping like a real player)
  for (let i = 0; i < 40 && await page.evaluate(() => !!window.__game?.arrival?.active); i++) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(800);
  }
  const stillFilm = await page.evaluate(() => !!window.__game?.arrival?.active);
  if (stillFilm) {
    // the impatient stranger takes the SKIP chip
    await page.evaluate(() => window.__game?.arrival?.skip());
    await page.waitForTimeout(1200);
  }
}
check('3: the film ends by playing (or skipping) into the handover', !(await page.evaluate(() => !!window.__game?.arrival?.active)));
await page.waitForTimeout(2500); // the handover composes
await page.screenshot({ path: join(SHOTS, '2-handover.png') });

// the handover must land somewhere legible: HUD + a date + an objective line
const hud = await page.evaluate(() => {
  const hud = document.querySelector('#hud');
  const text = hud ? (hud.textContent ?? '') : '';
  return { present: !!hud && !hud.hidden, text: text.replace(/\s+/g, ' ').slice(0, 220) };
});
check('4: the HUD is present and carrying text', hud.present && hud.text.length > 10, hud.text.slice(0, 110));

// the objective: the game should tell the player what to do (the objective
// line / prompt region carries non-empty guidance)
const objective = await page.evaluate(() => {
  const sels = ['#objective', '.objective', '#prompt', '.prompt', '#hint', '.hint'];
  for (const s of sels) {
    const el = document.querySelector(s);
    if (el && (el.textContent ?? '').trim().length > 0) return { sel: s, text: (el.textContent ?? '').trim().slice(0, 120) };
  }
  return null;
});
check('5: an objective/prompt line is visible to the beginner', objective !== null, objective ? `${objective.sel}: "${objective.text}"` : 'no objective/prompt text found');

// the first interaction: a beginner walks until the world offers something
// (the interaction registry's own prompt line), then presses the key the
// prompt itself teaches (Space). The day-1 first beat's affordance is
// "Say hi" — its response is the greeting name box. Other affordances
// (a bench's "Sit a while") respond without a box, so the probe prefers
// the Say-hi prompt and falls back to "any overlay answered".
const promptText = () => page.evaluate(() => (document.querySelector('#prompt')?.textContent ?? '').trim());
const promptVisible = () => page.evaluate(() => {
  const p = document.querySelector('#prompt');
  return !!p && !p.hidden && (p.textContent ?? '').trim().length > 0;
});
let foundSayHi = false;
let prompted = await promptVisible();
const dirs = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];
for (let d = 0; d < dirs.length && !foundSayHi; d++) {
  await page.keyboard.down(dirs[d]);
  for (let i = 0; i < 12 && !foundSayHi; i++) {
    await page.waitForTimeout(500);
    prompted = await promptVisible();
    if (prompted && /say hi/i.test(await promptText())) foundSayHi = true;
  }
  await page.keyboard.up(dirs[d]);
}
check('6: walking offers an interaction (the prompt line appears)', prompted || foundSayHi,
  (foundSayHi ? 'Say hi' : await promptText()).slice(0, 60));
if (prompted || foundSayHi) {
  // press the key the prompt itself names (Space), then the E twin. The
  // response surface depends on the affordance: a story beat opens the
  // greeting box or a counter card; the block's walker chats answer with
  // the note toast (interactionDefs: "purely optional small talk" — a note,
  // not a box). Any of those IS the world answering.
  await page.keyboard.press('Space');
  await page.waitForTimeout(900);
  let responded = await page.evaluate(() => {
    const g = window.__game;
    const vis = (el) => !!el && !el.hidden;
    return {
      nameBox: g?.ui ? vis(g.ui.nameBox) : false,
      orderCard: g?.ui ? vis(g.ui.orderCard) : false,
      starterCard: g?.ui ? vis(g.ui.starterCard) : false,
      pendingCard: !!g?.state?.pendingCard,
      note: g?.ui ? vis(g.ui.note) : false,
    };
  });
  if (!Object.values(responded).some(Boolean)) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(900);
    responded = await page.evaluate(() => {
      const g = window.__game;
      const vis = (el) => !!el && !el.hidden;
      return {
        nameBox: g?.ui ? vis(g.ui.nameBox) : false,
        orderCard: g?.ui ? vis(g.ui.orderCard) : false,
        starterCard: g?.ui ? vis(g.ui.starterCard) : false,
        pendingCard: !!g?.state?.pendingCard,
        note: g?.ui ? vis(g.ui.note) : false,
      };
    });
  }
  const anyResponse = Object.values(responded).some(Boolean);
  check('7: the world answers the beginner\'s interaction (box, card, or note)', anyResponse, JSON.stringify(responded));
}
await page.screenshot({ path: join(SHOTS, '3-first-interaction.png') });

const errs = errors.splice(0);
check('8: the whole first session is console-clean', errs.length === 0,
  errs.length ? errs[0].slice(0, 140) : '');

await browser.close();
server.close();

console.log(`\nFIRST-SESSION PROBE: ${passed}/${passed + failed} checks passed`);
if (failed === 0) console.log('FIRST-SESSION PROBE OK — the opening communicates, the world answers');
else { console.log('FIRST-SESSION PROBE FAIL — see the FAIL lines above'); process.exit(1); }
