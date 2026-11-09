/**
 * The sensitive-content guardrails — narrative/14 R12, doc 02 §6.
 *
 * R12's three clauses, as machinery:
 *
 *  (a) "The opt-in resource note, once, at the first firing of: F7, the
 *      therapy thread's first session, and the C5 investigation scenes —
 *      whichever comes first." → the once-latch: `shouldOfferResourceNote`
 *      returns true exactly when one of the three triggers fires AND no
 *      trigger has fired before in this save. The note is an OFFER, never
 *      a lecture — the text is authored here, once, and the latch rides
 *      the save (`resource_note_offered`).
 *
 *  (b) "No flashback cinematic machinery may be built for the Lost Year;
 *      fragments are text/sensory only." → the ban is a law constant the
 *      acceptance test enforces by scanning the source: there is no
 *      Flashback class, no flashback scene runner, no cinematic fragment
 *      renderer — the field diary's RECALL entries (≤3 sensory lines) are
 *      the ONLY vehicle a fragment may ride.
 *
 *  (c) The amnesia rules (doc 02 §6) are asserted in tests: the fragment
 *      register is data with the render law attached (≤3 sensory lines,
 *      five of eight surface, recovery is partial and permanent, no
 *      ending restores the Lost Year), and the epistemic guard refuses
 *      any RECALL→FACT upgrade that arrives by elapsed time alone —
 *      "tags never age" (core/fieldDiary's own header law), enforced.
 *
 * Pure state, zero DOM — the core seam law (the same shape as
 * core/fluency.ts).
 */

// ------------------------------------------------------------ (a) the note ----

/** The three triggers, doc 14 R12a verbatim ids. `F7` is doc 02 §6.2's
 *  railing fragment (El Vann's bridge story, C4); the therapy thread's
 *  first session is Dr. Feld's (C3+); the C5 investigation scenes are
 *  C5's own. Whichever fires FIRST in a save spends the note. */
export const RESOURCE_NOTE_TRIGGERS: readonly string[] = [
  'F7-railing',
  'therapy-first-session',
  'C5-investigation',
] as const;

export function isResourceTrigger(sceneId: string): boolean {
  return (RESOURCE_NOTE_TRIGGERS as readonly string[]).includes(sceneId);
}

/** The once-latch, pure: true iff `nowFiring` is one of the three AND no
 *  trigger fired before (`alreadyFired` = the save's spent latch). An
 *  already-spent latch never spends twice — "once, at the first firing
 *  ... whichever comes first". */
export function shouldOfferResourceNote(alreadyOffered: boolean, nowFiring: string): boolean {
  if (alreadyOffered) return false;
  return isResourceTrigger(nowFiring);
}

/** The note's text — authored once, cited, non-lecturing (doc 02 §6.6's
 *  register: the condition is disclosed lightly, in Leo's world's own
 *  voice; the note is the GAME's one out-of-world kindness, offered not
 *  imposed — "opt-in" is the design's word). Written to spec; doc 14
 *  names the trigger and the once-law, not the prose. */
export const RESOURCE_NOTE_TEXT =
  'This story touches some heavy things. If any of it sits close to home, '
  + 'it\u2019s okay to step away \u2014 and okay to reach out. (You can turn this note off; '
  + 'it only ever shows once.)';

// ----------------------------------------------------------- (b) the ban ----

/** R12b's law, as a pinned constant: NO flashback cinematic machinery may
 *  be built for the Lost Year. The acceptance test scans the source tree
 *  for flashback machinery (a Flashback class, a cinematic fragment
 *  runner) and fails the build if the class of mistake returns. The
 *  fragments' only vehicle is the field diary's RECALL kind — text and
 *  sensory lines, never a scene, never a camera (doc 02 §6.2: "≤3
 *  sensory lines, never cinematic"). */
export const NO_FLASHBACK_LAW =
  'The Lost Year has no flashback machinery: fragments are text/sensory '
  + 'only (doc 14 R12b; doc 02 §6.2). The field diary\u2019s RECALL entries are '
  + 'the only vehicle.';

// ------------------------------------------------- (c) the fragment register ----

/** One fragment of the Lost Year — doc 02 §6.2's register, verbatim rows. */
export interface Fragment {
  id: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8';
  name: string;
  /** The ≤3 sensory lines, verbatim seed from doc 02 §6.2's table. */
  content: string;
  /** The earned trigger (doc 02 §6.1: "No item 'unlocks' a flashback"). */
  trigger: string;
  chapter: string;
}

/** The register, verbatim from doc 02 §6.2's table (names, contents,
 *  triggers, chapters). Content waves land these; the machine owns the
 *  law around them. */
export const FRAGMENTS: readonly Fragment[] = Object.freeze([
  {
    id: 'F1', name: 'The ice machine',
    content: 'Motel hallway hum; carpet pattern; a door that isn\u2019t his',
    trigger: 'Sunrise Laundry\u2019s dryer bank, end of day', chapter: 'C1',
  },
  {
    id: 'F2', name: 'The glass',
    content: 'A hand flat on visiting-room glass; his own palm, hours later, still shaped',
    trigger: 'Eddie\u2019s hospital window', chapter: 'C3',
  },
  {
    id: 'F3', name: 'Zanesville',
    content: 'Dusk through bus glass; a green highway sign; the taste of vending-machine coffee',
    trigger: 'M121 window, riding the loop at dusk', chapter: 'C2',
  },
  {
    id: 'F4', name: 'The parking structure',
    content: 'Fluorescent light; a hood of a car still warm; crying with no reason attached',
    trigger: 'The parking level under the Corvus render site', chapter: 'C4',
  },
  {
    id: 'F5', name: 'The payphone',
    content: 'Coins leaving; the dial tone after; his own voice saying a sentence he can\u2019t hear',
    trigger: 'Rachel\u2019s retelling completes the circuit', chapter: 'C5',
  },
  {
    id: 'F6', name: 'Crowne',
    content: 'A lanyard; shrink-wrap; the beeper of a scanner gun',
    trigger: 'Kev\u2019s delivery-job lanyard', chapter: 'C1',
  },
  {
    id: 'F7', name: 'The railing',
    content: 'Cold metal; river dark; \u2014 full stop. No conclusion.',
    trigger: 'El Vann\u2019s bridge story', chapter: 'C4',
  },
  {
    id: 'F8', name: 'Day 1',
    content: 'A green notebook; a nurse\u2019s handwriting: facts only; the words "Day 1" dated thirteen months after the year began',
    trigger: 'Writing the endgame self-portrait', chapter: 'C6',
  },
] as readonly Fragment[]);

/** Doc 02 §6.3: "Across three years Leo recovers five of eight fragments
 *  and glimpses of the year's texture. He never recovers the Lost Year." */
export const MAX_FULL_RECOVERIES = 5;

/** The render law, machine-checked: a fragment's content is ≤3 sensory
 *  lines and never cinematic. Returns the offending fragment ids. */
export function assertFragmentRenderLaw(): string[] {
  const bad: string[] = [];
  for (const f of FRAGMENTS) {
    const lines = f.content.split(';').length;
    if (lines > 3) bad.push(`${f.id} renders ${lines} lines (law: ≤3)`);
  }
  return bad;
}

/** The amnesia guard, machine-checked: no authored path restores the Lost
 *  Year. The register's own rows are the audit surface — a fragment that
 *  claims full restoration, or more than five full recoveries, is a canon
 *  violation (doc 02 §6.3: "any build that restores it is a canon
 *  violation"). Returns the violations. */
export function assertNoFullRestoration(fullRecoveries: number): string[] {
  const bad: string[] = [];
  if (fullRecoveries > MAX_FULL_RECOVERIES) {
    bad.push(`${fullRecoveries} full recoveries (law: at most ${MAX_FULL_RECOVERIES})`);
  }
  for (const f of FRAGMENTS) {
    if (/recovers the lost year|full restoration|remembers everything/i.test(f.content)) {
      bad.push(`${f.id} claims restoration (doc 02 §6.3)`);
    }
  }
  return bad;
}

// --------------------------------------------------- (c) the epistemic guard ----

/** How an epistemic tag may move. The law (core/fieldDiary's header, now
 *  enforced): "Tags never age. RECALL is never upgraded to FACT by
 *  elapsed time alone" — doc 14 R12c's own wording, with "alone"
 *  load-bearing: TIME moves nothing, ever. An AUTHORED strike (doc 03
 *  §5.1 — the offending line quoted, the margin in current-tense Leo,
 *  the correction append-only) is the diary's only correction channel:
 *  it may demote an over-tag (the C1 mishear, FACT→GUESS) or confirm a
 *  guess the city answered (the surveyor, GUESS→FACT in C2). A RECALL
 *  rides the strike path only when the scene EARNED the difference —
 *  and the strike's own record is the evidence trail the continuity
 *  register audits. */
export type EpistemicPath = 'authored-strike' | 'elapsed-time';

export function epistemicMayChange(
  from: 'FACT' | 'RECALL' | 'GUESS',
  to: 'FACT' | 'RECALL' | 'GUESS',
  via: EpistemicPath,
): boolean {
  if (from === to) return true;
  if (via === 'elapsed-time') return false;
  return true;
}
