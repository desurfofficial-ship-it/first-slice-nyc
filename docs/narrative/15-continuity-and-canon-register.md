# 15 — Continuity & Canon Register

**Confirmed canon, resolved decisions, unresolved questions, dependencies, and continuity rules**

| | |
|---|---|
| Status | Living document (v1.0 baseline). Amend via §7's protocol. |

---

## 1. Confirmed canon (the load-bearing facts)

**Setting.** Alder Heights, a fictional pocket of upper Manhattan between Harlem and Washington Heights; streets Kestrel, Juniper, Sycamore, Gable, Marlow; the K line under Juniper (fictional letter, retired-real history, safe); the M121 bus; the registry's places and landmarks are canon; construction geometry remains governed by `docs/data/world-registry.json`.

**Protagonist.** Default name Leo Marsh (customizable); 26 at arrival (Sept 9, Y1); Feb 11 birthday; Elyria, Ohio; father Gerry (stroke, aphasia), mother Ada, sister Bea; Marsh & Son Furniture closed Y-3; ex-fiancée Rachel Voss; dissociative amnesia — localized for the 13-month Lost Year (Y-3→Y-2) with a Pittsburgh fugue episode, plus selective gaps; diagnosed Y-2; work-up clean; therapy-anchored journaling since; **never fully recovers the year**; eight fragments (F1–F8, five fire in-story); three in-story disclosures (June, Eddie, Dr. Feld); the condition is never the villain and never the excuse.

**The spine.** Six chapters (C0–C6) over ~27 in-game months plus an open endgame; the six rails (R1 arrival, R2 Betrayal I, R3 the Face, R4 the villain question, R5 the fall, R6 free continuation); the central conflict is Corvus Group's Juniper Commons on the Alder Works parcel; Betrayal I = the Compact break (forms A/B/C, doc 08 §3); Betrayal II = Kev and the jobs number; the betrayal-in-return cascade has five triggers with player-history weights; the fall is structural, its shape earned; no prison; restitution $47,300; the amends economy is 19 investors/$61,500 raised.

**The diary.** Three layers (Map instrument / Field Diary voice / city's ambient diary); ten entry kinds; FACT/RECALL/GUESS tags; append-only; the contradiction ledger K1–K8; the self-portrait; postcards are unsent letters, one sent (C5, Ada).

**Named canon lines (protected by test once shipped).** "Eat standing up. That's the job." · "It's ugly. So was mine. It's yours." · "You looked like that once. Go say hi." · "Two sugars. Every day for nine years. You'll see him tomorrow." · "You're not dying. You're new. Same symptoms." · "Promises are flour. Show me bread." · "Who did you promise, and what did it cost them?" · "I don't forgive people. I assess them." · "You talk about people like they're pieces on a board. I'm on your board." · "The block was going to lose anyway. I saved what I could." · "The diary doesn't lie. The writer did." · "Both true. Come see me when you're done being sorry." · "I didn't do this to you. I *filed* you." · "Whatever happened at that railing, you walked home. That's not nothing." · "Day 1 again." · "You did this in Ohio too." · "My money's already here. It's called tomatoes." · "The train's going to Brooklyn either way. You pick the seat."

## 2. Resolved decisions (with rationale)

| Decision | Ruling | Rationale |
|---|---|---|
| Neighborhood naming (registry open decision) | **Approved as canon** (Alder Heights + the five street names) | Built into docs 39–57, W1–W5 construction, and signage; renaming would break shipped work for no narrative gain |
| Old storyline (docs 01–57 legacy set) | **Rebooted**; files removed 2026-11-06 (history preserved) | The directive's explicit mandate; the world and systems carry over, the story does not |
| "Open-world" vs "life sim on an open block" | The narrative is built for the **open block that grows by chapter** — Alder Heights core, the city as texture, borough-scale spaces entering via the K line as chapters require | Preserves the shipped architecture and the Roam law while honoring the brief's open-world freedom; the block is the open world, and it grows |
| **DEC-12 — the borough direction** (owner-ruled, 2026-11-13) | **Option B: one additional district, chapter-structured — direction only.** The reconciled identity: FIRST SLICE is an open-world New York life simulation, delivered chapter by chapter; Alder Heights is the first district and stays the foundation; the new district must carry its own neighbourhood identity, buildings, businesses, residents, activities, stories and environmental character at the shipped standards; pricing precedes building; no geometry or implementation without the fresh §8 owner approval on the design package + first priced wave; the five-borough Passport stays a long-term ambition, not a commitment. This row supersedes the narrowing reading of the 2026-11 correction ("not an open-world game") — the correction's discipline (the Roam law, the scope gates) is retained whole; the genre ceiling it implied is removed. | The owner's decision message (2026-11-13) with the scoping study ([BOROUGH-SCOPING-STUDY.md](../production/BOROUGH-SCOPING-STUDY.md)) as its input; adjudication of record: [DEC-12-BOROUGH-DIRECTION-DECISION.md](../production/DEC-12-BOROUGH-DIRECTION-DECISION.md) |
| The fall is structural (R5) | **Yes** — stated, not hidden | A fall the player could simply opt out of would invalidate the ledger, the betrayal architecture, and the brief; freedom lives in the shape, not the existence |
| The protagonist's success/failure is not predetermined | Guaranteed only in event *classes*; every class's form, victims, cost, and aftermath are player-shaped | The honest middle between a branching fairy tale and a fixed film |
| Kestrel ≠ developer | The developer is **Corvus Group**; Kestrel is a street | Collision avoidance |
| The Okafor/Oktay split | **Okafor** = the Gable Row family (Kev); **Oktay** = the hardware store family (Deniz) | Registry alignment; both names distinct from the legacy "Okada" sketch |
| The Day-4 stranger | **Sam**, a one-off who becomes the weekend hire | The shipped beat is hospitality, not a plot grenade |
| Doris's death | On-screen as aftermath (the chair, the ledger, the funeral), never as a death scene | Restraint; the City-Moves Law's heaviest demonstration |
| docs/data/*.json | **Kept** during the docs clear | Live build data consumed by tests and the construction law; not narrative documents |
| The railing (F7) | Never explained, never depicted as intent, one therapy line only | Clinical credibility; duty of care; the ambiguity is the honesty |
| **DEC-1 — the in-game calendar epoch** (owner-approved, 2026-11-06) | **Day 1 = Tuesday, September 9, Y1 — the arrival (doc 12 §1).** "October, golden hour, forever" (doc 12 §5) is **presentation-only**: an art lock on the shipped arrival chapter, never a calendar date. Weekdays and weekend gating derive from the Tuesday anchor; the first post-cut Monday is **Sept 22, Y1 (story day 14)**, inside the compressed C1 interstitial (doc 06 §C1). Years are 365 days, February fixed 28 (doc 12 is silent on leap time; the deterministic rule stands). `core/calendar.ts` `CAL_EPOCH` corrected to Sept 9; `sim/clock.ts` was already canon-true. | Seven canon documents state the Sept 9 arrival (docs 06, 11, 12 §1/§2, 02, 04, 05 §4, 15 §1); zero canon passages state Oct 1 as a date; an Oct 1 epoch renders the arrival at day −21 and breaks the Tuesday anchor. Full adjudication of record: `docs/production/DEC-1-CALENDAR-CANON-DECISION.md` |

## 3. Unresolved questions (honest flags — none block implementation)

1. **Default protagonist name.** "Leo Marsh" is the working default; brand/marketing may prefer otherwise. All canon attaches to `LM-PROTAGONIST`, so a rename is a one-line change.
2. **Economic figures** (doc 04 §5) are believability-calibrated fiction, not a model; final numbers belong to economic tuning.
3. **Content rating & profanity ceiling** (doc 13 §6) assumed; needs a formal age-rating pass before VO/localization.
4. **The land-use legal mechanics** of the 1994 Compact and the C6 concessions (title issues, options, CLT instruments) are dramatized plausibility, not legal advice; if the team wants counsel review, doc 06 C5/C6 are the touchpoints.
5. **Fugue/epilepsy distinction in UI copy.** The game never names other causes; if a health-and-safety review wants a disclaimer, it attaches at first diagnosis scene, not at boot.
6. **VO language set.** Spanish and Dominican Spanish cadences appear in lexicon and rhythm (Tito, Eddie's family lines); full code-switched lines are written but the VO/translation strategy is unowned.
7. **The seasonal pass scope** (doc 12 §5) is a real art/tech cost; the narrative requires it from C1 but can ship C0–C1 in the October lock with a documented gap.
8. **Post-C6 long-tail content** (years of open-endgame life) is deliberately unspecified beyond the systems; the register records this as intended openness, not a gap.

## 4. Dependencies (what the narrative needs from other work)

1. **R0 (PRIORITY-0):** the docs-hygiene guard re-point (doc 14).
2. **Diary UI layer** (R3) — the map-notebook extension; the ink font + wobble style.
3. **The seasonal pass** (doc 12 §5) — chapters C1+ assume weather and light change.
4. **Interior spaces on plan** (registry W5): PIZZA-INT, CECIL-INT, DINER-INT, HALL-INT carry spine scenes; the narrative flags the minimum: Corner Slice interior (C0), the Cecil room (C0), the Works render room (C3, can be staged in the existing spaces), the diner (C6).
5. **Registry prose ownership:** where the registry's prose (neighbourhood identity, open decisions) touches story, doc 04 governs narrative and the registry governs coordinates — this document is the arbiter of any residual conflict (§7).
6. **AGENTS.md phase line** and the legacy doc links in the manual: engineering leads should update the manual's phase language and pointers when the narrative phase opens (this bible deliberately does not edit the manual).
7. **The GDD's Regulars and events** (Big Mike, the pizza rat, Manhattanhenge, First Snow, the cookbook): absorbed as canon here and in docs 05/07/12; the legacy GDD's *systems* law carries, its *story* law does not.

## 5. Continuity rules (how canon behaves)

1. **Order of authority for story:** docs/narrative/01–15 > world-registry prose > any other prose. For construction geometry: registry > all. For operating law: AGENTS.md > all (and nothing in this bible modifies it).
2. **Append-only canon:** facts are added, not rewritten; corrections are issued as dated entries in this register (§6), never as silent edits.
3. **The no-retcon rule for player history:** once shipped, a player's save represents a true personal history; content updates may add paths, never invalidate taken ones.
4. **Naming discipline:** new named characters, businesses, or places must check §6's naming registry before use; surnames do not collide (the Okafor/Oktay precedent).
5. **Number discipline:** every published figure (money, dates, ages) traces to a narrative doc table; changes update every occurrence (the audit script checks; doc 14 §6).

## 6. Registers

**Naming registry (canon names in use):** Leo Marsh · Eddie Carrasco · Rosa Delgado · Yolanda (Yoli) Ferreira · Tito Ferreira · Ernie Ferreira † · Kevin (Kev) Okafor · Grace & Raymond Okafor · June Park · Fitz · Marisol Quintero · Dane Wexler · Gino Trabucco · "Anton" (voice) · the Ferrante family (off-screen) · Craig Hollis · Doris Hollis † · Priya Nair · Deshaun Carter · Verna Carter · Darnell · Mr. Idris Warsame · Amina · Deniz, Mehmet & Ayşe Oktay · Rachel Voss · Camille Odom · Constance Hill · Dr. Naomi Feld · Eleanor (El) Vann · Miss Odessa Wynn · Eli Wynn · Big Mike · Deon King · Fatima Rahal · Father Mike Brennan · Imam Rahim Dawan · PO Diane Mercado · Marcus Bell · Ada, Gerry & Bea Marsh · Alma Reyes · Kayla Fournier · Lena & Odd · Sam · "Chino" Herrera · Nilda Colón · the Uzun cousins · Grant Mercer · Mango (cat). **Places:** see doc 04 §2. **Businesses/institutions:** Corner Slice Pizza · Rosa's Deli & Grocery · Sunrise Laundry · Halcyon · Fade King · Kestrel Hardware · B-side Records · Marlow Bakery · the Alder Diner · Sycamore Studios · the Alder Works · Corvus Group · SaniHaul of New York · Juniper Mutual Aid · the Ascension Church · Masjid an-Nur · P.S. 218 · the community board (unnumbered) · the Juniper Club · Provisions Hall · Juniper Commons · the Alder Compact (1994) · Hartwell Corp †.

**Contradiction ledger (authored, full list):** K1 the cart (C2 strike) · K2 the Compact ("net good," struck C5) · K3 June ("solid," struck C4) · K4 Corvus ("partner," **never struck — he knew**) · K5 "what had to be done" (struck C5) · K6 the surveyor GUESS ("watching someone," struck C2 — sunlight and square feet) · K7 "Eddie's paperwork ghost is Eddie's alone" (struck C5 — it was absorbed in Y-30, doc 08 §4) · K8 the self-portrait v1 vs. the Deniz deposition (both kept standing; the final contradiction is the player's).

## 7. Ruling protocol (how narrative questions get decided)

1. A builder with a story question first checks this register and the doc it touches.
2. Unresolved → open an issue tagged `narrative-question` with: the doc, the section, the conflict, and a proposed ruling with alternatives.
3. The Lead Narrative Director rules in the register (dated entry below); urgent gameplay-blocking questions get a provisional ruling marked `provisional` and are confirmed or reversed within one milestone.
4. Nothing in this protocol lets any agent silently invent fundamental story decisions (the brief's standing rule).

**Dated rulings appended here:**

- **2026-11-06 — DEC-1 (the calendar epoch).** Owner-approved, Option A: **Day 1 = Tuesday, September 9, Y1** (doc 12 §1). The October mood-lock (doc 12 §5) is presentation-only — an art lock on the shipped arrival chapter, never a calendar date; from C1 seasons advance with the calendar exactly as §5 states. Weekdays/weekends derive from the Tuesday arrival; the first post-cut Monday is Sept 22, Y1 (story day 14), inside the compressed interstitial (doc 06 §C1) — pinning doc 11 §7's "Then Monday, 6 a.m." without rewriting any story document. Adjudication: `docs/production/DEC-1-CALENDAR-CANON-DECISION.md`. Implementation: `CAL_EPOCH` correction + re-pinned tests + the one epoch mapping (WP-2v).

— Lead Narrative Director, 2026-11-06
