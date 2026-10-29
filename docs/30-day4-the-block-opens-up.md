# Doc 30 — Day 4 Afternoon: "The Block Opens Up"

*The block was always this big. You just hadn't walked it.*

Day 4's morning ([Doc 29](29-day4-say-hi.md)) is the Hospitality Law chapter:
you keep a stranger. The afternoon asks the next question — what does the
block look like when it starts keeping YOU back? Three days you served the
corner. Now the corner has more corners. This is the first rung of the
Slice Ladder (Cart → Bodega → Café → Food Spot → Rooftop): not a café, not
yet — the *paperwork* of one.

---

## 1. What it is

The Map has changed hands. The kid, from his stool, flags the obvious:
*"Your apron has a MANGO on it. I can see the mango from here."* Four days
is four days. Two doors from Rosa's, the storefront that has been background
since Day 1 — SUNRISE LAUNDRY — is a real place now, and it has been the
whole time. That's the chapter's joke and its point: the block didn't grow.
You did.

| Beat | Step | What happens |
|---|---|---|
| The handoff | `D4_MAP` | She leaves with the Map. The kid flags the apron; the objective turns west. |
| The bay | `D4_LAUNDRY` | Sunrise Laundry, opened up: a recessed bay against the building — teal awning, real sign, warm interior, two front-loaders, Sal behind a waist-high counter. You hand him the apron. First wash is on the house: *"The aprons are advertising."* |
| The wash | — | The near drum actually spins (Rule of Steam). A few steps of real time. *Warm from the dryer: the apron, clean. The mango had a good run.* |
| The notice | `D4_PERMIT` | An A-frame by the crosswalk — the city posts things where you'll read them. MOBILE FOOD VENDING PERMIT — APPLICATION. One page. $10 to file. Confirm-gated like the awning and the stool. |
| Filed | → `D4_CLIMB4` | Sal witnesses, because that's a thing he does now. The receipt goes on the cart — taped to the street side, the way the city makes you display your papers. Dusk proceeds as written. |

**Money math (all honest):** the morning banks $133. The filing is $10,
spent exactly once — a replay of a kept day re-reads the notice and files
nothing. The day ends **$123**, and the postcard says so.

**Why a laundromat:** the directive allowed one location — a café, a bakery,
a laundromat, or a gathering space. The laundromat was already ON the block
(Day 1's background), so the block stays coherent: no new city, just a door
that was always there. It serves the cart honestly (aprons, napkins — a real
coffee-cart need), and it gives Sal a counter to witness your paperwork at.
The permit — not a shop — is the expansion: Day 5+ inherits a *filed
application*, a fund, and a Monday deadline. A beginning, not a business sim.

## 2. The systems underneath

- **Steps 28–29** (`D4_LAUNDRY`, `D4_PERMIT`), inserted between the Map
  handoff and the dusk climb; `D4_CLIMB4/D4_POSTCARD/DONE` renumber to
  30/31/32. Nothing persists a raw step number, so saves don't notice.
- **Save v1 + `permit`** (optional key, back-compat: pre-Day-4 saves parse
  unchanged, key unchanged). The stool rule applies: a filed permit is
  permanent — no morning un-files your paperwork; only a parsed save may
  set it. `beginDay` re-hangs the receipt to match.
- **The confirm gate** is the awning's, the stool's: first press reads, the
  second press files, a third press is dead input. Repeat input can never
  double-spend.
- **The wash runs on the Game's clock** (same pattern as the brew gate):
  `apronWashing` → drum spins → `completeWash()` → drum stops. The note
  lands whenever the machine finishes; nothing waits on it.
- **Sal** is a persistent cast member from Day 1 — he was always at that
  counter; the prompt just never knew his name. He breathes with the rest
  of the cast. His chat line while the washers run: *"Thirty years at this
  counter. The permits change. The socks don't."*

## 3. Sound (the layer arrives with the block)

`src/game/audio.ts` — original, synthesized, asset-free. A low city bed, a
slow traffic swell, a pigeon now and then; the urn hisses when you brew, the
washer hums while it spins, the stamp lands when you file, and Day 4's
fourth window gets one soft bell. Gesture-gated (the first tap unlocks it —
no autoplay fight, never a loading gate), one voice per event, and a real
mute button in the HUD (aria-pressed, remembered). Full notes: [Doc 32](32-audio-notes.md).

## 4. Files

- `web-three/src/core/content.ts` — objectives 28–29, Sal/permit/apron
  notes, kid's mango line, prompt verbs, Day-4 captions (normal + replay,
  both mention the permit/receipt), canvas-sign text
- `web-three/src/core/GameState.ts` — steps 28–32, `apronWashing/apronClean/
  permitFiled/permitConfirm`, `handApron/laundryChat/readPermit/completeWash`,
  `giveMap` now opens the afternoon, relevance map, snapshot + `permit`
- `web-three/src/core/Save.ts` — optional `permit` (back-compat, key unchanged)
- `web-three/src/world/World.ts` — `buildLaundromat()` (bay, piers, warm
  interior, washers + spinning drum, counter, awning, sign), Sal, the shirt
  rack, the A-frame notice, the receipt, washer state, the tree that used to
  stand in the bay moved one door east
- `web-three/src/game/Game.ts` — interactables + routing, effects, the wash
  timer, receipt restore in `beginDay`, audio hooks, debug handles
- `web-three/src/game/audio.ts` — **new**, the whole layer
- `web-three/index.html` + `src/ui/UI.ts` + `src/style.css` — the mute button
- `web-three/tests/state-day4.test.ts`, `tests/save.test.ts` — +11 tests
- `web-three/src/game/autotest.ts` — the Day-4 afternoon E2E segment, plus
  release hardening (below)
- `web-three/scripts/visual-d4b.mjs` — **new**, the five afternoon frames
- `web-three/scripts/probe-sal.mjs` — **new**, the counter-sight-line probe
- `docs/31-visual-audit.md`, `docs/32-audio-notes.md` — the second agent's
  independent workstream (presentation/audio/asset quality)
- `site/index.html`, `README.md` — status says the afternoon

## 5. QA

- **Unit: 112/112** (101 → 112: +10 afternoon tests, +1 save roundtrip).
  Gates: the apron hands once; the wash completes once; the A-frame
  reads free and files once; a replay of a kept day never pays twice; the
  relevance windows; `permit` round-trips and old saves parse clean; the
  captions carry the permit line.
- **E2E: AUTOTEST OK, 0 failures (304 s), console clean** — the full
  Day 1 → Day 4 journey with real input, now including: the routed mirror
  walk, the washers actually spinning, the wash finishing, the confirm-gated
  filing ($133 → $123), the receipt on the cart, a repeat press spending
  nothing, both ladders, the fourth window, and the save ($123, map=true,
  permit=true, stool=true).
- **The E2E caught a real world defect before it shipped:** the first bay
  had piers 0.4 m too proud of the building face — they shoulder-checked
  the north sidewalk's walking line and the Day-2 stoop walk dead-ended
  against one (58 failures, one root). The bay now lives between z=7.4 and
  the building face; the sidewalk lane stays open; the probe that measured
  Sal's sight-line is committed (`scripts/probe-sal.mjs`).
- **The visual audit (Doc 31)** caught the shirt rack reading as floating
  rectangles from oblique angles — the rack grew a real frame (thicker
  posts, lower rail, braces). It also flagged the four morning evidence
  frames wearing a Day-1 HUD: disclosed in Doc 29 §5, re-stage owed.

## 6. Honest limits

- Sal is ambience-grade beyond his two steps: he breathes, he answers one
  line, and that's all he does yet. The wash has no failure state and no
  second customer — a laundromat that serves exactly one apron per Day 4.
- The permit is a *beginning*: the $10 filing exists, the fee and the
  Monday window are text on a card, and Day 5 is still being written.
  Nothing yet spends the fund or checks the deadline — by design.
- All verification is SwiftShader + headless Chromium (900×700 / 720×1280).
  Real-device GPU framing is still pending (Doc 24 §6); no physical phone
  has touched Day 4.
- Audio verification is code-review + suite evidence only (Doc 32 §limits):
  headless Chromium cannot confirm audibility, and no physical device has
  heard the block either.
- The cab holds for you at the crosswalk but the block's diagonals are
  still cabbie country — the E2E now routes like a person and waits for the
  cab to pass; a player can still meet a frozen cab mid-road and walk
  around it, which is New York.

*The block was always this big. You just hadn't walked it.*
