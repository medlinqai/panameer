import Link from "next/link";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs, ACCOUNT_MENU_NAME } from "@/lib/profile-tabs";
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
import { accountStandingLines, accountStandingSummary } from "@/lib/account-standing";
import { PatternHeader } from "@/components/casing/PatternHeader";
import { profileTabLabel } from "@/lib/profile-tabs";

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
  /*
    ⚠⚠ MOVED TO `lib/account-standing.ts` (`P2-A2-E598` WS-A). The avatar menu's
    `Account Health` row shows *"All good"* or the problem, and computing that
    beside this list would be `E585` — two computations of one concept kept in
    step by hand. ⚠ THE LINES AND THE ORDER ARE UNCHANGED; the superseded inline
    array is quoted there, with the folded-out `Panameer validation` line.
  */
  const standing = accountStandingLines({
    status: profile.status,
    emailVerified: !!profile.person.user?.email_verified,
  });

  /*
    ── ⚠⚠ THE HEADER'S TWO FIGURES, COUNTED FROM THE PAGE'S OWN ROWS ────────

    ⚠⚠⚠ **ONE COMPUTATION, NOT A SECOND SOURCE.** These count `access` and
    `standing` — **the exact arrays the two cards below render** — so the header
    and the lists cannot disagree about how many checks pass. ⚠ Counting a copy
    of the rules instead would be `E585`, and it is the defect `E659` found on
    `/stats` this morning: two readings of one fact, three lines apart.
    ⚠ `summary` is the SHIPPED definition (`accountStandingSummary`), not a
    third computation — see the header's own block for why that matters.
  */
  const allChecks = [...access.map((a) => a.ok), ...standing.map((s) => s.ok)];
  const checksPassing = allChecks.filter(Boolean).length;
  const checksFailing = allChecks.length - checksPassing;
  const summary = accountStandingSummary(standing);

  return (
    <>
      {/* ⚠⚠ THE PROFILE TAB ROW (`P2-A2-E600` WS-A) — one row for every page
          under the avatar, using the same words as the menu. */}
      <PageTabs
        wrap
        eyebrow={ACCOUNT_MENU_NAME}
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/account-health"
      />
    <div className="mx-auto max-w-4xl space-y-4">
      {/*
        ── ⚠⚠⚠ THE HEADER GRAPHIC (brief 10, ruling 23) ─────────────────────

        ⚠ THE BRIEF: *"Account Health — not in the correct format; **needs a
        graphic at the top** (the pattern's header picture)."*

        ── ⚠⚠⚠ WHAT THE GRAPHIC IS **NOT**, AND THE PAGE ITSELF IS WHY ──────

        ⚠⚠ **IT IS NOT A HEALTH SCORE, AND NOT A RING.** This page's own
        docblock rules that out in writing: *"Deliberately three lines and no
        score: a numeric 'health score' would be a made-up aggregate of things
        that mean different things."* ⚠⚠⚠ **SO A PERCENTAGE RING HERE WOULD
        CONTRADICT THE PAGE ON ITS OWN SCREEN** — the `/stats` defect from
        earlier today (`E659`), where two definitions of one fact sat three
        lines apart. ⚠ Counting rule 2 says the same thing from the other side:
        **a chart is a figure**, so a fabricated chart is a fabricated figure.

        ⚠⚠ **AND IT IS NOT THE FOUR CHECKS REDRAWN.** Picturing the same rows
        the two cards below already list is de-duplicating nothing and repeating
        data — *"looks like a menu within the menu"* (ruling 77) in graphic form.

        ── ⚠⚠ WHAT IT IS: THE ONE-WORD ANSWER THAT ALREADY SHIPS ────────────

        ⚠⚠⚠ `accountStandingSummary` IS AN EXISTING SINGLE DEFINITION — the
        avatar menu's `Account Health` row already renders it, and it was
        extracted to `lib/account-standing.ts` at `E598` **precisely so a second
        computation of "am I in good order" could not exist** (`E585`). ⚠ Using
        it here adds a THIRD RENDER of one computation, which is allowed; a
        third COMPUTATION would not be.
        ⚠ Its contract, inherited not re-derived: it reports **the problem, not
        a count** — *"a row reading '1 issue' would make you open the page to
        find out which, and that is the question the row exists to answer."*

        ⚠⚠ **THE FIGURES ARE TWO, NOT THREE, AND THAT IS RULING 45(1)** —
        *"`PatternHeader` MUST NOT REQUIRE THREE — a required triple is what
        forces an invented figure."* ⚠ They count the page's OWN binary checks,
        each listed individually below; that is a count of items, not a score
        over them. ⚠⚠⚠ `Needs Attention` AT ZERO RENDERS `0` IN INK, not a dash
        — it is a measured zero (ruling 53c), and it is the number a member
        most wants to be zero.
      */}
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
              {/* ⚠ THE GLYPH CARRIES THE STATE AS WELL AS THE COLOUR — colour
                  is not a label. Same rule the `/stats` checklist marks follow. */}
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
        /* ⚠ NO ACTION. Every door this page owes — the policies, the profile —
           is already on it below, and ruling 45(4) forbids a button that
           repeats a link already on the page (`E579` in a nicer coat). */
      />
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
