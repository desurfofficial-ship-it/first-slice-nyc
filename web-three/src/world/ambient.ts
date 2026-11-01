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

interface BirdState {
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
  // live pose, mirrored into the instanced matrices every frame (the probes
  // read these: env5's resting heights, env6's wing states, polish's bands)
  y: number;
  headZ: number;
  headRotX: number;
  headRotY: number;
  tailRotX: number;
  wingRotZ: number;
  wingsVisible: boolean;
  // identity (the autumn probe counts morphs + blazes through these)
  plumage: THREE.Material;
  hasBlaze: boolean;
  /** which morph bucket this bird's body/tail/wings render in */
  morph: number;
}

const PIGEON_FLUSH_R = 1.7;
const PIGEON_WALK_SPEED = 0.55;

export class PigeonFlock {
  readonly group = new THREE.Group();
  /** Per-bird state — the scene graph is instanced now (one InstancedMesh
   *  per material instead of ~5 meshes per bird: 83 draw calls measured →
   *  ≤ 12 per flock), but every behavioral fact a probe asserts lives on
   *  these records exactly as before. */
  readonly birds: BirdState[] = [];
  private time = 0;
  private radius: number;
  private home: { x: number; z: number };
  private zBand?: { min: number; max: number };
  /** the paving these birds stand on — the north sidewalk slab tops out at
   *  y = 0.1, and a flock rooted at y = 0 sinks a tenth of a metre into it:
   *  at the curb seam the birds read half-buried (Doc 31 caught it). */
  private groundY: number;
  // instanced part meshes — bodies/tails/wings exist once per plumage morph
  private bodyInst: THREE.InstancedMesh[] = [];
  private tailInst: THREE.InstancedMesh[] = [];
  private wingInst: THREE.InstancedMesh[] = [];
  private skullInst!: THREE.InstancedMesh;
  private beakInst!: THREE.InstancedMesh;
  private blazeInst: THREE.InstancedMesh | null = null;
  private morphIdx: number[][] = [];   // morph → bird indices
  private blazeIdx: number[] = [];
  // preallocated matrix scratch — the update loop allocates nothing
  private readonly mBird = new THREE.Matrix4();
  private readonly mHead = new THREE.Matrix4();
  private readonly mPivot = new THREE.Matrix4();
  private readonly mPart = new THREE.Matrix4();
  private readonly mFinal = new THREE.Matrix4();
  private readonly v = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly s = new THREE.Vector3();
  private readonly ONE = new THREE.Vector3(1, 1, 1);
  private readonly ZERO = new THREE.Vector3(0, 0, 0);
  private instPtr: number[] = [];
  private allInst: THREE.InstancedMesh[] = [];

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
    const bodies = mats.bodies ?? [mats.body];
    const morphCounts = new Map<number, number>();
    for (let i = 0; i < count; i++) {
      const morph = Math.floor(rng() * bodies.length);
      morphCounts.set(morph, (morphCounts.get(morph) ?? 0) + 1);
      const blaze = !!(mats.patch && rng() < 0.28);
      // seeded scatter, never on top of each other (min spacing via rejection)
      let x = 0, z = 0, ok = false;
      for (let tries = 0; tries < 20 && !ok; tries++) {
        x = center.x + (rng() - 0.5) * 2 * radius;
        z = center.z + (rng() - 0.5) * 2 * radius * 0.7;
        if (zBand) z = Math.min(zBand.max, Math.max(zBand.min, z));
        ok = this.birds.every((b) => Math.hypot(b.pos.x - x, b.pos.z - z) > 0.55);
      }
      const bird: BirdState = {
        pos: { x, z },
        facing: rng() * Math.PI * 2,
        mode: 'idle',
        timer: 1 + rng() * 4,
        target: { x, z },
        flyAge: 0, flyDur: 0.85 + rng() * 0.35,
        flyFrom: { x, z }, flyTo: { x, z },
        phase: rng() * Math.PI * 2,
        y: groundY,
        headZ: 0.13, headRotX: 0, headRotY: 0,
        tailRotX: 0.28, wingRotZ: 0, wingsVisible: false,
        plumage: bodies[morph], hasBlaze: blaze, morph,
      };
      this.birds.push(bird);
      this.morphIdx[morph] = this.morphIdx[morph] ?? [];
      this.morphIdx[morph].push(i);
      if (blaze) this.blazeIdx.push(i);
    }
    // one instanced mesh per (material, part) — the whole flock costs a
    // dozen draw calls no matter how many birds wander it
    const mkInst = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number): THREE.InstancedMesh => {
      const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = true;
      this.group.add(im);
      return im;
    };
    for (let m = 0; m < bodies.length; m++) {
      const n = morphCounts.get(m) ?? 0;
      if (n <= 0) continue; // an empty morph still costs a draw call — skip it
      this.bodyInst[m] = mkInst(pigeonBodyGeo, bodies[m], n);
      this.tailInst[m] = mkInst(pigeonTailGeo, bodies[m], n);
      this.wingInst[m] = mkInst(pigeonWingGeo, bodies[m], n * 2); // the pair
    }
    this.skullInst = mkInst(pigeonHeadGeo, mats.head, count);
    this.beakInst = mkInst(pigeonBeakGeo, mats.beak, count);
    if (mats.patch && this.blazeIdx.length > 0) {
      this.blazeInst = mkInst(pigeonBlazeGeo, mats.patch, this.blazeIdx.length);
    }
    this.allInst = [...this.bodyInst, ...this.tailInst, ...this.wingInst, this.skullInst, this.beakInst]
      .filter((x) => !!x); // skipped morphs leave sparse-array holes
    if (this.blazeInst) this.allInst.push(this.blazeInst);
    this.instPtr = new Array<number>(this.bodyInst.length).fill(0);
    scene.add(this.group);
    this.writeMatrices();
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

  /** Live per-bird pose for the probes: resting heights (env5), wing states
   *  (env6). Order matches `birds`. */
  restSnapshot(): Array<{ y: number; wingsVisible: boolean; wingRotZ: number }> {
    return this.birds.map((b) => ({ y: b.y, wingsVisible: b.wingsVisible, wingRotZ: b.wingRotZ }));
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
          b.y = this.groundY + Math.sin(Math.PI * k) * 1.15;
          b.facing = Math.atan2(b.flyTo.x - b.flyFrom.x, b.flyTo.z - b.flyFrom.z);
          // two flap beats over the arc — wings hinge at the body and beat
          // at the tail's cadence, so body, tail, and wings read as one animal
          b.tailRotX = 0.28 + Math.sin(b.flyAge * 26) * 0.35;
          b.wingsVisible = true;
          b.wingRotZ = Math.sin(b.flyAge * 26) * 0.55;
          if (k >= 1) {
            b.y = this.groundY;
            b.tailRotX = 0.28;
            b.headZ = 0.13; // never land mid-bob
            b.wingsVisible = false; // folded again — and skipped by the renderer
            b.wingRotZ = 0;
            b.mode = 'idle';
            b.timer = 0.6 + (b.phase % 0.9);
          }
          break;
        }
        case 'idle': {
          b.timer -= dt;
          b.headRotX = Math.sin(b.phase * 1.3) * 0.16; // glancing about
          b.headRotY = Math.sin(b.phase * 0.7) * 0.4;
          // unwind the walk-bob: the head eases back to rest, mid-stride or not
          b.headZ += (0.13 - b.headZ) * Math.min(1, dt * 12);
          if (b.timer <= 0) {
            const roll = (b.phase * 7.13) % 1;
            if (roll < 0.45) {
              // wander to a nearby spot
              const a = (b.phase * 3.7) % (Math.PI * 2);
              const r = 0.5 + (b.phase % 0.8);
              b.target = {
                x: this.home.x + (b.pos.x - this.home.x) * 0.2 + Math.sin(a) * r,
                z: this.home.z + (b.pos.z - this.home.z) * 0.2 + Math.cos(a) * r,
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
            b.facing = Math.atan2(dx, dz);
            // the head-bob walk: body dips at stride frequency
            b.y = this.groundY + Math.abs(Math.sin(b.phase * 9)) * 0.015;
            b.headZ = 0.13 + Math.sin(b.phase * 9) * 0.03;
          }
          break;
        }
        case 'peck': {
          b.timer -= dt;
          b.headRotX = 0.55 + Math.sin(b.phase * 6.5) * 0.28; // dabbing the pavement
          b.headRotY = 0;
          b.headZ += (0.13 - b.headZ) * Math.min(1, dt * 12);
          if (b.timer <= 0) {
            b.mode = 'idle';
            b.timer = 0.7 + (b.phase % 1.4);
          }
          break;
        }
      }

      if (b.mode !== 'fly') b.y = b.mode === 'walk' ? b.y : this.groundY;
    }
    this.writeMatrices();
  }

  /** Compose every bird's part matrices from its live state. One scratch
   *  chain, zero allocations — 17 birds × 7 parts is nothing. */
  private writeMatrices(): void {
    const ptr = this.instPtr;
    for (let m = 0; m < ptr.length; m++) ptr[m] = 0;
    let skullPtr = 0, beakPtr = 0, blazePtr = 0;
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      // bird frame: position + yaw
      this.e.set(0, b.facing, 0);
      this.q.setFromEuler(this.e);
      this.v.set(b.pos.x, b.y, b.pos.z);
      this.mBird.compose(this.v, this.q, this.ONE);
      const m = b.morph;
      const bi = this.bodyInst[m], ti = this.tailInst[m], wi = this.wingInst[m];
      if (!bi || !ti || !wi) continue; // a bird's morph always exists — belt and braces

      // body
      this.mPart.compose(this.v.set(0, 0.12, 0), this.q.identity(), this.s.set(0.13, 0.1, 0.17));
      this.mFinal.multiplyMatrices(this.mBird, this.mPart);
      bi.setMatrixAt(ptr[m], this.mFinal);

      // tail (matches the body's plumage)
      this.e.set(b.tailRotX, 0, 0);
      this.mPart.compose(this.v.set(0, 0.13, -0.16), this.q.setFromEuler(this.e), this.s.set(0.09, 0.02, 0.14));
      this.mFinal.multiplyMatrices(this.mBird, this.mPart);
      ti.setMatrixAt(ptr[m], this.mFinal);

      // head frame (skull + beak ride it)
      this.e.set(b.headRotX, b.headRotY, 0);
      this.mPivot.compose(this.v.set(0, 0.2, b.headZ), this.q.setFromEuler(this.e), this.ONE);
      this.mHead.multiplyMatrices(this.mBird, this.mPivot);
      this.mPart.compose(this.v.set(0, 0, 0), this.q.identity(), this.s.set(0.075, 0.075, 0.075));
      this.mFinal.multiplyMatrices(this.mHead, this.mPart);
      this.skullInst.setMatrixAt(skullPtr++, this.mFinal);
      this.mPart.compose(this.v.set(0, -0.005, 0.07), this.q.identity(), this.s.set(0.03, 0.024, 0.07));
      this.mFinal.multiplyMatrices(this.mHead, this.mPart);
      this.beakInst.setMatrixAt(beakPtr++, this.mFinal);

      // blaze (child of the bird, not the head)
      if (this.blazeInst && b.hasBlaze) {
        this.mPart.compose(this.v.set(0, 0.185, 0.085), this.q.identity(), this.s.set(0.055, 0.045, 0.03));
        this.mFinal.multiplyMatrices(this.mBird, this.mPart);
        this.blazeInst.setMatrixAt(blazePtr++, this.mFinal);
      }

      // the wing pair: one instanced mesh, two instances per bird. Hidden
      // wings drop below the world at zero scale — the cheapest "off".
      this.e.set(0, 0, b.wingRotZ);
      this.mPivot.compose(this.v.set(0, 0.14, 0), this.q.setFromEuler(this.e), this.ONE);
      for (const wx of [-0.15, 0.15]) {
        if (b.wingsVisible) {
          this.e.set(0, wx < 0 ? 0.3 : -0.3, 0);
          this.mPart.compose(this.v.set(wx, 0.03, -0.02), this.q.setFromEuler(this.e), this.s.set(0.17, 0.014, 0.075));
        } else {
          this.mPart.compose(this.v.set(0, -999, 0), this.q.identity(), this.ZERO);
        }
        this.mFinal.multiplyMatrices(this.mPivot, this.mPart);
        this.mFinal.premultiply(this.mBird);
        wi.setMatrixAt(ptr[m] * 2 + (wx < 0 ? 0 : 1), this.mFinal);
      }
      ptr[m]++;
    }
    for (const inst of this.allInst) inst.instanceMatrix.needsUpdate = true;
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
