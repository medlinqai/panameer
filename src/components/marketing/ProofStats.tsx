/**
 * THE THREE-STAT PROOF STRIP — one component, two surfaces.
 *
 * Rendered on the marketing home hero and on `/assess` step 0. The brief is
 * explicit that it is ONE component, not two copies: the home and the first
 * screen of the assessment are the same promise made twice, and two copies of
 * three numbers is how they end up disagreeing.
 *
 * ⚠ EVERY FIGURE HERE IS INVENTED. 942 and 10M+ already run on panameer.com and
 * are a known pre-launch item — out of scope for this brief, deliberately not
 * "fixed" here. See WORKING_CAPITAL_DEFERRED for the third.
 *
 * `variant` only changes the skin. The home renders inside the ported
 * `.pm-home` stylesheet and reuses its `.stats`/`.stat` classes; the wizard
 * sits outside that scope, so it gets a Tailwind equivalent. Same numbers, same
 * order, same labels — the SOURCE is shared even though the paint is not.
 */
import { SHOW_TAX_SAVINGS_STAT } from "@/lib/home-flags";

/**
 * ⚠ PLACEHOLDER — SCOTT HAS NOT CONFIRMED THIS FIGURE (brief WS-9).
 *
 * One named constant so swapping it is a single edit rather than a hunt across
 * two surfaces. It is the same claim family as the product shot's "TDWCA — Tax
 * Deferred Working Capital Account" finding.
 */
export const WORKING_CAPITAL_DEFERRED = "$6M+";

type Stat = { value: string; label: string; gated?: boolean };

const STATS: Stat[] = [
  { value: "942", label: "Assessments Completed" },
  { value: "10M+", label: "Total Savings" },
  /*
    ⚠ STILL BEHIND THE COUNSEL GATE, and that is a deliberate hold.

    This slot used to read "Tax Savings Used to Fund Deployment", flagged
    because a guaranteed tax-savings claim needs CPA and lawyer sign-off before
    it faces the public. "Working Capital Deferred" is a materially weaker
    claim — deferred, not saved — so the gate may well be droppable, but that
    is a legal call and not one to make silently while relabelling a tile.
    Renders in dev (where the walk happens), stays off in production until
    Scott says otherwise. Dropping it is deleting `gated: true`.
  */
  { value: WORKING_CAPITAL_DEFERRED, label: "Working Capital Deferred", gated: true },
];

const visible = () => STATS.filter((s) => !s.gated || SHOW_TAX_SAVINGS_STAT);

export function ProofStats({ variant = "home" }: { variant?: "home" | "wizard" }) {
  const stats = visible();

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
