import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { activeMsa, sowsUnder } from "@/lib/agreements";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agreements · Panameer" };

// MS-E003: Orders › Agreements — the MSAs (Panameer Terms of Service) and how many of your Work Orders (SOWs) sit under each.
export default async function Page() {
  const viewer = await guardPage("authenticated");
  await activeMsa();
  const rows = await prisma.agreement.findMany({ orderBy: { effective_date: "desc" } });
  const counts = await Promise.all(rows.map(async (a) => (await sowsUnder(viewer, a.id)).length));
  return (
    <div className="pm-white-page mx-auto w-full max-w-4xl">
      <Link href="/orders" className="text-[13px] font-semibold text-ink-2 hover:text-ink">← Orders</Link>
      <h1 className="mt-2 font-display text-[28px] font-bold">Agreements</h1>
      <p className="text-[14px] text-ink-2">On Panameer the Terms of Service serve as the Master Services Agreement (MSA); every Order is a Statement of Work (SOW) under it.</p>
      <ul className="mt-4 divide-y divide-line border-y border-line" data-agreements>
        {rows.map((a, i) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <Link href={`/agreements/${a.id}`} className="font-mono text-[14.5px] font-bold hover:underline">{a.agreement_number}</Link>
              <p className="text-[13.5px] text-ink-2">{a.title} · v{a.version} · effective {a.effective_date.toISOString().slice(0, 10)}</p>
            </div>
            <span className="text-[13.5px]">{counts[i]} SOW{counts[i] === 1 ? "" : "s"} · <b>{a.status === "ACTIVE" ? "Active" : "Superseded"}</b></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
