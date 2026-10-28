# FIRST SLICE: A New York Story
## Document 07 — Vertical Slice Design (v0.2)

> **Status:** Advanced in Phase 0. Core feature specs solid. Day-1 content pack complete (see Doc 08). Remaining TBDs have clear owners and recommendations. This document is the contract for Roadmap Phase 1 (weeks 7–16).

---

## 1. Why a Slice

The vertical slice must prove **one sentence on a real phone**:

> *"I just spent 30 minutes in New York I've never visited, and I already want to send someone a postcard about it."*

Everything in this document serves that proof. If a feature doesn't make the 30 minutes warmer, clearer, or more shareable, it is OUT — even if it's "obviously in the final game."

---

## 2. The Slice in One Paragraph

**Day 1, exactly as scripted in [Doc 02](02-first-session-walkthrough.md):** arrival → Map's first note → Rosa's bodega → the first rush (5 orders) → the Wow Walk to Times Square (wonder beat #1, auto-postcard) → Subway University with Priya (Map copies badly) → your corner → cart naming → first solo rush → Mr. Idris unlocks → the fire-escape dusk → first postcard composes → **the first gold window** → session close. Playable start-to-share in **25–35 minutes**, at target visual quality, on a mid-tier phone.

---

## 3. Scope

### IN (feature-complete per §4 specs)

| # | Feature | Complete means |
|---|---|---|
| VS-F01 | Map companion v1 | Paper surface, 12 notes, 6 trigger types, margins hold 4 slang cards |
| VS-F02 | The Corner environment | One block + bodega interior + cart + fire escape, art pass 1 |
| VS-F03 | Serving conversation v1 | 8 order types, choice UI, "chef's welcome" v0, zero fail states |
| VS-F04 | The Shuffle | Crowd walk mini-game, forgiveness rules |
| VS-F05 | Postcard pipeline v1 | Capture → caption → album → native share, 6 postcards |
| VS-F06 | The Wow Walk | Scripted sequencer, billboard sync beat, music swell |
| VS-F07 | Subway University ride | Guided ride, two-line teach, Map-copies-badly beat |
| VS-F08 | Skyline of Lit Windows v1 | One gold window (the kid's), flicker-then-hold behavior |
| VS-F09 | Cast of 5 | Rosa, Priya, Idris, the kid, the usher — models, rigs, animation sets |
| VS-F10 | Performance & polish | Device targets met, 1-Second Law audit passed |

### OUT (explicitly — see [Roadmap §6 risk 3](06-production-roadmap.md))

- Other boroughs, other districts, open exploration beyond the slice block
- The Bodega Cat, events system, weather scheduler, karma system internals
- Slice Ladder stages 2–5, economy depth, stock/upgrades (cart naming IS in)
- Cloud save, accounts, localization, monetization of any kind
- Slang dictionary beyond 4 demo cards; New York-ese fluency levels
- The Regulars' full arcs (Idris's "two sugars" hook only)

---

## 4. Feature Specs

### VS-F01 — Map Companion v1

**Fantasy check:** Map is new here too. It must never behave like a system.

| Aspect | Spec |
|---|---|
| Surface | Full-screen paper sheet; deckled edge; two-column fold; handwriting font (license **[TBD-4]**); page 1 = city (star only), page 2 = margins (collections) |
| States | `folded` (corner peek in HUD) → `unfolding` (haptic tick) → `reading` → `writing` (new note animates in stroke-by-stroke) |
| Notes v1 (12) | See **[Doc 08](08-day1-content-pack.md)** for final text. Triggers: taught · overheard · tasted · witnessed · offered · bought |
| Collections | 4 slang cards (regular / bodega / hero / on line) + 1 Story Card (bacon-egg-and-cheese) |
| Hard rules | Never gates progress · never opens by itself more than once per scene · no counters, no badges · "Tell me" always delighted |

**Acceptance:** a tester who never opens Map still completes the day; a tester who opens Map 10 times finds something new each time; zero testers describe Map as "a tutorial."

### VS-F03 — Serving Conversation v1

Serving is **a conversation, not a stress puzzle** (v2.0 doctrine — Doc 02 §5–10).

- Order = dialogue box with 2–3 **choice replies**: "Say nothing, just make it" · "Repeat the order back" · "Ask what's in a chopped cheese."
- **Repeat-back** = tiny memory mini-game (3 items, forgiving) → Regulars light up.
- **Ask** triggers the *teach* path: the customer explains, Map takes notes. Wrong guesses can never offend — the kid answers "I don't know either!"
- **Chef's welcome v0:** any order can be answered with "Chef picks." The cook chooses; Map writes it down. (Full system Phase 2.)
- No timers, no fail states, no score. The win state of every order is *being remembered*: customers reference it next visit.

### VS-F05 — Postcard Pipeline v1

The product inside the product. Pipeline: `moment flag` → `camera rig` → `render texture` → `compose` → `caption` → `album` → `share`.

| Stage | Spec |
|---|---|
| Capture | 3:4 vertical crop from a 3/4 isometric rig; letterbox bars animate in; game world keeps animating (Rule of Steam) |
| Compose | Paper frame, deckled edge, stamp corner with cart name, "Day N" tag; palette conformance enforced by lighting, not filters |
| Captions | 6 authored v1 in **[Doc 08](08-day1-content-pack.md)** + template slots: `{person}`, `{place}`, `{learned}` — writer-owned, two-sentence max |
| Album | Grid of cards; tap → enlarge → "Send" / "Keep"; no share prompt > 1 per session |
| Share | Native share sheet (iOS/Android) with OG-tagged web preview image; share is optional, always available, never rewarded |

**Quality bar:** all 10 external playtesters keep ≥ 1 postcard; ≥ 6 send one to a real person.

### VS-F08 — Skyline of Lit Windows v1

One window only (the kid's). Technique: emissive map swap + bloom pulse; **flicker ×3 → hold** behavior; visible from the cart, the fire escape, and the final rooftop-adjacent framing. The line belongs to Rosa, not to UI. Acceptance: testers spontaneously ask "did I light that?" — if they ask "how many windows are there?", the fantasy has leaked.

### VS-F10 — Performance & Device Targets

| Target | Budget |
|---|---|
| Frame rate | 60 fps iPhone 11 / iPhone SE 3; 30 fps floor Galaxy A14 |
| Visible tris | < 120k typical street scene |
| Lights | 1 realtime (sun/key) + baked GI; emissives for everything else |
| Draw calls | < 150 typical; static batching + GPU instancing on props |
| Memory | < 1.2 GB peak |
| Boot to playable | < 15 s cold |
| Thermal | 25-min session, no thermal throttling on A14 |

---

## 5. Content Inventory (slice)

| Type | Count | Notes |
|---|---|---|
| Environment block | 1 street + 1 bodega interior + 1 subway platform + 1 Times Square vista + 1 fire-escape vignette | Greybox → art pass 1 |
| Characters | 5 (Rosa, Priya, Idris, the kid, the usher) + crowd library (12 variants) | Mitten-simple hands per Doc 04 |
| Props | ~60 | From Doc 04 object canon |
| Postcards | 6 | Full final text in Doc 08 |
| Map notes | 12 + 4 slang cards + 1 Story Card | Full final text in Doc 08 |
| Dialogue | ~180 lines | Yarn; VO decision pending TBD-1 |
| Music | 4 stems (arrival, rush, wow swell, dusk) | Key jingle required |
| SFX | ~40 | Coffee hiss-pour-thunk set required |

---

## 6. Tech Plan

Unity 6 LTS / URP · `/game` in repo (`Assets/Scripts`, `Assets/Art`, `Assets/Content/Yarn`) · scenes: `Boot`, `Day1_Arrival`, `Day1_Bodega`, `Day1_WowWalk`, `Day1_Subway`, `Day1_Corner`, `PostcardAlbum` · save: local JSON (`day`, `cartName`, `mapNotes[]`, `postcards[]`, `litWindows[]`) · input: touch + mouse parity · analytics v1 funnel: `session_start → arrival_done → rosa_met → order_1_served → times_square_reached → first_postcard → share_tapped → session_end` · CI: PR build + weekly device-farm run.

---

## 7. Art Conformance

Palette per Doc 04 (Taxi Yellow `#F7B32B`, Brick `#B23A48`, Fire-Escape Green `#2A9D8F`, Amber `#FFB85C`, Steam Grey `#E8E4DC`, Dusk Plum `#6D4C7D`, Bodega Neon `#FF6B6B`, Pizza-Box White `#FFF8F0`) · 70/20/10 proportion law · silhouette test at 64 px for all 20 hero props · every scene composes in 9:16 first · Rule of Steam: something moving in every frame.

---

## 8. Playtest Plan

10 external testers (5 self-declared "never been to NYC," 3 cozy-genre players, 2 NYC residents for the "that's SO true" check). Instrumented funnel + 15-min interview.

| Metric | Target |
|---|---|
| Reach first postcard | ≥ 85% unaided |
| Share/save intent (stated) | ≥ 70% |
| "I felt looked after by the city" | ≥ 4/5 mean |
| "I learned something I could repeat to a friend" | ≥ 80% yes |
| Session length | 25–35 min, no drop before minute 12 |
| NYC-resident recognition check | ≥ 2/3 say a specific detail is "true" |

---

## 9. Exit Criteria (Phase 1 gate)

1. All 10 features pass acceptance on iPhone 11 + Galaxy A14
2. Playtest targets (§8) met with 10 external testers
3. The six postcards pass the fridge test (Roadmap §9): each one printed, each one kept by someone
4. 1-Second Law audit: 10 random paused frames → all identifiable as "New York" in 1 s by a never-visitor
5. No crash in 50 consecutive full playthroughs on device farm

---

## 10. Open Questions — Updated

| # | Question | Recommendation / Status | Owner | Needed by |
|---|---|---|---|---|
| TBD-1 | VO vs text-first | **Recommendation: text-first for VS.** VO only for 5 signature lines (Rosa apron moment, Priya "this isn't a test", Idris nod, gold-window line, key jingle). Keeps cost and iteration speed high. | GD + Audio | End of Phase 0 |
| TBD-2 | Cart-name input moderation | **Recommendation:** Client-side allowlist of positive/neutral words + length limit + report button. No server for VS. Revisit in Phase 4. | TE | VS-F05 build |
| TBD-3 | Is the Shuffle skippable? | **Recommendation: Yes, soft skip.** After 20 seconds of standing still, a gentle "The city will wait" prompt appears. Skipping still grants the Times Square postcard. Never feels like failure. | GD | First playtest |
| TBD-4 | Handwriting font licensing | **Action:** Shortlist 3 fonts that support Latin + basic diacritics and have commercial mobile licenses. Prefer ones with a slightly imperfect, human quality. | ND | Phase 0 |
| TBD-5 | Does Map get a voice? | **Recommendation: Paper sounds only** (unfold, pencil scratch, soft page turn). No literal whisper. Keeps Map feeling like an object, not a character that competes with Rosa/Priya. | AU | Phase 0 |
| TBD-6 | Native share deep-link architecture | **Recommendation for VS:** Native share sheet only + static OG image. Deep links and web preview pages move to Phase 4 (Beta). | TE | VS-F05 build |

*Document advanced to v0.2 after Phase 0 content and TBD work. Continue updating as decisions lock.*
