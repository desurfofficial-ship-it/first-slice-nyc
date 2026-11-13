/**
 * The player's identity — narrative/14 R11, doc 02 §1.
 *
 * Doc 02 §1's law, verbatim:
 *   "Default name: Leo Marsh. The player may change first name, last
 *   name, and nickname at start (the existing starter-look picker and
 *   name entry carry over)."
 *   "Implementation note: all canon attaches to the identity constant
 *   LM-PROTAGONIST. Dialogue must propagate the chosen name (doc 14,
 *   R11). The block never learns the surname casually — neighbors call
 *   him by first name, which the game treats as earned intimacy."
 *
 * So this module is the ONE name truth: the identity (who got off the
 * bus), the surname gate (`surnameKnown` — the block's earned intimacy
 * is a flag, not a vibe), and the propagation seam every spoken line,
 * diary template and text message resolves through. No module may
 * hardcode "Leo" into a line that addresses the player — the name is
 * content-table data, and the tests pin it.
 *
 * Pure state, zero DOM — the core seam law (the same shape as
 * core/fluency.ts). The identity rides the save as `player_name`
 * (optional v1-safe; absent reads as the canon default).
 */

/** Doc 02's identity constant — every canon reference to the protagonist
 *  attaches to this id, never to a spelled name. */
export const LM_PROTAGONIST = 'LM-PROTAGONIST';

/** The player's chosen identity. `nick` may be empty (it is optional in
 *  doc 02's own list). */
export interface PlayerIdentity {
  first: string;
  nick: string;
  last: string;
}

/** Doc 02 §1's default, verbatim. */
export const DEFAULT_IDENTITY: Readonly<PlayerIdentity> = Object.freeze({
  first: 'Leo',
  nick: '',
  last: 'Marsh',
});

/** Field caps — a name is a breath, not a form (the pick card's own law:
 *  30 seconds, all delightful). */
export const NAME_CAPS = { first: 16, nick: 16, last: 20 } as const;

function clean(v: unknown, cap: number): string {
  if (typeof v !== 'string') return '';
  // collapse whitespace; a name never contains control characters
  return v.replace(/\s+/g, ' ').trim().slice(0, cap);
}

/** Sanitize raw picker input into an identity. Any field that does not
 *  survive falls back to the canon default FOR THAT FIELD — a player who
 *  clears the surname is still Marsh to the paperwork (the lease, the
 *  permit) even if the block never says it. */
export function sanitizeIdentity(raw: unknown): PlayerIdentity {
  const src = (typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? raw
    : {}) as Record<string, unknown>;
  const first = clean(src['first'], NAME_CAPS.first) || DEFAULT_IDENTITY.first;
  const last = clean(src['last'], NAME_CAPS.last) || DEFAULT_IDENTITY.last;
  const nick = clean(src['nick'], NAME_CAPS.nick);
  return { first, nick, last };
}

// -------------------------------------------------------- the surname gate ----

/** How a line may address him. `full` is gated: see resolveName. */
export type AddressForm = 'first' | 'nick' | 'full';

/** Resolve an address against the surname gate. The law (doc 02 §1):
 *  the block never learns the surname casually — a `full` request with
 *  `surnameKnown` false degrades to the first name (earned intimacy is
 *  the ONLY door to the surname). Nicknames resolve only when authored. */
export function resolveName(
  identity: PlayerIdentity,
  form: AddressForm,
  surnameKnown: boolean,
): string {
  if (form === 'full' && surnameKnown) return `${identity.first} ${identity.last}`.trim();
  if (form === 'nick' && identity.nick) return identity.nick;
  return identity.first;
}

// ------------------------------------------------------------ propagation ----

/** The content-table convention (doc 14 R11): line variants keyed to the
 *  `surnameKnown` flag. A variant list must carry exactly the rows it
 *  means to offer; pickVariant picks the row for the gate's current
 *  state, falling back to the ungated row when no gated row exists. */
export interface NameVariant {
  /** true = this row may speak the surname; false = first-name row. */
  surnameKnown: boolean;
  text: string;
}

export function pickVariant(variants: readonly NameVariant[], surnameKnown: boolean): string {
  if (variants.length === 0) throw new Error('identity: empty variant table');
  const exact = variants.find((v) => v.surnameKnown === surnameKnown);
  if (exact) return exact.text;
  const ungated = variants.find((v) => !v.surnameKnown);
  if (!ungated) throw new Error('identity: no ungated variant to fall back to');
  return ungated.text;
}

/** The propagation seam: substitute name tokens in a template.
 *   {name}  → the block's address (first name — the gate degrades fulls)
 *   {nick}  → the nickname, or the first name when none was chosen
 *   {full}  → the gated full name (first+last only when surnameKnown)
 * Unknown tokens pass through untouched (a template bug is visible, not
 * silently eaten). */
export function withName(
  template: string,
  identity: PlayerIdentity,
  opts: { surnameKnown: boolean },
): string {
  return template
    .replaceAll('{name}', resolveName(identity, 'first', opts.surnameKnown))
    .replaceAll('{nick}', resolveName(identity, 'nick', opts.surnameKnown))
    .replaceAll('{full}', resolveName(identity, 'full', opts.surnameKnown));
}

/** The audit the tests run (R11's acceptance, machine-checked): a line
 *  that addresses the player must not hardcode the DEFAULT name — the
 *  chosen name is the name the block learns (doc 11 §5). Returns the
 *  offending strings; an empty result is a clean table. The check is
 *  token-aware: a literal "Leo" inside a quoted CANON quote (doc 11's
 *  own lines never address him by name) would be a bug, so any hit is
 *  reported and the content must re-key it to {name}. */
export function auditHardcodedNames(lines: readonly string[]): string[] {
  return lines.filter((l) => /\bLeo\b/.test(l) || /\bMarsh\b/.test(l));
}
