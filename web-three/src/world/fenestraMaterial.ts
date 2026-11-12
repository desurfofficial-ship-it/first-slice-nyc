/**
 * fenestraMaterial — the shader half of FIRST SLICE's interior-mapping
 * windows (docs/production/fenestra/).
 *
 * TECHNIQUE PROVENANCE: interior mapping after Joost van Dongen, *Interior
 * Mapping* (2008); adapted from codedgar/three-fenestra v0.3.0 (MIT,
 * © 2026 Edgar Perez) — the hash/atlas/room-box GLSL core is a credited
 * adaptation of that repo's `glslCore` (src/shader/chunks.ts), and the
 * instanced-attribute schema (instanceWindowId / instanceLod / per-window
 * glass weight) follows its v0.3.0 instanced mode. Adapted for this game's
 * architecture: MeshLambertMaterial (the house material family, AGENTS
 * §1c.6 budget) instead of MeshStandardMaterial, a family RANGE on the
 * atlas-cell pick (residential/commercial halves of one atlas), the
 * in-game-clock occupancy law (fenestraCore.windowLightOf — nightK with
 * per-window onset hashes) in place of a static litRatio, and the
 * reference's `instanceFade` alpha channel repurposed as the glass-cue
 * weight (Lambert cannot afford the reference's transparent crossfade
 * pass; a band switch with hysteresis is this game's LOD grammar).
 *
 * Compositing model (the reference's, verbatim): the room texture is
 * PRE-LIT and is added to the output after all lighting (before tone
 * mapping — the interior rides the same ACES tonemap + fog as everything
 * else); the front atlas (curtains, blinds, AC units) drives the diffuse
 * where it is opaque and transmits a fraction of the interior where it is
 * sheer; where the front is clear glass the diffuse is zeroed so the sun
 * never paints the pane, and a Schlick fresnel sheen sells the surface.
 *
 * One material per family + ONE plane geometry + per-instance scale:
 * every window in the world is two draw calls total.
 */

import * as THREE from 'three';
import { FEN_SEEDS, type WindowFamily, type OccupancyParams, OCCUPANCY,
  FAMILY_RANGE, type FenestraInstance } from './fenestraCore';

// ------------------------------------------------------------------ GLSL ----

/** The public hash/atlas/room-box core — adapted from three-fenestra's
 *  glslCore (MIT, © 2026 Edgar Perez; technique after J. van Dongen 2008).
 *  Differences: `imAtlasUVRange` adds the family-range pick; everything
 *  else keeps the reference's math and its seed contract bit-for-bit. */
export const glslFenCore = /* glsl */ `
  float imHash(vec3 p, float seed) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3) + seed);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  // range pick: cells [range.x, range.y) of the atlas — the family's half
  vec2 imAtlasUVRange(vec2 cellUV, vec3 windowId, float cols, float rows,
                      float seed, vec2 range) {
    float h    = imHash(windowId, seed);
    float span = max(range.y - range.x, 1.0);
    float idx  = floor(range.x + h * span);
    idx = min(idx, range.y - 1.0);
    float col = mod(idx, cols);
    float row = floor(idx / cols);
    vec2 cellSize   = vec2(1.0 / cols, 1.0 / rows);
    vec2 inset      = cellSize * 0.001;
    vec2 cellOrigin = vec2(col * cellSize.x, 1.0 - (row + 1.0) * cellSize.y) + inset;
    return cellOrigin + clamp(cellUV, 0.0, 1.0) * (cellSize - 2.0 * inset);
  }

  // the room-box ray exit, re-projected onto the window plane (the view
  // ray's own image coordinate) — one-point-perspective interior depth
  vec2 imRoomBoxUV(vec3 camLocal, vec2 localXY, float depth, float backScale) {
    vec3 origin = vec3(localXY, 0.0);
    vec3 dir    = normalize(origin - camLocal);
    vec3 invDir = 1.0 / dir;
    vec3 tNear  = (vec3(-0.5, -0.5, -depth) - origin) * invDir;
    vec3 tFar   = (vec3(0.5, 0.5, 0.0) - origin) * invDir;
    vec3 tMax   = max(tNear, tFar);
    float t     = min(min(tMax.x, tMax.y), tMax.z);
    vec3 hit    = origin + dir * t;
    float camDist = backScale * depth / max(1.0 - backScale, 0.001);
    float scale   = camDist / (camDist - hit.z);
    return hit.xy * scale + 0.5;
  }
`;

const vertexCommon = /* glsl */ `
  varying vec2 vFenLocalXY;
  varying vec3 vFenCamLocal;
  varying vec3 vFenId;
  varying float vFenLod;
  varying float vFenGlass;
  // the per-window identity/band attributes (the reference v0.3.0 schema;
  // instanceGlass is this system's glass-cue weight)
  attribute vec3 instanceWindowId;
  attribute float instanceLod;
  attribute float instanceGlass;
`;

const vertexBody = /* glsl */ `
  // per-instance plane size (the shared unit plane is scaled per window)
  vec2 _fenPS = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
  vFenLocalXY = position.xy / _fenPS;
  vFenId = instanceWindowId;
  vFenLod = instanceLod;
  vFenGlass = instanceGlass;
  vec3 _fenCamLocal = (inverse(modelMatrix * instanceMatrix) * vec4(cameraPosition, 1.0)).xyz;
  vFenCamLocal = vec3(_fenCamLocal.xy / _fenPS, _fenCamLocal.z / max(_fenPS.x, _fenPS.y));
`;

const fragmentCommon = /* glsl */ `
  varying vec2 vFenLocalXY;
  varying vec3 vFenCamLocal;
  varying vec3 vFenId;
  varying float vFenLod;
  varying float vFenGlass;

  uniform sampler2D uFenRooms;
  uniform float uFenCols;
  uniform float uFenRows;
  uniform vec2  uFenRange;
  uniform float uFenDepth;
  uniform float uFenBackScale;
  uniform sampler2D uFenFronts;
  uniform float uFenFrontCols;
  uniform float uFenFrontRows;

  // the in-game clock (nightK) + the occupancy law's per-family constants
  uniform float uFenNightK;
  uniform float uFenDayLit;
  uniform float uFenNightLit;
  uniform float uFenOnsetStart;
  uniform float uFenOnsetSpan;
  uniform float uFenDimDay;
  uniform float uFenDimNight;
  uniform float uFenBoost;
  uniform vec3  uFenWarm;
  uniform vec3  uFenCool;
  uniform float uFenCoolChance;

  // glass
  uniform float uFenFresnel;
  uniform vec3  uFenFresnelColor;

  // the occupancy law — TS oracle: fenestraCore.windowLightOf (same seeds,
  // same math; the test suite pins the two together)
  vec3 _fenLightK(vec3 id) {
    float hLit    = imHash(id, ${FEN_SEEDS.lit});
    float hTone   = imHash(id, ${FEN_SEEDS.tone});
    float hBright = imHash(id, ${FEN_SEEDS.bright});
    float hOnset  = imHash(id, ${FEN_SEEDS.onset});
    float onset = uFenOnsetStart + hOnset * uFenOnsetSpan;
    float eveningK = clamp((uFenNightK - onset) / 0.07, 0.0, 1.0);
    float nightLit = hLit < uFenNightLit
      ? eveningK * eveningK * (3.0 - 2.0 * eveningK) : 0.0;
    float dayLit = hLit < uFenDayLit ? 1.0 : 0.0;
    float lit = max(dayLit, nightLit);
    float dim = mix(uFenDimDay, uFenDimNight, clamp(uFenNightK * 1.25, 0.0, 1.0));
    vec3 tone = mix(uFenWarm, uFenCool, step(1.0 - uFenCoolChance, hTone));
    vec3 litRoom = tone * ((0.62 + 0.38 * hBright) * uFenBoost);
    return mix(vec3(dim), litRoom, lit);
  }

  vec2 _fenFrontUVAt(vec2 localXY) {
    return imAtlasUVRange(localXY + 0.5, vFenId, uFenFrontCols, uFenFrontRows,
      ${FEN_SEEDS.front.toFixed(1)}, vec2(0.0, 16.0));
  }
`;

/** The fragment preamble the material injects after <common> (exported for
 *  the seed-contract test — the TS↔GLSL mirror is pinned on these literals). */
export const glslFenFragment = fragmentCommon;

/** Replaces <map_fragment>: computes the interior color + light state,
 *  samples the front overlay, drives diffuseColor. Stashes the lit-room
 *  color for the emissive injection (the reference's own pattern). */
const fragmentMapReplacement = /* glsl */ `
  // the room this window opens into (ray-marched, LOD-collapsible)
  vec2 _fenCell = imRoomBoxUV(vFenCamLocal, vFenLocalXY, uFenDepth, uFenBackScale);
  _fenCell = mix(vFenLocalXY + 0.5, _fenCell, vFenLod);
  vec2 _fenUV = imAtlasUVRange(_fenCell, vFenId, uFenCols, uFenRows,
    ${FEN_SEEDS.cell.toFixed(1)}, uFenRange);
  vec3 _fenInterior = texture2D(uFenRooms, _fenUV).rgb;
  // the pane sits between the room and the street: glass tints what is
  // behind it (a real window never shows the room at full strength),
  // relaxing toward clear as night falls and the lamps take over
  _fenInterior *= mix(0.76, 1.0, uFenNightK);
  // Schlick's other half: at grazing angles glass turns mirror — the room
  // it transmits darkens exactly where its projected sliver would alias
  float _fenNdotV = clamp(normalize(vFenCamLocal - vec3(vFenLocalXY, 0.0)).z, 0.0, 1.0);
  _fenInterior *= mix(1.0, 0.5, pow(1.0 - _fenNdotV, 3.0));
  vec3 _fenLitRoom = _fenInterior * _fenLightK(vFenId);

  // the front layer (curtains / blinds / AC / tints), alpha-driven
  vec4 _fenFront = texture2D(uFenFronts, _fenFrontUVAt(vFenLocalXY));
  float _fenA = _fenFront.a;
  diffuseColor.rgb *= _fenFront.rgb * _fenA;
  diffuseColor.a = 1.0;

  // interior transmission: clear glass passes everything, fabric passes a
  // fraction tinted by the fabric's own color (a red curtain glows red)
  vec3  _fenTransTint = mix(_fenFront.rgb, vec3(1.0), 1.0 - _fenA);
  float _fenTransAmt  = mix(0.34, 1.0, 1.0 - _fenA);
  vec3 _fenInteriorEmissive = _fenLitRoom * _fenTransTint * _fenTransAmt;
`;

/** Replaces <emissivemap_fragment>: adds the interior + the glass sheen.
 *  Both ride the scene's tonemap, bloom and fog (Lambert adds emissive
 *  before tonemapping and fog — the interior fogs out with distance). */
const fragmentEmissiveReplacement = /* glsl */ `
  totalEmissiveRadiance += _fenInteriorEmissive;

  // the pane: Schlick fresnel sheen, gated by the per-window glass weight
  // (LOD band) and modulated by a per-window grime hash (seed 11.31) so
  // panes do not all sheen alike — zero extra texture fetches (_fenNdotV
  // was computed in the map stage above)
  float _fenGrime = 0.7 + 0.6 * imHash(vFenId, ${FEN_SEEDS.grime});
  float _fenF = pow(1.0 - _fenNdotV, 5.0) * vFenGlass * vFenLod;
  totalEmissiveRadiance += uFenFresnelColor * (uFenFresnel * _fenGrime) * _fenF
    * (1.0 - _fenA);
  // the day read: glass faces the sky, so unlit panes carry a faint sky
  // tint even head-on (real windows mirror the day; at night the term
  // dies with (1 − nightK) and the lamps own the glass)
  totalEmissiveRadiance += uFenFresnelColor * 0.085 * (1.0 - uFenNightK)
    * vFenGlass * (1.0 - _fenA);
`;

/** The emissive/glass injection (its grime seed rides the seed contract). */
export const glslFenEmissive = fragmentEmissiveReplacement;

// --------------------------------------------------------------- material ---

export interface FenestraMaterialParams {
  family: WindowFamily;
  /** Occupancy override (tests / tuning); defaults to the family law. */
  occupancy?: Partial<OccupancyParams>;
}

const FALLBACK_KEY = 'fenestra-fallback';

/** The seam law (docs/28, the GLB pattern): a missing atlas degrades to a
 *  painted dim room — one console.info, no retries, the game never breaks. */
function fallbackRoomsTexture(): THREE.Texture {
  const cached = cache.get(FALLBACK_KEY);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3b3346';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#57503f';
  ctx.fillRect(8, 16, 48, 40);
  ctx.fillStyle = '#6b5a3e';
  ctx.fillRect(12, 20, 40, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(FALLBACK_KEY, t);
  return t;
}

function fallbackFrontsTexture(): THREE.Texture {
  const cached = cache.get(FALLBACK_KEY + '-front');
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = 8; c.height = 8;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 8, 8); // fully clear — plain glass
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(FALLBACK_KEY + '-front', t);
  return t;
}

const cache = new Map<string, THREE.Texture>();

function configureAtlas(t: THREE.Texture, anisotropy: number): void {
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  // NO mipmaps — a deliberate, verified tradeoff (docs/production/fenestra
  // §limitations): the sandbox verification rig sampled every mip path
  // (hardware generateMipmap AND a per-cell hand-built chain) into 2-4 px
  // facade speckle, while level-0 sampling is clean at every probe rig.
  // The distance story is covered by the LOD bands: past 44 m (medium) the
  // windows ride the flat impostor at fog-muted sizes, where the shipped
  // skyline panes prove flat reads hold. Revisit with a real-GPU pass.
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.anisotropy = Math.max(1, anisotropy);
  t.needsUpdate = true;
}

/**
 * Load one atlas (module-cached). Resolves to the fallback on failure —
 * the promise never rejects (the boot must not depend on the asset;
 * one console.info, no retries — the docs/28 seam law).
 */
export function loadFenestraAtlas(
  url: string, kind: 'rooms' | 'fronts', anisotropy = 1,
): Promise<THREE.Texture> {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);
  return new THREE.TextureLoader().loadAsync(url).then((t) => {
    configureAtlas(t, anisotropy);
    cache.set(url, t);
    return t;
  }).catch(() => {
    console.info(`[fenestra] atlas missing, the dim-room fallback rides (${url})`);
    const t = kind === 'rooms' ? fallbackRoomsTexture() : fallbackFrontsTexture();
    cache.set(url, t);
    return t;
  });
}

/**
 * The interior-mapping window material. Instanced-only (the system builds
 * InstancedMeshes); one per family.
 */
export class FenestraMaterial extends THREE.MeshLambertMaterial {
  readonly isFenestraMaterial = true;
  readonly uniforms: Record<string, THREE.IUniform>;

  constructor(params: FenestraMaterialParams) {
    super({ color: 0xffffff });
    const p: OccupancyParams = { ...OCCUPANCY[params.family], ...params.occupancy };
    const range = FAMILY_RANGE[params.family];
    this.uniforms = {
      uFenRooms: { value: null },
      uFenCols: { value: 8 },
      uFenRows: { value: 4 },
      uFenRange: { value: new THREE.Vector2(range[0], range[1]) },
      uFenDepth: { value: 1.0 },
      uFenBackScale: { value: 0.66 },
      uFenFronts: { value: null },
      uFenFrontCols: { value: 4 },
      uFenFrontRows: { value: 4 },
      uFenNightK: { value: 0 },
      uFenDayLit: { value: p.dayLit },
      uFenNightLit: { value: p.nightLit },
      uFenOnsetStart: { value: p.onsetStart },
      uFenOnsetSpan: { value: p.onsetSpan },
      uFenDimDay: { value: p.dimDay },
      uFenDimNight: { value: p.dimNight },
      uFenBoost: { value: p.boost },
      uFenWarm: { value: new THREE.Vector3(...p.warm) },
      uFenCool: { value: new THREE.Vector3(...p.cool) },
      uFenCoolChance: { value: p.coolChance },
      uFenFresnel: { value: 0.38 },
      uFenFresnelColor: { value: new THREE.Color(0.62, 0.72, 0.88) },
    };
    this.envMapIntensity = 0.1;
  }

  /** Swap in the loaded atlases (uniform writes — no recompile). */
  setAtlases(rooms: THREE.Texture, fronts: THREE.Texture): void {
    this.uniforms.uFenRooms.value = rooms;
    this.uniforms.uFenFronts.value = fronts;
  }

  /** The in-game clock's nightK (World.updateDayCycle writes it per frame). */
  setNightK(nightK: number): void {
    this.uniforms.uFenNightK.value = nightK;
  }

  override onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms): void => {
    Object.assign(shader.uniforms, this.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexCommon}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexBody}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${glslFenCore}\n${fragmentCommon}`)
      .replace('#include <map_fragment>', fragmentMapReplacement)
      .replace('#include <emissivemap_fragment>', fragmentEmissiveReplacement);
  };
}

// ----------------------------------------------------------------- meshes ---

export interface FenestraMesh {
  mesh: THREE.InstancedMesh;
  /** The LOD/glass attribute arrays (World's band updater writes these). */
  lod: THREE.InstancedBufferAttribute;
  glass: THREE.InstancedBufferAttribute;
  lodArray: Float32Array;
  glassArray: Float32Array;
  /** This mesh's instance i is plan[planIdx[i]] (the band updater's map). */
  planIdx: number[];
  dispose(): void;
}

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Build the family's InstancedMesh from the plan: one shared unit plane,
 * per-instance scale = the window's world size, yaw from the outward
 * normal, and the three instanced attributes (id / lod / glass).
 */
export function fenestraMeshFromPlan(
  plan: FenestraInstance[], family: WindowFamily, material: FenestraMaterial,
): FenestraMesh | null {
  const insts = plan.filter((p) => p.family === family);
  if (insts.length === 0) return null;
  const planIdx = plan
    .map((p, i) => (p.family === family ? i : -1))
    .filter((i) => i >= 0);
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, material, insts.length);
  mesh.name = `FenestraWindows_${family}`;
  const ids = new Float32Array(insts.length * 3);
  const lodArray = new Float32Array(insts.length);
  const glassArray = new Float32Array(insts.length);
  for (let i = 0; i < insts.length; i++) {
    const w = insts[i];
    _pos.set(w.x, w.y, w.z);
    _q.setFromAxisAngle(_up, Math.atan2(w.nx, w.nz));
    _scl.set(w.w, w.h, 1);
    _m4.compose(_pos, _q, _scl);
    mesh.setMatrixAt(i, _m4);
    ids[i * 3] = w.id[0];
    ids[i * 3 + 1] = w.id[1];
    ids[i * 3 + 2] = w.id[2];
    // windows boot at their plan-time band (FULL) — the first band update
    // corrects far ones within a frame; no visible pop (see World.updateFenestra)
    lodArray[i] = 1;
    glassArray[i] = 1;
  }
  mesh.instanceMatrix.needsUpdate = true;
  const idAttr = new THREE.InstancedBufferAttribute(ids, 3);
  const lod = new THREE.InstancedBufferAttribute(lodArray, 1);
  const glass = new THREE.InstancedBufferAttribute(glassArray, 1);
  geo.setAttribute('instanceWindowId', idAttr);
  geo.setAttribute('instanceLod', lod);
  geo.setAttribute('instanceGlass', glass);
  // windows ride proud faces everywhere in the world — the shipped skyline
  // pane precedent (frustumCulled false, depth-tested, fogged)
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 0;
  return {
    mesh, lod, glass, lodArray, glassArray, planIdx,
    dispose(): void {
      geo.dispose();
      mesh.dispose();
    },
  };
}
