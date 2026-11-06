/**
 * Sandflow/sand3d asset evaluation showcase — DEV ONLY.
 *
 * Loaded exclusively via `?showcase=sandflow` (see src/main.ts). It never runs
 * in the normal first-session experience, touches no save data, and reuses the
 * game's conventions: Doc-04 palette, NeutralToneMapping, PCFSoft shadows,
 * amber fog. Assets come from public/models-experimental/sandflow/ (isolated
 * from production /public/models/). Honors the GLB seam law: a missing file is
 * skipped with one console.info and no retry.
 *
 * Reports measured facts only: renderer.info draw calls / triangles, per-asset
 * triangle and mesh counts, rolling FPS, and the s3d_joint extras payload that
 * sand3d bakes into node extras (pivots + limits), driven here at runtime.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PAL } from '../core/palette';

const BASE = 'models-experimental/sandflow/';
const ASSETS = [
  'hydrant', 'dsny_basket', 'recycling_bin', 'park_bench', 'streetlight', 'newsrack',
  'apartment_door', 'security_gate', 'storefront', 'washing_machine', 'refrigerator', 'bodega_shelf',
] as const;

interface AssetRecord {
  name: string;
  root: THREE.Object3D;
  tris: number;
  meshes: number;
  materials: number;
  textures: number;
  bytes: number;
  size: THREE.Vector3;
  center: THREE.Vector3;
  radius: number;
  joints: JointRecord[];
}

interface JointRecord {
  name: string;
  kind: string;
  node: THREE.Object3D;
  axis: THREE.Vector3;
  lower: number;
  upper: number;
}

const records: AssetRecord[] = [];
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let panel: HTMLDivElement;
let detail: HTMLDivElement;
let focused: AssetRecord | null = null;
let spawnGroup: THREE.Group | null = null;
let instanceMesh: THREE.InstancedMesh | null = null;
let frames = 0;
let fpsTime = 0;
let fps = 0;
let orbitTarget = new THREE.Vector3(0, 1.2, 0);
let animateJoints = true;

export function runSandflowShowcase(): void {
  const container = document.getElementById('app');
  if (!container) throw new Error('#app container missing');
  void container;
  for (const id of ['loading', 'hud', 'pocket', 'map-panel', 'wardrobe-panel', 'cine']) {
    const el = document.getElementById(id);
    if (el) (el as HTMLElement).style.display = 'none';
  }

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  Object.assign(renderer.domElement.style, { position: 'fixed', inset: '0', zIndex: '5' });
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.amber);
  scene.fog = new THREE.Fog(PAL.amber, 60, 260);

  const hemi = new THREE.HemisphereLight(0xfff3dd, 0x8a7666, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PAL.amber, 1.3);
  sun.position.set(18, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshLambertMaterial({ color: PAL.walk }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(19, 11, 27);
  camera.lookAt(orbitTarget);
  setupOrbit();

  panel = buildPanel();
  detail = buildDetail();

  const loader = new GLTFLoader();
  void loadAll(loader);

  (window as unknown as { __SANDFLOW_SHOWCASE: unknown }).__SANDFLOW_SHOWCASE = {
    records, renderer, scene, camera,
  };
  (window as unknown as { __SANDFLOW_SHOWCASE_READY: boolean }).__SANDFLOW_SHOWCASE_READY = true;

  renderer.setAnimationLoop(tick);
}

function loadAll(loader: GLTFLoader): void {
  let pending = ASSETS.length + 1; // + baseline hydrant
  const done = (): void => {
    pending -= 1;
    if (pending === 0) {
      layoutGrid();
      refreshPanel();
    }
  };
  for (const name of ASSETS) {
    loader.load(
      BASE + name + '.glb',
      (gltf) => {
        try {
          records.push(buildRecord(name, BASE + name + '.glb', gltf.scene, done));
        } catch (err) {
          console.info(`[sandflow-showcase] ${name} unusable:`, err);
          done();
        }
      },
      undefined,
      () => {
        console.info(`[sandflow-showcase] ${name}.glb missing — skipped (seam law)`);
        done();
      },
    );
  }
  // comparison baseline: the game's own production hydrant
  loader.load(
    'models/hydrant.glb',
    (gltf) => {
      records.push(buildRecord('hydrant (game baseline)', 'models/hydrant.glb', gltf.scene, done));
    },
    undefined,
    () => {
      console.info('[sandflow-showcase] baseline hydrant missing — skipped');
      done();
    },
  );
}

function buildRecord(name: string, url: string, root: THREE.Object3D, done: () => void): AssetRecord {
  let tris = 0;
  let meshes = 0;
  const matSet = new Set<string>();
  let textures = 0;
  const joints: JointRecord[] = [];
  root.traverse((ob) => {
    const mesh = ob as THREE.Mesh;
    if (mesh.isMesh) {
      meshes += 1;
      const geo = mesh.geometry as THREE.BufferGeometry;
      const idx = geo.getIndex();
      tris += (idx ? idx.count : geo.getAttribute('position').count) / 3;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        matSet.add(m.uuid);
        for (const key of Object.keys(m)) {
          const v = (m as unknown as Record<string, unknown>)[key];
          if (v && (v as THREE.Texture).isTexture) textures += 1;
        }
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    const extras = (ob.userData ?? {}) as Record<string, unknown>;
    if (extras['s3d_joint']) {
      const j = extras['s3d_joint'] as Record<string, unknown>;
      const axis = (j['axis'] as number[] | undefined) ?? [0, 1, 0];
      joints.push({
        name: String(j['name'] ?? ob.name),
        kind: String(j['type'] ?? j['kind'] ?? 'revolute'),
        node: ob,
        axis: new THREE.Vector3(axis[0], axis[1], axis[2]).normalize(),
        lower: typeof j['lower'] === 'number' ? j['lower'] : -Math.PI / 2,
        upper: typeof j['upper'] === 'number' ? j['upper'] : Math.PI / 2,
      });
    }
  });
  fetch(url, { method: 'HEAD' })
    .then((r) => r.headers.get('content-length'))
    .then((len) => {
      const rec = records.find((x) => x.name === name);
      if (rec && len) rec.bytes = Number(len);
    })
    .catch(() => undefined);
  scene.add(root);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  done();
  return {
    name, root, tris: Math.round(tris), meshes, materials: matSet.size, textures,
    bytes: 0, size, center, radius: Math.max(size.x, size.y, size.z) / 2, joints,
  };
}

function layoutGrid(): void {
  const cols = 4;
  const cell = 6;
  records.forEach((rec, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const dx = (col - (cols - 1) / 2) * cell;
    const dz = (row - 1.5) * cell * 1.6;
    rec.root.position.set(dx - rec.center.x, 0, dz - rec.center.z);
    const box = new THREE.Box3().setFromObject(rec.root);
    rec.root.position.y -= box.min.y; // sit exactly on the ground
  });
}

function buildPanel(): HTMLDivElement {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', top: '12px', left: '12px', zIndex: '20',
    background: 'rgba(26,20,32,0.88)', color: '#fff8f0', padding: '12px',
    borderRadius: '10px', font: '12px/1.5 ui-monospace,monospace',
    maxHeight: '80vh', overflowY: 'auto', minWidth: '270px',
  } satisfies Partial<CSSStyleDeclaration>);
  el.innerHTML = `<b style="color:#f7b32b">SAND3D EVAL — ${ASSETS.length} assets</b>
    <div id="sf-list" style="margin:8px 0"></div>
    <div id="sf-totals" style="border-top:1px solid #6d4c7d;padding-top:6px;white-space:pre"></div>
    <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
      <button id="sf-clone">Clone 100 hydrants</button>
      <button id="sf-inst">InstancedMesh 100</button>
      <button id="sf-clear">Clear row</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#sf-clone')!.addEventListener('click', () => spawnRow(false));
  el.querySelector('#sf-inst')!.addEventListener('click', () => spawnRow(true));
  el.querySelector('#sf-clear')!.addEventListener('click', clearRow);
  return el;
}

function refreshPanel(): void {
  const list = panel.querySelector('#sf-list') as HTMLDivElement;
  list.innerHTML = '';
  for (const rec of records) {
    const row = document.createElement('div');
    row.style.cursor = 'pointer';
    row.textContent = `${rec.name} — ${rec.tris} tris / ${rec.meshes} mesh / ${rec.materials} mat / joints ${rec.joints.length}`;
    row.addEventListener('click', () => focus(rec));
    list.appendChild(row);
  }
  const totals = panel.querySelector('#sf-totals') as HTMLDivElement;
  totals.textContent = 'measuring…';
}

function kb(n: number): string {
  return n > 0 ? `${(n / 1024).toFixed(0)} KB` : '—';
}

function buildDetail(): HTMLDivElement {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', top: '12px', right: '12px', zIndex: '20',
    background: 'rgba(26,20,32,0.88)', color: '#fff8f0', padding: '12px',
    borderRadius: '10px', font: '12px/1.5 ui-monospace,monospace',
    maxHeight: '70vh', overflowY: 'auto', width: '320px', whiteSpace: 'pre-wrap',
  } satisfies Partial<CSSStyleDeclaration>);
  el.innerHTML = '<b style="color:#f7b32b">INSPECTOR</b><div id="sf-detail">click an asset</div>';
  document.body.appendChild(el);
  return el;
}

function focus(rec: AssetRecord): void {
  focused = rec;
  const d0 = Math.max(rec.radius * 3.2, 2.2);
  camera.position.set(
    rec.root.position.x + d0 * 0.72,
    rec.root.position.y + d0 * 0.55,
    rec.root.position.z + d0 * 0.72,
  );
  orbitTarget = rec.root.position.clone().setY(rec.root.position.y + rec.size.y * 0.45);
  const d = detail.querySelector('#sf-detail') as HTMLDivElement;
  d.dataset.hold = '1';
  const jointLines = rec.joints
    .map((j) => `  · ${j.name} (${j.kind}) axis (${j.axis.x.toFixed(2)}, ${j.axis.y.toFixed(2)}, ${j.axis.z.toFixed(2)}) [${j.lower.toFixed(2)}, ${j.upper.toFixed(2)}] rad`)
    .join('\n');
  d.textContent =
    `${rec.name}\nfile ${kb(rec.bytes)} · ${rec.tris.toLocaleString()} tris · ${rec.meshes} meshes · ${rec.materials} materials · ${rec.textures} textures\n` +
    `size (m): ${rec.size.x.toFixed(2)} × ${rec.size.z.toFixed(2)} × ${rec.size.y.toFixed(2)}\n` +
    (rec.joints.length ? `s3d_joint extras:\n${jointLines}\n` : 'no joints\n') +
    (rec.joints.length ? '\nslider to pose · uncheck below to freeze' : '');
  if (rec.joints.length) buildJointSliders(rec);
  const anim = document.createElement('label');
  anim.innerHTML = '<input type="checkbox" checked id="sf-anim"> animate joints';
  d.appendChild(anim);
  anim.querySelector('#sf-anim')!.addEventListener('change', (e) => {
    animateJoints = (e.target as HTMLInputElement).checked;
    if (!animateJoints) d.dataset.hold = '1';
    else delete d.dataset.hold;
  });
}

function buildJointSliders(rec: AssetRecord): void {
  const d = detail.querySelector('#sf-detail') as HTMLDivElement;
  for (const j of rec.joints) {
    const wrap = document.createElement('div');
    wrap.style.marginTop = '6px';
    const label = document.createElement('label');
    label.textContent = `${j.name}: 0.00 rad`;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(j.lower);
    slider.max = String(j.upper);
    slider.step = '0.001';
    slider.value = String(j.upper);
    slider.style.width = '100%';
    slider.addEventListener('input', () => {
      poseJoint(j, Number(slider.value));
      label.textContent = `${j.name}: ${Number(slider.value).toFixed(2)} rad`;
    });
    poseJoint(j, j.upper);
    wrap.appendChild(label);
    wrap.appendChild(slider);
    d.appendChild(wrap);
  }
}

/** The whole point of the articulation experiment: the GLB carries the pivot
 * node and its limits in extras; three.js rotates the pivot node itself. */
function poseJoint(j: JointRecord, value: number): void {
  const clamped = Math.max(j.lower, Math.min(j.upper, value));
  if (j.kind === 'prismatic') {
    j.node.position.copy(j.axis).multiplyScalar(clamped);
  } else {
    j.node.quaternion.setFromAxisAngle(j.axis, clamped);
  }
}

function spawnRow(instanced: boolean): void {
  clearRow();
  const base = records.find((r) => r.name === 'hydrant');
  if (!base) return;
  const parts: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = [];
  base.root.traverse((ob) => {
    const m = ob as THREE.Mesh;
    if (m.isMesh) parts.push({ geo: m.geometry, mat: m.material as THREE.Material });
  });
  const N = 10;
  const gap = 1.2;
  const origin = new THREE.Vector3(-((N - 1) * gap) / 2, 0, 30);
  if (instanced) {
    for (const { geo, mat } of parts) {
      const inst = new THREE.InstancedMesh(geo, mat, N * N);
      let k = 0;
      const mtx = new THREE.Matrix4();
      for (let i = 0; i < N; i++) {
        for (let jj = 0; jj < N; jj++) {
          mtx.setPosition(origin.x + i * gap, 0, origin.z + jj * gap);
          inst.setMatrixAt(k++, mtx);
        }
      }
      inst.castShadow = true;
      scene.add(inst);
      instanceMesh = inst;
    }
    setTotalsNote(`InstancedMesh: ${parts.length} draw calls for ${N * N} hydrants`);
  } else {
    spawnGroup = new THREE.Group();
    for (let i = 0; i < N; i++) {
      for (let jj = 0; jj < N; jj++) {
        const clone = base.root.clone(true);
        clone.position.set(origin.x + i * gap, 0, origin.z + jj * gap);
        spawnGroup.add(clone);
      }
    }
    scene.add(spawnGroup);
    setTotalsNote(`Cloned meshes: ~${N * N * parts.length} draw calls for ${N * N} hydrants`);
  }
}

function setTotalsNote(note: string): void {
  const totals = panel.querySelector('#sf-totals') as HTMLDivElement;
  totals.dataset.note = note;
}

function clearRow(): void {
  if (spawnGroup) {
    scene.remove(spawnGroup);
    spawnGroup = null;
  }
  if (instanceMesh) {
    scene.remove(instanceMesh);
    instanceMesh.dispose();
    instanceMesh = null;
  }
}

function setupOrbit(): void {
  let dragging = false;
  let px = 0;
  let py = 0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    px = e.clientX;
    py = e.clientY;
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - px;
    const dy = e.clientY - py;
    px = e.clientX;
    py = e.clientY;
    const off = camera.position.clone().sub(orbitTarget);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta -= dx * 0.005;
    sph.phi = Math.max(0.15, Math.min(1.45, sph.phi - dy * 0.005));
    camera.position.copy(orbitTarget).add(new THREE.Vector3().setFromSpherical(sph));
    camera.lookAt(orbitTarget);
  });
  el.addEventListener('wheel', (e) => {
    const off = camera.position.clone().sub(orbitTarget);
    off.multiplyScalar(e.deltaY > 0 ? 1.1 : 0.9);
    camera.position.copy(orbitTarget).add(off);
  }, { passive: true });
}

function tick(): void {
  if (animateJoints && focused && focused.joints.length && !detail.dataset.hold) {
    const t = performance.now() / 1000;
    focused.joints.forEach((j, i) => {
      const mid = (j.upper + j.lower) / 2;
      const amp = (j.upper - j.lower) / 2;
      poseJoint(j, mid + amp * Math.sin(t * 0.9 + i * 1.3));
    });
  }
  renderer.render(scene, camera);
  frames += 1;
  const now = performance.now();
  if (now - fpsTime > 500) {
    fps = Math.round((frames * 1000) / (now - fpsTime));
    frames = 0;
    fpsTime = now;
    const totals = panel.querySelector('#sf-totals') as HTMLDivElement;
    const info = renderer.info;
    totals.textContent =
      `pack: ${records.length - 1} assets\n` +
      `draw calls: ${info.render.calls} · triangles: ${info.render.triangles.toLocaleString()}\n` +
      `geometries ${info.memory.geometries} · textures ${info.memory.textures}\n` +
      `FPS: ${fps}` +
      (totals.dataset.note ? `\n${totals.dataset.note}` : '');
  }
}
