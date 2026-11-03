# 54 — The postcard's album + share sheet; the skyline's lit windows

*Closes two lines of the GDD audit's "Core Systems Still Thin" list: the
postcard pipeline (album + share + volume) and the skyline of lit windows
"beyond the single gold one". SHIPPED 2026-11-03.*

## The album — where kept postcards live

The pipeline already captured real frames (TS-01: authored rig → offscreen
render → paper compose → PNG). What it lacked was a shelf: "Keep this
postcard" downloaded a file and forgot. Now Keep does three honest things
with one click:

1. **downloads** the full card (unchanged filename law — Keep and Share
   agree on it, so a re-shared card never renames itself),
2. **files the card** in the album as a quarter-size print
   (`src/postcard/Album.ts`): 192×336 jpeg — the same 4:7 paper, the same
   framing, the stamp and caption included. A shelf of days costs
   kilobytes, not megabytes; the full card of THIS session rides memory
   for re-prints,
3. **the HUD chip counts the shelf** — `Album (2)` next to the Map chip,
   the other folded corner (the button's radius is the Map's mirrored).

The album panel is a paper sheet in the Map's language: a grid of kept
cards with their day tags (the Wow card says "THE SQUARE"), an honest
empty line when nothing is kept yet, and a tap re-prints the card —
full-size if this session still holds the paper, album-size if it came
from an older visit (and the note says so).

**Storage rules are the save parser's rules** (`tests/album.test.ts`):
every field is checked (id ≤64 chars, day 1..999 integer, kind enum,
caption ≤400, cartName ≤40, thumb a `data:image/` URL ≤200 KB, keptAt a
finite number), wrong shapes fall out, duplicate ids collapse (keep twice,
still one card), the cap keeps the newest 24, and a corrupted album is an
EMPTY album — never a crash. `storeAlbum` quota-degrades: if the write
fails it halves and retries, newest first (the shelf's own law, `keptAt`
order, never the caller's whim), and returns what actually stuck so the
badge counts the shelf, not the wish. `first_slice_album` rides
localStorage beside the save, v1-safe.

## The share sheet — honest capability, not feature theater

`PostcardCapture.sharePostcard` hands the card to the platform's Web Share
API **as a file** when (and only when) `navigator.canShare({files})` can
take it; closing the sheet is "shared", anything else falls through to the
download — the card always lands somewhere. The panel's Share button
exists only where the API can actually take the file (headless Linux
can't — the autotest asserts it stays hidden instead of pretending).

## The skyline of lit windows

The far card of towers (z 90, above the low building) was eight dead
silhouettes. Now they carry ~200 warm panes: one InstancedMesh, one draw
call, `fog: false`, facing the street. The pattern is SEEDED
(`dressing.ts skylineWindowMask`, mulberry32) — the same tower shows the
same lit windows every run, tenants keep their lamps, and a tower that
would read as an empty office is topped up deterministically. Top floors
keep darker (a penthouse is not a showroom).

And the far city keeps a small diary, like the brownstone's: two DARK
cells (`skylineDiaryIndices`) wake with the week — `skylineDiaryWarmth`:
dark until Day 3, warm from Day 3 on. `dressDay` drives both materials;
the steady city stays the same warm fact every day.

**The bake lesson, recorded:** `bakeStatics()` traverses the scene and
merges Lambert meshes — and an InstancedMesh IS a Mesh. The bake cloned
the base plane (one phantom pane at the origin), merged it into a street
tile, and stripped the real instanced draw from the scene. The tree
canopy had dodged this by being built after the bake; the skyline lived
before it. The structural fix is in the bake itself: instanced draws own
themselves, the bake never touches them (`o.isInstancedMesh → skip`).
The unit tests pin the mask's determinism; the probe
(`scripts/probe-skyline.mjs`) reads the live materials and prints the
evidence frame.

## Verification

- tsc clean · vitest **450/450** (20 new: the album wall + the skyline
  facts) · build clean.
- E2E AUTOTEST OK, **0 failures, 484 s**, console clean — including the
  new driver beats: keep files the day-1 card, the shelf shows it, the
  album opens and closes from the HUD, day 2's card joins the shelf, and
  the share button hides where files cannot be shared. The pointer-path
  guard clicks the real album button.
- `probe-album` (4/4) and `probe-skyline` (materials + evidence frame)
  pass.

## Addendum — the arrival merges (Nov 3, evening)

Two more waves landed on top of the album pass while the push was
waiting, and both are agent5's arrival work: the forest canopy
smoothed into landing stairs (`4356ba7`), then the shopfronts grow a
shop — bays, transoms, kickplates, a lit door (`339141c`). Neither
touches the album, the bake, or the skyline files; both merges were
clean, and the tree was re-gated from scratch after each.

- merge `e2516c9` (canopies + landing stairs): tsc clean · vitest
  **457/457** · E2E AUTOTEST OK, 0 failures / 353 s, console clean.
- merge `42a112a` (the lit door): tsc clean · vitest **457/457** ·
  E2E AUTOTEST OK, 0 failures / 356 s, console clean.
- Pushed main through both waves: `339141c..42a112a`.

One honest note on the harness: the sandbox had recycled the
playwright browser cache, and the first E2E launch of the evening died
with a silently empty log — backgrounded stdout does not survive the
tool-call boundary here, and a pty wrapper is policy-blocked. The fix
was boring on purpose: reinstall chromium, then launch and poll inside
a single call. The suite's first green this round doubles as the
proof the cache came back.
