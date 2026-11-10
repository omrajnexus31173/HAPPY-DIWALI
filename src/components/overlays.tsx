import React from "react";
import { cn } from "../utils/cn";
import { GestureGlyph, IconClose, IconCam, IconDiya, IconSpark, IconCrown } from "./ui";
import { GESTURES, ZONE_META } from "./panels";
import type { Toast } from "../three/engine";
import type { TrackerMetrics } from "../lib/handTracker";

/* --------------------------------- intro --------------------------------- */
export function Intro({
  metrics, onHands, onPointer,
}: { metrics: TrackerMetrics; onHands: () => void; onPointer: () => void }) {
  const busy = metrics.status === "requesting" || metrics.status === "loading";
  const failed = metrics.status === "denied" || metrics.status === "error" || metrics.status === "unsupported";
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-[#04030b]/70 via-[#04030b]/40 to-[#04030b]/85" />
      <div className="relative w-full max-w-[620px] glass rounded-[26px] p-6 sm:p-8 anim-in grain overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,150,40,.35),transparent_65%)] blur-xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,46,136,.28),transparent_65%)] blur-xl" />

        <div className="relative">
          <div className="flex items-center gap-2">
            <IconDiya className="h-5 w-5 text-amber-300 flame-flicker" />
            <span className="font-deva text-[13px] tracking-wide text-amber-200/80">शुभ दीपावली</span>
            <span className="h-px flex-1 bg-gradient-to-r from-amber-300/40 to-transparent" />
          </div>

          <h1 className="mt-3 font-display text-[34px] sm:text-[46px] leading-[1.02] tracking-[0.04em] gold-text">
            Diwali Universe
          </h1>
          <p className="mt-1 font-display text-[13px] sm:text-[15px] tracking-[0.34em] uppercase text-amber-100/60">
            Celebrate with your hands
          </p>

          <p className="mt-4 max-w-[52ch] text-[13px] leading-relaxed text-amber-50/70">
            Five living worlds — a garden of oil lamps, a fireworks arena, a rangoli plate, a sky of
            lanterns and a grand plaza. Your webcam reads 21 points on each hand in real time; every
            flame, rocket and petal of light answers to your fingers. Nothing is uploaded.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { g: "wave" as const, t: "Wave", d: "trails of light" },
              { g: "pinch" as const, t: "Pinch", d: "launch rockets" },
              { g: "finale" as const, t: "Both palms", d: "grand finale" },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border border-amber-200/12 bg-black/25 px-2.5 py-2.5">
                <GestureGlyph name={x.g} className="h-6 w-6 text-amber-300" />
                <div className="mt-1.5 text-[11px] font-semibold text-amber-100">{x.t}</div>
                <div className="text-[10px] text-amber-100/45">{x.d}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onHands} disabled={busy}
              className={cn(
                "group relative flex-1 overflow-hidden rounded-xl border border-amber-300/50 px-5 py-3.5 text-left transition-all duration-300",
                "bg-gradient-to-r from-amber-400/30 via-orange-500/20 to-pink-500/20 hover:from-amber-400/45 hover:border-amber-200/80",
                busy && "opacity-70"
              )}
            >
              <span className="absolute inset-0 shimmer opacity-40" />
              <span className="relative flex items-center gap-3">
                {busy ? (
                  <span className="h-5 w-5 rounded-full border-2 border-amber-200/30 border-t-amber-200 animate-spin" />
                ) : (
                  <IconCam className="h-5 w-5 text-amber-200" />
                )}
                <span>
                  <span className="block text-[13px] font-bold tracking-wide text-amber-50">
                    {busy ? "Waking the hand tracker…" : "Enable hand tracking"}
                  </span>
                  <span className="block text-[10.5px] text-amber-100/60">
                    {busy ? metrics.message : "Allow camera · runs entirely on your device"}
                  </span>
                </span>
              </span>
            </button>
            <button
              onClick={onPointer}
              className="rounded-xl border border-white/14 bg-white/5 px-5 py-3.5 text-left transition-colors hover:bg-white/12 sm:w-[190px]"
            >
              <span className="flex items-center gap-3">
                <IconSpark className="h-5 w-5 text-teal-300" />
                <span>
                  <span className="block text-[13px] font-bold text-amber-50">Pointer mode</span>
                  <span className="block text-[10.5px] text-amber-100/50">No camera needed</span>
                </span>
              </span>
            </button>
          </div>

          {failed && (
            <p className="mt-3 rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100/85">
              {metrics.message}
            </p>
          )}
          <p className="mt-3 text-[10px] text-amber-100/30">
            Best in a lit room, hands 40–80 cm from the lens. All fireworks here are purely virtual light.
          </p>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- help --------------------------------- */
export function HelpOverlay({ onClose, handsLive }: { onClose: () => void; handsLive: boolean }) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-[#04030b]/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[860px] max-h-[86vh] overflow-y-auto scroll-festival glass rounded-3xl p-6 anim-in">
        <div className="flex items-start gap-3">
          <div>
            <h2 className="font-display text-[22px] tracking-[0.16em] gold-text">GESTURE GRIMOIRE</h2>
            <p className="font-deva text-[12px] text-amber-200/55">हाथों की भाषा · seven ways to conduct the sky</p>
          </div>
          <button onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/5 text-amber-100/70 hover:bg-white/15 transition-colors">
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {GESTURES.map((g) => (
            <div key={g.key} className="flex gap-3 rounded-xl border border-amber-200/12 bg-black/25 p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-amber-300/25 bg-amber-400/10">
                <GestureGlyph name={g.key} className="h-6 w-6 text-amber-300" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-[13px] font-bold text-amber-50">{g.name}</h3>
                  <span className="font-deva text-[11px] text-amber-200/50">{g.hindi}</span>
                </div>
                <p className="text-[11.5px] leading-snug text-amber-100/60">{g.desc}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-teal-300/70">Pointer fallback · {g.fallback}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-6 font-display text-[12px] tracking-[0.26em] uppercase text-amber-200/80">The five zones</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ZONE_META.map((z, i) => (
            <div key={z.name} className="rounded-xl border border-white/10 bg-black/25 p-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${z.accent}1f`, color: z.accent }}>
                <z.Icon className="h-4 w-4" />
              </span>
              <div className="mt-2 text-[12px] font-semibold text-amber-50">{i + 1}. {z.name}</div>
              <div className="font-deva text-[10.5px] text-amber-200/45">{z.hindi}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200/80">Camera &amp; privacy</h4>
            <p className="mt-1 text-[11.5px] leading-relaxed text-amber-100/55">
              MediaPipe Hand Landmarker runs locally in your browser at ~30 Hz. Frames are never recorded
              or transmitted. Turn the camera off at any time from the top bar — the universe keeps playing
              in pointer mode.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200/80">Controls</h4>
            <ul className="mt-1 space-y-0.5 text-[11.5px] text-amber-100/55">
              <li><b className="text-amber-100/80">Drag</b> — orbit {handsLive ? "(hands live)" : "with Shift held"}</li>
              <li><b className="text-amber-100/80">Scroll</b> — zoom the camera</li>
              <li><b className="text-amber-100/80">1 – 5 / ← →</b> — jump between zones</li>
              <li><b className="text-amber-100/80">Space</b> volley · <b className="text-amber-100/80">S</b> snap · <b className="text-amber-100/80">C</b> charge · <b className="text-amber-100/80">F</b> finale</li>
            </ul>
          </div>
        </div>

        {!handsLive && (
          <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-[11.5px] text-amber-100/80">
            You are in pointer mode. Enable the camera to conduct the celebration with real hand gestures.
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- toasts --------------------------------- */
export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-[68px] z-40 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-1.5">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "toast-life glass rounded-full px-4 py-1.5 text-center",
            t.tone === "gold" && "border-amber-300/45",
            t.tone === "magenta" && "border-pink-400/45",
            t.tone === "cyan" && "border-teal-300/45"
          )}
        >
          <span className={cn("text-[12px] font-bold tracking-wide",
            t.tone === "gold" && "text-amber-200", t.tone === "magenta" && "text-pink-200", t.tone === "cyan" && "text-teal-200")}>
            {t.text}
          </span>
          {t.sub && <span className="ml-2 text-[10.5px] text-amber-100/50">{t.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- finale --------------------------------- */
export function FinaleOverlay({ active }: { active: boolean }) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    if (active) setShow(true);
    else {
      const t = setTimeout(() => setShow(false), 1400);
      return () => clearTimeout(t);
    }
  }, [active]);
  if (!show) return null;
  return (
    <div className={cn("pointer-events-none fixed inset-x-0 top-[39%] sm:top-[24%] z-40 flex flex-col items-center px-4 transition-opacity duration-1000", active ? "opacity-100" : "opacity-0")}>
      <div key={String(active)} className="greet-in text-center">
        <div className="font-deva text-[clamp(26px,6vw,64px)] leading-none text-amber-200 drop-shadow-[0_0_36px_rgba(255,150,40,.85)]">
          शुभ दीपावली
        </div>
        <div className="mt-2 font-display text-[clamp(20px,4.4vw,46px)] tracking-[0.14em] gold-text drop-shadow-[0_0_30px_rgba(255,120,20,.6)]">
          HAPPY DIWALI
        </div>
        <div className="mx-auto mt-3 flex items-center justify-center gap-2">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-300/70" />
          <IconCrown className="h-4 w-4 text-amber-300" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-amber-100/60">Grand Finale</span>
          <IconCrown className="h-4 w-4 text-amber-300" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-300/70" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- zone caption -------------------------------- */
export function ZoneCaption({ zone, blurb }: { zone: number; blurb: string }) {
  const z = ZONE_META[zone];
  return (
    <div key={zone} className="pointer-events-none anim-in max-w-[300px]">
      <div className="flex items-center gap-2">
        <span className="h-[6px] w-[6px] rotate-45" style={{ background: z.accent, boxShadow: `0 0 10px ${z.accent}` }} />
        <span className="text-[9.5px] uppercase tracking-[0.34em] text-amber-100/45">Zone {zone + 1} / 5</span>
      </div>
      <h2 className="mt-1 font-display text-[20px] leading-tight tracking-[0.08em] text-amber-50">{z.name}</h2>
      <p className="mt-1 text-[11.5px] leading-relaxed text-amber-100/50">{blurb}</p>
    </div>
  );
}
