/**
 * HTML/CSS overlay UI — HUD (objective, money, timer, map note, prompt),
 * name-your-cart box, postcard panel, fade + title card, touch UI visibility,
 * error banner. All DOM ids come from index.html.
 */

import { gameAudio } from '../game/audio';
import type { OrderCard } from '../core/content';
import { SLANG_CARDS } from '../core/content';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing #${id}`);
  return e as T;
}

export class UI {
  readonly root = el<HTMLDivElement>('hud');
  private objective = el<HTMLDivElement>('objective');
  private note = el<HTMLDivElement>('note');
  private noteT1: number | null = null;
  private noteT2: number | null = null;
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
  // ---- the serving conversation (docs/11 + docs/12) ----
  readonly orderCard = el<HTMLDivElement>('order-card');
  private orderBubble = el<HTMLDivElement>('order-bubble');
  private orderLine = el<HTMLDivElement>('order-line');
  private orderReplies = el<HTMLDivElement>('order-replies');
  private orderResponse = el<HTMLDivElement>('order-response');
  private orderHint = el<HTMLDivElement>('order-hint');
  // ---- the Map, as a notebook ----
  readonly mapPanel = el<HTMLDivElement>('map-panel');
  readonly mapBtn = el<HTMLButtonElement>('btn-map');
  private mapNotesList = el<HTMLUListElement>('map-notes');
  private mapSlangList = el<HTMLUListElement>('map-slang');
  private mapEmpty = el<HTMLDivElement>('map-empty');
  private mapClose = el<HTMLButtonElement>('map-close');
  private fade = el<HTMLDivElement>('fade');
  private titleCard = el<HTMLDivElement>('title-card');
  readonly loading = el<HTMLDivElement>('loading');
  readonly errorBanner = el<HTMLDivElement>('error-banner');
  readonly touchUI = el<HTMLDivElement>('touch-ui');
  private chargeMeter = el<HTMLDivElement>('court-charge');
  private chargeFill = el<HTMLDivElement>('court-charge-fill');
  private chargeBand = el<HTMLDivElement>('court-charge-band');

  isTouch = false;

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
    // the Map's folded corner: a tap opens the notebook (M on keyboard)
    this.mapBtn.addEventListener('click', () => this.onMapToggle?.());
    this.mapClose.addEventListener('click', () => this.onMapToggle?.());
    // the order card's buttons; after a response, a tap anywhere is "done"
    this.orderCard.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-reply]');
      if (btn) this.onOrderChoose?.(Number((btn as HTMLElement).dataset.reply));
      else if (this.orderRespondedShown) this.onOrderChoose?.(null);
    });
    // keyboard on the conversation: 1–4 choose, Space/Enter advances,
    // Escape steps back from the counter without penalty (nothing can fail)
    window.addEventListener('keydown', (e) => {
      if (this.orderCard.hidden) return;
      if (e.code.startsWith('Digit')) {
        const i = Number(e.code.slice(5)) - 1;
        if (i >= 0) { e.preventDefault(); this.onOrderChoose?.(i); }
      } else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        this.onOrderChoose?.(null);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        this.onOrderChoose?.(-1);
      }
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
  /** Reply picked on the open order card — Game applies the conversation. */
  onOrderChoose: ((reply: number | null) => void) | null = null;
  /** The Map folded / opened — Game owns the state side. */
  onMapToggle: (() => void) | null = null;

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

  /** Paper panels hold the hands (docs/51 B7): while the order card, the
   *  Map, or a postcard is up, the touch stick and buttons stand down —
   *  the CSS contract (`#touch-ui.hidden-when-panel`) existed; the wiring
   *  didn't. Keyboard play never notices. */
  private syncTouchPanels() {
    const panelUp = !this.orderCard.hidden || !this.mapPanel.hidden
      || !this.postcardPanel.hidden;
    this.touchUI.classList.toggle('hidden-when-panel', panelUp);
  }

  showNote(text: string, ttlMs = 6500) {
    this.note.textContent = text;
    // #note's display rule beats the [hidden] attribute, so the honest
    // hide is the .gone class (display: none). Both go on now.
    this.note.classList.remove('note-fade', 'gone');
    this.note.hidden = false;
    // restart the entrance animation
    this.note.style.animation = 'none';
    void this.note.offsetWidth;
    this.note.style.animation = '';
    // ...and the paper fades: a note is a spoken line, not wallpaper.
    // (Found by the bug-hunt sweep: showNote() never had an exit — every
    // narration note stuck on screen until the next one replaced it.)
    if (this.noteT1 !== null) window.clearTimeout(this.noteT1);
    if (this.noteT2 !== null) window.clearTimeout(this.noteT2);
    this.noteT1 = window.setTimeout(() => {
      this.noteT1 = null;
      this.note.classList.add('note-fade');
      this.noteT2 = window.setTimeout(() => {
        this.noteT2 = null;
        this.note.classList.add('gone');
        this.note.hidden = true;
        this.note.classList.remove('note-fade');
      }, 450);
    }, Math.max(0, ttlMs));
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
   *  button — nothing is in reach. The conversation, the Map and the
   *  panels swallow the prompt too: the card owns the counter while open. */
  setPrompt(verb: string | null) {
    if (verb === null || !this.nameBox.hidden || !this.postcardPanel.hidden
      || !this.orderCard.hidden || !this.mapPanel.hidden) {
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

  /** The half-court's shot meter (docs/49): a transient skill read, not
   *  HUD chrome — visible only while the ball is in your shot pocket.
   *  band = [lo, hi] charge values of the gold release band. */
  setCourtCharge(q: number | null, band: [number, number] | null) {
    if (q === null || band === null) {
      this.chargeMeter.hidden = true;
      return;
    }
    this.chargeMeter.hidden = false;
    this.chargeFill.style.width = `${(q * 100).toFixed(1)}%`;
    const lo = Math.max(0, band[0]) * 100;
    const hi = Math.min(1, band[1]) * 100;
    this.chargeBand.style.left = `${lo}%`;
    this.chargeBand.style.width = `${Math.max(0, hi - lo)}%`;
    // the fill reads gold inside the band, cream outside — you SEE the
    // release window as you cross it
    this.chargeFill.style.background = q >= band[0] && q <= band[1]
      ? 'var(--court-band, #f7b32b)'
      : '#fff8f0';
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

  // ---------------- the serving conversation (docs/11 + docs/12) ----------------

  private orderRespondedShown = false;

  /** The order card opens: what they said, what you can do about it.
   *  Replies are numbered; the paper waits — there is no timer anywhere. */
  showOrderCard(card: OrderCard) {
    this.orderBubble.textContent = card.bubble;
    this.orderLine.textContent = card.line;
    this.orderReplies.innerHTML = '';
    card.replies.forEach((r, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.reply = String(i);
      b.className = 'order-reply';
      b.innerHTML = `<span class="reply-key">${i + 1}</span>${escapeHtml(r.label)}`;
      this.orderReplies.appendChild(b);
    });
    this.orderResponse.hidden = true;
    this.orderResponse.textContent = '';
    this.orderHint.hidden = true;
    this.orderRespondedShown = false;
    this.orderCard.hidden = false;
    this.syncTouchPanels();
    this.prompt.hidden = true;
    this.interactBtn.classList.remove('occupied');
  }

  /** The reply landed — what comes back, in the same paper. */
  showOrderResponse(text: string) {
    this.orderReplies.hidden = true;
    this.orderResponse.textContent = text;
    this.orderResponse.hidden = false;
    this.orderHint.hidden = false;
    this.orderRespondedShown = true;
  }

  /** Read-only, for the E2E harness. */
  get orderResponseText(): string {
    return this.orderResponse.textContent ?? '';
  }

  hideOrderCard() {
    this.orderCard.hidden = true;
    this.syncTouchPanels();
    this.orderReplies.hidden = false;
    this.orderResponse.hidden = true;
    this.orderHint.hidden = true;
    this.orderRespondedShown = false;
  }

  // ---------------- the Map, as a notebook (docs/11 + docs/12) ----------------

  openMap(notes: readonly string[], slang: readonly string[]) {
    this.mapPanel.hidden = false;
    this.syncTouchPanels();
    this.refreshMap(notes, slang);
    this.mapBtn.setAttribute('aria-pressed', 'true');
    this.prompt.hidden = true;
  }

  closeMap() {
    this.mapPanel.hidden = true;
    this.syncTouchPanels();
    this.mapBtn.setAttribute('aria-pressed', 'false');
  }

  /** Redraw page 2 — the margins hold what the city taught you. */
  refreshMap(notes: readonly string[], slang: readonly string[]) {
    this.mapNotesList.innerHTML = '';
    for (const n of notes) {
      const li = document.createElement('li');
      li.textContent = n;
      this.mapNotesList.appendChild(li);
    }
    this.mapSlangList.innerHTML = '';
    for (const id of slang) {
      const card = SLANG_CARDS[id];
      if (!card) continue;
      const li = document.createElement('li');
      li.className = 'map-slang-card';
      li.innerHTML = `<b>${escapeHtml(card.word)}</b> — ${escapeHtml(card.meaning)}`;
      this.mapSlangList.appendChild(li);
    }
    this.mapEmpty.hidden = notes.length > 0 || slang.length > 0;
  }

  /** "Map wants to write this down" — the folded corner does a small
   *  honest wiggle. Once per note; it never opens itself (Doc 12 rule). */
  wiggleMap() {
    this.mapBtn.classList.remove('wiggle');
    void this.mapBtn.offsetWidth;
    this.mapBtn.classList.add('wiggle');
    window.setTimeout(() => this.mapBtn.classList.remove('wiggle'), 1200);
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
    this.syncTouchPanels();
  }

  hidePostcard() {
    this.postcardPanel.hidden = true;
    this.syncTouchPanels();
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
