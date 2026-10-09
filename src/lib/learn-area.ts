import { areaFor } from "@/lib/skill-areas";

// L-E054: a learning path's area comes from its pillar (and Procurement group), not a word match; keywords only when both are empty.
const PILLAR_AREA: Record<string, string> = { SCM: "SCM", ERP: "FIN", FIN: "FIN", HCM: "HCM", PPM: "PPM", O2C: "O2C", ANALYTICS: "ANALYTICS", TECH: "TECH" };

export function pathArea(p: { slug: string; pillar?: string | null; group?: string | null; title: string }, skillAreas: string[] = []): string | null {
  if (p.slug === "oracle-cloud-foundations" || /foundation/i.test(p.group ?? "") || (p.pillar ?? "").toUpperCase() === "FOUNDATIONS") return "START";
  // Procurement sits under the SCM pillar in Oracle, but Panameer gives it its own area.
  if (/procure/i.test(p.group ?? "")) return "PRC";
  const fromPillar = PILLAR_AREA[(p.pillar ?? "").trim().toUpperCase()];
  if (fromPillar) return fromPillar;
  // Implementer paths cross every pillar; a word like "journal" in their group isn't Financials.
  if (/implement/i.test(`${p.group ?? ""} ${p.title}`)) return null;
  const tally = new Map<string, number>();
  for (const a of skillAreas) tally.set(a, (tally.get(a) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? areaFor(p.title, p.group ? [p.group] : []);
}

/** The pillar's own name, for "Also in Supply Chain (SCM)". */
export const PILLAR_LABEL: Record<string, string> = { SCM: "Supply Chain (SCM)", ERP: "Financials (ERP)", HCM: "HCM" };
