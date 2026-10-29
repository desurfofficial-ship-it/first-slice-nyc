import * as THREE from "three";

import { PAL } from "../world/materials";
import type { SaveData } from "./Save";
import { loadOrDefault, saveBootNote } from "./Save";

export type GameStep = number; // Step.ts owns the real enum; wired at M4.

/**
 * Game — the loop and the state owner (docs/23 §6 state rule):
 * authoritative state lives HERE, outside the scene graph. The renderer
 * and (later) the UI only reflect it.
 *
 * M1 scope: boot, resize, a render loop with honest delta timing, a boot
 * beacon so a screenshot can tell a working render from a black one.
 * The world, player, camera poses and interactions arrive M2–M5.
 */
export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  /** Authoritative state. Scene graph never writes to it. */
  step: GameStep = 0;
  save: SaveData;

  private container: HTMLElement;
  private raf = 0;
  private lastMs = 0;
  private disposed = false;
  private onResize = (): void => this.resize();

  constructor(container: HTMLElement) {
    this.container = container;
    this.save = loadOrDefault();
    if (saveBootNote(this.save)) {
      // A corrupt save already booted as a fresh Day 1 — same rule as save.gd.
      // Nothing to show the player yet; the HUD (M4) will say it warmly.
    }

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PAL.cream);

    // Portrait-first: fov 55, the TS-02 numbers, aspect from the real window.
    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      300,
    );
    this.camera.position.set(0, 6.5, 9);
    this.camera.lookAt(0, 1.2, 0);

    // -- M1 boot beacon: one gold box on stone, lit softly. M2 replaces this
    // with the Doc 10 block; the beacon's job (proving the pipeline) is done.
    const hemi = new THREE.HemisphereLight(PAL.cream, PAL.stone, 1.15);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(PAL.amber, 1.3);
    sun.position.set(-12, 18, 8);
    this.scene.add(sun);

    const beacon = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: PAL.gold }),
    );
    beacon.position.set(0, 0.5, 0);
    beacon.name = "BootBeacon";
    this.scene.add(beacon);

    window.addEventListener("resize", this.onResize);
  }

  start(): void {
    this.lastMs = performance.now();
    const tick = (nowMs: number): void => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(tick);
      // Manual delta (Task 1 lesson): no shared mutable clock, clamp long stalls.
      const dt = Math.min((nowMs - this.lastMs) / 1000, 0.1);
      this.lastMs = nowMs;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Simulation step. State first, render after — the loop stays honest. */
  update(_dt: number): void {
    // M4+: step machine, player, camera poses, interactions.
  }

  resize(): void {
    const w = this.container.clientWidth;
    const h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
