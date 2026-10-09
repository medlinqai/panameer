import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { listServiceTypes, publishGate } from "@/lib/my-catalog";
import { listProviderServices } from "@/lib/provider-services";
import { ServiceWizard, type ServiceDraft } from "@/components/catalog/ServiceWizard";
import { BackLink } from "@/components/console/BackLink";

export const metadata = { title: "Create a Service · Panameer" };
export const dynamic = "force-dynamic";

// CAT-E002: Create (or edit, ?id=) a service in My Catalog.
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const viewer = await guardPage("canProvideServices");
  const { id } = await searchParams;
  const person = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, last_name: true } });
  const [types, gate, mine] = await Promise.all([listServiceTypes(), person ? publishGate(person.id) : { ok: false, href: "/company", reason: null }, listProviderServices(viewer).catch(() => [])]);
  const s = id ? mine.find((x) => x.id === id) : undefined;
  const initial: ServiceDraft = {
    id: s?.id ?? null,
    serviceTypeId: s?.serviceTypeId ?? types[0]?.id ?? null,
    name: s?.name ?? "",
    description: s?.description ?? "",
    rate: s?.rateCents ? (s.rateCents / 100).toFixed(2) : "",
    uom: s?.uom ?? "HOUR",
    minimum: s?.minimumQuantity ? String(s.minimumQuantity) : "",
    expenses: s?.expenses ?? "AT_COST",
    billingCycle: s?.billingCycle ?? "MONTHLY",
    paymentTerms: s?.paymentTerms ?? "NET30",
    paymentTrigger: s?.paymentTrigger ?? "TIMESHEET",
  };
  return (
    <div className="mx-auto w-full max-w-5xl">
      <BackLink href="/profile#my-services" label="My Catalog" />
      <div className="mt-2">
        <ServiceWizard initial={initial} types={types.map((t) => ({ id: t.id, name: t.name, is_baseline: t.is_baseline }))} gate={gate} providerName={[person?.first_name, person?.last_name].filter(Boolean).join(" ")} />
      </div>
    </div>
  );
}
