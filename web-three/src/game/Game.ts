/**
 * Game orchestrator — the browser port of the original greybox (docs/23–24).
 * Owns the render loop, applies GameState effects to the world/UI, and runs
 * the authored sequences (dusk, gold window, postcard rig, day transitions).
 * Authoritative state lives in GameState; nothing gameplay-bearing is stored
 * in the scene graph.
 */

import * as THREE from 'three';
import { GameState, Step, START_MONEY, cityWillWaitFires, inShuffleStretch, type Effect } from '../core/GameState';
import { composeCaption, tsWowCaption, MAP_NOTE_BOOT, LINGER_OBJECTIVE, DAY_DONE_OBJECTIVE,
  D3_ORDERS, D4_ORDERS, BREWING_NOTE, STOOL_OFFER_NOTE, STOOL_UP_NOTE, D3_GOLDEN_NOTE,
  D3_CLIMB_NOTE, DAY3_BEGIN_NOTE, D4_GOLDEN_NOTE, D4_CLIMB_NOTE, DAY4_BEGIN_NOTE,
  D4_STRANGER_ONHOUSE_NOTE, D4_STRANGER_WATCH_NOTE, D4_STRANGER_DEPART_NOTE,
  D4_KID_APRON_NOTE, D4_APRON_CLEAN_NOTE, FAMILIAR_NOD_NOTE, FAMILIAR_WORD_NOTE,
  RUSH_CARDS, SOLO_CARDS, GOLD_WINDOW_NOTE, LIGHTS_OUT_NOTE, WATER_TOWERS_NOTE,
  MAP_PLACES, MAP_PLACE_NOTICE_R, CITY_WILL_WAIT_NOTE, MAP_COPIED_NOTE, RIDE_END_NOTE,
  RUSH_NOTE_5, MOMENT_RUSH_CAPTION, MOMENT_TOWERS_CAPTION, MOMENT_FOLD_CAPTION,
  momentCornerCaption, MOMENT_TAGS, type MomentCardKind,
} from '../core/content';
import { loadSave, writeSave, wipeSave, newGameSave, type SaveData } from '../core/Save';
import { FreeRoam, roamDiscoveryLine, ROAM_OBJECTIVE } from './freeroam';
import { WorldRuntime } from './worldRuntime';
import { STARTERS, starterById, isStarterId, DEFAULT_STARTER } from '../core/starters';
import { PAL } from '../core/palette';
import { World, phys } from '../world/World';
import { Player, lerpAngle } from '../player/Player';
import { GameCamera } from '../camera/GameCamera';
import { InputManager } from '../engine/Input';
import { Tweens, type Tween } from '../engine/tweens';
import { capsuleInBox, moveAxisX, moveAxisZ, type Capsule } from '../engine/collide';
import { UI } from '../ui/UI';
import { Wardrobe, wardrobeDecision } from '../ui/Wardrobe';
import { capturePostcard, downloadPostcard, canShareFiles, sharePostcard } from '../postcard/PostcardCapture';
import { addToAlbum, entryId, loadAlbum, makeThumb, storeAlbum, type AlbumEntry } from '../postcard/Album';
import { updatePersonAnim, buildStarterSkateboard, type PersonRig } from '../world/personRig';
import { FAMILIAR_SPEED, familiarBeatForDay } from '../world/dressing';
import { InteractionRegistry, NEVER_NEAR, type InteractionCtx } from './interactions';
import { buildInteractions, byDay, BUS_BENCH_SEAT, PARK_BENCH_SEAT } from './interactionDefs';
import { worldPaused } from './pauseSet';
import { BENCH_SIT_NOTES, PARK_SIT_NOTES, FREE_WASH_NOTES } from '../core/content';
import { gameAudio } from './audio';
import { ArrivalCinematic } from './arrival';
import { RIDE_BEAT_TEXT, TS_SYNC_NOTE } from '../core/content';
import { CourtGame } from '../court/CourtGame';

/** One waypoint on the familiar face's daily walk. dwell = seconds she
 *  stands there (the nod, the word); sit/hide = what happens on arrival. */
interface FamiliarStop { x: number; z: number; dwell?: number; sit?: boolean; hide?: boolean; note?: string }

/** The bodega shelf's three stock spots — the Day-1 errand picks from these,
 *  and the morning restock puts them back (the shop is open every day). */
const SHELF_STOCK: Array<[id: string, x: number, y: number, z: number]> = [
  ['mango', -18, 2.25, 19.2],
  ['coffee', -16, 2.25, 19.2],
  ['bread', -14, 2.25, 19.2],
];

export class Game {
  readonly state = new GameState();
  readonly world = new World();
  readonly player: Player;
  readonly cam: GameCamera;
  readonly input: InputManager;
  readonly ui: UI;
  /** The 3D fitting room (ui/Wardrobe.ts) — the pick-is-for-keeps law's UI. */
  readonly wardrobe: Wardrobe;
  readonly tweens = new Tweens();

  private renderer: THREE.WebGLRenderer;
  /** The player's articulated visual — public for the test harness. Reassigned
   *  by applyStarter (Doc 02 six starters): same boxes, a new face. */
  playerVisual: THREE.Group;
  readonly cupProp: THREE.Object3D;
  /** The customer at the cart — public for the E2E harness (bubble check). */
  customer: THREE.Group | null = null;
  private rosaBroom: THREE.Group | null = null;
  /** Everyone with a rig — one animator pass per frame (walk/idle/climb/sweep). */
  private readonly cast: THREE.Group[] = [];

  private dayFading = false;
  /** The save's day at boot — 1 for a fresh start. Read-once, never mutated:
   *  lets the E2E driver know the session resumed, even while beginDay's
   *  fade is still holding s.day at its default. */
  readonly bootedFromDay: number;
  private duskStarted = false;
  /** Boot-shape flags (Doc 02 starters): a driver/probe boot and a film-
   *  requested boot never see the pick card — only humans on the film path
   *  choose a face. ?starter=<id> dresses the walker directly. */
  private driverBoot = false;
  private filmRequested = false;
  /** ?pickcard=1 — the pick-card harness hatch (same law as ?film=1: the
   *  driver asks for it explicitly). Forces the offer at the film handover
   *  so evidence probes can tap the tiles. */
  private forcePickCard = false;
  /** The pick card has been offered this session (offer once, never nag). */
  private starterOffered = false;
  private postcardRig = false;
  /** The Wow card (docs/51 B10) is open — the panel currently shows the
   *  sync beat's keepsake, NOT the day-end card. Dismissal takes the light
   *  path: the story machine stays sacred. */
  private wowPostcard = false;
  private rosaWalking = false;
  private idrisWalking = false;
  /** Gold chevron floating over whoever the objective says to follow. */
  private waypoint: THREE.Sprite | null = null;
  private roofHidden = false;
  private climbLean = 0;
  /** Scratch capsule for the kid's follow-walk — reused, never allocated
   *  per frame (his physical body against the world's colliders). */
  private readonly kidCapsule: Capsule = { x: 0, y: 0.05, z: 0, radius: 0.25, height: 1.4 };
  private checkpoint = { x: -30, y: 0.05, z: 6.2 };
  private lastPostcardUrl: string | null = null;
  private lastPostcardKind: 'day' | 'wow' = 'day';
  private lastPostcardCaption = '';
  /** The shelf tag a Keep will file under ("THE SQUARE", "THE RUSH"…) —
   *  moment cards carry their own name on the album shelf. */
  private lastPostcardTag: string | undefined = undefined;
  /** The album shelf (the GDD's postcard ask): kept cards survive the tab;
   *  the full-size paper of THIS session rides memory for re-prints. */
  private album: AlbumEntry[] = [];
  private readonly sessionFull = new Map<string, string>();

  private wasInL1 = false;
  private wasInL2 = false;
  private ladderHintPending = false;
  private wasInsideBodega = false;
  private reachedTopFired = false;
  private idrisWalkStarted = false;
  private goldDebugFired = false;
  private brewTimer = 0;
  private brewingNoteShown = false;
  private washTimer = 0;

  // ---- the Roam layer (freeroam.ts — the open-block contract) ----
  // The story is the spine; roam is the promise that the city runs on the
  // player's clock. The module holds the law, Game holds the levers: the
  // barrier stands down, the objective line relaxes, the idle nudge rests.
  // GameState is never touched — a roam session can neither advance nor
  // rewind the story.
  readonly roam = new FreeRoam();

  // ---- the world runtime (sim/runtime.ts + game/worldRuntime.ts) ----
  // Phase-1 runtime integration (world-contract doc 17): ONE world, ONE
  // clock, ONE arbitration. The brain ticks every frame (the D-1 valve);
  // in roam/scenario it also owns the bound bodies (Rosa, Idris) and keys
  // the dusk visuals + M4 street plan to the clock. In story mode the
  // authored choreography keeps every body it ever had — the sim runs
  // beside, never instead.
  readonly worldSim: WorldRuntime;

  // ---- notes don't stampede (docs/12: the city is patient) ----
  // Two notes arriving together queue instead of replacing: Rosa's quiet
  // line gets its two seconds before the rush-end note lands.
  private noteAge = 999;
  private noteQueue: string[] = [];
  /** A note holds the toast this long before the next may replace it. */
  private static readonly NOTE_MIN_SHOW = 2.4;
  private mapOpen = false;
  private mapKeyWasDown = false;
  private wardrobeKeyWasDown = false;

  // ---- the street performer's listen (Doc 02 §10:00–15:00) ----
  // Once per session: after the square has synced, stepping back to the B
  // stair mouth slows the world (×0.45) for LISTEN_SECONDS while a melody
  // plays. listenT < 0 = never armed; listenDone = the one shot is spent.
  private static readonly LISTEN_SECONDS = 4.0;
  private listenT = -1;
  private listenDone = false;

  // ---- the familiar face (Doc 33 §2.2): one waypoint walk per day ----
  private familiarPath: FamiliarStop[] = [];
  private familiarNode = 0;
  private familiarPausing = 0;

  // postcard rig tween targets (mutated by tweens, read by the camera)
  private rigPos = { x: 0, y: 0, z: 0 };
  private rigLook = { x: 0, y: 0, z: 0 };

  /** Every pressable thing, declared once (Doc 37 §3B). Authored beats and
   *  the free-roam set live side by side in one registry; nothing is wired
   *  by scattered checks in this loop anymore. Public for the E2E/probe
   *  harnesses. */
  readonly registry = new InteractionRegistry();
  /** The Doc 02 opening — fresh boots ride the bus in (see arrival.ts).
   *  Autotest/probe boots skip it; saves resume without it. */
  readonly arrival: ArrivalCinematic;
  private readonly ictx: InteractionCtx;
  /** The half-court (docs/49) — pickup, dribble, hold-to-shoot, flight,
   *  the chalk tally. The old scripted shot lives here now as a game. */
  readonly court: CourtGame;
  private lastTime = performance.now();
  private running = true;
  private autotestStarted = false;
  private scenarioStarted = false;

  constructor(container: HTMLElement) {
    // the places the first session guarantees: the terminal you woke up on,
    // the corner you work. revealPlace dedups, so a resumed save's own
    // list (loaded later) simply keeps its order.
    for (const p of MAP_PLACES) if (p.born) this.state.revealPlace(p.id);
    // ---------------- renderer ----------------
    // ?fx=off — test affordance for slow/software-GL machines: the shadow
    // pass is over half the frame cost under SwiftShader (probe-shadow-cost:
    // 21 → 46 fps), and a clamped dt stretches the four-day E2E driver past
    // every timeout. Shadows carry no gameplay state; the visual checks
    // (visual-check.mjs) keep full fx so screenshots stay faithful.
    const fxOff = new URLSearchParams(location.search).get('fx') === 'off';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = !fxOff;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping; // closest to the reference's filmic
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // ABO furniture (docs/57): the KTX2/meshopt decoders need the renderer
    // for the transcoder's format probe — wired here, once, and the
    // interior slots fetch their models. Missing files keep the procedural
    // rooms (the docs/28 seam law — the game never depends on its assets).
    // (Restored: the player-merge cherry-pick dropped this line and the
    // swap went silently dead — the unit gates never boot a renderer.)
    this.world.configureGltfDecoders(this.renderer);

    // ---------------- systems ----------------
    this.player = new Player(this.world.colliders);
    this.cam = new GameCamera(window.innerWidth / window.innerHeight, this.world.colliders, this.world.canopySpheres());
    // the camera reports which canopies block its sight line; the world
    // fades those canopies so the street never hides the player.
    // setCanopies re-binds if World ever grows more trees after boot (B6).
    this.world.canopyOcclusion = this.cam.setCanopies(this.world.canopySpheres());
    this.ui = new UI();
    this.input = new InputManager({
      joyZone: document.getElementById('joy-zone')!,
      joyBase: document.getElementById('joy-base')!,
      joyStick: document.getElementById('joy-stick')!,
      btnInteract: document.getElementById('btn-interact')!,
      turnL: document.getElementById('turn-left')!,
      turnR: document.getElementById('turn-right')!,
    });

    // ---------------- the wardrobe (the fitting room) ----------------------
    // The lock law renders here: looking is free, wearing a different face
    // is a new game. Game owns the verdict; the wardrobe is the paper.
    this.wardrobe = new Wardrobe({
      onSwitchRequest: (id) => this.wardrobeSwitchRequest(id),
      onNewGame: (id) => this.beginNewGameAs(id),
      onClose: () => this.toggleWardrobe(),
    });
    this.ui.onWardrobeToggle = () => this.toggleWardrobe();

    // ---------------- player visual (a person who WALKS) -------------------
    // Playtest 2026-10-29, round two: "the characters doesn't walk, they
    // move." The rig (hip/shoulder pivots + walk cycle in personRig.ts) is
    // the visual now; the old runtime swap to static GLB mannequins is gone —
    // those exports carry zero animations and the swap also orphaned the
    // coffee cup (applyGlb's clear() detached it, so the Day-2 cup in hand
    // was invisible).
    this.playerVisual = this.world.buildPerson({
      jacket: PAL.gold, pants: PAL.ink, skin: 0xd9a06b, hair: PAL.ink, style: 'flat',
      // character-quality pass: cream sneakers + a messenger strap — same
      // boxes, but the silhouette now reads "everyday NY courier" instead
      // of "gold rectangle", and he is recognizable from any angle
      shoe: 0xece5d8, strap: 0x6e4a2f,
    });
    this.playerVisual.name = 'Player';
    this.cast.push(this.playerVisual);
    const cupBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.06, 0.17, 10),
      new THREE.MeshLambertMaterial({ color: PAL.cream }),
    );
    const cupSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.065, 0.075, 10),
      new THREE.MeshLambertMaterial({ color: 0xb5654a }),
    );
    cupSleeve.position.y = 0.01;
    const cupLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.078, 0.03, 10),
      new THREE.MeshLambertMaterial({ color: PAL.teal }),
    );
    cupLid.position.y = 0.1;
    const cup = new THREE.Group();
    cup.add(cupBody, cupSleeve, cupLid);
    cup.position.set(0.44, 0.9, 0.22); // in the right hand
    cup.visible = false;
    this.cupProp = cup;
    this.playerVisual.add(cup);
    this.world.scene.add(this.playerVisual);

    this.cast.push(this.world.rosa, this.world.idris, this.world.kidSil, this.world.kidGround, this.world.stranger);
    this.cast.push(this.world.sal); // Sal breathes at his counter, every day
    this.cast.push(this.world.familiar); // the familiar face breathes between her rounds

    // Expose instance for React HUD integration
    (window as any).__game = this;

    // ---------------- interactions (Doc 37 §3B — one registry) -------------
    // Authored beats + the free-roam set, declared once in interactionDefs.
    // The old four-place wiring (array + isRelevant + promptVerb + a switch)
    // is folded into per-interaction records.
    this.ictx = { state: this.state, game: this };
    this.arrival = new ArrivalCinematic({
      scene: this.world.scene,
      tweens: this.tweens,
      ui: this.ui,
      cam: this.cam,
      rigPos: this.rigPos,
      rigLook: this.rigLook,
      player: this.player,
      playerVisual: this.playerVisual,
      rosa: this.world.rosa,
      buildPerson: (o) => this.world.buildPerson(o),
      onHandover: () => this.onArrivalHandover(),
    });
    this.registry.register(...buildInteractions({
      rosa: () => this.world.rosa.position,
      idris: () => this.world.idris.position,
      kid: () => this.world.kidGround.position,
      stranger: () => this.world.stranger.position,
      cart: () => this.world.cartRoot.position,
      shelfItem: (id) => this.world.itemMeshes.get(id)?.position ?? NEVER_NEAR,
      walker: (i) => this.world.walkerPos(i), // Phase 4 — live walker positions
      worldSimBody: (id) => this.worldSim.bodyPos(id) ?? NEVER_NEAR, // sim-driven bodies
    }));
    this.world.addItem('mango', -18, 2.25, 19.2, PAL.amber);
    this.world.addItem('coffee', -16, 2.25, 19.2, PAL.teal);
    this.world.addItem('bread', -14, 2.25, 19.2, PAL.cream);

    // ---------------- the half-court (docs/49) ----------------
    // The world built the visuals (paint, net, fence, tally); the court
    // game owns the loop. One wiring, one owner.
    this.court = new CourtGame({
      ball: this.world.ball,
      ui: this.ui,
      state: this.state,
      net: this.world.courtNet,
      tally: this.world.courtTally,
      camera: this.cam.camera,
      weaves: this.world.courtWeaves,
    });

    // ---------------- the world runtime (Phase-1 integration) ----------------
    // One world beside the story (doc 02 D1). The valve reads
    // ?worldclock=<sim-min per real-sec> (default 60 — one in-game minute
    // per real second); the world save rides its own storage key. The
    // hello interactions registered above read live body positions
    // through the lazy src closure.
    this.worldSim = new WorldRuntime(this, (() => {
      const q = Number(new URLSearchParams(location.search).get('worldclock'));
      return { timeScale: Number.isFinite(q) && q > 0 && q <= 1440 ? q : undefined };
    })());

    // ---------------- boot (main.gd `_ready`) ----------------
    const save = loadSave();
    this.bootedFromDay = save.day;
    if (save.day >= 2) {
      // the face rides the save (Doc 02 starters): a returning player wakes
      // up as whoever got off the bus
      if (isStarterId(save.starter)) {
        this.state.starterId = save.starter!;
        this.applyStarter(save.starter!, false);
      }
      void this.beginDay(save.day, save, save.day_complete || save.replay).then(() => {
        // the mode rides the save (Save.roam): a Day-2+ boot that went to
        // bed mid-roam wakes up mid-roam — silently, no toast on boot
        if (save.roam === true) {
          this.roam.enter();
          this.world.setBarrierOpen(true);
          this.ui.setRoamLabel(true);
          this.ui.setObjective(ROAM_OBJECTIVE);
        }
      });
    } else {
      this.state.money = START_MONEY;
      this.state.dayStartMoney = START_MONEY;
      this.state.setStep(Step.MEET_ROSA);
      this.world.dressDay(1); // Day 1 is dressed by construction defaults; this makes it honest
      this.ui.setMoneyQuiet(this.state.money);
      const params = new URLSearchParams(location.search);
      // ?starter=<id> — the harness's direct dress: apply (and persist) with
      // no card, so drivers can test any face without tapping one
      const qStarter = params.get('starter');
      if (isStarterId(qStarter)) this.applyStarter(qStarter!, true);
      else if (isStarterId(save.starter)) this.applyStarter(save.starter!, false);
      // Headless drivers skip the film — same rules, same street, and the
      // SAME default camera yaw: the probes drive the walker with a
      // hard-coded input convention calibrated to camYaw 0. Two honest
      // signals: the documented ?autotest/?probe params, and
      // navigator.webdriver — every Playwright driver boots with it true,
      // and most of the probe fleet (probe-subway, probe-solid, the W1–W5
      // ghosts…) hits the ROOT url with no params at all. The film is for
      // humans; a driver getting a 13 s cinematic that owns the input and
      // repositions the walker mid-probe would invalidate the fleet.
      const isDriver = (navigator as { webdriver?: boolean }).webdriver === true;
      this.driverBoot = isDriver
        || params.has('autotest') || params.has('probe');
      // ?film=1 is the film's own driver escape hatch: the film's evidence
      // probes run under Playwright AND need the film — they ask for it
      // explicitly, the way any future harness will.
      this.filmRequested = params.has('film');
      this.forcePickCard = params.has('pickcard');
      if (this.driverBoot && !this.filmRequested) {
        this.ui.showNote(MAP_NOTE_BOOT);
      } else {
        // the arrival — Doc 02's opening, staged on the terminal coach
        this.arrival.begin();
      }
    }
    this.ui.onNameSubmit = () => this.confirmName(this.ui.nameInput.value);
    this.ui.onStarterPick = (id) => {
      this.applyStarter(id, true);
      this.ui.closeStarterPick();
      this.ui.showNote('There you are. Now the story has a face.');
    };
    this.ui.onCineTap = () => { if (this.arrival.active) this.arrival.tap(); };
    this.ui.onCineSkip = () => { if (this.arrival.active) this.arrival.skip(); };
    this.ui.onOrderChoose = (reply) => this.advanceOrder(reply);
    this.ui.onMapToggle = () => this.toggleMap();
    this.ui.onRoamToggle = () => this.toggleRoam();
    this.ui.postcardKeep.addEventListener('click', () => {
      if (!this.lastPostcardUrl) return;
      downloadPostcard(this.lastPostcardUrl, this.postcardFilename());
      void this.fileAlbumCard(); // keep = a download copy AND paper on the shelf
    });
    this.ui.postcardStay.addEventListener('click', () => this.dismissPostcard());
    this.ui.onPostcardShare = () => void this.shareCurrentPostcard();
    this.ui.onAlbumToggle = () => this.toggleAlbum();
    this.ui.onAlbumPick = (id) => this.pickFromAlbum(id);
    // the shelf loads before the first day does — kept paper survives the
    // tab, the reload, the week; the share button exists only where the
    // platform sheet can take the file (honest capability, not theater)
    this.album = loadAlbum();
    this.ui.setAlbumCount(this.album.length);
    this.ui.setShareVisible(canShareFiles());

    // ---------------- events ----------------
    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.running = false;
      else { this.running = true; this.lastTime = performance.now(); }
    });
    window.addEventListener('error', (e) => {
      this.ui.showError(`Something spilled. ${e.message}`);
    });

    this.ui.setObjective(this.state.objectiveText());
    this.ui.setBeatMarker(this.state.beatPlaceId());
    this.cam.snapBehind({ x: this.player.capsule.x, y: this.player.capsule.y, z: this.player.capsule.z });

    // ---------------- loop ----------------
    const loop = () => {
      requestAnimationFrame(loop);
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.frame(dt);
    };
    requestAnimationFrame(loop);

    this.ui.dismissLoading();
    if (!this.arrival.active) this.ui.showGame(); // the arrival shows it at the handover

    // debug/E2E handle
    (window as unknown as { __game: Game }).__game = this;

    // E2E driver (mirrors the original headless autotest) — ?autotest=1
    if (new URLSearchParams(location.search).has('autotest') && !this.autotestStarted) {
      this.autotestStarted = true;
      void import('./autotest').then(({ runAutotest }) => runAutotest(this));
    }

    // the runtime-integration scenario (?scenario=schedules) — the Phase-1
    // playable proof: six demonstrations on the real street, accelerated
    // time, results streamed to window.__SCENARIO_REPORT__
    const scenarioParams = new URLSearchParams(location.search);
    if (scenarioParams.has('scenario') && !this.scenarioStarted) {
      this.scenarioStarted = true;
      void import('./scenario').then(({ runScenario }) => runScenario(this, scenarioParams));
    }
  }

  // ------------------------------------------------------------------ frame

  private frame(dt: number): void {
    const s = this.state;

    // Doc 02 §10:00–15:00 — the street performer's listen: once, on the way
    // back from the square, the city slows for four seconds and just plays.
    // The world breathes at 0.45×; your feet, the paper and the camera keep
    // honest time. No objective. No prompt. Just the city.
    const listening = this.listenT >= 0 && this.listenT < Game.LISTEN_SECONDS;
    const wdt = listening ? dt * 0.45 : dt;
    if (this.listenT >= 0) this.listenT += dt;

    this.tweens.update(dt);
    // the arrival rides its own clock while active (machine, strip, phases)
    if (this.arrival.active) this.arrival.frame(dt);
    // the D-1 valve — the sim hears FULL dt (the listen beat's 0.45× is
    // presentation only; doc 06 §1: the sim hears only ticks). Pauses are
    // the host's set, written once in game/pauseSet.ts (WP-1v): the film,
    // a day fade, held UI (name/order/starter), and — closed by WP-1v —
    // the wardrobe fitting room and a held postcard stop the clock
    // politely. The Map deliberately does NOT pause the world (the
    // notebook is always available; the city keeps breathing).
    this.worldSim.update(dt, worldPaused({
      arrivalActive: this.arrival.active,
      dayFading: this.dayFading,
      nameBoxOpen: !this.ui.nameBox.hidden,
      orderCardOpen: !this.ui.orderCard.hidden,
      starterCardOpen: !this.ui.starterCard.hidden,
      wardrobeOpen: this.wardrobe.isOpen,
      postcardOpen: !this.ui.postcardPanel.hidden,
    }));
    const inp = this.input.sample();

    if (this.arrival.active) {
      // the film owns the input: taps advance it, everything else waits
      if (inp.interactPressed) this.arrival.tap();
      if (inp.restartPressed) this.arrival.skip();
    } else if (inp.restartPressed && !this.dayFading && this.ui.nameBox.hidden
      && this.ui.orderCard.hidden && this.ui.starterCard.hidden) {
      location.reload(); // R = restart the day (save rules decide what resumes)
      return;
    } else if (inp.interactPressed && !this.dayFading && this.ui.nameBox.hidden
      && this.ui.starterCard.hidden) {
      if (!this.wardrobe.isOpen) {
        if (!this.ui.postcardPanel.hidden) this.dismissPostcard();
        else if (this.state.pendingCard) this.advanceOrder(null); // the card owns the counter
        else if (!this.mapOpen) this.tryInteract();
      }
    }
    // M folds / opens the Map — the notebook is always available, never forced
    const mapDown = this.input.isDown('KeyM');
    if (mapDown && !this.mapKeyWasDown && !this.dayFading && this.ui.nameBox.hidden
      && this.ui.orderCard.hidden && this.ui.starterCard.hidden) {
      this.toggleMap();
    }
    this.mapKeyWasDown = mapDown;
    // O folds / opens the Wardrobe — the fitting room, not a switchboard
    const wardrobeDown = this.input.isDown('KeyO');
    if (wardrobeDown && !this.wardrobeKeyWasDown && !this.dayFading
      && this.ui.nameBox.hidden && this.ui.orderCard.hidden
      && this.ui.starterCard.hidden) {
      this.toggleWardrobe();
    }
    this.wardrobeKeyWasDown = wardrobeDown;

    // debug (greybox README): G forces dusk + the gold window
    if (this.input.isDown('KeyG') && !this.goldDebugFired && !this.dayFading) {
      this.goldDebugFired = true;
      this.startDusk();
      this.lightGoldWindow();
    }
    // the customer at the cart owns a body too — synced fresh for this move
    this.world.syncPersonCollider(this.world.customerCollider, this.customer);
    // (the frame-order fix lives in World.updateDynamics — called below, before
    // the player moves — which syncs the cast, stool, barrier AND the rest of
    // the walking cast: stranger, Sal, the familiar face)
    // Dynamic colliders sync BEFORE the walker moves (agent-2 audit, doc 35):
    // world.update used to run after player.update, so the walker resolved
    // against last frame's taxi box — up to 0.9 m stale at the dt clamp, and
    // a player visibly sank into a passing cab before anything stopped them.
    // (wdt — the listen beat's slowed city — applies from here down.)
    const peds: Array<{ x: number; z: number }> = [];
    if (this.world.kidGround.visible) peds.push({ x: this.world.kidGround.position.x, z: this.world.kidGround.position.z });
    if (this.world.stranger.visible) peds.push({ x: this.world.stranger.position.x, z: this.world.stranger.position.z });
    if (this.world.familiar.visible) peds.push({ x: this.world.familiar.position.x, z: this.world.familiar.position.z });
    this.world.updateDynamics(wdt, this.player.capsule, peds, this.duskStarted);
    this.cam.interiorMode = this.world.subway.underground;
    this.drainFarWorld(wdt);
    if (!this.dayFading && this.ui.nameBox.hidden && this.ui.orderCard.hidden && !this.mapOpen
      && this.ui.starterCard.hidden && !this.arrival.active && !this.wardrobe.isOpen) {
      // movement — paused on the bench (Doc 37 §3C: the seat holds you;
      // physics would drag the capsule off it, so the walker simply rests)
      if (!this.sitting) this.player.update(dt, inp.move, inp.sprint);
    } else {
      this.player.update(dt, { x: 0, y: 0 });
    }
    // the sketch: Map notices where you walk (throttled inside)
    this.checkSketchReveals();
    // visual sync — on a ladder the body leans to the wall (visual-only
    // offset; the capsule stays authoritative for step-offs). The lean LERPS
    // now — the old hard ±0.42 snap on grab/release read as a glitch.
    const climbing = this.player.ladder !== null;
    this.climbLean += ((climbing ? -0.42 : 0) - this.climbLean) * Math.min(1, dt * 10);
    this.playerVisual.position.set(
      this.player.capsule.x,
      this.player.visualY,
      this.player.capsule.z + this.climbLean,
    );
    this.playerVisual.rotation.y = this.player.rotationY;

    // the half-court (docs/49): pickup, dribble, charge, flight, tally.
    // Runs after the walker moves (the ball reads a fresh capsule) and
    // never while a day fade owns the screen.
    if (!this.dayFading) {
      this.court.update(dt, {
        interactPressed: inp.interactPressed,
        interactHeld: inp.interactHeld,
        moveMag: Math.min(1, Math.hypot(inp.move.x, inp.move.y)),
        px: this.player.capsule.x,
        pz: this.player.capsule.z,
        rotY: this.player.rotationY,
      });
      this.court.applySpinToMesh(dt);
    }

    // zones
    this.checkZones();
    this.perFrameChecks(dt);
    this.updateNotes(dt);

    // camera — pointer drag and wheel zoom input forwarded for intuitive controls
    if (Math.abs(inp.dragX) > 0 || Math.abs(inp.dragY) > 0) {
      this.cam.handlePointerDrag(inp.dragX, inp.dragY);
    }
    if (Math.abs(inp.zoomDelta) > 0) {
      this.cam.handleZoom(inp.zoomDelta);
    }

    // the walker steers by `moveYaw` (the frozen reference during an
    // auto-flip), the boom swings by camYaw. See GameCamera for the split.
    // The arrival rides the same rig override the postcard uses.
    const rig = (this.postcardRig || this.arrival.active)
      ? { pos: this.rigPos, look: this.rigLook }
      : undefined;
    this.cam.update(dt, this.player.capsule, inp.camTurn, inp.move, this.player.rotationY, rig?.pos, rig?.look);
    this.player.camYaw = this.cam.moveYaw;
    // docs/51 B6 — the occlusion array may have been resized by the update
    // above (a canopy added after boot); re-wire the reference so the world's
    // fade pass always reads the camera's CURRENT array. A pointer copy, not
    // an allocation — this line is free, the silent no-op it prevents isn't.
    this.world.canopyOcclusion = this.cam.occlusion;

    // world life (Rule of Steam) — phase 2 only here: the walkers steer
    // around the fresh player position, trees breathe, pigeons worry about
    // your shoes. (Phase 1 — colliders + the cab + the M121, yielding to the
    // kid AND the stranger AND the familiar face — ran before the walker.)
    this.world.updateAmbient(wdt, this.player.capsule, this.duskStarted);
    this.syncGlows();
    this.maybeBuskerHorn(dt);

    // Day 3+4: the urn runs on its own clock; the kid walks at your hip
    if (s.brewing) {
      this.brewTimer -= dt;
      if (this.brewTimer <= 0) {
        for (const e of s.completeBrew()) this.applyEffect(e);
      }
    }
    // Day 4 afternoon: so does the washer
    if (s.apronWashing) {
      this.washTimer -= dt;
      if (this.washTimer <= 0) {
        for (const e of s.completeWash()) this.applyEffect(e);
      }
    }
    // the free-roam load (docs/38) runs on its own clock — the story wash
    // and the $3 load never share the drum (the washer_free gate keeps out)
    if (this.freeWashRunning) {
      this.freeWashTimer -= dt;
      if (this.freeWashTimer <= 0) this.finishFreeWash();
    }
    if (s.isDay3 && s.step === Step.D3_KIDDOWN && s.kidDown && !s.kidAtCorner) {
      this.updateKidFollow(dt);
    }
    // the familiar face walks her round (Doc 33 §2.2) — day-keyed, unhurried
    this.updateFamiliar(dt);

    // the cast animates: walk when their position moved, climb on ladders,
    // sweep when Rosa's on broom duty, breathe when parked. The PLAYER's mode
    // is explicit EVERY frame — it used to only ever be set to 'climb' and
    // never reset, so one ladder ride left the arms overhead for the rest of
    // the day (playtest: "the hand was still raised up after climbing the
    // ladder"). The rest of the cast own their modes (Rosa sweeps, the kid
    // waves — a tween flips those back).
    for (const actor of this.cast) {
      if (!actor.visible) continue;
      updatePersonAnim(actor, dt, actor === this.playerVisual
        ? { mode: this.sitting ? 'sit' : climbing ? 'climb' : 'auto' }
        : undefined);
    }

    // the follow beacon — a gold chevron bobbing over whoever the objective
    // says to tail (playtest: "the prompt said follow her and she vanish").
    // Drawn through walls (depthTest off), so following is never a guessing
    // game even when the walker is already inside the bodega.
    if (this.rosaWalking || this.idrisWalking) {
      const who = this.rosaWalking ? this.world.rosa : this.world.idris;
      if (!this.waypoint) {
        this.waypoint = this.world.makeWaypoint();
        this.world.scene.add(this.waypoint);
      }
      this.waypoint.visible = true;
      this.waypoint.position.set(
        who.position.x,
        who.position.y + 2.3 + Math.sin(performance.now() / 250) * 0.08,
        who.position.z,
      );
    } else if (this.waypoint) {
      this.waypoint.visible = false;
    }

    // HUD
    if (s.step !== Step.DONE && !this.dayFading) s.elapsed += dt;
    const mm = Math.floor(s.elapsed / 60);
    const ss = Math.floor(s.elapsed % 60);
    this.ui.setTimer(`${mm}:${ss.toString().padStart(2, '0')}`);
    const near = this.nearestInteraction();
    // while the ball rides with you, the court owns the prompt — the shot
    // charge is on the same button, so the words say what the button does
    if (this.court.holding) {
      this.ui.setPrompt(this.court.phase === 'charging'
        ? (this.ui.isTouch ? 'Release!' : 'Release in the gold band')
        : 'Hold to shoot');
    } else {
      this.ui.setPrompt(near ? near.prompt(s, this.ictx) : null);
    }
    // an offer you walked away from is an offer you declined
    if (s.buyConfirm !== null && near?.id !== s.buyConfirm) s.buyConfirm = null;

    this.renderer.render(this.world.scene, this.cam.camera);
  }

  private syncGlows() {
    const g = clamp01((this.world.goldWindowMat.emissiveIntensity ?? 0) / 4);
    (this.world.goldGlow.material as THREE.SpriteMaterial).opacity = g * 0.85;
    const g2 = clamp01((this.world.secondWindowMat.emissiveIntensity ?? 0) / 3.2);
    (this.world.secondGlow.material as THREE.SpriteMaterial).opacity = g2 * 0.8;
    const g3 = clamp01((this.world.thirdWindowMat.emissiveIntensity ?? 0) / 3.2);
    (this.world.thirdGlow.material as THREE.SpriteMaterial).opacity = g3 * 0.8;
    const g4 = clamp01((this.world.fourthWindowMat.emissiveIntensity ?? 0) / 3.2);
    (this.world.fourthGlow.material as THREE.SpriteMaterial).opacity = g4 * 0.8;
    // the court's gooseneck warms as the day cools (docs/49) — it reads as
    // the street light it is by dusk, and stays quiet at noon
    const duskAmt = clamp01(1 - (this.world.goldWindowMat.emissiveIntensity ?? 0) / 4);
    (this.world.courtGlow.material as THREE.MeshLambertMaterial).emissiveIntensity
      = (1 - duskAmt) * 1.6;
  }

  // ------------------------------------------------------------------ zones

  private checkZones(): void {
    const c = this.player.capsule;

    // bodega interior: advance ENTER_BODEGA → COLLECT (once, zone semantics)
    const inside = capsuleInBox(c, this.world.insideBodegaZone);
    if (inside && !this.wasInsideBodega) {
      for (const e of this.state.enterBodega()) this.applyEffect(e);
    }
    this.wasInsideBodega = inside;

    // cozy roof hides with HYSTERESIS — the zone edge used to toggle the roof
    // on/off frame-by-frame when idling at the door line (the "glitching")
    if (!this.roofHidden && c.z > 9.4 && c.y < 6) {
      this.roofHidden = true;
      this.world.setRoofHidden(true);
    } else if (this.roofHidden && (c.z < 8.6 || c.y >= 6)) {
      this.roofHidden = false;
      this.world.setRoofHidden(false);
    }

    // ladders — Area3D body_entered/exited edge semantics (grab on entry,
    // release on exit; no re-grab while still inside after a floor release)
    const inL1 = capsuleInBox(c, this.world.ladder1.area);
    const inL2 = capsuleInBox(c, this.world.ladder2.area);
    if (inL1 && !this.wasInL1) {
      this.player.ladder = this.world.ladder1;
      this.onLadderGrab();
    }
    if (inL2 && !this.wasInL2) {
      this.player.ladder = this.world.ladder2;
      this.onLadderGrab();
    }
    if (!inL1 && this.wasInL1 && this.player.ladder === this.world.ladder1) {
      this.player.ladder = null;
      this.onLadderLeave();
    }
    if (!inL2 && this.wasInL2 && this.player.ladder === this.world.ladder2) {
      this.player.ladder = null;
      this.onLadderLeave();
    }
    this.wasInL1 = inL1;
    this.wasInL2 = inL2;

    // top landing (main.gd `_reach_top`)
    if (!this.reachedTopFired && capsuleInBox(c, this.world.topLandingZone)) {
      if (this.state.step === Step.CLIMB || this.state.step === Step.D2_CLIMB2 || this.state.step === Step.D3_CLIMB3 || this.state.step === Step.D4_CLIMB4) {
        this.reachedTopFired = true;
        this.reachTop();
      }
    }

    // kill floor — nobody leaves the block
    if (c.y < this.world.killY) this.respawn();
  }

  private onLadderGrab(): void {
    if (this.state.step >= Step.CLIMB) {
      this.checkpoint = { x: 9.4, y: 0.05, z: -5.5 };
      this.startDusk();
    }
    if (this.state.step === Step.CLIMB || this.state.step === Step.D2_CLIMB2 || this.state.step === Step.D3_CLIMB3 || this.state.step === Step.D4_CLIMB4) {
      this.ui.setObjective('Climb.');
    }
  }

  private onLadderLeave(): void {
    if (this.state.step === Step.CLIMB || this.state.step === Step.D2_CLIMB2 || this.state.step === Step.D3_CLIMB3 || this.state.step === Step.D4_CLIMB4) {
      this.ladderHintPending = true;
    }
  }

  /** main.gd `_process` per-frame gameplay checks. */
  private perFrameChecks(dt: number): void {
    void dt;
    const s = this.state;
    const c = this.player.capsule;

    // Seam 1: the goal is the far sidewalk, not one painted stripe
    if (s.step === Step.CROSS && c.z < -4.1) {
      for (const e of s.cross(Math.abs(c.x + 5.0) < 2.6)) this.applyEffect(e);
    }

    // Seam 2: stepped off mid-climb and touched the GROUND — Rosa calls you
    // back. The y < 1.0 gate matters: stepping onto the LANDING is success,
    // not a stumble — the old check fired her callback while you stood on
    // the fire escape you had just correctly climbed.
    if (this.ladderHintPending && this.player.ladder === null && this.player.onGround && this.player.capsule.y < 1.0) {
      this.ladderHintPending = false;
      if (s.step === Step.CLIMB || s.step === Step.D2_CLIMB2 || s.step === Step.D3_CLIMB3 || s.step === Step.D4_CLIMB4) {
        this.ui.setObjective('The fire escape, around the corner. Rosa will not let this go.');
        this.ui.showNote('Rosa, from somewhere behind you: \u201CFire escape! Around the corner! You found it once!\u201D');
      }
    }

    // ladders let you all the way down (climb-speed descent, floor release)
    if (this.player.ladder !== null && this.player.vy < -1.2 && c.y < 0.45) {
      this.player.ladder = null;
    }

    // Doc 02 §10:00–15:00 — the street performer. Once per session, after
    // the square has synced and you turn back toward the B stairs, someone
    // on the sidewalk plays and the city slows four seconds to listen. No
    // objective. No prompt. Just the city. (stairB's box, surface level)
    if (!this.listenDone && !this.arrival.active
      && this.world.timesSquare.syncedToday) {
      const atStairTop = c.x > -336.8 && c.x < -333.6 && c.z > 3.6 && c.z < 8.2 && c.y > -0.5;
      if (atStairTop) {
        this.listenDone = true;
        this.listenT = 0;
        gameAudio.streetSong();
      }
    }
  }

  private respawn(): void {
    this.player.vy = 0;
    this.player.ladder = null;
    this.player.capsule.x = this.checkpoint.x;
    this.player.capsule.y = this.checkpoint.y;
    this.player.capsule.z = this.checkpoint.z;
  }

  // ------------------------------------------------------------------ sitting
  // Doc 37 §3C — the bench is furniture, not scenery. While seated the
  // capsule parks on the seat and the walker's physics rests (a seat is not
  // a ladder: nothing should pull you off it); standing restores the exact
  // spot you rose from. The rig folds via its own 'sit' pose (personRig).

  private sitReturn: { x: number; z: number; rot: number } | null = null;

  get sitting(): boolean {
    return this.sitReturn !== null;
  }

  /** The one sit system (docs/38 — the park bench is the bus bench's
   *  sibling): capsule parks on the seat, physics rests, the rig folds to
   *  its sit pose, the seat's diary speaks. Standing restores the street
   *  spot. Defaults keep the original bus-bench behavior byte-for-byte. */
  sitAt(seat: { x: number; y: number; z: number }, faceY: number, notes: readonly string[]): void {
    if (this.sitReturn) return;
    const c = this.player.capsule;
    this.sitReturn = { x: c.x, z: c.z, rot: this.player.rotationY };
    c.x = seat.x;
    c.y = 0.12; // hips level with the seat top — the same settle the familiar uses
    c.z = seat.z;
    this.player.vy = 0;
    this.player.rotationY = faceY;
    this.ui.showNote(byDay(notes, this.state.day));
  }

  sitOnBench(): void {
    this.sitAt(BUS_BENCH_SEAT, Math.PI, BENCH_SIT_NOTES); // face the street, like the bench does
  }

  /** The park bench faces the lawn's street side — same street-watch pose,
   *  mirrored to face north across the lawn. */
  sitInPark(): void {
    this.sitAt(PARK_BENCH_SEAT, Math.PI, PARK_SIT_NOTES);
  }

  standUp(): void {
    const r = this.sitReturn;
    if (!r) return;
    this.sitReturn = null;
    const c = this.player.capsule;
    c.x = r.x;
    c.y = 0.05;
    c.z = r.z;
    this.player.vy = 0;
    this.player.rotationY = r.rot;
  }

  // ------------------------------------------------------------------ shelf
  // The bodega's shelf is a shop now (Doc 37 §3C): restocked every morning
  // and the moment Rosa's errand empties it. Purchases deduct real money.

  private restockShelf(): void {
    // Finite shop: refill units, then ensure exactly one mesh per in-stock SKU
    // (never double-add if the mesh is already on the shelf).
    this.state.restockShelfStock();
    for (const [id, x, y, z] of SHELF_STOCK) {
      if (this.state.shelfUnits(id) > 0 && !this.world.itemMeshes.has(id)) {
        this.world.addItem(id, x, y, z, 0);
      }
    }
  }

  // ------------------------------------------------------------------ the half-court (docs/49)
  // The court game owns the loop now — pickup, dribble, hold-to-shoot,
  // physics flight, the chalk tally (CourtGame.ts). These three hooks keep
  // the old public shape the registry and the probe harnesses read.

  /** The `court` interaction hands off here. What it MEANS depends on the
   *  court's phase: the ball at rest → pick it up. Everything after that
   *  is hold-to-shoot on the same button. */
  shootHoop(): void {
    this.court.pickUp();
  }

  /** A shot is in the air — the court interaction disables itself until it
   *  comes down (the registry reads this). */
  get hoopInFlight(): boolean {
    return this.court.inFlight;
  }

  /** The ball rides with the player (held or charging) — the court
   *  interaction steps aside while the shot button charges. */
  get courtHolding(): boolean {
    return this.court.holding;
  }

  // ------------------------------------------------------------------ the free wash (docs/38)
  // The laundromat's near washer, when Sal's story isn't using the bay: $3,
  // six honest seconds of drum, a day-keyed done line. Same machine, same
  // visual path as the story wash — never both at once (the gate keeps out).

  freeWashRunning = false;
  private freeWashTimer = 0;

  private startFreeWash(): void {
    this.freeWashRunning = true;
    this.freeWashTimer = 6;
    this.world.setWasherRunning(true);
    gameAudio.wash();
  }

  private finishFreeWash(): void {
    this.freeWashRunning = false;
    this.world.setWasherRunning(false);
    gameAudio.washStop();
    this.ui.showNote(byDay(FREE_WASH_NOTES, this.state.day));
  }

  // ------------------------------------------------------------------ interact

  /** The nearest enabled interaction from the registry — the only proximity
   *  pass in the game (Doc 37 §3B). Kept as a method because the E2E/probe
   *  harnesses read it. */
  nearestInteraction() {
    return this.registry.nearest(this.player.capsule, this.state, this.ictx);
  }

  /** True while any AUTHORED story interaction is pressable right now —
   *  the walker conversations (Phase 4) read this to step aside, so a
   *  passing neighbor can never swallow a story beat's press. Cheap: every
   *  authored gate is a switch comparison or two. */
  hasBlockingInteraction(): boolean {
    for (const it of this.registry.list()) {
      if (!it.authored) continue;
      if (it.enabled(this.state, this.ictx)) return true;
    }
    return false;
  }

  private tryInteract(): void {
    if (this.state.pendingCard) return; // the conversation owns the counter
    if (this.mapOpen) return; // the notebook holds the hands
    const it = this.nearestInteraction();
    if (!it) return;
    // A confirm offer is bound to its own interaction: walking away, or
    // pressing at anything else, takes the offer off the table.
    if (this.state.buyConfirm !== null && this.state.buyConfirm !== it.id) {
      this.state.buyConfirm = null;
    }
    for (const e of it.perform(this.ictx)) this.applyEffect(e);
  }

  // ------------------------------------------------ the order conversation ----
  // One beat per call: a reply before responding, a fold after. The E2E
  // driver and the UI buttons meet here (the state machine lives in
  // GameState.chooseReply — this only applies its effects).

  advanceOrder(reply: number | null): void {
    const s = this.state;
    if (!s.pendingCard || this.ui.orderCard.hidden) return;
    const effects = s.orderResponded
      ? s.chooseReply(-1) // any press folds the card once the reply landed
      : s.chooseReply(reply ?? s.pendingCard.defaultReply);
    for (const e of effects) this.applyEffect(e);
  }

  // ------------------------------------------------------ the Map notebook ----
  // Doc 12 prototype 2: a patient friend, not a system. It opens only when
  // asked (M / the folded corner), never blocks progress, never nags. Its
  // only self-expression is a small wiggle when it writes something down.

  toggleMap(): void {
    if (this.mapOpen) {
      this.mapOpen = false;
      this.ui.closeMap();
      return;
    }
    // an order conversation holds the hands — the Map can wait (it would)
    if (this.state.pendingCard) return;
    this.mapOpen = true;
    this.ui.openMap(this.state.mapNotes, this.state.mapSlang);
    this.ui.refreshSketch(this.state.visitedPlaces, this.player.capsule.x, this.player.capsule.z);
  }

  /** The Roam toggle — the open-block contract's one switch (freeroam.ts).
   *  Entering stands the barrier down and relaxes the objective line;
   *  leaving restores the story's own. GameState is untouched: the story
   *  neither advances nor rewinds because you roamed. From Day 2 on the
   *  mode rides the save (Day 1 never writes — save.gd law). */
  toggleRoam(): void {
    if (this.arrival.active) return; // the film owns the hands first
    const applied = this.roam.active ? this.roam.exit() : this.roam.enter();
    this.world.setBarrierOpen(this.roam.active);
    this.ui.setRoamLabel(this.roam.active);
    if (applied.objective === null) this.ui.setObjective(this.state.objectiveText());
    else this.ui.setObjective(applied.objective);
    this.pushNote(applied.note);
    this.worldSim.onRoamToggle(this.roam.active); // the sim's bodies + clock flips ride roam
    const save = loadSave();
    if (save.day >= 2) {
      const next = { ...save };
      if (this.roam.active) next.roam = true;
      else delete next.roam;
      writeSave(next);
    }
  }

  /** Map notices the places you walk to (docs/12: it copies the
   *  neighborhood badly, and only what it has seen). Throttled — a squared
   *  distance pass over nine places, twice a second, costs nothing. A new
   *  mark wiggles the folded corner once, like any note. */
  private checkSketchReveals(): void {
    this.sketchCheckAge += 1;
    if (this.sketchCheckAge < 30) return; // ~0.5 s at 60 fps
    this.sketchCheckAge = 0;
    const px = this.player.capsule.x;
    const pz = this.player.capsule.z;
    let revealed = false;
    for (const place of MAP_PLACES) {
      if (this.state.hasSeenPlace(place.id)) continue;
      const dx = place.x - px, dz = place.z - pz;
      if (dx * dx + dz * dz <= MAP_PLACE_NOTICE_R * MAP_PLACE_NOTICE_R) {
        this.state.revealPlace(place.id);
        revealed = true;
      }
    }
    if (revealed) {
      this.ui.wiggleMap();
      // roam law: while roaming, the walk IS the content — the objective
      // line counts the sketchbook instead of the errands
      if (this.roam.active) {
        this.ui.setObjective(roamDiscoveryLine(this.state.visitedPlaces.length, MAP_PLACES.length));
      }
      if (this.mapOpen) this.ui.refreshSketch(this.state.visitedPlaces, px, pz);
    }
  }
  private sketchCheckAge = 0;

  /** The Map wrote something down — the toast tells the player it happened,
   *  the folded corner wiggles once. Opening is optional; the page is kept. */
  private mapNote(text: string): void {
    this.pushNote(text);
    this.ui.wiggleMap();
    if (this.mapOpen) this.ui.refreshMap(this.state.mapNotes, this.state.mapSlang);
  }

  // ------------------------------------------------------ the note queue ----
  // Two notes in one breath queue instead of replacing: the city is patient,
  // and Rosa's quiet line gets its two seconds before the next line lands.

  private pushNote(text: string): void {
    if (this.noteAge < Game.NOTE_MIN_SHOW && this.noteQueue.length < 4) {
      this.noteQueue.push(text);
      return;
    }
    this.ui.showNote(text);
    this.noteAge = 0;
  }

  private updateNotes(dt: number): void {
    this.noteAge += dt;
    if (this.noteQueue.length > 0 && this.noteAge >= Game.NOTE_MIN_SHOW) {
      this.ui.showNote(this.noteQueue.shift()!);
      this.noteAge = 0;
    }
  }

  // ------------------------------------------------------------------ effects

  /** The far world's per-frame accounting (docs/50): beats become notes,
   *  ride phases become voices, the busker plays when you're near. All of
   *  it cheap — the buffers drain to empty every frame. */
  private lastRidePhase: string = 'idle';
  private saxOn = false;
  // ---- the Shuffle's soft skip (docs/51 B16, Doc 07 TBD-3) ----------------
  private stillFor = 0;      // seconds the player has stood still IN the stretch
  private waitFired = false; // the patience line fires once per standstill episode
  private rideEndSaid = false; // doc 08 note #6 — once per session, first arrival
  private lastWalkPos: { x: number; z: number } | null = null;
  private drainFarWorld(dt: number): void {
    const w = this.world;
    // the Shuffle's brushes: the walkers already said their "'Scuse me."
    // in-world; the drain just keeps the queue honest (nothing to count —
    // brushing is a correct interaction, never a failure, never a stat)
    w.drainBrushes();
    // TBD-3: standing still 20 s mid-walk offers the city's patience. Only
    // inside the stretch (sightseeing elsewhere is a right); moving resets.
    // Times Square needs no completion to reach — the world has no gate to
    // skip past, so the line is comfort, not a checkpoint.
    const px = this.player.capsule.x;
    const pz = this.player.capsule.z;
    if (inShuffleStretch(px, pz)) {
      if (this.lastWalkPos
        && Math.hypot(px - this.lastWalkPos.x, pz - this.lastWalkPos.z) < 0.05) {
        this.stillFor += dt;
      } else {
        this.stillFor = 0;
        this.waitFired = false;
      }
      if (!this.waitFired && !this.roam.active && cityWillWaitFires(this.stillFor)) {
        this.waitFired = true;
        this.pushNote(CITY_WILL_WAIT_NOTE);
      }
    } else {
      this.stillFor = 0;
      this.waitFired = false;
    }
    this.lastWalkPos = { x: px, z: pz };
    // ride phase transitions → the train's own voice
    const phase = w.subway.ride.phase;
    if (phase !== this.lastRidePhase) {
      if (phase === 'closing') gameAudio.doorChime();
      if (phase === 'riding') gameAudio.rumbleStart();
      if (phase === 'departing') { gameAudio.doorChime(); gameAudio.rumbleStop(); }
      if (phase === 'arrived') {
        gameAudio.announce(); gameAudio.rumbleStop();
        // doc 08 note #6 — the ride's parting reassurance (Map writes it
        // down; the notebook dedupes, the voice says it once per session)
        if (!this.rideEndSaid) {
          this.rideEndSaid = true;
          this.state.collectNote(RIDE_END_NOTE);
          this.pushNote(RIDE_END_NOTE);
          if (this.mapOpen) this.ui.refreshMap(this.state.mapNotes, this.state.mapSlang);
        }
      }
      if (phase === 'idle') gameAudio.rumbleStop();
      this.lastRidePhase = phase;
    }
    // the busker plays when the 42nd St platform is lit and you can hear it
    const nearBusker = w.subway.lit.has('stationB')
      && Math.hypot(this.player.capsule.x - w.subway.anchors.busker.x, this.player.capsule.z - w.subway.anchors.busker.z) < 13;
    if (nearBusker !== this.saxOn) {
      this.saxOn = nearBusker;
      if (nearBusker) gameAudio.saxStart();
      else gameAudio.saxStop();
    }
    // beats → notes (the ride's teach, the square's sync); the turnstile
    // is an audio-only beat — the pass clicks, it doesn't narrate
    while (w.subwayBeats.length > 0) {
      const key = w.subwayBeats.shift()!;
      if (key === 'turnstile') { gameAudio.turnstile(); continue; }
      // the crooked copy latches (docs/51 B11): Map keeps its badly-copied
      // diagram on page 1 from this beat on. The wiggle is the honest kind
      // — the fold never opens itself, the doodle waits for the next look.
      if (key === 'map-copies' && this.state.copyPriyaLines()) {
        this.ui.revealPriyaLines();
        this.ui.wiggleMap();
        // doc 08 note #5 — Map writes the lesson down in her own hand (the
        // spoken teach rode the beats; the notebook keeps her crooked copy)
        this.state.collectNote(MAP_COPIED_NOTE);
        if (this.mapOpen) this.ui.refreshMap(this.state.mapNotes, this.state.mapSlang);
      }
      const text = RIDE_BEAT_TEXT[key];
      if (text) this.ui.showNote(text);
    }
    while (w.tsBeats.length > 0) {
      w.tsBeats.shift();
      this.ui.showNote(TS_SYNC_NOTE);
      // the Wow card (docs/51 B10): Doc 02/07's shareable postcard at the
      // wonder moment. The sync needs 1.2 s to reach full warm — capture
      // mid-hold, when the square is at its brightest, then show the card
      // on the existing capture → caption → panel path (day machine sacred).
      this.tweens.sequence(
        this.tweens.wait(1.5),
        this.tweens.call(() => this.composeWowPostcard()),
      );
    }
  }

  applyEffect(e: Effect): void {
    switch (e.kind) {
      case 'step':
        // roam law: the objective line belongs to the mode. Story steps
        // still apply (the sim continues at the player's pace); only the
        // HUD pressure rests while roaming.
        if (!this.roam.active) {
          this.ui.setObjective(this.state.objectiveText());
          if (e.step === Step.DONE) this.ui.setObjective(DAY_DONE_OBJECTIVE(this.state.day));
        }
        // M1: the beat marker is map information, not HUD pressure — it
        // moves in both modes (mid-roam, it shows where the story waits).
        this.ui.setBeatMarker(this.state.beatPlaceId());
        if (e.step === Step.D2_IDRIS) this.startIdrisWalk();
        break;
      case 'note':
        this.pushNote(e.text);
        // Doc 08 postcard 2 (First Rush): the rush-end beat composes its
        // keepsake while the note reads — a real capture, filed to the album
        if (e.text === RUSH_NOTE_5) {
          this.tweens.sequence(this.tweens.wait(0.9), this.tweens.call(() => this.composeMomentCard('rush')));
        }
        break;
      case 'map-note':
        // the Map writes it down AND says so — a note is a small event
        this.mapNote(e.text);
        break;
      case 'map-slang':
        // the state already filed the card; the margins refresh if open
        this.ui.wiggleMap();
        if (this.mapOpen) this.ui.refreshMap(this.state.mapNotes, this.state.mapSlang);
        break;
      case 'order-open':
        this.player.frozen = true;
        this.ui.showOrderCard(e.card);
        break;
      case 'order-respond':
        this.ui.showOrderResponse(e.text);
        break;
      case 'order-close':
        this.ui.hideOrderCard();
        this.player.frozen = false;
        break;
      case 'money':
        this.ui.setMoney(this.state.money);
        break;
      case 'spend':
        this.ui.setMoney(this.state.money);
        break;
      case 'rosa-moved-behind-counter':
        // playtest 2026-10-29: she used to TELEPORT behind the counter —
        // "I pressed one key and Rosa vanished." Now she walks there, out
        // loud, and the player follows her through the door. (And her
        // arrival-wave ends — arms come down for the walk.)
        {
          const rosaRig = this.world.rosa.userData.rig as { mode: string } | undefined;
          if (rosaRig && rosaRig.mode === 'wave') rosaRig.mode = 'auto';
        }
        this.startRosaWalk();
        break;
      case 'collect':
        this.world.removeItem(e.id);
        this.registry.unregister(`item_${e.id}`);
        // Rosa's three are hers now — and the shelf goes back to selling:
        // the restock is what makes the bodega a shop outside the errand.
        if (this.state.itemsLeft.size === 0) this.restockShelf();
        break;
      case 'shelf-deplete':
        // Paid purchase consumed the last unit — hide the mesh until morning.
        this.world.removeItem(e.id);
        break;
      case 'spawn-customer':
        this.spawnCustomer(e.who, e.x, e.z);
        break;
      case 'serve-customer':
        this.removeCustomer();
        // Doc 08 postcard 4 (The Fold): the bagel was order three — the
        // first fold composes its keepsake as the enormous thing changes hands
        if (this.state.step === Step.RUSH && this.state.rushServed === 3) {
          this.tweens.sequence(this.tweens.wait(0.6), this.tweens.call(() => this.composeMomentCard('fold')));
        }
        break;
      case 'name-cart-open':
        this.player.frozen = true;
        this.ui.openNameBox();
        break;
      case 'name-cart-applied':
        this.applyCartIdentity(e.name);
        // Doc 08 postcard 5 (Your Corner): the named cart, framed — the
        // caption signs itself with the name the city just wrote down
        this.tweens.sequence(this.tweens.wait(0.8), this.tweens.call(() => this.composeMomentCard('corner')));
        break;
      case 'crossed':
        this.checkpoint = { x: e.checkpoint.x, y: 0.05, z: e.checkpoint.z };
        // Doc 02 §20:00–26:00 — "Rosa walks you to the empty corner." She
        // leaves the counter while you cross; she reaches the shoulder spot
        // as the solo rush starts, and the register count finds her there.
        this.startRosaCornerWalk();
        break;
      case 'dusk-start':
        this.startDusk();
        break;
      case 'reach-top':
        break;
      case 'rosa-window-warm':
        this.warmRosaWindow();
        break;
      case 'next-day':
        void this.beginDay(this.state.day + 1, null, false);
        break;
      case 'day-beyond':
        this.ui.showNote(`Day ${this.state.day + 1} is still being written. The light stays a little longer.`);
        break;
      case 'idris-served':
        this.tweens.num(
          () => this.world.idris.position.x,
          (v) => { this.world.idris.position.x = v; },
          -24, 8,
        );
        break;
      case 'kid-delivered':
        this.showKid();
        break;
      case 'cup-given':
        this.cupProp.visible = true;
        break;
      case 'cup-taken-back':
        this.cupProp.visible = false;
        break;
      case 'brew-start':
        this.brewTimer = 1.15;
        gameAudio.brew();
        if (!this.brewingNoteShown) {
          this.brewingNoteShown = true;
          this.ui.showNote(BREWING_NOTE);
        }
        break;
      case 'kid-down':
        this.showKidGround();
        break;
      case 'kid-follow':
        break; // the follow loop is driven by state flags, not the effect
      case 'kid-sits':
        this.sitKid();
        break;
      case 'stool-offer':
        this.ui.showNote(STOOL_OFFER_NOTE);
        break;
      case 'stool-up':
        this.world.stool.visible = true;
        this.ui.showNote(STOOL_UP_NOTE);
        this.persist(); // the stool is bought money — save it the moment it happens
        break;
      case 'stranger-arrive':
        this.showStranger();
        break;
      case 'stranger-to-cart':
        // the follow-up lines ride on her walk — one note at a time, like
        // the street would tell it
        this.tweens.sequence(
          this.tweens.call(() => this.ui.showNote(D4_STRANGER_ONHOUSE_NOTE)),
          this.tweens.wait(3.2),
          this.tweens.call(() => this.ui.showNote(D4_STRANGER_WATCH_NOTE)),
        );
        this.startStrangerWalkToCart();
        break;
      case 'stranger-departs':
        // the send-off rides on her walk, then the kid flags the apron —
        // one note at a time, like the street would tell it
        this.tweens.sequence(
          this.tweens.wait(2.4),
          this.tweens.call(() => this.ui.showNote(D4_STRANGER_DEPART_NOTE)),
          this.tweens.wait(3.2),
          this.tweens.call(() => this.ui.showNote(D4_KID_APRON_NOTE)),
        );
        this.startStrangerDepartWalk();
        break;
      case 'map-given':
        this.persist(); // the Map changed hands — it stays given
        break;
      case 'wash-start':
        this.washTimer = 2.4;
        this.world.setWasherRunning(true);
        gameAudio.wash();
        break;
      case 'free-wash-start':
        // the laundromat's other wash (docs/38): same machine, its own clock
        this.startFreeWash();
        break;
      case 'apron-clean':
        this.world.setWasherRunning(false);
        gameAudio.washStop();
        this.ui.showNote(D4_APRON_CLEAN_NOTE);
        break;
      case 'permit-offer':
        break; // the note rode along in the effect list
      case 'permit-filed':
        this.world.setPermitReceiptVisible(true);
        gameAudio.stamp();
        this.persist(); // filed money is spent money — save it the moment it happens
        break;
      case 'awning-offer':
        this.ui.showNote('An awning kit leans against the cart, teal like Rosa\u2019s. $15, cash. [Space] again to put it up.');
        break;
      case 'awning-up':
        this.world.cartAwning.visible = true;
        this.ui.showNote('The awning goes up with a sound like a sail. Shade. People linger. Lingering people order a second cup.');
        break;
      case 'persist':
        this.persist();
        break;
    }
  }

  // ------------------------------------------------------------------ sequences

  /** Rosa walks the route to her counter — visible the whole way, so "follow
   *  Rosa" is a thing you can literally do. ~2 m/s, faces her direction. */
  private startRosaWalk(): void {
    if (this.rosaWalking) return;
    this.rosaWalking = true;
    const rosa = this.world.rosa;
    const legs: Array<[number, number]> = [
      [-27, 6.8],    // she meets you by the terminal
      [-24.5, 6.9],
      [-18.0, 6.9],  // along the north sidewalk
      [-16.0, 7.35], // front of her door
      [-16.0, 9.2],  // through the door gap
      [-17.5, 12.6],
      [-20.4, 13.5], // behind the counter
    ];
    const SPEED = 2.0;
    const t = this.tweens;
    const seq: Tween[] = [];
    for (let i = 1; i < legs.length; i++) {
      const [x0, z0] = legs[i - 1];
      const [x1, z1] = legs[i];
      const dur = Math.max(0.2, Math.hypot(x1 - x0, z1 - z0) / SPEED);
      seq.push(t.call(() => { rosa.rotation.y = Math.atan2(x1 - x0, z1 - z0); }));
      seq.push(t.parallel(
        t.num(() => rosa.position.x, (v) => { rosa.position.x = v; }, x1, dur),
        t.num(() => rosa.position.z, (v) => { rosa.position.z = v; }, z1, dur),
      ));
    }
    seq.push(t.call(() => {
      rosa.rotation.y = Math.PI / 2; // faces her counter
      this.rosaWalking = false;
    }));
    t.sequence(...seq);
  }

  /** Arrival handover, Game-side extras: the step-off checkpoint and the
   *  Map's first note. (The cinematic itself placed the player, Rosa's
   *  wave, and the follow camera.) */
  private onArrivalHandover(): void {
    this.checkpoint = { x: this.player.capsule.x, y: this.player.capsule.y, z: this.player.capsule.z };
    this.ui.showNote(MAP_NOTE_BOOT);
    // The open-block contract, said out loud once: the story is the spine,
    // but the block runs on your clock. The pocket's Roam chip is the switch.
    this.pushNote('Rosa waves from the bodega — follow her, or tap Pocket → Roam and take the block in first.');
    // Doc 02: "Six starter characters to pick from (30 seconds, all
    // delightful)." An explicit ?pickcard=1 ask wins (same law as ?film=1);
    // otherwise only humans on the film path see it — drivers and film
    // evidence probes keep the shipped face.
    if (!this.starterOffered && this.state.starterId === DEFAULT_STARTER
      && (this.forcePickCard || (!this.driverBoot && !this.filmRequested))) {
      this.starterOffered = true;
      this.ui.showStarterPick(STARTERS);
    }
  }

  /** Dress the walker as a picked starter — Doc 02 §0:00–2:00. Same boxes
   *  (personRig's law), new colors; the coffee cup re-parents; Dee's board
   *  rides the back the way the stranger's duffel does. `persist` writes a
   *  day-1 save blob so a reload keeps the face and skips the card. */
  private applyStarter(id: string, persist: boolean): void {
    const st = starterById(id);
    this.state.starterId = st.id;
    const old = this.playerVisual;
    const g = this.world.buildPerson(st.look);
    g.name = 'Player';
    g.position.copy(old.position);
    g.rotation.copy(old.rotation);
    if (st.prop === 'skateboard') g.add(this.makeSkateboardProp());
    g.add(this.cupProp); // THREE re-parents: the cup stays with its owner
    this.world.scene.add(g);
    const i = this.cast.indexOf(old);
    if (i >= 0) this.cast[i] = g;
    this.playerVisual = g;
    this.world.scene.remove(old);
    if (persist) writeSave({ ...loadSave(), starter: st.id });
  }

  setStarter(id: string): void {
    this.applyStarter(id, true);
  }

  // ---------------- the wardrobe (the pick is for keeps) ----------------

  /** O (or the pocket chip) folds the fitting room over the street. */
  toggleWardrobe(): void {
    if (this.wardrobe.isOpen) {
      this.wardrobe.close();
      return;
    }
    // the room opens on who the save is wearing — the lock law's anchor
    this.wardrobe.open(this.state.starterId);
  }

  /** A tile was tapped. The pure verdict (wardrobeDecision) decides: the
   *  same look closes the question; a different one can only be worn by
   *  starting over — the confirm strip asks before anything moves. */
  private wardrobeSwitchRequest(id: string): void {
    const decision = wardrobeDecision(this.state.starterId, id);
    if (decision.action === 'close') this.wardrobe.showAlreadyWearing();
    else this.wardrobe.showConfirm(decision.starterId);
  }

  /** "Start over" confirmed: the save is wiped and rewritten factory-fresh
   *  with the new face pinned (newGameSave), then the page reboots — the
   *  boot law dresses the new starter and the story begins at the bus. */
  private beginNewGameAs(id: string): void {
    const st = starterById(id);
    wipeSave();
    writeSave(newGameSave(st.id));
    this.wardrobe.close();
    location.reload();
  }

  setCameraPreset(mode: 'cozy' | 'street' | 'vista' | 'topdown'): void {
    if (mode === 'cozy') {
      (this.cam as any).pitchOffset = 0;
      (this.cam as any).userDistMultiplier = 1.0;
    } else if (mode === 'street') {
      (this.cam as any).pitchOffset = -0.15;
      (this.cam as any).userDistMultiplier = 0.75;
    } else if (mode === 'vista') {
      (this.cam as any).pitchOffset = 0.22;
      (this.cam as any).userDistMultiplier = 1.35;
    } else if (mode === 'topdown') {
      (this.cam as any).pitchOffset = 0.42;
      (this.cam as any).userDistMultiplier = 1.1;
    }
    this.cam.snapBehind(this.player.capsule);
  }

  resetCamera(): void {
    this.cam.snapBehind(this.player.capsule);
  }

  /** Dee's board: deck + grip stripe + four wheels, carried diagonal across
   *  the back (model faces local +Z, so −Z is the spine side). */
  private makeSkateboardProp(): THREE.Group {
    // one builder shared with the wardrobe turntable (personRig.ts)
    return buildStarterSkateboard();
  }

  /** Day 4: the stranger appears at the terminal — the spot where the whole
   *  story started, facing the street like you did. */
  private showStranger(): void {
    const she = this.world.stranger;
    she.position.set(-36.4, 0.05, 4.8);
    she.rotation.y = Math.PI;
    she.visible = true;
  }

  /** Multi-leg scripted walk for the persistent cast (the Rosa-walk pattern:
   *  ~2 m/s, faces her direction of travel every leg). */
  private walkActor(
    actor: THREE.Group, legs: Array<[number, number]>, speed: number, done?: () => void,
  ): void {
    const t = this.tweens;
    const seq: Tween[] = [];
    for (let i = 1; i < legs.length; i++) {
      const [x0, z0] = legs[i - 1];
      const [x1, z1] = legs[i];
      const dur = Math.max(0.2, Math.hypot(x1 - x0, z1 - z0) / speed);
      seq.push(t.call(() => { actor.rotation.y = Math.atan2(x1 - x0, z1 - z0); }));
      seq.push(t.parallel(
        t.num(() => actor.position.x, (v) => { actor.position.x = v; }, x1, dur),
        t.num(() => actor.position.z, (v) => { actor.position.z = v; }, z1, dur),
      ));
    }
    if (done) seq.push(t.call(done));
    t.sequence(...seq);
  }

  /** She walks YOUR first walk — terminal, north sidewalk, the crosswalk
   *  (the only place the cab waits), then the last meters to your cart.
   *  The Map beat gates on her arrival, never on a timer. */
  private startStrangerWalkToCart(): void {
    const she = this.world.stranger;
    this.walkActor(she, [
      [-36.4, 4.8],  // the terminal — where Rosa found you
      [-30, 5.5],    // north sidewalk, east
      [-16, 5.5],
      [-8, 5.4],
      [-5, 4.4],     // crosswalk north edge
      [-5, -3.4],    // the Shuffle (the cab yields — she's on the pedestrian list)
      [-5, -4.5],    // south curb
      [0.8, -4.6],
      [2.6, -4.6],   // the cart's west flank, a customer's distance
    ], 2.0, () => {
      she.rotation.y = Math.atan2(4 - 2.6, -6.6 + 4.6); // faces the cart
      this.state.strangerAtCart = true;
      if (this.state.step === Step.D4_MAP) {
        this.ui.setObjective('She\u2019s at the cart. There\u2019s something you can give her that isn\u2019t coffee.');
      }
    });
  }

  /** Doc 02 §20:00–26:00 — "Rosa walks you to the empty corner." She leaves
   *  the counter as you cross (the same proven stranger legs: the door, the
   *  crosswalk where the cab waits, the cart's flank) and takes the corner's
   *  SOUTH-EAST edge — Day 3's audited spot, clear of the walk lane (docs/51:
   *  the lane runs x 0..5; her collider synced every frame she moves). By
   *  the time the solo rush ends she is at your shoulder for the register. */
  private startRosaCornerWalk(): void {
    const rosa = this.world.rosa;
    if (this.rosaWalking) return; // a beat already owns her feet
    const rosaRig = rosa.userData.rig as PersonRig | undefined;
    if (rosaRig && rosaRig.mode === 'sweep') rosaRig.mode = 'auto';
    this.walkActor(rosa, [
      [-20.4, 13.5], // behind the counter — where the rush left her
      [-16, 13.4],   // the aisle
      [-16, 6.8],    // out the door
      [-10, 6.2],    // north sidewalk, east — your crosswalk
      [-5, 4.6],     // crosswalk north edge
      [-5, -3.4],    // the Shuffle (the cab's courtesy hold covers her too)
      [-5, -4.5],    // south curb
      [0.8, -4.6],
      [6.35, -4.3],  // her corner spot — facing the cart (Day 3's audited spot)
    ], 2.0, () => {
      rosa.rotation.y = -1.94; // southwest — the cart, the stool, the street
    });
  }

  /** And she leaves the way you would — the crosswalk, the north sidewalk,
   *  the city. Gone means gone: the corner does not own her. */
  private startStrangerDepartWalk(): void {
    const she = this.world.stranger;
    this.walkActor(she, [
      [2.6, -4.6],
      [-2.5, -4.6],
      [-5, -4.5],    // back to the crosswalk
      [-5, 4.4],
      [-5, 5.5],     // north side
      [-16, 5.5],
      [-30, 5.5],
      [-35.5, 5.2],  // the terminal, going in
    ], 2.0, () => {
      she.visible = false;
    });
  }

  // ---- the busker's horn (docs/33 §2.5, W4 p2) ---------------------------
  // "Rarely, a busker's horn note from below" — the SUB-02 corner's voice.
  // Dusk-law compliant: it only plays while dusk lasts (the plaza settles
  // at night), only within earshot of the control house, and rarely — a few
  // notes an evening. Garnish like the pigeons' coo: no state, no gates,
  // nothing the E2E waits on.
  private hornCooldown = 14; // the first dusk note comes early enough to be heard

  private maybeBuskerHorn(dt: number): void {
    if (!this.duskStarted) return;
    const dx = this.player.capsule.x - (-57);
    const dz = this.player.capsule.z - (-6.25);
    if (dx * dx + dz * dz > 26 * 26) return; // the horn lives at SUB-02's corner
    this.hornCooldown -= dt;
    if (this.hornCooldown > 0) return;
    this.hornCooldown = 55 + Math.random() * 60;
    gameAudio.hornNote();
  }

  private startDusk(): void {
    if (this.duskStarted) return;
    this.duskStarted = true;
    const sky = this.world.skyUniforms;
    const t = this.tweens;
    t.parallel(
      t.rgb(sky.topColor, { r: 0x3e / 255, g: 0x2f / 255, b: 0x5b / 255 }, 6),
      t.rgb(sky.horizonColor, { r: 0x6d / 255, g: 0x4c / 255, b: 0x7d / 255 }, 6),
      t.rgb(sky.groundColor, { r: 0x6d / 255, g: 0x4c / 255, b: 0x7d / 255 }, 6),
      t.rgb(this.world.sun.color, { r: 0xc7 / 255, g: 0x7d / 255, b: 0x8e / 255 }, 6),
      t.num(() => this.world.sun.intensity, (v) => { this.world.sun.intensity = v; }, phys(0.35), 6),
      t.num(() => this.world.hemi.intensity, (v) => { this.world.hemi.intensity = v; }, phys(0.45), 6),
      t.rgb(this.world.fog.color, { r: 0x6d / 255, g: 0x4c / 255, b: 0x7d / 255 }, 6),
    );
  }

  private toMorningLight(): void {
    const sky = this.world.skyUniforms;
    sky.topColor.setHex(0x8fb8cf);
    sky.horizonColor.setHex(0xffd9a0);
    sky.groundColor.setHex(0xe8c9a0);
    this.world.sun.color.setHex(PAL.amber);
    this.world.sun.intensity = phys(1.25);
    this.world.sun.position.set(-32, 31, 23); // rotation (-38, -55) in the reference
    this.world.hemi.intensity = phys(0.85);
    this.world.fog.color.setHex(0xffd9a0);
    this.duskStarted = false;
  }

  private reachTop(): void {
    const s = this.state;
    const day4 = s.step === Step.D4_CLIMB4;
    const day3 = s.step === Step.D3_CLIMB3;
    const day2 = s.step === Step.D2_CLIMB2;
    s.setStep(day4 ? Step.D4_POSTCARD : (day3 ? Step.D3_POSTCARD : (day2 ? Step.D2_POSTCARD : Step.POSTCARD)));
    this.ui.setObjective('');
    this.startDusk();
    this.player.frozen = true;
    this.ui.showNote(day4
      ? D4_CLIMB_NOTE
      : day3
      ? D3_CLIMB_NOTE
      : (day2
        ? 'Same seat. The city kept it warm for you.'
        : 'Stoop = outdoor living room. You\u2019re invited. That\u2019s the important part.'));

    // Authored rig — the proven TS-01 glide: "from mid-street up and back to
    // the south sidewalk, window to sky." The capture camera is born with the
    // same final pose (the spike's lesson: never reparent a live camera).
    this.postcardRig = true;
    this.cam.pose = 'postcard';
    const gw = { x: 13.5, y: 9, z: 7.94 };
    const lookEnd = { x: gw.x, y: gw.y + 3.0, z: gw.z };
    this.rigPos = { x: 13.5, y: 5.5, z: -1.0 };
    this.rigLook = { ...gw };
    const t = this.tweens;
    const glide = t.parallel(
      t.num(() => this.rigPos.x, (v) => { this.rigPos.x = v; }, 13.5, 2),
      t.num(() => this.rigPos.y, (v) => { this.rigPos.y = v; }, 9.5, 2),
      t.num(() => this.rigPos.z, (v) => { this.rigPos.z = v; }, -5.5, 2),
      t.num(() => this.rigLook.x, (v) => { this.rigLook.x = v; }, lookEnd.x, 2),
      t.num(() => this.rigLook.y, (v) => { this.rigLook.y = v; }, lookEnd.y, 2),
      t.num(() => this.rigLook.z, (v) => { this.rigLook.z = v; }, lookEnd.z, 2),
    );
    // Day 1 keeps the paper kit's ending beat (docs/12 §2 step 5, Doc 02
    // §26:00–30:00): the window flickers, holds gold — and ROSA SAYS WHY.
    // The kid's cold cup connects to the window; the send-off plants
    // tomorrow's usual. The emotional payoff is authored, never UI.
    const day1 = !day4 && !day3 && !day2;
    t.sequence(
      glide,
      t.wait(1.0),
      t.call(() => {
        this.lightGoldWindow();
        if (day4) { this.goldenBeat4(); gameAudio.bell(); }
        else if (day3) this.goldenBeat3();
        else if (day2) this.kidDuskWave();
        else {
          // the stoop note already rode the arrival — the wooden hats ride
          // the view up (Doc 08 note #7, first clear look from the escape)
          this.pushNote(WATER_TOWERS_NOTE);
          // Doc 08 postcard 3 (Water Towers): the same beat composes the
          // hats' keepsake — the up-west vista, filed to the album
          this.composeMomentCard('towers');
        }
      }),
      ...(day1 ? [
        t.wait(1.6),
        t.call(() => this.pushNote(GOLD_WINDOW_NOTE)), // "their first warm thing today"
        t.wait(3.2),
        t.call(() => this.pushNote(LIGHTS_OUT_NOTE)),  // "they're gonna want the usual"
        t.wait(2.4),
      ] : [
        t.wait(2.6),
      ]),
      t.call(() => this.composePostcard()),
    );
  }

  /** Day 3's golden-hour payoff: the third window flickers alive, the kid
   *  waves up from his stool, and the corner reads as a place someone keeps. */
  private goldenBeat3(): void {
    const t = this.tweens;
    const flick: ReturnType<Tweens['num']>[] = [];
    for (const e of [1.8, 0.2, 2.6, 0.0, 2.0]) {
      flick.push(t.num(() => this.world.thirdWindowMat.emissiveIntensity, (v) => { this.world.thirdWindowMat.emissiveIntensity = v; }, e, 0.13, (x) => x));
    }
    flick.push(t.num(() => this.world.thirdWindowMat.emissiveIntensity, (v) => { this.world.thirdWindowMat.emissiveIntensity = v; }, 3.2, 0.6));
    t.sequence(...flick);
    // the kid, down on his stool, waves without looking away from the cart
    if (this.world.kidGround.visible) {
      const rig = this.world.kidGround.userData.rig as PersonRig | undefined;
      if (rig) {
        rig.mode = 'wave';
        t.sequence(
          t.num(() => rig.armR.rotation.x, (v) => { rig.armR.rotation.x = v; }, -2.6, 0.3),
          t.num(() => rig.armR.rotation.z, (v) => { rig.armR.rotation.z = v; }, 0.5, 0.25),
          t.num(() => rig.armR.rotation.z, (v) => { rig.armR.rotation.z = v; }, -0.3, 0.5),
          t.call(() => {
            rig.armR.rotation.x = -0.38; rig.armR.rotation.z = -0.14;
            rig.mode = this.state.kidAtCorner ? 'sit' : 'auto';
          }),
        );
      }
    }
    this.ui.showNote(D3_GOLDEN_NOTE);
  }

  /** Day 4's golden-hour payoff: the lamp next door — the one that flickered
   *  and hesitated on Day 2 — finally stays on. Somewhere out there, someone
   *  new is reading a Map upside down. The kid waves from his stool. */
  private goldenBeat4(): void {
    const t = this.tweens;
    const flick: ReturnType<Tweens['num']>[] = [];
    for (const e of [1.2, 0.1, 2.0, 0.0, 0.6, 0.0, 1.6]) {
      flick.push(t.num(() => this.world.fourthWindowMat.emissiveIntensity, (v) => { this.world.fourthWindowMat.emissiveIntensity = v; }, e, 0.16, (x) => x));
    }
    flick.push(t.num(() => this.world.fourthWindowMat.emissiveIntensity, (v) => { this.world.fourthWindowMat.emissiveIntensity = v; }, 2.8, 0.9));
    t.sequence(...flick);
    // the kid, down on his stool, waves without looking away from the cart
    if (this.world.kidGround.visible) {
      const rig = this.world.kidGround.userData.rig as PersonRig | undefined;
      if (rig) {
        rig.mode = 'wave';
        t.sequence(
          t.num(() => rig.armR.rotation.x, (v) => { rig.armR.rotation.x = v; }, -2.6, 0.3),
          t.num(() => rig.armR.rotation.z, (v) => { rig.armR.rotation.z = v; }, 0.5, 0.25),
          t.num(() => rig.armR.rotation.z, (v) => { rig.armR.rotation.z = v; }, -0.3, 0.5),
          t.call(() => {
            rig.armR.rotation.x = -0.38; rig.armR.rotation.z = -0.14;
            rig.mode = this.state.kidAtCorner ? 'sit' : 'auto';
          }),
        );
      }
    }
    this.ui.showNote(D4_GOLDEN_NOTE);
  }

  /** Flicker, then hold (main.gd `_light_gold_window`). */
  private lightGoldWindow(): void {
    const t = this.tweens;
    const seq: ReturnType<Tweens['num']>[] = [];
    for (const e of [2.0, 0.2, 3.0, 0.0, 1.2, 0.3]) {
      seq.push(t.num(() => this.world.goldWindowMat.emissiveIntensity, (v) => { this.world.goldWindowMat.emissiveIntensity = v; }, e, 0.12, (x) => x));
    }
    seq.push(t.num(() => this.world.goldWindowMat.emissiveIntensity, (v) => { this.world.goldWindowMat.emissiveIntensity = v; }, 4.0, 0.6));
    t.sequence(...seq);
  }

  private kidDuskWave(): void {
    if (!this.world.kidSil.visible) return;
    const kid = this.world.kidSil;
    const rig = kid.userData.rig as PersonRig | undefined;
    if (rig) {
      // wave with the ARM (the old whole-body roll wobbled the kid like a
      // bowling pin) — raise the arm, wag it, bring it home
      rig.mode = 'wave';
      this.tweens.sequence(
        this.tweens.num(() => rig.armR.rotation.x, (v) => { rig.armR.rotation.x = v; }, -2.6, 0.3),
        this.tweens.num(() => rig.armR.rotation.z, (v) => { rig.armR.rotation.z = v; }, 0.5, 0.25),
        this.tweens.num(() => rig.armR.rotation.z, (v) => { rig.armR.rotation.z = v; }, -0.3, 0.5),
        this.tweens.num(() => rig.armR.rotation.z, (v) => { rig.armR.rotation.z = v; }, 0.5, 0.5),
        this.tweens.call(() => { rig.armR.rotation.x = 0; rig.armR.rotation.z = -0.09; rig.mode = 'auto'; }),
      );
    }
    const flick: ReturnType<Tweens['num']>[] = [];
    for (const e of [1.5, 0.3, 2.2, 0.2, 1.8]) {
      flick.push(this.tweens.num(() => this.world.secondWindowMat.emissiveIntensity, (v) => { this.world.secondWindowMat.emissiveIntensity = v; }, e, 0.14, (x) => x));
    }
    flick.push(this.tweens.num(() => this.world.secondWindowMat.emissiveIntensity, (v) => { this.world.secondWindowMat.emissiveIntensity = v; }, 3.2, 0.6));
    this.tweens.sequence(...flick);
    this.ui.showNote('The kid waves from the window you lit. The lamp next door flickers, thinks about it, and stays on too.');
  }

  private warmRosaWindow(): void {
    const t = this.tweens;
    t.sequence(
      t.num(() => this.world.rosaWindowMat.emissiveIntensity, (v) => { this.world.rosaWindowMat.emissiveIntensity = v; }, 2.4, 1.2),
      t.wait(1.6),
      t.num(() => this.world.rosaWindowMat.emissiveIntensity, (v) => { this.world.rosaWindowMat.emissiveIntensity = v; }, 1.1, 2.0),
    );
  }

  private composePostcard(): void {
    const s = this.state;
    const caption = composeCaption({
      day: s.day, replay: s.replayDay, dayStartMoney: s.dayStartMoney, money: s.money, cartName: s.cartName,
      awningUp: s.awningUp, // Day 2 without shade says so kindly (Doc 33 §5.1)
    });
    this.lastPostcardCaption = caption;
    this.lastPostcardKind = 'day';
    this.lastPostcardTag = undefined;
    if (s.day > 1) s.dayComplete = true;
    s.setStep(s.day >= 4 ? Step.D4_POSTCARD : (s.day === 3 ? Step.D3_POSTCARD : (s.day > 1 ? Step.D2_POSTCARD : Step.DONE)));
    this.ui.setObjective('');

    let url: string;
    try {
      // TS-01's born-inside capture camera: fov 55, 768×1160, final glide pose.
      const capCam = new THREE.PerspectiveCamera(55, 768 / 1160, 0.1, 400);
      capCam.position.set(this.rigPos.x, this.rigPos.y, this.rigPos.z);
      capCam.lookAt(this.rigLook.x, this.rigLook.y, this.rigLook.z);
      const result = capturePostcard(
        this.renderer, this.world.scene, capCam, caption, s.cartName || 'First Slice', s.day,
        'october', // days 1–4 are one golden October week — the stamp knows it
      );
      url = result.dataUrl;
      this.lastPostcardUrl = url;
      capCam.dispose();
    } catch (err) {
      // Still compose the panel (caption is the emotional beat); report the capture issue.
      this.ui.showError(`Postcard capture failed: ${(err as Error).message}`);
      url = '';
    }
    this.ui.showPostcard(url, caption);
    gameAudio.dayKept(); // the day was held — the postcard slides out to it
    // the day card owns the panel from here — if the Wow card was somehow
    // still up, its light-path Stay must never eat the day-end's cleanup
    // (postcardRig lives on the day path; losing it strands the camera)
    this.wowPostcard = false;
    this.persist();
  }

  /** The Wow Walk's postcard (docs/51 B10): a REAL shareable card at the
   *  wonder moment — Doc 02's beat #1, Doc 07's UGC flywheel. The story
   *  machine stays sacred: no step moves, no day completes; the card rides
   *  the same capture → caption → panel path as the day-end card, and its
   *  Stay takes the light path in dismissPostcard(). The pose is the
   *  square's authored vista — the beat fires on first entry and the only
   *  way into the square is the subway stairs at x −335.6, so the player is
   *  standing in exactly this frame when the beat lands (the day-end card's
   *  authored-rig precedent, TS-01). Captured mid-hold: the beat lands at
   *  syncT 0, this runs at +1.5 s, the warm hold spans 1.2..3.8 s. */
  private composeWowPostcard(): void {
    // a day-end card (or another Wow card) already owns the panel — the
    // wonder moment never fights the story for the paper
    if (this.wowPostcard || this.postcardRig || !this.ui.postcardPanel.hidden) return;
    const s = this.state;
    const caption = tsWowCaption({ day: s.day, cartName: s.cartName || 'First Slice' });
    this.lastPostcardCaption = caption;
    this.lastPostcardKind = 'wow';
    this.lastPostcardTag = 'THE SQUARE';
    const capCam = new THREE.PerspectiveCamera(55, 768 / 1160, 0.1, 400);
    // the arrival view, held: from mid-plaza the stacked south tower fills
    // the portrait frame — screens top-two-thirds, warm plaza below (the
    // first pose hugged the facade; the vista lives one block back)
    capCam.position.set(-326, 1.9, 10.5);
    capCam.lookAt(-326, 13.5, -7.9); // the stacked south screens straight-on — the tower, warm, owns the frame
    try {
      const result = capturePostcard(
        this.renderer, this.world.scene, capCam, caption,
        s.cartName || 'First Slice', s.day,
        'october', // days 1–4 are one golden October week — the stamp knows it
      );
      this.lastPostcardUrl = result.dataUrl;
      this.wowPostcard = true;
      this.ui.showPostcard(result.dataUrl, caption, 'Back to the square');
      // the paper holds the hands (the B7 contract): the sync is a STOP —
      // look up, keep the card, go back to the square when ready. Freezing
      // here also closes the walk-away race: the moment cannot be half-lived.
      this.player.frozen = true;
    } catch (err) {
      // the note already carried the beat; a failed capture must never
      // wedge the walk (the day-end card shows the error instead — it has
      // the whole day riding on the panel; this one doesn't)
      console.warn('wow postcard capture failed:', (err as Error).message);
    } finally {
      capCam.dispose();
    }
  }

  /** The card's filename — Keep and Share agree on it, so a re-shared card
   *  never renames itself behind the player's back. */
  private postcardFilename(): string {
    return this.wowPostcard
      ? `first_slice_times_square_day${this.state.day}.png`
      : `first_slice_postcard_day${this.state.day}.png`;
  }

  /** Doc 08 §2 — the Day-1 moment cards (P2 First Rush, P3 Water Towers,
   *  P4 The Fold, P5 Your Corner). REAL captures at their moments, filed
   *  straight to the album: no panel, no freeze, no story move — the first
   *  postcard (the square) stays the one that simply happens to you, and
   *  these are the paper the day leaves behind. Each moment already carries
   *  its note; a capture that fails never wedges the beat (the wow card's
   *  precedent). Poses are authored rigs (the TS-01 precedent): P2/P4 look
   *  down Rosa's counter to the warm window; P3 is the up-west vista where
   *  the wooden hats clear the roofline; P5 stands across the corner from
   *  the newly named cart. */
  private composeMomentCard(kind: MomentCardKind): void {
    const s = this.state;
    if (s.day !== 1) return; // Doc 08 is the Day-1 content pack
    const cartName = s.cartName || 'First Slice';
    const caption = kind === 'rush' ? MOMENT_RUSH_CAPTION
      : kind === 'towers' ? MOMENT_TOWERS_CAPTION
      : kind === 'fold' ? MOMENT_FOLD_CAPTION
      : momentCornerCaption(cartName);
    const capCam = new THREE.PerspectiveCamera(55, 768 / 1160, 0.1, 400);
    if (kind === 'towers') {
      // up-west from the escape's height: the tank clears the south
      // roofline against the dusk sky (the corner's own first clear view)
      capCam.position.set(7, 15.5, -3.5);
      capCam.lookAt(-14, 17.5, -12.5);
    } else if (kind === 'corner') {
      // across the corner from the cart — the frame the name now owns
      capCam.position.set(0.6, 1.8, -2.0);
      capCam.lookAt(4, 1.2, -6.6);
    } else {
      // inside Rosa's: the fold frames the counter from the aisle (the top
      // runs diagonally to the door light); the rush frames the storefront
      // itself — the warm window, the awning, ROSA'S — the light slanting
      // through is a street-side truth (the interior pier hides the glass)
      if (kind === 'fold') {
        // the doorway frame-in-frame: folding it while walking — the warm
        // thing in your hands, the street waiting through the gap (pulled
        // back so the piers frame the world; the awning closes the top)
        capCam.position.set(-16.0, 1.7, 14.2);
        capCam.lookAt(-16.0, 1.45, 8.4);
      } else {
        capCam.position.set(-12.6, 2.0, 5.0);
        capCam.lookAt(-17.4, 2.1, 8.4);
      }
    }
    try {
      const result = capturePostcard(
        this.renderer, this.world.scene, capCam, caption,
        cartName, s.day, 'october',
      );
      const id = entryId(s.day, 'wow', caption);
      this.sessionFull.set(id, result.dataUrl); // this session re-prints full-size
      void (async () => {
        try {
          const thumb = await makeThumb(result.dataUrl);
          this.album = addToAlbum(this.album, {
            id, day: s.day, kind: 'wow', caption, cartName, thumb,
            keptAt: Date.now(), tag: MOMENT_TAGS[kind],
          });
          this.album = storeAlbum(this.album);
          this.ui.setAlbumCount(this.album.length); // the badge ticks — the cue
        } catch { /* the shelf never wedges a beat */ }
      })();
    } catch {
      // the moment already carries its note; a failed capture must never
      // wedge the walk (the wow card's law)
    } finally {
      capCam.dispose();
    }
  }

  /** Keep = paper on the album shelf + the download copy (the same click).
   *  The shelf stores the thumb — a print, not the negative; the full card
   *  rides session memory for this visit's re-prints. Idempotent: keeping
   *  twice is still one card (the id is day+kind+caption). */
  private async fileAlbumCard(): Promise<void> {
    const url = this.lastPostcardUrl;
    if (!url) return;
    const id = entryId(this.state.day, this.lastPostcardKind, this.lastPostcardCaption);
    this.sessionFull.set(id, url);
    const thumb = await makeThumb(url);
    this.album = addToAlbum(this.album, {
      id,
      day: this.state.day,
      kind: this.lastPostcardKind,
      caption: this.lastPostcardCaption,
      cartName: this.state.cartName || 'First Slice',
      thumb,
      keptAt: Date.now(),
      tag: this.lastPostcardTag,
    });
    // storeAlbum quota-degrades on its own and returns what actually stuck —
    // the badge counts the shelf, never the wish
    this.album = storeAlbum(this.album);
    this.ui.setAlbumCount(this.album.length);
  }

  /** The platform share sheet; where it can't take files the card downloads
   *  (the button itself only shows where it can — canShareFiles's law). */
  private async shareCurrentPostcard(): Promise<void> {
    if (!this.lastPostcardUrl) return;
    const where = await sharePostcard(this.lastPostcardUrl, this.postcardFilename());
    if (where === 'downloaded') {
      this.ui.showNote('Saved to your downloads — no share sheet here, so the paper went there.');
    }
  }

  private toggleAlbum(): void {
    if (!this.ui.albumPanel.hidden) {
      this.ui.hideAlbum();
      return;
    }
    this.ui.showAlbum(this.album);
  }

  /** A tap on a shelf card re-prints it: full-size if this session kept the
   *  paper, album-size if it came from an older visit (the shelf says so). */
  private pickFromAlbum(id: string): void {
    const entry = this.album.find((e) => e.id === id);
    if (!entry) return;
    const full = this.sessionFull.get(id);
    downloadPostcard(full ?? entry.thumb,
      `first_from_the_album_day${entry.day}${entry.kind === 'wow' ? '_times_square' : ''}.png`);
    if (!full) this.ui.showNote('From the shelf — this one prints at album size.');
  }

  private dismissPostcard(): void {
    if (this.wowPostcard) {
      // the Wow card is a moment, not a story beat (docs/51 B10): the day
      // machine stays sacred — put the walk back and nothing else
      this.wowPostcard = false;
      this.ui.hidePostcard();
      this.player.frozen = false;
      return;
    }
    this.ui.hidePostcard();
    this.player.frozen = false;
    this.postcardRig = false;
    this.cam.pose = 'follow';
    const effects = this.state.dismissPostcard();
    for (const e of effects) this.applyEffect(e);
    if (this.state.step === Step.POSTCARD || this.state.step === Step.D2_POSTCARD || this.state.step === Step.D3_POSTCARD || this.state.step === Step.D4_POSTCARD) {
      this.ui.setObjective(LINGER_OBJECTIVE);
    }
  }

  confirmName(raw: string): void {
    if (this.state.step !== Step.NAME_CART) return;
    this.ui.closeNameBox();
    this.player.frozen = false;
    for (const e of this.state.confirmName(raw)) this.applyEffect(e);
  }

  /** Test/E2E hooks — reads only, no gameplay authority. */
  readonly debug = {
    duskStarted: () => this.duskStarted,
    postcardRig: () => this.postcardRig,
    dayFading: () => this.dayFading,
    goldIntensity: () => this.world.goldWindowMat.emissiveIntensity,
    rosaIntensity: () => this.world.rosaWindowMat.emissiveIntensity,
    secondIntensity: () => this.world.secondWindowMat.emissiveIntensity,
    thirdIntensity: () => this.world.thirdWindowMat.emissiveIntensity,
    fourthIntensity: () => this.world.fourthWindowMat.emissiveIntensity,
    cupVisible: () => this.cupProp.visible,
    caption: () => document.getElementById('postcard-caption')?.textContent ?? '',
    objective: () => this.ui.objectiveText,
    receiptVisible: () => this.world.permitReceipt.visible,
    washerRunning: () => this.world.isWasherRunning(),
    permitConfirm: () => this.state.permitConfirm,
    permitFiled: () => this.state.permitFiled,
    // the serving conversation + the Map notebook (docs/12) — reads only
    pendingCardId: () => this.state.pendingCard?.id ?? null,
    orderResponded: () => this.state.orderResponded,
    orderCardHidden: () => this.ui.orderCard.hidden,
    orderResponseText: () => this.ui.orderResponseText,
    noteText: () => document.getElementById('note')?.textContent ?? '',
    mapNotes: () => [...this.state.mapNotes],
    mapSlang: () => [...this.state.mapSlang],
    visitedPlaces: () => [...this.state.visitedPlaces],
    mapOpen: () => this.mapOpen,
    kidDay1Served: () => this.state.kidDay1Served,
    // docs/51 B6 tripwire: the occlusion buffer is sized once, at camera
    // construction. True today because every canopy push happens inside the
    // World constructor — if anyone grows canopies after boot, this goes
    // false and the fade silently misses the new trees.
    occlusionInSync: () => this.cam.occlusion.length === this.world.canopySpheres().length,
    // the living block (Doc 33) — reads only, for the visual probes
    ambientWindows: () => [
      this.world.ambientWindowMatLate.emissiveIntensity,
      this.world.ambientWindowMatNew.emissiveIntensity,
      this.world.ambientWindowMatRiser.emissiveIntensity,
    ],
    barrierVisible: () => this.world.barrier.visible,
    patchVisible: () => this.world.asphaltPatch.visible,
    flyerDay: () => this.world.dressedDay,
    familiar: () => ({
      visible: this.world.familiar.visible,
      x: this.world.familiar.position.x,
      z: this.world.familiar.position.z,
      mode: (this.world.familiar.userData.rig as PersonRig | undefined)?.mode ?? 'auto',
    }),
    // Doc 02 §10:00–15:00 — the street performer's listen (reads only)
    listenFired: () => this.listenDone,
    listenActive: () => this.listenT >= 0 && this.listenT < Game.LISTEN_SECONDS,
    rosaCorner: () => ({ x: this.world.rosa.position.x, z: this.world.rosa.position.z }),
  };

  private applyCartIdentity(name: string): void {
    this.world.cartMat.color.setHex(PAL.gold);
    this.world.cartMat.transparent = false;
    this.world.cartMat.opacity = 1;
    this.world.cartMat.needsUpdate = true;
    this.world.stringLights.visible = true;
    if (name) {
      this.world.setCartSignText(name);
      this.world.cartSign.visible = true;
      this.world.setFlyerText(name); // the flyer at the subway learns your name too
    }
  }

  // ------------------------------------------------------------------ customers

  private spawnCustomer(who: 'rush' | 'solo' | 'idris' | 'lunch', x: number, z: number): void {
    this.removeCustomer();
    const isIdris = who === 'idris';
    const color = isIdris ? PAL.plum : lighten(PAL.teal, Math.random() * 0.3);
    const skin = isIdris ? 0x8a5a3b : [0xe8b08e, 0xd9a06b, 0x8a5a3b, 0xc98d68][Math.floor(Math.random() * 4)];
    const hair = isIdris ? 0x241f1c : [0x3a3440, 0x4a3a30, 0x2b2730, 0x9a938c][Math.floor(Math.random() * 4)];
    const g = isIdris ? this.world.buildPerson({ jacket: color, pants: PAL.ink, skin, hair, style: 'cap', glasses: true })
      : this.world.makeCustomerVisual(color, skin, hair);
    g.position.set(x, 0.05, z);
    // face the cart you're ordering from (the cart sits SOUTH of the spawn
    // point at (4, -4.6); the default +Z facing had every customer staring
    // at the street while they ordered). Idris's walk-in tween re-faces him
    // along his route, so this default never fights the choreography.
    g.rotation.y = Math.PI;
    g.name = isIdris ? 'MrIdris' : 'Customer';
    // Day 3+4 rush: every order is a real order — the bubble says what's wanted.
    // Day 1 too now: the paper-kit cards (docs/12) — the customer's order is
    // legible from across the counter, and the conversation carries the rest.
    const s = this.state;
    let day1Bubble: string | null = null;
    if (s.step === Step.RUSH) day1Bubble = RUSH_CARDS[s.rushServed]?.bubble ?? null;
    else if (s.step === Step.SOLO) day1Bubble = SOLO_CARDS[s.soloServed]?.bubble ?? null;
    if (day1Bubble) {
      const bubble = this.world.makeOrderBubble(day1Bubble);
      bubble.position.set(0, 2.35, 0);
      g.add(bubble);
    }
    const queue = s.step === Step.D4_RUSH ? D4_ORDERS : D3_ORDERS;
    const order = queue[s.rushIndex];
    if ((s.step === Step.D3_RUSH || s.step === Step.D4_RUSH) && order) {
      const bubble = this.world.makeOrderBubble(order.bubble);
      bubble.position.set(0, 2.35, 0);
      g.add(bubble);
    }
    this.world.scene.add(g);
    this.customer = g;
    this.cast.push(g); // joins the idle-breathe pass; rig speed stays 0
  }

  private removeCustomer(): void {
    if (!this.customer) return;
    this.world.scene.remove(this.customer);
    this.customer.traverse((o: THREE.Object3D) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      } else if (o instanceof THREE.Sprite) {
        // the order bubble rides along with the customer — free it too
        const m = o.material as THREE.SpriteMaterial;
        m.map?.dispose();
        m.dispose();
      }
    });
    const i = this.cast.indexOf(this.customer);
    if (i >= 0) this.cast.splice(i, 1);
    this.customer = null;
  }

  private showKid(): void {
    const kid = this.world.kidSil;
    kid.visible = true;
    this.tweens.sequence(
      this.tweens.num(() => kid.position.y, (v) => { kid.position.y = v; }, 8.66, 1.1),
      this.tweens.num(() => kid.position.y, (v) => { kid.position.y = v; }, 8.6, 1.1),
    );
  }

  // ------------------------------------------------------------------ day 3

  /** The kid, at the bottom of the stoop — ground level, first time ever.
   *  The window silhouette goes dark: he can't be at the glass and on the
   *  street at the same time (canon — continuity of one kid). */
  private showKidGround(): void {
    const kid = this.world.kidGround;
    kid.visible = true;
    this.world.kidSil.visible = false;
    kid.position.set(15, 0.05, 6.35);
    kid.rotation.y = Math.PI;
  }

  /** He follows at your hip — close behind, never shoveled forward.
   *  Teleport-rescue only if the gap becomes absurd (stuck behind a car). */
  private updateKidFollow(dt: number): void {
    const kid = this.world.kidGround;
    const p = this.player.capsule;
    const dx = p.x - kid.position.x;
    const dz = p.z - kid.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 13) {
      // rescue: re-place him just behind you (children are not speedruns)
      kid.position.set(p.x - Math.sin(this.player.rotationY) * 0.8, 0.05, p.z - Math.cos(this.player.rotationY) * 0.8);
      return;
    }
    const stop = 1.0; // he stops at your hip, not inside you
    if (dist > stop) {
      const speed = Math.min(3.8, (dist - stop) * 2.2 + 0.6);
      const step = Math.min(dist - stop, speed * dt);
      // the kid is a physical body now (agent-2 doc 35): he steers around
      // benches, trunks and the cart with the same axis-slide the walker
      // uses, instead of ghosting through the street on his way to you
      const kc = this.kidCapsule;
      kc.x = kid.position.x; kc.y = kid.position.y; kc.z = kid.position.z;
      moveAxisX(this.world.colliders, kc, (dx / dist) * step, 0.35);
      moveAxisZ(this.world.colliders, kc, (dz / dist) * step, 0.35);
      kid.position.x = kc.x;
      kid.position.z = kc.z;
      kid.rotation.y = Math.atan2(dx, dz); // he walks facing where he's going
    } else if (dist > 0.5) {
      // parked at your hip he still knows you're there: ease around to face
      // you instead of freezing on his last walking heading
      kid.rotation.y = lerpAngle(kid.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 4));
    }
    // arrival: both of you at the corner, the cart within reach
    const cart = this.world.cartRoot.position;
    const kidToCart = Math.hypot(cart.x - kid.position.x, cart.z - kid.position.z);
    const youToCart = Math.hypot(cart.x - p.x, cart.z - p.z);
    if (kidToCart < 2.6 && youToCart < 3.2) {
      for (const e of this.state.kidReachesCorner()) this.applyEffect(e);
    }
  }

  /** The kid takes the stool. Root sunk, hips bent — the sit mode does it.
   *  His seat is east-south of the cart (with the stool), OUT of the serving
   *  pocket: the old spot sealed the corner between the cart's east face and
   *  his own collider, and a walker in the pocket had 27 centimetres of
   *  room. He still watches the cart and the street. */
  private sitKid(): void {
    const kid = this.world.kidGround;
    kid.visible = true;
    kid.position.set(7.15, 0.05, -6.25);
    kid.rotation.y = -1.25; // angled toward the cart, watching the street
    const rig = kid.userData.rig as PersonRig | undefined;
    if (rig) rig.mode = 'sit';
  }

  // ------------------------------------------------------------------ days

  /** The familiar face's round, reset each beginDay (Doc 33 §2.2). Days 1–3
   *  she starts hidden; Day 4 she wakes at her bench — she was sitting there
   *  when yesterday ended, and the block doesn't teleport its neighbors. */
  private resetFamiliar(n: number): void {
    const f = this.world.familiar;
    this.familiarPath = [];
    this.familiarNode = 0;
    this.familiarPausing = 0;
    const rig = f.userData.rig as PersonRig | undefined;
    f.position.set(-40.5, 0.12, 4.7); // the plaza bench, her default seat (hips level with the seat top)
    f.rotation.y = Math.PI;          // square to the street, watching
    if (n >= 4) {
      f.visible = true;
      if (rig) rig.mode = 'sit';
    } else {
      f.visible = false;
    }
  }

  /**
   * The familiar face (Doc 33 §2.2) — ONE recurring neighbor with ONE
   * authored round per day, keyed on the day number and the Step machine.
   * No pathfinding, no crowd sim, no stored flag: a body, a schedule, and
   * the same cardigan every day. Escalation ladder:
   *   Day 1: absent.  Day 2: a dusk pass below the fire escape, no note.
   *   Day 3: the nod passing the cart, then the plaza bench through dusk.
   *   Day 4: she crosses back during the wash and spends one word.
   */
  private updateFamiliar(dt: number): void {
    const s = this.state;
    const f = this.world.familiar;
    const rig = f.userData.rig as PersonRig | undefined;
    const beat = familiarBeatForDay(s.day);

    // ---- entrances: day-keyed, step-keyed, one per day ----
    if (beat === 'pass' && s.step === Step.D2_CLIMB2 && !f.visible && this.familiarNode === 0) {
      // the dusk pass — below the fire escape while you watch from the ladder;
      // the block kept going without you, and nobody makes a speech about it
      f.visible = true;
      f.position.set(10, 0.05, -5.55);
      if (rig) rig.mode = 'auto';
      this.familiarPath = [
        { x: 4.6, z: -5.55, dwell: 0.4 },
        { x: -26, z: -5.55, hide: true },
      ];
    }
    if (beat === 'nod' && s.step === Step.D3_KIDDOWN && !f.visible && this.familiarNode === 0) {
      // the nod — she passes the cart while you walk the kid to the stoop,
      // then claims the plaza bench for the evening. Her lane is NORTH of
      // the cart (z -5.55: south of Rosa, north of the cart's body and the
      // kid's stool — the corner's one clear sidewalk line)
      f.visible = true;
      f.position.set(11, 0.05, -5.55);
      if (rig) rig.mode = 'auto';
      this.familiarPath = [
        { x: 4.6, z: -5.55, dwell: 0.9, note: FAMILIAR_NOD_NOTE },
        { x: -5.7, z: -5.55 },
        { x: -5.7, z: 6.2 },   // the crosswalk, straight down the stripes
        { x: -38.5, z: 6.2 },
        { x: -40.5, z: 5.05 },
        { x: -40.5, z: 4.7, sit: true },
      ];
    }
    if (beat === 'word' && s.step === Step.D4_PERMIT && s.apronWashing
      && this.familiarNode === 0 && this.familiarPath.length === 0) {
      // she crossed out here for this: a wash is a neighbor event
      f.visible = true;
      f.position.set(-40.5, 0.12, 4.7);
      if (rig) rig.mode = 'auto';
      this.familiarPath = [
        { x: -40.5, z: 5.05 },
        { x: -38.5, z: 6.2 },
        { x: -5.7, z: 6.2 },
        { x: -5.7, z: -5.55 }, // the crosswalk, and the cab waits for her
        { x: 4.6, z: -5.55, dwell: 0.9, note: FAMILIAR_WORD_NOTE },
        { x: 16, z: -5.55, hide: true },
      ];
    }

    if (!f.visible || rig === undefined) return;

    // ---- the walk: unhurried, waypoint to waypoint, sidewalk-honest ----
    if (this.familiarPausing > 0) {
      this.familiarPausing -= dt; // she stops for the nod, the word — not for you
      return;
    }
    const stop = this.familiarPath[this.familiarNode];
    if (!stop) return;
    const dx = stop.x - f.position.x;
    const dz = stop.z - f.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) {
      if (stop.note) this.ui.showNote(stop.note);
      if (stop.dwell) this.familiarPausing = stop.dwell;
      if (stop.sit && rig) {
        rig.mode = 'sit';
        f.position.set(stop.x, 0.12, stop.z); // hips level with the bench seat (0.5)
        f.rotation.y = Math.PI;
        this.familiarNode++;
        return;
      }
      if (stop.hide) f.visible = false;
      this.familiarNode++;
      return;
    }
    const step = Math.min(dist, FAMILIAR_SPEED * dt);
    f.position.x += (dx / dist) * step;
    f.position.z += (dz / dist) * step;
    f.rotation.y = Math.atan2(dx, dz); // she faces where she's going
    // rig measures the delta → the walk cycle is free (personRig contract)
  }

  /** main.gd `_begin_day` — used for boot-resume and the rail's "Tomorrow". */
  private async beginDay(n: number, sd: SaveData | null, completed: boolean): Promise<void> {
    const s = this.state;
    // no morning starts seated — stand before the world moves (and before
    // the fade teleports the capsule out from under the bench)
    this.standUp();
    this.dayFading = true;
    this.player.frozen = true;
    await this.ui.fadeOut(700);

    s.day = n;
    this.world.setWorldDay(n); // the sync beat is day-keyed (docs/50)
    s.onDay2 = n >= 2;
    s.dayComplete = false;
    s.elapsed = 0;
    s.replayDay = completed;
    s.replayNoteShown = false;
    this.duskStarted = false;
    this.postcardRig = false;
    this.cam.pose = 'follow';
    s.lingerStage = 0;
    s.awningConfirm = false;
    this.ladderHintPending = false;
    this.reachedTopFired = false;
    this.idrisWalkStarted = false;
    s.idrisServed = false;
    s.lunchServed = 0;
    if (sd !== null) {
      s.idrisServed = sd.idris_served;
      s.lunchServed = sd.lunch_served;
    }
    if (s.replayDay) {
      s.idrisServed = false;
      s.lunchServed = 0;
    }
    s.idrisArrived = false;
    this.removeCustomer();
    // the new block's morning resets (docs/38/49): a fresh day is a fresh
    // streak, an uncut head, an idle drum. The ball lands wherever the last
    // day left it — the court rolls it home before the fade lifts.
    this.court.resetForNewDay();
    if (this.freeWashRunning) {
      // a wash left running when the day rolled over finishes quietly
      this.freeWashRunning = false;
      this.freeWashTimer = 0;
      this.world.setWasherRunning(false);
    }
    s.trimToday = false;
    // a fresh morning never starts mid-conversation, and the notebook stays
    // shut until asked (docs/12: Map never opens itself)
    s.pendingCard = null;
    s.orderResponded = false;
    this.ui.hideOrderCard();
    this.mapOpen = false;
    this.ui.closeMap();
    this.noteQueue.length = 0;
    this.noteAge = 999;
    if (sd !== null) {
      s.cartName = sd.cart_name;
      if (isStarterId(sd.starter)) s.starterId = sd.starter!;
      s.money = sd.money;
      s.awningUp = sd.awning;
      s.kidKept = sd.kid_kept;
      s.stoolUp = sd.stool ?? false;
      s.mapGiven = sd.map_given ?? false;
      s.permitFiled = sd.permit ?? false;
      // the Map's pages come with it (optional v1-safe fields — an old save
      // is an empty notebook, by the same migration law as the counters)
      s.mapNotes = (sd.map_notes ?? []).slice(0, 24);
      s.mapSlang = (sd.map_slang ?? []).slice(0, 8);
      s.visitedPlaces = (sd.map_places ?? []).slice(0, 12);
      s.priyaLinesCopied = sd.map_priya_lines ?? false;
      // a returning save's crooked copy is already on the page (docs/51 B11):
      // the UI latch rides the save, not the session
      if (s.priyaLinesCopied) this.ui.revealPriyaLines();
      // the block remembers (Doc 37 §3F): cumulative free-roam choices
      // survive the night — absent in an old save reads as 0, by migration
      s.shelfBuys = sd.shelf_buys ?? 0;
      s.dogBuys = sd.dog_buys ?? 0;
      s.trims = sd.trims ?? 0;
      s.washes = sd.washes ?? 0;
      s.hoopMakes = sd.hoop_makes ?? 0;
      // the diary watermark rides the same migration law (absence = owes
      // no notes); a mid-day resume re-reads it before the drain below
      s.diaryNoted = sd.diary_noted ?? {};
      // the in-game calendar + the field diary ride the same law
      // (narrative/14 R3+R4): post-parse both fields are always
      // materialized, so a resume is exact — the calendar lands on the
      // saved day, the diary on its saved entries (already
      // quarantine-cleaned in parseSave); absence in a hand-built snapshot
      // reads as an empty diary (the migration law)
      s.fieldDiary = sd.field_diary ?? [];
    }
    // sd === null (a rail "Tomorrow"): the live state carries the wallet, the
    // name, the awning — and the STOOL. The stool is bought, the Map is
    // given; no morning un-buys a chair. (The old code reset the stool here —
    // harmless while only Day 3 followed the rail, a continuity bug the
    // moment Day 4 began expecting its furniture.)
    // day-start money snapshot (Doc 22's "$112 → $111" math; the reference
    // never updates day_start_money on Day 2 — fixed here as intended behavior).
    s.dayStartMoney = (sd !== null && sd.day_start_money !== undefined) ? sd.day_start_money : s.money;
    // the calendar advances with the story day (narrative/14 R4). A save
    // resume lands on the saved day; the rail's "Tomorrow" (sd === null)
    // walks one day forward, and a replayed day never double-advances
    // (max() — the same morning twice is one morning to the calendar).
    s.calendarDay = sd !== null ? (sd.calendar_day ?? n) : Math.max(s.calendarDay, n);
    // day-3/4 morning state resets fresh each begin (mid-day saves resume at the morning)
    s.rushIndex = 0;
    s.brewing = false;
    this.brewTimer = 0;
    this.brewingNoteShown = false;
    s.kidDown = false;
    s.kidAtCorner = false;
    s.stoolConfirm = false;
    s.buyConfirm = null; // an offer never survives the night
    s.posterSeen = false;
    s.strangerMet = false;
    s.strangerAtCart = false;
    // the afternoon resets too — but a FILED permit never un-files (the
    // stool rule: no morning un-buys progress; only a parsed save may set it)
    s.apronWashing = false;
    s.apronClean = false;
    s.permitConfirm = false;
    this.washTimer = 0;
    this.world.setWasherRunning(false);
    this.world.stranger.visible = false;
    this.ui.setMoneyQuiet(s.money);
    if (s.cartName) this.applyCartIdentity(s.cartName);
    this.world.cartAwning.visible = s.awningUp; // rebuild the world to match the save
    this.world.stool.visible = s.stoolUp;
    this.world.setPermitReceiptVisible(s.permitFiled); // the receipt survives the night
    this.world.kidGround.visible = false;
    // the living block dresses for the day (Doc 33 §2.3 — windows, barrier,
    // the board's slip) before the flyer learns your name; then the familiar
    // face gets her day's schedule (§2.2)
    this.world.dressDay(n);
    this.restockShelf(); // the shelf is stocked every morning (Doc 37 §3C)
    this.resetFamiliar(n);
    this.world.setFlyerText(s.cartName || 'YOUR CORNER'); // the flyer learns your name
    this.toMorningLight();
    this.worldSim.onStoryDayBegin(n); // the world clock may fast-forward to the story's morning (one-way)
    if (n >= 4) this.placeDay4Cast();
    else if (n === 3) this.placeDay3Cast();
    else this.placeDay2Cast();
    this.player.capsule.x = 3; this.player.capsule.y = 0.05; this.player.capsule.z = -5.4;
    this.player.vy = 0;
    this.player.ladder = null;
    this.player.frozen = false;
    this.checkpoint = { x: 3, y: 0.05, z: -5.4 };
    this.world.goldWindowMat.emissiveIntensity = 4.0; // the kid's window stays lit — Day 1 happened
    this.world.secondWindowMat.emissiveIntensity = 0;
    this.world.thirdWindowMat.emissiveIntensity = 0;
    this.world.fourthWindowMat.emissiveIntensity = 0;
    if (s.kidKept && n < 4) this.showKid(); // in the glass until Day 4 — down here, he lives at the corner

    if (n >= 4) {
      // the kid LIVES at the corner now — he takes his stool at sunrise
      if (s.stoolUp) {
        this.sitKid();
        s.kidDown = true;
        s.kidAtCorner = true;
      }
      s.setStep(Step.D4_WAKE);
      this.ui.setObjective(s.objectiveText());
      this.ui.setBeatMarker(s.beatPlaceId());
      this.ui.showNote(DAY4_BEGIN_NOTE);
    } else if (n === 3) {
      s.setStep(Step.D3_WAKE);
      this.ui.setObjective(s.objectiveText());
      this.ui.setBeatMarker(s.beatPlaceId());
      this.ui.showNote(DAY3_BEGIN_NOTE);
      // a kept Day 3, replayed: the kid already lives at the corner now
      if (s.replayDay && s.stoolUp && s.kidKept) {
        this.sitKid();
        s.kidDown = true;
        s.kidAtCorner = true;
      }
    } else {
      s.setStep(Step.D2_WAKE);
      this.ui.setObjective(s.objectiveText());
      this.ui.setBeatMarker(s.beatPlaceId());
      this.ui.showNote(`Day ${n}. The cart is still yours. That part never resets.`);
    }

    // day-start snapshot — this is what a restart (R) or a quit comes back to
    this.persist();
    for (const e of s.advanceDay2()) this.applyEffect(e);

    this.ui.showTitle(`DAY ${n}`);
    await this.ui.fadeIn(900);
    this.dayFading = false;
  }

  /** main.gd `_place_day2_cast`. */
  private placeDay2Cast(): void {
    const rosa = this.world.rosa;
    rosa.position.set(-16, 0.05, 7.6);
    rosa.visible = true;
    rosa.rotation.z = 0;
    // she sweeps — arm + broom now (the old whole-body z-tilt rocked her
    // like a metronome); the rig's sweep mode owns the arm from here
    const rosaRig = rosa.userData.rig as PersonRig | undefined;
    if (rosaRig) {
      rosaRig.mode = 'sweep';
      if (!this.rosaBroom) {
        this.rosaBroom = this.world.makeBroom();
        this.rosaBroom.position.set(-0.02, -0.5, 0.14); // in the right hand
        this.rosaBroom.rotation.x = -0.42;              // brush meets the pavement
        rosaRig.armR.add(this.rosaBroom);
      }
      this.rosaBroom.visible = true;
    }
    const idris = this.world.idris;
    idris.visible = true;
    idris.position.set(-2, 0.05, -4.6);
    idris.rotation.z = 0;
    if (this.state.idrisServed) {
      idris.position.set(-24, 0.05, 6.4); // already walked home
    }
  }

  /** Day 3 morning cast — Rosa visits YOUR corner (the news travels to you).
   *  Her spot is the corner's SOUTH-EAST edge, clear of the cart's west
   *  walk lane: at the old (2.1, -4.9) her body left a sub-meter gate
   *  between her collider and the cart's, and every west-side approach —
   *  crosswalk route, cart serve, kid arrival — ground against her (the
   *  walklog probe measured the walker pinned at x≈1.5 for half a minute;
   *  twice, on two machines' worth of runs). The lane now runs clear
   *  x 0..5; she keeps the corner, angled toward her cart. */
  private placeDay3Cast(): void {
    const rosa = this.world.rosa;
    rosa.position.set(6.35, 0.05, -4.3);
    rosa.rotation.y = -1.94; // facing southwest — the cart, the stool, the street
    rosa.visible = true;
    rosa.rotation.z = 0;
    const rosaRig = rosa.userData.rig as PersonRig | undefined;
    if (rosaRig) rosaRig.mode = 'auto';
    if (this.rosaBroom) this.rosaBroom.visible = false; // off duty today
    // Idris starts the rush as a customer — spawned by rosaD3Wake, hidden here
    this.world.idris.visible = false;
  }

  /** Day 4 morning cast — same corner, one chair warmer. The stranger stays
   *  hidden until Rosa's news says her name out loud. */
  private placeDay4Cast(): void {
    this.placeDay3Cast(); // Rosa at the cart, Idris waiting to spawn, broom off duty
    this.world.stranger.visible = false; // she arrives with the news
  }

  /** main.gd `_persist` — day 1 never writes. */
  persist(): void {
    const snap = this.state.snapshotForSave();
    if (snap !== null) writeSave(snap);
    this.worldSim.onStoryPersist(); // the world save rides the same beats
  }

  /** The world runtime's clock-keyed presentation flips (roam/scenario
   *  only — story days keep their authored dusk triggers). Both shipped
   *  paths are idempotent, and the M4 street plan follows the flag. */
  applySimPhase(dusk: boolean): void {
    if (dusk) this.startDusk();
    else if (this.duskStarted) this.toMorningLight();
  }

  /** The dusk flag, for the scenario/probe harnesses (the sim's D-2 flip
   *  is proven by the SAME flag the story's dusk law drives). */
  get worldDuskStarted(): boolean {
    return this.duskStarted;
  }

  /** A sim hello (the R6 door's input side, doc 09 §4.3). The lines are
   *  mechanics prose — one beat of acknowledgement — and belong to the
   *  Narrative Director to replace with real ones. */
  worldSimHello(npcId: string): Effect[] {
    const names: Record<string, string> = {
      'npc:idris_warsame': 'Mr. Idris',
      'npc:rosa_delgado': 'Rosa',
    };
    const name = names[npcId] ?? 'They';
    const lines = [
      `${name} stops to say hello.`,
      `${name} nods — whatever it was, it can wait a minute.`,
    ];
    return this.worldSim.hello(npcId, lines[(Math.max(1, this.state.day) - 1) % lines.length]);
  }

  // ------------------------------------------------------------------ misc

  private onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cam.updateFov(window.innerWidth / window.innerHeight);
  }

  /** idris walk-in (main.gd `_advance_day2` idris branch). He faces his
   *  direction of travel now — the old slide-in moved him sideways-while-facing
   *  +Z, which read exactly as the "they don't walk" complaint. */
  startIdrisWalk(): void {
    if (this.idrisWalkStarted || this.state.step !== Step.D2_IDRIS) return;
    this.idrisWalkStarted = true;
    this.idrisWalking = true; // the follow beacon rides with him too
    const idris = this.world.idris;
    idris.rotation.y = Math.PI / 2; // face +X, where he's headed
    this.tweens.sequence(
      this.tweens.num(() => this.world.idris.position.x, (v) => { this.world.idris.position.x = v; }, 4.4, 5),
      this.tweens.call(() => { this.state.idrisArrived = true; this.idrisWalking = false; }),
    );
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function lighten(hex: number, amt: number): number {
  const c = new THREE.Color(hex);
  return c.lerp(new THREE.Color(0xffffff), amt).getHex();
}
