import { prisma } from "@/lib/prisma";
import { plural, type TalentStat } from "@/lib/talent-stats";

export async function workHeroStats(): Promise<TalentStat[]> {
  const [workRequests, workOrders, settlementRequests] = await Promise.all([
    prisma.workRequest.count(),
    prisma.workOrder.count(),
    prisma.settlementRequest.count(),
  ]);

  return [
    {
      value: String(workRequests),
      label: plural(workRequests, "Work Request"),
    },
    {
      value: String(workOrders),
      label: plural(workOrders, "Work Order"),
    },
    {
      value: String(settlementRequests),
      label: plural(settlementRequests, "Settlement Request"),
    },
  ];
}
