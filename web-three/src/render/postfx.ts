/**
 * The post pipeline (docs/rendering/03 §6) — ONE EffectComposer chain for
 * the whole game:
 *
 *   RenderPass → [GTAO] → UnrealBloom → CityGrade → OutputPass
 *
 * Techniques adapted from 3d-game-shaders-for-beginners (see
 * docs/rendering/02-technique-evaluation.md): render-to-texture chains,
 * mip-threshold bloom (three's UnrealBloomPass), hemisphere SSAO (three's
 * GTAOPass, the modern form of its SSAO chapter), film grain, chromatic
 * aberration, unsharp-mask sharpening and a LUT-style grade — the last four
 * fused into ONE shader pass (CityGrade, our own GLSL, written for this
 * game; no reference code is copied — the reference licenses only its
 * .cxx/.vert/.frag files and we implement the math independently).
 *
 * Laws honored:
 *  - the direct path (low tier / ?fx=off) is today's renderer.render —
 *    untouched, and the ONLY path under software GL;
 *  - tone mapping stays NeutralToneMapping: three applies it only to the
 *    canvas, so RenderPass targets stay linear-HDR and OutputPass applies
 *    the curve once at the end (verified in WebGLPrograms.js r186);
 *  - no per-frame allocations (uniform objects are mutated in place);
 *  - everything the pipeline builds, it disposes.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { GfxConfig } from './quality';

/**
 * The CityGrade pass — the wave's own final-grade shader. Inputs are the
 * composer's linear-HDR buffer; OutputPass (tone map + sRGB) runs after.
 *
 *   uGain    — per-channel gain tint (the LUT chapter's lift/gain idea,
 *              parameterized instead of a 3D LUT — six keyframe states
 *              don't justify a sampler)
 *   uLift    — shadow floor: keeps night streets readable without washing
 *              the day (weighted to dark pixels only)
 *   uSat     — saturation around Rec.709 luma
 *   uCA      — radial chromatic aberration, edge-weighted (r² falloff),
 *              the reference's aberration chapter, dialed to be felt not seen
 *   uSharpen — unsharp mask (4 neighbor taps, center-delta scaled)
 *   uVignette — smoothstep edge darkening
 *   uGrain   — animated, luminance-weighted film grain (hash noise, no
 *              texture fetch, no per-frame allocations)
 */
const CityGradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uLift: { value: 0 },
    uSat: { value: 1 },
    uCA: { value: 0 },
    uSharpen: { value: 0 },
    uVignette: { value: 0 },
    uGrain: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec3 uGain;
    uniform float uLift;
    uniform float uSat;
    uniform float uCA;
    uniform float uSharpen;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;

    float hash12(vec2 p) {
      p = fract(p * vec2(443.8975, 441.4233));
      p += dot(p, p.yx + 19.19);
      return fract((p.x + p.y) * p.x);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // chromatic aberration — radial, edge-weighted (off ~ 0 at center)
      vec3 col;
      if (uCA > 0.001) {
        vec2 off = c * (uCA * 0.004) * r2 * 4.0;
        col.r = texture2D(tDiffuse, uv + off).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - off).b;
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }

      // unsharp mask — 4 neighbor taps, center-delta scaled
      if (uSharpen > 0.001) {
        vec2 px = 1.0 / uResolution;
        vec3 nbr = texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb
                 + texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb
                 + texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb
                 + texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb;
        col += (col - nbr * 0.25) * (uSharpen * 0.6);
      }

      // LUT-style grade — gain tint, then a shadow-only lift floor
      col *= uGain;
      if (uLift > 0.0001) {
        float l0 = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col += uLift * (1.0 - smoothstep(0.0, 0.45, l0));
      }

      // saturation around Rec.709 luma
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);

      // vignette — smoothstep edge darkening, kept subtle
      col *= 1.0 - uVignette * smoothstep(0.12, 0.65, r2);

      // film grain — animated hash, weighted toward the shadows/midtones
      if (uGrain > 0.0001) {
        float g = hash12(uv * uResolution + vec2(fract(uTime * 61.7) * 137.0));
        col += (g - 0.5) * uGrain * (1.0 - 0.6 * l);
      }

      gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
    }`,
};

/** The registered pass order (test-pinned). */
export const PASS_CHAIN = ['render', 'ssao?', 'bloom', 'grade', 'output'] as const;

/** Objects hidden during the AO normal-prepass: far-world silhouettes the
 *  AO lens never sees + billboards/points whose override-material depth
 *  would bake halos into the occlusion. World provides the list. */
export class CityAOPass extends GTAOPass {
  private exclude: THREE.Object3D[];
  private saved: boolean[] = [];

  /** (Re)bind the exclusion list — World may grow far-world content. */
  setExclude(list: THREE.Object3D[]): void {
    this.exclude = list;
  }

  constructor(scene: THREE.Scene, camera: THREE.Camera, w: number, h: number, exclude: THREE.Object3D[]) {
    super(scene, camera, w, h);
    this.exclude = exclude;
    this.output = GTAOPass.OUTPUT.Default; // composite into the beauty buffer
    this.updateGtaoMaterial({
      radius: 0.45,
      distanceExponent: 1.4,
      thickness: 1.2,
      scale: 1.15,
      samples: 12,
      distanceFallOff: 1.0,
    });
    this.blendIntensity = 1.0;
  }

  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
    const vis = this.saved;
    vis.length = this.exclude.length;
    for (let i = 0; i < this.exclude.length; i++) {
      vis[i] = this.exclude[i].visible;
      this.exclude[i].visible = false;
    }
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    for (let i = 0; i < this.exclude.length; i++) {
      this.exclude[i].visible = vis[i];
    }
  }
}

export interface PipelineTargets {
  scene: THREE.Scene;
  camera: THREE.Camera;
}

export class PostPipeline {
  readonly composer: EffectComposer;
  private renderPass: RenderPass;
  private bloom: UnrealBloomPass | null = null;
  private gtao: CityAOPass | null = null;
  private grade: ShaderPass;
  private output: OutputPass;
  private disposed = false;
  private aoExclude: THREE.Object3D[] = [];

  constructor(
    private renderer: THREE.WebGLRenderer,
    targets: PipelineTargets,
    private cfg: GfxConfig,
    aoExclude: THREE.Object3D[],
  ) {
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(targets.scene, targets.camera);
    this.composer.addPass(this.renderPass);
    if (cfg.ssao) {
      this.gtao = new CityAOPass(targets.scene, targets.camera, 1, 1, aoExclude);
      this.composer.addPass(this.gtao);
    }
    if (cfg.bloom) {
      // threshold 1.8 in linear HDR — only true emitters cross it. The
      // evidence frames set this: cream crosswalks under the midday sun
      // (sun 1.3 + hemi 1.15 → ~1.7 on a top face) must NOT bloom, while
      // the night registry (lamps 2.4, traffic 2.2, strips/rooms 2.0,
      // story windows 4.0) must. 1.8 splits exactly between them.
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.55, 1.8);
      this.composer.addPass(this.bloom);
    }
    this.grade = new ShaderPass(CityGradeShader);
    this.composer.addPass(this.grade);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
    this.applyConfig(cfg);
  }

  /** Resize the whole chain (Game.onResize). */
  setSize(w: number, h: number): void {
    if (this.disposed) return;
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    (this.grade.uniforms.uResolution.value as THREE.Vector2).set(w * pr, h * pr);
  }

  /** Per-frame drive — uniforms mutated in place, zero allocations. */
  render(state: {
    time: number;
    bloomStrength: number;
    grain: number; vignette: number; ca: number; sharpen: number;
    gainR: number; gainG: number; gainB: number; lift: number; saturation: number;
    exposure: number;
  }): void {
    if (this.disposed) return;
    this.renderer.info.reset();
    const u = this.grade.uniforms;
    u.uTime.value = state.time;
    if (this.bloom) this.bloom.strength = state.bloomStrength;
    u.uGrain.value = this.cfg.grain ? state.grain : 0;
    u.uVignette.value = state.vignette;
    u.uCA.value = this.cfg.ca ? state.ca : 0;
    u.uSharpen.value = this.cfg.sharpen ? state.sharpen : 0;
    u.uSat.value = state.saturation;
    u.uLift.value = state.lift;
    (u.uGain.value as THREE.Vector3).set(state.gainR, state.gainG, state.gainB);
    this.renderer.toneMappingExposure = state.exposure;
    this.composer.render(0);
  }

  /** Tier change at runtime (probe/quality knob). Rebuilds AO/bloom presence. */
  applyConfig(cfg: GfxConfig): void {
    if (this.disposed) return;
    const rebuiltSsao = cfg.ssao !== this.cfg.ssao;
    const rebuiltBloom = cfg.bloom !== this.cfg.bloom || (cfg.bloom && cfg.bloomFullRes !== this.cfg.bloomFullRes);
    this.cfg = cfg;
    if (rebuiltSsao || rebuiltBloom) {
      // rebuild the middle of the chain in pass order
      const passes = this.composer.passes;
      for (const p of [...passes]) {
        if (p === this.renderPass || p === this.grade || p === this.output) continue;
        this.composer.removePass(p);
        p.dispose?.();
      }
      this.gtao = null;
      this.bloom = null;
      const cam = this.renderPass.camera;
      const scene = this.renderPass.scene;
      if (cfg.ssao && scene && cam) {
        this.gtao = new CityAOPass(scene, cam, 1, 1, this.aoExclude);
        this.composer.insertPass(this.gtao, 1);
      }
      if (cfg.bloom) {
        this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.55, 1.8);
        const at = this.gtao ? 2 : 1;
        this.composer.insertPass(this.bloom, at);
      }
    }
    if (this.bloom) this.bloom.resolution.set(
      Math.max(2, Math.floor(this.renderer.domElement.width * (cfg.bloomFullRes ? 1 : 0.5))),
      Math.max(2, Math.floor(this.renderer.domElement.height * (cfg.bloomFullRes ? 1 : 0.5))),
    );
  }

  setAoExclude(list: THREE.Object3D[]): void {
    this.aoExclude = list;
    this.gtao?.setExclude(list);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const p of this.composer.passes) p.dispose?.();
    this.composer.dispose();
  }
}
