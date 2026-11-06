# 11 — Content & Asset Contract

| | |
|---|---|
| Status | Adopted — schema + validation implemented (`sim/content.ts`), tested against the real ABO pack |
| Precedent | the furniture costume law (docs/57 lineage): a missing asset keeps the procedural look — one `console.info`, no retries |

## 1. Identity

Every asset carries a **content id**: `content:<local>` (sim grammar) or a registry-style id for built-in canon props. Ids are permanent; new entries append. The shipped precedent stays canonical: furniture slots (`web-three/src/world/furniture.ts`) are id-stable seams already pinned by test.

## 2. Manifest entries

```ts
ContentEntry { id, kind, label, tags[], source, license?, attribution? }
ContentKind  = building_variant | interior_kit | furniture | street_prop
             | vehicle | clothing | character_look | interactive_object
             | audio | texture_atlas        // closed set — extend WITH a test
ContentSource = { type: 'glb', path }      // repo-relative file
              | { type: 'procedural', builder }  // code-built, always exists
              | { type: 'atlas', path }
```

## 3. Validation (implemented, tested)

`validateManifest(entries)` enforces, per entry:
1. **id law** — sim or registry grammar (`BAD_ID`);
2. **closed kinds** (`BAD_KIND`);
3. **path safety** — repo-relative, no `..`, no backslashes, known media suffix (`BAD_PATH`);
4. **duplicate detection** (`DUPLICATE` — short-circuits at the id gate);
5. **license duty** — every `glb` entry carries its license line (`MISSING_LICENSE`); the CC-BY-4.0 credit travels WITH the asset (AGENTS.md §3's law, now enforced).

## 4. The ABO furniture pack speaks the contract (tested)

`furniturePackToEntries` converts `docs/data/abo-curated.json` (141 rows, every one carrying `repo_path` — the discoverability law) into a valid manifest. Pinned by tests: 141 entries, all `repo_path` present, all converted paths under `assets/furniture/`, all licenses CC-BY-4.0 with attribution, JSON round-trip safe. The pack is therefore queryable and validatable by the same rules as every future content drop — Workstream E inherits a working door, not a new schema.

## 5. Loading responsibilities (contract; machinery already ships)

| Layer | Owns |
|---|---|
| Manifest | discovery + validation (this contract) |
| Loader (`World.upgradePropWithGLB` / `upgradeFurnitureWithGLB`) | fetch, decode (meshopt/KTX2), costume-law fallback |
| Builder (World interiors) | colliders — NEVER imported from a GLB |
| Tests | byte-identity of shipped slots, manifest validity |

## 6. Missing-content handling (the costume law, restated as contract)

An entity references content that fails to load ⇒ the PLACEHOLDER ships: the procedural room, the placeholder fixture, the palette look. One info line, no retry loops, no broken scene, no gameplay-bearing change (colliders are authored). A manifest may therefore over-promise safely — but validators still catch structural lies (bad ids/paths) BEFORE the network is involved.

## 7. What this contract does NOT do

No asset library is built here (directive rule 8; Workstream E's product). No new assets added. No texture/LOD policy beyond what ships (`lod1` meshopt+KTX2, ~300 KB median, floor at Y=0 — docs/57). The vocabulary above is the whole deliverable, and it is load-bearing: `sim/content.ts` is importable today by any future content agent.
