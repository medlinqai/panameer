import { prisma } from "@/lib/prisma";
import { listConnections } from "@/lib/erp/connections";
import { ErpConnections } from "@/components/admin/ErpConnections";
import { ErpMessages } from "@/components/admin/ErpMessages";

export const dynamic = "force-dynamic";
export const metadata = { title: "ERP Connections · Admin · Panameer" };

// X-E001: ERP connections (admin only — the admin layout guards canAdminister).
export default async function Page() {
  const [connections, accounts, messages] = await Promise.all([
    listConnections(),
    prisma.pAccount.findMany({ where: { kind: { in: ["BUYER", "BOTH"] } }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 1000 }),
    prisma.erpMessage.findMany({ orderBy: { created_at: "desc" }, take: 200 }),
  ]);
  const connName = new Map(connections.map((c) => [c.id, c.name]));
  const rows = messages.map((m) => ({
    id: m.id, at: m.created_at.toISOString().slice(0, 16).replace("T", " "), connection: connName.get(m.connection_id) ?? "—", direction: m.direction, type: m.type, status: m.status, payloadId: m.payload_id,
    related: [m.work_request_id && "request", m.work_order_id && "order", m.settlement_request_id && "payment request"].filter(Boolean).join(" · ") || "—",
    response: m.response, error: m.last_error, body: m.body.slice(0, 20000),
  }));
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-1 text-[28px] font-bold">ERP Connections</h1>
      <p className="mb-5 text-[14px] text-ink-2">
        One per customer ERP. Outbound sending is {process.env.ERP_SEND_ENABLED?.trim() === "1" ? <b>on</b> : <b>off</b>} (ERP_SEND_ENABLED). Credentials are never stored here: a connection names the env var that holds them.
      </p>
      <ErpConnections initial={connections} accounts={accounts} />
      <ErpMessages rows={rows} />
    </div>
  );
}
