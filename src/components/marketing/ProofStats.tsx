export const TAX_SAVINGS_USED = "$6M+";

type Stat = { value: string; label: string };

const STATS: Stat[] = [
  { value: "942", label: "Assessments Completed" },
  { value: "10M+", label: "Total Savings" },
  { value: TAX_SAVINGS_USED, label: "Tax Savings Used to Fund Deployment" },
];

export function ProofStats({ variant = "home" }: { variant?: "home" | "wizard" }) {
  const stats = STATS;

  if (variant === "home") {
    return (
      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <span className="big">{s.value}</span>
            <span className="lbl">{s.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-brand border border-line bg-bg-soft p-5">
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-2">
        Where this has landed
      </p>
      <dl className="mt-4 space-y-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="font-display text-[26px] font-bold leading-none text-ink">
              {s.value}
            </dt>
            <dd className="mt-1 text-[13px] text-ink-2">{s.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
