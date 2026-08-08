import Link from "next/link";
import { Eyebrow, H2 } from "@/components/marketing/section";

/**
 * The free-learning showcase (E012).
 *
 * THE CHIPS WERE `<span>`s — nine domain names styled like buttons with nothing
 * behind them. That is the same dead-end the hero's role chips were, on the one
 * section whose whole claim is "this is free, come and use it".
 *
 * TWO OF SCOTT'S ORIGINAL NINE ARE BACK, with the mapping he confirmed (E219).
 * I had replaced all three unmatched names on the evidence available then —
 * that the catalog had no path by those titles. Two of them did have a path,
 * under a different title:
 *
 *   "Oracle Cloud Foundations"  IS  `end-user-beginners`. The path is literally
 *                                   the Oracle Cloud Foundations LP; only its
 *                                   catalog title says "Beginners". The chip
 *                                   carries the name buyers search for and the
 *                                   slug stays exactly as it was.
 *   "Oracle Business Network"   IS  content inside `…supplier-integration`.
 *
 * "Project Portfolio Mgmt." stays off: it has no dedicated path, Foundations
 * covers it, and a chip is not the place to explain that.
 *
 * The lesson worth keeping: a missing TITLE is not a missing PATH. Matching on
 * catalog titles found nothing for two paths that were there all along, and only
 * someone who knows the content could say so.
 *
 * HARDCODED, NOT QUERIED, and that is deliberate: this page is statically
 * rendered and a Prisma read here would make the marketing home dynamic on
 * every request to save a list that changes a few times a year. The trade is
 * that this list can drift from the catalog — which is what the "See every
 * learning path" link is for, since that page is always current.
 */
const PATHS: { label: string; slug: string }[] = [
  { label: "Oracle Cloud Foundations", slug: "end-user-beginners" },
  { label: "Basic Procurement", slug: "end-user-procurement-basic-procurement" },
  { label: "Advanced Procurement", slug: "end-user-procurement-advanced-procurement" },
  { label: "Contract Management", slug: "end-user-procurement-contract-management" },
  { label: "Basic Payables", slug: "end-user-accounting-basic-payables" },
  { label: "Journals", slug: "end-user-finance-accounting-journals" },
  {
    label: "Inventory Management",
    slug: "end-user-supply-chain-execution-inventory-management",
  },
  {
    label: "Oracle Business Network",
    slug: "end-user-procurement-supplier-integration",
  },
  { label: "Core HR", slug: "end-user-core-hr-core-hr" },
  { label: "Talent Mgmt", slug: "end-user-talent-mgmt-talent-mgmt" },
  { label: "Payroll Mgmt", slug: "end-user-payroll-payroll-mgmt" },
];

export function LearnFree() {
  return (
    <section id="learn" className="bg-bg-soft py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>Learn</Eyebrow>
        <H2>Learn to Use Applications — Free</H2>
        {/*
          E041/E042 — SCOTT'S COPY, AND FULL WIDTH.

          The previous line ("Guided learning paths and courses across the
          enterprise stack, open to everyone.") set a tone and explained
          nothing: it never said what a learning path IS, and never mentioned
          the certification, which is the reason to finish one.

          NOT the shared <Lead>, which caps at 780px. That measure is right for
          a one-line subhead and wrong for this: two sentences of definition
          broke to four short lines in an 1180px section and read as a
          paragraph someone forgot to widen. Full width takes it to two, which
          is what "full-width subhead" is asking for. Left in body case —
          subheads are not labels.
        */}
        <p className="mb-[34px] text-[18px] leading-relaxed text-ink-2">
          Learning paths group related courses — by business function or
          technology — into a guided sequence, each ending with an optional test
          and certification.
        </p>

        <div className="flex flex-wrap gap-3">
          {PATHS.map((p) => (
            <Link
              key={p.slug}
              href={`/learn/${p.slug}`}
              className="rounded-full border border-line bg-white px-[18px] py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
            >
              {p.label}
            </Link>
          ))}
          {/*
            `bg-magenta/6`, not `bg-magenta/[0.06]`. The arbitrary-decimal form
            compiles to NO RULE under Tailwind v4 — the class reaches the
            markup, the stylesheet never gets it, and this pill has been
            rendering with no fill and no hover state since it was written.
            Verified in the built CSS. The slash-integer form generates.
          */}
          <Link
            href="/learn"
            className="rounded-full border border-magenta bg-magenta/6 px-[18px] py-2.5 font-bold text-magenta transition-colors hover:bg-magenta/12"
          >
            See Every Learning Path →
          </Link>
        </div>
      </div>
    </section>
  );
}
