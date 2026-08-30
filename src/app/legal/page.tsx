import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { LEGAL_UPDATED } from "@/content/legal/meta";
import { SUPPLEMENTS } from "@/content/legal/supplements";
import { GROUPS, SUPPLEMENT_META, type SupplementGroup } from "@/content/legal/supplement-meta";
import { LegalDocNav } from "@/components/legal/LegalDocNav";

export const metadata = { title: "Legal — Panameer" };

/**
 * The legal index (brief_legal_supplements WS-A/D).
 *
 * ONE PAGE THAT LISTS EVERY DOCUMENT. Before this, the corpus was reachable
 * only through whichever link happened to mention a given document, and three
 * of the four core agreements cited supplements that had no page at all. This
 * is what the footer points at.
 *
 * The core agreements are listed FIRST and separately, because they are the
 * ones a person actually accepts. Everything else is a supplement to them.
 *
 * Grouped rather than alphabetical: nineteen legal titles in one list is a wall,
 * and the groups answer the question people arrive with — "where are the
 * payment terms", "what do you do with my data".
 */
const CORE = [
  {
    href: "/terms",
    title: "Terms of Use",
    summary: "The rules for using the site — what you may and may not do here.",
  },
  {
    href: "/user-agreement",
    title: "User Agreement",
    summary:
      "The binding agreement between you and Panameer: accounts, Work Orders, fees, payment, disputes.",
  },
  {
    href: "/privacy",
    title: "Privacy Policy",
    summary: "What Panameer collects, why, and who it is shared with.",
  },
  {
    href: "/company-terms",
    title: "Company Terms of Service",
    summary:
      "Accepted by a company's admin on the entity's behalf. Not yet written.",
  },
];

export default function LegalIndexPage() {
  const byGroup = new Map<SupplementGroup, { slug: string; title: string; summary: string }[]>();
  for (const s of SUPPLEMENTS) {
    const meta = SUPPLEMENT_META[s.slug];
    if (!meta) continue;
    const list = byGroup.get(meta.group) ?? [];
    list.push({ slug: s.slug, title: meta.title, summary: meta.summary });
    byGroup.set(meta.group, list);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      {/* Public content -> the public nav (WS-B), not a bare wordmark. */}
      <MarketingHeader />

      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-6 py-12 lg:flex-row lg:gap-12">
        <aside className="order-2 w-full shrink-0 border-t border-line pt-8 lg:order-1 lg:w-[248px] lg:border-0 lg:pt-0">
          <LegalDocNav />
        </aside>

        <main className="order-1 min-w-0 max-w-3xl flex-1 lg:order-2">
        <h1 className="font-display text-[32px] font-bold tracking-[-0.6px]">Legal</h1>
        <p className="mt-3 text-[16.5px] leading-relaxed text-ink-2">
          Every agreement, policy and supplement that governs using Panameer.
        </p>

        <div className="mt-5 rounded-brand border-[1.5px] border-amber-300 bg-amber-50 px-5 py-4">
          <p className="text-[15px] font-bold text-amber-900">
            Draft — pending legal review · last updated {LEGAL_UPDATED}
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-amber-900/85">
            The whole corpus is working-draft text, not final binding terms, and
            is with Panameer&apos;s counsel. Several documents describe payment
            flows and obligations Panameer is still building; those say so on
            their own pages. Questions:{" "}
            <a
              href="mailto:hello@panameer.com"
              className="font-semibold underline hover:no-underline"
            >
              hello@panameer.com
            </a>
            .
          </p>
        </div>

        <Section title="The Agreements You Accept">
          {CORE.map((d) => (
            <Row key={d.href} href={d.href} title={d.title} summary={d.summary} />
          ))}
        </Section>

        {GROUPS.map((group) => {
          const docs = byGroup.get(group);
          if (!docs?.length) return null;
          return (
            <Section key={group} title={group}>
              {docs.map((d) => (
                <Row
                  key={d.slug}
                  href={`/legal/${d.slug}`}
                  title={d.title}
                  summary={d.summary}
                />
              ))}
            </Section>
          );
        })}

        <Link
          href="/"
          className="mt-12 inline-flex text-[14.5px] font-bold text-magenta hover:underline"
        >
          ← Back to Panameer
        </Link>
        </main>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="border-b border-line pb-2 font-display text-[19px] font-bold">
        {title}
      </h2>
      <ul className="mt-3 space-y-1">{children}</ul>
    </section>
  );
}

function Row({ href, title, summary }: { href: string; title: string; summary: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group -mx-3 block rounded-brand px-3 py-2.5 transition-colors hover:bg-bg-soft"
      >
        <span className="text-[15.5px] font-bold group-hover:text-magenta">
          {title}
        </span>
        <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-2">
          {summary}
        </span>
      </Link>
    </li>
  );
}
