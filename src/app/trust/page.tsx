import Link from "next/link";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

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

        {}
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

        {}
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
