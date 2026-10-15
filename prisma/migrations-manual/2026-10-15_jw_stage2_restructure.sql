-- JW-E009 (Scott 10-13 approved; run 10-15 with Scott's OK): Job · Work Request · Work Order. Run by scripts/migrate-job-wr.ts.
-- Users and Learn tables are not touched. Posting columns on work_requests stay (unused). The two link tables are dropped
-- only after their rows are copied to job_posting_skills / job_specializations; cart rows move to the buyer's Incomplete WR.
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'FILLED', 'CANCELED');

CREATE TYPE "WorkRequestSource" AS ENUM ('JOB_HIRE', 'SHOP', 'ESTIMATE', 'OFFER', 'EXTERNALLY_SOURCED', 'PUNCHOUT');

ALTER TABLE "proposals" DROP CONSTRAINT "proposals_work_request_id_fkey";

ALTER TABLE "work_request_skills" DROP CONSTRAINT "work_request_skills_skill_id_fkey";

ALTER TABLE "work_request_skills" DROP CONSTRAINT "work_request_skills_work_request_id_fkey";

ALTER TABLE "work_request_specializations" DROP CONSTRAINT "work_request_specializations_specialization_id_fkey";

ALTER TABLE "work_request_specializations" DROP CONSTRAINT "work_request_specializations_work_request_id_fkey";

DROP INDEX "interview_requests_work_request_id_idx";

DROP INDEX "proposal_requests_work_request_id_idx";

DROP INDEX "proposal_requests_work_request_id_provider_person_id_key";

DROP INDEX "proposals_work_request_id_idx";

DROP INDEX "proposals_work_request_id_provider_person_id_key";

DROP INDEX "provider_evaluations_work_request_id_idx";

DROP INDEX "provider_evaluations_work_request_id_provider_person_id_cre_key";

DROP INDEX "shortlists_work_request_id_idx";

DROP INDEX "test_requests_work_request_id_idx";

ALTER TABLE "companies" ADD COLUMN     "require_wr_description" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "interview_requests" ADD COLUMN "job_id" UUID;

ALTER TABLE "proposal_requests" ADD COLUMN "job_id" UUID;

ALTER TABLE "proposals" ADD COLUMN "job_id" UUID;

ALTER TABLE "provider_evaluations" ADD COLUMN "job_id" UUID;

ALTER TABLE "shortlists" ADD COLUMN "job_id" UUID;

ALTER TABLE "test_requests" ADD COLUMN "job_id" UUID;

ALTER TABLE "work_orders" ADD COLUMN     "description" TEXT,
ADD COLUMN     "erp_po_number" TEXT,
ADD COLUMN     "erp_po_revision" INTEGER;

ALTER TABLE "work_request_lines" ADD COLUMN     "offer_id" UUID;

ALTER TABLE "work_requests" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "erp_requisition_number" TEXT,
ADD COLUMN     "job_id" UUID,
ADD COLUMN     "source" "WorkRequestSource",
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "wr_number" TEXT;

CREATE TABLE "job_specializations" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "specialization_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_specializations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_posting_skills" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_posting_skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "buyer_person_id" UUID NOT NULL,
    "p_account_id" UUID NOT NULL,
    "role_id" UUID,
    "pillar_id" UUID,
    "region_id" UUID,
    "specialization_id" UUID,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "experience_level" "ExperienceLevel",
    "budget_type" "BudgetType",
    "budget_amount_cents" INTEGER,
    "budget_min_cents" INTEGER,
    "budget_max_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "worksite" "WorksiteType",
    "location_country" TEXT,
    "location_country_code" VARCHAR(2),
    "duration" "WorkRequestDuration",
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "proposal_access" "WorkProposalAccess" NOT NULL,
    "posted_at" TIMESTAMP(3),
    "company_visibility" "ClientVisibility" NOT NULL DEFAULT 'PUBLIC',
    "company_code_name" TEXT,
    "sole_sourced" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

INSERT INTO "jobs" (id, buyer_person_id, p_account_id, role_id, pillar_id, region_id, specialization_id, title, description, experience_level, budget_type, budget_amount_cents, budget_min_cents, budget_max_cents, currency, worksite, location_country, location_country_code, duration, start_date, end_date, status, proposal_access, posted_at, company_visibility, company_code_name, sole_sourced, created_at, updated_at)
SELECT w.id, w.buyer_person_id, w.p_account_id, w.role_id, w.pillar_id, w.region_id, w.specialization_id, CASE WHEN w.title = '' THEN 'Untitled job' ELSE w.title END, w.description, w.experience_level, w.budget_type, w.budget_amount_cents, w.budget_min_cents, w.budget_max_cents, w.currency, w.worksite, w.location_country, w.location_country_code, w.duration, w.start_date, w.end_date, CASE w.status::text WHEN 'POSTED' THEN 'OPEN' WHEN 'ASSIGNED' THEN 'FILLED' WHEN 'ORDERED' THEN 'FILLED' WHEN 'CANCELLED' THEN 'CANCELED' ELSE 'DRAFT' END::"JobStatus", w.proposal_access, w.posted_at, w.company_visibility, w.company_code_name, w.sole_sourced, w.created_at, w.updated_at
FROM "work_requests" w WHERE w.posted_at IS NOT NULL OR w.title <> '' OR w.id IN (SELECT work_request_id FROM "interview_requests" UNION SELECT work_request_id FROM "proposal_requests" UNION SELECT work_request_id FROM "proposals" UNION SELECT work_request_id FROM "provider_evaluations" UNION SELECT work_request_id FROM "shortlists" UNION SELECT work_request_id FROM "test_requests" UNION SELECT work_request_id FROM "work_request_skills" UNION SELECT work_request_id FROM "work_request_specializations");

UPDATE "interview_requests" SET "job_id" = "work_request_id";

UPDATE "proposal_requests" SET "job_id" = "work_request_id";

UPDATE "proposals" SET "job_id" = "work_request_id";

UPDATE "provider_evaluations" SET "job_id" = "work_request_id";

UPDATE "shortlists" SET "job_id" = "work_request_id";

UPDATE "test_requests" SET "job_id" = "work_request_id";

ALTER TABLE "interview_requests" DROP COLUMN "work_request_id", ALTER COLUMN "job_id" SET NOT NULL;

ALTER TABLE "proposal_requests" DROP COLUMN "work_request_id", ALTER COLUMN "job_id" SET NOT NULL;

ALTER TABLE "proposals" DROP COLUMN "work_request_id", ALTER COLUMN "job_id" SET NOT NULL;

ALTER TABLE "provider_evaluations" DROP COLUMN "work_request_id", ALTER COLUMN "job_id" SET NOT NULL;

ALTER TABLE "shortlists" DROP COLUMN "work_request_id", ALTER COLUMN "job_id" SET NOT NULL;

ALTER TABLE "test_requests" DROP COLUMN "work_request_id", ALTER COLUMN "job_id" SET NOT NULL;

INSERT INTO "job_posting_skills" (id, job_id, skill_id, created_at) SELECT id, work_request_id, skill_id, created_at FROM "work_request_skills";

INSERT INTO "job_specializations" (id, job_id, specialization_id, created_at) SELECT id, work_request_id, specialization_id, created_at FROM "work_request_specializations";

UPDATE "work_requests" w SET
   job_id = CASE WHEN EXISTS (SELECT 1 FROM "jobs" j WHERE j.id = w.id) THEN w.id ELSE NULL END,
   source = (CASE WHEN w.erp_connection_id IS NOT NULL THEN 'PUNCHOUT' WHEN w.posted_at IS NOT NULL OR w.title <> '' THEN 'JOB_HIRE' WHEN w.sole_sourced THEN 'SHOP' ELSE 'EXTERNALLY_SOURCED' END)::"WorkRequestSource",
   wr_number = 'WR-' || upper(substr(replace(w.id::text, '-', ''), 1, 8)),
   description = COALESCE(NULLIF(w.title, ''), (SELECT l.description FROM "work_request_lines" l WHERE l.work_request_id = w.id ORDER BY l.line_number LIMIT 1), w.description);

INSERT INTO "work_requests" (id, buyer_person_id, p_account_id, title, currency, status, proposal_access, sole_sourced, source, wr_number, description, created_at, updated_at)
SELECT c.id, c.buyer_person_id, co.p_account_id, '', 'USD', 'DRAFT', 'INVITE_ONLY', true, 'SHOP', 'WR-' || upper(substr(replace(c.id::text, '-', ''), 1, 8)),
  COALESCE((SELECT sp.title FROM "cart_lines" cl JOIN "service_products" sp ON sp.id = cl.service_product_id WHERE cl.cart_id = c.id ORDER BY cl.created_at LIMIT 1), (SELECT ps.name FROM "cart_lines" cl JOIN "provider_services" ps ON ps.id = cl.provider_service_id WHERE cl.cart_id = c.id ORDER BY cl.created_at LIMIT 1)), c.created_at, now()
FROM "carts" c JOIN "people" pe ON pe.id = c.buyer_person_id JOIN "companies" co ON co.id = pe.company_id
WHERE EXISTS (SELECT 1 FROM "cart_lines" cl WHERE cl.cart_id = c.id);

INSERT INTO "work_request_lines" (id, work_request_id, line_number, transaction_type, description, currency, uom, quantity, unit_price_cents, amount_cents, service_product_id, provider_service_id, provider_person_id, offer_id, service_end, status, created_at, updated_at)
SELECT cl.id, cl.cart_id, row_number() OVER (PARTITION BY cl.cart_id ORDER BY cl.created_at),
  (CASE WHEN ps.id IS NOT NULL OR sp.pricing_type IN ('HOURLY','TM') THEN 'SERVICE_BY_QTY' ELSE 'SERVICE_BY_AMT' END)::"TransactionType",
  COALESCE(sp.title, ps.name), cl.currency,
  CASE WHEN ps.id IS NOT NULL THEN COALESCE(ps.uom, 'HOUR') WHEN sp.pricing_type IN ('HOURLY','TM') THEN 'HOUR' ELSE NULL END,
  cl.quantity, cl.unit_price_cents,
  CASE WHEN ps.id IS NOT NULL OR sp.pricing_type IN ('HOURLY','TM') THEN NULL ELSE cl.unit_price_cents * cl.quantity END,
  sp.id, ps.id, COALESCE(spp.person_id, psp.person_id), cl.offer_id, cl.delivery_date, 'DRAFT', cl.created_at, now()
FROM "cart_lines" cl
LEFT JOIN "service_products" sp ON sp.id = cl.service_product_id LEFT JOIN "provider_profiles" spp ON spp.id = sp.provider_profile_id
LEFT JOIN "provider_services" ps ON ps.id = cl.provider_service_id LEFT JOIN "provider_profiles" psp ON psp.id = ps.provider_profile_id
WHERE cl.cart_id IN (SELECT id FROM "work_requests");

DELETE FROM "cart_lines" WHERE cart_id IN (SELECT id FROM "work_requests");

DELETE FROM "carts" WHERE id IN (SELECT id FROM "work_requests");

INSERT INTO "work_requests" (id, buyer_person_id, p_account_id, title, currency, status, proposal_access, sole_sourced, source, wr_number, description, created_at, updated_at)
SELECT o.id, o.buyer_person_id, o.p_account_id, '', o.currency, 'ORDERED', 'INVITE_ONLY', true, 'EXTERNALLY_SOURCED', 'WR-' || upper(substr(replace(o.id::text, '-', ''), 1, 8)), o.order_number, o.created_at, now()
FROM "work_orders" o WHERE o.work_request_id IS NULL;

UPDATE "work_orders" SET work_request_id = id WHERE work_request_id IS NULL;

UPDATE "work_orders" o SET description = COALESCE(o.description, (SELECT w.description FROM "work_requests" w WHERE w.id = o.work_request_id));

CREATE INDEX "job_specializations_specialization_id_idx" ON "job_specializations"("specialization_id");

CREATE UNIQUE INDEX "job_specializations_job_id_specialization_id_key" ON "job_specializations"("job_id", "specialization_id");

CREATE INDEX "job_posting_skills_skill_id_idx" ON "job_posting_skills"("skill_id");

CREATE UNIQUE INDEX "job_posting_skills_job_id_skill_id_key" ON "job_posting_skills"("job_id", "skill_id");

CREATE INDEX "jobs_p_account_id_idx" ON "jobs"("p_account_id");

CREATE INDEX "jobs_buyer_person_id_idx" ON "jobs"("buyer_person_id");

CREATE INDEX "jobs_status_idx" ON "jobs"("status");

CREATE INDEX "interview_requests_job_id_idx" ON "interview_requests"("job_id");

CREATE INDEX "proposal_requests_job_id_idx" ON "proposal_requests"("job_id");

CREATE UNIQUE INDEX "proposal_requests_job_id_provider_person_id_key" ON "proposal_requests"("job_id", "provider_person_id");

CREATE INDEX "proposals_job_id_idx" ON "proposals"("job_id");

CREATE UNIQUE INDEX "proposals_job_id_provider_person_id_key" ON "proposals"("job_id", "provider_person_id");

CREATE INDEX "provider_evaluations_job_id_idx" ON "provider_evaluations"("job_id");

CREATE UNIQUE INDEX "provider_evaluations_job_id_provider_person_id_created_by_p_key" ON "provider_evaluations"("job_id", "provider_person_id", "created_by_person_id");

CREATE INDEX "shortlists_job_id_idx" ON "shortlists"("job_id");

CREATE INDEX "test_requests_job_id_idx" ON "test_requests"("job_id");

CREATE UNIQUE INDEX "work_requests_wr_number_key" ON "work_requests"("wr_number");

ALTER TABLE "job_specializations" ADD CONSTRAINT "job_specializations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_specializations" ADD CONSTRAINT "job_specializations_specialization_id_fkey" FOREIGN KEY ("specialization_id") REFERENCES "specializations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_requests" ADD CONSTRAINT "work_requests_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "job_posting_skills" ADD CONSTRAINT "job_posting_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_posting_skills" ADD CONSTRAINT "job_posting_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_work_request_id_fkey" FOREIGN KEY ("work_request_id") REFERENCES "work_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "proposals" ADD CONSTRAINT "proposals_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_buyer_person_id_fkey" FOREIGN KEY ("buyer_person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_p_account_id_fkey" FOREIGN KEY ("p_account_id") REFERENCES "p_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pillar_id_fkey" FOREIGN KEY ("pillar_id") REFERENCES "pillars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_specialization_id_fkey" FOREIGN KEY ("specialization_id") REFERENCES "specializations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_orders" ALTER COLUMN "work_request_id" SET NOT NULL;

DROP TABLE "work_request_skills";

DROP TABLE "work_request_specializations";
