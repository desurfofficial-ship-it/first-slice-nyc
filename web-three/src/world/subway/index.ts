/**
 * The K-line subway system — Alder Heights ⇄ 42 St–Times Square ⇄ the
 * Larch Yards.
 *
 * Wires the parameterized stations, the parked trains, the tunnel, and the
 * ride machine (ride.ts) into one world-facing object. The visibility law
 * is zone.ts: far-district content lights only inside its zone (the street
 * ring would otherwise keep every tunnel wall lit forever).
 *
 * World.ts calls `buildSubwaySystem` once, owns the returned groups, and
 * forwards `update(dt, feet, onBeat)` from its dynamics step. Game.ts maps
 * beat keys to note text (content.ts) and sound cues. Nothing here touches
 * the save, the step machine, or money.
 */

import * as THREE from 'three';
import { loadRegistry } from '../../sim/registry';
import { updateZones, type ZoneDef } from './zone';
import {
  aboardCar, beginRide, createRide, endRide, RIDE_SWAP_DX, RIDE_SWAP_DX_E, swapFeet, tickRide,
  type RideEnd, type RideState,
} from './ride';
import {
  buildStair, buildStation, STATION, STAIR_SLOT, turnstileHubAt, ZONE_KEEP_RE,
  type ColliderSpec, type KitCtx,
} from './stationKit';
import { buildTrainPair, buildTunnel } from './trainKit';

export { STAIR_SLOT, STATION, RIDE_SWAP_DX, ZONE_KEEP_RE, aboardCar };
export type { ColliderSpec };

const TRAIN_DOOR_A_X = -41.1; // the aligned car's interactive door, station A
const STAIR_A_CX = (STAIR_SLOT.minX + STAIR_SLOT.maxX) / 2; // −47.2
const STAIR_B_CX = STAIR_A_CX + RIDE_SWAP_DX;              // −332.6
export interface SubwayAnchors {
  /** Inside the aligned car at each station — the "press to ride" spot. */
  rideSpotA: { x: number; y: number; z: number };
  rideSpotB: { x: number; y: number; z: number };
  priya: { x: number; y: number; z: number };
  busker: { x: number; y: number; z: number };
  stairA: { x: number; y: number; z: number };
  stairB: { x: number; y: number; z: number };
}

export interface SubwaySystem {
  groups: {
    stationA: THREE.Group;
    stationB: THREE.Group;
    stationC: THREE.Group;
    trainA: THREE.Group;
    trainB: THREE.Group;
    trainC: THREE.Group;
    tunnel: THREE.Group;
    scenery: THREE.Group;
  };
  zones: readonly ZoneDef[];
  lit: Set<string>;
  anchors: SubwayAnchors;
  ride: RideState;
  /** Are the interactive doors currently open? (drives interaction enable) */
  doorsOpen: boolean;
  /** True while the player is below grade (the dollhouse key). */
  underground: boolean;
  /** The seam's camera debt (metres on x, signed). The swap translates the
   *  player ±288 m in one frame; the boom must inherit the SAME jump or it
   *  lerps 288 m through the tunnel wall (~1.3 s of whoosh, playtest:
   *  "camera freaks out when the train moves"). Game.frame adds this to
   *  cam.camera.position.x once and zeroes it — the framing is preserved
   *  bit-exact, the seam stays invisible. */
  seamDx: number;
  requestRide(from: RideEnd, route?: 'W' | 'E'): boolean;
  /** `dt` is the TRUE frame delta (capped 1 s), forwarded by
   *  World.updateAmbient's `trueDt` — NOT the render-clamped dt. The ride
   *  is a wall-clock experience (22 s of doors-closed tunnel; the teach
   *  beats land in real seconds): fed the clamped dt, any device under
   *  10 fps stretched it 5×+ and the player read "the ride doesn't work".
   *  The machine is pure thresholds, so true elapsed time is safe. */
  update(dt: number, feet: { x: number; y: number; z: number }, onBeat: (key: string) => void): void;
}

export function buildSubwaySystem(
  parent: THREE.Group,
  M: KitCtx['M'],
  pushCollider: (c: ColliderSpec) => void,
  removeCollider: (c: ColliderSpec) => void,
): SubwaySystem {
  const groups = {
    stationA: new THREE.Group(),
    stationB: new THREE.Group(),
    stationC: new THREE.Group(),
    trainA: new THREE.Group(),
    trainB: new THREE.Group(),
    trainC: new THREE.Group(),
    tunnel: new THREE.Group(),
    scenery: new THREE.Group(),
  };
  for (const [k, g] of Object.entries(groups)) {
    g.name = `SUB_Group_${k}`;
    parent.add(g);
  }

  // static colliders: stations/stairs/tunnel/trains are solid whether the
  // zone lights them or not (a hidden train is still a train)
  const cols: ColliderSpec[] = [];
  const ctx = (g: THREE.Group): KitCtx => ({
    g,
    M,
    col: (c) => cols.push(c),
  });

  const stationA = buildStation(ctx(groups.stationA), {
    cx: -44, name: 'ALDER HTS', accent: '#1f6e5c', ads: [0, 2], home: true, slotDx: 0,
  });
  // A-3 UNIT 10 (the far world, DEC-4 Option B standing ruling): station
  // B's cx READS its registry row (SUB-TS) — the row IS the station's
  // transcription (x −332 = STATION_B_X, w 16.6 = the kit's halfW×2 + 0.3
  // walls). The kit's interior constants (halfW, the z band, the platform)
  // are the kit's style; the row anchors the placement. ride.ts's
  // STATION_B_X stays the sim-side ride constant (a pure module, its math
  // test-pinned) and is pinned EQUAL to this row by the A-3 acceptance
  // suite — a diverge fails loudly there, the no-double-truth law at the
  // data boundary.
  const subTs = loadRegistry().allBuildings().find((b) => b.id === 'SUB-TS');
  if (!subTs || !subTs.footprint) {
    throw new Error('[A-3] registry building "SUB-TS" has no footprint — the flip never invents geometry');
  }
  if (subTs.status === 'planned') {
    throw new Error('[A-3] registry building "SUB-TS" is still \'planned\' — the flip never renders an unbuilt row (DEC-4 §5)');
  }
  const stationB = buildStation(ctx(groups.stationB), {
    cx: subTs.footprint.x, name: '42 ST-TIMES SQ', accent: '#6D4C7D', ads: [1, 2, 0], home: false,
    slotDx: RIDE_SWAP_DX, // B's own stair slot — the south-wall opening brackets it
  });
  // A-3 UNIT 10 (W-C6): station C's cx READS its registry row (SUB-03) —
  // the same transcription law as B's SUB-TS read one block up. The row IS
  // the station's transcription (x 164 = STATION_C_X, pinned equal by the
  // A-3 acceptance suite; the underground platform band rides the row
  // SUB-03-PLAT — the kit's own geometry, priced).
  const sub03 = loadRegistry().allBuildings().find((b) => b.id === 'SUB-03');
  if (!sub03 || !sub03.footprint) {
    throw new Error('[A-3] registry building "SUB-03" has no footprint — the flip never invents geometry');
  }
  if (sub03.status === 'planned') {
    throw new Error('[A-3] registry building "SUB-03" is still \'planned\' — the flip never renders an unbuilt row (DEC-4 §5)');
  }
  const STAIR_C_CX = sub03.footprint.x; // the shaft rides the headhouse's axis (the SUB-01 housing law)
  const stationC = buildStation(ctx(groups.stationC), {
    cx: sub03.footprint.x, name: 'LARCH YARDS', accent: '#B8860B', ads: [2, 1, 0], home: false,
    slotDx: STAIR_C_CX - STAIR_A_CX, // C's own stair slot — under the headhouse
    tag: 'C',
  });
  // the fare banks' live parts (docs/50 §4.6): a pass through a gate
  // spins that hub a third-turn and clicks — the arms earn their dressing
  const hubs = { a: stationA.turnstileHubs, b: stationB.turnstileHubs, c: stationC.turnstileHubs };
  const spinT = { a: [0, 0], b: [0, 0], c: [0, 0] };
  const prevFareZ = { a: 0, b: 0, c: 0 };
  buildStair(ctx(groups.stationA), STAIR_A_CX);
  buildStair(ctx(groups.stationB), STAIR_B_CX);
  buildStair(ctx(groups.stationC), STAIR_C_CX, 'C'); // the shaft inside SUB-03's housing

  // The parked pairs: A's aligned car is the TRANSFER car (W-C6) — its east
  // door is the westbound ride, its west door the eastbound hop (the two
  // doors stand 6.2 m apart inside one car, the boarding law's own pins).
  // B and C each carry one interactive door (the ride home).
  const doorA = buildTrainPair(ctx(groups.trainA), -44.2, [TRAIN_DOOR_A_X - (-44.2), -(TRAIN_DOOR_A_X - (-44.2))]);
  const doorB = buildTrainPair(ctx(groups.trainB), -44.2 + RIDE_SWAP_DX, [TRAIN_DOOR_A_X - (-44.2)]);
  const doorC = buildTrainPair(ctx(groups.trainC), -44.2 + RIDE_SWAP_DX_E, [TRAIN_DOOR_A_X - (-44.2)]);
  buildTunnel(ctx(groups.tunnel), groups.scenery);
  // the aligned cars' ride shells — roof + platform-side face stand down
  // while the rider is aboard so the dollhouse lens reads the car as the
  // open room it is (trainKit TrainDoors.roof / .southFace); from the
  // platform the shell returns and the pair reads as a train again
  const carShells = [
    [doorA.roof, ...doorA.southFace],
    [doorB.roof, ...doorB.southFace],
    [doorC.roof, ...doorC.southFace],
  ];

  // Priya's window diagram (docs/51 B11): the chalk strokes the 'priya-lines'
  // beat reveals. Collected by name from every aligned car — the twins carry
  // identical copies so the swap seam never shows the trick (W's twins: A/B;
  // E's twins: A/C — the transfer car rides both routes). Toggle-only writes
  // → they ride ZONE_KEEP_RE (the bake would detach them and the teach would
  // draw nothing, forever).
  const diagram: THREE.Mesh[] = [];
  for (const tg of [groups.trainA, groups.trainB, groups.trainC]) {
    tg.traverse((o) => { if (o.name.startsWith('SUB_Diagram_')) diagram.push(o as THREE.Mesh); });
  }
  let diagramUp = false;
  const setDiagram = (on: boolean) => {
    if (diagramUp === on) return;
    diagramUp = on;
    for (const m of diagram) m.visible = on;
  };

  for (const c of cols) pushCollider(c);

  const zones: readonly ZoneDef[] = [
    // stations light BELOW GRADE only (the census probe caught the whole
    // station riding the home rigs' draw calls when the spawn plaza sat
    // inside a loose surface box) — plus a thin stair-mouth zone so the
    // descent reads lit from the first step
    { name: 'stationA', minX: -52.5, maxX: -35.5, minZ: 7.5, maxZ: 20.5, maxFeetY: -0.4, slack: 1 },
    { name: 'stairA', minX: -48.8, maxX: -45.6, minZ: 3.6, maxZ: 8.2, maxFeetY: 0.2, slack: 0.4 },
    { name: 'stationB', minX: -340.5, maxX: -323.5, minZ: 7.5, maxZ: 20.5, maxFeetY: -0.4, slack: 1 },
    { name: 'stairB', minX: -336.8, maxX: -333.6, minZ: 3.6, maxZ: 8.2, maxFeetY: 0.2, slack: 0.4 },
    { name: 'stationC', minX: 155.5, maxX: 172.5, minZ: 7.5, maxZ: 20.5, maxFeetY: -0.4, slack: 1 },
    { name: 'stairC', minX: 162.4, maxX: 165.6, minZ: 3.6, maxZ: 8.2, maxFeetY: 0.2, slack: 0.4 },
    { name: 'tunnel', minX: -352, maxX: 190, minZ: 12, maxZ: 20, maxFeetY: 0, slack: 0,
      linkedTo: ['stationA', 'stationB', 'stationC', 'stairA', 'stairB', 'stairC'] },
    { name: 'trainA', minX: -54, maxX: -22, minZ: 12, maxZ: 20, maxFeetY: -0.4, slack: 1,
      linkedTo: ['stationA', 'stairA'] },
    { name: 'trainB', minX: -342, maxX: -310, minZ: 12, maxZ: 20, maxFeetY: -0.4, slack: 1,
      linkedTo: ['stationB', 'stairB'] },
    { name: 'trainC', minX: 152, maxX: 184, minZ: 12, maxZ: 20, maxFeetY: -0.4, slack: 1,
      linkedTo: ['stationC', 'stairC'] },
    // Times Square surface — its own zone, generous slack so the canyon
    // doesn't pop in at the street corner
    { name: 'tsSurface', minX: -420, maxX: -280, minZ: -32, maxZ: 32, minFeetY: -0.45, slack: 6 },
    // W-C1: Catalpa Junction (the second district's first priced slice,
    // DEC-13). The district sits west of Times Square (x −450..−378) and
    // lights like the tsSurface law: surface zone for the docks walk,
    // below-grade zone for the CJN-SUB platform stub (the stations' own
    // maxFeetY law). The player cannot walk there yet — the ride stays
    // A↔B; the probe teleports in to price the district's own census.
    { name: 'catalpaSurface', minX: -450, maxX: -378, minZ: -56, maxZ: 52, minFeetY: -0.45, slack: 6 },
    { name: 'catalpaPlatform', minX: -418, maxX: -402, minZ: 6, maxZ: 26, maxFeetY: -0.4, slack: 1 },
  ];

  const lit = new Set<string>();
  const anchors: SubwayAnchors = {
    rideSpotA: { x: TRAIN_DOOR_A_X, y: STATION.floorTop, z: STATION.trackZ - 0.55 },
    rideSpotB: { x: TRAIN_DOOR_A_X + RIDE_SWAP_DX, y: STATION.floorTop, z: STATION.trackZ - 0.55 },
    priya: { x: -40.2, y: STATION.floorTop, z: 9.4 },
    busker: { x: -335.4, y: STATION.floorTop, z: 12.6 },
    stairA: { x: STAIR_A_CX, y: 0.1, z: 4.3 },
    stairB: { x: STAIR_B_CX, y: 0.1, z: 4.3 },
  };

  // door leaf animation state (0 shut .. 1 open) per interactive door:
  // A's transfer car carries TWO (a0 east = westbound, a1 west = eastbound),
  // B and C one each. Door colliders live in the world's array only while
  // shut.
  const doorUnits = [
    ...doorA.doors.map((d, i) => ({ key: `a${i}` as const, doors: d, at: 'A' as RideEnd })),
    { key: 'b0' as const, doors: doorB.doors[0], at: 'B' as RideEnd },
    { key: 'c0' as const, doors: doorC.doors[0], at: 'C' as RideEnd },
  ];
  const openT = new Map<string, number>(doorUnits.map((u) => [u.key, u.at === 'A' ? 1 : 0]));
  const doorIn = new Map<string, boolean>(doorUnits.map((u) => [u.key, false]));

  const sys: SubwaySystem = {
    groups, zones, lit, anchors,
    ride: createRide(),
    doorsOpen: true,
    underground: false,
    seamDx: 0,

    requestRide(from, route = 'W') {
      const events = beginRide(sys.ride, from, route);
      if (events.length > 0) sys.doorsOpen = false; // the doors-close event
      return events.length > 0;
    },

    update(dt, feet, onBeat) {
      // ---- ride machine ----
      for (const e of tickRide(sys.ride, dt)) {
        if (e.type === 'doors') {
          sys.doorsOpen = e.open === true;
        } else if (e.type === 'note') {
          if (e.beat === 'priya-lines') setDiagram(true); // the teach draws itself
          onBeat(e.beat!);
        } else if (e.type === 'swap') {
          // the seam: translate the player to the identical car — feet keep
          // their local offset around the door (the cars are the same car).
          // Aboard only: a player who stepped back onto the platform during
          // closing stays behind (the ride continues; the arrival's
          // doors-open event sets them free — no blind teleport on foot).
          if (aboardCar(feet.z)) {
            const route = sys.ride.route;
            // the FROM end: the route's own origin (W flips A↔B, E flips A↔C)
            const from: RideEnd = e.end === 'A' ? (route === 'E' ? 'C' : 'B') : 'A';
            feet.x = swapFeet(feet.x, from, route);
            // the camera inherits the same jump (see seamDx on the interface)
            const dx = route === 'E' ? RIDE_SWAP_DX_E : RIDE_SWAP_DX;
            sys.seamDx += from === 'A' ? dx : -dx;
          }
        }
        // 'arrived' carries no world work — the doors event said it all
      }
      // the next train on the loop is a fresh car: the chalk rides only the
      // ride it was drawn on (idle is the rest state after 'departing')
      if (sys.ride.phase === 'idle') setDiagram(false);
      // stepping off the destination platform retires the ride; the doors
      // close behind (a departing train, honestly)
      if (sys.ride.phase === 'arrived' && feet.z < STATION.zPlatformEdge - 0.3) {
        endRide(sys.ride);
      }

      // ---- door visuals (lerped) + colliders (identity-toggled) ----
      for (const u of doorUnits) {
        const want = sys.doorsOpen && sys.ride.at === u.at ? 1 : 0;
        const t0 = openT.get(u.key)!;
        const t1 = t0 + (want - t0) * Math.min(1, dt * 4);
        openT.set(u.key, t1);
        const [l1, l2] = u.doors.leaves;
        l1.position.x = u.doors.closedX[0] - t1 * 0.68;
        l2.position.x = u.doors.closedX[1] + t1 * 0.68;
        const shut = t1 < 0.5;
        const wasIn = doorIn.get(u.key)!;
        if (shut && !wasIn) {
          doorIn.set(u.key, true);
          pushCollider(u.doors.collider);
        } else if (!shut && wasIn) {
          doorIn.set(u.key, false);
          removeCollider(u.doors.collider);
        }
      }

      // ---- tunnel scroll + sway while riding ----
      if (sys.ride.phase === 'riding') {
        // the wall scenery streams OPPOSITE the travel direction past the
        // north windows: a westbound ride streams it east (+x), an eastbound
        // ride streams it west (−x). W: A→B is westbound; E: A→C eastbound.
        const eastbound = sys.ride.route === 'E'
          ? sys.ride.at === 'A'
          : sys.ride.at === 'B';
        groups.scenery.position.x += (eastbound ? -1 : 1) * 12 * dt;
        const g = sys.ride.at === 'A' ? groups.trainA
          : sys.ride.at === 'B' ? groups.trainB : groups.trainC;
        g.rotation.z = Math.sin(sys.ride.t * 1.7) * 0.012;
        g.position.y = Math.sin(sys.ride.t * 2.3) * 0.02;
      } else {
        for (const tg of [groups.trainA, groups.trainB, groups.trainC]) {
          tg.rotation.z = 0;
          tg.position.y = 0;
        }
        if (sys.ride.phase === 'idle') {
          // normalize the scroll: strips are periodic every 7 m (ribs every
          // 14), so folding the offset into one period is invisible at the
          // window and keeps the pattern near the stations
          groups.scenery.position.x %= 14;
        }
      }

      // ---- the fare banks: cross a gate and the turnstile spins ----
      // The station under the feet runs the check (the others are a ride
      // away); the pass fires once — a strict sign change of z through FARE_Z.
      const atA = feet.x > -60 && feet.x < -30;
      const atB = feet.x < -310 && feet.x > -355;
      const atC = feet.x > 145 && feet.x < 185;
      if (feet.y < -0.4 && (atA || atB || atC)) {
        const tag = atA ? 'a' : atB ? 'b' : 'c';
        const cx = atA ? -44 : atB ? -332 : 164;
        const hub = turnstileHubAt(prevFareZ[tag], feet.z, feet.x, cx);
        if (hub >= 0) {
          spinT[tag][hub] = 0.5;
          onBeat('turnstile');
        }
      }
      if (atA) prevFareZ.a = feet.z;
      if (atB) prevFareZ.b = feet.z;
      if (atC) prevFareZ.c = feet.z;
      for (const tag of ['a', 'b', 'c'] as const) {
        for (let h = 0; h < 2; h++) {
          if (spinT[tag][h] <= 0) continue;
          const dT = Math.min(dt, spinT[tag][h]); // this frame's spin time
          spinT[tag][h] = Math.max(0, spinT[tag][h] - dt);
          const dA = ((Math.PI * 2) / 3) * (dT / 0.5); // one arm-pass, 0.5 s
          for (const arm of hubs[tag][h]) arm.rotation.y += dA;
        }
      }

      // ---- zones + the dollhouse ----
      updateZones(zones, feet.x, feet.y, feet.z, lit);
      const under = feet.y < -0.6;
      sys.underground = under;
      groups.stationA.visible = lit.has('stationA');
      groups.stationB.visible = lit.has('stationB');
      groups.stationC.visible = lit.has('stationC');
      groups.tunnel.visible = lit.has('tunnel');
      groups.scenery.visible = groups.tunnel.visible;
      groups.trainA.visible = lit.has('trainA');
      groups.trainB.visible = lit.has('trainB');
      groups.trainC.visible = lit.has('trainC');
      stationA.ceiling.visible = !under;
      stationB.ceiling.visible = !under;
      stationC.ceiling.visible = !under;
      // the aboard car is the room: its shell (roof + platform-side face)
      // stands down for the dollhouse lens the same frames the station's
      // ceiling does (the group's own zone visibility gates the pair — only
      // the lit car renders)
      const aboard = aboardCar(feet.z);
      for (const shell of carShells) for (const m of shell) m.visible = !aboard;
    },
  };
  return sys;
}

/** Static interaction anchors (single source of truth — the world builds
 *  from these and the interaction registry reads them). rideEast is the
 *  transfer car's WEST door (W-C6): the eastbound hop's spot, 6.2 m from
 *  the westbound door. rideC is the Larch Yards' ride home. */
export const SUBWAY_SPOTS = {
  rideA: { x: TRAIN_DOOR_A_X, y: STATION.floorTop, z: STATION.trackZ - 0.55 },
  rideEast: { x: TRAIN_DOOR_A_X - 6.2, y: STATION.floorTop, z: STATION.trackZ - 0.55 },
  rideB: { x: TRAIN_DOOR_A_X + RIDE_SWAP_DX, y: STATION.floorTop, z: STATION.trackZ - 0.55 },
  rideC: { x: TRAIN_DOOR_A_X + RIDE_SWAP_DX_E, y: STATION.floorTop, z: STATION.trackZ - 0.55 },
  priya: { x: -40.2, y: STATION.floorTop, z: 9.4 },
  busker: { x: -335.4, y: STATION.floorTop, z: 12.6 },
} as const;

/** The eastbound door's x at the transfer car (the E-ride spot). */
export const RIDE_SPOT_EAST_X = TRAIN_DOOR_A_X - 6.2;
/** The station-C-aligned car's interactive door x (the C ride spot). */
export const RIDE_SPOT_C_X = TRAIN_DOOR_A_X + RIDE_SWAP_DX_E;
