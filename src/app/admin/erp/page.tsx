import { prisma } from "@/lib/prisma";
import { listConnections } from "@/lib/erp/connections";
import { ErpConnections } from "@/components/admin/ErpConnections";

export const dynamic = "force-dynamic";
export const metadata = { title: "ERP Connections · Admin · Panameer" };

// X-E001: ERP connections (admin only — the admin layout guards canAdminister).
export default async function Page() {
  const [connections, accounts] = await Promise.all([
    listConnections(),
    prisma.pAccount.findMany({ where: { kind: { in: ["BUYER", "BOTH"] } }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 1000 }),
  ]);
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-1 text-[28px] font-bold">ERP Connections</h1>
      <p className="mb-5 text-[14px] text-ink-2">
        One per customer ERP. Outbound sending is {process.env.ERP_SEND_ENABLED?.trim() === "1" ? <b>on</b> : <b>off</b>} (ERP_SEND_ENABLED). Credentials are never stored here: a connection names the env var that holds them.
      </p>
      <ErpConnections initial={connections} accounts={accounts} />
    </div>
  );
}
