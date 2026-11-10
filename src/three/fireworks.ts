import * as THREE from "three";
import { ParticlePool } from "./particles";
import { sparkTexture, smokeTexture, flareTexture } from "../lib/textures";
import { audio } from "../lib/audio";

export const PALETTES: { name: string; hindi: string; colors: string[] }[] = [
  { name: "Classic Diwali", hindi: "परंपरा", colors: ["#ffb020", "#ff6a00", "#ff2e88", "#ffe66d", "#ff3b3b", "#fff2c4"] },
  { name: "Peacock", hindi: "मोरपंख", colors: ["#00e5c0", "#1fa2ff", "#7c4dff", "#00ffa3", "#ffd166", "#c8f7ff"] },
  { name: "Rose Gold", hindi: "गुलाबी", colors: ["#ff9ec4", "#ffd9a0", "#ff6f91", "#ffe9c7", "#e8a87c", "#fff1f6"] },
  { name: "Neon Bazaar", hindi: "नीयन", colors: ["#ff00a8", "#00fff0", "#b4ff00", "#ff7a00", "#7a00ff", "#ffffff"] },
  { name: "Panchrang", hindi: "पंचरंग", colors: ["#ff3b3b", "#ffb020", "#35d07f", "#2d9cdb", "#b44cff", "#ffe9a8"] },
];

export const SHAPES = [
  "peony", "chrysanthemum", "ring", "heart", "star",
  "flower", "spiral", "willow", "palm", "crossette",
] as const;
export type Shape = (typeof SHAPES)[number];

export interface FwSettings {
  density: number;
  scale: number;
  gravity: number;
  trails: number;
  wind: number;
  turbulence: number;
  palette: number;
}

interface Rocket {
  p: THREE.Vector3;
  v: THREE.Vector3;
  targetY: number;
  shape: Shape;
  color: THREE.Color;
  scale: number;
  stage: number;
  age: number;
  acc: number;
  fuse: number;
}

interface Splitter {
  p: THREE.Vector3;
  v: THREE.Vector3;
  t: number;
  color: THREE.Color;
  scale: number;
  n: number;
}

interface Spinner {
  p: THREE.Vector3;
  t: number;
  life: number;
  angle: number;
  kind: "chakri" | "anar";
  color: THREE.Color;
  acc: number;
}

interface Scheduled { t: number; fn: () => void }

const tmp = new THREE.Color();
const vRight = new THREE.Vector3();
const vUp = new THREE.Vector3();
const vFwd = new THREE.Vector3();

export class Fireworks {
  sparks: ParticlePool;
  embers: ParticlePool;
  smoke: ParticlePool;
  glitter: ParticlePool;
  group = new THREE.Group();
  settings: FwSettings = {
    density: 1, scale: 1, gravity: 1, trails: 1, wind: 0.08, turbulence: 0.35, palette: 0,
  };
  quality = 1;
  private rockets: Rocket[] = [];
  private splitters: Splitter[] = [];
  private spinners: Spinner[] = [];
  private queue: Scheduled[] = [];
  private camera: THREE.Camera;
  private textures: THREE.Texture[];
  private rainUntil = 0;
  private rainCenter = new THREE.Vector3();
  onBurst?: (pos: THREE.Vector3, power: number) => void;
  liveRockets = 0;
  finaleActive = false;

  constructor(camera: THREE.Camera, quality = 1) {
    this.camera = camera;
    this.quality = quality;
    const spark = sparkTexture();
    const smoke = smokeTexture();
    const flare = flareTexture();
    this.textures = [spark, smoke, flare];
    const q = quality;
    this.sparks = new ParticlePool(Math.round(24000 * q), spark);
    this.embers = new ParticlePool(Math.round(16000 * q), spark);
    this.smoke = new ParticlePool(Math.round(1100 * q), smoke, true);
    this.glitter = new ParticlePool(Math.round(7000 * q), flare);
    this.sparks.setOpacity(1.85);
    this.embers.setOpacity(1.6);
    this.glitter.setOpacity(1.7);
    this.group.add(this.smoke.points, this.sparks.points, this.embers.points, this.glitter.points);
    this.group.name = "fireworks";
  }

  setQuality(q: number) {
    this.quality = q;
    const boost = q < 0.7 ? 1.25 : 1;
    this.sparks.setOpacity(1.85 * boost);
    this.embers.setOpacity(1.6 * boost);
    this.glitter.setOpacity(1.7 * boost);
  }

  private pal(): THREE.Color {
    const p = PALETTES[this.settings.palette % PALETTES.length].colors;
    return tmp.setStyle(p[(Math.random() * p.length) | 0]).clone();
  }
  private palAt(i: number): THREE.Color {
    const p = PALETTES[this.settings.palette % PALETTES.length].colors;
    return tmp.setStyle(p[i % p.length]).clone();
  }
  private n(base: number) {
    return Math.max(6, Math.round(base * this.settings.density * this.quality));
  }

  schedule(delay: number, fn: () => void) {
    this.queue.push({ t: delay, fn });
  }

  /* ------------------------- shape sampling ------------------------- */

  private directions(shape: Shape, count: number): number[][] {
    const out: number[][] = [];
    this.camera.matrixWorld.extractBasis(vRight, vUp, vFwd);
    const push = (x: number, y: number, z: number, s = 1) => out.push([x, y, z, s]);
    switch (shape) {
      case "ring": {
        const tilt = (Math.random() - 0.5) * 1.1;
        const yaw = Math.random() * Math.PI * 2;
        const n = new THREE.Vector3(Math.sin(yaw) * Math.cos(tilt), Math.sin(tilt), Math.cos(yaw) * Math.cos(tilt));
        const a = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize();
        if (a.lengthSq() < 0.01) a.set(1, 0, 0);
        const b = new THREE.Vector3().crossVectors(n, a).normalize();
        for (let i = 0; i < count; i++) {
          const t = (i / count) * Math.PI * 2;
          const j = 0.94 + Math.random() * 0.12;
          push(
            (a.x * Math.cos(t) + b.x * Math.sin(t)) * j,
            (a.y * Math.cos(t) + b.y * Math.sin(t)) * j,
            (a.z * Math.cos(t) + b.z * Math.sin(t)) * j,
            1
          );
        }
        break;
      }
      case "heart": {
        for (let i = 0; i < count; i++) {
          const t = (i / count) * Math.PI * 2;
          const hx = 16 * Math.pow(Math.sin(t), 3);
          const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          const f = 0.72 + Math.random() * 0.3;
          const x = (hx / 17) * f;
          const y = (hy / 17) * f;
          const z = (Math.random() - 0.5) * 0.16;
          push(vRight.x * x + vUp.x * y + vFwd.x * z, vRight.y * x + vUp.y * y + vFwd.y * z, vRight.z * x + vUp.z * y + vFwd.z * z, 1);
        }
        break;
      }
      case "star": {
        const points = 5;
        for (let i = 0; i < count; i++) {
          const t = (i / count) * Math.PI * 2;
          const seg = Math.floor((t / (Math.PI * 2)) * points * 2);
          const local = ((t / (Math.PI * 2)) * points * 2) % 1;
          const r1 = seg % 2 === 0 ? 1 : 0.44;
          const r2 = seg % 2 === 0 ? 0.44 : 1;
          const a1 = (seg / (points * 2)) * Math.PI * 2;
          const a2 = ((seg + 1) / (points * 2)) * Math.PI * 2;
          const x = (Math.cos(a1) * r1 * (1 - local) + Math.cos(a2) * r2 * local) * (0.8 + Math.random() * 0.22);
          const y = (Math.sin(a1) * r1 * (1 - local) + Math.sin(a2) * r2 * local) * (0.8 + Math.random() * 0.22);
          const z = (Math.random() - 0.5) * 0.14;
          push(vRight.x * x + vUp.x * y + vFwd.x * z, vRight.y * x + vUp.y * y + vFwd.y * z, vRight.z * x + vUp.z * y + vFwd.z * z, 1);
        }
        break;
      }
      case "flower": {
        const k = 4 + ((Math.random() * 3) | 0);
        for (let i = 0; i < count; i++) {
          const t = (i / count) * Math.PI * 2;
          const r = Math.abs(Math.cos(k * t)) * 0.85 + 0.2;
          const f = 0.72 + Math.random() * 0.3;
          const x = Math.cos(t) * r * f;
          const y = Math.sin(t) * r * f;
          const z = (Math.random() - 0.5) * 0.3;
          push(vRight.x * x + vUp.x * y + vFwd.x * z, vRight.y * x + vUp.y * y + vFwd.y * z, vRight.z * x + vUp.z * y + vFwd.z * z, 1);
        }
        break;
      }
      case "spiral": {
        const arms = 3;
        for (let i = 0; i < count; i++) {
          const arm = i % arms;
          const t = (i / count) * 5.2;
          const a = t * 2.1 + (arm / arms) * Math.PI * 2;
          const r = 0.2 + t * 0.16;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          const z = (t - 2.6) * 0.16;
          push(vRight.x * x + vUp.x * y + vFwd.x * z, vRight.y * x + vUp.y * y + vFwd.y * z, vRight.z * x + vUp.z * y + vFwd.z * z, 0.9);
        }
        break;
      }
      case "willow": {
        for (let i = 0; i < count; i++) {
          const u = Math.random() * 2 - 1;
          const th = Math.random() * Math.PI * 2;
          const s = Math.sqrt(1 - u * u);
          push(Math.cos(th) * s, u * 0.55 + 0.4, Math.sin(th) * s, 0.55 + Math.random() * 0.4);
        }
        break;
      }
      case "palm": {
        const arms = 9;
        for (let i = 0; i < count; i++) {
          const arm = i % arms;
          const a = (arm / arms) * Math.PI * 2 + Math.random() * 0.1;
          const el = 0.25 + Math.random() * 0.5;
          const f = 0.5 + Math.random() * 0.6;
          push(Math.cos(a) * Math.cos(el) * f, Math.sin(el) * f * 1.25, Math.sin(a) * Math.cos(el) * f, 1);
        }
        break;
      }
      case "crossette": {
        for (let i = 0; i < 14; i++) {
          const u = Math.random() * 2 - 1;
          const th = Math.random() * Math.PI * 2;
          const s = Math.sqrt(1 - u * u);
          push(Math.cos(th) * s, u, Math.sin(th) * s, 0.7);
        }
        break;
      }
      default: {
        for (let i = 0; i < count; i++) {
          const u = Math.random() * 2 - 1;
          const th = Math.random() * Math.PI * 2;
          const s = Math.sqrt(1 - u * u);
          const f = 0.72 + Math.random() * 0.3;
          push(Math.cos(th) * s * f, u * f, Math.sin(th) * s * f, 1);
        }
      }
    }
    return out;
  }

  /* ------------------------- emitters ------------------------- */

  burst(pos: THREE.Vector3, shape: Shape, color?: THREE.Color, scaleMul = 1, silent = false) {
    const S = this.settings;
    const sc = S.scale * scaleMul;
    const c = color ?? this.pal();
    const base = shape === "crossette" ? 14 : this.n(shape === "ring" || shape === "heart" || shape === "star" ? 260 : 340);
    const dirs = this.directions(shape, base);
    const speed = (shape === "willow" ? 7 : shape === "palm" ? 13 : 11) * sc;
    const trailRate = (shape === "chrysanthemum" || shape === "willow" || shape === "palm" ? 26 : 9) * S.trails;
    const life = (shape === "willow" ? 3.4 : shape === "chrysanthemum" ? 2.5 : 1.7) * (0.8 + sc * 0.28);
    const grav = shape === "willow" ? 1.35 : shape === "ring" || shape === "heart" || shape === "star" ? 0.42 : 0.8;

    for (let i = 0; i < dirs.length; i++) {
      const [dx, dy, dz, sm] = dirs[i];
      const jitter = 0.9 + Math.random() * 0.2;
      const white = Math.random() > 0.86 ? 0.6 : 0;
      this.sparks.spawn(
        pos.x, pos.y, pos.z,
        dx * speed * sm * jitter, dy * speed * sm * jitter, dz * speed * sm * jitter,
        c.r + (1 - c.r) * white, c.g + (1 - c.g) * white, c.b + (1 - c.b) * white,
        {
          size: (0.3 + Math.random() * 0.24) * sc,
          life: life * (0.7 + Math.random() * 0.5),
          drag: shape === "ring" ? 1.15 : 0.85,
          gravity: grav,
          trail: trailRate,
          flicker: 0.35,
          fadePow: 1.5,
        }
      );
      if (shape === "crossette") {
        this.splitters.push({
          p: pos.clone(),
          v: new THREE.Vector3(dx, dy, dz).multiplyScalar(speed * sm),
          t: 0.55 + Math.random() * 0.2,
          color: c.clone(),
          scale: sc * 0.45,
          n: 26,
        });
      }
    }
    // Core flash
    for (let i = 0; i < this.n(14); i++) {
      this.glitter.spawn(
        pos.x + (Math.random() - 0.5) * sc * 1.6, pos.y + (Math.random() - 0.5) * sc * 1.6, pos.z + (Math.random() - 0.5) * sc * 1.6,
        (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2,
        1, 0.92, 0.78,
        { size: (0.7 + Math.random() * 0.9) * sc, life: 0.16 + Math.random() * 0.14, drag: 3, gravity: 0, fadePow: 2.4 }
      );
    }
    // Smoke puff
    for (let i = 0; i < Math.round(9 * this.quality); i++) {
      this.smoke.spawn(
        pos.x + (Math.random() - 0.5) * 2 * sc, pos.y + (Math.random() - 0.5) * 2 * sc, pos.z + (Math.random() - 0.5) * 2 * sc,
        (Math.random() - 0.5) * 1.6, 0.5 + Math.random(), (Math.random() - 0.5) * 1.6,
        0.24 + c.r * 0.16, 0.22 + c.g * 0.12, 0.3 + c.b * 0.14,
        { size: 4 * sc, life: 2.6 + Math.random() * 2.4, drag: 0.9, gravity: -0.06, grow: 2.6, fadePow: 1.6 }
      );
    }
    if (!silent) audio.explode(Math.min(2, 0.7 + sc * 0.5), (c.b + c.g) * 0.5);
    this.onBurst?.(pos, sc);
  }

  rocket(x: number, z: number, targetY: number, shape?: Shape, color?: THREE.Color, scaleMul = 1, stage = 0, y0 = 0.6) {
    if (this.rockets.length > 90) return;
    const sh = shape ?? SHAPES[(Math.random() * SHAPES.length) | 0];
    const c = color ?? this.pal();
    const vy = Math.sqrt(Math.max(4, 2 * 9.2 * this.settings.gravity * (targetY - y0))) * 1.02;
    this.rockets.push({
      p: new THREE.Vector3(x, y0, z),
      v: new THREE.Vector3((Math.random() - 0.5) * 1.6, vy, (Math.random() - 0.5) * 1.6),
      targetY,
      shape: sh,
      color: c,
      scale: scaleMul,
      stage,
      age: 0,
      acc: 0,
      fuse: 4.5,
    });
    audio.launch(Math.min(1.4, 0.7 + scaleMul * 0.3));
  }

  volley(center: THREE.Vector3, count = 7, spread = 26) {
    for (let i = 0; i < count; i++) {
      this.schedule(i * 0.13 + Math.random() * 0.1, () => {
        this.rocket(
          center.x + (Math.random() - 0.5) * spread,
          center.z + (Math.random() - 0.5) * spread * 0.6,
          24 + Math.random() * 24,
          undefined, undefined, 0.85 + Math.random() * 0.7
        );
      });
    }
  }

  mega(center: THREE.Vector3, charge: number) {
    const sc = 1.2 + charge * 2.0;
    const c = this.pal();
    const pos = new THREE.Vector3(center.x, 26 + charge * 16, center.z);
    this.burst(pos, "peony", c, sc);
    this.schedule(0.16, () => this.burst(pos.clone().add(new THREE.Vector3(0, 1.5, 0)), "ring", this.palAt(1), sc * 1.25));
    this.schedule(0.32, () => this.burst(pos.clone(), "chrysanthemum", this.palAt(3), sc * 0.9));
    for (let i = 0; i < 5; i++) {
      this.schedule(0.5 + i * 0.12, () =>
        this.rocket(center.x + (Math.random() - 0.5) * 34, center.z + (Math.random() - 0.5) * 20, 22 + Math.random() * 22, undefined, undefined, 0.9 + charge)
      );
    }
    this.goldenRain(center, 1.6 + charge * 2);
  }

  chakri(pos: THREE.Vector3) {
    if (this.spinners.length > 14) return;
    this.spinners.push({ p: pos.clone(), t: 0, life: 3.6, angle: 0, kind: "chakri", color: this.pal(), acc: 0 });
    audio.sparkle(10);
  }

  anar(pos: THREE.Vector3) {
    if (this.spinners.length > 14) return;
    this.spinners.push({ p: pos.clone(), t: 0, life: 3.2, angle: 0, kind: "anar", color: this.palAt(0), acc: 0 });
    audio.launch(0.6);
  }

  /** Continuous handheld sparkler (phuljhadi) driven by the fingertip. */
  sparkler(pos: THREE.Vector3, dt: number, color?: THREE.Color) {
    const c = color ?? tmp.setStyle("#ffd88a");
    const rate = 150 * this.settings.density * dt;
    let k = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
    while (k-- > 0) {
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * Math.PI - Math.PI / 2;
      const s = 2.5 + Math.random() * 7;
      this.sparks.spawn(
        pos.x, pos.y, pos.z,
        Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 1.5, Math.sin(a) * Math.cos(e) * s,
        c.r, c.g * 0.95, c.b * 0.7,
        { size: 0.1 + Math.random() * 0.09, life: 0.3 + Math.random() * 0.5, drag: 2.2, gravity: 0.9, flicker: 0.7 }
      );
    }
  }

  goldenRain(center: THREE.Vector3, seconds: number) {
    this.rainCenter.copy(center);
    this.rainUntil = Math.max(this.rainUntil, seconds);
  }

  /** Light-trail sparkles for the finger wave. */
  waveTrail(pos: THREE.Vector3, vel: THREE.Vector3, color: THREE.Color, dt: number) {
    const rate = 190 * this.settings.density * dt;
    let k = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
    while (k-- > 0) {
      this.glitter.spawn(
        pos.x + (Math.random() - 0.5) * 0.4, pos.y + (Math.random() - 0.5) * 0.4, pos.z + (Math.random() - 0.5) * 0.4,
        vel.x * 0.12 + (Math.random() - 0.5) * 1.6,
        vel.y * 0.12 + (Math.random() - 0.5) * 1.6 + 0.6,
        vel.z * 0.12 + (Math.random() - 0.5) * 1.6,
        color.r, color.g, color.b,
        { size: 0.28 + Math.random() * 0.5, life: 0.5 + Math.random() * 0.8, drag: 1.4, gravity: 0.25, flicker: 0.5, fadePow: 1.6 }
      );
    }
  }

  grandFinale(center: THREE.Vector3) {
    if (this.finaleActive) return;
    this.finaleActive = true;
    const total = 17;
    // Wave 1 — rising ladder of rockets
    for (let i = 0; i < 34; i++) {
      this.schedule(i * 0.16, () =>
        this.rocket(center.x + (Math.random() - 0.5) * 70, center.z + (Math.random() - 0.5) * 40, 22 + Math.random() * 32, undefined, this.palAt(i), 0.9 + Math.random() * 0.6)
      );
    }
    // Wave 2 — shaped blooms across the whole sky
    for (let i = 0; i < 26; i++) {
      this.schedule(4 + i * 0.28, () => {
        const p = new THREE.Vector3(center.x + (Math.random() - 0.5) * 90, 26 + Math.random() * 34, center.z + (Math.random() - 0.5) * 50);
        this.burst(p, SHAPES[i % SHAPES.length], this.palAt(i), 1.1 + Math.random() * 0.9);
      });
    }
    // Wave 3 — multi-stage crossettes + willows
    for (let i = 0; i < 18; i++) {
      this.schedule(9 + i * 0.3, () =>
        this.rocket(center.x + (Math.random() - 0.5) * 80, center.z + (Math.random() - 0.5) * 40, 34 + Math.random() * 26, i % 2 ? "crossette" : "willow", this.palAt(i + 2), 1.3 + Math.random())
      );
    }
    // Wave 4 — screen-wide saturation
    for (let i = 0; i < 44; i++) {
      this.schedule(12.5 + i * 0.1, () => {
        const p = new THREE.Vector3(center.x + (Math.random() - 0.5) * 110, 20 + Math.random() * 44, center.z + (Math.random() - 0.5) * 60);
        this.burst(p, SHAPES[(Math.random() * SHAPES.length) | 0], this.palAt((Math.random() * 6) | 0), 0.9 + Math.random() * 1.1);
      });
    }
    this.goldenRain(center, total);
    this.schedule(total, () => { this.finaleActive = false; });
  }

  /* ------------------------- simulation ------------------------- */

  update(dt: number, time: number) {
    const S = this.settings;
    // scheduled events
    for (let i = this.queue.length - 1; i >= 0; i--) {
      this.queue[i].t -= dt;
      if (this.queue[i].t <= 0) {
        const fn = this.queue[i].fn;
        this.queue.splice(i, 1);
        fn();
      }
    }

    // rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.age += dt;
      r.v.y -= 9.2 * S.gravity * dt;
      r.v.x += S.wind * dt * 1.6;
      r.p.addScaledVector(r.v, dt);
      r.acc += dt * 120 * S.density;
      while (r.acc >= 1) {
        r.acc -= 1;
        this.embers.spawn(
          r.p.x + (Math.random() - 0.5) * 0.25, r.p.y, r.p.z + (Math.random() - 0.5) * 0.25,
          (Math.random() - 0.5) * 1.4 - r.v.x * 0.06, -1.4 - Math.random() * 2.2, (Math.random() - 0.5) * 1.4 - r.v.z * 0.06,
          1, 0.62 + Math.random() * 0.3, 0.2,
          { size: 0.16 + Math.random() * 0.14, life: 0.35 + Math.random() * 0.5, drag: 1.8, gravity: 0.35, flicker: 0.6 }
        );
      }
      if (r.p.y >= r.targetY || r.v.y <= 0.4 || r.age > r.fuse) {
        this.rockets.splice(i, 1);
        this.burst(r.p, r.shape, r.color, r.scale);
        if (r.stage > 0) {
          for (let k = 0; k < 3 + r.stage; k++) {
            const a = (k / (3 + r.stage)) * Math.PI * 2;
            this.schedule(0.08 + k * 0.05, () => {
              const nr: Rocket = {
                p: r.p.clone().add(new THREE.Vector3(Math.cos(a) * 2, 0, Math.sin(a) * 2)),
                v: new THREE.Vector3(Math.cos(a) * 7, 7 + Math.random() * 4, Math.sin(a) * 7),
                targetY: r.p.y + 7 + Math.random() * 6,
                shape: SHAPES[(Math.random() * 6) | 0],
                color: this.palAt(k),
                scale: r.scale * 0.6,
                stage: 0,
                age: 0, acc: 0, fuse: 1.4,
              };
              this.rockets.push(nr);
            });
          }
        }
      }
    }
    this.liveRockets = this.rockets.length;

    // crossette splitters
    for (let i = this.splitters.length - 1; i >= 0; i--) {
      const s = this.splitters[i];
      s.t -= dt;
      s.v.y -= 9.2 * S.gravity * 0.5 * dt;
      s.p.addScaledVector(s.v, dt);
      if (s.t <= 0) {
        this.splitters.splice(i, 1);
        for (let k = 0; k < this.n(s.n); k++) {
          const a = Math.random() * Math.PI * 2;
          const u = Math.random() * 2 - 1;
          const rr = Math.sqrt(1 - u * u);
          const sp = 6 * s.scale;
          this.sparks.spawn(
            s.p.x, s.p.y, s.p.z,
            Math.cos(a) * rr * sp, u * sp, Math.sin(a) * rr * sp,
            s.color.r, s.color.g, s.color.b,
            { size: 0.16 * s.scale + 0.06, life: 0.9, drag: 1.1, gravity: 0.8, trail: 10 * S.trails, flicker: 0.4 }
          );
        }
        audio.sparkle(3);
      }
    }

    // ground spinners & fountains
    for (let i = this.spinners.length - 1; i >= 0; i--) {
      const s = this.spinners[i];
      s.t += dt;
      if (s.t > s.life) { this.spinners.splice(i, 1); continue; }
      s.acc += dt * (s.kind === "chakri" ? 320 : 260) * S.density;
      const fade = 1 - s.t / s.life;
      while (s.acc >= 1) {
        s.acc -= 1;
        if (s.kind === "chakri") {
          s.angle += 0.42;
          const sp = 9 * S.scale * (0.6 + fade * 0.6);
          const a = s.angle;
          this.sparks.spawn(
            s.p.x + Math.cos(a) * 0.4, s.p.y + 0.25, s.p.z + Math.sin(a) * 0.4,
            Math.cos(a) * sp, 1.2 + Math.random() * 2.2, Math.sin(a) * sp,
            s.color.r, s.color.g, s.color.b,
            { size: 0.14, life: 0.6 + Math.random() * 0.5, drag: 1.5, gravity: 0.7, flicker: 0.6, trail: 6 * S.trails }
          );
        } else {
          const a = Math.random() * Math.PI * 2;
          const spread = 0.24 + Math.random() * 0.2;
          const sp = (13 + Math.random() * 9) * S.scale * (0.55 + fade * 0.6);
          this.sparks.spawn(
            s.p.x, s.p.y + 0.4, s.p.z,
            Math.cos(a) * spread * sp, sp, Math.sin(a) * spread * sp,
            1, 0.72 + Math.random() * 0.28, 0.3,
            { size: 0.16, life: 1.0 + Math.random() * 0.7, drag: 0.55, gravity: 1, flicker: 0.5, trail: 14 * S.trails }
          );
        }
      }
    }

    // golden rain
    if (this.rainUntil > 0) {
      this.rainUntil -= dt;
      const rate = 240 * S.density * dt;
      let k = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
      while (k-- > 0) {
        const c = this.palAt((Math.random() * 6) | 0);
        this.glitter.spawn(
          this.rainCenter.x + (Math.random() - 0.5) * 130,
          52 + Math.random() * 26,
          this.rainCenter.z + (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 1.2, -2 - Math.random() * 3, (Math.random() - 0.5) * 1.2,
          c.r * 0.5 + 0.5, c.g * 0.6 + 0.35, c.b * 0.4 + 0.1,
          { size: 0.3 + Math.random() * 0.55, life: 5 + Math.random() * 3, drag: 0.25, gravity: 0.12, flicker: 0.65, fadePow: 1.1 }
        );
      }
    }

    this.smoke.update(dt, time, S.gravity, S.wind, S.turbulence * 0.4);
    this.sparks.update(dt, time, S.gravity, S.wind, S.turbulence, this.embers);
    this.embers.update(dt, time, S.gravity, S.wind, S.turbulence * 0.6);
    this.glitter.update(dt, time, S.gravity * 0.4, S.wind, S.turbulence * 0.8);
  }

  get particleCount() {
    return this.sparks.count + this.embers.count + this.smoke.count + this.glitter.count;
  }

  clear() {
    this.rockets.length = 0;
    this.splitters.length = 0;
    this.spinners.length = 0;
    this.queue.length = 0;
    this.rainUntil = 0;
    this.finaleActive = false;
    this.sparks.clear();
    this.embers.clear();
    this.smoke.clear();
    this.glitter.clear();
  }

  setScaleUniform(v: number) {
    this.sparks.setScale(v);
    this.embers.setScale(v);
    this.smoke.setScale(v);
    this.glitter.setScale(v);
  }

  dispose() {
    this.sparks.dispose();
    this.embers.dispose();
    this.smoke.dispose();
    this.glitter.dispose();
    this.textures.forEach((t) => t.dispose());
  }
}
