/**
 * The choice nodes — narrative/14 R7 + narrative/10 §3 (WP-5).
 *
 * The register in doc 10 §3 is the data source: seventeen major decision
 * nodes, N0 through N7, encoded here as authored data — ids, chapters and
 * option names verbatim from the register table. The schema is doc 14 §2's
 * starter ("subject to engineering taste within the contract"):
 *
 *   ChoiceNode { id, options[], locks[], ledgerWrites[], flagWrites[] }
 *
 * with the writes held PER OPTION (that is where divergence lives) and the
 * locks at node level (chapter gating is R1/R8's machinery — the register
 * currently authors none, and the field stays empty until that WP).
 *
 * **The no-fake-choices rule is a test** (doc 10 §3; doc 14 R7): "every
 * structural node above diverges in ledger terms. If a build ships a
 * structural node that converges, it is a canon bug (doc 15)." Each
 * structural option's downstream signature — its flag writes + ledger
 * writes, canonically serialized — must be unique within its node.
 * `validateNoFakeChoices` is that law as a function;
 * tests/choice-nodes.test.ts pins it against the register and against a
 * forged converging node.
 *
 * The flag KEYS are this module's engineering artifact (the join future
 * WPs read: rails R1, independence R5, the C5 cascade); the VALUES are the
 * register's own option words, slugified. Nothing here invents canon —
 * where the register defers a node's options to another table (N3b's 19
 * investor slots → doc 09 §4), the node is encoded with an empty option
 * list and a note, and the test pins the note so the deferral cannot be
 * silently forgotten.
 *
 * Pure state, zero DOM. Nothing here touches Game.ts, world/* or
 * sim/state.ts (WP-5's assignment law).
 */

import type { LedgerKind, LedgerVisibility } from './consequenceLedger';

/** One downstream flag write: the node's subject key, the option's value. */
export interface FlagWrite {
  key: string;
  value: string | number | boolean;
}

/** One ledger write an option performs when taken. Structural options
 *  write their `choice` entry (refs point at the node); weights stay at
 *  1 — the coin that matters is the omission's, and it is authored on
 *  the promise (doc 10 §1). */
export interface LedgerWrite {
  entryId: string;
  kind: LedgerKind;
  refs: string[];
  weight: number;
  visibility: LedgerVisibility;
}

/** One option on a node. `locks` are per-option gating conditions
 *  (authored later, with R1/R8 — the register authors none today). */
export interface ChoiceOption {
  id: string;
  label: string;
  locks: string[];
  ledgerWrites: LedgerWrite[];
  flagWrites: FlagWrite[];
}

/** One decision node (doc 10 §3's register row, as data). */
export interface ChoiceNode {
  id: string;
  chapter: 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'OPEN';
  /** The register's "The choice" column. */
  title: string;
  /** Structural nodes must diverge (the no-fake-choices law); flavor
   *  nodes may converge only "when the meaning genuinely doesn't differ"
   *  (doc 10 §3). */
  structural: boolean;
  options: ChoiceOption[];
  /** Node-level locks (chapter gating, R1/R8's machinery). */
  locks: string[];
  /** Where the register defers or annotates, the doc's own words. */
  note?: string;
}

const PV: LedgerVisibility = 'private';

/** Helper — the one choice-ledger write a structural option makes. */
function choiceWrite(nodeId: string, optionId: string): LedgerWrite[] {
  return [{
    entryId: `choice/${nodeId}/${optionId}`,
    kind: 'choice',
    refs: [nodeId],
    weight: 1,
    visibility: PV,
  }];
}

/** Helper — one flag on the node's subject, value = the option's marker. */
function flag(key: string, value: string): FlagWrite[] {
  return [{ key, value }];
}

/** Helper — one structural option, verbatim label, unique signature. */
function opt(nodeId: string, optionId: string, label: string, flagKey: string, value: string): ChoiceOption {
  return {
    id: optionId,
    label,
    locks: [],
    ledgerWrites: choiceWrite(nodeId, optionId),
    flagWrites: flag(flagKey, value),
  };
}

// ---- the register (doc 10 §3, N0–N7 — seventeen rows, verbatim) ----

export const CHOICE_NODES: readonly ChoiceNode[] = [
  {
    id: 'N0', chapter: 'C0', title: "The diary's first entry", structural: true, locks: [],
    note: '3 authored prompts + free write; the prompts themselves are the C0 pack (doc 11, narrative/14 §7 step 6).',
    options: [
      opt('N0', 'prompt-1', 'authored prompt 1 (doc 11)', 'voice_seed', 'prompt-1'),
      opt('N0', 'prompt-2', 'authored prompt 2 (doc 11)', 'voice_seed', 'prompt-2'),
      opt('N0', 'prompt-3', 'authored prompt 3 (doc 11)', 'voice_seed', 'prompt-3'),
      opt('N0', 'free-write', 'free write', 'voice_seed', 'free-write'),
    ],
  },
  {
    id: 'N1a', chapter: 'C1', title: 'The promise to Eddie', structural: true, locks: [],
    options: [
      opt('N1a', 'honest-odds', 'honest odds', 'eddie_path', 'honest-odds'),
      opt('N1a', 'quiet-research', 'quiet research', 'eddie_path', 'quiet-research'),
      opt('N1a', 'direct-approach', 'direct approach', 'eddie_path', 'direct-approach'),
    ],
  },
  {
    id: 'N1b', chapter: 'C1', title: 'Blackout role', structural: true, locks: [],
    options: [
      opt('N1b', 'cook', 'cook', 'blackout_role', 'cook'),
      opt('N1b', 'run-the-room', 'run the room', 'blackout_role', 'run-the-room'),
      opt('N1b', 'hide-and-rest', 'hide & rest', 'blackout_role', 'hide-and-rest'),
    ],
  },
  {
    id: 'N2', chapter: 'C2', title: 'The Compact', structural: true, locks: [],
    note: 'D refuse — the rail fires later in other clothes (doc 10 §3; doc 08 §3).',
    options: [
      opt('N2', 'a-pull-out', 'A pull-out', 'compact', 'a-pull-out'),
      opt('N2', 'b-courier', 'B courier', 'compact', 'b-courier'),
      opt('N2', 'c-information-trade', 'C information-trade', 'compact', 'c-information-trade'),
      opt('N2', 'd-refuse', 'D refuse', 'compact', 'd-refuse'),
    ],
  },
  {
    id: 'N2b', chapter: 'C2', title: 'The Oktay moment', structural: true, locks: [],
    options: [
      opt('N2b', 'carry', 'carry', 'oktay', 'carry'),
      opt('N2b', 'reference', 'reference', 'oktay', 'reference'),
      opt('N2b', 'stay-at-shop', 'stay at shop', 'oktay', 'stay-at-shop'),
    ],
  },
  {
    id: 'N3a', chapter: 'C3', title: "Marisol's offer", structural: true, locks: [],
    options: [
      opt('N3a', 'accept', 'accept', 'the_face', 'accept'),
      opt('N3a', 'defer', 'defer', 'the_face', 'defer'),
      opt('N3a', 'refuse', 'refuse', 'the_face', 'refuse'),
    ],
  },
  {
    id: 'N3b', chapter: 'C3', title: 'The investor list', structural: true, locks: [],
    note: '19 slots, authored candidates — the options are supplied by the candidate table (doc 09 §4), not the register.',
    options: [],
  },
  {
    id: 'N3c', chapter: 'C3', title: "Gino's lunch", structural: true, locks: [],
    options: [
      opt('N3c', 'tell-eddie', 'tell Eddie', 'gino_told', 'true'),
      opt('N3c', 'not-tell', 'not tell', 'gino_told', 'false'),
    ],
  },
  {
    id: 'N4a', chapter: 'C4', title: 'The jobs number', structural: true, locks: [],
    options: [
      opt('N4a', 'correct', 'correct', 'jobs_number', 'correct'),
      opt('N4a', 'let-fly', 'let fly', 'jobs_number', 'let-fly'),
      opt('N4a', 'self-leak', 'self-leak', 'jobs_number', 'self-leak'),
    ],
  },
  {
    id: 'N4b', chapter: 'C4', title: 'June after discovery', structural: true, locks: [],
    options: [
      opt('N4b', 'full-disclosure', 'full disclosure', 'june', 'full-disclosure'),
      opt('N4b', 'partial', 'partial', 'june', 'partial'),
      opt('N4b', 'move-out', 'move out', 'june', 'move-out'),
    ],
  },
  {
    id: 'N4c', chapter: 'C4', title: 'The El Vann papers', structural: true, locks: [],
    options: [
      opt('N4c', 'return', 'return', 'el_vann', 'return'),
      opt('N4c', 'copy', 'copy', 'el_vann', 'copy'),
      opt('N4c', 'locate-for-yoli', 'locate for Yoli', 'el_vann', 'locate-for-yoli'),
    ],
  },
  {
    id: 'N4d', chapter: 'C4', title: "The 2 a.m. scene's morning", structural: true, locks: [],
    options: [
      opt('N4d', 'therapy', 'therapy', 'dr_feld', 'therapy'),
      opt('N4d', 'defer', 'defer', 'dr_feld', 'defer'),
      opt('N4d', 'never', 'never', 'dr_feld', 'never'),
    ],
  },
  {
    id: 'N5a', chapter: 'C5', title: 'Settle or fight', structural: true, locks: [],
    options: [
      opt('N5a', 'settle', 'settle', 'settle_or_fight', 'settle'),
      opt('N5a', 'fight-and-lose-more', 'fight-and-lose-more', 'settle_or_fight', 'fight-and-lose-more'),
    ],
  },
  {
    id: 'N5b', chapter: 'C5', title: 'The plan', structural: true, locks: [],
    options: [
      opt('N5b', 'ledger-pace', 'ledger pace', 'the_plan', 'ledger-pace'),
      opt('N5b', 'diner-and-ledger', 'diner+ledger', 'the_plan', 'diner-and-ledger'),
      opt('N5b', 'charlotte-floor', 'Charlotte floor', 'the_plan', 'charlotte-floor'),
    ],
  },
  {
    id: 'N5c', chapter: 'C5', title: 'Tell the block', structural: true, locks: [],
    options: [
      opt('N5c', 'garden-reckoning', 'garden reckoning', 'tell_the_block', 'garden-reckoning'),
      opt('N5c', 'statement', 'statement', 'tell_the_block', 'statement'),
      opt('N5c', 'silence', 'silence', 'tell_the_block', 'silence'),
    ],
  },
  {
    id: 'N6', chapter: 'C6', title: 'The Marisol test', structural: true, locks: [],
    options: [
      opt('N6', 'accept', 'accept', 'marisol_test', 'accept'),
      opt('N6', 'decline', 'decline', 'marisol_test', 'decline'),
      opt('N6', 'decline-and-warn', 'decline-and-warn', 'marisol_test', 'decline-and-warn'),
    ],
  },
  {
    id: 'N7', chapter: 'C6', title: 'Testimony at the hearing', structural: true, locks: [],
    options: [
      opt('N7', 'testify', 'testify', 'testimony', 'testify'),
      opt('N7', 'refuse', 'refuse', 'testimony', 'refuse'),
      opt('N7', 'wexler-file', 'the Wexler file', 'testimony', 'wexler-file'),
    ],
  },
];

/** The node's id in the register, or undefined. Pure lookup. */
export function choiceNode(id: string): ChoiceNode | undefined {
  return CHOICE_NODES.find((n) => n.id === id);
}

/** The option's downstream FLAG signature (doc 14 R7: "each structural
 *  option's downstream flag signature must be unique") — the flag writes,
 *  canonically serialized. Deterministic and pure. Ledger entry ids are
 *  deliberately NOT part of the signature: a per-option choice entry is
 *  minted by construction (`choice/<node>/<option>`), so counting it as
 *  divergence would let every fake choice pass — the exact loophole the
 *  law exists to close. The world's downstream state is the flags. */
export function flagSignature(option: ChoiceOption): string {
  return [...option.flagWrites]
    .map((f) => `${f.key}=${String(f.value)}`)
    .sort()
    .join(';');
}

export interface FakeChoiceAudit {
  ok: boolean;
  /** `<node>/<optionA>` ≅ `<node>/<optionB>` — the canon bug, named. */
  violations: string[];
  /** Structural nodes with fewer than two authored options (deferrals
   *  like N3b) — legal, listed so the scan is honest about what it saw. */
  deferred: string[];
}

/** The no-fake-choices law, as a function (doc 10 §3; doc 14 R7): every
 *  structural node with ≥2 authored options must have pairwise-unique
 *  downstream signatures, unique option ids, and exactly one choice-ledger
 *  write per option. Convergence on a structural node is a canon bug. */
export function validateNoFakeChoices(nodes: readonly ChoiceNode[]): FakeChoiceAudit {
  const violations: string[] = [];
  const deferred: string[] = [];
  for (const node of nodes) {
    if (!node.structural) continue;
    if (node.options.length < 2) { deferred.push(node.id); continue; }
    const ids = new Set<string>();
    for (const o of node.options) {
      if (ids.has(o.id)) violations.push(`${node.id}: duplicate option id ${o.id}`);
      ids.add(o.id);
      const choices = o.ledgerWrites.filter((w) => w.kind === 'choice');
      if (choices.length !== 1) {
        violations.push(`${node.id}/${o.id}: ${choices.length} choice ledger writes (the law says exactly one)`);
      }
    }
    for (let i = 0; i < node.options.length; i++) {
      for (let j = i + 1; j < node.options.length; j++) {
        if (flagSignature(node.options[i]) === flagSignature(node.options[j])) {
          violations.push(`${node.id}/${node.options[i].id} ≅ ${node.id}/${node.options[j].id}`);
        }
      }
    }
  }
  return { ok: violations.length === 0, violations, deferred };
}
