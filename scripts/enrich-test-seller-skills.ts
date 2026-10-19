// MQ-E004: give test sellers 38–53 10–15 realistic catalog skills each (from their RDS area) so match ranking can be judged.
// Adds only — existing skills stay. Usage: npx tsx --env-file=.env.local scripts/enrich-test-seller-skills.ts [--apply]
import { prisma } from "@/lib/prisma";

const P2P = ["Purchase Orders", "Self-Service Procurement", "Sourcing", "Supplier Management", "Procurement Contracts", "Supplier Qualification Management", "Supplier Registration", "Spend Classification", "Payables", "Expenses"];
const R2R = ["General Ledger", "Payables", "Receivables", "Assets", "Cash Management", "Subledger Accounting", "Intercompany", "Account Reconciliation", "Tax", "Lease Accounting"];
const SCM = ["Inventory Management", "Order Management", "Warehouse Management", "Supply Chain Orchestration", "Global Order Promising", "Cost Management", "Product Lifecycle Management", "Supply Planning", "Demand Management", "Manufacturing"];
const HCM = ["Global Human Resources", "Payroll", "Absence Management", "Time & Labor", "Benefits", "Compensation", "Performance Management", "Recruiting", "Onboarding", "Learning"];
const CX = ["Sales", "Fusion Service", "Digital Sales", "Customer Data Management", "Configure Price Quote", "Subscription Management", "Field Service", "Partner Relationship Management"];
const EPM = ["Planning", "Financial Consolidation and Close", "Narrative Reporting", "Tax Reporting", "Account Reconciliation", "Free Form", "Smart View", "Enterprise Data Management", "Financial Reporting Studio"];
const TECH = ["FBDI", "Oracle Integration Cloud", "BI Publisher", "OTBI", "Flexfields", "ADFdi", "Security Console", "Visual Builder Studio", "Approvals Management Extensions", "Application Composer", "Sandboxes", "Data Security Profiles"];
const LEAD = ["Project Manager", "Program Management", "PMO Lead", "Cutover / Deployment Lead", "Functional Lead", "Business Architect"];

const PLAN: Record<number, string[]> = {
  38: [...P2P, "Invoice Processing & Matching", "Purchase Order Management", "Sourcing & Supplier Selection"],
  39: [...TECH, "Purchase Orders", "Supplier Management"],
  40: [...R2R, "Close Management & Orchestration", "Fixed Assets & Lease Accounting"],
  41: [...TECH.slice(0, 9), "Financial Reporting Studio", "Smart View", "General Ledger"],
  42: [...SCM, "Inventory & Warehouse Management", "Order Fulfillment & Distribution"],
  43: [...TECH.slice(0, 8), "Functional Setup Manager", "Inventory Management", "Order Management"],
  44: [...HCM, "Payroll & Time Management", "HR Operations & Employee Self-Service"],
  45: ["HDL", "HSDL", "Payroll Batch Loader", ...TECH.slice(0, 8), "Payroll"],
  46: [...CX, "Sales Force Automation", "Customer Service & Contact Center"],
  47: ["Application Composer", "Import Management (CX)", "Oracle Integration Cloud", "Redwood / Oracle JET", "Sandboxes", "BI Publisher", "OTBI", "Security Console", "Visual Builder Studio", "Sales", "Fusion Service"],
  48: [...EPM, "Planning, Budgeting & Forecasting", "Financial Consolidation & Close"],
  49: ["Smart View", "Financial Reporting Studio", "Oracle Integration Cloud", "FBDI", "ERP / HCM Cloud Adapters", "Enterprise Data Management", "Planning", "Financial Consolidation and Close", "Narrative Reporting", "BI Publisher"],
  50: [...LEAD, "Project Management", "Project Control", "Quarterly Update Regression Testing", "Purchase Orders", "General Ledger"],
  51: [...LEAD, "Portfolio & Program Management", "Project Management", "Solution Architect", "Technical Lead"],
  52: ["Training Lead", "Organizational Change Mgt", "Change Mgt Specialist", "Change Management & AI Adoption", "AI Training & Enablement", "Project Manager", "Learning", "Onboarding", "Self-Service Procurement", "Global Human Resources"],
  53: ["Test Lead", "Testing Specialist", "Support Specialist", "Quarterly Update Regression Testing", "Opkey", "Selenium", "Oracle Application Testing Suite", "Test Automation Specialist", "Purchase Orders", "Payables", "Inventory Management"],
};

(async () => {
  const apply = process.argv.includes("--apply");
  const catalog = await prisma.skill.findMany({ where: { is_custom: false, status: "ACTIVE" }, select: { id: true, name: true, pillar: { select: { name: true } } } });
  const pick = (n: string) => { const hits = catalog.filter((c) => c.name === n); return (hits.find((h) => h.pillar?.name === "Oracle Fusion Cloud") ?? hits[0])?.id; };
  for (const [nn, names] of Object.entries(PLAN)) {
    const pp = await prisma.providerProfile.findFirst({ where: { person: { user: { email: `test${nn}@panameer.com`, is_test: true } } }, select: { id: true, skills: { select: { skill_id: true } } } });
    if (!pp) { console.log(`test${nn}: not found`); continue; }
    const have = new Set(pp.skills.map((s) => s.skill_id));
    const ids = [...new Set(names.map(pick).filter((x): x is string => !!x))].filter((id) => !have.has(id));
    const missing = names.filter((n) => !pick(n));
    console.log(`test${nn}: has ${have.size}, +${ids.length}${missing.length ? ` (not in catalog: ${missing.join(", ")})` : ""}`);
    if (apply && ids.length) await prisma.providerSkill.createMany({ data: ids.map((skill_id) => ({ provider_profile_id: pp.id, skill_id, weight: 0.75, source: "SELF_ADDED" as const })), skipDuplicates: true });
  }
  console.log(apply ? "Applied." : "Dry run — add --apply.");
  await prisma.$disconnect();
})();
