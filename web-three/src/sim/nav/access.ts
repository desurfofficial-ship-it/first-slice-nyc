/**
 * Building access — doors, permissions, transitions (Phase 3 A-2).
 *
 * A building's visual presence is not its accessibility. This module is
 * the ONE authority for the difference: stable door identities derived
 * from the registry's entrances, a reusable door-state machine, access
 * permissions, enter/exit transitions, and the reachability function the
 * world contract promised ([07] §7: `PLACE_INACCESSIBLE` "wired and
 * waiting for a real reachability function" — this is that function).
 *
 * Doors are the contract's arbitration resources (`door:<id>`, wc-03 §2).
 * The navigation graph carries them as `kind: 'door'` edges whose
 * `resourceRef` names the door; the pathfinder asks THIS module whether
 * a door may be traversed — a locked door is simply not an edge, so no
 * route ever walks through one.
 *
 * Door states (the reusable model):
 *   open        — traversable
 *   closed      — closed but not locked (staff only right now)
 *   locked      — private/restricted (nobody routes through; reported)
 *   unavailable — temporarily out of service (events can flip this)
 *
 * Defaults are derived, not authored: interiors with a public character
 * open; the Cecil's residential room locks (Leo's room is Leo's); the
 * mezzanine hangs off the station stair (public transit). Business hours
 * already live with the schedules (SYS-ECO-01 owns staffed hours) — the
 * model supports an hours gate (`hoursFor`) without inventing numbers
 * here; the seed wires Rosa's deli to the deli's own published windows.
 *
 * Runtime mutation is explicit and singular: `setDoorState` — no hidden
 * global state, one owner per fact (the world-contract ownership law).
 */

import type { NavEdge } from './graph';

export type DoorState = 'open' | 'closed' | 'locked' | 'unavailable';
export type DoorAccess = 'public' | 'restricted';

export interface DoorRecord {
  id: string;               // `door:<buildingId>`
  buildingId: string;
  x: number; z: number;     // the sidewalk-side position (registry entrance[0])
  faces?: string;
  access: DoorAccess;
  state: DoorState;
  /** Optional published windows [{openMin, closeMin}] — outside them the
   *  door reads `closed` to traversal even when its state is `open`. */
  hours: Array<{ openMin: number; closeMin: number }> | null;
  interiorId: string | null;
}

export type Reachability = 'REACHABLE' | 'PLACE_MISSING' | 'PLACE_INACCESSIBLE' | 'NO_ROUTE';

export interface AccessTransition {
  doorId: string;
  npcId: string;
  direction: 'enter' | 'exit';
  tick: number;
}

/** Rooms that are private by canon (doc 05: Leo's room is Leo's). */
const RESTRICTED_INTERIORS = new Set(['CECIL-ROOM']);

export class BuildingAccess {
  private readonly doors = new Map<string, DoorRecord>();
  private readonly interiorByBuilding = new Map<string, string>();
  private readonly transitions: AccessTransition[] = [];
  private readonly listeners: Array<() => void> = [];

  /** Seed from the navigation build (doors) + the registry's interiors.
   *  `doorDefs`: one per building entrance that got a connected door
   *  node. Pure data in; deterministic state out. */
  seed(opts: {
    doorDefs: Array<{ buildingId: string; x: number; z: number; faces?: string }>;
    interiorForBuilding: (buildingId: string) => string | null;
    hoursFor?: (buildingId: string) => Array<{ openMin: number; closeMin: number }> | null;
  }): void {
    for (const d of opts.doorDefs) {
      const id = `door:${d.buildingId}`;
      if (this.doors.has(id)) continue;
      const interiorId = opts.interiorForBuilding(d.buildingId);
      const restricted = interiorId !== null && RESTRICTED_INTERIORS.has(interiorId);
      this.doors.set(id, {
        id,
        buildingId: d.buildingId,
        x: d.x, z: d.z, faces: d.faces,
        access: restricted ? 'restricted' : 'public',
        state: restricted ? 'locked' : 'open',
        hours: opts.hoursFor?.(d.buildingId) ?? null,
        interiorId,
      });
      if (interiorId) this.interiorByBuilding.set(d.buildingId, interiorId);
    }
  }

  door(id: string): DoorRecord | null { return this.doors.get(id) ?? null; }
  allDoors(): DoorRecord[] { return [...this.doors.values()]; }

  /** The single mutation door — availability events and future story
   *  beats flip doors HERE, and the pathfinder's cache invalidates. */
  setDoorState(id: string, state: DoorState): boolean {
    const d = this.doors.get(id);
    if (!d) return false;
    if (d.state === state) return true;
    d.state = state;
    for (const fn of this.listeners) fn();
    return true;
  }

  /** Traversal gate for the pathfinder: a door edge may be walked only
   *  when its door is open AND inside published hours. */
  canTraverseEdge(edge: { resourceRef: string | null; kind: string }, minuteOfDay: number): boolean {
    if (edge.kind !== 'door') return true;
    if (!edge.resourceRef) return false; // a door edge must name its door
    const d = this.doors.get(edge.resourceRef);
    if (!d) return false;                 // unknown door — fail closed
    if (d.state !== 'open') return false;
    if (!d.hours) return true;
    return d.hours.some((h) => minuteOfDay >= h.openMin && minuteOfDay < h.closeMin);
  }

  /** Enter/exit transitions — recorded, inspectable, bounded (the last
   *  512; the world events own the durable record). */
  recordTransition(doorId: string, npcId: string, direction: 'enter' | 'exit', tick: number): void {
    this.transitions.push({ doorId, npcId, direction, tick });
    if (this.transitions.length > 512) this.transitions.shift();
  }

  transitionLog(): readonly AccessTransition[] { return this.transitions; }

  /** The reachability function ([07] §7 waited for this). Answers for a
   *  place id: is it a real place, is it accessible now, and (given the
   *  nav route check) can a body actually get there. */
  reachability(placeId: string, opts: { placeExists: boolean; hasRoute: boolean; minuteOfDay: number }): Reachability {
    if (!opts.placeExists) return 'PLACE_MISSING';
    // find the door that governs this place (its building's door)
    let door: DoorRecord | null = null;
    if (placeId.startsWith('door:')) door = this.doors.get(placeId) ?? null;
    if (!door) {
      for (const d of this.doors.values()) {
        if (d.buildingId === placeId || d.interiorId === placeId) { door = d; break; }
      }
    }
    if (door) {
      const openNow = this.canTraverseEdge({ resourceRef: door.id, kind: 'door' }, opts.minuteOfDay);
      if (!openNow) return 'PLACE_INACCESSIBLE';
    }
    return opts.hasRoute ? 'REACHABLE' : 'NO_ROUTE';
  }

  onDoorChange(fn: () => void): void {
    this.listeners.push(fn);
  }
}

/** The seed's hours law: the deli's own published windows — the SAME
 *  windows Rosa's runtime schedule keeps (runtime.ts), quoted in one
 *  place. No invented numbers; SYS-ECO-01 will replace this with the
 *  business-hours data when that work package lands. */
export function rosaDeliHours(): Array<{ openMin: number; closeMin: number }> {
  return [{ openMin: 6 * 60, closeMin: 14 * 60 }, { openMin: 17 * 60, closeMin: 22 * 60 }];
}

/** Edge-gate adapter handed to the pathfinder. */
export function accessGate(access: BuildingAccess, minuteOfDay: number): (e: Pick<NavEdge, 'resourceRef' | 'kind'>) => boolean {
  return (e) => access.canTraverseEdge(e, minuteOfDay);
}
