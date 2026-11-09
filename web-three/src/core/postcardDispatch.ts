/**
 * The postcard dispatch — narrative/14 R9: "Postcards as unsent letters.
 * The shipped pipeline gains a `kept` flag and one `sent` event (C5, to
 * Ada). Acceptance: no postcard UI promises mailing; the C5 scene is the
 * only send."
 *
 * The law, as machinery:
 *  1. The shipped pipeline (capture → caption → panel → album) produces
 *     exactly one verb: KEPT. The album (postcard/Album.ts) stores real
 *     paper; nothing in the shipped path dispatches a card anywhere.
 *  2. There is ONE send in the whole story: C5, to Ada (doc 14 R9). It
 *     is a sealed seam — `markSent` refuses any scene key except the
 *     C5 scene's own id, fires exactly once per save, and the recipient
 *     is the type itself (there is no `to` field to corrupt).
 *  3. The UI never promises mailing (the shipped verb is Share — the
 *     Web Share API; tests pin the absence of mail/mailbox/post-office
 *     promises in the interface strings).
 *
 * Pure state, zero DOM — the core seam law (the same shape as
 * core/fluency.ts). The send rides the save as `sent_postcard`
 * (optional v1-safe; absent reads as never-sent).
 */

/** The shipped pipeline's only verb. The album's keptAt is its record. */
export const KEEP_SCENE = 'album' as const;

/** The ONE scene in the story that may send a postcard: C5, to Ada
 *  (doc 14 R9, verbatim). Any other key is refused — including every
 *  shipped scene id that exists today. */
export const SENT_SCENE_C5 = 'C5-ada' as const;

/** The ONE recipient, in the type system. There is no `to` field on the
 *  saved record: the recipient is the law, not data. */
export type SentRecipient = 'Ada';

/** A dispatch record — what happened to one card. */
export interface DispatchRecord {
  day: number;
  scene: string;
}

export type DispatchDecision =
  | { ok: true; action: 'kept'; record: DispatchRecord }
  | { ok: true; action: 'sent'; to: SentRecipient; record: DispatchRecord }
  | { ok: false; reason: 'wrong-scene' | 'already-sent' | 'bad-day' };

/** The shipped verb — always lawful, never dispatches anywhere. */
export function markKept(day: number): DispatchDecision {
  if (!Number.isFinite(day) || day < 1) {
    return { ok: false, reason: 'bad-day' };
  }
  return { ok: true, action: 'kept', record: { day: Math.trunc(day), scene: KEEP_SCENE } };
}

/** The sealed send. `sceneKey` must be exactly SENT_SCENE_C5 — the C5
 *  scene's own id — and the save must not have sent already (one send
 *  per save; doc 14 R9's "one `sent` event"). The saved record is the
 *  { day } the save field carries; the recipient never travels as data. */
export function markSent(
  sceneKey: string,
  day: number,
  alreadySent: boolean,
): DispatchDecision {
  if (sceneKey !== SENT_SCENE_C5) return { ok: false, reason: 'wrong-scene' };
  if (alreadySent) return { ok: false, reason: 'already-sent' };
  if (!Number.isFinite(day) || day < 1) return { ok: false, reason: 'bad-day' };
  return {
    ok: true,
    action: 'sent',
    to: 'Ada',
    record: { day: Math.trunc(day), scene: SENT_SCENE_C5 },
  };
}

/** The audit the acceptance test runs: the interface strings must not
 *  promise mailing. Returns the offending strings (an empty result is a
 *  clean interface). The banned promises are the mail verbs; "Share"
 *  (the shipped Web Share verb) is the pipeline's only offer. */
export function auditMailingPromises(strings: readonly string[]): string[] {
  const BANNED = /\b(mail|mailbox|post office|mailing|mailer|stamp it and send)\b/i;
  return strings.filter((s) => BANNED.test(s));
}
