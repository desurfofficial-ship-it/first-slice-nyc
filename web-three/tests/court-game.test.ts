/**
 * The CourtGame loop's interaction contract — the half the physics tests
 * don't cover: the ball's LIVE anchor. The `court` interaction's pos reads
 * COURT_BALL_REST, and the loop's promises are only honest while that
 * object tells the truth about where the ball is:
 *
 *   §A  the intercept  pickUp() promises "works from rest OR mid-return" —
 *                      so during a return the anchor must ride the rolling
 *                      ball (docs/51 B3: it used to sit on the stale
 *                      pre-return spot and the press died out by the gate)
 *   §B  the handoff    when the return completes, the anchor lands on the
 *                      same home spot the ball parks on — one frame, no gap
 *   §C  the rest law   at rest, the anchor and the ball are the same point
 *                      (the probe's "pick it up wherever it came down")
 */

import { describe, it, expect, vi } from 'vitest';

// the audio class unlocks on the first browser gesture — node has neither
// window nor AudioContext, and this contract never needed sound anyway
vi.mock('../src/game/audio', () => ({
  gameAudio: {
    dribble: vi.fn(), swish: vi.fn(), bounce: vi.fn(), rim: vi.fn(), board: vi.fn(),
  },
}));

import { CourtGame, type CourtDeps, type CourtFrameInput } from '../src/court/CourtGame';
import { COURT_BALL_REST } from '../src/game/interactionDefs';
import { GROUND_Y, BALL_R } from '../src/court/ballSim';

/** Minimal stubs: the loop under test touches the UI's charge meter, the
 *  tally, the ball mesh, the net, the camera position and the weave list —
 *  none of which this contract exercises. */
function makeDeps(): CourtDeps {
  return {
    ball: { position: { set() {} } } as unknown as CourtDeps['ball'],
    ui: { setCourtCharge() {}, showNote() {} } as unknown as CourtDeps['ui'],
    state: {
      hoopMakes: 0,
      recordChoice() {},
      day: 1,
    } as unknown as CourtDeps['state'],
    net: { update() {}, swish() {} } as unknown as CourtDeps['net'],
    tally: { set() {} } as unknown as CourtDeps['tally'],
    camera: { position: { x: 0, y: 8, z: -6 } } as unknown as CourtDeps['camera'],
    weaves: [],
  };
}

function frameInput(over: Partial<CourtFrameInput> = {}): CourtFrameInput {
  return { interactPressed: false, interactHeld: false, moveMag: 0, px: 43, pz: 5, rotY: 0, ...over };
}

/** Stage the exact state settle() leaves after a ball rolls out through the
 *  gate: phase 'return', the timer at t, the roll starting from `from`. */
function stageReturn(cg: CourtGame, t: number, from = { x: 48.5, y: GROUND_Y + BALL_R, z: 9.2 }): void {
  (cg as unknown as { phase: string }).phase = 'return';
  (cg as unknown as { returnT: number }).returnT = t;
  (cg as unknown as { returnFrom: { x: number; y: number; z: number } }).returnFrom = { ...from };
}

describe('§A — the intercept: mid-return, the anchor rides the ball', () => {
  it('COURT_BALL_REST tracks the rolling ball every frame of a return', () => {
    const cg = new CourtGame(makeDeps());
    const home = CourtGame.RETURN_HOME;
    let checked = 0;
    for (let t = 0; t < 1.0; t += 1 / 60) {
      stageReturn(cg, t);
      cg.update(1 / 60, frameInput());
      const spot = cg.ballSpot();
      expect(COURT_BALL_REST.x).toBeCloseTo(spot.x, 6);
      expect(COURT_BALL_REST.y).toBeCloseTo(spot.y, 6);
      expect(COURT_BALL_REST.z).toBeCloseTo(spot.z, 6);
      expect(spot.z).toBeGreaterThan(home.z - 0.001); // still rolling home
      checked++;
    }
    expect(checked).toBe(60);
  });

  it('pickUp() mid-return hands the ball over (the intercept is real)', () => {
    const cg = new CourtGame(makeDeps());
    stageReturn(cg, 0.4);
    cg.pickUp();
    expect(cg.phase).toBe('held');
  });
});

describe('§B — the handoff: the return lands the anchor on home, exactly', () => {
  it('one tick past the roll, anchor and ball sit on RETURN_HOME together', () => {
    const cg = new CourtGame(makeDeps());
    stageReturn(cg, 1.14); // one 60 Hz tick crosses the 1.15 s roll
    cg.update(1 / 60, frameInput());
    expect(cg.phase).toBe('rest');
    const home = CourtGame.RETURN_HOME;
    expect(COURT_BALL_REST.x).toBeCloseTo(home.x, 6);
    expect(COURT_BALL_REST.y).toBeCloseTo(home.y, 6);
    expect(COURT_BALL_REST.z).toBeCloseTo(home.z, 6);
    const spot = cg.ballSpot();
    expect(spot.x).toBeCloseTo(home.x, 6);
    expect(spot.z).toBeCloseTo(home.z, 6);
  });
});

describe('§C — the rest law: at rest, anchor IS the ball', () => {
  it('updateRest keeps the live spot on the parked ball', () => {
    const cg = new CourtGame(makeDeps());
    (cg as unknown as { sim: { state: { pos: { x: number; y: number; z: number } } } }).sim.state.pos =
      { x: 42.7, y: GROUND_Y + BALL_R, z: 6.4 };
    cg.update(1 / 60, frameInput());
    expect(COURT_BALL_REST.x).toBeCloseTo(42.7, 6);
    expect(COURT_BALL_REST.y).toBeCloseTo(GROUND_Y + BALL_R, 6);
    expect(COURT_BALL_REST.z).toBeCloseTo(6.4, 6);
  });
});
