/**
 * starters — Doc 02 §0:00–2:00: "Six starter characters to pick from
 * (30 seconds, all delightful — skateboard-toting, paint-splattered,
 * grandmotherly, etc.)."
 *
 * A starter is a PersonLook plus the one line the pick card prints. Every
 * look reuses the shared body boxes (personRig's law: dress, don't rebuild),
 * so the whole feature costs zero new geometry families — the skateboard is
 * the one exception, carried the way the stranger carries her duffel (a
 * small prop group on the back, not a rig change).
 *
 * 'classic' is the shipped courier look — the game's original face. Drivers,
 * probes and old saves keep it unless a human picks; the pick card is a
 * film-path-only beat (webdriver never sees it).
 */

import { PAL } from './palette';
import type { PersonLook } from '../world/personRig';

export interface Starter {
  id: string;
  name: string;
  /** The pick-card line — one breath, no lecture. */
  blurb: string;
  look: PersonLook;
  /** The one non-box accessory: a board carried across the back. */
  prop?: 'skateboard';
}

export const STARTERS: Starter[] = [
  {
    id: 'dee',
    name: 'Dee',
    blurb: 'Boards before breakfast. The hills are a rumor she is out to prove.',
    look: {
      jacket: 0x2a9d8f, pants: PAL.ink, skin: 0x8a5a3b, hair: 0x1a1420, style: 'cap',
      shoe: 0xece5d8,
    },
    prop: 'skateboard',
  },
  {
    id: 'marisol',
    name: 'Marisol',
    blurb: 'Enrolled at LaGuardia for painting. The jacket has evidence.',
    look: {
      jacket: 0xe0d2b0, pants: 0x5a544e, skin: 0xd9a06b, hair: 0x3a2e2a, style: 'bun',
      strap: 0x2a9d8f,
    },
  },
  {
    id: 'ada',
    name: 'Ms. Ada',
    blurb: 'Raised three kids on the B line. Has opinions about your cart already.',
    look: {
      jacket: 0x8a8378, pants: 0x47404b, skin: 0xe8b08e, hair: 0xd8d2c8, style: 'bun',
      shawl: 0xb23a48, glasses: true, scale: 0.94,
    },
  },
  {
    id: 'booker',
    name: 'Booker',
    blurb: 'Six-two, left field for the Kestrels, laughs first. Every time.',
    look: {
      jacket: 0xe9c46a, pants: PAL.ink, skin: 0x6e4530, hair: 0x1a1420, style: 'flat',
      shoe: 0x2a9d8f, scale: 1.06,
    },
  },
  {
    id: 'sixto',
    name: 'Sixto',
    blurb: 'Reads on the platform. The train is his library card.',
    look: {
      jacket: 0x4a6b5a, pants: 0x3d4a55, skin: 0xd9a06b, hair: 0x2b2730, style: 'flat',
      strap: 0x8a3b32,
    },
  },
  {
    id: 'classic',
    name: 'The Regular',
    blurb: 'Gold jacket, cream sneakers. Somebody has been here before.',
    look: {
      jacket: PAL.gold, pants: PAL.ink, skin: 0xd9a06b, hair: PAL.ink, style: 'flat',
      shoe: 0xece5d8, strap: 0x6e4a2f,
    },
  },
];

export const DEFAULT_STARTER = 'classic';

/** Resolve an id — unknown, corrupt or missing falls back to 'classic',
 *  so a hand-edited save can never break the boot. */
export function starterById(id: string | null | undefined): Starter {
  return STARTERS.find((s) => s.id === id) ?? STARTERS[STARTERS.length - 1];
}

export function isStarterId(id: string | null | undefined): boolean {
  return STARTERS.some((s) => s.id === id);
}
