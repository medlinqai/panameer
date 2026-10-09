import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { listProviderServices } from "@/lib/provider-services";
import { listOwnServiceProducts } from "@/lib/service-products";
import { EstimateWizard, type EstLine, type EstimateDraft } from "@/components/catalog/EstimateWizard";
import { BackLink } from "@/components/console/BackLink";

export const metadata = { title: "Create a Cost Estimate · Panameer" };
export const dynamic = "force-dynamic";

const toLine = (l: { kind: "SERVICE" | "FIXED" | "NOT_TO_EXCEED"; description: string; provider_service_id: string | null; uom: string | null; quantity: unknown; rate_cents: number | null; amount_cents: number | null }): EstLine => ({
  kind: l.kind, description: l.description, providerServiceId: l.provider_service_id, uom: l.uom ?? "HOUR",
  quantity: l.quantity == null ? "" : String(Number(l.quantity)), rate: l.rate_cents ? (l.rate_cents / 100).toFixed(2) : "", amount: l.amount_cents ? (l.amount_cents / 100).toFixed(2) : "",
});

// CAT-E006: create or revise (?id=) a cost estimate.
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; to?: string }> }) {
  const viewer = await guardPage("canProvideServices");
  const sp = await searchParams;
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, last_name: true } });
  if (!me) return null;
  const conns = await prisma.connection.findMany({ where: { kind: "COLLEAGUE", status: "ACCEPTED", OR: [{ from_user_id: viewer.userId }, { to_user_id: viewer.userId }] }, select: { from_user_id: true, to_user_id: true }, take: 500 });
  const others = conns.map((c) => (c.from_user_id === viewer.userId ? c.to_user_id : c.from_user_id));
  const people = await prisma.person.findMany({ where: { user_id: { in: others } }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } } }, orderBy: { first_name: "asc" } });
  const proposals = await prisma.proposal.findMany({ where: { provider_person_id: me.id }, select: { work_request_id: true }, take: 200 });
  const wrs = await prisma.workRequest.findMany({ where: { id: { in: proposals.map((p) => p.work_request_id).filter((x): x is string => !!x) }, status: { in: ["POSTED", "ASSIGNED"] } }, select: { id: true, title: true } });
  const [services, products, past] = await Promise.all([
    listProviderServices(viewer).catch(() => []),
    listOwnServiceProducts(viewer).catch(() => []),
    prisma.costEstimate.findMany({ where: { provider_person_id: me.id }, orderBy: { created_at: "desc" }, take: 20, include: { revisions: { orderBy: { revision_number: "desc" }, take: 1, include: { lines: { orderBy: { line_number: "asc" } } } } } }),
  ]);
  const editing = sp.id ? past.find((e) => e.id === sp.id) ?? null : null;
  const rev = editing?.revisions[0];
  const initial: EstimateDraft = {
    id: editing?.id ?? null,
    customerPersonId: editing?.customer_person_id ?? (sp.to && people.some((p) => p.id === sp.to) ? sp.to : ""),
    customerEmail: editing?.customer_email ?? "",
    toEmail: !!editing?.customer_email && !editing.customer_person_id,
    workRequestId: editing?.work_request_id ?? "",
    validUntil: (editing?.valid_until ?? new Date(Date.now() + 30 * 86_400_000)).toISOString().slice(0, 10),
    title: editing?.title ?? "",
    scope: rev?.scope ?? "", assumptions: rev?.assumptions ?? "", exclusions: rev?.exclusions ?? "", message: rev?.message ?? "",
    paymentTerms: rev?.payment_terms ?? "NET30", billingCycle: rev?.billing_cycle ?? "MONTHLY",
    lines: rev?.lines.map(toLine) ?? [],
  };
  const sources = [
    ...products.filter((p) => p.priceCents).map((p) => ({ id: `p:${p.id}`, label: `Copy a service product · ${p.title}`, title: p.title, scope: p.summary ?? "", lines: [{ kind: (p.kind === "BLANKET" ? "NOT_TO_EXCEED" : "FIXED") as EstLine["kind"], description: p.title, providerServiceId: null, uom: "EACH", quantity: "1", rate: "", amount: ((p.priceCents ?? 0) / 100).toFixed(2) }] })),
    ...past.filter((e) => e.id !== editing?.id).map((e) => ({ id: `e:${e.id}`, label: `Copy a past estimate · ${e.title}`, title: e.title, scope: e.revisions[0]?.scope ?? "", lines: e.revisions[0]?.lines.map(toLine) ?? [] })),
  ];
  return (
    <div className="mx-auto w-full max-w-5xl">
      <BackLink href="/profile#my-cost-estimates" label="My Catalog" />
      <div className="mt-2">
        <EstimateWizard
          initial={initial}
          customers={people.map((p) => ({ id: p.id, label: [`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(), p.company?.name].filter(Boolean).join(" · ") }))}
          workRequests={wrs.map((w) => ({ id: w.id, label: w.title || "Untitled request" }))}
          services={services.filter((s) => s.active && s.serviceType === "SERVICE_BY_QTY" && s.rateCents).map((s) => ({ id: s.id, name: s.name, uom: s.uom ?? "HOUR", rateCents: s.rateCents! }))}
          sources={sources}
          providerName={[me.first_name, me.last_name].filter(Boolean).join(" ")}
        />
      </div>
    </div>
  );
}
