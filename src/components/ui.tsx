import React from "react";
import { cn } from "../utils/cn";

/* ----------------------------- icons ----------------------------- */
type IP = { className?: string };
const S = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p} />
);

export const IconDiya = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M12 3.2c1.9 2.3 2.9 3.9 2.9 5.3a2.9 2.9 0 1 1-5.8 0c0-1.4 1-3 2.9-5.3Z" fill="currentColor" opacity=".95" />
    <path d="M3 14.2h18c-.9 3.3-4.5 5.4-9 5.4s-8.1-2.1-9-5.4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M3 14.2c2.6-1.1 5.6-1.7 9-1.7s6.4.6 9 1.7" stroke="currentColor" strokeWidth="1.2" opacity=".6" />
  </svg>
);
export const IconSpark = ({ className }: IP) => (
  <S className={className}><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5M5.2 5.2l3.5 3.5M15.3 15.3l3.5 3.5M18.8 5.2l-3.5 3.5M8.7 15.3l-3.5 3.5" /><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" /></S>
);
export const IconMandala = ({ className }: IP) => (
  <S className={className}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.2" /><path d="M12 3v3.8M12 17.2V21M3 12h3.8M17.2 12H21M5.6 5.6l2.7 2.7M15.7 15.7l2.7 2.7M18.4 5.6l-2.7 2.7M8.3 15.7l-2.7 2.7" /></S>
);
export const IconLantern = ({ className }: IP) => (
  <S className={className}><path d="M9 3h6M8 6h8l1.4 8.2A5.6 5.6 0 0 1 12 20a5.6 5.6 0 0 1-5.4-5.8L8 6Z" /><path d="M10.4 20.4h3.2M12 9.4c1 1.3 1.5 2.2 1.5 3a1.5 1.5 0 1 1-3 0c0-.8.5-1.7 1.5-3Z" fill="currentColor" stroke="none" /></S>
);
export const IconCrown = ({ className }: IP) => (
  <S className={className}><path d="M3 8.5 6.4 12 12 4.5 17.6 12 21 8.5 19.2 19H4.8L3 8.5Z" /><path d="M4.8 19h14.4" /></S>
);
export const IconRocket = ({ className }: IP) => (
  <S className={className}><path d="M12 2.6c3 2.4 4.6 5.7 4.6 9.3L12 17l-4.6-5.1c0-3.6 1.6-6.9 4.6-9.3Z" /><path d="M7.4 12.5 4.6 15v3.4l3.2-1.6M16.6 12.5l2.8 2.5v3.4l-3.2-1.6M10.6 19.4 12 22l1.4-2.6" /><circle cx="12" cy="9.6" r="1.6" /></S>
);
export const IconVolume = ({ className, off }: IP & { off?: boolean }) => (
  <S className={className}>
    <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" />
    {off ? <path d="m16 9.5 4.5 5M20.5 9.5 16 14.5" /> : <path d="M15.6 9a4.2 4.2 0 0 1 0 6M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />}
  </S>
);
export const IconCam = ({ className, off }: IP & { off?: boolean }) => (
  <S className={className}>
    <path d="M2.8 7.6h11.4v8.8H2.8z" /><path d="m14.2 12 6.9-3.6v7.2L14.2 12Z" />
    {off && <path d="M3 3.2 21 20.8" />}
  </S>
);
export const IconExpand = ({ className }: IP) => (
  <S className={className}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></S>
);
export const IconHelp = ({ className }: IP) => (
  <S className={className}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4" /><circle cx="12" cy="17" r=".9" fill="currentColor" /></S>
);
export const IconReset = ({ className }: IP) => (
  <S className={className}><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 3.6V9h-5.4" /></S>
);
export const IconDice = ({ className }: IP) => (
  <S className={className}><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="8.6" cy="8.6" r="1.3" fill="currentColor" /><circle cx="15.4" cy="15.4" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /></S>
);
export const IconDownload = ({ className }: IP) => (
  <S className={className}><path d="M12 3.5v11M7.8 10.6 12 14.8l4.2-4.2M4.5 19.5h15" /></S>
);
export const IconClose = ({ className }: IP) => (<S className={className}><path d="m6 6 12 12M18 6 6 18" /></S>);
export const IconChevron = ({ className }: IP) => (<S className={className}><path d="m9 5 7 7-7 7" /></S>);
export const IconTrash = ({ className }: IP) => (<S className={className}><path d="M4.5 6.5h15M9.5 6.5V4.2h5v2.3M6.6 6.5 7.6 20h8.8l1-13.5M10.4 10v6M13.6 10v6" /></S>);
export const IconOrbit = ({ className }: IP) => (
  <S className={className}><circle cx="12" cy="12" r="3.4" /><ellipse cx="12" cy="12" rx="9.2" ry="4.4" transform="rotate(-24 12 12)" /><circle cx="19.4" cy="8.6" r="1.5" fill="currentColor" /></S>
);

/* ----------------------------- gesture glyphs ----------------------------- */
export type GlyphName = "wave" | "snap" | "pinch" | "open" | "fist" | "swipe" | "finale";
export function GestureGlyph({ name, className }: { name: GlyphName; className?: string }) {
  const base = "M9 20.5c-2-1.4-3.2-3.4-3.2-6V10a1.1 1.1 0 0 1 2.2 0v2.6";
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {name === "wave" && (<>
        <path d={base} />
        <path d="M8 12.6V4.6a1.15 1.15 0 0 1 2.3 0v7" />
        <path d="M10.3 11.6V9.2a1.1 1.1 0 0 1 2.2 0v3M12.5 12.2v-1.6a1.1 1.1 0 0 1 2.2 0v4c0 2.6-1 4.6-2.6 5.9" />
        <path d="M17.6 4.4a6 6 0 0 1 1.8 3.4M20.4 2.6a9 9 0 0 1 2 5" opacity=".8" />
      </>)}
      {name === "snap" && (<>
        <path d="M7.4 20.4c-1.6-1.4-2.4-3.2-2.4-5.4v-3.4a1.1 1.1 0 0 1 2.2 0v2" />
        <path d="M7.2 13.6V6.4a1.15 1.15 0 0 1 2.3 0v5" />
        <path d="M9.5 11.4 12 9.2a1.2 1.2 0 0 1 1.7 1.7l-1.6 1.8" />
        <path d="M12.1 12.7c1.6.2 2.6 1.4 2.6 3.2 0 2.1-.9 3.6-2.3 4.5" />
        <path d="m17.4 4.2.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3Z" fill="currentColor" stroke="none" />
      </>)}
      {name === "pinch" && (<>
        <path d="M8.6 21c-1.9-1.3-3-3.3-3-5.8v-2.6a1.1 1.1 0 0 1 2.2 0v1.6" />
        <path d="M7.8 14.2V9.4a1.15 1.15 0 0 1 2.3 0v3.2" />
        <path d="M10.1 12.6c.4-1.6 1.3-2.6 2.6-3" />
        <path d="M12.7 9.6c1.9.5 3 2 3 4.2 0 3-1.1 5.3-3 7.2" />
        <circle cx="11.4" cy="7.4" r="2" fill="currentColor" stroke="none" opacity=".9" />
        <path d="M11.4 3.2v1.3M15 5.2l-.9.9M7.8 5.2l.9.9" opacity=".8" />
      </>)}
      {name === "open" && (<>
        <path d="M6.6 20.6c-1.3-1.3-2-3-2-5V11a1.05 1.05 0 0 1 2.1 0v2" />
        <path d="M6.7 13V5.6a1.1 1.1 0 0 1 2.2 0V12" />
        <path d="M8.9 12V4.3a1.1 1.1 0 0 1 2.2 0V12" />
        <path d="M11.1 12V5a1.1 1.1 0 0 1 2.2 0v7.4" />
        <path d="M13.3 12.4V7.6a1.1 1.1 0 0 1 2.2 0v7.2c0 2.4-.8 4.4-2.2 5.8" />
        <path d="M18.6 5.4 20 4M19.4 9.6l1.9-.5" opacity=".7" />
      </>)}
      {name === "fist" && (<>
        <path d="M6.4 12.6V10a1.1 1.1 0 0 1 2.2 0v1.6" />
        <path d="M6.4 12.4c0-2 1.6-3.4 3.8-3.4h2.6c2.2 0 3.8 1.5 3.8 3.6v2.6c0 3.2-2 5.4-5.1 5.4s-5.1-2-5.1-5.2v-3Z" />
        <path d="M9.4 9.2V7.4a1.1 1.1 0 0 1 2.2 0v1.6M12.4 9V8a1.1 1.1 0 0 1 2.2 0v1.2" />
        <path d="M3.2 8.4 1.8 7M3.6 13H1.9M20.4 8.4 21.8 7M20.2 13h1.7" opacity=".75" />
      </>)}
      {name === "swipe" && (<>
        <path d="M9.4 18.4c-1.2-1.1-1.8-2.6-1.8-4.4v-3.2a1 1 0 0 1 2 0v1.8" />
        <path d="M7.6 12.6V6.8a1.05 1.05 0 0 1 2.1 0v5" />
        <path d="M9.7 11.8V6.2a1.05 1.05 0 0 1 2.1 0v5.6" />
        <path d="M11.8 11.8V8.2a1.05 1.05 0 0 1 2.1 0v6c0 2-.7 3.4-1.9 4.4" />
        <path d="M2.4 21.2h19.2M4.6 19.2 2.4 21.2l2.2 2M19.4 19.2l2.2 2-2.2 2" opacity=".85" />
      </>)}
      {name === "finale" && (<>
        <path d="M4.6 19.4c-1-.9-1.5-2.1-1.5-3.6v-3a.85.85 0 0 1 1.7 0v1.4" />
        <path d="M4.8 14.2V8.6a.9.9 0 0 1 1.8 0v4.6M6.6 13.2V7.8a.9.9 0 0 1 1.8 0v5.4M8.4 13.4V9.4a.9.9 0 0 1 1.8 0v5.4c0 1.9-.6 3.4-1.7 4.6" />
        <path d="M19.4 19.4c1-.9 1.5-2.1 1.5-3.6v-3a.85.85 0 0 0-1.7 0v1.4" />
        <path d="M19.2 14.2V8.6a.9.9 0 0 0-1.8 0v4.6M17.4 13.2V7.8a.9.9 0 0 0-1.8 0v5.4M15.6 13.4V9.4a.9.9 0 0 0-1.8 0v5.4c0 1.9.6 3.4 1.7 4.6" />
        <path d="m12 1.6.85 2.15L15 4.6l-2.15.85L12 7.6l-.85-2.15L9 4.6l2.15-.85L12 1.6Z" fill="currentColor" stroke="none" />
      </>)}
    </svg>
  );
}

/* ----------------------------- primitives ----------------------------- */
export function Slider({
  label, value, min, max, step = 0.01, onChange, format, accent = ["#ffc857", "#ff5cc8"], hint,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string; accent?: [string, string]; hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block select-none group">
      <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-amber-100/60 group-hover:text-amber-100/90 transition-colors">{label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-amber-200/95">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input
        type="range" className="fx" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ["--fx-p" as string]: `${pct}%`, ["--fx-a" as string]: accent[0], ["--fx-b" as string]: accent[1] }}
      />
      {hint && <p className="text-[10px] text-amber-100/35 -mt-0.5">{hint}</p>}
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button
      type="button" onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 py-1.5 text-left group"
      aria-pressed={checked}
    >
      <span>
        <span className="block text-[10.5px] uppercase tracking-[0.14em] text-amber-100/60 group-hover:text-amber-100/90 transition-colors">{label}</span>
        {hint && <span className="block text-[10px] text-amber-100/35">{hint}</span>}
      </span>
      <span className={cn(
        "relative h-[18px] w-[34px] shrink-0 rounded-full transition-all duration-300 border",
        checked ? "bg-gradient-to-r from-amber-400/80 to-pink-500/80 border-amber-200/50" : "bg-white/8 border-white/15"
      )}>
        <span className={cn(
          "absolute top-[2px] h-[12px] w-[12px] rounded-full bg-[#fff6dd] transition-all duration-300 shadow",
          checked ? "left-[18px] shadow-[0_0_10px_rgba(255,190,80,.9)]" : "left-[3px] opacity-70"
        )} />
      </span>
    </button>
  );
}

export function Select<T extends string | number>({
  label, value, options, onChange,
}: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] uppercase tracking-[0.14em] text-amber-100/60 mb-1">{label}</span>
      <select
        className="fx w-full rounded-lg bg-white/6 border border-amber-200/15 px-2.5 py-1.5 pr-7 text-[12px] text-amber-50 outline-none focus:border-amber-300/50 transition-colors cursor-pointer"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
      >
        {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function ActionButton({
  children, onClick, icon, tone = "neutral", title,
}: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode; tone?: "neutral" | "gold" | "danger"; title?: string }) {
  return (
    <button
      type="button" onClick={onClick} title={title}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-all duration-200 border active:scale-[0.96]",
        tone === "gold" && "bg-gradient-to-br from-amber-400/25 to-orange-500/15 border-amber-300/35 text-amber-100 hover:from-amber-400/40 hover:border-amber-200/60",
        tone === "danger" && "bg-rose-500/10 border-rose-300/25 text-rose-200/90 hover:bg-rose-500/20",
        tone === "neutral" && "bg-white/6 border-white/12 text-amber-50/80 hover:bg-white/12 hover:text-amber-50"
      )}
    >
      {icon}{children}
    </button>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-1.5">
      <span className="h-[5px] w-[5px] rotate-45 bg-gradient-to-br from-amber-300 to-pink-500" />
      <h3 className="font-display text-[11px] tracking-[0.26em] uppercase text-amber-200/85">{children}</h3>
      <span className="flex-1 h-px bg-gradient-to-r from-amber-300/25 to-transparent" />
      {right}
    </div>
  );
}

export function Stat({ label, value, tone = "gold" }: { label: string; value: string | number; tone?: "gold" | "teal" | "pink" }) {
  return (
    <div className="rounded-lg bg-black/25 border border-white/8 px-2 py-1.5">
      <div className={cn("text-[13px] font-bold tabular-nums leading-none",
        tone === "gold" && "text-amber-200", tone === "teal" && "text-teal-300", tone === "pink" && "text-pink-300")}>{value}</div>
      <div className="text-[8.5px] uppercase tracking-[0.14em] text-amber-100/40 mt-1">{label}</div>
    </div>
  );
}
