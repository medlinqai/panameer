import { prisma } from "@/lib/prisma";

/**
 * REPAIR — the 36 Employer rows whose `name` and `role_title` are SWAPPED
 * (`P1-J1.4-E373` follow-up, authorised by Scott 2026-09-04).
 *
 * ── ⚠⚠ WHY THIS IS A SWAP AND NOT A GUESS ─────────────────────────────────
 *
 * `E374` measured 38 of 91 live colleague suggestions rendering a JOB TITLE as a
 * company — *"You were both at Founder & Principal Consultant"*. `E373` then
 * measured the rows and found the cause was not corruption: on exactly 36 rows
 * `name` holds the TITLE and `role_title` holds the COMPANY.
 *
 * ⚠ THE EVIDENCE IS THE OTHER 214 ROWS, which are the right way round —
 * `name` = "Citigroup", "Acme Consulting", "State of Georgia"; `role_title` =
 * "Oracle Sourcing Specialist", "Procurement Cloud Consultant". Two columns
 * disagreeing with 214 of their own peers is a fact about the rows.
 *
 * ⚠⚠ AND `E373` DELIBERATELY REFUSED TO WRITE THIS WITHOUT AUTHORISATION.
 * Setting `name = null` — the repair its brief proposed — would have DESTROYED
 * four real company names sitting in `role_title`. It matched 0 rows anyway.
 *
 * ── ⚠⚠ MATCHED ON EXACT PAIRS. NO PATTERN. NO HEURISTIC. ──────────────────
 *
 * Four literal `(name, role_title)` tuples, compared with `equals`. ⚠ THERE IS
 * NO "DOES THIS LOOK LIKE A JOB TITLE" TEST ANYWHERE IN THIS FILE — `E374`
 * banned that for RENDERING (*"fragile and would suppress real employers"*) and
 * the objection is harder for a WRITE, because a wrong render is visible and a
 * wrong write is not. A row that is not one of these four exact pairs is not
 * touched, whatever it looks like.
 *
 * ── ⚠ IDEMPOTENT BY CONSTRUCTION ──────────────────────────────────────────
 *
 * After the swap a row reads `("StratERP Inc.", "Founder & Principal
 * Consultant")`, which matches NONE of the four filters — including none of the
 * other three. So a second run finds nothing and changes nothing. Checked
 * against all four tuples, not assumed.
 *
 * ⚠ REVERSAL: swap the two strings in each tuple below and re-run. The `E373`
 * follow-up report also carries all 36 row ids, so the change is reversible from
 * the report alone.
 */
const SWAPPED_PAIRS: { titleInName: string; companyInRole: string }[] = [
  { titleInName: "Founder & Principal Consultant", companyInRole: "StratERP Inc." },
  {
    titleInName: "AI-Native Application Designer & Builder",
    companyInRole: "Panameer Digital Services",
  },
  { titleInName: "AI-Native Application Designer & Builder", companyInRole: "Medlinq.ai" },
  { titleInName: "Founder & Principal Consultant", companyInRole: "SRM+" },
];

async function main() {
  const before = await prisma.employer.count();
  let swapped = 0;

  for (const p of SWAPPED_PAIRS) {
    const rows = await prisma.employer.findMany({
      /* ⚠ BOTH COLUMNS IN THE FILTER. Matching on `name` alone would catch a row
         whose `role_title` had since been corrected by hand and swap it back. */
      where: { name: p.titleInName, role_title: p.companyInRole },
      select: { id: true },
    });
    for (const r of rows) {
      await prisma.employer.update({
        where: { id: r.id },
        /* ⚠ THE SWAP, EXPLICITLY BOTH WAYS. Writing one column and leaving the
           other would produce two copies of the same string and lose the one it
           replaced. */
        data: { name: p.companyInRole, role_title: p.titleInName },
      });
      swapped += 1;
    }
    console.log(
      `  ${p.titleInName} / ${p.companyInRole} -> swapped ${rows.length}`
    );
  }

  const after = await prisma.employer.count();
  console.log(`\nrows swapped        : ${swapped}`);
  console.log(`Employer rows before: ${before}`);
  console.log(`Employer rows after : ${after}   (must be identical — a swap creates and deletes nothing)`);

  /* ⚠ THE INVARIANT, RE-READ FROM THE DATABASE rather than inferred from the
     loop — the point of a repair is that the end state is right, not that the
     script believed it did the right thing. */
  let stillSwapped = 0;
  for (const p of SWAPPED_PAIRS) {
    stillSwapped += await prisma.employer.count({
      where: { name: p.titleInName, role_title: p.companyInRole },
    });
  }
  console.log(`⚠ rows still swapped: ${stillSwapped}   (must be 0)`);

  for (const p of SWAPPED_PAIRS) {
    const n = await prisma.employer.count({
      where: { name: p.companyInRole, role_title: p.titleInName },
    });
    console.log(`   now correct: ${p.companyInRole} / ${p.titleInName} = ${n}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
