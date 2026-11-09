/**
 * R9 — Postcards as unsent letters (narrative/14 R9; doc 14's own
 * acceptance: "no postcard UI promises mailing; the C5 scene is the only
 * send").
 *
 * The pins:
 *  - the shipped verb is KEPT — the album's real paper, never a dispatch;
 *  - the ONE send is sealed: only C5's scene key passes, exactly once per
 *    save, and the recipient is the type itself (there is no `to` field);
 *  - the interface strings promise nothing: no mail/mailbox/post-office
 *    promises in the UI source, and the shipped panel's verb is Share.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  KEEP_SCENE, SENT_SCENE_C5, markKept, markSent, auditMailingPromises,
} from '../src/core/postcardDispatch';
import { GameState } from '../src/core/GameState';

const SRC = new URL('../src', import.meta.url).pathname;

/** Walk the UI sources (the interface's strings live in TS + HTML). */
function uiFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|html|css)$/.test(name)) out.push(p);
    }
  };
  walk(join(SRC, 'ui'));
  out.push(join(SRC, '..', 'index.html'));
  return out;
}

describe('R9 — the kept-only law (the shipped pipeline)', () => {
  it('markKept is the shipped verb and dispatches nowhere', () => {
    const res = markKept(3);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.action).toBe('kept');
      expect(res.record.scene).toBe(KEEP_SCENE);
      expect(res.record.scene).toBe('album');
    }
  });

  it('markKept refuses a nonsense day (the ledger never lies)', () => {
    expect(markKept(0).ok).toBe(false);
    expect(markKept(Number.NaN).ok).toBe(false);
  });

  it('every other scene key is refused \u2014 including the shipped ones', () => {
    expect(markSent('album', 3, false).ok).toBe(false);
    expect(markSent('C3-therapy', 3, false).ok).toBe(false);
    expect(markSent('C4-F7', 3, false).ok).toBe(false);
    expect(markSent('day-end', 3, false).ok).toBe(false);
    expect(markSent('', 3, false).ok).toBe(false);
  });

  it('the ONE send is C5\u2019s, to Ada, exactly once per save', () => {
    expect(SENT_SCENE_C5).toBe('C5-ada');
    const yes = markSent(SENT_SCENE_C5, 700, false);
    expect(yes.ok).toBe(true);
    if (yes.ok && yes.action === 'sent') {
      expect(yes.to).toBe('Ada'); // the recipient is the law, not data
      expect(yes.record.day).toBe(700);
    }
    expect(markSent(SENT_SCENE_C5, 701, true).ok).toBe(false); // once, ever
  });

  it('the state\u2019s send door opens only for C5\u2019s key and only once', () => {
    const s = new GameState();
    s.calendarDay = 700;
    expect(s.sendPostcardFromC5('C4-F7')).toBe(false);
    expect(s.sentPostcardDay).toBeNull();
    expect(s.sendPostcardFromC5(SENT_SCENE_C5)).toBe(true);
    expect(s.sentPostcardDay).toBe(700);
    expect(s.sendPostcardFromC5(SENT_SCENE_C5)).toBe(false);
  });

  it('the send rides the save (v1-safe) and parses back', () => {
    const s = new GameState();
    s.day = 2;
    s.calendarDay = 700;
    s.sendPostcardFromC5(SENT_SCENE_C5);
    const snap = s.snapshotForSave();
    expect(snap?.sent_postcard).toEqual({ day: 700 });
  });
});

describe('R9 — the interface promises nothing', () => {
  it('no UI string promises mailing (the banned verbs, scanned live)', () => {
    const offenders = uiFiles()
      .map((f) => ({ f, text: readFileSync(f, 'utf8') }))
      .flatMap(({ f, text }) => auditMailingPromises(text.split('\n')).map((l) => `${f}: ${l.trim()}`));
    expect(offenders).toEqual([]);
  });

  it('the shipped share verb survives the audit (the panel\u2019s only offer)', () => {
    const ui = readFileSync(join(SRC, 'ui', 'UI.ts'), 'utf8');
    expect(ui).toContain('postcard-share');
    expect(auditMailingPromises(['Share the postcard in the panel'])).toEqual([]);
  });
});
