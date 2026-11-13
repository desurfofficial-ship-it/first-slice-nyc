/**
 * The runtime-integration scenario — the Phase-1 playable proof
 * (?scenario=schedules).
 *
 * A controlled, auto-driven pass over the REAL game — the real Game
 * loop, the real valve, the real registry, the real storage — showing
 * the six required demonstrations on existing FIRST SLICE locations and
 * characters, at accelerated simulation time (no real-world waiting):
 *
 *   1. an NPC following a scheduled activity (Idris on the 7:40 platform)
 *   2. a schedule transition when in-game time advances (platform → the
 *      usual at the cart, walked across the shipped block)
 *   3. an interruption by a higher-priority activity (a player hello —
 *      fired through the REAL interaction registry — interrupts the
 *      NORMAL meal, R1/R6)
 *   4. correct behavior after the interruption ends (walking away
 *      releases the hello; the meal claim resumes off the LIFO stack, R3)
 *   5. persistent relationship/world-state change (warmth +4, a flag, a
 *      world event — recorded once per hello)
 *   6. correct restoration after saving and loading (the world save
 *      round-trips; interrupted saves, invalid data and repeated loads
 *      all degrade to valid worlds with notes — never a crash)
 *
 * plus the D-2 bonus: the clock flips the shipped dusk visuals and the
 * M4 street plan, and midnight keeps the world alive across days.
 *
 * Results stream to `window.__SCENARIO_REPORT__` as
 * `{ ok, steps: [{ name, ok, detail }], simMinutesRun, realSeconds }`.
 * The probe (`scripts/probe-world-sim.mjs`) asserts it; a human can
 * watch the same run play out on the street.
 */

import type { Game } from './Game';
import { isDriverAuthorizedNow } from './driverGate';

interface StepResult { name: string; ok: boolean; detail: string }

const IDRIS = 'npc:idris_warsame';
const HELLO_IDRIS = 'hello_idris_warsame';

export interface ScenarioReport {
  ok: boolean;
  steps: StepResult[];
  simMinutesRun: number;
  realSeconds: number;
  scenario: string;
}

/** Loose view of worldRuntime.debug() — the scenario asserts on shape,
 *  not on types; the runtime owns the strict type. */
interface NpcDbg {
  npcId: string; claim: string | null; kind: string; priority: number;
  placeId: string | null; bodyMode: string;
  pos: { x: number; z: number } | null;
  visible: boolean; inDialogue: boolean; stackDepth: number;
  routed?: boolean; routeLeft?: number; routesWalked?: number;
}
interface Dbg {
  day: number; time: string; tick: number; timeScale: number; active: boolean;
  phase: string; saveKey: string; events: number;
  flags: string[]; warmth: Record<string, number>;
  npcs: NpcDbg[];
}

function npc(dbg: Dbg, id: string): NpcDbg {
  return dbg.npcs.find((n) => n.npcId === id) ?? {
    npcId: id, claim: null, kind: '', priority: -1, placeId: null,
    bodyMode: 'away', pos: null, visible: false, inDialogue: false, stackDepth: 0,
  };
}

export async function runScenario(game: Game, params: URLSearchParams): Promise<void> {
  // R1 (FS-AUDIT-001) — defense in depth: same authorization wall as the
  // autotest. These drivers remove/rewrite the WORLD save key; in an
  // authorized session that key is the driver sandbox key
  // (first_slice_world_v1_driver), so a real player's world save stays
  // out of reach even here.
  if (!isDriverAuthorizedNow()) {
    console.warn('[driver] runScenario refused — debug drivers are gated in production builds (game/driverGate.ts)');
    return;
  }
  if (params.get('scenario') === 'nav') return runNavScenario(game, params);
  await runSchedulesScenario(game, params);
}

/** The Phase-3 navigation scenario (?scenario=nav) — the A-1/A-2 playable
 *  proof on the real game: the graph boots clean; Idris's commute is
 *  ROUTED (sidewalk → the canon crosswalk → sidewalk — never a straight
 *  line across the road); Rosa routes INTO the deli through its door
 *  during her published windows; the Cecil's room is locked to routes;
 *  walking through a door RECORDS the transition; every route crosses a
 *  facade only at a door corridor (the player's own collision law).
 *
 *  The worldclock affordance (the schedules scenario's own law, DEF-15's
 *  repair): the scenario reads ?worldclock= like ?scenario=schedules does —
 *  the probe's waitFor budgets are WALL-CLOCK budgets, and on a software-GL
 *  sandbox the graphics pipeline's frame cost engages the dt clamp, which
 *  dilates sim time (measured ~0.55 sim-min per real second at 120 on the
 *  QA sandbox). A heavier worldclock raises the sim pace under the same
 *  clamp — the schedules scenario's own worldclock=240 knob, the QA-2
 *  wall-budget precedent. The reference machine runs the default 120
 *  unchanged; slow machines pass the knob, the driver reads STATE. */
async function runNavScenario(game: Game, params: URLSearchParams): Promise<void> {
  const started = performance.now();
  const steps: StepResult[] = [];
  const sim = game.worldSim;
  let frameCount = 0;
  let frameTimeSum = 0;
  let lastFrame = performance.now();

  const step = (name: string, ok: boolean, detail: string): boolean => {
    steps.push({ name, ok, detail });
    // eslint-disable-next-line no-console
    console[ok ? 'info' : 'warn'](`[scenario] ${ok ? 'PASS' : 'FAIL'} — ${name}: ${detail}`);
    return ok;
  };
  const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
  const waitFor = async (probe: () => boolean, timeoutS: number): Promise<boolean> => {
    const deadline = performance.now() + timeoutS * 1000;
    while (performance.now() < deadline) {
      if (probe()) return true;
      await nextFrame();
    }
    return probe();
  };
  const tickFrames = () => {
    frameCount++;
    const now = performance.now();
    frameTimeSum += now - lastFrame;
    lastFrame = now;
  };

  try {
    // ---- setup: a controlled run owns its world -------------------------
    try { localStorage.removeItem(sim.debug().saveKey); } catch { /* fresh */ }
    const clockQ = Number(params.get('worldclock'));
    sim.brain.timeScale = Number.isFinite(clockQ) && clockQ > 0 ? clockQ : 120;
    const reload = sim.reloadFromSave();
    step('setup: fresh controlled world', reload.source === 'fresh', `source=${reload.source}`);
    if (!game.roam.active) game.toggleRoam();
    sim.setActive(true);

    // ---- 1. the graph boots clean ---------------------------------------
    const nav0 = sim.debug().nav;
    step('1: the registry-seeded graph boots clean',
      nav0.nodes > 300 && nav0.issues === 0 && nav0.components === 1,
      `nodes=${nav0.nodes} edges=${nav0.edges} issues=${nav0.issues} components=${nav0.components}`);

    // ---- 2. Rosa stands her shipped post — the deli door ----------------
    // (the shipped cast law: the resolver's place point is the door; the
    // routed interior entry is A-2's model, pinned headlessly, and lands
    // with the work packages that give customers interiors — WP-3v/WP-4)
    const rosaIn = await waitFor(() => {
      const r = npc(sim.debug(), 'npc:rosa_delgado');
      if (!r.visible || r.pos === null) return false;
      return Math.hypot(r.pos.x - -16, r.pos.z - 8.2) < 1.5;
    }, 30);
    const rosa = npc(sim.debug(), 'npc:rosa_delgado');
    step('2: Rosa stands her shipped post at the deli door (open since 06:00)', rosaIn,
      `pos=(${rosa.pos?.x.toFixed(1)},${rosa.pos?.z.toFixed(1)}) — the resolver's door point, the shipped stand law`);

    // ---- 3. the routed commute — follower on, crosswalk used ------------
    const walkingRouted = await waitFor(() => {
      const n = npc(sim.debug(), IDRIS);
      return n.claim === 'se-idris-walk-cart' && n.routed === true;
    }, 60);
    let crossedAtZebra = false;
    let lastSide = 1;
    const zebraWatch = waitFor(() => {
      tickFrames();
      const p = npc(sim.debug(), IDRIS).pos;
      if (p) {
        const side = p.z > 0 ? 1 : -1;
        if (lastSide > 0 && side < 0) {
          crossedAtZebra = Math.abs(p.x - -5) < 3.5;
        }
        lastSide = side;
      }
      return npc(sim.debug(), IDRIS).claim === 'se-idris-usual';
    }, 90);
    const atCart = await zebraWatch;
    const d2 = npc(sim.debug(), IDRIS);
    const p2 = d2.pos ?? { x: NaN, z: NaN };
    const nearCart = Math.hypot(p2.x - 4, p2.z + 6.6) < 3.5;
    step('3: the commute is routed and crosses at the canon zebra',
      walkingRouted && atCart && nearCart && crossedAtZebra && (d2.routesWalked ?? 0) > 0,
      `routedWalks=${d2.routesWalked} pos=(${p2.x.toFixed(1)},${p2.z.toFixed(1)}) nearCart=${nearCart} zebra=${crossedAtZebra}`);

    // ---- 4. the locked door refuses routes ------------------------------
    const locked = sim.nav.routeToPlace({ x: 9.4, z: -4 }, 'CECIL-ROOM', sim.debug().clock.minuteOfDay);
    step('4: the Cecil\u2019s room is locked to routes (canon privacy)',
      locked.route === null && locked.reason === 'PLACE_INACCESSIBLE',
      `reason=${locked.reason}`);

    // ---- 5. the door corridor is routed and gated (A-2 in the browser) --
    // the morning: the deli route EXISTS and its one door edge is the enter
    const openNow = sim.nav.routeToPlace({ x: -16, z: 2 }, 'BODEGA-INT', sim.debug().clock.minuteOfDay);
    const enterDoors = openNow.route ? sim.nav.routeDoors(openNow.route) : [];
    // the lull (14:00–17:00): the same ask is refused at the door
    const lull = sim.nav.routeToPlace({ x: -16, z: 2 }, 'BODEGA-INT', 15 * 60);
    step('5: the deli door is a routed, hour-gated corridor (A-2)',
      openNow.route !== null && enterDoors.length === 1 && enterDoors[0].direction === 'enter'
        && lull.route === null && lull.reason === 'PLACE_INACCESSIBLE',
      `open: enter via ${enterDoors.map((d) => d.doorId).join(',')}; 15:00 → ${lull.reason}`);

    // ---- 6. facades are crossed only at door corridors (the shared law) --
    // the same check the unit suite pins: a route from the street into the
    // deli samples the footprint ONLY on the door-corridor segment
    const inRoute = sim.nav.routeToPlace({ x: -16, z: 2 }, 'BODEGA-INT', 9 * 60);
    let cleanApproach = inRoute.route !== null;
    if (inRoute.route) {
      for (let i = 0; i < inRoute.route.points.length - 1; i++) {
        const na = sim.nav.graph.node(inRoute.route.nodeIds[i]);
        const nb = sim.nav.graph.node(inRoute.route.nodeIds[i + 1]);
        if (na && nb && (na.kind === 'lobby' || nb.kind === 'lobby')) continue; // the corridor
        const a = inRoute.route.points[i], b = inRoute.route.points[i + 1];
        const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5));
        for (let k = 0; k <= n; k++) {
          const t = k / n;
          const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
          if (x > -20.55 && x < -11.45 && z > 8.25 && z < 19.55) cleanApproach = false;
        }
      }
    }
    step('6: the facade is crossed only at the door corridor', cleanApproach,
      `route legs=${inRoute.route?.points.length ?? 0} (footprint sampled at 0.5 m)`);

    // ---- 7. exit works too (Rosa at close leaves through the same door) --
    const outRoute = sim.nav.routeTo({ x: -16, z: 14 }, { x: -16, z: 0 }, 9 * 60);
    const exitDoors = outRoute ? sim.nav.routeDoors(outRoute) : [];
    step('7: exiting reads the same door in reverse',
      outRoute !== null && exitDoors.some((x) => x.doorId === 'door:ROS-01' && x.direction === 'exit'),
      `exit doors=${JSON.stringify(exitDoors.map((x) => x.direction))}`);

    // ---- 8. no recalculation storm, and the block stays watchable -------
    // the navigation-specific guard: each body derives routes ONLY on
    // destination changes — a per-frame recalc storm would blow these
    // counts up. Frame time is REPORTED (SwiftShader software GL is not
    // the project's perf gate; probe-perf owns real numbers).
    const idrisWalks = npc(sim.debug(), IDRIS).routesWalked ?? 0;
    const rosaWalks = npc(sim.debug(), 'npc:rosa_delgado').routesWalked ?? 0;
    const avgFrame = frameCount > 0 ? frameTimeSum / frameCount : 999;
    step('8: routes derive on destination change only (no recalc storm)',
      idrisWalks <= 3 && rosaWalks <= 3,
      `Idris ${idrisWalks} route(s), Rosa ${rosaWalks} route(s); avg frame ${avgFrame.toFixed(1)} ms over ${frameCount} watched frames (SwiftShader software GL — reported, not gated)`);
  } catch (err) {
    step('scenario crashed', false, String(err));
  }

  const realSeconds = (performance.now() - started) / 1000;
  const report: ScenarioReport = {
    ok: steps.every((s) => s.ok),
    steps,
    simMinutesRun: sim.debug().tick - (sim.brain.clock.tick - steps.length * 0), // filled below
    realSeconds,
    scenario: 'nav',
  };
  report.simMinutesRun = sim.debug().tick % 1440;
  (window as unknown as { __SCENARIO_REPORT__: ScenarioReport }).__SCENARIO_REPORT__ = report;
  // eslint-disable-next-line no-console
  console[report.ok ? 'info' : 'error'](
    `[scenario] ${report.ok ? 'ALL PASS' : 'FAILURES'} — ${steps.filter((s) => s.ok).length}/${steps.length} in ${realSeconds.toFixed(1)}s real`);
}

/** The Phase-1 runtime-integration scenario (?scenario=schedules) — the
 *  six required demonstrations, byte-for-byte the shipped proof. */
async function runSchedulesScenario(game: Game, params: URLSearchParams): Promise<void> {
  const started = performance.now();
  const steps: StepResult[] = [];
  const sim = game.worldSim;
  let tickStart = 0;

  const step = (name: string, ok: boolean, detail: string): boolean => {
    steps.push({ name, ok, detail });
    // eslint-disable-next-line no-console
    console[ok ? 'info' : 'warn'](`[scenario] ${ok ? 'PASS' : 'FAIL'} — ${name}: ${detail}`);
    return ok;
  };

  const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
  const waitFor = async (probe: () => boolean, timeoutS: number): Promise<boolean> => {
    const deadline = performance.now() + timeoutS * 1000;
    while (performance.now() < deadline) {
      if (probe()) return true;
      await nextFrame();
    }
    return probe();
  };

  // ---- setup: a controlled run owns its world ---------------------------
  try {
    const clockQ = Number(params.get('worldclock'));
    const timeScale = Number.isFinite(clockQ) && clockQ > 0 ? clockQ : 120;
    try { localStorage.removeItem(sim.debug().saveKey); } catch { /* fresh */ }
    sim.brain.timeScale = timeScale;
    const reload = sim.reloadFromSave(); // fresh world at the runtime morning
    step('setup: fresh controlled world', reload.source === 'fresh',
      `source=${reload.source} notes=${JSON.stringify(reload.notes)}`);

    if (!game.roam.active) game.toggleRoam(); // the real switch — barrier, objective, the lot
    sim.setActive(true);
    step('setup: scenario mode active', sim.active && game.roam.active,
      `active=${sim.active} roam=${game.roam.active} timeScale=${timeScale}`);

    const dbg0 = sim.debug();
    tickStart = dbg0.tick;
    step('setup: the story is untouched', game.state.day === 1,
      `story day=${game.state.day} (GameState never moved by the sim)`);

    // ---- 1. a scheduled activity ----------------------------------------
    // Idris walks in at 07:22 and stands the platform window (07:22–07:52).
    const onPlatform = await waitFor(() => {
      const n = npc(sim.debug(), IDRIS);
      return n.visible === true && n.claim === 'se-idris-platform';
    }, 30);
    const d1 = npc(sim.debug(), IDRIS);
    step('1: NPC follows a scheduled activity', onPlatform && d1.kind === 'commute',
      `claim=${d1.claim} kind=${d1.kind} at=(${d1.pos?.x?.toFixed(1)},${d1.pos?.z?.toFixed(1)}) t=${dbg0.time}`);

    // ---- 2. the schedule transition (in-game time advances) --------------
    // 07:52: the platform window ends → travel to the cart → 08:24: the usual.
    const walking = await waitFor(() => npc(sim.debug(), IDRIS).claim === 'se-idris-walk-cart', 30);
    const atCart = await waitFor(() => npc(sim.debug(), IDRIS).claim === 'se-idris-usual', 60);
    const d2 = npc(sim.debug(), IDRIS);
    const p2 = d2.pos ?? { x: NaN, z: NaN };
    const nearCart = Math.hypot(p2.x - 4, p2.z + 6.6) < 3.5;
    step('2: schedule transition on the clock', walking && atCart && nearCart,
      `07:52→travel ok=${walking}; meal claim=${d2.claim} pos=(${p2.x.toFixed(1)},${p2.z.toFixed(1)}) nearCart=${nearCart}`);

    // ---- 3. the interruption (a HIGHER-priority activity) ----------------
    // The real path: the player walks up, the registry offers the hello,
    // one press fires it — a HIGH claim interrupts the NORMAL meal (R1/R6).
    const warmthBefore = warmthOf(sim.debug());
    const pI = d2.pos ?? { x: 4, z: -6.6 };
    game.player.capsule.x = pI.x + 1.2;
    game.player.capsule.y = 0.05;
    game.player.capsule.z = pI.z + 1.2;
    await nextFrame(); await nextFrame();
    const offered = await waitFor(() => {
      const it = game.registry.byId(HELLO_IDRIS);
      return it !== null && it.pos().y > -50; // presence parks it at y=-100 when away
    }, 10);
    const pressed = offered as boolean;
    if (pressed) (game as unknown as { tryInteract(): void }).tryInteract();
    await nextFrame();
    const d3 = npc(sim.debug(), IDRIS);
    const held = sim.brain.records.get(IDRIS);
    step('3: higher-priority interruption (hello = HIGH, R1/R6)', pressed && d3.claim === 'dialogue:player' && d3.inDialogue === true,
      `offered=${offered} claim=${d3.claim} priority=${d3.priority} suspended=${held?.stack.length ?? 0} to stack`);

    // ---- 4. after the interruption ends ----------------------------------
    // Walking away releases the hello; the meal resumes off the stack (R3).
    const px = game.player.capsule.x;
    const pz = game.player.capsule.z;
    game.player.capsule.x = px + 6; game.player.capsule.z = pz + 6;
    const resumed = await waitFor(() => npc(sim.debug(), IDRIS).claim === 'se-idris-usual', 20);
    const d4 = npc(sim.debug(), IDRIS);
    step('4: correct behavior after the interruption', resumed && d4.stackDepth === 0,
      `resumed claim=${d4.claim} stack=${d4.stackDepth} (meal still had ${sim.brain.schedules.get(IDRIS) ? 'window left' : '?'})`);

    // ---- 5. the persistent change ----------------------------------------
    const warmthAfter = warmthOf(sim.debug());
    const greeted = sim.debug().flags.includes('flag:idris_warsame_greeted');
    step('5: persistent relationship/world-state change', greeted && warmthAfter > warmthBefore,
      `warmth ${warmthBefore}→${warmthAfter} (+4 once) flag_set=${greeted} world_events=${sim.debug().events}`);

    // ---- 6. save / load (and its ugly cousins) ----------------------------
    sim.flushWorldSave();
    const docRaw = localStorage.getItem(sim.debug().saveKey) ?? '';
    let doc: Record<string, unknown> = {};
    try { doc = JSON.parse(docRaw) as Record<string, unknown>; } catch { /* asserted below */ }
    const docOk = (doc as { magic?: string }).magic === 'first-slice-world'
      && (doc as { clock?: { day: number; minuteOfDay: number } }).clock !== undefined
      && (doc as { version?: number }).version === 1;
    step('6a: save document rides its own key', docOk,
      `key=${sim.debug().saveKey} magic=${String((doc as { magic?: string }).magic)} v=${String((doc as { version?: number }).version)} clock=${JSON.stringify((doc as { clock?: unknown }).clock)}`);

    const timeBefore = sim.debug().time;
    const dayBefore = sim.debug().day;
    const warmthSaved = warmthAfter;

    // 6b: an INTERRUPTED save (truncated mid-write) degrades politely
    localStorage.setItem(sim.debug().saveKey, docRaw.slice(0, Math.max(10, Math.floor(docRaw.length * 0.6))));
    const interrupted = sim.reloadFromSave();
    const survived = interrupted.source === 'fresh' && interrupted.notes.length > 0
      && sim.debug().day === 1; // a fresh world, not a crash
    step('6b: interrupted (truncated) save → fresh world + notes', survived,
      `source=${interrupted.source} notes=${JSON.stringify(interrupted.notes)} day=${sim.debug().day}`);

    // 6c: the GOOD doc restores exactly
    localStorage.setItem(sim.debug().saveKey, docRaw);
    const restored = sim.reloadFromSave();
    const rDbg = sim.debug();
    step('6c: correct restoration after save/load',
      restored.source === 'restored' && rDbg.time === timeBefore && rDbg.day === dayBefore
      && Math.abs(warmthOf(rDbg) - warmthSaved) < 1e-9,
      `clock ${rDbg.day} ${rDbg.time} (was ${dayBefore} ${timeBefore}) warmth=${warmthOf(rDbg)}`);

    // 6d: INVALID data — wrong magic, future version, foreign world
    const cases: Array<[string, (d: Record<string, unknown>) => Record<string, unknown>]> = [
      ['wrong magic', (d) => ({ ...d, magic: 'not-ours' })],
      ['future version', (d) => ({ ...d, version: 99 })],
      ['foreign world', (d) => ({ ...d, worldId: 'elsewhere' })],
    ];
    const invalidOk: string[] = [];
    for (const [name, mutate] of cases) {
      localStorage.setItem(sim.debug().saveKey, JSON.stringify(mutate(doc)));
      const r = sim.reloadFromSave();
      if (r.source === 'fresh' && r.notes.length > 0) invalidOk.push(name);
      localStorage.setItem(sim.debug().saveKey, docRaw);
      sim.reloadFromSave();
    }
    step('6d: invalid data → fresh world each time, never a crash', invalidOk.length === cases.length,
      `${invalidOk.join(', ')} (${invalidOk.length}/${cases.length})`);

    // 6e: REPEATED loading is idempotent
    const a = sim.reloadFromSave();
    const dbgA = sim.debug();
    const b = sim.reloadFromSave();
    const dbgB = sim.debug();
    step('6e: repeated loading is idempotent',
      a.source === 'restored' && b.source === 'restored'
      && dbgA.time === dbgB.time && dbgA.day === dbgB.day && warmthOf(dbgA) === warmthOf(dbgB),
      `two loads → ${dbgA.day} ${dbgA.time} both times, warmth ${warmthOf(dbgA)}`);

    // 6f: the restored world keeps living — a schedule transition post-load
    sim.brain.timeScale = 3600; // the fast-forward crank (10s/hour → dusk)
    const duskOk = await waitFor(() => {
      const dbg = sim.debug();
      return dbg.time >= '19:00' || dbg.phase === 'dusk' || dbg.phase === 'night';
    }, 90);
    const duskState = (game as unknown as { worldDuskStarted: boolean }).worldDuskStarted;
    step('7: clock-keyed dusk (D-2: visuals + street plan re-keyed)', duskOk && duskState,
      `phase=${sim.debug().phase} at ${sim.debug().time} — duskStarted=${duskState} (street plan follows the same flag)`);

    // 6g: and after midnight the world wakes up again, on day 2
    const dayTwo = await waitFor(() => {
      const n = npc(sim.debug(), IDRIS);
      return sim.debug().day >= 2 && n.claim === 'se-idris-platform' && n.visible === true;
    }, 120);
    step('6g: multi-day continuity after load', dayTwo,
      `day=${sim.debug().day} ${sim.debug().time} — Idris back on the platform (${npc(sim.debug(), IDRIS).claim})`);
  } catch (err) {
    step('scenario crashed', false, String(err));
  }

  const realSeconds = (performance.now() - started) / 1000;
  const report: ScenarioReport = {
    ok: steps.every((s) => s.ok),
    steps,
    simMinutesRun: sim.debug().tick - tickStart,
    realSeconds,
    scenario: 'schedules',
  };
  (window as unknown as { __SCENARIO_REPORT__: ScenarioReport }).__SCENARIO_REPORT__ = report;
  // eslint-disable-next-line no-console
  console[report.ok ? 'info' : 'error'](
    `[scenario] ${report.ok ? 'ALL PASS' : 'FAILURES'} — ${steps.filter((s) => s.ok).length}/${steps.length} in ${realSeconds.toFixed(1)}s real`);
}

function warmthOf(dbg: Dbg): number {
  const rel = Object.entries(dbg.warmth)
    .find(([k]) => k.includes('leo_marsh') && k.includes('idris_warsame'));
  return rel ? rel[1] : NaN;
}
