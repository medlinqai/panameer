import Link from "next/link";
import type { ReactNode } from "react";

// HL: the Hire look (Scott's approved mockups 10-21) — white page, ink rule under section headings, light rules between rows,
// magenta only for current/active, red only for "needs you", 11 px uppercase labels over 14 px values, square buttons.
export const BTN = "inline-flex min-h-10 items-center justify-center whitespace-nowrap bg-ink px-3.5 text-[13px] font-semibold text-surface hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_OUT = "inline-flex min-h-10 items-center justify-center whitespace-nowrap border border-ink bg-white px-3.5 text-[13px] font-semibold text-ink hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_MAGENTA = "inline-flex min-h-10 items-center justify-center whitespace-nowrap bg-magenta px-3.5 text-[13px] font-bold text-white hover:bg-magenta-dark";
export const LABEL = "text-[11px] font-bold uppercase tracking-[0.1em] text-state-inactive";
export const MUTED = "text-[14px] text-state-disabled";
export const GREEN = "text-state-accepted";
export const ROW_RULE = "border-b border-state-sunken";

/** HB-E002: a state is always a word + a colour; pills are never magenta. */
export type UiState = "accepted" | "pending" | "declined" | "inactive";
export const STATE_PILL: Record<UiState, string> = {
  accepted: "rounded-[14px] bg-state-accepted-bg px-3 py-1.5 text-[12px] font-bold text-state-accepted",
  pending: "rounded-[14px] bg-state-pending-bg px-3 py-1.5 text-[12px] font-bold text-state-pending",
  declined: "rounded-[14px] bg-state-declined-bg px-3 py-1.5 text-[12px] font-bold text-state-declined",
  inactive: "rounded-[14px] bg-state-inactive-bg px-3 py-1.5 text-[12px] font-bold text-state-inactive",
};
export const STATE_TEXT: Record<UiState, string> = { accepted: "text-state-accepted", pending: "text-state-pending", declined: "text-state-declined", inactive: "text-state-inactive" };
/** A path step's state: done = accepted, the Work Order handoff = accepted, a draft = inactive, anything in flight = pending. */
export const stepState = (step: string | null | undefined, opts: { draft?: boolean; completed?: boolean; closed?: boolean } = {}): UiState =>
  opts.closed ? "inactive" : opts.draft ? "inactive" : opts.completed || step === "wo" ? "accepted" : "pending";
export const StatePill = ({ state, children }: { state: UiState; children: ReactNode }) => <span className={STATE_PILL[state]} data-state-pill={state}>{children}</span>;

export const RedDot = ({ size = 10 }: { size?: number }) => <span aria-label="needs you" className="inline-block shrink-0 rounded-full bg-state-declined" style={{ width: size, height: size }} />;
export const RedPill = ({ n }: { n: number }) => (n > 0 ? <span className="rounded-[10px] bg-state-declined px-[7px] py-px text-[11px] font-bold text-white" data-red-count>{n}</span> : null);

export function Fact({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className={LABEL}>{label}</div>
      <div className="mt-1 text-[14px] font-semibold leading-snug">{children}</div>
    </div>
  );
}

/** A section: heading over a 1 px ink rule; collapsible on phones only (always open from md up). */
export function Section({ id, title, extra, right, children, open = true }: { id?: string; title: string; extra?: ReactNode; right?: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details id={id} open={open} className="group border-t border-ink pt-3.5 [&_summary::-webkit-details-marker]:hidden" data-section={title}>
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 md:pointer-events-none md:cursor-default">
        <h2 className="text-[18px] font-extrabold">{title}{extra && <span className="ml-1.5 text-[14px] font-medium text-state-inactive md:pointer-events-auto">{extra}</span>}</h2>
        <span className="flex items-baseline gap-3 text-[13px] font-semibold">
          {right && <span className="md:pointer-events-auto">{right}</span>}
          <span aria-hidden className="text-ink-3 transition-transform group-open:rotate-180 md:hidden">▾</span>
        </span>
      </summary>
      <div className="mt-2.5">{children}</div>
    </details>
  );
}

/** A plain heading row over an ink rule (Overview columns). */
export function HeadRow({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-2.5">
      <h2 className="text-[22px] font-extrabold">{title}</h2>
      {children}
    </div>
  );
}

export type BandStep = { key: string; label: ReactNode; top: ReactNode; bar: "done" | "todo" | "dashed"; current?: boolean; needs?: boolean; href?: string; muted?: boolean };
/** The thin path band: something above each step, a 4 px bar, the label under; scrolls inside its box on phones. */
export function PathBand({ steps, label = "Path" }: { steps: BandStep[]; label?: string }) {
  return (
    <section aria-label={label} className="overflow-x-auto rounded-[12px] border border-state-border px-5 py-5 sm:px-6" data-path-band>
      <div className="grid items-start text-center" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(92px, 1fr))`, minWidth: steps.length * 94 }}>
        {steps.map((s) => {
          const body = (
            <>
              <span className="flex min-h-[26px] items-center justify-center gap-1.5">{s.top}{s.needs && <RedDot size={8} />}</span>
              <span className="h-1 w-full" style={{ background: s.bar === "done" ? "#b324b2" : s.bar === "dashed" ? "repeating-linear-gradient(90deg, var(--color-state-border) 0 6px, transparent 6px 10px)" : "var(--color-state-sunken)" }} />
              <span className={`text-[12px] ${s.current ? "font-extrabold" : "font-semibold"} ${s.muted ? "text-state-disabled" : ""}`}>{s.label}</span>
            </>
          );
          return s.href ? (
            <Link key={s.key} href={s.href} className="flex flex-col items-center gap-2 px-0.5 text-ink no-underline hover:underline" data-band-step={s.key}>{body}</Link>
          ) : (
            <div key={s.key} className="flex flex-col items-center gap-2 px-0.5" data-band-step={s.key}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}

/** HL-E004: the Hire tab bar — "HIRE" eyebrow + divider, 3 px magenta underline on the active tab, red pills, Post a Job. */
export function HireTabBar({ tabs, current, right, eyebrow = "HIRE" }: { tabs: { key: string; label: string; href: string; n?: number }[]; current: string; right?: ReactNode; eyebrow?: string }) {
  return (
    <div className="relative isolate border-b border-state-border" data-hire-tabs>
      <div aria-hidden className="pointer-events-none absolute -top-6 bottom-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-white" />
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-0 sm:px-2">
        <nav aria-label={eyebrow} className="flex min-w-0 items-center gap-6 overflow-x-auto">
          <span className="shrink-0 border-r border-state-border pr-5 text-[12px] font-extrabold tracking-[0.12em]">{eyebrow}</span>
          {tabs.map((t) => {
            const on = t.key === current;
            return (
              <Link key={t.key} href={t.href} aria-current={on ? "page" : undefined}
                className={on ? "flex shrink-0 items-center gap-1.5 border-b-[3px] border-magenta pb-[13px] pt-4 text-[14px] font-semibold text-magenta" : "flex shrink-0 items-center gap-1.5 pb-4 pt-4 text-[14px] text-ink hover:text-magenta-dark"}>
                {t.label}<RedPill n={t.n ?? 0} />
              </Link>
            );
          })}
        </nav>
        {right}
      </div>
    </div>
  );
}

export const shortDate = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
export const shortWhen = (d: Date | string) => new Date(d).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** MR-E002: credential pills on a match — certified = accepted green, the rest steel-blue outline; 4 at most, then "+n". */
export function MatchBadges({ badges, className = "" }: { badges: { label: string; certified?: boolean; title?: string }[]; className?: string }) {
  if (!badges.length) return null;
  const shown = badges.slice(0, 4);
  return (
    <span className={`flex flex-wrap gap-1.5 ${className}`} data-match-badges>
      {shown.map((b) => <span key={b.label} title={b.title} className={b.certified ? "rounded-full bg-state-accepted-bg px-2 py-0.5 text-[11.5px] font-bold text-state-accepted" : "rounded-full border border-state-inactive px-2 py-0.5 text-[11.5px] font-semibold text-state-inactive"}>{b.label}</span>)}
      {badges.length > 4 && <span className="rounded-full border border-state-inactive px-2 py-0.5 text-[11.5px] font-semibold text-state-inactive">+{badges.length - 4}</span>}
    </span>
  );
}
