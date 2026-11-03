/**
 * Station kit — the shared geometry of the K-line stations.
 *
 * One builder, two stations: Alder Heights (home) and 42 St–Times Square
 * sit exactly one ride apart (the swap seam in ride.ts), so both are the
 * SAME parameterized station translated — identical platform, trench, and
 * car alignment, different dressing (name band, accent, ads). The identity
 * is load-bearing: the ride's mid-tunnel teleport is invisible because the
 * two cars are pixel-identical around the player.
 *
 * Everything a zone owns is named with its system prefix (SUB_*) — the
 * static bake skips those prefixes (zone content must never join a district
 * tile: the street ring would light it forever). Colliders are reported as
 * plain center+size records; the world converts them.
 *
 * The step law (Player.ts STEP_UP = 0.35): every climbable rise in here is
 * ≤ 0.33 — the stairs must climb back OUT as honestly as they descend.
 * Clearances: the parked train's roof (-1.0) clears the tunnel ceiling
 * (-0.9 underside) and both stations' portal lintels (-0.9).
 */

import * as THREE from 'three';

// ---- canon coordinates (also in the registry; ride.ts pins the seam) ----
export const STATION = {
  halfW: 8.15,          // platform x half-width
  zSouth: 8.0,          // south wall interior face (camera side, below grade)
  zPlatformEdge: 14.2,  // platform edge / trench lip
  zTrenchN: 17.45,      // trench north wall face
  floorTop: -3.2,       // platform walk surface
  trenchTop: -4.5,      // trench floor
  ceilingTop: -0.15,    // station lid (buried under the 0.1 street)
  ceilingBottom: -0.25,
  trackZ: 15.95,        // track centerline
} as const;

/** The surface stair slot (station A; station B adds ride.ts's swap dx).
 *  South edge open to the walking lane; W/E/N railed. Sits just west of
 *  the existing SUB-01 headhouse (x -43.3..-40.7) — the ped loop's west
 *  terminus (x -42) and the familiar-face bench (x -41.4..-39.6) both
 *  stay clear of it by design. */
export const STAIR_SLOT = { minX: -48.5, maxX: -45.9, minZ: 4.45, maxZ: 7.95 } as const;

export const STAIR_STEPS = 10;
export const STAIR_RISE = 0.33; // 10 × 0.33 = 3.3 = sidewalk top (0.1) - platform (-3.2)

export type ColliderSpec = { x: number; y: number; z: number; w: number; h: number; d: number };

export interface KitCtx {
  g: THREE.Group;
  /** Shared-material factory (the kit caches by hex+opts). */
  M: (c: number, opts?: { emissive?: number; emissiveIntensity?: number }) => THREE.MeshLambertMaterial;
  /** Collider accumulator (the world converts with boxFromCenter). */
  col: (c: ColliderSpec) => void;
}

function box(
  ctx: KitCtx, name: string,
  cx: number, cy: number, cz: number, sx: number, sy: number, sz: number,
  color: number, opts: { collide?: boolean; emissive?: number; ei?: number; map?: THREE.Texture } = {},
): THREE.Mesh {
  const mat = opts.map
    ? new THREE.MeshLambertMaterial({ map: opts.map })
    : ctx.M(color, opts.emissive !== undefined ? { emissive: opts.emissive, emissiveIntensity: opts.ei } : undefined);
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.name = name;
  m.position.set(cx, cy, cz);
  ctx.g.add(m);
  if (opts.collide !== false) ctx.col({ x: cx, y: cy, z: cz, w: sx, h: sy, d: sz });
  return m;
}

// ----------------------------------------------------------- canvas textures

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

const INK = '#3A3440';
const CREAM = '#FFF8F0';

/** Station-name mosaic: cream tile grid, a K bullet, hand-set lettering. */
export function bandTexture(name: string, accent: string): THREE.CanvasTexture {
  return canvasTex(`band:${name}`, 512, 128, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 512, 128);
    c.strokeStyle = 'rgba(58,52,64,0.18)';
    c.lineWidth = 2;
    for (let x = 0; x <= 512; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 128); c.stroke(); }
    for (let y = 0; y <= 128; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
    c.fillStyle = accent;
    c.fillRect(0, 0, 512, 14);
    c.fillRect(0, 114, 512, 14);
    c.fillStyle = '#F7B32B';
    c.beginPath();
    c.moveTo(28, 64);
    c.lineTo(44, 40);
    c.lineTo(60, 64);
    c.lineTo(44, 88);
    c.closePath();
    c.fill();
    c.fillStyle = INK;
    c.font = 'bold 40px Georgia, serif';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(name, 74, 66);
  });
}

/** Ad panels — in-house voice, three variants, rotated per station. */
export function adTexture(variant: number): THREE.CanvasTexture {
  return canvasTex(`ad:${variant}`, 256, 384, (c) => {
    const v = variant % 3;
    c.fillStyle = [CREAM, '#F7B32B', '#2A9D8F'][v];
    c.fillRect(0, 0, 256, 384);
    c.fillStyle = [INK, CREAM, CREAM][v];
    c.textAlign = 'center';
    if (v === 0) {
      c.font = 'bold 40px Georgia, serif';
      c.fillText('THE USUAL.', 128, 120);
      c.font = 'italic 26px Georgia, serif';
      c.fillText('since forever.', 128, 165);
      c.font = '22px Georgia, serif';
      c.fillText('Corner Slice', 128, 320);
      c.fillText('corner of Kestrel', 128, 348);
    } else if (v === 1) {
      c.font = 'bold 32px Georgia, serif';
      c.fillText('COME BACK', 128, 110);
      c.fillText("WHEN YOU'RE", 128, 150);
      c.fillText('SOMEBODY.', 128, 190);
      c.font = 'italic 22px Georgia, serif';
      c.fillText('- the Marquee, 42nd St', 128, 330);
    } else {
      c.font = 'bold 36px Georgia, serif';
      c.fillText('One stop.', 128, 120);
      c.font = '26px Georgia, serif';
      c.fillText('Everything new', 128, 170);
      c.fillText('happens downtown.', 128, 204);
      c.font = '22px Georgia, serif';
      c.fillText('K - the line with lights', 128, 330);
    }
  });
}

/** Priya's two lines, drawn the way she draws them. */
export function mapTexture(): THREE.CanvasTexture {
  return canvasTex('kmap', 256, 320, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 256, 320);
    c.strokeStyle = INK;
    c.lineWidth = 4;
    c.strokeRect(8, 8, 240, 304);
    c.fillStyle = INK;
    c.font = 'bold 22px Georgia, serif';
    c.textAlign = 'center';
    c.fillText('K', 128, 44);
    c.strokeStyle = '#F7B32B';
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(60, 250);
    c.lineTo(60, 90);
    c.stroke();
    c.strokeStyle = '#B23A48';
    c.beginPath();
    c.moveTo(196, 250);
    c.lineTo(196, 90);
    c.stroke();
    c.fillStyle = INK;
    c.font = '18px Georgia, serif';
    c.fillText('uptown', 60, 285);
    c.fillText('downtown', 196, 285);
    c.font = 'italic 15px Georgia, serif';
    c.fillText('one goes under the river', 128, 140);
    c.fillText('one stays with the lights', 128, 200);
  });
}

export function clockTexture(): THREE.CanvasTexture {
  return canvasTex('clock', 128, 128, (c) => {
    c.fillStyle = CREAM;
    c.beginPath();
    c.arc(64, 64, 62, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 6;
    c.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50);
      c.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56);
      c.stroke();
    }
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 24); c.stroke();
    c.beginPath(); c.moveTo(64, 64); c.lineTo(94, 74); c.stroke();
  });
}

// ---------------------------------------------------------------- the stair

/** The walkable descent: 10 solid steps in a railed slot. South edge open
 *  (the entrance), north edge meets the station's south-wall opening. */
export function buildStair(ctx: KitCtx, cx: number): void {
  const w = 1.8;
  const tag = cx > -100 ? 'A' : 'B';
  const z0 = STAIR_SLOT.minZ + 0.15;
  for (let i = 0; i < STAIR_STEPS; i++) {
    const top = 0.1 - STAIR_RISE * (i + 1);
    const depth = i === STAIR_STEPS - 1 ? 0.55 : 0.3;
    const zc = z0 + 0.3 * i + depth / 2;
    const h = top - (STATION.floorTop - 0.2);
    box(ctx, `SUB_Stair_${tag}_${i}`, cx, top - h / 2, zc, w, h, depth, 0x8f8a82);
  }
  // landing bridging the last tread to the platform edge.
  // Top is exactly floorTop (-3.2) — a +0.05 centre used to leave a 10 cm
  // down-step onto the platform and the probe sometimes measured the
  // second-to-last tread (-2.87). Flush landing + deeper last tread help
  // the stair descent land on the platform (docs/51 B1).
  box(ctx, `SUB_StairLanding_${tag}`, cx, STATION.floorTop - 0.05, 7.85, w, 0.1, 0.9, 0x8f8a82);
  // below-grade slot walls either side of the treads
  const slotMidZ = (STAIR_SLOT.minZ + STAIR_SLOT.maxZ) / 2;
  const slotDepth = STAIR_SLOT.maxZ - STAIR_SLOT.minZ;
  for (const sx of [STAIR_SLOT.minX + 0.15, STAIR_SLOT.maxX - 0.15]) {
    box(ctx, `SUB_SlotWall_${sx < cx ? 'W' : 'E'}_${tag}`, sx, -1.6, slotMidZ, 0.3, 3.4, slotDepth, 0x6e5a4e);
  }
  // surface railings on the slot's W/E/N edges (top 1.05 — see in, don't
  // step in sideways). South edge stays open: the entrance.
  for (const [rx, rz, rw, rd] of [
    [STAIR_SLOT.minX + 0.1, slotMidZ, 0.2, slotDepth],
    [STAIR_SLOT.maxX - 0.1, slotMidZ, 0.2, slotDepth],
    [cx, STAIR_SLOT.maxZ - 0.1, w + 0.4, 0.2],
  ] as const) {
    box(ctx, `SUB_HeadRail_${tag}_${rz > 5 ? (rx < cx ? 'w' : 'e') : 'n'}`, rx, 0.575, rz, rw, 1.05, rd, 0x2A9D8F);
  }
  // the green globe post — the signal that says subway from a block away
  box(ctx, `SUB_GlobePost_${tag}`, STAIR_SLOT.minX + 0.35, 1.5, STAIR_SLOT.minZ + 0.4, 0.14, 0.9, 0.14, 0x2A9D8F);
  box(ctx, `SUB_GlobeLamp_${tag}`, STAIR_SLOT.minX + 0.35, 2.05, STAIR_SLOT.minZ + 0.4, 0.3, 0.3, 0.3, 0x2A9D8F, { emissive: 0x9fe8c8, ei: 0.9, collide: false });
  // low head sign
  const sign = box(ctx, `SUB_HeadSign_${tag}`, cx, 1.55, STAIR_SLOT.minZ + 0.25, 1.7, 0.42, 0.08, 0x2A9D8F, { collide: false });
  (sign.material as THREE.MeshLambertMaterial).map = bandTexture('SUBWAY', '#1f6e5c');
  (sign.material as THREE.MeshLambertMaterial).needsUpdate = true;
}

// ---------------------------------------------------------------- the station

export interface StationOpts {
  /** Station center x (A: -44, B: -332). */
  cx: number;
  name: string;
  accent: string;
  /** Which ad variants this station wears. */
  ads: number[];
  /** True for the home station (Priya's platform). */
  home: boolean;
}

/** Meshes that live systems hold by reference and mutate per-frame — the
 *  zone bake (World.bakeZoneStatics) must never merge these, or the merge
 *  DETACHES the mesh and the system's writes land on a dead object:
 *  · SUB_Ceiling_N — index.ts toggles .visible below grade (the dollhouse
 *    lid, docs/50 §5). Found by the bug-hunt sweep: baked, the toggle went
 *    dead, and the ceiling slab walling the cutaway view shut from above.
 *  · SUB_Turnstile{Hub,Arm}_* — index.ts spins the arms on a fare pass
 *    (docs/52 §4.6). Baked, the spin went visually dead (the probe was
 *    measuring a detached mesh).
 *  · SUB_Diagram_* — index.ts flips .visible on the ride's 'priya-lines'
 *    beat (docs/51 B11: the window diagram). Same detach class as the
 *    ceiling: the toggle would land on a baked ghost and the teach beat
 *    would draw nothing, forever. */
export const ZONE_KEEP_RE = /SUB_Ceiling_|SUB_Turnstile|SUB_Diagram_/;

export interface StationResult {
  /** The ceiling slab — hidden while the player is below grade (the
   *  terminal lifts off with it: the dollhouse). */
  ceiling: THREE.Mesh;
  dressing: THREE.Group;
  /** Per-hub arm meshes (2 hubs × 3 arms) — the world spins them on a
   *  fare pass (docs/50 §4.6: "the turnstiles do not spin", paid). */
  turnstileHubs: THREE.Mesh[][];
}

/** The fare line's world z — the world reads this to detect a pass. */
export const FARE_Z = 10.2;
/** Turnstile hub x offsets relative to the station center. */
export const TURNSTILE_DX = [-4.55, 0.65] as const;

/** Which hub (0/1) the feet just crossed the fare line through, or -1.
 *  Pure: the subway's update calls it per station; the test pins the law.
 *  A pass needs a strict sign change across FARE_Z while standing inside a
 *  hub's gate (±0.55 — the base is 0.7 wide); the open lane crosses free. */
export function turnstileHubAt(
  prevZ: number, z: number, feetX: number, cx: number,
): number {
  if ((prevZ - FARE_Z) * (z - FARE_Z) >= 0) return -1; // same side, no pass
  for (let i = 0; i < TURNSTILE_DX.length; i++) {
    if (Math.abs(feetX - (cx + TURNSTILE_DX[i])) < 0.55) return i;
  }
  return -1;
}

/** One parameterized station: floor, walls with portal openings, ceiling,
 *  trench, fare bank, dressing. The stair is built separately so the two
 *  builders stay readable. */
export function buildStation(ctx: KitCtx, opts: StationOpts): StationResult {
  const { cx } = opts;
  const S = STATION;
  const tag = opts.home ? 'A' : 'B';
  const dressing = new THREE.Group();
  dressing.name = `SUB_Dressing_${tag}`;
  ctx.g.add(dressing);
  const dctx: KitCtx = { g: dressing, M: ctx.M, col: ctx.col };

  const tileCream = 0xEDE6D6;
  const steel = 0x5a5a62;
  const yMin = S.floorTop;                     // -3.2
  const yTop = S.ceilingBottom;                // -0.25
  const yMid = (yMin + yTop) / 2;              // -1.725
  const wallH = yTop - yMin;                   // 2.95
  const xW = cx - S.halfW;                     // west face
  const xE = cx + S.halfW;                     // east face

  // platform floor + yellow edge strip
  box(ctx, `SUB_Floor_${tag}`, cx, yMin - 0.05, (S.zSouth + S.zPlatformEdge) / 2, S.halfW * 2 + 0.3, 0.1, S.zPlatformEdge - S.zSouth, tileCream);
  box(ctx, `SUB_Edge_${tag}`, cx, yMin + 0.02, S.zPlatformEdge - 0.2, S.halfW * 2, 0.04, 0.35, 0xF7B32B, { collide: false });

  // south wall (camera side) — two pieces flanking the stair opening
  box(ctx, `SUB_WallS_W_${tag}`, (xW + STAIR_SLOT.minX) / 2, yMid, S.zSouth - 0.15, STAIR_SLOT.minX - xW, wallH, 0.3, tileCream);
  box(ctx, `SUB_WallS_E_${tag}`, (STAIR_SLOT.maxX + xE) / 2, yMid, S.zSouth - 0.15, xE - STAIR_SLOT.maxX, wallH, 0.3, tileCream);

  // north tiled wall behind the tracks (full trench depth)
  box(ctx, `SUB_WallN_${tag}`, cx, (S.trenchTop + yTop) / 2, S.zTrenchN + 0.225, S.halfW * 2 + 0.3, yTop - S.trenchTop, 0.45, tileCream);

  // E/W walls with train-portal openings (portal: y -4.5..-0.9, trench band)
  for (const side of ['W', 'E'] as const) {
    const ex = side === 'W' ? xW : xE;
    const off = side === 'W' ? 0.15 : -0.15;
    // lintel above the portal
    box(ctx, `SUB_Wall${side}_top_${tag}`, ex + off, (-0.9 + yTop) / 2, S.trackZ, 0.3, yTop - (-0.9), S.zTrenchN - S.zPlatformEdge, tileCream);
    // full-height south of the portal (beside the platform)
    box(ctx, `SUB_Wall${side}_s_${tag}`, ex + off, yMid, (S.zSouth + S.zPlatformEdge) / 2, 0.3, wallH, S.zPlatformEdge - S.zSouth, tileCream);
    // north of the portal (between trench wall and the box's back)
    box(ctx, `SUB_Wall${side}_n_${tag}`, ex + off, yMid, (S.zTrenchN + 19.9) / 2, 0.3, wallH, 19.9 - S.zTrenchN, tileCream);
  }

  // ceiling (the dollhouse slab — hidden while the player is underground)
  const ceiling = box(ctx, `SUB_Ceiling_${tag}`, cx, (S.ceilingBottom + S.ceilingTop) / 2, (S.zSouth + 19.9) / 2, S.halfW * 2 + 0.6, S.ceilingTop - S.ceilingBottom, 19.9 - S.zSouth, 0x4a4550, { collide: false });

  // trench: south face below the platform edge + floor
  box(ctx, `SUB_TrenchS_${tag}`, cx, (S.trenchTop + yMin) / 2, S.zPlatformEdge + 0.125, S.halfW * 2 + 0.3, yMin - S.trenchTop, 0.25, 0x4a4550);
  box(ctx, `SUB_TrenchFloor_${tag}`, cx, S.trenchTop - 0.05, S.trackZ, S.halfW * 2 + 0.3, 0.1, S.zTrenchN - S.zPlatformEdge, 0x3e3a46);

  // fare line at z 10.2: wall · turnstile · wall · OPEN LANE · wall ·
  // turnstile · wall. The stair lands in the east pocket, walks west to
  // the lane, north onto the platform — exactly how a local station works.
  // All offsets relative to cx so station B builds identically.
  const fareZ = 10.2;
  // waist-high (1.1) like a real fare bank: it gates the walker (STEP_UP
  // is 0.35) and never guillotines the camera's boom ray into the pocket
  const fareH = 1.1;
  const fareY = yMin + fareH / 2;
  box(ctx, `SUB_FareWall_1_${tag}`, (xW + cx - 4.9) / 2, fareY, fareZ, (cx - 4.9) - xW, fareH, 0.3, steel);
  box(ctx, `SUB_FareWall_2_${tag}`, cx - 3.3, fareY, fareZ, 1.8, fareH, 0.3, steel);
  box(ctx, `SUB_FareWall_3_${tag}`, cx - 0.6, fareY, fareZ, 1.8, fareH, 0.3, steel);
  box(ctx, `SUB_FareWall_4_${tag}`, cx + 4.575, fareY, fareZ, xE - (cx + 1.0), fareH, 0.3, steel);
  // turnstile bases (the 0.7 gaps beside them narrow to ~0.3: decoration
  // that gates, the open lane does the work)
  for (const tx of [cx - 4.55, cx + 0.65]) {
    box(ctx, `SUB_TurnstileBase_${tag}_${tx.toFixed(2)}`, tx, yMin + 0.12, fareZ, 0.7, 0.24, 0.6, steel);
  }

  // pillars (mid-platform, painted green like the local lines)
  for (const px of [cx - 4.1, cx, cx + 4.1]) {
    box(ctx, `SUB_Pillar_${tag}_${px.toFixed(0)}`, px, yMid, 11.7, 0.45, wallH, 0.45, 0x2A9D8F);
  }

  // benches on the platform proper (wood slat + steel legs)
  for (const bx of [cx - 4.6, cx + 4.6]) {
    box(ctx, `SUB_BenchSeat_${tag}_${bx.toFixed(0)}`, bx, yMin + 0.45, 12.9, 1.9, 0.09, 0.55, 0x8a5a3a);
    box(ctx, `SUB_BenchBack_${tag}_${bx.toFixed(0)}`, bx, yMin + 0.78, 13.15, 1.9, 0.5, 0.08, 0x8a5a3a, { collide: false });
    for (const lx of [bx - 0.8, bx + 0.8]) {
      box(ctx, `SUB_BenchLeg_${tag}_${lx.toFixed(1)}`, lx, yMin + 0.22, 12.9, 0.08, 0.44, 0.5, steel, { collide: false });
    }
    ctx.col({ x: bx, y: yMin + 0.3, z: 12.9, w: 1.9, h: 0.6, d: 0.55 });
  }

  // trash bin
  box(ctx, `SUB_Bin_${tag}`, xE - 1.2, yMin + 0.45, 13.4, 0.5, 0.9, 0.5, steel);

  // ---- dressing (no colliders, zone-hidden with the station) ----
  // station-name band on the south wall interior (faces north, into the
  // station — the first thing the descent shows)
  const band = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 1.5),
    new THREE.MeshLambertMaterial({ map: bandTexture(opts.name, opts.accent) }),
  );
  band.name = `SUB_NameBand_${tag}`;
  band.position.set(cx + 2.4, yMid + 0.55, S.zSouth + 0.02);
  dressing.add(band);

  // ads on the far wall, facing south across the tracks
  opts.ads.forEach((v, i) => {
    const ad = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.2),
      new THREE.MeshLambertMaterial({ map: adTexture(v) }),
    );
    ad.name = `SUB_Ad_${tag}_${i}`;
    ad.position.set(cx - 4.8 + i * 3.2, yMid + 0.35, S.zTrenchN - 0.01);
    ad.rotation.y = Math.PI;
    dressing.add(ad);
  });

  // route map on the center pillar (Priya's two lines, drawn plain)
  const map = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.1),
    new THREE.MeshLambertMaterial({ map: mapTexture() }),
  );
  map.name = `SUB_Map_${tag}`;
  map.position.set(cx, yMid + 0.4, 11.7 - 0.24);
  map.rotation.y = Math.PI;
  dressing.add(map);

  // the station clock, hanging (double-faced)
  const clock = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 24),
    new THREE.MeshLambertMaterial({ map: clockTexture(), side: THREE.DoubleSide }),
  );
  clock.name = `SUB_Clock_${tag}`;
  clock.position.set(cx + 1.4, -0.75, 11.7);
  clock.rotation.y = Math.PI / 2;
  dressing.add(clock);
  box(dctx, `SUB_ClockStem_${tag}`, cx + 1.4, -0.32, 11.7, 0.06, 0.55, 0.06, steel, { collide: false });

  // fluorescent strips on the ceiling underside — the light that fills the
  // cutaway once the lid lifts
  for (const lx of [cx - 5.4, cx - 1.8, cx + 1.8, cx + 5.4]) {
    box(dctx, `SUB_Light_${tag}_${lx.toFixed(1)}`, lx, yTop + 0.09, 11.4, 3.1, 0.07, 0.26, 0xFFF8F0, { emissive: 0xFFF2CC, ei: 1.2, collide: false });
  }

  // turnstile dressing: hubs + three arms each — a pass through a hub's
  // gate spins it a third-turn and clicks (docs/50 §4.6, paid; the open
  // lane crosses free, like every station that trusts its riders)
  const turnstileHubs: THREE.Mesh[][] = [];
  for (const tx of [cx - 4.55, cx + 0.65]) {
    box(dctx, `SUB_TurnstileHub_${tag}_${tx}`, tx, yMin + 0.95, fareZ, 0.16, 0.16, 0.55, steel, { collide: false });
    const arms: THREE.Mesh[] = [];
    for (let a = 0; a < 3; a++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 0.09), ctx.M(steel));
      arm.name = `SUB_TurnstileArm_${tag}_${tx.toFixed(2)}_${a}`;
      arm.position.set(tx, yMin + 0.95, fareZ);
      arm.rotation.y = (a / 3) * Math.PI * 2;
      arm.userData.baseY = arm.rotation.y;
      dressing.add(arm);
      arms.push(arm);
    }
    turnstileHubs.push(arms);
  }

  // token booth (northeast pocket) — the station agent who has seen everything
  box(ctx, `SUB_Booth_${tag}`, xE - 1.9, yMid + 0.25, 9.2, 1.7, wallH - 0.5, 1.5, 0x2A9D8F);
  box(dctx, `SUB_BoothGlass_${tag}`, xE - 2.78, yMin + 1.45, 9.2, 0.06, 0.9, 1.1, 0x3d4a52, { collide: false });

  return { ceiling, dressing, turnstileHubs };
}
