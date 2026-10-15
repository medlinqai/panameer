-- JW-E009 (Scott 10-13 approved; run 10-15 with Scott's OK): Job · Work Request · Work Order. Run by scripts/migrate-job-wr.ts.
-- Users and Learn tables are not touched. Posting columns on work_requests stay (unused). The two link tables are dropped
-- only after their rows are copied to job_posting_skills / job_specializations; cart rows move to the buyer's Incomplete WR.
ALTER TYPE "WorkRequestStatus" ADD VALUE 'INCOMPLETE';
ALTER TYPE "WorkRequestStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "WorkRequestStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "WorkRequestStatus" ADD VALUE 'APPROVED';
ALTER TYPE "WorkRequestStatus" ADD VALUE 'RETURNED';
ALTER TYPE "WorkRequestStatus" ADD VALUE 'REJECTED';
ALTER TYPE "WorkRequestStatus" ADD VALUE 'WITHDRAWN';
