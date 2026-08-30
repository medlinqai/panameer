import Link from "next/link";
import { SUPPLEMENTS } from "@/content/legal/supplements";
import { GROUPS, SUPPLEMENT_META, type SupplementGroup } from "@/content/legal/supplement-meta";

/**
 * The left-hand document list (legal_center design reference).
 *
 * THE WHOLE CORPUS, ON EVERY LEGAL PAGE. Twenty-three documents that constantly
 * cite each other are close to unusable one page at a time: the Privacy Policy
 * points at the Cookie Policy, the Terms of Use at Section 7 of the User
 * Agreement, the escrow instructions at the fee agreement. Following any of
 * those used to mean losing your place. With the list always present, a
 * cross-reference is a step sideways rather than a departure.
 *
 * SERVER COMPONENT, and the current document is passed in rather than read from
 * `usePathname`. These pages are static text and prerendered; making the shell
 * a client component to highlight one row would ship the whole nav's JavaScript
 * to every reader for a visual affordance a link colour already provides.
 */
export const CORE_DOCS = [
  { href: "/terms", slug: "terms", title: "Terms of Use" },
  { href: "/user-agreement", slug: "user-agreement", title: "User Agreement" },
  { href: "/privacy", slug: "privacy", title: "Privacy Policy" },
  { href: "/company-terms", slug: "company-terms", title: "Company Terms of Service" },
];

export function LegalDocNav({ current }: { current?: string }) {
  const byGroup = new Map<SupplementGroup, { slug: string; title: string }[]>();
  for (const s of SUPPLEMENTS) {
    const meta = SUPPLEMENT_META[s.slug];
    if (!meta) continue;
    const list = byGroup.get(meta.group) ?? [];
    list.push({ slug: s.slug, title: meta.title });
    byGroup.set(meta.group, list);
  }

  return (
    <nav
      aria-label="Legal documents"
      className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
    >
      <Link
        href="/legal"
        className="block text-[12.5px] font-bold uppercase tracking-wide text-ink-2 hover:text-magenta"
      >
        Legal Center
      </Link>

      <NavGroup title="The Agreements You Accept">
        {CORE_DOCS.map((d) => (
          <NavRow key={d.slug} href={d.href} title={d.title} active={current === d.slug} />
        ))}
      </NavGroup>

      {GROUPS.map((group) => {
        const docs = byGroup.get(group);
        if (!docs?.length) return null;
        return (
          <NavGroup key={group} title={group}>
            {docs.map((d) => (
              <NavRow
                key={d.slug}
                href={`/legal/${d.slug}`}
                title={d.title}
                active={current === d.slug}
              />
            ))}
          </NavGroup>
        );
      })}
    </nav>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-2/70">
        {title}
      </p>
      <ul className="mt-1.5 space-y-0.5">{children}</ul>
    </div>
  );
}

function NavRow({
  href,
  title,
  active,
}: {
  href: string;
  title: string;
  active?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={
          "-ml-2 block rounded-[8px] border-l-2 py-1 pl-3 pr-2 text-[13.5px] leading-snug transition-colors " +
          (active
            ? "border-magenta bg-magenta/[0.06] font-bold text-magenta"
            : "border-transparent text-ink-2 hover:border-line hover:text-ink")
        }
      >
        {title}
      </Link>
    </li>
  );
}
