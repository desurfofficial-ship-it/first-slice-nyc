# Doc 48 — Agent 2: Half-Court Audit (pre-implementation)

> Agent 2's mandate: take the basketball half-court from "a prop that fires
> a cut-scene" to something a real player can pick up and be good at.
> Audit-first, per the house rule. This document is the audit — written
> against the code as it stood at `0d765ab` (main), before any upgrade work.
> The implementation report and its evidence live in docs/49.

---

## 1. What shipped before this pass (the honest inventory)

The half-court landed in Phase 2/3 (docs/38) and had not been touched since:

| Piece | Where | State |
|---|---|---|
| Court paint | `World.buildCourt()` | 6 separate meshes: 1 dark patch + 5 cream line boxes + a flat ring. A key and a partial arc — no three-point line, no FT circle, no hash marks, no wear. |
| Hoop | `props.makeHoop()` | Pole, arm, cream board, ink square, orange torus rim. **No net** (an explicit cost call: "four draw calls for something the sun eats"). |
| Ball | `World.buildCourt()` | A 10×8 orange sphere, `0xd9772f`, no seams, no spin, no physics. |
| The shot | `Game.shootHoop()` | **A scripted cut-scene.** `hoopOutcome(day, shotIndex)` — a day-seeded 6-in-10 table — decided make/miss BEFORE the ball moved. Two tweens carried the ball to the rim; a make dropped it through the rim center, a miss landed it at a hard-coded offset. The ball then teleported back to its rest spot. |
| Feedback | `ui.showNote` | Day-keyed make/miss lines. No sound (no bounce, no rim, no swish), no net movement, no score readout beyond notes. |
| Controls | interaction `court` | One press near the ball → shot fired. No pickup, no dribble, no holding, no aiming, no timing. Player skill: zero. |
| Scoring state | `GameState.recordChoice('hoop')` | Cumulative makes in the save (v1 field, good). Streak was Game-private, lost on every shot's completion. |

## 2. Why it read as unfinished (the diagnosis)

1. **The outcome was decided before the ball left the "hand."** No input
   other than proximity influenced the result. A player cannot be *good*
   at the half-court — the design doc's own "6-in-10 shooter whose form
   comes and goes by day" is a dice roll the player watches.
2. **The ball ignored the world.** Tweens, not physics: no gravity arc
   ruled by mass, no rim iron to clang off, no backboard to bank, no floor
   bounce, no rebound you can chase. The rim, the board and the ground
   were scenery the ball politely ignored — the classic "fake score
   trigger" the mandate forbids.
3. **The loop had no verbs.** Shoot-and-teleport. No pick up, no dribble,
   no rebound, no "miss → chase → try again from where it lies."
4. **The corner didn't look like a place.** No lines worth the name, no
   net, no enclosure, no light, no score anywhere you could point at.
5. **No sound.** A basketball corner is a *sound* before it is a sight.

## 3. The upgrade contract (what "done" means)

1. **No fake outcomes.** Make/miss EMERGES from a simulation: gravity,
   rim steel, backboard, ground, net. Deterministic fixed-step (1/120 s),
   zero randomness — same release, same flight, every time, for the player
   AND the probe.
2. **Skill is real.** Hold-to-charge with a visible release band; the band
   is the closed-form ballistic solve for where you stand; release timing
   inside the band scores. The band tracks your feet if you move.
3. **The ball never penetrates anything.** Ground, backboard, rim torus,
   pole, fence — push-out-then-reflect by construction, proven by sweep
   tests across the full charge range at three court spots.
4. **The loop has verbs.** Pick up → carry → dribble (audible) → hold to
   charge → release → chase the rebound → pick it up again, wherever it
   came down. The ball stays where it lands; the interaction follows it.
5. **The corner looks kept.** One painted canvas (key, FT circle, corner
   threes, hash marks, half-court line, twenty years of wear), a real net
   that swishes, chain-link with a gate, pole pad, a caged gooseneck, and
   the block's chalk tally on the wall.
6. **The block keeps score its way.** Notes stay the voice; the tally
   board is furniture, not HUD; `hoopMakes` in the save (v1) unchanged.
7. **Mobile-first controls.** Same one button: tap = pick up, hold =
   charge, release = shoot. 44px+ target, no page scroll, no overlap.
8. **Performance stays bought.** The old six paint meshes became one
   textured plane; the net is one LineSegments call; posts bake into their
   district; the weave fades point-blank instead of walling the lens.

## 4. Constraints honored (file ownership)

- New basketball-owned module: `web-three/src/court/` (`ballSim`,
  `Basketball`, `courtPaint`, `courtDressing`, `CourtGame`) + its own test
  file and probe. The mandate's isolation requirement, met literally.
- Shared files touched ONLY at sanctioned seams, each documented:
  `Game.ts` (the old scripted block swapped for the court hand-off),
  `interactionDefs.ts` (court def + rest-spot y), `Input.ts` (+held state),
  `UI.ts` (+meter), `audio.ts` (+5 voices), `index.html`/`style.css`
  (+meter element), `World.ts` (`buildCourt` body), `collide.ts`
  (+optional `seeThroughCamera`), `GameCamera.ts` (+1 skip line),
  `content.ts` (one stale line — "the net that isn't there" — made true).
- One coordinate fix outside the module, flagged for Main Agent review:
  the W1 Kestrel fill planted a street tree at (44, 7.48) — INSIDE the
  court, in front of the rim. Moved to (48.8, 7.48), same row, same law.
- No new dependencies, no new assets, save v1 untouched.

## 5. Risks carried into implementation

| Risk | Answer |
|---|---|
| The E2E walks the north lane z 4–7.2; does the fence block it? | The fence's south run sits at z 4.49–4.61, x 40.45–45.3; the lane east of the crosswalk has no authored beats, the hauls run z 6.8–6.9, and the gate (45.3–47.3) stays open. Verified by the full E2E after the build. |
| Deterministic physics vs. float drift across machines? | Fixed 1/120 s steps, closed-form solve, no randomness; the probe re-runs make/miss in-engine. |
| Mobile charge timing at low fps? | Charge rate 0.85/s with a distance-scaled band (≥0.03 half-width) — one frame at 30 fps (≈0.028) stays inside the band everywhere on the floor. |
| The camera inside the court | The boom now skips the chain-link colliders (`seeThroughCamera`) and the weave fades point-blank — the fence is a fence, not a wall, for bodies AND lenses. |
