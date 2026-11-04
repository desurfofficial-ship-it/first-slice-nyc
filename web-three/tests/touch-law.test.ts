import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { touchPanelUp } from '../src/ui/touchLaw';

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
  });

  it('leaves the hands free when every paper is closed', () => {
    expect(touchPanelUp(closed)).toBe(false);
  });

  it('is wired exactly once — no second parallel toggle of the class', () => {
    const toggles = uiSource.match(/classList\.toggle\('hidden-when-panel'/g);
    expect(toggles).toHaveLength(1);
  });

  it('every paper door calls the law — two doors for each of the five surfaces', () => {
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
});
