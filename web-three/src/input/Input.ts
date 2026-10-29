/**
 * Input — keyboard + touch (M3 movement, M7 touch polish).
 * Oracle: WASD/arrows walk, Space/E interact, Z/C camera, R restart.
 * Touch: a left-thumb stick zone and a right-thumb interact zone land with
 * M7's acceptance pass (docs/23 §8 criterion 7). Placeholder until M3.
 */
export interface InputState {
  fwd: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
}

export class Input {
  readonly state: InputState = {
    fwd: false,
    back: false,
    left: false,
    right: false,
    interact: false,
  };

  private bindings: Array<() => void> = [];

  bindKeyboard(target: Window = window): void {
    const set = (code: string, down: boolean): void => {
      switch (code) {
        case "KeyW": case "ArrowUp": this.state.fwd = down; break;
        case "KeyS": case "ArrowDown": this.state.back = down; break;
        case "KeyA": case "ArrowLeft": this.state.left = down; break;
        case "KeyD": case "ArrowRight": this.state.right = down; break;
        case "Space": case "KeyE": this.state.interact = down; break;
        default: break;
      }
    };
    const kd = (e: KeyboardEvent): void => set(e.code, true);
    const ku = (e: KeyboardEvent): void => set(e.code, false);
    target.addEventListener("keydown", kd);
    target.addEventListener("keyup", ku);
    this.bindings.push(() => {
      target.removeEventListener("keydown", kd);
      target.removeEventListener("keyup", ku);
    });
  }

  dispose(): void {
    this.bindings.forEach((off) => off());
    this.bindings = [];
  }
}
