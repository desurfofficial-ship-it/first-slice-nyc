/**
 * Browser E2E driver — the counterpart of the Godot headless autotest
 * (main.gd `_run_autotest`). Runs the REAL game with real physics and the
 * real input layer: walks waypoints with camera-relative steering (injecting
 * WASD exactly like a player), presses interact, climbs both ladders, and
 * verifies the full Day 1 + Day 2 path — the three Doc 21 seams, the money
 * math, and the save file.
 *
 * Activated with ?autotest=1. Results stream to the console and to
 * window.__AUTOTEST__ for external harnesses (Playwright / agent-browser).
 */

import { Step } from '../core/GameState';
import { loadSave, wipeSave } from '../core/Save';
import type { Game } from './Game';

interface AutotestReport {
  lines: string[];
  failures: string[];
  done: boolean;
  startedAt: number;
}

declare global {
  interface Window {
    __AUTOTEST__: AutotestReport;
    __AUTOTEST_SUMMARY__?: string;
  }
}

export function runAutotest(game: Game): void {
  const report: AutotestReport = { lines: [], failures: [], done: false, startedAt: Date.now() };
  window.__AUTOTEST__ = report;
  const log = document.createElement('pre');
  log.id = 'autotest-log';
  log.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;font:11px monospace;color:#B9F5EA;background:rgba(26,20,32,.85);padding:8px;max-height:34vh;overflow:auto;max-width:70vw;white-space:pre-wrap;';
  document.body.appendChild(log);

  const check = (ok: boolean, what: string) => {
    const line = `${ok ? 'PASS' : 'FAIL'} ${what}`;
    report.lines.push(line);
    if (!ok) report.failures.push(what);
    log.textContent += line + '\n';
    log.scrollTop = log.scrollHeight;
    console.info(line);
  };

  const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
  const waitFrames = async (n: number) => { for (let i = 0; i < n; i++) await nextFrame(); };
  const waitMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const walkLog = new URLSearchParams(location.search).has('walklog');

  /** Steer with real input keys toward a point (camera-relative), up to `timeout` s.
   *  stopOnLadder: arrive as soon as a ladder is grabbed (climbing replaces walking).
   *  The default budget is generous on purpose: software rendering runs sim
   *  time slower than real time, and the block is full now — a walk that
   *  crosses the street may wait for a cab to yield. */
  const walkTo = async (x: number, z: number, timeout = 20, stopOnLadder = false) => {
    const t0 = performance.now();
    let frames = 0;
    let lastPos = '';
    let stuckCount = 0;
    while (performance.now() - t0 < timeout * 1000) {
      if (stopOnLadder && game.player.ladder !== null) break;
      const p = game.player.capsule;
      const dx = x - p.x;
      const dz = z - p.z;
      if (Math.hypot(dx, dz) < 0.35) break;
      // stuck tracking runs EVERY frame — the sidestep logic depends on it
      const posKey = `${p.x.toFixed(2)},${p.z.toFixed(2)}`;
      if (posKey === lastPos) stuckCount++;
      else { stuckCount = 0; lastPos = posKey; }
      if (walkLog && frames % 90 === 0) {
        console.info(`[walk] t=${((performance.now() - t0) / 1000).toFixed(1)} pos=(${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}) yaw=${game.player.camYaw.toFixed(2)} ladder=${game.player.ladder !== null} ground=${game.player.onGround}`);
      }
      if (walkLog && stuckCount === 2) {
        const near: Array<{ d: number; box: number[] }> = [];
        game.world.colliders.forEach((b) => {
          const nx2 = Math.max(b.minX, Math.min(p.x, b.maxX));
          const nz2 = Math.max(b.minZ, Math.min(p.z, b.maxZ));
          const d = Math.hypot(p.x - nx2, p.z - nz2);
          if (d < 0.6) near.push({ d: +d.toFixed(3), box: [b.minX, b.maxX, b.minY, b.maxY, b.minZ, b.maxZ].map((v) => +v.toFixed(2)) });
        });
        console.info(`[stuck] frames=${frames} pos=(${p.x.toFixed(3)},${p.z.toFixed(3)}) near=${JSON.stringify(near)} rosa=(${game.world.rosa.position.x.toFixed(2)},${game.world.rosa.position.z.toFixed(2)})`);
      }
      frames++;
      // steer by the MOVEMENT basis, not the boom yaw — during a street-side
      // flip the camera swings while the reference the walker uses stays put
      const yaw = game.player.camYaw;
      const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
      const rightX = -Math.cos(yaw), rightZ = Math.sin(yaw);
      const len = Math.hypot(dx, dz) || 1;
      const nx = dx / len, nz = dz / len;
      const f = nx * fwdX + nz * fwdZ;
      let r = nx * rightX + nz * rightZ;
      // Blocked head-on (the cab yields and stands in the path, the cart, a
      // pole): pure pushes have no lateral component (|r| < 0.2) and weld to
      // the box forever. Sidestep ON TOP of the steer keys, alternating every
      // ~45 frames, until position moves again — how a person edges around.
      let slide = 0;
      if (stuckCount > 12) slide = Math.floor(stuckCount / 45) % 2 === 0 ? -1 : 1;
      game.input.injectKey('KeyW', f > 0.2);
      game.input.injectKey('KeyS', f < -0.2);
      game.input.injectKey('KeyD', r > 0.2 || slide > 0);
      game.input.injectKey('KeyA', r < -0.2 || slide < 0);
      await nextFrame();
    }
    game.input.injectKey('KeyW', false);
    game.input.injectKey('KeyS', false);
    game.input.injectKey('KeyD', false);
    game.input.injectKey('KeyA', false);
    await waitFrames(3);
  };

  const interact = async () => {
    game.input.injectInteract();
    await waitFrames(2);
  };

  /** Hold a key until a condition lands (or timeout). The world grew a
   *  neighborhood — software-rendered sim time runs slower than real time
   *  now, so fixed holds under-climb. Conditions don't. */
  const holdUntil = async (code: string, pred: () => boolean, timeout = 10) => {
    game.input.injectKey(code, true);
    const t0 = performance.now();
    while (performance.now() - t0 < timeout * 1000) {
      await nextFrame();
      if (pred()) break;
    }
    game.input.injectKey(code, false);
    await waitFrames(3);
  };

  const run = async () => {
    const s = game.state;
    const p = () => game.player.capsule;
    const dbg = game.debug;
    try {
      // fresh Day 1 for the test run. The decision reads bootedFromDay (the
      // save at boot), NOT s.day — beginDay holds s.day at its default until
      // its 700 ms fade ends, and a Day-2 resume would race this check and
      // run the whole suite against a replay session (money $111, every
      // interaction "dead").
      wipeSave();
      if (game.bootedFromDay >= 2) location.reload();

      await waitFrames(30);
      check(game.player.onGround && p().y < 0.2, `player stands on the sidewalk (y=${p().y.toFixed(2)})`);

      // the walk cycle itself (playtest 2026-10-29: "the characters doesn't
      // walk, they move") — real key input, hips must swing while moving
      game.input.injectKey('KeyW', true);
      let swing = 0;
      for (let i = 0; i < 26; i++) {
        await waitFrames(1);
        const r = (game.playerVisual.userData as { rig?: { hipL: { rotation: { x: number } } } }).rig;
        if (r) swing = Math.max(swing, Math.abs(r.hipL.rotation.x));
      }
      game.input.injectKey('KeyW', false);
      await waitFrames(5);
      check(swing > 0.15, `walk cycle swings the hips while moving (max |hipL|=${swing.toFixed(3)})`);

      await walkTo(-27.8, 6.6);
      await interact();
      check(s.step === Step.ENTER_BODEGA, 'Rosa greeting advances flow');
      await walkTo(-16, 7.0);
      await walkTo(-16, 12.0);
      check(s.step === Step.COLLECT && !game.world.roof.visible, 'enter bodega: roof hides, collect step');
      for (const x of [-18.0, -16.0, -14.0]) {
        await walkTo(x, 18.3);
        await interact();
      }
      check(s.step === Step.RUSH, '3 shelf items collected');
      await walkTo(-18.0, 13.0);
      for (let i = 0; i < 5; i++) await interact();
      check(s.step === Step.CROSS && s.rushServed === 5, '5-order rush served');
      check(s.money === 112, `day 1 rush pays $87 \u2192 $112 (Doc 08) (got $${s.money})`);
      // the cab now REALLY yields (collider + stop line) — a pedestrian waits
      // for the car to clear the crossing before stepping off the curb
      {
        const t0 = performance.now();
        while (performance.now() - t0 < 14000) {
          if (game.world.taxi.position.x > 2) break;
          await nextFrame();
        }
      }
      await walkTo(-16, 6.0);
      await walkTo(-5, 5.0);
      await walkTo(-5, -5.0);
      check(s.step === Step.CLAIM_CART, 'crosswalk trigger fires');
      await walkTo(4, -5.2);
      await interact();
      check(!game.ui.nameBox.hidden && game.player.frozen, 'cart claim opens name box and freezes walker');

      // Type with movement + interact keys in the name; none should leak to the walker.
      const before = { x: p().x, z: p().z };
      game.ui.nameInput.focus();
      for (const ch of "Wade's Spot") {
        const code = ch === ' ' ? 'Space' : `Key${ch.toUpperCase()}`;
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ch, code, bubbles: true }));
        game.ui.nameInput.value += ch;
        window.dispatchEvent(new KeyboardEvent('keyup', { key: ch, code, bubbles: true }));
        await waitFrames(2);
      }
      check(game.ui.nameInput.value === "Wade's Spot", `name box keeps every letter (got '${game.ui.nameInput.value}')`);
      check(Math.hypot(p().x - before.x, p().z - before.z) < 0.05, "typing WASD/Space doesn't move the walker");
      game.confirmName(game.ui.nameInput.value);
      check(s.step === Step.SOLO && s.cartName === "Wade's Spot", 'cart named');
      for (let i = 0; i < 3; i++) await interact();
      check(s.step === Step.CLIMB && s.soloServed === 3, '3 solo serves incl. Mr. Idris');

      await walkTo(9.4, -7.2, 12, true);
      check(game.player.ladder !== null, 'grabbed ladder 1');
      check(dbg.duskStarted(), 'dusk starts at the fire escape');

      // -- seam 2: step off partway; Rosa must call you back --
      await holdUntil('KeyW', () => p().y > 1.4, 8);
      await holdUntil('KeyA', () => game.player.ladder === null, 4);
      await waitFrames(40);
      check(game.player.ladder === null && p().y < 0.4, `stepped off ladder 1 (y=${p().y.toFixed(2)})`);
      check(dbg.objective().toLowerCase().includes('fire escape'), "stepping off calls Rosa's hint");
      await walkTo(9.4, -7.2, 12, true);
      check(game.player.ladder !== null, 're-grabbed ladder 1');
      await holdUntil('KeyW', () => p().y > 3.6, 10);   // ride to the rail
      await holdUntil('KeyD', () => game.player.ladder === null, 4); // step east onto the landing
      await waitFrames(20);
      check(p().y > 3.9 && game.player.onGround, `standing on landing 1 (y=${p().y.toFixed(2)})`);
      await walkTo(16.2, -7.2, 8, true);
      check(game.player.ladder !== null, `grabbed ladder 2 (pos=${p().x.toFixed(1)},${p().z.toFixed(1)})`);
      await holdUntil('KeyW', () => p().y >= 8.34, 10);
      check(p().y <= 8.36, `ladder caps at the rail — no overshoot (y=${p().y.toFixed(2)})`);
      await holdUntil('KeyA', () => game.player.ladder === null, 4);
      await waitFrames(20);
      check(p().y > 7.9, `reached landing 2 (y=${p().y.toFixed(2)})`);
      const rigAfterClimb = (game.playerVisual.userData as { rig?: { mode: string } }).rig;
      check(!!rigAfterClimb && rigAfterClimb.mode === 'auto', 'climb pose released after stepping off (hands down)');
      // poll, don't sleep: sim time lags real time under software rendering,
      // so a fixed wait can sample mid-flick (the dip is the POINT of the beat)
      {
        const t0 = performance.now();
        while (performance.now() - t0 < 30000 && !(s.step === Step.DONE && !game.ui.postcardPanel.hidden)) await nextFrame();
      }
      check(s.step === Step.DONE && !game.ui.postcardPanel.hidden, 'gold window + Postcard compose');
      check(dbg.goldIntensity() > 3.0, 'gold window holds lit');
      check(s.money === 112, 'money label reads $112');

      // -- seam 3: the end breathes — postcard closes, lingering is allowed --
      await interact();
      check(game.ui.postcardPanel.hidden && !game.player.frozen && !dbg.postcardRig(), 'postcard dismisses \u2014 the end lingers');
      await walkTo(12.5, -6.8, 8);
      await interact();
      check(s.lingerStage === 2, 'rail: Rosa\u2019s goodnight beat');
      {
        const t0 = performance.now();
        while (performance.now() - t0 < 30000 && dbg.rosaIntensity() <= 1.5) await nextFrame();
      }
      check(dbg.rosaIntensity() > 1.5, 'Rosa\u2019s window warms');
      await interact();
      check(dbg.dayFading(), 'rail: tomorrow begins');
      await waitMs(2200);
      check(s.day === 2 && s.step === Step.D2_IDRIS, 'day 2 begins \u2014 Idris is on his way');
      check(s.money === 112 && s.cartName === "Wade's Spot", 'day 2 keeps name and money');
      check(loadSave().day === 2, 'day-start snapshot written');

      // Idris walks to the cart (tweens run on sim time; give the slow renderer room)
      const idrisT0 = performance.now();
      while (!s.idrisArrived && performance.now() - idrisT0 < 20000) await nextFrame();
      check(s.idrisArrived, 'Idris arrives at the cart');
      await walkTo(4.4, -4.6, 8);
      await interact();
      check(s.idrisServed && s.money === 114, `Idris served: +$2 (got $${s.money})`);

      await walkTo(-16, 6.8);
      await interact();
      check(s.step === Step.D2_DELIVER && dbg.cupVisible(), 'Rosa\u2019s favor accepted: cup in hand');
      // regression (playtest 2026-10-29): the old GLB swap orphaned the cup —
      // visible flag flipped while the cup hung in detached limbo
      const cupAttached = game.cupProp.parent === game.playerVisual;
      check(cupAttached, 'cup prop is still childed to the player visual');
      await walkTo(15, 6.9);
      await interact();
      check(s.kidKept && s.money === 117 && game.world.kidSil.visible, `kid kept: +$3, kid at the glass ($${s.money})`);
      check(game.world.kidSil.position.z < 7.9, 'kid silhouette stands IN FRONT of the window glass');
      await walkTo(4, -5.2);
      await interact();
      check(s.awningConfirm, 'awning offer asks for a confirm press');
      await interact();
      check(s.awningUp && s.money === 102 && game.world.cartAwning.visible, `awning up: -$15 (got $${s.money})`);
      for (let i = 0; i < 3; i++) {
        await walkTo(4, -5.2);
        await interact();
        await waitFrames(2);
      }
      check(s.lunchServed === 3 && s.money === 111, `lunch rush with awning tips: $${s.money}`);
      check(s.step === Step.D2_CLIMB2, 'dusk climb offered');

      await walkTo(9.4, -7.2, 12, true);
      await holdUntil('KeyW', () => p().y > 3.6, 10);
      await holdUntil('KeyD', () => game.player.ladder === null, 4);
      await waitFrames(20);
      await walkTo(16.2, -7.2, 8, true);
      await holdUntil('KeyW', () => p().y >= 8.34, 10);
      await holdUntil('KeyA', () => game.player.ladder === null, 4);
      {
        const t0 = performance.now();
        while (performance.now() - t0 < 30000 && dbg.secondIntensity() <= 2.5) await nextFrame();
      }
      check(dbg.secondIntensity() > 2.5, 'second window lights');
      check(game.world.kidSil.visible, 'the kid is at the glass');
      {
        const t0 = performance.now();
        while (performance.now() - t0 < 30000 && !(s.step === Step.D2_POSTCARD && !game.ui.postcardPanel.hidden)) await nextFrame();
      }
      check(s.step === Step.D2_POSTCARD && !game.ui.postcardPanel.hidden, 'day 2 postcard composes');
      check(dbg.caption().includes('Day 2'), 'postcard says Day 2');
      await interact();
      check(!game.player.frozen, 'day 2 end lingers too');

      const save = loadSave();
      check(save.day === 2 && save.day_complete === true && save.awning === true
        && save.kid_kept === true && save.money === 111,
        `save holds day 2 complete: $${save.money}, awning=${save.awning}, kid=${save.kid_kept}`);

      // ============================================================ Day 3
      // "A Place at the Corner" — Rosa at the cart, a real morning rush
      // (orders are brewed, not snapped), the kid comes down, the stool,
      // the flyer by the subway, and the third window.
      await walkTo(12.5, -6.8, 8);
      await interact();
      check(s.lingerStage === 2, 'day 2 rail: Rosa\u2019s goodnight beat');
      await interact();
      await waitMs(2400);
      check(s.day === 3 && s.step === Step.D3_WAKE, 'day 3 begins \u2014 Rosa has news');
      check(loadSave().day === 3, 'day-3 snapshot written');

      await interact();
      check(s.step === Step.D3_RUSH, 'Rosa\u2019s news opens the rush');
      check(!!game.customer, 'Idris is first at the cart');
      const orderBubble = game.customer?.children.find((c) => c.type === 'Sprite');
      check(!!orderBubble, 'the first order bubble is up');

      for (let i = 0; i < 4; i++) {
        await walkTo(4, -5.2, 10);
        await interact();
        const brewT0 = performance.now();
        while (s.d3Brewing && performance.now() - brewT0 < 9000) await nextFrame();
        await waitFrames(4);
      }
      check(!s.d3Brewing && s.step === Step.D3_KIDDOWN, 'four orders brewed and served');
      check(s.money === 130, `morning rush pays $19 (got $${s.money})`);
      check(game.world.kidGround.visible, 'the kid is waiting at the stoop');

      await walkTo(14.6, 6.3, 22);
      await interact();
      check(s.kidDown, 'the kid joins you');
      {
        // he walks at your hip \u2014 sample his progress mid-walk
        const kid = game.world.kidGround;
        const x0 = kid.position.x;
        await walkTo(9, 2, 6);
        check(kid.position.x < x0 - 2, `the kid is actually walking (x ${x0.toFixed(1)} \u2192 ${kid.position.x.toFixed(1)})`);
      }
      // walk TO the corner — the cart is solid now, so a player naturally
      // bumps to its edge (~1.05 m out) and the kid's 1.0 m hip distance puts
      // him inside the 2.6 m corner radius. Stopping 1.7 m short with the kid
      // trailing on the far side misses the trigger by centimeters (the flaky
      // e2e found it); a person walks up to the counter.
      await walkTo(4, -5.45, 20);
      {
        // he closes the last meter at his own pace (sim time lags real time
        // under software rendering — poll, don't sample)
        const t0 = performance.now();
        while (performance.now() - t0 < 12000 && !s.kidAtCorner) await nextFrame();
      }
      check(s.kidAtCorner && s.step === Step.D3_STOOL, 'the kid reached the corner on his own feet');
      await interact();
      await interact();
      check(s.stoolUp && s.money === 120 && game.world.stool.visible, `stool up: -$10 (got $${s.money})`);
      check(s.step === Step.D3_POSTER, 'the flyer objective is up');

      // the west end in two sidewalk legs — the 43 m diagonal against the
      // full sim load (leaves, signals, two flocks) outran a single 48 s
      // budget under software rendering
      await walkTo(-20, 6.5, 40);
      await walkTo(-37.6, 6.9, 40);
      await interact();
      check(s.step === Step.D3_CLIMB3, 'flyer read \u2014 the block knows your name');

      // east along the north sidewalk in two legs, then step south to the
      // ladder — the single 47 m diagonal outran its budget under the full
      // sim load, same as the flyer walk did
      await walkTo(-16, 6.5, 30);
      await walkTo(9.4, -4.8, 60);
      await walkTo(9.4, -7.2, 20, true);
      check(game.player.ladder !== null, 'day 3: grabbed ladder 1');
      await holdUntil('KeyW', () => p().y > 3.6, 10);
      await holdUntil('KeyD', () => game.player.ladder === null, 4);
      await waitFrames(20);
      await walkTo(16.2, -7.2, 8, true);
      await holdUntil('KeyW', () => p().y >= 8.34, 10);
      await holdUntil('KeyA', () => game.player.ladder === null, 4);
      {
        const t0 = performance.now();
        while (performance.now() - t0 < 30000 && !(s.step === Step.D3_POSTCARD && !game.ui.postcardPanel.hidden)) await nextFrame();
      }
      check(s.step === Step.D3_POSTCARD && !game.ui.postcardPanel.hidden, 'day 3 postcard composes');
      check(dbg.caption().includes('Day 3'), 'postcard says Day 3');
      check(dbg.thirdIntensity() > 2.5, 'the third window lights \u2014 golden-hour payoff');
      check(game.world.kidGround.visible, 'the kid is at the corner below, on his stool');
      await interact();
      check(!game.player.frozen, 'day 3 end lingers too');

      await walkTo(12.5, -6.8, 8);
      await interact();
      check(s.lingerStage === 2, 'rail: Rosa\u2019s goodnight (day 3)');
      await interact();
      await waitMs(500);
      check(s.day === 3 && !dbg.dayFading(), 'day 4 does not begin \u2014 the light stays a little longer');
      const save3 = loadSave();
      check(save3.day === 3 && save3.day_complete === true && save3.stool === true && save3.money === 120,
        `save holds day 3 complete: $${save3.money}, stool=${save3.stool}`);
    } catch (err) {
      check(false, `driver exception: ${(err as Error).message}`);
      console.error(err);
    } finally {
      report.done = true;
      const summary = `AUTOTEST ${report.failures.length === 0 ? 'OK' : 'FAILED'}: ${report.failures.length} failures, ${Math.round((Date.now() - report.startedAt) / 1000)}s`;
      log.textContent += summary + '\n';
      console.info(summary);
      window.__AUTOTEST_SUMMARY__ = summary;
    }
  };

  void run();
}
