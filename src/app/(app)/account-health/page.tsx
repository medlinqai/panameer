import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
/* ⚠ `isMarketplaceVisible` AND `VISIBILITY_THRESHOLD` ARE NO LONGER IMPORTED
   (`E563` WS-A) — the three checks that read them folded into `/stats`.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   // import { isMarketplaceVisible, ownedProviderProfile } from "@/lib/access";
   // import { VISIBILITY_THRESHOLD } from "@/lib/completeness"; */
import { ownedProviderProfile } from "@/lib/access";
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
  /* ⚠ `authenticated` (`P2-J1.1-E040`) — ⚠ SUPERSEDED, quoted:
     `guardPage("canProvideServices")`. The null-profile empty state below is
     what makes this safe, and it was already here. */
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

  /*
    ⚠⚠ `visible` IS NO LONGER DERIVED HERE (`P2-J2-E563` WS-A). Marketplace
    visibility is the `/stats` `Profile` tile's question; this page's questions
    are all answered by `status`, `email_verified` and `available_for_messages`.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    // const visible = isMarketplaceVisible({
    //   status: profile.status,
    //   completeness: profile.completeness,
    //   paused_at: profile.paused_at,
    // });
    ⚠ `completeness`, `paused_at` and `validation_status` STAY IN THE SELECT
    above on purpose — they are three columns on a row this page already reads,
    they cost nothing, and WS-B/WS-C may want them back. Removing them would be
    the only irreversible part of a fold that is otherwise all copy.
  */

  /*
    PLATFORM ACCESS — what this account can do today, each line stating the
    consequence rather than the flag. "Email verified ✓" tells a provider
    nothing; "you can be contacted about work" tells them what it buys.
  */
  /*
    ── ⚠⚠ THE MARKETPLACE-VISIBILITY CHECKS FOLDED OUT (`P2-J2-E563` WS-A) ────

    ⚠ SUPERSEDED, quoted not deleted (`E164`). Both rows read the SAME boolean —
    `visible` — and both are now the `Profile` tile's first criterion on
    `/stats`, which is the only place the four criteria live:
    // {
    //   label: "Appear in buyer searches",
    //   ok: visible,
    //   note: visible
    //     ? "Your profile is live in the marketplace."
    //     : profile.paused_at
    //       ? "Paused by you - resume from Settings when you're ready."
    //       : `Reach ${VISIBILITY_THRESHOLD}% profile completeness to switch this on.`,
    // },
    // {
    //   label: "Sell service packages",
    //   ok: visible,
    //   note: visible
    //     ? "Your packages are purchasable."
    //     : "Service products go on sale when your profile is visible.",
    // },

    ⚠⚠ NOTHING IS DROPPED — the meaning of BOTH notes is carried by that
    criterion's own note, which names buyer discovery AND service products in
    one sentence, because one flag governs both.
    ⚠⚠⚠ THE SPLIT, AND IT IS THE RULE FOR ANY LATER ROW: `/stats` answers
    *"can buyers find me"*; THIS PAGE answers *"what is my account"*.
    ⚠ WHAT STAYS BELOW IS WHAT IS GENUINELY ACCOUNT. DO NOT EMPTY THIS PAGE.
  */
  const access = [
    {
      label: "Sign in and manage your profile",
      ok: true,
      note: "Available on every account.",
    },
    {
      label: "Receive messages from buyers",
      ok: profile.available_for_messages,
      note: profile.available_for_messages
        ? "You're marked online for messages."
        : "You've switched off 'Online for messages' in the account menu.",
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
    /*
      ⚠⚠ `Panameer validation` FOLDED OUT (`P2-J2-E563` WS-A) — it is the fourth
      criterion on `/stats`, and this was the THIRD copy of it.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      // {
      //   label: "Panameer validation",
      //   value:
      //     profile.validation_status === "VALIDATED"
      //       ? "Validated"
      //       : profile.validation_status === "REQUESTED"
      //         ? "Under review"
      //         : "Not requested",
      //   ok: profile.validation_status === "VALIDATED",
      // },
    */
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
          {/*
            ⚠⚠ THE `Finish Your Profile` BUTTON GOES WITH THE CHECK IT SERVED
            (`P2-J2-E563` WS-A). It was conditional on `!visible`, and `visible`
            is no longer read on this page — the criterion it fixed now lives on
            `/stats`, WHERE THE SAME BUTTON RENDERS BESIDE IT.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            // {!visible && (
            //   <Link
            //     href="/join/provider?step=finish"
            //     className="mt-4 inline-block rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
            //   >
            //     Finish Your Profile
            //   </Link>
            // )}
            ⚠ LEAVING IT HERE WOULD HAVE BEEN THE DUPLICATION THIS BRIEF EXISTS
            TO REMOVE, one level down: the same action offered from two pages for
            a gate that only one of them still states.
          */}
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
          {/*
            ⚠⚠ THE VALIDATION NOTE GOES WITH ITS ROW (`P2-J2-E563` WS-A).
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            // {profile.validation_status === "NOT_REQUESTED" && (
            //   <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
            //     Validation is granted on merit and never sold. Ask for it from your
            //     profile once your work history is complete.
            //   </p>
            // )}
            ⚠⚠⚠ AND THE SECOND SENTENCE WAS FALSE — *"Ask for it from your
            profile"* POINTED AT A BUTTON THAT HAS NEVER EXISTED. Measured
            2026-09-19: `POST /api/settings/request-validation` has ZERO UI
            callers. ⚠ The merit half of the sentence is kept, and the
            instruction to do something impossible is not carried over.
            ⚠ Recorded for Scott at the WS-A gate.
          */}
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
