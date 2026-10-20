import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/display";

// WA-E003/E004: what each party accepts — work, provider, rate + recurrence, dates, location, settlement trigger, overtime, expenses, not-to-exceed.
const UNIT: Record<string, string> = { HOUR: "hour", DAY: "day", WEEK: "week", MONTH: "month" };
const CYCLE: Record<string, string> = { WEEKLY: "billed weekly", BIWEEKLY: "billed every 2 weeks", MONTHLY: "billed monthly", EVERY_90_DAYS: "billed every 90 days" };
const TRIGGER: Record<string, string> = { TIMESHEET: "Approved timesheet", INVOICE: "Invoice", PAYMENT_REQUEST: "Payment request", ACCEPTANCE: "Acceptance of the work", ORDER_ACCEPTED: "Order accepted", DOWNLOAD: "Download", INSTALLATION: "Installation" };
const DURATION: Record<string, string> = { LT_1_MONTH: "Less than 1 month", ONE_TO_3_MONTHS: "1 to 3 months", THREE_TO_6_MONTHS: "3 to 6 months", GT_6_MONTHS: "6+ months" };

export async function OrderTermsBlock({ orderId }: { orderId: string }) {
  const o = await prisma.workOrder.findUnique({
    where: { id: orderId },
    select: {
      description: true, currency: true, not_to_exceed_cents: true, provider_person_id: true,
      lines: { orderBy: { line_number: "asc" }, take: 1 },
      workRequest: { select: { job: { select: { worksite: true, city: true, state: true, location_country: true, duration: true } } } },
    },
  });
  if (!o) return null;
  const l = o.lines[0];
  const provider = await prisma.person.findUnique({ where: { id: o.provider_person_id }, select: { first_name: true, last_name: true, company: { select: { name: true } } } });
  const job = o.workRequest.job;
  const rows: [string, string | null][] = [
    ["Work", l?.description ?? o.description],
    ["Provider", provider ? `${provider.company?.name && !provider.company.name.includes(provider.last_name) ? `${provider.company.name} · ` : ""}${provider.first_name} ${provider.last_name}` : null],
    ["Rate", l?.unit_price_cents != null ? `${formatCents(l.unit_price_cents, o.currency)} per ${UNIT[l.uom ?? ""] ?? (l.uom ?? "unit").toLowerCase()}${l.billing_cycle ? `, ${CYCLE[l.billing_cycle]}` : ""}` : l?.amount_cents != null ? formatCents(l.amount_cents, o.currency) : null],
    ["Dates", l?.service_start ? `${l.service_start.toISOString().slice(0, 10)} → ${l.service_end?.toISOString().slice(0, 10) ?? "…"}${job?.duration ? ` · ${DURATION[job.duration]}` : ""}` : null],
    ["Location", job ? [job.worksite ? job.worksite[0] + job.worksite.slice(1).toLowerCase() : null, [job.city, job.state, job.location_country].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || null : null],
    ["Payment Event", l?.payment_event ? TRIGGER[l.payment_event] ?? l.payment_event : null],
    ["Overtime", l?.overtime_allowed == null ? null : l.overtime_allowed ? `Allowed at ${Number(l.overtime_multiplier ?? 1.5)}× the rate` : "Not allowed"],
    ["Expenses", l?.expenses_allowed == null ? null : l.expenses_allowed ? (l.expenses_cap_cents != null ? `Allowed up to ${formatCents(l.expenses_cap_cents, o.currency)}` : "Allowed") : "Not allowed"],
    ["Not to exceed", o.not_to_exceed_cents != null ? formatCents(o.not_to_exceed_cents, o.currency) : null],
  ];
  return (
    <section className="mt-6 rounded-brand border border-line bg-white p-5" data-order-terms>
      <h2 className="text-[17px] font-bold">Terms</h2>
      <dl className="mt-2 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-[180px_1fr]">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-ink-2">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </section>
  );
}
