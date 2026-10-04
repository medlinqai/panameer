import Link from "next/link";
import { SUPPLEMENTS } from "@/content/legal/supplements";
import { GROUPS, SUPPLEMENT_META, type SupplementGroup } from "@/content/legal/supplement-meta";

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
