/**
 * One-time data migration: WorkExperience → Employer, ExperienceProject →
 * Project (brief_U / E042).
 *
 * brief_S added `Employer` as a first-class entity while the flat
 * `WorkExperience` from brief_E was still in place, so the profile rendered
 * BOTH and the two models drifted. `Employer` is now the single work-history
 * model; this moves the data across before the old tables are dropped.
 *
 * Run BEFORE the `db push` that removes `work_experiences` /
 * `experience_projects`:
 *
 *   npm run db:migrate-work-history      # then remove the models, then push
 *
 * Idempotent and safe to re-run: an Employer is matched on
 * (profile, name, role_title) and a Project on (profile, employer, name), so a
 * second run reports 0 moved rather than duplicating anyone's history.
 *
 * Loads .env.local itself — bare ts-node does not inherit it (see pitfalls.md).
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("— Work history migration: WorkExperience → Employer —\n");


  // Read through raw SQL: the Prisma models are removed in the same change that
  // drops the tables, so a typed client can't be relied on to still know them.
  const rows = await prisma.$queryRaw<
    {
      id: string;
      provider_profile_id: string;
      employer: string;
      role_title: string;
      description: string | null;
      start_date: Date | null;
      end_date: Date | null;
    }[]
  >`
    SELECT id, provider_profile_id, employer, role_title, description,
           start_date, end_date
    FROM work_experiences
    ORDER BY start_date DESC NULLS LAST
  `;

  console.log(`work_experiences rows found: ${rows.length}`);

  let employersCreated = 0;
  let employersMatched = 0;
  let projectsCreated = 0;
  let projectsSkipped = 0;

  for (const [i, we] of rows.entries()) {
    const name = (we.employer ?? "").trim() || "(Employer not detected)";
    const roleTitle = (we.role_title ?? "").trim() || null;

    // Match an existing Employer so a re-run — or an employer the provider
    // already entered by hand — is reused rather than duplicated.
    let employer = await prisma.employer.findFirst({
      where: {
        provider_profile_id: we.provider_profile_id,
        name,
        role_title: roleTitle,
      },
      select: { id: true },
    });

    if (employer) {
      employersMatched++;
    } else {
      employer = await prisma.employer.create({
        data: {
          provider_profile_id: we.provider_profile_id,
          name,
          role_title: roleTitle,
          description: we.description,
          start_date: we.start_date,
          end_date: we.end_date,
          // A role with a start and no end is the one they're still in.
          is_current: we.start_date != null && we.end_date == null,
          sort_order: i * 10,
        },
        select: { id: true },
      });
      employersCreated++;
    }

    const childProjects = await prisma.$queryRaw<
      { name: string; description: string | null }[]
    >`
      SELECT name, description FROM experience_projects
      WHERE work_experience_id = ${we.id}::uuid
    `;

    for (const cp of childProjects) {
      const projectName = (cp.name ?? "").trim();
      if (!projectName) continue;

      const existing = await prisma.project.findFirst({
        where: {
          provider_profile_id: we.provider_profile_id,
          employer_id: employer.id,
          name: projectName,
        },
        select: { id: true },
      });
      if (existing) {
        projectsSkipped++;
        continue;
      }

      // brief_project_model_v2 — client comes from the employer (truthful);
      // the role is left UNCLASSIFIED rather than guessed.
      await prisma.project.create({
        data: {
          provider_profile_id: we.provider_profile_id,
          employer_id: employer.id,
          name: projectName,
          description: cp.description,
          client_name: name,
        },
      });
      projectsCreated++;
    }
  }

  console.log(`\nemployers created           : ${employersCreated}`);
  console.log(`employers matched (re-used) : ${employersMatched}`);
  console.log(`projects created            : ${projectsCreated}`);
  console.log(`projects already present    : ${projectsSkipped}`);
  console.log(
    `\ntotals now → employers: ${await prisma.employer.count()}, projects: ${await prisma.project.count()}`
  );
  console.log(
    "\nNext: remove WorkExperience/ExperienceProject from schema.prisma, then `npx prisma db push`."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
