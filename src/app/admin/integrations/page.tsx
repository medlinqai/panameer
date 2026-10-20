import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Integrations · Admin · Panameer" };

// SE-E007: the integration outbox — events waiting for other systems (first: provisioning on work_order.released).
export default async function Page() {
  const events = await prisma.integrationEvent.findMany({ orderBy: { created_at: "desc" }, take: 200 });
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-[24px] font-extrabold">Integrations</h1>
      <p className="mt-1 text-[14px] text-ink-2">Outbox for other systems. Nothing is sent yet — the provisioning app&apos;s API isn&apos;t defined; events wait as Pending.</p>
      <div className="mt-4 overflow-x-auto rounded-brand border border-line bg-white">
        <table className="w-full min-w-[720px] text-[13.5px]" data-integration-events>
          <thead className="bg-bg-soft text-left text-[12px] uppercase tracking-[0.06em] text-ink-3">
            <tr><th className="p-2.5">Created</th><th className="p-2.5">Type</th><th className="p-2.5">Status</th><th className="p-2.5">Work Order</th><th className="p-2.5">Payload</th></tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const p = e.payload as { workOrderNumber?: string; provider?: { label?: string; name?: string }; role?: string; buyerCompany?: { name?: string } };
              return (
                <tr key={e.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap p-2.5">{e.created_at.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="p-2.5 font-mono text-[12.5px]">{e.type}</td>
                  <td className="p-2.5 font-semibold">{e.status === "PENDING" ? "Pending" : e.status === "SENT" ? "Sent" : "Failed"}</td>
                  <td className="p-2.5">{e.work_order_id ? <Link href={`/orders/${e.work_order_id}`} className="font-semibold text-magenta-dark underline underline-offset-4">{p.workOrderNumber ?? "Open"}</Link> : "—"}</td>
                  <td className="p-2.5">
                    <p>{[p.buyerCompany?.name, p.provider?.name ?? p.provider?.label, p.role].filter(Boolean).join(" · ")}</p>
                    <details className="mt-1"><summary className="cursor-pointer text-[12.5px] text-ink-2">JSON</summary><pre className="mt-1 max-w-[560px] overflow-x-auto whitespace-pre-wrap text-[11.5px]">{JSON.stringify(e.payload, null, 2)}</pre></details>
                  </td>
                </tr>
              );
            })}
            {!events.length && <tr><td colSpan={5} className="p-4 text-ink-3">No events yet — one is written each time a Work Order is Released.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
