// JW-E009: Job · Work Request · Work Order migration (Scott approved 10-13; OK to run 10-15). Three committed stages:
// 1 new WorkRequestStatus values · 2 restructure + data moves (posting fields → jobs, proposals/etc. → job_id, carts →
// the buyer's Incomplete WR, every WO gets a WR + description) · 3 WR statuses. Users and Learn tables are never touched.
// Dry run (default): stages 1–2 run inside one transaction and ROLL BACK; prints counts. --apply commits each stage.
// Run: npx tsx --env-file=.env.local scripts/migrate-job-wr.ts [--apply]
import { readFileSync } from "node:fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const sql = (n: string) => readFileSync(`prisma/migrations-manual/2026-10-15_jw_${n}.sql`, "utf8");
const strip = (s: string) => s.replace(/^--.*$/gm, "");

async function counts(c: pg.Client, after: boolean) {
  const q = async (s: string) => Number((await c.query(s)).rows[0].n);
  const learnBefore = await q(`select (select count(*) from users) + (select count(*) from learning_paths) + (select count(*) from enrollments) n`);
  return after
    ? { jobs: await q(`select count(*) n from jobs`), jobSkills: await q(`select count(*) n from job_posting_skills`), shortlistsOnJobs: await q(`select count(*) n from shortlists where job_id is not null`), workRequests: await q(`select count(*) n from work_requests`), wrLines: await q(`select count(*) n from work_request_lines`), cartsLeft: await q(`select count(*) n from carts`), wosWithoutWr: await q(`select count(*) n from work_orders where work_request_id is null`), usersAndLearn: learnBefore }
    : { workRequests: await q(`select count(*) n from work_requests`), carts: await q(`select count(*) n from carts`), cartLines: await q(`select count(*) n from cart_lines`), shortlists: await q(`select count(*) n from shortlists`), workOrders: await q(`select count(*) n from work_orders`), usersAndLearn: learnBefore };
}

async function main() {
  const c = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await c.connect();
  try {
    const before = await counts(c, false);
    if (!APPLY) {
      await c.query("BEGIN");
      await c.query(strip(sql("stage1_enum")));
      await c.query(strip(sql("stage2_restructure")));
      const after = await counts(c, true);
      await c.query("ROLLBACK");
      console.log(JSON.stringify({ applied: false, before, afterStage2: after, errors: 0, note: "stage 3 (status values) runs only on --apply" }, null, 1));
      return;
    }
    for (const stage of ["stage1_enum", "stage2_restructure", "stage3_status"]) {
      await c.query("BEGIN");
      await c.query(strip(sql(stage)));
      await c.query("COMMIT");
      console.log(`committed ${stage}`);
    }
    console.log(JSON.stringify({ applied: true, before, after: await counts(c, true) }, null, 1));
  } catch (e) {
    await c.query("ROLLBACK").catch(() => null);
    console.error("ERROR — nothing from the failed stage was kept:", (e as Error).message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
}
main();
