/**
 * The C2 content pack — narrative/14 §7 step 9 (doc 06 §C2 against the
 * machine the C1 wave fed): **The Compact**, Jan 6 – Jun 30, Y2.
 *
 * What this module is: the chapter's authored layer — the station days
 * the player lives (the paper year, the Compact's founding at the garden,
 * Marisol's coffee, Yoli's two strategy evenings, Priya's price, Craig's
 * squeeze with the break's four forms behind it, the ribbon and Kev's
 * denied appeal, the rent wave, the Oktays' last Saturday, Rosa's
 * twenty-five, June's lease), the compressions that consume the calendar
 * between them (R4's named transition, consuming days — never real
 * time), the C2→C3 season cut (doc 06 §C2 handoff), the register's two
 * C2 nodes (N2 the Compact's break, N2b the Oktay moment —
 * core/choiceNodes.ts), the chapter's Lost-Year fragment (F3 Zanesville
 * — doc 02 §6.2's register, fired as RECALL ink, never as a scene), and
 * the contradiction ledger's FIRST strikes (K1 the cart, K6 the
 * surveyor's GUESS — doc 03 §5.2, doc 15's list; the strikethrough
 * mechanic taught early, before the chapter's bigger contradiction K2 is
 * even written).
 *
 * The station law — restated from the C1 pack (the one architectural
 * decision, already in core/c1pack.ts): **story day = sim day = calendar
 * day, and the compressions move all three together** (sim/epochMap's
 * 1:1 law holds by construction). The days between stations are
 * CONSUMED, not played: the linger's own door (`next-day` with a target)
 * jumps the counters in one motion. The chapter is sparse the way a
 * season is lived: nobody remembers the Tuesdays.
 *
 * The canon law (the c0pack/c1pack precedent, restated): doc 06 and doc
 * 08's quoted lines are quoted VERBATIM (Marisol's coffee line, Craig's
 * "you didn't hear it from me," Eddie's "Who did you promise," Rosa's
 * twenty-five and Eleanor lines, the QUESTION about Doris and '94, the
 * K2 entry, Mehmet's sentence); where the doc names a beat's content but
 * not its prose, the prose is written here in doc 13 §3's C2 voice
 * (Stage II: "I'm useful. Useful is safe." — confident, the jokes
 * thinner, the gap between the diary and the deeds opening one person's
 * width) and cited as written-to-spec. Nothing canonical is paraphrased
 * into fake quotes. Recontextualizations are noted at their triggers
 * (doc 11's header law: retained, not rewritten).
 *
 * What this module is NOT: no DOM, no UI, no scene, no dice, no clock
 * reads — the content seam's own law. Pure data + pure functions; the
 * Game layer applies; tests pin; `validateC2Pack` checks the pack
 * against its machines before a save can carry any drift.
 */

import { calendarDayOf, dateOfCalendarDay, type GameDate } from './calendar';
import type { FieldDiaryEntry, Correction } from './fieldDiary';
import type { LedgerEntry } from './consequenceLedger';
import { FRAGMENTS } from './guardrails';
import { nodeById, resolveChoice } from './choiceNodes';
import { C0_MISHEAR_ENTRY_ID, C0_BLOCK_IDS, SURVEYOR_DIARY_GUESS } from './c0pack';
import type { WeekOrder } from './c0pack';

// ===========================================================================
// 1. The chapter's spine — the station map (doc 06 §C2's events → days)
// ===========================================================================

/** C2's first playable morning: Tuesday, Jan 6, Year 2 — the paper year
 *  (doc 06 §C2's period start; the machine's own window start). Derived
 *  from the calendar module — no hand arithmetic anywhere near the spine
 *  (the rails' own law). */
export const C2_FIRST_DAY = calendarDayOf({ y: 2, m: 1, d: 6 });

/** C2's last playable day: Jun 30, Year 2 (doc 06 §C2's period end). The
 *  linger here plays the C2→C3 season cut; the season cut consumes Jun
 *  30 → Jul 1 and the chapter rides advanceChapter's own door at C3's
 *  window start. */
export const C2_LAST_DAY = calendarDayOf({ y: 2, m: 6, d: 30 });

/** The cut's morning: Jul 1, Year 2 — C3's window start (the machine's
 *  own door; the cut's entry is dated here, the advance lands here). */
export const C2_CUT_DAY = calendarDayOf({ y: 2, m: 7, d: 1 });

/** The renewal ask, formal (doc 06 §C2 starting circumstances). */
export const C2_ASK_AMOUNT = 7200;

/** The room's re-rated rent in Craig's wave (doc 06 §C2 event 9). */
export const C2_ROOM_RENT = 1450;

/** The friend rate's lock, in years (doc 06 §C2 event 4). */
export const C2_FRIEND_YEARS = 5;

/** The Compact's pledge count (doc 06 §C2: eleven businesses). */
export const C2_ELEVEN = 11;

/** How many of the eleven buildings Corvus has already toured (doc 06
 *  §C2 event 3 — Priya's intel). */
export const C2_CORVUS_TOUR = 3;

/** One playable station of C2's season. The fields are the stabilized
 *  loop's own mouths (begin/wake/queue/rushDone/climb/golden), keyed by
 *  calendar day — the WK_* steps are the loop; the station is the day's
 *  voice. Same shape as the C1 pack's station (the loop reads both);
 *  `storm` stays in the shape for the loop's dark-night law — C2 has no
 *  storm days, and the field stays false by omission. */
export interface C2Station {
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

// ------------------------------------------------------------- day 120 ----

/** Doc 06 §C2 starting circumstances — the ask goes formal. */
export const C2_NOTICE_ASK_NOTE =
  'The notice on Eddie\u2019s wall has a sibling now \u2014 a letter, Craig\u2019s letterhead, the number typed twice so nobody calls it a typo: $7,200 a month at renewal, or the space markets. The ask is formal. So is the year.';

/** Doc 06 §C2 starting circumstances — the assemblage map reaches the
 *  block's mailboxes; the render poster transcribed with a GUESS tag
 *  (doc 06 §C2 diary/map developments). */
export const C2_MAP_NOTE =
  'The mailboxes got their morning delivery: Corvus\u2019s assemblage map, eleven addresses circled in developer\u2019s green, a render of Juniper Commons glowing on the back. I copied the poster into the notebook \u2014 GUESS, tagged, dated. The sun in the render comes from the west. Somebody chose that.';

/** K6's correction margin (doc 15: "the surveyor GUESS \u2014 struck C2,
 *  sunlight and square feet"). The strike quotes the offending phrase;
 *  the margin is current-tense Leo. */
export const C2_K6_MARGIN =
  'Sunlight and square feet. It was never a person watching. It was a schedule. \u2014 L';

const DAY120_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CNew year. The tea tastes the same. That\u2019s how you\u2019ll know the block held.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, blowing steam off the truth: \u201CSeven-two. Heard it at the barbershop. Numbers travel faster than mail here.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar, folding the map small: \u201CThis came in the mailboxes. Pretty picture. My name\u2019s in one of the circles.\u201D',
  },
];

const DAY120: C2Station = {
  day: 120,
  title: 'The Paper Year',
  begin: 'Day 120. January, and the corner is the same corner with new paper on it. Facts only: the ask is $7,200 a month or the space markets, eleven mailboxes got a map, and I\u2019m the counter now \u2014 useful, which is safe, which is the plan.',
  wake: 'Rosa: \u201CNew year. I made caldo. The cart doesn\u2019t know it\u2019s January and neither do the regulars. Feed them anyway.\u201D',
  queue: DAY120_QUEUE,
  rushDone: 'Three orders and a map everybody\u2019s holding differently. The year started. The corner held.',
  climbNote: 'Upstairs, the notebook takes the poster\u2019s sun-angle next to Eddie\u2019s framed notice. Useful is safe. Write it until it\u2019s true.',
  goldenNote: 'Four windows, lit against the cold. Somewhere in a drawer, eleven addresses sit in developer\u2019s green. Let the light do its work tonight.',
};

// ------------------------------------------------------------- day 124 ----

/** Doc 06 §C2 event 1 — the Compact's founding meeting at the garden
 *  (the player may attend; the sign-in sheet will matter — doc 08 §3).
 *  Staged at the Gable Garden, the block's convening place. */
export const C2_COMPACT_SCENE: readonly string[] = [
  'The Gable Garden, after dark, strings of bulbs doing the lighting\u2019s job on a budget. Yoli stands where the petition used to sit: \u201CEleven businesses. One renewal. Nobody sells, nobody negotiates alone, and nobody\u2019s lease is a door somebody forgot to lock. Sign and it\u2019s real.\u201D',
  'The sign-in sheet goes around on a clipboard \u2014 eleven lines, real names, real leases. Doris\u2019s line sits signed at the top; she\u2019s \u201Con sabbatical,\u201D Yoli says, which is how the block says hospitalized. Craig signs nothing. Craig isn\u2019t here, which is its own signature.',
  'I sign Corner Slice\u2019s line \u2014 for Eddie, he\u2019d say, and he\u2019d be right, and the pen still hesitates a half-second because the sheet asks WHO and the honest answer has layers. Eleven businesses pretending eleven businesses have power. Or eleven neighbors deciding the pretending is the power. The clipboard closes. It\u2019s real now.',
];

/** K1's correction (doc 03 §5.2's row: the cart truth, struck C2; the
 *  §5.1 sample's margin is the canon note). The strike quotes the
 *  offending word in the day-one entry's body. */
export const C2_K1_STRIKE = 'gave';
export const C2_K1_MARGIN =
  'Loaned. She never said give. I heard what I needed. \u2014 L';

const DAY124_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CHeard about last night. Eleven names. In my day we called that a union and got watched for it.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular, still glowy from the bulbs: \u201CSigned my line. First time a piece of paper made me feel taller instead of shorter.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, eyebrows up: \u201CYoli hugged the clipboard. The CLIPBOARD. This thing is serious serious.\u201D',
  },
];

const DAY124: C2Station = {
  day: 124,
  title: 'The Compact',
  begin: 'Day 124. Saturday. The garden\u2019s bulbs are down but the clipboard\u2019s signatures are up: eleven lines, one answer. The Compact is three days old and already the corner\u2019s favorite story \u2014 which means it\u2019s Craig\u2019s too.',
  wake: 'Rosa: \u201CI signed. Twenty-five years behind that window and last night was the first time the block asked me to stand WITH it instead of behind it. Don\u2019t tell Yoli I said something nice.\u201D',
  queue: DAY124_QUEUE,
  rushDone: 'Three orders, all of them about the sheet. The block keeps its own minutes \u2014 the counter is where they\u2019re read aloud.',
  climbNote: 'The notebook gets tonight\u2019s truth in the margin of an old lie: the cart was a loan. Eleven signatures on a clipboard and one word finally struck through. Both corrections feel the same size from here.',
  goldenNote: 'Four windows, and somewhere across the street a clipboard sleeps in Yoli\u2019s freezer drawer. Eleven is a number with teeth. Feed it.',
};

// ------------------------------------------------------------- day 129 ----

/** Doc 06 §C2 event 2 — Marisol's coffee, verbatim (the seduction in
 *  miniature: no ask, just respect). */
export const C2_MARISOL_LINE =
  'You\u2019re the one who ran the warming station. I read everything.';

/** Marisol's PERSON card v1 (written to spec — doc 06 names the meeting,
 *  not the card's prose; the C3 upgrade line is C3's and stays there). */
export const C2_MARISOL_CARD_LINE =
  'Marisol. Corvus\u2019s voice with a person attached. Bought the coffee, remembered the storm, asked nothing. Predators who insist they aren\u2019t recognize each other. One of us is lying about it, and the coffee says it isn\u2019t her.';

/** The coffee's beat (doc 06 §C2 important conversations — the
 *  intention, staged after the verbatim line). */
export const C2_MARISOL_AFTER_NOTE =
  'No ask. A card, a number I didn\u2019t take, and the door held open exactly one second longer than business requires. Respect, she\u2019d call it. Inventory, I\u2019d call it, if I said it out loud. I don\u2019t say it out loud. Useful is safe.';

const DAY129_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CSaw you at the diner window. Nice coffee? Expensive coffee?\u201D A beat. \u201CSame thing, sometimes.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar, low: \u201CTalked to my cousin at the diner. Some Corvus woman was asking about YOU. About the storm. That\u2019s either great or very, very bad.\u201D',
  },
];

const DAY129: C2Station = {
  day: 129,
  title: 'The Coffee',
  begin: 'Day 129. The diner\u2019s window booth has my name on it in somebody\u2019s handwriting \u2014 Marisol\u2019s, apparently, who has never once needed a reservation to be somewhere. Coffee with the other side. Facts only: go, listen, sign nothing.',
  wake: 'Rosa: \u201CYou\u2019ve got a diner face this morning. Whoever bought, don\u2019t sell the block for a refill.\u201D She slides the urn over. \u201CThe refill\u2019s here, and it\u2019s free.\u201D',
  queue: DAY129_QUEUE,
  rushDone: 'Two orders and one conversation I keep replaying for the trap. There wasn\u2019t one. That\u2019s the trap.',
  climbNote: 'The notebook gets her card: reads everything, asks nothing, pays cash. Stage II of whatever this is: useful people get coffee. I write \u201Cuseful is safe\u201D and for the first time the handwriting hesitates.',
  goldenNote: 'Four windows. In one of them, a guy with a notebook and a free refill he didn\u2019t pay for in money. The block can\u2019t see that one. Yet.',
};

// --------------------------------------------------------- days 146/147 ----

/** Doc 10 §4's window — Yoli's C2 strategy session, two evenings. The
 *  schedule the Compact's Form C would later trade lives here; attending
 *  either evening sets `yoli-strategy-session` (the machine key N2's
 *  information-trade option locks on). Miss both and her trust path's
 *  best offer expires \u2014 the doc's own law. */
export const C2_SESSION_ONE_NOTE =
  'Evening one. Yoli\u2019s got the garden\u2019s shed open and a legal pad the size of a door: \u201CThe Compact doesn\u2019t work if we\u2019re eleven solos in a trench coat. Unified renewal means unified EVERYTHING \u2014 dates, lawyers, the walk-away number. You\u2019re corner \u2014 you hear things the rest of us don\u2019t. Sit.\u201D';

export const C2_SESSION_TWO_NOTE =
  'Evening two. The pad has a schedule now \u2014 week by week, who talks to whom, the renewal calendar\u2019s pressure points, the walk-away number circled twice. Yoli walks the eleven through it like a coach who\u2019s read every bruise this block ever earned. \u201CThe plan deserves to work,\u201D she says. \u201CSo it will.\u201D';

/** The strategy-session flag (doc 10 §4's window; N2's Form C locks on
 *  it — core/choiceNodes.ts). Set once, either evening. */
export const C2_SESSION_FLAG = 'yoli-strategy-session';

const DAY146_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CGarden\u2019s lit past dark again. Strategy, they\u2019re saying. The tea tastes the same. Let them plan.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 EXTRA HOT',
    pay: 3,
    reaction: 'The extra-hot, thawing: \u201CYoli\u2019s got legal pads. PLURAL. My accountant uses one. We\u2019re either saving the block or starting a very small law firm.\u201D',
  },
];

const DAY146: C2Station = {
  day: 146,
  title: 'The Plan, Evening One',
  begin: 'Day 146. February opens with the garden\u2019s shed lit like a situation room. Yoli\u2019s strategy session, evening one of two \u2014 the Compact\u2019s inside baseball, the part the mailboxes didn\u2019t get. Facts only: attend, listen, keep the corner\u2019s ears open.',
  wake: 'Rosa: \u201CYou\u2019re invited to the shed thing tonight. Yoli\u2019s list has you as \u2018corner \u2014 hears everything.\u201D Accurate. Go be accurate.\u201D',
  queue: DAY146_QUEUE,
  rushDone: 'Two orders. The urn\u2019s warm and the shed\u2019s waiting. Evenings like this, the corner and the garden are the same job.',
  climbNote: 'The notebook gets the plan\u2019s shape \u2014 not the numbers, the SHAPE. Eleven solos in a trench coat, one coat. Useful is safe, and tonight useful had a chair at the table.',
  goldenNote: 'Four windows and a shed full of arithmetic across the street. The block\u2019s building something with paper. The other side builds with renders. May the better stationery win.',
};

const DAY147_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CSecond night of the shed summit. My source says there\u2019s a schedule now. My source is everybody.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, ceremonial: \u201CHistory, kid. You\u2019re living in the week the block got a game plan. Fifty years from now somebody\u2019s novel puts a coffee cart in this scene.\u201D',
  },
];

const DAY147: C2Station = {
  day: 147,
  title: 'The Plan, Evening Two',
  begin: 'Day 147. Evening two of the shed summit \u2014 the schedule lands tonight, the week-by-week that turns a pledge into a plan. The ride home after is the M121\u2019s loop at dusk, which the notebook will have opinions about.',
  wake: 'Rosa: \u201CLast night of the summit. After, come straight here \u2014 there\u2019s caldo with your name on the lid.\u201D',
  queue: DAY147_QUEUE,
  rushDone: 'Two orders. The caldo\u2019s waiting and the shed\u2019s waiting and dusk is going to do what dusk does on the loop home.',
  climbNote: 'The M121\u2019s window, the green sign, the vending-machine coffee \u2014 the loop home put the wobble\u2019s fingerprints on the evening and the notebook has three lines it doesn\u2019t remember earning. Logged. Told no one.',
  goldenNote: 'Four windows. A schedule sleeps in the shed tonight that eleven leases will rise or fall on. The glass holds the light like it knows something.',
};

// ------------------------------------------------------------- day 160 ----

/** Doc 06 §C2 event 3 — Priya's intel, traded for a favor. The intel's
 *  three items are doc-verbatim facts. */
export const C2_PRIYA_INTEL_NOTE =
  'Priya, at the subway mouth with her collar up: \u201CTwo things, because you helped with June\u2019s wall and I pay debts. One \u2014 Craig keeps saying Doris is \u2018recovering nicely.\u2019 Doris is in observation. He\u2019s lying about a sick woman\u2019s week. Two \u2014 the estate is leveraged. The houses you see are loans he sees. And the tour I couldn\u2019t unsee: Corvus has already walked three of your eleven buildings. Measure that.\u201D';

/** The favor's shape (authored to spec — doc 06 names the trade, not the
 *  favor; Priya's pricing is her character, the debt rides the ledger). */
export const C2_PRIYA_FAVOR_NOTE =
  '\u201CThe favor? I\u2019ll name it when I need it. It\u2019ll be small and it\u2019ll be legal and you\u2019ll do it.\u201D She\u2019s gone before the cold gets a vote. That\u2019s the whole invoice \u2014 blank until she fills it in.';

/** The intel's ledger act (the promise's coin — the favor is a held
 *  debt; doc 10 §1's smaller coin, same currency). */
export const C2_PRIYA_PROMPT_DEBT_REFS = ['priya', 'c2-priya-favor'] as const;

const DAY160_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CDoris still \u2018on sabbatical\u2019? Whoever\u2019s saying it keeps practicing it in the mirror. You can tell.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular, quieter than usual: \u201CSomebody toured my building. Locked? No. Just walked it with a clipboard and a face like the future.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CTen more days of February. The calendar says spring is coming. The letterhead says otherwise.\u201D',
  },
];

const DAY160: C2Station = {
  day: 160,
  title: 'Priya\u2019s Price',
  begin: 'Day 160. Mid-February, and the intel economy is open: Priya owes the corner for June\u2019s wall, and today she pays \u2014 in facts that rearrange the board. Craig\u2019s lying about Doris. The estate\u2019s leveraged. Corvus has walked three of the eleven. Facts only: carry them carefully.',
  wake: 'Rosa: \u201CYou\u2019ve got a subway face. Whatever Priya told you \u2014 and she told you, she always tells you \u2014 eat first, carry after.\u201D',
  queue: DAY160_QUEUE,
  rushDone: 'Three orders and a board of facts that get heavier the longer you hold them. The corner serves. The notebook decides what\u2019s load-bearing.',
  climbNote: 'The notebook gets it in Priya\u2019s order: the lie, the leverage, the tour. Three of eleven. The map in the mailboxes wasn\u2019t a mock-up, it was a checklist. Useful is safe \u2014 say it again, slower.',
  goldenNote: 'Four windows, one of them behind a door with eleven locks the block believes in. The render\u2019s sun comes from the west. So does the trouble.',
};

// ------------------------------------------------------------- day 174 ----

/** Doc 06 §C2 event 4 — the squeeze: Craig's private offer. The quoted
 *  tail is doc-verbatim. */
export const C2_CRAIG_OFFER_NOTE =
  'Craig, in the diner\u2019s back booth like it\u2019s his office, tie loosened to the exact angle of reasonableness: \u201CHere\u2019s the grown-up version. Corner Slice signs its own renewal \u2014 separate, quiet. Friend rate, locked five years. The Compact\u2019s a lovely idea that was dead the day the mailboxes got the map. You\u2019re the only one in that garden who can read a lease. Sign yours, keep your shop, and \u2014 you didn\u2019t hear it from me.\u201D';

/** Doc 06 §C2 event 5 / doc 08 §3 — the break's four forms (the register's
 *  N2). The pick's prompt is the rails' own requirement, in-world. */
export const C2_N2_PROMPT =
  'The rails require a break \u2014 the Compact\u2019s leverage is unanimity, and unanimity is a knife anyone can pull. Craig\u2019s booth is still warm. What form does the break take?';

/** Doc 08 §3's victim-line, verbatim (Mehmet's sentence, the May scene's
 *  canon anchor). */
export const C2_MEHMET_SENTENCE = 'the Hollis boy and the new boy';

const DAY174_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CCraig bought the back booth again. Man tips like an apology. In my experience apologies come in two flavors \u2014 sincere, and scheduled.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, watching the door: \u201CHe\u2019s working the block one booth at a time. First the garden\u2019s paper, now the diner\u2019s vinyl. Watch the vinyl, kid.\u201D',
  },
];

const DAY174: C2Station = {
  day: 174,
  title: 'The Squeeze',
  begin: 'Day 174. March arrives and Craig arrives with it \u2014 not at the shop, not at the garden, at the diner\u2019s back booth, where the ketchup hides the wood grain and the acoustics hide the conversation. Facts only: he wants one signature, and it isn\u2019t the Compact\u2019s.',
  wake: 'Rosa: \u201CDiner\u2019s got your name on the booth tonight. Rosa\u2019s got opinions, but Rosa\u2019s got a counter to run. Whatever he offers, it isn\u2019t free. Nothing with ribbon on it is free.\u201D',
  queue: DAY174_QUEUE,
  rushDone: 'Two orders. The booth\u2019s waiting and the notebook\u2019s doing that thing where every page is the same page. The break needs a shape. The shape is mine to choose.',
  climbNote: 'Four forms in the notebook, and the pen knows which one writes the cleanest lease. Useful is safe. The ladder\u2019s next rung is built out of somebody else\u2019s lumber and I know it. I know it.',
  goldenNote: 'Four windows. Behind one of them a decision is cooling faster than the coffee did. The block will feel this in May. Tonight it feels like nothing. That\u2019s how it\u2019s built.',
};

// ------------------------------------------------------------- day 188 ----

/** Doc 06 §C2 short-term consequences — the renewal with a ribbon, and
 *  Eddie's verbatim line (the important conversation: relief without
 *  ignorance). */
export const C2_EDDIE_RENEWAL_NOTE =
  'The renewal arrives the way Craig promised it would: friend rate, five years, and an actual ribbon \u2014 a real one, a leftover from somebody\u2019s grand opening, tied around the folder like the paper version of a wink. Eddie holds it a long time. He\u2019s old, not blind. \u201CWho did you promise, and what did it cost them?\u201D';

/** The ribbon's aftertext (authored to spec — the chapter's most painful
 *  kindness, doc 08 §3). */
export const C2_EDDIE_RENEWAL_AFTER =
  'Then he ties the ribbon back neatly, files the renewal, and starts the oven. That\u2019s the whole verdict: he takes the relief and files the question in the same motion. The shop lives. The question lives. I wipe the counter like either of those is a job I can do.';

/** Doc 06 §C2 event 8 — Kev's appeal denied (independent event); the
 *  board carries the letter's weight. */
export const C2_KEV_APPEAL_NOTE =
  'Kev\u2019s community-college appeal came back denied \u2014 the letter\u2019s on the board where the petition used to be, annotated in Kev\u2019s neat block print: STAPLED, NOT FRAMED. His money pressure just went from seasonal to chronic, and he\u2019s still first in line for the rush with his chin up. The block doesn\u2019t know what to do with that yet. Neither do I. I wrote it down anyway.';

const DAY188_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CHeard the shop\u2019s renewal came through. With a RIBBON. Five years. Nobody ties a ribbon on something they expect to keep losing money on.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar, careful: \u201CYoli\u2019s not answering texts. The garden\u2019s still there, but the door\u2019s... you know. Screen-door weather.\u201D',
  },
];

const DAY188: C2Station = {
  day: 188,
  title: 'The Ribbon',
  begin: 'Day 188. The shop\u2019s renewal is signed, sealed, and \u2014 I want to be sick about this \u2014 ribboned. Friend rate, five years, Eddie\u2019s relief total and wrong-footed. Facts only: the shop lives, and the price of the ribbon is filed under a question Eddie already knows the answer to.',
  wake: 'Rosa: \u201CI heard about the ribbon.\u201D A pause with twenty-five years in it. \u201CFeed the corner, Leo. The rest \u2014 the rest the block does in private.\u201D',
  queue: DAY188_QUEUE,
  rushDone: 'Two orders and a corner that knows something happened and is being polite about not asking. The Compact is dead as strategy and alive as grudge, and the grudge has my first text unanswered on it.',
  climbNote: 'The notebook, for once, gets the short version: the shop\u2019s safe. The margins get the rest \u2014 Kev\u2019s letter, Yoli\u2019s screen door, Eddie\u2019s question. Useful is safe. The handwriting believes it less than the mouth does.',
  goldenNote: 'Four windows, all of them ours for five more years. The ribbon\u2019s in the drawer with the takeout menus. Let it stay a drawer thing.',
};

// ------------------------------------------------------------- day 230 ----

/** Doc 06 §C2 event 9 — the rent wave; the room re-rated; the diary
 *  records generosity, the ledger records silence purchased. */
export const C2_RENT_WAVE_NOTE =
  'Craig\u2019s rent wave hits the whole row the same week \u2014 Kestrel\u2019s rent doubles and Mehmet starts doing inventory arithmetic at the counter like the numbers owe him money \u2014 and my own room gets re-rated to $1,450. I pay it. I say nothing. The notebook calls this generosity, which is generous of it.';

/** The ledger's omission (the Silent class, authored outside the
 *  register \u2014 doc 10 §1): what the silence purchased. */
export const C2_RENT_WAVE_LEDGER_ID = 'led-c2-rent-wave-silence';
export const C2_RENT_WAVE_SILENCE_REFS = ['eddie', 'craig', 'c2-rent-wave'] as const;

const DAY230_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CKestrel\u2019s rent DOUBLED. In April. That\u2019s not a lease, that\u2019s a countdown.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, flat: \u201CThe paper says the market\u2019s up. The market\u2019s a render, kid. Renders don\u2019t live here.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 EXTRA HOT',
    pay: 3,
    reaction: 'The extra-hot, clutching the cup: \u201CMehmet counted screws at my counter for ten minutes and didn\u2019t buy anything. You don\u2019t count screws when you\u2019re staying.\u201D',
  },
];

const DAY230: C2Station = {
  day: 230,
  title: 'The Rent Wave',
  begin: 'Day 230. April, and the wave Craig promised nobody arrives exactly like a tide: quiet, total, and indifferent to what\u2019s in its path. Kestrel\u2019s rent doubles. My room re-rates to $1,450. The Compact\u2019s eleven locks are holding the garden\u2019s door and nothing else. Facts only: pay it, say nothing, keep the counter honest.',
  wake: 'Rosa: \u201CMehmet\u2019s counting screws again. I\u2019ve seen that face once before \u2014 on people carrying boxes in their heads weeks before the boxes come.\u201D',
  queue: DAY230_QUEUE,
  rushDone: 'Three orders and a row of storefronts doing arithmetic. The wave didn\u2019t take the corner \u2014 the corner has a ribbon on it. Write down what that cost. No \u2014 write down the number instead. Numbers are easier.',
  climbNote: 'Upstairs the new rent sits on the desk like a guest who rearranged the furniture. $1,450. The notebook says generosity. The ledger, if ledgers could talk, says silence purchased. Both are me. That\u2019s the gap Deniz keeps measuring.',
  goldenNote: 'Four windows and a hardware store\u2019s lights burning later than usual \u2014 counting is easier in the dark, I guess. The block\u2019s pricing itself in and out of things. The corner glows anyway.',
};

// ------------------------------------------------------------- day 243 ----

/** Doc 06 §C2 event 6 — the Oktays pay; the leaving scene (doc 08 §3's
 *  canon default: the register's last sale, the photograph). N2b rides
 *  this scene (core/choiceNodes.ts). */
export const C2_OKTAYS_SCENE: readonly string[] = [
  'Saturday. Kestrel\u2019s gate is up for the last time and the sidewalk grows boxes \u2014 thirty-one years of inventory arithmetic, packed by hand, labeled by hand, carried by hand. Ay\u015fe wraps the register like a baby. Mehmet won\u2019t let anyone touch the pens drawer until it\u2019s done being counted.',
  'The register\u2019s last sale happens on the sidewalk, out of the box, because the block insists: a toy truck \u2014 Eli\u2019s, back for one more lap \u2014 and Mehmet rings it NO SALE and hands it over free. \u201CRegister\u2019s closed,\u201D he says, to the truck, to the street, to nobody.',
  'Deniz is here the way Deniz is now: quiet, recording. She photographs the Compact\u2019s sign-in sheet \u2014 the one from the garden \u2014 and the camera lingers on the withdrawal line the way cameras do when the truth has a name on it.',
];

/** Doc 06 §C2 important conversations — the Oktays' last Saturday (the
 *  cost made human), with doc 08 §3's verbatim sentence. */
export const C2_OKTAYS_MEHMET_NOTE =
  'Mehmet shakes my hand at the gate. His grip does the talking: \u201CThe Hollis boy and the new boy.\u201D That\u2019s the whole sentence now \u2014 I\u2019m in it, in the same breath, forever. He doesn\u2019t say it loud. He doesn\u2019t have to. Inventory arithmetic: everything counted, everything kept.';

const DAY243_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CLast Saturday at Kestrel. I bought a bag of screws I don\u2019t need. We all bought screws. It\u2019s the block\u2019s way of RSVPing.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular, holding a toy truck coffee order: \u201CThe truck rang NO SALE, free, in FRONT of everyone. Thirty-one years and the last sale\u2019s a kid\u2019s truck. I\u2019m not crying, the wind\u2019s horizontal.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, serious: \u201CCorvus flips the unit next month. Something\u2019s coming where the screws were. The block knows the shape before the ink. It always does.\u201D',
  },
];

const DAY243: C2Station = {
  day: 243,
  title: 'The Last Saturday',
  begin: 'Day 243. May. The Oktays\u2019 last Saturday \u2014 boxes on the sidewalk, the register\u2019s last sale a toy truck, and Deniz\u2019s camera doing what cameras do now. The Compact said eleven. The street says goodbye to two like it\u2019s saying goodbye to the idea of eleven. Facts only: help. That\u2019s the job today. Just \u2014 help.',
  wake: 'Rosa: \u201CGo early. Carrying boxes is the only currency the block respects at a time like this, and you\u2019ve got two hands and a debt the rest of us can see.\u201D',
  queue: DAY243_QUEUE,
  rushDone: 'Three orders, every one of them about Kestrel. The corner feeds the block through its worst Saturdays \u2014 that part of the job never changes, whatever else the ribbon bought.',
  climbNote: 'The notebook, and my hand does the honest thing for once: Mehmet\u2019s sentence, verbatim, with me in it. The Compact was eleven pretending. The boxes were two, and they were real. I did that math in March and I\u2019m the one carrying it in May.',
  goldenNote: 'Four windows. Down the row, a hardware store\u2019s gate hangs open on an empty room. The block\u2019s lights look like they\u2019re standing at attention. Good. Somebody should.',
};

// ------------------------------------------------------------- day 269 ----

/** Doc 06 §C2 event 7 — Rosa's 25th anniversary, verbatim (the toast is
 *  seated across from, not beside). */
export const C2_ROSA_ANNIVERSARY_LINE =
  'Twenty-five years. The block kept everything. Almost everything.';

/** Doc 06 §C2 diary developments — El Vann's name surfaces, verbatim. */
export const C2_ROSA_ELEANOR_LINE =
  'Ask Eleanor about the rain that came inside.';

/** Doc 06 §C2 diary developments — the QUESTION, verbatim. */
export const C2_Q_DORIS = 'What did Doris sign in \u201994?';

/** Doc 06 §C2 long-term consequences — the K2 entry, verbatim, tagged
 *  FACT, wrongly (the strike is C5's; the ledger's bigger contradiction
 *  is written here, in June). */
export const C2_K2_BODY =
  'The Compact was going to fail anyway. I saved the shop. Net good.';

/** The toast's two options (doc 06 §C2 major decisions — one of the two
 *  makes Rosa stop smiling for exactly two seconds; doc 08 §3: the toast
 *  is her verdict). A local pick \u2014 the register's doc-10 table owns no
 *  toast node; the divergence is the note and the ink, C0's theory-pick
 *  precedent. */
export const C2_TOAST_PROMPT =
  'The table turns to Leo. Rosa\u2019s glass is up. Twenty-five years, one block, and a corner of it owing somebody an answer. What\u2019s the toast?';

export const C2_TOAST_ROSA_LABEL = 'Raise it Rosa\u2019s way';
export const C2_TOAST_ROSA_BLURB =
  'To the block \u2014 the windows, the screws, the caldo, the twenty-five years. Plain words, her tempo, no agenda in the glass.';
export const C2_TOAST_ROSA_INK =
  'I raised the glass Rosa\u2019s way. To the block \u2014 plain, no agenda, her tempo. She smiled the whole toast long and refilled my cup without being asked, which from Rosa is a paragraph and a half.';
export const C2_TOAST_ROSA_NOTE =
  'Rosa: \u201CGood. You\u2019re learning which glass to lift.\u201D The block drinks. The table holds.';

export const C2_TOAST_FUTURE_LABEL = 'Raise it to \u201Cthe future of the block\u201D';
export const C2_TOAST_FUTURE_BLURB =
  'The render\u2019s own phrase, said warm. It sounds like vision. It is somebody\u2019s vision \u2014 that\u2019s the problem.';
export const C2_TOAST_FUTURE_INK =
  'I said the phrase. \u201CThe future of the block.\u201D It got a polite cheer and one sound I keep hearing now: Rosa\u2019s glass, set down on wood, two seconds early. She smiled the rest of the night. Not those two seconds.';
export const C2_TOAST_FUTURE_NOTE =
  'Two seconds. The whole block drank and Rosa\u2019s face was a closed window for exactly two seconds, and then it was Rosa\u2019s face again. I know what phrase I said. I know where I\u2019ve heard it.';

const DAY269_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CTwenty-five years at Rosa\u2019s window. I\u2019ve drunk coffee on three continents and that window\u2019s the only one that remembers my order AND my mistakes.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar, already dressed up: \u201CThe long table\u2019s going up in front of the deli. ONE table, the whole block. You know what that means? Somebody\u2019s seating chart is a foreign policy.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 EXTRA HOT',
    pay: 3,
    reaction: 'The extra-hot: \u201CShe\u2019s seating you ACROSS from her, I heard. Not beside. Across. Rosa doesn\u2019t do anything by accident, and she definitely doesn\u2019t seat by accident.\u201D',
  },
];

const DAY269: C2Station = {
  day: 269,
  title: 'Twenty-five',
  begin: 'Day 269. June, and the block is building a table the length of its memory in front of Rosa\u2019s deli \u2014 twenty-five years, one seating chart, and my chair is across from the guest of honor on purpose. Facts only: serve the morning, dress nice-ish, and know which glass to lift.',
  wake: 'Rosa: \u201CTonight, one table. If you say the wrong thing at my toast I will feed you caldo until you apologize, and my caldo fixes what\u2019s wrong with people. Tonight \u2014 feed the corner like it\u2019s a Saturday in the story of us.\u201D',
  queue: DAY269_QUEUE,
  rushDone: 'Three orders and a block getting dressed for itself. Twenty-five years. The counter\u2019s part of the story now whether the ribbon deserves it or not.',
  climbNote: 'The notebook, careful: Eleanor. Doris. \u201994. The rain that came inside. Rosa doesn\u2019t hand out homework, and that\u2019s what that was \u2014 homework with a smile on it. The QUESTION goes in the tray where the other ones wait.',
  goldenNote: 'Four windows lit and a long table lighting up down the block. The city\u2019s never seen this street try to be one thing at once. Tonight it manages it. Almost everything.',
};

// ------------------------------------------------------------- day 295 ----

/** Doc 06 §C2 handoff — June's lease arrives with the same paperstock. */
export const C2_JUNE_LEASE_NOTE =
  'June\u2019s lease arrived this morning \u2014 the Halcyon\u2019s own renewal, Craig\u2019s letterhead, and I\u2019d know that paperstock anywhere: the same weight, the same watermark, the same cheap-invitation-to-a-fight texture as the folder with the ribbon. June laughs it off \u2014 \u201CPaper\u2019s just paper\u201D \u2014 and I stand there in her doorway holding the echo of a frame I helped build and I don\u2019t laugh.';

const DAY295_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CHalf the year, gone. The tea tastes the same. That\u2019s how you\u2019ll know you survived it.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, summer-ready: \u201CFourth of July\u2019s coming. Shop\u2019s about to have its biggest week of the year. Eddie\u2019s been prepping the oven like it\u2019s a moon launch.\u201D',
  },
];

const DAY295: C2Station = {
  day: 295,
  title: 'June\u2019s Lease',
  begin: 'Day 295. June\u2019s last morning, and the chapter\u2019s paper has found its next door: the Halcyon\u2019s renewal, Craig\u2019s paperstock, June laughing it off in a doorway. July heat is coming, the Fourth\u2019s coming, the shop\u2019s busiest week is coming. Facts only: the season ends today. What it cost is itemized elsewhere.',
  wake: 'Rosa: \u201CLast morning of the season. Caldo\u2019s on the house and the house doesn\u2019t ask what kind of year it was. It was a year. Eat.\u201D',
  queue: DAY295_QUEUE,
  rushDone: 'Two orders. The season\u2019s books are closed and the counter doesn\u2019t balance \u2014 not with money, with everything else. The notebook knows. The ledger knows. June\u2019s doorway knows.',
  climbNote: 'The notebook gets the season\u2019s last fact: the paperstock matched. Eddie\u2019s frame, June\u2019s doorway \u2014 same paper, different hands holding it. Useful is safe. Say it one more time and see if it fits in the suitcase.',
  goldenNote: 'Four windows, summer coming through them like it owns the place. The block made it to July. Most of the block made it to July. The lights hold the count.',
};

// ===========================================================================
// 2. The station map + captions (the loop's data side)
// ===========================================================================

export const C2_STATIONS: Readonly<Record<number, C2Station>> = Object.freeze({
  120: DAY120,
  124: DAY124,
  129: DAY129,
  146: DAY146,
  147: DAY147,
  160: DAY160,
  174: DAY174,
  188: DAY188,
  230: DAY230,
  243: DAY243,
  269: DAY269,
  295: DAY295,
});

/** The station days, in order — the linger machine and the tests read
 *  this (data, not scattered conditionals). */
export const C2_STATION_DAYS: readonly number[] = Object.freeze(
  Object.keys(C2_STATIONS).map(Number).sort((a, b) => a - b),
);

export function c2StationOf(day: number): C2Station | undefined {
  return C2_STATIONS[day];
}

// ------------------------------------------------------ the postcards ----

/** One station's postcard caption (the shipped capture pipeline's own
 *  mouth, the chapter's voice — the postcard says its own DATE, because
 *  in C2 the dates are still the story). */
export interface C2Caption {
  date: string;
  body: string;
  replay: string;
}

/** The chapter's captions, keyed by calendar day (the stations). Authored
 *  in doc 13 §3's C2 voice; the dates ride the calendar module's own
 *  rendering (no hand formatting). */
const C2_CAPTIONS: Readonly<Record<number, C2Caption>> = Object.freeze({
  120: {
    date: 'January 6',
    body: 'The paper year. $7,200 or the space markets, and the mailboxes got a map with eleven green circles.',
    replay: 'The paper year, again. The number holds.',
  },
  124: {
    date: 'January 10',
    body: 'The Compact. Eleven lines on a clipboard, the garden doing the lighting\u2019s job, and one old lie finally struck through.',
    replay: 'The Compact, again. The lines hold.',
  },
  129: {
    date: 'January 15',
    body: 'The coffee. Marisol read everything. Nobody asked for anything. That\u2019s the part I keep checking twice.',
    replay: 'The coffee, again. The card still asks nothing.',
  },
  146: {
    date: 'February 1',
    body: 'The plan, evening one. The shed was a situation room and the trench coat had eleven arms.',
    replay: 'Evening one, again. The pads still multiply.',
  },
  147: {
    date: 'February 2',
    body: 'The plan, evening two. A schedule with teeth, and the M121\u2019s window on the way home putting three lines in the book I didn\u2019t earn.',
    replay: 'Evening two, again. The loop home still hums.',
  },
  160: {
    date: 'February 15',
    body: 'Priya\u2019s price. The lie about Doris, the leveraged estate, three of the eleven already walked. The favor\u2019s name comes later.',
    replay: 'The price, again. The invoice stays blank.',
  },
  174: {
    date: 'March 1',
    body: 'The squeeze. Friend rate, five years, the back booth \u2014 and four shapes for a break only I could choose.',
    replay: 'The squeeze, again. The booth still warm.',
  },
  188: {
    date: 'March 15',
    body: 'The ribbon. The shop lives for five years and Eddie asked the only question that matters. Kev\u2019s letter went up stapled, not framed.',
    replay: 'The ribbon, again. The question files itself.',
  },
  230: {
    date: 'April 26',
    body: 'The rent wave. Kestrel doubles, my room re-rates, and the notebook calls the silence generosity.',
    replay: 'The wave, again. The number sits there.',
  },
  243: {
    date: 'May 9',
    body: 'The last Saturday. Boxes, a toy truck\u2019s NO SALE, Deniz\u2019s camera on the withdrawal line, and Mehmet\u2019s sentence with me in it.',
    replay: 'The last Saturday, again. The gate still open.',
  },
  269: {
    date: 'June 4',
    body: 'Twenty-five years. One table, my chair across from hers on purpose, and a glass I had to choose. Eleanor\u2019s name is homework now.',
    replay: 'Twenty-five, again. The toast still lands.',
  },
  295: {
    date: 'June 30',
    body: 'June\u2019s lease, Craig\u2019s paperstock, July heat coming. The season\u2019s books close and the counter doesn\u2019t balance.',
    replay: 'The season\u2019s last card. The paperstock matched.',
  },
});

/** The station's caption (the composeCaption seam — content.ts calls
 *  this before its C1/C0 branches, the same precedence the stations
 *  themselves ride). */
export function c2CaptionOf(day: number): C2Caption | undefined {
  return C2_CAPTIONS[day];
}

// ===========================================================================
// 3. The season compressions — R4's named transition, consuming days
// ===========================================================================

/** One compression: the linger plays its two lines and the NEXT press
 *  rolls the counters `from → to` through the next-day door (the 1:1 law
 *  moves whole). `seasonCut` marks a compression that crosses a season
 *  boundary (crossedSeasonCut proves it — the winter→spring cut). */
export interface C2Compression {
  from: number;
  to: number;
  intro: string;
  city: string;
  seasonCut?: boolean;
}

/** The ten compressions (the gaps between stations; 146→147 is the
 *  window's own two evenings and rolls through the plain next-day door).
 *  Compositions are authored in doc 13 §3's C2 voice; the city lines
 *  follow the C0/C1 cut's pattern (the city says one thing, flat, and it
 *  lands). */
export const C2_COMPRESSIONS: readonly C2Compression[] = Object.freeze([
  {
    from: 120,
    to: 124,
    intro: 'The first week of the year keeps the corner\u2019s hours: the urn, the regulars, the map going soft in the rain. The garden\u2019s been promised a meeting, and the block practices its Saturday faces in shop windows.',
    city: 'Eleven storefronts got the same email. The corner counted them out loud.',
  },
  {
    from: 124,
    to: 129,
    intro: 'The Compact is three days old and already load-bearing: the clipboard lives in the freezer drawer, the walk-away number has a legend, and the block has started saying \u201Cwe\u201D in sentences that used to be about \u201Cmy lease.\u201D Somewhere across the street, a diner booth gets reserved.',
    city: 'The garden had eleven names in it. The street repeated them like a phone number.',
  },
  {
    from: 129,
    to: 146,
    intro: 'The coffee\u2019s aftertaste outlasts January: no ask, no card left behind, no follow-up. Just the sense of being read, cover to cover, by something with a bookshelf. The shed\u2019s been booked for two evenings. The block calls it strategy. The block is right.',
    city: 'The corner kept its hours. Somebody with a render kept his.',
  },
  {
    from: 147,
    to: 160,
    intro: 'The schedule sleeps in the shed and wakes in eleven drawers. The renewal calendar\u2019s pressure points get circled, uncircled, and circled again. February does what February does to this block \u2014 makes everyone an expert on other people\u2019s boilers \u2014 and underneath it, the board learns Priya\u2019s favorite word: unverifiable.',
    city: 'The block\u2019s paper grew a spine. The letterhead grew a waitlist.',
  },
  {
    from: 160,
    to: 174,
    seasonCut: true,
    intro: 'The facts Priya sold don\u2019t rot \u2014 that\u2019s the trouble with facts. The lie about Doris keeps being lied, the tour\u2019s three buildings grow quiet fences of caution tape, and the block carries spring in its shoulders like a passenger. Somewhere in a diner, a back booth is being kept warm.',
    city: 'The light came back for the beds. The block planted anyway \u2014 out, not in.',
  },
  {
    from: 174,
    to: 188,
    intro: 'March walks the decision around the block in Craig\u2019s cologne: the booth\u2019s offer, the friend rate\u2019s arithmetic, the four shapes cooling in a notebook. The garden\u2019s schedule holds its weeks. The renewal\u2019s paperwork moves at the speed of ribbon.',
    city: 'The corner signed something in March. The street heard it in ribbon.',
  },
  {
    from: 188,
    to: 230,
    intro: 'The ribbon season: the shop\u2019s five years locked, Yoli\u2019s first text going unanswered the way a door goes unlocked \u2014 nobody decides it, it just is \u2014 and Kev\u2019s appeal letter getting read by everybody and answered by nobody. The block prices things quietly now. Screws get counted.',
    city: 'Spring came in on schedule. The rents came in on Craig\u2019s.',
  },
  {
    from: 230,
    to: 243,
    intro: 'The wave finishes what waves do: Kestrel\u2019s rent doubles and the double becomes boxes. Mehmet counts the pens drawer one last time \u2014 inventory arithmetic as a form of prayer \u2014 and the block starts planning a Saturday around a gate that\u2019s coming down.',
    city: 'The hardware store\u2019s hours shrank to the size of its future. The block shopped anyway. It counts too.',
  },
  {
    from: 243,
    to: 269,
    intro: 'After the boxes, the block does what the block does: it plans a table. Rosa\u2019s twenty-five is three Saturdays out and the seating chart is being negotiated with the gravity of a treaty. June comes in warm. June always comes in warm. The notebook\u2019s margins get careful.',
    city: 'The block bought string lights for a table long enough to hold its own argument. The corner supplied the coffee.',
  },
  {
    from: 269,
    to: 295,
    intro: 'The toast\u2019s aftertaste \u2014 whichever toast \u2014 rides the last weeks of the season. June\u2019s renewal shows up in Craig\u2019s paperstock and laughs it off in her name. The Fourth\u2019s supplies arrive at the shop like a stage crew. The season\u2019s books close on a counter that doesn\u2019t quite balance.',
    city: 'The street learned the word paperstock without knowing it. The corner closed its books.',
  },
]);

export function c2CompressionFrom(day: number): C2Compression | undefined {
  return C2_COMPRESSIONS.find((c) => c.from === day);
}

/** The linger machine's answer for a C2 day: 'next' = the ordinary
 *  tomorrow (or the window's second evening); a compression = the
 *  montage-then-roll; 'cut' = the season's last linger (the July cut).
 *  Null for any day that isn't C2's — the machine above owns those. */
export function c2RailFor(day: number): 'next' | 'cut' | { compress: number } | null {
  if (!Number.isInteger(day) || day < C2_FIRST_DAY || day > C2_LAST_DAY) return null;
  if (day === C2_LAST_DAY) return 'cut';
  const comp = c2CompressionFrom(day);
  if (comp) return { compress: comp.to };
  return 'next';
}

// ===========================================================================
// 4. The C2→C3 season cut — the chapter close (doc 06 §C2 handoff)
// ===========================================================================

/** The cut's diary latch (the block layer's law: the latch IS the
 *  entry; the cut plays once per save). */
export const C2_CUT_ID = 'c2-cut-summer';

/** Doc 06 §C2 handoff, staged: July heat, the Fourth, the shop's busiest
 *  day — and Eddie's hand on the counter, not moving (the staging line
 *  is written-to-spec; the facts are the doc's; C3 plays the season it
 *  opens). */
export const C2_CUT_STAGE =
  'July heat lands on the block like a lid. The Fourth is Saturday and the shop is staging its busiest week of the year \u2014 the oven\u2019s been rehearsed like a moon launch. Eddie\u2019s hand rests flat on the counter a moment too long, the way a hand does when it\u2019s checking that it still belongs there. It does. For now, it does.';

/** The cut's wall (authored, doc 13 voice): the season kept; what the
 *  summer brings is the next wave's content — the hold says so in the
 *  world's own voice, never in project-speak. */
export const C2_CUT_WALL =
  'July opens its first morning and the corner keeps its hours. The ribbon\u2019s in the drawer, the table\u2019s down, the boxes are gone, and the notebook knows what it knows. Some arithmetic doesn\u2019t show until the paper does.';

/** The cut's marker entry — the latch (doc 13 §3 C2 voice, Stage II's
 *  ledger: the season's facts, the costs kept out of frame exactly the
 *  way K2 keeps them). Dated July 1, Y2. */
export function c2CutEntry(): FieldDiaryEntry {
  return {
    id: C2_CUT_ID,
    kind: 'EVENT',
    date: dateOfCalendarDay(C2_CUT_DAY),
    epistemic: 'FACT',
    body: 'Half a year, closed: the shop renewed at the friend rate, the Compact eleven strong on paper, the corner\u2019s hours kept every single week. Facts only, and the facts are good. The rest is itemized elsewhere \u2014 and \u201Celsewhere\u201D is a place I keep not writing about.',
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

// ===========================================================================
// 5. The chapter's Lost-Year fragment — F3 Zanesville (doc 02 §6.2)
// ===========================================================================

export const C2_FRAGMENT_IDS = {
  f3: 'c2-f3-zanesville',
} as const;

function fragmentRow(id: 'F3') {
  const row = FRAGMENTS.find((f) => f.id === id);
  if (!row) throw new Error(`c2pack: fragment ${id} missing from the register`);
  return row;
}

/** F3 — doc 06 §C2 diary developments: "F3 fires (the M121 at dusk,
 *  riding the loop home — the bus window, the green sign,
 *  vending-machine coffee; logged in the wobble style between the
 *  Compact's two halves)". The register row's three sensory clauses
 *  become ONE RECALL entry, the wobble style (the C0 wobble's vehicle;
 *  the C1 pack's F6 precedent — one entry, once per save). */
export function f3Entry(calendarDay: number): FieldDiaryEntry {
  const row = fragmentRow('F3');
  return {
    id: C2_FRAGMENT_IDS.f3,
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
// 6. The contradiction ledger's first strikes — K1 the cart, K6 the
//    surveyor's GUESS (doc 03 §5, doc 15's list: both struck in C2)
// ===========================================================================

/** K1 — the cart truth (doc 15: "K1 the cart (C2 strike)"; doc 06 §C2:
 *  "Ledger K1 fires (the cart truth) — the first strikethrough, early in
 *  the chapter, teaching the mechanic before the chapter's bigger
 *  contradiction"). Earned at the Compact's sign-in sheet: the sheet
 *  asks WHO, and the day-one entry's over-tag finally answers honestly.
 *  The strike quotes the offending word in `C0_MISHEAR_BODY`; the margin
 *  is doc 03 §5.1's sample, verbatim. */
export function c2K1Correction(calendarDay: number): Correction {
  return { day: calendarDay, strike: C2_K1_STRIKE, margin: C2_K1_MARGIN };
}

/** K6 — the surveyor's GUESS (doc 15: "K6 the surveyor GUESS
 *  ('watching someone,' struck C2 — sunlight and square feet)"). Earned
 *  when the assemblage map reaches the mailboxes and the render poster
 *  explains the man at the fence: it was never a person watching. The
 *  strike quotes the offending phrase in the C0 GUESS entry's body. */
export const C2_K6_STRIKE = 'watching someone';
export function c2K6Correction(calendarDay: number): Correction {
  return { day: calendarDay, strike: C2_K6_STRIKE, margin: C2_K6_MARGIN };
}

/** The two C0 entries the strikes correct (the ids are c0pack's own —
 *  one source). Exported for the tests' pins. */
export const C2_STRIKE_TARGETS = {
  k1: C0_MISHEAR_ENTRY_ID,
  k6: C0_BLOCK_IDS.surveyor,
} as const;

/** The offending phrase the K6 strike targets, verbatim (the C0 GUESS
 *  entry's body — pinned here so a c0pack edit that breaks the strike
 *  fails HERE, at the pack's own law, before it fails in a save). */
export const C2_K6_SOURCE_BODY = SURVEYOR_DIARY_GUESS;

// ===========================================================================
// 7. The beats' diary ink — one draft per authored latch (the block
//    layer's law: the entry IS the latch)
// ===========================================================================

/** The pack's entry-id namespace (the c0/c1 precedent: `c2-` prefixed,
 *  one id per latch). */
export const C2_IDS = {
  notice: 'c2-notice-ask',
  map: 'c2-map-mailboxes',
  compact: 'c2-compact-founding',
  coffee: 'c2-marisol-coffee',
  session1: 'c2-session-one',
  session2: 'c2-session-two',
  priya: 'c2-priya-intel',
  squeeze: 'c2-craig-squeeze',
  ribbon: 'c2-ribbon-renewal',
  kev: 'c2-kev-appeal',
  rent: 'c2-rent-wave',
  oktays: 'c2-oktays-leaving',
  anniversary: 'c2-rosa-anniversary',
  lease: 'c2-june-lease',
  qDoris: 'c2-q-doris-94',
  k2: 'c2-k2-net-good',
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

/** Doc 06 §C2 starting circumstances — the formal ask (the paper's own
 *  door; EVIDENCE-tagged by kind and by the notebook's laws). */
export function noticeEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.notice, 'EVENT', day, 'FACT', C2_NOTICE_ASK_NOTE);
}

/** The assemblage map's beat: the poster transcribed with a GUESS tag
 *  (doc 06 §C2 diary/map developments) — and the K6 strike lands here
 *  (GameState applies the correction through correctEntry). */
export function mapEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.map, 'OBSERVATION', day, 'GUESS', C2_MAP_NOTE);
}

/** The Compact's founding (doc 06 §C2 event 1) — the latch entry is the
 *  notebook's own line (the BODY_CAP law: the scene lives in the notes;
 *  the ink keeps what a margin can hold). The sheet's EVIDENCE (doc 08
 *  §3) reads out of this id in May. */
export function compactEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.compact, 'EVENT', day, 'FACT',
    'The Compact, signed: eleven lines on the garden\u2019s clipboard, the corner\u2019s included. The sheet asks WHO. The notebook\u2019s oldest over-tag finally answers in the margin.');
}

/** Marisol's coffee (doc 06 §C2 event 2) + the PERSON card v1. */
export function coffeeEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.coffee, 'PERSON', day, 'FACT', `${C2_MARISOL_CARD_LINE} ${C2_MARISOL_AFTER_NOTE}`);
}

/** The strategy sessions (doc 10 §4's window, two evenings — each its
 *  own latch; the flag sets once, on either). */
export function sessionOneEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.session1, 'EVENT', day, 'FACT', C2_SESSION_ONE_NOTE);
}
export function sessionTwoEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.session2, 'EVENT', day, 'FACT', C2_SESSION_TWO_NOTE);
}

/** Priya's intel + the favor (doc 06 §C2 event 3). */
export function priyaEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.priya, 'EVENT', day, 'FACT', `${C2_PRIYA_INTEL_NOTE} ${C2_PRIYA_FAVOR_NOTE}`);
}

/** The squeeze (doc 06 §C2 event 4) — Craig's private offer. */
export function squeezeEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.squeeze, 'EVENT', day, 'FACT', C2_CRAIG_OFFER_NOTE);
}

/** The ribbon + Eddie's question (doc 06 §C2 short-term consequences +
 *  important conversations). */
export function ribbonEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.ribbon, 'EVENT', day, 'FACT', `${C2_EDDIE_RENEWAL_NOTE} ${C2_EDDIE_RENEWAL_AFTER}`);
}

/** Kev's denied appeal (doc 06 §C2 event 8 — an independent event). */
export function kevEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.kev, 'OBSERVATION', day, 'FACT', C2_KEV_APPEAL_NOTE);
}

/** The rent wave (doc 06 §C2 event 9). */
export function rentEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.rent, 'OBSERVATION', day, 'FACT', C2_RENT_WAVE_NOTE);
}

/** The Oktays' leaving (doc 06 §C2 event 6 + doc 08 §3) — the latch
 *  entry (the scene lives in the notes; the ink keeps the arithmetic). */
export function oktaysEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.oktays, 'EVENT', day, 'FACT',
    'Kestrel\u2019s last Saturday: boxes, the register\u2019s NO SALE (a toy truck \u2014 Eli\u2019s), Deniz\u2019s photograph of the sheet. Mehmet\u2019s sentence includes me now. Inventory arithmetic: everything counted, everything kept.');
}

/** Rosa's anniversary + the Eleanor pointer (doc 06 §C2 event 7 + diary
 *  developments) — the QUESTION joins the tray (C0's question-page
 *  precedent: QUESTION kind, the tray's own law). */
export function anniversaryEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.anniversary, 'EVENT', day, 'FACT', C2_ROSA_ANNIVERSARY_LINE);
}
export function questionDorisEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.qDoris, 'QUESTION', day, 'FACT', `${C2_Q_DORIS} \u2014 Rosa, at the table, verbatim: \u201C${C2_ROSA_ELEANOR_LINE}\u201D`);
}

/** The K2 entry (doc 06 §C2 long-term consequences: "written in June...
 *  tagged FACT, wrongly, and the player can feel it") — the ledger's
 *  bigger contradiction, seeded for its C5 strike. */
export function k2Entry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.k2, 'EVENT', day, 'FACT', C2_K2_BODY);
}

/** June's lease (doc 06 §C2 handoff). */
export function leaseEntry(day: number): FieldDiaryEntry {
  return entry(C2_IDS.lease, 'EVENT', day, 'FACT', C2_JUNE_LEASE_NOTE);
}

// ===========================================================================
// 8. The choice packs — the register's C2 nodes + the local toast
// ===========================================================================

/** The pick packs — the NotebookPrompt overlay's content for the C2
 *  nodes. N2/N2b ride the REGISTER (resolveChoice consumes them, doc 10
 *  §3's option table); the toast is a LOCAL pick (doc 06 §C2 major
 *  decisions; doc 10's table owns no toast node — the divergence is the
 *  note and the ink, C0's theory-pick precedent, no ledger). */
export interface C2ChoicePack {
  nodeId: 'N2' | 'N2b' | 'TOAST';
  prompt: string;
  options: readonly { optionId: string; label: string; blurb: string }[];
}

/** Doc 08 §3's four forms, in the register's order. The overlay shows
 *  ONLY the options whose locks are held (Form C dies with Yoli's
 *  strategy session — doc 10 §4's expiry law; c2ChoicePackOf filters by
 *  the held set). Labels quote doc 08 §3's form names. */
export const C2_N2_PACK: C2ChoicePack = {
  nodeId: 'N2',
  prompt: C2_N2_PROMPT,
  options: Object.freeze([
    {
      optionId: 'pull-out',
      label: 'A \u2014 the quiet pull-out',
      blurb: 'Withdraw Corner Slice alone. The Compact loses its anchor merchant\u2019s visible loyalty; the waverers follow; the friend rate arrives with a bow. Canon\u2019s own default, and it reads like one.',
    },
    {
      optionId: 'courier',
      label: 'B \u2014 the courier',
      blurb: 'Pull out AND carry two more signatures out with you. Deeper betrayal, better terms, a faster collapse. The receipts start here, whether you ever see them or not.',
    },
    {
      optionId: 'information-trade',
      label: 'C \u2014 the information trade',
      blurb: 'Refuse to withdraw \u2014 and trade Yoli\u2019s strategy schedule to Priya\u2019s office to \u201Chelp the board prepare.\u201D It reaches Craig. Clean hands, clean lease, and you KNOW. The fall prices this form hardest.',
    },
    {
      optionId: 'refuse',
      label: 'D \u2014 refuse',
      blurb: 'Refuse the ribbon and absorb the cost. The lease war continues, Eddie\u2019s shop bleeds, and the break happens later, in different clothes \u2014 it happens anyway.',
    },
  ]),
};

export const C2_N2B_PACK: C2ChoicePack = {
  nodeId: 'N2b',
  prompt: 'The gate\u2019s coming down and the boxes are going out. The Oktay moment is here. What does Leo do with it?',
  options: Object.freeze([
    {
      optionId: 'carry',
      label: 'Help carry the boxes',
      blurb: 'Two hands, a whole Saturday, boxes to the truck. It changes nothing on paper. It is the only currency the block respects today.',
    },
    {
      optionId: 'reference',
      label: 'Write the reference letter',
      blurb: 'Thirty-one years of inventory arithmetic, onto a page some landlord might read. The pen can carry what the hands can\u2019t.',
    },
    {
      optionId: 'stay-at-shop',
      label: 'Stay at the shop',
      blurb: 'The counter doesn\u2019t run itself. It\u2019s the coward\u2019s option and the diary knows it \u2014 the diary always knows.',
    },
  ]),
};

export const C2_TOAST_PACK: C2ChoicePack = {
  nodeId: 'TOAST',
  prompt: C2_TOAST_PROMPT,
  options: Object.freeze([
    {
      optionId: 'rosa-way',
      label: C2_TOAST_ROSA_LABEL,
      blurb: C2_TOAST_ROSA_BLURB,
    },
    {
      optionId: 'future-of-the-block',
      label: C2_TOAST_FUTURE_LABEL,
      blurb: C2_TOAST_FUTURE_BLURB,
    },
  ]),
};

/** The pack lookup (the Game layer's seam). `held` is the world's flag
 *  store \u2014 N2's Form C is offered only when the lock is held (doc 10
 *  §4's expiry law); the overlay NEVER offers a locked option, and a
 *  locked option that arrives anyway resolves 'locked' and changes
 *  nothing. The TOAST has no locks (local pick). */
export function c2ChoicePackOf(
  nodeId: string,
  held?: ReadonlySet<string>,
): C2ChoicePack | undefined {
  const base = nodeId === 'N2' ? C2_N2_PACK : nodeId === 'N2b' ? C2_N2B_PACK : nodeId === 'TOAST' ? C2_TOAST_PACK : undefined;
  if (!base || base.nodeId !== 'N2') return base;
  const options = base.options.filter((o) => {
    if (o.optionId !== 'information-trade') return true;
    return held?.has(C2_SESSION_FLAG) ?? false;
  });
  return { ...base, options };
}

// ---- the pick's ink ----

/** What one taken N2 option WRITES \u2014 the diary entry, in his hand (doc
 *  13 §3 C2 voice, Stage II: the break written as victory). One per
 *  option \u2014 the pick is remembered in ink, not in a flag. */
const N2_DIARY: Readonly<Record<string, string>> = Object.freeze({
  'pull-out': 'I pulled Corner Slice out quietly. My renewal, my signature, my shop \u2014 the Compact\u2019s eleven minus one, and the one had a ribbon on it by March. The Compact was eleven businesses pretending eleven businesses have power. I stopped pretending first. Somebody was always going to eat last.',
  'courier': 'I pulled out \u2014 and I carried two more signatures out with me. The cleaner\u2019s lease, the deli\u2019s lease; I know them through the shop, that\u2019s all it was, knowing. Better terms. Faster collapse. The clipboard has three gaps in it now and all three spell my name in different handwriting.',
  'information-trade': 'I didn\u2019t withdraw. I traded Yoli\u2019s strategy schedule to Priya\u2019s office \u2014 to help the board prepare, I told myself, and the sentence is still warm from whoever said it first. The schedule reached Craig. Clean hands. Clean lease. I KNOW. That\u2019s the part I\u2019ll keep: the knowing.',
  'refuse': 'I refused the ribbon. Craig took the number with a 7 in it and left with the friend rate unspent. The lease war continues; Eddie\u2019s shop bleeds a little more each month; the break will happen later, in different clothes, and I\u2019ll recognize it when it does. Eleven for one more season. We\u2019ll see what it buys.',
});

/** The room's reaction line, per option (spoken once, never stored). */
const N2_NOTE: Readonly<Record<string, string>> = Object.freeze({
  'pull-out': 'Craig, on the way out: \u201CSmart. Quiet\u2019s the whole trick, kid.\u201D',
  'courier': 'Craig doesn\u2019t say anything. He just writes two names down that you gave him, and the pen sounds like a shutter.',
  'information-trade': 'Priya, later, flat: \u201CThe board appreciates thorough preparation.\u201D She doesn\u2019t blink. That\u2019s how you know it\u2019s done.',
  'refuse': 'Craig closes the folder without the signature in it. \u201CYour call, kid. The market doesn\u2019t do sentiment, but it does patience.\u201D',
});

const N2B_DIARY: Readonly<Record<string, string>> = Object.freeze({
  'carry': 'I carried boxes. Four hours, two hands, one Saturday. The register went into the truck wrapped like a baby and my back has opinions. It changes nothing on paper. On the sidewalk it was the whole world\u2019s job and I did my share of it.',
  'reference': 'I wrote the reference letter. Thirty-one years, one page \u2014 the pens drawer, the NO SALE, the toy truck. Some landlord will file it without reading it and the page will still be true. The pen carried what the hands couldn\u2019t.',
  'stay-at-shop': 'I stayed at the shop. The counter ran, the orders went out, the corner kept its hours. The coward\u2019s option, and the diary knows it \u2014 this entry IS the diary knowing it. The boxes got carried anyway. By everybody else.',
});

const N2B_NOTE: Readonly<Record<string, string>> = Object.freeze({
  'carry': 'Mehmet, handing over the heaviest one first: \u201CGood. Heavy\u2019s for the young.\u201D',
  'reference': 'Ay\u015fe folds the letter into the box with the register\u2019s manual. \u201CWith the important papers,\u201D she says. It lands like a promotion.',
  'stay-at-shop': 'From the counter the corner sounds like any Saturday. That\u2019s the tell \u2014 the worst Saturdays sound exactly like the good ones.',
});

/** The toast's ink + the room's reaction, per option (the divergence IS
 *  the two seconds \u2014 doc 06 §C2 major decisions; doc 08 §3's verdict). */
const TOAST_DIARY: Readonly<Record<string, string>> = Object.freeze({
  'rosa-way': C2_TOAST_ROSA_INK,
  'future-of-the-block': C2_TOAST_FUTURE_INK,
});
const TOAST_NOTE: Readonly<Record<string, string>> = Object.freeze({
  'rosa-way': C2_TOAST_ROSA_NOTE,
  'future-of-the-block': C2_TOAST_FUTURE_NOTE,
});

// ---- the resolve machine ----

/** What one taken option WRITES \u2014 the resolve machine's output, dressed
 *  for the seam (the c1pack's own shape): the flags ride the world's
 *  flag store (the pivot first), the ledger drafts are complete entries
 *  (id, date, weight, node), the diary lands the pick in his hand, the
 *  note is the room's reaction. The toast writes no ledger and no flags
 *  \u2014 its divergence is the ink and the two seconds. */
export interface C2PickApply {
  ok: boolean;
  reason?: 'bad-node' | 'bad-option' | 'locked';
  flags: string[];
  ledger: LedgerEntry[];
  diary: FieldDiaryEntry | null;
  note: string | null;
}

const C2_CHOICE_WEIGHT = 1;

/** Resolve one pick. N2/N2b resolve through the register's own machine
 *  (`held` feeds the locks \u2014 Form C's expiry); the toast resolves
 *  locally. Pure; the caller applies. Refused picks change nothing. */
export function applyC2Pick(
  nodeId: 'N2' | 'N2b' | 'TOAST',
  optionId: string,
  calendarDay: number,
  held?: ReadonlySet<string>,
): C2PickApply {
  const none: C2PickApply = { ok: false, reason: 'bad-node', flags: [], ledger: [], diary: null, note: null };
  if (nodeId === 'TOAST') {
    const body = TOAST_DIARY[optionId];
    if (!body) return { ...none, reason: 'bad-option' };
    return {
      ok: true,
      flags: [],
      ledger: [],
      diary: entry(`c2-toast-${optionId}`, 'OBSERVATION', calendarDay, 'FACT', body),
      note: TOAST_NOTE[optionId] ?? null,
    };
  }
  const node = nodeById(nodeId);
  if (!node) return none;
  const res = resolveChoice(node, optionId, held);
  if (!res.ok || !res.flagWrites || !res.ledgerWrites) {
    return { ...none, reason: res.reason === 'locked' ? 'locked' : 'bad-option' };
  }
  const date = dateOfCalendarDay(calendarDay);
  const ledger: LedgerEntry[] = res.ledgerWrites.map((w, i) => ({
    id: `led-${nodeId}-${optionId}-${i + 1}`,
    kind: w.kind,
    date,
    refs: [...w.refs],
    weight: C2_CHOICE_WEIGHT,
    visibility: w.visibility,
    node: nodeId,
  }));
  const diaries = nodeId === 'N2' ? N2_DIARY : N2B_DIARY;
  const notes = nodeId === 'N2' ? N2_NOTE : N2B_NOTE;
  const body = diaries[optionId];
  const note = notes[optionId] ?? null;
  const diary: FieldDiaryEntry | null = body
    ? {
        id: `c2-${nodeId.toLowerCase()}-${optionId}`,
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
// 9. The pack's self-check — the no-dead-content law, checked once
// ===========================================================================

export interface C2PackReport {
  ok: boolean;
  problems: string[];
}

/** The pack checks itself against the machines it feeds: the station
 *  keys are exactly the chapter's canon days (each landing on its doc 06
 *  date through the calendar module); every compression's `to` is a
 *  station, ordered, and the season cut is the ONE crossing (winter→
 *  spring, crossedSeasonCut's law); every queue opens with Idris and
 *  pays honest; the canon lines are verbatim; the fragment's row matches
 *  the register; the strikes target the C0 entries' bodies; every option
 *  resolves (N2's Form C ONLY with the lock held \u2014 doc 10 §4's expiry
 *  law, machine-checked from both sides); and no authored prose carries
 *  a real-world year ('94 is canon's own citation \u2014 doc 06 quotes the
 *  apostrophe form; the scan allows no four-digit year anywhere). */
export function validateC2Pack(): C2PackReport {
  const problems: string[] = [];
  // the stations: the exact keys, each on its canon date
  const expectedKeys = C2_STATION_DAYS.join(',');
  const CANON_KEYS = '120,124,129,146,147,160,174,188,230,243,269,295';
  if (expectedKeys !== CANON_KEYS) {
    problems.push(`station keys are ${expectedKeys} (law: ${CANON_KEYS})`);
  }
  const canonDates: Readonly<Record<number, GameDate>> = {
    120: { y: 2, m: 1, d: 6 },
    124: { y: 2, m: 1, d: 10 },
    129: { y: 2, m: 1, d: 15 },
    146: { y: 2, m: 2, d: 1 },
    147: { y: 2, m: 2, d: 2 },
    160: { y: 2, m: 2, d: 15 },
    174: { y: 2, m: 3, d: 1 },
    188: { y: 2, m: 3, d: 15 },
    230: { y: 2, m: 4, d: 26 },
    243: { y: 2, m: 5, d: 9 },
    269: { y: 2, m: 6, d: 4 },
    295: { y: 2, m: 6, d: 30 },
  };
  for (const day of C2_STATION_DAYS) {
    if (calendarDayOf(canonDates[day]!) !== day) {
      problems.push(`station ${day} does not land on its canon date through the calendar module`);
    }
  }
  // the compressions: from a station, to a station, ordered, the cut marked
  for (const c of C2_COMPRESSIONS) {
    if (!C2_STATIONS[c.from]) problems.push(`compression from ${c.from} is not a station`);
    if (!C2_STATIONS[c.to]) problems.push(`compression to ${c.to} is not a station`);
    if (c.to <= c.from) problems.push(`compression ${c.from}\u2192${c.to} does not move forward`);
    if (c.seasonCut && !(c.from === 160 && c.to === 174)) {
      problems.push(`the season-cut flag belongs to 160\u2192174 only (winter\u2192spring)`);
    }
  }
  if (!C2_COMPRESSIONS.some((c) => c.seasonCut)) {
    problems.push('the winter\u2192spring crossing (160\u2192174) must carry the season-cut flag');
  }
  // the queues: Idris opens, honest pays
  for (const day of C2_STATION_DAYS) {
    const st = C2_STATIONS[day]!;
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
  }
  // the canon lines, verbatim (doc 06 §C2 / doc 08 §3 / doc 15)
  const verbatim: readonly [string, string, string][] = [
    [C2_MARISOL_LINE, 'You\u2019re the one who ran the warming station. I read everything.', 'doc 06 §C2 event 2'],
    [C2_ROSA_ANNIVERSARY_LINE, 'Twenty-five years. The block kept everything. Almost everything.', 'doc 06 §C2 event 7'],
    [C2_ROSA_ELEANOR_LINE, 'Ask Eleanor about the rain that came inside.', 'doc 06 §C2 diary developments'],
    [C2_Q_DORIS, 'What did Doris sign in \u201994?', 'doc 06 §C2 diary developments'],
    [C2_EDDIE_RENEWAL_LINE_CHECK(), 'Who did you promise, and what did it cost them?', 'doc 06 §C2 important conversations'],
    [C2_K2_BODY, 'The Compact was going to fail anyway. I saved the shop. Net good.', 'doc 06 §C2 long-term consequences'],
    [C2_MEHMET_SENTENCE, 'the Hollis boy and the new boy', 'doc 08 §3'],
    [C2_K1_MARGIN, 'Loaned. She never said give. I heard what I needed. \u2014 L', 'doc 03 §5.1'],
  ];
  for (const [got, want, src] of verbatim) {
    if (got !== want) problems.push(`a canon line drifted from ${src} (verbatim law)`);
  }
  if (!C2_CRAIG_OFFER_NOTE.includes('you didn\u2019t hear it from me')) {
    problems.push('Craig\u2019s offer lost its verbatim tail (doc 06 §C2 event 4)');
  }
  // the fragment: the pack reads the register (one source), the row is C2's
  try {
    const f3 = fragmentRow('F3');
    if (f3.chapter !== 'C2' || f3.trigger !== 'M121 window, riding the loop at dusk') {
      problems.push('F3\u2019s register row is not C2\u2019s M121');
    }
    const f3Draft = f3Entry(147);
    if (f3Draft.kind !== 'RECALL' || f3Draft.epistemic !== 'RECALL') {
      problems.push('F3\u2019s entry is not the wobble style');
    }
  } catch (e) {
    problems.push(`the fragment register read failed: ${(e as Error).message}`);
  }
  // the strikes: the targets' bodies carry the struck phrases (the c0pack
  // entries are one source; the strike is byte-honest against them)
  if (!C2_K1_STRIKE.length) problems.push('K1\u2019s strike is empty');
  if (!'Rosa gave me the cart.'.includes(C2_K1_STRIKE)) {
    problems.push('K1\u2019s strike does not quote the day-one entry\u2019s body');
  }
  if (!C2_K6_SOURCE_BODY.includes(C2_K6_STRIKE)) {
    problems.push('K6\u2019s strike does not quote the surveyor GUESS\u2019s body');
  }
  // the picks: every option resolves; signatures pairwise unique; the
  // toast's ink lands; Form C's expiry is machine-checked from both sides
  const held = new Set<string>([C2_SESSION_FLAG]);
  for (const pack of [C2_N2_PACK, C2_N2B_PACK, C2_TOAST_PACK]) {
    if (pack.nodeId === 'N2') {
      // the expiry law: Form C resolves WITH the lock and is LOCKED
      // without it \u2014 checked from both sides, the doc's own words
      const withLock = resolveChoice(nodeById('N2')!, 'information-trade', held);
      if (!withLock.ok) problems.push('N2/information-trade: does not resolve with the session held');
      const withoutLock = resolveChoice(nodeById('N2')!, 'information-trade', new Set());
      if (withoutLock.reason !== 'locked') problems.push('N2/information-trade: the expiry law is not enforced (doc 10 §4)');
      // the overlay filters the locked option out (the UI never offers it)
      const offered = c2ChoicePackOf('N2', new Set())?.options.map((o) => o.optionId) ?? [];
      if (offered.includes('information-trade')) problems.push('N2: the overlay offered a locked option');
      if (c2ChoicePackOf('N2', held)?.options.length !== 4) problems.push('N2: the overlay must offer four forms with the lock held');
    }
    const sigs = new Set<string>();
    const options = pack.options;
    for (const o of options) {
      if (pack.nodeId === 'N2') {
        const regOpt = nodeById('N2')!.options.find((r) => r.id === o.optionId);
        if (!regOpt) { problems.push(`N2/${o.optionId}: not in the register`); continue; }
        if (regOpt.locks.length > 0 && !held.has(regOpt.locks[0]!)) continue; // the locked form, checked above
        const res = resolveChoice(nodeById('N2')!, o.optionId, held);
        if (!res.ok || !res.flagWrites) { problems.push(`N2/${o.optionId}: does not resolve`); continue; }
        const sig = res.flagWrites.join(',');
        if (sigs.has(sig)) problems.push(`N2/${o.optionId}: reuses a flag signature`);
        sigs.add(sig);
      }
      const apply = applyC2Pick(pack.nodeId as 'N2' | 'N2b' | 'TOAST', o.optionId, 120, held);
      if (!apply.ok) problems.push(`${pack.nodeId}/${o.optionId}: does not apply`);
      if (!apply.diary) problems.push(`${pack.nodeId}/${o.optionId}: the pick writes no diary ink`);
      if (pack.nodeId === 'TOAST' && apply.ledger.length !== 0) {
        problems.push('the toast must not post ledger acts (the local-pick law)');
      }
    }
  }
  // N2b: three options, all resolve, signatures pairwise unique
  const n2bSigs = new Set<string>();
  for (const o of C2_N2B_PACK.options) {
    const res = resolveChoice(nodeById('N2b')!, o.optionId, new Set());
    if (!res.ok || !res.flagWrites) { problems.push(`N2b/${o.optionId}: does not resolve`); continue; }
    const sig = res.flagWrites.join(',');
    if (n2bSigs.has(sig)) problems.push(`N2b/${o.optionId}: reuses a flag signature`);
    n2bSigs.add(sig);
  }
  // the rails: the frontier lands where the calendar says
  if (C2_FIRST_DAY !== calendarDayOf({ y: 2, m: 1, d: 6 })) problems.push('C2_FIRST_DAY drifted from Jan 6, Y2');
  if (C2_LAST_DAY !== calendarDayOf({ y: 2, m: 6, d: 30 })) problems.push('C2_LAST_DAY drifted from Jun 30, Y2');
  if (C2_CUT_DAY !== calendarDayOf({ y: 2, m: 7, d: 1 })) problems.push('C2_CUT_DAY drifted from Jul 1, Y2 (C3\u2019s window start)');
  // the cut: the latch entry is dated the cut's morning
  const cut = c2CutEntry();
  if (cut.date.y !== 2 || cut.date.m !== 7 || cut.date.d !== 1) {
    problems.push('the cut\u2019s entry is not dated July 1, Y2');
  }
  // the R4 law: no real-world years in the prose (the doc 06 §C2 quotes
  // '94 in the apostrophe form \u2014 the scan allows no four-digit year)
  const prose = [
    ...C2_STATION_DAYS.map((d) => [C2_STATIONS[d]!.begin, C2_STATIONS[d]!.wake, C2_STATIONS[d]!.rushDone, C2_STATIONS[d]!.climbNote, C2_STATIONS[d]!.goldenNote]).flat(),
    ...C2_COMPRESSIONS.map((c) => [c.intro, c.city]).flat(),
    C2_NOTICE_ASK_NOTE, C2_MAP_NOTE, C2_COMPACT_SCENE.join(' '),
    C2_MARISOL_CARD_LINE, C2_MARISOL_AFTER_NOTE,
    C2_SESSION_ONE_NOTE, C2_SESSION_TWO_NOTE,
    C2_PRIYA_INTEL_NOTE, C2_PRIYA_FAVOR_NOTE,
    C2_CRAIG_OFFER_NOTE, C2_EDDIE_RENEWAL_NOTE, C2_EDDIE_RENEWAL_AFTER,
    C2_KEV_APPEAL_NOTE, C2_RENT_WAVE_NOTE,
    C2_OKTAYS_SCENE.join(' '), C2_OKTAYS_MEHMET_NOTE,
    C2_TOAST_ROSA_INK, C2_TOAST_FUTURE_INK, C2_TOAST_ROSA_NOTE, C2_TOAST_FUTURE_NOTE,
    C2_CUT_STAGE, C2_CUT_WALL,
    ...Object.values(N2_DIARY), ...Object.values(N2B_DIARY),
  ].join(' ');
  for (const match of prose.matchAll(/\b(1[89]\d\d|20\d\d)\b/g)) {
    problems.push(`a real-world year leaked into the prose: ${match[0]}`);
  }
  return { ok: problems.length === 0, problems };
}

/** Eddie's renewal question, isolated for the verbatim pin (the note
 *  carries the full staged sentence; the QUESTION is the canon line). */
function C2_EDDIE_RENEWAL_LINE_CHECK(): string {
  const m = C2_EDDIE_RENEWAL_NOTE.match(/\u201C(.+?)\u201D/);
  return m?.[1] ?? '';
}
