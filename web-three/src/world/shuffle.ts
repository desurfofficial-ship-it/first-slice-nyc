/**
 * The Shuffle (VS-F04 — docs/51 B16): the crowd-walk beat on the walk to the
 * Alder Heights stairs. Doc 02 §10:00–15:00: "a gentle mini-game about
 * walking through people without stopping (drift toward gaps; brushing
 * someone just makes them say 'scuse me,' which is a *correct* interaction,
 * not a failure)." Doc 07 TBD-3: stand still twenty seconds and the city
 * says "The city will wait."
 *
 * A feel beat, not a system: no counters, no save fields, no gates — the
 * day machine and the Map's hard rules stay sacred. The laws here are pure
 * so tests own them (tests/shuffle.test.ts); Game only renders what they
 * return. The wisp is invisible at rest — zero draw calls when nobody is
 * speaking, so the perf ledger (docs/51 B13) never moves for this.
 */

import * as THREE from 'three';

/** The dance's only line (Doc 02 — "they say 'scuse me'"). */
export const SHUFFLE_LINE = '\u201CScuse me.\u201D';

/** TBD-3's soft-skip promise, verbatim from Doc 07 (plus its period). */
export const WAIT_NOTE = 'The city will wait.';

/** Center distance (m) that counts as a brush. Bodies touch at ~0.75 m
 *  (walker 0.28·√2 reach + player 0.35 radius); a brush is the near pass
 *  just before the yield — close enough that the yield sidestep reads as
 *  the "scuse me" body language it accompanies. */
export const BRUSH_R = 1.0;

/** Seconds before the same walker can be brushed again — the street does
 *  not repeat itself on a loop. */
export const BRUSH_COOLDOWN = 4;

/** TBD-3's clock: this many honest seconds of standing still, mid-walk,
 *  earns the city's line. */
export const WAIT_AFTER_STILL = 20;

/** The shuffle stretch — the walk to the Alder Heights stairs (STAIR_SLOT
 *  x −48.5..−45.9 on the north walk) plus the westward approach past the
 *  bodega. The cart corner (x 4) is not the shuffle; the commuter's
 *  crosswalk (x −6.5) keeps its own beat outside the zone. */
export const SHUFFLE_ZONE = { minX: -49, maxX: -14, minZ: -7.5, maxZ: 7.5 } as const;

export interface ShuffleZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** In the stretch — and on the surface: descending the stairs (y < 0) leaves
 *  the beat behind with the daylight. */
export function inZone(px: number, py: number, pz: number, z: ShuffleZone): boolean {
  return py > -0.5
    && px >= z.minX && px <= z.maxX
    && pz >= z.minZ && pz <= z.maxZ;
}

/**
 * The brush law — pure. Every walker's cooldown ticks down by dt; a walker
 * whose circle the player's circle crosses (and whose cooldown is spent)
 * comes back as a hit and re-arms. The return carries ONLY indices — no
 * fail flag, no penalty, no score: brushing is correct by construction.
 */
export function brushScan(
  px: number,
  pz: number,
  peds: ReadonlyArray<{ x: number; z: number }>,
  cool: number[],
  dt: number,
  radius: number = BRUSH_R,
): number[] {
  const hits: number[] = [];
  for (let i = 0; i < peds.length; i++) {
    cool[i] = Math.max(0, cool[i] - dt);
    const dx = peds[i].x - px;
    const dz = peds[i].z - pz;
    if (cool[i] === 0 && dx * dx + dz * dz <= radius * radius) {
      cool[i] = BRUSH_COOLDOWN;
      hits.push(i);
    }
  }
  return hits;
}

/** The stillness law — pure. Movement resets the clock; standing piles it. */
export function stillTick(still: number, moved: boolean, dt: number): number {
  return moved ? 0 : still + dt;
}

function wispPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * The speech wisp — one shared canvas sprite. Invisible at rest (a sprite
 * with visible=false draws nothing, so the at-rest ledger never moves);
 * hops to whoever just spoke and fades in the last half-second.
 */
export class SpeechWisp {
  readonly sprite: THREE.Sprite;
  private timer = 0;
  private static readonly SHOW = 1.7;

  constructor(scene: THREE.Scene) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d')!;
    // the wisp: Pizza-Box White paper (Doc 07 §7 palette), ink line, ink text
    wispPath(ctx, 6, 10, 244, 54, 18);
    ctx.fillStyle = 'rgba(255,248,240,0.96)';
    ctx.fill();
    ctx.strokeStyle = '#2b2730';
    ctx.lineWidth = 3;
    wispPath(ctx, 6, 10, 244, 54, 18);
    ctx.stroke();
    ctx.fillStyle = '#2b2730';
    ctx.font = '600 30px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SHUFFLE_LINE, 128, 38);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.name = 'ShuffleWisp';
    this.sprite.scale.set(1.5, 0.47, 1);
    this.sprite.visible = false;
    scene.add(this.sprite);
  }

  /** The walker says their line: the wisp hops to them and speaks. */
  say(x: number, y: number, z: number): void {
    this.sprite.position.set(x, y, z);
    this.sprite.visible = true;
    (this.sprite.material as THREE.SpriteMaterial).opacity = 1;
    this.timer = SpeechWisp.SHOW;
  }

  update(dt: number): void {
    if (this.timer <= 0) return;
    this.timer -= dt;
    const m = this.sprite.material as THREE.SpriteMaterial;
    m.opacity = Math.max(0, Math.min(1, this.timer / 0.6));
    if (this.timer <= 0) {
      m.opacity = 0;
      this.sprite.visible = false;
    }
  }
}
