/**
 * The choice-node register (narrative/14 R7 + narrative/10 §3 —
 * core/choiceNodes.ts).
 *
 * The load-bearing laws, each pinned:
 *   1. **The register is doc 10 §3, transcribed** — seventeen structural
 *      nodes N0…N7 across C0–C6, in table order; N3b carries its
 *      nineteen authored slots (doc 09 §4's face-by-face fall).
 *   2. **The no-fake-choices rule is a test** (doc 10 §3; doc 14 §6's
 *      permanent guard) — every structural node's options diverge in
 *      flag terms and in ledger terms; a converging register fails.
 *   3. **The register is canon data** — frozen; nothing at runtime edits
 *      it (amendments are docs, not code; doc 15 §5.2).
 *   4. **Resolution is pure** — the pivot flag, the downstream writes and
 *      the ledger drafts come back; locks gate options (doc 10 §4's
 *      expiry law: N2's Form C dies with Yoli's strategy session).
 *   5. **No clock, no DOM** — the register is state ahead of its content
 *      (doc 14 §7 step 2); the source holds no clock read (R4).
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHOICE_NODES, CHOICE_NODE_IDS,
  flagSignatureOf, ledgerSignatureOf, nodeById, resolveChoice, validateRegister,
  type ChoiceNode, type ChoiceOption,
} from '../src/core/choiceNodes';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Doc 10 §3's register, in table order — the canon coverage set. */
const DOC_10_S3_IDS = [
  'N0', 'N1a', 'N1b', 'N2', 'N2b',
  'N3a', 'N3b', 'N3c',
  'N4a', 'N4b', 'N4c', 'N4d',
  'N5a', 'N5b', 'N5c',
  'N6', 'N7',
];

describe('choice nodes — the register is doc 10 §3, transcribed', () => {
  it('seventeen structural nodes, in table order', () => {
    expect(CHOICE_NODES).toHaveLength(17);
    expect(CHOICE_NODE_IDS).toEqual(DOC_10_S3_IDS);
  });

  it('every node sits in its chapter (doc 10 §3\u2019s Chapter column)', () => {
    const chapters: Record<string, string> = {
      N0: 'C0', N1a: 'C1', N1b: 'C1', N2: 'C2', N2b: 'C2',
      N3a: 'C3', N3b: 'C3', N3c: 'C3',
      N4a: 'C4', N4b: 'C4', N4c: 'C4', N4d: 'C4',
      N5a: 'C5', N5b: 'C5', N5c: 'C5',
      N6: 'C6', N7: 'C6',
    };
    for (const n of CHOICE_NODES) expect(n.chapter, n.id).toBe(chapters[n.id]);
  });

  it('every node has a title, options with labels — and at least two options', () => {
    for (const n of CHOICE_NODES) {
      expect(n.title.length, n.id).toBeGreaterThan(0);
      expect(n.options.length, n.id).toBeGreaterThanOrEqual(2);
      for (const o of n.options) {
        expect(o.label.length, `${n.id}/${o.id}`).toBeGreaterThan(0);
        expect(o.immediate.length, `${n.id}/${o.id}`).toBeGreaterThan(0);
        expect(o.downstream.length, `${n.id}/${o.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('N3b carries the nineteen slots (doc 09 §4\u2019s face-by-face fall)', () => {
    const n3b = nodeById('N3b');
    expect(n3b?.options).toHaveLength(19);
    expect(n3b?.options[0].id).toBe('slot-01');
    expect(n3b?.options[18].id).toBe('slot-19');
  });

  it('N0 carries the three authored prompts and the free write', () => {
    expect(nodeById('N0')?.options.map((o) => o.id))
      .toEqual(['prompt-1', 'prompt-2', 'prompt-3', 'free-write']);
  });

  it('N2 is The Compact, lettered A\u2013D — D refuses in other clothes', () => {
    const n2 = nodeById('N2');
    expect(n2?.title).toBe('The Compact');
    expect(n2?.options.map((o) => o.id)).toEqual(['pull-out', 'courier', 'information-trade', 'refuse']);
    expect(n2?.options[3].label).toContain('refuse');
  });

  it('the register is frozen — canon data, not runtime state', () => {
    expect(Object.isFrozen(CHOICE_NODES)).toBe(true);
    for (const n of CHOICE_NODES) {
      expect(Object.isFrozen(n)).toBe(true);
      for (const o of n.options) expect(Object.isFrozen(o)).toBe(true);
    }
  });

  it('every ledger write names its act — the cascade can trace a consequence to its node', () => {
    for (const n of CHOICE_NODES) {
      for (const o of n.options) {
        for (const w of o.ledgerWrites) {
          expect(w.refs, `${n.id}/${o.id}`).toContain(`${n.id}:${o.id}`);
        }
      }
    }
  });

  it('the public acts post shared — the gossip physics carries them (doc 10 §6)', () => {
    for (const o of nodeById('N5c')!.options.filter((x) => x.id !== 'silence')) {
      expect(o.ledgerWrites[0].visibility).toBe('shared');
    }
    for (const o of nodeById('N7')!.options.filter((x) => x.id !== 'the-wexler-file')) {
      expect(o.ledgerWrites[0].visibility).toBe('shared');
    }
  });
});

describe('choice nodes — the no-fake-choices rule is a test (doc 10 §3)', () => {
  it('the shipped register passes the validator', () => {
    const report = validateRegister();
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('every structural option moves at least one downstream flag', () => {
    for (const n of CHOICE_NODES) {
      for (const o of n.options) expect(o.flagWrites.length, `${n.id}/${o.id}`).toBeGreaterThan(0);
    }
  });

  it('options diverge in flag terms AND in ledger terms — within every node', () => {
    for (const n of CHOICE_NODES) {
      const flagSigs = new Set(n.options.map(flagSignatureOf));
      const ledgerSigs = new Set(n.options.map(ledgerSignatureOf));
      expect(flagSigs.size, `${n.id} flag signatures`).toBe(n.options.length);
      expect(ledgerSigs.size, `${n.id} ledger signatures`).toBe(n.options.length);
    }
  });

  it('a converging structural node FAILS the validator — the canon bug cannot ship', () => {
    // a fake N2: every form converges on the same downstream flags
    const fake: ChoiceNode[] = [{
      id: 'N2', chapter: 'C2', title: 'The Compact (fake)',
      options: ['A', 'B', 'C', 'D'].map((letter) => ({
        id: `form-${letter}`, label: letter, immediate: 'x', downstream: 'y',
        flagWrites: ['compact-form=same'],
        ledgerWrites: [{ kind: 'choice' as const, refs: [`N2:${letter}`], visibility: 'private' as const }],
        locks: [],
      })),
    }];
    const report = validateRegister(fake);
    expect(report.ok).toBe(false);
    expect(report.problems.some((p) => p.includes('fake choice'))).toBe(true);
  });

  it('a converging ledger write also fails — divergence is ledger terms, not just flags', () => {
    const fake: ChoiceNode[] = [{
      id: 'N1b', chapter: 'C1', title: 'Blackout role (fake)',
      options: ['cook', 'run-the-room'].map((id) => ({
        id, label: id, immediate: 'x', downstream: 'y',
        flagWrites: [`c2-invites=${id}`], // flags differ…
        ledgerWrites: [{ kind: 'choice' as const, refs: ['the-block'], visibility: 'private' as const }], // …the ledger does not
        locks: [],
      })),
    }];
    const report = validateRegister(fake);
    expect(report.ok).toBe(false);
    expect(report.problems.some((p) => p.includes('same ledger terms'))).toBe(true);
  });

  it('an omission authored at a node fails — omissions mature, they are not chosen', () => {
    const fake: ChoiceNode[] = [{
      id: 'N3c', chapter: 'C3', title: 'Gino\u2019s lunch (fake)',
      options: [{
        id: 'skip', label: 'skip', immediate: 'x', downstream: 'y',
        flagWrites: ['trigger-4=absent'],
        ledgerWrites: [{ kind: 'omission' as unknown as 'choice', refs: ['N3c:skip'], visibility: 'private' as const }],
        locks: [],
      }],
    }];
    const report = validateRegister(fake);
    expect(report.ok).toBe(false);
    expect(report.problems.some((p) => p.includes('never authored at a node'))).toBe(true);
  });
});

describe('choice nodes — resolution is pure (the chapter machinery owns the scene)', () => {
  it('a valid option resolves to the pivot flag, the downstream writes and the ledger drafts', () => {
    const n1a = nodeById('N1a')!;
    const res = resolveChoice(n1a, 'quiet-research');
    expect(res.ok).toBe(true);
    expect(res.nodeId).toBe('N1a');
    expect(res.optionId).toBe('quiet-research');
    // the pivot comes first — how the save remembers the pick
    expect(res.flagWrites?.[0]).toBe('node:N1a=quiet-research');
    expect(res.flagWrites).toContain('c2-information-position=quiet-research');
    expect(res.ledgerWrites).toEqual([
      { kind: 'promise', refs: ['eddie', 'N1a:quiet-research'], visibility: 'private' },
    ]);
  });

  it('an unknown option fails without throwing', () => {
    const res = resolveChoice(nodeById('N1a')!, 'ask-the-internet');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('bad-option');
  });

  it('N2\u2019s Form C is locked behind Yoli\u2019s strategy session (doc 10 §4\u2019s expiry law)', () => {
    const n2 = nodeById('N2')!;
    expect(n2.options.find((o) => o.id === 'information-trade')?.locks)
      .toEqual(['yoli-strategy-session']);
    // without the session, Form C is no longer available
    const locked = resolveChoice(n2, 'information-trade');
    expect(locked.ok).toBe(false);
    expect(locked.reason).toBe('locked');
    // with it, the trade stands
    const held = resolveChoice(n2, 'information-trade', new Set(['yoli-strategy-session']));
    expect(held.ok).toBe(true);
    // the other forms never needed the session
    expect(resolveChoice(n2, 'refuse').ok).toBe(true);
    expect(resolveChoice(n2, 'pull-out').ok).toBe(true);
  });

  it('resolving never mutates the register — the canon data survives the call', () => {
    const snapshot = JSON.stringify(CHOICE_NODES);
    const n2 = nodeById('N2')!;
    resolveChoice(n2, 'courier');
    resolveChoice(n2, 'nope');
    expect(JSON.stringify(CHOICE_NODES)).toBe(snapshot);
  });

  it('resolve echoes are absent when the node itself is junk', () => {
    const res = resolveChoice(undefined as unknown as ChoiceNode, 'x');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('bad-node');
  });
});

describe('choice nodes — no clock, no DOM (narrative/14 R4; state ahead of content, §7 step 2)', () => {
  it('the source holds the law: no Date object, no clock read, in choiceNodes.ts', () => {
    const src = readFileSync(join(REPO_ROOT, 'web-three', 'src', 'core', 'choiceNodes.ts'), 'utf8');
    expect(src).not.toMatch(/new\s+Date|Date\.now|Date\.parse|toLocaleDateString|toISOString|performance\.now/);
  });

  it('the module imports no runtime dependency beyond the ledger\u2019s visibility type', () => {
    // the register is data — its only import is a type import. The grep
    // pins the seam: no Game, no world, no sim imports can creep in.
    const src = readFileSync(join(REPO_ROOT, 'web-three', 'src', 'core', 'choiceNodes.ts'), 'utf8');
    expect(src).not.toMatch(/^import\s+(?!type)\{/m);
    expect(src).not.toMatch(/from\s+['"](\.\.\/)?(game|world|sim)\//);
  });
});

describe('choice options — signature helpers (the validator\u2019s teeth)', () => {
  it('flagSignatureOf sorts the downstream keys — order never hides convergence', () => {
    const n1b = nodeById('N1b')!;
    const cook = n1b.options.find((o) => o.id === 'cook')!;
    expect(flagSignatureOf(cook)).toBe('c2-invites=cook|c4-face-capital=cook');
    const reordered: ChoiceOption = { ...cook, flagWrites: [...cook.flagWrites].reverse() };
    expect(flagSignatureOf(reordered)).toBe(flagSignatureOf(cook));
  });

  it('ledgerSignatureOf sorts kinds and refs — and the empty write is a signature', () => {
    const n3c = nodeById('N3c')!;
    const tell = n3c.options.find((o) => o.id === 'tell-eddie')!;
    const silence = n3c.options.find((o) => o.id === 'not-tell')!;
    expect(ledgerSignatureOf(silence)).toBe('');
    expect(ledgerSignatureOf(tell)).not.toBe('');
    expect(ledgerSignatureOf(tell)).toContain('choice:');
  });
});
