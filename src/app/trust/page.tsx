import Link from "next/link";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

/**
 * `/trust` — WHAT PANAMEER CHECKS, SAID OUT LOUD (`P1-ALL-E035`).
 *
 * **SCOTT, 2026-09-02:** *"this needs to be detailed in the ToS and given at a
 * high level in the site instructions."* The detail is Terms of Use section 5;
 * this is the high-level version.
 *
 * ── ⚠⚠ EVERY SENTENCE MAPS TO A ToS CLAUSE, AND THAT IS THE POINT ────────────
 *
 * A marketing page that claims more than the terms is the classic failure and it
 * is worse than saying nothing. So each paragraph below is the plain-language
 * form of one numbered clause, and `check:trust-claims` asserts the mapping by
 * token rather than trusting this comment:
 *
 *   "controls the email address"      -> ToS 5.1
 *   "registered entity" / "register"  -> ToS 5.1
 *   "did work for a client"           -> ToS 5.1
 *   "not competence or quality"       -> ToS 5.2
 *   "cannot guarantee delivery"       -> ToS 5.3
 *   "act on what we learn"            -> ToS 5.4
 *
 * ⚠⚠ NO BADGE, NO SEAL, NO SHIELD, NO "TRUSTED MARKETPLACE" MARK. A trust emblem
 * is itself a claim, and Panameer has not earned one. Words only — there is not
 * so much as an icon on this page, deliberately.
 *
 * ⚠⚠ THE COMPANY CHECK IS DESCRIBED IN THE CONDITIONAL, BECAUSE IT IS NOT BUILT.
 * `E282` — entity validation — does not exist: there is no Secretary-of-State
 * route anywhere in the codebase. So this page says WHERE the answer appears
 * (on the profile) rather than asserting the check has run, which is the same
 * shape ToS 5.1 uses. ⚠ WHEN `E282` LANDS, NOTHING HERE NEEDS REWRITING — the
 * profile starts saying so and this sentence is already true.
 *
 * ⚠ NO `.pm-home` WRAPPER AND NO `home.css`. This page renders no
 * marketing-home component — it is prose in a text column — so importing that
 * stylesheet would pull in its `*{margin:0;padding:0}` reset for nothing. The
 * `pm-solo` shading rule is about `.pm-home` pages and does not apply here.
 */
export const metadata: Metadata = {
  title: "What we check — Panameer",
  description:
    "What Panameer verifies about the people and companies on it, what it does not, and what happens when an engagement goes wrong.",
};

export default function TrustPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto w-full max-w-[760px] px-6 py-14 sm:py-20">
        <h1 className="font-display text-[34px] font-bold leading-[1.15] tracking-[-0.6px] sm:text-[40px]">
          What we check, and what we don&rsquo;t
        </h1>

        {/*
          ⚠⚠ FOUR SENTENCES-WORTH, AS THE BRIEF SPECIFIES — one paragraph per ToS
          clause. Resisting the urge to expand this is part of the work: every
          extra sentence is another claim to keep true.
        */}
        <div className="mt-7 grid gap-5 text-[17px] leading-relaxed text-ink-2">
          <p>
            <b className="text-ink">We verify what we assert, and we host what we don&rsquo;t.</b>{" "}
            We check that a person controls the email address they signed up with,
            that a company is a registered entity on the public register for its
            jurisdiction, and that a provider really did the work they claim for
            the client they name — that last one confirmed by someone at the
            client&rsquo;s own email domain, never from the provider&rsquo;s own
            inbox. Where we have run a check, the profile says so. Where it
            doesn&rsquo;t say so, we haven&rsquo;t.
          </p>
          <p>
            <b className="text-ink">Email tells you less than it looks like it does.</b>{" "}
            Confirming an email address proves someone can read that inbox and
            nothing more — not their name, not their employer, not who they are.
            Anyone can create an address and confirm it. It is the weakest of our
            three checks and we would rather you knew that.
          </p>
          <p>
            <b className="text-ink">We don&rsquo;t judge whether anyone is any good.</b>{" "}
            We do not assess competence or quality, we do not run background
            checks, and we do not test skills or interview anyone. Nobody here is
            endorsed or approved by us. That judgement is yours — our job is to
            put real evidence in front of you so you are deciding on facts.
          </p>
          <p>
            <b className="text-ink">
              We can&rsquo;t promise delivery. We can make failure recoverable.
            </b>{" "}
            Work is scoped into defined deliverables and priced in stages that add
            up to the whole, so an engagement that goes wrong stops where it went
            wrong rather than at the end. If you tell us something went wrong, we
            look at it and we act on it. Our responsibility scales with what we
            know: not knowing about a problem is defensible, knowing and staying
            quiet is not.
          </p>
        </div>

        {/*
          ⚠ THE POINTER TO THE DETAIL IS THE LAST THING, NOT THE FIRST. Somebody
          who wants the full version should be able to reach it in one click; the
          four paragraphs above should not be prefaced by a disclaimer.
        */}
        <p className="mt-9 border-t border-line pt-6 text-[15px] text-ink-2">
          The detailed version is section 5 of the{" "}
          <Link href="/terms" className="font-semibold text-magenta hover:underline">
            Terms of Use
          </Link>
          . If the two ever disagree, the Terms of Use is the one that counts.
        </p>
      </main>
      <MarketingFooter />
    </>
  );
}
