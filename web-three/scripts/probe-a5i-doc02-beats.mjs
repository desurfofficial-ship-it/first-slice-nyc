/** A5i — the Doc 02 §20:00–26:00 + §10:00–15:00 beats, evidenced in-engine:
 *   1. the fun-fact sticker reads at the mango pickup (§2:00–5:00)
 *   2. Rosa's handover line lands as the name box opens ("What're you calling it?")
 *   3. Rosa WALKS to the corner when you cross, and stands at the audited
 *      shoulder spot (6.35, -4.3) when the solo rush ends
 *   4. the register count reads ($87 → $112, twenty-five, eleven, lock up)
 *   5. the street performer: after the square syncs, the B stair mouth arms
 *      the 4-second listen (world slowed, song on, once per session)
 *
 *  Timing: the sandbox's software GL runs the loop at a fraction of real
 *  speed — every wait POLLS state instead of assuming wall-clock (the
 *  machine-honest probe law, docs/51).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
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
const page = await browser.newPage({ viewport: { width: 720, height: 520 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game?.playerVisual, null, { timeout: 30000 });
// in-evaluate screenshot hook — page.screenshot from playwright's side,
// callable at the exact beat moment (the page cannot reach `page` itself)
await page.exposeFunction('__shot', async (name) => { await page.screenshot({ path: `shots/${name}.png` }); });
await page.waitForTimeout(2600);

const results = [];
const check = (ok, label) => { results.push({ ok, label }); console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); };

const out = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tp = (x, y, z, yaw = 0) => {
    p.x = x; p.y = y; p.z = z; p.radius = 0.35; p.height = 1.75;
    g.player.vy = 0; g.player.ladder = null;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
  };
  const note = () => document.getElementById('note')?.textContent ?? '';
  const poll = async (pred, capMs) => {
    const t0 = Date.now();
    while (Date.now() - t0 < capMs) { if (pred()) return true; await sleep(200); }
    return pred();
  };
  // the registry seam (probe-subway's law): the nearest interaction performs,
  // the Game's own applier applies its effects
  const use = () => {
    const near = g.registry.nearest(p, g.state, { state: g.state, game: g });
    if (near) for (const e of near.perform({ state: g.state, game: g })) g.applyEffect(e);
    return near ? near.id : null;
  };
  const apply = (effects) => { for (const e of effects) g.applyEffect(e); };
  const serveCard = () => { g.advanceOrder(0); g.advanceOrder(null); };
  const o = {};

  // -- the morning, through the real state functions ------------------------
  tp(-27.8, 0.1, 6.6, 1.2);
  await sleep(500);
  o.meet = use();                                    // rosa greet → ENTER_BODEGA
  // her counter walk takes ~9.5 game-s — at software-GL pace the state seam
  // can outrun it, and the corner walk's own guard (a beat owns her feet)
  // would silently bail. Wait until she is AT the counter, facing it.
  o.rosaAtCounter = await poll(() => {
    const r = g.debug.rosaCorner();
    return Math.abs(r.x + 20.4) < 0.2 && Math.abs(r.z - 13.5) < 0.2
      && Math.abs(g.world.rosa.rotation.y - Math.PI / 2) < 0.05;
  }, 180000);
  apply(g.state.enterBodega());                      // → COLLECT (roof hides)
  // 1. the mango's fun-fact sticker (Doc 02 §2:00–5:00)
  tp(-18, 0.1, 18.3, Math.PI);
  await sleep(400);
  o.mangoPick = use();                               // item_mango → pick + sticker
  o.mangoStickerSeen = await poll(() => note().includes('cornerstones'), 30000);
  o.stickerText = note().slice(0, 60);
  for (const [x, z] of [[-16, 18.3], [-14, 18.3]]) { tp(x, 0.1, z, Math.PI); await sleep(400); use(); }
  o.collected = g.state.itemsLeft.size === 0;
  // the rush — five conversations at the counter
  tp(-18, 0.1, 13.0, Math.PI / 2);
  await sleep(400);
  for (let i = 0; i < 5; i++) {
    use();                                           // the counter opens the card
    await poll(() => !g.ui.orderCard.hidden, 20000);
    serveCard();
    await poll(() => g.ui.orderCard.hidden, 20000);
  }
  o.rushDone = g.state.step === 4 ? 'CROSS' : g.state.step; // Step.CROSS = 4
  o.moneyAfterRush = g.state.money;

  // 2+3. the cross → Rosa's corner walk; the claim → her handover line
  apply(g.state.cross(true));                        // → CLAIM_CART + the walk starts
  tp(4, 0.1, -5.2, Math.PI);
  await sleep(400);
  o.cartUse = use();                                 // the cart → handover + name box
  o.handoverNote = await poll(() => note().includes('calling it'), 30000);
  o.nameBoxOpen = !g.ui.nameBox.hidden;
  await window.__shot('a5i-claim-handover');
  g.confirmName('First Slice');                      // → SOLO + first customer
  o.soloStarted = g.state.step === 7; // Step.SOLO = 7
  // Rosa walks the corner route (~22 game-s; the walk ends at her audited spot)
  o.rosaArrived = await poll(() => {
    const r = g.debug.rosaCorner();
    return Math.abs(r.x - 6.35) < 0.2 && Math.abs(r.z + 4.3) < 0.2;
  }, 300000);
  o.rosaSpot = g.debug.rosaCorner();
  // frame the corner from across the street (the cart root is (4, -6.6);
  // from the north curb the boom stays clear and the corner trio reads)
  tp(2.2, 0.1, -3.3, Math.atan2(5.6 - 2.2, -5.4 + 3.3)); // face cart + Rosa
  if (g.cam) g.cam.snapBehind({ x: p.x, y: p.y, z: p.z });
  await sleep(1200);
  await window.__shot('a5i-rosa-at-shoulder');

  // 4. the solo rush → the register count
  for (let i = 0; i < 3; i++) {
    tp(4, 0.1, -5.2, Math.PI);
    await sleep(400);
    use();                                           // the cart opens the card
    await poll(() => !g.ui.orderCard.hidden, 20000);
    serveCard();
    await poll(() => g.ui.orderCard.hidden, 20000);
  }
  o.registerNote = await poll(() => note().includes('Lock up tight'), 120000);
  o.registerText = note().slice(0, 90);
  o.afterSolo = { step: g.state.step, money: g.state.money, soloServed: g.state.soloServed };
  await window.__shot('a5i-register-count');

  // 5. the street performer — the square syncs, then the B stair mouth
  tp(-330, 0.1, 0, 0);
  o.syncFired = await poll(() => g.world.timesSquare.syncedToday, 40000);
  // the wow card owns the walker at the wonder moment — put it down
  await poll(() => !g.ui.postcardPanel.hidden, 40000);
  if (!g.ui.postcardPanel.hidden) { g.ui.postcardStay.click(); await sleep(400); }
  o.wowDismissed = g.ui.postcardPanel.hidden;
  tp(-335.2, 0.12, 4.4, Math.PI);                    // the stairB mouth, surface
  if (g.cam) g.cam.snapBehind({ x: p.x, y: p.y, z: p.z }); // the boom out of the headhouse
  o.listenFired = await poll(() => g.debug.listenFired(), 40000);
  o.listenActive = g.debug.listenActive();
  await sleep(900);
  await window.__shot('a5i-street-performer-listen');
  const listenEnded = await poll(() => !g.debug.listenActive(), 60000);
  o.listenEnded = listenEnded;
  o.listenFiredStill = g.debug.listenFired();
  return o;
});


check(out.meet === 'rosa', `rosa greets at the terminal (got ${out.meet})`);
check(out.rosaAtCounter === true, 'Rosa\u2019s counter walk completes before the morning goes on');
check(out.mangoPick === 'item_mango', `the mango performs (got ${out.mangoPick})`);
check(out.mangoStickerSeen === true, `the fun-fact sticker reads at the pickup ("${out.stickerText}…")`);
check(out.collected === true, 'three items collected');
check(out.rushDone === 'CROSS', `five orders served (got ${JSON.stringify(out.rushDone)})`);
check(out.moneyAfterRush === 112, `the rush pays $87 → $112 (got $${out.moneyAfterRush})`);
check(out.cartUse === 'cart', `the cart performs the claim (got ${out.cartUse})`);
check(out.handoverNote === true, 'Rosa\u2019s handover line reads as the box opens');
check(out.nameBoxOpen === true, 'the name box is open under her line');
check(out.soloStarted === true, 'the name applies — the solo rush begins');
check(out.rosaArrived === true, `Rosa walks the corner route and lands at the shoulder (got ${JSON.stringify(out.rosaSpot)})`);
check(out.registerNote === true, `the register count reads ("${out.registerText}…")`);
check(out.afterSolo.step === 8 && out.afterSolo.money === 112,
  `CLIMB offered with $112 intact (step=${out.afterSolo.step}, $${out.afterSolo.money})`);
check(out.syncFired === true, 'the square\u2019s sync latched');
check(out.wowDismissed === true, 'the wow card put down like a player does');
check(out.listenFired === true && out.listenActive === true,
  `the street performer arms at the B stair mouth (fired=${out.listenFired}, active=${out.listenActive})`);
check(out.listenEnded === true && out.listenFiredStill === true,
  `the listen ends after four seconds and never repeats (${JSON.stringify({ ended: out.listenEnded, still: out.listenFiredStill })})`);

console.log(`ERRORS: ${errors.length === 0 ? 'none' : errors.join(' | ')}`);
const fails = results.filter((r) => !r.ok);
console.log(`=== SUMMARY === ${results.length - fails.length}/${results.length} checks pass`);
await browser.close();
process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
