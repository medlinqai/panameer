-- JW-E009 (Scott 10-13 approved; run 10-15 with Scott's OK): Job · Work Request · Work Order. Run by scripts/migrate-job-wr.ts.
-- Users and Learn tables are not touched. Posting columns on work_requests stay (unused). The two link tables are dropped
-- only after their rows are copied to job_posting_skills / job_specializations; cart rows move to the buyer's Incomplete WR.
ALTER TABLE "work_requests" ALTER COLUMN "status" SET DEFAULT 'INCOMPLETE';
UPDATE "work_requests" SET status = 'INCOMPLETE' WHERE status::text IN ('DRAFT', 'POSTED', 'ASSIGNED');
UPDATE "work_requests" SET status = 'ORDERED' WHERE id IN (SELECT work_request_id FROM "work_orders");
