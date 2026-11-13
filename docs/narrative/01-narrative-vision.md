# 01 — Narrative Vision

**FIRST SLICE: A New York Story — Definitive narrative identity, themes, and storytelling philosophy**

| | |
|---|---|
| Status | Canon (v1.0). Highest narrative authority in the repo. |
| Owner | Lead Narrative Director |
| Read with | `AGENTS.md` (operating law), `docs/data/world-registry.json` (construction geometry), docs 02–15 (this vision made specific) |
| Supersedes | All prior story documentation (legacy docs 01–57, removed 2026-11-06; preserved in git history). The old storyline is not binding. |

---

## 1. The identity in one paragraph

FIRST SLICE is a life simulation about a man with holes in his memory who arrives in a New York neighborhood he has only ever seen through a screen, and slowly becomes somebody there — the charming fixer everyone counts on, the face of the future everyone argues about — until the future arrives and it is made of everything he broke. The city keeps moving the whole time. The block keeps a diary of him. He keeps a diary of it. By the end, the two records disagree, and the disagreement is the story.

## 2. What this game is — and is not

**It is.**

- An open, explorable life simulation: work, neighbors, relationships, meals, seasons, subways, small money, big weather.
- A prestige-drama storyline (six chapters plus an open aftermath, roughly three in-game years) woven through that simulation, with the production values of excellent character-driven television.
- A world that runs without you. Characters have jobs, moods, arguments, and plans that proceed whether or not you show up. Some doors close while you are elsewhere. The block does not wait, and it does not punish — it just moves.
- A story about consequences that arrive on their own schedule, not a morality meter's.

**It is not.**

- Not a business-management or tycoon game. The Slice Ladder (counter → shop → café → hall → rooftop) exists because ambition is the protagonist's engine, not because the player is asked to optimize revenue.
- Not a linear mission chain. Chapters are weather systems, not corridors: they change what is true in the world for a stretch of in-game time.
- Not a crime game. Organized interests exist (doc 04), but the protagonist is never a mobster, and crime is never a gameplay pillar.
- Not a tourism brochure. New York appears as a place where millions actually live: rent day, the M121's schedule, alternate-side parking, the bodega cat, the commute.
- Not a redemption machine. The aftermath offers paths; it does not absolve.

## 3. The reboot register

The narrative is a total reboot of the *story*, not of the *world*. What carries over, what changes:

**Carried over (binding, already built or budgeted):**

- The physical world: Alder Heights, upper Manhattan — Kestrel Street between Juniper and Sycamore Avenues, Gable Row, Marlow Street, the K train under Juniper, the M121, Alder Heights Terminal, the Subway Plaza, Kestrel Green, the Gable Garden, the half-court, Rosa's Deli & Grocery, Sunrise Laundry, Corner Slice Pizza, the Cecil, the Alder Works Hall and its ghost sign, the K-Globes, the Three Towers, the red steps, the flyer boards, the window diaries, the bodega cat.
- The shipped opening beats (terminal arrival, Rosa's bodega, the cart, Mr. Idris's usual, the kid in the gold window, the fire escape, the postcard, the Day 4 stranger) — absorbed, recontextualized, not deleted (doc 11).
- The systems: the Map notebook, the city's ambient diary (`src/core/diary.ts`), MEMORY_LINES, the Roam layer, postcards, save/resume, the starter-look picker and name entry.
- The repo's design laws (1-Second, Wonder-Beat, No-Quiz, Feelings-First, Vertical-First, No-FOMO, Hospitality) — all retained; the narrative builds inside them (§4).

**Rebooted (this bible's authority):**

- The protagonist: no longer a blank, humble newcomer. He is Leo Marsh (name customizable, personality fixed): 26, ambitious, egocentric, funny, generous, dishonest when it is useful, and carrying a thirteen-month hole in his memory that no one in New York knows about.
- The master storyline: from a four-day cozy spine to a three-year drama with a defined fall and an open aftermath.
- The cast architecture: the regulars become a true ensemble with independent lives, private debts, and their own ends (docs 05, 07).
- The stakes: a redevelopment conflict (Corvus Group's Juniper Commons) that the neighborhood would be fighting with or without the player.

## 4. The tone contract: a warm block in a cold world

Alder Heights stays what it was built to be — golden-hour brick, stoops, steam, the 1-Second Law. The drama does not darken the palette; it darkens the *ledger*. The colder the things Leo does become, the warmer the block stubbornly stays, and the gap between the two is the game's emotional engine. Grief, betrayal, and ruin happen in a place that keeps making you breakfast.

This contract resolves the apparent conflict between the legacy "cozy" framing and the new dramatic mandate:

| Legacy law | Resolution under this vision |
|---|---|
| Wonder-Beat Law | Retained. Wonder sharpens: the wonder of the fall is that the same corner that lit a window for a stranger can watch one get evicted. |
| Feelings-First Law | Retained and extended: memory gaps are felt before they are named. "The island of tall evenings" before "Manhattan"; "the year I can't find" before "dissociative amnesia." |
| Hospitality Law | Retained as the story's spine, not just its endgame. The final question the game asks is which slice Leo took, and which he left. |
| No-FOMO Law | Retained. Missed story moments are *missed*, not monetized or re-offered; consequences are content, not pressure. |
| 1-Second / Vertical-First | Unchanged; all narrative UI (diary, map ink) composes 9:16-first. |

## 5. The narrative laws (binding on all story content)

1. **The City-Moves Law.** Every named character has an independent calendar. Off-screen, their lives tick forward: jobs, feuds, court dates, holidays, and at least one decision per chapter the protagonist did not cause and cannot veto.
2. **The Ledger Law.** Every significant act is recorded once — in the world's state, not in a judgment UI. Consequences fire when their *cause* matures (a lease expires, a rumor reaches a landlord, a payment bounces), never on a karma schedule.
3. **The No-KR Law (no "kindness rewarded").** Generosity is not a currency. Helping sometimes pays, sometimes costs, and sometimes pays the wrong person. The player is never shown a favor score.
4. **The Memory-Is-A-Character Law.** Leo's amnesia behaves by fixed clinical and design rules (docs 02, 03). It is never a teleporter, never an excuse, never refilled for convenience. When a gap fills, it is because something in the world earned it.
5. **The Two-Diaries Law.** The player always has access to two incomplete records: Leo's field diary (biased, funny, sometimes wrong) and the city's diary (the block's memory of him). Neither is truth. The truth is what happened in between.
6. **The Slice Law.** Every chapter's climax is a transaction. Someone pays. Someone is paid. Someone watches. If a chapter ends and nobody has paid for anything, the chapter is not done.

## 6. Themes

- **Appetite.** New York is a hungry city and Leo arrives hungry. Pizza is the sacrament: the first slice, the fair slice, the slice you take, the slice you leave for the next person. Every escalation in the story is an appetite growing past its plate.
- **Being seen vs. being known.** Leo's whole arc is the trade of one for the other. The block sees him long before anyone knows him; the one person who knew him before (Rachel) is the one he cannot stand to be known by.
- **The map and the territory.** The diary is not the life; the ledger is not the friendship; the redevelopment render is not the neighborhood. Everyone in this story is living inside a drawing of the place, and the place keeps correcting the drawing — in ink that never quite erases.
- **Who pays for the future.** No villain owns this conflict. The tower would rise whether Leo arrived or not. The question is always: whose rent, whose memory, whose store, whose block pays for it — and who decided.
- **The record.** Deeds, petitions, ledgers, letters never sent, diary pages never corrected. The past in this game is paperwork and ink, and both are admissible.

## 7. Why the title (the four slices)

1. **The ritual.** At Corner Slice, the first slice of the day's first pie is cut for whoever opens the gate. Leo's first scene of work is receiving that slice standing up. It is the best thing that happens to him all year, and he will spend three years learning why Eddie gives it away.
2. **The city.** A neighborhood is too big to know; a block is a slice you can hold. The map grows by walking (doc 03).
3. **The pie.** His share. His cut. The part he believes he is owed for being the smartest person at every table he has ever sat at.
4. **The remainder.** The endgame's question, put to the player without a UI: after everything, is there a slice left on the counter for the next stranger — and who put it there?

## 8. Creative lineage (qualities studied, content refused)

The brief names six works. What each contributes to this bible — and what is explicitly refused:

| Work | We take | We refuse |
|---|---|---|
| *The Fable* (Minami) | The comedy and dignity of ordinary routine performed by someone with an extraordinary private weight; the discipline of a double life. | Hitman premise, assassination plot machinery. |
| *Durarara!!* | Ensemble-web storytelling: many POVs, rumors as weather, the city as a character whose "myth layer" (our Ghost Sign, the pizza rat) is fan-belief, not fact. | Supernatural elements; the anonymous-gang mythology. |
| *ODDTAXI* | Conversation as mystery; a mundane workplace as the hub where everyone's ledger touches; an unreliable narrator the audience gently outpaces. | The noir crime backbone and its violence. |
| *Great Pretender* | Long-con structure: schemes that look like good fortune until the invoice arrives; stylized confidence as characterization. | Heist plot content; cartoon caper logic in the fallout. |
| *Black Lagoon* | An unsentimental ecosystem view: every faction has a reason, morality is local, nobody is the hero of someone else's story. | Roanapur-scale violence and cynicism as the default temperature. |
| *Snowfall* | The arithmetic of ascent and erosion: each season's win quietly purchasing the next season's loss; a protagonist the audience understands without forgiving; a downfall assembled from the character's own blueprints. | Its drug-trade subject, setting, and characters. |

All characters, plots, scenes, and dialogue in this bible are original to FIRST SLICE.

## 9. Storytelling philosophy

- **World first.** Scene ideas are admitted only if they can happen to this block, to these people, at this price. If a beat requires the world to freeze while the protagonist feels something, the beat is rewritten.
- **Autonomous cast.** A character's biography (doc 05) must contain a year of their life in which the protagonist is a rumor. Supporting characters are not vending machines; a request may be refused, taxed, or answered with a counter-favor.
- **Restraint.** The story never says "he had become the villain." It shows him holding a receipt he wrote himself, in his own handwriting, two years earlier (docs 03, 08). The biggest beats are staged in small rooms with the television off.
- **The unspent gun is allowed.** Not every planted element fires. Some threads stay threads. Life is like that; the diary says so.
- **Comedy is load-bearing.** Leo is funny; the block is funny; grief without humor is not this game. Jokes are characterization and, twice per chapter, camouflage for cruelty.

## 10. Audience and content register

- Primary audience: players who love character drama and city texture; never-visitors to New York remain the design's north star (the city is still the tutorial).
- Tone rating assumption: mature themes (illness, displacement, betrayal, financial ruin, a person's capacity for self-deceit) rendered without explicit violence, slurs, or sexual content. Profanity is permitted and rare-precious (doc 13).
- Mental-health content (dissociative amnesia, depression, and one historical crisis night that is *never depicted, never reconstructed as intent, and never confirmed* — doc 02 §8) is written to be clinically credible, non-sensational, and supported in-UI by an opt-in resource note the first time heavy beats fire (doc 14, R12).

## 11. What "done" means for this bible

The storyline is production-ready when a building agent can implement any chapter, character, or diary entry from these documents without inventing a fundamental story decision; when every named character's behavior across two chapters can be predicted from docs 05 and 07 alone; when the fall (doc 09) can be traced backwards scene by scene to choices documented in docs 06, 08 and 10; and when the continuity register (doc 15) contains no contradiction between any two files. This document set was audited against that standard (see 00-EXECUTION-REPORT.md).

— Lead Narrative Director, 2026-11-06
