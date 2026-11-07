/**
 * sim/life.ts — the majors' off-screen lives (narrative/14 R5, §7 step 4;
 * doc 07 §7's off-screen tick spec; Phase 4's first machine, Workstream B).
 *
 * The City-Moves Law (doc 01 §5.1) made binding: "every arc runs on its
 * own clock. 'Without Leo' lines are binding default trajectories, not
 * contingencies" (doc 07 §1). This module is that law as a machine:
 *
 *  - **16 majors** (doc 07 §2.1–2.16) each carry an authored arc: a
 *    disclosure threshold (doc 07 §3's implementable gossip rule), mood
 *    rules (three states + recovery — doc 14 R5), calendar events
 *    (income/appointments/passings on their own clock), and per-chapter
 *    independent decisions (doc 07 §7: "one independent decision per
 *    chapter (already listed in this doc's beats)").
 *  - **The default trajectory is the without-Leo line.** A decision
 *    fires its `defaultVariant` unless the player has engaged the major
 *    (the shipped `flag:<id>_greeted` hello — the durable, save-carried
 *    engagement signal from `WorldRuntime.recordGreeting`), in which case
 *    the `engagedVariant` fires where doc 07 documents a difference.
 *    Majors whose arcs are Leo-independent (Wexler, Gino, Doris, Idris)
 *    carry shared/default-only entries — the canon's "identical" is data.
 *  - **No personality transplants** (doc 07 §7): every mood move and
 *    every decision comes from the authored tables below, each with its
 *    doc 07 citation. Nothing is invented at tick time; `validateMajors`
 *    and the tests fail an uncited entry.
 *  - **Supporting cast simulate presence and news only** (doc 07 §7):
 *    the machine's type has no slot for them — scope enforced by shape.
 *
 * The tick is pure, deterministic-from-save, and never rewinds: it
 * catches up day by day from `lastTickDay`, keyed by the world's own
 * chapter container (injected per day by the caller — the machine does
 * not import core) and by the greeted flags' stored ticks (a flag set on
 * day D counts from day D forward — engagement is monotonic). State
 * rides the WORLD save as an optional trailing v1-safe field (the
 * chapter+rails law at world scale): absent reads fresh and heals
 * forward; corrupt quarantines, never crashes.
 */

import { dayOfCanonDate } from './clock';

// ------------------------------------------------------------------ mood ----

/** The three mood states (doc 14 R5; doc 07 §7). */
export type Mood = 'steady' | 'strained' | 'bitter';
export const MOODS: readonly Mood[] = ['steady', 'strained', 'bitter'];

/** The mood graph. Recovery is a LAW, not a hope: bitter is not absorbing
 *  — a rule may walk a major back (demonstrated by the authored rules:
 *  Eddie C4's counter rhythm, Deshaun C4's pinning). Sudden ruin is also
 *  canon (Craig's C2 sale — "worse for everyone, especially him"), so
 *  steady→bitter is legal; no rule → no move (the no-transplant law). */
export const MOOD_TRANSITIONS: Readonly<Record<Mood, readonly Mood[]>> = {
  steady: ['steady', 'strained', 'bitter'],
  strained: ['steady', 'bitter'],
  bitter: ['strained', 'steady'],
};

/** Availability, machine-granular (doc 07 §7: "majors simulate decisions
 *  and availability"). `held` = an authored hold (rehab, sabbatical);
 *  `withdrawn` = the arc left the block (Camille's exit, Doris's passing,
 *  Eddie's Junior's years on the default path). */
export type Availability = 'available' | 'held' | 'withdrawn';

// ------------------------------------------------------------- authored ----

/** Which engagement path a rule/branch keys on. */
export type Engagement = 'default' | 'engaged';

export interface LifeVariant {
  /** The transcribed beat — doc 07's own words, compressed, never invented. */
  readonly detail: string;
  /** The doc 07 § that says it. A variant without a cite fails validation. */
  readonly cite: string;
}

export interface LifeDecision {
  /** 0 = C0 … 6 = C6 (the world chapter container's numbering). */
  readonly chapter: number;
  /** The binding default (the without-Leo line). Null = the canon's
   *  silence: no independent decision that chapter on the default path. */
  readonly defaultVariant: LifeVariant | null;
  /** Fires when greeted. Null = engagement does not change this chapter. */
  readonly engagedVariant: LifeVariant | null;
}

export interface LifeMoodRule {
  readonly chapter: number;
  readonly when: Engagement | 'any';
  readonly mood: Mood;
  readonly cite: string;
}

export interface LifeCalendarEvent {
  /** Canon date key (doc 07's own dates — Sept 14, Jul 6). */
  readonly date?: { y: number; m: number; d: number };
  /** Chapter key (fires the first simulated day inside the chapter). */
  readonly chapter?: number;
  readonly when?: Engagement | 'any';
  readonly detail: string;
  readonly cite: string;
  /** Some canon events move availability (the rehab, the sabbatical). */
  readonly availability?: Availability;
}

export interface MajorArc {
  /** The npc local id — `npc:<id>` in the registry, `flag:<id>_greeted`
   *  in the world flags (the two vocabularies this machine reads). */
  readonly id: string;
  readonly name: string;
  /** Doc 07 §3's implementable rule: "every character has a disclosure
   *  threshold — the hurt that makes them talk". The canon speaks
   *  qualitatively; the machine needs a total order — low/medium/high,
   *  each justified by its cited line (variance documented in the
   *  register; the level is data, the physics is the gossip law's). */
  readonly disclosure: { level: 'low' | 'medium' | 'high'; cite: string };
  readonly decisions: readonly LifeDecision[];
  readonly moodRules: readonly LifeMoodRule[];
  readonly calendar: readonly LifeCalendarEvent[];
}

/** The 16 majors (doc 07 §2, order preserved). Every entry cites its §. */
export const MAJORS: readonly MajorArc[] = [
  {
    id: 'eddie_carrasco', name: 'Eddie Carrasco',
    disclosure: { level: 'medium', cite: 'doc 07 §2.1 — never tells Leo about the Gino-era favor; the lease war is public anyway' },
    decisions: [
      { chapter: 2, defaultVariant: { detail: 'the lease war goes worse — no renewal', cite: 'doc 07 §2.1 without-Leo' }, engagedVariant: { detail: 'the renewal he didn\u2019t earn honestly — his relief is total and his eyes aren\u2019t', cite: 'doc 07 §2.1 C2' } },
      { chapter: 3, defaultVariant: { detail: 'loses the shop in C3, sells the name to a midtown operator', cite: 'doc 07 §2.1 without-Leo' }, engagedVariant: { detail: 'the heart attack (Jul 6); the keys; rehab at Junior\u2019s', cite: 'doc 07 §2.1 C3' } },
      { chapter: 4, defaultVariant: { detail: 'spends C4\u2013C6 at Junior\u2019s, alive and diminished', cite: 'doc 07 §2.1 without-Leo' }, engagedVariant: { detail: 'three days a week behind the counter', cite: 'doc 07 §2.1 C4' } },
      { chapter: 6, defaultVariant: { detail: 'the ritual dies with the corner', cite: 'doc 07 §2.1 without-Leo' }, engagedVariant: { detail: 'the floor in Charlotte, offered twice; his health holds', cite: 'doc 07 §2.1 C6' } },
    ],
    moodRules: [
      { chapter: 3, when: 'engaged', mood: 'strained', cite: 'doc 07 §2.1 C3 — the heart attack' },
      { chapter: 4, when: 'engaged', mood: 'steady', cite: 'doc 07 §2.1 C4 — the counter rhythm (the recovery path)' },
      { chapter: 4, when: 'default', mood: 'strained', cite: 'doc 07 §2.1 without-Leo — alive and diminished' },
    ],
    calendar: [
      { date: { y: 2, m: 7, d: 6 }, when: 'engaged', detail: 'the heart attack', cite: 'doc 07 §2.1 C3 (Jul 6)', availability: 'held' },
    ],
  },
  {
    id: 'rosa_delgado', name: 'Rosa Delgado',
    disclosure: { level: 'low', cite: 'doc 07 §2.2 — load-bearing, not nice; hospitality as judgment, her sharpest tool' },
    decisions: [
      { chapter: 2, defaultVariant: { detail: 'the anniversary toast; the withdrawal of warmth as method', cite: 'doc 07 §2.2 C2' }, engagedVariant: null },
      { chapter: 3, defaultVariant: { detail: 'lends the cigar box\u2019s history (Y-11, the down payment she owes Doris for)', cite: 'doc 07 §2.2 C3' }, engagedVariant: null },
      { chapter: 5, defaultVariant: { detail: 'the terminal line fires — at Yoli, in the ignore-spine world', cite: 'doc 07 §2.2 without-Leo' }, engagedVariant: { detail: 'the terminal line — at whoever walks up the stairs broken', cite: 'doc 07 §2.2 C5' } },
      { chapter: 6, defaultVariant: { detail: 'the cigar box\u2019s last page; she redeems exactly one IOU ever', cite: 'doc 07 §2.2 C6' }, engagedVariant: null },
    ],
    moodRules: [],
    calendar: [],
  },
  {
    id: 'yolanda_ferreira', name: 'Yolanda "Yoli" Ferreira',
    disclosure: { level: 'medium', cite: 'doc 07 §2.3 — "We\u2019re not going to eat him. We\u2019re going to out-organize him."' },
    decisions: [
      { chapter: 1, defaultVariant: { detail: 'the freezer drive', cite: 'doc 07 §2.3 C1' }, engagedVariant: null },
      { chapter: 2, defaultVariant: { detail: 'the Compact dies in C2 of Craig\u2019s refusal', cite: 'doc 07 §2.3 without-Leo' }, engagedVariant: { detail: 'builds the Compact; is broken by it with Leo\u2019s hand', cite: 'doc 07 §2.3 C2' } },
      { chapter: 3, defaultVariant: { detail: 'rebuilds smaller, hardens earlier, starts the title search a year sooner out of pure spite', cite: 'doc 07 §2.3 without-Leo' }, engagedVariant: { detail: 'rebuilds smaller: the garden, the hearing testimony, the paperwork of resistance', cite: 'doc 07 §2.3 C3' } },
      { chapter: 4, defaultVariant: { detail: 'the title search already running (started a year sooner)', cite: 'doc 07 §2.3 without-Leo' }, engagedVariant: { detail: 'takes Kev in; starts the title search that ends in El Vann\u2019s paper wall', cite: 'doc 07 §2.3 C4' } },
      { chapter: 5, defaultVariant: { detail: 'the coalition\u2019s darkest hour — the receipts she hated become the leverage she needs', cite: 'doc 07 §2.3 C5' }, engagedVariant: null },
      { chapter: 6, defaultVariant: { detail: 'wins the C6 hearing by a wider margin', cite: 'doc 07 §2.3 without-Leo' }, engagedVariant: { detail: 'runs for council, loses 38\u201362, and wins the thing she actually wanted — the Compact papers enter the record', cite: 'doc 07 §2.3 C6' } },
    ],
    moodRules: [
      { chapter: 3, when: 'default', mood: 'strained', cite: 'doc 07 §2.3 without-Leo — hardens earlier' },
    ],
    calendar: [],
  },
  {
    id: 'kevin_okafor', name: 'Kevin "Kev" Okafor',
    disclosure: { level: 'medium', cite: 'doc 07 §2.4 — "Don\u2019t be sorry at me. Be sorry at my mother."; the screenshots folder grows' },
    decisions: [
      { chapter: 1, defaultVariant: { detail: 'weekend counter; the lanyard (F6\u2019s trigger)', cite: 'doc 07 §2.4 C0\u2013C1' }, engagedVariant: null },
      { chapter: 2, defaultVariant: { detail: 'stays a counter kid, saves for a certified course', cite: 'doc 07 §2.4 without-Leo' }, engagedVariant: { detail: 'full-time; the college denial; $200/mo to Grace', cite: 'doc 07 §2.4 C2' } },
      { chapter: 3, defaultVariant: null, engagedVariant: { detail: 'Leo\u2019s prot\u00e9g\u00e9 — doors open; he confuses access with belonging', cite: 'doc 07 §2.4 C3' } },
      { chapter: 4, defaultVariant: null, engagedVariant: { detail: 'the pledge video; the audit; the meme; the screenshots folder grows', cite: 'doc 07 §2.4 C4' } },
      { chapter: 5, defaultVariant: { detail: 'gets the certified course on his own, and is fine', cite: 'doc 07 §2.4 without-Leo' }, engagedVariant: { detail: 'the receipts handover — his decision, argued with himself for six weeks', cite: 'doc 07 §2.4 C5' } },
      { chapter: 6, defaultVariant: { detail: 'fine — the version of his life the Club\u2019s collapse interrupted', cite: 'doc 07 §2.4 without-Leo' }, engagedVariant: { detail: 'the amends path, or still at Halcyon\u2019s bar telling the story wrong', cite: 'doc 07 §2.4 C6' } },
    ],
    moodRules: [
      { chapter: 5, when: 'engaged', mood: 'strained', cite: 'doc 07 §2.4 C5 — famous for the worst reason in his life' },
      { chapter: 6, when: 'default', mood: 'steady', cite: 'doc 07 §2.4 without-Leo — he\u2019s fine' },
    ],
    calendar: [],
  },
  {
    id: 'june_park', name: 'June Park',
    disclosure: { level: 'high', cite: 'doc 07 §2.5 — the conditions issued once, non-negotiable; privacy as the floor' },
    decisions: [
      { chapter: 1, defaultVariant: { detail: 'the DOB wall', cite: 'doc 07 §2.5 C1' }, engagedVariant: null },
      { chapter: 2, defaultVariant: { detail: 'opening; the lease with the same paperstock as Eddie\u2019s', cite: 'doc 07 §2.5 C2' }, engagedVariant: null },
      { chapter: 4, defaultVariant: { detail: 'her brother\u2019s envelope gets used for a rehab deposit', cite: 'doc 07 §2.5 without-Leo' }, engagedVariant: { detail: 'the diary discovery — her conditions, issued once, non-negotiable', cite: 'doc 07 §2.5 C4' } },
      { chapter: 6, defaultVariant: { detail: 'a person at peace, annoyed only at the timeline', cite: 'doc 07 §2.5 without-Leo' }, engagedVariant: { detail: 'the slow restart — one shift a week at Halcyon, which in her language is a betrothal', cite: 'doc 07 §2.5 C6' } },
    ],
    moodRules: [],
    calendar: [],
  },
  {
    id: 'marisol_quintero', name: 'Marisol Quintero',
    disclosure: { level: 'high', cite: 'doc 07 §2.6 — technical truth; testifies accurately, never once lies on the record, never volunteers' },
    decisions: [
      { chapter: 2, defaultVariant: null, engagedVariant: { detail: 'the coffee that isn\u2019t a pitch', cite: 'doc 07 §2.6 C2' } },
      { chapter: 3, defaultVariant: { detail: 'Corvus hires Grant Mercer — the project is six months slower, 60 units stingier, and she wins everything anyway', cite: 'doc 07 §2.6 without-Leo + §8' }, engagedVariant: { detail: 'the offer', cite: 'doc 07 §2.6 C3' } },
      { chapter: 6, defaultVariant: null, engagedVariant: { detail: 'the late offer: "You were the best community face I ever hired."', cite: 'doc 07 §2.6 C6' } },
    ],
    moodRules: [],
    calendar: [],
  },
  {
    id: 'dane_wexler', name: 'Dane Wexler',
    disclosure: { level: 'high', cite: 'doc 07 §2.7 — procedural armor' },
    decisions: [
      { chapter: 5, defaultVariant: { detail: 'the Compact papers meet his procedural armor; he negotiates the concessions with genuine professional grace', cite: 'doc 07 §2.7 C5' }, engagedVariant: null },
      { chapter: 6, defaultVariant: { detail: 'the partnership, the boat, the irony intact', cite: 'doc 07 §2.7 C6' }, engagedVariant: null },
    ],
    moodRules: [],
    calendar: [],
  },
  {
    id: 'gino_trabucco', name: 'Gino Trabucco',
    disclosure: { level: 'high', cite: 'doc 07 §2.8 — "I discussed sandwiches. I\u2019m a generous man."' },
    decisions: [
      { chapter: 4, defaultVariant: { detail: 'Craig\u2019s paper at 60 cents ("helping a neighbor")', cite: 'doc 07 §2.8 C4' }, engagedVariant: null },
      { chapter: 6, defaultVariant: null, engagedVariant: { detail: 'sends a fruit basket to the diner Leo works at. No note.', cite: 'doc 07 §2.8 C6' } },
    ],
    moodRules: [],
    calendar: [],
  },
  {
    id: 'craig_hollis', name: 'Craig Hollis',
    disclosure: { level: 'low', cite: 'doc 07 §2.9 — the man everyone is kind to and no one sits with; he talks to everyone' },
    decisions: [
      { chapter: 1, defaultVariant: { detail: 'the charming squeeze', cite: 'doc 07 §2.9 C1' }, engagedVariant: null },
      { chapter: 2, defaultVariant: { detail: 'sells the row in C2, faster and sloppier; Doris lives to see it', cite: 'doc 07 §2.9 without-Leo' }, engagedVariant: { detail: 'the re-rating wave; the quiet drink after', cite: 'doc 07 §2.9 C2' } },
      { chapter: 3, defaultVariant: null, engagedVariant: { detail: 'the books fight with Doris; the drinking deepens', cite: 'doc 07 §2.9 C3' } },
      { chapter: 4, defaultVariant: null, engagedVariant: { detail: 'SaniHaul\u2019s paper', cite: 'doc 07 §2.9 C4' } },
      { chapter: 5, defaultVariant: null, engagedVariant: { detail: 'sells the row — the chapter\u2019s structural act; briefly, horribly relieved', cite: 'doc 07 §2.9 C5' } },
      { chapter: 6, defaultVariant: { detail: 'Fort Lauderdale again, managing a marina', cite: 'doc 07 §2.9 C6' }, engagedVariant: null },
    ],
    moodRules: [
      { chapter: 2, when: 'default', mood: 'bitter', cite: 'doc 07 §2.9 without-Leo — Doris lives to see it, which is worse for everyone, especially him' },
      { chapter: 3, when: 'engaged', mood: 'strained', cite: 'doc 07 §2.9 C3 — the drinking deepens' },
    ],
    calendar: [],
  },
  {
    id: 'doris_hollis', name: 'Doris Hollis',
    disclosure: { level: 'low', cite: 'doc 07 §2.10 — true-thing-last at the door; the ledger she keeps in her head' },
    decisions: [
      { chapter: 1, defaultVariant: { detail: 'the sabbatical that isn\u2019t', cite: 'doc 07 §2.10 C1\u2013C2' }, engagedVariant: null },
      { chapter: 3, defaultVariant: { detail: 'back; sharp; true-thing-last', cite: 'doc 07 §2.10 C3' }, engagedVariant: null },
      { chapter: 4, defaultVariant: { detail: 'the boiler math; the El Vann letter\u2019s existence hinted', cite: 'doc 07 §2.10 C4' }, engagedVariant: null },
    ],
    moodRules: [],
    calendar: [
      { chapter: 1, detail: 'the sabbatical that isn\u2019t (held through C2)', cite: 'doc 07 §2.10 C1\u2013C2', availability: 'held' },
      { date: { y: 3, m: 9, d: 14 }, detail: 'dies Sept 14 — the conflict\u2019s hinge, on her own clock, unrelated to Leo', cite: 'doc 07 §2.10 C5', availability: 'withdrawn' },
    ],
  },
  {
    id: 'priya_nair', name: 'Priya Nair',
    disclosure: { level: 'high', cite: 'doc 07 §2.11 — files it under "not mine to say"; the system\u2019s memory, not its hand' },
    decisions: [
      { chapter: 1, defaultVariant: { detail: 'the intel economy (trades, never gifts)', cite: 'doc 07 §2.11 C1\u2013C3' }, engagedVariant: null },
      { chapter: 4, defaultVariant: { detail: 'watches Craig\u2019s schedule-riding and files it under not mine to say', cite: 'doc 07 §2.11 C4' }, engagedVariant: null },
      { chapter: 5, defaultVariant: { detail: 'the handover — the ledger she sat on; the pricing of neutrality (it happens anyway; Reyes\u2019s need is independent)', cite: 'doc 07 §2.11 C5 + without-Leo' }, engagedVariant: null },
      { chapter: 6, defaultVariant: { detail: 'gives the station-stamp album to Eli: "Start late. Finish anyway."', cite: 'doc 07 §2.11 C6' }, engagedVariant: null },
    ],
    moodRules: [],
    calendar: [],
  },
  {
    id: 'deshaun_carter', name: 'Deshaun Carter',
    disclosure: { level: 'medium', cite: 'doc 07 §2.12 — six months of no contact, then a diner booth: "Start talking, and don\u2019t do the voice."' },
    decisions: [
      { chapter: 0, defaultVariant: { detail: 'the platform save', cite: 'doc 07 §2.12 C0' }, engagedVariant: null },
      { chapter: 1, defaultVariant: { detail: 'the study group', cite: 'doc 07 §2.12 C1\u2013C2' }, engagedVariant: null },
      { chapter: 3, defaultVariant: { detail: 'passes the paramedic exam the first time', cite: 'doc 07 §2.12 without-Leo' }, engagedVariant: { detail: 'fails the paramedic exam — his own chapter, unconnected to any plot event', cite: 'doc 07 §2.12 C3' } },
      { chapter: 4, defaultVariant: null, engagedVariant: { detail: 'passes it on the retake; the pinning ceremony is the block\u2019s best party of the year', cite: 'doc 07 §2.12 C4' } },
      { chapter: 5, defaultVariant: { detail: 'Verna never invests; his life is better and he\u2019d never once say so', cite: 'doc 07 §2.12 without-Leo' }, engagedVariant: { detail: 'Verna\u2019s $2,300 — he doesn\u2019t abandon Leo; he invoices him', cite: 'doc 07 §2.12 C5' } },
      { chapter: 6, defaultVariant: { detail: 'the cousin\u2019s cousin job', cite: 'doc 07 §2.12 C6' }, engagedVariant: { detail: 'the cousin\u2019s cousin job; the amends ledger\u2019s most forgiving creditor', cite: 'doc 07 §2.12 C6' } },
    ],
    moodRules: [
      { chapter: 3, when: 'engaged', mood: 'strained', cite: 'doc 07 §2.12 C3 — the failed exam' },
      { chapter: 4, when: 'engaged', mood: 'steady', cite: 'doc 07 §2.12 C4 — passes on the retake (the recovery path)' },
    ],
    calendar: [],
  },
  {
    id: 'idris_warsame', name: 'Mr. Idris Warsame',
    disclosure: { level: 'high', cite: 'doc 07 §2.13 — refuses to speak and thereby speaks loudest; silence as speech' },
    decisions: [
      { chapter: 5, defaultVariant: null, engagedVariant: { detail: 'refuses to speak at the garden reckoning and thereby speaks loudest', cite: 'doc 07 §2.13 C5' } },
      { chapter: 6, defaultVariant: { detail: 'the fajr walk continues', cite: 'doc 07 §2.13 C6' }, engagedVariant: null },
    ],
    moodRules: [],
    calendar: [],
  },
  {
    id: 'deniz_oktay', name: 'Deniz Oktay',
    disclosure: { level: 'medium', cite: 'doc 07 §2.14 — she is not cruel; she is bookkeeping; publishes on the record, deliberately' },
    decisions: [
      { chapter: 2, defaultVariant: { detail: 'the displacement; the sign-in sheet photographed (the store still dies)', cite: 'doc 07 §2.14 C2 + without-Leo' }, engagedVariant: null },
      { chapter: 3, defaultVariant: { detail: 'Halcyon\u2019s bar; the receipts live at the back office from C3', cite: 'doc 07 §2.14 C3 + doc 07 §3' }, engagedVariant: null },
      { chapter: 4, defaultVariant: { detail: 'annotates; waits; her discipline is the story\u2019s scariest virtue', cite: 'doc 07 §2.14 C4' }, engagedVariant: null },
      { chapter: 5, defaultVariant: { detail: 'publishes Craig\u2019s paper trail instead — a smaller, colder story, and she wins it smaller and colder', cite: 'doc 07 §2.14 without-Leo' }, engagedVariant: { detail: 'publishes — her scene with Leo is the fall\u2019s moral center', cite: 'doc 07 §2.14 C5' } },
      { chapter: 6, defaultVariant: { detail: 'sits the CPA exam', cite: 'doc 07 §2.14 C6' }, engagedVariant: { detail: 'sits the CPA exam; the amends she accepts is the deposition, on the record, forever', cite: 'doc 07 §2.14 C6' } },
    ],
    moodRules: [],
    calendar: [],
  },
  {
    id: 'rachel_voss', name: 'Rachel Voss',
    disclosure: { level: 'high', cite: 'doc 07 §2.15 — "she will never again be anyone\u2019s self-improvement project, including his."' },
    decisions: [
      { chapter: 4, defaultVariant: { detail: 'never appears; her arc happens entirely off-screen and is fine', cite: 'doc 07 §2.15 without-Leo' }, engagedVariant: { detail: 'the gallery; the circling; the payphone mention (once, flat)', cite: 'doc 07 §2.15 C4' } },
      { chapter: 5, defaultVariant: null, engagedVariant: { detail: 'the 1 a.m. call: "You did this in Ohio too."', cite: 'doc 07 §2.15 C5' } },
      { chapter: 6, defaultVariant: { detail: 'got her shop — the block heard, the block approves', cite: 'doc 07 §2.15 without-Leo + epilogue line' }, engagedVariant: { detail: 'friendship only — the metal-shop visit, her teaching him to weld badly', cite: 'doc 07 §2.15 C6' } },
    ],
    moodRules: [],
    calendar: [],
  },
  {
    id: 'camille_odom', name: 'Camille Odom',
    disclosure: { level: 'high', cite: 'doc 07 §2.16 — the quiet exit on her terms; a Tuesday that repeats' },
    decisions: [
      { chapter: 3, defaultVariant: { detail: 'the pantry; the alternative life made specific', cite: 'doc 07 §2.16 C3' }, engagedVariant: null },
      { chapter: 4, defaultVariant: { detail: 'the exit on her terms', cite: 'doc 07 §2.16 C4' }, engagedVariant: null },
      { chapter: 5, defaultVariant: { detail: 'the pantry gets its funding from a Reyes earmark; she never transfers', cite: 'doc 07 §2.16 without-Leo' }, engagedVariant: null },
      { chapter: 6, defaultVariant: null, engagedVariant: { detail: 'one letter arrives — not a reconciliation; a reference: the pantry needs a logistics volunteer', cite: 'doc 07 §2.16 C6' } },
    ],
    moodRules: [],
    calendar: [
      { chapter: 4, detail: 'the exit on her terms (off the block from C4)', cite: 'doc 07 §2.16 C4', availability: 'withdrawn' },
    ],
  },
];

export const MAJOR_IDS: readonly string[] = MAJORS.map((m) => m.id);

// ---------------------------------------------------------------- state ----

/** One major's machine state. Serializable, save-carried. */
export interface MajorLife {
  mood: Mood;
  availability: Availability;
  /** Fired independent decisions (≤ one per chapter — the tick enforces). */
  decisions: Array<{ chapter: number; variant: string; via: Engagement; day: number }>;
  /** Durable notes: calendar events + mood moves (bounded — authored data). */
  notes: Array<{ day: number; kind: 'calendar' | 'mood'; detail: string }>;
  lastDay: number;
}

export interface LifeState {
  majors: Record<string, MajorLife>;
  /** The last day the tick processed. Never rewinds. */
  lastTickDay: number;
}

export function freshLifeState(): LifeState {
  const majors: Record<string, MajorLife> = {};
  for (const arc of MAJORS) {
    majors[arc.id] = { mood: 'steady', availability: 'available', decisions: [], notes: [], lastDay: 0 };
  }
  return { majors, lastTickDay: 0 };
}

/** Parse a saved life state (v1-safe): absent/corrupt → fresh + note (the
 *  map-notebook precedent — never a crash). Shape-checked, not trusted. */
export function parseLifeState(raw: unknown): { life: LifeState; note?: string } {
  const fresh = () => ({ life: freshLifeState(), note: undefined as string | undefined });
  if (raw === undefined || raw === null) return fresh();
  if (typeof raw !== 'object') return { life: freshLifeState(), note: 'life: not an object → fresh' };
  const d = raw as { lastTickDay?: unknown; majors?: Record<string, unknown> };
  if (typeof d.lastTickDay !== 'number' || !isFinite(d.lastTickDay) || d.lastTickDay < 0) {
    return { life: freshLifeState(), note: 'life: bad lastTickDay → fresh' };
  }
  if (!d.majors || typeof d.majors !== 'object') {
    return { life: freshLifeState(), note: 'life: no majors map → fresh' };
  }
  const life = freshLifeState();
  life.lastTickDay = Math.floor(d.lastTickDay);
  for (const arc of MAJORS) {
    const m = d.majors[arc.id];
    if (!m || typeof m !== 'object') continue; // absent major heals forward as fresh
    const r = m as Partial<MajorLife>;
    const out = life.majors[arc.id];
    if (r.mood && MOODS.includes(r.mood)) out.mood = r.mood;
    if (r.availability === 'available' || r.availability === 'held' || r.availability === 'withdrawn') {
      out.availability = r.availability;
    }
    if (Array.isArray(r.decisions)) {
      for (const dec of r.decisions) {
        if (dec && typeof dec === 'object' && typeof (dec as { chapter?: unknown }).chapter === 'number'
          && typeof (dec as { variant?: unknown }).variant === 'string'
          && ((dec as { via?: unknown }).via === 'default' || (dec as { via?: unknown }).via === 'engaged')
          && typeof (dec as { day?: unknown }).day === 'number') {
          const v = dec as { chapter: number; variant: string; via: Engagement; day: number };
          out.decisions.push({ chapter: v.chapter, variant: v.variant, via: v.via, day: Math.floor(v.day) });
        }
      }
    }
    if (Array.isArray(r.notes)) {
      for (const n of r.notes) {
        if (n && typeof n === 'object' && typeof (n as { day?: unknown }).day === 'number'
          && typeof (n as { detail?: unknown }).detail === 'string'
          && ((n as { kind?: unknown }).kind === 'calendar' || (n as { kind?: unknown }).kind === 'mood')) {
          const v = n as { day: number; kind: 'calendar' | 'mood'; detail: string };
          out.notes.push({ day: Math.floor(v.day), kind: v.kind, detail: v.detail });
        }
      }
    }
    if (typeof r.lastDay === 'number' && isFinite(r.lastDay)) out.lastDay = Math.floor(r.lastDay);
  }
  return { life, note: undefined };
}

// ------------------------------------------------------------------ tick ----

export interface LifeEvent {
  kind: 'decision' | 'mood' | 'calendar';
  majorId: string;
  day: number;
  detail: string;
  cite: string;
  via?: Engagement;
}

export interface LifeTickCtx {
  /** Tick up to and including this day (never rewinds: a smaller toDay is
   *  a no-op — the calendar never negotiates, doc 12 §6). */
  toDay: number;
  /** The chapter container's number for a given canon day (0=C0 … 6=C6,
   *  7=OPEN). Injected by the caller — the machine does not import core;
   *  the world binding maps through core/chapters' `chapterAtDay`. */
  chapterForDay: (day: number) => number;
  /** `flag:<id>_greeted`'s stored tick per major (undefined = never
   *  greeted). A flag set on day D counts from day D forward. */
  greetedTicks: Record<string, number | undefined>;
}

/** Day → the tick-exclusive end of that day (day D covers ticks
 *  [(D-1)*1440, D*1440) — the clock's own law, 1 tick = 1 minute). */
function dayEndTick(day: number): number { return day * 1440; }

/** Advance the majors' lives day by day. Pure: the input state is never
 *  mutated (the caller replaces its reference with the result's). */
export function tickLife(life: LifeState, ctx: LifeTickCtx): LifeTickResult {
  const events: LifeEvent[] = [];
  const toDay = Math.floor(ctx.toDay);
  if (toDay <= life.lastTickDay) return { life, events }; // never rewinds
  // deep-copy once, mutate the copy day by day
  const majors: Record<string, MajorLife> = {};
  for (const arc of MAJORS) {
    const src = life.majors[arc.id] ?? { mood: 'steady' as Mood, availability: 'available' as Availability, decisions: [], notes: [], lastDay: 0 };
    majors[arc.id] = {
      mood: src.mood,
      availability: src.availability,
      decisions: src.decisions.map((d) => ({ ...d })),
      notes: src.notes.map((n) => ({ ...n })),
      lastDay: src.lastDay,
    };
  }
  const out: LifeState = { majors, lastTickDay: life.lastTickDay };

  for (let day = out.lastTickDay + 1; day <= toDay; day++) {
    const chapter = ctx.chapterForDay(day);
    for (const arc of MAJORS) {
      const st = majors[arc.id];
      if (st.lastDay >= day) continue; // per-major rewind guard
      const greetedTick = ctx.greetedTicks[arc.id];
      const engaged = greetedTick !== undefined && greetedTick < dayEndTick(day);
      const via: Engagement = engaged ? 'engaged' : 'default';

      // 1. calendar events: date-keyed fire on their canon day;
      //    chapter-keyed fire the first day this major sees the chapter.
      for (const ev of arc.calendar) {
        const fires = ev.date !== undefined
          ? dayOfCanonDate(ev.date) === day
          : ev.chapter === chapter && !st.notes.some((n) => n.kind === 'calendar' && n.detail === ev.detail);
        if (!fires) continue;
        if (ev.when && ev.when !== 'any' && ev.when !== via) continue;
        st.notes.push({ day, kind: 'calendar', detail: ev.detail });
        events.push({ kind: 'calendar', majorId: arc.id, day, detail: ev.detail, cite: ev.cite });
        if (ev.availability) st.availability = ev.availability;
      }

      // 2. mood rules: first day inside their chapter, engagement-gated,
      //    transition-legal (the graph is the recovery law).
      for (const rule of arc.moodRules) {
        if (rule.chapter !== chapter) continue;
        if (rule.when !== 'any' && rule.when !== via) continue;
        if (st.mood === rule.mood) continue;
        if (!MOOD_TRANSITIONS[st.mood].includes(rule.mood)) continue;
        st.mood = rule.mood;
        st.notes.push({ day, kind: 'mood', detail: `${rule.mood} (${rule.cite})` });
        events.push({ kind: 'mood', majorId: arc.id, day, detail: rule.mood, cite: rule.cite });
      }

      // 3. the chapter's independent decision — at most one per chapter
      //    (doc 07 §7); the binding default is the without-Leo line. The
      //    canon's silence is data: a decision with no defaultVariant
      //    fires ONLY on the engaged path (the default path's silence is
      //    the without-Leo trajectory's own shape — no invented beat).
      const dec = arc.decisions.find((d) => d.chapter === chapter);
      if (dec && !st.decisions.some((d) => d.chapter === chapter)) {
        const variant = via === 'engaged' ? (dec.engagedVariant ?? dec.defaultVariant) : dec.defaultVariant;
        if (variant) {
          st.decisions.push({ chapter, variant: variant.detail, via, day });
          events.push({ kind: 'decision', majorId: arc.id, day, detail: variant.detail, cite: variant.cite, via });
        }
      }

      st.lastDay = day;
    }
    out.lastTickDay = day;
  }
  return { life: out, events };
}

export interface LifeTickResult {
  life: LifeState;
  events: LifeEvent[];
}

// ------------------------------------------------------------ validation ----

export interface LifeValidationIssue { rule: string; detail: string }

/** The authored-data laws as a validator (the no-fake-data rule is a
 *  test, the choiceNodes precedent): ids unique; every variant/rule/
 *  event cites doc 07; every decision offers at least one path; moods
 *  are legal states. */
export function validateMajors(): LifeValidationIssue[] {
  const issues: LifeValidationIssue[] = [];
  const seen = new Set<string>();
  for (const arc of MAJORS) {
    if (seen.has(arc.id)) issues.push({ rule: 'unique-id', detail: arc.id });
    seen.add(arc.id);
    if (!arc.disclosure?.cite) issues.push({ rule: 'disclosure-cite', detail: arc.id });
    for (const dec of arc.decisions) {
      if (!dec.defaultVariant && !dec.engagedVariant) {
        issues.push({ rule: 'decision-empty', detail: `${arc.id} C${dec.chapter}` });
      }
      for (const v of [dec.defaultVariant, dec.engagedVariant]) {
        if (v && !v.cite) issues.push({ rule: 'variant-cite', detail: `${arc.id} C${dec.chapter}` });
      }
    }
    for (const rule of arc.moodRules) {
      if (!MOODS.includes(rule.mood)) issues.push({ rule: 'mood-state', detail: `${arc.id} ${rule.mood}` });
      if (!rule.cite) issues.push({ rule: 'mood-cite', detail: arc.id });
    }
    for (const ev of arc.calendar) {
      if (!ev.cite) issues.push({ rule: 'calendar-cite', detail: arc.id });
      if (ev.date === undefined && ev.chapter === undefined) {
        issues.push({ rule: 'calendar-key', detail: arc.id });
      }
    }
  }
  if (MAJORS.length !== 16) issues.push({ rule: 'major-count', detail: String(MAJORS.length) });
  return issues;
}
