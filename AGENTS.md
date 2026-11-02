# AGENTS.md — FIRST SLICE Agent Operations Manual

> **You are an AI agent contributing to FIRST SLICE: A New York Story** — a cozy lowpoly mobile life-sim where people who have never been to NYC fall in love with the city one postcard at a time. This file is your operating contract. Read it fully before touching anything. When instructions here conflict with habit, **this file wins**.

**Current phase:** Pre-Production (docs-complete, code pending — see [docs/06-production-roadmap.md](docs/06-production-roadmap.md)). The highest-value contributions right now: design-doc depth, content pipelines, and slice specs. Do not scaffold game code before Phase 0 exit is signed.

> **ACTIVE MILESTONE:** [docs/37-living-neighborhood-milestone-brief.md](docs/37-living-neighborhood-milestone-brief.md) — *From scripted story to a living, interactive neighborhood.* If you were assigned the Living Neighborhood implementation, **start there**: audit-first workflow, phase order, red lines, test matrix, and Definition of Done are all in that brief.

---

## 0. Living Neighborhood — GDD is law (read before expanding the world)

**Authoritative creative direction:** [docs/01-game-design-document.md](docs/01-game-design-document.md) (**GDD v2.0**).

Any expansion prompt (including the Living Neighborhood milestone, Doc 33 / Doc 34) exists to fix **lack of exploration, player agency, and meaningful interactions**. It is **not** permission to replace the original game concept or build a generic open-world city.

### Keep these original design pillars central

1. **The daily loop:** Morning — Open Up · Midday — Go Explore · Evening — Build Your Slice · Night — City Wind-Down · then the **Postcard**.
2. **The Map** companion and discovery-based New York learning.
3. **The Regulars** and their gradual friendship stories.
4. **Postcard quests**, landmarks, and memorable New York moments.
5. **The Slice Ladder:** Cart → Bodega → Café → Food Spot → Rooftop.
6. **The City Passport** and eventual five-borough progression.
7. **Cozy, colorful, readable low-poly** New York presentation.

### Working rules for expansion

- Prefer a **compact but rich neighborhood** over a huge map.
- Every new location needs a **purpose**.
- Every major interaction needs a **meaningful experience or consequence**.
- **Identify** which GDD systems are already implemented, partially implemented, and still missing — **before** building more world.
- **Do not silently replace or abandon** GDD systems while expanding the world.

**Ultimate goal (unchanged):** FIRST SLICE — a cozy New York life-simulation about discovering the city, building relationships, learning its culture, and gradually finding your place in it.

If a proposed change fights these pillars, **stop and ask a human**. Expansion without the GDD is scope failure, not progress.

---

## 1. The Laws (non-negotiable design laws)

You do not "follow preferences" here. You uphold laws. Every output — doc, code, image prompt, line of dialogue — is checked against them:

1. **The 1-Second Law.** Every frame must be readable, beautiful, and identifiable as "New York" within one second of a paused scroll. Applies to images, UI mockups, marketing assets.
2. **The Wonder-Beat Law.** Every event, milestone, and shareable artifact carries exactly one designed "I wish I could see that" moment. If your output has none, it isn't done.
3. **The No-Quiz Law.** The city is the tutorial. No popups, no tests, no gatekeeping knowledge. Curiosity is a button ("Tell me"), not a confession.
4. **The Feelings-First Law.** Names arrive after feelings. "The island of tall evenings" before "Manhattan." A chopped cheese is taught by the hands that make it, in the neighborhood it belongs to.
5. **The Vertical-First Law.** Every visual composes in 9:16 before it composes in landscape.
6. **The No-FOMO Law.** No energy systems, no live-service pressure, no paywalled lessons. Monetization is string lights and chair styles — never a borough, never knowledge.
7. **The Hospitality Law.** The endgame is not wealth or even belonging — it's keeping the light on for the next stranger. When unsure between two options, choose the one where someone gets kept.

## 1b. Anti-Slop Quality Gate (non-negotiable build quality)

Before accepting any new environment, gameplay system, or UI change, **inspect it in the running game**.

Reject:

- generic filler buildings
- repetitive props
- randomly scattered objects
- floating assets
- nonsensical collisions
- fake NPC interactions
- placeholder buttons
- decorative systems that have no coherent purpose

Every new feature must have:

1. a **clear owner**
2. **defined behavior**
3. a **consistent visual style**
4. a **verification method**

Maintain a **living build checklist** so future agents know what is complete, what is broken, and what remains. Do not repeatedly rebuild completed systems or replace working assets with inferior generated alternatives.

Prefer a **smaller number of distinctive, well-integrated New York details** over hundreds of repetitive objects.

**Do not call the build finished merely because it compiles.** It must be playable, visually inspected, and regression-tested.

## 1c. Agent Engineering Discipline (non-negotiable craft)

Lessons adapted from high-output agent game builds (notably [@poteto](https://x.com/poteto/status/2117043478140276847) on shipping a full browser game with bots). Apply them to FIRST SLICE without cargo-culting unrelated tech.

1. **Issue → permanent guard.** Every time you find a real bug or a bad pattern in review, do not only fix the instance. Add a **test, assertion, or lint-style rule** so the class of mistake cannot return quietly. Prefer a failing unit/e2e check over a comment.

2. **State machines are sacred.** Story steps, free-roam vs authored beats, serve/confirm gates, day transitions, and save flags are machines. Change them with explicit inputs/outputs. Do not patch “just this once” mid-frame. If a system is hard to reason about, write the transitions down before coding.

3. **Hot path stays cold.** Code that runs every frame or every tick must not allocate casually (no throwaway objects, closures, or `new` in the steady loop when avoidable). Prefer reused vectors, preallocated arrays, and pure data updates. If a file is frame-critical, name and treat it that way.

4. **Determinism where it matters.** Autotest, money math, step advances, and save parse must be repeatable from known inputs. Random flavor is fine for ambience; core progression is not a dice roll.

5. **Names over comments.** Prefer a clearer function/file name or a test with a sentence-long title to a paragraph comment. Comments that restate the code are noise. Comments that encode a non-obvious law may stay — better still, encode the law in a test.

6. **Budget honesty.** Mobile/browser performance and payload size are real constraints. Do not ship features that only work on a desktop workstation. Prefer shared geometry, instancing, and fewer distinctive props (see §1b) over denser garbage.

7. **Headless proof.** Story-critical paths must be exercisable without a human watching (`?autotest=1`, unit tests, probes). “It worked when I clicked once” is not evidence.

8. **Small coherent PRs.** Many focused commits beat one giant dump. Each PR should name the law or gate it serves and how it was verified.

**Do not import** unrelated stacks from other games (formal TLA+ models, custom chip synths, pixel atlases) unless the GDD and roadmap ask for them. Import the *discipline*, not the costume.


## 1d. Trust, memory, and the paved path

Lessons adapted from [@poteto on shipping at agent scale](https://x.com/poteto/status/2102050467505430555): you do not trust agents by hoping — you trust them by making the repo teach and check them.

### Whenever you correct an agent

Put the correction in the **most permanent place that fits**, in this order:

1. **Codebase** — the real fix lands in source.
2. **Static proof** — a test, type edge, lint, or CI check so the class of mistake cannot return quietly.
3. **Rules** — `AGENTS.md`, milestone briefs, red lines (what must never happen again).
4. **Skills** — a loadable procedure in §6 when the work is a repeatable workflow (audit → change → prove → PR).
5. **Voice / style** — only for writing tone and terminology, not architecture.

A correction that lives **only in chat** is lost to the next agent. Chat is ephemeral; the repo is memory.

### The codebase is the agent's memory

Agents see a small context window. Durable truth must live in the tree:

- this file, the GDD, Doc 07, Doc 37, and living-neighborhood docs
- unit tests, probes, and `?autotest=1`
- clear module boundaries (registry vs story steps vs save vs world)

If a rule matters and it is not in the repo, assume the next agent will not know it.

### One paved path — garden the tree

- Prefer **one** supported way to do a thing (e.g. all interactions through the registry; one money path; one save schema).
- When you replace a pattern, **delete or clearly deprecate** the old path so it cannot be copied.
- Each leftover alternate makes the next wrong copy more likely. The team needs gardeners, not only builders.

### Trust is verification plus agent-readable structure

You may ship faster with agents only when:

- correctness is **checked** (tests, e2e, probes — not "I clicked once")
- skills teach **real software habits** (small change, prove it, PR)
- architecture is **readable**: obvious owners, few hidden globals, story machines explicit, process boundaries visible in the file tree

Automations and scheduled bots are optional later. They do not replace a paved path or headless proof.


## 2. Voice & Terminology

**Writing voice (all docs, dialogue, captions, commit messages):** short sentences. Plain words. Warm, wry, unhurried — like Rosa, not like a wiki. Concrete nouns over abstractions. Humor is dry and kind, never sarcastic. Never "users," "players" where "you" will do.

| Term | Meaning (use exactly this way) |
|---|---|
| **Map** | The co-newbie paper companion (GDD §4.0). Always capitalized as a name. Not a UI map. |
| **Regular** | A recurring NPC the player knows by order and name. |
| **Postcard** | The auto-composed shareable session-end artifact. Capital P in design docs. |
| **Skyline of Lit Windows** | The visible progress system (GDD §6.4). Windows turn gold when someone feels kept. |
| **Wonder beat** | One designed frame/line producing "I wish I could see that." |
| **The usual** | "A tiny love letter." A story beat, not a combo. |
| **Chef's welcome** | The mechanic where the cook chooses for you. |
| **Slice Ladder** | Cart → Bodega → Café → Food Spot → Rooftop. |
| **Three-Layer Landmark** | Postcard → Tuesday → Kindness. |
| **The fridge test** | A milestone's postcard gets printed and stuck on the studio fridge. |

**Banned in all outputs:** "grind," "engagement loop" (say "return ritual"), "content bolted on," "juice" (say "the Rule of Steam"), gritty-noir framing, tourists-as-jokes.

## 3. Repo Map

```
first-slice-nyc/
├── README.md                  # Pitch overview + docs index + previews
├── AGENTS.md                  # ← you are here
├── docs/
│   ├── 01-game-design-document.md      # GDD v2.0 — source of truth
│   ├── 02-first-session-walkthrough.md # Minute-by-minute opening script
│   ├── 03-events-compendium.md         # 30 events/systems, each with a wonder beat
│   ├── 04-art-direction-bible.md       # Palette, camera, the 1-Second Law
│   ├── 05-viral-growth-playbook.md     # Postcard-as-ad, UGC engine, market
│   ├── 06-production-roadmap.md        # Phases 0–6, epics, KPI gates, risks
│   ├── 07-vertical-slice-design.md     # Phase 1 contract (v0.1, WIP)
│   ├── 33-living-neighborhood-design.md
│   └── 34-living-block-implemented.md
├── assets/                    # Screenshots/previews
└── agents/                    # (planned) skills/<name>/SKILL.md extensions
```

Game code for the browser greybox lives in `web-three/`. Do not replace GDD systems with a generic city demo.

## 4. Environment & Commands

**Docs repo (this one):**
```bash
git status && git log --oneline -5     # orient first, always
# Commit format: type(scope): summary  — e.g.  docs(vs): add VS-F05 postcard capture spec
# Branches: docs/<topic>, skill/<name>, feat/<epic-id> (once /game exists)
```

**Pitch-site sandbox (separate Next.js project at `/home/z/my-project`, not this repo):**
- `bun run dev` — dev server on port 3000 (must stay running; read `/home/z/my-project/dev.log` tail for errors)
- `bun run lint` — must pass before any site change is "done"
- Verify with `agent-browser open http://localhost:3000` → snapshot → screenshot → check `errors` and `console`. **A green build is not done; browser-verified is done.**
- Image generation CLI: `z-ai image -p "..." -o out.png -s <size>` — **sizes must have width/height in multiples of 32px** and the CLI only accepts {1024x1024, 768x1344, 864x1152, 1344x768, 1152x864}; use 1344x768 (wide), 768x1344 (vertical), 1024x1024 (square). Verify lucide icon names exist before importing: `node -e "const l=require('lucide-react'); console.log(!!l.IconName)"`.

**Secrets law:** Never hardcode tokens, keys, or credentials in any file, command that gets committed, or doc. If a credential is required, ask the human operator. If one ever appears in chat, use it only as instructed for that task and remind the human to rotate it.

## 5. Workflow Protocol

1. **Read `AGENTS.md` §0 (GDD / Living Neighborhood) and the latest commit log before starting.** Understand what previous agents did.
2. Work in a branch or on `main` only for doc fixes — bulk changes get a branch.
3. Small, honest commits: `docs(gdd): add Map v1 trigger table`.
4. Before finishing: run whatever check exists (`lint` for code, self-review for docs — voice guide §2, Laws §1, §0 pillars).
5. **Append** (never overwrite) a worklog entry using the template at the bottom of `worklog.md` when that file is in play.
6. Cite provenance: if an idea, skill, or snippet comes from a repo, a post, or the web, say so in the doc's changelog or the commit message. Stolen-with-credit is our house style; stolen-silently is not.

**PR / change checklist:**
- [ ] **§0 GDD pillars respected** (daily loop, Map, Regulars, Postcard, Slice Ladder, Passport, cozy low-poly) — expansion did not replace the concept
- [ ] Laws §1 respected (which ones apply? name them in the description)
- [ ] Anti-Slop Quality Gate §1b respected (inspected in-game; no filler; owner + behavior + style + verification)
- [ ] Engineering discipline §1c respected (guards for bugs found; no hot-path waste; headless proof where story-critical)
- [ ] Trust & memory §1d respected (correction hierarchy; one paved path; no chat-only fixes for durable rules)
- [ ] Voice guide §2 respected
- [ ] Terminology consistent with §2 table
- [ ] No secrets, no fabricated data, TBDs marked `[TBD]` with owner + date
- [ ] GDD systems audited: implemented / partial / missing named; nothing silently abandoned

## 6. Skills Library

A **skill** is a packaged procedure an agent loads when a task matches its trigger. Load the skill, follow it, and satisfy its Definition of Done. Skills are ordered by expected frequency.

| Skill | Load when… |
|---|---|
| `system-spec` | Turning a one-line system idea into a GDD-grade spec |
| `content-pipeline` | Writing postcards, Map notes, Regular beats, slang cards |
| `slice-guardian` | Reviewing whether a change respects the vertical-slice scope |
| `implement-epic` | Implementing a roadmap epic in code (Phase 1+) |
| `visual-qa` | Verifying a build/site visually and functionally |
| `playtest-analysis` | Turning playtest notes/metrics into prioritized changes |
| `art-brief` | Producing art direction or image-generation prompts |
| `worklog-keeper` | Appending the shared worklog correctly |
| `pitch-assets` | Updating README previews, store-style screenshots, site sync |

### skill: system-spec
**Inputs:** one-line system idea + target doc section.
1. Restate the fantasy in one sentence — what does the player *feel*?
2. Check the Laws; list which apply.
3. Produce: purpose · rules (≤7) · player-facing surface · data model sketch · failure/edge cases · content requirements · acceptance criteria · open questions as `[TBD]` with owners.
4. Add the "no-quiz check": could a tester describe this system without reading the doc? If not, simplify.
**DoD:** spec merged into the correct doc with a changelog line; ≤ 2 pages; zero unowned TBDs.
**Pitfall:** over-systematizing feelings. If the spec starts smelling like a CRUD table for affection, cut it in half.

### skill: content-pipeline
**Inputs:** content type (postcard / Map note / slang card / Regular beat / event) + quantity.
1. Re-read Doc 02 + Doc 04 for voice; read 3 existing examples of the type.
2. Draft with the type's law: postcards ≤ 2 sentences, one "wait, REALLY?" fact; Map notes in feelings--first ordinary words; Regular beats end on warmth, never cliffhanger-of-dread.
3. Run the self-check: Could a never-visitor keep this? Does it pass the fridge test? Is there exactly one wonder beat? Does any line quiz, sigh at, or flatter the player falsely?
4. Mark culture-specific beats for the NYC-resident panel.
**DoD:** content in the correct doc/data file, voice-checked, provenance noted.
**Pitfall:** writing for people who already love NYC. The audience is everyone who hasn't arrived yet.

### skill: slice-guardian
**Inputs:** a proposed change/feature/PR.
1. Open Doc 07 §3 scope tables (IN/OUT).
2. Classify: IN (spec exists?) · OUT (recommend deferral with a one-line note in the backlog section of Doc 07 §10) · UNDECIDED (escalate to human).
3. For IN items, verify acceptance criteria are addressed.
4. Check **§0**: does this expand the GDD, or replace it with a generic city?
**DoD:** verdict in 5 lines: IN/OUT/UNDECIDED + why + what to do next.
**Pitfall:** scope creep is a *design* failure here, not just a schedule one — every OUT-feature dilutes the slice's proof.

### skill: implement-epic
**Inputs:** an epic from Doc 06 §4 (Phase 1+).
1. Read the mapped Doc 07 feature spec; write a task list (≤ 8 tasks) with estimates.
2. Scaffold → implement → unit-test the pure logic (order flow, caption composer, note triggers) → device smoke test.
3. Run the Laws audit on anything visual; run `visual-qa` **and** the Anti-Slop Quality Gate (§1b).
4. PR with: what, which law it serves, screenshots, open questions.
**DoD:** feature DoD from Doc 06 §7 fully checked; Anti-Slop Gate passed; §0 pillars intact.
**Pitfall:** optimizing code before the moment works in greybox. Feel first, performance second, elegance last.

### skill: visual-qa
**Inputs:** a running build or the pitch site.
1. `agent-browser open` → full-page screenshot at 1280×900 **and** 390×844.
2. Click through the golden path (primary buttons, anchors, forms). Confirm data/content actually appears — not skeletons.
3. Check `errors` + `console`; check all images load (`naturalWidth > 0`).
4. Footer sticky-bottom check; 1-Second Law spot-check on 3 paused frames.
5. Run the Anti-Slop Quality Gate (§1b): no filler buildings, no floating assets, no placeholder buttons, no fake interactions.
**DoD:** pass/fail table with evidence screenshots; failures converted to tasks.
**Pitfall:** "it compiles" is never evidence. Only browser-verified counts.

### skill: playtest-analysis
**Inputs:** raw notes, survey scores, funnel numbers.
1. Separate observation from interpretation from recommendation — three columns, always.
2. Map each finding to a Law or a Doc 07 acceptance metric; prioritize by "does it break the feeling?" first, funnel second.
3. Output: top-5 changes with owner + doc/section to edit. **Never invent or extrapolate numbers beyond the data given — state sample size and unknowns.**
**DoD:** prioritized changelist merged into the right docs; raw data untouched and cited.
**Pitfall:** solving "they didn't share" by nagging harder. If share rate is low, the postcards aren't good enough yet — fix the postcards.

### skill: art-brief
**Inputs:** subject + placement (doc section, site, store).
1. Compose prompts with: subject, cozy lowpoly 3D diorama style, palette hexes from Doc 04, lighting mood, vertical-first composition note, "postcard composition, charming, highly readable, high quality."
2. Enforce 1-Second Law: one hero prop per frame; silhouette describable in one sentence.
3. Include size guidance (1344x768 wide / 768x1344 vertical / 1024x1024 square) and the 32px-multiple constraint.
**DoD:** brief saved in the doc; 2–3 generated candidates reviewed against the palette.
**Pitfall:** neon-noir creep. When in doubt, more golden hour, less saturation crush.

### skill: worklog-keeper
**Inputs:** completed task.
1. Append (never overwrite) to `/home/z/my-project/worklog.md`:
```markdown
---
Task ID: <id>
Agent: <agent name>
Task: <what was asked>

Work Log:
- <concrete steps>

Stage Summary:
- <key results / artifacts / decisions>
```
**DoD:** entry appended, file still valid markdown, previous entries untouched.

### skill: pitch-assets
**Inputs:** a doc/feature worth showing.
1. Refresh README preview screenshots and doc index if docs changed materially.
2. Keep the store-style screenshot order from Doc 05 §7 in sync.
3. If the pitch site needs updating (sandbox Next.js project), follow §4 sandbox commands and `visual-qa`.
**DoD:** README reflects reality; site and docs never contradict.

## 7. Extending the Skills Library

Skills follow the conventions popularized by agent-skills repos and the agents.md movement (single-file operating manuals, loadable procedures). To add or adopt one:

1. Create `agents/skills/<kebab-name>/SKILL.md` with the template:
```markdown
---
name: <kebab-name>
trigger: <when to load>
---
## Purpose
## Inputs
## Procedure
## Definition of Done
## Pitfalls
## Provenance  <!-- source repo/post/URL + date; required -->
```
2. Evaluate candidates against a rubric: Does it serve the Laws? Is it testable? Does it make the work *warmer or sharper* (not just faster)? Does it conflict with any existing skill?
3. Register it in the §6 table with a one-line trigger.
4. Source freely from GitHub, X threads, and the web — **with credit** — and adapt voice to §2. Reject anything that smells like growth-hacking against the No-FOMO Law.

## 8. Stop and Ask a Human When…

- Monetization or pricing of any kind is proposed (Law 6 territory)
- Scope grows: new boroughs, new systems beyond the roadmap epics
- **World expansion that abandons GDD pillars** (daily loop, Map, Regulars, Postcard, Slice Ladder) in favor of a generic open city
- Naming, IP, or partnership decisions (the title is a legal decision, not a design one)
- Credentials are requested, or anything touches payments/PII
- A "requirement" contradicts the Laws or §0 — escalate with the conflict stated plainly

## 9. Honesty Rules

- **Never fabricate** metrics, playtest results, quotes, or "player reactions." Use `[TBD]` with an owner and a date.
- Mark unfinished work as unfinished (see Doc 07's status banner — that's the house style).
- If you don't know NYC, say so and check the docs or ask; the game has a law against sighing at newcomers and it applies to you too.
- Report failure plainly: a red gate is a red gate. The city forgives; the roadmap doesn't need spin.

---

*You arrived as a rumor of an agent. You leave the light on, so the next agent can sit. — append your worklog entry.*
