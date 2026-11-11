/**
 * The sky environment (docs/rendering/03 §7) — a tiny PMREM built from the
 * CURRENT sky state, giving the city an image-based fill that follows the
 * day cycle: glass and vehicles reflect the sky they live under, and the
 * Lambert statics get a soft IBL tint.
 *
 * Rebuilt only when the day state CHANGES (a few times per in-game day, never
 * per frame). The old target is disposed — the mission's disposal law.
 *
 * Reference technique (docs/rendering/02): IBL as the cheap stand-in for
 * screen-space reflections — the sky IS the dominant light in an outdoor
 * scene, so a blurred sky cubemap is most of the reflection signal.
 */

import * as THREE from 'three';

export interface EnvSkyColors {
  top: THREE.Color;
  horizon: THREE.Color;
  ground: THREE.Color;
  /** The halo tint (the sun's share of the reflection). */
  halo: THREE.Color;
  haloStrength: number;
}

const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = `
uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 groundColor;
uniform vec3 haloColor; uniform vec3 sunDir; uniform float haloStrength;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 col = h >= 0.0
    ? mix(horizonColor, topColor, pow(min(h, 1.0), 0.55))
    : mix(horizonColor, groundColor, pow(min(-h, 1.0), 0.5));
  float sd = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
  col += haloColor * (pow(sd, 14.0) * 0.45 + pow(sd, 60.0) * 0.7) * haloStrength;
  gl_FragColor = vec4(col, 1.0);
}`;

export class EnvSky {
  private scene = new THREE.Scene();
  private mat: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private pmrem: THREE.PMREMGenerator;
  private current: THREE.Texture | null = null;

  constructor(renderer: THREE.WebGLRenderer) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x7fa7c9) },
        horizonColor: { value: new THREE.Color(0xffb85c) },
        groundColor: { value: new THREE.Color(0xffb85c) },
        haloColor: { value: new THREE.Color(0xffb85c) },
        sunDir: { value: new THREE.Vector3(-38, 23, 22).normalize() },
        haloStrength: { value: 0.5 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.pmrem = new THREE.PMREMGenerator(renderer);
  }

  /** Rebuild the environment from the given sky colors. Disposes the old
   *  target. Cheap at 64px (a few ms, a few times per in-game day). */
  rebuild(colors: EnvSkyColors): THREE.Texture {
    (this.mat.uniforms.topColor.value as THREE.Color).copy(colors.top);
    (this.mat.uniforms.horizonColor.value as THREE.Color).copy(colors.horizon);
    (this.mat.uniforms.groundColor.value as THREE.Color).copy(colors.ground);
    (this.mat.uniforms.haloColor.value as THREE.Color).copy(colors.halo);
    this.mat.uniforms.haloStrength.value = colors.haloStrength;
    const next = this.pmrem.fromScene(this.scene, 0, 0.1, 400).texture;
    const old = this.current;
    this.current = next;
    if (old && old !== next) old.dispose();
    return next;
  }

  get texture(): THREE.Texture | null {
    return this.current;
  }

  dispose(): void {
    if (this.current) this.current.dispose();
    this.current = null;
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.pmrem.dispose();
  }
}
