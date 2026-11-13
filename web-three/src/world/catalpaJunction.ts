/**
 * Catalpa Junction — the DEC-12 district's first priced slice (W-C1,
 * "the Junction docks").
 *
 * The owner approved the design package as filed (DEC-13, 2026-11-13;
 * scenario S1 transit-gated). This module builds the district's first
 * registry slice on the K line's west reach past 42 ST — x −450..−378,
 * the registry's free band west of Times Square: nine dock rows on the
 * freight spur gone pedestrian, the Iron Works ghost-sign shell, the
 * loft row's roofline, and CDK-SUB, the K-line platform stub (the
 * SUB-TS slot-row precedent, h 0). The ride stays A↔B — the stub prices
 * the platform, the ride-seam machine is its own later wave (DEC-13 §2.3).
 *
 * THE ZONE LAW (the tsSurface precedent, binding): every mesh this module
 * builds parents to CJN_Group — the group lights only inside its
 * catalpaSurface / catalpaPlatform zones (subway/index.ts's zone table;
 * World.ts owns the group and reads the subway's lit set). Nothing leaks
 * to the global collectors: the shells never join a district tile
 * (NAMED_SKIP 'CDK_Group'), cityFabric's roof fabric skips the CDK rows
 * (ROOF_SKIP — the far world dresses itself), and the builder never
 * touches `scene` directly. The shipped Alder Heights rigs therefore read
 * +0 standing, byte-identical — S1's price.
 *
 * THE A-3 LAW: every mass READS its registry row (the shells travel in
 * from World.ts's regShell — the flip never invents geometry). The style
 * laws (brick courses, dock canopies, ghost signs, the spur's iron) are
 * derived inside, the TSS-PROD way: canvas-textured facades on the
 * spur-facing side, untextured iron and brick elsewhere so the zone bake
 * fuses them. Every lit window and bulkhead position is hash2-seeded —
 * no Math.random, replay-safe.
 *
 * W-C1's own scope law: shells only — no interiors, no businesses, no
 * residents, no story content, no ride wiring (each its own priced wave
 * under the package §5 gates). The district is dressing + rows + stub,
 * priced by scripts/probe-wc1-catalpa.mjs.
 */

import * as THREE from 'three';
import type { ColliderSpec } from './subway/stationKit';

export interface CJMassShell { x: number; z: number; w: number; d: number; h: number }
/** The h-0 slot row (the SUB-TS law): regFootprint's own shape — no height
 *  to read, the stub's level is the station's own constant. */
export interface CJSlotShell { x: number; z: number; w: number; d: number }

export type CJRegistryRows = Record<
  'CDK-01' | 'CDK-02' | 'CDK-03' | 'CDK-04' | 'CDK-05'
  | 'CDK-06' | 'CDK-07' | 'CDK-08' | 'CDK-09',
  CJMassShell
> & { 'CDK-SUB': CJSlotShell };

export interface CatalpaJunction {
  group: THREE.Group;
  colliders: ColliderSpec[];
}

/** The spur walk band: the freight spur gone pedestrian, between the two
 *  dock rows (west rows' east faces at x −422, east rows' west faces at
 *  x −400 — a 22 m walk, the district's whole public space this wave). */
const SPUR = { xW: -422, xE: -400, zN: 52, zS: -56 } as const;

/** The K line's west-end station constants (the stub reads CDK-SUB's row;
 *  the platform level mirrors the kit's floorTop so the ride seam wave
 *  inherits a familiar floor). */
const CJN_STATION = { floorTop: -3.2, trackZ: 15.95 } as const;

// the district's palette — warehouse brick and iron under the same sky
const CJ = {
  brickDark: 0x6e3f39,   // the dark warehouse brick
  brickRed: 0x8e3d47,    // loftRed — the commercial loft brick
  brickPaint: 0x9c6f5a,  // the painted-brick tone (CDK-01's conversion)
  cornice: 0x4a3c38,     // freight cornice
  iron: 0x3d3a40,        // the spur's ironwork (FABRIC.hoist's warm cousin)
  ironDark: 0x2e2c31,    // bridge trusses
  rust: 0x7a4a33,        // the dead rails
  paving: 0x4d4a48,      // the spur's asphalt
  curb: 0x5c5a56,        // curb strips
  plank: 0x6b5a49,       // the dock plank canopies' edge
  steel: 0x555a5e,       // dock doors, depot doors
  glass: 0x20262b,       // studio glass, kiosk glass
  tank: 0x50443a,        // water tanks
  bollard: 0x35333a,
  lampPole: 0x33363a,
  concrete: 0x63615c,    // the station's cut stone
  yellow: 0xd8a437,      // platform warning strip + the K bullet
} as const;

/** Deterministic per-row hash (the TSS law: sin×43758.5453 fractal). */
function hash2(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ---------------------------------------------------------------- textures

const texCache = new Map<string, THREE.CanvasTexture>();
function canvasTex(key: string, w: number, h: number, paint: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const hit = texCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  paint(cv.getContext('2d')!);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

interface RowStyle {
  brick: number;
  lettering: string;
  sub?: string;
  ghost?: boolean;   // the faded whitewash treatment (the Iron Works)
  litSeed: number;
}

/** The nine dock rows' style table — the registry rows carry the story,
 *  this carries the paint. Lettering reads on the spur-facing facade. */
const ROW_STYLE: Record<string, RowStyle> = {
  'CDK-01': { brick: CJ.brickPaint, lettering: 'CATALPA TERMINAL WAREHOUSE', sub: 'LOFTS', litSeed: 11 },
  'CDK-02': { brick: CJ.brickDark, lettering: 'CORBIN & SONS', sub: 'WHOLESALE', litSeed: 23 },
  'CDK-03': { brick: CJ.brickDark, lettering: 'CATALPA IRON WORKS', sub: 'STRUCTURAL · ORNAMENTAL · EST. 1911', ghost: true, litSeed: 37 },
  'CDK-04': { brick: CJ.brickRed, lettering: 'STARLAWN', sub: 'FORK & TOOL', litSeed: 41 },
  'CDK-05': { brick: CJ.brickDark, lettering: 'THE DOCKSMAN', sub: 'WAREHOUSE', litSeed: 53 },
  'CDK-06': { brick: CJ.brickRed, lettering: 'MERIDIAN LUMBER', sub: 'DOCK SALES', litSeed: 67 },
  'CDK-07': { brick: CJ.brickDark, lettering: 'HALSTEAD LOFTS', sub: 'STUDIOS', litSeed: 71 },
  'CDK-08': { brick: CJ.brickPaint, lettering: 'UNITED COTTON DUCK', sub: 'DRY GOODS', litSeed: 83 },
  'CDK-09': { brick: CJ.brickDark, lettering: 'JUNCTION FREIGHT DEPOT', sub: 'EST. 1908', litSeed: 97 },
};

/** The rows' construction names — literal, not derived (the evidence
 *  law: the catalogue's tokens grep these verbatim, so the builder's
 *  mesh names cannot drift away from the shipped ledger). */
const ROW_NAMES: Record<string, string> = {
  'CDK-01': 'CDK_01', 'CDK-02': 'CDK_02', 'CDK-03': 'CDK_03',
  'CDK-04': 'CDK_04', 'CDK-05': 'CDK_05', 'CDK-06': 'CDK_06',
  'CDK-07': 'CDK_07', 'CDK-08': 'CDK_08', 'CDK-09': 'CDK_09',
};

/** The spur-facing facade canvas: brick courses, the window grid, the
 *  dock band, the row's lettering. Painted ONCE per row (y=0 is the face
 *  TOP — the canvas UV law). */
function facadeTexture(id: string, floors: number): THREE.CanvasTexture {
  const st = ROW_STYLE[id];
  return canvasTex(`cjn-facade-${id}`, 512, 512, (c) => {
    const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
    // the brick field
    c.fillStyle = hex(st.brick);
    c.fillRect(0, 0, 512, 512);
    c.globalAlpha = 0.18;
    c.fillStyle = '#000000';
    for (let y = 0; y < 512; y += 9) c.fillRect(0, y, 512, 1.6); // courses
    c.globalAlpha = 0.10;
    for (let y = 9; y < 512; y += 18) {
      for (let x = (y / 18) % 2 === 0 ? 0 : 13; x < 512; x += 26) c.fillRect(x, y, 1.6, 9); // headers
    }
    c.globalAlpha = 1;
    // soot wash toward the top (the freight years)
    const soot = c.createLinearGradient(0, 0, 0, 512);
    soot.addColorStop(0, 'rgba(20,16,14,0.34)');
    soot.addColorStop(0.45, 'rgba(20,16,14,0.10)');
    soot.addColorStop(1, 'rgba(20,16,14,0)');
    c.fillStyle = soot;
    c.fillRect(0, 0, 512, 512);
    // the cornice band
    c.fillStyle = hex(CJ.cornice);
    c.fillRect(0, 0, 512, 26);
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.fillRect(0, 22, 512, 3);
    // the window grid — the row's own floors, some lit warm (hash2-seeded)
    const rows = Math.max(2, floors);
    const top = 44;
    const bottom = 512 - 110;
    const rh = (bottom - top) / rows;
    const cols = 3;
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const wx = 58 + k * 148;
        const wy = top + r * rh + rh * 0.16;
        const ww = 96;
        const wh = rh * 0.62;
        const lit = hash2(st.litSeed + r * 7, k * 13 + 3) > 0.78;
        c.fillStyle = lit ? '#e8c37e' : hex(CJ.glass);
        c.fillRect(wx, wy, ww, wh);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); // the mullion
        c.strokeStyle = 'rgba(0,0,0,0.5)';
        c.lineWidth = 3;
        c.strokeRect(wx, wy, ww, wh); // the frame
        // the sill
        c.fillStyle = 'rgba(255,255,255,0.14)';
        c.fillRect(wx - 6, wy + wh, ww + 12, 5);
      }
    }
    // the dock band — steel door, lintel, and the row's name
    c.fillStyle = hex(CJ.steel);
    c.fillRect(196, 424, 120, 78);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    for (let y = 430; y < 500; y += 9) c.fillRect(196, y, 120, 2); // door ribs
    c.fillStyle = hex(CJ.iron);
    c.fillRect(186, 416, 140, 10); // the lintel
    c.fillStyle = '#e8dcc8';
    c.font = 'bold 34px "Arial Narrow", Arial, sans-serif';
    c.textAlign = 'center';
    const main = st.ghost ? 'rgba(232,220,200,0.72)' : '#e8dcc8';
    c.fillStyle = main;
    c.fillText(st.lettering, 256, 386 - (st.sub ? 12 : 0), 470);
    if (st.sub) {
      c.font = 'bold 19px "Arial Narrow", Arial, sans-serif';
      c.fillStyle = st.ghost ? 'rgba(232,220,200,0.6)' : '#cdbf9f';
      c.fillText(st.sub, 256, 408, 470);
    }
    if (st.ghost) {
      // the whitewash fade: the ghost sign reads through decades of weather
      c.fillStyle = 'rgba(232,220,200,0.10)';
      c.fillRect(0, 330, 512, 100);
    }
  });
}

/** The K bullet disc — the line's own mark, painted once. */
function bulletTexture(): THREE.CanvasTexture {
  return canvasTex('cjn-bullet', 128, 128, (c) => {
    c.fillStyle = '#d8a437';
    c.beginPath();
    c.arc(64, 64, 56, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1c1a17';
    c.font = 'bold 74px Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('K', 64, 68);
  });
}

export function buildCatalpaJunction(
  parent: THREE.Group,
  M: (c: number, opts?: { emissive?: number; emissiveIntensity?: number }) => THREE.MeshLambertMaterial,
  rows: CJRegistryRows,
): CatalpaJunction {
  const group = new THREE.Group();
  group.name = 'CDK_Group';
  parent.add(group);
  const colliders: ColliderSpec[] = [];
  const col = (x: number, y: number, z: number, w: number, h: number, d: number) =>
    colliders.push({ x, y, z, w, h, d });

  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, color: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color));
    m.name = name;
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const cyl = (name: string, x: number, y: number, z: number, r: number, h: number, color: number, seg = 10) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), M(color));
    m.name = name;
    m.position.set(x, y, z);
    m.castShadow = true;
    group.add(m);
    return m;
  };
  const textured = (name: string, tex: THREE.CanvasTexture, w: number, h: number,
    x: number, y: number, z: number, ry: number, rx = 0) => {
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    // the world's IBL convention (the TSS facades' own law): the sky-PMREM
    // fill stays a soft tint — the default 1.0 washes the canvas out pale
    mat.envMapIntensity = 0.22;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.name = name;
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    m.castShadow = false;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // ---- the nine dock rows: masses READ their registry rows (the A-3 law)
  const westIds = ['CDK-01', 'CDK-02', 'CDK-03', 'CDK-04', 'CDK-05'];
  const eastIds = ['CDK-06', 'CDK-07', 'CDK-08', 'CDK-09'];
  for (const id of [...westIds, ...eastIds]) {
    // the mass loop reads mass shells only (CDK-SUB's slot shell has no h
    // to read — the A-3 law keeps the two shapes honest)
    const massRows = rows as Record<string, CJMassShell>;
    const reg = massRows[id];
    const key = ROW_NAMES[id]; // the literal construction name (the evidence law)
    box(`${key}_Mass`, reg.x, reg.h / 2, reg.z, reg.w, reg.h, reg.d, ROW_STYLE[id].brick);
    col(reg.x, reg.h / 2, reg.z, reg.w, reg.h, reg.d);
    // the freight cornice
    box(`${key}_Cornice`, reg.x, reg.h + 0.22, reg.z, reg.w + 0.4, 0.44, reg.d + 0.4, CJ.cornice);
    // the dock canopy + posts on the spur face (west rows face EAST +x,
    // east rows face WEST −x)
    const facesEast = westIds.includes(id);
    const faceX = reg.x + (facesEast ? reg.w / 2 : -reg.w / 2);
    const canopyOut = facesEast ? 1.7 : -1.7;
    box(`${key}_Canopy`, faceX + canopyOut / 2, 3.55, reg.z, 1.7, 0.18, reg.d - 2.4, CJ.plank);
    box(`${key}_CanopyIron`, faceX + canopyOut / 2, 3.42, reg.z, 1.5, 0.1, reg.d - 2.6, CJ.iron);
    const postZ = reg.d / 2 - 1.6;
    box(`${key}_CanopyPostA`, faceX + canopyOut, 1.72, reg.z - postZ, 0.14, 3.4, 0.14, CJ.iron);
    box(`${key}_CanopyPostB`, faceX + canopyOut, 1.72, reg.z + postZ, 0.14, 3.4, 0.14, CJ.iron);
    // the spur-facing facade canvas, 0.06 proud of the mass
    textured(
      `${key}_Facade`, facadeTexture(id, Math.max(2, Math.round(reg.h / 3.3))),
      reg.d - 0.4, reg.h - 1.1,
      faceX + (facesEast ? 0.06 : -0.06), reg.h / 2 - 0.15, reg.z,
      facesEast ? Math.PI / 2 : -Math.PI / 2,
    );
    // the roof furniture: bulkhead + vents (hash-seeded), a tank on the
    // taller shells, the Iron Works' stack
    const bx = reg.x + (hash2(reg.x, reg.z) - 0.5) * (reg.w - 3);
    const bz = reg.z + (hash2(reg.z, reg.x) - 0.5) * (reg.d - 3);
    box(`${key}_Bulkhead`, bx, reg.h + 1.05, bz, 2.2, 2.1, 2.6, CJ.brickDark);
    box(`${key}_VentA`, reg.x + (hash2(reg.z, 7) - 0.5) * (reg.w - 2), reg.h + 0.55, reg.z + (hash2(reg.z, 11) - 0.5) * (reg.d - 2), 0.7, 1.1, 0.7, CJ.iron);
    if (reg.h >= 13) {
      const tx = reg.x + (hash2(reg.x, 3) - 0.5) * (reg.w - 4);
      const tz = reg.z + (hash2(reg.z, 5) - 0.5) * (reg.d - 4);
      cyl(`${key}_Tank`, tx, reg.h + 2.1, tz, 1.35, 3.4, CJ.tank, 12);
      cyl(`${key}_TankCap`, tx, reg.h + 4.0, tz, 0.35, 0.9, CJ.ironDark, 8);
      box(`${key}_TankLegs`, tx, reg.h + 0.45, tz, 2.0, 0.9, 2.0, CJ.iron);
    }
    if (id === 'CDK-03') {
      // the Iron Works' stack — the district's vertical mark
      cyl('CDK_03_Stack', reg.x - reg.w / 4, reg.h + 2.6, reg.z - reg.d / 4, 0.85, 5.2, CJ.brickDark, 12);
      cyl('CDK_03_StackCap', reg.x - reg.w / 4, reg.h + 5.35, reg.z - reg.d / 4, 1.05, 0.5, CJ.ironDark, 12);
    }
  }

  // ---- the spur: the freight spur gone pedestrian
  const spurLen = SPUR.zN - SPUR.zS;
  const spurCX = (SPUR.xW + SPUR.xE) / 2;
  const spurCZ = (SPUR.zN + SPUR.zS) / 2;
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(SPUR.xE - SPUR.xW, spurLen), M(CJ.paving));
  paving.name = 'CDK_Spur_Paving';
  paving.rotation.x = -Math.PI / 2;
  paving.position.set(spurCX, 0.015, spurCZ);
  paving.receiveShadow = true;
  group.add(paving);
  box('CDK_Spur_CurbW', SPUR.xW + 0.4, 0.06, spurCZ, 0.8, 0.12, spurLen, CJ.curb);
  box('CDK_Spur_CurbE', SPUR.xE - 0.4, 0.06, spurCZ, 0.8, 0.12, spurLen, CJ.curb);
  // the dead rails — the spur's memory, kept as the walk's centerline
  box('CJN_Rail_W', spurCX - 0.9, 0.05, spurCZ, 0.09, 0.1, spurLen, CJ.rust);
  box('CJN_Rail_E', spurCX + 0.9, 0.05, spurCZ, 0.09, 0.1, spurLen, CJ.rust);
  // bollards along both edges
  for (let i = 0; i < 6; i++) {
    const z = SPUR.zS + 10 + i * 20;
    cyl(`CJN_Bollard_${i}`, SPUR.xW + 1.6, 0.45, z, 0.16, 0.9, CJ.bollard, 8);
    cyl(`CJN_Bollard_E${i}`, SPUR.xE - 1.6, 0.45, z, 0.16, 0.9, CJ.bollard, 8);
  }
  // spur lamps (unlit this wave — the night pass rides W-C2's craft wave)
  for (let i = 0; i < 4; i++) {
    const z = -40 + i * 27;
    const x = i % 2 === 0 ? SPUR.xW + 2.2 : SPUR.xE - 2.2;
    cyl(`CJN_Lamp_${i}`, x, 2.6, z, 0.09, 5.2, CJ.lampPole, 8);
    box(`CJN_LampHead_${i}`, x, 5.3, z, 0.9, 0.22, 0.5, CJ.ironDark);
  }
  // the walk's own stencil, painted into the asphalt
  const stencil = canvasTex('cjn-spur-stencil', 512, 160, (c) => {
    c.clearRect(0, 0, 512, 160);
    c.fillStyle = 'rgba(232,220,200,0.5)';
    c.font = 'bold 44px "Arial Narrow", Arial, sans-serif';
    c.textAlign = 'center';
    c.fillText('FREIGHT SPUR', 256, 58);
    c.font = 'bold 30px "Arial Narrow", Arial, sans-serif';
    c.fillText('— WALK ONLY —', 256, 104);
    c.strokeStyle = 'rgba(232,220,200,0.4)';
    c.lineWidth = 5;
    c.strokeRect(20, 16, 472, 128);
  });
  textured('CJN_Spur_Stencil', stencil, 9, 2.8, spurCX, 0.03, -28, 0, -Math.PI / 2);

  // ---- the two iron footbridges over the spur (the cross-street iron,
  // kept as the district's identity; the streets they will carry ride
  // W-C2+'s construction waves)
  for (const [bi, bz] of [[1, 2], [2, -34]] as const) {
    const deckY = 5.6;
    box(`CJN_Bridge_${bi}_Deck`, spurCX, deckY, bz, SPUR.xE - SPUR.xW + 8, 0.5, 3.2, CJ.ironDark);
    col(spurCX, deckY, bz, SPUR.xE - SPUR.xW + 8, 0.5, 3.2);
    for (const sx of [SPUR.xW - 3.6, SPUR.xE + 3.6]) {
      // the through-truss: top chord + four posts + the railing
      box(`CJN_Bridge_${bi}_Chord_${sx < 0 ? 'W' : 'E'}`, sx, deckY + 2.3, bz, 0.3, 0.3, 3.2, CJ.ironDark);
      for (const pz of [-1.2, -0.4, 0.4, 1.2]) {
        box(`CJN_Bridge_${bi}_Post_${pz.toFixed(1)}`, sx, deckY + 1.15, bz + pz, 0.22, 2.3, 0.22, CJ.ironDark);
      }
      box(`CJN_Bridge_${bi}_Rail_${sx < 0 ? 'W' : 'E'}`, sx, deckY + 1.05, bz, 0.12, 0.12, 3.2, CJ.iron);
    }
    // the abutments
    box(`CJN_Bridge_${bi}_AbutW`, SPUR.xW - 4.2, deckY - 2.6, bz, 1.2, 5.2, 3.4, CJ.concrete);
    box(`CJN_Bridge_${bi}_AbutE`, SPUR.xE + 4.2, deckY - 2.6, bz, 1.2, 5.2, 3.4, CJ.concrete);
  }

  // ---- the K-line platform stub (CDK-SUB, the SUB-TS precedent)
  const st = rows['CDK-SUB'];
  const stX = st.x;
  const floor = CJN_STATION.floorTop;
  // the platform slab, south of the track
  box('CDK_Station_Slab', stX, floor - 0.15, 12.9, st.w, 0.3, 5.0, CJ.concrete);
  col(stX, floor - 0.15, 12.9, st.w, 0.3, 5.0);
  box('CJN_Station_Edge', stX, floor + 0.02, 15.15, st.w, 0.06, 0.5, CJ.yellow);
  // the cut's walls — the south wall opens around the headhouse stair
  box('CJN_Station_WallN', stX, floor + 1.7, 17.8, st.w, 3.4, 0.5, CJ.concrete);
  box('CJN_Station_WallS_W', stX - 5.85, floor + 1.7, 9.6, 4.3, 3.4, 0.5, CJ.concrete);
  box('CJN_Station_WallS_E', stX + 5.85, floor + 1.7, 9.6, 4.3, 3.4, 0.5, CJ.concrete);
  box('CJN_Station_WallS_Lintel', stX, floor + 2.9, 9.6, 7.4, 1.6, 0.5, CJ.concrete);
  // the west wall opens around the track throat (the line continues west)
  box('CJN_Station_WallW_S', stX - st.w / 2 - 0.25, floor + 1.7, 12.4, 0.5, 3.4, 6.0, CJ.concrete);
  box('CJN_Station_WallW_N', stX - st.w / 2 - 0.25, floor + 1.7, 17.35, 0.5, 3.4, 1.7, CJ.concrete);
  col(stX, floor + 1.7, 9.6, st.w, 3.4, 0.5);
  // the columns
  for (const cz of [11.4, 14.4]) {
    cyl('CJN_Station_ColA', stX - 4, floor + 1.55, cz, 0.22, 3.1, CJ.iron, 8);
    cyl('CJN_Station_ColB', stX + 4, floor + 1.55, cz, 0.22, 3.1, CJ.iron, 8);
  }
  // the track: rails on the line's own z, running the district's reach —
  // west into the tunnel mouth, east toward 42 ST (the tube connection is
  // the ride-seam wave's own priced work)
  box('CJN_Station_RailN', -414, floor - 0.55, CJN_STATION.trackZ - 0.35, 72, 0.12, 0.09, CJ.rust);
  box('CJN_Station_RailS', -414, floor - 0.55, CJN_STATION.trackZ + 0.35, 72, 0.12, 0.09, CJ.rust);
  // the tunnel mouth: the line continues west beyond the district's
  // modeled end — the dark plane keeps the vista honest
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.6), M(0x0a0908));
  mouth.name = 'CJN_Station_Mouth';
  mouth.position.set(-449.6, floor + 1.2, CJN_STATION.trackZ);
  mouth.rotation.y = Math.PI / 2;
  group.add(mouth);
  // the name band on the south wall, reading north into the station
  const band = canvasTex('cjn-nameband', 512, 96, (c) => {
    c.fillStyle = '#1f5e52';
    c.fillRect(0, 0, 512, 96);
    c.fillStyle = '#e8dcc8';
    c.font = 'bold 44px "Arial Narrow", Arial, sans-serif';
    c.textAlign = 'center';
    c.fillText('CATALPA JUNCTION', 256, 44);
    c.font = 'bold 22px "Arial Narrow", Arial, sans-serif';
    c.fillStyle = '#cdbf9f';
    c.fillText('K LINE · WEST END', 256, 76);
  });
  textured('CDK_NameBand', band, st.w - 2, 1.1, stX, floor + 2.3, 9.82, 0);
  // the stairs up to the headhouse: from the platform's south edge rising
  // southward to the surface entrance (x −410, z 8 — the registry's own row)
  for (let i = 0; i < 10; i++) {
    box(`CJN_Station_Step_${i}`, stX, floor + 0.16 + i * 0.32, 10.2 - i * 0.28, 3.0, 0.32, 0.28, CJ.concrete);
  }
  // the headhouse kiosk on the surface (the spur crossing's front door)
  box('CJN_Kiosk_Roof', stX, 3.3, 6.5, 3.4, 0.24, 3.4, CJ.cornice);
  col(stX, 3.3, 6.5, 3.4, 0.24, 3.4);
  box('CJN_Kiosk_GlassN', stX, 1.6, 8.1, 3.2, 3.0, 0.1, CJ.glass);
  box('CJN_Kiosk_GlassS', stX, 1.6, 4.9, 3.2, 3.0, 0.1, CJ.glass);
  box('CJN_Kiosk_GlassW', stX - 1.6, 1.6, 6.5, 0.1, 3.0, 3.2, CJ.glass);
  box('CJN_Kiosk_GlassE', stX + 1.6, 1.6, 6.5, 0.1, 3.0, 3.2, CJ.glass);
  col(stX, 1.6, 6.5, 3.2, 3.0, 3.2);
  // the fascia + the K bullet (the line's own mark over its west door)
  const kiosk = canvasTex('cjn-kiosk', 512, 96, (c) => {
    c.fillStyle = '#1f5e52';
    c.fillRect(0, 0, 512, 96);
    c.fillStyle = '#e8dcc8';
    c.font = 'bold 40px "Arial Narrow", Arial, sans-serif';
    c.textAlign = 'center';
    c.fillText('CATALPA JUNCTION', 256, 58);
  });
  textured('CDK_KioskBand', kiosk, 3.2, 0.6, stX, 3.62, 6.5, Math.PI);
  // the K bullet over the walk-facing wall (the line's own mark)
  textured('CJN_Kiosk_Bullet', bulletTexture(), 1.1, 1.1, stX + 1.05, 3.62, 6.55, Math.PI);
  // the bullet's twin faces the platform below
  textured('CJN_Station_Bullet', bulletTexture(), 1.1, 1.1, stX + 1.4, floor + 2.3, 9.82, 0);

  return { group, colliders };
}
