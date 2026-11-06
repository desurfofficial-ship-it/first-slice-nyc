/**
 * Wardrobe — the 3D fitting room (Doc 02's six starters, ported from the
 * First-slice-player update's React modal into the game's vanilla UI law:
 * same feature, same paper palette, zero new frameworks).
 *
 * Two laws live here:
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
 *
 * Rendering pauses the moment the panel closes (rAF runs only while open —
 * the at-rest-perf law); the GL context is created lazily on first open and
 * reused after, one extra context for the whole session.
 */

import * as THREE from 'three';
import { STARTERS, starterById, type Starter } from '../core/starters';
import { buildArticulatedPerson, buildStarterSkateboard, updatePersonAnim } from '../world/personRig';

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

  private currentStarterId = 'classic';
  private previewId = 'classic';
  private autoSpin = true;
  private dragging = false;
  private lastPointerX = 0;
  private angle = 0.35; // the 3/4 greeting

  // the turntable guest (lazily built; the seam law keeps it optional)
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private charRoot: THREE.Group | null = null;
  private rafId = 0;
  private lastTime = 0;

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

    el<HTMLButtonElement>('wardrobe-close').addEventListener('click', () => this.cb.onClose());
    el<HTMLButtonElement>('wardrobe-keep').addEventListener('click', () => this.hideConfirm());
    el<HTMLButtonElement>('wardrobe-newgame').addEventListener('click', () => {
      this.cb.onNewGame(this.previewId);
    });
    el<HTMLButtonElement>('wardrobe-front').addEventListener('click', () => { this.angle = 0; });
    el<HTMLButtonElement>('wardrobe-quarter').addEventListener('click', () => { this.angle = Math.PI * 0.25; });
    el<HTMLButtonElement>('wardrobe-back').addEventListener('click', () => { this.angle = Math.PI; });
    const spinBtn = el<HTMLButtonElement>('wardrobe-spin');
    spinBtn.addEventListener('click', () => {
      this.autoSpin = !this.autoSpin;
      spinBtn.setAttribute('aria-pressed', String(this.autoSpin));
      spinBtn.classList.toggle('off', !this.autoSpin);
    });

    // the turntable drag: pointer capture on the stage, one axis, slow hand
    this.canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastPointerX = e.clientX;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.angle += (e.clientX - this.lastPointerX) * 0.015;
      this.lastPointerX = e.clientX;
    });
    const drop = () => { this.dragging = false; };
    this.canvas.addEventListener('pointerup', drop);
    this.canvas.addEventListener('pointercancel', drop);

    // Escape folds the room (the pocket's law, mirrored here)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.cb.onClose();
      }
    });
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
    this.angle = 0.35;
    this.hideConfirm();
    this.renderLineup();
    this.renderMeta();
    this.panel.hidden = false;
    this.ensureStage();
    this.startLoop();
  }

  close(): void {
    this.panel.hidden = true;
    this.stopLoop();
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
      this.hint.textContent = 'Drag to spin';
    }, 1400);
  }

  // ---------------- internals ----------------

  private renderLineup(): void {
    this.lineup.innerHTML = '';
    for (const row of wardrobeLineup(this.currentStarterId)) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'starter-tile wardrobe-tile' + (row.isCurrent ? ' wearing' : '');
      tile.dataset.starter = row.id;
      tile.innerHTML =
        `<span class="wardrobe-swatch" style="background:${row.swatch}"></span>`
        + `<span class="starter-name">${row.name}</span>`
        + `<span class="wardrobe-role">${row.role}</span>`
        + (row.isCurrent ? '<span class="wardrobe-you">You</span>' : '');
      tile.addEventListener('click', () => {
        this.previewId = row.id;
        this.renderMeta();
        this.dressPreview();
        this.cb.onSwitchRequest(row.id);
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
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    this.camera.position.set(0, 1.05, 3.1);
    this.camera.lookAt(0, 0.92, 0);

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
  }

  /** Swap the previewed look — the rig law does the dressing. */
  private dressPreview(): void {
    const root = this.charRoot;
    if (!root) return;
    while (root.children.length > 0) root.remove(root.children[0]);
    const st = starterById(this.previewId);
    const { group } = buildArticulatedPerson(st.look);
    if (st.prop === 'skateboard') group.add(buildStarterSkateboard());
    root.add(group);
  }

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const w = this.canvas.clientWidth || 340;
    const h = this.canvas.clientHeight || 340;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
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
      if (this.autoSpin && !this.dragging) this.angle += dt * 0.45;
      if (this.charRoot) {
        this.charRoot.rotation.y = this.angle;
        updatePersonAnim(this.charRoot, dt); // the idle breath sells the room
      }
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
