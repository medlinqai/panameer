import { prisma } from "@/lib/prisma";
import { parseEngagementTables, engagementsToProjects, roleNameFromText } from "@/lib/resume/engagements";
import { buildCompanyList, notACompany } from "@/lib/resume/company-list";
import { companySortState, applyCompanySort } from "@/lib/resume/company-sort";

// Résumé company sort (2026-10-05). Synthetic, anonymized fixture shaped like an independent consultant's CV.
let pass = 0;
const fails: string[] = [];
const check = (n: string, ok: boolean, d = "") => (ok ? pass++ : fails.push(`${n}${d ? " — " + d : ""}`));

const T = "\t".repeat(12);
const CLIENTS = ["Regional Utility", "Coastal Retail Group", "Metro Transit Board", "Northern Logistics", "Valley Health System", "Harbor Insurance Co", "Summit Manufacturing", "Lakeside University", "Prairie Foods", "Granite Bank"];
const block = (c: string, i: number) =>
  [
    `${c} (REMOTE)${T}${String((i % 12) + 1).padStart(2, "0")}/20${10 + i} to ${i === 0 ? "Current" : `0${(i % 9) + 1}/20${11 + i}`}\t`,
    "Summary", `\tEngagement ${i + 1} Implementation`, "\t",
    "Description", `\tDelivered phase ${i + 1} for the client.`, "\t",
    "Role-Type", `\t${i % 3 === 0 ? "Project-Specific (Lead)" : "Application-Specific (Functional SME), Technology-Specific"}`, "\t",
    "Software", "\tOracle Cloud Applications, OTBI", "\t",
    "Skills Used", "\tCore HR, Payables, Reporting", "\t",
  ].join("\n");
const FIXTURE = ["EXPERIENCE: ", "15+ Years of Experience", "Oracle Cloud HCM Experience", "ORACLE CLOUD APPLICATION EXPERIENCE\t\t\t", "", ...CLIENTS.map(block), "- Prior Roles Upon Request-", "ORACLE CLOUD CONTENT CREATION", "How to Create an OTBI Analysis"].join("\n");

const eng = parseEngagementTables(FIXTURE);
check("1 — 10 engagement lines + 10 tables read as 10 engagements", eng.length === 10, String(eng.length));
const projects = engagementsToProjects(eng);
check("2 — each pair is ONE project: name = Summary, client = line name", projects[3].name === "Engagement 4 Implementation" && projects[3].client === "Northern Logistics");
check("3 — dates from the line; 'Current' is current", eng[0].isCurrent && eng[0].endDate === null && eng[1].startDate === "2011-02-01", JSON.stringify([eng[0], eng[1].startDate]));
check("4 — location split off the client", eng[0].location === "REMOTE" && eng[0].client === "Regional Utility");
check("5 — role maps to a locked role", roleNameFromText(eng[0].roleType) === "Project-Specific" && roleNameFromText(eng[1].roleType) === "Application-Specific");
check("6 — software and skills listed", eng[0].software.length === 2 && eng[0].skills.length === 3);
const list = buildCompanyList(eng, [], { experiences: [], projects });
check("7 — the list is the 10 clients, all guessed Project client, 0 employers", list.length === 10 && list.every((c) => c.guess === "PROJECT"), String(list.length));
for (const h of ["ORACLE CLOUD APPLICATION EXPERIENCE", "How to Create an OTBI Analysis", "Oracle Cloud HCM Experience", "ORACLE CLOUD CONTENT CREATION"])
  check(`8 — not a company: ${h}`, notACompany(h));
check("9 — a real client is a company", !notACompany("Regional Utility (REMOTE)"));
// The upload extractor's form: blank lines between label and value, no leading tabs.
const flat = parseEngagementTables(FIXTURE.replace(/\n\t/g, "\n\n").replace(/\n/g, "\n\n"));
check("10b — extractor form (blank lines, no tabs) reads the same", flat.length === 10 && flat[3].summary === "Engagement 4 Implementation" && flat[3].skills.length === 3, JSON.stringify(flat[3]));
const noTables = parseEngagementTables("Acme Corp\t\t01/2020 to 02/2021\nDid things\nBeta LLC\t\t03/2021 to 04/2022\n");
check("10 — dated lines WITHOUT tables are not this shape", noTables.length === 0);

(async () => {
  const tag = `e2e-ressort-${Date.now()}`;
  const host = await prisma.person.findFirst({ select: { company_id: true, site_id: true }, orderBy: { created_at: "asc" } });
  const u = await prisma.user.create({ data: { email: `${tag}@example.seed`, password_hash: "x", first_name: "Sort", last_name: "Test" }, select: { id: true } });
  const p = await prisma.person.create({ data: { user_id: u.id, first_name: "Sort", last_name: "Test", company_id: host!.company_id, site_id: host!.site_id, is_service_provider: true }, select: { id: true } });
  const prof = await prisma.providerProfile.create({ data: { person_id: p.id, status: "ACTIVE", currency: "USD" }, select: { id: true } });
  try {
    await prisma.profileImport.create({ data: { provider_profile_id: prof.id, source: "RESUME", status: "PARSED", company_list: list as never } });
    for (const pr of projects) await prisma.project.create({ data: { provider_profile_id: prof.id, name: pr.name, client_name: pr.client ?? "" } });
    const st = await companySortState(prof.id);
    check("11 — list = inventory count, preselected Project client", st?.rows.length === 10 && st.rows.every((r) => r.preselect === "PROJECT"), JSON.stringify(st?.rows.map((r) => r.preselect)));
    const [a, b, c, d] = CLIENTS;
    const r = await applyCompanySort(prof.id, [
      { name: a, choice: "EMPLOYER" },
      { name: b, choice: "PROJECT", employer: a },
      { name: c, choice: "REMOVE" },
      { name: d, choice: null },
    ]);
    const emps = await prisma.employer.findMany({ where: { provider_profile_id: prof.id }, select: { id: true, name: true } });
    const prjs = await prisma.project.findMany({ where: { provider_profile_id: prof.id }, select: { client_name: true, employer_id: true } });
    check("12 — Employer writes one Work History job", emps.length === 1 && emps[0].name === a && r.employers === 1, JSON.stringify(emps));
    check("13 — …and its unattached project row goes", !prjs.some((x) => x.client_name === a));
    check("14 — Project client sits under the chosen employer", prjs.find((x) => x.client_name === b)?.employer_id === emps[0].id);
    check("15 — Remove deletes that company's rows", !prjs.some((x) => x.client_name === c) && r.removed === 1);
    check("16 — untouched rows stay as they were", prjs.find((x) => x.client_name === d)?.employer_id === null && prjs.length === 8, String(prjs.length));
    const before = await prisma.project.count({ where: { provider_profile_id: prof.id } });
    await prisma.project.deleteMany({ where: { provider_profile_id: prof.id, client_name: CLIENTS[9] } });
    const r2 = await applyCompanySort(prof.id, [{ name: CLIENTS[9], choice: "REMOVE" }]);
    check("17 — Remove with nothing written writes nothing", r2.removed === 0 && (await prisma.project.count({ where: { provider_profile_id: prof.id } })) === before - 1);
    const r3 = await applyCompanySort(prof.id, [{ name: CLIENTS[9], choice: "PROJECT", employer: "independent" }]);
    check("18 — Project client with no row creates one, Independent", r3.projects === 1 && (await prisma.project.findFirst({ where: { provider_profile_id: prof.id, client_name: CLIENTS[9] } }))?.employer_id === null);
  } finally {
    await prisma.person.deleteMany({ where: { id: p.id } });
    await prisma.user.deleteMany({ where: { id: u.id } });
    await prisma.$disconnect();
  }
  if (fails.length) {
    console.log(`check:resume-sort — ${fails.length} FAILED, ${pass} passed\n`);
    for (const f of fails) console.log("  ✗ " + f);
    process.exit(1);
  }
  console.log(`check:resume-sort — all ${pass} passed`);
})();
