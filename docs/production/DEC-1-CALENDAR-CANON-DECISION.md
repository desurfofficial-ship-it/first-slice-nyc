# DEC-1 — Calendar Canon Decision Brief

**The authoritative in-game epoch for FIRST SLICE**

| | |
|---|---|
| Status | **UNRESOLVED — awaiting owner ruling.** This brief recommends; it does not decide. No code, canon, calendar, or branch was touched in producing it. |
| Author | Lead Narrative Director (canon adjudication), for the Production Director and the project owner |
| Date | 2026-11-06 |
| Question | Day 1 = **September 9, Y1 (Tuesday)** (`sim/clock.ts`, branch) or Day 1 = **October 1, Y1** (`core/calendar.ts`, main)? |
| Method | Primary-source reading of the full narrative canon (docs 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15), both implementations and their tests, `docs/architecture/world-contract/06`, and the production docs. The reconciliation report (§4) was read as context and **independently re-verified against the primary sources** — not relied upon alone. All chronology arithmetic below was computed programmatically (Appendix A), not derived by hand. |
| Ruling path | On owner approval, the ruling is recorded by the Narrative Director in `docs/narrative/15` §2 (dated entry, per §7 protocol), and only then implemented (§6–7 of this brief). |

---

## 0. The question, stated precisely

Both implementations map **story day N → simulation day N 1:1** (the bridge, `WorldRuntime.onStoryDayBegin`, is built and verified). Nothing in the game currently *renders* a date: `formatGameDate` / `dateOfCalendarDay` have **zero callers**, the HUD/Map calendar is WP-6 (not yet landed), and no authored content string contains a month name (verified by grep across `web-three/src/core/`). The conflict is therefore **one day counter read through two different calendars** — it affects date rendering and everything date-derived (weekdays, season labels at C0's edges, schedule gating), not the shipped beats themselves.

The epoch delta is **22 days**: Oct 1 is 22 days after Sept 9.

## 1. Verdict summary

**The narrative canon states one arrival date, unambiguously and in seven independent documents: Tuesday, September 9, Year 1.** No narrative document anywhere states October 1 as a calendar date. "October" enters the canon exactly once, in doc 12 §5, as the **shipped build's mood-lock** — an art directive about light, explicitly scoped ("the shipped build's … is C0's mood-lock"), not a date. `core/calendar.ts`'s October epoch was derived by reading that art directive as a calendar anchor; its own header admits the derivation ("anchored to the shipped mood-lock — Day 1 is October 1, Year 1"). The production plan's WP-6 example dateline ("October 14 · Year 1", `NEXT-PHASE-EXECUTION-PLAN.md` L83) is the likely seed of that reading; it is a UI *example*, not canon.

Meanwhile Option B, taken literally against the unchanged canon dates, is arithmetically incoherent: the arrival (Sept 9) would sit **21 days before the calendar's own Day 1** — the game could not render its own opening. The only way to make October 1 work is to shift every fixed date in the bible by 22 days — a canon rewrite this adjudication is forbidden to perform and which would contradict seven documents to rescue a misread comment.

**Recommendation: Option A — September 9, Year 1 (Tuesday) is the canonical epoch.** The October mood-lock survives, unmodified, as what doc 12 §5 already says it is: presentation. Details and the migration plan in §5–7.

## 2. Exact source passages

### 2.1 Passages supporting September 9 (the arrival epoch)

**Doc 12 — Narrative Timeline (the designated timeline source of truth):**

> L8: "Dating system | Story-relative. **Y1** = the arrival year (**September Y1 → August Y2**). No real-world years appear in game text."

The arrival *year* is defined to begin in September. An October 1 arrival makes this definition false.

> L34 (§1, final row): "| **Y1, Sept 9 (Tuesday)** | **Arrival.** Chapter 0 begins. |"

The single most explicit chronology statement in the bible: date, weekday, event, chapter anchor.

> L40 (§2): "| C0 | **Sept 9–15, Y1** | The arrival week; Sam lands; the permit filed |"
> L41 (§2): "| C1 | **Sept 16 – Dec 23, Y1** | … **the nor'easter (Oct 29–Nov 1)** … |"

The month-precision master calendar — every chapter window and every fixed event in the spine is stated against the September anchor.

**Doc 11 — First Session Script:**

> L21 (§2 header): "## 2. Beat table (**in-game Day 1, Tuesday, Sept 9, Y1** — ~5–8 minutes per in-game day per the core loop)"

The first-session script — the document the shipped Day 1–4 implement — states Day 1's full date *and weekday*.

> L64 (§7): "To C1 (**season cut, Sept 16**): the first interstitial … Then **Monday, 6 a.m.**, Eddie at the door: 'Real shift.'"

**Doc 06 — Master Storyline:**

> L17: "| C0 | The First Slice | **Sept 9–15, Y1** | The city gives him a corner. He gives it a name. |"
> L33 (§C0): "**Period. Tuesday, Sept 9 – Monday, Sept 15, Y1.** Seven days, golden hour."

Note the weekday arithmetic is internally consistent and verifiable: Sept 9 = Tuesday → Sept 15 = Monday. The canon's own calendar math checks out — it was authored by someone counting from a real Tuesday.

> L45 (§C0 handoff): "Eddie says, 'Six a.m. Monday. Real shift. Leave the tricks in Ohio.'"
> L49 (§C1): "**Period.** Sept 16 – Dec 23, Y1. (**Interstitial: the season cut compresses the first three weeks.**)"

**Doc 02 — Protagonist Bible:**

> L60: "| **Y1, Sept 9** | Arrives, Alder Heights, with $87, a duffel bag, and the green notebook. |"

**Doc 04 — World & Neighborhood Bible:**

> L15: "The registry's 'October, golden hour, forever' is **the arrival chapter's mood**; from Chapter 1 the seasons move (doc 12). It is a place where everyone is having an ordinary Tuesday — which is exactly what makes it possible to break."

The world bible itself scopes "October" as *mood*, not date — and its closing figure of speech ("an ordinary Tuesday") rhymes with the canon anchor.

> L35: "| Y1, **Sept** | Leo arrives. The block does not notice for nine days. |"

**Doc 05 — Character Bible:**

> L219 (§4 header): "## 4. Ages at arrival (**Y1, September**)"

The entire cast's ages are tabulated against a September arrival.

**Doc 15 — Continuity & Canon Register (the register itself):**

> L15: "26 at arrival (**Sept 9, Y1**); Feb 11 birthday;"

**Doc 14 — Implementation Spec (the systems contract):**

> L27 (R4): "**In-game calendar only:** day counter, season derivation, **month-precision chapter windows (doc 12 §2)**. No real-world clock anywhere."

R4 deliberately names **no epoch** — it delegates the calendar's content to doc 12 §2, which is September-anchored. Nothing in doc 14 supports October 1.

**Corroborating implementation-side sources (not canon, but consistent):**

- `sim/clock.ts` header, law 3: "The calendar is canon (docs/narrative/12): **Day 1 is Tuesday, September 9, Y1 — the arrival.**" Epoch constant: `EPOCH = { year: 1, month: 9, dayOfMonth: 9, weekday: 'Tue' }`.
- `tests/sim-clock.test.ts` L3, L16–17: "day 1 = Sept 9, Y1, Tuesday"; `expect(c.date).toBe('Sept 9, Y1')`; `expect(c.weekday).toBe('Tue')`.
- `docs/architecture/world-contract/06` §2: "Day 1 = **Tuesday, September 9, Y1** — the arrival (docs/narrative/12 §1). **Tests pin it.**" plus "Weekdays derive (`day+1 mod 7` from Tuesday); **weekends gate schedules**."

### 2.2 The complete inventory of passages supporting October 1

There are exactly three "October" anchors in the project, and **none states a calendar date**:

1. **Doc 12 §5 (L65):** "The shipped build's '**October, golden hour, forever**' is **C0's mood-lock**. From C1, seasons advance with the calendar…" — an art directive on the shipped slice's light, with the sentence's second half explicitly separating the locked *presentation* from the advancing *calendar*.
2. **Doc 04 (L15):** "…is the arrival chapter's **mood**…" — same scoping, different words.
3. **`NEXT-PHASE-EXECUTION-PLAN.md` (L83, production doc, non-canon):** the HUD/Map calendar task illustrated with the example dateline "**October 14 · Year 1** via `formatGameDate`" — a UI mock string, written before any epoch ruling, and the only place in the repo where "October" appears in a date-shaped string.

**Where the October epoch actually came from** — `core/calendar.ts`'s own header (L7–8): "anchored to the shipped mood-lock — **Day 1 is October 1, Year 1** ('October, golden hour, forever' is C0's mood-lock, doc 12 §5)". The module generalized a mood-lock month into a calendar anchor, then propagated the claim into `Save.ts` (L91, L93, L218: "Day 1 = October 1, Year 1 (C0's mood-lock)") and `GameState.ts` (L186) as comments, and pinned it in `tests/calendar.test.ts` (L27–32: `CAL_EPOCH` = `{y:1,m:10,d:1}`; "the shipped Day 1–4 are October 1–4"). **The canon never says "Day 1–4 are October 1–4" — that sentence exists only in code comments and the test that pins them.**

*Citation-quality note (secondary finding):* `calendar.ts`'s header cites "doc 12 §5" for two things that live in **§6** ("no real-world dates exist anywhere", the ≈27-month spine), and its diary-dateline example ("October 14 · Year 1", L130) traces to the production plan's UI mock, not to any narrative document. Slightly-off citations made the misread harder to catch; the rewrite in §6 corrects the header wholesale.

### 2.3 What the canon is silent about (no gaps filled)

- **Weekday of October 1, Y1:** canon-silent. Under the sim's own weekday math (anchored to the canon Tuesday, Sept 9), Oct 1 renders as **Wednesday**. Option B therefore either contradicts "Day 1, Tuesday" (doc 11 §2) or requires inventing a weekday anchor — out of bounds.
- **Leap years:** doc 12 never names one. Both implementations already treat years as fixed 365 days; this ruling does not need to change that (see §6, item 5).

## 3. Chronology comparison

All numbers computed with the in-game calendar rules both implementations share (365-day years, real month lengths, no leap; weekday anchored to the canon Tuesday, Sept 9).

### 3.1 The shipped opening (Days 1–4) under each epoch

| Story day | Option A (Sept 9) | Option B (Oct 1) | Canon statement |
|---|---|---|---|
| Day 1 — arrival, the terminal, Rosa's window | **Sept 9, Tue** | Oct 1, **Wed** | "Day 1, Tuesday, Sept 9, Y1" (doc 11 §2) |
| Day 2 — the first slice, the platform panic | Sept 10, Wed | Oct 2, Thu | — |
| Day 3 — the handover, the cart days | Sept 11, Thu | Oct 3, Fri | — |
| Day 4 — the stranger (Sam) | Sept 12, Fri | Oct 4, Sat | — |
| Days 5–7 — "the block opens up" (doc 11 beat 11: laundry, permit filing, Odessa) | Sept 13–15, **Sat–Mon** | Oct 5–7, Sun–Tue | C0 ends "Monday, Sept 15" (doc 06 §C0) |

Under Option A the first weekend of the story lands exactly inside the shipped C0 tail ("Days 5–7: the block opens up") — the permit filing and Sunrise Laundry beats sit on a natural first weekend. Under Option B, "Day 1, Tuesday" is false and the first weekend moves to Days 3–4, silently changing the meaning of the shipped beat table.

### 3.2 The spine under each epoch (canon dates unchanged)

| Canon event (doc 12 §2 unless noted) | Canon date | Story day under A | Story day under B |
|---|---|---|---|
| **C0 opens — the arrival** | Sept 9, Y1 | **1** | **−21 — before the calendar exists** |
| C0 closes (handoff) | Sept 15, Y1 | 7 | −15 |
| C1 opens (season cut) | Sept 16, Y1 | 8 | −14 |
| The nor'easter | Oct 29 – Nov 1, Y1 | 51–54 | 29–32 |
| C1 closes | Dec 23, Y1 | 106 | 84 |
| C2 opens | Jan 6, Y2 | 120 | 98 |
| The break (Betrayal I) | Mar 11, Y2 | 184 | 162 |
| Eddie's heart attack | Jul 6, Y2 | 301 | 279 |
| The Slice Summit | Aug 23, Y2 | 349 | 327 |
| The offer | Dec 9, Y2 | 457 | 435 |
| The signing (C4 opens) | Jan 14, Y3 | 493 | 471 |
| Kev's fall | Apr 11, Y3 | 580 | 558 |
| The diary discovery | May 9, Y3 | 608 | 586 |
| Doris dies | Sept 14, Y3 | 736 | 714 |
| The shop's last night | Oct 4, Y3 | 756 | 734 |
| The terminal ("Nov 26, Thanksgiving eve") | Nov 26, Y3 | **809 → renders Nov 26, Y3 ✓** | 787, or day 809 → **Dec 18, Y3** (see below) |
| The hall opens (spring Y4) | Apr 1, Y4 (representative of "spring Y4") | 935 | 913 |

**Reading the table — Option B has two framings, and both fail:**

- **(i) Canon dates unchanged, epoch changed:** every canon event keeps its calendar date but lands 22 story-days earlier — and everything before Oct 1 (the arrival, all of C0, C1's first three weeks) falls **before Day 1**. The calendar cannot render the game's own opening. Three of the spine's dated events in the table are negative; the full pre-Oct-1 set is C0 *entire* plus C1's opening stretch.
- **(ii) Story structure unchanged, epoch changed** (the operative framing for engineering, since the built bridge maps story day N → sim day N): every event renders 22 days **later** than authored. The terminal — day 809, authored as "Nov 26, Thanksgiving eve" (doc 06 §C5) — renders **Dec 18, Y3**; "the arrival week" stops being September; "first renewal notice (Dec)" slides to January.

The only way to make Option B coherent with the story is framing (i) *plus* shifting ~29 fixed dates plus every relative reference ("the arrival week", "first renewal notice (Dec)", "spring Y4") by 22 days across docs 06, 07, 09, 11, 12 and the register — a canon rewrite.

## 4. Consequences by option

### 4.1 Option A — September 9 authoritative (sim epoch stands; `CAL_EPOCH` corrected)

| Dimension | Effect |
|---|---|
| **Chapter 0/1 chronology** | C0 = days 1–7 (Sept 9–15, Tue–Mon, exactly doc 06 §C0); C1 opens day 8 (Sept 16, the season cut). Matches docs 06/11/12 **with zero canon edits**. |
| **Day 1–4 story events** | Sept 9–12 (Tue–Fri). No shipped beat changes; the first-session script's day table becomes date-true. |
| **Weekdays & weekly routines** | The branch's weekday system becomes canon-correct as built (Tuesday anchor; first weekend = Days 5–6). Doc 05's weekday-keyed routines (Eddie/Tito Sunday dominoes, Deshaun Thursday streetball, Camille Saturday market + Monday pool, Eleanor's Tuesday/Friday dialysis, first-Sunday church) gate correctly from day 1. |
| **Seasons & weather** | Sept 9–15 is **meteorological autumn in both implementations** — the season label is identical. The October mood-lock survives untouched as presentation, per doc 12 §5's own scoping; from C1 seasons advance (nor'easter days 51–54; first snow in C2's opening week lands mid-January, winter ✓). |
| **NPC schedules & business hours** | No data changes; hours are minute-of-day. Weekend gating (contract 06 §2) becomes available and canon-true. |
| **Long-term progression** | All ~29 fixed events map to positive story days and render as authored; the ≈27-month spine + open endgame year (doc 12 §6) intact; the terminal lands on Nov 26, Y3 as written. |
| **Save compatibility** | Saves store day **counters** (`day`, additive `calendar_day`), never rendered date strings (verified: `formatGameDate` has zero callers; no authored datelines exist in content). Re-anchoring `CAL_EPOCH` re-renders dates correctly for every existing save. **Schema untouched; nothing visible migrates** (no date has ever been shown to a player yet — WP-6 is unlanded). |
| **Calendar UI & diary/map** | WP-6 lands rendering "September 9 · Year 1"-style datelines. One convergence task: `clock.ts`'s abbreviated "Sept 9, Y1" and `calendar.ts`'s full-month format unify on one canonical dateline (recommend full month names — doc 12 writes months in full). The mood-lock stays a lighting/grading lock. |

**Contradictions that remain under A (both minor, both handled by recording, not rewriting):**
1. **"October light on September dates."** A player inspecting datelines in C0 sees September under golden October-style light. This is not a canon contradiction — doc 12 §5 and doc 04 L15 both scope the mood-lock as art, and September is meteorological autumn, so the light is not seasonally wrong. It is a presentation nuance to note in the ruling entry so no future agent "fixes" it by moving the calendar.
2. **Doc 11 §7's "Then Monday, 6 a.m."** — Sept 16 (the cut) is a Tuesday; the line resolves as the first post-cut Monday, **Sept 22 (day 14)**, inside the interstitial that "compresses the first three weeks" (doc 06 §C1). Consistent, but currently implicit. The ruling entry pins it (and the mapping test asserts it), so no builder has to re-derive it.

### 4.2 Option B — October 1 authoritative (story calendar stands; sim epoch corrected)

| Dimension | Effect |
|---|---|
| **Chapter 0/1 chronology** | As authored, **C0 and C1's opening weeks pre-date the epoch** (arrival = day −21). The game cannot date its own opening. Survival requires shifting every fixed date in the bible +22 days: a canon rewrite of docs 06, 07, 09, 11, 12 and the register — explicitly forbidden to this process ("do not rewrite story events", "do not edit the narrative canon"), and destructive regardless (see below). |
| **Day 1–4 story events** | Oct 1–4 renders **Wed–Sat** under the sim's weekday math — contradicting "Day 1, **Tuesday**" (doc 11 §2, doc 12 §1). Alternatively a weekday for Oct 1 is invented (canon-silent; forbidden) and the Tuesday anchor discarded. |
| **Weekdays & weekly routines** | Doc 05's routines were authored against a Tuesday arrival; a Wednesday start moves every first occurrence and lands the first weekend on Days 3–4, silently changing what "Days 5–7: the block opens up" means. |
| **Seasons & weather** | October is still autumn — no presentation gain over A; all of A's season behavior is bought at the cost of everything above. |
| **NPC schedules & business hours** | Weekday-keyed authored data breaks as above. |
| **Long-term progression** | ~29 fixed dates shift or contradict; the terminal drifts off "Thanksgiving eve"; **Y1's definition ("September Y1 → August Y2", doc 12 L8) becomes false**; docs 02/05/15's "ages at arrival (Y1, September)" tables lose their anchor. |
| **Save compatibility** | Counter-based saves survive numerically, but the epoch flip re-dates every future render and requires re-anchoring the weekday system by invention. |
| **Calendar UI & diary** | Datelines would say October where every story document — including the diary's own design docs — says September. The field diary would contradict the canon it exists to record. |

**Contradictions that remain under B:** the canon itself, in seven documents. Option B is not a calendar ruling; it is a story edit. **Rejected** unless the owner deliberately re-canonicalizes the timeline — which this process cannot do and which the narrative bible gives no reason to want.

### 4.3 Option C — separate narrative and simulation dates

**What it would mean:** the sim runs one calendar while narrative surfaces render another (e.g., an "editorial October" over a real September), or story-day ≠ calendar-day with a translation layer.

**Why it fails here:**
- **The canon has one timeline.** Doc 12 is a single calendar; the field diary, the city's diary, the Map ink, and the HUD are all *the same fiction's* paper (docs 03, 14 R3/R4). Two calendars put two dates on the same beat — the diary would lie, which violates the diary's own design law (append-only, epistemically tagged — "The diary doesn't lie. The writer did.").
- **The one stated distinction is already presentation.** The October mood-lock is scoped as art by doc 12 §5 and doc 04 L15, and September is meteorological autumn — golden light on September dates needs **no second calendar**, only the grading lock that already exists.
- **Complexity and risk:** a permanent mapping layer with its own sync law, tests, and save fields (two counters); every future dated feature must pick a calendar; the UI must choose which date to show. This is precisely the "subtle schedule bugs" class the roadmap flags for DEC-1 to prevent (`MASTER-GAME-ROADMAP.md` L103).
- **Contract violation:** one clock owning time is the branch's own ownership law (`sim/clock.ts` law: "the only writer of `day`"); `docs/architecture/world-contract/06` §2 pins a single canon calendar.

**Verdict: rejected.** It solves a non-problem (the mood-lock) by institutionalizing a real one (two truths). Reconsider only if a genuine future design need separates narrative time from simulation time — none is known today.

## 5. Recommendation

**Rule Option A: the canonical epoch is Day 1 = Tuesday, September 9, Year 1 — the arrival (doc 12 §1).**

- `sim/clock.ts` (branch) is canon-correct as built; `core/calendar.ts`'s `CAL_EPOCH` is corrected to `{ y: 1, m: 9, d: 9 }` upon approval.
- The "October, golden hour, forever" mood-lock (doc 12 §5) **survives unchanged as presentation** — an art lock on the shipped arrival chapter, never a calendar date. Nothing about the shipped slice's look changes.
- Weekly routines and weekend gating derive from the Tuesday anchor, as the world-contract already implements.
- Narrative canon (docs 06/11/12/15 and the rest) requires **zero edits**.

**This brief does not decide.** Per the assignment's restrictions, nothing has been changed — no code, no canon, no calendar, no branch. Implementation of anything in §6 begins only after the owner's explicit approval of this recommendation.

## 6. Required changes upon approval (in order; none executed now)

**Documentation (Narrative Director + Production Director):**
1. **`docs/narrative/15` §2 — the DEC-1 ruling entry** (dated, per §7 protocol): canonical epoch Sept 9, Y1 (Tuesday); the mood-lock is presentation-only; weekday/weekend derivation anchors on the Tuesday arrival; **the first post-cut Monday is Sept 22, Y1 (story day 14)** — pinning doc 11 §7's "Then Monday, 6 a.m." inside the compressed interstitial (the ruling's one clarification; no story doc is rewritten).
2. **`PRODUCTION-STATUS-REGISTER.md`** — DEC-1 → RULED/CLOSED; **`worklog.md`** — the ruling quoted (per WP-2v's reporting requirements).
3. **`NEXT-PHASE-EXECUTION-PLAN.md` (WP-6)** — the example dateline "October 14 · Year 1" becomes a September-epoch example (e.g., "September 14 · Year 1"). Production doc, non-canon.

**Code (WS-D / engineering — per WP-2v's file list):**
4. **`core/calendar.ts`** — `CAL_EPOCH` → `{ y: 1, m: 9, d: 9 }`; header rewritten (mood-lock = presentation; citations corrected to doc 12 §1/§2; the "calendar never negotiates" citation moves to §6); no-`Date` law untouched; **February stays fixed 28** (doc 12 is canon-silent on leap years; the deterministic 365-day year stands — recorded in the ruling entry, not invented into canon).
5. **`tests/calendar.test.ts`** — re-pinned: Day 1 = Sept 9, Y1 (Tuesday); Day 7 = Sept 15 (Monday); Dec 31, Y1 = story day 114; season checks unchanged (Sept = autumn either way). The header comment's "Day 1 = October 1" claim is corrected with it.
6. **The one mapping function + pinned test** reconciling story day ↔ sim day ↔ displayed date (WP-2v), including the day-14 first-Monday assertion and dateline-format convergence (full month names, "September 9 · Year 1") across field diary, HUD, and debug surfaces.
7. **`core/Save.ts` / `GameState.ts`** — comment corrections only ("shipped Day 1–4 are September 9–12, Year 1"); **no schema change**.

## 7. Migration & compatibility plan

1. **Order:** owner ruling → doc 15 §2 entry → `CAL_EPOCH` + test re-pin + mapping test in one commit (entry gates: `tsc --noEmit`, `vitest run` green) → WP-6 renders through the single mapping → worklog + register.
2. **Saves:** `day` and `calendar_day` are counters — no migration. Pre-merge saves re-render datelines under the corrected epoch with no data loss; **today no save has ever displayed a date** (zero render callers, WP-6 unlanded), so the change is invisible to every existing player. The re-rendering behavior is documented in the worklog (no silent data loss, per WP-2v acceptance).
3. **Shipped pixels:** none change. The mood-lock, the beats, the probes, and the 4-day E2E are date-agnostic; only future datelines are affected, and they land September-true.
4. **Acceptance:** every displayed date consistent under the ruled epoch at every pinned test day; no real-world dates anywhere (the R4 guard extends across the new layer); `sim-clock.test.ts` and `calendar.test.ts` agree on one epoch; suite green.

## Appendix A — Method

All day numbers and weekdays computed with a script (`scripts/dec1_chronology.py` in the working environment) implementing the shared calendar rules: 365-day years, real month lengths, no leap, weekday anchored to the canon Tuesday Sept 9, Y1. Spot-checks: Sept 9, Y1 = Tue (canon ✓); Sept 15, Y1 = Mon (doc 06 §C0 ✓); 22-day epoch delta; day 809 = Nov 26, Y3.

## Appendix B — Corroboration

The Production Director's audit (`PRODUCTION-RECONCILIATION-REPORT.md` §4) reaches the same default recommendation by the same primary reading. This brief independently re-verified every claim against the source documents and code before concurring; the two documents may be read together, with this one as the narrative-canon adjudication of record.

---

*— Lead Narrative Director, 2026-11-06. **This brief ends here and waits: the project owner's explicit approval is required before any item in §6 is implemented.***
