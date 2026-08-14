/**
 * THE THREE-STAT PROOF STRIP — one component, two surfaces.
 *
 * Rendered on the marketing home hero and on `/assess` step 0. The brief is
 * explicit that it is ONE component, not two copies: the home and the first
 * screen of the assessment are the same promise made twice, and two copies of
 * three numbers is how they end up disagreeing.
 *
 * ⚠ EVERY FIGURE HERE IS INVENTED. 942 and 10M+ already run on panameer.com and
 * are a known pre-launch item — deliberately not "fixed" here. See
 * TAX_SAVINGS_USED for the third.
 *
 * `variant` only changes the skin. The home renders inside the ported
 * `.pm-home` stylesheet and reuses its `.stats`/`.stat` classes; the wizard
 * sits outside that scope, so it gets a Tailwind equivalent. Same numbers, same
 * order, same labels — the SOURCE is shared even though the paint is not.
 */
/**
 * ⚠ PLACEHOLDER — SCOTT HAS NOT CONFIRMED THIS FIGURE.
 *
 * One named constant so swapping it is a single edit rather than a hunt across
 * two surfaces. It is the same claim family as the product shot's "TDWCA — Tax
 * Deferred Working Capital Account" finding.
 */
export const TAX_SAVINGS_USED = "$6M+";

type Stat = { value: string; label: string };

const STATS: Stat[] = [
  { value: "942", label: "Assessments Completed" },
  { value: "10M+", label: "Total Savings" },
  /*
    ⚠ RENDERS IN EVERY ENVIRONMENT, INCLUDING PRODUCTION — Scott, 2026-08-14.

    This tile was previously behind an environment-flagged counsel gate that
    kept it out of production, because a tax-savings claim was held to need CPA
    and lawyer sign-off. Scott removed the gate and restored the original
    wording on 2026-08-14, so the claim is now public on `/` and on `/assess`
    step 0. The flag and the module that held it were DELETED rather than left
    switched on — a flag still sitting in the tree would imply the decision is
    open when it has been made.
  */
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
