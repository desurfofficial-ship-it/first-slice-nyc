/** RESTORED — see full Game.ts in commit history 97b0be59; temporary minimal boot until full restore */
import * as THREE from 'three';
import { GameState, Step, START_MONEY } from '../core/GameState';
import { MAP_NOTE_BOOT } from '../core/content';
import { loadSave } from '../core/Save';
import { World } from '../world/World';
import { Player } from '../player/Player';
import { GameCamera } from '../camera/GameCamera';
import { InputManager } from '../engine/Input';
import { UI } from '../ui/UI';

export class Game {
  readonly state = new GameState();
  readonly world = new World();
  readonly player: Player;
  readonly cam: GameCamera;
  readonly input: InputManager;
  readonly ui: UI;
  private renderer: THREE.WebGLRenderer;
  private playerVisual: THREE.Group;
  private lastTime = performance.now();
  private running = true;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.player = new Player(this.world.colliders);
    this.cam = new GameCamera(window.innerWidth / window.innerHeight);
    this.ui = new UI();
    this.input = new InputManager({
      joyZone: document.getElementById('joy-zone')!,
      joyBase: document.getElementById('joy-base')!,
      joyStick: document.getElementById('joy-stick')!,
      btnInteract: document.getElementById('btn-interact')!,
      turnL: document.getElementById('turn-left')!,
      turnR: document.getElementById('turn-right')!,
    });

    this.playerVisual = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.05, 6, 14), new THREE.MeshLambertMaterial({ color: 0xf7b32b }));
    body.position.y = 0.9;
    this.playerVisual.add(body);
    this.world.scene.add(this.playerVisual);

    const save = loadSave();
    this.state.money = START_MONEY;
    this.state.dayStartMoney = START_MONEY;
    this.state.setStep(Step.MEET_ROSA);
    this.ui.showNote(MAP_NOTE_BOOT);
    this.ui.setMoneyQuiet(this.state.money);
    this.ui.setObjective(this.state.objectiveText());
    this.cam.snapBehind({ x: this.player.capsule.x, y: this.player.capsule.y, z: this.player.capsule.z });

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.cam.updateFov(window.innerWidth / window.innerHeight);
    });

    const loop = () => {
      requestAnimationFrame(loop);
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      const inp = this.input.sample();
      if (inp.interactPressed) this.tryMeetRosa();
      this.player.update(dt, inp.move);
      this.playerVisual.position.set(this.player.capsule.x, this.player.capsule.y, this.player.capsule.z);
      this.playerVisual.rotation.y = this.player.rotationY;
      this.cam.update(dt, this.player.capsule, inp.camTurn);
      this.player.camYaw = this.cam.camYaw;
      this.world.update(dt);
      this.ui.setPrompt(this.nearestRosa() ? 'rosa' : null, this.state);
      this.renderer.render(this.world.scene, this.cam.camera);
    };
    requestAnimationFrame(loop);
    this.ui.dismissLoading();
    this.ui.showGame();
    (window as unknown as { __game: Game }).__game = this;
  }

  private nearestRosa(): boolean {
    const c = this.player.capsule;
    const p = this.world.rosa.position;
    return Math.hypot(p.x - c.x, p.z - c.z) < 2.4 && this.state.step === Step.MEET_ROSA;
  }

  private tryMeetRosa(): void {
    if (!this.nearestRosa()) return;
    for (const e of this.state.tryRosa()) {
      if (e.kind === 'note') this.ui.showNote(e.text);
      if (e.kind === 'step') this.ui.setObjective(this.state.objectiveText());
      if (e.kind === 'rosa-moved-behind-counter') this.world.rosa.position.set(-20.4, 0.1, 13.5);
    }
  }
}
