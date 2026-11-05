# 02 — Comparison: gen-city-auto vs FIRST SLICE

*Reference studied: https://github.com/greggman/gen-city-auto (its README/PLAN/DESIGN and repo layout, 2026-11).*

## 1. What gen-city-auto is

A procedurally generated **metropolis you drive and fly through** — WebGPU, zero libraries, GTA V / Spider-Man ambitions in <500 kB. City geometry as 128-triangle GPU clusters with Hi-Z occlusion and per-tile LOD (Nanite-style vertex pulling), NURBS vehicles tessellated to 3 LODs in a worker, IDM car-following traffic with signals, seeded city generation (terrain, rivers, bridges, four themed cities), Puppeteer tests, and an `agents/` directory of AI-agent briefs (vehicle designer + a "AAA judge").

## 2. Why it is NOT the target for FIRST SLICE — deliberately

| Dimension | gen-city-auto | FIRST SLICE (and why) |
|---|---|---|
| Rendering | WebGPU, custom deferred, GPU-driven | **Three.js/WebGL stays** (task law + audience: billions of phones, GitHub Pages, no WebGPU-everywhere yet) |
| Scale | km² streaming city, LOD2 shells past 1.5 km | One authored neighborhood (~94 × 26 m + subway/Times Square). "Compact but rich" is a GDD pillar, not a limitation |
| Genre core | Driving/flying sandbox, autopilot, cinematic director | A life sim: Rosa, the cart, the postcards. The city is the teacher, not a race track |
| Content | Procedural from seeds | Authored beats with diaries (`barrierDiary`, `familiarBeatForDay`) — hand-written warmth |
| Assets | NURBS → GPU tessellation | Procedural box-people + street kits; lowpoly postcard look is the brand |

## 3. What we DO take from it (principles, not code)

1. **Generation/authoring vs runtime separation.** Its worldgen bakes; the runtime streams. Ours is smaller but the same law applies and is already honored (`World.dressDay` = pure visibility/material writes; no runtime teardown).
2. **Simulation budgets.** Its traffic/peds run on explicit budgets (worker tessellation, cluster culling). Our equivalent: the existing ambient systems (peds, traffic, bus, pigeons) must stay budgeted as districts grow — see [07-performance-and-testing-strategy.md](07-performance-and-testing-strategy.md).
3. **Ambient AI as a first-class system.** Traffic signals + IDM car following is the "city independent of the player" idea; our `engine/traffic.ts` + `engine/busRoute.ts` + `world/peds.ts` are the same instinct at neighborhood scale — they keep running in roam mode with zero story dependencies (verified by the Roam probe).
4. **The expert-agent + judge workflow.** Its `agents/` briefs (designer agent + AAA judge agent) validate the repo's own culture: named agents, per-feature probes, worklog + ledger ([06-agent-development-framework.md](06-agent-development-framework.md) formalizes ours the same way).
5. **URL-parameter driver fleet.** Their URL params ≈ our `?autotest/?probe/?fx=off/?starter` law. Keep it: every probe boots the same root URL and stays honest.

## 4. The one-sentence takeaway

gen-city-auto proves how to make a **big** city run; FIRST SLICE needs to make a **small** city feel alive and beloved — we borrow its engineering discipline (budgets, streaming readiness, agent/judge workflow) and none of its engine or scale.
