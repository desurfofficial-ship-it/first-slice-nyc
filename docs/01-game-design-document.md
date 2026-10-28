# FIRST SLICE: A New York Story
## Complete Game Design Document — v2.0

<div align="center">

**"Fall in love with New York, one slice at a time."**

*An original mobile life-simulation game for people who have never been to New York City.*

</div>

> **v2.0 changelog — four systems adopted from our companion concept *Saved You a Seat* are now canon:**
> **Map**, the co-newbie companion (§4.0) · the **Three-Layer Landmark** (§4.2) · the **Skyline of Lit Windows** (§6.4) · the **Inverted Loop** — *Someone's First New York* + the Welcome Bench (§6.5).

---

## Table of Contents

1. [Final Title & Tagline](#1-final-title--tagline)
2. [Elevator Pitch](#2-elevator-pitch-written-for-someone-who-has-never-been-to-nyc)
3. [Core Gameplay Loop](#3-core-gameplay-loop)
4. [How the Game Teaches New York to Outsiders](#4-how-the-game-teaches-new-york-to-outsiders)
5. [Unique NYC Events & Systems](#5-unique-nyc-events--systems)
6. [Progression & Long-Term Goals](#6-progression--long-term-goals)
7. [Art Direction Notes](#7-art-direction-notes)
8. [The First 20–30 Minutes](#8-the-first-2030-minutes)
9. [Why This Works for Never-Visitors & Why It Goes Viral](#9-why-this-concept-is-powerful-for-people-who-have-never-visited--why-it-has-strong-viral-potential)

---

## 1. Final Title & Tagline

### Title: **FIRST SLICE — A New York Story**

**Primary Tagline:**
> **"Fall in love with New York, one slice at a time."**

**Alternate taglines (for store A/B testing):**
- *"You've never been. Somehow, it already feels like home."*
- *"Start small. Dream big. The city will teach you."*
- *"Everyone gets a slice of New York. This one's yours."*

### Why this title

- **"Slice"** carries three meanings at once: the iconic New York pizza slice, "a slice of the city" (your own small piece of it), and the first slice of a whole you'll eventually taste. It compresses the entire game fantasy into two words.
- **"First"** frames the player as the newcomer — the outsider — which is the emotional engine of the entire experience. Every player, everywhere on Earth, starts identically at zero.
- **"A New York Story"** signals warmth and narrative rather than management-ledger dryness. It promises that the *story* matters as much as the systems.
- It sounds like a game, not a geography lesson — no "NYC Simulator," no travel-guide energy. It invites rather than educates.

---

## 2. Elevator Pitch (written for someone who has never been to NYC)

> You've seen New York a thousand times without ever going — the yellow taxis, the steam curling up from the streets, the pizza slices bigger than your face, the skyline that means "anything is possible." It's the most famous city on Earth, and if you've never been, it can feel like a place you're not allowed to dream about.
>
> **FIRST SLICE changes that.** It drops you into a warm, colorful, miniature New York — exactly as clueless as you'd really be — with $87 in your pocket, a duffel bag, and a dream. A bodega owner named Rosa takes pity on you and points you to an empty corner. You set up a tiny coffee cart. That's it. That's your whole empire. For now.
>
> From there, the city itself becomes your patient, funny, endlessly generous teacher. Customers teach you how to order ("a regular coffee, milk, two sugars" — that means *small*, and now you know). A subway conductor named Priya teaches you that trains go *uptown* and *downtown*, and that getting lost isn't failing — it's how you find the good stuff. A stray kitten adopts your shop. A rat drags a pizza slice across a subway platform and the whole city films it, and you realize you're witnessing history.
>
> Day by day, five to eight minutes at a time, your little corner grows — cart, then bodega, then café, then a rooftop where the whole neighborhood gathers at sunset. Every session ends with a **postcard**: a beautiful snapshot of the thing you learned or saw that day, captioned and ready to share. Over weeks, your album fills with a New York that is uniquely *yours* — one no other player will ever have, because it's built from your own discoveries.
>
> You will never have set foot in Manhattan. But when it's over, you'll swear you could navigate it — and you'll understand why people sing about it.

**Genre in one line:** A cozy lowpoly life-and-business sim where the city is the mentor, the progression is emotional, and every session produces a shareable memory.

**Comparison shelf (for pitch meetings):** *Animal Crossing: New Horizons* × *Dave the Diver* × *Coffee Talk* — set in a loving miniature of the most photogenic city on Earth.

---

## 3. Core Gameplay Loop

### Design philosophy

The loop is built for the **5–8 minute session**: the commute, the lunch break, the moment before sleep. One in-game day = one real-world sitting, with a natural, emotionally satisfying stopping point (the Postcard) every single time. No energy systems. No punishing clocks. The game wants to be put down and picked up.

### The Daily Loop (~5–8 minutes per in-game day)

```
        ┌─────────────────────────────────────────────┐
        │                                             │
        ▼                                             │
  ☕ MORNING — "Open Up"                              │
  Serve the breakfast rush. Assembly mini-games       │
  (grab, pour, wrap) that are simple to do and        │
  satisfying to master. Every ORDER is a culture      │
  lesson: "regular coffee, two sugars," "chopped      │
  cheese on a hero," "everything bagel, scallion,     │
  toasted." Regulars return; you learn their names.   │
        │                                             │
        ▼                                             │
  🚶 MIDDAY — "Go Explore"                            │
  Free-roam your compact, living neighborhood block.  │
  Talk to characters, trigger discovery quests,       │
  photograph landmarks, hunt hidden "only-in-NY"      │
  micro-moments (a mural, a busker, a stoop sale).    │
  This is the wonder engine of the game.              │
        │                                             │
        ▼                                             │
  🛠️ EVENING — "Build Your Slice"                     │
  Spend earnings: upgrades, stock, décor, recipes.    │
  Chat with regulars → advance friendship stories.    │
  Your physical space visibly improves — growth you   │
  can screenshot.                                     │
        │                                             │
        ▼                                             │
  🌙 NIGHT — "City Wind-Down"                         │
  A slow, atmospheric scene: the subway ride home,    │
  the fire escape, the skyline. One random            │
  "New York Moment" vignette plays (see §5) — and     │
  one far window turns gold: someone felt kept (§6.4).│
        │                                             │
        ▼                                             │
  📮 THE POSTCARD — Session End                       │
  The day's best moment is auto-composed into a       │
  beautiful, captioned, shareable postcard.           │
  "Today you learned: New Yorkers say 'on line.'"     │
  Album grows. Day counter ticks. Tomorrow loads.     │
        │                                             │
        └─────────────────────────────────────────────┘
```

### The Meta Loop (weeks)

Layered around the daily loop, each independently motivating:

1. **The Slice Ladder** — Cart → Bodega → Café → Food Spot → Rooftop. Each stage changes *how* you play, not just how you look.
2. **The Postcard Album** — 100+ postcards across themed sets (Landmarks, Food, Seasons, People, Night). Sets complete into framed collections that decorate your shop.
3. **The City Passport** — one stamp per neighborhood, five boroughs to unlock, each with a Welcome Quest hosted by a local.
4. **The Regulars** — 12–16 friendship story arcs with emotional payoffs, drip-fed one beat per day or two.
5. **New York-ese** — a slang dictionary that fills as you hear words in context. Fluency visibly changes how NPCs talk to you.
6. **Seasons & the City Calendar** — real-feeling seasons, annual events (Manhattanhenge, parades, first snow), each with new postcards and one-time stories.

### Session-shape rules (non-negotiable)

- **No session is wasted.** Even a 3-minute sitting completes a day and yields a postcard.
- **No failure spirals.** A bad sales day is a story ("the rain kept everyone home — Rosa brought you soup"), never a loss of progress.
- **Every session ends on beauty.** The postcard screen is calm, warm, and share-ready. It's the game's signature ritual.

---

## 4. How the Game Teaches New York to Outsiders

### The core rule: **"The city is the tutorial."**

There are no encyclopedia popups, no walls of text, no quizzes. Every piece of New York knowledge is delivered *at the moment it's useful*, by a *character*, inside a *small delightful interaction*. Knowledge is never tested; it's *celebrated*. The design target: the player should feel like the city is being kind to them.

### System 4.0 — Map *(the co-newbie companion — the game's soul made paper)*

Map is a folded paper sheet the player carries from minute one. Map is not a wise guide, not a minigame hub, not a menu with a face. **Map is new here too.** When a local explains something, Map writes it down — in ordinary words, in patient handwriting, in the margins. The player can open Map anytime, and there is never a test on its contents.

**Map's rules:**

- **Feelings first, names second.** Early notes describe moods ("the island of tall evenings," "where the kitchens never end"); names arrive only after the feeling has landed. Map is the delivery vehicle for §4.2's three-layer structure.
- **Map is allowed to be wrong or messy.** It copies the subway lines badly; Priya tells it that's fine. The player should *love* Map, not study it.
- **Curiosity is a button, not a confession.** Glowable moments offer "Tell me" — tapping it makes the explainer *light up with delight*. Wanting to know is always treated as lovely, never as ignorance.
- **Map holds the collections.** The New York-ese dictionary, Story Cards, and caption drafts live "in Map's margins" — one warm paper object instead of six dashboard screens.
- **Map never sighs.** There is no local-who-is-tired-of-tourists in this game. There is a city that likes being someone's first time.

> Implementation note: Map is one reusable paper UI surface, a note-content database, and ~10 trigger types (taught, overheard, tasted, witnessed, offered). v1 spec lives in the Vertical Slice doc (VS-F01).

### System 4.1 — The Regulars *(characters as cultural ambassadors)*

12–16 handcrafted NPCs, each permanently tied to a neighborhood, a food, a sound, and a value. Becoming friends with a Regular *is* a curriculum. Each Regular has a 6–10 beat story arc delivered one beat per session or two.

| Regular | Home | Teaches | Story arc (spoiler-free) |
|---|---|---|---|
| **Rosa** | Washington Heights bodega | Bodega culture, chop cheese, the bodega cat tradition | She's your first friend; her 30th bodega anniversary is a mid-game festival |
| **Samir** | Halal cart, Midtown | Street meat, the platter, feeding the city at 2 AM | Saving for his son's college; the rooftop caters his graduation |
| **Priya** | Subway conductor | The subway, "uptown/downtown," weekend service changes | Wants to see every station; you help her collect station stamps |
| **Mabel** | Harlem jazz singer | Jazz, the Apollo legacy, Sunday mornings | Recording her first album; your rooftop hosts the listening party |
| **Mr. Idris** | Your first regular | Loyalty, the meaning of "regular" | Two sugars, every day, no exceptions — his constancy anchors your early days |
| **Mrs. Chen** | Chinatown grandmother | Dumplings, Lunar New Year, bargains | Teaches you to fold dumplings; her family adopts you at New Year |
| **Darnell** | Harlem courts | Streetball, sneaker culture, summer leagues | The block tournament; you cater the final |
| **José** | FDNY firefighter, Bronx | Firehouses, the Bronx, community dinners | The firehouse chili cook-off needs a judge… |
| **Fatima** | Brooklyn maker | Brownstones, stoop sales, maker markets | Restoring an old storefront into a studio |
| **Eddie** | Staten Island ferry deckhand | The ferry, the harbor, the slow life | His last route before retirement — the game gives him a sendoff |
| **Lena & Odd** | East Village artists | Punk history, murals, vintage | Painting a mural that takes the whole neighborhood to finish |
| **Big Mike** | Queens diner owner | The World's Borough, immigrant food map | His diner's 50th anniversary cookbook — every Regular contributes a recipe |

**Why it works for outsiders:** Nobody explains New York at you. You *care about people*, and the people happen to carry the city. By the time you've finished all arcs, you've absorbed more real NYC culture than any guidebook could deliver — and you did it by caring.

### System 4.2 — Postcard Quests *(landmarks as discoveries)*

Every landmark has a small quest chain that ends with a **postcard** — the game auto-frames a beautiful shot, writes a caption mixing a gentle fact with a warm observation, and files it in your album.

> **Example — Times Square (The Shuffle):**
> Quest: "Deliver Rosa's coffee to a friend 'right in the middle of everything.'" You emerge from the subway into light. The music swells. You learn the *shuffle* — walking through crowds without stopping (a tiny movement mini-game, forgiving by design).
> Postcard caption: *"Times Square — 300,000 people cross here every day. Today, so did you."*

Postcards are **the knowledge delivery system disguised as a reward system**. One gentle fact per card. No card is longer than two sentences. Facts are chosen for "wait, REALLY?" value rather than encyclopedic coverage.

#### The Three-Layer Landmark *(adopted v2.0)*

Every famous place reveals in the same three layers — never all at once:

1. **The Postcard** — what the movies promised. The frame everyone already recognizes.
2. **The Tuesday** — a person who uses it as an ordinary day. Same place, someone locking up, a kid with a balloon.
3. **The Kindness** — the human-scale secret: the good bench, the nurse's deli around the corner, the musician's usual spot.

The Empire State Building arrives as *"the building with the colored crown that changes its mood."* Only after the player has watched the crown change from their own corner does Map add the name. The Statue of Liberty arrives as *"the green friend in the harbor who welcomes people before the city does"* — seen properly from the ferry, not from a checklist. Landmarks are not trivia gates; they are friendships with a skyline.

### System 4.3 — Subway University *(transit as a cozy mechanic)*

The subway is the #1 fear of would-be visitors and the #1 badge of real New Yorkers. The game converts it from intimidating to *cozy*:

- **Guided first rides** with Priya narrating ("Uptown & Queens. That's us. See? You're already reading the map.")
- **Uptown vs. Downtown** is taught as a *direction of your dreams* — uptown is where you came from, downtown is where things are new.
- **"Happy Accident" system:** when you get lost (and you will, gently, on purpose), you never get punished — you *discover*. A hidden record shop. A community garden. The best slice you've ever had. The game's loading-screen philosophy: *"In New York, getting lost is just finding somewhere new."*
- **Weekend Service Changes** appear as a comedic character ("This weekend, the 4/5/6 are all taking a personal day") rather than a frustration.

### System 4.4 — New York-ese *(the slang dictionary)*

A living dictionary that fills in **only when you hear a word in context**. Glowing words in dialogue are tappable; each opens a small card with pronunciation, meaning, and an example.

- Taught gently and positively — slang is presented as a *gift the city gives you*, never a test.
- Your fluency level is visible ("Tourist → New Arrival → Regular → Neighbor → Local") and **NPC dialogue genuinely changes** as you level — by "Neighbor," characters stop over-explaining and start teasing you. The moment Rosa says *"look at you"* is a designed emotional payoff.
- Curated to be warm, not intimidating: *stand on line, the city (means Manhattan), brick (cold), bodega, hero, the 1/2/3, deadass, mad (+ adjective), gucci, off-line, son, W, slit, uptown/downtown, plus-one, flyer, stroller brigade…* (full glossary in the compendium)

### System 4.5 — Food is the Curriculum

Every dish has a **Story Card** unlocked the first time you make or eat it: what it is, who brought it to the city, and one "order like a local" tip.

- **The starter trinity:** regular coffee, bacon-egg-and-cheese, dollar slice
- **The classics:** bagel + lox, chopped cheese, halal platter, egg cream, black & white cookie, hot dog with the works, street corn, knish, pretzel
- **The boroughs:** soup dumplings (Flushing), arepas (Washington Heights/El Barrio), jerk chicken (Bronx/Brooklyn), cannoli (the old neighborhood), birria (Brooklyn), thali (Curry Hill), Yemeni honey cake (Bay Ridge)
- Food is also the **business**: your menu literally grows with your cultural knowledge. The final rooftop menu is a map of everything you've learned, cooked with the Regulars' family recipes.

### System 4.6 — Welcome Committees *(borough entry rituals)*

Unocking a new neighborhood or borough triggers a **Welcome Quest** hosted by a local character — a designed "first day in a new land" ritual that teaches the area's personality through errands, not lectures. Queens' welcome is a world food crawl. Brooklyn's is a stoop sale treasure hunt. The Bronx's is a block party. Staten Island's is — deliberately — the quietest, kindest hour in the game, ending on the ferry at golden hour.

### The "Aha" ledger

Every session's postcard screen shows one line: **"Today you learned…"** — surfacing the single best new thing. Over 30 days, the player's *felt* knowledge compounds: they begin the game unable to order coffee and end it explaining to a friend what a chop cheese is. That visible arc — outsider → insider — is the game's central emotional product.

---

## 5. Unique NYC Events & Systems

Design law for every event: **magical, not overwhelming.** Each event has exactly one "wonder beat" — one frame, line, or sound designed to produce the involuntary *"I wish I could see that."* Events never punish; they invite. Full compendium in [Doc 03](03-events-compendium.md); the signature list:

### 5.1 The Pizza Rat Moment 🐀🍕
A slice slips off your counter at the subway station. A small, magnificent rat drags it down the platform. Everyone films it. You get the postcard: *"You witnessed New York history."* Designed to be the game's first viral screenshot. (Rats elsewhere are ambient and adorable; the game never plays them for disgust.)

### 5.2 The Bodega Cat 🐈
A stray kitten adopts your shop. You name it (the name appears on receipts, postcards, and in dialogue forever). It naps on the counter, "helps" customers, judges your restocking, and has a tiny personality meter shaped by your choices. **The single most merchandisable element of the game.**

### 5.3 Manhattanhenge 🌅
Twice an in-game year, the sunset aligns perfectly with the street grid. The whole city turns amber-gold. Everyone walks into the middle of the street (safely — it's a game) and just… looks. The definitive screenshot moment; the definitive "I'll book the flight someday" trigger.

### 5.4 First Snow ❄️
The first snowfall transforms the entire map overnight: muted audio, warm windows, a snow-day rush for cocoa. The postcard writes itself: *"First snow. The whole city got quieter and kinder at the same time."*

### 5.5 Hydrant Summer 💦
During a heatwave, a neighbor asks if you'll help open the fire hydrant (with the city's blessing — a spray cap, to be accurate). Kids scream with joy through the arc of water; foot traffic to your cart triples. Teaches a real NYC summer ritual.

### 5.6 The Broadway Lottery 🎭
A tiny daily-chance event to win rush tickets. A win triggers a full evening cutscene — the show rendered in gorgeous silhouette with original music — and the postcard: *"Tonight, New York sang."*

### 5.7 Parade Days 🎈
The giant Thanksgiving balloons float *over your street* at rooftop height. Lunar New Year's dragon runs through Chinatown. Pride, the Dominican Day Parade, Carnival — each is a day-long street festival with food, music, and one exclusive postcard.

### 5.8 Subway Buskers 🎻
Musicians perform on platforms and (once unlocked) outside your shop. Hosting a busker changes your shop's music, draws a crowd, and can unlock a Regular. Talent Showcase nights let the whole cast perform on your rooftop.

### 5.9 The "I Got You" System 🤝
Small acts of kindness — carrying a stroller up subway stairs, walking someone to their train, giving a lost tourist directions *that you only know because the game taught you* — feed an invisible **city karma**. It never shows a meter. It returns as luck: the day you're short on stock, a truck driver "happens" to have extras. The game's moral engine: *New York looks out for you when you look out for New York.*

### 5.10 Late-Night Slice Runs 🌙
At 2 AM, a Regular might text: *"You up? Slice run."* The city is empty and glowing. These quiet walks carry the deepest conversations in the game. The night maps are the art team's showcase.

### 5.11 Stoop Sales 🪑
Weekend mornings bring stoop sales — buy weird, wonderful junk, each item with a story, most of which become shop décor. A chipped mug becomes "the mug Mr. Idris refuses to replace."

### 5.12 Game Days ⚾🏀
Yankee wins, Knicks playoff runs: the whole city's mood shifts. Shop traffic, NPC dialogue, and street music change. Endgame: host the watch party on your rooftop.

### 5.13 Ambient Magic (always-on systems)
- **Steam** curls from manholes on cold mornings
- **Streetlight pools** and neon reflections after rain
- **Multilingual street chatter** — overheard snippets reward eavesdroppers with slang cards
- **The Key Jingle** — hearing keys at dawn means the city is opening up; a Pavlovian comfort cue

---

## 6. Progression & Long-Term Goals

### 6.1 The Slice Ladder (business progression)

| Stage | Unlock | Gameplay emphasis | Emotional beat |
|---|---|---|---|
| **1. The Coffee Cart** | Day 1 | Speed, simple orders, learning faces | *"You have a corner now."* |
| **2. The Corner Bodega** | ~Week 3 | Stock, shelves, the cat, Regulars arrive in force | *"You have a door now."* Rosa co-signs the lease — a designed tearjerker |
| **3. The Neighborhood Café** | ~Month 2 | Recipes, ambiance, music, seating | *"People choose to stay."* |
| **4. The Beloved Food Spot** | ~Month 3 | Staff (hired Regulars), menu crafting, food stories | *"The line is out the door — and it's YOUR door."* |
| **5. The Rooftop Hangout** | ~Month 4 | Events, hosting, the whole cast gathers | *"The city has a room with your name on it."* |

Each stage physically rebuilds your corner (visible from the street in every screenshot) and shifts the loop's emphasis, so the game keeps feeling new. **The roof is the endgame social hub** — movie nights, listening parties, game days, and the final block party.

### 6.2 The City Passport (world progression)

Five boroughs, unlocked roughly one per month, each with a Welcome Quest, local Regulars, local ingredients, and one signature landmark set. Boroughs have *personality*, not just palette swaps:

- **Manhattan** (start): the myth — Times Square, Central Park, the village maze
- **Brooklyn**: brownstones, maker culture, the bridge at sunset
- **Queens**: the World's Borough — a food map that spans the planet
- **The Bronx**: hip-hop's birthplace, the Zoo, Yankee days, community pride
- **Staten Island**: the ferry, the harbor, the exhale — the game's calmest region

### 6.3 Collection systems (the completionist layer)

- **Postcard Album:** 100+ postcards, 5 themed sets; completing a set frames it in your shop for visitors to "ooh" at
- **New York-ese Dictionary:** fluency levels change the whole game's dialogue
- **Story Cards:** every dish, mural, bridge, and band
- **The Regulars' arcs:** 12–16 stories, each with a designed emotional payoff event

### 6.4 The Skyline of Lit Windows *(the visible soul — adopted v2.0)*

The game never shows a "score." But from day one, the far skyline shows a scatter of dark windows — and **when someone feels kept — a regular warmed, a kindness landed, a first-timer hosted — a window turns gold.** The player never opens a menu to check progress: they can see it from their cart. Players begin filming their skyline the way people film plants they didn't kill.

- **Every lit window belongs to a person.** The postcard screen occasionally tells you whose it is: *"That one's for the kid who ordered 'whatever's cold.' You were their first warm thing."*
- **It behaves like weather, not a bar.** Windows can flicker before they hold. They never decrement. Dark windows are not failure — they are invitations.
- **The skyline is the share.** Late-game screenshots show a skyline the player can name window by window. The game's deepest flex is *tenderness*.

### 6.5 The Finale Chain & the Inverted Loop *(adopted v2.0)*

Completion still ends with **The Block Party**: the city closes your street, every Regular you've ever met shows up — even Mr. Idris, who orders "the usual" one more time. Rosa hands you something small: a key. *"You kept the door open. Now it's yours."* Postcard: *"Day 365. You came here knowing nobody. Look around."*

But v2 adds what happens *after* belonging — because the thesis was never "you arrived." It's "you keep the light on":

1. **Someone's First New York.** On some evenings after the finale, your corner becomes another newcomer's first magical stop. You watch a fresh player-character hesitate at your counter exactly the way you once did — and you get to be Rosa. You read their postcard about *you*. The loop turns outward: the guest becomes the host.
2. **The Welcome Bench.** The long horizon goal, not a grind wall: a bench facing the green friend in the harbor. You don't write an essay — you choose **three words the city gave you**. New arrivals in the living simulation sit there first, and your three words are the first kind thing they read.

That is the emotional thesis of the entire game, delivered twice: the endgame isn't wealth, and now it isn't even belonging — it's *hospitality*. The long promise, rememberable on a lock screen: **You arrived as a rumor of a person. You leave the light on, so the next stranger can sit.**

### 6.6 Live-game hooks (post-launch)

- **City Whisper:** one new micro-fact daily, read aloud by a rotating Regular
- **Seasonal borough events** tied loosely to real NYC calendar moments
- **Postcard exchange:** send postcards to friends; visiting a friend's shop = seeing their unique corner décor and cat
- **Photo challenges:** weekly community themes ("best steam shot," "your cat's best angle")
- **New story arcs** for Regulars, seasonal menus, and eventually a sixth "borough": the player-built block

---

## 7. Art Direction Notes

### 7.1 Style statement

**Clean, colorful, highly readable lowpoly 3D.** Warm and inviting, never gritty. Chunky, friendly proportions; strong silhouettes readable at thumbnail size; flat-shaded surfaces with soft gradient skies. The reference vibe: "a postcard drawn by someone who loves this city" — not a simulation of it.

### 7.2 The Postcard Warm palette

| Color | Hex | Role |
|---|---|---|
| **Taxi Yellow** | `#F7B32B` | Primary accent — energy, CTAs, the hero color |
| **Brick Red** | `#B23A48` | Secondary — buildings, warmth, heart |
| **Fire-Escape Green** | `#2A9D8F` | Tertiary — details, awnings, calm |
| **Golden-Hour Amber** | `#FFB85C` | The light itself — default time of day |
| **Steam Grey** | `#E8E4DC` | Atmosphere, snow, paper |
| **Dusk Plum** | `#6D4C7D` | Night scenes, shadows with warmth |
| **Bodega Neon** | `#FF6B6B` | Open signs, magic moments — used sparingly |
| **Pizza-Box White** | `#FFF8F0` | UI paper, postcards, backgrounds |

**Sky rule:** every sky is a gradient — peach→periwinkle by day, amber→plum by night. The city is never under a flat sky; the *light* is a character.

### 7.3 Camera & composition

- **Cozy 3/4 isometric** for gameplay — close enough to read faces, wide enough to read the street
- **Vertical-first framing:** every scene must compose in 9:16 as well as it does in landscape (the TikTok law)
- **"Postcard Mode":** when a wonder beat triggers, the camera auto-frames with a gentle letterbox, a title card, and a soft zoom — one tap saves/shares. The game *composes your memories for you.*
- **Two-finger rotate & pinch zoom** — the city is a diorama you can hold
- **The Rule of Steam:** steam, confetti, pigeons, and paper bags animate constantly — the frame is never dead

### 7.4 Light

- Golden-hour bias: the default day state is late afternoon, forever 5:45 PM
- **Streetlight pools** at night — circles of warm light where scenes "live"
- **Neon only as punctuation** — bodega signs, the theater district, a heart on a diner window
- **Manhattanhenge light shafts** down the grid, twice a year — the palette's superpower moment
- **Rain is beautiful here:** wet cobblestones double every light source

### 7.5 UI language

The UI looks like it came **off a bodega shelf**: receipt-paper panels, deli-ticker type (monospace), sticker and washi-tape motifs, hand-drawn marker arrows, price-tag chips. Postcards have real paper grain and deckled edges. Menus sound like delis ("THE USUAL?" is a real button and the most important button in the game).

### 7.6 Audio direction

- A **subway-rumble bass** under everything — the city's heartbeat
- **Neighborhood scoring:** jazz in Harlem, dembow uptown, indie in Brooklyn, strings in Chinatown — music changes as you cross borders
- **Softened sirens** — present, ambient, never alarming
- **Multilingual chatter** — Spanish, Mandarin, Korean, Bengali, ASL pockets; the city sounds like the world
- The **key jingle**, the **espresso hiss**, the **"yo!"** of friends crossing streets

### 7.7 The 1-Second Law

> **Every frame must be readable, beautiful, and identifiable as "New York" within 1 second of a paused TikTok scroll.**

If a scene fails the 1-Second Law, it ships again. This single rule disciplines silhouette design, palette, lighting, and UI simultaneously.

---

## 8. The First 20–30 Minutes

*(Full dialogue script in [Doc 02](02-first-session-walkthrough.md). Design goals: no failure states, no menus before characters, two guaranteed wonder beats, one complete emotional arc — arrival → belonging.)*

| Time | Beat | What happens | Why it's there |
|---|---|---|---|
| **0:00–2:00** | **The Arrival** | An animated bus ride through the countryside becomes a skyline tease on the horizon. Title card. You step off at the terminal with $87, a duffel, and one of six charming starter characters (30-second picker, all delightful). | Establish the fantasy: you're really here. The skyline tease is wonder beat #0 — a promise the game will keep. |
| **2:00–5:00** | **Rosa's Hand** | Rosa, a bodega owner, catches you staring at a map upside-down. She "just happens" to need three things delivered inside her shop — a walking tutorial disguised as kindness. Each item you grab has a fun fact sticker. | First law: **characters teach, not menus.** Rosa is the game's heart; meet her in the first 120 seconds. |
| **5:00–10:00** | **The First Rush** | Morning rush hits Rosa's counter. Five forgiving assembly mini-game orders: regular coffee (learn: "regular means small!"), bacon-egg-and-cheese ("salt, pepper, ketchup?" is a full sentence), "the works." Glowing slang words are tappable. | The core verb (make food for New Yorkers) is learned in 5 minutes, with mastery clearly ahead. Dialogue teaches slang in context. |
| **10:00–15:00** | **The Wow Walk** | Rosa: "Take a coffee to my friend — 'right in the middle of everything.'" A guided walk; you emerge from a subway stair directly into **Times Square in golden hour**. Music swells. Postcard Mode auto-triggers: your first postcard, taken *for* you. You learn the Shuffle (a gentle crowd-walking mini-game). | **Wonder beat #1** — the game's money shot, placed at minute ~12 for maximum retention impact. The first postcard is never taught; it's *experienced*. |
| **15:00–20:00** | **Subway University** | Conductor Priya teaches uptown vs. downtown in one guided ride. The doors open on a busker playing; a "Happy Accident" is seeded (you find a hidden record shop — it'll matter at Week 3). | The #1 newcomer fear (the subway) is converted to coziness inside 5 minutes. |
| **20:00–26:00** | **Your Corner** | Back to Rosa's block. She points at an empty corner: "That one's been waiting for you." You name your cart (the name is forever — receipts, postcards, dialogue). First solo rush: 3 customers. Regular #1 unlocked: **Mr. Idris** — "two sugars. You'll see him tomorrow." | The fantasy fires: *this is YOURS.* Naming = ownership = shareable ("my cart is called 'Big Apple Energy'"). Idris teaches the game's core comfort: *regulars come back.* |
| **26:00–30:00** | **The First Postcard** | Day 1 ends on the fire escape with Rosa's coffee. The day auto-composes: *"Day 1 — $87 → $112. Met: Rosa, Idris. Learned: 'on line.' Tomorrow: the regulars are waiting."* A share button glows softly — never forced. Sunset. Skyline. Fade. | **Wonder beat #2** — the skyline at dusk, alone, with coffee. The session ends on beauty and belonging. The postcard ritual is installed in session one and repeats *every day of the game.* |

**Retention math:** two wonder beats, one ownership moment, one recurring-character hook, and one shareable artifact in 30 minutes — with the next day's promise ("the regulars are waiting") as the return trigger.

---

## 9. Why This Concept Is Powerful for People Who Have Never Visited — and Why It Has Strong Viral Potential

### 9.1 The parasocial city

New York is the only city on Earth with a **global parasocial audience**. Billions of people have deep, specific, *emotional* familiarity with a place they've never been — from sitcoms, from hip-hop, from TikTok, from movies, from the news. That familiarity is an installed tutorial: players instantly recognize taxis, steam, fire escapes, and pizza slices, which means **zero onboarding cost on iconography** and infinite room for *details* to produce revelation ("wait, a chopped cheese is WHAT?").

Every player shares the same starting line. People who've visited get the delight of recognition ("that's SO true"); people who haven't get the thrill of discovery. **Both post about it.** That asymmetry is a built-in social dynamic — the game gives visitors a way to flex insider knowledge and never-visitors a way to finally be in on it.

### 9.2 The emotional engine

The myth of New York is *hope* — the idea that you can arrive as nobody and become yourself. That myth is not American; it's universal, and it's why NYC dominates imagination from Manila to Manchester to São Paulo. FIRST SLICE lets players **live the arrival story safely**: the fear (subway, big crowds) is converted to coziness, the intimidation to warmth. The payoff isn't a high score — it's *belonging*, dramatized in Regulars' arcs and capped by the Block Party finale. Players describe games like this in emotional language, and **emotion is what gets shared, not features.**

### 9.3 The UGC engine (viral by design)

- **The Postcard is the ad.** Every session auto-composes 1–3 beautiful, captioned, vertical-ready artifacts. No screenshot mode needed — the game *produces your social content for you*, with your cart's name and your cat's name in the frame. Every player becomes a travel blogger for a city they've never visited.
- **Meme-native systems:** Pizza Rat, the Bodega Cat, Manhattanhenge, "regular means small" — these are *designed* to be clipped, captioned, and argued about. The game contains its own TikTok trends.
- **The 1-Second Law** guarantees every shared frame lands.
- **Session rhythm mirrors feed rhythm:** 5–8 minute days with a cliffhanger of warmth ("the regulars are waiting") produce the *check-in habit* that fuels content loops.

### 9.4 Market logic

- Cozy/life-sim is one of mobile's strongest and fastest-growing genres, and its audience skews heavily toward players who buy *vibes* and *completion*, not competition.
- The "armchair traveler" market is enormous and underserved: people who spend on travel *dreaming* (guides, vlogs, scratch maps) but not yet flying.
- NYC content reliably performs globally — the city is its own permanent trend.
- The game is **the first to deliver the promise "I know New York without going"** — a claim no current game makes, and an instantly communicable one (the store page *is* the pitch).

### 9.5 The one-line test

Every great viral concept survives compression. This one compresses to a sentence a stranger can repeat:

> **"It's a cozy game where you move to New York without ever leaving your couch — and the city teaches you its ways, one postcard at a time."**

The person who hears that sentence can already picture their postcard. That's the whole game.

---

<div align="center">

### 🗽 Start small. Dream big. The city will teach you.

*FIRST SLICE: A New York Story — v1.0 design document*

</div>
