/**
 * The NYC character kit — architectural and street details ported from
 * mrdoob/slop-newyork (MIT, Copyright (c) 2026 Mr.doob — see
 * THIRD-PARTY-NOTICES.md (repo root)) and adapted to FIRST SLICE's world
 * laws. The source builds these as instanced pools around a streamed
 * WebGPU city; here the SAME construction recipes (water-tower trestle,
 * rooftop chillers, cornice bands, awnings, the fire-escape template, the
 * ConEd steam vent, the subway stair) are rebuilt as static Lambert
 * piece-builders in the facadeKit convention, so bakeStatics fuses every
 * piece into its district tile for free.
 *
 * What was ported vs adapted (docs/slop-integration/01-SOURCE-REUSE-REPORT.md):
 *   - rooftop HVAC .......... js/buildings.js 569–593 + js/building-details.js
 *                             (w/d/h ranges and the masonry/modern heights;
 *                             the shader-drawn louvers → proud geometry)
 *                             NOTE — the water tower and chimney ports were
 *                             retired in the 2026-11-11 union: main's own
 *                             city-fabric pass (cityFabric.ts) already owns
 *                             the roofscape's tanks/chimneys/bulkheads, so
 *                             this kit keeps the chillers the fabric lacks
 *   - cornice band .......... js/building-details.js 46–53 (0.55 × 0.65
 *                             projecting band, hung 0.33 under the roof)
 *   - awnings ............... js/buildings.js 598–613 (1.8 × 0.75 canvas
 *                             slab at y 3.8; the 5-color palette re-anchored
 *                             to Doc-04 darkenings per the palette law)
 *   - fire escape ........... js/fire-escapes.js escapeGeometry() template
 *                             (per-landing decks, diagonal flights, drop
 *                             ladder, gooseneck) as opaque boxes
 *   - steam vent stack ...... js/street-details.js 547–692 (banded cylinder
 *                             + sawhorses; the TSL smoke sprites are NOT
 *                             ported — the world already owns steam)
 *   - subway stair .......... js/street-props.js createSubwayEntranceParts
 *                             (railings, painted-tread read, SUBWAY band,
 *                             green/cream globes) — the atlas planes became
 *                             geometry so every piece stays bakeable
 *   - USPS relay box ........ js/street-details.js 776–813 (mid-block
 *                             mailbox box; plum-darkened navy per palette law)
 *
 * House rules honored here (facadeKit.ts header):
 *   - Palette only: every new tone is a documented darkening of a Doc-04
 *     anchor or reuses an existing bank color verbatim.
 *   - Shared unit geometries; bakeStatics clones-and-places.
 *   - NOTHING here adds a collider, moves a registry row, or touches the
 *     nav graph — decoration rides existing masses' faces and roofs.
 *   - Deterministic variation lives with the CALLER (seeded rng passed in).
 */

import * as THREE from 'three';
import { PAL } from '../core/palette';
import type { MatBank, SignPairFactory } from './props';

// ---- palette anchors (every tone = a Doc-04 anchor, darkened) --------------
// The wear-row grammar (facadeKit WEAR): darkened shades, no new hues.
export const NYC = {
  iron: 0x25292c,       // PAL.ink darkened — fire-escape / signal steel
  ironLeg: 0x1d2124,    // ink darkened further — trestle legs, braces
  stave: 0x7a5c48,      // the shipped water-tank wood (props.ts canon)
  staveDark: 0x5d4536,  // the shipped tank's shadow tone
  cap: 0x3b4045,        // road darkened — tank roof cap, HVAC top
  hvacBody: 0x8a8378,   // stone darkened — chiller panels
  hvacLouver: 0x4a4552, // PAL.road verbatim — the louver band
  awnBrick: 0x8e3d47,   // WEAR.brickDark — the brick-red canvas
  awnTeal: 0x1f593b,    // teal darkened — the green canvas
  awnPlum: 0x4f3760,    // plum darkened — the navy canvas
  awnGold: 0xd9912b,    // gold darkened — the ochre canvas
  awnInk: 0x2d2d32,     // ink darkened — the charcoal canvas
  ventOrange: 0xd9912b, // gold darkened — the ConEd band (reads orange in amber light)
  shedGreen: 0x1f593b,  // teal darkened — the sidewalk shed ply (source 0x214f37)
  subwayGreen: 0x254938, // teal darkened further — the entrance railings (source value)
  subwaySteel: 0x777c78, // walk darkened — the stair housing (source value)
  globeGreen: 0x3b9761, // the MTA globe's green half (source value)
  globeCream: 0xe2e6ce, // stone darkened — the globe's cream half
  uspsNavy: 0x3d3050,   // plum darkened — the relay box blue
  tread: 0x2b2730,      // PAL.manhole verbatim — the stairwell dark
} as const;

/** The five awning canvases, indexed like the source's colorIdx 0–4. */
export const AWNING_COLORS = [NYC.awnBrick, NYC.awnTeal, NYC.awnPlum, NYC.awnGold, NYC.awnInk] as const;

// ---- shared unit geometries (kit-local, lazily built) ----------------------
let _box: THREE.BoxGeometry | null = null;
let _cyl12: THREE.CylinderGeometry | null = null;
let _cyl8: THREE.CylinderGeometry | null = null;
function box(): THREE.BoxGeometry { return (_box ??= new THREE.BoxGeometry(1, 1, 1)); }
function cyl12(): THREE.CylinderGeometry { return (_cyl12 ??= new THREE.CylinderGeometry(0.5, 0.5, 1, 12)); }
function cyl8(): THREE.CylinderGeometry { return (_cyl8 ??= new THREE.CylinderGeometry(0.5, 0.5, 1, 8)); }

function place(geo: THREE.BufferGeometry, mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

function shadows(g: THREE.Object3D): void {
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
}

// ------------------------------------------------------------ rooftop HVAC
/**
 * A rooftop chiller: the source's w/d 2.4–5.0 × h 2.4 (masonry roofs) box
 * with two dark fan wells on the top face and a proud louver band around
 * the skirt. The source draws louvers in-shader; geometry reads the same
 * from street distance and stays bakeable.
 */
export function makeHVACUnitNYC(bank: MatBank, w: number, d: number, h: number, rng: () => number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'NYC_HVAC';
  const body = bank.get(NYC.hvacBody);
  const dark = bank.get(NYC.hvacLouver);
  const cap = bank.get(NYC.cap);
  g.add(place(box(), body, w, h, d, 0, h / 2, 0));
  // the louver skirt (a proud darker band along the sides)
  g.add(place(box(), dark, w + 0.04, h * 0.32, d + 0.04, 0, h * 0.22, 0));
  // two fan wells on the top (dark shallow drums + one spinning-hint ring)
  const fw = Math.min(w, d) * 0.26;
  for (const [fx, fz] of [[-w * 0.22, 0], [w * 0.22, 0]] as const) {
    g.add(place(cyl12(), cap, fw * 2, 0.1, fw * 2, fx, h + 0.05, fz));
    g.add(place(cyl8(), dark, fw * 1.1, 0.06, fw * 1.1, fx, h + 0.12, fz));
  }
  // the pipe stub running back toward the bulkhead
  const stubL = 0.5 + rng() * 0.8;
  g.add(place(cyl8(), dark, 0.09, stubL, 0.09, w * 0.3, h * 0.45, -d / 2 - stubL / 2));
  shadows(g);
  return g;
}

// ------------------------------------------------------------- cornice band
/**
 * A single-edge projecting cornice band — the source's per-street-edge
 * cornice (0.55 tall × 0.65 deep, hung 0.33 below the roofline so no two
 * ledges share a plane). FIRST SLICE's makeCornice caps whole masses; this
 * one dresses one face of a taller mass (band courses, setback ledges).
 * Local origin: band center at the wall face plane, +z out to the street.
 */
export function makeCorniceBand(bank: MatBank, len: number, y: number, x: number, z: number, rotY: number): THREE.Mesh {
  const m = place(box(), bank.get(PAL.stone), len, 0.55, 0.65, x, y - 0.33, z);
  m.rotation.y = rotY;
  m.name = 'NYC_CorniceBand';
  return m;
}

// ----------------------------------------------------------------- awning
/**
 * A ground-floor canvas awning — the source's 1.8 m projection × 0.75
 * valance slab at y 3.8 (buildings.js 776–796), rebuilt with the shipped
 * storefront awning's tilt grammar so the two read as one city. `colorIdx`
 * picks from AWNING_COLORS exactly like the source's 0–4.
 */
export function makeAwningNYC(bank: MatBank, colorIdx: number, w: number, x: number, y: number, z: number, rotY: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'NYC_Awning';
  const canvas = bank.get(AWNING_COLORS[colorIdx % AWNING_COLORS.length]);
  const ink = bank.get(PAL.ink);
  const slab = place(box(), canvas, w, 0.09, 1.5, 0, 0, 0.55);
  slab.rotation.x = 0.3;
  g.add(slab);
  // the valance — the hanging strip the source's 0.75 tall box implied
  g.add(place(box(), canvas, w, 0.3, 0.06, 0, -0.22, 1.24));
  // two side arms back to the wall
  for (const sx of [-w / 2 + 0.06, w / 2 - 0.06]) {
    const arm = place(box(), ink, 0.05, 0.05, 1.3, sx, 0.12, 0.5);
    arm.rotation.x = 0.3;
    g.add(arm);
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  shadows(g);
  return g;
}

// ------------------------------------------------------------ fire escape
/**
 * The multi-landing fire escape — the port of the source's escapeGeometry
 * template (fire-escapes.js 38–81): a deck at every landing with open
 * guards, diagonal flights of real treads between them, the drop ladder to
 * the sidewalk, and the gooseneck over the parapet. The source renders
 * ironwork with alpha-tested planes; FIRST SLICE's world is opaque Lambert,
 * so pickets/rails are thin boxes and the treads are real slabs — same
 * silhouette, no shader dependency, fully bakeable.
 *
 * `landings` = the deck heights (y of each deck top); the caller derives
 * them from the building's own floors (source law: landings = floors − 1,
 * capped at 7). Local origin: deck centers on the wall face, +z to the
 * street, width `w` spans the facade run.
 */
export function makeFireEscapeStack(bank: MatBank, landings: number[], w = 3.6, roofY = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = 'NYC_FireEscape';
  const iron = bank.get(NYC.iron);
  const top = landings[landings.length - 1] ?? 0;
  const outZ = 0.85; // the deck's street-side reach (source 0.85)

  const deck = (y: number): void => {
    g.add(place(box(), iron, w, 0.07, outZ, 0, y, outZ / 2));
    // open guardrail: posts + top + mid rail (the shipped deco's grammar)
    const posts = Math.max(3, Math.round(w / 0.9));
    for (let i = 0; i <= posts; i++) {
      const px = -w / 2 + (i * w) / posts;
      g.add(place(box(), iron, 0.045, 0.95, 0.045, px, y + 0.52, outZ - 0.04));
      g.add(place(box(), iron, 0.045, 0.95, 0.045, px, y + 0.52, 0.04));
    }
    g.add(place(box(), iron, w, 0.05, 0.05, 0, y + 0.99, outZ - 0.04));
    g.add(place(box(), iron, w, 0.04, 0.04, 0, y + 0.53, outZ - 0.04));
    for (const sz of [0.04, outZ - 0.04]) {
      g.add(place(box(), iron, 0.045, 0.05, outZ, -w / 2, y + 0.99, sz / 2));
      g.add(place(box(), iron, 0.045, 0.05, outZ, w / 2, y + 0.99, sz / 2));
    }
    // diagonal wall braces (the shipped deco's law: a brace you can see)
    for (const bx of [-w / 2 + 0.45, 0, w / 2 - 0.45]) {
      const brace = place(box(), iron, 0.06, 0.05, outZ * 0.95, bx, y - 0.18, outZ * 0.45);
      brace.rotation.x = -0.32;
      g.add(brace);
    }
  };

  // diagonal flight with real treads between consecutive decks, alternating
  // direction like the source's zigzag
  const flight = (fromY: number, toY: number, dir: 1 | -1): void => {
    const rise = toY - fromY;
    const run = w * 0.62 * dir;
    const steps = Math.max(4, Math.round(rise / 0.28));
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      g.add(place(box(), iron, Math.abs(run) / steps + 0.04, 0.035, 0.6, (run * i) / steps, fromY + rise * t, outZ * 0.55));
    }
    // stringers + the flight rail
    const len = Math.hypot(rise, Math.abs(run));
    for (const rz of [outZ * 0.24, outZ * 0.86]) {
      const stringer = place(box(), iron, len, 0.05, 0.05, run / 2, fromY + rise / 2, rz);
      stringer.rotation.z = Math.atan2(rise, run);
      g.add(stringer);
    }
    const rail = place(box(), iron, len, 0.04, 0.04, run / 2, fromY + rise / 2 + 0.85, outZ - 0.06);
    rail.rotation.z = Math.atan2(rise, run);
    g.add(rail);
    for (let i = 0; i <= 3; i++) {
      const px = (run * i) / 4;
      g.add(place(box(), iron, 0.04, 0.85, 0.04, px, fromY + (rise * (i + 0.5)) / 4 + 0.42, outZ - 0.06));
    }
  };

  deck(landings[0]);
  for (let i = 1; i < landings.length; i++) {
    deck(landings[i]);
    flight(landings[i - 1], landings[i], i % 2 === 1 ? 1 : -1);
  }

  // the drop ladder from the lowest deck to the sidewalk (rails + rungs)
  const dropX = -w / 2 + 0.3;
  for (const dx of [-0.16, 0.16]) {
    g.add(place(box(), iron, 0.045, landings[0], 0.045, dropX + dx, landings[0] / 2, outZ * 0.5));
  }
  for (let ry = 0.35; ry < landings[0] - 0.2; ry += 0.38) {
    g.add(place(box(), iron, 0.36, 0.03, 0.03, dropX, ry, outZ * 0.5));
  }
  // the gooseneck over the parapet when the caller gives a roof height
  if (roofY > top) {
    for (const dx of [-0.16, 0.16]) {
      const neck = place(box(), iron, 0.045, roofY - top + 0.7, 0.045, dropX + dx, top + (roofY - top + 0.7) / 2, outZ * 0.5);
      g.add(neck);
    }
    const bend = place(box(), iron, 0.44, 0.05, 0.6, dropX, roofY - 0.15, outZ * 0.5 - 0.2);
    bend.rotation.x = -0.7;
    g.add(bend);
  }
  shadows(g);
  return g;
}

// ------------------------------------------------------------- steam vent
/**
 * The ConEd steam vent stack — the source's 5-band orange/white cylinder
 * with its two sawhorse barricades (street-details.js 547–692). The smoke
 * sprites are NOT ported: the world already owns a seeded steam system.
 */
export function makeSteamVentNYC(bank: MatBank, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'NYC_SteamVent';
  const stripe = bank.get(NYC.ventOrange);
  const cream = bank.get(PAL.cream);
  const ink = bank.get(PAL.ink);
  const H = 1.15;
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const mat = i % 2 === 0 ? stripe : cream;
    g.add(place(cyl8(), mat, 0.5, H / bands, 0.5, 0, (i + 0.5) * (H / bands), 0));
  }
  g.add(place(cyl8(), ink, 0.56, 0.06, 0.56, 0, H + 0.03, 0));
  // the two sawhorses (the source's barricade ring, thinned)
  for (const [hx, hz, rot] of [[0.9, 0.35, 0.4], [-0.75, -0.5, -0.7]] as const) {
    const horse = new THREE.Group();
    for (const lx of [-0.3, 0.3] as const) {
      const leg = place(box(), ink, 0.05, 0.55, 0.05, lx, 0.27, 0);
      leg.rotation.z = lx > 0 ? -0.14 : 0.14;
      horse.add(leg);
    }
    horse.add(place(box(), stripe, 0.8, 0.09, 0.05, 0, 0.5, 0));
    horse.position.set(hx, 0.03, hz);
    horse.rotation.y = rot;
    g.add(horse);
  }
  g.position.set(x, 0.05, z);
  shadows(g);
  return g;
}

// ----------------------------------------------------------- subway stair
/**
 * The classic subway stair entrance — the port of the source's
 * createSubwayEntranceParts (street-props.js 43–118): steel housing under
 * the sidewalk, dark-green railings with their two horizontal bands, the
 * painted-tread stairwell read (geometry bands instead of the source's
 * atlas plane, so every piece stays bakeable), the SUBWAY band sign, and
 * the green/cream globe lamps on both entry posts. Local origin: stair
 * center at sidewalk level; the long axis runs z (the stair descends
 * toward −z); `sign` draws the band text.
 */
export function makeSubwayStairNYC(
  bank: MatBank,
  sign: SignPairFactory,
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'NYC_SubwayStair';
  const steel = bank.get(NYC.subwaySteel);
  const green = bank.get(NYC.subwayGreen);
  const ink = bank.get(PAL.ink);
  const tread = bank.get(NYC.tread);
  const L = 5.6, W = 2.0;

  // the housing: the sunken box under the sidewalk + its coping edges
  g.add(place(box(), steel, W, 1.1, L, 0, -0.55, 0));
  g.add(place(box(), tread, W - 0.16, 1.14, L - 0.3, 0, -0.5, 0.05)); // the open well reads dark
  for (const sx of [-W / 2 + 0.07, W / 2 - 0.07]) {
    g.add(place(box(), steel, 0.14, 0.13, L, sx, 0.065, 0));
  }
  g.add(place(box(), steel, W, 0.13, 0.14, 0, 0.065, -L / 2 + 0.07));
  // painted tread read: proud step strips climbing out of the dark (the
  // source's perspective-shaded canvas, told in geometry)
  for (let i = 0; i < 7; i++) {
    const ty = -0.42 + i * 0.13;
    const tz = -L / 2 + 0.7 + (i * (L - 1.6)) / 7;
    g.add(place(box(), bank.get(0x9a938c), W - 0.4, 0.05, 0.34, 0, ty, tz));
  }
  // the railings: stanchions + two bands per side (the source's y 0.46/1.37)
  for (const sx of [-(W / 2 - 0.09), W / 2 - 0.09]) {
    for (const rz of [-L / 2 + 0.1, 0, L / 2 - 0.1]) {
      const hh = rz > L / 2 - 0.3 ? 2.0 : 1.05;
      g.add(place(box(), green, 0.08, hh, 0.08, sx, 0.1 + hh / 2, rz));
    }
    for (const ry of [0.5, 1.4]) {
      g.add(place(box(), green, 0.06, 0.06, L - 0.1, sx, ry, 0));
    }
  }
  // the far-end cross rails + the entry lintel band (the source's dark plate)
  for (const ry of [0.5, 1.4]) {
    g.add(place(box(), green, W - 0.1, 0.06, 0.06, 0, ry, -L / 2 + 0.1));
  }
  g.add(place(box(), ink, W - 0.1, 0.42, 0.08, 0, 1.62, -L / 2 + 0.1));
  // the entry threshold plate
  g.add(place(box(), steel, W - 0.22, 0.08, 0.24, 0, 0.04, L / 2 - 0.12));

  // the SUBWAY band sign on the lintel (both faces, like the source's planes)
  const band = sign('SUBWAY', 320, 80, PAL.teal, PAL.cream, 48);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.3, 0.36, 0.06),
    [bank.get(PAL.cream), bank.get(PAL.cream), bank.get(PAL.cream), bank.get(PAL.cream), band.face, band.face],
  );
  board.position.set(0, 1.62, -L / 2 + 0.15);
  board.name = 'NYC_SubwayStairSign';
  g.add(board);

  // the globes: green lower half, cream upper half, on both entry posts
  for (const sx of [-(W / 2 - 0.09), W / 2 - 0.09]) {
    const post = place(box(), green, 0.08, 1.0, 0.08, sx, 1.1, L / 2 - 0.1);
    g.add(post);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), bank.get(NYC.globeCream));
    dome.position.set(sx, 1.62, L / 2 - 0.1);
    g.add(dome);
    const under = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 2, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bank.get(NYC.globeGreen));
    under.position.set(sx, 1.62, L / 2 - 0.1);
    under.name = 'NYC_SubwayGlobe';
    g.add(under);
  }
  shadows(g);
  return g;
}

// ------------------------------------------------------------ USPS relay box
/**
 * The dark-blue USPS relay box — the source's mid-block mailbox
 * (street-details.js 776–813): a chamfered navy cabinet with its drawer
 * faces and the dispatch slot.
 */
export function makeMailboxNYC(bank: MatBank, x: number, y: number, z: number, rotY: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'NYC_Mailbox';
  const navy = bank.get(NYC.uspsNavy);
  const ink = bank.get(PAL.ink);
  g.add(place(box(), navy, 0.6, 1.05, 0.55, 0, 0.62, 0));
  g.add(place(box(), navy, 0.52, 0.16, 0.48, 0, 1.2, 0)); // the rounded-top read
  g.add(place(box(), ink, 0.62, 0.08, 0.58, 0, 0.12, 0)); // the kick base
  g.add(place(box(), ink, 0.4, 0.05, 0.03, 0, 1.0, 0.285)); // the dispatch slot
  g.add(place(box(), ink, 0.34, 0.3, 0.03, 0, 0.68, 0.285)); // the drawer face
  g.add(place(box(), ink, 0.1, 0.02, 0.03, 0, 0.68, 0.3));  // its pull
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  shadows(g);
  return g;
}

// ----------------------------------------------------------- subway globes
/**
 * One flanking globe lamp — the green/cream MTA globe on its post, the
 * classic sidewalk marker beside a station stair. The core's SUB-01
 * headhouse wears a pair of these (SI wave); the full stair kit carries
 * two more of the same construction.
 */
export function makeSubwayGlobePost(bank: MatBank, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'NYC_SubwayGlobePost';
  const green = bank.get(NYC.subwayGreen);
  const ink = bank.get(PAL.ink);
  g.add(place(box(), ink, 0.2, 0.12, 0.2, 0, 0.06, 0)); // the base collar
  g.add(place(box(), green, 0.08, 1.55, 0.08, 0, 0.85, 0)); // the post
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), bank.get(NYC.globeCream));
  dome.position.set(0, 1.66, 0);
  g.add(dome);
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 2, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bank.get(NYC.globeGreen));
  under.position.set(0, 1.66, 0);
  under.name = 'NYC_SubwayGlobe';
  g.add(under);
  g.position.set(x, 0.05, z);
  shadows(g);
  return g;
}

// ----------------------------------------------------------- scaffold shed
/**
 * The green sidewalk construction shed — the source's scaffold-shed slab
 * (building-details.js 102–104, buildings.js 798–806) built out honestly:
 * the ply deck at 3.6 m, its valance, the steel legs at the curb line, and
 * one brace per bay. Overhead deck adds NO collider (the walk passes
 * under); the caller registers the deck in the camera's canopy spheres so
 * the boom sidesteps it like a tree crown.
 */
export function makeScaffoldShedNYC(bank: MatBank, w: number, d: number, x: number, z: number, rotY: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'NYC_Shed';
  const ply = bank.get(NYC.shedGreen);
  const steel = bank.get(NYC.iron);
  const DECK_Y = 3.3;
  g.add(place(box(), ply, w, 0.12, d, 0, DECK_Y, 0));
  g.add(place(box(), ply, w, 0.34, 0.05, 0, DECK_Y - 0.2, d / 2)); // the street valance
  const bays = Math.max(2, Math.round(w / 1.9));
  for (let i = 0; i <= bays; i++) {
    const px = -w / 2 + (i * w) / bays;
    for (const pz of [d / 2 - 0.18, -d / 2 + 0.18]) {
      g.add(place(box(), steel, 0.09, DECK_Y, 0.09, px, DECK_Y / 2, pz));
    }
    if (i < bays) {
      const brace = place(box(), steel, 0.05, 0.05, d - 0.4, px + w / bays / 2, DECK_Y - 0.45, 0);
      g.add(brace);
    }
  }
  g.position.set(x, 0.05, z);
  g.rotation.y = rotY;
  shadows(g);
  return g;
}
