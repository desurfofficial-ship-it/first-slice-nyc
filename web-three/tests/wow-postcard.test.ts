/**
 * The Wow card (docs/51 B10; captions now Doc 08 §2 postcard 1's exact
 * final-voice lines) — the sync beat's shareable postcard. The capture and
 * panel wiring are Game-side (renderer + DOM); the pure laws live here: the
 * caption's voice, its fit on the card, and the fact law that ties it to
 * the beat the player just lived (TS_SYNC_NOTE). The Day-1 moment cards
 * (P2–P5) pin their Doc 08 captions here too — one wonder beat each.
 */

import { describe, it, expect } from 'vitest';
import {
  tsWowCaption, TS_SYNC_NOTE, composeCaption,
  MOMENT_RUSH_CAPTION, MOMENT_TOWERS_CAPTION, MOMENT_FOLD_CAPTION,
  momentCornerCaption, MOMENT_TAGS,
} from '../src/core/content';

/** composePostcard draws the caption strip at 38 px per line starting
 *  y = 1024 + 40 + 28 = 1092 on a 1344-tall card — the strip fits six
 *  lines with margin; anything past that runs off the paper. */
const CARD_LINE_BUDGET = 6;

describe('the Wow caption (Doc 08 postcard 1 — Times Square)', () => {
  it('speaks Doc 08\u2019s exact two lines, nothing else', () => {
    const c = tsWowCaption({ day: 2, cartName: 'The Golden Cart' });
    expect(c).toBe('Times Square \u2014 300,000 people cross here every day.\nToday, so did you.');
  });

  it('tells the same truth the note told (the beat the player just lived)', () => {
    // Doc 02's wonder beat #1 is ONE moment with ONE set of facts — the
    // card and the note must never disagree about the square
    expect(TS_SYNC_NOTE).toContain('300,000 people');
    expect(TS_SYNC_NOTE).toContain('Today, so did you');
    const c = tsWowCaption({ day: 1, cartName: 'X' });
    expect(c).toContain('300,000 people cross here every day.');
    expect(c).toContain('Today, so did you.');
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

  it('passes the fridge test: two lines, no signature in the caption', () => {
    // the paper signs itself (the stamp block draws the cart name and day —
    // capturePostcard's args); the caption is the square's own voice
    const c = tsWowCaption({ day: 1, cartName: 'SST' });
    expect(c.split('\n')).toHaveLength(2);
    expect(c).not.toMatch(/\u2014 \S+, Day \d+/); // no sign-off in the caption
    // ...while the day card keeps the house sign-off (one voice, two jobs)
    const dayCard = composeCaption({ day: 1, replay: false, dayStartMoney: 87, money: 90, cartName: 'SST' });
    expect(dayCard.trim().endsWith('\u2014 SST, Day 1')).toBe(true);
  });
});

describe('the Day-1 moment cards (Doc 08 §2, P2\u2013P5)', () => {
  it('P2 First Rush carries Doc 08\u2019s exact lines', () => {
    expect(MOMENT_RUSH_CAPTION).toBe('Five orders. One apron that still smelled like mangoes.\nThe city let me keep up.');
  });

  it('P3 Water Towers carries Doc 08\u2019s exact lines', () => {
    expect(MOMENT_TOWERS_CAPTION).toBe('The buildings wear wooden hats.\nI don\u2019t know why yet. I like them.');
  });

  it('P4 The Fold carries Doc 08\u2019s exact lines', () => {
    expect(MOMENT_FOLD_CAPTION).toBe('Folding it is part of the recipe.\nGrease on the napkin is proof you were here.');
  });

  it('P5 Your Corner signs itself with the cart name', () => {
    expect(momentCornerCaption('Wade\u2019s Spot')).toBe('Wade\u2019s Spot \u2014 Day 1.\nIt was ugly. So was Rosa\u2019s, once. It\u2019s mine now.');
  });

  it('every moment caption fits the paper and keeps one wonder beat (two lines)', () => {
    const captions = [MOMENT_RUSH_CAPTION, MOMENT_TOWERS_CAPTION, MOMENT_FOLD_CAPTION, momentCornerCaption('X')];
    for (const c of captions) {
      expect(c.split('\n').length).toBeLessThanOrEqual(CARD_LINE_BUDGET);
      expect(c.length).toBeGreaterThan(0);
      expect(c.length).toBeLessThanOrEqual(400); // the album's caption law
    }
  });

  it('each moment card owns its shelf tag', () => {
    expect(MOMENT_TAGS).toEqual({ rush: 'THE RUSH', towers: 'THE HATS', fold: 'THE FOLD', corner: 'YOUR CORNER' });
    for (const tag of Object.values(MOMENT_TAGS)) {
      expect(tag.length).toBeLessThanOrEqual(24); // the album's tag law
    }
  });
});
