import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { touchPanelUp } from '../src/ui/touchLaw';
import { isCameraDragPointer } from '../src/engine/Input';

// The paper owns the screen (docs/51 B7). This file guards the LAW and the
// WIRING: the law is pure (`touchPanelUp` — union of the four paper
// surfaces, name box included), the wiring is one toggle in UI.ts that every
// panel door calls. The wiring guard is a source contract because UI is DOM
// (vitest runs node) and because the failure class this guards against is
// literally "a second parallel wiring appeared" — which is how the repo ended
// up with two (`syncTouchPanels` missing the name box, `syncPanelOverTouch`
// knowing it), correct only by call order.

const uiSource = readFileSync(
  new URL('../src/ui/UI.ts', import.meta.url),
  'utf8',
);
const cssSource = readFileSync(
  new URL('../src/style.css', import.meta.url),
  'utf8',
);

const closed = {
  nameBox: false,
  orderCard: false,
  mapPanel: false,
  postcardPanel: false,
  albumPanel: false,
};

describe('the paper owns the screen — one law (docs/51 B7)', () => {
  it('stands the touch hands down for each paper surface, name box and album included', () => {
    expect(touchPanelUp({ ...closed, nameBox: true })).toBe(true);
    expect(touchPanelUp({ ...closed, orderCard: true })).toBe(true);
    expect(touchPanelUp({ ...closed, mapPanel: true })).toBe(true);
    expect(touchPanelUp({ ...closed, postcardPanel: true })).toBe(true);
    expect(touchPanelUp({ ...closed, albumPanel: true })).toBe(true);
    expect(touchPanelUp({ ...closed, notebookPrompt: true })).toBe(true); // the C0 pack's notebook page — the most paper the game has
  });

  it('leaves the hands free when every paper is closed', () => {
    expect(touchPanelUp(closed)).toBe(false);
  });

  it('is wired exactly once — no second parallel toggle of the class', () => {
    const toggles = uiSource.match(/classList\.toggle\('hidden-when-panel'/g);
    expect(toggles).toHaveLength(1);
  });

  it('every paper door calls the law — two doors for each of the five surfaces', () => {
    // five shipped surfaces + the C0 pack's notebook prompt (open + close,
    // the same two-door shape every other paper surface keeps). 2026-11:
    // the paper starter card retired (the wardrobe's pick mode owns the
    // beat; the wardrobe is a canvas room, not a paper surface) — its two
    // doors left with it, 18 → 16.
    const calls = uiSource.match(/this\.syncTouchUI\(\)/g);
    expect(calls).toHaveLength(16);
  });

  it('the toggle reads the shared law, not an ad-hoc surface list', () => {
    expect(uiSource).toContain('touchPanelUp({');
    // the retired wirings must stay retired
    expect(uiSource).not.toMatch(/private syncTouchPanels/);
    expect(uiSource).not.toMatch(/private syncPanelOverTouch/);
  });

  it('the CSS hook the law serves still exists', () => {
    expect(cssSource).toContain('#touch-ui.hidden-when-panel');
  });

  it('the joystick zone owns its gestures (touch-action: none — the stick must not be canceled)', () => {
    expect(cssSource).toMatch(/#joy-zone\s*{[^}]*touch-action:\s*none/s);
    expect(cssSource).toMatch(/#touch-right\s*{[^}]*touch-action:\s*none/s);
  });
});

describe('the camera-drag routing — two thumbs, two jobs (2026-11-12)', () => {
  // The playtest's "fix camera and joystick": the old gate read `!joyId`,
  // so while the left thumb held the stick NO right-thumb drag could ever
  // register — a walking player had no camera. The routing is a pure law
  // now: the joystick pointer and the camera pointer are independent.
  it('a touch that IS the joystick pointer never drags the camera', () => {
    expect(isCameraDragPointer('touch', true, 900, 1000)).toBe(false);
    expect(isCameraDragPointer('touch', true, 100, 1000)).toBe(false);
  });
  it('a second touch on the right half drags the camera even while the stick is held', () => {
    expect(isCameraDragPointer('touch', false, 900, 1000)).toBe(true);
    expect(isCameraDragPointer('touch', false, 360, 1000)).toBe(true); // just past the 35% line
  });
  it('a touch on the left margin outside the stick stays dead (the stick zone owns it)', () => {
    expect(isCameraDragPointer('touch', false, 349, 1000)).toBe(false);
  });
  it('the mouse drags anywhere, joystick held or not', () => {
    expect(isCameraDragPointer('mouse', true, 100, 1000)).toBe(true);
    expect(isCameraDragPointer('mouse', false, 100, 1000)).toBe(true);
  });
  it('Input.ts routes through the law, not an ad-hoc gate (the old !joyId class stays retired)', () => {
    const inputSource = readFileSync(
      new URL('../src/engine/Input.ts', import.meta.url),
      'utf8',
    );
    expect(inputSource).toContain('isCameraDragPointer(e.pointerType, e.pointerId === this.joyId');
    expect(inputSource).not.toMatch(/!this\.joyId && e\.clientX/);
  });
});
