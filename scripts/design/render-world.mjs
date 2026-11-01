/**
 * Master map renderer — reads docs/data/world-registry.json and draws the
 * blueprint: (1) the full master map, (2) the story-block detail sheet with
 * every shipped interaction anchor, (3) the interior floor-plan sheet.
 * SVG is rendered to PNG with Playwright (same harness as the probe scripts).
 * Usage: node scripts/design/render-world.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = JSON.parse(readFileSync(join(ROOT, 'docs/data/world-registry.json'), 'utf8'));
const OUT = join(ROOT, 'docs', 'assets', 'design');
mkdirSync(OUT, { recursive: true });

// ---------- Doc 04 palette ----------
const C = {
  road: '#4a4552', walk: '#b9b1a6', curb: '#8f8a82', lawn: '#3a7355', path: '#c9bfa8',
  sand: '#e3d29b', bed: '#7a5c48', water: '#7fa7c9',
  A: '#f7b32b', B: '#2a9d8f', Cls: '#b23a48', D: '#9c8aa5',
  ink: '#3a3440', paper: '#fff8f0', amber: '#ffb85c', teal: '#2a9d8f', coral: '#ff6b6b',
};
const CLASS_FILL = { A: C.A, B: C.B, C: C.Cls, D: C.D };

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/** world→svg transform for a given window+scale, north up */
function makeTx(win, scale, ox, oy) {
  return {
    px: (x) => ox + (x - win.xMin) * scale,
    py: (z) => oy + (win.zMax - z) * scale,
    s: scale,
  };
}

function rect(tx, f, fill, stroke, extra = '') {
  const x = tx.px(f.x - f.w / 2), y = tx.py(f.z + f.d / 2);
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(f.w * tx.s).toFixed(1)}" height="${(f.d * tx.s).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="1.4" ${extra}/>`;
}

function text(tx, x, z, str, size, fill = C.ink, anchor = 'middle', weight = 600, rot = 0) {
  const px = tx.px(x), py = tx.py(z);
  return `<text x="${px.toFixed(1)}" y="${py.toFixed(1)}" font-family="Trebuchet MS, sans-serif" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}" ${rot ? `transform="rotate(${rot} ${px.toFixed(1)} ${py.toFixed(1)})"` : ''}>${esc(str)}</text>`;
}

// ============================== 1. MASTER MAP ==============================
function masterMap() {
  const win = { xMin: -98, xMax: 98, zMin: -66, zMax: 66 };
  const scale = 8.2, ox = 30, oy = 46;
  const tx = makeTx(win, scale, ox, oy);
  const W = (win.xMax - win.xMin) * scale + ox + 210;
  const H = (win.zMax - win.zMin) * scale + oy + 30;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += `<rect width="${W}" height="${H}" fill="${C.paper}"/>`;

  // world boundary
  const b = R.bounds.world;
  s += `<rect x="${tx.px(b.xMin)}" y="${tx.py(b.zMax)}" width="${(b.xMax - b.xMin) * scale}" height="${(b.zMax - b.zMin) * scale}" fill="none" stroke="${C.ink}" stroke-width="2" stroke-dasharray="7 5" opacity="0.55"/>`;

  // streets (roads + walks) — full spans
  for (const st of R.streets) {
    if (st.axis === 'EW') {
      s += `<rect x="${tx.px(-84)}" y="${tx.py(st.walkN.zMax)}" width="${168 * scale}" height="${(st.walkN.zMax - st.walkS.zMin) * scale}" fill="${C.walk}"/>`;
      s += `<rect x="${tx.px(-84)}" y="${tx.py(st.road.zMax)}" width="${168 * scale}" height="${st.road.width * scale}" fill="${C.road}"/>`;
    } else {
      s += `<rect x="${tx.px(st.walkW.xMin)}" y="${tx.py(64)}" width="${(st.walkE.xMax - st.walkW.xMin) * scale}" height="${128 * scale}" fill="${C.walk}"/>`;
      s += `<rect x="${tx.px(st.road.xMin)}" y="${tx.py(64)}" width="${st.road.width * scale}" height="${128 * scale}" fill="${C.road}"/>`;
    }
  }
  // curbs (Kestrel only, matching the shipped granite line)
  s += `<rect x="${tx.px(-84)}" y="${tx.py(4.35)}" width="${168 * scale}" height="1.6" fill="${C.curb}"/>`;
  s += `<rect x="${tx.px(-84)}" y="${tx.py(-4.35) - 1.6}" width="${168 * scale}" height="1.6" fill="${C.curb}"/>`;
  // lane dashes on avenues
  for (const st of R.streets) if (st.axis === 'NS') {
    s += `<line x1="${tx.px(st.centerline)}" y1="${tx.py(-64)}" x2="${tx.px(st.centerline)}" y2="${tx.py(64)}" stroke="${C.paper}" stroke-width="1.6" stroke-dasharray="10 8" opacity="0.5"/>`;
  }
  // crosswalks
  for (const xw of R.crosswalks) {
    if (xw.x === undefined) continue;
    const w = (xw.w ?? 3.4) * scale;
    if (xw.axis === 'NS') {
      s += `<rect x="${tx.px(xw.x) - w / 2}" y="${tx.py(xw.z) - 8}" width="${w}" height="16" fill="${C.paper}" opacity="0.85"/>`;
      for (let i = -1; i <= 1; i++) s += `<line x1="${tx.px(xw.x) + i * w / 3}" y1="${tx.py(xw.z) - 7}" x2="${tx.px(xw.x) + i * w / 3}" y2="${tx.py(xw.z) + 7}" stroke="${C.road}" stroke-width="1.6"/>`;
    } else {
      s += `<rect x="${tx.px(xw.x) - w / 2}" y="${tx.py(xw.z) - 11}" width="${w}" height="22" fill="${C.paper}" opacity="0.85"/>`;
      for (let i = -1; i <= 1; i++) s += `<line x1="${tx.px(xw.x) - w / 2 + 2}" y1="${tx.py(xw.z) + i * 6}" x2="${tx.px(xw.x) + w / 2 - 2}" y2="${tx.py(xw.z) + i * 6}" stroke="${C.road}" stroke-width="1.6"/>`;
    }
  }

  // parks (under buildings so fences read on top)
  for (const p of R.parks) {
    const bb = p.bbox;
    const fill = p.id === 'PLY-MARLOW' ? C.sand : (p.id === 'GRD-GABLE' ? '#a8c090' : C.lawn);
    s += `<rect x="${tx.px(bb.xMin)}" y="${tx.py(bb.zMax)}" width="${(bb.xMax - bb.xMin) * scale}" height="${(bb.zMax - bb.zMin) * scale}" fill="${fill}" stroke="${C.ink}" stroke-width="1.2" ${p.status === 'planned' ? 'stroke-dasharray="5 4" opacity="0.92"' : ''}/>`;
    if (p.id === 'GRD-GABLE') for (const [bx, bz] of p.layout.beds)
      s += `<rect x="${tx.px(bx - 1.2)}" y="${tx.py(bz + 0.8)}" width="${2.4 * scale}" height="${1.6 * scale}" fill="${C.bed}"/>`;
    if (p.id === 'PLY-MARLOW') {
      const sb = p.layout.sandbox;
      s += `<rect x="${tx.px(sb.x - sb.w / 2)}" y="${tx.py(sb.z + sb.d / 2)}" width="${sb.w * scale}" height="${sb.d * scale}" fill="${C.sand}" stroke="${C.curb}"/>`;
    }
  }

  // buildings
  for (const b of R.buildings) {
    const f = b.footprint;
    const fill = CLASS_FILL[b.class];
    const planned = b.status === 'planned';
    const isD = b.class === 'D';
    s += rect(tx, f, fill, C.ink, `opacity="${isD ? 0.34 : planned ? 0.5 : 0.95}" ${planned ? 'stroke-dasharray="5 4"' : ''}`);
    // label short name for the important ones
    const short = { 'KTN-01': 'TERMINAL', 'ROS-01': "ROSA'S", 'KTN-02': 'SUNRISE', 'KTN-03': 'GINKGO', 'KTN-04': 'PIZZA', 'KTN-05': 'FADE KING', 'KTS-01': 'BROWNSTONES', 'KTS-02': 'THE CECIL', 'KTS-03': 'TENEMENT', 'KTN-00W': 'CORNER HO.', 'KTN-06': 'CAFE SHELL', 'KCM-01': 'ALDER WORKS', 'SND-01': 'DINER', 'SUB-01': '(K)', 'SUB-02': '(K)', 'SMB-01': 'BAKERY', 'SMB-02': 'RECORDS', 'SMB-03': 'HARDWARE', 'GRB-03': 'FATIMA' }[b.id];
    if (short && b.class !== 'D') s += text(tx, f.x, f.z + 0.9, short, 10.5, planned ? '#5a5464' : C.paper, 'middle', 800);
  }
  // half-court paint (existing, exact: Court_Paint at (43.75, 6.1) 7.3×3.4)
  s += rect(tx, { x: 43.75, z: 6.1, w: 7.3, d: 3.4 }, '#4a4552', C.ink, 'opacity="0.85"');
  s += text(tx, 43.75, 6.2, 'COURT', 8.5, C.paper, 'middle', 700);
  // alley tick
  s += rect(tx, { x: 32.1, z: 9.3, w: 2.8, d: 2.6 }, C.ink, C.ink, 'opacity="0.8"');

  // landmarks
  const lmkPos = { 'LMK-01': [-42, 3.4], 'LMK-02': [-16, 7], 'LMK-03': [-14, -11], 'LMK-04': [57, -6.4], 'LMK-05': [50.6, -14], 'LMK-06': [0, -14], 'LMK-07': [-60, 26] };
  let li = 1;
  for (const l of R.landmarks) {
    const [lx, lz] = lmkPos[l.id];
    s += `<g><circle cx="${tx.px(lx)}" cy="${tx.py(lz)}" r="9" fill="${C.coral}" stroke="${C.paper}" stroke-width="2"/><text x="${tx.px(lx)}" y="${tx.py(lz) + 3.6}" font-size="11" font-weight="800" fill="${C.paper}" text-anchor="middle" font-family="Trebuchet MS, sans-serif">${li}</text></g>`;
    li++;
  }

  // street labels
  s += text(tx, 0, 1.9, 'KESTREL STREET  (the story street — two-way, 16 m)', 15, C.paper, 'middle', 800);
  s += text(tx, -72, 24, 'JUNIPER AVENUE · the K runs beneath', 13.5, C.paper, 'middle', 800, -90);
  s += text(tx, 72, 24, 'SYCAMORE AVENUE · commercial', 13.5, C.paper, 'middle', 800, -90);
  s += text(tx, -20, 39.2, 'GABLE STREET · brownstones', 12.5, C.paper, 'middle', 800);
  s += text(tx, -20, -38.9, 'MARLOW STREET · bakery row + playground', 12.5, C.paper, 'middle', 800);
  s += text(tx, 0, 20.2, 'KESTREL GREEN', 10.5, C.paper, 'middle', 800);
  s += text(tx, -3, 24.6, 'GABLE GARDEN', 9.5, C.ink, 'middle', 800);
  s += text(tx, -7, -25.6, 'MARLOW PLAYGROUND', 9, C.ink, 'middle', 800);
  s += text(tx, 39, -6.2, 'CORNER PARK', 9.5, C.paper, 'middle', 800);
  s += text(tx, -42, 5, 'SUBWAY PLAZA', 9.5, C.ink, 'middle', 800);

  // blocks labels
  s += text(tx, -30, 31.6, 'BLK-N  Gable–Kestrel', 11, '#6a6472', 'middle', 700);
  s += text(tx, -30, -30.8, 'BLK-S  Kestrel–Marlow', 11, '#6a6472', 'middle', 700);

  // north arrow + scale
  s += `<g transform="translate(${W - 168}, 34)"><path d="M0,-16 L7,10 L0,4 L-7,10 Z" fill="${C.ink}"/><text x="0" y="26" font-size="12" text-anchor="middle" fill="${C.ink}" font-weight="800" font-family="Trebuchet MS, sans-serif">N ( +z )</text></g>`;
  const sbx = tx.px(60), sby = tx.py(-58) + 26;
  s += `<line x1="${sbx}" y1="${sby}" x2="${sbx + 20 * scale}" y2="${sby}" stroke="${C.ink}" stroke-width="3"/><line x1="${sbx}" y1="${sby - 5}" x2="${sbx}" y2="${sby + 5}" stroke="${C.ink}" stroke-width="3"/><line x1="${sbx + 20 * scale}" y1="${sby - 5}" x2="${sbx + 20 * scale}" y2="${sby + 5}" stroke="${C.ink}" stroke-width="3"/><text x="${sbx + 10 * scale}" y="${sby - 8}" font-size="12" text-anchor="middle" fill="${C.ink}" font-weight="700" font-family="Trebuchet MS, sans-serif">20 m</text>`;

  // legend
  const lgx = W - 196, lgy = 70;
  s += `<rect x="${lgx - 14}" y="${lgy - 24}" width="200" height="270" rx="8" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.4"/>`;
  s += `<text x="${lgx}" y="${lgy - 4}" font-size="14" font-weight="800" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">LEGEND — building class</text>`;
  const rows = [
    [C.A, 'A — fully enterable (interior)', false], [C.B, 'B — ground-floor interior / bay', false],
    [C.Cls, 'C — exterior only', false], [C.D, 'D — backdrop mass / skyline', false],
    ['#ffffff', 'planned (dashed, 50%)', true],
  ];
  let ly = lgy + 22;
  for (const [col, label, dash] of rows) {
    s += `<rect x="${lgx}" y="${ly - 11}" width="30" height="16" fill="${col}" stroke="${C.ink}" stroke-width="1.2" ${dash ? 'stroke-dasharray="4 3" opacity="0.5"' : ''}/>`;
    s += `<text x="${lgx + 38}" y="${ly + 2}" font-size="11.5" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">${esc(label)}</text>`;
    ly += 26;
  }
  s += `<circle cx="${lgx + 15}" cy="${ly - 3}" r="9" fill="${C.coral}" stroke="${C.paper}" stroke-width="2"/><text x="${lgx + 38}" y="${ly + 1}" font-size="11.5" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">landmark (docs/39 §6)</text>`;
  ly += 26;
  s += `<rect x="${lgx}" y="${ly - 11}" width="30" height="16" fill="${C.lawn}" stroke="${C.ink}" stroke-width="1.2"/><text x="${lgx + 38}" y="${ly + 2}" font-size="11.5" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">park / green / garden</text>`;
  ly += 26;
  s += `<rect x="${lgx}" y="${ly - 11}" width="30" height="16" fill="${C.sand}" stroke="${C.ink}" stroke-width="1.2"/><text x="${lgx + 38}" y="${ly + 2}" font-size="11.5" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">playground</text>`;
  ly += 28;
  s += `<text x="${lgx}" y="${ly + 4}" font-size="10" fill="#6a6472" font-family="Trebuchet MS, sans-serif">existing = solid · planned = dashed</text>`;

  // title
  s += `<text x="30" y="30" font-size="21" font-weight="800" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">FIRST SLICE — ALDER HEIGHTS · MASTER WORLD MAP (docs/39)</text>`;
  s += `<text x="30" y="30" dx="0" dy="0" font-size="1" fill="none"></text>`;
  s += `</svg>`;
  return s;
}

// ==================== 2. STORY-BLOCK DETAIL SHEET ====================
function detailMap() {
  const win = { xMin: -52, xMax: 52, zMin: -25, zMax: 25.5 };
  const scale = 14.5, ox = 34, oy = 108;
  const tx = makeTx(win, scale, ox, oy);
  const W = (win.xMax - win.xMin) * scale + ox + 60;
  const H = (win.zMax - win.zMin) * scale + oy + 190;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += `<rect width="${W}" height="${H}" fill="${C.paper}"/>`;
  s += `<text x="24" y="36" font-size="20" font-weight="800" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">THE STORY BLOCK — as shipped @ main 1ea39c2 (every number below is load-bearing)</text>`;
  s += `<text x="24" y="58" font-size="12.5" fill="#6a6472" font-family="Trebuchet MS, sans-serif">x −48..48 · z −22..22.5 (invisible walls today) · road z ±4 · walks z 4..8 / −8..−4 · the registry preserves every footprint and anchor exactly</text>`;

  // streets
  s += `<rect x="${tx.px(-52)}" y="${tx.py(8)}" width="${104 * scale}" height="${4 * scale}" fill="${C.walk}"/>`;
  s += `<rect x="${tx.px(-52)}" y="${tx.py(4)}" width="${104 * scale}" height="${8 * scale}" fill="${C.walk}"/>`;
  s += `<rect x="${tx.px(-52)}" y="${tx.py(4)}" width="${104 * scale}" height="${8 * scale}" fill="none"/>`;
  s += `<rect x="${tx.px(-52)}" y="${tx.py(4)}" width="${104 * scale}" height="${(4) * scale}" fill="${C.walk}"/>`;
  s += `<rect x="${tx.px(-52)}" y="${tx.py(4)}" width="${104 * scale}" height="${8 * scale}" fill="${C.walk}" opacity="0"/>`;
  s += `<rect x="${tx.px(-52)}" y="${tx.py(-4)}" width="${104 * scale}" height="${8 * scale}" fill="${C.walk}"/>`;
  s += `<rect x="${tx.px(-52)}" y="${tx.py(4)}" width="${104 * scale}" height="${(4) * scale}" fill="${C.road}"/>`;
  s += `<rect x="${tx.px(-52)}" y="${tx.py(-4)}" width="${104 * scale}" height="${(4) * scale}" fill="${C.road}"/>`;
  s += `<rect x="${tx.px(-52)}" y="${tx.py(4.35)}" width="${104 * scale}" height="2" fill="${C.curb}"/>`;
  s += `<rect x="${tx.px(-52)}" y="${tx.py(-4.35) - 2}" width="${104 * scale}" height="2" fill="${C.curb}"/>`;
  // crosswalk x=-5
  s += `<rect x="${tx.px(-5) - 1.7 * scale}" y="${tx.py(4)}" width="${3.4 * scale}" height="${8 * scale}" fill="${C.paper}" opacity="0.9"/>`;
  for (let i = 0; i < 6; i++) s += `<line x1="${tx.px(-5) - 1.7 * scale + 2}" y1="${tx.py(4.3 + i * 1.3)}" x2="${tx.px(-5) + 1.7 * scale - 2}" y2="${tx.py(4.3 + i * 1.3)}" stroke="${C.road}" stroke-width="1.4"/>`;

  // buildings (existing) — exact registry footprints
  for (const b of R.buildings) {
    if (b.status !== 'existing' || !b.footprint) continue;
    s += rect(tx, b.footprint, CLASS_FILL[b.class], C.ink, 'opacity="0.95"');
    const short = { 'KTN-01': 'TERMINAL', 'ROS-01': "ROSA'S", 'KTN-02': 'SUNRISE LAUNDRY', 'KTN-03': 'GINKGO WALK-UP', 'KTN-04': 'PIZZA', 'KTN-05': 'FADE KING + COURT', 'KTS-01': 'BROWNSTONE ROW', 'KTS-02': 'THE CECIL + FIRE ESCAPE', 'KTS-03': 'TENEMENT' }[b.id];
    if (short) s += text(tx, b.footprint.x, b.footprint.z + 0.8, short, 11.5, C.paper, 'middle', 800);
  }
  // bodega roof billboard note
  s += text(tx, -16, 19, '↑ walkable roof', 9.5, C.paper, 'middle', 600);

  // pocket park + plaza + subway
  const prk = R.parks.find((p) => p.id === 'PRK-CORNER');
  s += `<rect x="${tx.px(prk.bbox.xMin)}" y="${tx.py(prk.bbox.zMax)}" width="${(prk.bbox.xMax - prk.bbox.xMin) * scale}" height="${(prk.bbox.zMax - prk.bbox.zMin) * scale}" fill="${C.lawn}" stroke="${C.ink}" stroke-width="1.2"/>`;
  s += text(tx, 39, -6.2, 'CORNER PARK', 10.5, C.paper, 'middle', 800);
  s += rect(tx, { x: -44.3, z: 6.55, w: 1.4, d: 2.3 }, C.curb, C.ink, 'opacity="0.9"');
  s += rect(tx, { x: -39.3, z: 6.45, w: 2.6, d: 2.5 }, C.curb, C.ink, 'opacity="0.9"');
  s += rect(tx, { x: -42, z: 6.2, w: 2.6, d: 3.5 }, C.teal, C.ink);
  s += text(tx, -42, 5.1, '(K)', 10, C.paper, 'middle', 800);

  // anchors
  const anchors = [
    [1, 'cart (yours)', 4, -6.6], [2, 'bus bench', -23.3, 7.62], [3, 'park bench', 41.5, -5.05],
    [4, 'hoop', 44.25, 7.9], [5, 'ball', 43.2, 5.2], [6, 'hot-dog cart', 29.8, -4.55],
    [7, 'barber', 36.6, 7.9], [8, 'alley', 32.1, 8.4], [9, 'washer bay', -5.9, 7.6],
    [10, 'bulletin board', -37.6, 7.5], [11, 'newsboxes', -44.6, 6.6], [12, 'subway', -42, 4.55],
    [13, 'bodega shelves', -18.5, 13.5], [14, "Sal's counter", -7.0, 7.3], [15, 'permit A-frame', -4.0, 5.8],
    [16, 'teal door', 15, 6.9], [17, 'roof vantage', 12.5, -6.8], [18, 'terminal door', -30, 8]
  ];
  for (const [n, name, ax, az] of anchors) {
    const cx = tx.px(ax), cy = tx.py(az);
    s += `<circle cx="${cx}" cy="${cy}" r="9.5" fill="${C.coral}" stroke="${C.paper}" stroke-width="2"/><text x="${cx}" y="${cy + 3.8}" font-size="11" font-weight="800" fill="${C.paper}" text-anchor="middle" font-family="Trebuchet MS, sans-serif">${n}</text>`;
  }
  // anchor legend, two columns
  let ax0 = 34, ay0 = H - 168;
  s += `<text x="${ax0}" y="${ay0 - 12}" font-size="13" font-weight="800" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">SHIPPED INTERACTION ANCHORS (docs/44 carries their IDs)</text>`;
  anchors.forEach(([n, name], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const lx = ax0 + col * 480, ly = ay0 + row * 21;
    s += `<circle cx="${lx + 8}" cy="${ly - 4}" r="8" fill="${C.coral}"/><text x="${lx + 8}" y="${ly - 0.5}" font-size="10" font-weight="800" fill="${C.paper}" text-anchor="middle" font-family="Trebuchet MS, sans-serif">${n}</text><text x="${lx + 22}" y="${ly}" font-size="12" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">${esc(name)}</text>`;
  });
  s += `</svg>`;
  return s;
}

// ==================== 3. INTERIOR FLOOR-PLAN SHEET ====================
function floorPlans() {
  const planW = 620, planH = 400, cols = 2, pad = 30;
  const items = R.interiors;
  const rows = Math.ceil(items.length / cols);
  const W = cols * (planW + pad) + pad, H = rows * (planH + pad) + pad + 70;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += `<rect width="${W}" height="${H}" fill="${C.paper}"/>`;
  s += `<text x="${pad}" y="42" font-size="21" font-weight="800" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">INTERIOR FLOOR PLANS — docs/41 (shells per world-registry.json; meters)</text>`;
  items.forEach((it, idx) => {
    const cx = pad + (idx % cols) * (planW + pad), cy = 70 + Math.floor(idx / cols) * (planH + pad);
    s += `<g transform="translate(${cx},${cy})">`;
    s += `<rect x="0" y="0" width="${planW - 10}" height="${planH - 20}" rx="8" fill="#ffffff" stroke="${C.ink}" stroke-width="1.2"/>`;
    const b = R.buildings.find((x) => x.id === it.building);
    s += `<text x="14" y="24" font-size="14.5" font-weight="800" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">${esc(it.id)} — ${esc(b ? b.name : it.building)}${b && b.status === 'existing' && it.status.includes('existing') ? ' (EXISTS)' : ' (planned)'}</text>`;
    const sh = it.shell;
    const sw = sh.xMax - sh.xMin, sd = Math.abs(sh.zMax - sh.zMin);
    const sc = Math.min((planW - 90) / sw, (planH - 110) / sd);
    const ox = 45, oy = 60;
    const px = (x) => ox + (x - sh.xMin) * sc;
    const py = (z) => oy + (sh.zMax - z) * sc; // north up
    // shell
    s += `<rect x="${px(sh.xMin)}" y="${py(sh.zMax)}" width="${sw * sc}" height="${sd * sc}" fill="#f3efe6" stroke="${C.ink}" stroke-width="2.6"/>`;
    let sy = 0;
    for (const p of (it.plan || [])) {
      if (p.type === 'clear zone') {
        s += `<rect x="${px(p.x - p.w / 2)}" y="${py(p.z + p.d / 2)}" width="${p.w * sc}" height="${p.d * sc}" fill="${C.amber}" opacity="0.22"/>`;
        s += `<text x="${px(p.x)}" y="${py(p.z) + 3}" font-size="9.5" fill="#8a6a4a" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-style="italic">${esc(p.item)}</text>`;
        continue;
      }
      const xs = Array.isArray(p.x) ? p.x : [p.x];
      const zs = Array.isArray(p.z) ? p.z : [p.z];
      for (const xx of xs) for (const zz of zs) {
        const w = (p.w ?? 1) * sc, d = (p.d ?? 1) * sc;
        s += `<rect x="${px(xx) - w / 2}" y="${py(zz) - d / 2}" width="${w}" height="${d}" fill="${C.teal}" stroke="${C.ink}" stroke-width="1" opacity="0.85"/>`;
      }
      const lx = px(xs[0]), ly2 = py(zs[0]);
      s += `<text x="${lx + 4}" y="${ly2 - 4}" font-size="9.5" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">${esc(p.item)}</text>`;
      sy++;
    }
    // scale note
    s += `<text x="14" y="${planH - 34}" font-size="10" fill="#6a6472" font-family="Trebuchet MS, sans-serif">shell ${sw.toFixed(1)} × ${sd.toFixed(1)} m · clear height ${sh.clearH ?? 3} m · grid = meters</text>`;
    s += `<line x1="${planW - 74}" y1="${planH - 38}" x2="${planW - 24}" y2="${planH - 38}" stroke="${C.ink}" stroke-width="2.4"/><text x="${planW - 49}" y="${planH - 44}" font-size="9" text-anchor="middle" fill="${C.ink}" font-family="Trebuchet MS, sans-serif">${((50 / sc) ).toFixed(1)} m</text>`;
    s += `</g>`;
  });
  s += `</svg>`;
  return s;
}

// ---------- render all three to PNG with Playwright ----------
const pages = [
  ['master-map', masterMap()],
  ['story-block-detail', detailMap()],
  ['floor-plans', floorPlans()],
];
const { chromium } = await import('playwright');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 2000, height: 1400 } });
for (const [name, svg] of pages) {
  writeFileSync(join(OUT, name + '.svg'), svg);
  await page.setViewportSize({ width: 2200, height: 1500 });
  await page.goto('data:text/html;charset=utf-8,' + encodeURIComponent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`));
  await page.waitForTimeout(250);
  const el = await page.$('svg');
  await el.screenshot({ path: join(OUT, name + '.png') });
  console.log('RENDERED', name + '.png');
}
await browser.close();
