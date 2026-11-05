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
  private rumbleNodes: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private saxTimer: number | null = null;
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

  /** The day-kept jingle — the postcard slides out and the day was held.
   *  Three notes, unhurried, rising home: the audit's "key jingle" ask,
   *  played by the same synth as everything else (no stems to ship). */
  dayKept(): void {
    this.tone(392.0, 0.5, 0.035);            // G4 — the day settles
    window.setTimeout(() => this.tone(493.88, 0.5, 0.033), 260);  // B4 — it held
    window.setTimeout(() => this.tone(587.33, 0.9, 0.04), 540);   // D5 — kept
  }

  /** The street performer's song (Doc 02 §10:00–15:00) — the one-shot
   *  melody for the four-second listen on the way back from the square.
   *  Five unhurried notes over ~4 s, a warm fifth underneath; one-shot and
   *  gain-enveloped like everything here — no loop, no owner to stop. */
  streetSong(): void {
    if (!this.ctx || !this.master || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      // D4 · F4 · A4 · G4 · E4 — a phrase that ends where you can walk away
      const notes: Array<[number, number, number]> = [
        [293.66, 0.0, 0.9],
        [349.23, 0.85, 0.8],
        [440.0, 1.6, 1.0],
        [392.0, 2.5, 0.8],
        [329.63, 3.2, 1.2],
      ];
      for (const [f, at, dur] of notes) {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, t + at);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t + at);
        g.gain.linearRampToValueAtTime(0.035, t + at + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
        o.connect(g).connect(this.master);
        o.start(t + at);
        o.stop(t + at + dur + 0.05);
      }
      // the fifth underneath, swelling once — somebody is playing WITH him
      const pad = this.ctx.createOscillator();
      pad.type = 'sine';
      pad.frequency.setValueAtTime(146.83, t); // D3
      const pg = this.ctx.createGain();
      pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(0.02, t + 0.7);
      pg.gain.linearRampToValueAtTime(0.0001, t + 4.4);
      pad.connect(pg).connect(this.master);
      pad.start(t);
      pad.stop(t + 4.5);
    } catch { /* one silent song is not a failure */ }
  }

  /** A pigeon, occasionally (the flock is ambient; so is its voice). */
  coo(): void {
    this.tone(420 + Math.random() * 60, 0.22, 0.02, 'sine', 300);
  }

  /** The busker's horn from below (docs/33 §2.5, W4 p2) — one muffled
   *  brass-ish note, lowpassed hard so it reads as coming up through the
   *  grate, with a soft fifth above it. Rare by its caller's law; the voice
   *  itself is one-shot and gain-enveloped like every other here. */
  hornNote(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    try {
      const t = ctx.currentTime;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420; // "from below" — the street between you and it
      lp.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.032, t + 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      lp.connect(g).connect(this.master);
      const root = ctx.createOscillator();
      root.type = 'triangle';
      root.frequency.setValueAtTime(228, t);
      root.frequency.linearRampToValueAtTime(238, t + 0.55); // a breath up
      root.frequency.linearRampToValueAtTime(232, t + 1.4);
      const fifth = ctx.createOscillator();
      fifth.type = 'triangle';
      fifth.frequency.setValueAtTime(342, t);
      const fg = ctx.createGain();
      fg.gain.setValueAtTime(0, t);
      fg.gain.linearRampToValueAtTime(0.011, t + 0.14);
      fg.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      root.connect(lp);
      fifth.connect(fg).connect(lp);
      root.start(t); root.stop(t + 1.55);
      fifth.start(t); fifth.stop(t + 1.35);
    } catch { /* one silent note is not a failure */ }
  }

  // ---- docs/50 far world: the K line, the square, the bus ----------------
  // House rules hold: synthesized, gain-enveloped, mute-respecting, and
  // the two loops (rumble, sax) each keep a single owner.

  /** The turnstile pass — two quick metallic ticks, arm-then-arm. */
  turnstile(): void {
    this.blip({ dur: 0.06, type: 'bandpass', freq: 2400, peak: 0.06, attack: 0.004 });
    window.setTimeout(() => this.blip({ dur: 0.08, type: 'bandpass', freq: 1800, peak: 0.05, attack: 0.004 }), 110);
  }

  /** The door chime — the two-note "stand clear of the closing doors". */
  doorChime(): void {
    this.tone(987.77, 0.22, 0.05);
    window.setTimeout(() => this.tone(659.25, 0.3, 0.045), 180);
  }

  /** The PA — three ascending notes, the arrival announcement's bell. */
  announce(): void {
    this.tone(523.25, 0.18, 0.04);
    window.setTimeout(() => this.tone(659.25, 0.18, 0.04), 160);
    window.setTimeout(() => this.tone(783.99, 0.34, 0.045), 320);
  }

  /** The ride's rumble — a loop with one owner, like the washer. */
  rumbleStart(): void {
    if (!this.ctx || !this.master || this.rumbleNodes) return;
    const len = 2;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04; // brown-ish
      d[i] = last * 3.2;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.16, this.ctx.currentTime + 1.2);
    src.connect(gain).connect(this.master);
    src.start();
    this.rumbleNodes = { src, gain };
  }

  rumbleStop(): void {
    if (!this.rumbleNodes || !this.ctx) return;
    const { src, gain } = this.rumbleNodes;
    this.rumbleNodes = null;
    gain.gain.cancelScheduledValues(this.ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.9);
    window.setTimeout(() => { try { src.stop(); } catch { /* stopped */ } }, 1000);
  }

  /** The busker's sax — a soft two-note phrase on a timer while you're
   *  near the 42nd St platform. Single owner: saxStart/saxStop. */
  saxStart(): void {
    if (this.saxTimer !== null || !this.ctx) return;
    const phrase = () => {
      const base = 293.66 + [0, 0, 43.65, 65.41][Math.floor(Math.random() * 4)];
      this.tone(base, 0.5, 0.028, 'triangle', 500);
      window.setTimeout(() => this.tone(base * 1.25, 0.62, 0.024, 'triangle', 500), 480);
      this.saxTimer = window.setTimeout(phrase, 2600 + Math.random() * 1800);
    };
    phrase();
  }

  saxStop(): void {
    if (this.saxTimer !== null) { window.clearTimeout(this.saxTimer); this.saxTimer = null; }
  }

  // ---------------- the half-court (docs/49 — the court upgrade) ----------------
  // Five one-shot voices, same house rules: synthesized, gain-enveloped,
  // never stacking the same sound. The court sounds like the street.

  /** The ball hits asphalt — dribbles, bounces. strength 0..1 scales it. */
  dribble(strength = 0.6): void {
    const s = Math.max(0.08, Math.min(1, strength));
    this.tone(105, 0.09, 0.10 * s, 'sine', 55);
    this.blip({ dur: 0.05, type: 'lowpass', freq: 900, peak: 0.05 * s, attack: 0.004 });
  }

  /** A floor bounce mid-flight — deeper the harder it lands. */
  bounce(strength = 0.5): void {
    this.dribble(strength);
  }

  /** Rim steel — two detuned partials with a fast decay, the honest CLANG. */
  rim(): void {
    this.tone(620, 0.28, 0.055, 'triangle');
    this.tone(934, 0.20, 0.035, 'triangle');
    this.blip({ dur: 0.06, type: 'bandpass', freq: 2100, q: 6, peak: 0.04, attack: 0.004 });
  }

  /** Backboard knock — wood-and-glass thud. */
  board(): void {
    this.tone(180, 0.13, 0.10, 'sine', 95);
    this.blip({ dur: 0.08, type: 'lowpass', freq: 700, peak: 0.06, attack: 0.004 });
  }

  /** The swish — a short, soft band-passed whoosh, the best sound in sports. */
  swish(): void {
    this.blip({ dur: 0.22, type: 'bandpass', freq: 1500, q: 1.1, peak: 0.09, attack: 0.03 });
    this.tone(330, 0.18, 0.02, 'sine', 210);
  }

  /** Page teardown — stop every scheduled voice. Nothing gameplay-bearing
   *  lives here, so a disposed layer is just a quiet one. */
  dispose(): void {
    if (this.trafficTimer !== null) { window.clearTimeout(this.trafficTimer); this.trafficTimer = null; }
    if (this.cooTimer !== null) { window.clearTimeout(this.cooTimer); this.cooTimer = null; }
    if (this.saxTimer !== null) { window.clearTimeout(this.saxTimer); this.saxTimer = null; }
    this.washStop();
    this.rumbleStop();
    try { this.ctx?.close(); } catch { /* already closed */ }
    this.ctx = null;
    this.master = null;
    this.tried = true; // a disposed layer stays disposed
  }
}

/** App-lifetime singleton. Safe to import anywhere; silent until unlocked. */
export const gameAudio = new GameAudio();
