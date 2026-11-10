import React from "react";
import { cn } from "../utils/cn";
import {
  IconDiya, IconRocket, IconMandala, IconLantern, IconCrown, IconVolume, IconCam,
  IconExpand, IconHelp, IconReset, IconDice, IconDownload, IconTrash, IconOrbit,
  GestureGlyph, Slider, Toggle, Select, ActionButton, SectionTitle, Stat, type GlyphName,
} from "./ui";
import type { Settings, Stats, Quality } from "../three/engine";
import type { TrackerMetrics } from "../lib/handTracker";
import { PALETTES } from "../three/fireworks";

export const ZONE_META = [
  { name: "Diya Garden", hindi: "दीप वाटिका", Icon: IconDiya, accent: "#ffb020" },
  { name: "Fireworks Arena", hindi: "आतिशबाज़ी", Icon: IconRocket, accent: "#ff2e88" },
  { name: "Rangoli Studio", hindi: "रंगोली", Icon: IconMandala, accent: "#22e0c8" },
  { name: "Sky Lanterns", hindi: "आकाश दीप", Icon: IconLantern, accent: "#ff7a18" },
  { name: "Grand Celebration", hindi: "महोत्सव", Icon: IconCrown, accent: "#b44cff" },
];

export const GESTURES: { key: GlyphName; name: string; hindi: string; desc: string; fallback: string }[] = [
  { key: "wave", name: "Finger Wave", hindi: "लहर", desc: "Sparkling light trail follows your fingertip", fallback: "Move the pointer" },
  { key: "snap", name: "Snap", hindi: "चुटकी", desc: "Thumb + middle flick detonates a firecracker", fallback: "Press S" },
  { key: "pinch", name: "Pinch & Release", hindi: "चिमटी", desc: "Grab a rocket, drag it up, let go to launch", fallback: "Drag the pointer" },
  { key: "open", name: "Open Palm", hindi: "हथेली", desc: "Volley of fireworks · lanterns · light every diya", fallback: "Spacebar" },
  { key: "fist", name: "Fist Charge", hindi: "मुट्ठी", desc: "Hold to charge, open to detonate a mega burst", fallback: "Hold C" },
  { key: "swipe", name: "Swipe L / R", hindi: "स्वाइप", desc: "Travel between the five celebration zones", fallback: "← / →" },
  { key: "finale", name: "Both Palms", hindi: "दोनों हाथ", desc: "Hold both palms open for the grand finale", fallback: "Press F" },
];

/* ------------------------------- top bar ------------------------------- */
export function TopBar({
  zone, muted, volume, onMute, onVolume, camStatus, onCamera, onFullscreen, onHelp, fps,
  orbitMode, onOrbitMode, handsLive,
}: {
  zone: number; muted: boolean; volume: number; onMute: () => void; onVolume: (v: number) => void;
  camStatus: string; onCamera: () => void; onFullscreen: () => void; onHelp: () => void; fps: number;
  orbitMode: boolean; onOrbitMode: () => void; handsLive: boolean;
}) {
  const live = camStatus === "ready";
  return (
    <header className="pointer-events-auto fixed inset-x-0 top-0 z-30 flex items-center gap-3 px-3 sm:px-5 h-[58px] glass-soft border-x-0 border-t-0">
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400/25 to-rose-600/20 border border-amber-300/30">
          <IconDiya className="h-5 w-5 text-amber-300 flame-flicker" />
          <span className="absolute inset-0 rounded-xl shadow-[0_0_22px_-4px_rgba(255,170,60,.9)]" />
        </span>
        <div className="leading-none">
          <h1 className="font-display text-[14px] sm:text-[16px] tracking-[0.2em] gold-text">DIWALI UNIVERSE</h1>
          <p className="hidden sm:block text-[9px] tracking-[0.3em] uppercase text-amber-100/40 mt-1">Celebrate with your hands</p>
        </div>
      </div>

      <div className="hidden md:flex flex-1 items-center justify-center gap-3 min-w-0">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-300/40" />
        <div key={zone} className="anim-in text-center min-w-0">
          <div className="font-display text-[13px] tracking-[0.22em] text-amber-100 truncate">{ZONE_META[zone].name.toUpperCase()}</div>
          <div className="font-deva text-[11px] text-amber-200/50 leading-tight">{ZONE_META[zone].hindi}</div>
        </div>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-300/40" />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="hidden lg:flex items-center gap-1 rounded-full bg-black/30 border border-white/10 px-2 py-1 text-[10px] tabular-nums text-emerald-300/80">
          <span className={cn("h-1.5 w-1.5 rounded-full", fps > 45 ? "bg-emerald-400" : fps > 26 ? "bg-amber-400" : "bg-rose-400")} />
          {fps} FPS
        </span>

        <div className="flex items-center gap-1.5 rounded-full bg-black/30 border border-amber-200/15 pl-1 pr-2.5 py-1">
          <button
            onClick={onMute} title={muted ? "Unmute everything" : "Mute everything"}
            className={cn("grid h-7 w-7 place-items-center rounded-full transition-colors",
              muted ? "text-rose-300 hover:bg-rose-400/15" : "text-amber-300 hover:bg-amber-300/15")}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            <IconVolume className="h-4 w-4" off={muted} />
          </button>
          <input
            type="range" className="fx w-14 sm:w-20" min={0} max={1} step={0.01} value={muted ? 0 : volume}
            onChange={(e) => onVolume(parseFloat(e.target.value))}
            style={{ ["--fx-p" as string]: `${(muted ? 0 : volume) * 100}%` }}
            aria-label="Volume"
          />
        </div>

        <button
          onClick={onCamera}
          className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all",
            live ? "border-emerald-300/40 bg-emerald-400/12 text-emerald-200" : "border-amber-200/25 bg-white/5 text-amber-100/80 hover:bg-white/12")}
          title={live ? "Turn hand tracking off" : "Enable hand tracking"}
        >
          <IconCam className="h-4 w-4" off={!live} />
          <span className="hidden sm:inline">{live ? "Hands live" : "Hands off"}</span>
        </button>

        {!handsLive && (
          <button
            onClick={onOrbitMode}
            title={orbitMode ? "Drag now orbits the camera" : "Drag now celebrates"}
            className={cn("hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all",
              orbitMode ? "border-teal-300/45 bg-teal-400/12 text-teal-200" : "border-white/12 bg-white/5 text-amber-100/70 hover:bg-white/12")}
          >
            <IconOrbit className="h-3.5 w-3.5" />
            {orbitMode ? "Orbit" : "Play"}
          </button>
        )}

        <button onClick={onHelp} title="Gesture guide" className="grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-white/5 text-amber-100/75 hover:bg-white/12 transition-colors">
          <IconHelp className="h-4 w-4" />
        </button>
        <button onClick={onFullscreen} title="Fullscreen" className="hidden sm:grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-white/5 text-amber-100/75 hover:bg-white/12 transition-colors">
          <IconExpand className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

/* ------------------------------- zone rail ------------------------------- */
export function ZoneRail({ zone, onZone, compact, embedded }: { zone: number; onZone: (i: number) => void; compact?: boolean; embedded?: boolean }) {
  if (compact) {
    return (
      <div className="pointer-events-auto fixed top-[58px] inset-x-0 z-20 flex gap-1.5 overflow-x-auto scroll-festival px-3 py-2">
        {ZONE_META.map((z, i) => (
          <button
            key={z.name} onClick={() => onZone(i)}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-semibold tracking-wide transition-all",
              i === zone ? "border-amber-300/60 bg-gradient-to-r from-amber-400/25 to-pink-500/15 text-amber-100" : "border-white/10 bg-black/35 text-amber-100/55")}
          >
            <span style={{ color: i === zone ? z.accent : undefined }}><z.Icon className="h-3.5 w-3.5" /></span>
            {z.name}
          </button>
        ))}
      </div>
    );
  }
  return (
    <nav className={cn("pointer-events-auto", embedded ? "w-full shrink-0" : "fixed left-4 top-1/2 z-20 hidden -translate-y-1/2 lg:block w-[214px]")}>
      <div className="glass rounded-2xl p-2.5">
        <div className="flex items-center gap-2 px-1.5 pb-2">
          <span className="h-[5px] w-[5px] rotate-45 bg-gradient-to-br from-amber-300 to-pink-500" />
          <h2 className="font-display text-[10px] tracking-[0.28em] uppercase text-amber-200/80">Celebration Zones</h2>
        </div>
        <div className="space-y-1">
          {ZONE_META.map((z, i) => (
            <button
              key={z.name} onClick={() => onZone(i)}
              className={cn(
                "group relative flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-300",
                i === zone
                  ? "border-amber-300/45 bg-gradient-to-r from-amber-400/18 via-orange-500/10 to-transparent"
                  : "border-transparent hover:border-white/12 hover:bg-white/5"
              )}
            >
              {i === zone && <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-gradient-to-b from-amber-300 to-pink-500 shadow-[0_0_10px_rgba(255,180,60,.9)]" />}
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors"
                style={{
                  borderColor: i === zone ? `${z.accent}66` : "rgba(255,255,255,.1)",
                  background: i === zone ? `${z.accent}1f` : "rgba(255,255,255,.03)",
                  color: i === zone ? z.accent : "rgba(255,235,200,.5)",
                }}>
                <z.Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className={cn("block truncate text-[12px] font-semibold", i === zone ? "text-amber-50" : "text-amber-50/65")}>{z.name}</span>
                <span className="font-deva block text-[10px] text-amber-200/40 leading-tight">{z.hindi}</span>
              </span>
              <span className="ml-auto text-[9px] tabular-nums text-amber-100/25">{i + 1}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 px-1.5 text-[9.5px] leading-relaxed text-amber-100/35">
          Swipe an open hand left or right to travel. Drag to orbit · scroll to zoom.
        </p>
      </div>
    </nav>
  );
}

/* ------------------------------- console ------------------------------- */
export function Console({
  s, set, stats, onReset, onRandomize, onSnapshot, onRangoliClear, onRangoliExport, className,
  musicOn, onMusic,
}: {
  s: Settings; set: <K extends keyof Settings>(k: K, v: Settings[K]) => void; stats: Stats;
  onReset: () => void; onRandomize: () => void; onSnapshot: () => void;
  onRangoliClear: () => void; onRangoliExport: () => void; className?: string;
  musicOn: boolean; onMusic: (v: boolean) => void;
}) {
  return (
    <aside className={cn("pointer-events-auto glass rounded-2xl flex flex-col overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <IconOrbit className="h-4 w-4 text-amber-300 spin-slow" />
        <h2 className="font-display text-[11px] tracking-[0.26em] uppercase text-amber-200/90">Celebration Console</h2>
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-3 pb-2">
        <Stat label="Particles" value={stats.particles.toLocaleString()} />
        <Stat label="Diyas lit" value={`${stats.diyasLit}/${stats.diyaTotal}`} tone="teal" />
        <Stat label="Lanterns" value={stats.lanterns} tone="pink" />
      </div>

      <div className="flex-1 overflow-y-auto scroll-festival px-3 pb-3 space-y-3">
        <div>
          <SectionTitle>Fireworks</SectionTitle>
          <div className="space-y-2">
            <Slider label="Particle density" value={s.density} min={0.3} max={2} onChange={(v) => set("density", v)} format={(v) => `${v.toFixed(2)}×`} />
            <Slider label="Burst scale" value={s.scale} min={0.5} max={2.4} onChange={(v) => set("scale", v)} format={(v) => `${v.toFixed(2)}×`} />
            <Slider label="Gravity" value={s.gravity} min={0.15} max={2} onChange={(v) => set("gravity", v)} format={(v) => `${v.toFixed(2)} g`} />
            <Slider label="Trail persistence" value={s.trails} min={0} max={1.6} onChange={(v) => set("trails", v)} format={(v) => `${Math.round(v * 62)}%`} accent={["#22e0c8", "#ffc857"]} />
            <Select
              label="Colour palette" value={s.palette}
              options={PALETTES.map((p, i) => ({ value: i, label: `${p.name} · ${p.hindi}` }))}
              onChange={(v) => set("palette", v)}
            />
            <div className="flex gap-1 pt-0.5">
              {PALETTES[s.palette].colors.map((c) => (
                <span key={c} className="h-3 flex-1 rounded-sm" style={{ background: c, boxShadow: `0 0 10px -2px ${c}` }} />
              ))}
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Atmosphere</SectionTitle>
          <div className="space-y-2">
            <Slider label="Wind" value={s.wind} min={-1} max={1} onChange={(v) => set("wind", v)} format={(v) => (v === 0 ? "calm" : `${v > 0 ? "→" : "←"} ${Math.abs(v).toFixed(2)}`)} accent={["#4aa8ff", "#22e0c8"]} />
            <Slider label="Turbulence" value={s.turbulence} min={0} max={1.4} onChange={(v) => set("turbulence", v)} accent={["#8b5cf6", "#ff2e88"]} />
            <Slider label="Bloom / glow" value={s.bloom} min={0} max={2.4} onChange={(v) => set("bloom", v)} />
            <Slider label="Exposure" value={s.exposure} min={0.5} max={1.8} onChange={(v) => set("exposure", v)} />
            <Slider label="LED chase speed" value={s.ledSpeed} min={0} max={3} onChange={(v) => set("ledSpeed", v)} format={(v) => `${v.toFixed(1)}×`} accent={["#35d07f", "#ffc857"]} />
            <Toggle label="Festive music" hint="Tanpura · santoor · tabla" checked={musicOn} onChange={onMusic} />
          </div>
        </div>

        <div>
          <SectionTitle>Camera &amp; Render</SectionTitle>
          <div className="space-y-2">
            <Slider label="Orbit distance" value={s.distance} min={0.45} max={2.2} onChange={(v) => set("distance", v)} format={(v) => `${v.toFixed(2)}×`} accent={["#4aa8ff", "#8b5cf6"]} />
            <Slider label="Camera elevation" value={s.elevation} min={-0.8} max={1.2} onChange={(v) => set("elevation", v)} format={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`} accent={["#4aa8ff", "#8b5cf6"]} />
            <Toggle label="Auto orbit" hint="Slow cinematic drift" checked={s.autoOrbit} onChange={(v) => set("autoOrbit", v)} />
            <Select
              label="Quality" value={s.quality}
              options={[
                { value: "cinematic" as Quality, label: "Cinematic · full resolution" },
                { value: "balanced" as Quality, label: "Balanced" },
                { value: "performance" as Quality, label: "Performance" },
              ]}
              onChange={(v) => set("quality", v)}
            />
          </div>
        </div>

        <div>
          <SectionTitle right={<span className="text-[9px] text-teal-300/70">{stats.zone === 2 ? "LIVE" : "idle"}</span>}>Rangoli Studio</SectionTitle>
          <div className="space-y-2">
            <Select
              label="Symmetry" value={s.symmetry}
              options={[4, 6, 8, 12, 16].map((n) => ({ value: n, label: `${n}-fold` }))}
              onChange={(v) => set("symmetry", v)}
            />
            <Slider label="Brush width" value={s.brush} min={2} max={22} step={1} onChange={(v) => set("brush", v)} format={(v) => `${v.toFixed(0)} px`} accent={["#22e0c8", "#ff2e88"]} />
            <Toggle label="Cycle colours" hint="New hue on every stroke" checked={s.autoColor} onChange={(v) => set("autoColor", v)} />
            <div className="flex gap-1.5 pt-0.5">
              <ActionButton onClick={onRangoliClear} icon={<IconTrash className="h-3.5 w-3.5" />} tone="danger">Clear</ActionButton>
              <ActionButton onClick={onRangoliExport} icon={<IconDownload className="h-3.5 w-3.5" />} tone="gold">SVG</ActionButton>
            </div>
          </div>
        </div>

        <div className="hair pt-2.5">
          <div className="flex gap-1.5">
            <ActionButton onClick={onReset} icon={<IconReset className="h-3.5 w-3.5" />}>Reset</ActionButton>
            <ActionButton onClick={onRandomize} icon={<IconDice className="h-3.5 w-3.5" />}>Shuffle</ActionButton>
            <ActionButton onClick={onSnapshot} icon={<IconDownload className="h-3.5 w-3.5" />} tone="gold">PNG</ActionButton>
          </div>
          <p className="mt-2 text-[9.5px] leading-relaxed text-amber-100/30">
            Every control is live — the sky re-renders as you drag. {stats.drawCalls} draw calls · {stats.rockets} rockets in flight.
          </p>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------- camera pod ------------------------------- */
export function CameraPod({
  metrics, previewRef, hands, onStart, onStop, onRecalibrate, compact,
}: {
  metrics: TrackerMetrics;
  previewRef: React.RefObject<HTMLCanvasElement | null>;
  hands: { present: boolean; gesture: string; charge: number }[];
  onStart: () => void; onStop: () => void; onRecalibrate: () => void; compact?: boolean;
}) {
  const live = metrics.status === "ready";
  const busy = metrics.status === "requesting" || metrics.status === "loading";
  const failed = metrics.status === "denied" || metrics.status === "error" || metrics.status === "unsupported";
  const tone = live ? (metrics.calibrated ? "#35d07f" : "#ffb020") : failed ? "#ff5a5a" : "#ffc857";

  return (
    <div className={cn("pointer-events-auto glass rounded-2xl overflow-hidden", compact ? "w-[168px]" : "w-[248px]")}>
      <div className="relative bg-black/60" style={{ aspectRatio: "4 / 3" }}>
        <canvas ref={previewRef} width={320} height={240} className={cn("h-full w-full object-cover transition-opacity", live ? "opacity-100" : "opacity-0")} />
        {!live && (
          <div className="absolute inset-0 grid place-items-center px-3 text-center">
            {busy ? (
              <div className="space-y-2">
                <div className="mx-auto h-6 w-6 rounded-full border-2 border-amber-300/25 border-t-amber-300 animate-spin" />
                <p className="text-[10px] text-amber-100/70">{metrics.message}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <IconCam className="mx-auto h-6 w-6 text-amber-200/45" off />
                <p className="text-[10px] leading-snug text-amber-100/55">{failed ? metrics.message : "Camera off — pointer mode active"}</p>
                <button
                  onClick={onStart}
                  className="rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-400/25 to-pink-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100 hover:from-amber-400/40 transition-all"
                >
                  {failed ? "Retry camera" : "Enable hands"}
                </button>
              </div>
            )}
          </div>
        )}
        {live && (
          <>
            <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: tone }} />
              <span className="text-[8.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: tone }}>
                {metrics.calibrated ? "Locked" : "Calibrating"}
              </span>
            </div>
            <div className="absolute right-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[8.5px] tabular-nums text-amber-100/70">
              {metrics.detectFps} hz
            </div>
            {!metrics.calibrated && (
              <div className="absolute inset-x-0 bottom-0">
                <div className="h-[3px] bg-black/50">
                  <div className="h-full bg-gradient-to-r from-amber-300 to-pink-500 transition-[width] duration-150" style={{ width: `${metrics.progress * 100}%` }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-2.5 py-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {[0, 1].map((i) => {
            const h = hands[i];
            return (
              <div key={i} className={cn("flex-1 rounded-lg border px-1.5 py-1 transition-colors",
                h?.present ? "border-amber-300/35 bg-amber-400/10" : "border-white/8 bg-black/25")}>
                <div className="text-[8px] uppercase tracking-[0.16em] text-amber-100/40">{i === 0 ? "Hand A" : "Hand B"}</div>
                <div className={cn("truncate text-[10.5px] font-semibold capitalize", h?.present ? "text-amber-100" : "text-amber-100/25")}>
                  {h?.present ? h.gesture : "—"}
                </div>
                {!!h?.charge && (
                  <div className="mt-0.5 h-[2px] rounded-full bg-black/40">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-500" style={{ width: `${h.charge * 100}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!compact && (
          <p className="text-[9.5px] leading-snug text-amber-100/40">
            {live
              ? metrics.calibrated
                ? metrics.brightness < 0.18
                  ? "A little dark — add light in front of you for sharper tracking."
                  : "Tracking locked. Keep your hands inside the frame."
                : "Hold one open hand steady in frame to calibrate."
              : "Your camera never leaves this device — all tracking runs locally."}
          </p>
        )}
        <div className="flex gap-1.5">
          {live ? (
            <>
              <button onClick={onRecalibrate} className="flex-1 rounded-md border border-white/12 bg-white/5 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-amber-100/70 hover:bg-white/12 transition-colors">Recalibrate</button>
              <button onClick={onStop} className="rounded-md border border-rose-300/25 bg-rose-500/10 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-rose-200/80 hover:bg-rose-500/20 transition-colors">Off</button>
            </>
          ) : (
            <button onClick={onStart} disabled={busy} className="flex-1 rounded-md border border-amber-300/30 bg-amber-400/12 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-amber-100/85 hover:bg-amber-400/22 disabled:opacity-40 transition-colors">
              {busy ? "Starting…" : "Start hand tracking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- gesture bar ------------------------------- */
export function GestureBar({ active, handsLive, className }: { active: string | null; handsLive: boolean; className?: string }) {
  const [hover, setHover] = React.useState<GlyphName | null>(null);
  const shown = GESTURES.find((g) => g.key === hover);
  return (
    <div className={cn("pointer-events-auto", className)}>
      <div className="glass rounded-2xl px-2 py-2">
        <div className="flex items-stretch gap-1 overflow-x-auto scroll-festival">
          {GESTURES.map((g) => {
            const on = active === g.key;
            return (
              <button
                key={g.key}
                onMouseEnter={() => setHover(g.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(g.key)}
                onBlur={() => setHover(null)}
                className={cn(
                  "group relative flex min-w-[74px] flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-1.5 transition-all duration-200",
                  on ? "border-amber-300/70 bg-gradient-to-b from-amber-400/30 to-pink-500/15 scale-[1.04]" : "border-white/8 bg-black/20 hover:bg-white/6"
                )}
              >
                <GestureGlyph name={g.key} className={cn("h-6 w-6 transition-colors", on ? "text-amber-200" : "text-amber-100/50 group-hover:text-amber-100/80")} />
                <span className={cn("text-[9px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap", on ? "text-amber-100" : "text-amber-100/45")}>{g.name}</span>
                {on && <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-amber-300 shadow-[0_0_8px_rgba(255,200,80,1)]" />}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-2 px-1 min-h-[14px]">
          {shown ? (
            <p className="text-center text-[10px] text-amber-100/60">
              <span className="font-deva text-amber-200/80">{shown.hindi}</span> · {shown.desc}
              {!handsLive && <span className="text-teal-300/70"> · fallback: {shown.fallback}</span>}
            </p>
          ) : (
            <p className="text-center text-[10px] text-amber-100/35">
              {handsLive ? "Your hands are the controller — hover a glyph to recall a gesture." : "Pointer mode · drag to celebrate, Shift-drag to orbit, Space for a volley, F for the finale."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
