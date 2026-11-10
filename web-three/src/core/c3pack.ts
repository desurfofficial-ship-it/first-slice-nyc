/**
 * The C3 content pack — narrative/14 §7 step 10's first wave (doc 06 §C3
 * against the machine the C2 wave fed): **The Bridge**, Jul 1 – Dec 20, Y2.
 *
 * What this module is: the chapter's authored layer — the station days
 * the player lives (July opens, the Fourth's busiest day, Eddie's heart
 * attack, the keys from the hospital bed, El Vann's paper wall, the
 * Slice Summit, Halcyon's opening night, Deshaun's exam, the Club's
 * founding pitch, Ada's zero-questions envelope, Camille's pantry, the
 * sound of the Doris fight, Tito's senate, the Club's closing ask,
 * Gino's first lunch, Marisol's offer, the season's books), the
 * compressions that consume the calendar between them (R4's named
 * transition — the garden's water-fix week, the pergola, the earmark and
 * the city's own fall riding the days between), the C3→C4 season cut
 * (doc 06 §C3 handoff — New Year's at the shop, the offer letter waiting
 * with Eddie's pen), the register's three C3 nodes (N3a the offer,
 * N3b the investor list, N3c Gino's lunch — core/choiceNodes.ts, fired
 * through the machine the step-7 wave built), and the chapter's
 * Lost-Year fragment (F2 The glass — doc 02 §6.2's register, fired as
 * RECALL ink at the visiting room's afterglow, never as a scene).
 *
 * The chapter's ledger law: C3 strikes NOTHING (doc 15's schedule keeps
 * K2/K3/K5/K7 for later chapters) — but C3 writes the ledger's first
 * SECRET favor (Gino's, kind 'choice', visibility 'secret' — the C2
 * Priya-favor precedent) and hosts the game's first entry that REFUSES
 * to be written (N3c's not-tell: the Silent class — the divergence is
 * the missing entry itself, doc 10 §1).
 *
 * The station law — restated from the C1/C2 packs: **story day = sim day
 * = calendar day, and the compressions move all three together** (the
 * 1:1 epoch law holds by construction). The days between stations are
 * CONSUMED, not played. The chapter is sparse the way a season is lived.
 *
 * The canon law (the c0/c1/c2pack precedent, restated): doc 06 and doc
 * 07's quoted lines are quoted VERBATIM (Eddie's keys line, El Vann's
 * documents line, June's voice line, Doris's door warning, Gino's good
 * boy line, the blog's title, Marisol's kitchen phrase, the senate's
 * title, Marisol's card line, the Craig's-paper QUESTION); where the
 * doc names a beat's content but not its prose, the prose is written
 * here in doc 13 §3's C3 voice (Stage III: "I'm the bridge. Bridges get
 * tolls." — the voice starts sounding like a man running for something,
 * third-person self-narration peaks) and cited as written-to-spec.
 * Nothing canonical is paraphrased into fake quotes. Recontextualizations
 * are noted at their triggers (doc 11's header law).
 *
 * What this module is NOT: no DOM, no UI, no scene, no dice, no clock
 * reads — the content seam's own law. Pure data + pure functions; the
 * Game layer applies; tests pin; `validateC3Pack` checks the pack
 * against its machines before a save can carry any drift.
 */

import { calendarDayOf, crossedSeasonCut, dateOfCalendarDay, type GameDate } from './calendar';
import type { FieldDiaryEntry } from './fieldDiary';
import type { LedgerEntry } from './consequenceLedger';
import { FRAGMENTS } from './guardrails';
import { nodeById, resolveChoice } from './choiceNodes';
import type { WeekOrder } from './c0pack';

// ===========================================================================
// 1. The chapter's spine — the station map (doc 06 §C3's events → days)
// ===========================================================================

/** C3's first playable morning: Wednesday, Jul 1, Year 2 — July opens
 *  (doc 06 §C3's period start; the machine's own window start). Derived
 *  from the calendar module — no hand arithmetic anywhere near the
 *  spine (the rails' own law). */
export const C3_FIRST_DAY = calendarDayOf({ y: 2, m: 7, d: 1 });

/** C3's last playable day: Dec 20, Year 2 (doc 06 §C3's period end). The
 *  linger here plays the C3→C4 season cut; the season cut consumes Dec
 *  20 → Jan 6 and the chapter rides advanceChapter's own door at C4's
 *  window start. */
export const C3_LAST_DAY = calendarDayOf({ y: 2, m: 12, d: 20 });

/** The cut's morning: Jan 6, Year 3 — C4's window start (the machine's
 *  own door; the holidays stay C3's per the window law). */
export const C3_CUT_DAY = calendarDayOf({ y: 3, m: 1, d: 6 });

/** The Juniper Club's canonical raise (doc 06 §C3 event 5; doc 09 §4:
 *  "$61,500 from 19 investors"). The amends economy's coin. */
export const C3_CLUB_TOTAL = 61500;

/** The raise's investors (doc 09 §4's nineteen faces). */
export const C3_CLUB_INVESTORS = 19;

/** Ada's envelope (doc 06 §C3 event 5: "the mother's $8,000 arrives Oct
 *  3"; doc 09 §4 row 2). */
export const C3_ADA_ENVELOPE = 8000;

/** The garden's water-fix week (doc 10 §4's specimen window: "C3,
 *  eleven days"). The beds' south row rides the miss. */
export const C3_WATER_FIX_DAYS = 11;

/** One playable station of C3's season. The fields are the stabilized
 *  loop's own mouths (begin/wake/queue/rushDone/climb/golden), keyed by
 *  calendar day — the WK_* steps are the loop; the station is the day's
 *  voice. Same shape as the C1/C2 packs' stations (the loop reads all
 *  three); `storm` stays in the shape for the loop's dark-night law —
 *  C3 has no storm days, and the field stays false by omission. */
export interface C3Station {
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

// ------------------------------------------------------------- day 296 ----

const DAY296_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CJuly. The block is about to learn what your calendar looks like when the shop is full and the garden is dry.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, fanning with a menu: \u201CHoliday weekend. Eddie ordered extra flour by the PALLET. That man prep-schedules joy.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar, squinting at the Works fence: \u201CThey measured the parking lot again. Twice this month. You measure a thing when you\u2019re counting on it.\u201D',
  },
];

const DAY296: C3Station = {
  day: 296,
  title: 'July Opens',
  begin: 'Day 296. July, and the corner smells like a bakery working ahead of itself. Facts only: the busiest week of the shop\u2019s year starts now, I hold the cart and the counter\u2019s rhythm both, and the block has begun routing its problems through me. I\u2019m the bridge. Bridges get tolls \u2014 somebody wrote that somewhere, and July is going to invoice it.',
  wake: 'Rosa: \u201CHoliday week. The cart feeds the line for the shop, the shop feeds the block, and you feed everything. Eat something yourself, coffee. That\u2019s an order.\u201D',
  queue: DAY296_QUEUE,
  rushDone: 'Three orders and a week that already weighs more than it did. The oven\u2019s warm. So is everything else.',
  climbNote: 'Upstairs, the notebook opens to a fresh half-year and writes one line: BUSIEST WEEK. Under it, smaller: don\u2019t count what you\u2019d spend. The pen knows me better than I let it.',
  goldenNote: 'Four windows, the Fourth\u2019s supplies staged like a stage crew. Eddie flips the CLOSED sign early and starts tomorrow\u2019s dough tonight. The man rehearsal-schedules joy.',
};

// ------------------------------------------------------------- day 299 ----

const DAY299_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe line\u2019s past the barber pole. Tell Eddie the block sees him. Fourth of July is his New Year\u2019s \u2014 ask him sometime.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular, waving a sparkler sparkler-less: \u201CSlice line AND coffee line. You two are the block\u2019s other fireworks.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, quieter than the day deserves: \u201CEddie sat down mid-rush. Just for a second. The ovens don\u2019t notice things like that. People should.\u201D',
  },
];

const DAY299: C3Station = {
  day: 299,
  title: 'The Busiest Day',
  begin: 'Day 299. The Fourth, Saturday, and the shop is the engine of the whole block today. Facts only: the line, the heat, the pallets of flour becoming pies, and Eddie\u2019s hand flat on the counter between rushes. It\u2019s nothing. It\u2019s the busiest day of the year. Hands do that.',
  wake: 'Rosa: \u201CToday the corner runs on you two. I\u2019ve got the window, you\u2019ve got the cart, Eddie\u2019s got his ovens. Don\u2019t let him skip lunch \u2014 I\u2019ll know.\u201D',
  queue: DAY299_QUEUE,
  rushDone: 'Three orders between shop rushes. The block ate well today. The block always eats well on the Fourth \u2014 that\u2019s Eddie\u2019s holiday, and everybody knows it but him.',
  climbNote: 'The notebook keeps today\u2019s numbers: pies, slices, the line\u2019s length in bodies. It does not keep the hand on the counter. Not yet. The pen and I are both pretending we didn\u2019t see it.',
  goldenNote: 'Fireworks somewhere past the far towers; the corner\u2019s own light is the oven\u2019s, still going at nine. Eddie waves me off home like a foreman. July, and the shop\u2019s busiest day is spent.',
};

// ------------------------------------------------------------- day 301 ----

const DAY301_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris, taking the cup without his usual inspection: \u201CThe hospital\u2019s on my bus route. I\u2019ll ride it at noon. Tell nobody \u2014 a man\u2019s business is his own schedule.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar, not folding anything today: \u201CSaw the ambulance from the roof. Didn\u2019t come down till it left. Didn\u2019t want to be one more face counting yours.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular, leaving exact change and a bakery box they didn\u2019t need: \u201CTook this off Eddie\u2019s shelf by mistake last week. It should be at a hospital somewhere. You know which room.\u201D',
  },
];

const DAY301: C3Station = {
  day: 301,
  title: 'Not Moving',
  begin: 'Day 301. Monday after the Fourth, and the shop\u2019s ovens are cold for the first morning anybody can remember. Facts only: Eddie\u2019s heart, caught early, the word lucky used like a diagnosis, and the counter running on Leo from today. The block keeps drinking its coffee. The block is being brave at me. I\u2019m the bridge \u2014 I just didn\u2019t know the river was this wide.',
  wake: 'Rosa: \u201CThe shop opens at seven because Eddie opens at seven. That\u2019s the whole recipe. You\u2019re not becoming Eddie \u2014 you\u2019re keeping his hours until he can. Go.\u201D',
  queue: DAY301_QUEUE,
  rushDone: 'Three orders, all of them careful around the subject the way you step around a wet floor. The counter held. The counter is mine now, apparently, for as long as it takes.',
  climbNote: 'Upstairs, the notebook writes its first hospital entry: ROOM NUMBER, VISITING HOURS 10\u20136, HE CAUGHT IT EARLY. Facts only. The margin says nothing. The margin is doing the work of a whole paragraph by staying empty.',
  goldenNote: 'Rosa\u2019s window stays lit late, the way porches do when somebody\u2019s sitting up with a phone. The shop\u2019s lights are off. Tomorrow they\u2019re mine to switch on.',
};

// ------------------------------------------------------------- day 309 ----

/** Doc 06 §C3 event 1 — the keys, from the hospital bed (the
 *  important conversation: trust as burden transfer). Verbatim. */
export const C3_EDDIE_KEYS_LINE =
  'Don\u2019t lose them. Not the shop. Them.';

const DAY309_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CI rode the route at noon like I said. He asked about the sourdough starter. The MAN asked about the STARTER. He\u2019s fine. He\u2019s exactly himself, which is the best report a hospital gives.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CHe gave you the keys already? That\u2019s not a job, that\u2019s a bar mitzvah. Big Mike\u2019s making something with gravy to celebrate and won\u2019t say what.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CKeys weigh nothing. Ask any landlord\u2019s kid. Ask Craig. Keys weigh NOTHING and everything, same time.\u201D',
  },
];

const DAY309: C3Station = {
  day: 309,
  title: 'The Keys',
  begin: 'Day 309. Tuesday, and my pocket weighs different. Facts only: visiting hours 10\u20136, the shop opens at seven under my hand, and Eddie gave me the keys from the bed \u2014 the shop, the back door, the safe. Trust as burden transfer. The doc would write that. Eddie just wrote it in brass.',
  wake: 'Rosa: \u201CYou\u2019ve got the ten o\u2019clock. I\u2019ll mind the cart till noon. Take the LONG way back \u2014 visiting rooms keep your shape longer than you\u2019d think.\u201D',
  queue: DAY309_QUEUE,
  rushDone: 'Three orders and the corner treating me exactly the same, which is either mercy or irony and today I\u2019m not asking which. The shop ran. The starter lived. The keys stayed in my pocket where they weigh everything.',
  climbNote: 'The notebook writes: THE KEYS. Under it, the doc\u2019s own grammar, facts only \u2014 and then one sentence of feeling, the most I\u2019ve written all year, and I\u2019m not copying it here even for myself. It\u2019s in the book. The book knows.',
  goldenNote: 'The fire escape, the shop\u2019s window at eye level, my palm flat on the glass the way his was on the counter. Hours later, still shaped. July does that. Windows do that. Write it down before it stops being true.',
};

// ------------------------------------------------------------- day 328 ----

/** Doc 06 §C3 event 2 — El Vann's paper wall (the East Tenement's
 *  community room; the borrowing that becomes the first look). Her line
 *  verbatim. */
export const C3_ELVANN_LINE =
  'Developments fail, dear. Documents don\u2019t. They wait.';

const DAY328_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CYou went to see Eleanor Vann. People come out of that apartment either lighter or heavier. Which is it?\u201D \u2014 I said both. He nodded like that was the correct answer, because it was.',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular: \u201CShe let you SEE the wall? I\u2019ve lived here nine years. I\u2019ve seen the HALLWAY.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, lowering their voice for no reason: \u201CSomebody said the bylaws are in there. The LAND TRUST bylaws. From when? From WHEN?\u201D',
  },
];

const DAY328: C3Station = {
  day: 328,
  title: 'The Paper Wall',
  begin: 'Day 328. August already, and I\u2019ve seen the wall. Facts only: the Compact file, Hartwell\u2019s option, the CLT bylaws \u2014 the block\u2019s paper history, waiting. El Vann lends the community room like she\u2019s lending a chessboard she already knows the ending of. The shop\u2019s running. Eddie\u2019s rehab is real and slow. The keys are on my belt where the public can see them and the weight can\u2019t.',
  wake: 'Rosa: \u201CEleanor gave you the room? That woman has said no to mayors. Whatever she saw in you, don\u2019t make her wrong.\u201D',
  queue: DAY328_QUEUE,
  rushDone: 'Three orders, all of them about the wall, none of them about the shop \u2014 which is fine. The shop is the easy part this week. The wall is the part where I learned the block has been here before.',
  climbNote: 'The notebook sketches the East Tenement\u2019s hallway from memory and lists the wall\u2019s three named stacks. Not what\u2019s in them \u2014 that they\u2019re NAMED. Documents don\u2019t fail. They wait. Underline the verb twice.',
  goldenNote: 'Four windows, and somewhere in one of them fifty years of paper sleeps in stacks. Developments fail. The light tonight is the same light that\u2019s been failing to lose this block for a century.',
};

// ------------------------------------------------------------- day 349 ----

/** Doc 06 §C3 event 3 — the Slice Summit (Aug 23, the shop after
 *  hours): merchants, Corvus, and the board; the "Alder Accord" talking
 *  points; Wexler's first meeting; and the blog photo that names him. */
export const C3_SUMMIT_NOTE =
  'After hours, Corner Slice hosts the thing the papers will want a name for: merchants, Corvus, and the board in one room, my talking points on the register\u2019s lid \u2014 the Alder Accord, eleven protections, a renewal path, the water fix. Dane Wexler remembers my name, my cart\u2019s name, and the kid\u2019s birthday unprompted, which is his whole method in one sentence: never lies; selects. By eleven the local blog has the photo up \u2014 me mid-pitch, the room lit like a hearing \u2014 titled The Man Who Feeds Alder Heights. I laughed. Then I read it twice more. Titles are tolls too.';

export const C3_WEXLER_CARD_LINE =
  'Wexler. Corvus\u2019s expediter \u2014 the word means what a permit means: process until it\u2019s cheaper to buy. Remembers everyone\u2019s children\u2019s names. Never lies; selects. Professional respect, zero sentiment. He handles me the way you handle paperwork, and paperwork always gets processed.';

const DAY349_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe blog photo. You look like a man who\u2019s about to be asked hard questions at good lighting. Eat before meetings. It\u2019s the oldest rule in delegation.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, showing the phone: \u201CThe Man Who Feeds Alder Heights. Two hundred comments and every single one thinks they know you.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CAccord. I like it. Treaties have exits written in. Ask the man from Corvus what HIS exit looks like \u2014 watch him select his words.\u201D',
  },
];

const DAY349: C3Station = {
  day: 349,
  title: 'The Slice Summit',
  begin: 'Day 349. The shop hosts the Summit tonight \u2014 merchants, Corvus, the board, my talking points on the register\u2019s lid. Facts only: the Accord\u2019s eleven protections, Wexler\u2019s first meeting, and whatever the blog calls me by midnight. The shop\u2019s my room now. That\u2019s the part I keep not saying out loud: the shop is my room.',
  wake: 'Rosa: \u201CTonight you convene. I\u2019ll send pies \u2014 a hungry room is an honest room. And coffee: they\u2019re YOUR regulars now, all of them, whether they know it or not.\u201D',
  queue: DAY349_QUEUE,
  rushDone: 'Three orders and the evening\u2019s seating chart already in my head. The Accord is eleven sentences that took three weeks. The room will decide in ninety minutes what kind of paper it is.',
  climbNote: 'The notebook drafts the Accord\u2019s talking points in third person \u2014 \u201Cthe operator of the corner proposes\u201D \u2014 and stops, because that\u2019s not my voice, that\u2019s the voice of a man running for something. Doc would say third person peaks. I\u2019d say the third person showed up and started helping.',
  goldenNote: 'Four windows, and the shop\u2019s are lit after hours on purpose tonight. A room full of people who all need something, and me at the counter where the counter lives. Bridges get tolls. Feed them anyway.',
};

// ------------------------------------------------------------- day 369 ----

/** Doc 06 §C3 event 8 + doc 07 §2.x — June's Halcyon opens (September):
 *  the opening night, the romance deepens, the loan strain; her line
 *  verbatim (she catches him mid-performance and names it kindly). */
export const C3_JUNE_VOICE_LINE =
  'You do a voice when you\u2019re scared. It\u2019s a good voice. It\u2019s not yours.';

const DAY369_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CHalcyon. In my language the word means a season of good weather, and it implies you earned the season. Tell her the block expects both.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular, still carrying open-night napkins: \u201CShe asked ME for feedback. The owner asked me. I said the chairs are honest. She wrote it down.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CTwo businesses on this block run on your opinion now. Careful. Opinions are the one thing the Compact never traded.\u201D',
  },
];

const DAY369: C3Station = {
  day: 369,
  title: 'Halcyon Opens',
  begin: 'Day 369. September, and the café shell has lights and a name. Facts only: Halcyon opens tonight, June\u2019s build-out loan is real, and I\u2019m the block\u2019s other small-business story this week. The Club\u2019s first pitch went out on Tuesday \u2014 decks honest, risk pages thin. Two things growing at once. Bridges don\u2019t sway, they just get counted on.',
  wake: 'Rosa: \u201COpening night. Bring the good cups \u2014 the ones we save. June\u2019s building something and the block should show up the way it shows up for you: full.\u201D',
  queue: DAY369_QUEUE,
  rushDone: 'Three orders and a borrowed good-cups situation resolved without incident. Tonight the corner\u2019s center of gravity moves one storefront east, temporarily. June earned it. The room knows.',
  climbNote: 'The notebook writes June\u2019s numbers next to the Club\u2019s \u2014 build-out, loan, raise, tier \u2014 and catches itself organizing OTHER people\u2019s ledgers in the margins of mine. Useful became broker somewhere in August and nobody held a door.',
  goldenNote: 'Halcyon\u2019s window is the brightest thing on the block tonight and it\u2019s hers, not mine, and that\u2019s the best thing September\u2019s done all year.',
};

// ------------------------------------------------------------- day 376 ----

/** Doc 06 §C3 important characters + doc 12 §2's fixed event —
 *  Deshaun's exam fail (September): his own chapter. */
export const C3_DESHAUN_NOTE =
  'Deshaun\u2019s exam results come on a Thursday and the word is no. The paramedic board doesn\u2019t curve and the board doesn\u2019t call. He tells me at the court, mid-layup, gallows-flat: \u201CSix weeks of study group and the man failed me on AIRWAY. You know what I do all day? I CARRY AIR.\u201D He shoots again. \u201CSam says the union has a retake path. Sam\u2019s being kind, which Sam is.\u201D I say the thing about next time and he waves it off \u2014 the block\u2019s youngest man teaching me how the block takes a hit: out loud, at the rim, before dinner. His own chapter, the doc said. It doesn\u2019t need mine.';

const DAY376_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe boy failed nothing that matters. The exam measured airway technique. He has the other thing already \u2014 the thing you can\u2019t study. The retake is paperwork.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CHalf this block got told no by somebody with a form once. The trick is telling the form no BACK, eventually, in writing.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular: \u201CDarnell\u2019s scoring his games all month so Deshaun can study. Kids covering kids. Somebody should put THAT on a blog.\u201D',
  },
];

const DAY376: C3Station = {
  day: 376,
  title: 'The Exam',
  begin: 'Day 376. September\u2019s third Saturday, and the court\u2019s louder than usual \u2014 Deshaun\u2019s taking his miss out of himself at the rim where he keeps everything. Facts only: the exam, the fail, the retake path, and a kid who carries air for a living being told he failed air. The Club\u2019s money is at $30,000 and climbing. The block\u2019s other news is better and worse and both are true.',
  wake: 'Rosa: \u201CDeshaun\u2019s fail is his own business and the block\u2019s. Feed the court today \u2014 nobody studies on an empty stomach, and nobody grieves one either.\u201D',
  queue: DAY376_QUEUE,
  rushDone: 'Three orders and the court\u2019s been fed all morning. The kid misses on the exam and nothing else \u2014 that\u2019s the block\u2019s verdict, delivered in layups.',
  climbNote: 'The notebook writes one line about Deshaun and draws a line under it \u2014 his chapter, his margins. Then the Club\u2019s ledger: thirty thousand, nine faces said yes, ten to go. The pages are getting heavy in different ways.',
  goldenNote: 'The court at dusk, the rim\u2019s chain still swaying. Somewhere a study guide is open to AIRWAY. Six weeks of somebody\u2019s best. The city files it under September and moves on. I write it down instead.',
};

// ------------------------------------------------------------- day 383 ----

const DAY383_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CI gave six hundred to the Club. Not because of the deck. Because you stood in front of the room and let the thin pages STAY thin. That\u2019s rarer than money.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CRisk pages thin. My accountant cousin would faint. My ACCOUNTANT cousin also lost money being careful. Feed the thin pages, they\u2019re honest.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar, watching the garden: \u201CSame folding chairs as the Compact\u2019s meeting. Same clipboard energy. I\u2019m not saying it\u2019s the same thing. I\u2019m saying the chairs remember.\u201D',
  },
];

const DAY383: C3Station = {
  day: 383,
  title: 'The Club',
  begin: 'Day 383. Late September, and the Club exists. Facts only: nineteen candidates, eleven yeses, thirty thousand raised, the risk pages honest-thin. The garden hosted it the way the garden hosts everything \u2014 like the block\u2019s front room. Somebody in the back row didn\u2019t clap. I know exactly who and I know exactly why and the notebook is going to make me look at that later.',
  wake: 'Rosa: \u201CThe Club. Good. Money from neighbors is heavier than money from banks \u2014 it comes with eyes. Keep the pages thin on PURPOSE from now on. Honesty\u2019s a strategy once you\u2019ve used it once.\u201D',
  queue: DAY383_QUEUE,
  rushDone: 'Three orders, and two of them already investors, which makes the coffee change taste like shareholder coffee. $30,000. Nineteen candidates. One raise. The arithmetic is mine now.',
  climbNote: 'The notebook lists the yeses by name \u2014 faces, not slots \u2014 and the list looks like the block\u2019s own map of who trusts me. That\u2019s what a raise is, apparently. A map that can hurt people.',
  goldenNote: 'The garden\u2019s folding chairs stacked for the night. Thirty thousand dollars in envelopes and promises across nineteen kitchen tables. The render on the clothesline catches the last light. Somebody\u2019s render. Somebody\u2019s block.',
};

// ------------------------------------------------------------- day 390 ----

const DAY390_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CYou took a call standing on the bench this morning. In my country we\u2019d say the mother\u2019s money arrives before the mother\u2019s advice, and both are heavy. Feed the Club well.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CRaise\u2019s at thirty-eight. Big Mike\u2019s in for five and keeps saying the cookbook chapter comes with it. The man INVESTS IN CHAPTERS.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CEnvelope day, huh. You\u2019ve got mail-carrier posture. Somebody\u2019s mother carries the same envelope you do. The block knows. The block doesn\u2019t ask. That\u2019s the rule.\u201D',
  },
];

const DAY390: C3Station = {
  day: 390,
  title: 'Zero Questions',
  begin: 'Day 390. October opens with an envelope. Facts only: eight thousand dollars, my mother\u2019s handwriting, zero questions. The Club\u2019s at $38,000. Thirteen faces said yes. Six to go. The shop\u2019s under my hand five weeks now and the ovens have learned my name. Everything\u2019s fine. Write the facts. Don\u2019t count what you\u2019d spend.',
  wake: 'Rosa: \u201CYou\u2019ve got mail-carrier posture and the good envelope face. The cart\u2019s stocked. Whatever the call didn\u2019t ask \u2014 I\u2019m not asking either. That\u2019s the rule and I follow the good rules.\u201D',
  queue: DAY390_QUEUE,
  rushDone: 'Three orders and nobody asked. The block\u2019s rule holds: mothers\u2019 envelopes are seen, not discussed. The raise climbs. The pocket weighs eight thousand more than it did in July and exactly as heavy.',
  climbNote: 'The notebook writes: ADA. $8,000. ZERO QUESTIONS. Then, smaller, the thing the doc\u2019s ledger will price someday: the money that asks nothing is the money you can\u2019t refuse and can\u2019t repay and can\u2019t hide from. Underline NOTHING. The pen is running for something too.',
  goldenNote: 'The envelope\u2019s in the safe now, with the shop\u2019s papers, under the keys\u2019 hook. Four windows and the block\u2019s lights coming on one by one. Somewhere across the borough a mother hangs up a phone without asking anything.',
};

// ------------------------------------------------------------- day 404 ----

export const C3_CAMILLE_CARD_LINE =
  'Camille. P.S. 218, room whatever-number; the pantry\u2019s Tuesday made specific. Counts cans like the court counts catches. Asked nothing, offered a Tuesday. The alternative life wears a cardigan and keeps a list, and the list is longer than my render\u2019s lobby.';

const DAY404_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CTeacher Odom\u2019s drive filled the library\u2019s whole back wall. The school\u2019s principal sent a note. Notes. This block runs on notes as much as money lately.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular, carrying a box of rice they\u2019ve clearly rebought twice: \u201CGave at the pantry. Also gave at the Club. The wallet\u2019s voting in two elections. Both feel right. That\u2019s new.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CThe teacher told me the drive\u2019s Tuesday is about REPEATS. Same day, same table. That\u2019s the whole philosophy. Repeats. Your Club could learn from a cardigan.\u201D',
  },
];

const DAY404: C3Station = {
  day: 404,
  title: 'The Pantry',
  begin: 'Day 404. Mid-October, gold light on the garden\u2019s south table, and the pantry drive is the block\u2019s best-run operation \u2014 no render, no raise, just a Tuesday that repeats. Facts only: Camille\u2019s drive, the Club at $49,000 with sixteen faces, and the coulds living in my margins again. The dry week\u2019s arithmetic sits in the beds behind us \u2014 the garden keeps its own books, and Yoli keeps hers where nobody reads them.',
  wake: 'Rosa: \u201CTuesday\u2019s table is at the garden again. The teacher runs a tight ship \u2014 send the hot urn. Cold charity is just weather. Hot charity\u2019s a block.\u201D',
  queue: DAY404_QUEUE,
  rushDone: 'Three orders and the garden\u2019s table fed twice over. The alternative life is real, running, and needs nothing from me. That\u2019s the part that stares. Everything I\u2019m building needs me constantly. Everything she\u2019s building runs on Tuesdays.',
  climbNote: 'The notebook writes Camille\u2019s card in the PERSON pages and the word COULD in the margin, and then, honest, under it: the margin is where the other lives go. Bridges don\u2019t get margins. Bridges get more bridge.',
  goldenNote: 'The pantry\u2019s boxes stacked like a small city\u2019s skyline, someone\u2019s careful cardboard architecture. Four windows, the garden\u2019s beds dark and watered. Two lives on one block tonight. The notebook holds both, barely.',
};

// ------------------------------------------------------------- day 414 ----

/** Doc 06 §C3 event 7 + doc 07 §2.x — Doris, out of the hospital, finds
 *  Craig's version of the books. The fight is off-screen; its sound is
 *  on-screen (a door, a porch, silence). Her door warning verbatim —
 *  the chapter's one mercy (doc 08 §9.5). The chapter's QUESTION. */
export const C3_DORIS_WARNING_LINE =
  'You\u2019re a good boy the way Craig\u2019s a good boy. Watch it.';

export const C3_Q_CRAIG = 'What is Craig\u2019s paper?';

const DAY414_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CI heard the door. Doors carry further in October. The old woman will manage the boy \u2014 she\u2019s managed worse. You watch YOUR margins. Her warning was addressed to the whole street.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CThe landlady\u2019s out and about. Saw her at the pharmacy reading labels like leases. Sharp as ever. SharpER, maybe. Hospital sharpened her.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CSilence with a shape. That\u2019s exactly what it was last night. You could hear the HOUSE deciding things.\u201D',
  },
];

const DAY414: C3Station = {
  day: 414,
  title: 'The Sound',
  begin: 'Day 414. The fight\u2019s sound is still in the fences this morning \u2014 a door, a porch, silence with a shape. Facts only: Doris is out, sharp, and found Craig\u2019s books; the warning she left at the door has my name in it; and the Club\u2019s at $54,000 with eighteen faces. One face left. The notebook wrote a QUESTION last night that I\u2019d rather it hadn\u2019t.',
  wake: 'Rosa: \u201CDoris came by at six for her usual and paid for two \u2014 one for the porch. That\u2019s all I\u2019ll say, and I\u2019ve already said too much. Feed the street. Streets heal out loud.\u201D',
  queue: DAY414_QUEUE,
  rushDone: 'Three orders, all of them spoken quietly, the whole block keeping the fight\u2019s volume like a debt. The shop\u2019s glass is clean. My margins are written. The QUESTION sits in the tray where questions sit, being true.',
  climbNote: 'The notebook reads back last night\u2019s QUESTION \u2014 What is Craig\u2019s paper? \u2014 and adds the only fact I have: the SaniHaul trucks come at six a.m. and are legal. The rest is GUESS, and it\u2019s tagged GUESS, and the tag is the only clean thing about the page.',
  goldenNote: 'The porch across the street, empty, the door shut with the softness of a decision already made. Doris\u2019s window goes dark at eight like always. Watch it, she said. I\u2019m watching. The trouble with watching is you see.',
};

// ------------------------------------------------------------- day 420 ----

const DAY420_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CThe table seated you. That\u2019s citizenship, not a compliment. Tito\u2019s question has one honest answer and it isn\u2019t words \u2014 it\u2019s what the tiles hear by December.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CTito said whose block is the render ON. Not IN. On. Like a lid. The man\u2019s grammar is a verdict.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CYoli\u2019s legal pad made it to the park. When the pad shows up at the TABLE, that\u2019s not a note, that\u2019s a filing. The Compact\u2019s meetings had a pad too. Just saying the history out loud.\u201D',
  },
];

const DAY420: C3Station = {
  day: 420,
  title: 'The Senate',
  begin: 'Day 420. November\u2019s first Sunday, and the dominoes table has adopted me the way it adopts weather \u2014 permanently, with conditions. Facts only: the senate\u2019s agenda is the render and I\u2019m carrying it; Yoli\u2019s observation made the wire without asking; the Club\u2019s last face is pending and the closing pitch is Thursday. The raise is $54,000 of $61,500. The tiles know. Tiles always know.',
  wake: 'Rosa: \u201CThe table adopted you. Tito\u2019s senate is the block\u2019s supreme court \u2014 no appeals, no written decisions, all verdicts final. Bring the urn by the park at noon. Senates run on coffee and precedents.\u201D',
  queue: DAY420_QUEUE,
  rushDone: 'Three orders, two of them at prices the block held a half-second longer than usual. The senate\u2019s verdict is already in the wave and the stool. I\u2019m being priced. Bridges get tolls \u2014 the table just set the rate.',
  climbNote: 'The notebook writes the senate\u2019s agenda as its own: WHOSE BLOCK IS THE RENDER ON. Then, honest: I know the answer the tiles expect and the answer the render\u2019s lender expects, and they\u2019re different blocks. The pen underlines nothing. Some pages file themselves.',
  goldenNote: 'The park\u2019s table in the last light, tiles stacked like small buildings. Yoli\u2019s legal pad somewhere growing a page. The Club\u2019s last envelope pending. The block priced me today, gently. Tolls, still.',
};

// ------------------------------------------------------------- day 425 ----

export const C3_N3B_PROMPT =
  'One ask left. The room is watching, the deck is honest, the risk pages are thin on purpose. Who he asks is who he can hurt \u2014 the last envelope completes the raise.';

const DAY425_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CTonight the raise closes. Whatever the last envelope says, the Club is nineteen doors deep into this block\u2019s trust. Carry it like the keys \u2014 them, not the shop.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CFifty-four of sixty-one-five. One envelope. The whole street\u2019s doing envelope math at their kitchen tables tonight, I guarantee it.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CMiss Odessa\u2019s got front row with her purse on her knees. That\u2019s not an audience, that\u2019s a decision with a handbag. Don\u2019t fumble it, coffee.\u201D',
  },
];

const DAY425: C3Station = {
  day: 425,
  title: 'The Last Envelope',
  begin: 'Day 425. The Club\u2019s closing pitch is tonight. Facts only: $54,000 of $61,500, eighteen faces said yes, one ask left, and the garden\u2019s folding chairs know a closing night when they see one. The deck is honest. The risk pages are thin on purpose. Who I ask is who I can hurt \u2014 and the room believes me, which is the heaviest thing a room can do to a bridge.',
  wake: 'Rosa: \u201CClosing pitch. The good cups again, and the good pens \u2014 the sign-in pens, the ones that write small and sure. One envelope, coffee. Make it count twice.\u201D',
  queue: DAY425_QUEUE,
  rushDone: 'Three orders and the evening\u2019s chair count already done in my head. One envelope. The room believes. The pen is in my hand either way \u2014 that\u2019s the whole note the squeeze left, and it\u2019s still true.',
  climbNote: 'The notebook writes the nineteen candidate faces in order \u2014 the block\u2019s own map of who trusts me enough to be hurt by me \u2014 and stops at the last line, because the last line is the ask, and the ask is tonight\u2019s. Facts only. The feeling can wait for the ink that survives the pick.',
  goldenNote: 'The garden at dusk, chairs out, the clothesline\u2019s render catching the last gold. Fifty-four thousand dollars across eighteen kitchen tables and one ask left. The block believes me. Feed that belief carefully.',
};

// ------------------------------------------------------------- day 432 ----

/** Doc 06 §C3 event 6 — Gino's first lunch (Nov 14, fixed date). His
 *  line verbatim; the DOB violation "looked into" and gone; the diary
 *  records "networking" and refuses the violation; the SECRET favor
 *  rides the ledger (the C2 Priya-favor precedent); behind the scene,
 *  N3c — tell Eddie or not (the Silent class). */
export const C3_GINO_LINE =
  'Your landlord\u2019s a good boy. Bad credit, but a good boy.';

export const C3_GINO_CARD_LINE =
  'Gino. Reads naval history; eats olives like punctuation. Disgustingly reasonable. Threatens nobody, ever; makes it clear problems are arrangeable. Feeds people. It is not a trick, and it is also a trick.';

export const C3_NETWORKING_BODY =
  'Networking lunch with a logistics man. Deli sandwiches. He reads naval history. Contact made, corner benefits, nothing to report.';

export const C3_VIOLATION_GONE_NOTE =
  'The wall behind Eddie\u2019s framed notice has one less paper on it \u2014 the oldest slip, the DOB violation that hung there like a ghost the whole first year, is gone. Nobody moved it. Paper doesn\u2019t move itself. The notebook knows what the wall lost even if the entry doesn\u2019t say the word.';

const DAY432_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CYou had lunch with the carting man. The trucks are legal at six a.m. Everything else about him is a question with excellent sandwiches attached.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CThat\u2019s the second Corvus-adjacent lunch this season. You\u2019re collecting men who remember everyone\u2019s children\u2019s names. Wexler. Now the olive guy.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CHear the old violation slip finally came off the wall upstairs? About time. Paper hangs on that wall like it\u2019s on trial. Somebody finally adjourned it.\u201D',
  },
];

const DAY432: C3Station = {
  day: 432,
  title: 'Networking',
  begin: 'Day 432. The deli\u2019s corner table at noon, Gino\u2019s treat. Facts only: no agenda, naval history, olives like punctuation. The entry the notebook will write says networking. The entry it won\u2019t write is the part that matters, and I\u2019m going to feel it refuse all evening. Eddie\u2019s ghost came off the wall somehow. Paper doesn\u2019t move itself.',
  wake: 'Rosa: \u201CEddie\u2019s rehab walk went past the shop today \u2014 first time since July. He didn\u2019t come in. He looked at the door a long time, then walked on. Some rooms you visit with your eyes first.\u201D',
  queue: DAY432_QUEUE,
  rushDone: 'Three orders and the wall\u2019s missing slip sitting in my head like a hole in a tooth. Networking. Write networking. The pen does what the pen is told today.',
  climbNote: 'The notebook writes the networking entry and the hand pauses exactly where the violation would go, and moves on. The pause is the entry. The pause is the whole entry. Doc 03 would call it an omission. The doc is right.',
  goldenNote: 'Four windows, and somewhere a wall has one less ghost on it. The favor is outstanding now \u2014 favors from men like Gino don\u2019t come with invoices, they come with memories of sandwiches. Feed the street. The street didn\u2019t do anything.',
};

// ------------------------------------------------------------- day 457 ----

/** Doc 06 §C3 event 4 — the offer (Dec 9, fixed date): Marisol, the
 *  render room, one page — Provisions Hall. Her phrase verbatim. The
 *  EVIDENCE entry (photographed, unsigned). Marisol's PERSON card v1.
 *  Behind the scene, N3a — the offer's three doors. */
export const C3_MARISOL_KITCHEN_PHRASE =
  'your vendors, your block, our kitchen';

export const C3_MARISOL_CARD_V1 =
  'Marisol, v1. The most dangerous person who will ever buy me lunch. The pitch is perfect because it is true \u2014 and because it makes me the project\u2019s face. She knows both facts. She ordered lunch anyway.';

const DAY457_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CYou walked past the Works fence twice this morning, once each direction. Whatever page they gave you \u2014 read it twice. Read it the second time in your mother\u2019s voice.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black: \u201CThe Club\u2019s closed at sixty-one-five. Nineteen investors. And now the fence door\u2019s open? December\u2019s moving fast for a month that\u2019s supposed to be dark.\u201D',
  },
  {
    who: 'rush',
    bubble: 'SMALL \u00B7 2 SUGARS',
    pay: 3,
    reaction: 'The two-sugar: \u201CSaw the coffee man from Corvus at the fence. She had the PAGE with her. You could see the render through the paper. The future does that \u2014 shows through.\u201D',
  },
];

const DAY457: C3Station = {
  day: 457,
  title: 'The Offer',
  begin: 'Day 457. December 9, and the fence door is open. Facts only: one page, Provisions Hall, the pitch perfect because it is true, the letter photographed unsigned in my jacket. The Club closed at $61,500 \u2014 nineteen investors, nineteen debts, one green notebook. Everything has a price and everything is for sale at once, and the page in my pocket is the first price with MY name on the seller\u2019s line.',
  wake: 'Rosa: \u201CThe Club\u2019s closed. Sixty-one five, nineteen doors. Whatever else December brings \u2014 and it\u2019s bringing something, I can smell December bringing \u2014 the block\u2019s money is the block\u2019s. Remember whose hands it came from.\u201D',
  queue: DAY457_QUEUE,
  rushDone: 'Three orders and the page riding my jacket pocket like a second set of keys. The render room travels. The offer waits. December 9 did what December 9 does.',
  climbNote: 'The notebook writes the offer\u2019s numbers \u2014 the hall, the title, the kitchen \u2014 and the photograph\u2019s EVIDENCE tag, and then one margin line: the pitch is true. That\u2019s what makes it a pitch. Underline nothing. The page is unsigned. So is the notebook\u2019s verdict.',
  goldenNote: 'The Works fence at dusk, the door propped with somebody\u2019s coffee can, the render\u2019s lobby glowing in the model\u2019s window. The real sun sets when it sets. The render\u2019s sun is a choice somebody made. Write that down too.',
};

// ------------------------------------------------------------- day 468 ----

const DAY468_QUEUE: readonly WeekOrder[] = [
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CLast card of the season. In my country the ledger closes with a page of debts and a page of gifts, and the trick is knowing which page you\u2019re reading. Write carefully, coffee.\u201D',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 OAT',
    pay: 4,
    reaction: 'The oat regular: \u201CSnow\u2019s coming. First of the winter. The beds are tucked, the pantry\u2019s stacked, the Club\u2019s closed. The block did good this year. So did you. That\u2019s two different sentences and I mean both.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, breath fogging: \u201CNew Year\u2019s at the shop, the letter\u2019s still waiting. You can feel January from here. It\u2019s got a pen in it.\u201D',
  },
];

const DAY468: C3Station = {
  day: 468,
  title: 'The Bridge\u2019s Books',
  begin: 'Day 468. December 20, the season\u2019s last morning. Facts only: the shop lived, the keys are mine until they\u2019re his, the Club is closed at $61,500, the offer is unsigned, and the favor is outstanding. The bridge held the season \u2014 every station of it, the Fourth and the hospital and the wall and the senate. What the bridge cost isn\u2019t itemized yet. It\u2019s itemized elsewhere. \u201CElsewhere\u201D is getting crowded.',
  wake: 'Rosa: \u201CLast cart-day of the season. The corner\u2019s yours and you\u2019re the corner\u2019s, and both of those are different sentences. Snow tonight, they say. Feed them warm, coffee. The year closes warm or it doesn\u2019t.\u201D',
  queue: DAY468_QUEUE,
  rushDone: 'Three orders and the season\u2019s arithmetic balancing the way seasons do \u2014 not even, but kept. The shop lived. The block held. The books close on a counter that knows more than it says.',
  climbNote: 'The notebook closes the season\u2019s page: NINETEEN DEBTS. ONE SIGNATURE PENDING. A FIXER\u2019S FAVOR OUTSTANDING. Then, at the very bottom, the sentence the whole year was leading to, written small: the offer letter is signed on the 14th with Eddie\u2019s pen. Not a prediction. A dread with a date.',
  goldenNote: 'First snow on the far towers tonight, the shop\u2019s windows gold against it. Eddie\u2019s pen is in January. The offer is in my jacket. The block is in the ledger\u2019s owed column wearing faces. Bridges get tolls. Happy New Year.',
};

// ===========================================================================
// 2. The station map + captions (the loop's data side)
// ===========================================================================

export const C3_STATIONS: Readonly<Record<number, C3Station>> = Object.freeze({
  296: DAY296,
  299: DAY299,
  301: DAY301,
  309: DAY309,
  328: DAY328,
  349: DAY349,
  369: DAY369,
  376: DAY376,
  383: DAY383,
  390: DAY390,
  404: DAY404,
  414: DAY414,
  420: DAY420,
  425: DAY425,
  432: DAY432,
  457: DAY457,
  468: DAY468,
});

/** The station days, in order — the linger machine and the tests read
 *  this (data, not scattered conditionals). */
export const C3_STATION_DAYS: readonly number[] = Object.freeze(
  Object.keys(C3_STATIONS).map(Number).sort((a, b) => a - b),
);

export function c3StationOf(day: number): C3Station | undefined {
  return C3_STATIONS[day];
}

// ------------------------------------------------------ the postcards ----

/** One station's postcard caption (the shipped capture pipeline's own
 *  mouth, the chapter's voice — the postcard says its own DATE, because
 *  in C3 the dates are still the story). */
export interface C3Caption {
  date: string;
  body: string;
  replay: string;
}

/** The chapter's captions, keyed by calendar day (the stations). Authored
 *  in doc 13 §3's C3 voice; the dates ride the calendar module's own
 *  rendering (no hand formatting). */
const C3_CAPTIONS: Readonly<Record<number, C3Caption>> = Object.freeze({
  296: {
    date: 'July 1',
    body: 'July opens. The shop\u2019s busiest week is staged, the oven\u2019s rehearsed like a moon launch, and the block is already routing its problems through one counter.',
    replay: 'July opens, again. The week still weighs.',
  },
  299: {
    date: 'July 4',
    body: 'The busiest day. The line down the block, the oven refusing to cool, and Eddie\u2019s hand flat on the counter a moment too long.',
    replay: 'The Fourth, again. The hand still checks.',
  },
  301: {
    date: 'July 6',
    body: 'Not moving. The ovens are cold and the counter is running on Leo. They say caught it early. They say lucky like a diagnosis.',
    replay: 'The cold ovens, again. Monday still holds its breath.',
  },
  309: {
    date: 'July 14',
    body: 'The keys, from a hospital bed: don\u2019t lose them. Not the shop. Them. The visiting room\u2019s window keeps your shape longer than you\u2019d think.',
    replay: 'The keys, again. The pocket still weighs everything.',
  },
  328: {
    date: 'August 2',
    body: 'The paper wall. The Compact file, Hartwell\u2019s option, the CLT bylaws \u2014 developments fail, documents wait. I\u2019ve seen the wall now.',
    replay: 'The wall, again. The documents are still waiting.',
  },
  349: {
    date: 'August 23',
    body: 'The Slice Summit. One room, eleven protections, a man who never lies and selects, and by eleven the blog has named me the block\u2019s feeder.',
    replay: 'The Summit, again. The title still tolls.',
  },
  369: {
    date: 'September 12',
    body: 'Halcyon opens. June\u2019s name over the door, Fitz\u2019s velvet in the corner, and a voice I wear when I\u2019m scared named kindly, close.',
    replay: 'Opening night, again. The voice still isn\u2019t mine.',
  },
  376: {
    date: 'September 19',
    body: 'The exam. The board doesn\u2019t curve and doesn\u2019t call. A kid who carries air for a living failed air. The block answers in layups.',
    replay: 'The miss, again. The rim still holds the answer.',
  },
  383: {
    date: 'September 26',
    body: 'The Club. Nineteen candidates, eleven yeses, $30,000, and the risk pages thin the way a first draft is thin \u2014 not lied about, just not finished.',
    replay: 'The founding, again. The chairs still remember.',
  },
  390: {
    date: 'October 3',
    body: 'Zero questions. Eight thousand dollars in my mother\u2019s handwriting and a phone call that asks nothing. The money that asks nothing can\u2019t be refused.',
    replay: 'The envelope, again. The call still asks nothing.',
  },
  404: {
    date: 'October 17',
    body: 'The pantry. A Tuesday that repeats, cans counted professionally, and the alternative life standing right there in a cardigan.',
    replay: 'The Tuesday, again. The coulds still live in margins.',
  },
  414: {
    date: 'October 27',
    body: 'The sound. A door, a porch, silence with a shape \u2014 and Doris\u2019s warning at the door, true-thing-last: watch it.',
    replay: 'The silence, again. It still has a shape.',
  },
  420: {
    date: 'November 2',
    body: 'The senate. Whose block is the render on \u2014 the table\u2019s agenda, my name on the carrying list, and Yoli\u2019s observation filed without asking.',
    replay: 'The table, again. The tiles still know.',
  },
  425: {
    date: 'November 7',
    body: 'The last envelope. $54,000 of $61,500, one ask left, and the audience that believes him \u2014 which is heavier than being doubted.',
    replay: 'The closing pitch, again. One envelope still pending.',
  },
  432: {
    date: 'November 14',
    body: 'Networking. Deli sandwiches, naval history, olives like punctuation \u2014 and the first entry I can feel refusing to be written.',
    replay: 'The lunch, again. The pause is still the entry.',
  },
  457: {
    date: 'December 9',
    body: 'The offer. One page, the fence door open, the pitch perfect because it is true \u2014 and because it makes me the face. Photographed, unsigned.',
    replay: 'The page, again. Still unsigned. Still warm.',
  },
  468: {
    date: 'December 20',
    body: 'The bridge\u2019s books. The shop lived, the Club closed at $61,500, the favor outstanding, the offer pending \u2014 and Eddie\u2019s pen waiting in January.',
    replay: 'The season\u2019s last card. The pen is still in January.',
  },
});

/** The station's caption (the composeCaption seam — content.ts calls
 *  this before its C2/C1/C0 branches, the same precedence the stations
 *  themselves ride). */
export function c3CaptionOf(day: number): C3Caption | undefined {
  return C3_CAPTIONS[day];
}

// ===========================================================================
// 3. The season compressions — R4's named transition, consuming days
// ===========================================================================

/** One compression: the linger plays its two lines and the NEXT press
 *  rolls the counters `from → to` through the next-day door (the 1:1 law
 *  moves whole). `seasonCut` marks a compression that crosses a season
 *  boundary (crossedSeasonCut proves it — the C3 pack machine-checks
 *  BOTH its crossings: summer→fall at 349→369, fall→winter at 432→457;
 *  the C2 pack's single-crossing pin was that wave's own calendar). */
export interface C3Compression {
  from: number;
  to: number;
  intro: string;
  city: string;
  seasonCut?: boolean;
}

/** The sixteen compressions (the gaps between the seventeen stations).
 *  The fixed block events ride the calendar's own voice here: the
 *  pergola's finish, the water-fix week's eleven days, Reyes's earmark,
 *  Doris's hospitalization, Junior's marriage plans, the co-op's group
 *  show, Craig's Florida guarantee getting called, the Uzuns' wholesale
 *  route (doc 12 §2's fixed row + §4's off-screen calendar — the City-
 *  Moves Law's C3 season). Compositions are authored in doc 13 §3's C3
 *  voice; the city lines follow the C0/C1/C2 cut's pattern. */
export const C3_COMPRESSIONS: readonly C3Compression[] = Object.freeze([
  {
    from: 296,
    to: 299,
    intro: 'The three days before the Fourth are all dough: Eddie\u2019s prep schedule runs to the quarter-hour, the cart runs interference on the line, and the block practices its holiday faces in shop windows. The Compact\u2019s grudge holds its summer shape \u2014 nobody sells, nobody talks, everybody watches the shop\u2019s numbers.',
    city: 'The corner prepped its busiest week. The street smelled ahead of itself.',
  },
  {
    from: 299,
    to: 301,
    intro: 'The Fourth\u2019s cleanup takes one day and the holiday\u2019s afterglow takes none: Eddie is at the oven by six on the fifth, restarting the ovens like the weekend was a rehearsal, and the shop\u2019s busiest week becomes the shop\u2019s ordinary week at triple volume. The pallets of flour run low by Sunday. Nobody mentions the hand.',
    city: 'The holiday came and went in flour. The corner counted its record week.',
  },
  {
    from: 301,
    to: 309,
    intro: 'The week the shop runs on Leo: the ovens learn his hours, Rosa sends the block\u2019s patience over in batches, and the hospital\u2019s visiting hours structure his afternoons the way the cart structures his mornings. Idris rides his noon route. The kid reads the tea leaves. Everyone is being brave at everyone.',
    city: 'The shop opened at seven because Eddie opens at seven. The street kept the hours for him.',
  },
  {
    from: 309,
    to: 328,
    seasonCut: false,
    intro: 'Nineteen days of the shop under new hands: the starter lives, the dough schedule turns out to be the easy part, and the block\u2019s problems start arriving at the counter in envelopes \u2014 a lease question, a permit form, a cousin\u2019s job lead. The garden\u2019s beds go dry mid-month \u2014 a city paperwork snag nobody caused, eleven days of the water-fix week, and the beds\u2019 south row needs buckets before it needs rain (doc 10 \u00A74\u2019s window \u2014 whether the buckets get carried is the garden\u2019s own beat at the window\u2019s tail). Kestrel Green\u2019s pergola gets its last beams. Eddie\u2019s rehab walks lengthen by one lamp post a day.',
    city: 'The garden lost its water for eleven days. The street talked about buckets. The pergola got its roof.',
  },
  {
    from: 328,
    to: 349,
    intro: 'Three weeks between the wall and the Summit: the Accord\u2019s talking points get drafted, redrafted, and cut to eleven sentences; the Club\u2019s candidate list goes from a napkin to a folder; and the Works\u2019 fence grows a new lock nobody ordered. Corvus\u2019s render takes down its hoarding for a day and puts up a BETTER hoarding, which is its own kind of message. Doris\u2019s ledger stays in her head, on sabbatical.',
    city: 'The fence got a second new lock. The render got a better wall. The block read both correctly.',
  },
  {
    from: 349,
    to: 369,
    seasonCut: true,
    intro: 'The Summit\u2019s afterglow carries the block into September: the blog\u2019s title settles over the corner like a new awning, the Accord\u2019s eleven sentences go out on letterhead, and the garden\u2019s tomatoes come in heavy. Craig\u2019s Florida guarantee gets called \u2014 the paper SaniHaul buys, the wire says, at a discount nobody names twice. The Uzuns expand their wholesale route two stops north. Summer hands the block to fall gently, like a relay.',
    city: 'The summer ended on schedule. The rents this year arrive with logos.',
  },
  {
    from: 369,
    to: 376,
    intro: 'Halcyon\u2019s first week is good weather, literally and otherwise: the café\u2019s window finds its morning light, Fitz\u2019s velvet finds its people, and the build-out loan\u2019s first payments land exactly where loans land. The Club\u2019s candidate folder gains four pages of yeses. Deshaun\u2019s exam week arrives the way exam weeks do \u2014 too quiet, then suddenly.',
    city: 'The café\u2019s opened. The corner\u2019s morning smells moved one storefront east, temporarily.',
  },
  {
    from: 376,
    to: 383,
    intro: 'The week between the exam and the Club: Darnell scores Deshaun\u2019s games so the study guide can reopen, the court adjusts its volume without being asked, and the Club\u2019s folding chairs get counted, borrowed, and counted again. Junior\u2019s marriage plans make the wire \u2014 a date, a hall deposit, a suit from Ray\u2019s. The co-op schedules its group show for November. The block keeps its appointments.',
    city: 'The court learned to be quieter in September. The garden learned to hold chairs.',
  },
  {
    from: 383,
    to: 390,
    intro: 'The raise\u2019s first October: envelopes at kitchen tables, the yeses climbing by ones and twos, Big Mike\u2019s five thousand arriving WITH a cookbook chapter proposal attached. Yoli\u2019s legal pad keeps its own count somewhere private. Alma Reyes\u2019s earmark rescues the playground swings \u2014 the council\u2019s machinery grinding out one small kindness between hearings. The beds\u2019 south row survives its dry week by a margin of buckets.',
    city: 'The swings got their earmark. The money got its envelope economy. Both are the city being the city.',
  },
  {
    from: 390,
    to: 404,
    intro: 'Two weeks of the envelope economy at full speed: the raise passes forty-five, the hospital releases Doris with her ledger still in her head, and the block\u2019s October is gold light and longer shadows. Camille\u2019s drive builds its Tuesday. The Works\u2019 fence keeps its second lock. The render\u2019s dome shows up in a crane order nobody signed publicly.',
    city: 'The landlady came home sharp. The crane order went in quiet. October kept both its clocks.',
  },
  {
    from: 404,
    to: 414,
    intro: 'The pantry\u2019s Tuesday repeats itself into the block\u2019s calendar and the raise crosses fifty on a Thursday nobody planned. The Uzuns\u2019 route adds a Saturday stop. Priya\u2019s album hits station 110 and keeps counting. The fences are quiet all week \u2014 the quiet before a door slams, though nobody knows that yet.',
    city: 'The pantry\u2019s boxes made a small skyline. The money made a bigger one. The fences kept their own books.',
  },
  {
    from: 414,
    to: 420,
    seasonCut: false,
    intro: 'The week after the sound: the block keeps the fight\u2019s volume like a debt, Doris reads labels like leases at the pharmacy, and Craig\u2019s truck is parked one street over for three nights, which the wire reports as TRAVELING FOR WORK. The Club\u2019s last envelope pends. Tito\u2019s table sets its Sunday agenda. November opens like a ledger.',
    city: 'The house made its decision quietly. The street heard it anyway. Streets always hear.',
  },
  {
    from: 420,
    to: 425,
    intro: 'Five days to the closing pitch: the deck\u2019s fourth draft, the risk pages thinned ON PURPOSE, the garden\u2019s chairs borrowed from everywhere chairs are. Miss Odessa\u2019s purse appears at the garden\u2019s edge twice before Thursday, an advance scout with a handbag. Yoli\u2019s pad writes its page. The raise is $54,000 and the block is doing envelope math at dinner.',
    city: 'The garden borrowed chairs from three porches. The block counted envelopes out loud.',
  },
  {
    from: 425,
    to: 432,
    intro: 'The raise closes at sixty-one five from nineteen doors, and the week that follows is the week the block\u2019s money stops being a number and becomes a responsibility with faces. The deli\u2019s olive order doubles. A carting company\u2019s trucks are seen measuring nothing in particular. Junior\u2019s hall deposit clears. The fence\u2019s second lock holds.',
    city: 'The Club closed. The trucks came back. November started keeping two books and only knows it in November.',
  },
  {
    from: 432,
    to: 457,
    seasonCut: true,
    intro: 'Twenty-five days from the lunch to the offer, the longest stretch the chapter plays unseen: Thanksgiving builds and passes at the deli and the garden both, the first snow holds off until it doesn\u2019t, and the Club\u2019s money sits in its account like a held breath. Gino\u2019s fruit basket arrives at the shop on a Tuesday \u2014 no card, perfect pears. Marisol\u2019s email asks for Thursday the ninth, one page, the fence door propped. The season hands itself from fall to winter the way the block hands everything: carried, together, complaining.',
    city: 'The first snow came early and left late. The fence door got propped. December did what December does.',
  },
  {
    from: 457,
    to: 468,
    intro: 'The offer\u2019s eleven days: the page rides the jacket pocket through the season\u2019s last errands \u2014 the pantry\u2019s winter drive, the Club\u2019s account paperwork, Eddie\u2019s rehab walks reaching the shop\u2019s door and turning around. The render\u2019s lobby glows in the model\u2019s window every dusk. The first snow sticks. The year closes the way years close: everything itemized, nothing totaled.',
    city: 'The shop\u2019s windows stayed gold against the snow. The render\u2019s sun kept its appointment. The year closed warm and owing.',
  },
]);

export function c3CompressionFrom(day: number): C3Compression | undefined {
  return C3_COMPRESSIONS.find((c) => c.from === day);
}

/** The linger machine's answer for a C3 day: 'next' = the ordinary
 *  tomorrow (or the water-fix window's dry beds — the garden's own
 *  eleven days); a compression = the montage-then-roll; 'cut' = the
 *  season's last linger (the New Year cut). Null for any day that isn't
 *  C3's — the machine above owns those. */
export function c3RailFor(day: number): 'next' | 'cut' | { compress: number } | null {
  if (!Number.isInteger(day) || day < C3_FIRST_DAY || day > C3_LAST_DAY) return null;
  if (day === C3_LAST_DAY) return 'cut';
  const comp = c3CompressionFrom(day);
  if (comp) return { compress: comp.to };
  return 'next';
}

// ===========================================================================
// 4. The C3→C4 season cut — the chapter close (doc 06 §C3 handoff)
// ===========================================================================

/** The cut's diary latch (the block layer's law: the latch IS the
 *  entry; the cut plays once per save). */
export const C3_CUT_ID = 'c3-cut-newyear';

/** Doc 06 §C3 handoff, staged: New Year's, the shop, the offer's answer
 *  whatever door N3a took (the staging is door-neutral by law — doc 10
 *  §3's rails: acceptance is steered, but defer/refuse re-run the offer
 *  in C4 with worse terms; the signing itself is C4 content — the doc's
 *  own schedule, Jan 14, doc 12 §2's C4 row). */
export const C3_CUT_STAGE =
  'New Year\u2019s Eve at the shop: the counter I\u2019ve kept since July, the ovens warm for the block\u2019s last night of the year, Eddie\u2019s rehab walks reaching the door now. The offer is what December left on the counter \u2014 answered, deferred, or refused, it re-runs with January\u2019s weather (doc 06 \u00A7C3 handoff; doc 10 \u00A73\u2019s rails \u2014 the signing has a date either way). I can feel the 14th coming the way you feel weather in an old scar. Eddie\u2019s pen is waiting in January. A man should sign his own ladder. Somebody said that once. It\u2019s going to sound kind, and it\u2019s going to be wrong.';

/** The cut's wall (authored, doc 13 voice): the season kept; what the
 *  new year brings is the next wave's content — the hold says so in the
 *  world's own voice, never in project-speak. */
export const C3_CUT_WALL =
  'January opens its first morning and the corner keeps its hours. The Club\u2019s money sleeps in its account, the letter sleeps in the jacket, and the notebook knows what it knows. Some signatures are weather. This one has a date.';

/** The cut's marker entry — the latch (doc 13 §3 C3 voice, Stage III's
 *  ledger: the season's facts, the costs itemized elsewhere exactly the
 *  way the bridge keeps them). Dated Jan 6, Y3. */
export function c3CutEntry(): FieldDiaryEntry {
  return {
    id: C3_CUT_ID,
    kind: 'EVENT',
    date: dateOfCalendarDay(C3_CUT_DAY),
    epistemic: 'FACT',
    body: 'The season\u2019s books, closed: the shop lived through its hardest summer, the Club closed at $61,500 from nineteen doors, the offer is photographed and unsigned, and the fixer\u2019s favor is outstanding in a column the entries won\u2019t name. Nineteen debts. One signature pending. Facts only \u2014 and the facts are bridge facts. What the bridge cost is itemized elsewhere, and \u201Celsewhere\u201D starts opening on the 14th.',
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

// ===========================================================================
// 5. The chapter's Lost-Year fragment — F2 The glass (doc 02 §6.2)
// ===========================================================================

export const C3_FRAGMENT_IDS = {
  f2: 'c3-f2-glass',
} as const;

function fragmentRow(id: 'F2') {
  const row = FRAGMENTS.find((f) => f.id === id);
  if (!row) throw new Error(`c3pack: fragment ${id} missing from the register`);
  return row;
}

/** F2 — doc 06 §C3 event 1: "F2 fires at the visiting-room window (doc
 *  02 §6.2)". The register row's three sensory clauses become ONE
 *  RECALL entry, the wobble style (the C0 wobble's vehicle; the C1/C2
 *  packs' F6/F3 precedent — one entry, once per save). The recontextual-
 *  ization is noted at the trigger (doc 11's header law): the shipped
 *  block hosts the visiting room in prose, and the fragment's ink lands
 *  at the loop's dusk — the shop's window from the fire escape, Leo's
 *  own palm flat on the glass, hours later, still shaped (the station's
 *  own climbNote carries the image's staging). */
export function f2Entry(calendarDay: number): FieldDiaryEntry {
  const row = fragmentRow('F2');
  return {
    id: C3_FRAGMENT_IDS.f2,
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
// 6. The beats' diary ink — one draft per authored latch (the block
//    layer's law: the entry IS the latch)
// ===========================================================================

/** The pack's entry-id namespace (the c0/c1/c2 precedent: `c3-`
 *  prefixed, one id per latch). */
export const C3_IDS = {
  collapse: 'c3-eddie-collapse',
  keys: 'c3-eddie-keys',
  waterFix: 'c3-water-fix',
  elvann: 'c3-paper-wall',
  summit: 'c3-slice-summit',
  wexler: 'c3-wexler-card',
  halcyon: 'c3-halcyon-opens',
  exam: 'c3-deshaun-exam',
  club: 'c3-club-founding',
  ada: 'c3-ada-envelope',
  pantry: 'c3-camille-pantry',
  sound: 'c3-doris-sound',
  qCraig: 'c3-q-craigs-paper',
  senate: 'c3-tito-senate',
  close: 'c3-club-closing',
  lunch: 'c3-gino-lunch',
  violation: 'c3-violation-gone',
  offer: 'c3-marisol-offer',
  waterFixMissed: 'c3-water-fix-missed',
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

/** Doc 06 §C3 starting circumstances + doc 12 §2's fixed event — the
 *  collapse (the eddie interaction, day 301). The diary's own body is
 *  the diary's law-sized cut (the 600 cap — the staged notes carry the
 *  full narration; the notebook keeps the facts and the margin's work). */
export function collapseEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.collapse, 'EVENT', day, 'FACT',
    'Eddie\u2019s hand flat on the counter, and it doesn\u2019t move. Heart, they say, caught early, the word lucky used like a diagnosis. The shop runs on Leo from this morning \u2014 nobody assigned it, it\u2019s just true by lunch. Write the facts, Marsh. Write the facts.');
}

/** Doc 06 §C3 event 1 — the keys (the eddie interaction's C3 wave, day
 *  309): the visiting room's own entry, the burden transfer verbatim. */
export function keysEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.keys, 'EVENT', day, 'FACT',
    'The visiting room\u2019s window admits July and nothing else. Eddie puts the keys in my hand \u2014 the shop\u2019s, the back door\u2019s, the safe\u2019s \u2014 the held-back element, given from a hospital bed: \u201CDon\u2019t lose them. Not the shop. Them.\u201D I say something about the dough schedule. He says dough schedules are the easy part. We both pretend the other thing wasn\u2019t said, which is how Eddie says the biggest things.');
}

/** Doc 10 §4's specimen window — the water-fix week (the garden
 *  interaction, days 316\u2013326): helping once widens Yoli's margin;
 *  the miss prices the beds' south row (doc 10 §4's own words, lived). */
export function waterFixEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.waterFix, 'EVENT', day, 'FACT',
    'Eleven days the garden\u2019s water access is gone \u2014 a city paperwork snag nobody caused. The south row lives on buckets: mine, Yoli\u2019s, the kid\u2019s toy pail, everybody\u2019s stubbornness. Yoli counts the surviving tomatoes twice and says nothing, which is how she says thank-you-with-interest. The pergola got its roof beams up in the same week \u2014 the garden held.');
}

/** Doc 06 §C3 event 2 — El Vann's paper wall (the East Tenement, day
 *  328): the PLACE entry + her verbatim line. */
export function elvannEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.elvann, 'PLACE', day, 'FACT',
    `The East Tenement\u2019s community room, sketched from inside: folding tables, a radiator with opinions, and the paper wall \u2014 origami stacks floor to ceiling, fifty-some years of the block\u2019s paper. The Compact file. Hartwell\u2019s option. The CLT bylaws. El Vann, verbatim: \u201C${C3_ELVANN_LINE}\u201D`);
}

/** Doc 06 §C3 event 3 — the Summit (the eddie interaction, day 349) +
 *  Wexler's PERSON card (the first meeting). */
export function summitEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.summit, 'EVENT', day, 'FACT', C3_SUMMIT_NOTE);
}
export function wexlerEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.wexler, 'PERSON', day, 'FACT', C3_WEXLER_CARD_LINE);
}

/** Doc 06 §C3 event 8 + doc 07 §2.x — Halcyon opens (the june
 *  interaction, day 369): her line verbatim. */
export function halcyonEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.halcyon, 'RELATION', day, 'FACT',
    'Halcyon opens \u2014 the caf\u00E9 shell at 6 Kestrel East, June\u2019s name over the door, Fitz\u2019s velvet keeping the corner quiet. The build-out loan strain rides her shoulders like a second apron and she wears it better than I wear mine. My toast runs on the performance voice and she catches it, kindly, close: \u201CYou do a voice when you\u2019re scared. It\u2019s a good voice. It\u2019s not yours.\u201D Neither of us writes it down. Somebody did.');
}

/** Doc 12 §2's fixed event — Deshaun's exam fail (the deshaun
 *  interaction, day 376): his own chapter. */
export function examEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.exam, 'EVENT', day, 'FACT', C3_DESHAUN_NOTE);
}

/** Doc 06 §C3 event 5 — the Club's founding pitch (the garden, day
 *  383). */
export function clubEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.club, 'EVENT', day, 'FACT',
    'The garden, Saturday, folding chairs: the Juniper Club\u2019s first pitch, the render on a clothesline. The pitch is honest and the risk pages are thin the way a first draft is thin \u2014 not lied about, just not finished. Eleven said yes into the folding hat. Yoli sat in the back row and wrote on a legal pad and did not ask a question, which from Yoli is a paragraph. The Club is $30,000. The carrying has started.');
}

/** Doc 06 §C3 event 5's envelope — Ada's $8,000 (the bench, day 390). */
export function adaEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.ada, 'EVENT', day, 'FACT',
    'The envelope in the shop\u2019s mail slot, my name in my mother\u2019s handwriting, no return address. Eight thousand dollars. The phone rings eleven minutes later and the call asks zero questions. I stand on the bench with the phone against my ear and say thank you in the voice that isn\u2019t the performance, and she says, \u201CI know. That\u2019s why I didn\u2019t ask.\u201D');
}

/** Doc 06 §C3 event 8 — Camille's pantry drive (the garden, day 404),
 *  the PERSON card's content folded into the diary's own cut. */
export function pantryEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.pantry, 'PERSON', day, 'FACT',
    'Camille Odom runs the pantry drive out of the garden\u2019s south table \u2014 P.S. 218\u2019s lists, the library\u2019s boxes, a Tuesday that repeats. She counts cans the way Deshaun counts catches. \u201CYou\u2019re the coffee man,\u201D she says, not looking up. \u201CTuesday\u2019s hot. Donations get cold.\u201D The alternative life is standing right there in a cardigan: no render, no raise, no blog title \u2014 a classroom, a list, a Tuesday. The notebook writes COULD in the margin, where the coulds live.');
}

/** Doc 06 §C3 event 7 + doc 07 §2.x — the sound + Doris's door warning
 *  (the rosa interaction, day 414), the QUESTION's clause in the tail. */
export function soundEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.sound, 'EVENT', day, 'FACT',
    'The sound comes over the back fences at dusk \u2014 a door, a porch, silence. Doris, out of the hospital three weeks, found Craig\u2019s version of the books, and the fight is off-screen the way the doc writes it: no voices, just the door\u2019s slam and the kind of silence that has a shape. Then, at the door, true-thing-last: \u201CYou\u2019re a good boy the way Craig\u2019s a good boy. Watch it.\u201D The QUESTION writes itself before I can stop it: What is Craig\u2019s paper?');
}
export function questionCraigEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.qCraig, 'QUESTION', day, 'FACT',
    `${C3_Q_CRAIG} \u2014 the SaniHaul trucks come at six a.m. and are legal. The rest is GUESS, and the tag is the only clean thing on the page.`);
}

/** Doc 07 §4's senate scene (the park, day 420): whose block is the
 *  render on. */
export function senateEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.senate, 'OBSERVATION', day, 'FACT',
    'Corner Park, the dominoes table, first Sunday of November: the senate convenes and I\u2019m seated without a vote. Eddie\u2019s chair sits empty out of respect. Tito plays the first hand in silence, then, unprompted: \u201CWhose block is the render on, muchacho? That\u2019s today\u2019s agenda. You brought the agenda. You just don\u2019t know you\u2019re carrying it.\u201D Nobody answers him, which means everybody did. And on the walk back, without asking: Yoli\u2019s noticed the Club\u2019s pitch meetings look like the Compact\u2019s, mirrored. Not an accusation. An observation with a legal pad behind it.');
}

/** Doc 06 §C3 event 5's closing pitch (the garden, day 425) — the latch
 *  BEFORE the ask (the pick's own ink lands through the machine). */
export function clubCloseEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.close, 'EVENT', day, 'FACT',
    'The garden, Thursday evening, the last folding chairs: the Club\u2019s closing pitch. The deck\u2019s been through four drafts and the risk pages are thin on purpose \u2014 honesty as a strategy, Rosa\u2019s advice, taken. The raise stands at $54,000 with eighteen faces; one ask left, and the room knows it the way rooms know things. Miss Odessa sits front row with her purse on her knees like the envelope\u2019s already decided. Who I ask is who I can hurt.');
}

/** Doc 06 §C3 event 6 — Gino's lunch (the diner booth, day 432): the
 *  NETWORKING entry — the body is the refusal, shaped (the entry that
 *  refuses to record the violation). The PERSON card rides separately. */
export function lunchEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.lunch, 'EVENT', day, 'FACT', C3_NETWORKING_BODY);
}
export function ginoCardEntry(day: number): FieldDiaryEntry {
  return entry(`${C3_IDS.lunch}-card`, 'PERSON', day, 'FACT', C3_GINO_CARD_LINE);
}

/** The wall's missing slip (the lease_notice interaction, day 432+): an
 *  OBSERVATION the entry shapes around the gap. */
export function violationEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.violation, 'OBSERVATION', day, 'FACT', C3_VIOLATION_GONE_NOTE);
}

/** Doc 06 §C3 event 4 — the offer (the Works fence, day 457): the
 *  EVIDENCE entry (photographed, unsigned) + Marisol's card v1. */
export function offerEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.offer, 'EVIDENCE', day, 'FACT',
    'The fence door at the Works is propped open and Marisol is standing in the render\u2019s actual footprint holding one page like it\u2019s warm. Provisions Hall, the food hall: \u201Cyour vendors, your block, our kitchen.\u201D Run it. The pitch is perfect because it is true \u2014 and because it makes me the project\u2019s face. I photograph the page unsigned and put the phone away. Nineteen debts. One signature pending. A fixer\u2019s favor outstanding. And a page.');
}
export function marisolCardEntry(day: number): FieldDiaryEntry {
  return entry(`${C3_IDS.offer}-card`, 'PERSON', day, 'FACT', C3_MARISOL_CARD_V1);
}

// SECTION-C3-CONTINUES-4

// ===========================================================================
// 7. The choice packs — the register's C3 nodes (doc 10 §3's table)
// ===========================================================================

/** The pick packs — the NotebookPrompt overlay's content for the C3
 *  nodes. All three ride the REGISTER (resolveChoice consumes them, doc
 *  10 §3's option table; no local picks this chapter — the toast was
 *  C2's). N3b's nineteen options are doc 09 §4's own faces: who he asks
 *  is who he can hurt, and the overlay names every face and dollar. */
export interface C3ChoicePack {
  nodeId: 'N3a' | 'N3b' | 'N3c';
  prompt: string;
  options: readonly { optionId: string; label: string; blurb: string }[];
}

export const C3_N3A_PROMPT =
  'The render room\u2019s page is on the table and Marisol is watching the way the render watches: patiently, in perfect light. Provisions Hall \u2014 my vendors, my block, their kitchen. The Face begins here, or waits, or doesn\u2019t.';

export const C3_N3C_PROMPT =
  'Gino\u2019s favor is done and the entry refused to write it. Eddie\u2019s in the visiting room asking about the starter. Tell him about the lunch, or not \u2014 not telling is available, tempting, and cheap now.';

/** N3a — the offer's three doors (doc 06 §C3 major decisions; doc 10 §3:
 *  acceptance is steered \u2014 R3 \u2014 but when and how publicly is chosen;
 *  refusal paths re-run the offer in C4 with worse terms). The ink is
 *  the pick's memory, one door per entry, Stage III's voice. */
export const C3_N3A_PACK: C3ChoicePack = {
  nodeId: 'N3a',
  prompt: C3_N3A_PROMPT,
  options: Object.freeze([
    {
      optionId: 'accept',
      label: 'A \u2014 take the page',
      blurb: 'Say yes in the render\u2019s own light. The Face begins \u2014 the signing waits for January\u2019s date and Eddie\u2019s pen, but the yes fits my mouth like it was measured for it.',
    },
    {
      optionId: 'defer',
      label: 'B \u2014 take it home unsigned',
      blurb: 'Not no \u2014 not yet. December wants a clear head and the Club\u2019s books want an owner\u2019s eye first. The offer keeps. Offers from Marisol keep like debts keep: quietly, at interest.',
    },
    {
      optionId: 'refuse',
      label: 'C \u2014 give it back',
      blurb: 'My vendors are fine where they are. The page goes back across the table \u2014 and the doc\u2019s own rails say the offer re-runs in January, with numbers that know what refusal costs.',
    },
  ]),
};

/** Doc 09 §4's nineteen faces — the raise's own table, verbatim names and
 *  dollar rows (the register's N3b options are slot-01 … slot-19 in this
 *  order). The sum machine-checks to $61,500 (C3_CLUB_TOTAL). */
export interface C3N3bSlot {
  slot: string;
  name: string;
  amountLabel: string;
  blurb: string;
}

export const C3_N3B_SLOTS: readonly C3N3bSlot[] = Object.freeze([
  { slot: 'slot-01', name: 'Leo Marsh (own stake)', amountLabel: '$10,000', blurb: 'His own money in \u2014 the stake that makes the Club his before it is anyone else\u2019s.' },
  { slot: 'slot-02', name: 'Ada Marsh', amountLabel: '$8,000', blurb: 'The envelope that asked zero questions, now asked to become a debt on paper.' },
  { slot: 'slot-03', name: 'the Sycamore co-op (six artists, pooled)', amountLabel: '$9,000', blurb: 'Six artists\u2019 pooled yes \u2014 the block\u2019s other economy investing in the hall\u2019s kitchen.' },
  { slot: 'slot-04', name: 'Big Mike', amountLabel: '$5,000', blurb: 'The five thousand that arrives with a cookbook chapter proposal attached.' },
  { slot: 'slot-05', name: 'Fitz', amountLabel: '$4,000', blurb: 'The gallery\u2019s owner, for whom the money was never the conversation.' },
  { slot: 'slot-06', name: 'the Uzun cousins', amountLabel: '$6,000', blurb: 'Businesspeople\u2019s money \u2014 the wholesale route\u2019s own family, counting on the count.' },
  { slot: 'slot-07', name: 'Mehmet & Ay\u015fe Oktay', amountLabel: '$3,000', blurb: 'The register\u2019s last sale, invested in the block\u2019s next table.' },
  { slot: 'slot-08', name: 'Father Mike (the parish boiler fund)', amountLabel: '$2,500', blurb: 'The boiler fund\u2019s own envelope \u2014 faith invested in a kitchen.' },
  { slot: 'slot-09', name: 'Verna Carter', amountLabel: '$2,300', blurb: 'The crossing guard\u2019s yes \u2014 the block\u2019s quietest money.' },
  { slot: 'slot-10', name: 'Fatima Rahal', amountLabel: '$2,000', blurb: 'The library\u2019s boxes, converted to a kitchen\u2019s hope.' },
  { slot: 'slot-11', name: 'Grace Okafor', amountLabel: '$1,500', blurb: 'The cleaner\u2019s envelope \u2014 trust in the face the blog named.' },
  { slot: 'slot-12', name: 'Nilda Col\u00F3n', amountLabel: '$1,500', blurb: 'The day-care\u2019s yes \u2014 the block\u2019s smallest hands invested biggest.' },
  { slot: 'slot-13', name: 'Sal (Sunrise Laundry)', amountLabel: '$1,200', blurb: 'The apron\u2019s own man, paying forward the permit\u2019s morning.' },
  { slot: 'slot-14', name: 'Deon King', amountLabel: '$1,200', blurb: 'The barber\u2019s chair money \u2014 the block\u2019s sharpest lines, in on the hall.' },
  { slot: 'slot-15', name: 'Miss Odessa Wynn', amountLabel: '$800', blurb: 'The purse that was on her knees all evening \u2014 the audience that believes him.' },
  { slot: 'slot-16', name: 'Marcus Bell', amountLabel: '$700', blurb: 'The whistle\u2019s own envelope \u2014 the court\u2019s arithmetic says yes.' },
  { slot: 'slot-17', name: 'Mr. Idris', amountLabel: '$600', blurb: 'The bursar\u2019s six hundred \u2014 \u201Cnot because of the deck.\u201D' },
  { slot: 'slot-18', name: '\u201CChino\u201D Herrera', amountLabel: '$1,000', blurb: 'The block\u2019s smallest yes at the garden\u2019s edge, in the folding hat.' },
  { slot: 'slot-19', name: 'Darnell', amountLabel: '$1,200', blurb: 'The scorekeeper\u2019s envelope \u2014 the kid covering kids, grown into the Club.' },
]);

/** N3b — the investor list (the closing pitch's own pick, day 425). The
 *  overlay names all nineteen faces; the divergence is the name in the
 *  envelope. */
export const C3_N3B_PACK: C3ChoicePack = {
  nodeId: 'N3b',
  prompt: C3_N3B_PROMPT,
  options: Object.freeze(
    C3_N3B_SLOTS.map((s) => ({
      optionId: s.slot,
      label: `${s.name} \u2014 ${s.amountLabel}`,
      blurb: s.blurb,
    })),
  ),
};

/** N3c — Gino's lunch (the deli booth's own pick, day 432). The
 *  not-tell is the Silent class: nothing posts at the decision. */
export const C3_N3C_PACK: C3ChoicePack = {
  nodeId: 'N3c',
  prompt: C3_N3C_PROMPT,
  options: Object.freeze([
    {
      optionId: 'tell-eddie',
      label: 'Tell him',
      blurb: 'The visiting room, the starter, and then the lunch \u2014 the sandwiches, the naval history, the violation that came off the wall without anybody touching it. Trigger four exists, whatever that means.',
    },
    {
      optionId: 'not-tell',
      label: 'Not tell',
      blurb: 'The window keeps its July. The starter gets its report. The page stays clean \u2014 and the clean page is the loudest thing in the room. Nothing is written. That\u2019s the point.',
    },
  ]),
};

/** The pack lookup (the Game layer's seam). The C3 nodes have no locks
 *  (doc 10 §3's table: all three nodes' options carry `locks: []`) \u2014
 *  `held` is accepted for the seam's shape and ignored. */
export function c3ChoicePackOf(nodeId: string): C3ChoicePack | undefined {
  if (nodeId === 'N3a') return C3_N3A_PACK;
  if (nodeId === 'N3b') return C3_N3B_PACK;
  if (nodeId === 'N3c') return C3_N3C_PACK;
  return undefined;
}

// ---- the picks' ink ----

/** What one taken N3a option WRITES \u2014 the diary entry, in his hand
 *  (doc 13 §3 C3 voice, Stage III: \u201CI\u2019m the bridge. Bridges get
 *  tolls.\u201D). One per option \u2014 the pick is remembered in ink. */
const N3A_DIARY: Readonly<Record<string, string>> = Object.freeze({
  accept: 'I said yes. In the render room, in front of the render\u2019s own sun, I said yes out loud \u2014 my vendors, my block, their kitchen, and the yes fits my mouth like it was measured for it. The page stays unsigned until January\u2019s date; signatures are weather, and this one has a date. The Face starts here, whether the letter knows it yet or not. Nineteen debts. One signature pending. A fixer\u2019s favor outstanding. And a yes.',
  defer: 'I took the page home unsigned. Not no \u2014 not yet. December wants a clear head and the Club\u2019s books want an owner\u2019s eye first. The offer keeps. Offers from Marisol keep like debts keep: quietly, at interest. The pocket weighs the same as it did this morning and exactly as much as it will in January.',
  refuse: 'I gave the page back. My vendors are fine where they are; my block doesn\u2019t need a kitchen with a lobby. Marisol took it without a blink \u2014 the offer re-runs in January, with numbers that know what refusal costs. The render\u2019s sun kept its appointment. I walked home lighter and poorer at the same time, and the notebook writes both honestly.',
});

/** The room's reaction line, per option (spoken once, never stored). */
const N3A_NOTE: Readonly<Record<string, string>> = Object.freeze({
  accept: 'Marisol slides the page back across the table, unsigned. \u201CJanuary, then. The fourteenth. Bring a pen that matters.\u201D She doesn\u2019t smile. She doesn\u2019t have to.',
  defer: 'Marisol nods once \u2014 the nod of a woman whose calendar already has a box for this. \u201CThe offer keeps. It\u2019s what offers do.\u201D',
  refuse: 'Marisol takes the page back without looking at it. \u201CThe offer re-runs,\u201D she says, \u201Cwith numbers that know what refusal costs.\u201D Behind her, the render\u2019s sun keeps its appointment.',
});

/** N3b's ink, per face \u2014 the ask is remembered in the name (who he
 *  asked is who he can hurt; doc 06 §C3 major decisions). */
export function c3N3bInk(slot: C3N3bSlot): string {
  return `The last envelope went to ${slot.name} \u2014 ${slot.amountLabel} across the thin pages\u2019 honest math, in the folding hat at the garden\u2019s closing pitch. Nineteen doors. The Club closes at $61,500, and the notebook writes the name where names live: who I asked is who I can hurt. The raise is a map of that, and the map is mine to carry.`;
}

const N3B_NOTE =
  'The envelope lands in the folding hat. The room does the math out loud \u2014 nineteen doors, sixty-one five \u2014 and the math sounds like a block. Miss Odessa closes her purse.';

/** N3c's ink \u2014 the tell. The not-tell writes NOTHING (the Silent
 *  class, doc 10 §1: the divergence is the missing entry itself). */
const N3C_DIARY: Readonly<Record<string, string>> = Object.freeze({
  'tell-eddie': 'I told Eddie. The visiting room, the starter\u2019s report, and then the lunch \u2014 the sandwiches, the naval history, the olives, and the violation that came off the wall without anybody touching it. He listened the way Eddie listens, which is completely, and then he said, \u201COkay, kid,\u201D which is Eddie for a whole sermon. Trigger four exists now, whatever the doc would call it. The notebook writes it, and the writing is the relief.',
});
const N3C_NOTE: Readonly<Record<string, string>> = Object.freeze({
  'tell-eddie': 'Eddie, after a while: \u201COkay, kid.\u201D The two words do the whole sermon\u2019s work.',
  'not-tell': 'You don\u2019t tell him. The window keeps its July, the starter gets its report, and the page stays clean \u2014 the clean page is the loudest thing in the room.',
});

// ===========================================================================
// 8. The chapter's ledger seam — the fixer's favor (the Silent class's
//    mirror) + the water-fix window's two sides
// ===========================================================================

/** The Gino favor rides the ledger as a recorded act at the lunch (the
 *  C2 Priya-favor precedent: kind 'choice', visibility 'secret' \u2014 a
 *  promise without a due is schema-invalid, and the favor's name comes
 *  later; the ledger keeps the owing visible either way). */
export const C3_GINO_FAVOR_LEDGER_ID = 'led-c3-gino-favor';
export const C3_GINO_FAVOR_REFS = ['gino', 'c3-gino-favor'] as const;

/** Doc 10 §4's specimen window — the garden's water-fix week (eleven
 *  days, C3). The HELPED side sets this flag (the garden's own beat at
 *  the window's tail, day 328); the MISSED side writes its own ink at
 *  the window's close (the No-FOMO law: the miss is visible,
 *  in-character, once) and carries its own flag for the downstream
 *  margin (Yoli's C6 widens without him). */
export const C3_WATER_FIX_FLAG = 'water-fix-helped';
export const C3_WATER_FIX_MISSED_FLAG = 'water-fix-missed';

/** The miss's ink \u2014 doc 10 §4's consequence in the world's own voice
 *  (\u201CThe garden loses its beds' south row for the year; Yoli's C6
 *  margin widens without him\u201D), once, latched by its own id. */
export function waterFixMissedEntry(day: number): FieldDiaryEntry {
  return entry(C3_IDS.waterFixMissed, 'OBSERVATION', day, 'FACT',
    'The buckets week ended and nobody carried the last of them. The garden\u2019s south row goes to blight for the year \u2014 eleven days of water access gone to a paperwork snag, and the help was a walk away the whole time. Yoli writes the loss in her ledger without showing anybody the page. The margin\u2019s hers to keep now; the wideness is mine to have made.');
}

// ===========================================================================
// 9. The resolve machine — the register's C3 nodes, dressed for the seam
// ===========================================================================

export interface C3PickApply {
  ok: boolean;
  reason?: 'bad-node' | 'bad-option' | 'locked';
  flags: string[];
  ledger: LedgerEntry[];
  diary: FieldDiaryEntry | null;
  note: string | null;
}

const C3_CHOICE_WEIGHT = 1;

/** Resolve one C3 pick through the register's own machine (doc 10 §3).
 *  Pure; the caller applies. Refused picks change nothing. N3c's
 *  not-tell resolves with an EMPTY ledger (the Silent class) and no
 *  diary \u2014 its note is spoken, never stored, and its flag is the only
 *  witness. */
export function applyC3Pick(
  nodeId: 'N3a' | 'N3b' | 'N3c',
  optionId: string,
  calendarDay: number,
): C3PickApply {
  const none: C3PickApply = { ok: false, reason: 'bad-node', flags: [], ledger: [], diary: null, note: null };
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
    weight: C3_CHOICE_WEIGHT,
    visibility: w.visibility,
    node: nodeId,
  }));
  let body: string | null = null;
  let note: string | null = null;
  if (nodeId === 'N3a') {
    body = N3A_DIARY[optionId] ?? null;
    note = N3A_NOTE[optionId] ?? null;
  } else if (nodeId === 'N3b') {
    const slot = C3_N3B_SLOTS.find((s) => s.slot === optionId);
    body = slot ? c3N3bInk(slot) : null;
    note = N3B_NOTE;
  } else {
    body = N3C_DIARY[optionId] ?? null; // the not-tell's body is absence
    note = N3C_NOTE[optionId] ?? null;
  }
  const diary: FieldDiaryEntry | null = body
    ? {
        id: `c3-${nodeId.toLowerCase()}-${optionId}`,
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

export interface C3PackReport {
  ok: boolean;
  problems: string[];
}

/** The pack checks itself against the machines it feeds: the station
 *  keys are exactly the chapter's canon days (each landing on its doc 06
 *  date through the calendar module); every compression's `to` is a
 *  station, ordered, and the TWO season cuts are the calendar's own
 *  crossings (summer\u2192fall at 349\u2192369, fall\u2192winter at 432\u2192457 \u2014
 *  crossedSeasonCut machine-checked from the dates themselves); every
 *  queue opens with Idris and pays honest; the canon lines are verbatim
 *  (doc 06 §C3 / doc 09 §4 / doc 02 §6.2 / doc 15); the Club's
 *  arithmetic sums to the canonical $61,500 across nineteen faces; the
 *  fragment's row matches the register; every option of every node
 *  resolves (N3c's not-tell with an EMPTY ledger \u2014 the Silent class,
 *  machine-checked); and no authored prose carries a real-world year
 *  (the C2 precedent \u2014 the scan allows no four-digit year anywhere). */
export function validateC3Pack(): C3PackReport {
  const problems: string[] = [];
  // the stations: the exact keys, each on its canon date
  const expectedKeys = C3_STATION_DAYS.join(',');
  const CANON_KEYS = '296,299,301,309,328,349,369,376,383,390,404,414,420,425,432,457,468';
  if (expectedKeys !== CANON_KEYS) {
    problems.push(`station keys are ${expectedKeys} (law: ${CANON_KEYS})`);
  }
  const canonDates: Readonly<Record<number, GameDate>> = {
    296: { y: 2, m: 7, d: 1 },
    299: { y: 2, m: 7, d: 4 },
    301: { y: 2, m: 7, d: 6 },
    309: { y: 2, m: 7, d: 14 },
    328: { y: 2, m: 8, d: 2 },
    349: { y: 2, m: 8, d: 23 },
    369: { y: 2, m: 9, d: 12 },
    376: { y: 2, m: 9, d: 19 },
    383: { y: 2, m: 9, d: 26 },
    390: { y: 2, m: 10, d: 3 },
    404: { y: 2, m: 10, d: 17 },
    414: { y: 2, m: 10, d: 27 },
    420: { y: 2, m: 11, d: 2 },
    425: { y: 2, m: 11, d: 7 },
    432: { y: 2, m: 11, d: 14 },
    457: { y: 2, m: 12, d: 9 },
    468: { y: 2, m: 12, d: 20 },
  };
  for (const day of C3_STATION_DAYS) {
    if (calendarDayOf(canonDates[day]!) !== day) {
      problems.push(`station ${day} does not land on its canon date through the calendar module`);
    }
  }
  // the compressions: from a station, to a station, ordered, the TWO cuts marked
  const cutPairs = C3_COMPRESSIONS.filter((c) => c.seasonCut).map((c) => `${c.from}\u2192${c.to}`);
  if (cutPairs.join(',') !== '349\u2192369,432\u2192457') {
    problems.push(`the season-cut flags belong to 349\u2192369 (summer\u2192fall) and 432\u2192457 (fall\u2192winter), got ${cutPairs.join(',')}`);
  }
  for (const c of C3_COMPRESSIONS) {
    if (!C3_STATIONS[c.from]) problems.push(`compression from ${c.from} is not a station`);
    if (!C3_STATIONS[c.to]) problems.push(`compression to ${c.to} is not a station`);
    if (c.to <= c.from) problems.push(`compression ${c.from}\u2192${c.to} does not move forward`);
    if (c.seasonCut) {
      const crossed = crossedSeasonCut(c.from, c.to);
      if (!crossed) problems.push(`compression ${c.from}\u2192${c.to} is flagged season-cut but crosses no season boundary`);
    }
  }
  // the queues: Idris opens, honest pays, five mouths
  for (const day of C3_STATION_DAYS) {
    const st = C3_STATIONS[day]!;
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
    if (!C3_CAPTIONS[day]) problems.push(`station ${day}: the postcard has no caption`);
  }
  // the canon lines, verbatim (doc 06 §C3 / doc 09 §4 / doc 02 §6.2 / doc 15)
  const verbatim: readonly [string, string, string][] = [
    [C3_EDDIE_KEYS_LINE, 'Don\u2019t lose them. Not the shop. Them.', 'doc 06 §C3 important conversations'],
    [C3_ELVANN_LINE, 'Developments fail, dear. Documents don\u2019t. They wait.', 'doc 06 §C3 event 2'],
    [C3_JUNE_VOICE_LINE, 'You do a voice when you\u2019re scared. It\u2019s a good voice. It\u2019s not yours.', 'doc 06 §C3 event 8 (doc 07\u2019s voice)'],
    [C3_DORIS_WARNING_LINE, 'You\u2019re a good boy the way Craig\u2019s a good boy. Watch it.', 'doc 06 §C3 event 7 (doc 08 §9.5\u2019s mercy)'],
    [C3_GINO_LINE, 'Your landlord\u2019s a good boy. Bad credit, but a good boy.', 'doc 06 §C3 important conversations'],
    [C3_Q_CRAIG, 'What is Craig\u2019s paper?', 'doc 06 §C3 diary developments'],
    [C3_MARISOL_KITCHEN_PHRASE, 'your vendors, your block, our kitchen', 'doc 06 §C3 event 4'],
  ];
  for (const [got, want, src] of verbatim) {
    if (got !== want) problems.push(`a canon line drifted from ${src} (verbatim law)`);
  }
  // the canon values + phrases (boolean rows, case-insensitive — the doc
  // quotes the phrases mid-card; the cards capitalize as sentence-starts)
  const phrases: readonly [string, string, string][] = [
    [C3_MARISOL_CARD_V1.toLowerCase(), 'doc 06 §C3 diary developments (Marisol v1)', 'the most dangerous person who will ever buy me lunch'],
    [C3_GINO_CARD_LINE.toLowerCase(), 'doc 06 §C3 diary developments (Gino)', 'reads naval history; eats olives like punctuation'],
    [C3_SUMMIT_NOTE, 'doc 06 §C3 event 3 (the blog\u2019s title)', 'The Man Who Feeds Alder Heights'],
  ];
  for (const [haystack, src, phrase] of phrases) {
    if (!haystack.toLowerCase().includes(phrase.toLowerCase())) {
      problems.push(`a canon phrase drifted from ${src} (verbatim law: "${phrase}")`);
    }
  }
  const values: readonly [number, number, string][] = [
    [C3_CLUB_TOTAL, 61500, 'doc 06 §C3 event 5 / doc 09 §4 (the raise)'],
    [C3_CLUB_INVESTORS, 19, 'doc 09 §4 (nineteen faces)'],
    [C3_ADA_ENVELOPE, 8000, 'doc 06 §C3 event 5 (Oct 3)'],
    [C3_WATER_FIX_DAYS, 11, 'doc 10 §4 (eleven days)'],
  ];
  for (const [got, want, src] of values) {
    if (got !== want) problems.push(`a canon value drifted from ${src} (verbatim law)`);
  }
  // the Club's arithmetic: the nineteen faces sum to the canonical raise
  let sum = 0;
  for (const s of C3_N3B_SLOTS) {
    const n = Number(s.amountLabel.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(n) || n <= 0) problems.push(`N3b slot ${s.slot}: the amount label is not a dollar row`);
    else sum += n;
  }
  if (sum !== C3_CLUB_TOTAL) problems.push(`the nineteen faces sum to ${sum} (law: $61,500)`);
  if (C3_N3B_SLOTS.length !== C3_CLUB_INVESTORS) problems.push(`the slot table holds ${C3_N3B_SLOTS.length} faces (law: 19)`);
  // the fragment: the pack reads the register (one source), the row is C3's
  try {
    const f2 = fragmentRow('F2');
    if (f2.chapter !== 'C3' || f2.trigger !== 'Eddie\u2019s hospital window') {
      problems.push('F2\u2019s register row is not C3\u2019s visiting-room window');
    }
    const f2Draft = f2Entry(309);
    if (f2Draft.kind !== 'RECALL' || f2Draft.epistemic !== 'RECALL') {
      problems.push('F2\u2019s entry is not the wobble style');
    }
  } catch (e) {
    problems.push(`the fragment register read failed: ${(e as Error).message}`);
  }
  // the picks: every option resolves; signatures pairwise unique; N3c's
  // not-tell resolves with an EMPTY ledger (the Silent class) and no ink
  for (const pack of [C3_N3A_PACK, C3_N3B_PACK, C3_N3C_PACK]) {
    const sigs = new Set<string>();
    for (const o of pack.options) {
      const apply = applyC3Pick(pack.nodeId, o.optionId, 296);
      if (!apply.ok) problems.push(`${pack.nodeId}/${o.optionId}: does not resolve through the register`);
      const sig = apply.ledger.map((l) => l.refs.join('|')).join('#');
      if (sig && sigs.has(sig)) problems.push(`${pack.nodeId}/${o.optionId}: a duplicate ledger signature`);
      if (sig) sigs.add(sig);
    }
  }
  const notTell = applyC3Pick('N3c', 'not-tell', 432);
  if (notTell.ok && (notTell.ledger.length !== 0 || notTell.diary !== null)) {
    problems.push('N3c/not-tell: the Silent class posted something (doc 10 §1 \u2014 the omission exists by absence)');
  }
  if (!notTell.flags.includes('trigger-4=absent')) {
    problems.push('N3c/not-tell: the flag is the only witness and it is missing');
  }
  const tell = applyC3Pick('N3c', 'tell-eddie', 432);
  if (tell.ok && tell.diary === null) problems.push('N3c/tell-eddie: the tell wrote no ink');
  // the rails: the last day is the cut, compression days map, outside is null
  if (c3RailFor(C3_LAST_DAY) !== 'cut') problems.push('the last day\u2019s linger must answer \u2018cut\u2019');
  if (c3RailFor(C3_FIRST_DAY - 1) !== null || c3RailFor(C3_LAST_DAY + 1) !== null) {
    problems.push('c3RailFor answers outside the chapter (the machine above owns those)');
  }
  for (const c of C3_COMPRESSIONS) {
    const r = c3RailFor(c.from);
    if (!r || typeof r !== 'object' || r.compress !== c.to) {
      problems.push(`c3RailFor(${c.from}) does not answer the compression to ${c.to}`);
    }
  }
  // the cut: the entry is dated the window start through the calendar module
  const cut = c3CutEntry();
  const cutDate = dateOfCalendarDay(C3_CUT_DAY);
  if (cutDate.y !== 3 || cutDate.m !== 1 || cutDate.d !== 6) {
    problems.push(`the cut's morning is ${JSON.stringify(cutDate)} (law: Jan 6, Y3)`);
  }
  if (cut.date.y !== cutDate.y || cut.date.m !== cutDate.m || cut.date.d !== cutDate.d) {
    problems.push('the cut\u2019s entry is not dated the window start');
  }
  // no real-world years in the authored prose (the C2 precedent)
  const prose: string[] = [
    ...C3_STATION_DAYS.map((d) => C3_STATIONS[d]!.begin),
    ...C3_STATION_DAYS.map((d) => C3_STATIONS[d]!.wake),
    ...C3_STATION_DAYS.map((d) => C3_STATIONS[d]!.rushDone),
    ...C3_STATION_DAYS.map((d) => C3_STATIONS[d]!.climbNote),
    ...C3_STATION_DAYS.map((d) => C3_STATIONS[d]!.goldenNote),
    ...C3_COMPRESSIONS.map((c) => c.intro),
    C3_CUT_STAGE, C3_CUT_WALL, c3CutEntry().body,
    C3_NETWORKING_BODY, C3_VIOLATION_GONE_NOTE, C3_CAMILLE_CARD_LINE,
  ];
  for (const p of prose) {
    if (/\b(1[0-9]{3}|20[0-9]{2})\b/.test(p)) {
      problems.push('an authored line carries a four-digit real-world year (the canon law: apostrophe form only)');
      break;
    }
  }
  return { ok: problems.length === 0, problems };
}
