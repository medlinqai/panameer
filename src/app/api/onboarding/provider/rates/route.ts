import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { buildCatalogData, ensureDefaultRates } from "@/lib/build-catalog";
import { companyIdForProfile, companyProviderCount } from "@/lib/company-catalog";

// SO-E004 Get Found › Your Rates: the My Catalog › Services rates table, embedded (same data, default rate types on first).
export async function GET() {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  await ensureDefaultRates(viewer).catch(() => null);
  const d = await buildCatalogData(viewer);
  const me = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true, onsite_rate_cents: true, remote_rate_cents: true, hourly_rate_cents: true, open_to_offers: true } });
  if (!me) return NextResponse.json({ error: "No seller profile" }, { status: 404 });
  const companyId = await companyIdForProfile(me.id);
  const multiProvider = companyId ? (await companyProviderCount(companyId)) > 1 : false;
  const overrides = new Map(multiProvider ? (await prisma.providerRateOverride.findMany({ where: { person_id: me.person_id }, select: { service_id: true, rate_cents: true } })).map((o) => [o.service_id, o.rate_cents]) : []);
  return NextResponse.json({
    businessTypes: d.businessTypes.map((b) => b.name),
    types: d.categories.filter((c) => c.kind === "SERVICE").flatMap((c) => c.serviceTypes.map((t) => ({ id: t.id, name: t.name, description: t.description, units: t.units, delivery: t.delivery, custom: t.status === "SUGGESTED" }))),
    rows: d.services.map((s) => ({ id: s.id, serviceTypeId: s.service_type_id!, rateCents: s.rate_cents, unit: s.uom, published: !!s.published_at, expenses: s.expenses, hoursIncluded: s.hours_included, offersOverride: s.offers_override, overrideCents: overrides.get(s.id) ?? null })),
    registration: { ONSITE: me.onsite_rate_cents, OFFSITE: me.remote_rate_cents ?? me.hourly_rate_cents },
    gate: d.gate,
    multiProvider,
    openToOffers: me.open_to_offers,
  });
}

/** Continue: at least one rate; the profile's onsite/offsite fields follow the ONSITE/OFFSITE hourly rows (search and profile show a rate). */
export async function POST() {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const me = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } });
  if (!me) return NextResponse.json({ error: "No seller profile" }, { status: 404 });
  const rates = await prisma.providerService.findMany({ where: { provider_profile_id: me.id, active: true, rate_cents: { not: null } }, select: { rate_cents: true, uom: true, service_type_id: true } });
  if (!rates.length) return NextResponse.json({ error: "Add at least one rate." }, { status: 400 });
  const delivery = new Map((await prisma.serviceType.findMany({ where: { id: { in: rates.map((r) => r.service_type_id).filter((x): x is string => !!x) } }, select: { id: true, delivery: true } })).map((t) => [t.id, t.delivery]));
  const hourly = (d: string) => rates.find((r) => r.uom === "HOUR" && r.service_type_id && delivery.get(r.service_type_id) === d)?.rate_cents ?? null;
  const onsite = hourly("ONSITE");
  const offsite = hourly("OFFSITE") ?? hourly("EITHER");
  await prisma.providerProfile.update({ where: { id: me.id }, data: { ...(onsite != null ? { onsite_rate_cents: onsite } : {}), ...(offsite != null ? { remote_rate_cents: offsite } : {}), ...(onsite == null && offsite == null ? { hourly_rate_cents: rates[0].rate_cents } : {}) } });
  return NextResponse.json({ ok: true });
}
