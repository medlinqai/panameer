import { prisma } from "@/lib/prisma";
import { BUYER_KEYS, SELLER_KEYS } from "@/lib/dashboard/progress";

// MD-E005: the Panameer Targets — the My Progress marker until a group reaches 20. Defaults live here; Admin overrides them.
export const DEFAULT_TARGETS: Record<string, { value: number; label: string }> = {
  "seller.connect.invited": { value: 20, label: "Invited" }, "seller.connect.connected": { value: 35, label: "Connected" }, "seller.connect.mentoring": { value: 2, label: "Mentoring" }, "seller.connect.introduced": { value: 3, label: "Introduced You" },
  "seller.courses.published": { value: 0, label: "Published (all courses)" }, "seller.courses.matched": { value: 10, label: "Matched to You" }, "seller.courses.enrolled": { value: 5, label: "Enrolled" }, "seller.courses.taken": { value: 4, label: "Taken" }, "seller.courses.certified": { value: 3, label: "Certified" },
  "seller.orders.offered": { value: 6, label: "Offered" }, "seller.orders.accepted": { value: 5, label: "Accepted" }, "seller.orders.delivered": { value: 4, label: "Delivered" }, "seller.orders.on_time": { value: 4, label: "On Time (90% of delivered)" },
  "seller.payments.earned": { value: 15000, label: "Earned ($)" },
  "buyer.connect.invited": { value: 15, label: "Invited" }, "buyer.connect.connected": { value: 25, label: "Connected" }, "buyer.connect.mentors": { value: 1, label: "Mentors" },
  "buyer.jobs.published": { value: 4, label: "Published" }, "buyer.jobs.availability": { value: 4, label: "Availability Requested" }, "buyer.jobs.interviewed": { value: 2, label: "Interviewed" }, "buyer.jobs.hired": { value: 2, label: "Filled" },
  "buyer.shop.viewed": { value: 18, label: "Viewed (days in Shop)" }, "buyer.shop.ordered": { value: 3, label: "Ordered" }, "buyer.shop.delivered": { value: 3, label: "Delivered" },
  "buyer.orders.created": { value: 6, label: "Created" }, "buyer.orders.active": { value: 2, label: "Active" }, "buyer.orders.approved": { value: 4, label: "Approved Delivery" }, "buyer.orders.on_time": { value: 5, label: "On Time" },
  "buyer.payments.paid": { value: 30000, label: "Paid ($)" },
};

export type TargetRow = { metric: string; value: number; label: string; saved: boolean };
export async function targetRows(role: "BUYER" | "SELLER"): Promise<TargetRow[]> {
  const saved = await prisma.performanceTarget.findMany({ where: { role }, select: { metric: true, value: true, label: true } });
  return (role === "SELLER" ? SELLER_KEYS : BUYER_KEYS).map((k) => {
    const s = saved.find((r) => r.metric === k);
    return { metric: k, value: s ? Number(s.value) : DEFAULT_TARGETS[k]?.value ?? 0, label: s?.label ?? DEFAULT_TARGETS[k]?.label ?? k, saved: !!s };
  });
}
