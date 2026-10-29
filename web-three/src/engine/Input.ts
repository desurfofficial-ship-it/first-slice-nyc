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
  restartPressed: boolean;           // edge
}

export class InputManager {
  private keys = new Set<string>();
  private joyVec = { x: 0, y: 0 };
  private interactQueued = false;
  private restartQueued = false;
  private touchInteractQueued = false;

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
    this.joyZone.addEventListener('pointerdown', (e) => {
      if (this.joyId !== null) return;
      this.joyId = e.pointerId;
      this.joyZone.setPointerCapture(e.pointerId);
      this.joyOrigin = { x: e.clientX, y: e.clientY };
      this.joyBase.hidden = false;
      this.joyBase.style.left = `${e.clientX}px`;
      this.joyBase.style.top = `${e.clientY}px`;
      this.moveStick(e.clientX, e.clientY);
    });
    this.joyZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyId) return;
      this.moveStick(e.clientX, e.clientY);
    });
    const joyEnd = (e: PointerEvent) => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.joyVec = { x: 0, y: 0 };
      this.joyBase.hidden = true;
    };
    this.joyZone.addEventListener('pointerup', joyEnd);
    this.joyZone.addEventListener('pointercancel', joyEnd);

    // ---- interact button (edge-triggered on press) ----
    this.btnInteract.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touchInteractQueued = true;
    });

    // ---- camera turn buttons (held) ----
    const hold = (el: HTMLElement, set: (v: boolean) => void) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); });
      el.addEventListener('pointerup', () => set(false));
      el.addEventListener('pointercancel', () => set(false));
      el.addEventListener('pointerleave', () => set(false));
    };
    hold(this.turnL, (v) => { this.turnLHeld = v; });
    hold(this.turnR, (v) => { this.turnRHeld = v; });
  }

  private turnLHeld = false;
  private turnRHeld = false;

  private moveStick(x: number, y: number) {
    const maxR = 44;
    let dx = x - this.joyOrigin.x;
    let dy = y - this.joyOrigin.y;
    const len = Math.hypot(dx, dy);
    if (len > maxR) {
      dx = (dx / len) * maxR;
      dy = (dy / len) * maxR;
    }
    this.joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.joyVec = { x: dx / maxR, y: -dy / maxR };
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

    const camTurn = (this.keys.has('KeyC') ? 1 : 0) - (this.keys.has('KeyZ') ? 1 : 0)
      + (this.turnRHeld ? 1 : 0) - (this.turnLHeld ? 1 : 0);

    const interact = this.interactQueued || this.touchInteractQueued;
    const restart = this.restartQueued;
    this.interactQueued = false;
    this.touchInteractQueued = false;
    this.restartQueued = false;

    return { move: { x: mx, y: my }, camTurn, interactPressed: interact, restartPressed: restart };
  }

  /** Direct key state probe (debug keys). */
  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** Direct inject for the autotest driver (mirrors Godot's Input.action_press). */
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
  }
}
