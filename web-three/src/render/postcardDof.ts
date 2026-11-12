/**
 * The AUTHORED postcard capture's depth of field (v1.50.0, docs/rendering/05)
 * — the technique evaluation's own carve-out paid: "the postcard rig could
 * adopt it later (authored poses only)".
 *
 * Why here and not the frame loop (docs/rendering/02, evaluated and deferred
 * for gameplay): the city is a wide-stage game — focus hunting fights the
 * readability law in play. A postcard is a still, authored pose: the rig
 * knows exactly what it looks at (the look-at target IS the subject), the
 * cost is one-shot at 768×1160 at capture time, and the card is the game's
 * shareable artifact — the one place a photographic depth cue is pure gain.
 *
 * Math (the DOF chapter's idea, implemented independently; three's
 * MIT-licensed BokehPass supplies the separable gather, the same dependency
 * law as the wave's bloom/AO):
 *   - one depth prepass (scene override MeshDepthMaterial, RGBA-packed);
 *   - circle of confusion per pixel:  factor = focus + viewZ  (viewZ ≤ 0),
 *     blur radius = clamp(factor · aperture, −maxblur, +maxblur) in UV;
 *   - the bokeh composite blurs by that radius around each pixel.
 * aperture converts "world units away from the focal plane" into UV blur;
 * maxblur caps the radius so the far field stays a haze, not a mush.
 *
 * The capture chain (ONE shot, built and disposed per capture — capture
 * happens on story beats, never per frame):
 *
 *   RenderPass → CaptureDofPass → OutputPass → byte read-back
 *
 * OutputPass applies the renderer's own NeutralToneMapping + sRGB once —
 * which the direct RT render never did (r186 applies tone mapping to the
 * canvas only, WebGLPrograms.js:179–184). The cards therefore gain the
 * game's graded look here too; documented as the wave's intended delta
 * (docs/rendering/05 §4).
 *
 * Laws honored:
 *  - ?fx=off and ?dof=0 never reach this module — PostcardCapture falls
 *    back to today's bit-for-bit direct render (the gfx resolver gates it);
 *  - the exclusion law (the AO prepass's, docs/rendering/03 §6): glow
 *    sprites, steam, leaves, birds, the far-world silhouettes and the movers
 *    are hidden around the depth prepass — an override-material depth bake
 *    of a billboard prints a blur halo where the street behind it is sharp;
 *  - everything this builds, it disposes; zero allocations escape the call.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

/** Tuned on the capture evidence (docs/rendering/05 §5): a subject ~6 world
 *  units off the focal plane blurs near the cap; the far field saturates at
 *  a haze, never a mush. The caps keep a wild authored distance harmless. */
export const CAPTURE_DOF_TUNING = {
  aperture: 0.0011,
  maxblur: 0.0062,
  apertureMin: 0.0002,
  apertureMax: 0.004,
  maxblurMin: 0.002,
  maxblurMax: 0.011,
  focusMin: 1.5,
  focusMax: 220,
} as const;

export interface CaptureDofParams {
  /** World units from the capture camera to the authored focal plane. */
  focus: number;
  aperture: number;
  maxblur: number;
}

/** World-units distance between two authored pose points (hot-path free:
 *  Math.hypot, no vectors). */
export function focusDistance(
  px: number, py: number, pz: number,
  lx: number, ly: number, lz: number,
): number {
  return Math.hypot(lx - px, ly - py, lz - pz);
}

/** The pure clamp law. Returns null when the pose gave nothing usable — the
 *  caller then falls back to the direct render (no DOF) instead of guessing. */
export function captureDofParams(focus: number): CaptureDofParams | null {
  if (!Number.isFinite(focus)) return null;
  const t = CAPTURE_DOF_TUNING;
  return {
    focus: Math.min(t.focusMax, Math.max(t.focusMin, focus)),
    aperture: Math.min(t.apertureMax, Math.max(t.apertureMin, t.aperture)),
    maxblur: Math.min(t.maxblurMax, Math.max(t.maxblurMin, t.maxblur)),
  };
}

/** The resolver's flag decides (pure — the tests pin the whole matrix). */
export function shouldCaptureDof(cfg: { postcardDof: boolean }): boolean {
  return cfg.postcardDof;
}

/** BokehPass with the AO prepass's exclusion law: the depth bake hides the
 *  billboards/points/far-world silhouettes (World.aoExclude) around its
 *  override-material render, then restores them. Same shape as CityAOPass
 *  (postfx.ts) — one law, two prepasses. */
export class CaptureDofPass extends BokehPass {
  private exclude: readonly THREE.Object3D[];
  private saved: boolean[] = [];

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    params: CaptureDofParams,
    exclude: readonly THREE.Object3D[],
  ) {
    super(scene, camera, {
      focus: params.focus,
      aperture: params.aperture,
      maxblur: params.maxblur,
    });
    this.exclude = exclude;
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ): void {
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

  override dispose(): void {
    super.dispose();
  }
}

/** Render the scene once through the DOF chain and return sRGB bytes as an
 *  ImageData (same contract as the direct renderPixels, same Y-flip). The
 *  composer is built, run and disposed inside this call. */
export function renderDofPixels(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  dof: CaptureDofParams,
  exclude: readonly THREE.Object3D[],
  outW: number,
  outH: number,
): ImageData {
  const rt = new THREE.WebGLRenderTarget(outW, outH, {
    type: THREE.HalfFloatType, // linear-HDR working buffers, like the frame pipeline
    colorSpace: THREE.LinearSRGBColorSpace,
  });
  const composer = new EffectComposer(renderer, rt);
  const dofPass = new CaptureDofPass(scene, camera, dof, exclude);
  const output = new OutputPass();
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(dofPass);
  composer.addPass(output);

  // byte read-back: OutputPass already wrote tone-mapped, sRGB-encoded
  // values; a raw blit into a LinearSRGB byte target (no further conversion)
  // quantizes exactly the numbers the canvas path would show.
  const byteRt = new THREE.WebGLRenderTarget(outW, outH, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
  const copyMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new FullScreenQuad(copyMat);

  const prevTarget = renderer.getRenderTarget();
  const prevSize = new THREE.Vector2();
  renderer.getSize(prevSize);
  const prevPixelRatio = renderer.getPixelRatio();

  try {
    composer.setSize(outW, outH);
    dofPass.setSize(outW, outH); // the depth prepass target rides the same size
    composer.render(0);

    (copyMat.uniforms.tDiffuse.value as THREE.Texture | null) = composer.readBuffer.texture;
    renderer.setRenderTarget(byteRt);
    quad.render(renderer);

    const buf = new Uint8Array(outW * outH * 4);
    renderer.readRenderTargetPixels(byteRt, 0, 0, outW, outH, buf);
    // flip Y (GL origin is bottom-left) — the direct path's same law
    const imageData = new ImageData(outW, outH);
    const row = outW * 4;
    for (let y = 0; y < outH; y++) {
      const src = (outH - 1 - y) * row;
      imageData.data.set(buf.subarray(src, src + row), y * row);
    }
    return imageData;
  } finally {
    renderer.setRenderTarget(prevTarget);
    renderer.setPixelRatio(prevPixelRatio);
    renderer.setSize(prevSize.x, prevSize.y, false);
    quad.dispose();
    copyMat.dispose();
    byteRt.dispose();
    composer.dispose();
  }
}
