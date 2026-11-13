/**
 * core/c5pack.ts — the C5 content pack (narrative/14 §7 step 10
 * continued — doc 06 §C5, "Nothing Holds", Jul 3 – Nov 26, Y3).
 *
 * The chapter of the fall. The pack mirrors the c0/c1/c2/c3/c4
 * conventions exactly:
 *
 *  - the station table: TEN playable days keyed by canon calendar day
 *    (doc 12 §2's C5 row: Doris dies Sept 14, the receipts Sept 21, the
 *    sale closes Sept 30, the shop's last night Oct 4, Priya's handover
 *    Oct 8, the deal Oct–Nov, the call home Nov, the terminal Nov 26 —
 *    each machine-verified through calendarDayOf before a line of
 *    wiring);
 *  - the compressions: the gaps between stations, CONSUMED never played,
 *    with ONE season cut the calendar proves (summer→autumn 663→736 —
 *    crossedSeasonCut machine-checked; the hot late summer hands the
 *    block to the fall that takes everything);
 *  - the rails: c5RailFor answers the linger machine ('next' /
 *    compression / 'cut' / null);
 *  - the C5→C6 season cut: staged at the frontier's last linger, the
 *    entry dated Dec 1, Y3 (C6's window start), the chapter through
 *    advanceChapter's own door — the wall holds (the roll into C6's
 *    stations is the C6 wave's law, the honest pattern every wave has
 *    kept);
 *  - the C4 cut's roll: THIS wave's law — the c4SeasonCut's wall gains
 *    the roll into C5's first station (day 663) exactly as the C4 wave
 *    brought the C3 cut's roll (the GameState side; the pin is here so
 *    the pack documents its own reach);
 *  - the Lost-Year fragment F5 (the payphone — doc 02 §6.2's register
 *    row verbatim, trigger "Rachel's retelling completes the circuit"):
 *    ONE RECALL entry, the wobble style, once per save;
 *  - R12's opt-in resource note: the C5 investigation scenes are the
 *    register's third trigger ('C5-investigation') — the note rides the
 *    deal scene's own seam through core/guardrails' once-latch (a save
 *    that spent at F7 or the therapy session never sees it twice);
 *  - the contradiction ledger's strikes: K2 written in C2 and seeded for
 *    THIS wave ("Deniz's receipts surface; Kev's copy of the sign-in
 *    sheet") — struck at the receipts (doc 03 §5.2's correction verbatim);
 *    K5 written at the deal ("I did what had to be done.", tagged FACT —
 *    the last lie the ledger carries) and struck at Ada's $8,000 call
 *    ("I did what I wanted and called it necessary. — L") — the chapter's
 *    last correction, and the truest sentence in the book;
 *  - the three register nodes N5a/N5b/N5c (core/choiceNodes' C5 rows)
 *    dressed for the seam: pick packs, per-option ink, notes, and
 *    applyC5Pick through resolveChoice — N5c's silence posts NOTHING
 *    (the Silent class again: nothing posts; the flags are the only
 *    witness);
 *  - the restitution arithmetic, machine-pinned: the raise was $61,500
 *    from nineteen investors; Corvus's settlement buys releases from
 *    nine investors for $14,200 of principal; Leo's agreement covers the
 *    remaining $47,300 (doc 09 §4) — and N5a's fight door costs the
 *    ±$6,000 the register's own row prices ($53,300, and the
 *    relationships with it). Settle is $47,300. The numbers are the
 *    chapter's honesty; the pack self-checks them.
 *  - the R9 send: the ONE postcard of the whole story rides the Ada
 *    scene (core/postcardDispatch's sealed seam — 'C5-ada', once per
 *    save, the recipient is the law not data);
 *  - the pack checks itself (validateC5Pack): the canon lines verbatim,
 *    the canon values pinned, every option resolving, signatures
 *    pairwise unique, the Silent class machine-checked, K2 and K5's
 *    strikes verbatim, no real-world years in the authored prose.
 *
 * Staging judgments this wave owns (documented here, per the §6.4 law):
 *  - the exits' day lands Nov 12 (doc 12 §2's row names only "the
 *    exits" in Nov, after the deal's Oct–Nov window): Rachel's 1 a.m.
 *    call and Eddie's call from Charlotte ride one station — the two
 *    calls are the exits' own weather, and the doc's order (June's
 *    conditions resolved met/unmet, then the calls) is kept;
 *  - the phone call home lands Nov 19 — "Nov" per doc 12 §2, the week
 *    before Thanksgiving eve, so F5 ("the coins leaving, the dial tone
 *    after — Rachel's C4 retelling completing the circuit") fires the
 *    same week the doc 06 §C5 event 9 requires, and the terminal's
 *    Nov 26 keeps its own date;
 *  - the deal lands Nov 1, inside doc 12 §2's "Oct–Nov" window: the
 *    restitution arithmetic reads better on a machine date than on a
 *    month, and the investigation's discovery rides the Priya week's
 *    wake (Oct 8's handover is the investigation's own ignition);
 *  - N5b (the plan) fires at the exits' station — Eddie's floor offer
 *    is the option the node prices, so the offer and the choice share
 *    the morning; N5c (the block) fires at the garden the call-home
 *    week (doc 06 §C5: "a public reckoning at the garden — available,
 *    brutal, the only path that keeps Yoli's door ajar");
 *  - June's conditions resolve at the exits' station as MET or UNMET
 *    from the C4 machine's own flag (june-conditions=full-disclosure
 *    plus the therapy pick's flag c6-condition-handle=therapy — the
 *    register's own two flags; the door-neutral law: the staging reads
 *    the flags, the text keeps both weathers).
 *
 * Pure state, zero DOM — the core seam law (the c4pack's own header).
 */

import type { WeekOrder } from './c0pack';
import type { FieldDiaryEntry } from './fieldDiary';
import type { LedgerEntry } from './consequenceLedger';
import {
  calendarDayOf, dateOfCalendarDay, crossedSeasonCut, type GameDate,
} from './calendar';
import { FRAGMENTS } from './guardrails';
import { resolveChoice, nodeById } from './choiceNodes';

// ===========================================================================
// 1. The canon constants (doc 06 §C5 / doc 12 §2 / doc 03 §5 / doc 09 §4)
// ===========================================================================

/** C5's window (doc 06 §C5 period: Jul 3 – Nov 26, Y3). */
export const C5_FIRST_DAY = calendarDayOf({ y: 3, m: 7, d: 3 });
export const C5_LAST_DAY = calendarDayOf({ y: 3, m: 11, d: 26 });

/** The C5→C6 season cut's morning (doc 06 §C5 handoff: snow on the
 *  Works' hoarding — doc 06 §C6 period start Dec Y3, the window row's
 *  own Dec 1). */
export const C5_CUT_DAY = calendarDayOf({ y: 3, m: 12, d: 1 });

/** The money, machine-pinned (doc 09 §4's arithmetic — the chapter's
 *  honesty lives in these numbers). The raise: $61,500 from nineteen
 *  investors. Corvus's settlement: nine releases, $14,200 of principal.
 *  Leo's agreement: the remaining $47,300. The fight door: the register's
 *  own ±$6,000 ($53,300, and the relationships with it). */
export const C5_RAISE_TOTAL = 61500;
export const C5_RAISE_INVESTORS = 19;
export const C5_CORVUS_RELEASES = 14200;
export const C5_RESTITUTION_SETTLE = 47300;
export const C5_RESTITUTION_FIGHT = 53300;

/** The end state's money (doc 09 §3's loss ledger): $1,212 in the
 *  account, the Inwood basement at $1,150/mo. */
export const C5_ACCOUNT_INWOOD = 1212;
export const C5_INWOOD_RENT = 1150;

/** Ada's $8,000, sent home with zero questions (doc 06 §C5 event 9) —
 *  and her note, via Bea, on the restitution schedule's first dollar. */
export const C5_ADA_AMOUNT = 8000;

/** The coalition's win, C6's seed (doc 09 §6): 280 affordable units,
 *  the CLT option on the garden slot — priced here so the receipts
 *  week's diary can carry the number the papers will someday print. */
export const C5_UNITS_AFFORDABLE = 280;

// ---- the canon lines, verbatim (the pack self-checks them) ----

/** Doc 06 §C5 event 3 — the post's title, verbatim. */
export const C5_POST_TITLE =
  'The Paper Trail of the Man Who Feeds Alder Heights.';

/** Doc 06 §C5 important conversations — Deniz at the post's aftermath:
 *  not gloating — bookkeeping. */
export const C5_DENIZ_LINE =
  'I didn\u2019t do this to you. I filed you.';

/** Doc 06 §C5 important conversations — Priya on the platform: her
 *  pricing, owned. */
export const C5_PRIYA_LINE =
  'I told you once \u2014 learn which tile you are. You never asked which tile I was.';

/** Doc 06 §C5 event 8 — Rachel, on the one 1 a.m. call: the sentence he
 *  never recovers from. */
export const C5_RACHEL_LINE =
  'You did this in Ohio too.';

/** Doc 06 §C5 event 8 — Eddie's call from Charlotte: love without
 *  absolution. */
export const C5_EDDIE_LINE =
  'You were the best hire I ever made. And the worst thing that happened to that shop. Both true. Come see me when you\u2019re done being sorry.';

/** Doc 06 §C5 event 10 — Rosa, at the terminal, to no one and to
 *  everyone: the Hospitality Law closing its loop. */
export const C5_ROSA_TERMINAL_LINE =
  'You looked like that once.';

/** Doc 06 §C5 event 10 — the chapter's last diary line. */
export const C5_DAY1_LINE =
  'Day 1 again.';

/** Ada's note, via Bea, on the restitution schedule's first dollar
 *  (doc 09 §4's investor table, verbatim). */
export const C5_ADA_NOTE =
  'Pay your debts in order.';

/** K5 — doc 03 §5.2's row: the record and the correction. The record is
 *  written at the deal (tagged FACT — the last lie the ledger carries);
 *  the correction is struck at Ada's $8,000 call. The chapter's last
 *  correction, and the truest sentence in the book. */
export const C5_K5_BODY =
  'I did what had to be done.';
export const C5_K5_STRIKE = 'had to be done';
export const C5_K5_MARGIN =
  'I did what I wanted and called it necessary. \u2014 L';

/** K2's correction (doc 03 §5.2's row verbatim) — struck at the
 *  receipts, when Deniz's annotations and Kev's sign-in sheet put the
 *  Compact's true arithmetic on every stoop's phone. The offending
 *  phrase is the body's own verdict; the margin is the correction. */
export const C5_K2_STRIKE = 'Net good.';
export const C5_K2_MARGIN =
  'I saved the shop. The Compact might have held. Both true. Only one was mine to write.';

/** The deal's shape, verbatim from doc 06 §C5 event 6: civil and
 *  administrative, not criminal-lead. The game is honest about this
 *  being the system's mercy, not the story's. */
export const C5_DEAL_SHAPE =
  'deferred-prosecution-style agreement';

/** The concession bar — the hall's own door closes (doc 06 §C5 event
 *  6's outcome). */
export const C5_CONCESSION_BAR =
  'a bar from operating the hall\u2019s concession';

// ===========================================================================
// 2. The station table — ten playable days (doc 12 §2's C5 row)
// ===========================================================================

/** One playable station of C5's season — the c4pack's own shape, the
 *  loop's mouths (begin/wake/queue/rushDone/climb/golden). The C5 voice
 *  (doc 03 §6: "Terse. Facts, times, amounts. The performance voice
 *  dies here.") — the entries run like receipts, because that is what
 *  the year has become. */
export interface C5Station {
  day: number;
  title: string;
  begin: string;
  wake: string;
  queue: readonly WeekOrder[];
  rushDone: string;
  climbNote: string;
  goldenNote: string;
  storm?: boolean;
}

// ------------------------------------------------------------- day 663 ----

/** The season opens (doc 06 §C5 starting circumstances): the machine is
 *  loaded. Every trigger documented in doc 08 §5 is live; only the
 *  sequence is in question. Maximum exposure, minimum margin. */
const DAY663_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CJuly, coffee. In my country July is when the river takes the unpinned things. Your papers are all pinned? Then hold the pins. The season tests pins, not paper.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CThe Club\u2019s second window is open. My cousin rolled his own window\u2019s payment into the next one, and the next one into the one after. Windows roll. Then they close.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 3,
    reaction: 'The oat regular: \u201CWexler rescheduled the hall\u2019s inspections again. Third time. The city\u2019s calendar bends for somebody. I always wondered for whom.\u201D',
  },
];

const DAY663: C5Station = {
  day: 663,
  title: 'The Loaded Machine',
  begin: 'Day 663. July 3, and the heat is honest about what it is. Facts, times, amounts: the Club\u2019s second window is open and covered by rolling; the inspections are rescheduled; the render\u2019s glass holds its sales-sun; the receipts exist, the enemies are organized, the money is thin. Nineteen debts, one face, and a machine that only needs a schedule. The machine has a schedule.',
  wake: 'Rosa: \u201CJuly, coffee. You look like the corner in August \u2014 tired before the tired part starts. Feed them warm. The notebook rides low.\u201D',
  queue: DAY663_QUEUE,
  rushDone: 'Three orders, terse as receipts. The corner knows. That\u2019s the thing nobody wrote in the deck: the corner reads schedules too. The Club\u2019s window rolls. The fence holds its locks. The machine is loaded and I am holding the handle.',
  climbNote: 'The notebook\u2019s page is short. Facts, times, amounts. The performance voice dies here \u2014 I can hear it go. What\u2019s left is the arithmetic: window open, money thin, nineteen names, one schedule. July\u2019s the season the notebook wrote toward. It\u2019s here.',
  goldenNote: 'Heat on the far towers, the render\u2019s glass glowing its sales-sun over the Works fence. Craig\u2019s truck idles at the laundromat and Sal\u2019s heard about buildings enough times to stop answering. The machine is loaded. Only the sequence is in question. Happy July.',
};

// ------------------------------------------------------------- day 736 ----

/** Doc 06 §C5 event 1 — Doris dies (Sept 14, at home, in the chair, the
 *  ledger on her lap). The funeral is the last time the block is one
 *  thing. Behind the scene: the estate's arithmetic, Craig inherits the
 *  pen, and the funeral porch's conversation (Doris's lawyer). */
const DAY736_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CFor the lady\u2019s house, coffee \u2014 black, no sugar, the way the old ones drink it when they mean it. She kept a ledger to the last page. In my country we say such a person owed nothing when they went.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The large two-sugar: \u201CThe whole block\u2019s at the porch. First time in years everybody\u2019s standing in the same place for the same reason. Funny what it takes.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 BLACK',
    pay: 3,
    reaction: 'The small black: \u201CDoris\u2019s ledger was on her lap. My mother wants to know who keeps ours now. I didn\u2019t have an answer that fit in a car.\u201D',
  },
];

const DAY736: C5Station = {
  day: 736,
  title: 'The Chair',
  begin: 'Day 736. September 14. Doris died at home, in the chair, the ledger on her lap \u2014 facts only, because facts are all that hold still today. The funeral is at two. The porch after is the last time the block is one thing, and I know it while it\u2019s happening, which is its own kind of cruelty. Craig wears the suit like a costume he\u2019s already measured for resale.',
  wake: 'Rosa: \u201CSept 14, coffee. The block will feed you today whether you serve or not. Let it. Receiving is also a corner skill \u2014 ask any cart in any borough.\u201D',
  queue: DAY736_QUEUE,
  rushDone: 'Three orders and the cart did its work the way the block needed: a place to stand and something warm in the hands. The porch\u2019s arithmetic was small and final \u2014 the estate needs liquidity, Craig inherits the pen, and the lawyer\u2019s sympathy is billable. Craig said \u201Ccontinued\u201D about the shop like a man reading his own footnote.',
  climbNote: 'The notebook writes the funeral\u2019s facts and the estate\u2019s: liquidity, the pen, the row. Doris kept her ledger to the last page. Mine keeps writing itself. Craig\u2019s the pen now. The row goes where pens go.',
  goldenNote: 'September gold on the Works fence, the porch chairs folded, the block dispersing into its separate weathers. The last time the block is one thing, and it took a funeral to book it. The estate needs liquidity. Everything after this is sequencing.',
};

// ------------------------------------------------------------- day 743 ----

/** Doc 06 §C5 event 3 — the receipts (Sept 21): Kev hands Deniz the
 *  screenshots — every promise, every text, "in case." She publishes
 *  with annotations: the sign-in sheet with Leo's withdrawal line, the
 *  "stall the Oktays till they take anything" text, the 500-jobs math.
 *  The post is titled The Paper Trail of the Man Who Feeds Alder
 *  Heights. Behind the scene: K2's strike — the ledger's C2 lie meets
 *  the block's arithmetic. */
const DAY743_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CI have read it, coffee. All of it \u2014 the sheet, the texts, the math. In my country a paper trail is how the small people finally get a courtroom. Today the courtroom is a telephone. Drink. It is going to be that kind of month.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, not unkind: \u201CThe post\u2019s on every stoop. The soup kitchen\u2019s still the soup kitchen, they say. Both things are in the post too. Deniz kept both \u2014 that\u2019s the part that hurts.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 3,
    reaction: 'The oat regular: \u201CFive hundred jobs, the math says, and the math says where it came from. My cousin\u2019s stall application is in that pile somewhere. She wants to know if it was ever real. I said the coffee was.\u201D',
  },
];

const DAY743: C5Station = {
  day: 743,
  title: 'The Receipts',
  begin: 'Day 743. September 21. Kev handed Deniz the folder \u2014 every promise, every text, kept in case, and the case arrived. The post went up with annotations: the sign-in sheet with my withdrawal line, the stall-the-Oktays text, the 500-jobs math beside the deck\u2019s 340. The title is the block\u2019s own irony, printed: the man who feeds Alder Heights, fed to Alder Heights. The city\u2019s diary, for the first time, went quiet about me.',
  wake: 'Rosa: \u201CSept 21, coffee. The phones came out at the stoops before the bread did. I\u2019ll say one thing and then pour: the soup was good. October will remember that even if September won\u2019t.\u201D',
  queue: DAY743_QUEUE,
  rushDone: 'Three orders and nobody spat in one. That\u2019s the block\u2019s verdict, tired and alive: they still queue, and they read while they queue. Kev\u2019s folder had my handwriting in it. Deniz\u2019s annotations had my arithmetic in them. The paper trail is mine. The title is theirs.',
  climbNote: 'The notebook opens to K2 \u2014 the Compact\u2019s line, the net good \u2014 and the block\u2019s arithmetic stands next to it, annotated, public. I strike it. The Compact might have held. Both true. Only one was mine to write. The strikethrough is the day\u2019s only honest sentence.',
  goldenNote: 'Autumn\u2019s first real evening, the stoops loud with screens, the cart quiet in a way the corner\u2019s never been. The receipts are out. The city\u2019s diary is quiet about me. A block that reads together is a block that\u2019s done deciding.',
};

// ------------------------------------------------------------- day 752 ----

/** Doc 06 §C5 events 4 + 7's first half — the run (Sept 22–30) and the
 *  sale closes (Sept 30): nineteen investors become a crowd; the Club's
 *  books do not survive daylight; the landlord of Leo's own room is
 *  now, technically, Corvus-adjacent; Craig closes the row's sale. */
const DAY752_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe crowd was at your window before you opened, coffee \u2014 investors, they call themselves. In my country a crowd at a window means run. You stayed. I don\u2019t know if that is loyalty or arithmetic.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The large two-sugar: \u201CThe sale closed. The row\u2019s got new paper with old signatures on the mortgage line. My wife says our lease reads different now. It reads the same. It feels different.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 OAT',
    pay: 3,
    reaction: 'The small oat: \u201CThe Club\u2019s books went up on the garden\u2019s corkboard this morning \u2014 somebody photographed the ledger. It doesn\u2019t survive daylight, the ledger. It never did. It just never had any.\u201D',
  },
];

const DAY752: C5Station = {
  day: 752,
  title: 'The Run',
  begin: 'Day 752. September 30. The run is over because there is nothing left to run on: nineteen investors became a crowd, the crowd became a phone tree, and the Club\u2019s books met daylight and did not survive it. Craig closed the row\u2019s sale this morning \u2014 the paper matured, the offer was suddenly fair, the buildings are as good as sold, which now means sold. My own room\u2019s landlord is, technically, Corvus-adjacent. Facts, times, amounts. The amounts are the story.',
  wake: 'Rosa: \u201CSept 30, coffee. The shop\u2019s sign says CLOSES SATURDAY in Eddie\u2019s letters. He\u2019s in Charlotte already, the heart\u2019s orders. I\u2019m not telling you anything you don\u2019t know. I\u2019m telling you the corner knows.\u201D',
  queue: DAY752_QUEUE,
  rushDone: 'Three orders, and two of them paid in exact change like the coins wanted to be done with me. The books are public. The sale is closed. The crowd\u2019s noise has become something worse: accounting. The Club\u2019s ledger on the corkboard with a phone\u2019s flash glare on it \u2014 that\u2019s the chapter\u2019s portrait, and somebody else took it.',
  climbNote: 'The notebook\u2019s arithmetic, terse: nineteen in, one folder out, the books public, the row sold. The landlord of my own room is Corvus-adjacent, which is a sentence I never thought a notebook would hold. The machine\u2019s not loading anymore. It\u2019s firing.',
  goldenNote: 'The row\u2019s windows have NEW PAPER COMING taped inside them. The render\u2019s glass holds the sunset like it owns it. The buildings are sold. The machine is firing. And the shop\u2019s Saturday is four days out, which is the only date left that means anything.',
};

// ------------------------------------------------------------- day 756 ----

/** Doc 06 §C5 event 7's second half — the shop is lost (Oct 4, the last
 *  night): Craig sells the row; Eddie's lease dies with Doris's
 *  handshake economy; Eddie, post-cardiac, has already gone to
 *  Charlotte. The last-night scene: Leo closes alone, cuts the last
 *  slice of the last pie, sets it on the counter for nobody, turns off
 *  the lights, and stands in the dark for four seconds longer than the
 *  scene needs. */
const DAY756_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe last night, coffee. I closed my own shop once \u2014 \u201998, don\u2019t check the year, the heart keeps its own calendar. You wipe the counters twice. The second time is for nobody. That is the one that matters.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CSlice\u2019s on the house tonight, they say downstairs. Eddie\u2019s rules even from Charlotte. The man\u2019s handshake outlived his lease. There\u2019s a lesson in that I\u2019m not smart enough to name.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 3,
    reaction: 'The oat regular: \u201CI got my first slice there the week it opened. Nobody\u2019s getting their first slice there again. That\u2019s the whole thing. That\u2019s what a neighborhood is.\u201D',
  },
];

const DAY756: C5Station = {
  day: 756,
  title: 'The Last Slice',
  begin: 'Day 756. October 4, the shop\u2019s last night. Craig sold the row; the lease died with Doris\u2019s handshake economy; Eddie\u2019s in Charlotte with a heart that finally outranked the ovens. I close alone. The last slice of the last pie goes on the counter for nobody. The lights go off. I stand in the dark four seconds longer than the scene needs. Facts, times, amounts: one slice, one counter, four seconds.',
  wake: 'Rosa: \u201COct 4, coffee. The shop\u2019s lights go off tonight and the corner gets a new silence to learn. Twenty-five years I\u2019ve had that window across the street. The corner will learn. Corners always learn. That\u2019s not comfort. It\u2019s just true.\u201D',
  queue: DAY756_QUEUE,
  rushDone: 'Three orders and the shop\u2019s ovens are cold behind me while I serve them \u2014 the cart outlived the shop it was raised beside, and neither of us knows what to do with that. The last slice sits on the counter for nobody. Eddie\u2019s keys hang by the door for the new paper\u2019s locksmith. The handshake economy is closed. Everything after this is accounting.',
  climbNote: 'The notebook writes the shop\u2019s close the way ledgers write endings: one line. CLOSED OCT 4. The four seconds don\u2019t fit in a ledger. I write them anyway, small, at the bottom, where the margins forgive.',
  goldenNote: 'The shop\u2019s window dark for the first night in twenty-five years, the corner\u2019s new silence settling in like weather. The last slice is for nobody, which is also for Eddie, which is also for me. The lights are off. The four seconds are the longest thing I own.',
};

// ------------------------------------------------------------- day 760 ----

/** Doc 06 §C5 event 5 — Priya's handover (Oct 8): the council office
 *  needs its own distraction; the investigation needs its cooperative
 *  witness; Kayla Fournier asks Priya what she "knows about the Marsh
 *  situation." Priya gives them the Club ledger she has been sitting on
 *  since spring. Her neutrality, priced at last. */
const DAY760_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe councilwoman gave them the ledger, coffee. I watched her at the 7:40 \u2014 a woman not looking at you is a woman carrying something. In my country we call that paying your own fare. She paid hers today. It just wasn\u2019t her fare.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CKayla Fournier\u2019s office confirmed receipt of documents. Receipt. Like the deli counter. The whole city\u2019s a counter now, and everybody\u2019s holding a ticket.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The small two-sugar: \u201CShe sat on that ledger since spring, they say. Neutral the whole time. Neutrality\u2019s got a price too, apparently. Everything\u2019s got a price this month.\u201D',
  },
];

const DAY760: C5Station = {
  day: 760,
  title: 'The Handover',
  begin: 'Day 760. October 8. The council office needed its own distraction, the investigation needed its cooperative witness, and Kayla Fournier asked Priya what she knows about the Marsh situation. Priya gave them the Club ledger \u2014 the one she\u2019s been sitting on since spring, neutral the whole time. Her neutrality, priced at last. The 7:40 came and went with a woman on it who was not looking at me.',
  wake: 'Rosa: \u201COct 8, coffee. The platforms gossip worse than the stoops. Whatever she handed them, it wasn\u2019t yours to hold anymore. Loose ledgers find desks. That\u2019s all a ledger is \u2014 paper looking for a desk.\u201D',
  queue: DAY760_QUEUE,
  rushDone: 'Three orders and the platform\u2019s sentence rides with me: I told you once \u2014 learn which tile you are. You never asked which tile I was. She\u2019s right twice. I built a board and never once asked what my pieces were standing on. The ledger\u2019s at the investigation\u2019s desk now. Spring\u2019s neutrality, fall\u2019s price.',
  climbNote: 'The notebook writes the handover\u2019s facts: the ledger moved desks, the witness is cooperative, the council\u2019s distraction is funded. Priya\u2019s tile sentence goes in verbatim. Some sentences you write down because you\u2019ll need them when the pride wears off. This is one.',
  goldenNote: 'October\u2019s first cold snap on the rails, the platform breathing its 7:40 crowd out. The ledger she sat on is a desk\u2019s problem now. My desk is a cart. The cart\u2019s books balance \u2014 they always did. Small numbers, honest ones.',
};

// ------------------------------------------------------------- day 784 ----

/** Doc 06 §C5 events 6 + 8's first door — the investigation and the
 *  deal (Nov 1): civil and administrative, not criminal-lead;
 *  misrepresentations in a private offering, books kept "informally,"
 *  Gino's favors surfacing as questions Leo can't answer well. The
 *  outcome: a deferred-prosecution-style agreement, restitution of
 *  $47,300 after settlements, and a bar from operating the hall's
 *  concession. No prison. Behind the scene: N5a — settle or fight —
 *  and K5, written at the deal. R12's third trigger (the investigation
 *  scenes) offers its note here through the once-latch. */
export const C5_N5A_PROMPT =
  'The lawyer is decent and priced. The agreement on her desk reads like a receipt for everything: misrepresentations in a private offering, books kept informally, Gino\u2019s favors surfaced as questions I can\u2019t answer well. No prison \u2014 the system\u2019s mercy, not the story\u2019s. Restitution of forty-seven-three after settlements, and the hall\u2019s concession barred. I can sign, or I can fight and lose more. Fighting is available. Fighting is real. Fighting costs the relationships that are left.';

const DAY784_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe letter came, coffee \u2014 I saw the city\u2019s stamp from here. Sign or fight, they are the only two doors. In my country we say: the judge keeps the calendar, you keep your name. Choose which one you can still carry in winter.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The large two-sugar: \u201CForty-seven-three, the wall says \u2014 corkboard arithmetic, the block\u2019s own newspaper. Nine of the investors took Corvus\u2019s money already. The rest are yours. The block did the division for you.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 BLACK',
    pay: 3,
    reaction: 'The small black: \u201CNo prison, the papers say. Some mercy. My brother got three years for less paper than you moved. The system\u2019s mercy has an address, and it isn\u2019t evenly zoned.\u201D',
  },
];

const DAY784: C5Station = {
  day: 784,
  title: 'The Deal',
  begin: 'Day 784. November 1. The investigation is civil and administrative, not criminal-lead \u2014 misrepresentations in a private offering, books kept informally, Gino\u2019s favors surfacing as questions I can\u2019t answer well. The outcome is a deferred-prosecution-style agreement: restitution of $47,300 after settlements, and a bar from operating the hall\u2019s concession. No prison. The system\u2019s mercy, not the story\u2019s. The lawyer is decent and priced, and the pen is the same weight it was in January.',
  wake: 'Rosa: \u201CNov 1, coffee. The city\u2019s stamp on your mail and the whole corner pretending it didn\u2019t see. You\u2019ll sign or you\u2019ll fight. Either way, eat something first. Decisions on an empty stomach are how basements get rented.\u201D',
  queue: DAY784_QUEUE,
  rushDone: 'Three orders and the arithmetic holds where the promises didn\u2019t: $61,500 raised, $14,200 of releases bought by Corvus\u2019s people, $47,300 left with my name on it \u2014 or $53,300 if I fight, and the fight eats Yoli\u2019s door and Deshaun\u2019s patience with it. The concession\u2019s barred. The hall opens without me. The notebook writes I did what had to be done and doesn\u2019t believe it and writes it anyway.',
  climbNote: 'The notebook writes the deal\u2019s facts, terse: sign, or fight and lose more. Forty-seven-three or fifty-three-three. The hall without me. And one line I already know is a lie: I did what had to be done. The ledger takes it. The ledger takes everything. That\u2019s its job.',
  goldenNote: 'The lawyer\u2019s office light on the far glass, the agreement\u2019s copies squared like pies. No prison. The system\u2019s mercy, not the story\u2019s. Forty-seven-three, or the fight\u2019s six more and the last doors with it. The pen is the same weight. That\u2019s the whole November so far.',
};

// ------------------------------------------------------------- day 795 ----

/** Doc 06 §C5 event 8 — the exits (Nov 12): June's conditions (doc 07
 *  §2.5) — met or not, she is gone from the daily map; Rachel takes his
 *  one 1 a.m. call ("You did this in Ohio too." — the sentence he never
 *  recovers from); Eddie's call from Charlotte. Behind the scene:
 *  N5b — the restitution plan's shape (garment-district pace / diner
 *  shifts + the amends ledger / disappear to Charlotte with Eddie's
 *  offer of a floor). */
export const C5_N5B_PROMPT =
  'The plan has three shapes and all three are honest. Garment-district pace: the district\u2019s piecework, the restitution schedule met on paper, the debts paid in order and alone. Diner shifts plus the amends ledger: Deshaun\u2019s cousin\u2019s line to Long Island City, the green notebook\u2019s faces on every line, the slow way with witnesses. Or Eddie\u2019s floor in Charlotte \u2014 the exit that is also a home, and the farthest from every debt but the money. The schedule doesn\u2019t care. The schedule just runs.';

const DAY795_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe phone rang at one in the morning, coffee \u2014 the whole block heard it through the wall, the whole block pretended not to. Ohio people answer at any hour. It is their best and most terrible quality.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CEddie called from Charlotte. My cousin ships him the good flour now \u2014 the man\u2019s building a crust schedule around dialysis, can you believe it. He didn\u2019t say one word against you. That\u2019s worse, if you ask me.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 3,
    reaction: 'The oat regular: \u201CJune\u2019s window light is off at hours it used to be on. Conditions met or not, the light knows first. The block reads windows before it reads papers. Always has.\u201D',
  },
];

const DAY795: C5Station = {
  day: 795,
  title: 'The Exits',
  begin: 'Day 795. November 12. The exits, one per hour of one night: June\u2019s conditions resolved \u2014 met or unmet, she is gone from the daily map either way, and the conditions were the floor I built to stand on and they held exactly as long as the floor did. Rachel took his one 1 a.m. call and said the sentence he never takes back. Eddie called from Charlotte, love without absolution, and offered the floor. Facts, times, amounts: one call, one offer, one window gone dark at the wrong hours.',
  wake: 'Rosa: \u201CNov 12, coffee. I heard the 1 a.m. ring and I made tea I didn\u2019t drink. That\u2019s the block\u2019s whole job some nights \u2014 boiling water for a man we can\u2019t help. Conditions are conditions, coffee. Even the kept kind end.\u201D',
  queue: DAY795_QUEUE,
  rushDone: 'Three orders and the exits total themselves: the window\u2019s light wrong, the 1 a.m. sentence said, Eddie\u2019s two-true-things hanging in the air like ovens cooling. The plan has three shapes. The schedule doesn\u2019t care which. The notebook writes the shapes down and lets the morning pick.',
  climbNote: 'The notebook\u2019s plan, three shapes, terse: the district\u2019s pace; the diner and the amends ledger; Charlotte\u2019s floor. June\u2019s line: conditions met or unmet, gone is gone \u2014 the map\u2019s lighter by one window and the light had been the whole map. Rachel\u2019s sentence, verbatim. Some things you write because you cannot not.',
  goldenNote: 'November\u2019s early dusk, June\u2019s window dark at the hours the light used to argue with me about. Eddie\u2019s floor is a real offer, which is the worst kind. The exits are done. What\u2019s left is the plan, and the plan is just the debts wearing shoes.',
};

// ------------------------------------------------------------- day 802 ----

/** Doc 06 §C5 event 9 — the phone call home (Nov 19): Ada, the $8,000,
 *  zero questions — and this time he answers the question she doesn't
 *  ask. It is the shortest scene in the game and the only one the whole
 *  cast would applaud. The ONE postcard send (R9, core/postcardDispatch's
 *  sealed seam — 'C5-ada') rides this scene. F5 fires the same week (the
 *  coins leaving, the dial tone after — Rachel's C4 retelling completing
 *  the circuit; logged in the wobble style, one line, then nothing).
 *  K5's correction is struck here (doc 03 §5.2: the settlements; Ada's
 *  $8,000 call). Behind the scene, at the garden: N5c — what to tell
 *  the block. */
export const C5_N5C_PROMPT =
  'The block knows the arithmetic by now \u2014 the corkboard did the telling in September. What\u2019s left is the telling only I can do. A public reckoning at the garden: available, brutal, the only path that keeps Yoli\u2019s door ajar. A written statement to the Compact\u2019s list: cleaner, colder, filed. Or silence \u2014 the block\u2019s verdict arrived in September anyway, tired and alive, and silence adds nothing and takes nothing. Three doors. Only one of them is a room I can stand in.';

const DAY802_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CYou were on the phone long, coffee \u2014 I see the phone card in your hand. Mothers and phone cards. In my country we say the miles don\u2019t matter, the minutes do. Whatever she asked, you answered it. I can hear it in how you\u2019re standing.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CBea came by the shop \u2014 the old shop \u2014 with an envelope for the record. First dollar of the schedule, she said, and a note in a hand I\u2019d know anywhere. Mothers keep their own ledgers. Always did.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The small two-sugar: \u201CGarden\u2019s putting beds down for winter. Yoli\u2019s got the clipboard out. Whatever\u2019s said there this week gets said to everybody, I\u2019d figure. The garden doesn\u2019t do private.\u201D',
  },
];

const DAY802: C5Station = {
  day: 802,
  title: 'The Call Home',
  begin: 'Day 802. November 19. Ada, $8,000, zero questions \u2014 the money moves before the hello finishes, and this time I answer the question she doesn\u2019t ask. It is the shortest scene in the game and the only one the whole cast would applaud. The payphone eats its coins; the dial tone after is the longest sound there is. Bea\u2019s envelope finds the record: the schedule\u2019s first dollar, and Ada\u2019s note in a hand I\u2019d know anywhere \u2014 pay your debts in order.',
  wake: 'Rosa: \u201CNov 19, coffee. You stood straighter coming back from that phone than I\u2019ve seen you stand since the poster went up. Whatever it cost, it bought something. Mothers sell it to no one else.\u201D',
  queue: DAY802_QUEUE,
  rushDone: 'Three orders and the day\u2019s books are short and true: $8,000 gone home, the payphone\u2019s coins gone, the dial tone after, the card kept in the album with a stamp on it because some paper has to leave and some paper stays. K5\u2019s lie got its strike this morning \u2014 I did what I wanted and called it necessary. The ledger\u2019s last correction is the truest sentence in the book, and I signed it.',
  climbNote: 'The notebook writes the call\u2019s facts, terse: $8,000, zero questions, the question she didn\u2019t ask answered anyway. The stamp on the card. The strike in the ledger \u2014 K5\u2019s had-to-be-done struck through, the margin signed L. The performance voice is dead. What\u2019s left fits on a phone card.',
  goldenNote: 'The payphone\u2019s coins spent, the dial tone after, the album\u2019s stamp where the card used to be. Ada\u2019s note rides the schedule\u2019s first dollar: pay your debts in order. In order. The whole plan, in three words, in her handwriting. Happy November. The debts are in order.',
};

// ------------------------------------------------------------- day 809 ----

/** Doc 06 §C5 events 10 + 11 — the terminal (Nov 26, Thanksgiving eve)
 *  and the Inwood end state: the city eats; the diner glows; Leo comes
 *  up the subway stairs with a duffel bag. From the bodega doorway,
 *  Rosa, to no one and to everyone: "You looked like that once." The
 *  chapter's last diary line: "Day 1 again." The Inwood basement:
 *  $1,212 in the account, stairs that announce guests, a diner job in
 *  Long Island City via Deshaun's cousin. The main story's end state. */
const DAY809_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThanksgiving eve, coffee \u2014 the city eats and the corners empty and men with duffel bags come up the stairs like weather. In my country we say: the train doesn\u2019t ask what you\u2019re carrying. Ride well.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CInwood\u2019s got basements with announcing stairs \u2014 my cousin had one. Says you get to know everybody by their footsteps before you know their names. There are worse ways to learn a borough.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 3,
    reaction: 'The oat regular: \u201CDiner work\u2019s honest work. My sister did six years at a LIC counter. Says the grill teaches you what the corner taught you \u2014 feed them warm, keep the books true. You already know the words.\u201D',
  },
];

const DAY809: C5Station = {
  day: 809,
  title: 'The Terminal',
  begin: 'Day 809. November 26, Thanksgiving eve. The city eats; the diner glows; I come up the subway stairs with a duffel bag. From the bodega doorway, Rosa \u2014 to no one, and to everyone: you looked like that once. The Inwood basement is $1,212 and stairs that announce guests; the diner job in Long Island City runs through Deshaun\u2019s cousin. Facts, times, amounts. The main story\u2019s end state fits on a phone card. The chapter\u2019s last line writes itself: day 1 again.',
  wake: 'Rosa: \u201CNov 26, coffee. Last cart-day of the year. The corner held \u2014 through the posters and the posts and the sale and the dark window, the corner held. That\u2019s not forgiveness. It\u2019s just the corner. It\u2019s what corners do.\u201D',
  queue: DAY809_QUEUE,
  rushDone: 'Three orders and the terminal\u2019s arithmetic is the chapter\u2019s whole book: $1,212 in the account, $47,300 on the schedule, one basement with announcing stairs, one diner shift via Deshaun\u2019s cousin, one duffel bag. The block\u2019s verdict is mixed, tired, and alive \u2014 the soup was good, though. October, remember? The soup was good.',
  climbNote: 'The notebook\u2019s last page of the year, terse: 1,212. 47,300, in order. Inwood, $1,150, stairs that announce. Diner, LIC, Deshaun\u2019s cousin. And at the bottom, the line the chapter ends on, the only line the whole year never argued with: Day 1 again.',
  goldenNote: 'The terminal\u2019s glow on the far towers, the city eating behind lit windows, the duffel\u2019s strap wearing the shoulder it earned. The hall\u2019s lights are on in the render now \u2014 somebody else\u2019s sun. Rosa said it to no one and to everyone: you looked like that once. Day 1 again.',
};

// ===========================================================================
// 3. The station map + captions (the loop's data side)
// ===========================================================================

export const C5_STATIONS: Readonly<Record<number, C5Station>> = Object.freeze({
  663: DAY663,
  736: DAY736,
  743: DAY743,
  752: DAY752,
  756: DAY756,
  760: DAY760,
  784: DAY784,
  795: DAY795,
  802: DAY802,
  809: DAY809,
});

/** The station days, in order — the linger machine and the tests read
 *  this (data, not scattered conditionals). */
export const C5_STATION_DAYS: readonly number[] = Object.freeze(
  Object.keys(C5_STATIONS).map(Number).sort((a, b) => a - b),
);

export function c5StationOf(day: number): C5Station | undefined {
  return C5_STATIONS[day];
}

// ------------------------------------------------------ the postcards ----

/** One station's postcard caption (the shipped capture pipeline's own
 *  mouth — the card says its own DATE, because the dates are all the
 *  story has left). */
export interface C5Caption {
  date: string;
  body: string;
  replay: string;
}

const C5_CAPTIONS: Readonly<Record<number, C5Caption>> = Object.freeze({
  663: {
    date: 'July 3',
    body: 'The loaded machine opens. The Club\u2019s window rolls, the inspections reschedule themselves, and every trigger in the book is live \u2014 only the sequence is in question.',
    replay: 'The machine, again. Still loaded.',
  },
  736: {
    date: 'September 14',
    body: 'The chair. Doris died at home, in the chair, the ledger on her lap \u2014 and the funeral porch was the last time the block was one thing.',
    replay: 'The porch, again. The block still one thing, once.',
  },
  743: {
    date: 'September 21',
    body: 'The receipts. Every promise, every text, kept in case \u2014 and the case arrived, annotated, on every stoop\u2019s phone. The paper trail of the man who feeds Alder Heights.',
    replay: 'The post, again. The stoops still reading.',
  },
  752: {
    date: 'September 30',
    body: 'The run. Nineteen investors became a crowd, the books met daylight, and Craig closed the row\u2019s sale \u2014 the buildings as good as sold, which now means sold.',
    replay: 'The books, again. Daylight still wins.',
  },
  756: {
    date: 'October 4',
    body: 'The last slice. The shop\u2019s last night \u2014 one slice on the counter for nobody, the lights off, and four seconds longer than the scene needs.',
    replay: 'The counter, again. The four seconds still the longest thing I own.',
  },
  760: {
    date: 'October 8',
    body: 'The handover. Priya gave the Club\u2019s ledger to the investigation \u2014 her neutrality, priced at last \u2014 and the 7:40 carried a woman who was not looking at me.',
    replay: 'The platform, again. The tile sentence still standing.',
  },
  784: {
    date: 'November 1',
    body: 'The deal. No prison \u2014 the system\u2019s mercy, not the story\u2019s. Forty-seven-three after settlements, the hall\u2019s concession barred, and the pen the same weight it was in January.',
    replay: 'The agreement, again. The pen, the same weight.',
  },
  795: {
    date: 'November 12',
    body: 'The exits. June\u2019s conditions resolved and the window gone dark at the wrong hours; Rachel\u2019s one 1 a.m. call; Eddie\u2019s floor in Charlotte \u2014 the exit that is also a home.',
    replay: 'The exits, again. The light still off at the wrong hours.',
  },
  802: {
    date: 'November 19',
    body: 'The call home. Ada, eight thousand, zero questions \u2014 and this time I answered the one she didn\u2019t ask. The card kept its stamp. The dial tone after is the longest sound there is.',
    replay: 'The call, again. The stamp still on the card.',
  },
  809: {
    date: 'November 26',
    body: 'The terminal. Thanksgiving eve, a duffel bag, and Rosa to no one and to everyone: you looked like that once. Day 1 again.',
    replay: 'The stairs, again. Day 1, again.',
  },
});

/** The station's caption (the composeCaption seam — content.ts calls
 *  this before its C4/C3/C2/C1/C0 branches, the same precedence the
 *  stations themselves ride). */
export function c5CaptionOf(day: number): C5Caption | undefined {
  return C5_CAPTIONS[day];
}

// ===========================================================================
// 4. The season compressions — R4's named transition, consuming days
// ===========================================================================

/** One compression — the c4pack's own shape. `seasonCut` marks a
 *  compression that crosses a season boundary (crossedSeasonCut proves
 *  it — the C5 pack machine-checks its ONE crossing: summer→autumn at
 *  663→736, the hot late summer handing the block to the fall that
 *  takes everything). */
export interface C5Compression {
  from: number;
  to: number;
  intro: string;
  city: string;
  seasonCut?: boolean;
}

/** The nine compressions (the gaps between the ten stations). The fixed
 *  block events ride the calendar's own voice: the suit's discovery,
 *  Corvus's nervous lenders, Wexler's rescheduled inspections, the
 *  corkboard's public books, the estate's probate (doc 12 §2's row +
 *  doc 09 §2's week-by-week — the City-Moves Law's C5 season). */
export const C5_COMPRESSIONS: readonly C5Compression[] = Object.freeze([
  {
    from: 663,
    to: 736,
    seasonCut: true,
    intro: 'Thirty-three days from the loaded machine to the chair \u2014 summer handing the block to the fall that takes everything: the Club\u2019s second window covered by rolling and the third window already in the grammar; Wexler reschedules the hall\u2019s inspections a fourth time and the calendar bends for somebody; June\u2019s conditions hold, which is its own kind of fray; the suit reaches discovery and Corvus\u2019s lenders get nervous the way weather gets nervous before a storm. The entries shorten. The nights don\u2019t. Summer hands the block over quietly, the way the machine\u2019s parts hand to each other \u2014 no ceremony, just sequencing.',
    city: 'The suit found its discovery. The lenders got quiet. Fall took the block\u2019s jacket and checked the pockets.',
  },
  {
    from: 736,
    to: 743,
    intro: 'One week from the chair to the receipts: the estate\u2019s probate opens its envelopes, Craig inherits the pen and uses it \u2014 the row to market, SaniHaul\u2019s paper maturing, Corvus\u2019s offer suddenly fair \u2014 and the block\u2019s casseroles move porch to porch like a relay nobody organized out loud. Kev\u2019s folder has been ready since spring. In case, he said. The case is scheduling itself.',
    city: 'The estate opened its envelopes. The row went to market. The porch fed the block one more week.',
  },
  {
    from: 743,
    to: 752,
    intro: 'Nine days from the post to the sale: the block reads at stoops and the investors call at windows, nineteen of them and then the friends of the nineteen; the Club\u2019s books do not survive the corkboard\u2019s daylight; the landlord of Leo\u2019s own room becomes, technically, Corvus-adjacent, which is a phrase the notebook writes twice to make sure it happened. Craig\u2019s pen moves at inheritor speed. The run is on.',
    city: 'The corkboard went public. The windows got crowds. The run ran.',
  },
  {
    from: 752,
    to: 756,
    intro: 'Four days from the sale to the last night: the shop\u2019s ovens run their final schedule \u2014 Eddie\u2019s recipes, Eddie\u2019s hours, the heart\u2019s orders already answered from Charlotte \u2014 and the block queues one more time for slices it doesn\u2019t need, which is the block\u2019s way of standing in line for a version of the corner that is ending. The new paper tapes its notices inside the row\u2019s windows. The locksmith has an appointment.',
    city: 'The ovens ran their last schedule. The block queued for nothing. Both counted.',
  },
  {
    from: 756,
    to: 760,
    intro: 'Four days from the last slice to the handover: the shop\u2019s window dark and the corner\u2019s silence learning its new shape; Kayla Fournier\u2019s office sharpening its questions; Priya\u2019s neutrality entering its final week of spring\u2019s price. The 7:40 runs on time. The platform\u2019s tiles hold. Somebody is carrying something.',
    city: 'The window stayed dark. The office sharpened its questions. The platform held its schedule.',
  },
  {
    from: 760,
    to: 784,
    intro: 'Twenty-four days from the platform to the deal: the cooperative witness cooperates, the misrepresentation questions find their forms, and Gino\u2019s favors surface as the kind of questions Leo can\u2019t answer well \u2014 not because he doesn\u2019t remember, because remembering out loud is what depositions are. The lawyer is decent and priced. The offices breathe forms. The concession\u2019s bar arrives before the restitution\u2019s number does, the way doors close before halls empty.',
    city: 'The forms found their man. The questions found their shape. November opened its ledger.',
  },
  {
    from: 784,
    to: 795,
    intro: 'Eleven days from the deal to the exits: the agreement\u2019s copies circulate their offices, the restitution\u2019s schedule builds its calendar, and the hall\u2019s concession opens without him \u2014 the render\u2019s sun now shining on somebody else\u2019s counter. June\u2019s conditions resolve in their own time, met or unmet, the light deciding before the words do. Rachel\u2019s number sits in the phone like a coin he hasn\u2019t spent. Eddie\u2019s floor waits in Charlotte, real, which is the worst kind of offer.',
    city: 'The hall opened without him. The light kept its own hours. The phone held its coin.',
  },
  {
    from: 795,
    to: 802,
    intro: 'One week from the exits to the call home: the garden\u2019s beds go down for winter with Yoli\u2019s clipboard out \u2014 whatever gets said there this week gets said to everybody; the plan\u2019s three shapes sit in the notebook like shoes waiting; and the payphone\u2019s coin return is empty because the coins are spoken for. Ada\u2019s number is the one that never changed. Some calls you make because the schedule says so. This one the schedule never had to say.',
    city: 'The garden put its beds down. The plan sat in shoes. The coins were spoken for.',
  },
  {
    from: 802,
    to: 809,
    intro: 'One week from the call to the terminal: Thanksgiving loads its ovens citywide, the Inwood basement\u2019s stairs practice their announcements, and the duffel bag learns its strap. Deshaun\u2019s cousin\u2019s diner runs a grill that teaches what the corner taught. The schedule\u2019s first dollar has its envelope and its note. The chapter\u2019s last line is already written; it is only waiting for the date.',
    city: 'The city ate. The stairs practiced. The duffel learned its strap.',
  },
]);

export function c5CompressionFrom(day: number): C5Compression | undefined {
  return C5_COMPRESSIONS.find((c) => c.from === day);
}

/** The linger machine's answer for a C5 day: 'next' = the ordinary
 *  tomorrow; a compression = the montage-then-roll; 'cut' = the season's
 *  last linger (the snow-on-the-hoarding cut). Null for any day that
 *  isn't C5's — the machine above owns those. */
export function c5RailFor(day: number): 'next' | 'cut' | { compress: number } | null {
  if (!Number.isInteger(day) || day < C5_FIRST_DAY || day > C5_LAST_DAY) return null;
  if (day === C5_LAST_DAY) return 'cut';
  const comp = c5CompressionFrom(day);
  if (comp) return { compress: comp.to };
  return 'next';
}

// ===========================================================================
// 5. The C5→C6 season cut — the chapter close (doc 06 §C5 handoff)
// ===========================================================================

/** The cut's diary latch (the block layer's law: the latch IS the
 *  entry; the cut plays once per save). */
export const C5_CUT_ID = 'c5-cut-snowhoarding';

/** Doc 06 §C5 handoff, staged: the season cut — snow on the Works'
 *  hoarding, the hall's lights on the render now real, JMA's winter
 *  drive flyer on the board, and under it the old slip: a lost cat,
 *  still lost. The sim continues; the player chooses the morning's
 *  first walk. */
export const C5_CUT_STAGE =
  'Snow on the Works\u2019 hoarding. The hall\u2019s lights on the render are real now \u2014 somebody else\u2019s sun, on somebody else\u2019s counter. A flyer on the board: JMA\u2019s winter drive. Under it, the old slip: a lost cat, still lost. The debts are on a schedule. The basement announces its guests. The diner\u2019s grill is honest work. The sim continues; the player chooses the morning\u2019s first walk.';

/** The cut's wall (authored, doc 13 voice): the season kept; what
 *  December brings is the next wave's content — the hold says so in the
 *  world's own voice, never in project-speak. */
export const C5_CUT_WALL =
  'December opens cold and the basement\u2019s stairs announce the milkman like a herald. The diner\u2019s shift runs through Deshaun\u2019s cousin, the schedule\u2019s first dollar has its envelope, and the notebook starts its next page with the only line that survived the whole year intact. Some seasons you survive in ink. This one, the notebook writes, you survived. The next one is the player\u2019s.';

/** The cut's marker entry — the latch (doc 13 §3's C5 voice: terse,
 *  facts, times, amounts — the performance voice dead; the end state's
 *  arithmetic and the last line). Dated Dec 1, Y3. */
export function c5CutEntry(): FieldDiaryEntry {
  return {
    id: C5_CUT_ID,
    kind: 'EVENT',
    date: dateOfCalendarDay(C5_CUT_DAY),
    epistemic: 'FACT',
    body: `The year\u2019s books, closed: $1,212 in the account, $47,300 on the schedule \u2014 in order, her handwriting on the first dollar. The Inwood basement at $1,150, stairs that announce guests. A diner shift in Long Island City via Deshaun\u2019s cousin. The hall opens without me; the concessions carry the Compact\u2019s papers; Kev\u2019s shelf is what the amends make it. The soup was good, though. October, remember? The soup was good. ${C5_DAY1_LINE}`,
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

// ===========================================================================
// 6. The chapter's Lost-Year fragment — F5 the payphone (doc 02 §6.2)
// ===========================================================================

export const C5_FRAGMENT_IDS = {
  f5: 'c5-f5-payphone',
} as const;

function fragmentRow(id: 'F5') {
  const row = FRAGMENTS.find((f) => f.id === id);
  if (!row) throw new Error(`c5pack: fragment ${id} missing from the register`);
  return row;
}

/** F5 — doc 02 §6.2's row verbatim (trigger: "Rachel's retelling
 *  completes the circuit"): the call-home week, the coins leaving, the
 *  dial tone after. One RECALL entry, the wobble style, once per save
 *  (the F4/F7 precedent). */
export function f5Entry(calendarDay: number): FieldDiaryEntry {
  const row = fragmentRow('F5');
  return {
    id: C5_FRAGMENT_IDS.f5,
    kind: 'RECALL',
    date: dateOfCalendarDay(calendarDay),
    epistemic: 'RECALL',
    body: row.content,
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

// ===========================================================================
// 7. The contradiction ledger's strikes — K2 (seeded C2, struck C5) and
//    K5 (written at the deal, struck at the call home)
// ===========================================================================

/** K2's correction (doc 03 §5.2's row verbatim), applied through the
 *  strike seam at the receipts' scene close. The strike quotes the
 *  offending verdict in the C2 entry's own body. */
export function c5K2Correction(calendarDay: number): { day: number; strike: string; margin: string } {
  return { day: calendarDay, strike: C5_K2_STRIKE, margin: C5_K2_MARGIN };
}

/** K5 — written at the deal (doc 03 §5.2's record, tagged FACT: the last
 *  lie the ledger carries, and it knows). Struck at the call home. */
export function k5Entry(day: number): FieldDiaryEntry {
  return {
    id: 'c5-k5-necessary',
    kind: 'EVENT',
    date: dateOfCalendarDay(day),
    epistemic: 'FACT',
    body: C5_K5_BODY,
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

/** K5's correction (doc 03 §5.2's row verbatim), applied through the
 *  strike seam at the call home's scene close. The strike quotes the
 *  offending phrase; the margin is the truth, signed. */
export function c5K5Correction(calendarDay: number): { day: number; strike: string; margin: string } {
  return { day: calendarDay, strike: C5_K5_STRIKE, margin: C5_K5_MARGIN };
}

// ===========================================================================
// 8. The chapter's diary entries (C5_IDS + the station beats' inks)
// ===========================================================================

export const C5_IDS = {
  loaded: 'c5-loaded-machine',
  funeral: 'c5-doris-funeral',
  receipts: 'c5-the-receipts',
  run: 'c5-the-run',
  lastNight: 'c5-the-last-slice',
  handover: 'c5-priya-handover',
  deal: 'c5-the-deal',
  k5: 'c5-k5-necessary',
  exits: 'c5-the-exits',
  callHome: 'c5-the-call-home',
  send: 'c5-ada-send',
  terminal: 'c5-the-terminal',
} as const;

function entry(
  id: string,
  kind: FieldDiaryEntry['kind'],
  day: number,
  epistemic: FieldDiaryEntry['epistemic'],
  body: string,
  node?: string,
): FieldDiaryEntry {
  return {
    id, kind,
    date: dateOfCalendarDay(day),
    ...(node ? { node } : {}),
    epistemic, body, links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

/** Doc 06 §C5 event 1 — Doris (the funeral porch, day 736): the chair,
 *  the ledger, the last time the block is one thing. */
export function funeralEntry(day: number): FieldDiaryEntry {
  return entry(C5_IDS.funeral, 'EVENT', day, 'FACT',
    'September 14. Doris died at home, in the chair, the ledger on her lap. The funeral is the last time the block is one thing \u2014 I know it while it\u2019s happening. The porch\u2019s arithmetic is small and final: the estate needs liquidity, Craig inherits the pen, the lawyer\u2019s sympathy is billable. She kept her ledger to the last page. I keep mine past mine.');
}

/** Doc 06 §C5 event 3 — the receipts (the stoops, day 743): the post's
 *  title verbatim, the annotations, the city's diary going quiet. K2's
 *  strike rides the same scene (the strike seam). */
export function receiptsEntry(day: number): FieldDiaryEntry {
  return entry(C5_IDS.receipts, 'EVENT', day, 'FACT',
    `September 21. Kev handed Deniz the folder \u2014 every promise, every text, kept in case. The post is titled \u201C${C5_POST_TITLE}\u201D and the annotations are Deniz\u2019s: the sign-in sheet with my withdrawal line, the stall-the-Oktays text, the 500-jobs math beside the deck\u2019s 340. The city\u2019s diary, for the first time, speaks about me to the block \u2014 and goes quiet to me. The block\u2019s verdict is mixed, tired, and alive. They still queue.`);
}

/** Doc 06 §C5 events 4 + 7's first half — the run and the sale (the
 *  stoops and the corkboard, day 752). */
export function runEntry(day: number): FieldDiaryEntry {
  return entry(C5_IDS.run, 'EVENT', day, 'FACT',
    'September 30. The run ends because there is nothing left to run on: nineteen investors became a crowd, the crowd became a phone tree, and the Club\u2019s books met daylight and did not survive it. Craig closed the row\u2019s sale this morning. My own room\u2019s landlord is, technically, Corvus-adjacent. The amounts are the story. The amounts are always the story.');
}

/** Doc 06 §C5 event 7's second half — the shop's last night (the shop's
 *  window, day 756): the last slice, the four seconds. */
export function lastNightEntry(day: number): FieldDiaryEntry {
  return entry(C5_IDS.lastNight, 'EVENT', day, 'FACT',
    'October 4. The shop\u2019s last night. I close alone. The last slice of the last pie goes on the counter for nobody \u2014 which is also for Eddie, which is also for me. The lights go off. I stand in the dark four seconds longer than the scene needs. CLOSED OCT 4. The four seconds don\u2019t fit in a ledger. I write them anyway.');
}

/** Doc 06 §C5 event 5 — Priya's handover (the platform, day 760): her
 *  pricing, owned, verbatim. */
export function handoverEntry(day: number): FieldDiaryEntry {
  return entry(C5_IDS.handover, 'PERSON', day, 'FACT',
    `October 8. Priya gave them the Club ledger \u2014 the one she\u2019s been sitting on since spring, neutral the whole time. Her neutrality, priced at last. On the platform, verbatim, hers: \u201C${C5_PRIYA_LINE}\u201D She\u2019s right twice. I built a board and never asked what my pieces stood on. The ledger\u2019s at the investigation\u2019s desk now.`);
}

/** Doc 06 §C5 event 6 — the deal (the lawyer's office, day 784): the
 *  shape verbatim, the arithmetic, the system's mercy. K5 rides its own
 *  entry (the record, tagged FACT). */
export function dealEntry(day: number): FieldDiaryEntry {
  return entry(C5_IDS.deal, 'EVENT', day, 'FACT',
    `November 1. The deal: a ${C5_DEAL_SHAPE}, civil and administrative, not criminal-lead \u2014 misrepresentations in a private offering, books kept informally, Gino\u2019s favors surfaced as questions I can\u2019t answer well. Restitution of $47,300 after settlements, and ${C5_CONCESSION_BAR}. No prison. The system\u2019s mercy, not the story\u2019s. The lawyer is decent and priced. The pen is the same weight it was in January.`);
}

/** K5's record — doc 03 §5.2's row (written at the deal, tagged FACT:
 *  the last lie the ledger carries). Struck at the call home. */
export function k5AtDeal(day: number): FieldDiaryEntry {
  return entry(C5_IDS.k5, 'EVENT', day, 'FACT', C5_K5_BODY);
}

/** Doc 06 §C5 event 8 — the exits (the phone and the window, day 795):
 *  Rachel's sentence verbatim, Eddie's two truths verbatim, June's
 *  conditions resolved. */
export function exitsEntry(day: number): FieldDiaryEntry {
  return entry(C5_IDS.exits, 'PERSON', day, 'FACT',
    `November 12. The exits. June\u2019s conditions resolved \u2014 met or unmet, she is gone from the daily map, and the window\u2019s light went dark at the hours it used to argue with me about. Rachel took his one 1 a.m. call: \u201C${C5_RACHEL_LINE}\u201D The sentence he never takes back. Eddie called from Charlotte: \u201C${C5_EDDIE_LINE}\u201D Love without absolution, and the floor is real, which is the worst kind of offer.`);
}

/** Doc 06 §C5 event 9 — the call home (the payphone, day 802): the $8,000,
 *  zero questions, the answered question, the stamp. F5 rides its own
 *  entry (the wobble style). K5's strike rides the scene (the strike
 *  seam). The R9 send rides the scene (the dispatch's sealed seam). */
export function callHomeEntry(day: number): FieldDiaryEntry {
  return entry(C5_IDS.callHome, 'PERSON', day, 'FACT',
    `November 19. Ada, $8,000, zero questions \u2014 the money moves before the hello finishes, and this time I answer the question she doesn\u2019t ask. It is the shortest scene in the game and the only one the whole cast would applaud. The payphone eats its coins; the dial tone after is the longest sound there is. Bea\u2019s envelope finds the record: the schedule\u2019s first dollar, and Ada\u2019s note in a hand I\u2019d know anywhere \u2014 ${C5_ADA_NOTE}`);
}

/** The R9 send's own marker (the ONE send, once per save — the save's
 *  sent_postcard field is the durable record; this entry is the album's
 *  ink). */
export function adaSendEntry(day: number): FieldDiaryEntry {
  return entry(C5_IDS.send, 'EVENT', day, 'FACT',
    'The card keeps its stamp. One card, one address, one send \u2014 the only paper the whole story mails. The album holds the rest; this one travels.');
}

/** Doc 06 §C5 events 10 + 11 — the terminal (the subway stairs, day
 *  809): Rosa's line verbatim, the Inwood end state, the last line. */
export function terminalEntry(day: number): FieldDiaryEntry {
  return entry(C5_IDS.terminal, 'EVENT', day, 'FACT',
    `November 26, Thanksgiving eve. The city eats; the diner glows; I come up the subway stairs with a duffel bag. From the bodega doorway, Rosa, to no one and to everyone: \u201C${C5_ROSA_TERMINAL_LINE}\u201D The Inwood basement: $1,212 in the account, stairs that announce guests, $1,150 a month. The diner job in Long Island City via Deshaun\u2019s cousin. The main story\u2019s end state fits on a phone card. The chapter\u2019s last diary line: ${C5_DAY1_LINE}`);
}

// ===========================================================================
// 9. The picks — the register's three nodes, dressed for the seam
// ===========================================================================

/** One pick pack — the c4pack's own shape (core/choiceNodes holds the
 *  register's canonical rows; the pack dresses them for the seam). */
export interface C5ChoicePack {
  nodeId: 'N5a' | 'N5b' | 'N5c';
  prompt: string;
  options: ReadonlyArray<{
    optionId: string;
    label: string;
    blurb: string;
  }>;
}

/** N5a — settle or fight (doc 06 §C5 major decisions): "settle and
 *  sign, or fight and lose more (fighting is available, real, and costs
 *  the remaining relationships)." The restitution arithmetic rides the
 *  pick: settle is $47,300; the fight is the register's own ±$6,000
 *  ($53,300, and the relationships with it). */
export const C5_N5A_PACK: C5ChoicePack = {
  nodeId: 'N5a',
  prompt: C5_N5A_PROMPT,
  options: Object.freeze([
    {
      optionId: 'settle',
      label: 'A \u2014 settle and sign',
      blurb: 'Forty-seven-three, the hall\u2019s concession barred, the schedule started before the ink dries. No prison \u2014 the system\u2019s mercy, not the story\u2019s. The pen is the same weight it was in January. Some pens only get heavier.',
    },
    {
      optionId: 'fight-and-lose-more',
      label: 'B \u2014 fight and lose more',
      blurb: 'Fifty-three-three, because fighting bills by the hour, and the hours bill the relationships too: Yoli\u2019s door stiffens, Deshaun\u2019s patience runs its meter, and the block\u2019s tired verdict gets one more exhibit. Fighting is available. Fighting is real. Fighting costs what\u2019s left.',
    },
  ]),
};

/** N5b — the plan (doc 06 §C5 major decisions): "the restitution plan's
 *  shape (garment-district pace / diner shifts + the amends ledger /
 *  disappear to Charlotte with Eddie's offer of a floor)." The map's
 *  shape rides the pick (C6's first chapter reads the flag). */
export const C5_N5B_PACK: C5ChoicePack = {
  nodeId: 'N5b',
  prompt: C5_N5B_PROMPT,
  options: Object.freeze([
    {
      optionId: 'ledger-pace',
      label: 'A \u2014 garment-district pace',
      blurb: 'The district\u2019s piecework, the schedule met on paper, the debts paid in order and alone. The fastest number and the smallest life \u2014 forty-seven-three by the calendar, nobody watching, nobody waiting up.',
    },
    {
      optionId: 'diner-plus-ledger',
      label: 'B \u2014 diner shifts + the amends ledger',
      blurb: 'Long Island City via Deshaun\u2019s cousin, the green notebook\u2019s faces on every line, the slow way with witnesses. The smallest number per week and the only plan where the debts are people and stay people.',
    },
    {
      optionId: 'charlotte-floor',
      label: 'C \u2014 Charlotte floor',
      blurb: 'Eddie\u2019s offer, the exit that is also a home \u2014 the farthest from every debt but the money, and the money can travel. Some floors are mercy. Some floors are just far.',
    },
  ]),
};

/** N5c — tell the block (doc 06 §C5 major decisions): "what to tell the
 *  block (a public reckoning at the garden — available, brutal, the only
 *  path that keeps Yoli's door ajar)." The block's pricing rides the
 *  pick. Silence posts NOTHING — the Silent class (doc 10 §1), the
 *  flags the only witness. */
export const C5_N5C_PACK: C5ChoicePack = {
  nodeId: 'N5c',
  prompt: C5_N5C_PROMPT,
  options: Object.freeze([
    {
      optionId: 'garden-reckoning',
      label: 'A \u2014 the garden reckoning',
      blurb: 'Yoli\u2019s clipboard out, the beds down for winter, and the block in its own garden to hear it from the man who did it. Available. Brutal. The only path that keeps Yoli\u2019s door ajar \u2014 and the only one where the block hears it from him.',
    },
    {
      optionId: 'statement',
      label: 'B \u2014 the written statement',
      blurb: 'The Compact\u2019s list gets its letter: cleaner, colder, filed. The paper says the things and the voice doesn\u2019t have to be in the room. Filing is a form of telling. It is not the same thing.',
    },
    {
      optionId: 'silence',
      label: 'C \u2014 silence',
      blurb: 'The block\u2019s verdict arrived in September, tired and alive. Silence adds nothing and takes nothing. The soup was good, though. The block will remember what it remembers.',
    },
  ]),
};

/** The per-option ink — the pick's own diary line (doc 10's doors,
 *  written in the C5 voice). The silence door writes NOTHING (the
 *  Silent class): the absence is the record. */
const N5A_DIARY: Readonly<Record<string, string>> = {
  settle: 'I signed. Forty-seven-three, the concession barred, the schedule\u2019s first dollar already promised in order. The system\u2019s mercy, not the story\u2019s \u2014 I wrote that down so the notebook would stop pretending otherwise. The pen was the same weight. That\u2019s the part I\u2019ll never explain to anyone who wasn\u2019t holding it in January.',
  'fight-and-lose-more': 'I fought. Fifty-three-three now, and the hours billed the doors while they billed the hours: Yoli\u2019s door stiffened, Deshaun\u2019s meter ran, and the block\u2019s tired verdict got one more exhibit. Fighting is real. So is the invoice. Both are mine.',
};
const N5A_NOTE: Readonly<Record<string, string>> = {
  settle: 'Signed. $47,300, in order. The concession\u2019s barred \u2014 the hall opens without me.',
  'fight-and-lose-more': 'Fought. $53,300 now, and the doors billed with the hours.',
};

const N5B_DIARY: Readonly<Record<string, string>> = {
  'ledger-pace': 'The plan is the district\u2019s pace: piecework, the schedule met on paper, the debts in order and alone. The fastest number and the smallest life. I chose the smallest life on purpose, which is either discipline or hiding, and the notebook declines to rule.',
  'diner-plus-ledger': 'The plan is the diner and the ledger: LIC via Deshaun\u2019s cousin, the green notebook\u2019s faces on every line, the slow way with witnesses. The smallest number per week. The only plan where the debts stay people.',
  'charlotte-floor': 'The plan is Eddie\u2019s floor: Charlotte, the exit that is also a home, the farthest from every debt but the money. Some floors are mercy. I couldn\u2019t tell, standing on this one, which kind this is. The notebook writes it down anyway.',
};
const N5B_NOTE: Readonly<Record<string, string>> = {
  'ledger-pace': 'The plan: garment-district pace. $47,300 on the calendar, alone.',
  'diner-plus-ledger': 'The plan: the diner\u2019s shifts and the amends ledger. The debts stay people.',
  'charlotte-floor': 'The plan: Eddie\u2019s floor. Charlotte. The exit that is also a home.',
};

const N5C_DIARY: Readonly<Record<string, string>> = {
  'garden-reckoning': 'I said it at the garden, to the block, standing where the Compact was founded: all of it, in order, out loud, brutal the way the doc promised and the block deserved. Yoli\u2019s door is ajar. It\u2019s the only door I have left and it cost everything to keep it that way, and it was worth the price, which is the first thing the year bought that I\u2019d call mine.',
  statement: 'The statement went out on the Compact\u2019s list \u2014 cleaner, colder, filed. The paper says the things. The voice didn\u2019t have to be in the room. Filing is a form of telling. It is not the same thing. The block got the words and kept the verdict.',
};
const N5C_NOTE: Readonly<Record<string, string>> = {
  'garden-reckoning': 'The garden heard it from him. Yoli\u2019s door: ajar.',
  statement: 'The statement is filed with the Compact\u2019s list. The block kept its verdict.',
};

export interface C5PickApply {
  ok: boolean;
  reason?: 'bad-node' | 'bad-option' | 'locked';
  flags: string[];
  ledger: LedgerEntry[];
  diary: FieldDiaryEntry | null;
  note: string | null;
}

/** The pick's landing (the c4pack's own shape): resolve through the
 *  register's machine, write the ledger act, hand the flags to the
 *  world store, carry the ink. Silence writes NOTHING at the decision —
 *  the Silent class, the flags the only witness. */
export function applyC5Pick(
  nodeId: 'N5a' | 'N5b' | 'N5c',
  optionId: string,
  calendarDay: number,
): C5PickApply {
  const none: C5PickApply = { ok: false, reason: 'bad-node', flags: [], ledger: [], diary: null, note: null };
  const node = nodeById(nodeId);
  if (!node) return none;
  const res = resolveChoice(node, optionId);
  if (!res.ok || !res.flagWrites || !res.ledgerWrites) {
    return { ...none, reason: res.reason === 'locked' ? 'locked' : 'bad-option' };
  }
  const date = dateOfCalendarDay(calendarDay);
  const ledger: LedgerEntry[] = res.ledgerWrites.map((w, i) => ({
    id: `led-${nodeId}-${optionId}-${i + 1}`,
    kind: w.kind,
    date,
    refs: [...w.refs],
    weight: 1,
    visibility: w.visibility,
    node: nodeId,
  }));
  let body: string | null = null;
  let note: string | null = null;
  if (nodeId === 'N5a') {
    body = N5A_DIARY[optionId] ?? null;
    note = N5A_NOTE[optionId] ?? null;
  } else if (nodeId === 'N5b') {
    body = N5B_DIARY[optionId] ?? null;
    note = N5B_NOTE[optionId] ?? null;
  } else {
    body = N5C_DIARY[optionId] ?? null; // silence: the absence is the record
    note = N5C_NOTE[optionId] ?? null;
  }
  const diary: FieldDiaryEntry | null = body
    ? {
        id: `c5-${nodeId.toLowerCase()}-${optionId}`,
        kind: 'EVENT',
        date,
        node: nodeId,
        epistemic: 'FACT',
        body,
        links: ['notebook'],
        visibility: 'private',
        corrections: [],
      }
    : null;
  return { ok: true, flags: [...res.flagWrites], ledger, diary, note };
}

/** The restitution arithmetic, machine-pinned (doc 09 §4 + the
 *  register's own ±$6K): the settle door is $47,300; the fight door is
 *  $53,300. The deal's entry and the tests read this — the numbers are
 *  the chapter's honesty. */
export function c5RestitutionFor(optionId: 'settle' | 'fight-and-lose-more'): number {
  return optionId === 'settle' ? C5_RESTITUTION_SETTLE : C5_RESTITUTION_FIGHT;
}

// ===========================================================================
// 10. The pack's self-check — the no-dead-content law, checked once
// ===========================================================================

export interface C5PackReport {
  ok: boolean;
  problems: string[];
}

/** The pack checks itself against the machines it feeds: the station
 *  keys are exactly the chapter's canon days (each landing on its doc 12
 *  §2 date through the calendar module); every compression's `to` is a
 *  station, ordered, and the ONE season cut is the calendar's own
 *  crossing (summer→autumn at 663→736 — crossedSeasonCut
 *  machine-checked from the dates themselves); every queue opens with
 *  Idris and pays honest; the canon lines are verbatim (doc 06 §C5 /
 *  doc 03 §5.2 / doc 09 §4 / doc 02 §6.2); the canon values are pinned;
 *  the fragment's row matches the register; K2's strike quotes the C2
 *  body's own verdict; K5 is written at the deal and struck at the call
 *  home; every option of every node resolves (N5c's silence with an
 *  EMPTY ledger — the Silent class, machine-checked); the restitution
 *  arithmetic is pinned (settle $47,300, fight $53,300); and no authored
 *  prose carries a real-world year (the canon law: apostrophe form
 *  only). */
export function validateC5Pack(): C5PackReport {
  const problems: string[] = [];
  // the stations: the exact keys, each on its canon date
  const expectedKeys = C5_STATION_DAYS.join(',');
  const CANON_KEYS = '663,736,743,752,756,760,784,795,802,809';
  if (expectedKeys !== CANON_KEYS) {
    problems.push(`station keys are ${expectedKeys} (law: ${CANON_KEYS})`);
  }
  const canonDates: Readonly<Record<number, GameDate>> = {
    663: { y: 3, m: 7, d: 3 },
    736: { y: 3, m: 9, d: 14 },
    743: { y: 3, m: 9, d: 21 },
    752: { y: 3, m: 9, d: 30 },
    756: { y: 3, m: 10, d: 4 },
    760: { y: 3, m: 10, d: 8 },
    784: { y: 3, m: 11, d: 1 },
    795: { y: 3, m: 11, d: 12 },
    802: { y: 3, m: 11, d: 19 },
    809: { y: 3, m: 11, d: 26 },
  };
  for (const day of C5_STATION_DAYS) {
    if (calendarDayOf(canonDates[day]!) !== day) {
      problems.push(`station ${day} does not land on its canon date through the calendar module`);
    }
  }
  // the compressions: from a station, to a station, ordered, the ONE cut marked
  const cutPairs = C5_COMPRESSIONS.filter((c) => c.seasonCut).map((c) => `${c.from}\u2192${c.to}`);
  if (cutPairs.join(',') !== '663\u2192736') {
    problems.push(`the season-cut flag belongs to 663\u2192736 (summer\u2192autumn), got ${cutPairs.join(',')}`);
  }
  for (const c of C5_COMPRESSIONS) {
    if (!C5_STATIONS[c.from]) problems.push(`compression from ${c.from} is not a station`);
    if (!C5_STATIONS[c.to]) problems.push(`compression to ${c.to} is not a station`);
    if (c.to <= c.from) problems.push(`compression ${c.from}\u2192${c.to} does not move forward`);
    if (c.seasonCut) {
      const crossed = crossedSeasonCut(c.from, c.to);
      if (!crossed) problems.push(`compression ${c.from}\u2192${c.to} is flagged season-cut but crosses no season boundary`);
    }
  }
  // the unflagged compressions prove the negative: no season crossing missed
  for (const c of C5_COMPRESSIONS) {
    if (!c.seasonCut && crossedSeasonCut(c.from, c.to)) {
      problems.push(`compression ${c.from}\u2192${c.to} crosses a season boundary but is not flagged season-cut`);
    }
  }
  // the queues: every station's queue opens with Idris and pays honest
  for (const day of C5_STATION_DAYS) {
    const q = C5_STATIONS[day]!.queue;
    if (q.length !== 3) problems.push(`station ${day}'s queue is not three orders`);
    if (q[0]!.who !== 'idris') problems.push(`station ${day}'s queue does not open with Idris`);
    for (const o of q) {
      if (!(o.pay > 0)) problems.push(`station ${day}'s queue pays dishonest (0 or less)`);
    }
  }
  // the canon lines, verbatim (independent of the constants' names)
  const lines: readonly [string, string, string][] = [
    [C5_POST_TITLE, 'The Paper Trail of the Man Who Feeds Alder Heights.', 'doc 06 §C5 event 3'],
    [C5_DENIZ_LINE, 'I didn\u2019t do this to you. I filed you.', 'doc 06 §C5 important conversations'],
    [C5_PRIYA_LINE, 'I told you once \u2014 learn which tile you are. You never asked which tile I was.', 'doc 06 §C5 important conversations'],
    [C5_RACHEL_LINE, 'You did this in Ohio too.', 'doc 06 §C5 event 8'],
    [C5_EDDIE_LINE, 'You were the best hire I ever made. And the worst thing that happened to that shop. Both true. Come see me when you\u2019re done being sorry.', 'doc 06 §C5 event 8'],
    [C5_ROSA_TERMINAL_LINE, 'You looked like that once.', 'doc 06 §C5 event 10'],
    [C5_DAY1_LINE, 'Day 1 again.', 'doc 06 §C5 event 10'],
    [C5_ADA_NOTE, 'Pay your debts in order.', 'doc 09 §4 (Ada, via Bea)'],
    [C5_K5_BODY, 'I did what had to be done.', 'doc 03 §5.2 (K5 record)'],
    [C5_K5_MARGIN, 'I did what I wanted and called it necessary. \u2014 L', 'doc 03 §5.2 (K5 correction)'],
    [C5_K2_STRIKE, 'Net good.', 'doc 03 §5.2 (K2\u2019s offending verdict)'],
    [C5_K2_MARGIN, 'I saved the shop. The Compact might have held. Both true. Only one was mine to write.', 'doc 03 §5.2 (K2 correction)'],
    [C5_DEAL_SHAPE, 'deferred-prosecution-style agreement', 'doc 06 §C5 event 6'],
    [C5_CONCESSION_BAR, 'a bar from operating the hall\u2019s concession', 'doc 06 §C5 event 6'],
  ];
  for (const [have, want, law] of lines) {
    if (have !== want) problems.push(`canon line drifted from ${law}`);
  }
  // the canon values
  const values: readonly [number, number, string][] = [
    [C5_RAISE_TOTAL, 61500, 'doc 09 §4 (the raise)'],
    [C5_RAISE_INVESTORS, 19, 'doc 06 §C5 (nineteen investors)'],
    [C5_CORVUS_RELEASES, 14200, 'doc 09 §4 (Corvus\u2019s nine releases)'],
    [C5_RESTITUTION_SETTLE, 47300, 'doc 06 §C5 event 6 / doc 09 §4'],
    [C5_RESTITUTION_FIGHT, 53300, 'the register\u2019s ±$6K (doc 10\u2019s N5a row)'],
    [C5_ACCOUNT_INWOOD, 1212, 'doc 06 §C5 event 11 / doc 09 §3'],
    [C5_INWOOD_RENT, 1150, 'doc 09 §3 (the basement)'],
    [C5_ADA_AMOUNT, 8000, 'doc 06 §C5 event 9'],
    [C5_UNITS_AFFORDABLE, 280, 'doc 09 §6 (C6\u2019s seed)'],
  ];
  for (const [have, want, law] of values) {
    if (have !== want) problems.push(`canon value drifted from ${law}`);
  }
  // the restitution arithmetic closes (the doc's own identity)
  if (C5_CORVUS_RELEASES + C5_RESTITUTION_SETTLE !== C5_RAISE_TOTAL) {
    problems.push('the money does not close: releases + restitution must equal the raise');
  }
  // the fragment's row matches the register
  const f5 = fragmentRow('F5');
  if (f5.chapter !== 'C5') problems.push('F5\u2019s register row is not marked C5');
  if (f5.content !== 'Coins leaving; the dial tone after; his own voice saying a sentence he can\u2019t hear') {
    problems.push('F5\u2019s register row drifted from doc 02 §6.2 (verbatim law)');
  }
  // K5: written at the deal, tagged FACT (the last lie the ledger carries)
  const k5 = k5Entry(784);
  if (k5.epistemic !== 'FACT') problems.push('K5 is not tagged FACT at the deal (doc 03 §5.2: the record, wrongly)');
  if (C5_K5_STRIKE !== 'had to be done') {
    problems.push('K5\u2019s strike drifted from doc 03 §5.2\u2019s record (verbatim law)');
  }
  // K2's strike quotes the C2 body's own verdict (the strike seam's law)
  if (!'The Compact was going to fail anyway. I saved the shop. Net good.'.includes(C5_K2_STRIKE)) {
    problems.push('K2\u2019s strike does not quote the C2 body\u2019s own verdict (the strike seam\u2019s law)');
  }
  // every option of every node resolves, signatures pairwise unique
  for (const pack of [C5_N5A_PACK, C5_N5B_PACK, C5_N5C_PACK]) {
    for (const o of pack.options) {
      const apply = applyC5Pick(pack.nodeId, o.optionId, C5_FIRST_DAY);
      if (!apply.ok) problems.push(`${pack.nodeId}/${o.optionId} does not resolve through the register`);
    }
    const sigs = pack.options.map((o) =>
      applyC5Pick(pack.nodeId, o.optionId, C5_FIRST_DAY).ledger.map((l) => l.refs.join('|')).join('#'));
    if (new Set(sigs).size !== sigs.length) {
      problems.push(`${pack.nodeId}'s option signatures are not pairwise unique`);
    }
  }
  // the Silent class, machine-checked: N5c/silence posts NOTHING
  const silence = applyC5Pick('N5c', 'silence', C5_LAST_DAY);
  if (silence.ok && silence.ledger.length !== 0) {
    problems.push('N5c/silence posts a ledger act (the Silent class: nothing posts)');
  }
  if (silence.ok && silence.diary !== null) {
    problems.push('N5c/silence writes ink (the Silent class: the absence is the record)');
  }
  if (!silence.ok || silence.flags.length === 0) {
    problems.push('N5c/silence must still write its flag (the flag is the only witness)');
  }
  // the restitution arithmetic, machine-pinned through the door
  if (c5RestitutionFor('settle') !== 47300) problems.push('the settle door\u2019s restitution is not 47,300');
  if (c5RestitutionFor('fight-and-lose-more') !== 53300) problems.push('the fight door\u2019s restitution is not 53,300');
  // no real-world years in the authored prose (apostrophe form only)
  const prose = [
    ...C5_STATION_DAYS.map((d) => [
      C5_STATIONS[d]!.begin, C5_STATIONS[d]!.wake, C5_STATIONS[d]!.rushDone,
      C5_STATIONS[d]!.climbNote, C5_STATIONS[d]!.goldenNote,
      ...C5_STATIONS[d]!.queue.map((o) => o.reaction),
    ]).flat(),
    C5_CUT_STAGE, C5_CUT_WALL, c5CutEntry().body,
    ...Object.values(N5A_DIARY), ...Object.values(N5B_DIARY), ...Object.values(N5C_DIARY),
    C5_N5A_PROMPT, C5_N5B_PROMPT, C5_N5C_PROMPT,
    funeralEntry(736).body, receiptsEntry(743).body, runEntry(752).body,
    lastNightEntry(756).body, handoverEntry(760).body, dealEntry(784).body,
    exitsEntry(795).body, callHomeEntry(802).body, terminalEntry(809).body,
  ];
  const yearRe = /\b(1[0-9]{3}|20[0-9]{2})\b/;
  for (const text of prose) {
    if (yearRe.test(text)) problems.push(`a real-world year leaked into authored prose: ${text.slice(0, 60)}\u2026`);
  }
  return { ok: problems.length === 0, problems };
}
