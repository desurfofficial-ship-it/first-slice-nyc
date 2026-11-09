# C0 — THE FIRST-SESSION CONTENT PACK (narrative/14 §7 step 6, doc 11)

| | |
|---|---|
| Status | **IMPLEMENTED + INTEGRATED** — the wave every machine has been waiting for |
| Branch | `feat/c0-first-session` — merged to main, no-ff |
| Law | doc 11's binding context kept verbatim: the shipped Day 1–4 beats are **retained and recontextualized, not rewritten** — the pack is the narrative LAYER over them |
| Evidence | `docs/production/c0-first-session/evidence/` — the cold open, the entry-2 sheet, the listing, Deshaun's platform, the surveyor's fence |

## 1. What shipped

The first session's narrative layer, exactly where doc 11 specifies it, riding the shipped spine:

**Beat 0 — the cold open.** A human fresh boot ends the arrival film at a green-notebook page — the game's first interactive screen. The system's one ruled line: *"Day 1. Facts only."* Three ways to write the first line: *"New York, day one."* / *"I'm the smart one."* / a free line (120-char cap, an empty line is not a line). The write lands in the field diary through the one door (`logDiaryEntry`), tagged FACT, private — and the listing on the phone rides the write's close: *"CORNER SLICE — counter help, will train. Room to let upstairs. Ask for Eddie."* Drivers auto-write the line silently (the fleet's coherence law — no sheet owns a probe's screen); `?c0=1` asks the sheet explicitly (the probe's hatch, the `?pickcard=1` law).

**Beat 2 — the listing.** Re-readable at the terminal benches (`c0_phone_listing`); the first interactive read also earns Leo's re-read line.

**Beat 5 — Rosa's mango line.** The shipped errand's last pick now carries *"He's not mine yet. He's Eddie's listing. Somebody's always Eddie's."* — the read that plants silently.

**Beat 6 — the trial shift (Corner Slice, Day 2 morning).** A two-press authored scene at the pizza counter: dough, radio, the gate — then 6:55, the first slice of the first pie, and Eddie's six-word covenant, verbatim: *"Eat standing up. That's the job."* The shift's end opens the notebook for **Entry 2**: *"What kind of place gives away the first slice?"* — three Leo-voice options, the pick becomes the diary's first running theory, honestly tagged GUESS.

**Beat 7 — Deshaun's grounding scene (the platform, Day 2 midday).** A new world actor (`world.deshaun`, off-shift jacket, cold can already in hand) gates himself onto the platform's south wall for the D2_IDRIS…D2_LUNCH window. Five press-staged lines to the kit — *"You're not dying. You're new. Same symptoms. Sit. Five things with edges. Go."* — and the kit is learned (doc 02 §5.5's use-later key). When his window closes he leaves.

**Beat 8 — the mishear.** The Day-1 night cap (step POSTCARD) writes **Entry 3** automatically: *"Rosa gave me the cart."* — FACT-tagged, system-authored, the tutorial's last lesson: the diary is not automatically true. Nothing here corrects it; the strike is C1's.

**Entry 4 — the first QUESTION (Day 3's fire escape, step D3_CLIMB3).** The notebook opens on the dusk beat: three authored curiosities (the terminal bins; the Works' new lock; Miss Odessa's two jobs) or the player's own line.

**Entry 5 — the first RECALL wobble (Day 7+, the laundromat pass).** The motel hum, faint, unexplained, three lines max — F1's long fuse, lit here, firing in C1.

**§4's three hooks, planted small:**
1. **The lease notice** on Eddie's wall (`c0_eddie_lease`, exists once the shift has been worked) — the notice, then Eddie's one line: *"Paper's just paper till it isn't."*
2. **The surveyor** at the Works fence (`world.surveyor`, camera up, dawn-only 5–7 a.m.) — *"Light studies. Sunlight's a legal requirement. Square feet before feelings."* The GUESS is the player's to write.
3. **Miss Odessa's nights** — 9 p.m. Mon/Wed/Fri by the gold window: one observation per night (*"The gold window goes dark. A woman with a canvas bag takes the avenue side."*), never explained, day-keys capped at 8.

**Beat 4 — the wrong train.** Priya's line, once ever, on the first ride's arrival within Days 1–2 — it takes the ride-parting note's slot (one voice at a time): *"This is the uptown local; your life is downtown on the other side. Happens to everybody."*

## 2. The machine (`core/firstSession.ts`)

Pure, DOM-free, core-free; every law pinned by `tests/first-session.test.ts` (31 cases):
- **fire-once** (the chapterRails law): the cold open writes once; each diary beat fires once; the scalar flags set once;
- **never-rewinds**: no un-write, no un-fire anywhere in the surface;
- **save v1-safe**: `first_session` rides as an optional trailing field; parse is field-wise quarantine (booleans valid in BOTH directions — `false` is "not yet"); old saves read as defaults and the cold open never re-opens for them (it lives in Day 1's no-write law);
- **the opening law as a validator** (doc 11 §6): `validateOpeningLaw()` scans every string the pack can put on screen for crime/conspiracy/Corvus/diagnosis/lecture terms — a test fails the wave if a future edit breaks it.

The state rides `GameState.firstSession`; the entries ride `fieldDiary`'s one door; the write sheet is the UI's one new paper surface (`ui/UI.ts` `showWriteSheet`, `#write-sheet` in index.html, green-notebook CSS, touch-law member, keyboard 1–9/Enter/Escape).

## 3. The driver learned to keep his own diary

The autotest now answers the notebook when a beat opens it (`sheetWatch`: pick the first authored line through the same door a thumb uses) — without it the paper holds the hands and every later walk starves. Found by the 4-day E2E (Day 3's ladder freezes at the poster→climb transition), fixed at the driver, not by weakening any assertion.

## 4. Gates (the final tree, all executed)

tsc clean · vitest **1090/1090** (72 files, +31) · build OK (556 ms) · **4-day E2E AUTOTEST OK: 0 failures (670 s, console clean)** · probe-world-sim **15/15** · probe-nav **9/9** · probe-ped-nav OK · probe-chokepoints OK · probe-money-trace ALL PASSED · **probe-c0-first-session 26/26** (0 page errors).
