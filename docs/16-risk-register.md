# FIRST SLICE — Risk Register

**Scope:** Phase 0 through end of Vertical Slice (Phase 1)  
**Last updated:** 2026-10-28  
**Review cadence:** Every two weeks or after any major playtest / spike result

Only risks that can meaningfully damage the feel, schedule, or shippability of the Vertical Slice are listed. Low-level implementation risks belong in task trackers, not here.

---

## Risk Table

| ID | Risk | Likelihood | Impact | Owner | Mitigation | Early Warning Signs |
|----|------|------------|--------|-------|------------|---------------------|
| R1 | Postcard capture feels like a screenshot instead of a composed memory | Medium | Critical | Tools Eng + GD | Run TS-01 early. Treat postcard camera as a designed rig, not a free cam. Use Styleframe C as quality bar. | Playtesters say “it’s just a screenshot.” Share rate feels forced. |
| R2 | Map feels like a tutorial menu or quest log | Medium | Critical | GD + Narrative | Keep Map imperfect and voluntary. Never gate progress. Test language people use to describe it. | Players call it “the menu,” “the log,” or ignore it completely. |
| R3 | Serving conversation becomes a stress puzzle | Medium | High | GD + Gameplay | No timers, no fail states, no scores in VS. “Chef’s welcome” always available. | Players tense up, apologize for mistakes, or ask “did I do it right?” |
| R4 | Vertical Slice scope creeps beyond Day 1 | High | High | Producer + GD | Doc 07 OUT list is sacred. Any new request must displace something else or be deferred. | New systems or locations appear in conversations without a matching cut. |
| R5 | Performance misses on low-end Android | Medium | High | Tech Artist | Run TS-03 early. Stick to 1 realtime light + baked GI. Enforce budgets from day one. | Frame time spikes in greybox, thermal throttling in 15-min sessions. |
| R6 | Cart / visual language drifts between styleframes and production | Medium | Medium | Art Director | Styleframe A is the cart authority. Any new cart must be checked against it. | New cart models or screenshots look like a different game. |
| R7 | Day 1 content feels thin or touristy | Low | High | Narrative + GD | Stick to feelings-first notes. Avoid fact-dumping. Re-read Doc 08 against the Laws. | Playtesters say it feels like a guidebook or “for tourists.” |
| R8 | Team loses the “never-visitor” perspective | Medium | High | GD | Regularly test with people who have never been to NYC. Keep the No-Quiz and Feelings-First Laws visible. | Explanations start assuming knowledge. Slang appears without context. |
| R9 | Postcard share pipeline has platform friction | Medium | Medium | Tools Eng | Spike native share early (TS-01). Keep VS share simple (no deep links required). | Share sheet fails or feels broken on one major platform. |
| R10 | Phase 0 never ends / perfectionism delay | Medium | High | Producer | Exit criteria are written. When greybox makes people smile at the postcard, move forward. | Endless polish on docs or styleframes with no playable proof. |

---

## Risk Severity Guide

- **Critical:** Can kill the core fantasy or make the Vertical Slice fail its exit criteria.
- **High:** Can cause significant rework or miss the “feel” targets.
- **Medium:** Painful but recoverable inside the current phase.

---

## Current Highest Priority Risks

1. **R1 – Postcard quality** (the product’s signature moment)
2. **R2 – Map tone** (the soul of the teaching system)
3. **R4 – Scope creep** (the most common way soft games die)

These three should be actively watched during every review.

---

## Closed / Accepted Risks (for now)

| Risk | Status | Notes |
|------|--------|-------|
| Paper prototype validation | Accepted / Skipped | User chose to skip formal paper playtests. Monitor for related issues in greybox playtests instead. |
| Final handwriting font | Open but low urgency | Tracked in Doc 07 TBD-4. Not blocking greybox. |

---

## How to Use This Register

- Any new risk that can affect the Vertical Slice exit criteria gets added here.
- When a risk is mitigated or accepted, move it to the Closed section with a note.
- Do not track minor bugs or ordinary task-level issues here.
- Revisit after every spike result and every external playtest.

---

*The biggest risk is building something technically fine that does not make a never-visitor feel looked after by the city. Everything in this register exists to protect that feeling.*
