/**
 * HTML/CSS overlay UI — HUD (objective, money, timer, map note, prompt),
 * name-your-cart box, postcard panel, fade + title card, touch UI visibility,
 * error banner. All DOM ids come from index.html.
 */

import { gameAudio } from '../game/audio';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing #${id}`);
  return e as T;
}

export class UI {
  readonly root = el<HTMLDivElement>('hud');
  private objective = el<HTMLDivElement>('objective');
  private note = el<HTMLDivElement>('note');
  private money = el<HTMLDivElement>('money');
  private timer = el<HTMLDivElement>('timer');
  private prompt = el<HTMLDivElement>('prompt');
  private interactBtn = el<HTMLButtonElement>('btn-interact');
  private audioBtn = el<HTMLButtonElement>('btn-audio');
  readonly nameBox = el<HTMLDivElement>('name-box');
  readonly nameInput = el<HTMLInputElement>('cart-name-input');
  private nameOk = el<HTMLButtonElement>('cart-name-ok');
  readonly postcardPanel = el<HTMLDivElement>('postcard-panel');
  readonly postcardImg = el<HTMLImageElement>('postcard-img');
  readonly postcardCaption = el<HTMLDivElement>('postcard-caption');
  readonly postcardKeep = el<HTMLButtonElement>('postcard-keep');
  readonly postcardStay = el<HTMLButtonElement>('postcard-stay');
  private fade = el<HTMLDivElement>('fade');
  private titleCard = el<HTMLDivElement>('title-card');
  readonly loading = el<HTMLDivElement>('loading');
  readonly errorBanner = el<HTMLDivElement>('error-banner');
  readonly touchUI = el<HTMLDivElement>('touch-ui');

  isTouch = false;

  // ---------------- the arrival (Doc 02 opening) ----------------
  // Render-only: the cinematic owns its machine; Game wires the callbacks.

  private cine = el<HTMLDivElement>('cine');
  private cineBox = el<HTMLDivElement>('cine-box');
  private cineSpeaker = el<HTMLDivElement>('cine-speaker');
  private cineText = el<HTMLDivElement>('cine-text');
  private cineChips = el<HTMLDivElement>('cine-chips');
  private cineTitleCard = el<HTMLDivElement>('cine-title');
  private cineSkipBtn = el<HTMLButtonElement>('cine-skip');

  onCineTap: (() => void) | null = null;
  onCineSkip: (() => void) | null = null;

  constructor() {
    this.nameOk.addEventListener('click', () => this.onNameSubmit?.());
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.onNameSubmit?.(); }
    });
    // the mute button is real: it flips the master gain and says so (aria)
    this.syncAudioButton();
    this.audioBtn.addEventListener('click', () => {
      gameAudio.setMuted(!gameAudio.isMuted());
      this.syncAudioButton();
    });
    // the arrival overlay is the advance button: any tap moves the scene on
    this.cine.addEventListener('pointerdown', (e) => {
      if (e.target === this.cineSkipBtn) return; // the skip chip has its own job
      this.onCineTap?.();
    });
    this.cineSkipBtn.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.onCineSkip?.();
    });
    this.detectTouch();
    window.addEventListener('resize', () => this.detectTouch());
  }

  private syncAudioButton() {
    const muted = gameAudio.isMuted();
    this.audioBtn.setAttribute('aria-pressed', String(muted));
    this.audioBtn.textContent = muted ? '\u{1F507}' : '\u266B';
  }

  onNameSubmit: (() => void) | null = null;

  private detectTouch() {
    const coarse = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (coarse !== this.isTouch) {
      this.isTouch = coarse;
      if (!this.touchUI.hidden) this.touchUI.hidden = !coarse;
    }
  }

  showGame() {
    this.root.hidden = false;
    if (this.isTouch) this.touchUI.hidden = false;
  }

  // ---------------- HUD ----------------

  setObjective(text: string) {
    this.objective.textContent = text;
  }

  get objectiveText(): string {
    return this.objective.textContent ?? '';
  }

  showNote(text: string) {
    this.note.textContent = text;
    this.note.hidden = false;
    // restart the entrance animation
    this.note.style.animation = 'none';
    void this.note.offsetWidth;
    this.note.style.animation = '';
  }

  setMoney(v: number) {
    this.money.textContent = `$${v}`;
    this.money.classList.remove('pulse');
    void this.money.offsetWidth;
    this.money.classList.add('pulse');
    window.setTimeout(() => this.money.classList.remove('pulse'), 450);
  }

  setMoneyQuiet(v: number) {
    this.money.textContent = `$${v}`;
  }

  setTimer(text: string) {
    this.timer.textContent = text;
  }

  /** The prompt line is decided by the interaction registry (Doc 37 §3B);
   *  the UI only renders it. `null` hides the prompt and dims the touch
   *  button — nothing is in reach. */
  setPrompt(verb: string | null) {
    if (verb === null || !this.nameBox.hidden || !this.postcardPanel.hidden) {
      this.prompt.hidden = true;
      this.interactBtn.classList.remove('occupied');
      return;
    }
    const keyHint = this.isTouch ? '' : '<span class="key">Space</span>';
    this.prompt.innerHTML = `${keyHint}${escapeHtml(verb)}`;
    this.prompt.hidden = false;
    // the touch interact button glows while something is actually in range —
    // the CSS hook existed but nothing ever wired it
    this.interactBtn.classList.add('occupied');
  }

  // ---------------- name box ----------------

  openNameBox() {
    this.nameBox.hidden = false;
    this.nameInput.value = '';
    this.prompt.hidden = true;
    window.setTimeout(() => this.nameInput.focus(), 30);
  }

  closeNameBox() {
    this.nameBox.hidden = true;
    this.nameInput.blur();
  }

  // ---------------- postcard ----------------

  showPostcard(imgUrl: string, caption: string) {
    if (imgUrl) {
      this.postcardImg.src = imgUrl;
      this.postcardImg.hidden = false;
    } else {
      this.postcardImg.hidden = true;
    }
    this.postcardCaption.textContent = caption;
    this.postcardPanel.hidden = false;
  }

  hidePostcard() {
    this.postcardPanel.hidden = true;
  }

  // ---------------- fade / title ----------------

  fadeOut(ms = 700): Promise<void> {
    this.fade.style.transitionDuration = `${ms}ms`;
    this.fade.classList.add('on');
    return new Promise((res) => window.setTimeout(res, ms + 30));
  }

  fadeIn(ms = 900): Promise<void> {
    this.fade.style.transitionDuration = `${ms}ms`;
    this.fade.classList.remove('on');
    return new Promise((res) => window.setTimeout(res, ms + 30));
  }

  showTitle(text: string, holdMs = 1600) {
    this.titleCard.textContent = text;
    this.titleCard.hidden = false;
    window.setTimeout(() => { this.titleCard.hidden = true; }, holdMs);
  }

  // ---------------- the arrival (Doc 02 opening) ----------------

  /** Letterbox in — the film starts. HUD stays hidden until the handover. */
  showCine() {
    this.cine.hidden = false;
    this.cineTitleCard.hidden = true;
    this.cineBox.hidden = true;
    // restart the bar slide
    this.cine.classList.remove('on');
    void this.cine.offsetWidth;
    this.cine.classList.add('on');
  }

  /** Bars stay after the dip-to-black swap (the terminal is still the film). */
  cineVisible() {
    this.cine.hidden = false;
    this.cine.classList.add('on');
  }

  cineHide() {
    this.cine.hidden = true;
    this.cine.classList.remove('on');
    this.cineTitleCard.hidden = true;
  }

  /** One dialogue line; speaker label above. Chips never outlive their line. */
  cineLine(speaker: string, text: string) {
    this.cineBox.hidden = false;
    this.cineChips.hidden = true;
    this.cineSpeaker.textContent = speaker;
    this.cineText.textContent = text;
    // restart the line-in animation
    this.cineBox.style.animation = 'none';
    void this.cineBox.offsetWidth;
    this.cineBox.style.animation = '';
  }

  /** The Doc 02 one-tap responses — personality, never penalty. */
  cineChoices(lines: readonly string[], onPick: (i: number) => void) {
    this.cineChips.hidden = false;
    this.cineChips.textContent = '';
    lines.forEach((line, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = line;
      chip.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); // a chip pick is not also an overlay tap
        onPick(i);
      });
      this.cineChips.appendChild(chip);
    });
  }

  cineHideBox() {
    this.cineBox.hidden = true;
    this.cineChips.hidden = true;
  }

  /** The title over the terminal face — holds until the handover clears it. */
  cineTitle() {
    this.cineTitleCard.hidden = false;
  }

  dismissLoading() {
    this.loading.classList.add('done');
    window.setTimeout(() => this.loading.remove(), 800);
  }

  showError(msg: string) {
    this.errorBanner.textContent = msg;
    this.errorBanner.hidden = false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] ?? c));
}
