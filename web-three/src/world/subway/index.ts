/**
 * The K-line subway system — Alder Heights ⇄ 42 St–Times Square.
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
import { updateZones, type ZoneDef } from './zone';
import {
  aboardCar, beginRide, createRide, endRide, RIDE_SWAP_DX, swapFeet, tickRide,
  type RideEnd, type RideState,
} from './ride';
import {
  buildStair, buildStation, STATION, STAIR_SLOT, turnstileHubAt, ZONE_KEEP_RE,
  type ColliderSpec, type KitCtx,
} from './stationKit';
import { buildTrainPair, buildTunnel } from './trainKit';

export { STAIR_SLOT, STATION, RIDE_SWAP_DX, ZONE_KEEP_RE };
export type { ColliderSpec };

const TRAIN_DOOR_A_X = -41.1; // the aligned car's interactive door, station A
const STAIR_A_CX = (STAIR_SLOT.minX + STAIR_SLOT.maxX) / 2; // −44.6
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
    trainA: THREE.Group;
    trainB: THREE.Group;
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
  requestRide(from: RideEnd): boolean;
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
    trainA: new THREE.Group(),
    trainB: new THREE.Group(),
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
    cx: -44, name: 'ALDER HTS', accent: '#1f6e5c', ads: [0, 2], home: true,
  });
  const stationB = buildStation(ctx(groups.stationB), {
    cx: -332, name: '42 ST-TIMES SQ', accent: '#6D4C7D', ads: [1, 2, 0], home: false,
  });
  // the fare banks' live parts (docs/50 §4.6): a pass through a gate
  // spins that hub a third-turn and clicks — the arms earn their dressing
  const hubs = { a: stationA.turnstileHubs, b: stationB.turnstileHubs };
  const spinT = { a: [0, 0], b: [0, 0] };
  const prevFareZ = { a: 0, b: 0 };
  buildStair(ctx(groups.stationA), STAIR_A_CX);
  buildStair(ctx(groups.stationB), STAIR_B_CX);

  const doorA = buildTrainPair(ctx(groups.trainA), -44.2, TRAIN_DOOR_A_X - (-44.2));
  const doorB = buildTrainPair(ctx(groups.trainB), -44.2 + RIDE_SWAP_DX, TRAIN_DOOR_A_X - (-44.2));
  buildTunnel(ctx(groups.tunnel), groups.scenery);

  // Priya's window diagram (docs/51 B11): the chalk strokes the 'priya-lines'
  // beat reveals. Collected by name from both aligned cars — the twins carry
  // identical copies so the swap seam (t 12, after the beat at t 8.5) never
  // shows the trick. Toggle-only writes → they ride ZONE_KEEP_RE (the bake
  // would detach them and the teach would draw nothing, forever).
  const diagram: THREE.Mesh[] = [];
  for (const tg of [groups.trainA, groups.trainB]) {
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
    { name: 'tunnel', minX: -352, maxX: -18, minZ: 12, maxZ: 20, maxFeetY: 0, slack: 0,
      linkedTo: ['stationA', 'stationB', 'stairA', 'stairB'] },
    { name: 'trainA', minX: -54, maxX: -22, minZ: 12, maxZ: 20, maxFeetY: -0.4, slack: 1,
      linkedTo: ['stationA', 'stairA'] },
    { name: 'trainB', minX: -342, maxX: -310, minZ: 12, maxZ: 20, maxFeetY: -0.4, slack: 1,
      linkedTo: ['stationB', 'stairB'] },
    // Times Square surface — its own zone, generous slack so the canyon
    // doesn't pop in at the street corner
    { name: 'tsSurface', minX: -420, maxX: -280, minZ: -32, maxZ: 32, minFeetY: -0.45, slack: 6 },
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

  // door leaf animation state (0 shut .. 1 open) per station's door
  const openT = { a: 1, b: 0 };
  // door colliders live in the world's array only while shut
  const doorIn = { a: false, b: false };

  const sys: SubwaySystem = {
    groups, zones, lit, anchors,
    ride: createRide(),
    doorsOpen: true,
    underground: false,

    requestRide(from) {
      const events = beginRide(sys.ride, from);
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
          // doors-open event sets them free — no 288 m teleport on foot).
          if (aboardCar(feet.z)) feet.x = swapFeet(feet.x, e.end === 'B' ? 'A' : 'B');
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
      const want = { a: 0, b: 0 };
      if (sys.doorsOpen) want[sys.ride.at === 'A' ? 'a' : 'b'] = 1;
      for (const key of ['a', 'b'] as const) {
        openT[key] += (want[key] - openT[key]) * Math.min(1, dt * 4);
        const doors = key === 'a' ? doorA : doorB;
        const [l1, l2] = doors.leaves;
        l1.position.x = doors.closedX[0] - openT[key] * 0.68;
        l2.position.x = doors.closedX[1] + openT[key] * 0.68;
        const shut = openT[key] < 0.5;
        if (shut && !doorIn[key]) {
          doorIn[key] = true;
          pushCollider(doors.collider);
        } else if (!shut && doorIn[key]) {
          doorIn[key] = false;
          removeCollider(doors.collider);
        }
      }

      // ---- tunnel scroll + sway while riding ----
      if (sys.ride.phase === 'riding') {
        // A→B is westbound: the wall scenery streams east (+x) past the
        // north windows; the ride home streams it back
        const dir = sys.ride.at === 'A' ? 1 : -1;
        groups.scenery.position.x += dir * 12 * dt;
        const g = sys.ride.at === 'A' ? groups.trainA : groups.trainB;
        g.rotation.z = Math.sin(sys.ride.t * 1.7) * 0.012;
        g.position.y = Math.sin(sys.ride.t * 2.3) * 0.02;
      } else {
        groups.trainA.rotation.z = 0;
        groups.trainB.rotation.z = 0;
        groups.trainA.position.y = 0;
        groups.trainB.position.y = 0;
        if (sys.ride.phase === 'idle') {
          // normalize the scroll: strips are periodic every 7 m (ribs every
          // 14), so folding the offset into one period is invisible at the
          // window and keeps the pattern near the stations
          groups.scenery.position.x %= 14;
        }
      }

      // ---- the fare banks: cross a gate and the turnstile spins ----
      // The station under the feet runs the check (the other is 288 m away);
      // the pass fires once — a strict sign change of z through FARE_Z.
      const atA = feet.x > -60 && feet.x < -30;
      const atB = feet.x < -310 && feet.x > -355;
      if (feet.y < -0.4 && (atA || atB)) {
        const tag = atA ? 'a' : 'b';
        const hub = turnstileHubAt(prevFareZ[tag], feet.z, feet.x, atA ? -44 : -332);
        if (hub >= 0) {
          spinT[tag][hub] = 0.5;
          onBeat('turnstile');
        }
      }
      if (atA) prevFareZ.a = feet.z;
      if (atB) prevFareZ.b = feet.z;
      for (const tag of ['a', 'b'] as const) {
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
      groups.tunnel.visible = lit.has('tunnel');
      groups.scenery.visible = groups.tunnel.visible;
      groups.trainA.visible = lit.has('trainA');
      groups.trainB.visible = lit.has('trainB');
      stationA.ceiling.visible = !under;
      stationB.ceiling.visible = !under;
    },
  };
  return sys;
}

/** The station-B-aligned car's interactive door x (the B ride spot). */
export const RIDE_SPOT_B_X = TRAIN_DOOR_A_X + RIDE_SWAP_DX;

/** Static interaction anchors (single source of truth — the world builds
 *  from these and the interaction registry reads them). */
export const SUBWAY_SPOTS = {
  rideA: { x: TRAIN_DOOR_A_X, y: STATION.floorTop, z: STATION.trackZ - 0.55 },
  rideB: { x: TRAIN_DOOR_A_X + RIDE_SWAP_DX, y: STATION.floorTop, z: STATION.trackZ - 0.55 },
  priya: { x: -40.2, y: STATION.floorTop, z: 9.4 },
  busker: { x: -335.4, y: STATION.floorTop, z: 12.6 },
} as const;
