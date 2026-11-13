/**
 * The field diary's ink — WP-6 (narrative/14 R3 + §4, narrative/03 §2/§5.1).
 *
 * "The Map renders entries as ink" (R3's acceptance line). The Map is the
 * instrument, the diary is the voice: this module draws the voice ON the
 * instrument — a folded-over leaf of the same paper, reached by a tab —
 * plus the calendar dateline on the HUD (the date the block is living).
 *
 * The ink is two draw calls' worth of UI (narrative/14 §4): one handwriting
 * font (--hand-font, already shipped) and the RECALL wobble style. The
 * contradiction strikethrough is a TEXT style, never an image (§4). The
 * entries themselves are pure state (core/fieldDiary.ts) — this module
 * only ever reads, exactly like sketch.ts reads the content tables.
 *
 * Laws pinned by tests/ui-diary-ink.test.ts:
 *   1. **The date renders from the calendar, never real time** (R4): the
 *      only date door is core/calendar's `formatGameDate`; there is no
 *      `Date` object in this file and must never be one. The HUD/leaf
 *      dateline TEXT arrives rendered (Game passes it through
 *      `datelineOfStoryDay` — epochMap's one mapping); this module never
 *      derives a date itself.
 *   2. **Append-only survives rendering** (doc 03 §5.1): a correction
 *      strikes the offending text with a span and adds the margin note —
 *      the body's bytes are never edited away. Strip the spans and you
 *      get the entry's body back, byte for byte.
 *   3. **The RECALL wobble is deterministic** (doc 03 §2: "soft ink,
 *      wobble"): fixed transforms, no animation, no random — a notebook
 *      that redraws itself between reads would feel haunted (sketch.ts
 *      law).
 *   4. **Quarantine, never crash**: whatever the entries array holds, the
 *      render never throws — the parse layer guarantees the shape, and
 *      this layer degrades honestly (unknown epistemic renders plain).
 *
 * Build-once DOM, then only text/innerHTML/class flips on render — the
 * sketch's law. Mounts are idempotent: a twice-mounted sheet still holds
 * exactly one tab, one leaf, one HUD dateline.
 */

import { formatGameDate } from '../core/calendar';
import type { FieldDiaryEntry } from '../core/fieldDiary';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] ?? c));
}

// ------------------------------------------------ the strike (doc 03 §5.1) ----

/** One struck segment: the body's bytes, grouped by whether a correction
 *  has claimed them. Pure; the input is never mutated. */
interface StrikeSegment {
  text: string;
  struck: boolean;
}

/**
 * Apply a correction's strike to the segments: the FIRST plain occurrence
 * of the offending text is claimed (one strike per correction — the body
 * is quoted, not rewritten). A strike that quotes nothing present is
 * skipped here; the margin note still renders (append-only honesty: the
 * correction exists even where its quote has aged out of the visible
 * body). Deterministic: same input → same segments.
 */
function applyStrikeToSegments(segments: StrikeSegment[], strike: string): StrikeSegment[] {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.struck || seg.text.length === 0) continue;
    const at = seg.text.indexOf(strike);
    if (at < 0) continue;
    const next: StrikeSegment[] = [];
    if (at > 0) next.push({ text: seg.text.slice(0, at), struck: false });
    next.push({ text: strike, struck: true });
    if (at + strike.length < seg.text.length) {
      next.push({ text: seg.text.slice(at + strike.length), struck: false });
    }
    return [...segments.slice(0, i), ...next, ...segments.slice(i + 1)];
  }
  return segments;
}

/** The body's HTML: the frozen bytes, with each claimed span wrapped in a
 *  strike. Strip the tags and the original body returns byte for byte —
 *  the append-only law survives rendering. */
export function buildStruckBodyHtml(entry: FieldDiaryEntry): string {
  let segments: StrikeSegment[] = [{ text: entry.body, struck: false }];
  for (const c of entry.corrections) {
    segments = applyStrikeToSegments(segments, c.strike);
  }
  return segments
    .map((s) => (s.struck
      ? `<span class="diary-strike">${escapeHtml(s.text)}</span>`
      : escapeHtml(s.text)))
    .join('');
}

// ------------------------------------------------------- the entry block ----

/**
 * One entry as ink: the mechanical epistemic tag and the in-game dateline
 * (through `formatGameDate` — the one date door, R4), the body with its
 * strikes, and the margin notes in current-tense Leo. The `data-` attrs
 * carry what CSS styles: the RECALL wobble reads `data-epistemic`, the
 * deterministic tilt reads the entry's position (nth-child).
 */
export function buildDiaryEntryHtml(entry: FieldDiaryEntry): string {
  const meta = `${escapeHtml(entry.epistemic)} \u00B7 ${formatGameDate(entry.date)}`;
  const margins = entry.corrections
    .map((c) => `<div class="diary-margin">${escapeHtml(c.margin)}</div>`)
    .join('');
  return `<div class="diary-entry" data-entry-id="${escapeHtml(entry.id)}"`
    + ` data-epistemic="${escapeHtml(entry.epistemic)}"`
    + ` data-kind="${escapeHtml(entry.kind)}">`
    + `<div class="diary-entry-meta">${meta}</div>`
    + `<div class="diary-body">${buildStruckBodyHtml(entry)}</div>`
    + margins
    + `</div>`;
}

/** The leaf's static furniture — built once (the sketch's law). The list
 *  and the dateline are the only parts that ever change. */
export function buildDiaryPageHtml(): string {
  return `<div class="map-margin-title">What I wrote</div>`
    + `<div id="map-diary-dateline" class="diary-leaf-dateline"></div>`
    + `<div id="map-diary-list"></div>`
    + `<div id="map-diary-empty" class="map-empty">Nothing yet. The pages are waiting.</div>`;
}

// ------------------------------------------------------------- the mounts ----

export interface DiaryInkHandle {
  /** Rebuild the ink: the entries array as it stands. A rebuild of the
   *  list only — the leaf's paper never rebuilds (the sketch's law). */
  render(entries: readonly FieldDiaryEntry[]): void;
  /** The dateline the leaf shares with the HUD — rendered text in,
   *  never a date derived here. */
  setDateline(text: string): void;
}

/** Mount the diary leaf and its tab onto the Map's sheet. Idempotent: a
 *  sheet that already holds the ink is left alone and re-exposed. The tab
 *  is a real button — it folds the leaf over the notebook and back; the
 *  touch contract rides the Map's own paper surface (the panel is already
 *  a touchPanelUp surface; the diary adds NO door of its own). */
export function mountDiaryInk(sheet: HTMLElement): DiaryInkHandle {
  let tab = sheet.querySelector<HTMLButtonElement>('#diary-tab');
  let leaf = sheet.querySelector<HTMLDivElement>('#map-diary-leaf');
  if (!tab || !leaf) {
    tab = document.createElement('button');
    tab.type = 'button';
    tab.id = 'diary-tab';
    tab.className = 'diary-tab';
    tab.textContent = 'my diary';
    tab.setAttribute('aria-expanded', 'false');
    tab.setAttribute('aria-controls', 'map-diary-leaf');
    tab.setAttribute('aria-label', 'My diary \u2014 what I wrote');
    leaf = document.createElement('div');
    leaf.id = 'map-diary-leaf';
    leaf.className = 'diary-leaf';
    leaf.setAttribute('role', 'region');
    leaf.setAttribute('aria-label', 'The field diary');
    leaf.innerHTML = buildDiaryPageHtml();
    sheet.appendChild(leaf);
    sheet.appendChild(tab);
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !leaf!.classList.contains('open');
      leaf!.classList.toggle('open', open);
      tab!.setAttribute('aria-expanded', String(open));
    });
  }
  const list = leaf.querySelector<HTMLDivElement>('#map-diary-list');
  const empty = leaf.querySelector<HTMLDivElement>('#map-diary-empty');
  const dateline = leaf.querySelector<HTMLDivElement>('#map-diary-dateline');
  return {
    render(entries: readonly FieldDiaryEntry[]): void {
      if (!list) return;
      list.innerHTML = entries.map((e) => buildDiaryEntryHtml(e)).join('');
      if (empty) empty.hidden = entries.length > 0;
    },
    setDateline(text: string): void {
      if (dateline) dateline.textContent = text;
    },
  };
}

export interface DatelineHandle {
  set(text: string): void;
}

/** Mount the HUD dateline — the calendar date the block is living, under
 *  the clock. Idempotent. The text arrives rendered (Game passes it
 *  through `datelineOfStoryDay`); this element never derives a date. */
export function mountDateline(hudTopRight: HTMLElement): DatelineHandle {
  let el = hudTopRight.querySelector<HTMLDivElement>('#hud-dateline');
  if (!el) {
    el = document.createElement('div');
    el.id = 'hud-dateline';
    hudTopRight.appendChild(el);
  }
  return { set(text: string): void { el!.textContent = text; } };
}
