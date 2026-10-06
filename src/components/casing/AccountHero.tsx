import type { ReactNode } from "react";

// The Account pages' hero (Health's look, shared by Score / Usage / Health so they can't drift):
// picture left (340px) · eyebrow, 30px title, KPI row, one paragraph, actions right · one rule under it.
export const HERO_BTN = "inline-flex min-h-11 items-center bg-ink px-6 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-60";
export const HERO_BTN_W = "inline-flex min-h-11 items-center border border-ink bg-surface px-6 text-[14px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-60";

export function AccountLead({ children }: { children: ReactNode }) {
  return <p className="pb-[26px] pt-3.5 text-[13px] font-semibold">{children}</p>;
}

export function AccountHero({
  picture,
  eyebrow,
  title,
  kpis,
  kpiTestId,
  paragraph,
  actions,
  testId,
}: {
  picture: ReactNode;
  eyebrow: string;
  title: ReactNode;
  kpis: { value: ReactNode; label: string }[];
  kpiTestId?: string;
  paragraph?: ReactNode;
  actions?: ReactNode;
  testId?: string;
}) {
  return (
    <section data-account-hero data-testid={testId} className="grid items-center gap-x-14 gap-y-6 border-b border-line pb-9 md:grid-cols-[340px_1fr]">
      <div className="min-w-0">{picture}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">{eyebrow.toUpperCase()}</p>
        <h1 className="mb-5 mt-1.5 text-[30px] font-bold leading-tight">{title}</h1>
        <div className="flex flex-wrap gap-x-11 gap-y-3 border-b border-line pb-[18px]" data-testid={kpiTestId}>
          {kpis.map((k) => (
            <div key={k.label}>
              <b className="block whitespace-nowrap text-[26px] font-medium">{k.value}</b>
              <span className="whitespace-nowrap text-[11px] font-semibold tracking-[0.08em] text-ink-2">{k.label}</span>
            </div>
          ))}
        </div>
        {paragraph && <div className="my-[18px] text-[14px] leading-[1.65] text-ink-2">{paragraph}</div>}
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}
