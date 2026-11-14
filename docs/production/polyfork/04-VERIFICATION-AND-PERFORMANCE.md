# The Polyfork Streets Wave — 04: verification and performance

> The directive's gates: "Test the assets in the actual game
> environment… Performance measurements. Collision and navigation
> verification. Before-and-after screenshots." All measured on the
> sandbox rig (swiftshader, software GL), 2026-11-14.

## 1. The headless suite (tests/polyfork.test.ts — 17 guards)

- data integrity: ten assets, exact tri budgets, credit+source on every
  part, the fleet-critical vehicles at their real-world footprints;
- the decoder: face-split flat-color flat-normal geometries, feet at
  y 0, cache identity, unknown ids throw loudly;
- the accumulator: yaw+ground placement, byte-identical rebuilds, the
  Larch helper keeps the kit truck's size;
- the street kit: three batches + eight solids, the north-side lane law
  (minZ ≥ 7.28), the cart-corner apron law, the A/B seam builds
  nothing;
- the fleet: one zone-owned mesh of five backed-in vehicles, no body
  intersects a bollard station, the station slab and kiosk stay clear,
  the seam empties it.

The lane-law guard caught the first draft's north curb meter
(minZ 4.57 < 7.28) — the issue → permanent-guard law working as
designed; the meter moved south and the guard pins the class.

## 2. The in-engine gate (scripts/probe-polyfork.mjs — ALL PASS)

Boots the BUILT page twice (kit ON, kit OFF) and measures both:

- **the plan law**: kit ON carries +27,244 scene tris over kit OFF —
  the street kit + the Larch swap + the fleet, exactly the wave's
  budget;
- **the fleet law**: the Catalpa zone batch grows by +9,186 tris — the
  five vehicles' exact tri count, fused into the district's existing
  VC batch (the batch COUNT does not move: probe-wc1-catalpa re-read
  batches 2, facades 9, spawn dark, spur lit);
- **the +0 standing law**: spawn draws 192 with the kit ON and 192 with
  the kit OFF — byte-identical to the shipped ledger (the kit rides the
  bake; it cannot price the spawn);
- **the seam law**: kit OFF boots clean and carries none of the above;
- **console clean** on both boots (pageerror + console.error sweeps);
- **the evidence**: four before/after pairs at frozen rigs —
  `shots/polyfork/poly-alder-north-{before,after}.png` (the payphone),
  `poly-alder-south-{before,after}.png` (the newsstand + meters +
  rack), `poly-larch-docks-{before,after}.png` (the kit truck on
  Kestrel's curb), `poly-catalpa-fleet-{before,after}.png` (the
  backed-in fleet at the dock faces).

## 3. The standing battery on the final tree

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **1,768/1,768 across 106 files** (the shipped
  1,751 + this wave's 17).
- `npm run build` — OK (the 277 KB data module rides the bundle;
  gzip ~747 KB total, the kit's share compresses with the bundle).
- `scripts/probe-city-fabric.mjs` — **DRAWS 192** (< 200), byte-identical.
- `scripts/diag-pocket-scan.mjs` — **traps 19 / colliders 1,179** —
  re-measured on the STASHED BASELINE FIRST: the baseline tree reads
  exactly the same numbers (the handover's "18" predates the
  Larch/Catalpa integration merges), so the wave's 13 new colliders
  (8 street solids + 5 fleet vehicles) are **trap-neutral** — the
  scan's extent numbers did not move by one cell.
- `E2E_SCALE=0.35 node scripts/probe-nav.mjs` — **9/9**.
- `scripts/probe-wc1-catalpa.mjs` — **OK** (spawn dark +0 standing,
  spur 53, platform 23, batches 2, facades 9 — byte-identical WITH the
  fleet resident).
- `scripts/probe-fenestra.mjs` — **ALL PASS** (22 checks; see the
  fenestra re-certification note appended to 01-FENESTRA-INTEGRATION.md).

## 4. The honest carries

1. **`has_night` not wired** — the kit's newsstand/truck night markers
   are recorded in the data module but the districts' night pass is its
   own craft wave; the streets' shipped lamps carry the night read.
2. **The walk-legs sweep / full-scale E2E** — the documented
   slow-box dilation class (the handover's own carry); the nav probe's
   9/9 at the valve stands in for it here.
3. **The atlas mip re-audit** — the fenestra ledger's own carry,
   untouched by this wave.
4. **Payload** — the kit's 277 KB committed source (~90-100 KB gzipped
   in the bundle) is the price of the +0-draw architecture; the
   alternative (runtime GLBs) would pay loader weight AND draws.
   Recorded, accepted, and noted as the next compression candidate
   (per-asset dedup) if the payload budget ever tightens.
