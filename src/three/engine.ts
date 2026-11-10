import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { World, ZONES } from "./world";
import { Fireworks, PALETTES, SHAPES, type Shape } from "./fireworks";
import { GestureEngine, type HandState } from "../lib/gestures";
import { audio } from "../lib/audio";
import { sparkTexture } from "../lib/textures";

export type Quality = "cinematic" | "balanced" | "performance";

export interface Settings {
  density: number;
  scale: number;
  gravity: number;
  trails: number;
  wind: number;
  turbulence: number;
  palette: number;
  bloom: number;
  exposure: number;
  quality: Quality;
  autoOrbit: boolean;
  distance: number;
  elevation: number;
  ledSpeed: number;
  symmetry: number;
  brush: number;
  autoColor: boolean;
}

export const DEFAULTS: Settings = {
  density: 1,
  scale: 1,
  gravity: 1,
  trails: 1,
  wind: 0.1,
  turbulence: 0.4,
  palette: 0,
  bloom: 0.85,
  exposure: 0.95,
  quality: "cinematic",
  autoOrbit: true,
  distance: 1,
  elevation: 0,
  ledSpeed: 1,
  symmetry: 8,
  brush: 7,
  autoColor: true,
};

export interface Stats {
  fps: number;
  particles: number;
  rockets: number;
  diyasLit: number;
  diyaTotal: number;
  lanterns: number;
  zone: number;
  finale: boolean;
  hands: number;
  drawCalls: number;
}

export interface Toast {
  id: number;
  text: string;
  sub?: string;
  tone: "gold" | "magenta" | "cyan";
}

interface Cursor {
  group: THREE.Group;
  orb: THREE.Mesh;
  halo: THREE.Mesh;
  ring: THREE.Mesh;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  prev: THREE.Vector3;
  vel: THREE.Vector3;
  active: boolean;
  color: THREE.Color;
  held: boolean;
  heldShape: Shape;
}

const QUALITY_RATIO: Record<Quality, number> = { cinematic: 2, balanced: 1.4, performance: 1 };
const QUALITY_MULT: Record<Quality, number> = { cinematic: 1, balanced: 0.72, performance: 0.45 };

export class Universe {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  world: World;
  fw: Fireworks;
  gestures = new GestureEngine();
  settings: Settings = { ...DEFAULTS };
  zone = 0;
  running = false;
  handsActive = false;
  pointerMode = true;
  forceOrbit = false;

  onStats?: (s: Stats) => void;
  onToast?: (t: Toast) => void;
  onZone?: (z: number) => void;
  onGesture?: () => void;
  tick?: (now: number, dt: number) => void;

  private canvas: HTMLCanvasElement;
  private clock = new THREE.Clock();
  private raf = 0;
  private time = 0;
  private azimuth = 0.0;
  private azimuthTarget = 0.0;
  private polar = 1.16;
  private polarTarget = 1.16;
  private dist = 60;
  private distTarget = 60;
  private focus = new THREE.Vector3();
  private focusTarget = new THREE.Vector3();
  private plane = new THREE.Plane();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.35);
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private cursors: Cursor[] = [];
  private fpsAcc = 0;
  private fpsFrames = 0;
  private statAcc = 0;
  private toastId = 1;
  private finaleTimer = 0;
  private lastDiyaSound = 0;
  private lastWaveSound = 0;
  private lastChargeTick = 0;
  private dragging: false | "orbit" | "play" = false;
  private lastPointer = { x: 0, y: 0 };
  private pointerNdc = new THREE.Vector2(0, 0);
  private pointerDown = false;
  private shiftDown = false;
  private ro?: ResizeObserver;
  private tmpV = new THREE.Vector3();
  private tmpV2 = new THREE.Vector3();
  private cursorTex: THREE.Texture;
  private disposed = false;
  private keyChargeStart = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false, powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor(0x03030a, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.settings.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 2200);
    this.scene.fog = new THREE.FogExp2(0x070512, 0.0019);

    this.world = new World();
    this.scene.add(this.world.group);
    this.fw = new Fireworks(this.camera, 1);
    this.scene.add(this.fw.group);
    this.fw.onBurst = (pos, power) => {
      this.shake = Math.min(1.2, this.shake + power * 0.12);
      void pos;
    };

    this.cursorTex = sparkTexture();
    for (let i = 0; i < 2; i++) this.cursors.push(this.makeCursor(i));

    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), this.settings.bloom, 0.52, 0.78);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.setZone(0, true);
    this.focus.copy(this.focusTarget);
    this.dist = this.distTarget;
    this.polar = this.polarTarget;
    this.applyQuality();
    this.resize();
    this.bindEvents();
    // opening salute so the sky is alive on the very first frame
    this.fw.schedule(0.6, () => this.fw.volley(ZONES[0].center, 5, 34));
  }

  private shake = 0;

  /* ------------------------------ cursors ------------------------------ */
  private makeCursor(i: number): Cursor {
    const color = new THREE.Color(i === 0 ? "#ffcf5c" : "#ff5cc8");
    const g = new THREE.Group();
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshBasicMaterial({ map: this.cursorTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.055, 8, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })
    );
    g.add(halo, orb, ring);
    g.visible = false;
    g.renderOrder = 10;
    this.scene.add(g);
    return {
      group: g, orb, halo, ring,
      pos: new THREE.Vector3(), target: new THREE.Vector3(), prev: new THREE.Vector3(),
      vel: new THREE.Vector3(), active: false, color, held: false, heldShape: "peony",
    };
  }

  /* ------------------------------ events ------------------------------ */
  private bindEvents() {
    const c = this.canvas;
    c.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    c.addEventListener("wheel", this.onWheel, { passive: false });
    c.addEventListener("contextmenu", this.onContext);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(c.parentElement ?? c);
  }

  private onContext = (e: Event) => e.preventDefault();

  private onPointerDown = (e: PointerEvent) => {
    this.lastPointer = { x: e.clientX, y: e.clientY };
    const orbit = this.forceOrbit || this.handsActive || e.button === 2 || e.shiftKey || this.shiftDown;
    this.dragging = orbit ? "orbit" : "play";
    if (!orbit) {
      this.pointerDown = true;
      this.updatePointerNdc(e);
      this.pointerPinchStart();
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    this.updatePointerNdc(e);
    if (this.dragging === "orbit") {
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.azimuthTarget -= dx * 0.005;
      this.polarTarget = THREE.MathUtils.clamp(this.polarTarget - dy * 0.004, 0.28, 1.46);
      this.lastPointer = { x: e.clientX, y: e.clientY };
    } else if (this.dragging === "play") {
      this.lastPointer = { x: e.clientX, y: e.clientY };
    }
  };

  private onPointerUp = () => {
    if (this.dragging === "play" && this.pointerDown) this.pointerPinchEnd();
    this.pointerDown = false;
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.settings.distance = THREE.MathUtils.clamp(this.settings.distance * (1 + Math.sign(e.deltaY) * 0.09), 0.45, 2.2);
    this.computeCameraTargets();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Shift") this.shiftDown = true;
    if (this.handsActive) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.code === "Space") { e.preventDefault(); this.openPalm(0); }
    if (e.key === "f" || e.key === "F") this.triggerFinale("keyboard");
    if (e.key === "s" || e.key === "S") this.snap(0);
    if (e.key === "c" || e.key === "C") { if (!this.keyChargeStart) this.keyChargeStart = performance.now(); }
    if (e.key === "ArrowRight") this.setZone((this.zone + 1) % ZONES.length);
    if (e.key === "ArrowLeft") this.setZone((this.zone + ZONES.length - 1) % ZONES.length);
    if (e.key >= "1" && e.key <= "5") this.setZone(Number(e.key) - 1);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Shift") this.shiftDown = false;
    if ((e.key === "c" || e.key === "C") && this.keyChargeStart) {
      const charge = Math.min(1, (performance.now() - this.keyChargeStart) / 1700);
      this.keyChargeStart = 0;
      this.megaRelease(0, charge);
    }
  };

  private updatePointerNdc(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.pointerNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  }

  private pointerPinchStart() {
    this.pinchStart(0);
  }
  private pointerPinchEnd() {
    this.pinchEnd(0);
  }

  /* ------------------------------ sizing ------------------------------ */
  resize() {
    const parent = this.canvas.parentElement;
    const w = Math.max(1, parent?.clientWidth ?? window.innerWidth);
    const h = Math.max(1, parent?.clientHeight ?? window.innerHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, QUALITY_RATIO[this.settings.quality]);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const pointScale = (h * ratio) / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    this.fw.setScaleUniform(pointScale);
    this.world.setPointScale(pointScale);
    const bloomDiv = this.settings.quality === "performance" ? 3 : this.settings.quality === "balanced" ? 2 : 1.6;
    this.bloom.resolution.set(Math.max(64, (w * ratio) / bloomDiv), Math.max(64, (h * ratio) / bloomDiv));
  }

  private applyQuality() {
    this.fw.setQuality(QUALITY_MULT[this.settings.quality]);
    this.resize();
  }

  update<K extends keyof Settings>(key: K, value: Settings[K]) {
    this.settings[key] = value;
    const s = this.settings;
    this.fw.settings.density = s.density;
    this.fw.settings.scale = s.scale;
    this.fw.settings.gravity = s.gravity;
    this.fw.settings.trails = s.trails;
    this.fw.settings.wind = s.wind;
    this.fw.settings.turbulence = s.turbulence;
    this.fw.settings.palette = s.palette;
    this.bloom.strength = s.bloom;
    this.renderer.toneMappingExposure = s.exposure;
    this.world.rangoli.symmetry = s.symmetry;
    this.world.rangoli.brush = s.brush;
    this.world.rangoli.autoColor = s.autoColor;
    this.world.ledSpeed = s.ledSpeed;
    if (key === "quality") this.applyQuality();
    if (key === "distance" || key === "elevation") this.computeCameraTargets();
  }

  /* ------------------------------ camera ------------------------------ */
  private computeCameraTargets() {
    const z = ZONES[this.zone];
    this.focusTarget.set(z.center.x, z.targetY, z.center.z);
    this.distTarget = z.distance * this.settings.distance;
    this.polarTarget = THREE.MathUtils.clamp(z.polar - this.settings.elevation * 0.5, 0.28, 1.46);
  }

  setZone(i: number, silent = false) {
    this.zone = ((i % ZONES.length) + ZONES.length) % ZONES.length;
    this.computeCameraTargets();
    this.polarTarget = THREE.MathUtils.clamp(ZONES[this.zone].polar - this.settings.elevation * 0.5, 0.28, 1.46);
    this.onZone?.(this.zone);
    if (!silent) {
      audio.swipe(1);
      this.toast(ZONES[this.zone].name, ZONES[this.zone].hindi, "cyan");
    }
    this.world.rangoli.endStroke();
  }

  toast(text: string, sub?: string, tone: Toast["tone"] = "gold") {
    this.onToast?.({ id: this.toastId++, text, sub, tone });
  }

  /* ------------------------------ mapping ------------------------------ */
  private mapToWorld(nx: number, ny: number, out: THREE.Vector3, useGround: boolean) {
    this.ndc.set(THREE.MathUtils.clamp(nx * 2 - 1, -1.35, 1.35), THREE.MathUtils.clamp(-(ny * 2 - 1), -1.35, 1.35));
    this.ray.setFromCamera(this.ndc, this.camera);
    if (useGround) {
      const hit = this.ray.ray.intersectPlane(this.ground, out);
      if (hit) {
        const c = ZONES[this.zone].center;
        const dx = out.x - c.x;
        const dz = out.z - c.z;
        const d = Math.hypot(dx, dz);
        const maxR = this.zone === 2 ? 16.4 : 34;
        if (d > maxR) {
          out.x = c.x + (dx / d) * maxR;
          out.z = c.z + (dz / d) * maxR;
        }
        if (out.distanceTo(this.camera.position) < 260) return out;
      }
    }
    this.ray.ray.intersectPlane(this.plane, out);
    if (!Number.isFinite(out.x)) out.copy(this.focus);
    return out;
  }

  /* ------------------------------ actions ------------------------------ */
  private cursorPos(i: number) {
    return this.cursors[i].pos;
  }

  snap(hand: number) {
    const p = this.cursorPos(hand).clone();
    const shape = SHAPES[(Math.random() * SHAPES.length) | 0];
    if (p.y < 4) p.y = 6 + Math.random() * 6;
    this.fw.burst(p, shape, undefined, 0.7 + Math.random() * 0.5);
    if (Math.random() > 0.55) this.fw.chakri(new THREE.Vector3(p.x, 0.2, p.z));
    this.toast("Snap!", "फुलझड़ी · firecracker burst", "magenta");
    this.onGesture?.();
  }

  openPalm(hand: number) {
    const z = this.zone;
    const c = ZONES[z].center;
    const p = this.cursorPos(hand);
    if (z === 0) {
      const n = this.world.lightAllInZone(0);
      if (n) audio.diya();
      this.fw.volley(new THREE.Vector3(c.x, 0, c.z), 5, 30);
      this.toast(`${n} diyas kindled`, "दीप जले · the garden glows", "gold");
    } else if (z === 2) {
      this.stampRangoli();
      this.fw.volley(new THREE.Vector3(c.x, 0, c.z), 6, 30);
      this.toast("Rangoli bloom", "रंगोली · symmetry stamped", "magenta");
    } else if (z === 3) {
      const n = this.world.releaseLanterns(new THREE.Vector3(p.x, 6, p.z), 16);
      audio.lantern();
      this.fw.volley(new THREE.Vector3(c.x, 0, c.z), 5, 34);
      this.toast(`${n} lanterns released`, "आकाश दीप · let them drift", "gold");
    } else {
      this.fw.volley(new THREE.Vector3(c.x, 0, c.z), z === 4 ? 12 : 9, 40);
      this.fw.goldenRain(c, 2.4);
      this.toast("Open palm volley", "खुली हथेली · sky salute", "gold");
    }
    this.onGesture?.();
  }

  megaRelease(hand: number, charge: number) {
    const p = this.cursorPos(hand);
    const c = ZONES[this.zone].center;
    this.fw.mega(new THREE.Vector3(p.x || c.x, 0, p.z || c.z), charge);
    this.toast(charge > 0.85 ? "MEGA DETONATION" : "Charged burst", `शक्ति ${Math.round(charge * 100)}% · fist released`, "magenta");
    this.onGesture?.();
  }

  pinchStart(hand: number) {
    const cur = this.cursors[hand];
    cur.held = true;
    cur.heldShape = SHAPES[(Math.random() * SHAPES.length) | 0];
    if (this.zone === 0) {
      const n = this.world.lightDiyasNear(cur.pos, 4.2, 1);
      if (n) { audio.diya(); this.toast("Diya lit", "दीप · one more flame", "gold"); }
    } else if (this.zone === 2) {
      this.world.rangoli.hue++;
      audio.ui();
    } else if (this.zone === 3) {
      this.world.releaseLanterns(cur.pos, 1);
      audio.lantern();
    }
    this.onGesture?.();
  }

  pinchEnd(hand: number) {
    const cur = this.cursors[hand];
    if (!cur.held) return;
    cur.held = false;
    if (this.zone === 0 || this.zone === 2) return;
    const c = ZONES[this.zone].center;
    const x = THREE.MathUtils.clamp(cur.pos.x, c.x - 45, c.x + 45);
    const z = THREE.MathUtils.clamp(cur.pos.z, c.z - 32, c.z + 32);
    const height = THREE.MathUtils.clamp(cur.pos.y + Math.max(0, cur.vel.y) * 0.35, 14, 62);
    this.fw.rocket(x, z, height, cur.heldShape, undefined, 0.9 + Math.min(1.2, Math.abs(cur.vel.y) * 0.03));
    this.toast("Rocket away", `${cur.heldShape} · pinch-launch`, "cyan");
  }

  stampRangoli() {
    const r = this.world.rangoli;
    r.beginStroke();
    const base = Math.random() * 0.4 + 0.25;
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2;
      const rad = base + Math.sin(t * 5) * 0.22;
      r.paint(Math.cos(t) * rad, Math.sin(t) * rad);
    }
    r.endStroke();
    audio.sparkle(9);
  }

  triggerFinale(source: string) {
    if (this.fw.finaleActive) return;
    if (this.zone !== 4) this.setZone(4, true);
    const c = ZONES[4].center;
    this.fw.grandFinale(c);
    this.world.launchFloatingDiyas(c);
    this.world.lightAllInZone(4);
    this.world.releaseLanterns(new THREE.Vector3(c.x, 4, c.z), 26);
    this.finaleTimer = 18;
    audio.explode(2, 0.4);
    this.toast("GRAND FINALE", source === "hands" ? "दोनों हथेलियाँ · the universe answers" : "शुभ दीपावली · grand celebration", "gold");
    this.onGesture?.();
  }

  reset() {
    this.fw.clear();
    this.world.resetDiyas();
    this.world.rangoli.clear();
    this.finaleTimer = 0;
    this.world.setFinale(0);
    this.toast("Universe reset", "फिर से · a fresh night", "cyan");
  }

  randomize() {
    const p = (Math.random() * PALETTES.length) | 0;
    this.update("palette", p);
    this.update("scale", 0.7 + Math.random() * 1.1);
    this.update("gravity", 0.5 + Math.random() * 1.1);
    this.update("turbulence", Math.random() * 1.1);
    this.update("wind", (Math.random() - 0.5) * 1.2);
    this.update("trails", 0.4 + Math.random() * 1.1);
    this.toast("Randomised", PALETTES[p].name, "magenta");
    audio.ui();
  }

  snapshot(): string {
    this.composer.render();
    return this.renderer.domElement.toDataURL("image/png");
  }

  /* ------------------------------ loop ------------------------------ */
  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    const now = performance.now();

    this.tick?.(now, dt);
    this.handleHands(dt, now);
    this.handleFinale(dt);
    this.updateCamera(dt);

    this.world.update(dt, this.time, this.camera, this.zone);
    this.fw.update(dt, this.time);

    // ambient life so the sky is never empty
    this.ambientAcc += dt;
    const interval = this.zone === 1 || this.zone === 4 ? 1.3 : 2.2;
    if (this.ambientAcc > interval && !this.fw.finaleActive) {
      this.ambientAcc = 0;
      const c = ZONES[this.zone].center;
      this.fw.rocket(c.x + (Math.random() - 0.5) * 70, c.z + (Math.random() - 0.5) * 40 - 10, 19 + Math.random() * 24, undefined, undefined, 0.75 + Math.random() * 0.5);
    }

    this.composer.render();

    this.fpsAcc += dt;
    this.fpsFrames++;
    this.statAcc += dt;
    if (this.statAcc > 0.25) {
      const fps = this.fpsFrames / Math.max(0.001, this.fpsAcc);
      this.onStats?.({
        fps: Math.round(fps),
        particles: this.fw.particleCount,
        rockets: this.fw.liveRockets,
        diyasLit: this.world.diyasLit,
        diyaTotal: this.world.diyaPositions.length,
        lanterns: this.world.lanternsReleased,
        zone: this.zone,
        finale: this.fw.finaleActive,
        hands: (this.gestures.hands[0].present ? 1 : 0) + (this.gestures.hands[1].present ? 1 : 0),
        drawCalls: this.renderer.info.render.calls,
      });
      this.statAcc = 0;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
  }

  private ambientAcc = 0;

  private handleFinale(dt: number) {
    if (this.finaleTimer > 0) {
      this.finaleTimer -= dt;
      const t = THREE.MathUtils.clamp(this.finaleTimer / 18, 0, 1);
      this.world.setFinale(Math.sin(t * Math.PI) * 1.0 + 0.2);
      if (this.finaleTimer <= 0) this.world.setFinale(0);
    }
    this.shake = Math.max(0, this.shake - dt * 1.8);
  }

  private updateCamera(dt: number) {
    if (this.settings.autoOrbit && this.dragging !== "orbit") {
      this.azimuthTarget += dt * (this.fw.finaleActive ? 0.14 : 0.035);
    }
    if (this.fw.finaleActive) {
      const t = 1 - Math.max(0, this.finaleTimer) / 18;
      this.distTarget = ZONES[4].distance * this.settings.distance * (1.15 - 0.32 * Math.sin(t * Math.PI));
      this.polarTarget = THREE.MathUtils.clamp(1.22 - Math.sin(t * Math.PI * 1.4) * 0.28 - this.settings.elevation * 0.5, 0.3, 1.45);
    }
    const k = 1 - Math.pow(0.0016, dt);
    this.azimuth += (this.azimuthTarget - this.azimuth) * k;
    this.polar += (this.polarTarget - this.polar) * k;
    this.dist += (this.distTarget - this.dist) * k;
    this.focus.lerp(this.focusTarget, k);

    const sp = Math.sin(this.polar);
    const shakeAmp = this.shake * 0.32;
    this.camera.position.set(
      this.focus.x + Math.sin(this.azimuth) * sp * this.dist + (Math.random() - 0.5) * shakeAmp,
      this.focus.y + Math.cos(this.polar) * this.dist + (Math.random() - 0.5) * shakeAmp,
      this.focus.z + Math.cos(this.azimuth) * sp * this.dist
    );
    this.camera.lookAt(this.focus);
    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this.tmpV);
    this.plane.setFromNormalAndCoplanarPoint(this.tmpV.clone().negate(), this.focus);
  }

  /* ------------------------------ hands ------------------------------ */
  private handleHands(dt: number, now: number) {
    const useGround = this.zone === 0 || this.zone === 2;
    const hands: HandState[] = this.gestures.hands;

    for (let i = 0; i < 2; i++) {
      const cur = this.cursors[i];
      const h = hands[i];
      const isPointer = i === 0 && !this.handsActive && this.pointerMode;
      const present = this.handsActive ? h.present : isPointer;

      if (present) {
        const nx = this.handsActive ? h.index.x : (this.pointerNdc.x + 1) / 2;
        const ny = this.handsActive ? h.index.y : (1 - this.pointerNdc.y) / 2;
        // gentle range expansion so the whole scene is reachable
        const ex = THREE.MathUtils.clamp(0.5 + (nx - 0.5) * 1.28, 0, 1);
        const ey = THREE.MathUtils.clamp(0.5 + (ny - 0.5) * 1.22, 0, 1);
        this.mapToWorld(ex, ey, cur.target, useGround);
        if (!cur.active) {
          cur.pos.copy(cur.target);
          cur.prev.copy(cur.target);
        }
        cur.active = true;
      } else {
        cur.active = false;
        if (cur.held) { cur.held = false; }
      }

      cur.prev.copy(cur.pos);
      cur.pos.lerp(cur.target, 1 - Math.pow(0.0009, dt));
      cur.vel.copy(cur.pos).sub(cur.prev).divideScalar(Math.max(0.001, dt));

      cur.group.visible = cur.active;
      if (!cur.active) continue;
      cur.group.position.copy(cur.pos);
      cur.halo.quaternion.copy(this.camera.quaternion);
      cur.ring.quaternion.copy(this.camera.quaternion);

      const charge = this.handsActive ? h.charge : this.keyChargeStart ? Math.min(1, (now - this.keyChargeStart) / 1700) : 0;
      const pinchAmt = this.handsActive ? h.pinchAmount : this.pointerDown ? 1 : 0;

      const pulse = 1 + Math.sin(this.time * 6) * 0.06;
      const ringScale = (1 + charge * 2.4) * pulse * (1 - pinchAmt * 0.4);
      cur.ring.scale.setScalar(ringScale);
      cur.orb.scale.setScalar(0.7 + pinchAmt * 0.9 + charge * 1.6);
      cur.halo.scale.setScalar((0.7 + charge * 1.6 + pinchAmt * 0.4) * pulse);
      (cur.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + charge * 0.6 + pinchAmt * 0.3;

      // charge vortex
      if (charge > 0.02) {
        const rate = 90 * charge * dt;
        let k = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
        while (k-- > 0) {
          const a = Math.random() * Math.PI * 2;
          const r = 5 + Math.random() * 7;
          const px = cur.pos.x + Math.cos(a) * r;
          const py = cur.pos.y + (Math.random() - 0.5) * r;
          const pz = cur.pos.z + Math.sin(a) * r;
          this.fw.glitter.spawn(
            px, py, pz,
            (cur.pos.x - px) * 2.2, (cur.pos.y - py) * 2.2, (cur.pos.z - pz) * 2.2,
            cur.color.r, cur.color.g, cur.color.b,
            { size: 0.4 + charge * 0.5, life: 0.45, drag: 0.4, gravity: 0, flicker: 0.4 }
          );
        }
        if (now - this.lastChargeTick > 130 - charge * 80) {
          this.lastChargeTick = now;
          audio.chargeTick(charge);
        }
      }

      // held firework while pinching
      if (cur.held && this.zone !== 0 && this.zone !== 2) {
        this.fw.sparkler(cur.pos, dt * 0.35, cur.color);
      }

      // finger wave -> light trail (+ zone specific behaviour)
      const moving = cur.vel.length();
      const waving = this.handsActive ? h.gesture === "wave" || (h.extended[1] && moving > 3) : moving > 6 && !this.pointerDown;
      if (waving || (this.handsActive && h.extended[1] && moving > 1.2)) {
        this.fw.waveTrail(cur.pos, cur.vel, cur.color, dt);
        if (now - this.lastWaveSound > 420 && moving > 8) {
          this.lastWaveSound = now;
          audio.sparkle(3);
        }
      }

      if (this.zone === 0) {
        const n = this.world.lightDiyasNear(cur.pos, 3.4, 2);
        if (n && now - this.lastDiyaSound > 160) {
          this.lastDiyaSound = now;
          audio.diya();
          this.fw.sparkler(cur.pos, 0.12, cur.color);
        }
      }

      if (this.zone === 2) {
        const drawing = this.handsActive ? h.extended[1] && !h.isPinching : this.pointerDown;
        const c = ZONES[2].center;
        const lx = (cur.pos.x - c.x) / 16.4;
        const lz = (cur.pos.z - c.z) / 16.4;
        if (drawing && Math.hypot(lx, lz) <= 1.02) {
          // undo the plate's slow spin so strokes land under the fingertip
          const ang = -this.world.rangoliRotation;
          const rx = lx * Math.cos(ang) - lz * Math.sin(ang);
          const rz = lx * Math.sin(ang) + lz * Math.cos(ang);
          this.world.rangoli.paint(rx, -rz);
          this.fw.waveTrail(cur.pos, cur.vel, cur.color, dt * 0.5);
        } else if (!drawing) {
          this.world.rangoli.endStroke();
        }
      }
    }

    // discrete gesture events
    if (!this.handsActive) return;
    for (const ev of this.gestures.events) {
      switch (ev.type) {
        case "snap": this.snap(ev.hand); break;
        case "open": this.openPalm(ev.hand); break;
        case "pinchStart": this.pinchStart(ev.hand); break;
        case "pinchEnd": this.pinchEnd(ev.hand); break;
        case "fistRelease": this.megaRelease(ev.hand, ev.charge); break;
        case "swipe":
          this.setZone(this.zone + ev.dir);
          break;
        case "finale": this.triggerFinale("hands"); break;
      }
    }
  }

  /* ------------------------------ teardown ------------------------------ */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    const c = this.canvas;
    c.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    c.removeEventListener("wheel", this.onWheel);
    c.removeEventListener("contextmenu", this.onContext);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.ro?.disconnect();
    this.fw.dispose();
    this.world.dispose();
    this.cursors.forEach((cur) => {
      cur.group.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        (m.material as THREE.Material)?.dispose?.();
      });
    });
    this.cursorTex.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }

  /** exposed for the UI gesture read-out */
  get handStates() {
    return this.gestures.hands;
  }
  get finaleProgress() {
    return this.gestures.finaleProgress;
  }
  get keyCharge() {
    return this.keyChargeStart ? Math.min(1, (performance.now() - this.keyChargeStart) / 1700) : 0;
  }
  get tmp() {
    return this.tmpV2;
  }
}
