# 12 — Economy & Resource Contract

| | |
|---|---|
| Status | Adopted — ledger + flow accounting implemented (`sim/economy.ts`), tested with shipped prices only |
| Honesty law | No invented prices, payouts, or balance curves (directive rule 17). Everything below is machinery + evidence. |

## 1. Currency & accounts

- Unit: **integer cents**. Floats never touch a balance (`openAccount` throws; `post` refuses — tested).
- Accounts are sim ids: `npc:*`, `biz:*`, plus exactly two system accounts — `acct:player` (the player's ledger truth; the shipped $87.00 = 8700 cents is its genesis) and `acct:world` (faucets draw from it, sinks pay into it; it may overdraft by policy — it is bookkeeping, not a person).
- Business balances live on `BusinessState.balanceCents` AND the ledger — a declared mirror, audited like the player's ([05] §2's one-sanctioned-dual-view rule, tested).

## 2. The ledger (the only way money moves)

`EconomyLedger.post({id, tick, day, kind, category, from, to, amountCents, reason, refs?})`:

- **append-only**; `seq` + `tick` give a total order (determinism-tested);
- ids unique (`DUPLICATE_ID` — idempotent money, tested);
- amounts are positive safe integers (`BAD_AMOUNT`);
- **flow classes are honest:** `faucet` must draw FROM `acct:world`; `sink` must pay INTO it; `transfer` must touch NEITHER (`BAD_FLOW`, tested);
- **overdraft refused** unless the account's policy allows it; optional hard `floorCents` (`OVERDRAFT` / `BELOW_FLOOR`, tested).

**The audit law:** every account's balance ≡ genesis + Σ(its transactions). `audit()` proves it; tests run it after every scenario (tested, including the $87 → $74 worked script).

## 3. Faucets & sinks (the closed sets)

| Faucets (money enters the economy) | Sinks (money leaves it) |
|---|---|
| `employment_wage` — pay for hours | `rent` |
| `business_revenue` — customers paying a business* | `food`, `transport`, `goods`, `service` |
| `reward` — legitimate authored rewards | `business_expense` |
| `external_transfer` — remittance, settlement, inheritance | `investment`, `debt_payment` |
|  | `external_loss` |

\* a customer's cup is a `transfer` player→business; `business_revenue` as a faucet names revenue that enters from OUTSIDE the simulated accounts (tourists, the city). The distinction keeps `totalInCirculation()` meaningful.

`flowReport()` nets every category (transfers excluded — they move, they do not create) — the resource-creation/destruction analysis the directive asks for, available from the first transaction. `totalInCirculation()` is the inflation monitor's numerator.

## 4. The worked reference script (evidence-based, shipped prices only)

`REFERENCE_LEDGER_SCRIPT` (`sim/reference.ts`):
1. `$5.00` cup at Rosa's counter → transfer, `business_revenue` (the shipped $5 rush cup, E2E-pinned math);
2. `$10.00` vending-permit filing → sink, `service` (shipped Day 4);
3. `$2.00` Rosa's rule — "on the house for HER is not free" → faucet, `reward` (shipped Day 4 beat).

Result: $87.00 → **$74.00**, audit clean, flow report `faucet +200 / sink −1000` (all tested). When Workstream D bridges the shipped money path, each `Effect('money')` becomes a `post()` with these categories — the game's existing honest math, now traceable.

## 5. Balancing rules (the guardrails, before any economy sim exists)

- **Transaction validation:** §2's gates — no unvalidated money movement can exist.
- **Negative balances:** refused by default; `acct:world` and policy-carrying accounts excepted.
- **Precision:** cents; `dollars()`/`centsOf()` are the only conversions (tested, incl. $15.25 rendering).
- **Update frequency:** money moves on EVENTS (purchases, wages, rent days) — no idle per-tick churn; day boundaries are Workstream D's rent/expense moments.
- **NPC financial constraints:** NpcState.moneyCents is ledger-backed for any npc who transacts; validation refuses negative/unsafe values at the record door ([04]).
- **Business solvency:** `graceTicks` is reserved on BusinessState (0 = must stay solvent every tick); the ENFORCEMENT (close/cut-hours reactions) is Workstream D, after real operating loops exist.
- **Scarcity / inflation:** `flowReport` + `totalInCirculation` are the instruments; no targets are invented here.

## 6. Deliberately deferred (with reasons)

Prices beyond shipped evidence, wages, rent cycles, P&L, price elasticity, banking — **no gameplay loops exist to calibrate them** (directive rule 17). The contract's job is that every future dollar is countable, attributable, and auditable from day one.
