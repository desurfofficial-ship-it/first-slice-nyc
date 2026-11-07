/**
 * The choice nodes (narrative/14 R7 + narrative/10 §3 —
 * core/choiceNodes.ts, WP-5).
 *
 * The load-bearing laws, each pinned:
 *   1. **The register is complete** — seventeen nodes, N0–N7, chapters
 *      per doc 10 §3's table; nothing missing, nothing invented.
 *   2. **No fake choices** (doc 10 §3; doc 14 R7) — every structural
 *      node's options diverge in ledger terms: pairwise-unique
 *      downstream signatures, exactly one choice-ledger write per
 *      option. A forged converging node must fail the validator.
 *   3. **Deterministic signatures** — `flagSignature` is pure; the same
 *      option signs the same way forever.
 *   4. **Deferrals stay named** — N3b's 19 investor slots are doc 09 §4's
 *      table, not the register's; the deferral note is pinned so it
 *      cannot be silently forgotten.
 */

import { describe, expect, it } from 'vitest';
import {
  CHOICE_NODES, choiceNode, flagSignature, validateNoFakeChoices,
  type ChoiceNode, type ChoiceOption,
} from '../src/core/choiceNodes';

/** The register table, transcribed from doc 10 §3 (id → chapter). */
const DOC_10_S3: ReadonlyArray<readonly [string, string]> = [
  ['N0', 'C0'], ['N1a', 'C1'], ['N1b', 'C1'], ['N2', 'C2'], ['N2b', 'C2'],
  ['N3a', 'C3'], ['N3b', 'C3'], ['N3c', 'C3'], ['N4a', 'C4'], ['N4b', 'C4'],
  ['N4c', 'C4'], ['N4d', 'C4'], ['N5a', 'C5'], ['N5b', 'C5'], ['N5c', 'C5'],
  ['N6', 'C6'], ['N7', 'C6'],
];

describe('choice nodes — the register is doc 10 §3 (verbatim)', () => {
  it('seventeen nodes, N0–N7, every chapter matching the table', () => {
    expect(CHOICE_NODES).toHaveLength(17);
    expect(CHOICE_NODES.map((n) => [n.id, n.chapter])).toEqual(DOC_10_S3.map(([id, ch]) => [id, ch]));
  });

  it('every register row has its title from the doc', () => {
    expect(choiceNode('N2')?.title).toBe('The Compact');
    expect(choiceNode('N7')?.title).toBe('Testimony at the hearing');
    expect(choiceNode("N4d")?.title).toBe("The 2 a.m. scene's morning");
    expect(choiceNode('N0')?.title).toBe("The diary's first entry");
  });

  it('N2 offers the four forms — A pull-out / B courier / C information-trade / D refuse', () => {
    const n2 = choiceNode('N2');
    expect(n2?.options.map((o) => o.label)).toEqual([
      'A pull-out', 'B courier', 'C information-trade', 'D refuse',
    ]);
  });

  it('every structural node is marked structural — the register has no flavor nodes', () => {
    // doc 10 §3: "Every structural node above diverges in ledger terms."
    // The register encodes all seventeen as structural; if a flavor node
    // is ever added it must be marked structural: false and this test
    // revisited (the no-fake-choices law does not bind flavor).
    expect(CHOICE_NODES.every((n) => n.structural)).toBe(true);
  });

  it('N3b defers its options to the candidate table — and says so', () => {
    const n3b = choiceNode('N3b');
    expect(n3b?.options).toEqual([]);
    expect(n3b?.note).toContain('19 slots');
    expect(n3b?.note).toContain('doc 09');
  });
});

describe('choice nodes — the no-fake-choices law (doc 10 §3; doc 14 R7)', () => {
  it('every structural option signs uniquely — the register passes', () => {
    const audit = validateNoFakeChoices(CHOICE_NODES);
    expect(audit.ok).toBe(true);
    expect(audit.violations).toEqual([]);
    expect(audit.deferred).toEqual(['N3b']); // the one deferral, named
  });

  it('each structural option writes exactly one choice ledger entry naming its node', () => {
    for (const node of CHOICE_NODES) {
      for (const o of node.options) {
        const writes = o.ledgerWrites.filter((w) => w.kind === 'choice');
        expect(writes, `${node.id}/${o.id}`).toHaveLength(1);
        expect(writes[0].refs).toEqual([node.id]);
        expect(writes[0].entryId).toBe(`choice/${node.id}/${o.id}`);
      }
    }
  });

  it('a forged converging node fails the audit — the canon bug cannot land', () => {
    const fake: ChoiceNode = {
      id: 'N-FAKE', chapter: 'C3', title: 'the forgery', structural: true, locks: [],
      options: [
        {
          id: 'looks-free', label: 'A', locks: [],
          ledgerWrites: [{ entryId: 'choice/N-FAKE/a', kind: 'choice', refs: ['N-FAKE'], weight: 1, visibility: 'private' }],
          flagWrites: [{ key: 'the_flag', value: 'same' }],
        },
        {
          id: 'is-the-same', label: 'B', locks: [],
          ledgerWrites: [{ entryId: 'choice/N-FAKE/b', kind: 'choice', refs: ['N-FAKE'], weight: 1, visibility: 'private' }],
          flagWrites: [{ key: 'the_flag', value: 'same' }],
        },
      ],
    };
    const audit = validateNoFakeChoices([...CHOICE_NODES, fake]);
    expect(audit.ok).toBe(false);
    expect(audit.violations.some((v) => v.startsWith('N-FAKE/'))).toBe(true);
  });

  it('different ledger entry ids alone are NOT divergence — the loophole is closed', () => {
    // Two options that write the same downstream flag but mint different
    // per-option choice entries converge in every way the world can read:
    // the flag signature is the law, and it flags them (doc 14 R7).
    const a: ChoiceOption = {
      id: 'a', label: 'A', locks: [],
      ledgerWrites: [{ entryId: 'choice/X/a', kind: 'choice', refs: ['X'], weight: 1, visibility: 'private' }],
      flagWrites: [{ key: 'k', value: 'same' }],
    };
    const b: ChoiceOption = {
      id: 'b', label: 'B', locks: [],
      ledgerWrites: [{ entryId: 'choice/X/b', kind: 'choice', refs: ['X'], weight: 1, visibility: 'private' }],
      flagWrites: [{ key: 'k', value: 'same' }],
    };
    expect(flagSignature(a)).toBe(flagSignature(b));
    const audit = validateNoFakeChoices([{
      id: 'X', chapter: 'C3', title: 'converging', structural: true, locks: [],
      options: [a, b],
    }]);
    expect(audit.ok).toBe(false);
    expect(audit.violations.some((v) => v.startsWith('X/a'))).toBe(true);
  });

  it('different flag values are sufficient divergence', () => {
    const a: ChoiceOption = {
      id: 'a', label: 'A', locks: [],
      ledgerWrites: [{ entryId: 'choice/X/a', kind: 'choice', refs: ['X'], weight: 1, visibility: 'private' }],
      flagWrites: [{ key: 'k', value: 'a' }],
    };
    const b: ChoiceOption = {
      id: 'b', label: 'B', locks: [],
      ledgerWrites: [{ entryId: 'choice/X/b', kind: 'choice', refs: ['X'], weight: 1, visibility: 'private' }],
      flagWrites: [{ key: 'k', value: 'b' }],
    };
    expect(flagSignature(a)).not.toBe(flagSignature(b));
  });
});

describe('choice nodes — determinism and purity (AGENTS.md §1c.4)', () => {
  it('flagSignature is pure — same option, same signature, forever', () => {
    const o = choiceNode('N2')!.options[0];
    const once = flagSignature(o);
    const twice = flagSignature(structuredClone(o));
    expect(once).toBe(twice);
    expect(once).toBe('compact=a-pull-out'); // the flag IS the signature (doc 14 R7)
  });

  it('the register contains no locks yet — chapter gating is R1/R8, not authored here', () => {
    // The register table (doc 10 §3) authors no locks; encoding any would
    // be invention. This test pins the honesty: when R1/R8 adds locks,
    // this assertion is revisited deliberately.
    expect(CHOICE_NODES.every((n) => n.locks.length === 0)).toBe(true);
    expect(CHOICE_NODES.every((n) => n.options.every((o) => o.locks.length === 0))).toBe(true);
  });

  it('lookup by id is exact and undefined-safe', () => {
    expect(choiceNode('N0')?.id).toBe('N0');
    expect(choiceNode('N999')).toBeUndefined();
    expect(choiceNode('')).toBeUndefined();
  });
});
