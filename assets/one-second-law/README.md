# assets/one-second-law/ — Doc 55 item 4 capture prep

**Status: frames captured — the never-visitor audit is PENDING. The checklist
box (docs/55 §4) stays unchecked until a human shows these frames to someone
who has never been to New York and gets 10/10 "New York" within one second.**

This directory is the capture prep the checklist's audit calls for: ten
paused frames, **randomized, not curated** — the axis spread docs/55 §4
names (day, district, time-of-day), drawn by seed, not by hand:

- **Seed:** `20261105` (mulberry32; the whole draw is reproducible)
- **Regenerate:** `cd web-three && npm run build && node scripts/probe-one-second.mjs --seed 20261105`
- **The draw:** 10 distinct districts · day 1 ×2, day 2 ×3, day 3 ×3, day 4 ×2
  · noon ×5, dusk ×5 — stratified so every day and time-of-day lands, random
  within the strata (the manifest carries the exact draw: `manifest.json`)
- **Every coordinate is a real standable spot** harvested from the shipped
  probes/builders (visual-d3/d4b, probe-court, probe-subway, probe-storefront,
  probe-freeroam, probe-reach-top, `World.ts` W2) — nothing invented (the
  docs/45 law). Each frame's staging walks a few real steps before the
  shutter, so the follow cam settles the way a paused real session looks,
  and an anchor that cannot move fails the run outright.
- **The HUD dresses like the day it depicts** (docs/51 B12's law): day,
  wallet, cart name, objective, and the day's world flags — every field set
  explicitly per frame; each day stages its widest-range step (the
  errand/delivery/poster/stranger walks) so the objective header never names
  a beat the player could not be mid-way through at that moment.
- **The camera is never parked.** The audit pauses a real session — the
  frame is the follow cam's own framing, portrait 720×1280 (the
  Vertical-First Law composes first).

What the human pass owes (docs/55 §4, verbatim in intent): show each frame
for one second to a never-visitor, ask "Where are you?", record the answers.
Pass rule: 10/10 identified as New York within 1 s, unprompted. Any miss is
a district/art debt — it gets a docs/51 entry with the frame attached.
(If they ask "how many windows are there?", the fantasy leaked — Doc 07
VS-F08's own tripwire.)

Evidence when the audit runs: the answers land in this README (or a note
beside it), and the box gets its owner name.
