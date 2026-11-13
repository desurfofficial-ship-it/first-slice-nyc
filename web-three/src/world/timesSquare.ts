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
 * THE PRODUCTION DRESS WAVE (TSS-PROD): the square stopped reading as a
 * graybox the moment the camera stood in it — bare single-color masses,
 * sparse hand-placed window slots, screens that blew out to blank cream
 * slabs at night (the emissive color replaced their content), no street
 * light anywhere, and a featureless gray skyline slab as the canyon's
 * visual terminus. This wave gives the square its finished surface:
 *
 *  1. BILLBOARDS THAT READ AS BILLBOARDS — six designed 512×320 canvases
 *     (real ad composition: color fields, display type, iconic shapes),
 *     and the LED law: `emissive: white × emissiveMap: same texture`, so
 *     the CONTENT glows day and night instead of washing out. The sync
 *     beat swells intensity and warms the tint a little — it never again
 *     erases what the boards say.
 *  2. PAINTED FACADES — every registry mass wears a procedural facade
 *     canvas (aligned window grids, sills, cornice, brick courses), in a
 *     DAY and a NIGHT variant (night = warm lit windows, glowing shops)
 *     swapped by nightK at the 0.5 crossing in setNightBoost. The old
 *     scattered window-slot boxes retire — the painted grid owns the
 *     windows, ~45 meshes cheaper.
 *  3. GROUND-FLOOR LIFE — storefront bands (awning stripes, mullioned
 *     shop glass, sign bands with the square's own brands) painted into
 *     the camera-facing masses; three striped awnings and two lightbox
 *     signs stand proud over the south walk.
 *  4. STREET LIGHT — eight lamp posts with night-glow heads, and their
 *     light pools painted into the night sidewalk maps (deterministic,
 *     aligned with the lamp x positions). No new real lights — the glow
 *     is emissive + paint, the budget law holds.
 *  5. THE TERMINUS — the west rim skyline card and the closing wall get
 *     facades too; two slim filler towers plug the south row's gaps so
 *     the skyline stops reading as a broken picket; the station block's
 *     north edge gains a mosaic hoarding (42 ST · K LINE) so the gap has
 *     an authored backdrop.
 *  6. PLAZA DRESS — painted pavement and asphalt, striped umbrella and
 *     menu-board cart, show-cloth banners, bleacher-striped red steps,
 *     a glass canopy, and a rooftop water tank on the Orpheum block.
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
  /** The graphics wave: the night emissive boost (0 day … 1 night) —
   *  World writes it from the day cycle so the screens ride over the bloom
   *  threshold after dark. A field write, not a per-frame param. Also owns
   *  the facade DAY/NIGHT map swap (crossing 0.5) and the lamp glow. */
  setNightBoost(k: number): void;
  /** The machine truth the note only implies: the sync FIRED today. A
   *  latch, not a window — probes read this instead of racing the 2.6 s
   *  warm hold (the probe law: machine-honest checks). */
  readonly syncedToday: boolean;
}

// ---------------------------------------------------------------- textures

/** The sync's warm tint (the LED law keeps the boards' content: the sync
 *  raises intensity and nudges the tint toward this — it never replaces
 *  it with a flat color). */
const SYNC_TINT = new THREE.Color(0xffd9a0);
const EMISSIVE_LED = new THREE.Color(0xffffff);

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

/** The deterministic window hash — the facades' lit/unlit law. */
function hash2(x: number, y: number, seed = 0): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function shade(hex: number, f: number): string {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return `rgb(${r},${g},${b})`;
}

// ------------------------------------------------------------ billboards
//
// Six designed boards — in-house parodies with real composition: a color
// field, a display line, an iconic shape, an accent bar. Cozy never loud.

function billboardTexture(variant: number): THREE.CanvasTexture {
  return canvasTex(`tss:bb:${variant}`, 512, 320, (c) => {
    const v = variant % 6;
    const W = 512, H = 320;
    // frame: every board gets a dark chassis edge so it reads as a fixture
    c.fillStyle = '#1c1822';
    c.fillRect(0, 0, W, H);
    const px = 10, py = 10, w = W - 20, h = H - 20; // the live area

    if (v === 0) {
      // REGULAR COFFEE — cream field, giant cup, steam swirl, gold bar
      c.fillStyle = '#FFF8F0'; c.fillRect(px, py, w, h);
      c.fillStyle = '#F7B32B'; c.fillRect(px, py + h - 26, w, 16);
      // the cup (rounded body + saucer + handle)
      const cx = 150, cy = 178;
      c.fillStyle = '#3A3440';
      c.beginPath(); c.roundRect(cx - 62, cy - 58, 124, 96, [6, 6, 34, 34]); c.fill();
      c.beginPath(); c.ellipse(cx, cy + 44, 78, 12, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#3A3440'; c.lineWidth = 12;
      c.beginPath(); c.arc(cx + 74, cy - 16, 26, -1.2, 1.2); c.stroke();
      // steam
      c.strokeStyle = '#B23A48'; c.lineWidth = 7; c.lineCap = 'round';
      for (const dx of [-24, 0, 24]) {
        c.beginPath();
        c.moveTo(cx + dx, cy - 74);
        c.bezierCurveTo(cx + dx + 16, cy - 96, cx + dx - 16, cy - 112, cx + dx, cy - 132);
        c.stroke();
      }
      c.fillStyle = '#FFF8F0';
      c.beginPath(); c.ellipse(cx, cy - 40, 46, 9, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3A3440'; c.textAlign = 'left';
      c.font = 'bold 64px Georgia, serif';
      c.fillText('REGULAR', 248, 96);
      c.fillText('COFFEE.', 248, 164);
      c.font = 'italic 26px Georgia, serif';
      c.fillText('milk, two sugars', 250, 208);
    } else if (v === 1) {
      // THE USUAL — A PLAY — ink field, two masks, playbill type, red band
      c.fillStyle = '#2b2430'; c.fillRect(px, py, w, h);
      c.fillStyle = '#B23A48'; c.fillRect(px, py, w, 34);
      c.fillStyle = '#FFF8F0'; c.textAlign = 'center';
      c.font = 'bold 22px Georgia, serif';
      c.fillText('THE ORPHEUM THEATRE · 42ND ST', W / 2, py + 25);
      // the masks (comedy left, tragedy right)
      const mask = (mx: number, sad: boolean, col: string) => {
        c.fillStyle = col;
        c.beginPath(); c.ellipse(mx, 168, 58, 74, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#2b2430';
        c.beginPath(); c.ellipse(mx - 20, 148, 9, sad ? 12 : 8, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(mx + 20, 148, 9, sad ? 12 : 8, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#2b2430'; c.lineWidth = 7; c.lineCap = 'round';
        c.beginPath();
        if (sad) c.arc(mx, 210, 22, Math.PI * 1.15, Math.PI * 1.85);
        else c.arc(mx, 188, 22, Math.PI * 0.15, Math.PI * 0.85);
        c.stroke();
      };
      mask(138, false, '#F7B32B');
      mask(374, true, '#FFF8F0');
      c.fillStyle = '#FFF8F0';
      c.font = 'bold 44px Georgia, serif';
      c.fillText('THE USUAL — A PLAY', W / 2, 268);
      c.font = 'italic 22px Georgia, serif';
      c.fillStyle = '#FFB85C';
      c.fillText('eight shows a week · curtain 8 sharp', W / 2, 296);
    } else if (v === 2) {
      // K LINE — teal field, roundel, route line, timetable ticks
      c.fillStyle = '#2A9D8F'; c.fillRect(px, py, w, h);
      c.fillStyle = '#FFF8F0';
      c.beginPath(); c.arc(128, 148, 74, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3A3440';
      c.beginPath(); c.arc(128, 148, 56, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#FFF8F0'; c.font = 'bold 74px Georgia, serif';
      c.textAlign = 'center'; c.fillText('K', 128, 174);
      c.textAlign = 'left'; c.fillStyle = '#FFF8F0';
      c.font = 'bold 58px Georgia, serif';
      c.fillText('ONE STOP,', 236, 96);
      c.fillText('EVERYTHING', 236, 158);
      c.font = 'italic 26px Georgia, serif';
      c.fillText('the local you set your watch by', 238, 206);
      // the route diagram: line, two dots, the tick marks
      c.strokeStyle = '#FFF8F0'; c.lineWidth = 8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(240, 258); c.lineTo(472, 258); c.stroke();
      c.fillStyle = '#F7B32B';
      c.beginPath(); c.arc(258, 258, 13, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(452, 258, 13, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#FFF8F0'; c.font = 'bold 17px Georgia, serif';
      c.fillText('ALDER HTS', 236, 292); c.textAlign = 'right'; c.fillText('42 ST', 476, 292);
    } else if (v === 3) {
      // MANGO SODA — mango field, bottle, bubbles, coral band
      const grad = c.createLinearGradient(0, py, 0, py + h);
      grad.addColorStop(0, '#FFB85C'); grad.addColorStop(1, '#F7B32B');
      c.fillStyle = grad; c.fillRect(px, py, w, h);
      c.fillStyle = '#FF6B6B'; c.fillRect(px, py, w, 12);
      // the bottle
      const bx = 136, by = 96;
      c.fillStyle = '#3A3440';
      c.beginPath(); c.roundRect(bx - 34, by + 36, 68, 150, 16); c.fill();
      c.fillRect(bx - 13, by, 26, 44);
      c.beginPath(); c.roundRect(bx - 22, by + 28, 44, 16, 6); c.fill();
      c.fillStyle = '#FFF8F0';
      c.beginPath(); c.roundRect(bx - 26, by + 84, 52, 62, 8); c.fill();
      c.fillStyle = '#FF6B6B'; c.font = 'bold 21px Georgia, serif'; c.textAlign = 'center';
      c.fillText('MANGO', bx, by + 110);
      c.fillText('SODA', bx, by + 134);
      // bubbles
      c.fillStyle = 'rgba(255,248,240,0.85)';
      for (const [bxb, byb, r] of [[64, 92, 10], [86, 60, 6], [210, 78, 8], [232, 108, 5], [70, 210, 7], [220, 236, 6]] as const) {
        c.beginPath(); c.arc(bxb, byb, r, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#3A3440'; c.textAlign = 'left';
      c.font = 'bold 46px Georgia, serif';
      c.fillText('ICE COLD,', 268, 130);
      c.fillText('ALWAYS.', 268, 182);
      c.font = 'italic 24px Georgia, serif';
      c.fillText('the corner cart classic', 270, 222);
    } else if (v === 4) {
      // SEND A POSTCARD — paper field, stamp, cancel lines, ink type
      c.fillStyle = '#FFF8F0'; c.fillRect(px, py, w, h);
      c.strokeStyle = '#B23A48'; c.lineWidth = 4;
      c.strokeRect(px + 6, py + 6, w - 12, h - 12);
      // the stamp (perforated edge = dashed frame)
      c.fillStyle = '#F7B32B';
      const sx = 356, sy = 44, sw = 120, sh = 140;
      c.save();
      c.setLineDash([7, 6]); c.lineWidth = 10;
      c.strokeRect(sx - 5, sy - 5, sw + 10, sh + 10);
      c.restore();
      c.fillRect(sx, sy, sw, sh);
      // the skyline in the stamp
      c.fillStyle = '#B23A48';
      for (let i = 0; i < 6; i++) {
        const bh = 34 + ((i * 29) % 38);
        c.fillRect(sx + 12 + i * 17, sy + sh - 18 - bh, 12, bh);
      }
      c.fillStyle = '#FFF8F0'; c.font = 'bold 15px Georgia, serif'; c.textAlign = 'center';
      c.fillText('NEW YORK', sx + sw / 2, sy + sh - 26);
      // cancel lines
      c.strokeStyle = '#3A3440'; c.lineWidth = 4; c.setLineDash([14, 8]);
      c.beginPath(); c.moveTo(px + 20, sy + 34); c.lineTo(sx - 14, sy + 60); c.stroke();
      c.beginPath(); c.moveTo(px + 20, sy + 66); c.lineTo(sx - 14, sy + 92); c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#3A3440'; c.textAlign = 'left';
      c.font = 'bold 54px Georgia, serif';
      c.fillText('SEND A', 36, 236);
      c.fillText('POSTCARD', 36, 288);
      c.font = 'italic 24px Georgia, serif';
      c.fillText('the city keeps it for you', 252, 286);
    } else {
      // ALDER HTS ⇄ 42 ST — plum field, amber diagram, eleven minutes
      c.fillStyle = '#6D4C7D'; c.fillRect(px, py, w, h);
      c.fillStyle = '#FFB85C'; c.fillRect(px, py, w, 30);
      c.fillStyle = '#2b2430'; c.textAlign = 'center';
      c.font = 'bold 20px Georgia, serif';
      c.fillText('K · THE LOCAL LINE', W / 2, py + 22);
      // the diagram: two stations, the wire between
      c.strokeStyle = '#FFF8F0'; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(90, 150); c.lineTo(422, 150); c.stroke();
      for (const [dx, dy] of [[-24, -14], [0, -14], [24, -14], [-24, 14], [0, 14], [24, 14]] as const) {
        c.beginPath(); c.moveTo(160 + dx, 150 + dy); c.lineTo(160 + dx, 150 + dy + (dy < 0 ? -12 : 12)); c.stroke();
        c.beginPath(); c.moveTo(352 + dx, 150 + dy); c.lineTo(352 + dx, 150 + dy + (dy < 0 ? -12 : 12)); c.stroke();
      }
      c.fillStyle = '#F7B32B';
      c.beginPath(); c.arc(90, 150, 17, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(422, 150, 17, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#FFF8F0'; c.font = 'bold 34px Georgia, serif';
      c.fillText('ALDER HTS', 90, 208); c.fillText('42 ST', 422, 208);
      c.font = 'bold 40px Georgia, serif';
      c.fillText('⇄', 256, 162);
      c.fillStyle = '#FFB85C'; c.font = 'bold 34px Georgia, serif';
      c.fillText('ELEVEN MINUTES', W / 2, 268);
      c.fillStyle = '#FFF8F0'; c.font = 'italic 21px Georgia, serif';
      c.fillText('every four minutes · all night', W / 2, 296);
    }
  });
}

function marqueeTexture(): THREE.CanvasTexture {
  return canvasTex('tss:marquee', 512, 128, (c) => {
    c.fillStyle = '#241d2b';
    c.fillRect(0, 0, 512, 128);
    // the chassis + chase bulbs (two rows, warm cores)
    c.strokeStyle = '#FFB85C';
    c.lineWidth = 8;
    c.strokeRect(8, 8, 496, 112);
    for (let x = 26; x < 492; x += 27) {
      for (const y of [20, 108]) {
        c.fillStyle = '#FFB85C';
        c.beginPath(); c.arc(x, y, 6.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#FFF8F0';
        c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
      }
    }
    c.fillStyle = '#FFB85C'; c.font = 'bold 20px Georgia, serif'; c.textAlign = 'center';
    c.fillText('THE ORPHEUM THEATRE', 256, 40);
    c.fillStyle = '#FFF8F0';
    c.font = 'bold 40px Georgia, serif';
    c.fillText('THE USUAL — A PLAY', 256, 86);
    c.font = 'italic 16px Georgia, serif';
    c.fillText('42nd Street · eight shows a week', 256, 110);
  });
}

/** The blade sign — vertical ORPHEUM letters on the red field, glowing. */
function bladeTexture(): THREE.CanvasTexture {
  return canvasTex('tss:blade', 96, 416, (c) => {
    c.fillStyle = '#B23A48';
    c.fillRect(0, 0, 96, 416);
    c.strokeStyle = '#FFB85C'; c.lineWidth = 5;
    c.strokeRect(5, 5, 86, 406);
    c.fillStyle = '#FFB85C'; c.textAlign = 'center';
    c.font = 'bold 13px Georgia, serif';
    c.fillText('· · · · ·', 48, 26);
    c.fillStyle = '#FFF8F0';
    c.font = 'bold 58px Georgia, serif';
    const word = 'ORPHEUM';
    for (let i = 0; i < word.length; i++) c.fillText(word[i], 48, 92 + i * 50);
    c.fillStyle = '#FFB85C'; c.font = 'bold 13px Georgia, serif';
    c.fillText('· · · · ·', 48, 404);
  });
}

// --------------------------------------------------------------- facades
//
// The procedural facade painter: aligned grids (the law the hand-placed
// window slots broke), sills, lintels, cornice, brick courses — in a DAY
// and a NIGHT state. The night state's lit windows are hash-deterministic,
// never Math.random (the replay law).

interface FacadeCfg {
  wall: number;      // base wall color
  trim: number;      // cornice / sill color
  cols: number;      // window columns across the face
  floors: number;    // window rows up the face
  seed: number;      // the hash seed (per building)
  brick?: boolean;   // paint brick courses
  storefront?: boolean; // ground floor: shops, awnings, signage
  shops?: string[];  // storefront sign names (left → right)
  theater?: boolean; // the Orpheum base: piers, poster cases, ticket glow
}

function facadeTexture(key: string, cw: number, ch: number, cfg: FacadeCfg, night: boolean): THREE.CanvasTexture {
  return canvasTex(`tss:fc:${key}:${night ? 'n' : 'd'}`, cw, ch, (c) => {
    const W = cw, H = ch;
    c.fillStyle = shade(cfg.wall, night ? 0.42 : 1);
    c.fillRect(0, 0, W, H);

    // wall relief: vertical piers between column bays + brick courses
    const bayW = W / cfg.cols;
    if (cfg.brick) {
      c.strokeStyle = shade(cfg.wall, night ? 0.36 : 0.86);
      c.lineWidth = 1;
      for (let y = 6; y < H; y += 7) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      }
    }
    for (let i = 0; i <= cfg.cols; i++) {
      c.fillStyle = shade(cfg.wall, night ? 0.5 : 1.07);
      c.fillRect(Math.round(i * bayW - 3), 0, 5, H);
    }

    // the window grid (the hero): frame + sill + lintel, per-cell glass.
    // Canvas y=0 is the face's TOP (the roofline) and y=H its bottom — the
    // grid runs down from the cornice and stops ABOVE the ground floor.
    const hasGround = !!(cfg.storefront || cfg.theater);
    const top = H * 0.09;
    const bot = hasGround ? H * 0.65 : H * 0.94;
    const rows = cfg.floors;
    const cellH = (bot - top) / rows;
    const winW = bayW * 0.56;
    const winH = cellH * 0.6;
    for (let r = 0; r < rows; r++) {
      const cy = top + cellH * (r + 0.5);
      for (let col = 0; col < cfg.cols; col++) {
        const cx0 = bayW * col + (bayW - winW) / 2;
        const lit = hash2(col * 3.7, r * 7.3, cfg.seed);
        // header band
        c.fillStyle = shade(cfg.wall, night ? 0.32 : 0.8);
        c.fillRect(cx0 - 2, cy - winH / 2 - 5, winW + 4, 5);
        // glass
        if (night) {
          if (lit > 0.42) {
            const warm = hash2(col, r, cfg.seed + 9);
            c.fillStyle = warm > 0.72 ? '#ffe3b0' : warm > 0.3 ? '#ffc97e' : '#e8a765';
          } else {
            c.fillStyle = '#241f2e';
          }
        } else {
          const g = 0.75 + hash2(col, r, cfg.seed + 4) * 0.3;
          c.fillStyle = lit > 0.8 ? shade(0x8aa0b8, g) : shade(0x5a6470, g);
        }
        c.fillRect(cx0, cy - winH / 2, winW, winH);
        // the mullion cross (every pane reads as a window, not a slot)
        c.strokeStyle = shade(cfg.wall, night ? 0.3 : 0.72);
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(cx0 + winW / 2, cy - winH / 2); c.lineTo(cx0 + winW / 2, cy + winH / 2);
        c.moveTo(cx0, cy); c.lineTo(cx0 + winW, cy);
        c.stroke();
        // sill
        c.fillStyle = shade(cfg.trim, night ? 0.55 : 1);
        c.fillRect(cx0 - 3, cy + winH / 2 + 2, winW + 6, 4);
      }
      // the spandrel band between floors
      c.fillStyle = shade(cfg.wall, night ? 0.36 : 0.9);
      c.fillRect(0, cy + cellH * 0.42, W, 3);
    }

    // the cornice: trim band + dentil shadows
    c.fillStyle = shade(cfg.trim, night ? 0.5 : 1);
    c.fillRect(0, 0, W, H * 0.07);
    c.fillStyle = shade(cfg.trim, night ? 0.34 : 0.82);
    for (let x = 4; x < W; x += 14) c.fillRect(x, H * 0.07, 7, 5);

    // ground floor — painted at the canvas BOTTOM (the street level law:
    // canvas y=H is the face's bottom edge, so the shops live there)
    if (cfg.theater) {
      // the Orpheum lobby: stone piers, poster cases, the ticket glow
      const gy = H * 0.42;
      c.fillStyle = shade(cfg.wall, night ? 0.46 : 1.04);
      c.fillRect(0, gy, W, H - gy);
      c.fillStyle = shade(0x513a3a, night ? 0.5 : 1);
      for (const dx of [0.06, 0.36, 0.62]) {
        c.fillRect(W * dx, gy + 8, W * 0.16, H - gy - 16);
        c.fillStyle = night ? '#ffcf8e' : '#6a4a3a';
        c.fillRect(W * dx + 6, gy + 16, W * 0.16 - 12, (H - gy) * 0.52);
        c.fillStyle = shade(0x513a3a, night ? 0.5 : 1);
      }
      // the ticket booth: a glowing box with a marquee mouth
      c.fillStyle = night ? '#ffe3b0' : '#F7B32B';
      c.fillRect(W * 0.845, gy + 10, W * 0.115, (H - gy) * 0.6);
      c.strokeStyle = '#3A3440'; c.lineWidth = 3;
      c.strokeRect(W * 0.845, gy + 10, W * 0.115, (H - gy) * 0.6);
      c.fillStyle = '#3A3440'; c.textAlign = 'center';
      c.font = `bold ${Math.max(10, H * 0.022)}px Georgia, serif`;
      c.fillText('TICKETS', W * 0.9, gy + 10 + (H - gy) * 0.32);
    } else if (cfg.storefront) {
      // the shops: plinth, mullioned glass, awning band, sign boards
      const gy = H * 0.68;
      c.fillStyle = shade(cfg.wall, night ? 0.4 : 0.92);
      c.fillRect(0, gy, W, H - gy);
      const shopW = W / (cfg.shops?.length ?? 3);
      (cfg.shops ?? []).forEach((name, i) => {
        const sx = shopW * i;
        // the sign board
        c.fillStyle = night ? '#ffcf8e' : ['#B23A48', '#2A9D8F', '#F7B32B', '#FF6B6B'][i % 4];
        c.fillRect(sx + 4, gy + 6, shopW - 8, (H - gy) * 0.16);
        c.fillStyle = night ? '#3A2a1a' : '#FFF8F0';
        c.textAlign = 'center';
        c.font = `bold ${Math.max(11, H * 0.026)}px Georgia, serif`;
        c.fillText(name, sx + shopW / 2, gy + 6 + (H - gy) * 0.125);
        // the awning band (striped)
        const ay = gy + 6 + (H - gy) * 0.17;
        for (let s = 0; s < shopW - 8; s += 10) {
          c.fillStyle = s % 20 === 0 ? '#FFF8F0' : shade(0x2A9D8F, night ? 0.55 : 1);
          c.fillRect(sx + 4 + s, ay, 10, (H - gy) * 0.06);
        }
        // the glass: fine mullions, a transom line, interior shelves hinted,
        // a kick plinth — the giant blank-slab look is the unfinished tell
        const gx = sx + 6, gyy = ay + (H - gy) * 0.07;
        const gw = shopW - 12, gh = (H - gy) * 0.42;
        c.fillStyle = night ? '#ffd9a0' : '#7f8ea0';
        c.fillRect(gx, gyy, gw, gh);
        // interior depth: darker vertical slips + shelf silhouettes (day);
        // at night the interior stacks read as warm blocks
        for (let m = 0; m < gw; m += 26) {
          const iw = Math.min(20, gw - m);
          c.fillStyle = night
            ? (hash2(i, m, cfg.seed) > 0.5 ? 'rgba(232,167,101,0.75)' : 'rgba(120,70,40,0.4)')
            : 'rgba(58,52,64,0.18)';
          c.fillRect(gx + m + 3, gyy + gh * 0.3, iw, gh * 0.62);
        }
        // the mullion grid (every ~1.2 m of face reads as a pane)
        c.strokeStyle = '#3A3440'; c.lineWidth = 2.5;
        c.strokeRect(gx, gyy, gw, gh);
        for (let m = 1; m < 6; m++) {
          c.beginPath();
          c.moveTo(gx + (gw * m) / 6, gyy);
          c.lineTo(gx + (gw * m) / 6, gyy + gh);
          c.stroke();
        }
        // the transom bar (the top third is its own band of panes)
        c.beginPath();
        c.moveTo(gx, gyy + gh * 0.3);
        c.lineTo(gx + gw, gyy + gh * 0.3);
        c.stroke();
        // the kick plinth
        c.fillStyle = shade(0x3A3440, night ? 0.9 : 1);
        c.fillRect(gx, gyy + gh, gw, (H - gy) * 0.05);
        // the door
        c.fillStyle = night ? '#e8a765' : '#513a3a';
        c.fillRect(sx + shopW / 2 - 10, ay + (H - gy) * 0.49, 20, (H - gy) * 0.24);
      });
    }
  });
}

// ------------------------------------------------- ground & plaza textures

function pavementTexture(key: string, x0: number, x1: number, lampXs: number[], night: boolean): THREE.CanvasTexture {
  return canvasTex(`tss:pv:${key}:${night ? 'n' : 'd'}`, 1024, 128, (c) => {
    const W = 1024, H = 128;
    c.fillStyle = night ? shade(PAL.walk, 0.34) : shade(PAL.walk, 1);
    c.fillRect(0, 0, W, H);
    // the paving joints: crosswise every ~1.5 m + one lengthwise joint
    const span = x1 - x0;
    c.strokeStyle = night ? 'rgba(0,0,0,0.25)' : 'rgba(58,52,64,0.18)';
    c.lineWidth = 2;
    for (let x = 0; x < W; x += (W / span) * 1.5) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }
    c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();
    // stains (deterministic)
    for (let i = 0; i < 14; i++) {
      const sxx = hash2(i, key.length) * W, syy = hash2(i + 40, key.length) * H;
      c.fillStyle = night ? 'rgba(0,0,0,0.18)' : 'rgba(58,52,64,0.08)';
      c.beginPath(); c.ellipse(sxx, syy, 12 + hash2(i, 7) * 22, 6 + hash2(i, 9) * 10, 0, 0, Math.PI * 2); c.fill();
    }
    if (night) {
      // the lamp pools: warm radial gradients at the lamps' u positions
      for (const lx of lampXs) {
        const u = ((lx - x0) / span) * W;
        const g = c.createRadialGradient(u, H / 2, 4, u, H / 2, 64);
        g.addColorStop(0, 'rgba(255,200,126,0.5)');
        g.addColorStop(1, 'rgba(255,200,126,0)');
        c.fillStyle = g;
        c.fillRect(u - 64, 0, 128, H);
      }
    }
  });
}

function roadTexture(): THREE.CanvasTexture {
  return canvasTex('tss:road', 1024, 128, (c) => {
    const W = 1024, H = 128;
    c.fillStyle = shade(PAL.road, 1);
    c.fillRect(0, 0, W, H);
    // asphalt speckle
    for (let i = 0; i < 320; i++) {
      const g = hash2(i, 3) * 0.35;
      c.fillStyle = g > 0.17 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.14)';
      c.fillRect(hash2(i, 11) * W, hash2(i, 17) * H, 2 + hash2(i, 23) * 3, 2);
    }
    // the center dashes + edge lines (42nd St is quiet here)
    c.fillStyle = 'rgba(255,248,240,0.4)';
    for (let x = 20; x < W; x += 90) c.fillRect(x, H / 2 - 3, 44, 6);
    c.fillStyle = 'rgba(255,248,240,0.22)';
    c.fillRect(0, 8, W, 4);
    c.fillRect(0, H - 12, W, 4);
    // two manholes + a storm grate
    for (const mx of [0.3, 0.68]) {
      c.fillStyle = shade(PAL.manhole, 1);
      c.beginPath(); c.ellipse(W * mx, H * 0.3, 11, 7, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(W * mx, H * 0.3, 8, 5, 0, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = shade(PAL.manhole, 1.2);
    c.fillRect(W * 0.46, H * 0.62, 26, 14);
  });
}

function awningTexture(): THREE.CanvasTexture {
  return canvasTex('tss:awn', 128, 64, (c) => {
    c.fillStyle = '#2A9D8F';
    c.fillRect(0, 0, 128, 64);
    c.fillStyle = '#FFF8F0';
    for (let x = 0; x < 128; x += 24) c.fillRect(x, 0, 12, 64);
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fillRect(0, 52, 128, 12);
  });
}

function bannerTexture(): THREE.CanvasTexture {
  return canvasTex('tss:banner', 128, 192, (c) => {
    c.fillStyle = '#B23A48';
    c.fillRect(0, 0, 128, 192);
    c.strokeStyle = '#FFF8F0'; c.lineWidth = 6;
    c.strokeRect(7, 7, 114, 178);
    // the gold star
    c.fillStyle = '#F7B32B';
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
      const fx = 64 + Math.cos(a) * 26, fy = 52 + Math.sin(a) * 26;
      if (i === 0) c.moveTo(fx, fy); else c.lineTo(fx, fy);
    }
    c.closePath(); c.fill();
    c.fillStyle = '#FFF8F0'; c.textAlign = 'center';
    c.font = 'bold 30px Georgia, serif';
    c.fillText('THE', 64, 108);
    c.fillText('USUAL', 64, 142);
    c.font = 'italic 15px Georgia, serif';
    c.fillText('a play', 64, 168);
  });
}

function stepsTexture(): THREE.CanvasTexture {
  return canvasTex('tss:steps', 128, 64, (c) => {
    c.fillStyle = '#B23A48';
    c.fillRect(0, 0, 128, 64);
    // the nosing + tread shading (each box reads as a bleacher row)
    c.fillStyle = '#F7B32B';
    c.fillRect(0, 0, 128, 7);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(0, 50, 128, 14);
    c.fillStyle = 'rgba(255,248,240,0.14)';
    c.fillRect(0, 10, 128, 4);
  });
}

function cartTexture(): THREE.CanvasTexture {
  return canvasTex('tss:cart', 192, 128, (c) => {
    c.fillStyle = '#F7B32B';
    c.fillRect(0, 0, 192, 128);
    c.fillStyle = '#3A3440';
    c.fillRect(0, 0, 192, 26);
    c.fillStyle = '#FFF8F0'; c.textAlign = 'center';
    c.font = 'bold 19px Georgia, serif';
    c.fillText('HOT DOGS', 96, 19);
    c.font = 'bold 26px Georgia, serif';
    c.fillText('2 for 3', 96, 62);
    c.font = 'italic 15px Georgia, serif';
    c.fillText('musterd · kraut · onions', 96, 88);
    c.fillStyle = '#B23A48';
    c.fillRect(24, 100, 144, 10);
  });
}

function umbrellaTexture(): THREE.CanvasTexture {
  return canvasTex('tss:umb', 128, 64, (c) => {
    c.fillStyle = '#B23A48';
    c.fillRect(0, 0, 128, 64);
    c.fillStyle = '#FFF8F0';
    for (let x = 0; x < 128; x += 32) c.fillRect(x, 0, 16, 64);
    c.fillStyle = 'rgba(0,0,0,0.14)';
    for (let x = 14; x < 128; x += 32) c.fillRect(x, 0, 4, 64);
  });
}

function hoardingTexture(): THREE.CanvasTexture {
  return canvasTex('tss:hoard', 1024, 160, (c) => {
    const W = 1024, H = 160;
    c.fillStyle = '#e8e4dc';
    c.fillRect(0, 0, W, H);
    // the mosaic grid
    c.strokeStyle = 'rgba(58,52,64,0.22)'; c.lineWidth = 2;
    for (let x = 0; x < W; x += 26) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 26) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // gold accent tiles (deterministic sprinkle)
    for (let i = 0; i < 40; i++) {
      c.fillStyle = hash2(i, 5) > 0.6 ? '#F7B32B' : '#2A9D8F';
      if (hash2(i, 9) > 0.55) c.fillRect(Math.floor(hash2(i, 13) * 39) * 26 + 6, Math.floor(hash2(i, 21) * 6) * 26 + 6, 14, 14);
    }
    // the name band (slim, lettered on both thirds so any angle reads it)
    c.fillStyle = '#453e50';
    c.fillRect(60, 40, 904, 80);
    c.fillStyle = '#FFF8F0'; c.textAlign = 'center';
    c.font = 'bold 56px Georgia, serif';
    c.fillText('42 ST', 512, 96);
    c.fillStyle = '#FFB85C'; c.font = 'bold 30px Georgia, serif';
    c.fillText('42 ST · K LINE', 300, 92);
    c.fillText('K LINE · 42 ST', 724, 92);
    // the K bullets
    for (const bx of [40, 984]) {
      c.fillStyle = '#F7B32B';
      c.beginPath(); c.arc(bx, 80, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3A3440';
      c.beginPath(); c.arc(bx, 80, 23, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#FFF8F0'; c.font = 'bold 30px Georgia, serif';
      c.fillText('K', bx, 91);
    }
    c.fillStyle = '#3A3440'; c.font = 'bold 17px Georgia, serif';
    c.fillText('UPTOWN & BROOKLYN LOCAL', 512, 146);
  });
}

function towerTexture(key: string, cw: number, ch: number, wall: number, seed: number, night: boolean): THREE.CanvasTexture {
  return canvasTex(`tss:tw:${key}:${night ? 'n' : 'd'}`, cw, ch, (c) => {
    const W = cw, H = ch;
    c.fillStyle = shade(wall, night ? 0.4 : 1);
    c.fillRect(0, 0, W, H);
    const cols = Math.max(4, Math.round(W / 34));
    const rows = Math.max(6, Math.round(H / 26));
    const bw = W / cols, bh = (H * 0.94) / rows;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const x = col * bw + bw * 0.24, y = r * bh + bh * 0.22;
        const ww = bw * 0.52, hh = bh * 0.56;
        const lit = hash2(col * 5.1, r * 9.7, seed);
        c.fillStyle = night
          ? (lit > 0.55 ? (lit > 0.85 ? '#ffe3b0' : '#ffc97e') : '#201c28')
          : shade(0x5a6470, 0.8 + hash2(col, r, seed) * 0.3);
        c.fillRect(x, y, ww, hh);
        c.fillStyle = shade(wall, night ? 0.32 : 0.78);
        c.fillRect(x - 2, y + hh + 1, ww + 4, 3);
      }
    }
    c.fillStyle = shade(wall, night ? 0.3 : 0.8);
    c.fillRect(0, 0, W, H * 0.05);
  });
}

// ------------------------------------------------------------------ builder

/** One flipped building's registry shell (the far world's rows travel from
 *  World.regShell — A-3 unit 10, DEC-4 Option B standing ruling). */
export interface TSShell { x: number; z: number; w: number; d: number; h: number }
export type TSRegistryRows = Record<'TSS-01' | 'TSS-02' | 'TSS-03' | 'TSS-04' | 'TSS-05', TSShell>;

export function buildTimesSquare(
  parent: THREE.Group,
  M: (c: number, opts?: { emissive?: number; emissiveIntensity?: number }) => THREE.MeshLambertMaterial,
  rows: TSRegistryRows,
): TimesSquare {
  const group = new THREE.Group();
  group.name = 'TSS_Group';
  parent.add(group);
  const colliders: ColliderSpec[] = [];
  const col = (x: number, y: number, z: number, w: number, h: number, d: number) => colliders.push({ x, y, z, w, h, d });

  // the night-swapped facade registry + the night-glow registry (both are
  // driven by setNightBoost — field writes, never per-frame params)
  const facadeMats: Array<{ m: THREE.MeshLambertMaterial; day: THREE.Texture; night: THREE.Texture }> = [];
  const glowMats: Array<{ m: THREE.MeshLambertMaterial; base: number; night: number }> = [];

  const facadeMat = (key: string, cw: number, ch: number, cfg: FacadeCfg): THREE.MeshLambertMaterial => {
    const day = facadeTexture(key, cw, ch, cfg, false);
    const night = facadeTexture(key, cw, ch, cfg, true);
    const m = new THREE.MeshLambertMaterial({ map: day });
    m.envMapIntensity = 0.22;
    // the night-glow law: the NIGHT map doubles as the emissiveMap — its
    // bright pixels (lit windows, shop glass, sign boards) glow under the
    // nightBoost while its dark walls stay dark. Day: intensity 0.
    m.emissive = EMISSIVE_LED.clone();
    m.emissiveMap = night;
    m.emissiveIntensity = 0;
    facadeMats.push({ m, day, night });
    return m;
  };
  const glowMat = (color: number, base: number, night: number): THREE.MeshLambertMaterial => {
    const m = M(color, { emissive: color, emissiveIntensity: base });
    glowMats.push({ m, base, night });
    return m;
  };
  /** The map-swap law for painted surfaces that own a DAY and a NIGHT map
   *  (facades, pavements): register the pair, setNightBoost flips .map. */
  const swapMat = (dayTex: THREE.CanvasTexture, nightTex: THREE.CanvasTexture): THREE.MeshLambertMaterial => {
    const m = new THREE.MeshLambertMaterial({ map: dayTex });
    m.envMapIntensity = 0.22;
    m.emissive = EMISSIVE_LED.clone();
    m.emissiveMap = nightTex;
    m.emissiveIntensity = 0;
    facadeMats.push({ m, day: dayTex, night: nightTex });
    return m;
  };

  const box = (
    name: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number,
    matOrColor: THREE.Material | number, opts: { collide?: boolean; cast?: boolean } = {},
  ): THREE.Mesh => {
    const mat = typeof matOrColor === 'number' ? M(matOrColor) : matOrColor;
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.name = name;
    m.position.set(cx, cy, cz);
    m.castShadow = opts.cast ?? true;
    group.add(m);
    if (opts.collide !== false) col(cx, cy, cz, sx, sy, sz);
    return m;
  };

  // ---- ground: road, sidewalks, curbs, two crosswalks ----
  // the walks carry painted pavement (joints, stains) — and their NIGHT
  // maps carry the lamp pools, aligned with the lamp x positions below
  const lampXsN = [-374, -350, -326, -302];
  const lampXsS = [-370, -342, -318, -296];
  const B0 = -48.5 - 288, B1 = -45.9 - 288; // station B stair mouth: x −336.5..−333.9
  const walkNw = swapMat(pavementTexture('wnw', TS.xW, B0, lampXsN.filter((x) => x < B0), false),
    pavementTexture('wnw', TS.xW, B0, lampXsN.filter((x) => x < B0), true));
  const walkNe = swapMat(pavementTexture('wne', B1, TS.xE, lampXsN.filter((x) => x > B1), false),
    pavementTexture('wne', B1, TS.xE, lampXsN.filter((x) => x > B1), true));
  const walkS = swapMat(pavementTexture('ws', TS.xW, TS.xE, lampXsS, false),
    pavementTexture('ws', TS.xW, TS.xE, lampXsS, true));
  box('TSS_Road', (TS.xW + TS.xE) / 2, -0.1, 0, TS.xE - TS.xW, 0.2, 8,
    swapMat(roadTexture(), roadTexture()),
    { collide: false, cast: false });
  box('TSS_Walk_N_W', (TS.xW + B0) / 2, -0.05, 6, B0 - TS.xW, 0.3, 4, walkNw, { collide: false, cast: false });
  box('TSS_Walk_N_E', (B1 + TS.xE) / 2, -0.05, 6, TS.xE - B1, 0.3, 4, walkNe, { collide: false, cast: false });
  box('TSS_Walk_S', (TS.xW + TS.xE) / 2, -0.05, -6, TS.xE - TS.xW, 0.3, 4, walkS, { collide: false, cast: false });
  // the station block's paving (x −350..−320, z 8..20): the plaza slab that
  // keeps the surface surface — without it the tunnel ceiling below would
  // become the ground and swallow a walker (the below-grade law's one debt)
  box('TSS_StationPlaza', -335, -0.05, 14, 30, 0.3, 12,
    swapMat(pavementTexture('sp', -350, -320, [-326], false), pavementTexture('sp', -350, -320, [-326], true)),
    { collide: false, cast: false });
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
  // A-3 UNIT 10: the masses READ their registry rows — the base/tower
  // splits (the 6 m stone base, the brick shoulder) and the crowns'
  // insets/oversails are the rows' own style laws, derived against the
  // shells; the painted facades and screens ride the faces.
  const t1 = rows['TSS-01'];
  box('TSS_01_base', t1.x, 3, t1.z, t1.w, 6, t1.d,
    facadeMat('t1b', 512, 160, {
      wall: PAL.stone, trim: 0xd8d2c6, cols: 6, floors: 1, seed: 11,
      theater: true,
    }));
  box('TSS_01_tower', t1.x, 6 + (t1.h - 6) / 2, t1.z, t1.w - 4, t1.h - 6, t1.d,
    facadeMat('t1t', 512, 440, {
      wall: PAL.brick, trim: 0xe8d9c0, cols: 8, floors: 8, seed: 21, brick: true,
    }));
  box('TSS_01_crown', t1.x, t1.h + 0.6, t1.z, t1.w - 3, 1.2, t1.d + 1, PAL.stone, { collide: false });
  // the Orpheum rooftop water tank (the skyline's favorite punctuation)
  box('TSS_01_waterTank', t1.x + 6, t1.h + 2.6, t1.z, 3.2, 3.4, 3.2, 0x6e5a4e, { collide: false });
  box('TSS_01_waterCone', t1.x + 6, t1.h + 4.9, t1.z, 1.4, 1.0, 1.4, 0x5a4a42, { collide: false });

  // the Orpheum: marquee + blade sign + the usher's door
  box('TSS_Marquee', -358.5, 4.6, 7.8, 8.5, 2.3, 0.5,
    (() => {
      const tex = marqueeTexture();
      const m = new THREE.MeshLambertMaterial({ map: tex, emissive: EMISSIVE_LED.clone(), emissiveMap: tex, emissiveIntensity: 0.5 });
      m.envMapIntensity = 0.22;
      glowMats.push({ m, base: 0.5, night: 1.25 });
      return m;
    })());
  box('TSS_MarqueeShelf', -358.5, 3.2, 7.7, 8.5, 0.25, 0.9, 0x2b2430, { collide: false });
  // the blade sign: the lettered faces are the ±z pair — the four edges
  // stay plain red (the doubled-letters mirror was a texture-wrap tell)
  {
    const tex = bladeTexture();
    const face = new THREE.MeshLambertMaterial({ map: tex, emissive: EMISSIVE_LED.clone(), emissiveMap: tex, emissiveIntensity: 0.42 });
    face.envMapIntensity = 0.22;
    const edge = M(0x7a2531);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.3, 6.5, 0.45), [edge, edge, edge, edge, face, face]);
    blade.name = 'TSS_Blade';
    blade.position.set(-351.6, 7.4, 7.7);
    blade.castShadow = true;
    group.add(blade);
    col(-351.6, 7.4, 7.7, 1.3, 6.5, 0.45);
    glowMats.push({ m: face, base: 0.42, night: 1.5 });
  }
  box('TSS_TheaterDoor', -352.3, 1.5, 7.9, 1.6, 3.0, 0.2, 0x513a3a);

  const t3 = rows['TSS-03'];
  box('TSS_03_tower', t3.x, t3.h / 2, t3.z, t3.w, t3.h, t3.d,
    facadeMat('t3', 512, 512, {
      wall: PAL.bldg2, trim: 0xd9c3a5, cols: 8, floors: 8, seed: 31, storefront: true,
      shops: ['MANGO SODA', 'THE POSTCARD SHOP', 'K LINE GIFTS'],
    }));
  box('TSS_03_crown', t3.x, t3.h + 0.5, t3.z, t3.w + 1, 1, t3.d + 1, PAL.stone, { collide: false });
  box('TSS_03_water', -297, 28, 12, 2.2, 2.2, 2.2, 0x6e5a4e, { collide: false });

  // ---- south row (camera-facing: the money shot) ----
  const t2 = rows['TSS-02'];
  box('TSS_02_a', t2.x, 7, t2.z, t2.w, 14, t2.d,
    facadeMat('t2a', 512, 256, {
      wall: PAL.bldg, trim: 0xe0d5c8, cols: 8, floors: 4, seed: 41, storefront: true,
      shops: ['REGULAR COFFEE', 'THE ORPHEUM BAR', 'STAGE DOOR DELI'],
    }));
  box('TSS_02_b', t2.x, 14 + (t2.h - 14) / 2, t2.z, t2.w - 6, t2.h - 14, t2.d,
    facadeMat('t2b', 512, 192, {
      wall: PAL.brick, trim: 0xe8d9c0, cols: 7, floors: 3, seed: 43, brick: true,
    }));
  box('TSS_02_crown', t2.x, t2.h + 0.6, t2.z, t2.w - 5, 1.2, t2.d + 1, PAL.stone, { collide: false });
  box('TSS_02_water', -366, 26.2, -12, 2.2, 2.6, 2.2, 0x6e5a4e, { collide: false });
  const t4 = rows['TSS-04'];
  box('TSS_04_tower', t4.x, t4.h / 2, t4.z, t4.w, t4.h, t4.d,
    facadeMat('t4', 512, 512, {
      wall: PAL.bldg2, trim: 0xd9c3a5, cols: 9, floors: 9, seed: 51, storefront: true,
      shops: ['ALDER NEWS', 'NOODLE BAR', 'THE UPTOWN CLOCK'],
    }));
  box('TSS_04_crown', t4.x, t4.h + 0.6, t4.z, t4.w + 1, 1.2, t4.d + 1, PAL.stone, { collide: false });
  const t5 = rows['TSS-05'];
  box('TSS_05', t5.x, t5.h / 2, t5.z, t5.w, t5.h, t5.d,
    facadeMat('t5', 384, 384, {
      wall: PAL.brick, trim: 0xe8d9c0, cols: 6, floors: 6, seed: 61, brick: true, storefront: true,
      shops: ['RECORDS · 42 ST', 'THE SANDWICH WINDOW'],
    }));

  // the south row's two gaps (x −344..−340 and −312..−308) read as a broken
  // picket from the road — two slim filler towers plug them (their heights
  // clear the neighbors' crowns so the skyline gets its serration back)
  box('TSS_06_filler', -342, 17, -14, 3.6, 34, 10,
    facadeMat('f6', 96, 512, { wall: PAL.brick, trim: 0xe8d9c0, cols: 2, floors: 11, seed: 71, brick: true }));
  box('TSS_06_crown', -342, 34.5, -14, 4.4, 1.0, 10.8, PAL.stone, { collide: false });
  box('TSS_07_filler', -310, 19, -14, 3.6, 38, 10,
    facadeMat('f7', 96, 512, { wall: PAL.bldg2, trim: 0xd9c3a5, cols: 2, floors: 12, seed: 73 }));
  box('TSS_07_crown', -310, 38.5, -14, 4.4, 1.0, 10.8, PAL.stone, { collide: false });

  // the west terminus: the canyon's far end was a gray slab + fog — a
  // closing-face tower wall reads as the avenue turning the corner
  box('TSS_08_closeWall', TS.xW - 1.5, 11, 0, 3, 22, 16,
    facadeMat('f8', 96, 256, { wall: PAL.bldg, trim: 0xe0d5c8, cols: 2, floors: 6, seed: 81 }));
  box('TSS_08_crown', TS.xW - 1.5, 22.6, 0, 3.8, 1.2, 16.8, PAL.stone, { collide: false });

  // the station block's north backdrop: the mosaic hoarding (42 ST · K)
  box('TSS_09_hoarding', -335, 2.6, 19.6, 29, 5.2, 0.4,
    (() => {
      const tex = hoardingTexture();
      const m = new THREE.MeshLambertMaterial({ map: tex });
      m.envMapIntensity = 0.22;
      return m;
    })());

  // ---- the screens (one material each — the sync beat owns them all) ----
  // THE LED LAW: emissive white × emissiveMap = the same canvas — the
  // boards' CONTENT is what glows, day and night. The old law (a flat
  // emissive color over the map) washed every board into a blank cream
  // slab the moment the sync or the night boost touched it.
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
    const tex = billboardTexture(i);
    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      emissive: EMISSIVE_LED.clone(),
      emissiveMap: tex,
      emissiveIntensity: 0.55,
    });
    mat.envMapIntensity = 0.22;
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
  const stepTex = stepsTexture();
  const stepMat = new THREE.MeshLambertMaterial({ map: stepTex });
  stepMat.envMapIntensity = 0.22;
  for (let i = 0; i < 5; i++) {
    box(`TSS_Step_${i}`, -343, 0.175 + i * 0.35, -1.5 + i * 1.0, 6, 0.35 + i * 0.35, 1.0, stepMat);
  }
  // glass canopy: posts + beams + two translucent panels (real glass, not
  // a solid slab — you see the boards through it from the steps)
  for (const [px, pz] of [[-345.6, -1], [-340.4, -1], [-345.6, 3], [-340.4, 3]] as const) {
    box(`TSS_StepPost_${px}_${pz}`, px, 1.4, pz, 0.14, 2.8, 0.14, 0xd8d8d8, { collide: false });
  }
  box('TSS_StepBeam_N', -343, 2.85, -1, 5.8, 0.1, 0.14, 0x5a5a62, { collide: false });
  box('TSS_StepBeam_S', -343, 2.85, 3, 5.8, 0.1, 0.14, 0x5a5a62, { collide: false });
  const glassMat = new THREE.MeshLambertMaterial({
    color: 0xfff8f0, transparent: true, opacity: 0.28, depthWrite: false,
  });
  box('TSS_StepGlass_N', -343, 2.85, 0, 5.8, 0.06, 2.1, glassMat, { collide: false, cast: false });
  box('TSS_StepGlass_S', -343, 2.85, 2, 5.8, 0.06, 2.1, glassMat, { collide: false, cast: false });

  // ---- street lights: eight posts, night-glow heads ----
  // The glow is emissive-only (no new real lights — the budget law); the
  // pools on the pavement are painted where these posts stand.
  for (const lx of lampXsN) {
    box(`TSS_LampPole_N_${lx}`, lx, 2.5, 6.9, 0.14, 5.0, 0.14, 0x3a3440);
    box(`TSS_LampArm_N_${lx}`, lx, 4.9, 6.55, 0.1, 0.1, 0.6, 0x3a3440, { collide: false });
    box(`TSS_LampHead_N_${lx}`, lx, 4.78, 6.3, 0.44, 0.16, 0.28, glowMat(0xffc97e, 0.12, 1.8), { collide: false });
  }
  for (const lx of lampXsS) {
    box(`TSS_LampPole_S_${lx}`, lx, 2.5, -6.9, 0.14, 5.0, 0.14, 0x3a3440);
    box(`TSS_LampArm_S_${lx}`, lx, 4.9, -6.55, 0.1, 0.1, 0.6, 0x3a3440, { collide: false });
    box(`TSS_LampHead_S_${lx}`, lx, 4.78, -6.3, 0.44, 0.16, 0.28, glowMat(0xffc97e, 0.12, 1.8), { collide: false });
  }

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
  // three proud awnings over the south-row shops + two lightbox signs
  const awnTex = awningTexture();
  const awnMat = new THREE.MeshLambertMaterial({ map: awnTex });
  awnMat.envMapIntensity = 0.22;
  const awningAt = (name: string, ax: number) => {
    const m = box(name, ax, 3.3, -7.5, 2.6, 0.09, 1.3, awnMat, { collide: false });
    m.rotation.x = 0.28;
  };
  awningAt('TSS_Awn_0', -367);
  awningAt('TSS_Awn_1', -335);
  awningAt('TSS_Awn_2', -303);
  for (const [bx2, bc] of [[-350.5, 0xFF6B6B], [-313, 0x2A9D8F]] as const) {
    box(`TSS_Lightbox_${bx2}`, bx2, 4.4, -7.75, 1.5, 2.2, 0.16, glowMat(bc, 0.28, 1.5), { collide: false });
  }
  // banner poles: double-armed with show cloth (the sway lives in update)
  const banners: THREE.Mesh[] = [];
  const bannTex = bannerTexture();
  const bannMat = new THREE.MeshLambertMaterial({ map: bannTex });
  bannMat.envMapIntensity = 0.22;
  for (const bx of [-370, -346, -318, -294]) {
    box(`TSS_Pole_${bx}`, bx, 3.4, 6.9, 0.14, 6.8, 0.14, 0x5a5a62);
    for (const side of [-1, 1]) {
      const cloth = box(`TSS_Banner_${bx}_${side}`, bx + side * 0.7, 5.4, 6.9, 1.3, 1.7, 0.06, bannMat, { collide: false });
      banners.push(cloth);
    }
  }
  for (const plx of [-376.5, -292]) {
    box(`TSS_Planter_${plx}`, plx, 0.35, 6.9, 1.6, 0.7, 1.1, PAL.stone);
    box(`TSS_PlanterBush_${plx}`, plx, 0.95, 6.9, 1.2, 0.7, 0.8, 0x4a7a3a, { collide: false });
  }
  // hot dog cart silhouette (the corner that smells like everything)
  const cartTex = cartTexture();
  const cartMat = new THREE.MeshLambertMaterial({ map: cartTex });
  cartMat.envMapIntensity = 0.22;
  box('TSS_CartBody', -294, 0.75, -2.2, 1.9, 1.1, 1.1, cartMat);
  const umbTex = umbrellaTexture();
  const umbMat = new THREE.MeshLambertMaterial({ map: umbTex });
  umbMat.envMapIntensity = 0.22;
  box('TSS_CartUmbrella', -294, 2.35, -2.2, 2.1, 0.12, 2.1, umbMat, { collide: false });
  box('TSS_CartPole', -294, 1.7, -2.2, 0.08, 1.0, 0.08, 0x5a5a62, { collide: false });
  col(-294, 0.75, -2.2, 1.9, 1.5, 1.1);

  // ---- skyline card: the west rim of towers + one spire (fog does the
  //      rest) — painted grids so the terminus stops reading as gray foam ----
  const spireDay = towerTexture('sp', 192, 512, 0x8a94a0, 91, false);
  const spireNight = towerTexture('sp', 192, 512, 0x8a94a0, 91, true);
  const spireMat = swapMat(spireDay, spireNight);
  box('TSS_SKY_spire_base', -428, 26, 0, 18, 52, 18, spireMat, { collide: false });
  box('TSS_SKY_spire_mid', -428, 55, 0, 12, 10, 12, 0x8a94a0, { collide: false });
  box('TSS_SKY_spire', -428, 70, 0, 2, 20, 2, 0x8a94a0, { collide: false, cast: false });
  const rimDay = towerTexture('rim', 128, 256, 0x8a94a0, 93, false);
  const rimMat = new THREE.MeshLambertMaterial({ map: rimDay });
  rimMat.envMapIntensity = 0.22;
  for (let i = 0; i < 7; i++) {
    const h = 22 + ((i * 37) % 40);
    box(`TSS_SKY_tower_${i}`, -430 + (i % 3) * 16, h / 2, -40 + i * 13, 12, h, 12, rimMat, { collide: false });
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
  let nightBoost = 0; // the graphics wave: 0 day … 1 night (World's day cycle)
  let nightMapsOn = false; // the facade DAY/NIGHT swap latch
  const tintScratch = new THREE.Color(); // the hot path never allocates
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
    setNightBoost(k) {
      nightBoost = Math.max(0, Math.min(1, k));
      // the facade DAY/NIGHT swap at the 0.5 crossing (a map field write,
      // once per crossing — the shader stays, the uniform moves)
      const wantNight = nightBoost > 0.5;
      if (wantNight !== nightMapsOn) {
        nightMapsOn = wantNight;
        for (const f of facadeMats) f.m.map = wantNight ? f.night : f.day;
      }
      // the painted glow: the night map's bright pixels (windows, shops,
      // signs, pools) breathe up with the boost — a field write per frame
      for (const f of facadeMats) f.m.emissiveIntensity = nightBoost * 0.55;
      // the lamps, the marquee, the blade, the lightboxes: base → night
      for (const g of glowMats) g.m.emissiveIntensity = g.base + (g.night - g.base) * nightBoost;
    },
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
      // the sync: every board breathes amber together, once a day — the
      // intensity swells, the tint warms a little, the CONTENT stays
      if (syncT >= 0) {
        syncT += dt;
        const IN = 1.2, HOLD = 2.6, OUT = 1.6;
        let k = 0; // 0..1 warm
        if (syncT < IN) k = syncT / IN;
        else if (syncT < IN + HOLD) k = 1;
        else if (syncT < IN + HOLD + OUT) k = 1 - (syncT - IN - HOLD) / OUT;
        else { k = 0; syncT = -1; }
        // the graphics wave: at night the boards ride over the bloom
        // threshold (nightBoost 0..1 → ×1.9) so the square glows like the
        // square — by day they stay under it and bloom stays quiet
        const boost = 1 + nightBoost * 0.9;
        tintScratch.copy(EMISSIVE_LED).lerp(SYNC_TINT, k * 0.45);
        for (const m of screenMats) {
          m.emissive.copy(tintScratch);
          m.emissiveIntensity = (0.55 + k * 1.05) * boost;
        }
      }
      // the idle shimmer: boards are never still (the Rule of Steam);
      // the ceiling stays under the probe's 0.62 sync bar (the mobile
      // probe reads intensity > 0.62 as "the sync fired" — the idle must
      // never impersonate the beat)
      if (syncT < 0) {
        for (let i = 0; i < screenMats.length; i++) {
          screenMats[i].emissive.copy(EMISSIVE_LED);
          screenMats[i].emissiveIntensity = (0.5 + 0.09 * Math.sin(time * 1.1 + i * 1.7)) * (1 + nightBoost * 0.9);
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
