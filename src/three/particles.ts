import * as THREE from "three";

const VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d = max(0.001, -mv.z);
  gl_PointSize = clamp(aSize * uScale / d, 1.0, 260.0);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float a = texture2D(uTex, gl_PointCoord).a;
  if (a < 0.004) discard;
  float w = a * vAlpha * uOpacity;
  gl_FragColor = vec4(vColor * w, w);
}`;

const FRAG_SMOKE = /* glsl */ `
uniform sampler2D uTex;
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float a = texture2D(uTex, gl_PointCoord).a;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
}`;

export interface SpawnParams {
  size: number;
  life: number;
  drag?: number;
  gravity?: number;
  trail?: number;
  flicker?: number;
  grow?: number;
  spin?: number;
  fadePow?: number;
}

/**
 * Pooled, CPU-simulated GPU point cloud. Swap-remove compaction keeps the
 * draw range tight; update ranges keep buffer uploads small.
 */
export class ParticlePool {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  capacity: number;
  count = 0;

  private pos: Float32Array;
  private col: Float32Array;
  private siz: Float32Array;
  private alp: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private drag: Float32Array;
  private grav: Float32Array;
  private trail: Float32Array;
  private flick: Float32Array;
  private grow: Float32Array;
  private base: Float32Array;
  private fadePow: Float32Array;
  private seed: Float32Array;
  private trailAcc: Float32Array;
  private recycle = 0;

  constructor(capacity: number, texture: THREE.Texture, smoke = false) {
    this.capacity = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.siz = new Float32Array(capacity);
    this.alp = new Float32Array(capacity);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.trail = new Float32Array(capacity);
    this.flick = new Float32Array(capacity);
    this.grow = new Float32Array(capacity);
    this.base = new Float32Array(capacity);
    this.fadePow = new Float32Array(capacity);
    this.seed = new Float32Array(capacity);
    this.trailAcc = new Float32Array(capacity);

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(this.col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(this.siz, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(this.alp, 1));
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5000);
    this.geometry = g;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: texture },
        uScale: { value: 600 },
        uOpacity: { value: 1 },
      },
      vertexShader: VERT,
      fragmentShader: smoke ? FRAG_SMOKE : FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: smoke ? THREE.NormalBlending : THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquation: THREE.AddEquation,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = smoke ? 4 : 6;
  }

  setScale(v: number) {
    this.material.uniforms.uScale.value = v;
  }
  setOpacity(v: number) {
    this.material.uniforms.uOpacity.value = v;
  }

  spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    r: number, g: number, b: number,
    p: SpawnParams
  ) {
    let i: number;
    if (this.count < this.capacity) i = this.count++;
    else {
      i = this.recycle;
      this.recycle = (this.recycle + 1) % this.capacity;
    }
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i3] = r; this.col[i3 + 1] = g; this.col[i3 + 2] = b;
    this.base[i] = p.size;
    this.siz[i] = p.size;
    this.alp[i] = 1;
    this.life[i] = p.life;
    this.maxLife[i] = p.life;
    this.drag[i] = p.drag ?? 0.6;
    this.grav[i] = p.gravity ?? 1;
    this.trail[i] = p.trail ?? 0;
    this.flick[i] = p.flicker ?? 0;
    this.grow[i] = p.grow ?? 0;
    this.fadePow[i] = p.fadePow ?? 1.2;
    this.seed[i] = Math.random() * 100;
    this.trailAcc[i] = 0;
    return i;
  }

  private copy(from: number, to: number) {
    const f3 = from * 3, t3 = to * 3;
    this.pos[t3] = this.pos[f3]; this.pos[t3 + 1] = this.pos[f3 + 1]; this.pos[t3 + 2] = this.pos[f3 + 2];
    this.vel[t3] = this.vel[f3]; this.vel[t3 + 1] = this.vel[f3 + 1]; this.vel[t3 + 2] = this.vel[f3 + 2];
    this.col[t3] = this.col[f3]; this.col[t3 + 1] = this.col[f3 + 1]; this.col[t3 + 2] = this.col[f3 + 2];
    this.siz[to] = this.siz[from]; this.alp[to] = this.alp[from];
    this.life[to] = this.life[from]; this.maxLife[to] = this.maxLife[from];
    this.drag[to] = this.drag[from]; this.grav[to] = this.grav[from];
    this.trail[to] = this.trail[from]; this.flick[to] = this.flick[from];
    this.grow[to] = this.grow[from]; this.base[to] = this.base[from];
    this.fadePow[to] = this.fadePow[from]; this.seed[to] = this.seed[from];
    this.trailAcc[to] = this.trailAcc[from];
  }

  /**
   * @param trailSink optional pool that receives trailing sparks
   */
  update(
    dt: number,
    time: number,
    gravity: number,
    wind: number,
    turbulence: number,
    trailSink?: ParticlePool
  ) {
    const g = -9.2 * gravity;
    for (let i = 0; i < this.count; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const last = this.count - 1;
        if (i !== last) this.copy(last, i);
        this.count--;
        i--;
        continue;
      }
      const i3 = i * 3;
      const d = Math.exp(-this.drag[i] * dt);
      let vx = this.vel[i3] * d;
      let vy = this.vel[i3 + 1] * d + g * this.grav[i] * dt;
      let vz = this.vel[i3 + 2] * d;
      if (turbulence > 0.001) {
        const px = this.pos[i3], py = this.pos[i3 + 1], pz = this.pos[i3 + 2];
        const s = this.seed[i];
        vx += Math.sin(py * 0.35 + time * 1.4 + s) * turbulence * dt * 6;
        vy += Math.cos(px * 0.31 - time * 1.1 + s) * turbulence * dt * 3;
        vz += Math.sin(px * 0.27 + pz * 0.2 + time * 0.9 + s) * turbulence * dt * 6;
      }
      vx += wind * dt * 2.4;
      this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
      this.pos[i3] += vx * dt;
      this.pos[i3 + 1] += vy * dt;
      this.pos[i3 + 2] += vz * dt;

      const t = this.life[i] / this.maxLife[i];
      let a = Math.pow(t, this.fadePow[i]);
      if (this.flick[i] > 0) {
        a *= 1 - this.flick[i] * (0.5 + 0.5 * Math.sin(time * 34 + this.seed[i] * 7));
      }
      this.alp[i] = a;
      this.siz[i] = this.base[i] * (1 + this.grow[i] * (1 - t));

      if (this.trail[i] > 0 && trailSink) {
        this.trailAcc[i] += dt * this.trail[i];
        while (this.trailAcc[i] >= 1) {
          this.trailAcc[i] -= 1;
          trailSink.spawn(
            this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2],
            (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7 + 0.3, (Math.random() - 0.5) * 0.7,
            this.col[i3] * 0.9 + 0.1, this.col[i3 + 1] * 0.75 + 0.08, this.col[i3 + 2] * 0.5,
            { size: this.base[i] * 0.42, life: 0.35 + Math.random() * 0.55, drag: 1.6, gravity: 0.35, flicker: 0.55 }
          );
        }
      }
    }

    const geo = this.geometry;
    geo.setDrawRange(0, this.count);
    if (this.count > 0) {
      const attrs: [THREE.BufferAttribute, number][] = [
        [geo.getAttribute("position") as THREE.BufferAttribute, this.count * 3],
        [geo.getAttribute("aColor") as THREE.BufferAttribute, this.count * 3],
        [geo.getAttribute("aSize") as THREE.BufferAttribute, this.count],
        [geo.getAttribute("aAlpha") as THREE.BufferAttribute, this.count],
      ];
      for (const [attr, n] of attrs) {
        attr.needsUpdate = true;
        if (typeof attr.addUpdateRange === "function") {
          attr.clearUpdateRanges();
          attr.addUpdateRange(0, n);
        }
      }
    }
  }

  clear() {
    this.count = 0;
    this.geometry.setDrawRange(0, 0);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
