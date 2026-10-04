import { prisma } from "@/lib/prisma";

export type UsageStats = {
  connect: number;
  learn: number;
  work: number;
  sell: number;
  orders: number;
  earnedCents: number | null;
};

export async function getUsageStats(
  personId: string,
  profileId: string,
  learnPaths: number,
  colleagues: number
): Promise<UsageStats> {
  const [work, sell, orders] = await Promise.all([
    prisma.proposalRequest.count({
      where: { provider_person_id: personId, issued_at: { not: null } },
    }),
    prisma.serviceProduct.count({
      where: { provider_profile_id: profileId, status: "PUBLISHED" },
    }),
    prisma.workOrder.count({ where: { provider_person_id: personId } }),
  ]);

  const earnedCents = orders === 0 ? 0 : null;

  return { connect: colleagues, learn: learnPaths, work, sell, orders, earnedCents };
}
