# 14 — Narrative Implementation Spec

**Requirements and structured guidance for the gameplay-building agents**

| | |
|---|---|
| Status | Canon (v1.0). This doc is written TO the building agents; the story docs are written ABOUT the world. |
| Owner | Lead Narrative Director (narrative questions); engineering leads (implementation choices) |
| Binding context | `AGENTS.md` remains the operating contract. Nothing here modifies module fences, the Roam law, state-machine discipline, or the entry gates (`tsc --noEmit`, `vitest run`). |

---

## 0. The one-paragraph brief

The narrative layer adds to the existing sim: a **field diary** (entries with epistemic tags and an append-only contradiction ledger), a **consequence ledger** (promises, omissions, structural choices), a **relationship/availability simulation** (majors tick off-screen), a **chapter/rails engine** (six load-bearing rails over a free-roam life sim), **time-boxed events**, an **amends economy**, and a **self-portrait generator** — all as pure state behind the existing content seam (`src/core/content.ts`), all pinned by tests, all safe for Save v1. The story docs (02–12) are the content source of truth; this doc is the systems contract.

## 1. Requirements

**R0 (PRIORITY-0) — Re-point the hygiene guard.** `tests/docs-hygiene.test.ts` case 3 reads `docs/09-phase0-checklist.md` and `docs/18-phase0-exit-summary.md`, removed with the legacy docs. Re-point the guard at `docs/narrative/00-README.md` (existence + the phase line rule stays). Until this lands, exactly one hygiene case fails — known, expected, documented in 00-EXECUTION-REPORT.md.

**R1 — Rails engine.** Six flags (`rail1..rail6`) in chapter state; each rail has a *fire* condition (authored trigger + minimum in-game days) and *shape* inputs (choice flags). Acceptance: rails are data, not scenes; a rail can fire while the player is mid-roam; firing is observable in the city diary, never in a banner.

**R2 — Consequence ledger.** Append-only log of significant acts: `LedgerEntry { id, kind: 'choice'|'promise'|'omission'|'amends', date, refs[], weight, visibility }`. Promises carry due dates; unmet promises mature into omissions automatically (doc 10 §1). Acceptance: the C5 cascade reads only from this ledger + relationship states; deterministic from save.

**R3 — Field diary.** `DiaryEntry` schema per doc 03 §2 (kinds, epistemic tags, corrections array). The Map renders entries as ink; the contradiction ledger (K1–K8) is authored data, not procedural. Acceptance: append-only invariant (a mutation test fails any code path that edits body text of a persisted entry); old saves parse with empty diary layers (Save v1 law).

**R4 — Time model.** In-game calendar only: day counter, season derivation, month-precision chapter windows (doc 12 §2). No real-world clock anywhere. Season cuts are a named state transition (`seasonCut`) that consumes calendar days and runs the diary montage + postcard + city-diary whisper. Acceptance: a test proves no save field or prose string contains a real-world date.

**R5 — Independence simulation.** Per-major: `availability`, `mood` (steady/strained/bitter + recovery), `calendar` (income/appointment events), and one **independent decision per chapter** (authored data from doc 07 beats). Supporting cast simulate presence + news only. Disclosure thresholds per character (doc 07 §3). Acceptance: ignoring the protagonist for a chapter changes at least three majors' states in documented directions (doc 07's "without Leo" lines are the spec).

**R6 — Missable-event scheduler.** `MissableWindow { id, opensAt, closesAt, onMiss }` per doc 10 §4 specimen list. On expiry, `onMiss` writes the world change (not a message — a state change the city diary may mention once). Acceptance: no window ever re-opens; No-FOMO compliance = the miss is *content* (a changed world), never a nag.

**R7 — Choice nodes.** The register in doc 10 §3 is the data source: `ChoiceNode { id, options[], locks[], ledgerWrites[], flagWrites[] }`. Structural nodes must diverge in ledger terms (the no-fake-choices rule is a test: each structural option's downstream flag signature must be unique).

**R8 — Chapter gating.** Chapters advance on trigger + minimum in-game days, never on real time and never on pure playtime. Acceptance: a player who roams for a hundred in-game days in C1 gets every C1 independent event and no C2 content early.

**R9 — Postcards as unsent letters.** The shipped pipeline gains a `kept` flag and one `sent` event (C5, to Ada). Acceptance: no postcard UI promises mailing; the C5 scene is the only send.

**R10 — Fluency & voice states.** The Tourist→Local ladder persists; dialogue tables select lines by fluency tier (the "look at you" payoff in C4 is data). Leo's diary voice parameters (entry length trend, joke rate) are authored per chapter (doc 13 §3).

**R11 — Name/look propagation.** The chosen name flows through every diary entry, spoken line, text message, and the self-portrait. The surname-gating rule (doc 02 §1) is a content-table convention (line variants keyed to a `surnameKnown` flag).

**R12 — Sensitive-content guardrails.** (a) The opt-in resource note, once, at the first firing of: F7, the therapy thread's first session, and the C5 investigation scenes — whichever comes first. (b) No flashback cinematic machinery may be built for the Lost Year; fragments are text/sensory only. (c) The amnesia rules (doc 02 §6) are asserted in tests: e.g., a test fails if any authored content upgrades a RECALL to FACT by elapsed time alone.

**R13 — Self-portrait generator.** A pure function of saved state → prose (standing, amends, relationships, fragments, unstruck contradictions, therapy attendance). Each version is kept append-only. Acceptance: identical state → identical text (determinism law).

**R14 — Amends economy.** The doc 09 §4 table as data: 19 rows, amounts, states (`signed`/`owed`/`partial`/`paid`/`refused`/`converted`), per-row payment verbs (quarters, bursar, labor, cash-unopened). The restitution total is derived from the table, not hard-coded.

**R15 — What NOT to build.** No karma meter or alignment UI; no quest-journal takeover of the diary; no real-world clock; no mission-gated streets; no memory-recovery cutscene system; no forgiveness ceremony; no "ending" screen after C6's window; no world state that forgets the ledger on chapter change.

## 2. Core schemas (starter TS, subject to engineering taste within the contract)

```ts
interface ChoiceNode   { /* doc 10 §3 */ }
interface LedgerEntry  { /* R2 */ }
interface MissableWindow { /* R6 */ }
interface ChapterState { chapter: 'C0'|'C1'|'C2'|'C3'|'C4'|'C5'|'C6'|'OPEN';
  rails: Record<'R1'|'R2'|'R3'|'R4'|'R5'|'R6', RailState>;
  calendarDay: number; }
interface RelationshipState { charId: string; warmth: number; trust: number;
  disclosure: 'public'|'private'|'secret'; threshold: number; }
interface AmendsRow    { /* R14 */ }
```

## 3. Save & migration

Save v2 extends v1 additively: `diary_entries`, `person_cards`, `questions`, `ledger`, `promises`, `windows`, `chapter`, `rails`, `fluency`, `amends`. Old saves parse unchanged (the v1 law, kept); every new layer reads as empty and heals forward. The diary's append-only invariant is enforced at parse (corrupt entry → quarantine, never crash — the map-notebook precedent).

## 4. Performance & asset notes

- The diary is data; the ink is one handwriting font atlas + a wobble style (RECALL) — two draw calls' worth of UI, no scene cost.
- The contradiction strikethrough is a text style, not an image.
- Postcards reuse the shipped capture pipeline; the C5 send reuses the album UI with a stamp overlay.
- The seasonal pass (doc 12 §5) is the largest visual dependency: budget it as its own phase (W6 candidate), gated behind chapter states, reusing existing weather/leaf systems.
- Handwriting legibility: ship a dyslexia-friendly plain-type toggle (accessibility; one flag, one font).

## 5. Content pipeline & volume estimate (for scheduling, not a promise)

Diary authored entries ≈ 120–160 across the spine (chapter-gated) + player-prompt entries; person cards ≈ 40 (16 majors, 24 supporting); ledger-authored entries: 8 contradictions (K1–K8), ~15 structural-choice consequence notes; scene content: the spine's ~60 authored scenes (doc 06), the first-session pack (doc 11), ~10 therapy sessions, ~19 amends beats. VO: none required for v1 (text-first; the style guide's rhythm assumes text); if VO is later budgeted, doc 13's cover-the-name test is the casting brief.

## 6. Testing law (every narrative rule is a test)

Per AGENTS.md §1c.1, each law in this bible lands as a permanent guard. Minimum set: diary append-only; tag system integrity (no silent RECALL→FACT); rails fire-once; ledger determinism from save; missable windows never reopen; no real-world dates in save or prose; name propagation; determinism of the self-portrait; the amends table sums to $61,500/$47,300; docs-hygiene re-point (R0). The existing suites (state, diary, map-notebook, save, living-memory) are the pattern to extend, not replace.

## 7. Recommended build order

1. R0, R4, R3 (the spine of state), 2. R2+R7 (ledger + nodes), 3. R1+R8 (chapters), 4. R5 (independence), 5. R6 (windows), 6. C0 content pack (doc 11) against the shipped opening, 7. R9–R12, 8. C1–C2 content, 9. R13–R14, 10. C3–C6 content, seasonal pass in parallel after C2. Each stage ships with its tests green and its laws pinned — the story only works if the ledger never lies to the save.

— Lead Narrative Director, 2026-11-06
