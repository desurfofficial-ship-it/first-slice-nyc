import * as THREE from "three";

import { PAL } from "./materials";

/**
 * Day1World — the Doc 10 block, built procedurally (M2).
 * The oracle is greybox-godot/scripts/main.gd `_build_world()`: same layout,
 * same footprint numbers, same palette. Placeholder until M2 lands.
 *
 * Layout truth from the oracle (z+ = north, the bodega side):
 *   road z ∈ [-4.1, 4.1] · sidewalks beyond · bodega around (-16, 7..18)
 *   cart spot (4, -5.2) · fire escape x ∈ [9.4, 15.8] on z = -7.2
 *   crosswalk at x = -5 · player spawn (-30, 6.2)
 */
export class Day1World {
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    this.group.name = "Day1World";
    // M2: road, sidewalks, crosswalk stripes, buildings, bodega + interior,
    // fire escape, skyline card. One material per palette key (materials.ts).
    this.group.add(new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.1, 1),
      new THREE.MeshStandardMaterial({ color: PAL.stone }),
    ));
    scene.add(this.group);
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
  }
}
