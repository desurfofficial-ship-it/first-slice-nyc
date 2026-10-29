import { css } from "../world/materials";

/**
 * HUD — the DOM overlay (M4+): objective line, map notes, money clock, the
 * name-cart box, prompts. Paper-toned, portrait-first, per the oracle's UI
 * layout. Placeholder until M4; this stub only proves the palette wiring.
 */
export class HUD {
  readonly root: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      font-family: Georgia, "Times New Roman", serif;
      color: ${css("plum")};
    `;
    parent.appendChild(this.root);
  }

  /** M4: objective, notes, money, prompts, the name box. */
  say(_text: string): void {
    /* M4 */
  }

  dispose(): void {
    this.root.remove();
  }
}
