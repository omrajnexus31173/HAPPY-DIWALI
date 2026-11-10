/* Fully synthesised festive audio: tanpura drone, santoor phrases, tabla,
   ghungroo bells and a family of firework sounds. No external assets. */

type Ctx = AudioContext;

const SCALE = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16]; // Yaman-ish, rooted on D
const ROOT = 62; // D4

function midiToFreq(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export class FestivalAudio {
  ctx: Ctx | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private nextNote = 0;
  private step = 0;
  private droneNodes: AudioNode[] = [];
  muted = false;
  volume = 0.75;
  musicOn = true;
  started = false;

  async init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const AC: typeof AudioContext =
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 26;
    comp.ratio.value = 8;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.5 : 0;
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.95;
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(comp);
    comp.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    await ctx.resume().catch(() => {});
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }
  setVolume(v: number) {
    this.volume = v;
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }
  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.2);
  }

  private env(node: AudioNode, t: number, a: number, d: number, peak: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    node.connect(g);
    return g;
  }

  private noiseSrc(t: number, dur: number) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.5;
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
    return s;
  }

  /* ---------------- SFX ---------------- */

  launch(power = 1) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const src = this.noiseSrc(t, 1.0);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 5;
    bp.frequency.setValueAtTime(420, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.85);
    src.connect(bp);
    const g = this.env(bp, t, 0.05, 0.85, 0.16 * power);
    g.connect(this.sfxBus);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(1500 + power * 400, t + 0.8);
    const og = this.env(osc, t, 0.06, 0.75, 0.05 * power);
    og.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 1.0);
  }

  explode(size = 1, tone = 0.5) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime + 0.005;
    const dur = 0.5 + size * 0.8;
    const src = this.noiseSrc(t, dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2600 + tone * 3200, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + dur);
    src.connect(lp);
    const g = this.env(lp, t, 0.006, dur, Math.min(0.5, 0.2 * size));
    g.connect(this.sfxBus);

    const boom = ctx.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(120 * (1.2 - size * 0.2), t);
    boom.frequency.exponentialRampToValueAtTime(34, t + 0.42);
    const bg = this.env(boom, t, 0.008, 0.5, Math.min(0.55, 0.3 * size));
    bg.connect(this.sfxBus);
    boom.start(t);
    boom.stop(t + 0.7);

    const cracks = Math.round(6 + size * 12);
    for (let i = 0; i < cracks; i++) {
      const ct = t + 0.08 + Math.random() * (0.35 + size * 0.6);
      const cs = this.noiseSrc(ct, 0.05);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 2400 + Math.random() * 3600;
      cs.connect(hp);
      const cg = this.env(hp, ct, 0.002, 0.05, 0.05 * size);
      cg.connect(this.sfxBus);
    }
  }

  sparkle(count = 6) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime;
    for (let i = 0; i < count; i++) {
      const t = t0 + Math.random() * 0.28;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = 1900 + Math.random() * 2800;
      const g = this.env(o, t, 0.003, 0.14, 0.045);
      g.connect(this.sfxBus);
      o.start(t);
      o.stop(t + 0.2);
    }
  }

  diya() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    [880, 1320, 1760].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? "triangle" : "sine";
      o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.01);
      const g = this.env(o, t, 0.006, 1.1 - i * 0.25, 0.09 / (i + 1));
      g.connect(this.sfxBus);
      o.start(t);
      o.stop(t + 1.4);
    });
    const s = this.noiseSrc(t, 0.35);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(280, t + 0.3);
    bp.Q.value = 1.2;
    s.connect(bp);
    const g = this.env(bp, t, 0.02, 0.3, 0.07);
    g.connect(this.sfxBus);
  }

  lantern() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const s = this.noiseSrc(t, 1.1);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.exponentialRampToValueAtTime(1400, t + 0.9);
    s.connect(bp);
    const g = this.env(bp, t, 0.25, 0.8, 0.1);
    g.connect(this.sfxBus);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(330, t);
    o.frequency.linearRampToValueAtTime(660, t + 0.8);
    const og = this.env(o, t, 0.2, 0.7, 0.05);
    og.connect(this.sfxBus);
    o.start(t);
    o.stop(t + 1.2);
  }

  chargeTick(level: number) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 140 + level * 620;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900 + level * 2200;
    o.connect(f);
    const g = this.env(f, t, 0.004, 0.09, 0.05);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.14);
  }

  swipe(dir: number) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const s = this.noiseSrc(t, 0.4);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(dir > 0 ? 500 : 2400, t);
    bp.frequency.exponentialRampToValueAtTime(dir > 0 ? 2400 : 500, t + 0.32);
    s.connect(bp);
    const g = this.env(bp, t, 0.03, 0.32, 0.11);
    g.connect(this.sfxBus);
  }

  ui() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(1200, t);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.06);
    const g = this.env(o, t, 0.003, 0.09, 0.05);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.15);
  }

  /* ---------------- MUSIC ---------------- */

  startMusic() {
    if (!this.ctx || this.started) return;
    this.started = true;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    // Tanpura drone: D2 + A2 + D3 through a slow chorus-ish filter
    [38, 45, 50].forEach((m, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sawtooth";
      o.frequency.value = midiToFreq(m);
      const o2 = ctx.createOscillator();
      o2.type = "sawtooth";
      o2.frequency.value = midiToFreq(m) * 1.003;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 620;
      f.Q.value = 2.2;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + i * 0.03;
      const lg = ctx.createGain();
      lg.gain.value = 260;
      lfo.connect(lg);
      lg.connect(f.frequency);
      lfo.start(t);
      const g = ctx.createGain();
      g.gain.value = 0.0;
      g.gain.linearRampToValueAtTime(0.045 / (i + 1), t + 4);
      o.connect(f);
      o2.connect(f);
      f.connect(g);
      g.connect(this.musicBus);
      o.start(t);
      o2.start(t);
      this.droneNodes.push(o, o2, lfo, g);
    });

    this.nextNote = ctx.currentTime + 0.2;
    this.step = 0;
    this.timer = window.setInterval(() => this.schedule(), 60);
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    const spb = 60 / 82 / 2; // eighth notes @82bpm
    while (this.nextNote < ctx.currentTime + 0.35) {
      this.playStep(this.step, this.nextNote);
      this.step = (this.step + 1) % 32;
      this.nextNote += spb;
    }
  }

  private playStep(step: number, t: number) {
    const ctx = this.ctx!;
    // Santoor / sitar pluck phrase
    const phrase = [0, 2, 3, 4, 6, 4, 3, 2, 0, 3, 4, 6, 7, 6, 4, 3];
    if (step % 2 === 0 || Math.random() > 0.62) {
      const idx = phrase[(step >> 1) % phrase.length] + (Math.random() > 0.85 ? 3 : 0);
      const m = ROOT + SCALE[Math.min(SCALE.length - 1, idx)];
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = midiToFreq(m);
      const o2 = ctx.createOscillator();
      o2.type = "sine";
      o2.frequency.value = midiToFreq(m + 12);
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(4200, t);
      f.frequency.exponentialRampToValueAtTime(900, t + 0.6);
      o.connect(f);
      o2.connect(f);
      const g = this.env(f, t, 0.005, 0.85, 0.075);
      g.connect(this.musicBus);
      o.start(t);
      o2.start(t);
      o.stop(t + 1.1);
      o2.stop(t + 1.1);
    }
    // Tabla-ish: dha on 0/8/16/24, na on offbeats
    if (step % 8 === 0 || step % 8 === 6) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(74, t + 0.16);
      const g = this.env(o, t, 0.003, 0.24, 0.16);
      g.connect(this.musicBus);
      o.start(t);
      o.stop(t + 0.35);
    }
    if (step % 4 === 2) {
      const s = this.noiseSrc(t, 0.09);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1750;
      bp.Q.value = 7;
      s.connect(bp);
      const g = this.env(bp, t, 0.002, 0.09, 0.055);
      g.connect(this.musicBus);
    }
    // Ghungroo bells
    if (step % 2 === 1) {
      for (let i = 0; i < 3; i++) {
        const tt = t + Math.random() * 0.05;
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = 3200 + Math.random() * 2600;
        const g = this.env(o, tt, 0.002, 0.09, 0.016);
        g.connect(this.musicBus);
        o.start(tt);
        o.stop(tt + 0.14);
      }
    }
  }

  dispose() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.droneNodes.forEach((n) => {
      const s = n as OscillatorNode;
      try {
        s.stop?.();
      } catch {
        /* gain node */
      }
      n.disconnect();
    });
    this.droneNodes = [];
    this.started = false;
    this.ctx?.close();
    this.ctx = null;
  }
}

export const audio = new FestivalAudio();
