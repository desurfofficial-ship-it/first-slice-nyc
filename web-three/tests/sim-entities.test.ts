/**
 * sim/entities — entity & identity contracts (world-contract/04 + 08).
 */
import { describe, it, expect } from 'vitest';
import {
  validateNpcs, validateBusinesses, makeRelationship, businessIsOpen,
  type NpcState, type BusinessState,
} from '../src/sim/entities';
import { relId, relParts, simKindOf, isRegistryId, isSimId } from '../src/sim/ids';

const PLACES = new Set(['ROS-01', 'GRB-01', 'KTN-04', 'loc:off_map']);
// existence is a SET lookup, not a pattern match — a well-formed id that
// names nothing must still fail (that distinction is the whole point)
const exists = (id: string) => PLACES.has(id);

function npc(over: Partial<NpcState> = {}): NpcState {
  return {
    id: 'npc:test_person', displayName: 'Test Person',
    homePlaceId: 'ROS-01',
    location: { placeId: 'ROS-01' },
    moneyCents: 0, inventory: [], relationships: [], knowledge: [],
    fidelity: 'full',
    ...over,
  };
}

function biz(over: Partial<BusinessState> = {}): BusinessState {
  return {
    id: 'biz:test_shop', name: 'Test Shop',
    premisesBuildingId: 'ROS-01',
    opensAtMin: 9 * 60, closesAtMin: 17 * 60,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    ownerNpcId: 'npc:test_person', staffNpcIds: [],
    balanceCents: 0, graceTicks: 0, tags: [],
    ...over,
  };
}

describe('sim/ids — the two id spaces', () => {
  it('accepts shipped registry ids and rejects malformed ones', () => {
    for (const id of ['KTN-01', 'STR-KESTREL', 'VDN-DW1a', 'R-KESTREL-N', 'BLK-N', 'MEZZ-TS']) {
      expect(isRegistryId(id), id).toBe(true);
    }
    expect(isRegistryId('ktn-01')).toBe(false);   // lowercase is the sim space
    expect(isRegistryId('')).toBe(false);
    expect(isRegistryId('KTN--01')).toBe(false);  // empty dash part
  });

  it('sim ids are namespaced and lowercase', () => {
    expect(isSimId('npc:rosa_delgado')).toBe(true);
    expect(simKindOf('npc:rosa_delgado')).toBe('npc');
    expect(simKindOf('biz:rosas_deli')).toBe('biz');
    expect(simKindOf('KTN-01')).toBeNull();       // registry ids are not sim ids
    expect(simKindOf('npc:Rosa')).toBeNull();     // uppercase local rejected
    expect(simKindOf('rosa')).toBeNull();         // no namespace
  });

  it('relationship ids are sorted, unique pairs that round-trip', () => {
    const id = relId('npc:zoe', 'npc:amy');
    expect(id).toBe(relId('npc:amy', 'npc:zoe')); // order-insensitive
    expect(relParts(id)).toEqual(['npc:amy', 'npc:zoe']);
    expect(() => relId('npc:same', 'npc:same')).toThrow();
    expect(() => relId('biz:shop', 'npc:same')).toThrow(/npc ids/);
  });
});

describe('sim/entities — validation gates', () => {
  it('a good npc record passes clean', () => {
    expect(validateNpcs([npc()], exists)).toEqual([]);
  });

  it('bad home refs, bad money, bad inventory are all caught', () => {
    const issues = validateNpcs([
      npc({ id: 'npc:a', homePlaceId: 'NOWHERE-99' }),
      npc({ id: 'npc:b', moneyCents: -5 }),
      npc({ id: 'npc:c', inventory: ['not-an-item-id'] }),
      npc({ id: 'npc:d', location: { placeId: 'NOWHERE-99' } }),
    ], exists);
    expect(issues.map((i) => i.code)).toEqual(['BAD_REF', 'BAD_MONEY', 'BAD_REF', 'BAD_REF']);
  });

  it('duplicate npc ids are caught (no double people in a save)', () => {
    expect(validateNpcs([npc(), npc()], exists).map((i) => i.code)).toEqual(['DUPLICATE']);
  });

  it('businesses need real premises, a real owner, sane hours', () => {
    const issues = validateBusinesses([
      biz({ premisesBuildingId: 'GHOST-01' }),
      biz({ id: 'biz:b', ownerNpcId: 'npc:nobody' }),
      biz({ id: 'biz:c', opensAtMin: 17 * 60, closesAtMin: 17 * 60 }),
      biz({ id: 'biz:d', days: ['Funday' as never] }),
    ], [npc()], exists);
    expect(issues.map((i) => i.code)).toEqual(['BAD_REF', 'BAD_OWNER', 'BAD_HOURS', 'BAD_HOURS']);
  });

  it('businessIsOpen honors hours and the days list', () => {
    const b = biz();
    expect(businessIsOpen(b, 10 * 60, 'Mon')).toBe(true);
    expect(businessIsOpen(b, 8 * 60, 'Mon')).toBe(false);
    expect(businessIsOpen(b, 18 * 60, 'Mon')).toBe(false);
    expect(businessIsOpen(b, 10 * 60, 'Sun')).toBe(false); // dark day
    // closing minute is exclusive: 17:00 sharp is shut
    expect(businessIsOpen(b, 17 * 60, 'Mon')).toBe(false);
  });

  it('makeRelationship wires both members symmetrically', () => {
    const r = makeRelationship('npc:b_person', 'npc:a_person', 10, 50);
    expect(r.a).toBe('npc:a_person');
    expect(r.b).toBe('npc:b_person');
    expect(r.warmth).toBe(10);
    expect(r.trust).toBe(50);
  });
});
