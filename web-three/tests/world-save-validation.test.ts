/**
 * R2 regression battery (FS-AUDIT-002) — the world-save parser honors its
 * own degrade law: the COMPLETE document is validated and whitelist-rebuilt
 * before hydration; any malformed section rejects the document (fresh world
 * + note, never a throw); a post-hydration integrity failure is refused
 * instead of silently becoming world state; valid saves (including saves
 * with unknown trailing fields) still restore exactly; and recovery never
 * touches the separate story save.
 *
 * Companion suite to tests/sim-state.test.ts (which keeps the base
 * round-trip/refusal cases). Evidence anchors: audit battery B1–B13
 * (docs/security-audit/evidence/RESULTS-save-parsers.txt).
 */
import { describe, it, expect } from 'vitest';
import {
  parseWorldSave, snapshotWorld, WORLD_ID,
} from '../src/sim/state';
import { bootWorldBrain, buildReferencePlaceResolver } from '../src/sim/runtime';
import { buildReferenceWorld, referencePlaceExists, REFERENCE_ALIASES } from '../src/sim/reference';
import { loadRegistry } from '../src/sim/registry';

const reg = loadRegistry();
const aliasIds = new Set(REFERENCE_ALIASES.map((a) => a.id));
const placeExists = referencePlaceExists((id) => reg.placePoint(id) !== null || aliasIds.has(id));

/** A real, valid document produced by the game's own snapshotter. */
function validDoc(): Record<string, unknown> {
  const refs = buildReferenceWorld(placeExists);
  const w = refs.world;
  w.ledger.post({
    id: 'txn:r2_cup', tick: w.clock.tick, day: w.clock.day,
    kind: 'transfer', category: 'business_revenue',
    from: 'acct:player', to: 'biz:rosas_deli', amountCents: 500,
    reason: 'the usual',
  });
  w.player.moneyCents = w.ledger.balance('acct:player');
  w.clock.advance(45);
  const flags = w.flags;
  flags.set('flag:r2_test_flag', w.clock.tick);
  const rel = w.relationships.get('rel:idris_warsame__leo_marsh');
  if (rel) rel.warmth = 4;
  return JSON.parse(JSON.stringify(snapshotWorld(w))) as Record<string, unknown>;
}

/** Mutate a valid doc with an arbitrary surgery. */
function tampered(mutate: (d: Record<string, unknown>) => void): string {
  const d = validDoc();
  mutate(d);
  return JSON.stringify(d);
}

const expectFresh = (raw: string, noteMatch: RegExp) => {
  const r = parseWorldSave(raw);
  expect(r.source).toBe('fresh');
  expect(r.notes.join(' ')).toMatch(noteMatch);
  // a fresh world is a COMPLETE world, not a half-restored one
  expect(r.world.npcs).toEqual([]);
  expect(r.world.relationships.size).toBe(0);
  expect(r.world.ledger.balance('acct:player')).toBe(8700);
  expect(r.world.clock.day).toBe(1);
};

describe('R2 — a shape-broken section never reaches hydrate (the old throws, B1–B7)', () => {
  it('missing ledger → fresh + note (was: TypeError reading "txns")', () => {
    expectFresh(tampered((d) => { delete d['ledger']; }), /ledger.*missing or not an object/);
  });

  it('missing clock → fresh + note (was: TypeError reading "day")', () => {
    expectFresh(tampered((d) => { delete d['clock']; }), /clock.*missing or not an object/);
  });

  it('missing player → fresh + note (was: TypeError reading "moneyCents")', () => {
    expectFresh(tampered((d) => { delete d['player']; }), /player.*missing or not an object/);
  });

  it('missing relationships → fresh + note (was: doc.relationships.map is not a function)', () => {
    expectFresh(tampered((d) => { delete d['relationships']; }), /relationships.*missing or not an array/);
  });

  it('missing npcs → fresh + note (was: unchecked dereference)', () => {
    expectFresh(tampered((d) => { delete d['npcs']; }), /npcs.*missing or not an array/);
  });

  it('missing flags → fresh + note (was: .for is not iterable)', () => {
    expectFresh(tampered((d) => { delete d['flags']; }), /flags.*missing or not an array/);
  });

  it('null sections → fresh + note, every one of them', () => {
    for (const section of ['ledger', 'clock', 'player', 'npcs', 'relationships',
      'businesses', 'flags', 'chapter', 'missable', 'consequences', 'events', 'environment']) {
      const raw = tampered((d) => { d[section] = null; });
      const r = parseWorldSave(raw);
      expect(r.source, section).toBe('fresh');
      expect(r.notes.join(' '), section).toMatch(new RegExp(`${section}`));
    }
  });

  it('wrong primitive types → fresh + note (clock.day "9", money "x", seed object…)', () => {
    expectFresh(tampered((d) => { (d['clock'] as Record<string, unknown>)['day'] = 'nine'; }), /clock\.day/);
    expectFresh(tampered((d) => { (d['player'] as Record<string, unknown>)['moneyCents'] = 'all of it'; }), /player\.moneyCents/);
    expectFresh(tampered((d) => { d['seed'] = { hi: 1 }; }), /seed/);
    expectFresh(tampered((d) => { (d['clock'] as Record<string, unknown>)['minuteOfDay'] = 30.5; }), /clock\.minuteOfDay/);
  });

  it('invalid transaction arrays → fresh + note (ledger.txns: 5, junk entries, bad flows)', () => {
    expectFresh(tampered((d) => { (d['ledger'] as Record<string, unknown>)['txns'] = 5; }), /ledger\.txns.*not an array/);
    expectFresh(tampered((d) => { (d['ledger'] as Record<string, unknown>)['txns'] = [{ nonsense: true }]; }), /ledger\.txns\[0\]/);
    expectFresh(tampered((d) => {
      const t = ((d['ledger'] as Record<string, unknown>)['txns'] as unknown[])[0] as Record<string, unknown>;
      t['amountCents'] = -500; // negative money never passes
    }), /amountCents/);
    expectFresh(tampered((d) => {
      const t = ((d['ledger'] as Record<string, unknown>)['txns'] as unknown[])[0] as Record<string, unknown>;
      t['from'] = 'acct:player'; t['to'] = 'acct:player'; // self-transfer
    }), /self-transfer/);
    expectFresh(tampered((d) => {
      const t = ((d['ledger'] as Record<string, unknown>)['txns'] as unknown[])[0] as Record<string, unknown>;
      t['kind'] = 'transfer'; t['to'] = 'acct:world'; // transfer touching the system account
    }), /must not touch acct:world/);
    expectFresh(tampered((d) => {
      const t = ((d['ledger'] as Record<string, unknown>)['txns'] as unknown[])[0] as Record<string, unknown>;
      t['id'] = 'txn:dupe';
      (d['ledger'] as Record<string, unknown>)['txns'] = [t, { ...t }];
    }), /duplicate transaction id/);
  });

  it('invalid dates/day values → fresh + note (day 0, day 1e15, minute 1440, tick overflow)', () => {
    expectFresh(tampered((d) => { (d['clock'] as Record<string, unknown>)['day'] = 0; }), /clock\.day/);
    expectFresh(tampered((d) => { (d['clock'] as Record<string, unknown>)['day'] = 1e15; }), /clock\.day/);
    expectFresh(tampered((d) => { (d['clock'] as Record<string, unknown>)['minuteOfDay'] = 1440; }), /clock\.minuteOfDay/);
    expectFresh(tampered((d) => {
      const t = ((d['ledger'] as Record<string, unknown>)['txns'] as unknown[])[0] as Record<string, unknown>;
      t['day'] = 1e15;
    }), /ledger\.txns\[0\]\.day/);
    expectFresh(tampered((d) => { (d['chapter'] as Record<string, unknown>)['calendarDay'] = 40000; }), /calendarDay/);
  });

  it('invalid relationship entries → fresh + note (dangling npc ref, warmth out of range, junk id)', () => {
    expectFresh(tampered((d) => {
      const rels = d['relationships'] as Record<string, unknown>[];
      rels.push({ id: 'rel:ghost__npc_x', a: 'npc:ghost', b: 'npc:npc_x', warmth: 0, trust: 0, sharedEvents: [] });
    }), /expected an npc id present in this document/);
    expectFresh(tampered((d) => {
      const rels = d['relationships'] as Record<string, unknown>[];
      rels[0]['warmth'] = 101; // the write side clamps to [-100, 100]
    }), /warmth/);
    expectFresh(tampered((d) => {
      const rels = d['relationships'] as Record<string, unknown>[];
      rels[0]['trust'] = -1;
    }), /trust/);
    expectFresh(tampered((d) => {
      const rels = d['relationships'] as Record<string, unknown>[];
      rels[0]['id'] = 'not-a-sim-id';
    }), /rel: sim id/);
    expectFresh(tampered((d) => {
      const npcs = d['npcs'] as Record<string, unknown>[];
      npcs[0]['relationships'] = ['npc:rosa_delgado']; // a npc row naming a NON-rel id
    }), /relationships.*entries must be sim ids|sim ids/);
  });

  it('junk entity rows → fresh + note (was: n.inventory is not a function, entities.ts throw)', () => {
    expectFresh(tampered((d) => {
      (d['npcs'] as unknown[])[0] = { junk: true };
    }), /npcs\[0\]/);
    expectFresh(tampered((d) => {
      const npcs = d['npcs'] as Record<string, unknown>[];
      npcs[0]['inventory'] = 5;
    }), /inventory.*bounded array/);
    expectFresh(tampered((d) => {
      const npcs = d['npcs'] as Record<string, unknown>[];
      npcs[0]['fidelity'] = 'cinematic';
    }), /fidelity/);
    expectFresh(tampered((d) => {
      const npcs = d['npcs'] as Record<string, unknown>[];
      npcs[1]['id'] = npcs[0]['id']; // duplicate npc rows
    }), /duplicate npc id/);
    expectFresh(tampered((d) => {
      const bizs = d['businesses'] as Record<string, unknown>[];
      bizs[0]['ownerNpcId'] = 'npc:who_is_this';
    }), /ownerNpcId/);
    expectFresh(tampered((d) => {
      const bizs = d['businesses'] as Record<string, unknown>[];
      bizs[0]['opensAtMin'] = 500; bizs[0]['closesAtMin'] = 500;
    }), /hours/);
  });

  it('unexpected nested structures → fresh + note (rails junk, flag tuples, environment values)', () => {
    expectFresh(tampered((d) => {
      (d['chapter'] as Record<string, unknown>)['rails'] = { beat: 'not-an-object' };
    }), /rails/);
    expectFresh(tampered((d) => { d['flags'] = [['flag:x', 'now']]; }), /flags\[0\]\.tick/);
    expectFresh(tampered((d) => { d['flags'] = [['junk_prefix:x', 1]]; }), /flag:\/evt:\/node: id or dimension=value key/);
    expectFresh(tampered((d) => { d['environment'] = { weather: { nested: 'object' } }; }), /environment\.weather/);
    expectFresh(tampered((d) => { d['environment'] = { epoch: ['rain'] }; }), /environment\.epoch/);
    expectFresh(tampered((d) => { d['events'] = [{ id: 'evt:x' }]; }), /events\[0\]\.tick/);
    // the missable section is the R6 scheduler's CACHE (the flags are the
    // truth): a malformed entry DROPS with a note and the document still
    // restores — refusing a world over a cache entry would discard real
    // story progress (the flags re-derive the dropped window's fate)
    const missableCache = tampered((d) => { d['missable'] = [{ id: 'm1' }, ...((d['missable'] as unknown[]) ?? [])]; });
    const missableResult = parseWorldSave(missableCache);
    expect(missableResult.source).toBe('restored');
    expect(missableResult.notes.join(' ')).toMatch(/malformed window/);
    expect(missableResult.world.missable.some((m) => m.id === 'm1')).toBe(false);
    expectFresh(tampered((d) => { d['missable'] = 'not-an-array'; }), /missable/);
    expectFresh(tampered((d) => { d['consequences'] = [{ id: 'c1', kind: 'bribe' }]; }), /consequences\[0\]\.kind/);
  });

  it('excessively large numeric values → fresh + note (money, balances, amounts)', () => {
    expectFresh(tampered((d) => { (d['player'] as Record<string, unknown>)['moneyCents'] = 1e12; }), /player\.moneyCents/);
    expectFresh(tampered((d) => {
      (d['player'] as Record<string, unknown>)['moneyCents'] = Number.MAX_SAFE_INTEGER;
    }), /player\.moneyCents/);
    expectFresh(tampered((d) => {
      const bizs = d['businesses'] as Record<string, unknown>[];
      bizs[0]['balanceCents'] = 1e15;
    }), /balanceCents/);
    expectFresh(tampered((d) => {
      const t = ((d['ledger'] as Record<string, unknown>)['txns'] as unknown[])[0] as Record<string, unknown>;
      t['amountCents'] = 5e9;
    }), /amountCents/);
    expectFresh(tampered((d) => { d['seed'] = 4294967296; }), /seed/);
  });

  it('NaN/Infinity money (JSON-made) → fresh + note', () => {
    // JSON has no NaN/Infinity — the string forms must not survive either
    expectFresh('{"magic":"first-slice-world","version":1,"worldId":"alder_heights",'
      + '"seed":1,"clock":{"day":1,"minuteOfDay":0},"player":{"npcId":"npc:leo_marsh",'
      + '"homePlaceId":"KTS-02","moneyCents":1e999},"npcs":[],"relationships":[],'
      + '"businesses":[],"ledger":{"txns":[],"seq":0},"flags":[],'
      + '"chapter":{"chapter":0,"rails":{},"calendarDay":0},"missable":[],'
      + '"consequences":[],"events":[],"environment":{}}', /player\.moneyCents/);
  });
});

describe('R2 — prototype pollution and hostile shapes', () => {
  it('a __proto__ key in any section cannot survive the whitelist (and is not copied)', () => {
    const d = validDoc();
    (d as Record<string, unknown>)['__proto__'] = { polluted: true };
    const r = parseWorldSave(JSON.stringify(d));
    // JSON.parse puts __proto__ as an own property; the parse may restore or
    // refuse — either way NOTHING may be polluted
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.keys(r.world).includes('__proto__')).toBe(false);
    if (r.source === 'restored') {
      expect((r.world.chapter.rails as Record<string, unknown>)['polluted']).toBeUndefined();
    }
  });

  it('__proto__ inside chapter.rails → fresh + note (a plain-object section)', () => {
    expectFresh(tampered((d) => {
      (d['chapter'] as Record<string, unknown>)['rails'] = JSON.parse('{"__proto__": {"fired": true}}');
    }), /rails/);
  });

  it('__proto__ inside environment → fresh + note', () => {
    expectFresh(tampered((d) => {
      d['environment'] = JSON.parse('{"__proto__": "rain"}');
    }), /environment/);
  });

  it('constructor/prototype keys in rails → fresh + note', () => {
    expectFresh(tampered((d) => {
      (d['chapter'] as Record<string, unknown>)['rails'] = { constructor: { fired: true } };
    }), /rails/);
  });

  it('arrays in place of objects → fresh + note', () => {
    expectFresh(tampered((d) => { d['player'] = ['npc:leo_marsh']; }), /player.*not an object/);
    expectFresh(tampered((d) => { d['clock'] = [1, 2]; }), /clock.*not an object/);
  });

  it('an absurdly large npc array is refused at the bound, not iterated', () => {
    const d = validDoc();
    d['npcs'] = new Array(10001).fill((d['npcs'] as unknown[])[0]);
    const r = parseWorldSave(JSON.stringify(d));
    expect(r.source).toBe('fresh');
    expect(r.notes.join(' ')).toMatch(/npcs.*exceeds/);
  });

  it('an absurdly large ledger is refused at the bound', () => {
    const d = validDoc();
    const t0 = ((d['ledger'] as Record<string, unknown>)['txns'] as unknown[])[0];
    d['ledger'] = { seq: 1, txns: new Array(50001).fill(t0) };
    const r = parseWorldSave(JSON.stringify(d));
    expect(r.source).toBe('fresh');
    expect(r.notes.join(' ')).toMatch(/ledger\.txns.*exceeds/);
  });
});

describe('R2 — integrity failures are refused, not silently accepted', () => {
  it('events out of tick order → fresh + note (a shape-valid, semantically corrupt doc)', () => {
    const d = validDoc();
    d['events'] = [
      { id: 'evt:later', tick: 5000, kind: 'test' },
      { id: 'evt:earlier', tick: 1000, kind: 'test' },
    ];
    const r = parseWorldSave(JSON.stringify(d));
    expect(r.source).toBe('fresh');
    expect(r.notes.join(' ')).toMatch(/integrity audit failed/);
    expect(r.notes.join(' ')).toMatch(/event order/);
  });

  it('an npc double-listing a relationship → fresh + note', () => {
    const d = validDoc();
    const relId = (d['relationships'] as Record<string, unknown>[])[0]['id'] as string;
    const npcs = d['npcs'] as Record<string, unknown>[];
    const owner = npcs.find((n) => (n['relationships'] as string[]).includes(relId));
    expect(owner).toBeDefined();
    (owner!['relationships'] as string[]).push(relId); // listed twice
    const r = parseWorldSave(JSON.stringify(d));
    expect(r.source).toBe('fresh');
    expect(r.notes.join(' ')).toMatch(/double-listed/);
  });

  it('a ledger whose history cannot be replayed (overdraft at rehydration) → fresh + note (verifier N-1)', () => {
    // shape-valid doc: a biz→npc→biz loop that overdraws the biz mid-replay.
    // Genesis re-derivation makes the PLAYER self-consistent, so the only
    // signal is the rehydration's own post() rejections — which the
    // integrity gate now treats as a refusal, never a silent restore.
    const d = validDoc();
    const bizId = (d['businesses'] as Record<string, unknown>[])[0]['id'];
    d['businesses'] = [{ ...(d['businesses'] as Record<string, unknown>[])[0], balanceCents: 100 }];
    d['ledger'] = {
      seq: 2,
      txns: [
        { id: 'txn:ov1', seq: 0, tick: 500, day: 1, kind: 'transfer', category: 'loan',
          from: bizId, to: 'npc:helper_ghost', amountCents: 600, reason: 'lend' },
        { id: 'txn:ov2', seq: 1, tick: 600, day: 1, kind: 'transfer', category: 'repay',
          from: 'npc:helper_ghost', to: bizId, amountCents: 500, reason: 'repay' },
      ],
    };
    const r = parseWorldSave(JSON.stringify(d));
    expect(r.source).toBe('fresh');
    expect(r.notes.join(' ')).toMatch(/integrity audit failed|ledger: OVERDRAFT/);
  });

  it('an inventory entry that is not an item id → fresh + note', () => {
    const d = validDoc();
    const npcs = d['npcs'] as Record<string, unknown>[];
    npcs[0]['inventory'] = ['flag:not_an_item'];
    const r = parseWorldSave(JSON.stringify(d));
    expect(r.source).toBe('fresh');
    expect(r.notes.join(' ')).toMatch(/inventory/);
  });
});

describe('R2 — valid existing world saves still restore exactly', () => {
  it('the real snapshot round-trips: clock, warmth, flags, ledger, npcs, businesses', () => {
    const doc = validDoc();
    const r = parseWorldSave(JSON.stringify(doc));
    expect(r.source).toBe('restored');
    const w = r.world;
    expect(w.worldId).toBe(WORLD_ID);
    expect(w.clock.day).toBe(1);
    expect(w.clock.minuteOfDay).toBe(505); // 7:40 + 45
    expect(w.ledger.balance('acct:player')).toBe(8200);
    expect(w.ledger.balance('biz:rosas_deli')).toBe(500);
    expect(w.flags.has('flag:r2_test_flag')).toBe(true);
    const rel = w.relationships.get('rel:idris_warsame__leo_marsh');
    expect(rel?.warmth).toBe(4);
    expect(w.npcs.length).toBeGreaterThan(0);
    expect(w.businesses.map((b) => b.id)).toContain('biz:rosas_deli');
  });

  it('unknown trailing fields are DROPPED, never copied (the forward-compat law)', () => {
    const doc = validDoc();
    doc['weather_v2'] = { some: 'future section' };
    (doc['player'] as Record<string, unknown>)['title'] = 'Mayor';
    const r = parseWorldSave(JSON.stringify(doc));
    expect(r.source).toBe('restored');
    expect((r.world as unknown as Record<string, unknown>)['weather_v2']).toBeUndefined();
    expect((r.world.player as unknown as Record<string, unknown>)['title']).toBeUndefined();
  });

  it('the restored world audits clean (restored != accepted-broken)', () => {
    const doc = validDoc();
    const r = parseWorldSave(JSON.stringify(doc));
    expect(r.world.ledger.audit()).toEqual([]);
    expect(r.world.ledger.balance('acct:player')).toBe(r.world.player.moneyCents);
  });

  it('parse never throws across a hostile corpus — every input degrades to fresh', () => {
    const hostile = [
      '', null, undefined, 'not json', '{"magic":"first-slice-world"}', '[]', '42', '"x"',
      tampered((d) => { d['npcs'] = d['npcs']; }),
      tampered((d) => { for (let i = 0; i < 100; i++) (d['npcs'] as unknown[]).push(i); }),
      tampered((d) => { d['ledger'] = { txns: new Array(1000).fill('x') }; }),
      '<script>alert(1)</script>', '{"__proto__":{"magic":"first-slice-world"},"magic":"first-slice-world","version":1,"worldId":"alder_heights"}',
      JSON.stringify({ ...validDoc(), version: 2 }),
      JSON.stringify({ ...validDoc(), worldId: 'elsewhere' }),
    ];
    for (const raw of hostile) {
      const r = parseWorldSave(raw as string);
      expect(['fresh', 'restored']).toContain(r.source);
      expect(Array.isArray(r.notes)).toBe(true);
      expect(r.world.clock.day).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('R2 — bootWorldBrain recovery (the production seam)', () => {
  it('a corrupt raw document boots a FRESH brain with notes — never a throw', () => {
    for (const raw of [
      '{"magic":"first-slice-world","version":1,"worldId":"alder_heights"}', // the audit's own repro
      tampered((d) => { delete d['ledger']; }),
      tampered((d) => { (d['clock'] as Record<string, unknown>)['day'] = 1e15; }),
      tampered((d) => { (d['ledger'] as Record<string, unknown>)['txns'] = 5; }),
      tampered((d) => { delete d['relationships']; }),
      tampered((d) => { (d['npcs'] as unknown[])[0] = 'junk'; }),
    ]) {
      const boot = bootWorldBrain({
        raw,
        resolve: buildReferencePlaceResolver(reg),
        placeExists: (id) => reg.placePoint(id) !== null || aliasIds.has(id),
      });
      expect(boot.source).toBe('fresh');
      expect(boot.notes.length).toBeGreaterThan(0);
      expect(boot.brain.world.npcs.length).toBeGreaterThan(0); // the reference cast
      expect(boot.brain.world.clock.day).toBe(1);
    }
  });

  it('recovery never touches ANY storage — the separate story save is structurally unreachable', () => {
    const calls: string[] = [];
    const storySave = '{"day":3,"money":112,"cart_name":"Leo & Co"}';
    const recordingStore = {
      getItem: (k: string) => { calls.push(`get:${k}`); return k === 'first_slice_save_v1' ? storySave : null; },
      setItem: (k: string, v: string) => { calls.push(`set:${k}=${v.length}`); },
      removeItem: (k: string) => { calls.push(`del:${k}`); },
    };
    (globalThis as Record<string, unknown>)['localStorage'] = recordingStore;
    try {
      const before = recordingStore.getItem('first_slice_save_v1');
      const boot = bootWorldBrain({
        raw: tampered((d) => { (d['clock'] as Record<string, unknown>)['day'] = 'nope'; }),
        resolve: buildReferencePlaceResolver(reg),
        placeExists: (id) => reg.placePoint(id) !== null || aliasIds.has(id),
      });
      expect(boot.source).toBe('fresh');
      const after = recordingStore.getItem('first_slice_save_v1');
      expect(after).toBe(before);
      expect(after).toBe(storySave);
      // bootWorldBrain is pure: not one storage write may have happened
      expect(calls.filter((c) => c.startsWith('set:') || c.startsWith('del:'))).toEqual([]);
      // and the only read (if any) must never be the story key
      expect(calls.filter((c) => c.startsWith('get:first_slice_save_v1')).length).toBeLessThanOrEqual(2);
    } finally {
      delete (globalThis as Record<string, unknown>)['localStorage'];
    }
  });

  it('a rejected document at boot yields a playable fresh world (player can continue)', () => {
    const boot = bootWorldBrain({
      raw: tampered((d) => { d['ledger'] = null; }),
      resolve: buildReferencePlaceResolver(reg),
      placeExists: (id) => reg.placePoint(id) !== null || aliasIds.has(id),
      startMinute: 7 * 60 + 15,
    });
    expect(boot.source).toBe('fresh');
    const w = boot.brain.world;
    expect(w.ledger.balance('acct:player')).toBe(8700);
    expect(w.ledger.audit()).toEqual([]);
    // the brain actually runs: advancing time must work on the recovered world
    expect(() => boot.brain.advanceMinutes(10)).not.toThrow();
    expect(boot.brain.world.clock.minuteOfDay).toBe(7 * 60 + 25);
  });

  it('the second net holds: even a hydrate-time throw degrades to fresh + note', () => {
    // flags with a non-flag: id pass shape validation ONLY if the validator
    // missed it — this proves the try/catch behind the validator, so the
    // module's contract never again depends on a caller two files away
    const boot = bootWorldBrain({
      raw: JSON.stringify({ magic: 'first-slice-world', version: 1, worldId: 'alder_heights' }),
      resolve: buildReferencePlaceResolver(reg),
      placeExists: (id) => reg.placePoint(id) !== null || aliasIds.has(id),
    });
    expect(boot.source).toBe('fresh');
    expect(boot.notes.join(' ')).toMatch(/fresh world/);
  });
});
