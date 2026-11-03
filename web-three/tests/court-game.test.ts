/**
 * The half-court machine — the docs/51 B3 guard.
 *
 * The ball-sim contract lives in court.test.ts (pure physics). This file is
 * the COURT GAME contract: the phase machine and the interaction hotspot
 * (COURT_BALL_REST — the one spot the interaction registry's range check
 * reads) must agree in every phase where a pickup is legal ('rest' and
 * 'return'):
 *
 *   §1  rest         after any shot, the hotspot is where the ball came
 *                    down — the re-pickup works wherever it landed
 *   §2  the return   while the court rolls a gate escapee home, the
 *                    hotspot rides the ball — a player standing next to the
 *                    rolling ball can intercept (pickUp allows 'return';
 *                    a stale hotspot swallows the press — docs/51 B3, the
 *                    flaky probe-court re-pickup)
 *   §3  home         the roll ends at the free-throw line with hotspot,
 *                    ball and phase together again
 *
 * Determinism: the sim is fixed-step (1/120 s), so the gate-exit shot below
 * lands bit-for-bit every run — the 'return' arrival is not a dice roll.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/game/audio', () => ({
  gameAudio: { dribble() {}, swish() {}, bounce() {}, rim() {}, board() {} },
}));

import * as THREE from 'three';
import { CourtGame, type CourtDeps, type CourtFrameInput } from '../src/court/CourtGame';
import { COURT_BALL_REST } from '../src/game/interactionDefs';
import { BALL_R, GROUND_Y, isInsideCourt, type Vec3 } from '../src/court/ballSim';

/** Stand-in deps: the machine under test is the phase logic, not the DOM. */
function makeCourt(): CourtGame {
  const deps = {
    ball: new THREE.Mesh(new THREE.SphereGeometry(BALL_R)),
    ui: { setCourtCharge() {}, showNote() {} } as unknown as CourtDeps['ui'],
    state: { hoopMakes: 0, recordChoice() {}, day: 1 } as unknown as CourtDeps['state'],
    net: { group: new THREE.Group(), swish() {}, update() {} },
    tally: { mesh: new THREE.Mesh(), set() {} },
    camera: new THREE.PerspectiveCamera(),
    weaves: [] as THREE.Mesh[],
  } as unknown as CourtDeps;
  return new CourtGame(deps);
}

const STEP = 1 / 60;
const COURT_RADIUS = 2.1; // the court interaction's reach (interactionDefs)

/** Neutral frame input; the player stands at (px, pz). */
const inp = (px: number, pz: number): CourtFrameInput => ({
  interactPressed: false, interactHeld: false, moveMag: 0, px, pz, rotY: 0,
});

/** Advance the machine until the phase settles (rest | return), max 12 s. */
function runUntilSettled(court: CourtGame, px: number, pz: number): string {
  for (let t = 0; t < 12; t += STEP) {
    court.update(STEP, inp(px, pz));
    if (court.phase === 'rest' || court.phase === 'return') return court.phase;
  }
  return court.phase;
}

/** The probe's standByBall: 0.6 m from the ball, away from the rim. */
function besideBall(court: CourtGame): Vec3 {
  const b = court.ballSpot();
  const dx = 44.25 - b.x, dz = 7.0 - b.z;
  const d = Math.hypot(dx, dz) || 1;
  return { x: b.x - (dx / d) * 0.6, y: 0.1, z: b.z - (dz / d) * 0.6 };
}

const dist2 = (a: { x: number; z: number }, b: { x: number; z: number }): number =>
  Math.hypot(a.x - b.x, a.z - b.z);

// Deterministic gate exit (the same release path the game runs):
// stand (45.0, 5.6), charge 0.30 → the rebound rolls out the open gate
// and rests outside the fence at ≈ (45.7, 3.7).
const GATE_SPOT = { x: 45.0, z: 5.6 };
const GATE_Q = 0.30;

describe('§1 — rest: pick up wherever the ball came down', () => {
  it('a short miss settles inside the court with the hotspot on the ball', () => {
    const court = makeCourt();
    court.pickUp();
    expect(court.phase).toBe('held');
    court.testRelease(43.4, 5.4, 0.2); // deliberately short
    const phase = runUntilSettled(court, 43.4, 5.4);
    expect(phase).toBe('rest');
    expect(isInsideCourt(court.ballSpot().x, court.ballSpot().z)).toBe(true);
    expect(dist2(COURT_BALL_REST, court.ballSpot())).toBeLessThan(1e-6);
    // and the press a player makes next to it reaches the machine
    const p = besideBall(court);
    expect(dist2(p, COURT_BALL_REST)).toBeLessThan(COURT_RADIUS);
    court.pickUp();
    expect(court.phase).toBe('held');
  });
});

describe('§2 — the return: intercepting the rolling escapee (docs/51 B3)', () => {
  it('the gate-exit shot really does leave the court (arrival is pinned)', () => {
    const court = makeCourt();
    court.pickUp();
    court.testRelease(GATE_SPOT.x, GATE_SPOT.z, GATE_Q);
    const phase = runUntilSettled(court, GATE_SPOT.x, GATE_SPOT.z);
    expect(phase).toBe('return');
    expect(isInsideCourt(court.ballSpot().x, court.ballSpot().z)).toBe(false);
  });

  it('the hotspot rides the ball for the whole roll — the press stays in reach', () => {
    const court = makeCourt();
    court.pickUp();
    court.testRelease(GATE_SPOT.x, GATE_SPOT.z, GATE_Q);
    expect(runUntilSettled(court, GATE_SPOT.x, GATE_SPOT.z)).toBe('return');
    let frames = 0;
    while (court.phase === 'return') {
      const p = besideBall(court); // the chaser, next to the rolling ball
      expect(dist2(COURT_BALL_REST, court.ballSpot())).toBeLessThan(1e-6);
      expect(dist2(p, COURT_BALL_REST)).toBeLessThan(COURT_RADIUS);
      court.update(STEP, inp(p.x, p.z));
      frames++;
      expect(frames).toBeLessThan(400); // the roll is ~1.15 s, not a loop
    }
    expect(frames).toBeGreaterThan(10); // we really watched the roll
    expect(court.phase).toBe('rest');
  });

  it('a mid-roll press intercepts the ball (pickUp accepts return)', () => {
    const court = makeCourt();
    court.pickUp();
    court.testRelease(GATE_SPOT.x, GATE_SPOT.z, GATE_Q);
    expect(runUntilSettled(court, GATE_SPOT.x, GATE_SPOT.z)).toBe('return');
    court.update(STEP * 4, inp(GATE_SPOT.x, GATE_SPOT.z)); // let it roll a bit
    if (court.phase !== 'return') return; // roll already home — nothing to prove
    const p = besideBall(court);
    expect(dist2(p, COURT_BALL_REST)).toBeLessThan(COURT_RADIUS);
    court.pickUp();
    expect(court.phase).toBe('held');
  });
});

describe('§3 — home: the roll ends honest', () => {
  it('after the return the ball rests at the line, hotspot and phase agree', () => {
    const court = makeCourt();
    court.pickUp();
    court.testRelease(GATE_SPOT.x, GATE_SPOT.z, GATE_Q);
    expect(runUntilSettled(court, GATE_SPOT.x, GATE_SPOT.z)).toBe('return');
    for (let t = 0; t < 3 && court.phase === 'return'; t += STEP) {
      const p = besideBall(court);
      court.update(STEP, inp(p.x, p.z));
    }
    expect(court.phase).toBe('rest');
    expect(isInsideCourt(court.ballSpot().x, court.ballSpot().z)).toBe(true);
    expect(court.ballSpot().y).toBeCloseTo(GROUND_Y + BALL_R, 6);
    expect(dist2(COURT_BALL_REST, court.ballSpot())).toBeLessThan(1e-6);
  });
});
