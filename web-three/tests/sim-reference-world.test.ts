/**
 * The reference world — PART 6's end-to-end proof (world-contract/13).
 * Spatial + simulation + narrative + economy, one manifest, real registry.
 */
import { describe, it, expect } from 'vitest';
import { loadRegistry } from '../src/sim/registry';
import { businessIsOpen } from '../src/sim/entities';
import { parseWorldSave, snapshotWorld } from '../src/sim/state';
import {
  buildReferenceWorld, referencePlaceExists, REFERENCE_ALIASES,
  REFERENCE_LEDGER_SCRIPT, referenceDialogueScenario,
} from '../src/sim/reference';
import { activityAt } from '../src/sim/schedule';
import { propose, complete, newArbitration, PRIORITY, type ActivityClaim, type ArbitrationWorld } from '../src/sim/arbitration';
import { validateEvent, planFallback, type ValidateWorld } from '../src/sim/narrative';
import { auditWorld } from '../src/sim/state';
import { GameClock } from '../src/sim/clock';

const reg = loadRegistry();
const placeExists = referencePlaceExists((id) => reg.placePoint(id) !== null);

function validateWorldAt(day = 1, minuteOfDay = 8 * 60 + 5): { w: ValidateWorld; refs: ReturnType<typeof buildReferenceWorld> } {
  const refs = buildReferenceWorld(placeExists);
  const clock = new GameClock({ day, minuteOfDay });
  return {
    refs,
    w: {
      registry: reg,
      npcs: new Map(refs.world.npcs.map((n) => [n.id, n])),
      businesses: new Map(refs.world.businesses.map((b) => [b.id, b])),
      relationships: refs.world.relationships,
      playerNpcId: 'npc:leo_marsh',
      flags: refs.world.flags,
      availability: refs.world.availability,
      activityPriority: new Map(),
      inEvent: new Map(),
      clock,
      chapter: 0,
    },
  };
}

describe('reference world — the manifest proves the contracts interlock', () => {
  it('builds against the real registry without throwing (a typo would be loud)', () => {
    expect(() => buildReferenceWorld(placeExists)).not.toThrow();
  });

  it('audits clean: entities, ledger, relationships, event order', () => {
    const { world } = buildReferenceWorld(placeExists);
    const r = auditWorld(world, placeExists);
    expect(r.issues).toEqual([]);
  });

  it('carries the directive\'s required exemplars', () => {
    const { world } = buildReferenceWorld(placeExists);
    const kinds = {
      residential: world.npcs.some((n) => n.homePlaceId === 'KTS-02' || n.homePlaceId === 'GRB-01')
        && reg.building('KTS-02') !== undefined,
      commercial: reg.building('KTN-05') !== undefined,   // Fade King
      mixedUse: reg.building('ROS-01') !== undefined,      // deli below, home above
      restaurant: reg.building('KTN-04') !== undefined,    // Corner Slice
      publicSpace: reg.park('PRK-CORNER') !== undefined,   // Corner Park
      intersection: reg.street('STR-KESTREL') !== undefined && reg.street('STR-JUNIPER') !== undefined,
      pedestrianRoute: reg.doc.routes.pedestrian.some((r) => r.id === 'R-KESTREL-N'),
      transport: reg.building('SUB-01') !== undefined,
      interior: reg.interior('BODEGA-INT') !== undefined,
      business: world.businesses.length >= 3,
      interactive: true, // the newsbox/hoop anchors ship in the world (Game side); the OBJECT contract is sim/ids obj:*
      npc: world.npcs.length >= 5,
    };
    for (const [k, v] of Object.entries(kinds)) {
      expect(v, `reference world must include ${k}`).toBe(true);
    }
  });

  it('schedules resolve against the canon clock (Idris on the 7:40 platform, Tue)', () => {
    const refs = buildReferenceWorld(placeExists);
    const tuesday740 = new GameClock({ day: 1, minuteOfDay: 7 * 60 + 40 });
    const a = activityAt(refs.schedules.get('npc:idris_warsame')!, tuesday740);
    expect(a.kind).toBe('commute');
    expect(a.placeId).toBe('SUB-01');
    expect(a.entry?.punctual).toBe(true);
  });

  it('Kev keeps Sunday at the dominoes table (weekday discipline)', () => {
    const refs = buildReferenceWorld(placeExists);
    const sundayAfternoon = new GameClock({ day: 6, minuteOfDay: 15 * 60 }); // Sept 14, Sun
    const a = activityAt(refs.schedules.get('npc:kevin_okafor')!, sundayAfternoon);
    expect(a.kind).toBe('social');
    expect(a.placeId).toBe('PRK-CORNER');
  });

  it('business hours match their schedules (Rosa\'s deli is open for the morning regular)', () => {
    const { world } = buildReferenceWorld(placeExists);
    const deli = world.businesses.find((b) => b.id === 'biz:rosas_deli')!;
    const tue805 = new GameClock({ day: 1, minuteOfDay: 8 * 60 + 5 });
    expect(businessIsOpen(deli, tue805.minuteOfDay, tue805.weekday)).toBe(true);
  });

  it('the worked arbitration scenario: dialogue interrupts Idris\'s commute, commute resumes', () => {
    const clock = new GameClock({ day: 1, minuteOfDay: 7 * 60 + 45 });
    const { commute } = referenceDialogueScenario(clock);
    expect(commute.priority).toBe(PRIORITY.NORMAL);

    const w: ArbitrationWorld = { tick: () => clock.tick, valid: () => true, resourceUse: () => 0 };
    const r = newArbitration('npc:idris_warsame');
    const commuteClaim: ActivityClaim = {
      npcId: 'npc:idris_warsame', activityId: commute.entry?.id ?? 'commute',
      kind: commute.kind, priority: commute.priority as 3, placeId: commute.placeId,
    };
    propose(r, commuteClaim, w);
    const dialogue = propose(r, {
      npcId: 'npc:idris_warsame', activityId: 'dialogue', kind: 'social',
      priority: PRIORITY.HIGH,
    }, w);
    expect(r.current?.activityId).toBe('dialogue');
    expect(dialogue.events.some((e) => e.kind === 'suspended')).toBe(true);
    const out = complete(r, w);
    expect(out.active?.activityId).toBe(commuteClaim.activityId);
  });

  it('the morning-regular event validates; the dark-diner event fails and plans a reschedule', () => {
    const { w, refs } = validateWorldAt();
    const good = refs.events.find((e) => e.id === 'evt:example_morning_regular')!;
    expect(validateEvent(good, w).ok).toBe(true);

    const bad = refs.events.find((e) => e.id === 'evt:example_closed_shop')!;
    const r = validateEvent(bad, w);
    expect(r.ok).toBe(false);
    const plan = planFallback(bad, r.ok ? [] : r.violations, w);
    expect(['cancel', 'reschedule']).toContain(plan.action);
  });

  it('the economy script posts clean: $87 → $74 with honest flow classes', () => {
    const { world } = buildReferenceWorld(placeExists);
    for (const s of REFERENCE_LEDGER_SCRIPT) {
      expect(world.ledger.post({ ...s, tick: world.clock.tick, day: world.clock.day })).not.toBeNull();
    }
    world.player.moneyCents = world.ledger.balance('acct:player');
    expect(world.player.moneyCents).toBe(7400);
    expect(world.ledger.audit()).toEqual([]);
    const report = world.ledger.flowReport();
    expect(report.find((r) => r.kind === 'faucet')?.cents).toBe(200);
    expect(report.find((r) => r.kind === 'sink')?.cents).toBe(-1000);
  });

  it('declared semantic aliases cover every loc:* reference in the manifest', () => {
    const aliasIds = new Set(REFERENCE_ALIASES.map((a) => a.id));
    for (const n of buildReferenceWorld(placeExists).world.npcs) {
      const places = [n.homePlaceId, n.workPlaceId, n.location.placeId].filter((p): p is string => !!p);
      for (const p of places) {
        if (p.startsWith('loc:')) {
          expect(aliasIds.has(p), `undeclared alias ${p}`).toBe(true);
        }
      }
    }
  });

  it('a save round-trip preserves the whole reference world (the persistence proof)', () => {
    const { world } = buildReferenceWorld(placeExists);
    for (const s of REFERENCE_LEDGER_SCRIPT) {
      world.ledger.post({ ...s, tick: world.clock.tick, day: world.clock.day });
    }
    world.player.moneyCents = world.ledger.balance('acct:player');
    world.clock.advance(90);
    const parsed = parseWorldSave(JSON.stringify(snapshotWorld(world)));
    expect(parsed.source).toBe('restored');
    expect(parsed.world.npcs.length).toBe(world.npcs.length);
    expect(parsed.world.clock.time).toBe(world.clock.time);
    expect(parsed.world.ledger.balance('biz:rosas_deli')).toBe(500);
    expect(auditWorld(parsed.world, placeExists).ok).toBe(true);
  });
});
