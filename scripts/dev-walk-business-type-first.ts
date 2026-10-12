// BT-E001..E006 dev walk (throwaway rows only): new provider → Business Type → résumé → profile pre-filled →
// Build Your Catalog suggestions → keep two, set a rate → publish; Override My Rate only with >1 provider.
// Run: npx tsx --env-file=.env.local scripts/dev-walk-business-type-first.ts  (dev server on :3100)
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { applyParsedResume } from "@/lib/resume/import";
import type { ParsedResume } from "@/lib/resume/parse";
import { catalogServicesFor } from "@/lib/my-catalog";
import { check, cleanup, done, made, party } from "./lib/dev-fixture";

const BASE = "http://localhost:3100";
const RESUME = `Pat Walk
Oracle Cloud Financials Consultant
Austin, TX 78701 | pat@example.test
Rate: $150/hr
Independent consultant advising clients on Oracle Fusion Financials.
Built 40 BIP reports and OTBI dashboards for month-end close.
Trained key users and ran workshops before go-live; supported hypercare.
Mentored junior consultants.`;

async function cookieFor(userId: string, email: string) {
  const token = await encode({ token: { sub: userId, email, role: "MEMBER", isServiceProvider: true }, secret: process.env.NEXTAUTH_SECRET! });
  return `next-auth.session-token=${token}`;
}
const call = (cookie: string) => async (path: string, body?: object) => {
  const r = await fetch(BASE + path, { method: body ? "POST" : "GET", headers: { cookie, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const text = await r.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, text, json };
};

async function main() {
  const prov = await party("PROVIDER", "Pat");
  const per = await prisma.person.update({ where: { id: prov.personId }, data: { is_service_provider: true }, select: { company_id: true } });
  const companyId = per.company_id!;
  await prisma.companyMembership.create({ data: { person_id: prov.personId, company_id: companyId, role: "ADMIN", status: "APPROVED" } });
  const user = await prisma.person.findUniqueOrThrow({ where: { id: prov.personId }, select: { user_id: true } });
  const api = call(await cookieFor(user.user_id!, prov.email));

  // BT-E001: seller company → Business Type, Industries You Serve.
  const ind = await api("/api/company/industries");
  const bts = (ind.json.businessTypes as { id: string; name: string }[]) ?? [];
  const erp = bts.find((b) => b.name === "ERP Consulting");
  check("seller sees Business Type choices (ERP Consulting)", ind.json.seller === true && !!erp, JSON.stringify(ind.json).slice(0, 200));
  check("Register with Business Type saves", (await api("/api/company/business-types", { businessTypeId: erp?.id, on: true })).status === 200);
  const industry = ((ind.json.industries as { id: string }[]) ?? [])[0];
  check("Industries You Serve saves", !!industry && (await api("/api/company/industries-served", { specializationId: industry.id, on: true })).status === 200);

  // Résumé → profile (BT-E004). A synthetic résumé, not a real CV.
  await prisma.profileImport.create({ data: { provider_profile_id: prov.profileId!, source: "RESUME", status: "PARSED", raw_text: RESUME } });
  const parsed = { headline: "Oracle Cloud Financials Consultant", overview: "Independent Oracle Fusion Financials consultant.", experienceLevel: null, experienceYears: null, experiences: [], projects: [], education: [], certifications: [], skills: [], languages: [], gaps: [] } as unknown as ParsedResume;
  await applyParsedResume(prov.profileId!, parsed, "RESUME", RESUME);
  const pp = await prisma.providerProfile.findUniqueOrThrow({ where: { id: prov.profileId! }, select: { hourly_rate_cents: true, resume_prefill: true } });
  const pre = pp.resume_prefill as { fields: string[]; location?: { city: string } };
  check("profile pre-filled: rate from résumé + marked fields", pp.hourly_rate_cents === 15000 && ["Title", "About", "Rate", "Location"].every((f) => pre.fields.includes(f)) && pre.location?.city === "Austin", JSON.stringify(pre));
  const st = await api("/api/onboarding/status");
  const addr = (st.json.profile as { address?: { city?: string } } | undefined)?.address;
  check("Contact draft pre-fills the résumé location", addr?.city === "Austin", JSON.stringify(addr));
  const prof = await api("/profile");
  check("My Profile shows \"From your résumé\" until confirmed", prof.text.includes("data-resume-prefill"), `status ${prof.status}`);
  await api("/api/profile/resume-prefill", {});
  check("Looks Right clears the markers", !(await prisma.providerProfile.findUniqueOrThrow({ where: { id: prov.profileId! }, select: { resume_prefill: true } })).resume_prefill);

  // BT-E003: Build Your Catalog suggestions.
  const page1 = await api("/catalog/build");
  check("Build Your Catalog reads the résumé (pending)", page1.text.includes("Reading your résumé"), `status ${page1.status}`);
  const t0 = Date.now();
  const ref = await api("/api/catalog/suggestions", { action: "refresh" });
  console.log(`    refresh: ${JSON.stringify(ref.json)} in ${Date.now() - t0}ms`);
  const sugs = await prisma.catalogSuggestion.findMany({ where: { provider_profile_id: prov.profileId! } });
  const names = new Map((await prisma.serviceType.findMany({ where: { id: { in: sugs.map((s) => s.service_type_id) } }, select: { id: true, name: true } })).map((t) => [t.id, t.name]));
  console.log("    proposed:", sugs.map((s) => `${names.get(s.service_type_id)}${s.rate_cents ? ` $${s.rate_cents / 100}/${s.unit}` : ""}`).join(" · "));
  const services = sugs.filter((s) => s.kind === "SERVICE");
  check("drafts proposed with a why; services from stock types; a product for the named deliverable", services.length >= 2 && sugs.every((s) => s.why.length > 0) && sugs.some((s) => s.kind === "SERVICE_PRODUCT"));
  check("nothing published automatically", (await prisma.providerService.count({ where: { provider_profile_id: prov.profileId! } })) === 0);
  const page2 = await api("/catalog/build");
  check("\"Suggested from your résumé\" shows Keep / Remove", page2.text.includes("SUGGESTED FROM YOUR RÉSUMÉ") && page2.text.includes("data-keep"));
  check("second refresh proposes nothing new (once per résumé)", (await api("/api/catalog/suggestions", { action: "refresh" })).json.proposed === 0);

  const [a, b] = services;
  for (const s of [a, b]) check(`Keep ${names.get(s.service_type_id)}`, (await api("/api/catalog/suggestions", { action: "keep", id: s.id })).status === 200);
  const rest = sugs.filter((s) => s.id !== a.id && s.id !== b.id);
  if (rest[0]) check("Remove one", (await api("/api/catalog/suggestions", { action: "remove", id: rest[0].id })).status === 200);
  check("set a rate", (await api("/api/catalog/build", { action: "service", serviceTypeId: b.service_type_id, on: true, rateCents: 17500, unit: "HOUR" })).status === 200);
  const log = await prisma.catalogSuggestion.groupBy({ by: ["status"], where: { provider_profile_id: prov.profileId! }, _count: true });
  console.log("    proposed vs kept:", log.map((l) => `${l.status} ${l._count}`).join(", "));
  const kept = await prisma.providerService.findMany({ where: { provider_profile_id: prov.profileId! }, select: { id: true, rate_cents: true, published_at: true, company_id: true } });
  check("kept services are drafts owned by the company", kept.length === 2 && kept.every((k) => !k.published_at && k.company_id === companyId));
  const pub = await api("/api/catalog/build", { action: "publish" });
  console.log(`    publish: ${pub.status} ${JSON.stringify(pub.json)}`);

  // BT-E005: Override My Rate only with >1 provider; buyers see the override.
  const target = kept.find((k) => k.rate_cents)!;
  check("Override refused for a one-provider company", (await api("/api/catalog/rate-override", { serviceId: target.id, rateCents: 20000, unit: "HOUR" })).status === 400);
  check("Override My Rate hidden for a one-provider company", !(await api("/catalog/build")).text.includes("data-override-rate"));
  const second = await party("PROVIDER", "Sam");
  await prisma.person.update({ where: { id: second.personId }, data: { is_service_provider: true } });
  await prisma.companyMembership.create({ data: { person_id: second.personId, company_id: companyId, role: "MEMBER", status: "APPROVED" } });
  check("Override My Rate shows with two providers", (await api("/catalog/build")).text.includes("data-override-rate"));
  check("Override saves", (await api("/api/catalog/rate-override", { serviceId: target.id, rateCents: 20000, unit: "HOUR" })).status === 200);
  const seen = await catalogServicesFor(prov.profileId!, false);
  check("buyers see the override, else the company rate", seen.some((s) => s.id === target.id && s.rateCents === 20000), JSON.stringify(seen.map((s) => [s.name, s.rateCents, s.published])));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    const profiles = (await prisma.providerProfile.findMany({ where: { person_id: { in: made.persons } }, select: { id: true } })).map((p) => p.id);
    const companies = (await prisma.company.findMany({ where: { p_account_id: { in: made.accounts } }, select: { id: true } })).map((c) => c.id);
    await prisma.catalogSuggestion.deleteMany({ where: { provider_profile_id: { in: profiles } } });
    await prisma.providerRateOverride.deleteMany({ where: { person_id: { in: made.persons } } });
    await cleanup();
    const left = await Promise.all([
      prisma.catalogSuggestion.count({ where: { provider_profile_id: { in: profiles } } }),
      prisma.providerService.count({ where: { provider_profile_id: { in: profiles } } }),
      prisma.serviceProduct.count({ where: { provider_profile_id: { in: profiles } } }),
      prisma.companyIndustry.count({ where: { company_id: { in: companies } } }),
      prisma.companyBusinessType.count({ where: { company_id: { in: companies } } }),
      prisma.company.count({ where: { id: { in: companies } } }),
    ]);
    console.log(`    cleanup leftovers (suggestions, services, products, industries, business types, companies): ${left.join(", ")}`);
    done("BT walk");
    await prisma.$disconnect();
  });
