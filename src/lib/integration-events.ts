import { prisma } from "@/lib/prisma";
import { providerLabel, providerNumbers } from "@/lib/provider-number";

// SE-E007: the integration outbox — one `work_order.released` row per Work Order, status Pending. No external call yet.
export async function recordWorkOrderReleased(orderId: string) {
  if (await prisma.integrationEvent.findFirst({ where: { type: "work_order.released", work_order_id: orderId }, select: { id: true } })) return;
  const wo = await prisma.workOrder.findUnique({
    where: { id: orderId },
    select: {
      order_number: true, period_start: true, period_end: true, p_account_id: true, provider_person_id: true,
      workRequest: { select: { job_id: true } },
    },
  });
  if (!wo) return;
  const [company, provider, job] = await Promise.all([
    prisma.company.findFirst({ where: { p_account_id: wo.p_account_id }, orderBy: { created_at: "asc" }, select: { name: true, code: true } }),
    prisma.person.findUnique({ where: { id: wo.provider_person_id }, select: { first_name: true, last_name: true, providerProfile: { select: { id: true } } } }),
    wo.workRequest.job_id ? prisma.job.findUnique({ where: { id: wo.workRequest.job_id }, select: { product: true, worksite: true, city: true, state: true, location_country: true, start_date: true, end_date: true, role: { select: { display: true, name: true } }, specificRole: { select: { name: true } }, pillar: { select: { name: true } }, skills: { select: { skill: { select: { name: true } } } } } }) : null,
  ]);
  const number = provider?.providerProfile ? (await providerNumbers([provider.providerProfile.id])).get(provider.providerProfile.id) : null;
  const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
  const payload = {
    workOrderNumber: wo.order_number,
    buyerCompany: { name: company?.name ?? null, code: company?.code ?? null },
    // Revealed now: the Work Order exists.
    provider: { number: number ?? null, label: providerLabel(number), name: provider ? `${provider.first_name} ${provider.last_name}`.trim() : null },
    role: job?.specificRole?.name ?? job?.role?.display ?? job?.role?.name ?? null,
    skills: job?.skills.map((s) => s.skill.name) ?? [],
    location: { worksite: job?.worksite ?? null, city: job?.city ?? null, state: job?.state ?? null, country: job?.location_country ?? null },
    start: day(wo.period_start ?? job?.start_date), end: day(wo.period_end ?? job?.end_date),
    systems: [job?.product, job?.pillar?.name].filter((x): x is string => !!x),
  };
  await prisma.integrationEvent.create({ data: { type: "work_order.released", work_order_id: orderId, payload } });
}
