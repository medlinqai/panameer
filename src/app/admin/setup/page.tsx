import Link from "next/link";
import { ADMIN_NAV } from "@/lib/nav";

/**
 * Setup & Maintenance (E009) — the rail's top button.
 *
 * A hub rather than a page of its own: Scott's menu shows it as the way into
 * configuration, and every destination it would offer already exists in the
 * Configuration and Support groups. Duplicating them as a second set of screens
 * would be two places to change one thing.
 */
export default function Page() {
  const groups = ADMIN_NAV.filter((g) => g.title !== "Transaction Data");
  // The Learn authoring tool lives under Setup now (WS2): editing the catalog
  // is maintenance, not a transaction stream.
  const tools = [
    { label: "Learn Authoring", href: "/admin/setup/learn-authoring" },
    { label: "Load Lesson URLs From CSV", href: "/admin/setup/learn-authoring/bulk-urls" },
  ];
  return (
    <div className="mx-auto w-full max-w-4xl">
      <p className="text-[15px] text-ink-2">
        Configuration and support surfaces for the platform.
      </p>
      <section className="mt-7">
        <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">
          Content Tools
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {tools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-brand border border-line bg-white p-4 font-semibold transition-colors hover:border-magenta hover:text-magenta"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </section>

      {groups.map((g) => (
        <section key={g.title ?? ""} className="mt-7">
          <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">
            {g.title}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {g.items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="rounded-brand border border-line bg-white p-4 font-semibold transition-colors hover:border-magenta hover:text-magenta"
              >
                {i.label}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
