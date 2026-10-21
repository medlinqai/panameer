import { prisma } from "@/lib/prisma";
import { LINE_TYPE_LABEL, STYLE_LABEL, TAX_FLAG, TAX_NOTE } from "@/lib/work-order-styles";
import { providerNameForBuyer } from "@/lib/provider-number";
import { formatCents } from "@/lib/display";
import { PAYMENT_EVENT_LABEL } from "@/lib/billing-terms";

// WA-E003/E004: what each party accepts — work, provider, rate + recurrence, dates, location, settlement trigger, overtime, expenses, not-to-exceed.
const UNIT: Record<string, string> = { HOUR: "hour", DAY: "day", WEEK: "week", MONTH: "month" };
const CYCLE: Record<string, string> = { WEEKLY: "billed weekly", BIWEEKLY: "billed every 2 weeks", MONTHLY: "billed monthly", EVERY_90_DAYS: "billed every 90 days" };
const DURATION: Record<string, string> = { LT_1_MONTH: "Less than 1 month", ONE_TO_3_MONTHS: "1 to 3 months", THREE_TO_6_MONTHS: "3 to 6 months", GT_6_MONTHS: "6+ months" };

export async function OrderTermsBlock({ orderId, party }: { orderId: string; party?: "BUYER" | "PROVIDER" | string }) {
  const o = await prisma.workOrder.findUnique({
    where: { id: orderId },
    select: {
      description: true, currency: true, not_to_exceed_cents: true, provider_person_id: true, buyer_person_id: true, style: true,
      lines: { orderBy: { line_number: "asc" }, take: 1 },
      workRequest: { select: { job: { select: { worksite: true, city: true, state: true, location_country: true, duration: true } } } },
    },
  });
  if (!o) return null;
  const l = o.lines[0];
  const provider = await prisma.person.findUnique({ where: { id: o.provider_person_id }, select: { first_name: true, last_name: true, company: { select: { name: true } } } });
  const job = o.workRequest.job;
  // DB-E010: the buyer sees the provider number until the Work Order is Released.
  const providerShown = provider && party !== "PROVIDER" ? await providerNameForBuyer(o.buyer_person_id, o.provider_person_id, `${provider.first_name} ${provider.last_name}`.trim()) : null;
  const masked = !!providerShown && providerShown.startsWith("Provider ");
  const rows: [string, string | null][] = [
    ["Work", l?.description ?? o.description],
    ["Provider", masked ? providerShown : provider ? `${provider.company?.name && !provider.company.name.includes(provider.last_name) ? `${provider.company.name} · ` : ""}${provider.first_name} ${provider.last_name}` : null],
    ["Style", o.style ? STYLE_LABEL[o.style] : null],
    ["Line type", l ? `${LINE_TYPE_LABEL[l.transaction_type]} · ${TAX_FLAG[l.transaction_type]}` : null],
    ["Rate", l?.unit_price_cents != null ? `${formatCents(l.unit_price_cents, o.currency)} per ${UNIT[l.uom ?? ""] ?? (l.uom ?? "unit").toLowerCase()}${l.billing_cycle ? `, ${CYCLE[l.billing_cycle]}` : ""}` : l?.amount_cents != null ? formatCents(l.amount_cents, o.currency) : null],
    ["Dates", l?.service_start ? `${l.service_start.toISOString().slice(0, 10)} → ${l.service_end?.toISOString().slice(0, 10) ?? "…"}${job?.duration ? ` · ${DURATION[job.duration]}` : ""}` : null],
    ["Location", job ? [job.worksite ? job.worksite[0] + job.worksite.slice(1).toLowerCase() : null, [job.city, job.state, job.location_country].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || null : null],
    ["Payment Event", l?.payment_event ? PAYMENT_EVENT_LABEL[l.payment_event] : null],
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
      <p className="mt-3 text-[12.5px] text-ink-2" data-tax-note>{TAX_NOTE}</p>
    </section>
  );
}
