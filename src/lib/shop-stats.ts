import { prisma } from "@/lib/prisma";
import { plural, type TalentStat } from "@/lib/talent-stats";

export async function shopHeroStats(): Promise<TalentStat[]> {
  const [providers, products, workOrders] = await Promise.all([
    prisma.providerProfile.count(),
    prisma.serviceProduct.count({ where: { status: "PUBLISHED" } }),
    prisma.workOrder.count(),
  ]);

  return [
    {
      value: String(providers),
      label: plural(providers, "Service Provider"),
    },
    {
      value: String(products),
      label: plural(products, "Service Product"),
    },
    {
      value: String(workOrders),
      label: plural(workOrders, "Work Order"),
    },
  ];
}
