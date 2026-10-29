/**
 * Tiny tween engine — enough for the greybox sequences (dusk crossfade,
 * postcard rig glide, window flicker, fades). Parallel + sequence + delays.
 * No dependencies. Values are captured lazily on first update, matching
 * Godot's tween_property behavior inside sequences.
 */

export type Ease = (t: number) => number;
export const easeSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeLinear: Ease = (t) => t;

interface NumTween {
  kind: 'num'; get: () => number; set: (v: number) => void;
  to: number; duration: number; ease: Ease;
  from: number | null; elapsed: number;
}
interface RgbTween {
  kind: 'rgb'; obj: { r: number; g: number; b: number }; to: { r: number; g: number; b: number };
  duration: number; ease: Ease;
  from: { r: number; g: number; b: number } | null; elapsed: number;
}
interface WaitTween { kind: 'wait'; duration: number; elapsed: number; }
interface CallTween { kind: 'call'; fn: () => void; fired: boolean; }
interface GroupTween { kind: 'parallel' | 'sequence'; children: Tween[]; index: number; }

type Tween = NumTween | RgbTween | WaitTween | CallTween | GroupTween;

export class Tweens {
  private roots: Tween[] = [];

  /** Tween a number from its current value to `to` over `duration` seconds. */
  num(get: () => number, set: (v: number) => void, to: number, duration: number, ease: Ease = easeSine): NumTween {
    const t: NumTween = { kind: 'num', get, set, to, duration: Math.max(duration, 1e-6), ease, from: null, elapsed: 0 };
    this.roots.push(t);
    return t;
  }

  /** Tween any {r,g,b}-like object (three Color, fog color, uniform) toward `to`. */
  rgb(obj: { r: number; g: number; b: number }, to: { r: number; g: number; b: number }, duration: number, ease: Ease = easeSine): RgbTween {
    const t: RgbTween = {
      kind: 'rgb', obj, to: { ...to }, duration: Math.max(duration, 1e-6), ease, from: null, elapsed: 0,
    };
    this.roots.push(t);
    return t;
  }

  wait(duration: number): WaitTween {
    this.roots.push({ kind: 'wait', duration: Math.max(duration, 0), elapsed: 0 });
    return this.roots[this.roots.length - 1] as WaitTween;
  }

  call(fn: () => void): CallTween {
    this.roots.push({ kind: 'call', fn, fired: false });
    return this.roots[this.roots.length - 1] as CallTween;
  }

  parallel(...children: Tween[]): GroupTween {
    // claim the children: a composed child must not also run standalone
    for (const c of children) {
      const i = this.roots.indexOf(c);
      if (i >= 0) this.roots.splice(i, 1);
    }
    const g: GroupTween = { kind: 'parallel', children, index: 0 };
    this.roots.push(g);
    return g;
  }

  sequence(...children: Tween[]): GroupTween {
    for (const c of children) {
      const i = this.roots.indexOf(c);
      if (i >= 0) this.roots.splice(i, 1);
    }
    const g: GroupTween = { kind: 'sequence', children, index: 0 };
    this.roots.push(g);
    return g;
  }

  update(dt: number) {
    for (let i = this.roots.length - 1; i >= 0; i--) {
      if (this.step(this.roots[i], dt)) this.roots.splice(i, 1);
    }
  }

  clear() {
    this.roots.length = 0;
  }

  get active(): number {
    return this.roots.length;
  }

  private step(t: Tween, dt: number): boolean {
    switch (t.kind) {
      case 'num': {
        if (t.from === null) t.from = t.get();
        t.elapsed += dt;
        const k = Math.min(1, t.elapsed / t.duration);
        t.set(t.from + (t.to - t.from) * t.ease(k));
        return k >= 1;
      }
      case 'rgb': {
        if (t.from === null) t.from = { r: t.obj.r, g: t.obj.g, b: t.obj.b };
        t.elapsed += dt;
        const k = Math.min(1, t.elapsed / t.duration);
        const e = t.ease(k);
        t.obj.r = t.from.r + (t.to.r - t.from.r) * e;
        t.obj.g = t.from.g + (t.to.g - t.from.g) * e;
        t.obj.b = t.from.b + (t.to.b - t.from.b) * e;
        return k >= 1;
      }
      case 'wait':
        t.elapsed += dt;
        return t.elapsed >= t.duration;
      case 'call':
        if (!t.fired) { t.fn(); t.fired = true; }
        return true;
      case 'parallel': {
        let all = true;
        for (const c of t.children) if (!this.step(c, dt)) all = false;
        return all;
      }
      case 'sequence': {
        while (t.index < t.children.length) {
          if (!this.step(t.children[t.index], dt)) return false;
          t.index++;
        }
        return true;
      }
    }
  }
}
