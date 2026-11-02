/**
 * The Arrival's state machine (§1c: state machines are sacred). The
 * cinematic is a linear film with tap-advance, a chip pick, and a skip —
 * this suite proves every transition, both dead ends (taps that must NOT
 * advance), and that skip lands at the handover from every phase.
 */
import { describe, it, expect } from 'vitest';
import {
  ArrivalMachine, ARRIVAL_CHOICES, RIDE_SECONDS, CARD_SECONDS,
} from '../src/game/arrival';

describe('ArrivalMachine', () => {
  it('begins at the ride and stays until the ride clock runs out', () => {
    const m = new ArrivalMachine();
    expect(m.active).toBe(false);
    m.begin();
    expect(m.phase).toBe('ride');
    expect(m.active).toBe(true);
    m.tick(1);
    m.tick(1);
    expect(m.phase).toBe('ride'); // RIDE_SECONDS is 10 — two ticks stay
    m.tick(RIDE_SECONDS);
    expect(m.phase).toBe('choice'); // the driver asks
  });

  it('a stray early tap cannot skip the skyline tease', () => {
    const m = new ArrivalMachine();
    m.begin();
    expect(m.tap()).toBe(false);
    expect(m.phase).toBe('ride');
    m.tick(1.3);
    expect(m.tap()).toBe(true); // past the gate, a tap moves on
    expect(m.phase).toBe('choice');
  });

  it('the choice pick records the personality and lands the reply', () => {
    const m = new ArrivalMachine();
    m.begin();
    m.tick(RIDE_SECONDS);
    expect(m.pick(0)).toBe(true);
    expect(m.choice).toBe(0);
    expect(m.phase).toBe('reply');
    expect(m.pick(1)).toBe(false); // one pick only
    expect(m.choice).toBe(0);
  });

  it('a plain tap during the choice picks the shy answer', () => {
    const m = new ArrivalMachine();
    m.begin();
    m.tick(RIDE_SECONDS);
    m.tap();
    expect(m.phase).toBe('reply');
    expect(m.choice).toBe(2); // "...Yeah."
    expect(ARRIVAL_CHOICES[2]).toBe('...Yeah.');
  });

  it('the driver must be heard before the card — no fast-forward through the reply', () => {
    const m = new ArrivalMachine();
    m.begin();
    m.tick(RIDE_SECONDS);
    m.tap(); // → reply
    expect(m.tap()).toBe(false); // 0 s in: the you-line just landed
    m.tick(1.5);
    expect(m.tap()).toBe(false); // the driver is still talking
    m.tick(1.8); // 3.3 s total
    expect(m.tap()).toBe(true);
    expect(m.phase).toBe('card');
  });

  it('the card auto-advances to the handover on its clock', () => {
    const m = new ArrivalMachine();
    m.begin();
    m.tick(RIDE_SECONDS);
    m.tap();
    m.tick(3.3);
    m.tap(); // → card
    m.tick(CARD_SECONDS);
    expect(m.phase).toBe('handover');
  });

  it('skip lands at the handover from every phase', () => {
    for (const path of ['ride', 'choice', 'reply', 'card'] as const) {
      const m = new ArrivalMachine();
      m.begin();
      if (path !== 'ride') m.tick(RIDE_SECONDS);
      if (path === 'reply' || path === 'card') m.tap();
      if (path === 'card') m.tick(3.3), m.tap();
      expect(m.skip()).toBe(true);
      expect(m.phase).toBe('handover');
      expect(m.skip()).toBe(true); // idempotent — a skip storm stays put
      m.finish();
      expect(m.active).toBe(false);
    }
  });

  it('skip is refused before the film starts and after it ends', () => {
    const m = new ArrivalMachine();
    expect(m.skip()).toBe(false);
    m.begin();
    m.skip();
    m.finish();
    expect(m.skip()).toBe(false);
  });

  it('ticks do nothing when the film is off', () => {
    const m = new ArrivalMachine();
    m.tick(100);
    expect(m.phase).toBe('off');
  });
});
