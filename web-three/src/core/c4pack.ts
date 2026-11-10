/**
 * core/c4pack.ts — the C4 content pack (narrative/14 §7 step 10
 * continued — doc 06 §C4, "The Face", Jan 6 – Jun 28, Y3).
 *
 * The chapter of the performance winning while the ledger bleeds. The
 * pack mirrors the c0/c1/c2/c3 conventions exactly:
 *
 *  - the station table: THIRTEEN playable days keyed by canon calendar
 *    day (doc 12 §2's C4 row: the signing Jan 14, the jobs-fair Mar 8,
 *    Kev's fall Apr 11, Camille's exit Apr 26, the diary discovery May 9,
 *    Rachel enters May, Tito's story May 30, therapy starts Jun 3, the
 *    villain-question mid-June, the first missed window Jun 24 — each
 *    machine-verified through calendarDayOf before a line of wiring;
 *    the villain-question's own day is the RAILS table's R4 minDate,
 *    Jun 15, Y3 — the spine's machine owns the date, the station lands
 *    on it);
 *  - the compressions: the gaps between stations, CONSUMED never played,
 *    with TWO season cuts the calendar proves (winter→spring 493→546,
 *    spring→summer 629→633 — crossedSeasonCut machine-checked);
 *  - the rails: c4RailFor answers the linger machine ('next' /
 *    compression / 'cut' / null);
 *  - the C4→C5 season cut: staged at the frontier's last linger, the
 *    entry dated Jul 3, Y3, the chapter through advanceChapter's own
 *    door — the wall holds (the roll into C5's stations is the C5
 *    wave's law, the honest pattern every wave has kept);
 *  - the Lost-Year fragments F4 (the parking structure) and F7 (the
 *    railing) — doc 02 §6.2's register rows verbatim, ONE RECALL entry
 *    each, the wobble style, once per save;
 *  - R12's opt-in resource note: F7 is the first trigger to fire in
 *    canon order (May 23 — the therapy session only plays if taken, and
 *    that is Jun 15 at the earliest; the C5 investigation is later), so
 *    the note spends at the railing — core/guardrails' own once-latch;
 *  - the contradiction ledger's heaviest entries: K4 written honestly
 *    as GUESS at the signing and KEPT (doc 03 §5: "the ledger's cruelest
 *    entry is the one he leaves standing"), K3 written at the discovery
 *    and struck the same scene ("She knows the edited cut.");
 *  - the four register nodes N4a/N4b/N4c/N4d (core/choiceNodes' C4 rows)
 *    dressed for the seam: pick packs, per-option ink, notes, and
 *    applyC4Pick through resolveChoice — N4d's never rides the Silent
 *    class again (nothing posts; the flags are the only witness);
 *  - the pack checks itself (validateC4Pack): the canon lines verbatim,
 *    the canon values pinned, every option resolving, signatures
 *    pairwise unique, the Silent class machine-checked, no real-world
 *    years in the authored prose.
 *
 * Staging judgments this wave owns (documented here, per the §6.4 law):
 *  - "Rachel enters (May)" (doc 12 §2's row) lands May 16 — after the
 *    discovery's fight (May 9), so her un-impressible mirror arrives
 *    while June's absence is fresh (doc 06 §C4 event 6's staging);
 *  - the El Vann papers day lands May 23 — the bridge story (F7's
 *    trigger, doc 07 §2.x: "El Vann: the paper wall; the bridge story")
 *    is fresh exactly one week before Tito's mirror-story (May 30), the
 *    two 1994s the villain-question reads side by side; Doris's hint to
 *    Yoli (doc 07 §2.10) rides the same station's wake;
 *  - "therapy starts (Jun 3)" (doc 12 §2) is the thread's OPENING — the
 *    booking (the appointment circled twice on the Map, doc 08 §6's
 *    trigger); the first session plays the villain-question's morning
 *    when N4d takes therapy ("The 2 a.m. scene's morning", doc 10 §3 —
 *    the scene is 2 a.m. Jun 15, the appointment the morning's own slot,
 *    circled and not attended at 2 a.m. — the trigger assembly satisfied
 *    to the letter); doc 06's "the first session is 60% silence" is the
 *    session's own scene, whenever the showing-up happens.
 *
 * Pure state, zero DOM — the core seam law (the c3pack's own header).
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
// 1. The canon constants (doc 06 §C4 / doc 12 §2 / doc 03 §5 / doc 07 §2.5)
// ===========================================================================

/** C4's window (doc 06 §C4 period: Jan 6 – Jun 28, Y3). */
export const C4_FIRST_DAY = calendarDayOf({ y: 3, m: 1, d: 6 });
export const C4_LAST_DAY = calendarDayOf({ y: 3, m: 6, d: 28 });

/** The C4→C5 season cut's morning (doc 06 §C4 handoff: July heat —
 *  doc 06 §C5 period start Jul 3, Y3). */
export const C4_CUT_DAY = calendarDayOf({ y: 3, m: 7, d: 3 });

/** The villain-question's machine date — the RAILS table's R4 minDate
 *  (core/chapterRails.ts). The station map lands on it. */
export const C4_VILLAIN_DAY = calendarDayOf({ y: 3, m: 6, d: 15 });

/** The pledge video's arithmetic (doc 06 §C4 starting circumstances):
 *  Marisol's deck says 340 and Leo says 500 "because round numbers
 *  fund." The gap IS the chapter's thesis-in-falsehood, machine-pinned. */
export const C4_DECK_JOBS = 340;
export const C4_PLEDGE_JOBS = 500;

/** Miss Odessa's $140, covered personally, in cash, told to no one
 *  (doc 06 §C4 event 10). The diary tells on him anyway. */
export const C4_ODESSA_COVER = 140;

/** Tito's 1994 (doc 06 §C4 event 7): Ernie, the signatures, the
 *  consulting position, the rain that came inside. */
export const C4_TITO_SIGNATURES = 214;

// ---- the canon lines, verbatim (the pack self-checks them) ----

/** Doc 06 §C3 handoff / §C4 — the signing (Jan 14, Eddie's pen). "The
 *  kindest sentence in the chapter, and wrong." */
export const C4_EDDIE_PEN_LINE =
  'Sign it. A man should sign his own ladder.';

/** Doc 06 §C4 event 2 — the thesis-in-falsehood (the pledge debrief,
 *  Leo's line). */
export const C4_BIG_NUMBERS_LINE =
  'Big numbers protect the little guys';

/** Doc 06 §C4 event 2 — the audit's finding, quoted. */
export const C4_AUDIT_LINE =
  'projected, condition-dependent';

/** Doc 06 §C4 event 2 — the clip's afterlife. */
export const C4_MEME_LINE =
  'the kid who lied on TV';

/** Doc 06 §C4 event 4 — Camille's exit, verbatim. */
export const C4_CAMILLE_LINE =
  'You talk about people like they\u2019re pieces on a board. I\u2019m on your board.';

/** Doc 06 §C4 event 5 — June's fight, the quiet one, verbatim. */
export const C4_JUNE_FIGHT_LINE =
  'You let me believe I knew you. That\u2019s the part I can\u2019t renew.';

/** Doc 06 §C4 event 6 — Rachel's surgical question, verbatim. */
export const C4_RACHEL_LINE =
  'Do you actually like any of these people, or do you administer them?';

/** Doc 06 §C4 event 7 — Ernie's sentence, the mirror's own words. */
export const C4_ERNIE_LINE =
  'The block was going to lose anyway. I saved what I could.';

/** Doc 06 §C4 event 7 — Tito's thirty years. */
export const C4_TITO_SIT_LINE =
  'Sit with that, muchacho. I sat with it thirty years.';

/** Doc 08 §6 — the scene's only line, written, not spoken. */
export const C4_WRITTEN_LINE =
  'The diary doesn\u2019t lie. The writer did.';

/** Doc 06 §C4 diary developments — the QUESTION tray's first unroutable. */
export const C4_QUESTION_LINE =
  'Who am I when the room clears?';

/** Doc 06 §C4 event 10 — the EVIDENCE's deletion, logged (doc 03: nothing
 *  in this system truly deletes). */
export const C4_DELETED_NOTE =
  'The slip was photographed, then deleted. The deletion is itself logged. Nothing in this system truly deletes.';

/** Doc 06 §C4 handoff — Craig, drunk, at the laundromat. The C5 wave's
 *  own seed. */
export const C4_CRAIG_SOLD_LINE =
  'as good as sold';

// ===========================================================================
// 2. The station table — thirteen playable days (doc 12 §2's C4 row)
// ===========================================================================

/** One playable station of C4's season — the c3pack's own shape, the
 *  loop's mouths (begin/wake/queue/rushDone/climb/golden). The C4 voice
 *  (doc 13 §3: "Fractured. Longer nights, shorter entries") — the
 *  entries run shorter, the nights run longer. */
export interface C4Station {
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

// ------------------------------------------------------------- day 485 ----

/** The season opens (doc 06 §C4 starting circumstances): the public face
 *  of Juniper Commons — press, panels, the borough paper's profile. The
 *  "40 names" list. Eddie's shop gets its busiest winter — and its last
 *  quiet one. */
const DAY485_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CA new year, coffee, and you have a folder with your name on it that isn\u2019t the court\u2019s. In my country that folder would mean something else. Here it means cameras. Hold your pen like it\u2019s heavy.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, stamping snow off: \u201CThe borough paper did you a whole profile. My wife read it twice. She never reads twice. Whatever you are now, you\u2019re printed.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CForty names on that list of yours and every one of them thinks they\u2019re first. That\u2019s not a gripe. That\u2019s the trick working.\u201D',
  },
];

const DAY485: C4Station = {
  day: 485,
  title: 'The Face\u2019s Winter',
  begin: 'Day 485. January 6, and the corner knows me before I know myself: the borough paper\u2019s profile is pinned inside the bodega\u2019s window, the panel invite is in the folder, the forty names are in the folder, and the render\u2019s dome is on the newsstand\u2019s magazine like weather. Facts only: the face is winning. The ledger is bleeding. The two sentences don\u2019t agree and the notebook keeps both.',
  wake: 'Rosa: \u201CHappy New Year, coffee. You\u2019re the face of something now \u2014 I heard it from three people before breakfast. Faces freeze out here. Keep yours warm from the inside.\u201D',
  queue: DAY485_QUEUE,
  rushDone: 'Three orders and the folder rides the counter like a third menu. The profile, the panel, the forty names. The busiest winter, Eddie says. And the quietest, which he doesn\u2019t say.',
  climbNote: 'The notebook opens the new year the way ledgers open: NINETEEN DEBTS, carried over. One signature, pending. Then the arithmetic I don\u2019t write: the face\u2019s winter is the shop\u2019s last quiet one, and only one of us knows it.',
  goldenNote: 'Snow on the far towers, the render\u2019s dome glowing its sales-sun behind the Works fence. Forty names, one face. The corner kept me warm today. The folder wants the rest of me. The year is young and the pen is heavier than Eddie promised.',
};

// ------------------------------------------------------------- day 493 ----

/** Doc 06 §C3 handoff → §C4 — the signing (Jan 14, fixed date, doc 12
 *  §2): the offer letter signed with Eddie's pen. Behind the scene, K4
 *  — written honestly as GUESS and kept (doc 03 §5: the ledger's
 *  cruelest entry is the one he leaves standing). */
const DAY493_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe fourteenth. In my country contracts are signed with witnesses, coffee. Today your witness is a pen you borrowed from a man who trusts you. Sign like both of those are true.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular: \u201CThe hall\u2019s real now? Build-out money, a vendor list, hiring? My cousin\u2019s asking which stall. I told her the coffee man\u2019s word. Don\u2019t make her a liar.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CFive hundred jobs, the banner says. My brother does the math for a living and he says the deck says three-forty. I said round numbers fund. He said so do banks.\u201D',
  },
];

const DAY493: C4Station = {
  day: 493,
  title: 'The Pen',
  begin: 'Day 493. January 14. The letter is on the counter and Eddie\u2019s pen is in my jacket exactly where December put it. Five hundred local jobs goes in the pledge video because the deck says three hundred forty and because round numbers fund. Sign it. A man should sign his own ladder \u2014 he said it kindly, and it\u2019s wrong, and I\u2019m going to sign anyway, which is the whole chapter in one motion.',
  wake: 'Rosa: \u201CSigning day. The block\u2019s money is in that room too \u2014 nineteen doors of it. However big the number goes, the money was ours first. Write that on the same page as the five hundred.\u201D',
  queue: DAY493_QUEUE,
  rushDone: 'Three orders and the signature is dry. The pen goes back in the jacket like it knows it\u2019s evidence now. Kev\u2019s face is on the banner and my math is in his mouth and both of those feel fine today, which is how the wrong ones feel.',
  climbNote: 'The notebook writes the signing\u2019s facts, and then \u2014 honestly, the tag chosen like a man choosing a mask he\u2019ll be buried in \u2014 the GUESS: Corvus is a partner. Marisol is straight with me, for a developer. I label it GUESS and I keep it. That\u2019s the entry I don\u2019t strike.',
  goldenNote: 'The shop\u2019s windows gold on snow, the letter signed, the pen warm from my hand. Eddie asked what it all meant and I gave him the big-number sentence and he nodded the way you nod at weather. The biggest lie I own is made of true words. Happy signing day.',
};

// ------------------------------------------------------------- day 546 ----

/** Doc 06 §C4 event 2 — the jobs-fair op (Mar 8, fixed date): Kev
 *  fronts the hiring pledge at a press conference — his face on the
 *  banner, his voice on the clip, Leo's numbers in his mouth. Behind
 *  the scene, N4a — the jobs number's three doors. And after the op:
 *  F4 — the parking level under the render site (doc 02 §6.2's
 *  trigger), the fragment riding the op's own garage. */
export const C4_N4A_PROMPT =
  'The pledge video\u2019s number is on the teleprompter and Kev is wearing it like a shirt that fits him. Marisol\u2019s deck says three hundred forty. I said five hundred because round numbers fund. The cameras are live. Correct it, let it fly, or leak it myself and blame Wexler \u2014 the last one is available, and it\u2019s dark.';

const DAY546_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe fair is today. In my country a number promised in public is a debt with a crowd for a witness. Whatever you told the cameras \u2014 the crowd is the interest.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, phone out: \u201CThe clip\u2019s already up. Kev\u2019s good on camera \u2014 better than the number deserves. Five hundred jobs, he says, like it\u2019s a pie he\u2019s counting slices of.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CSaw the banner truck go by. THE FUTURE HIRES HERE. Big letters. My dad always said big letters are where small truths go to disappear.\u201D',
  },
];

const DAY546: C4Station = {
  day: 546,
  title: 'The Jobs-Fair Op',
  begin: 'Day 546. March 8, and the Works fence has a stage built against it. Facts only: Kev fronts the hiring pledge, his face on the banner, his voice on the clip, my numbers in his mouth. Big numbers protect the little guys \u2014 that\u2019s the sentence I gave him, and it\u2019s the chapter\u2019s whole thesis wearing a lanyard. The cameras are live and the number is wrong and I know exactly how wrong.',
  wake: 'Rosa: \u201CThey built a stage on our fence, coffee. Our fence. Whatever they\u2019re announcing, it\u2019s announcing it with our chain-link in the shot. Stand where you can see the whole frame.\u201D',
  queue: DAY546_QUEUE,
  rushDone: 'Three orders and the clip is everywhere by noon. Kev\u2019s face does it; my math did it. The banner says THE FUTURE HIRES HERE and the deck in my bag says three-forty and the video says five hundred and every version of today is on tape.',
  climbNote: 'The notebook writes the op\u2019s arithmetic twice \u2014 the deck\u2019s number and the banner\u2019s \u2014 and leaves the difference standing between them like a tripwire I laid for myself. The audit will find it in April. April knows.',
  goldenNote: 'Dusk on the fence, the stage coming down, the banner folded into somebody\u2019s truck. The garage under the render site smelled like fluorescent light and a hood still warm. I cried in a parking structure and I couldn\u2019t tell you why. The notebook can\u2019t either. That\u2019s the point of it.',
};

// ------------------------------------------------------------- day 580 ----

/** Doc 06 §C4 event 2's April + doc 12 §2's fixed event — Kev's fall
 *  (Apr 11): the audit lands ("projected, condition-dependent"), the
 *  clip becomes a meme ("the kid who lied on TV"), Kev finds JMA's hard
 *  line, and Yoli takes him in — the coalition gains its angriest
 *  researcher. */
const DAY580_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe audit came for the number and found the man. In my country we say the paper eats the hand that fed it. Your Kev is learning what the banner was made of.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, not looking up: \u201CThe clip\u2019s a meme now. Kid who lied on TV. My nephew sent it to me with three laughing faces. The kid\u2019s twenty-three, coffee. Twenty-three.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular: \u201CSaw Kev at the garden yesterday, sitting with Yoli of all people. He looked like a man reading his own file. She was writing. He was watching her write.\u201D',
  },
];

const DAY580: C4Station = {
  day: 580,
  title: 'Kev\u2019s Fall',
  begin: 'Day 580. April 11. The audit\u2019s language is final: the jobs are projected, condition-dependent. The clip is a meme \u2014 the kid who lied on TV. Kev\u2019s face did it; my math did it; the internet can\u2019t tell the difference and doesn\u2019t want to. Kev found JMA\u2019s hard line, and Yoli took him in. The coalition gains its angriest researcher. I did that. Every arrow of it.',
  wake: 'Rosa: \u201CThe boy came by the cart. Didn\u2019t order \u2014 just stood there reading the meme on his phone like it was somebody else\u2019s funeral. I gave him the small black on the house. Some days the corner feeds whoever the corner broke.\u201D',
  queue: DAY580_QUEUE,
  rushDone: 'Three orders and the meme has a life support system: shares. The audit\u2019s eight words did what eight words do. Kev is Yoli\u2019s now, and Yoli\u2019s people file things. He\u2019ll file me someday, with annotations. I know because I\u2019d do it too.',
  climbNote: 'The notebook writes the audit\u2019s phrase and the meme\u2019s, and then the sentence the whole spring was building: his face did it; my math did it. The difference is a defense I won\u2019t have in April\u2019s next April. The entry keeps both names. The ledger keeps me.',
  goldenNote: 'The garden\u2019s late light, Yoli\u2019s table lamp on in the shed, two silhouettes doing the coalition\u2019s homework. The kid who lied on TV is somebody\u2019s researcher now, and his anger has a filing system. The future hires here. It also audits here. Write that down too.',
};

// ------------------------------------------------------------- day 595 ----

/** Doc 06 §C4 event 4 — Camille's exit (Apr 26, "if pursued" — the
 *  staging is door-neutral: the pursuit's difference rides the C3
 *  pantry latch; if never pursued, her distance lands as one cold
 *  pantry scene and a transfer notice). */
const DAY595_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe teacher transfers today. In my country when the good ones leave we ask what the water was like. Ask yourself, coffee. The water is the question.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CMs. Odom\u2019s taking the pantry drive to a school in the Bronx. Tuesdays won\u2019t be the same. She didn\u2019t tell you? Huh. She told everybody else.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CHer boxes are packed in the garden\u2019s south table. Labeled. In her handwriting. That woman labels the things she\u2019s leaving so you\u2019ll know exactly what\u2019s gone.\u201D',
  },
];

const DAY595: C4Station = {
  day: 595,
  title: 'The Transfer Notice',
  begin: 'Day 595. April 26. Camille\u2019s boxes are labeled in her own handwriting and the transfer notice is dated like an apology that isn\u2019t one. You talk about people like they\u2019re pieces on a board. I\u2019m on your board. She said it once, quietly, the way exits work when they\u2019re earned. The board lost its best piece and the board doesn\u2019t know it yet, which is the board\u2019s whole problem.',
  wake: 'Rosa: \u201CCamille\u2019s Tuesday goes to the Bronx. The pantry\u2019s in good hands here \u2014 she made sure of that first, that\u2019s the kind she is \u2014 but the Tuesdays will know. Some people leave a room colder by leaving it.\u201D',
  queue: DAY595_QUEUE,
  rushDone: 'Three orders and the south table stands labeled and light. The transfer notice rides the board like a mirror I didn\u2019t ask for. The alternative life takes a job in the Bronx. The coulds write themselves a forwarding address.',
  climbNote: 'The notebook writes the exit\u2019s facts and then the margin\u2019s arithmetic: if I\u2019d sat at her Tuesday, if I\u2019d carried cans instead of decks. The coulds don\u2019t itemize. They just stand there, labeled, in her handwriting.',
  goldenNote: 'Dusk on the garden, the boxes gone, the table bare. The board goes on. Boards do. That\u2019s what she said, and the terrible thing is the game needs pieces, and the other terrible thing is she was never a piece, and both terrible things are true, and the pen writes neither.',
};

// ------------------------------------------------------------- day 608 ----

/** Doc 06 §C4 event 5 — June finds the diary (May 9, fixed date): not
 *  snooping — dusting. The secret entries: the condition, K2, Gino's
 *  lunch, the room she never knew existed. The fight is quiet, which is
 *  how her fights work. K3 fires — written, then struck the same scene
 *  (doc 03 §5's table: FACT, corrected "She knows the edited cut.").
 *  Behind the scene, N4b — June after discovery's three doors. */
export const C4_N4B_PROMPT =
  'June\u2019s conditions are on the table between us, issued once, non-negotiable, take-it-or-leave. Full disclosure with the conditions. Partial \u2014 the edited cut, again. Or move out, and let her keep the window light. One door keeps her, barely, on conditions the doc numbers.';

const DAY608_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CYou didn\u2019t sleep, coffee. In my country we say the house knows before the heart does. Whatever the dusting found \u2014 the house already knew.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular: \u201CJune came in this morning before her shift, sat in the back, didn\u2019t touch her latte. Quiet ones don\u2019t slam doors. They just stop opening them.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CShe left the caf\u00E9\u2019s keys on the hook and walked the long way. I\u2019ve seen that walk. That\u2019s the walk of somebody counting what they know.\u201D',
  },
];

const DAY608: C4Station = {
  day: 608,
  title: 'The Edited Cut',
  begin: 'Day 608. May 9. She was dusting. The notebook was under the bed because the notebook lives under the bed. She read the condition, and K2, and the lunch that wouldn\u2019t say the word, and the room in my head she never knew existed. You let me believe I knew you. That\u2019s the part I can\u2019t renew. Quiet, the whole fight. That\u2019s how her fights work. That\u2019s how they\u2019re worse.',
  wake: 'Rosa: \u201CYou both look like weather\u2019s coming but neither of you brought an umbrella. I\u2019m not asking. I\u2019m just saying the corner sees everything and charges nothing.\u201D',
  queue: DAY608_QUEUE,
  rushDone: 'Three orders and the shop feels like a rented room. June\u2019s conditions are issued \u2014 once, non-negotiable, take-it-or-leave. The notebook writes K3 the way I\u2019ve been writing all year: the lie first, the tag honest, the correction waiting like a tide.',
  climbNote: 'The notebook writes June and I are solid. She knows the important stuff. \u2014 tagged FACT, because that\u2019s the insult of it: every word was true and the sentence was a lie. The strike lands the same evening. She knows the edited cut. Both lines stay. That\u2019s the ledger\u2019s law and today it\u2019s a mirror.',
  goldenNote: 'Dusk through her window\u2019s light, on, off, on \u2014 the window I know the way you know a lighthouse. The condition named out loud, or the books shown, or the door. The conditions are a map of exactly where I went wrong, numbered. The pen knows. The pen always knows.',
};

// ------------------------------------------------------------- day 615 ----

/** Doc 06 §C4 event 6 — Rachel (May; the wave's staging: May 16).
 *  Fitz's gallery thing. She recognizes him instantly; he performs; she
 *  declines the performance. Her questions are surgical. She mentions
 *  the payphone once, flatly, and refuses to elaborate. */
const DAY615_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe gallery woman is back. In my country we say a mirror that doesn\u2019t flatter is a teacher you pay nothing. You\u2019ll avoid her. You should not.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CFitz\u2019s gallery opening \u2014 your whole face is on the invite list, coffee man. Everybody who\u2019s everybody and one woman from Ohio who knew you first.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CThe paper did a whole thing on the hall\u2019s face. You\u2019re printed everywhere this week. My barber says printed people should walk more, not less.\u201D',
  },
];

const DAY615: C4Station = {
  day: 615,
  title: 'The Un-Impressible Mirror',
  begin: 'Day 615. May 16. Fitz\u2019s gallery, the velvet corner, the room where the Face is an exhibit. Rachel recognizes me instantly. I perform. She declines the performance \u2014 declines it the way you decline a flyer. Do you actually like any of these people, or do you administer them? Surgical. She mentions the payphone once, flatly, and refuses to elaborate. The payphone. The circuit has its own archivist.',
  wake: 'Rosa: \u201CYou\u2019ve got gallery posture today, coffee. Shoulders two inches higher. Whatever mirror you\u2019re walking into \u2014 the ones that don\u2019t flatter are the only ones that tell time.\u201D',
  queue: DAY615_QUEUE,
  rushDone: 'Three orders and the gallery\u2019s aftertaste stays. She didn\u2019t laugh at the right places because they weren\u2019t the right places, they were the performed places. June\u2019s window stays off. Rachel\u2019s questions have a filing system too. Everyone I know is becoming a researcher of me.',
  climbNote: 'The notebook writes the gallery\u2019s facts and then her sentence, verbatim, because some questions are evidence: do you actually like any of these people, or do you administer them? The pen hovered on administer. The pen knows what it heard. GUESS nothing. FACT it.',
  goldenNote: 'Golden hour on the avenue, the gallery\u2019s lights on behind me, the payphone sitting in my head like a coin I never spent. Ohio people don\u2019t elaborate. They wait. The worst audiences are the ones who knew you before the poster had your face.',
};

// ------------------------------------------------------------- day 622 ----

/** Doc 06 §C4 + doc 07 §2.x — the El Vann papers and the bridge story
 *  (May 23, the wave's staging — see the header): what he does with the
 *  papers is N4c (return / copy / locate-for-Yoli — the chapter records
 *  the choice; C5 prices it). The bridge story is F7's trigger (doc 02
 *  §6.2) — the railing surfaces HERE, and R12's opt-in resource note
 *  spends at its firing (the first trigger in canon order — the therapy
 *  session only plays if taken, Jun 15 at the earliest; the C5
 *  investigation is later). Doris's hint to Yoli (doc 07 §2.10) rides
 *  the wake. */
export const C4_N4C_PROMPT =
  'The El Vann papers are in my hands \u2014 the letter, the option, fifty years of the block\u2019s paper that says what this corner always was. Return them to her drawer. Copy them first, because knowledge is leverage. Or give Yoli the location and let the coalition own its own history. The chapter records the choice. The fall will price it.';

const DAY622_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CYou\u2019re carrying somebody\u2019s history in that bag, coffee. In my country we say documents are ancestors with ink. Carry them like the ancestors are watching. They are.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CYoli\u2019s been asking around about the old option papers. Ms. Doris told her \u2014 ask Eleanor, and ask your father why she\u2019d keep it. That woman\u2019s sentences are made of stairs.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CThe Works fence grew ANOTHER lock this week. You measure a thing when you\u2019re counting on it, and you lock a thing when you\u2019re afraid of it. They\u2019re both, and everyone knows.\u201D',
  },
];

const DAY622: C4Station = {
  day: 622,
  title: 'The Papers and the Bridge',
  begin: 'Day 622. May 23. El Vann\u2019s community room, the paper wall\u2019s room, and today the papers are mine to hold: the letter, the option, the block\u2019s whole paper spine. Developments fail, dear. Documents don\u2019t. They wait. Then, over the radiator\u2019s opinions, unprompted, the bridge story \u2014 the one from before my time, about a man on a railing over dark water, and how the story ends exactly where it ends, no conclusion attached. Cold metal. River dark. Full stop.',
  wake: 'Rosa: \u201CMs. Doris sent word through Yoli \u2014 ask Eleanor, then ask your father why she\u2019d keep it. Stairs, that woman. Everything with her is stairs. Watch your step and carry the papers flat.\u201D',
  queue: DAY622_QUEUE,
  rushDone: 'Three orders and the papers weigh what paper weighs and what knowing weighs. The bridge story sits in my chest like the railing\u2019s cold got through my coat. The notebooks says nothing yet. Some ink waits for the room to clear.',
  climbNote: 'The notebook writes the papers\u2019 inventory \u2014 the letter, the option, the bylaws \u2014 and then the railing writes itself: cold metal; river dark; full stop. No conclusion. The entry is three lines long and it is the truest thing in the book this month. The notebook also makes the offer it makes once: if any of this sits close to home, it\u2019s okay to step away.',
  goldenNote: 'Dusk on the East Tenement\u2019s fire escape, the papers flat in their folder, the railing story standing in me like weather. Whatever the bridge was, the story refuses to finish, and I recognize the shape of a thing that won\u2019t finish. Yoli\u2019s light is on across the garden. The location, or the papers, or the drawer. The chapter is counting.',
};

// ------------------------------------------------------------- day 629 ----

/** Doc 06 §C4 event 7 — Tito's story (May 30, fixed date): the dominoes
 *  table, late, cheap wine. 1994: Ernie, the 214 signatures, the
 *  consulting position, the rain that came inside. The mirror at full
 *  length. The bible forbids any character drawing the equation — the
 *  player assembles it. */
const DAY629_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CTito opened the old bottle tonight. In my country the old bottle means a story with weight is coming. Sit down for it, coffee. Standing up, you only hear words.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular: \u201CTito\u2019s been setting the table since noon \u2014 the good tiles, the ones without chips. When the old man curates the dominoes, the night is going to be about something.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CSomebody said Tito knew the last developer. The one from the nineties. Ernie or Bernie or whatever. The block doesn\u2019t gossip about its own history. It just gets quiet around it.\u201D',
  },
];

const DAY629: C4Station = {
  day: 629,
  title: 'The Mirror at Full Length',
  begin: 'Day 629. May 30. The dominoes table, late, the cheap wine Tito saves for stories with weight. He tells the ’94 story unprompted: Ernie, the two hundred fourteen signatures, the consulting position, the rain that came inside. The block was going to lose anyway. I saved what I could. Then Tito looks at his tiles. Sit with that, muchacho. I sat with it thirty years. Nobody draws the line from him to me. The bible forbids it. The player draws it, and the pen shakes.',
  wake: 'Rosa: \u201CTito\u2019s telling the ninety-four story tonight. First time in years. I\u2019m closing the cart early \u2014 some stories you stand in, not serve through. Take the good seat. Leave the tiles alone.\u201D',
  queue: DAY629_QUEUE,
  rushDone: 'Three orders and the table\u2019s held its whole court. The old bottle is down to its last inch and the story is down to its last sentence and both are being saved, deliberately, for the person who needs the weight. That\u2019s me. It was always going to be me.',
  climbNote: 'The notebook writes the story\u2019s spine \u2014 Ernie, the signatures, the consulting position, the rain \u2014 and then Ernie\u2019s sentence, verbatim, the way evidence is kept: the block was going to lose anyway. I saved what I could. My hand knows the cadence. My hand has used the cadence. The entry does not say so. The entry doesn\u2019t have to.',
  goldenNote: 'The park\u2019s lamps on, the tiles racked, Tito\u2019s thirty years sitting on the table like the fifth bone nobody plays. I sat with it thirty years. The rain came inside. The K-Globes are amber through the gate across the street and the night is asking its question without asking. Sit with that.',
};

// ------------------------------------------------------------- day 633 ----

/** Doc 12 §2's "therapy starts (Jun 3)" — the thread's OPENING (the
 *  booking; see the header's staging judgment): the appointment circled
 *  twice on the Map and not attended — doc 08 §6's trigger assembly
 *  begins here. The first session itself plays the villain-question's
 *  morning when N4d takes therapy (doc 10 §3: "The 2 a.m. scene's
 *  morning"). */
const DAY633_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CYou circled an address twice on your map, coffee. In my country we say the second circle is the one that means it. Keep the appointment. The address is a door.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CDr. Feld took the Henderson street practice, you know. Good man, they say. Doesn\u2019t insurance-panel much. Cash, mostly. Quiet clients.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CYou look like a man with an errand he keeps rescheduling. The cart\u2019s the only thing you\u2019ve never rescheduled. Think about what that says.\u201D',
  },
];

const DAY633: C4Station = {
  day: 633,
  title: 'The Circled Address',
  begin: 'Day 633. June 3. Dr. Feld\u2019s block is two avenues east and the appointment is circled twice on the Map \u2014 twice, because the first circle didn\u2019t take. Facts only: the booking is made, the morning is June fifteenth, the room is quiet and cash-only and the door is a door. The notebook writes the address in the Map\u2019s own margin and the Map gains its third new pin this season. The render room, the gallery, this block.',
  wake: 'Rosa: \u201CNew pin on your map, coffee. The Feld block \u2014 good street, quiet. Whatever the room is for, going is the whole treatment. Everybody knows that. Almost everybody goes. Almost.\u201D',
  queue: DAY633_QUEUE,
  rushDone: 'Three orders and the circle is on the Map in ink. June 15, the morning after the night I can feel coming. The appointment doesn\u2019t know it\u2019s the morning after anything. Appointments don\u2019t know things. That\u2019s their whole advantage over me.',
  climbNote: 'The notebook writes the booking\u2019s facts and the margin\u2019s dread: circled twice. The Map\u2019s pins are getting heavy \u2014 the render room, the gallery, the Feld block. Every pin this season is a room where some version of me has to take the mask off or hold it on with both hands.',
  goldenNote: 'Dusk over the rooftops east, Dr. Feld\u2019s block a row of quiet windows two avenues away. The fifteenth is circled. The notebook doesn\u2019t ask what the room is for. The notebook was there for the whole diagnosis. The notebook knows exactly what the room is for.',
};

// ------------------------------------------------------------- day 645 ----

/** Doc 08 §6 — the villain-question scene (mid-June; the RAILS table's
 *  R4 minDate, Jun 15, Y3 — the spine's machine owns the date): 2 a.m.,
 *  the shop dark, the K-Globes amber through the gate. K2 and K4 read
 *  side by side; Tito's story fresh; Deniz at Halcyon; June's absence;
 *  the therapy appointment circled twice and not attended. No speech.
 *  One page of him reading his own record like evidence. The only line,
 *  written, not spoken. Behind the scene, N4d — the morning's three
 *  doors (therapy / defer / never — the game models showing up, not
 *  curing). */
export const C4_N4D_PROMPT =
  'The morning after the 2 a.m. scene. The appointment is circled on the Map and the room is two avenues east and the door is a door. Go to Dr. Feld. Defer it \u2014 the week\u2019s grind has a way of eating Fridays. Or never, and the thread never opens. The game models showing up, not curing.';

const DAY645_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CYou have the face of a man who read his own file at two in the morning. In my country we say the ink is patient \u2014 it waits for the reader to catch up. Go to the room, coffee. Catch up.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CLights were on at the shop till three. I figured inventory. Everybody figures inventory. Nobody figures a man with a notebook at a window. That\u2019s the private kind of night.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular: \u201CJune\u2019s window\u2019s been dark a week. Halcyon runs itself fine, which is worse somehow. A place running fine without you in it \u2014 that\u2019s a mirror with teeth.\u201D',
  },
];

const DAY645: C4Station = {
  day: 645,
  title: '2 A.M.',
  begin: 'Day 645. June 15. 2 a.m., the shop dark, the K-Globes amber through the gate. I open the notebook to K2 \u2014 net good \u2014 and find my own handwriting unfamiliar. I check the date. I check the ink. I check the corner where I sign. It is mine. K4 beside it, the GUESS I labeled honestly and kept: Corvus is a partner. Marisol is straight with me, for a developer. One page of me reading my own record like evidence. The diary doesn\u2019t lie. The writer did.',
  wake: 'Rosa: \u201CYou\u2019ve got 2 a.m. eyes, coffee. I\u2019m not asking what the notebook said. I\u2019ll say the one thing I know: the corner saw you keep the shop alive all winter and the corner doesn\u2019t score that at zero. Rooms lie. Corners don\u2019t.\u201D',
  queue: DAY645_QUEUE,
  rushDone: 'Three orders and the morning is the appointment\u2019s own morning, circled twice, not attended yet. The scene said what it said and asked nothing. No speech. A man with a notebook, at 2 a.m., under the K-Globes. The morning\u2019s only question is whether the circled address gets its third circle or its first visit.',
  climbNote: 'The notebook writes the scene\u2019s one line \u2014 the diary doesn\u2019t lie; the writer did \u2014 and then the QUESTION, the first one the tray can\u2019t route to anybody else: who am I when the room clears? No answer follows. No redemption toggle. No alignment flip. He doubles down in public and starts therapy in private, or doesn\u2019t. That\u2019s the whole design, and the pen puts it down unloaded.',
  goldenNote: 'Golden hour on the gate\u2019s chain-link, the K-Globes amber again, the appointment circled and the room two avenues east. The question is never answered by the game. It\u2019s answered by the player\u2019s next twenty hours of play. That\u2019s the design\u2019s whole thesis. Write that down too \u2014 no. Don\u2019t. Some things the pen leaves unloaded on purpose.',
};

// ------------------------------------------------------------- day 654 ----

/** Doc 06 §C4 event 10 — the first missed repayment (Jun 24, fixed
 *  date): quiet, administrative, terrible. A withdrawal that doesn't
 *  clear. He covers Miss Odessa's $140 personally, in cash, and tells
 *  no one. The diary tells on him anyway (EVIDENCE: the withdrawal
 *  slip, photographed, then deleted — the deletion itself logged;
 *  nothing in this system truly deletes). */
const DAY654_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe Club\u2019s first window opened in spring and today the machine bit. In my country we say the first missed payment is the cheapest one. The interest hasn\u2019t learned your name yet.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular: \u201CMiss Odessa came by the hall\u2019s office yesterday asking about her window\u2019s payout, real quiet. Eight hundred dollars of purse money in that machine, coffee. Whatever\u2019s wrong with it, she\u2019ll be the last one to say so.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CThe bank letter came to the garden\u2019s mail slot by mistake. I didn\u2019t open it. But I know the envelope\u2019s shape, and the shape was final. Windows close, coffee. Ask any landlord.\u201D',
  },
];

const DAY654: C4Station = {
  day: 654,
  title: 'The Withdrawal',
  begin: 'Day 654. June 24. Quiet, administrative, terrible: a withdrawal that doesn\u2019t clear. The Club\u2019s first repayment window and the machine says insufficient, politely, twice. I cover Miss Odessa\u2019s hundred forty in cash, personally, and tell no one. The envelope is in her purse by lunch and the ledger never sees my hand. The diary tells on me anyway. The diary tells on me always.',
  wake: 'Rosa: \u201CMiss Odessa\u2019s smiling today \u2014 her window\u2019s payout came through, she says. Funny thing, she says. The teller counted it twice, like it was cash. Corners see, coffee. Corners don\u2019t score. But corners see.\u201D',
  queue: DAY654_QUEUE,
  rushDone: 'Three orders and the shortfall has a shape now: $140 of Miss Odessa\u2019s purse covered in folding money, and nineteen faces of window math that doesn\u2019t clear. The books do not survive daylight. Daylight just hasn\u2019t looked yet.',
  climbNote: 'The notebook writes the EVIDENCE and then performs the deletion: the withdrawal slip, photographed, then deleted \u2014 and the deletion is itself logged, because nothing in this system truly deletes. The entry is the log of a deletion. The notebook is the one witness I can\u2019t cover in cash.',
  goldenNote: 'Dusk on the hall\u2019s mail slot, the bank\u2019s envelope shape sitting in the block\u2019s memory like a held breath. Her hundred forty is covered. Mine. In cash. The face of Juniper Commons pays his debts personally and off the books, which is two kinds of debt at once. Write that down. No \u2014 write the other thing. The slip\u2019s log. The truth needs the receipt.',
};

// ------------------------------------------------------------- day 658 ----

/** The chapter's books (the frontier's last station, Jun 28 — doc 06
 *  §C4 period end): the season's ledger, the fall's table set. The
 *  linger's cut hands the block to July heat (doc 06 §C4 handoff). */
const DAY658_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CLast card of the season, coffee. In my country the ledger closes with a page of debts and a page of gifts. This year your debts page got heavy. Check the gifts page. It\u2019s shorter. That\u2019s the reading.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CHeat\u2019s coming early. The Works fence grew another lock and Craig\u2019s truck\u2019s been at the laundromat every night this week. You lock a thing when you\u2019re afraid of it, and you drink when you\u2019ve signed it away.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular: \u201CThe hall\u2019s glass is in \u2014 the real glass, the render\u2019s glass. It\u2019s beautiful, coffee. It\u2019s going to be somebody\u2019s beautiful. The question this year never answered is whose.\u201D',
  },
];

const DAY658: C4Station = {
  day: 658,
  title: 'The Face\u2019s Books',
  begin: 'Day 658. June 28, the season\u2019s last morning. Facts only: the face is at peak visibility and peak hollowness, the receipt trail exists, the enemies are organized, the money is thin, and the one person who might have told me the truth is behind a condition wall of my own manufacture. Every piece of the fall is on the table. The fall is a season, and the season is July, and July is five days away.',
  wake: 'Rosa: \u201CLast cart-day of the season. You held the corner through the winter of your own poster, coffee, and the corner noticed. July\u2019s coming with weather and paper both. Feed them warm. Keep the notebook dry.\u201D',
  queue: DAY658_QUEUE,
  rushDone: 'Three orders and the season\u2019s arithmetic totals itself: K4 kept, K3 struck, F4 and the railing surfaced, the thread booked, the slip deleted, the machine\u2019s first bite taken. The performance is winning. The ledger is bleeding. Both sentences are true and neither one is the headline.',
  climbNote: 'The notebook closes the season\u2019s page the way the ledger closes: THE RECEIPTS EXIST. THE ENEMIES ARE ORGANIZED. THE MONEY IS THIN. JUNE IS BEHIND A CONDITION WALL. Then, at the bottom, small: the fall is not an event; it is a season. And seasons open on schedule.',
  goldenNote: 'First real heat on the far towers, the render\u2019s glass installed and gleaming its sales-sun. The Club\u2019s next window opens in July. Craig\u2019s truck idles at the laundromat like a held confession. The future hires here. The future also collects here. Happy July, wherever it\u2019s going.',
};

// ===========================================================================
// 3. The station map + captions (the loop's data side)
// ===========================================================================

export const C4_STATIONS: Readonly<Record<number, C4Station>> = Object.freeze({
  485: DAY485,
  493: DAY493,
  546: DAY546,
  580: DAY580,
  595: DAY595,
  608: DAY608,
  615: DAY615,
  622: DAY622,
  629: DAY629,
  633: DAY633,
  645: DAY645,
  654: DAY654,
  658: DAY658,
});

/** The station days, in order — the linger machine and the tests read
 *  this (data, not scattered conditionals). */
export const C4_STATION_DAYS: readonly number[] = Object.freeze(
  Object.keys(C4_STATIONS).map(Number).sort((a, b) => a - b),
);

export function c4StationOf(day: number): C4Station | undefined {
  return C4_STATIONS[day];
}

// ------------------------------------------------------ the postcards ----

/** One station's postcard caption (the shipped capture pipeline's own
 *  mouth — the card says its own DATE, because in C4 the dates are
 *  still the story). */
export interface C4Caption {
  date: string;
  body: string;
  replay: string;
}

const C4_CAPTIONS: Readonly<Record<number, C4Caption>> = Object.freeze({
  485: {
    date: 'January 6',
    body: 'The face\u2019s winter opens. The profile is pinned in the bodega\u2019s window, the folder is heavy, and the shop is having its busiest winter \u2014 and its last quiet one.',
    replay: 'The profile, again. The folder still weighs.',
  },
  493: {
    date: 'January 14',
    body: 'The pen. The letter signed with Eddie\u2019s pen because a man should sign his own ladder \u2014 the kindest sentence in the chapter, and wrong, and signed anyway.',
    replay: 'The signing, again. The pen is still evidence.',
  },
  546: {
    date: 'March 8',
    body: 'The jobs-fair op. Kev\u2019s face on the banner, my numbers in his mouth, and the difference between three-forty and five hundred taped live for the whole borough.',
    replay: 'The stage, again. The tripwire still laid.',
  },
  580: {
    date: 'April 11',
    body: 'Kev\u2019s fall. The audit\u2019s eight words, the meme, and the coalition gaining its angriest researcher \u2014 his face did it; my math did it; the internet can\u2019t tell.',
    replay: 'The audit, again. The eight words still eating.',
  },
  595: {
    date: 'April 26',
    body: 'The transfer notice. Camille\u2019s boxes labeled in her own handwriting, the board losing its best piece, and the coulds writing themselves a forwarding address.',
    replay: 'The notice, again. The Tuesdays still colder.',
  },
  608: {
    date: 'May 9',
    body: 'The edited cut. June was dusting. The fight is quiet, which is how her fights work \u2014 and the conditions are issued once, non-negotiable, take-it-or-leave.',
    replay: 'The dusting, again. The conditions still standing.',
  },
  615: {
    date: 'May 16',
    body: 'The gallery. Rachel recognizes me instantly and declines the performance \u2014 administer, she says, and the payphone sits in the room like a coin I never spent.',
    replay: 'The mirror, again. It still declines to flatter.',
  },
  622: {
    date: 'May 23',
    body: 'The papers and the bridge. Fifty years of the block\u2019s paper in my hands, and the railing story that ends exactly where it ends \u2014 cold metal; river dark; full stop.',
    replay: 'The papers, again. The story still won\u2019t finish.',
  },
  629: {
    date: 'May 30',
    body: 'The mirror at full length. Tito tells the ’94 story unprompted \u2014 Ernie, the signatures, the rain that came inside \u2014 and nobody draws the line. The player draws it.',
    replay: 'The table, again. The fifth bone still unplayed.',
  },
  633: {
    date: 'June 3',
    body: 'The circled address. Dr. Feld\u2019s block is two avenues east, the booking is made, and the Map gains its third new pin \u2014 circled twice, because the first circle didn\u2019t take.',
    replay: 'The booking, again. Still circled. Still not attended.',
  },
  645: {
    date: 'June 15',
    body: '2 a.m. The shop dark, the K-Globes amber, and one page of reading my own record like evidence. The diary doesn\u2019t lie. The writer did.',
    replay: 'The 2 a.m., again. The question still unloaded.',
  },
  654: {
    date: 'June 24',
    body: 'The withdrawal. A payment that doesn\u2019t clear, a hundred forty covered in cash and told to no one, and a slip photographed, then deleted \u2014 the deletion itself logged.',
    replay: 'The window, again. The log still keeps the deletion.',
  },
  658: {
    date: 'June 28',
    body: 'The face\u2019s books. Peak visibility, peak hollowness, the receipts existing, the enemies organized, the money thin \u2014 and July five days away, on schedule.',
    replay: 'The season\u2019s last card. July still opens on schedule.',
  },
});

/** The station's caption (the composeCaption seam — content.ts calls
 *  this before its C3/C2/C1/C0 branches, the same precedence the
 *  stations themselves ride). */
export function c4CaptionOf(day: number): C4Caption | undefined {
  return C4_CAPTIONS[day];
}

// ===========================================================================
// 4. The season compressions — R4's named transition, consuming days
// ===========================================================================

/** One compression — the c3pack's own shape. `seasonCut` marks a
 *  compression that crosses a season boundary (crossedSeasonCut proves
 *  it — the C4 pack machine-checks BOTH its crossings: winter→spring at
 *  493→546, spring→summer at 629→633). */
export interface C4Compression {
  from: number;
  to: number;
  intro: string;
  city: string;
  seasonCut?: boolean;
}

/** The twelve compressions (the gaps between the thirteen stations).
 *  The fixed block events ride the calendar's own voice: the audit's
 *  April, Deniz's Halcyon move, the co-op's show, Junior's wedding, the
 *  boiler fund's winter, the fence's locks, Craig's schedule-riding
 *  (doc 12 §2's row + §4's off-screen calendar — the City-Moves Law's
 *  C4 season). */
export const C4_COMPRESSIONS: readonly C4Compression[] = Object.freeze([
  {
    from: 485,
    to: 493,
    intro: 'Eight days from the profile to the pen: the press cycle learns Leo\u2019s name and feeds it back to him in its own font, the panel reads its rehearsal copy, and the shop\u2019s winter rush runs on Eddie\u2019s prep schedules and Leo\u2019s borrowed light. The Club\u2019s first repayment window sits in spring like a appointment nobody has to keep yet. Kev learns the pledge lines like a soliloquy.',
    city: 'The borough paper printed the face. The corner priced it in flour.',
  },
  {
    from: 493,
    to: 546,
    seasonCut: true,
    intro: 'Fifty-three days from the signing to the stage \u2014 the season\u2019s longest unseen stretch, winter handing the block to spring: the build-out\u2019s money lands in the hall\u2019s account and the vendor list grows a second column; Kev rehearses the pledge in the shop\u2019s back room, Eddie correcting his posture the way you correct dough; the boiler fund\u2019s parish envelope passes through C4\u2019s weeks quietly; the render room\u2019s page becomes the pledge\u2019s teleprompter; Deniz moves her desk to Halcyon\u2019s back office and the paper follows her like a loyal dog. The Club\u2019s first repayment window opens in spring exactly as the deck promised. Winter hands the block to spring the way a handoff passes hot: carefully, with somewhere to be.',
    city: 'The build-out hired its first crews. The banner truck rehearsed its route. Spring took the block\u2019s jacket and left its measurements.',
  },
  {
    from: 546,
    to: 580,
    intro: 'Thirty-four days from the stage to the audit: the clip\u2019s views climb, the pledge\u2019s five hundred acquires a life of its own, and the hiring promise becomes the kind of number that gets quoted at meetings Kev isn\u2019t in. The Works fence keeps its stage-scar. Marisol\u2019s deck grows an appendix titled ASSUMPTIONS nobody reads out loud. The audit\u2019s request letter arrives in April like weather.',
    city: 'The clip aged in public. The audit made its appointment. April kept both.',
  },
  {
    from: 580,
    to: 595,
    intro: 'Fifteen days from the fall to the notice: Kev\u2019s JMA desk finds its boxes, Yoli\u2019s legal pad gains a researcher\u2019s hand, and the meme\u2019s shares flatten into the background radiation of the corner\u2019s phones. The pantry\u2019s Tuesday runs short-handed and labeled. Craig\u2019s truck is seen twice at the laundromat, once at the county clerk\u2019s. The wire files it under TRAVELING.',
    city: 'The coalition gained a researcher. The block gained a meme. Both organize.',
  },
  {
    from: 595,
    to: 608,
    intro: 'Thirteen days from the notice to the dusting: May arrives green, the hall\u2019s build-out reaches its second floor, and the shop\u2019s counter sees Leo at the hours the Face doesn\u2019t own. June\u2019s shifts run long and her questions run shorter \u2014 the quiet\u2019s first week is the quiet\u2019s own weather. The notebook lives under the bed. The bed doesn\u2019t know it\u2019s a library.',
    city: 'The build-out reached two floors. The caf\u00E9\u2019s window kept its light schedule. The quiet moved in upstairs.',
  },
  {
    from: 608,
    to: 615,
    intro: 'One week from the edited cut to the gallery: June\u2019s conditions hang in the apartment like load-bearing beams \u2014 the year at Dr. Feld\u2019s, the condition named out loud, the books shown before she asks \u2014 and the week measures itself against them without moving. Fitz\u2019s invitations go out on cream stock. Rachel\u2019s name is on the gallery\u2019s list because Ohio people don\u2019t RSVP so much as appear.',
    city: 'The gallery creamed its walls. The caf\u00E9\u2019s window learned to run itself. Conditions are the season\u2019s load-bearing walls.',
  },
  {
    from: 615,
    to: 622,
    intro: 'One week from the mirror to the papers: the gallery\u2019s velvet goes back in its crates, the payphone sits in Leo\u2019s head like unspent change, and Yoli\u2019s asking around about the option papers \u2014 Doris\u2019s staircase sentence reaching her through exactly the doors the doc promised. El Vann\u2019s community room warms its radiator for company. The Works fence grows another lock.',
    city: 'The fence grew a lock. The papers waited flat. Documents always wait.',
  },
  {
    from: 622,
    to: 629,
    intro: 'One week from the papers to the table: the bridge story sits in the block\u2019s air without a conclusion, Yoli\u2019s research gains an option-paper footnote she doesn\u2019t show anybody, and Tito\u2019s table gets its good tiles set out at noon \u2014 the block reads the tiles the way it reads the fence. The old bottle leaves the cabinet. Nineteen ninety-four is coming to dinner.',
    city: 'The good tiles went out at noon. The old bottle came down. The block got quiet around its own history.',
  },
  {
    from: 629,
    to: 633,
    seasonCut: true,
    intro: 'Four days from the table to the address \u2014 spring handing the block to summer: the heat arrives early, K-Globes amber through the shop\u2019s gate later each dusk, and the nights run longer than the entries. The appointment gets made for June\u2019s middle, cash-only, quiet clients. June\u2019s window light runs its own schedule. The Map gains its Feld pin \u2014 circled twice, because the first circle didn\u2019t take. Summer takes the block the way summer does: without asking.',
    city: 'The heat came early. The appointment got its second circle. Summer moved in without asking.',
  },
  {
    from: 633,
    to: 645,
    intro: 'Twelve days from the booking to the 2 a.m.: the shop\u2019s lights burn late twice \u2014 inventory, everybody says, everybody figuring inventory \u2014 and the notebook reads like a file being assembled against somebody. Deniz\u2019s desk at Halcyon hosts the paper wall\u2019s copies, which is to say the ledger\u2019s daylight is moving in next door to June\u2019s window light. The appointment sits circled. The room two avenues east keeps its quiet.',
    city: 'The shop\u2019s lights burned late. The caf\u00E9\u2019s back office gained a desk\u2019s worth of paper. The block figured inventory.',
  },
  {
    from: 645,
    to: 654,
    intro: 'Nine days from the 2 a.m. to the withdrawal: the therapy room\u2019s door is a door, the week\u2019s grind eats its Fridays the way grinds do, and the Club\u2019s first repayment window arrives at its machine date like all windows do \u2014 on schedule, unimpressed by context. Miss Odessa\u2019s purse sits in the payout queue. The bank\u2019s envelope finds the garden\u2019s mail slot by mistake and the block reads its shape.',
    city: 'The window opened on schedule. The machine said insufficient, politely. The envelope\u2019s shape was final.',
  },
  {
    from: 654,
    to: 658,
    intro: 'Four days from the withdrawal to the books: the hall\u2019s glass arrives on a flatbed and goes in gleaming, Craig\u2019s truck idles at the laundromat every night telling Sal what the buildings are, and the season\u2019s last pages total themselves \u2014 receipts existing, enemies organized, money thin, the condition wall holding. July is five days away and July is not an event. July is a season.',
    city: 'The render\u2019s glass went in gleaming. The laundromat heard about buildings. July loaded itself.',
  },
]);

export function c4CompressionFrom(day: number): C4Compression | undefined {
  return C4_COMPRESSIONS.find((c) => c.from === day);
}

/** The linger machine's answer for a C4 day: 'next' = the ordinary
 *  tomorrow; a compression = the montage-then-roll; 'cut' = the season's
 *  last linger (the July-heat cut). Null for any day that isn't C4's —
 *  the machine above owns those. */
export function c4RailFor(day: number): 'next' | 'cut' | { compress: number } | null {
  if (!Number.isInteger(day) || day < C4_FIRST_DAY || day > C4_LAST_DAY) return null;
  if (day === C4_LAST_DAY) return 'cut';
  const comp = c4CompressionFrom(day);
  if (comp) return { compress: comp.to };
  return 'next';
}

// ===========================================================================
// 5. The C4→C5 season cut — the chapter close (doc 06 §C4 handoff)
// ===========================================================================

/** The cut's diary latch (the block layer's law: the latch IS the
 *  entry; the cut plays once per save). */
export const C4_CUT_ID = 'c4-cut-julyheat';

/** Doc 06 §C4 handoff, staged: the season cut — July heat, the Club's
 *  next window, Craig drunk at the laundromat telling Sal the buildings
 *  are "as good as sold" (verbatim), the Works' fence taking another
 *  lock. (The doc's ordinal says "second" — the C3 wave's compression
 *  already staged that lock; this staging counts the fence's locks the
 *  way the block does: another one, which is the honest read and avoids
 *  two canon sentences fighting over an ordinal.) */
export const C4_CUT_STAGE =
  'July heat at the laundromat\u2019s window: Craig, drunk, telling Sal the buildings are \u201Cas good as sold.\u201D The Club\u2019s next window opens in July. The Works\u2019 fence takes another lock. The face\u2019s winter is over and the face is still winning and the ledger is still bleeding, and the season that opens next is the kind of season the notebook has been writing toward all year. The fall is not an event. It is a season. It opens on schedule.';

/** The cut's wall (authored, doc 13 voice): the season kept; what July
 *  brings is the next wave's content — the hold says so in the world's
 *  own voice, never in project-speak. */
export const C4_CUT_WALL =
  'July\u2019s first morning opens hot and the corner keeps its hours. The Club\u2019s next window is open, the receipts are where receipts are, and the notebook knows what season this is. Some seasons you survive. This one, the notebook writes, you survive in ink.';

/** The cut's marker entry — the latch (doc 13 §3's C4 voice: fractured,
 *  longer nights, shorter entries — the season's facts, the fall's table
 *  set). Dated Jul 3, Y3. */
export function c4CutEntry(): FieldDiaryEntry {
  return {
    id: C4_CUT_ID,
    kind: 'EVENT',
    date: dateOfCalendarDay(C4_CUT_DAY),
    epistemic: 'FACT',
    body: 'The face\u2019s books, closed: the letter signed, the pledge aired, the audit\u2019s eight words eaten, Kev filed with the coalition, June behind conditions, K4 kept, K3 struck, the railing surfaced, the thread booked, the machine\u2019s first bite taken. The fall is not an event; it is a season \u2014 and the season is July. Facts only. The facts are enough.',
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

// ===========================================================================
// 6. The chapter's Lost-Year fragments — F4 the parking structure and
//    F7 the railing (doc 02 §6.2)
// ===========================================================================

export const C4_FRAGMENT_IDS = {
  f4: 'c4-f4-parking',
  f7: 'c4-f7-railing',
} as const;

function fragmentRow(id: 'F4' | 'F7') {
  const row = FRAGMENTS.find((f) => f.id === id);
  if (!row) throw new Error(`c4pack: fragment ${id} missing from the register`);
  return row;
}

/** F4 — doc 02 §6.2's row verbatim (trigger: "The parking level under
 *  the Corvus render site"): the jobs-fair op's own garage, after the
 *  cameras. One RECALL entry, the wobble style, once per save (the
 *  C1/C2/C3 packs' F6/F3/F2 precedent). */
export function f4Entry(calendarDay: number): FieldDiaryEntry {
  const row = fragmentRow('F4');
  return {
    id: C4_FRAGMENT_IDS.f4,
    kind: 'RECALL',
    date: dateOfCalendarDay(calendarDay),
    epistemic: 'RECALL',
    body: row.content,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** F7 — doc 02 §6.2's row verbatim (trigger: "El Vann's bridge story"):
 *  the railing surfaces at the bridge story's close (doc 06 §C4: "F4
 *  and F7 surface here"). The register's content is three clauses and a
 *  full stop — no conclusion, by design (doc 02 §6.2's ambiguity policy:
 *  staged once, never resolved, never a scene). One RECALL entry, the
 *  wobble style, once per save. Its firing spends R12's opt-in resource
 *  note (the first trigger in canon order — core/guardrails' own
 *  once-latch; the state seam rides GameState.resourceNoteOffered). */
export function f7Entry(calendarDay: number): FieldDiaryEntry {
  const row = fragmentRow('F7');
  return {
    id: C4_FRAGMENT_IDS.f7,
    kind: 'RECALL',
    date: dateOfCalendarDay(calendarDay),
    epistemic: 'RECALL',
    body: row.content,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

// ===========================================================================
// 7. The beats' diary ink — one draft per authored latch (the block
//    layer's law: the entry IS the latch)
// ===========================================================================

/** The pack's entry-id namespace (the c0/c1/c2/c3 precedent: `c4-`
 *  prefixed, one id per latch). */
export const C4_IDS = {
  signing: 'c4-signing-pen',
  k4: 'c4-k4-corvus-partner',
  jobsFair: 'c4-jobs-fair-op',
  kevFall: 'c4-kevs-fall',
  camille: 'c4-camille-exit',
  discovery: 'c4-june-discovery',
  k3: 'c4-k3-june-solid',
  rachel: 'c4-rachel-gallery',
  papers: 'c4-elvann-papers',
  tito: 'c4-tito-story',
  feld: 'c4-feld-booking',
  villain: 'c4-villain-question',
  question: 'c4-question-room-clears',
  session: 'c4-feld-first-session',
  missed: 'c4-missed-repayment',
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

/** Doc 12 §2's fixed event — the signing (the eddie interaction, day
 *  493): the pen's sentence verbatim, the letter signed. */
export function signingEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.signing, 'EVENT', day, 'FACT',
    `January 14. The letter on the counter and Eddie\u2019s pen in my hand \u2014 the pen December kept for me. He says it like a benediction and a dare: \u201C${C4_EDDIE_PEN_LINE}\u201D I sign. The ink is the first line of the chapter that counts, and the deck\u2019s three hundred forty becomes the video\u2019s five hundred on the same page, because round numbers fund. The notebook writes both numbers. The notebook is not on the video.`);
}

/** Doc 03 §5's table — K4, written at the signing, honestly tagged
 *  GUESS and KEPT (the ledger's cruelest entry is the one he leaves
 *  standing; the C5 cascade reads it). Unstruck by law — the pack pins
 *  the keeping. (K2's convention: the contradiction rides the diary's
 *  EVENT kind — the entry kind is the vehicle; the GUESS is the tag.) */
export function k4Entry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.k4, 'EVENT', day, 'GUESS',
    'Corvus is a partner. Marisol is straight with me, for a developer. \u2014 GUESS, labeled honestly, kept. The tag is the most honest sentence on the page: I know I can\u2019t know this, and I\u2019m keeping it anyway, because the alternative is a sentence I can\u2019t afford yet.');
}

/** Doc 06 §C4 event 2 — the jobs-fair op (the kev_pledge interaction,
 *  day 546): the banner, the clip, the thesis-in-falsehood verbatim. */
export function jobsFairEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.jobsFair, 'EVENT', day, 'FACT',
    `March 8. The stage against our own fence, the banner \u2014 THE FUTURE HIRES HERE \u2014 and Kev fronting the pledge with my numbers in his mouth: five hundred local jobs, ${C4_BIG_NUMBERS_LINE}. His face does it; my math did it. The deck says ${C4_DECK_JOBS}. The video says ${C4_PLEDGE_JOBS}. The difference is a tripwire I laid myself, live, on tape, and April knows where it sits.`);
}

/** Doc 06 §C4 event 2's April — Kev's fall (the newsbox, day 580): the
 *  audit's finding verbatim, the meme, the coalition's gain. */
export function kevFallEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.kevFall, 'EVENT', day, 'FACT',
    `April 11. The audit lands and the language is final: the jobs are ${C4_AUDIT_LINE}. The clip is a meme now \u2014 ${C4_MEME_LINE}. Kev found JMA\u2019s hard line and Yoli took him in; the coalition gains its angriest researcher, and his first case file is going to have my name on the spine. His face did it. My math did it. The internet can\u2019t tell the difference, and April\u2019s next April won\u2019t either.`);
}

/** Doc 06 §C4 event 4 — Camille's exit (the garden, day 595): her line
 *  verbatim; the pursuit's difference rides the C3 pantry latch (the
 *  warm exit keeps the pantry's Tuesday memory; the cold one is the
 *  transfer notice standing alone). */
export function camilleEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.camille, 'RELATION', day, 'FACT',
    `April 26. Camille\u2019s boxes labeled in her own handwriting, the transfer notice dated like an apology that isn\u2019t one. Her exit line, quiet, the way exits land when they\u2019re earned: \u201C${C4_CAMILLE_LINE}\u201D The board lost its best piece and the board doesn\u2019t know it. The alternative life takes a job in the Bronx and labels what it leaves.`);
}

/** Doc 06 §C4 event 5 — June finds the diary (the june interaction, day
 *  608): the fight's sentence verbatim. K3 rides its own entry (the
 *  pack writes it separately, SECRET visibility, struck the same scene
 *  through the strike seam). The body is law-sized to the diary's 600
 *  cap (the conditions' full text rides the staged notes). */
export function discoveryEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.discovery, 'RELATION', day, 'FACT',
    `May 9. She was dusting. The notebook was under the bed because the notebook lives under the bed. She read the condition, and K2, and the lunch that wouldn\u2019t say the word, and the room in my head she never knew existed. Her fight is quiet \u2014 that\u2019s how her fights work \u2014 and her sentence is the one I can\u2019t renew: \u201C${C4_JUNE_FIGHT_LINE}\u201D The conditions are issued once, non-negotiable, take-it-or-leave: the year at Dr. Feld\u2019s; the condition named out loud to her, not to the notebook; the books shown before she asks.`);
}

/** Doc 03 §5's table — K3, written at the discovery, tagged FACT, struck
 *  the same scene. The entry's body is the lie; the correction is doc
 *  03's own; both stay (the append-only law). */
export function k3Entry(day: number): FieldDiaryEntry {
  const e = entry(C4_IDS.k3, 'EVENT', day, 'FACT',
    'June and I are solid. She knows the important stuff.');
  e.visibility = 'secret';
  return e;
}

/** K3's strike — the correction (doc 03 §5's table verbatim), applied
 *  through the strike seam at the scene's close. */
export const C4_K3_STRIKE = {
  strike: 'She knows the important stuff.',
  margin: 'She knows the edited cut.',
} as const;

/** Doc 06 §C4 event 6 — Rachel (the rachel_gallery interaction, day
 *  615): the un-impressible mirror, her surgical question verbatim. */
export function rachelEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.rachel, 'PERSON', day, 'FACT',
    `May 16. Fitz\u2019s gallery, the velvet corner. Rachel recognizes me instantly; I perform; she declines the performance the way you decline a flyer. Her questions are surgical \u2014 the sharpest one, verbatim: \u201C${C4_RACHEL_LINE}\u201D She mentions the payphone once, flatly, and refuses to elaborate. The circuit has its own archivist, and she was there before the poster had my face.`);
}

/** Doc 06 §C4 + doc 07 §2.x — the El Vann papers (the elvann
 *  interaction, day 622): the papers' inventory; the bridge story's
 *  close. N4c rides the beat (the pick's ink lands through the
 *  machine). F7 rides its own entry (the fragment's own latch). */
export function papersEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.papers, 'EVIDENCE', day, 'FACT',
    'May 23. El Vann\u2019s community room, the papers flat in my hands: the letter, the option, fifty years of the block\u2019s paper spine. Developments fail, dear. Documents don\u2019t. They wait. Then the bridge story, unprompted, over the radiator\u2019s opinions \u2014 the one that ends exactly where it ends, no conclusion attached, and the ending is the point: some stories refuse to finish, and I recognize the shape.');
}

/** Doc 06 §C4 event 7 — Tito's story (the tito_table interaction, day
 *  629): the mirror at full length, Ernie's sentence verbatim, Tito's
 *  thirty years verbatim. */
export function titoEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.tito, 'OBSERVATION', day, 'FACT',
    `May 30. The dominoes table, late, the cheap wine saved for stories with weight. Tito tells the ’94 story unprompted: Ernie, the ${C4_TITO_SIGNATURES} signatures, the consulting position, the rain that came inside. Ernie\u2019s sentence, verbatim, kept the way evidence is kept: \u201C${C4_ERNIE_LINE}\u201D Then Tito, at his tiles: \u201C${C4_TITO_SIT_LINE}\u201D Nobody draws the line from him to me. The bible forbids it. My hand knows the cadence anyway. The entry doesn\u2019t say so.`);
}

/** Doc 12 §2's "therapy starts (Jun 3)" — the booking (the feld_room
 *  interaction, day 633): the thread's opening, the Map's pin. */
export function feldEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.feld, 'PLACE', day, 'FACT',
    'June 3. Dr. Feld\u2019s block, two avenues east \u2014 the Map gains its third new pin this season, after the render room and the gallery. The booking is made: cash-only, quiet clients, the room a room and the door a door. The appointment is circled twice on the Map \u2014 twice, because the first circle didn\u2019t take. The fifteenth is circled. The notebook doesn\u2019t ask what the room is for. The notebook was there for the whole diagnosis.');
}

/** Doc 08 §6 — the villain-question scene (the late_window interaction,
 *  day 645): the scene's staging is the notebook reading its own record
 *  like evidence; R4's machine reports what the ledger remembers; the
 *  only line is written, not spoken. The QUESTION rides its own entry
 *  (the tray's first unroutable). */
export function villainEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.villain, 'OBSERVATION', day, 'FACT',
    `June 15. 2 a.m., the shop dark, the K-Globes amber through the gate. K2 beside K4 \u2014 net good beside the GUESS I kept \u2014 and my own handwriting unfamiliar. I check the date. I check the ink. I check the corner where I sign. It is mine. One page of reading my own record like evidence. No speech. The only line, written, not spoken: \u201C${C4_WRITTEN_LINE}\u201D No redemption toggle. No alignment flip. No confession cutscene.`);
}
export function questionEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.question, 'QUESTION', day, 'FACT',
    `${C4_QUESTION_LINE} \u2014 the first QUESTION the tray cannot route to anyone else. No character holds this one. The game never answers it. It is answered by the player\u2019s own next twenty hours of play, which is the design\u2019s whole thesis, and the pen puts it down unloaded.`);
}

/** The first session (the morning after the 2 a.m., when N4d takes
 *  therapy): 60% silence, "the best scene in the chapter" (doc 06 §C4
 *  event 9). The entry is honest the way C4's voice is honest: entries
 *  to Dr. Feld topics are the only honest ones (doc 03 §6's C4 row). */
export function sessionEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.session, 'RELATION', day, 'FACT',
    'The room is quiet and cash-only and the door was a door. Sixty percent of the session is silence and the silence is the best thing in the chapter. Dr. Feld asks four questions and two of them are about ovens, which is how he gets in without knocking. I talk about K2 and K4 the way you show somebody a scar: flat, factual, palm up. The room doesn\u2019t grade me. Showing up is the whole treatment. The game models showing up, not curing.');
}

/** Doc 06 §C4 event 10 — the first missed repayment (the odessa
 *  interaction, day 654): the EVIDENCE's deletion, logged. */
export function missedEntry(day: number): FieldDiaryEntry {
  return entry(C4_IDS.missed, 'EVIDENCE', day, 'FACT',
    `June 24. Quiet, administrative, terrible: a withdrawal that doesn\u2019t clear. Miss Odessa\u2019s $${C4_ODESSA_COVER} covered personally, in cash, told to no one \u2014 the envelope in her purse by lunch and the ledger never seeing my hand. The slip photographed, then deleted. ${C4_DELETED_NOTE} The diary tells on me anyway. The diary tells on me always.`);
}

/** The off-books act rides the ledger as a recorded, SECRET amends
 *  (the C3 Gino-favor precedent: recorded acts the entries refuse to
 *  name get their own row — the ledger keeps the owing visible either
 *  way). */
export const C4_ODESSA_LEDGER_ID = 'led-c4-odessa-cover';
export const C4_ODESSA_REFS = ['odessa', 'c4-odessa-cover'] as const;

// ===========================================================================
// 8. The choice packs — the register's C4 nodes (doc 10 §3's table)
// ===========================================================================

/** The pick packs — the NotebookPrompt overlay's content for the C4
 *  nodes. All four ride the REGISTER (resolveChoice consumes them, doc
 *  10 §3's option table; no local picks this chapter). N4d's never is
 *  the Silent class again: nothing posts at the decision — the flags
 *  are the only witness. */
export interface C4ChoicePack {
  nodeId: 'N4a' | 'N4b' | 'N4c' | 'N4d';
  prompt: string;
  options: readonly { optionId: string; label: string; blurb: string }[];
}

export const C4_N4A_PACK: C4ChoicePack = {
  nodeId: 'N4a',
  prompt: C4_N4A_PROMPT,
  options: Object.freeze([
    {
      optionId: 'correct',
      label: 'A \u2014 correct the number',
      blurb: 'Say three-forty on live cameras and let the banner truck be wrong. Kev\u2019s face freezes mid-sentence and the press conference becomes a different kind of clip. The deck is protected. The face is not. Some corrections cost the messenger the message.',
    },
    {
      optionId: 'let-fly',
      label: 'B \u2014 let it fly',
      blurb: 'Five hundred, because round numbers fund, because the room is warm, because the audit is in April and April is a rumor. Big numbers protect the little guys \u2014 that\u2019s the sentence, and this is where it learns to lie.',
    },
    {
      optionId: 'self-leak',
      label: 'C \u2014 leak it myself, blame Wexler',
      blurb: 'The deck\u2019s real number finds a reporter\u2019s inbox an hour before the conference, and the story becomes Wexler\u2019s pressure instead of Leo\u2019s math. Available. Dark. The leak is good and the price is a man\u2019s name, and the ledger will file the name.',
    },
  ]),
};

export const C4_N4B_PACK: C4ChoicePack = {
  nodeId: 'N4b',
  prompt: C4_N4B_PROMPT,
  options: Object.freeze([
    {
      optionId: 'full-disclosure',
      label: 'A \u2014 full disclosure, take the conditions',
      blurb: 'The year at Dr. Feld\u2019s, actually attended. The condition named out loud to her, not to the notebook. The Club\u2019s books shown before she asks. All three, non-negotiable, issued once \u2014 and the one door that keeps her, barely, on conditions doc 07 \u00a72.5 numbers.',
    },
    {
      optionId: 'partial',
      label: 'B \u2014 partial, the edited cut again',
      blurb: 'The lunch entry, the condition, K2 \u2014 give her the version with the sharpest edges filed. The edited cut bought a year before anyone read it. The edited cut is how the room got quiet the first time.',
    },
    {
      optionId: 'move-out',
      label: 'C \u2014 move out',
      blurb: 'Let her keep the window light and the timeline. The block will say it clean: two people, different arcs. The notebook will write the other version, the one where the room she never knew existed is the reason the door closes.',
    },
  ]),
};

export const C4_N4C_PACK: C4ChoicePack = {
  nodeId: 'N4c',
  prompt: C4_N4C_PROMPT,
  options: Object.freeze([
    {
      optionId: 'return',
      label: 'A \u2014 return them',
      blurb: 'The papers go back in El Vann\u2019s drawer, flat, the way they waited. Developments fail; documents don\u2019t \u2014 and documents that stay home stay true. The custody is hers. The knowledge is the block\u2019s.',
    },
    {
      optionId: 'copy',
      label: 'B \u2014 copy them first',
      blurb: 'The letter, the option, the bylaws \u2014 copied before the drawer closes, because knowledge is leverage and leverage is the only language the fall respects. The chapter records the custody. The copies record the choice.',
    },
    {
      optionId: 'locate-for-yoli',
      label: 'C \u2014 give Yoli the location',
      blurb: 'Doris\u2019s staircase sentence, completed: ask Eleanor, then the drawer. The coalition owns its own history and the angriest researcher gains a file that explains the whole block. C5 prices this. C6\u2019s concessions inherit it.',
    },
  ]),
};

export const C4_N4D_PACK: C4ChoicePack = {
  nodeId: 'N4d',
  prompt: C4_N4D_PROMPT,
  options: Object.freeze([
    {
      optionId: 'therapy',
      label: 'A \u2014 go to Dr. Feld',
      blurb: 'The circled address gets its first visit. The room is quiet and cash-only and sixty percent of the first session is silence, and the silence is the best scene in the chapter. The game models showing up, not curing.',
    },
    {
      optionId: 'defer',
      label: 'B \u2014 defer it',
      blurb: 'The week\u2019s grind has a way of eating Fridays. The circle stays on the Map, the thread stays a thread, and the appointment becomes a skill: almost going. The thread opens later, or the C6 condition-handle inherits the almost.',
    },
    {
      optionId: 'never',
      label: 'C \u2014 never',
      blurb: 'The thread never opens. Nothing is written \u2014 that\u2019s the point. The flags are the only witness: the condition-handle and the self-portrait\u2019s honesty inherit a man who read his own file at 2 a.m. and did not go.',
    },
  ]),
};

/** The pack lookup (the Game layer's seam). The C4 nodes have no locks
 *  (doc 10 §3's table: all four nodes' options carry `locks: []`) \u2014
 *  `held` is accepted for the seam's shape and ignored. */
export function c4ChoicePackOf(nodeId: string): C4ChoicePack | undefined {
  if (nodeId === 'N4a') return C4_N4A_PACK;
  if (nodeId === 'N4b') return C4_N4B_PACK;
  if (nodeId === 'N4c') return C4_N4C_PACK;
  if (nodeId === 'N4d') return C4_N4D_PACK;
  return undefined;
}

// ---- the picks' ink ----

/** What one taken option WRITES \u2014 the diary entry, in his hand
 *  (doc 13 §3's C4 voice: fractured, longer nights, shorter entries).
 *  One per option \u2014 the pick is remembered in ink. N4d's never is
 *  absent here (the Silent class: nothing posts). */
const N4A_DIARY: Readonly<Record<string, string>> = Object.freeze({
  correct: 'I said three-forty. On camera, live, with the banner truck wrong behind me and Kev\u2019s face freezing mid-sentence like a man hearing his own voice played back wrong. The deck is protected. The face is not. The clip that comes out of this is a different kind of clip, and the audit in April will find a number that matches, and neither of those will feel like winning.',
  'let-fly': 'I let it fly. Five hundred local jobs, because round numbers fund, because the room was warm, because April is a rumor and this morning is a camera. Big numbers protect the little guys \u2014 the sentence came out of my mouth through Kev\u2019s, and it landed, and the landing is the sound of a tripwire being set. The deck says three hundred forty. The notebook wrote both numbers. The audit will read them side by side.',
  'self-leak': 'The deck\u2019s real number found a reporter\u2019s inbox an hour before the conference, and the story is Wexler\u2019s pressure instead of Leo\u2019s math, and the cameras got their drama and the pledge got its asterisk. It worked. That\u2019s the worst part. The leak is good and the price is a man\u2019s name, and the ledger filed the name where names live: who I burned is who I owe, and the entry doesn\u2019t say sorry.',
});

const N4A_NOTE: Readonly<Record<string, string>> = Object.freeze({
  correct: 'Kev, off-air, quiet, not angry yet: \u201CYou could have told me first.\u201D The banner truck is wrong and the deck is right and the room learned a new word for me this morning.',
  'let-fly': 'The clip\u2019s applause runs its natural length. Kev hits his mark, the number lands like a gift, and April sits down quietly at the back of the room where Aprils sit.',
  'self-leak': 'Wexler\u2019s office calls twice before noon. The story runs with his name in the pressure paragraph and the pledge\u2019s asterisk held. The dark thing worked. The dark thing always works. That\u2019s the trouble with it.',
});

const N4B_DIARY: Readonly<Record<string, string>> = Object.freeze({
  'full-disclosure': 'I took all three conditions. The year at Dr. Feld\u2019s, actually attended. The condition named out loud to her, not to the notebook \u2014 out loud, in the room, to her face, which is a different organ than the page. The books shown before she asks. One door keeps her, barely, and the keeping has a schedule and a shape and a fine print that reads like a map of where I went wrong, numbered. I signed the conditions the way I signed the letter \u2014 with a pen that matters. This one had better hold.',
  partial: 'I gave her the edited cut again. The lunch entry with the word filed off, the condition in my own gentler sentences, K2 with the margins closed. It worked the way it worked before, which is to say the room went quiet and the quiet is load-bearing now. She took the version. She took it the way you take a check you\u2019re sure will bounce.',
  'move-out': 'I moved out. The window light stays hers and the timeline stays clean and the block will say it kindly: two people, different arcs. The notebook writes the other version \u2014 the room she never knew existed, the reason the door closed \u2014 and the notebook is the only tenant who knows the whole lease.',
});

const N4B_NOTE: Readonly<Record<string, string>> = Object.freeze({
  'full-disclosure': 'June writes the conditions on the back of a receipts envelope, numbers them, and pins it inside the kitchen cabinet \u2014 the door she opens every morning. \u201CAll three,\u201D she says. \u201CThen we\u2019ll see about the door.\u201D',
  partial: 'June nods the way you nod at a form you\u2019re going to contest later. The room goes quiet in the way that means the quiet will do the talking for a while.',
  'move-out': 'June says \u201Cokay\u201D \u2014 one syllable, no Static in it \u2014 and the window light does what window light does, which is keep shining on whatever stays.',
});

const N4C_DIARY: Readonly<Record<string, string>> = Object.freeze({
  return: 'I returned the papers. Flat, in order, the way they waited \u2014 the letter to its folder, the option to its sleeve, the drawer to its quiet. Developments fail, dear. Documents don\u2019t. They wait. And documents that stay home stay true. The custody is hers. The knowledge is the block\u2019s. My hands are empty and the empty is the point.',
  copy: 'I copied them first. The letter, the option, the bylaws \u2014 fifty years of the block\u2019s paper spine, duplicated before the drawer closed, because knowledge is leverage and leverage is the only language the fall respects. The originals went home flat. The copies ride my bag. The chapter records the custody; the copies record the choice, and the copies are the choice.',
  'locate-for-yoli': 'I gave Yoli the location. Doris\u2019s staircase sentence, completed: ask Eleanor, then ask your father why she\u2019d keep it \u2014 and then the drawer, which I described from memory, flat, precise, a map of the block\u2019s own paper spine handed to the person who reads it best. The coalition owns its own history now. The angriest researcher gained a file that explains the whole corner. The fall will price this. Let it.',
});

const N4C_NOTE: Readonly<Record<string, string>> = Object.freeze({
  return: 'El Vann takes the folder with both hands, checks the order \u2014 the letter, the option, the bylaws \u2014 and nods once. \u201CThey waited,\u201D she says. \u201CThey\u2019ll wait again. Documents always do.\u201D',
  copy: 'The copier runs eleven minutes. El Vann watches the originals go home and says nothing, which from her is a full sentence, and its subject is custody, and its verb is watch.',
  'locate-for-yoli': 'Yoli writes the location on her legal pad in her own shorthand, thanks me in zero words, and leaves. The garden\u2019s shed light is on until two.',
});

const N4D_NOTE: Readonly<Record<string, string>> = Object.freeze({
  therapy: 'The room is quiet and cash-only and the door was a door. Dr. Feld asks four questions and two are about ovens. Sixty percent of the hour is silence and the silence is the best scene in the chapter. The appointment\u2019s third circle never gets drawn.',
  defer: 'The address keeps its circle. The week eats its Friday the way weeks do. The thread is a thread \u2014 not a door yet, not a never, an almost with a Map pin.',
  never: 'The appointment\u2019s circle fades into the Map\u2019s paper the way circles do. Nothing is written. That\u2019s the point.',
});

// ===========================================================================
// 9. The resolve machine — the register's C4 nodes, dressed for the seam
// ===========================================================================

export interface C4PickApply {
  ok: boolean;
  reason?: 'bad-node' | 'bad-option' | 'locked';
  flags: string[];
  ledger: LedgerEntry[];
  diary: FieldDiaryEntry | null;
  note: string | null;
}

const C4_CHOICE_WEIGHT = 1;

/** Resolve one C4 pick through the register's own machine (doc 10 §3).
 *  Pure; the caller applies. Refused picks change nothing. N4d's never
 *  resolves with an EMPTY ledger and no diary \u2014 the Silent class \u2014
 *  and its flags are the only witness. When therapy IS taken, the
 *  session's ink rides the same resolution (the session is the morning's
 *  own scene \u2014 doc 10 §3's "The 2 a.m. scene's morning"). */
export function applyC4Pick(
  nodeId: 'N4a' | 'N4b' | 'N4c' | 'N4d',
  optionId: string,
  calendarDay: number,
): C4PickApply {
  const none: C4PickApply = { ok: false, reason: 'bad-node', flags: [], ledger: [], diary: null, note: null };
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
    weight: C4_CHOICE_WEIGHT,
    visibility: w.visibility,
    node: nodeId,
  }));
  let body: string | null = null;
  let note: string | null = null;
  if (nodeId === 'N4a') {
    body = N4A_DIARY[optionId] ?? null;
    note = N4A_NOTE[optionId] ?? null;
  } else if (nodeId === 'N4b') {
    body = N4B_DIARY[optionId] ?? null;
    note = N4B_NOTE[optionId] ?? null;
  } else if (nodeId === 'N4c') {
    body = N4C_DIARY[optionId] ?? null;
    note = N4C_NOTE[optionId] ?? null;
  } else {
    body = optionId === 'therapy' ? sessionEntry(calendarDay).body : null; // never/defer: the absence is the record
    note = N4D_NOTE[optionId] ?? null;
  }
  const diary: FieldDiaryEntry | null = body
    ? {
        id: `c4-${nodeId.toLowerCase()}-${optionId}`,
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

// ===========================================================================
// 10. The pack's self-check — the no-dead-content law, checked once
// ===========================================================================

export interface C4PackReport {
  ok: boolean;
  problems: string[];
}

/** The pack checks itself against the machines it feeds: the station
 *  keys are exactly the chapter's canon days (each landing on its doc 12
 *  §2 date through the calendar module; the villain-question's day is
 *  the RAILS table's own R4 minDate); every compression's `to` is a
 *  station, ordered, and the TWO season cuts are the calendar's own
 *  crossings (winter→spring at 493→546, spring→summer at 629→633 —
 *  crossedSeasonCut machine-checked from the dates themselves); every
 *  queue opens with Idris and pays honest; the canon lines are verbatim
 *  (doc 06 §C4 / doc 03 §5 / doc 07 §2.5 / doc 08 §6 / doc 02 §6.2); the
 *  canon values are pinned; the fragments' rows match the register; K4
 *  is GUESS-tagged and kept; K3 is struck; every option of every node
 *  resolves (N4d's never with an EMPTY ledger — the Silent class,
 *  machine-checked); and no authored prose carries a real-world year
 *  (the canon law: apostrophe form only). */
export function validateC4Pack(): C4PackReport {
  const problems: string[] = [];
  // the stations: the exact keys, each on its canon date
  const expectedKeys = C4_STATION_DAYS.join(',');
  const CANON_KEYS = '485,493,546,580,595,608,615,622,629,633,645,654,658';
  if (expectedKeys !== CANON_KEYS) {
    problems.push(`station keys are ${expectedKeys} (law: ${CANON_KEYS})`);
  }
  const canonDates: Readonly<Record<number, GameDate>> = {
    485: { y: 3, m: 1, d: 6 },
    493: { y: 3, m: 1, d: 14 },
    546: { y: 3, m: 3, d: 8 },
    580: { y: 3, m: 4, d: 11 },
    595: { y: 3, m: 4, d: 26 },
    608: { y: 3, m: 5, d: 9 },
    615: { y: 3, m: 5, d: 16 },
    622: { y: 3, m: 5, d: 23 },
    629: { y: 3, m: 5, d: 30 },
    633: { y: 3, m: 6, d: 3 },
    645: { y: 3, m: 6, d: 15 },
    654: { y: 3, m: 6, d: 24 },
    658: { y: 3, m: 6, d: 28 },
  };
  for (const day of C4_STATION_DAYS) {
    if (calendarDayOf(canonDates[day]!) !== day) {
      problems.push(`station ${day} does not land on its canon date through the calendar module`);
    }
  }
  // the villain-question's day is the RAILS table's own R4 minDate
  if (C4_VILLAIN_DAY !== 645) {
    problems.push(`the villain-question's day is ${C4_VILLAIN_DAY} (law: the RAILS table's R4 minDate, 645)`);
  }
  // the compressions: from a station, to a station, ordered, the TWO cuts marked
  const cutPairs = C4_COMPRESSIONS.filter((c) => c.seasonCut).map((c) => `${c.from}\u2192${c.to}`);
  if (cutPairs.join(',') !== '493\u2192546,629\u2192633') {
    problems.push(`the season-cut flags belong to 493\u2192546 (winter\u2192spring) and 629\u2192633 (spring\u2192summer), got ${cutPairs.join(',')}`);
  }
  for (const c of C4_COMPRESSIONS) {
    if (!C4_STATIONS[c.from]) problems.push(`compression from ${c.from} is not a station`);
    if (!C4_STATIONS[c.to]) problems.push(`compression to ${c.to} is not a station`);
    if (c.to <= c.from) problems.push(`compression ${c.from}\u2192${c.to} does not move forward`);
    if (c.seasonCut) {
      const crossed = crossedSeasonCut(c.from, c.to);
      if (!crossed) problems.push(`compression ${c.from}\u2192${c.to} is flagged season-cut but crosses no season boundary`);
    }
  }
  // the unflagged compressions prove the negative: no season crossing missed
  for (const c of C4_COMPRESSIONS) {
    const crossed = crossedSeasonCut(c.from, c.to);
    if (crossed && !c.seasonCut) {
      problems.push(`compression ${c.from}\u2192${c.to} crosses a season boundary but is not flagged season-cut`);
    }
  }
  // the queues: Idris opens, honest pays, five mouths
  for (const day of C4_STATION_DAYS) {
    const st = C4_STATIONS[day]!;
    if (st.queue.length < 2) problems.push(`station ${day}: a queue this thin is not a rush`);
    if (st.queue[0]!.who !== 'idris') problems.push(`station ${day}: the rush opens without Idris (the day-3/4 law)`);
    for (const o of st.queue) {
      if (o.pay < 1) problems.push(`station ${day}: an order pays nothing (the honest-pays law)`);
      if (o.bubble.length === 0 || o.reaction.length === 0) {
        problems.push(`station ${day}: an order is missing its voice`);
      }
    }
    if (st.begin.length === 0 || st.wake.length === 0 || st.rushDone.length === 0
      || st.climbNote.length === 0 || st.goldenNote.length === 0) {
      problems.push(`station ${day}: a station is missing one of its five mouths`);
    }
    if (!C4_CAPTIONS[day]) problems.push(`station ${day}: the postcard has no caption`);
  }
  // the canon lines, verbatim (doc 06 §C4 / doc 08 §6 / doc 03 §5)
  const verbatim: readonly [string, string, string][] = [
    [C4_EDDIE_PEN_LINE, 'Sign it. A man should sign his own ladder.', 'doc 06 §C3 handoff / §C4 (the signing)'],
    [C4_BIG_NUMBERS_LINE, 'Big numbers protect the little guys', 'doc 06 §C4 important conversations'],
    [C4_AUDIT_LINE, 'projected, condition-dependent', 'doc 06 §C4 event 2 (the audit)'],
    [C4_MEME_LINE, 'the kid who lied on TV', 'doc 06 §C4 event 2 (the meme)'],
    [C4_CAMILLE_LINE, 'You talk about people like they\u2019re pieces on a board. I\u2019m on your board.', 'doc 06 §C4 event 4'],
    [C4_JUNE_FIGHT_LINE, 'You let me believe I knew you. That\u2019s the part I can\u2019t renew.', 'doc 06 §C4 event 5'],
    [C4_RACHEL_LINE, 'Do you actually like any of these people, or do you administer them?', 'doc 06 §C4 event 6'],
    [C4_ERNIE_LINE, 'The block was going to lose anyway. I saved what I could.', 'doc 06 §C4 event 7 (the Ernie mirror)'],
    [C4_TITO_SIT_LINE, 'Sit with that, muchacho. I sat with it thirty years.', 'doc 06 §C4 event 7'],
    [C4_WRITTEN_LINE, 'The diary doesn\u2019t lie. The writer did.', 'doc 08 §6 (the scene\u2019s only line)'],
    [C4_QUESTION_LINE, 'Who am I when the room clears?', 'doc 06 §C4 diary developments'],
    [C4_CRAIG_SOLD_LINE, 'as good as sold', 'doc 06 §C4 handoff (Craig at the laundromat)'],
  ];
  for (const [got, want, src] of verbatim) {
    if (got !== want) problems.push(`a canon line drifted from ${src} (verbatim law)`);
  }
  // K3 and K4 — doc 03 §5's table verbatim
  const k3 = k3Entry(608);
  if (!k3.body.startsWith('June and I are solid. She knows the important stuff.')) {
    problems.push('K3\u2019s body drifted from doc 03 §5\u2019s table (verbatim law)');
  }
  if (k3.epistemic !== 'FACT') problems.push('K3 is not tagged FACT (doc 03 §5: the lie wears the honest tag)');
  if (k3.visibility !== 'secret') problems.push('K3 is not SECRET (doc 03 §9: the June scene reads the marked entries)');
  if (C4_K3_STRIKE.margin !== 'She knows the edited cut.') {
    problems.push('K3\u2019s correction drifted from doc 03 §5\u2019s table (verbatim law)');
  }
  const k4 = k4Entry(493);
  if (!k4.body.startsWith('Corvus is a partner. Marisol is straight with me, for a developer.')) {
    problems.push('K4\u2019s body drifted from doc 03 §5\u2019s table (verbatim law)');
  }
  if (k4.epistemic !== 'GUESS') problems.push('K4 is not tagged GUESS (doc 03 §5: he labeled it honestly and kept it)');
  // the canon values
  const values: readonly [number, number, string][] = [
    [C4_DECK_JOBS, 340, 'doc 06 §C4 starting circumstances (Marisol\u2019s deck)'],
    [C4_PLEDGE_JOBS, 500, 'doc 06 §C4 starting circumstances (the pledge video)'],
    [C4_ODESSA_COVER, 140, 'doc 06 §C4 event 10 (the covered window)'],
    [C4_TITO_SIGNATURES, 214, 'doc 06 §C4 event 7 (Ernie\u2019s signatures)'],
  ];
  for (const [got, want, src] of values) {
    if (got !== want) problems.push(`a canon value drifted from ${src} (verbatim law)`);
  }
  // the fragments: the pack reads the register (one source), the rows are C4's
  try {
    const f4 = fragmentRow('F4');
    if (f4.chapter !== 'C4' || f4.trigger !== 'The parking level under the Corvus render site') {
      problems.push('F4\u2019s register row is not C4\u2019s parking structure');
    }
    const f4Draft = f4Entry(546);
    if (f4Draft.kind !== 'RECALL' || f4Draft.epistemic !== 'RECALL') {
      problems.push('F4\u2019s entry is not the wobble style');
    }
    const f7 = fragmentRow('F7');
    if (f7.chapter !== 'C4' || f7.trigger !== 'El Vann\u2019s bridge story') {
      problems.push('F7\u2019s register row is not C4\u2019s railing');
    }
    const f7Draft = f7Entry(622);
    if (f7Draft.kind !== 'RECALL' || f7Draft.epistemic !== 'RECALL') {
      problems.push('F7\u2019s entry is not the wobble style');
    }
    if (!f7Draft.body.endsWith('full stop. No conclusion.')) {
      problems.push('F7\u2019s entry does not end in the register\u2019s own full stop (the ambiguity policy)');
    }
  } catch (e) {
    problems.push(`the fragment register read failed: ${(e as Error).message}`);
  }
  // the picks: every option resolves; signatures pairwise unique; N4d's
  // never resolves with an EMPTY ledger (the Silent class) and no ink
  for (const pack of [C4_N4A_PACK, C4_N4B_PACK, C4_N4C_PACK, C4_N4D_PACK]) {
    const sigs = new Set<string>();
    for (const o of pack.options) {
      const apply = applyC4Pick(pack.nodeId, o.optionId, 485);
      if (!apply.ok) problems.push(`${pack.nodeId}/${o.optionId}: does not resolve through the register`);
      const sig = apply.ledger.map((l) => l.refs.join('|')).join('#');
      if (sig && sigs.has(sig)) problems.push(`${pack.nodeId}/${o.optionId}: a duplicate ledger signature`);
      if (sig) sigs.add(sig);
    }
  }
  const never = applyC4Pick('N4d', 'never', 645);
  if (never.ok && (never.ledger.length !== 0 || never.diary !== null)) {
    problems.push('N4d/never: the Silent class posted something (doc 10 §1 \u2014 the omission exists by absence)');
  }
  if (!never.flags.includes('c6-condition-handle=never')) {
    problems.push('N4d/never: the flag is the only witness and it is missing');
  }
  if (never.note === null) problems.push('N4d/never: the note is spoken, never stored — it is missing');
  const therapy = applyC4Pick('N4d', 'therapy', 645);
  if (therapy.ok && therapy.diary === null) problems.push('N4d/therapy: the session wrote no ink');
  if (therapy.ok && !therapy.diary!.body.includes('Sixty percent')) {
    problems.push('N4d/therapy: the session\u2019s ink lost its silence (doc 06 §C4 event 9)');
  }
  // the rails: the last day is the cut, compression days map, outside is null
  if (c4RailFor(C4_LAST_DAY) !== 'cut') problems.push('the last day\u2019s linger must answer \u2018cut\u2019');
  if (c4RailFor(C4_FIRST_DAY - 1) !== null || c4RailFor(C4_LAST_DAY + 1) !== null) {
    problems.push('c4RailFor answers outside the chapter (the machine above owns those)');
  }
  for (const c of C4_COMPRESSIONS) {
    const r = c4RailFor(c.from);
    if (!r || typeof r !== 'object' || r.compress !== c.to) {
      problems.push(`c4RailFor(${c.from}) does not answer the compression to ${c.to}`);
    }
  }
  // the cut: the entry is dated the window start through the calendar module
  const cut = c4CutEntry();
  const cutDate = dateOfCalendarDay(C4_CUT_DAY);
  if (cutDate.y !== 3 || cutDate.m !== 7 || cutDate.d !== 3) {
    problems.push(`the cut's morning is ${JSON.stringify(cutDate)} (law: Jul 3, Y3)`);
  }
  if (cut.date.y !== cutDate.y || cut.date.m !== cutDate.m || cut.date.d !== cutDate.d) {
    problems.push('the cut\u2019s entry is not dated the window start');
  }
  // no real-world years in the authored prose (the canon law)
  const prose: string[] = [
    ...C4_STATION_DAYS.map((d) => C4_STATIONS[d]!.begin),
    ...C4_STATION_DAYS.map((d) => C4_STATIONS[d]!.wake),
    ...C4_STATION_DAYS.map((d) => C4_STATIONS[d]!.rushDone),
    ...C4_STATION_DAYS.map((d) => C4_STATIONS[d]!.climbNote),
    ...C4_STATION_DAYS.map((d) => C4_STATIONS[d]!.goldenNote),
    ...C4_COMPRESSIONS.map((c) => c.intro),
    C4_CUT_STAGE, C4_CUT_WALL, c4CutEntry().body,
  ];
  for (const p of prose) {
    if (/\b(1[0-9]{3}|20[0-9]{2})\b/.test(p)) {
      problems.push('an authored line carries a four-digit real-world year (the canon law: apostrophe form only)');
      break;
    }
  }
  return { ok: problems.length === 0, problems };
}

