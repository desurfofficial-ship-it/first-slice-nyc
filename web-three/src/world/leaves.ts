/**
 * Leaf drift — early-autumn ambience for the street trees. A few dozen
 * leaves tumble out of the canopies, fall with a sway, rest on the pavement
 * for a while, and return to their tree. Never synchronized, never a storm:
 * at any moment you notice one or two, which is how a New York October
 * actually behaves.
 *
 * One InstancedMesh, one draw call, no textures, per-instance color from the
 * tree palette. Leaves cast no shadows (48 tiny shadows cost more than they
 * say). Frame-rate independent (dt in seconds).
 */

import * as THREE from 'three';

interface LeafSpot { x: number; z: number; r: number; top: number; }

interface Leaf {
  spot: number;
  x: number; y: number; z: number;
  vy: number;
  phase: number;      // sway phase + tumble seed
  swayAmp: number;
  rot: THREE.Euler;   // current tumble
  spin: { x: number; y: number; z: number };
  grounded: number;   // seconds since landing; <0 while falling
}

const FALL_SPEED = 0.55;       // m/s average — a leaf, not a brick
const REST_MIN = 4;
const REST_RANGE = 7;
const GROUND_Y = 0.05;

export class LeafDrift {
  readonly mesh: THREE.InstancedMesh;
  private leaves: Leaf[] = [];
  private spots: LeafSpot[];
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  /**
   * @param spots one entry per street tree: canopy center, radius, top height
   * @param perTree leaves per tree (keep small — restraint is the design)
   */
  constructor(scene: THREE.Scene, spots: LeafSpot[], perTree = 4) {
    this.spots = spots;
    const count = spots.length * perTree;
    const leafGeo = new THREE.BoxGeometry(0.1, 0.012, 0.14);
    const leafMat = new THREE.MeshLambertMaterial({ vertexColors: false });
    // InstancedMesh + instanceColor gives every leaf its own tint
    this.mesh = new THREE.InstancedMesh(leafGeo, leafMat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; // instances span the whole block
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;

    // palette-anchored tints: the two canopy greens + a golden-hour amber
    const tints = [0x5d7d4a, 0x516e42, 0x516e42, 0xffb85c];

    let i = 0;
    for (let s = 0; s < spots.length; s++) {
      for (let k = 0; k < perTree; k++) {
        const leaf = this.spawn(i, s, true);
        this.leaves.push(leaf);
        this.color.setHex(tints[(i + s) % tints.length]);
        this.mesh.setColorAt(i, this.color);
        i++;
      }
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.writeMatrices();
    scene.add(this.mesh);
  }

  /** Place leaf i at its tree's canopy (or already falling/grounded). */
  private spawn(i: number, spot: number, startScattered: boolean): Leaf {
    const s = this.spots[spot];
    const a = (i * 2.399) % (Math.PI * 2); // golden-angle spread, no clumping
    const r = Math.sqrt(((i * 0.618) % 1)) * s.r;
    const grounded = startScattered && i % 3 === 0 ? 1 + (i % 5) : -0.001;
    return {
      spot,
      x: s.x + Math.cos(a) * r,
      z: s.z + Math.sin(a) * r * 0.8,
      y: grounded >= 0 ? GROUND_Y : s.top * (0.8 + ((i * 0.37) % 0.2)),
      vy: FALL_SPEED * (0.8 + ((i * 0.29) % 0.4)),
      phase: i * 1.7,
      swayAmp: 0.25 + ((i * 0.41) % 0.3),
      rot: new THREE.Euler(i * 0.7, i * 1.3, i * 0.5),
      spin: { x: 0.6 + (i % 3) * 0.35, y: 0.4 + (i % 2) * 0.5, z: 0.5 + (i % 4) * 0.3 },
      grounded,
    };
  }

  update(dt: number, time: number): void {
    const windX = 0.22 + Math.sin(time * 0.23) * 0.14;      // slow weather breathing
    const gust = Math.sin(time * 0.71) * 0.5 + Math.sin(time * 1.93) * 0.2;
    for (let i = 0; i < this.leaves.length; i++) {
      const L = this.leaves[i];
      if (L.grounded >= 0) {
        L.grounded += dt;
        // a grounded leaf skitters a few centimetres on a gust, then rests
        L.x += windX * dt * 0.35 * Math.max(0, gust);
        if (L.grounded > REST_MIN + (i % 5) + (L.phase % REST_RANGE)) {
          this.leaves[i] = this.spawn(i, L.spot, false);
        }
      } else {
        L.y -= L.vy * dt;
        L.x += (windX + Math.sin(time * 1.6 + L.phase) * L.swayAmp) * dt;
        L.z += Math.cos(time * 1.3 + L.phase) * L.swayAmp * 0.6 * dt;
        L.rot.x += L.spin.x * dt;
        L.rot.y += L.spin.y * dt;
        L.rot.z += L.spin.z * dt;
        if (L.y <= GROUND_Y) {
          L.y = GROUND_Y;
          L.rot.set(Math.PI / 2 + (L.phase % 0.6) - 0.3, L.phase, 0); // rests flat-ish
          L.grounded = 0;
        }
      }
    }
    this.writeMatrices();
  }

  private writeMatrices(): void {
    for (let i = 0; i < this.leaves.length; i++) {
      const L = this.leaves[i];
      this.dummy.position.set(L.x, L.y, L.z);
      this.dummy.rotation.copy(L.rot);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
