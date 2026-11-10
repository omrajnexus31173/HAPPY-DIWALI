/* Hand-gesture recognition from MediaPipe hand landmarks.
   Pure logic — no DOM, no React. Deterministic and unit-testable. */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type GestureName =
  | "none"
  | "point"
  | "wave"
  | "pinch"
  | "open"
  | "fist"
  | "snap";

export interface HandState {
  present: boolean;
  label: string;
  landmarks: Landmark[];
  /** mirrored, normalised 0..1 */
  index: { x: number; y: number };
  thumb: { x: number; y: number };
  palm: { x: number; y: number };
  prevIndex: { x: number; y: number };
  vel: { x: number; y: number };
  speed: number;
  extended: boolean[];
  openness: number;
  pinchAmount: number;
  isPinching: boolean;
  gesture: GestureName;
  charge: number;
  size: number;
  lastSeen: number;
}

export type GestureEvent =
  | { type: "snap"; hand: number }
  | { type: "pinchStart"; hand: number }
  | { type: "pinchEnd"; hand: number }
  | { type: "open"; hand: number }
  | { type: "fistRelease"; hand: number; charge: number }
  | { type: "swipe"; dir: -1 | 1 }
  | { type: "finale" };

const TIPS = [4, 8, 12, 16, 20];
const PIPS = [3, 6, 10, 14, 18];
const MCPS = [2, 5, 9, 13, 17];

function dist(a: Landmark | { x: number; y: number }, b: Landmark | { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function emptyHand(label: string): HandState {
  return {
    present: false,
    label,
    landmarks: [],
    index: { x: 0.5, y: 0.5 },
    thumb: { x: 0.5, y: 0.5 },
    palm: { x: 0.5, y: 0.5 },
    prevIndex: { x: 0.5, y: 0.5 },
    vel: { x: 0, y: 0 },
    speed: 0,
    extended: [false, false, false, false, false],
    openness: 0,
    pinchAmount: 0,
    isPinching: false,
    gesture: "none",
    charge: 0,
    size: 0.2,
    lastSeen: 0,
  };
}

interface Track {
  smooth: Landmark[];
  hist: { x: number; y: number; t: number }[];
  midThumbCocked: number;
  pinchOn: boolean;
  wasOpen: boolean;
  openSince: number;
  fistSince: number;
  pendingOpen: number;
  snapFlash: number;
  lastGesture: GestureName;
}

function newTrack(): Track {
  return {
    smooth: [],
    hist: [],
    midThumbCocked: 0,
    pinchOn: false,
    wasOpen: false,
    openSince: 0,
    fistSince: 0,
    pendingOpen: 0,
    snapFlash: 0,
    lastGesture: "none",
  };
}

export class GestureEngine {
  hands: HandState[] = [emptyHand("Right"), emptyHand("Left")];
  private tracks: Record<string, Track> = { Right: newTrack(), Left: newTrack() };
  private lastSwipe = 0;
  private lastFinale = 0;
  private bothOpenSince = 0;
  events: GestureEvent[] = [];
  /** external cooldown scaler, seconds */
  finaleCooldown = 20000;

  reset() {
    this.hands = [emptyHand("Right"), emptyHand("Left")];
    this.tracks = { Right: newTrack(), Left: newTrack() };
    this.bothOpenSince = 0;
    this.events.length = 0;
  }

  /**
   * @param raw   landmark arrays from MediaPipe (unmirrored, 0..1)
   * @param labels handedness labels
   * @param now   ms timestamp
   */
  update(raw: Landmark[][], labels: string[], now: number, dt: number) {
    this.events.length = 0;
    const seen = new Set<string>();

    for (let h = 0; h < raw.length && h < 2; h++) {
      // Mirror x so on-screen motion matches the mirrored preview.
      const lm = raw[h].map((p) => ({ x: 1 - p.x, y: p.y, z: p.z }));
      // Stable slot assignment by handedness, falling back to screen position.
      let label = labels[h] === "Left" ? "Left" : labels[h] === "Right" ? "Right" : "";
      if (!label || seen.has(label)) label = lm[9].x > 0.5 ? "Left" : "Right";
      if (seen.has(label)) label = label === "Left" ? "Right" : "Left";
      seen.add(label);
      const slot = label === "Right" ? 0 : 1;
      const tr = this.tracks[label];
      const st = this.hands[slot];

      // One-euro-ish exponential smoothing keeps fingertips snappy but stable.
      if (tr.smooth.length !== lm.length) tr.smooth = lm.map((p) => ({ ...p }));
      else {
        for (let i = 0; i < lm.length; i++) {
          const speedHint = dist(lm[i], tr.smooth[i]);
          const a = Math.min(0.85, 0.32 + speedHint * 9);
          tr.smooth[i].x += (lm[i].x - tr.smooth[i].x) * a;
          tr.smooth[i].y += (lm[i].y - tr.smooth[i].y) * a;
          tr.smooth[i].z += (lm[i].z - tr.smooth[i].z) * a;
        }
      }
      const s = tr.smooth;
      st.present = true;
      st.lastSeen = now;
      st.label = label;
      st.landmarks = s;
      st.prevIndex = { ...st.index };
      st.index = { x: s[8].x, y: s[8].y };
      st.thumb = { x: s[4].x, y: s[4].y };
      st.palm = { x: (s[0].x + s[5].x + s[17].x) / 3, y: (s[0].y + s[5].y + s[17].y) / 3 };

      const handSize = Math.max(0.04, dist(s[0], s[9]));
      st.size = handSize;

      // Finger extension: tip further from wrist than its PIP joint.
      for (let f = 0; f < 5; f++) {
        const tipD = dist(s[TIPS[f]], s[0]);
        const pipD = dist(s[PIPS[f]], s[0]);
        const mcpD = dist(s[MCPS[f]], s[0]);
        st.extended[f] = f === 0 ? tipD > mcpD * 1.28 : tipD > pipD * 1.06 && tipD > mcpD * 1.15;
      }
      const fourCount = st.extended.slice(1).filter(Boolean).length;
      const spread = (dist(s[8], s[20]) / handSize) * 0.5;
      st.openness = Math.max(0, Math.min(1, fourCount / 4 * 0.72 + Math.min(0.28, spread * 0.34)));
      if (fourCount === 4) st.openness = Math.max(st.openness, 0.9);
      if (fourCount <= 1) st.openness = Math.min(st.openness, 0.3);

      // Pinch with hysteresis
      const pinchD = dist(s[4], s[8]) / handSize;
      st.pinchAmount = Math.max(0, Math.min(1, 1 - (pinchD - 0.25) / 0.75));
      if (!tr.pinchOn && pinchD < 0.42) {
        tr.pinchOn = true;
        this.events.push({ type: "pinchStart", hand: slot });
      } else if (tr.pinchOn && pinchD > 0.62) {
        tr.pinchOn = false;
        this.events.push({ type: "pinchEnd", hand: slot });
      }
      st.isPinching = tr.pinchOn;

      // Snap: thumb + middle pressed then flicked apart quickly
      const midD = dist(s[4], s[12]) / handSize;
      if (midD < 0.42) tr.midThumbCocked = now;
      if (tr.midThumbCocked && midD > 0.85 && now - tr.midThumbCocked < 420) {
        tr.midThumbCocked = 0;
        tr.snapFlash = now;
        this.events.push({ type: "snap", hand: slot });
      }

      // Velocity from a short history window
      tr.hist.push({ x: st.palm.x, y: st.palm.y, t: now });
      while (tr.hist.length > 2 && now - tr.hist[0].t > 260) tr.hist.shift();
      const old = tr.hist[0];
      const span = Math.max(0.016, (now - old.t) / 1000);
      const pvx = (st.palm.x - old.x) / span;
      const pvy = (st.palm.y - old.y) / span;
      const safeDt = Math.max(0.008, dt);
      st.vel = { x: (st.index.x - st.prevIndex.x) / safeDt, y: (st.index.y - st.prevIndex.y) / safeDt };
      st.speed = Math.hypot(st.vel.x, st.vel.y);

      // Open palm rising edge (deferred so a fast swipe wins)
      const isOpen = st.openness > 0.82 && !st.isPinching;
      if (isOpen && !tr.wasOpen) {
        tr.openSince = now;
        tr.pendingOpen = now + 150;
      }
      if (!isOpen) tr.pendingOpen = 0;
      if (tr.pendingOpen && now >= tr.pendingOpen) {
        tr.pendingOpen = 0;
        this.events.push({ type: "open", hand: slot });
      }
      tr.wasOpen = isOpen;

      // Swipe (open hand, strong lateral palm velocity)
      if (
        now - this.lastSwipe > 1150 &&
        st.openness > 0.6 &&
        Math.abs(pvx) > 1.05 &&
        Math.abs(st.palm.x - old.x) > 0.14 &&
        Math.abs(pvx) > Math.abs(pvy) * 1.6
      ) {
        this.lastSwipe = now;
        tr.pendingOpen = 0;
        tr.hist.length = 0;
        this.events.push({ type: "swipe", dir: pvx > 0 ? 1 : -1 });
      }

      // Fist charge
      const isFist = fourCount === 0 && !st.extended[0] && st.openness < 0.28;
      if (isFist) {
        if (!tr.fistSince) tr.fistSince = now;
        st.charge = Math.min(1, (now - tr.fistSince) / 1700);
      } else {
        if (tr.fistSince && st.charge > 0.12) {
          this.events.push({ type: "fistRelease", hand: slot, charge: st.charge });
        }
        tr.fistSince = 0;
        st.charge = 0;
      }

      // Label
      let g: GestureName = "none";
      if (now - tr.snapFlash < 260) g = "snap";
      else if (st.isPinching) g = "pinch";
      else if (isFist) g = "fist";
      else if (isOpen) g = "open";
      else if (st.extended[1] && st.speed > 0.32) g = "wave";
      else if (st.extended[1]) g = "point";
      st.gesture = g;
      tr.lastGesture = g;
    }

    // Mark missing hands as absent and clear their charge state
    for (let i = 0; i < 2; i++) {
      const st = this.hands[i];
      if (!seen.has(st.label) || now - st.lastSeen > 260) {
        if (st.present) {
          st.present = false;
          st.gesture = "none";
          st.charge = 0;
          st.isPinching = false;
          st.openness = 0;
          st.speed = 0;
          const tr = this.tracks[st.label];
          tr.fistSince = 0;
          tr.pinchOn = false;
          tr.wasOpen = false;
          tr.pendingOpen = 0;
          tr.hist.length = 0;
        }
      }
    }

    // Both hands open => grand finale
    const both = this.hands[0].present && this.hands[1].present &&
      this.hands[0].openness > 0.82 && this.hands[1].openness > 0.82;
    if (both) {
      if (!this.bothOpenSince) this.bothOpenSince = now;
      if (now - this.bothOpenSince > 420 && now - this.lastFinale > this.finaleCooldown) {
        this.lastFinale = now;
        this.bothOpenSince = 0;
        this.events.push({ type: "finale" });
      }
    } else this.bothOpenSince = 0;

    return this.events;
  }

  get finaleReady() {
    return performance.now() - this.lastFinale > this.finaleCooldown;
  }
  get finaleProgress() {
    return Math.min(1, (performance.now() - this.lastFinale) / this.finaleCooldown);
  }
}

export const HAND_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
