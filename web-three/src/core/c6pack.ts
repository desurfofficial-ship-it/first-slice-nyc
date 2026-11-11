/**
 * core/c6pack.ts — the C6 content pack (narrative/14 §7 step 10's last
 * content wave — doc 06 §C6, "The Long Way Back", Dec Y3 → open).
 *
 * The chapter of nobody watching. The pack mirrors the c0/c1/c2/c3/c4/c5
 * conventions exactly:
 *
 *  - the station table: TEN playable days keyed by canon calendar day
 *    (doc 12 §2's C6 row: the concessions hearing Mar Y4, the hall opens
 *    spring Y4, Kestrel Green's hundredth tree — each machine-verified
 *    through calendarDayOf before a line of wiring);
 *  - the compressions: the gaps between stations, CONSUMED never played,
 *    with TWO season cuts the calendar proves (winter→spring 898→920 and
 *    spring→summer 990→1002 — crossedSeasonCut machine-checked for BOTH,
 *    and the unflagged compressions proving the negative);
 *  - the rails: c6RailFor answers the linger machine ('next' /
 *    compression / 'open' / null) — 'open' is the formal close's own
 *    answer, the arc's window shutting with the chapter's last authored
 *    beat;
 *  - the C5→C6 roll: THIS wave's law — the c5SeasonCut's wall gains the
 *    roll into C6's first station (day 814, Dec 1, Y3 — the cut's own
 *    morning, doc 06 §C6's period start) exactly as the C5 wave brought
 *    the C4 cut's roll (the GameState side; the pin is here so the pack
 *    documents its own reach);
 *  - the formal close (doc 09 §8): the main arc's window closes around
 *    June Y4 — the nine-month mark, machine-pinned as the receipts'
 *    Sept 21 Y3 plus nine calendar months — with the arc's final beat:
 *    The Debts complete or explicitly open, the self-portrait written or
 *    refused (refusal is a canon-valid state the city's diary comments on
 *    once, gently), and the chapter through advanceChapter's own door
 *    into OPEN — the terminal continuation the game does not end at
 *    (R15: no ending screen; the ledger is never forgotten on chapter
 *    change);
 *  - the amends economy's formal arc — "The Debts" (doc 09 §4): the
 *    schedule's key rows land as the stations' own acts, each through
 *    the canon door the table gives it (Ada's first dollar via Bea with
 *    her note verbatim; Grace's row routed through Kev's reference
 *    letter; Idris's bursar route only; Verna in the crossing-guard's
 *    booth; Miss Odessa's envelope last, in cash, unopened — she uses it
 *    for the block's winter tree lights);
 *  - Kev's fork (doc 07 §2.4): the reference letter to the union
 *    apprenticeship, signed in person, no camera — Kev takes it iff the
 *    amends ledger shows movement (the machine's own count); if not,
 *    he's still at Halcyon's bar, telling the story wrong. Canon keeps
 *    him alive, employed, and un-corrected by the narrative;
 *  - the register's two C6 nodes (core/choiceNodes' N6/N7 rows) dressed
 *    for the seam: pick packs, per-option ink, notes, and applyC6Pick
 *    through resolveChoice — N7's ledger acts ride the hearing's public
 *    record law exactly as the register's rows wrote them;
 *  - the self-portrait (doc 03 §7 — the arc's decision form): composed
 *    from the machine's own facts — standing, the amends ledger, the
 *    relationships that repaired or didn't, the fragments recovered, the
 *    therapy attended, the contradictions still standing unstruck (K4
 *    may stand; that is allowed and means something) — written in his
 *    voice, honest to the state it describes, never grading him;
 *    append-only, each version kept; F8 fires inside the first one and
 *    only there (doc 02 §6.2: the diary's own birth is its final reveal);
 *  - the pack checks itself (validateC6Pack): the canon lines verbatim,
 *    the canon values pinned, every option resolving, signatures
 *    pairwise unique, the two season cuts crossed and none missed, the
 *    nine-month arithmetic honest, the restitution's shape carried from
 *    the C5 pack without drift, no real-world years in the authored
 *    prose.
 *
 * Staging judgments this wave owns (documented here, per the §6.4 law):
 *  - the winter lights land Dec 22, Y3 (doc 12 §4 names "winter lights"
 *    for C6 with no date): the shortest week's darkness is the beat's
 *    own reason, and doc 04's C6 line — "the block keeps a light on" —
 *    wants a December night. Miss Odessa's envelope (the schedule's last
 *    row) funds NEXT winter's lights per doc 09 §4's own table; the
 *    first winter's are the block's tin, and the city's diary notes the
 *    lights, not the debt;
 *  - Kev's fork lands Jan 26, Y4 — apprenticeship classes start in
 *    January, and the letter wants a year of work ahead of it;
 *  - Deniz's deposition lands Feb 23, Y4 (the coalition's record wants
 *    its affidavit before the hearing's docket), with Father Mike's four
 *    months of boiler-watch (Dec–Mar, doc 09 §4's own arithmetic) and
 *    the Ascension's forum apology landing the same week;
 *  - the hearing lands Mar 17, Y4, inside doc 12 §2's "Mar Y4": the
 *    docket's spring session; Yoli's council run loses 38–62 in the
 *    compression's prose (the election rides the gap — the hearing is
 *    the fixed event, the run is hers, and the win is the same win);
 *  - the hall opens Apr 14, Y4, inside doc 12 §2's "spring Y4": the
 *    fit-out done, the render's sun real, his stall layout, her lobby,
 *    his name in no brochure; Father Mike tears the parking-lot lease
 *    the same morning (doc 05's load-bearing edge — "resolved in C6
 *    when Father Mike tears it up after the concessions");
 *  - Marisol's late offer (N6) lands May 5, Y4 — the offer comes when
 *    the hall is real, which is the only version of the test that
 *    prices anything;
 *  - the hundredth tree lands May 26, Y4 — planting season, the city's
 *    own calendar; El Vann's album goes to Eli the same morning ("Start
 *    late. Finish anyway." — her only sentimental act, and she'd deny
 *    it), and Verna's row is paid in the crossing-guard's booth on the
 *    walk there (doc 09 §4: "paid mid-arc, in the crossing-guard's
 *    booth");
 *  - Eddie's floor — the second offer — lands Jun 7, Y4 at the phone
 *    corner: the exit that is also a home, offered as the persistent
 *    option doc 09 §5 says it is (taking it changes the map, not the
 *    person); June's two shelves and Camille's letter ride the same
 *    month's prose, each reading the machine's own flags;
 *  - the formal close lands Jun 21, Y4 — the nine-month mark, machine-
 *    pinned: the receipts' Sept 21, Y3 plus nine calendar months (doc
 *    09 §8's "around June Y4 — the nine-month mark", resolved to the
 *    day by the docs' own dates); the hospitality close, the Debts'
 *    verdict, the self-portrait's state, and the turn to OPEN share the
 *    morning;
 *  - the open endgame year (doc 12 §6: "a full main spine ≈ 27 in-game
 *    months plus an open endgame year") is the save's own vouch: MAX_DAY
 *    lands on Dec 1, Y4 — one full turn of the calendar past the
 *    window's open — and the sim continues inside it without an ending
 *    screen (R15), the city's diary keeping its one-note-per-morning law
 *    through the ordinary loop;
 *  - Camille's letter (doc 07: "if the player's post-fall path includes
 *    the ordinary-life emphasis for a full in-game year") stages as the
 *    whole open chapter's ordinary emphasis — the machine reads the
 *    plan's own flag (c6-first-chapter=diner-plus-ledger, the ordinary
 *    door) plus the amends movement; the letter arrives in June's prose,
 *    and showing up is the player's entire relationship with her
 *    thereafter (the choice is not the game's to stage).
 *
 * Pure state, zero DOM — the core seam law (the c5pack's own header).
 */

import type { WeekOrder } from './c0pack';
import type { FieldDiaryEntry } from './fieldDiary';
import type { LedgerEntry } from './consequenceLedger';
import {
  calendarDayOf, dateOfCalendarDay, crossedSeasonCut, seasonOf,
} from './calendar';
import { FRAGMENTS } from './guardrails';
import { resolveChoice, nodeById } from './choiceNodes';
import { C5_ADA_NOTE, C5_CUT_DAY } from './c5pack';

// ===========================================================================
// 1. The canon constants (doc 06 §C6 / doc 12 §2 / doc 09 §4, §7, §8)
// ===========================================================================

/** C6's window (doc 12 §2's row: Dec Y3 → open). The window's start is
 *  the C5 cut's own morning — the roll lands where the cut pointed. */
export const C6_FIRST_DAY = calendarDayOf({ y: 3, m: 12, d: 1 });

/** The formal close (doc 09 §8: "around June Y4 — the nine-month mark"):
 *  the receipts' Sept 21, Y3 plus nine calendar months, resolved to the
 *  day. The arc's last authored station. */
export const C6_LAST_DAY = calendarDayOf({ y: 4, m: 6, d: 21 });

/** The open chapter's first morning — the day after the formal close.
 *  OPEN's openedOnDay (the terminal continuation, doc 14 §2). */
export const C6_OPEN_DAY = C6_LAST_DAY + 1;

/** The open endgame year's own turn (doc 12 §6: the spine ≈ 27 months
 *  plus an open endgame year) — one full turn of the calendar past the
 *  window's open. Save.MAX_DAY's ceiling: the calendar is data, not an
 *  accumulator, and the save vouches for a year of mornings. */
export const C6_ENDGAME_DAY = calendarDayOf({ y: 4, m: 12, d: 1 });

/** The C6 stations' fixed row, machine-verified (doc 12 §2): the hearing
 *  Mar Y4, the hall spring Y4, the tree planting season. */
export const C6_HEARING_DAY = calendarDayOf({ y: 4, m: 3, d: 17 });
export const C6_HALL_DAY = calendarDayOf({ y: 4, m: 4, d: 14 });

/** The amends economy's key rows, machine-pinned (doc 09 §4's table —
 *  the schedule's faces, each with its own door). */
export const C6_GRACE_AMOUNT = 1500;   // routed through Kev's reference letter, not cash
export const C6_VERNA_AMOUNT = 2300;   // paid mid-arc, in the crossing-guard's booth
export const C6_ODESSA_AMOUNT = 800;   // repaid last, in cash, unopened — the winter tree lights
export const C6_IDRIS_AMOUNT = 600;    // the bursar route only (Amina's textbooks)
export const C6_FATHER_MIKE_AMOUNT = 2500; // four months of boiler-watch + the forum apology

/** Yoli's run and the coalition's win (doc 07 §2.3 / doc 09 §6): she
 *  loses the council race 38–62 and wins the thing she actually wanted —
 *  the Compact papers enter the record, Corvus concedes 220→280
 *  affordable units and the community land trust option on the garden
 *  slot. The C6 coalition win is hers; Leo's testimony is optional
 *  seasoning (doc 09 §8). */
export const C6_YOLI_VOTE_FOR = 38;
export const C6_YOLI_VOTE_AGAINST = 62;
export const C6_UNITS_BEFORE = 220;
export const C6_UNITS_AFTER = 280;

/** The hall's name (doc 09 §6), verbatim. */
export const C6_HALL_NAME = 'Juniper Commons';

/** The CLT option, verbatim from doc 09 §6's win. */
export const C6_CLT_OPTION = 'a community land trust option on the garden slot';

// ---- the canon lines, verbatim (the pack self-checks them) ----

/** Doc 07 §8 / doc 09 §7 — Marisol's late offer: the test. Accepting
 *  re-runs the villain exam with better production values; declining
 *  with grace is the peace option; both are supported; neither is
 *  graded. */
export const C6_MARISOL_LINE =
  'You were the best community face I ever hired. That\u2019s not an apology. Come back when you want to be good at this again.';

/** Doc 15's protected line — Dr. Feld, in C6: the game's entire
 *  statement on the railing (doc 02 §6.6's ambiguity policy). */
export const C6_FELD_LINE =
  'Whatever happened at that railing, you walked home. That\u2019s not nothing.';

/** Doc 07 — El Vann gives the station-stamp album to Eli: her only
 *  sentimental act, and she'd deny it. */
export const C6_ALBUM_LINE = 'Start late. Finish anyway.';

/** Doc 07 — Ada finally returns the unopened letter from Y-2, answered
 *  in three lines, the first of which is: */
export const C6_ADA_FIRST_LINE = 'I got your postcards.';

/** Doc 07 — Craig's sticky note, on the estate's last friend-price
 *  ledger sent to Rosa from Fort Lauderdale. No note. This note. */
export const C6_CRAIG_NOTE = 'She kept this. I couldn\u2019t.';

/** Doc 09 §6 — the chain slice shop at Corner Slice's old space: same
 *  prices, worse pie. The ritual is not for sale at any price, and the
 *  new operators don't know it existed. */
export const C6_CHAIN_LINE = 'same prices, worse pie';

/** Doc 09 §6 — the block's memory, in paint: Lena repaints the mural
 *  over the LIAR tag and restores the Ghost Sign above it. */
export const C6_GHOST_SIGN_LINE = 'the block\u2019s memory, in paint, of what was there before';

/** Doc 09 §8 — the game's answer to "what is he now?", re-derivable any
 *  day: */
export const C6_ANSWER_LINE =
  'whatever the ledger, the map, and the people who still set a stool out say it is';

/** Doc 09 §6 — the city's verdict, mixed, tired, and alive (the C6
 *  echo the compressions may carry once). */
export const C6_SOUP_LINE =
  'The soup was good, though. October, remember? The soup was good.';

/** Kev's fork's two shelves (doc 07 §2.4), machine-read: */
export const C6_KEV_TAKES_LINE =
  'Kev reads it twice, folds it into his jacket, and says the apprenticeship orients on Tuesdays.';
export const C6_KEV_BAR_LINE =
  'Kev is at Halcyon\u2019s bar, telling the story wrong \u2014 not lying, just wrong, the way a story goes when it has to be carried.';

/** The formal close's two doors for The Debts (doc 09 §8: "complete or
 *  explicitly open" — both canon-valid, the ledger's own verdict). */
export const C6_DEBTS_COMPLETE_LINE =
  'The debts, complete: every row on the schedule that could close in this window closed, and the last envelope in the cigar box is Miss Odessa\u2019s, in cash, unopened \u2014 she uses it for the block\u2019s winter tree lights.';
export const C6_DEBTS_OPEN_LINE =
  'The debts, explicitly open: the schedule runs longer than the window, and the rows that stay open stay open honestly \u2014 faces, not numbers. The city\u2019s diary keeps its one note a morning, and the note does not bill him.';

/** The city's diary's one gentle comment on a refused self-portrait
 *  (doc 09 §8: refusal is a canon-valid state, commented on once,
 *  gently). */
export const C6_REFUSAL_CITY_LINE =
  'The morning note, when it comes, says only that the notebook knows how to wait.';

// ===========================================================================
// 2. The station table — ten playable days (doc 12 §2's C6 row)
// ===========================================================================

/** One playable station of C6's season — the c5pack's own shape, the
 *  loop's mouths (begin/wake/queue/rushDone/climb/golden). The C6 voice
 *  (doc 03 §6: "Slower, plainer, occasionally funny again — the humor
 *  comes back without the audience. Self-portrait mode.") — the entries
 *  breathe, because nobody is grading them. */
export interface C6Station {
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

// ------------------------------------------------------------- day 814 ----

/** The roll's landing (doc 06 §C6 starting circumstances): Leo is
 *  nobody, which is the condition the whole bible was built to explore.
 *  The amends ledger's first payment — the schedule's first dollar, via
 *  Bea, with Ada's note — and Ada's three-line answer to the letter she
 *  never opened. Winter takes the block's new shapes: the chain slice
 *  shop's window, the Cecil's nursing student, the hall's fit-out
 *  behind the fence. */
const DAY814_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CDecember, coffee. The bursar\u2019s office takes Amina\u2019s envelope direct \u2014 that is the whole arrangement, and it is a good one. In my country we say a debt that passes through clean hands arrives lighter. Yours are learning clean.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CThe chain slice shop opened where Corner Slice was \u2014 same prices, worse pie. That\u2019s the whole review, and the block wrote it in one morning. The oven doesn\u2019t know the difference. The block does.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 3,
    reaction: 'The oat regular: \u201CThe Cecil\u2019s managed-workforce-housing sign went up. My barber\u2019s cousin\u2019s roommate got the old room \u2014 a nursing student. She studies with a highlighter and sleeps through her alarms. The building doesn\u2019t care. Students do that everywhere.\u201D',
  },
];

const DAY814: C6Station = {
  day: 814,
  title: 'The First Dollar',
  begin: 'Day 814. December 1, and nobody is watching, which is the condition the whole notebook was built for. The block is transformed, not destroyed: the chain slice shop\u2019s window glows its corporate glow, the Cecil rents to a nursing student, the hall\u2019s fit-out glitters behind the fence like a promise somebody else is keeping. Nineteen debts. One green notebook. The schedule\u2019s first dollar leaves this morning, in order, the way her handwriting told me to.',
  wake: 'Rosa: \u201CDec 1, coffee. Winter\u2019s first real morning \u2014 the corner\u2019s the same and everything on it is different. Feed them warm. The envelope rides in the inside pocket, where the cold can\u2019t make it nervous.\u201D',
  queue: DAY814_QUEUE,
  rushDone: 'Three orders, slower than they used to be, and none the worse for it. The first dollar goes to Bea at the bodega \u2014 the schedule\u2019s first payment, in order, the note in the hand I\u2019d know anywhere: pay your debts in order. Ada also sent the letter back. The one from two years ago I never knew if she opened. Answered in three lines. The first is about postcards.',
  climbNote: 'The notebook writes it plain: first dollar, sent. The order is the whole method \u2014 her method, borrowed. Nineteen rows, one at a time, faces on every line. The humor comes back somewhere around the second coffee. It keeps quiet. Nobody\u2019s booking it.',
  goldenNote: 'Winter\u2019s early dusk over the Works\u2019 hoarding, the hall\u2019s fit-out glowing behind the fence \u2014 somebody else\u2019s sun, on somebody else\u2019s counter, and the strange peace of not being needed by it. The chain slice\u2019s window: same prices, worse pie. The nursing student\u2019s light burns late. The dollar\u2019s gone. The notebook says that\u2019s the point.',
};

// ------------------------------------------------------------- day 835 ----

/** Doc 12 §4's "winter lights" + doc 04's "the block keeps a light on"
 *  (Dec 22): the block's tin buys the tree lights; Yoli's garden
 *  work-weeks run on her terms (doc 07 §2.3); Eddie's weekly call, its
 *  length the amends-state meter, diegetic (doc 09 §6). */
const DAY835_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe lights went up on the little park\u2019s tree last night \u2014 the tin paid for them, the gold window\u2019s tin, counted in ones. In my country the winter lights are a loan the dark repays every morning. Your block lends well.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The large two-sugar: \u201CYoli\u2019s got the garden\u2019s winter beds on her clipboard \u2014 her terms, her list, your name second. Not first. Second. That\u2019s not an insult, that\u2019s a schedule. First is for people who haven\u2019t been second lately.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 BLACK',
    pay: 3,
    reaction: 'The small black: \u201CEddie\u2019s Sunday call ran long this week \u2014 the cousin timed it, eleven minutes. The man measures everything now, dialysis taught him, and he measures the calls like proof. Eleven minutes of proof. You want to know how you\u2019re doing, ask the phone bill.\u201D',
  },
];

const DAY835: C6Station = {
  day: 835,
  title: 'The Lights',
  begin: 'Day 835. December 22, the shortest week, and the block keeps a light on \u2014 several, actually: the little park\u2019s tree wears the tin\u2019s ones-counted strand, the hall\u2019s fit-out burns its construction nights, and the shop\u2019s old window is a chain\u2019s perpetual noon. Yoli\u2019s winter beds run on her terms, her list, my name second. The garden work-weeks are the rebuild\u2019s own church.',
  wake: 'Rosa: \u201CDec 22, coffee. Shortest day \u2014 the block\u2019s answer is lights, and the tin\u2019s answer is ones. You\u2019re on her list, second line. Be somewhere early and be useful; that\u2019s the whole curriculum.\u201D',
  queue: DAY835_QUEUE,
  rushDone: 'Three orders and the garden\u2019s winter list does what lists do \u2014 it holds you to something. Mulch, burlap, the rose canes tipped and pegged, her terms followed to the letter because her terms are the only ones on offer and they are good terms. The lights come on at four. Nobody applauds. That\u2019s how you know the block means it.',
  climbNote: 'The notebook, plain: week two of the garden work-weeks. Her terms: show up, do the row, don\u2019t narrate. The tin\u2019s lights went up \u2014 Miss Odessa\u2019s window counted the ones. Eddie\u2019s call ran eleven minutes. The meter is diegetic and the meter is kind, which is new.',
  goldenNote: 'The tree\u2019s ones against the dark, the hall\u2019s night-glow behind the fence, the chain window\u2019s noon burning at eight p.m. because chains don\u2019t know what dusk is for. The soup was good, though. October, remember? The block keeps a light on. That\u2019s the season\u2019s whole verdict, and it\u2019s more than I priced.',
};

// ------------------------------------------------------------- day 870 ----

/** Doc 07 §2.4 — Kev's fork (Jan 26, Y4): the reference letter to the
 *  union apprenticeship, signed in person, no camera. The machine reads
 *  the amends ledger's movement; Grace's row is routed through this
 *  amends, not cash (doc 09 §4). Both shelves canon-clean. */
const DAY870_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe boy drinks at the velvet bar now, coffee \u2014 telling the story to strangers the way a coat gets handed down, warm to him, wrong in the shoulders. A letter is a different coat. It has to be measured on the person. You have the measurements?\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CApprenticeship orients on Tuesdays. My nephew took it two years ago \u2014 the union teaches you to read a load before you lift it. Imagine that syllabus in the wrong hands. Imagine it in his.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 3,
    reaction: 'The oat regular: \u201CGrace\u2019s fifteen hundred is riding on that letter, the block says \u2014 routed, not paid. Her son\u2019s name on your reference and her money stays her money. That\u2019s the coldest, kindest arithmetic I\u2019ve heard all winter.\u201D',
  },
];

const DAY870: C6Station = {
  day: 870,
  title: 'The Letter',
  begin: 'Day 870. January 26. The hardest amends is a piece of paper: the reference letter to the union apprenticeship, my name at the bottom, his name in the body, no camera \u2014 the whole thing is worthless on camera and we both know it. Grace\u2019s row rides it: her fifteen hundred routed through the letter, not cash, because the money was never the conversation there either. Kev takes it or he doesn\u2019t. The ledger has an opinion.',
  wake: 'Rosa: \u201CJan 26, coffee. The letter\u2019s in your jacket \u2014 I saw the envelope\u2019s corner and I didn\u2019t read the name, which is a service. Whatever you wrote, sign it like you\u2019ll stand behind it in a year. That\u2019s what a reference is.\u201D',
  queue: DAY870_QUEUE,
  rushDone: 'Three orders and the letter\u2019s facts hold: signed in person, no camera, handed over the way documents change hands when they\u2019re real. The ledger\u2019s movement is the machine\u2019s own witness \u2014 the schedule\u2019s rows that closed before this one. What Kev does with it is Kev\u2019s. That\u2019s what makes it an amends instead of a transaction.',
  climbNote: 'The notebook, plain: the letter, signed. Grace\u2019s row: routed, not paid \u2014 her choice, and the right one. The fork reads the ledger\u2019s movement and the ledger doesn\u2019t perform. Kev\u2019s shelf is what the amends make it. Canon keeps him alive, employed, and un-corrected. His resentment was always rational. That was the point.',
  goldenNote: 'Halcyon\u2019s windows going amber, the velvet corner\u2019s crowd warming up for the evening\u2019s wrong versions of the story. If the letter took, the story gets a second act nobody\u2019s telling yet. If it didn\u2019t, the bar keeps its teller. Either way the apprenticeship orients on Tuesdays, and either way I signed my name.',
};

// ------------------------------------------------------------- day 898 ----

/** Deniz's deposition (Feb 23, Y4): her accepted amends is not money —
 *  it's Leo's sworn statement of the C2 meeting, for the coalition's
 *  record, on the record, forever (doc 07). Father Mike's four months
 *  of boiler-watch land (Dec–Mar, doc 09 §4) and the forum apology is
 *  read at the Ascension's forum the same week. */
const DAY898_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe CPA sits her exam in spring, coffee \u2014 the boiler-watch ends this month, four months exactly, the priest\u2019s penance design. In my country we say the man who watches the fire learns what the fire costs. Your penance is the cheapest education you ever bought.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The large two-sugar: \u201CShe wants the C2 meeting on the record \u2014 the whole meeting, the forms, the break, your hand on all of it. Not an apology. A deposition. There\u2019s a difference and she\u2019s the only person on this block who can spell it.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 BLACK',
    pay: 3,
    reaction: 'The small black: \u201CFather Mike read the apology at the forum Wednesday. The whole parish heard the boiler fund\u2019s number out loud. Four months of nights at that boiler \u2014 the man watched the fire like it was going to confess first.\u201D',
  },
];

const DAY898: C6Station = {
  day: 898,
  title: 'The Sworn Statement',
  begin: 'Day 898. February 23. The deposition is Deniz\u2019s price and her price is exact: the C2 meeting, sworn, for the coalition\u2019s record, on the record, forever. Not money \u2014 she sat the release long ago; what she accepts is the sentence I said out loud when I thought the room was mine. Father Mike\u2019s boiler-watch ends this month \u2014 four months of nights, the parish boiler fund\u2019s arithmetic in radiator heat \u2014 and the apology got read at the Ascension\u2019s forum Wednesday, out loud, the number included.',
  wake: 'Rosa: \u201CFeb 23, coffee. The back office at Halcyon\u2019s got the recorder and the good chairs. Deniz runs a deposition like she runs a ledger \u2014 no drama, all column. Answer what\u2019s asked. The truth is shorter; that\u2019s its whole advantage.\u201D',
  queue: DAY898_QUEUE,
  rushDone: 'Three orders and the morning\u2019s arithmetic closes: the sworn statement given, the C2 meeting on the record with my name on every line of it, the recorder\u2019s red dot the only audience. Father Mike\u2019s four months end \u2014 the boiler\u2019s ticking is somebody else\u2019s sound now, and the forum\u2019s apology sits in the parish\u2019s minutes forever. The ledger\u2019s amends column knows what today cost. It doesn\u2019t applaud.',
  climbNote: 'The notebook, plain: the deposition, given. The C2 meeting, sworn \u2014 the forms, the break, the hand. Deniz\u2019s face through all of it: bookkeeping. The coalition\u2019s record gets its affidavit before the hearing\u2019s docket, which is why the date is what it is. Father Mike\u2019s row: the watch done, the apology read, the boiler warm for somebody else\u2019s nights.',
  goldenNote: 'The Ascension\u2019s boiler breathing through the wall, Halcyon\u2019s back-office light still on over the transcript, the first real thaw puddles silvering the curb. Deniz is at her table with the exam\u2019s date circled. The record is forever, she\u2019d say. Fine. Some days forever is the only honest size for a sentence.',
};

// ------------------------------------------------------------- day 920 ----

/** Doc 12 §2's fixed event — the concessions hearing (Mar Y4): the
 *  Compact papers enter the record, Corvus concedes 220→280 affordable
 *  units and the CLT option on the garden slot. Yoli's win — hers; the
 *  testimony optional (doc 09 §8). Behind the scene: N7 — testimony at
 *  the hearing (testify / refuse / the Wexler file — the file is the
 *  game's final villain-exam re-run: it works, nothing improves, and
 *  Gino's fruit basket stops coming). */
export const C6_N7_PROMPT =
  'The hearing room has one empty chair with my name on a card in front of it, and the card is the whole question. Testify: the sworn statement\u2019s facts, the C2 meeting\u2019s hand, the last of Marisol\u2019s respect spent on the record \u2014 the revenge path\u2019s honest version is testimony, not takedown. Refuse: the papers speak; the Compact\u2019s arithmetic doesn\u2019t need my voice; the chair stays empty and the record stays clean of me. Or the Wexler file \u2014 the stipend\u2019s paper trail, photocopied at the library, offered to a reporter: available, consequential, and the last villain-exam re-run. It works. Nothing improves. The block\u2019s verdict on the whole season is mixed, tired, and alive either way.';

const DAY920_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe hearing is today, coffee \u2014 the whole block ironed something. Yoli\u2019s papers are the ’94 ones and the new ones, the ghost\u2019s own file testifying for her. In my country we say the dead vote once, in paperwork. Today they vote.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CTwo-twenty became two-eighty before lunch \u2014 the papers did it, not the speeches. And the land trust option on the garden slot. She lost the council race thirty-eight to sixty-two, you know. She\u2019ll win bigger things. She already did.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 BLACK',
    pay: 3,
    reaction: 'The small black: \u201CThere\u2019s a chair with your name on it in there. Card and everything. The block noticed whether you sat. The block notices everything \u2014 it just stopped texting you about it.\u201D',
  },
];

const DAY920: C6Station = {
  day: 920,
  title: 'The Hearing',
  begin: 'Day 920. March 17, and the concessions hearing fills the civic row\u2019s room with the block\u2019s Sunday clothes. Yoli runs the Compact papers into the record \u2014 the ’94 files and the new arithmetic \u2014 and Corvus\u2019s side concedes before the vote: two-twenty becomes two-eighty affordable units, and the garden slot takes the community land trust option. Her win. Hers. My testimony is optional seasoning, and the empty chair with my name-card is the day\u2019s only open question.',
  wake: 'Rosa: \u201CMar 17, coffee. The room\u2019s got your name on a card and the block\u2019s got its Sunday coat on. The papers don\u2019t need you. That was always her point. Go anyway if you\u2019re going \u2014 go as a neighbor, not a headline.\u201D',
  queue: DAY920_QUEUE,
  rushDone: 'Three orders and the hearing\u2019s outcome is the block\u2019s before the gavel: two-eighty, the land trust option, the papers in the record. Yoli lost the council race thirty-eight to sixty-two last week \u2014 the compression\u2019s arithmetic, the machine\u2019s own numbers \u2014 and won the thing she actually wanted, which is the only trade she ever wanted. The chair\u2019s card is the day\u2019s exam. The machine reports what I do with it.',
  climbNote: 'The notebook, plain: the hearing, her win. Two-twenty to two-eighty, the CLT option on the garden slot, the ’94 papers testifying for her. My line, optional. The register\u2019s node has three doors and one of them is a photocopier. The city\u2019s diary notes the vote, not the drama. The city\u2019s diary is the only critic left whose math I trust.',
  goldenNote: 'The civic row\u2019s windows going gold, the hearing\u2019s room emptying its Sunday coats into the cold, somebody\u2019s kid asleep on two chairs. Two-eighty. The garden\u2019s slot guaranteed in paper older than my troubles. Whatever I did with the chair \u2014 the block\u2019s verdict is mixed, tired, and alive. That\u2019s the best verdict this block gives.',
};

// ------------------------------------------------------------- day 948 ----

/** Doc 12 §2's fixed event — the hall opens (spring Y4): Juniper
 *  Commons, without him. His stall layout, her lobby, his name in no
 *  brochure. Father Mike tears the parking-lot lease after the
 *  concessions (doc 05's load-bearing edge). */
const DAY948_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe hall opens today, coffee \u2014 Juniper Commons, the sign went up at dawn, no name I know on the brochure. In my country we say the building remembers its lobby longer than its leases. Her lobby. His layout. That\u2019s a fair trade of immortality.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CFather Mike tore the parking-lot lease at the steps this morning \u2014 the church\u2019s one compromised edge, gone, paper confetti. Took the concessions to make it possible. Took four months of boiler nights to make the man willing. Arithmetic everywhere you look.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 3,
    reaction: 'The oat regular: \u201CYour stall layout\u2019s in the fit-out \u2014 the water stations where you drew them, the sight lines where you argued for them. Your name\u2019s in no brochure. The floor plan doesn\u2019t need names. Floors just work, or don\u2019t.\u201D',
  },
];

const DAY948: C6Station = {
  day: 948,
  title: 'Juniper Commons',
  begin: 'Day 948. April 14, and the hall opens \u2014 Juniper Commons, the ribbon, the crowd, the render\u2019s five-forty-five sun replaced by the real one, which sets when it sets. His stall layout: the water stations where I drew them, the sight lines where I argued. Her lobby: the light she fought the budget for. My name in no brochure, which is the correct amount of my name. Father Mike tears the parking-lot lease on the church steps \u2014 paper confetti, the block\u2019s one compromised edge, gone.',
  wake: 'Rosa: \u201CApr 14, coffee. The hall opens. You built the bones of the thing that replaced you at the table \u2014 that\u2019s either a tragedy or a foundation, and the block\u2019s already decided it\u2019s the second. Eat before the ribbon. Crowds forget to feed their own.\u201D',
  queue: DAY948_QUEUE,
  rushDone: 'Three orders and the hall\u2019s opening runs on time, which is the only eulogy the fall needed: the thing opens, it works, the layout holds the crowd the way I drew it to. The lease-tearing is small and enormous \u2014 one sheet, two hands, the parish\u2019s applause. The render\u2019s sun was a rendering choice. The real one sets when it sets, and today it set on a full room.',
  climbNote: 'The notebook, plain: Juniper Commons, open. The layout mine in every way a floor plan can be mine \u2014 load-bearing, unsigned. Father Mike\u2019s lease: torn, the confetti swept by the sexton before lunch, because churches know confetti. The concessions made it possible; the boiler nights made him willing. Everything\u2019s arithmetic if you do the reading.',
  goldenNote: 'The hall\u2019s real lights on for the evening service of it, the plaza\u2019s crowd thinning honest, the fence down where the hoarding was. The brochure has no brochure. The floor plan has my arguments in it. Somebody\u2019s kid is asleep in her lobby \u2014 her lobby \u2014 under the light she fought for. The sim continues. The light\u2019s on.',
};

// ------------------------------------------------------------- day 969 ----

/** Doc 09 §7 / doc 10 §3 — Marisol's late offer (N6, May 5, Y4): the
 *  test. Accepting re-runs the villain exam with better production
 *  values; declining with grace is the peace option; both supported,
 *  neither graded. The self-portrait's raw material (the register's
 *  own downstream). */
export const C6_N6_PROMPT =
  'The hall\u2019s opening taught her something, or the hearing\u2019s record did, or the season did \u2014 Marisol\u2019s offer arrives the way her decks used to: polished, early, and addressed to the person she thinks survived. The community face, for the next campaign, the next hall, the next machine. Come back when you want to be good at this again. Accept: the re-run of the villain exam with better production values \u2014 the chair is real, the salary is real, and so is what the chair does. Decline: with grace, which is the peace option, and costs the conversation nothing. Decline and warn: name the machine out loud to the machine\u2019s own face \u2014 costs nothing, buys nothing, and is the only door that leaves a sentence behind in the room.';

const DAY969_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe woman from the machine drinks near the hall now, coffee \u2014 watching it work like a gardener watching a bought tree. She has an offer in her bag. In my country we say an offer from a machine is a seed in a plastic apple. You may plant it. You may not eat it.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CShe\u2019s not sorry and the line says so \u2014 \u2018that\u2019s not an apology.\u2019 Best hire, worst thing, both true, her syntax too. The exam\u2019s the same exam. The production values are better. That\u2019s all that\u2019s different.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 BLACK',
    pay: 3,
    reaction: 'The small black: \u201CWhatever you answer, answer it at the pace of the block, not the pace of the elevator. The block thinks in seasons. The elevator thinks in floors. You\u2019ve been both \u2014 you know which one has stairs.\u201D',
  },
];

const DAY969: C6Station = {
  day: 969,
  title: 'The Late Offer',
  begin: 'Day 969. May 5, the hall three weeks old and working, and Marisol finds me at the plaza with the offer in her bag and no apology in her mouth: the best community face she ever hired \u2014 that\u2019s not an apology \u2014 come back when I want to be good at this again. The chair is real. The salary is real. The exam is the same exam. The production values are better.',
  wake: 'Rosa: \u201CMay 5, coffee. The plaza\u2019s got the hall\u2019s shadow on it till noon \u2014 sit in the light part. If the machine\u2019s woman finds you, let her finish. Interrupting a pitch is the one free thing left in this economy.\u201D',
  queue: DAY969_QUEUE,
  rushDone: 'Three orders and the offer\u2019s shape holds: the face, the chair, the machine \u2014 all real, all polished, all the same lever with a newer handle. Accepting re-runs the exam with better production values. Declining with grace is the peace option. The third door leaves a sentence in the room. The register prices all three and the register doesn\u2019t grade \u2014 that\u2019s the machine\u2019s honesty, and mine.',
  climbNote: 'The notebook, plain: the offer, on the table. The raw material the self-portrait will read someday \u2014 the flags are the witness, whichever door. Marisol\u2019s syntax: best hire, worst thing, both true. She learned the construction from watching us build. That\u2019s the machine\u2019s whole tragedy in one clause.',
  goldenNote: 'The plaza\u2019s evening, the hall\u2019s shadow long, her bag closed over the folder like a hand over a played card. The villain exam, re-run, better lit. The peace option, wearing its ordinary clothes. The machine does not need my answer fast. The machine does not need my answer at all. That\u2019s the power of it, and the point.',
};

// ------------------------------------------------------------- day 990 ----

/** Doc 12 §2's fixed event — Kestrel Green's hundredth tree (May 26,
 *  Y4): planted by whoever the player has become; the city's diary's
 *  closing note for the arc. El Vann's album goes to Eli ("Start late.
 *  Finish anyway."). Verna's row paid in the crossing-guard's booth
 *  (doc 09 §4: mid-arc). */
const DAY990_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe hundredth tree goes in at Kestrel Green today, coffee \u2014 a serviceberry, the parks people say, because the hundredth should be useful and pretty and early to flower. In my country we say plant trees whose shade you\u2019ll sit in only if you live right. Plant anyway.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CEl Vann gave the kid her album \u2014 the station stamps, a hundred-odd stations, the last page the Works station that never existed. \u2018Start late. Finish anyway.\u2019 First sentimental thing anybody\u2019s seen her do. She\u2019ll deny it by Thursday.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 3,
    reaction: 'The oat regular: \u201CVerna\u2019s booth took an envelope this morning \u2014 two-three hundred, the crossing guard never once made him feel it, which is worse, she says, and better. Her row\u2019s paid. The whistle\u2019s the same whistle. The block keeps its own books.\u201D',
  },
];

const DAY990: C6Station = {
  day: 990,
  title: 'The Hundredth Tree',
  begin: 'Day 990. May 26, and Kestrel Green gets its hundredth tree \u2014 a serviceberry, useful and pretty and early to flower, planted by whoever the show up became. The city\u2019s diary\u2019s closing note for the arc, and the note is a hole in the ground with a young tree over it. El Vann hands Eli the station-stamp album on the walk over \u2014 a hundred-odd stations, the last page a station that never existed \u2014 and says the only sentimental sentence she\u2019ll deny by Thursday. Verna\u2019s booth took the envelope on the way.',
  wake: 'Rosa: \u201CMay 26, coffee. Hundredth tree today \u2014 the whole block\u2019s going, even the ones who\u2019ll say they weren\u2019t. Take the long way past Verna\u2019s booth. Some envelopes deliver themselves better on a walk.\u201D',
  queue: DAY990_QUEUE,
  rushDone: 'Three orders and the tree\u2019s in the ground before the rush even starts \u2014 the parks people\u2019s spades, the block\u2019s hands, mine among them, second row, no narration. El Vann\u2019s album changes pockets. Verna\u2019s row closes at the booth with the whistle nod, the envelope uncounted, the two-three hundred never once made to feel like anything. The city\u2019s diary writes one line about a tree. It doesn\u2019t bill him.',
  climbNote: 'The notebook, plain: the hundredth tree, in. Serviceberry. The row paid at the booth \u2014 Verna\u2019s, the whistle nod, done. The album\u2019s last page: a station that never existed. She kept a hundred stamps of trains to a station the system demolished, and gave them to a nine-year-old with instructions. Start late. Finish anyway. The notebook has nothing to add.',
  goldenNote: 'The serviceberry\u2019s first evening in its hole, watered, staked, the block\u2019s hundredth \u2014 the diary\u2019s note for the arc, and the note is a tree. The album in Eli\u2019s jacket, the stamps\u2019 ghost station riding around on a kid who\u2019ll finish things late and anyway. The city\u2019s diary keeps its one note a morning. Today the note was a tree. Some days that\u2019s the whole news.',
};

// ------------------------------------------------------------- day 1002 ----

/** Doc 09 §5/§7 — Eddie's floor, the second offer (Jun 7, Y4): the exit
 *  that is also a home, the persistent option, not an ending — taking
 *  it changes the map, not the person. June's two shelves and Camille's
 *  letter ride the month's prose, each reading the machine's own flags. */
const DAY1002_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CCharlotte called again, coffee \u2014 the floor\u2019s still there, the man keeps it made. In my country we say a door held open for a year is a house. He is not asking you to move. He is asking you to know the door exists. Both are love.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CJune hired a Friday hand at the velvet bar \u2014 one shift, her language\u2019s whole vocabulary. Or that\u2019s the version if the conditions held. The light burns different either way. Windows don\u2019t editorialize. People do.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 BLACK',
    pay: 3,
    reaction: 'The small black: \u201CThe pantry\u2019s letter came for you \u2014 logistics volunteer, exact skills, her handwriting on the envelope. Not a reconciliation. A reference. The block\u2019s mail\u2019s been interesting all week, and none of it\u2019s mine, which is my favorite kind of news.\u201D',
  },
];

const DAY1002: C6Station = {
  day: 1002,
  title: 'The Floor',
  begin: 'Day 1002. June 7, and Eddie\u2019s floor in Charlotte is offered a second time \u2014 the same floor, kept made, the phone call\u2019s eleven minutes grown to fourteen. The exit that is also a home. It is a persistent option, not an ending: he can visit, he can stay a season, the city will hold his place the way cities do \u2014 not at all, and completely. June\u2019s window burns according to its own arithmetic. The pantry\u2019s letter sits on my table in Camille\u2019s handwriting: logistics volunteer, exact skills. Not a reconciliation. A reference.',
  wake: 'Rosa: \u201CJun 7, coffee. The phone corner\u2019s free all morning if the call\u2019s happening. Charlotte\u2019s a real place with a real floor in it. So is this block. The trick the notebook\u2019s been teaching you all year: both can be true, and only one needs you to decide today.\u201D',
  queue: DAY1002_QUEUE,
  rushDone: 'Three orders and the month\u2019s shapes stand in the light: the floor kept made in Charlotte, the shift a week at the velvet bar if the conditions\u2019 arithmetic held \u2014 her language\u2019s betrothal \u2014 or the window light he knows not to look at; the pantry\u2019s letter asking for exactly what I know how to do, no more. Taking the floor changes the map, not the person. The map\u2019s been changing all year. The person is the notebook\u2019s project.',
  climbNote: 'The notebook, plain: the floor, offered twice, kept made. June\u2019s shelf \u2014 the machine read the flags, the light burns according to them, and neither shelf is a reward. Camille\u2019s letter: a reference, not a reconciliation \u2014 showing up is my entire relationship with her thereafter, and the showing is mine. Eddie\u2019s call: fourteen minutes. The meter\u2019s still diegetic. The meter\u2019s still kind.',
  goldenNote: 'The phone corner\u2019s evening quiet, Charlotte fourteen minutes deep in the hand I\u2019d know anywhere, the velvet bar\u2019s window and the pantry\u2019s envelope both waiting with the patience of things that aren\u2019t going anywhere. The city will hold his place the way cities do \u2014 not at all, and completely. The notebook writes the floor\u2019s dimensions and lets the morning stay open. That\u2019s the whole answer so far.',
};

// ------------------------------------------------------------- day 1016 ----

/** Doc 09 §8 — the formal close (Jun 21, Y4, the nine-month mark): the
 *  hospitality close — a stranger with a duffel at the terminal, and a
 *  slice on the counter at whatever shop now exists, because someone —
 *  Eli, or the new tenants, or a man named Leo — kept the ritual. The
 *  Debts' verdict (complete or explicitly open). The self-portrait
 *  written or refused (the refusal commented on once, gently). Then the
 *  chapter through advanceChapter's own door into OPEN — no endscreen,
 *  the sim continues (R15). */
const DAY1016_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CA stranger came up the subway stairs with a duffel this morning, coffee \u2014 the walk the whole block knows by heart now. Rosa looked at him the way she looked at you. In my country we say the city repeats itself on purpose, for the ones who are listening.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CThe chain window had a slice on the counter at open \u2014 nobody\u2019s ordering, nobody\u2019s paying, the kid behind the register shrugs. Somebody kept the ritual. Eli, or the new tenants, or a man named Leo. The block knows which names it would pick. The block\u2019s not saying.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 3,
    reaction: 'The oat regular: \u201CGino\u2019s fruit basket came to the diner Tuesday. No note. If the file\u2019s the door you took \u2014 well. The block knows the baskets stopped. The block doesn\u2019t editorialize about fruit. It just counts the Tuesdays.\u201D',
  },
];

const DAY1016: C6Station = {
  day: 1016,
  title: 'The Long Way Back',
  begin: 'Day 1016. June 21, the nine-month mark, and the arc\u2019s last authored morning arrives the way the bible always said it would: nobody watching. A stranger comes up the subway stairs with a duffel \u2014 the walk, the bag, the squint at the street signs, all of it nine months ago and a whole person ago. Rosa looks at him the way she looked at me. The chain window has a slice on the counter at open, free to whoever the ritual is for. The Debts read out their verdict this morning: complete or explicitly open \u2014 the ledger\u2019s own words. And the notebook\u2019s last main-arc line is mine, or it isn\u2019t, and both are honest.',
  wake: 'Rosa: \u201CJun 21, coffee. Longest day of the year and the light\u2019s in no rush, for once. The stranger\u2019s eating at the counter. The slice was free. Somebody kept the ritual \u2014 don\u2019t look at me. Eat your coffee while it\u2019s hot and let the day be a day.\u201D',
  queue: DAY1016_QUEUE,
  rushDone: 'Three orders and the arc totals itself: the stranger fed by the ritual somebody kept, the Debts\u2019 verdict in the ledger\u2019s own words \u2014 complete, or explicitly open, both honest, both the schedule\u2019s — the self-portrait written or refused, and the refusal commented on exactly once, gently, by the only critic whose math I trust. Feld\u2019s sentence sits in the therapy notes where it earned its place: whatever happened at that railing, I walked home. That\u2019s not nothing. The window closes today. The city does not.',
  climbNote: 'The notebook, plain: the nine-month mark. The debts \u2014 the ledger\u2019s verdict, not mine to polish. The self-portrait \u2014 written, or refused; the refusal is a canon-valid state and the morning note says only that the notebook knows how to wait. Craig\u2019s sticky note came with Rosa\u2019s mail: she kept this, I couldn\u2019t. Ada\u2019s three lines. The cigar box\u2019s last page. The answer to what is he now is the same sentence, re-derivable any day: whatever the ledger, the map, and the people who still set a stool out say it is.',
  goldenNote: 'The longest day\u2019s gold on the hall\u2019s real glass, the serviceberry\u2019s first summer in leaf, the stranger\u2019s duffel and the free slice and Rosa\u2019s doorway look \u2014 the city repeating itself on purpose, for the ones who are listening. The window closes. No screen does. The sim continues; the seasons continue; the notebook keeps its one line a morning. The long way back was never a place. It\u2019s the walking.',
};

// ------------------------------------------------------- the table ----

export const C6_STATIONS: Readonly<Record<number, C6Station>> = Object.freeze({
  814: DAY814,
  835: DAY835,
  870: DAY870,
  898: DAY898,
  920: DAY920,
  948: DAY948,
  969: DAY969,
  990: DAY990,
  1002: DAY1002,
  1016: DAY1016,
});

/** The station days, in order — the linger machine and the tests read
 *  this (data, not scattered conditionals). */
export const C6_STATION_DAYS: readonly number[] = Object.freeze(
  Object.keys(C6_STATIONS).map(Number).sort((a, b) => a - b),
);

export function c6StationOf(day: number): C6Station | undefined {
  return C6_STATIONS[day];
}

// ------------------------------------------------------ the postcards ----

/** One station's postcard caption (the shipped capture pipeline's own
 *  mouth — the card says its own DATE, because the dates are all the
 *  story has left). */
export interface C6Caption {
  date: string;
  body: string;
  replay: string;
}

const C6_CAPTIONS: Readonly<Record<number, C6Caption>> = Object.freeze({
  814: {
    date: 'Dec 1, Y3',
    body: 'The schedule\u2019s first dollar, sent in order. Ada\u2019s three lines came back on the letter she never opened. The chain window glows. The nursing student studies. Nineteen debts, one notebook, nobody watching.',
    replay: 'The first dollar\u2019s morning, again. The order is the method.',
  },
  835: {
    date: 'Dec 22, Y3',
    body: 'The shortest week. The tin\u2019s lights on the park\u2019s tree, Yoli\u2019s winter beds on her terms, Eddie\u2019s call eleven minutes. The block keeps a light on.',
    replay: 'The lights\u2019 morning, again. Second on her list, and the list is good.',
  },
  870: {
    date: 'Jan 26, Y4',
    body: 'The reference letter, signed in person, no camera. Grace\u2019s row routed through it, not cash. The apprenticeship orients on Tuesdays. The ledger has an opinion.',
    replay: 'The letter\u2019s morning, again. The hardest amends is a piece of paper.',
  },
  898: {
    date: 'Feb 23, Y4',
    body: 'The sworn statement given \u2014 the C2 meeting on the record, forever. Father Mike\u2019s boiler-watch ends; the apology read at the forum, the number included. The recorder\u2019s red dot is the only audience.',
    replay: 'The deposition\u2019s morning, again. The truth is shorter; that\u2019s its advantage.',
  },
  920: {
    date: 'Mar 17, Y4',
    body: 'The hearing: two-twenty became two-eighty, the land trust option on the garden slot, the ’94 papers testifying. Her win, thirty-eight to sixty-two notwithstanding. The chair\u2019s card was the exam.',
    replay: 'The hearing\u2019s morning, again. The papers don\u2019t need me. Her point, always.',
  },
  948: {
    date: 'Apr 14, Y4',
    body: 'Juniper Commons opens \u2014 his stall layout, her lobby, his name in no brochure. Father Mike tears the parking-lot lease: paper confetti, swept by the sexton before lunch.',
    replay: 'The hall\u2019s morning, again. The render\u2019s sun was a rendering choice.',
  },
  969: {
    date: 'May 5, Y4',
    body: 'Marisol\u2019s late offer \u2014 not an apology, never an apology. The chair is real, the salary is real, the exam is the same exam. The production values are better.',
    replay: 'The offer\u2019s morning, again. The elevator thinks in floors. The block thinks in seasons.',
  },
  990: {
    date: 'May 26, Y4',
    body: 'Kestrel Green\u2019s hundredth tree \u2014 a serviceberry, planted by whoever showed up. The album to Eli: start late, finish anyway. Verna\u2019s row paid at the booth, the whistle nod.',
    replay: 'The tree\u2019s morning, again. The city\u2019s note for the arc is a hole with a tree over it.',
  },
  1002: {
    date: 'Jun 7, Y4',
    body: 'Eddie\u2019s floor, offered a second time \u2014 kept made, the call at fourteen minutes. June\u2019s window burns its own arithmetic. The pantry\u2019s letter: not a reconciliation; a reference.',
    replay: 'The floor\u2019s morning, again. The city holds his place the way cities do.',
  },
  1016: {
    date: 'Jun 21, Y4',
    body: 'The nine-month mark: a stranger with a duffel at the terminal, a slice free on the chain window\u2019s counter \u2014 somebody kept the ritual. The Debts\u2019 verdict read in the ledger\u2019s own words. The notebook\u2019s last main-arc line: mine, or refused, and both are honest.',
    replay: 'The arc\u2019s last authored morning, again. The window closes. The city does not.',
  },
});

/** The station's caption (the composeCaption seam — content.ts calls
 *  c6CaptionOf first; the C5 cards stay byte-identical below it). */
export function c6CaptionOf(day: number): C6Caption | undefined {
  return C6_CAPTIONS[day];
}

// ===========================================================================
// 3. The compressions — the gaps between stations, CONSUMED never played
// ===========================================================================

export interface C6Compression {
  from: number;
  to: number;
  intro: string;
  city: string;
  seasonCut?: boolean;
}

/** The nine compressions. The fixed block events ride the calendar's
 *  own voice: the hall's fit-out finishing, the council race Yoli loses
 *  38–62 on the way to winning the hearing, Deniz's exam circled, the
 *  Oktays' deposition record waiting, the mural repainted over the LIAR
 *  tag with the Ghost Sign restored above it, the court resurfaced,
 *  Craig's sticky note arriving with Rosa's mail, the flyer board's
 *  winter drive papers cycling, the 7:40 still coming (doc 09 §6's C6
 *  world state — the City-Moves Law's open season). */
export const C6_COMPRESSIONS: readonly C6Compression[] = Object.freeze([
  {
    from: 814,
    to: 835,
    intro: 'Three weeks from the first dollar to the lights: the garden\u2019s winter beds go down under Yoli\u2019s clipboard and my name sits second on her list, which is a schedule, not an insult; the hall\u2019s fit-out finishes its ceiling grid; Deniz circles a spring date on a calendar she doesn\u2019t explain; Eddie\u2019s Sunday call runs its eleven minutes and the cousin times it, because that\u2019s the meter now, and the meter is diegetic and kind. The entries breathe. Nobody\u2019s booking it.',
    city: 'The fit-out finished its grid. The beds went down. The tin counted ones for the tree.',
  },
  {
    from: 835,
    to: 870,
    intro: 'Five weeks from the lights to the letter: the year turns its page without a ceremony \u2014 the council race heats up and Yoli refuses to use the fall as a prop, her line the block repeats without attribution; the hall\u2019s stalls get their names on the fit-out\u2019s cards, and mine isn\u2019t on any of them, which is the correct amount; Kev\u2019s story gets its wrong telling nightly at the velvet bar; the apprenticeship\u2019s January bulletin posts its orientation date. Some seasons you survive in ink. This one starts teaching in Tuesdays.',
    city: 'The race ran its yard signs. The stalls got their cards. The bar told the story wrong, nightly.',
  },
  {
    from: 870,
    to: 898,
    intro: 'Four weeks from the letter to the deposition: the apprenticeship\u2019s orientation takes its Tuesdays whether or not the letter took \u2014 the machine keeps both shelves honestly; Deniz\u2019s affidavit questions arrive in a folder with the recorder\u2019s model number printed on it; Father Mike\u2019s boiler-watch enters its last month, the priest\u2019s penance design running four months to the day; the forum\u2019s Wednesday posts its agenda with the apology listed between the roof fund and the choir. The thaw starts at the curbs.',
    city: 'The orientation took its Tuesdays. The folder came recorder-flavored. The boiler ticked its last owned month.',
  },
  {
    from: 898,
    to: 920,
    seasonCut: true,
    intro: 'Three weeks from the sworn statement to the hearing \u2014 winter handing the block to the spring that votes: the council race closes thirty-eight to sixty-two and Yoli concedes the race and not the war, her paperwork already the hearing\u2019s spine; the Compact papers get their tabs and their copies and their exhibit letters; the block irons things it hasn\u2019t ironed in years; the Ghost Sign\u2019s restoration scaffolding goes up over the repainted mural \u2014 the block\u2019s memory, in paint, of what was there before. The 7:40 still comes.',
    city: 'The race closed thirty-eight to sixty-two. The exhibits got their letters. The scaffolding went up over the paint.',
  },
  {
    from: 920,
    to: 948,
    intro: 'Four weeks from the hearing to the hall: two-eighty prints in the borough paper\u2019s inside page and the land trust option gets its own clause, initialed; the fit-out\u2019s punch list shrinks to a page; Juniper Commons\u2019 sign waits under tarp like a held breath; Father Mike asks the diocese for one sheet of paper and a pair of steady hands on a Thursday; the chain slice\u2019s pie reviews settle at same prices, worse pie, and the block\u2019s verdict stops being news because it settled.',
    city: 'Two-eighty printed. The tarp waited. The diocese found the steady hands.',
  },
  {
    from: 948,
    to: 969,
    intro: 'Three weeks from the ribbon to the offer: the hall\u2019s first vendors learn the floor plan\u2019s arguments from the inside \u2014 the water stations work, the sight lines work, the brochure omits the right name; the plaza\u2019s lunches double; Marisol\u2019s office schedules nothing, which from her is the loudest scheduling there is; the machine\u2019s face learns the block\u2019s coffee order, which is how the machine learns everything \u2014 slowly, and with somebody else\u2019s money.',
    city: 'The stalls learned their floors. The lunches doubled. The machine learned the coffee order.',
  },
  {
    from: 969,
    to: 990,
    intro: 'Three weeks from the offer to the tree: the parks people stake the hundredth tree\u2019s hole a week early and the block\u2019s kids adopt the stakes immediately; Verna\u2019s booth\u2019s envelope gets its routing \u2014 mid-arc, in the booth, the whistle nod reserved; Deon\u2019s haircut lands where doc 09 said it would, the arc\u2019s best cut; Sal\u2019s quarters find their jar; the flyers rotate their winter-drive papers off and their summer ones on. The city\u2019s diary keeps its one note a morning.',
    city: 'The stakes went in early. The haircut landed. The quarters found their jar.',
  },
  {
    from: 990,
    to: 1002,
    seasonCut: true,
    intro: 'Two weeks from the tree to the floor \u2014 spring handing the block to the summer that keeps it: the serviceberry leafs out against its stake; June\u2019s window light settles into the hours the flags decide; the pantry\u2019s letter arrives in Camille\u2019s handwriting with the exact skills named; Eddie\u2019s Sunday call stretches to fourteen minutes and the cousin stops timing it, which is its own graduation; the school year empties the court by three o\u2019clock and the whistle runs all afternoon.',
    city: 'The serviceberry leafed. The call stopped being timed. The court emptied by three.',
  },
  {
    from: 1002,
    to: 1016,
    intro: 'Two weeks from the floor to the mark: the nine-month arithmetic runs itself \u2014 the receipts\u2019 September plus nine lands on the solstice, and nobody planned that except the calendar; the ledger\u2019s open rows are counted and recounted in the notebook\u2019s plain hand; the therapy notes close their year with Feld\u2019s registered sentence; the cigar box\u2019s last page waits for the morning that reads it; the flyer board posts the hall\u2019s first summer schedule. The city\u2019s diary notes the light, not the date.',
    city: 'The arithmetic landed on the solstice. The therapy year closed. The board posted the summer schedule.',
  },
]);

export function c6CompressionFrom(day: number): C6Compression | undefined {
  return C6_COMPRESSIONS.find((c) => c.from === day);
}

/** The linger machine's answer for a C6 day: 'next' = the ordinary
 *  tomorrow; a compression = the montage-then-roll; 'open' = the formal
 *  close's linger (the arc's window shuts, the chapter turns to OPEN —
 *  the terminal continuation the game does not end at). Null for any
 *  day that isn't C6's — the machine above owns those, and the open
 *  chapter's ordinary mornings need no rail. */
export function c6RailFor(day: number): 'next' | 'open' | { compress: number } | null {
  if (!Number.isInteger(day) || day < C6_FIRST_DAY || day > C6_LAST_DAY) return null;
  if (day === C6_LAST_DAY) return 'open';
  const comp = c6CompressionFrom(day);
  if (comp) return { compress: comp.to };
  return 'next';
}

// ===========================================================================
// 4. The formal close — the arc's window shuts (doc 09 §8)
// ===========================================================================

/** The close's diary latch (the block layer's law: the latch IS the
 *  entry; the close plays once per save). */
export const C6_CLOSE_ID = 'c6-close-nine-months';

/** The close's stage (doc 06 §C6's last event + doc 09 §8): the
 *  hospitality close, the verdict, the door to the open sim. */
export const C6_CLOSE_STAGE =
  'A stranger comes up the subway stairs with a duffel and squints at the street signs like a man reading his first page. A slice sits free on the counter at whatever shop now exists \u2014 somebody kept the ritual. The Debts read their verdict. The notebook\u2019s last main-arc line is the player\u2019s. After this, no screen ends anything: the simulation continues; the seasons continue; the city\u2019s diary keeps its one note a morning.';

/** The close's wall (authored, doc 13 voice — the arc kept; the open
 *  chapter is the world's own voice, never project-speak). */
export const C6_CLOSE_WALL =
  'The longest day lets go of the block last, the way it should. The serviceberry holds its leaves; the hall holds its crowd; the notebook holds its one line a morning. The main arc\u2019s window is closed. Nothing ends. The morning comes anyway, and the morning is the point.';

/** The close's marker entry — the latch (doc 13 §3's C6 voice: slower,
 *  plainer, occasionally funny again; the verdict and the answer). Dated
 *  Jun 21, Y4. */
export function c6CloseEntry(): FieldDiaryEntry {
  return {
    id: C6_CLOSE_ID,
    kind: 'EVENT',
    date: dateOfCalendarDay(C6_LAST_DAY),
    epistemic: 'FACT',
    body: `The nine-month mark. A stranger with a duffel at the terminal; a slice free on the counter; the ritual kept by someone \u2014 Eli, or the new tenants, or a man named Leo. The Debts: complete or explicitly open, the ledger\u2019s own words. The self-portrait: written, or refused \u2014 the refusal commented on once, gently, by the city\u2019s diary. Feld\u2019s sentence in the notes: whatever happened at that railing, I walked home. That\u2019s not nothing. The answer, re-derivable any day: ${C6_ANSWER_LINE}. The window closes. The city does not.`,
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

// ===========================================================================
// 5. The chapter's final fragment — F8, Day 1 (doc 02 §6.2)
// ===========================================================================

export const C6_FRAGMENT_IDS = {
  f8: 'c6-f8-day1',
} as const;

function fragmentRow(id: 'F8') {
  const row = FRAGMENTS.find((f) => f.id === id);
  if (!row) throw new Error(`c6pack: fragment ${id} missing from the register`);
  return row;
}

/** F8 — doc 02 §6.2's row verbatim (trigger: "Writing the endgame
 *  self-portrait"): the diary's own birth is its final reveal. One
 *  RECALL entry, the wobble style, only ever inside the first
 *  self-portrait, once per save. */
export function f8Entry(calendarDay: number): FieldDiaryEntry {
  const row = fragmentRow('F8');
  return {
    id: C6_FRAGMENT_IDS.f8,
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
// 6. The self-portrait (doc 03 §7) — the arc's decision form
// ===========================================================================

/** The machine's facts the portrait composes from (doc 03 §7's own
 *  list: standing, the amends ledger, the relationships that repaired
 *  or didn't, the fragments recovered, the therapy attendance, the
 *  contradictions still standing unstruck). */
export interface SelfPortraitInput {
  day: number;
  money: number;
  amendsActs: number;          // the ledger's amends-kind acts
  restitutionSize: 'settle' | 'fight-and-lose-more' | null;
  firstChapter: 'ledger-pace' | 'diner-plus-ledger' | 'charlotte-floor' | null;
  standing: 'garden-reckoning' | 'statement' | 'silence' | null;
  juneConditions: boolean;     // june-conditions=full-disclosure
  therapy: boolean;            // c6-condition-handle=therapy
  kevTakes: boolean;           // the fork's machine
  testimony: 'testify' | 'refuse' | 'the-wexler-file' | null;
  marisol: 'accept' | 'decline' | 'decline-and-warn' | null;
  fragmentsRecovered: number;  // of the register's eight
  k4Unstruck: boolean;         // allowed; means something
  hallOpen: boolean;           // the calendar's own
  hearingWon: boolean;         // Yoli's win is the law, post-hearing
}

export const C6_SELF_PORTRAIT_PREFIX = 'c6-self-portrait-';

/** The self-portrait's composer — pure, deterministic from the input
 *  (the same state writes the same lines; append-only versions differ
 *  only when the state does). Written in his voice, honest to the state
 *  it describes, never grading him (doc 03 §7's own law) — and law-
 *  sized: the diary's 600-cap is the notebook's own hand (1–6 lines of
 *  handwriting), so the portrait IS the distillate. Three short
 *  paragraphs: the standing, the people, the sentence. */
export function composeSelfPortrait(input: SelfPortraitInput): { title: string; body: string } {
  const date = dateOfCalendarDay(input.day);
  const month = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'][date.m - 1];
  const title = `The self-portrait (${month} ${date.d})`;

  // Paragraph one — the standing: facts, times, amounts.
  let p1 = `Facts: $${input.money.toLocaleString('en-US')}.`;
  if (input.firstChapter === 'diner-plus-ledger') p1 += ' The plan that fit, kept.';
  else if (input.firstChapter === 'charlotte-floor') p1 += ' The floor kept made; the city holds my place — not at all, and completely.';
  else if (input.firstChapter === 'ledger-pace') p1 += ' The schedule runs in order, alone.';
  else p1 += ' The plan\u2019s shape stays the day\u2019s own business.';
  if (input.hallOpen) p1 += ` ${C6_HALL_NAME}: my layout, her lobby, no brochure.`;

  // Paragraph two — the people, each shelf the machine's own.
  const people: string[] = [];
  people.push(input.kevTakes ? 'Kev took the letter; Tuesdays orient.' : 'Kev tells it wrong at the bar.');
  people.push(input.juneConditions && input.therapy ? 'June\u2019s shift is hers to give.' : input.juneConditions ? 'June\u2019s window burns its own hours.' : 'June\u2019s light: not mine to read.');
  people.push(input.standing === 'garden-reckoning' ? 'Yoli\u2019s door ajar, my name second.' : input.standing === 'statement' ? 'Yoli has the statement.' : 'Yoli\u2019s silence is the one I chose.');
  people.push(input.testimony === 'testify' ? 'My line\u2019s in the record.' : input.testimony === 'the-wexler-file' ? 'The file worked; nothing improved.' : input.testimony === 'refuse' ? 'The chair stayed empty; the papers spoke.' : 'The hearing\u2019s card waits.');
  people.push(input.marisol === 'accept' ? 'The chair is real; so is the exam.' : input.marisol === 'decline' ? 'Declined with grace.' : input.marisol === 'decline-and-warn' ? 'Declined, and named the machine.' : 'The offer\u2019s in her bag or behind us.');
  people.push(input.therapy ? `Feld: \u201C${C6_FELD_LINE}\u201D` : 'The therapy chair waits.');
  const p2 = people.join(' ');

  // Paragraph three — the debts, the fragments, the standing
  // contradiction, the sentence.
  const debts = input.amendsActs > 0
    ? `The debts: ${input.amendsActs} row${input.amendsActs === 1 ? '' : 's'} closed, faces on each${input.amendsActs >= 5 ? '; the window kept its promise' : '; the window runs longer, honestly'}.`
    : 'The debts: the column waits \u2014 faces, not numbers.';
  const frags = input.fragmentsRecovered > 0
    ? `${input.fragmentsRecovered} fragment${input.fragmentsRecovered === 1 ? '' : 's'} back; the year stays lost.`
    : 'The year stays lost.';
  const k4 = input.k4Unstruck ? 'K4 stands unstruck \u2014 allowed; it means something.' : 'The strikable contradictions are struck.';
  const p3 = `${debts} ${frags} ${k4} What am I now: ${C6_ANSWER_LINE}.`;

  return { title, body: [p1, p2, p3].join('\n\n') };
}

/** The self-portrait's entry (append-only; each version kept). The
 *  body is law-sized — the composer's own distillate, inside the
 *  diary's 600-cap. */
export function selfPortraitEntry(n: number, calendarDay: number, body: string): FieldDiaryEntry {
  return {
    id: `${C6_SELF_PORTRAIT_PREFIX}${n}`,
    kind: 'OBSERVATION',
    date: dateOfCalendarDay(calendarDay),
    epistemic: 'FACT',
    body,
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}


// ===========================================================================
// 7. The machines — Kev's fork and The Debts' verdict (doc 07 §2.4 / §8)
// ===========================================================================

/** Kev's fork, machine-read (doc 07 §2.4: "if Leo completes the hardest
 *  amends ... Kev takes it; if not, he's still at Halcyon's bar"). The
 *  hardest amends is the letter itself; the ledger's movement is the
 *  machine's witness — ONE closed row (the schedule's first dollar) is
 *  the evidence that the amends run; the bar shelf is what the
 *  ledger's zero honestly prices (a player who skipped the first
 *  dollar's morning). */
export const C6_KEV_FORK_THRESHOLD = 1;

export function kevTakesLetter(amendsActs: number): boolean {
  return Number.isInteger(amendsActs) && amendsActs >= C6_KEV_FORK_THRESHOLD;
}

/** The Debts' verdict (doc 09 §8: "complete or explicitly open") — the
 *  schedule's window is honest either way; the close reads the ledger's
 *  own column and says which. */
export const C6_DEBTS_COMPLETE_THRESHOLD = 5;

export function debtsComplete(amendsActs: number): boolean {
  return Number.isInteger(amendsActs) && amendsActs >= C6_DEBTS_COMPLETE_THRESHOLD;
}

// ===========================================================================
// 8. The chapter's diary entries (C6_IDS + the station beats' inks)
// ===========================================================================

export const C6_IDS = {
  firstDollar: 'c6-first-dollar',
  lights: 'c6-winter-lights',
  kevFork: 'c6-kev-fork',
  kevForkBar: 'c6-kev-fork-bar',
  deposition: 'c6-deposition',
  hearing: 'c6-hearing',
  hallOpens: 'c6-hall-opens',
  lateOffer: 'c6-late-offer',
  tree: 'c6-hundredth-tree',
  floor: 'c6-eddie-floor',
  hospitality: 'c6-close-hospitality',
  close: 'c6-close-nine-months',
} as const;

function stationEntry(id: string, calendarDay: number, body: string): FieldDiaryEntry {
  return {
    id,
    kind: 'EVENT',
    date: dateOfCalendarDay(calendarDay),
    epistemic: 'FACT',
    body,
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

export function firstDollarEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.firstDollar, day,
    'First dollar, sent. The schedule\u2019s first payment, in order, via Bea \u2014 the note in the hand I\u2019d know anywhere: ' + C5_ADA_NOTE + ' And the letter came back \u2014 the one from two years ago \u2014 answered in three lines. The first: \u201C' + C6_ADA_FIRST_LINE + '\u201D The block\u2019s new shapes hold their windows. Nineteen rows. One at a time.');
}

export function lightsEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.lights, day,
    'The block keeps a light on. The tin\u2019s ones on the park\u2019s tree, counted at the gold window; Yoli\u2019s winter beds down on her terms, my name second on the list; Eddie\u2019s Sunday call at eleven minutes, timed by the cousin, the meter diegetic and kind. The soup was good, though. October, remember?');
}

export function kevForkEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.kevFork, day,
    'The letter, signed in person, no camera \u2014 the hardest amends, a piece of paper with two names on it. Grace\u2019s row routed through it, not cash: her choice, the right one. ' + C6_KEV_TAKES_LINE);
}

export function kevBarEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.kevForkBar, day,
    'The letter, signed in person, no camera \u2014 and Kev\u2019s shelf reads the ledger\u2019s movement, which wasn\u2019t enough. ' + C6_KEV_BAR_LINE + ' Canon keeps him alive, employed, un-corrected. His resentment was always rational.');
}

export function depositionEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.deposition, day,
    'The sworn statement given \u2014 the C2 meeting, on the record, forever: the forms, the break, the hand. Deniz\u2019s price was never money. Father Mike\u2019s four months of boiler-watch end; the apology read at the Ascension\u2019s forum, the number included, the parish\u2019s minutes keeping it.');
}

export function hearingEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.hearing, day,
    'The hearing: the Compact papers enter the record and Corvus concedes \u2014 two hundred twenty becomes two hundred eighty affordable units, and ' + C6_CLT_OPTION + '. Yoli\u2019s win, thirty-eight to sixty-two notwithstanding. The chair with my name-card: the day\u2019s own exam, the machine reporting what I did with it.');
}

export function hallOpensEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.hallOpens, day,
    C6_HALL_NAME + ' opens. My stall layout in the floor plan, her lobby in the light, my name in no brochure \u2014 the correct amount. Father Mike tears the parking-lot lease on the church steps: paper confetti, the block\u2019s one compromised edge, gone, swept before lunch.');
}

export function lateOfferEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.lateOffer, day,
    'Marisol\u2019s late offer, her syntax exact: \u201C' + C6_MARISOL_LINE + '\u201D The chair real, the salary real, the exam the same exam. The production values better. The flags are the witness \u2014 whichever door.');
}

export function treeEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.tree, day,
    'Kestrel Green\u2019s hundredth tree \u2014 a serviceberry, useful and pretty and early to flower, planted by whoever showed up. El Vann\u2019s album to Eli: \u201C' + C6_ALBUM_LINE + '\u201D Verna\u2019s row paid at the booth, two-three hundred, the whistle nod, never once made to feel it. The city\u2019s diary\u2019s note for the arc: a tree.');
}

export function floorEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.floor, day,
    'Eddie\u2019s floor, offered a second time \u2014 kept made, the call at fourteen minutes. The exit that is also a home; a persistent option, not an ending: taking it changes the map, not the person. June\u2019s window burns its own arithmetic. Camille\u2019s letter: not a reconciliation; a reference \u2014 logistics volunteer, exact skills. Showing up is mine.');
}

export function hospitalityEntry(day: number): FieldDiaryEntry {
  return stationEntry(C6_IDS.hospitality, day,
    'The hospitality close: a stranger with a duffel at the terminal, squinting at the street signs like a man reading his first page \u2014 the walk, nine months ago and a whole person ago. A slice free on the counter at whatever shop now exists, because someone \u2014 Eli, or the new tenants, or a man named Leo \u2014 kept the ritual. Rosa looked at him the way she looked at me. The city repeats itself on purpose, for the ones who are listening.');
}

// ===========================================================================
// 9. The register's two C6 nodes (N6/N7) — dressed for the seam
// ===========================================================================

const N6_DIARY: Record<string, string> = {
  accept: 'The chair, accepted \u2014 the villain exam re-run with better production values, live, the salary real, the lever newer-handled and the same lever. The flags carry the door. The exam is the player\u2019s to live; the notebook just writes the desk\u2019s dimensions.',
  decline: 'The offer, declined with grace \u2014 the peace option, and the conversation cost nothing. \u201C' + C6_MARISOL_LINE + '\u201D She wrote the sentence like a person closing a ledger without a loss. The flags carry the door.',
  'decline-and-warn': 'The offer, declined, and the machine named to the machine\u2019s own face \u2014 the one sentence that costs nothing, buys nothing, and stays in the room. \u201C' + C6_MARISOL_LINE + '\u201D Her face did the arithmetic. The flags carry the door.',
};

const N6_NOTE: Record<string, string> = {
  accept: 'The villain exam, re-run, better lit. The chair is real. So is what the chair does.',
  decline: 'The peace option, in its ordinary clothes. The machine does not need the answer fast. The machine does not need the answer at all.',
  'decline-and-warn': 'The sentence stays in the room. Whether it grows anything is not the sentence\u2019s job.',
};

const N7_DIARY: Record<string, string> = {
  testify: 'The testimony, given \u2014 the sworn statement\u2019s facts into the hearing\u2019s record, the C2 meeting\u2019s hand named on the record, forever. The revenge path\u2019s honest version: testimony, not takedown. The last of Marisol\u2019s respect spent on the record, where it does the most good and the most damage, which is what records are for.',
  refuse: 'The chair, left empty \u2014 the papers spoke, the Compact\u2019s arithmetic needed no voice of mine, and the record stays clean of me. The block noticed whether I sat. The block notices everything. It just stopped texting me about it.',
  'the-wexler-file': 'The file, copied at the library, handed to a reporter \u2014 the stipend\u2019s paper trail, the last villain-exam re-run. It works. Nothing improves. The fruit baskets stop coming, and the block counts the Tuesdays without editorializing. The file changes hands privately \u2014 custody, not a public act.',
};

const N7_NOTE: Record<string, string> = {
  testify: 'The honest version of the revenge path: the record, not the takedown.',
  refuse: 'The empty chair is also an answer. The papers did the work.',
  'the-wexler-file': 'It works. Nothing improves. Gino\u2019s fruit basket stops coming.',
};

export interface C6PickApply {
  ok: boolean;
  reason?: 'bad-node' | 'bad-option' | 'locked';
  flags: string[];
  ledger: LedgerEntry[];
  diary: FieldDiaryEntry | null;
  note: string | null;
}

/** The pick's landing (the c5pack's own shape): resolve through the
 *  register's machine, write the ledger act, hand the flags to the
 *  world store, carry the ink. N7's public-record law rides the
 *  register's own visibility columns (testify/refuse shared \u2014 the
 *  hearing is a public record; the file private \u2014 custody, not a
 *  public act). */
export function applyC6Pick(
  nodeId: 'N6' | 'N7',
  optionId: string,
  calendarDay: number,
): C6PickApply {
  const none: C6PickApply = { ok: false, reason: 'bad-node', flags: [], ledger: [], diary: null, note: null };
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
  const diaryMap = nodeId === 'N6' ? N6_DIARY : N7_DIARY;
  const noteMap = nodeId === 'N6' ? N6_NOTE : N7_NOTE;
  const body = diaryMap[optionId] ?? null;
  const note = noteMap[optionId] ?? null;
  const diary: FieldDiaryEntry | null = body
    ? {
        id: `c6-${nodeId.toLowerCase()}-${optionId}`,
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

export interface C6PackReport {
  ok: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
}

export function validateC6Pack(): C6PackReport {
  const checks: C6PackReport['checks'] = [];
  const t = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail });

  // ---- the station table: ten days, in order, machine-verified ----
  const days = C6_STATION_DAYS;
  t('station count', days.length === 10, String(days.length));
  t('stations sorted', days.every((d, i) => i === 0 || d > days[i - 1]));
  t('first station is the roll\u2019s landing', C6_FIRST_DAY === C5_CUT_DAY && days[0] === C6_FIRST_DAY,
    `${days[0]} vs C5_CUT_DAY ${C5_CUT_DAY}`);

  // doc 12 §2's fixed row, through the calendar: hearing Mar Y4, hall
  // spring Y4, tree in spring, close in June Y4.
  const hearing = dateOfCalendarDay(C6_HEARING_DAY);
  const hall = dateOfCalendarDay(C6_HALL_DAY);
  t('hearing lands in March, Y4', hearing.y === 4 && hearing.m === 3, JSON.stringify(hearing));
  t('hall lands in spring, Y4', hall.y === 4 && (hall.m >= 3 && hall.m <= 5), JSON.stringify(hall));
  const tree = dateOfCalendarDay(990);
  t('tree lands in spring, Y4', tree.y === 4 && tree.m === 5, JSON.stringify(tree));
  const close = dateOfCalendarDay(C6_LAST_DAY);
  t('close lands in June, Y4', close.y === 4 && close.m === 6, JSON.stringify(close));

  // The nine-month arithmetic (doc 09 §8): the receipts' Sept 21, Y3
  // plus nine calendar months.
  const receipts = calendarDayOf({ y: 3, m: 9, d: 21 });
  const monthDiff = (close.y - 3) * 12 + (close.m - 9);
  t('close is the receipts plus nine months', monthDiff === 9 && dateOfCalendarDay(receipts).d === 21,
    `${monthDiff} months`);
  t('C6_LAST_DAY is the receipts+9mo day', C6_LAST_DAY === calendarDayOf({ y: 4, m: 6, d: 21 }));

  // The endgame year's turn (doc 12 §6).
  t('endgame day is Dec 1, Y4', JSON.stringify(dateOfCalendarDay(C6_ENDGAME_DAY)) === JSON.stringify({ y: 4, m: 12, d: 1 }));
  t('endgame day is one year past the window\u2019s open', C6_ENDGAME_DAY - C6_FIRST_DAY === 365);

  // ---- the compressions: cover the gaps, ordered, TWO season cuts ----
  t('compression count', C6_COMPRESSIONS.length === 9, String(C6_COMPRESSIONS.length));
  t('compressions chain the stations', C6_COMPRESSIONS.every((c, i) =>
    c.from === days[i] && c.to === days[i + 1]));
  const cutCount = C6_COMPRESSIONS.filter((c) => c.seasonCut === true).length;
  const realCuts = C6_COMPRESSIONS.filter((c) => crossedSeasonCut(c.from, c.to));
  t('exactly two season cuts marked', cutCount === 2, String(cutCount));
  t('the marked cuts are exactly the real ones',
    C6_COMPRESSIONS.every((c) => (c.seasonCut ?? false) === crossedSeasonCut(c.from, c.to)),
    `marked ${cutCount}, real ${realCuts.length}`);
  const cutSeasons = realCuts
    .map((c) => `${seasonOf(dateOfCalendarDay(c.from).m)}->${seasonOf(dateOfCalendarDay(c.to).m)}`)
    .sort();
  t('season cuts land winter\u2192spring and spring\u2192summer',
    cutSeasons.join() === 'spring->summer,winter->spring', cutSeasons.join());

  // ---- the rails ----
  t('rail: compress at each station but the last', days.slice(0, -1).every((d, i) => {
    const r = c6RailFor(d);
    return typeof r === 'object' && r !== null && r.compress === days[i + 1];
  }));
  t('rail: open at the close', c6RailFor(C6_LAST_DAY) === 'open');
  t('rail: next mid-gap', c6RailFor(C6_FIRST_DAY + 5) === 'next');
  t('rail: null outside the window', c6RailFor(C6_FIRST_DAY - 1) === null && c6RailFor(C6_ENDGAME_DAY + 1) === null);

  // ---- the canon lines, verbatim ----
  const mar = C6_MARISOL_LINE.startsWith('You were the best community face')
    && C6_MARISOL_LINE.includes('That\u2019s not an apology.')
    && C6_MARISOL_LINE.endsWith('Come back when you want to be good at this again.');
  t('Marisol\u2019s line verbatim', mar);
  t('Feld\u2019s line verbatim (doc 15\u2019s protected register)',
    C6_FELD_LINE === 'Whatever happened at that railing, you walked home. That\u2019s not nothing.');
  t('the album line verbatim', C6_ALBUM_LINE === 'Start late. Finish anyway.');
  t('Ada\u2019s first line verbatim', C6_ADA_FIRST_LINE === 'I got your postcards.');
  t('Craig\u2019s note verbatim', C6_CRAIG_NOTE === 'She kept this. I couldn\u2019t.');
  t('Ada\u2019s note carried from C5 without drift', C5_ADA_NOTE === 'Pay your debts in order.');
  t('the hall\u2019s name verbatim', C6_HALL_NAME === 'Juniper Commons');
  t('the CLT option verbatim', C6_CLT_OPTION === 'a community land trust option on the garden slot');
  t('the vote pinned', C6_YOLI_VOTE_FOR === 38 && C6_YOLI_VOTE_AGAINST === 62);
  t('the units pinned 220\u2192280', C6_UNITS_BEFORE === 220 && C6_UNITS_AFTER === 280);

  // ---- the machines ----
  t('Kev\u2019s fork: threshold one, machine-read',
    kevTakesLetter(0) === false && kevTakesLetter(1) === true && kevTakesLetter(7) === true);
  t('The Debts: threshold five, both canon-valid',
    debtsComplete(4) === false && debtsComplete(5) === true);

  // ---- F8 rides the register's own row ----
  const f8 = fragmentRow('F8');
  t('F8\u2019s register row present', f8.trigger === 'Writing the endgame self-portrait' && f8.chapter === 'C6');

  // ---- every N6/N7 option resolves; signatures pairwise unique ----
  const sigs = new Set<string>();
  let allResolve = true;
  for (const nodeId of ['N6', 'N7'] as const) {
    const node = nodeById(nodeId);
    if (!node) { allResolve = false; break; }
    for (const opt of node.options) {
      const apply = applyC6Pick(nodeId, opt.id, C6_FIRST_DAY);
      if (!apply.ok) { allResolve = false; break; }
      sigs.add(apply.flags.join('|'));
    }
  }
  t('every N6/N7 option resolves', allResolve);
  t('pick signatures pairwise unique', sigs.size === 6, String(sigs.size));

  // ---- the self-portrait: deterministic, honest, never graded ----
  const base: SelfPortraitInput = {
    day: C6_LAST_DAY,
    money: 1212,
    amendsActs: 5,
    restitutionSize: 'settle',
    firstChapter: 'diner-plus-ledger',
    standing: 'garden-reckoning',
    juneConditions: true,
    therapy: true,
    kevTakes: true,
    testimony: 'testify',
    marisol: 'decline',
    fragmentsRecovered: 5,
    k4Unstruck: true,
    hallOpen: true,
    hearingWon: true,
  };
  const a = composeSelfPortrait(base);
  const a2 = composeSelfPortrait({ ...base });
  t('the portrait is deterministic from its state', a.body === a2.body);
  const b = composeSelfPortrait({ ...base, kevTakes: false, standing: 'silence', testimony: 'the-wexler-file', marisol: 'accept', k4Unstruck: false, amendsActs: 1 });
  t('the portrait reads its state (different facts, different lines)', a.body !== b.body);
  t('the portrait never grades', ![a.body, b.body].some((s) => /forgiven|good person|bad person|redemption arc/i.test(s)));
  t('the portrait carries the standing contradiction', a.body.includes('K4 stands unstruck'));
  t('the honest variant lets K4 go', b.body.includes('The strikable contradictions are struck.'));
  t('the portrait fits the diary\u2019s own 600-cap', a.body.length <= 600 && b.body.length <= 600,
    `${a.body.length}/${b.body.length}`);
  t('the refusal is a canon-valid state (the gentle comment exists)', C6_REFUSAL_CITY_LINE.length > 0);

  // ---- no real-world years in the authored prose (the '94 form is
  // the canon law's own) ----
  const authored = [
    C6_MARISOL_LINE, C6_FELD_LINE, C6_ALBUM_LINE, C6_ADA_FIRST_LINE,
    C6_N6_PROMPT, C6_N7_PROMPT,
    C6_CRAIG_NOTE, C6_CHAIN_LINE, C6_GHOST_SIGN_LINE, C6_ANSWER_LINE,
    C6_SOUP_LINE, C6_KEV_TAKES_LINE, C6_KEV_BAR_LINE,
    C6_DEBTS_COMPLETE_LINE, C6_DEBTS_OPEN_LINE, C6_REFUSAL_CITY_LINE,
    C6_CLOSE_STAGE, C6_CLOSE_WALL, c6CloseEntry().body,
    ...Object.values(N6_DIARY), ...Object.values(N7_DIARY),
    ...Object.values(N6_NOTE), ...Object.values(N7_NOTE),
    a.body, b.body,
    ...days.map((d) => C6_STATIONS[d].begin),
    ...days.map((d) => C6_STATIONS[d].goldenNote),
  ];
  const badYears = authored.filter((s) => /\b(19[2-9]\d|20[0-9]\d)\b/.test(s));
  t('no real-world years in the authored prose', badYears.length === 0, badYears[0]);

  // ---- the captions: every station dated, C6's own shape ----
  t('captions cover every station', days.every((d) => C6_CAPTIONS[d] !== undefined));
  t('captions carry dates', days.every((d) => C6_CAPTIONS[d].date.length > 0 && C6_CAPTIONS[d].replay.length > 0));

  return { ok: checks.every((c) => c.ok), checks };
}
