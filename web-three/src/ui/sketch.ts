/**
 * The sketch — Map's own badly-copied map of the neighborhood, page 1's
 * body (docs/12 prototype 2 + GDD §4.0's "Map is allowed to be wrong or
 * messy. It copies the subway lines badly").
 *
 * Pure DOM/SVG string-building, built ONCE per page load and then only
 * class/attribute-flipped: `revealed` on places you've walked to, and the
 * star's translate. Deterministic — the same wobble every boot, because a
 * notebook that redraws itself between reads would feel haunted.
 */

import { MAP_PLACES, SKETCH_BOUNDS, BEAT_READY_CAPTION } from '../core/content';

const P = SKETCH_BOUNDS;

/** World (x, z) → SVG user units: y is flipped so north is up, with one
 *  unit of padding on every side. */
function toX(x: number): number { return x; }
function toY(z: number): number { return -z; }

/** One place's pencil doodle, in local units (~±1.6). Hand-varied by the
 *  place's fixed tilt so no two marks read identical. */
function doodle(kind: string): string {
  switch (kind) {
    case 'bus':
      return `<rect class="sketch-stroke" x="-1.5" y="-0.55" width="3" height="1.2" rx="0.35"/>`
        + `<circle class="sketch-stroke" cx="-0.8" cy="0.75" r="0.24"/>`
        + `<circle class="sketch-stroke" cx="0.8" cy="0.75" r="0.24"/>`
        + `<line class="sketch-stroke" x1="-0.9" y1="-0.15" x2="0.9" y2="-0.15"/>`;
    case 'store':
      return `<path class="sketch-stroke" d="M-1.5,0.5 L-1.5,-0.3 Q0,-1.25 1.5,-0.3 L1.5,0.5 Z"/>`
        + `<line class="sketch-stroke" x1="-0.45" y1="0.5" x2="-0.45" y2="-0.35"/>`
        + `<line class="sketch-stroke" x1="0.45" y1="0.5" x2="0.45" y2="-0.35"/>`;
    case 'globe':
      return `<circle class="sketch-stroke" cx="0" cy="-0.5" r="0.6"/>`
        + `<line class="sketch-stroke" x1="0" y1="0.1" x2="0" y2="0.85"/>`
        + `<path class="sketch-stroke" d="M-0.32,-0.5 Q0,-0.85 0.32,-0.5"/>`;
    case 'cart':
      return `<rect class="sketch-stroke" x="-1.1" y="-0.15" width="1.7" height="0.95" rx="0.15"/>`
        + `<circle class="sketch-stroke" cx="-0.7" cy="1.0" r="0.22"/>`
        + `<circle class="sketch-stroke" cx="0.25" cy="1.0" r="0.22"/>`
        + `<rect class="sketch-stroke" x="0.65" y="-0.85" width="0.62" height="0.8" rx="0.1"/>`
        + `<path class="sketch-stroke sketch-steam" d="M0.96,-1.05 q0.22,-0.3 0,-0.6"/>`;
    case 'slice':
      return `<path class="sketch-stroke" d="M0,-0.85 L0.8,0.6 L-0.8,0.6 Z"/>`
        + `<circle class="sketch-dot" cx="0" cy="0.05" r="0.14"/>`
        + `<circle class="sketch-dot" cx="0.28" cy="0.38" r="0.12"/>`;
    case 'tree':
      return `<circle class="sketch-stroke" cx="0" cy="-0.5" r="0.8"/>`
        + `<line class="sketch-stroke" x1="0" y1="0.3" x2="0" y2="0.9"/>`
        + `<path class="sketch-stroke" d="M-0.5,-0.75 q0.5,-0.35 1,0"/>`;
    case 'pole':
      return `<circle class="sketch-stroke" cx="0" cy="-0.25" r="0.55"/>`
        + `<line class="sketch-stroke" x1="-0.36" y1="-0.62" x2="0.36" y2="0.12"/>`
        + `<line class="sketch-stroke" x1="-0.36" y1="-0.2" x2="0.36" y2="0.54"/>`;
    case 'court':
      return `<line class="sketch-stroke" x1="0" y1="0.9" x2="0" y2="-0.5"/>`
        + `<rect class="sketch-stroke" x="-0.12" y="-1.15" width="0.95" height="0.65" rx="0.06"/>`
        + `<ellipse class="sketch-stroke" cx="0.28" cy="-0.28" rx="0.42" ry="0.14"/>`;
    case 'wash':
      return `<rect class="sketch-stroke" x="-0.75" y="-0.75" width="1.5" height="1.5" rx="0.16"/>`
        + `<circle class="sketch-stroke" cx="0" cy="0" r="0.5"/>`
        + `<line class="sketch-stroke" x1="-0.75" y1="-0.42" x2="0.75" y2="-0.42"/>`;
    default:
      return `<circle class="sketch-stroke" cx="0" cy="0" r="0.6"/>`;
  }
}

/** The street copy — two wobbly curbs and the crosswalk dash, drawn once.
 *  Slightly wrong on purpose: the Q kinks and the 0.6° tilt are Map's
 *  handwriting, not a survey. */
function streetsSvg(): string {
  const x0 = P.xMin + 1, x1 = P.xMax - 1;
  const tilt = -0.6;
  const curb = (z: number, k: number) =>
    `<path class="sketch-stroke sketch-curb" d="M${x0},${toY(z) + k} Q${(x0 + x1) / 2},${toY(z) - 0.35 + k} ${x1},${toY(z) + k}"/>`;
  const dashes: string[] = [];
  for (let x = -5.9; x <= -4.1; x += 0.75) {
    dashes.push(`<line class="sketch-stroke sketch-dash" x1="${x}" y1="${toY(8.2)}" x2="${x}" y2="${toY(4.5)}"/>`);
  }
  return `<g class="sketch-streets" transform="rotate(${tilt} 0 ${toY(6.3)})">`
    + curb(8.2, 0) + curb(4.5, 0) + dashes.join('') + `</g>`;
}

/** Labels that live ABOVE the doodle — the spots where two places sit
 *  close enough that below-labels would collide (Rosa's / the terminal). */
const LABEL_ABOVE = new Set(['bodega', 'globe']);

/** Map's crooked copy of Priya's two lines (docs/02 Subway University,
 *  docs/51 B11) — page 1's bottom-left margin, drawn after the ride's
 *  'map-copies' beat. Badly, by law: the river line dips too deep, the
 *  lights line sags, the pencil labels hedge. Priya taps it anyway:
 *  "See? You already can read it." Hidden until the beat latches
 *  (`.revealed`, the same law as the places). The bottom-left corner is
 *  empty paper (nearest mark: the globe, y −6.2 — eight units away). */
function priyaLinesSvg(): string {
  const y = toY(P.zMin); // 10 — the bottom band of the page (edge at 11)
  return `<g class="sketch-priya" id="sketch-priya">`
    + `<path class="sketch-stroke sketch-priya-lights" d="M-44.8,${y - 2.4} q2.2,-0.5 4.4,-0.1 q1.2,0.2 2.2,-0.15"/>`
    + `<path class="sketch-stroke sketch-priya-river" d="M-45,${y - 1.0} q1.6,1.8 3.4,1.6 q2.0,-0.2 3.2,-2.0"/>`
    + `<text class="sketch-label" x="-37.2" y="${y - 2.2}">the lights??</text>`
    + `<text class="sketch-label" x="-36.9" y="${y - 0.7}">under the river</text>`
    + `</g>`;
}

/** M1 — the beat marker (docs/architecture/05): Rosa's ink circle around
 *  the story beat's spot, her one patient line as the caption. Hidden by
 *  default; the transform and the `active` class are applied from the
 *  state's beatPlaceId() — the same helper the objective line reads, so
 *  the marker and the HUD can never disagree. */
function beatMarkerSvg(): string {
  return `<g class="sketch-beat" id="sketch-beat">`
    + `<circle class="sketch-beat-ring" r="2.7"/>`
    + `<text class="sketch-beat-note" x="0" y="-3.7" text-anchor="middle">${BEAT_READY_CAPTION}</text>`
    + `</g>`;
}

export function buildSketchSvg(): string {
  const places = MAP_PLACES.map((p) => {
    const ly = LABEL_ABOVE.has(p.id) ? -1.9 : 2.35;
    return `<g class="sketch-place" data-place="${p.id}" transform="translate(${toX(p.x)},${toY(p.z)}) rotate(${p.tilt}) scale(1.18)">`
      + doodle(p.kind)
      + `<text class="sketch-label" x="0" y="${ly}" text-anchor="middle">${p.label}</text>`
      + `</g>`;
  }).join('');
  const star = `<g class="sketch-star" id="sketch-star">`
    + `<path class="sketch-star-fill" d="M0,-1.3 L0.34,-0.34 1.3,0 0.34,0.34 0,1.3 -0.34,0.34 -1.3,0 -0.34,-0.34 Z"/>`
    + `</g>`;
  const vbX = P.xMin - 1, vbY = toY(P.zMax) - 1;
  const vbW = (P.xMax - P.xMin) + 2, vbH = (P.zMax - P.zMin) + 2;
  return `<svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`
    + streetsSvg() + places + star + beatMarkerSvg() + priyaLinesSvg() + `</svg>`;
}
