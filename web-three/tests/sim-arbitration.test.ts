/**
 * sim/arbitration — the priority matrix and its seven contracted scenarios
 * (world-contract/09). The scenario table in CONFLICT_SCENARIOS is the
 * contract; these tests are its teeth.
 */
import { describe, it, expect } from 'vitest';
import {
  propose, complete, tickArbitration, newArbitration, escalateForLateness,
  PRIORITY, CONFLICT_SCENARIOS, type ActivityClaim, type ArbitrationWorld,
} from '../src/sim/arbitration';

function world(over: Partial<ArbitrationWorld> = {}): ArbitrationWorld {
  let tick = 100;
  const w: ArbitrationWorld = {
    tick: () => tick,
    valid: () => true,
    resourceUse: () => 0,
    ...over,
  };
  return w;
}

function claim(over: Partial<ActivityClaim> = {}): ActivityClaim {
  return {
    npcId: 'npc:test', activityId: 'act', kind: 'test',
    priority: PRIORITY.NORMAL,
    ...over,
  };
}

describe('sim/arbitration — the matrix rules', () => {
  it('R1: strictly higher priority interrupts; equal queues; weaker refuses', () => {
    const w = world();
    const r = newArbitration('npc:a');
    propose(r, claim({ activityId: 'work', priority: PRIORITY.NORMAL }), w);
    // equal priority, durable → queued
    const eq = propose(r, claim({ activityId: 'errand', priority: PRIORITY.NORMAL }), w);
    expect(eq.events.some((e) => e.kind === 'queued')).toBe(true);
    expect(r.current?.activityId).toBe('work');
    // weaker → refused
    const lo = propose(r, claim({ activityId: 'idle', priority: PRIORITY.LOW }), w);
    expect(lo.events.some((e) => e.kind === 'refused')).toBe(true);
    // higher → interrupts
    const hi = propose(r, claim({ activityId: 'dialogue', priority: PRIORITY.HIGH }), w);
    expect(hi.events.some((e) => e.kind === 'interrupted')).toBe(true);
    expect(hi.events.some((e) => e.kind === 'suspended')).toBe(true);
    expect(r.current?.activityId).toBe('dialogue');
    expect(r.stack).toHaveLength(1);
  });

  it('R2: unresumable claims are dropped on interrupt, not owed a resume', () => {
    const w = world();
    const r = newArbitration('npc:a');
    propose(r, claim({ activityId: 'stroll', resumable: false }), w);
    propose(r, claim({ activityId: 'fire', priority: PRIORITY.EMERGENCY }), w);
    expect(r.stack).toHaveLength(0);
  });

  it('R3: completing the stronger claim resumes the suspended one', () => {
    const w = world();
    const r = newArbitration('npc:a');
    propose(r, claim({ activityId: 'commute' }), w);           // NORMAL
    propose(r, claim({ activityId: 'dialogue', priority: PRIORITY.HIGH }), w);
    const out = complete(r, w);
    expect(out.active?.activityId).toBe('commute');
    expect(out.events.some((e) => e.kind === 'completed' && e.activityId === 'dialogue')).toBe(true);
  });

  it('R4: a full doorway queues the claim; completion frees it deterministically', () => {
    let holders = 1; // someone is in the doorway
    const w = world({
      resourceUse: () => holders,
    });
    const r = newArbitration('npc:b');
    const out = propose(r, claim({
      activityId: 'enter-shop',
      resources: [{ resourceId: 'door:barber', capacity: 1 }],
    }), w);
    expect(out.events.some((e) => e.kind === 'resource-wait')).toBe(true);
    expect(r.current).toBeNull();
    expect(r.queue).toHaveLength(1);
    // the doorway clears
    holders = 0;
    const retry = tickArbitration(r, w);
    expect(retry.active?.activityId).toBe('enter-shop');
    expect(retry.events.some((e) => e.kind === 'unblocked')).toBe(true);
  });

  it('R5: an invalid claim falls through to the best valid alternative', () => {
    const w = world({
      valid: (c) => c.activityId !== 'closed-shop',
    });
    const r = newArbitration('npc:a');
    propose(r, claim({ activityId: 'closed-shop', priority: PRIORITY.HIGH }), w);
    // HIGH invalid → fall-through; stack/queue empty → nothing current
    expect(r.current).toBeNull();
    // now a valid LOW claim still works afterwards
    const out = propose(r, claim({ activityId: 'bench' }), w);
    expect(out.active?.activityId).toBe('bench');
  });

  it('R6: dialogue (HIGH) interrupts work but not an evacuation (EMERGENCY)', () => {
    const w = world();
    const r = newArbitration('npc:a');
    propose(r, claim({ activityId: 'evacuate', priority: PRIORITY.EMERGENCY }), w);
    const d = propose(r, claim({ activityId: 'dialogue', priority: PRIORITY.HIGH }), w);
    expect(d.events.some((e) => e.kind === 'refused')).toBe(true);
    expect(r.current?.activityId).toBe('evacuate');
  });

  it('R7: lateness escalates exactly one band, never past HIGH', () => {
    expect(escalateForLateness(PRIORITY.LOW)).toBe(PRIORITY.NORMAL);
    expect(escalateForLateness(PRIORITY.NORMAL)).toBe(PRIORITY.HIGH);
    expect(escalateForLateness(PRIORITY.HIGH)).toBe(PRIORITY.HIGH); // capped
    expect(escalateForLateness(PRIORITY.EMERGENCY)).toBe(PRIORITY.EMERGENCY);
  });

  it('expired proposals die without entering any list', () => {
    let tick = 100;
    const w = world({ tick: () => tick });
    const r = newArbitration('npc:a');
    const out = propose(r, claim({ activityId: 'stale', expiresAtTick: 50 }), w);
    expect(out.events.some((e) => e.kind === 'expired')).toBe(true);
    expect(r.queue).toHaveLength(0);
    expect(r.current).toBeNull();
    tick = 200;
  });

  it('invalid sweeps: suspended and queued claims re-validate every tick', () => {
    let raining = false;
    const w = world({
      valid: (c) => !(raining && c.activityId === 'park-chat'),
    });
    const r = newArbitration('npc:a');
    propose(r, claim({ activityId: 'park-chat', priority: PRIORITY.LOW }), w);
    propose(r, claim({ activityId: 'dialogue', priority: PRIORITY.HIGH }), w);
    expect(r.stack).toHaveLength(1);
    raining = true; // the rain starts mid-dialogue
    tickArbitration(r, w);
    expect(r.stack).toHaveLength(0); // the park chat is gone, honestly
  });
});

describe('sim/arbitration — the seven contracted scenarios', () => {
  it('S1 — commuting when an emergency occurs: suspend, survive, resume', () => {
    const w = world();
    const r = newArbitration('npc:idris');
    propose(r, claim({ activityId: 'commute', priority: PRIORITY.NORMAL, placeId: 'SUB-01' }), w);
    const fire = propose(r, claim({ activityId: 'evacuate', priority: PRIORITY.EMERGENCY }), w);
    expect(r.current?.activityId).toBe('evacuate');
    const after = complete(r, w);
    expect(after.active?.activityId).toBe('commute');
    expect(fire.events.filter((e) => e.kind === 'suspended')).toHaveLength(1);
  });

  it('S2 — socializing when it begins raining: validity drop, not priority fight', () => {
    let raining = false;
    const w = world({ valid: (c) => !(raining && c.placeId?.startsWith('PRK')) });
    const r = newArbitration('npc:kev');
    propose(r, claim({ activityId: 'dominoes', priority: PRIORITY.LOW, placeId: 'PRK-CORNER' }), w);
    expect(r.current?.activityId).toBe('dominoes');
    raining = true;
    const out = tickArbitration(r, w);
    expect(out.active).toBeNull(); // nothing valid remains → idle at fallback
  });

  it('S3 — player dialogue while walking to work: interrupt now, resume after', () => {
    const w = world();
    const r = newArbitration('npc:idris');
    propose(r, claim({ activityId: 'commute', priority: PRIORITY.NORMAL, placeId: 'SUB-01' }), w);
    propose(r, claim({ activityId: 'dialogue', priority: PRIORITY.HIGH }), w);
    expect(r.current?.activityId).toBe('dialogue');
    // the escalated commute (now HIGH) can no longer be re-interrupted by chat
    const spam = propose(r, claim({ activityId: 'dialogue-2', priority: PRIORITY.HIGH }), w);
    expect(spam.events.some((e) => e.kind === 'queued')).toBe(true);
    complete(r, w);
    expect(r.current?.activityId).toBe('commute');
  });

  it('S4 — blocked doorway: blocked list, fall-through, retry on clear', () => {
    let doorOpen = true;
    let holders = 0;
    const w = world({
      valid: () => doorOpen,
      resourceUse: () => holders,
    });
    const r = newArbitration('npc:kev');
    const c = claim({
      activityId: 'enter-barber',
      priority: PRIORITY.NORMAL,
      resources: [{ resourceId: 'door:KTN-05', capacity: 1 }],
    });
    propose(r, c, w);
    expect(r.current?.activityId).toBe('enter-barber');
    // the doorway seizes (someone parked in it)
    holders = 1;
    const out = tickArbitration(r, w);
    expect(out.events.some((e) => e.kind === 'blocked')).toBe(true);
    // it clears
    holders = 0;
    expect(tickArbitration(r, w).active?.activityId).toBe('enter-barber');
    void doorOpen;
  });

  it('S5 — two NPCs, one narrow stair: capacity holds, order is deterministic', () => {
    const holders = new Set<string>();
    const w = world({
      resourceUse: (_rid, except) => [...holders].filter((h) => h !== except).length,
    });
    const a = newArbitration('npc:a');
    const b = newArbitration('npc:b');
    const stair = () => ({ resourceId: 'stair:SUB-01', capacity: 1 });
    propose(a, claim({ activityId: 'descend', resources: [stair()] }), w);
    expect(a.current?.activityId).toBe('descend');
    holders.add('npc:a');
    propose(b, claim({ activityId: 'descend', resources: [stair()] }), w);
    expect(b.current).toBeNull();
    expect(b.queue).toHaveLength(1); // queued, not shoved, not vanished
    // a completes → b's tick hands them the stair
    holders.delete('npc:a');
    complete(a, w);
    expect(tickArbitration(b, w).active?.activityId).toBe('descend');
  });

  it('S6 — destination becomes unavailable: fall through, never freeze', () => {
    let shopOpen = true;
    const w = world({ valid: (c) => !(c.placeId === 'KTN-05' && !shopOpen) });
    const r = newArbitration('npc:a');
    propose(r, claim({ activityId: 'haircut', placeId: 'KTN-05', priority: PRIORITY.LOW }), w);
    expect(r.current?.activityId).toBe('haircut');
    shopOpen = false;
    const out = tickArbitration(r, w);
    expect(out.active).toBeNull();
  });

  it('S7 — an interrupted activity becomes valid again: resume when clear', () => {
    let windowOpen = true;
    const w = world({ valid: (c) => !(c.activityId === 'market' && !windowOpen) });
    const r = newArbitration('npc:a');
    propose(r, claim({ activityId: 'market', priority: PRIORITY.LOW, expiresAtTick: 500 }), w);
    propose(r, claim({ activityId: 'errand', priority: PRIORITY.NORMAL }), w);
    expect(r.stack.map((c) => c.activityId)).toEqual(['market']);
    windowOpen = false;
    tickArbitration(r, w);
    expect(r.stack).toHaveLength(0); // swept while invalid — no zombie resumes
  });

  it('the scenario table ships with all seven rows documented', () => {
    expect(CONFLICT_SCENARIOS.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']);
    for (const s of CONFLICT_SCENARIOS) {
      expect(s.contracted.length).toBeGreaterThan(20);
    }
  });
});
