import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { isMarketplaceVisible, ownedProviderProfile } from "@/lib/access";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { EnforcementHistory } from "@/components/console/EnforcementHistory";
import { POLICIES } from "@/lib/policies";

/**
 * ACCOUNT HEALTH CHECKLIST (J2.4 WS-E / E011).
 *
 * RENAMED from "Account Completeness Checklist", in the menu and here. The old
 * name described one of the two things the page shows and named the less
 * important one: completeness is already on My Profile with a meter beside it,
 * whereas standing — can you transact, is your record clear — appears nowhere
 * else. "Health" covers both; "Completeness" advertised a duplicate.
 *
 * TWO TILES, then enforcement history, then the safety banner. Platform access
 * answers "what can I do right now"; Account standing answers "am I in good
 * order". Both read real profile state — nothing here is stubbed except the
 * enforcement lists, which have no moderation system behind them yet and say so.
 *
 * BRAND PINK, NOT GREEN. The original was Upwork's palette straight through,
 * down to their shield glyph and a link to "Upwork's guidelines". Every button
 * here is magenta and every policy link points at a Panameer page.
 */
export const metadata = { title: "Account Health Checklist · Panameer" };

export default async function AccountHealthPage() {
  const viewer = await guardPage("canProvideServices");

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

  const visible = isMarketplaceVisible({
    status: profile.status,
    completeness: profile.completeness,
    paused_at: profile.paused_at,
  });

  /*
    PLATFORM ACCESS — what this account can do today, each line stating the
    consequence rather than the flag. "Email verified ✓" tells a provider
    nothing; "you can be contacted about work" tells them what it buys.
  */
  const access = [
    {
      label: "Sign in and manage your profile",
      ok: true,
      note: "Available on every account.",
    },
    {
      label: "Appear in buyer searches",
      ok: visible,
      note: visible
        ? "Your profile is live in the marketplace."
        : profile.paused_at
          ? "Paused by you — resume from Settings when you're ready."
          : `Reach ${VISIBILITY_THRESHOLD}% profile completeness to switch this on.`,
    },
    {
      label: "Receive messages from buyers",
      ok: profile.available_for_messages,
      note: profile.available_for_messages
        ? "You're marked online for messages."
        : "You've switched off 'Online for messages' in the account menu.",
    },
    {
      label: "Sell service packages",
      ok: visible,
      note: visible
        ? "Your packages are purchasable."
        : "Service products go on sale when your profile is visible.",
    },
  ];

  /*
    ACCOUNT STANDING — the record. Deliberately three lines and no score: a
    numeric "health score" would be a made-up aggregate of things that mean
    different things, which is the sort of number My Stats is careful not to
    invent either.
  */
  const standing = [
    {
      label: "Account status",
      value: profile.status === "ACTIVE" ? "Active" : "Pending email verification",
      ok: profile.status === "ACTIVE",
    },
    {
      label: "Email verified",
      value: profile.person.user?.email_verified ? "Yes" : "Not yet",
      ok: !!profile.person.user?.email_verified,
    },
    {
      label: "Panameer validation",
      value:
        profile.validation_status === "VALIDATED"
          ? "Validated"
          : profile.validation_status === "REQUESTED"
            ? "Under review"
            : "Not requested",
      ok: profile.validation_status === "VALIDATED",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-brand border border-line bg-white p-5">
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
          {!visible && (
            <Link
              href="/join/provider?step=finish"
              className="mt-4 inline-block rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Finish Your Profile
            </Link>
          )}
        </section>

        <section className="rounded-brand border border-line bg-white p-5">
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
          {profile.validation_status === "NOT_REQUESTED" && (
            <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
              Validation is granted on merit and never sold. Ask for it from your
              profile once your work history is complete.
            </p>
          )}
        </section>
      </div>

      <EnforcementHistory />

      {/*
        TRUST & SAFETY — Panameer's own words. The original block was Upwork's
        copy with Upwork's shield beside it and a link to Upwork's guidelines,
        which on a competitor's product is not a small branding slip.
      */}
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
              className="rounded-full bg-magenta px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              {policy.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
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
