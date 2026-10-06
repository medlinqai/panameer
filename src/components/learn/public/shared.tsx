import type { ReactNode } from "react";

/** The card every graphic sits in. */
export function ShotCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-[16px] border border-line bg-white p-5 shadow-[0_24px_56px_-30px_rgba(23,30,62,0.45)] " +
        className
      }
    >
      {children}
    </div>
  );
}

export function Avatar({
  initials,
  tone = "ink",
  size = 34,
}: {
  initials: string;
  tone?: "ink" | "magenta" | "slate";
  size?: number;
}) {
  const bg =
    tone === "magenta" ? "bg-magenta" : tone === "slate" ? "bg-[#5b6478]" : "bg-ink";
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`grid flex-none place-items-center rounded-full ${bg} font-display text-[12.5px] font-bold leading-none text-white`}
    >
      {initials}
    </span>
  );
}

/** The `INSTRUCTOR` chip. */
export function InstructorChip() {
  return (
    <span className="rounded-full bg-magenta/10 px-2 py-[3px] font-display text-[8.5px] font-bold uppercase tracking-[0.1em] text-magenta-dark">
      Instructor
    </span>
  );
}

/** INLINE SVG, NEVER A GLYPH — `▦ ◔ ▤ ◈ ⚙` and `⌘` all failed to render on real boxes. */
export function Check({ className = "h-[11px] w-[11px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden focusable="false">
      <path
        d="M3.6 10.4l4.2 4.2 8.6-9.2"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
