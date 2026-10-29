/**
 * The ambient audio layer — original sound, zero assets, zero autoplay.
 *
 * House rules (docs/30 §audio):
 *   - Everything is synthesized in WebAudio at boot: a low city bed, a slow
 *     traffic swell, and small event voices (brew hiss, washer drum, the
 *     permit stamp, the dusk bell). No files to license, nothing to download.
 *   - The AudioContext is created ONLY on the player's first gesture (the
 *     browsers' autoplay policy is a fact of life, not an obstacle: before
 *     the first tap there is no audio and the game never waits for it).
 *   - Every voice is one-shot and gain-enveloped — no overlapping stacks of
 *     the same sound, no clicks. The washer is the only loop, and it has a
 *     single owner (wash → washStop).
 *   - The mute button is real: master gain to zero, preference remembered.
 */

const MUTE_KEY = 'first_slice_muted';

class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private cityBed: GainNode | null = null;
  private trafficTimer: number | null = null;
  private cooTimer: number | null = null;
  private washNodes: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private muted = false;
  private tried = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === 'true';
    } catch { /* private mode — default to audible */ }
    // unlock on the first honest gesture — pointer or key, once
    const unlock = () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      this.init();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(v: boolean): void {
    this.muted = v;
    try {
      localStorage.setItem(MUTE_KEY, String(v));
    } catch { /* the preference is a nicety, not a record */ }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  /** Build the graph on first gesture. Failure is silent — audio is garnish. */
  private init(): void {
    if (this.tried) return;
    this.tried = true;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      void ctx.resume();

      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(ctx.destination);

      // ---- the city bed: looped filtered noise, always on, barely there ----
      const bed = ctx.createBufferSource();
      bed.buffer = this.noiseBuffer(4.0, 'brown');
      bed.loop = true;
      const bedFilter = ctx.createBiquadFilter();
      bedFilter.type = 'lowpass';
      bedFilter.frequency.value = 320;
      this.cityBed = ctx.createGain();
      this.cityBed.gain.value = 0.05;
      bed.connect(bedFilter).connect(this.cityBed).connect(this.master);
      bed.start();

      // ---- distant traffic: a slow swell every so often ----
      this.scheduleTraffic();
      // ---- pigeons: a coo now and then, from wherever they are ----
      this.scheduleCoo();
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  private scheduleCoo(): void {
    const next = () => {
      if (!this.ctx) return;
      if (!this.muted && Math.random() < 0.7) this.coo();
      this.cooTimer = window.setTimeout(next, 9000 + Math.random() * 20000);
    };
    this.cooTimer = window.setTimeout(next, 6000 + Math.random() * 8000);
  }

  private noiseBuffer(seconds: number, kind: 'white' | 'brown'): AudioBuffer | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.2;
      } else {
        data[i] = w;
      }
    }
    return buf;
  }

  private scheduleTraffic(): void {
    if (!this.ctx || !this.master) return;
    const sway = () => {
      const ctx = this.ctx;
      if (!ctx || !this.master || this.muted) {
        this.trafficTimer = window.setTimeout(sway, 9000);
        return;
      }
      const src = ctx.createBufferSource();
      const buf = this.noiseBuffer(3.0, 'brown');
      if (!buf) return;
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 140 + Math.random() * 120;
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.04, t + 1.4);
      g.gain.linearRampToValueAtTime(0, t + 2.9);
      src.connect(bp).connect(g).connect(this.master);
      src.start(t);
      src.stop(t + 3.0);
      this.trafficTimer = window.setTimeout(sway, 8000 + Math.random() * 12000);
    };
    this.trafficTimer = window.setTimeout(sway, 3000);
  }

  /** One filtered-noise voice with an envelope. Returns null if silent. */
  private blip(opts: {
    dur: number; type: BiquadFilterType; freq: number; q?: number;
    peak: number; attack: number; kind?: 'white' | 'brown';
  }): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    try {
      const src = ctx.createBufferSource();
      const buf = this.noiseBuffer(Math.max(0.4, opts.dur + 0.1), opts.kind ?? 'white');
      if (!buf) return;
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = opts.type;
      f.frequency.value = opts.freq;
      if (opts.q) f.Q.value = opts.q;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(opts.peak, t + opts.attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
      src.connect(f).connect(g).connect(this.master);
      src.start(t);
      src.stop(t + opts.dur + 0.05);
    } catch { /* one silent blip is not a failure */ }
  }

  /** A small pitched voice (bell, stamp thump). */
  private tone(freq: number, dur: number, peak: number, type: OscillatorType = 'sine', slideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch { /* silent is fine */ }
  }

  /** The urn hisses — one honest brew voice per press (never stacks). */
  brew(): void {
    this.blip({ dur: 1.15, type: 'highpass', freq: 2400, peak: 0.05, attack: 0.12 });
  }

  /** The washer starts — one loop, one owner. */
  wash(): void {
    this.washStop();
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    try {
      const src = ctx.createBufferSource();
      const buf = this.noiseBuffer(1.6, 'brown');
      if (!buf) return;
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 480;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.4);
      src.connect(f).connect(g).connect(this.master);
      src.start();
      this.washNodes = { src, gain: g };
      this.tone(90, 0.4, 0.08, 'sine', 60); // the door latch
    } catch { /* garnish */ }
  }

  washStop(): void {
    const n = this.washNodes;
    this.washNodes = null;
    if (!n || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      n.gain.gain.setTargetAtTime(0, t, 0.1);
      n.src.stop(t + 0.5);
    } catch { /* already stopped */ }
  }

  /** The permit stamp — paper, then the thunk. */
  stamp(): void {
    this.blip({ dur: 0.12, type: 'highpass', freq: 3000, peak: 0.05, attack: 0.01 });
    this.tone(140, 0.16, 0.12, 'sine', 70);
  }

  /** The dusk bell — Day 4's fourth window, one soft warm dyad. */
  bell(): void {
    this.tone(523.25, 1.6, 0.045);
    this.tone(659.25, 1.9, 0.035);
  }

  /** A pigeon, occasionally (the flock is ambient; so is its voice). */
  coo(): void {
    this.tone(420 + Math.random() * 60, 0.22, 0.02, 'sine', 300);
  }

  /** Page teardown — stop every scheduled voice. Nothing gameplay-bearing
   *  lives here, so a disposed layer is just a quiet one. */
  dispose(): void {
    if (this.trafficTimer !== null) { window.clearTimeout(this.trafficTimer); this.trafficTimer = null; }
    if (this.cooTimer !== null) { window.clearTimeout(this.cooTimer); this.cooTimer = null; }
    this.washStop();
    try { this.ctx?.close(); } catch { /* already closed */ }
    this.ctx = null;
    this.master = null;
    this.tried = true; // a disposed layer stays disposed
  }
}

/** App-lifetime singleton. Safe to import anywhere; silent until unlocked. */
export const gameAudio = new GameAudio();
