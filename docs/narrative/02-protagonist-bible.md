# 02 — Protagonist Bible

**Leo Marsh — biography, personality, psychology, dissociative amnesia, and development**

| | |
|---|---|
| Status | Canon (v1.0) |
| Depends on | 01-narrative-vision.md |
| Read by | All other narrative docs; doc 14 turns its rules into requirements |

---

## 1. Identity and customization protocol

- **Default name:** Leo Marsh. The player may change first name, last name, and nickname at start (the existing starter-look picker and name entry carry over). Throughout these documents he is written as "Leo" for readability only.
- **Fixed by canon:** age at arrival (26), birthday (February 11), hometown (Elyria, Ohio), family, work history, the Lost Year, the condition, and every trait in §2. Name and appearance are strings; the personality is the character.
- **Implementation note:** all canon attaches to the identity constant `LM-PROTAGONIST`. Dialogue must propagate the chosen name (doc 14, R11). The block never learns the surname casually — neighbors call him by first name, which the game treats as earned intimacy.

## 2. The fixed personality

### 2.1 The ego architecture

Leo's self is built like a storefront: attractive, lit, and advertising something not necessarily in stock. Its load-bearing parts:

- **The audience in his head.** Leo narrates himself from outside. In public he performs a slightly better version of himself ("the kid from Ohio walks in like he owns the lease"); alone, the first-person voice is smaller and meaner. The diary is where the two voices meet, which is why it sometimes reads like two authors.
- **The wound.** His father Gerry called him "the smart one" for thirty years. It was never praise; it was a job description — *you are the one who fixes this.* Leo has been working that job without pay since he was twelve. Every scheme is an attempt to finally invoice somebody for it.
- **The engine.** During the Lost Year (§4), people loved him and he has no record of it. He learned the one unbearable fact of his condition: you can be loved and not know it. His response is the thesis of his whole New York arc: *if I am visible enough, no one can ever lose me in a crowd again.* Ambition, for Leo, is a fear of being unrecorded.
- **Generosity with receipts.** He tips big, remembers birthdays, feeds people who didn't ask, fixes things that weren't his problem — and he knows exactly what all of it cost him. Generosity is real AND is frequently a down-payment on loyalty. Both things are true, which is what makes him a person.
- **Intelligence.** Genuinely sharp: he reads rooms, patterns, and people fast, and he is sometimes the smartest person present. His confidence, however, is not correlated with his accuracy. The game's cruel joke is that he is right most often when he is least sure, and catastrophically wrong when most certain.
- **The hardest verb.** Admitting error. He performs apology before he means it ("I'm sorry you feel that way" is his reflex); real apology happens twice a chapter at most, is always a scene, and is always logged in the diary with visible discomfort.

### 2.2 The contradictions ledger (for all writers)

He wants loyalty and betrays people. He wants truth and runs on his own narratives. He mocks influencers and learns their tricks in a week. He says the block made him and builds himself at the block's expense. He keeps everyone's secrets and none of his own. He claims memory doesn't define a person and is terrified of his. He hates his father's stubbornness and is his father's stubbornness. **These contradictions are the character;** scenes should exploit, not resolve, them.

### 2.3 What he is not

Not a psychopath; his conscience is loud, late, and inventive. Not stupid; his errors are of certainty, not capacity. Not secretly kind at core nor rotten at core — the bible refuses both reveals. Not unlucky: his catastrophes are constructed, which is why the fall (doc 09) can be traced backwards beam by beam.

## 3. Pre-game biography (established facts)

All dates use the story-relative system of doc 12: Y1 = the arrival year; Y-3 = three years before arrival.

| When | What |
|---|---|
| Y-26, Feb 11 | Born, Elyria, Ohio. Sister Bea is five years older. Family lives over/near **Marsh & Son Furniture**, founded by his grandfather, run by Gerry. |
| Y-26 … Y-8 | Childhood: stockroom kid, counter kid. Learns to read customers before he reads books. "The smart one." |
| Y-8 … Y-5 | State college (Youngstown), marketing degree. First of the family to finish. Works part-year at the store. |
| Y-6 | Meets **Rachel Voss** in a stagecraft elective he took for the easy credit. Together five years (Y-6 → Y-3). |
| Y-5 … Y-4 | Works at Marsh & Son full-time. Modernizes the books. Genuinely good at it. |
| Y-4, May | **Gerry's stroke.** Survives with aphasia (speech comes slow, temper comes fast). Leo, 22, takes the wheel. |
| Y-4, summer | **The pivot.** Leo takes a $40,000 loan: rebrand, a relaunch expo, new fixtures. He is certain. He is wrong. |
| Y-3, Feb | **Rachel leaves.** She watched the certainty hollow him out. The final two weeks of the relationship are among his selective gaps (§4.2). |
| Y-3, Mar | Marsh & Son closes. Inventory auctioned. The expo banner is still in the family garage. |
| Y-3 … Y-2 | **The Lost Year** — thirteen months of localized amnesia (§4). Includes a six-week dissociative fugue ending in Pittsburgh (§4.3). |
| Y-2, Feb–Mar | Voluntary inpatient, five weeks. Diagnosis: dissociative amnesia, localized, with prior fugue episode. Rule-outs clean (MRI, EEG, toxicology). |
| Y-2, Apr–Aug | Day program. Occupational therapy hands him a green notebook: *one page a day, facts only.* He has kept the practice since (§6.1). |
| Y-2 … Y-1 | Lives with Ada. Works a garden center. Weekly therapy. Stable, flat, restless. |
| Y-1, Aug | Answers an online listing: *CORNER SLICE — counter help, will train. Room to let upstairs. Ask for Eddie.* He tells everyone — himself included — that New York was the plan. |
| Y1, Sept 9 | Arrives, Alder Heights, with $87, a duffel bag, and the green notebook. |

## 4. The condition: dissociative amnesia

### 4.1 Clinical grounding (research-backed)

The following are established, citable facts, not creative inventions:

- Dissociative amnesia (DSM-5-TR: 300.12 / F44.0) is the inability to recall important autobiographical information, usually of a traumatic or stressful nature, inconsistent with ordinary forgetting, causing distress or impairment, and not attributable to substances or a neurological/medical condition.
- Recognized patterns include **localized** amnesia (a circumscribed period — the most common), **selective** (some events within a period), **systematized** (a category, e.g., everything about one person), and **generalized/continuous** (identity and life history; rare). A **dissociative fugue** is sudden, unexpected, purposeful travel away from home with bewilderment about identity or the past, lasting hours to months.
- Etiology is overwhelmingly psychological: trauma, loss, serious financial trouble, unresolvable internal conflict. Onset is usually gradual; gaps may last days to years. There is no neurobiological damage; the memories were stored, not destroyed.
- **Course:** many people recover memories, gradually or abruptly, especially once the stressful context changes; **some never reconstruct the missing past.** Recovery is not guaranteed, not schedulable, and not total. Recurrence of gaps under new stress is possible.
- **Work-up:** diagnosis is clinical and requires ruling out TBI, seizures, substances, and other causes (imaging, EEG, toxicology).
- **Treatment:** a safe, supportive environment; phase-oriented psychotherapy (stabilization, then processing, then integration — ISSTD framework); grounding techniques and structured journaling as stabilization aids; hypnosis or medication-facilitated interviews are historical/rare adjuncts. **No drug or procedure reliably restores memory.**
- Prevalence estimates are uncertain and wide (roughly 0.2–7.3% depending on method and population); dissociative fugue is rare.

Sources consulted: Merck Manual Professional, "Dissociative Amnesia" (msdmanuals.com/professional/psychiatric-disorders/dissociative-disorders/dissociative-amnesia); DSM-5-TR criteria as summarized by traumadissociation.com/dissociativeamnesia; ISSTD adult treatment guidelines, 3rd revision (J. Trauma & Dissociation 12(2):115–187, 2011; isst-d.org); Psychology Tools grounding-techniques menu (psychologytools.com). These support every clinical claim made in this document. Where the game fictionalizes, §4.5 marks it.

### 4.2 What Leo has

- **Localized amnesia:** the **Lost Year**, March Y-3 → April Y-2 (thirteen months). He knows its *shape* from paperwork and testimony, not from memory.
- **Selective gaps** inside remembered periods: the final two weeks with Rachel (Y-3, Feb); the week of the store's closing auction; the day of his one and only visit to Gerry's rehab facility (he has a visitor's sticker he does not remember earning).
- **Systematized erosion, mild:** his memory of *how the collapse felt* is blunted — he can list the facts of the failure fluently and feels nothing, which he has decided is resilience.
- A prior **fugue episode** inside the Lost Year (§4.3). No identity change at any point: he was always Leo, just unrecorded.

### 4.3 The Lost Year — the truth of it (spoiler-graded; the game reveals ~60%)

**There is no conspiracy in the Lost Year. No crime, no secret organization, no hidden NYC connection.** It is thirteen months of grief without an audience, which the game treats as the scarier thing.

What actually happened: He stayed in Elyria roughly three months — present, functioning, blank. Ada's photo albums show a man mowing lawns and sitting in the empty store lot. Six weeks at a Columbus distribution warehouse (the lanyard fragment, "CROWNE"). A month in Youngstown washing dishes at a diner famous for pie. In November he boarded a bus for a job interview that may never have existed and did not stop for six weeks: a Pittsburgh rooming house, a landlady, and one image he will carry forever — a railing over dark water, no conclusion attached (§6.5, fragment F7 — never explained, by design). In January he called his mother from a payphone and said, "I think I'm done." Bea traced the pharmacy card. They brought him home. Five weeks inpatient; the diagnosis; the notebook.

**What the game reveals:** fragments F1–F8 (§6.4) plus testimony (Ada, Bea, Rachel, Dr. Feld, one landlady letter). **What the game never resolves:** the railing; whether the Pittsburgh weeks contained anything else worth knowing (they contain a TV that was always on, soup, and kindness he'll never recall — the game may say this much through the landlady's letter and no more).

### 4.4 What he remembers / does not remember (writer's quick table)

| Domain | Status |
|---|---|
| Childhood, family, school, Rachel (except the final two weeks), college, the store's rise | Remembered, fluent, load-bearing |
| Gerry's stroke day | Remembered with unusual clarity (the one traumatic memory that stayed — it is his benchmark for "real") |
| The business failure | Facts intact; feeling blunted (selective) |
| The Lost Year | Absent. ~8 fragments exist (§6.4); they surface only via earned triggers, never on demand |
| Everyday new memory | Intact. He is NOT Henry Molaison: he forms new memories normally. His distrust of his own memory is about the holes, not the present |
| Skills, language, identity | Fully intact |

### 4.5 Fictional elements (marked, not clinical)

The diary-as-map UI, the FACT/RECALL/GUESS tagging, the contradiction ledger, and the trigger-object mechanics are **game design**, not therapy protocol — grounded in real stabilization practices (structured journaling, grounding, routine anchors) but dramatized. The eight-fragment schedule is authored drama. Nothing in §4.5 should be presented in-game as medical advice; Dr. Feld's dialogue (doc 05) keeps clinical statements conservative.

## 5. Living with it (everyday systems)

These are implementable behaviors, not color:

1. **The morning audit.** Before anything, he reads yesterday's last page. The game's day-begin diary prompt is this habit (doc 03).
2. **Write-before-sleep.** If the day isn't logged, the day didn't happen. The player's diary prompt fires at night.
3. **Source-checking.** Repeats figures aloud once; photographs every notice; keeps receipts folded in the notebook's back pocket. "Paper is memory you can show people."
4. **Two calendars.** Never trusts recall for appointments. Everything enters the Map.
5. **The grounding kit.** When derealization hits (cold sweat, the world going "like TV"), the protocol: cold can from the bodega, name five things with edges, sit on the ground — *the floor is always true.* The game renders this as a 20-second interaction, not a cutscene.
6. **Triggers.** Exhaustion, alcohol, and certain hums (dryers, motel ice machines, fluorescent fixtures) lower the floor. He moderates all three, sometimes successfully.
7. **Secrecy management.** In New York, exactly three people learn the truth across the whole story: June (C4), Eddie (C5, the worst scene), and Dr. Feld (C4 onward). Rachel never receives a disclosure — she knew him before, which is different and worse. The diary records every lie of omission he tells; the player watches him do it.

## 6. Memory behavior in the game (the rules writers and builders implement)

1. **Never on demand.** No character can shake a memory loose by shouting. No item "unlocks" a flashback. Fragments arrive via **earned triggers** — a specific sensory cue after a specific emotional state, authored per chapter (doc 06 schedules them; doc 03 renders them).
2. **The fragment register.** Eight fragments, five of which surface in the story:

| # | Name | Content (≤3 sensory lines, never cinematic) | Trigger | Chapter |
|---|---|---|---|---|
| F1 | The ice machine | Motel hallway hum; carpet pattern; a door that isn't his | Sunrise Laundry's dryer bank, end of day | C1 |
| F2 | The glass | A hand flat on visiting-room glass; his own palm, hours later, still shaped | Eddie's hospital window | C3 |
| F3 | Zanesville | Dusk through bus glass; a green highway sign; the taste of vending-machine coffee | M121 window, riding the loop at dusk | C2 |
| F4 | The parking structure | Fluorescent light; a hood of a car still warm; crying with no reason attached | The parking level under the Corvus render site | C4 |
| F5 | The payphone | Coins leaving; the dial tone after; his own voice saying a sentence he can't hear | Rachel's retelling completes the circuit | C5 |
| F6 | Crowne | A lanyard; shrink-wrap; the beeper of a scanner gun | Kev's delivery-job lanyard | C1 |
| F7 | The railing | Cold metal; river dark; — full stop. No conclusion. | El Vann's bridge story | C4 |
| F8 | Day 1 | A green notebook; a nurse's handwriting: *facts only*; the words "Day 1" dated thirteen months after the year began | Writing the endgame self-portrait | C6 |

3. **Recovery is partial and permanent.** Across three years Leo recovers five of eight fragments and glimpses of the year's texture. **He never recovers the Lost Year.** No ending (doc 09) contains a full restoration; any build that restores it is a canon violation.
4. **Fragments recontextualize, never exonerate.** Each one changes what Leo *understands*, none changes what happened. None is evidence of a crime, because there is no crime.
5. **The gaslight ban.** The game never falsifies the player's records to fake a twist. If the diary says X and reality is Y, the discrepancy is *authored and fair-played* (doc 03's contradiction ledger), never a cheap bait-and-switch.
6. **The ambiguity policy.** The railing (F7) is the condition's cost, staged once, never resolved, never depicted as a scene, never narrated with intent. Dr. Feld's only canon line about it, in C6: *"Whatever happened at that railing, you walked home. That's not nothing."* This is the game's entire statement on the subject, and it is enough.

## 7. The development arc (six stages)

| Stage | Title | Period | Self-story | The lie he believes |
|---|---|---|---|---|
| I | The Stranger | C0–C1 (Y1 Sept–Dec) | "I'm here to become somebody." | That the city is a stage that's been waiting for him. |
| II | The Fixer | C2 (Y2 Jan–Jun) | "I'm useful. Useful is safe." | That the Compact break saved the block from worse. |
| III | The Broker | C3 (Y2 Jul–Dec) | "I'm the bridge. Bridges get tolls." | That he can hold everyone's weight because he is the strongest. |
| IV | The Face | C4 (Y3 Jan–Jun) | "I am the future of this block." | That being seen is being known. |
| V | The Nothing | C5 (Y3 Jul–Nov) | "I don't know what I am without the audience." | That he was ever doing any of it for them. |
| VI | The Open Question | C6 (Y3 Dec →) | Player-authored; the diary's self-portrait is the only narrator left. | None supplied. This is deliberate. |

His therapy thread (Dr. Feld, weekly, C4 onward) is the arc's metronome: it never "fixes" him; it gives him a room where he is not performing, which is the thing he has not had since Ohio.

## 8. Sensitive-content rules for this character

- The fugue, the hospitalization, and the railing are **never** depicted as playable flashbacks or cinematic dream sequences. Fragments are text/sensory, three lines or fewer.
- No memory recovery during action, argument, or spectacle. Recovery is quiet, small, and usually inconvenient.
- The first time F7-equivalent content appears in any build, the opt-in resource note fires (doc 14, R12). This is not optional.
- His condition is never used as a joke by the narrative (characters may mishandle it; the game's framing may not).
- Leo's lies about the condition are written as understandable, costly, and his responsibility — not romanticized.

## 9. Voice sample (full voice rules in doc 13)

> *"Day 1. New York, if the bus is to be believed, which it shouldn't be, it smelled like a janitor's dream. $87. Notebook. One job, one room, one rule: write it down before the city makes you doubt your own handwriting. Today I learned the F train does not go where the map says, that a chop cheese is not a cheese chop, and that my landlord's name is Eddie and he handed me a slice of pizza and said 'eat standing up, that's the job' — and I want you to know, notebook, that I have been to college. Facts only. I'm the smart one."*

— Lead Narrative Director, 2026-11-06
