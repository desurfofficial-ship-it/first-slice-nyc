# 03 — Diary-Map Narrative System

**The diary is the map: structure, entry categories, progression, and continuity rules**

| | |
|---|---|
| Status | Canon (v1.0) |
| Depends on | 01 (Two-Diaries Law), 02 §6 (memory rules) |
| Serves | Doc 14 (schemas and requirements), docs 06/09 (chapter-by-chapter diary states) |

---

## 1. The three diaries

FIRST SLICE already ships two memory systems; the reboot adds the third and binds all three. They are distinct, and the *disagreement between them is content*.

| Layer | What it is | Who writes it | Already built? |
|---|---|---|---|
| **The Map** (the instrument) | A paper map of the neighborhood that fills in as Leo walks — streets, places, person-cards, lessons. Allowed to be wrong: the subway lines are drawn badly on purpose (existing law: "the player should love Map, not study it"). | Leo's hand (ink layer) | Yes — map-notebook state; extended by this doc |
| **The Field Diary** (the voice) | Leo's first-person entries: what happened, what he thinks happened, what he refuses to think. Biased, funny, sometimes wrong. The Map's annotations are its public surface; the entries are its prose. | Leo | New — specified here |
| **The City's Diary** (the block's memory) | The ambient system that has the block speak, once, the morning after you become a regular somewhere; regulars' MEMORY_LINES; the window diaries. The world's record of Leo. | The block | Yes — `src/core/diary.ts`, content tables |

**The Two-Diaries Law in practice:** when Leo's record and the city's record disagree, neither is corrected automatically. The disagreement is *authored* (§4), surfaces through characters ("Rosa says you gave her the impression the cart was yours. Was it not?"), and is logged in the contradiction ledger (§5). The player is never told which record is true. The truth is the difference.

## 2. Entry categories and schema

Ten entry kinds, one schema. Every entry is append-only.

```ts
interface DiaryEntry {
  id: string;                 // e.g. "E-Y1-0909-01"
  kind: 'PLACE' | 'PERSON' | 'RECALL' | 'QUESTION' | 'EVIDENCE' |
        'TALK' | 'OBSERVATION' | 'RELATION' | 'EVENT' | 'CONTRADICTION';
  date: GameDate;             // in-game date, never real-world (doc 14 R4)
  node?: MapNodeId;           // pinned location, if any
  epistemic: 'FACT' | 'RECALL' | 'GUESS';
  body: string;               // Leo's voice; 1–6 lines; handwriting font
  links: string[];            // entry/person/place ids it references
  visibility: 'private' | 'secret' | 'shared';   // secret = hidden in the June scene
  corrections: Correction[];  // append-only strikethroughs (§5)
}
```

Kind definitions (mapping the design brief's ten required records):

1. **PLACE** — important places, in his words, not a gazetteer's. *"Corner Slice. 14 seats, one hero oven, a radio that only likes the Mets."*
2. **PERSON** — the person-card (§3). People he encounters, sketched like characters because he thinks of them that way.
3. **RECALL** — a memory: ordinary recollection, or one of the eight fragments (doc 02 §6.2). Fragments carry a `fragmentId` in `links`.
4. **QUESTION** — unanswered questions. The open-questions tray. Every question is dated; answered questions do not delete — they move to the "resolved, and here's what I had wrong" tray.
5. **EVIDENCE** — documents, photographs, receipts, screenshots, the physical stub of the world: permits, leases, letters, the Oktay receipts, Ernie's letter.
6. **TALK** — significant conversations, logged same-day, in his paraphrase (never verbatim transcripts of the actual scene; the diary is what he *took* from it).
7. **OBSERVATION** — the city notebook: how the M121 driver takes the Gable corner, which window wakes first, the smell of Marlow at 6 a.m. Feeds environmental storytelling.
8. **RELATION** — relationship state in his words: *"Eddie trusts me with the register, not the keys. Gap: the keys."* (Mechanical relationship state lives in the save; this is its voice.)
9. **EVENT** — things he wants to remember: the blackout soup night, the Slice Summit, the last night at the shop.
10. **CONTRADICTION** — the ledger entries themselves (§5): pairs of his own records that no longer agree.

**Epistemic tags are mandatory and mechanical:**

- **FACT** — verified at write time (he saw it, has the paper). Facts can still age out — the correction mechanism handles that.
- **RECALL** — his memory. For new events, essentially reliable. For anything touching the Lost Year, it is by definition not memory and renders in the RECALL style (soft ink, wobble). RECALL is never upgraded to FACT by the passage of time alone.
- **GUESS** — assumption, projection, wishful thinking. The diary flags these honestly because Leo's therapist-trained habit is to label them — *and because he likes being right, he games the system*: some entries are tagged FACT that are only GUESS. The three recorded instances of him over-tagging (C2, C4, C5) are canon (§5.2); the game never breaks the tag system, Leo does.

## 3. The person-card

Every major and supporting character gets a card in Leo's voice. Structure: *name + what they do / first impression / what I want from them / what they want (his guess) / running quote / trust line.* Cards rewrite visibly — never silently.

**Sample, Rosa, Day 1 v1:**
> *Rosa. Deli, gold boards, sees everything, gives nothing away free. Wants: for me to owe her (everybody here wants something, the city's just honest about it). Quote: "It's ugly. So was mine. It's yours." — L*

**Sample, Rosa, C1 v2 (after the cart-truth correction):**
> *Rosa. Deli, gold boards. Lent me a cart I thought was a gift and let me find out at my own speed, which is its own kind of lesson. Wants: nothing she'd name. What she wants is for the block to work. Quote: "Lock up tight." — L*

The card system implements doc 01's "being seen vs. being known" at the UI level: v1 cards are how he is seen; corrections are him being known.

## 4. What the diary is not

- Not a quest log. Chapter objectives never render as diary entries; the Map may circle a story spot (existing behavior), but the diary only records what Leo chose to write.
- Not objective truth. It records his understanding. Where the two diverge, §5 applies.
- Not an inventory of feelings. He writes around feelings — until he can't (the C4–C6 entries shorten, then stop performing).
- Not optional flavor. If the player never opens it, the game still respects it: the city's diary and NPC knowledge proceed as if he'd written honestly, because *he did write honestly on the days that mattered* (authored beats). The diary's consequences never depend on the player reading it — only on Leo having written it, which is canon.

## 5. The contradiction ledger

### 5.1 The mechanism

When a later entry, event, or piece of evidence contradicts an earlier one, the system creates a CONTRADICTION entry linking both, and the earlier entry's offending line gains a strikethrough with a marginal note in current-tense Leo:

> *Rosa gave me the cart.* ~~given~~ → margin, C1: *"Loaned. She never said give. I heard what I needed. — L"*

Rules:
- Append-only: nothing is deleted; the Map "never writes the same lesson twice" but it *keeps every wrong thing it ever wrote* (this is the "the Map is allowed to be wrong" law, promoted to narrative load-bearing).
- Contradictions are **diegetic, fair, and finite**: eight authored ledger entries across the whole story (§5.2 lists five; doc 15 registers the full list). No procedural gaslighting.
- The city's diary is never contradicted this way — it only ever contradicts *him*.

### 5.2 The canon contradiction entries

| # | When | The record | The correction | Earned by |
|---|---|---|---|---|
| K1 | C1 | "Rosa gave me the cart." (Day 1, tagged FACT — his first over-tag) | "Loaned. She never said give." | The cart's return; Rosa's anniversary speech |
| K2 | C2 | "The Compact was going to fail anyway. I saved the shop. Net good." (tagged FACT) | "I saved the shop. The Compact might have held. Both true. Only one was mine to write." | Deniz's receipts surface (C5); Kev's copy of the sign-in sheet |
| K3 | C4 | "June and I are solid. She knows the important stuff." (tagged FACT) | "She knows the edited cut." | The diary-discovery scene (doc 06 C4) |
| K4 | C4 | "Corvus is a partner. Marisol is straight with me, for a developer." (tagged GUESS — he labeled it honestly and kept it) | Unstruck. He *knew*, and did it anyway. The ledger's cruelest entry is the one he leaves standing. | The C5 cascade |
| K5 | C5 | "I did what had to be done." | "I did what I wanted and called it necessary. — L" | The settlements; Ada's $8,000 call |

K4 is the "am I the villain?" beat in ledger form: the villain-question scene (doc 08 §6) happens when Leo reads K2 and K4 side by side.

## 6. Progression across the story

Diary states are chapter-gated; full beat-by-beat schedules live in doc 06. The throughline:

| Chapter | The diary's character |
|---|---|
| C0 | Eager, performative, funny. Lists everything. Trusts itself. |
| C1 | Warmer. First RECALL fragment (F1) shakes it — three entries that week are half as long. |
| C2 | Confident. The Compact break is written as victory (K2). The ledger's first self-contradiction sits unexamined. |
| C3 | Professional. Entries start sounding like a man running for office. The F2 fragment arrives and he writes *around* it. |
| C4 | Fractured. Longer nights, shorter entries. The June scene (K3). Therapy begins; entries to Dr. Feld topics are the only honest ones. |
| C5 | Terse. Facts, times, amounts. The performance voice dies here. K5 is the last entry of the chapter: *"Day 1 again."* |
| C6 | Slower, plainer, occasionally funny again — the humor comes back without the audience. Self-portrait mode (§7). |

**Voice evolution rule:** early entries perform for an imagined reader; late entries don't. Word count per entry trends down 40% from C3 to C5 and the joke rate halves — then partially recovers in C6. This is measurable prose direction for writers (doc 13 §5).

## 7. After the main story: the life record

- The diary remains fully functional in the open aftermath and beyond the main cast's arcs: it keeps recording an ordinary life (jobs, friends, seasons) indefinitely. The design goal the brief set — *a record of his life, not a quest checklist* — is enforced by content rules: endgame entry prompts are about the city, not about objectives.
- **The self-portrait.** At any point in C6+, the player may have Leo write the entry the whole system was built for: *the man he is now.* It is generated from actual world state — standing (work, home, money), the amends ledger (doc 09), relationships that repaired or didn't, fragments recovered, therapy attendance, and the contradictions still standing unstruck (K4 may still be unstruck; that is allowed and means something). It is written in his voice, it is honest to the state it describes, and it never grades him. It can be rewritten as he changes; each version is kept, append-only.
- **F8 (the origin fragment)** can only surface while writing a self-portrait (doc 02 §6.2): the diary's own birth is its final reveal.

## 8. Postcards (integration with the shipped system)

Postcards carry over unchanged mechanically. Canon reframing: Leo sends none. He keeps every one in the notebook's back pocket with the receipts — unsent letters home. In C5, the last scene at the room above the shop, he finally mails one: to Ada. It says, in full: *"I'm fine. Tell Gerry the city's got good bread."* This is the only postcard the story confirms was ever sent.

## 9. Continuity rules for writers and builders

1. Every canon event in docs 06/07/08/09 that Leo personally experiences must be either diary-eligible (a prompt exists) or explicitly excused (unconscious, withheld, the one-day gap in C5). The doc 15 register tracks the exceptions.
2. Entries are dated in-game and never reference real-world dates, weather outside the season canon (doc 12), or media that doesn't exist in-world.
3. Leo never writes something he could not know — including things the player saw and he "should" have logged. Where the player knows more than Leo, the *city's diary* or an NPC carries the discrepancy.
4. New authored entries must pass the voice test: cover the name and date; if it could be anyone's diary, it is wrong (doc 13).
5. The June scene (C4) reads entries marked `secret`. Only K3-adjacent entries and two RECALL fragments are so marked; nothing else is retroactively hidden.

— Lead Narrative Director, 2026-11-06
