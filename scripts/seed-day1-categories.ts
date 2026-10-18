// SH2-E001: the 12 Day-1 Categories (11 commodity groups + the Help tile). Remap only — nothing is deleted:
// business types move to their new group, old groups are hidden (names kept), secondary "Rates" types fold into the
// new group's Rates where the name is free, and the stock types each new Category needs are added.
// Usage: npx tsx --env-file=.env.local scripts/seed-day1-categories.ts [--apply]
import type { PricingModel, ServiceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const apply = process.argv.includes("--apply");

// New group → [old group whose Rates category moves here (or null = new Rates), business type codes]
const GROUPS: { name: string; rates: string | null; bts: string[]; newRates?: [string, PricingModel, ServiceUnit][] }[] = [
  { name: "ERP & Oracle", rates: "Technology", bts: ["PANAMEER_V1", "SOFTWARE_SAAS"] },
  { name: "Printing", rates: "Printing & Signs", bts: ["PRINT_PROMOTIONAL", "SIGNS_LARGE_FORMAT", "LABELS_PACKAGING", "PROMOTIONAL_PRODUCTS"] },
  { name: "Marketing", rates: "Marketing & Creative", bts: ["DIGITAL_MARKETING", "ADVERTISING_PR", "DESIGN_BRANDING", "VIDEO_PHOTOGRAPHY", "CONTENT_COPYWRITING"] },
  { name: "Websites", rates: null, bts: ["WEB_DESIGN_DEVELOPMENT"], newRates: [["Hourly", "TIME", "HOUR"], ["Monthly Retainer", "RECURRING", "MONTH"]] },
  { name: "AI & Automation", rates: null, bts: ["DATA_AI"], newRates: [["Hourly", "TIME", "HOUR"], ["Monthly Retainer", "RECURRING", "MONTH"]] },
  { name: "Finance & Admin", rates: "Business Services", bts: ["ACCOUNTING", "PAYROLL_EMPLOYER_SERVICES", "MAILROOM_SERVICES", "DOCUMENT_SCANNING_RECORDS", "TRANSLATION_INTERPRETING", "VIRTUAL_ASSISTANTS"] },
  { name: "IT", rates: "Telecom", bts: ["IT_SERVICES_SUPPORT", "CYBERSECURITY", "PHONE_INTERNET_SERVICE", "CABLING_INSTALLATION"] },
  { name: "Transportation", rates: "Logistics & Transportation", bts: ["FREIGHT_TRUCKING", "COURIER_DELIVERY", "WAREHOUSING_FULFILLMENT", "MOVING_RELOCATION", "FLEET_MAINTENANCE", "VEHICLE_RENTAL_LEASING"] },
  { name: "Facilities", rates: "Facilities & Property", bts: ["JANITORIAL_CLEANING", "LANDSCAPING_GROUNDS", "HVAC", "ELECTRICAL", "PLUMBING", "GENERAL_CONTRACTING_REPAIRS", "PEST_CONTROL", "WASTE_RECYCLING", "SHREDDING_RECORDS_DESTRUCTION", "ENVIRONMENTAL_SERVICES", "GUARD_SERVICES", "ALARMS_MONITORING", "CAMERAS_ACCESS_CONTROL"] },
  { name: "Mentoring & Advisory", rates: "Professional Services", bts: ["LEGAL", "HUMAN_RESOURCES", "ENGINEERING", "MANAGEMENT_CONSULTING", "CONTRACT_STAFFING", "RECRUITING", "CORPORATE_TRAINING", "SOFTWARE_SYSTEMS_TRAINING", "CERTIFICATION_EXAM_PREP", "COACHING_MENTORING", "ELEARNING_DEVELOPMENT"] },
  { name: "Lead Generation", rates: null, bts: ["LEAD_GENERATION"], newRates: [["Per Lead", "FIXED", "EACH"], ["Monthly Retainer", "RECURRING", "MONTH"]] },
];
// Old groups whose Rates types fold into a new group's Rates (where the name is free).
const FOLD: Record<string, string> = { "Fleet & Vehicles": "Transportation", "Environmental & Waste": "Facilities", Security: "Facilities", "Education & Training": "Mentoring & Advisory", "Staffing & Contingent Labor": "Mentoring & Advisory" };
const OLD = ["Technology", "Professional Services", "Staffing & Contingent Labor", "Marketing & Creative", "Printing & Signs", "Facilities & Property", "Security", "Logistics & Transportation", "Fleet & Vehicles", "Travel & Events", "Education & Training", "Telecom", "Environmental & Waste", "Business Services"];
// New business types (codes) the Day-1 Categories need.
const NEW_BTS: { code: string; name: string; group: string }[] = [
  { code: "VIRTUAL_ASSISTANTS", name: "Virtual Assistants", group: "Finance & Admin" },
  { code: "LEAD_GENERATION", name: "Lead Generation", group: "Lead Generation" },
];
// Stock Service Product types to add: business type code → [name, pricing, unit].
const NEW_TYPES: Record<string, [string, PricingModel, ServiceUnit][]> = {
  DIGITAL_MARKETING: [["Local SEO Setup", "FIXED", "EACH"], ["Google Ads Management", "RECURRING", "MONTH"]],
  VIDEO_PHOTOGRAPHY: [["Video Editing", "FIXED", "EACH"], ["Short-Form Clips", "RECURRING", "MONTH"]],
  CONTENT_COPYWRITING: [["Copywriting", "FIXED", "EACH"]],
  WEB_DESIGN_DEVELOPMENT: [["Website Design", "FIXED", "EACH"], ["Website Care Plan", "RECURRING", "MONTH"]],
  DATA_AI: [["Chatbot", "FIXED", "EACH"], ["Workflow Automation", "FIXED", "EACH"], ["AI Receptionist", "RECURRING", "MONTH"]],
  ACCOUNTING: [["Bookkeeping", "RECURRING", "MONTH"]],
  PAYROLL_EMPLOYER_SERVICES: [["Payroll", "RECURRING", "MONTH"]],
  VIRTUAL_ASSISTANTS: [["Virtual Assistant (10 Hours)", "FIXED", "EACH"], ["Virtual Assistant (Monthly)", "RECURRING", "MONTH"]],
  IT_SERVICES_SUPPORT: [["Managed IT (per user)", "RECURRING", "MONTH"], ["Cloud Migration", "FIXED", "EACH"]],
  CYBERSECURITY: [["Cybersecurity Check-Up", "FIXED", "EACH"]],
  MANAGEMENT_CONSULTING: [["Fractional CFO", "RECURRING", "MONTH"], ["Fractional CMO", "RECURRING", "MONTH"], ["Fractional CTO", "RECURRING", "MONTH"], ["Strategy Session", "FIXED", "SESSION"]],
  COACHING_MENTORING: [["Coaching", "FIXED", "SESSION"]],
  LEAD_GENERATION: [["Trade Lead Package", "FIXED", "EACH"], ["Pay-Per-Lead", "FIXED", "EACH"]],
};

const log: string[] = [];
const say = (s: string) => log.push(s);

async function main() {
  const groups = new Map((await prisma.commodityGroup.findMany({ select: { id: true, name: true, hidden: true } })).map((g) => [g.name, g]));
  const groupId = async (name: string, sort: number) => {
    const g = groups.get(name);
    if (g) {
      if (apply) await prisma.commodityGroup.update({ where: { id: g.id }, data: { hidden: false, sort_order: sort } });
      return g.id;
    }
    say(`+ group ${name}`);
    if (!apply) return `new:${name}`;
    const c = await prisma.commodityGroup.create({ data: { name, unspsc_segments: [], sort_order: sort }, select: { id: true, name: true, hidden: true } });
    groups.set(name, c);
    return c.id;
  };

  // 1. New groups, in Day-1 order.
  const ids = new Map<string, string>();
  for (const [i, g] of GROUPS.entries()) ids.set(g.name, await groupId(g.name, 10 + i * 10));

  // 2. New business types.
  for (const b of NEW_BTS) {
    const have = await prisma.businessType.findUnique({ where: { code: b.code }, select: { id: true } });
    if (have) continue;
    say(`+ business type ${b.name} → ${b.group}`);
    if (apply) await prisma.businessType.create({ data: { code: b.code, name: b.name, commodity_group_id: ids.get(b.group)!, uses_skills: false } });
  }

  // 3. Business types move to their new group.
  for (const g of GROUPS) {
    for (const code of g.bts) {
      const bt = await prisma.businessType.findUnique({ where: { code }, select: { id: true, name: true, commodityGroup: { select: { name: true } } } });
      if (!bt) { if (apply) say(`! business type ${code} missing`); continue; }
      if (bt.commodityGroup?.name === g.name) continue;
      say(`~ ${bt.name}: ${bt.commodityGroup?.name ?? "-"} → ${g.name}`);
      if (apply) await prisma.businessType.update({ where: { id: bt.id }, data: { commodity_group_id: ids.get(g.name)! } });
    }
  }

  // 4. Rates: the primary old group's Rates category moves; new Categories get their own; secondary groups fold in.
  const ratesOf = (groupName: string) => prisma.serviceCategory.findFirst({ where: { commodityGroup: { name: groupName }, kind: "SERVICE", name: "Rates" }, select: { id: true } });
  for (const g of GROUPS) {
    const have = await ratesOf(g.name);
    if (have) continue;
    if (g.rates) {
      const old = await ratesOf(g.rates);
      if (old) {
        say(`~ Rates of ${g.rates} → ${g.name}`);
        if (apply) await prisma.serviceCategory.update({ where: { id: old.id }, data: { commodity_group_id: ids.get(g.name)! } });
      }
    } else {
      say(`+ Rates for ${g.name}: ${g.newRates!.map((r) => r[0]).join(", ")}`);
      if (apply) {
        const cat = await prisma.serviceCategory.create({ data: { name: "Rates", kind: "SERVICE", commodity_group_id: ids.get(g.name)! }, select: { id: true } });
        for (const [i, [name, pricing, unit]] of g.newRates!.entries()) await prisma.serviceType.create({ data: { name, service_category_id: cat.id, kind: "SERVICE", pricing_model: pricing, units: [unit], status: "STOCK", sort_order: 10 + i, default_on: i === 0, delivery: "EITHER" } });
      }
    }
  }
  for (const [from, to] of Object.entries(FOLD)) {
    const src = await ratesOf(from);
    const dst = await ratesOf(to);
    if (!src || !dst) continue;
    const types = await prisma.serviceType.findMany({ where: { service_category_id: src.id }, select: { id: true, name: true } });
    const taken = new Set((await prisma.serviceType.findMany({ where: { service_category_id: dst.id }, select: { name: true } })).map((t) => t.name));
    for (const t of types) {
      if (taken.has(t.name)) continue;
      say(`~ rate type ${t.name}: ${from} → ${to}`);
      if (apply) await prisma.serviceType.update({ where: { id: t.id }, data: { service_category_id: dst.id } });
    }
  }

  // 5. Stock Service Product types each new Category needs (in the business type's own product category).
  for (const [code, types] of Object.entries(NEW_TYPES)) {
    const bt = await prisma.businessType.findUnique({ where: { code }, select: { id: true, name: true } });
    let cat = bt ? await prisma.serviceCategory.findFirst({ where: { business_type_id: bt.id, kind: "SERVICE_PRODUCT" }, select: { id: true } }) : null;
    if (!cat) {
      say(`+ product category "Stock Products" for ${code}`);
      if (apply) cat = await prisma.serviceCategory.create({ data: { name: "Stock Products", kind: "SERVICE_PRODUCT", business_type_id: (await prisma.businessType.findUniqueOrThrow({ where: { code }, select: { id: true } })).id }, select: { id: true } });
    }
    for (const [i, [name, pricing, unit]] of types.entries()) {
      const have = cat ? await prisma.serviceType.findFirst({ where: { service_category_id: cat.id, name }, select: { id: true } }) : null;
      if (have) continue;
      say(`+ type ${name} (${code})`);
      if (apply && cat) await prisma.serviceType.create({ data: { name, service_category_id: cat.id, kind: "SERVICE_PRODUCT", pricing_model: pricing, units: [unit], status: "STOCK", sort_order: 50 + i } });
    }
  }

  // 6. Old groups hidden from screens (names kept in the data).
  for (const name of OLD) {
    const g = groups.get(name);
    if (!g || g.hidden) continue;
    say(`- hide old group ${name}`);
    if (apply) await prisma.commodityGroup.update({ where: { id: g.id }, data: { hidden: true } });
  }

  console.log(log.join("\n") || "Nothing to do.");
  console.log(apply ? "Applied." : "Dry run — add --apply.");
}

main().finally(() => prisma.$disconnect());
