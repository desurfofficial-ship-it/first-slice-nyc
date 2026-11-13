/**
 * The choice-node register — narrative/14 R7 + narrative/10 §3.
 *
 * Doc 10 §3's major-decision table is the data source: seventeen
 * structural nodes (N0…N7) across C0–C6, each with its authored options,
 * immediate effect and downstream. This module transcribes that table as
 * data and pins the bible's honesty rule — **the no-fake-choices rule is
 * a test** (doc 10 §3): "Every structural node above diverges in ledger
 * terms. If a build ships a structural node that converges, it is a
 * canon bug (doc 15)." Doc 14 §6 makes the rule a permanent guard, so
 * `validateRegister` runs over the shipped register in the test suite:
 * any structural node whose options converge on the same downstream flag
 * signature fails the build before it can ship a fake choice.
 *
 * Schema note (doc 14 §2's starter is "subject to engineering taste
 * within the contract"): the starter sketch holds `ledgerWrites` /
 * `flagWrites` / `locks` at node level, but doc 10 §3's table diverges
 * per option — the register therefore carries them per option, and the
 * mechanical selection pivot (`node:<id>=<optionId>`, how the save
 * remembers the pick — doc 15 §5.3's no-retcon rule) is added by
 * `resolveChoice`, never stored.
 *
 * What this module deliberately is NOT: the scene machinery. The nodes
 * are state ahead of their content (doc 14 §7 step 2) — N3b's nineteen
 * slots are authored faces in C3's content pack (doc 09 §4), the
 * locks' flags are wired by the chapter machinery (R1/R8). Nothing here
 * reads a clock, touches the DOM, or mutates anything.
 *
 * Pure state, zero imports beyond types — the register is data (the
 * content-seam law; same posture as core/fieldDiary.ts).
 */

import type { LedgerVisibility } from './consequenceLedger';

/** The ledger acts a taken option posts (R2's kinds, minus `omission`:
 *  an omission is never authored at a node — it matures from a promise
 *  (core/consequenceLedger.ts) or is authored by the Silent class outside
 *  the register, doc 10 §1). `refs` name the act's objects (charIds,
 *  place ids, the act itself as `<nodeId>:<optionId>`); date, weight and
 *  id are filled at resolution time by the chapter machinery — content
 *  owns timing and coin, the register owns divergence. */
export interface LedgerWriteSpec {
  kind: 'choice' | 'promise' | 'amends';
  refs: readonly string[];
  visibility: LedgerVisibility;
}

/** One authored option of a structural node. `label` quotes doc 10 §3's
 *  option column; `immediate` and `downstream` quote its Immediate and
 *  Downstream columns verbatim (the canon source of this data).
 *  `flagWrites` are the machine keys the option writes downstream — one
 *  per downstream dimension, valued by the taken option; the no-fake-
 * choices test demands they differ pairwise within a node. */
export interface ChoiceOption {
  id: string;
  label: string;
  immediate: string;
  downstream: string;
  flagWrites: readonly string[];
  ledgerWrites: readonly LedgerWriteSpec[];
  /** Flag keys that must be held for this option to be offered — doc 10
   *  §4's expiry law lives here (e.g. N2's Form C dies with Yoli's
   *  strategy session). Empty when the doc names no lock. */
  locks: readonly string[];
}

/** One structural decision node (doc 10 §3's register). Flavor nodes
 *  (doc 10 §3: "which stall, which mug") never enter the register —
 *  only choices whose options diverge in ledger terms. */
export interface ChoiceNode {
  id: string;
  chapter: 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';
  title: string;
  options: readonly ChoiceOption[];
}

// ---- the register (doc 10 §3, transcribed — 17 nodes) ----
// Each option's flagWrites follow one mechanical scheme: a machine key
// per downstream dimension in the doc's Downstream column, valued with
// the option id (`<dimension>=<option>`). The dimension names are
// plumbing, not prose — the canon text stays in `downstream`, quoted
// verbatim. The act-reference `<nodeId>:<optionId>` rides every
// ledgerWrite's refs so the cascade can trace a consequence to its node.

function choice(refs: string[], visibility: LedgerVisibility): LedgerWriteSpec[] {
  return [{ kind: 'choice', refs, visibility }];
}

const NODES: ChoiceNode[] = [
  {
    id: 'N0', chapter: 'C0', title: 'The diary\u2019s first entry',
    options: [
      { id: 'prompt-1', label: 'authored prompt 1', immediate: 'Voice seed',
        downstream: 'Diary voice bias (doc 03 \u00a76)',
        flagWrites: ['diary-voice-bias=prompt-1'],
        ledgerWrites: choice(['diary', 'N0:prompt-1'], 'private'), locks: [] },
      { id: 'prompt-2', label: 'authored prompt 2', immediate: 'Voice seed',
        downstream: 'Diary voice bias (doc 03 \u00a76)',
        flagWrites: ['diary-voice-bias=prompt-2'],
        ledgerWrites: choice(['diary', 'N0:prompt-2'], 'private'), locks: [] },
      { id: 'prompt-3', label: 'authored prompt 3', immediate: 'Voice seed',
        downstream: 'Diary voice bias (doc 03 \u00a76)',
        flagWrites: ['diary-voice-bias=prompt-3'],
        ledgerWrites: choice(['diary', 'N0:prompt-3'], 'private'), locks: [] },
      { id: 'free-write', label: 'free write', immediate: 'Voice seed',
        downstream: 'Diary voice bias (doc 03 \u00a76)',
        flagWrites: ['diary-voice-bias=free-write'],
        ledgerWrites: choice(['diary', 'N0:free-write'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N1a', chapter: 'C1', title: 'The promise to Eddie',
    options: [
      { id: 'honest-odds', label: 'honest-odds', immediate: 'Eddie\u2019s trust path',
        downstream: 'C2\u2019s information position',
        flagWrites: ['c2-information-position=honest-odds'],
        ledgerWrites: [{ kind: 'promise', refs: ['eddie', 'N1a:honest-odds'], visibility: 'private' }],
        locks: [] },
      { id: 'quiet-research', label: 'quiet-research', immediate: 'Eddie\u2019s trust path',
        downstream: 'C2\u2019s information position',
        flagWrites: ['c2-information-position=quiet-research'],
        ledgerWrites: [{ kind: 'promise', refs: ['eddie', 'N1a:quiet-research'], visibility: 'private' }],
        locks: [] },
      { id: 'direct-approach', label: 'direct approach', immediate: 'Eddie\u2019s trust path',
        downstream: 'C2\u2019s information position',
        flagWrites: ['c2-information-position=direct-approach'],
        ledgerWrites: [{ kind: 'promise', refs: ['eddie', 'N1a:direct-approach'], visibility: 'private' }],
        locks: [] },
    ],
  },
  {
    id: 'N1b', chapter: 'C1', title: 'Blackout role',
    options: [
      { id: 'cook', label: 'cook', immediate: 'The block\u2019s seeing',
        downstream: 'C2 invites; C4\u2019s \u201cface\u201d capital',
        flagWrites: ['c2-invites=cook', 'c4-face-capital=cook'],
        ledgerWrites: choice(['the-block', 'N1b:cook'], 'private'), locks: [] },
      { id: 'run-the-room', label: 'run the room', immediate: 'The block\u2019s seeing',
        downstream: 'C2 invites; C4\u2019s \u201cface\u201d capital',
        flagWrites: ['c2-invites=run-the-room', 'c4-face-capital=run-the-room'],
        ledgerWrites: choice(['the-block', 'N1b:run-the-room'], 'private'), locks: [] },
      { id: 'hide-and-rest', label: 'hide & rest', immediate: 'The block\u2019s seeing',
        downstream: 'C2 invites; C4\u2019s \u201cface\u201d capital',
        flagWrites: ['c2-invites=hide-and-rest', 'c4-face-capital=hide-and-rest'],
        ledgerWrites: choice(['the-block', 'N1b:hide-and-rest'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N2', chapter: 'C2', title: 'The Compact',
    options: [
      { id: 'pull-out', label: 'A \u2014 pull-out', immediate: 'Lease; Yoli; Deniz\u2019s receipts\u2019 contents',
        downstream: 'Doc 08 \u00a73; the fall\u2019s trigger-2 weight',
        flagWrites: ['compact-form=A', 'fall-trigger-2-weight=A'],
        ledgerWrites: choice(['compact', 'corvus', 'N2:pull-out'], 'private'), locks: [] },
      { id: 'courier', label: 'B \u2014 courier', immediate: 'Lease; Yoli; Deniz\u2019s receipts\u2019 contents',
        downstream: 'Doc 08 \u00a73; the fall\u2019s trigger-2 weight',
        flagWrites: ['compact-form=B', 'fall-trigger-2-weight=B'],
        ledgerWrites: choice(['compact', 'corvus', 'N2:courier'], 'private'), locks: [] },
      { id: 'information-trade', label: 'C \u2014 information-trade', immediate: 'Lease; Yoli; Deniz\u2019s receipts\u2019 contents',
        downstream: 'Doc 08 \u00a73; the fall\u2019s trigger-2 weight',
        flagWrites: ['compact-form=C', 'fall-trigger-2-weight=C'],
        ledgerWrites: choice(['compact', 'corvus', 'N2:information-trade'], 'private'),
        locks: ['yoli-strategy-session'] },
      { id: 'refuse', label: 'D \u2014 refuse (rail fires later in other clothes)', immediate: 'Lease; Yoli; Deniz\u2019s receipts\u2019 contents',
        downstream: 'Doc 08 \u00a73; the fall\u2019s trigger-2 weight',
        flagWrites: ['compact-form=D', 'fall-trigger-2-weight=D'],
        ledgerWrites: choice(['compact', 'corvus', 'N2:refuse'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N2b', chapter: 'C2', title: 'The Oktay moment',
    options: [
      { id: 'carry', label: 'carry', immediate: 'One scene\u2019s warmth',
        downstream: 'The deposition\u2019s tone (C5/C6)',
        flagWrites: ['deposition-tone=carry'],
        ledgerWrites: choice(['deniz', 'N2b:carry'], 'private'), locks: [] },
      { id: 'reference', label: 'reference', immediate: 'One scene\u2019s warmth',
        downstream: 'The deposition\u2019s tone (C5/C6)',
        flagWrites: ['deposition-tone=reference'],
        ledgerWrites: choice(['deniz', 'N2b:reference'], 'private'), locks: [] },
      { id: 'stay-at-shop', label: 'stay at shop', immediate: 'One scene\u2019s warmth',
        downstream: 'The deposition\u2019s tone (C5/C6)',
        flagWrites: ['deposition-tone=stay-at-shop'],
        ledgerWrites: choice(['deniz', 'N2b:stay-at-shop'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N3a', chapter: 'C3', title: 'Marisol\u2019s offer',
    options: [
      { id: 'accept', label: 'accept', immediate: 'The Face begins or waits',
        downstream: 'R3\u2019s depth; C4\u2019s press exposure',
        flagWrites: ['r3-depth=accept', 'c4-press-exposure=accept'],
        ledgerWrites: choice(['marisol', 'N3a:accept'], 'private'), locks: [] },
      { id: 'defer', label: 'defer', immediate: 'The Face begins or waits',
        downstream: 'R3\u2019s depth; C4\u2019s press exposure',
        flagWrites: ['r3-depth=defer', 'c4-press-exposure=defer'],
        ledgerWrites: choice(['marisol', 'N3a:defer'], 'private'), locks: [] },
      { id: 'refuse', label: 'refuse', immediate: 'The Face begins or waits',
        downstream: 'R3\u2019s depth; C4\u2019s press exposure',
        flagWrites: ['r3-depth=refuse', 'c4-press-exposure=refuse'],
        ledgerWrites: choice(['marisol', 'N3a:refuse'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N3b', chapter: 'C3', title: 'The investor list',
    options: Array.from({ length: 19 }, (_, i) => {
      const slot = `slot-${String(i + 1).padStart(2, '0')}`;
      return {
        id: slot, label: `investor slot ${i + 1} (authored candidate, doc 09 \u00a74)`,
        immediate: 'The Club\u2019s money',
        downstream: 'Doc 09 \u00a74\u2019s face-by-face fall',
        // the fall differs by the face asked — the slot is the divergence
        flagWrites: [`investor-slot=${slot}`],
        ledgerWrites: choice(['juniper-club', `N3b:${slot}`], 'private'),
        locks: [],
      };
    }),
  },
  {
    id: 'N3c', chapter: 'C3', title: 'Gino\u2019s lunch',
    options: [
      { id: 'tell-eddie', label: 'tell Eddie', immediate: 'One entry omitted',
        downstream: 'Trigger 4 exists or not',
        flagWrites: ['trigger-4=exists'],
        ledgerWrites: choice(['gino', 'eddie', 'N3c:tell-eddie'], 'private'), locks: [] },
      { id: 'not-tell', label: 'not tell', immediate: 'One entry omitted',
        downstream: 'Trigger 4 exists or not',
        flagWrites: ['trigger-4=absent'],
        // the not-tell is the Silent class (doc 10 §1): nothing posts at
        // the decision — the omission exists by absence. The divergence
        // from 'tell-eddie' is the missing entry itself.
        ledgerWrites: [], locks: [] },
    ],
  },
  {
    id: 'N4a', chapter: 'C4', title: 'The jobs number',
    options: [
      { id: 'correct', label: 'correct', immediate: 'Kev\u2019s exposure',
        downstream: 'Trigger 2\u2019s content',
        flagWrites: ['trigger-2-content=correct'],
        ledgerWrites: choice(['kev', 'N4a:correct'], 'private'), locks: [] },
      { id: 'let-fly', label: 'let fly', immediate: 'Kev\u2019s exposure',
        downstream: 'Trigger 2\u2019s content',
        flagWrites: ['trigger-2-content=let-fly'],
        ledgerWrites: choice(['kev', 'N4a:let-fly'], 'private'), locks: [] },
      { id: 'self-leak', label: 'self-leak', immediate: 'Kev\u2019s exposure',
        downstream: 'Trigger 2\u2019s content',
        flagWrites: ['trigger-2-content=self-leak'],
        ledgerWrites: choice(['kev', 'N4a:self-leak'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N4b', chapter: 'C4', title: 'June after discovery',
    options: [
      { id: 'full-disclosure', label: 'full disclosure', immediate: 'One door stays open',
        downstream: 'Doc 07 \u00a72.5\u2019s conditions',
        flagWrites: ['june-conditions=full-disclosure'],
        ledgerWrites: choice(['june', 'N4b:full-disclosure'], 'private'), locks: [] },
      { id: 'partial', label: 'partial', immediate: 'One door stays open',
        downstream: 'Doc 07 \u00a72.5\u2019s conditions',
        flagWrites: ['june-conditions=partial'],
        ledgerWrites: choice(['june', 'N4b:partial'], 'private'), locks: [] },
      { id: 'move-out', label: 'move out', immediate: 'One door stays open',
        downstream: 'Doc 07 \u00a72.5\u2019s conditions',
        flagWrites: ['june-conditions=move-out'],
        ledgerWrites: choice(['june', 'N4b:move-out'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N4c', chapter: 'C4', title: 'The El Vann papers',
    options: [
      { id: 'return', label: 'return', immediate: 'Knowledge custody',
        downstream: 'Trigger 1\u2019s strength; C6 concessions\u2019 size',
        flagWrites: ['trigger-1-strength=return', 'c6-concessions-size=return'],
        ledgerWrites: choice(['el-vann', 'N4c:return'], 'private'), locks: [] },
      { id: 'copy', label: 'copy', immediate: 'Knowledge custody',
        downstream: 'Trigger 1\u2019s strength; C6 concessions\u2019 size',
        flagWrites: ['trigger-1-strength=copy', 'c6-concessions-size=copy'],
        ledgerWrites: choice(['el-vann', 'N4c:copy'], 'private'), locks: [] },
      { id: 'locate-for-yoli', label: 'locate-for-Yoli', immediate: 'Knowledge custody',
        downstream: 'Trigger 1\u2019s strength; C6 concessions\u2019 size',
        flagWrites: ['trigger-1-strength=locate-for-yoli', 'c6-concessions-size=locate-for-yoli'],
        ledgerWrites: choice(['el-vann', 'yoli', 'N4c:locate-for-yoli'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N4d', chapter: 'C4', title: 'The 2 a.m. scene\u2019s morning',
    options: [
      { id: 'therapy', label: 'therapy', immediate: 'Dr. Feld thread',
        downstream: 'C6\u2019s condition-handle; the self-portrait\u2019s honesty',
        flagWrites: ['c6-condition-handle=therapy', 'self-portrait-honesty=therapy'],
        ledgerWrites: choice(['dr-feld', 'N4d:therapy'], 'private'), locks: [] },
      { id: 'defer', label: 'defer', immediate: 'Dr. Feld thread',
        downstream: 'C6\u2019s condition-handle; the self-portrait\u2019s honesty',
        flagWrites: ['c6-condition-handle=defer', 'self-portrait-honesty=defer'],
        ledgerWrites: choice(['dr-feld', 'N4d:defer'], 'private'), locks: [] },
      { id: 'never', label: 'never', immediate: 'Dr. Feld thread',
        downstream: 'C6\u2019s condition-handle; the self-portrait\u2019s honesty',
        flagWrites: ['c6-condition-handle=never', 'self-portrait-honesty=never'],
        // the thread never opens — nothing posts; the divergence from
        // 'therapy' is the missing entry itself (the Silent class again)
        ledgerWrites: [], locks: [] },
    ],
  },
  {
    id: 'N5a', chapter: 'C5', title: 'Settle or fight',
    options: [
      { id: 'settle', label: 'settle', immediate: 'The legal shape',
        downstream: 'Restitution size (\u00b1$6K)',
        flagWrites: ['restitution-size=settle'],
        ledgerWrites: choice(['restitution', 'N5a:settle'], 'private'), locks: [] },
      { id: 'fight-and-lose-more', label: 'fight-and-lose-more', immediate: 'The legal shape',
        downstream: 'Restitution size (\u00b1$6K)',
        flagWrites: ['restitution-size=fight-and-lose-more'],
        ledgerWrites: choice(['restitution', 'N5a:fight-and-lose-more'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N5b', chapter: 'C5', title: 'The plan',
    options: [
      { id: 'ledger-pace', label: 'ledger pace', immediate: 'The map\u2019s shape',
        downstream: 'C6\u2019s first chapter',
        flagWrites: ['c6-first-chapter=ledger-pace'],
        ledgerWrites: choice(['the-plan', 'N5b:ledger-pace'], 'private'), locks: [] },
      { id: 'diner-plus-ledger', label: 'diner+ledger', immediate: 'The map\u2019s shape',
        downstream: 'C6\u2019s first chapter',
        flagWrites: ['c6-first-chapter=diner-plus-ledger'],
        ledgerWrites: choice(['the-plan', 'N5b:diner-plus-ledger'], 'private'), locks: [] },
      { id: 'charlotte-floor', label: 'Charlotte floor', immediate: 'The map\u2019s shape',
        downstream: 'C6\u2019s first chapter',
        flagWrites: ['c6-first-chapter=charlotte-floor'],
        ledgerWrites: choice(['the-plan', 'N5b:charlotte-floor'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N5c', chapter: 'C5', title: 'Tell the block',
    options: [
      { id: 'garden-reckoning', label: 'garden reckoning', immediate: 'Yoli\u2019s door; the block\u2019s pricing',
        downstream: 'C6\u2019s standing everywhere',
        flagWrites: ['c6-standing=garden-reckoning'],
        // a reckoning held in the garden is public — the gossip physics
        // carries it (doc 10 §6), so the act posts shared
        ledgerWrites: choice(['the-block', 'yoli', 'N5c:garden-reckoning'], 'shared'), locks: [] },
      { id: 'statement', label: 'statement', immediate: 'Yoli\u2019s door; the block\u2019s pricing',
        downstream: 'C6\u2019s standing everywhere',
        flagWrites: ['c6-standing=statement'],
        ledgerWrites: choice(['the-block', 'yoli', 'N5c:statement'], 'shared'), locks: [] },
      { id: 'silence', label: 'silence', immediate: 'Yoli\u2019s door; the block\u2019s pricing',
        downstream: 'C6\u2019s standing everywhere',
        flagWrites: ['c6-standing=silence'],
        // silence posts nothing — the block's verdicts arrive cold and
        // unannounced (doc 10 §4), which is the divergence itself
        ledgerWrites: [], locks: [] },
    ],
  },
  {
    id: 'N6', chapter: 'C6', title: 'The Marisol test',
    options: [
      { id: 'accept', label: 'accept', immediate: 'A life branch',
        downstream: 'The self-portrait\u2019s raw material',
        flagWrites: ['self-portrait-raw-material=accept'],
        ledgerWrites: choice(['marisol', 'N6:accept'], 'private'), locks: [] },
      { id: 'decline', label: 'decline', immediate: 'A life branch',
        downstream: 'The self-portrait\u2019s raw material',
        flagWrites: ['self-portrait-raw-material=decline'],
        ledgerWrites: choice(['marisol', 'N6:decline'], 'private'), locks: [] },
      { id: 'decline-and-warn', label: 'decline-and-warn', immediate: 'A life branch',
        downstream: 'The self-portrait\u2019s raw material',
        flagWrites: ['self-portrait-raw-material=decline-and-warn'],
        ledgerWrites: choice(['marisol', 'N6:decline-and-warn'], 'private'), locks: [] },
    ],
  },
  {
    id: 'N7', chapter: 'C6', title: 'Testimony at the hearing',
    options: [
      { id: 'testify', label: 'testify', immediate: 'The concessions; the last exam',
        downstream: 'The epilogue\u2019s taste',
        // the hearing is a public record
        flagWrites: ['epilogue-taste=testify'],
        ledgerWrites: choice(['hearing', 'N7:testify'], 'shared'), locks: [] },
      { id: 'refuse', label: 'refuse', immediate: 'The concessions; the last exam',
        downstream: 'The epilogue\u2019s taste',
        flagWrites: ['epilogue-taste=refuse'],
        ledgerWrites: choice(['hearing', 'N7:refuse'], 'shared'), locks: [] },
      { id: 'the-wexler-file', label: 'the Wexler file', immediate: 'The concessions; the last exam',
        downstream: 'The epilogue\u2019s taste',
        // the file changes hands privately — custody, not a public act
        flagWrites: ['epilogue-taste=the-wexler-file'],
        ledgerWrites: choice(['hearing', 'wexler', 'N7:the-wexler-file'], 'private'), locks: [] },
    ],
  },
];

// ---- the exported register (read-only by construction) ----

/** Doc 10 §3's register, in table order. Frozen — the register is canon
 *  data; nothing at runtime edits it (amendments are docs, not code). */
export const CHOICE_NODES: readonly ChoiceNode[] = Object.freeze(
  NODES.map((n) => Object.freeze({
    ...n,
    options: Object.freeze(n.options.map((o) => Object.freeze({ ...o }))),
  })),
);

/** The register's node ids, order preserved (the doc-10-§3 coverage law). */
export const CHOICE_NODE_IDS: readonly string[] = Object.freeze(CHOICE_NODES.map((n) => n.id));

/** Look up a node by id (pure; undefined when absent). */
export function nodeById(id: string): ChoiceNode | undefined {
  return CHOICE_NODES.find((n) => n.id === id);
}

// ---- the no-fake-choices law (doc 10 §3), as a validator ----

export interface RegisterReport {
  ok: boolean;
  /** Empty when ok — otherwise one line per violation, machine-readable
   *  for the test and for any future content-pack validator. */
  problems: string[];
}

/** The flag signature of an option: its downstream machine keys, sorted —
 *  the pivot is deliberately excluded (it is unique by construction and
 *  would make this check a tautology). */
export function flagSignatureOf(option: ChoiceOption): string {
  return [...option.flagWrites].sort().join('|');
}

/** The ledger signature of an option: the kinds and refs it posts,
 *  sorted — an empty write is a signature too (the Silent class: the
 *  divergence IS the missing entry, doc 10 §1). */
export function ledgerSignatureOf(option: ChoiceOption): string {
  return option.ledgerWrites
    .map((w) => `${w.kind}:${[...w.refs].sort().join(',')}`)
    .sort()
    .join(';');
}

/** Validate a register against the no-fake-choices law and the register's
 *  own shape. Pure; never throws; the shipped register must pass (the
 *  test suite runs it at build time — doc 14 §6's permanent guard). */
export function validateRegister(register: readonly ChoiceNode[] = CHOICE_NODES): RegisterReport {
  const problems: string[] = [];
  const seenIds = new Set<string>();
  for (const node of register) {
    if (!/^[A-Z]\d[a-z]?$/.test(node.id)) problems.push(`${node.id}: bad node id`);
    if (seenIds.has(node.id)) problems.push(`${node.id}: duplicate node id`);
    seenIds.add(node.id);
    if (node.title.length === 0) problems.push(`${node.id}: untitled node`);
    if (node.options.length < 2) problems.push(`${node.id}: fewer than two options`);
    const seenOpts = new Set<string>();
    const flagSigs = new Map<string, string>();
    const ledgerSigs = new Map<string, string>();
    for (const opt of node.options) {
      if (opt.id.length === 0) problems.push(`${node.id}: blank option id`);
      if (seenOpts.has(opt.id)) problems.push(`${node.id}/${opt.id}: duplicate option id`);
      seenOpts.add(opt.id);
      if (opt.flagWrites.length === 0) {
        problems.push(`${node.id}/${opt.id}: no downstream flags (a structural option moves something)`);
      }
      const fs = flagSignatureOf(opt);
      if (flagSigs.has(fs)) {
        problems.push(`${node.id}: options ${flagSigs.get(fs)} and ${opt.id} converge on the same flags — a fake choice (doc 10 §3)`);
      } else {
        flagSigs.set(fs, opt.id);
      }
      const ls = ledgerSignatureOf(opt);
      if (ledgerSigs.has(ls)) {
        problems.push(`${node.id}: options ${ledgerSigs.get(ls)} and ${opt.id} converge on the same ledger terms — a fake choice (doc 10 §3)`);
      } else {
        ledgerSigs.set(ls, opt.id);
      }
      for (const w of opt.ledgerWrites) {
        // the kind union excludes 'omission' at the type level; the check
        // stays as the permanent guard for JSON-loaded register data
        // (R1/R8 may load content packs), where a bad kind arrives as a
        // string (AGENTS.md §1c.1 — every narrative rule is a test)
        if ((w.kind as string) === 'omission') {
          problems.push(`${node.id}/${opt.id}: an omission is never authored at a node (it matures, doc 10 §1)`);
        }
        if (!(w.visibility === 'private' || w.visibility === 'secret' || w.visibility === 'shared')) {
          problems.push(`${node.id}/${opt.id}: bad ledger visibility`);
        }
        if (w.refs.length === 0) {
          problems.push(`${node.id}/${opt.id}: a ledger write names no refs`);
        }
      }
    }
  }
  return { ok: problems.length === 0, problems };
}

// ---- resolution (pure — the chapter machinery owns the scene around it) ----

export interface ResolveResult {
  ok: boolean;
  reason?: 'bad-node' | 'bad-option' | 'locked';
  /** The node's id (echoed for the caller's ledger refs). */
  nodeId?: string;
  /** The taken option's id (echoed). */
  optionId?: string;
  /** The flags to hold after the choice: the mechanical selection pivot
   *  first (`node:<id>=<optionId>` — how the save remembers the pick),
   *  then the option's downstream writes. */
  flagWrites?: string[];
  /** The ledger drafts to post, in order — date, id and weight are the
   *  caller's (content owns timing and coin). */
  ledgerWrites?: LedgerWriteSpec[];
}

/** Resolve an option of a register node. Validates the option exists and
 *  its locks are held (`held` is the set of currently-true flag keys);
 *  returns the writes to apply. Pure, never throws, mutates nothing. */
export function resolveChoice(
  node: ChoiceNode,
  optionId: string,
  held?: ReadonlySet<string>,
): ResolveResult {
  if (!node || typeof node.id !== 'string') return { ok: false, reason: 'bad-node' };
  const opt = node.options.find((o) => o.id === optionId);
  if (!opt) return { ok: false, reason: 'bad-option' };
  if (opt.locks.length > 0) {
    const unmet = opt.locks.filter((l) => !held?.has(l));
    if (unmet.length > 0) return { ok: false, reason: 'locked' };
  }
  return {
    ok: true,
    nodeId: node.id,
    optionId: opt.id,
    flagWrites: [`node:${node.id}=${opt.id}`, ...opt.flagWrites],
    ledgerWrites: opt.ledgerWrites.map((w) => ({
      kind: w.kind,
      refs: [...w.refs],
      visibility: w.visibility,
    })),
  };
}
