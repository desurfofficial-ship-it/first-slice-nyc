# 13 — Reference World Manifest

| | |
|---|---|
| Status | Implemented — `sim/reference.ts`, proven end-to-end by `tests/sim-reference-world.test.ts` |
| Canon rule | Places & characters = canon (registry JSON, docs/narrative/04–05). Schedules, hours, warmth values, sample events = **TECHNICAL EXAMPLES**, not storyline canon. |

## 1. What it proves

That the contracts work TOGETHER, on the real registry, in one loaded world: typed spatial data → semantic queries → persistent entities with schedules → arbitration → narrative validation with fallbacks → an audited ledger → a versioned save that round-trips.

## 2. The manifest

**Places (canon registry ids):**

| Directive requirement | Reference answer |
|---|---|
| Residential building | **KTS-02 "The Cecil"** (class A; Leo's room is its top floor — canon) |
| Commercial building | **KTN-05 "Fade King"** (class B, BARBER-INT) |
| Mixed-use building | **ROS-01 "Rosa's Deli & Grocery"** (class A, BODEGA-INT; home over the store — bible) |
| Restaurant / food establishment | **KTN-04 "Corner Slice Pizza"** (class B, PIZZA-INT; the diner SND-01 is canon-planned and exercised as a validation case) |
| Public space | **PRK-CORNER "Corner Park"** (+ PRK-PLAZA for gatherings) |
| Street intersection | **STR-KESTREL × STR-JUNIPER** (IX-KJ; five streets total in the registry) |
| Pedestrian route | **R-KESTREL-N** (north sidewalk lane, registry `routes.pedestrian`) |
| Transport location | **SUB-01 "Alder Heights station (K)"** — north house, canon gate of every arrival |
| Interiors (≥1) | **BODEGA-INT, PIZZA-INT, BARBER-INT, CECIL-ROOM** (4 of the registry's 11) |
| Interactive object | the shipped anchor set (newsbox, hoop, board, shelves — Game side) under reserved `obj:` ids |

**People (canon identities, docs/narrative/05 §2; example schedules):**

| id | Canon anchor | Home | Work | Fidelity |
|---|---|---|---|---|
| `npc:leo_marsh` | the protagonist (doc 02) | KTS-02 | loc:the_cart | full |
| `npc:rosa_delgado` | §2.2 Rosa's Deli | ROS-01 | ROS-01 | full |
| `npc:eddie_carrasco` | §2.1 Big Eddie | GRB-01 | KTN-04 | full |
| `npc:idris_warsame` | §2.13 night orderly | loc:idris_apartment | loc:harlem_hospital | background |
| `npc:priya_nair` | §2.11 K-line conductor | TEN-01 | SUB-01 | background |
| `npc:kevin_okafor` | §2.4 Kev | GRB-01 | KTN-04 | background |
| `npc:deon` | supporting (doc 04 §2, Fade King) | PWK-01 | KTN-05 | abstract |

**Businesses (example hours):** `biz:rosas_deli` 06:00–22:00 daily · `biz:corner_slice` 11:00–23:00 daily · `biz:fade_king` 09:00–19:00 Tue–Sat (Mondays dark, per habit).

**Schedules (example habits, clock-keyed):** Idris works nights (22:00→06:00 wrap), prays at dawn (`loc:masjid_an_nur`), is on the **SUB-01 platform 07:30–07:55 punctual**, takes the usual 08:00–08:20 at the cart, sleeps through the day. Kev works the slice counter Tue–Sat and keeps **Sundays at the PRK-CORNER dominoes table**. Rosa opens the deli at 06:00 sharp (punctual).

**Relationships (example seeds):** Rosa↔Idris (42/70 — nine years of the usual), Eddie↔Kev (55/60), Priya↔Idris (20/40 — the 7:40 platform edition), Rosa↔Priya (25/45), **Leo↔Idris (30/50 — Day 1 made him a Regular)**.

**Semantic aliases (declared off-map/pending places):** `loc:idris_apartment`, `loc:harlem_hospital`, `loc:masjid_an_nur`, `loc:the_cart` — the sanctioned way to name what the registry cannot point at yet; the alias-coverage of every `loc:` reference is tested.

**Sample events (validation exercises, flagged EXAMPLE in-title):**
1. `evt:example_morning_regular` — Idris + Rosa at BODEGA-INT, business-open window 08:00–12:00, warmth prereq ≥10 → **validates** on Tue 08:05.
2. `evt:example_platform_edition` — Idris + Priya at SUB-01 in the 07:30–08:00 band → validates in-band; refuses out-of-band (`WINDOW_NOT_OPEN`).
3. `evt:example_closed_shop` — names `biz:alder_heights_diner`, deliberately never registered → `BUSINESS_MISSING` → **cancel loudly** (`authored_bad`), proving the authored-bug path.

## 3. The proofs (test names are the receipts)

| Proof | Test |
|---|---|
| Manifest builds against the real registry (typo = loud throw) | "builds against the real registry without throwing" |
| Whole-world integrity audit green | "audits clean" |
| Directive's required exemplars all present | "carries the directive's required exemplars" |
| Schedules resolve on the canon clock (Idris @ 7:40; Kev's Sunday) | two pinned tests |
| Hours agree with schedules (deli open for the morning regular) | "business hours match their schedules" |
| Worked arbitration: dialogue interrupts Idris's commute, commute resumes | "the worked arbitration scenario" |
| Good event validates; broken event fails + plans deliberately | "the morning-regular event validates…" |
| Ledger script: $87 → $74, audit clean, honest flow classes | "the economy script posts clean" |
| Every `loc:` reference declared | "declared semantic aliases cover…" |
| Save round-trip of the populated world | "a save round-trip preserves the whole reference world" |

## 4. How this grows

Workstream C replaces the EXAMPLE events with bible content through the SAME shapes; Workstream B replaces example warmth values with real dials; Workstream D gives businesses real hours where canon differs. The manifest is the seed, not the ceiling — and nothing in it invents storyline canon (the Narrative Director's lane, untouched).
