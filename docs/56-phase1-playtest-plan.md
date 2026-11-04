# FIRST SLICE: A New York Story
## Document 56 — Phase 1 Playtest Plan (device + playtest evidence, made operational)

> **Status:** Plan and empty results ledger. No features here — this doc makes
> the two human halves of [Doc 07 §9](07-vertical-slice-design.md) runnable:
> criterion 1's device layer (iPhone 11 + Galaxy A14 walk the Doc 02 script)
> and criterion 2 (playtest targets met with 10 external testers). The build
> it tests already exists on main; nothing in this doc adds to it.
>
> **Sources — and only these:** [Doc 02](02-first-session-walkthrough.md)
> (the session script — minute markers come from nowhere else) ·
> [Doc 07 §8](07-vertical-slice-design.md) (targets, copied verbatim) ·
> [Doc 07 §9](07-vertical-slice-design.md) (the gate) ·
> [Doc 07 §6](07-vertical-slice-design.md) (funnel event names) ·
> [Doc 06](06-production-roadmap.md) (QA owns device matrix + playtest ops;
> Phase 1 exit = "Doc 07 §9 checklist fully green with 10 external playtesters") ·
> [Doc 21](21-synthetic-playtest-01.md) (the honesty rules synthetic rows inherit) ·
> [Doc 55](55-phase1-exit-checklist.md) (the checklist this feeds).
>
> **Baseline when written:** main @ `b257ff3`. House style applies: unfinished
> work is marked unfinished (there is one such gap — see §3).

---

## 1. What this doc is for

[Doc 55](55-phase1-exit-checklist.md) boxes 1 (device layer) and 2 (playtest
targets) need evidence no automated probe can produce: a person, on a phone,
staying for the whole first session. This doc is where that evidence is
planned, captured, and logged. Three rules govern every session:

1. **Hands off.** The operator never teaches, never points, never rescues.
   Doc 02's script does the teaching; the observer records.
2. **The share ritual is experienced, never explained** (Doc 02 design goal 5).
   The operator does not mention sharing. "Share intent" is what the tester
   *states* in the interview and *does* unprompted at the glowing button.
3. **No silent failures.** A dropped session, a crash, a missed target — all
   get logged in the ledger and, where the cause is design, a docs/51 entry.

---

## 2. The 30-minute first-session script (taken only from Doc 02)

Minute markers are Doc 02's own section clocks. The observer's column says
what to *record* — never what to *do*. If the build on main diverges from any
beat below, that divergence is a docs/51 finding, not an edit to this table.

| Minutes (Doc 02) | Beat (Doc 02 section) | Wonder beat | Observer records |
|---|---|---|---|
| 0:00–2:00 | **The Arrival** — bus window, skyline tease, driver's line, title card, $87 + duffel, character pick, Map unfolds ("You are here. That's enough."), diegetic tutorial: walk toward the light | #0 | session start wall-clock; anything the tester does before the title card; whether Map's first note is read aloud |
| 2:00–5:00 | **Rosa's Hand** — the upside-down map, the three deliveries with fun-fact stickers, the apron tie | — | did the tester flip the map before Rosa does (kindness lands either way); any sticker read aloud |
| 5:00–10:00 | **The First Rush** — five forgiving orders (regular coffee → chopped cheese → "the usual, please"), grace mode, breakfast plate, Rosa's errand | — | minute order 1 is served; every grace-mode wink fired (these are design working, not tester errors) |
| 10:00–15:00 | **The Wow Wonk** — the Shuffle, Priya at the turnstile, Times Square golden-hour sync, auto Postcard Mode, the usher's line, the busker's four slow seconds | #1 | minute Times Square is reached (**this is the minute-12 no-drop anchor**); the reaction word at the first postcard; whether the share glow was touched — observed only, never mentioned |
| 15:00–20:00 | **Subway University** — uptown/downtown rules, "This isn't a test, kid. It's a subway.", the two-line window draw, Map copies badly, the busker's coin, Happy Accident #1 | — | if a wrong train is taken: the reaction word (the reframe is the design — capture it working or not); coin dropped Y/N (the unmarked kindness counter) |
| 20:00–26:00 | **Your Corner** — the empty corner, cart naming (~min 22), first solo rush (3 customers), Mr. Idris unlocks (~min 24), $87 → $112 | — | the cart's name + naming minute; the Idris-nod reaction; whether the register total gets a comment |
| 26:00–30:00 | **The First Postcard** — fire-escape climb, dusk, the card composes live, the glowing share button, the gold window (flicker ×3 → hold), "The regulars are waiting" | #2 | first postcard reached Y/N + minute; **spontaneous quote verbatim** — "did I light that?" is the pass; "how many windows are there?" is the fantasy leaking (Doc 07 VS-F08's own tripwire) |

**Clock honesty:** Doc 02's minute markers are the design script, not a
stopwatch. Real sessions are judged against Doc 07 §8's own window —
25–35 minutes total, no drop before minute 12 (§3, metric 2e). A tester who
sprints Times Square in minute 9 is not a failure; a tester who quits in
minute 9 is.

---

## 3. Funnel metrics (Doc 07 §8 targets, verbatim — with the capture plan)

Doc 07 §8's panel: **10 external testers — 5 self-declared "never been to
NYC," 3 cozy-genre players, 2 NYC residents** — instrumented funnel + 15-min
interview. Targets are copied verbatim; only Doc 07 can change them.

| # | Metric (Doc 07 §8) | Target | Capture in this plan |
|---|---|---|---|
| 2a | Reach first postcard unaided | ≥ 85% | observer ledger column "Postcard Y/N" (§2, last row); "unaided" = hands-off rule held |
| 2b | Share/save intent (stated) | ≥ 70% | interview: "Would you send any of these to someone real?" (asked *after* the session, §5 Q-closing) + observed glow-touch |
| 2c | "I felt looked after by the city" | ≥ 4/5 mean | §5 Q1, observer scores the answer 1–5 with the quote as evidence |
| 2d | "I learned something I could repeat to a friend" | ≥ 80% yes | §5 Q2 — yes only if the tester produces the thing unprompted, verbatim recorded |
| 2e | Session length | 25–35 min, no drop before minute 12 | wall-clock start → postcard → session end; drop minutes recorded as drops, not absences |
| 2f | NYC-resident recognition check | ≥ 2/3 say a specific detail is "true" | §5 Q3, residents only — the specific detail is the evidence, not the sentiment |

Supplementary (Doc 07 §4 VS-F05 acceptance, feeds the same evidence): all 10
testers keep ≥ 1 postcard; ≥ 6 send one to a real person.

**Honest gap (the one unfinished thing in this doc):** Doc 07 §6 names the
instrumented funnel — `session_start → arrival_done → rosa_met →
order_1_served → times_square_reached → first_postcard → share_tapped →
session_end`. **Nothing on main emits these events today** (verified by grep
of `web-three/src/` at the baseline tip; there is no telemetry module). Until
someone wires it — which is feature work, out of scope here by decree — every
metric above is captured by the manual proxies in the right-hand column. No
metric in this plan depends on code that does not exist. When the funnel gets
wired, the capture column updates; the targets never do.

---

## 4. Device matrix

Three columns, per the gate. iPhone 11 and Galaxy A14 are the named devices
of [Doc 07 §9](07-vertical-slice-design.md)-1 and VS-F10; the desktop control
is the environment every probe already runs in.

| Column | Device | Role in the gate | Sessions | What only this column proves |
|---|---|---|---|---|
| iPhone 11-class | **iPhone 11** (primary). Substitute: any A13-bionic-class iPhone — actual model recorded in the row | Doc 07 §9-1 phone half; VS-F10 60 fps target | ≥ 3 of the 10, plus one operator dry-run before tester #1 | touch joystick + USE at 390×844 portrait (the `probe-subway-mobile` conditions); 60 fps spot-check; cold boot < 15 s; no thermal throttle across a 25-min session (VS-F10) |
| Mid Android | **Galaxy A14** (primary). Substitute: comparable mid-tier Android (2022+, ≤ mid-range SoC) — actual model recorded | Doc 07 §9-1 phone half; VS-F10 30 fps floor | ≥ 3 of the 10, plus one dry-run | the 30 fps floor actually holds; the honest low-end read of every wonder beat; thermal |
| Desktop control | Chrome, mouse + keyboard, the probes' native window size | control arm — isolates hardware variables from design variables | remaining sessions, including both NYC residents if no device is natural for them | proves the Doc 02 script is walkable unaided when the device is not the variable; any mobile-column failure gets replayed here once to classify it (device debt vs design debt) |

Rules:
- Every tester plays **one primary device** for the whole session. Splitting
  a session across devices produces no row.
- The desktop column never substitutes for a mobile target: Doc 07 §9-1 needs
  both phones walked, so each mobile column hosts ≥ 3 full human sessions.
- Dry-runs are operator sessions; they get evidence dirs but no ledger row.
- A device-column failure (crash, thermal, fps floor miss) files in docs/51
  as device debt with the row number cited — it never edits a target.

---

## 5. What to capture (per session)

The five mandatory captures, then the interview.

**1. Crash log.** Browser/desktop: full console export (devtools → save as
file) even when clean — "clean" is recorded, not assumed. Mobile: any
pageerror/crash = screen-record or photograph + the exact reproduce steps
the tester's own actions imply. Zero crashes in a session is a recorded fact
with a file behind it (this is the per-session face of Doc 07 §9-5).

**2. Session length.** Three numbers per row: minute of first postcard,
minute of session end (tester says done, or 35-min hard stop), and whether a
drop occurred before minute 12. The hard stop is operator-enforced at 35 min
(§8's upper bound) and is logged as a drop *at minute 35*, never as silence.

**3. Postcard reached Y/N.** Unaided, per §2. If reached: the minute. If
not: the minute and the last beat the tester engaged with (§2's rows give the
vocabulary).

**4. Share intent.** Two fields: *touched* (did the tester tap the glowing
share button unprompted — Y/N) and *stated* (the interview answer — Y/N/Maybe,
plus the quote). The touched field is never prompted for; if the tester asks
"what does this do?" mid-session, the operator's entire answer is "try it."

**5. The three interview questions.** Fifteen minutes, right after the
session, in this order:

| # | Question (asked near-verbatim) | Scores | Scoring rule |
|---|---|---|---|
| Q1 | "At any point, did you feel looked after by the city? Where?" | 2c | observer scores 1–5 from the answer's specificity; the *where* is the required evidence — a bare "yeah" scores 3 and cites nothing |
| Q2 | "Tell me one thing you learned that you could repeat to a friend." | 2d | yes only if a specific, repeatable fact comes out unprompted (a fun-fact sticker's content, "regular" means milk + two sugars, "on line"); record it verbatim |
| Q3 | Residents only: "Name one detail that felt *true* — and one that felt off." Everyone else: "Was there a moment you'd want to show someone?" (free note — not scored) | 2f | the *specific detail* is the unit of pass — "it felt New Yorky" is not a detail; both the true and the off get recorded (the off feeds docs/51) |

Closing beat of the interview (feeds 2b and the VS-F05 bar): show the
tester's own album in-game or the kept postcard and ask — "Would you send
any of these to someone real? Which one, and to who?" Record stated intent +
which card + who. "To who" is the VS-F05 evidence.

**Encouraged, not scored:** a photo of the tester's kept postcard; one photo
of hands-on-device; any verbatim overheard line (the bodega voice is the
product — eavesdropping is data).

---

## 6. The results ledger (single table — empty on purpose)

One row per session. Tallies at the bottom compute over `Type = human` rows
only. The table ships empty; §7 says who may fill it and how.

| # | Date | Tester ID | Type | Device column / actual model | Postcard Y/N | Postcard minute | Session length (min) | Drop < min 12? | Share: touched | Share: stated | Q1 (1–5) | Q2 (Y/N — the learned thing) | Q3 (resident — true / off detail) | Crash log ref | Evidence dir |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | human | | | | | | | | | | | | |
| 2 | | | human | | | | | | | | | | | | |
| 3 | | | human | | | | | | | | | | | | |
| 4 | | | human | | | | | | | | | | | | |
| 5 | | | human | | | | | | | | | | | | |
| 6 | | | human | | | | | | | | | | | | |
| 7 | | | human | | | | | | | | | | | | |
| 8 | | | human | | | | | | | | | | | | |
| 9 | | | human | | | | | | | | | | | | |
| 10 | | | human | | | | | | | | | | | | |
| 11 | | | *(spare)* | | | | | | | | | | | | |
| 12 | | | *(spare)* | | | | | | | | | | | | |

### Tallies — fill when the human rows land

- **2a** Reach first postcard unaided: __ / 10 = __% — target ≥ 85% — PASS / FAIL
- **2b** Share/save intent (stated): __ / 10 = __% — target ≥ 70% — PASS / FAIL
- **2c** "Looked after by the city" mean: __ / 5 — target ≥ 4 — PASS / FAIL
- **2d** Learned something repeatable: __ / 10 yes — target ≥ 80% — PASS / FAIL
- **2e** Session length: min __, max __; drops before min 12: __ — target 25–35, zero early drops — PASS / FAIL
- **2f** Resident recognition: __ / 3 — target ≥ 2 — PASS / FAIL
- **VS-F05 bar:** kept ≥ 1 postcard __ / 10 (target 10/10); sent one to a real person __ / 10 (target ≥ 6)

### Verdict paragraph — one paragraph when all 10 rows land

*(empty)*

---

## 7. Logging protocol — how humans and agents use the ledger

The ledger in §6 is append-only and shared. The rules keep it trustworthy
for both audiences:

**Humans (the operator):**
- One row per session, filled the same day, in the same commit that adds the
  evidence (docs/51's own rule, imported).
- Evidence goes to `assets/playtests/01/<tester-id>/` — console export or
  crash photos, observer sheet (a photo of paper is fine), interview notes,
  optional postcard photo. The row's Evidence dir cell must point at a real
  path before the row counts as landed. **No evidence dir, no row.**
- Never edit a landed row. A correction is a new row with the same tester ID,
  `-b` suffix, and a note on what changed; the superseded row stays.
- Update the tallies block in the same edit that lands a row. A stale tally
  is treated as a wrong one.
- When row 10 lands: write the verdict paragraph, then — and only then —
  [Doc 55](55-phase1-exit-checklist.md) box 2 gets its Owner and evidence
  pointer. A box turns green on evidence, never on intent.
- A FAIL on any tally is not a failure of the doc: it is a docs/51 entry
  (design debt, with the quotes attached) — Doc 55 §1 box 2's own rule.

**Agents:**
- Agents may run **pilot sessions only**, logged with `Type = pilot` —
  scripted walkers or agent-driven browsers, in the full honesty tradition of
  [Doc 21](21-synthetic-playtest-01.md): zero humans claimed, method stated
  in the evidence dir (log path or recording).
- Pilot rows never count toward any tally. The tallies compute over
  `Type = human` rows only, and agents must never write a human row, guess a
  human value, or "interpolate" a missing session. There is no column where
  a synthetic number is honest.
- A pilot row that finds a seam files it in docs/51 (the docs/21 precedent:
  the walker found three seams before any human did). The pilot never edits
  targets, targets-adjacent language, or another agent's landed row.
- Agents may add spare rows (11, 12, …) for pilots beyond the first two;
  human sessions take precedence on rows 1–10. If all spares are spent, add
  rows — the table grows, the rules don't change.

**Both:**
- The tester ID convention: `t01`…`t10` for humans (order of recruitment,
  not device), `p-<method>-<n>` for pilots (e.g. `p-walker-01`).
- Anything quoted in a row is verbatim or marked paraphrase. "Roughly" is
  not a unit in this ledger.

---

## 8. Operator quick-reference (the one-page brief)

Before every session:
- [ ] Device charged, Do Not Disturb on, screen-recorder running (mobile) / console export ready (desktop)
- [ ] Correct column's build confirmed: the current Pages deploy
      (`https://desurfofficial-ship-it.github.io/first-slice-nyc/`) on mobile,
      local `web-three/dist/` or the same deploy on desktop
- [ ] Evidence dir created: `assets/playtests/01/<tester-id>/`
- [ ] Wall clock noted; §2 script table at hand; this checklist at hand

The entire briefing, word for word:
> "This is the first session of a game. Play it like you found it. I can't
> help while you're playing — afterward I'll ask you three questions."

Then be quiet. The only permitted mid-session words are "try it" (if asked
what the glowing button does) and "the city will wait" is the game's line,
not yours — never say it for it.

After: the 15-minute interview (§5), evidence into the dir, the row into §6,
tallies updated, same commit.

---

## 9. What this doc deliberately does not do

- **No features.** The instrumented funnel (Doc 07 §6) stays design until a
  separate, decreed change wires it (§3's honest gap). This plan runs on
  paper and consoles.
- **No panel recruitment machinery.** The §8 quota (5 / 3 / 2) is the
  recruitment spec; scheduling and consent forms are operator ops owned per
  Doc 06's QA role. A signed-consent note per tester goes in the evidence
  dir with everything else.
- **No target edits, ever.** §3's numbers are Doc 07 §8's, verbatim. If a
  target is wrong, Doc 07 changes first, then this table mirrors it.
- **No result fabrication guardrails waived:** the results write-up (the
  one-paragraph verdict plus analysis, when the rows land) goes in a new doc
  at the next free number — `docs/56` is now the plan, so results land at
  `docs/57-` or later. The raw sheets stay in `assets/playtests/01/`, with
  the §6 ledger as their index.
