/**
 * Wardrobe — the 3D fitting room (Doc 02's six starters, ported from the
 * First-slice-player update's React modal into the game's vanilla UI law:
 * same feature, same paper palette, zero new frameworks).
 *
 * Three laws live here:
 * 1. **The lock law** (the pick is for keeps): the wardrobe is a fitting
 *    room, not a switchboard. Looking is free — the turntable spins every
 *    starter; WEARING is bound to the save. A different look can only be
 *    worn by starting a new game (wardrobeDecision → the confirm strip →
 *    Game wipes the save and reboots on the new face). The chosen character
 *    rides the save; nothing in the UI can change it underneath you.
 * 2. **The seam law** (the game never depends on its extras): the 3D
 *    turntable is a guest, not a dependency. If WebGL is unavailable (old
 *    phone, headless probe) the room degrades to the paper lineup — every
 *    tile still previews its swatch, role and vibe, and every law above
 *    still holds.
 * 3. **The viewer law** (2026-11 — the full-body redesign): the stage is a
 *    real character-inspection camera, not a fixed movie shot. The framing
 *    is computed from the RIG'S OWN BOUNDING BOX (head to soles, plus the
 *    pedestal and its contact shadow), so every build of the character —
 *    tall, short, capped, bun, skateboard on the back — lands fully in
 *    frame with breathing room, on every stage shape. The hand spins the
 *    CHARACTER (a turntable, full 360°, one finger or the mouse), the
 *    vertical drag raises/lowers the inspection camera, and pinch / wheel /
 *    buttons zoom between a face close-up and a full-silhouette pull-back.
 *    The Front / 3/4 / Back chips glide the turntable to their angles by
 *    the shortest arc, Spin keeps its turntable, and every control moves a
 *    TARGET the render value damps toward — no snapping, no fights between
 *    the greeting sway and the player's hand. All of it lives on the stage
 *    canvas only: the street's controls are never touched, the rAF runs
 *    only while the panel is open, and the GL context is still
 *    one-per-session (built lazily, reused after).
 */

import * as THREE from 'three';
import { STARTERS, starterById, type Starter } from '../core/starters';
import { buildArticulatedPerson, buildStarterSkateboard, updatePersonAnim } from '../world/personRig';

/** File-local HTML escaping (the diary.ts/UI.ts precedent) — FS-AUDIT-007's
 *  hardening: interpolated markup always escapes, even developer constants. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] ?? c));
}

/** The one-breath introductions the pick card doesn't have room for. */
export const STARTER_METADATA: Readonly<Record<string, { role: string; vibe: string; tag: string }>> = {
  classic: {
    role: 'Everyday Courier',
    vibe: 'Gold bomber, cream sneakers, iconic messenger bag.',
    tag: 'Classic NY',
  },
  dee: {
    role: 'Morning Skater',
    vibe: 'Teal windbreaker, backwards cap, deck on her back.',
    tag: 'Streets & Hills',
  },
  marisol: {
    role: 'LaGuardia Painter',
    vibe: 'Oatmeal studio jacket with paint marks, high bun.',
    tag: 'Studio Arts',
  },
  ada: {
    role: 'B-Line Matriarch',
    vibe: 'Warm crimson shawl, wire glasses, wisdom of the city.',
    tag: 'Community',
  },
  booker: {
    role: 'Kestrels Left Fielder',
    vibe: 'Tall athletic silhouette, amber varsity jacket.',
    tag: 'Athletics',
  },
  sixto: {
    role: 'Subway Reader',
    vibe: 'Forest green trench, leather book satchel, quiet charm.',
    tag: 'Library Card',
  },
};

/** The lock law, pure. The same look closes the question; a different one
 *  can only be worn through a new game — never a quiet re-dress. */
export type WardrobeDecision =
  | { action: 'close' }
  | { action: 'confirm-new-game'; starterId: string };

export function wardrobeDecision(currentStarterId: string, requestedId: string): WardrobeDecision {
  return requestedId === currentStarterId
    ? { action: 'close' }
    : { action: 'confirm-new-game', starterId: requestedId };
}

/** The lineup as data — every starter with its card facts and the "you"
 *  mark. Pure so the suite pins it; the panel just renders these rows. */
export interface WardrobeRow {
  id: string;
  name: string;
  role: string;
  tag: string;
  vibe: string;
  /** Jacket swatch — the hex the tile wears. */
  swatch: string;
  isCurrent: boolean;
}

export function wardrobeLineup(currentStarterId: string): WardrobeRow[] {
  return STARTERS.map((s: Starter) => {
    const meta = STARTER_METADATA[s.id] ?? { role: 'Resident', vibe: s.blurb, tag: 'New York' };
    return {
      id: s.id,
      name: s.name,
      role: meta.role,
      tag: meta.tag,
      vibe: meta.vibe,
      swatch: '#' + s.look.jacket.toString(16).padStart(6, '0').toUpperCase(),
      isCurrent: s.id === currentStarterId,
    };
  });
}

export interface WardrobeCallbacks {
  /** The lock law's verdict lands here (Game decides; the wardrobe renders). */
  onSwitchRequest: (id: string) => void;
  /** "Start over" confirmed — Game wipes the save and reboots on this face. */
  onNewGame: (id: string) => void;
  /** "Back to the street" / Escape / the pocket toggle. */
  onClose: () => void;
  /** PICK MODE (the film's "who got off the bus?" beat): the first wear is
   *  free — Game applies the pick, the name and the cold open ride it. */
  onPick: (id: string) => void;
}

// ---------------- the inspection-camera math (pure; the suite pins it) ----

/** The greeting: a 3/4 face-on anchor. The RIG faces +Z, the camera starts
 *  at +Z rotated 0.35 rad — the FACE reads first, the silhouette follows. */
export const HOME_YAW = 0.35;
/** The resting elevation — a whisker above eye level, the classic
 *  character-select angle: reads the full figure without looking down on it. */
export const HOME_PITCH = 0.10;
/** Orbit elevation limits — the floor law: even at the far end of the zoom
 *  corridor the camera stays above the floor plane (sin(PITCH_MIN) bounded
 *  against the longest dist and the lowest body center), and never gimbal-
 *  locks over the top. */
export const PITCH_MIN = -0.10;
export const PITCH_MAX = 0.85;

/** Shortest signed arc from `from` to `to` (−π..π). Presets and the Spin
 *  reset use it so a Back→Front turn takes the quarter turn, not the
 *  three-quarter one. */
export function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** The distance that fits a body of `halfHeight` × `halfWidth` inside the
 *  frustum — the bounding-box framing law, per axis: the tighter of the
 *  vertical fit (halfHeight against the vertical fov) and the horizontal
 *  fit (halfWidth against the horizontal fov, which the aspect decides)
 *  wins, and `margin` buys the breathing room around the silhouette.
 *  Per-axis (not a bounding sphere) because a standing figure's sphere is
 *  dominated by its diagonal — sphere-fitting a tall body pushes the
 *  camera back until the character floats small in the middle of the
 *  frame, which is exactly the "tiny preview model" look this file exists
 *  to kill. */
export function fitDistanceFor(
  halfHeight: number, halfWidth: number, fovRad: number, aspect: number, margin = 1.12,
): number {
  const tanV = Math.tan(fovRad / 2);
  const tanH = tanV * Math.max(aspect, 0.2);
  const distV = halfHeight / tanV;
  const distW = halfWidth / tanH;
  return Math.max(distV, distW) * margin;
}

/** The zoom corridor: in to a face close-up, out to a full-silhouette
 *  pull-back — never through the character, never off the pedestal. */
export function zoomRangeFor(radius: number, fitDist: number): { min: number; max: number } {
  return {
    min: Math.max(0.45, radius * 0.55),
    max: Math.max(radius * 2.2, fitDist * 1.9),
  };
}

const el = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} missing`);
  return node as T;
};

export class Wardrobe {
  private readonly panel: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly lineup: HTMLElement;
  private readonly metaBox: HTMLElement;
  private readonly metaName: HTMLElement;
  private readonly metaRole: HTMLElement;
  private readonly metaVibe: HTMLElement;
  private readonly confirmBox: HTMLElement;
  private readonly confirmText: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly title: HTMLElement;
  private readonly sub: HTMLElement;
  private readonly closeBtn: HTMLButtonElement;
  private readonly lockNote: HTMLElement;
  private readonly pickRow: HTMLElement;
  private readonly wearBtn: HTMLButtonElement;

  private currentStarterId = 'classic';
  private previewId = 'classic';
  private autoSpin = false;      // the Spin button's full turntable (opt-in)
  private sway = true;           // the greeting: a slow breath around the face
  private pickMode = false;

  // — the inspection camera: render values damp toward targets, so drag,
  // zoom, presets and Spin all write TARGETS and never fight each other —
  private yaw = HOME_YAW;
  private pitch = HOME_PITCH;
  private dist = 0;              // 0 → the very first frame glides out to full body
  private yawTarget = HOME_YAW;
  private pitchTarget = HOME_PITCH;
  private distTarget = 0;
  private homeDist = 3.8;        // the full-body fit; recomputed from the bbox
  private minDist = 0.6;
  private maxDist = 7;
  private boundsCenter = new THREE.Vector3(0, 0.84, 0);
  private headY = 1.6;           // the close-up's aim (top of the rig, eased down)
  private userTouched = false;   // any drag/zoom/preset parks the greeting sway
  /** One finger orbits; two fingers pinch-zoom. Each pointer tracked by id. */
  private pointers = new Map<number, { x: number; y: number }>();
  private dragging = false;
  private pinchLen = 0;
  private readonly orbitTarget = new THREE.Vector3(0, 0.84, 0);

  // the turntable guest (lazily built; the seam law keeps it optional)
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private charRoot: THREE.Group | null = null;
  private rafId = 0;
  private lastTime = 0;
  /** Reframe the face when the stage size changes (orientation / keyboard). */
  private stageObserver: ResizeObserver | null = null;

  constructor(private readonly cb: WardrobeCallbacks) {
    this.panel = el('wardrobe-panel');
    this.canvas = el<HTMLCanvasElement>('wardrobe-canvas');
    this.lineup = el('wardrobe-lineup');
    this.metaBox = el('wardrobe-meta');
    this.metaName = el('wardrobe-meta-name');
    this.metaRole = el('wardrobe-meta-role');
    this.metaVibe = el('wardrobe-meta-vibe');
    this.confirmBox = el('wardrobe-confirm');
    this.confirmText = el('wardrobe-confirm-text');
    this.hint = el('wardrobe-hint');
    this.title = el('wardrobe-title');
    this.sub = el('wardrobe-sub');
    this.closeBtn = el<HTMLButtonElement>('wardrobe-close');
    this.lockNote = el('wardrobe-locknote');
    this.pickRow = el('wardrobe-pick');
    this.wearBtn = el<HTMLButtonElement>('wardrobe-wear');

    this.closeBtn.addEventListener('click', () => this.cb.onClose());
    el<HTMLButtonElement>('wardrobe-keep').addEventListener('click', () => this.hideConfirm());
    el<HTMLButtonElement>('wardrobe-newgame').addEventListener('click', () => {
      this.cb.onNewGame(this.previewId);
    });
    this.wearBtn.addEventListener('click', () => this.cb.onPick(this.previewId));
    el<HTMLButtonElement>('wardrobe-front').addEventListener('click', () => this.preset(0));
    el<HTMLButtonElement>('wardrobe-quarter').addEventListener('click', () => this.preset(HOME_YAW));
    el<HTMLButtonElement>('wardrobe-back').addEventListener('click', () => this.preset(Math.PI));
    const spinBtn = el<HTMLButtonElement>('wardrobe-spin');
    spinBtn.addEventListener('click', () => {
      if (this.autoSpin) { // full turntable off → back to the gentle greeting
        this.autoSpin = false;
        this.sway = true;
        this.userTouched = false;
        this.yawTarget += shortestAngleDelta(this.yawTarget, HOME_YAW);
        this.pitchTarget = HOME_PITCH;
        this.distTarget = this.homeDist;
      } else {
        this.autoSpin = true;
        this.sway = false;
      }
      spinBtn.setAttribute('aria-pressed', String(this.autoSpin || this.sway));
      spinBtn.classList.toggle('off', !this.autoSpin && !this.sway);
    });

    // zoom buttons — the touch-first path (no wheel, no pinch needed)
    el<HTMLButtonElement>('wardrobe-zoom-in').addEventListener('click', () => this.zoomBy(0.8));
    el<HTMLButtonElement>('wardrobe-zoom-out').addEventListener('click', () => this.zoomBy(1.25));
    el<HTMLButtonElement>('wardrobe-zoom-fit').addEventListener('click', () => this.fitFrame());

    // the inspection drag: one finger (or the mouse) orbits — yaw follows
    // the horizontal hand, pitch the vertical; two fingers pinch to zoom.
    // touch-action:none on the stage keeps the page out of the way, and
    // pointer capture keeps the gesture ours even off the canvas.
    this.canvas.addEventListener('pointerdown', (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.dragging = true;
      } else if (this.pointers.size === 2) {
        this.dragging = false; // two fingers: the pinch owns the gesture
        this.pinchLen = this.pinchDistance();
      }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      if (this.pointers.size === 1 && this.dragging) {
        // the hand turns the CHARACTER (the turntable law): horizontal drag
        // spins the rig, vertical drag raises/lowers the inspection camera
        // (drag down → the camera climbs → the top of the head shows)
        this.yawTarget += (e.clientX - p.x) * 0.012;
        this.pitchTarget = THREE.MathUtils.clamp(
          this.pitchTarget + (e.clientY - p.y) * 0.006, PITCH_MIN, PITCH_MAX,
        );
        this.userTouched = true;
      }
      p.x = e.clientX;
      p.y = e.clientY;
      if (this.pointers.size === 2) {
        const len = this.pinchDistance();
        if (this.pinchLen > 0 && len > 0) this.zoomBy(this.pinchLen / len);
        this.pinchLen = len;
      }
    });
    const drop = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) this.dragging = false;
      else if (this.pointers.size === 1) { this.dragging = true; this.pinchLen = 0; }
    };
    this.canvas.addEventListener('pointerup', drop);
    this.canvas.addEventListener('pointercancel', drop);
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault(); // the page never scrolls under the inspection hand
      this.zoomBy(Math.pow(1.0015, e.deltaY));
    }, { passive: false });

    // Escape folds the room (the pocket's law, mirrored here) — never during
    // a pick: the first fit is the story's door, it cannot be escaped shut
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isOpen && !this.pickMode) {
        e.preventDefault();
        this.cb.onClose();
      }
    });
  }

  /** PICK MODE — the film's handover asks "who got off the bus?" through the
   *  real fitting room: every tile previews live, the wear button applies,
   *  the name row rides beneath (the paper card retires). No confirm strip:
   *  nothing has been worn yet, there is nothing to wipe. */
  openPick(currentStarterId: string): void {
    this.pickMode = true;
    this.title.textContent = 'Who got off the bus?';
    this.sub.textContent = 'Six ways onto the block. Spin one around — wear the face that feels right; the name rides with it.';
    this.panel.setAttribute('aria-label', 'Pick who got off the bus');
    this.closeBtn.hidden = true;
    this.lockNote.hidden = true;
    this.confirmBox.hidden = true;
    this.pickRow.hidden = false;
    this.open(currentStarterId);
  }

  /** Back to the fitting room's own shape (Game calls this after the pick). */
  endPickMode(): void {
    this.pickMode = false;
    this.title.textContent = 'Wardrobe — the fitting room';
    this.sub.textContent = 'Six ways onto the block. The pick is for keeps.';
    this.panel.setAttribute('aria-label', 'Wardrobe — the fitting room');
    this.closeBtn.hidden = false;
    this.lockNote.hidden = false;
    this.pickRow.hidden = true;
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  /** Who the save is wearing right now — the lock law's anchor. */
  get wearingId(): string {
    return this.currentStarterId;
  }

  open(currentStarterId: string): void {
    this.currentStarterId = currentStarterId;
    this.previewId = currentStarterId;
    // face-on 3/4 greeting, full body — the FACE and the FIT both read first
    this.yaw = HOME_YAW;
    this.pitch = HOME_PITCH;
    this.yawTarget = HOME_YAW;
    this.pitchTarget = HOME_PITCH;
    this.userTouched = false;
    this.sway = true;
    this.hideConfirm();
    this.renderLineup();
    this.renderMeta();
    this.panel.hidden = false;
    this.ensureStage();
    // the greeting snaps to full body on open; the zoom corridor is set by
    // frameCharacter() inside dressPreview() — glide only within a visit
    this.dist = this.distTarget = this.homeDist;
    this.startLoop();
  }

  close(): void {
    this.panel.hidden = true;
    this.stopLoop();
    if (this.pickMode) this.endPickMode();
  }

  /** The verdict surfaces: the confirm strip asks before anything moves. */
  showConfirm(starterId: string): void {
    this.previewId = starterId;
    this.renderMeta();
    const st = starterById(starterId);
    this.confirmText.textContent =
      `Start over as ${st.name}? A new game wipes the diary, the postcards and the days — the block forgets you, kindly.`;
    this.confirmBox.hidden = false;
    // the question is the panel's focus now; the lineup stands down
    this.lineup.setAttribute('aria-disabled', 'true');
  }

  hideConfirm(): void {
    this.confirmBox.hidden = true;
    this.lineup.removeAttribute('aria-disabled');
    this.previewId = this.currentStarterId;
    this.renderMeta();
  }

  /** "That's already you" — the tile says it, no strip needed. */
  showAlreadyWearing(): void {
    this.hint.textContent = 'That’s already you.';
    this.hint.classList.add('flash');
    window.setTimeout(() => {
      this.hint.classList.remove('flash');
      this.hint.textContent = 'Drag to spin · pinch or scroll to zoom';
    }, 1400);
  }

  // ---------------- internals ----------------

  private renderLineup(): void {
    this.lineup.innerHTML = '';
    for (const row of wardrobeLineup(this.currentStarterId)) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'starter-tile wardrobe-tile' + (row.isCurrent ? ' wearing' : '')
        + (row.id === this.previewId ? ' previewing' : '');
      tile.dataset.starter = row.id;
      // FS-AUDIT-007 (hardening): the lineup is a developer-constant
      // catalogue today, but the render must not depend on that — every
      // interpolated value is escaped, and the swatch must prove itself a
      // plain hex color before it may touch a style attribute.
      const swatch = /^#[0-9a-fA-F]{3,8}$/.test(row.swatch) ? row.swatch : '#888888';
      tile.innerHTML =
        `<span class="wardrobe-swatch" style="background:${swatch}"></span>`
        + `<span class="starter-name">${escapeHtml(row.name)}</span>`
        + `<span class="wardrobe-role">${escapeHtml(row.role)}</span>`
        + (row.isCurrent && !this.pickMode ? '<span class="wardrobe-you">You</span>' : '');
      tile.addEventListener('click', () => {
        this.previewId = row.id;
        this.renderLineup();
        this.renderMeta();
        this.dressPreview();
        if (!this.pickMode) this.cb.onSwitchRequest(row.id);
      });
      this.lineup.appendChild(tile);
    }
  }

  private renderMeta(): void {
    const st = starterById(this.previewId);
    const meta = STARTER_METADATA[st.id] ?? { role: 'Resident', vibe: st.blurb, tag: 'New York' };
    this.metaName.textContent = st.name;
    this.metaRole.textContent = meta.role;
    this.metaVibe.textContent = meta.vibe;
    this.metaBox.hidden = false;
  }

  /** Lazy stage: build the scene once; degrade to paper if WebGL is absent. */
  private ensureStage(): void {
    if (this.scene) return;
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      gl = this.canvas.getContext('webgl2') as WebGL2RenderingContext | null
        ?? this.canvas.getContext('webgl') as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (!gl) { // the seam law: paper lineup carries the room
      this.canvas.hidden = true;
      this.hint.textContent = 'The mirror is shy today — the lineup still fits.';
      return;
    }

    const scene = new THREE.Scene();
    this.scene = scene;
    // near plane close enough for the face close-up, far enough for the
    // pull-back — the zoom corridor never clips into the rig
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.05, 40);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // the cozy rig: warm key, cool fill, the gold as rim
    scene.add(new THREE.HemisphereLight(0xfff5ea, 0x5a5460, 1.2));
    const key = new THREE.DirectionalLight(0xffecd0, 1.8);
    key.position.set(2.5, 4.0, 3.0);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8faec4, 0.8);
    fill.position.set(-2.5, 2.5, 1.5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xf7b32b, 1.1);
    rim.position.set(0, 3.0, -3.0);
    scene.add(rim);

    // the fitting-room set: a warm back wall with a baseboard, a floor the
    // light can pool on, two hanging bulbs — the character stands in a
    // ROOM now, not on a void. Cheap meshes, Lambert, one flat draw each.
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 4.2),
      new THREE.MeshLambertMaterial({ color: 0x342b40 }),
    );
    backWall.position.set(0, 1.6, -1.9);
    scene.add(backWall);
    const wallTrim = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 0.14),
      new THREE.MeshLambertMaterial({ color: 0xf7b32b, emissive: 0xf7b32b, emissiveIntensity: 0.35 }),
    );
    wallTrim.position.set(0, 0.07, -1.89);
    scene.add(wallTrim);
    const roomFloor = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 28),
      new THREE.MeshLambertMaterial({ color: 0x453a52 }),
    );
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.position.y = -0.075;
    scene.add(roomFloor);
    for (const bx of [-1.15, 1.15]) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xffd98a, emissive: 0xffd98a, emissiveIntensity: 0.9 }),
      );
      bulb.position.set(bx, 2.5, -1.55);
      scene.add(bulb);
      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.55, 6),
        new THREE.MeshLambertMaterial({ color: 0x1a1420 }),
      );
      cord.position.set(bx, 2.8, -1.55);
      scene.add(cord);
    }

    // the pedestal: plum drum, gold trim, a soft contact shadow
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.78, 0.08, 32),
      new THREE.MeshLambertMaterial({ color: 0x2a2430 }),
    );
    drum.position.y = -0.04;
    scene.add(drum);
    const trim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.73, 0.73, 0.02, 32),
      new THREE.MeshLambertMaterial({ color: 0xf7b32b }),
    );
    trim.position.y = -0.01;
    scene.add(trim);
    const shadow = new THREE.Mesh(
      new THREE.RingGeometry(0.01, 0.62, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    scene.add(shadow);

    this.charRoot = new THREE.Group();
    scene.add(this.charRoot);
    this.dressPreview();
    this.resize();
    // reframe when the stage resizes (orientation, safe-area, keyboard)
    if (typeof ResizeObserver !== 'undefined' && !this.stageObserver) {
      this.stageObserver = new ResizeObserver(() => this.resize());
      // The resize law: observe the LAYOUT OWNER (the stage), never the
      // canvas — the canvas's own size is the drawing buffer resize()
      // writes, and an observer armed on it re-fires on its own writes.
      this.stageObserver.observe(this.canvas.parentElement ?? this.canvas);
    }
  }

  /** Swap the previewed look — the rig law does the dressing, the viewer
   *  law does the framing: every swap re-fits the camera to the new body.
   *  The old look's GPU resources are released (six swaps must not pile up
   *  six rigs' worth of buffers). The bbox is measured on the fresh group
   *  BEFORE it joins the spinning root — an unrotated envelope every time. */
  private dressPreview(): void {
    const root = this.charRoot;
    if (!root) return;
    for (const child of [...root.children]) {
      root.remove(child);
      child.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const m = mesh.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        }
      });
    }
    const st = starterById(this.previewId);
    const { group } = buildArticulatedPerson(st.look);
    if (st.prop === 'skateboard') group.add(buildStarterSkateboard());
    const box = new THREE.Box3().setFromObject(group); // local, unrotated
    root.add(group);
    this.frameCharacter(box, true);
  }

  /** The rig's UNROTATED envelope — rotation momentarily zeroed (pure
   *  geometry read; nothing renders inside a synchronous call) so the fit
   *  is always measured on the body, never on a turned pose of it. */
  private measureRig(): THREE.Box3 | null {
    const root = this.charRoot;
    if (!root) return null;
    const saved = root.rotation.y;
    root.rotation.y = 0;
    const box = new THREE.Box3().setFromObject(root);
    root.rotation.y = saved;
    return box;
  }

  /** THE VIEWER LAW — framing from the rig's own bounding box. The camera
   *  never guesses a world coordinate: every look (Ada at 0.94 scale, the
   *  tall starters at 1.06, the board on the back) gets its own fit —
   *  headroom above the hair, the pedestal + contact shadow inside the
   *  bottom edge, a collar of air around the silhouette. The fit re-runs
   *  on every stage reshape, so a new orientation never crops the body. */
  private frameCharacter(box: THREE.Box3, reset: boolean): void {
    const camera = this.camera;
    if (!camera || box.isEmpty()) return;
    box.min.y -= 0.26;        // the pedestal drum + contact shadow join the shot
    box.expandByScalar(0.03); // the collar of air
    box.getCenter(this.boundsCenter);
    const size = box.getSize(new THREE.Vector3());
    this.headY = box.max.y - Math.min(0.22, size.y * 0.12);
    const radius = 0.5 * size.length();
    const fov = THREE.MathUtils.degToRad(camera.fov);
    // per-axis fit: the standing figure's height drives the distance; its
    // widest turntable sweep (the box diagonal across x/z) guards width
    const halfH = size.y / 2;
    const halfW = Math.hypot(size.x, size.z) / 2;
    const fit = fitDistanceFor(halfH, halfW, fov, Math.max(camera.aspect, 0.2));
    this.homeDist = fit;
    const range = zoomRangeFor(radius, fit);
    this.minDist = range.min;
    this.maxDist = range.max;
    if (reset || !this.userTouched) this.distTarget = fit;
    else this.distTarget = THREE.MathUtils.clamp(this.distTarget, this.minDist, this.maxDist);
    if (reset) this.userTouched = false;
  }

  /** A view chip: glide to the angle, reset to the full-body framing. The
   *  arc is the shortest way round (Back→Front turns a quarter, not ¾). */
  private preset(yaw: number): void {
    this.yawTarget += shortestAngleDelta(this.yawTarget, yaw);
    this.pitchTarget = HOME_PITCH;
    this.distTarget = this.homeDist;
    this.userTouched = true; // a chosen framing parks the greeting sway
  }

  /** Multiplicative zoom (wheel ticks, pinch ratios, buttons) — clamped to
   *  the corridor the bounding box set, smooth via the render damping. */
  private zoomBy(factor: number): void {
    this.distTarget = THREE.MathUtils.clamp(this.distTarget * factor, this.minDist, this.maxDist);
    this.userTouched = true;
  }

  /** The Fit chip: back to the default full-body framing at the current
   *  angle, and the greeting sway resumes — the room breathes again. */
  private fitFrame(): void {
    this.distTarget = this.homeDist;
    this.pitchTarget = HOME_PITCH;
    this.userTouched = false;
  }

  private pinchDistance(): number {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.hypot(dx, dy);
  }

  /** True while the greeting breath may play: no turntable, no hand on the
   *  stage, nothing the player has aimed themselves. */
  private get swayActive(): boolean {
    return this.sway && !this.autoSpin && !this.dragging && !this.userTouched;
  }

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    // The resize law (the QA audit's wardrobe loop fix): measure the LAYOUT
    // OWNER — the stage host — never the canvas itself. The canvas's
    // intrinsic size IS the drawing buffer this method writes; reading a
    // size the same call can rewrite made the desktop row layout (stage
    // height:auto) grow the card one pixel per frame in a ResizeObserver
    // loop, with the loop toast on screen the whole time. The canvas now
    // also sits out of layout flow (style.css #wardrobe-canvas), so the
    // buffer write can never move layout again — this guard is the belt
    // to that pair of suspenders.
    const host = this.canvas.parentElement ?? this.canvas;
    const w = host.clientWidth || 340;
    const h = host.clientHeight || 340;
    const aspect = w / Math.max(h, 1);
    // A new stage shape re-fits the full-body framing (orientation flips,
    // the on-screen keyboard, a resized window) — the character never
    // leaves the frame just because the room changed shape.
    if (Math.abs(this.camera.aspect - aspect) > 1e-4) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      const box = this.measureRig();
      if (box) this.frameCharacter(box, false);
    }
    // No-op guard: setSize writes the canvas's intrinsic size — rewriting
    // the same buffer is how the ResizeObserver loop re-armed itself
    // forever (the "loop completed with undelivered notifications" toast).
    // Only write when the buffer actually changes.
    const pr = this.renderer.getPixelRatio();
    const bw = Math.floor(w * pr);
    const bh = Math.floor(h * pr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.renderer.setSize(w, h, false);
    }
  }

  private startLoop(): void {
    // capture the stage locally — TS can't narrow class fields in a callback
    const renderer = this.renderer;
    const scene = this.scene;
    const camera = this.camera;
    if (!renderer || !scene || !camera) return; // poster mode: plain DOM
    this.resize();
    this.lastTime = performance.now();
    const tick = () => {
      if (this.panel.hidden) return; // closed mid-flight: the loop rests
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      // the turntable: Spin advances the TARGET yaw, the damping carries
      // the render value — a grab mid-spin hands control over smoothly
      if (this.autoSpin && !this.dragging) this.yawTarget += dt * 0.5;
      // damped follow: every control above only ever moved a target
      const k = 1 - Math.exp(-dt * 9);
      this.yaw += (this.yawTarget - this.yaw) * k;
      this.pitch += (this.pitchTarget - this.pitch) * k;
      this.dist += (this.distTarget - this.dist) * k;
      // the close-up's one trick: as the camera pushes in, the aim rises
      // from the body's center toward the face — inspecting the jacket
      // stitching or the haircut keeps the INSPECTED thing near center
      const zoomT = this.homeDist > this.minDist
        ? THREE.MathUtils.clamp((this.homeDist - this.dist) / (this.homeDist - this.minDist), 0, 1)
        : 0;
      const targetY = THREE.MathUtils.lerp(this.boundsCenter.y, this.headY, zoomT * zoomT);
      this.orbitTarget.set(this.boundsCenter.x, targetY, this.boundsCenter.z);
      // THE TURNTABLE: the hand spins the CHARACTER, the camera holds its
      // ground (fixed azimuth on +Z, elevation = pitch, distance = dist).
      // The fitting room's lights and walls never move; the body does —
      // and the camera can never swing behind the set and lose the figure.
      const renderYaw = this.yaw + (this.swayActive ? Math.sin(now * 0.0009) * 0.12 : 0);
      if (this.charRoot) {
        this.charRoot.rotation.y = renderYaw;
        updatePersonAnim(this.charRoot, dt); // the idle breath sells the room
      }
      camera.position.set(
        this.orbitTarget.x,
        this.orbitTarget.y + this.dist * Math.sin(this.pitch),
        this.orbitTarget.z + this.dist * Math.cos(this.pitch),
      );
      camera.lookAt(this.orbitTarget);
      renderer.render(scene, camera);
      this.rafId = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }
}
