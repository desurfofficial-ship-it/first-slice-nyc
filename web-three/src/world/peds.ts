/**
 * Ambient pedestrians — the block's background life, walking their own
 * errands. Playtest evidence (2026-10-30): the street had pigeons, a
 * squirrel, and zero people on the sidewalks — a New York block where nobody
 * walks reads as dead, and that is an NPC-believability problem (Doc 33
 * "living neighborhood"), not a missions problem.
 *
 * Yuka (MIT, zero-dependency, engine-agnostic) supplies the steering stack:
 * FollowPathBehavior keeps each walker on their sidewalk loop,
 * ObstacleAvoidanceBehavior weaves them around the cart, the parked cars,
 * the street furniture AND the player, and SeparationBehavior keeps them
 * from stacking. The library is scoped strictly to ambient walkers — the
 * named cast (Rosa, Idris, the kid, Sal, the stranger) stays authored
 * tween choreography, because their moves are story beats, not emergent
 * behaviour.
 *
 * SOLIDITY (agent-2 collision pass, doc 35): steering asks, physics resolves.
 * On top of Yuka's forces, every frame now ends with three hard guarantees —
 *   1. walkers never overlap each other (pairwise half-pushes, capped),
 *   2. a walker never overlaps YOU (you are king; the walker yields),
 *   3. a walker never overlaps the cab's footprint (shortest-exit push),
 * and every walker carries a real AABB in World.colliders, so the player's
 * capsule is stopped by them exactly like by Rosa or the cart. The band
 * clamp (x ±47.2, z ±7.5) is the block's invisible bounds for bodies that
 * have no wall collision of their own. None of this overrides Yuka's
 * authored routes: a pushed walker's FollowPathBehavior steers it back the
 * moment the obstacle clears — slow, wait, edge around, resume.
 *
 * Identity rules (Doc 04): the walkers are built from the same articulated
 * person rig as the cast — shared palette bank materials, no new assets,
 * nothing procedurally "generated". They keep to the sidewalk paving and
 * cross only at the crosswalk (the pigeons' rule — nobody jaywalks into the
 * cab's lane; the cab already brakes for bodies in its path via World's
 * yield logic, so a crossing walker holds the cab at the stop line, exactly
 * like a real block).
 *
 * Determinism: seeded placement (same seed → same three walkers, same
 * starts) so the E2E driver and every player meet the same street life.
 * All motion is frame-rate independent (dt in seconds, clamped upstream).
 */

import * as THREE from 'three';
import {
  EntityManager, Vehicle, Path, FollowPathBehavior,
  ObstacleAvoidanceBehavior, SeparationBehavior, GameEntity, Vector3,
} from 'yuka';
import { buildArticulatedPerson, updatePersonAnim, type PersonLook } from './personRig';
import { seededRng } from './ambient';
import {
  resolveCirclesXZ, pushCircleOutOfRectXZ, type AABB, type CirclePush,
} from '../engine/collide';

/** Walkers wear the same look schema as the cast — scale/shoe included. */
export interface PedLook extends PersonLook {}

/** Lane discipline: y 0 on a road, y 0.1 on a walk slab. W4 generalizes the
 *  shipped |z| > 4.15 rule with the district's five road rectangles (the
 *  old constant missed the new streets and would float every district
 *  walker half a step above Kestrel's asphalt). */
function groundY(x: number, z: number, roads: readonly RoadRect[]): number {
  for (const r of roads) {
    if (x >= r.xMin && x <= r.xMax && z >= r.zMin && z <= r.zMax) return 0;
  }
  return 0.1;
}

/** W4: a road surface rectangle — walkers stand at y 0 inside one, y 0.1
 *  (the walk slab) anywhere else. The district's five roads, registry spec.
 *  (The shipped ±47.2/±7.5 band clamp retired: every walker now clamps to
 *  their own loop's bbox — see bandOfLoop — which for the Kestrel trio
 *  reproduces the ±7.5 z-discipline exactly, and lets the district loops
 *  keep their own ground.) */
export interface RoadRect { xMin: number; xMax: number; zMin: number; zMax: number }
const PED_R = 0.3;        // a walker's physical half-width
const PED_REACH = 0.28 * Math.SQRT2; // walk-collider CORNER reach — on the
// diagonal a box touches at center-distance halfDiag, not halfWidth; the
// player separation must clear the corner or depenetrate shoves the PLAYER
// as a walker weaves past (the E2E caught a +1 m shove up a sidewalk)
const PLAYER_R = 0.35;    // matches the player capsule exactly
const MAX_PUSH = 0.25;    // per-frame cap — nobody slingshots, ever

/**
 * Overtake bias (doc 36 §8 handover, integrated): a walker we have caught
 * FROM BEHIND — velocity aligned with the push, i.e. both heading the same
 * way — must clear the lane immediately. The yield push alone can never
 * unlock that pair: it pushes the walker along the player's own motion, so
 * walker-forward and player-forward balance into a grind (the E2E's
 * "follows at their pace instead of overtaking" serve-budget killer).
 * The step-out direction is deterministic: toward the curb (z → 0), never
 * toward the building line, so benches/trees at z ±7.5 can't become a new
 * pocket. Pure so the choice is unit-testable.
 *
 * @param perpZ  z-component of the unit perpendicular to the player→walker line
 * @param walkerZ the held walker's z
 * @returns -1 | +1 — the slideSide whose perpendicular motion heads for the road
 */
/** W4: a walker's own clamp band — the bbox of its loop, inflated 1.6 m
 *  laterally (curb-yield room) and 0.65 m in z, then held inside the
 *  playable core (x ±84; the shipped ±7.5 z-discipline). Per-walker on
 *  purpose: a district walker pushed off Gable can never be clamped into
 *  Juniper — the pre-W4 bug clamped every zone to the block's band, so
 *  off-block walkers teleported to the home street's corner every frame
 *  and parked their invisible colliders there as permanent ghosts. Pure
 *  so the law is unit-testable (tests/crowd.test.ts). */
export function bandOfLoop(
  pts: Array<[number, number]>,
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [px, pz] of pts) {
    if (px < minX) minX = px; if (px > maxX) maxX = px;
    if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz;
  }
  // The band is the loop's OWN bbox, inflated. No street-band z cap: the
  // old Math.max(−7.5, …)/Math.min(7.5, …) discipline inverted the band
  // for any loop that lives entirely outside the home street (the garden
  // tender read minZ 23.45 > maxZ 7.5, and the clamp
  // max(minZ, min(maxZ, z)) then resolved to exactly 23.45 for EVERY z —
  // the walker stood frozen at the south edge for 21 sim-minutes while
  // its velocity screamed north at full speed; the soak probe had passed
  // W4 only by sampling luck, and the avenue shopper's reach silently
  // shrank to its middle 15 m). The street trio is unaffected: their
  // authored lanes top out at |z| 6.85, so inflation alone reproduces
  // the ±7.5 line exactly, and every other street lane stays under it.
  // The ±64 net is the district's own extent — a typo net, not a wall.
  return {
    minX: Math.max(-84, minX - 1.6), maxX: Math.min(84, maxX + 1.6),
    minZ: Math.max(-64, minZ - 0.65), maxZ: Math.min(64, maxZ + 0.65),
  };
}

export function curbSideSlide(perpZ: number, walkerZ: number): number {
  const toRoad = walkerZ > 0 ? -1 : 1;       // toward z = 0
  const perpSign = perpZ > 0 ? 1 : perpZ < 0 ? -1 : 1;
  return perpSign === toRoad ? 1 : -1;
}

/**
 * One scheduled beat in a walker's day (Doc 37 §3E — lightweight routines):
 * a spot near their loop where they stop, stand, and look at something for
 * a while — the barber's pole, the bodega window, the mail. Positions are
 * TRIGGER points near the walking lane, not teleports: the walker pauses
 * wherever they happen to be when the spot comes within reach, faces
 * `faceTo`, and resumes when the dwell is spent. Deterministic by
 * construction (position-triggered, seeded starts, no random).
 */
export interface RoutineStop {
  x: number;
  z: number;
  /** The thing the beat is about — a shop window, a mailbox, a bench mate. */
  faceTo: [number, number];
  /** Seconds spent standing there. The block is not in a hurry. */
  dwell: number;
}

const ROUTINE_TRIGGER_R = 0.9;   // close enough to the spot to take the beat
const ROUTINE_RELEASE_R = 1.4;   // past this, the beat may fire again next lap
const CHAT_RANGE = 1.7;          // two dwelling walkers this close talk (face each other)

/**
 * The brush law (docs/51 B16 — the Shuffle's missing half): contact with a
 * WALKING player is the Shuffle's correct interaction, never a failure.
 * It fires the walker's "'Scuse me." — a reaction, not a penalty; nothing
 * anywhere reads a brush as a fail state. The ped's cooldown keeps a held
 * standoff from machine-gunning the line: one brush per meeting.
 *
 * Pure so the law is unit-testable (tests/shuffle.test.ts).
 *
 * @param held         the walker is touching the player's capsule right now
 * @param playerMoving the player is actually walking through (a brush is
 *                     walking through someone — two people standing pressed
 *                     together is a crowd, not a dance)
 * @param cooldownLeft the walker's brush cooldown, seconds
 * @returns true when this contact registers as a brush
 */
export function brushFires(held: boolean, playerMoving: boolean, cooldownLeft: number): boolean {
  return held && playerMoving && cooldownLeft <= 0;
}

/** Seconds before the same walker can "'scuse" again — one brush per
 *  meeting; the block's courtesy has a memory but not a grudge. */
export const BRUSH_COOLDOWN = 4;

interface Ped {
  vehicle: Vehicle;
  group: THREE.Group;
  speed: number; // m/s — walk, never run; the block is not in a hurry
  box: AABB;     // the walker's real body, synced under them every frame
  holdTime: number;  // seconds spent held off a body (player/cab) this stand
  slideSide: number; // locked sidestep direction while yielding (-1 | +1)
  // ---- the Shuffle (docs/51 B16) ----
  brushCooldown: number; // seconds until this walker can brush again
  bubbleT: number;       // > 0 → the "'Scuse me." bubble is up
  bubble: THREE.Sprite;  // the paper bubble above their head (hidden)
  bubbleMat: THREE.SpriteMaterial;
  // ---- the day's routine (Phase 4) ----
  stops: RoutineStop[];  // their scheduled beats, taken round-robin per lap
  stopIdx: number;       // which beat is next
  dwellLeft: number;     // > 0 → standing at a beat right now
  faceTo: [number, number] | null; // what the current beat looks at
  cooldown: number;      // seconds before another beat can fire
  latched: boolean;      // this beat already fired — walk away before it re-arms
  band: { minX: number; maxX: number; minZ: number; maxZ: number }; // this walker's own clamp
  // ---- the anti-stuck law (docs/51 B17) ----
  fpb: FollowPathBehavior; // their own path follower (the nudge target)
  stuckTime: number;       // consecutive still windows (displacement < 5 cm/s)
  stillClock: number;      // seconds into the current window
  stillDist: number;       // meters moved inside the current window
  lastX: number;           // position at the previous update (the truth, not
  lastZ: number;           // the velocity — a pinned walker's velocity lies)
}

const MAX_DT = 0.1; // matches the game loop's clamp — Yuka integrates with the same dt

/** A brush walking pace — slower than this and you're loitering against
 *  someone, not passing them (m/s; the walkers' own walk is 0.95–1.3). */
export const BRUSH_MIN_SPEED = 0.45;

let brushTex: THREE.CanvasTexture | THREE.Texture | null = null;
/** The "'Scuse me." paper bubble — one texture, every walker's mouth
 *  (Doc 02: brushing someone just makes them say "scuse me"). Drawn in
 *  the house's ink-on-cream voice, a tail pointing down-left to the
 *  speaker. Built lazily: no canvas exists outside the browser — and the
 *  node tests that construct walkers never render one, so a blank texture
 *  keeps the constructor honest there. */
function theBrushTexture(): THREE.Texture {
  if (brushTex) return brushTex;
  if (typeof document === 'undefined') {
    brushTex = new THREE.Texture();
    return brushTex;
  }
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 120;
  const c = cv.getContext('2d')!;
  const r = 24;
  c.beginPath();
  c.moveTo(r + 8, 8);
  c.lineTo(256 - r - 8, 8);
  c.quadraticCurveTo(256 - 8, 8, 256 - 8, 8 + r);
  c.lineTo(256 - 8, 76 - r);
  c.quadraticCurveTo(256 - 8, 76, 256 - r - 8, 76);
  c.lineTo(66, 76);
  c.lineTo(40, 112);          // the tail — down-left, toward the speaker
  c.lineTo(52, 76);
  c.lineTo(r + 8, 76);
  c.quadraticCurveTo(8, 76, 8, 76 - r);
  c.lineTo(8, 8 + r);
  c.quadraticCurveTo(8, 8, r + 8, 8);
  c.closePath();
  c.fillStyle = '#f6efe2';
  c.fill();
  c.strokeStyle = 'rgba(58,52,64,0.4)';
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = '#3a3440';
  c.font = 'italic 600 40px Georgia, serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('\u2019Scuse me.', 132, 42);
  brushTex = new THREE.CanvasTexture(cv);
  brushTex.colorSpace = THREE.SRGBColorSpace;
  return brushTex;
}

export class Pedestrians {
  readonly group = new THREE.Group();
  private manager = new EntityManager();
  private peds: Ped[] = [];
  private obstacles: GameEntity[] = [];
  /** Brushes this frame batch — drained by the orchestrator each frame and
   *  turned into the walkers' "'Scuse me." (the reaction, never a fail). */
  private brushes: Array<{ i: number; x: number; z: number }> = [];
  private lastPlayer: { x: number; z: number } | null = null;
  private playerSpeed = 0;
  private playerObstacle: GameEntity;
  private cartObstacle: GameEntity;
  private taxiObstacle: GameEntity;
  private busObstacle: GameEntity;
  private castObstacle: GameEntity;
  private time = 0;
  private roads: readonly RoadRect[];
  /** Real bodies for the player's collision stack (World registers these).
   *  Parked underground until the first update puts each under its walker. */
  readonly walkColliders: AABB[];

  constructor(
    scene: THREE.Scene,
    looks: PedLook[],
    seed: number,
    paths: Array<Array<[number, number]>>,
    staticObstacles: Array<{ x: number; z: number; r: number }>,
    routines: RoutineStop[][] = [],
    roads: readonly RoadRect[] = [],
  ) {
    this.group.name = 'Pedestrians';
    this.roads = roads;
    const rng = seededRng(seed);

    // invisible avoidance circles — the city's fixed furniture
    for (const o of staticObstacles) {
      const e = new GameEntity();
      e.position.set(o.x, 0, o.z);
      e.radius = o.r;
      this.obstacles.push(e);
      this.manager.add(e);
    }
    // circles that move with the world: you, the cart, the cab, the cast —
    // Rosa stands on the shopper's lane, so she gets her own circle (the
    // audit caught walkers ghosting straight through her)
    this.playerObstacle = new GameEntity();
    this.playerObstacle.radius = 0.5;
    this.cartObstacle = new GameEntity();
    this.cartObstacle.radius = 1.35;
    this.taxiObstacle = new GameEntity();
    this.taxiObstacle.radius = 2.4; // the cab's half-length is the danger zone
    this.busObstacle = new GameEntity();
    this.busObstacle.radius = 3.4; // the M121 (W4 p2): half its 9.6 m length
    // plus a stride — walkers part around it earlier than around the cab
    this.castObstacle = new GameEntity();
    this.castObstacle.radius = 0.5;
    this.obstacles.push(this.playerObstacle, this.cartObstacle, this.taxiObstacle, this.busObstacle, this.castObstacle);
    this.manager.add(this.playerObstacle);
    this.manager.add(this.cartObstacle);
    this.manager.add(this.taxiObstacle);
    this.manager.add(this.busObstacle);
    this.manager.add(this.castObstacle);

    // one real body per walker — parked at y −999 (the cast-collider trick:
    // a box under the world can't overlap anything) until the first update
    this.walkColliders = looks.map(() => ({
      minX: 0, maxX: 0, minY: -999, maxY: -998, minZ: 0, maxZ: 0,
    }));

    looks.forEach((look, i) => {
      const pts = paths[i % paths.length];
      const path = new Path();
      path.loop = true;
      for (const [x, z] of pts) path.add(new Vector3(x, 0, z));

      const vehicle = new Vehicle();
      // seed-spaced starts: each walker joins their loop at a different leg
      const start = pts[Math.floor(rng() * pts.length)];
      vehicle.position.set(start[0], 0, start[1]);
      vehicle.maxSpeed = 0.95 + rng() * 0.35;
      vehicle.maxForce = 6;
      const fpb = new FollowPathBehavior(path, 0.7);
      vehicle.steering.add(fpb);
      vehicle.steering.add(new ObstacleAvoidanceBehavior(this.obstacles, 2.2));
      vehicle.steering.add(new SeparationBehavior());
      this.manager.add(vehicle);

      // the same handcrafted rig the cast wears — bank-shared materials,
      // so three more neighbors cost three rigs, zero new materials
      const { group } = buildArticulatedPerson(look);
      group.position.set(start[0], groundY(start[0], start[1], roads), start[1]);
      group.rotation.y = rng() * Math.PI * 2;
      this.group.add(group);
      // the Shuffle's "'Scuse me." — a paper bubble above their head, shared
      // texture, per-walker material (the fade is per mouth, not per word)
      const bubbleMat = new THREE.SpriteMaterial({
        map: theBrushTexture(), transparent: true, opacity: 0, depthWrite: false,
      });
      const bubble = new THREE.Sprite(bubbleMat);
      bubble.scale.set(1.28, 0.6, 1);
      bubble.position.set(0, 2.12, 0);
      bubble.visible = false;
      bubble.renderOrder = 40;
      group.add(bubble);
      // W4: each walker clamps to their own loop's bbox (bandOfLoop) —
      // inflated 1.6 m laterally (curb-yield room) and 0.65 m in z, so a
      // district walker pushed off Gable can never be clamped into Juniper.
      const band = bandOfLoop(pts);
      this.peds.push({
        vehicle, group, speed: vehicle.maxSpeed,
        box: this.walkColliders[i],
        holdTime: 0,
        slideSide: 0,
        band,
        fpb,
        stuckTime: 0,
        stillClock: 0,
        stillDist: 0,
        lastX: start[0],
        lastZ: start[1],
        // the Shuffle — nobody has brushed you yet today
        brushCooldown: 1.2, // the first seconds a player sees them: no chatter
        bubbleT: 0,
        bubble,
        bubbleMat,
        // the day's beats — round-robin from wherever the seeded start landed
        stops: routines[i % Math.max(1, routines.length)] ?? [],
        stopIdx: i, // staggered so the block's beats don't all fire at once
        dwellLeft: 0,
        faceTo: null,
        cooldown: 1.2 + i * 0.7, // don't pause in the first seconds a player sees them
        latched: false,
      });
    });

    scene.add(this.group);
  }

  /** Live position of walker `i` — the interaction registry reads this every
   *  frame (moving NPCs stay live, Doc 37 §3B). Out of range → parked below
   *  the world, which the registry's y-band excludes. */
  bodyAt(i: number): { x: number; y: number; z: number } {
    const p = this.peds[i];
    if (!p) return { x: 0, y: -100, z: 0 };
    const v = p.vehicle.position;
    return { x: v.x, y: 0, z: v.z };
  }

  /** XZ bodies for World's taxi-yield list — a crossing walker holds the cab. */
  bodies(): Array<{ x: number; z: number }> {
    return this.peds.map((p) => ({ x: p.vehicle.position.x, z: p.vehicle.position.z }));
  }

  /** The frame's brushes (walker index + where it happened) and clears the
   *  batch. The orchestrator turns each into the walker's "'Scuse me." —
   *  a correct interaction (docs/51 B16): nothing here is ever a failure,
   *  so the queue carries no severity, no penalty, nothing to lose. */
  drainBrushes(): Array<{ i: number; x: number; z: number }> {
    const out = this.brushes;
    this.brushes = [];
    return out;
  }

  /**
   * Push every walker out of a vehicle's footprint (shortest exit, capped).
   * Called by World AFTER the cab's — and the M121's — committed move: the
   * pedestrian yields to the vehicle, never the reverse. Yuka's path
   * steering resumes the route the moment the footprint clears.
   */
  resolveAgainstCab(cabRect: AABB): void {
    const push: CirclePush = { x: 0, z: 0 };
    for (const p of this.peds) {
      if (pushCircleOutOfRectXZ(p.vehicle.position.x, p.vehicle.position.z, PED_R, cabRect, MAX_PUSH, push)) {
        p.vehicle.position.x += push.x;
        p.vehicle.position.z += push.z;
      }
    }
  }

  update(
    dt: number,
    player?: { x: number; z: number },
    cart?: { x: number; z: number },
    taxi?: { x: number; z: number },
    cast?: { x: number; z: number },
    bus?: { x: number; z: number },
  ): void {
    this.time += dt;
    if (player) this.playerObstacle.position.set(player.x, 0, player.z);
    if (cart) this.cartObstacle.position.set(cart.x, 0, cart.z);
    if (taxi) this.taxiObstacle.position.set(taxi.x, 0, taxi.z);
    if (cast) this.castObstacle.position.set(cast.x, 0, cast.z);
    if (bus) this.busObstacle.position.set(bus.x, 0, bus.z);

    // the player's pace — a brush is WALKING through someone (docs/51 B16):
    // the speed here decides contact-vs-dance, so it must be measured, not
    // assumed. Frame-rate independent (position delta over this frame's dt).
    if (player) {
      if (this.lastPlayer && dt > 0) {
        this.playerSpeed = Math.hypot(player.x - this.lastPlayer.x, player.z - this.lastPlayer.z) / dt;
      }
      this.lastPlayer = { x: player.x, z: player.z };
    } else {
      this.lastPlayer = null;
      this.playerSpeed = 0;
    }

    // ---- routines (Phase 4, Doc 37 §3E): the day's scheduled beats -------
    // Position-triggered, round-robin, no random: a walker near their next
    // beat stops, stands, and looks at the thing for a while. While dwelling
    // the vehicle is HARD-PINNED across the Yuka integration (the recorded
    // pre-update position is restored after), so no steering force can
    // accumulate drift under them — the path simply waits, and resumes the
    // moment the dwell is spent. Deterministic, so the E2E meets the same
    // street life every run.
    for (const pd of this.peds) {
      if (pd.dwellLeft > 0) {
        pd.dwellLeft -= dt;
        pd.cooldown = 1.2; // re-armed fresh when the beat ends
        if (pd.dwellLeft <= 0) {
          pd.dwellLeft = 0;
          pd.faceTo = null;
          pd.latched = true; // walk away before this beat can fire again
        }
        continue;
      }
      if (pd.cooldown > 0) pd.cooldown -= dt;
      if (pd.stops.length === 0 || pd.cooldown > 0) continue;
      const pi0 = pd.vehicle.position;
      const stop = pd.stops[pd.stopIdx % pd.stops.length];
      const d = Math.hypot(pi0.x - stop.x, pi0.z - stop.z);
      if (d < ROUTINE_TRIGGER_R && !pd.latched) {
        pd.dwellLeft = stop.dwell;
        pd.faceTo = stop.faceTo;
        pd.stopIdx += 1; // next lap takes the next beat
        pd.latched = true;
      } else if (d > ROUTINE_RELEASE_R) {
        pd.latched = false;
      }
    }

    // pinned walkers hold their exact spot through the integration step
    const pinned = this.peds
      .filter((p) => p.dwellLeft > 0)
      .map((p) => ({ p, x: p.vehicle.position.x, z: p.vehicle.position.z }));

    this.manager.update(Math.min(dt, MAX_DT));

    for (const pin of pinned) {
      pin.p.vehicle.position.set(pin.x, 0, pin.z);
      pin.p.vehicle.velocity.set(0, 0, 0);
    }

    // ---- hard guarantees (steering asked; physics resolves) --------------
    // 1. walker ↔ walker: symmetric half-pushes. SeparationBehavior is a
    //    force and can be overcome at route corners; this cannot.
    // 2. walker ↔ player: the walker yields — you are never shoved.
    // 3. walker ↔ world: the band clamp keeps everybody on the block.
    const a: CirclePush = { x: 0, z: 0 };
    const b: CirclePush = { x: 0, z: 0 };
    for (let i = 0; i < this.peds.length; i++) {
      const pd = this.peds[i];
      const pi = pd.vehicle.position;
      for (let j = i + 1; j < this.peds.length; j++) {
        const pj = this.peds[j].vehicle.position;
        if (resolveCirclesXZ(pi.x, pi.z, pj.x, pj.z, PED_R, PED_R, MAX_PUSH * 0.5, a, b)) {
          pi.x += a.x; pi.z += a.z;
          pj.x += b.x; pj.z += b.z;
        }
      }
      if (player) {
        const held = resolveCirclesXZ(pi.x, pi.z, player.x, player.z, PED_REACH, PLAYER_R, MAX_PUSH, a, null);
        if (held) {
          pi.x += a.x; pi.z += a.z;
          // THE SHUFFLE (docs/51 B16): brushing a walker while walking is
          // the CORRECT interaction — they say "'Scuse me.", the walk goes
          // on, nothing counts against you. One brush per meeting.
          pd.brushCooldown = Math.max(0, pd.brushCooldown - dt);
          if (brushFires(true, this.playerSpeed >= BRUSH_MIN_SPEED, pd.brushCooldown)) {
            this.brushes.push({ i, x: pi.x, z: pi.z });
            pd.brushCooldown = BRUSH_COOLDOWN;
            pd.bubbleT = 2.2;
            pd.bubble.visible = true;
          }
          // "pardon me": held off a body for a beat, a walker STEPS ASIDE
          // instead of leaning into the push forever — a slide perpendicular
          // to the player line, on the side they were already passing.
          // This is the head-on unlock: without it the pedestrian's forward
          // pull and the hold cancel and both parties stall mid-sidewalk.
          const plen = Math.hypot(a.x, a.z) || 1;
          const px2 = -a.z / plen;
          const pz2 = a.x / plen;
          const vx = pd.vehicle.velocity.x;
          const vz = pd.vehicle.velocity.z;
          const vlen = Math.hypot(vx, vz);
          // OVERTAKE BIAS (doc 36 §8 handover): a walker caught from behind —
          // velocity aligned with the push — steps out NOW, curb-side. The
          // 0.25 s head-on grace would only balance the grind here.
          const sameDir = vlen > 0.2 && (vx * a.x + vz * a.z) / (vlen * plen) > 0.45;
          if (sameDir) {
            if (pd.slideSide === 0) pd.slideSide = curbSideSlide(pz2, pi.z);
            pi.x += px2 * pd.slideSide * dt * 3.5;
            pi.z += pz2 * pd.slideSide * dt * 3.5;
            pd.holdTime = 0; // not a standoff; the grace clock stays fresh
          } else {
            pd.holdTime += dt;
            if (pd.holdTime > 0.25) {
              if (pd.slideSide === 0) {
                // side = sign of the cross product(velocity, push-out) — the
                // direction their own motion is already carrying them past
                const cross = vx * a.z - vz * a.x;
                pd.slideSide = cross >= 0 ? 1 : -1;
                if (Math.abs(cross) < 1e-4) pd.slideSide = (i % 2 === 0) ? 1 : -1;
              }
              pi.x += px2 * pd.slideSide * dt * 3.0;
              pi.z += pz2 * pd.slideSide * dt * 3.0;
            }
          }
          // SWEEP-BACK GUARD (integration fix): the sidestep is displacement
          // ON TOP of the yield push, and the player's capsule resolves
          // against these boxes ONE FRAME STALE. At the dt clamp a 3.5 m/s
          // sidestep sweeps the box ~0.35 m into where the capsule is — and
          // the player's own depenetrate then shoves the PLAYER backwards,
          // every frame (the e2e's "walks west at full speed" ghost). The
          // walker yields twice: after ALL displacement, the yield distance
          // is re-enforced — the box can never park inside the capsule.
          if (resolveCirclesXZ(pi.x, pi.z, player.x, player.z, PED_REACH, PLAYER_R, MAX_PUSH, a, null)) {
            pi.x += a.x; pi.z += a.z;
          }
        } else {
          pd.holdTime = 0;
          pd.slideSide = 0;
        }
      }
      // the band clamp — the walkers have no wall collision of their own,
      // so their loop's bounds are applied to their bodies directly
      pi.x = Math.max(pd.band.minX, Math.min(pd.band.maxX, pi.x));
      pi.z = Math.max(pd.band.minZ, Math.min(pd.band.maxZ, pi.z));
    }

    // the anti-stuck law (docs/51 B17): a walker that is not dwelling and
    // still hasn't MOVED for 8 sim-seconds is grinding against something
    // its steering cannot resolve — advance the waypoint so the loop
    // resumes around the blockage. The signal is POSITION DELTA over
    // one-second windows, never the vehicle's velocity: the W4 garden pin
    // stood frozen for 21 minutes with its velocity screaming north at
    // full speed — the brain's intent is exactly the thing that lies.
    // Eight windows is longer than any routine dwell (max 6 s) and longer
    // than any legal stall; a 20-minute freeze is the alternative.
    for (const pd of this.peds) {
      if (pd.dwellLeft > 0) {
        pd.stuckTime = 0; pd.stillClock = 0; pd.stillDist = 0;
        pd.lastX = pd.vehicle.position.x; pd.lastZ = pd.vehicle.position.z;
        continue;
      }
      const v = pd.vehicle.position;
      pd.stillDist += Math.hypot(v.x - pd.lastX, v.z - pd.lastZ);
      pd.lastX = v.x; pd.lastZ = v.z;
      pd.stillClock += dt;
      if (pd.stillClock >= 1) {
        pd.stuckTime = pd.stillDist < 0.05 ? pd.stuckTime + 1 : 0;
        pd.stillClock = 0; pd.stillDist = 0;
      }
      if (pd.stuckTime >= 8) {
        pd.stuckTime = 0; pd.stillClock = 0; pd.stillDist = 0;
        pd.fpb.path.advance();
      }
    }

    for (const p of this.peds) {
      const v = p.vehicle.position;
      p.group.position.set(v.x, groundY(v.x, v.z, this.roads), v.z);
      // face the walking direction (velocity, not the steering force) —
      // and hold the last heading at waypoints so nobody snap-turns
      const vx = p.vehicle.velocity.x;
      const vz = p.vehicle.velocity.z;
      if (vx * vx + vz * vz > 0.01) p.group.rotation.y = Math.atan2(vx, vz);
      // dwelling: face the beat — or a neighbor who stopped beside you
      // (two dwelling walkers within CHAT_RANGE face each other: the
      // block's occasional two-person conversations, emergent from the
      // schedules, never scripted)
      if (p.dwellLeft > 0) {
        let tx: number | null = null;
        let tz: number | null = null;
        let bestD2 = CHAT_RANGE * CHAT_RANGE;
        for (const other of this.peds) {
          if (other === p || other.dwellLeft <= 0) continue;
          const ov = other.vehicle.position;
          const dx = ov.x - v.x;
          const dz = ov.z - v.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < bestD2) { bestD2 = d2; tx = ov.x; tz = ov.z; }
        }
        if (tx === null && p.faceTo) { tx = p.faceTo[0]; tz = p.faceTo[1]; }
        if (tx !== null && tz !== null) {
          const dx = tx - v.x;
          const dz = tz - v.z;
          if (dx * dx + dz * dz > 0.04) p.group.rotation.y = Math.atan2(dx, dz);
        }
      }
      // the rig measures its own position delta → the walk cycle is free
      // (a dwelling walker's delta is zero → it reads as a natural idle)
      updatePersonAnim(p.group, dt);
      // the brush bubble rides its own mouth: hold ~2 s, fade the last half
      if (p.bubbleT > 0) {
        p.bubbleT -= dt;
        p.bubbleMat.opacity = Math.min(1, Math.max(0, p.bubbleT / 1.1));
        if (p.bubbleT <= 0) { p.bubble.visible = false; p.bubbleMat.opacity = 0; }
      }
      // the walker's real body follows (feet on their ground; a box at the
      // walker's feet height blocks the capsule exactly like the cast's)
      p.box.minX = v.x - 0.28;
      p.box.maxX = v.x + 0.28;
      p.box.minZ = v.z - 0.28;
      p.box.maxZ = v.z + 0.28;
      p.box.minY = 0;
      p.box.maxY = 1.7;
    }
  }
}
