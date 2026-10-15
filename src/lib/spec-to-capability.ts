import { prisma } from "@/lib/prisma";
import { taxonomyV2 } from "@/lib/platform-settings";

// Lane 6 (Scott 10-15): behind taxonomy_v2, Product and Business Process specializations become unconfirmed What I Do
// capabilities — Product → that product with no module; Process → that process's domains not already covered.
// (scripts/seed-search-attributes.ts ran the same for existing profiles.)
export const PRODUCT_SPEC: Record<string, [string, string]> = {
  "Oracle Fusion Cloud": ["Oracle", "Fusion Cloud"], "Oracle Cloud": ["Oracle", "Fusion Cloud"], "Oracle Fusion HCM, Oracle Recruiting Cloud": ["Oracle", "Fusion Cloud"], "AI Agent Studio": ["Oracle", "Fusion Cloud"],
  "Oracle E-Business Suite": ["Oracle", "E-Business Suite"], PeopleSoft: ["Oracle", "PeopleSoft"], "JD Edwards": ["Oracle", "JD Edwards EnterpriseOne"],
  Salesforce: ["Salesforce", "Salesforce Platform"], SAP: ["SAP", "S/4HANA"], Ariba: ["SAP", "Ariba"], Coupa: ["Coupa", "Coupa Platform"], Workday: ["Workday", "Workday Enterprise"],
  "Cross-Vendor (Platform-Neutral)": ["Cross-Vendor", "Platform-Neutral"],
};

export async function capabilitiesFromSpecializations(profileId: string): Promise<number> {
  if (!(await taxonomyV2())) return 0;
  const [specs, have, products] = await Promise.all([
    prisma.providerProfileSpecialization.findMany({ where: { provider_profile_id: profileId, specialization: { kind: { in: ["PRODUCT", "METHODOLOGY"] } } }, select: { specialization: { select: { name: true, kind: true } } } }),
    prisma.providerCapability.findMany({ where: { provider_profile_id: profileId }, select: { domain_id: true, system_product_id: true, systemItem: { select: { product_id: true } } } }),
    prisma.systemProduct.findMany({ select: { id: true, name: true, vendor: { select: { name: true } } } }),
  ]);
  const data: { provider_profile_id: string; domain_id: string | null; system_product_id: string | null; mode: "IMPLEMENT"; source: "LEGACY" }[] = [];
  for (const s of specs) {
    if (s.specialization.kind === "PRODUCT") {
      const m = PRODUCT_SPEC[s.specialization.name];
      const prod = m && products.find((p) => p.vendor.name === m[0] && p.name === m[1]);
      if (!prod || have.some((h) => h.system_product_id === prod.id || h.systemItem?.product_id === prod.id) || data.some((d) => d.system_product_id === prod.id)) continue;
      data.push({ provider_profile_id: profileId, domain_id: null, system_product_id: prod.id, mode: "IMPLEMENT", source: "LEGACY" });
    } else {
      const doms = await prisma.domain.findMany({ where: { process: s.specialization.name }, select: { id: true } });
      for (const d of doms) if (!have.some((h) => h.domain_id === d.id) && !data.some((x) => x.domain_id === d.id)) data.push({ provider_profile_id: profileId, domain_id: d.id, system_product_id: null, mode: "IMPLEMENT", source: "LEGACY" });
    }
  }
  if (data.length) await prisma.providerCapability.createMany({ data });
  return data.length;
}
