import React, { useRef, useState, useEffect } from "react";
import { Universe, DEFAULTS, type Settings, type Stats, type Toast } from "./three/engine";
import { ZONES } from "./three/world";
import { HandTracker, type TrackerMetrics } from "./lib/handTracker";
import { audio } from "./lib/audio";
import { TopBar, ZoneRail, Console, CameraPod, GestureBar } from "./components/panels";
import { Intro, HelpOverlay, Toasts, FinaleOverlay, ZoneCaption } from "./components/overlays";
import { IconOrbit, IconSpark } from "./components/ui";
import { cn } from "./utils/cn";

const EMPTY_STATS: Stats = {
  fps: 60, particles: 0, rockets: 0, diyasLit: 0, diyaTotal: 0,
  lanterns: 0, zone: 0, finale: false, hands: 0, drawCalls: 0,
};

const GESTURE_PRIORITY = ["snap", "fist", "pinch", "open", "wave", "point"];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Universe | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const toastTimers = useRef<number[]>([]);

  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS });
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [zone, setZone] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [musicOn, setMusicOn] = useState(true);
  const [orbitMode, setOrbitMode] = useState(false);
  const [handsLive, setHandsLive] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [handInfo, setHandInfo] = useState([
    { present: false, gesture: "none", charge: 0 },
    { present: false, gesture: "none", charge: 0 },
  ]);
  const [metrics, setMetrics] = useState<TrackerMetrics>({
    status: "idle", message: "Camera is off", hands: 0, brightness: 0.5,
    handScale: 0, detectFps: 0, calibrated: false, progress: 0,
  });

  /* ------------------------------ boot ------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: Universe;
    try {
      engine = new Universe(canvas);
    } catch (err) {
      console.error(err);
      setBootError("WebGL could not start on this device. Try a different browser or enable hardware acceleration.");
      return;
    }
    engineRef.current = engine;
    const tracker = new HandTracker(engine.gestures);
    trackerRef.current = tracker;
    tracker.attachPreview(previewRef.current);
    tracker.onMetrics = (m) => setMetrics(m);
    engine.tick = (now, dt) => tracker.tick(now, dt);

    engine.onStats = (s) => setStats(s);
    engine.onZone = (z) => {
      setZone(z);
      setFlash("swipe");
      window.setTimeout(() => setFlash((f) => (f === "swipe" ? null : f)), 800);
    };
    engine.onToast = (t) => {
      setToasts((prev) => [...prev.slice(-2), t]);
      const id = window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 2850);
      toastTimers.current.push(id);
      if (toastTimers.current.length > 40) toastTimers.current.splice(0, 20);
    };
    engine.start();
    setBooted(true);

    const poll = window.setInterval(() => {
      const hs = engine.handStates;
      setHandInfo((prev) => {
        const next = hs.map((h) => ({
          present: h.present,
          gesture: h.gesture,
          charge: Math.round(h.charge * 20) / 20,
        }));
        if (
          prev.length === next.length &&
          next.every((n, i) => n.present === prev[i].present && n.gesture === prev[i].gesture && n.charge === prev[i].charge)
        ) return prev;
        return next;
      });
    }, 90);

    const onVis = () => {
      if (document.hidden) engine.stop();
      else engine.start();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(poll);
      toastTimers.current.forEach((t) => window.clearTimeout(t));
      toastTimers.current = [];
      tracker.stop();
      engine.dispose();
      engineRef.current = null;
      trackerRef.current = null;
    };
  }, []);

  useEffect(() => {
    trackerRef.current?.attachPreview(previewRef.current);
  }, [booted, showIntro]);

  /* ------------------------------ audio ------------------------------ */
  const wakeAudio = React.useCallback(async () => {
    await audio.init();
    audio.setMuted(muted);
    audio.setVolume(volume);
    audio.setMusic(musicOn);
    audio.startMusic();
  }, [muted, volume, musicOn]);

  /* ------------------------------ actions ------------------------------ */
  const set = React.useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [k]: v }));
    engineRef.current?.update(k, v);
  }, []);

  const startHands = React.useCallback(async () => {
    await wakeAudio();
    const tracker = trackerRef.current;
    const engine = engineRef.current;
    if (!tracker || !engine) return;
    await tracker.start();
    if (tracker.status === "ready") {
      engine.handsActive = true;
      setHandsLive(true);
      setShowIntro(false);
      engine.toast("Hand tracking live", "हाथ तैयार · show an open palm", "cyan");
    }
  }, [wakeAudio]);

  const stopHands = React.useCallback(() => {
    trackerRef.current?.stop();
    const e = engineRef.current;
    if (e) {
      e.handsActive = false;
      e.gestures.reset();
      e.toast("Pointer mode", "माउस · drag to celebrate", "cyan");
    }
    setHandsLive(false);
    setHandInfo([{ present: false, gesture: "none", charge: 0 }, { present: false, gesture: "none", charge: 0 }]);
  }, []);

  const enterPointer = React.useCallback(async () => {
    await wakeAudio();
    setShowIntro(false);
    engineRef.current?.toast("Pointer mode", "ड्रैग करें · Space, S, C, F", "cyan");
  }, [wakeAudio]);

  const download = (href: string, name: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onSnapshot = React.useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    try {
      download(e.snapshot(), `diwali-universe-${Date.now()}.png`);
      e.toast("Frame captured", "तस्वीर · saved as PNG", "gold");
    } catch {
      e.toast("Capture blocked", "browser refused the export", "magenta");
    }
  }, []);

  const onRangoliExport = React.useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    const svg = e.world.rangoli.toSVG();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    download(url, `rangoli-${Date.now()}.svg`);
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    e.toast("Rangoli exported", "रंगोली · vector SVG", "cyan");
  }, []);

  const onRangoliClear = React.useCallback(() => {
    engineRef.current?.world.rangoli.clear();
    engineRef.current?.toast("Rangoli cleared", "कोरी रंगोली · a fresh plate", "cyan");
    audio.ui();
  }, []);

  const activeGesture = React.useMemo(() => {
    if (stats.finale) return "finale";
    if (flash) return flash;
    const present = handInfo.filter((h) => h.present).map((h) => h.gesture);
    for (const g of GESTURE_PRIORITY) if (present.includes(g)) return g === "point" ? "wave" : g;
    return null;
  }, [handInfo, flash, stats.finale]);

  const goZone = React.useCallback((i: number) => {
    engineRef.current?.setZone(i);
    audio.ui();
  }, []);

  const consoleProps = {
    s: settings, set, stats,
    onReset: () => { engineRef.current?.reset(); audio.ui(); },
    onRandomize: () => {
      const e = engineRef.current;
      if (!e) return;
      e.randomize();
      setSettings({ ...e.settings });
    },
    onSnapshot, onRangoliClear, onRangoliExport,
    musicOn, onMusic: (v: boolean) => { setMusicOn(v); audio.setMusic(v); },
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#04030b] grain">
      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      </div>

      {/* cinematic vignette + horizon warmth */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(120%_85%_at_50%_45%,transparent_38%,rgba(4,3,11,.55)_82%,rgba(4,3,11,.9)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[#04030b]/80 to-transparent" />

      {bootError && (
        <div className="absolute inset-0 z-50 grid place-items-center p-6">
          <div className="glass max-w-md rounded-2xl p-6 text-center">
            <h2 className="font-display text-xl gold-text">The lamps need WebGL</h2>
            <p className="mt-2 text-sm text-amber-100/70">{bootError}</p>
          </div>
        </div>
      )}

      <TopBar
        zone={zone}
        muted={muted}
        volume={volume}
        onMute={() => { const m = !muted; setMuted(m); audio.setMuted(m); if (!m) void wakeAudio(); }}
        onVolume={(v) => { setVolume(v); audio.setVolume(v); if (muted && v > 0) { setMuted(false); audio.setMuted(false); } }}
        camStatus={metrics.status}
        onCamera={() => (handsLive ? stopHands() : void startHands())}
        onFullscreen={() => {
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen?.().catch(() => {});
        }}
        onHelp={() => { setShowHelp(true); audio.ui(); }}
        fps={stats.fps}
        orbitMode={orbitMode}
        onOrbitMode={() => {
          const v = !orbitMode;
          setOrbitMode(v);
          if (engineRef.current) engineRef.current.forceOrbit = v;
          audio.ui();
        }}
        handsLive={handsLive}
      />

      {/* ---------- desktop left column ---------- */}
      <div className="pointer-events-none fixed left-4 top-[70px] bottom-4 z-20 hidden w-[248px] flex-col gap-3 overflow-y-auto scroll-festival lg:flex">
        <ZoneRail zone={zone} onZone={goZone} embedded />
        <div className="flex-1 min-h-2" />
        <div className="px-1"><ZoneCaption zone={zone} blurb={ZONES[zone].blurb} /></div>
        <CameraPod
          metrics={metrics}
          previewRef={previewRef}
          hands={handInfo}
          onStart={() => void startHands()}
          onStop={stopHands}
          onRecalibrate={() => { trackerRef.current?.recalibrate(); audio.ui(); }}
        />
      </div>

      {/* ---------- desktop console ---------- */}
      <Console {...consoleProps} className="fixed right-4 top-[70px] bottom-4 z-20 hidden w-[300px] lg:flex" />

      {/* ---------- desktop gesture bar ---------- */}
      <GestureBar
        active={activeGesture}
        handsLive={handsLive}
        className="fixed bottom-4 left-1/2 z-20 hidden w-[min(760px,calc(100vw-620px))] -translate-x-1/2 lg:block"
      />

      {/* ---------- mobile / tablet ---------- */}
      <div className="lg:hidden">
        <ZoneRail zone={zone} onZone={goZone} compact />
        <div className="pointer-events-none fixed right-2 top-[106px] z-20">
          <CameraPod
            metrics={metrics}
            previewRef={previewRef}
            hands={handInfo}
            onStart={() => void startHands()}
            onStop={stopHands}
            onRecalibrate={() => trackerRef.current?.recalibrate()}
            compact
          />
        </div>
        <div className={cn("pointer-events-none fixed left-3 top-[112px] z-20 max-w-[46vw] transition-opacity duration-500", stats.finale && "opacity-0")}>
          <ZoneCaption zone={zone} blurb={ZONES[zone].blurb} />
        </div>
        <GestureBar
          active={activeGesture}
          handsLive={handsLive}
          className="fixed inset-x-2 bottom-[calc(30vh+14px)] z-20"
        />
        <Console {...consoleProps} className="fixed inset-x-2 bottom-2 z-20 h-[30vh] min-h-[186px]" />
      </div>

      {/* ---------- celebration nudge ---------- */}
      {!showIntro && !showHelp && (
        <div className="pointer-events-none fixed left-1/2 top-[calc(50%-10px)] z-20 hidden -translate-x-1/2 lg:block">
          {stats.hands === 0 && handsLive && (
            <div className="anim-in flex items-center gap-2 rounded-full glass px-4 py-2 pulse-ring">
              <IconSpark className="h-4 w-4 text-amber-300" />
              <span className="text-[11.5px] text-amber-100/75">Raise a hand into the camera frame to begin</span>
            </div>
          )}
        </div>
      )}

      <FinaleOverlay active={stats.finale} />
      <Toasts items={toasts} />

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} handsLive={handsLive} />}
      {showIntro && !bootError && <Intro metrics={metrics} onHands={() => void startHands()} onPointer={() => void enterPointer()} />}

      {/* orbit hint chip */}
      {!showIntro && (
        <button
          onClick={() => {
            const v = !orbitMode;
            setOrbitMode(v);
            if (engineRef.current) engineRef.current.forceOrbit = v;
            audio.ui();
          }}
          className={cn(
            "pointer-events-auto fixed z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all lg:hidden",
            "left-3 bottom-[calc(30vh+112px)]",
            orbitMode ? "border-teal-300/50 bg-teal-400/15 text-teal-200" : "border-white/12 bg-black/40 text-amber-100/70"
          )}
        >
          <IconOrbit className="h-3.5 w-3.5" />
          {orbitMode ? "Orbiting" : "Celebrating"}
        </button>
      )}
    </div>
  );
}
