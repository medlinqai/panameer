import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { buildCatalogData } from "@/lib/build-catalog";
import { estimatesPage } from "@/lib/estimate-requests";
import { buyersSee } from "@/lib/rate-display";
import { formatCents } from "@/lib/display";

// MC-E003: Catalog › Home — what's live and the next step (rates → a Service Product → publish).
export async function catalogHome(viewer: Viewer) {
  const [d, est, p] = await Promise.all([
    buildCatalogData(viewer),
    estimatesPage(viewer),
    prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person: { select: { companyMemberships: { where: { status: "APPROVED" }, take: 1, select: { company: { select: { name: true } } } } } } } }),
  ]);
  const rateTypes = d.categories.filter((c) => c.kind === "SERVICE").flatMap((c) => c.serviceTypes);
  const byType = new Map(d.services.map((s) => [s.service_type_id, s]));
  const rates = rateTypes.map((t) => {
    const s = byType.get(t.id);
    return { name: t.name, line: s?.rate_cents ? buyersSee({ rateCents: s.rate_cents, unit: s.uom, hoursIncluded: s.hours_included })! : "Off", live: !!s?.published_at && !!s.rate_cents };
  });
  const products = p ? await prisma.serviceProduct.findMany({ where: { provider_profile_id: p.id }, orderBy: { created_at: "asc" }, select: { id: true, title: true, status: true, price_cents: true, pricing_type: true } }) : [];
  const priced = d.services.filter((s) => s.rate_cents != null).length;
  const steps = [
    { done: priced > 0, label: "Set your Onsite and Offsite rates", title: "Set Your Rates", sub: "What buyers pay you by the hour", cta: "Set Your Rates", href: "/catalog/services" },
    { done: products.length > 0, label: "Add a Service Product", title: "Add Your First Service Product", sub: "A fixed-price offer buyers can buy now", cta: "Create a Service Product", href: "/catalog/products#create" },
    { done: rates.some((r) => r.live) || products.some((x) => x.status === "PUBLISHED"), label: "Publish your rates", title: "Publish Your Rates", sub: "Drafts go live on your profile and in Shop", cta: "Publish My Rates", href: "/catalog/services" },
  ];
  return {
    eyebrow: [p?.person.companyMemberships[0]?.company.name, d.businessTypes.map((b) => b.name).join(" · ")].filter(Boolean).join(" · ").toUpperCase(),
    rates,
    ratesLive: rates.filter((r) => r.live).length,
    products: products.map((x) => ({ id: x.id, title: x.title, live: x.status === "PUBLISHED", price: x.price_cents != null ? `${formatCents(x.price_cents)}${x.pricing_type === "RECURRING" ? "/mo" : ""}` : "—" })),
    productsLive: products.filter((x) => x.status === "PUBLISHED").length,
    waiting: est.waiting.length + est.received.filter((r) => r.status === "SENT" || r.status === "CHANGES_REQUESTED").length,
    estimates: { received: est.received.length, sent: est.sent.length, accepted: [...est.received, ...est.sent].filter((r) => r.status === "ACCEPTED").length },
    steps,
    next: steps.find((s) => !s.done) ?? null,
  };
}
