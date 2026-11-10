import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { GestureEngine, HAND_EDGES, type Landmark } from "./gestures";

export type TrackerStatus =
  | "idle"
  | "requesting"
  | "loading"
  | "ready"
  | "denied"
  | "error"
  | "unsupported";

export interface TrackerMetrics {
  status: TrackerStatus;
  message: string;
  hands: number;
  brightness: number;
  handScale: number;
  detectFps: number;
  calibrated: boolean;
  progress: number;
}

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export class HandTracker {
  video: HTMLVideoElement;
  status: TrackerStatus = "idle";
  message = "Camera is off";
  gestures: GestureEngine;
  onMetrics?: (m: TrackerMetrics) => void;

  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private lastVideoTime = -1;
  private lastDetect = 0;
  private preview: HTMLCanvasElement | null = null;
  private probe: HTMLCanvasElement;
  private probeCtx: CanvasRenderingContext2D;
  private lastProbe = 0;
  private brightness = 0.5;
  private handScale = 0;
  private heldSince = 0;
  private calibrated = false;
  private frames = 0;
  private fpsAcc = 0;
  private detectFps = 0;
  private lastMetric = 0;
  private starting = false;
  private stopped = false;

  constructor(gestures: GestureEngine) {
    this.gestures = gestures;
    this.video = document.createElement("video");
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.setAttribute("playsinline", "true");
    this.probe = document.createElement("canvas");
    this.probe.width = 32;
    this.probe.height = 24;
    this.probeCtx = this.probe.getContext("2d", { willReadFrequently: true })!;
  }

  attachPreview(c: HTMLCanvasElement | null) {
    this.preview = c;
  }

  async start() {
    if (this.starting || this.status === "ready") return;
    this.starting = true;
    this.stopped = false;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        this.fail("unsupported", "This browser has no camera API. Pointer mode is ready.");
        return;
      }
      this.set("requesting", "Waiting for camera permission…");
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user", frameRate: { ideal: 30 } },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play().catch(() => {});
      this.set("loading", "Loading hand-tracking model…");
      const fileset = await FilesetResolver.forVisionTasks(WASM);
      let lm: HandLandmarker;
      try {
        lm = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch {
        lm = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
      }
      if (this.stopped) { lm.close(); return; }
      this.landmarker = lm;
      this.set("ready", "Show your hand to the camera");
    } catch (err) {
      const e = err as DOMException;
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
        this.fail("denied", "Camera permission was declined. You can still celebrate with the pointer.");
      } else if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") {
        this.fail("unsupported", "No camera found on this device. Pointer mode is ready.");
      } else {
        this.fail("error", "Hand tracking could not start (network or device issue). Pointer mode is ready.");
      }
    } finally {
      this.starting = false;
    }
  }

  private fail(status: TrackerStatus, message: string) {
    this.set(status, message);
    this.stopStream();
  }

  private set(status: TrackerStatus, message: string) {
    this.status = status;
    this.message = message;
    this.emit(true);
  }

  stop() {
    this.stopped = true;
    this.landmarker?.close();
    this.landmarker = null;
    this.stopStream();
    this.gestures.reset();
    this.calibrated = false;
    this.heldSince = 0;
    this.set("idle", "Camera is off");
  }

  private stopStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  recalibrate() {
    this.calibrated = false;
    this.heldSince = 0;
    this.emit(true);
  }

  /** Called from the single render loop. */
  tick(now: number, dt: number) {
    if (this.status !== "ready" || !this.landmarker) return;
    if (this.video.readyState < 2) return;
    if (now - this.lastDetect < 28) return;
    const d = (now - this.lastDetect) / 1000;
    this.lastDetect = now;
    if (this.video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = this.video.currentTime;

    let result;
    try {
      result = this.landmarker.detectForVideo(this.video, now);
    } catch {
      return;
    }
    const landmarks = (result?.landmarks ?? []) as Landmark[][];
    const labels = (result?.handedness ?? result?.handednesses ?? []).map(
      (h: { categoryName?: string; displayName?: string }[]) => h?.[0]?.categoryName ?? h?.[0]?.displayName ?? ""
    );
    this.gestures.update(landmarks, labels, now, d);

    this.frames++;
    this.fpsAcc += d;
    if (this.fpsAcc > 0.5) {
      this.detectFps = this.frames / this.fpsAcc;
      this.frames = 0;
      this.fpsAcc = 0;
    }

    const n = this.gestures.hands.filter((h) => h.present).length;
    this.handScale = n ? Math.max(...this.gestures.hands.map((h) => (h.present ? h.size : 0))) : 0;

    if (now - this.lastProbe > 600) {
      this.lastProbe = now;
      try {
        this.probeCtx.drawImage(this.video, 0, 0, 32, 24);
        const px = this.probeCtx.getImageData(0, 0, 32, 24).data;
        let sum = 0;
        for (let i = 0; i < px.length; i += 4) sum += (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114);
        this.brightness = sum / (px.length / 4) / 255;
      } catch {
        /* tainted canvas — ignore */
      }
    }

    if (!this.calibrated) {
      if (n > 0 && this.handScale > 0.07) {
        if (!this.heldSince) this.heldSince = now;
        if (now - this.heldSince > 1200) {
          this.calibrated = true;
          this.message = "Tracking locked — celebrate!";
        }
      } else this.heldSince = 0;
    }

    this.drawPreview();
    if (now - this.lastMetric > 160) {
      this.lastMetric = now;
      this.emit(false);
    }
    void dt;
  }

  private drawPreview() {
    const c = this.preview;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    try {
      ctx.drawImage(this.video, 0, 0, w, h);
    } catch {
      /* frame not ready */
    }
    ctx.restore();
    ctx.fillStyle = "rgba(8,6,22,0.35)";
    ctx.fillRect(0, 0, w, h);

    for (let hi = 0; hi < 2; hi++) {
      const hand = this.gestures.hands[hi];
      if (!hand.present || hand.landmarks.length < 21) continue;
      const col = hi === 0 ? "#ffcf5c" : "#ff5cc8";
      const pts = hand.landmarks;
      ctx.lineWidth = 2;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (const [a, b] of HAND_EDGES) {
        ctx.moveTo(pts[a].x * w, pts[a].y * h);
        ctx.lineTo(pts[b].x * w, pts[b].y * h);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      for (let i = 0; i < pts.length; i++) {
        const tip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
        ctx.beginPath();
        ctx.fillStyle = tip ? "#fff6dd" : col;
        ctx.arc(pts[i].x * w, pts[i].y * h, tip ? 3.6 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // fingertip reticle
      const t = pts[8];
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(t.x * w, t.y * h, 9 + Math.sin(performance.now() / 180) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private emit(force: boolean) {
    if (!this.onMetrics) return;
    const n = this.gestures.hands.filter((h) => h.present).length;
    const progress = this.calibrated
      ? 1
      : this.heldSince
      ? Math.min(0.99, (performance.now() - this.heldSince) / 1200)
      : 0;
    this.onMetrics({
      status: this.status,
      message: this.message,
      hands: n,
      brightness: this.brightness,
      handScale: this.handScale,
      detectFps: Math.round(this.detectFps),
      calibrated: this.calibrated,
      progress,
    });
    void force;
  }
}
