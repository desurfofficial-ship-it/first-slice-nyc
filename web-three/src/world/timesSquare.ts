/**
 * Times Square — 42nd Street, above ground. The Wow Walk's destination.
 *
 * The canyon runs east–west (the camera's street corridor reads along x),
 * the tower screens face NORTH and SOUTH toward each other across the
 * plaza, and the sync beat (Doc 02: "the screens all turn at once — a
 * designed moment where every billboard syncs to warm light, just for
 * you") is one shared timeline over every screen material: day-keyed,
 * deterministic, once per day on first entry.
 *
 * The plaza keeps x −350..−320 clear of buildings — that is station B's
 * block (the subway headhouse stands there), so the underground station
 * needs no dollhouse of its own here. The Orpheum (marquee, blade sign,
 * the usher's door) anchors the west end; the red steps anchor the middle.
 *
 * All names carry the TSS_ prefix (bake-excluded; zone-hidden). Static
 * crowd figures ride the shared person rig; two movers walk the sidewalk
 * with the rig's own walk cycle — a crowd for the price of ten boxes.
 */

import * as THREE from 'three';
import { PAL } from '../core/palette';
import {
  buildArticulatedPerson, updatePersonAnim, type PersonRig,
} from './personRig';
import type { ColliderSpec } from './subway/stationKit';

const TS = { xW: -380, xE: -280, zN: 8, zS: -8 } as const;

export interface TimesSquare {
  group: THREE.Group;
  colliders: ColliderSpec[];
  anchors: {
    usher: { x: number; y: number; z: number };
    steps: { x: number; y: number; z: number };
    center: { x: number; y: number; z: number };
  };
  /** Returns 'sync-start' once per day on first entry (World forwards to
   *  Game → note). Ticks the screens, banners, and movers. */
  update(dt: number, feet: { x: number; y: number; z: number }, day: number): 'sync-start' | null;
  /** The machine truth the note only implies: the sync FIRED today. A
   *  latch, not a window — probes read this instead of racing the 2.6 s
   *  warm hold (the probe law: machine-honest checks). */
  readonly syncedToday: boolean;
}

// ---------------------------------------------------------------- textures

/** The sync's two colors, hoisted — the hot path never allocates. */
const SYNC_WARM = new THREE.Color(0xffb85c);
const SYNC_BASE = new THREE.Color(0xfff2cc);

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

/** Six screens, six moods — in-house parodies, cozy never loud. */
function screenTexture(variant: number): THREE.CanvasTexture {
  return canvasTex(`tss:${variant}`, 256, 160, (c) => {
    const v = variant % 6;
    c.fillStyle = ['#F7B32B', '#B23A48', '#2A9D8F', '#6D4C7D', '#FF6B6B', '#FFF8F0'][v];
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = ['#3A3440', '#FFF8F0', '#FFF8F0', '#FFF8F0', '#3A3440', '#B23A48'][v];
    c.textAlign = 'center';
    const lines: string[][] = [
      ['REGULAR', 'COFFEE.', 'milk, two sugars'],
      ['THE USUAL', '— A PLAY', 'Orpheum, 42nd St'],
      ['ONE STOP,', 'EVERYTHING', 'K · the local'],
      ['MANGO', 'SODA', 'ice cold, always'],
      ['SEND A', 'POSTCARD', 'the city keeps it'],
      ['ALDER HTS', '⇄ 42 ST', 'eleven minutes'],
    ];
    const ls = lines[v];
    c.font = `bold ${v === 1 ? 40 : 44}px Georgia, serif`;
    c.fillText(ls[0], 128, 58);
    c.font = 'bold 40px Georgia, serif';
    c.fillText(ls[1], 128, 104);
    c.font = 'italic 22px Georgia, serif';
    c.fillText(ls[2], 128, 142);
  });
}

function marqueeTexture(): THREE.CanvasTexture {
  return canvasTex('tss:marquee', 512, 128, (c) => {
    c.fillStyle = '#2b2430';
    c.fillRect(0, 0, 512, 128);
    c.strokeStyle = '#FFB85C';
    c.lineWidth = 10;
    c.strokeRect(10, 10, 492, 108);
    // the marquee chase bulbs
    c.fillStyle = '#FFF8F0';
    for (let x = 24; x < 492; x += 28) {
      c.beginPath(); c.arc(x, 20, 4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x, 108, 4, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#FFF8F0';
    c.font = 'bold 44px Georgia, serif';
    c.textAlign = 'center';
    c.fillText('THE USUAL — A PLAY', 256, 76);
  });
}

// ------------------------------------------------------------------ builder

export function buildTimesSquare(
  parent: THREE.Group,
  M: (c: number, opts?: { emissive?: number; emissiveIntensity?: number }) => THREE.MeshLambertMaterial,
): TimesSquare {
  const group = new THREE.Group();
  group.name = 'TSS_Group';
  parent.add(group);
  const colliders: ColliderSpec[] = [];
  const col = (x: number, y: number, z: number, w: number, h: number, d: number) => colliders.push({ x, y, z, w, h, d });

  const box = (
    name: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number,
    color: number, opts: { collide?: boolean; cast?: boolean; emissive?: number; ei?: number; map?: THREE.Texture } = {},
  ): THREE.Mesh => {
    const mat = opts.map ? new THREE.MeshLambertMaterial({ map: opts.map, emissive: 0xffffff, emissiveIntensity: 0.18 })
      : M(color, opts.emissive !== undefined ? { emissive: opts.emissive, emissiveIntensity: opts.ei } : undefined);
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.name = name;
    m.position.set(cx, cy, cz);
    m.castShadow = opts.cast ?? true;
    group.add(m);
    if (opts.collide !== false) col(cx, cy, cz, sx, sy, sz);
    return m;
  };

  // ---- ground: road, sidewalks, curbs, two crosswalks ----
  box('TSS_Road', (TS.xW + TS.xE) / 2, -0.1, 0, TS.xE - TS.xW, 0.2, 8, PAL.road, { collide: false, cast: false });
  // the north walk splits around station B's stairwell slot (x −333.9..−331.3)
  // exactly like home's Sidewalk_N does — the descent opens the lane
  const B0 = -48.5 - 288, B1 = -45.9 - 288; // station B stair mouth: x −336.5..−333.9
  box('TSS_Walk_N_W', (TS.xW + B0) / 2, -0.05, 6, B0 - TS.xW, 0.3, 4, PAL.walk);
  box('TSS_Walk_N_E', (B1 + TS.xE) / 2, -0.05, 6, TS.xE - B1, 0.3, 4, PAL.walk);
  box('TSS_Walk_S', (TS.xW + TS.xE) / 2, -0.05, -6, TS.xE - TS.xW, 0.3, 4, PAL.walk);
  // the station block's paving (x −350..−320, z 8..20): the plaza slab that
  // keeps the surface surface — without it the tunnel ceiling below would
  // become the ground and swallow a walker (the below-grade law's one debt)
  box('TSS_StationPlaza', -335, -0.05, 14, 30, 0.3, 12, PAL.walk);
  for (const cxx of [-348, -306]) {
    for (let i = 0; i < 6; i++) {
      box(`TSS_Cross_${cxx}_${i}`, cxx, 0.03, -3.3 + i * 1.3, 3, 0.02, 0.6, PAL.cream, { collide: false, cast: false });
    }
  }
  // the road/sidewalk tops stay at the shipped law (road top 0, walks 0.1);
  // the player's ground is the implicit y0 — these slabs are visual, the
  // colliders come from the masses below.

  // ---- north row: the Orpheum block + the east tower (station gap in
  //      between: x −350..−320 is station B's block) ----
  box('TSS_01_base', -364, 3, 14, 28, 6, 12, PAL.stone);
  box('TSS_01_tower', -364, 18, 14, 24, 24, 12, PAL.brick);
  box('TSS_01_crown', -364, 30.6, 14, 25, 1.2, 13, PAL.stone, { collide: false });
  for (const wy of [8.6, 11.5, 14.4, 17.3, 20.2, 23.1]) {
    for (const wx of [-372, -366.5, -361, -355.5]) {
      box(`TSS_01_win_${wx}_${wy}`, wx, wy, 7.92, 1.3, 1.7, 0.1, PAL.windowDim ?? 0x514659, { collide: false, cast: false });
    }
  }
  // the Orpheum: marquee + blade sign + the usher's door
  box('TSS_Marquee', -358.5, 4.6, 7.8, 8.5, 2.3, 0.5, 0x2b2430, { map: marqueeTexture() });
  box('TSS_MarqueeShelf', -358.5, 3.2, 7.7, 8.5, 0.25, 0.9, 0x2b2430, { collide: false });
  box('TSS_Blade', -351.6, 7.4, 7.7, 1.3, 6.5, 0.45, 0xB23A48, { emissive: 0xffb85c, ei: 0.4 });
  box('TSS_TheaterDoor', -352.3, 1.5, 7.9, 1.6, 3.0, 0.2, 0x513a3a);

  box('TSS_03_tower', -305, 13, 14, 26, 26, 12, PAL.bldg2);
  box('TSS_03_crown', -305, 26.5, 14, 27, 1, 13, PAL.stone, { collide: false });
  for (const wy of [4, 8, 12, 16, 20, 24]) {
    for (const wx of [-313, -307, -301, -295]) {
      box(`TSS_03_win_${wx}_${wy}`, wx, wy, 7.92, 1.3, 1.7, 0.1, 0x514659, { collide: false, cast: false });
    }
  }
  box('TSS_03_water', -297, 28, 12, 2.2, 2.2, 2.2, 0x6e5a4e, { collide: false });

  // ---- south row (camera-facing: the money shot) ----
  box('TSS_02_a', -358, 7, -14, 28, 14, 12, PAL.bldg);
  box('TSS_02_b', -358, 19, -14, 22, 10, 12, PAL.brick);
  box('TSS_02_crown', -358, 24.6, -14, 23, 1.2, 13, PAL.stone, { collide: false });
  box('TSS_02_water', -366, 26.2, -12, 2.2, 2.6, 2.2, 0x6e5a4e, { collide: false });
  box('TSS_04_tower', -326, 14, -14, 28, 28, 12, PAL.bldg2);
  box('TSS_04_crown', -326, 28.6, -14, 29, 1.2, 13, PAL.stone, { collide: false });
  box('TSS_05', -298, 9, -14, 20, 18, 12, PAL.brick);
  for (const wx of [-368, -362, -356, -350, -344, -338, -332, -326, -320, -314, -308, -302]) {
    box(`TSS_S_win_${wx}`, wx, 3.4, -7.92, 1.4, 1.8, 0.1, 0x514659, { collide: false, cast: false });
  }

  // ---- the screens (one material each — the sync beat owns them all) ----
  const screenMats: THREE.MeshLambertMaterial[] = [];
  const screens: Array<[number, number, number, number, number]> = [
    // x, y, z, w, h  (north faces look south; south faces look north)
    [-364, 13.2, 7.9, 7.5, 4.6],   // Orpheum tower upper
    [-364, 8.2, 7.9, 7.5, 3.6],    // Orpheum tower lower
    [-305, 18.5, 7.9, 8.5, 5],     // east tower upper
    [-305, 11.5, 7.9, 8.5, 5],     // east tower lower
    [-358, 15.5, -7.9, 9, 5.2],    // south row big (faces N → camera)
    [-358, 9.5, -7.9, 9, 4.4],
    [-326, 20, -7.9, 10, 5.6],
    [-326, 12.5, -7.9, 10, 5.6],
    [-298, 12, -7.9, 8, 4.4],
  ];
  screens.forEach(([sx, sy, sz, sw, sh], i) => {
    const mat = new THREE.MeshLambertMaterial({
      map: screenTexture(i),
      emissive: 0xfff2cc,
      emissiveIntensity: 0.55,
    });
    mat.userData.syncPhase = 0;
    screenMats.push(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat);
    m.name = `TSS_Screen_${i}`;
    m.position.set(sx, sy, sz);
    // north-row screens face south (toward the camera); south-row face north
    if (sz > 0) m.rotation.y = Math.PI;
    group.add(m);
    // a dark frame behind every screen so it reads as architecture
    box(`TSS_ScreenFrame_${i}`, sx, sy, sz + (sz > 0 ? 0.12 : -0.12), sw + 0.7, sh + 0.7, 0.18, 0x2b2430, { collide: false, cast: false });
  });

  // ---- the red steps (TKTS-style risers, camera-facing, climbable) ----
  for (let i = 0; i < 5; i++) {
    box(`TSS_Step_${i}`, -343, 0.175 + i * 0.35, -1.5 + i * 1.0, 6, 0.35 + i * 0.35, 1.0, 0xB23A48);
  }
  // glass canopy hinted: four posts + a thin roof frame
  for (const [px, pz] of [[-345.6, -1], [-340.4, -1], [-345.6, 3], [-340.4, 3]] as const) {
    box(`TSS_StepPost_${px}_${pz}`, px, 1.4, pz, 0.14, 2.8, 0.14, 0xd8d8d8, { collide: false });
  }
  box('TSS_StepRoof', -343, 2.85, 1, 5.8, 0.12, 4.4, 0xd8d8d8, { collide: false });

  // ---- plaza furniture ----
  for (const tx of [-334, -316]) {
    box(`TSS_Table_${tx}`, tx, 0.75, -1.5, 1.1, 0.08, 1.1, 0x8a5a3a);
    col(tx, 0.4, -1.5, 1.1, 0.8, 1.1);
    for (const [cx2, cz2] of [[tx - 0.9, -1.5], [tx + 0.9, -1.5], [tx, -0.6]] as const) {
      box(`TSS_Chair_${tx}_${cx2}_${cz2}`, cx2, 0.45, cz2, 0.45, 0.9, 0.45, 0x2A9D8F);
    }
  }
  for (const nx of [-374, -349.5, -290]) {
    box(`TSS_Newsbox_${nx}`, nx, 0.425, 6.8, 1.1, 0.85, 0.6, 0x2A9D8F);
  }
  // banner poles: double-armed with show cloth (the sway lives in update)
  const banners: THREE.Mesh[] = [];
  for (const bx of [-370, -346, -318, -294]) {
    box(`TSS_Pole_${bx}`, bx, 3.4, 6.9, 0.14, 6.8, 0.14, 0x5a5a62);
    for (const side of [-1, 1]) {
      const cloth = box(`TSS_Banner_${bx}_${side}`, bx + side * 0.7, 5.4, 6.9, 1.3, 1.7, 0.06, 0xB23A48, { collide: false });
      banners.push(cloth);
    }
  }
  for (const plx of [-376.5, -292]) {
    box(`TSS_Planter_${plx}`, plx, 0.35, 6.9, 1.6, 0.7, 1.1, PAL.stone);
    box(`TSS_PlanterBush_${plx}`, plx, 0.95, 6.9, 1.2, 0.7, 0.8, 0x4a7a3a, { collide: false });
  }
  // hot dog cart silhouette (the corner that smells like everything)
  box('TSS_CartBody', -294, 0.75, -2.2, 1.9, 1.1, 1.1, 0xF7B32B);
  box('TSS_CartUmbrella', -294, 2.35, -2.2, 2.1, 0.12, 2.1, 0xB23A48, { collide: false });
  box('TSS_CartPole', -294, 1.7, -2.2, 0.08, 1.0, 0.08, 0x5a5a62, { collide: false });
  col(-294, 0.75, -2.2, 1.9, 1.5, 1.1);

  // ---- skyline card: the west rim of towers + one spire (fog does the rest) ----
  box('TSS_SKY_spire_base', -428, 26, 0, 18, 52, 18, 0x8a94a0, { collide: false });
  box('TSS_SKY_spire_mid', -428, 55, 0, 12, 10, 12, 0x8a94a0, { collide: false });
  box('TSS_SKY_spire', -428, 70, 0, 2, 20, 2, 0x8a94a0, { collide: false, cast: false });
  for (let i = 0; i < 7; i++) {
    const h = 22 + ((i * 37) % 40);
    box(`TSS_SKY_tower_${i}`, -430 + (i % 3) * 16, h / 2, -40 + i * 13, 12, h, 12, 0x8a94a0, { collide: false });
  }

  // ---- the cast of the square ----
  const rig = (name: string, look: Parameters<typeof buildArticulatedPerson>[0], x: number, z: number, yaw: number): PersonRig => {
    const { group: g, rig: r } = buildArticulatedPerson(look);
    g.name = name;
    g.position.set(x, 0.1, z);
    g.rotation.y = yaw;
    group.add(g);
    return r;
  };
  // the usher — by the Orpheum door, coffee in hand, seen everything
  rig('TSS_Usher', { jacket: 0x6a2c3a, pants: 0x3a3a42, skin: 0xe8b08e, hair: 0x2b2730, style: 'cap' }, -352.3, 7.25, 0);
  col(-352.3, 0.9, 7.25, 0.8, 1.7, 0.8);
  // static crowd (the seats of the square)
  const crowdLooks: Array<[number, number, number, number]> = [
    [0x4a6b5a, 0x3d4a55, 0xd9a06b, 0x453b4c],
    [0x514659, 0x473e50, 0xe8b08e, 0x6a4a3a],
    [0xB23A48, 0x3a3a42, 0xd9a06b, 0x2b2730],
    [0x2A9D8F, 0x473e50, 0x8a5a3a, 0x1a1a22],
    [0xF7B32B, 0x3d4a55, 0xe8b08e, 0x453b4c],
    [0x6D4C7D, 0x3a3a42, 0xd9a06b, 0x6a4a3a],
  ];
  const crowdSpots: Array<[number, number, number]> = [
    [-344.5, -0.8, 0.4], [-342.8, 0.2, 2.8], [-341.2, 1.2, 0.2],   // on the steps
    [-355, 6.2, 0.5], [-331, 6.4, 0.1], [-338, -4.8, Math.PI], [-312, -4.9, Math.PI],
  ];
  const crowdGroups: THREE.Group[] = [];
  crowdSpots.forEach(([cx2, cz2, cy2], i) => {
    const [j, p, s, h] = crowdLooks[i % crowdLooks.length];
    rig(`TSS_Crowd_${i}`, { jacket: j, pants: p, skin: s, hair: h, style: i % 2 ? 'bun' : 'flat', scale: 0.93 + (i % 3) * 0.05 }, cx2, cz2, cy2);
    crowdGroups.push((group.children[group.children.length - 1] as THREE.Group));
  });
  // two movers walking the north sidewalk (the rig's own walk cycle) —
  // facing the direction of travel (the rig's forward is +z at yaw 0, so
  // an x-axis stroll reads east/west only at yaw ±π/2 — the shipped 0/π
  // walked the square sideways, caught on the docs/51 polish pass)
  const moverA = rig('TSS_Mover_A', { jacket: 0x514659, pants: 0x473e50, skin: 0xe8b08e, hair: 0x453b4c, style: 'cap' }, -366, 6.1, Math.PI / 2);
  const moverB = rig('TSS_Mover_B', { jacket: 0x2A9D8F, pants: 0x3a3a42, skin: 0x8a5a3a, hair: 0x2b2730, style: 'bun' }, -300, 6.7, -Math.PI / 2);
  // docs/50 §4.3, paid — the square's crowd carries its own life, inside
  // the zone: a crosser takes the east crosswalk on the honest diagonal,
  // a gawker walks the west stretch and STOPS to let the screens work.
  // The home block's walker indices never hear about any of this.
  const moverC = rig('TSS_Mover_C', { jacket: 0xF7B32B, pants: 0x3d4a55, skin: 0xd9a06b, hair: 0x2b2730, style: 'flat' }, -306, -5.2, 0);
  const moverD = rig('TSS_Mover_D', { jacket: 0x6D4C7D, pants: 0x3a3a42, skin: 0xe8b08e, hair: 0x6a4a3a, style: 'bun' }, -362, 6.5, -Math.PI / 2);
  const moverAGroup = moverA.root.parent as THREE.Group;
  const moverBGroup = moverB.root.parent as THREE.Group;

  // ---- state ----
  let syncDay = 0;
  let lastDay = 0;
  let syncT = -1; // <0 = not running
  let time = 0;
  const moverState = [
    { g: moverAGroup, x: -366, dir: 1, x0: -366, x1: -356, v: 1.15 },
    { g: moverBGroup, x: -300, dir: -1, x0: -306, x1: -296, v: 1.0 },
  ];
  // the crosser (east crosswalk, z-axis) and the gawker (west stretch,
  // stop-and-stare): two behaviors, not four clones of the same pacer
  const crosserG = moverC.root.parent as THREE.Group;
  const gawkerG = moverD.root.parent as THREE.Group;
  const crosser = { z: -5.2, dir: 1, z0: -5.2, z1: 5.4, v: 0.95 };
  const gawker = { x: -362, dir: -1, x0: -366, x1: -356, v: 0.8, wait: 0 };

  const api: TimesSquare = {
    group, colliders,
    get syncedToday() { return syncDay > 0 && syncDay === lastDay; },
    anchors: {
      usher: { x: -352.3, y: 0.1, z: 7.25 },
      steps: { x: -343, y: 1.75, z: 2.2 },
      center: { x: -330, y: 0.1, z: 0 },
    },
    update(dt, feet, day) {
      time += dt;
      lastDay = day;
      let beat: 'sync-start' | null = null;
      const inside = feet.x > TS.xW && feet.x < TS.xE && feet.z > TS.zS - 4 && feet.z < TS.zN + 4 && feet.y > -0.45;
      if (inside && syncDay !== day) {
        syncDay = day;
        syncT = 0;
        beat = 'sync-start';
      }
      // the sync: every screen breathes amber together, once a day
      if (syncT >= 0) {
        syncT += dt;
        const IN = 1.2, HOLD = 2.6, OUT = 1.6;
        let k = 0; // 0..1 warm
        if (syncT < IN) k = syncT / IN;
        else if (syncT < IN + HOLD) k = 1;
        else if (syncT < IN + HOLD + OUT) k = 1 - (syncT - IN - HOLD) / OUT;
        else { k = 0; syncT = -1; }
        for (const m of screenMats) {
          m.emissive.copy(SYNC_BASE).lerp(SYNC_WARM, k);
          m.emissiveIntensity = 0.55 + k * 1.05;
        }
      }
      // the idle shimmer: screens are never still (the Rule of Steam)
      if (syncT < 0) {
        for (let i = 0; i < screenMats.length; i++) {
          screenMats[i].emissiveIntensity = 0.5 + 0.12 * Math.sin(time * 1.1 + i * 1.7);
        }
      }
      // banners lean with the same wind that moves the home block's leaves
      for (let i = 0; i < banners.length; i++) {
        banners[i].rotation.z = Math.sin(time * 1.6 + i * 0.9) * 0.06;
      }
      // the two movers pace their stretch and turn at the ends
      for (const m of moverState) {
        m.x += m.dir * m.v * dt;
        if (m.x > m.x1) { m.x = m.x1; m.dir = -1; }
        if (m.x < m.x0) { m.x = m.x0; m.dir = 1; }
        m.g.position.x = m.x;
        m.g.rotation.y = m.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        updatePersonAnim(m.g, dt);
      }
      // the crosser takes the crosswalk straight across the canyon
      crosser.z += crosser.dir * crosser.v * dt;
      if (crosser.z > crosser.z1) { crosser.z = crosser.z1; crosser.dir = -1; }
      if (crosser.z < crosser.z0) { crosser.z = crosser.z0; crosser.dir = 1; }
      crosserG.position.z = crosser.z;
      crosserG.rotation.y = crosser.dir > 0 ? 0 : Math.PI;
      updatePersonAnim(crosserG, dt);
      // the gawker walks, stops for the screens, walks on (the idle head
      // scan does the staring — the auto mode already knows how)
      if (gawker.wait > 0) {
        gawker.wait -= dt;
        gawkerG.rotation.y = 0; // facing the north-row screens
      } else {
        gawker.x += gawker.dir * gawker.v * dt;
        if (gawker.x > gawker.x1) { gawker.x = gawker.x1; gawker.dir = -1; }
        if (gawker.x < gawker.x0) { gawker.x = gawker.x0; gawker.dir = 1; }
        if (Math.random() < dt * 0.25) gawker.wait = 2.2 + Math.random() * 1.6;
        gawkerG.rotation.y = gawker.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      gawkerG.position.x = gawker.x;
      updatePersonAnim(gawkerG, dt);
      // the seated crowd breathes too (the idle branch is the whole show
      // at speed 0 — breathe, weight shift, the layered head scan)
      for (const cg2 of crowdGroups) updatePersonAnim(cg2, dt);
      return beat;
    },
  };
  return api;
}

/** Static anchor for the registry (the usher's conversation spot). */
export const TS_SPOTS = {
  usher: { x: -352.3, y: 0.1, z: 7.25 },
} as const;
