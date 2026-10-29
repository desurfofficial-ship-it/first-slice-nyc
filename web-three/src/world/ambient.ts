/**
 * Ambient wildlife — pigeons and one squirrel, placed by a SEEDED rng so the
 * E2E driver (and every player) meets the same birds in the same spots.
 *
 * Behaviors (restrained, never synchronized-robotic):
 *   pigeon  — idle (head glance) · walk (small seeded wander) · peck (head
 *             dip, crumbs are imaginary) · flush (a player inside the
 *             personal-space radius lifts the bird in a short arc, two or
 *             three wingbeats, land, shake, back to business)
 *   squirrel — hop (short parabolic hops between rest spots) · freeze ·
 *             tail flick; it flees a close player and always beats you there
 *
 * Dusk law: nobody flushes at dusk — the flock settles, the city breathes out.
 * All motion is frame-rate independent (dt in seconds).
 */

import * as THREE from 'three';

/** Deterministic rng (mulberry32) — placement the tests can reproduce. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PigeonState {
  group: THREE.Group;
  head: THREE.Group;
  tail: THREE.Mesh;
  /** the wing pair — folded wings ARE the body silhouette, so the pair is
   *  only VISIBLE mid-flight (hidden = skipped draw = zero steady-state
   *  cost). A pigeon that arcs over the plaza on invisible wings reads as a
   *  thrown prop; the flap is what sells the flush. */
  wings: THREE.Group;
  home: { x: number; z: number };
  pos: { x: number; z: number };
  facing: number;
  mode: 'idle' | 'walk' | 'peck' | 'fly';
  timer: number;          // seconds left in the current mode
  target: { x: number; z: number };
  // flight arc
  flyAge: number;
  flyDur: number;
  flyFrom: { x: number; z: number };
  flyTo: { x: number; z: number };
  phase: number;          // idle glance phase
}

const PIGEON_FLUSH_R = 1.7;
const PIGEON_WALK_SPEED = 0.55;

export class PigeonFlock {
  readonly group = new THREE.Group();
  private birds: PigeonState[] = [];
  private time = 0;
  private radius: number;
  private home: { x: number; z: number };
  private zBand?: { min: number; max: number };
  /** the paving these birds stand on — the north sidewalk slab tops out at
   *  y = 0.1, and a flock rooted at y = 0 sinks a tenth of a metre into it:
   *  at the curb seam the birds read half-buried (Doc 31 caught it). */
  private groundY: number;

  /**
   * @param seed deterministic placement seed
   * @param center plaza the flock calls home
   * @param radius wander radius around the center
   * @param zBand optional sidewalk band — birds never stand in the traffic
   *   lane (the doc says pigeons do not jaywalk; the first draft let the
   *   wander radius drift them into the road anyway)
   * @param groundY the top of the paving under the flock (slab = 0.1)
   */
  constructor(
    scene: THREE.Scene,
    mats: { body: THREE.Material; head: THREE.Material; beak: THREE.Material;
      /** plumage morphs — a real sidewalk flock is three greys, not twelve
       *  clones; every material here is shared bank stock, so variety costs
       *  zero extra materials. */
      bodies?: THREE.Material[];
      /** a cream nape patch on some birds (city pigeons wear blazes). */
      patch?: THREE.Material; },
    seed: number,
    center: { x: number; z: number },
    radius: number,
    count = 9,
    zBand?: { min: number; max: number },
    groundY = 0,
  ) {
    const rng = seededRng(seed);
    this.radius = radius;
    this.home = { ...center };
    this.zBand = zBand;
    this.groundY = groundY;
    for (let i = 0; i < count; i++) {
      // this bird's plumage — one of the flock's morphs (or the plain body)
      const bodies = mats.bodies ?? [mats.body];
      const plumage = bodies[Math.floor(rng() * bodies.length)];
      const g = new THREE.Group();
      const body = new THREE.Mesh(pigeonBodyGeo, plumage);
      body.scale.set(0.13, 0.1, 0.17);
      body.position.y = 0.12;
      const head = new THREE.Group();
      head.position.set(0, 0.2, 0.13);
      const skull = new THREE.Mesh(pigeonHeadGeo, mats.head);
      skull.scale.setScalar(0.075);
      head.add(skull);
      const beak = new THREE.Mesh(pigeonBeakGeo, mats.beak);
      beak.scale.set(0.03, 0.024, 0.07);
      beak.position.set(0, -0.005, 0.07);
      head.add(beak);
      const tail = new THREE.Mesh(pigeonTailGeo, plumage); // tail matches its own body
      tail.scale.set(0.09, 0.02, 0.14);
      tail.position.set(0, 0.13, -0.16);
      tail.rotation.x = 0.28;
      // the wing pair: two slabs of the bird's own plumage, hinged at the
      // body, swept back a hair. One shared geometry, plumage material —
      // variety and flight cost zero extra materials.
      const wings = new THREE.Group();
      wings.name = 'Wings';
      for (const wx of [-0.15, 0.15]) {
        const w = new THREE.Mesh(pigeonWingGeo, plumage);
        w.scale.set(0.17, 0.014, 0.075);
        w.position.set(wx, 0.03, -0.02);
        w.rotation.y = wx < 0 ? 0.3 : -0.3; // tips trail toward the tail
        wings.add(w);
      }
      wings.position.y = 0.14;
      wings.visible = false; // folded — the body reads as the folded wing
      g.add(body, head, tail, wings);
      if (mats.patch && rng() < 0.28) {
        // the blaze: a small cream nape chip, squashed against the neck
        const blaze = new THREE.Mesh(pigeonBlazeGeo, mats.patch);
        blaze.scale.set(0.055, 0.045, 0.03);
        blaze.position.set(0, 0.185, 0.085);
        g.add(blaze);
      }
      // seeded scatter, never on top of each other (min spacing via rejection)
      let x = 0, z = 0, ok = false;
      for (let tries = 0; tries < 20 && !ok; tries++) {
        x = center.x + (rng() - 0.5) * 2 * radius;
        z = center.z + (rng() - 0.5) * 2 * radius * 0.7;
        if (zBand) z = Math.min(zBand.max, Math.max(zBand.min, z));
        ok = this.birds.every((b) => Math.hypot(b.pos.x - x, b.pos.z - z) > 0.55);
      }
      const bird: PigeonState = {
        group: g, head, tail, wings,
        home: { x: center.x, z: center.z },
        pos: { x, z },
        facing: rng() * Math.PI * 2,
        mode: 'idle',
        timer: 1 + rng() * 4,
        target: { x, z },
        flyAge: 0, flyDur: 0.85 + rng() * 0.35,
        flyFrom: { x, z }, flyTo: { x, z },
        phase: rng() * Math.PI * 2,
      };
      g.position.set(x, this.groundY, z);
      g.rotation.y = bird.facing;
      this.birds.push(bird);
      this.group.add(g);
    }
    scene.add(this.group);
  }

  /** Keep a wander/flight target on the plaza — pigeons do not jaywalk,
   *  and they do not stand in the traffic lane either. */
  private clampToPlaza(t: { x: number; z: number }): void {
    const dx = t.x - this.home.x;
    const dz = t.z - this.home.z;
    const d = Math.hypot(dx, dz);
    const max = this.radius * 1.05;
    if (d > max) {
      t.x = this.home.x + (dx / d) * max;
      t.z = this.home.z + (dz / d) * max;
    }
    if (this.zBand) t.z = Math.min(this.zBand.max, Math.max(this.zBand.min, t.z));
  }

  update(dt: number, player: { x: number; z: number } | undefined, dusk: boolean): void {
    this.time += dt;
    for (const b of this.birds) {
      b.phase += dt;

      // ---- flush check (never at dusk; the flock roosts) ----
      if (!dusk && b.mode !== 'fly' && player) {
        const d = Math.hypot(player.x - b.pos.x, player.z - b.pos.z);
        if (d < PIGEON_FLUSH_R) {
          const away = Math.atan2(b.pos.x - player.x, b.pos.z - player.z) + (b.phase % 1 - 0.5) * 0.6;
          const dist = 1.9 + (b.phase % 0.5);
          b.flyFrom = { ...b.pos };
          b.flyTo = { x: b.pos.x + Math.sin(away) * dist, z: b.pos.z + Math.cos(away) * dist };
          this.clampToPlaza(b.flyTo);
          b.flyAge = 0;
          b.mode = 'fly';
        }
      }

      switch (b.mode) {
        case 'fly': {
          b.flyAge += dt;
          const k = Math.min(1, b.flyAge / b.flyDur);
          const ease = k * k * (3 - 2 * k); // smoothstep — leaves and lands soft
          b.pos.x = b.flyFrom.x + (b.flyTo.x - b.flyFrom.x) * ease;
          b.pos.z = b.flyFrom.z + (b.flyTo.z - b.flyFrom.z) * ease;
          b.group.position.y = this.groundY + Math.sin(Math.PI * k) * 1.15;
          b.group.rotation.y = Math.atan2(b.flyTo.x - b.flyFrom.x, b.flyTo.z - b.flyFrom.z);
          // two flap beats over the arc — wings hinge at the body and beat
          // at the tail's cadence, so body, tail, and wings read as one animal
          b.tail.rotation.x = 0.28 + Math.sin(b.flyAge * 26) * 0.35;
          b.wings.visible = true;
          b.wings.rotation.z = Math.sin(b.flyAge * 26) * 0.55;
          if (k >= 1) {
            b.group.position.y = this.groundY;
            b.tail.rotation.x = 0.28;
            b.head.position.z = 0.13; // never land mid-bob
            b.wings.visible = false; // folded again — and skipped by the renderer
            b.wings.rotation.z = 0;
            b.mode = 'idle';
            b.timer = 0.6 + (b.phase % 0.9);
          }
          break;
        }
        case 'idle': {
          b.timer -= dt;
          b.head.rotation.x = Math.sin(b.phase * 1.3) * 0.16; // glancing about
          b.head.rotation.y = Math.sin(b.phase * 0.7) * 0.4;
          // unwind the walk-bob: the head eases back to rest, mid-stride or not
          b.head.position.z += (0.13 - b.head.position.z) * Math.min(1, dt * 12);
          if (b.timer <= 0) {
            const roll = (b.phase * 7.13) % 1;
            if (roll < 0.45) {
              // wander to a nearby spot
              const a = (b.phase * 3.7) % (Math.PI * 2);
              const r = 0.5 + (b.phase % 0.8);
              b.target = {
                x: b.home.x + (b.pos.x - b.home.x) * 0.2 + Math.sin(a) * r,
                z: b.home.z + (b.pos.z - b.home.z) * 0.2 + Math.cos(a) * r,
              };
              this.clampToPlaza(b.target);
              b.mode = 'walk';
            } else {
              b.mode = 'peck';
              b.timer = 1.2 + (b.phase % 1.6);
            }
          }
          break;
        }
        case 'walk': {
          const dx = b.target.x - b.pos.x;
          const dz = b.target.z - b.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.08) {
            b.mode = 'idle';
            b.timer = 0.8 + (b.phase % 1.2);
          } else {
            const step = Math.min(d, PIGEON_WALK_SPEED * dt);
            b.pos.x += (dx / d) * step;
            b.pos.z += (dz / d) * step;
            b.group.rotation.y = Math.atan2(dx, dz);
            // the head-bob walk: body dips at stride frequency
            b.group.position.y = this.groundY + Math.abs(Math.sin(b.phase * 9)) * 0.015;
            b.head.position.z = 0.13 + Math.sin(b.phase * 9) * 0.03;
          }
          break;
        }
        case 'peck': {
          b.timer -= dt;
          b.head.rotation.x = 0.55 + Math.sin(b.phase * 6.5) * 0.28; // dabbing the pavement
          b.head.rotation.y = 0;
          b.head.position.z += (0.13 - b.head.position.z) * Math.min(1, dt * 12);
          if (b.timer <= 0) {
            b.mode = 'idle';
            b.timer = 0.7 + (b.phase % 1.4);
          }
          break;
        }
      }

      if (b.mode !== 'fly') b.group.position.y = b.mode === 'walk' ? b.group.position.y : this.groundY;
      b.group.position.x = b.pos.x;
      b.group.position.z = b.pos.z;
    }
  }
}

// ---- shared pigeon geometry (built once for the whole flock) --------------
const pigeonBodyGeo = new THREE.SphereGeometry(1, 8, 6);
const pigeonHeadGeo = new THREE.SphereGeometry(1, 7, 5);
const pigeonBeakGeo = new THREE.ConeGeometry(1, 2, 5);
const pigeonTailGeo = new THREE.BoxGeometry(1, 1, 1);
const pigeonBlazeGeo = new THREE.SphereGeometry(1, 6, 4);
const pigeonWingGeo = new THREE.BoxGeometry(1, 1, 1);

interface SquirrelState {
  group: THREE.Group;
  tail: THREE.Group;
  pos: { x: number; z: number };
  mode: 'rest' | 'hop' | 'flee';
  timer: number;
  hopAge: number;
  hopDur: number;
  from: { x: number; z: number };
  to: { x: number; z: number };
  hopsLeft: number;
  phase: number;
}

const SQ_FLUSH_R = 1.5;
const SQ_HOP_LEN = 0.62;

export class Squirrel {
  readonly group: THREE.Group;
  private s: SquirrelState;
  private zBand?: { min: number; max: number };
  private groundY: number;

  constructor(
    scene: THREE.Scene,
    mats: { fur: THREE.Material; tail: THREE.Material },
    seed: number,
    home: { x: number; z: number },
    zBand?: { min: number; max: number },
    groundY = 0,
  ) {
    const rng = seededRng(seed);
    this.groundY = groundY;
    const g = new THREE.Group();
    const body = new THREE.Mesh(sqBodyGeo, mats.fur);
    body.scale.set(0.1, 0.1, 0.16);
    body.position.y = 0.11;
    const head = new THREE.Mesh(sqHeadGeo, mats.fur);
    head.scale.setScalar(0.07);
    head.position.set(0, 0.2, 0.1);
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.12, -0.12);
    const tailMesh = new THREE.Mesh(sqTailGeo, mats.tail);
    tailMesh.scale.set(0.05, 0.22, 0.05);
    tailMesh.position.y = 0.16;
    tailMesh.rotation.x = -0.5;
    tailPivot.add(tailMesh);
    g.add(body, head, tailPivot);
    const pos = { x: home.x + (rng() - 0.5), z: home.z + (rng() - 0.5) };
    if (zBand) pos.z = Math.min(zBand.max, Math.max(zBand.min, pos.z));
    g.position.set(pos.x, groundY, pos.z);
    this.s = {
      group: g, tail: tailPivot, pos,
      mode: 'rest', timer: 1 + rng() * 3,
      hopAge: 0, hopDur: 0.3,
      from: pos, to: pos, hopsLeft: 0,
      phase: rng() * 10,
    };
    this.group = g;
    this.zBand = zBand;
    scene.add(g);
  }

  /** A hop target that respects the sidewalk band (squirrels chase acorns,
   *  not taxis). */
  private clampZ(t: { x: number; z: number }): void {
    if (this.zBand) t.z = Math.min(this.zBand.max, Math.max(this.zBand.min, t.z));
  }

  update(dt: number, player: { x: number; z: number } | undefined, dusk: boolean): void {
    const s = this.s;
    s.phase += dt;

    if (!dusk && s.mode !== 'flee' && player) {
      const d = Math.hypot(player.x - s.pos.x, player.z - s.pos.z);
      if (d < SQ_FLUSH_R) {
        const away = Math.atan2(s.pos.x - player.x, s.pos.z - player.z);
        s.to = { x: s.pos.x + Math.sin(away) * SQ_HOP_LEN * 2.2, z: s.pos.z + Math.cos(away) * SQ_HOP_LEN * 2.2 };
        this.clampZ(s.to);
        s.from = { ...s.pos };
        s.hopAge = 0;
        s.hopsLeft = 3;
        s.mode = 'flee';
      }
    }

    if (s.mode === 'rest') {
      s.timer -= dt;
      // tail flick while resting — the squirrel's whole personality
      s.tail.rotation.z = Math.sin(s.phase * 3.1) * 0.22;
      if (s.timer <= 0) {
        const a = (s.phase * 2.9) % (Math.PI * 2);
        s.to = { x: s.pos.x + Math.sin(a) * SQ_HOP_LEN, z: s.pos.z + Math.cos(a) * SQ_HOP_LEN };
        this.clampZ(s.to);
        s.from = { ...s.pos };
        s.hopAge = 0;
        s.hopsLeft = 1 + Math.floor(s.phase % 2);
        s.mode = 'hop';
      }
    } else if (s.mode === 'hop' || s.mode === 'flee') {
      s.hopAge += dt;
      const k = Math.min(1, s.hopAge / s.hopDur);
      s.pos.x = s.from.x + (s.to.x - s.from.x) * k;
      s.pos.z = s.from.z + (s.to.z - s.from.z) * k;
      s.group.position.y = this.groundY + Math.sin(Math.PI * k) * 0.14;
      s.group.rotation.y = Math.atan2(s.to.x - s.from.x, s.to.z - s.from.z);
      s.tail.rotation.z = Math.sin(s.hopAge * 18) * 0.3;
      if (k >= 1) {
        s.group.position.y = this.groundY;
        s.hopsLeft -= 1;
        if (s.hopsLeft <= 0) {
          s.mode = 'rest';
          s.timer = 0.8 + (s.phase % 2.2);
        } else {
          // chain another hop roughly the same direction
          const dx = s.to.x - s.from.x;
          const dz = s.to.z - s.from.z;
          const len = Math.hypot(dx, dz) || 1;
          s.from = { ...s.to };
          s.to = { x: s.to.x + (dx / len) * SQ_HOP_LEN, z: s.to.z + (dz / len) * SQ_HOP_LEN };
          this.clampZ(s.to);
          s.hopAge = 0;
        }
      }
    }

    s.group.position.x = s.pos.x;
    s.group.position.z = s.pos.z;
  }
}

const sqBodyGeo = new THREE.SphereGeometry(1, 8, 6);
const sqHeadGeo = new THREE.SphereGeometry(1, 7, 5);
const sqTailGeo = new THREE.SphereGeometry(1, 7, 5);
