# FIRST SLICE — Living Neighborhood & Gameplay Audit

*Agent 3 — independent, read-only investigation. Committed to nothing, changed nothing: every finding below was verified against the actual running build (`web-three/dist` at branch `agent2-character-polish`, commit `8176acd`), the TypeScript source, and the unit/E2E/probe tooling in the repo. Where the docs say one thing and the build says another, the build wins.*

*Companion reading: [Doc 01](01-game-design-document.md) (GDD v2.0), [Doc 07](07-vertical-slice-design.md) (vertical slice contract), [Doc 33](33-living-neighborhood-design.md) (living-neighborhood design), [Doc 34](34-open-source-integration.md).*

---

## 0. Evidence base (what was actually run)

| Check | Result |
|---|---|
| `npm run build` (tsc + vite) | clean; 846 KB JS (224 KB gzip) |
| `vitest run` | **125/125 pass** (9 files) |
| Full `e2e.mjs` four-day journey | 38 checks pass, 66 fail — **pre-existing environment cluster, not a regression** (see §6.3) |
| Custom Playwright probe (`?fx=off`, 480×360) | 35 fps; full reach-top → dusk → gold window → postcard → caption → linger → next-day chain completes in ~6 s |
| Save-injection probe (Day-4 save → reload) | Day 4 boots correctly: $133, receipt on cart, Sal at counter, kid on stool, awning up, cart name restored |
| Touch-input probe (390×844, hasTouch) | joystick responds to pointer events; USE + turn buttons present; **one real defect found** (§6.2) |
| `probe-perf.mjs` (shadows on, 900×700) | 373–632 draw calls, 18–30k triangles, 5–7 fps under SwiftShader |

---

## 1. Current gameplay assessment

**What the build is today:** a four-day, ~25–35 minute authored experience on one street block (x −50…50), driven by a 33-step linear state machine (`GameState.Step`, `MEET_ROSA=0 … DONE=32`), with real money math ($87 → $112 → … → $123), three purchases (awning $15, stool $10, permit $10), a real save system (localStorage JSON v1, day-start snapshots, corrupt-save → fresh start, Day 1 never writes), and a genuinely good postcard ritual (offscreen 768×1160 capture → paper frame → authored caption → PNG download).

**The honest one-liner:** this is a *warm, polished, scripted story* wearing a life-sim's coat. Everything that exists works, and most of it works well. But almost nothing in the GDD's living-world promise exists yet beyond the block's ambience and the flag-greeting system. The gap is not quality — it is **breadth of things to do and reasons to return**.

**Feature-state classification (docs claims vs. verified reality):**

| Feature (GDD/VS ref) | State | Evidence |
|---|---|---|
| Movement, collision, ladders, camera (VS-F02 partial) | **Works** | E2E: 20+ physical checks pass; camera occlusion/sidestep + portrait boom in `GameCamera.ts` |
| Day 1–4 story arc, money, save/resume | **Works** | E2E green through Day 3 cluster; Day-4 save-injection probe green |
| Serving loop (brew timing, order bubbles, no fail states) | **Works** | `startBrew`/`completeBrew`, D3/D4 order tables; E2E money math exact |
| Postcard pipeline (VS-F05) | **Works — but album-less** | Panel has exactly two buttons: *Keep this postcard* (PNG download) / *Stay a while*. No in-game album exists. |
| Cart naming → world identity | **Works** | Name reaches cart sign, flyer at subway, captions (probe: "Audit Cart" restored on resume) |
| Skyline of Lit Windows (VS-F08, GDD §6.4) | **Partial — authored, not systemic** | Exactly 4 windows + Rosa's sill, all fired by fixed script beats (`lightGoldWindow`, `goldenBeat3/4`). No population-driven behavior, no "whose window" attribution beyond the kid. |
| Map companion (VS-F01 — the GDD's "soul made paper") | **Visual/story only** | The Map exists as a story *object* (Rosa hands it over, you give it away) and one boot note ("You are here. That's enough."). There is **no Map UI surface, no 12 notes, no collections, no slang cards**. Slang knowledge arrives as HUD ticker notes. |
| NPCs with routines (GDD §4.1 Regulars) | **Partial** | 6 authored cast members (Rosa, Idris, kid ×2 forms, stranger, Sal) + 3 Yuka pedestrians on fixed sidewalk loops. No schedules, no independent activities, no count-based memory. |
| Dialogue choices (VS-F03) | **Visual only** | "Serving is a conversation" does not exist yet: serving is one button. The only authored choice is the crosswalk route (flavor line), the cart name, and the awning timing. |
| The Shuffle (VS-F04) | **Missing** | One flavor note when crossing; no crowd mini-game. |
| Subway University, Wow Walk, Times Square (VS-F06/F07) | **Missing (out of web-build scope so far)** | Subway entrance is a prop; block ends at the terminal. |
| Slice Ladder stages 2–5, stock/economy depth | **Missing — but spring is loaded** | `permit` is filed and saved (Doc 30), yet *nothing spends it*: no Day 5, no lease, no rebuild. `MAX_DAY = 4`; pressing the rail on a kept Day 4 yields "Day 5 is still being written." |
| Bodega Cat, events, weather, karma, buskers, stoop sales (GDD §5) | **Missing** | None in code. |
| New York-ese fluency / Story Cards (GDD §4.4/4.5) | **Missing** | Notes are ephemeral HUD text; nothing is collected or revisitable. |

---

## 2. Player freedom and exploration assessment

**Can the player explore without following a fixed sequence?** No — and the code is explicit about it. `GameState.isRelevant()` hard-gates all 14 interactables by step; my probe confirmed that standing 4.7 m from the permit A-frame on Day-4 morning returns `permitRelevant=false` — dead input, no prompt. Exploration is *movement* freedom (the block is genuinely walkable, the camera follows well), not *interaction* freedom.

**Can the player choose what to do and when?** Within each beat, mostly yes in feel; across beats, no. The one structural choice is real and good: **declining the awning skips the lunch rush entirely** (`advanceDay2()` only opens `D2_LUNCH` if `awningUp`) — a shorter day, by choice, with no punishment. Everything else is on-rails: you cannot end Day 4 without filing the permit; you cannot skip the stool on Day 3; you cannot talk to Idris on Day 3 except as an order.

**Can the player ignore the main story and still enjoy the game?** For about two minutes. The ambience layer is legitimately alive — 48 instanced leaves, two pigeon flocks with plumage/flight/roost states, a squirrel, manhole steam, swaying canopies, a cab that yields to pedestrians — but there is nothing to *do* with any of it. The interactable list is closed: `rosa, item_mango, item_coffee, item_bread, counter, cart, idris, stoop, rail, kid, poster, stranger, laundry, permit`. The flyer board, benches, mailbox, hydrant, windows, pigeons, papers, and every storefront other than the bodega bay accept no input.

**Are there meaningful optional activities?** One: Rosa's chat line tables (`rosaChatLineOf`), which are flag- and day-aware and genuinely well-written. They are optional, multi-line, and replay-safe. That is the entire catalog of optional content.

**Does the world respond to player decisions?** Yes, within authored limits — and this is the build's quiet strength. The cart name reaches the world (sign, subway flyer, captions); `kidKept` changes Day 3; `awningUp` changes Idris's tip and opens lunch; `permitFiled` puts a receipt on the cart forever; the Map physically changes hands. Continuity machinery (Save v1 optional fields + stateful line tables) is real and tested. What it can't do is *deepen gradually* — greetings jump at authored flags because no counts exist (Doc 33 admits this; confirmed in code).

**Verdict:** freedom is currently the *absence of friction*, not the *presence of options*. The block invites wandering and then gives the wanderer nothing.

---

## 3. Neighborhood and interaction audit

**Is the block big enough to feel real?** For a vertical slice, yes. It reads as a coherent New York west-end street: bus terminal (door + sign, not enterable), Rosa's bodega (**enterable**, interior with three collectible shelves, roof hides with hysteresis), the Day-4 laundromat bay (recessed, warm interior, two spinning washers, Sal behind a counter), brownstone row with one fire-escape silhouette (climbable to a two-landing roof), subway plaza with deck slabs, crosswalk with a working signal and a cab that stops, 12 trees in granite pits, planters, benches, bus stop, flyer board, papers, hydrant, water towers, a far skyline card. Density without clutter; the 1-Second Law holds in every probe frame.

**Can the player enter locations?** Two, partially: the bodega (full interior) and the laundromat (recessed bay, no interior room). The terminal, every brownstone, and the subway are facades.

**Are interactions meaningful or decorative?** Every *implemented* interaction is meaningful — there are no decorative interactions because there are no decorative interactions, full stop. 14 interactables, all story-gated, all consequential. The problem is the inverse of the usual: the world is all signal and no noise. Curiosity has zero surface area.

**Talk, buy, help, participate?** Talk: one-way authored lines only (no choice UI). Buy: three purchases, all confirm-gated against double-spend (verified in tests and code — the confirm-gate pattern is exemplary). Help: the kid cup delivery and the stranger greeting are the whole "help" catalog. Participate: no activities exist.

**Do interactions have consequences?** The good ones do (flags → world → future lines → postcard captions). Consequence is permanent where it matters (stool, permit, Map never un-happen — "no morning un-buys a chair").

**Secrets?** None. The block has no discoverable layer at all — no examineables, no hidden notes, no response to revisiting places off-beat. The GDD's "only-in-NY micro-moments" (mural, busker, stoop sale) are absent.

---

## 4. NPC and relationship audit

**The cast, honestly:** Rosa is the game's best character by a wide margin — present on every day, stateful lines across all four days, a sweep animation, a warm window, and the best dialogue in the repo. Mr. Idris has a strong hook (two sugars) and a scripted walk-in, but exists only as an order with legs. The kid has a real arc (window → glass → ground → stool → corner resident) and the best physical staging in the build. The stranger is a well-staged Day-4 mirror who then leaves forever. Sal breathes at his counter and has exactly two lines (Doc 30 admits he is "ambience-grade beyond his two steps").

**Do NPCs have routines?** No. Cast members are *placed* per day (`placeDay2/3/4Cast`) and animated in place (sweep/wave/sit/breathe). The three Yuka pedestrians loop three fixed sidewalk paths forever — no time-of-day behavior, no errands, no pauses. The pigeons have more state than the pedestrians (idle/walk/peck/flush/roost).

**Do they react to the player and remember?** Reaction: yes within beats (the kid follows at your hip with a distance-rescue; customers face the cart; the cab yields to cast bodies). Memory: only as authored flags, never as counts — Idris cannot notice "sixth morning in a row"; Rosa cannot reference *how often* you've talked. Doc 33's greeting-ladder proposal is the right fix and remains unimplemented.

**Independent activities?** None. Nobody in the block wants anything when the script doesn't need them.

**Does the neighborhood feel populated rather than staged?** Closer than the docs claim (the three walkers + pigeon flocks + cab + steam do a lot), but during the midday free-roam band — the phase the GDD calls "the wonder engine" — the street is empty of people unless a customer is queued. There is no crowd, no kid on the stoop until Day 4, no one at the benches, ever.

---

## 5. Long-term replayability assessment

**What brings a player back after Day 4?** Currently, nothing structural. `rail()` on a kept Day 4 returns the 'day-beyond' note; the world freezes at its most interesting moment — permit filed, fund loaded, Monday deadline *written on the A-frame* — and never pays it off. Replays of Days 2–4 are warm (re-greeting lines vary; replays never re-pay — `earn()` no-ops) but reward-free by design.

**The deeper issue:** the meta loops the GDD promises — Postcard Album (100+), Regulars' arcs (12–16), City Passport, Slice Ladder, slang fluency — none are started except the windows (4 of them) and the permit (1 spring, no trigger). The game as built has an *end* (Day 4's dusk) and no middle.

**Is progression tycoon-flavored?** Mercifully no — and this must be preserved. Money exists to buy three small things; there is no stock, no pricing, no failure. Doc 33's pacing (days → weeks → months, authored beats, never timers) is the correct road map and should stay canon.

**Satisfying daily routine?** The morning rush → dusk ritual is genuinely satisfying *inside* a day. The missing phase is midday: after the rush and before the climb, the player owns 2–4 free minutes with nothing authored to find in them. That band is the natural home of every "living world" recommendation below.

---

## 6. Mobile usability and performance concerns

### 6.1 Controls and framing — good, with one gap
- Touch UI: left-zone floating joystick (179×371 px zone at 390×844), right-hand USE button that glows when something is in range (`occupied` class — wired and verified), two camera-turn buttons. Keyboard parity (WASD/arrows, Space/E, R) is intact.
- Portrait camera work (Doc 31 round eight) is real: portrait holds the boom closer (×0.75) and caps vertical FOV at 80°; the probe screenshot shows the player at a readable ~25% of frame height.
- **Gap:** the GDD's "two-finger rotate & pinch zoom" does not exist and the turn buttons are a fine substitute — but the camera auto-flip + button-orbit combo has no way to *look up at the skyline* from the street, which is a postcard-moment loss on phones.

### 6.2 A real defect: unguarded `setPointerCapture`
`Input.ts` joystick `pointerdown` calls `joyZone.setPointerCapture(e.pointerId)` with no try/catch. When it throws (synthetic events in probes; real-world cases exist on some browsers when the pointer is already released), the handler aborts *after* setting `joyId` but *before* setting `joyOrigin` — my probe measured the stick then computing its vector from a **stale origin** (drag right produced a mostly-up-left vector, `(0.18, -0.98)` instead of `(0.9, 0)`), and the global error banner ("Something spilled…") fired. One-line fix: wrap the capture call in try/catch. This is exactly the kind of thing a mid-session mobile browser will eventually hit.

### 6.3 The E2E green/red question — resolved as environment, with receipts
The full E2E run reports 66 failures on this sandbox. This is **not a code regression**: docs/35 records an A/B test (character pass vs. pristine `eed8e64`, rebuilt) producing **identical failure sets (59)** on chromium-156 — the cluster exists without the newer code. This audit's probes independently verify every system the failing checks cover: the reach-top → postcard → next-day chain completes in ~6 s at 35 fps when driven deterministically; the Day-4 world, save resume, and money all verify. The residual risk is *process*, not product: the driver's walk/beat thresholds are timing-sensitive enough that a green baseline (docs/30: 0 failures, 304 s) is not reproducible on current hardware — which means **the team has no reliable regression signal right now** (see recommendation #9).

### 6.4 Performance posture
- Triangles: 18–30k — far under the 120k budget. Draw calls: **373–632 — 2.5–4× over the <150 vertical-slice budget**, even after the static bake (700+ → current). The bake pass exists and works; it just hasn't finished the job.
- Frame rate on this sandbox: 5–7 fps with shadows at 900×700 (SwiftShader), 35 fps at 480×360 with `?fx=off`. The shadow pass is documented as >half of software-GL frame cost. **Real-device numbers still do not exist** (Doc 30: "no physical phone has touched Day 4") — everything above is software-GL inference.
- Loading: instant from dist (no required assets; GLB upgrades are optional fetches). Boot under 15 s is trivially met on any real connection.

---

## 7. Ten recommended improvements, ranked by priority

*Ranked by (player-visible value) ÷ (implementation risk), constrained by the anti-goals: no meters, no timers, no tycoon. Every item names its integration point.*

1. **Let Day 5 exist — pay off the permit.** The save fields, the fund, the Monday deadline, and the receipt already exist; nothing spends them. A minimal Day 5 (the corner rebuilds one prop, one new order line, one caption) converts a 25-minute game into a returnable one. *Integration: one `D5_*` step band in `GameState`, one `beginDay` branch — the exact pattern Day 4 used.*
2. **The postcard shoebox.** The pipeline already renders PNGs; keep the last 8 as thumbnails in the existing save (Doc 33 part five, proposal 3) behind a pause-menu drawer. The GDD's #2 meta loop, one file plus a list UI. No gallery app, no share wall.
3. **An "examine layer" for the block.** Make 6–8 existing props respond to E with a single authored line (flyer board rotates by day; bench; mailbox; hydrant; the pigeon flock; the subway grate rumble). Zero new systems — one `examine` interactable family that is relevant in *every* step. This is the cheapest possible answer to "does exploration reward curiosity?" (today: no).
4. **The greeting ladder.** Generalize `rosaChatI` into per-character line tables indexed by day-derived counts (Doc 33 §4.1). Idris should be able to notice the sixth morning. Zero new systems; pure `content.ts`.
5. **Walker schedules.** Re-time the three existing Yuka loops by day-band (rush → purposeful crosswalk commuters; midday → bench-sitter and window-shopper; dusk → nobody hurries). No new bodies, no pathfinding (Doc 33 §2.1).
6. **The Map as a paper surface.** The GDD calls Map "the game's soul made paper," and the web build currently has zero Map UI. A single folded-paper overlay listing the notes the player has already been shown (the text all exists) would close the largest fantasy gap. If the lead decides against it for the web build, write that decision down — the current state (a story object that is never openable) quietly implies a feature that isn't there.
7. **Guard `setPointerCapture`.** try/catch around the joystick capture call; reset `joyOrigin` before it. One line, removes a real mobile hang-and-missteer path (§6.2).
8. **Finish the draw-call diet; get one real-device number.** 373–632 calls vs. a 150 budget: extend `bakeStatics` coverage (more Lambert statics are merge-eligible), then capture one profiler session on one physical phone so the performance section of every future doc stops saying "pending."
9. **Repair the regression signal.** The 59–66-fail E2E cluster (chromium-156 timing races + the Day-4 walk segment) means nobody can tell a regression from weather. Pin the browser version in CI, or make the driver's `walkTo`/beat thresholds time-based and fps-independent. Until then, treat E2E red as "known cluster" and rely on the probe suite — as this audit had to.
10. **One wonder beat for the midday band.** The subway-grate rumble-and-glow (Doc 33 §2.5) or a busker's horn note from below — one authored, dusk-law-compliant moment that makes the free-roam band feel haunted by the city rather than empty.

---

## 8. A proposed gameplay loop that fits the original GDD

The GDD's loop is already the right loop — the build implements its skeleton. What follows keeps every existing ritual and fills the two empty phases, using only systems this codebase has already proven it can ship:

```
☕ MORNING — "Open Up"            [exists, keep]
   The rush: order bubbles, brew timing, regulars first.
   Add only: regulars greet by count (rec #4).

🚶 MIDDAY — "Go Explore"           [exists as empty time; fill it]
   Free-roam with an examine layer (rec #3), walker schedules (rec #5),
   one wonder beat (rec #10), and Rosa/Irdis/kid chats that deepen (rec #4).
   Nothing here is required. Everything here is findable.

🛠️ AFTERNOON — "Build Your Slice"  [exists in miniature; grow it slowly]
   One meaningful purchase or errand per day (awning → stool → permit →
   Day 5's payoff). Confirm-gated, permanent, no stock, no ledgers.

🌙 DUSK — "City Wind-Down"         [exists, keep — it is the game's best hour]
   Fire escape, windows lighting, Rosa's goodnight.

📮 THE POSTCARD — Session End      [exists, keep]
   Caption reads the day's flags; card goes into the shoebox (rec #2).
   Album grows. Day counter ticks. Tomorrow loads — including Day 5 (rec #1).
```

Session-shape laws stay non-negotiable: no session wasted, no failure spirals, every session ends on beauty. Small developments over days; the Slice Ladder over weeks; nothing gated on a counter a player can see.

---

## 9. Build first / wait / never

**Build first (next one to two passes):**
1. Day 5 — the permit payoff (rec #1). The story already wrote the check.
2. The postcard shoebox (rec #2) — retention artifact, tiny storage cost.
3. The examine layer (rec #3) — the single biggest freedom-per-line-of-code purchase.
4. The `setPointerCapture` guard (rec #7) — one line; do it with whatever ships next.

**Wait (deliberately, with a written decision each):**
- Slice Ladder stages 2–5, new boroughs, the full 12-note Map system, the Shuffle mini-game, Subway University — until the Day-5 loop proves people return.
- New Regulars (Samir, Priya, Mabel…): the existing six need counts and routines *before* the cast grows (quality over quantity — Doc 33's rule).
- Seasons/weather/Manhattanhenge: the week-drift proposal (Doc 33 §2.4) only after day-keyed dressing (flyer rotation, window states) lands.
- Any monetization, accounts, or cloud anything.

**Never add:**
- Energy systems, wait timers, fail spirals, or any counter a player is asked to feed.
- Friendship meters, affection points, or "level up" toasts — memory is content, not mechanics (Doc 33 part four is canon).
- Tycoon machinery: stock, supply, pricing, staff scheduling ledgers.
- More empty blocks: geometric expansion before interactive depth is the one failure mode this design cannot survive.
- Anything that breaks the 5–8 minute session, the postcard ending, or the "no failure" doctrine — those three are the game.

---

## 10. Closing assessment

The block is real, the craft is real, and the anti-tycoon soul of the GDD survived migration intact. What the build needs is not more story — Days 1–4 are the best-written thing in the repo — but **permission to wander**: things to touch on the way to nothing in particular, people who notice you coming back, and a tomorrow that exists after the permit. Every recommendation above was written to be shippable by one agent, in one pass, without touching the Step machine's existing beats, the save's parse laws, or the postcard ritual.

*The corner works. Now let the rest of the street answer when knocked on.*
