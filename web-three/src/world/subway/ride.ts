/**
 * The K-train ride — a pure, deterministic state machine (the ballSim rule:
 * the sim is a seam, tests pin it, the renderer only reads it).
 *
 * The trick that makes a two-station subway ride cheap enough for a phone:
 * the train NEVER MOVES. The player walks into a car parked at the platform,
 * the doors close, the tunnel scenery scrolls past the windows, the car
 * sways, Priya teaches — and at the seam (doors closed, windows full of
 * tunnel) the player is translated to the identical car parked at the other
 * station. Every real transit game uses some cousin of this; the honest
 * version is deterministic: same boarding, same timing, same beats, every
 * run — for players, tests, and probes alike.
 *
 * Phases and their law:
 *   idle → closing → riding → arrived → departing → idle
 *   - `closing`:  doors shut (the world toggles door colliders on the event).
 *   - `riding`:   tunnel scroll + sway; notes fire at fixed times; the swap
 *                 seam crosses ONCE at `swapT` while the doors are shut.
 *   - `arrived`:  doors reopen AT THE DESTINATION; hold until the player
 *                 steps off the platform.
 *   - `departing`: the player stepped off — the doors close behind, then
 *                 the machine rests at idle (a departing train, honestly).
 * Boarding is legal only from idle (the doors must be open to reach the
 * button). Nothing here touches the save, the step machine, or money.
 */

/** Seconds. The teach beats land while the doors are shut and the tunnel
 *  runs; the announcement lands just before arrival (NYC truth). */
export const RIDE_T = {
  close: 1.2,
  swap: 12,
  arrive: 22,
  depart: 1.6,
} as const;

/** The EASTBOUND hop's own constants (W-C6): Alder Heights ⇄ the Larch
 *  Yards is one stop of yards — a short ride reads honest (8–10 s law, the
 *  handover's priced wave). close/depart are the door machine's constants
 *  (pinned equal to RIDE_T); the seam crosses once inside the shut window. */
export const RIDE_T_E = {
  close: 1.2,
  swap: 4.5,
  arrive: 9.5,
  depart: 1.6,
} as const;

/** Fixed beat times (seconds since `riding` began) and their keys — the
 *  renderer maps keys to note text (content.ts), the tests pin the order. */
export const RIDE_BEATS: ReadonlyArray<{ t: number; key: RideBeatKey }> = [
  { t: 3.0, key: 'priya-uptown' },
  { t: 8.5, key: 'priya-lines' },
  { t: 13.5, key: 'map-copies' },
  { t: 19.0, key: 'announce' },
];

/** The eastbound hop's own beats (W-C6): no Priya aboard — the teach rode
 *  the westbound already. The window beat fires before the seam (the player
 *  reads it on the car they boarded), the announcement after (the speaker
 *  crackles on the destination car, just before the doors). */
export const RIDE_BEATS_E: ReadonlyArray<{ t: number; key: RideBeatKey }> = [
  { t: 2.6, key: 'east-window' },
  { t: 7.2, key: 'announce-east' },
];

export type RideBeatKey = 'priya-uptown' | 'priya-lines' | 'map-copies' | 'announce' | 'east-window' | 'announce-east';
export type RidePhase = 'idle' | 'closing' | 'riding' | 'arrived' | 'departing';
export type RideEnd = 'A' | 'B' | 'C';
/** The door/timing constants' shared shape (W's long leg, E's short hop). */
export interface RideTiming {
  readonly close: number;
  readonly swap: number;
  readonly arrive: number;
  readonly depart: number;
}
/** W: Alder Heights ⇄ 42 St–Times Square (the shipped teach). E: Alder
 *  Heights ⇄ the Larch Yards (the short hop). The ends a route may carry
 *  are its own — B never boards an E ride, C never boards a W one. */
export type RideRoute = 'W' | 'E';

export interface RideEvent {
  type: 'doors' | 'note' | 'swap' | 'arrived';
  /** doors: true = open. note: the beat key. swap/arrived: the end station. */
  open?: boolean;
  beat?: RideBeatKey;
  end?: RideEnd;
}

export interface RideState {
  phase: RidePhase;
  /** Which station's car the player is standing in (A until the seam). */
  at: RideEnd;
  /** Which line leg this ride is (W by default — the shipped calls). */
  route: RideRoute;
  /** Seconds accumulated in the current phase. */
  t: number;
  /** Beats already fired this ride (by index into the route's beat set). */
  fired: number;
  /** The seam crosses once per ride. */
  swapped: boolean;
}

export function createRide(): RideState {
  return { phase: 'idle', at: 'A', route: 'W', t: 0, fired: 0, swapped: false };
}

/** The ends each route may board from / arrive at. */
const ROUTE_ENDS: Record<RideRoute, ReadonlyArray<RideEnd>> = { W: ['A', 'B'], E: ['A', 'C'] };

/** Board at station `from` on `route`. Only legal from idle, and only when
 *  the station rides that route (the guard law: an illegal pair is a no-op,
 *  not a half-opened door). Returns the doors event (they begin closing);
 *  the caller applies it (door state + colliders). */
export function beginRide(s: RideState, from: RideEnd, route: RideRoute = 'W'): RideEvent[] {
  if (s.phase !== 'idle') return [];
  if (!ROUTE_ENDS[route].includes(from)) return [];
  s.phase = 'closing';
  s.at = from;
  s.route = route;
  s.t = 0;
  s.fired = 0;
  s.swapped = false;
  return [{ type: 'doors', open: false }];
}

/** The route's own timing + beat set (the machine reads nothing global). */
function routeLeg(route: RideRoute): { T: RideTiming; BEATS: ReadonlyArray<{ t: number; key: RideBeatKey }> } {
  return route === 'E' ? { T: RIDE_T_E, BEATS: RIDE_BEATS_E } : { T: RIDE_T, BEATS: RIDE_BEATS };
}

/** Advance the machine. `dt` is the clamped frame delta (the loop owns the
 *  clamp). Events are returned in order; the caller applies them. */
export function tickRide(s: RideState, dt: number): RideEvent[] {
  const events: RideEvent[] = [];
  if (s.phase === 'idle') return events;
  s.t += dt;
  const { T, BEATS } = routeLeg(s.route);

  if (s.phase === 'closing') {
    if (s.t >= T.close) {
      s.phase = 'riding';
      s.t = 0;
    }
    return events;
  }

  if (s.phase === 'riding') {
    while (s.fired < BEATS.length && s.t >= BEATS[s.fired].t) {
      events.push({ type: 'note', beat: BEATS[s.fired].key });
      s.fired++;
    }
    if (!s.swapped && s.t >= T.swap) {
      // the seam: doors are long shut, windows full of tunnel — translate
      // the player to the identical car at the other station, once. The
      // route owns its far end: W flips A↔B, E flips A↔C.
      s.swapped = true;
      const end: RideEnd = s.at === 'A' ? (s.route === 'E' ? 'C' : 'B') : 'A';
      s.at = end;
      events.push({ type: 'swap', end });
    }
    if (s.t >= T.arrive) {
      s.phase = 'arrived';
      s.t = 0;
      events.push({ type: 'doors', open: true });
      events.push({ type: 'arrived', end: s.at });
    }
    return events;
  }

  if (s.phase === 'departing') {
    if (s.t >= T.depart) {
      // rest = the next train on the loop: the car parks with its doors
      // open again (the parked-car illusion demands a rideable door)
      s.phase = 'idle';
      s.t = 0;
      events.push({ type: 'doors', open: true });
    }
    return events;
  }

  // 'arrived' holds until the caller ends it (the player steps off)
  return events;
}

/** The player stepped off the destination platform — the train departs. */
export function endRide(s: RideState): RideEvent[] {
  if (s.phase !== 'arrived') return [];
  s.phase = 'departing';
  s.t = 0;
  return [];
}

/** Stations sit exactly one ride apart; the swap translates the player by
 *  this delta while preserving their local offset in the car. */
export const STATION_A_X = -44;
export const STATION_B_X = -332;
/** The eastbound terminus (W-C6): SUB-03's own axis — the station C cx
 *  READS the row (the A-3 no-double-truth law; the sim-registry suite pins
 *  this constant equal to the row). */
export const STATION_C_X = 164;
export const RIDE_SWAP_DX = STATION_B_X - STATION_A_X; // −288
export const RIDE_SWAP_DX_E = STATION_C_X - STATION_A_X; // +208

/** Apply the swap to a feet position (pure — tests pin the math). */
export function swapFeet(x: number, from: RideEnd, route: RideRoute = 'W'): number {
  if (route === 'E') return from === 'A' ? x + RIDE_SWAP_DX_E : x - RIDE_SWAP_DX_E;
  return from === 'A' ? x + RIDE_SWAP_DX : x - RIDE_SWAP_DX;
}

/** The car body's z-band (trainKit: body z 14.7..17.2) plus a small margin
 *  for the capsule radius — "aboard" for the seam swap. A player who
 *  stepped back onto the platform during closing must NOT be translated
 *  at the seam (they'd teleport 288 m without a train); the ride continues
 *  without them and the arrival's own doors-open event lets them go.
 *  CAR_Z_MIN sits at 14.45: the doorway stand (the bench face at 14.845
 *  minus a 0.35 capsule reaches z 14.494) must count as aboard — someone
 *  pressing ride while stepping through the open door IS boarding, and
 *  the 2026-11-12 playtest's "ride doesn't work" was exactly a player the
 *  band left behind 6 cm short. The platform proper (z ≤ 14.2) stays
 *  outside the band — the left-behind law keeps its subject. */
export const CAR_Z_MIN = 14.45;
export const CAR_Z_MAX = 17.35;
export function aboardCar(z: number): boolean {
  return z > CAR_Z_MIN && z < CAR_Z_MAX;
}
