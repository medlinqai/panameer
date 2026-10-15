-- NM-E015 drop list (not run yet): the temporary old-name views. Drop once no deployed code reads the old names.
-- NM-E010's views are listed in 2026-10-11_nm_e010_naming.sql (every CREATE VIEW there).
-- ER-E001 (2026-10-15):
DROP VIEW IF EXISTS "cost_estimates";
DROP VIEW IF EXISTS "cost_estimate_revisions";
DROP VIEW IF EXISTS "cost_estimate_lines";
DROP VIEW IF EXISTS "cost_estimate_requests";
