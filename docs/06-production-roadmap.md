# FIRST SLICE: A New York Story
## Document 06 — Production Roadmap & Task Breakdown (v1.0)

*Companion documents: [01 GDD v2.0](01-game-design-document.md) · [07 Vertical Slice Design](07-vertical-slice-design.md). This roadmap assumes the v2.0 design (Map, Three-Layer Landmark, Skyline of Lit Windows, Inverted Loop) is locked at Phase 0 exit.*

---

## 0. Roadmap Philosophy

1. **Every milestone exits on a playable proof** — never on paperwork. If the milestone can't be felt on a real phone by someone outside the team, it isn't done.
2. **Content pipelines before content volume.** The postcard pipeline, the Map notes database, and the Regulars' beat system are built as *factories* first, then filled.
3. **The postcard pipeline is the product.** It is the retention engine, the UGC engine, and the marketing asset generator running off one flywheel — it gets first-class engineering, not leftover time.
4. **Feelings are testable.** Playtest targets are written like KPIs ("85% of first-session testers reach the first postcard") and tracked like KPIs.
5. **Small team, sharp scope.** Five boroughs is a post-launch promise. The launch promise is Manhattan done *deeply* — one borough where every corner can be loved.

---

## 1. Team Shape (Core 10 + Partners)

| Role | Count | Notes |
|---|---|---|
| Game Director / Lead Designer | 1 | Design voice, "wonder beat" guardian |
| Gameplay Engineer | 2 | Serving loop, city systems, Map companion |
| Tools / UX Engineer | 1 | Postcard pipeline, share sheet, analytics, build ops |
| Technical Artist | 1 | Lowpoly pipeline, baked GI, lighting, performance |
| 3D Environment Artist | 2 | Blocks, props, landmarks (three-layer variants) |
| Character Artist | 1 | Cast of Regulars + crowd library |
| Narrative Designer / Writer | 1 | Map's handwriting, captions, Regular arcs, slang cards |
| Producer | 1 | Cadence, playtests, risk register |
| QA (embedded) | 1 | Device matrix, playtest ops; outsource ramp in Phase 3 |
| Animation | 0.5 | Outsource partner (dialogue + ambient library) |
| Audio (partner studio) | contract | Neighborhood scoring system, key jingle, stems |
| Community / Social | 0.5 → 1 | Joins Phase 4; runs postcard accounts from day one |

**Estimated total effort:** ~105 person-months to global launch (see §8).

---

## 2. Engine & Stack Decision

**Recommendation: Unity 6 LTS + URP (C#).**

Rationale: best-in-class mobile device coverage for lowpoly 3D; render-texture capture for the postcard pipeline; baked GI workflows that hit our 1-realtime-light budget; Addressables for post-launch borough packs; the deepest hiring pool for a 10-person team.

*Alternative honestly considered:* **Godot 4** — excellent fit, lighter, royalty-free; the tiebreaker is mobile track record and postcard capture tooling. Revisit only if the founding engineers have deep Godot shipping experience.

| Layer | Choice | Notes |
|---|---|---|
| Engine | Unity 6 LTS, URP | Forward+, 1 realtime light, baked GI |
| Dialogue | Yarn Spinner | Writers own content; Map notes use same pipeline |
| Save | Local JSON → cloud (Firebase) | Cloud save Phase 4; no backend servers for core loop |
| Analytics | GameAnalytics + Firebase | Funnel events defined in VS (§8 of Doc 07) |
| Crash | Firebase Crashlytics | Gate: crash-free ≥ 99.6% |
| Live-ops | Remote Config + Addressables | Borough/event packs post-launch |
| Localization | Crowdin | Scaffold Phase 4, EN first |
| Repo | GitHub, git-lfs | This repository hosts docs; game code in `/game` |
| CI | GitHub Actions | Device builds via cloud build; PR gates |

---

## 3. Phase Overview

| Phase | Weeks | Goal | Exit proof (playable, on device) |
|---|---|---|---|
| **0 — Pre-Production** | 1–6 | De-risk the *feel* | Greybox block walkable + 3 approved styleframes + postcard-capture spike + GDD v2.1 signed |
| **1 — Vertical Slice** | 7–16 | First 30 minutes at shippable quality | Doc 07 exit criteria pass on iPhone 11 + mid Android |
| **2 — Production** | 17–38 | Manhattan content-complete, systems final | Full Manhattan day loop + Slice Ladder stages 1–3 + 6 Regulars arcs playable |
| **3 — Alpha** | 39–46 | Stability + economy + Brooklyn start | Internal alpha: no red metrics, complete Manhattan, Brooklyn Welcome Quest |
| **4 — Beta** | 47–58 | Closed beta + share pipeline live | 500 external testers, share rate validated, store page ready |
| **5 — Soft Launch** | 59–68 | 3-market validation | KPI gates (§5) met in PH/BR/UK |
| **6 — Global + Live Ops** | 69+ | Scale + seasonal cadence | Global launch; boroughs 3–5 and seasonal trains on calendar |

---

## 4. Phase Detail & Task Breakdown

*Estimates in person-weeks (PW). Owners: GD = Game Director, GE = Gameplay Eng, TE = Tools Eng, TA = Tech Artist, EA = Env Artist, CA = Character Artist, ND = Narrative, PR = Producer, QA, AU = Audio partner.*

### Phase 0 — Pre-Production (Weeks 1–6)

| Epic | Tasks | Owner | Est. |
|---|---|---|---|
| **P0-1 Feel prototype (paper)** | Order-conversation card game; Map UX paper prototype with 10 testers; "three-layer landmark" sequencing test on paper | GD, ND | 2 PW |
| **P0-2 Greybox block** | One street + Rosa's bodega interior + corner cart; walk, serve 3 orders, ride 1 stop, receive 1 postcard; 15-min loop in grey | GE, EA | 3 PW |
| **P0-3 Art lock** | 3 styleframes (golden-hour corner, dusk rooftop, first postcard) + silhouette sheet of 20 icons + palette conformance test vs Doc 04 | TA, EA, CA | 4 PW |
| **P0-4 Tech spikes** | Postcard capture (render texture → PNG → native share sheet, iOS + Android); vertical-first camera rig; baked GI perf on iPhone 11 / Galaxy A14; Yarn → Map notes pipeline | TE, TA, GE | 4 PW |
| **P0-5 Design lock** | GDD v2.1 sign-off; Doc 07 v1.0 complete; risk register baselined; audio partner onboarded with key jingle sketch | GD, PR | 2 PW |

**Exit proof:** a 15-minute greybox loop that already makes 5/5 internal playtesters smile at the postcard. If the postcard lands in grey, the game works.

### Phase 1 — Vertical Slice (Weeks 7–16)

*Scope, feature specs, and exit criteria live in [Doc 07](07-vertical-slice-design.md). Epic ↔ feature mapping:*

| Epic | Doc 07 Feature | Owner | Est. |
|---|---|---|---|
| **VS-1 Foundation** | Project structure, scenes, save v1, input, CI builds | TE, GE | 4 PW |
| **VS-2 The Corner** | Block environment art pass 1, interactables | EA, TA | 8 PW |
| **VS-3 Serving conversation** | VS-F03 order/conversation flow, "chef's welcome" v0, no-fail rules | GE, GD | 5 PW |
| **VS-4 Map companion v1** | VS-F01 paper surface, 12 notes, trigger system, margins | GE, ND | 5 PW |
| **VS-5 Postcard pipeline v1** | VS-F05 capture, caption composer, album, share | TE | 6 PW |
| **VS-6 The Wow Walk** | VS-F06 sequencer, billboard sync beat, music swell | GE, AU | 4 PW |
| **VS-7 Subway ride** | VS-F07 guided ride, two-line teach, Map-copies-badly beat | GE, ND | 3 PW |
| **VS-8 Skyline v1** | VS-F08 one gold window (student's), emissive+bloom | TA, GE | 2 PW |
| **VS-9 Cast** | VS-F09 Rosa, Priya, Idris, the kid, the usher — models, rig, animation set | CA | 10 PW |
| **VS-10 Audio & polish** | VS music stems, SFX set, haptics, 1-Second Law audit | AU, GD | 4 PW |

**Exit proof:** Doc 07 §9 checklist fully green with 10 external playtesters.

### Phase 2 — Production (Weeks 17–38, 22 weeks)

| Epic | Contains (task-level) | Owner | Est. |
|---|---|---|---|
| **PRD-1 Serving depth 2** | Menu/recipe data model; stock & shelves; "THE USUAL?" button; grace-mode tuning; economy v1 | GE, GD | 6 PW |
| **PRD-2 Map v2** | Collections migrate into margins; note filters; handwriting font system; localization hooks | GE, TE | 4 PW |
| **PRD-3 Postcards industrialization** | Template system (5 sets); caption composer v2 (person + place + day); album UI; 100+ caption content pass | TE, ND | 8 PW |
| **PRD-4 Regulars 1–6** | Rosa, Idris, Priya, Samir, Mabel, Mrs. Chen — arcs (6–10 beats each), dialogue content, story-event scenes | ND, GE | 10 PW |
| **PRD-5 Manhattan districts** | 5 districts × feel-first naming (Map layer 1) → Tuesday layer → Kindness layer; subway system full; crowd library | EA, ND | 14 PW |
| **PRD-6 Slice Ladder 1–3** | Cart → Bodega → Café; stage transition cinematics; upgrades/décor with stories | GE, EA | 8 PW |
| **PRD-7 Events framework + 6 events** | Weather/event scheduler; First Snow, Rain Days, Hydrant Summer, Movie Weather, Pizza Rat, Manhattanhenge | GE, ND, EA | 8 PW |
| **PRD-8 Audio production** | Neighborhood scoring system (4 zones), 40-min stem library, VO decision executed (see Doc 07 TBD-1), SFX 120 | AU | 8 PW |
| **PRD-9 Meta systems** | Save/cloud, settings, accessibility (text scale, color-blind modes, motion reduction), analytics v2 funnels | TE, GE | 6 PW |
| **PRD-10 Build & device ops** | Automated device-farm runs weekly; memory budget enforcement; crash triage rota | TE, QA | 4 PW |

**Exit proof:** a new team member can play 30 consecutive Manhattan days with zero crashes and at least one postcard they *chose* to send to a friend.

### Phase 3 — Alpha (Weeks 39–46)

| Epic | Contains | Owner | Est. |
|---|---|---|---|
| **AL-1 Economy & pacing pass** | Full money curve vs Slice Ladder; no-fail audit; session-length tuning to 5–8 min median | GD, GE | 4 PW |
| **AL-2 Manhattan content-complete** | Every district walkable; all 3 landmark layers for 8 landmarks; all 6 Regular arcs | ND, EA | 6 PW |
| **AL-3 Brooklyn start** | Brooklyn Welcome Quest (Fatima's stoop hunt) playable to bridge-at-sunset postcard | EA, ND | 4 PW |
| **AL-4 Internal alpha** | Company-wide playtest; triage burndown; "fridge test" review (which postcards get printed?) | PR, all | 3 PW |
| **AL-5 Device matrix hardening** | Top-20 device matrix; thermal soak tests; 30fps floor on Galaxy A14 | TA, QA | 4 PW |

### Phase 4 — Beta (Weeks 47–58)

| Epic | Contains | Owner | Est. |
|---|---|---|---|
| **BE-1 Closed beta** | TestFlight + Play tracks; 500 testers; weekly cohorts w/ survey instrument tied to "I felt looked after" scale | QA, PR | 5 PW |
| **BE-2 Share pipeline live** | Native share QA per OS version; deep links; postcard web preview (OG images); moderation pipeline for reported content | TE | 5 PW |
| **BE-3 Store & marketing assets** | Store page (screenshot order per Doc 05 §7); trailer cut from real Postcard Mode frames; creator press kit | PR, CA | 4 PW |
| **BE-4 Localization scaffold** | Keys extracted; EN polished; Crowdin live; pseudo-loc QA | ND, TE | 3 PW |
| **BE-5 Dashboards** | D1/D7/D30, share-rate, wonder-beat completion funnels; alerting | TE | 3 PW |

### Phase 5 — Soft Launch (Weeks 59–68)

Markets: **Philippines, Brazil, UK** (per Doc 05 §6).

| Epic | Contains | Owner | Est. |
|---|---|---|---|
| **SL-1 Launch ops** | Staged rollout, remote config kill-switches, on-call rota | TE, PR | 4 PW |
| **SL-2 KPI gate reviews** | Weekly review vs §5 gates; go/no-go criteria per gate | GD, PR | 2 PW |
| **SL-3 UA creative engine** | Ad creatives cut from real player postcards (with permission flow); 20 variants | PR | 4 PW |
| **SL-4 Iteration trains** | 2-week content trains: City Whisper + 1 event + menu items per train | ND, GE | 6 PW |

### Phase 6 — Global Launch & Live Ops (Week 69+)

- **Global launch** + creator seeding program (Doc 05 §8).
- **Borough trains:** Queens (M2), The Bronx (M3), Staten Island (M4) — each ~8 PW content + 2 PW QA.
- **Postcard exchange** (friends' corners & cats) — 6 PW.
- **Seasonal calendar** synced to real NYC dates (Manhattanhenge, parades) — 2 PW/quarter.
- **The Welcome Bench** endgame lands with the Staten Island train (the harbor view is the point).

---

## 5. Soft-Launch KPI Gates

| Metric | Gate | Rationale |
|---|---|---|
| D1 retention | ≥ 45% | Wonder beat #1 lands at minute 12; below 45% the first session is failing |
| D7 retention | ≥ 18% | Regulars + postcard ritual must hook a week |
| D30 retention | ≥ 8% | Slice Ladder stage 2 must be reachable in ~3 weeks |
| Median session | 6–10 min | One in-game day per sitting |
| Sessions/day (median) | ≥ 2.5 | City Whisper + "the regulars are waiting" |
| **Weekly share rate** | **≥ 25% of DAU** | **North star — the postcard is the ad (Doc 05)** |
| Crash-free sessions | ≥ 99.6% | Cozy games die on crashes, not difficulty |
| Store rating | ≥ 4.6 | Warmth must survive the store page |

**Go/no-go:** global launch requires all gates green for 2 consecutive weeks in all 3 markets. A red share-rate with green retention = fix *share plumbing*, not design.

---

## 6. Risk Register

| # | Risk | P | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Postcard output looks "generated," not composed | M | Severe | Postcard Mode is a designed camera, not a screenshot: hand-tuned framings per wonder beat; VS exit criteria require 10/10 "would send" |
| 2 | Map becomes a chore UI (ironic failure of the soul) | M | Severe | Paper test in P0-1; Map can never gate progress or nag; slice-guardian skill reviews every Map touchpoint |
| 3 | Scope creep on boroughs/landmarks | H | High | Boroughs locked post-launch; three-layer rule *limits* landmark content (3 small scenes, not 1 big one) |
| 4 | Low-end Android perf (baked GI + night bloom) | M | High | 1 realtime light budget; perf set in VS; device farm weekly from Phase 2 |
| 5 | "Kind game" reads as shallow to core cozy audience | M | Medium | Mastery layer: order fluency, slang mastery, caption composer depth; Dave-the-Diver comparison shelf |
| 6 | UGC moderation burden (shared postcards) | L | Medium | Templates constrain text; report flow; web previews cached & reviewable |
| 7 | VO cost spiral | H | Medium | TBD-1 decision in VS: text-first with "read-aloud" pagination; VO only for 5 signature lines |
| 8 | Emotional beats feel exported rather than native (cultural accuracy) | M | Severe | Cultural consultants per borough from Phase 2; "that's SO true" playtest target with NYC-resident panel |

---

## 7. Definitions of Done

**Feature DoD:** playable on device · no-fail audit passed · 1-Second Law screenshot review · analytics event wired · playtested by ≥3 non-team members · worklog updated.

**Content DoD (any postcard / Map note / dialogue beat):** passes voice guide (AGENTS.md §3) · two-sentence max for postcards · feelings-before-names check · NYC-resident panel spot-check for cultural beats · localized-key extraction clean.

**Milestone DoD:** all epic DoDs · playable proof demonstrated to someone outside the team · risk register updated · next-phase planning doc · **fridge test:** the milestone's best postcard printed and stuck on the studio fridge.

---

## 8. Estimate Summary

| Phase | Person-months | Calendar |
|---|---|---|
| Phase 0 | 5 | 6 wks |
| Phase 1 | 17 | 10 wks |
| Phase 2 | 26 | 22 wks |
| Phase 3 | 8 | 8 wks |
| Phase 4 | 7 | 12 wks |
| Phase 5 | 6 | 10 wks |
| **Total to global launch** | **~69 PM** | **~14 months** |
| Year-1 live ops (boroughs 3–5, exchange, seasonal) | ~36 PM | +12 months |

+20% contingency on Phases 1–2 (the two phases where *feel* is still being discovered). If the vertical slice overruns by more than 4 weeks, cut scope from Doc 07's OUT list only — never from the postcard pipeline or Map.

---

## 9. Cadence & Rituals

- **Playable Friday:** every week ends with a build everyone plays for 10 minutes; the producer collects "one thing that made you feel something" per person.
- **Wonder-beat review:** every milestone reviews its screenshots against the 1-Second Law.
- **Worklog protocol:** all agents and teammates append to `worklog.md` per the AGENTS.md contract.
- **The fridge test:** the final artifact of every milestone is one printed postcard on the studio fridge. If there's nothing worth printing, the milestone isn't done.
