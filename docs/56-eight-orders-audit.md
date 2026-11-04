# 56 — The Eight Orders, Audited

Every claim VS-F03 makes about serving now has a test that would scream
if it stopped being true. Nothing about the conversations changed —
this round only made the promises impossible to drop quietly.

## What the audit found

VS-F03 (docs/07) promises four things for the serving conversation v1:
**8 order types · choice UI · "chef's welcome" v0 · zero fail states.**
Three of the four were already guarded: the zero-fail sweep
(tests/state.test.ts) drives every card through every reply and pins
the money law; the E2E walks all eight conversations by thumb; the
choice UI has been live since the paper kit landed. What had no guard:

- **The count itself.** Eight was true by accident of authorship — no
  test would notice a card quietly deleted.
- **The chef's welcome on every card.** VS-F03 v0 says *any* order can
  be answered with the chef picks. The reply existed on all eight;
  nothing checked.
- **The margins' safety.** A reply's `slang:` id is a string. One typo
  (`'reguler'`) and a margin card becomes unearnable, silently.
- **The chef's welcome had never been pressed.** Not by the unit
  sweep (which pins outcomes, not labels), not by the E2E — the
  driver always chose make-it, repeat, or ask.

## What this round added

**tests/content-order.test.ts** — the content contract, five pins:

1. Exactly eight orders: the kit's five (`regular, bec, bagel,
   chopped, idris`) + the cart's three (`stroller, kid, idris_solo`).
2. Every card answers to the chef's welcome — v0 means ANY order.
3. Well-formed paper: bubble, line, default in range, every label and
   response whole, every `slang:` id a real margin card.
4. The kit's teach lines verbatim: "Milk and two sugars. That's what
   regular means here." · "That whole sentence is a complete order" ·
   the kid's "don't know either!" · the kid's chef's welcome is the
   picking kind ("I'll pick for you").
5. The cards earn `regular` + `hero` from the margins; `bodega` +
   `online` are the block's to teach (their live reachability stays
   pinned by the E2E's four-cards check).

**tests/state.test.ts** — one more law in the zero-fail describe:
card 5's nine-years note lands on EVERY choice. The comment in
content.ts always claimed "it is the payoff, not a branch"; now the
claim is a loop over all four replies, each asserting Rosa's quiet
line rides the serve.

**The E2E** — card 5 (Mr. Idris) now presses reply 3, the chef's
welcome, instead of reply 0. The four always-available gestures of the
kit each get a live beat: make-it on card 2, repeat on card 3, ask on
cards 1 and 4, chef's welcome on card 5. Two new PASS lines: the
response ("some orders you learn by heart before you learn by
asking") and — the important one — Rosa's nine-years note arriving
anyway, which live-proves the payoff really is not a branch.

## Verification

- tsc clean · vitest **463/463** (6 new) · build clean.
- E2E AUTOTEST OK, **0 failures, 356 s**, console clean.
- One honest note: the first E2E run of the round ran at 555 s under a
  busy sandbox and failed 31 checks in a cascade from day-2 dusk —
  every one timing-gated, money flags untouched, none reproducible.
  The re-run at normal speed (356 s) was clean end to end. The dusk
  beats poll on wall-clock frames; under load they starve. Not fixed
  here — recorded, because a flaky green is a lie we don't want to
  keep in the suite.

## Addendum — repairing the pocket wave (same evening)

The third merge wave (one Pocket button that opens Map / Album / Sound)
arrived with the behavior wired but the **properties never declared** —
`this.pocketBtn`, `this.pocketMenu`, `this.audioPeek` are used ~15 times
in UI.ts and declared nowhere, so **origin/main did not typecheck**. The
same wave also broke the E2E's thumb path: Map / Album / Sound now live
inside the pocket's hidden dropdown, and the guard's direct clicks hit
nothing (correctly — a thumb can't press a button it can't see).

Repaired in one pass:

- UI.ts declares the three pocket properties, following the existing
  field pattern (`el<HTMLButtonElement>('btn-pocket')` etc.).
- The pointer guard rides the real path now: open the pocket, then
  press the tool — and it pins the pocket's own click law ("the pocket
  opens by CLICK and shows the tools") as a first-class PASS line.
- tsc clean · vitest 463/463 · E2E AUTOTEST OK, 0 failures / 378 s,
  pointer path 6/6, console clean.

The lesson is the repo's oldest one, met again: **a gate skipped is a
bill sent to the next agent.** The pocket idea is good; it just needed
its `tsc --noEmit` before the push.

## Addendum two — the flake shape, closed (Nov 4)

The 555 s red run in the Verification section is now a **closed case**,
not just a recorded one. Root cause, found by reproducing the load on
purpose: the game clamps `dt` at 100 ms (Game.loop), so on a busy
machine the game's own time runs slower than the wall clock — and every
wait-for-the-game poll in the driver was a **blind wall-clock timer**.
At 1.55× dilation the dusk chains (glide → flicker → postcard) missed
their budgets, and 31 timing-gated checks fell in a cascade that looked
like a gameplay regression and was really a physics lie.

The fix is one measured factor, `pace`:

- measured once at driver start (60 frames ÷ the 100 ms clamp, capped
  at 4×) and printed as a `[pace]` line for forensics;
- every blind event poll rides it — the dusk/window/postcard polls,
  the day-wake and album polls, `noteSays`, `cabClear`, `holdUntil`;
- `walkTo` keeps its own progress-window logic (a walk still closing is
  not a failed walk — that law already survives slow machines);
- the E2E's pointer guard got the same law on the node side: it
  measures the same dilation in-page and stretches its playwright click
  timeouts and settle waits — **a busy machine is not a broken thumb**.

Proof, same sandbox, two burners pinned to the CPU for the whole guard
and the first beats: guard 6/6 PASS at ×4.00 budgets, driver measured
605 ms frames (×4.00), and the run that used to cascade instead ended
**AUTOTEST OK, 0 failures**. Idle runs are unchanged (×1.00, budgets
untouched — the factor only ever adds slack).
