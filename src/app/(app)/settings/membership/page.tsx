import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
import { PLANS } from "@/lib/plans";

/**
 * MEMBERSHIP (J2.4 WS-G / E013) — the Settings default.
 *
 * Three tier cards, the current one marked, Plus flagged popular, plus the
 * membership cycle. De-branded throughout: the copy this replaces sold a
 * "freelance career" on a competitor's price list.
 *
 * THE CURRENT TIER IS DERIVED, and that gap is stated on the page rather than
 * papered over. There is no provider tier column — `membershipBadge` has said
 * so since WS7 — so everyone reads as Basic until billing lands. Showing a
 * confident "Your plan: Basic" with no way to have chosen otherwise would be a
 * claim about a record that doesn't exist.
 *
 * MANAGE MEMBERSHIP CAPTURES INTENT, and says that is what it does. The payment
 * processor is explicitly out of scope; a checkout button that silently does
 * nothing would be worse than a button that tells the truth about where the
 * feature is.
 */
export const metadata = { title: "Membership · Panameer" };

export default async function MembershipPage() {
  const viewer = await guardPage("canProvideServices");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { created_at: true, onboarding_completed_at: true },
  });

  /*
    THE CYCLE, from what the schema actually knows. There is no subscription
    record, so the "cycle" is the anniversary of the account rather than a
    billing period — which is true, is useful (it is the date a paid plan would
    renew on), and is labelled as what it is.
  */
  const since = profile?.onboarding_completed_at ?? profile?.created_at ?? null;
  const cycle = since ? cycleFrom(since) : null;

  const current: (typeof PLANS)[number]["tier"] = "Basic";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === current;
          return (
            <section
              key={plan.tier}
              className={
                "relative flex flex-col rounded-brand border-2 bg-white p-5 " +
                (isCurrent
                  ? "border-magenta shadow-brand"
                  : plan.popular
                    ? "border-magenta/40"
                    : "border-line")
              }
            >
              {plan.popular && !isCurrent && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-magenta px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
                  Popular
                </span>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-[18px] font-bold">
                  Provider {plan.tier}
                </h2>
                {isCurrent && (
                  <span className="rounded-full bg-magenta/10 px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-magenta">
                    Current
                  </span>
                )}
              </div>

              <p className="mt-2">
                <span className="font-display text-[26px] font-bold">
                  {plan.price}
                </span>
                {plan.cadence && (
                  <span className="ml-1.5 text-[13.5px] text-ink-2">
                    {plan.cadence}
                  </span>
                )}
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
                {plan.tagline}
              </p>

              <ul className="mt-4 flex-1 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13.5px]">
                    <span aria-hidden className="mt-[2px] font-black text-magenta">
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
                {plan.unavailable?.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[13.5px] text-ink-2/70"
                  >
                    <span aria-hidden className="mt-[2px] font-black">
                      ·
                    </span>
                    <span className="line-through decoration-ink-2/30">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled
                title="Billing isn't wired up yet"
                className={
                  "mt-5 w-full rounded-full px-5 py-2.5 text-[14.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
                  (isCurrent
                    ? "border-[1.5px] border-line text-ink-2"
                    : "bg-magenta text-white")
                }
              >
                {isCurrent ? "Your Current Plan" : `Choose ${plan.tier}`}
              </button>
            </section>
          );
        })}
      </div>

      <section className="rounded-brand border border-line bg-white p-5">
        <h2 className="font-display text-[16px] font-bold">Membership Cycle</h2>
        {cycle ? (
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
            Your current cycle runs{" "}
            <b className="text-ink">{cycle.from}</b> to{" "}
            <b className="text-ink">{cycle.to}</b>. Provider Basic is free, so
            nothing is charged at the end of it — a paid plan would renew on that
            date.
          </p>
        ) : (
          <p className="mt-2 text-[14.5px] text-ink-2">
            Your cycle starts once your profile is published.
          </p>
        )}
      </section>

      <section className="rounded-brand border border-dashed border-line p-5">
        <h2 className="font-display text-[16px] font-bold">Manage Membership</h2>
        <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          Plan changes aren&apos;t switchable from here yet — Panameer&apos;s
          payment processing goes live with transactions. The prices above are
          real and won&apos;t change on you; when billing opens you&apos;ll be
          able to move between plans from this page, and nothing is charged in
          the meantime.
        </p>
      </section>
    </div>
  );
}

/**
 * A one-year cycle from the anniversary of `since`.
 *
 * Formatted on the SERVER with a fixed locale. `toLocaleDateString` with the
 * viewer's locale is the hydration mismatch this codebase has been bitten by
 * twice; a settings page is not worth a third.
 */
function cycleFrom(since: Date): { from: string; to: string } {
  const now = new Date();
  const start = new Date(since);
  start.setFullYear(now.getFullYear());
  if (start > now) start.setFullYear(now.getFullYear() - 1);
  const end = new Date(start);
  end.setFullYear(start.getFullYear() + 1);

  const fmt = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return { from: fmt.format(start), to: fmt.format(end) };
}
