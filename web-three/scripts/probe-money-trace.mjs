/**
 * WP-4 money-trace probe — the money→ledger bridge, proven in the real
 * built game (dist/): the autotest driver plays the true Day 1 (the five
 * rush cups at Rosa's counter), and the probe reads the ledger through
 * the debug handle and asserts the whole story:
 *
 *   - genesis $87.00 on BOTH sides of the sanctioned mirror;
 *   - five rush cups, each a +$5.00 business_revenue faucet
 *     (the customer is not a simulated account), ids txn:story_<tick>_n;
 *   - the ledger audit clean, mirror === ledger at every step;
 *   - the Day-1 trace printed — every dollar traceable to the ledger.
 *
 * The E2E's $87 → $112 math is unchanged — it is now TRANSACTIONAL.
 * Exit 0 = every assertion passed AND the console stayed clean.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4601;
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
// The E2E's viewport law: small enough that the dt clamp never halves
// game-time on software GL — the driver is viewport-agnostic.
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/?autotest=1&fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });

// Genesis, before the story moves a cent: $87.00 on both sides of the mirror.
const genesis = await page.evaluate(() => {
  const d = window.__game.worldSim.debug();
  return { playerCents: d.ledger.playerCents, ledgerCents: d.ledger.ledgerCents, txnCount: d.ledger.txnCount, auditClean: d.ledger.auditClean };
});
const steps = [];
const check = (ok, label) => { steps.push(`${ok ? 'PASS' : 'FAIL'} ${label}`); return ok; };
let ok = true;
ok = check(genesis.playerCents === 8700, `genesis mirror reads $87.00 (got ${(genesis.playerCents / 100).toFixed(2)})`) && ok;
ok = check(genesis.ledgerCents === 8700, `genesis ledger reads $87.00 (got ${(genesis.ledgerCents / 100).toFixed(2)})`) && ok;
ok = check(genesis.txnCount === 0, `genesis ledger is empty — the shipped start is genesis, not a transaction (got ${genesis.txnCount} txns)`) && ok;
ok = check(genesis.auditClean, 'genesis ledger audits clean') && ok;

// The driver plays Day 1 for real. Wait for the day-1 close: day 2's wake,
// wallet at $112 — the E2E's own pinned math, unchanged.
await page.waitForFunction(
  () => { const g = window.__game; return g && g.state.day === 2 && g.state.money === 112; },
  null, { timeout: 540000 },
);

const trace = await page.evaluate(() => {
  const d = window.__game.worldSim.debug();
  return {
    day: d.day, tick: d.tick,
    playerCents: d.ledger.playerCents, ledgerCents: d.ledger.ledgerCents,
    auditClean: d.ledger.auditClean, txnCount: d.ledger.txnCount, recent: d.ledger.recent,
  };
});

const dollars = (c) => `$${Math.floor(Math.abs(c) / 100)}${Math.abs(c) % 100 ? `.${String(Math.abs(c) % 100).padStart(2, '0')}` : ''}`;
console.log(`\n--- Day-1 money trace (tick ${trace.tick}) ---`);
for (const t of trace.recent) {
  console.log(`  ${t.id}  ${t.kind.padEnd(8)} ${t.category.padEnd(18)} +${dollars(t.cents)}  ${t.reason}`);
}
console.log(`  balance: ${dollars(trace.ledgerCents)} (mirror ${dollars(trace.playerCents)}), ${trace.txnCount} transactions\n`);

ok = check(trace.txnCount === 5, `exactly five transactions — the five rush cups (got ${trace.txnCount})`) && ok;
ok = check(trace.ledgerCents === 11200, `ledger ends at $112.00 (got ${dollars(trace.ledgerCents)})`) && ok;
ok = check(trace.playerCents === trace.ledgerCents, 'the sanctioned mirror holds: player moneyCents === ledger balance') && ok;
ok = check(trace.auditClean, 'the ledger audit is clean — every dollar = genesis + Σ(transactions)') && ok;
ok = check(trace.recent.every((t) => t.kind === 'faucet' && t.category === 'business_revenue' && t.cents === 500),
  'every cup is a +$5.00 business_revenue faucet (the customer is not a simulated account)') && ok;
ok = check(trace.recent.every((t) => /^txn:story_\d+_[0-4]$/.test(t.id)),
  `ids are deterministic story ids (${trace.recent.map((t) => t.id).join(', ')})`) && ok;

ok = check(errors.length === 0, `console clean (${errors.length} errors)`) && ok;
for (const e of errors) console.error(`CONSOLE: ${e}`);

await browser.close();
server.close();
for (const s of steps) console.log(s);
console.log(ok ? '\nprobe-money-trace: ALL CHECKS PASSED' : '\nprobe-money-trace: FAILURES PRESENT');
process.exit(ok ? 0 : 1);
