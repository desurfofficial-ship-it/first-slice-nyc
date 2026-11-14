/**
 * The far-skyline landmark silhouettes — construction techniques ported
 * from mrdoob/slop-newyork's custom landmark builds (MIT, Copyright (c)
 * 2026 Mr.doob — see THIRD-PARTY-NOTICES.md (repo root)) and re-scaled for
 * FIRST SLICE's skyline card (the far north band — W-N5 moved the seats
 * z 88..95 -> z 226..232: the North Depth took the old ground and the
 * landmark silhouettes stood IN Linden Hill's green; they read from the
 * merged far row now, fog:false, deco-only, zero colliders).
 *
 * Ported techniques (docs/slop-integration/01-SOURCE-REUSE-REPORT.md):
 *   - stepped-setback art-deco tower .. js/landmarks.js 193–311 (the Empire
 *     State construction: podium → tiers → shaft → observation deck →
 *     crown mast → dome → spire → beacon), re-scaled to silhouette height
 *   - terraced crown with needle ...... js/landmarks.js 316–399 (the
 *     Chrysler crown: stacked shrinking arcs + the needle) — the arcs read
 *     as stacked cylinders at this distance
 *   - wedge tower ...................... js/landmarks.js 862–906 (the
 *     Flatiron triangular extrusion, squared to a prism for the card)
 *   - glass sliver pair ................ the curtain-wall palette row
 *     (js/buildings.js facade preset 4 tones) as tall slab masses
 *
 * House rules: everything here is deco (no collider, no shadow, no fog) in
 * PAL.skyline-family tones — the existing card's law. Static Lambert,
 * pre-bake, so the pieces fuse into their tile like the rest of the band.
 */

import * as THREE from 'three';

let _box: THREE.BoxGeometry | null = null;
let _cyl: THREE.CylinderGeometry | null = null;
let _cone: THREE.ConeGeometry | null = null;
function box(): THREE.BoxGeometry { return (_box ??= new THREE.BoxGeometry(1, 1, 1)); }
function cyl(): THREE.CylinderGeometry { return (_cyl ??= new THREE.CylinderGeometry(0.5, 0.5, 1, 10)); }
function cone(): THREE.ConeGeometry { return (_cone ??= new THREE.ConeGeometry(0.5, 1, 10)); }

function place(geo: THREE.BufferGeometry, mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

/** One silhouette group at (x, z) facing the city (the player looks north,
 *  so the south face is the read). Every mesh is a fogless Lambert. */
function silhouetteRoot(scene: THREE.Scene, mat: THREE.MeshLambertMaterial, name: string, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, 0, z);
  scene.add(g);
  void mat;
  return g;
}

/**
 * Build the landmark silhouettes onto the skyline band. `matStone` is the
 * skyline mass tone, `matGlass` a curtain-wall tone (a documented
 * darkened-plum/steel read), `matWarm` the crown's flood-lit trim.
 */
export function buildSkylineLandmarks(
  scene: THREE.Scene,
  matStone: THREE.MeshLambertMaterial,
  matGlass: THREE.MeshLambertMaterial,
  matTrim: THREE.MeshLambertMaterial,
): void {
  // ---- 1. the stepped-setback deco tower (the ESB construction) ---------
  // podium 20 → tier 16 → tier 12 → shaft → deck → mast → dome → spire
  {
    const g = silhouetteRoot(scene, matStone, 'SKY_LMK_Decow', -58, 228);
    const h = 58; // silhouette scale (the source's 443 m towers read ~80 here)
    const podium = 12;
    g.add(place(box(), matStone, 11, podium, 7, 0, podium / 2, 0));
    g.add(place(box(), matStone, 8.5, h * 0.28, 5.5, 0, podium + h * 0.14, 0));
    g.add(place(box(), matStone, 6.5, h * 0.26, 4.4, 0, podium + h * 0.28 + h * 0.13, 0));
    const shaftTop = podium + h * 0.54;
    g.add(place(box(), matStone, 4.6, h * 0.42, 3.4, 0, shaftTop + h * 0.21, 0));
    // observation deck + its mullion band
    g.add(place(box(), matTrim, 5.2, 1.0, 4.0, 0, shaftTop + h * 0.42, 0));
    g.add(place(box(), matGlass, 4.0, 2.6, 3.0, 0, shaftTop + h * 0.42 + 1.8, 0));
    // crown mast + dome + spire + beacon
    const crownY = shaftTop + h * 0.42 + 3.2;
    g.add(place(cyl(), matStone, 2.6, 5.0, 2.6, 0, crownY + 2.5, 0));
    g.add(place(cyl(), matTrim, 1.6, 1.4, 1.6, 0, crownY + 5.6, 0));
    g.add(place(cone(), matStone, 1.2, 4.5, 1.2, 0, crownY + 8.4, 0));
    g.add(place(cyl(), matTrim, 0.16, 3.4, 0.16, 0, crownY + 12.2, 0));
  }
  // ---- 2. the terraced-crown tower (the Chrysler construction) ----------
  {
    const g = silhouetteRoot(scene, matStone, 'SKY_LMK_Crown', 64, 232);
    const h = 52;
    g.add(place(box(), matStone, 9, h * 0.62, 6.5, 0, h * 0.31, 0));
    // the terraced crown: six shrinking arcs stacked into the needle
    const arcs = 6;
    let cy = h * 0.62;
    let ar = 3.4;
    for (let i = 0; i < arcs; i++) {
      const ah = 2.0 - i * 0.18;
      g.add(place(cyl(), matStone, ar * 2, ah, ar * 2, 0, cy + ah / 2, 0));
      g.add(place(cyl(), matTrim, ar * 2.04, ah * 0.16, ar * 2.04, 0, cy + ah * 0.12, 0));
      cy += ah;
      ar *= 0.78;
    }
    g.add(place(cone(), matTrim, 1.0, 7.5, 1.0, 0, cy + 3.7, 0));
    g.add(place(cyl(), matTrim, 0.12, 2.2, 0.12, 0, cy + 8.4, 0));
    // the four setback gargoyles read as corner nubs at this range
    for (const [cx, cz] of [[-4.2, -2.9], [4.2, -2.9], [-4.2, 2.9], [4.2, 2.9]] as const) {
      g.add(place(cone(), matStone, 0.7, 2.2, 0.7, cx, h * 0.62 + 1.0, cz));
    }
  }
  // ---- 3. the glass sliver pair (the curtain-wall preset tones) ---------
  {
    const g = silhouetteRoot(scene, matGlass, 'SKY_LMK_Glass', 78, 230);
    g.add(place(box(), matGlass, 5.5, 78, 5.5, 0, 39, 0));
    g.add(place(box(), matTrim, 6.1, 1.4, 6.1, 0, 78.6, 0));
    g.add(place(box(), matGlass, 4.2, 64, 4.2, -5.4, 32, 0));
    g.add(place(box(), matTrim, 4.8, 1.1, 4.8, -5.4, 64.4, 0));
  }
  // ---- 4. the wedge tower (the Flatiron prism) ---------------------------
  {
    const g = silhouetteRoot(scene, matStone, 'SKY_LMK_Wedge', -76, 226);
    const w = 5.5;
    const h = 34;
    // a squared prism with a chamfered prow reads as the wedge at distance
    g.add(place(box(), matStone, w, h, 7.5, 0, h / 2, 0));
    g.add(place(box(), matStone, w * 0.55, h, 6.4, w * 0.42, h / 2, 0));
    g.add(place(box(), matTrim, w + 0.3, 0.8, 7.8, 0, h + 0.4, 0));
  }
  // ---- 5. two mid-band masonry masses to knit the row together ----------
  {
    const g = silhouetteRoot(scene, matStone, 'SKY_LMK_Midband', -36, 231);
    g.add(place(box(), matStone, 8, 26, 6, 0, 13, 0));
    g.add(place(box(), matStone, 6, 38, 5, 0.5, 19 + 6, 0.5));
    g.add(place(box(), matTrim, 6.5, 0.6, 5.5, 0.5, 44.2, 0.5));
    const g2 = silhouetteRoot(scene, matStone, 'SKY_LMK_Midband2', 46, 229);
    g2.add(place(box(), matStone, 7, 22, 6, 0, 11, 0));
    g2.add(place(box(), matGlass, 5, 30, 4.6, 0, 22 + 15, 0));
  }
}
