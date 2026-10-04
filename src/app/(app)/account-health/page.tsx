import Link from "next/link";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs, ACCOUNT_MENU_NAME } from "@/lib/profile-tabs";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
import { EnforcementHistory } from "@/components/console/EnforcementHistory";
import { POLICIES } from "@/lib/policies";
import {
  accountStandingLines,
  accountStandingSummary,
  accountAccessLines,
  accountCheckCounts,
} from "@/lib/account-standing";
import { PatternHeader } from "@/components/casing/PatternHeader";
import { profileTabLabel } from "@/lib/profile-tabs";

export const metadata = { title: "Account Health Checklist · Panameer" };

export default async function AccountHealthPage() {
  const viewer = await guardPage("authenticated");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      completeness: true,
      status: true,
      paused_at: true,
      validation_status: true,
      available_for_messages: true,
      person: { select: { phone: true, user: { select: { email_verified: true } } } },
    },
  });

  if (!profile) {
    return (
      <p className="text-ink-2">
        This account has no provider profile, so there is nothing to check yet.
      </p>
    );
  }

  const access = accountAccessLines({
    availableForMessages: profile.available_for_messages,
  });

  const standing = accountStandingLines({
    status: profile.status,
    emailVerified: !!profile.person.user?.email_verified,
  });

  const { passing: checksPassing, failing: checksFailing } = accountCheckCounts([
    access,
    standing,
  ]);
  const summary = accountStandingSummary(standing);

  return (
    <>
      {}
      <PageTabs
        wrap
        eyebrow={ACCOUNT_MENU_NAME}
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/account-health"
      />
    <div className="mx-auto max-w-4xl space-y-4">
      {}
      <PatternHeader
        eyebrow={profileTabLabel("/account-health")}
        headline="Where your account stands"
        lede="What this account can do today, and whether its record is clear."
        figures={[
          { label: "Checks Passing", value: checksPassing },
          { label: "Needs Attention", value: checksFailing },
        ]}
        picture={
          <div className="flex h-full flex-col justify-center gap-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">
              Account Standing
            </p>
            <div className="flex items-center gap-3">
              {}
              <span
                aria-hidden
                className={
                  "grid h-[44px] w-[44px] flex-none place-items-center rounded-full text-[20px] font-black text-white " +
                  (summary.ok ? "bg-emerald-500" : "bg-amber-500")
                }
              >
                {summary.ok ? "✓" : "!"}
              </span>
              <p className="font-display text-[19px] font-bold leading-tight text-ink">
                {summary.label}
              </p>
            </div>
            <p className="text-[12.5px] leading-relaxed text-ink-2">
              {summary.ok
                ? "Nothing on your record needs your attention."
                : "The line below names what to fix."}
            </p>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <section className="border-t border-line bg-surface py-5">
          <h2 className="font-display text-[16px] font-bold">Platform Access</h2>
          <ul className="mt-3 space-y-3">
            {access.map((row) => (
              <li key={row.label} className="flex items-start gap-2.5">
                <Mark ok={row.ok} />
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-semibold">
                    {row.label}
                  </span>
                  <span className="block text-[13px] leading-relaxed text-ink-2">
                    {row.note}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {}
        </section>

        <section className="border-t border-line bg-surface py-5">
          <h2 className="font-display text-[16px] font-bold">Account Standing</h2>
          <ul className="mt-3 space-y-3">
            {standing.map((row) => (
              <li key={row.label} className="flex items-start gap-2.5">
                <Mark ok={row.ok} />
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-semibold">
                    {row.label}
                  </span>
                  <span className="block text-[13px] text-ink-2">{row.value}</span>
                </span>
              </li>
            ))}
          </ul>
          {}
        </section>
      </div>

      <EnforcementHistory />

      {}
      <section className="rounded-brand border border-magenta/25 bg-magenta/[0.04] p-5">
        <h2 className="font-display text-[16px] font-bold">Trust &amp; Safety Tips</h2>
        <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-ink-2">
          <li>
            Keep conversations and payments on Panameer — off-platform deals lose
            you contract protection and settlement.
          </li>
          <li>
            Never share passwords, one-time codes or banking details in a message,
            however convincing the request looks.
          </li>
          <li>
            Be wary of anyone asking you to pay to be considered for work. Panameer
            never charges a provider to bid.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          {POLICIES.map((policy) => (
            <Link
              key={policy.slug}
              href={`/policies/${policy.slug}`}
              className="min-h-11 bg-ink px-5 py-2.5 text-[14px] font-bold text-surface transition-colors hover:bg-magenta-dark"
            >
              {policy.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
    </>
  );
}

/** Met / not-met, as a mark rather than a colour alone — colour is not a label. */
function Mark({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={
        "mt-[3px] grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[11px] font-black text-white " +
        (ok ? "bg-emerald-500" : "bg-ink-2/30")
      }
    >
      {ok ? "✓" : "!"}
    </span>
  );
}
