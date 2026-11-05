/**
 * Input: keyboard + touch. Edge-triggered interact (no auto-repeat while held),
 * matching main.gd `_unhandled_input` (is_action_pressed fires once per press).
 * While a text field has focus, game keys are swallowed entirely
 * (the "LineEdit eats its keys first" lesson, main.gd input comment).
 */

export interface InputState {
  move: { x: number; y: number };   // y: +1 forward
  camTurn: number;                   // -1..1 (Z/left = +? see main.gd get_axis(cam_left, cam_right))
  interactPressed: boolean;          // edge — consumed by the game
  /** Held, not edge — the half-court's shot charge reads this (press and
   *  HOLD to charge, release to shoot). Keyboard OR touch button. */
  interactHeld: boolean;
  restartPressed: boolean;           // edge
  sprint: boolean;
  dragX: number;
  dragY: number;
  zoomDelta: number;
}

export class InputManager {
  private keys = new Set<string>();
  private joyVec = { x: 0, y: 0 };
  private interactQueued = false;
  private restartQueued = false;
  private touchInteractQueued = false;
  private touchInteractHeld = false;
  private dragAccX = 0;
  private dragAccY = 0;
  private wheelAcc = 0;
  private pointerDragId: number | null = null;
  private pointerLastX = 0;
  private pointerLastY = 0;

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isTypingTarget(e.target)) return;
    const k = e.code;
    if (k === 'Space') e.preventDefault();
    if (!this.keys.has(k)) {
      if (k === 'Space' || k === 'KeyE') this.interactQueued = true;
      if (k === 'KeyR') this.restartQueued = true;
    }
    this.keys.add(k);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => {
    this.keys.clear(); // focus loss must not leave stuck keys
  };

  private joyZone: HTMLElement;
  private joyBase: HTMLElement;
  private joyStick: HTMLElement;
  private btnInteract: HTMLElement;
  private turnL: HTMLElement;
  private turnR: HTMLElement;

  private joyId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };

  constructor(ui: {
    joyZone: HTMLElement; joyBase: HTMLElement; joyStick: HTMLElement;
    btnInteract: HTMLElement; turnL: HTMLElement; turnR: HTMLElement;
  }) {
    this.joyZone = ui.joyZone;
    this.joyBase = ui.joyBase;
    this.joyStick = ui.joyStick;
    this.btnInteract = ui.btnInteract;
    this.turnL = ui.turnL;
    this.turnR = ui.turnR;

    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    // ---- touch joystick ----
    // Appears under the thumb. Dead-zone kills micro-drift; capture + cancel
    // handlers stop the stick from "sticking" when the finger slides off the
    // zone or the browser steals the gesture (iOS Safari, Chrome overscroll).
    this.joyZone.addEventListener('pointerdown', (e) => {
      if (this.joyId !== null) return;
      e.preventDefault();
      this.joyId = e.pointerId;
      try { this.joyZone.setPointerCapture(e.pointerId); } catch { /* older WebViews */ }
      this.joyOrigin = { x: e.clientX, y: e.clientY };
      const r = this.joyZone.getBoundingClientRect();
      this.joyBase.hidden = false;
      this.joyBase.style.left = `${e.clientX - r.left}px`;
      this.joyBase.style.top = `${e.clientY - r.top}px`;
      this.joyStick.style.transform = 'translate(-50%, -50%)';
      this.joyVec = { x: 0, y: 0 };
      this.moveStick(e.clientX, e.clientY);
    });
    this.joyZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyId) return;
      e.preventDefault();
      this.moveStick(e.clientX, e.clientY);
    });
    const joyEnd = (e: PointerEvent) => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.joyVec = { x: 0, y: 0 };
      this.joyStick.style.transform = 'translate(-50%, -50%)';
      this.joyBase.hidden = true;
      try { this.joyZone.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    };
    this.joyZone.addEventListener('pointerup', joyEnd);
    this.joyZone.addEventListener('pointercancel', joyEnd);
    this.joyZone.addEventListener('lostpointercapture', (e) => {
      if (e.pointerId === this.joyId) {
        this.joyId = null;
        this.joyVec = { x: 0, y: 0 };
        this.joyStick.style.transform = 'translate(-50%, -50%)';
        this.joyBase.hidden = true;
      }
    });

    // ---- interact button (edge on press; HELD state feeds the shot charge
    // —— the half-court's hold-to-shoot works with one thumb on this) ----
    const interactDown = (e: PointerEvent) => {
      e.preventDefault();
      this.touchInteractQueued = true;
      this.touchInteractHeld = true;
    };
    const interactUp = () => { this.touchInteractHeld = false; };
    this.btnInteract.addEventListener('pointerdown', interactDown);
    this.btnInteract.addEventListener('pointerup', interactUp);
    this.btnInteract.addEventListener('pointercancel', interactUp);
    this.btnInteract.addEventListener('pointerleave', interactUp);

    // ---- camera turn buttons (held) ----
    const hold = (el: HTMLElement, set: (v: boolean) => void) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); el.classList.add('held'); });
      const off = () => { set(false); el.classList.remove('held'); };
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    };
    hold(this.turnL, (v) => { this.turnLHeld = v; });
    hold(this.turnR, (v) => { this.turnRHeld = v; });

    // ---- mouse & pointer orbit / zoom ----
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('wheel', this.onWheel, { passive: true });
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.isTypingTarget(e.target)) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, select, textarea, #pocket-menu, #map-panel, #order-card, #name-box, #postcard-panel, #starter-card')) {
      return;
    }
    // Mouse drag anywhere on screen, or touch swipe on the right half of the screen
    if (e.pointerType === 'mouse' || (!this.joyId && e.clientX > window.innerWidth * 0.35)) {
      this.pointerDragId = e.pointerId;
      this.pointerLastX = e.clientX;
      this.pointerLastY = e.clientY;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.pointerDragId === e.pointerId) {
      const dx = e.clientX - this.pointerLastX;
      const dy = e.clientY - this.pointerLastY;
      this.dragAccX += dx;
      this.dragAccY += dy;
      this.pointerLastX = e.clientX;
      this.pointerLastY = e.clientY;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.pointerDragId === e.pointerId) {
      this.pointerDragId = null;
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (this.isTypingTarget(e.target)) return;
    this.wheelAcc += e.deltaY;
  };

  private turnLHeld = false;
  private turnRHeld = false;

  private moveStick(x: number, y: number) {
    const maxR = 44;
    /** Inner dead zone (px) — thumb tremor and the initial contact should
     *  not nudge the walker. Outside it the vector scales from 0 at the
     *  rim of the dead zone to 1 at maxR. */
    const dead = 10;
    let dx = x - this.joyOrigin.x;
    let dy = y - this.joyOrigin.y;
    const len = Math.hypot(dx, dy);
    if (len > maxR) {
      dx = (dx / len) * maxR;
      dy = (dy / len) * maxR;
    }
    this.joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const live = Math.hypot(dx, dy);
    if (live <= dead) {
      this.joyVec = { x: 0, y: 0 };
      return;
    }
    // Remap so the edge of the dead zone is 0 and maxR is 1
    const scale = ((live - dead) / (maxR - dead)) / live;
    this.joyVec = { x: dx * scale, y: -dy * scale };
  }

  private isTypingTarget(t: EventTarget | null): boolean {
    return t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  /** Sample the current input frame. */
  sample(): InputState {
    const kx = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0)
      - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    const ky = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0)
      - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);

    let mx = kx + this.joyVec.x;
    let my = ky + this.joyVec.y;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }

    // Z/C or Q (left) — free camera orbit. KeyE is INTERACT only (hold-to-shoot
    // + talk); binding it to camTurn as well spun the boom every time the
    // player tried to use something. On-screen turn buttons still work.
    const camTurn = (this.keys.has('KeyC') ? 1 : 0)
      - (this.keys.has('KeyZ') || this.keys.has('KeyQ') ? 1 : 0)
      + (this.turnRHeld ? 1 : 0) - (this.turnLHeld ? 1 : 0);

    const interact = this.interactQueued || this.touchInteractQueued;
    const held = this.keys.has('Space') || this.keys.has('KeyE') || this.touchInteractHeld;
    const restart = this.restartQueued;
    this.interactQueued = false;
    this.touchInteractQueued = false;
    this.restartQueued = false;

    const isSprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || (Math.hypot(this.joyVec.x, this.joyVec.y) > 0.88);
    const dragX = this.dragAccX;
    const dragY = this.dragAccY;
    const zoomDelta = this.wheelAcc;
    this.dragAccX = 0;
    this.dragAccY = 0;
    this.wheelAcc = 0;

    return {
      move: { x: mx, y: my },
      camTurn,
      interactPressed: interact,
      interactHeld: held,
      restartPressed: restart,
      sprint: isSprint,
      dragX,
      dragY,
      zoomDelta,
    };
  }

  /** Direct key state probe (debug keys). */
  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** Direct inject for the autotest driver (mirrors the original action press). */
  injectKey(code: string, down: boolean) {
    if (down) {
      if (!this.keys.has(code)) {
        if (code === 'Space' || code === 'KeyE') this.interactQueued = true;
        if (code === 'KeyR') this.restartQueued = true;
      }
      this.keys.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  injectInteract() {
    this.interactQueued = true;
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('wheel', this.onWheel);
  }
}
