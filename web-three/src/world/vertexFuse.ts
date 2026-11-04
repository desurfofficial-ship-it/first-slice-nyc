/**
 * The vertex-fuse law (docs/51 B13 — the GLB-wrapper and fallback-prop cut).
 *
 * The district bake (`World.bakeStatics`) fuses every flat-colored Lambert
 * static into per-tile vertex-colored batches — but two families live
 * outside its reach, by correct law:
 *
 *  1. GLB wrappers (`glbProps`) — the bake must never swallow them, because
 *     the async upgrade swaps the whole object after the bake runs. The two
 *     vehicles that do ship (car_taxi, car_sedan) land as one mesh PER
 *     MATERIAL: 7 draws for the cab, 6 for the sedan, forever.
 *  2. Procedural fallbacks whose upgrade can never land (no models/mailbox.glb
 *     or models/trashcan.glb ships) — they stay in `glbProps` too, so the
 *     bake never takes them either.
 *
 * This module is the same lever, applied one level down: fuse a prop's OWN
 * parts into ONE vertex-colored mesh on the shared `vcMaterial` — inside the
 * wrapper or the group, so the wrapper keeps moving as a body (the cab drives
 * as one), district visibility keeps hiding it as one, and the bake law stays
 * untouched. The color ride is the statics' own law: the source's exact
 * material color becomes a per-vertex attribute on a white `vertexColors`
 * material — bit-for-bit the same shade.
 *
 * The bail law is mergeGltfParts' law, kept strict — ANY part that would not
 * survive the fusion with its look intact (a map, transparency, an emissive
 * tint, metalness, back-face materials, opacity, skinning, per-part shadow
 * flags that disagree, multi-material groups, unindexed geometry) bails the
 * WHOLE prop: the caller keeps the original scene untouched.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface FuseResult {
  /** The object to use going forward — the fused group on success, the
   *  ORIGINAL root untouched on bail. */
  root: THREE.Object3D;
  /** true = the root was fused (the original root's children are disposed). */
  fused: boolean;
  /** How many draw calls the returned root costs for its parts. */
  draws: number;
}

export function fuseFlatParts(root: THREE.Object3D, vcMat: THREE.Material): FuseResult {
  const parts: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) parts.push(m); });
  if (parts.length < 2) return { root, fused: false, draws: parts.length };

  let cast: boolean | null = null;
  let receive: boolean | null = null;
  const geos: THREE.BufferGeometry[] = [];
  for (const m of parts) {
    // a single material over grouped geometry (BoxGeometry's six face
    // groups) draws once and flattens in the merge — only a real
    // multi-material ARRAY changes the look per group and bails
    if (Array.isArray(m.material) || !m.geometry.index) return bail(geos, root, parts.length);
    if ((m as THREE.SkinnedMesh).isSkinnedMesh) return bail(geos, root, parts.length);
    const mat = m.material as THREE.MeshLambertMaterial;
    if (!mat || mat.map || mat.transparent || mat.vertexColors) return bail(geos, root, parts.length);
    if (mat.opacity < 1) return bail(geos, root, parts.length);
    if (mat.side !== THREE.FrontSide) return bail(geos, root, parts.length);
    if (mat.emissive && mat.emissive.getHexString() !== '000000') return bail(geos, root, parts.length);
    const metalness = (mat as unknown as THREE.MeshStandardMaterial).metalness ?? 0;
    if (metalness > 0) return bail(geos, root, parts.length);
    // one look per prop: mixed shadow flags would change on the fused mesh
    if (cast === null) { cast = m.castShadow; receive = m.receiveShadow; }
    else if (cast !== m.castShadow || receive !== m.receiveShadow) return bail(geos, root, parts.length);

    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) {
      // the GLB seam ships position-only parts (the bake's own guard refuses
      // them for the same reason) — computed per-face normals light the fused
      // draw exactly like every Lambert prop in the world; un-lit, the fused
      // mesh reads as a black sticker in any rig
      g.computeVertexNormals();
    }
    const pos = g.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    const c = mat.color;
    for (let i = 0; i < pos.count; i++) {
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    geos.push(g);
  }

  const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  if (!merged) return bail(geos, root, parts.length);
  merged.computeBoundingSphere();

  const fusedRoot = new THREE.Group();
  fusedRoot.name = root.name;
  const mesh = new THREE.Mesh(merged, vcMat);
  mesh.name = 'VCFused';
  mesh.castShadow = cast!;
  mesh.receiveShadow = receive!;
  fusedRoot.add(mesh);

  // the sources are consumed: dispose the originals (their data lives on in
  // the merged attributes) and the per-part materials (unique per load)
  for (const m of parts) {
    m.parent?.remove(m);
    m.geometry.dispose();
    (m.material as THREE.Material)?.dispose?.();
  }
  for (const g of geos) if (g !== merged) g.dispose();
  return { root: fusedRoot, fused: true, draws: 1 };
}

function bail(geos: THREE.BufferGeometry[], root: THREE.Object3D, draws: number): FuseResult {
  for (const g of geos) g.dispose(); // the clones — the originals never left
  return { root, fused: false, draws };
}
