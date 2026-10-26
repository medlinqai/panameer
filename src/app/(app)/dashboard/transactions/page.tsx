import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buyerDashboard } from "@/lib/dashboard/buyer";
import { sellerDashboard } from "@/lib/dashboard/seller";
import { DashTable } from "@/components/dashboard/DashGlance";

export const metadata = { title: "My Transactions · Panameer" };

// JR-E009: the transactions table, off the dashboard — opened filtered from a pie, a slice or See All.
export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ side?: string; donut?: string; slice?: string; filter?: string }> }) {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login");
  const sp = await searchParams;
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) redirect("/dashboard");
  const side = sp.side === "provider" ? "provider" : "buyer";
  const data = side === "buyer" ? await buyerDashboard(viewer, me.id) : await sellerDashboard(me.id, viewer);
  const title = side === "buyer" ? "My Transactions" : "My Work";
  return (
    <div className="mx-auto mb-10 w-full max-w-6xl font-body text-ink" data-transactions={side}>
      <Link href="/dashboard" className="text-[13px] font-semibold text-ink-2 hover:text-ink">← Dashboard</Link>
      <h1 className="mt-2 text-[28px] font-extrabold leading-tight">{title}</h1>
      <DashTable rows={data.rows} filters={data.filters} title={sp.donut ? data.donuts.find((d) => d.key === sp.donut)?.title ?? title : "All"} whoLabel={side === "buyer" ? "Provider" : "Buyer"} side={side} initial={sp.filter} pick={sp.donut ? { donut: sp.donut, slice: sp.slice } : null} seeAll={false} />
    </div>
  );
}
