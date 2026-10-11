// Seeds the glossary from the draft workbook (sheet "Glossary"); re-runs update by term, never duplicate.
// "Scott to confirm" rows and "Admin only" rows seed as ADMIN. Usage: npx tsx --env-file=.env.local scripts/seed-glossary.ts [--apply]
import path from "node:path";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { termKey } from "@/lib/glossary";

const FILE = process.env.GLOSSARY_XLSX ?? path.resolve(process.cwd(), "../2. Claude Sub-Files/panameer_glossary_draft_2026-10-07.xlsx");
type Row = { term: string; category: string; type: string; definition: string; also: string | null; dont: string | null; shown: string; confirm: string | null };
const EXTRA: Row[] = [
  { term: "Buyer Profile", category: "Profile", type: "Panameer term", definition: "A buyer person's profile: photo, title, company, overview, work history, education, languages and location. No completeness gate — it never blocks posting work.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Buyer Track Record", category: "Company & payment", type: "Panameer term", definition: "Shown on a buyer company's page, built from real activity: validated, member since, work orders issued and completed, paid on time, average days to pay, industry, size, location and ERP used. A company with no history shows \"New buyer on Panameer\".", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Leaders", category: "Learn & Connect", type: "Panameer term", definition: "The leaderboard in Connect: members ranked by the colleagues they invited and who joined, this month and all time.", also: "Leaderboard; Grow Your Community", dont: null, shown: "Public", confirm: null },
  { term: "Community", category: "Learn & Connect", type: "Panameer term", definition: "The people on Panameer you could connect with — members you aren't connected to yet, best match first.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Recommendations", category: "Learn & Connect", type: "Panameer term", definition: "Short write-ups from people you've worked with, vouching for you. You ask for one in Connect; it shows on your profile once they write it.", also: "Recommendation; Testimonial", dont: null, shown: "Public", confirm: null },
  { term: "Credentials", category: "Profile", type: "Panameer term", definition: "The profile section listing what vouches for a member: certifications, licenses, awards, memberships, and insurance & bonding. Ones verified by Panameer are marked ✓.", also: "Certifications (older name)", dont: null, shown: "Public", confirm: null },
  { term: "License", category: "Profile", type: "Panameer term", definition: "A credential issued by a licensing authority that lets someone do regulated work (e.g., a state contractor or HVAC license).", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Award", category: "Profile", type: "Panameer term", definition: "A credential recognising notable work, from an employer, client, vendor or industry body.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Membership", category: "Profile", type: "Panameer term", definition: "A credential showing membership of a professional body or association.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Insurance & Bonding", category: "Profile", type: "Panameer term", definition: "A credential showing cover a member or their company holds — liability insurance, a surety bond and the like.", also: "Insurance; Bonding", dont: null, shown: "Public", confirm: null },
  { term: "Follow", category: "Learn & Connect", type: "Panameer term", definition: "A one-way link to keep up with someone. No approval, and separate from being colleagues or mentoring — you can follow a colleague too.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Follower", category: "Learn & Connect", type: "Panameer term", definition: "Someone who follows you. Your follower count shows on your profile.", also: "Followers", dont: null, shown: "Public", confirm: null },
  { term: "Invitation", category: "Learn & Connect", type: "Panameer term", definition: "Bringing someone who isn't on Panameer yet onto it, by email (Join Panameer). Never used for a member-to-member ask.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Request", category: "Learn & Connect", type: "Panameer term", definition: "Asking another member for something: Connect with Me, Mentor Me or Recommend Me. All of them live in Connections › Requests.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Connection Request", category: "Learn & Connect", type: "Panameer term", definition: "Asking a member to connect (Connect with Me). They accept or decline; once connected you can message each other.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Mentoring Request", category: "Learn & Connect", type: "Panameer term", definition: "Asking a member who is open for mentoring to mentor you (Mentor Me). They accept or decline.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Recommendation Request", category: "Learn & Connect", type: "Panameer term", definition: "Asking a connection to write a few lines about working with you (Recommend Me). It shows on your profile once they write it.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Invite to Panameer", category: "Learn & Connect", type: "Panameer term", definition: "Sending someone who isn't on Panameer yet an invitation to join. They get one email from you with a Join Panameer button.", also: "Join Panameer, Invite a Colleague (older names)", dont: null, shown: "Public", confirm: null },
  { term: "Learning Path", category: "Learn & Connect", type: "Panameer term", definition: "A set of courses on one subject, taught by a practitioner, ending in a Certification Test. Learn's paths are free.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Course", category: "Learn & Connect", type: "Panameer term", definition: "A group of lessons inside a learning path. Courses open in place on the path page.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Lesson", category: "Learn & Connect", type: "Panameer term", definition: "One video inside a course. Mark it complete to move to the next one; a lesson can have its own questions.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Certification Test", category: "Learn & Connect", type: "Panameer term", definition: "The test for a learning path. Pass it and you earn a certificate. You can take it without watching the lessons.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Certificate", category: "Learn & Connect", type: "Panameer term", definition: "What you earn by passing a Certification Test. It shows on your profile under Credentials, verified by Panameer, and lifts your Search Score.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Coming Soon", category: "Learn & Connect", type: "Panameer term", definition: "A learning path whose lessons are planned but not yet playable. Press Notify Me to be told when it opens.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Path Group", category: "Learn & Connect", type: "Panameer term", definition: "The group for everyone taking a learning path. Questions asked on a lesson show here too.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Connect", category: "Learn & Connect", type: "Panameer term", definition: "Panameer's community area: Leaders, Community, Connections, Mentors, Groups and Recommendations.", also: null, dont: null, shown: "Public", confirm: null },
  // CAT-E008 (2026-10-09): "Catalog" now means a provider's items; the skills tree is the Business Type Taxonomy.
  { term: "Catalog", category: "Marketplace & work", type: "Panameer term", definition: "The items a provider sells on Panameer: their Services, Service Products and Cost Estimates. Managed from My Catalog on your profile.", also: "My Catalog", dont: null, shown: "Public", confirm: null },
  { term: "Business Type Taxonomy", category: "Skills & catalog (RDS)", type: "Panameer term", definition: "Panameer's approved list of roles, domains, skills and service types, used for search and matching.", also: "Skill Catalog (older name)", dont: null, shown: "Public", confirm: null },
  { term: "Service", category: "Marketplace & work", type: "Panameer term", definition: "Work a provider sells by the hour, day, week or month, priced as rate × quantity. Each service has a type, a rate, and billing terms (cycle, payment terms, payment trigger).", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Service Type", category: "Marketplace & work", type: "Panameer term", definition: "What kind of service it is — Onsite Consulting, Offsite Consulting, Mentoring, Training, Staff Augmentation, AI Agent Support — or one a provider adds, reviewed in the Business Type Taxonomy.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Service Product", category: "Marketplace & work", type: "Panameer term", definition: "A packaged offer with one price, sold to any buyer: a Deliverable (fixed price), an AI Agent (recurring) or a Blanket (not-to-exceed). Paid in full or by a payment schedule.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Cost Estimate", category: "Marketplace & work", type: "Panameer term", definition: "A provider's quote for one customer — their scope, their price. Private to the two of them. The customer accepts it (it becomes a work order), asks for changes, or declines.", also: "Estimate", dont: null, shown: "Public", confirm: null },
  { term: "Payment Trigger", category: "Company & payment", type: "Panameer term", definition: "The event that raises a payment request: a timesheet, a payment request, an invoice, or for products a download, installation or the customer's acceptance.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Billing Cycle", category: "Company & payment", type: "Panameer term", definition: "How often a service is billed: weekly, every 2 weeks, monthly or every 90 days. At the end of each cycle the provider submits the trigger.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Payment Terms", category: "Company & payment", type: "Panameer term", definition: "How long the customer has to pay once a payment request is submitted — Immediate, Net 15, Net 30, Net 45 or Net 60. Terms start on submission, not approval.", also: "Net terms", dont: null, shown: "Public", confirm: null },
  // EST-E005 (2026-10-10)
  { term: "Cost Estimate Request", category: "Marketplace & work", type: "Panameer term", definition: "A buyer asking a provider for a cost estimate — what they need, when, an optional budget and files. The provider builds the estimate or declines with a reason. Private to the two of them.", also: "Request an Estimate", dont: null, shown: "Public", confirm: null },
];
const text = (v: ExcelJS.CellValue) => (v == null ? "" : typeof v === "object" && "richText" in v ? v.richText.map((r) => r.text).join("") : typeof v === "object" && "text" in v ? String(v.text) : String(v)).trim();

(async () => {
  const apply = process.argv.includes("--apply");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.getWorksheet("Glossary");
  if (!ws) throw new Error("No sheet named Glossary");
  const rows: Row[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const c = (i: number) => text(row.getCell(i).value);
    if (!c(1) || !c(4)) return;
    rows.push({ term: c(1), category: c(2), type: c(3), definition: c(4), also: c(5) || null, dont: c(6) || null, shown: c(7), confirm: c(8) || null });
  });
  // Extra rows add terms, or replace the sheet's row for the same term.
  for (const e of EXTRA) {
    const i = rows.findIndex((r) => termKey(r.term) === termKey(e.term));
    if (i >= 0) rows[i] = e;
    else rows.push(e);
  }
  // --only=Term,Term limits the run to those terms (so a targeted update leaves admin edits elsewhere alone).
  const only = process.argv.find((x) => x.startsWith("--only="))?.slice(7).split(",").map((t) => termKey(t.trim()));
  if (only) rows.splice(0, rows.length, ...rows.filter((r) => only.includes(termKey(r.term))));
  const existing = new Map((await prisma.glossaryTerm.findMany({ select: { term_key: true } })).map((r) => [r.term_key, true]));
  let created = 0, updated = 0, admin = 0;
  for (const r of rows) {
    const visibility = r.confirm || /admin/i.test(r.shown ?? "") ? ("ADMIN" as const) : ("PUBLIC" as const);
    if (visibility === "ADMIN") admin++;
    const key = termKey(r.term);
    if (existing.has(key)) updated++;
    else created++;
    if (!apply) continue;
    const data = { term: r.term, category: r.category || null, type: r.type || null, definition: r.definition, also_called: r.also, dont_say: r.dont, visibility, confirm_note: r.confirm };
    await prisma.glossaryTerm.upsert({ where: { term_key: key }, create: { ...data, term_key: key }, update: data });
  }
  console.log(JSON.stringify({ file: path.basename(FILE), rows: rows.length, created, updated, admin, applied: apply }));
  process.exit(0);
})();
