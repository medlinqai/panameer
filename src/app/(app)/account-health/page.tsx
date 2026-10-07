import Link from "next/link";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
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

export const metadata = { title: "Account Health Checklist · Panameer" };

// R-C3: built to mockups/score_health_clean_2026-10-03.html (Health half).
export default async function AccountHealthPage() {
  const viewer = await guardPage("authenticated");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      status: true,
      available_for_messages: true,
      person: { select: { user: { select: { email_verified: true } } } },
    },
  });

  if (!profile) {
    return <p className="text-ink-2">This account has no provider profile, so there is nothing to check yet.</p>;
  }

  const access = accountAccessLines({ availableForMessages: profile.available_for_messages });
  const standing = accountStandingLines({
    status: profile.status,
    emailVerified: !!profile.person.user?.email_verified,
  });
  const checks = [...access, ...standing];
  const { passing, failing } = accountCheckCounts([access, standing]);
  const summary = accountStandingSummary(standing);
  const statusValue = standing[0]?.value ?? "—";

  return (
    <div className="pm-white-page">
      <PageTabs
        wrap
        eyebrow={ACCOUNT_MENU_NAME}
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/account-health"
      />
      <div className="mx-auto max-w-[1010px]">

        <AccountHero
          picture={
            <>
              <HealthRing checks={checks.map((c) => c.ok)} />
              <p className="mt-2 text-center text-[11px] text-ink-2">
                {passing} of {checks.length} checks passing
              </p>
            </>
          }
          eyebrow="Health"
          title="Where Your Account Stands"
          kpiTestId="health-kpis"
          kpis={[
            { value: passing, label: "CHECKS PASSING" },
            { value: failing, label: "NEEDS ATTENTION" },
            { value: statusValue, label: "ACCOUNT STATUS" },
          ]}
          paragraph={
            failing === 0
              ? "All good. Nothing on your record needs your attention, and you can use every part of Panameer open to you today."
              : `${failing} check${failing === 1 ? "" : "s"} need${failing === 1 ? "s" : ""} attention${summary.ok ? "" : ` — ${summary.label}`}. The lines below say what to fix.`
          }
          actions={POLICIES.map((p, i) => (
            <Link key={p.slug} href={`/policies/${p.slug}`} className={i === 0 ? HERO_BTN : HERO_BTN_W}>
              {p.title}
            </Link>
          ))}
        />

        <div className="mt-9 grid border-t border-line md:grid-cols-2" data-testid="health-checks">
          <section className="py-5 md:pr-7">
            <h2 className="mb-1.5 text-[22px] font-bold">Platform Access</h2>
            {access.map((row) => (
              <Check key={row.label} ok={row.ok} label={row.label} detail={row.note} />
            ))}
          </section>
          <section className="border-t border-line py-5 md:border-l md:border-t-0 md:pl-7">
            <h2 className="mb-1.5 text-[22px] font-bold">Account Standing</h2>
            {standing.map((row) => (
              <Check key={row.label} ok={row.ok} label={row.label} detail={row.value} />
            ))}
          </section>
        </div>

        <EnforcementHistory />

        <h2 className="mb-1.5 border-t border-line pt-[30px] text-[22px] font-bold">Trust &amp; Safety Tips</h2>
        <ul>
          {[
            "Keep conversations and payments on Panameer — off-platform deals lose you contract protection and settlement.",
            "Never share passwords, one-time codes or banking details in a message, however convincing the request looks.",
            "Be wary of anyone asking you to pay to be considered for work. Panameer never charges a provider to bid.",
          ].map((t) => (
            <li key={t} className="border-t border-line py-2.5 text-[14px] text-ink-2">
              {t}
            </li>
          ))}
        </ul>
        <div className="h-[60px]" />
      </div>
    </div>
  );
}

function Check({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div data-ok={ok} className="flex items-start border-t border-line py-2.5 text-[14px]">
      <span
        aria-hidden
        className={
          "mr-2.5 mt-px inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[11px] " +
          (ok ? "bg-ink text-surface" : "border-2 border-magenta text-magenta")
        }
      >
        {ok ? "✓" : "!"}
      </span>
      <span>
        {label}
        <span className="mt-0.5 block text-[12px] text-ink-2">{detail}</span>
      </span>
    </div>
  );
}

// One ring segment per check: ink when passing, magenta when it needs attention.
function HealthRing({ checks }: { checks: boolean[] }) {
  const n = Math.max(checks.length, 1);
  const r = 92;
  const arc = (i: number) => {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const p = (a: number) => `${120 + r * Math.cos(a)} ${120 + r * Math.sin(a)}`;
    return `M${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
  };
  const allOk = checks.every(Boolean);
  return (
    <svg
      viewBox="0 0 240 240"
      className="mx-auto block w-full max-w-[300px]"
      role="img"
      aria-label={`${checks.filter(Boolean).length} of ${checks.length} checks passing`}
    >
      <g fill="none" strokeWidth="22">
        {checks.map((ok, i) => (
          <path key={i} d={arc(i)} className={ok ? "stroke-ink" : "stroke-magenta"} />
        ))}
      </g>
      <g className="stroke-surface" strokeWidth="4">
        {checks.map((_, i) => (
          <line key={i} x1="120" y1="17" x2="120" y2="40" transform={`rotate(${(i * 360) / n} 120 120)`} />
        ))}
      </g>
      {allOk ? (
        <path d="M96 120 l16 16 l32 -34" fill="none" className="stroke-magenta" strokeWidth="10" strokeLinecap="square" />
      ) : (
        <text x="120" y="132" textAnchor="middle" fontSize="44" fontWeight="600" className="fill-magenta">
          {checks.filter((c) => !c).length}
        </text>
      )}
      <text x="120" y="168" textAnchor="middle" fontSize="13" fontWeight="700" className="fill-ink">
        {allOk ? "ALL GOOD" : "NEEDS ATTENTION"}
      </text>
    </svg>
  );
}
