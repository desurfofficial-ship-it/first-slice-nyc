/**
 * The half-court game — the loop that turned the scripted shot into a
 * game you can actually be good at (docs/48 audit §3, §4).
 *
 * The loop: the ball rests where it landed → walk to it, press → you're
 * holding it → move and it dribbles (honest thuds) → press and HOLD → the
 * ball rises to your shot pocket while the charge meter fills and ping-
 * pongs → release inside the gold band → the ball LEAVES with that
 * velocity and physics decides everything after (rim, board, ground, net).
 *
 * There is no outcome table. `solveLaunch` gives the perfect speed for
 * where you stand; the meter's gold band is drawn around it; the release
 * speed maps from the charge curve. Same inputs → same flight, every
 * time — the skill is real, and so is the improvement.
 *
 * The block keeps score the way it always has — notes, the memory line,
 * the save's hoopMakes (Save v1 untouched) — plus the chalk tally board
 * on the wall by the hoop, which is furniture, not HUD.
 */

import * as THREE from 'three';
import { BallSim, solveLaunch, speedFor, RIM, GROUND_Y, BALL_R, clamp, isInsideCourt, type SimEvent } from './ballSim';
import { applySpin } from './Basketball';
import type { CourtNet, TallyBoard } from './courtDressing';
import { COURT_BALL_REST, byDay } from '../game/interactionDefs';
import { COURT_MAKE, COURT_MISS, COURT_STREAK_NOTE, MEMORY_LINES } from '../core/content';
import type { GameState } from '../core/GameState';
import type { UI } from '../ui/UI';
import { gameAudio } from '../game/audio';

export type CourtPhase = 'rest' | 'held' | 'charging' | 'flight' | 'return';

/** Hand/pocket offsets relative to the body (facing = sin/cos of rotY). */
const HAND_AHEAD = 0.42;   // the ball lives slightly in front of you
const HIP_Y = 0.62;        // carry height (center of ball)
const DRIBBLE_H = 0.55;    // dribble amplitude
const POCKET_Y = 1.42;     // where the ball settles as you charge
const CHARGE_RATE = 0.85;  // meter fills 0→1 in ~1.2 s, then ping-pongs

export interface CourtFrameInput {
  interactPressed: boolean;
  interactHeld: boolean;
  moveMag: number;
  px: number;
  pz: number;
  rotY: number;
}

export interface CourtDeps {
  ball: THREE.Mesh;
  ui: UI;
  state: GameState;
  net: CourtNet;
  tally: TallyBoard;
  camera: THREE.PerspectiveCamera;
  weaves: THREE.Mesh[];
}

/** Scratch vector for the weave fade (never allocated per frame). */
const FadeWP = new THREE.Vector3();

export class CourtGame {
  phase: CourtPhase = 'rest';
  streak = 0;
  private sim = new BallSim();
  private q = 0;                // charge, 0..1
  private qDir = 1;             // ping-pong direction
  private plan: ReturnType<typeof solveLaunch> | null = null;
  private dribbleT = 0;         // dribble cycle phase
  private dribbleDown = false;  // for the thud timing
  private framesSincePickup = 999;
  private frame = 0;
  private missNotePending = false;
  private flightTimeout = 0;
  // the escape return: a ball that rolled out the open gate gets rolled
  // back to the free-throw line — the court looks after its ball
  private returnT = 0;
  private returnFrom = { x: 0, y: 0, z: 0 };
  /** Where escapees come home to — public: it is the court's law, and the
   *  tests pin the handoff against it. */
  static readonly RETURN_HOME = { x: 43.4, y: GROUND_Y + BALL_R, z: 5.4 };

  constructor(private deps: CourtDeps) {
    this.sim.park({ x: COURT_BALL_REST.x, y: COURT_BALL_REST.y, z: COURT_BALL_REST.z });
    this.syncMesh();
    this.deps.tally.set(this.deps.state.hoopMakes, 0);
  }

  // ------------------------------------------------------------- pickups ----

  /** The `court` interaction hands off here — the ball comes to you.
   *  Works from rest OR mid-return (intercepting your rolling ball is a
   *  real pickup-game move, and the prompt promises the press works). */
  pickUp(): void {
    if (this.phase !== 'rest' && this.phase !== 'return') return;
    this.phase = 'held';
    this.framesSincePickup = 0;
    this.streak = 0;
    this.dribbleT = 0;
    gameAudio.dribble(0.4);
  }

  /** A new morning (docs/38's reset, docs/49 edition): the streak is a
   *  moment, so it's gone; the ball is snapped home before the fade lifts;
   *  the chalk tally keeps its cumulative count (the save remembers). */
  resetForNewDay(): void {
    const home = CourtGame.RETURN_HOME;
    this.phase = 'rest';
    this.streak = 0;
    this.q = 0;
    this.plan = null;
    this.missNotePending = false;
    this.deps.ui.setCourtCharge(null, null);
    this.sim.park({ ...home });
    COURT_BALL_REST.x = home.x;
    COURT_BALL_REST.y = home.y;
    COURT_BALL_REST.z = home.z;
    this.syncMesh();
    this.deps.tally.set(this.deps.state.hoopMakes, 0);
  }

  /** True while the ball rides with the player (held or charging). */
  get holding(): boolean { return this.phase === 'held' || this.phase === 'charging'; }
  get inFlight(): boolean { return this.phase === 'flight'; }
  get charge(): number { return this.q; }
  /** The live release point of the meter — re-solved every charging frame
   *  from where you actually stand (the band tracks your feet). */
  get meterIdeal(): number { return this.plan?.idealCharge ?? 0.5; }

  /** Where the ball physically is right now (the interaction's live pos). */
  ballSpot(): { x: number; y: number; z: number } {
    const p = this.sim.state.pos;
    return { x: p.x, y: p.y, z: p.z };
  }

  // -------------------------------------------------------------- update ----

  update(dt: number, inp: CourtFrameInput): void {
    this.frame += 1;
    if (this.framesSincePickup < 999) this.framesSincePickup += 1;
    this.fadeWeaves();
    switch (this.phase) {
      case 'rest': this.updateRest(); break;
      case 'held': this.updateHeld(dt, inp); break;
      case 'charging': this.updateCharging(dt, inp); break;
      case 'flight': this.updateFlight(dt); break;
      case 'return': this.updateReturn(dt); break;
    }
    this.deps.net.update(dt);
  }

  private updateRest(): void {
    // the sim already parked it; keep the interaction's live spot honest
    COURT_BALL_REST.x = this.sim.state.pos.x;
    COURT_BALL_REST.y = this.sim.state.pos.y;
    COURT_BALL_REST.z = this.sim.state.pos.z;
  }

  private updateHeld(dt: number, inp: CourtFrameInput): void {
    const facing = { x: Math.sin(inp.rotY), z: Math.cos(inp.rotY) };
    if (inp.moveMag > 0.1) {
      // dribble: the ball lives at your side, bouncing at stride pace
      this.dribbleT += dt * (1.6 + inp.moveMag * 1.6);
      const cyc = Math.abs(Math.sin(this.dribbleT * Math.PI));
      const y = GROUND_Y + BALL_R + cyc * DRIBBLE_H;
      if (cyc < 0.06 && !this.dribbleDown) {
        this.dribbleDown = true;
        gameAudio.dribble(0.55);
      }
      if (cyc > 0.4) this.dribbleDown = false;
      this.sim.park({
        x: inp.px + facing.x * HAND_AHEAD,
        y,
        z: inp.pz + facing.z * HAND_AHEAD,
      });
      this.sim.state.spinRate = 0;
    } else {
      // carried at the hip
      this.sim.park({
        x: inp.px + facing.x * HAND_AHEAD,
        y: HIP_Y + BALL_R,
        z: inp.pz + facing.z * HAND_AHEAD,
      });
    }
    this.syncMesh();
    // a press STARTS the charge (not the pickup frame — that press already
    // did its job bringing the ball into your hands)
    if (inp.interactPressed && this.framesSincePickup > 1) {
      this.phase = 'charging';
      this.q = 0;
      this.qDir = 1;
      this.plan = solveLaunch(this.handPos(inp, POCKET_Y));
    }
  }

  private updateCharging(dt: number, inp: CourtFrameInput): void {
    // meter fills, then ping-pongs — waiting too long costs you the top
    this.q += this.qDir * CHARGE_RATE * dt;
    if (this.q >= 1) { this.q = 1; this.qDir = -1; }
    if (this.q <= 0) { this.q = 0; this.qDir = 1; }
    const pocket = POCKET_Y + this.q * 0.22;
    // the solve follows your feet: move after starting the charge and the
    // band moves with you — the meter always tells the truth about HERE
    this.plan = solveLaunch(this.handPos(inp, pocket));
    const facing = { x: Math.sin(inp.rotY), z: Math.cos(inp.rotY) };
    this.sim.park({
      x: inp.px + facing.x * (HAND_AHEAD + 0.08),
      y: pocket,
      z: inp.pz + facing.z * (HAND_AHEAD + 0.08),
    });
    this.syncMesh();
    // live meter with the release band
    this.deps.ui.setCourtCharge(this.q, [this.plan.idealCharge - this.plan.band, this.plan.idealCharge + this.plan.band]);
    if (!inp.interactHeld) this.release(inp);
  }

  private handPos(inp: CourtFrameInput, y: number): { x: number; y: number; z: number } {
    const facing = { x: Math.sin(inp.rotY), z: Math.cos(inp.rotY) };
    return { x: inp.px + facing.x * (HAND_AHEAD + 0.08), y, z: inp.pz + facing.z * (HAND_AHEAD + 0.08) };
  }

  /** The release: launch speed from the charge curve, direction from the
   *  ballistic solve's shape. From here on, physics is the referee. */
  private release(inp: CourtFrameInput): void {
    const plan = this.plan!;
    const s = speedFor(this.q);
    const perfect = Math.hypot(plan.vel.x, plan.vel.y, plan.vel.z);
    const scale = s / perfect;
    const hand = this.handPos(inp, POCKET_Y + this.q * 0.22);
    this.sim.launch(hand, { x: plan.vel.x * scale, y: plan.vel.y * scale, z: plan.vel.z * scale });
    this.phase = 'flight';
    this.flightTimeout = 0;
    this.deps.ui.setCourtCharge(null, null);
    gameAudio.dribble(0.25); // the push-off
  }

  private updateFlight(dt: number): void {
    this.flightTimeout += dt;
    const events = this.sim.advance(dt);
    for (const ev of events) this.onEvent(ev);
    this.syncMesh();
    // 4 game-seconds, not 7.5: a real flight resolves in ≤3 (G = 11.5, full
    // arc ≈ 2.4 s). The timeout is the "the sim lost the ball" referee, and
    // game-time crawls on a low-fps phone (the dt clamp halves it at ~5 fps)
    // — at 7.5 a stuck ball froze the court for 20+ wall-seconds, unpickable
    // the whole time (docs/51 B3). 4 game-s ≈ 12 wall-s worst case, and the
    // sim's own grounded rest still fires first on honest rolls.
    if (this.sim.resting || this.flightTimeout > 4) this.settle();
  }

  private onEvent(ev: SimEvent): void {
    switch (ev.kind) {
      case 'score':
        gameAudio.swish();
        this.deps.net.swish();
        this.onMade();
        break;
      case 'bounce':
        gameAudio.bounce(ev.strength);
        break;
      case 'rim': gameAudio.rim(); break;
      case 'board':
        gameAudio.board();
        // a board kiss that doesn't fall through sets up the miss note
        if (!this.sim.state.scored) this.missNotePending = true;
        break;
      case 'wall': break; // chain-link hum is the city bed's business
    }
  }

  private onMade(): void {
    this.streak += 1;
    this.deps.state.recordChoice('hoop');
    this.deps.tally.set(this.deps.state.hoopMakes, this.streak);
    // the made note fires on a short delay — the swish lands first, the
    // block's comment follows
    window.setTimeout(() => {
      if (this.streak >= 3 && this.streak - 1 < 3) this.deps.ui.showNote(COURT_STREAK_NOTE);
      else if (this.deps.state.hoopMakes >= MEMORY_LINES.hoop.at && this.streak <= 1) {
        this.deps.ui.showNote(MEMORY_LINES.hoop.line);
      } else {
        this.deps.ui.showNote(byDay(COURT_MAKE, this.deps.state.day));
      }
    }, 420);
  }

  private settle(): void {
    if (this.missNotePending) {
      this.missNotePending = false;
      this.deps.ui.showNote(byDay(COURT_MISS, this.deps.state.day));
    }
    if (!this.sim.state.scored) this.streak = 0;
    this.deps.ui.setCourtCharge(null, null);
    const p = this.sim.state.pos;
    if (!isInsideCourt(p.x, p.z)) {
      // rolled out the open gate — the court brings it back, honestly
      this.phase = 'return';
      this.returnT = 0;
      this.returnFrom = { x: p.x, y: GROUND_Y + BALL_R, z: p.z };
      // the hotspot is honest from the FIRST frame of the roll: a press
      // made between the settle frame and the next updateReturn still
      // reads this spot (tryInteract runs before court.update in a frame),
      // and the pre-shot spot is meters away from the escapee (docs/51 B3)
      COURT_BALL_REST.x = p.x;
      COURT_BALL_REST.y = GROUND_Y + BALL_R;
      COURT_BALL_REST.z = p.z;
      return;
    }
    this.phase = 'rest';
    // the interaction's live spot follows the ball — pick it up wherever
    // it came down
    COURT_BALL_REST.x = p.x;
    COURT_BALL_REST.y = p.y;
    COURT_BALL_REST.z = p.z;
  }

  private updateReturn(dt: number): void {
    this.returnT += dt;
    const t = Math.min(1, this.returnT / 1.15);
    const e = t * t * (3 - 2 * t); // smoothstep — a roll, not a teleport
    const home = CourtGame.RETURN_HOME;
    const p = this.sim.state.pos;
    p.x = this.returnFrom.x + (home.x - this.returnFrom.x) * e;
    p.z = this.returnFrom.z + (home.z - this.returnFrom.z) * e;
    p.y = GROUND_Y + BALL_R;
    this.sim.state.spinRate = 7 * (1 - t);
    this.sim.state.spinAxis = { x: 0, y: 1, z: 0 };
    this.syncMesh();
    // the interaction's live spot rides the rolling ball — pickUp() promises
    // an intercept "works from rest OR mid-return" (docs/51 B3).
    COURT_BALL_REST.x = p.x;
    COURT_BALL_REST.y = p.y;
    COURT_BALL_REST.z = p.z;
    if (t >= 1) {
      this.sim.park({ ...home });
      this.phase = 'rest';
      COURT_BALL_REST.x = home.x;
      COURT_BALL_REST.y = home.y;
      COURT_BALL_REST.z = home.z;
    }
  }

  /** The chain-link must never become a wall between the lens and the
   *  player: point-blank weave panels fade to a whisper (the canopy
   *  occlusion lesson, applied to the fence). */
  private fadeWeaves(): void {
    const c = this.deps.camera.position;
    for (const mesh of this.deps.weaves) {
      mesh.getWorldPosition(FadeWP);
      const d = Math.hypot(c.x - FadeWP.x, c.y - FadeWP.y, c.z - FadeWP.z);
      const target = d < 3.2 ? 0.12 : (d < 5.2 ? 0.5 : 0.92);
      const mat = mesh.material as THREE.MeshLambertMaterial;
      mat.opacity += (target - mat.opacity) * 0.25;
    }
  }

  /** Mesh sync — sim is authoritative, mesh follows (never the reverse). */
  private syncMesh(): void {
    const m = this.deps.ball;
    m.position.set(this.sim.state.pos.x, this.sim.state.pos.y, this.sim.state.pos.z);
  }

  /** Per-frame spin application (called by Game after update with real dt). */
  applySpinToMesh(dt: number): void {
    if (this.phase === 'flight') {
      applySpin(this.deps.ball, this.sim.state.spinAxis, this.sim.state.spinRate, dt);
    }
  }

  /** Dev/harness hook — the probe's deterministic release. Solves from the
   *  SAME hand position the real release will use, so a perfect-charge call
   *  is exactly what a perfect in-band human release produces. */
  testRelease(px: number, pz: number, q?: number): void {
    const rotY = Math.atan2(RIM.x - px, RIM.z - pz);
    const inp: CourtFrameInput = { interactPressed: false, interactHeld: true, moveMag: 0, px, pz, rotY };
    const target = q ?? 0.5;
    const pocket = POCKET_Y + target * 0.22;
    const plan = solveLaunch(this.handPos(inp, pocket));
    this.plan = plan;
    this.q = clamp(q ?? plan.idealCharge, 0, 1);
    this.phase = 'charging';
    this.release(inp);
  }
}
