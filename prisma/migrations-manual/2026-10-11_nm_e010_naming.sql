-- NM-E010 (Scott decisions, 2026-10-11): one-time approved renames. No data is inserted, updated or deleted.
-- Each renamed table keeps a temporary view under its old name (old column names aliased) so code still on the
-- old names keeps working during the deploy. Columns renamed on tables that keep their name can't have a view;
-- those break old code only until the new deploy is live. Drop the views in NM-E015.
BEGIN;

-- 1 · Enums
ALTER TYPE "SettlementStatus" RENAME TO "PaymentRequestStatus";
ALTER TYPE "PaymentTrigger" RENAME TO "PaymentEvent";
ALTER TYPE "ColleagueInviteStatus" RENAME TO "InvitationToJoinStatus";
ALTER TYPE "CredentialSource" RENAME VALUE 'LEARN' TO 'PANAMEER';
ALTER TYPE "RequesterOnboardingStep" RENAME VALUE 'requester_info' TO 'REQUESTER_INFO';
ALTER TYPE "RequesterOnboardingStep" RENAME VALUE 'work_location' TO 'WORK_LOCATION';
ALTER TYPE "RequesterOnboardingStep" RENAME VALUE 'review' TO 'REVIEW';

-- 2 · Columns
ALTER TABLE "pillars" RENAME COLUMN "catalog_id" TO "business_type_id";
ALTER TABLE "pillars" RENAME COLUMN "role_type_id" TO "role_id";
ALTER TABLE "skills" RENAME COLUMN "catalog_id" TO "business_type_id";
ALTER TABLE "skills" RENAME COLUMN "role_type_id" TO "role_id";
ALTER TABLE "skill_tags" RENAME COLUMN "catalog_id" TO "business_type_id";
ALTER TABLE "skill_tags" RENAME COLUMN "role_type_id" TO "role_id";
ALTER TABLE "provider_profiles" RENAME COLUMN "role_type_id" TO "role_id";
ALTER TABLE "specializations" RENAME COLUMN "catalog_id" TO "business_type_id";
ALTER TABLE "employers" RENAME COLUMN "job_role_type_id" TO "job_role_id";
ALTER TABLE "projects" RENAME COLUMN "role_type_id" TO "role_id";
ALTER TABLE "service_products" RENAME COLUMN "role_type_id" TO "role_id";
ALTER TABLE "service_products" RENAME COLUMN "payment_trigger" TO "payment_event";
ALTER TABLE "service_product_milestones" RENAME COLUMN "trigger" TO "payment_event";
ALTER TABLE "provider_profile_roles" RENAME COLUMN "role_type_id" TO "role_id";
ALTER TABLE "work_requests" RENAME COLUMN "role_type_id" TO "role_id";
ALTER TABLE "work_request_lines" RENAME COLUMN "role_type_id" TO "role_id";
ALTER TABLE "learning_paths" RENAME COLUMN "expert_person_id" TO "instructor_person_id";
ALTER TABLE "learn_lessons" RENAME COLUMN "expert_person_id" TO "instructor_person_id";
ALTER TABLE "certification_tests" RENAME COLUMN "reviewed_by" TO "reviewed_by_person_id";
ALTER TABLE "forum_threads" RENAME COLUMN "author_id" TO "author_person_id";
ALTER TABLE "forum_posts" RENAME COLUMN "author_id" TO "author_person_id";
ALTER TABLE "forum_posts" RENAME COLUMN "marked_helpful_by" TO "marked_helpful_by_person_id";
ALTER TABLE "forum_posts" RENAME COLUMN "instructor_confirmed_by" TO "instructor_confirmed_by_person_id";
ALTER TABLE "assessment_domain_results" RENAME COLUMN "capability_domain_id" TO "domain_id";
ALTER TABLE "service_product_capability_domains" RENAME COLUMN "capability_domain_id" TO "domain_id";
ALTER TABLE "capability_module_bridge" RENAME COLUMN "capability_id" TO "domain_id";
ALTER TABLE "work_order_lines" RENAME COLUMN "payment_trigger" TO "payment_event";
ALTER TABLE "settlement_requests" RENAME COLUMN "settlement_number" TO "payment_request_number";
ALTER TABLE "settlement_lines" RENAME COLUMN "settlement_request_id" TO "payment_request_id";
ALTER TABLE "payment_lines" RENAME COLUMN "settlement_request_id" TO "payment_request_id";
ALTER TABLE "provider_payout_lines" RENAME COLUMN "settlement_line_id" TO "payment_request_line_id";
ALTER TABLE "provider_services" RENAME COLUMN "payment_trigger" TO "payment_event";
ALTER TABLE "erp_messages" RENAME COLUMN "settlement_request_id" TO "payment_request_id";
ALTER TABLE "work_order_milestones" RENAME COLUMN "trigger" TO "payment_event";
ALTER TABLE "work_order_milestones" RENAME COLUMN "settlement_request_id" TO "payment_request_id";

-- 3 · Tables + temporary old-name views
ALTER TABLE "certifications" RENAME TO "credentials";
CREATE VIEW "certifications" AS SELECT "id", "user_id", "provider_profile_id", "name", "issuer", "year", "issued_on", "credential_id", "url", "expires_on", "attachment_path", "attachment_name", "notes", "created_at", "issued_from", "kind", "learning_path_id", "public_credential_url" FROM "credentials";
ALTER TABLE "colleague_invites" RENAME TO "invitations_to_join";
CREATE VIEW "colleague_invites" AS SELECT "id", "inviter_person_id", "invitee_email", "invitee_first_name", "invitee_last_name", "message", "token_hash", "prior_token_hashes", "last_sent_at", "status", "expires_at", "accepted_at", "accepted_person_id", "created_at", "updated_at" FROM "invitations_to_join";
ALTER TABLE "learn_courses" RENAME TO "courses";
CREATE VIEW "learn_courses" AS SELECT "id", "learning_path_id", "title", "slug", "summary", "thumbnail_url", "intro_video_ref", "doc_source_url", "doc_source_text", "doc_fetched_at", "style", "sort_order", "created_at", "is_custom", "skill_scope" FROM "courses";
ALTER TABLE "learn_sections" RENAME TO "course_sections";
CREATE VIEW "learn_sections" AS SELECT "id", "course_id", "title", "description", "thumbnail_url", "sort_order", "created_at", "is_custom" FROM "course_sections";
ALTER TABLE "learn_lessons" RENAME TO "lessons";
CREATE VIEW "learn_lessons" AS SELECT "id", "section_id", "title", "description", "run_time", "duration_seconds", "duration_source", "thumbnail_url", "vimeo_ref", "production_status", "retired_at", "instructor_person_id" AS "expert_person_id", "sort_order", "created_at", "is_custom", "cross_reference_lesson_id" FROM "lessons";
ALTER TABLE "learn_course_skills" RENAME TO "course_skills";
CREATE VIEW "learn_course_skills" AS SELECT "id", "course_id", "skill_id", "created_at" FROM "course_skills";
ALTER TABLE "learn_enrollments" RENAME TO "enrollments";
CREATE VIEW "learn_enrollments" AS SELECT "id", "user_id", "learning_path_id", "created_at" FROM "enrollments";
ALTER TABLE "learn_path_watches" RENAME TO "learning_path_watches";
CREATE VIEW "learn_path_watches" AS SELECT "id", "user_id", "learning_path_id", "created_at", "notified_at", "test_watch", "test_notified_at" FROM "learning_path_watches";
ALTER TABLE "skill_areas" RENAME TO "areas";
CREATE VIEW "skill_areas" AS SELECT "id", "code", "label", "sort_order", "hidden", "created_at", "updated_at" FROM "areas";
ALTER TABLE "role_types" RENAME TO "roles";
CREATE VIEW "role_types" AS SELECT "id", "code", "name", "display", "created_at", "updated_at", "sort_order" FROM "roles";
ALTER TABLE "capability_domains" RENAME TO "domains";
CREATE VIEW "capability_domains" AS SELECT "id", "process", "name", "key", "sort_order", "created_at", "updated_at" FROM "domains";
ALTER TABLE "service_product_capability_domains" RENAME TO "service_product_domains";
CREATE VIEW "service_product_capability_domains" AS SELECT "id", "service_product_id", "domain_id" AS "capability_domain_id", "created_at" FROM "service_product_domains";
ALTER TABLE "capability_module_bridge" RENAME TO "domain_module_bridges";
CREATE VIEW "capability_module_bridge" AS SELECT "id", "domain_id" AS "capability_id", "suite", "module_name", "skill_id", "created_at", "updated_at" FROM "domain_module_bridges";
ALTER TABLE "service_catalogs" RENAME TO "business_types";
CREATE VIEW "service_catalogs" AS SELECT "id", "code", "name", "description", "created_at", "updated_at" FROM "business_types";
ALTER TABLE "admin_audit" RENAME TO "admin_audits";
CREATE VIEW "admin_audit" AS SELECT "id", "actor_id", "actor_email", "action", "target_table", "target_id", "detail", "row_count", "created_at" FROM "admin_audits";
ALTER TABLE "path_interest" RENAME TO "path_interests";
CREATE VIEW "path_interest" AS SELECT "id", "user_id", "learning_path_id", "wanted", "created_at", "updated_at" FROM "path_interests";
ALTER TABLE "settlement_requests" RENAME TO "payment_requests";
CREATE VIEW "settlement_requests" AS SELECT "id", "payment_request_number" AS "settlement_number", "held_for_tax_banking", "work_order_id", "provider_person_id", "period_start", "period_end", "currency", "status", "submitted_at", "decided_at", "decided_by_person_id", "decision_note", "external_ref", "created_at", "updated_at", "resubmits_id", "due_date" FROM "payment_requests";
ALTER TABLE "settlement_lines" RENAME TO "payment_request_lines";
CREATE VIEW "settlement_lines" AS SELECT "id", "payment_request_id" AS "settlement_request_id", "line_number", "work_order_line_id", "basis", "description", "uom", "quantity", "unit_price_cents", "amount_cents", "service_date", "note", "created_at" FROM "payment_request_lines";
ALTER TABLE "work_tracker_milestones" RENAME TO "work_tracker_releases";
CREATE VIEW "work_tracker_milestones" AS SELECT "id", "title", "description", "date", "status", "sort", "code", "start_date", "target_date", "summary", "published", "created_at", "updated_at", "updated_by" FROM "work_tracker_releases";

COMMIT;
