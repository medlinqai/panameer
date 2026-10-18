import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { HELP_TYPES, listHelpLinks } from "@/lib/help-links";
import { HelpTypeIcon } from "@/components/help/HelpTypeIcon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Help · Panameer" };

// SH2-E008: Shop's Help tile — links that help beginners; each opens inside Panameer.
export default async function Page() {
  await guardPage("authenticated");
  const links = await listHelpLinks();
  return (
    <div className="pm-white-page mx-auto w-full max-w-3xl">
      <p className="mt-2 text-[13px]"><Link href="/shop" className="font-semibold text-magenta-dark">← Shop</Link></p>
      <h1 className="mt-1 text-[26px] font-extrabold">Help</h1>
      <p className="text-[14px] text-ink-2">Don&apos;t know what to do? Start here.</p>
      {links.length === 0 ? (
        <p className="mt-5 text-[14px] text-ink-3">No links yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line" data-help-links>
          {links.map((l) => (
            <li key={l.id}>
              <Link href={`/help/view/${l.id}`} className="flex items-start gap-3 py-3.5 hover:bg-bg-soft">
                <HelpTypeIcon type={l.type} className="mt-0.5 h-6 w-6 shrink-0 text-magenta" />
                <span className="min-w-0">
                  <b className="block text-[15px]">{l.title}</b>
                  {l.description && <span className="block text-[13px] text-ink-2">{l.description}</span>}
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">{HELP_TYPES.find((t) => t.value === l.type)?.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
