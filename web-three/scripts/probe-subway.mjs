/**
 * Subway probe — the K line end-to-end in the real game (docs/50):
 * the stair descent, the dollhouse, the platform, the ride (batch-driven
 * through the deterministic seam), 42nd Street, the busker, the sync beat,
 * Times Square surface, and the M121 bus — desktop rig.
 *
 * The ride is batch-ticked through `world.subway.update` so the 23 s ride
 * proves in one probe pass (the live loop keeps running — the machine is
 * guarded, both drivers land on the same events).
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4593;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 520 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2600);

const results = [];
const check = (ok, label) => {
  results.push({ ok, label });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
};

const run = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Walk until the PLAYER arrives, not until a fixed nap does — software-GL
  // boxes cover less ground per wall-clock second, and a nap-based walk
  // fails them honestly but uselessly (the docs/51 gate: probes must be
  // machine-honest). Polls the live capsule with a generous cap.
  const walkUntil = async (code, pred, timeoutMs = 20000) => {
    g.input.injectKey(code, true);
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs && !pred()) await sleep(100);
    g.input.injectKey(code, false);
    await sleep(250);
  };
  const out = {};
  // camera-relative walking: pick the key whose forward points where we
  // want (the camera owns its yaw; we just read it)
  const keyToward = (wantNorth) => (wantNorth ? Math.cos(g.player.camYaw) > 0 : Math.cos(g.player.camYaw) < 0) ? 'KeyW' : 'KeyS';
  const tp = (x, y, z, yaw = 0) => {
    p.x = x; p.y = y; p.z = z; p.radius = 0.35; p.height = 1.75;
    g.player.vy = 0; g.player.ladder = null;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    // the camera's moveYaw is the live source — Game copies it to the
    // player every frame, so both get pinned
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
  };
  const feet = () => ({ x: p.x, y: p.y, z: p.z });
  const batch = (seconds, dt = 0.1) => {
    // deterministic batch drive of the ride machine — the LIVE capsule goes
    // in (the swap seam writes the translation into it), and the machine is
    // guarded so the concurrent rAF loop lands on the same events
    for (let t = 0; t < seconds; t += dt) {
      g.world.subway.update(dt, p, () => {});
    }
  };

  // 1. the stair: the treads take weight step by step down the slot
  tp(-47.2, 0.1, 3.9, 0);
  await sleep(900);
  const dbg = [];
  const key1 = keyToward(true);
  dbg.push(['pre', +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), Math.round(g.player.camYaw * 100) / 100, g.player.frozen]);
  g.input.injectKey(key1, true);
  for (let i = 0; i < 6; i++) { await sleep(180); dbg.push(['w' + i, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), Math.round(g.player.camYaw * 100) / 100]); }
  g.input.injectKey(key1, false);
  out.stairMidY = +p.y.toFixed(2); // partway down = the steps catch the walk
  out.dbg = dbg;
  tp(-47.2, -1.75, 6.1, 0);        // land mid-stair (a tread holds)
  await sleep(500);
  out.stairMidY2 = +p.y.toFixed(2);
  // walk the descent to the PLATFORM, not to a wall-clock nap — software-GL
  // boxes cover less ground per second (the docs/51 machine-honesty law;
  // the fixed 1100 ms nap landed one tread short on slow boxes)
  g.input.injectKey(keyToward(true), true);
  const t0Stair = Date.now();
  while (Date.now() - t0Stair < 15000 && p.y > -3.05) await sleep(100);
  g.input.injectKey(keyToward(true), false);
  await sleep(400);
  out.stairY = +p.y.toFixed(2);
  out.underground = g.world.subway.underground;
  // the underground shadow economy (docs/51 B13): the dollhouse flip must
  // shrink the sun's box to the platform half — and the follow re-snap must
  // have re-laid it symmetric (the walk crossed texel cells on the way down)
  const smc = g.world.sun.shadow.camera;
  out.shadowHalfUnder = +smc.right.toFixed(3);
  out.shadowSymmetric = Math.abs(smc.right + smc.left) < 1e-4 && Math.abs(smc.top + smc.bottom) < 1e-4;

  // 2. the dollhouse: the terminal mass lifts when underground
  let terminalVisible = null;
  g.world.scene.traverse((o) => { if (o.name === 'Bldg_N_West') terminalVisible = o.visible; });
  out.terminalHidden = terminalVisible === false;

  // 3. the platform holds (no fall-through): step onto the fare pocket
  tp(-44.6, -3.1, 9.0);
  await sleep(400);
  out.platformY = +p.y.toFixed(2);
  out.stationLit = g.world.subway.groups.stationA.visible;
  // the dollhouse lifts the yard roof: the north lawn must survive the
  // static bake as a STANDALONE named mesh (baked, the name lookup finds
  // nothing, the lawn stays up underground and the cutaway looks at grass
  // — the entering-the-subway regression, fixed 2026-11-12) and hide now
  let yard = null;
  g.world.scene.traverse((o) => { if (o.name === 'Yard_N') yard = o; });
  out.yardStandalone = !!yard;
  out.yardHidden = !!yard && yard.visible === false;
  // the settled platform lens: the sight line camera→focus must clear the
  // station's south wall top (z 7.7 plane, top edge −0.25) with margin,
  // and the lens must ride the dollhouse lift (focus + ~10, not ~6.7)
  await sleep(1600);
  const camPos = g.cam.camera.position;
  const focus = { x: p.x, y: p.y + 1.2, z: p.z };
  const tWall = (7.7 - camPos.z) / (focus.z - camPos.z);
  out.lensY = +camPos.y.toFixed(2);
  out.wallClear = +(camPos.y + tWall * (focus.y - camPos.y)).toFixed(2);

  // 4. Priya stands her post
  let priya = null;
  g.world.subway.groups.stationA.traverse((o) => { if (o.name === 'Priya') priya = o; });
  out.priya = !!priya && priya.visible;

  // 5. board — the 2026-11-12 law: WALK in, no teleports. The old leg
  // teleported into the car and the probe passed while every real player
  // was left on the platform: the south bench ran across the doorway and
  // the walk-in stopped 6 cm short of the aboard band. Now: stand on the
  // platform, walk north through the open door until the band says aboard.
  tp(-41.1, -3.1, 12.6, 0);
  await sleep(500);
  // the aligned car's shell still reads as a train from the platform (the
  // read happens BEFORE the walk — aboard, roof + south face stand down).
  // Exact names: the pair's shuttered east car wears its own shell and
  // keeps it — only the car the player rides stands its shell down.
  const alignedShellVisible = () => {
    let roof = null, body = null;
    g.world.subway.groups.trainA.traverse((o) => {
      if (o.name === 'SUB_CarRoof_-44.2') roof = o.visible;
      if (o.name === 'SUB_CarBodyS_-44.2_1') body = o.visible;
    });
    return roof === true && body === true;
  };
  out.roofOnAtPlatform = alignedShellVisible();
  // ride.ts's aboard band (CAR_Z_MIN 14.45 / CAR_Z_MAX 17.35) — inlined here
  // because the page scope has no module imports (the probe's positions are
  // canon coordinates anyway; the unit test pins the band itself)
  const aboard = (z) => z > 14.45 && z < 17.35;
  g.input.injectKey('KeyW', true);
  const t0Board = Date.now();
  while (Date.now() - t0Board < 8000 && !aboard(p.z)) await sleep(80);
  g.input.injectKey('KeyW', false);
  await sleep(300);
  out.walkInZ = +p.z.toFixed(3);
  out.walkInY = +p.y.toFixed(3);
  out.walkInAboard = aboard(p.z);
  const near = g.registry.nearest(p, g.state, { state: g.state, game: g });
  out.ridePrompt = near ? near.id : null;
  if (near && near.id === 'trainA') {
    for (const e of near.perform({ state: g.state, game: g })) g.applyEffect(e);
  }
  out.boarded = g.world.subway.ride.phase === 'closing';

  // 6. the ride: batch past the teach beat (t 8.5) — Priya's chalk appears
  // on the middle window's inside face (docs/51 B11), in BOTH cars (the
  // twins carry identical copies so the seam at t 12 never shows the trick)
  batch(10);
  let diagramUp = 0, diagramTotal = 0;
  const censusDiagram = (g2) => g2.traverse((o) => {
    if (o.name.startsWith('SUB_Diagram_')) { diagramTotal++; if (o.visible) diagramUp++; }
  });
  censusDiagram(g.world.subway.groups.trainA);
  censusDiagram(g.world.subway.groups.trainB);
  out.diagramMeshes = diagramTotal;
  out.diagramUpAtBeat = diagramTotal > 0 && diagramUp === diagramTotal;
  // aboard, the car is the room: roof AND platform-side face stand down
  // for the dollhouse lens (the 2026-11-12 fix — a roofed car read as a
  // closed metal tube; with the face on, the shut door still hid the rider)
  const alignedShellHidden = () => {
    let roof = null, body = null, leaf = null;
    g.world.subway.groups.trainA.traverse((o) => {
      if (o.name === 'SUB_CarRoof_-44.2') roof = o.visible;
      if (o.name === 'SUB_CarBodyS_-44.2_1') body = o.visible;
      if (o.name === 'SUB_DoorLeaf_-44.2_a') leaf = o.visible;
    });
    return roof === false && body === false && leaf === false;
  };
  out.roofOffAboard = alignedShellHidden();
  // the seam snap: the boom inherits the swap's ±288 m in the same frame
  // (SubwaySystem.seamDx → Game.frame) — no 288 m lerp through the tunnel
  const camXBeforeSeam = g.cam.camera.position.x;
  batch(15);
  await sleep(250); // the rAF frame consumes the seam debt after the batch
  const camXAfterSeam = g.cam.camera.position.x;
  out.seamCamJump = +Math.abs(camXAfterSeam - camXBeforeSeam).toFixed(1);
  out.ridePhase = g.world.subway.ride.phase;
  out.atB = g.world.subway.ride.at === 'B';
  out.swappedX = +p.x.toFixed(1);
  out.doorsOpenAtB = g.world.subway.doorsOpen;
  // aboard the car the lift stands down: the lens keeps the car-scale
  // street framing (focus + ~6.7), never the lifted diorama height. The
  // read waits for the boom to settle — the seam's 288 m teleport and the
  // batch ticks leave the lens mid-lerp otherwise
  await sleep(1600);
  out.aboardLensY = +g.cam.camera.position.y.toFixed(2);
  out.aboardFocusY = +(p.y + 1.2).toFixed(2);

  // 7. the busker waits on the 42nd St platform
  let busker = null;
  g.world.subway.groups.stationB.traverse((o) => { if (o.name === 'TheBusker') busker = o; });
  out.busker = !!busker && busker.visible;

  // 8. step off; the doors close behind; the machine rests — and the chalk
  // rides only the ride it was drawn on (a fresh car waits for the teach)
  tp(-329.1, -3.1, 13.2);
  batch(2.2);
  out.retired = g.world.subway.ride.phase === 'idle';
  let diagramDown = 0;
  const censusDown = (g2) => g2.traverse((o) => {
    if (o.name.startsWith('SUB_Diagram_') && !o.visible) diagramDown++;
  });
  censusDown(g.world.subway.groups.trainA);
  censusDown(g.world.subway.groups.trainB);
  out.diagramDownAtRest = diagramTotal > 0 && diagramDown === diagramTotal;

  // 6b. the left-behind law (bug-hunt fix): a player on the PLATFORM when
  // the machine rides must NOT be translated at the seam — the ride runs,
  // the arrival's doors-open event sets them free, no 288 m teleport.
  tp(-41.1, -3.1, 13.4); // platform, at the door, OUTSIDE the car band
  const leftX = p.x;
  g.world.subway.requestRide('A');
  batch(2); // closing (1.2 s)
  out.leftBehindStarted = g.world.subway.ride.phase === 'riding';
  batch(11); // through the seam (swap at t=12)
  out.leftBehindKeptX = +p.x.toFixed(1) === +leftX.toFixed(1);
  out.leftBehindStillRiding = g.world.subway.ride.phase !== 'idle';
  batch(12); // to arrival (t=22) + retire (platform z < edge)
  batch(3); // departing (1.6 s) → idle with doors open
  out.leftBehindReleased = g.world.subway.ride.phase === 'idle'
    && g.world.subway.doorsOpen === true;


  // 9. climb out — the REAL walk: the pocket south of the fare line, through
  // the station's own stair opening, up the treads to the square. NO
  // mid-stair teleport: the shipped B-south-wall bug (a 291 m crossed-slot
  // wall sealing the opening) was invisible to the old teleporting leg, and
  // it is exactly the field report "ride to Times Square doesn't work".
  tp(-335.2, -3.1, 9.4, Math.PI);
  await sleep(400);
  await walkUntil(keyToward(false), () => p.y > -1.9, 25000); // the opening + first treads
  await walkUntil(keyToward(false), () => p.y > 0.05, 40000); // up to the surface
  await sleep(400);
  out.surfaceY = +p.y.toFixed(2);
  out.tsLit = g.world.subway.lit.has('tsSurface');

  // 10. the sync beat: once per day, on first entry — read the MACHINE
  // (syncedToday latches), not the 2.6 s breath window a slow box races
  await sleep(400);
  out.syncFired = g.world.timesSquare.syncedToday === true;
  // the Wow card (docs/51 B10) holds the hands at the wonder moment — the
  // paper froze the walker mid-stride ON PURPOSE. The probe puts it down
  // the way a player does: Stay = back to the square. (Found by this very
  // probe: the M121 walk after the sync stood still — frozen by the card.)
  // Poll for the card: at the sandbox's ~2 fps the trigger's own frame can
  // land a second after the surface step (the old mid-stair teleport leg
  // changed this leg's wall timing — the card raced the check).
  const wowT0 = Date.now();
  while (Date.now() - wowT0 < 20000 && g.ui.postcardPanel.hidden) await sleep(400);
  out.wowCardUp = !g.ui.postcardPanel.hidden;
  if (out.wowCardUp) { g.ui.postcardStay.click(); await sleep(300); }
  out.wowDismissed = g.ui.postcardPanel.hidden && !g.player.frozen;

  // 11. the usher holds the Orpheum door; the registry knows her
  tp(-352.3, 0.1, 6.4);
  await sleep(300);
  const nearUsher = g.registry.nearest(p, g.state, { state: g.state, game: g });
  out.usher = nearUsher ? nearUsher.id : null;

  // 12. the M121: settle, then walk south through the door gap
  // (the door rides the registry's BUS-04 bay at cx −32.15: the gap
  // x −28.2..−27.1, the step top 0.3, the floor 0.55 — docs/47).
  // The one-bay law (docs/47): the loop M121 parks on the bay and the
  // arrival shell RETIRES until it pulls out. The probe waits for the
  // bay like a player does — you board when the bus is there and the
  // shell is too — instead of racing the loop's circuit phase.
  tp(-27.65, 0.1, 4.6, Math.PI);
  await sleep(1100);
  const bayT0 = Date.now();
  // the exit walk's new (honest) length shifts the loop bus's circuit phase;
  // the wait rides the bus's own cycle, so give it two full circuit windows
  while (Date.now() - bayT0 < 120000 && g.world.arrivalBus.group.visible !== true) await sleep(250);
  out.bayShellVisible = g.world.arrivalBus.group.visible === true;
  // the walk keeps a position trace — if a box blocks the gap, the trace
  // says where the walk stopped (the kept diagnostic, probe forensics law)
  const busWalkTrace = [];
  await walkUntil(keyToward(false), () => {
    busWalkTrace.push(`f=${g.player.frozen} y=${+p.y.toFixed(2)} z=${+p.z.toFixed(2)}`);
    return p.z < 3.4;
  }, 20000);
  out.busWalk = busWalkTrace.filter((_, i) => i % 10 === 0);
  await sleep(300);
  out.busFloorY = +p.y.toFixed(2);
  out.inBus = p.z < 3.4 && p.y > 0.4;

  // 13. ride home the same way
  tp(-329.1, -3.1, 15.3);
  await sleep(300);
  const nearB = g.registry.nearest(p, g.state, { state: g.state, game: g });
  if (nearB && nearB.id === 'trainB') {
    for (const e of nearB.perform({ state: g.state, game: g })) g.applyEffect(e);
  }
  batch(26);
  out.homeX = +p.x.toFixed(1);
  out.rideHome = g.world.subway.ride.at === 'A';

  // 14. THE STARVATION LAW (the field report "ride to Times Square doesn't
  // work"): the ride must land on the REAL frame loop — no batching. The
  // machine is fed TRUE elapsed time (Game.frame trueDt), so even at the
  // sandbox's ~2 fps the 22 s ride lands inside ~30 s wall. Starved by the
  // render clamp (the pre-fix regime) the same condition measured rate 0.185
  // and needed 110+ s — the player read the doors-shut crawl as broken.
  // First retire leg 13's leftover 'arrived' hold: step off the car band
  // like a player (z < the platform edge retires it), batch the 1.6 s
  // departure, THEN press — the law is idle → closing → … → arrived.
  tp(-41.1, -3.1, 12.6);
  batch(4);
  if (g.world.subway.ride.phase !== 'idle') batch(4);
  tp(-41.1, -3.1, 15.3);
  await sleep(400);
  const nearStarve = g.registry.nearest(p, g.state, { state: g.state, game: g });
  const starveT0 = Date.now();
  let starveCalls = 0;
  const origSub = g.world.subway.update.bind(g.world.subway);
  g.world.subway.update = (dt, feet, onBeat) => { starveCalls++; return origSub(dt, feet, onBeat); };
  if (nearStarve && nearStarve.id === 'trainA') {
    for (const e of nearStarve.perform({ state: g.state, game: g })) g.applyEffect(e);
  }
  out.starveStarted = g.world.subway.ride.phase !== 'idle';
  while (Date.now() - starveT0 < 45000 && g.world.subway.ride.phase !== 'arrived') await sleep(500);
  out.starveArrived = g.world.subway.ride.phase === 'arrived';
  out.starveWallS = +((Date.now() - starveT0) / 1000).toFixed(1);
  out.starveCalls = starveCalls;
  g.world.subway.update = origSub;
  return out;
});

console.log('OUT:', JSON.stringify(run, null, 1));
if (errors.length) console.log('ERRORS:', errors.slice(0, 4).join(' | '));

check(run.stairMidY < -0.2, `the first steps catch the walk (y ${run.stairMidY})`);
check(run.stairMidY2 < -0.5 && run.stairMidY2 > -2.7, `a mid-stair tread holds (y ${run.stairMidY2})`);
check(Math.abs(run.stairY - (-3.2)) < 0.25, `the stair descends to the platform (y ${run.stairY})`);
check(run.underground === true, 'the underground state flips on');
check(run.terminalHidden, 'the terminal lifts off (the dollhouse)');
check(run.yardStandalone, 'the yard roof survives the bake as a named mesh');
check(run.yardHidden, 'the dollhouse lifts the yard roof underground');
check(run.lensY > -1.9 + 9, `the underground boom lifts (cam y ${run.lensY})`);
check(run.wallClear > 0.15, `the platform lens clears the south wall (y ${run.wallClear} at z 7.7)`);
check(run.shadowHalfUnder === 18, `the underground shadow box shrinks (half ${run.shadowHalfUnder})`);
check(run.shadowSymmetric, 'the shrunk box stays symmetric on its lattice');
check(Math.abs(run.platformY - (-3.2)) < 0.05, `the platform floor holds (y ${run.platformY})`);
check(run.stationLit === true, 'station A lights its zone');
check(run.priya === true, 'Priya stands her post at the fare bank');
check(run.walkInAboard === true, `the walk-in reaches the aisle (z ${run.walkInZ})`);
check(Math.abs(run.walkInY - (-3.2)) < 0.15, `the car floor holds the walk-in (y ${run.walkInY})`);
check(run.ridePrompt === 'trainA', 'the ride spot prompts (trainA)');
check(run.roofOnAtPlatform === true, 'the car reads as a train from the platform (roof on)');
check(run.boarded === true, 'boarding closes the doors');
check(run.roofOffAboard === true, 'the aboard lens sees into the car (roof off)');
check(run.seamCamJump > 250, `the seam snaps the camera with the player (${run.seamCamJump} m)`);
check(run.atB === true, 'the seam lands the player at 42nd St');
check(run.swappedX < -320, `the swap translated the player (x ${run.swappedX})`);
check(run.doorsOpenAtB === true, 'the doors reopen on arrival');
check(run.starveArrived === true && run.starveStarted === true, `THE STARVATION LAW: the ride lands on the real loop (${run.starveWallS} s wall, ${run.starveCalls} frames — the field report's broken regime needed 110+)`);
check(run.aboardLensY < run.aboardFocusY + 8, `the aboard lens keeps the car scale (cam y ${run.aboardLensY} vs focus ${run.aboardFocusY})`);
check(run.leftBehindStarted === true, 'a left-behind player still starts the machine');
check(run.leftBehindKeptX === true, 'the seam does NOT teleport a player on the platform');
check(run.leftBehindStillRiding === true, 'the ride continues without the stowaway');
check(run.leftBehindReleased === true, 'the arrival releases them: idle, doors open');
check(run.busker === true, 'the busker plays the 42nd St platform');
check(run.diagramMeshes === 8, `the chalk strokes built in both cars (${run.diagramMeshes})`);
check(run.diagramUpAtBeat === true, 'the teach beat draws the diagram (priya-lines)');
check(run.diagramDownAtRest === true, 'the chalk rides only its ride (fresh car at rest)');
check(run.retired === true, 'stepping off retires the ride');
check(Math.abs(run.surfaceY - 0.1) < 0.25, `the exit stair climbs to the square (y ${run.surfaceY})`);
check(run.tsLit === true, 'Times Square lights its zone');
check(run.syncFired, 'the sync beat breathes the screens (once a day)');
check(run.wowCardUp === true, 'the Wow card holds the hands at the sync');
check(run.wowDismissed === true, 'Stay puts the paper down and unwalks the freeze');
check(run.usher === 'usher', 'the usher holds the Orpheum door');
check(Math.abs(run.busFloorY - 0.55) < 0.06, `the M121 floor holds (y ${run.busFloorY})`);
check(run.inBus, 'the bus interior is enterable');
check(run.rideHome === true, 'the ride home lands at Alder Heights');
check(errors.length === 0, `console stays clean (${errors.length} errors)`);

await page.screenshot({ path: 'shots/subway-probe-final.png' });
await browser.close();
server.close();

const fails = results.filter((r) => !r.ok);
console.log(fails.length === 0 ? 'PROBE SUBWAY: ALL PASS' : `PROBE SUBWAY: ${fails.length} FAIL`);
process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
