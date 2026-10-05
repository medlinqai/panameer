import Link from "next/link";
import { POLICIES } from "@/lib/policies";

export const metadata = { title: "Help · Panameer" };

// Support → Help: where to go for each kind of question.
export default function HelpPage() {
  const rows = [
    { title: "Something isn't working", line: "Tell us what happened; we reply on a ticket.", href: "/support/bug", link: "Report a Problem" },
    { title: "Follow up on a report", line: "Every report you sent and where it stands.", href: "/support/tickets", link: "Your Tickets" },
    ...POLICIES.map((p) => ({ title: p.title, line: "How Panameer works on this.", href: `/policies/${p.slug}`, link: "Read" })),
  ];
  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <h1 className="text-[26px] font-bold">Help</h1>
      <div className="mt-4 border-t border-line">
        {rows.map((r) => (
          <div key={r.href} className="flex items-center justify-between gap-4 border-b border-line py-3.5">
            <div>
              <b className="text-[15px]">{r.title}</b>
              <span className="block text-[13px] text-ink-2">{r.line}</span>
            </div>
            <Link href={r.href} className="whitespace-nowrap text-[13.5px] font-bold underline underline-offset-[3px]">
              {r.link}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
