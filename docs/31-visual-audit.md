# Doc 31 — Visual Audit: Every Evidence Frame

*Status: audit complete, fixes proposed. Owner of the fixes: AGENT-A (all engine and script files are theirs; this doc only reports). Nothing here is a regression — most of it is composition polish and evidence hygiene. One frame needs real work.*

---

## Method — read this first, it shapes everything below

Honesty about the instrument. The auditor is an agent in a sandbox: direct image viewing is unavailable in this context, so every frame was inspected with a vision model (the `z-ai vision` CLI, one pass per PNG, same prompt each time). The prompt named the defect categories in advance — floating props, coplanar seams, clipped geometry, unreadable text, proportion, composition — and asked for a confidence grade (**CLEAR** or **UNCERTAIN**) on each finding, plus an explicit "do not invent defects."

What this method can and cannot do:

- A still PNG cannot show flicker. Z-fighting is only reported where a still actually shows coplanar seams or stripe artifacts.
- A vision model misreads small text sometimes. Where a reading could be checked against the code, the code was checked — and won once (see "The clock is fine" below).
- Every CLEAR finding deserves one in-engine look before anyone fixes it. That is the Anti-Slop gate: owner, behavior, style, **verification method** — not vibes.

**Scope:** all 14 PNGs in `web-three/assets/web-three/frames/` — 11 portrait (720×1280), 3 landscape (1280×720). The Day 1–2 Godot frames (`assets/greybox-day1/`, `assets/greybox-day2/`) were audited in [Doc 20](20-day1-greybox-render-notes.md) and [Doc 25](25-day2-render-notes.md) and are not re-audited here.

---

## The finding that matters most: nine frames wear Day 1's HUD

Nine of the fourteen frames were captured by probe scripts that stage a scene on a fresh page. The engine is real, the props are real — but the save is Day 1. So the HUD says **$87**, the objective reads *"Someone by the terminal is waving at you."* (the Day-1 Rosa beat), and the Map boots with *"You are here. That's enough."* — while the picture shows Day-3 or Day-4 moments.

Frames affected: `d3_plaza_pigeons_portrait`, `d3_brownstones_portrait`, `d3_kid_on_stool_portrait`, `d3_street_landscape`, `d3_three_windows_dusk_portrait`, `d4_stranger_terminal_portrait`, `d4_the_greeting_portrait`, `d4_she_walks_your_first_walk`, `d4_four_windows_dusk_portrait`.

The five afternoon frames do it right. `d4_laundry_bay_portrait`, `d4_sal_counter_wash`, `d4_permit_notice_portrait`, `d4_receipt_on_cart_portrait`, and `d4_receipt_on_cart` carry the real Day-4 state: **$133** before the permit, **$123** after, the real notes, the timer climbing 0:02 → 0:07. The money math checks out against Doc 29 and the E2E.

Why it matters: the README shows these frames as "Day 3, seen" and "Day 4, seen." A sharp viewer catches the $87 and stops trusting the evidence. The scenes are real; the receipts aren't.

**Fix:** re-capture organically through the day state machine — the afternoon capture scripts already prove that works — or suppress the HUD in staged shots and say so in the caption.

---

## Frame by frame

### Day 3 — the living street

**`d3_plaza_pigeons_portrait` (720×1280) — Pass with notes.**
The subway plaza reads in one second: SUBWAY sign, benches, pigeons by the stairs, long afternoon light.
- CLEAR: a small dark rectangle sits above the tree canopy, attached to nothing. If that is the squirrel, it needs a branch. If it is a prop, it needs ground.
- UNCERTAIN: pigeons at the sidewalk edge read half-submerged in the ground seam.
- Staged Day-1 HUD (see above).

**`d3_brownstones_portrait` (720×1280) — Pass with notes.**
Coral, teal, plum doors; stoops with railings; AC units. The street reads as a street, not a grid.
- CLEAR: the bottom half is empty pavement; the whole scene lives in the top half.
- UNCERTAIN: the tree trunk meets the sidewalk without a contact shadow — slightly pasted-on.
- UNCERTAIN: stoops read large relative to the figure. Style call, and a defensible one (tiny person, big city). Keep.
- Staged Day-1 HUD.

**`d3_kid_on_stool_portrait` (720×1280) — Pass with notes.**
The kid at the cart reads clearly; the cart sign is legible.
- CLEAR: taxi nose clipped at the left edge. Framing, minor.
- Staged Day-1 HUD — the worst contradiction of the set: the stool is Day-3 furniture and the HUD says $87.

**`d3_street_landscape` (1280×720) — Pass with notes.**
- UNCERTAIN: the orange cone looks slightly off the sidewalk.
- UNCERTAIN: a cluster of faint white spheres with a dark patch beneath, left of frame, reads as an unfinished effect (steam? a flock?). Worth one look.
- CLEAR: far-right props clipped by the frame edge. Minor.
- UNCERTAIN: a prominent seam line where the sidewalk meets the building base.
- Staged Day-1 HUD.

**`d3_three_windows_dusk_portrait` (720×1280) — Pass with notes.**
Three windows counted. The kid's silhouette waves from the center window — the beat lands.
- CLEAR: the street-lamp pole enters the ground with no base.
- CLEAR: the teal door reads child-scale against the facade. Partly style — but the door is an emotional anchor from Day 2, so it deserves a deliberate decision, not an accident.
- UNCERTAIN: AC units float a hair in front of their windows.
- UNCERTAIN: bottom-heavy; the subject sits low with sky above.
- Staged Day-1 HUD.

### Day 4 morning — "Say Hi"

**`d4_stranger_terminal_portrait` (720×1280) — Pass with notes.**
She is there, duffel down, facing the street. The Day-1 mirror works.
- CLEAR: the BUS TERMINAL sign is clipped at the left edge.
- CLEAR: the right side (bench, second tree) is cut by the frame.
- CLEAR: the action is squeezed into a thin horizontal strip — empty wall above, empty street below.
- UNCERTAIN: a small yellow object in the tree reads unattached.
- Staged Day-1 HUD.

**`d4_the_greeting_portrait` (720×1280) — Needs work. The weakest frame in the set.**
This is the emotional hinge of Day 4 — Rosa sends you to say hi — and it does not sell it in one second yet. The two figures are small and centered while the frame spends its pixels on blank wall and asphalt.
- CLEAR: BUS TERMINAL sign clipped at the left edge.
- CLEAR: right side cut.
- CLEAR: same thin-strip composition as the terminal frame, worse.
- Staged Day-1 HUD.
**Fix:** raise or tilt the camera so the two figures own the middle third.

**`d4_she_walks_your_first_walk` (1280×720) — Pass.**
She is mid-crosswalk, the cab waits. The beat reads clean in landscape.
- UNCERTAIN: crosswalk stripes read wide relative to the figures. Style; acceptable.
- UNCERTAIN: buildings sliced at the top edge without sky.
- Staged Day-1 HUD.

**`d4_four_windows_dusk_portrait` (720×1280) — Pass.**
Four lit windows counted; the lamp next door glows; the skyline sits behind.
- CLEAR: tree clipped at the left edge. Minor.
- UNCERTAIN: a thin white vertical line above the tallest backdrop tower reads detached — the antenna prop. Ground it in the tower or drop it.
- Staged Day-1 HUD.

### Day 4 afternoon — "The Block Opens Up" (all five carry real, state-consistent HUDs)

**`d4_laundry_bay_portrait` (720×1280) — Pass with notes.**
SUNRISE LAUNDRY legible; the recessed bay reads; two washers and the folding table visible; the music toggle shows in the HUD.
- CLEAR: the subject sits high; the foreground gives most of the frame to road and crosswalk stripes. The crosswalk does lead the eye, so this is acceptable — but the bay could own more of the frame.
- UNCERTAIN: washer bases versus the bay floor grounding.
- UNCERTAIN: a coplanar seam near the building base by the tree.
- UNCERTAIN: the right edge cuts hard at the neighbor wall.

**`d4_sal_counter_wash` (720×1280) — Pass with notes. One real defect candidate.**
- CLEAR: a grey rectangular prism floats above the ground, left of the figure — the clearest floating-prop read in the whole audit. Identify it (apron basket? folded table?) and ground it or set it on the counter.
- CLEAR: a yellow shape clipped at the bottom-right. Framing, minor.

**`d4_permit_notice_portrait` (720×1280) — Pass with notes.**
The A-frame notice and the "[Space] Read the notice" prompt are crisp — the No-Quiz Law made physical.
- CLEAR: you stand dead center against a large empty wall; the frame is top-heavy.
- UNCERTAIN: taxi nose clipped bottom-left.

**`d4_receipt_on_cart_portrait` (720×1280) — Pass with notes.**
The HUD shows **$123** — post-permit money, honest.
- CLEAR: the fire-escape landings read as two floating black slabs. The ladder is out of frame, so nothing explains what holds them up. In engine they are surely attached; in this frame they float — and the 1-Second Law judges the frame.
- CLEAR: taxi tail clipped right. Minor.
- Composition: the eye goes to the ladder and the taxi, not the receipt. The hero prop of the beat needs more frame or more contrast.

**`d4_receipt_on_cart` (1280×720) — Pass with notes.**
- CLEAR: the cart sign is half-hidden behind the dialogue box ("…Spot" survives).
- UNCERTAIN: the ladder and pole run off the top edge.

---

## The clock is fine

Three portrait frames made the vision pass read the timer as "0:92", "0:93", "0:96". That would be a real bug. It is not one: the HUD clock is built as `Math.floor(elapsed / 60)` minutes plus `(elapsed % 60)` zero-padded seconds (`Game.ts`, timer update), so 0:59 wraps to 1:00 by construction. The model misread small digits; the code wins. Logged here so nobody chases it.

---

## Top 5 fixes (owner: AGENT-A)

1. **Re-capture the nine staged frames organically.** The HUD says the wrong day on five Day-3 and four Day-4-morning frames. The method already exists — the afternoon capture scripts drive real state. This is evidence integrity, and it is first because the README publishes these frames.
2. **Ground the grey prism by Sal's counter** (`d4_sal_counter_wash`). Clearest floating-prop read in the set; the Anti-Slop gate names this exact defect.
3. **Make the fire escape explain itself in portrait close-ups** (`d4_receipt_on_cart_portrait`; the landings also sit at frame edge in several Day-3 shots). Visible brackets or railings, or keep the ladder in frame.
4. **One portrait camera pass for the morning chapter.** Raise the horizon so the figures own the middle third: `d4_the_greeting_portrait` first (needs work), then `d4_stranger_terminal_portrait`, `d4_permit_notice_portrait` (dead-center + empty wall), and the laundry bay's dead foreground.
5. **Small grounding pass.** Street-lamp base (`d3_three_windows_dusk_portrait`), the canopy object in `d3_plaza_pigeons_portrait`, the cone in `d3_street_landscape`, tree-trunk contact shadows (`d3_brownstones_portrait`), and a decision on the antenna line in `d4_four_windows_dusk_portrait`.

---

## Pass/fail table

| Frame | 1-Second Law | Defects found | Verdict |
|---|---|---|---|
| `d3_plaza_pigeons_portrait` | Reads | floating canopy object; staged HUD | Pass with notes |
| `d3_brownstones_portrait` | Reads | empty lower half; trunk grounding; staged HUD | Pass with notes |
| `d3_kid_on_stool_portrait` | Reads | staged HUD; clipped taxi | Pass with notes |
| `d3_street_landscape` | Reads | cone grounding; particle cluster; staged HUD | Pass with notes |
| `d3_three_windows_dusk_portrait` | Reads — beat lands | lamp base; door scale; staged HUD | Pass with notes |
| `d4_stranger_terminal_portrait` | Strained | thin-strip composition; clipped sign; staged HUD | Pass with notes |
| `d4_the_greeting_portrait` | Does not land yet | composition; clipped sign; staged HUD | **Needs work** |
| `d4_she_walks_your_first_walk` | Reads | stripe scale (style); staged HUD | Pass |
| `d4_four_windows_dusk_portrait` | Reads | clipped tree; antenna line; staged HUD | Pass |
| `d4_laundry_bay_portrait` | Reads | dead foreground | Pass with notes |
| `d4_sal_counter_wash` | Reads | **floating grey prism** | Pass with notes — fix |
| `d4_permit_notice_portrait` | Reads | dead-center subject; empty wall | Pass with notes |
| `d4_receipt_on_cart_portrait` | Strained | floating-looking landings; hero prop buried | Pass with notes |
| `d4_receipt_on_cart` | Reads | sign occluded by dialogue box | Pass with notes |

**Tally:** 14 frames — 13 pass (11 with notes), 1 needs work, 0 hard failures. No frame shows broken geometry, garbled text, or an unreadable sign; the one likely true floating prop is `d4_sal_counter_wash`'s grey prism, and the one composition that fails its moment is `d4_the_greeting_portrait`.

The pitch is "verified results, known limitations." That is what this doc tried to be.

*Every frame got an owner, a verdict, and either a fix or a pass. The corner forgives; the evidence should too.*
