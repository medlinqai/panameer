import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { activeMsa } from "@/lib/agreements";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agreements · Admin · Panameer" };

// MS-E003: Admin › Agreements — every MSA with its SOW count; open one to see all SOWs, filterable by buyer and provider.
export default async function Page() {
  await activeMsa();
  const rows = await prisma.agreement.findMany({ orderBy: { effective_date: "desc" } });
  const counts = await Promise.all(rows.map((a) => prisma.workOrder.count({ where: { agreement_id: a.id } })));
  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-[28px] font-bold">Agreements</h1>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {rows.map((a, i) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span><Link href={`/agreements/${a.id}`} className="font-mono font-bold hover:underline">{a.agreement_number}</Link> · {a.title} · v{a.version}</span>
            <span className="text-[13.5px]">{counts[i]} SOWs · {a.status === "ACTIVE" ? "Active" : "Superseded"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
