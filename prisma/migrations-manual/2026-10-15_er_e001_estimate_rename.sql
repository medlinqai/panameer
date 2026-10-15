-- ER-E001 (Scott 10-12, same one-time rename exception as NM-E010): drop "Cost" — Estimate / Estimate Request.
-- Renames only; no data is inserted, updated or deleted. Each renamed table keeps a temporary old-name view
-- (drop them with the NM-E015 views).
BEGIN;

ALTER TYPE "CostEstimateStatus" RENAME TO "EstimateStatus";
ALTER TYPE "CostEstimateLineKind" RENAME TO "EstimateLineKind";
ALTER TYPE "CostEstimateRequestStatus" RENAME TO "EstimateRequestStatus";

ALTER TABLE "cost_estimates" RENAME TO "estimates";
ALTER TABLE "estimates" RENAME CONSTRAINT "cost_estimates_pkey" TO "estimates_pkey";
ALTER INDEX "cost_estimates_estimate_number_key" RENAME TO "estimates_estimate_number_key";
ALTER INDEX "cost_estimates_provider_person_id_idx" RENAME TO "estimates_provider_person_id_idx";
ALTER INDEX "cost_estimates_customer_person_id_idx" RENAME TO "estimates_customer_person_id_idx";
ALTER INDEX "cost_estimates_customer_email_idx" RENAME TO "estimates_customer_email_idx";
CREATE VIEW "cost_estimates" AS SELECT * FROM "estimates";

ALTER TABLE "cost_estimate_revisions" RENAME TO "estimate_revisions";
ALTER TABLE "estimate_revisions" RENAME CONSTRAINT "cost_estimate_revisions_pkey" TO "estimate_revisions_pkey";
ALTER TABLE "estimate_revisions" RENAME CONSTRAINT "cost_estimate_revisions_estimate_id_fkey" TO "estimate_revisions_estimate_id_fkey";
ALTER INDEX "cost_estimate_revisions_estimate_id_revision_number_key" RENAME TO "estimate_revisions_estimate_id_revision_number_key";
CREATE VIEW "cost_estimate_revisions" AS SELECT * FROM "estimate_revisions";

ALTER TABLE "cost_estimate_lines" RENAME TO "estimate_lines";
ALTER TABLE "estimate_lines" RENAME CONSTRAINT "cost_estimate_lines_pkey" TO "estimate_lines_pkey";
ALTER TABLE "estimate_lines" RENAME CONSTRAINT "cost_estimate_lines_revision_id_fkey" TO "estimate_lines_revision_id_fkey";
ALTER INDEX "cost_estimate_lines_revision_id_line_number_key" RENAME TO "estimate_lines_revision_id_line_number_key";
CREATE VIEW "cost_estimate_lines" AS SELECT * FROM "estimate_lines";

ALTER TABLE "cost_estimate_requests" RENAME TO "estimate_requests";
ALTER TABLE "estimate_requests" RENAME CONSTRAINT "cost_estimate_requests_pkey" TO "estimate_requests_pkey";
ALTER INDEX "cost_estimate_requests_provider_person_id_status_idx" RENAME TO "estimate_requests_provider_person_id_status_idx";
ALTER INDEX "cost_estimate_requests_requester_person_id_idx" RENAME TO "estimate_requests_requester_person_id_idx";
CREATE VIEW "cost_estimate_requests" AS SELECT * FROM "estimate_requests";

COMMIT;
