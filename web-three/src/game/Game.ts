/**
 * Game orchestrator — the browser port of greybox-godot/scripts/main.gd.
 * Owns the render loop, applies GameState effects to the world/UI, and runs
 * the authored sequences (dusk, gold window, postcard rig, day transitions).
 * Authoritative state lives in GameState; nothing gameplay-bearing is stored
 * in the scene graph.
 */

import * as THREE from 'three';
import { GameState, Step, INTERACT_RANGE, START_MONEY, type Effect } from '../core/GameState';
import { composeCaption, MAP_NOTE_BOOT, LINGER_OBJECTIVE, DAY_DONE_OBJECTIVE } from '../core/content';
import { loadSave, writeSave, type SaveData } from '../core/Save';
import { PAL } from '../core/palette';
import { World, phys } from '../world/World';
import { Player } from '../player/Player';
import { GameCamera } from '../camera/GameCamera';
import { InputManager } from '../engine/Input';
import { Tweens, type Tween } from '../engine/tweens';
import { capsuleInBox } from '../engine/collide';
import { UI } from '../ui/UI';
import { capturePostcard, downloadPostcard } from '../postcard/PostcardCapture';
import { updatePersonAnim, type PersonRig } from '../world/personRig';

interface Interactable {
  id: string;
  pos: () => { x: number; y: number; z: number };
}

export class Game {
  readonly state = new GameState();
  readonly world = new World();
  readonly player: Player;
  readonly cam: GameCamera;
  readonly input: InputManager;
  readonly ui: UI;
  readonly tweens = new Tweens();

  private renderer: THREE.WebGLRenderer;
  /** The player's articulated visual — public readonly for the test harness. */
  readonly playerVisual: THREE.Group;
  readonly cupProp: THREE.Object3D;
  private customer: THREE.Group | null = null;
  private rosaBroom: THREE.Group | null = null;
  /** Everyone with a rig — one animator pass per frame (walk/idle/climb/sweep). */
  private readonly cast: THREE.Group[] = [];

  private dayFading = false;
  /** The save's day at boot — 1 for a fresh start. Read-once, never mutated:
   *  lets the E2E driver know the session resumed, even while beginDay's
   *  fade is still holding s.day at its default. */
  readonly bootedFromDay: number;
  private duskStarted = false;
  private postcardRig = false;
  private rosaWalking = false;
  private idrisWalking = false;
  /** Gold chevron floating over whoever the objective says to follow. */
  private waypoint: THREE.Sprite | null = null;
  private roofHidden = false;
  private climbLean = 0;
  private checkpoint = { x: -30, y: 0.05, z: 6.2 };
  private lastPostcardUrl: string | null = null;

  private wasInL1 = false;
  private wasInL2 = false;
  private ladderHintPending = false;
  private wasInsideBodega = false;
  private reachedTopFired = false;
  private idrisWalkStarted = false;
  private goldDebugFired = false;

  // postcard rig tween targets (mutated by tweens, read by the camera)
  private rigPos = { x: 0, y: 0, z: 0 };
  private rigLook = { x: 0, y: 0, z: 0 };

  private interactables: Interactable[] = [];
  private lastTime = performance.now();
  private running = true;
  private autotestStarted = false;

  constructor(container: HTMLElement) {
    // ---------------- renderer ----------------
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping; // closest to the reference's filmic
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // ---------------- systems ----------------
    this.player = new Player(this.world.colliders);
    this.cam = new GameCamera(window.innerWidth / window.innerHeight, this.world.colliders);
    this.ui = new UI();
    this.input = new InputManager({
      joyZone: document.getElementById('joy-zone')!,
      joyBase: document.getElementById('joy-base')!,
      joyStick: document.getElementById('joy-stick')!,
      btnInteract: document.getElementById('btn-interact')!,
      turnL: document.getElementById('turn-left')!,
      turnR: document.getElementById('turn-right')!,
    });

    // ---------------- player visual (a person who WALKS) -------------------
    // Playtest 2026-10-29, round two: "the characters doesn't walk, they
    // move." The rig (hip/shoulder pivots + walk cycle in personRig.ts) is
    // the visual now; the old runtime swap to static GLB mannequins is gone —
    // those exports carry zero animations and the swap also orphaned the
    // coffee cup (applyGlb's clear() detached it, so the Day-2 cup in hand
    // was invisible).
    this.playerVisual = this.world.buildPerson({
      jacket: PAL.gold, pants: PAL.ink, skin: 0xd9a06b, hair: PAL.ink, style: 'flat',
    });
    this.playerVisual.name = 'Player';
    this.cast.push(this.playerVisual);
    const cupBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.06, 0.17, 10),
      new THREE.MeshLambertMaterial({ color: PAL.cream }),
    );
    const cupLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.078, 0.03, 10),
      new THREE.MeshLambertMaterial({ color: PAL.teal }),
    );
    cupLid.position.y = 0.1;
    const cup = new THREE.Group();
    cup.add(cupBody, cupLid);
    cup.position.set(0.44, 0.9, 0.22); // in the right hand
    cup.visible = false;
    this.cupProp = cup;
    this.playerVisual.add(cup);
    this.world.scene.add(this.playerVisual);

    // the rest of the cast joins the animator (walk/idle/breathe)
    this.cast.push(this.world.rosa, this.world.idris, this.world.kidSil);

    // ---------------- interactables (main.gd `_build_interactables`) --------
    this.interactables = [
      { id: 'rosa', pos: () => this.world.rosa.position },
      { id: 'item_mango', pos: () => this.itemPos('mango') },
      { id: 'item_coffee', pos: () => this.itemPos('coffee') },
      { id: 'item_bread', pos: () => this.itemPos('bread') },
      { id: 'counter', pos: () => ({ x: -18.5, y: 0.5, z: 13.5 }) },
      { id: 'cart', pos: () => this.world.cartRoot.position },
      { id: 'idris', pos: () => this.world.idris.position },
      { id: 'stoop', pos: () => ({ x: 15, y: 0.05, z: 6.9 }) },
      { id: 'rail', pos: () => ({ x: 12.5, y: 8.0, z: -6.8 }) },
    ];
    this.world.addItem('mango', -18, 2.25, 19.2, PAL.amber);
    this.world.addItem('coffee', -16, 2.25, 19.2, PAL.teal);
    this.world.addItem('bread', -14, 2.25, 19.2, PAL.cream);

    // ---------------- boot (main.gd `_ready`) ----------------
    const save = loadSave();
    this.bootedFromDay = save.day;
    if (save.day >= 2) {
      void this.beginDay(save.day, save, save.day_complete || save.replay);
    } else {
      this.state.money = START_MONEY;
      this.state.dayStartMoney = START_MONEY;
      this.state.setStep(Step.MEET_ROSA);
      this.ui.showNote(MAP_NOTE_BOOT);
      this.ui.setMoneyQuiet(this.state.money);
    }
    this.ui.onNameSubmit = () => this.confirmName(this.ui.nameInput.value);
    this.ui.postcardKeep.addEventListener('click', () => {
      if (this.lastPostcardUrl) {
        downloadPostcard(this.lastPostcardUrl, `first_slice_postcard_day${this.state.day}.png`);
      }
    });
    this.ui.postcardStay.addEventListener('click', () => this.dismissPostcard());

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
    this.ui.showGame();

    // debug/E2E handle
    (window as unknown as { __game: Game }).__game = this;

    // E2E driver (mirrors the Godot headless autotest) — ?autotest=1
    if (new URLSearchParams(location.search).has('autotest') && !this.autotestStarted) {
      this.autotestStarted = true;
      void import('./autotest').then(({ runAutotest }) => runAutotest(this));
    }
  }

  // ------------------------------------------------------------------ frame

  private frame(dt: number): void {
    const s = this.state;

    this.tweens.update(dt);
    const inp = this.input.sample();

    if (inp.restartPressed && !this.dayFading && this.ui.nameBox.hidden) {
      location.reload(); // R = restart the day (save rules decide what resumes)
      return;
    }
    if (inp.interactPressed && !this.dayFading && this.ui.nameBox.hidden) {
      if (!this.ui.postcardPanel.hidden) this.dismissPostcard();
      else this.tryInteract();
    }

    // debug (greybox README): G forces dusk + the gold window
    if (this.input.isDown('KeyG') && !this.goldDebugFired && !this.dayFading) {
      this.goldDebugFired = true;
      this.startDusk();
      this.lightGoldWindow();
    }
    if (!this.dayFading && this.ui.nameBox.hidden) {
      // movement
      this.player.update(dt, inp.move);
    } else {
      this.player.update(dt, { x: 0, y: 0 });
    }

    // visual sync — on a ladder the body leans to the wall (visual-only
    // offset; the capsule stays authoritative for step-offs). The lean LERPS
    // now — the old hard ±0.42 snap on grab/release read as a glitch.
    const climbing = this.player.ladder !== null;
    this.climbLean += ((climbing ? -0.42 : 0) - this.climbLean) * Math.min(1, dt * 10);
    this.playerVisual.position.set(
      this.player.capsule.x,
      this.player.capsule.y,
      this.player.capsule.z + this.climbLean,
    );
    this.playerVisual.rotation.y = this.player.rotationY;

    // zones
    this.checkZones();
    this.perFrameChecks(dt);

    // camera
    const rig = this.postcardRig ? { pos: this.rigPos, look: this.rigLook } : undefined;
    this.cam.update(dt, this.player.capsule, inp.camTurn, rig?.pos, rig?.look);
    this.player.camYaw = this.cam.camYaw;

    // world life (Rule of Steam) — the taxi yields to the pedestrian
    this.world.update(dt, this.player.capsule);
    this.syncGlows();

    // the cast animates: walk when their position moved, climb on ladders,
    // sweep when Rosa's on broom duty, breathe when parked. The PLAYER's mode
    // is explicit EVERY frame — it used to only ever be set to 'climb' and
    // never reset, so one ladder ride left the arms overhead for the rest of
    // the day (playtest: "the hand was still raised up after climbing the
    // ladder"). The rest of the cast own their modes (Rosa sweeps, the kid
    // waves — a tween flips those back).
    for (const actor of this.cast) {
      if (!actor.visible) continue;
      updatePersonAnim(actor, dt, actor === this.playerVisual ? { mode: climbing ? 'climb' : 'auto' } : undefined);
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
    this.ui.setPrompt(this.nearestInteractableId(), s);

    this.renderer.render(this.world.scene, this.cam.camera);
  }

  private syncGlows() {
    const g = clamp01((this.world.goldWindowMat.emissiveIntensity ?? 0) / 4);
    (this.world.goldGlow.material as THREE.SpriteMaterial).opacity = g * 0.85;
    const g2 = clamp01((this.world.secondWindowMat.emissiveIntensity ?? 0) / 3.2);
    (this.world.secondGlow.material as THREE.SpriteMaterial).opacity = g2 * 0.8;
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
      if (this.state.step === Step.CLIMB || this.state.step === Step.D2_CLIMB2) {
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
    if (this.state.step === Step.CLIMB || this.state.step === Step.D2_CLIMB2) {
      this.ui.setObjective('Climb.');
    }
  }

  private onLadderLeave(): void {
    if (this.state.step === Step.CLIMB || this.state.step === Step.D2_CLIMB2) {
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
      if (s.step === Step.CLIMB || s.step === Step.D2_CLIMB2) {
        this.ui.setObjective('The fire escape, around the corner. Rosa will not let this go.');
        this.ui.showNote('Rosa, from somewhere behind you: \u201CFire escape! Around the corner! You found it once!\u201D');
      }
    }

    // ladders let you all the way down (climb-speed descent, floor release)
    if (this.player.ladder !== null && this.player.vy < -1.2 && c.y < 0.45) {
      this.player.ladder = null;
    }
  }

  private respawn(): void {
    this.player.vy = 0;
    this.player.ladder = null;
    this.player.capsule.x = this.checkpoint.x;
    this.player.capsule.y = this.checkpoint.y;
    this.player.capsule.z = this.checkpoint.z;
  }

  // ------------------------------------------------------------------ interact

  private itemPos(id: string): { x: number; y: number; z: number } {
    const m = this.world.itemMeshes.get(id);
    return m ? m.position : { x: 0, y: -100, z: 0 }; // collected items are never nearest
  }

  private nearestInteractableId(): string | null {
    const c = this.player.capsule;
    let best: Interactable | null = null;
    let bestD = INTERACT_RANGE;
    for (const it of this.interactables) {
      const p = it.pos();
      const d = Math.hypot(p.x - c.x, p.z - c.z);
      if (Math.abs(p.y - c.y) > 3.0) continue;
      if (d < bestD && this.state.isRelevant(it.id)) {
        bestD = d;
        best = it;
      }
    }
    return best?.id ?? null;
  }

  private tryInteract(): void {
    const id = this.nearestInteractableId();
    if (id === null) return;
    const s = this.state;
    switch (id) {
      case 'rosa':
        if (s.isDay2) {
          const { effects } = s.rosaTask();
          for (const e of effects) this.applyEffect(e);
        } else {
          for (const e of s.tryRosa()) this.applyEffect(e);
        }
        break;
      case 'counter':
        for (const e of s.serveCounter()) this.applyEffect(e);
        break;
      case 'cart':
        if (s.step === Step.CLAIM_CART) {
          for (const e of s.claimCart()) this.applyEffect(e);
        } else if (s.step === Step.SOLO || s.step === Step.D2_LUNCH) {
          if (this.customer) {
            for (const e of s.serveCart()) this.applyEffect(e);
          }
        } else if (s.isDay2 && !s.awningUp && s.money >= 15 && this.customer === null
          && s.step >= Step.D2_WAKE && s.step <= Step.D2_CLIMB2) {
          for (const e of s.cartAwningInteraction()) this.applyEffect(e);
        }
        break;
      case 'idris':
        for (const e of s.serveIdris()) this.applyEffect(e);
        break;
      case 'stoop':
        for (const e of s.deliverToKid()) this.applyEffect(e);
        break;
      case 'rail':
        for (const e of s.rail()) this.applyEffect(e);
        break;
      default:
        if (id.startsWith('item_')) {
          const itemId = id.slice(5);
          for (const e of s.collect(itemId)) this.applyEffect(e);
        }
    }
  }

  // ------------------------------------------------------------------ effects

  applyEffect(e: Effect): void {
    switch (e.kind) {
      case 'step':
        this.ui.setObjective(this.state.objectiveText());
        if (e.step === Step.DONE) this.ui.setObjective(DAY_DONE_OBJECTIVE(this.state.day));
        if (e.step === Step.D2_IDRIS) this.startIdrisWalk();
        break;
      case 'note':
        this.ui.showNote(e.text);
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
        // loud, and the player follows her through the door.
        this.startRosaWalk();
        break;
      case 'collect':
        this.world.removeItem(e.id);
        this.interactables = this.interactables.filter((it) => it.id !== `item_${e.id}`);
        break;
      case 'spawn-customer':
        this.spawnCustomer(e.who, e.x, e.z);
        break;
      case 'serve-customer':
        this.removeCustomer();
        break;
      case 'name-cart-open':
        this.player.frozen = true;
        this.ui.openNameBox();
        break;
      case 'name-cart-applied':
        this.applyCartIdentity(e.name);
        break;
      case 'crossed':
        this.checkpoint = { x: e.checkpoint.x, y: 0.05, z: e.checkpoint.z };
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
    const day2 = s.step === Step.D2_CLIMB2;
    s.setStep(day2 ? Step.D2_POSTCARD : Step.POSTCARD);
    this.ui.setObjective('');
    this.startDusk();
    this.player.frozen = true;
    this.ui.showNote(day2
      ? 'Same seat. The city kept it warm for you.'
      : 'Stoop = outdoor living room. You\u2019re invited. That\u2019s the important part.');

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
    t.sequence(
      glide,
      t.wait(1.0),
      t.call(() => {
        this.lightGoldWindow();
        if (day2) this.kidDuskWave();
      }),
      t.wait(2.6),
      t.call(() => this.composePostcard()),
    );
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
    });
    if (s.day > 1) s.dayComplete = true;
    s.setStep(s.day > 1 ? Step.D2_POSTCARD : Step.DONE);
    this.ui.setObjective('');

    let url: string;
    try {
      // TS-01's born-inside capture camera: fov 55, 768×1160, final glide pose.
      const capCam = new THREE.PerspectiveCamera(55, 768 / 1160, 0.1, 400);
      capCam.position.set(this.rigPos.x, this.rigPos.y, this.rigPos.z);
      capCam.lookAt(this.rigLook.x, this.rigLook.y, this.rigLook.z);
      const result = capturePostcard(
        this.renderer, this.world.scene, capCam, caption, s.cartName || 'First Slice', s.day,
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
    this.persist();
  }

  private dismissPostcard(): void {
    this.ui.hidePostcard();
    this.player.frozen = false;
    this.postcardRig = false;
    this.cam.pose = 'follow';
    const effects = this.state.dismissPostcard();
    for (const e of effects) this.applyEffect(e);
    if (this.state.step === Step.POSTCARD || this.state.step === Step.D2_POSTCARD) {
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
    cupVisible: () => this.cupProp.visible,
    caption: () => document.getElementById('postcard-caption')?.textContent ?? '',
    objective: () => this.ui.objectiveText,
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
    }
  }

  // ------------------------------------------------------------------ customers

  private spawnCustomer(who: 'rush' | 'solo' | 'idris' | 'lunch', x: number, z: number): void {
    this.removeCustomer();
    const isIdris = who === 'idris';
    const color = isIdris ? PAL.plum : lighten(PAL.teal, Math.random() * 0.3);
    const skin = isIdris ? 0x8a5a3b : [0xe8b08e, 0xd9a06b, 0x8a5a3b, 0xc98d68][Math.floor(Math.random() * 4)];
    const hair = isIdris ? 0x241f1c : [0x3a3440, 0x4a3a30, 0x2b2730, 0x9a938c][Math.floor(Math.random() * 4)];
    const g = isIdris ? this.world.buildPerson({ jacket: color, pants: PAL.ink, skin, hair, style: 'cap' })
      : this.world.makeCustomerVisual(color, skin, hair);
    g.position.set(x, 0.05, z);
    g.name = isIdris ? 'MrIdris' : 'Customer';
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

  // ------------------------------------------------------------------ days

  /** main.gd `_begin_day` — used for boot-resume and the rail's "Tomorrow". */
  private async beginDay(n: number, sd: SaveData | null, completed: boolean): Promise<void> {
    const s = this.state;
    this.dayFading = true;
    this.player.frozen = true;
    await this.ui.fadeOut(700);

    s.day = n;
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
    if (sd !== null) {
      s.cartName = sd.cart_name;
      s.money = sd.money;
      s.awningUp = sd.awning;
      s.kidKept = sd.kid_kept;
    }
    // Day-start money snapshot (Doc 22's "$112 → $111" math; the reference
    // never updates day_start_money on Day 2 — fixed here as intended behavior).
    s.dayStartMoney = (sd !== null && sd.day_start_money !== undefined) ? sd.day_start_money : s.money;
    this.ui.setMoneyQuiet(s.money);
    if (s.cartName) this.applyCartIdentity(s.cartName);
    this.world.cartAwning.visible = s.awningUp; // rebuild the world to match the save
    this.toMorningLight();
    this.placeDay2Cast();
    this.player.capsule.x = 3; this.player.capsule.y = 0.05; this.player.capsule.z = -5.4;
    this.player.vy = 0;
    this.player.ladder = null;
    this.player.frozen = false;
    this.checkpoint = { x: 3, y: 0.05, z: -5.4 };
    this.world.goldWindowMat.emissiveIntensity = 4.0; // the kid's window stays lit — Day 1 happened
    this.world.secondWindowMat.emissiveIntensity = 0;
    if (s.kidKept) this.showKid();

    s.setStep(Step.D2_WAKE);
    this.ui.setObjective(s.objectiveText());
    this.ui.showNote(`Day ${n}. The cart is still yours. That part never resets.`);

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
    }
    const idris = this.world.idris;
    idris.visible = true;
    idris.position.set(-2, 0.05, -4.6);
    idris.rotation.z = 0;
    if (this.state.idrisServed) {
      idris.position.set(-24, 0.05, 6.4); // already walked home
    }
  }

  /** main.gd `_persist` — day 1 never writes. */
  persist(): void {
    const snap = this.state.snapshotForSave();
    if (snap !== null) writeSave(snap);
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
