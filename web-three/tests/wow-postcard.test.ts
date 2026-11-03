/**
 * The Wow card (docs/51 B10) — the sync beat's shareable postcard. The
 * capture and panel wiring are Game-side (renderer + DOM); the pure laws
 * live here: the caption's voice, its fit on the card, and the fact law
 * that ties it to the beat the player just lived (TS_SYNC_NOTE).
 */

import { describe, it, expect } from 'vitest';
import { tsWowCaption, TS_SYNC_NOTE } from '../src/core/content';
import { composeCaption } from '../src/core/content';

/** composePostcard draws the caption strip at 38 px per line starting
 *  y = 1024 + 40 + 28 = 1092 on a 1344-tall card — the strip fits six
 *  lines with margin; anything past that runs off the paper. */
const CARD_LINE_BUDGET = 6;

describe('the Wow caption (docs/51 B10)', () => {
  it('speaks the day-card voice: Day N, the beat, the sign-off', () => {
    const c = tsWowCaption({ day: 2, cartName: 'The Golden Cart' });
    expect(c).toContain('Day 2. The screens all turned at once.');
    expect(c).toContain('Warm light, just for you.');
    expect(c).toContain('\u2014 The Golden Cart, Day 2');
  });

  it('tells the same truth the note told (the beat the player just lived)', () => {
    // Doc 02's wonder beat #1 is ONE moment with ONE set of facts — the
    // card and the note must never disagree about the square
    expect(TS_SYNC_NOTE).toContain('warm light, just for you');
    expect(TS_SYNC_NOTE).toContain('300,000 people');
    const c = tsWowCaption({ day: 1, cartName: 'X' });
    expect(c).toContain('Warm light, just for you.');
    expect(c).toContain('300,000 people cross here every day.');
  });

  it('fits the postcard paper (the caption strip line budget)', () => {
    for (let day = 1; day <= 4; day++) {
      const lines = tsWowCaption({ day, cartName: 'A Very Long Cart Name Indeed' }).split('\n');
      expect(lines.length).toBeLessThanOrEqual(CARD_LINE_BUDGET);
    }
  });

  it('is not the day-end card — the story machine stays sacred', () => {
    // the day card opens with the ledger ($start → $end); the Wow card
    // must not read like one, and must not contain its done-words
    const c = tsWowCaption({ day: 3, cartName: 'SST' });
    expect(c).not.toMatch(/\$\d+ \u2192 \$\d+/);
    for (const dayWord of ['Met:', 'Filed:', 'The regulars are waiting.']) {
      expect(c).not.toContain(dayWord);
    }
  });

  it('matches the house day-card sign-off shape (composeCaption precedent)', () => {
    const dayCard = composeCaption({
      day: 1, replay: false, dayStartMoney: 87, money: 90, cartName: 'SST',
    });
    const wow = tsWowCaption({ day: 1, cartName: 'SST' });
    // both sign off the same way — one voice, many moments
    expect(wow.trim().endsWith('\u2014 SST, Day 1')).toBe(true);
    expect(dayCard.trim().endsWith('\u2014 SST, Day 1')).toBe(true);
  });
});
