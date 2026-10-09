import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { publishGate } from "@/lib/my-catalog";
import { listCapabilityDomains, listOwnServiceProducts } from "@/lib/service-products";
import { ProductWizard, type ProductDraft } from "@/components/catalog/ProductWizard";
import { BackLink } from "@/components/console/BackLink";

export const metadata = { title: "Create a Service Product · Panameer" };
export const dynamic = "force-dynamic";

// CAT-E003: Create (or edit, ?id=) a service product in My Catalog.
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const viewer = await guardPage("canProvideServices");
  const { id } = await searchParams;
  const person = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, last_name: true } });
  const [domains, gate, mine] = await Promise.all([listCapabilityDomains(), person ? publishGate(person.id) : { ok: false, href: "/company", reason: null }, id ? listOwnServiceProducts(viewer).catch(() => []) : Promise.resolve([])]);
  const p = id ? mine.find((x) => x.id === id) : undefined;
  const kind = (p?.kind === "DEPLOYABLE" || p?.kind === "BLANKET" ? p.kind : "DELIVERABLE") as ProductDraft["kind"];
  const ms = p?.milestones ?? [];
  const initial: ProductDraft = {
    id: p?.id ?? null,
    kind,
    title: p?.title ?? "",
    summary: p?.summary ?? "",
    included: (p?.deliverables ?? []).map((x) => x.text).join("\n"),
    weeks: p?.durationWeeks != null ? String(p.durationWeeks) : "",
    coverCode: p?.coverCode ?? "",
    process: p?.process ?? "",
    domainIds: p?.capabilityDomainIds ?? [],
    price: p?.priceCents ? (p.priceCents / 100).toFixed(2) : "",
    billingPeriod: p?.billingPeriod === "ANNUAL" ? "ANNUAL" : "MONTHLY",
    paymentTerms: p?.paymentTerms ?? "IMMEDIATE",
    paymentTrigger: p?.paymentTrigger ?? "INSTALLATION",
    schedule: ms.length > 1,
    milestones: ms.length > 1 ? ms.map((m) => ({ label: m.label, trigger: m.trigger ?? "ACCEPTANCE", percent: String(m.percent) })) : [{ label: "Kickoff", trigger: "ORDER_ACCEPTED", percent: "50" }, { label: "Installed in test pod", trigger: "INSTALLATION", percent: "50" }],
  };
  return (
    <div className="mx-auto w-full max-w-5xl">
      <BackLink href="/profile#my-service-products" label="My Catalog" />
      <div className="mt-2">
        <ProductWizard initial={initial} domains={domains.map((x) => ({ id: x.id, process: x.process, name: x.name }))} gate={gate} providerName={[person?.first_name, person?.last_name].filter(Boolean).join(" ")} />
      </div>
    </div>
  );
}
