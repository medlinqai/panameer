import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { taxonomyV2 } from "@/lib/platform-settings";
import { US_STATES, LANGUAGES } from "@/lib/countries";
import { ALL_COUNTRIES } from "@/lib/country";

// Lane 6 (Scott 10-15): search attributes per Business Type — pick-from-list facts buyers in a trade check. Behind taxonomy_v2.
export { fieldHelp } from "@/lib/field-guide";

/** The values a seller can pick: the attribute's own choices, or a standard list. FREE = type your own. */
export function choicesFor(a: { choices: string[]; list: string | null }): string[] | null {
  if (a.list === "US_STATES") return [...US_STATES];
  if (a.list === "COUNTRIES") return ALL_COUNTRIES.map((c) => c.name);
  if (a.list === "LANGUAGES") return [...LANGUAGES];
  if (a.list === "FREE") return null;
  return a.choices;
}

export class AttributeError extends Error {}

async function me(viewer: Viewer) {
  if (!(await taxonomyV2())) throw new AttributeError("Not available");
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true } });
  if (!p) throw new AttributeError("No provider profile");
  return p;
}

/** The attributes for the seller's company Business Types, with the seller's answers. */
export async function myAttributes(viewer: Viewer) {
  const p = await me(viewer);
  const m = await prisma.companyMembership.findFirst({ where: { person_id: p.person_id, status: "APPROVED" }, select: { company_id: true } });
  if (!m) return [];
  const [attrs, vals] = await Promise.all([
    prisma.businessTypeAttribute.findMany({ where: { hidden: false, businessType: { companies: { some: { company_id: m.company_id } } } }, orderBy: [{ businessType: { sort_order: "asc" } }, { sort_order: "asc" }], select: { id: true, name: true, choices: true, list: true, multi: true, businessType: { select: { name: true } } } }),
    prisma.providerAttributeValue.findMany({ where: { provider_profile_id: p.id }, select: { attribute_id: true, values: true } }),
  ]);
  return attrs.map((a) => ({ id: a.id, name: a.name, businessType: a.businessType.name, multi: a.multi, options: choicesFor(a), values: vals.find((v) => v.attribute_id === a.id)?.values ?? [] }));
}

export async function saveAttribute(viewer: Viewer, attributeId: string, values: string[]) {
  const p = await me(viewer);
  const a = await prisma.businessTypeAttribute.findUnique({ where: { id: attributeId }, select: { id: true, choices: true, list: true, multi: true } });
  if (!a) throw new AttributeError("Unknown attribute");
  const options = choicesFor(a);
  const clean = [...new Set(values.map((v) => v.trim().slice(0, 80)).filter(Boolean))].slice(0, a.multi ? 60 : 1);
  if (options && clean.some((v) => !options.includes(v))) throw new AttributeError("Pick from the list");
  if (!clean.length) return prisma.providerAttributeValue.deleteMany({ where: { provider_profile_id: p.id, attribute_id: a.id } });
  await prisma.providerAttributeValue.upsert({ where: { provider_profile_id_attribute_id: { provider_profile_id: p.id, attribute_id: a.id } }, create: { provider_profile_id: p.id, attribute_id: a.id, values: clean }, update: { values: clean } });
}
