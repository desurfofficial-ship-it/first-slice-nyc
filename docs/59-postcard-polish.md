# FIRST SLICE: A New York Story
## Document 59 — The Postcard Pass (study → polish, the fridge-test bar)

> **Status:** Construction log, 2026-11-05. One task: study the postcard —
> every authored card, the whole pipeline, the presentation — and raise it
> to the bar its own doctrine sets ("if there's nothing worth printing, the
> milestone isn't done"). Study first, execution second, quality over speed.
>
> **Owner:** Z.ai (GLM), Task 11.

---

## 1. The study (evidence before opinions)

**The corpus read:** `PostcardCapture.ts` (the TS-01 pipeline: authored rig
→ offscreen render → paper composite → PNG), `Album.ts`, the caption
composers in `content.ts` (Doc 08's exact lines), the three capture sites
in `Game.ts` (day-end, Wow, moment cards), the panel + shelf presentation,
and the pinned laws (`wow-postcard.test.ts`, `album.test.ts`).

**The frames:** a new harness, `scripts/diag-postcard-study.mjs`, drives
the game's OWN compose paths on a staged dusk (startDusk → the authored
glide-end pose → lightGoldWindow + the day's golden beat) and saves every
card the game can compose: the four day-end cards, the four Day-1 moment
cards, the panel presentation, the album shelf. First lesson of the study:
the day-end card is born at the glide's END pose (13.5, 9.5, −5.5 →
16.5, 12, 7.94), not the start — the first capture batch judged the wrong
frames and was re-shot through the real chain before any verdict stood.

Contact-sheet reads at full resolution settled the findings:

| # | Finding | Verdict |
|---|---|---|
| 1 | The handwriting stack (`Bradley Hand / Segoe Print / Comic Sans / cursive`) ships no font. iPhone → Bradley Hand, Windows → Comic Sans, Android/Linux → the platform default (Roboto / DejaVu Serif — the study's captures show the serif plainly). Three voices across the exit devices; none is the game's. | **The systemic gap.** |
| 2 | The panel center-crops the 768×1344 card into a 38vh box: the stamp is beheaded, and the in-image caption strip peeks in under `object-fit: cover` so the words appear twice (once inside the image, once as the live HTML caption). | Player-facing, every card. |
| 3 | The paper grain rides `Math.random()` — the same moment never composed the same card twice; fridge-test reprints differed; nothing could pin the paper. | Doctrine break (determinism). |
| 4 | The stamp ellipsized names over 14 chars ("A Very Long Cart Na…"). | Craft. |
| 5 | The `towers` pose parked the near red roof as a dead wedge in the lower frame; the `fold` pose let the doorway aperture drift left with a van nose clipped at its corner. | Reframable by rig. |
| 6 | The day-end cards (the true pose) are GOOD — one gold bloom against the dusk skyline, the row lighting as the week keeps its promises. The glow halos read soft at full res (the thumbnail "caterpillar" was downscale aliasing). | **No world change.** |
| 7 | The `corner` card shows the cart as a translucent ghost — because the cart IS a placeholder (`CartPlaceholder`, opacity 0.35). The card didn't break it; it exposed it. | Filed as **docs/51 B18**. |

---

## 2. The execution

**The handwriting voice (finding 1).** `@fontsource/caveat` (OFL) rides
the bundle (`main.ts` imports 400 + 700; ~80 KB woff2 each). The stack
leads with Caveat everywhere — `--hand-font` in `style.css`, and the
canvas's own `POSTCARD_HAND_FONT` constant in `PostcardCapture.ts`. The
day tag stays Courier on purpose: the post office prints, the owner
writes. Caption type retuned for Caveat's small x-height: 30 px on a
40 px leading (`CAPTION_FONT_PX` / `CAPTION_LINE_PX`), strip at y 1088 —
the six-line budget still clears the paper. A module-level
`document.fonts.load` preload fires at import so the first card never
waits on a cold swap.

**The panel presentation (finding 2).** `#postcard-img` is now
aspect-locked to the photo region (768/1088) with `object-position: top
center`: the stamp and day tag survive, the in-image caption strip never
peeks in, and the live HTML caption below is the only words on the panel.
Landscape phones get a narrower box instead of a squashed one.

**The seeded paper (finding 3).** `grainSeed(day, caption, cartName)`
(FNV-1a) → `mulberry32` drives the grain: the same moment composes the
same paper twice. Pure, exported, pinned.

**The stamp's name (finding 4).** `wrapStampName` wraps at the last space
that fits (two lines, each ≤ 14) instead of ellipsizing mid-name; only a
single over-long word ellipsizes.

**The two rig reframes (finding 5).** Chosen from an eight-candidate
experiment (`scripts/diag-postcard-poses.mjs` renders candidates through
the real pipeline; the sheet picks the winner, the losers are deleted):
- `towers`: lifted +0.9 m, aimed a hair lower — the roof wedge becomes a
  roof, the fire escapes and street join the vista.
- `fold`: stepped 0.7 m left — the doorway sits centered, the right pier
  slims, the van under the tree reads as the street waiting.

**Not done on purpose:** the glow halos (finding 6 — live dusk look,
already right at full res), the caption auto-fit squeeze guard (the
captions are authored and fit), the corner card's pose (finding 7 — the
frame is correct; the subject is the debt, filed as B18).

---

## 3. Laws pinned (tests/postcard-paper.test.ts, 12 checks)

- the voice: canvas stack leads Caveat; `main.ts` imports the bundle css;
  `--hand-font` agrees with the canvas (the two files that drift silently).
- the print law: six caption lines clear the card bottom with margin.
- the seeded grain: identical identity → identical seed; identity varies
  the seed; mulberry32 replays exactly.
- the stamp's name: at-limit names ride one line; a 15-char name wraps at
  the space; over-max tails ellipsize; a single long word ellipsizes.

---

## 4. Verification

- `tsc --noEmit` clean; vitest **581/581** (38 files — +12 paper laws);
  build clean (Caveat rides the bundle).
- Full re-capture through the study harness after every change; the
  contact sheet re-read at each step (the evidence lives in
  `web-three/shots/postcard-study/`, the pose experiments in
  `web-three/shots/postcard-poses/`).
- Full 4-day E2E on the pass's tree: see worklog Task 11's stage summary
  (the compose pipeline is exercised at every day-end + the Wow card).
