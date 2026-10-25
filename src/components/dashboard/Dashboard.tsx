import type { Viewer } from "@/lib/access";
import { buyerDashboard } from "@/lib/dashboard/buyer";
import { sellerDashboard } from "@/lib/dashboard/seller";
import { DashboardTop } from "@/components/dashboard/DashboardTop";

// MD-E003/E004: the dashboard — 1 · Things You Need to Do, then 2 · My Progress.
export async function Dashboard({ viewer, side, personId, firstName }: { viewer: Viewer; side: "buyer" | "provider"; personId: string; firstName: string }) {
  const data = side === "buyer" ? await buyerDashboard(viewer, personId) : await sellerDashboard(personId);
  return (
    <div className="mb-10">
      <DashboardTop viewer={viewer} side={side} firstName={firstName} data={data} />
    </div>
  );
}
