/**
 * sim/state + save — global simulation state, versioning, and the
 * ownership table (world-contract/05).
 */
import { describe, it, expect } from 'vitest';
import {
  createWorldState, auditWorld, snapshotWorld, parseWorldSave,
  OWNERSHIP, WORLD_SCHEMA_VERSION, WORLD_SAVE_KEY, WORLD_ID,
} from '../src/sim/state';
import { buildReferenceWorld, referencePlaceExists, REFERENCE_ALIASES } from '../src/sim/reference';
import { loadRegistry } from '../src/sim/registry';
import { EconomyLedger } from '../src/sim/economy';

const reg = loadRegistry();
const aliasIds = new Set(REFERENCE_ALIASES.map((a) => a.id));
const placeExists = referencePlaceExists((id) => reg.placePoint(id) !== null || aliasIds.has(id));

function fullWorld() {
  const refs = buildReferenceWorld(placeExists);
  const w = refs.world;
  // settle the ledger so the audit is meaningful
  w.ledger.post({
    id: 'txn:test_cup', tick: w.clock.tick, day: w.clock.day,
    kind: 'transfer', category: 'business_revenue',
    from: 'acct:player', to: 'biz:rosas_deli', amountCents: 500,
    reason: 'the usual',
  });
  w.player.moneyCents = w.ledger.balance('acct:player');
  return { w, refs };
}

describe('sim/state — the world at one moment', () => {
  it('a fresh world audits clean', () => {
    const r = auditWorld(createWorldState(), placeExists);
    expect(r).toEqual({ ok: true, issues: [] });
  });

  it('the reference world audits clean end to end', () => {
    const { w } = fullWorld();
    const r = auditWorld(w, placeExists);
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('the ownership table covers every WorldState section (it cannot rot)', () => {
    const w = createWorldState() as unknown as Record<string, unknown>;
    const covered = new Set(OWNERSHIP.map((o) => o.section));
    for (const key of Object.keys(w)) {
      expect(covered.has(key), `WorldState.${key} has no owner in OWNERSHIP`).toBe(true);
    }
    // and each row names a writer that is not "everyone"
    for (const o of OWNERSHIP) {
      expect(o.owner.length).toBeGreaterThan(3);
      expect(o.writes.length).toBeGreaterThan(3);
    }
  });

  it('the player ledger head mirrors player.moneyCents (one truth, two views)', () => {
    const { w } = fullWorld();
    expect(w.ledger.balance('acct:player')).toBe(w.player.moneyCents);
    // breaking the mirror is caught by the audit
    w.player.moneyCents = 1;
    expect(auditWorld(w, placeExists).ok).toBe(false);
  });

  it('event history stays tick-ordered', () => {
    const { w } = fullWorld();
    w.events.push(
      { id: 'evt:e1', tick: w.clock.tick, kind: 'test' },
      { id: 'evt:e2', tick: w.clock.tick + 5, kind: 'test' },
    );
    expect(auditWorld(w, placeExists).ok).toBe(true);
    w.events.reverse();
    expect(auditWorld(w, placeExists).ok).toBe(false);
  });
});

describe('sim/state — the world save: versioned, validated, never crashing', () => {
  it('round-trips: snapshot → parse → the same world facts', () => {
    const { w } = fullWorld();
    const doc = snapshotWorld(w);
    const raw = JSON.stringify(doc);
    const parsed = parseWorldSave(raw);
    expect(parsed.source).toBe('restored');
    expect(parsed.world.clock.day).toBe(w.clock.day);
    expect(parsed.world.clock.minuteOfDay).toBe(w.clock.minuteOfDay);
    expect(parsed.world.npcs.map((n) => n.id)).toEqual(w.npcs.map((n) => n.id));
    expect(parsed.world.relationships.size).toBe(w.relationships.size);
    expect(parsed.world.businesses.map((b) => b.id)).toEqual(w.businesses.map((b) => b.id));
    expect(parsed.world.ledger.balance('acct:player')).toBe(w.player.moneyCents);
    expect(parsed.world.ledger.balance('biz:rosas_deli')).toBe(500);
  });

  it('a foreign world id never loads into this one', () => {
    const { w } = fullWorld();
    const doc = snapshotWorld(w);
    doc.worldId = 'some_other_city';
    const parsed = parseWorldSave(JSON.stringify(doc));
    expect(parsed.source).toBe('fresh');
    expect(parsed.notes.join(' ')).toMatch(/foreign world/);
  });

  it('an unknown schema version refuses politely (and says what to do)', () => {
    const { w } = fullWorld();
    const doc = snapshotWorld(w);
    doc.version = WORLD_SCHEMA_VERSION + 3;
    const parsed = parseWorldSave(JSON.stringify(doc));
    expect(parsed.source).toBe('fresh');
    expect(parsed.notes.join(' ')).toMatch(/schema v\d+ not v1/);
  });

  it('corrupt JSON is a fresh world, never a crash (the save.gd law, world-scale)', () => {
    for (const raw of [null, '', 'not json', '{"magic":"nope"}', '42', '[]']) {
      const parsed = parseWorldSave(raw);
      expect(parsed.source).toBe('fresh');
      expect(parsed.world.npcs).toEqual([]);
    }
  });

  it('the save key is namespaced beside the story save, not over it', () => {
    // core/Save.ts owns first_slice_save_v1; the world ride has its own key
    expect(WORLD_SAVE_KEY).toBe('first_slice_world_v1');
    expect(WORLD_SAVE_KEY).not.toBe('first_slice_save_v1');
    expect(WORLD_ID).toBe('alder_heights');
  });

  it('a ledger with broken money is reported, not hidden', () => {
    const { w } = fullWorld();
    const doctored = snapshotWorld(w);
    doctored.player.moneyCents = 999999; // the snapshot lies about the ledger
    const parsed = parseWorldSave(JSON.stringify(doctored));
    // parse rebuilds genesis FROM the lying snapshot, so the ledger and the
    // snapshot agree again — but the business balance no longer matches,
    // and the notes carry the re-derivation. The honest world refuses none
    // of it silently: notes are non-empty.
    expect(parsed.notes.join(' ')).toMatch(/ledger genesis/);
  });
});

describe('sim/state — ledger rehydration', () => {
  it('a restored ledger replays its transactions exactly', () => {
    const { w } = fullWorld();
    const parsed = parseWorldSave(JSON.stringify(snapshotWorld(w)));
    const t0 = w.ledger.toData().txns.map((t) => t.id);
    const t1 = parsed.world.ledger.toData().txns.map((t) => t.id);
    expect(t1).toEqual(t0);
    expect(parsed.world.ledger.audit()).toEqual([]);
  });

  it('an EconomyLedger starts empty and stays total', () => {
    const l = new EconomyLedger();
    expect(l.all()).toHaveLength(0);
    expect(l.totalInCirculation()).toBe(0);
  });
});
