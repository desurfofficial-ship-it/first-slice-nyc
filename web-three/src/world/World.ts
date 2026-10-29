/**
 * The Day 1 block — built procedurally from the greybox oracle's exact
 * dimensions (greybox-godot/scripts/main.gd `_build_world`), which implement
 * Doc 10 (Day 1 greybox layout). Palette per Doc 04. Additions beyond the
 * greybox are limited to Doc 04's object canon (water towers, cart string
 * lights) — no new gameplay-bearing geometry.
 */

import * as THREE from 'three';
import { PAL } from '../core/palette';
import { boxFromCenter, type AABB } from '../engine/collide';

export interface LadderInfo { area: AABB; top: number; }

export class World {
  readonly scene = new THREE.Scene();
  readonly colliders: AABB[] = [];

  // zones (main.gd areas)
  readonly crosswalkZone: AABB;
  readonly insideBodegaZone: AABB;
  readonly topLandingZone: AABB;
  readonly ladder1: LadderInfo;
  readonly ladder2: LadderInfo;
  readonly killY = -12;

  // dynamic visual handles
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly skyUniforms: { topColor: THREE.Color; horizonColor: THREE.Color; groundColor: THREE.Color };
  readonly fog: THREE.Fog;
  readonly roof: THREE.Mesh;
  readonly goldWindowMat!: THREE.MeshLambertMaterial;
  readonly secondWindowMat!: THREE.MeshLambertMaterial;
  readonly rosaWindowMat!: THREE.MeshLambertMaterial;
  readonly cartRoot: THREE.Group;
  readonly cartMat: THREE.MeshLambertMaterial;
  readonly cartSign: THREE.Sprite;
  readonly cartAwning: THREE.Group;
  readonly stringLights: THREE.Group;
  readonly taxi: THREE.Group;
  readonly rosa: THREE.Group;
  readonly idris: THREE.Group;
  readonly kidSil: THREE.Group;
  readonly goldGlow: THREE.Sprite;
  readonly secondGlow: THREE.Sprite;

  private steamPoints: THREE.Points;
  private steamSeed: Float32Array;
  private steamLife: Float32Array;

  constructor() {
    const scene = this.scene;
    scene.fog = this.fog = new THREE.Fog(PAL.amber, 40, 170);

    // ---------------- sky (ProceduralSkyMaterial counterpart) ----------------
    this.skyUniforms = {
      topColor: new THREE.Color(PAL.amber).setHex(0x7fa7c9),
      horizonColor: new THREE.Color(PAL.amber),
      groundColor: new THREE.Color(PAL.amber),
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: this.skyUniforms.topColor },
        horizonColor: { value: this.skyUniforms.horizonColor },
        groundColor: { value: this.skyUniforms.groundColor },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 groundColor;
        varying vec3 vDir;
        void main() {
          float h = vDir.y;
          vec3 col = h >= 0.0
            ? mix(horizonColor, topColor, pow(min(h, 1.0), 0.55))
            : mix(horizonColor, groundColor, pow(min(-h, 1.0), 0.5));
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 16), skyMat);
    sky.frustumCulled = false;
    scene.add(sky);

    // ---------------- lights (main.gd "--SETUP--") ----------------
    this.hemi = new THREE.HemisphereLight(0xfff3dd, 0x8a7666, phys(1.0));
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(PAL.amber, phys(1.3));
    this.sun.position.set(-38, 23, 22);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -60;
    this.sun.shadow.camera.right = 60;
    this.sun.shadow.camera.top = 60;
    this.sun.shadow.camera.bottom = -60;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0006;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // ---------------- ground & street (street runs along X) ----------------
    this.solid('Road', 0, -0.1, 0, 100, 0.2, 8, PAL.road, { receive: true, cast: false });
    this.solid('Sidewalk_N', 0, -0.05, 6, 100, 0.3, 4, PAL.walk, { receive: true, cast: false });
    this.solid('Sidewalk_S', 0, -0.05, -6, 100, 0.3, 4, PAL.walk, { receive: true, cast: false });
    for (let i = 0; i < 6; i++) {
      this.deco('Crosswalk', -5, 0.01, -3.3 + i * 1.3, 3, 0.02, 0.6, PAL.cream);
    }

    // ---------------- buildings ----------------
    this.solid('Bldg_N_West', -35.5, 7, 14, 29, 14, 12, PAL.bldg);
    this.solid('Bldg_N_East_A', -1, 9, 14, 20, 18, 12, PAL.bldg2);
    this.solid('Bldg_N_GoldWindow', 15, 5.5, 14, 12, 11, 12, PAL.brick);
    this.solid('Bldg_N_East_B', 35, 8, 14, 28, 16, 12, PAL.bldg);
    this.deco('Terminal_Door', -30, 1.4, 7.95, 3, 2.8, 0.15, PAL.teal);
    this.deco('Terminal_Sign', -30, 3.4, 7.95, 5, 0.8, 0.15, PAL.stone);

    this.solid('Bldg_S_West', -25, 8, -14, 50, 16, 12, PAL.bldg2);
    this.solid('Bldg_S_FireEscape', 13, 7, -14, 26, 14, 12, PAL.brick);
    this.solid('Bldg_S_East', 38, 9, -14, 24, 18, 12, PAL.bldg);

    this.waterTower(-30, 14, 12.5, 1.5);
    this.waterTower(-14, 16, -12.5, 1.7);
    this.waterTower(31, 16, 12.5, 1.4);

    // ---------------- bodega ----------------
    const h = 4.5;
    this.solid('Bodega_Floor', -16, 0.06, 14, 10, 0.1, 12, PAL.interior, { receive: true, cast: false });
    this.solid('Bodega_Wall_W', -20.8, h / 2, 14, 0.4, h, 12, PAL.stone);
    this.solid('Bodega_Wall_E', -11.2, h / 2, 14, 0.4, h, 12, PAL.stone);
    this.solid('Bodega_Wall_Back', -16, h / 2, 19.8, 10, h, 0.4, PAL.stone);
    this.solid('Bodega_Front_L', -19.25, h / 2, 8.2, 3.5, h, 0.4, PAL.brick);
    this.solid('Bodega_Front_R', -12.75, h / 2, 8.2, 3.5, h, 0.4, PAL.brick);
    this.solid('Bodega_Front_Lintel', -16, 3.8, 8.2, 3, 1.4, 0.4, PAL.brick);
    this.rosaWindowMat = this.mat(PAL.amber, { emissive: PAL.amber, emissiveIntensity: 0.55 });
    this.decoMesh('Bodega_Window', new THREE.BoxGeometry(2.6, 1.6, 0.05), this.rosaWindowMat, -19.25, 1.8, 7.98);
    this.deco('Bodega_Awning', -16, 3.2, 7.4, 10, 0.15, 1.4, PAL.teal);
    this.roof = this.solid('Bodega_Roof', -16, h + 0.15, 14, 10, 0.3, 12, PAL.bldg);
    this.solid('Bodega_Counter', -19.6, 0.55, 13.5, 1.2, 1.1, 6, PAL.teal);
    this.solid('Bodega_BackShelf', -16, 1.0, 19.3, 6, 2.0, 0.6, PAL.bldg2);

    // ---------------- props ----------------
    this.deco('Manhole', -10, 0.01, 0.5, 1.2, 0.02, 1.2, PAL.manhole);
    const hydrant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.9, 10),
      this.mat(PAL.coral),
    );
    hydrant.position.set(-0.6, 0.45, -4.6);
    hydrant.castShadow = true;
    this.scene.add(hydrant);

    this.taxi = new THREE.Group();
    const taxiBody = new THREE.Mesh(new THREE.BoxGeometry(4, 1.0, 1.9), this.mat(PAL.taxi));
    taxiBody.position.y = 0.55;
    const taxiCab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 1.7), this.mat(PAL.taxi));
    taxiCab.position.set(-0.2, 1.35, 0);
    this.taxi.add(taxiBody, taxiCab);
    const wheelMat = this.mat(PAL.manhole);
    for (const [wx, wz] of [[-1.3, 0.95], [1.3, 0.95], [-1.3, -0.95], [1.3, -0.95]] as const) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, 0.32, wz);
      this.taxi.add(w);
    }
    this.taxi.position.set(-45, 0, -2);
    this.scene.add(this.taxi);

    this.deco('PlayerCorner', 4, 0.11, -6, 8, 0.02, 3.6, PAL.stone);

    // ---------------- fire escape ----------------
    const railCol = PAL.ink;
    this.solid('Landing_1', 13, 4.0, -7.3, 6, 0.15, 1.4, railCol);
    this.solid('Landing_2', 13, 8.0, -7.3, 6, 0.15, 1.4, railCol);
    this.deco('Rail_1', 13, 4.5, -6.62, 6, 0.9, 0.05, railCol);
    this.deco('Rail_2', 13, 8.5, -6.62, 6, 0.9, 0.05, railCol);
    this.deco('Ladder_1_Mesh', 9.4, 2.2, -7.75, 0.6, 4.4, 0.08, railCol);
    this.deco('Ladder_2_Mesh', 16.6, 6.2, -7.75, 0.6, 4.4, 0.08, railCol);
    this.ladder1 = { area: boxFromCenter(9.4, 2.4, -7.75, 1.0, 4.8, 1.4), top: 4.35 };
    this.ladder2 = { area: boxFromCenter(16.4, 6.6, -7.75, 1.6, 4.8, 1.4), top: 8.35 };
    this.topLandingZone = boxFromCenter(12.5, 9.0, -7.3, 4.5, 1.8, 1.4);

    // ---------------- windows + gold ----------------
    const dim = PAL.windowDim;
    const dimMat = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const p = [10.5 + col * 3, 3 + row * 3, 7.94] as const;
        if (row === 2 && col === 1) {
          this.goldWindowMat = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
          this.decoMesh('GoldWindow', new THREE.BoxGeometry(1.2, 1.6, 0.08), this.goldWindowMat, p[0], p[1], p[2]);
        } else if (row === 2 && col === 0) {
          this.secondWindowMat = this.mat(dim, { emissive: PAL.gold, emissiveIntensity: 0 });
          this.decoMesh('SecondWindow', new THREE.BoxGeometry(1.2, 1.6, 0.08), this.secondWindowMat, p[0], p[1], p[2]);
        } else {
          this.decoMesh(`Window_${row}_${col}`, new THREE.BoxGeometry(1.2, 1.6, 0.08), dimMat, p[0], p[1], p[2]);
        }
      }
    }
    this.goldGlow = this.makeGlow(3.2);
    this.goldGlow.position.set(13.5, 9, 7.6);
    this.scene.add(this.goldGlow);
    this.secondGlow = this.makeGlow(2.6);
    this.secondGlow.position.set(10.5, 9, 7.6);
    this.scene.add(this.secondGlow);

    const heights = [38, 62, 45, 80, 52, 70, 40, 58];
    for (let i = 0; i < heights.length; i++) {
      this.deco(`Tower_${i}`, -10 + i * 7, heights[i] / 2, 90, 6, heights[i], 6, PAL.skyline, { fog: false });
    }
    this.deco('Spire', 11, 92, 90, 0.6, 24, 0.6, PAL.skyline, { fog: false });

    this.colliders.push(boxFromCenter(-48, 5, 0, 1, 20, 40));
    this.colliders.push(boxFromCenter(48, 5, 0, 1, 20, 40));
    this.colliders.push(boxFromCenter(0, 6, -22, 100, 24, 1));
    this.colliders.push(boxFromCenter(0, 6, 22.5, 100, 24, 1));

    this.crosswalkZone = boxFromCenter(-5, 1, 0, 3.4, 2, 7.5);
    this.insideBodegaZone = boxFromCenter(-16, 2, 14, 9.4, 4, 11.4);

    // ---------------- cart ----------------
    this.cartRoot = new THREE.Group();
    this.cartRoot.name = 'CartPlaceholder';
    this.cartRoot.position.set(4, 0.05, -6.6);
    this.cartMat = new THREE.MeshLambertMaterial({
      color: PAL.gold, transparent: true, opacity: 0.35, emissive: PAL.gold, emissiveIntensity: 0.12,
    });
    const cartParts: Array<[number, number, number, number, number, number]> = [
      [0, 0.6, 0, 1.8, 1.0, 1.0],
      [0, 2.0, 0, 2.2, 0.12, 1.4],
      [-0.9, 1.4, 0, 0.08, 1.4, 0.08],
      [0.9, 1.4, 0, 0.08, 1.4, 0.08],
    ];
    for (const [x, y, z, sx, sy, sz] of cartParts) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), this.cartMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.cartRoot.add(m);
    }
    this.stringLights = new THREE.Group();
    this.stringLights.visible = false;
    const bulbMat = new THREE.MeshBasicMaterial({ color: PAL.amber });
    for (let i = 0; i < 6; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), bulbMat);
      const t = i / 5;
      bulb.position.set(-0.8 + t * 1.6, 2.06 - Math.sin(t * Math.PI) * 0.12, 0.62);
      this.stringLights.add(bulb);
    }
    this.cartRoot.add(this.stringLights);
    this.cartSign = this.makeSign('');
    this.cartSign.position.set(0, 2.62, 0);
    this.cartSign.visible = false;
    this.cartRoot.add(this.cartSign);
    this.scene.add(this.cartRoot);

    this.cartAwning = new THREE.Group();
    this.cartAwning.position.set(4, 0.05 + 2.35, -6.6);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 1.7), this.mat(PAL.teal));
    canopy.position.set(0, 0, 0.1);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 0.24), this.mat(PAL.teal));
    skirt.position.set(0, -0.15, 0.98);
    this.cartAwning.add(canopy, skirt);
    this.cartAwning.visible = false;
    this.scene.add(this.cartAwning);

    // ---------------- cast (Rosa in spawn interact range + opening frame) ---
    // Player spawn (-30, 6.2). Old (-27, 6.8) was ~3.06u > INTERACT_RANGE 2.4.
    this.rosa = this.npc('Rosa', -28.55, 0.05, 6.35, PAL.coral);
    this.idris = this.npc('Idris', -2, 0.05, -4.6, PAL.plum);
    this.idris.visible = false;
    this.kidSil = this.npc('TheKid', 13.5, 8.6, 7.86, 0x514659);
    this.kidSil.scale.setScalar(0.42);
    this.kidSil.visible = false;

    // ---------------- steam ----------------
    const steamCount = 24;
    const pos = new Float32Array(steamCount * 3);
    this.steamSeed = new Float32Array(steamCount);
    this.steamLife = new Float32Array(steamCount);
    for (let i = 0; i < steamCount; i++) {
      this.steamSeed[i] = Math.random() * Math.PI * 2;
      this.steamLife[i] = Math.random() * 2.5;
      pos[i * 3] = -10 + (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = 0.1 + Math.random() * 2;
      pos[i * 3 + 2] = 0.5 + (Math.random() - 0.5) * 0.5;
    }
    const steamGeo = new THREE.BufferGeometry();
    steamGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.steamPoints = new THREE.Points(steamGeo, this.steamMaterial());
    this.steamPoints.frustumCulled = false;
    this.scene.add(this.steamPoints);
  }

  readonly itemMeshes = new Map<string, THREE.Mesh>();

  addItem(id: string, x: number, y: number, z: number, color: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), this.mat(color, { emissive: color, emissiveIntensity: 0.25 }));
    m.name = `Item_${id}`;
    m.position.set(x, y, z);
    m.castShadow = true;
    this.scene.add(m);
    this.itemMeshes.set(id, m);
    return m;
  }

  removeItem(id: string): boolean {
    const m = this.itemMeshes.get(id);
    if (!m) return false;
    this.scene.remove(m);
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
    this.itemMeshes.delete(id);
    return true;
  }

  private mat(color: number, opts: { emissive?: number; emissiveIntensity?: number } = {}): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ color });
    if (opts.emissive !== undefined) {
      m.emissive = new THREE.Color(opts.emissive);
      m.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    return m;
  }

  private solid(
    name: string, cx: number, cy: number, cz: number,
    sx: number, sy: number, sz: number, color: number,
    opts: { collide?: boolean; cast?: boolean; receive?: boolean; fog?: boolean } = {},
  ): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), this.mat(color));
    m.name = name;
    m.position.set(cx, cy, cz);
    m.castShadow = opts.cast ?? true;
    m.receiveShadow = opts.receive ?? true;
    if (opts.fog === false) (m.material as unknown as { fog?: boolean }).fog = false;
    this.scene.add(m);
    if (opts.collide !== false) this.colliders.push(boxFromCenter(cx, cy, cz, sx, sy, sz));
    return m;
  }

  private deco(name: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: number, opts: { fog?: boolean } = {}): THREE.Mesh {
    return this.solid(name, cx, cy, cz, sx, sy, sz, color, { collide: false, cast: false, receive: false, fog: opts.fog });
  }

  private decoMesh(name: string, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }

  private waterTower(x: number, roofY: number, z: number, r: number) {
    const g = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, r * 1.6, 10), this.mat(0x7a5c48));
    tank.position.y = r * 0.8;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 1.15, r * 0.7, 10), this.mat(0x5d4536));
    cone.position.y = r * 1.6 + r * 0.35;
    g.add(tank, cone);
    for (const [lx, lz] of [[-r * 0.6, -r * 0.6], [r * 0.6, -r * 0.6], [-r * 0.6, r * 0.6], [r * 0.6, r * 0.6]] as const) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, r * 0.7, 6), this.mat(0x4a3a30));
      leg.position.set(lx, r * 0.35, lz);
      g.add(leg);
    }
    g.position.set(x, roofY, z);
    g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; } });
    this.scene.add(g);
  }

  private npc(name: string, x: number, y: number, z: number, color: number): THREE.Group {
    const g = new THREE.Group();
    g.name = name;
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.7 - 0.64, 6, 14), this.mat(color));
    mesh.position.y = 0.85;
    mesh.castShadow = true;
    g.add(mesh);
    g.position.set(x, y, z);
    this.scene.add(g);
    return g;
  }

  private makeGlow(size: number): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255, 200, 90, 0.85)');
    grad.addColorStop(0.4, 'rgba(255, 184, 92, 0.35)');
    grad.addColorStop(1, 'rgba(255, 184, 92, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sp.scale.setScalar(size);
    return sp;
  }

  private makeSign(text: string): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#F7B32B';
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 116, 22);
    ctx.fill();
    ctx.strokeStyle = '#3A3440';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#3A3440';
    ctx.font = '700 58px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68, 470);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(2.4, 0.6, 1);
    return sp;
  }

  setSignText(text: string): void {
    const tex = this.drawSignTexture(text);
    const mat = this.cartSign.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = tex;
    mat.needsUpdate = true;
    this.cartSign.visible = text.length > 0;
  }

  private drawSignTexture(text: string): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#F7B32B';
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 116, 22);
    ctx.fill();
    ctx.strokeStyle = '#3A3440';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#3A3440';
    ctx.font = '700 58px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68, 470);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private steamMaterial(): THREE.PointsMaterial {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,0.65)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(c), size: 0.55, transparent: true, opacity: 0.5,
      depthWrite: false, sizeAttenuation: true,
    });
  }

  setRoofHidden(hidden: boolean) {
    this.roof.visible = !hidden;
  }

  update(dt: number) {
    this.taxi.position.x += dt * 9.0;
    if (this.taxi.position.x > 46) this.taxi.position.x = -46;

    const posAttr = this.steamPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.steamSeed.length; i++) {
      let y = posAttr.getY(i) + dt * (0.6 + 0.4 * Math.sin(this.steamSeed[i]));
      let x = posAttr.getX(i) + Math.sin(y * 1.7 + this.steamSeed[i]) * dt * 0.18;
      if (y > 2.8) { y = 0.1; x = -10 + (Math.random() - 0.5) * 0.5; }
      posAttr.setY(i, y);
      posAttr.setX(i, x);
    }
    posAttr.needsUpdate = true;
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
        o.geometry?.dispose?.();
        const m = o.material as THREE.Material | THREE.Material[];
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else m?.dispose?.();
      }
    });
  }
}

/** Godot-style light energy → three r155+ physical intensity. */
export function phys(energy: number): number {
  return energy * Math.PI;
}
