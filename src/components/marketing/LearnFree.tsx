import Link from "next/link";
import { Eyebrow, H2, Lead } from "@/components/marketing/section";

/**
 * The free-learning showcase (E012).
 *
 * THE CHIPS WERE `<span>`s — nine domain names styled like buttons with nothing
 * behind them. That is the same dead-end the hero's role chips were, on the one
 * section whose whole claim is "this is free, come and use it".
 *
 * AND THREE OF THE NINE NAMED PATHS THAT DO NOT EXIST. "Oracle Cloud
 * Foundations", "Oracle Business Network" and "Project Portfolio Mgmt." have no
 * learning path behind them in the catalog, so wiring them anywhere would have
 * been a link to a 404 or a bait-and-switch into a list that does not contain
 * what was clicked. They are replaced by real published paths rather than
 * pointed at something adjacent — a front door should not advertise a course
 * nobody can take.
 *
 * HARDCODED, NOT QUERIED, and that is deliberate: this page is statically
 * rendered and a Prisma read here would make the marketing home dynamic on
 * every request to save a list that changes a few times a year. The trade is
 * that this list can drift from the catalog — which is what the "See every
 * learning path" link is for, since that page is always current.
 */
const PATHS: { label: string; slug: string }[] = [
  { label: "Beginners", slug: "end-user-beginners" },
  { label: "Basic Procurement", slug: "end-user-procurement-basic-procurement" },
  { label: "Advanced Procurement", slug: "end-user-procurement-advanced-procurement" },
  { label: "Contract Management", slug: "end-user-procurement-contract-management" },
  { label: "Basic Payables", slug: "end-user-accounting-basic-payables" },
  { label: "Journals", slug: "end-user-finance-accounting-journals" },
  {
    label: "Inventory Management",
    slug: "end-user-supply-chain-execution-inventory-management",
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
        <H2>Learn to use applications — free</H2>
        <Lead>
          Guided learning paths and courses across the enterprise stack, open to
          everyone.
        </Lead>
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
          <Link
            href="/learn"
            className="rounded-full border border-magenta bg-magenta/[0.06] px-[18px] py-2.5 font-bold text-magenta transition-colors hover:bg-magenta/[0.12]"
          >
            See every learning path →
          </Link>
        </div>
      </div>
    </section>
  );
}
