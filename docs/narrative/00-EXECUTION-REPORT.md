# 00 — Execution Report

**Narrative Director's final report on the FIRST SLICE narrative reboot assignment**

| | |
|---|---|
| Author | Lead Narrative Director |
| Date | 2026-11-06 |
| Scope | Narrative only. No source code, no engine features, no mission content was created or modified. |

---

## 1. What was created

Seventeen files in `docs/narrative/`: the fifteen mandated documents (01–15), a README index with role-based reading orders, and this report. Together they constitute a production-ready narrative bible: an identity and tone contract (01); a protagonist with a clinically grounded dissociative-amnesia spec, a fixed psychology, and a six-stage development arc (02); a three-layer diary/map system with ten entry kinds, epistemic tags, an authored contradiction ledger (K1–K8), and a self-portrait mechanic (03); a definitive neighborhood bible that adopts the built world — Alder Heights, the registry's streets and landmarks, the K line, the M121 — and adds its history, economy, institutions, and the Juniper Commons conflict (04); sixteen deeply specified major characters plus a twenty-plus supporting roster, each with independent lives, finances, secrets, and off-screen calendars (05); a complete six-chapter master storyline spanning ~27 in-game months with per-chapter events, conversations, decisions, consequences, and diary states (06); per-character arcs including "without the protagonist" default trajectories (07); a full betrayal architecture — the appetite ladder, two specified betrayals, the 1994 mirror, the villain-question scene, per-victim repair dials (08); the downfall as a five-trigger cascade with an eight-domain loss ledger, the 19-investor amends economy, and six ungraded continuation paths (09); a choice architecture with four classes of decision, a 17-node register, and omission tracking (10); the first-session script built on the shipped Day 1–4 beats (11); a relative-dating timeline with month precision (12); a dialogue and style guide with a voice table and staging rules (13); an implementation spec of fifteen requirements for the building agents (14); and a continuity/canon register with a naming registry and ruling protocol (15).

## 2. Decisions established as canon

The neighborhood names (Alder Heights et al.) are approved, resolving the registry's open decision. The old storyline is rebooted; the world, systems, and design laws carry. The protagonist is Leo Marsh (name customizable, personality fixed): egocentric, ambitious, generous, dishonest when useful, carrying a 13-month localized amnesia with a Pittsburgh fugue, diagnosed Y-2, never fully recovering, with three in-story disclosures. The condition follows fixed clinical rules (doc 02 §4, sources cited); it is never supernatural, never an excuse, never fully cured. The diary is the map: append-only, three layers, biased by design, with the contradiction ledger as its conscience. The central conflict is Corvus Group's Juniper Commons — no conspiracy, only land, money, memory, and paper; the 1994 Alder Compact (Ernie Ferreira's betrayal) is its buried rhyme. Betrayal I is the Compact break; Betrayal II is Kev and the jobs number; the betrayal-in-return is a five-trigger cascade whose every actor has independent, documented motives. The fall is structural and its shape is earned; it costs $47,300 in restitution and the shop, and ends at the terminal with "Day 1 again." The game does not end there: the amends economy (19 named investors, per-row payment verbs), the six continuation paths, the concessions hearing, the late tests, and the self-portrait carry the life afterward. Protected canon lines are registered in doc 15 §1.

## 3. Narrative questions that remain unresolved

Eight are flagged honestly in doc 15 §3: the default protagonist name (brand call); economic figures pending tuning; the formal rating/profanity pass; legal plausibility review of the 1994 Compact mechanics; UI copy for health-and-safety review; the VO/translation strategy for code-switched dialogue; the seasonal pass's scope and phasing; and the intended openness of post-C6 long-tail content. None blocks implementation; each names its owner and touchpoint.

## 4. What the building agents need to know

Read 14 first. PRIORITY-0: re-point `tests/docs-hygiene.test.ts` (case 3) at `docs/narrative/00-README.md` — until then, exactly one hygiene case fails, by design of the docs reset, with no other suite affected. The narrative adds systems (diary, ledger, rails, independence ticks, windows, amends) as pure state behind the `content.ts` seam, Save-v1-safe, test-pinned. The shipped Day 1–4 content is retained and recontextualized, not rewritten: the cart handover line stays and now carries a deliberate mishear (K1); the Day-4 stranger beat stays and becomes the story's hospitality thesis. C0 ships against the existing opening; chapters gate on triggers plus in-game days; real-world time does not exist in the fiction. The "without the protagonist" trajectories in doc 07 are binding defaults, not contingencies.

## 5. Implementation dependencies

The docs-hygiene guard re-point; the diary/ink UI layer (font atlas + wobble style, two draw calls of UI); the seasonal pass from C1 (art/tech phase W6 candidate); interior spaces on the W5 plan (Corner Slice, the Cecil room, the diner; the render room stageable in existing spaces); the manual's phase-line and legacy-doc links to be refreshed by engineering leads (this bible deliberately did not edit `AGENTS.md`); and the registry's continued governance of geometry while docs 01–15 govern story. `docs/data/*.json` was intentionally preserved during the docs clear — it is live build data, not narrative.

## 6. Limitations and research uncertainties

Clinical grounding for dissociative amnesia was checked against the Merck Manual (Professional), the DSM-5-TR criteria as summarized by traumadissociation.com, and the ISSTD adult treatment guidelines (3rd revision); the game dramatizes beyond these (the diary UI, the fragment schedule) and marks the fictional layer explicitly (doc 02 §4.5). Prevalence figures in the literature vary widely (≈0.2–7.3%); the bible avoids asserting a number in-game. New York texture (rents, transit, carting-industry history, land-use process) is written as calibrated fiction in a fictional composite neighborhood; real institutions are never named as story actors. One historical suicide-adjacent ambiguity (fragment F7) is governed by strict content rules (never depicted, never confirmed, one therapy line, opt-in resource note) — this was a deliberate creative and ethical boundary, and any build that softens it is a canon violation. Finally: this bible was audited for internal consistency (see below), but it is one director's synthesis of a large brief; the ruling protocol in doc 15 §7 exists precisely so the canon can keep being challenged, refined, and finalized by the team it was written for.

**Audit note.** A cross-document consistency pass was performed on names, dates, sums, and cross-references (naming registry collisions, the 61,500/47,300 arithmetic, chapter windows, ages, the K1–K8 ledger, fragment scheduling); placeholder scan clean; no unresolved `TBD/TODO/XXX` markers ship in the canon set.

— Lead Narrative Director, 2026-11-06
