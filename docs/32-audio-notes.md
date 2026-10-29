# Doc 32 — Audio Notes: the sound layer

*Status: shipped in code, verified by review and tests. Not yet verified by ears — see Honest limits. The sound file (`web-three/src/game/audio.ts`) is AGENT-A's; this doc explains it, and proposes nothing beyond five marked ideas.*

---

## 1. What was built

One new file, `web-three/src/game/audio.ts` (~270 lines), exporting a single app-lifetime singleton, `gameAudio`. Zero assets, zero downloads, zero licenses: every sound is synthesized in WebAudio at boot. Nothing to load, nothing to buffer, nothing to get removed from a store for sounding like someone else's song.

The graph is one master gain (0.5) feeding the destination. On top of it:

| Voice | What it is | Numbers |
|---|---|---|
| City bed | 4-second brown-noise buffer, looped, low-passed | filter 320 Hz, gain **0.05** — always on once unlocked, barely there |
| Traffic swell | fresh 3-second brown-noise buffer per swell, band-passed | 140–260 Hz (Q 0.8), gain ramps 0 → 0.05–0.09 → 0 over ~2.9 s; every 8–20 s |
| Pigeon coos | short sine slide, softer than the bed | 420–480 Hz → 300 Hz, 0.22 s, peak **0.02**; random every 9–29 s, ~70% fire |
| Brew hiss (`brew()`) | high-passed white noise, one honest voice per press | 2400 Hz, 1.15 s, peak 0.05 |
| Washer drum (`wash()` / `washStop()`) | the only loop in the game: brown noise, low-passed, plus one latch thump | 480 Hz, gain 0.09 with a 0.4 s ramp; latch is a 90→60 Hz sine |
| Permit stamp (`stamp()`) | paper tick, then the thunk — the loudest voice in the game, still quiet | 12 ms tick at 3 kHz + 140→70 Hz thump, peak **0.12** |
| Dusk bell (`bell()`) | C5 + E5 sine dyad for Day 4's fourth window | peaks 0.045 / 0.035, ~1.6–1.9 s decay |

Mute is real: `setMuted()` ramps the master gain to 0 (and back to 0.5) over ~50 ms, and the preference lives in `localStorage` under **`first_slice_muted`**. The button is `#btn-audio` in the HUD (`web-three/index.html`), wired in `UI.ts` — it toggles mute, syncs `aria-pressed`, and swaps its glyph (♫ / 🔇). If localStorage is unavailable (private mode), the failure is swallowed; the preference is a nicety, not a record.

There is no audio file in the repo, no network request, no third-party code. The whole layer is garnish by construction, which is what makes its failure posture simple: every method runs inside try/catch, `init()` bails to a null context if WebAudio is missing, and a dead audio layer is just a quiet game.

---

## 2. House rules

These are stated in the file's header and they hold in the code:

1. **Never blocks gameplay.** No awaits, no callbacks, nothing gameplay-bearing lives in the layer. Sound is fired and forgotten.
2. **Gesture-gated.** The `AudioContext` is created only on your first honest gesture (one `pointerdown` or `keydown`, listened for once). Before the first tap there is no audio, and the game never waits for it. The browsers' autoplay policy is treated as a fact of life, not an obstacle.
3. **No overlapping repeats.** Every voice is one-shot and gain-enveloped — no stacks of the same sound, no clicks. The washer is the only loop and has a single owner: `wash()` calls `washStop()` first, so a second start can't double the drum.
4. **Volume restraint.** Master at 0.5; the bed at 0.05; the loudest event (the stamp) peaks at 0.12. The city should be heard, not noticed — the Rule of Steam, applied to ears.

---

## 3. How it maps to the Laws

- **The 1-Second Law.** Audio must never steal the frame. Every level sits under 0.12 peak and the bed sits below conversation, so a paused scroll stays readable, beautiful, and identifiable with the sound on.
- **The Wonder-Beat Law.** One designed sound for the one designed moment: the dusk bell plays exactly once, under the fourth window, in the Day-4 golden beat — not on a timer, not on repeat.
- **The No-FOMO Law.** Mute is real, instant, remembered, and never punished. No nag to turn sound back on, nothing missable, nothing locked behind audio. (And nothing for sale — the layer has no opinion about money.)
- **The Hospitality Law.** The bed's whole job is to make the block feel inhabited for the next stranger — the layer keeps the light on. And when you ask it to be quiet, it quietly is, which is its own kind of hospitality.

---

## 4. Integration guide

**File ownership.** `web-three/src/game/audio.ts` is AGENT-A's file. Don't fork it, don't re-create it, extend it. The `gameAudio` singleton is import-safe anywhere; it is silent until the first gesture.

**Where events fire.** All gameplay hooks live in `Game.ts` in `applyEffect` — the switch on effect ids. Current hooks:

| Effect case | Call | Note |
|---|---|---|
| `brew-start` | `gameAudio.brew()` | one hiss per press; a second press while the hiss runs does not stack |
| `wash-start` | `gameAudio.wash()` | alongside `world.setWasherRunning(true)` — the drum spins while the apron washes |
| `apron-clean` | `gameAudio.washStop()` | the loop's single owner releases it |
| `permit-filed` | `gameAudio.stamp()` | the receipt beat; `persist()` rides the same case |
| Day-4 golden beat | `gameAudio.bell()` | inside the `if (day4)` branch, with `goldenBeat4()` — fires once |

**UI.** `#btn-audio` sits in `#hud-top-right` in `web-three/index.html` (`aria-label="Turn sound on or off"`, `type="button"`). `UI.ts` listens for clicks, calls `setMuted`, and syncs `aria-pressed` so screen readers hear the truth.

**To add a voice — the whole ritual:**
1. Add a small method in `audio.ts`, following `blip()` or `tone()`: one shot, gain envelope, try/catch.
2. Call it from the matching `applyEffect` case in `Game.ts` — never from content or state. If the moment has no effect id, give it one; effects are the honest queue.
3. Keep the peak under 0.12, and first ask whether the moment needs sound at all. Silence is a valid mix decision.

`gameAudio.dispose()` exists (clears both timers, stops the washer, closes the context) but has no call site yet — the layer lives for the page's life, which is fine. Wire it only if a real teardown path appears.

---

## 5. Validation evidence (real run, this workspace)

```text
$ cd web-three && npx tsc --noEmit; echo "typecheck exit=$?"; npm test 2>&1 | tail -4
typecheck exit=0

 Test Files  6 passed (6)
      Tests  112 passed (112)
```

(The bare `tail -4` happens to land on a vitest performance hint; the two summary lines above are from the same run, filtered — that is the actual output, not a transcription of a wish.)

What the 112 tests prove about audio: **nothing directly, by design.** Nothing gameplay-bearing lives in the layer, so no state test asserts it. What they do prove is that the game is complete and honest with the layer installed — every hook fires inside a codebase that still typechecks and passes its whole suite.

---

## 6. Honest limits

- **Nobody has heard it.** Headless Chromium cannot confirm audibility. Verification is code review + typecheck + unit tests only. No physical-device audio check has been done — no phone speaker, no laptop, no Bluetooth latency.
- **A broken WebAudio implementation would pass the suite silently.** The try/catch posture makes that acceptable (the game stays playable), but it is not the same as verified.
- **The levels were chosen on paper, not by ear.** The first time a person plays with sound on, expect one or two numbers to move. That is normal and cheap: they are all constants in one file.
- **The E2E runs under SwiftShader with no audio device.** It proves the hooks fire without throwing — not that you hear a bell.
- The mute glyph is a unicode character, not drawn art. It reads fine today. `[TBD]` proper icon — owner AGENT-A, no date committed.

---

## 7. Future voices — proposals, not commitments

Max five, and each has to earn its keep under the volume rule:

1. **Subway rumble near the entrance** — a low swell that scales with distance. Feelings-first: the island hums before anyone names it.
2. **Paper rustle on the Map handoff** — the beat where the Map changes hands deserves one small sound. (Also its last appearance, which is exactly why it should be quiet.)
3. **The awning's sail** — the copy already promises "a sound like a sail." One soft cloth flap would keep the promise.
4. **Fire-escape stairs on the dusk climb** — one creak every few steps, only while climbing, gone at the rail.
5. **A shutter for the postcard** — a tiny click when a postcard composes. The postcard already lands visually, so this one is optional twice over.

*None of these are scheduled. The bar for adding one: does the moment feel kept, or just noisy?*
