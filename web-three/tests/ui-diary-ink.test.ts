/**
 * WP-6 — the field diary's ink + the calendar dateline, the laws as tests.
 *
 * The renderer is DOM (vitest runs node), so the wiring is guarded the way
 * touch-law.test.ts guards it: pure functions tested directly, source
 * contracts read as text. The laws here are narrative/14 R3/R4 + doc 03
 * §2/§5.1 + the epochMap mapping law:
 *
 *   · the ink is the entry's frozen bytes with strikes ON TOP — strip the
 *     spans and the body returns byte for byte (append-only survives
 *     rendering);
 *   · the contradiction strike is a text style, never an image;
 *   · the RECALL wobble is deterministic (fixed tilt, no animation);
 *   · every date renders through core/calendar's formatGameDate — the one
 *     date door; the HUD/leaf dateline text arrives through
 *     datelineOfStoryDay (the one mapping); no real clock anywhere;
 *   · the diary adds no paper door of its own — the touch law's wiring
 *     (docs/51 B7) is untouched.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildDiaryEntryHtml, buildStruckBodyHtml, buildDiaryPageHtml } from '../src/ui/diary';
import { datelineOfStoryDay, dateOfStoryDay } from '../src/sim/epochMap';
import type { FieldDiaryEntry } from '../src/core/fieldDiary';

const diarySource = readFileSync(new URL('../src/ui/diary.ts', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../src/ui/UI.ts', import.meta.url), 'utf8');
const gameSource = readFileSync(new URL('../src/game/Game.ts', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

/** The WP-6 CSS block — everything from its banner to the end of file. */
const diaryCss = cssSource.slice(cssSource.indexOf('WP-6 \u2014 the field diary'));

function entry(over: Partial<FieldDiaryEntry>): FieldDiaryEntry {
  return {
    id: 'E-Y1-0909-01',
    kind: 'PLACE',
    date: { y: 1, m: 9, d: 9 },
    epistemic: 'FACT',
    body: 'Corner Slice. One hero oven, a radio that only likes the Mets.',
    links: [],
    visibility: 'private',
    corrections: [],
    ...over,
  };
}

const plain = (html: string): string => html.replace(/<[^>]+>/g, '');

describe('the ink is the frozen bytes with strikes on top (doc 03 \u00A75.1)', () => {
  it('a correction strikes the offending text and adds the margin note', () => {
    const e = entry({
      id: 'E-Y1-0909-02',
      kind: 'RECALL',
      epistemic: 'FACT',
      body: 'Rosa gave me the cart.',
      corrections: [{ day: 6, strike: 'gave me', margin: 'Loaned. She never said give. I heard what I needed. \u2014 L' }],
    });
    const html = buildDiaryEntryHtml(e);
    expect(html).toContain('<span class="diary-strike">gave me</span>');
    expect(html).toContain('Loaned. She never said give. I heard what I needed. \u2014 L');
    // the bytes survive: strip the spans and the body returns untouched
    expect(plain(buildStruckBodyHtml(e))).toBe('Rosa gave me the cart.');
  });

  it('two corrections make two strikes, each claiming its first plain occurrence', () => {
    const e = entry({
      body: 'Rosa gave me the cart and I kept the cart.',
      corrections: [
        { day: 6, strike: 'gave', margin: 'Loaned.' },
        { day: 7, strike: 'kept', margin: 'Borrowed, then returned.' },
      ],
    });
    const html = buildStruckBodyHtml(e);
    expect(html.match(/class="diary-strike"/g)).toHaveLength(2);
    expect(plain(html)).toBe('Rosa gave me the cart and I kept the cart.');
  });

  it('a strike that quotes nothing present leaves the body plain \u2014 the margin still renders', () => {
    const e = entry({
      body: 'The M121 takes the Gable corner wide.',
      corrections: [{ day: 9, strike: 'the cart was mine', margin: 'Loaned. She never said give.' }],
    });
    const html = buildDiaryEntryHtml(e);
    expect(html).not.toContain('diary-strike');
    expect(html).toContain('Loaned. She never said give.');
    expect(plain(buildStruckBodyHtml(e))).toBe('The M121 takes the Gable corner wide.');
  });
});

describe('the mechanical tag and the one date door (doc 03 \u00A72, narrative/14 R4)', () => {
  it('the meta line is the epistemic tag and the calendar dateline', () => {
    const html = buildDiaryEntryHtml(entry({}));
    expect(html).toContain('FACT \u00B7 September 9 \u00B7 Year 1');
    expect(html).toContain('data-epistemic="FACT"');
  });

  it('RECALL renders marked for the wobble \u2014 never upgraded away by machinery', () => {
    const html = buildDiaryEntryHtml(entry({ epistemic: 'RECALL', body: 'The platform smell: rain on warm stone. I think I knew it once.' }));
    expect(html).toContain('data-epistemic="RECALL"');
    expect(html).toContain('RECALL \u00B7 September 9 \u00B7 Year 1');
  });

  it('entry dates render in the one format \u2014 the ruled epoch\u2019s full-month form', () => {
    const html = buildDiaryEntryHtml(entry({ date: { y: 1, m: 9, d: 14 } }));
    expect(html).toContain('September 14 \u00B7 Year 1');
  });

  it('markup in a body is ink, never HTML \u2014 the diary cannot be injected', () => {
    const html = buildDiaryEntryHtml(entry({ body: '<script>alert(1)</script> nice try.' }));
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });

  it('the same entry renders byte-identically \u2014 the ink is deterministic', () => {
    const e = entry({
      corrections: [{ day: 2, strike: 'hero oven', margin: 'It is the only oven.' }],
    });
    expect(buildDiaryEntryHtml(e)).toBe(buildDiaryEntryHtml(e));
    expect(buildStruckBodyHtml(e)).toBe(buildStruckBodyHtml(e));
  });
});

describe('the dateline is the one mapping, rendered (sim/epochMap law)', () => {
  it('day 1 is the ruled epoch \u2014 Tuesday, September 9, Year 1 (DEC-1)', () => {
    expect(dateOfStoryDay(1)).toEqual({ y: 1, m: 9, d: 9 });
    expect(datelineOfStoryDay(1)).toBe('September 9 \u00B7 Year 1');
  });

  it('the plan\u2019s example date: day 6 is September 14 \u00B7 Year 1', () => {
    expect(datelineOfStoryDay(6)).toBe('September 14 \u00B7 Year 1');
  });
});

describe('the leaf\u2019s furniture is built once and speaks in voice', () => {
  it('the empty page waits, it never nags', () => {
    const html = buildDiaryPageHtml();
    expect(html).toContain('The pages are waiting.');
    expect(html).toContain('id="map-diary-list"');
    expect(html).toContain('id="map-diary-dateline"');
    expect(html).toContain('id="map-diary-empty"');
  });
});

describe('the ink\u2019s source laws (the calendar-class grep, one module over)', () => {
  it('diary.ts renders dates through formatGameDate and never reads a clock', () => {
    expect(diarySource).toContain("from '../core/calendar'");
    expect(diarySource).toContain('formatGameDate(');
    // no real clock anywhere in the ink (the R4 law; calendar.ts's grep)
    expect(diarySource).not.toMatch(/new Date\b/);
    expect(diarySource).not.toMatch(/Date\.now\b/);
    expect(diarySource).not.toMatch(/performance\.now\b/);
    expect(diarySource).not.toMatch(/toLocaleDateString/);
    // the month names come from the calendar\u2019s table, never a literal here
    expect(diarySource).not.toContain('September');
    expect(diarySource).not.toContain('October');
  });

  it('the strike is a text style, not an image; the wobble is fixed, not animated', () => {
    // comments speak, declarations bind \u2014 assert on the rules alone
    const rules = diaryCss.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(diaryCss).toContain('.diary-strike');
    expect(rules).toContain('text-decoration: line-through');
    expect(rules).not.toMatch(/url\(/); // no image anywhere in the ink
    expect(rules).toContain('[data-epistemic="RECALL"] .diary-body');
    expect(rules).toContain('transform: rotate(-0.9deg)');
    expect(rules).not.toMatch(/animation/); // a fixed tilt, never a moving one
  });

  it('UI.ts exposes the two display seams and adds no paper door', () => {
    expect(uiSource).toContain('refreshDiary(entries: readonly FieldDiaryEntry[]): void');
    expect(uiSource).toContain('setDateline(text: string): void');
    // the touch law\u2019s single wiring is untouched (touch-law.test.ts pins
    // the counts); the diary block itself never calls syncTouchUI
    const seams = uiSource.slice(
      uiSource.indexOf('refreshDiary(entries'),
      uiSource.indexOf('wiggleMap()'),
    );
    expect(seams).not.toContain('syncTouchUI');
    expect(uiSource.match(/classList\.toggle\('hidden-when-panel'/g)).toHaveLength(1);
  });

  it('Game.ts renders the dateline through the mapping and feeds the diary its state', () => {
    // boot + toggleMap + beginDay \u2014 three doors, one mapping, no ad-hoc dates
    expect(gameSource.match(/datelineOfStoryDay\(/g)).toHaveLength(3);
    expect(gameSource).toContain('this.ui.refreshDiary(this.state.fieldDiary)');
    // the HUD never formats a date by hand \u2014 the mapping is the only door
    expect(gameSource).not.toContain('formatGameDate(');
  });
});
