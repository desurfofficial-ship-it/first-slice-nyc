/**
 * A-3 — the registry geometry flip (DEC-4, Option B ruled 2026-11-08).
 *
 * The flip moves the FLIPPED BANDS' placement and dimensions to the
 * registry (World.ts's regShell reads the row at construction; the style
 * builders stay code). These tests pin the flip's laws:
 *
 *   1. THE NO-INVENTION LAW (DEC-4 §5): every flipped band's registry row
 *      is complete and built — regShell throws on a missing/incomplete/
 *      planned row; it must never be able to render one silently either.
 *   2. THE VALUE-NEUTRAL LAW (the fidelity bar): the registry numbers the
 *      flip now renders are EXACTLY the numbers the retired hand rows
 *      carried — the skyline is identical by pin, not by promise. A
 *      registry edit that moves a flipped building fails here until the
 *      fidelity gate's census pair is re-filed (the flip makes the
 *      registry load-bearing — that is its point).
 *   3. THE SOURCE LAW: World.ts constructs the flipped bands through the
 *      registry-driven path (regShell), and the retired hand-literal
 *      tuples are gone from the source.
 *
 * Band ledger (DEC-4 §6.1 — one revertible unit per district × class,
 * the Option-B order: C/D backdrops before A/B heroes; units 1–3 are the
 * production line's own W1 execution, merged before this file):
 *   UNIT 1  W1-C  the Marlow walk-ups        PWK-01..03
 *   UNIT 2  W1-B  corner house/shops/house   KTN-00W, SMB-01..03, SUB-02
 *   UNIT 3  W1-A  the café shell             KTN-06   → district W1 flipped
 *   UNIT 4  W2-C  the gable row              GRB-01..05
 *   UNIT 5  W3-D  the avenue backdrops       VDN-DW1a..d, VDN-DE1a..d,
 *                                            VDN-DN1, VDN-DS1
 *   UNIT 6  W3-C  the avenue faces           TEN-01, SRC-01, SRC-02,
 *                                            KTN-07, KCM-01, SND-01, VND-02
 *         (the plan's "W3-C" shorthand: the faces band mixes A and C rows
 *          — KCM-01/SND-01 are the district's class-A landmarks.)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry } from '../src/sim/registry';

const HERE = join(__dirname);
const worldTs = readFileSync(join(HERE, '..', 'src', 'world', 'World.ts'), 'utf8');
const reg = loadRegistry();

/** The flipped-band ledger: unit id → its registry rows + the class band
 *  that names the unit. Extended per unit as each band lands. */
const BANDS: Record<string, { ids: string[]; classes: string[] }> = {
  'u1-w1-c': { ids: ['PWK-01', 'PWK-02', 'PWK-03'], classes: ['C', 'D'] },
  'u2-w1-b': { ids: ['KTN-00W', 'SMB-01', 'SMB-02', 'SMB-03', 'SUB-02'], classes: ['A', 'B'] },
  'u3-w1-a': { ids: ['KTN-06'], classes: ['A'] },
  'u4-w2-c': { ids: ['GRB-01', 'GRB-02', 'GRB-03', 'GRB-04', 'GRB-05'], classes: ['C', 'D'] },
  'u5-w3-d': { ids: ['VDN-DW1a', 'VDN-DW1b', 'VDN-DW1c', 'VDN-DW1d', 'VDN-DE1a', 'VDN-DE1b', 'VDN-DE1c', 'VDN-DE1d', 'VDN-DN1', 'VDN-DS1'], classes: ['D'] },
  'u6-w3-c': { ids: ['TEN-01', 'SRC-01', 'SRC-02', 'KTN-07', 'KCM-01', 'SND-01', 'VND-02'], classes: ['A', 'C'] },
};

/** The retired hand truth, verbatim from the pre-flip World.ts rows —
 *  the numbers the fidelity gate's census pairs were filed against.
 *  (Pinned from unit 4 on for every band of the ledger, landed or not:
 *  the registry's own transcription was already faithful — the pin says
 *  it must STAY so.) */
const HAND_TRUTH: Record<string, { x: number; z: number; w: number; d: number; h: number }> = {
  // unit 1 — the Marlow walk-ups
  'PWK-01': { x: -44, z: -26, w: 8, d: 12, h: 15 },
  'PWK-02': { x: 5, z: -26, w: 10, d: 12, h: 15 },
  'PWK-03': { x: 17, z: -26, w: 10, d: 12, h: 15 },
  // unit 2 — the hero shells + the control house
  'KTN-00W': { x: -55, z: 14, w: 10, d: 12, h: 16 },
  'KTN-06': { x: 55, z: 14, w: 10, d: 12, h: 16 },
  'SMB-01': { x: -34, z: -26, w: 8, d: 12, h: 12 },
  'SMB-02': { x: -25, z: -26, w: 6, d: 12, h: 12 },
  'SMB-03': { x: -17, z: -26, w: 6, d: 12, h: 12 },
  'SUB-02': { x: -57, z: -6.25, w: 6, d: 3.5, h: 3.4 },
  // unit 4 — the gable row
  'GRB-01': { x: -42.6, z: 26, w: 7.6, d: 12, h: 12.5 },
  'GRB-02': { x: -35, z: 26, w: 7.6, d: 12, h: 12.5 },
  'GRB-03': { x: -27.4, z: 26, w: 7.6, d: 12, h: 12.5 },
  'GRB-04': { x: -19.8, z: 26, w: 7.6, d: 12, h: 12.5 },
  'GRB-05': { x: -12.2, z: 26, w: 7.6, d: 12, h: 12.5 },
  // unit 5 — the avenue backdrops. The row's height is the backdrop's
  // canonical height; the VARIED per-segment heights are the style (they
  // stay code). The pin: the footprint verbatim (the bounding box the
  // flip's segmentation derives from) + the row height inside the band's
  // segment span. Segment spans, verbatim from the pre-flip seg() calls:
  //   DW1a [14,19,16] · DW1b [15,13] · DW1c [14,21,16] · DW1d [14,12]
  //   DE1a [17,14,16] · DE1b [15,13] · DE1c [16,22,14] · DE1d [12,14]
  //   DN1/DS1 ten strips 11..15
  'VDN-DW1a': { x: -78, z: 20, w: 8, d: 24, h: 16 },
  'VDN-DW1b': { x: -78, z: 53.5, w: 8, d: 15, h: 15 },
  'VDN-DW1c': { x: -78, z: -20, w: 8, d: 24, h: 17 },
  'VDN-DW1d': { x: -78, z: -53.5, w: 8, d: 15, h: 14 },
  'VDN-DE1a': { x: 78, z: 20, w: 8, d: 24, h: 17 },
  'VDN-DE1b': { x: 78, z: 53.5, w: 8, d: 15, h: 15 },
  'VDN-DE1c': { x: 78, z: -20, w: 8, d: 24, h: 22 },
  'VDN-DE1d': { x: 78, z: -53.5, w: 8, d: 15, h: 14 },
  'VDN-DN1': { x: 0, z: 53.5, w: 120, d: 10, h: 13 },
  'VDN-DS1': { x: 0, z: -53.5, w: 120, d: 10, h: 14 },
  // unit 6 — the avenue faces (the pair splits, base+upper splits and the
  // stand's prop placement are the style; the bounding box is the row)
  'TEN-01': { x: -55, z: -14, w: 10, d: 12, h: 17 },
  'SRC-01': { x: 55, z: -26, w: 10, d: 12, h: 17 },
  'SRC-02': { x: -55, z: -26, w: 10, d: 12, h: 15 },
  'KTN-07': { x: 54, z: 26, w: 12, d: 12, h: 15 },
  'KCM-01': { x: -54, z: 26, w: 12, d: 12, h: 15 },
  'SND-01': { x: 55, z: -14, w: 10, d: 12, h: 13 },
  'VND-02': { x: 63.3, z: -18, w: 2.2, d: 1.2, h: 2.2 },
};

/** The backdrop rows whose hand truth is segment heights INSIDE the row's
 *  canonical height (see the comment above). */
const VDN_IDS = Object.keys(HAND_TRUTH).filter((id) => id.startsWith('VDN-'));
const VDN_SEGMENT_SPANS: Record<string, [number, number]> = {
  'VDN-DW1a': [14, 19], 'VDN-DW1b': [13, 15], 'VDN-DW1c': [14, 21], 'VDN-DW1d': [12, 14],
  'VDN-DE1a': [14, 17], 'VDN-DE1b': [13, 15], 'VDN-DE1c': [14, 22], 'VDN-DE1d': [12, 14],
  'VDN-DN1': [11, 15], 'VDN-DS1': [11, 15],
};

describe('A-3 registry flip — the flipped bands answer to the registry', () => {
  it('each flipped unit is exactly its named class band (the Option-B order, guarded)', () => {
    for (const [unit, band] of Object.entries(BANDS)) {
      for (const id of band.ids) {
        const b = reg.building(id);
        expect(b, `${unit}: ${id}`).toBeTruthy();
        expect(band.classes, `${id} class in ${unit}`).toContain(b!.class);
      }
    }
  });

  it('the no-invention law: every flipped row is complete and built (what regShell requires)', () => {
    for (const band of Object.values(BANDS)) {
      for (const id of band.ids) {
        const b = reg.building(id)!;
        expect(b.status, `${id} status`).not.toBe('planned');
        expect(b.height, `${id} height`).toBeGreaterThan(0);
        expect(b.footprint?.w, `${id} w`).toBeGreaterThan(0);
        expect(b.footprint?.d, `${id} d`).toBeGreaterThan(0);
      }
    }
  });

  it('the status column tells the truth the phases built (the bookkeeping the flip made load-bearing, repaired 2026-11-08)', () => {
    // 31 rows built in phases W1–W3 had stayed 'planned' (the E-1-era
    // defect) — repaired strictly per the registry's own constructionPhases
    // content lists; geometry untouched.
    const W1 = ['SUB-02', 'SMB-01', 'SMB-02', 'SMB-03', 'PWK-01', 'PWK-02', 'PWK-03', 'KTN-00W', 'KTN-06'];
    for (const id of W1) expect(reg.building(id)!.status, id).toBe('built (W1)');
    for (const id of ['GRB-01', 'GRB-02', 'GRB-03', 'GRB-04', 'GRB-05', 'ALY-02']) {
      expect(reg.building(id)!.status, id).toBe('built (W2)');
    }
    for (const id of [...VDN_IDS, 'TEN-01', 'SRC-01', 'SRC-02', 'KTN-07', 'KCM-01', 'SND-01', 'VND-02']) {
      expect(reg.building(id)!.status, id).toBe('built (W3)');
    }
    expect(reg.building('KTN-01')!.status).toBe('existing'); // the originals stay
  });

  it('the value-neutral law: the registry rows carry the retired hand numbers verbatim', () => {
    for (const [id, hand] of Object.entries(HAND_TRUTH)) {
      const b = reg.building(id)!;
      expect(b.footprint!.x, `${id} x`).toBe(hand.x);
      expect(b.footprint!.z, `${id} z`).toBe(hand.z);
      expect(b.footprint!.w, `${id} w`).toBe(hand.w);
      expect(b.footprint!.d, `${id} d`).toBe(hand.d);
      if (VDN_IDS.includes(id)) {
        // backdrop rows: the varied segment heights are style; the row's
        // canonical height sits inside the band's segment span
        const [lo, hi] = VDN_SEGMENT_SPANS[id];
        expect(b.height, `${id} h within segment span`).toBeGreaterThanOrEqual(lo);
        expect(b.height, `${id} h within segment span`).toBeLessThanOrEqual(hi);
      } else {
        expect(b.height, `${id} h`).toBe(hand.h);
      }
    }
  });

  it('the source law: the landed bands construct through regShell (the registry path)', () => {
    expect(worldTs.includes("import { loadRegistry } from '../sim/registry'")).toBe(true);
    // units 1–3 (the production line's W1 execution):
    expect(worldTs.includes("this.regShell('SUB-02')")).toBe(true);
    expect(worldTs.includes("this.regShell('KTN-00W')")).toBe(true);
    expect(worldTs.includes("this.regShell('KTN-06')")).toBe(true);
    expect(worldTs.includes("this.regShell('SMB-01')")).toBe(true);
    expect(worldTs.includes('this.regShell(regId)')).toBe(true);
    // unit 4 (W2-C): the gable row reads the registry id via the derived key
    expect(worldTs.includes("this.regShell(id.replace('_', '-'))")).toBe(true);
    // unit 5 (W3-D): the backdrops split the registry footprints evenly
    expect(worldTs.includes("seg('VDN-DW1a', [14, 19, 16])")).toBe(true);
    expect(worldTs.includes("strip('VDN-DN1', heightsN)")).toBe(true);
    expect(worldTs.includes("seg('VDN_DW1a', -78, 8, 32, [14, 19, 16])")).toBe(false);
    expect(worldTs.includes("const cx = -60 + 12 * (i + 0.5)")).toBe(false);
    // unit 6 (W3-C): the avenue faces read their rows through regShell
    expect(worldTs.includes("this.regShell('TEN-01')")).toBe(true);
    expect(worldTs.includes("this.regShell('KCM-01')")).toBe(true);
    expect(worldTs.includes("this.regShell('SND-01')")).toBe(true);
    expect(worldTs.includes("this.regShell('VND-02')")).toBe(true);
    // the retired hand tuples are gone from the source
    expect(worldTs.includes("[['TEN_01a', -60, -55.5], ['TEN_01b', -54.5, -50]]")).toBe(false);
    expect(worldTs.includes("solid('KCM_01_upper', -54, 9.1, 26")).toBe(false);
    expect(worldTs.includes("solid('SND_01_upper', 55, 8.1, -14")).toBe(false);
    expect(worldTs.includes("solid('SRC_01', 55, 8.5, -26")).toBe(false);
    expect(worldTs.includes("stand.position.set(63.3, 0.05, -18)")).toBe(false);
    // the retired hand-literal tuples are gone from the source
    expect(worldTs.includes(`['GRB_01', -42.6, 0xff6b6b, false]`)).toBe(false);
    expect(worldTs.includes(`solid(id, cx, 6.25, 26, 7.6, 12.5, 12`)).toBe(false);
    expect(worldTs.includes(`['PWK_01', -44, 8`)).toBe(false);
    expect(worldTs.includes(`solid('KTN_00W', -55, 8, 14`)).toBe(false);
    expect(worldTs.includes(`solid('KTN_06', 55, 8, 14`)).toBe(false);
    expect(worldTs.includes(`sub2.position.set(-57`)).toBe(false);
  });

  it('regShell would refuse a planned row (the law, at the data level: a planned row must never render)', () => {
    // no flipped-band row may be planned — but if the registry ever flips
    // one back to planned, regShell must throw, not invent geometry.
    for (const band of Object.values(BANDS)) {
      for (const id of band.ids) expect(reg.building(id)!.status === 'planned', `${id} planned?`).toBe(false);
    }
  });
});
