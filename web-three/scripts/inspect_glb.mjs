#!/usr/bin/env node
/** Inspect a GLB: scene graph, node names, world-space bounding boxes. */
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const file = process.argv[2];
const buf = readFileSync(file);
const loader = new GLTFLoader();
loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (gltf) => {
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  console.log('ROOT AABB min:', box.min.toArray().map(v=>v.toFixed(3)), 'max:', box.max.toArray().map(v=>v.toFixed(3)));
  console.log('size:', box.getSize(new THREE.Vector3()).toArray().map(v=>v.toFixed(3)));
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const b = new THREE.Box3().setFromObject(o);
      const size = b.getSize(new THREE.Vector3());
      console.log(
        `MESH ${o.name || '(anon)'} ` +
        `min=(${b.min.x.toFixed(3)},${b.min.y.toFixed(3)},${b.min.z.toFixed(3)}) ` +
        `max=(${b.max.x.toFixed(3)},${b.max.y.toFixed(3)},${b.max.z.toFixed(3)}) ` +
        `size=(${size.x.toFixed(3)},${size.y.toFixed(3)},${size.z.toFixed(3)}) ` +
        `verts=${o.geometry?.attributes?.position?.count ?? 0} mat=#${o.material?.color?.getHexString?.() ?? '?'} ` +
        `rough=${o.material?.roughness ?? '-'} metal=${o.material?.metalness ?? '-'}`,
      );
    } else if (o !== root && o.children?.length === 0 && !(o instanceof THREE.Mesh)) {
      console.log(`NODE ${o.name || '(anon)'} (${o.type})`);
    }
  });
}, (err) => { console.error('PARSE FAIL', err); process.exit(1); });
