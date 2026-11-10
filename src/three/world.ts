import * as THREE from "three";
import {
  flameTexture, marigoldTexture, lanternTexture, floorTexture,
  rangoliTexture, footprintTexture, sparkTexture, flareTexture,
} from "../lib/textures";
const skylineUrl = "/images/skyline.jpg";

export interface ZoneDef {
  id: string;
  name: string;
  hindi: string;
  blurb: string;
  center: THREE.Vector3;
  targetY: number;
  distance: number;
  polar: number;
}

export const ZONES: ZoneDef[] = [
  { id: "diya", name: "Diya Garden", hindi: "दीप वाटिका", blurb: "Sweep your fingertip across the lamps to kindle every flame.", center: new THREE.Vector3(0, 0, 0), targetY: 9, distance: 46, polar: 1.28 },
  { id: "arena", name: "Fireworks Arena", hindi: "आतिशबाज़ी", blurb: "Pinch to grab a rocket, drag it up, release to launch.", center: new THREE.Vector3(140, 0, 0), targetY: 20, distance: 74, polar: 1.16 },
  { id: "rangoli", name: "Rangoli Studio", hindi: "रंगोली", blurb: "Trace with your index finger — eightfold symmetry does the rest.", center: new THREE.Vector3(280, 0, 0), targetY: 2, distance: 40, polar: 0.66 },
  { id: "lantern", name: "Sky Lantern Festival", hindi: "आकाश दीप", blurb: "Open your palm to set a hundred lanterns drifting.", center: new THREE.Vector3(420, 0, 0), targetY: 22, distance: 66, polar: 1.2 },
  { id: "grand", name: "Grand Celebration", hindi: "महोत्सव", blurb: "Both palms open. Hold. Let the whole sky answer.", center: new THREE.Vector3(560, 0, 0), targetY: 20, distance: 82, polar: 1.14 },
];

const BILLBOARD_VERT = /* glsl */ `
attribute float aLit;
attribute float aSeed;
uniform float uTime;
uniform float uFlicker;
uniform vec2 uStretch;
varying vec2 vUv;
varying float vLit;
varying float vSeed;
void main() {
  vUv = uv;
  vLit = aLit;
  vSeed = aSeed;
  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float sx = length(instanceMatrix[0].xyz);
  float sy = length(instanceMatrix[1].xyz);
  float f = 1.0 + uFlicker * (sin(uTime * 11.0 + aSeed * 6.28) * 0.09 + sin(uTime * 23.0 + aSeed * 3.1) * 0.05);
  vec4 mv = viewMatrix * vec4(ip, 1.0);
  mv.x += position.x * sx * uStretch.x + uFlicker * sin(uTime * 7.0 + aSeed * 9.0) * sx * 0.05;
  mv.y += position.y * sy * uStretch.y * f;
  gl_Position = projectionMatrix * mv;
}`;

const BILLBOARD_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uPulse;
varying vec2 vUv;
varying float vLit;
varying float vSeed;
void main() {
  vec4 t = texture2D(uTex, vUv);
  float pulse = 1.0 + uPulse * sin(uTime * 2.2 + vSeed * 6.28);
  float a = t.a * vLit * uOpacity;
  if (a < 0.004) discard;
  vec3 c = t.rgb * uColor * pulse;
  gl_FragColor = vec4(c * a, a);
}`;

function billboardMat(tex: THREE.Texture, color: number, opts: { flicker?: number; stretch?: [number, number]; pulse?: number; opacity?: number; blend?: "add" | "normal" } = {}) {
  const normal = opts.blend === "normal";
  return new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: tex },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uFlicker: { value: opts.flicker ?? 0 },
      uStretch: { value: new THREE.Vector2(...(opts.stretch ?? [1, 1])) },
      uPulse: { value: opts.pulse ?? 0 },
      uOpacity: { value: opts.opacity ?? 1 },
    },
    vertexShader: BILLBOARD_VERT,
    fragmentShader: BILLBOARD_FRAG,
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: normal,
    blending: normal ? THREE.NormalBlending : THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
}

function instancedBillboards(count: number, mat: THREE.ShaderMaterial) {
  const g = new THREE.PlaneGeometry(1, 1);
  const lit = new Float32Array(count).fill(1);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = Math.random();
  g.setAttribute("aLit", new THREE.InstancedBufferAttribute(lit, 1));
  g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
  const m = new THREE.InstancedMesh(g, mat, count);
  m.frustumCulled = false;
  return m;
}

/* ------------------------------------------------------------------ */
/* Rangoli painter — canvas texture + SVG export                        */
/* ------------------------------------------------------------------ */
export class RangoliPainter {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  symmetry = 8;
  brush = 7;
  hue = 0;
  autoColor = true;
  strokes: { pts: [number, number][]; color: string; w: number }[] = [];
  private current: { pts: [number, number][]; color: string; w: number } | null = null;
  private last: [number, number] | null = null;
  palette = ["#ff2e88", "#ffb020", "#22e0c8", "#8b5cf6", "#ff6a00", "#ffe66d"];

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = 1024;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.clear();
  }

  clear() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, 1024, 1024);
    c.translate(512, 512);
    c.strokeStyle = "rgba(255,214,140,0.16)";
    c.lineWidth = 2;
    for (let r = 70; r <= 470; r += 80) {
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.stroke();
    }
    for (let i = 0; i < 16; i++) {
      c.save();
      c.rotate((i / 16) * Math.PI * 2);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(470, 0);
      c.stroke();
      c.restore();
    }
    this.strokes = [];
    this.current = null;
    this.last = null;
    this.texture.needsUpdate = true;
  }

  beginStroke() {
    const color = this.autoColor
      ? this.palette[this.hue++ % this.palette.length]
      : this.palette[this.hue % this.palette.length];
    this.current = { pts: [], color, w: this.brush };
    this.strokes.push(this.current);
    this.last = null;
  }
  endStroke() {
    this.current = null;
    this.last = null;
  }

  /** x,y in -1..1 disc space */
  paint(x: number, y: number) {
    if (!this.current) this.beginStroke();
    const cur = this.current!;
    const px = x * 470;
    const py = y * 470;
    cur.pts.push([x, y]);
    const c = this.ctx;
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
    c.shadowBlur = 22;
    c.shadowColor = cur.color;
    for (let s = 0; s < this.symmetry; s++) {
      for (let mirror = 0; mirror < 2; mirror++) {
        c.save();
        c.rotate((s / this.symmetry) * Math.PI * 2);
        c.scale(1, mirror ? -1 : 1);
        c.strokeStyle = cur.color;
        c.lineWidth = cur.w;
        c.beginPath();
        if (this.last) {
          c.moveTo(this.last[0], this.last[1]);
          c.lineTo(px, py);
        } else {
          c.moveTo(px, py);
          c.lineTo(px + 0.01, py);
        }
        c.stroke();
        c.globalAlpha = 0.55;
        c.strokeStyle = "#fff6dd";
        c.lineWidth = Math.max(1, cur.w * 0.35);
        c.stroke();
        c.restore();
      }
    }
    c.restore();
    this.last = [px, py];
    this.texture.needsUpdate = true;
  }

  toSVG(): string {
    const parts: string[] = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-512 -512 1024 1024" width="1024" height="1024">`);
    parts.push(`<defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`);
    parts.push(`<rect x="-512" y="-512" width="1024" height="1024" fill="#0a0616"/>`);
    parts.push(`<circle r="486" fill="none" stroke="#d6a85a" stroke-opacity="0.35" stroke-width="3"/>`);
    parts.push(`<g filter="url(#g)">`);
    for (const st of this.strokes) {
      if (st.pts.length < 1) continue;
      const d = st.pts.map((p, i) => `${i ? "L" : "M"}${(p[0] * 470).toFixed(1)},${(p[1] * 470).toFixed(1)}`).join(" ");
      for (let s = 0; s < this.symmetry; s++) {
        const rot = (s / this.symmetry) * 360;
        for (let m = 0; m < 2; m++) {
          parts.push(`<path d="${d}" fill="none" stroke="${st.color}" stroke-width="${st.w}" stroke-linecap="round" transform="rotate(${rot}) scale(1,${m ? -1 : 1})"/>`);
        }
      }
    }
    parts.push(`</g></svg>`);
    return parts.join("");
  }
}

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */
interface LanternState {
  p: THREE.Vector3;
  v: THREE.Vector3;
  phase: number;
  scale: number;
  ambient: boolean;
  life: number;
}

export class World {
  group = new THREE.Group();
  rangoli = new RangoliPainter();
  diyaPositions: THREE.Vector3[] = [];
  diyaLit: Float32Array;
  diyaTarget: Float32Array;
  floatingDiyas!: THREE.InstancedMesh;
  floatingFlames!: THREE.InstancedMesh;
  private floatStates: { p: THREE.Vector3; v: number; phase: number; active: boolean }[] = [];
  private mats: THREE.ShaderMaterial[] = [];
  private textures: THREE.Texture[] = [];
  private flames!: THREE.InstancedMesh;
  private glows!: THREE.InstancedMesh;
  private halos!: THREE.InstancedMesh;
  private lanterns!: THREE.InstancedMesh;
  private lanternGlows!: THREE.InstancedMesh;
  private lanternStates: LanternState[] = [];
  private ledMat!: THREE.ShaderMaterial;
  private motesMat!: THREE.ShaderMaterial;
  private starMat!: THREE.ShaderMaterial;
  private rangoliMesh!: THREE.Mesh;
  private rangoliSpin = 0;
  private banner!: THREE.Mesh;
  private bannerMat!: THREE.MeshBasicMaterial;
  private zoneLights: THREE.PointLight[] = [];
  private dummy = new THREE.Object3D();
  private disposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  private footMat!: THREE.ShaderMaterial;
  finaleT = 0;
  lanternsReleased = 0;
  diyasLit = 0;
  ledSpeed = 1;

  constructor() {
    this.buildSky();
    this.buildFloor();
    this.buildDiyas();
    this.diyaLit = new Float32Array(this.diyaPositions.length);
    this.diyaTarget = new Float32Array(this.diyaPositions.length);
    // The night already glows: most lamps are burning, the rest wait for a hand.
    for (let i = 0; i < this.diyaTarget.length; i++) {
      this.diyaTarget[i] = Math.random() < 0.58 ? 1 : 0;
    }
    this.diyasLit = this.diyaTarget.reduce((a, b) => a + b, 0);
    this.buildFlames();
    this.buildLanterns();
    this.buildGarlands();
    this.buildLeds();
    this.buildRangoli();
    this.buildFootprints();
    this.buildMotes();
    this.buildFloatingDiyas();
    this.buildBanner();
  }

  /* ---------------- sky ---------------- */
  private buildSky() {
    const skyGeo = new THREE.SphereGeometry(900, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vP; uniform float uTime;
        void main(){
          float h = normalize(vP).y;
          vec3 top = vec3(0.006,0.008,0.026);
          vec3 mid = vec3(0.020,0.014,0.055);
          vec3 hor = vec3(0.055,0.022,0.040);
          vec3 c = mix(hor, mid, smoothstep(-0.02, 0.26, h));
          c = mix(c, top, smoothstep(0.20, 0.75, h));
          float glow = exp(-abs(h) * 13.0) * 0.16;
          c += vec3(0.34,0.15,0.05) * glow;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.frustumCulled = false;
    this.group.add(sky);
    this.disposables.push(skyGeo, skyMat);

    // stars
    const N = 1500;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    const size = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 0.92 + 0.04;
      const th = Math.random() * Math.PI * 2;
      const r = 840;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = 280 + Math.cos(th) * s * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = Math.sin(th) * s * r;
      seed[i] = Math.random() * 10;
      size[i] = 1 + Math.random() * 2.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    const starTex = sparkTexture();
    this.textures.push(starTex);
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTex: { value: starTex }, uScale: { value: 700 } },
      vertexShader: `
        attribute float aSeed; attribute float aSize; uniform float uTime; uniform float uScale;
        varying float vA;
        void main(){
          vA = 0.35 + 0.65 * pow(0.5 + 0.5*sin(uTime*0.9 + aSeed*6.28), 2.0);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = clamp(aSize * uScale / max(1.0,-mv.z), 1.0, 12.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex; varying float vA;
        void main(){ float a = texture2D(uTex, gl_PointCoord).a * vA; gl_FragColor = vec4(vec3(0.85,0.9,1.0)*a, a); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    });
    const stars = new THREE.Points(g, m);
    stars.frustumCulled = false;
    this.group.add(stars);
    this.starMat = m;
    this.disposables.push(g, m);

    // distant skyline
    const tex = new THREE.TextureLoader().load(skylineUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(5, 1);
    this.textures.push(tex);
    const cyl = new THREE.CylinderGeometry(430, 430, 200, 72, 1, true);
    const cm = new THREE.MeshBasicMaterial({
      map: tex, side: THREE.BackSide, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.34, fog: false,
    });
    const skyline = new THREE.Mesh(cyl, cm);
    skyline.position.set(280, 88, 0);
    this.group.add(skyline);
    this.disposables.push(cyl, cm);
  }

  /* ---------------- floor ---------------- */
  private buildFloor() {
    const tex = floorTexture();
    this.textures.push(tex);
    const g = new THREE.PlaneGeometry(1800, 1800);
    const m = new THREE.MeshStandardMaterial({
      map: tex, color: 0x35305c, roughness: 0.42, metalness: 0.5,
    });
    const floor = new THREE.Mesh(g, m);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(280, 0, 0);
    this.group.add(floor);
    this.disposables.push(g, m);

    this.group.add(new THREE.AmbientLight(0x2b2350, 0.55));
    const hemi = new THREE.HemisphereLight(0x4455aa, 0x1a0c04, 0.32);
    this.group.add(hemi);
    const moon = new THREE.DirectionalLight(0x9fb4ff, 0.32);
    moon.position.set(-80, 120, 90);
    this.group.add(moon);

    // warm light pools per zone (additive discs)
    const pool = sparkTexture();
    this.textures.push(pool);
    const pg = new THREE.PlaneGeometry(1, 1);
    const pm = new THREE.MeshBasicMaterial({
      map: pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xff8a2a, opacity: 0.14,
    });
    this.disposables.push(pg, pm);
    ZONES.forEach((z) => {
      const disc = new THREE.Mesh(pg, pm);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(z.center.x, 0.04, z.center.z);
      disc.scale.setScalar(z.id === "grand" ? 96 : 66);
      this.group.add(disc);
      const pl = new THREE.PointLight(0xff8a2a, 130, 100, 2);
      pl.position.set(z.center.x, 8, z.center.z + 6);
      this.group.add(pl);
      this.zoneLights.push(pl);
    });
  }

  /* ---------------- diyas ---------------- */
  private buildDiyas() {
    const push = (x: number, y: number, z: number) => this.diyaPositions.push(new THREE.Vector3(x, y, z));
    const z0 = ZONES[0].center;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      push(z0.x + Math.cos(a) * 13, 0.05, z0.z + Math.sin(a) * 13);
    }
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.1;
      push(z0.x + Math.cos(a) * 20, 0.05, z0.z + Math.sin(a) * 20);
    }
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < 11; i++) push(z0.x - 25 + i * 5, 0.05, z0.z + (r ? 27 : -27));
    ZONES.forEach((z, zi) => {
      if (zi === 0) return;
      const n = zi === 4 ? 24 : 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = zi === 4 ? 24 : 19;
        push(z.center.x + Math.cos(a) * r, 0.05, z.center.z + Math.sin(a) * r);
      }
    });

    const N = this.diyaPositions.length;
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.001, 0), new THREE.Vector2(0.62, 0.02), new THREE.Vector2(1.02, 0.16),
      new THREE.Vector2(1.16, 0.4), new THREE.Vector2(1.06, 0.44), new THREE.Vector2(0.82, 0.26),
      new THREE.Vector2(0.001, 0.2),
    ];
    const bowl = new THREE.LatheGeometry(pts, 16);
    const bm = new THREE.MeshStandardMaterial({ color: 0xa4501f, roughness: 0.82, metalness: 0.08, emissive: 0x220800 });
    const bowls = new THREE.InstancedMesh(bowl, bm, N);
    bowls.frustumCulled = false;
    for (let i = 0; i < N; i++) {
      this.dummy.position.copy(this.diyaPositions[i]);
      this.dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      this.dummy.scale.setScalar(1.05 + Math.random() * 0.35);
      this.dummy.updateMatrix();
      bowls.setMatrixAt(i, this.dummy.matrix);
    }
    bowls.instanceMatrix.needsUpdate = true;
    this.group.add(bowls);
    this.disposables.push(bowl, bm);
  }

  private buildFlames() {
    const N = this.diyaPositions.length;
    const ft = flameTexture();
    const gt = sparkTexture();
    this.textures.push(ft, gt);
    const fm = billboardMat(ft, 0xffd9a0, { flicker: 1, stretch: [1, 1.35] });
    const gm = billboardMat(gt, 0xff8a24, { flicker: 0.6, opacity: 0.34 });
    this.mats.push(fm, gm);
    this.flames = instancedBillboards(N, fm);
    this.glows = instancedBillboards(N, gm);
    const litF = this.flames.geometry.getAttribute("aLit") as THREE.InstancedBufferAttribute;
    const litG = this.glows.geometry.getAttribute("aLit") as THREE.InstancedBufferAttribute;
    (litF.array as Float32Array).set(this.diyaTarget);
    (litG.array as Float32Array).set(this.diyaTarget);
    this.diyaLit.set(this.diyaTarget);
    const haloGeo = new THREE.PlaneGeometry(1, 1);
    const haloMat = new THREE.MeshBasicMaterial({
      map: gt, color: 0xff8f30, transparent: true, opacity: 0.42,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.halos = new THREE.InstancedMesh(haloGeo, haloMat, N);
    this.halos.frustumCulled = false;
    this.group.add(this.halos);
    this.disposables.push(haloGeo, haloMat);
    for (let i = 0; i < N; i++) {
      const p = this.diyaPositions[i];
      this.dummy.position.set(p.x, p.y + 0.72, p.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(0.62, 1.05, 1);
      this.dummy.updateMatrix();
      this.flames.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.set(p.x, p.y + 0.6, p.z);
      this.dummy.scale.setScalar(2.3);
      this.dummy.updateMatrix();
      this.glows.setMatrixAt(i, this.dummy.matrix);
    }
    this.flames.instanceMatrix.needsUpdate = true;
    this.glows.instanceMatrix.needsUpdate = true;
    this.group.add(this.glows, this.flames);
  }

  /* ---------------- lanterns ---------------- */
  private buildLanterns() {
    const N = 90;
    const tex = lanternTexture();
    const gt = sparkTexture();
    this.textures.push(tex, gt);
    const geo = new THREE.CylinderGeometry(0.85, 1.15, 2.3, 10, 1, true);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
    this.lanterns = new THREE.InstancedMesh(geo, mat, N);
    this.lanterns.frustumCulled = false;
    const gm = billboardMat(gt, 0xffa43c, { flicker: 0.5, opacity: 0.42 });
    this.mats.push(gm);
    this.lanternGlows = instancedBillboards(N, gm);
    this.group.add(this.lanterns, this.lanternGlows);
    this.disposables.push(geo, mat);

    for (let i = 0; i < N; i++) {
      const zone = ZONES[i % ZONES.length];
      const ambient = i < 54;
      this.lanternStates.push({
        p: new THREE.Vector3(
          zone.center.x + (Math.random() - 0.5) * 100,
          ambient ? 4 + Math.random() * 62 : -50,
          zone.center.z - 18 - Math.random() * 62
        ),
        v: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.9 + Math.random() * 1.3, (Math.random() - 0.5) * 0.3),
        phase: Math.random() * 100,
        scale: 0.7 + Math.random() * 0.8,
        ambient,
        life: ambient ? 1 : 0,
      });
    }
  }

  releaseLanterns(pos: THREE.Vector3, count: number) {
    let released = 0;
    for (const s of this.lanternStates) {
      if (released >= count) break;
      if (s.ambient) continue;
      if (s.life > 0 && s.p.y < 60) continue;
      s.p.set(
        pos.x + (Math.random() - 0.5) * 10,
        Math.max(1.5, Math.min(30, pos.y - 2 + Math.random() * 3)),
        Math.min(4, pos.z - 6 + (Math.random() - 0.5) * 10)
      );
      s.v.set((Math.random() - 0.5) * 0.7, 1.6 + Math.random() * 1.6, (Math.random() - 0.5) * 0.4);
      s.scale = 0.75 + Math.random() * 0.75;
      s.life = 1;
      released++;
    }
    this.lanternsReleased += released;
    return released;
  }

  /* ---------------- garlands (toran + marigold) ---------------- */
  private buildGarlands() {
    const perZone = 3;
    const perString = 44;
    const N = ZONES.length * perZone * perString;
    const tex = marigoldTexture();
    this.textures.push(tex);
    const mat = billboardMat(tex, 0xb0763a, { pulse: 0.06, blend: "normal" });
    this.mats.push(mat);
    const flowers = instancedBillboards(N, mat);
    const leafGeo = new THREE.ConeGeometry(0.5, 1.7, 6);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a7d3e, roughness: 0.62, emissive: 0x0b2c14 });
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, N);
    leaves.frustumCulled = false;
    this.disposables.push(leafGeo, leafMat);
    let i = 0;
    ZONES.forEach((z) => {
      for (let s = 0; s < perZone; s++) {
        const span = 62 + s * 12;
        const yTop = 21 + s * 4.5;
        const sag = 5 + s * 1.4;
        const zOff = -18 + s * 16;
        for (let k = 0; k < perString; k++) {
          const t = k / (perString - 1);
          const x = z.center.x - span / 2 + t * span;
          const y = yTop - Math.sin(t * Math.PI) * sag;
          const zz = z.center.z + zOff;
          this.dummy.position.set(x, y, zz);
          this.dummy.rotation.set(0, 0, 0);
          this.dummy.scale.setScalar(0.72 + Math.random() * 0.3);
          this.dummy.updateMatrix();
          flowers.setMatrixAt(i, this.dummy.matrix);
          this.dummy.position.set(x, y - 0.95, zz);
          this.dummy.rotation.set(Math.PI, Math.random() * 3, 0);
          this.dummy.scale.set(0.62 + Math.random() * 0.2, 0.85 + Math.random() * 0.3, 0.18);
          this.dummy.updateMatrix();
          leaves.setMatrixAt(i, this.dummy.matrix);
          i++;
        }
      }
    });
    flowers.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    this.group.add(flowers, leaves);
  }

  /* ---------------- LED strings ---------------- */
  private buildLeds() {
    const pts: number[] = [];
    const cols: number[] = [];
    const phases: number[] = [];
    const wire: number[] = [];
    const palette = [0xff3b6b, 0xffc93c, 0x35d07f, 0x2d9cdb, 0xb44cff, 0xff7a00].map((h) => new THREE.Color(h));
    ZONES.forEach((z) => {
      for (let s = 0; s < 4; s++) {
        const span = 74;
        const yTop = 15 + s * 3.2;
        const sag = 3.4;
        const zOff = -26 + s * 17;
        let prev: THREE.Vector3 | null = null;
        const steps = 60;
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const x = z.center.x - span / 2 + t * span;
          const y = yTop - Math.sin(t * Math.PI) * sag;
          const zz = z.center.z + zOff;
          const cur = new THREE.Vector3(x, y, zz);
          if (prev) wire.push(prev.x, prev.y, prev.z, cur.x, cur.y, cur.z);
          prev = cur;
          if (k % 2 === 0) {
            pts.push(x, y - 0.35, zz);
            const c = palette[(k / 2 + s) % palette.length];
            cols.push(c.r, c.g, c.b);
            phases.push(k * 0.22 + s * 1.7);
          }
        }
      }
    });
    const wg = new THREE.BufferGeometry();
    wg.setAttribute("position", new THREE.Float32BufferAttribute(wire, 3));
    const wm = new THREE.LineBasicMaterial({ color: 0x1a1730, transparent: true, opacity: 0.7 });
    this.group.add(new THREE.LineSegments(wg, wm));
    this.disposables.push(wg, wm);

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute("aColor", new THREE.Float32BufferAttribute(cols, 3));
    g.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
    const tex = sparkTexture();
    this.textures.push(tex);
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTex: { value: tex }, uScale: { value: 700 }, uChase: { value: 1 } },
      vertexShader: `
        attribute vec3 aColor; attribute float aPhase;
        uniform float uTime; uniform float uScale; uniform float uChase;
        varying vec3 vC; varying float vA;
        void main(){
          vC = aColor;
          float w = 0.5 + 0.5 * sin(uTime * 3.0 * uChase - aPhase);
          vA = 0.25 + 0.75 * pow(w, 2.0);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = clamp((0.34 + vA*0.34) * uScale / max(1.0,-mv.z), 1.0, 26.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex; varying vec3 vC; varying float vA;
        void main(){ float a = texture2D(uTex, gl_PointCoord).a * vA; gl_FragColor = vec4(vC * a * 0.95, a); }`,
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    const led = new THREE.Points(g, m);
    led.frustumCulled = false;
    this.group.add(led);
    this.ledMat = m;
    this.disposables.push(g, m);
  }

  /* ---------------- rangoli ---------------- */
  private buildRangoli() {
    const base = rangoliTexture(1024);
    this.textures.push(base);
    ZONES.forEach((z) => {
      if (z.id === "rangoli") return;
      const g = new THREE.CircleGeometry(z.id === "grand" ? 17 : 11, 64);
      const m = new THREE.MeshBasicMaterial({
        map: base, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.24,
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(z.center.x, 0.06, z.center.z);
      this.group.add(mesh);
      this.disposables.push(g, m);
    });
    const z = ZONES[2];
    const g = new THREE.CircleGeometry(17, 96);
    const m = new THREE.MeshBasicMaterial({
      map: this.rangoli.texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.rangoliMesh = new THREE.Mesh(g, m);
    this.rangoliMesh.rotation.x = -Math.PI / 2;
    this.rangoliMesh.position.set(z.center.x, 0.08, z.center.z);
    this.group.add(this.rangoliMesh);
    this.disposables.push(g, m);

    const ringG = new THREE.RingGeometry(17.2, 18.4, 96);
    const ringM = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(ringG, ringM);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(z.center.x, 0.07, z.center.z);
    this.group.add(ring);
    this.disposables.push(ringG, ringM);
  }

  /* ---------------- Lakshmi footprints ---------------- */
  private buildFootprints() {
    const N = 18;
    const tex = footprintTexture();
    this.textures.push(tex);
    const g = new THREE.PlaneGeometry(1.9, 1.9);
    const lit = new Float32Array(N).fill(1);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) seed[i] = i / N;
    g.setAttribute("aLit", new THREE.InstancedBufferAttribute(lit, 1));
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uTime: { value: 0 }, uColor: { value: new THREE.Color(0xffc46b) } },
      vertexShader: `
        attribute float aLit; attribute float aSeed;
        varying vec2 vUv; varying float vS;
        void main(){ vUv=uv; vS=aSeed;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D uTex; uniform float uTime; uniform vec3 uColor;
        varying vec2 vUv; varying float vS;
        void main(){
          float wave = fract(uTime * 0.16);
          float d = fract(vS - wave + 1.0);
          float a = texture2D(uTex, vUv).a * (0.16 + 0.84 * exp(-d * 7.0));
          gl_FragColor = vec4(uColor * a * 1.4, a);
        }`,
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    const mesh = new THREE.InstancedMesh(g, m, N);
    mesh.frustumCulled = false;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      this.dummy.position.set(ZONES[0].center.x + Math.sin(t * 3) * 3.2 + (i % 2 ? 1.1 : -1.1), 0.09, 34 - t * 30);
      this.dummy.rotation.set(-Math.PI / 2, 0, Math.sin(t * 3) * 0.2);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
    this.footMat = m;
    this.disposables.push(g, m);
  }

  /* ---------------- ambient motes ---------------- */
  private buildMotes() {
    const N = 2200;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    const size = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = -60 + Math.random() * 700;
      pos[i * 3 + 1] = Math.random() * 70;
      pos[i * 3 + 2] = -70 + Math.random() * 140;
      seed[i] = Math.random() * 100;
      size[i] = 0.1 + Math.random() * 0.4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    const tex = flareTexture();
    this.textures.push(tex);
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTex: { value: tex }, uScale: { value: 700 } },
      vertexShader: `
        attribute float aSeed; attribute float aSize;
        uniform float uTime; uniform float uScale;
        varying float vA;
        void main(){
          vec3 p = position;
          p.y = mod(p.y + uTime * (0.35 + fract(aSeed)*0.5), 72.0);
          p.x += sin(uTime * 0.35 + aSeed) * 2.4;
          p.z += cos(uTime * 0.28 + aSeed * 1.3) * 2.4;
          vA = (0.25 + 0.75 * pow(0.5 + 0.5*sin(uTime*1.7 + aSeed*5.0), 3.0)) * smoothstep(72.0, 40.0, p.y);
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          gl_PointSize = clamp(aSize * uScale / max(1.0,-mv.z), 1.0, 22.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex; varying float vA;
        void main(){ float a = texture2D(uTex, gl_PointCoord).a * vA * 0.38;
          gl_FragColor = vec4(vec3(1.0,0.78,0.42) * a, a); }`,
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    this.group.add(p);
    this.motesMat = m;
    this.disposables.push(g, m);
  }

  /* ---------------- floating diyas (finale) ---------------- */
  private buildFloatingDiyas() {
    const N = 30;
    const ft = flameTexture();
    this.textures.push(ft);
    const bowl = new THREE.SphereGeometry(0.8, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
    const bm = new THREE.MeshStandardMaterial({ color: 0xb45a22, roughness: 0.8, emissive: 0x3a1000 });
    this.floatingDiyas = new THREE.InstancedMesh(bowl, bm, N);
    this.floatingDiyas.frustumCulled = false;
    const fm = billboardMat(ft, 0xffd9a0, { flicker: 1, stretch: [1, 1.4], opacity: 1 });
    this.mats.push(fm);
    this.floatingFlames = instancedBillboards(N, fm);
    const litAttr = this.floatingFlames.geometry.getAttribute("aLit") as THREE.InstancedBufferAttribute;
    (litAttr.array as Float32Array).fill(0);
    this.group.add(this.floatingDiyas, this.floatingFlames);
    this.disposables.push(bowl, bm);
    for (let i = 0; i < N; i++) {
      this.floatStates.push({
        p: new THREE.Vector3(0, -100, 0),
        v: 1 + Math.random() * 1.4,
        phase: Math.random() * 100,
        active: false,
      });
    }
  }

  launchFloatingDiyas(center: THREE.Vector3) {
    this.floatStates.forEach((s) => {
      s.p.set(center.x + (Math.random() - 0.5) * 70, 0.6 + Math.random() * 2, center.z + (Math.random() - 0.5) * 50);
      s.v = 1.2 + Math.random() * 1.8;
      s.active = true;
    });
    const litAttr = this.floatingFlames.geometry.getAttribute("aLit") as THREE.InstancedBufferAttribute;
    (litAttr.array as Float32Array).fill(1);
    litAttr.needsUpdate = true;
  }

  /* ---------------- greeting banner ---------------- */
  private buildBanner() {
    const c = document.createElement("canvas");
    c.width = 2048;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 2048, 512);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 190px Cinzel, Georgia, serif";
    const grad = ctx.createLinearGradient(0, 120, 0, 340);
    grad.addColorStop(0, "#fff6d8");
    grad.addColorStop(0.45, "#ffcf62");
    grad.addColorStop(1, "#ff7a18");
    ctx.shadowColor = "rgba(255,150,40,0.75)";
    ctx.shadowBlur = 26;
    ctx.fillStyle = grad;
    ctx.fillText("HAPPY DIWALI", 1024, 210);
    ctx.shadowBlur = 24;
    ctx.font = "500 74px Manrope, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,232,190,0.92)";
    ctx.fillText("M A Y   T H E   L I G H T   F I N D   Y O U", 1024, 370);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(tex);
    const g = new THREE.PlaneGeometry(84, 21);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    this.banner = new THREE.Mesh(g, m);
    this.banner.position.set(ZONES[4].center.x, 52, ZONES[4].center.z - 20);
    this.group.add(this.banner);
    this.bannerMat = m;
    this.disposables.push(g, m);
  }

  /* ---------------- interaction helpers ---------------- */
  lightDiyasNear(pos: THREE.Vector3, radius: number, max = 3): number {
    let lit = 0;
    const r2 = radius * radius;
    for (let i = 0; i < this.diyaPositions.length; i++) {
      if (this.diyaTarget[i] > 0.5) continue;
      if (this.diyaPositions[i].distanceToSquared(pos) < r2) {
        this.diyaTarget[i] = 1;
        lit++;
        if (lit >= max) break;
      }
    }
    this.diyasLit = this.diyaTarget.reduce((a, b) => a + (b > 0.5 ? 1 : 0), 0);
    return lit;
  }

  lightAllInZone(zoneIndex: number) {
    const c = ZONES[zoneIndex].center;
    let n = 0;
    for (let i = 0; i < this.diyaPositions.length; i++) {
      if (Math.abs(this.diyaPositions[i].x - c.x) < 45 && this.diyaTarget[i] < 0.5) {
        this.diyaTarget[i] = 1;
        n++;
      }
    }
    this.diyasLit = this.diyaTarget.reduce((a, b) => a + (b > 0.5 ? 1 : 0), 0);
    return n;
  }

  resetDiyas() {
    this.diyaTarget.fill(0);
    this.diyasLit = 0;
  }

  /* ---------------- per-frame ---------------- */
  update(dt: number, time: number, camera: THREE.Camera, activeZone: number) {
    for (const m of this.mats) m.uniforms.uTime.value = time;
    this.ledMat.uniforms.uTime.value = time;
    this.ledMat.uniforms.uChase.value = this.ledSpeed;
    this.motesMat.uniforms.uTime.value = time;
    this.starMat.uniforms.uTime.value = time;
    this.footMat.uniforms.uTime.value = time;

    // diya flame ignition easing
    const litF = this.flames.geometry.getAttribute("aLit") as THREE.InstancedBufferAttribute;
    const litG = this.glows.geometry.getAttribute("aLit") as THREE.InstancedBufferAttribute;
    const fa = litF.array as Float32Array;
    const ga = litG.array as Float32Array;
    let changed = false;
    for (let i = 0; i < fa.length; i++) {
      const t = this.diyaTarget[i];
      if (Math.abs(fa[i] - t) > 0.002) {
        fa[i] += (t - fa[i]) * Math.min(1, dt * 4.5);
        ga[i] = fa[i];
        changed = true;
      }
    }
    if (changed) { litF.needsUpdate = true; litG.needsUpdate = true; }

    // pools of lamplight on the polished courtyard
    for (let i = 0; i < fa.length; i++) {
      const p = this.diyaPositions[i];
      this.dummy.position.set(p.x, 0.035, p.z);
      this.dummy.rotation.set(-Math.PI / 2, 0, 0);
      this.dummy.scale.setScalar(Math.max(0.0001, fa[i] * (4.6 + Math.sin(time * 3 + i) * 0.25)));
      this.dummy.updateMatrix();
      this.halos.setMatrixAt(i, this.dummy.matrix);
    }
    this.halos.instanceMatrix.needsUpdate = true;

    // lanterns
    const lg = this.lanternGlows.geometry.getAttribute("aLit") as THREE.InstancedBufferAttribute;
    const la = lg.array as Float32Array;
    for (let i = 0; i < this.lanternStates.length; i++) {
      const s = this.lanternStates[i];
      if (s.ambient) {
        s.p.addScaledVector(s.v, dt);
        s.p.x += Math.sin(time * 0.3 + s.phase) * dt * 0.6;
        if (s.p.y > 78) s.p.y = 2;
      } else if (s.life > 0) {
        s.p.addScaledVector(s.v, dt);
        s.v.y = Math.min(3.2, s.v.y + dt * 0.25);
        s.p.x += Math.sin(time * 0.5 + s.phase) * dt * 0.8;
        if (s.p.y > 86) { s.life = 0; s.p.y = -60; }
      }
      const visible = s.ambient || s.life > 0;
      this.dummy.position.copy(s.p);
      this.dummy.rotation.set(Math.sin(time * 0.4 + s.phase) * 0.06, time * 0.1 + s.phase, Math.cos(time * 0.33 + s.phase) * 0.06);
      this.dummy.scale.setScalar(visible ? s.scale : 0.0001);
      this.dummy.updateMatrix();
      this.lanterns.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.set(s.p.x, s.p.y - 0.4, s.p.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(visible ? s.scale * 3.6 : 0.0001);
      this.dummy.updateMatrix();
      this.lanternGlows.setMatrixAt(i, this.dummy.matrix);
      la[i] = visible ? 1 : 0;
    }
    this.lanterns.instanceMatrix.needsUpdate = true;
    this.lanternGlows.instanceMatrix.needsUpdate = true;
    lg.needsUpdate = true;

    // floating diyas
    let anyFloat = false;
    for (let i = 0; i < this.floatStates.length; i++) {
      const s = this.floatStates[i];
      if (s.active) {
        anyFloat = true;
        s.p.y += s.v * dt;
        s.p.x += Math.sin(time * 0.6 + s.phase) * dt * 0.7;
        if (s.p.y > 46) { s.p.y = 46; s.v = 0; }
      }
      this.dummy.position.copy(s.p);
      this.dummy.rotation.set(0, time * 0.2 + s.phase, 0);
      this.dummy.scale.setScalar(s.active ? 1 : 0.0001);
      this.dummy.updateMatrix();
      this.floatingDiyas.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.set(s.p.x, s.p.y + 0.55, s.p.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(s.active ? 0.7 : 0.0001, s.active ? 1.1 : 0.0001, 1);
      this.dummy.updateMatrix();
      this.floatingFlames.setMatrixAt(i, this.dummy.matrix);
    }
    if (anyFloat) {
      this.floatingDiyas.instanceMatrix.needsUpdate = true;
      this.floatingFlames.instanceMatrix.needsUpdate = true;
    }

    // rangoli plate slow spin + banner
    this.rangoliSpin += dt * 0.03;
    this.rangoliMesh.rotation.z = this.rangoliSpin;
    const targetBanner = this.finaleT > 0 ? 0 : activeZone === 4 ? 0.34 : 0;
    this.bannerMat.opacity += (targetBanner - this.bannerMat.opacity) * Math.min(1, dt * 1.6);
    this.banner.position.y = 52 + Math.sin(time * 0.6) * 0.8;
    this.banner.quaternion.copy(camera.quaternion);

    // zone light breathing
    this.zoneLights.forEach((l, i) => {
      const boost = i === activeZone ? 1 : 0.45;
      l.intensity = (130 + Math.sin(time * 1.6 + i) * 22) * boost * (1 + this.finaleT * 0.9);
    });
  }

  setFinale(t: number) {
    this.finaleT = t;
  }

  get rangoliRotation() {
    return this.rangoliSpin;
  }

  setPointScale(v: number) {
    this.ledMat.uniforms.uScale.value = v;
    this.motesMat.uniforms.uScale.value = v;
    this.starMat.uniforms.uScale.value = v;
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.mats.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.rangoli.texture.dispose();
  }
}
