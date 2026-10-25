import { prisma } from "@/lib/prisma";
import { listConnections } from "@/lib/erp/connections";
import { ErpConnections } from "@/components/admin/ErpConnections";
import { ErpMessages } from "@/components/admin/ErpMessages";
import { ErpPoEmails, type PoEmailRow } from "@/components/admin/ErpPoEmails";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "ERP Connections · Admin · Panameer" };

// X-E001: ERP connections (admin only — the admin layout guards canAdminister).
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === "po-emails" ? "po-emails" : "connections";
  const [connections, accounts, messages, poEmails] = await Promise.all([
    listConnections(),
    prisma.pAccount.findMany({ where: { kind: { in: ["BUYER", "BOTH"] } }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 1000 }),
    prisma.erpMessage.findMany({ orderBy: { created_at: "desc" }, take: 200 }),
    prisma.erpPoEmail.findMany({ orderBy: { received_at: "desc" }, take: 200 }),
  ]);
  // PE-E005: the PO Emails tab.
  const orderNums = new Map((await prisma.workOrder.findMany({ where: { id: { in: poEmails.flatMap((p) => p.order_ids) } }, select: { id: true, order_number: true } })).map((o) => [o.id, o.order_number]));
  const poRows: PoEmailRow[] = poEmails.map((p) => ({
    id: p.id, at: p.received_at.toISOString().slice(0, 16).replace("T", " "), from: p.from_address, connection: connections.find((c) => c.id === p.connection_id)?.name ?? "—",
    poNumber: p.po_number, status: p.status, note: p.note, hasPdf: !!p.pdf_storage_path,
    orders: p.order_ids.map((id) => ({ id, number: orderNums.get(id) ?? "Order" })),
    checks: ((p.parsed as { checks?: PoEmailRow["checks"] } | null)?.checks) ?? [],
  }));
  const connName = new Map(connections.map((c) => [c.id, c.name]));
  const rows = messages.map((m) => ({
    id: m.id, at: m.created_at.toISOString().slice(0, 16).replace("T", " "), connection: connName.get(m.connection_id) ?? "—", direction: m.direction, type: m.type, status: m.status, payloadId: m.payload_id,
    related: [m.work_request_id && "request", m.work_order_id && "order", m.payment_request_id && "payment request"].filter(Boolean).join(" · ") || "—",
    response: m.response, error: m.last_error, body: m.body.slice(0, 20000),
  }));
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-1 text-[28px] font-bold">ERP Connections</h1>
      <p className="mb-5 text-[14px] text-ink-2">
        One per customer ERP. Outbound sending is {process.env.ERP_SEND_ENABLED?.trim() === "1" ? <b>on</b> : <b>off</b>} (ERP_SEND_ENABLED). Credentials stay out of the database: a connection names the env var that holds them.
      </p>
      <nav className="mb-4 flex gap-5 border-b border-line text-[14px]" data-erp-tabs>
        {([["connections", "Connections"], ["po-emails", `PO Emails${poRows.filter((p) => p.status === "NEEDS_REVIEW").length ? ` (${poRows.filter((p) => p.status === "NEEDS_REVIEW").length})` : ""}`]] as const).map(([k, l]) => (
          <Link key={k} href={k === "connections" ? "/admin/erp" : "/admin/erp?tab=po-emails"} aria-current={tab === k ? "page" : undefined} className={tab === k ? "border-b-[3px] border-magenta pb-2 font-semibold text-magenta-dark no-underline" : "pb-2.5 font-semibold text-ink no-underline"}>{l}</Link>
        ))}
      </nav>
      {tab === "po-emails" ? <ErpPoEmails rows={poRows} /> : <>
        <ErpConnections initial={connections} accounts={accounts} />
        <ErpMessages rows={rows} />
      </>}
    </div>
  );
}
