# Doc 43 — Neighbourhood Identity Guide

> **Deliverable E.** What Alder Heights looks, sounds, and feels like — and the
> research it stands on. Creative authority: [GDD v2.0](01-game-design-document.md)
> and [Doc 04](04-art-direction-bible.md); this guide binds them to one district.

---

## 1. The identity in one paragraph

Alder Heights is a **working upper-heights neighbourhood in the first week of
October, forever 5:45 PM**: a commercial cross street squeezed between two
avenues, brownstones stepping down north, walk-ups and a bakery row south, the K
mumbling under Juniper, three wooden water towers keeping the skyline honest, and
ginkgo leaves starting to turn on the plaza trees. It is a place where everyone
is having an ordinary Tuesday — which is exactly why the player's arrival matters.

## 2. Architectural character (the threegram: brick, stoop, tank)

| Layer | Rule | Source of truth |
|---|---|---|
| **Brick** | Facades use the existing PAL family only (bldg 0x8e6f66, bldg2 0xa3857a, brick 0xb23a48, stone 0xe8e4dc) + Doc 04's 70/20/10 law. No new building colours. | palette.ts, Doc 04 §2 |
| **Stoop** | Residential rows get stoops (the shipped brownstone builder); stoops are outdoor living rooms — a chair, a plant, a wave. | Doc 04 §5 canon #11 |
| **Tank** | Every silhouette above ~11 m earns a water tank (deterministic by ID hash — the massing tool already implements this law). | Doc 04 canon #3 |

**Height grain:** 11 m (Ginkgo Walk-up) → 18 m (tenements) in the core; one 22 m
avenue exception; skyline cards above. **The street wall is continuous** — party
walls touch, gaps are typological (alley, light-slot, yards), corners get
chamfers. **Variation without noise:** 7.6 m lots, alternating cornice lines,
door colours cycling the teal/coral/plum set — the New York way of repeating
yourself until it reads as a row instead of a clone stamp.

## 3. Materials and colour discipline

- The 70/20/10 law: 70% warm neutrals (brick, cream, amber light), 20% identity
  (taxi yellow, fire-escape green, brick red), 10% magic (neon, plum, gold).
- **Every new colour must reuse an existing scene signature** — the van pass's
  law, now master-plan law: bakeStatics merges by material; a new colour is a new
  draw call forever.
- Signage: canvas sign factory only; brand continuity rules (GOLDEN ORCHARD
  PRODUCE CO. owns produce — van, fruit stand, future crates; ROSA'S owns gold
  boards; the city owns stone-and-ink municipal signs).
- Neon is punctuation: the diner's corner sign and the bodega OPEN are the only
  two full-neon moments; everything else is tungsten paint.

## 4. Street atmosphere (what each district sounds and moves like)

| District | Look | Move | Sound (Doc 32 ledger) |
|---|---|---|---|
| Kestrel (story street) | Awnings, window diaries, steam | The rush, the familiar face, the cab | hiss-pour-thunk, keys at dawn |
| The plaza | Stone decks, pigeons, the flyer board | Arrivals, greetings, the nod | subway rumble underfoot |
| Gable Row | Stoops, tree pits, quiet | Stoop sitters, stoop-sale morning | wind chime, broom on stone |
| Kestrel Green | Lawn, pergola, garden beds | Readers, tenders, gossips | leaves (LeafDrift already) |
| Sycamore | Big storefronts, the diner sign | Window shoppers, the fruit stand | diner bell, avenue traffic wash |
| Marlow | Bakery row, swings | Caregivers, the smell of the oven | playground squeal, radio from a stoop |

**The Rule of Steam is district-wide:** every frame has a mover — leaves, steam,
pigeons, laundry lines (W4), the cab, the walkers.

## 5. Environmental storytelling (the block's diary, now a neighbourhood's)

The shipped systems generalize: day-keyed, deterministic, save-clean.
- **Flyer boards** (shipped) — the hall marquee (LMK-07) joins the plaza board.
- **Window diaries** (shipped) — every residential face gets 2–4 authored window
  states keyed on day; the gold-window law (flicker ×3 → hold) stays unique.
- **The barrier diary** (shipped) — one W1 construction site on Kestrel East
  infill, gone by W2's fiction week, fresh asphalt left behind.
- **The ghost sign** (LMK-06) and the **mural** (LMK-05) — the two painted walls;
  the mural is day-keyed progress (Lena & Odd paint it across the weeks).
- **Stoop sales** (GDD §5.11) — GRB-01's stoop on weekends, phase W4+.
- **The small-wear pass** (adopted from the external review pass, tonally
  filtered): fire escapes carry one honest prop each — a potted plant, a single
  drying towel; AC units vary in state (some with a box on top) instead of
  cloning; flyer layers tear (the old slip stays as a corner under the new one);
  the alley gets a hand-chalked note, never spray-paint — Doc 04's "warm, never
  gritty" is the filter. All day-keyed, all on existing geometry.

## 6. Landmark design (the 1-Second Law audit)

Each landmark must pass Doc 04 §7's six checks at 64 px:
- **K-Globes** — green circles on cast iron; reads instantly (subway = New York).
- **Rosa's billboard** — gold board, ink letters (shipped, passes).
- **Three Towers** — the wooden-hat silhouette (shipped, passes; W1 adds two so
  no district frame lacks one).
- **Diner sign** — coral neon script on a cream band; the east anchor.
- **Mural** — a flat painted plane with a bold figure; reads as colour-block at
  64 px, detail at zoom.
- **Ghost sign** — faded serif on brick; intentionally low-contrast (it is a
  discovery, not a beacon).
- **Hall marquee** — stone band + changeable letter strip (canvas texture swaps).

## 7. Research basis (what this design checked against)

- **The 1811 Commissioners' Plan** (MCNY, The Greatest Grid): avenues 100 ft /
  cross streets 60 ft / blocks 200 ft N-S; the grid's ratio grammar, compressed
  ~25% here — [thegreatestgrid.mcny.org](https://thegreatestgrid.mcny.org/greatest-grid/making-the-plan/12)
- **Standard Manhattan block** ≈ 80 × 274 m, 20 blocks/mile N-S — sanity check on
  the district's walking scale (crossing Alder Heights N-S ≈ 2 real blocks).
- **Rowhouse/tenement typology:** 25 × 100 ft lots (7.6 × 30 m); brownstone stoops
  and cornices; Old-Law light slots — visible in GRB lots and TEN-01's 1 m slot.
- **Water tanks:** 5,000–10,000 gal wooden tanks on 4–6 story roofs —
  [Vital City](https://www.vitalcitynyc.org/nyc-wooden-water-tanks-architecture-history);
  our tank builder already matches the proportions.
- **Basketball:** the shipped half-court's key/FT/arc dimensions already agree
  with regulation proportions (16 ft key, 15 ft FT, 10 ft rim) — the registry
  documents rather than changes them.
- **NYC street furniture law:** sidewalk control houses, tree pits, lamp spacing —
  observed standards, applied as game grammar, never as sim.

## 8. What Alder Heights is NOT

Not a borough. Not a skyline park. Not a tourist map — no oversized monuments, no
famous buildings dropped in, no "landmark = big" reasoning. The GDD's famous
places (Times Square, the ferry) live in the City Passport's future; this
neighbourhood is the **home scale** the rest of the game looks back at.
