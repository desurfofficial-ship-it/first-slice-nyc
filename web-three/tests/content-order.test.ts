import { describe, expect, it } from 'vitest';
import {
  RUSH_CARDS, SOLO_CARDS, SLANG_CARDS,
  type OrderCard,
} from '../src/core/content';

// Doc 07 VS-F03: "8 order types, choice UI, 'chef's welcome' v0, zero fail
// states." The eight are the paper kit's five counter cards (docs/12 cards
// 1–5) plus the cart's three neighbors (docs/02 §20:00–26:00). This file
// pins the CONTENT contract — the state machine's zero-fail sweep lives in
// tests/state.test.ts, the live thumb-path in scripts/e2e.mjs.

const ALL: OrderCard[] = [...RUSH_CARDS, ...SOLO_CARDS];

describe('VS-F03 — the eight order types', () => {
  it('the first day holds exactly eight orders — the kit\u2019s five, the cart\u2019s three', () => {
    expect(RUSH_CARDS.length).toBe(5);
    expect(SOLO_CARDS.length).toBe(3);
    expect(ALL.map((c) => c.id)).toEqual([
      'regular', 'bec', 'bagel', 'chopped', 'idris',
      'stroller', 'kid', 'idris_solo',
    ]);
  });

  it('every order answers to the chef\u2019s welcome — v0 means ANY order', () => {
    for (const card of ALL) {
      const chef = card.replies.some((r) => r.label.includes('Chef\u2019s welcome'));
      expect(chef, `${card.id} offers the chef\u2019s welcome`).toBe(true);
    }
  });

  it('every card is well-formed paper — bubble, line, default in range, replies whole', () => {
    for (const card of ALL) {
      expect(card.bubble.trim().length, `${card.id} bubble`).toBeGreaterThan(0);
      expect(card.line.trim().length, `${card.id} line`).toBeGreaterThan(0);
      expect(card.replies.length, `${card.id} reply count`).toBeGreaterThanOrEqual(3);
      expect(card.defaultReply, `${card.id} default in range`).toBeGreaterThanOrEqual(0);
      expect(card.defaultReply, `${card.id} default in range`).toBeLessThan(card.replies.length);
      for (const r of card.replies) {
        expect(r.label.trim().length, `${card.id} label`).toBeGreaterThan(0);
        expect(r.response.trim().length, `${card.id} response`).toBeGreaterThan(0);
        if (r.note !== undefined) {
          expect(r.note.trim().length, `${card.id} note text`).toBeGreaterThan(0);
        }
        if (r.slang !== undefined) {
          expect(SLANG_CARDS[r.slang],
            `${card.id} slang '${r.slang}' must be a real margin card`).toBeDefined();
        }
      }
    }
  });

  it('the kit\u2019s teach lines survive verbatim (docs/12 anchors)', () => {
    // Card 1 — asking what "regular" means gets the griddle answer, verbatim.
    const regular = ALL[0];
    expect(regular.replies[2].response).toContain('Milk and two sugars');
    expect(regular.replies[2].response).toContain('what regular means here');
    // Card 2 — the whole sentence is a complete order.
    const bec = ALL[1];
    expect(bec.replies.some((r) => r.response.includes('complete order'))).toBe(true);
    // Card 4 — wrong guesses can never offend; the kid is honest with you.
    const kid = ALL.find((c) => c.id === 'kid') as OrderCard;
    expect(kid.replies.some((r) => r.response.includes('don\u2019t know either'))).toBe(true);
    // And the kid\u2019s chef\u2019s welcome is the picking kind — you choose for him.
    const kidChef = kid.replies.find((r) => r.label.includes('Chef\u2019s welcome'));
    expect(kidChef?.label).toContain('I\u2019ll pick for you');
  });

  it('the cards earn regular + hero from the margins; the block earns the rest', () => {
    // The margins hold exactly Doc 08\u2019s four.
    expect(Object.keys(SLANG_CARDS).sort()).toEqual(['bodega', 'hero', 'online', 'regular']);
    const fromCards = new Set(
      ALL.flatMap((c) => c.replies.map((r) => r.slang).filter((s): s is string => !!s)),
    );
    expect([...fromCards].sort()).toEqual(['hero', 'regular']);
    // bodega + online are the block\u2019s to teach (the bodega counter, the
    // laundromat queue) — their reachability is pinned live in the E2E.
  });
});
