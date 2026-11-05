/**
 * HTML/CSS overlay UI — HUD (objective, money, timer, map note, prompt),
 * name-your-cart box, postcard panel, fade + title card, touch UI visibility,
 * error banner. All DOM ids come from index.html.
 */

import { gameAudio } from '../game/audio';
import type { OrderCard } from '../core/content';
import { MAP_PLACES, SLANG_CARDS } from '../core/content';
import { buildSketchSvg } from './sketch';
import type { AlbumEntry } from '../postcard/Album';
import { touchPanelUp } from './touchLaw';

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
  readonly postcardShare = el<HTMLButtonElement>('postcard-share');
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
  // ---- the Roam chip (freeroam.ts — the open-block contract's switch) ----
  readonly roamBtn = el<HTMLButtonElement>('btn-roam');
  private roamPeek = el<HTMLSpanElement>('roam-peek');
  // ---- the album — the shelf where kept postcards live ----
  readonly albumBtn = el<HTMLButtonElement>('btn-album');
  readonly albumPanel = el<HTMLDivElement>('album-panel');
  readonly albumGrid = el<HTMLDivElement>('album-grid');
  private albumEmpty = el<HTMLDivElement>('album-empty');
  private albumClose = el<HTMLButtonElement>('album-close');
  private albumCountBadge = el<HTMLSpanElement>('album-count');
  // ---- who got off the bus (Doc 02: six starters) ----
  readonly starterCard = el<HTMLDivElement>('starter-card');
  private starterChoices = el<HTMLDivElement>('starter-choices');
  // ---- the pocket — one button that opens Map / Album / Sound ----
  // (declared here: the pocket wave wired the behavior but left the
  // properties undeclared — main did not typecheck without these)
  private pocketBtn = el<HTMLButtonElement>('btn-pocket');
  private pocketMenu = el<HTMLDivElement>('pocket-menu');
  private audioPeek = el<HTMLSpanElement>('audio-peek');
  private fade = el<HTMLDivElement>('fade');
  private titleCard = el<HTMLDivElement>('title-card');
  readonly loading = el<HTMLDivElement>('loading');
  readonly errorBanner = el<HTMLDivElement>('error-banner');
  readonly touchUI = el<HTMLDivElement>('touch-ui');
  private chargeMeter = el<HTMLDivElement>('court-charge');
  private chargeFill = el<HTMLDivElement>('court-charge-fill');
  private chargeBand = el<HTMLDivElement>('court-charge-band');

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
  /** Doc 02's starter pick — fired with the tapped starter's id. */
  onStarterPick: ((id: string) => void) | null = null;

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
    // One Pocket button opens Map / Album / Sound — saves the top lane on phones
    this.pocketBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePocket();
    });
    window.addEventListener('pointerdown', (e) => {
      if (this.pocketMenu.hidden) return;
      const t = e.target as Node;
      if (this.pocketBtn.contains(t) || this.pocketMenu.contains(t)) return;
      this.closePocket();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !this.pocketMenu.hidden) {
        e.preventDefault();
        this.closePocket();
      }
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
    // Map / Album from the pocket — fold the menu, then open the paper
    this.mapBtn.addEventListener('click', () => {
      this.closePocket();
      this.onMapToggle?.();
    });
    // the Roam chip: fold the menu, then flip the mode (Game applies it)
    this.roamBtn.addEventListener('click', () => {
      this.closePocket();
      this.onRoamToggle?.();
    });
    this.mapClose.addEventListener('click', () => this.onMapToggle?.());
    this.albumBtn.addEventListener('click', () => {
      this.closePocket();
      this.onAlbumToggle?.();
    });
    this.albumClose.addEventListener('click', () => this.onAlbumToggle?.());
    this.albumGrid.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest('[data-album-id]');
      if (card) this.onAlbumPick?.((card as HTMLElement).dataset.albumId ?? '');
    });
    // the share sheet rides the postcard panel (visibility is Game's call —
    // the button exists only where the Web Share API can take the file)
    this.postcardShare.addEventListener('click', () => this.onPostcardShare?.());
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
    // Keep the "Sound" label; only the glyph flips (Pocket menu item)
    this.audioPeek.textContent = muted ? '\u{1F507}' : '\u266B';
  }

  private togglePocket() {
    if (this.pocketMenu.hidden) this.openPocket();
    else this.closePocket();
  }

  private openPocket() {
    this.pocketMenu.hidden = false;
    this.pocketBtn.setAttribute('aria-expanded', 'true');
  }

  closePocket() {
    this.pocketMenu.hidden = true;
    this.pocketBtn.setAttribute('aria-expanded', 'false');
  }

  onNameSubmit: (() => void) | null = null;
  /** Reply picked on the open order card — Game applies the conversation. */
  onOrderChoose: ((reply: number | null) => void) | null = null;
  /** The Map folded / opened — Game owns the state side. */
  onMapToggle: (() => void) | null = null;
  /** The Roam chip was tapped — Game owns the mode side (freeroam.ts). */
  onRoamToggle: (() => void) | null = null;
  /** The album folded / opened — Game owns the shelf. */
  onAlbumToggle: (() => void) | null = null;
  /** A card on the album shelf was tapped (its id). */
  onAlbumPick: ((id: string) => void) | null = null;
  /** Share the postcard in the panel (only wired where it can take files). */
  onPostcardShare: (() => void) | null = null;

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

  /** The Roam chip's two faces (freeroam.ts): "Roam" invites the open
   *  block; "Story" offers the way back. aria-pressed carries the state
   *  for readers; the pocket chip keeps the top lane free on phones. */
  setRoamLabel(active: boolean) {
    this.roamPeek.textContent = active ? 'Story' : 'Roam';
    this.roamBtn.setAttribute('aria-pressed', String(active));
    this.roamBtn.setAttribute(
      'aria-label',
      active ? 'Back to the story — the day picks up where you left it' : 'Roam the block — the story waits where it is',
    );
    this.roamBtn.title = active ? 'Back to the story' : 'Roam the block';
  }

  /** Paper panels hold the hands (docs/51 B7). ONE law, ONE wiring —
   *  touchPanelUp() is the pure union (tests pin it); syncTouchUI is the
   *  only place that toggles `#touch-ui.hidden-when-panel`. Two parallel
   *  helpers used to race each other. */
  private syncTouchUI() {
    this.touchUI.classList.toggle('hidden-when-panel', touchPanelUp({
      nameBox: !this.nameBox.hidden,
      orderCard: !this.orderCard.hidden,
      mapPanel: !this.mapPanel.hidden,
      postcardPanel: !this.postcardPanel.hidden,
      albumPanel: !this.albumPanel.hidden,
      starterCard: !this.starterCard.hidden,
    }));
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
      || !this.orderCard.hidden || !this.mapPanel.hidden || !this.albumPanel.hidden
      || !this.starterCard.hidden) {
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
    this.syncTouchUI();
    window.setTimeout(() => this.nameInput.focus(), 30);
  }

  closeNameBox() {
    this.nameBox.hidden = true;
    this.nameInput.blur();
    this.syncTouchUI();
  }

  // ---------------- who got off the bus (Doc 02 six starters) ----------------

  /** The pick card: six tiles, every one safe. Open only for humans on the
   *  film path; drivers and ?starter= boots apply directly. */
  showStarterPick(starters: Array<{ id: string; name: string; blurb: string }>) {
    this.starterChoices.innerHTML = '';
    for (const s of starters) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'starter-tile';
      b.dataset.starter = s.id;
      b.innerHTML = `<span class="starter-name">${escapeHtml(s.name)}</span>`
        + `<span class="starter-blurb">${escapeHtml(s.blurb)}</span>`;
      b.addEventListener('click', () => this.onStarterPick?.(s.id));
      this.starterChoices.appendChild(b);
    }
    this.starterCard.hidden = false;
    this.syncTouchUI();
    this.prompt.hidden = true;
    this.interactBtn.classList.remove('occupied');
  }

  closeStarterPick() {
    this.starterCard.hidden = true;
    this.syncTouchUI();
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
    this.syncTouchUI();
    this.prompt.hidden = true;
    this.interactBtn.classList.remove('occupied');
    this.syncTouchUI();
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
    this.syncTouchUI();
    this.orderReplies.hidden = false;
    this.orderResponse.hidden = true;
    this.orderHint.hidden = true;
    this.orderRespondedShown = false;
    this.syncTouchUI();
  }

  // ---------------- the Map, as a notebook (docs/11 + docs/12) ----------------

  private sketchBuilt = false;
  private sketchEl: HTMLElement | null = null;
  /** Map's crooked copy of Priya's two lines (docs/51 B11) — latched by
   *  the ride's 'map-copies' beat, applied whenever the sketch exists. */
  private priyaRevealed = false;

  /** The 'map-copies' beat: the crooked copy joins page 1 and stays. If
   *  the sketch isn't built yet, the flag waits — refreshSketch applies it
   *  on the first build (a save loaded mid-session opens the Map later). */
  revealPriyaLines() {
    this.priyaRevealed = true;
    this.sketchEl?.querySelector('#sketch-priya')?.classList.add('revealed');
  }

  /** The sketch on page 1 — Map's own badly-copied map. Built once, then
   *  only class-flips (revealed places) and the star's position. Called on
   *  open and whenever a new place is noticed while the fold is open. */
  refreshSketch(visited: readonly string[], px: number, pz: number): void {
    if (!this.sketchBuilt) {
      this.sketchEl = document.getElementById('map-sketch');
      if (this.sketchEl && !this.sketchEl.firstChild) {
        this.sketchEl.innerHTML = buildSketchSvg();
      }
      this.sketchBuilt = true;
    }
    if (!this.sketchEl) return;
    if (this.priyaRevealed) {
      this.sketchEl.querySelector('#sketch-priya')?.classList.add('revealed');
    }
    const seen = new Set(visited);
    this.sketchEl.querySelectorAll<SVGGElement>('.sketch-place').forEach((g) => {
      const id = g.dataset.place ?? '';
      g.classList.toggle('revealed', seen.has(id));
    });
    const star = this.sketchEl.querySelector<SVGGElement>('#sketch-star');
    // the star is where you're standing when you open the fold — world x,
    // y = −z (the sketch's north-up copy)
    star?.setAttribute('transform', `translate(${px.toFixed(1)},${(-pz).toFixed(1)})`);
    this.applyBeatMarker();
  }

  /** M1 — the beat marker on the sketch (docs/architecture/05). `placeId`
   *  is the state's beatPlaceId() — the same helper the objective line
   *  reads; null hides the ring (beats with no named place, DONE). If the
   *  sketch isn't built yet, the id waits — refreshSketch applies it on
   *  the first build (the same law as priyaRevealed). */
  private beatPlace: string | null = null;

  setBeatMarker(placeId: string | null): void {
    this.beatPlace = placeId;
    this.applyBeatMarker();
  }

  private applyBeatMarker(): void {
    if (!this.sketchEl) return;
    const beat = this.sketchEl.querySelector<SVGGElement>('#sketch-beat');
    if (!beat) return;
    const place = this.beatPlace ? MAP_PLACES.find((p) => p.id === this.beatPlace) : undefined;
    if (!place) {
      beat.classList.remove('active');
      return;
    }
    beat.setAttribute('transform', `translate(${place.x},${-place.z})`);
    beat.classList.add('active');
  }


  openMap(notes: readonly string[], slang: readonly string[]) {
    this.mapPanel.hidden = false;
    this.syncTouchUI();
    this.refreshMap(notes, slang);
    this.mapBtn.setAttribute('aria-pressed', 'true');
    this.prompt.hidden = true;
    this.syncTouchUI();
  }

  closeMap() {
    this.mapPanel.hidden = true;
    this.syncTouchUI();
    this.mapBtn.setAttribute('aria-pressed', 'false');
    this.syncTouchUI();
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
    // Map lives inside the Pocket now — wiggle the launcher so the player sees it
    const target = this.pocketBtn;
    target.classList.remove('wiggle');
    void target.offsetWidth;
    target.classList.add('wiggle');
    window.setTimeout(() => target.classList.remove('wiggle'), 1200);
  }

  // ---------------- postcard ----------------

  showPostcard(imgUrl: string, caption: string, stayLabel = 'Stay a while') {
    if (imgUrl) {
      this.postcardImg.src = imgUrl;
      this.postcardImg.hidden = false;
    } else {
      this.postcardImg.hidden = true;
    }
    // the alt rides the caption's first line — a screen reader gets the
    // moment, not a hardcoded Day 1 line (the panel shows day-end cards
    // AND the Wow card now)
    this.postcardImg.alt = `Postcard \u2014 ${caption.split('\n')[0]}`;
    this.postcardCaption.textContent = caption;
    this.postcardStay.textContent = stayLabel;
    this.postcardPanel.hidden = false;
    // the B7 contract includes the postcard (panelUp reads postcardPanel) —
    // the wiring has to ride both doors of the panel, or touch players
    // hold a stick that the paper is holding (upstream wired the card and
    // the Map; the postcard was read but never announced)
    this.syncTouchUI();
  }

  hidePostcard() {
    this.postcardPanel.hidden = true;
    this.syncTouchUI();
  }

  /** The share button exists only where the platform sheet can take the
   *  file (progressive honesty — desktop Linux gets Keep, not a dead Share). */
  setShareVisible(v: boolean) {
    this.postcardShare.hidden = !v;
  }

  // ---------------- the album ----------------

  setAlbumCount(n: number) {
    this.albumCountBadge.textContent = String(n);
    this.albumBtn.setAttribute('aria-label',
      n === 0 ? 'Open your album — empty so far' : `Open your album — ${n} card${n === 1 ? '' : 's'}`);
  }

  get albumCount(): number {
    return Number(this.albumCountBadge.textContent ?? '0') || 0;
  }

  showAlbum(entries: AlbumEntry[]) {
    this.albumGrid.textContent = '';
    for (const e of entries) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'album-card';
      card.dataset.albumId = e.id;
      card.setAttribute('aria-label', `Day ${e.day} postcard — ${e.caption.split('\n')[0]}`);
      const img = document.createElement('img');
      img.src = e.thumb;
      img.alt = '';
      const tag = document.createElement('span');
      tag.className = 'album-tag';
      // moment cards carry their own tag ("THE RUSH", "THE HATS"…); the
      // square's card keeps its name, day cards stay day-tagged
      tag.textContent = e.kind === 'wow'
        ? `DAY ${e.day} · ${e.tag || 'THE SQUARE'}`
        : `DAY ${e.day}`;
      card.append(img, tag);
      this.albumGrid.append(card);
    }
    this.albumEmpty.hidden = entries.length > 0;
    this.albumPanel.hidden = false;
    // the album is a paper panel too — the B7 contract is for every sheet
    this.syncTouchUI();
  }

  hideAlbum() {
    this.albumPanel.hidden = true;
    this.syncTouchUI();
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
