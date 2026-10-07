// Skill areas (2026-10-07): a fixed, vendor-neutral list; backfilled by keyword rules, never by AI.
export const SKILL_AREAS = [
  { code: "PRC", label: "Procurement (PRC)" },
  { code: "FIN", label: "Financials (FIN)" },
  { code: "O2C", label: "Order to Cash" },
  { code: "HCM", label: "HCM" },
  { code: "SCM", label: "Supply Chain" },
  { code: "PPM", label: "Projects (PPM)" },
  { code: "ANALYTICS", label: "Analytics & Reporting" },
  { code: "TECH", label: "Technical / Integration" },
] as const;
export type SkillArea = (typeof SKILL_AREAS)[number]["code"];
export const AREA_LABEL: Record<string, string> = Object.fromEntries(SKILL_AREAS.map((a) => [a.code, a.label]));
export const isArea = (x: unknown): x is SkillArea => typeof x === "string" && x in AREA_LABEL;

// First matching rule wins; order puts the specific (reporting, integration) before the broad.
const RULES: [SkillArea, RegExp][] = [
  ["ANALYTICS", /\b(otbi|bip|bi publisher|faw|fdi|analytics?|dashboards?|reports?|reporting|smart ?view|essbase|epm|consolidation|fccs|hyperion|data ?warehouse|power ?bi|tableau)\b/i],
  ["TECH", /\b(fbdi|hdl|hsdl|oic|vbcs|apex|apis?|rest|soap|integrations?|web ?services?|sql|pl\/?sql|java|javascript|python|xml|json|middleware|soa|bpel|odi|etl|migrations?|conversions?|security|devops|cloud infrastructure|oci|dba|database|extensions?|workflow|bpm|groovy|sandbox|personaliz\w*|scripting|edi|flexfields?|fndload|forms|ps ?query|process scheduler|bi cloud connector|bicc)\b/i],
  ["PPM", /\b(projects?|ppm|project (costing|billing|control|management)|grants|portfolio|task management|resource management)\b/i],
  ["PRC", /\b(purchas\w*|procure\w*|iprocurement|eprocurement|sourcing|suppliers?|vendors?|catalogs?|receipts?|receiving|requisitions?|negotiations?|spend|p2p|buyers?|rfq|rfp|supplier portal|contracts? management|purchase orders?)\b/i],
  ["FIN", /\b(general ledger|gl|ledgers?|payables?|ap|receivables? accounting|assets?|cash management|cash|treasury|expenses?|tax|subledger|sla|accounting|journals?|financials?|close|reconciliation|intercompany|budget\w*|fixed assets|costing|invoices?|payments?)\b/i],
  ["O2C", /\b(order ?to ?cash|o2c|order management|orders?|receivables?|ar|billing|invoicing|collections?|credit management|pricing|quot\w*|cpq|revenue|customers?|sales)\b/i],
  ["HCM", /\b(hcm|hr|human resources?|core hr|payroll|benefits?|absences?|time ?(and|&) ?labor|talent|recruiting|learning|compensation|performance|goals?|workforce|onboarding|journeys|employees?|succession|helpdesk|irecruitment|ebenefits|epay|eprofile|time tracking|contingent workers?)\b/i],
  ["SCM", /\b(supply chain|scm|inventory|warehouse|wms|shipping|logistics|manufacturing|planning central|demand|mrp|product (hub|information|lifecycle)|pim|plm|maintenance|quality|planning|cost management|transportation|otm|work in process|bills? of materials?|production scheduling|install base|mro)\b/i],
];

export function areaFor(name: string, aliases: string[] = []): SkillArea | null {
  const text = [name, ...aliases].join(" | ");
  for (const [code, re] of RULES) if (re.test(text)) return code;
  return null;
}
